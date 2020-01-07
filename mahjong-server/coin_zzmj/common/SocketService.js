var GameMgr = require('./GameMgr');
const SocketListener = require("../../common/coin_game/SocketListener")

var io = null;
exports.start = function (config, mgr) {

	SocketListener.setConfigAndGameMgr(config, GameMgr)

	io = require('socket.io')(config.CLIENT_PORT);

	io.sockets.on('connection', SocketListener.Listener)
		
	console.log("game server is listening on " + config.CLIENT_PORT);
};