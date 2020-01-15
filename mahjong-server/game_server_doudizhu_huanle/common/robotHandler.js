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
// var socketHandler = require('./socketHandler');
var robotMgr = require('./robotMgr');

/**
 * 机器人金币不足时退出游戏
 */
exports.exit = function (userId) {
    if (!userId) {
        return;
    }
    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;
    exit(robotSocket, JSON.stringify(resData));
    //使用过的机器人重新放回机器人队列中
    robotMgr.addRobot(userId);
}


/**
 * 用户准备 判断机器人是否达到自动退出条件，满足的话自动离开房间（判断属性  游戏时长、局数）
 * @param userId
 */
exports.ready = function (userId) {
    if (!userId) {
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        return;
    }
    var player = roomInfo.getPlayerById(userId);
    if (!player) {
        return;
    }
    var playTime = dateUtil.getCurrentTimestapm() - player.beginGameTime;
    var numOfGame = player.numOfGame;

    var robotSocket = userMgr.get(userId);
    var resData = {};
    resData.userId = userId;
    //玩家退出

    //多少局退出
    var maxNumOfGame = commonUtil.randomFrom(10, 40);
    var maxPlayTime = commonUtil.randomFrom(10, 40);
    //玩家退出
    if (playTime > maxPlayTime * 60 * 60 || numOfGame > maxNumOfGame) {
        exit(robotSocket, JSON.stringify(resData));
        //使用过的机器人重新放回机器人队列中
        robotMgr.addRobot(userId);
    } else {
        ready(robotSocket, JSON.stringify(resData));
    }
}

/**
 * 收到轮到自己的消息时做出相应的操作
 */
exports.qiangdizhu = function (socket, data) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var fen = data.fen;
    if (!socket) {
        socket = userMgr.getT(userId)
    }
    if (!userId || fen == undefined || fen == null) {
        return socket.emit('system_error', { errcode: 500, errmsg: '参数错误', flag: "qiangdizhu" });
    }
    // dealUseridErr(socket,userId);
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    player.clearTimer();
    //延迟时间
    // var dealTimer = readyPlayerCount * 3 * 0.2 * 1000;
    player.updateFenshu(fen);
    player.setState(player.PLAY_STATE.QIANGDIZHU);
    roomInfo.setState(roomInfo.GAME_STATE.QIANGDIZHU)
    if (fen > roomInfo.minQiangFen) {
        roomInfo.minQiangFen = fen;
    }
    userMgr.broacastByRoomId("gb_qiangdizhu_result", { userId: userId, fen: fen }, roomInfo.roomId)
    if (fen == 3) {
        roomInfo.setBanker(userId);
        roomInfo.setBeiShu(3);
        //设置抢地主倍数
        roomInfo.qiangdizhu = 3;
        let banker = roomInfo.getBanker();
        banker.addPokers(roomInfo.dipai);
        console.log("banker.pokers", banker.pokers)
        let bankPokers = pokerSort(banker.pokers);
        // roomInfo.setState(roomInfo.GAME_STATE.PLAYING);
        console.log(123)

        // userMgr.broacastByRoomId('gb_dizhu',{userId:userId,bankPokers:bankPokers,mingpai:banker.mingpai}, roomInfo.roomId);
        roomInfo.setState(roomInfo.GAME_STATE.JIABEI)
        userMgr.broacastByRoomId('gb_dizhu', { userId: userId, bankPokers: bankPokers, gameState: roomInfo.gameState, countdown: roomInfo.JB_COUNTDOWN, mingpai: banker.mingpai }, roomInfo.roomId);
        console.log(1234)
        return;
    }

    if (roomInfo.isAllOpt(player.PLAY_STATE.QIANGDIZHU)) {
        if (roomInfo.minQiangFen == 0) {
            roomInfo.noQiang += 1;
            if (roomInfo.noQiang % 3 == 0) {
                let random = commonUtil.randomFrom(1, 3)
                let banker = roomInfo.seats[random]
                roomInfo.setBanker(banker.userId)
            } else {
                for (let i of roomInfo.seats) {
                    i.reset();
                }
                faPai(roomInfo);
                return;
            }

        } else {
            let userId = roomInfo.findDiZhu();

            roomInfo.setBanker(userId);

        }
        roomInfo.setBeiShu(fen);
        roomInfo.qiangdizhu = fen;
        let banker = roomInfo.getBanker();
        banker.addPokers(roomInfo.dipai);
        let bankPokers = pokerSort(banker.pokers);
        // roomInfo.setState(roomInfo.GAME_STATE.PLAYING);
        roomInfo.setState(roomInfo.GAME_STATE.JIABEI)
        userMgr.broacastByRoomId('gb_dizhu', { userId: banker.userId, bankPokers: bankPokers, gameState: roomInfo.gameState, countdown: roomInfo.JB_COUNTDOWN, mingpai: banker.mingpai }, roomInfo.roomId);
        console.log(1234)
        for (let i of roomInfo.seats) {
            i.setTimer(function () {
                let socket = userMgr.get(i.userId)
                exports.jiabei(socket, { userId: i.userId, beishu: 1 })
            }, roomInfo.JB_COUNTDOWN + 5000);
            if (i.isTuoguan == 1) {
                let tuoguanSocket = userMgr.getT(i.userId)
                tuoguanSocket.emit("your_turn", { gameState: roomInfo.gameState })
            }
        }
    } else {
        checkDiZhuState(userId, roomInfo.roomId);
    }
}


function pokerSort(pokers) {
    for (var i = 0; i < pokers.length - 1; i++) {//外层循环控制排序趟数
        for (var j = 0; j < pokers.length - 1 - i; j++) {//内层循环控制每一趟排序多少次
            if (parseInt(pokers[j].num) < parseInt(pokers[j + 1].num)) {
                var temp = pokers[j];
                pokers[j] = pokers[j + 1];
                pokers[j + 1] = temp;
            }
        }
    }
    return pokers;
}
//加倍超级几倍
exports.jiabei = function (socket, data) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var beishu = data.beishu;
    if (!socket) {
        socket = userMgr.getT(userId)
    }
    if (!userId || beishu == undefined || beishu == null) {
        socket.emit('system_error', { errcode: 500, errmsg: '参数错误', flag: "jiabei" });
    }
    // dealUseridErr(socket,userId);
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    player.beishu = beishu;
    player.clearTimer();
    let banker = roomInfo.getBanker();
    userMgr.broacastByRoomId("gb_jiabei", { beishu: beishu, userId: userId }, roomInfo.roomId);
    getBeishu(roomInfo.roomId)
    if (beishu == 0) {
        beishu = 1;
    }

    player.privateBeishu = beishu;
    if (player.isBanker == 0) {
        roomInfo.nongminBeishu = beishu + roomInfo.nongminBeishu
    }

    player.setState(player.OPT_STATE.JIABEI);
    let f = roomInfo.isAllOpt(player.OPT_STATE.JIABEI);
    console.log("一个人加倍了", f)
    if (f) {

        let banker = roomInfo.getBanker()
        roomInfo.setCurrentTurn(banker.seatIndex)
        roomInfo.setState(roomInfo.GAME_STATE.PLAYING)
        userMgr.broacastByRoomId("gb_turn", { gameState: roomInfo.GAME_STATE.CHUPAI, userId: banker.userId, countdown: roomInfo.OPT_COUNTDOWN }, roomInfo.roomId)
        roomInfo.nongminBeishu = roomInfo.nongminBeishu - 1;
        if (banker.isTuoguan == 0) {
            banker.setTimer(optTimeOut(banker.userId), roomInfo.OPT_COUNTDOWN)
        } else {
            let tuoguanSocket = userMgr.getT(banker.userId)
            tuoguanSocket.emit("your_turn", { gameState: "playing" });
        }
    }
}

//获得所有相关倍数
function getBeishu(roomId) {
    let roomInfo = gameMgr.getRoomById(roomId);
    let beishus = roomInfo.publicBeishu;
    console.log(beishus)
    let beishu = 1;
    for (let i in beishus) {
        if (beishus[i]) {
            beishu = beishus[i] * beishu
        }
    }
    let nBeishu = {}

    for (let i of roomInfo.seats) {
        nBeishu[i.userId] = i.privateBeishu;
    }
    let banker = roomInfo.getBanker();
    roomInfo.public = beishu;


    if (banker) {
        userMgr.broacastByRoomId("gb_beishu", {
            beishus: roomInfo.publicBeishu,
            public: roomInfo.public,
            privateBank: banker.privateBeishu,
            privateNongmin: roomInfo.nongminBeishu,
            nBeishu: nBeishu
        }, roomId)
    } else {
        userMgr.broacastByRoomId("gb_beishu", {
            beishus: roomInfo.publicBeishu,
            public: roomInfo.public,
            privateBank: 1,
            privateNongmin: roomInfo.nongminBeishu,
            nBeishu: nBeishu
        }, roomId)
    }

}
/**
 * 检查抢地主状态
 */
function checkDiZhuState(userId, roomId) {

    var roomInfo = gameMgr.getRoomById(roomId);
    let player = roomInfo.getPlayerById(userId);
    roomInfo.setCurrentTurn(player.seatIndex)
    var currentSeatIndex = roomInfo.currentTurn;
    var currentPlayer = roomInfo.getPlayerBySeatIndex(currentSeatIndex);
    var nextTurnPlayer = roomInfo.getNextTurnPlayer(roomInfo.currentTurn);
    //console.log('***********通知下家操作***********:'+nextTurnPlayer.userId);
    //console.log('*****获取到下家玩家信息*****');
    //console.log(nextTurnPlayer);


    // //通知用户操作
    // userMgr.sendMsg(nextTurnPlayer.userId, 'your_turn', { userId: nextTurnPlayer.userId, countdown: roomInfo.OPT_COUNTDOWN,gameState:roomInfo.gameState});
    //设置下家操作的倒计时
    //设置玩家操作倒计时
    var timer = qiangdizhuTimeOut(nextTurnPlayer.userId);
    nextTurnPlayer.setTimer(timer, roomInfo.OPT_COUNTDOWN, roomInfo.QDZ_COUNTDOWN + 5000);
    // nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
    if (nextTurnPlayer.isTuoguan == 1) {
        let nextSocket = userMgr.getT(nextTurnPlayer.userId);
        nextSocket.emit("your_turn", { gameState: roomInfo.gameState })
    }
    //广播轮到操作的玩家信息
    userMgr.broacastInRoom('gb_turn', { minQiangFen: roomInfo.minQiangFen, userId: nextTurnPlayer.userId, countdown: roomInfo.QDZ_COUNTDOWN, gameState: roomInfo.gameState }, nextTurnPlayer.userId, true);
    roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);
}

/***
 * 发牌
 */
function faPai(roomInfo) {
    // let roomInfo = gameMgr.getRoomById(roomId);

    let pokers = gameLogic.deal(roomInfo);
    console.log("pokers", pokers)
    let res = [];
    let result = {};
    let seats = roomInfo.seats;
    for (let i in seats) {
        let poker = {}
        poker.userId = seats[i].userId;
        poker.ismingpai = seats[i].mingpai;
        seats[i].setState(seats[i].PLAY_STATE.WAITTING);
        poker.pokers = pokers.pokers[i];
        seats[i].mopai(pokers.pokers[i]);
        res.push(poker)
        console.log("res", res)
    }
    result.pokers = res;
    result.dipai = pokers.dipai;
    roomInfo.dipai = pokers.dipai;
    result.qiangfen = roomInfo.qiangfen;
    userMgr.broacastByRoomId('gb_begin_fapai', result, roomInfo.roomId);

    // let randomNum = commonUtil.randomFrom(0,2);
    // roomInfo.setQiangfenNo1(roomInfo.seats[randomNum].userId);
    // var nextTurnPlayer = roomInfo.getNextTurnPlayer(banker.seatIndex);
    // roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);
    //（逆时针顺序）通知庄家的下家进行下注操作
    //根据玩家的数量计算发牌时间
    var dealTimer = 3 * 1000;
    setTimeout(function () {
        let randomNum = commonUtil.randomFrom(0, roomInfo.seats.length - 1);
        console.log("roomInfo.seats.length", roomInfo.seats.length)
        //通知用户操作
        let nextTurnPlayer = roomInfo.getPlayerById(roomInfo.seats[randomNum].userId);

        nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.QIANGDIZHU);
        roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);
        // //设置玩家操作倒计时
        var timer = qiangdizhuTimeOut(nextTurnPlayer.userId);
        nextTurnPlayer.setTimer(timer, roomInfo.QDZ_COUNTDOWN + 5000);
        if (nextTurnPlayer.isTuoguan == 1) {
            let tuoguanSocket = userMgr.getT(nextTurnPlayer.userId);
            tuoguanSocket.emit("your_turn", { gameState: roomInfo.gameState })
        }
        //广播轮到操作的玩家信息

        userMgr.broacastInRoom('gb_turn', { userId: nextTurnPlayer.userId, minQiangFen: roomInfo.minQiangFen, first: roomInfo.jiaofenNO1, countdown: roomInfo.QDZ_COUNTDOWN, gameState: roomInfo.gameState }, nextTurnPlayer.userId, true);
    }, dealTimer);
}

//抢地主超时
function qiangdizhuTimeOut(userId) {
    return function () {
        let socket = userMgr.get(userId);
        let data = { userId: userId, fen: 0 }
        exports.qiangdizhu(socket, data);
    }
}
/**
 * 收到轮到自己的消息时做出相应的操作
 */
exports.opt = function (userId, data) {
    console.log("开始托管出牌", userId)
    if (!userId) {
        return
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        return
    }
    let player = roomInfo.getPlayerById(userId);
    let socket = userMgr.get(userId);
    let sjPoker = roomInfo.lastPokers.pokers;
    if (!socket) {
        socket = userMgr.getT(userId);
    }
    let data1 = { userId: userId, chupai: 1 }
    let res = tishi(socket, data1);
    console.log("tuoguan", userId, res)
    let tuoguanSocket = userMgr.getT(userId)
    console.log("roomInfo.lastPokers.userId", roomInfo.lastPokers.userId)
    console.log("userId", userId)
    if (roomInfo.lastPokers.userId == userId || !roomInfo.lastPokers.userId) {
        res = gameLogic.getSuijiPai(player.pokers);
        console.log("suijipaiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", res);
    }
    let data2 = { userId: userId, pokers: res }
    console.log("data222222222222222222222222222222222", data2)
    setTimeout(function () {
        if (res.length != 0 || roomInfo.lastPokers.pokers.length == 0) {
            chupai(socket, data2);
        } else {
            buchu(socket, data2);
        }
        // userMgr.bindT(userId,tuoguanSocket);
        // userMgr.bindT("real"+userId,socket)

    }, 2000)

}

/**
 * 根据牌的类型获取操作项
 * 0:散牌，1:对子 2:顺子 3:金花 4:顺金 5:炸弹(三条)
 */
function getOptByRadio(canOptList, pokerType) {
    var strategy = getStrategyByPokerType(pokerType);
    var opt = getResultByRadio(canOptList, strategy);
    return opt;
}

/**
 * 根据概率获取结果
 */
function getResultByRadio(canOptList, strategy) {
    var sum = getRadioSum(strategy);
    var opt = null;
    for (var i in strategy) {
        //获取 0-总数 之间的一个随随机整数
        var random = parseInt(Math.random() * sum);
        ////如果在当前的概率范围内,得到的就是当前概率
        if (random < strategy[i]) {
            opt = i;
            break;
        } else {
            //否则减去当前的概率范围,进入下一轮循环
            sum -= strategy[i]
        }
    }

    if (canOptList.indexOf(opt) > -1) {
        return opt;
    } else {
        return getResultByRadio(canOptList, strategy);
    }
}


/*
  获取权重的总和
 */
function getRadioSum(strategy) {
    var sum = 0;
    for (var i in strategy) {
        sum += strategy[i];
    }
    return sum;
}


/**
 * 根据扑克的类型获取不同的操作策略
 */
function getStrategyByPokerType(pokerType) {
    var strategy = {};
    switch (pokerType) {
        case 5:
            strategy = { 'yazhu': 95, 'bipai': 3, 'qipai': 0, 'kanpai': 10 };
            break;
        case 4:
            strategy = { 'yazhu': 90, 'bipai': 3, 'qipai': 0, 'kanpai': 15 };
            break;
        case 3:
            strategy = { 'yazhu': 85, 'bipai': 5, 'qipai': 2, 'kanpai': 20 };
            break;
        case 2:
            strategy = { 'yazhu': 80, 'bipai': 5, 'qipai': 3, 'kanpai': 25 };
            break;
        case 1:
            strategy = { 'yazhu': 65, 'bipai': 12, 'qipai': 8, 'kanpai': 20 };
            break;
        default:
            strategy = { 'yazhu': 50, 'bipai': 10, 'qipai': 10, 'kanpai': 30 };
    }
    return strategy;
}


async function exit(socket, data) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }

    var userId = data.userId;
    if (!userId) {
        return;
    }
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket, userId);
    console.log("userid", userid);
    if (userid === 1 || !userid || userid !== userId) {
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
    if (player.state !== player.PLAY_STATE.FREE || player.state !== player.PLAY_STATE.FREE) {
        socket.emit('exit_result', { state: player.state, res: "no" })
        return
    }
    //设置玩家离线
    player.setOnlineState(0);
    if (socket) {
        socket.emit('exit_result', { state: player.state, res: "yes" });
        console.log("exit", player)
        exports.disconnect(socket);
    }
    //如果玩家在开始准备阶段退出，判断是不是庄家，否则更换庄家
    if (player.state == player.PLAY_STATE.FREE || player.state == player.PLAY_STATE.READY) {
        //console.log('********exit玩家退出【'+player.userId+'】**********');
        //如果玩家已经准备了，则清除计时器
        if (player.state == player.PLAY_STATE.READY) {
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
            if (roomInfo.isDaiKai == 0) {
                gameMgr.destroy(roomInfo.roomId);
            }
        } else {
            gameMgr.exitRoom(userId);
            if (player.isBanker) {
                //console.log('********exit更换庄家**********');

                var nextPlayer = roomInfo.changeBanker(player.seatIndex);
                if (nextPlayer) {
                    roomInfo.setBanker(nextPlayer.userId);
                }
            }
            //console.log('********玩家【'+userId+'】退出房间**********');
            //获取当前房间的庄家
            userMgr.broacastByRoomId('gb_player_exit', { userId: userId, seats: roomInfo.seats }, roomInfo.roomId);

            //游戏准备阶段，如果推出后所有玩家都已经准备了，则游戏开始
            if (roomInfo.gameState == roomInfo.GAME_STATE.READY) {
                checkCanBegin(roomInfo.roomId);
            }
        }
    }
}

async function ready(socket, data) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var roomInfo = gameMgr.getRoomByUserId(userId);
    //console.log('************玩家准备*********' + userId);
    if (!userId || !roomInfo) {
        socket.emit('system_error', { errcode: 500, errmsg: "参数错误", flag: "ready" });
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
    if (player.coins < roomInfo.diZhu * 2) {
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
    userMgr.broacastInRoom('gb_player_has_ready', { userId: userId, sex: player.sex }, userId);

    //当前房间的玩家
    let playerCount = roomInfo.getPlayerCount();
    //当前房间内已经准备的玩家
    let preparedPlayerCount = roomInfo.getPreparedPlayerCount();

    //先判断是否所有人都已经准备了
    if (preparedPlayerCount == roomInfo.seatCount) {
        //如果倒计时还没结束，但玩家都准备了
        if (roomInfo.countdown != 0) {
            roomInfo.clearTimer();
            roomInfo.countdown = 0;
        }
        console.log("游戏将要开始前房内玩家数" + playerCount)
        console.log("游戏将要开始前房内已准备的玩家数" + preparedPlayerCount)
        //直接开始游戏
        exports.gameBegin(roomInfo.roomId);
    }
}

//提示
function tishi(socket, data) {
    let userId = data.userId;
    let chupai = data.chupai;
    let flag = data.flag;
    if (socket && !userId) {
        socket.emit("tishi_result", { errcode: 1, errmsg: "参数错误", flag: "tishi" });
        return;
    }
    let roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        return [];
    }
    let lastPokers = roomInfo.lastPokers.pokers;
    console.log("lastPokers", lastPokers)
    let lastPokersType = gameLogic.getPokerType(lastPokers, userId);
    let player = roomInfo.getPlayerById(userId);
    let res = gameLogic.getBiggerPokers(lastPokers, player.pokers);

    function zhadan(mypokers) {
        let myZhaDan = gameLogic.getZhadan(mypokers);
        console.log("myZhaDan", myZhaDan)
        if (myZhaDan.length === 0) {
            let huojian = gameLogic.getHuojian(mypokers)
            return huojian;

        }
        let lastRes = []
        bf:
        for (let i of myZhaDan) {
            for (let j of mypokers) {
                if (j.num === i) {
                    lastRes.push(j);
                    if (lastRes.length === 4) {
                        break bf;
                    }
                }
            }
        }
        return lastRes
    }
    if (res.length == 0 && userId !== roomInfo.lastPokers.userId) {

        res = zhadan(player.pokers);
    }
    let data2 = {};
    data2.userId = userId;
    data2.pokers = res;
    //如果不是玩家主动点击提示则不通知
    if (!chupai) {
        console.log("chupai乐乐乐乐尔乐饿了", chupai)
        socket.emit("tishi_result", { data: data2 });
    }
    console.log("res_tishi", res)
    return res
}
//不出
async function buchu(socket, data) {
    let pokers = data.pokers;
    let userId = data.userId;
    let roomInfo = gameMgr.getRoomByUserId(userId)
    if (socket && !userId) {
        socket.emit("chupai_result", { errcode: 1, errmsg: "参数错误", flag: "buchu" });
        return;
    }
    // userMgr.bind(userId,socket)
    let player = roomInfo.getPlayerById(userId)
    let nextPlayer = roomInfo.getNextTurnPlayer(roomInfo.currentTurn);
    console.log("nextPlaroomInfo.currentTurnyer", roomInfo.currentTurn)
    console.log("nextPlayer", nextPlayer)
    player.clearTimer();
    let nextSocket = userMgr.get(nextPlayer.userId);
    let tishi_result = tishi(nextSocket, { userId: nextPlayer.userId, chupai: 1 });
    // console.log("nextSocketaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",nextSocket.userId) 
    console.log("tishi", tishi_result)
    let flag;
    if (tishi_result.length == 0) {
        flag = 0
    } else if (roomInfo.lastPokers.userId == nextPlayer.userId || tishi_result.length > 0) {
        flag = 1;
    }

    userMgr.broacastByRoomId('gb_buchu', { userId: userId, countdown: roomInfo.OPT_COUNTDOWN, gameState: roomInfo.gameState }, roomInfo.roomId);
    console.log("下一一一一一一一一一一一一一一一一一一一一一一一")
    checkGameState(userId, roomInfo.roomId, flag);
}

async function chupai(socket, data) {
    let pokers = data.pokers;
    let userId = data.userId;
    // console.log("userId",userId)
    // console.log("pokers",pokers)
    // console.log(!socket)
    if (socket && (!userId || !pokers)) {
        socket.emit("chupai_result", { errcode: 1, errmsg: "参数错误", flag: "chupai" });
        return;
    }
    let result = {};
    let roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        socket.emit("chupai_result", { errcode: 1, errmsg: "房间信息有误" })
    }
    // console.log("roomInfo",roomInfo)
    let lastPokers = roomInfo.lastPokers.pokers;
    console.log("roomInfo.lastPokers", roomInfo.lastPokers)

    // userMgr.bindT(userId,socket);

    let res = 1;
    //如果最新打出的牌的玩家和正在出牌的玩家不是同一个人则进行比牌操作
    console.log("userId != roomInfo.lastPokers.userId", userId != roomInfo.lastPokers.userId)
    console.log("userId ", userId)
    console.log("roomInfo.lastPokers.userId", roomInfo.lastPokers.userId)
    if (userId != roomInfo.lastPokers.userId) {
        res = gameLogic.compare(pokers, lastPokers, userId, roomInfo.lastPokers.userId);
    }
    let MypokeType = gameLogic.getPokerType(pokers)
    if (!MypokeType) {
        res = 2;
    }
    let type = gameLogic.getPokerType(pokers, userId);
    let player = roomInfo.getPlayerById(userId);
    player.setState(player.PLAY_STATE.WAITTING);
    player.clearTimer();
    if (type == "zhadan" || type == "huojian") {
        rroomInfo.zhadanNum += 1;
        roomInfo.setPublicBeishu("zhadan", roomInfo.zhadanNum * 2)
    }

    getBeishu(roomInfo.roomId);
    console.log("chupai player.seatIndex", player.seatIndex)
    roomInfo.setCurrentTurn(player.seatIndex)
    if (res !== 1) {
        result.pokerType = "nothing";
        buchu(socket, { userId: userId })
        return;
    } else {
        if (!type) {
            buchu(socket, { userId: userId })
            return;
        }
        //更新最新打出的牌
        roomInfo.setLastPokers(userId, pokers);
        if (type.type == "zhadan" || type.type == "huojian") {
            roomInfo.zhadanNum += 1;
            roomInfo.zdBeishu = roomInfo.zhadanNum * 2
        }
        // if(type.type === "AAA"){
        //     roomInfo.setBeiShu(2);
        // }
    }
    result.pokerType = type.type;
    result.res = res;
    let mypokers = [].concat(player.pokers);
    let allpokers = [].concat(roomInfo.shengyuPokers);
    for (let i of pokers) {
        commonUtil.removeOne(mypokers, i);
        console.log("length", mypokers.length, i)
        commonUtil.removeOne(allpokers, i);
    }
    player.updatePokers(mypokers)
    roomInfo.shengyuPokers = allpokers;
    result.chued = pokers;
    result.userId = userId;
    result.mingpai = player.mingpai;
    result.pokers = mypokers;
    result.beishu = roomInfo.beishu;
    let banker = roomInfo.getBanker();
    //把剩余的牌展示给庄家
    userMgr.sendMsg(banker.userId, "shengyu_pokers", roomInfo.shengyuPokers);

    userMgr.broacastByRoomId('gb_compare_result', result, roomInfo.roomId);
    //根据当前玩家所出的牌判断下一家是不是屏蔽掉不出按钮
    player.setState(player.PLAY_STATE.WAITTING);
    console.log("player.seatIndex", player.seatIndex)
    let nextPlayer = roomInfo.getNextTurnPlayer(player.seatIndex);

    let nextSocket = userMgr.get(nextPlayer.userId);
    let tishi_result = tishi(nextSocket, { userId: nextPlayer.userId, chupai: 1 });

    console.log("roomInfo.lastpokers", roomInfo.lastPokers)
    console.log("tishi", tishi_result)
    let flag;
    if (tishi_result.length == 0) {
        flag = 0
    } else if (roomInfo.lastPokers.userId == nextPlayer.userId) {
        flag = 1;
    }

    //     for(let i of pokers){
    //     commonUtil.remove(player.pokers,i);
    //     commonUtil.remove(roomInfo.shengyuPokers,i);
    // }

    console.log("开始找一下个人了啊啊啊啊 啊啊啊啊啊啊啊啊啊啊啊啊啊啊  啊啊啊啊啊啊啊啊啊啊啊啊啊")
    checkGameState(userId, roomInfo.roomId, flag);


}
/**
 * 游戏结束，广播结算结果
 */

function gameOver(roomId) {
    var roomInfo = gameMgr.getRoomById(roomId);
    console.log("gameover roomId", roomId)
    for (let i of roomInfo.seats) {
        i.clearTimer();//清除定时器
        if (i.isTuoguan == 1) {
            userMgr.broacastByRoomId("gb_qxtuoguan", { userId: i.userId }, roomId)
            i.isTuoguan = 0;
        }
    }

    //计算输赢
    gameMgr.settlement(roomId);
    gameMgr.settlementJifen(roomId)
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
            res.pokers = player.pokers;
            res.totalWin = player.totalWin;
            res.totalwinJifen = player.totalwinJifen;
            res.coins = player.coins;
            res.jifen = player.jifen;
            res.state = player.state;
            res.optState = player.optState;
            res.banker = roomInfo.getBanker().userId;
            results.push(res);
        }

        //如果玩家的金币不足
        if (player.coins < roomInfo.diZhu * 2 * 5) {
            userMgr.sendMsg(player.userId, 'coin_not_enough', { errcode: 500, errmsg: '金币不足,请充值后再继续游戏' });
            //踢除玩家
            //console.log('********玩家金币不足了**********');
            //tichu(player.userId);
        }
    }
    gameMgr.resetRoomData(roomId);
    //两秒后提示结算
    setTimeout(function () {
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

                var socket = userMgr.get(player.userId);
                if (!socket || player.isOnline == 0) {
                    //console.log('*******清理玩家【'+player.userId+'】********');
                    if (!socket) {
                        socket = userMgr.getT(player.userId)
                        socket.userId = player.userId;
                    }
                    (function (socket) {
                        let dataRes = {};
                        dataRes.userId = player.userId;
                        exports.exit(socket, JSON.stringify(dataRes));
                    })(socket)
                }
            }

            let data = {};
            data.numOfGame = roomInfo.numOfGame;
            data.countdown = roomInfo.READY_COUNTDOWN;
            userMgr.broacastByRoomId('gb_begin_ready', data, roomId);
            //更新游戏局数
            roomInfo.updateNumOfGame();
            //设置房间的状态为准备状态
            //启动房间倒计时
            roomInfo.setState(roomInfo.GAME_STATE.READY);
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
        }, 1000)
        if (roomInfo.clubId) {
            let matchUsers = gameMgr.getMatchUsers(roomInfo.clubId)
            matchUsers.sort(sortByfen)
            let length = matchUsers.length
            for (let i in matchUsers) {
                i = parseInt(i)
                let socket = userMgr.get(matchUsers[i].userId)
                socket.emit("rank_result", { rank: i + 1, usersNum: length })
            }
            setTimeout(function () {
                let result = match(roomInfo.clubId);
                if (result && result != "stop") {
                    for (let i of matchUsers) {
                        let socket = userMgr.get(i.userId)
                        if (!socket) {
                            socket = userMgr.getT(i.userId)
                        }
                    }
                    exports.ready(socket, { userId: i.userId })
                }
            }, 3000)
        }

    }, 2000)
}


/**
 * 
 * 自动匹配比赛场合适的玩家 
 */

function matchStart(matchId, roomId, nowdiFen, nowdiZhu, needStop) {
    let matchInfo = gameMgr.getMatchInfo(matchId)
    let matchUsers = matchInfo.users;
    matchUsers.sort(sortByfen)
    let rooms = matchInfo.rooms
    console.log("matchStart开始了")
    if (needStop == 0) {
        if (roomId) {
            gameMgr.destroy(roomId)
        }
        async function loop(randomUsers) {
            let roomId = await createRoom(matchId, matchInfo.type)
            console.log("roomId", roomId)
            async function getCoins(userId) {
                return new Promise((resolve, reject) => {
                    playerService.getUserDataByUserId(userId, function (err, result) {
                        if (err) {
                            console.log(err)
                            return;
                        }
                        if (result) {
                            resolve(result.coins)
                            coins = result.coins;
                        }
                    });
                })

            }

            if (randomUsers.length >= 3) {
                let users = randomUsers.splice(0, 3)
                console.log("users", users)
                for (let i of users) {
                    if (i.status == 0) {
                        let socket = userMgr.get(i.userId)
                        let data = {};
                        data.name = i.name,
                            data.userId = i.userId,
                            data.sex = 0,
                            data.type = matchInfo.type,
                            data.clubId = matchId,
                            data.nowdiFen = nowdiFen,
                            data.nowdiZhu = nowdiZhu,
                            data.headimg = i.headimg,
                            data.roomId = roomId,
                            data.coins = await getCoins(i.userId);
                        gameMgr.setMatchUsers(matchId, i.userId, "status", 1)
                        setTimeout(function () {
                            enterRoom(socket, data)
                        }, 500)

                    }

                }

            } else {
                for (let i of randomUsers) {
                    if (i.status == 0) {
                        let socket = userMgr.get(i.userId)
                        socket.emit("bisai_result", { errcode: 200, "errmsg": "正在匹配玩家" })
                    }

                }
            }
        }
        let randomUsers = gameMgr.getRandomUser(matchId);
        randomUsers.sort(sortByfen)
        loop(randomUsers)

    } else {
        return needStop
    }
}

async function match(matchId) {
    let matchInfo = gameMgr.getMatchInfo(matchId)
    console.log("matchInfo", matchInfo)
    let type = matchInfo.type
    console.log("type", type)
    console.log("type", matchInfo.type)
    let config = await myConfig.config[type]

    let jinjiConfig = config.jinji;
    let nowLevel = matchInfo.level;
    let nowJushu = matchInfo.jushu;
    let nowLimitFen = matchInfo.limitFen + nowJushu * 4
    let nowdiFen = matchInfo.nowdiFen + nowJushu * 2
    let nowdiZhu = matchInfo.nowdiZhu + nowJushu * 2
    let nowUsersLength = matchInfo.users.length
    let stop = 0
    if (nowUsersLength > jinjiConfig[0]) {
        nowLevel = 0
    }
    if (nowUsersLength <= jinjiConfig[0] && nowUsersLength > jinjiConfig[1]) {
        nowLevel = 1
    }
    if (nowUsersLength == 3) {
        nowLevel = 2
    }
    if (matchInfo.users.length <= jinjiConfig[2]) {
        nowLevel = 2
    }
    console.log("nowLevel", nowLevel)
    let matchUsers = matchInfo.users.sort(sortByfen)
    gameMgr.setMatchInfo(matchId, "level", nowLevel)
    if (nowLevel == 0) {
        if (matchInfo.users.length > jinjiConfig[nowLevel]) {
            // let matchUsers = matchInfo.users.sort(sortByfen)
            for (let i of matchUsers) {
                if (i.fen < nowLimitFen) {
                    let index = matchUsers.indexOf(i)
                    matchInfo.users.splice(index, 1)
                    let socket = userMgr.get(i.userId)

                    socket.emit("bisai_result", {
                        errcode: 200,
                        errmsg: "你当前排名第" + index + "名已被淘汰",
                        stop: 1
                    })
                }
            }
            matchStart(matchId, nowdiFen, nowdiZhu, 1)
        } else {
            gameMgr.setMatchInfo(matchId, "level", 1)
            nowLevel = 1
            gameMgr.setMatchInfo(matchId, "jushu", 0)
        }
    }

    if (nowLevel == 1) {
        console.log("开始复赛了")
        if (matchInfo.jushu < 2) {
            let jushu = matchInfo.jushu + 1
            gameMgr.setMatchInfo(matchId, "jushu", jushu)
            matchStart(matchId, nowdiFen, nowdiZhu, 0)
        } else {
            for (let i of matchUsers) {
                let index = matchUsers.indexOf(i)
                if (index > jinjiConfig[1]) {
                    matchInfo.users.splice(index, 1)
                    let socket = userMgr.get(i.userId)

                    socket.emit("bisai_result", {
                        errcode: 200,
                        errmsg: "你当前排名" + index + "名已被淘汰",
                        stop: 1
                    })
                }

            }
            nowLevel = 2
            gameMgr.setMatchInfo(matchId, "level", 2)
            gameMgr.setMatchInfo(matchId, "jushu", 0)
        }
    }
    if (nowLevel == 2) {
        console.log("进入决赛了")
        let jushu = matchInfo.users[0].jushu
        console.log("进入决赛了", jushu)
        if (jushu < 2) {
            console.log("进入决赛了2", jushu)
            let nowJushu = jushu += 1
            for (let i of matchInfo.users) {

                gameMgr.setMatchUsers(matchId, i.userId, "jushu", nowJushu)
            }
            if (jushu == 0) {
                matchStart(matchId, 0, nowdiFen, nowdiZhu, 1)
            } else {
                matchStart(matchId, 0, nowdiFen, nowdiZhu, 0)
            }

        } else {
            for (let i in matchUsers) {
                userMgr.sendMsg(matchUsers[i].userId, "bisai_result", {
                    errocde: 200,
                    errmsg: "比赛结束",
                    rank: i,
                    award: ""
                })
            }
            return stop
        }
    }

}
/**
 * 发表情
 */
exports.grantProp = async function (userId, toUserId) {
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        return;
    }
    var player = roomInfo.getPlayerById(userId);
    if (!player) {
        return;
    }
    var robotSocket = userMgr.get(userId);
    let propList = await commonService.getTableListAsync(null, null, "id,name", "t_shop_info", { type: 'prop' });
    //随机发送次数
    let rdCount = commonUtil.randomFrom(0, 1);
    for (let i = 0; i < rdCount; i++) {
        let time = commonUtil.randomFrom(1000, 4000);
        (function (rdtime) {
            let rdIndex = commonUtil.randomFrom(0, propList.length - 1);
            let randomProp = propList[rdIndex];

            //屏蔽鸡蛋表情
            if (randomProp.id == 19 || randomProp.name == 'Egg') {
                return;
            }

            setTimeout(function () {
                var resData = {};
                resData.receiver = toUserId;
                resData.prop_id = randomProp.id;
                resData.prop_name = randomProp.name;
                grantProp(robotSocket, JSON.stringify(resData));
            }, rdtime);
        })(time)// i是参数 对应着a
    }
}


/**
 * 发快捷语音
 */
exports.sendQuickChat = function (userId) {
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        return;
    }
    var player = roomInfo.getPlayerById(userId);
    if (!player) {
        return;
    }
    if (player.state != player.PLAY_STATE.FREE) {
        var rd = commonUtil.randomFrom(0, 100);
        //有百分之5的概率发快捷语音
        if (rd > 90) {
            var chatId = commonUtil.randomFrom(0, 8);
            var robotSocket = userMgr.get(userId);
            quickChat(robotSocket, chatId);
        }
    }
}

/**
 * 检查游戏是否可以结束，不能则通知下个玩家操作
 */
function checkGameState(userId, roomId, chupai_flag) {
    var roomInfo = gameMgr.getRoomById(roomId);
    let player = roomInfo.getPlayerById(userId);
    roomInfo.setCurrentTurn(player.seatIndex)
    //如果一个玩家已经打光了自己的牌那就游戏结束
    if (player.pokers.length === 0) {
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
        console.log("xiayigeren")
        player.setState(player.PLAY_STATE.WAITTING)
        var currentSeatIndex = roomInfo.currentTurn;
        var currentPlayer = roomInfo.getPlayerBySeatIndex(currentSeatIndex);
        var nextTurnPlayer = roomInfo.getNextTurnPlayer(currentSeatIndex);
        //console.log('***********通知下家操作***********:'+nextTurnPlayer.userId);
        //console.log('*****获取到下家玩家信息*****');
        //console.log(nextTurnPlayer);

        // roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);
        //通知用户操作
        // userMgr.sendMsg(nextTurnPlayer.userId, 'your_turn', { minBet: nextPlayerMinBet,currentLunShu: roomInfo.currentLunShu, countdown: roomInfo.OPT_COUNTDOWN });
        nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
        //广播轮到操作的玩家信息
        let nextSocket = userMgr.getT(nextTurnPlayer.userId);
        // userMgr.broacastInRoom('gb_turn', { userId: nextTurnPlayer.userId, countdown: roomInfo.OPT_COUNTDOWN,gameState:roomInfo.gameState}, nextTurnPlayer.userId,true);
        // console.log("gb_turnssssssssssssssssssssssssssssssss",2,nextTurnPlayer.userId)
        if (nextTurnPlayer.isTuoguan == 0) {
            var timer = optTimeOut(nextTurnPlayer.userId);
            nextTurnPlayer.setTimer(timer, roomInfo.OPT_COUNTDOWN);
            nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
        }
        if (nextTurnPlayer.isTuoguan == 1) {
            console.log("nextTurnPlayer.userId", nextTurnPlayer.userId)
            let nextSocket = userMgr.getT(nextTurnPlayer.userId);
            if (!nextSocket) {
                userMgr.bindT(nextTurnPlayer.userId)
                nextSocket = userMgr.getT(nextTurnPlayer.userId);
            }
            try {
                nextSocket.emit("your_turn", { gameState: roomInfo.gameState })
            } catch (error) {
                console.log(error)

            }
        }
        //广播轮到操作的玩家信息
        if (chupai_flag == 0) {
            userMgr.broacastInRoom('gb_turn', { userId: nextTurnPlayer.userId, countdown: roomInfo.OPT_COUNTDOWN, gameState: roomInfo.GAME_STATE.BUCHU, flag: "tuoguan" }, nextTurnPlayer.userId, true);
        } else if (chupai_flag == 1) {
            userMgr.broacastInRoom('gb_turn', { userId: nextTurnPlayer.userId, countdown: roomInfo.OPT_COUNTDOWN, gameState: roomInfo.GAME_STATE.CHUPAI, flag: "tuoguan" }, nextTurnPlayer.userId, true);
        } else {
            userMgr.broacastInRoom('gb_turn', { userId: nextTurnPlayer.userId, countdown: roomInfo.OPT_COUNTDOWN, gameState: roomInfo.gameState, flag: "tuoguan" }, nextTurnPlayer.userId, true);
        }
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
        var userSocket = userMgr.get(userId);
        let roomInfo = gameMgr.getRoomByUserId(userId);
        var data = { errcode: 0, errmsg: "ok", userId: userId };

        let tuoguanSocket = userMgr.getT(userId);
        let player = roomInfo.getPlayerById(userId)
        player.isTuoguan = 1;
        tuoguanSocket.emit("your_turn", { gameState: roomInfo.gameState })

        userMgr.broacastByRoomId("gb_tuoguan", data, roomInfo.roomId);
    }
}
/**
 * 检测是否只剩一个机器人
 */
exports.checkCanExit = function (userId) {
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        return;
    }
    let playerCount = roomInfo.getPlayerCount();
    if (playerCount == 1) {
        let time = commonUtil.randomFrom(5000, 10000);
        var robotSocket = userMgr.get(userId);
        var resData = {};
        resData.userId = userId;
        setTimeout(function () {
            exit(robotSocket, JSON.stringify(resData));
        }, time);
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
    let userid = await checkUserId(socket, userId);
    console.log("userid", userid);
    if (userid === 1 || !userid || userid !== userId) {
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
    let userid = await checkUserId(socket, userId);
    console.log("userid", userid);
    if (userid === 1 || !userid || userid !== userId) {
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
    if (socket || !socket.userId || !params.receiver || !params.prop_id || !params.prop_name) {
        userMgr.sendMsg(socket.userId, "notice", '操作失败');
        return;
    }
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket, userId);
    console.log("userid", userid);
    if (userid === 1 || !userid || userid !== userId) {
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
            } else {
                if (player.coins < res.price) {
                    socket.emit('system_error', { errcode: 500, errmsg: '金币不足，无法使用该道具' })
                } else {
                    let propPrice = res.price;
                    rechargeService.changeUserCoins(socket.userId, -res.price, (err, res) => {
                        if (err || !res) {
                            userMgr.sendMsg(socket.userId, "notice", '操作失败');
                            return
                        }
                        player.updateCoins(player.coins - propPrice);
                        ret.coins = player.coins;
                        userMgr.broacastInRoom("grant_prop_push", ret, socket.userId, true);
                    })
                }
            }
        }
    })
}