export default {
	data() {
		return {}
	},
	onLoad() {

	},
	methods: {
		getu(field) {
			if(uni.getStorageSync('userInfo')) {
				uni.getStorageSync('userInfo').xcxuser[field]
			}
		},
		href(url) {
			uni.navigateTo({
				url: url
			})
		},
		// 发送数据请求
		ajaxRequest(that, url, type, call) {
			//type add 加载更多 refresh下拉刷新
			if (type === 'add') {
				if (that.parmloca.loadMoreStatus === 2) {
					return;
				}
				that.parmform.page++;
				that.parmloca.loadMoreStatus = 1;
			} else {
				that.parmform.page = 1;
			}
			let data = {}
			data.openid = uni.getStorageSync('openid');
			data.token = that.webkey
			data.page = that.parmform.page
			data.formdata = that.parmform
			that.http.post(url, data).then(res => {
				res = res.data
				if (res.data) {
					if (type === 'add') {
						// 数据递增使用 forEach
						res.data.forEach(item => {
							that.parmdata.data.push(item)
						})
					} else {
						that.parmdata = res
					}
					// 处理数据显示
					that.parmloca.loadMoreStatus = res.data.length < 10 ? 2 : 0;
				} else {
					if (res.message) {
						uni.showToast({
							title: res.message,
							icon: 'none',
							duration: 2000
						});
					}
					if (res.code === 403) {
						uni.navigateTo({
							url: "/pages/public/login"
						})
						return
					}
				}
				if (call) {
					that[call] ? that[call](res) : ''
				}
				that.fabuLocaing = 1
				uni.stopPullDownRefresh();
			}).catch(err => {
				console.log(err)
				uni.showToast({
					title: '系统错误',
					icon: 'none',
					duration: 2000
				});
			})
		},
		//调用地图路线规划接口
		directionFun(that, froma, toa) {
			// that.loading = 1
			that.qqmapsdk.direction({
				mode: 'driving', //可选值：'driving'（驾车）、'walking'（步行）、'bicycling'（骑行），不填默认：'driving',可不填
				//from参数不填默认当前地址
				from: froma,
				to: toa,
				success: function(res) {
					console.log("进行划线规划")
					console.log(res);
					var ret = res;
					var coors = ret.result.routes[0].polyline,
						pl = [],
						latlong;
					//坐标解压（返回的点串坐标，通过前向差分进行压缩）
					var kr = 1000000;
					for (var i = 2; i < coors.length; i++) {
						coors[i] = Number(coors[i - 2]) + Number(coors[i]) / kr;
					}
					//将解压后的坐标放入点串数组pl中
					for (var i = 0; i < coors.length; i += 2) {
						pl.push({
							latitude: coors[i],
							longitude: coors[i + 1]
						})
					}
					console.log(pl)
					latlong = Math.round(pl.length / 5 * 4)
					console.log(latlong)
					//设置polyline属性，将路线显示出来,计算出中心点坐标
					that.parmloca.map.latitude = pl[latlong].latitude
					that.parmloca.map.longitude = pl[latlong].longitude
					// 配置线条样式
					var contentqd,contentzd
					if(that.parmdata.data.strokelist) { //默认行程详情页
						contentqd = that.parmdata.data.strokelist.startingpoint_name
						contentzd = that.parmdata.data.strokelist.startingend_name
						that.parmloca.map.polyline = [{
							points: pl,
							color: '#018DC1',
							borderColor: '#018DC1',
							width: 3,
							arrowLine: true
						}]
					} else if(that.parmdata.data.be_to_stroke_cz) { //行程关联详情页
						contentqd = that.parmdata.data.be_to_stroke_cz.startingpoint_name
						contentzd = that.parmdata.data.be_to_stroke_cz.startingend_name
						that.parmloca.map.polyline = [{
							points: pl,
							color: '#018DC1',
							borderColor: '#018DC1',
							width: 3,
							arrowLine: true
						}]
					} else { //行程结束详情页
						contentqd = that.parmdata.data.startingpoint_name
						contentzd = that.parmdata.data.startingend_name
					}
					// 配置起点终点
					that.parmloca.map.markers = [{
							id: 1,
							latitude: pl[0].latitude,
							longitude: pl[0].longitude,
							title: '起点',
							iconPath: '/static/images/stroke/qd.png',
							width: '30',
							height: '30',
							callout: {
								'content': '起点: ' + contentqd,
								'color': '#2c2c2c',
								'fontSize': '12px',
								'borderRadius': '3px',
								'bgColor': '#ffffff',
								'padding': '10px',
								'textAlign': 'center',
							},
						},
						{
							id: 1,
							latitude: pl.slice(-1)[0].latitude,
							longitude: pl.slice(-1)[0].longitude,
							title: '终点',
							iconPath: '/static/images/stroke/zd.png',
							width: '30',
							height: '30',
							callout: {
								'content': '终点: ' + contentzd,
								'color': '#2c2c2c',
								'fontSize': '12px',
								'borderRadius': '3px',
								'bgColor': '#ffffff',
								'padding': '10px',
								'textAlign': 'center',
							},
						}
					]
					that.loading = 0
				},
				fail: function(error) {
					console.log("获取失败，调用弹框打开授权配置")
					that.getPermission(that);
				},
				complete: function(res) {
				}
			})
		},
		//地图调用
		onMapClicka(that, mapType) {
			console.log("打开地图")
			if (!uni.getStorageSync('openid')) {
				uni.navigateTo({
					url: "/pages/public/login"
				})
				return
			}
			uni.getLocation({
				type: 'gcj02',
				success: function(res) {
					// 默认小程序地图
					// uni.chooseLocation({
					// 	success: function(res) {
					// 	}
					// })

					// 腾讯地图插件
					const referer = '地图业务'; //调用插件的app的名称
					const category = '生活服务,娱乐休闲';
					const location = JSON.stringify({
						latitude: res.latitude,
						longitude: res.longitude
					});
					wx.navigateTo({
						url: 'plugin://chooseLocation/index?key=' + that.qqmapKey + '&referer=' + referer + '&location=' +
							location +
							'&category=' + category,
						animationType: 'fade-in',
						animationDuration: 200,
						success: function(res) {
							if (mapType) {
								//取消跳转发布页阻止
								uni.setStorageSync('pageRedirect', 0);
								// 选择的地图所属文本框
								uni.setStorage({
									key: 'maptype',
									data: mapType,
									success: function() {
										console.log('set maptype success')
									}
								})
							}
						}
					})
				},
				fail: function(res) {
					console.log("获取失败，调用弹框打开授权配置")
					that.getPermission(that);
				},
				complete: function(res) {}
			});
		},
		//设置当前页面地图信息
		setMapInfo(that) {
			// 根据返回的地图选择类型，设置地址数据
			let chooseLocation = requirePlugin('chooseLocation');
			let location = chooseLocation.getLocation(); // 如果点击确认选点按钮，则返回选点结果对象，否则返回null
			if (location) {
				console.log(location)
				// 判断起点终点选择类型
				uni.getStorage({
					key: 'maptype',
					success: function(res) {
						let data = res.data
						if (data === 1) {
							that.parmform.startingpoint = location.address
							that.parmform.startingpoint_name = location.name
							that.parmform.startingpointloca = location.latitude + ',' + location.longitude
						}
						if (data === 2) {
							that.parmform.startingend = location.address
							that.parmform.startingend_name = location.name
							that.parmform.startingendloca = location.latitude + ',' + location.longitude
						}
						if (that.parmform.startingpointloca && that.parmform.startingendloca) {
							console.log("选择地图地点后，页面赋值成功")
							that["callMapInfo"] ? that["callMapInfo"](that.parmform) : ''
						}
					}
				})
			}
		},
		//调用距离计算接口
		calculateDistance(that, start, dest, call) {
			console.log("计算行程距离")
			that.qqmapsdk.calculateDistance({
				//mode: 'driving',//可选值：'driving'（驾车）、'walking'（步行），不填默认：'walking',可不填
				//from参数不填默认当前地址
				//获取表单提交的经纬度并设置from和to参数（示例为string格式）
				from: start, //若起点有数据则采用起点坐标，若为空默认当前地址
				to: dest, //终点坐标
				mode: 'driving',
				success: function(res) { //成功后的回调
					console.log("计算完成，赋值距离字段")
					var res = res.result;
					//设置并更新distance数据
					that.parmform.distance = res.elements[0].distance
					// res.elements.forEach(item => {
					// 	console.log(item)
					// 	that.parmform.distance.push(item.distance);
					// })
					//数据回调验证
					call ? that[call](res) : ''
				},
				fail: function(error) {
					console.error(error);
				},
				complete: function(res) {
					//           console.log(res);
				}
			});
		}
	}
}