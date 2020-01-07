
var SocketService = require("../common/socketServer");


//从配置文件获取服务器信息
var configs = require("../../configs");
var config = configs.coinTTZ();

config.CLIENT_PORT = config.CLIENT_PORT_Tow;
config.LOCAL_COIN_PORT = config.LOCAL_COIN_PORT_Tow;
config.SERVER_IP = config.HALL_IP
var room_config = require("./config")
var db = require('../../utils/db');
db.init(configs.mysql());



//初始化游戏房间
async function main() {
    

    //开启链接大厅服务
    // HallSocket.start(config);
    //开启外网SOCKET服务
    SocketService.start(config,room_config.config);
    console.log(config.CLIENT_PORT)
    /**
     * 启动推倒胡初级场机器人
     */
 //开启机器人服务
var robotServer = require('../common/robotServer');
robotServer.start(5*1000);
}
main();

