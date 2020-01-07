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
var redis = require("../../utils/redis");

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
                                console.log("你要被踢出去了啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊")
                                socket.emit('_exit', { errcode: 500, errmsg: "登录异常" });
                                return;
                            }
                        })
                    }
                    if(socket.session!==value){
                        console.log("你要被踢出去了啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊")
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

/**
 * 玩家加入房间
 * @param {*} socket
 * @param {*} data
 */
exports.login =async function(socket, data,config,room_config){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
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
    var headimg = data.headimg;
    var is_robot =0;
    var coins;
    var session = data.session;
    console.log("headimg",headimg)
    //检查参数合法性
    if (!userId|| !time ||!headimg) {
        socket.emit('system_error', { errcode: 500, errmsg: "参数错误" });
        return;
    }
    console.log("socket99999999999999999999999999999999999999"+socket)
    if(session && !socket.session){
        socket.session = session;
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
    await getCoins()
    // console.log("coins0000000000000000000000000000000",coins)
    //检查参数是否被篡改
    // var md5 = crypto.md5(userId + time + config.ROOM_PRI_KEY);
    // if (md5 != sign) {
    //     socket.emit('system_error', { errcode: 500, errmsg: "签名校验错误" });
    //     return;
    // }

      //选择房间
      var roomId = "";
      let roomList = gameMgr.getRoomList();
      if(Object.keys(roomList).length>0){
        roomId = Object.keys(roomList)[0];
      }
      
      if(roomId === ""){
         async function createRoom(){
              return  new Promise(async (resolve,reject)=>{
                room_config.ip = config.SERVER_IP
                room_config.port = config.CLIENT_PORT
                try{
                    let createRes = await gameMgr.createRoom(room_config)
                    roomId = createRes.roomId
                    console.log(roomId)
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
        let keys = Object.keys(gameMgr.getRoomList());
        console.log("房间ids1"+keys)
        let ret = await gameMgr.enterRoom({
            roomId: roomId,
            userId: userId,
            name: name,
            headimg:headimg,
            // gems: parseInt(gems),
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
        console.log(111111111111111111111111111111111111111)
        console.log(banker)
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
    function sorts(a,b){//对房间按照玩家金币从大到小排序
        return a.coins<b.coins;
        }

    newSeats = ret.data.seats.sort(sorts)
    console.log(newSeats);
    ret.data.seats=newSeats;
    console.log("有人加入。。。。。。。。"+newSeats.length)
    // console.log(ret.data.seats)
    socket.emit('login_result', ret);

    //console.log('********player_join_room********');
    //通知其它客户端
    // let banker = roomInfo.getBanker()
    userMgr.broacastInRoom('player_join_room', userData, userId,false);
    
    socket.emit('banker_result',{banker:banker,userData:userData});
    
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
exports.robot_login =async function(socket, data,room_config){
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
    var roomId = data.roomId
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
    //检查传过来的userId是否有误
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
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
    console.log("庄家信息")
    console.log(banker)
    var bankerId = null;
    // if(!banker){
    //     if (currentPlayer.coins>roomInfo.limitCoins){
    //         roomInfo.setBanker(currentPlayer)
    //         banker = roomInfo.getBanker();
    //     }
    //     console.log("设置庄家")
    // }
    // if(banker){
    //     bankerId = banker.userId;
    // }
    console.log("庄家信息1")
    console.log(banker)
    currentPlayer.setState(currentPlayer.PLAY_STATE.PLAYING);


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
 * 启动游戏开始倒计时
 */
function startGameBeginCountDown(roomInfo){
    console.log("新的一局将要开始")
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
    // roomInfo.setState(roomInfo.GAME_STATE.QIANG_ZHUANG);
    //更新游戏局数
    roomInfo.updateNumOfGame();


    // var readyPlayerCount = roomInfo.getPreparedPlayerCount();
    // console.log('********当前已准备的玩家数量*********:'+readyPlayerCount);
    //根据玩家数量，获取牌
    var pokers = gameLogic.deal(5);
    let types = gameLogic.toPokerType(pokers);
    console.log('********排序前*********');
    // console.log(pokers);
    // console.log(types);
    // var type = gameLogic.getPokerType(pokers);
    //新增发牌控制
    var sorted = gameLogic.sortPoker(pokers);
    // types = gameLogic.toPokerType(sorted);
    console.log('********排序后*********');
    // console.log(types);
    var Pokers = {};
    for(let j=1; j<=5;j++){
            //是庄家
            let holdPoker = null;
            if(j===1){
                holdPoker = gameLogic.getPokerByRadio(sorted,roomInfo.zhuangjia_param);
                let type = gameLogic.getPokerType(holdPoker);
                var grouped = gameLogic.group(holdPoker);
                var temp = []
                temp = [].concat(grouped); 
                roomInfo.pokerUser["1"]["poker"] = temp;
                // console.log(roomInfo.pokerUser[1]["poker"])
                roomInfo.pokerUser["1"]["type"] = type;
                console.log('*******发牌给zhuangjia人*******:'+roomInfo.zhuangjia_param);
            }else{
                holdPoker = gameLogic.getPokerByRadio(sorted,roomInfo.xianjia_param);
                var grouped = gameLogic.group(holdPoker);
                var temp = []
                temp = [].concat(grouped);
                let type = gameLogic.getPokerType(grouped);
                // mypoker={poker:grouped,type:type};
                console.log("json")
                // console.log(JSON.stringify(temp))
                roomInfo.pokerUser[j]["poker"] = temp;
                roomInfo.pokerUser[j]["type"] = type;
                // console.log(roomInfo.pokerUser[j]["poker"])
                console.log('*******发牌给普通玩家*******:'+roomInfo.xianjia_param);
            }
    }
    console.log(Pokers)
    userMgr.broacastByRoomId('system_error', { errcode: 500, errmsg: '开始游戏' },roomId);
    console.log('**********系统发牌********');
    // console.log(JSON.stringify(playerplayerPokers));
    // console.log(Pokers)
    userMgr.broacastByRoomId('gb_begin_fapai',roomInfo.pokerUser,roomId);  
    //延迟一秒后通知抢庄,切设置抢庄倒计时
    //根据玩家的数量，计算发牌时间
    roomInfo.setTimer(function() {
        userMgr.broacastByRoomId('gb_begin_settlement',{errcode:0,errmsg:"开始结算"},roomId);
        settlement(roomId)
    }, 7000);
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
 * 申请上庄
 */
exports.shangZhuang =async function(socket,data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    console.log("抢庄开始123")
    console.log(data);
    var userId = data.userId;

    if(!userId){
        socket.emit('system_error', { errcode: 500, errmsg: "参数错误" });
        return;
    }
    
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        return;
    }
    var currentPlayer = roomInfo.getPlayerById(userId);
    if(!socket){
        return;
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    if(currentPlayer.coins<roomInfo.limitCoins){
        socket.emit('shangzhuang_result', { errcode:0,errmsg:"金币必须超过20000"});
        userMgr.sendMsg(userId,'coin_not_enough',{errcode:500,errmsg:'金币不足'});
        return;
    }

    let issz = roomInfo.isShangZhuang(userId);
    if(issz){
        socket.emit('shangzhuang_result', { errcode:0,errmsg:"你已上庄"});
        return;
    }
    
    console.log("jinbi2222222222222222"+currentPlayer.coins)

    if(currentPlayer.isBanker ===1){
        socket.emit('shangzhuang_result', { errcode:0,errmsg:"你已是庄家"});
        return;
    }
    if(socket){
        // console.log("222222222222222222222222222222222")
        socket.emit('shangzhuang_result', { errcode:0,userDate:currentPlayer});
        
    }
    if(roomInfo.getBanker()){
        // console.log("当前庄家信息")
        // console.log(roomInfo.getBanker())
        roomInfo.shangZhuang(userId); 
    }else{
        console.log("开始设置庄家信息")

        roomInfo.setBanker(currentPlayer);
        roomInfo.banker = currentPlayer;
        currentPlayer.setBanker(1);
        currentPlayer.isBanker = 1;
        currentPlayer.setState(currentPlayer.PLAY_STATE.PLAYING);
        //初始化连庄数
        roomInfo.lzNum = 1;
        userMgr.broacastByRoomId("set_banker",currentPlayer,roomInfo.roomId);
        userMgr.broacastByRoomId("gb_begin_game",{countdown:roomInfo.OPT_COUNTDOWN},roomInfo.roomId);
        roomInfo.setState(roomInfo.GAME_STATE.YA_ZHU);
        

        console.log("超时等待"+roomInfo.OPT_COUNTDOWN)
        // roomInfo.setTimer(timeoutFunc,roomInfo.OPT_COUNTDOWN);
        roomInfo.setTimer(
            function(){
                yaZhuTimeOut(roomInfo.roomId);
            },roomInfo.OPT_COUNTDOWN)
    
    }
    
    userMgr.broacastInRoom('gb_shangzhuang_result',{userId:userId},userId,true);
    // //检测是否都已经抢庄了
    // var isAllQiangZhuang = roomInfo.isAllOpt(roomInfo.GAME_STATE.QIANG_ZHUANG);

    // //console.log('******是否都抢庄了******：'+isAllQiangZhuang);

    // if(isAllQiangZhuang){
    //     setTimeout(function(){
    //         showQiangZhuangResult(roomInfo.roomId);
    //     },500);
    // }
}
/**
 * 
 * @param {*} roomId 
 */
exports.quxiao =async function(socket,data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    console.log("取消上庄开始123")
    console.log(data);
    var userId = data.userId;

    if(!userId){
        socket.emit('system_error', { errcode: 500, errmsg: "参数错误" });
        return;
    }
    
    var roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        return;
    }
    if(!socket){
        return;
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    let p = roomInfo.quxiao(userId);
    console.log("p",p)
    if(!p){
        socket.emit("quxiao_result",{ errcode: 500, errmsg: "您好像并未上庄" });
        return;
    }
    socket.emit("quxiao_result",{ errcode: 200, errmsg: "取消成功" });

}
//获得下一个庄家
async function  getZJ(roomId){
    let roomInfo = gameMgr.getRoomById(roomId);
    
    let user = roomInfo.zjList.shift();
    // let banker = roomInfo.getPlayerById(user.userId);
    return new Promise((resolve,reject)=>{
        function loop(user){
            //如果没有合适的玩家可以当庄家则找一个符合条件的机器人
            if(!user){
                for(let i of roomInfo.seats){
                    if(i.isRobot === 1&&i.coins>roomInfo.limitCoins){
                        resolve(i);
                        return;
                    }else{
                        resolve(null);
                        return;
                    }
                }
            }
            if(user.isOnline ===1&&user.coins>roomInfo.limitCoins){
                resolve(user);
                return;
            }
            let user1 = roomInfo.zjList.shift();
            // let banker = roomInfo.getPlayerById(user.userId);
            return loop(user1)
        }
        loop(user);
    })
}

//获得上庄列表
exports.getszList=async function(socket,data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    let userId = data.userId;
    if(!userId){
        return;
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    let roomInfo = gameMgr.getRoomByUserId(userId);
    let zjList = roomInfo.zjList;
    let res = [];
    let issz = roomInfo.isShangZhuang(userId);
    for(let i of zjList){
        let playerData={}
        playerData.name = i.name;
        playerData.coins = i.coins;
        playerData.headimg = i.headimg;
        res.push(playerData)
    }  
    console.log(res)
    socket.emit("zjList",{res:res,issz:issz});
    
    
}

/***
 * 获得胜负走势
 */
exports.zoushi =async function(socket,data){
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    let userId = data.userId;
    if(!userId){
        return;
    }
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    let roomInfo = gameMgr.getRoomByUserId(userId);
    let zoushi = roomInfo.getZoushi();
    socket.emit("zoushi_result",zoushi)
}


/**
 * 押注超时
 * @param roomId
 * @returns {Function}
 */
function yaZhuTimeOut(roomId){
    if(!roomId){
        return;
    }
    //console.log('******设置押注超时定时器*****');
    try{
        var roomInfo = gameMgr.getRoomById(roomId);
        roomInfo.setState(roomInfo.GAME_STATE.SETTLEMENT)
    }catch {
        return
    }
    exports.gameBegin(roomId);

}

/**
 * 押注
 */
exports.yaZhu =async function(socket,data){
    
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
    var userId = data.userId;
    var bet = data.bet;
    var pokerId  = data.pokerId;
    // console.log("押注开始")
    if(!userId&&!beiShu&&!pokerId){
        socket.emit('system_error', { errcode: 500, errmsg: "参数错误" });
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
    if(player.isBanker===1){
        socket.emit('yazhu_result', { errcode: 500, errmsg: '庄家不能押注' });
        console.log("发送yazh")
        return;
    }

    console.log("押注开始2")
    //检测分数是否足够
    if(player.coins<(player.bet+bet)){
        socket.emit('yazhu_result', { errcode: 500, errmsg: '金币不足' });
        userMgr.sendMsg(userId,'coin_not_enough',{errcode:500,errmsg:'金币不足'});
        return;
    }
    player.setState(player.PLAY_STATE.PLAYING)
    // console.log("押注开始3")
    // player.setState(player.PLAY_STATE.PLAYING);
    if(roomInfo.gameState!=roomInfo.GAME_STATE.YA_ZHU){
        if(socket){
            socket.emit('system_error', { errcode: 500, errmsg: "押注已结束" });

            // console.log("押注已结束2")
        }
        // console.log("押注已结束")
        return;
    }

    if(socket){
        socket.emit('yazhu_result', { yazhu: bet,pokerId:pokerId});
    }
    //更新操作状态
    player.setOptState(2);
    //更新押注次数
    roomInfo.updateYazhuNum();
    player.setBet(pokerId,bet);
    console.log("pokerId"+pokerId+typeof pokerId)
    // console.log(roomInfo.getBetsbyPokerId(pokerId))
    roomInfo.updatePokerBets(pokerId,bet);
    if(roomInfo.pokerUser[pokerId].users.indexOf(userId)===-1){
        roomInfo.pokerUser[pokerId].users.push(userId);
    }
    userMgr.broacastInRoom('gb_yazhu',{userId:userId,bet:bet,pokerId:pokerId,bets:roomInfo.pokerUser},userId,true);
    // socket.emit('system_error', { errcode: 500, errmsg: "参数错误" });
    // console.log("同方玩家数据")
    // console.log({userId:userId,bet:bet})
    //检测闲家是否都已经押注了
    // var isAllYaZhu = roomInfo.isAllOpt(roomInfo.GAME_STATE.YA_ZHU);

    //console.log('**********是否都押注了**********：'+isAllYaZhu);

 
    //通知亮牌
    // userMgr.broacastByRoomId('gb_begin_liangpai',{},roomInfo.roomId);
    //设置房间状态为闲家结算状态

    //console.log('*****取消押注超时计时器******');
    //如果开始押注就设置押注超时



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
    let userid = await checkUserId(socket,userId);
    console.log("userid",userid)
    if(userid===1 || !userid ||userid!==userId){
        socket.emit('system_error', { errcode: 500, errmsg: "传入的数据有误" });
        return;
    }
    var roomInfo = gameMgr.getRoomByUserId(userId);

    if(roomInfo.gameState!=roomInfo.GAME_STATE.SETTLEMENT){
        if(socket){
            socket.emit('system_error', { errcode: 500, errmsg: "亮牌已结束" });
        }
        return;
    }

    var player = roomInfo.getPlayerById(userId);
    var pokers = player.hold;
    player.setOptState(3);
    var type = gameLogic.getPokerType(pokers);
    //把有牛的牌放一块
    var grouped = gameLogic.group(pokers);
    userMgr.broacastInRoom('gb_liangpai',{userId:userId,hold:grouped,pokerType:type},userId,true);
    console.log('*********玩家['+userId+']亮牌**************');
    console.log(pokers);
    console.log(grouped);
    //检测闲家是否都已经亮牌了
    var isAllLiangPai = roomInfo.isAllOpt(roomInfo.GAME_STATE.SETTLEMENT);

    console.log('*******isAllLiangPai******:'+isAllLiangPai);

    if(isAllLiangPai) {
        console.log(isAllLiangPai+"isAllLiangPai开始执行了")
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
    console.log("走结算流程")
    var roomInfo = gameMgr.getRoomById(roomId);
    //计算输赢
    try{
        var zoushi = gameMgr.settlement(roomId);
    }catch(e){
        console.log(e)
        return
    }
    // console.log(9999999999999999999999999999999999)
    //广播结算结果
    var results = [];
    for(var i=0;i<roomInfo.seats.length;i++){
        var player = roomInfo.seats[i];
        console.log("玩家状态",player.state)
        //更新玩家的游戏局数
        player.updateNumOfGame();

        if(player.state!=player.PLAY_STATE.FREE){
            var res = {};
            res.userId = player.userId;
            res.name = player.name;
            res.headimg = player.headimg;
            res.bet = player.bet;
            res.totalWin = player.totalWin;
            res.bets = player.bets;
            res.totalWinNum = player.totalWinNum;
            res.numOfGame = player.numOfGame;
            res.coins = parseInt(player.coins);
            if(player.coins<roomInfo.limitCoins){
                userMgr.sendMsg(player.userId,'coin_not_enough',{errcode:500,errmsg:'金币不足'});
            }
            results.push(res);
            console.log("结算结果",res)
        }
    }
    //console.log('**********结算结果**********');
    console.log(results);
    userMgr.broacastByRoomId('gb_settlement_result',{result:results,zoushi:zoushi},roomId);
    setTimeout(function(){
        gameOver(roomId);
    },10000)
    
}



/**
 * 游戏结束，广播结算结果
 */
async function gameOver(roomId){
    console.log("一局游戏结束");
    var roomInfo = gameMgr.getRoomById(roomId);
    //初始化数据
    gameMgr.resetRoomData(roomId);
    //清除掉离线的玩家
    //gameMgr.clearRoom(roomId);

    //如果一个庄家连庄次数超过等于15次，或者金币不足就换人
    roomInfo.updateLzNum();
    let banker = roomInfo.getBanker();
    let lzNum = roomInfo.getLzNum();
    var socket = userMgr.get(banker.userId);
    if (lzNum>2 || banker.coins<20000 ||!socket||banker.isOnline==0){
        banker.setBanker(0);
        console.log(banker.isBanker)
        banker.isBanker = 0;
        roomInfo.setBanker(null);
        let nextZJ =await getZJ(roomId);//
        console.log("新的庄家2");
        console.log(nextZJ);
        if(nextZJ){
            console.log("新的庄家3");
            console.log(nextZJ);
            roomInfo.lzNum = 1;
            roomInfo.setBanker(nextZJ);
            // roomInfo.banker = banker;
            // roomInfo.isBanker
            nextZJ.setBanker(1);
            nextZJ.isBanker=1;
            nextZJ.setState(nextZJ.PLAY_STATE.PLAYING);
            userMgr.broacastByRoomId("set_banker",nextZJ,roomInfo.roomId);
        }
    }

    setTimeout(function () {
        //清除掉离线的玩家
        //console.log('*******开始清理玩家********');
        let seatLength = roomInfo.seats.length;
        let tempSeats = roomInfo.seats.concat();
        for (var i = 0; i < seatLength; i++) {
            var player = tempSeats[i];
            var socket = userMgr.get(player.userId);
            if (!socket||player.isOnline==0) {
                if(player.isBanker ===1){
                    player.setBanker(0);
                    player.isBanker = 0;
                    userMgr.broacastByRoomId('gb_player_exit', {userId:player.userId}, roomInfo.roomId);
                    gameMgr.exitRoom(player.userId);
                    continue;
                }
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
        data.countdown = roomInfo.OPT_COUNTDOWN;
        let banker = roomInfo.getBanker();
        if(banker){   
            console.log("是否有庄家",banker)
            banker.setState(banker.PLAY_STATE.PLAYING);
            roomInfo.setState(roomInfo.GAME_STATE.YA_ZHU);
            // roomInfo.getBanker
            userMgr.broacastByRoomId("gb_begin_game",{countdown:roomInfo.OPT_COUNTDOWN},roomId);
            console.log("超时等待"+roomInfo.OPT_COUNTDOWN)
            // roomInfo.setTimer(timeoutFunc,roomInfo.OPT_COUNTDOWN);
            setTimeout(function(){
                yaZhuTimeOut(roomInfo.roomId);
            },roomInfo.OPT_COUNTDOWN);
        }
        // userMgr.broacastByRoomId('gb_begin_game',data,roomId);
        //设置房间状态为等待状态
        // startGameBeginCountDown(roomInfo);
        // roomInfo.setState(roomInfo.GAME_STATE.READY);
        // //设置玩家准备的倒计时（判断玩家金币是否不足）
        // for(var i=0;i<roomInfo.seats.length;i++){
        //     let player = roomInfo.seats[i];
        //     //最低携带金币=最大牌型赔率*最高押分倍数*最大抢庄倍数*底注
        //     if(player.coins<roomInfo.minScoreLimit){
        //         userMgr.sendMsg(player.userId,'coin_not_enough',{errcode:500,errmsg:'金币不足'});
        //         continue;
        //     }
        //     if(player.state!=player.PLAY_STATE.READY){
        //         userMgr.sendMsg(player.userId,'begin_ready',{numOfGame:roomInfo.numOfGame,countdown:roomInfo.READY_COUNTDOWN});
        //         //设置等待倒计时
        //         //var timer = tichu(player.userId);
        //         //player.setTimer(timer,roomInfo.READY_COUNTDOWN);
        //     }
        // }
    },4000)
    console.log("yijuyouxijieshu")
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
exports.grantProp =async function(socket, data) {
    if(typeof data ==="string"){
        data = JSON.parse(data);
    }
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
    // if(player.state !== player.PLAY_STATE.FREE){
    //     socket.emit('exit_result', { state: player.state,res:"no" })
    //     return
    // }
    //设置玩家离线
    player.setOnlineState(0);
    if (socket) {
        socket.emit('exit_result', { state: player.state,res:"ok" });
        exports.disconnect(socket,roomInfo.roomId);
    }
    //如果玩家在开始准备阶段退出，判断是不是庄家，否则更换庄家
    if (player.isBanker ===0 || player.state === player.PLAY_STATE.FREE) {

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
            gameMgr.exitRoom(userId);
            userMgr.broacastByRoomId('gb_player_exit', {userId:userId}, roomInfo.roomId);

            // //游戏准备阶段，如果推出后所有玩家都已经准备了，则游戏开始
            // if (roomInfo.gameState == roomInfo.GAME_STATE.READY) {
            //     checkCanBegin(roomInfo);
            // }
        }
    }
}

/**
 * 玩家掉线
 * @param socket
 */
exports.disconnect =async function (socket,roomId) {
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
    if(roomId){
        var roomInfo = gameMgr.getRoomById(roomId);
    }else{
        var roomInfo = gameMgr.getRoomByUserId(userId);
    }
    if (!roomInfo) {
        userMgr.del(userId);
        return;
    }
    var player = roomInfo.getPlayerById(userId);
    if(!player){
        return;
    }
    if(player.isBanker===0){
        //通知房间内其它玩家
        userMgr.broacastByRoomId('gb_player_exit', {userId:userId}, roomInfo.roomId);
    }

    var data = {
        userid: userId,
        online: false
    };
    

    

    //清除玩家的在线信息
    userMgr.del(userId);
    socket.userId = null;
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
exports.ctrlKanPai = function(socket){
    var userId = socket.userId;
    if(!userId){
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