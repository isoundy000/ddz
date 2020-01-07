/**
 * @author hyw
 * @date 2018/9/13 0013
 * @description: 炸金花机器人服务
 */
var gameMgr = require('./gameMgr');
var tokenMgr = require("../common/tokenmgr");
var robotMgr = require('./robotMgr');
var crypto = require('../utils/crypto');
var config = require('../configs').game_server_zhajinhua;
var commonUtil = require('../utils/commonUtil');
var dateUtil = require('../utils/dateUtil');
var RobotSocket = require('./entity/RobotSocket');
var socketHandler = require('./socketHandler');
var gameService = require('../common/service/gameService')
var commonService = require('../common/service/commonService');

/**
 * 启动机器人服务
 * @param intervalTime 每隔多少毫秒执行一次扫描
 */
exports.start = function (intervalTime) {
    //加载机器人
    //启动定时器循环扫描非私密房的房间，适当加入机器人
    setInterval(() => {
        scanRoom();
    }, intervalTime);
}

//扫描房间
function scanRoom() {
    //获取房间列表
    var roomList = gameMgr.getRoomList();
    Object.keys(roomList).forEach(async function(key){
        var roomInfo = roomList[key];
        if(roomInfo){
            //如果是畅玩房
            if(roomInfo.isPrivate==0){
                //判断房间是否已满及当前机器人的数量
                var playerCount = roomInfo.getPlayerCount();
                var currentRobotCount = roomInfo.getCurrentRobotCount();

                console.log('***当前房间【'+roomInfo.roomId+'】玩家的数量：'+playerCount+'   机器人的数量:'+currentRobotCount);
                //当房间人数小于1-2人才添加机器人
                let maxPlayerInRoom = commonUtil.randomFrom(1,2);
                if(playerCount<=maxPlayerInRoom){
                    
                    let robotCount = commonUtil.randomFrom(1,2);
                    if(robotCount>0&&robotCount<3){
                        await addRobot(roomInfo.roomId,robotCount);
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
async  function addRobot(roomId,count){
    var robotCount = await robotMgr.getRobotCount();
    // console.log('********机器人的数量【'+robotCount+'】************');
    //如果机器人队列中的机器人数量满足
    if(robotCount>count){
        console.log('*******向房间【'+roomId+'】中添加机器人，数量:'+count);
        for(let i=0;i<count;i++){
            var delayTime = commonUtil.randomFrom(1000,4000);
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
        //console.log('*******机器人开始进入房间*********');
        let robot = await robotMgr.getRobot();
        if(!robot){
            return;
        }
        let userId = robot.userid;
        var diZhu = roomInfo.diZhu;
        //最大比伦
        let fengDing = roomInfo.fengDing;
        let coins=0;
        //根据房间的底注初始化机器人携带的金币量
        if(roomInfo.room_type !=="shiwanfang"){
            var minScore = roomInfo.minScoreLimit;
            coins = commonUtil.randomFrom(minScore,roomInfo.maxScoreLimit)
        }else{
            coins = roomInfo.coins
        }
        //console.log('******随机分数*******:'+minScore);
        await commonService.updateAsync('t_users', {
            coins: coins
        }, "userid", userId);

        //构造机器人进入房间数据
        var data = {
            roomId: roomId,
            userId: userId,
            name: crypto.fromBase64(robot.name),
            gems: parseInt(robot.gems),
            coins: coins,
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
                    reqData.userId = userId;
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