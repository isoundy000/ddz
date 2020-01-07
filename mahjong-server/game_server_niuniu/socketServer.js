/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: socket服务器
 */
var socketHandler = require('./socketHandler');

var io = null;
function check(){
    
}
exports.start = function (config,room_config) {
    io = require('socket.io')(config.CLIENT_PORT);
    io.sockets.on('connection', function(socket){
        /**
         * 登录
         */
        socket.on('login',function(data){
            console.log("data1",data)
            console.log("socket"+socket)
            socketHandler.login(socket,data);
        });
        /**
         * 准备
         */
        socket.on('ready',function(data){
            console.log("准备",data)
            socketHandler.ready(socket,data);
        });

        /**
         * 抢庄
         */
        socket.on('qiangZhuang',function(data){
            socketHandler.qiangZhuang(socket,data);
        });

        /**
         *押注
         */
        socket.on('yaZhu',function(data){
            socketHandler.yaZhu(socket,data);
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
         * 换房
         * */
        socket.on("huanfang",function (data) {
            socketHandler.huanfang(socket,data,config,room_config);
        })

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