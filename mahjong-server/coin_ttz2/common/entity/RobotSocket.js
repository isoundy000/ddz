/**
 * @author hyw
 * @date 2018/5/22 0022
 * @description: 虚拟的机器人socket
 */
var events = require('events');
var util = require('util');
var commonUtil = require('../../../utils/commonUtil');
var robotHandler = require('../robotHandler');

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
     * 开始抢庄
     */
    this.socket.on('gb_begin_qiangzhuang',function(data){
        var delayTime = commonUtil.randomFrom(1000,4000);
        setTimeout(function(){
            robotHandler.qiangZhuang(self.userId,data);
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
     * 闲家开始押注
     */
    this.socket.on('gb_begin_yazhu',function(data){
        var delayTime = commonUtil.randomFrom(1000,4000);
        setTimeout(function(){
            robotHandler.yaZhu(self.userId,data);
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