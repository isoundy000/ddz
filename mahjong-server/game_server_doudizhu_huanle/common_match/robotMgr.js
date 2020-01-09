/**
 * @author hyw
 * @date 2018/5/21 0021
 * @description: 对应房间的机器人队列
 */
var robotService = require("../../common/service/robotService")
var commonService = require("../../common/service/commonService");
var configs = require("../../configs");
var db = require('../../utils/db');
db.init(configs.mysql());
/**
 * 从机器人队列中随机获取一个机器人
 */
exports.getRobot = async function(){
    let robot = await robotService.getRobot();
    return robot;
}

/**
 * 把使用过的机器人重新添加回队列
 */
exports.addRobot = async function (userId) {
    let robot = await commonService.getTableValuesAsync("*", "t_users", { userid: userId });
}

/**
 * 获取机器人队列中机器人的数量
 */
exports.getRobotCount = async function(){
    var canUseCount = await robotService.getCanUsedRobotCountAsync();
    return canUseCount;
}
