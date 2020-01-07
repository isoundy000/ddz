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
        return;
    }
    var player = roomInfo.getPlayerById(userId);
    if(!player){
        return;
    }
    var playTime = dateUtil.getCurrentTimestapm()-player.beginGameTime;
    var numOfGame = player.numOfGame;
    let seats = roomInfo.seats;
    let zr = 0;
    for(let i of seats){
        if(i.isRobot ===0){
            zr+=1;
        }
    }
    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;
    //玩家退出

    //多少局退出
    var maxNumOfGame = commonUtil.randomFrom(10,40);
    var maxPlayTime = commonUtil.randomFrom(10,40);
    //玩家退出
    if(playTime>maxPlayTime*60*60||numOfGame>maxNumOfGame || zr>=2){
        socketHandler.exit(robotSocket,JSON.stringify(resData));
        //使用过的机器人重新放回机器人队列中
        robotMgr.addRobot(userId);
    }else{
        socketHandler.ready(robotSocket,JSON.stringify(resData));
    }
}


/**
 * 收到轮到自己的消息时做出相应的操作
 */
exports.opt = function(userId,data){
    if(!userId){
        return
    }
    console.log("userId开始操作",userId)
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        return
    }
    var biMenLunShu = roomInfo.biMen;
    var biPaiLunShu = roomInfo.biPai;
    var currentLunShu = data.currentLunShu;

    var player = roomInfo.getPlayerById(userId);
    if(!player){
        return
    }

    if(player.state!=player.PLAY_STATE.WAITTING&&player.state!=player.PLAY_STATE.PLAYING){
        return
    }
    console.log("我进来了啊啊啊啊啊啊啊啊啊啊")
    var pokerType = gameLogic.getPokerType(player.hold);

    //可操作数组
    var optList = ['yazhu'];
    //是否可以看牌了
    if(biMenLunShu<=currentLunShu){
        //console.log('*****机器人可以看牌了*****');
        //且玩家还没看牌
        if(player.optState != player.OPT_STATE.KAN_PAI){
            optList.push('kanpai');
        }else{//看过牌后才能弃牌
            optList.push('qipai');
        }
    }
    //是否可以比牌了
    if(biPaiLunShu<=currentLunShu){
        optList.push('bipai');
    }


    //获取当前游戏中的玩家的数量
    var playingPlayerCount = roomInfo.getPlayingPlayerCount();
    //如果房间内只有两个人了，且牌型不是散牌，且轮数已接近最大轮数，则永不弃牌
    if(playingPlayerCount==2){
        //获取另一个玩家
        var otherPlayer = null;
        for (let i = 0; i < roomInfo.seats.length; i++) {
            let tempPlayer = roomInfo.seats[i];
            if (tempPlayer.state==tempPlayer.PLAY_STATE.WAITTING&&tempPlayer.userId!=userId) {
                otherPlayer = tempPlayer;
            }
        }
        if(!otherPlayer){
            return;
        }
        var otherPlayerPokerType = gameLogic.getPokerType(otherPlayer.hold);

        //如果另一方玩家是真是玩家，且我的牌型大
        if(otherPlayer.isRobot==0&&gameLogic.compare(player.hold,otherPlayer.hold)==1){
            //永不弃牌
            var index = optList.indexOf('qipai');
            if (index > -1) {
                optList.splice(index, 1);
            }
        }

        /**
         * 如果已经跟了好多轮了，不弃牌
         */
        if(currentLunShu>(roomInfo.fengDing*0.65)){
            var index = optList.indexOf('qipai');
            if (index > -1) {
                optList.splice(index, 1);
            }
        }





        /**
         * 如果接近封顶了，则不弃牌不比牌
         */
        if(currentLunShu>(roomInfo.fengDing*0.8)){
            var indexBiPai = optList.indexOf('bipai');
            if (indexBiPai > -1) {
                optList.splice(indexBiPai, 1);
            }

            //如果已经接近最大比牌轮数，且未看牌，则永不看牌
            var indexKanPai = optList.indexOf('kanpai');
            if (indexKanPai > -1) {
                optList.splice(indexKanPai, 1);
            }



            /*
            console.log('**************接近封顶了**************');
            console.log('**************otherPlayer.isRobot：'+otherPlayer.isRobot);
            console.log('**************gameLogic.compare(player.hold,otherPlayer.hold)：'+gameLogic.compare(player.hold,otherPlayer.hold));
            */

            //如果机器人的牌小，则有一定几率换牌
            if(otherPlayer.isRobot==0&&gameLogic.compare(player.hold,otherPlayer.hold)!=1){
                console.log('!!!!!!!!!!要换牌了!!!!!!!!!!!!');
                //有一定概率换牌
                var rndNum = commonUtil.randomFrom(0,100);
                if(rndNum<=90){
                    console.log('!!!!!!!!!!触发换牌操作!!!!!!!!!!!!');
                    player.hold = gameMgr.huanPai(roomInfo.roomId,otherPlayer.hold);
                }
            }
        }
    }

    /**
     * 如果之前跟人比过牌，则不放弃
     */
    if(player.compareList.length>0){
        var index = optList.indexOf('qipai');
        if (index > -1) {
            optList.splice(index, 1);
        }
    }

    //如果接近封顶了也不弃牌
    if(currentLunShu>(roomInfo.fengDing*0.7)){
        var index = optList.indexOf('qipai');
        if (index > -1) {
            optList.splice(index, 1);
        }

        //如果已经接近最大比牌轮数，且未看牌，则永不看牌
        var indexKanPai = optList.indexOf('kanpai');
        if (indexKanPai > -1) {
            optList.splice(indexKanPai, 1);
        }
    }

    //console.log('*****此时可操作项：******'+optList);
    var opt = getOptByRadio(optList,pokerType);
    //console.log('******获取到可操作项：*******'+opt);

    switch(opt)
    {
        case 'yazhu':
            jiaZhu(userId,data);
            break;
        case 'qipai':
            qiPai(userId);
            break;
        case 'bipai':
            biPai(userId,data);
            break;
        default:
            kanPai(userId,data);
    }
}

/**
 * 根据牌的类型获取操作项
 * 0:散牌，1:对子 2:顺子 3:金花 4:顺金 5:炸弹(三条)
 */
function getOptByRadio(canOptList,pokerType){
    var strategy = getStrategyByPokerType(pokerType);
    var opt = getResultByRadio(canOptList,strategy);
    return opt;
}

/**
 * 根据概率获取结果
 */
function getResultByRadio(canOptList,strategy){
    var sum = getRadioSum(strategy);
    var opt = null;
    for(var i in strategy){
        //获取 0-总数 之间的一个随随机整数
        var random = parseInt(Math.random()*sum);
        ////如果在当前的概率范围内,得到的就是当前概率
        if(random<strategy[i]){
            opt = i;
            break;
        }else {
            //否则减去当前的概率范围,进入下一轮循环
            sum-=strategy[i]
        }
    }

    if(canOptList.indexOf(opt)>-1){
        return opt;
    }else{
        return getResultByRadio(canOptList,strategy);
    }
}


/*
  获取权重的总和
 */
function getRadioSum(strategy){
    var sum=0;
    for(var i in strategy){
        sum+=strategy[i];
    }
    return sum;
}


/**
 * 根据扑克的类型获取不同的操作策略
 */
function getStrategyByPokerType(pokerType){
     var strategy = {};
     switch(pokerType){
         case 5:
             strategy = {'yazhu':95,'bipai':3,'qipai':0,'kanpai':10};
             break;
         case 4:
             strategy = {'yazhu':90,'bipai':3,'qipai':0,'kanpai':15};
             break;
         case 3:
             strategy = {'yazhu':85,'bipai':5,'qipai':2,'kanpai':20};
             break;
         case 2:
             strategy = {'yazhu':80,'bipai':5,'qipai':3,'kanpai':25};
             break;
         case 1:
             strategy = {'yazhu':65,'bipai':12,'qipai':8,'kanpai':20};
             break;
         default:
             strategy = {'yazhu':50,'bipai':10,'qipai':10,'kanpai':30};
     }
     return strategy;
}




/**
 * 跟注或加注
 */
function genZhuOrJiaZhu(userId,data){
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    var isKanPai = player.optState==player.OPT_STATE.KAN_PAI;
    var diZhu = roomInfo.diZhu;
    //机器人最低跟注
    var minBet = data.minBet;
    var beishu = [1,2,4,5];
    var minBetBeiShu = minBet/diZhu;
    if(isKanPai){
        minBetBeiShu = minBetBeiShu/2;
    }
    //console.log('*****minBetBeiShu:'+minBetBeiShu+'******  最高倍数:'+beishu[beishu.length-1]);

    //如果已经达到最高押注倍数，则只能跟注,否则随机跟注或加注
    if(minBetBeiShu==beishu[beishu.length-1]){
        //console.log('*****已达到最高倍数******');
        genZhu(userId,data);
    }else{
       var random = commonUtil.randomFrom(0,100);
       //有65%的概率跟注
       if(random>35){
           genZhu(userId,data);
       }else{
           jiaZhu(userId,data);
       }
    }
}


/**
 * 跟注操作
 */
function genZhu(userId,data){
    var robotSocket = userMgr.get(userId);
    var  reqData = data;
    var minBet = reqData.minBet;
    var resData = {};
    resData.userId = userId;
    resData.betCount = minBet;
    socketHandler.genZhu(robotSocket,JSON.stringify(resData));
}


/**
 * 加注操作
 */
function jiaZhu(userId,data){
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    //玩家是否看牌了

    var diZhu = roomInfo.diZhu;
    var minBet = data.minBet;
    var isKanPai = player.optState==player.OPT_STATE.KAN_PAI;
    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;

    var betCount = doJiaZhu(diZhu,minBet,isKanPai,roomInfo);
    console.log('*****获取机器人加注量*******:'+betCount);
    resData.betCount = betCount;
    socketHandler.jiaZhu(robotSocket,JSON.stringify(resData));
}

/**
 * 根据最低筹码，随机选择加注
 */
function doJiaZhu(diZhu,minBet,isKanPai,roomInfo){
    //押注倍数
    var beishu = roomInfo.bl;
    var minBetBeiShu = minBet/diZhu;
    if(isKanPai){
        minBetBeiShu = minBetBeiShu/2;
    }
console.log("minBetBeiShu///////////////",minBetBeiShu)
console.log("beishu///////////////",beishu)
    var canBetBeiShu = [];
    for(let i=0;i<beishu.length;i++){
        if(minBetBeiShu<beishu[i]){
            canBetBeiShu.push(beishu[i]);
        }
    }

    let jiaZhuBeiShu = beishu[beishu.length-1];
    if(canBetBeiShu.length>0){
        var random = commonUtil.randomFrom(0,canBetBeiShu.length-1);
        jiaZhuBeiShu = canBetBeiShu[random];
    }

    if(!jiaZhuBeiShu){
        jiaZhuBeiShu = beishu[beishu.length-1];
    }

    if(isKanPai){
        jiaZhuBeiShu = jiaZhuBeiShu*2;
    }
    return jiaZhuBeiShu*diZhu;
}


/**
 * 弃牌操作
 */
function qiPai(userId){
    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;
    socketHandler.qiPai(robotSocket,JSON.stringify(resData));
}


/**
 * 比牌操作
 */
function biPai(userId,data){
    var roomInfo = gameMgr.getRoomByUserId(userId);
    //获取可以比牌的玩家列表
    var  canBiPaiPlayers = [];
    for(let i=0;i<roomInfo.seats.length;i++){
        var player = roomInfo.seats[i];
        if(player.state==player.PLAY_STATE.WAITTING){
            if(userId!=player.userId){
                canBiPaiPlayers.push(player);
            }
        }
    }
    //如果可比牌的只剩一人，则直接比牌
    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;
    if(canBiPaiPlayers.length==1){
        resData.comparedUserId = canBiPaiPlayers[0].userId;
    }else{
        var random = commonUtil.randomFrom(0,canBiPaiPlayers.length-1);
        var comPlayer = canBiPaiPlayers[random];
        if(comPlayer){
            resData.comparedUserId = comPlayer.userId;
        }
    }
    socketHandler.biPai(robotSocket,JSON.stringify(resData));
}

/**
 * 看牌
 */
function kanPai(userId,data){
    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;
    socketHandler.kanPai(robotSocket,JSON.stringify(resData));

    let randomDelayTime = commonUtil.randomFrom(1000,3000);
    //看牌后，押注加倍
    data.minBet = data.minBet*2;
    setTimeout(function(){
        exports.opt(userId,data);
    },randomDelayTime)
}


/**
 * 发表情
 */
exports.grantProp = async function(userId,toUserId){
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        return;
    }
    var player = roomInfo.getPlayerById(userId);
    if(!player){
        return;
    }
    var robotSocket = userMgr.get(userId);
    let propList = await commonService.getTableListAsync(null,null,"id,name", "t_shop_info", { type: 'prop' });
    //随机发送次数
    let rdCount = commonUtil.randomFrom(0,1);
    for(let i=0;i<rdCount;i++){
        let time = commonUtil.randomFrom(1000,4000);
        (function(rdtime) {
            let rdIndex = commonUtil.randomFrom(0,propList.length-1);
            let randomProp = propList[rdIndex];

            //屏蔽鸡蛋表情
            if(randomProp.id==19||randomProp.name=='Egg'){
                return;
            }

            setTimeout(function() {
                var resData = {};
                resData.receiver = toUserId;
                resData.prop_id = randomProp.id;
                resData.prop_name = randomProp.name;
                socketHandler.grantProp(robotSocket,JSON.stringify(resData));
            }, rdtime);
        })(time)// i是参数 对应着a
    }
}


/**
 * 发快捷语音
 */
exports.sendQuickChat = function(userId){
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        return;
    }
    var player = roomInfo.getPlayerById(userId);
    if(!player){
        return;
    }
    if(player.state!=player.PLAY_STATE.FREE){
        var rd = commonUtil.randomFrom(0,100);
        //有百分之5的概率发快捷语音
        if(rd>90){
            var chatId = commonUtil.randomFrom(0,8);
            var robotSocket = userMgr.get(userId);
            socketHandler.quickChat(robotSocket,chatId);
        }
    }
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


