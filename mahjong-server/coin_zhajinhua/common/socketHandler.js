/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: {描述一下文件的功能}
 */
var config = require('../../configs').game_server_zhajinhua;
var crypto = require('../../utils/crypto');
var tokenMgr = require("../../common/tokenmgr");
var userMgr = require('./userMgr');
var gameMgr = require('./gameMgr');
var rechargeService = require('../../common/service/rechargeService')
var gameLogic = require('./gameLogic');
var http = require('../../utils/http');
var IPUtil = require('../../utils/IPUtil');
var activityService = require('../../common/service/activityService');
var dateUtil = require('../../utils/dateUtil');
var commonUtil = require('../../utils/commonUtil');
var playerService = require("../../common/service/playerService")
var gameService = require('../../common/service/gameService')
var redis = require("../../utils/redis")

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
        try {
            if(socket.session){
                redis.get("session"+userId,function(err,value){
                    if(err){
            
                        playerService.getUserSessionByUserId(userId,function(err,value){
                            if(err){
                                socket.emit('system_error', { errcode: 500, errmsg: "服务器异常" });
                            }
                            if(socket.session!==value.session){
                                socket.emit('_exit', { errcode: 500, errmsg: "登录异常" });
                                return;
                            }
                        })
                    }
                    if(socket.session!==value){
                        socket.emit('_exit', { errcode: 500, errmsg: "登录异常" });
                        return;
                    }
                })
            }
        } catch (error) {
            console.log(error)
        }
    })

}
//检查传过来的userId是否有误




/**
 * 玩家加入房间
 * @param {*} socket
 * @param {*} data
 */
exports.login = async function (socket, data,config,room_config) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    
    if (socket.userId != null) {
        //已经登陆过的就忽略
        return;
    }
    var userId = data.userId
    var name = data.name;
    var sex = data.sex;
    var ctrl_param = data.ctrl_param;
    var time = data.time;
    var sign = data.sign;
    var headimg = data.headimg;
    var coins;
    let session = data.session;
    if (!userId) {
        socket.emit('system_error', { errcode: 500, errmsg: "用户不存在" });
        return;
    }
    console.log("headimg",headimg)
    //检查参数合法性
    if ( !time) {
        socket.emit('system_error', { errcode: 500, errmsg: "参数错误" });
        return;
    }
    if(session && !socket.session){
        socket.session = session
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
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
    await getCoins();
    //检查参数是否被篡改
    // var md5 = crypto.md5(roomId  + time + config.ROOM_PRI_KEY);
    // if (md5 != sign) {
    //     socket.emit('system_error', { errcode: 500, errmsg: "非法的请求" });
    //     return;
    // }
    
    //选择房间
      var roomId = "";
      let roomList = gameMgr.getRoomList();
      let keys = Object.keys(roomList);
      function sorts(a,b){//对房间按照玩家人数从大到小排序
        return roomList[a].getPlayerCount()<roomList[b].getPlayerCount();
        }
    keys.sort(sorts)
    for (let i of keys){
        if(roomList[i].getPlayerCount() < roomList[i].seatCount){
            roomId=i;
            break;
        }
    }
    if(roomId === ""){
        async function createRoom(){
             return  new Promise(async (resolve,reject)=>{
               room_config.ip = config.SERVER_IP
               room_config.port = config.CLIENT_PORT
               try{
                   let createRes = await gameMgr.createRoom(room_config)
                   roomId = createRes.roomId
                   resolve(createRes)
                   console.log(createRes)
                   console.log("房间id"+roomId)
               }catch(error){
                   console.log(error)
                   console.log(72)
               }
             })
         }
         console.log("shengchengfangjianzhong")
         
        await createRoom()
         
     }
    //console.log('***********logined*************:'+userId);
    console.log("房间id2"+roomId)
    console.log(gameMgr.getRoomById(roomId))
    //安排玩家坐下
    try {
        console.log("安排玩家坐下")
        if(room_config.room_type == "shiwanfang" ){
            coins = parseInt(room_config.coins);
        }
        if(coins < room_config.minScoreLimit){
            socket.emit("login_result",{errcode:1 ,errmsg:"金币不足"});
                return;
        }
        let keys = Object.keys(gameMgr.getRoomList);
      console.log("房间ids"+keys)
        let ret = await gameMgr.enterRoom({
            roomId: roomId,
            headimg:headimg,
            userId: userId,
            name: name,
            // gems: parseInt(gems),
            coins: coins,
            ctrlParam: ctrl_param,
            sex:sex,
            is_robot:0
        });
        console.log("房间结果"+ret)
        let errors = {
            
            [3]: "房间不存在.",
            [4]: "房间已经满了.",
            [5]: "内部错误.",
        }
        if (ret != 0) {

            socket.emit("system_error",{errcode:ret || 1,errmsg:errors[ret] || "未知错误"})
            return;
        }
        
        
    } catch (error) {
        console.log(error);
        socket.emit("system_error",{ errcode: 500, errmsg: "加入房间失败,请稍后重试" });
    }

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
        playerInfo.headimg = player.headimg;
        //说明玩家正在游戏中，需要同步游戏状态
        if (player.state != player.PLAY_STATE.FREE) {
            playerInfo.optState = player.optState;
            playerInfo.timesOfGenZhu = player.timesOfGenZhu;
            //说明当前玩家正在操作
            if (player.optState == player.OPT_STATE.KAN_PAI) {
                //console.log('*****【'+player.userId+'】再次登录*****：'+roomInfo.minGenZhu*2);
                playerInfo.hold = player.hold;
                playerInfo.pokerType = gameLogic.getPokerType(player.hold);
                playerInfo.minGenZhu = roomInfo.minGenZhu*2;
            }else{
                //console.log('*****【'+player.userId+'】*****：'+roomInfo.minGenZhu);
                playerInfo.minGenZhu = roomInfo.minGenZhu;
            }
            playerInfo.allBets = player.allBets;
            if(currentPlayer.userId==player.userId){
                playerInfo.coins = player.coins-player.allBets;
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
    var newSeats=[1];
    ret.data.seats.forEach(i => {
        if (i.userid ===userId){
            newSeats[0] = i
        }else{
            newSeats.push(i);
        }
    });
    // ret.data.seats=newSeats;
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
        // if ( currentPlayer.isBanker == 0) {
            socket.emit('begin_ready', { countdown: roomInfo.READY_COUNTDOWN });
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
}

/**
 * 机器人加入房间
 * @param {*} socket
 * @param {*} data
 */
exports.robot_login =async function (socket, data) {
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
    var headimg = data.headimg;
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
        playerInfo.headimg = player.headimg;
        //说明玩家正在游戏中，需要同步游戏状态
        if (player.state != player.PLAY_STATE.FREE) {
            playerInfo.optState = player.optState;
            playerInfo.timesOfGenZhu = player.timesOfGenZhu;
            //说明当前玩家正在操作
            if (player.optState == player.OPT_STATE.KAN_PAI) {
                //console.log('*****【'+player.userId+'】再次登录*****：'+roomInfo.minGenZhu*2);
                playerInfo.hold = player.hold;
                playerInfo.pokerType = gameLogic.getPokerType(player.hold);
                playerInfo.minGenZhu = roomInfo.minGenZhu*2;
            }else{
                //console.log('*****【'+player.userId+'】*****：'+roomInfo.minGenZhu);
                playerInfo.minGenZhu = roomInfo.minGenZhu;
            }
            playerInfo.allBets = player.allBets;
            if(currentPlayer.userId==player.userId){
                playerInfo.coins = player.coins-player.allBets;
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
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
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
    roomInfo.setTimer(setTimeout(readyTimeOut(roomInfo.roomId),5000))
    //当前房间的玩家
    let playerCount = roomInfo.getPlayerCount();
    //当前房间内已经准备的玩家
    let preparedPlayerCount = roomInfo.getPreparedPlayerCount();

    //先判断是否所有人都已经准备了
    if((playerCount==preparedPlayerCount||(roomInfo.countdown==0 &&roomInfo.numOfGame !==1 ))&&preparedPlayerCount>1){
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
 * 准备超时
 * @param {*} roomId 
 */
function readyTimeOut(roomId){
    return function(){
        var roomInfo = gameMgr.getRoomById(roomId);
        if(!roomInfo){
            return;
        }
        let seats = roomInfo.seats;
        let socket;
        let data={};
        for(let i of seats){
            if(i.state == i.PLAY_STATE.FREE){
                socket = userMgr.get(i.userId);
                data.userId = i.userId;
                exports.exit(socket,data);
            }
        }
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
    if(!roomInfo){
        return;
    }
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
    if (readyPlayerCount > 1) {
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
    var banker = roomInfo.getBanker();
    if(!banker){
        for (let i of roomInfo.seats){
            if(i.state!==i.PLAY_STATE.FREE){
                roomInfo.setBanker(i.userId);
                banker = roomInfo.getBanker();
                break;
            }
        }
    }
    //console.log('****游戏开始，庄家是【'+banker.userId+'】*****');
    //广播通知游戏开始
    userMgr.broacastByRoomId('system_error', { errcode: 500, errmsg: '开始游戏' },roomId);
    userMgr.broacastByRoomId('gb_game_begin', { banker: banker.userId }, roomId);
    //扣除房间抽水
    roomInfo.choushui();
    //设置游戏的状态为开始状态
    roomInfo.setState(roomInfo.GAME_STATE.PLAYING);
    //更新游戏局数
    roomInfo.updateNumOfGame();
    //更新玩家观战局数
    roomInfo.recordWatchTimes();

    //如果当前是游戏的第一局，则设置开房者为庄家
    if (roomInfo.numOfGame == 1) {
        roomInfo.setBanker(roomInfo.createUser);
    }

    var diZhu = roomInfo.diZhu;
    var readyPlayerCount = roomInfo.getPlayerCount();

    //当前参与游戏的玩家ID
    var playerIds = [];

    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];
        if (player.state == player.PLAY_STATE.READY) {
            playerIds.push(player.userId);
            player.bet(diZhu);
            roomInfo.updateTotalBets(diZhu);
            let allBets = player.allBets;
            userMgr.sendMsg(player.userId, 'yazhu_result', { betCount: diZhu, coins: player.coins,allBets:allBets, totalBets: roomInfo.totalBets });
            //广播给其他人
            userMgr.broacastInRoom('gb_player_bet', { userId: player.userId, coins: player.coins, allBets:allBets,betCount: diZhu, totalBets: roomInfo.totalBets }, player.userId, false);
        }
    }

    //设置上家押注量
    //roomInfo.updateMinGenZhu(diZhu);
    //延迟一秒后通知发牌
    setTimeout(function (){
        //获取庄家
        userMgr.broacastByRoomId('gb_begin_fapai', playerIds, roomId);
        //根据房间内已经准备的玩家的数量获取发牌的数量
        var pokers = gameLogic.deal(readyPlayerCount);



        // var ps1 = {num:8,color:1};
        // var ps2 = {num:8,color:3};
        // var ps3 = {num:8,color:2};
        //
        // var testPokers = [];
        // testPokers.push(ps1);
        // testPokers.push(ps2);
        // testPokers.push(ps3);
        //
        // pokers[0] = testPokers;

        //let types = gameLogic.toPokerType(pokers);
        //console.log('********排序前*********');
        //console.log(types);
        //新增发牌控制
        var sorted = gameLogic.sortPoker(pokers);
        //types = gameLogic.toPokerType(sorted);
        //console.log('********排序后*********');
        //console.log(types);

        //console.log('********排序前的*********');
        //console.log(pokers);

        //console.log('********排序后的*******');
        //console.log(sorted);


        //var luckIds = ['600668','611622','611624','611625','600573'];

        var playingPlayerList = [];
        for (let j = 0; j < roomInfo.seats.length; j++) {
            var player = roomInfo.seats[j];
            if (player.state == player.PLAY_STATE.READY) {
                playingPlayerList.push(player);
            }
        }


        //打乱玩家的顺序，防止机器人控制时一直是某个机器人赢
        var playerLength = playingPlayerList.length;
        for(i=0;i<playerLength;i++){
            var rd = commonUtil.randomFrom(0,playingPlayerList.length-1);
            var playerObj = playingPlayerList.splice(rd,1);
            var player = playerObj[0];
            let holdPoker = null;
            //如果房间中配置的有机器人，则走控制逻辑，否则走自由模式
            if(roomInfo.robotCount>0){
               if(player.isRobot==1){
                    console.log('*****当前机器人的胜率：'+roomInfo.robot_param+'*****');
                    holdPoker = gameLogic.getPokerByRadio(sorted,roomInfo.robot_param);
                    //let temp = gameLogic.getPokerType(holdPoker);
                    //console.log('*******发牌给机器人*******:'+temp);
                }else{
                    console.log('*****当前机玩家的胜率：'+roomInfo.player_param+'*****');
                    holdPoker = gameLogic.getPokerByRadio(sorted,roomInfo.player_param);
                    //let temp = gameLogic.getPokerType(holdPoker);
                    //console.log('*******发牌给普通玩家*******:'+temp);
                }
            }else{
                holdPoker = gameLogic.getPokerByRadio(pokers);
            }
            player.mopai(holdPoker);
            player.setState(player.PLAY_STATE.WAITTING);
        }




        /*
        let i = 0;
        for (let j = 0; j < roomInfo.seats.length; j++) {
            var player = roomInfo.seats[j];
            if (player.state == player.PLAY_STATE.READY) {
                let holdPoker = null;
                //如果房间中配置的有机器人，则走控制逻辑，否则走自由模式
                if(roomInfo.robotCount>0){
                    if(luckIds.indexOf(player.userId)>0){
                        holdPoker = gameLogic.getPokerByRadio(sorted,100);
                    }else if(player.isRobot==1){
                        console.log('*****当前机器人的胜率：'+roomInfo.robotWinPR+'*****');
                        holdPoker = gameLogic.getPokerByRadio(sorted,roomInfo.robotWinPR);
                        //let temp = gameLogic.getPokerType(holdPoker);
                        //console.log('*******发牌给机器人*******:'+temp);
                    }else{
                        console.log('*****当前机玩家的胜率：'+roomInfo.playerWinPR+'*****');
                        holdPoker = gameLogic.getPokerByRadio(sorted,roomInfo.playerWinPR);
                        //let temp = gameLogic.getPokerType(holdPoker);
                        //console.log('*******发牌给普通玩家*******:'+temp);
                    }
                }else{
                    holdPoker = gameLogic.getPokerByRadio(pokers);
                }
                player.mopai(holdPoker);
                player.setState(player.PLAY_STATE.WAITTING);
                i++;
            }
        }

        */


        //庄家的下家开始叫注
        //console.log('*********庄家的下家开始叫注**********');

        var nextTurnPlayer = roomInfo.getNextTurnPlayer(banker.seatIndex);
        roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);

        //（逆时针顺序）通知庄家的下家进行下注操作
        //根据玩家的数量计算发牌时间
        var dealTimer = readyPlayerCount * 3 * 0.2 * 1000;
        setTimeout(function () {
            //通知用户操作
            userMgr.sendMsg(nextTurnPlayer.userId, 'your_turn', { minBet: roomInfo.diZhu,countdown: roomInfo.OPT_COUNTDOWN, currentLunShu: roomInfo.currentLunShu });
            nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
            roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);
            //设置玩家操作倒计时
            var timer = optTimeOut(nextTurnPlayer.userId);
            nextTurnPlayer.setTimer(timer, roomInfo.OPT_COUNTDOWN);
            //广播轮到操作的玩家信息
            userMgr.broacastInRoom('gb_turn', { userId: nextTurnPlayer.userId, currentLunShu: roomInfo.currentLunShu, countdown: roomInfo.OPT_COUNTDOWN }, nextTurnPlayer.userId, false);
        }, dealTimer);
    }, 1000);
}



/**
 * 跟注
 * @param {*} socket
 * @param {*} data
 */
exports.genZhu = async function (socket, data) {
    
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var betCount = data.betCount;
    if (!userId || !betCount) {
        socket.emit('system_error', { errcode: 500, errmsg: '参数错误' });
        return;
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);


   // console.log('跟注当前游戏状态:'+roomInfo.gameState+'   玩家【'+player.name+'】当前状态:'+player.state);

    //如果游戏已经结束，或自己已经弃牌，则不可再押注
    if(player.state!=player.PLAY_STATE.PLAYING||roomInfo.gameState!=roomInfo.GAME_STATE.PLAYING){
        socket.emit('system_error', { errcode: 500, errmsg: '操作已超时' });
        return;
    }

    //判断玩家金币
    if (player.coins < betCount) {
        socket.emit('genzhu_result', { errcode: 500, errmsg: '金币不足' });
        return;
    }

    var minGenZhu = player.optState==player.OPT_STATE.KAN_PAI?roomInfo.minGenZhu*2:roomInfo.minGenZhu;
    //console.log('*********【玩家跟注】**********：'+betCount+'   当前最低押注：'+minGenZhu);
    if(betCount<minGenZhu){
        //console.log('========》跟注，押注小于最低押注');
        socket.emit('genzhu_result', { errcode: 500, errmsg: '押注小于最低押注' });
        return;
    }
    player.bet(betCount);
    //更新跟注次数
    player.updateTimesOfGenZhu();
    //清除操作倒计时
    player.clearTimer();
    roomInfo.updateTotalBets(betCount);
    let allBets = player.allBets
    //console.log('*********【玩家跟注】更新下家最低押注**********：'+minGenZhu);

    var roomMinGenZhu = player.optState==player.OPT_STATE.KAN_PAI?betCount/2:betCount;

    roomInfo.updateMinGenZhu(roomMinGenZhu);
    //console.log('*********【玩家跟注】更新后下家最低押注**********：'+roomInfo.minGenZhu);
    socket.emit('genzhu_result', { betCount: betCount,allBets:allBets, coins: player.coins, totalBets: roomInfo.totalBets,timesOfGenZhu:player.timesOfGenZhu });
    player.setState(player.PLAY_STATE.WAITTING);
    //广播给其他玩家
    userMgr.broacastInRoom('gb_player_genzhu', { userId: userId,sex:player.sex, coins: player.coins, betCount: betCount,allBets:allBets, totalBets: roomInfo.totalBets,timesOfGenZhu:player.timesOfGenZhu  }, userId, false);
    //检查是否可以结束游戏，否则通知下家操作
    checkGameState(roomInfo.roomId);
}
/**
 * 加注
 * @param {*} socket
 * @param {*} data
 */
exports.jiaZhu =async function (socket, data) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var betCount = data.betCount;
    if (!userId || !betCount) {
        socket.emit('system_error', { errcode: 500, errmsg: '参数错误' });
        return;
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);

   // console.log('加注当前游戏状态:'+roomInfo.gameState+'   玩家【'+player.name+'】当前状态:'+player.state);

    if(player.state!=player.PLAY_STATE.PLAYING||roomInfo.gameState!=roomInfo.GAME_STATE.PLAYING){
        socket.emit('system_error', { errcode: 500, errmsg: '操作已超时' });
        return;
    }


    if (player.coins < betCount) {
        socket.emit('jiazhu_result', { errcode: 500, errmsg: '金币不足' });
        return;
    }

    var minGenZhu = player.optState==player.OPT_STATE.KAN_PAI?roomInfo.minGenZhu*2:roomInfo.minGenZhu;
    console.log(minGenZhu)
    //console.log('*********【玩家加注】**********：'+betCount+'   当前房间最低押注：'+roomInfo.minGenZhu+'   玩家是否已经看牌了：'+player.optState);
    if(betCount<minGenZhu){
        //console.log('========》加注，押注小于最低押注');
        socket.emit('jiazhu_result', { errcode: 500, errmsg: '押注小于最低押注' });
        return;
    }

    //清除操作倒计时
    player.clearTimer();
    player.bet(betCount);
    player.resetTimesOfGenZhu();
    let allBets = player.allBets
    roomInfo.updateTotalBets(betCount);
    //console.log('*********【玩家加注】更新下家最低押注**********：'+minGenZhu);
    var roomMinGenZhu = player.optState==player.OPT_STATE.KAN_PAI?betCount/2:betCount;
    roomInfo.updateMinGenZhu(roomMinGenZhu);
    //console.log('*********【玩家加注】更新后下家最低押注**********：'+roomInfo.minGenZhu);
    socket.emit('jiazhu_result', { errcode: 0, betCount: betCount, coins: player.coins,allBets:allBets, totalBets: roomInfo.totalBets })
    player.setState(player.PLAY_STATE.WAITTING);
    //广播给其他玩家
    userMgr.broacastInRoom('gb_player_jiazhu', { userId: userId,sex:player.sex, coins: player.coins, betCount: betCount,allBets:allBets, totalBets: roomInfo.totalBets }, userId, false);
    //检查是否可以结束游戏，否则通知下家操作
    checkGameState(roomInfo.roomId);
}
/**
 * 看牌
 * @param {*} socket
 * @param {*} data
 */
exports.kanPai = async function (socket, data) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    if (!userId) {
        socket.emit('system_error', { errcode: 500, errmsg: '参数错误' });
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    

    if(player.state!=player.PLAY_STATE.PLAYING){
        socket.emit('system_error', { errcode: 500, errmsg: '操作已超时' });
        return;
    }

    //获取玩家的手牌
    player.kanPai();
    var hold = player.hold;
    var pokerType = gameLogic.getPokerType(hold);
    let allBets = player.allBets;
    var minBet = player.optState==player.OPT_STATE.KAN_PAI?roomInfo.minGenZhu*2:roomInfo.minGenZhu;
    socket.emit('kanpai_result', { hold: hold,minBet:minBet, pokerType: pokerType });
    //广播给其他玩家
    userMgr.broacastInRoom('gb_player_kanpai', { userId: userId,sex:player.sex }, userId, false);
}
/**
 * 比牌（比牌需要扣双倍的钱）,如果比牌输了，则下家操作，如果胜利，则可以继续比牌或者跟注
 * @param {*} socket
 * @param {*} data
 */
exports.biPai =async function (socket, data) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var comparedUserId = data.comparedUserId;

    if (!userId || !comparedUserId) {
        socket.emit('system_error', { errcode: 500, errmsg: '参数错误' });
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var me = roomInfo.getPlayerById(userId);

    if(me.state!=me.PLAY_STATE.PLAYING){
        socket.emit('system_error', { errcode: 500, errmsg: '操作已超时' });
        return;
    }

    //当前房间的上家押注
    var betCount = roomInfo.minGenZhu;

    //比牌时 如果看牌
    if (me.optState == me.OPT_STATE.KAN_PAI) {
        betCount = betCount*2*2;
    }else{
        betCount = betCount*2;
    }

    //判断金币是否足够
    //判断玩家金币
    if (me.coins < betCount) {
        socket.emit('bipai_result', { errcode: 500, errmsg: '金币不足' });
        return;
    }

    var other = roomInfo.getPlayerById(comparedUserId);
    if(other&&other.state==other.PLAY_STATE.FAIL||other.optState==other.OPT_STATE.QI_PAI){
        socket.emit('bipai_result', { errcode: 500, errmsg: '无效的操作' });
        return;
    }
    me.bet(betCount);
    roomInfo.updateTotalBets(betCount);
    me.updateBiPaiTimes();
    me.addCompareList(other.userId);
    other.addCompareList(me.userId);
    let meAllBets = me.allBets;
    let otherAllBets = other.allBets;

    userMgr.sendMsg(me.userId, 'yazhu_result', { betCount: betCount, coins: me.coins, totalBets: roomInfo.totalBets });
    //广播给其他人
    userMgr.broacastInRoom('gb_player_bet', { userId: me.userId,sex:me.sex,coins: me.coins, betCount: betCount, totalBets: roomInfo.totalBets }, me.userId, false);

    //清除操作倒计时
    me.clearTimer();

    var isWin = gameMgr.bipai(me, other);
    var meIsWin = 0;
    var otherInWin = 0;

    if (isWin == 1) {
        meIsWin = 1;
        other.setWinOrLost(0);
        other.setState('fail');
    } else {
        otherInWin = 1;
        me.setWinOrLost(0);
        me.setState('fail');
    }

    var res = {};
    var meData = { userId: me.userId, name: me.name, headimg: me.headimg,allBets:meAllBets,coins:me.coins, optState: me.optState, isWin: meIsWin,bipaiTimes:me.bipaiTimes };
    var otherData = { userId: other.userId, name: other.name, headimg: other.headimg, coins:other.coins,allBets:otherAllBets,optState: other.optState, isWin: otherInWin };
    meData.pokerType = gameLogic.getPokerType(me.hold);
    otherData.pokerType = gameLogic.getPokerType(other.hold);

    res.me = meData;
    res.other = otherData;

    //console.log('*********比牌结果********');
    //console.log(res);

    //广播比牌结果
    userMgr.broacastByRoomId('gb_bipai_result', res, roomInfo.roomId);
    //比牌后，如果当前持牌的玩家只有1个了，则结束游戏
    var currentPlayerCount = roomInfo.getPlayingUserCount();
    if (currentPlayerCount < 2) {
        if(isWin == 1){
            me.setWinOrLost(1);
        }else{
            other.setWinOrLost(1);
        }
        roomInfo.setState(roomInfo.GAME_STATE.SETTLEMENT);
        setTimeout(function () {
            gameOver(roomInfo.roomId);
        }, 3000);
    } else {
        //如果我赢了，则可以继续操作（继续比牌或跟注），否则通知下家操作
        setTimeout(function(){
            if(isWin == 1){
                var minBet = me.optState==me.OPT_STATE.KAN_PAI?roomInfo.minGenZhu*2:roomInfo.minGenZhu;
                //通知用户操作
                if(me.coins<minBet){
                    userMgr.sendMsg(me.userId, 'your_turn', { errcode:500,errmsg:'金币不足，您已自动弃牌',minBet: minBet,countdown: roomInfo.OPT_COUNTDOWN, currentLunShu: roomInfo.currentLunShu });
                    var data = {};
                    data.userId = me.userId
                    exports.qiPai(userMgr.get(me.userId),JSON.stringify(data));
                }else{
                    userMgr.sendMsg(me.userId, 'your_turn', { minBet: minBet,countdown: roomInfo.OPT_COUNTDOWN, currentLunShu: roomInfo.currentLunShu });
                    me.setState(me.PLAY_STATE.PLAYING);
                    //设置玩家操作倒计时
                    var timer = optTimeOut(me.userId);
                    me.setTimer(timer, roomInfo.OPT_COUNTDOWN);
                    //广播轮到操作的玩家信息
                    userMgr.broacastInRoom('gb_turn', { userId: me.userId, currentLunShu: roomInfo.currentLunShu, countdown: roomInfo.OPT_COUNTDOWN }, me.userId, false);
                }
            }else{
                //检查游戏是否可以结束,否则通知下家操作
                checkGameState(roomInfo.roomId);
            }
        },4000)
    }
}
/**
 * 弃牌
 * @param {*} socket
 * @param {*} data
 */
exports.qiPai =async function (socket, data) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    if (!userId) {
        socket.emit('system_error', { errcode: 500, errmsg: '参数错误' });
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);


    // if(roomInfo.gameState!=roomInfo.GAME_STATE.PLAYING&&me.state!=me.PLAY_STATE.PLAYING){
    //     //socket.emit('system_error', { errcode: 500, errmsg: '操作已超时' });
    //     return;
    // }

    player.qiPai();
    //清除操作倒计时
    player.clearTimer();
    player.setState('fail');
    player.setWinOrLost(0);
    //排除因掉线而导致的棋牌的情况
    if (socket) {
        socket.emit('qipai_result', { errcode: 0, errmsg: 'ok' });
    }
    //广播给其他人
    userMgr.broacastInRoom('gb_player_qipai', { userId: userId,sex:player.sex }, userId, false);

    //检查当前房间内是否只剩下一个人还没弃牌，如果是则直接结束游戏
    let waittingPlayerCount = roomInfo.getPlayingUserCount();

    //console.log('*************玩家【'+userId+'】弃牌******：' + waittingPlayerCount);

    if (waittingPlayerCount <= 1) {
        for (let i = 0; i < roomInfo.seats.length; i++) {
            let player = roomInfo.seats[i];
            if (player.state == player.PLAY_STATE.WAITTING) {
                player.setWinOrLost(1);
            }
        }
        roomInfo.setState(roomInfo.GAME_STATE.SETTLEMENT);
        gameOver(roomInfo.roomId);
    } else {
        checkGameState(roomInfo.roomId);
    }
}

/**
 * 检查游戏是否可以结束，不能则通知下个玩家操作
 */
function checkGameState(roomId) {
    var roomInfo = gameMgr.getRoomById(roomId);
    //如果已经达到封顶轮数，则直接开牌
    if (roomInfo.fengDing == roomInfo.currentLunShu) {
        //console.log('*************比轮达到封顶*************');
        userMgr.broacastByRoomId('system_error', { errcode: 500, errmsg: '已达到最高比牌轮数，系统自动开牌' },roomId);
        //开牌
        gameMgr.kaipai(roomId);
        //广播开牌信息
        var kaiPaiData = [];
        for (let i = 0; i < roomInfo.seats.length; i++) {
            let player = roomInfo.seats[i];
            if (player.optState && player.optState != player.OPT_STATE.QI_PAI) {
                var data = {};
                data.userId = player.userId;
                data.hold = player.hold;
                data.pokerType = gameLogic.getPokerType(player.hold);
                kaiPaiData.push(data);
            }
        }
        userMgr.broacastByRoomId('gb_kaipai', kaiPaiData, roomId);
        //设置房间的状态为结算状态
        roomInfo.setState(roomInfo.GAME_STATE.SETTLEMENT);
        gameOver(roomId);
    } else {//通知下家操作
        var currentSeatIndex = roomInfo.currentTurn;
        var currentPlayer = roomInfo.getPlayerBySeatIndex(currentSeatIndex);
        var nextTurnPlayer = roomInfo.getNextTurnPlayer(currentSeatIndex);
        //console.log('***********通知下家操作***********:'+nextTurnPlayer.userId);
        //console.log('*****获取到下家玩家信息*****');
        //console.log(nextTurnPlayer);

        roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);
        //通知用户操作


        var nextPlayerIsKanPai = false;
        if(nextTurnPlayer.optState==currentPlayer.OPT_STATE.KAN_PAI){
            nextPlayerIsKanPai = true;
        }
        var nextPlayerMinBet = 0;
        //如果上家看牌，轮到的玩家也看牌，则最低跟注与上家一致
        if(nextPlayerIsKanPai){
            nextPlayerMinBet = roomInfo.minGenZhu*2;
        }else{
            nextPlayerMinBet = roomInfo.minGenZhu;
        }
        roomInfo.setCurrentTurn(nextTurnPlayer.seatIndex);
        if(nextTurnPlayer.coins<nextPlayerMinBet){
            userMgr.sendMsg(nextTurnPlayer.userId, 'your_turn', { errcode:500,errmsg:'金币不足，您已自动弃牌',minBet: nextPlayerMinBet,countdown: roomInfo.OPT_COUNTDOWN, currentLunShu: roomInfo.currentLunShu });
            var data = {};
            data.userId = nextTurnPlayer.userId
            exports.qiPai(userMgr.get(nextTurnPlayer.userId),JSON.stringify(data));
        }else{
            userMgr.sendMsg(nextTurnPlayer.userId, 'your_turn', { minBet: nextPlayerMinBet,currentLunShu: roomInfo.currentLunShu, countdown: roomInfo.OPT_COUNTDOWN });
            nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
            //设置下家操作的倒计时
            //设置玩家操作倒计时
            var timer = optTimeOut(nextTurnPlayer.userId);
            nextTurnPlayer.setTimer(timer, roomInfo.OPT_COUNTDOWN);
            nextTurnPlayer.setState(nextTurnPlayer.PLAY_STATE.PLAYING);
            //广播轮到操作的玩家信息
            userMgr.broacastInRoom('gb_turn', { userId: nextTurnPlayer.userId, currentLunShu: roomInfo.currentLunShu, countdown: roomInfo.OPT_COUNTDOWN }, nextTurnPlayer.userId);
        }
    }
}



/**
 * 游戏结束，广播结算结果
 */

function gameOver(roomId) {
    var roomInfo = gameMgr.getRoomById(roomId);
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
            res.hold = player.hold;
            res.pokerType = gameLogic.getPokerType(player.hold);
            res.totalWin = player.totalWin;
            res.coins = parseInt(player.coins)
            res.state = player.state;
            res.optState = player.optState;
            res.compared = player.compareList;
            results.push(res);
            //记录大赢家
            if (player.isWin == 1) {
                console.log("winner.............")
                winner = player;
                //判断牌型，是否满足发送全局广播
                if(res.pokerType==4||res.pokerType==5){
                    let pokerTypeName = "顺金";
                    if(res.pokerType==5){
                        pokerTypeName = '炸弹';
                    }
                    let msg = `恭喜玩家${player.name}在炸金花房间[${roomId}中拿到${pokerTypeName},赢得${player.totalWin}金币!`;
                    sendBroadcast(msg);
                }
            }

            var gor = {};
            gor.userId = player.userId;
            gor.hold = player.hold;
            gor.pokerType = gameLogic.getPokerType(player.hold);
            gor.optState = player.optState;
            gor.isWin = player.isWin;
            gor.totalWin = player.totalWin;
            gor.coins = player.coins;
            gameOverRes.push(gor);
        }

        //如果玩家的金币不足
        if (player.coins < roomInfo.diZhu*2*5) {
            userMgr.sendMsg(player.userId, 'coin_not_enough', { errcode: 500, errmsg: '金币不足,请充值后再继续游戏' });
            //踢除玩家
            //console.log('********玩家金币不足了**********');
            //tichu(player.userId);
        }
    }

    //console.log('*****gb_game_over*******');
    //console.log(gameOverRes);
    userMgr.broacastByRoomId('gb_game_over', gameOverRes, roomId);

    //初始化数据
    gameMgr.resetRoomData(roomId);
    if(winner){
        var winnerId = winner.userId;

    }else{
        for(let i of roomInfo.seats){
            if(i.state !="qipai"){
                var winnerId = i.userId;
            }
        }
    }
    roomInfo.setBanker(winnerId);
    // console.log('*****游戏结束，获取大赢家*******');
    // console.log(winnerId);
    //设置下局的庄家
    roomInfo.setBanker(winnerId);
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
                if (player.watchTimes>=3||!socket||player.isOnline==0) {
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
            roomInfo.updateNumOfGame();
            //设置房间的状态为准备状态
            //启动房间倒计时
            startGameBeginCountDown(roomInfo.roomId);
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
    }, 2000)
    //检测是否可以抽奖
    checkLuckDraw(roomInfo.roomId);
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
        //console.log('*********玩家【' + userId + '】操作超时*********');
        //发送操作超时事件
        userMgr.sendMsg(userId, 'opt_timeout', { userId: userId });
        //玩家直接弃牌
        var userSocket = userMgr.get(userId);
        var data = {};
        data.userId = userId;
        exports.qiPai(userSocket, JSON.stringify(data));
    }
}


///////////////////////////////////////////////////////////
/**
 * 聊天
 * @param {*} socket
 * @param {*} data
 */
exports.chat =async function (socket, data) {
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
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
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
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
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
exports.emoji =async function (socket, data) {
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
    if (!socket.userId || !params.receiver || !params.prop_id || !params.prop_name) {
        userMgr.sendMsg(socket.userId, "notice", '操作失败');
        return;
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
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
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
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
    if(player.state !== player.PLAY_STATE.FREE){
        socket.emit('exit_result', { state:player.state,res:"no" })
        return
    }
    //设置玩家离线
    player.setOnlineState(0);
    if (socket) {
        socket.emit('exit_result', { state: player.state,res:"yes" });
        console.log("exit",player)
        exports.disconnect(socket,1);
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
            var banker = roomInfo.getBanker();
            if(banker){
                userMgr.broacastByRoomId('gb_player_exit', { userId: userId, banker: banker.userId,seats:roomInfo.seats }, roomInfo.roomId);
            }

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
exports.disconnect =async function (socket,isExit) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = socket.userId;

    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
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
        //如果不是点击退出按钮
        if(isExit!==1){
            
            //如果玩家在开始准备阶段退出，判断是不是庄家，否则更换庄家
            if (player.state == player.PLAY_STATE.FREE) {
        //当前房间内的玩家数量
        var currentPlayerCountInRoom = roomInfo.getPlayerCount();
        //console.log('******exit******:' + currentPlayerCountInRoom);
        //只剩下自己一个人，退出时直接解散房间
        if (currentPlayerCountInRoom == 0) {
            //console.log('*******房间没人了直接解散*******');
            roomInfo.clearIntervalTimer();
            //玩家退出
            gameMgr.exitRoom(userId);
            //解散房间
            //如果是代开房间，则不解散房间
            if(roomInfo.isDaiKai==0){
                //console.log('*****删除房间*****');
                gameMgr.destroy(roomInfo.roomId);
            }
        }else{
            gameMgr.exitRoom(userId);
            userMgr.broacastByRoomId('gb_player_exit', {seats:roomInfo.seats,userId:userId}, roomInfo.roomId);
    
            //游戏准备阶段，如果推出后所有玩家都已经准备了，则游戏开始
            if (roomInfo.gameState == roomInfo.GAME_STATE.READY) {
                checkCanBegin(roomInfo.roomId);
            }
        }
    }
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
exports.ctrlKanPai =async function(socket){
    var userId = socket.userId;
    if(!userId){
        return;
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
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