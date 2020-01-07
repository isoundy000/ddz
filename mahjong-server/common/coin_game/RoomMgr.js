const PlayerService = require('../service/playerService')
const GameService = require('../service/gameService')
const AgentService = require('../service/agentService')
const CommonService = require('../service/commonService');
const Crypto = require('../../utils/crypto')
const UserMgr = require('../usermgr')
var HallSocket = null;
var GameMgr = null;
/**机器人摸好牌的概率*/
var difficulty_degree = 50;
/**玩家摸差牌的概率*/
var player_ctrl_param = -30;

function newUserInfo() {
	return {
		account: "",
		name: "",
		user_id: -1,
		coins: -1,
		gems: -1,
		sex: -1,
		ip: "0.0.0.0",
		is_gaming: false,
		is_robot: false,
		ctrl_ratio: null,
		last_game_over_results: null,
		last_playing_game_results: null,
	}
}

function initRoom() {
	let seats = [];
	for (let i = 0; i < module.exports.conf.player_count; ++i) {
		seats[i] = {
			userId: 0,
			in_this_room: false,
			ready: false,
		};
	}
	return {
		//玩家
		seats: seats,
		//房间是否处于空闲状态
		is_idle: true,
		player_count: 0,
		conf: module.exports.conf,
	}
}

module.exports = {
	/**房间*/
	m_rooms: [],
	m_users: {},
	m_user_location: {},
	conf: null,
	//初始化金币场的房间
	async initRooms(conf) {
		this.conf = conf;
		for (let i = 0; i < this.conf.room_count; ++i) {
			this.m_rooms.push(initRoom());
		}
		this.conf.room_code = this.conf.kind_id
		if (this.conf.is_special) {
			this.conf.room_code += "1";
		}
		else {
			this.conf.room_code += "0";
		}
		this.conf.room_code += this.conf.serial_num;
		await this.updateCoinsConfig();

		return new Promise((resolve, reject) => {
			resolve(this.conf)
		})
	},
	/**
	 * 设置机器人胜率
	 * @param {{difficulty_degree:Number,player_ctrl_param:Number}} data
	 */
	setDifficultyDegree(data) {
		console.error("后台设置胜率：" + JSON.stringify(data))
		difficulty_degree = data.difficulty_degree < -100 ? 100 : data.difficulty_degree;
		difficulty_degree = data.difficulty_degree > 100 ? 100 : data.difficulty_degree;

		player_ctrl_param = data.player_ctrl_param < -100 ? -100 : data.player_ctrl_param;
		player_ctrl_param = data.player_ctrl_param > 100 ? 100 : data.player_ctrl_param;
	},
	/**
	 * 获取胜率
	 * @return {number} user_id
	 */
	getDifficultyDegree(user_id) {
		let user_info = this.getUserInfo(user_id);
		if (user_info != null)
			if (user_info.is_robot) {
				// console.log('機器人摸好牌的概率：' + difficulty_degree);
				return difficulty_degree;
			} else {
				if (user_info.ctrl_ratio != null && user_info.ctrl_ratio != 0) {
					// console.log('從緩存獲取玩家摸好牌的概率：' + user_info.ctrl_ratio);
					return user_info.ctrl_ratio;
				}
				else {
					// console.log('獲取玩家點控出錯，玩家摸好牌的概率：' + player_ctrl_param);
					return player_ctrl_param;
				}
			}
	},
	setHallSocket(hallSocket) {
		HallSocket = hallSocket;
	},
	setGameMgr(gameMgr) {
		GameMgr = gameMgr;
	},
	//设置用户数据
	setUsersInfo(data) {
		let user_id = data.user_id;
		if (user_id == null) {
			console.log("RoomMgr:188 user_id 为空")
			return
		}
		let user_info = this.getUserInfo(data.user_id);
		if (user_info == null) {
			user_info = newUserInfo();
		}
		if (this.getIsGaming(user_id)) {
			console.log("RoomMgr:196 user_id 已经在游戏中了")
			return
		}
		user_info.account = data.account;
		user_info.user_id = data.user_id;
		user_info.name = data.name;
		user_info.coins = data.coins;
		user_info.sex = data.sex;
		user_info.gems = data.gems;
		user_info.ctrl_ratio = data.ctrl_ratio;
		user_info.is_robot = data.is_robot || false;
		this.m_users[data.user_id] = user_info
	},
	/**
	 * 删除this.m_user_location[user_id]
	 * @param {*} user_id 
	 */
	delUserLocation(user_id) {
		delete this.m_user_location[user_id];
	},
	/**
	 * 设置this.m_user_location[user_id]
	 * @param {*} user_id 
	 * @param {*} room_id 
	 * @param {*} seat_index 
	 */
	setUserLocation(user_id, room_id, seat_index) {
		this.m_user_location[user_id] = {
			room_id: room_id,
			seat_index: seat_index,
		}
	},
	/**
	 * 为玩家加入获取空闲房间的id
	 */
	getIdleRoomIdForUser() {

		for (const room_id in this.m_rooms) {
			let room = this.m_rooms[room_id];
			if (room.is_idle == true && room.player_count < this.conf.player_count && room.player_count > 0) {
				return room_id;
			}
		}

		for (const room_id in this.m_rooms) {
			let room = this.m_rooms[room_id];
			if (room.is_idle == true && room.player_count < this.conf.player_count) {
				return room_id;
			}
		}

		this.m_rooms.push(initRoom());
		return this.m_rooms.length - 1;
	},
	/**
	 * 获取用户，当前匹配房间
	 * @param {*} user_id 
	 */
	getUserRoom(user_id) {
		var location = this.m_user_location[user_id];
		if (location != null) {
			return location.room_id;
		}
		return null;
	},
	/**
	 * 通过user_id获取房间椅子号
	 * @param {*} user_id 
	 */
	getUserSeat(user_id) {
		var location = this.m_user_location[user_id];
		if (location != null) {
			return location.seat_index;
		}
		return null;
	},
	/**
	 * 获取当前房间内的数据
	 * @param {*} room_id 
	 */
	getRoom(room_id) {
		return this.m_rooms[room_id];
	},
	/**
	 * 游戏结束
	 * @param {*} room_id 
	 */
	destroy(room_id) {
		let room = this.m_rooms[room_id]
		if (!room) {
			return
		}
		// for (const key in room.seats) {
		// 	user_id = room.seats[key].userId;
		// 	room.seats[key].ready = false;
		// 	if (room.seats[key].in_this_room == true) {
		// 		this.setUserGaming(user_id, false);
		// 		if (this.isRobot(user_id) == false/* && UserMgr.isOnline(user_id) == true*/) {
		// 			HallSocket.sendUserGameFinish(user_id)
		// 		}
		// 		//游戏结束，移除机器人
		// 		else {
		// 			this.removeUserFromRoom(user_id);
		// 		}
		// 	}
		// 	else {
		// 		this.removeUserFromRoom(user_id);
		// 	}
		// }
		// setTimeout(() => {
		// 	room.is_idle = true;
		// }, 5000);
		this.clearRoom(room);
	},
	/**
	 * 检查用户是否在m_users的缓存里
	 * @param {*} user_id 
	 * @param {*} callback 
	 */
	checkUserData(user_id, ip, callback) {
		if (this.m_users[user_id] == null) {
			PlayerService.getUserDataByUserId(user_id, (err, result) => {
				// console.log("222222222222222222222")
				if (err) {
					console.log(err)
					callback(false);
					return;
				}
				if (!result) {
					callback(false);
					return;
				}
				let data = {
					account: result.account,
					name: Crypto.fromBase64(result.name),
					user_id: result.userid,
					coins: result.coins,
					sex: result.sex,
					ctrl_ratio: result.ctrl_ratio
				}
				if (this.conf.is_free == true) {
					data.coins = 0;
				}
				this.setUsersInfo(data)
				this.m_users[user_id].ip = ip,
					callback(true);
			})
		}
		else {
			this.m_users[user_id].ip = ip,
				callback(true);
		}
	},
	/**
	 * 从当前房间移除玩家
	 * @param {*} user_id 
	 */
	removeUserFromRoom(user_id) {
		let room_id = this.getUserRoom(user_id);
		if (room_id) {
			let room = this.getRoom(room_id);
			if (room) {
				for (const key in room.seats) {
					if (room.seats[key].userId == user_id) {
						room.seats[key].in_this_room = false;
						room.seats[key].userId = 0;
						room.seats[key].ready = false;
						room.player_count--;
						UserMgr.broacastInRoom('exit_notify_push', user_id, user_id, false);
						this.setUserGaming(user_id, false);
						if (this.isRobot(user_id) == false) {
							HallSocket.sendUserGameFinish(user_id)
						}
						this.delUserLocation(user_id);
						break;
					}
				}
				this.clearRoomRobotWhenNoUsers(room);
			}
		}
	},
	clearRoomRobotWhenNoUsers(_room) {
		let room = null;
		if (typeof _room == "number" || typeof _room == "string") {
			room = this.getRoom(_room);
		}
		else if (typeof _room == "object") {
			room = _room;
		}
		if (room == null) {
			return
		}
		for (let index = 0; index < room.seats.length; index++) {
			let user_id = room.seats[index].userId
			if (user_id != 0 && this.isRobot(user_id) == false) {
				return
			}
		}
		this.clearRoom(room);
	},
	/**
	 * 清除房间内数据
	 * @param {number | object} room 
	 */
	clearRoom(_room) {
		let room = null;
		if (typeof _room == "number" || typeof _room == "string") {
			room = this.getRoom(_room);
		}
		else if (typeof _room == "object") {
			room = _room;
		}
		if (room == null) {
			return
		}
		for (let index = 0; index < room.seats.length; index++) {
			let user_id = room.seats[index].userId;
			if (user_id != null && user_id > 0)
				UserMgr.broacastInRoom('exit_notify_push', user_id, user_id, false);
		}
		for (let index = 0; index < room.seats.length; index++) {
			let user_id = room.seats[index].userId;
			if (user_id != null && user_id > 0) {
				room.seats[index].in_this_room = false;
				room.seats[index].userId = 0;
				room.seats[index].ready = false;

				this.setUserGaming(user_id, false);
				if (this.isRobot(user_id) == false) {
					HallSocket.sendUserGameFinish(user_id)
				}
				this.delUserLocation(user_id);
			}
		}
		room.player_count = 0;
		room.is_idle = true;
		// console.log("清除房间内的机器人")
		// console.log(room);
	},
	/**
	 * 获取用户信息
	 * @param {*} user_id 
	 */
	getUserInfo(user_id) {
		return this.m_users[user_id];
	},
	/**
	 * 用户是否在游戏中
	 * @param {*} user_id 
	 */
	getIsGaming(user_id) {
		let user_info = this.getUserInfo(user_id)
		if (user_info == null) {
			return;
		}
		return user_info.is_gaming;
	},
	/**
	 * 设置用户游戏状态
	 * @param {*} user_id 
	 * @param {boolean} active 
	 */
	setUserGaming(user_id, is_gaming) {
		let user_info = this.getUserInfo(user_id)
		if (user_info) {
			user_info.is_gaming = is_gaming;
		}
	},

	/**
	 * 添加玩家到金币场房间
	 * @param {number} user_id 
	 */
	addUserToRoom(user_id) {
		const room_id = this.getIdleRoomIdForUser();
		if (room_id == null) {
			return
		}
		// let user_in_room_id = this.getUserRoom(user_id);
		// if (user_in_room_id != null) {
		// 	this.clearRoom(user_in_room_id);
		// }
		this.removeUserFromRoom(user_id);
		this.joinRoomByRoomId(room_id, user_id)
		return
	},
	/**
	 * 添加机器人到金币场房间
	 * @param {number} user_id
	 */
	addRobotToRoom(user_id) {
		let room_id = this.getIdleRoomIdForRobot();

		if (room_id == null) {
			return
		}

		return this.joinRoomByRoomId(room_id, user_id)
	},
	/**
	 * 为机器人加入获取空闲的room_id
	 */
	getIdleRoomIdForRobot() {
		for (const room_id in this.m_rooms) {
			let room = this.m_rooms[room_id];
			if (room.is_idle == true && room.player_count < this.conf.player_count && room.player_count > 0) {
				return room_id;
			}
		}
		return null;
	},
	/**
	 * 通过房间号加入房间
	 * @param {number} room_id
	 */
	joinRoomByRoomId(room_id, user_id) {
		let room = this.getRoom(room_id);
		if (room == null) {
			return;
		}
		let user_info = this.getUserInfo(user_id);
		if (user_info == null) {
			return
		}
		for (const key in room.seats) {
			if (room.seats[key].userId == 0) {
				room.seats[key].userId = user_id;
				room.seats[key].in_this_room = true;
				room.player_count++;
				this.setUserLocation(user_id, room_id, key);
				let userData = {
					userid: user_id,
					ip: user_info.ip,
					name: user_info.name,
					ready: false,
					seatindex: key,
					gems: user_info.gems,
					coins: user_info.coins,
				}
				UserMgr.broacastInRoom('new_user_comes_push', userData, user_id, false);
				break;
			}
		}
		let seats = [];
		for (let i = 0; i < room.seats.length; ++i) {
			let rs = room.seats[i];
			let user_info = this.getUserInfo(rs.userId);
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
		}
		//通知前端
		let ret = {
			errcode: 0,
			errmsg: "ok",
			data: {
				conf: this.conf,
				seats: seats
			}
		};
		UserMgr.sendMsg(user_id, 'login_result', ret)
		// GameMgr.setReady(user_id);
		// console.log("机器人加入房间")
		// console.log(room);
		return room
	},
	/**
	 * 服务器默认用户准备
	 * @param {number} user_id 
	 * @param {boolean} value 
	 */
	setReady(user_id, value) {
		var room_id = this.getUserRoom(user_id);
		if (room_id == null) {
			return;
		}

		var room = this.getRoom(room_id);
		if (room == null) {
			return;
		}

		var seatIndex = this.getUserSeat(user_id);
		if (seatIndex == null) {
			return;
		}

		var s = room.seats[seatIndex];
		s.ready = value;
	},
	/**
	 * 当前用户是否时机器人
	 * @param {number} user_id 
	 */
	isRobot(user_id) {
		if (this.getUserInfo == null) {
			return false
		}
		let user_info = this.getUserInfo(user_id)
		if (user_info == null) {
			return false
		}
		return user_info.is_robot;
	},
	/**
	 * 机器人加入游戏
	 * @param {number} user_id 
	 */
	robotReadyGame(user_id) {
		let user_info = this.getUserInfo(user_id);
		if (user_info == null) {
			return
		}
		if (this.isRobotInRoom(user_id) == true) {
			console.error("机器人：" + user_id + "已经在游戏房间中了")
			return
		}
		let room = this.addRobotToRoom(user_id);
		if (room == null) {
			return
		}
		GameMgr.setReady(user_id);
	},
	/**
	 * 检查机器人是否在房间中了，防止机器人加入多个房间座位
	 * @param {number} user_id 
	 */
	isRobotInRoom(user_id) {
		let user_info = this.getUserInfo(user_id);
		if (user_info == null) {
			return false;
		}
		if (this.getIsGaming(user_id) == true) {
			return true;
		}
		if (this.getUserRoom(user_id) != null) {
			return true
		}
		return false
	},
	/**
	 * 设置玩家最后一次游戏的数据，用来做断线重连处理
	 * @param {number} user_id 
	 */
	setUserLastPlayingGameResults(user_id, game_results) {
		let user_info = this.getUserInfo(user_id);
		if (user_info == null) {
			return;
		}
		user_info.last_playing_game_results = game_results;
	},
	/**
	 * 获取玩家最后一次游戏的数据
	 * @param {number} user_id 
	 */
	getUserLastPlayingGameResults(user_id) {
		let user_info = this.getUserInfo(user_id);
		if (user_info == null) {
			return;
		}
		return user_info.last_playing_game_results;
	},
	/**
	 * 设置玩家最后一次游戏的结算数据，用来做断线重连处理
	 * @param {number} user_id 
	 */
	setLastGameOverResults(user_id, game_over_results) {
		let user_info = this.getUserInfo(user_id);
		if (user_info == null) {
			return;
		}
		user_info.last_game_over_results = game_over_results;
	},
	/**
	 * 获取玩家最后一次游戏的结算数据
	 * @param {number} user_id 
	 */
	getLastGameOverResults(user_id) {
		let user_info = this.getUserInfo(user_id);
		if (user_info == null) {
			return;
		}
		return user_info.last_game_over_results;
	},
	/**
	 * 扣除玩家入场费
	 * @param {*} user_id 
	 */
	costPlayerEnterFee(user_id) {
		let fee = this.conf.enter_fee;
		let user_info = this.getUserInfo(user_id);
		//不是免费场
		if (user_info != null && this.conf.is_free == false && fee != 0) {
			user_info.coins += -fee;
			//不是机器人
			if (user_info.is_robot == false) {
				try {
					GameService.updateBonusPoolByRoomCode(fee, this.conf.room_code);

                    //保存抽水记录
                    let choushui_record = {}
                    choushui_record.fk_player_id = user_info.user_id;
                    choushui_record.username = crypto.toBase64(user_info.name);
                    choushui_record.choushui_before = user_info.coins;
                    choushui_record.choushui_count = fee;
                    choushui_record.remark = this.conf.name+'收取服务费';
                    choushui_record.record_time = Math.floor(Date.now() / 1000);
                    choushui_record.treasure_type = 'coins';
                    choushui_record.room_id = this.conf.room_code;
                    CommonService.saveAsync("t_choushui_record", choushui_record);


					//麻将抽水
					AgentService.someLevelRebate(user_info.user_id, fee, 3, this.conf.name)
					CommonService.changeNumberOfObjForTableAsync('t_users', { coins: -fee, choushui: fee }, { userid: user_id });
				} catch (error) {
					console.error(
						`user_id:${user_id}扣除手续费出错。
						${error}`
					);
				}
			}
		}
		return;
	},
	/**
	 * 赢钱抽税
	 * @param {*} user_id 
	 */
	costPlayerDrawWater(user_id, win_coins) {
		let user_info = this.getUserInfo(user_id);
		if (user_info != null && user_info.is_robot == false && this.conf.is_free == false) {
			let draw_water = Math.floor(win_coins * this.conf.draw_water_rate / 100)
			if (draw_water != 0) {
				try {
					GameService.updateBonusPoolByRoomCode(draw_water, this.conf.room_code);

                    //保存抽水记录
                    let choushui_record = {}
                    choushui_record.fk_player_id = user_info.user_id;
                    choushui_record.username = crypto.toBase64(user_info.name);
                    choushui_record.choushui_before = user_info.coins;
                    choushui_record.choushui_count = fee;
                    choushui_record.remark = this.conf.name+'收取服务费';
                    choushui_record.record_time = Math.floor(Date.now() / 1000);
                    choushui_record.treasure_type = 'coins';
                    choushui_record.room_id = this.conf.room_code;
                    CommonService.saveAsync("t_choushui_record", choushui_record);

                    //麻将抽水
					AgentService.someLevelRebate(user_info.user_id, draw_water, 3, this.conf.name)
					CommonService.changeNumberOfObjForTableAsync('t_users', { coins: -draw_water, choushui: draw_water }, { userid: user_id });
				} catch (error) {
					console.error(
						`user_id:${user_id}扣除抽水出错。
							${error}`
					);
				}
			}
			return draw_water;
		}
		return 0;
	},
	/**
	 * 更新金币场配置数据
	 */
	async updateCoinsConfig() {
		try {
			let data = await GameService.getCoinsConfigs(this.conf.room_code);
			if (data == null || data.difficulty_degree == null || data.player_ctrl_param == null) {
				console.log("未获取到room_code的值:" + this.conf.room_code);
			}
			else {
				let degrees = {
					difficulty_degree: data.difficulty_degree,
					player_ctrl_param: data.player_ctrl_param,
				}
				this.setDifficultyDegree(degrees);
			}
			this.conf.limit_mix_score = data.min_enter_score || this.conf.limit_mix_score;
			this.conf.limit_max_score = data.max_enter_score || this.conf.limit_max_score;
			this.conf.base_score = data.base_score || this.conf.base_score;
			this.conf.status = data.status || 0;
			this.conf.name = data.room_name;
			if (this.conf.is_free == false) {
				//入场费用
				this.conf.enter_fee = Math.floor((data.enter_fee_rate || 0) / 100 * this.conf.base_score);
				//抽水
				this.conf.draw_water_rate = (data.draw_water_rate || 0);
			}
			else {
				this.conf.enter_fee = 0;
				this.conf.draw_water_rate = 0;
			}

			console.log(`更新房间场conf:${JSON.stringify(this.conf)}`)
		} catch (error) {
			console.log(error)
		}
	},
	/**
	 * 更新玩家点控
	 * @param {*} user_id 
	 */
	async updateCtrlRatio(user_id) {
		try {
			let data = await CommonService.getTableValuesAsync("ctrl_ratio", "t_users", { userid: user_id })
			if (data.ctrl_ratio != 0 && ctrl_ratio != null) {
				let user_info = this.getUserInfo(user_id);
				if (user_id != null) {
					console.log(`更新用户点控值为：${data.ctrl_ratio}`);
					user_info.ctrl_ratio = data.ctrl_ratio;
				}
			}
		} catch (error) {
			console.loog(error);
		}
	},
	updateUserCoins(user_id, coins) {
		let user_info = this.getUserInfo(user_id);
		if (user_info == null) {
			console.error("user_info == null")
			return;
		}
		coins = parseInt(coins);
		if (Number.isNaN(coins)) {
			console.error("Number.isNaN(coins)")
			return;
		}
		user_info.coins += coins;
		GameMgr.updateUserCoins(user_id, coins);
		console.log(user_info);
	}
}
