/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: {描述一下文件的功能}
 */
var config = require('../configs').game_server_zhajinhua;
var crypto = require('../utils/crypto');
var tokenMgr = require("../common/tokenmgr");
var userMgr = require('./userMgr');
var gameMgr = require('./gameMgr');
var rechargeService = require('../common/service/rechargeService')
var gameLogic = require('./gameLogic');
var http = require('../utils/http');
var IPUtil = require('../utils/IPUtil');
var activityService = require('../common/service/activityService');
var dateUtil = require('../utils/dateUtil');
var commonUtil = require('../utils/commonUtil');
var playerService = require("../common/service/playerService")
var gameService = require('../common/service/gameService')
var redis = require("../utils/redis")
var gameLogic = require("./gameLogic")
let RobotSocket = require("./entity/RobotSocket")
/**
 * 处理传来的userid错误
 * 
 */
async function checkUserId(socket,userId){
    return new Promise( (resolve,reject)=>{

        playerService.getPlyaerInfoById(userId,function(err,result){
            if(err){
                console.log(err)
                resolve(1)
                return;
            }
            if(result){
                
                resolve(result.userid);
            }
        })

        try{
            if(socket.session){
                redis.get("session"+userId,function(err,value){
                    if(err){
            
                        playerService.getUserSessionByUserId(userId,function(err,value){
                            if(err){
                                socket.emit('system_error', { errcode: 500, errmsg: "登录异常" });
                            }
                            if(socket.session!=value.session){
                                socket.emit('_exit', { errcode: 500, errmsg: "登录异常" });
                                return;
                            }
                        })
                    }
                    if(socket.session!=value){
                        socket.emit('_exit', { errcode: 500, errmsg: "登录异常" });
                        return;
                    }
                })
            }
        }catch(e){
            console.log(e)
        }
    })

}
/**
 * 玩家加入房间
 * @param {*} socket
 * @param {*} data
 */
exports.login = async function (socket, data,config,room_config) {
    console.log("进入login")
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    
    if (socket.userId != null) {
        //已经登陆过的就忽略
        return;
    }
    var userId = data.userId
    let roomId = data.roomId;
    var name = data.name;
    var sex = data.sex;
    var ctrl_param = data.ctrl_param;
    var time = data.time;
    var sign = data.sign;
    var coins;
    let session = data.session;
    if (!userId) {
        socket.emit('system_error', { errcode: 500, errmsg: "用户不存在" });
        return;
    }
    //检查参数合法性
    if ( !time) {
        socket.emit('system_error', { errcode: 500, errmsg: "参数错误" });
        return;
    }
    if(session && !socket.session){
        socket.session = session
    }
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    async function getCoins(){
        return new Promise( (resolve,reject)=>{
             playerService.getUserDataByUserId(userId,function(err,result){
                if(err){
                    console.log(err)
                    return;
                }
                if(result){
                    resolve(result.coins)
                    coins = result.coins;
                }
            });
        })

    } 
    console.log("roomId",roomId)
    //返回房间信息
    var roomInfo = gameMgr.getRoomById(roomId);

    if (!roomInfo) {
        socket.emit('system_error', { errcode: 500, errmsg: "房间不存在" });
        return;
    }
    //获取玩家的坐位索引值
    var currentPlayer = roomInfo.getPlayerById(userId);
    if(!currentPlayer){
        socket.emit('system_error', { errcode: 500, errmsg: "加入房间失败,请稍后重试" });
        return;
    }

   // console.log('********玩家:【'+currentPlayer.name+'】 进入了房间：'+roomId+'  当前金币：'+currentPlayer.coins);
    userMgr.bind(userId, socket);

    socket.userId = userId;

    var ip = "";
    //机器人，随机获取IP
    if(currentPlayer.isRobot==1){
        ip = IPUtil.getRandomIP();
    }else{
        ip = socket.handshake.address;
        if(socket.handshake.headers['x-forwarded-for'] != null){
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
        //说明玩家正在游戏中，需要同步游戏状态
        if (player.state != player.PLAY_STATE.FREE) {
            playerInfo.pokers = player.pokers;
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

            isPrivate:roomInfo.isPrivate,

            //已经进行的局数
            numOfGame: roomInfo.numOfGame,
            maxGames: roomInfo.maxGames,

            //最大容纳人数
            seatCount: roomInfo.seatCount,
            //游戏状态
            gameState: roomInfo.gameState,
            diZhu: roomInfo.diZhu,
            currentLunShu: roomInfo.currentLunShu,
            totalBets: roomInfo.totalBets,

            //当前操作人的ID
            currentTurn: roomInfo.currentTurn,
            readyDowncount: roomInfo.READY_COUNTDOWN,
            optDowncount: roomInfo.OPT_COUNTDOWN,
            seats: seats
        }
    };
    let tuoguanSocket = new RobotSocket(userId);
    if(!(userMgr.getT(userId))){
        userMgr.bindT(userId,tuoguanSocket);
    }
    
    // ret.data.seats=newSeats;
    socket.emit('login_result', ret);
    console.log(ret)
    //console.log('********【'+currentPlayer.name+'】_join_room********');
    //console.log(JSON.stringify(ret));
//更新玩家所在房间信息
gameService.updateRoomIdOfUserByUserId(userId, roomId, (err, result) => {
    if (err) {
        return;
    }
});
    //通知其它客户端
    userMgr.broacastInRoom('player_join_room', {userDate:userData,seats:ret.data.seats}, userId, false);

    socket.emit('system_error', { errcode: 500, errmsg: "长时间不操作将自动托管" });

    //检查用户是否可以准备
    if (roomInfo.gameState == roomInfo.GAME_STATE.READY && currentPlayer.state == currentPlayer.PLAY_STATE.FREE) {
        //如果不是房间创建者或者不是庄家
        if ( currentPlayer.isBanker == 0) {
            socket.emit('begin_ready', { countdown: roomInfo.READY_COUNTDOWN });
            console.log('*******设置玩家【'+userId+'】准备倒计时*******');
            var timer = tichu(userId);
            // currentPlayer.setTimer(timer, roomInfo.READY_COUNTDOWN);
        }else{//庄家和创建者自动准备
            if(roomInfo.numOfGame==0){
                var data = {};
                data.userId = userId;
                var socket = userMgr.get(userId);
                exports.ready(socket,JSON.stringify(data));
            }else{
                socket.emit('begin_ready',{ countdown: roomInfo.READY_COUNTDOWN });
            }
        }
    }
}

/**
 * 机器人加入房间
 * @param {*} socket
 * @param {*} data
 */
exports.robot_login = function (socket, data) {
    if(typeof data ==="string"){
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
        socket.emit('system_error', { errcode: 500, errmsg: "用户不存在" });
        return;
    }
    //检查参数合法性
    if ( !roomId  || !time) {
        socket.emit('system_error', { errcode: 500, errmsg: "参数错误" });
        return;
    }
    //检查参数是否被篡改
    var md5 = crypto.md5(roomId  + time + config.ROOM_PRI_KEY);
    if (md5 != sign) {
        socket.emit('system_error', { errcode: 500, errmsg: "非法的请求" });
        return;
    }

    
    //返回房间信息
    var roomInfo = gameMgr.getRoomById(roomId);
    //获取玩家的坐位索引值
    var currentPlayer = roomInfo.getPlayerById(userId);
    if (!roomInfo) {
        socket.emit('system_error', { errcode: 500, errmsg: "房间不存在" });
        return;
    }

    if(!currentPlayer){
        socket.emit('system_error', { errcode: 500, errmsg: "加入房间失败,请稍后重试" });
        return;
    }

   // console.log('********玩家:【'+currentPlayer.name+'】 进入了房间：'+roomId+'  当前金币：'+currentPlayer.coins);
    userMgr.bind(userId, socket);
    socket.userId = userId;

    var ip = "";
    //机器人，随机获取IP
    if(currentPlayer.isRobot==1){
        ip = IPUtil.getRandomIP();
    }else{
        ip = socket.handshake.address;
        if(socket.handshake.headers['x-forwarded-for'] != null){
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
            playerInfo.hold = player.pokers;     
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
            isPrivate:roomInfo.isPrivate,
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
    userMgr.broacastInRoom('player_join_room', {userDate:userData,seats:ret.data.seats}, userId, false);

    socket.emit('system_error', { errcode: 500, errmsg: "金币不足时，将会自动弃牌，请注意自身所持金币！" });

    //检查用户是否可以准备
    if (roomInfo.gameState == roomInfo.GAME_STATE.READY && currentPlayer.state == currentPlayer.PLAY_STATE.FREE) {
        //如果不是房间创建者或者不是庄家
        if (userId != roomInfo.createUser || currentPlayer.isBanker == 0) {
            socket.emit('begin_ready', { countdown: roomInfo.READY_COUNTDOWN });
            //console.log('*******设置玩家【'+userId+'】准备倒计时*******');
            //设置等待倒计时
            //var timer = tichu(userId);
            //currentPlayer.setTimer(timer, roomInfo.READY_COUNTDOWN);
        }else{//庄家和创建者自动准备
            if(roomInfo.numOfGame==0){
                var data = {};
                data.userId = userId;
                var socket = userMgr.get(userId);
                exports.ready(socket,JSON.stringify(data));
            }else{
                socket.emit('begin_ready', { countdown: roomInfo.READY_COUNTDOWN });
            }
        }
    }
}


/**
 * 准备
 * @param {*} socket
 * @param {*} data
 */
exports.ready =async function (socket, data) {
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
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }

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
    if(roomInfo.jiesuan=="jinbi"){
        if(player.coins<roomInfo.diZhu*2){
            socket.emit('system_error', { errcode: 500, errmsg: "金币不足" });
            return;
        }
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


/**
 * 启动游戏开始倒计时
 */
function startGameBeginCountDown(roomId){
    var roomInfo = gameMgr.getRoomById(roomId);
    if(!roomInfo){
        return;
    }
    roomInfo.countdown =roomInfo.READY_COUNTDOWN/1000;
    var readyCountDown = setInterval(function(){
        roomInfo.countdown -= 1;
        //console.log('******此时房间的倒计时*******：'+roomInfo.countdown);
        if(roomInfo.countdown === 0){
            clearInterval(readyCountDown);
            checkCanBegin(roomInfo.roomId);
        }
        //do whatever here..
    }, 1000);
    roomInfo.setTimer(readyCountDown);
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
    if (readyPlayerCount > 1&&roomInfo.gameState === roomInfo.GAME_STATE.FREE) {
        var roomId = roomInfo.roomId;
        //游戏开始
        exports.gameBegin(roomId);
    }
}

/**
 * 开始游戏
 */
exports.gameBegin =async function (roomId) {
    var roomInfo = gameMgr.getRoomById(roomId);
    //console.log('****游戏开始，庄家是【'+banker.userId+'】*****');
    //广播通知游戏开始
    // userMgr.broacastByRoomId('system_error', { errcode: 500, errmsg: '开始游戏' },roomId);

    userMgr.broacastByRoomId('gb_game_begin', { errcode:0,errmsg:"开始游戏"}, roomId);
    
    //扣除房间抽水
    roomInfo.choushui();
    //设置游戏的状态为开始状态
    roomInfo.setState(roomInfo.GAME_STATE.QIANGDIZHU);
    //更新游戏局数
    roomInfo.updateNumOfGame();
    var diZhu = roomInfo.diZhu;
    var readyPlayerCount = roomInfo.getPlayerCount();

    //延迟一秒后通知发牌
    setTimeout(function (){
        let create = roomInfo.getPlayerById(roomInfo.createUser);
        create.settlementGems(0-roomInfo.maxGames,roomInfo)
        faPai(roomInfo);
    }, 500);
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

//抢暗庄
exports.qiangAnZhuang =async function(socket,data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var qiang = data.qiang;
    if(!userId ||!qiang){
        console.log(userId)
        console.log(qiang)
        socket.emit('system_error', { errcode: 500, errmsg: '参数错误' });
    }
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        console.log("房间有误了")
        return
    }//
    
    var player = roomInfo.getPlayerById(userId);

    //延迟时间
    player.setState(player.OPT_STATE.QIANGANZHUANG);
    if(qiang==1){
        roomInfo.az_userId= userId;
        
    }
    for(let i of roomInfo.seats){
        console.log("stateaaaaaaaaaaaaaaaa",i.state)
    }
    userMgr.broacastByRoomId('gb_qaz_result',{userId:userId,qiang:qiang}, roomInfo.roomId);
    player.clearTimer();
    console.log("roomInfo.isAllOpt(player.PLAY_STATE.QIANGANZHUANG",roomInfo.isAllOpt(player.PLAY_STATE.QIANGANZHUANG))
    if(roomInfo.isAllOpt(player.OPT_STATE.QIANGANZHUANG) || qiang ==1){
        let FirstUserId = roomInfo.findAnZhuang();
        roomInfo.setBanker(FirstUserId);
        for(let i of roomInfo.seats){
            i.setState(player.PLAY_STATE.WAITTING)
        }
        roomInfo.setState(roomInfo.GAME_STATE.PLAYING);
        userMgr.broacastByRoomId('gb_az',{userId:FirstUserId}, roomInfo.roomId);
        let FirstPlayer;//第一个出牌的人
        if(FirstUserId){
            FirstPlayer = roomInfo.getPlayerById(FirstUserId);
        }else{
            FirstPlayer = roomInfo.getPlayerById(roomInfo.hongtao3);
        }
        roomInfo.setCurrentTurn(FirstPlayer.seatIndex)
        setTimeout(
            function(){
                let opt_timeout = optTimeOut(userId)
                FirstPlayer.setTimer(opt_timeout,roomInfo.OPT_COUNTDOWN)
            },4000)

    }else{
        // player.setState(player.PLAY_STATE.WAITTING);
        
        console.log(roomInfo.getPlayerById(userId))
        roomInfo.setCurrentTurn(player.seatIndex);
        var nextTurnPlayer = roomInfo.getNextTurnPlayer(roomInfo.currentTurn);
        nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
        //广播轮到操作的玩家信息
        userMgr.broacastInRoom('gb_turn', { userId: nextTurnPlayer.userId, countdown: roomInfo.OPT_COUNTDOWN,gameState:roomInfo.gameState }, nextTurnPlayer.userId,true);
        checkAnZhuangState(userId,roomInfo.roomId)
    }
}

function qianganzhuangTimeOut(userId){
    return function(){
        let socket = userMgr.get(userId)
        let data = {userId:userId,qiang:0}
        exports.qiangAnZhuang(socket,data)
    }
}


//加倍超级几倍
exports.jiabei =async function(socket,data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var beishu = data.beishu;
    if(!userId || !beishu){
        socket.emit('system_error', { errcode: 500, errmsg: '参数错误' });
    }
//检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    player.beishu = beishu;
    userMgr.broacastByRoomId("gb_jiabei",{beishu:beishu,userId:userId});
}
//广播明牌
exports.mingpai =async function(socket,data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var beishu = data.beishu;
    if(!userId || !beishu){
        socket.emit('system_error', { errcode: 500, errmsg: '参数错误' });
    }
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    player.beishu = beishu;
    userMgr.broacastByRoomId("gb_mingpai",{userId:userId});
}

//出牌
exports.chupai =async function(socket,data){
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
    // console.log("roomInfo",roomInfo)
    let lastPokers = roomInfo.lastPokers.pokers;
    let ishongtao3 = false;
    console.log("roomInfo.lastPokers",roomInfo.lastPokers)
    let az_userId = roomInfo.findAnZhuang()
    console.log("az_userId",az_userId)

    if(roomInfo.hongtao3 ===userId && !roomInfo.hongtao3IsEnd && !az_userId){
        for(let i of pokers){
            if(i.num===3&&i.color===2){
                console.log("我是红桃3")
                console.log(pokers)
                ishongtao3 = true;
            }
        }
        if(!ishongtao3){
            return socket.emit("chupai_result",{errcode:1,errmsg:"所出牌必须包含红桃3"});
        }
    }
    let player = roomInfo.getPlayerById(userId);
    let nextPlayer = roomInfo.getNextTurnPlayer(player.seatIndex);
    //如果下家玩家剩余一张牌，则当前玩家必须出最大值的牌
    if(nextPlayer.pokers.length ==1 && roomInfo.lastPokers.pokers.length==1&&pokers.length==1){
        let sYpokers = player.pokers
        sYpokers = gameLogic.pokerSort(sYpokers);
        if(pokers[0].num<sYpokers[0].num){
            return socket.emit("chupai_result",{errcode:200,errmsg:"由于下家玩家剩余一张牌，您需要打出最大的牌"})
        }
    }
    let type = gameLogic.getPokerType(pokers,userId);
    console.log("type",type);
    console.log("type",player.pokers.length);
    if(type.type=="sanzhang" && player.pokers.length>3){
        return socket.emit("chupai_result",{errcode:200,errmsg:"所出牌不符合规则"})
    }
    let res = 1;
    //如果最新打出的牌的玩家和正在出牌的玩家不是同一个人则进行比牌操作
    if(userId !== roomInfo.lastPokers.userId){
        res = gameLogic.compare(pokers,lastPokers,userId,roomInfo.lastPokers.userId);
    }


    
    roomInfo.setCurrentTurn(player.seatIndex)
    if(res!==1){
        result.pokerType = "nothing";
        socket.emit("chupai_result",{res:res});
        return;
    }else{
        if (!type){
            socket.emit("chupai_result",{res:2});
            return;
        }

        if(type.type == "zhadan" || type.type == "AAA"){
            roomInfo.zhadanNum += 1;
        }
        let banker = roomInfo.getBanker();
        console.log("roomInfo.lastPokers.userId",roomInfo.lastPokers.userId)
        // console.log("banker.userId",banker.userId)
        console.log("userId",userId);
    
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
    mypokers = gameLogic.pokerSort(mypokers);
    let allpokers = [].concat(roomInfo.shengyuPokers);
    for(let i of pokers){
        commonUtil.removeOne(mypokers,i);
        console.log("length",mypokers.length,i)
        commonUtil.removeOne(allpokers,i);
    }
    player.updatePokers( mypokers)
    roomInfo.shengyuPokers = allpokers;
    result.chued = pokers;
    result.userId = userId;
    result.pokers = mypokers;
    result.beishu = roomInfo.beishu;
    let banker = roomInfo.getBanker();
    console.log("打出的pokers",pokers);
    //把剩余的牌展示给庄家
    // userMgr.sendMsg(banker.userId,"shengyu_pokers",roomInfo.shengyuPokers);
    roomInfo.hongtao3IsEnd = true
    userMgr.broacastByRoomId('gb_compare_result',result, roomInfo.roomId);
    player.clearTimer();

    //根据当前玩家所出的牌判断下一家是不是屏蔽掉不出按钮
    player.setState(player.PLAY_STATE.WAITTING);
    console.log("player.seatIndex",player.seatIndex);

    let nextSocket = userMgr.get(nextPlayer.userId);
    let tishi = exports.tishi(nextSocket,{userId:nextPlayer.userId,chupai:1});
    console.log("nextSocketaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",nextSocket.userId)
    console.log("roomInfo.lastpokers",roomInfo.lastPokers)
    console.log("tishi",tishi)
    if(player.pokers.length>0 ){
        if(tishi.length>0 || roomInfo.lastPokers.userId == nextPlayer.userId){
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
        console.log("暗庄失败")
        roomInfo.isend=1;
        // if(result.isend !=1){
        //     if(player.isBanker ==1){
        //         for(let i of roomInfo.seats){
        //             if(i.userId === player.userId){
        //                 i.setWinOrLost(1);
        //             }
        //             i.setWinOrLost(0);
        //         }
        //     }else{
        //         for(let i of roomInfo.seats){
        //             if(i.userId === player.userId){
        //                 i.setWinOrLost(0);
        //             }
        //             i.setWinOrLost(1);
        //         }
        //     }
        // }else{
        //         for(let i of roomInfo.seats){
        //             if(i.userId === lastPokers.userId){
        //                 i.setWinOrLost(0);
        //             }
        //             i.setWinOrLost(1);
        //         }
    
        // }
        roomInfo.setState(roomInfo.GAME_STATE.SETTLEMENT);
        gameOver(roomInfo.roomId);
        return;
    }
    console.log("lalalalalalalalalalalallalala 2")
    console.log("userId",userId)
    checkGameState(userId,roomInfo.roomId,"socketCHUPAI");
    
    
}


/**
 * 托管
 */
exports.tuoguan = function(socket,data){
    // return;
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    if(!userId&&socket){
        socket.emit("systen_error",{errcode:500,errmsg:"参数错误"})
    }
    let roomInfo = gameMgr.getRoomByUserId(userId)
    var tuoguanSocket = userMgr.getT(userId);
    let player = roomInfo.getPlayerById(userId);
    player.isTuoguan = 1;
    userMgr.broacastByRoomId("gb_tuoguan",{errcode:0,errmsg:"ok",userId:userId},roomInfo.roomId);
    userMgr.bindT(userId,tuoguanSocket);
    // console.log(userMgr.get(userId));
    if(roomInfo.currentTurn==player.seatIndex){
        tuoguanSocket.emit("your_turn",{gameState:"playing"});
    }
    
    socket.emit("tuoguan_result",{errcode:0,errmsg:"ok"})
    
}

/**
 * qx托管
 */
exports.qxTuoguan =async function(socket,data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId || userId!=socket.userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        console.log("qxTuoguan 获取roomInfo异常")
        return;
    }
    // userMgr.delT(userId);
    let player = roomInfo.getPlayerById(userId)
    player.clearTimer();
    player.isTuoguan=0;
    userMgr.broacastByRoomId("gb_qxtuoguan",{userId:userId},roomInfo.roomId)
    let opt_timeout = optTimeOut(userId)
    player.setTimer(opt_timeout,roomInfo.OPT_COUNTDOWN)
    
}

//提示
exports.tishi = function(socket,data){
    let userId = data.userId;
    let chupai = data.chupai;
    let needBig = data.needBig;
    if(socket && !userId){
        socket.emit("tishi_result",{errcode:1,errmsg:"参数错误"});
        return;
    }
    let roomInfo = gameMgr.getRoomByUserId(userId);
    let lastPokers = roomInfo.lastPokers.pokers;
    console.log("lastPokers",lastPokers)
    let lastPokersType = gameLogic.getPokerType(lastPokers,userId);
    let player = roomInfo.getPlayerById(userId);
    let nextPlayer = roomInfo.getNextTurnPlayer(roomInfo.currentTurn);
    
    let res;
    if(player.pokers.length == 1 && roomInfo.lastPokers.pokers.length==1&&!chupai){
        res = gameLogic.getBiggerPokers(lastPokers,player.pokers,player.userId,1);
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
    if(res.length==0){

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
exports.buchu =async function(socket,data){
    let pokers = data.pokers;
    let userId = data.userId;
    let roomInfo = gameMgr.getRoomByUserId(userId)
    if(socket &&!userId ){
        socket.emit("chupai_result",{errcode:1,errmsg:"参数错误"});
        return;
    }
    let player = roomInfo.getPlayerById(userId)
    let nextPlayer = roomInfo.getNextTurnPlayer(roomInfo.currentTurn);
    
    let nextSocket = userMgr.get(nextPlayer.userId);
    let tishi = exports.tishi(nextSocket,{userId:nextPlayer.userId,chupai:1});
    console.log("nextSocketaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",nextSocket.userId) 
    console.log("tishi",tishi)
    if(tishi.length>0 || roomInfo.lastPokers.userId == nextPlayer.userId){
        nextSocket.emit("buchu",{buchu:0});
    }else{
        nextSocket.emit("buchu",{buchu:1});
    }
    player.clearTimer();
    userMgr.broacastByRoomId('gb_buchu',{userId:userId}, roomInfo.roomId);
    console.log("lalalalalalalalalalalallalala ")
    checkGameState(userId,roomInfo.roomId,"socketBUCHU");
}

exports.jiesan = async function(socket,data){
    let userId = data.userId;
    let roomId = data.roomId;
    if(!userId || !roomId){
        socket.emit("jiesan_result",{errcode:500,errmsg:"参数错误"})
    }
    let roomInfo = gameMgr.getRoomById(roomId)
    console.log(roomInfo.gameState);
    if(roomInfo.gameState == roomInfo.GAME_STATE.PLAYING){
        socket.emit("jiesan_result",{errcode:500,errmsg:"请等待此局游戏结束"})
    }
    userMgr.broacastByRoomId("gb_jiesan",{userId:userId},roomId);
    // let roomInfo = gameMgr.getRoomById(roomId);
    let player = roomInfo.getPlayerById(userId);
    player.jiesan = 1
    let jiesan_timeout = jiesanTimeOut(socket,userId);
    for(let i of roomInfo.seats){
        i.setTimer(jiesan_timeout,30000)
    }
}
//是否同意解散房间
exports.isJiesan = function(socket,data){
    let userId = data.userId;
    let is = data.is;

    if(!userId || (is!=0&&is!=1)){
        socket.emit("isjiesan_result",{errcode:500,errmsg:"参数错误"});
        return;
    }

    let roomInfo = gameMgr.getRoomByUserId(userId);
    let player = roomInfo.getPlayerById(userId);
    player.jiesan = is;
    roomInfo.isJiesanList.push({userId:userId,is:is})
    player.clearTimer()
    if(is==0){
        userMgr.broacastByRoomId("gb_isjiesan",roomInfo.isJiesanList,roomInfo.roomId);
        roomInfo.isJiesanList=[]
    }
    
    if(roomInfo.isJiesanList.length==roomInfo.seatCount-1){
 
        userMgr.broacastByRoomId("gb_jiesan_result",{errcode:200,errmsg:"解散成功",res:1},roomInfo.roomId);
        roomInfo.isJiesanList=[]
        
    }
}

function jiesanTimeOut(socket,userId){
    return function(){
        exports.isJiesan(socket,{userId:userId,is:0});
    }
    
}

/***
 * 发牌
 */
function faPai(roomInfo){
    // let roomInfo = gameMgr.getRoomById(roomId);
    
    let pokers = gameLogic.deal(roomInfo);
    let res = [];
    let result={};
    let seats = roomInfo.seats;

    for (let i in seats){
        let poker = {};
        poker.userId = seats[i].userId;
        seats[i].setState(seats[i].PLAY_STATE.WAITTING);
        seats[i].mopai(pokers.pokers[i]);
        poker.pokers = pokers.pokers[i];
        //如果游戏是第一局开始则拿红桃3先出牌否则上一局的赢家出牌
        // if(roomInfo.numOfGame===1){
            // console.log("poker.pokers",poker.pokers);
            for(let j of pokers.pokers[i]){
                // console.log("j.num",j.num,typeof (j.num))
                // console.log("j.num",j.color,typeof (j.color))
                // console.log(j.num ==3)
                // console.log(j.color ==2)
                if(j.num==3 && j.color ==2){
                    console.log("hongtao3i",seats[i].userId)
                    result.hongtao3 = seats[i].userId;
                    roomInfo.setLastPokers(seats[i].userId,[]);
                    roomInfo.hongtao3 = seats[i].userId;
                    console.log("hongtao3",result.hongtao3)
                    
                }
            }
        res.push(poker);
    }
    result.pokers=res;
    result.gameState = roomInfo.GAME_STATE.QIANGANZHUANG;
    roomInfo.setState(roomInfo.GAME_STATE.QIANGANZHUANG);
    userMgr.broacastByRoomId('gb_begin_fapai',result, roomInfo.roomId);
    // let qzto = qianganzhuangTimeOut(userId)
    let hongtao3Player = roomInfo.getPlayerById(roomInfo.hongtao3);
    hongtao3Player.setTimer(qianganzhuangTimeOut(roomInfo.hongtao3),roomInfo.OPT_COUNTDOWN)


}
function checkAnZhuangState(userId,roomId) {
    var roomInfo = gameMgr.getRoomById(roomId);
    let player = roomInfo.getPlayerById(userId);
    //如果一个玩家已经打光了自己的牌那就游戏结束

    roomInfo.setCurrentTurn(player.seatIndex)
    console.log("xiayigeren")
    // player.setState(player.PLAY_STATE.WAITTING)
    var currentSeatIndex = roomInfo.currentTurn;
    var currentPlayer = roomInfo.getPlayerBySeatIndex(currentSeatIndex);
    var nextTurnPlayer = roomInfo.getNextTurnPlayer(currentSeatIndex);
    roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);
    nextTurnPlayer.setTimer(qianganzhuangTimeOut(nextTurnPlayer.userId),roomInfo.OPT_COUNTDOWN)
    
}

/**
 * 检查游戏是否可以结束，不能则通知下个玩家操作
 */
function checkGameState(userId,roomId,flag) {
    var roomInfo = gameMgr.getRoomById(roomId);
    let player = roomInfo.getPlayerById(userId);
    //如果一个玩家已经打光了自己的牌那就游戏结束
    if (player.pokers.length == 0) {
        roomInfo.winUserId = userId;
        console.log("玩家牌打完了啊啊啊啊 啊啊啊      ",roomInfo.winUserId)
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
        // nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
        //设置下家操作的倒计时
        //设置玩家操作倒计时

        //如果玩家未托管
        if(nextTurnPlayer.isTuoguan ==0){
            var timer = optTimeOut(nextTurnPlayer.userId);
            nextTurnPlayer.setTimer(timer, roomInfo.OPT_COUNTDOWN);
            nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
        }
        if(nextTurnPlayer.isTuoguan==1){
            console.log("nextTurnPlayer.userId",nextTurnPlayer.userId)
            let nextSocket = userMgr.getT(nextTurnPlayer.userId);
            if(!nextSocket){
                userMgr.bindT(nextTurnPlayer.userId)
                nextSocket = userMgr.getT(nextTurnPlayer.userId);
            }
            try {
                nextSocket.emit("your_turn",{gameState:roomInfo.gameState})
            } catch (error) {
                console.log(error)
                
            }
            
            
        }

        userMgr.broacastInRoom('gb_turn', { userId: nextTurnPlayer.userId, countdown: roomInfo.OPT_COUNTDOWN,gameState:roomInfo.gameState,flag:flag }, nextTurnPlayer.userId,true);
        console.log("gb_turn",2)
    }
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
            i.isTuoguan=0;
        }
    }
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

                var socket = userMgr.get(player.userId);
                if (player.watchTimes>=3||!socket||player.isOnline==0) {
                    (function(){
                        if(!socket){
                            socket = userMgr.getT(player.userId)
                        }
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
 * 检测是否能抽奖，可以的话，发放抽奖通知
 */
async function checkLuckDraw(roomId){
    var roomInfo = gameMgr.getRoomById(roomId);
    //大于1000底注的公开固定房才有机会参与抽奖
    //if(roomInfo.diZhu>=5000&&roomInfo.isPrivate==0&&roomInfo.isDaiKai==1){
    if(roomInfo.diZhu>=5000&&roomInfo.isPrivate==0){
        for(var i=0;i<roomInfo.seats.length;i++){
            let player = roomInfo.seats[i];
            if(player.hasParticipateNumOfGame>20){
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
                if(hasGetLuckDrawTimes<3){
                    //一定概率发放抽奖
                    let randomNum = commonUtil.randomFrom(0,100);
                    //10%的概率发放
                    if(randomNum<30){
                        var rewardEntity = {};
                        rewardEntity.player_id = player.userId;
                        rewardEntity.status = 0;
                        rewardEntity.remark = '炸金花房间['+roomId+']游戏超20局随机奖励';
                        rewardEntity.type = 0;
                        rewardEntity.record_time = new Date().getTime()/1000;
                        activityService.grantLuckDrawAsync(rewardEntity);
                        //给客户端发送赠送奖励消息
                        userMgr.sendMsg(player.userId, 'get_once_luck_draw', { type: 0 });
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
        userMgr.sendMsg(userId, 'tichu', { userId: userId });
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
        userMgr.sendMsg(userId, 'opt_timeout', { userId: userId });
        //玩家直接弃牌
        var userSocket = userMgr.get(userId);
        
        var data = {};
        data.userId = userId;
        exports.tuoguan(userSocket, JSON.stringify(data));
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
    userMgr.broacastInRoom('chat_push', { sender: socket.userId, content: chatContent }, socket.userId, true);
}
/**
 * 快速聊天
 * @param {*} socket
 * @param {*} data
 */
exports.quickChat =async function (socket, data) {
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
exports.voiceMsg =async function (socket, data) {
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
exports.emoji = function (socket, data) {
    var phizId = data;
    userMgr.broacastInRoom('emoji_push', { sender: socket.userId, content: phizId }, socket.userId, true);
}
/**
 * 赠送道具,扣除金币
 * @param {*} socket
 * @param {*} data
 */
exports.grantProp =async function (socket, data) {
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
/**
 * 退出房间
 * @param {*} socket
 * @param {*} data
 */
exports.exit =async function (socket, data) {
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
    if(player.state == player.PLAY_STATE.PLAYING || (roomInfo.numOfGame<roomInfo.maxGames && roomInfo.numOfGame>1)){
        socket.emit('exit_result', { state:player.state,res:"no" })
        return
    }
    //设置玩家离线
    player.setOnlineState(0);
    if (socket) {
        socket.emit('exit_result', { state: player.state,res:"yes" });
        // console.log("exit",player)
        player.clearTimer();
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
            console.log("roomInfo.clubId",roomInfo.clubId)
            if(roomInfo.isDaiKai==0 &&!roomInfo.clubId){
                gameMgr.destroy(roomInfo.roomId);
            }
        }else{
            gameMgr.exitRoom(userId);
            if (player.isBanker) {
                //console.log('********exit更换庄家**********');

            var nextPlayer = roomInfo.changeBanker(player.seatIndex);
            if(nextPlayer){
                // roomInfo.setBanker(nextPlayer.userId);
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

/**
 * 玩家掉线
 * @param socket
 */
exports.disconnect =async function (socket) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = socket.userId;

    //检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    //如果是旧链接断开，则不需要处理。
    if (userMgr.get(userId) != socket) {
        return;
    }

    var roomInfo = gameMgr.getRoomByUserId(userId);
    if (!roomInfo) {
        userMgr.del(userId);
        return;
    }
    var data = {
        userid: userId,
        online: false
    };


    let player = roomInfo.getPlayerById(userId);
    if(player){
        //设置玩家离线
        player.setOnlineState(0);
    }
    //通知房间内其它玩家
    userMgr.broacastInRoom('gb_user_state', data, userId);

    //清除玩家的在线信息
    userMgr.del(userId);
    socket.userId = null;
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
exports.ctrlKanPai =async function(socket){
    var userId = socket.userId;
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
    if(!roomInfo){
        return;
    }

    if(roomInfo.gameState!=roomInfo.GAME_STATE.PLAYING){
        socket.emit('ctrl_kanpai_result',{errcode:500,errmsg:'游戏还未开始，请稍后'});
        return;
    }

    var results = [];
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];
        if (player.state != player.PLAY_STATE.FREE&&player.state != player.PLAY_STATE.FAIL&&player.optState!=player.OPT_STATE.QI_PAI) {
            var data = {};
            data.name = player.name;
            data.pokers = player.hold;
            results.push(data);
        }
    }
    socket.emit('ctrl_kanpai_result',results);
}


/**
 * 发送全局广播
 */
function sendBroadcast(msg){
    http.get(config.HALL_IP, config.HALL_PORT, "/send_broadcast", {msg:msg}, function (ret, data) {
        if (ret) {
            if (data.errcode != 0) {
                console.log('【炸金花】发送全局广播失败:'+data.errmsg);
            }
        }else {
            //console.log('【炸金花】请求发送全局广播接口失败!');
        }
    });
}