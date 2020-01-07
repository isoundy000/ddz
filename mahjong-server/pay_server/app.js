var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
var config = require('../configs').pay_server;
var dbconfig = require('../configs').mysql();

var ejs=require('ejs');//新增
//添加以下
app.engine('.html',ejs.__express);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//初始化数据库
var db = require('../utils/db');
db.init(dbconfig);


app.use('/quansupay',require('./routes/quansupay'));
app.use('/wopay',require('./routes/wopay'));
app.use('/zztpay',require('./routes/zztpay'));
app.use('/yinfupay',require('./routes/yinfupay'));

// create server listening at 3000
var server = app.listen(config.HTTP_PORT, function(){
	console.log("pay server listening at "+config.HTTP_PORT+"...")
});