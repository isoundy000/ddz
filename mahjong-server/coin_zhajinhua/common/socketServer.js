/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: socket服务器
 */
var socketHandler = require('./socketHandler');
var io = null;
exports.start = function (config,room_config) {
    io = require('socket.io')(config.CLIENT_PORT);
    
    io.sockets.on('connection', function(socket){
        /**
         * 登录
         */
        socket.on('login',function(data){
            console.log(typeof data)
            if(typeof data === "string"){
                data = JSON.parse(data);
            }
            socketHandler.login(socket,data,config,room_config);
        });
        /**
         * 准备
         */
        socket.on('ready',function(data){
            socketHandler.ready(socket,data);
        });

        /**
         * 跟注
         */
        socket.on('genZhu',function(data){
            console.log("跟注开始")
            socketHandler.genZhu(socket,data);
        });

        /**
         * 加注
         */
        socket.on('jiaZhu',function(data){

            socketHandler.jiaZhu(socket,data);
        });

        /**
         * 看牌
         */
        socket.on('kanPai',function(data){
            socketHandler.kanPai(socket,data);
        });
        /**
         * 弃牌
         */
        socket.on('qiPai',function(data){
            socketHandler.qiPai(socket,data);
        });
        /**
         * 比牌
         */
        socket.on('biPai',function(data){
            socketHandler.biPai(socket,data);
        });

        /**
         * 退出房间
         */
        socket.on('exit',function(data){
            socketHandler.exit(socket,data);
        });

        /**
         * 文字聊天
         */
        socket.on('chat', function (data) {
            socketHandler.chat(socket,data);
        });
        /**
         * 快捷聊天
         */
        socket.on('quick_chat', function (data) {
            socketHandler.quickChat(socket,data);
        });

        /**
         * 语音聊天
         */
        socket.on('voice_msg', function (data) {
            socketHandler.voiceMsg(socket,data);
        });
        /**
         * 发表情
         */
        socket.on('emoji', function (data) {
            socketHandler.emoji(socket,data);
        });

        /**
         * 赠送道具
         */
        socket.on('grant_prop', function (data) {
            socketHandler.grantProp(socket,data);
        });

        /**
         * 心跳检测
         */
        socket.on('game_ping', function (data) {
            socketHandler.ping(socket);
        });

        /**
         * 玩家掉线
         */
        socket.on('disconnect', function (data) {
            console.log("掉线",data.userId)
            socketHandler.disconnect(socket);
        });


        /**************游戏控制逻辑**************/
        /**
         * 看牌
         */
        socket.on('ctrl_kanpai', function (data) {
            socketHandler.ctrlKanPai(socket);
        });
    });
};