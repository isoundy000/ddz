var roomMgr = null;
var userList = {};
var userOnline = 0;
var robot = null

exports.setRoomMgr = function (_roomMgr) {
    if (roomMgr == null) {
        roomMgr = _roomMgr;
    }
}

exports.setRobot = function (_robot) {
    if (robot == null) {
        robot = _robot;
    }
}

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

exports.getOnlineRoomIdForUserId = function () {
    var info = [];
    for (const key in userList) {
        info.push({
            user_id: key,
            room_id: roomMgr.getUserRoom(key)
        })
    }
    return info;
}

exports.getOnlinePlayerList = function () {

    let gameName = {
        zzmj: "房卡房郑州麻将",
        tdhmj: "房卡房推到胡麻将",
        xlch: "房卡房血流麻将",
        xzdd: "房卡房血战到底",
        hxmj: "房卡房滑县麻将",
        hjmj: "房卡房获嘉麻将",
        hzlmj: "房卡房红中麻将",
        tb: "推饼",
        tb_inf: "推饼",
        tb_melee: "推饼万人场",
    }

    var _userList = [];
    Object.keys(userList).forEach(user_id => {
        let room_id = roomMgr.getUserRoom(user_id);
        if (room_id == null) {
            return;
        }
        let room = roomMgr.getRoom(room_id);
        if (room == null) {
            return;
        }
        let seatIndex = roomMgr.getUserSeat(user_id);
        if (seatIndex == null) {
            return
        }
        let onlinePlayer = room.seats[seatIndex];
        if (!onlinePlayer.is_robot) {
            let playerInfo = {};
            playerInfo.userId = onlinePlayer.userId;
            playerInfo.name = onlinePlayer.name;
            playerInfo.headimg = "";
            playerInfo.coins = onlinePlayer.coins;
            playerInfo.roomId = room_id;
            playerInfo.roomName = gameName[room.conf.type];
            _userList.push(playerInfo);
        }
    });
    console.log(_userList)
    return _userList;
}
exports.sendMsg = function (userId, event, msgdata) {
    //如果是机器人
    if (roomMgr.isRobot != null && roomMgr.isRobot(userId) == true) {
        //todo
        if (robot != null && robot.socket != null) {
            console.log(event);
            robot.socket.emit(event, {
                receiver: userId,
                data: msgdata
            });
        }
    }
    else {
        var userInfo = userList[userId];
        if (userInfo == null) {
            return;
        }
        var socket = userInfo;
        if (socket == null) {
            return;
        }

        socket.emit(event, msgdata);
    }
};

exports.kickAllInRoom = function (roomId) {
    if (roomId == null) {
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }

    for (var i = 0; i < roomInfo.seats.length; ++i) {
        var rs = roomInfo.seats[i];

        //如果不需要发给发送方，则跳过
        if (rs.userId > 0) {
            var socket = userList[rs.userId];
            if (socket != null) {
                exports.del(rs.userId);
                socket.disconnect();
            }
        }
    }
};

exports.broacastInRoom = function (event, data, sender, includingSender) {
    var roomId = roomMgr.getUserRoom(sender);
    if (roomId == null) {
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }
    for (var i = 0; i < roomInfo.seats.length; ++i) {
        var rs = roomInfo.seats[i];

        //如果不需要发给发送方，则跳过
        if (rs.userId == sender && includingSender != true) {
            continue;
        }
        //如果是机器人
        if (roomMgr.isRobot != null && roomMgr.isRobot(rs.userId) == true) {
            if (robot != null && robot.socket != null) {
                if (rs.userId == sender) {
                    console.log(event);
                    robot.socket.emit(event, {
                        sender: sender,
                        receiver: rs.userId,
                        data: data
                    });
                }
            }
        }
        else {
            var socket = userList[rs.userId];
            //这里添加rs.in_this_room !== false是因为血战到底可以胡牌后去其他房间，为了不让玩家收到上一个房间的消息
            if (socket != null && rs.in_this_room !== false) {
                socket.emit(event, data);
            }
        }
    }
};

exports.broadcastByRoomId = function (event, data, roomId) {
    let roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        console.error('usermgr broadcastByRoomId roomInfo == null, roomId: ', roomId);
        return ;
    }

    for (let i = 0; i < roomInfo.seats.length; ++i) {
        let rs = roomInfo.seats[i];
        let socket = userList[rs.userId];        
        if (socket != null) {
            socket.emit(event, data);
        }
    }
};