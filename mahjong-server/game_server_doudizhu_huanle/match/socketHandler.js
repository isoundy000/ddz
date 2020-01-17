/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: {描述一下文件的功能}
 */
var config = require('../../configs').game_server_zhajinhua;
var crypto = require('../../utils/crypto');
// var tokenMgr = require("../common/tokenmgr");
var userMgr = require('../common/userMgr');
var gameMgr = require('../common/gameMgr');
var rechargeService = require('../../common/service/rechargeService')
var gameLogic = require('../common/gameLogic');
var http = require('../../utils/http');
var IPUtil = require('../../utils/IPUtil');
var activityService = require('../../common/service/activityService');
var dateUtil = require('../../utils/dateUtil');
var commonUtil = require('../../utils/commonUtil');
var playerService = require("../../common/service/playerService")
var gameService = require('../../common/service/gameService')
var redis = require("../../utils/redis")
var gameLogic = require("../common/gameLogic")
var commonServer = require("../../common/service/commonService")
var myConfig = require("./config_match")
var RobotSocket = require("../common/entity/RobotSocket")
var club_server = require("../../common/service/clubService")
var commonService = require("../../common/service/commonService")
var agentService = require("../../common/service/agentService")
/**
 * 处理传来的userid错误
 * 
 */
async function dealUseridErr(socket, userId) {
    /**
     * 验证用户id
     */
    async function checkUserId(userId) {
        return new Promise((resolve, reject) => {
            playerService.getPlyaerInfoById(userId, function (err, result) {
                if (err) {
                    console.log(err)
                    resolve(1)
                    return;
                }
                if (result) {
                    resolve(result.userid);
                }
            })
        })

    }
    //检查传过来的userId是否有误
    let userid = await checkUserId(userId);
    console.log("userid", userid)
    if (userid === 1 || !userid || userid !== userId) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "传入的数据有误"
        });
        return;
    }
    if (socket.session) {
        redis.get("session" + userid, function (err, value) {
            if (err) {

                playerService.getUserSessionByUserId(userId, function (err, value) {
                    if (err) {
                        socket.emit('system_error', {
                            errcode: 500,
                            errmsg: "服务器异常"
                        });
                    }
                    if (socket.session !== value.session) {
                        socket.emit('_exit', {
                            errcode: 500,
                            errmsg: "登录异常"
                        });
                        return;
                    }
                })
            }
            if (socket.session !== value) {
                socket.emit('_exit', {
                    errcode: 500,
                    errmsg: "登录异常"
                });
                return;
            }
        })
    }
}
/**
 * 玩家加入房间
 * @param {*} socket
 * @param {*} data
 */
exports.login = async function (socket, data) {
    if (typeof data == "string") {
        data = JSON.parse(data);
    }

    var userId = data.userId
    var name = data.name;
    var sex = data.sex;
    var ctrl_param = data.ctrl_param;
    var sign = data.sign;
    let type = data.type;
    let clubId = data.clubId;
    let roomId = data.roomId
    // let type = data.type;
    var coins;
    let session = data.session;
    if (!userId) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "用户不存在"
        });
        return;
    }
    console.log("进入login了", userId)
    if (session && !socket.session) {
        socket.session = session
    }
    if (!clubId) {
        clubId = 0;
    }

    dealUseridErr(socket, userId)
    console.log("type", type)

    let room_config = await myConfig.config[type]
    // if (data.nowdiFen && data.nowdiZhu) {
    //     room_config.diZhu = nowdiZhu
    //     room_config.diFen = nowdiZhu
    //     socket.emit("fz_result", { difen: nowdiFen, dizhu: nowdiZhu })
    // }

    if (coins < room_config.minScoreLimit) {
        socket.emit("login_result", {
            errcode: 1,
            errmsg: "金币不足"
        });
        return;
    }
    // if (coins > room_config.maxScoreLimit && room_config.maxScoreLimit != -1) {
    //     socket.emit("login_result", {
    //         errcode: 1,
    //         errmsg: "请选择更高级的场次"
    //     });
    //     return;
    // }
    async function getCoins() {
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
    await getCoins();
    async function getRoomId() {
        return new Promise((resolve, reject) => {
            playerService.getUserDataByUserId(userId, function (err, result) {
                if (err) {
                    console.log(err)
                    return;
                }
                if (result) {
                    resolve(result.roomid)
                    roomId = result.roomid;
                }
            });
        })

    }
    //检查参数是否被篡改
    // var md5 = crypto.md5(roomId  + time + config.ROOM_PRI_KEY);
    // if (md5 != sign) {
    //     socket.emit('system_error', { errcode: 500, errmsg: "非法的请求" });
    //     return;
    // }


    //更新玩家所在房间信息
    gameService.updateRoomIdOfUserByUserId(userId, roomId, (err, result) => {
        if (err) {
            return;
        }
    });
    //返回房间信息
    var roomInfo = gameMgr.getRoomById(roomId);
    //获取玩家的坐位索引值
    var currentPlayer = roomInfo.getPlayerById(userId);
    if (!roomInfo) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "房间不存在"
        });
        return;
    }

    if (!currentPlayer) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "加入房间失败,请稍后重试"
        });
        return;
    }

    // console.log('********玩家:【'+currentPlayer.name+'】 进入了房间：'+roomId+'  当前金币：'+currentPlayer.coins);
    userMgr.bind(userId, socket);
    let tuoguanSocket = new RobotSocket(userId);
    if (!(userMgr.getT(userId))) {
        userMgr.bindT(userId, tuoguanSocket)
        socket.userId = userId;
    }


    var ip = "";
    //机器人，随机获取IP
    if (currentPlayer.isRobot == 1) {
        ip = IPUtil.getRandomIP();
    } else {
        ip = socket.handshake.address;
        if (socket.handshake.headers['x-forwarded-for'] != null) {
            ip = socket.handshake.headers['x-forwarded-for'];
        }
    }

    currentPlayer.setIP(ip);
    currentPlayer.setOnlineState(1);

    var userData = null;
    var seats = [];
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];
        var playerInfo = {};
        playerInfo.userid = player.userId;
        playerInfo.ip = player.ip;
        playerInfo.name = player.name;
        playerInfo.online = player.isOnline;
        playerInfo.state = player.state;
        playerInfo.seatIndex = player.seatIndex;
        playerInfo.coins = player.coins;
        playerInfo.isBanker = player.isBanker;
        playerInfo.headimg = player.headimg;
        seats.push(playerInfo);
        if (userId == player.userId) {
            userData = seats[i];
        }
    }

    //通知前端
    var ret = {
        errcode: 0,
        errmsg: "ok",
        data: {
            roomId: roomInfo.roomId,

            isPrivate: roomInfo.isPrivate,

            //已经进行的局数
            numOfGame: roomInfo.numOfGame,
            maxGames: roomInfo.maxGames,

            //最大容纳人数
            seatCount: roomInfo.seatCount,
            //游戏状态
            gameState: roomInfo.gameState,

            diZhu: roomInfo.diZhu,
            currentLunShu: roomInfo.currentLunShu,
            //当前操作人的ID
            currentTurn: roomInfo.currentTurn,
            readyDowncount: roomInfo.READY_COUNTDOWN,
            optDowncount: roomInfo.OPT_COUNTDOWN,
            seats: seats
        }
    };
    // ret.data.seats=newSeats;
    socket.emit('login_result', ret);

    var seats2 = {}
    seats2.pokers = [];
    for (var i = 0; i < roomInfo.seats.length; i++) {

        var player = roomInfo.seats[i];
        // if(playerInfo.userId ==userId){
        //     exports.tuoguan()
        // }
        var playerInfo = {};
        playerInfo.userId = player.userId;
        playerInfo.pokers = player.pokers;

        seats2.pokers.push(playerInfo);
        if (userId == player.userId) {
            userData = seats[i];
        }
    }
    seats2.currentSeatIndex = roomInfo.currentTurn;
    seats2.gameState = roomInfo.gameState;
    seats2.dipai = roomInfo.dipai




    console.log(ret)
    //console.log('********【'+currentPlayer.name+'】_join_room********');
    //console.log(JSON.stringify(ret));

    //通知其它客户端
    userMgr.broacastInRoom('player_join_room', {
        userDate: userData,
        seats: ret.data.seats
    }, userId, false);

    // socket.emit('system_error', { errcode: 500, errmsg: "金币不足时，将会自动弃牌，请注意自身所持金币！" });

    //检查用户是否可以准备
    if (roomInfo.gameState == roomInfo.GAME_STATE.READY && currentPlayer.state == currentPlayer.PLAY_STATE.FREE) {
        //如果不是房间创建者或者不是庄家
        // if ( currentPlayer.isBanker == 0) {
        socket.emit('begin_ready', {
            countdown: roomInfo.READY_COUNTDOWN
        });
        //console.log('*******设置玩家【'+userId+'】准备倒计时*******');
        //设置等待倒计时
        //var timer = tichu(userId);
        //currentPlayer.setTimer(timer, roomInfo.READY_COUNTDOWN);
        // }else{//庄家和创建者自动准备
        //     if(roomInfo.numOfGame==0){
        //         var data = {};
        //         data.userId = userId;
        //         var socket = userMgr.get(userId);
        //         exports.ready(socket,JSON.stringify(data));
        //     }else{
        //         socket.emit('begin_ready',{ countdown: roomInfo.READY_COUNTDOWN });
        //     }
        // }

    }
    getBeishu(roomId)
    exports.ready(socket, { userId: userId })
}


/**
 * 机器人加入房间
 * @param {*} socket
 * @param {*} data
 */
exports.robot_login = function (socket, data) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }
    if (socket.userId != null) {
        //已经登陆过的就忽略
        return;
    }
    var userId = data.userId
    // var name = data.name;
    // var sex = data.sex;
    var sign = data.sign;
    var time = data.time;
    var sign = data.sign;
    var roomId = data.roomId
    if (!userId) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "用户不存在"
        });
        return;
    }
    //检查参数合法性
    if (!roomId || !time) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "参数错误"
        });
        return;
    }
    //检查参数是否被篡改
    var md5 = crypto.md5(roomId + time + config.ROOM_PRI_KEY);
    if (md5 != sign) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "非法的请求"
        });
        return;
    }


    //返回房间信息
    var roomInfo = gameMgr.getRoomById(roomId);
    //获取玩家的坐位索引值
    var currentPlayer = roomInfo.getPlayerById(userId);
    if (!roomInfo) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "房间不存在"
        });
        return;
    }

    if (!currentPlayer) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "加入房间失败,请稍后重试"
        });
        return;
    }

    // console.log('********玩家:【'+currentPlayer.name+'】 进入了房间：'+roomId+'  当前金币：'+currentPlayer.coins);
    userMgr.bind(userId, socket);
    socket.userId = userId;

    var ip = "";
    //机器人，随机获取IP
    if (currentPlayer.isRobot == 1) {
        ip = IPUtil.getRandomIP();
    } else {
        ip = socket.handshake.address;
        if (socket.handshake.headers['x-forwarded-for'] != null) {
            ip = socket.handshake.headers['x-forwarded-for'];
        }
    }

    currentPlayer.setIP(ip);
    currentPlayer.setOnlineState(1);

    var userData = null;
    var seats = [];
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];
        var playerInfo = {};
        playerInfo.userid = player.userId;
        playerInfo.ip = player.ip;
        playerInfo.name = player.name;
        playerInfo.online = player.isOnline;
        playerInfo.state = player.state;
        playerInfo.seatIndex = player.seatIndex;
        playerInfo.coins = player.coins;
        playerInfo.isBanker = player.isBanker;
        //说明玩家正在游戏中，需要同步游戏状态
        if (player.state != player.PLAY_STATE.FREE) {
            playerInfo.optState = player.optState;
            playerInfo.timesOfGenZhu = player.timesOfGenZhu;
            //说明当前玩家正在操作
            if (player.optState == player.OPT_STATE.KAN_PAI) {
                //console.log('*****【'+player.userId+'】再次登录*****：'+roomInfo.minGenZhu*2);
                playerInfo.hold = player.hold;
                playerInfo.pokerType = gameLogic.getPokerType(player.hold);
                playerInfo.minGenZhu = roomInfo.minGenZhu * 2;
            } else {
                //console.log('*****【'+player.userId+'】*****：'+roomInfo.minGenZhu);
                playerInfo.minGenZhu = roomInfo.minGenZhu;
            }
            playerInfo.allBets = player.allBets;
            if (currentPlayer.userId == player.userId) {
                playerInfo.coins = player.coins - player.allBets;
                currentPlayer.updateCoins(playerInfo.coins);
            }
            //console.log('【'+player.name+'】金币量:'+player.coins);
        }
        seats.push(playerInfo);
        if (userId == player.userId) {
            userData = seats[i];
        }
    }

    //通知前端
    var ret = {
        errcode: 0,
        errmsg: "ok",
        data: {
            roomId: roomInfo.roomId,
            isPrivate: roomInfo.isPrivate,
            //已经进行的局数
            numOfGame: roomInfo.numOfGame,
            maxGames: roomInfo.maxGames,
            //最大容纳人数
            seatCount: roomInfo.seatCount,
            fengDingLunShu: roomInfo.fengDing,
            biMenLunShu: roomInfo.biMen,
            biPaiLunShu: roomInfo.biPai,
            //游戏状态
            gameState: roomInfo.gameState,
            diZhu: roomInfo.diZhu,
            currentLunShu: roomInfo.currentLunShu,
            totalBets: roomInfo.totalBets,
            //当前操作人的ID
            currentTurn: roomInfo.currentTurn,
            minGenZhu: roomInfo.minGenZhu,
            readyDowncount: roomInfo.READY_COUNTDOWN,
            optDowncount: roomInfo.OPT_COUNTDOWN,
            seats: seats
        }
    };



    socket.emit('login_result', ret);
    console.log(ret)
    //console.log('********【'+currentPlayer.name+'】_join_room********');
    //console.log(JSON.stringify(ret));

    //通知其它客户端
    userMgr.broacastInRoom('player_join_room', {
        userDate: userData,
        seats: ret.data.seats
    }, userId, false);

    // socket.emit('system_error', { errcode: 500, errmsg: "金币不足时，将会自动弃牌，请注意自身所持金币！" });

    //检查用户是否可以准备
    if (roomInfo.gameState == roomInfo.GAME_STATE.READY && currentPlayer.state == currentPlayer.PLAY_STATE.FREE) {
        //如果不是房间创建者或者不是庄家
        if (userId != roomInfo.createUser || currentPlayer.isBanker == 0) {
            socket.emit('begin_ready', {
                countdown: roomInfo.READY_COUNTDOWN
            });
            //console.log('*******设置玩家【'+userId+'】准备倒计时*******');
            //设置等待倒计时
            //var timer = tichu(userId);
            //currentPlayer.setTimer(timer, roomInfo.READY_COUNTDOWN);
        } else { //庄家和创建者自动准备
            if (roomInfo.numOfGame == 0) {
                var data = {};
                data.userId = userId;
                var socket = userMgr.get(userId);
                exports.ready(socket, JSON.stringify(data));
            } else {
                socket.emit('begin_ready', {
                    countdown: roomInfo.READY_COUNTDOWN
                });
            }
        }
    }
}

/**
 * 准备
 * @param {*} socket
 * @param {*} data
 */
exports.ready = function (socket, data) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var roomInfo = gameMgr.getRoomByUserId(userId);
    //console.log('************玩家准备*********' + userId);
    if (!userId || !roomInfo) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "参数错误",
            flag: "ready"
        });
        return;
    }
    dealUseridErr(socket, userId)

    if (roomInfo.gameState != roomInfo.GAME_STATE.READY) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "游戏已经开始,请等待下一局"
        });
        return;
    }

    var player = roomInfo.getPlayerById(userId);
    //取消等待计时器
    if (player.timer) {
        player.clearTimer();
    }
    if (player.coins < roomInfo.minScoreLimit) {
        socket.emit("login_result", {
            errcode: 1,
            errmsg: "金币不足"
        });
        return;
    }
    // if (player.coins > roomInfo.maxScoreLimit && roomInfo.maxScoreLimit != -1) {
    //     socket.emit("login_result", {
    //         errcode: 1,
    //         errmsg: "请选择更高级的场次"
    //     });
    //     return;
    // }
    //金币过低
    if (player.coins <= 0) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: "金币不足"
        });
        return;
    }

    // //判断金币是否足够
    // if(player.coins<50000){
    //     socket.emit('system_error', { errcode: 500, errmsg: "金币不足时，将会自动弃牌，请注意自身所持金币！" });
    //     //return;
    // }
    player.setState(player.PLAY_STATE.READY);
    socket.emit('ready_result', {
        errcode: 0,
        errmsg: "ok"
    });
    //通知房间内的其他玩家
    userMgr.broacastInRoom('gb_player_has_ready', {
        userId: userId,
        sex: player.sex
    }, userId);

    //当前房间的玩家
    let playerCount = roomInfo.getPlayerCount();
    //当前房间内已经准备的玩家
    let preparedPlayerCount = roomInfo.getPreparedPlayerCount();

    //先判断是否所有人都已经准备了
    if (roomInfo.seatCount == preparedPlayerCount) {
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
exports.mingpaiStart = function (socket, data) {
    let userId = data.userId;
    if (!userId) {
        return socket.emit("system_error", {
            errcode: 500,
            errmsg: "参数错误"
        })
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        return socket.emit("system_error", {
            errcode: 500,
            errmsg: "玩家不在游戏内"
        })
    }
    data.mingpai = 1;
    let player = roomInfo.getPlayerById(userId);
    player.mingpai = 1;
    player.mingpaiBeishu = 4
    exports.ready(socket, data)
}

/**
 * 启动游戏开始倒计时
 */
function startGameBeginCountDown(roomId) {
    var roomInfo = gameMgr.getRoomById(roomId);
    if (!roomInfo) {
        return;
    }
    roomInfo.countdown = roomInfo.READY_COUNTDOWN / 1000;
    var readyCountDown = setInterval(function () {
        roomInfo.countdown -= 1;
        //console.log('******此时房间的倒计时*******：'+roomInfo.countdown);
        if (roomInfo.countdown === 0) {
            clearInterval(readyCountDown);
            checkCanBegin(roomInfo.roomId);
        }
        //do whatever here..
    }, 1000);
    roomInfo.setTimer(readyCountDown);
}
/**
 * 托管
 */
exports.tuoguan = function (socket, data) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }

    var userId = data.userId;
    console.log(userId + "开始托管")
    if (!userId && socket) {
        return socket.emit("systen_error", {
            errcode: 500,
            errmsg: "参数错误"
        })
    }
    let roomInfo = gameMgr.getRoomByUserId(userId)
    console.log("tuoguanleaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", roomInfo.gameState)
    var tuoguanSocket = userMgr.getT(userId);
    let player = roomInfo.getPlayerById(userId);

    userMgr.broacastByRoomId("gb_tuoguan", {
        errcode: 0,
        errmsg: "ok",
        userId: userId
    }, roomInfo.roomId);
    userMgr.bindT(userId, tuoguanSocket);
    console.log("roomInfo.lastPokers.userId", roomInfo.lastPokers.userId);
    player.isTuoguan = 1;
    console.log("roomInfo.currentTurn", roomInfo.currentTurn)
    console.log("player.seatIndex", player.seatIndex)
    console.log("player.isTuoguan", player.isTuoguan)
    if (roomInfo.currentTurn == player.seatIndex && player.isTuoguan == 1) {

        if (tuoguanSocket.tuoguan_countdown != null && tuoguanSocket.tuoguan_countdown < 0) { //8秒才能广播一次信息

            return;
        }
        tuoguanSocket.tuoguan_countdown = -1;
        setTimeout(() => {
            tuoguanSocket.tuoguan_countdown = 1;
        }, 5000)
        console.log(2233)
        tuoguanSocket.emit("your_turn", {
            gameState: roomInfo.gameState
        });
    }
    if (!socket) {
        socket = userMgr.getT(userId)
    }
    socket.emit("tuoguan_result", {
        errcode: 0,
        errmsg: "ok"
    })


}

/**
 * qx托管
 */
exports.qxTuoguan = async function (socket, data) {
    console.log("quxiaotuoguanle")
    if (typeof data === "string") {
        data = JSON.parse(data);
    }
    var userId = data.userId;
    //检查传过来的userId是否有误
    // let userid = await checkUserId(socket,userId);
    // console.log("userid",userid);
    // if(userid===1 || !userid ||userid!==userId || userId!=socket.userId){
    //     socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
    //     return;
    // }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        console.log("qxTuoguan 获取roomInfo异常")
        return;
    }
    let player = roomInfo.getPlayerById(userId)
    player.clearTimer();
    player.isTuoguan = 0;
    userMgr.broacastByRoomId("gb_qxtuoguan", {
        errcode: 0,
        errmsg: "ok",
        userId: userId
    }, roomInfo.roomId)
    if (roomInfo.currentTurn == player.seatIndex) {
        let opt_timeout = optTimeOut(userId)
        player.setTimer(opt_timeout, roomInfo.OPT_COUNTDOWN)
    }

}


/**
 * 检测是否可以开始游戏
 * @param roomId
 */
function checkCanBegin(roomId) {
    //如果房间内玩家都已经准备，就可以开始游戏了
    let roomInfo = gameMgr.getRoomById(roomId);
    let readyPlayerCount = 0;
    for (let i = 0; i < roomInfo.seats.length; i++) {
        let player = roomInfo.seats[i];
        if (player.state == player.PLAY_STATE.READY) {
            readyPlayerCount++;
        }
    }

    //var currentPlayerCount = roomInfo.getPlayerCount();
    //console.log('**********是否都已经准备********' + allReady)
    //console.log('**********当前玩家内的人数********' + currentPlayerCount)

    //如果房间准备的人数大于1人，则开始游戏
    if (readyPlayerCount > 1 && roomInfo.gameState === roomInfo.GAME_STATE.FREE) {
        var roomId = roomInfo.roomId;
        //游戏开始
        exports.gameBegin(roomId);
    }
}

/**
 * 开始游戏
 */
exports.gameBegin = function (roomId) {
    var roomInfo = gameMgr.getRoomById(roomId);
    //console.log('****游戏开始，庄家是【'+banker.userId+'】*****');
    //广播通知游戏开始
    // userMgr.broacastByRoomId('system_error', { errcode: 500, errmsg: '开始游戏' },roomId);
    userMgr.broacastByRoomId('gb_game_begin', {
        errcode: 0,
        errmsg: "开始游戏"
    }, roomId);

    //扣除房间抽水
    roomInfo.choushui();
    //设置游戏的状态为开始状态
    roomInfo.setState(roomInfo.GAME_STATE.QIANGDIZHU);
    //更新游戏局数
    roomInfo.updateNumOfGame();
    var diZhu = roomInfo.diZhu;
    var readyPlayerCount = roomInfo.getPlayerCount();

    //延迟一秒后通知发牌
    setTimeout(function () {
        faPai(roomInfo);
    }, 500);
}

function pokerSort(pokers) {
    for (var i = 0; i < pokers.length - 1; i++) { //外层循环控制排序趟数
        for (var j = 0; j < pokers.length - 1 - i; j++) { //内层循环控制每一趟排序多少次
            if (parseInt(pokers[j].num) < parseInt(pokers[j + 1].num)) {
                var temp = pokers[j];
                pokers[j] = pokers[j + 1];
                pokers[j + 1] = temp;
            }
        }
    }
    return pokers;
}

//抢地主
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
        socket.emit('system_error', {
            errcode: 500,
            errmsg: '参数错误'
        });
    }
    dealUseridErr(socket, userId);
    let roomInfo = gameMgr.getRoomByUserId(userId);
    let player = roomInfo.getPlayerById(userId);
    player.clearTimer();
    //延迟时间
    // var dealTimer = readyPlayerCount * 3 * 0.2 * 1000;
    player.updateFenshu(fen);
    player.setState(player.PLAY_STATE.QIANGDIZHU);
    roomInfo.setState(roomInfo.GAME_STATE.QIANGDIZHU)
    if (fen > roomInfo.minQiangFen) {
        roomInfo.minQiangFen = fen;
    }
    userMgr.broacastByRoomId("gb_qiangdizhu_result", {
        userId: userId,
        fen: fen
    }, roomInfo.roomId)
    if (fen == 3) {
        roomInfo.setBanker(userId);
        roomInfo.setBeiShu(3);
        //设置抢地主倍数
        roomInfo.qiangdizhu = 3;
        roomInfo.setPublicBeishu("qiangdizhu", fen)
        let banker = roomInfo.getBanker();
        banker.addPokers(roomInfo.dipai);
        console.log("banker.pokers", banker.pokers)
        let bankPokers = pokerSort(banker.pokers);
        // roomInfo.setState(roomInfo.GAME_STATE.PLAYING);
        console.log(123)

        // userMgr.broacastByRoomId('gb_dizhu',{userId:userId,bankPokers:bankPokers,mingpai:banker.mingpai}, roomInfo.roomId);
        roomInfo.setState(roomInfo.GAME_STATE.JIABEI)
        userMgr.broacastByRoomId('gb_dizhu', {
            userId: userId,
            bankPokers: bankPokers,
            gameState: roomInfo.gameState,
            countdown: roomInfo.JB_COUNTDOWN,
            mingpai: banker.mingpai
        }, roomInfo.roomId);
        console.log(1234)
        for (let i of roomInfo.seats) {
            i.setTimer(function () {
                let socket = userMgr.get(i.userId)
                exports.jiabei(socket, {
                    userId: i.userId,
                    beishu: 1
                })
            }, roomInfo.JB_COUNTDOWN + 5000)
        }
        return;
    }

    if (roomInfo.isAllOpt(player.PLAY_STATE.QIANGDIZHU)) {
        if (roomInfo.minQiangFen == 0) {
            roomInfo.noQiang += 1;
            if (roomInfo.noQiang % 3 == 0) {
                roomInfo.noQiang = 0
                let random = commonUtil.randomFrom(1, 3)
                let banker = roomInfo.seats[random]
                if (!banker) {
                    banker = player
                }
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
        userMgr.broacastByRoomId('gb_dizhu', {
            userId: banker.userId,
            bankPokers: bankPokers,
            gameState: roomInfo.gameState,
            countdown: roomInfo.JB_COUNTDOWN,
            mingpai: banker.mingpai
        }, roomInfo.roomId);
        console.log(1234)
        for (let i of roomInfo.seats) {
            i.setTimer(function () {
                let socket = userMgr.get(i.userId)
                exports.jiabei(socket, {
                    userId: i.userId,
                    beishu: 0
                })
            }, roomInfo.JB_COUNTDOWN + 5000)
            if (i.isTuoguan == 1) {
                let tuoguanSocket = userMgr.getT(i.userId)
                tuoguanSocket.emit("your_turn", {
                    gameState: roomInfo.gameState
                })
            }
        }
    } else {
        checkDiZhuState(userId, roomInfo.roomId);
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

//加倍超级几倍
exports.jiabei = function (socket, data) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var beishu = data.beishu;
    if (!userId || beishu == undefined || beishu == null) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: '参数错误'
        });
    }
    dealUseridErr(socket, userId);
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    player.privateBeishu = beishu;
    player.clearTimer();
    let banker = roomInfo.getBanker();
    userMgr.broacastByRoomId("gb_jiabei", {
        beishu: beishu,
        userId: userId
    }, roomInfo.roomId);
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
        userMgr.broacastByRoomId("gb_turn", {
            gameState: roomInfo.GAME_STATE.CHUPAI,
            userId: banker.userId,
            countdown: roomInfo.OPT_COUNTDOWN
        }, roomInfo.roomId)
        roomInfo.nongminBeishu = roomInfo.nongminBeishu - 1;
        if (banker.isTuoguan == 0) {
            banker.setTimer(optTimeOut(banker.userId), roomInfo.OPT_COUNTDOWN)
        } else {
            let tuoguanSocket = userMgr.getT(banker.userId)
            tuoguanSocket.emit("your_turn", {
                gameState: roomInfo.gameState
            });
        }
    }
}
//广播明牌
exports.mingpai = function (socket, data) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var beishu = data.beishu;
    if (!userId || !beishu) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: '参数错误'
        });
    }
    dealUseridErr(socket, userId);
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    player.beishu = beishu;
    //设置明牌倍数
    if (!roomInfo.mingpai) {
        roomInfo.mingpai = beishu
    } else {
        roomInfo.mingpai = roomInfo.mingpai * beishu
    }
    userMgr.broacastByRoomId("gb_mingpai", {
        userId: userId
    });
    getBeishu(roomInfo.roomId);
}

//出牌
exports.chupai = function (socket, data) {
    let pokers = data.pokers;
    let userId = data.userId;
    if (socket && (!userId || !pokers)) {
        socket.emit("chupai_result", {
            errcode: 1,
            errmsg: "参数错误"
        });
        return;
    }
    console.log("pokers123", pokers)
    let result = {};
    let roomInfo = gameMgr.getRoomByUserId(userId);
    let lastPokers = roomInfo.lastPokers.pokers;
    let res = 1;
    //如果最新打出的牌的玩家和正在出牌的玩家不是同一个人则进行比牌操作
    if (userId !== roomInfo.lastPokers.userId) {
        res = gameLogic.compare(pokers, lastPokers);
    }
    let MypokeType = gameLogic.getPokerType(pokers)
    if (!MypokeType) {
        res = 2;
    }
    let type = gameLogic.getPokerType(pokers);
    let player = roomInfo.getPlayerById(userId);
    if (res != 1) {
        result.pokerType = "nothing";
        socket.emit("chupai_result", {
            res: res
        });
        return;
    } else {
        //更新最新打出的牌
        roomInfo.setLastPokers(userId, pokers);
        if (type.type == "zhadan" || type.type == "huojian") {
            roomInfo.zhadanNum += 1;
            roomInfo.setPublicBeishu("zhadan", roomInfo.zhadanNum * 2)
        }
        // if (type.type === "huojian") {
        //     roomInfo.setBeiShu(2);
        // }
    }
    console.log("type.type;", type.type)
    result.pokerType = type.type;
    result.res = res;
    for (let i of pokers) {
        commonUtil.removeOne(player.pokers, i);
        commonUtil.removeOne(roomInfo.shengyuPokers, i);
    }
    let allpokers = [].concat(roomInfo.shengyuPokers);
    roomInfo.shengyuPokers = allpokers;
    result.chued = pokers;
    result.userId = userId;
    result.pokers = player.pokers;
    result.beishu = roomInfo.beishu;
    result.mingpai = player.mingpai;
    let banker = roomInfo.getBanker();
    //把剩余的牌展示给庄家
    userMgr.sendMsg(banker.userId, "shengyu_pokers", roomInfo.shengyuPokers);
    socket.emit("chupai_result", result);
    userMgr.broacastByRoomId('gb_compare_result', result, roomInfo.roomId);
    player.clearTimer();


    getBeishu(roomInfo.roomId);
    let nextPlayer = roomInfo.getNextTurnPlayer(player.seatIndex);
    let nextSocket = userMgr.get(nextPlayer.userId);
    let tishi = exports.tishi(nextSocket, {
        userId: nextPlayer.userId,
        chupai: 1
    });
    if (!nextSocket) {
        nextSocket = userMgr.getT(nextPlayer.userId)
    }
    console.log("nextSocketaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", nextSocket.userId)
    console.log("roomInfo.lastpokers", roomInfo.lastPokers)
    console.log("tishi", tishi)
    if (tishi.length == 0) { //如果自己没有打的住牌则显示要不起
        var chupai_flag = 0;
    }
    if (roomInfo.lastPokers.userId == nextPlayer.userId) { //如果自己第一个出牌或者自己出的牌没有人压得上则必须出牌
        var chupai_flag = 1;
    }
    if (player.pokers.length === 0) {
        roomInfo.winer = userId;
        userMgr.broacastByRoomId('gb_game_over', {
            userId: userId
        }, roomInfo.roomId);
        gameOver(roomInfo.roomId);

        return;
    }
    checkGameState(userId, roomInfo.roomId, chupai_flag);


}


//提示
exports.tishi = function (socket, data) {
    console.log("tishi123", data);
    let userId = data.userId;
    if (socket && !userId) {
        socket.emit("tishi_result", {
            errcode: 1,
            errmsg: "参数错误"
        });
        return;
    }
    let roomInfo = gameMgr.getRoomByUserId(userId);
    let lastPokers = roomInfo.lastPokers;
    let lastPokersType = gameLogic.getPokerType(lastPokers.pokers);
    let player = roomInfo.getPlayerById(userId);
    let res = gameLogic.getBiggerPokers(lastPokers.pokers, player.pokers);

    function zhadan(mypokers) {
        let myZhaDan = gameLogic.getZhadan(mypokers);
        console.log("myZhaDan", myZhaDan)
        if (myZhaDan.length === 0) {
            let AAA = gameLogic.getHuojian(mypokers)
            return AAA;

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
        return lastRes;
    }
    if (res.length == 0 && lastPokersType.type != "huojian") {

        res = zhadan(player.pokers);
    }
    let data2 = {};
    data2.userId = userId;
    data2.pokers = res;
    chupai = data.chupai
    console.log("chupai", chupai)
    //如果不是玩家主动点击提示则不通知
    if (!chupai) {
        console.log("chupai乐乐乐乐尔乐饿了", chupai)
        socket.emit("tishi_result", {
            data: data2
        });
    }

    return data2.pokers;

}
//不出
exports.buchu = function (socket, data) {
    let pokers = data.pokers;
    let userId = data.userId;
    if (socket && !userId) {
        socket.emit("chupai_result", {
            errcode: 1,
            errmsg: "参数错误"
        });
        return;
    }


    let roomInfo = gameMgr.getRoomByUserId(userId);
    let nextPlayer = roomInfo.getNextTurnPlayer(roomInfo.currentTurn);
    let nextSocket = userMgr.get(nextPlayer.userId);
    let tishi = exports.tishi(nextSocket, {
        userId: nextPlayer.userId,
        chupai: 1
    });
    console.log("nextSocketaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", nextSocket.userId)
    console.log("tishi", tishi)

    userMgr.broacastByRoomId('gb_buchu', {
        userId: userId,
        countdown: roomInfo.OPT_COUNTDOWN,
        gameState: roomInfo.gameState
    }, roomInfo.roomId);
    if (tishi.length == 0) { //如果自己没有打的住牌则显示要不起
        var chupai_flag = 0;
    }
    if (roomInfo.lastPokers.userId == nextPlayer.userId) { //如果自己第一个出牌或者自己出的牌没有人压得上则必须出牌
        var chupai_flag = 1;
    }
    let player = roomInfo.getPlayerById(userId)
    player.clearTimer();
    checkGameState(userId, roomInfo.roomId, chupai_flag);
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

        //广播轮到操作的玩家信息

        userMgr.broacastInRoom('gb_turn', {
            userId: nextTurnPlayer.userId,
            minQiangFen: roomInfo.minQiangFen,
            first: roomInfo.jiaofenNO1,
            countdown: roomInfo.QDZ_COUNTDOWN,
            gameState: roomInfo.gameState
        }, nextTurnPlayer.userId, true);
    }, dealTimer);
}

function qiangdizhuTimeOut(userId) {
    return function () {
        let socket = userMgr.get(userId);
        let data = {
            userId: userId,
            fen: 0
        }
        exports.qiangdizhu(socket, data);
    }
}

/**
 * 看牌
 * @param {*} socket
 * @param {*} data
 */
exports.kanPai = function (socket, data) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }
    var userId = data.userId;
    if (!userId) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: '参数错误'
        });
    }
    dealUseridErr(socket, userId)
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);


    if (player.state != player.PLAY_STATE.PLAYING) {
        socket.emit('system_error', {
            errcode: 500,
            errmsg: '操作已超时'
        });
        return;
    }

    //获取玩家的手牌
    player.kanPai();
    var hold = player.hold;
    var pokerType = gameLogic.getPokerType(hold);
    let allBets = player.allBets;
    var minBet = player.optState == player.OPT_STATE.KAN_PAI ? roomInfo.minGenZhu * 2 : roomInfo.minGenZhu;
    socket.emit('kanpai_result', {
        hold: hold,
        minBet: minBet,
        pokerType: pokerType
    });
    //广播给其他玩家
    userMgr.broacastInRoom('gb_player_kanpai', {
        userId: userId,
        sex: player.sex
    }, userId, false);
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
        nextSocket.emit("your_turn", {
            gameState: roomInfo.gameState
        })
    }
    //广播轮到操作的玩家信息
    userMgr.broacastInRoom('gb_turn', {
        minQiangFen: roomInfo.minQiangFen,
        userId: nextTurnPlayer.userId,
        countdown: roomInfo.QDZ_COUNTDOWN,
        gameState: roomInfo.gameState
    }, nextTurnPlayer.userId, true);
    roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);
}
/**
 * 检查游戏是否可以结束，不能则通知下个玩家操作
 */
function checkGameState(userId, roomId, chupai_flag) {

    var roomInfo = gameMgr.getRoomById(roomId);
    let player = roomInfo.getPlayerById(userId);

    //如果一个玩家已经打光了自己的牌那就游戏结束
    if (player.pokers.length === 0) {

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
    } else { //通知下家操作
        roomInfo.setCurrentTurn(player.seatIndex)
        var currentSeatIndex = roomInfo.currentTurn;
        var currentPlayer = roomInfo.getPlayerBySeatIndex(currentSeatIndex);
        var nextTurnPlayer = roomInfo.getNextTurnPlayer(currentSeatIndex);
        //console.log('***********通知下家操作***********:'+nextTurnPlayer.userId);
        //console.log('*****获取到下家玩家信息*****');
        //console.log(nextTurnPlayer);

        roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);
        // //通知用户操作
        // userMgr.sendMsg(nextTurnPlayer.userId, 'your_turn', { userId: nextTurnPlayer.userId, countdown: roomInfo.OPT_COUNTDOWN,gameState:roomInfo.gameState});
        nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
        //设置下家操作的倒计时
        //设置玩家操作倒计时
        // var timer = optTimeOut(nextTurnPlayer.userId);
        // nextTurnPlayer.setTimer(timer, roomInfo.OPT_COUNTDOWN);
        nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
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
                nextSocket.emit("your_turn", {
                    gameState: roomInfo.gameState
                })
            } catch (error) {
                console.log(error)

            }
        }
        //广播轮到操作的玩家信息
        if (chupai_flag == 0) {
            userMgr.broacastInRoom('gb_turn', {
                userId: nextTurnPlayer.userId,
                countdown: roomInfo.OPT_COUNTDOWN,
                gameState: roomInfo.GAME_STATE.BUCHU
            }, nextTurnPlayer.userId, true);
        } else if (chupai_flag == 1) {
            userMgr.broacastInRoom('gb_turn', {
                userId: nextTurnPlayer.userId,
                countdown: roomInfo.OPT_COUNTDOWN,
                gameState: roomInfo.GAME_STATE.CHUPAI
            }, nextTurnPlayer.userId, true);
        } else {
            userMgr.broacastInRoom('gb_turn', {
                userId: nextTurnPlayer.userId,
                countdown: roomInfo.OPT_COUNTDOWN,
                gameState: roomInfo.gameState
            }, nextTurnPlayer.userId, true);
        }


    }
}
/**
 * 游戏结束，广播结算结果
 */

function gameOver(roomId) {
    var roomInfo = gameMgr.getRoomById(roomId);
    for (let i of roomInfo.seats) {
        i.clearTimer(); //清除定时器
        if (i.isTuoguan == 1) {
            userMgr.broacastByRoomId("gb_qxtuoguan", {
                userId: i.userId
            }, roomId)
            i.isTuoguan = 0;
        }
    }
    //计算输赢
    gameMgr.settlementJifen(roomId);
    let winner = null;
    //广播结算结果
    var results = [];
    var gameOverRes = [];
    console.log('******游戏结束******');
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];

        //更新玩家的游戏局数
        player.updateNumOfGame();
        console.log("player.state", player.state)

        player.updateParticipateNumOfGame();

        var res = {};
        res.userId = player.userId;
        res.name = player.name;
        res.headimg = player.headimg;
        res.isWin = player.isWin;
        res.pokers = player.pokers;
        res.totalWin = player.totalWin;
        res.totalWinJifen = player.totalWinJifen;
        res.coins = player.coins;
        res.jifen = player.jifen;
        res.state = player.state;

        res.optState = player.optState;
        res.banker = roomInfo.getBanker().userId;
        results.push(res);
        console.log("reslaladamaxiya", res)


        //如果玩家的金币不足
        if (player.coins < roomInfo.diZhu * 2 * 5) {
            userMgr.sendMsg(player.userId, 'coin_not_enough', {
                errcode: 500,
                errmsg: '金币不足,请充值后再继续游戏'
            });
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
                    // (function (socket) {
                    //     let dataRes = {};
                    //     dataRes.userId = player.userId;
                    //     exports.exit(socket, JSON.stringify(dataRes));
                    // })(socket)
                }

            }

            let data = {};
            data.numOfGame = roomInfo.numOfGame;
            data.countdown = roomInfo.READY_COUNTDOWN;
            // userMgr.broacastByRoomId('gb_begin_ready', data, roomId);
            //更新游戏局数
            roomInfo.updateNumOfGame();
            //设置房间的状态为准备状态
            //启动房间倒计时
            startGameBeginCountDown(roomInfo.roomId);
            roomInfo.setState(roomInfo.GAME_STATE.READY);
            //设置玩家准备的倒计时（判断玩家金币是否不足）
            for (var i = 0; i < roomInfo.seats.length; i++) {
                let player = roomInfo.seats[i];
                if (player.state != player.PLAY_STATE.READY) {
                    userMgr.sendMsg(player.userId, 'begin_ready', {
                        numOfGame: roomInfo.numOfGame,
                        countdown: roomInfo.READY_COUNTDOWN
                    });
                    //设置等待倒计时
                    //var timer = tichu(player.userId);
                    //player.setTimer(timer, roomInfo.READY_COUNTDOWN);
                }
            }
        }, 1000)
        let matchUsers = gameMgr.getMatchUsers(roomInfo.clubId)
        matchUsers.sort(sortByfen)
        let length = matchUsers.length
        for (let i in matchUsers) {
            i = parseInt(i)
            let socket = userMgr.get(matchUsers[i].userId)
            socket.emit("rank_result2", { rank: i + 1, usersNum: length })
        }
        setTimeout(async function () {
            let result = await match(roomInfo.clubId);
            console.log("result", result)
            if (result && result != "stop") {
                for (let i of matchUsers) {
                    let socket = userMgr.get(i.userId)
                    if (!socket) {
                        socket = userMgr.getT(i.userId)
                    }
                    exports.ready(socket, { userId: i.userId })
                }

            }
        }, 3000)


    }, 2000)
}



/**
 * 检测是否能抽奖，可以的话，发放抽奖通知
 */
async function checkLuckDraw(roomId) {
    var roomInfo = gameMgr.getRoomById(roomId);
    //大于1000底注的公开固定房才有机会参与抽奖
    //if(roomInfo.diZhu>=5000&&roomInfo.isPrivate==0&&roomInfo.isDaiKai==1){
    if (roomInfo.diZhu >= 5000 && roomInfo.isPrivate == 0) {
        for (var i = 0; i < roomInfo.seats.length; i++) {
            let player = roomInfo.seats[i];
            if (player.hasParticipateNumOfGame > 20) {
                let todayStr = dateUtil.getToday();
                let todayBeginTime = dateUtil.getBeginTimestamp(todayStr);
                let currentTime = dateUtil.getCurrentTimestamp();

                //按照一定概率判断是否赠送抽奖次数
                let queryParams = {};
                queryParams.playerId = player.userId;
                queryParams.type = 0;

                queryParams.beginDate = todayBeginTime;
                queryParams.endDate = currentTime;

                let hasGetLuckDrawTimes = await activityService.getAwardedLuckDrawTimesAsync(queryParams);
                //每天最多获取三次抽奖
                if (hasGetLuckDrawTimes < 3) {
                    //一定概率发放抽奖
                    let randomNum = commonUtil.randomFrom(0, 100);
                    //10%的概率发放
                    if (randomNum < 30) {
                        var rewardEntity = {};
                        rewardEntity.player_id = player.userId;
                        rewardEntity.status = 0;
                        rewardEntity.remark = '炸金花房间[' + roomId + ']游戏超20局随机奖励';
                        rewardEntity.type = 0;
                        rewardEntity.record_time = new Date().getTime() / 1000;
                        activityService.grantLuckDrawAsync(rewardEntity);
                        //给客户端发送赠送奖励消息
                        userMgr.sendMsg(player.userId, 'get_once_luck_draw', {
                            type: 0
                        });
                        //清零统计次数
                        player.resetParticipateNumOfGame();
                    }
                }
            }
        }
    }
}




/**
 * 踢掉玩家
 */
function tichu(userId) {
    return function () {
        //console.log('********踢除了玩家【'+userId+'】********');
        userMgr.sendMsg(userId, 'tichu', {
            userId: userId
        });
        var userSocket = userMgr.get(userId);
        var data = {};
        data.userId = userId;
        exports.exit(userSocket, JSON.stringify(data));
    }
}

/**
 * 操作超时
 */
function optTimeOut(userId) {
    return function () {

        console.log('*********玩家【' + userId + '】操作超时*********');
        //发送操作超时事件
        userMgr.sendMsg(userId, 'opt_timeout', {
            userId: userId
        });
        //玩家直接弃牌
        var userSocket = userMgr.get(userId);

        var data = {};
        data.userId = userId;
        exports.tuoguan(userSocket, JSON.stringify(data));
    }
}

async function generateClubId() {
    var clubId = "";
    for (var i = 0; i < 7; ++i) {
        clubId += Math.floor(Math.random() * 10);
    }
    try {
        let roomInfo = await commonService.getTableValuesAsync('*', 't_club', {
            club_id: clubId,
        })
        // console.log("clubId",clubId,clubId.length)
        if (roomInfo != null || clubId.length < 7 || clubId[0] == 0) {
            return await generateClubId();
        } else {
            return clubId;
        }
    } catch (error) {
        console.log(error);
        return 0;
    }

}
var async = require("async")
//报名参加比赛
exports.baoming = async function (socket, data) {
    let userId = data.userId;
    let type = data.type;
    let name = data.name
    let headimg = data.headimg
    console.log("报名", userId, type, name)
    if (!userId || !type || !name || !headimg) {
        socket.emit("system_error", {
            errcode: 500,
            errmsg: "参数错误"
        })
        return;
    }
    let config = await myConfig.config[type]

    console.log("type111111", myConfig.config[type])
    let usersNum = config.usersNum
    let fen = config.chushifenshu
    // console.log("config.chushifenshu", config.chushifenshu)
    let difen = config.diFen
    let dizhu = config.diZhu
    let matchId = gameMgr.getOneMatch(type)
    console.log("matchId", matchId)
    if (matchId) {
        async.auto({
            updatePlayerClub: function (callback) {
                playerService.updatePlayerClub(userId, matchId, callback)
            },
            updateClubUsers: ["updatePlayerClub", function (result, callback) {
                club_server.agreeJoinClub2(matchId, userId, name, 0, function (err, data) {
                    if (err || !data) {
                        socket.emit("system_error", {
                            errcode: 500,
                            errmsg: "服务器出错，请稍后再试"
                        })
                        return
                    }
                    if (data == 1) {
                        callback(null, data)
                    }
                })
            }]
        }, function (err, result) {
            console.log("result.updateClubUsers", result.updateClubUsers)
            if (err && !result.updateClubUsers) {
                console.log(err)
                return socket.emit("system_error", {
                    errcode: 500,
                    errmsg: "服务器异常"
                })
            }
            // gameMgr.addMatch(matchId, usersNum, type)
            gameMgr.joinMatch(matchId, userId, fen, name, headimg)
            userMgr.bind(userId, socket)

            let nowUsersNum = gameMgr.getUsersNum(matchId)
            if (nowUsersNum == usersNum) {
                userMgr.broacastByMatchId("match_usersNum", {
                    usersNum: nowUsersNum,
                    start: 1,
                    matchId: matchId,
                    allUsersNum: usersNum
                }, matchId)
                console.log("比赛开始了", matchId)
                match(matchId)
                return
            }
            userMgr.broacastByMatchId("match_usersNum", {
                usersNum: nowUsersNum,
                start: 0,
                matchId: matchId,
                allUsersNum: usersNum
            }, matchId)

        })
    } else {
        matchId = await generateClubId()
        console.log("matchId2", matchId)
        async.auto({
            createClub2: function (callback) {
                club_server.createClub2(matchId, type, usersNum, function (err, result) {
                    if (err || !result) {
                        return callback(err, null)
                    }
                    callback(null, result)

                })

            },
            updatePlayerClub: function (callback) {
                playerService.updatePlayerClub(userId, matchId, callback)
            },
            updateClubUsers: ["createClub2", "updatePlayerClub", function (result, callback) {
                club_server.agreeJoinClub2(matchId, userId, name, 0, function (err, data) {
                    if (err || !data) {
                        return callback(err, null);
                    }
                    callback(null, data)
                })
            }]
        }, function (err, result) {
            console.log(123)
            console.log("result.updateClubUsers" + result.updateClubUsers)
            if (err || result.updateClubUsers != 1) {
                console.log(err)
                return socket.emit("system_error", {
                    errcode: 500,
                    errmsg: "服务器异常"
                })
            }
            console.log("type2", type)
            gameMgr.addMatch(matchId, usersNum, type, difen, dizhu)
            gameMgr.joinMatch(matchId, userId, fen, name, headimg)
            userMgr.bind(userId, socket)

            let nowUsersNum = gameMgr.getUsersNum(matchId)
            if (nowUsersNum == usersNum) {
                userMgr.broacastByMatchId("match_usersNum", {
                    usersNum: nowUsersNum,
                    start: 1,
                    matchId: matchId,
                    allUsersNum: usersNum
                }, matchId)
                match(matchId)
                return
            }
            // let matchInfo = gameMgr.getMatchInfo(matchId)
            // console.log("matchInfo9999", matchInfo)

            userMgr.broacastByMatchId("match_usersNum", {
                usersNum: nowUsersNum,
                start: 0,
                matchId: matchId,
                allUsersNum: usersNum
            }, matchId)
        })


    }

}
//退出比赛场
exports.tuisai = function (socket, data) {
    console.log("tuisai")
    let userId = data.userId;
    let matchId = data.matchId;
    if (!userId || !matchId) {
        socket.emit("system_error", {
            errcode: 500,
            errmsg: "参数错误"
        })
        return;
    }
    agentService.hadLeftClub2(userId, (err, left_results) => {
        console.log("left_results", left_results)
        if (err) {
            console.error(err);
            return socket.emit("system_error", {
                errcode: 500,
                errmsg: "服务器错误"
            })
        }
        console.log("left_results2", left_results)
        if (left_results == null) {
            socket.emit("tuisai_result", {
                errcode: 500,
                errmsg: "退赛失败"
            })
            return;
        }
        club_server.dleteClubUsers(userId, matchId, function (err, data) {
            if (err || !data) {
                console.error(err);
                return
            }
            gameMgr.exitMatch(matchId, userId)
            socket.emit("tuisai_result", {
                errcode: 200,
                errmsg: "退赛成功"
            })
        })

    })
}

function sortByfen(a, b) {
    return a.fen - b.fen
}
exports.rank = function (socket, data) {
    let matchId = data.matchId;
    if (!match) {
        return socket.emit("system_error", {
            errcode: 500,
            errmsg: "参数错误"
        })
    }
    let matchUsers = gameMgr.getMatchUsers(matchId);

    matchUsers.sort(sortByfen)
    return socket.emit("rank_result", {
        errcode: 200,
        errmsg: "ok",
        data: matchUsers
    })
}
/**
 * 创建房间
 * @param {*} clubId 
 * @param {*} type 
 */
async function createRoom(clubId, type) {

    let room_config = await myConfig.config[type]
    // if (data.nowdiFen && data.nowdiZhu) {
    //     room_config.diZhu = nowdiZhu
    //     room_config.diFen = nowdiZhu
    //     socket.emit("fz_result", { difen: nowdiFen, dizhu: nowdiZhu })
    // }
    async function createRoom() {
        return new Promise(async (resolve, reject) => {
            // room_config.ip = config.SERVER_IP
            // room_config.port = config.CLIENT_PORT
            room_config.clubId = clubId;
            try {
                let createRes = await gameMgr.createRoom(room_config)
                let roomId = createRes.roomId
                resolve(roomId)
                console.log(roomId)
                console.log("房间id" + roomId)
            } catch (error) {
                console.log(error)
                console.log(72)
            }
        })
    }
    console.log("shengchengfangjianzhong")
    let roomId = await createRoom()
    return roomId


}
/**
 * 进入房间
 * @param {*} socket 
 * @param {*} data 
 */
async function enterRoom(socket, data) {
    var userId = data.userId
    var name = data.name;
    var roomId = data.roomId;
    var coins = data.coins;
    var headimg = data.headimg;
    var sex = data.sex;
    let jifen = data.jifen

    var ctrl_param = 0;
    console.log("data", data)
    console.log("进入enterroom", roomId)
    console.log("headimg", headimg)
    console.log("userId", userId)
    if (userId == null || roomId == null || headimg == null) {
        socket.emit("system_error", { errocde: 500, errmsg: "参数错误", flag: "enter_room" });
        return;
    }
    let roomInfo = gameMgr.getRoomById(roomId);
    console.log("roomInfo_enter", roomInfo)
    if (!roomInfo) {
        roomInfo = await commonService.getTableValuesAsync("*", "t_rooms", { id: roomId });
        roomInfo = JSON.parse(roomInfo.base_info);
    }
    // //安排玩家坐下
    try {
        let ret = await gameMgr.enterRoom({
            roomId: roomId,
            userId: userId,
            name: name,
            coins: parseInt(coins),
            jifen: jifen,
            headimg: headimg,
            ctrlParam: ctrl_param,
            sex: sex,
            is_robot: 0
        });
        let errors = {
            [2222]: "房卡不足.",
            [3]: "房间不存在.",
            [4]: "房间已经满了.",
            [5]: "内部错误.",
        }
        if (ret != 0) {
            socket.emit("system_error", { errocde: 500, errmsg: errors[ret] || "未知错误" });
            return;
        }
        console.log("data", data)
        console.log("ret", ret)
        exports.login(socket, data)
    } catch (error) {
        console.log(error);
        socket.emit("system_error", { errocde: 500, errmsg: "加入房间失败, 请稍后重试" });
    }
}
/**
 * 
 * 自动匹配比赛场合适的玩家 
 */

function matchStart(matchId, roomId, nowdiFen, nowdiZhu, needStop) {
    let matchInfo = gameMgr.getMatchInfo(matchId)
    let matchUsers = matchInfo.users;
    let usersNum2 = matchUsers.length
    matchUsers.sort(sortByfen);
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
                let fenRes = []
                for (let i of users) {
                    if (i.status == 0) {
                        let rank = 0;
                        for (let j in matchUsers) {
                            if (matchUsers[j].userId == i.userId) {
                                rank = parseInt(j) + 1
                            }
                        }
                        let socket = userMgr.get(i.userId)
                        if (!socket) {
                            socket = userMgr.getT(i.userId)
                        }
                        let data = {};
                        data.name = i.name
                        data.userId = i.userId
                        data.sex = 0
                        data.type = matchInfo.type
                        data.clubId = matchId
                        data.jifen = i.jifen
                        data.nowdiFen = nowdiFen
                        data.nowdiZhu = nowdiZhu
                        data.headimg = i.headimg
                        data.roomId = roomId
                        data.coins = await getCoins(i.userId);
                        gameMgr.setMatchUsers(matchId, i.userId, "status", 1)
                        let temp = {}
                        temp.userId = i.userId
                        temp.rank = rank
                        temp.jifen = i.jifen
                        temp.userNum = usersNum2
                        fenRes.push(temp)
                        setTimeout(function () {
                            socket.emit("gb_jr", { result: fenRes })
                            // console.log("data", data)
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
                if (i.jifen < nowLimitFen) {
                    let index = matchUsers.indexOf(i)
                    matchInfo.users.splice(index, 1)
                    let socket = userMgr.get(i.userId)

                    socket.emit("bisai_result", {
                        errcode: 200,
                        errmsg: "你当前排名第" + index + "名已被淘汰",
                        stop: 1
                    })
                    if (!socket) {
                        socket = userMgr.getT(i.userId)
                    }
                    exports.exit(socket, { userId: i.userId, isMe: 1 })
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
        let jushu = matchInfo.users[0].jushu
        if (jushu < 2) {
            console.log("进入复赛了2", jushu)
            let nowJushu = jushu + 1
            for (let i of matchInfo.users) {

                gameMgr.setMatchUsers(matchId, i.userId, "jushu", nowJushu)
            }
            if (jushu == 0) {
                matchStart(matchId, 0, nowdiFen, nowdiZhu, 0)
            } else {
                return matchStart(matchId, 0, nowdiFen, nowdiZhu, 1)
            }

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
                if (!socket) {
                    socket = userMgr.getT(i.userId)
                }
                exports.exit(socket, { userId: i.userId, isMe: 1 })
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
            let nowJushu = jushu + 1
            for (let i of matchInfo.users) {

                gameMgr.setMatchUsers(matchId, i.userId, "jushu", nowJushu)
            }
            if (jushu == 0) {
                matchStart(matchId, 0, nowdiFen, nowdiZhu, 0)
            } else {
                return matchStart(matchId, 0, nowdiFen, nowdiZhu, 1)
            }

        } else {
            for (let i in matchUsers) {
                gameMgr.exitRoom(i.userId)
                userMgr.sendMsg(matchUsers[i].userId, "bisai_result", {
                    errcode: 200,
                    errmsg: "比赛结束",
                    rank: i,
                    award: "",
                    stop: 1
                })
                let socket = userMgr.get(i.userId)
                if (!socket) {
                    socket = userMgr.getT(i.userId)
                }
                exports.exit(socket, { userId: i.userId, isMe: 1 })
            }

            gameMgr.DelMatch(matchId)

            return "stop"
        }
    }

}
///////////////////////////////////////////////////////////
/**
 * 聊天
 * @param {*} socket
 * @param {*} data
 */
exports.chat = function (socket, data) {
    var chatContent = data;
    userMgr.broacastInRoom('chat_push', {
        sender: socket.userId,
        content: chatContent
    }, socket.userId, true);
}
/**
 * 快速聊天
 * @param {*} socket
 * @param {*} data
 */
exports.quickChat = function (socket, data) {
    var userId = socket.userId;
    dealUseridErr(socket, userId)
    if (socket.voice_countdown != null && socket.voice_countdown < 0) { //8秒才能广播一次信息
        userMgr.sendMsg(userId, 'quick_chat_msg', {
            msg: '您发送的频率太快.歇一会吧'
        });
        return;
    }
    socket.voice_countdown = -1;
    setTimeout(() => {
        socket.voice_countdown = 1;
    }, 5000)
    var chatId = data;
    userMgr.broacastInRoom('quick_chat_push', {
        sender: socket.userId,
        content: chatId
    }, socket.userId, true);

}
/**
 * 语音聊天
 * @param {*} socket
 * @param {*} data
 */
exports.voiceMsg = function (socket, data) {
    var userId = socket.userId;
    dealUseridErr(socket, userId)
    if (socket.voice_countdown != null && socket.voice_countdown < 0) { //8秒才能广播一次信息
        userMgr.sendMsg(userId, 'quick_chat_msg', {
            msg: '您发送的频率太快.歇一会吧'
        });
        return;
    }
    socket.voice_countdown = -1;
    setTimeout(() => {
        socket.voice_countdown = 1;
    }, 5000)
    console.log(data.length);
    userMgr.broacastInRoom('voice_msg_push', {
        sender: socket.userId,
        content: data
    }, socket.userId, true);
}
/**
 * 表情
 * @param {*} socket
 * @param {*} data
 */
exports.emoji = function (socket, data) {
    var phizId = data;
    userMgr.broacastInRoom('emoji_push', {
        sender: socket.userId,
        content: phizId
    }, socket.userId, true);
}
/**
 * 赠送道具,扣除金币
 * @param {*} socket
 * @param {*} data
 */
exports.grantProp = function (socket, data) {
    params = JSON.parse(data);
    if (socker && !socket.userId || !params.receiver || !params.prop_id || !params.prop_name) {
        userMgr.sendMsg(socket.userId, "notice", '操作失败');
        return;
    }
    dealUseridErr(socket, userId)
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
        } else {
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
                    socket.emit('system_error', {
                        errcode: 500,
                        errmsg: '金币不足，无法使用该道具'
                    })
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
/**
 * 退出房间
 * @param {*} socket
 * @param {*} data
 */
exports.exit = function (socket, data) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }

    var userId = data.userId;
    let isMe = data.isMe;
    if (!userId) {
        return;
    }
    dealUseridErr(socket, userId)
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        return;
    }

    var player = roomInfo.getPlayerById(userId);
    if (!player) {
        return
    }
    if (player.state !== player.PLAY_STATE.FREE && player.state != player.PLAY_STATE.READY) {
        socket.emit('exit_result', {
            state: player.state,
            res: "no"
        })
        return
    }
    //设置玩家离线
    player.setOnlineState(0);
    if (socket && !isMe) {
        socket.emit('exit_result', {
            state: player.state,
            res: "yes"
        });
        console.log("exit", player)
        exports.disconnect(socket);
    }
    //如果玩家在开始准备阶段退出，判断是不是庄家，否则更换庄家
    console.log("player.state", player.state)
    if (player.state == player.PLAY_STATE.FREE || player.state == player.PLAY_STATE.READY) {
        //console.log('********exit玩家退出【'+player.userId+'】**********');
        //如果玩家已经准备了，则清除计时器
        if (player.state == player.PLAY_STATE.READY) {
            player.clearTimer();


        }
        userMgr.broacastByRoomId('gb_player_exit', {
            userId: userId
        }, roomInfo.roomId);
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
            userMgr.delT(userId)
            //解散房间
            //如果是代开房间，则不解散房间
            if (roomInfo.isDaiKai == 0) {
                gameMgr.destroy(roomInfo.roomId);
            }
        } else {
            gameMgr.exitRoom(userId);
            userMgr.delT(userId)
            //console.log('********玩家【'+userId+'】退出房间**********');
            //获取当前房间的庄家
            var banker = roomInfo.getBanker();

            userMgr.broacastByRoomId('gb_player_exit', {
                userId: userId
            }, roomInfo.roomId);


            //游戏准备阶段，如果推出后所有玩家都已经准备了，则游戏开始
            if (roomInfo.gameState == roomInfo.GAME_STATE.READY) {
                checkCanBegin(roomInfo.roomId);
            }
        }
    }
}

/**
 * 玩家掉线
 * @param socket
 */
exports.disconnect = async function (socket) {
    if (typeof data === "string") {
        data = JSON.parse(data);
    }
    var userId = socket.userId;
    console.log("disconnuserid", userId);
    //检查传过来的userId是否有误
    // let userid = await checkUserId(socket,userId);
    // console.log("disconnuserid",userid);
    if (!socket) {
        socket = userMgr.getT(userId)
    }
    // if(userid===1 || !userid ||userid!==userId){
    //     socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
    //     return;
    // }
    //如果是旧链接断开，则不需要处理。
    if (userMgr.get(userId) != socket) {
        return;
    }

    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        console.log("roomInfo yichang")
        userMgr.del(userId);

        gameMgr.exitRoom(userId);
        return;
    }
    var data = {
        userid: userId,
        online: false
    };


    let player = roomInfo.getPlayerById(userId);
    if (player) {
        //设置玩家离线
        player.setOnlineState(0);
    }
    //通知房间内其它玩家
    userMgr.broacastInRoom('gb_user_state', data, userId);

    //清除玩家的在线信息
    userMgr.del(userId);
    socket.userId = null;
    console.log("roomInfo.gameState", roomInfo.gameState)
    if (roomInfo.gameState == roomInfo.GAME_STATE.READY || roomInfo.gameState == roomInfo.GAME_STATE.SETTLEMENT) {
        userMgr.broacastByRoomId('gb_player_exit', {
            userId: userId
        }, roomInfo.roomId);
        gameMgr.exitRoom(userId);

    }
}

/**
 * 心跳检测
 * @param socket
 */
exports.ping = function (socket) {
    socket.emit('game_pong');
}


/***********************控制逻辑***************************/
/**
 * 看牌
 * @param socket
 */
exports.ctrlKanPai = function (socket) {
    var userId = socket.userId;
    if (!userId) {
        return;
    }
    dealUseridErr(socket, userId)
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        return;
    }

    if (roomInfo.gameState != roomInfo.GAME_STATE.PLAYING) {
        socket.emit('ctrl_kanpai_result', {
            errcode: 500,
            errmsg: '游戏还未开始，请稍后'
        });
        return;
    }

    var results = [];
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];
        if (player.state != player.PLAY_STATE.FREE && player.state != player.PLAY_STATE.FAIL && player.optState != player.OPT_STATE.QI_PAI) {
            var data = {};
            data.name = player.name;
            data.pokers = player.hold;
            results.push(data);
        }
    }
    socket.emit('ctrl_kanpai_result', results);
}


/**
 * 发送全局广播
 */
function sendBroadcast(msg) {
    http.get(config.HALL_IP, config.HALL_PORT, "/send_broadcast", {
        msg: msg
    }, function (ret, data) {
        if (ret) {
            if (data.errcode != 0) {
                console.log('【炸金花】发送全局广播失败:' + data.errmsg);
            }
        } else {
            //console.log('【炸金花】请求发送全局广播接口失败!');
        }
    });
}