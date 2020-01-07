/**
 * @author hyw
 * @date 2018/8/21 0021
 * @description: {描述一下文件的功能}
 */

var commonService = require('../common/service/commonService')
var gameService = require('../common/service/gameService')
var robotServer = require('./robotServer');

var gameLogic = require('./gameLogic');

var Room = require('./entity/Room');
var Player = require('./entity/Player');
var dateUtil = require('../utils/dateUtil');
var crypto = require('../utils/crypto');

//房卡消耗
const Costs = {
    //局数：消耗房卡
    [8]: 0,
    [10]: 0,
    [20]: 0
}

//缓存所有的房间信息
var roomList = {};
//创建中的房间
var creatingRooms = {};
//缓存玩家所在的房间
var playerLocation = {};
//抢庄队列{roomId:[{userId,beishu}]}
var qiangZhuangQueuen = {};

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
    return pl.roomId;
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
    if(pl){
       var roomId =pl.roomId;
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

/**
 * 创建房间
 * @param {*} data 用户的一些信息和创建房间的一些信息
 */
exports.createRoom = async function (data) {
    console.log(data)
    console.log(typeof data)
    console.log(data.room_type)
    return new Promise(async (resolve, reject) => {
        if(data.room_count !== -1){
            if (Object.keys(roomList)>data.room_count){
                reject("房间已满请稍后");
                return;
            }
        }
        //游戏id
        if (typeof (data.isPrivate) !== "number" /*|| data.type == null */ || data.kindId == null) {//金币结算
            console.log(typeof(data.isPrivate))
            reject("参数错误");
            return;
        }

        let cost = Costs[data.maxGames];
        if (cost == null) {
            reject("局数错误");
            return
        }
        
        if (data.gems < cost) {
            resolve(2222);
            return;
        }
        data.diZhu = parseInt(data.diZhu);
        if (Number.isNaN(data.diZhu) == null || data.diZhu <= 0) {
            reject("底注错误");
            return
        }
        data.qiangZhuangBeiShu = parseInt(data.qiangZhuangBeiShu);
        if (Number.isNaN(data.qiangZhuangBeiShu) == null || data.qiangZhuangBeiShu <= 0) {
            reject("抢庄倍数错误");
            return
        }

        // if (data.coins < data.minScoreLimit) {
        //     resolve(2221);
        //     return;
        // }

    
        let roomId = await generateRoomId();
        if (roomId == 0) {
            reject("创建房间出错");
            return
        }
        let roomCfg = {
            coins:data.coins,
            diZhu: data.diZhu,//底分
            seatCount: data.seatCount,//最大人数
            maxGames: data.maxGames,//最大局数
            kindId: data.kindId,//游戏id
            isPrivate: data.isPrivate,//是否是私密房
            type: data.type,//房间结算方式
            diZhu: data.diZhu,
            paixing:data.paixing,//允许和禁止的牌型
            cost: cost,
            qiangZhuangBeiShu: data.qiangZhuangBeiShu,
            createTime: dateUtil.getCurrentTimestapm(),
            jinbijiesuan: true,
            limit_coins: data.diZhu * data.qiangZhuangBeiShu * 25,
            isDaiKai: data.isDaiKai || 0,
            minScoreLimit:data.minScoreLimit,
            maxScoreLimit:data.maxScoreLimit,
            choushuiRate:data.choushuiRate,
            READY_COUNTDOWN:data.READY_COUNTDOWN,
            OPT_COUNTDOWN:data.OPT_COUNTDOWN,
            room_type:data.room_type,//房间房费方式
            jiesuanType:data.jiesuanType,
            // robotCount:data.robotCount,
            serial_num:data.serial_num,
            clubId:data.clubId,
            
        }
        roomList[roomId] = new Room(roomId, roomCfg, data.creator);
        // console.log(roomList)
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
                game_id: data.kindId,
                room_type:data.roomType,
                is_daikai: data.isDaiKai || 0,
                club_id:data.clubId,//房间所属于的俱乐部id，为0则表明不属于任何俱乐部
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
    console.log("enterroom的参数")
    // console.log(data)
    let joinRoom = async function (room, roomId, userInfo) {
        try {
            if (room.getPlayerById(userInfo.userId) != null) {
                return 0
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
            gems:data.gems,
            ctrlParam: data.ctrlParam,
            is_robot:data.is_robot
        })
    } else {
        //恢复数据，暂缓
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
            if (name != "") {
                let player = new Player(data.roomId, i, {
                    name: crypto.fromBase64(name),
                    userId: userId,
                    coins: userInfo.coins,
                    headimg: userInfo.headimg,
                    ctrlParam: roomInfo[`user_ctrl_param${i}`],
                    is_robot:userInfo.is_robot
                });
                room.joinRoom(player);
                playerLocation[userId] = {
                    seatIndex: i,
                    roomId: data.roomId,
                }
                //如果是机器人
                if(userInfo.is_robot==1){
                    //判断其是否还仍旧在房间游戏内
                    console.log("jiqiren")
                    console.log(userInfo)
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
            headimg: data.headimg,
            gems:data.gems,
            ctrlParam: data.ctrlParam,
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
exports.bipai = function(me,other){
    var myPokers = me.hold;
    var myPokerType = gameLogic.getPokerType(myPokers);
    var otherPokers = other.hold;
    var otherPokerType = gameLogic.getPokerType(otherPokers);

    var result = gameLogic.compare(myPokers,otherPokers);

    var isWin = 0;
    //判断牌型是否相同
    if(result==0){
        //判断自己是不是庄家
        if(me.isBanker){
            isWin = 1;
        }else{
            isWin = 0;
        }
    }

    if(result>0){
        isWin = 1;
    }

    return isWin;
}



/**
 * 游戏结算
 */
exports.settlement = function(roomId){
    console.log("jiesuan")
    var roomInfo = roomList[roomId];

    var banker = roomInfo.getBanker();
    var bankerBetBeiShu = banker.betBeiShu;
    //处理玩家都没抢庄的情况
    if(bankerBetBeiShu==0){
        bankerBetBeiShu=1;
    }

    //庄家手牌
    var bankerHold = banker.hold;
    var bankerPokerType = gameLogic.getPokerType(roomId,bankerHold);
    var diZhu = roomInfo.diZhu;

    for(var i=0;i<roomInfo.seats.length;i++){
        var totalWin = 0;
        var xianjia = roomInfo.seats[i];
        console.log("xianjia",xianjia)
        if(xianjia.state!=xianjia.PLAY_STATE.FREE&&xianjia.isBanker==0){
            //闲家手牌
            var xianjiaHold = xianjia.hold;
            console.log("xianjiaHold",xianjiaHold)
            console.log("bankerHold",bankerHold);
            //闲家牌的类型
            var xianjiaPokerType = gameLogic.getPokerType(roomId,xianjiaHold);

            var xianjiaBetBeiShu = xianjia.betBeiShu;
            var isWin = gameLogic.compare(bankerHold,xianjiaHold,roomId);
            console.log("isWin",isWin)
            //庄家赢
            if(isWin==1){

                totalWin = xianjiaBetBeiShu*bankerBetBeiShu*gameLogic.radio[bankerPokerType]*diZhu;
                console.log("totalWin00000000000000000000000000000000000000000000",totalWin)
                if (xianjia.coins<totalWin &&roomInfo.type=="jinbi"){
                    xianjia.updateTotalWin(0-xianjia.coins);
                }else{
                    xianjia.updateTotalWin(0-totalWin);
                }
                
                banker.updateTotalWin(totalWin);
            }else{
                totalWin = xianjiaBetBeiShu*bankerBetBeiShu*gameLogic.radio[xianjiaPokerType]*diZhu;
                console.log("totalWin11111111111111111111111111111111111111111111111111",totalWin)
                xianjia.updateTotalWin(totalWin);
                if (banker.coins<totalWin && roomInfo.type=="jinbi"){
                    banker.updateTotalWin(0-banker.coins);
                }else{
                    banker.updateTotalWin(0-totalWin);
                }
                
            }
        }
    }
    console.log("要结算的房间信息aaaaa")
    // console.log(roomInfo)
}


/**
 * 重置房间数据
 */
exports.resetRoomData = function(roomId){
    var roomInfo = roomList[roomId];
    for(var i=0;i<roomInfo.seats.length;i++){
        var player = roomInfo.seats[i];
        if(player.state!=player.PLAY_STATE.FREE){
            player.reset()
        }
    }
    roomInfo.reset();
}

//清除掉已经掉线的玩家
exports.clearRoom = function(roomId){
    var roomInfo = roomList[roomId];
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];
        if (!player.isOnline) {
            exports.exitRoom(player.userId);
        }
    }
}

/**
 * 从排序好的抢庄列表中获取抢庄倍数相同的玩家
 */
exports.getSameBeiShu = function(qiangzhaungList){
    var sameBeiShuList = [];
    if(qiangzhaungList&&qiangzhaungList.length>1){
        if(qiangzhaungList[0].beishu==qiangzhaungList[1].beishu){
            sameBeiShuList.push(qiangzhaungList[0]);
            sameBeiShuList.push(qiangzhaungList[1]);
            for(let i=2;i<qiangzhaungList.length;i++){
                var player = qiangzhaungList[i];
                if(player.beishu==qiangzhaungList[0].beishu){
                    sameBeiShuList.push(player);
                }else{
                    break;
                }
            }
        }
    }
    return sameBeiShuList;
}