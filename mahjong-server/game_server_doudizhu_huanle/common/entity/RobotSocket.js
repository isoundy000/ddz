/**
 * @author hyw
 * @date 2018/5/22 0022
 * @description: 虚拟的机器人socket
 */
var events = require('events');
var util = require('util');
var commonUtil = require('../../../utils/commonUtil');
var robotHandler = require('../robotHandler');
var userMgr = require("../userMgr")
function RobotSocket(userId) {
    var self = this;
    this.userId = userId;
    this.socket = new events.EventEmitter(this);

    /**
     * 登录结果
     */
    this.socket.on('login_result',function(data){
        //console.log('******机器人【'+self.userId+'】成功加入房间*******');
    })

    /**
     * 接收到准备指令
     */
    this.socket.on('begin_ready',function(data){
        var delayTime = commonUtil.randomFrom(1000,5000);
        setTimeout(function(){
            robotHandler.ready(self.userId);
        },delayTime);
    });

    /**
     * 接收到操作指令
     */
    this.socket.on('your_turn',function(data){
        console.log('******【'+self.userId+'】begin_托管*******');
        console.log(data);
        var delayTime = commonUtil.randomFrom(2000,3000);
        if(data.gameState=="playing"){
            setTimeout(function(){
                robotHandler.opt(self.userId,data);
            },delayTime);
        }
        if(data.gameState=="jiabei"){
            setTimeout(function(){
                let socket = userMgr.get(self.userId)
                if(!socket){
                    socket = userMgr.getT(self.userId)
                }
                robotHandler.jiabei(socket,data);
            },delayTime);
        }
        if(data.gameState=="qiangdizhu"){
            setTimeout(function(){
                let socket = userMgr.get(self.userId)
                if(!socket){
                    socket = userMgr.getT(self.userId)
                }
                robotHandler.qiangdizhu(self.userId,data);
            },delayTime);
        }
    });

    /**
     * 金币不足了
     */
    this.socket.on('coin_not_enough',function(data){
        console.log('********机器人金币不足了********');
        var delayTime = commonUtil.randomFrom(1000,3000);
        setTimeout(function(){
            robotHandler.exit(self.userId);
        },delayTime);
    });


    /**
     * 有人退出了房间
     */
    this.socket.on('gb_player_exit',function(data){
        //如果房间内只剩自己了，则自己也退出游戏
        var delayTime = commonUtil.randomFrom(1000,4000);
        setTimeout(function(){
            robotHandler.checkCanExit(self.userId);
        },delayTime);
    });



    /**
     * 收到有人发表情了
     */
    this.socket.on('grant_prop_push',function(data){
        //var data = JSON.parse(data);
        //判断是否是发给我的表情
        if(data.receiver==self.userId){
            //有一定的概率回复表情
            let rn = commonUtil.randomFrom(0,100);
            if(rn>50){
                var sender = data.sender;
                //回赠道具
                robotHandler.grantProp(self.userId,sender);
            }
        }
    });


    /**
     * 有人发快捷语音了
     */
    this.socket.on('quick_chat_push',function(data){
        var delayTime = commonUtil.randomFrom(500,2000);
        //如果参与游戏了
        setTimeout(function(){
            robotHandler.sendQuickChat(self.userId);
        },delayTime);
    });

}

/**
 * 包装事件发送方法
 * @param event
 * @param data
 */
RobotSocket.prototype.emit = function(event,data){
    this.socket.emit(event,data);
}

module.exports = RobotSocket;