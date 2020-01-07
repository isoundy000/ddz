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
            socketHandler.login(socket,data,config,room_config);
        });
        /**
         * 准备
         */
        socket.on('ready',function(data){
            socketHandler.ready(socket,data);
        });

        /**
         * 上庄
         */
        socket.on('shangZhuang',function(data){
            socketHandler.shangZhuang(socket,data);
        });

        /**
         * 取消上庄
         */
        socket.on('quxiao',function(data){
            socketHandler.quxiao(socket,data);
        });

        /**
         *押注
         */
        socket.on('yaZhu',function(data){
            console.log('data')
            console.log(data)
            socketHandler.yaZhu(socket,data);
        });
        /**
         * 获取上庄列表
         */
        socket.on('szList',function(data){
            socketHandler.getszList(socket,data);
        });
                /**
         * 获取胜负走势列表
         */
        socket.on('zoushi',function(data){
            socketHandler.zoushi(socket,data);
        });
        /**
         * 计算
         */
        socket.on('settlement',function(data){
            socketHandler.settlement(socket,data);
        });
        /**
         * 亮牌
         */
        socket.on('tiShi',function(data){
            socketHandler.tiShi(socket,data);
        });

        /**
         * 亮牌
         */
        socket.on('liangPai',function(data){
            socketHandler.liangPai(socket,data);
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