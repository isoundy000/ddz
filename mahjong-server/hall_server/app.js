var client_service = require("./client_service");
var room_service = require("./room_service");
const coinServer = require('./coinService');

//var configs = require(process.argv[2]);
var configs = require("../configs");


var config = configs.hall_server();
var redis = require('../utils/redis');
var db = require('../utils/db');
db.init(configs.mysql());

client_service.start(config);
room_service.start(config);
coinServer.start(config);
