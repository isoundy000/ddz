/**
 * @author hyw
 * @date 2018/5/21 0021
 * @description: 对应房间的机器人队列
 */
var robotService = require("../service/robotService")
var configs = require("../../configs");
var db = require('../../utils/db');
db.init(configs.mysql());


function RobotQueue(roomId){
    this.roomId = roomId;
    this.robotQueue = [];
}

/**
 * 从机器人队列中获取一个机器人
 */
RobotQueue.prototype.getRobot = function(callback){
    if(this.robotQueue.length>0){
        var queueLength = this.robotQueue.length;
        var randomIndex = Math.floor(Math.random() * queueLength);;
        robot = this.robotQueue.splice(randomIndex,1);
        callback(null,robot[0]);
    }else{
        var self = this;
        robotService.getRobotByRoomId(this.roomId,function(err,robots){
            if(err){
                callback(err);
            }else{
                if(robots&&robots.length>0){
                    self.robotQueue = robots;
                    //随机从机器人队列中获取一个机器人
                    var queueLength = self.robotQueue.length;
                    var randomIndex = Math.floor(Math.random() * queueLength);;
                    robot = self.robotQueue.splice(randomIndex,1);
                    callback(null,robot[0]);
                }else{
                    callback(null,null);
                }
            }
        })
    }
}

/**
 * 往机器人队列中添加一个机器人
 */
RobotQueue.prototype.addRobot = function (robot) {
    this.robotQueue.push(robot);
}
module.exports = RobotQueue;