let gameMgr = require('./gameMgr');
let userMgr = require("./userMgr")
let express = require('express')
let app = express();
var tokenMgr = require("../common/tokenmgr");
var http = require('../utils/http')
var crypto = require('../utils/crypto');
let commonService = require("../common/service/commonService")
let playerServer = require("../common/service/playerService")
let clubServer = require("../common/service/clubService")
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
    console.log("jinru  create_room",req.connection.remoteAddress)
    var userId = req.query.userId;
    let clubId = req.query.clubId;
    var gems = parseInt(req.query.gems);
    var sign = req.query.sign;
    var _data1 = req.query.data;
    console.log("_data1",_data1)
    if(!clubId){
        clubId=0;
    }
    console.log(userId)
    let _data = JSON.parse(_data1);
    console.log("_data",_data)
    console.log("gems",gems);
    console.log("_data.maxGmaxGamesams",_data.maxGames);
    if (userId == null  || _data == null || !(_data.type)) {
        http.send(res, 1, "invalid parameters");
        return;
    }

    if(_data.room_type === "fangzhu"){
        if(gems<_data.maxGames){
            http.send(res, 1, "房卡不足");
            return
        }
    }

    // var md5 = crypto.md5(userId + _data + config.ROOM_PRI_KEY);
    // if (md5 != req.query.sign) {
    //     console.log("invalid reuqest.");
    //     http.send(res, 1, "sign check failed.");
    //     return;
    // }

    _data.ip = serverIp;
    _data.port = config.CLIENT_PORT;
    _data.creator = userId;
    _data.kindId = 111;
    _data.isPrivate = 0;
    _data.diZhu = 20;
    _data.qiangZhuangBeiShu = 5;
    _data.minScoreLimit = 0;
    _data.maxScoreLimit = 1000;
    _data.choushuiRate = 0.1;//
    _data.OPT_COUNTDOWN = 10000;
    _data.READY_COUNTDOWN = 5000;
    _data.serial_num = 1;
    _data.roomType = "niuniu"
    _data.clubId = clubId;

    // console.log("_data",_data);
    try {
        let createRes = await gameMgr.createRoom(_data)
        if (createRes == 2222 || createRes == 2221) {
            http.send(res, createRes, "金币或房卡不足");
        } else {
            http.send(res, 0, "ok", createRes);
        }
    } catch (error) {
        console.log(error);
        http.send(res, 1, error);
    }
});
function getClubByUserid(userId){
    return new Promise((resolve,reject)=>{
        clubServer.getClubIdByuserId(userId,function(err,value){
            if(err){
                return reject(err);
            }
            return resolve(value)
        })
    })
   
}

app.get('/enter_room', async (req, res) => {
    console.log("jinru  enter_room")
    var userId = parseInt(req.query.userId);
    var name = req.query.name;
    var roomId = req.query.roomId;
    var sign = req.query.sign;
    var gems = req.query.gems;
    var coins = req.query.coins;
    var headimg = req.query.headimg;
    var sex = req.query.sex;
    var is_robot = req.query.is_robot;
    var ctrl_param = req.query.ctrl_param;
    console.log(11111111111111111111)
    console.log(userId,typeof userId)
    console.log("roomId",roomId)
    console.log(headimg)
    
    if (userId == null || roomId == null || headimg == null) {
        http.send(res, 1, "invalid parameters");
        return;
    }
    // var md5 = crypto.md5(userId + name + roomId + gems + config.ROOM_PRI_KEY);
    // if (md5 != sign) {
    //     http.send(res, 2, "sign check failed.");
    //     return;
    // }
    let roomInfo = gameMgr.getRoomById(roomId);
    if(!roomInfo){
        roomInfo = await commonService.getTableValuesAsync("*", "t_rooms", { id: roomId });
        roomInfo = JSON.parse(roomInfo.base_info);
    }
    if(roomInfo.clubId){
        getClubByUserid(userId).catch(function(err){
            console.log(err)
            return http.send(res,1,"服务器异常，请稍后重试")
        })
        let clubIds = await getClubByUserid(userId);
        let ids=[]
        for(let j of clubIds){
            ids.push(j.clubId)
        }
        if(ids.indexOf(roomInfo.clubId)== -1){
            return http.send(res,1,"你不在此俱乐部")
        }
    }

    //安排玩家坐下
    try {
        let ret = await gameMgr.enterRoom({
            roomId: roomId,
            userId: userId,
            name: name,
            gems: parseInt(gems),
            coins: roomInfo.type==="jinbi" ?parseInt(coins):0,
            headimg:headimg,
            sex:sex,
            is_robot:is_robot,
            ctrlParam: ctrl_param,
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
        // var token = tokenMgr.createToken(userId, 5000);
        // let roomInfo = gameMgr.getRoomById(roomId);
        // console.log(roomInfo.type)
        http.send(res, 0, "ok", { });
        return
    } catch (error) {
        console.log(error);
        http.send(res, 1, { errcode: 500, errmsg: "加入房间失败,请稍后重试" });
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
                playerInfo.roomName = '牛牛';
                userList.push(playerInfo);
            }
        }
    });
    var data = {};
    data.player_list = userList;
    http.send(res, 0, "ok",data);
})
/******************接口 end*********************/

app.get('/ping', (req, res) => {
    var sign = req.query.sign;
    var md5 = crypto.md5(config.ROOM_PRI_KEY);
    if (md5 != sign) {
        return;
    }
    http.send(res, 0, "pong");
});

// app.get('/is_room_runing', http_service.isRoomRunning);
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
        serverName : '牛牛'
    };
    //防止大厅服务器重启后无法获取子游戏服务器配置信息
//     setInterval(function(){
//         // registerServer(gameServerInfo);
//     },1000);
    app.listen($config.HTTP_PORT, $config.HALL_IP);
    console.log("http server is listening on " + config.HTTP_PORT);
}

/**
 * 向大厅服务器注册子服务
 */
function registerServer(gameServerInfo) {
    console.log(gameServerInfo)
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