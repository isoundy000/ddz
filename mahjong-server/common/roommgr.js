var gameService = require('../common/service/gameService')
var crypto = require('../utils/crypto')

exports.rooms = {};//房间信息
exports.creatingRooms = {};

exports.userLocation = {};
exports.totalRooms = 0;

exports.DI_FEN = [1, 2, 5];
exports.MAX_FAN = [3, 4, 5];
exports.JU_SHU = [4, 8, 16];
//房卡消耗
exports.JU_SHU_COST = [2, 4, 8];
exports.REN_SHU = [2, 3, 4];

const LimitCoins = {
	// xlch: 25,
	// xzdd: 25,
	zzmj: 50,
	hjmj: 25,
	tdhmj: 20,
	hzlmj: 25,
	hxmj: 25,
}

//随机生成房间号
exports.generateRoomId = function () {
	var roomId = "";
	for (var i = 0; i < 6; ++i) {
		roomId += Math.floor(Math.random() * 10);
	}
	return roomId;
}

exports.destroy = function (roomId) {
	var roomInfo = exports.rooms[roomId];
	if (roomInfo == null) {
		return;
	}
	for (var i = 0; i < roomInfo.conf.player_count; ++i) {
		var userId = roomInfo.seats[i].userId;
		if (userId > 0) {
			delete exports.userLocation[userId];
			gameService.updateRoomIdOfUserByUserId(userId, null);
		}
	}

	delete exports.rooms[roomId];
	exports.totalRooms--;
	gameService.deleteRoom(roomId, (err, result) => {
		if (err) {
			console.log(err);
		}
	});
}

exports.dismissRoomByRoomId = function (roomId) {
	var roomInfo = exports.rooms[roomId];
	if (roomInfo == null) {
		return false;
	}
	if (!roomInfo.gameMgr || !roomInfo.gameMgr.doDissolve || !roomInfo.seats[0].ip) {
		return false;
	}
	roomInfo.gameMgr.doDissolve(roomId);
	return true;
}

exports.getTotalRooms = function () {
	return exports.totalRooms;
}

exports.getRoom = function (roomId) {
	return exports.rooms[roomId];
};

exports.isCreator = function (roomId, userId) {
	var roomInfo = exports.rooms[roomId];
	if (roomInfo == null) {
		return false;
	}
	return roomInfo.conf.creator == userId;
};

exports.enterRoom = function (roomId, userId, userName, gems, coins, ctrl_param, callback) {
	coins = parseInt(coins);
	gems = parseInt(gems);
	var fnTakeSeat = function (room) {
		if (exports.getUserRoom(userId) == roomId) {
			//已存在
			return 0;
		}

		for (var index in room.seats) {
			var seat = room.seats[index];
			if (seat.userId <= 0) {
				seat.userId = userId;
				seat.name = userName;
				seat.gems = gems;
				seat.coins = coins;
				seat.ctrl_param = ctrl_param;
				exports.userLocation[userId] = {
					roomId: roomId,
					seatIndex: index
				};
				//console.log(exports.userLocation[userId]);
				gameService.updateSeatInfo(roomId, index, seat.userId, "", seat.name, seat.coins, seat.ctrl_param, (err, result) => {
					if (err) {
						console.log(err);
					}
				});
				//正常
				return 0;
			}
		}
		//房间已满
		return 1;
	}
	var room = exports.rooms[roomId];
	if (room) {
		var ret = fnTakeSeat(room);
		callback(ret);
	}
	else {
		gameService.getRoomData(roomId, (err, result) => {
			if (err) {
				console.log(err);
				return;
			}
			if (result == null) {
				//找不到房间
				callback(2);
			}
			else {
				//construct room.
				let user_ids = [];
				let datas = [];
				for (let i = 0; i < 4; ++i) {
					let data = {
						user_name: crypto.fromBase64(result["user_name" + i]),
						user_score: result["user_score" + i]

					}
					let key = "user_name" + i;
					if (result[key] != "") {
						user_ids.push(result["user_id" + i])
						result[key] = crypto.fromBase64(result[key]);
					}
				}
				room = exports.constructRoomFromDb(result);
				var ret = fnTakeSeat(room);
				callback(ret);
			}
		});
	}
};

exports.setReady = function (userId, value) {
	var roomId = exports.getUserRoom(userId);
	if (roomId == null) {
		return;
	}

	var room = exports.getRoom(roomId);
	if (room == null) {
		return;
	}

	var seatIndex = exports.getUserSeat(userId);
	if (seatIndex == null) {
		return;
	}

	var s = room.seats[seatIndex];
	
	s.ready = value;
}

exports.isReady = function (userId) {
	var roomId = exports.getUserRoom(userId);
	if (roomId == null) {
		return;
	}

	var room = exports.getRoom(roomId);
	if (room == null) {
		return;
	}

	var seatIndex = exports.getUserSeat(userId);
	if (seatIndex == null) {
		return;
	}

	var s = room.seats[seatIndex];
	return s.ready;
}

//房间id号
exports.getUserRoom = function (userId) {
	var location = exports.userLocation[userId];
	if (location != null) {
		return location.roomId;
	}
	return null;
};
//通过玩家id获取房间椅子号
exports.getUserSeat = function (userId) {
	var location = exports.userLocation[userId];
	//console.log(exports.userLocation[userId]);
	if (location != null) {
		return location.seatIndex;
	}
	return null;
};

exports.getUserLocations = function () {
	return exports.userLocation;
};

exports.exitRoom = function (userId) {
	var location = exports.userLocation[userId];
	if (location == null)
		return;

	var roomId = location.roomId;
	var seatIndex = location.seatIndex;
	var room = exports.rooms[roomId];
	delete exports.userLocation[userId];
	if (room == null || seatIndex == null) {
		return;
	}

	var seat = room.seats[seatIndex];
	seat.userId = 0;
	seat.name = "";

	// 推饼无限人数房间，删除无座玩家
	if ( (room.conf.type == 'tb_inf' || room.conf.type == 'tb_melee') && seatIndex >= room.conf.STAND_BASE) {
		room.seats.splice(seatIndex, 1);
		// 更改后面玩家的索引号 和 快速映射索引号
		for (let index = seatIndex; index < room.seats.length; index++) {
			room.seats[index].seatIndex = index;
			let loc_temp = exports.userLocation[room.seats[index].userId];
			loc_temp.seatIndex = index;
		}
		gameService.updateRoomIdOfUserByUserId(userId, null);
	}
	else {
		gameService.updateUserExitRoom(userId, seatIndex, (err, result) => {
			if (err) {
				console.error(err);
				return;
			}
		});
	}

	var numOfPlayers = 0;
	for (var i = 0; i < room.seats.length; ++i) {
		if (room.seats[i].userId > 0) {
			numOfPlayers++;
		}
	}

	if (numOfPlayers == 0 && !(room.conf.is_daikai == "true" || room.conf.is_daikai == true)) {
		exports.destroy(roomId);
	}
};
//---------------------------------------------------------------------------
//从数据库恢复数据
exports.constructRoomFromDb = function () { }

exports.createRoom = function (roomConf, callback) {
	roomConf.renshuxuanze = 2;
	if (
		roomConf.type == null
		|| roomConf.difen == null//底分
		|| roomConf.renshuxuanze == null//选择人数
		|| roomConf.jushuxuanze == null//选择局数
		|| roomConf.kindId == null
	) {//金币结算
		return 1;
	}

	//底分
	if (roomConf.difen < 0 || roomConf.difen > exports.DI_FEN.length) {
		return 1;
	}

	if (roomConf.renshuxuanze < 0 || roomConf.renshuxuanze > exports.REN_SHU.length) {
		return 1;
	}

	if (roomConf.jushuxuanze < 0 || roomConf.jushuxuanze > 1) {
		return 1;
	}

	let aa_cost = 0;
	let player_count = exports.REN_SHU[roomConf.renshuxuanze];


	/*
	if (roomConf.club_id != null) {
		if (roomConf.cost_type == null || roomConf.is_daikai == null) {
			return 1;
		}
		roomConf.jushuxuanze++;
		//AA
		if (roomConf.cost_type == 1) {
			//代开
			if (roomConf.is_daikai) {
				if (roomConf.cost == null || roomConf.cost <= 0) {
					return 1;
				}
				roomConf.cost *= player_count;
			}
			else {
				roomConf.cost = exports.JU_SHU_COST[roomConf.jushuxuanze];
				aa_cost = roomConf.cost / player_count;
			}
		}
		else {
			roomConf.cost = exports.JU_SHU_COST[roomConf.jushuxuanze];
			aa_cost = roomConf.cost;
		}
	}
	else {
		roomConf.cost = exports.JU_SHU_COST[roomConf.jushuxuanze];
		aa_cost = roomConf.cost;
	}*/



    roomConf.cost = exports.JU_SHU_COST[roomConf.jushuxuanze];
    aa_cost = roomConf.cost;


	if (aa_cost > roomConf.gems) {
		return 2222;
	}

	return exports.isCoinsSummary(roomConf);
}

//检查金币结算条件
exports.isCoinsSummary = function (roomConf) {
	if (roomConf.jinbijiesuan == null || roomConf.kindId == "001") {//金币结算
		roomConf.jinbijiesuan = false;
	}
	if (roomConf.jinbijiesuan == false) {//金币结算
		return 0;
	}
	let bei_shu = roomConf.beishuxuanze || 1;
	let ju_shu = exports.JU_SHU[roomConf.jushuxuanze];
	roomConf.coins_bei_shu = 100;
	let limit_coins = LimitCoins[roomConf.type] * bei_shu * ju_shu * roomConf.coins_bei_shu;
	if (roomConf.limit_coins < limit_coins) {
		return 1;
	}

	roomConf.limit_coins = roomConf.limit_coins || limit_coins;

	if (!roomConf.is_daikai && roomConf.coins < roomConf.limit_coins) {
		return 2221;
	}
	return 0;
}

 exports.fnCreate = function (roomInfo, roomConf, callback) {
	var createTime = Math.ceil(Date.now() / 1000);
	roomInfo.createTime = createTime;
	roomInfo.numOfGames = 0;
	roomInfo.nextButton = 0;
	roomInfo.seats = [];
	roomInfo.conf.type = roomConf.type;
	roomInfo.conf.baseScore = exports.DI_FEN[roomConf.difen];
	roomInfo.conf.jinbijiesuan = roomConf.jinbijiesuan;
	roomInfo.conf.limit_coins = roomConf.limit_coins;
	roomInfo.conf.maxGames = exports.JU_SHU[roomConf.jushuxuanze];
	roomInfo.conf.player_count = exports.REN_SHU[roomConf.renshuxuanze];//几人牌局
	roomInfo.conf.kindId = roomConf.kindId;
	roomInfo.conf.cost = roomConf.cost;
	//roomInfo.conf.cost_type = roomConf.cost_type;
	roomInfo.conf.is_daikai = roomConf.is_daikai;
	roomInfo.conf.creator = roomConf.creator;
	roomInfo.conf.coins_bei_shu = roomConf.coins_bei_shu;

	for (var i = 0; i < roomInfo.conf.player_count; ++i) {
		roomInfo.seats.push({
			userId: 0,
			score: 0,
			name: "",
			ready: false,
			ip: null,
			seatIndex: i, //椅子号
			numHu: 0,
			numDianPao: 0,
			numGang: 0,
			numFangGang: 0,
			numZiMo: 0,
			numJiePao: 0,
			numAnGang: 0,
			numMingGang: 0,
			numChaJiao: 0,
			numHu:0,
			
			gems: 0,
			coins: 0,
		});
	}
    //写入数据库
	gameService.createRoom(roomInfo.id, roomInfo.conf, roomConf.ip, roomConf.port, createTime, roomConf.creator, roomConf.is_daikai, roomConf.club_id, function (uuid) {
		delete exports.creatingRooms[roomInfo.id];
		if (uuid != null) {
			roomInfo.uuid = uuid;
			exports.rooms[roomInfo.id] = roomInfo;
			exports.totalRooms++;
			callback(0, {
				roomId: roomInfo.id,
				cost: roomInfo.conf.cost
			});
		}
		else {
			callback(3, null);
		}
	});
}