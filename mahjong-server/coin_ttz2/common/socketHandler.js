/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: {描述一下文件的功能}
 */

var crypto = require('../../utils/crypto');
var tokenMgr = require("../../common/tokenmgr");
var userMgr = require('./userMgr');
var gameMgr = require('./gameMgr');
var rechargeService = require('../../common/service/rechargeService')
var gameLogic = require('./gameLogic');
var commonUtil = require('../../utils/commonUtil');
var IPUtil = require("../../utils/IPUtil")
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
        try{
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
                    console.log("session")
                    console.log(socket.session)
                    console.log(value)
                    if(socket.session!==value){
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
//检查传过来的userId是否有误




/**
 * 玩家加入房间
 * @param {*} socket
 * @param {*} data
 */
exports.login =async function(socket, data,config,room_config){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    let agin_flag = false;//判断玩家是否是多次进去房间的标志位
    
    if (socket.userId != null) {
        //已经登陆过的就忽略
        return;
    }

    var userId = data.userId
    var time = data.time;
    var sign = data.sign;
    var name = data.name;
    var sex = data.sex;
    var ctrl_param = data.ctrl_param;
    let coins;
    let headimg = data.headimg;
    console.log("headimg",headimg)
    var is_robot =0;
    let session = data.session;

    //检查参数合法性
    if (!userId|| !time) {
        socket.emit('system_error', { errcode: 500, errmsg: "参数错误" });
        return;
    }
    if(session && !socket.session){
        socket.session = session;
    }
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid);
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    //获得数据库金币
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
    await getCoins()
    //检查参数是否被篡改
    // var md5 = crypto.md5(userId + time + config.ROOM_PRI_KEY);
    // if (md5 != sign) {
    //     socket.emit('system_error', { errcode: 500, errmsg: "签名校验错误" });
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
      console.log("房间ids0"+keys)
      
      for (let i of keys){
          if(roomList[i].getPlayerCount() < roomList[i].seatCount){
              roomId=i;
              break;
          }
      }
      let break_flag = false;
      //确定玩家掉线重进到原先的房间
      for(let i in roomList){
          if(break_flag){break}
        for(let j of roomList[i].seats){
            if (userId===j.userId){
                roomId = i
                agin_flag = true;
                break;
            }
        }
      }
      if(roomId === ""){
         async function createRoom(){
              return  new Promise(async (resolve,reject)=>{
                room_config.ip = config.SERVER_IP
                room_config.port = config.CLIENT_PORT
                try{
                    // room_config.creator = userId;
                    let createRes = await gameMgr.createRoom(room_config)
                    roomId = createRes.roomId
                    resolve(createRes)
                    
                }catch(error){
                    console.log(error)
                    console.log(72)
                }
              })
          }
          console.log("shengchengfangjianzhong")
          
         await createRoom()
          
      }
      console.log("房间id2"+roomId)
      //安排玩家坐下
    try {
        console.log("安排玩家坐下")
        if(room_config.room_type == "shiwanfang" ){
            coins = parseInt(room_config.coins);
        }
        let keys = Object.keys(gameMgr.getRoomList());
        console.log("房间ids1"+keys)
        let ret = await gameMgr.enterRoom({
            roomId: roomId,

            userId: userId,
            name: name,
            // gems: parseInt(gems),
            headimg:headimg,
            coins: coins,
            ctrlParam: ctrl_param,
            sex:sex,
            is_robot:is_robot
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
    console.log("roomid${roomId}",roomId)
    //获取玩家的坐位索引值
    var currentPlayer = roomInfo.getPlayerById(userId);
    if(!currentPlayer){
        socket.emit('system_error', { errcode: 500, errmsg: "加入房间失败,请稍后重试" });
        return;
    }
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
        playerInfo.state =  player.state;
        playerInfo.seatIndex =  player.seatIndex;
        playerInfo.coins =  player.coins;
        playerInfo.isBanker = player.isBanker;
        playerInfo.headimg = player.headimg;
        //说明玩家正在游戏中，需要同步游戏状态
        if(player.state!=player.PLAY_STATE.FREE){
            playerInfo.optState = player.optState;
            playerInfo.hold = player.hold;
            //说明已经看过牌了
            if(player.optState==3){
                playerInfo.pokerType = gameLogic.getMJType(player.hold);;
            }
            playerInfo.betBeiShu = player.betBeiShu;
        }
        seats.push(playerInfo);
        if (userId == player.userId) {
            userData = seats[i];
        }
    }
    var countdown = roomInfo.READY_COUNTDOWN;
    //判断游戏的状态
    if(roomInfo.gameState!=roomInfo.GAME_STATE.READY){
        countdown = roomInfo.OPT_COUNTDOWN;
    }

    var banker = roomInfo.getBanker();
    var bankerId = null;
    if(banker){
        bankerId = banker.userId;
    }

    //通知前端
    var ret = {
        errcode: 0,
        errmsg: "ok",
        data: {
            roomId: roomInfo.roomId,
            //已经进行的局数
            numOfGame: roomInfo.numOfGame,
            maxGames:roomInfo.maxGames,
            //最大容纳人数
            seatCount:roomInfo.seatCount,
            //游戏状态
            gameState : roomInfo.gameState,

            qiangZhuangBeiShu:roomInfo.qiangZhuangBeiShu,

            diZhu:roomInfo.diZhu,
            countdown:countdown,
            banker:bankerId,
            seats: seats
        }
    };
    //更改seats数组内的数据顺序，将进入这个函数的用户永远放在数组的第一个位置
    var newSeats=[1];
    ret.data.seats.forEach(i => {
        if (i.userid ===userId){
            newSeats[0] = i
        }else{
            newSeats.push(i);
        }
    });
    
    ret.data.seats=newSeats;
    console.log("有人加入。。。。。。。。"+newSeats.length)
    // console.log(ret.data.seats)
    socket.emit('login_result', ret);
    //console.log('********player_join_room********');
    //通知其它客户端
    if(!agin_flag){//如果玩家多次进入则不通知其他玩家
        userMgr.broacastInRoom('player_join_room', userData, userId,false);
    }
    

    //检查用户是否可以准备
    if (roomInfo.gameState == roomInfo.GAME_STATE.READY && currentPlayer.state == currentPlayer.PLAY_STATE.FREE) {
        //如果不是房间创建者或者不是庄家
        if (userId != roomInfo.createUser) {
            socket.emit('begin_ready', { countdown: roomInfo.READY_COUNTDOWN });
            //console.log('*******设置玩家【'+userId+'】准备倒计时*******');
            //设置等待倒计时
            //var timer = tichu(userId);
            //currentPlayer.setTimer(timer, roomInfo.READY_COUNTDOWN);
        }else{//庄家和创建者自动准备
            //如果是第一局开始，则庄家默认准备
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
 * 机器人加入房间
 * @param {*} socket
 * @param {*} data
 */
exports.robot_login =async function(socket, data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    
    console.log("机器人开始加入。。。。")
    if (socket.userId != null) {
        //已经登陆过的就忽略
        return;
    }

    var userId = data.userId
    var time = data.time;
    var is_robot =data.is_robot;
    var roomId = data.roomId;
    var headimg = data.headimg;
    if(!is_robot){is_robot=1}
    console.log("机器人信息")
    console.log(userId)
    

      //安排玩家坐下
    // try {
    //     console.log("安排玩家坐下")
    //     let keys = Object.keys(gameMgr.getRoomList);
    //     console.log("房间ids"+keys)
    //     let ret = await gameMgr.enterRoom({
    //         roomId: roomId,

    //         userId: userId,
    //         name: name,
    //         // gems: parseInt(gems),
    //         coins: parseInt(room_config.coins),
    //         ctrlParam: ctrl_param,
    //         sex:sex,
    //         is_robot:is_robot
    //     });
    //     console.log("房间结果"+ret)
    //     let errors = {
            
    //         [3]: "房间不存在.",
    //         [4]: "房间已经满了.",
    //         [5]: "内部错误.",
    //     }
    //     if (ret != 0) {

    //         socket.emit("system_error",{errcode:ret || 1,errmsg:errors[ret] || "未知错误"})
    //         return;
    //     }
        
        
    // } catch (error) {
    //     console.log(error);
    //     socket.emit("system_error",{ errcode: 500, errmsg: "加入房间失败,请稍后重试" });
    // }
    //返回房间信息
    var roomInfo = gameMgr.getRoomById(roomId);
    console.log(roomInfo.seats)
    console.log("roomid${roomId}",roomId)
    //获取玩家的坐位索引值
    var currentPlayer = roomInfo.getPlayerById(userId);
    if(!currentPlayer){
        socket.emit('system_error', { errcode: 500, errmsg: "加入房间失败,请稍后重试" });
        console.log("机器人获取索引值失败")
        return;
    }
    userMgr.bind(userId, socket);
    socket.userId = userId;
    console.log("机器人socket.userId"+socket.userId)

    var ip = "";
    currentPlayer.setOnlineState(1);
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
        playerInfo.state =  player.state;
        playerInfo.seatIndex =  player.seatIndex;
        playerInfo.coins =  player.coins;
        playerInfo.isBanker = player.isBanker;
        playerInfo.headimg = player.headimg;
        //说明玩家正在游戏中，需要同步游戏状态
        if(player.state!=player.PLAY_STATE.FREE){
            playerInfo.optState = player.optState;
            playerInfo.hold = player.hold;
            //说明已经看过牌了
            if(player.optState==3){
                playerInfo.hold = gameLogic.group(player.hold);
                playerInfo.pokerType = gameLogic.getPokerType(player.hold);;
            }
            playerInfo.betBeiShu = player.betBeiShu;
        }
        seats.push(playerInfo);
        if (userId == player.userId) {
            userData = seats[i];
        }
    }

    var countdown = roomInfo.READY_COUNTDOWN;
    //判断游戏的状态
    if(roomInfo.gameState!=roomInfo.GAME_STATE.READY){
        countdown = roomInfo.OPT_COUNTDOWN;
    }

    var banker = roomInfo.getBanker();
    var bankerId = null;
    if(banker){
        bankerId = banker.userId;
    }

    //通知前端
    var ret = {
        errcode: 0,
        errmsg: "ok",
        data: {
            roomId: roomInfo.roomId,
            //已经进行的局数
            numOfGame: roomInfo.numOfGame,
            maxGames:roomInfo.maxGames,
            //最大容纳人数
            seatCount:roomInfo.seatCount,
            //游戏状态
            gameState : roomInfo.gameState,

            qiangZhuangBeiShu:roomInfo.qiangZhuangBeiShu,

            diZhu:roomInfo.diZhu,
            countdown:countdown,
            banker:bankerId,
            seats: seats
        }
    };
    console.log("j机器人准备发送消息。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。")
    socket.emit('login_result', ret);
    //console.log('********player_join_room********');
    //通知其它客户端
    userMgr.broacastInRoom('player_join_room', userData, userId,false);

    //检查用户是否可以准备
    if (roomInfo.gameState == roomInfo.GAME_STATE.READY && currentPlayer.state == currentPlayer.PLAY_STATE.FREE) {
        //如果不是房间创建者或者不是庄家
        if (userId != roomInfo.createUser) {
            socket.emit('begin_ready', { countdown: roomInfo.READY_COUNTDOWN });
            //console.log('*******设置玩家【'+userId+'】准备倒计时*******');
            //设置等待倒计时
            // var timer = tichu(userId);
            // currentPlayer.setTimer(timer, roomInfo.READY_COUNTDOWN);
        }else{//庄家和创建者自动准备
            //如果是第一局开始，则庄家默认准备
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
exports.ready =async function(socket, data) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    //console.log('************玩家准备*********'+userId);
    if(!userId){
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
    var roomInfo = gameMgr.getRoomByUserId(userId);
    
    if(roomInfo.gameState!=roomInfo.GAME_STATE.READY){
        socket.emit('system_error', { errcode: 500, errmsg: "游戏进行中,请等待下一局" });
        return;
    }
    var player = roomInfo.getPlayerById(userId);
    //判断玩家金币是否足够
    if(player.coins<roomInfo.minScoreLimit){
        socket.emit('system_error', { errcode: 500, errmsg: "金币不足" });
        return;
    }
    player.setState(player.PLAY_STATE.READY);
    //取消等待计时器
    if(player.timer){
        player.clearTimer();
    }
    socket.emit('ready_result', { errcode: 0, errmsg: "ok" });
    //通知房间内的其他玩家
    userMgr.broacastInRoom('gb_player_has_ready', {userId:userId}, userId);
    //当前房间的玩家
    let playerCount = roomInfo.getPlayerCount();
    //当前房间内已经准备的玩家
    let preparedPlayerCount = roomInfo.getPreparedPlayerCount();
    let rto = readyTimeOut(roomInfo.roomId)
    roomInfo.setTimer(rto,5000);
    //console.log('*******当前房间玩家数量*********：'+playerCount);
    //console.log('*******当前房间准备后的玩家数量*********：'+preparedPlayerCount);
    //全部准备了，可以直接开始游戏

    //先判断是否所有人都已经准备了
    if((playerCount==preparedPlayerCount ||(roomInfo.countdown==0 &&roomInfo.numOfGame !==0 ))&&preparedPlayerCount>1){
        //如果倒计时还没结束，但玩家都准备了
        if(roomInfo.countdown!=0){
            roomInfo.clearIntervalTimer();
            if(roomInfo.numOfGame !==0){
                roomInfo.countdown = 0;
            }
            
        }
        //直接开始游戏
        exports.gameBegin(roomInfo.roomId);
        console.log("游戏将要开始前房内玩家数"+playerCount)
        console.log("游戏将要开始前房内已准备的玩家数"+ preparedPlayerCount)
    }
    //检测是否可以开始游戏
    //checkCanBegin(roomInfo.roomId);
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
function startGameBeginCountDown(roomInfo){
    // var roomInfo = gameMgr.getRoomById(roomId);
    roomInfo.countdown =roomInfo.READY_COUNTDOWN/1000;
    console.log("打印启动游戏倒计时内的roomInfo.READY_COUNTDOWN"+roomInfo.READY_COUNTDOWN);
    // console.log(roomInfo)
    var readyCountDown = setInterval(function(){
        roomInfo.countdown -= 1;
        //console.log('******此时房间的倒计时*******：'+roomInfo.countdown);
        if(roomInfo.countdown === 0){
            clearInterval(readyCountDown);
            checkCanBegin(roomInfo);
        }
        //do whatever here..
    }, 1000);
    roomInfo.setIntervalTimer(readyCountDown);
}



/**
 * 检测是否可以开始游戏
 * @param roomId
 */
function checkCanBegin(roomInfo) {
    //如果房间内玩家都已经准备，就可以开始游戏了
    // let roomInfo = gameMgr.getRoomById(roomId);
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
exports.gameBegin = function(roomId){
    var roomInfo = gameMgr.getRoomById(roomId);

    if(roomInfo.interValTimer){
        roomInfo.clearIntervalTimer();
    }
    //设置游戏的状态为抢庄中
    roomInfo.setState(roomInfo.GAME_STATE.QIANG_ZHUANG);
    //更新游戏局数
    roomInfo.updateNumOfGame();
    //扣除房间抽水
    roomInfo.choushui();

    var readyPlayerCount = roomInfo.getPreparedPlayerCount();
    console.log('********当前已准备的玩家数量*********:'+readyPlayerCount);
    let shaizi = gameLogic.shaizi();
    let banker = gameMgr.getBanker(roomId)
    
    let bankerId = banker.userId
    //根据玩家数量，获取牌
    var mjs = gameLogic.deal(readyPlayerCount,roomInfo);
    let types = gameLogic.toMJType(mjs);
    console.log('********排序前*********');
    console.log(types);
    //新增发牌控制
    var sorted = gameLogic.sortMJ(mjs);
    types = gameLogic.toMJType(sorted);
    console.log('********排序后*********');
    console.log(types);
    var playerMJs = [];
    let i = 0;
    let fapaiShunxu = gameLogic.getFapaiShuunxu(roomInfo,shaizi,bankerId);
    //广播发牌顺序和骰子
    userMgr.broacastByRoomId("gb_fpsx",{shaizi:shaizi,fpsx:fapaiShunxu},roomId)
    for(let j=0; j<roomInfo.seats.length;j++){
        var playerDate = {};
        var player = roomInfo.seats[j];
        if(player.state==player.PLAY_STATE.READY){
            playerDate.userId = player.userId;
            //是机器人
            let holdPoker = null;
            if(player.isRobot==1){
                holdPoker = gameLogic.getMJByRadio(sorted,roomInfo.robot_param);
                let temp = gameLogic.getMJType(holdPoker);
                console.log('*******发牌给机器人*******:'+roomInfo.robot_param);
            }else{
                holdPoker = gameLogic.getMJByRadio(sorted,roomInfo.player_param);
                let temp = gameLogic.getMJType(holdPoker);
                console.log('*******发牌给普通玩家*******:'+roomInfo.player_param);
            }
            playerDate.hold = holdPoker;
            player.mopai(holdPoker);
            player.setState(player.PLAY_STATE.PLAYING);
            playerMJs.push(playerDate);
            i++;
        }
    }

    userMgr.broacastByRoomId('start_game', { errcode: 0, errmsg: '开始游戏' },roomId);
    console.log('**********系统发牌********');
    console.log(JSON.stringify(playerMJs));
    console.log(playerMJs)
    userMgr.broacastByRoomId('gb_begin_fapai',playerMJs,roomId);
    //延迟一秒后通知抢庄,切设置抢庄倒计时
    //根据玩家的数量，计算发牌时间
    var dealTime = readyPlayerCount*0.5+1;
    setTimeout(function() {
        //通知开始抢庄no
        userMgr.broacastByRoomId('gb_begin_qiangzhuang',{countdown:roomInfo.OPT_COUNTDOWN,qiangZhuangBeiShu:roomInfo.qiangZhuangBeiShu},roomId);
        //设置抢庄倒计时
        var timeoutFuc = qiangZhuangTimeOut(roomId);
        roomInfo.setTimer(timeoutFuc,10*1000)
    }, dealTime*1000);
}

/**
 * 抢庄超时
 * @param userId
 * @returns {Function}
 */
function qiangZhuangTimeOut(roomId){
    //console.log('********设置了抢庄超时定时器*********');
    return function(){
        //console.log('********抢庄超时*********');
        var roomInfo = gameMgr.getRoomById(roomId);
        for(var i=0;i<roomInfo.seats.length;i++){
            var player = roomInfo.seats[i];
            if(player&&player.state!=player.PLAY_STATE.FREE){
                //玩家未操作，默认不抢
                if(player.betBeiShu==-1){
                    var data = {};
                    data.userId = player.userId;
                    data.beishu = 0;
                    var socket = userMgr.get(player.userId);
                    exports.qiangZhuang(socket,JSON.stringify(data));
                }
            }
        }
    }
}


/**
 * 抢庄，谁倍数大谁当庄 ，倍数一样，随机坐庄
 */
exports.qiangZhuang =async function(socket,data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    console.log("抢庄开始123")
    console.log()
    console.log(data)
    var userId = data.userId;
    var beiShu = data.beishu;
    if(!userId&&!beiShu){
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
    var roomInfo = gameMgr.getRoomByUserId(userId);
    //如果游戏已不是抢庄阶段
    if(roomInfo.gameState!=roomInfo.GAME_STATE.QIANG_ZHUANG){
        if(socket){
            socket.emit('system_error', { errcode: 500, errmsg: "抢庄已结束" });
        }
        return;
    }
    if(socket){
        socket.emit('qiangzhuang_result', { beishu: beiShu});
    }
    roomInfo.qiangZhuang(userId,beiShu); 
    userMgr.broacastInRoom('gb_qiangzhuang_result',{userId:userId,beishu:beiShu},userId,false);
    //检测是否都已经抢庄了
    var isAllQiangZhuang = roomInfo.isAllOpt(roomInfo.GAME_STATE.QIANG_ZHUANG);

    //console.log('******是否都抢庄了******：'+isAllQiangZhuang);

    if(isAllQiangZhuang){
        setTimeout(function(){
            showQiangZhuangResult(roomInfo.roomId);
        },500);
    }
}

/**
 * 公布抢庄结果
 */
function showQiangZhuangResult(roomId){
    var roomInfo = gameMgr.getRoomById(roomId);
    //设置游戏状态为押注
    roomInfo.setState(roomInfo.GAME_STATE.YA_ZHU);

    var qiangZhuangList = roomInfo.qiangZhuangList;
    //根据抢庄倍数进行从大到小排序，倍数一样按照抢庄的时间进行排序
    var sortList = qiangZhuangList.sort(function(a,b){
        if (a.beishu>b.beishu) {
            return -1;
        }else if(a.beishu<b.beishu){
            return 1
        }else{//相等时判断抢庄的时间
            if(a.timestamp>b.timestamp){
                return -1;
            }else if(a.timestamp<b.timestamp){
                return 1;
            }else{
                return 0;
            }
        }
    })
    var sameBeiShuList = gameMgr.getSameBeiShu(sortList);
    // console.log("sortList")
    // console.log(sortList)
    // console.log("sameBeiShuList")
    // console.log(sameBeiShuList)
    // console.log("qiangZhuangList")
    // console.log(qiangZhuangList)
    
    var tempBanker = sortList[0];
    console.log("tempBanker")
    console.log(tempBanker)
    if(sameBeiShuList.length>0){
        //获取随机庄家
        var random = commonUtil.randomFrom(0,sameBeiShuList.length-1);
        tempBanker = sameBeiShuList[random];
    }
    //把上次庄家去除
    let oldBanker = roomInfo.getBanker();
    oldBanker.setBanker(0);
    roomInfo.setBanker(tempBanker.userId);
    var banker = roomInfo.getBanker();
    console.log("banker")
    console.log(banker)
    //初始化闲家的押注倍数
    for(var i=0;i<roomInfo.seats.length;i++){
        var player = roomInfo.seats[i];
        if(player&&player.isBanker==0){
            player.setBetBeiShu(-1);
        }
    }
    let ret = {banker:banker.userId,"beishu":banker.betBeiShu,qiangZhuangList:qiangZhuangList};
    console.log(ret)
    userMgr.broacastByRoomId('gb_qiangzhuang_allresult',ret,roomId);

    //console.log('*********公布抢庄结果***********：'+banker.betBeiShu);
    // console.log({banker:banker.userId,qiangZhuangList:sameBeiShuList});
    //延时通知开始押注
    //设置房间状态为闲家押注状态
    //设置押注倒计时
    var timeoutFunc = yaZhuTimeOut(roomId);
    roomInfo.setTimer(timeoutFunc,roomInfo.OPT_COUNTDOWN-2*1000);
    setTimeout(function(){
        //广播开始押注，并返回抢庄的结果
        userMgr.broacastByRoomId('gb_begin_yazhu',{countdown:roomInfo.OPT_COUNTDOWN},roomId);
    },2*1000);
}

/**
 * 押注超时
 * @param roomId
 * @returns {Function}
 */
function yaZhuTimeOut(roomId){

    //console.log('******设置押注超时定时器*****');

    return function(){

        //console.log('********闲家押注超时*********');

        var roomInfo = gameMgr.getRoomById(roomId);
        for(var i=0;i<roomInfo.seats.length;i++){
            var player = roomInfo.seats[i];
            if(player&&player.state!=player.PLAY_STATE.FREE){
                //玩家未操作，默认不抢
                if(player.betBeiShu==-1){
                    var data = {};
                    data.userId = player.userId;
                    data.beishu = 1;
                    var socket = userMgr.get(player.userId);
                    exports.yaZhu(socket,JSON.stringify(data));
                }
            }
        }
    }
}

/**
 * 押注
 */
exports.yaZhu =async function(socket,data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var beiShu = data.beishu;
    if(!userId&&!beiShu){
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
    var roomInfo = gameMgr.getRoomByUserId(userId);
    var player = roomInfo.getPlayerById(userId);
    //检测分数是否足够
    if(player.coins<roomInfo.diZhu*beiShu){
        socket.emit('yazhu_result', { errcode: 500, errmsg: '金币不足' });
        return;
    }

    if(roomInfo.gameState!=roomInfo.GAME_STATE.YA_ZHU){
        if(socket){
            socket.emit('system_error', { errcode: 500, errmsg: "押注已结束" });
        }
        return;
    }

    if(socket){
        socket.emit('yazhu_result', { beishu: beiShu});
    }

    //更新操作状态
    player.setOptState(2);
    player.setBetBeiShu(beiShu);

    userMgr.broacastInRoom('gb_yazhu',{userId:userId,beishu:beiShu},userId,false);
    //检测闲家是否都已经押注了
    var isAllYaZhu = roomInfo.isAllOpt(roomInfo.GAME_STATE.YA_ZHU);

    //console.log('**********是否都押注了**********：'+isAllYaZhu);

    if(isAllYaZhu){
        //通知亮牌
        userMgr.broacastByRoomId('gb_begin_liangpai',{countdown:roomInfo.OPT_COUNTDOWN},roomInfo.roomId);
        //设置房间状态为闲家结算状态

        //console.log('*****取消押注超时计时器******');

        var timeoutFunc = liangPaiTimeOut(roomInfo.roomId);
        roomInfo.setTimer(timeoutFunc,roomInfo.OPT_COUNTDOWN);
        roomInfo.setState(roomInfo.GAME_STATE.SETTLEMENT);
    }
}

/**
 * 亮牌超时
 */
function liangPaiTimeOut(roomId){

    //console.log('******设置亮牌超时定时器*****');

    return function () {
        console.log('********亮牌超时*********');
        var roomInfo = gameMgr.getRoomById(roomId);
        for(var i=0;i<roomInfo.seats.length;i++){
            var player = roomInfo.seats[i];
            if(player&&player.state==player.PLAY_STATE.PLAYING){
                //如果玩家未亮牌
                if(player.optState!=3){
                    var data = {};
                    data.userId = player.userId;
                    var socket = userMgr.get(data.userId);
                    exports.liangPai(socket,JSON.stringify(data));
                }
            }
        }
    }
}

/**
 * 亮牌
 */
exports.liangPai =async function(socket,data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    if(!userId){
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
    var roomInfo = gameMgr.getRoomByUserId(userId);

    // if(roomInfo.gameState!=roomInfo.GAME_STATE.SETTLEMENT){
    //     if(socket){
    //         socket.emit('system_error', { errcode: 500, errmsg: "亮牌已结束" });
    //     }
    //     return;
    // }

    var player = roomInfo.getPlayerById(userId);
    var pokers = player.hold;
    player.setOptState(3);
    var type = gameLogic.getMJType(pokers);
    //把有牛的牌放一块
    // var grouped = gameLogic.group(pokers);
    if(socket){
        socket.emit('liangpai_result',{hold:pokers,MJType:type});
    }
    userMgr.broacastInRoom('gb_liangpai',{userId:userId,hold:pokers,MJType:type},userId,true);
    //console.log('*********玩家['+userId+']亮牌**************');
    //console.log(pokers);
    //console.log(grouped);
    //检测闲家是否都已经亮牌了
    var isAllLiangPai = roomInfo.isAllOpt(roomInfo.GAME_STATE.SETTLEMENT);

    console.log('*******isAllLiangPai******:'+isAllLiangPai);

    if(isAllLiangPai) {
        userMgr.broacastByRoomId('gb_begin_settlement',{},roomInfo.roomId);
        roomInfo.clearTimer();
        //结算
        setTimeout(function(){
            settlement(roomInfo.roomId);
        },2000);
    }
}

/**
 * 结算
 */
function settlement(roomId){
    var roomInfo = gameMgr.getRoomById(roomId);
    //计算输赢
    try{
        gameMgr.settlement(roomId);
    }catch(e){
        console.log(e);
    }
    
    //广播结算结果
    var results = [];
    for(var i=0;i<roomInfo.seats.length;i++){
        var player = roomInfo.seats[i];

        //更新玩家的游戏局数
        player.updateNumOfGame();

        if(player.state!=player.PLAY_STATE.FREE){
            var res = {};
            res.userId = player.userId;
            res.name = player.name;
            res.headimg = player.headimg;

            var pokers = player.hold;
            var type = gameLogic.getMJType(pokers);
            //把有牛的牌放一块
            // var grouped = gameLogic.group(pokers);
            res.hold = pokers;
            res.pokerType = type;
            res.totalWin = player.totalWin;
            res.benwinbet = player.benwinbet;
            res.betBeiShu = player.betBeiShu==0?1:player.betBeiShu;
            player.settlement(player.totalWin,roomInfo);
            res.coins = parseInt(player.coins);
            results.push(res);
        }
    }
    //console.log('**********结算结果**********');
    //console.log(results);
    userMgr.broacastByRoomId('gb_settlement_result',results,roomId);
    gameOver(roomId);
}



/**
 * 游戏结束，广播结算结果
 */
function gameOver(roomId){
    var roomInfo = gameMgr.getRoomById(roomId);
    //初始化数据
    console.log("初始化数据")
    gameMgr.resetRoomData(roomId);
    //清除掉离线的玩家
    //gameMgr.clearRoom(roomId);

    //广播通知玩家开始准备
    setTimeout(function () {

        //清除掉离线的玩家

        //console.log('*******开始清理玩家********');

        let seatLength = roomInfo.seats.length;
        let tempSeats = roomInfo.seats.concat();
        for (var i = 0; i < seatLength; i++) {
            var player = tempSeats[i];
            var socket = userMgr.get(player.userId);
            if (!socket||player.isOnline==0) {
                //console.log('*******清理玩家【'+player.userId+'】********');
                (function(){
                    let dataRes = {};
                    dataRes.userId = player.userId;
                    exports.exit(socket,JSON.stringify(dataRes));
                })()
            }
        }
        //更新游戏局数
        roomInfo.updateNumOfGame();
        var data = {};
        data.numOfGame = roomInfo.numOfGame;
        data.countdown = roomInfo.READY_COUNTDOWN;
        userMgr.broacastByRoomId('gb_begin_ready',data,roomId);
        //设置房间状态为等待状态
        startGameBeginCountDown(roomInfo);
        roomInfo.setState(roomInfo.GAME_STATE.READY);
        //设置玩家准备的倒计时（判断玩家金币是否不足）
        for(var i=0;i<roomInfo.seats.length;i++){
            let player = roomInfo.seats[i];
            //最低携带金币=最大牌型赔率*最高押分倍数*最大抢庄倍数*底注
            if(player.coins<roomInfo.minScoreLimit){
                userMgr.sendMsg(player.userId,'coin_not_enough',{errcode:500,errmsg:'金币不足'});
                continue;
            }
            if(player.state!=player.PLAY_STATE.READY){
                userMgr.sendMsg(player.userId,'begin_ready',{numOfGame:roomInfo.numOfGame,countdown:roomInfo.READY_COUNTDOWN});
                //设置等待倒计时
                //var timer = tichu(player.userId);
                //player.setTimer(timer,roomInfo.READY_COUNTDOWN);
            }
        }
    },4000)
}

/**
 * 踢掉玩家
 */
function tichu(userId){
    return function(){
        userMgr.sendMsg(userId,'tichu',{userId:userId});
        var userSocket = userMgr.get(userId);
        var data = {};
        data.userId = userId;
        exports.exit(userSocket,JSON.stringify(data));
    }
}

///////////////////////////////////////////////////////////
/**
 * 聊天
 * @param {*} socket
 * @param {*} data
 */
exports.chat = function(socket, data) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var chatContent = data;
    userMgr.broacastInRoom('chat_push', { sender: socket.userId, content: chatContent }, socket.userId, true);
},
/**
 * 快速聊天
 * @param {*} socket
 * @param {*} data
 */
exports.quickChat =async function(socket, data) {
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

},
/**
 * 语音聊天
 * @param {*} socket
 * @param {*} data
 */
exports.voiceMsg =async function(socket, data) {
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
},
/**
 * 表情
 * @param {*} socket
 * @param {*} data
 */
exports.emoji = function(socket, data) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var phizId = data;
    userMgr.broacastInRoom('emoji_push', { sender: socket.userId, content: phizId }, socket.userId, true);
},
/**
 * 赠送道具
 * @param {*} socket
 * @param {*} data
 */
exports.grantProp = function(socket, data) {
    if(typeof data ==="string"){
        params = JSON.parse(data);
    }
    if (!socket.userId || !params.receiver || !params.prop_id || !params.prop_name) {
        userMgr.sendMsg(socket.userId, "notice", '操作失败');
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
                if(player.coins<res.price){
                    socket.emit('system_error',{errcode:500,errmsg:'金币不足，无法使用该道具'})
                }else{
                    let propPrice = res.price;
                    rechargeService.changeUserCoins(socket.userId, -res.price, (err, res) => {
                        if (err || !res) {
                            userMgr.sendMsg(socket.userId, "notice", '操作失败');
                            return
                        }
                        var afterCoins = parseInt(player.coins)-parseInt(propPrice);
                        player.updateCoins(afterCoins);
                        ret.coins = player.coins;
                        userMgr.broacastInRoom("grant_prop_push", ret, socket.userId, true);
                    })
                }
            }
        }
    })
},
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
        if(player.state !== player.PLAY_STATE.FREE && player.state !==player.PLAY_STATE.READY ){
            socket.emit('exit_result', { state: player.state,res:"no" })
            return
        }
        //设置玩家离线
        player.setOnlineState(0);
        if (socket) {
            socket.emit('exit_result', { state: player.state,res:"yes" });
            exports.disconnect(socket,1);
        }
        //如果玩家在开始准备阶段退出，判断是不是庄家，否则更换庄家
        if (player.state == player.PLAY_STATE.FREE || player.state == player.PLAY_STATE.READY) {

            //console.log('**********玩家直接离开************');

            //如果玩家已经准备了，则清除计时器
            if(player.state == player.PLAY_STATE.READY){
                player.clearTimer();
            }

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
                //更新庄家
                if(player.isBanker = 1){
                    let nextBanker = roomInfo.changeBanker(player.seatIndex);
                    roomInfo.setBanker(nextBanker.userId);
                }
                gameMgr.exitRoom(userId);
                userMgr.broacastByRoomId('gb_player_exit', { userId: userId}, roomInfo.roomId);
                //游戏准备阶段，如果推出后所有玩家都已经准备了，则游戏开始
                if (roomInfo.gameState == roomInfo.GAME_STATE.READY) {
                    checkCanBegin(roomInfo);
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

    //通知房间内其它玩家
    userMgr.broacastInRoom('gb_user_state', data, userId);

    //清除玩家的在线信息
    userMgr.del(userId);
    socket.userId = null;
//如果不是点击退出按钮
    if(isExit!==1){
        var player = roomInfo.getPlayerById(userId);
        //如果玩家在开始准备阶段退出，判断是不是庄家，否则更换庄家
        if (player.state == player.PLAY_STATE.FREE) {
        //当前房间内的玩家数量
        var currentPlayerCountInRoom = roomInfo.getPlayerCount();
        //console.log('******exit******:' + currentPlayerCountInRoom);
        //只剩下自己一个人，退出时直接解散房间
        if (currentPlayerCountInRoom == 1) {
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
            //更新庄家
            if(player.isBanker = 1){
                let nextBanker = roomInfo.changeBanker(player.seatIndex);
                roomInfo.setBanker(nextBanker.userId);
            }
            gameMgr.exitRoom(userId);
            userMgr.broacastByRoomId('gb_player_exit', {seats:roomInfo.seats,userId:userId}, roomInfo.roomId);

            //游戏准备阶段，如果推出后所有玩家都已经准备了，则游戏开始
            if (roomInfo.gameState == roomInfo.GAME_STATE.READY) {
                checkCanBegin(roomInfo);
            }
        }
        }
        }

}

/**
 * 心跳检测
 * @param socket
 */
exports.ping = function(socket) {
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

    if(roomInfo.gameState==roomInfo.GAME_STATE.READY){
        socket.emit('ctrl_kanpai_result',{errcode:500,errmsg:'游戏还未开始，请稍后'});
        return;
    }

    var results = [];
    for (var i = 0; i < roomInfo.seats.length; i++) {
        var player = roomInfo.seats[i];
        if (player.state == player.PLAY_STATE.PLAYING) {
            var data = {};
            data.name = player.name;
            data.pokers = gameLogic.group(player.hold);
            data.pokerType = gameLogic.getPokerType(player.hold);
            results.push(data);
        }
    }
    socket.emit('ctrl_kanpai_result',results);
}