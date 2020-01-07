var Crypto = require('../../utils/crypto');
var RoomMgr = require('./RoomMgr');
var HallSocket = require('./HallSocket');
var UserMgr = require("../usermgr");
const Notice = require('./Notice').ID
var rechargeService = require("../service/rechargeService");

var config = null
var GameMgr = null;

exports.setConfigAndGameMgr = (_config, gameMgr) => {
	config = _config;
	GameMgr = gameMgr;
}

exports.Listener = function (socket) {
	socket.on('login', function (data) {
		data = JSON.parse(data);
		if (socket.user_id != null) {
			//已经登陆过的就忽略
			return;
		}

		HallSocket.sendUserEnterGame(data.userid);

		const time = data.time;
		const sign = data.sign;
		const user_id = data.userid;
		// console.log(data)
		// console.log('==============login==================')
		//检查参数合法性
		if (sign == null || time == null) {
			socket.emit('login_result', { errcode: 1, errmsg: "invalid parameters" });
			return;
		}

		//检查参数是否被篡改
		var md5 = Crypto.md5(time + config.ROOM_PRI_KEY);
		if (md5 != sign) {
			socket.emit('login_result', { errcode: 2, errmsg: "login failed. invalid sign!" });
			return;
		}

		RoomMgr.checkUserData(user_id, socket.handshake.address, (a_bool) => {
			if (a_bool) {
				UserMgr.bind(user_id, socket);
				socket.user_id = user_id;

				RoomMgr.setUserLastPlayingGameResults(user_id, null);
				RoomMgr.setLastGameOverResults(user_id, null);

				let room_id = RoomMgr.getUserRoom(user_id);
				//已经在房间里了
				//新进入的玩家需要加入到空闲房间
				if (room_id == null) {
					RoomMgr.addUserToRoom(user_id);
					GameMgr.setReady(user_id);
					socket.emit('login_finished');
					return;
				}
				// else {
				// }
				// let room = null;
				let room = RoomMgr.getRoom(room_id);
				if (room == null) {
					socket.emit('login_result', { errcode: 3, errmsg: "加入桌子失败" })
					return;
				};

				let userData = null;
				let seats = [];
				for (let i = 0; i < room.seats.length; ++i) {
					let rs = room.seats[i];
					let user_info = RoomMgr.getUserInfo(rs.userId);
					if (user_info != null) {
						seats.push({
							userid: rs.userId,
							ip: user_info.ip,
							name: user_info.name,
							ready: rs.ready,
							seatindex: i,
							gems: user_info.gems,
							coins: user_info.coins,
						});
					}
					else {
						seats.push({
							userid: 0,
							ip: "0.0.0.0",
							name: "",
							ready: false,
							seatindex: i,
							gems: 0,
							coins: 0,
						});
					}
					if (user_id == rs.userId) {
						userData = seats[i];
					}
				}

				//通知前端
				let ret = {
					errcode: 0,
					errmsg: "ok",
					data: {
						conf: RoomMgr.conf,
						seats: seats
					}
				};
				socket.emit('login_result', ret)

				if (RoomMgr.getIsGaming(user_id) == true) {
					GameMgr.gameSyncPush(user_id);
				}
				else {
					//通知其它客户端
					UserMgr.broacastInRoom('new_user_comes_push', userData, user_id, false);
					GameMgr.setReady(user_id);
				}
				socket.emit('login_finished');
			}
			else {
				socket.emit('login_result', { errcode: 3, errmsg: "用户id不存在" })
			}
		})
	});

	socket.on('ready', (data) => {
		let user_id = socket.user_id;
		let user_info = RoomMgr.getUserInfo(user_id);
		if (user_info == null) {
			return;
		}

		if (RoomMgr.conf.status == 1) {
			UserMgr.sendMsg(user_id, "notice", Notice.CoinsClosed);
			return
		}

		if (RoomMgr.conf.is_free == false) {
			if (user_info.coins < RoomMgr.conf.limit_mix_score) {
				UserMgr.sendMsg(user_id, "notice", Notice.BeSortOfGoldCoins);
				return
			}
			if (user_info.coins > RoomMgr.conf.limit_max_score) {
				UserMgr.sendMsg(user_id, "notice", Notice.OverGoldCoins);
				return
			}
		}
		RoomMgr.addUserToRoom(user_id);
		GameMgr.setReady(user_id);
	})


	socket.on('get_sync', (data) => {
		if (socket.user_id == null) {
			return;
		}
		if (RoomMgr.getIsGaming(socket.user_id))
			GameMgr.gameSyncPush(socket.user_id);
	})

	//出牌
	socket.on('chupai', function (data) {
		if (socket.user_id == null) {
			return;
		}
		var pai = data;
		GameMgr.chuPai(socket.user_id, pai, true);
	});

	//托管
	socket.on('trustee', function (data) {
		if (socket.user_id == null) {
			return;
		}
		GameMgr.trustee(socket.user_id, data);
	});

	//碰
	socket.on('peng', function (data) {
		if (socket.user_id == null) {
			return;
		}
		GameMgr.peng(socket.user_id);
	});

	//杠
	socket.on('gang', function (data) {
		if (socket.user_id == null || data == null) {
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
		GameMgr.gang(socket.user_id, pai);
	});

	//胡
	socket.on('hu', function (data) {
		if (socket.user_id == null) {
			return;
		}
		GameMgr.hu(socket.user_id);
	});

	//过  遇上胡，碰，杠的时候，可以选择过
	socket.on('guo', function (data) {
		if (socket.user_id == null) {
			return;
		}
		GameMgr.guo(socket.user_id);
	});

	//聊天
	socket.on('chat', function (data) {
		if (socket.user_id == null) {
			return;
		}
		var chatContent = data;
		UserMgr.broacastInRoom('chat_push', { sender: socket.user_id, content: chatContent }, socket.user_id, true);
	});

	//快速聊天
	socket.on('quick_chat', function (data) {
		if (socket.user_id == null) {
			return;
		}
		var chatId = data;
		UserMgr.broacastInRoom('quick_chat_push', { sender: socket.user_id, content: chatId }, socket.user_id, true);
	});

	//表情
	socket.on('emoji', function (data) {
		if (socket.user_id == null) {
			return;
		}
		var phizId = data;
		UserMgr.broacastInRoom('emoji_push', { sender: socket.user_id, content: phizId }, socket.user_id, true);
	});

	socket.on('grant_prop', function (params) {
		params = JSON.parse(params);
		let user_id = socket.user_id;
		if (user_id == null || !params.receiver || !params.prop_id || !params.prop_name) {
			UserMgr.sendMsg(user_id, "notice", Notice.GrantPropFailed);
			return;
		}
		rechargeService.getShopInfoByShopId(params.prop_id, (err, res) => {
			if (err) {
				console.log(err);
				UserMgr.sendMsg(user_id, "notice", Notice.GrantPropFailed);
				return
			}
			if (!res) {
				UserMgr.sendMsg(user_id, "notice", Notice.NoProp);
			}
			else {
				let user = RoomMgr.getUserInfo(user_id);
				if (user == null) {
					UserMgr.sendMsg(user_id, "notice", Notice.NotExistUser);
					return
				}
				let price = res.price;
				let left = user.coins - price;
				if (RoomMgr.conf.is_free && left < 0 ||
					!RoomMgr.conf.is_free && left < RoomMgr.conf.limit_mix_score) {
					UserMgr.sendMsg(user_id, "notice", Notice.GrantPropNoCoins);
					return;
				}
				rechargeService.changeUserCoins(user_id, -price, (err, res) => {
					if (err || !res) {
						console.log(err);
						UserMgr.sendMsg(user_id, "notice", Notice.GrantPropFailed);
						return
					}
					RoomMgr.updateUserCoins(user_id, -price);
					UserMgr.broacastInRoom("grant_prop_push", {
						sender: user_id,
						receiver: params.receiver,
						prop_price: price,
						prop_name: params.prop_name,
					}, user_id, true);
				})
			}
		})
	})

	//退出房间
	socket.on('exit', function (data) {
		var user_id = socket.user_id;
		if (user_id == null) {
			return;
		}

		RoomMgr.setUserLastPlayingGameResults(user_id, null);
		RoomMgr.setLastGameOverResults(user_id, null);

		if (RoomMgr.getIsGaming(user_id) == false) {
			// RoomMgr.removeFromMatchList(user_id);
			UserMgr.broacastInRoom('exit_notify_push', user_id, user_id, false);
			RoomMgr.removeUserFromRoom(user_id);
			// RoomMgr.setUserGaming(user_id, false)
			//通知其它玩家，有人退出了房间
		}
		UserMgr.del(user_id);

		// socket.emit('exit_result');
		socket.disconnect();
	});

	//断开链接
	socket.on('disconnect', function (data) {
		var user_id = socket.user_id;
		if (!user_id) {
			return;
		}
		HallSocket.sendUserGameFinish(user_id)
		HallSocket.sendUserExitGame();

		//如果是旧链接断开，则不需要处理。
		if (UserMgr.get(user_id) != socket) {
			return;
		}

		if (RoomMgr.getIsGaming(user_id) == false) {
			// RoomMgr.removeFromMatchList(user_id);
			RoomMgr.removeUserFromRoom(user_id);
			RoomMgr.setUserGaming(user_id, false);
			UserMgr.broacastInRoom('exit_notify_push', user_id, user_id, false);
		}
		//清除玩家的在线信息
		UserMgr.del(user_id);
		// socket.user_id = null;
		// var data = {
		// 	userid: user_id,
		// 	online: false
		// };

		// //通知房间内其它玩家
		// UserMgr.broacastInRoom('user_state_push', data, user_id);
	});

	socket.on('reconnect_get_sync', function (data) {
		data = JSON.parse(data);
		if (socket.user_id != null) {
			//已经登陆过的就忽略
			return;
		}

		HallSocket.sendUserEnterGame(data.userid);

		const time = data.time;
		const sign = data.sign;
		const user_id = data.userid;
		//检查参数合法性
		if (sign == null || time == null) {
			socket.emit('reconnect_result', { errcode: 1, errmsg: "invalid parameters" });
			return;
		}

		//检查参数是否被篡改
		var md5 = Crypto.md5(time + config.ROOM_PRI_KEY);
		if (md5 != sign) {
			socket.emit('reconnect_result', { errcode: 2, errmsg: "login failed. invalid sign!" });
			return;
		}

		UserMgr.bind(user_id, socket);
		socket.user_id = user_id;

		if (RoomMgr.getIsGaming(socket.user_id)) {
			GameMgr.gameSyncPush(socket.user_id);
			socket.emit('reconnect_result');
		}
		else {
			let user_info = RoomMgr.getUserInfo(user_id);
			if (user_info == null) {
				socket.emit('reconnect_result', { errcode: 3, errmsg: "login failed. no this user!" });
				return
			}

			let ret = {
				game_results: RoomMgr.getUserLastPlayingGameResults(user_id),
				game_over_results: RoomMgr.getLastGameOverResults(user_id),
			}

			socket.emit('reconnect_result', ret);
		}
	})

	socket.on('game_ping', function (data) {
		var user_id = socket.user_id;
		if (!user_id) {
			return;
		}
		socket.emit('game_pong');
	});

	//////////////////////////////////////////////////////////////////////////////
	//换牌
	socket.on('huanpai', function (data) {
		if (socket.user_id == null && GameMgr.huanSanZhang != null) {
			return;
		}
		if (data == null) {
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
		GameMgr.huanSanZhang(socket.user_id, p1, p2, p3);
	});

	//定缺
	socket.on('dingque', function (data) {
		if (socket.user_id == null && GameMgr.dingQue != null) {
			return;
		}
		var que = data;
		GameMgr.dingQue(socket.user_id, que);
	});
	//////////////////////////////////////////////////////////////////////////////

	//下跑
	socket.on('xiapao', function (data) {
		var user_id = socket.user_id;
		if (user_id == null && GameMgr.xiaPao != null) {
			return;
		}
		var paofen = data;
		GameMgr.xiaPao(user_id, paofen);
		UserMgr.broacastInRoom('user_xiapao_push', { userid: user_id, pao: true }, user_id, true);
	});

}