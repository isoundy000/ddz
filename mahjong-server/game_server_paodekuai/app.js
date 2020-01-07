/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: 服务启动入口
 */
var httpServer = require("./httpServer");
var socketServer = require("./socketServer");
//从配置文件获取服务器信息
var configs = require("../configs");
var config = configs.game_server_paodekuai();


config.SERVER_IP = config.HALL_IP
// var room_config = require("./free/config")
var db = require('../utils/db');
db.init(configs.mysql());

httpServer.start(config)
//开启socket服务
socketServer.start(config);
console.log(config.CLIENT_PORT)
//开启机器人服务
// var robotServer = require('./common/robotServer');
// robotServer.start(10*1000);