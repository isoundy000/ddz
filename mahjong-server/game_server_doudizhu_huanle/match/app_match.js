/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: 服务启动入口
 */
var httpServer = require("../classic/httpServer");
var socketServer = require("../classic/socketServer");
var room_config = require("../classic/config")
//从配置文件获取服务器信息
var configs = require("../../configs");
var config = configs.coinDoudizhu();

config.CLIENT_PORT = config.CLIENT_PORT_XP_Five;
config.LOCAL_COIN_PORT = config.LOCAL_COIN_PORT_XP_Five;
config.SERVER_IP = config.HALL_IP
var room_config = require("../classic/config")
var db = require('../../utils/db');
db.init(configs.mysql());


//开启socket服务
socketServer.start(config);
console.log(config.CLIENT_PORT)
//开启机器人服务
var robotServer = require('../common/robotServer');
// robotServer.start(5*1000);