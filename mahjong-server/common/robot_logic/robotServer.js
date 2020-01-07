/**
 * @author hyw
 * @date 2018/5/21 0021
 * @description: 机器人服务
 */
var commonService = require("../service/commonService");
var crypto = require("../../utils/crypto")
function RobotServer(robotQueue, roomMgr) {
    this.roomMgr = roomMgr;
    this.robotQueue = robotQueue;
}

/**
 * 启动机器人服务
 * @param intervalTime 每隔多少毫秒执行一次扫描
 */
RobotServer.prototype.start = function (intervalTime) {
    var self = this;
    //启动定时器循环扫描房间的排队列表，适当加入机器人
    setInterval(() => {
        scanWaitQueue(this.robotQueue, this.roomMgr);
    }, intervalTime);
}



function scanWaitQueue(robotQueue, roomMgr) {
    // console.log("*******启动机器人扫描*******");
    //获取房间的排队队列玩家数量
    var room_id = roomMgr.getIdleRoomIdForRobot();
    // console.log("*******获取房间排队数量*******："+waitPlayCount);
    if (room_id != null) {
        //从机器人队列中获取一个机器人
        robotQueue.getRobot(function (err, robot) {
            if (err) {
                console.log("从队列中获取机器人出错：" + JSON.stringify(err))
            } else {
                if (robot) {
                    // console.log("*******从机器人队列中获取机器人*******："+JSON.stringify(robot));

                    addRobotToMatchList(robot, roomMgr);

                    /*
                    //延迟2~5秒往排队列表中加入机器人
                    var delayTime = 1000*(Math.floor(Math.random()*(5-2+1)+2));
                    setTimeout(()=>{
                        addRobotToMatchList(robot,roomMgr);
                    },delayTime);
                    */
                }
            }
        });
    }
}


/**
 * 往对应房间的用户等待队列中添加机器人
 */
function addRobotToMatchList(robot, roomMgr) {
    console.log("*******机器人加入到排队列表中*******");
    if (robot && robot.userid) {

        let limit_mix_score = roomMgr.conf.limit_mix_score;
        let limit_max_score = 7 * roomMgr.conf.limit_mix_score;
        robot.name = crypto.fromBase64(robot.name);

        if ((robot.coins <= limit_mix_score || robot.coins >= limit_max_score) && roomMgr.conf.is_free == false) {
            //修改后的金币
            let coins = Math.floor(Math.random() * 6 * limit_mix_score / 100) * 100;//Math.floor(Math.random() * (limit_max_score - limit_mix_score) + limit_mix_score)
            commonService.updateAsync("t_users", { coins: coins }, "userid", robot.userid).catch((err)=>{
                console.error(err);
            })
            robot.coins = coins;
            var _robot = {
                account: robot.account,
                name: robot.name,
                user_id: robot.userid,
                coins: robot.coins,
                gems: robot.gems,
                sex: robot.sex,
                //是否是机器人 20180521 add by hyw
                is_robot: robot.is_robot
            }
            roomMgr.setUsersInfo(_robot);
            roomMgr.robotReadyGame(_robot.user_id);
            // })
        } else {
            if (roomMgr.conf.is_free == true) {
                robot.coins = roomMgr.conf.base_score * 100;
            }
            var __robot = {
                account: robot.account,
                name: robot.name,
                user_id: robot.userid,
                coins: robot.coins,
                gems: robot.gems,
                sex: robot.sex,
                //是否是机器人 20180521 add by hyw
                is_robot: robot.is_robot
            }
            roomMgr.setUsersInfo(__robot);
            roomMgr.robotReadyGame(__robot.user_id);
        }
    }
}
module.exports = RobotServer;