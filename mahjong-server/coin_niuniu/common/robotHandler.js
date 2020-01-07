/**
 * @author hyw
 * @date 2018/9/17 0017
 * @description: {描述一下文件的功能}
 */
var dateUtil = require('../../utils/dateUtil');
var userMgr = require('./userMgr');
var gameMgr = require('./gameMgr');
var gameLogic = require('./gameLogic');
var commonUtil = require('../../utils/commonUtil');
var socketHandler = require('./socketHandler');
var robotMgr = require('./robotMgr');


/**
 * 机器人金币不足时退出游戏
 */
exports.exit = function(userId){
    if(!userId){
        return;
    }
    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;
    socketHandler.exit(robotSocket,JSON.stringify(resData));
    //使用过的机器人重新放回机器人队列中
    robotMgr.addRobot(userId);
}

/**
 * 检测是否只剩一个机器人
 */
exports.checkCanExit = function(userId){
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        return;
    }
    let playerCount = roomInfo.getPlayerCount();
    if(playerCount==1){
        let time = commonUtil.randomFrom(5000,10000);
        var robotSocket = userMgr.get(userId);
        var resData = {};
        resData.userId = userId;
        setTimeout(function(){
            socketHandler.exit(robotSocket,JSON.stringify(resData));
        },time);
    }
}

/**
 * 用户准备 判断机器人是否达到自动退出条件，满足的话自动离开房间（判断属性  游戏时长、局数）
 * @param userId
 */
exports.ready = function(userId) {
    if(!userId){
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        return
    }
    var player = roomInfo.getPlayerById(userId);
    if(!player){
        return;
    }

    //判断是否已经准备过了
    if(player.PLAY_STATE.READY==player.state){
        return;
    }
    let zr = 0;
    let seats = roomInfo.seats;
    for(let i of seats){
        if(i.isRobot ===0){
            zr+=1;
        }
    }
    var playTime = dateUtil.getCurrentTimestapm()-player.beginGameTime;
    var numOfGame = player.numOfGame;

    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;

    //多少局退出
    var maxNumOfGame = commonUtil.randomFrom(2,7);
    var maxPlayTime = commonUtil.randomFrom(4,8);
    //玩家退出
    if(playTime>maxPlayTime*60*60||numOfGame>maxNumOfGame ||zr>=3){
        socketHandler.exit(robotSocket,JSON.stringify(resData));
        //使用过的机器人重新放回机器人队列中
        robotMgr.addRobot(userId);
    }else{
        socketHandler.ready(robotSocket,JSON.stringify(resData));
    }
}

//poker的牌型  0:无牛，1~9:牛一~牛9，10:牛牛，20:五花牛，30 五小牛,40 炸弹；
/**
 * 抢庄0~4
 */
exports.qiangZhuang = function(userId,data){
    if(!userId){
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        return;
    }
    var player = roomInfo.getPlayerById(userId);
    //判断玩家是否参与进了游戏
    if(player.state!=player.PLAY_STATE.PLAYING){
        return;
    }
    //判断是否已经押注过了
    if(player.optState==1){
        return;
    }

    var maxBeiShu = data.qiangZhuangBeiShu;
    var pokerType = gameLogic.getPokerType(player.hold);
    //根据牌型选择抢庄倍数
    //无牛尽量不选
    let qiangZhunagBeiShu = 0;
    if(3<pokerType){
        qiangZhunagBeiShu = commonUtil.randomFrom(0,maxBeiShu);
    }

    //console.log('***最大抢庄倍数:'+maxBeiShu+'*****机器人牌型：'+pokerType+'   机器人抢庄倍数：'+qiangZhunagBeiShu);

    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;
    resData.beishu = qiangZhunagBeiShu;
    socketHandler.qiangZhuang(robotSocket,JSON.stringify(resData));
}

/**
 * 押注1~5
 */
exports.yaZhu = function(userId){
    if(!userId){
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        return;
    }
    //不在押注阶段
    if(roomInfo.gameState!=roomInfo.GAME_STATE.YA_ZHU){
        return;
    }


    var player = roomInfo.getPlayerById(userId);
    if(player.state!=player.PLAY_STATE.PLAYING){
        return;
    }

    if(roomInfo.getBanker()&&(roomInfo.getBanker().userId==player.userId)){
        return;
    }
    //判断是否已经押注过了
    if(player.optState==2){
        return;
    }

    let beishu = [5,10,15,20]
    var pokerType = gameLogic.getPokerType(player.hold);
    //根据牌型选择押分倍数
    let yaZhuBeiShu = 1;
    if(0<=pokerType&&pokerType<6){
        yaZhuBeiShu = beishu[commonUtil.randomFrom(0,1)];
    }else if(6<pokerType&&pokerType<10){
        yaZhuBeiShu = beishu[commonUtil.randomFrom(1,2)];
    }else{
        yaZhuBeiShu = beishu[commonUtil.randomFrom(2,3)];
    }

    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;
    resData.beishu = yaZhuBeiShu;
    socketHandler.yaZhu(robotSocket,JSON.stringify(resData));

}

/**
 * 亮牌
 */
exports.liangPai = function(userId){
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    if(player.state!=player.PLAY_STATE.PLAYING){
        return;
    }
    var robotSocket = userMgr.get(userId);
    if(player.optState!=3){
        var resData = {};
        resData.userId = userId;
        socketHandler.liangPai(robotSocket,JSON.stringify(resData));
    }
}