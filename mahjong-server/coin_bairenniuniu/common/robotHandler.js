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

    var playTime = dateUtil.getCurrentTimestapm()-player.beginGameTime;
    var numOfGame = player.numOfGame;

    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;

    //多少局退出
    var maxNumOfGame = commonUtil.randomFrom(2,7);
    var maxPlayTime = commonUtil.randomFrom(4,8);
    //玩家退出
    if(playTime>maxPlayTime*60*60||numOfGame>maxNumOfGame){
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
exports.shangZhuang = function(userId,data){
    // console.log("开始进入奖状阶段")
    if(!userId){
        return;
    }
    
    var roomInfo = gameMgr.getRoomByUserId(userId);
    // console.log(1111111111111111111111111111111111)
    // console.log(roomInfo);
    if(!roomInfo){
        return;
    }
    var player = roomInfo.getPlayerById(userId);
    //判断玩家是否参与进了游戏
    // if(player.state!=player.PLAY_STATE.PLAYING){
    //     return;
    // }
    let coins = player.coins;
    // console.log("机器人金币00000000000000000"+coins)
    // let roomInfo = gameMgr.getRoomByUserId(userId);
    let zjList = roomInfo.zjList;
    // console.log("shangzhuangliebiao"+zjList.length)
    if(coins > 20000 && zjList.length<5){
        var robotSocket = userMgr.get(userId);
        var resData = {};
        resData.userId = userId;
        // resData.beishu = BeiShu;

        
        // console.log("机器人开始上庄")
        socketHandler.shangZhuang(robotSocket,JSON.stringify(resData));
    }

    //console.log('***最大抢庄倍数:'+maxBeiShu+'*****机器人牌型：'+pokerType+'   机器人抢庄倍数：'+qiangZhunagBeiShu);


}

//判断机器人是否达到了退出条件
exports.exit2 = function(userId,data){
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    var playTime = dateUtil.getCurrentTimestapm()-player.beginGameTime;
    var numOfGame = player.numOfGame;

    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;

    //多少局退出
    var maxNumOfGame = commonUtil.randomFrom(2,7);
    var maxPlayTime = commonUtil.randomFrom(4,8);
    //玩家退出
    if(playTime>maxPlayTime*60*60||numOfGame>maxNumOfGame){
        if(player.isBanker === 0){
            socketHandler.exit(robotSocket,JSON.stringify(resData));
        }
        
        //使用过的机器人重新放回机器人队列中
        robotMgr.addRobot(userId);
    }
}
/**
 * 押注
 */
exports.yaZhu = function(userId){
    if(!userId){
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        console.log("房间不对")
        return;
    }
    //不在押注阶段
    if(roomInfo.gameState!=roomInfo.GAME_STATE.YA_ZHU){
        console.log("不是押注阶段")
        return;
    }
    var player = roomInfo.getPlayerById(userId);

    if(player.isBanker===1){
        console.log("机器人是庄家",player.userId)
        return;
    }

    let pokerId = commonUtil.randomFrom(2,5);
    let index = commonUtil.randomFrom(0,4);
    let bet =[1,10,50,100,500]
    let cishu = commonUtil.randomFrom(5,10)
    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.pokerId = pokerId;
    resData.userId = userId;
    resData.bet = bet[index];
    for (let i =0;i<cishu;i++){
        console.log("jiqiren kaishi yazhu")
        socketHandler.yaZhu(robotSocket,JSON.stringify(resData));
    }
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