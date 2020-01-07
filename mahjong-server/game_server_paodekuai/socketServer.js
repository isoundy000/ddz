/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: socket服务器
 */
var socketHandler = require('./socketHandler');
// var tuoguanHandle = require("./tuoguanHandle")
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
         * 抢暗庄
         */
        socket.on('qianganzhuang',function(data){
            console.log("抢暗庄")
            socketHandler.qiangAnZhuang(socket,data);
        });

        /**
         * 加注
         */
        socket.on('chupai',function(data){

            socketHandler.chupai(socket,data);
        });

        /**
         * 看牌
         */
        socket.on('buchu',function(data){
            socketHandler.buchu(socket,data);
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
        socket.on('tishi',function(data){
            socketHandler.tishi(socket,data);
        });

        /**
         * 退出房间
         */
        socket.on('exit',function(data){
            socketHandler.exit(socket,data);
        });

                /**
         * 托管
         */
        socket.on('tuoguan', function (data) {
            socketHandler.tuoguan(socket,data);
        });

                        /**
         * 取消托管
         */
        socket.on('qxtuoguan', function (data) {
            socketHandler.qxTuoguan(socket,data);
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

        /**
         * 解散房间
         */
        socket.on("jiesan",function(data){
            socketHandler.jiesan(socket,data);
        })
                /**
         * 是否同意解散房间
         */
        socket.on("isjiesan",function(data){
            socketHandler.isJiesan(socket,data);
        })
        /**************游戏控制逻辑**************/
        /**
         * 看牌
         */
        socket.on('ctrl_kanpai', function (data) {
            socketHandler.ctrlKanPai(socket);
        });
    });
};