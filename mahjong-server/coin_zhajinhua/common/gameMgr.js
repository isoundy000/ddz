/**
 * @author hyw
 * @date 2018/8/21 0021
 * @description: {描述一下文件的功能}
 */

var commonService = require('../../common/service/commonService')
var gameService = require('../../common/service/gameService')
var playerService = require('../../common/service/playerService')
var robotServer = require('./robotServer');

var gameLogic = require('./gameLogic');

var Room = require('./entity/Room');
var Player = require('./entity/Player');
var dateUtil = require('../../utils/dateUtil');
var crypto = require('../../utils/crypto');
//房卡消耗
const Costs = {
    //局数：消耗房卡
    [8]: 0,
    [16]: 0,
    [-1]: 0
}

//缓存所有的房间信息
var roomList = {};
//创建中的房间
var creatingRooms = {};
//缓存玩家所在的房间
var playerLocation = {};

/**
 * 获取房间列表
 */
exports.getRoomList = function () {
    return roomList;
}


/**
 * 根据ID获取房间
 */
exports.getRoomIdByUser = function (userId) {
    var pl = playerLocation[userId];
    if(pl){
        return pl.roomId;
    }else{
        return null;
    }
}
/**
 * 根据ID获取房间信息
 */
exports.getRoomById = function (roomId) {
    return roomList[roomId];
}

/**
 * 根据玩家ID获取房间信息
 * @param userId
 * @returns {*}
 */

exports.getRoomByUserId = function (userId) {
    var room = null;
    var pl = playerLocation[userId];
    if (pl) {
        var roomId = pl.roomId;
        room = roomList[roomId];
    }
    return room;
}

/**
 * 获取房间内庄家ID
 */
exports.getBanker = function (roomId) {
    var room = roomList[roomId];
    var banker = null;
    for (var i = 0; i < room.seats.length; i++) {
        var player = room.seats[i];
        if (player.isBanker) {
            banker = player;
            break;
        }
    }
    return banker;
}

exports.getRoomCount = function () {
    let count = 0;
    for (const key in roomList) {
        count++;
    }
    return count;
}

async function generateRoomId() {
    var roomId = "";
    for (var i = 0; i < 6; ++i) {
        roomId += Math.floor(Math.random() * 10);
    }
    if (roomList[roomId] != null || creatingRooms[roomId] != null) {
        return await generateRoomId();
    }
    else {
        creatingRooms[roomId] = true;
        try {
            let roomInfo = await commonService.getTableValuesAsync('*', 't_rooms', {
                id: roomId,
            })
            if (roomInfo != null) {
                delete creatingRooms[roomId];
                return await generateRoomId();
            } else {
                return roomId;
            }
        } catch (error) {
            console.log(error);
            return 0;
        }
    }
}
//封顶必须为5，10，15，20
let fengDings = {
    [5]: true,
    [10]: true,
    [15]: true,
    [20]: true
}

/**
 * 创建房间
 * @param {*} data 用户的一些信息和创建房间的一些信息
 */
exports.createRoom = async function (data) {
    return new Promise(async (resolve, reject) => {
        //游戏id
        if (typeof (data.isPrivate) !== "number" /*|| data.type == null */ || data.kindId == null) {//金币结算
            reject("参数错误");
            return;
        }
        if (data.type != "zhajinhua") {
            reject("type不是炸金花，而是：" + data.type);
            return;
        }
        let cost = Costs[data.maxGames];
        if (cost == null) {
            reject("局数错误");
            return
        }

        // if (data.gems < cost) {
        //     resolve(2222);
        //     return;
        // }

        if (Number.isNaN(parseInt(data.diZhu)) == null || data.diZhu <= 0) {
            reject("底注错误");
            return
        }

        // if (data.coins < data.diZhu * 10 ||data.coins <data.minScoreLimit) {
        //     resolve(2221);
        //     return;
        // }

        if (!fengDings[data.fengDing]) {
            reject("最高轮数错误");
            return
        }

        if (data.biPai == null || data.biPai < 0 || data.fengDing < data.biPai) {
            reject("比牌轮数错误");
            return
        }

        if (data.biMen == null || data.biMen < 0 || data.fengDing < data.biMen) {
            reject("必闷错误");
            return
        }

        
        // data.biPai = 1;//最低比牌圈数
        let roomId = await generateRoomId();
        if (roomId == 0) {
            reject("创建房间出错");
            return
        }

        if(!data.roomName||data.roomName==''){
            data.roomName = data.isPrivate==1?'私密房':'畅玩房';
        }


        let roomCfg = {
            coins:data.coins,
            roomName:data.roomName,
            diZhu: data.diZhu,//底分
            seatCount: data.seatCount,//最大人数
            maxGames: data.maxGames,//最大局数
            kindId: data.kindId,//游戏id
            fengDing: data.fengDing,//封顶
            biPai: data.biPai,//最低比牌圈数
            isPrivate: data.isPrivate,//是否是私密房
            biMen: data.biMen,//必闷圈数
            type: data.type,
            // creator: data.creator,
            cost: cost,
            createTime: dateUtil.getCurrentTimestapm(),
            jinbijiesuan: true,
            limit_coins: data.diZhu * 10,
            isDaiKai: data.isDaiKai || 0,
            room_type:data.room_type,
            choushuiRate:data.choushuiRate,
            minScoreLimit:data.minScoreLimit,
            maxScoreLimit:data.maxScoreLimit,
            serial_num:data.serial_num,
            bl : data.bl,
        }

        if(data.password){
            roomCfg.password = data.password;
        }

        roomList[roomId] = new Room(roomId, roomCfg, data.creator);
        try {
            let uuid = "" + roomCfg.createTime + roomId
            await commonService.saveAsync("t_rooms", {
                uuid: uuid,
                id: roomId,
                base_info: JSON.stringify(roomCfg),
                ip: data.ip,
                port: data.port,
                create_time: roomCfg.createTime,
                state: "idle",
                creator_id: data.creator,
                is_private: data.isPrivate,
                room_type:data.room_type,
                game_id: data.kindId,
                is_daikai: data.isDaiKai || 0,
                // belongs_club
            })
            delete creatingRooms[roomId];
            resolve({ roomId: roomId, cost: cost, });
        } catch (error) {
            console.log(error);
            reject(error);
        }
    })
}

/**
 * 进入房间
 * @param {*} data 用户的一些信息和进入房间的一些信息
 */
exports.enterRoom = async function (data) {
    let joinRoom = async function (room, roomId, userInfo) {
        try {
            var currentPlayer = room.getPlayerById(userInfo.userId);
            if (currentPlayer != null) {
                currentPlayer.updateCoins(userInfo.coins);
                return 0;
            }
            let seatIndex = room.getFreeSeatIndex();
            if (seatIndex == -1) {
                //房间满员了
                return 4;
            }
            await commonService.updateAsync('t_rooms', {
                [`user_id${seatIndex}`]: userInfo.userId,
                [`user_icon${seatIndex}`]: "",
                [`user_name${seatIndex}`]: crypto.toBase64(userInfo.name),
                [`user_coins${seatIndex}`]: userInfo.coins,
                [`user_ctrl_param${seatIndex}`]: userInfo.ctrlParam,
            }, "id", roomId);
            let player = new Player(roomId, seatIndex, userInfo);
            room.joinRoom(player);
            if (room.seats.length == 1) {
                room.setBanker(data.userId);
            }

            playerLocation[userInfo.userId] = {
                seatIndex: seatIndex,
                roomId: roomId,
            }
            return 0
        } catch (error) {
            console.log(error);
            room.seatsHasPlayer[seatIndex] = false;
            return 5
        }
    }

    let room = roomList[data.roomId];
    if (room != null) {
        return await joinRoom(room, data.roomId, {
            name: data.name,
            userId: data.userId,
            coins: data.coins,
            headimg: data.headimg,
            ctrlParam: data.ctrlParam,
            sex:data.sex,
            is_robot:data.is_robot
        })
    } else {
        //恢复数据，暂缓
        console.log('********开始恢复数据*********');

        let roomInfo = await commonService.getTableValuesAsync("*", "t_rooms", { id: data.roomId });
        if (roomInfo == null) {
            return 3;
        }
        let roomCfg = JSON.parse(roomInfo.base_info);
        roomCfg.isDaiKai = roomInfo.is_daikai;
        room = new Room(data.roomId, roomCfg, roomInfo.creator_id);
        roomList[data.roomId] = room;
        for (let i = 0; i < roomCfg.seatCount; i++) {
            let name = roomInfo[`user_name${i}`];
            let userId = roomInfo[`user_id${i}`];
            //判断是否已经在房间里了
            let tempPlayer = room.getPlayerById(userId);
            if(tempPlayer){
                continue;
            }
            //判断是否是机器人
            let userInfo = await commonService.getTableValuesAsync("*", "t_users", { userid: userId });
            if (userInfo) {
                let player = new Player(data.roomId, i,{
                    name: crypto.fromBase64(name),
                    userId: userId,
                    coins: userInfo.coins,
                    headimg: userInfo.headimg,
                    ctrlParam: roomInfo[`user_ctrl_param${i}`],
                    sex:userInfo.sex,
                    is_robot:userInfo.is_robot
                });
                room.joinRoom(player);
                if (room.seats.length == 1) {
                    room.setBanker(userId);
                }
                playerLocation[userId] = {
                    seatIndex: i,
                    roomId: data.roomId,
                }
                //如果是机器人
                if(userInfo.is_robot==1){
                    //判断其是否还仍旧在房间游戏内
                    if(!userInfo.roomid){
                        gameService.updateUserExitRoom(userId, i, (err, result) => {
                            if (err) {
                                console.error(err);
                            }
                        });
                    }else{
                        //通知机器人重新登录游戏
                        console.log('*******通知机器人重新连接游戏*******');
                        robotServer.joinRoom(data.roomId,userId);
                    }
                }
            }
        }
        return await joinRoom(room, data.roomId, {
            name: data.name,
            userId: data.userId,
            coins: data.coins,
            headimg: "",
            ctrlParam: data.ctrlParam,
            is_robot:0
        })
    }
}

/**
 * 退出房间
 * @param userId
 */
exports.exitRoom = function (userId) {
    var location = playerLocation[userId];
    if (location == null)
        return;

    var roomId = location.roomId;
    var room = roomList[roomId];
    var player = room.getPlayerById(userId);
    delete playerLocation[userId];
    if (room == null) {
        return;
    }

    //如果游戏还没开始,可直接从房间退出
    room.exitRoom(userId);
    //从数据库中移除玩家
    gameService.updateUserExitRoom(userId, player.seatIndex, (err, result) => {
        if (err) {
            console.error(err);
        }
    });
};


/**
 * 解散房间
 * @param roomId
 */
exports.destroy = function (roomId) {
    //清除房间的playerLocaltion
    var roomInfo = roomList[roomId];
    if (roomInfo == null) {
        return;
    }
    delete roomList[roomId];
    gameService.deleteRoom(roomId, (err, result) => {
        if (err) {
            console.log("删除房间失败");
            console.log(err);
        }
    });
}



/*******************************************/
/**
 * 比牌
 * @param me 比牌者
 * @param other 被比牌者
 */
exports.bipai = function (me, other) {
    var myPokers = me.hold;
    var otherPokers = other.hold;
    var result = gameLogic.compare(myPokers, otherPokers);
    var isWin = 0;
    //判断牌型是否相同,谁主动比牌谁输
    if (result > 0) {
        isWin = 1;
    }
    return isWin;
}



/**
 * 游戏结算
 */
exports.settlement = function (roomId) {
    var roomInfo = roomList[roomId];
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];
        if (player.state != player.PLAY_STATE.FREE) {
            if (player.isWin == 1&&player.state!=player.PLAY_STATE.FAIL) {
                player.settlement(roomInfo.totalBets,roomInfo);
            } else {
                // if()
                player.settlement(0 - player.allBets,roomInfo);
            }
        }
    }
}

/**
 * 开牌
 */
exports.kaipai = function (roomId) {
    var roomInfo = roomList[roomId];
    //缓存未弃牌的玩家的信息
    var playingUserList = [];
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];
        if (player.state != player.PLAY_STATE.FREE && player.state != player.PLAY_STATE.FAIL) {
            if (player.optState && player.optState != player.OPT_STATE.QI_PAI) {
                playingUserList.push(player);
            }
        }
    }

    //先把第一个设置为大赢家
    playingUserList[0].setWinOrLost(1);
    var winner = playingUserList[0];

    for (let i = 1; i < playingUserList.length; i++) {
        var me = playingUserList[i];
        var isWin = exports.bipai(me, winner);
        if (isWin == 1) {
            winner.setWinOrLost(0);
            playingUserList[i].setWinOrLost(1);
            winner = me;
        } else {
            playingUserList[i].setWinOrLost(0);
        }
    }

    for (let i = 0; i < playingUserList.length; i++) {
        for (let j = 0; j < roomInfo.seats.length; j++) {
            var player = roomInfo.seats[j];
            if (playingUserList[i].userId == roomInfo.seats[j].userId) {
                player.setWinOrLost(playingUserList[i].isWin);
                if (playingUserList[i].isWin == 0) {
                    player.setState(player.PLAY_STATE.FAIL);
                }
            } else {
                if (player.state != player.PLAY_STATE.FREE) {
                    player.addCompareList(playingUserList[i].userId);
                }
            }
        }
    }
}

/**
 * 重置房间数据
 */
exports.resetRoomData = function (roomId) {
    var roomInfo = roomList[roomId];
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];
        if (player.state != player.PLAY_STATE.FREE) {
            player.reset()
        }
    }
    roomInfo.reset();
}

//清除掉已经掉线的玩家
exports.clearRoom = function (roomId) {
    var roomInfo = roomList[roomId];
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];
        if (!player.isOnline) {
            exports.exitRoom(player.userId);
        }
    }
}



//换牌  返回一手比传入参数大的牌型
exports.huanPai = function(roomId,otherPokers){
    var roomInfo = roomList[roomId];
    var usedPokers = [];
    for (let i = 0; i < roomInfo.seats.length; i++) {
        let tempPlayer = roomInfo.seats[i];
        if (tempPlayer.state!=tempPlayer.PLAY_STATE.FREE) {
            if(tempPlayer.hold&&tempPlayer.hold.length>0){
                usedPokers = usedPokers.concat(tempPlayer.hold);
            }
        }
    }

    let exchaged = gameLogic.huanPai(usedPokers,otherPokers);
    console.log('换牌后：'+exchaged);
    return exchaged;
}

