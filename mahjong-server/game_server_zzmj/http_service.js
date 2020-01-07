let http_service = require('../common/http_service');
let room_mgr = require('./roommgr');
http_service.setRoomMgr(room_mgr);
let express = require('express')
let app = express();

//测试
app.all('*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", ' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/get_server_info', http_service.getServerInfo);

app.get('/create_room', http_service.createRoom);

app.get('/enter_room', http_service.enterRoom);

app.get('/ping', http_service.ping);

app.get('/is_room_runing', http_service.isRoomRunning);

app.get("/dismiss_room_by_room_id", http_service.dismissRoomByRoomId)

app.get('/get_online_roomId_for_userId', http_service.getOnlineRoomIdForUserId)

app.get('/ws/get_online_player', http_service.getOnlinePlayerList)

exports.start = function ($config) {
	http_service.start($config)
	app.listen($config.HTTP_PORT, $config.FOR_HALL_IP);
	console.log("game server is listening on " + $config.FOR_HALL_IP + ":" + $config.HTTP_PORT);
}