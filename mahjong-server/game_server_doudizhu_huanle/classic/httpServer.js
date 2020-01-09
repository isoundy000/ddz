let gameMgr = require('../common/gameMgr');
let express = require('express')
let app = express();
var tokenMgr = require("../../common/tokenmgr");
var http = require('../../utils/http');
var crypto = require('../../utils/crypto');
var userMgr = require('../common/userMgr');
//测试
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1');
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});
app.get('/create_room', async (req, res) => {
    var userId = parseInt(req.query.userid);
    var sign = req.query.sign;
    var _data = req.query.data;
    if (userId == null || sign == null || _data == null) {
        http.send(res, 1, "invalid parameters");
        return;
    }
    
    var md5 = crypto.md5(userId + _data + config.ROOM_PRI_KEY);
    if (md5 != req.query.sign) {
        console.log("invalid reuqest.");
        http.send(res, 1, "sign check failed.");
        return;
    }

    _data = JSON.parse(_data);
    _data.ip = serverIp;
    _data.port = config.CLIENT_PORT;
    _data.creator = userId;
    try {
        let createRes = await gameMgr.createRoom(_data)
        if (createRes == 2222 || createRes == 2221) {
            http.send(res, createRes, "金币或房卡不足");            
        }else{
            http.send(res, 0, "ok", createRes);
        }
    } catch (error) {
        console.log(error);
        http.send(res, 1, error);
    }
});

//生成房
 async function createRoom (req, res){
    let room_type = req.query.room_type
    var _data = {
        dizhu:20,
        maxGames:-1,//无限局数
        fengDing:10,
        bipai:10,
        isPrivate:0,
        biMen:0,
        type:"zhajinhua",
        kindId:"008",
        room_type:room_type
    };
 

    _data = JSON.parse(_data);
    _data.ip = serverIp;
    _data.port = config.CLIENT_PORT;
    _data.creator = userId;
    try {
        let createRes = await gameMgr.createRoom(_data)
        if (createRes == 2222 || createRes == 2221) {
            http.send(res, createRes, "金币或房卡不足");            
        }else{
            http.send(res, 0, "ok", createRes);
        }
        roomId=createRes.roomId
    } catch (error) {
        console.log(error);
        http.send(res, 1, error);
    }
};



app.get('/enter_room', async (req, res) => {
 
    
    var userId = parseInt(req.query.userid);
    var name = req.query.name;
    var room_type = req.query.room_type;
    var sign = req.query.sign;
    // var gems = req.query.gems;
    
    var coins = req.query.coins;
    if(room_type==="shiwanfang"){//如果是试玩房就指定金币数
        coins=50000;
    }
    var sex = req.query.sex;
    var ctrl_param = req.query.ctrl_param;
    if (userId == null || roomId == null ||room_type==null|| sign == null) {
        http.send(res, 1, "invalid parameters");
        return;
    }

    var md5 = crypto.md5(userId + name +room_type + config.ROOM_PRI_KEY);
    if (md5 != sign) {
        http.send(res, 2, "sign check failed.");
        return;
    }
    
    //选择房间
    var roomId = "";
    let roomList = gameMgr.getRoomList;
    let keys = Object.keys(roomList);
    console.log(keys)
    function sorts(a,b){//对房间按照玩家人数从大到小排序
    return roomLists[a].seats.length<=roomList[b].seats.length;
    }
    keys.sort(sorts)
    for (let i of keys){
        if(roomList[i].isPrivate===0 && roomList[i].seats.length < roomList[i].seatCount){
            roomId=i;
            break;
        }
    }
    //如果没有找到符合条件的房间就重新创建
    if(roomId === ""){
        createCW(req,res);
    }
    //安排玩家坐下
    try {
        let ret = await gameMgr.enterRoom({
            roomId: roomId,
            userId: userId,
            name: name,
            // gems: parseInt(gems),
            coins: parseInt(coins),
            ctrlParam: ctrl_param,
            sex:sex,
            is_robot:0
        });
        let errors = {
            [2222]: "房卡不足.",
            [3]: "房间不存在.",
            [4]: "房间已经满了.",
            [5]: "内部错误.",
        }
        if (ret != 0) {
            http.send(res, ret || 1, errors[ret] || "未知错误");
            return;
        }
        var token = tokenMgr.createToken(userId, 5000);
        http.send(res, 0, "ok", { token: token });
    } catch (error) {
        console.log(error);
        http.send(res, 1, error);
    }
});

app.get('/ping', (req, res) => {
    var sign = req.query.sign;
    var md5 = crypto.md5(config.ROOM_PRI_KEY);
    if (md5 != sign) {
        return;
    }
    http.send(res, 0, "pong");
});

app.get('/is_room_runing', (req, res) => {
    let roomId = req.query.roomid;
    var sign = req.query.sign;
    var md5 = crypto.md5(roomId + config.ROOM_PRI_KEY);
    if (md5 != sign) {
        return;
    }
    let room = gameMgr.getRoomById(roomId);
    if (room != null) {
        http.send(res, 0, "ok", { runing: true });
    }
    else {
        http.send(res, 1, "当前房间未运行", { runing: false })
    }
});




/******************接口 begin*********************/
/**
 * 更新房间配置
 */
app.get('/ws/update_room_cfg',(req, res)=>{
    let roomId = req.query.roomId;
    var sign = req.query.sign;
    //是否是代开房 0 否 1 是
    var isDaiKai = req.query.isDaiKai;
    var md5 = crypto.md5(roomId + config.ROOM_PRI_KEY);
    if (md5 != sign) {
        http.send(res, 500, "非法请求");
        return;
    }
    let room = gameMgr.getRoomById(roomId);
    if (room) {
        room.isDaiKai = isDaiKai;
    }
    http.send(res, 0, "ok");
});


/**
 * 更新房间控制参数
 */
app.get('/ws/update_room_ctrl_cfg',(req, res)=>{
    let roomId = req.query.roomId;
    var sign = req.query.sign;
    var md5 = crypto.md5(roomId + config.ROOM_PRI_KEY);
    if (md5 != sign) {
        http.send(res, 500, "签名验证失败，请求非法");
        return;
    }

    let room = gameMgr.getRoomById(roomId);
    if (!room) {
        http.send(res, 1, "房间不存在或已被解散");
        return;
    }

    var robotCount = req.query.robotCount;
    if(robotCount){
        //更新房间内机器人的数量
        room.robotCount = robotCount;
    }

    var robotWinPR = req.query.robotWinPR;
    if(robotWinPR){
        //更新房间内机器人的胜率
        room.robotWinPR = robotWinPR;
    }

    var playerWinPR = req.query.playerWinPR;
    if(playerWinPR){
        //更新房间内机器人的胜率
        room.playerWinPR = playerWinPR;
    }

    // var autoCtrl = req.query.autoCtrl;
    // if(autoCtrl){
    //     room.autoCtrl = autoCtrl;
    // }
    //
    // var fangshuiLine = req.query.fangshuiLine;
    // if(fangshuiLine){
    //     room.fangshuiLine = fangshuiLine;
    // }
    //
    // var choushuiLine = req.query.choushuiLine;
    // if(choushuiLine){
    //     room.choushuiLine = choushuiLine;
    // }

    http.send(res, 0, "ok");
});



/**
 * 解散房间
 */
app.get('/ws/dismiss_room',(req, res)=>{
    let roomId = req.query.roomId;
    var sign = req.query.sign;
    var md5 = crypto.md5(roomId + config.ROOM_PRI_KEY);
    if (md5 != sign) {
        http.send(res, 500, "非法请求");
        return;
    }
    let room = gameMgr.getRoomById(roomId);
    if (!room) {
        http.send(res, 100, "房间可直接从数据库删除");
        return;
    }
    //判断房间内是否还有玩家
    var playerCount = room.getPlayerCount();
    if(playerCount!=0){
        http.send(res, 500, "房间内还有玩家未推出，暂不可解散");
        return;
    }
    gameMgr.destroy(roomId);
    http.send(res, 0, "ok");
});

/**
 * 获取当前在线玩家
 */
app.get('/ws/get_online_player', (req, res)=>{
    var sign = req.query.sign;
    var md5 = crypto.md5(config.ROOM_PRI_KEY);
    if (md5 != sign) {
        http.send(res, 500, "非法请求");
        return;
    }
    var userList = [];
    var roomList = gameMgr.getRoomList();

    Object.keys(roomList).forEach(function(key){
        var roomInfo = roomList[key];
        for (let j = 0; j < roomInfo.seats.length; j++) {
            var onlinePlayer = roomInfo.seats[j];
            if(onlinePlayer.isRobot==0){
                var playerInfo = {};
                playerInfo.userId = onlinePlayer.userId;
                playerInfo.name = onlinePlayer.name;
                playerInfo.headimg = onlinePlayer.headimg;
                playerInfo.coins = onlinePlayer.coins;
                playerInfo.roomId = onlinePlayer.roomId;
                playerInfo.roomName = '炸金花';
                userList.push(playerInfo);
            }
        }

    });

    var data = {};
    data.player_list = userList;
    http.send(res, 0, "ok",data);
})


/**
 * 游戏内广播
 */
app.get('/ws/broadcast', (req, res)=>{
    //console.log('*******ZJH广播*******');
    var sign = req.query.sign;
    var md5 = crypto.md5(config.ROOM_PRI_KEY);
    if (md5 != sign) {
        http.send(res, 500, "非法请求");
        return;
    }
    var msg = req.query.msg;
    if(!msg||msg==''){
        http.send(res, 500, "参数错误");
        return;
    }
    var roomList = gameMgr.getRoomList();
    //console.log(roomList);
    Object.keys(roomList).forEach(function(key){
        //let msg = `玩家李永刚在炸金花房间[147258}中获得炸弹,赢得1805466金币!]`;
        //userMgr.broacastByRoomId('gb_broadcast',{ errcode: 500, errmsg: '这是一条广播消息' },key);
        userMgr.broacastByRoomId('gb_broadcast',{msg:msg},key);
    });
    http.send(res, 0, "ok");
});




/******************接口 end*********************/
var config = null;
var serverIp = "";
exports.start = function ($config) {
    config = $config;
    var gameServerInfo = {
        id: config.SERVER_ID,
        clientip: config.CLIENT_IP,
        clientport: config.CLIENT_PORT,
        httpPort: config.HTTP_PORT,
        kindId: config.KIND_ID,
        load : gameMgr.getRoomCount(),
        serverName : '炸金花'
    };
    //防止大厅服务器重启后无法获取子游戏服务器配置信息
    setInterval(function(){
        registerServer(gameServerInfo);
    },1000);
    app.listen($config.HTTP_PORT);
}

/**
 * 向大厅服务器注册子服务
 */
function registerServer(gameServerInfo) {
    http.get(config.HALL_IP, config.HALL_PORT, "/register_gs", gameServerInfo, function (ret, data) {
        if (ret == true) {
            if (data.errcode != 0) {
                console.log(data.errmsg);
            }else{
                if (data.ip != null) {
                    serverIp = data.ip;
                }
                //console.log('向大厅注册【'+gameServerInfo.serverName+'】服务信息成功');
            }
        }else {
            console.log('向大厅注册['+gameServerInfo.serverName+']服务信息失败');
        }
    });
}