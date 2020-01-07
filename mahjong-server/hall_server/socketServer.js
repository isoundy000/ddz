let redisClient = require("../utils/redis")
let io=null
exports.start = function (config) {
    io = require('socket.io')(config.CLIENT_PORT2);
    io.sockets.on('connection', function(socket){
        socket.on("login",function(data){
            let account = data.account;
            redisClient.sismember("sessions",account,function(err,data){
                if(err){
                    console.log(err)
                }
                console.log(data)
                if(data ===1){
                    socket.emit("login_result",{errcode:1,errmsg:"用户已经登录"})
                    return;
                }else{
                    console.log(12345)
                    redisClient.sadd("sessions",account,function(err,data){
                        if(err){
                            socket.emit("login_result",{errcode:1,errmsg:"数据库异常"})
                            return;
                            
                        }
                        socket.emit("login_result",{errcode:0,errmsg:"ok"})
                        socket.account = account;
                        // console.log(data)
                    })
                }
            });
        })
        /**
         * 玩家掉线
         */
        socket.on('disconnect', function (data) {
            let account = socket.account;
            redis_client.srem("session",account)
        });
       
    });
};