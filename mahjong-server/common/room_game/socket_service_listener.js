var crypto = require('../../utils/crypto');
const Notice = require('../coin_game/Notice').ID
var rechargeService = require("../service/rechargeService");
var tokenMgr = require("../tokenmgr");
var userMgr = require("../usermgr");
var MahjongDB = require("./MahjongDB");
var async = require('async');
var roomMgr = null;
var config = null

exports.setConfigAndRoomMgr = (_config, _roomMgr) => {
	config = _config;
	roomMgr = _roomMgr;
}

exports.listener = function (socket) {
	socket.on('login', function (data) {
		data = JSON.parse(data);
		if (socket.userId != null) {
			//已经登陆过的就忽略
			return;
		}
		var token = data.token;
		var roomId = data.roomid;
		var time = data.time;
		var sign = data.sign;
		var jingwei = data.jingwei;

		//检查参数合法性
		if (token == null || roomId == null || sign == null || time == null || jingwei == null) {
			socket.emit('login_result', { errcode: 1, errmsg: "invalid parameters" });
			return;
		}

		//检查参数是否被篡改
		var md5 = crypto.md5(roomId + token + time + config.ROOM_PRI_KEY);
		if (md5 != sign) {
			socket.emit('login_result', { errcode: 2, errmsg: "login failed. invalid sign!" });
			return;
		}

		//检查token是否有效
		if (tokenMgr.isTokenValid(token) == false) {
			socket.emit('login_result', { errcode: 3, errmsg: "token out of time." });
			return;
		}

		//检查房间合法性
		var userId = tokenMgr.getUserID(token);
		var roomId = roomMgr.getUserRoom(userId);

		userMgr.bind(userId, socket);
		socket.userId = userId;

		//返回房间信息
		var roomInfo = roomMgr.getRoom(roomId);

		socket.gameMgr = roomInfo.gameMgr;

		// 推饼更新离线列表
		try {
			let kindId = roomInfo.conf.kindId;
			if (kindId == '201' || kindId == '202') {
				socket.gameMgr.online(roomId, userId);
			}
		} catch (err) {
			console.error('socket_service_listener login err: ', err);
		}

		var seatIndex = roomMgr.getUserSeat(userId);
		roomInfo.seats[seatIndex].ip = socket.handshake.address;
		roomInfo.seats[seatIndex].jingwei = jingwei; //经纬度

		var userData = null;
		var seats = [];
		for (var i = 0; i < roomInfo.seats.length; ++i) {
			var rs = roomInfo.seats[i];
			var online = false;
			if (rs.userId > 0) {
				online = userMgr.isOnline(rs.userId);
			}

			seats.push({
				userid: rs.userId,
				ip: rs.ip,
				score: rs.score,
				name: rs.name,
				online: online,
				ready: rs.ready,
				seatindex: i,
				gems: rs.gems,
				coins: rs.coins,
				jingwei: rs.jingwei //玩家经纬度
			});
			if (userId == rs.userId) {
				userData = seats[i];
			}
		}

		//通知前端
		var ret = {
			errcode: 0,
			errmsg: "ok",
			data: {
				roomid: roomInfo.id,
				conf: roomInfo.conf,
				numofgames: roomInfo.numOfGames,
				seats: seats
			}
		};
		socket.emit('login_result', ret);

		//通知其它客户端
		userMgr.broacastInRoom('new_user_comes_push', userData, userId);
		//玩家上线，强制设置为TRUE
		socket.gameMgr.setReady(userId);

		socket.emit('login_finished');

		if (roomInfo.dr != null) {
			var dr = roomInfo.dr;
			var ramaingTime = (dr.endTime - Date.now()) / 1000;
			var data = {
				time: ramaingTime,
				states: dr.states
			}
			userMgr.sendMsg(userId, 'dissolve_notice_push', data);
		}
	});
	//每一局结束，下一局开始前接收(目前第一局没有)
	socket.on('ready', function (data) {
		var userId = socket.userId;
		if (userId == null) {
			return;
		}
		if (roomMgr.isReady(userId)) {
			return;
		}
		socket.gameMgr.setReady(userId);
		userMgr.broacastInRoom('user_ready_push', { userid: userId, ready: true }, userId, true);
	});

	//获取房间信息
	socket.on('get_sync', function (data) {
		var userId = socket.userId;
		if (userId == null) {
			return;
		}
		socket.gameMgr.setReady(userId);
	})

	//出牌
	socket.on('chupai', function (data) {
		if (socket.userId == null) {
			return;
		}
		var pai = data;
		socket.gameMgr.chuPai(socket.userId, pai);
	});

	//碰
	socket.on('peng', function (data) {
		if (socket.userId == null) {
			return;
		}
		socket.gameMgr.peng(socket.userId);
	});

	//杠
	socket.on('gang', function (data) {
		if (socket.userId == null || data == null) {
			return;
		}
		var pai = -1;
		if (typeof (data) == "number") {
			pai = data;
		}
		else if (typeof (data) == "string") {
			pai = parseInt(data);
		}
		else {
			console.log("gang:invalid param");
			return;
		}
		socket.gameMgr.gang(socket.userId, pai);
	});

	//胡
	socket.on('hu', function (data) {
		if (socket.userId == null) {
			return;
		}
		socket.gameMgr.hu(socket.userId);
	});

	//过  遇上胡，碰，杠的时候，可以选择过
	socket.on('guo', function (data) {
		if (socket.userId == null) {
			return;
		}
		socket.gameMgr.guo(socket.userId);
	});

	//聊天
	socket.on('chat', function (data) {
		if (socket.userId == null) {
			return;
		}
		var chatContent = data;
		userMgr.broacastInRoom('chat_push', { sender: socket.userId, content: chatContent }, socket.userId, true);
	});

	//快速聊天
	socket.on('quick_chat', function (data) {
		if (socket.userId == null) {
			return;
		}
		var userId = socket.userId;
		if (socket.voice_countdown != null && socket.voice_countdown < 0) { //8秒才能广播一次信息
			userMgr.sendMsg(userId, 'quick_chat_msg', { msg: '您发送的频率太快.歇一会吧' });
			return;
		}
		socket.voice_countdown = -1;
		setTimeout(() => {
			socket.voice_countdown = 1;
		}, 7000)
		var chatId = data;
		userMgr.broacastInRoom('quick_chat_push', { sender: socket.userId, content: chatId }, socket.userId, true);
	});

	//语音聊天
	socket.on('voice_msg', function (data) {
		if (socket.userId == null) {
			return;
		}
		var userId = socket.userId;
		if (socket.voice_countdown != null && socket.voice_countdown < 0) { //8秒才能广播一次信息
			userMgr.sendMsg(userId, 'quick_chat_msg', { msg: '您发送的频率太快.歇一会吧' });
			return;
		}
		socket.voice_countdown = -1;
		setTimeout(() => {
			socket.voice_countdown = 1;
		}, 7000)
		console.log(data.length);
		userMgr.broacastInRoom('voice_msg_push', { sender: socket.userId, content: data }, socket.userId, true);
	});

	//表情
	socket.on('emoji', function (data) {
		if (socket.userId == null) {
			return;
		}
		var phizId = data;
		userMgr.broacastInRoom('emoji_push', { sender: socket.userId, content: phizId }, socket.userId, true);
	});

	socket.on('grant_prop', function (params) {
		params = JSON.parse(params);
		let userId = socket.userId;
		if (userId == null || !params.receiver || !params.prop_id || !params.prop_name) {
			userMgr.sendMsg(userId, "notice", Notice.GrantPropFailed);
			return;
		}
		rechargeService.getShopInfoByShopId(params.prop_id, (err, res) => {
			if (err) {
				console.log(err);
				userMgr.sendMsg(userId, "notice", Notice.GrantPropFailed);
				return
			}
			if (!res) {
				userMgr.sendMsg(userId, "notice", Notice.NoProp);
			}
			else {
				try {
					//返回房间信息
					let price = res.price;
					let roomId = roomMgr.getUserRoom(userId)
					var roomInfo = roomMgr.getRoom(roomId);
					var seatIndex = roomMgr.getUserSeat(userId);
					var user = roomInfo.seats[seatIndex];
					let left = user.coins - price;
	
					if (!roomInfo.conf.jinbijiesuan && left < 0 ||
						roomInfo.conf.jinbijiesuan && left < roomInfo.conf.limit_coins) {
						userMgr.sendMsg(userId, "notice", Notice.GrantPropNoCoins);
						return;
					}
	
					rechargeService.changeUserCoins(userId, -price, (err, res) => {
						if (err || !res) {
							console.log(err);
							userMgr.sendMsg(userId, "notice", Notice.GrantPropFailed);
							return
						}
	
						user.coins += -price;
	
						var gameMgr = socket.gameMgr;
						if (gameMgr != null && gameMgr.updateUserCoins != null) {
							gameMgr.updateUserCoins(userId, -price)
						}
	
						userMgr.broacastInRoom("grant_prop_push", {
							sender: userId,
							receiver: params.receiver,
							prop_price: price,
							prop_name: params.prop_name,
						}, userId, true);
					})
				} catch (error) {
					console.error(error);
					userMgr.sendMsg(userId, "notice", Notice.GrantPropFailed);
				}
			}
		})
	})
	//语音使用SDK不出现在这里

	//退出房间
	socket.on('exit', function (data) {
		var userId = socket.userId;
		if (userId == null) {
			return;
		}

		var roomId = roomMgr.getUserRoom(userId);
		if (roomId == null) {
			return;
		}

		//如果游戏已经开始，则不可以
		// userId 参数用于推饼游戏，玩家(非房主)如果未下注，随时可以离开
		if (socket.gameMgr.hasBegan(roomId, userId)) {
			return;
		}

		//如果是房主，则只能走解散房间
		let room = roomMgr.getRoom(roomId);
		if (room.conf && room.conf.type && (room.conf.kindId=='201' || room.conf.kindId=='202') ) {
			// 推饼游戏房主也可以离开
			// console.log('tb do NOT CHECK isCreator.');

			// 检查是否需要更新轮庄列表
			socket.gameMgr.removeFromBankerList(roomId, userId);
		}
		else {
			if (roomMgr.isCreator(roomId, userId) == true) {
				return;
			}
		}

		//通知其它玩家，有人退出了房间
		userMgr.broacastInRoom('exit_notify_push', userId, userId, false);

		roomMgr.exitRoom(userId);
		userMgr.del(userId);

		socket.emit('exit_result');
		socket.disconnect();
	});

	//房主游戏开始前解散房间
	socket.on('dispress', function (data) {
		var userId = socket.userId;
		if (userId == null) {
			return;
		}

		var roomId = roomMgr.getUserRoom(userId);
		if (roomId == null) {
			return;
		}

		//如果游戏已经开始，则不可以
		if (socket.gameMgr.hasBegan(roomId, userId)) {
			return;
		}

		//如果不是房主，则不能解散房间
		if (roomMgr.isCreator(roomId, userId) == false) {
			return;
		}

		let room = roomMgr.getRoom(roomId)
		if (room != null) {
			MahjongDB.returnGemsWhenDisRoom(room);
		}

		userMgr.broacastInRoom('dispress_push', {}, userId, true);
		userMgr.kickAllInRoom(roomId);
		roomMgr.destroy(roomId);
		socket.disconnect();
	});

	//玩家申请解散房间
	socket.on('dissolve_request', function (data) {
		var userId = socket.userId;
		// console.log(1);
		if (userId == null) {
			// console.log(2);
			return;
		}

		var roomId = roomMgr.getUserRoom(userId);
		if (roomId == null) {
			// console.log(3);
			return;
		}

		//如果游戏未开始，则不可以
		// userId 参数用于推饼游戏，玩家(非房主)无下注随时可以离开
		if (socket.gameMgr.hasBegan(roomId, userId) == false) {
			// console.log(4);
			return;
		}

		var ret = socket.gameMgr.dissolveRequest(roomId, userId);
		if (ret != null) {
			var dr = ret.dr;
			var ramaingTime = (dr.endTime - Date.now()) / 1000;
			var data = {
				time: ramaingTime,
				states: dr.states
			}
			// console.log(5);
			userMgr.broacastInRoom('dissolve_notice_push', data, userId, true);
		}
		// console.log(6);
	});
	//玩家同意解散房间
	socket.on('dissolve_agree', function (data) {
		var userId = socket.userId;

		if (userId == null) {
			return;
		}

		var roomId = roomMgr.getUserRoom(userId);
		if (roomId == null) {
			return;
		}

		var ret = socket.gameMgr.dissolveAgree(roomId, userId, true);
		if (ret != null) {
			var dr = ret.dr;
			var ramaingTime = (dr.endTime - Date.now()) / 1000;
			var data = {
				time: ramaingTime,
				states: dr.states
			}
			userMgr.broacastInRoom('dissolve_notice_push', data, userId, true);

			var doAllAgree = true;
			for (var i = 0; i < dr.states.length; ++i) {
				if (dr.states[i] == false) {
					doAllAgree = false;
					break;
				}
			}
			if (doAllAgree) {
				socket.gameMgr.doDissolve(roomId);
			}
		}
	});
	//玩家拒绝解散房间
	socket.on('dissolve_reject', function (data) {
		var userId = socket.userId;

		if (userId == null) {
			return;
		}

		var roomId = roomMgr.getUserRoom(userId);
		if (roomId == null) {
			return;
		}

		var ret = socket.gameMgr.dissolveAgree(roomId, userId, false);
		if (ret != null) {
			userMgr.broacastInRoom('dissolve_cancel_push', {}, userId, true);
		}
	});

	//断开链接
	socket.on('disconnect', function (data) {
		var userId = socket.userId;
		if (!userId) {
			return;
		}

		//如果是旧链接断开，则不需要处理。
		if (userMgr.get(userId) != socket) {
			return;
		}

		// 推饼记录离线信息，用于自动清除长时间离线玩家
		try {
			let roomId = roomMgr.getUserRoom(userId);
			if (roomId == null) {
				return;
			}
			let roomInfo = roomMgr.getRoom(roomId);
			let kindId = roomInfo.conf.kindId;
			if (kindId == '201' || kindId == '202') {
				socket.gameMgr.offline(roomId, userId);
			}
		} catch (err) {
			console.error('socket_service_listener disconnect err: ', err);
		}

		var data = {
			userid: userId,
			online: false
		};

		//通知房间内其它玩家
		userMgr.broacastInRoom('user_state_push', data, userId);

		//清除玩家的在线信息
		userMgr.del(userId);
		socket.userId = null;
	});

	socket.on('game_ping', function (data) {
		var userId = socket.userId;
		if (!userId) {
			return;
		}
		//console.log('game_ping');
		socket.emit('game_pong');
	});
	/////////////////////////////////////////////////////////////////////
	socket.on('tingpai', function (data) {
		var userId = socket.userId;
		if (userId == null) {
			return;
		}
		if (socket.gameMgr.tingPai == null) {
			return;
		}
		socket.gameMgr.tingPai(userId);
	});
	//下跑
	socket.on('xiapao', function (data) {
		var userId = socket.userId;
		if (userId == null) {
			return;
		}
		if (socket.gameMgr.xiaPao == null) {
			return;
		}
		var paofen = data;
		socket.gameMgr.xiaPao(userId, paofen);
		userMgr.broacastInRoom('user_xiapao_push', { userid: userId, pao: true }, userId, true);
	});

	//换牌
	socket.on('huanpai', function (data) {
		if (socket.userId == null) {
			return;
		}
		if (data == null) {
			return;
		}

		if (socket.gameMgr.huanSanZhang == null) {
			return;
		}

		if (typeof (data) == "string") {
			data = JSON.parse(data);
		}

		var p1 = data.p1;
		var p2 = data.p2;
		var p3 = data.p3;
		if (p1 == null || p2 == null || p3 == null) {
			console.log("invalid data");
			return;
		}
		socket.gameMgr.huanSanZhang(socket.userId, p1, p2, p3);
	});

	//定缺
	socket.on('dingque', function (data) {
		if (socket.userId == null) {
			return;
		}

		if (socket.gameMgr.dingQue == null) {
			return;
		}

		var que = data;
		socket.gameMgr.dingQue(socket.userId, que);
	});
}