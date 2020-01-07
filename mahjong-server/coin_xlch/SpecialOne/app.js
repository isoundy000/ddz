var RoomMgr = require('../../common/coin_game/RoomMgr');
var HallSocket = require("../../common/coin_game/HallSocket");

var GameMgr = require('../common/GameMgr');
var SocketService = require("../common/SocketService");

var UserMgr = require('../../common/usermgr');

//从配置文件获取服务器信息
var configs = require("../../configs");
var config = configs.coinXLCH();

config.CLIENT_PORT = config.CLIENT_PORT_HSZ_One;
config.LOCAL_COIN_PORT = config.LOCAL_COIN_PORT_HSZ_One;

var db = require('../../utils/db');
db.init(configs.mysql());

UserMgr.setRoomMgr(RoomMgr);

GameMgr.setHallSocket(HallSocket);

//初始化游戏房间
async function main() {
    await RoomMgr.initRooms(require('./config').config)
    RoomMgr.setHallSocket(HallSocket);
    RoomMgr.setGameMgr(GameMgr);

    //开启链接大厅服务
    HallSocket.start(config);
    //开启外网SOCKET服务
    SocketService.start(config);

    //设置机器人 可能会修改TODO
    var baseRobot = require('../../common/robot_logic/baseRobot');
    var MjRobotMgr = require('../../common/robot_logic/mjRobotMgr');
    var robotMgr = new MjRobotMgr(GameMgr);
    UserMgr.setRobot(new baseRobot(robotMgr));
    var robotServer = require("./robotServer");
    robotServer.start();
}
main();