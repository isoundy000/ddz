var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require('../utils/http');
var playerService = require('../common/service/playerService')
var gameService = require('../common/service/gameService')
var commonService = require('../common/service/commonService')
var app = express();

var hallIp = null;
var config = null;
var rooms = {};
var serverMap = {};
var roomIdOfUsers = {};

exports.serverMap = serverMap;

//设置跨域访问
app.all('*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", ' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});


/**
 * 获取在线玩家信息列表
 */
app.get('/get_online_player_list', async (req, res) => {
	console.log('********获取在线玩家列表********');
	console.log(serverMap);
	const user_id = req.query.user_id;
	//循环遍历每个子游戏服务器，获取在线玩家信息
	var user_infos = [];
	for (var key in serverMap) {
		var kindId = serverMap[key].kindId;
		//由于其他子服务暂时未对接接口，目前只显示牛牛、炸金花的在线玩家
		if (kindId == '008' || kindId == '009' || kindId == '010'|| kindId == '004' || kindId == '002' || kindId == '201' || kindId == '202') {
			var ip = serverMap[key].ip;
			var clientport = serverMap[key].clientport;
			var httpPort = serverMap[key].httpPort;
			console.log('******从【' + serverMap[key].serverName + '】服务器获取在线玩家*********');
			var data = await getOnlinePlayerList(ip, httpPort);
			user_infos = user_infos.concat(data.player_list);
		}
	}

	var resData = {};
	resData.player_list = user_infos;
	http.send(res, 0, "ok", resData);
})

/**
 * 获取在线玩家信息列表
 * @returns {Promise.<void>}
 */
async function getOnlinePlayerList(ip, port) {
	var sign = crypto.md5(config.ROOM_PRI_KEY);
	return new Promise((resolve, reject) => {
		http.get(ip, port, '/ws/get_online_player', { sign: sign }, function (ret, data) {
			if (data) {
				resolve(data);
			} else {
				reject('getOnlinePlayerList：请求子服务器错误');
			}
		});
	})
}


/**
 * 每个子游戏服务启动时就会向当前大厅服务器注册(发送过来的是服务器信息)
 */
app.get('/register_gs', function (req, res) {  //每个子游戏服务启动时就会向当前大厅服务器注册(发送过来的是服务器信息)
	var ip = req.ip;
	var clientip = req.query.clientip;
	var clientport = req.query.clientport;
	var httpPort = req.query.httpPort;
	var load = req.query.load;
	var serverName = req.query.serverName;
	var id = clientip + ":" + clientport;
	//add by nt
	//游戏服id，像网狐一样单个子游戏一个kindId
	//例：'001'==>四川麻将,'002'==>郑州麻将
	var kindId = req.query.kindId;
	serverMap[id] = {
		ip: ip,
		id: id,
		clientip: clientip,
		clientport: clientport,
		httpPort: httpPort,
		serverName: serverName,
		load: load,
		kindId: kindId
	};
	//console.log('【'+serverName+'】game server registered.');
	http.send(res, 0, "ok", { ip: clientip });
});
//add by nt添加一个参数游戏服的ID
function chooseServer(kindId) {
	// console.log(kindId);
	var serverinfo = null;
	for (var s in serverMap) {
		var info = serverMap[s];
		//add by nt 添加一个外层if语句
		if (kindId == info.kindId) {
			if (serverinfo == null) {
				serverinfo = info;
			} else {
				if (serverinfo.load > info.load) {
					serverinfo = info;
				}
			}
		}
	}
	return serverinfo;
}

exports.createRoom = function (account, userId, roomConf, sex, fnCallback) {
	let _conf = JSON.parse(roomConf)
	let kindId = _conf.kindId;
	let serverinfo = chooseServer(kindId);//add by nt添加一个传入服务器kindId参数
	if (serverinfo == null) {
		fnCallback(101, null);
		return;
	}
	//
	playerService.getUserStatus(account, (err, data) => {
		if (err) {
			console.log(err);
			return
		}
		if (data.gems <= 0) {
			fnCallback(2222, null);
			return
		}
		//2、请求创建房间
		_conf.is_daikai = !_conf.is_my_room;
		_conf.gems = data.gems;
		_conf.coins = data.coins;
		//delete _conf.is_my_room;
		let _data = JSON.stringify(_conf);
		var reqdata = {
			userid: userId,
			sex: sex,
			data: _data,
		};
		reqdata.sign = crypto.md5(userId + _data + config.ROOM_PRI_KEY);
		http.get(serverinfo.ip, serverinfo.httpPort, "/create_room", reqdata, function (ret, data) {
			if (ret) {
				if (data.errcode == 0) {
					fnCallback(0, data);
				}
				else {
					fnCallback(data.errcode, null);
				}
				return;
			}
			fnCallback(102, null);
		});
	});
};

function checkRoomIsRuning(serverinfo, roomId, callback) {
	var sign = crypto.md5(roomId + config.ROOM_PRI_KEY);
	http.get(serverinfo.ip, serverinfo.httpPort, "/is_room_runing", { roomid: roomId, sign: sign }, function (ret, data) {
		if (ret) {
			if (data.errcode == 0 && data.runing == true) {
				callback(true);
			}
			else {
				callback(false);
			}
		}
		else {
			callback(false);
		}
	});
}

exports.enterRoom = function (user_info, fnCallback) {

	let roomId = user_info.roomid;
	delete user_info.belongs_club;
	user_info.sign = crypto.md5(user_info.userid + user_info.name + user_info.roomid + user_info.gems + config.ROOM_PRI_KEY);

	var enterRoomReq = function (serverinfo) {
		http.get(serverinfo.ip, serverinfo.httpPort, "/enter_room", user_info, function (ret, data) {
			if (ret) {
				if (data.errcode == 0) {
					gameService.updateRoomIdOfUserByUserId(user_info.userid, roomId, (err, result) => {
						if (err) {
							console.log(err);
							return
						}
						fnCallback(0, {
							ip: serverinfo.clientip,
							port: serverinfo.clientport,
							kindId: serverinfo.kindId,
							token: data.token,
						});
					});
				}
				else {
					console.log(data.errmsg);
					fnCallback(data.errcode, data.errmsg);
				}
			}
			else {
				fnCallback(-1, "加入失败");
			}
		});
	};

	var chooseServerAndEnter = function (serverinfo) {
		serverinfo = chooseServer(serverinfo.kindId);//add by nt添加一个传入服务器kindId参数
		if (serverinfo != null) {
			enterRoomReq(serverinfo);
		}
		else {
			fnCallback(-1, null);
		}
	}

	gameService.getRoomAddr(roomId, (err, result) => {
		if (err) {
			console.log(err);
			return
		}
		if (!result) {
			fnCallback(-2, '游戏暂未开放');
		} else {
			var id = result.ip + ":" + result.port;
			var serverinfo = serverMap[id];
			if (serverinfo != null) {
				checkRoomIsRuning(serverinfo, roomId, function (isRuning) {
					if (isRuning) {
						enterRoomReq(serverinfo);
					}
					else {
						chooseServerAndEnter(serverinfo);
					}
				});
			} else {
				fnCallback(-2, '游戏暂未开放');
			}
		}
	});
};

exports.isServerOnline = function (ip, port, callback) {
	var id = ip + ":" + port;
	var serverInfo = serverMap[id];
	if (!serverInfo) {
		callback(false);
		return;
	}
	var sign = crypto.md5(config.ROOM_PRI_KEY);
	http.get(serverInfo.ip, serverInfo.httpPort, "/ping", { sign: sign }, function (ret, data) {
		if (ret) {
			callback(true);
		}
		else {
			callback(false);
		}
	});
};

exports.dismissRoomByRoomId = function (roomId, fnCallback) {
	var dismissRoom = function (serverinfo) {
		var sign = crypto.md5(roomId + config.ROOM_PRI_KEY);
		http.get(serverinfo.ip, serverinfo.httpPort, "/dismiss_room_by_room_id", { roomid: roomId, sign: sign }, function (ret, data) {
			if (ret) {
				if (data.errcode == 0 && data.is_dismiss == true) {
					fnCallback(true, data.num_of_games);
				}
				else {
					deleteRoom();
				}
			}
			else {
				deleteRoom();
			}
		})
	}

	var deleteRoom = function () {
		gameService.getRoomData(roomId, (err, room_data) => {
			if (err) {
				console.log(err);
			}
			if (room_data == null) {
				fnCallback(false);
			}
			else {
				gameService.deleteRoom(roomId, (err, result) => {
					if (err) {
						console.log(err);
					}
					if (result != null) {
						fnCallback(true, room_data.num_of_turns);
					}
					else {
						fnCallback(false);
					}
				})
			}
		})
	}

	gameService.getRoomAddr(roomId, (err, result) => {
		if (err) {
			console.log(err);
			return
		}
		if (!result) {
			fnCallback(false);
		}
		else {
			var id = result.ip + ":" + result.port;
			var serverinfo = serverMap[id];
			if (serverinfo != null) {
				checkRoomIsRuning(serverinfo, roomId, function (isRuning) {
					if (isRuning) {
						dismissRoom(serverinfo);
					}
					else {
						deleteRoom();
					}
				})
			}
			else {
				deleteRoom();
			}
		}
	})
}

exports.getOnlineRoomIdForUserId = (callback) => {
	var sign = crypto.md5(config.ROOM_PRI_KEY);
	var server_maps = [];
	var user_infos = [];
	var getOnlineInfo = function (Maps) {
		var map = Maps.shift();
		exports.isServerOnline(map.ip, map.clientport, (is_online) => {
			if (is_online) {
				http.get(map.ip, map.httpPort, '/get_online_roomId_for_userId', { sign: sign }, function (ret, data) {
					user_infos = user_infos.concat(data);
					if (Maps.length == 0) {
						callback(user_infos);
						return;
					}
					else {
						getOnlineInfo(Maps);
					}
				})
			}
			else {
				if (Maps.length == 0) {
					callback(user_infos);
					return;
				}
				else {
					getOnlineInfo(Maps);
				}
			}
		})
	}
	for (var key in serverMap) {
		var map = {
			ip: serverMap[key].ip,
			clientport: serverMap[key].clientport,
			httpPort: serverMap[key].httpPort,
		}
		server_maps.push(map)
	}
	getOnlineInfo(server_maps);
}

exports.start = function ($config) {
	config = $config;
	app.listen(config.ROOM_PORT, config.FOR_ROOM_IP);
	console.log("room service is listening on " + config.FOR_ROOM_IP + ":" + config.ROOM_PORT);
};

exports.wsDismissRoom = async function (roomId, callback) {
	let room = await commonService.getTableValuesAsync("base_info", "t_rooms", { id: roomId });
	if (room == null || room.base_info == null) {
		callback(1, "数据库不存在该房间");
		return;
	}
	let serverInfo = chooseServer(JSON.parse(room.base_info).kindId);
	if (serverInfo.kindId != "008" && serverInfo.kindId != "009" && serverInfo.kindId != "201"&& serverInfo.kindId != "010") {
		callback(1, "目前解散房间仅支持推饼、扎金花和牛牛");
		return;
	}
	http.get(serverInfo.ip, serverInfo.httpPort, "/ws/dismiss_room", {
		roomId: roomId,
		sign: crypto.md5(roomId + config.ROOM_PRI_KEY),
	}, (isOk, data) => {
		if (isOk) {
			callback(data.errcode, data.errmsg);
		}
		else {
			callback(1, "解散房间出错");
		}
	}
	)
	/*
	checkRoomIsRuning(serverInfo, roomId, (isRunning) => {
		if (isRunning) {

		}
		else {
			callback(1, "对应房间未开启")
		}
	})
	*/
}

exports.wsUpdateRoomCfg = async function (roomId, isDaiKai, callback) {
	let room = await commonService.getTableValuesAsync("base_info,is_daikai", "t_rooms", { id: roomId });
	if (room == null || room.base_info == null) {
		callback(1, "数据库不存在该房间");
		return;
	}
	let serverInfo = chooseServer(JSON.parse(room.base_info).kindId);
	if (serverInfo.kindId != "008" && serverInfo.kindId != "009"&& serverInfo.kindId != "010" && serverInfo.kindId != "201" && serverInfo.kindId != "202") {
		callback(1, "目前更新房间信息仅支持推饼、扎金花和牛牛");
		return;
	}
	http.get(serverInfo.ip, serverInfo.httpPort, "/ws/update_room_cfg", {
		roomId: roomId,
		isDaiKai: isDaiKai,
		sign: crypto.md5(roomId + config.ROOM_PRI_KEY),
	}, (isOk, data) => {
		if (isOk) {
			callback(data.errcode, data.errmsg);
		}
		else {
			callback(1, "更新信息出错");
		}
	}
	)


	/*
	checkRoomIsRuning(serverInfo, roomId, (isRunning) => {
		if (isRunning) {
		}
		else {
			callback(1, "对应房间未开启")
		}
	})
	*/
}



/**
 * 全服广播消息
 */
app.get('/send_broadcast', function (req, res) {
	//console.log('*********发送全局广播消息*******');
    var msg = req.query.msg;
    var sign = crypto.md5(config.ROOM_PRI_KEY);
    var server_maps = [];
    var sendBroadcast = function (map) {
    	//console.log(map);
        http.get(map.ip, map.httpPort, '/ws/broadcast', { sign: sign,msg:msg }, function (ret, data) {
            if (ret == true) {
                if (data.errcode != 0) {
                    console.log('请求【'+map.serverName+'】服务发送广播消息错误:'+data.errmsg);
                }
            }else {
                console.log('请求【'+map.serverName+'】服务发送广播消息失败');
            }
        })
    }
    for (var key in serverMap) {
        var map = {
            ip: serverMap[key].ip,
            clientport: serverMap[key].clientport,
            httpPort: serverMap[key].httpPort,
            serverName:serverMap[key].serverName
        }
        sendBroadcast(map);
    }
});

