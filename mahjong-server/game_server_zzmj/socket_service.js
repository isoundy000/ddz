
var roomMgr = require('./roommgr');
var socketServiceListener = require('../common/room_game/socket_service_listener');

var io = null;
exports.start = function (config, mgr) {
	io = require('socket.io')(config.CLIENT_PORT);

	socketServiceListener.setConfigAndRoomMgr(config, roomMgr);

	io.sockets.on('connection', socketServiceListener.listener);

	console.log("game server is listening on " + config.CLIENT_PORT);
};