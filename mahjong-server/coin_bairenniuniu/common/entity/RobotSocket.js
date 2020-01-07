/**
 * @author hyw
 * @date 2018/5/22 0022
 * @description: 虚拟的机器人socket
 */
var events = require('events');
var util = require('util');
var commonUtil = require('../../../utils/commonUtil');
var robotHandler = require('../robotHandler');
var gameMgr = require("../gameMgr")
function RobotSocket(userId) {
    var self = this;
    this.userId = null;
    this.socket = new events.EventEmitter(this);

    /**
     * 接收到准备指令
     */
    this.socket.on('begin_ready',function(data){
        //console.log('******【'+self.userId+'】begin_ready*******');
        var delayTime = commonUtil.randomFrom(1000,4000);
        setTimeout(function(){
            robotHandler.ready(self.userId);
        },delayTime);
    });

    /**
     * 监听上庄
     */
    
    setInterval(() => {
            let data={};
            data.userId = userId;
            
            let roomInfo = gameMgr.getRoomByUserId(userId)
            if(roomInfo){
                robotHandler.shangZhuang(userId,data);
            }
    },commonUtil.randomFrom(10000,19000));



    /**
     * 闲家开始押注
     */
    this.socket.on('gb_begin_game',function(data){
        var delayTime = commonUtil.randomFrom(1000,4000);
        setTimeout(function(){
            console.log("机器人进入押注",self.userId)
            robotHandler.yaZhu(self.userId);
        },delayTime);
    });

    /**
     * 开始开始亮牌
     */
    this.socket.on('gb_begin_liangpai',function(data){
        var delayTime = commonUtil.randomFrom(1000,4000);
        setTimeout(function(){
            robotHandler.liangPai(self.userId,data);
        },delayTime);
    });

    /**
     * 金币不足了
     */
    this.socket.on('coin_not_enough',function(data){
        console.log('********机器人金币不足了********');
        var delayTime = commonUtil.randomFrom(500,3000);
        setTimeout(function(){
            robotHandler.exit(self.userId);
        },delayTime);
    });
//在新的庄家上庄后判断机器人是否达到退出条件，如果满足就退出
    this.socket.on("set_banker",function(data){
        var delayTime = commonUtil.randomFrom(1000,2000);
        setTimeout(function(){
            robotHandler.exit2(self.userId,data);
        },delayTime);
    })
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