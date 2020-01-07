/**
 * @author hyw
 * @date 2018/9/17 0017
 * @description: {描述一下文件的功能}
 */
var dateUtil = require('../utils/dateUtil');
var userMgr = require('./userMgr');
var gameMgr = require('./gameMgr');
var gameLogic = require('./gameLogic');
var commonUtil = require('../utils/commonUtil');
// var socketHandler = require('./socketHandler');
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
    exit(robotSocket,JSON.stringify(resData));
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

    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;
    //玩家退出

    //多少局退出
    var maxNumOfGame = commonUtil.randomFrom(10,40);
    var maxPlayTime = commonUtil.randomFrom(10,40);
    //玩家退出
    if(playTime>maxPlayTime*60*60||numOfGame>maxNumOfGame){
        exit(robotSocket,JSON.stringify(resData));
        //使用过的机器人重新放回机器人队列中
        robotMgr.addRobot(userId);
    }else{
        ready(robotSocket,JSON.stringify(resData));
    }
}

/**
 * 收到轮到自己的消息时做出相应的操作
 */
exports.opt = function(userId,data){
    if(!userId){
        return
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        return
    }
    let player = roomInfo.getPlayerById(userId)
    let socket = userMgr.get(userId);
    if(!socket){
        socket = userMgr.getT(userId);
    }
    let sjPoker = roomInfo.lastPokers.pokers;

    let data1 ={userId:userId,chupai:1}
    let res = tishi(socket,data1);
    console.log("tuoguan",userId,res)
    let tuoguanSocket = userMgr.getT(userId)
    if(roomInfo.lastPokers.userId == userId || !roomInfo.lastPokers.userId){
        res = gameLogic.getSuijiPai(player.pokers)
        console.log("suijipaiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",res);
    }
    let data2 = {userId:userId,pokers:res}
    // if(roomInfo.hongtao3IsEnd == false && !(roomInfo.findAnZhuang()) ){
    //     roomInfo.hongtao3IsEnd = true
    //     data2.pokers = [{num:3,color:2}]
    // }
    console.log("data222222222222222222222222222222222",data2)
    setTimeout(function(){
        if(res.length !=0 ||roomInfo.lastPokers.pokers.length==0){

            console.log("ttttttttttttttttttttttttttttttttttttttttuoggggggggggggggggggggggggggggg chupai")
            chupai(socket,data2);
        }else{
            console.log("ttttttttttttttttttttttttttttttttttttttttuoggggggggggggggggggggggggggggg buchu")
            buchu(socket,data2);
    }
    // userMgr.bindT(userId,tuoguanSocket);
    // userMgr.bindT("real"+userId,socket)

},3000)

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


async function exit(socket, data) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    
    var userId = data.userId;
    if(!userId){
        return;
    }
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        return;
    }

    var player = roomInfo.getPlayerById(userId);
    if (!player) {
        return
    }
    if(player.state !== player.PLAY_STATE.FREE ||player.state !== player.PLAY_STATE.FREE){
        socket.emit('exit_result', { state:player.state,res:"no" })
        return
    }
    //设置玩家离线
    player.setOnlineState(0);
    if (socket) {
        socket.emit('exit_result', { state: player.state,res:"yes" });
        console.log("exit",player)
        exports.disconnect(socket);
    }
    //如果玩家在开始准备阶段退出，判断是不是庄家，否则更换庄家
    if (player.state == player.PLAY_STATE.FREE || player.state == player.PLAY_STATE.READY) {
        //console.log('********exit玩家退出【'+player.userId+'】**********');
        //如果玩家已经准备了，则清除计时器
        if(player.state == player.PLAY_STATE.READY){
            player.clearTimer();
        }
        //当前房间内的玩家数量
        var currentPlayerCountInRoom = roomInfo.getPlayerCount();
        var currentPreparedPlayerCount = roomInfo.getPreparedPlayerCount();
        //console.log('******currentPlayerCountInRoom******:' + currentPlayerCountInRoom);
        //只剩下自己一个人，退出时直接解散房间
        if (currentPlayerCountInRoom <= 1) {
            //console.log('*******房间没人了直接解散*******');
            roomInfo.clearTimer();
            //玩家退出
            gameMgr.exitRoom(userId);
            //解散房间
            //如果是代开房间，则不解散房间
            if(roomInfo.isDaiKai==0){
                gameMgr.destroy(roomInfo.roomId);
            }
        }else{
            gameMgr.exitRoom(userId);
            if (player.isBanker) {
                //console.log('********exit更换庄家**********');

            var nextPlayer = roomInfo.changeBanker(player.seatIndex);
            if(nextPlayer){
                roomInfo.setBanker(nextPlayer.userId);
            }
            }
            //console.log('********玩家【'+userId+'】退出房间**********');
            //获取当前房间的庄家
            userMgr.broacastByRoomId('gb_player_exit', { userId: userId,seats:roomInfo.seats }, roomInfo.roomId);

            //游戏准备阶段，如果推出后所有玩家都已经准备了，则游戏开始
            if (roomInfo.gameState == roomInfo.GAME_STATE.READY) {
                checkCanBegin(roomInfo.roomId);
            }
        }
    }
}

async function ready(socket, data) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var roomInfo = gameMgr.getRoomByUserId(userId);
    //console.log('************玩家准备*********' + userId);
    if (!userId || !roomInfo) {
        socket.emit('system_error', { errcode: 500, errmsg: "参数错误" });
        return;
    }
    // //检查传过来的userId是否有误
    // let userid = await checkUserId(socket,userId);
    // console.log("userid",userid);
    // if(userid===1 || !userid ||userid!==userId){
    //     socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
    //     return;
    // }

    if (roomInfo.gameState != roomInfo.GAME_STATE.READY) {
        socket.emit('system_error', { errcode: 500, errmsg: "游戏已经开始,请等待下一局" });
        return;
    }

    var player = roomInfo.getPlayerById(userId);
    //取消等待计时器
    if (player.timer) {
        player.clearTimer();
    }

    //金币过低
    if(player.coins<roomInfo.diZhu*2){
        socket.emit('system_error', { errcode: 500, errmsg: "金币不足" });
        return;
    }

    // //判断金币是否足够
    // if(player.coins<50000){
    //     socket.emit('system_error', { errcode: 500, errmsg: "金币不足时，将会自动弃牌，请注意自身所持金币！" });
    //     //return;
    // }
    player.setState(player.PLAY_STATE.READY);
    socket.emit('ready_result', { errcode: 0, errmsg: "ok" });
    //通知房间内的其他玩家
    userMgr.broacastInRoom('gb_player_has_ready', { userId: userId,sex:player.sex }, userId);

    //当前房间的玩家
    let playerCount = roomInfo.getPlayerCount();
    //当前房间内已经准备的玩家
    let preparedPlayerCount = roomInfo.getPreparedPlayerCount();

    //先判断是否所有人都已经准备了
    if(preparedPlayerCount == roomInfo.seatCount){
        //如果倒计时还没结束，但玩家都准备了
        if(roomInfo.countdown!=0){
            roomInfo.clearTimer();
            roomInfo.countdown = 0;
        }
        console.log("游戏将要开始前房内玩家数"+playerCount)
        console.log("游戏将要开始前房内已准备的玩家数"+ preparedPlayerCount)
        //直接开始游戏
        exports.gameBegin(roomInfo.roomId);
    }
}

//提示
function tishi(socket,data){
    let userId = data.userId;
    let chupai = data.chupai;
    if(socket && !userId){
        socket.emit("tishi_result",{errcode:1,errmsg:"参数错误"});
        return;
    }
    let roomInfo = gameMgr.getRoomByUserId(userId);
    let lastPokers = roomInfo.lastPokers.pokers;
    console.log("lastPokers",lastPokers)
    let lastPokersType = gameLogic.getPokerType(lastPokers,userId);
    let player = roomInfo.getPlayerById(userId);
    console.log("roomInfo.currentTurn",roomInfo.currentTurn)
    let nextPlayer = roomInfo.getNextTurnPlayer(roomInfo.currentTurn);
    let res;
    if(nextPlayer.pokers.length==1 && roomInfo.lastPokers.pokers.length==1){
         res= gameLogic.getBiggerPokers(lastPokers,player.pokers,player.userId,1);
    }else{
        res = gameLogic.getBiggerPokers(lastPokers,player.pokers,player.userId);
    }
    
    function zhadan (mypokers){
        let myZhaDan= gameLogic.getZhadan(mypokers);
        console.log("myZhaDan",myZhaDan)
        if(myZhaDan.length ===0){
            let AAA = gameLogic.getAAA(mypokers)
            return AAA;
            
        }
        let lastRes = []
        bf:
        for(let i of myZhaDan){
            for(let j of mypokers){
                if(j.num===i){
                    lastRes.push(j);
                    if(lastRes.length ===4){
                        break bf;
                    }
                }
            }
        }
        return lastRes
    }
    if(res.length==0 && userId!== roomInfo.lastPokers.userId){

        res = zhadan(player.pokers);
    }
    let data2 = {};
    data2.userId = userId;
    data2.pokers = res;
    //如果不是玩家主动点击提示则不通知
    if(!chupai){
        console.log("chupai乐乐乐乐尔乐饿了",chupai)
        socket.emit("tishi_result",{data:data2});
    }
    
    return data2.pokers;
}
//不出
async function buchu(socket,data){
    let pokers = data.pokers;
    let userId = data.userId;
    let roomInfo = gameMgr.getRoomByUserId(userId)
    if(socket && !userId ){
        socket.emit("chupai_result",{errcode:1,errmsg:"参数错误"});
        return;
    }
    // userMgr.bind(userId,socket)
    let player = roomInfo.getPlayerById(userId)
    let nextPlayer = roomInfo.getNextTurnPlayer(roomInfo.currentTurn);
    console.log("nextPlaroomInfo.currentTurnyer",roomInfo.currentTurn)
    console.log("nextPlayer",nextPlayer)
    player.clearTimer();
    let nextSocket = userMgr.get(nextPlayer.userId);
    let tishi_result = tishi(nextSocket,{userId:nextPlayer.userId,chupai:1});
    console.log("nextSocketaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",nextSocket.userId) 
    console.log("tishi",tishi_result)
    if(tishi_result.length>0 || roomInfo.lastPokers.userId == nextPlayer.userId){
        nextSocket.emit("buchu",{buchu:0});
    }else{
        nextSocket.emit("buchu",{buchu:1});
    }
    
    userMgr.broacastByRoomId('gb_buchu',{userId:userId}, roomInfo.roomId);
    console.log("下一一一一一一一一一一一一一一一一一一一一一一一")
    checkGameState(userId,roomInfo.roomId,"tuoguanBUCHU");
}

async function chupai(socket,data){
    let pokers = data.pokers;
    let userId = data.userId;
    // console.log("userId",userId)
    // console.log("pokers",pokers)
    // console.log(!socket)
    if(socket &&(!userId || !pokers) ){
        socket.emit("chupai_result",{errcode:1,errmsg:"参数错误"});
        return;
    }
    let result = {};
    let roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        socket.emit("chupai_result",{errcode:1,errmsg:"房间信息有误"})
    }
    if(roomInfo.hongtao3IsEnd == false && !(roomInfo.findAnZhuang()) ){
        roomInfo.hongtao3IsEnd = true
        pokers = [{num:3,color:2}]
    }
    // console.log("roomInfo",roomInfo)
    let lastPokers = roomInfo.lastPokers.pokers;
    let ishongtao3 = false;
    console.log("roomInfo.lastPokers",roomInfo.lastPokers)

    // userMgr.bindT(userId,socket);

    let res = 1;
    //如果最新打出的牌的玩家和正在出牌的玩家不是同一个人则进行比牌操作
    if(userId !== roomInfo.lastPokers.userId){
        res = gameLogic.compare(pokers,lastPokers,userId,roomInfo.lastPokers.userId);
    }
    
    let type = gameLogic.getPokerType(pokers,userId);
    let player = roomInfo.getPlayerById(userId);
    player.setState(player.PLAY_STATE.WAITTING);
    player.clearTimer();
    console.log("chupai player.seatIndex",player.seatIndex)
    // roomInfo.setCurrentTurn(player.seatIndex)
    if(res!==1){
        result.pokerType = "nothing";
        socket.emit("chupai_result",{res:res});
        buchu(socket,{userId:userId})
        return;
    }else{
        if (!type){
            buchu(socket,{userId:userId})
            return;
        }

        if(type.type == "zhadan" || type.type == "AAA"){
            roomInfo.zhadanNum += 1;
        }
        let banker = roomInfo.getBanker();
        if(banker&&(roomInfo.lastPokers.userId == banker.userId)&&userId!=banker.userId){
            result.isend=1;
        }else{
            result.isend=0;
        }
        //更新最新打出的牌
        roomInfo.setLastPokers(userId,pokers);
        // if(type.type === "AAA"){
        //     roomInfo.setBeiShu(2);
        // }
    }
    result.pokerType=type.type;
    result.res = res;
    let mypokers = [].concat(player.pokers);
    let allpokers = [].concat(roomInfo.shengyuPokers);
    for(let i of pokers){
        commonUtil.removeOne(mypokers,i);
        console.log("length",mypokers.length,i)
        commonUtil.removeOne(allpokers,i);
    }
    player.updatePokers(mypokers)
    roomInfo.shengyuPokers = allpokers;
    result.chued = pokers;
    result.userId = userId;

    result.pokers = mypokers;
    result.beishu = roomInfo.beishu;
    let banker = roomInfo.getBanker();
    //把剩余的牌展示给庄家
    // userMgr.sendMsg(banker.userId,"shengyu_pokers",roomInfo.shengyuPokers);
    roomInfo.hongtao3IsEnd = true
    userMgr.broacastByRoomId('gb_compare_result',result, roomInfo.roomId);
    //根据当前玩家所出的牌判断下一家是不是屏蔽掉不出按钮
    player.setState(player.PLAY_STATE.WAITTING);
    console.log("player.seatIndex",player.seatIndex)
    let nextPlayer = roomInfo.getNextTurnPlayer(player.seatIndex);
    
    let nextSocket = userMgr.get(nextPlayer.userId);
    let tishi_result = tishi(nextSocket,{userId:nextPlayer.userId,chupai:1});
    console.log("nextSocketaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",nextSocket.userId)
    console.log("roomInfo.lastpokers",roomInfo.lastPokers)
    console.log("tishi",tishi_result)
    if(player.pokers.length>0 ){
        if(tishi_result.length>0 || roomInfo.lastPokers.userId == nextPlayer.userId){
            nextSocket.emit("buchu",{buchu:0});
        }else{
            nextSocket.emit("buchu",{buchu:1});
        }
    }

    
    //     for(let i of pokers){
    //     commonUtil.remove(player.pokers,i);
    //     commonUtil.remove(roomInfo.shengyuPokers,i);
    // }
    if(result.isend==1){
        roomInfo.setState(roomInfo.GAME_STATE.SETTLEMENT);
        roomInfo.isend=1;
        gameOver(roomInfo.roomId);
        return;
    }
    console.log("开始找一下个人了啊啊啊啊 啊啊啊啊啊啊啊啊啊啊啊啊啊啊  啊啊啊啊啊啊啊啊啊啊啊啊啊")
    checkGameState(userId,roomInfo.roomId,"tuoguanCHUPAI");
    
    
}
/**
 * 游戏结束，广播结算结果
 */

function gameOver(roomId) {
    console.log("y游戏结束了")
    var roomInfo = gameMgr.getRoomById(roomId);
    for(let i of roomInfo.seats){
        i.clearTimer();//清除定时器
        if(i.isTuoguan==1){
            userMgr.broacastByRoomId("gb_qxtuoguan",{userId:i.userId},roomId)
            userMgr.delT(i.userId)
        }
    }
    userMgr.broacastByRoomId()
    //计算输赢
    gameMgr.settlement(roomId);
    let winner = null;
    //广播结算结果
    var results = [];
    var gameOverRes = [];
    //console.log('******游戏结束******');
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];

        //更新玩家的游戏局数
        player.updateNumOfGame();

        if (player.state != player.PLAY_STATE.FREE) {

            player.updateParticipateNumOfGame();

            var res = {};
            res.userId = player.userId;
            res.name = player.name;
            res.headimg = player.headimg;
            res.isWin = player.isWin;
            
            // res.hold = player.hold;
            res.totalWin = player.totalWin;
            player.settlement(player.totalWin);
            res.coins = player.coins;
            res.state = player.state;
            res.allTalWin = player.allTalWin;
            res.optState = player.optState;
            res.numOfGame = roomInfo.numOfGame;
            results.push(res);
        }
        
        //如果玩家的金币不足
        if (player.coins < roomInfo.diZhu*2*5) {
            userMgr.sendMsg(player.userId, 'coin_not_enough', { errcode: 500, errmsg: '金币不足,请充值后再继续游戏' });
            //踢除玩家
            //console.log('********玩家金币不足了**********');
            //tichu(player.userId);
        }
    }

    //两秒后提示结算
    setTimeout(function () {
        console.log("开始结算了")
        //console.log('*****gb_settlement_result*******');
         //console.log(results);
        userMgr.broacastByRoomId('gb_settlement_result', results, roomId);
        //广播通知玩家开始准备
        //清除掉离线的玩家
        //gameMgr.clearRoom(roomId);
        setTimeout(function () {
            let seatLength = roomInfo.seats.length;
            let tempSeats = roomInfo.seats.concat();
            for (var i = 0; i < seatLength; i++) {
                var player = tempSeats[i];

                var socket = userMgr.getT(player.userId);
                if (player.watchTimes>=3||player.isOnline==0) {
                    (function(){
                        let dataRes = {};
                        dataRes.userId = player.userId;
                        exports.exit(socket,JSON.stringify(dataRes));
                    })()
                }
            }

            let data = {};
            data.numOfGame = roomInfo.numOfGame;
            data.countdown = roomInfo.READY_COUNTDOWN;
            userMgr.broacastByRoomId('gb_begin_ready',data,roomId);
            //更新游戏局数
            // roomInfo.updateNumOfGame();
            //设置房间的状态为准备状态
            //启动房间倒计时
            // startGameBeginCountDown(roomInfo.roomId);
            roomInfo.setState(roomInfo.GAME_STATE.READY);
            gameMgr.resetRoomData(roomInfo.roomId)
            //设置玩家准备的倒计时（判断玩家金币是否不足）
            for (var i = 0; i < roomInfo.seats.length; i++) {
                let player = roomInfo.seats[i];
                if (player.state != player.PLAY_STATE.READY) {
                    userMgr.sendMsg(player.userId, 'begin_ready', { numOfGame: roomInfo.numOfGame, countdown: roomInfo.READY_COUNTDOWN });
                    //设置等待倒计时
                    //var timer = tichu(player.userId);
                    //player.setTimer(timer, roomInfo.READY_COUNTDOWN);
                }
            }
        }, 3000)
    }, 2000)
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
                 grantProp(robotSocket,JSON.stringify(resData));
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
             quickChat(robotSocket,chatId);
        }
    }
}

/**
 * 检查游戏是否可以结束，不能则通知下个玩家操作
 */
function checkGameState(userId,roomId,flag) {
    var roomInfo = gameMgr.getRoomById(roomId);
    let player = roomInfo.getPlayerById(userId);
    //如果一个玩家已经打光了自己的牌那就游戏结束
    if (player.pokers.length === 0) {
        roomInfo.winUserId = userId;
        console.log("玩家牌打完了啊啊啊啊 啊啊啊      ")
        //广播开牌信息
        var kaiPaiData = [];
        for (let i = 0; i < roomInfo.seats.length; i++) {
            let player = roomInfo.seats[i];

            var data = {};
            data.userId = player.userId;
            data.hold = player.pokers;
            kaiPaiData.push(data);
        }
        userMgr.broacastByRoomId('gb_kaipai', kaiPaiData, roomId);
        //设置房间的状态为结算状态
        roomInfo.setState(roomInfo.GAME_STATE.SETTLEMENT);
        gameOver(roomId);
    } else {//通知下家操作
        roomInfo.setCurrentTurn(player.seatIndex)
        console.log("xiayigeren")
        player.setState(player.PLAY_STATE.WAITTING)
        var currentSeatIndex = roomInfo.currentTurn;
        var currentPlayer = roomInfo.getPlayerBySeatIndex(currentSeatIndex);
        var nextTurnPlayer = roomInfo.getNextTurnPlayer(currentSeatIndex);
        //console.log('***********通知下家操作***********:'+nextTurnPlayer.userId);
        //console.log('*****获取到下家玩家信息*****');
        //console.log(nextTurnPlayer);

        roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);
        //通知用户操作
        // userMgr.sendMsg(nextTurnPlayer.userId, 'your_turn', { minBet: nextPlayerMinBet,currentLunShu: roomInfo.currentLunShu, countdown: roomInfo.OPT_COUNTDOWN });
        nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
        //广播轮到操作的玩家信息
        let nextSocket = userMgr.getT(nextTurnPlayer.userId);
        if(nextTurnPlayer.isTuoguan==0){
            var timer = optTimeOut(nextTurnPlayer.userId);
            nextTurnPlayer.setTimer(timer, roomInfo.OPT_COUNTDOWN);
            nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
        }
        if(nextTurnPlayer.isTuoguan==1){
            let nextSocket = userMgr.getT(nextTurnPlayer.userId);
            console.log("nextTurnPlayer.userId",nextTurnPlayer.userId)
            // console.log("nextSocket",nextTurnPlayer.userId)
            nextSocket.emit("your_turn",{gameState:roomInfo.gameState})
        }

        userMgr.broacastInRoom('gb_turn', { userId: nextTurnPlayer.userId, countdown: roomInfo.OPT_COUNTDOWN,gameState:roomInfo.gameState,flag }, nextTurnPlayer.userId,true);
        console.log("gb_turnssssssssssssssssssssssssssssssss",2,nextTurnPlayer.userId)
    }
}

/**
 * 操作超时
 */
function optTimeOut(userId) {
    return function () {
        
        console.log('*********玩家【' + userId + '】操作超时*********');
        //发送操作超时事件
        userMgr.sendMsg(userId, 'opt_timeout', { userId: userId });
        //玩家直接弃牌
        var userSocket = userMgr.get(userId);
        
        var data = {};
        data.userId = userId;
        let tuoguanSocket = userMgr.getT(userId);
        tuoguanSocket.emit("your_turn",{gameState:roomInfo.gameState})
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
             exit(robotSocket,JSON.stringify(resData));
        },time);
    }
}


/**
 * 聊天
 * @param {*} socket
 * @param {*} data
 */
 function chat(socket, data) {
    var chatContent = data;
    userMgr.broacastInRoom('chat_push', { sender: socket.userId, content: chatContent }, socket.userId, true);
}
/**
 * 快速聊天
 * @param {*} socket
 * @param {*} data
 */
 async function quickChat(socket, data) {
    var userId = socket.userId;
    //检查传过来的userId是否有误
let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    if (socket.voice_countdown != null && socket.voice_countdown < 0) { //8秒才能广播一次信息
        userMgr.sendMsg(userId, 'quick_chat_msg', { msg: '您发送的频率太快.歇一会吧' });
        return;
    }
    socket.voice_countdown = -1;
    setTimeout(() => {
        socket.voice_countdown = 1;
    }, 5000)
    var chatId = data;
    userMgr.broacastInRoom('quick_chat_push', { sender: socket.userId, content: chatId }, socket.userId, true);

}
/**
 * 语音聊天
 * @param {*} socket
 * @param {*} data
 */
 async function voiceMsg(socket, data) {
    var userId = socket.userId;
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    if (socket.voice_countdown != null && socket.voice_countdown < 0) { //8秒才能广播一次信息
        userMgr.sendMsg(userId, 'quick_chat_msg', { msg: '您发送的频率太快.歇一会吧' });
        return;
    }
    socket.voice_countdown = -1;
    setTimeout(() => {
        socket.voice_countdown = 1;
    }, 5000)
    console.log(data.length);
    userMgr.broacastInRoom('voice_msg_push', { sender: socket.userId, content: data }, socket.userId, true);
}
/**
 * 表情
 * @param {*} socket
 * @param {*} data
 */
 function emoji(socket, data) {
    var phizId = data;
    userMgr.broacastInRoom('emoji_push', { sender: socket.userId, content: phizId }, socket.userId, true);
}
/**
 * 赠送道具,扣除金币
 * @param {*} socket
 * @param {*} data
 */
 async function grantProp(socket, data) {
    params = JSON.parse(data);
    if (!socket.userId&&socket || !params.receiver || !params.prop_id || !params.prop_name) {
        userMgr.sendMsg(socket.userId, "notice", '操作失败');
        return;
    }
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    //判断金币是否足够
    var roomInfo = gameMgr.getRoomByUserId(socket.userId);
    var player = roomInfo.getPlayerById(socket.userId);
    rechargeService.getShopInfoByShopId(params.prop_id, (err, res) => {
        if (err) {
            console.log(err);
            userMgr.sendMsg(socket.userId, "notice", '操作失败');
            return
        }
        if (!res) {
            userMgr.sendMsg(socket.userId, "notice", '操作不合法');
        }
        else {
            let ret = {
                sender: socket.userId,
                receiver: params.receiver,
                prop_price: res.price,
                prop_name: params.prop_name,
            };
            if (res.price == 0) {
                ret.coins = player.coins;
                userMgr.broacastInRoom("grant_prop_push", ret, socket.userId, true);
            }else{
                if(player.coins<res.price){
                    socket.emit('system_error',{errcode:500,errmsg:'金币不足，无法使用该道具'})
                }else{
                    let propPrice = res.price;
                    rechargeService.changeUserCoins(socket.userId, -res.price, (err, res) => {
                        if (err || !res) {
                            userMgr.sendMsg(socket.userId, "notice", '操作失败');
                            return
                        }
                        player.updateCoins(player.coins-propPrice);
                        ret.coins = player.coins;
                        userMgr.broacastInRoom("grant_prop_push", ret, socket.userId, true);
                    })
                }
            }
        }
    })
}