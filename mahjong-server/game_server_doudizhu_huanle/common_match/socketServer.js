/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: socket服务器
 */
var socketHandler = require('./socketHandler');
var io = null;
exports.start = function (config) {
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
            socketHandler.login(socket,data,config);
        });
        /**
         * 准备
         */
        socket.on('ready',function(data){
            socketHandler.ready(socket,data);
        });


        /**
         * 抢地主
         */
        socket.on('qiangdizhu',function(data){

            socketHandler.qiangdizhu(socket,data);
        });
        /**
         * 加倍
         */
        socket.on('jiabei',function(data){

            socketHandler.jiabei(socket,data);
        });
                /**
         * 明牌
         */
        socket.on('mingpai',function(data){

            socketHandler.mingpai(socket,data);
        });
        
        socket.on("mingpai_start",function(data){
            socketHandler.mingpaiStart(socket,data);
        })
        /**
         * 看牌
         */
        socket.on('kanPai',function(data){
            socketHandler.kanPai(socket,data);
        });

                /**
         * 看牌
         */
        socket.on('tuoguan',function(data){
            socketHandler.tuoguan(socket,data);
        });
                        /**
         * 看牌
         */
        socket.on('qxTuoguan',function(data){
            socketHandler.qxTuoguan(socket,data);
        });
        /**
         * 弃牌
         */
        socket.on('buchu',function(data){
            socketHandler.buchu(socket,data);
        });

        //提示
        socket.on("tishi",function(data){
            socketHandler.tishi(socket,data)
        })
        /**
         * 比牌
         */
        socket.on('chupai',function(data){
            socketHandler.chupai(socket,data);
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