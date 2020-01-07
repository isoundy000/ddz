var db = require('../utils/db');
var roommgr = require('../common/roommgr')
var gameService = require('../common/service/gameService')

var gamemgr_zzmj = require("./gamemgr_zzmj");

//随机生成房间号
var generateRoomId = roommgr.generateRoomId;

exports.enterRoom = roommgr.enterRoom;

exports.destroy = roommgr.destroy;

exports.dismissRoomByRoomId = roommgr.dismissRoomByRoomId;

exports.getTotalRooms = roommgr.getTotalRooms;

exports.getRoom = roommgr.getRoom;

exports.isCreator = roommgr.isCreator;

exports.setReady = roommgr.setReady;

exports.isReady = roommgr.isReady;

//房间id号
exports.getUserRoom = roommgr.getUserRoom;

//通过玩家id获取房间椅子号
exports.getUserSeat = roommgr.getUserSeat;

exports.getUserLocations = roommgr.getUserLocations;

exports.exitRoom = roommgr.exitRoom;

//从数据库恢复数据
function constructRoomFromDb(dbdata) {
	var roomInfo = {
		uuid: dbdata.uuid,
		id: dbdata.id,
		numOfGames: dbdata.num_of_turns,
		createTime: dbdata.create_time,
		nextButton: dbdata.next_button,
		conf: JSON.parse(dbdata.base_info)
	};
	var player_count = roomInfo.conf.player_count
	roomInfo.seats = new Array(player_count)

	roomInfo.gameMgr = gamemgr_zzmj
	
	var roomId = roomInfo.id;

	for (var i = 0; i < player_count; ++i) {
		var s = roomInfo.seats[i] = {};
		s.userId = dbdata["user_id" + i];
		s.score = dbdata["user_score" + i];
		s.name = dbdata["user_name" + i];
		s.gems = dbdata["user_gems" + i];
		s.coins = dbdata["user_coins" + i];
		s.ctrl_param = dbdata["user_ctrl_param" + i]
		s.ready = false;
		s.seatIndex = i;
		s.numHu = 0;
		s.numDianPao = 0;
		s.numGang = 0;
		s.numFangGang = 0;

		if (s.userId > 0) {
			roommgr.userLocation[s.userId] = {
				roomId: roomId,
				seatIndex: i
			};
		}
	}
	roommgr.rooms[roomId] = roomInfo;
	roommgr.totalRooms++;
	return roomInfo;
}
//创建房间，将数据存入到数据库
exports.createRoom = function (roomConf, callback) {

	console.log("********创建郑州麻将*********");
    console.log(roomConf);

	if (
		roomConf.hunpai == null//混牌
		|| roomConf.fengpai == null//风牌
		|| roomConf.xiapao == null//下跑
		|| roomConf.hupai == null//胡牌方式
		|| roomConf.gangpao == null//杠跑
		|| roomConf.zhuangjiajiadi == null//庄家加倍
		|| roomConf.qiduijiabei == null//七对加倍
		|| roomConf.gangshanghuajiabei == null//杠上花加倍
	) {
		callback(1, null);
		return;
	}

	if (roomConf.hunpai < 0 || roomConf.hunpai > 2) {
		callback(1, null);
		return;
	}

	if (roomConf.hupai < 0 || roomConf.hupai > 2) {
		callback(1, null);
		return;
	}

	if (roomConf.fengpai < 0 || roomConf.fengpai > 2) {
		callback(1, null);
		return;
	}

	if (roomConf.xiapao < 0 || roomConf.xiapao > 2) {
		callback(1, null);
		return;
	}

	let err_code = roommgr.createRoom(roomConf);
	if (err_code != 0) {
		callback(err_code, null);
		return
	}

	var fnCreate = function () {
		var roomId = generateRoomId();
		if (roommgr.rooms[roomId] != null || roommgr.creatingRooms[roomId] != null) {
			fnCreate();
		}
		else {
			roommgr.creatingRooms[roomId] = true;
			gameService.isRoomExist(roomId, (err, result) => {
				if (err) {
					console.log(err);
					return
				}
				if (result) {
					delete roommgr.creatingRooms[roomId];
					fnCreate();
					return
				}
				var createTime = Math.ceil(Date.now() / 1000);
				var roomInfo = {
					uuid: "",
					id: roomId,
					conf: {
						hupai: roomConf.hupai,				 //胡牌方式
						hunpai: roomConf.hunpai,				 //混牌
						fengpai: roomConf.fengpai,				 //风牌
						xiapao: roomConf.xiapao,				 //下跑
						gangpao: roomConf.gangpao,				 //杠跑
						zhuangjiajiadi: roomConf.zhuangjiajiadi,		 //庄家加倍
						qiduijiabei: roomConf.qiduijiabei,			 //七对加倍
						gangshanghuajiabei: roomConf.gangshanghuajiabei,	 //杠上花加倍
					}
				};
				roomInfo.gameMgr = gamemgr_zzmj;
				roommgr.fnCreate(roomInfo, roomConf, callback);
			});
		}
	}

	fnCreate();
};

roommgr.constructRoomFromDb = constructRoomFromDb