/**
 * @author hyw
 * @date 2018/9/13 0013
 * @description: 炸金花机器人服务
 */
var gameMgr = require('./gameMgr');
var tokenMgr = require("../../common/tokenmgr");
var robotMgr = require('./robotMgr');
var crypto = require('../../utils/crypto');
var config = require('../../configs').coinNIUNIU;
var commonUtil = require('../../utils/commonUtil');
var dateUtil = require('../../utils/dateUtil');
var RobotSocket = require('./entity/RobotSocket');
var socketHandler = require('./socketHandler');
var gameService = require('../../common/service/gameService')
var commonService = require('../../common/service/commonService')


/**
 * 启动机器人服务
 * @param intervalTime 每隔多少毫秒执行一次扫描
 */
exports.start = function (intervalTime) {
    //启动定时器循环扫描非私密房的房间，适当加入机器人
    setInterval(() => {
        scanRoom(config);
    }, intervalTime);
}

//扫描房间
function scanRoom() {
    //获取房间列表
    var roomList = gameMgr.getRoomList();
    // console.log(`机器人获取房间列表`);
    // console.log(roomList)
    Object.keys(roomList).forEach(function(key){
        var roomInfo = roomList[key];
        // console.log(`机器人获取房间列表${roomInfo}`)
        if(roomInfo){
            // console.log("123"+roomInfo.robotCount)
            //如果是畅玩房
            if(roomInfo.isPrivate==0){
                //判断房间是否已满及当前机器人的数量
                var playerCount = roomInfo.getPlayerCount();
                console.log(playerCount);
                console.log('***当前房间【'+roomInfo.roomId+'】玩家的数量****：'+playerCount);
                //当房间人数小于5人才添加机器人
                // let maxPlayerInRoom = commonUtil.randomFrom(1,2);
                if(playerCount<3){
                    //随机进入房间的机器人数量
                    var robotCount = commonUtil.randomFrom(1,2);
                    if(robotCount>0){
                        addRobot(roomInfo.roomId,1);
                    }
                }

                
            
        }
        }
    })
}

/**
 * 向房间中添加机器人
 * @param roomId 房间ID
 * @param count 添加机器人的数量
 */
async function addRobot(roomId,count){
    var robotCount = await robotMgr.getRobotCount();
    console.log(robotCount)
    //如果机器人队列中的机器人数量满足
    if(robotCount>count){
        console.log('*******向房间【'+roomId+'】中添加机器人，数量:'+count);
        for(let i=0;i<count;i++){
            var delayTime = commonUtil.randomFrom(1000,10000);
            enterRoom(roomId,delayTime);
        }
    }
}


/**
 * 机器人加入房间
 */
function enterRoom(roomId,delayTime){
    setTimeout(async function(){
        var roomInfo = gameMgr.getRoomById(roomId);
        if(!roomInfo){
            return;
        }
        let robot = await robotMgr.getRobot();
        if(!robot){
            return;
        }
        let userId = robot.userid;
        var diZhu = roomInfo.diZhu;
        let coins=0;
        //根据房间的底注初始化机器人携带的金币量
        if(roomInfo.room_type !=="shiwanfang"){
            var minScore = roomInfo.minScoreLimit;
            coins = commonUtil.randomFrom(minScore,roomInfo.maxScoreLimit)
        }else{
            coins = roomInfo.coins
        }
        
        // console.log("机器人的金币"+minScore)
        await commonService.updateAsync('t_users', {
            coins: coins
        }, "userid", userId);
        //构造机器人进入房间数据
        var data = {
            roomId: roomId,
            userId: userId,
            name: crypto.fromBase64(robot.name),
            sex:1,
            headimg:robot.headimg,
            coins: parseInt(coins),
            ctrlParam: robot.ctrl_param,
            is_robot:1
        }
        var enterStatus = await gameMgr.enterRoom(data);
        gameService.updateRoomIdOfUserByUserId(userId, roomId, (err, result) => {
            if (err) {
                return;
            }else{
                if(enterStatus==0&&result.affectedRows>0){
                    var time = dateUtil.getCurrentTimestapm();
                    // var token = tokenMgr.createToken(userId, 5000);
                    var sign = crypto.md5(roomId  + time + config.ROOM_PRI_KEY);
                    var reqData = {};
                    reqData.time = time;
                    // reqData.token = token;
                    reqData.sign = sign;
                    reqData.roomId = roomId;
                    reqData.userId = robot.userid
                    
                    var robotSocket = new RobotSocket(robot.userid);
                    socketHandler.robot_login(robotSocket,JSON.stringify(reqData));
                }else{
                    console.log('***********机器人进入房间失败，状态码:'+enterStatus);
                }
            }
        });
    },delayTime);
}

/**
 * 加入房间
 */
exports.joinRoom = function(roomId,userId){
    var time = dateUtil.getCurrentTimestapm();
    // var token = tokenMgr.createToken(userId, 5000);
    var sign = crypto.md5(roomId + time + config.ROOM_PRI_KEY);
    var reqData = {};
    reqData.time = time;
    // reqData.token = token;
    reqData.sign = sign;
    reqData.roomId = roomId;
    reqData.userId = userId;
    var robotSocket = new RobotSocket(userId);
    socketHandler.robot_login(robotSocket,JSON.stringify(reqData));
}
