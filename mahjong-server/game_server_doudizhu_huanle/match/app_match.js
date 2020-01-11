/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: 服务启动入口
 */
var httpServer = require("./httpServer");
var socketServer = require("./socketServer");
// var room_config = require("../config")
//从配置文件获取服务器信息
var configs = require("../../configs");
var config = configs.coinDoudizhu();
config.CLIENT_PORT = config.CLIENT_PORT_XP_Six;
config.LOCAL_COIN_PORT = config.LOCAL_COIN_PORT_XP_Six;
config.SERVER_IP = config.HALL_IP
var db = require('../../utils/db');
db.init(configs.mysql());

//开启socket服务
socketServer.start(config);
console.log("port",config.CLIENT_PORT)
//开启机器人服务
// var robotServer = require('../common/robotServer');
// robotServer.start(5*1000);