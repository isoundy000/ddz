/**
 * @author hyw
 * @date 2018/8/21 0021
 * @description: {描述一下文件的功能}
 */
var db = require('../../utils/db');
var http = require('../../utils/http');
var crypto = require('../../utils/crypto');
var commonRoomMgr = require('../../common/roommgr')
var gameService = require('../../common/service/gameService')
var dateUtil = require('../../utils/dateUtil');
var gameMgr = require('./gameMgr');

//随机生成房间号
var generateRoomId = commonRoomMgr.generateRoomId;
exports.enterRoom = commonRoomMgr.enterRoom;
exports.destroy = commonRoomMgr.destroy;
exports.dismissRoomByRoomId = commonRoomMgr.dismissRoomByRoomId;
exports.getTotalRooms = commonRoomMgr.getTotalRooms;
/**
 * 根据房间ID获取房间信息
 */
exports.getRoomById = commonRoomMgr.getRoom;
exports.isCreator = commonRoomMgr.isCreator;
exports.setReady = commonRoomMgr.setReady;
exports.isReady = commonRoomMgr.isReady; //房间id号
exports.getRoomIdByUser = commonRoomMgr.getUserRoom; //通过玩家id获取房间椅子号
exports.getUserSeat = commonRoomMgr.getUserSeat;
exports.getUserLocations = commonRoomMgr.getUserLocations;
exports.exitRoom = commonRoomMgr.exitRoom;

//从数据库中构建房间信息
exports.constructRoomFromDb = function(dbdata) {
    var roomInfo = {
        uuid: dbdata.uuid,
        id: dbdata.id,
        numOfGames: dbdata.num_of_turns,
        createTime: dbdata.create_time,
        //庄家
        nextButton: dbdata.next_button,
        conf: JSON.parse(dbdata.base_info)
    };
    var player_count = roomInfo.conf.player_count
    roomInfo.seats = new Array(player_count)

    roomInfo.gameMgr = gameMgr;
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

        if (s.userId > 0) {
            commonRoomMgr.userLocation[s.userId] = {
                roomId: roomId,
                seatIndex: i
            };
        }
    }
    commonRoomMgr.rooms[roomId] = roomInfo;
    commonRoomMgr.totalRooms++;
    return roomInfo;
}

//创建房间
exports.createRoom = function (roomConf, callback) {
    var fnCreate = function () {
        var roomId = generateRoomId();
        if (commonRoomMgr.rooms[roomId] != null || commonRoomMgr.creatingRooms[roomId] != null) {
            fnCreate();
        }
        else {
            commonRoomMgr.creatingRooms[roomId] = true;
            gameService.isRoomExist(roomId, (err, result) => {
                if (err) {
                    callback(err);
                    return
                }
                if (result) {
                    delete commonRoomMgr.creatingRooms[roomId];
                    fnCreate();
                    return
                }

                var roomConfig = {};
                roomConfig.createTime = dateUtil.getCurrentTimestapm();
                roomConfig.numOfGames = 0;
                roomConfig.nextButton = 0;
                roomConfig.seats = [];
                roomConfig.type = roomConf.type;
                roomConfig.baseScore = roomConf.baseScore;
                roomConfig.maxGames = exports.JU_SHU[roomConf.jushuxuanze];
                roomConfig.player_count = 9;//几人牌局
                roomConfig.kindId = roomConf.kindId;
                roomConfig.creator = roomConf.creator;

                //消耗的房卡
                roomConfig.cost = 0;
                //初始化坐位信息
                for (var i = 0; i < roomConfig.player_count; ++i) {
                    roomConfig.seats.push({
                        userId: 0,
                        score: 0,
                        name: "",
                        ready: false,
                        ip: null,
                        seatIndex: i, //椅子号
                        gems: 0,
                        coins: 0,
                    });
                }


                var roomInfo = {
                    id: roomId,
                    conf: roomConfig
                };
                roomInfo.gameMgr = gameMgr;

                //写入数据库
                gameService.createRoom(roomInfo.id, roomInfo.conf, roomConfig.ip, roomConfig.port, roomConfig.createTime, roomConfig.creator,0, roomConf.club_id, function (uuid) {
                    delete exports.creatingRooms[roomId];
                    if (uuid != null) {
                        roomInfo.uuid = uuid;
                        exports.rooms[roomId] = roomInfo;
                        exports.totalRooms++;
                        callback(0, {
                            roomId: roomId,
                            cost: roomInfo.conf.cost
                        });
                    }
                    else {
                        callback(3, null);
                    }
                });
            });
        }
    }
    fnCreate();
};
