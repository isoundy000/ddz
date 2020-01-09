var gameMgr = require('./gameMgr');
var userList = {};
var userOnline = 0;
var tuoguanList = {};
var userOnlineT = 0;
exports.bind = function (userId, socket) {
    userList[userId] = socket;
    userOnline++;
};

exports.del = function (userId, socket) {
    delete userList[userId];
    userOnline--;
};

exports.bindT = function (userId, socket) {
    tuoguanList[userId] = socket;
    userOnlineT++;
};

exports.delT = function (userId, socket) {
    delete tuoguanList[userId];
    userOnlineT--;
};
exports.getT = function (userId) {
    return tuoguanList[userId];
};
exports.get = function (userId) {
    return userList[userId];
};

exports.isOnline = function (userId) {
    var data = userList[userId];
    if (data != null) {
        return true;
    }
    return false;
};

exports.getOnlineCount = function () {
    return userOnline;
}


exports.sendMsg = function (userId, event, msgdata) {
    var userInfo = userList[userId];
    if (userInfo == null) {
        return;
    }
    var socket = userInfo;
    if (socket == null) {
        return;
    }
    socket.emit(event, msgdata);
};

exports.kickAllInRoom = function (roomId) {
    if (roomId == null) {
        return;
    }
    var roomInfo = gameMgr.getRoomById(roomId);
    if (roomInfo == null) {
        return;
    }

    for (var i = 0; i < roomInfo.seats.length; ++i) {
        var player = roomInfo.seats[i];

        //如果不需要发给发送方，则跳过
        if (player.userId > 0) {
            var socket = userList[rs.userId];
            if (socket != null) {
                exports.del(player.userId);
                socket.disconnect();
            }
        }
    }
};

exports.broacastInRoom = function (event, data, sender, includingSender) {
    var roomId = gameMgr.getRoomIdByUser(sender);
    if (roomId == null) {
        return;
    }
    var roomInfo = gameMgr.getRoomById(roomId);
    if (roomInfo == null) {
        return;
    }
    for (var i = 0; i < roomInfo.seats.length; ++i) {
        var rs = roomInfo.seats[i];

        //如果不需要发给发送方，则跳过
        if (rs.userId == sender && includingSender != true) {
            continue;
        }
        var socket = userList[rs.userId];
        if (socket != null) {
            socket.emit(event, data);
            // console.log("发送",event,data)
        }
    }
};


/**
 * 根据房间号在房间内广播
 * @param event
 * @param data
 * @param sender
 * @param includingSender
 */
exports.broacastByRoomId = function (event, data, roomId) {
    var roomInfo = gameMgr.getRoomById(roomId);
    if (roomInfo == null) {
        return;
    }
    for (var i = 0; i < roomInfo.seats.length; ++i) {
        var rs = roomInfo.seats[i];
        var socket = userList[rs.userId];
        if (socket != null) {
            socket.emit(event, data);
            console.log("发送",event)
        }
    }
};

/**
 * 发给庄家
 * @param event
 * @param data
 * @param sender
 * @param includingSender
 */
exports.sendBanker = function (event, data, roomId) {
    var roomInfo = gameMgr.getRoomById(roomId);
    if (roomInfo == null) {
        return;
    }
    for (var i = 0; i < roomInfo.seats.length; ++i) {
        var rs = roomInfo.seats[i];
        var socket = userList[rs.userId];
        if (socket != null && rs.isBanker ===1) {
            socket.emit(event, data);
            console.log("发送",event)
        }
    }
};

