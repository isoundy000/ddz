var gameMgr = require('./gameMgr');
var userList = {};
var userOnline = 0;
exports.bind = function (userId, socket) {
    userList[userId] = socket;
    userOnline++;
};

exports.del = function (userId, socket) {
    delete userList[userId];
    userOnline--;
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
            console.log("broacastInRoom开始发送"+rs.userId+event)
            console.log("userid"+rs.userId+"ip")
            socket.emit(event, data);
           
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
        }
    }
};


