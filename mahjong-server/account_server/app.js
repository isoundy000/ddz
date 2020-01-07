var db = require('../utils/db');
//var configs = require(process.argv[2]);
var configs = require("../configs");
//init db pool.
db.init(configs.mysql());

var config = configs.account_server();
var socketServer = require("../hall_server/socketServer")
socketServer.start(config)
var as = require('./account_server');
as.start(config);