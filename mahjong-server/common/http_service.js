var crypto = require('../utils/crypto');
var db = require('../utils/db');
var http = require('../utils/http');
var token_mgr = require("./tokenmgr");
var user_mgr = require("./usermgr");
var room_mgr = null;

var config = null;
var serverIp = "";

module.exports = {
	setRoomMgr($room_mgr) {
		room_mgr = $room_mgr;
		user_mgr.setRoomMgr(room_mgr);
	},
	/**
	 * 获取玩家再服务器的信息
	 * @param {*} req 
	 * @param {*} res 
	 */
	getServerInfo(req, res) {
		var serverId = req.query.serverid;
		var sign = req.query.sign;
		console.log(serverId);
		console.log(sign);
		if (serverId != config.SERVER_ID || sign == null) {
			http.send(res, 1, "invalid parameters");
			return;
		}

		var md5 = crypto.md5(serverId + config.ROOM_PRI_KEY);
		if (md5 != sign) {
			http.send(res, 1, "sign check failed.");
			return;
		}

		var locations = room_mgr.getUserLocations();
		var arr = [];
		for (var userId in locations) {
			var roomId = locations[userId].roomId;
			arr.push(userId);
			arr.push(roomId);
		}
		http.send(res, 0, "ok", { userroominfo: arr });
	},
	/**
	 * 创建房间
	 * @param {*} req 
	 * @param {*} res 
	 */
	createRoom(req, res) {
		var userId = parseInt(req.query.userid);
		var sign = req.query.sign;
		var _data = req.query.data;
		if (userId == null || sign == null || _data == null) {
			http.send(res, 1, "invalid parameters");
			return;
		}

		var md5 = crypto.md5(userId + _data + config.ROOM_PRI_KEY);
		if (md5 != req.query.sign) {
			console.log("invalid reuqest.");
			http.send(res, 1, "sign check failed.");
			return;
		}

		_data = JSON.parse(_data);
		_data.ip = serverIp;
		_data.port = config.CLIENT_PORT;
		_data.creator = userId;
		room_mgr.createRoom(_data, function (errcode, data) {
			if (errcode != 0 || data == null) {
				http.send(res, errcode, "create failed.");
				return;
			}
			else {
				http.send(res, 0, "ok", data);
			}
		});
	},
	/**
	 * 进入房间
	 * @param {*} req 
	 * @param {*} res 
	 */
	enterRoom(req, res) {
		var userId = parseInt(req.query.userid);
		var name = req.query.name;
		var roomId = req.query.roomid;
		var sign = req.query.sign;
		var gems = req.query.gems;
		var coins = req.query.coins;
		var ctrl_param = req.query.ctrl_param;
		if (userId == null || roomId == null || sign == null) {
			http.send(res, 1, "invalid parameters");
			return;
		}

		var md5 = crypto.md5(userId + name + roomId + gems + config.ROOM_PRI_KEY);
		if (md5 != sign) {
			http.send(res, 2, "sign check failed.");
			return;
		}

		//安排玩家坐下
		room_mgr.enterRoom(roomId, userId, name, gems, coins, ctrl_param, function (ret) {
			if (ret != 0) {
				if (ret == 1) {
					http.send(res, 4, "房间已经满了.");
				}
				else if (ret == 2) {
					http.send(res, 3, "房间不存在.");
				}
				return;
			}

			var token = token_mgr.createToken(userId, 5000);
			http.send(res, 0, "ok", { token: token });
		});
	},
	/**
	 * 心跳
	 * @param {*} req 
	 * @param {*} res 
	 */
	ping(req, res) {
		var sign = req.query.sign;
		var md5 = crypto.md5(config.ROOM_PRI_KEY);
		if (md5 != sign) {
			return;
		}
		http.send(res, 0, "pong");
	},
	isRoomRunning(req, res) {
		var roomId = req.query.roomid;
		var sign = req.query.sign;
		if (roomId == null || sign == null) {
			http.send(res, 1, "invalid parameters");
			return;
		}

		var md5 = crypto.md5(roomId + config.ROOM_PRI_KEY);
		if (md5 != sign) {
			http.send(res, 2, "sign check failed.");
			return;
		}

		var roomInfo = room_mgr.getRoom(roomId);
		if (!roomInfo) {
			http.send(res, 1, "failed", { runing: false });
		}
		else {
			http.send(res, 0, "ok", { runing: true });

		}
	},
	dismissRoomByRoomId(req, res) {
		var roomId = req.query.roomid;
		var sign = req.query.sign;
		if (roomId == null || sign == null) {
			http.send(res, 1, "invalid parameters");
			return;
		}
		var md5 = crypto.md5(roomId + config.ROOM_PRI_KEY);
		if (md5 != sign) {
			http.send(res, 2, "sign check failed.");
			return;
		}
		let roomInfo = room_mgr.getRoom(roomId)
		if (roomInfo != null) {
			if (room_mgr.dismissRoomByRoomId(roomId)) {
				http.send(res, 0, "ok", { is_dismiss: true, num_of_games: roomInfo.numOfGames });
			}
			else {
				http.send(res, 0, "ok", { is_dismiss: false });
			}
		}
		else {
			http.send(res, 0, "ok", { is_dismiss: false });
		}
	},
	/**
	 * 获取在线玩家
	 * @param {*} req 
	 * @param {*} res 
	 */
	getOnlineRoomIdForUserId(req, res) {
		var sign = req.query.sign;
		if (sign == null) {
			http.send(res, 1, "invalid parameters");
			return;
		}
		var md5 = crypto.md5(config.ROOM_PRI_KEY);
		if (md5 != sign) {
			http.send(res, 2, "sign check failed.");
			return;
		}
		var info = user_mgr.getOnlineRoomIdForUserId();
		http.send(res, 0, "ok", info);
	},
	/**
	 * 获取在线玩家列表
	 * @param {*} req 
	 * @param {*} res 
	 */
	getOnlinePlayerList(req, res){
		var sign = req.query.sign;
		if (sign == null) {
			http.send(res, 1, "invalid parameters");
			return;
		}
		var md5 = crypto.md5(config.ROOM_PRI_KEY);
		if (md5 != sign) {
			http.send(res, 2, "sign check failed.");
			return;
		}
		var userList = user_mgr.getOnlinePlayerList();
		var data = {};
		data.player_list = userList;
		http.send(res, 0, "ok", data);
	},
	start($config) {
		config = $config;

		//
		gameServerInfo = {
			id: config.SERVER_ID,
			clientip: config.CLIENT_IP,
			clientport: config.CLIENT_PORT,
			httpPort: config.HTTP_PORT,
			load: room_mgr.getTotalRooms(),
			//add by nt
			kindId: config.KIND_ID,
			//end
		};

		setInterval(update, 1000);
	}
}
var gameServerInfo = null;
var lastTickTime = 0;
//向大厅服定时心跳
function update() {
	if (lastTickTime + config.HTTP_TICK_TIME < Date.now()) {
		lastTickTime = Date.now();
		gameServerInfo.load = room_mgr.getTotalRooms();
		http.get(config.HALL_IP, config.HALL_PORT, "/register_gs", gameServerInfo, function (ret, data) {
			if (ret == true) {
				if (data.errcode != 0) {
					console.log(data.errmsg);
				}

				if (data.ip != null) {
					serverIp = data.ip;
				}
			}
			else {
				//
				lastTickTime = 0;
			}
		});

		// var mem = process.memoryUsage();
		// var format = function (bytes) {
		// 	return (bytes / 1024 / 1024).toFixed(2) + 'MB';
		// };
		//console.log('Process: heapTotal '+format(mem.heapTotal) + ' heapUsed ' + format(mem.heapUsed) + ' rss ' + format(mem.rss));
	}
}