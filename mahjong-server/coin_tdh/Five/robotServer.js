/**
 * @author hyw
 * @date 2018/5/23 0023
 * @description: {描述一下文件的功能}
 */
var RoomMgr = require('../../common/coin_game/RoomMgr');
var RobotQueue = require('../../common/robot_logic/robotQueue');

var BaseRobotServer = require("../../common/robot_logic/robotServer");

exports.start = function(){
    var tdhRobotQueue = new RobotQueue(103005);
    var tdhRobotServer = new BaseRobotServer(tdhRobotQueue,RoomMgr);
    //开启扫描,5秒执行一次
    tdhRobotServer.start(4000);
}
