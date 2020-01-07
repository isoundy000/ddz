var http_service = require("./http_service");
var socket_service = require("./socket_service");
// var mjmgr = require("./gamemgr_zzmj");
var mjlib = require("./mjlib_js/api");
mjlib.Init();
mjlib.MTableMgr.LoadTable();
mjlib.MTableMgr.LoadFengTable();

//从配置文件获取服务器信息
//var configs = require(process.argv[2]);
var configs = require("../configs");

var config = configs.game_server_zzmj();
var redis = require('../utils/redis');
var db = require('../utils/db');
db.init(configs.mysql());

//开启HTTP服务
http_service.start(config);

//开启外网SOCKET服务
socket_service.start(config);

//require('./gamemgr');


process.on('uncaughtException', function (err) {
    console.error(' Caught exception: ' + err.stack);
});