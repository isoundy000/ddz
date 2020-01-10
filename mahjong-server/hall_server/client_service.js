var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var uTime = require('../utils/uTime');
var http = require('../utils/http');
var path = require('path');
var room_service = require("./room_service");
var app = express();
var config = require("../configs");
var ejs = require("ejs")
let redis = require("../utils/redis");
var uuid = require('node-uuid');
let dateUtil = require("../utils/dateUtil")
var playerService = require('../common/service/playerService');
var rechargeService = require('../common/service/rechargeService');
var commonService = require('../common/service/commonService');
var gameService = require('../common/service/gameService');
var agentService = require('../common/service/agentService');
var club_server = require("../common/service/clubService")
const clubService = require('./clubService')
const coinService = require("./coinService")
var configs = require("../configs")
const GameType = require('../common/room_game/MahjongDB').GameType;
let qian_time;//前一次登录时间
// let qr = require('../staticServer/qr-image/qr')
var dateTemp = new Date().getDate() //日期暂存
setInterval(() => {
    var currentDate = new Date().getDate()//当前几号
    if(currentDate>dateTemp){

        activityService.updateFlag(function(err,result){
            if(err){
                console.log("mysql出错")
            }
        })

    }
    activityService.getALLSignIn(function(err,result){
        if(err){
            console.log("mysql 出错")
        }
        let nowTime = new Date().getTime();
        for(let i of result){
            let timeDiff = nowTime-i.last_sign_timeStamp;
            let dayDiff = timeDiff/3600/24
            if(dayDiff>=1){
                let signInfo = JSON.parse(i.signInfo)
                for(let i in signInfo){
                    if(signInfo[i]==-1){
                        signInfo[i]=0;
                        signInfo = JSON.stringify(signInfo)
                        activityService.updateSignInfo(signInfo,i.player_id)
                    }
                }
            }
        }
    })

    dateTemp = currentDate

}, 2000)
/**
 *
 * 2018-06-12 新增功能
 */

var activityService = require('../common/service/activityService');
var transferRecordService = require('../common/service/transferRecordService');
var noticeService = require('../common/service/notificationService')

var clubMgrService = require('../common/service/clubService');
var globalCfgService = require('../common/service/globalCfgService');
//常量配置
var constants = require('../constants');
var async = require('async');
var cacheUtil = require('../utils/cacheUtil');
var smsUtil = require('../utils/smsUtil');
var commonUtil = require('../utils/commonUtil');


//初始化微信支付对象
var WechatPay = require('../utils/wechatPay');
var wechatPay = new WechatPay(config.wechat_pay.APP_ID, config.wechat_pay.MCH_ID, config.wechat_pay.APP_KEY, config.wechat_pay.NOTIFY_URL);

function check_account(req, res) {
    var account = req.query.account;
    // var sign = req.query.sign;
    // if (account == null ) {
    //     http.send(res, 1, "未知错误");//"unknown error");
    //     return false;
    // }

    // var serverSign = crypto.md5(account /*+ req.ip*/ + config.hall_server().ACCOUNT_PRI_KEY);
    // if (serverSign != sign) {
    //     http.send(res, 2, "校验码错误")//"login failed.");
    //     return false;
    // }

    return true;
}

//设置跨域访问
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1');
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});
//防重复登录
function checkSession(req,res,callback){
    let session = req.query.session;
    let userId = req.query.userId;
    console.log("校验session",session);
    if(session){
        redis.get("session"+userId,function(err,value){
            if(err){
    
                playerService.getUserSessionByUserId(userId,function(err,value){
                    if(err){
                        http.send(res, 1, "服务器错误,请稍后重试");
                        callback(1)
                        return;
                    }
                    if(session!==value.session){
                        console.log("登录异常")
                        console.log(session)
                        console.log(value.session)
                        console.log(value)
                        http.send(res,1,"登录1异常",{exit:1})
                        callback(1)
                        return;
                    }
                })
            }
            if(session!==value){
                http.send(res,1,"登录异常",{exit:1})
                console.log(session)
                console.log(value)
                console.log("登录异常2")
                callback(1)
                return;
            }
            callback(null)
        })
    }

    
}
//检查登录间隔是否大于一天
app.get("/check_login_jiange",function(req,res){
    let userId = req.query.userId
    checkSession(req,res,function(err){
        if(err){
            return;
        }
        playerService.getUserBaseInfo(userId,function(err,result){
            if(err){
                http.send(res,1,"获取最新登录时间出错")
            }
            if (qian_time){
                let ltime = result.last_login_time
                let jg = parseInt(ltime,10)-parseInt(qian_time,10)
                let d = Math.floor(jg/3600/24)
                let is = d<1
                activityService.getSignIn(userId,function(err,result){
                    if (err){
                        http.send(res,1,"获取签到次数出错")
                    }
                    if(result){
                        var days = result.current_sign_in
                        console.log(days)
                        if(!days){days=0}
                    }else{
                        days=0
                    }
                    console.log(days)
                    http.send(res,0,"ok",{is:is,days:days})
                })
                
        
            }
        });
    });

    
})
/**
 * 用户登录
 */
app.get('/login', function (req, res) {
    var account = req.query.account;
    var sign = req.query.sign;
    var userId = req.query.userId
    // if (!check_account(req, res)) {
    //     return;
    // }
    console.log(account)
    var ret = {};
    var ip = req.ip;
    if (ip.indexOf("::ffff:") != -1) {
        ip = ip.substr(7);
    }
    /**
     * 获取全局配置
     */
    globalCfgService.getByParamKey("can_login", function (value) {
        if (value) {
            if (parseInt(value) == 0) {
                http.send(res, 1, "因游戏服务器维护，暂时关闭登陆");
                return;
            }

            playerService.getUserDataByAccount(account, (err, user_data) => {
                if (err) {
                    console.log(err);
                    http.send(res, 1, "服务器错误,请稍后重试");
                    return;
                } else {
                    if (user_data) {
                        qian_time = user_data.last_login_time;
                        //更新最近一次的登录时间
                        playerService.updateLastLoginTime(account, function (err, callback) {
                            if (err) {
                                console.log('更新最近一次登录时间错误:' + err);
                                http.send(res, 1, "服务器错误,请稍后重试");
                                return;
                            } else {
                                // let date = new Date();
                                // let todaySeconds = date.getTime() / 1000 - date.getSeconds() - date.getMinutes() * 60 - date.getHours() * 60 * 60;
                                // user_data.is_first_login_today = (user_data.last_login_time - todaySeconds) < 0;
                                user_data.is_first_login_today = (user_data.is_first_login_today == 1);
                                user_data.name = crypto.fromBase64(user_data.name);
                                user_data.club_id = user_data.belongs_club;
                                user_data.ip = ip;
                                // flag = true;
                                
                                activityService.getSignIn(userId,function(err,result){
                                    if (err){
                                        http.send(res,1,"获取flag出错")
                                    }
                                    if(result){
                                        var flag = result.flag
                                        
                                        if(!flag){flag="true"}
                                    }else{
                                        flag="true"
                                    }
                                    user_data.flag = flag;
                                    console.log(flag)
                                    http.send(res, 0, "ok", user_data);
                                })
                                
                                
                            }
                        })
                    } else {

                        http.send(res, 500, "用户不存在");
                    }
                }
            })
        } else {
            console.log("全局配置表中不存在can_login");

            http.send(res, 1, "服务器错误,请稍后重试");
        }
    })
});

app.get("/enter_room",async (req,res)=>{
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
    var roomId = req.query.roomId;
    if (userId == null || roomId == null || headimg == null) {
        http.send(res, 1, "invalid parameters");
        return;
    }
    
    console.log("enter_roomm")
    let room_type =await commonService.getTableValuesAsync("room_type","t_rooms",{id:roomId});
    
    if ( !room_type ) {
        http.send(res, 1, "房间不存在");
        return;
    }
    if(room_type.room_type === "niuniu"){
        let niuniu = configs.coinNIUNIU();
        let ip = niuniu.HALL_IP;
        let port = niuniu.HTTP_PORT;
        let url = "http://"+ip+":"+port+"/enter_room";
        http.get2(url,{roomId:roomId,userId:userId,headimg:headimg,name:name,gems:gems,coins:coins,sex:sex,is_robot:is_robot,ctrl_param:ctrl_param},false,function(err,data){
            if(err){
                http.send(res,1,err)
            }
            console.log("room_type",room_type)
            // let data1 = JSON.parse(data)
            data.room_type = "niuniu"
        res.send(data);
        return;
        });
    }
    if(room_type.room_type === "paodekuai"){
        let paodekuai = configs.game_server_paodekuai();
        let ip = paodekuai.HALL_IP;
        let port = paodekuai.HTTP_PORT;
        let url = "http://"+ip+":"+port+"/enter_room";
        http.get2(url,{roomId:roomId,userId:userId,headimg:headimg,name:name,gems:gems,coins:coins,sex:sex,is_robot:is_robot,ctrl_param:ctrl_param},false,function(err,data){
            if(err){
                http.send(res,1,err)
                return;
            }
            console.log("room_type",room_type)
            // let data1 = JSON.parse(data)
            data.room_type = "paodekuai"
        res.send(data);
        });
    }
    
})
app.get('/create_user', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var account = req.query.account;
    var name = req.query.name;
    if (name == "") {
        http.send(res, 1, "用户昵称不能为空")//"the name can't have empty.");
        return;
    }
    playerService.isAccountExist(account, (err, result) => {
        if (err) {
            console.log(err);
        }
        else {
            if (result) {
                http.send(res, 1, "当前账号已经存在")//"account have already exist.");
            }
            else {
                playerService.createUser(account, name, null, "", "", (err, result) => {
                    if (err) {
                        console.log(err);
                        http.send(res, 2, "系统错误")
                        return
                    }
                    http.send(res, 0, "ok")
                })
            }
        }
    });
});
app.get('/create_private_room', async (req, res) => {
    //验证参数合法性
    const data = req.query;
    //验证玩家身份
    if (!check_account(req, res)) {
        return;
    }
    const account = data.account;
    const conf = data.conf;
    const _conf = JSON.parse(conf);
    try {
        let result = await commonService.getTableValuesAsync("*", "t_users", { account: account });
        const userId = result.userid;
        const name = crypto.fromBase64(result.name);
        const gems = result.gems;
        const coins = result.coins;
        const ctrl_param = result.ctrl_param || 0;
        const sex = result.sex;
        if (!_conf.is_my_room) {
            if (result.user_type != 2) {
                http.send(res, 1, "不是代理,无法代开房间");
                return
            }
            room_service.createRoom(account, userId, conf,sex, function (err, data) {
                if (err == 0 && data != null) {
                    rechargeService.changeUserGoldsAndSaveConsumeRecord(userId, -data.cost, _conf.type,
                        "gems", `[${GameType[_conf.type]}]房间号[${data.roomId}]代开扣除的房卡`, (err, results) => {
                            if (err || !results) {
                                console.log(err);
                                http.send(res, 1, "内部错误");
                                return
                            }
                            http.send(res, 0, "ok", {
                                conf: conf,
                                room_id: data.roomId,
                                is_daikai: true,
                            });
                        }
                    )
                }
                else {
                    if (err == 2222) {
                        http.send(res, err, "金币或房卡不足.");
                    }
                    else {
                        http.send(res, err, "创建房间失败.");
                    }
                }
            })
        } else {
            //验证玩家状态
            const user_info = coinService.getUserInfo(userId);
            if (user_info != null && user_info.is_gaming == true) {  //判断是否已经在金币场,如果在则提示返回到金币场
                let ret = {
                    ip: user_info.ip,
                    port: user_info.port,
                    is_gaming: user_info.is_gaming,
                    time: Date.now()
                }
                ret.sign = crypto.md5(ret.time + config.hall_server().ROOM_PRI_KEY);
                http.send(res, 1, "您已经在金币场,请返回", ret);
                return
            }
            if (result.roomid) {
                let roomResult = await commonService.getTableValuesAsync("*", "t_rooms", { id: result.roomid })
                if (roomResult != null) {
                    http.send(res, -1, "用户正在房间中.");
                    return
                }
                // playerService.setUserInfoByKeyAsync(account, { roomid: null });
            }
            //创建房间
            room_service.createRoom(account, userId, conf, sex, function (err, data) {
                if (err == 0 && data != null) {
                    let roomId = data.roomId
                    let qp_data = {
                        userid: userId,
                        name: name,
                        roomid: roomId,
                        gems: gems,
                        coins: coins,
                        sex: sex,
                        ctrl_param: ctrl_param,
                    }
                    room_service.enterRoom(qp_data, function (errcode, enterInfo) {
                        if (errcode == 0) {
                            var ret = {
                                roomid: roomId,
                                ip: enterInfo.ip,
                                port: enterInfo.port,
                                token: enterInfo.token,
                                time: Date.now()
                            };
                            ret.sign = crypto.md5(ret.roomid + ret.token + ret.time + config.hall_server().ROOM_PRI_KEY);
                            http.send(res, 0, "ok", ret);
                        }
                        else {
                            http.send(res, errcode, "房间不存在.");
                        }
                    });
                } else {
                    if (err == 2222) {
                        http.send(res, err, "房卡不足.");
                    }
                    else if (err == 2221) {
                        http.send(res, err, "金币不足.");
                    }
                    else {
                        http.send(res, err, "创建房间失败.");
                    }
                }
            });
        }
    } catch (error) {
        console.log(error);
        http.send(res, 1, "内部错误.");
    }
});

//接受从客户端发来的玩家进入房间的消息
app.get('/enter_private_room', async function (req, res) {
    var data = req.query;
    var roomId = data.roomid;
    if (roomId == null) {
        http.send(res, -1, "房间不存在或已被解散")//"parameters don't match api requirements.");
        return;
    }
    if (!check_account(req, res)) {
        return;
    }

    var account = data.account;
    try {
        let user_info = await playerService.getUserInfoByKeysAndAccountAsync(account, "userid,gems,coins,ctrl_param,name,roomid,belongs_club,sex")
        user_info.name = crypto.fromBase64(user_info.name);

        //判断是否已经在金币场,如果在则提示返回到金币场
        const coins_user_info = coinService.getUserInfo(user_info.userid);
        if (coins_user_info != null && coins_user_info.is_gaming == true) {
            let ret = {
                ip: coins_user_info.ip,
                port: coins_user_info.port,
                is_gaming: coins_user_info.is_gaming,
                time: Date.now()
            }
            ret.sign = crypto.md5(ret.time + config.hall_server().ROOM_PRI_KEY);
            http.send(res, 1, "您已经在金币场,请返回", ret);
            return
        }
        //判断是否已经在房间中了
        if (user_info.roomid != null) {
            let user_room_info = await commonService.getTableValuesAsync("*", "t_rooms", { id: user_info.roomid })
            if (user_room_info == null) {
                await playerService.setUserInfoByKeyAsync(account, { roomid: null });
            } else if (user_info.roomid != roomId) {
                http.send(res, 2, "您已经在房间场了：" + user_info.roomid, { roomId: user_info.roomid });
                return;
            }
        }
        //判断要进入的房间是否存在
        let room_results = await commonService.getTableValuesAsync("*", "t_rooms", { id: roomId })
        if (room_results == null) {
            http.send(res, 1, "房间不存在或已经被解散");
            return;
        }

        // if (room_results != null && room_results.belongs_club != null && room_results.belongs_club != user_info.belongs_club) {
        //     http.send(res, 1, "您不是当前俱乐部玩家，无法加入房间");
        //     return
        // }

        let room_conf = JSON.parse(room_results.base_info)
        //AA支付下房卡是否足够
        if (room_conf.cost_type != null && room_conf.cost_type == 1) {
            if (user_info.gems < room_conf.cost / room_conf.player_count) {
                http.send(res, 1, "房卡不足无法进入");
                return;
            }
        }
        //特殊处理闲逸牛牛消耗房卡的情况
        // if(room_conf.kindId == "010"){
        //     if (user_info.gems < 1) {
        //         http.send(res, 1, "房卡不足无法进入");
        //         return;
        //     }
        // }
        //金币结算是否足够进入
        if (room_conf.jinbijiesuan && user_info.roomid != room_results.id && room_conf.kindId != "008" && room_conf.kindId != "009"&& room_conf.kindId != "010") {
            if (user_info.coins < room_conf.limit_coins) {
                http.send(res, 1, "金币不足无法进入");
                return;
            }
        }
        user_info.roomid = room_results.id;
        room_service.enterRoom(user_info, function (errcode, enterInfo) {
            if (errcode == 0) {
                var ret = {
                    roomid: roomId,
                    ip: enterInfo.ip,
                    port: enterInfo.port,
                    token: enterInfo.token,
                    kindId: enterInfo.kindId,
                    time: Date.now()
                };

                //特殊处理闲逸牛牛的密码房
                if(room_conf.password){
                    ret.password = room_conf.password;
                }

                ret.sign = crypto.md5(roomId + ret.token + ret.time + config.hall_server().ROOM_PRI_KEY);
                http.send(res, 0, "ok", ret);
            }else {
                http.send(res, errcode, enterInfo);
            }
        });
    } catch (error) {
        console.error(error);
        http.send(res, 1, "内部错误");
    }
});
// app.engine("html",ejs.__express);
// app.set("view engine","html");
// app.set("views","../view")
// app.use("/static",express.static(path.join(__dirname, '../public')))
// app.get('/create_qrcode',function(req,res){
//     let userId = req.query.userId;
//     let hall_Server = config.hall_server();
//     let url = "http://"+hall_Server.HALL_IP + ":" + hall_Server.CLEINT_PORT +"/register?bind_recommender="+userId;
//     console.log(111)
//     if(!userId){
//         http.send(res, 1, "参数错误")
//         return;
//     }
//     try {
//         let img = qr.image(url,{size:10});
//         console.log(img)
//         res.writeHead(200,{'Content-Type': 'image/png'});
//         img.pipe(res);
//     } catch (e) {
//         http.send(res, 1, "出错")
//     }
// })


// app.get("/register",function(req,res){
//     let userId = 0;
//     let account_Server = config.account_server();
//     let url = "http://"+account_Server.HALL_IP + ":" + account_Server.CLIENT_PORT+"/register?bind_recommender="+userId;
//     res.type('.html');
//     res.header("Content-Type","text/html")
//     res.render("register",{url:"1233333"})
// })

/**
 * 检测房间游戏是否正在游戏中(针对麻将房，代理解散代开房间)
 */
app.get('/check_room_is_gaming',async (req, res)=>{
    if (!check_account(req, res)) {
        return;
    }
    var room_id = req.query.room_id;
    if (!room_id) {
        http.send(res, -1, "参数错误")//"room_id没传");
        return;
    }
    let roomInfo = await commonService.getTableValuesAsync('*', 't_rooms', {id: room_id,});
    if(!roomInfo){
        http.send(res, -1, "房间不存在，或已被解散")//"room_id没传");
        return;
    }
    let playerCount = 0;
    for (var i = 0; i < 4; i++) {
        var userId = roomInfo["user_id" + i];
        if(userId&&userId!=0){
            playerCount++;
        }
    }
    http.send(res, 1, playerCount);
});



/**
 * 解散房间
 */
app.get("/dismiss_room_by_room_id", (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    var room_id = req.query.room_id;
    var user_id = req.query.user_id;
    if (!room_id) {
        http.send(res, -1, "参数错误")//"room_id没传");
        return;
    }

    if (!user_id) {
        http.send(res, -1, "参数错误")//"user_id没传");
        return;
    }

    playerService.getUserDataByUserId(user_id, (err, user_res) => {
        if (err) {
            console.log(err);
            return
        }
        if (!user_res) {
            http.send(res, -1, "当前用户不存在");
            return;
        }
        if (user_res.user_type != 2) {
            http.send(res, -1, "权限不足，无法解散房间");
            return;
        }
        gameService.getRoomData(room_id, (err, room_res) => {
            if (err) {
                console.log(err);
                return
            }
            if (!room_res) {
                http.send(res, -1, "当前房间不存在");
                return;
            }
            if (room_res.creator_id != user_id) {
                http.send(res, -1, "不是创建者，无法解散");
                return;
            }

            let base_info = JSON.parse(room_res.base_info)
            let cost = base_info.cost;
            room_service.dismissRoomByRoomId(room_id, (is_dismiss, num_of_games) => {
                if (!is_dismiss) {
                    http.send(res, -1, "解散房间失败");
                }
                else {
                    if (num_of_games != null && num_of_games > 0) {
                        http.send(res, 0, "超过一局的房间解散不返回房卡");
                    }
                    else if (base_info.cost_type != 1) {
                        rechargeService.changeUserGoldsAndSaveConsumeRecord(user_id, cost, base_info.type,
                            "gems", `[${GameType[base_info.type]}]房间号[${room_id}]代开返还的房卡`, (err, results) => {
                                if (err || !results) {
                                    console.log(err);
                                    console.error("存储出错");
                                    http.send(res, 1, "内部错误");
                                    return
                                }
                                http.send(res, 0, "ok");
                            }
                        );
                    }
                    else {
                        http.send(res, 0, "ok");
                    }
                }
            })
        })
    })
})

app.get('/get_history_list', function (req, res) {
    var data = req.query;
    if (!check_account(req, res)) {
        return;
    }
    var account = data.account;
    playerService.getUserDataByAccount(account, (err, result) => {
        if (err) {
            console.log(err);
            return
        }
        if (!result) {
            http.send(res, -1, "系统错误")//"system error");
            return
        }
        var userId = result.userid;
        playerService.getUserHistory(userId, (err, result) => {
            if (err) {
                console.log(err);
            }
            if (result && result != "") {
                result = JSON.parse(result);
            }
            http.send(res, 0, "ok", { history: result });
        });
    });
});

app.get('/get_games_of_room', function (req, res) {
    var data = req.query;
    var uuid = data.uuid;
    if (uuid == null) {
        http.send(res, -1, "参数错误")//"parameters don't match api requirements.");
        return;
    }
    if (!check_account(req, res)) {
        return;
    }
    gameService.getGamesOfRoom(uuid, (err, result) => {
        if (err) {
            console.log(err);
            return
        }
        if (!result) {
            http.send(res, 1, "获取游戏信息失败", null)//"failed", null);
            return
        }
        http.send(res, 0, "ok", { data: result });
    });
});

app.get('/get_detail_of_game', function (req, res) {
    var data = req.query;
    var uuid = data.uuid;
    var index = data.index;
    if (uuid == null || index == null) {
        http.send(res, -1, "参数错误", null)// "parameters don't match api requirements.");
        return;
    }
    if (!check_account(req, res)) {
        return;
    }
    gameService.getDetailOfGame(uuid, index, (err, result) => {
        if (err) {
            console.log(err);
            return
        }
        if (!result) {
            http.send(res, 1, "获取游戏信息失败", null)//"failed", null);
            return
        }
        http.send(res, 0, "ok", { data: result });
    });
});

app.get('/get_user_status', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var account = req.query.account;
    playerService.getUserStatus(account, (err, result) => {
        if (err) {
            console.log(err);
            return
        }
        if (!result) {
            http.send(res, 1, "获取房卡数量失败。");
            return
        }
        http.send(res, 0, "ok", { gems: result.gems, coins: result.coins });
    });
});

app.get('/get_message', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var type = req.query.type;

    if (type == null) {
        http.send(res, -1, "参数错误")//"parameters don't match api requirements.");
        return;
    }

    globalCfgService.getByParamKey('official_notice', function (message) {
        if (message) {
            http.send(res, 0, "ok", { msg: message, version: '20161227' });
        } else {
            console.log(err);
            http.send(res, 1, "未查询到配置信息")//"parameters don't match api requirements.");
            return;
        }
    })

    /*
    var version = req.query.version;
    playerService.getMessage(type, version, (err, result) => {
        if (err) {
            console.log(err);
            return
        }
        if (!result) {
            http.send(res, 1, "获取信息失败")//"get message failed.");
            return
        }
        http.send(res, 0, "ok", { msg: result.msg, version: result.version });
    });
    */
});

app.get('/is_server_online', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var ip = req.query.ip;
    var port = req.query.port;
    room_service.isServerOnline(ip, port, function (isonline) {
        var ret = {
            isonline: isonline
        };
        http.send(res, 0, "ok", ret);
    });
});
/**
 * 获取排行榜信息
 */
app.get('/get_ranking_list', (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    // let page = parseInt(req.query.pagePos);
    // if (Number.isNaN(page) || page <= 0) {
    //     http.send(res, 1, "参数错误");
    //     return
    // }
    playerService.getRankingList(null, (err, result) => {
        if (err) {
            console.log(err);
            return
        }
        if (result.length > 0) {
            for (var value of result) {
                value.name = crypto.fromBase64(value.name);
            }
            http.send(res, 0, "ok", result);
        }
        else {
            http.send(res, 0, "ok", null);
        }

    })
})

app.get('/feedback', (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    var userid = req.query.userid;
    var content = req.query.content;
    let contact_way = req.query.contact_way;
    if (!userid || !content || content == "" || !contact_way) {
        http.send(res, 1, "参数错误");
        return;
    }
    playerService.isUserExist(userid, (err, result) => {
        if (err) {
            console.log(err);
            return
        }
        if (!result) {
            http.send(res, 1, "参数错误")// "userid is not exist", false);
            return
        }
        playerService.saveFeedbackByClient(userid, content, contact_way, (err, result) => {
            if (err) {
                console.log(err);
                http.send(res, 1, "存储失败")//"failure", false);
                return
            }
            http.send(res, 0, "反馈成功");
        })
    })
})


/**
 * 查询我的代开房
 */
app.get("/get_rooms_info_by_creator_id", (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    var user_id = req.query.user_id;
    playerService.isUserExist(user_id, (err, result) => {
        if (err) {
            console.log(err);
            return
        }
        if (!result) {
            http.send(res, 1, "用户ID不存在");
            return
        }
        gameService.getRoomsInfoByCreatorId(req.query.user_id, (err, room_infos) => {
            if (err) {
                console.log(err);
                return
            }
            for (var value of room_infos) {
                for (var i = 0; i < 4; i++) {
                    value["user_icon" + i] = undefined;
                    // value["user_score" + i] = undefined;
                    value["user_name" + i] = crypto.fromBase64(value["user_name" + i]);
                }
            }
            http.send(res, 0, "ok", room_infos);
        })
    })
})

app.get("/get_all_shop_info", (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    rechargeService.getAllShopInfo((err, shop_info) => {
        if (err) {
            console.log(err);
            return
        }
        let info = shop_info.sort((a, b) => {
            return a.price - b.price
        })
        http.send(res, 0, "ok", info);
    })
})


/**
 * 获取手机验证码
 */
app.get('/get_verify_code', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var phone = req.query.phone;
    //验证手机号的合法性
    if (!phone) {
        http.send(res, 1, "参数错误");
        return;
    }
    if (!commonUtil.isLegalPhoneNum(phone)) {
        http.send(res, 1, "手机号不合法");
        return;
    }
    //先从缓存中获取是否有待验证的验证码
    cacheUtil.get(phone, function (value) {
        //说明还未验证，防止重复提交
        if (value) {
            http.send(res, 1, "操作太过频繁，请稍后重试");
            return;
        } else {
            var code = commonUtil.getRandomCode(6);
            smsUtil.sendSMS(phone, code, function (err, result) {
                if (err) {
                    http.send(res, 1, "发送失败，请稍后重试");
                    return;
                } else {
                    http.send(res, 0, "发送成功");
                    //缓存5分钟
                    cacheUtil.set(phone, code, 60 * 5);
                }
            })
        }
    })
});

/**
 * 提交实名认证消息
 */
app.get("/authenticated", async (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    var name = req.query.name;
    var user_id = req.query.user_id;
    var id_card = req.query.id_card;
    var account = req.query.account;

    var phone = req.query.phone;
    var code = req.query.code;

    if (!user_id || !name || !id_card || !phone || !code) {
        http.send(res, 1, "参数错误");
        return;
    }
    if(account.indexOf('guest_')>-1){
        http.send(res, 1, "网页注册用户不支持认证");
        return;
    }
    if (!commonUtil.isLegalName(name)) {
        http.send(res, 1, "输入的姓名不合法");
        return;
    }
    if (!commonUtil.isLegalCardID(id_card)) {
        http.send(res, 1, "输入的身份证号不合法");
        return;
    }
    if (!commonUtil.isLegalPhoneNum(phone)) {
        http.send(res, 1, "输入的手机号不合法");
        return;
    }


    //判断手机号是否已被使用
    let userInfo = await commonService.getTableValuesAsync("*", "t_userinfo", { phone: phone });
    if(userInfo){
        http.send(res, 1, "该手机号已被使用,请更换手机号重新提交认证");
        return;
    }

    cacheUtil.get(phone, function (value) {
        if (value) {
            async.auto({
                user_info(callback) {
                    playerService.isUserExist(user_id, callback);
                },
                authenticated_reward(callback) {
                    globalCfgService.getByParamKey('authenticated_reward', (value) => {
                        callback(null, value);
                    })
                }
            }, (err, results) => {
                if (err) {
                    console.log(err);
                    http.send(res, 1, "内部错误");
                    return
                }
                let user_info = results.user_info;
                let authenticated_reward = results.authenticated_reward;
                if (!user_info) {
                    http.send(res, 1, "用户ID不存在");
                    return
                }
                if (authenticated_reward == null) {
                    http.send(res, 1, "获取赠送信息错误");
                    return
                }
                async.auto({
                    saveAuthenticated(callback) {
                        playerService.saveAuthenticated(account, user_id, name, id_card, phone, callback);
                    },
                    saveBankStatement(callback) {
                        rechargeService.changeUserGoldsAndSaveBankStatement(user_id, authenticated_reward, 9, `实名认证赠送金币:${authenticated_reward}`, "coins", callback);
                    }
                }, (err, results) => {
                    if (err) {
                        console.log(err);
                        http.send(res, 1, "内部错误");
                        return
                    }
                    http.send(res, 0, `认证成功,赠送金币:${authenticated_reward}`);
                    //删除缓存的验证码
                    cacheUtil.del(phone);
                })
            })
        } else {
            http.send(res, 1, "验证码错误，请重新获取");
            return;
        }
    })
})

/**
 * 获取财富消息
 */
app.get('/get_bank_statement', (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    var user_id = req.query.user_id;
    if (!user_id) {
        http.send(res, 1, "参数错误");//"user_id为空");
        return;
    }
    rechargeService.getBankStatement(user_id, (err, statements) => {
        if (err) {
            console.log(err);
            return;
        }
        for (const key in statements) {
            let statement = statements[key]
            statement.fk_player_id = undefined;
            statement.id = undefined;
            statement.username = crypto.fromBase64(statement.username);
            statement.record_time = uTime.formatDateTime(statement.record_time);
        }
        http.send(res, 0, 'ok', { statements: statements });
    })
})
//获取战绩
app.get("/get_zj",function(req,res){
    let userId = req.query.userId;
    let nowDay = dateUtil.getToday();
    let pagenum = req.query.pagenum;
    let size = req.query.size;
    if(!userId){
        http.send(res,1,"参数错误")
        return
    }
    if(!pagenum){
        pagenum=1;
    }
    if(!size){
        size = 200;
    }
    let nowBeginTimestamp = dateUtil.getBeginTimestamp(nowDay)
    rechargeService.getZhanji(userId,nowBeginTimestamp,pagenum,size,function(err,result){
        let paodekuai = [];
        let niuniu = [];
        let re={};
        let temp = {};
        if(err){
            console.log(err)
            http.send(res,1,"服务器异常请稍后重试")
        }else{
            for(let i of result){
                let dict={};
                dict.roomId = i.roomId;
                dict.time = dateUtil.timestampToDate(i.play_duration);
                console.log(i.play_duration)
                // dict.seatCount = i.jushu;
                dict.game_type = i.game_type;
                dict.seatCount = i.seatCount;
                dict.jushu = i.jushu;
                let roomId = i.roomId;
                let userId = i.fk_player_id;
                let users={};
                users.userId = userId;
                users.name = crypto.fromBase64(i.username);
                users.win_score = i.win_score;
                users.headimg = i.headimg;
                users.jifen = i.jifen;
                // users.time = dateUtil.timestampToDate(i.record_time);
                if(temp[roomId]){
                    temp[roomId].usersInfo.push(users);
                }else{
                    temp[roomId] = dict;
                    temp[roomId].usersInfo=[];

                    temp[roomId].usersInfo.push(users);
                    
                }
                
                
            }
            // console.log(temp)
            for (let i in temp){
                
                if(temp[i].game_type =="game_server_paodekuai"){
                    paodekuai.push(temp[i])
                }else if(temp[i].game_type =="niuniu"){
                    niuniu.push(temp[i]);
                }
                delete temp[i].game_type;
            }
            re.paodekuai = paodekuai;
            re.niuniu=niuniu;
            http.send(res,0,"ok",re)
        }
    });
})
//获得俱乐部与我相关战绩
app.get("/get_me_club_zj",function(req,res){
    let userId = req.query.userId;
    let club_id = req.query.clubId
    let nowDay = dateUtil.getToday();
    let pagenum = req.query.pagenum;
    let size = req.query.size;
    if(!userId){
        http.send(res,1,"参数错误")
        return
    }
    if(!pagenum){
        pagenum=1;
    }
    if(!size){
        size = 200;
    }
    let nowBeginTimestamp = dateUtil.getBeginTimestamp(nowDay)
    rechargeService.getMeClubZhanji(userId,nowBeginTimestamp,pagenum,size,club_id,function(err,result){
        let paodekuai = [];
        let niuniu = [];
        let re={};
        let temp = {};
        if(err){
            console.log(err)
            http.send(res,1,"服务器异常请稍后重试")
        }else{
            for(let i of result){
                let dict={};
                dict.roomId = i.roomId;
                dict.time = dateUtil.timestampToDate(i.play_duration);
                console.log(i.play_duration)
                // dict.seatCount = i.jushu;
                dict.game_type = i.game_type;
                dict.seatCount = i.seatCount;
                dict.jushu = i.jushu;
                let roomId = i.roomId;
                let userId = i.fk_player_id;
                let users={};
                users.userId = userId;
                users.name = crypto.fromBase64(i.username);
                users.win_score = i.win_score;
                users.headimg = i.headimg;
                users.jifen = i.jifen;
                // users.time = dateUtil.timestampToDate(i.record_time);
                if(temp[roomId]){
                    temp[roomId].usersInfo.push(users);
                }else{
                    temp[roomId] = dict;
                    temp[roomId].usersInfo=[];

                    temp[roomId].usersInfo.push(users);
                    
                }
                
                
            }
            // console.log(temp)
            for (let i in temp){
                
                if(temp[i].game_type =="game_server_paodekuai"){
                    paodekuai.push(temp[i])
                }else if(temp[i].game_type =="niuniu"){
                    niuniu.push(temp[i]);
                }
                delete temp[i].game_type;
            }
            re.paodekuai = paodekuai;
            re.niuniu=niuniu;
            http.send(res,0,"ok",re)
        }
    });
})

app.get("/update_club",function(req,res){
    let clubId = req.query.clubId
    let club_name = req.query.club_name
    let club_manifesto = req.query.club_manifesto
    let norank = req.query.norank
    let status = req.query.status
    let check = req.query.check
    let private = req.query.private
    if(!clubId|| !club_name|| !norank|| !status|| !check ||!private){
        return http.send(res,1,"参数错误")
    }
    club_server.updateClub(clubId,club_name,club_manifesto,norank,status,check,private,function(err,data){
        if(err || !data){
            return http.send(res,1,"服务器出错，请稍后再试")
        }
        return http.send(res,1,"修改成功")
    })
})
//获得俱乐部与我相关战绩
app.get("/get_club_zj",function(req,res){
    let club_id = req.query(clubId)
    let nowDay = dateUtil.getToday();
    let pagenum = req.query.pagenum;
    let size = req.query.size;
    if(!userId){
        http.send(res,1,"参数错误")
        return
    }
    if(!pagenum){
        pagenum=1;
    }
    if(!size){
        size = 200;
    }
    let nowBeginTimestamp = dateUtil.getBeginTimestamp(nowDay)
    rechargeService.getClubZhanji(nowBeginTimestamp,pagenum,size,club_id,function(err,result){
        let paodekuai = [];
        let niuniu = [];
        let re={};
        let temp = {};
        if(err){
            console.log(err)
            http.send(res,1,"服务器异常请稍后重试")
        }else{
            for(let i of result){
                let dict={};
                dict.roomId = i.roomId;
                dict.time = dateUtil.timestampToDate(i.play_duration);
                console.log(i.play_duration)
                // dict.seatCount = i.jushu;
                dict.game_type = i.game_type;
                dict.seatCount = i.seatCount;
                dict.jushu = i.jushu;
                let roomId = i.roomId;
                let userId = i.fk_player_id;
                let users={};
                users.userId = userId;
                users.name = crypto.fromBase64(i.username);
                users.win_score = i.win_score;
                users.headimg = i.headimg;
                users.jifen = i.jifen;
                // users.time = dateUtil.timestampToDate(i.record_time);
                if(temp[roomId]){
                    temp[roomId].usersInfo.push(users);
                }else{
                    temp[roomId] = dict;
                    temp[roomId].usersInfo=[];
                    temp[roomId].usersInfo.push(users);   
                }
            }
            // console.log(temp)
            for (let i in temp){
                
                if(temp[i].game_type =="game_server_paodekuai"){
                    paodekuai.push(temp[i])
                }else if(temp[i].game_type =="niuniu"){
                    niuniu.push(temp[i]);
                }
                delete temp[i].game_type;
            }
            re.paodekuai = paodekuai;
            re.niuniu=niuniu;
            http.send(res,0,"ok",re)
        }
    });
})

//获得俱乐部大赢家信息
app.get("/get_club_winner",function(req,res){
    let clubId = req.query.clubId;
    console.log(clubId)
    if(!clubId){
        return http.send(res,1,"参数错误");
    }
    club_server.getWinNum(clubId,function(err,data){
        if(err || !data){
            console.log(err)
            return http.send(res,1,"服务器出错，请稍后再试");
        }

        return http.send(res,0,"ok",data)
    })

})

//获得俱乐部土豪榜信息
app.get("/get_club_fail",function(req,res){
    let clubId = req.query.clubId;
    if(!clubId){
        return http.send(res,1,"参数错误");
    }
    club_server.getFailNum(clubId,function(err,data){
        if(err || !data){
            return http.send(res,1,"服务器出错，请稍后再试");
        }
        return http.send(res,0,"ok",data)
    })

})

//获得俱乐部积分榜信息
app.get("/get_club_jifen",function(req,res){
    let clubId = req.query.clubId;
    if(!clubId){
        return http.send(res,1,"参数错误");
    }
    club_server.getWinJifen(clubId,function(err,data){
        if(err || !data){
            return http.send(res,1,"服务器出错，请稍后再试");
        }
        return http.send(res,0,"ok",data)
    })

})

//获得俱乐部负分榜信息
app.get("/get_club_fufen",function(req,res){
    let clubId = req.query.clubId;
    if(!clubId){
        return http.send(res,1,"参数错误");
    }
    club_server.getFaiJifen(clubId,function(err,data){
        if(err || !data){
            return http.send(res,1,"服务器出错，请稍后再试");
        }
        return http.send(res,0,"ok",data)
    })

})
//获得长时间未登陆的玩家
app.get("/get_endTime_users",function(req,res){
    let clubId = req.query.clubId;
    if(!clubId){
        return http.send(res,1,"参数错误")
    }
    let timeSapce = 3600*24*7
    clubMgrService.getTimeOutUser(timeSapce,clubId,function(err,data){
        if(err || !data){
            return http.send(res,1,"服务器出错，请稍后再试");
        }
        for(let i of data){
            i.name = crypto.fromBase64(i.name);
            i.last_login_time = dateUtil.timestampToDate(i.last_login_time)
        }
        return http.send(res,0,"ok",data)
    })
})


//获得所有俱乐部成员
app.get("/get_all_club_users",function(req,res){
    let clubId = req.query.clubId;
    if(!clubId){
        return http.send(res,1,"参数错误")
    }
    agentService.getAllClubUserInfoByClubId(clubId,function(err,data){
        if(err || !data){
            console.log(err)
            return http.send(res,1,"服务器出错，请稍后再试");
        }
        for(let i of data){
            i.name = crypto.fromBase64(i.name);
            i.last_login_time = dateUtil.timestampToDate(i.last_login_time)
        }
        return http.send(res,0,"ok",data)
    });
})

//获得俱乐部已开的游戏房间信息
app.get("/get_club_rooms",function(req,res){
    let clubId = req.query.clubId
    if(!clubId){
        return http.send(res,1,"参数错误")

    }
    clubMgrService.getRoomUsersByClubid(clubId,function(err,result){
        if(err){
            console.log(err)
            return http.send(res,1,"服务器异常")
        }
        return http.send(res,0,"ok",result)
    })
})
//快速组队
app.get("/dash_team",(req,res)=>{
    let args={
        clubId : req.query.clubId,
        userId : parseInt(req.query.userId),
        name : req.query.name,
        // sign : req.query.sign,
        gems : req.query.gems,
        coins : req.query.coins,
        headimg : req.query.headimg,
        sex : req.query.sex,
        is_robot : req.query.is_robot,
    }
    if(!args.clubId){
        return http.send(res,1,"参数错误")

    }
    let hall_Server = configs.hall_server();
    clubMgrService.getRoomUsersByClubid(args.clubId,function(err,result){
        if(err){
            console.log(err)
            return http.send(res,1,"服务器异常")
        }
        // return http.send(res,1,"ok",result)
        if(result.length==0){
            return http.send(res,1,"无空余房间")
        }
        // console.log("result",result)
        result = result.rooms
        for(let i in result){
            // console.log("result[i]",result[i])
            if(result[i].seatCount>result[i].users.length){
                args.roomId = parseInt(i);
                let url = "http://"+hall_Server.HALL_IP+":"+hall_Server.CLEINT_PORT+"/enter_room"
                return http.get2(url,args,false,function(err,data){
                    if(err){
                        return http.send(res,1,"服务器异常，请稍后再试")
                    }
                    if(data.errcode==0){
                        http.send(res,0,"ok",{room_type:data.room_type,roomId:i})
                    }else{
                        res.send(data)
                    }
                })
            }
        }
    })
})

//获得审核列表
app.get("/get_apply_club_users",function(req,res){
    let clubId = req.query.clubId;
    let userId = req.query.userId;
    if(!clubId || !userId){
        return http.send(res,1,"参数错误")
    }
    club_server.getClubPermission(clubId,userId,function(err,data){
        if(err || !data){
            return http.send(res,1,"服务器出错，请稍后再试");
        }
        // return http.send(res,0,"ok",data)
        if(data.userType==0){
            return http.send(res,1,"您没有权限");
        }
        club_server.getApplyListByClubId(clubId,function(err,data){
            if(err || !data){
                return http.send(res,1,"服务器出错，请稍后再试");
            }
            for(let i of data){
                i.apply_username = crypto.fromBase64(i.apply_username);
                i.apply_time = dateUtil.timestampToDate(i.apply_time)
            }
            return http.send(res,0,"ok",data)
        })
    })
})

app.get("/get_club_tongji",function(req,res){
    let clubId = req.query.clubId;
    if(!clubId){
        return http.send(res,1,"参数错误")
    }
    club_server.getTongjiClub(clubId,function(err,value){
        if(err ){
            return http.send(res,1,"服务器出错，请稍后再试");
        }

        return http.send(res,0,"ok",value)
    })

})
//同意玩家加入俱乐部
app.get("/agree_join",function(req,res){
    let  applyId= req.query.applyId;
    if(!applyId){
        return http.send(res,1,"参数错误")
    }
    club_server.agreeJoinClub(applyId,function(err,data){
        if(err || !data){
            return http.send(res,1,"服务器出错，请稍后再试");
        }
        if(data ==1){
            return http.send(res,0,"玩家第一次加入俱乐部，赠送房卡");
        }
        if(data==0){
            return http.send(res,0,"成功");
        }
    })
})

//踢出俱乐部
app.get("/hadLeftClub",function(req,res){
    clubService.hadLeftClub(req,res)
})
//拒绝玩家加入俱乐部
app.get("/refuse_join",function(req,res){
    let  applyId= req.query.applyId;
    if(!applyId){
        return http.send(res,1,"参数错误")
    }
    club_server.refuseJoinClub(applyId,function(err,data){
        if(err || !data){
            return http.send(res,1,"服务器出错，请稍后再试");
        }
        if(data ==1){
            return http.send(res,0,"成功");
        }
        if(data==0){
            return http.send(res,0,"失败");
        }
    })
})

//转让俱乐部
app.get("/zhuanrang_club",function(req,res){
    console.log(123132)
    let  userId = req.query.userId;
    let clubId = req.query.clubId;
    let adminId = req.query.adminId;
    if(!clubId || !userId){
        return http.send(res,1,"参数错误")
    }
    club_server.updateClubCreate(clubId,userId,adminId,function(err,data){
        if(err || !data){
            console.log(err)
            return http.send(res,1,"服务器出错，请稍后再试");
        }
        console.log(data)
        return http.send(res,1,"转让成功");
    })
})

app.get("/update_userType",function(req,res){

    let userId = req.query.userId;
    let clubId = req.query.clubId;
    if(!userId || !clubId){
        return http.send(res,1,"参数错误")
    }
    clubMgrService.updateClueUserType(clubId,userId,1,function(err,data){
        if(err){
            console.log(err)
            return http.send(res,1,"内部错误")
        }
        return http.send(res,1,"成功")
    })
})

//获取客服微信号
app.get('/get_wx_kefu', (req, res) => {
    // if (!check_account(req, res)) {
    //     return;
    // }
    
    globalCfgService.getweixinCfg(function(err,result){
        if(err){
            console.log(err);
            return;
        }
        http.send(res, 0, 'ok', {result:result});
        // console.log(result)
    })
        

})

/**
 * 获取分享图片的图片地址
 */
app.get('/get_share_img_url', (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    globalCfgService.getByParamKey("share_img_url", (result) => {
        if (result == null) {
            console.log(err);
            return;
        }
        http.send(res, 0, 'ok', result);
    })
});





//绑定推荐人
app.get('/bind_recommender', (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    const account = req.query.account;
    const recommender = parseInt(req.query.recommender);
    if (Number.isNaN(recommender)) {
        http.send(res, 1, "参数错误");
        return;
    }

    if(account.indexOf('guest_')>-1){
        http.send(res, 1, "网页注册用户不支持绑定推荐人")
        return;
    }

    async.auto({
        user_info(callback) {
            playerService.isAccountExist(account, callback);
        },
        recommender_info(callback) {
            playerService.isUserExist(recommender, callback);
        },
        send_golds(callback) {
            globalCfgService.getByParamKey("bind_recommender", (value) => {
                callback(null, value);
            })
        }
    }, (err, results) => {
        if (err) {
            console.log(err);
            http.send(res, 1, "内部错误")
            return
        }
        let user_info = results.user_info;
        let recommender_info = results.recommender_info;
        if (user_info == null) {
            http.send(res, 1, "该玩家账号不存在")
            return
        }
        if (user_info.userid == recommender) {
            http.send(res, 1, "推荐人不能是自己")
            return
        }
        if (user_info.recommender != null) {
            http.send(res, 1, `已绑定推荐人ID:${user_info.recommender}`, { recommender: user_info.recommender });
            return
        }
        if (recommender_info == null) {
            http.send(res, 1, "推荐人不存在");
            return
        }
        playerService.bindRecommender(user_info, recommender_info, (err, result) => {
            if (err) {
                console.log(err);
                http.send(res, 1, "绑定推荐人失败")
                return
            }
            let send_golds = results.send_golds;
            if (send_golds == null) {
                console.log("绑定推荐人成功,赠送失败");
                http.send(res, 1, "绑定推荐人成功,赠送失败")
                return
            }
            async.auto({
                sender(callback) {
                    rechargeService.changeUserGoldsAndSaveBankStatement(recommender_info.userid, send_golds, 4, `玩家${user_info.userid}绑定您为推荐人，赠送金币`, "coins", callback)
                },
                receiver(callback) {
                    rechargeService.changeUserGoldsAndSaveBankStatement(user_info.userid, send_golds, 4, `您绑定了推荐人${recommender_info.userid}，赠送金币`, "coins", callback);
                },
                //检测赠送抽奖次数
                grantLuckDraw:async function(callback){
                    //判断推荐的人数是否达到赠送条件  每推荐10人赠送一次抽奖次数
                    let recommendPlayerCount = await activityService.getRecommendPlayerCountAsync(recommender);
                    let queryParam = {};
                    queryParam.playerId = recommender;
                    queryParam.type = 1;
                    let rewardCount = await activityService.getAwardedLuckDrawTimesAsync(queryParam);

                    //每满10人送一次抽奖
                    if((recommendPlayerCount-rewardCount*10)>0&&(recommendPlayerCount-rewardCount*10)%10==0){
                        var rewardEntity = {};
                        rewardEntity.player_id = recommender;
                        rewardEntity.status = 0;
                        rewardEntity.remark = '推荐玩家满10人奖励';
                        rewardEntity.type = 1;
                        rewardEntity.record_time = new Date().getTime()/1000;
                        activityService.grantLuckDraw(rewardEntity,callback);
                    }else{
                        callback(null,1);
                    }
                    
                }
            }, (err, results) => {
                if ( results == null) {
                    console.log(err);
                    http.send(res, 1, "内部错误。")
                    return
                }
                http.send(res, 0, "绑定推荐人成功", { recommender: recommender })
            })
        })
    })
})
/**
 * 客户端分享成功回掉
 */
app.get('/share_succeed', (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    let player_id = req.query.player_id;
    let platform = req.query.platform;
    let updateShare = function (player_id, platform, time) {
        globalCfgService.getByParamKey("share_reward", (param_config) => {
            if (param_config == null) {
                console.log("数据库t_param_config不存在share_reward");
                // callback(err, param_config);
                return;
            }
            rechargeService.changeUserGoldsAndSaveBankStatement(player_id, param_config, 2,
                "每日分享获取的金币", "coins", (err, results) => {
                    if (err || !results) {
                        console.log(err);
                        console.error("存储出错");
                        http.send(res, 1, "内部错误");
                        return
                    }
                    playerService.saveShareRecord(player_id, platform, time, (err) => {
                        if (err) {
                            console.log(err);
                            http.send(res, 1, "内部错误");
                            return;
                        }
                        http.send(res, 1, `今天第一次分享,获取${param_config.p_value}金币。`)
                    })
                }
            );
        })
    }
    playerService.getLastShareTimeByPlayerId(player_id, (err, last_time) => {
        if (err) {
            console.log(err);
            return;
        }
        let time = uTime.now();
        if (!last_time) {
            updateShare(player_id, platform, time);
            return;
        }
        let today = Math.floor(time / 60 / 60 / 24);
        let share_day = Math.floor(last_time / 60 / 60 / 24);
        if (today == share_day) {
            http.send(res, 1, "今天已经分享过了,不再获取奖励");
        }
        else if (today < share_day) {
            http.send(res, 1, "时间错误");
        }
        else {
            updateShare(player_id, platform, time);
        }
    })
})

/**
 * 创建ping++支付对象
 */
app.get('/create_charge', function (req, res) {
    /*
    if (!check_account(req, res)) {
        return;
    }
    */
    var shopId = req.query.shopId;
    var amount = req.query.price;
    //转化成分
    amount = amount * 100;
    var count = req.query.count;
    var channel = req.query.channel || "wx";
    //金额
    //玩家账号
    var account = req.query.account;

    var type = req.query.type;

    var data = {};
    data.shopId = shopId;
    data.account = account;
    data.amount = amount;
    data.channel = channel;
    console.log("接收到客户端支付订单请求：" + data);
    //生成订单
    playerService.getByAccount(account, function (err, result) {
        if (err) {
            console.log(err);
        } else {
            var userid = result.userid;
            var orderId = uuid.v1().replace(/-/g, "");
            wechatPay.createOrder({
                body: "老司机娱乐-游戏充值",
                order_no: orderId,
                total_fee: amount
            }, function (err, charge) {
                if (err) {
                    console.log(err);
                    http.send(res, 1, "下单失败")//"create charge failed.");
                } else {
                    var rechargeRecord = {};
                    rechargeRecord.id = orderId;
                    rechargeRecord.goods_count = count;
                    rechargeRecord.goods_type = type;
                    rechargeRecord.order_money = amount;
                    rechargeRecord.pay_way = channel;
                    rechargeRecord.player_id = userid;
                    rechargeService.createRechargeRecord(rechargeRecord, function (err, result) {
                        if (err) {
                            console.log(err);
                        } else {
                            charge.errcode = 0;
                            res.send(charge);
                        }
                    });
                }
            });
        }
    })
});
/**
 * 支付成功回调
 */
app.post('/webhooks', function (req, res) {
    console.log('***********支付成功回调****************');
    req.setEncoding('utf8');
    var postData = "";
    req.addListener("data", function (chunk) {
        postData += chunk;
    });
    req.addListener("end", function () {
        res.header('Content-Type', 'application/xml; charset=utf-8');
        wechatPay.getPayResult(postData, function (err, result) {
            if (err) {
                console.log(err);
                res.send(wechatPay.replyData(err));
            } else {
                console.log("支付回调结果:" + JSON.stringify(result));
                var orderId = result.out_trade_no;
                console.log('order_no:' + orderId);
                rechargeService.confirmPay(orderId, function (err, result) {
                    if (err) {
                        console.log(err);
                        res.send(wechatPay.replyData("update order state fail"));
                    } else {
                        res.send(wechatPay.replyData());
                    }
                })
            }
        });
    });
})
//进入金币场
app.get('/enter_coin_game', (req, res) => {
    if (check_account(req, res)) {
        coinService.enterCoinGame(req, res);
    }
})
//获取已经开启的金币场信息
app.get('/get_start_game', (req, res) => {
    if (check_account(req, res)) {
        coinService.getStartGame(req, res);
    }
})
//通过kind_id获取金币场子游戏的信息
app.get('/get_game_info', (req, res) => {
    if (check_account(req, res)) {
        coinService.getGameInfo(req, res);
    }
})
//获取用户游戏记录和个人宣言
app.get('/get_user_info', async (req, res) => {
    if (check_account(req, res) == false) {
        return
    };
    let user_id = req.query.user_id;
    if (user_id == null) {
        http.send(res, 1, "用户id没传入")
        return
    }
    try {
        let user_info = await playerService.getUserInfoByKeysAsync(user_id, 'account,manifesto')
        // if (user_info.account != req.query.account) {
        //     http.send(res, 1, "账号和ID校验有误");
        //     return
        // }
        let records = await gameService.getGameRecordAsync(user_id);
        let win_count = 0;
        let total_count_games = 0;
        if (records != null) {
            total_count_games = records.length;
            if (total_count_games > 0) {
                for (let i = 0; i < total_count_games - 1; i++) {
                    if (records[i].win_score > 0)
                        win_count++;
                }
            }
        }
        let ret = {
            manifesto: user_info.manifesto,
            total_count_games: total_count_games,
            win_count: win_count
        }
        http.send(res, 0, "ok", ret)
    } catch (error) {
        console.log(error);
        http.send(res, 1, "ok", "内部错误");
    }
})

//////////////////////@clubService 2018-06-30 update by hyw//////////////////////////////////////
//玩家通俱乐部ID加入俱乐部
//创建俱乐部
app.get("/create_club",(req,res) =>{
    clubService.createClubRoom(req,res)
})
app.get("/get_all_club_info",(req,res) =>{
    let userId = req.query.userId;
    if(!userId){
        return http.send(res,1,"参数错误")
    }
    club_server.getClubInfoByUserId(userId,function(err,result){
        if(err){
            console.log(err)
            return http.send(res,1,"服务器异常，请稍后重试")
        }
        for(let i of result){
            i.name = crypto.fromBase64(i.name)
        }
        console.log("result",result)
        return http.send(res,0,"ok",{res:result})
    })
})

app.get("/getClubInfoByclubId",function(req,res){
    let club_id = req.query.clubId;
    console.log("clubId",club_id)
    if(!club_id){
        return http.send(res,1,"参数错误")
    }
    clubService.getClubInfo(req,res);
})
app.get('/join_club_by_club_id', (req, res) => {
    if (!check_account(req, res)) {
        http.send(res, 1, "非法请求")
        return
    }

    let user_id = parseInt(req.query.user_id)
    let club_id = parseInt(req.query.club_id)
    if (!user_id || !club_id) {
        http.send(res, 1, "参数错误")
        return
    }
    console.log("club_id13",club_id)
    clubMgrService.getClubInfoByClubId(club_id,function(err,data){
        if(err){
            return http.send(res,1,"服务器异常，请稍后重试")
        }
        if(data && data.check==0){
            clubMgrService.getClubIdByuserId(user_id,function(err,value){
                console.log(value);
                if(err){
                    callback(err,null)
                }else{
                    console.log("value",value[0].clubId)
                    for(let i of value){
                        console.log("i",i.clubId)
                        if(i.clubId==club_id){
                            return http.send(res,1,"你已在此俱乐部，请勿重复申请")
                        }
                        
                    }
                    clubService.joinClubByClubId(req,res);
                }
            })
            
        }else{
                //发送俱乐部加入申请
    console.log("发送俱乐部加入申请")
    async.auto({
        getUsersJoinedClub:function(callback){
            clubMgrService.getClubIdByuserId(user_id,function(err,value){
                console.log(value);
                if(err){
                    callback(err,null)
                }else{
                    // console.log("value",value)
                    for(let i of value){
                        console.log("i",i.clubId==club_id)
                        console.log("i",i.clubId)
                        console.log("i",club_id)
                        if(i.clubId==club_id){
                            return http.send(res,1,"你已在此俱乐部，请勿重复申请")
                        }
                    }
                        console.log("jixu")
                        callback(null,value)

                }
            })
        },
        getPlayerInfo:["getUsersJoinedClub",function (result,callback) {
            playerService.getPlyaerInfoById(user_id, callback);
        }],
        //查看是否有未處理的加入俱樂部申請
        isApplying:["getPlayerInfo",function (result,callback) {
            clubMgrService.isApplying(user_id, club_id, callback);
        }], 
        saveApply: ['getPlayerInfo', 'isApplying', function (result, callback) {
            //說明正在申請中
            if (result.isApplying > 0) {
                callback(null, 500);
            } else {
                var playerInfo = result.getPlayerInfo;
                var applyEntity = {};
                applyEntity.club_id = club_id;
                applyEntity.apply_user = playerInfo.userid;
                applyEntity.apply_username = playerInfo.name;
                applyEntity.apply_time = dateUtil.getCurrentTimestapm();
                clubMgrService.applyJoinClub(applyEntity, callback);
            }
        }]
    }, function (err, resData) {
        if (err) {
            console.log(err);
            http.send(res, 1, "服务器错误,请稍后重试")
            return;
        } else {
            if (resData.saveApply == 500) {
                http.send(res, 0, "您已经提交了加入申请，请耐心等待管理员审核")
            } else {
                if (resData.saveApply.affectedRows > 0) {
                    http.send(res, 0, "加入申请已提交，请耐心等待管理员审核")
                } else {
                    http.send(res, 1, "申请加入失败，请稍后重试")
                }
            }
        }
    });
        }
    })

})

app.get("/getAllUsersByclubId",function(req,res){
    let clubId = req.query.clubId
    if(!clubId){
        return http.send(res,1,"参数错误")
    }
    club_server.getRoomUsersByClubid(clubId,function(err,data){
        if(err){
            return http.send(res,1,"服务器异常，请稍后重试")
        }
        return http.send(res,0,"ok",data)
    })
})

// app.get('/create_club_room', (req, res) => {
//     if (check_account(req, res)) {
//         clubService.createClubRoom(req, res);
//     }
// })
//刷新当前俱乐部创建的所有房间
app.get('/refresh_club_all_club_rooms', (req, res) => {
    if (check_account(req, res)) {
        clubService.refreshClubAllClubRooms(req, res);
    }
})



// app.get('/enter_club_room', (req, res) => {
//     if (check_account(req, res)) {
//         clubService.enterClubRoom(req, res);
//     }
// })
//修改俱乐部部公告
app.get('/rewrite_club_notice', (req, res) => {
    if (check_account(req, res)) {
        clubService.rewriteClubNotice(req, res);
    }
})


/**
 * 2018-06-15 update by hyw
 */
//俱乐部部长赠送俱乐部货币道具
app.get('/give_away_club_golds', (req, res) => {
    if (!check_account(req, res)) {
        http.send(res, 1, "非法请求")
        return
    }

    let user_id = req.query.user_id;
    let contributor = req.query.contributor;
    let club_id = req.query.club_id;
    if (!user_id || !contributor || !club_id) {
        http.send(res, 1, "参数错误");
        return;
    }
    if (user_id == contributor) {
        http.send(res, 1, "自己对自己暂不支持转赠");
        return;
    }
    let golds_count = parseInt(req.query.golds_count);
    if (Number.isNaN(golds_count) == true || golds_count < 0) {
        http.send(res, 1, "赠送数量有误");
        return;
    }

    async.auto({
        //获取赠送人的信息
        receiverInfo: function (callback) {
            playerService.getPlyaerInfoById(user_id, callback);
        },
        //获取接收人的信息
        senderInfo: function (callback) {
            playerService.getPlyaerInfoById(contributor, callback);
        }
    }, function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "服务器错误,请稍后重试!")
            return
        } else {
            var senderInfo = result.senderInfo;
            var receiverInfo = result.receiverInfo;

            if (senderInfo.gems < golds_count) {
                http.send(res, 1, "房卡数量不足!")
                return
            }

            //更新房卡数量，保存银商流水信息
            async.auto({
                grant: function (callback) {
                    playerService.grantTreasure(senderInfo, receiverInfo, 'gems', golds_count, callback);
                },
                saveTransferRecord: function (callback) {
                    var transferRecord = {};
                    transferRecord.sender_id = senderInfo.userid;
                    transferRecord.sender_name = senderInfo.name;
                    transferRecord.send_before = senderInfo.gems;
                    transferRecord.receiver_id = receiverInfo.userid;
                    transferRecord.receiver_name = receiverInfo.name;
                    transferRecord.receive_before = receiverInfo.gems;
                    transferRecord.transfer_type = 'gems';
                    transferRecord.service_fee_rate = 0;
                    transferRecord.transfer_count = golds_count;
                    transferRecord.service_fee = 0;
                    transferRecord.actual_sum = 0;
                    transferRecord.transfer_time = dateUtil.getCurrentTimestapm();
                    transferRecordService.saveTransferRecord(transferRecord, callback);
                },
                //給獲贈人發送通知
                sendNotice: function (callback) {
                    var notification = {};
                    notification.title = '您收到了赠送的房卡';
                    notification.content = '您收到了俱乐部中' + crypto.fromBase64(senderInfo.name) + '[' + senderInfo.userid + ']赠送给您的' + golds_count + '张房卡';
                    notification.status = 0;
                    notification.to_user = receiverInfo.userid;
                    notification.to_username = receiverInfo.name;
                    notification.type = 'sys';
                    notification.create_time = dateUtil.getCurrentTimestapm();
                    noticeService.saveNotification(notification, callback);
                }
            }, function (err, returnRes) {
                if (err) {
                    console.log(err);
                    http.send(res, 1, "服务器错误,请稍后重试!")
                    return
                } else {
                    http.send(res, 0, '赠送成功');
                }
            });
        }
    });
})


//玩家被公会管理员踢出公会
app.get('/had_left_club', (req, res) => {
    if (check_account(req, res)) {
        clubService.hadLeftClub(req, res);
    }
})
//俱乐部部长赠送俱乐部货币道具
app.get('/get_all_club_user_info_by_club_id', (req, res) => {
    if (check_account(req, res)) {
        clubService.getAllClubUserInfoByClubId(req, res);
    }
})
//获取玩家加入的俱乐部id
app.get('/get_club_id_by_user_id', (req, res) => {
    if (check_account(req, res)) {
        clubService.getClubIdByUserId(req, res);
    }
})
//通过俱乐部id获取俱乐部信息
app.get('/get_club_info', (req, res) => {
    if (check_account(req, res)) {
        clubService.getClubInfo(req, res);
    }
})


app.get('/search_club', (req, res) => {
    if (check_account(req, res)) {
        clubService.searchClub(req, res);
    }
})



/////////////////////////2018-06-15新增 普通代理赠送房卡功能 update by hyw///////////////////////////////////////////////

/**
 * 根据用户ID获取用户信息
 */
app.get('/get_player_info', function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "非法请求")
        return
    }

    var user_id = req.query.user_id;
    var grant_count = req.query.grant_count;
    if (!user_id || !grant_count) {
        http.send(res, 1, "请求参数错误")
        return
    }
    //根据ID查询用户信息
    playerService.getPlyaerInfoById(user_id, function (err, playerInfo) {
        if (err) {
            console.log(err);
            http.send(res, 1, "服务器错误,请稍后重试!")
            return
        } else {
            if (playerInfo) {
                http.send(res, 0, playerInfo);
            } else {
                http.send(res, 1, "玩家不存在!")
            }

        }
    })
});

/**
 * 赠送房卡
 */
app.get('/grant_gems', function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "非法请求")
        return
    }

    var sender = req.query.sender;
    var receiver = req.query.receiver;
    var grant_count = parseInt(req.query.grant_count);
    if (!sender || !receiver) {
        http.send(res, 1, "用户信息错误")
        return
    }

    /**
     * 若赠送者与接受者ID一致
     */
    if (sender == receiver) {
        http.send(res, 1, "自己对自己暂不支持转账")
        return
    }

    if (Number.isNaN(grant_count) || grant_count < 0) {
        http.send(res, 1, "房卡数量不正确")
        return
    }

    async.auto({
        //获取赠送人的信息
        senderInfo: function (callback) {
            playerService.getPlyaerInfoById(sender, callback);
        },
        //获取接收人的信息
        receiverInfo: function (callback) {
            playerService.getPlyaerInfoById(receiver, callback);
        }
    }, function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "服务器错误,请稍后重试!")
            return
        } else {
            var senderInfo = result.senderInfo;
            var receiverInfo = result.receiverInfo;

            if (!receiverInfo || !senderInfo) {
                http.send(res, 1, "玩家不存在!")
                return
            }

            // if (senderInfo.user_type != 2) {
            //     http.send(res, 1, "该玩家不能赠送房卡!")
            //     return
            // }

            if (senderInfo.gems < grant_count) {
                http.send(res, 1, "房卡数量不足!")
                return
            }

            //更新房卡数量，保存银商流水信息
            async.auto({
                grant: function (callback) {
                    playerService.grantTreasure(senderInfo, receiverInfo, 'gems', grant_count, callback);
                },
                saveTransferRecord: function (callback) {
                    var transferRecord = {};
                    transferRecord.sender_id = senderInfo.userid;
                    transferRecord.sender_name = senderInfo.name;
                    transferRecord.send_before = senderInfo.gems;
                    transferRecord.receiver_id = receiverInfo.userid;
                    transferRecord.receiver_name = receiverInfo.name;
                    transferRecord.receive_before = receiverInfo.gems;
                    transferRecord.transfer_type = 'gems';
                    transferRecord.service_fee_rate = 0;
                    transferRecord.transfer_count = grant_count;
                    transferRecord.service_fee = 0;
                    transferRecord.actual_sum = grant_count;
                    transferRecord.transfer_time = dateUtil.getCurrentTimestapm();
                    transferRecordService.saveTransferRecord(transferRecord, callback);
                },
                //給獲贈人發送通知
                sendNotice: function (callback) {
                    var notification = {};
                    notification.title = '收到了好友赠送的房卡';
                    notification.content = '您的好友' + crypto.fromBase64(senderInfo.name) + '[' + senderInfo.userid + ']赠送了您' + grant_count + '张房卡';
                    notification.status = 0;
                    notification.to_user = receiverInfo.userid;
                    notification.to_username = receiverInfo.name;
                    notification.type = 'sys';
                    notification.create_time = dateUtil.getCurrentTimestapm();
                    noticeService.saveNotification(notification, callback);
                }
            }, function (err, returnRes) {
                if (err) {
                    console.log(err);
                    http.send(res, 1, "服务器错误,请稍后重试!")
                    return
                } else {
                    http.send(res, 0, '赠送成功');
                }
            });
        }
    });
});

/**
 * 赠送金币
 */
app.get('/grant_coins', async function (req, res) {
    if (!check_account(req, res)) {
        return
    }

    var sender = req.query.sender;
    var receiver = req.query.receiver;
    var grant_count = parseInt(req.query.grant_count);
    if (!sender || !receiver) {
        http.send(res, 1, "用户信息错误")
        return
    }
    /**
     * 若赠送者与接受者ID一致
     */
    if (sender == receiver) {
        http.send(res, 1, "自己对自己暂不支持转账")
        return
    }

    if (Number.isNaN(grant_count)) {
        http.send(res, 1, "金币数量不能为空")
        return
    }
    let mix_grant_coins = await globalCfgService.getByParamKeyAsync("min_transter_limit");
    mix_grant_coins = parseInt(mix_grant_coins)
    if (Number.isNaN(mix_grant_coins)) {
        mix_grant_coins = 10000;
    }
    if (grant_count < mix_grant_coins) {
        http.send(res, 1, "金币数量不能小于:" + mix_grant_coins);
        return
    }
    if (!Number.isInteger(grant_count)) {
        http.send(res, 1, "金币数量必须为整数")
        return
    }

    async.auto({
        //获取赠送人的信息
        senderInfo: function (callback) {
            playerService.getPlyaerInfoById(sender, callback);
        },
        //获取接收人的信息
        receiverInfo: function (callback) {
            playerService.getPlyaerInfoById(receiver, callback);
        }
    }, function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "服务器错误,请稍后重试!")
            return
        } else {
            var senderInfo = result.senderInfo;
            var receiverInfo = result.receiverInfo;

            if (!receiverInfo || !senderInfo) {
                http.send(res, 1, "玩家不存在!")
                return
            }

            //zhang
            if ((senderInfo.coins-grant_count) < 100000) {
                http.send(res, 1, "账户中至少需要剩余10万金币!")
                return
            }


            let senderOfCoins = coinService.getUserInfo(senderInfo.userid);
            if (senderInfo.roomid != null || (senderOfCoins != null && senderOfCoins.is_gaming)) {
                http.send(res, 1, "您目前在游戏中，无法打赏!")
                return
            }
            let receiverOfCoins = coinService.getUserInfo(receiverInfo.userid);
            if (receiverInfo.roomid != null || (receiverOfCoins != null && receiverOfCoins.is_gaming)) {
                http.send(res, 1, "被打赏玩家目前在游戏中，无法打赏!")
                return
            }
            //老司机所有玩家可以赠送金币 2018.8.10
            // if (senderInfo.user_type != 3 /*&& senderInfo.user_type != 2*/) {
            //     http.send(res, 1, "该玩家不能赠送金币!")
            //     return
            // }

            if (senderInfo.coins < grant_count) {
                http.send(res, 1, "金币数量不足!")
                return
            }

            //更新金币数量，保存银商流水信息
            async.auto({
                grant: function (callback) {
                    playerService.grantTreasure(senderInfo, receiverInfo, 'coins', grant_count, callback);
                },
                saveTransferRecord: function (callback) {
                    var transferRecord = {};
                    transferRecord.sender_id = senderInfo.userid;
                    transferRecord.sender_name = senderInfo.name;
                    transferRecord.send_before = senderInfo.coins;
                    transferRecord.receiver_id = receiverInfo.userid;
                    transferRecord.receiver_name = receiverInfo.name;
                    transferRecord.receive_before = receiverInfo.coins;
                    transferRecord.transfer_type = 'coins';
                    transferRecord.service_fee_rate = 0;
                    transferRecord.transfer_count = grant_count;
                    transferRecord.service_fee = 0;
                    transferRecord.actual_sum = grant_count;
                    transferRecord.transfer_time = dateUtil.getCurrentTimestapm();
                    transferRecordService.saveTransferRecord(transferRecord, callback);
                },
                //給獲贈人發送通知
                sendNotice: function (callback) {
                    var notification = {};
                    notification.title = '收到了好友打赏的金币';
                    notification.content = '您的好友' + crypto.fromBase64(senderInfo.name) + '[' + senderInfo.userid + ']打赏了您' + grant_count + '个金币';
                    notification.status = 0;
                    notification.to_user = receiverInfo.userid;
                    notification.to_username = receiverInfo.name;
                    notification.type = 'sys';
                    notification.create_time = dateUtil.getCurrentTimestapm();
                    noticeService.saveNotification(notification, callback);
                }
            }, function (err, returnRes) {
                if (err) {
                    console.log(err);
                    http.send(res, 1, "服务器错误,请稍后重试!")
                    return
                } else {
                    http.send(res, 0, '打赏成功');
                }
            });
        }
    });
});

/**
 * 赠送礼物
 */
app.get('/grant_gift', function (req, res) {
    if (!check_account(req, res)) {
        return
    }

    var sender = req.query.sender;
    var receiver = req.query.receiver;
    var data = JSON.parse(req.query.data);

    if (!sender || !receiver) {
        http.send(res, 1, "请求参数错误")
        return
    }

    /**
     * 若赠送者与接受者ID一致
     */
    if (sender == receiver) {
        http.send(res, 1, "自己对自己暂不支持转账")
        return
    }
    let data_length = 0;
    for (const key in data) {
        data[key] = parseInt(data[key]);
        if (Number.isNaN(data[key]) || data[key] == 0) {
            delete data[key]
        } else if (data[key] < 0) {
            http.send(res, 1, "赠送数量不正确")
            return
        }
        else {
            data_length++;
        }
    }

    if (data_length == 0) {
        http.send(res, 1, "未输入商品数量")
        return
    }

    async.auto({
        //获取赠送人的信息
        sender_info: function (callback) {
            playerService.getPlyaerInfoById(sender, callback);
        },
        //获取接收人的信息
        receiver_info: function (callback) {
            playerService.getPlyaerInfoById(receiver, callback);
        },
        shop_gifts(callback) {
            rechargeService.getShopInfoByType("gift", callback);
        },
        sender_gifts(callback) {
            playerService.getUserBackpackByType(sender, 'gift', callback);
        },
        receiver_gifts(callback) {
            playerService.getUserBackpackByType(receiver, 'gift', callback);
        },
    }, (err, result) => {
        if (err) {
            http.send(res, 1, "服务器内部错误");
            console.error(err);
            return
        }
        let sender_info = result.sender_info;
        let receiver_info = result.receiver_info;
        let shop_gifts = result.shop_gifts;
        let sender_gifts = result.sender_gifts;
        let receiver_gifts = result.receiver_gifts;
        if (sender_info == null || sender_info.account != req.query.account || receiver_info == null) {
            http.send(res, 1, "当前玩家不存在");
            return;
        }
        //被赠送者背包物品，用来判断mysql 是 insert 还是update
        //和存储时礼物的名字{{name,item}}
        let items = {}
        //赠送的礼物提示
        let send_msg = "";
        let save_msg = '您的好友' + crypto.fromBase64(sender_info.name) + '[' + sender_info.userid + ']赠送了您';
        //检查能否赠送
        for (const gift_id in data) {
            let shop_gift = null;
            let sender_gift = null;
            let receiver_gift = null;
            //查询商品
            for (let i = 0; i < shop_gifts.length; i++) {
                if (shop_gifts[i].id == gift_id) {
                    shop_gift = shop_gifts[i];
                    break;
                }
            }
            //查询赠送者背包
            for (let i = 0; i < sender_gifts.length; i++) {
                if (sender_gifts[i].items_id == gift_id) {
                    sender_gift = sender_gifts[i];
                    break;
                }
            }
            //查询接收者背包
            for (let i = 0; i < receiver_gifts.length; i++) {
                if (receiver_gifts[i].items_id == gift_id) {
                    receiver_gift = receiver_gifts[i];
                    break;
                }
            }
            if (shop_gift == null) {
                http.send(res, 1, "当前物品不存在");
                return;
            }

            if (shop_gift.type != "gift" || shop_gift.buy_fun != "coins") {
                http.send(res, 1, "赠送物品种类错误");
                return;
            }

            if (sender_gift == null || sender_gift.items_count < data[gift_id]) {
                http.send(res, 2, `[${shop_gift.name}]不足，无法赠送`);
                return;
            }

            items[gift_id] = {
                name: shop_gift.name,
                item: receiver_gift
            };
        }
        //可以赠送
        for (const gift_id in data) {
            //更新礼物数量，保存银商流水信息
            let gift_name = items[gift_id].name;
            let grant_count = data[gift_id];
            async.auto({
                grant: function (callback) {
                    playerService.grantGift(sender_info, receiver_info, gift_id, grant_count, items[gift_id].item, callback);
                },
                saveTransferRecord: function (callback) {
                    var transferRecord = {};
                    transferRecord.granter_id = sender_info.userid;
                    transferRecord.granter_name = sender_info.name;
                    transferRecord.gift_id = gift_id;
                    transferRecord.receiver_id = receiver_info.userid;
                    transferRecord.receiver_name = receiver_info.name;
                    transferRecord.grant_count = grant_count;
                    transferRecord.gift_name = gift_name
                    transferRecord.remark = `${crypto.fromBase64(sender_info.name)}[${sender_info.userid}]赠送了${grant_count}个${gift_name}给${crypto.fromBase64(receiver_info.name)}[${receiver_info.userid}]`;
                    transferRecord.grant_time = dateUtil.getCurrentTimestapm();
                    transferRecordService.saveGiftGrantRecord(transferRecord, callback);
                },
                //給獲贈人發送通知
                // sendNotice: function (callback) {
                //     var notification = {};
                //     notification.title = '收到了好友赠送的礼物';
                //     notification.content = '您的好友' + crypto.fromBase64(sender_info.name) + '[' + sender_info.userid + ']赠送了您' + grant_count + '个' + gift_name;
                //     notification.status = 0;
                //     notification.to_user = receiver_info.userid;
                //     notification.to_username = receiver_info.name;
                //     notification.type = 'sys';
                //     notification.create_time = dateUtil.getCurrentTimestapm();
                //     noticeService.saveNotification(notification, callback);
                // }
            }, function (err, returnRes) {
                data_length--;
                if (err) {
                    console.log(err);
                    send_msg += `赠送${grant_count}个${gift_name}失败。`;
                } else {
                    save_msg += `${grant_count}个${gift_name}.`;
                    send_msg += `赠送${grant_count}个${gift_name}成功。`;
                }
                if (data_length == 0) {
                    var notification = {};
                    notification.title = '收到了好友赠送的礼物';
                    notification.content = save_msg;
                    notification.status = 0;
                    notification.to_user = receiver_info.userid;
                    notification.to_username = receiver_info.name;
                    notification.type = 'sys';
                    notification.create_time = dateUtil.getCurrentTimestapm();
                    noticeService.saveNotification(notification, (err, results) => {
                        http.send(res, 0, send_msg);
                    });
                }
                else {
                    send_msg += "\n";
                }
            });
        }
    });
});
/////////////////////////2018-06-13新增 update by hyw///////////////////////////////////////////////

/**
 * 根据玩家ID获取个人签到记录
 */
app.get('/get_signin_record', function (req, res) {
    // if (!check_account(req, res)) {
    //     http.send(res, 1, "请求不合法")
    //     return
    // }
    let userId = req.query.userId;
    if (!userId) {
        http.send(res, 1, "参数错误")
        return
    }



    //获取今天的时间串
    let today = dateUtil.dateFormat(new Date(), 'yyyyMMdd');
    //获取昨天的时间串
    let yesterday = dateUtil.getYesterdayTime('yyyyMMdd');

    async.auto({
        //获取签到配置信息
        signInConfigs: function (callback) {
            activityService.getSignInConfig(callback);
        },
        //获取最近一次签到日期
        lastSignIn: function (callback) {
            activityService.getLastSignInTime(userId, callback);
        }
    }, function (err, result) {
        if (err) {
            console.log('错误信息:' + err);
            http.send(res, 1, "获取签到信息出错");
            return
        } else {
            if (result) {
                var signInConfigs = result.signInConfigs;
                var lastSignIn = result.lastSignIn;
                console.log("lastSignIn",lastSignIn)
                if(!lastSignIn){
                    var signInfo;
                }else{
                    var signInfo = lastSignIn.signInfo;
                    console.log("signInfo1",signInfo)
                }
                console.log("signInfo",signInfo)
                if(!signInfo){
                    signInfo={1:-1,2:-1,3:-1,4:-1,5:-1,6:-1,7:-1}
                }else{
                    signInfo = JSON.parse(signInfo)
                }
                console.log(123)
                //今天的签到状态 0 未签到 1 已签到
                var today_sign_in_flag = 0;
                //已经连续签到的次数
                var signTimes = 0;
                //判断之前是否有签到记录
                if (lastSignIn) {
                    var lastSignInTime = lastSignIn.last_sign_time;
                    //若最近一次签到记录时间等于今天的日期，说明已经签到过
                    if (lastSignInTime == today) {
                        today_sign_in_flag = 1;

                        signTimes = lastSignIn.current_sign_in;
                    } else {
                        //判断是否连续签到了
                        if (yesterday == lastSignInTime) {
                            signTimes = lastSignIn.current_sign_in;
                            //已经连续签到七天
                            if (signTimes == 7) {
                                signTimes = 0;
                            }
                        } else {
                            //未重新签到，重新开始
                            signTimes = 0;
                        }
                    }
                }


                //组装用户的签到数据
                for (var i = 0; i < signInConfigs.length; i++) {
                    //已签到
                    if (signTimes > i) {
                        signInConfigs[i].sign_flag = 1;
                    } else {//未签到
                        signInConfigs[i].sign_flag = 0;
                    }
                }


                var returnData = {};
                returnData.today_sign_flag = today_sign_in_flag;
                returnData.sign_record = signInConfigs;
                returnData.signTimes = 1;
                returnData.coins = (signTimes+1) *200;
                let num=0;
                for(let i in signInfo){
                    if (signInfo[i]==1){
                        num=i;
                    }
                }
                if(num==7){
                    num=0
                }
                for(let i in signInfo){
                    if(i>num){
                        signInfo[i] = -1
                    }
                }

                returnData.signInfo = signInfo;
                returnData.now = num+1;
                http.send(res, 0, "ok", returnData)
            } else {
                http.send(res, 1, "未获取签到配置信息");
                return
            }
        }
    });
});

/**
 * 签到
 */
app.get('/sign_in', function (req, res) {
    // if (!check_account(req, res)) {
    //     http.send(res, 1, "请求不合法")
    //     return
    // }
    let userId = req.query.userId;
    if (userId == null) {
        http.send(res, 1, "参数错误")
        return
    }
    //连续第几天
    
    let days = req.query.days;
    if (days == null) {
        http.send(res, 1, "参数错误")
        return
    }
    //客户端是从0开始的
    days = parseInt(days);
    console.log('*****第【' + days + '】天签到');
    //获取今天的时间串
    let today = dateUtil.dateFormat(new Date(), 'yyyyMMdd');
    let coins=0;
    async.auto({
        //获取玩家信息
        playerInfo: function (callback) {
            playerService.getPlyaerInfoById(userId, callback);
        },
        //根据连续签到的天数获取对应的配置信息
        signInConfig: function (callback) {
            activityService.getSignInConfigByDays(days, callback);
        },
        //获取最近一次签到记录
        lastSignIn: function (callback) {
            activityService.getLastSignInTime(userId, callback);
        }
    }, function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "服务器错误,请稍后重试");
            return
        } else {
            var playerInfo = result.playerInfo;
            var lastSignIn = result.lastSignIn;
            var signInConfig = result.signInConfig;

            console.log('获取的签到配置信息:' + JSON.stringify(signInConfig));

            
            var award = signInConfig.award || 0;

            var lastSignInTime = null;
            var signInfo = null;
            var first_sign_time = null;

            if (lastSignIn) {
                lastSignInTime = lastSignIn.last_sign_time;
                signInfo = lastSignIn.signInfo;
                first_sign_time = lastSignIn.first_sign_time//第一天签到的时间
            }

            console.log(lastSignInTime,today,)
            if (lastSignInTime == today) {
                http.send(res, 1, "你在逗我吗?今天你已经签到过了呀!");
                return
            } else {
                if (playerInfo) {
                    if(!signInfo ||!first_sign_time){
                        first_sign_time = new Date().getTime();

                        signInfo={1:-1,2:-1,3:-1,4:-1,5:-1,6:-1,7:-1}
                    }else{
                        signInfo = JSON.parse(signInfo)
                    }
                        let num = 0;
                        console.log("signInfo",signInfo)
                        for(let i in signInfo){
                            console.log(signInfo[i])
                            if(signInfo[i]!==-1){
                                num=i
                                break;
                            }
                        }
                        num = parseInt(num)+1
                        console.log(num,days)
                        if(num!=days){
                            http.send(res, 1, "请点击正确的天数");
                            return;
                        }
                        // signInfo[days]=1;
                        for(let i in signInfo){
                            if(i==days){
                                signInfo[i]=1;
                            }
                        }
                    let last_sign_timeStamp = new Date().getTime();
                    signInfo= JSON.stringify(signInfo);
                    coins = playerInfo.coins
                    console.log("signInfo",signInfo)
                    
                    activityService.signIn(playerInfo, days, award, signInfo,last_sign_timeStamp,function (err, signInRes) {
                        if (err) {
                            console.log("zheli")
                            console.log(err);
                            http.send(res, 1, "服务器错误,请稍后重试");
                            return
                        } else {
                            activityService.updateFST(first_sign_time,userId,function(err,data){
                                console.log("err",err)
                            });
                            activityService.updateFlag("false",function(err,result){
                                if(err){
                                    http.send(res, 1, "mysql 错误,请稍后重试");
                                    return;
                                }
                                if(result){
                                    award = coins+award
                                    http.send(res, 0, "签到成功",{flag:"false",award:award});
                                    return;
                                }
                            })
                            
                        }
                    });
                } else {
                    console.log(err);
                    http.send(res, 1, "用户信息不存在");
                    return
                }
            }
            
            let nowTime = new Date().getTime();
            let timeDiff =nowTime- first_sign_time;
            let dayDiff = timeDiff/3600/24/1000;
            if(dayDiff>=7){
                activityService.updateFST(0,userId,function(err,resu){
                    if(err){
                        
                        http.send(res, 1, "mysql 错误,请稍后重试");
                        return;
                    }
                })
            }
            
        }
    });
});

/**
 * 获取转盘配置信息
 */
app.get('/get_roulette_config', function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "请求不合法")
        return
    }
    let userId = req.query.userId;
    if (userId == null) {
        http.send(res, 1, "参数错误")
        return
    }
    async.auto({
        lottery_draw_times: function (callback) {
            var totalLotteryDrawTimes = 1;
            activityService.getLastLotteryDramRecord(userId, function (err, record) {
                if (err) {
                    callback(err);
                } else {
                    if (record) {
                        var recordTime = record.record_time;
                        recordTime = dateUtil.timestampToDate(recordTime, 'yyyyMMdd');
                        var today = dateUtil.dateFormat(new Date(), 'yyyyMMdd');
                        //说明今天已经抽奖过
                        if (recordTime == today) {
                            callback(null, 0);
                        } else {
                            callback(null, totalLotteryDrawTimes);
                        }
                    } else {
                        callback(null, totalLotteryDrawTimes);
                    }
                }
            })
        },
        roulette_config: function (callback) {
            activityService.getRouletteConfig(callback);
        }
    }, function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "服务器错误,请稍后重试");
            return
        } else {
            http.send(res, 0, "ok", result);
        }
    });


});

/**
 * 抽奖
 */
app.get('/lottery_draw', function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "请求不合法")
        return
    }
    let userId = req.query.userId;
    if (userId == null) {
        http.send(res, 1, "参数错误")
        return
    }
    //根据配置的中奖概率，返回对应的扇区号
    activityService.getRouletteConfig(function (err, configs) {
        if (err) {
            console.log(err);
            http.send(res, 1, "服务器错误，请稍后重试")
            return
        } else {
            if (configs && configs.length > 0) {
                //总概率基数
                var totalPro = 0;
                //每个奖品的概率区间
                var proSection = [];
                proSection.push(0);

                for (var i = 0; i < configs.length; i++) {
                    var probability = parseInt(configs[i].probability);
                    totalPro += probability;
                    proSection.push(totalPro)
                }
                //从0~总概率值之间获取个随机数，判断随机数在哪个区间值之间
                var range = totalPro - 0;
                var rand = Math.random();
                var randomNum = 0 + Math.round(rand * range); //四舍五入

                //根据概率，返回的抽奖扇区
                var sequence = 1;
                for (var i = 0; i < proSection.length; i++) {
                    if (randomNum >= proSection[i] && randomNum <= proSection[i + 1]) {
                        sequence = i + 1;
                        break;
                    }
                }

                var rouletteConfig = configs[sequence - 1];
                // 更新用户账户并保存抽奖记录
                playerService.getPlyaerInfoById(userId, function (err, playerInfo) {
                    if (err) {
                        callback(err);
                    } else {
                        async.auto({
                            //更新用户财富信息
                            updateTreasure: function (callback) {
                                var changeCount = rouletteConfig.prize_value;
                                //金币
                                if (rouletteConfig.prize_type == 0) {
                                    playerService.updateTreasure('coins', changeCount, userId, callback);
                                } else {//房卡
                                    playerService.updateTreasure('gems', changeCount, userId, callback);
                                }
                            },
                            //保存抽奖记录
                            saveBankStatement: function (callback) {
                                if (playerInfo) {
                                    var bankStatement = {};
                                    bankStatement.fk_player_id = userId;
                                    bankStatement.username = playerInfo.name;
                                    bankStatement.change_type = 7;
                                    if (rouletteConfig.prize_type == 0) {
                                        bankStatement.change_before = playerInfo.coins;
                                        bankStatement.remark = '幸运大转盘抽奖获得金币奖励' + rouletteConfig.prize_value + '个';
                                        bankStatement.treasure_type = "coins";
                                    } else {
                                        bankStatement.change_before = playerInfo.gems;
                                        bankStatement.remark = '幸运大转盘抽奖获得房卡奖励' + rouletteConfig.prize_value + '张';
                                        bankStatement.treasure_type = "gems";
                                    }
                                    bankStatement.change_count = rouletteConfig.prize_value;
                                    bankStatement.record_time = dateUtil.getCurrentTimestapm();
                                    activityService.saveBankStatement(bankStatement, callback);
                                } else {
                                    callback(null, null);
                                }
                            }
                        }, function (err, result) {
                            if (err) {
                                console.log(err);
                                http.send(res, 1, "服务器错误，请稍后重试")
                                return
                            } else {
                                http.send(res, 0, "ok", rouletteConfig);
                            }
                        });
                    }
                })
            } else {
                http.send(res, 1, "未获取到转盘配置信息")
                return
            }
        }
    });
});

//从商城用金币购买礼物
app.get('/buy_something_from_shop', (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    let user_id = req.query.user_id;
    var data = JSON.parse(req.query.data);
    var type = req.query.type;

    if (user_id == null) {
        http.send(res, 1, "用户id有误");
        return;
    }
    //老司机不购买实物 2018.8.10
    if (/*type != "goods" && */type != "gift") {
        http.send(res, 1, "种类有误");
        return;
    }

    let data_length = 0;
    for (const key in data) {
        data[key] = parseInt(data[key]);
        if (Number.isNaN(data[key]) || data[key] == 0) {
            delete data[key]
        } else if (data[key] < 0) {
            http.send(res, 1, "数量有误")
            return
        }
        else {
            data_length++;
        }
    }

    if (data_length == 0) {
        http.send(res, 1, "输入数量")
        return
    }

    async.auto({
        user_info(callback) {
            playerService.isUserExist(user_id, callback);
        },
        shop_gifts(callback) {
            rechargeService.getShopInfoByType(type, callback);
        }
    }, (err, result) => {
        if (err) {
            http.send(res, 1, "服务器内部错误");
            console.error(err);
            return
        }
        let user_info = result.user_info;
        let shop_gifts = result.shop_gifts;
        if (user_info == null || user_info.account != req.query.account) {
            http.send(res, 1, "当前玩家不存在");
            return;
        }
        if (user_info.user_type == 3 && type == "goods") {
            http.send(res, 1, "不能兑换");
            return;
        }
        let items = {}
        //购买的礼物提示
        let send_msg = ""
        let total_price = 0;
        //检查能否购买
        for (const gift_id in data) {
            let shop_gift = null;
            //查询商品
            for (let i = 0; i < shop_gifts.length; i++) {
                if (shop_gifts[i].id == gift_id) {
                    shop_gift = shop_gifts[i];
                    break;
                }
            }

            if (shop_gift == null) {
                http.send(res, 1, "当前物品不存在");
                return;
            }

            if (shop_gift.type != type || shop_gift.buy_fun != "coins") {
                http.send(res, 1, "购买物品种类错误");
                return;
            }
            total_price += shop_gift.price * data[gift_id];
            items[gift_id] = {
                name: shop_gift.name,
                price: shop_gift.price,
            };
        }

        if (user_info.coins < total_price) {
            http.send(res, 2, "金币不足");
            return;
        }
        //可以购买
        for (const gift_id in data) {
            //更新礼物数量，保存银商流水信息
            let gift_name = items[gift_id].name;
            let buy_count = data[gift_id];
            let cost = items[gift_id].price * buy_count;
            async.auto({
                buy_gift_res(callback) {
                    rechargeService.buyGiftFromShop(user_id, gift_id, buy_count, cost, callback);
                },
                save_res: function (callback) {
                    if (type == "gift") {
                        var gift_purchase_record = {};
                        gift_purchase_record.gift_type = type;
                        gift_purchase_record.gift_count = buy_count;
                        gift_purchase_record.cost_coins = -cost;
                        gift_purchase_record.player_id = user_id;
                        gift_purchase_record.recharge_time = dateUtil.getCurrentTimestapm();
                        gift_purchase_record.player_name = user_info.name;
                        gift_purchase_record.gift_name = gift_name;
                        gift_purchase_record.gift_id = gift_id;
                        rechargeService.saveGiftPurchaseRecord(gift_purchase_record, callback);
                    }
                    else if (type == "goods") {
                        var goods_exchange_record = {};
                        // goods_exchange_record.gift_type = type;
                        goods_exchange_record.player_id = user_id;
                        goods_exchange_record.player_name = user_info.name;
                        goods_exchange_record.exchange_count = buy_count;
                        goods_exchange_record.goods_price = cost;
                        goods_exchange_record.goods_id = gift_id;
                        goods_exchange_record.goods_name = gift_name;
                        goods_exchange_record.exchange_time = dateUtil.getCurrentTimestapm();
                        goods_exchange_record.recipient_tel = parseInt(req.query.recipient_tel);
                        goods_exchange_record.recipient_user = req.query.recipient_user;
                        rechargeService.saveGoodsExchangeRecord(goods_exchange_record, callback);
                    }
                }
            }, (err, result) => {
                data_length--;
                if (err) {
                    console.log(err);
                    send_msg += `购买${buy_count}个${gift_name}失败。`;
                } else {
                    send_msg += `购买${buy_count}个${gift_name}成功。`;
                }
                if (data_length == 0) {
                    http.send(res, 0, send_msg);
                }
                else {
                    send_msg += "\n";
                }
            })
        }
    })
})

//把礼物兑换成金币
app.get('/exchange_gift_from_shop', (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    let user_id = req.query.user_id;
    var data = JSON.parse(req.query.data);
    var type = "gift";
    if (user_id == null) {
        http.send(res, 1, "用户id有误");
        return;
    }
    if (/*type != "goods" && */type != "gift") {
        http.send(res, 1, "物品种类有误");
        return;
    }
    let data_length = 0;
    for (const key in data) {
        data[key] = parseInt(data[key]);
        if (Number.isNaN(data[key]) || data[key] == 0) {
            delete data[key]
        } else if (data[key] < 0) {
            http.send(res, 1, "数量有误")
            return
        }
        else {
            data_length++;
        }
    }
    if (data_length == 0) {
        http.send(res, 1, "未输入物品数量")
        return
    }
    async.auto({
        user_info(callback) {
            playerService.isUserExist(user_id, callback);
        },
        shop_gifts(callback) {
            rechargeService.getShopInfoByType(type, callback);
        },
        item_infos(callback) {
            playerService.getUserBackpackByType(user_id, type, callback);
        }
    }, (err, result) => {
        if (err) {
            http.send(res, 1, "服务器内部错误");
            console.error(err);
            return
        }
        let user_info = result.user_info;
        let shop_gifts = result.shop_gifts;
        let item_infos = result.item_infos;
        if (user_info == null || user_info.account != req.query.account) {
            http.send(res, 1, "当前玩家不存在");
            return;
        }

        let items = {}
        //赠送的礼物提示
        let send_msg = ""

        //检查能否兑换
        for (const gift_id in data) {
            let shop_gift = null;
            let item_info = null;
            //查询商品
            for (let i = 0; i < shop_gifts.length; i++) {
                if (shop_gifts[i].id == gift_id) {
                    shop_gift = shop_gifts[i];
                    break;
                }
            }
            //查询兑换者背包
            for (let i = 0; i < item_infos.length; i++) {
                if (item_infos[i].items_id == gift_id) {
                    item_info = item_infos[i];
                    break;
                }
            }
            if (shop_gift == null) {
                http.send(res, 1, "当前物品不存在");
                return;
            }
            if (shop_gift.type != type || shop_gift.buy_fun != "coins") {
                http.send(res, 1, "兑换物品种类错误");
                return;
            }
            if (item_info == null || item_info.items_count < data[gift_id]) {
                http.send(res, 2, `[${shop_gift.name}]不足，无法兑换`);
                return;
            }
            items[gift_id] = {
                name: shop_gift.name,
                price: shop_gift.price,
            };
        }
        //可以兑换
        for (const gift_id in data) {
            //更新礼物数量，保存银商流水信息
            let gift_name = items[gift_id].name;
            let exchange_count = data[gift_id];
            let total_price = items[gift_id].price * exchange_count;
            async.auto({
                exchange_gift_res(callback) {
                    rechargeService.exchangeGiftForBackpack(user_id, gift_id, exchange_count, total_price, callback);
                },
                save_res: function (callback) {
                    if (type == "gift") {
                        var gift_exchange_record = {};
                        gift_exchange_record.gift_type = type;
                        gift_exchange_record.player_id = user_id;
                        gift_exchange_record.player_name = user_info.name;
                        gift_exchange_record.gift_count = exchange_count;
                        gift_exchange_record.gift_price = total_price;
                        gift_exchange_record.gift_id = gift_id;
                        gift_exchange_record.gift_name = gift_name;
                        gift_exchange_record.exchange_time = dateUtil.getCurrentTimestapm();
                        rechargeService.saveGiftExchangeRecord(gift_exchange_record, callback);
                    }
                    else if (type == "goods") {
                        // var goods_exchange_record = {};
                        // goods_exchange_record.gift_type = type;
                        // goods_exchange_record.player_id = user_id;
                        // goods_exchange_record.player_name = user_info.name;
                        // goods_exchange_record.exchange_count = exchange_count;
                        // goods_exchange_record.goods_price = total_price;
                        // goods_exchange_record.goods_id = gift_id;
                        // goods_exchange_record.goods_name = gift_name;
                        // goods_exchange_record.exchange_time = dateUtil.getCurrentTimestapm();
                        // goods_exchange_record.recipient_tel = req.query.recipient_tel;
                        // goods_exchange_record.recipient_user = req.query.recipient_user;
                        // rechargeService.saveGoodsExchangeRecord(goods_exchange_record, callback);
                    }
                }
            }, (err, result) => {
                data_length--;
                if (err) {
                    console.log(err);
                    send_msg += `兑换${exchange_count}个${gift_name}失败。`;
                } else {
                    send_msg += `兑换${exchange_count}个${gift_name}成功。`;
                }
                if (data_length == 0) {
                    http.send(res, 0, send_msg);
                }
                else {
                    send_msg += "\n";
                }
            })
        }
    })
})
//获取玩家背包信息
app.get('/get_backpack', (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    let user_id = req.query.user_id;
    if (user_id == null) {
        http.send(res, 1, "用户id有误");
        return;
    }
    playerService.isUserExist(user_id, (err, user_info) => {
        if (err) {
            http.send(res, 1, "服务器内部错误");
            console.error(err);
            return
        }
        if (user_info == null || req.query.account != user_info.account) {
            http.send(res, 1, "用户不存在");
            return
        }
        async.auto({
            items(callback) {
                playerService.getUserBackpackInfo(user_id, callback);
            },
            gifts(callback) {
                rechargeService.getShopInfoByType("gift", callback);
            }
        }, (err, result) => {
            let items_info = result.items;
            let gifts_info = result.gifts;
            if (err || gifts_info == null || gifts_info.length == 0) {
                http.send(res, 1, "服务器内部错误");
                console.error(err);
                return
            }
            if (items_info == null) {
                http.send(res, 1, "用户不存在");
                return
            }
            if (items_info.length == 0) {
                http.send(res, 0, "ok", {
                    items_info: null,
                    gifts_info: gifts_info
                });
            }
            else {
                http.send(res, 0, "ok", {
                    items_info: items_info,
                    gifts_info: gifts_info
                });
            }
        })
    })
})

/********************************2018-06-27 新增俱乐部消息提醒功能 begin************************************/


/**
 * 获取系统公告列表
 */
app.get('/get_sys_notice_list', function (req, res) {
    // if (!check_account(req, res)) {
    //     http.send(res, 1, "请求不合法")
    //     return;
    // }
    noticeService.getSysNoticeList(function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "获取系统公告列表错误")
            return;
        } else {
            var data = {};
            data.rows = result;
            http.send(res, 0, "ok", data)
        }
    })

});
/**
 * 获取系统公告列表
 */
app.get('/get_sys_notice', function (req, res) {
    // if (!check_account(req, res)) {
    //     http.send(res, 1, "请求不合法")
    //     return;
    // }
    noticeService.getSysNoticeList(function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "获取系统公告列表错误")
            return;
        } else {
            var data = {};
            http.send(res, 0, "ok", result[0])
        }
    })

});

app.get("/jubao",function(req,res){
    let userId = req.query.userId;
    let content = req.query.content;
    if(content==null || content==""){
        http.send(res, 1, "请填写举报内容")
        return;
    }
    if (!userId) {
        http.send(res, 1, "请求参数不完整")
        return;
    }
    if(content.length>255){
        http.send(res, 1, "内容过长请删减为最多255个字符")
        return;
    }
    let dict = {userId:userId,content:content}
    commonService.savejubao(dict,function(err,result){
        if(err){
            http.send(res, 1, "服务器异常请稍后重试")
            return;
        }
        if(result.affectedRows>0){
            http.send(res, 1, "举报成功")
            return;
        }
    })

})
/**
 * 根据玩家ID获取消息通知列表
 */
app.get('/get_notice_list', function (req, res) {

    if (!check_account(req, res)) {
        http.send(res, 1, "请求不合法")
        return;
    }

    var userId = req.query.userId;

    if (!userId) {
        http.send(res, 1, "请求参数不完整")
        return;
    }

    noticeService.getNoticeListByPlayerId(userId, function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "获取消息列表错误")
            return;
        } else {
            var data = {};
            data.rows = result;
            http.send(res, 0, "ok", data)
        }
    })

});

/**
 *  根据消息ID获取消息详情，并设置为已读
 */
app.get('/view_notice', function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "请求不合法")
        return;
    }

    var noticeId = req.query.noticeId;
    if (!noticeId) {
        http.send(res, 1, "请求参数不完整")
        return;
    }

    noticeService.getDetailById(noticeId, function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "获取消息详情错误")
            return;
        } else {
            http.send(res, 0, "ok")
        }
    })

});

/**
 * 根据ID删除公告
 */
app.get('/del_notice', function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "请求不合法")
        return;
    }

    var noticeId = req.query.noticeId;
    if (!noticeId) {
        http.send(res, 1, "请求参数不完整")
        return;
    }


    noticeService.delNotification(noticeId, function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "获取消息详情错误")
            return;
        } else {
            if (result.affectedRows > 0) {
                http.send(res, 0, "ok")
            } else {
                http.send(res, 1, "删除失败，请稍后重试")
            }
        }
    })
});


/**
 * 根据用户的俱乐部ID获取俱乐部申请列表
 */
app.get('/get_club_apply_list', function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "请求不合法")
        return;
    }

    var clubId = req.query.clubId;
    if (!clubId) {
        http.send(res, 1, "请求参数不完整")
        return;
    }


    clubMgrService.getApplyListByClubId(clubId, function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "获取申请列表错误")
            return;
        } else {
            var data = {};
            data.rows = result;
            http.send(res, 0, "ok", data)
        }
    });


});

/**
 * 处理用户的加入申请
 */
app.get('/deal_join_apply', function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "请求不合法")
        return;
    }

    var applyId = req.query.applyId;
    //拒绝或者同意  0 决绝 1 同意
    var action = req.query.action;
    if (!applyId || action == 'undefined') {
        http.send(res, 1, "请求参数不完整")
        return;
    }

    //同意加入
    if (action == 1) {
        clubMgrService.agreeJoinClub(applyId, function (err, result) {
            if (err) {
                console.log(err);
                http.send(res, 1, "服务器错误，请稍后重试")
                return;
            } else {
                if (result == 1) {
                    http.send(res, 0, "ok");
                } else {
                    http.send(res, 1, "操作失败，请稍后重试")
                }
            }
        });
    } else {
        clubMgrService.refuseJoinClub(applyId, function (err, result) {
            if (err) {
                console.log(err);
                http.send(res, 1, "服务器错误，请稍后重试")
                return;
            } else {
                if (result == 1) {
                    http.send(res, 0, "ok");
                } else {
                    http.send(res, 1, "操作失败，请稍后重试")
                }
            }
        });
    }
});


app.get("/destroy_club",function(req,res){
    let userId = req.query.userId;
    
})
/**
 * 俱乐部中获取转账信息列表
 */
app.get('/get_transfer_record', function (req, res) {

    if (!check_account(req, res)) {
        http.send(res, 1, "请求不合法")
        return;
    }

    var userId = req.query.userId;
    if (!userId) {
        http.send(res, 1, "请求参数不完整")
        return;
    }

    var queryEntity = {};
    queryEntity.sender_id = userId;
    queryEntity.transfer_type = 'gems';

    var pagenum = 0;
    var pagesize = 50;

    transferRecordService.getTransferRecord(pagenum, pagesize, queryEntity, function (err, result) {
        if (err) {
            console.log(err);
            http.send(res, 1, "获取消息列表错误")
            return;
        } else {
            var data = {};
            data.rows = result;
            http.send(res, 0, "ok", data)
        }
    })
});

//修改金币场的机器人胜率
app.get('/ws/set_difficulty_degree/:room_code/:difficulty_degree/:player_ctrl_param', (req, res) => {
    cacheUtil.del(constants.CACHE_COINS_GAME_CONFIG);
    coinService.setDifficultyDegree(req, res);
})
//更新对应金币场config
app.get('/ws/update_coins_config/:room_code', async (req, res) => {
    await cacheUtil.delAsync(constants.CACHE_COINS_GAME_CONFIG);
    coinService.updateCoinsConfig(req, res);
})
/**
 * 根据玩家的ID删除redis中缓存的管控参数
 */
app.get('/ws/update_control_param/:user_id', function (req, res) {
    var user_id = req.params.user_id;
    if (!user_id) {
        http.send(res, 1, "请求不合法")
        return;
    }
    //刪除緩存記錄
    // let key = 't_user.' + user_id + '.ctrl_param';
    // cacheUtil.del(key);
    // http.send(res, 0, "ok")
    coinService.updateCtrlRatio(req, res);
})
//转发给子游戏，更新房间配置信息
app.get('/ws/update_room_cfg/:roomId/:isDaiKai', async function (req, res) {
    let roomid = parseInt(req.params.roomId);
    let isDaiKai = req.params.isDaiKai;
    if (Number.isNaN(roomid)) {
        http.send(res, 1, "房间号错误");
        return
    }
    room_service.wsUpdateRoomCfg(roomid, isDaiKai, (code, msg) => {
        http.send(res, code, msg);
    })
})
//转发给子游戏，解散房间
app.get('/ws/dismiss_room/:roomId', async function (req, res) {
    let roomid = parseInt(req.params.roomId);
    if (Number.isNaN(roomid)) {
        http.send(res, 1, "房间号错误");
        return
    }
    room_service.wsDismissRoom(roomid, (code, msg) => {
        http.send(res, code, msg);
    })
})
//获取道具信息
app.get('/get_prop', (req, res) => {
    if (!check_account(req, res)) {
        http.send(res, 1, "请求不合法")
        return;
    }
    rechargeService.getShopsByType("prop", (err, props) => {
        if (err) {
            console.error(err);
            http.send(res, 1, "服务器内部错误")
            return
        }
        if (props == null) {
            http.send(res, 1, "无当前道具")
        } else {
            http.send(res, 0, "0k", {
                props: props
            })
        }
    })
})

//设置个人宣言
app.get('/set_user_manifesto', async (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    let manifesto = req.query.manifesto;
    if (typeof manifesto !== "string") {
        http.send(res, 1, "个人宣言输入有误");
        return;
    }
    try {
        await playerService.setUserInfoByKeyAsync(req.query.account, { manifesto: manifesto });
        http.send(res, 0, "设置成功");
    } catch (error) {
        console.log(error);
        http.send(res, 1, "内部错误");
    }
})

/**
 * 根据roomId 获取房间配置信息
 *
 */
app.get('/get_room_info',async (req, res)=>{
    if (!check_account(req, res)) {
        return;
    }
    let roomId = req.query.roomId;
    if(!roomId){
        http.send(res, 1, "参数错误");
        return;
    }

    let roomResult = await commonService.getTableValuesAsync("*", "t_rooms", { id: roomId });
    if(!roomResult){
        http.send(res, 1, "房间不存在");
        return;
    }
    let room_conf = JSON.parse(roomResult.base_info);
    let kindId = room_conf.kindId;
    if (kindId == '201' || kindId == '202') {
        // 删除不需要传给客户端的房间属性
        delete room_conf.rc;
        delete room_conf.prosperity1;
        delete room_conf.prosperity2;
        delete room_conf.affluence1;
        delete room_conf.affluence2;
        delete room_conf.validChip1;
        delete room_conf.validChip2;
        delete room_conf.heroism;
        delete room_conf.RMC;
        delete room_conf.RRC;
        delete room_conf.AHP;
        delete room_conf.ESP;
        delete room_conf.RMB;
        delete room_conf.RMP;
        delete room_conf.RRB;
        delete room_conf.EOF;
        delete room_conf.trialCoins;
    }
    http.send(res, 0, "ok", room_conf);
});



//通过kind_id获取游戏房间列表
app.get('/get_public_rooms', async (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    let kindId = req.query.kindId;
    let pagePos = parseInt(req.query.pagePos);
    let pageSize = parseInt(req.query.pageSize);
    if (typeof kindId !== "string" || Number.isNaN(pagePos) || Number.isNaN(pageSize)) {
        http.send(res, 1, "参数错误");
        return;
    }
    try {
        let results = await gameService.getPublicRoomsAsync(pagePos, pageSize, kindId);
        if (kindId == '201' || kindId == '202') {
            // 推饼无限人数房间处理
            // 给推饼http server 发送请求
            let ip = null;
            let httpPort = null;
            for (let key in room_service.serverMap) {
                if (kindId == room_service.serverMap[key].kindId) {
                    ip = room_service.serverMap[key].ip;
                    httpPort = room_service.serverMap[key].httpPort;
                    break;
                }
            }
            for (let i = 0; i < results.length; i++) {
                let roomId = results[i].id;
                let spcObj = await getSeatlessPlayerCount(ip, httpPort, roomId);
                if (spcObj.errcode == 0) {
                    results[i].seatlessCount = spcObj.seatlessCount;
                }
                else {
                    results[i].seatlessCount = 0;
                }

                // 删除不必要传给客户端的属性
                delete results[i].user_ctrl_param0;
                delete results[i].user_ctrl_param1;
                delete results[i].user_ctrl_param2;
                delete results[i].user_ctrl_param3;
                delete results[i].user_ctrl_param4;
                delete results[i].user_ctrl_param5;
                delete results[i].user_ctrl_param6;
                delete results[i].user_ctrl_param7;
                delete results[i].user_ctrl_param8;
                delete results[i].user_ctrl_param9;
                delete results[i].user_ctrl_param10;
                delete results[i].user_ctrl_param11;
                delete results[i].uuid;
            }
        }
        http.send(res, 0, "ok", { roomList: results });
    }
    catch (error) {
        console.log(error);
        http.send(res, 1, "内部错误");
    }
})

/**
 * 获取在线玩家信息列表
 * @returns {Promise.<void>}
 */
async function getSeatlessPlayerCount(ip, port, roomId) {
	let sign = crypto.md5(roomId + config.hall_server().ROOM_PRI_KEY);
	return new Promise((resolve, reject) => {
		http.get(ip, port, '/ws/get_seatless_count', {roomId: roomId, sign: sign }, function (ret, data) {
			if (data) {
				resolve(data);
			} else {
				reject('getOnlinePlayerList：请求子服务器错误');
			}
		});
	})
}

//获取佣金
app.get('/get_yong_jin', async (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    try {
        let user = await commonService.getTableValuesAsync('userid,yongjin', "t_users", { account: req.query.account });
        if (user == null) {
            http.send(res, 1, "用户不存在");
            return
        }
        async.auto({
            dayYongJin(callback) {
                agentService.getYongJin(user.userid, "day", callback);
            },
            weekYongJin(callback) {
                agentService.getYongJin(user.userid, "week", callback);
            },
            monthYongJin(callback) {
                agentService.getYongJin(user.userid, "month", callback);
            },
            allYongJin(callback) {
                agentService.getYongJin(user.userid, "all", callback);
            }
        }, (err, result) => {
            if (err) {
                console.log(err);
                http.send(res, 1, "内部错误");
                return
            }
            http.send(res, 0, "ok", {
                weekYongJin: result.weekYongJin || 0,
                monthYongJin: result.monthYongJin || 0,
                allYongJin: result.allYongJin || 0,
                dayYongJin: result.dayYongJin || 0,
                currentYongJin: user.yongjin,
            })
        })
    } catch (error) {
        console.log(error);
        http.send(res, 1, "内部错误");
    }
})
//获取推广
app.get('/get_tui_guang', async (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    try {
        let result = await commonService.getTableValuesAsync('lv1_count,lv2_count,lv3_count',
            "t_users", { account: req.query.account })
        if (result == null) {
            http.send(res, 1, "当前角色不存在");
        }
        else {
            http.send(res, 0, "ok", {
                lv1_count: result.lv1_count,
                lv2_count: result.lv2_count,
                lv3_count: result.lv3_count
            });
        }
    } catch (error) {
        console.log(error);
        http.send(res, 1, "内部错误");
    }
})
//获取直推
app.get('/get_zhi_tui', async (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    try {
        let user = await commonService.getTableValuesAsync('userid', "t_users", { account: req.query.account });
        if (user == null) {
            http.send(res, 1, "用户不存在");
            return
        }
        async.auto({
            dayZhiTui(callback) {
                agentService.getZhiTui(user.userid, "day", callback);
            },
            weekZhiTui(callback) {
                agentService.getZhiTui(user.userid, "week", callback);
            },
            monthZhiTui(callback) {
                agentService.getZhiTui(user.userid, "month", callback);
            },
            allZhiTui(callback) {
                agentService.getZhiTui(user.userid, "all", callback);
            }
        }, (err, result) => {
            if (err) {
                console.log(err);
                http.send(res, 1, "内部错误");
                return
            }
            http.send(res, 0, "ok", {
                dayZhiTui: result.dayZhiTui.length,
                weekZhiTui: result.weekZhiTui.length,
                monthZhiTui: result.monthZhiTui.length,
                allZhiTui: result.allZhiTui.length,
            })
        })
    } catch (error) {
        console.log(error);
        http.send(res, 1, "内部错误");
    }
})
//提现
app.get('/ti_xian', async (req, res) => {
    if (!check_account(req, res)) {
        return;
    }

    /**
     * 只能周二提现
     */
    if(dateUtil.getWeekDayStr()!='星期二'){
        http.send(res, 1, "每周周二才能提现!");
        return
    }

    let count = parseInt(req.query.count);
    if (Number.isNaN(count) || count < 10000) {
        http.send(res, 1, "提取数量不正确");
        return
    }
    try {
        let user = await commonService.getTableValuesAsync('userid,coins,yongjin,name,is_spreader', "t_users", { account: req.query.account });
        if (user == null) {
            http.send(res, 1, "用户不存在");
            return
        }
        if (user.is_spreader == 0) {
            http.send(res, 1, "请联系客服成为推广,才能提取");
            return
        }
        if (user.yongjin < count) {
            http.send(res, 1, "提取数量大于拥有佣金");
            return
        }
        agentService.tiXian(user, count, (err, result) => {
            if (err) {
                console.log(err);
                http.send(res, 1, "内部错误");
            } else {
                http.send(res, 0, "提取成功");
            }
        })
    } catch (error) {
        console.log(error);
        http.send(res, 1, "内部错误");
    }
})
//获取打赏记录
app.get('/get_da_shang_record', async (req, res) => {
    if (!check_account(req, res)) {
        return;
    }
    try {
        let userId = req.query.userId;
        let type = req.query.type;
        let isDaShang = req.query.isDaShang;
        let result = await transferRecordService.getDaShangAsync(userId, type, isDaShang);
        http.send(res, 0, "ok", { isDaShang: isDaShang, daShangRes: result });
    } catch (error) {
        console.log(error);
        http.send(res, 1, "内部错误");
    }
})
/**
 * 获取在线玩家信息列表
 */
app.get('/get_online_player_list', (req, res) => {
    const user_id = req.query.user_id;
    var data = {
        user_id: user_id,
    };
    http.get(config.hall_server().FOR_ROOM_IP, config.hall_server().ROOM_PORT, '/get_online_player_list', data, function (ret, data) {
        if (data.errcode != 0) {
            http.send(res, data.errcode, data.errmsg)
        }
        else {
            //获取麻将金币场的在线玩家
            var mjOnlineList = coinService.getOnlinePlayers();
            data.player_list = data.player_list.concat(mjOnlineList);
            http.send(res, 0, "ok", data);
        }
    })
})


/**
 * 获取游戏的 状态
 */
app.get('/get_game_status', async function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "非法请求")
        return
    }
    let gameList = await gameService.getGameStatusAsync();
    let data = {};
    data.rows = gameList;
    http.send(res, 0,'ok' ,data);
});



/**
 * 根据游戏ID获取房间的状态
 */
app.get('/get_room_status',async function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "非法请求")
        return
    }

    var gameId = req.query.gameId;
    if (!gameId) {
        http.send(res, 1, "请求参数错误")
        return
    }
    let roomList = await commonService.getTableListAsync(null,null,'*','t_room_info',{game_id:gameId});
    let data = {};
    data.rows = roomList;
    http.send(res, 0, data);
});

/*************************************0117新增新年抽奖活动***********************************************/
/**
 * 获取抽奖配置及玩家剩余抽奖次数及中奖信息列表
 */
app.get('/get_choujiang_config', function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "请求不合法")
        return
    }
    let userId = req.query.userId;
    if (userId == null) {
        http.send(res, 1, "参数错误")
        return
    }
    async.auto({
        //可抽奖次数
        lottery_draw_times: function (callback) {
            activityService.getCanChouJiangTimes(userId,callback);
        },
        //转盘配置
        roulette_config: function (callback) {
            activityService.getNewYearRouletteConfig(callback);
        },
        //中奖名单
        winning_list:function(callback){
            activityService.getWinningList(callback);
        }
    }, function (err, result) {
        if (err) {
            http.send(res, 1, "服务器错误,请稍后重试");
            return
        } else {
            http.send(res, 0, "ok", result);
        }
    });
});

/**
 * 幸运抽奖
 */
app.get('/do_choujiang', async function (req, res) {
    if (!check_account(req, res)) {
        http.send(res, 1, "请求不合法")
        return;
    }
    let userId = req.query.userId;
    if (userId == null) {
        http.send(res, 1, "参数错误")
        return;
    }
    let canLuckDrawTimes = await activityService.getCanChouJiangTimesAsync(userId);
    if(canLuckDrawTimes==0){
        http.send(res, 1, "您的抽奖次数已使用完毕，请参与游戏或推荐玩家来获得更多的抽奖次数！")
        return;
    }
    //根据配置的中奖概率，返回对应的扇区号
    activityService.getNewYearRouletteConfig(function (err, configs) {
        if (err) {
            http.send(res, 1, "服务器错误，请稍后重试");
            return;
        } else {
            if (configs && configs.length > 0) {
                var rouletteConfig = null;
                //可以在这里加入控制总发放抽奖金币量
                //获取今日已被抽取的金币量
                var todayTotalGrantCoins = activityService.getTodayTotalGrantCoinAsync();
                //如果超过限额量，则只可抽中房卡,否则按照配置的概率赠送
                if(todayTotalGrantCoins>=8660000){
                     var gemsRoulette = [];
                    for (var i = 0; i < configs.length; i++) {
                        //奖品类型 0 金币 1 房卡
                        if(configs[i].prize_type==1){
                            gemsRoulette.push(configs[i]);
                        }
                    }
                    var randomNum = commonUtil.randomFrom(0,gemsRoulette.length-1);
                    rouletteConfig = gemsRoulette[randomNum];
                }else{
                    //总概率基数
                    var totalPro = 0;
                    //每个奖品的概率区间
                    var proSection = [];
                    proSection.push(0);

                    for (var i = 0; i < configs.length; i++) {
                        var probability = parseInt(configs[i].probability);
                        totalPro += probability;
                        proSection.push(totalPro)
                    }
                    //从0~总概率值之间获取个随机数，判断随机数在哪个区间值之间
                    var range = totalPro - 0;
                    var rand = Math.random();
                    var randomNum = 0 + Math.round(rand * range); //四舍五入

                    //根据概率，返回的抽奖扇区
                    var sequence = 1;
                    for (var i = 0; i < proSection.length; i++) {
                        if (randomNum >= proSection[i] && randomNum <= proSection[i + 1]) {
                            sequence = i + 1;
                            break;
                        }
                    }
                    rouletteConfig = configs[sequence - 1];
                }

                // 更新用户账户并保存抽奖记录
                playerService.getPlyaerInfoById(userId, function (err, playerInfo) {
                    if (err) {
                        callback(err);
                    } else {
                        async.auto({
                            //更新用户财富信息
                            updateTreasure: function (callback) {
                                var changeCount = rouletteConfig.prize_value;
                                //金币
                                if (rouletteConfig.prize_type == 0) {
                                    playerService.updateTreasure('coins', changeCount, userId, callback);
                                } else {//房卡
                                    playerService.updateTreasure('gems', changeCount, userId, callback);
                                }
                            },
                            //保存抽奖记录
                            saveBankStatement: function (callback) {
                                if (playerInfo) {
                                    var bankStatement = {};
                                    bankStatement.fk_player_id = userId;
                                    bankStatement.username = playerInfo.name;
                                    bankStatement.change_type = 15;
                                    if (rouletteConfig.prize_type == 0) {
                                        bankStatement.change_before = playerInfo.coins;
                                        bankStatement.remark = '新年抽奖获得金币奖励' + rouletteConfig.prize_value + '个';
                                        bankStatement.treasure_type = "coins";
                                    } else {
                                        bankStatement.change_before = playerInfo.gems;
                                        bankStatement.remark = '新年抽奖获得房卡奖励' + rouletteConfig.prize_value + '张';
                                        bankStatement.treasure_type = "gems";
                                    }
                                    bankStatement.change_count = rouletteConfig.prize_value;
                                    bankStatement.record_time = dateUtil.getCurrentTimestapm();
                                    activityService.saveBankStatement(bankStatement, callback);
                                } else {
                                    callback(null, null);
                                }
                            },
                            //扣除抽奖次数
                            deductLuckDrawTimes:function(callback){
                                activityService.deductChouJiangTimes(userId,callback);
                            }
                        }, async function (err, result) {
                            if (err) {
                                console.log(err);
                                http.send(res, 1, "服务器错误，请稍后重试")
                                return
                            } else {
                                var resData = {};
                                let residualTimes = await activityService.getCanChouJiangTimesAsync(userId);
                                resData.residualTimes = residualTimes;
                                resData.sequence = rouletteConfig.sequence;
                                http.send(res, 0, "ok", resData);
                            }
                        });
                    }
                })
            } else {
                http.send(res, 1, "未获取到转盘配置信息")
                return
            }
        }
    });
});


/********************************2018-06-27 新增俱乐部消息提醒功能 end**************************************/
exports.start = function ($config) {
    let config = $config;
    app.listen(config.CLEINT_PORT);
    console.log("client service is listening on port " + config.CLEINT_PORT);
};