const msg = require('../msg');
const uNet = require('../../utils/uNet');
let RoomMgr = require('./RoomMgr');
let client = null;
/**
 * 处理消息
 * @param {*} client 
 * @param {*} data 
 */
function dealMsg(client, data) {
    if (data.msg == msg.H2G_Heart) {
        console.log("heartBeat")
    }
    else if (data.msg == msg.H2G_Register) {
        if (data.err) {
            console.log(data.err)
        }
        //注册成功，将子游戏用户信息发送到大厅
        else {
            for (const user_id in RoomMgr.m_users) {
                if (!RoomMgr.isRobot(user_id)) {
                    let user_info = RoomMgr.m_users[user_id];
                    let send_info = {
                        account: user_info.account,
                        user_id: user_info.user_id,
                        name: user_info.name,
                        coins: user_info.coins,
                        sex: user_info.sex,
                        gems: user_info.gems,
                        roomName: RoomMgr.conf.name,
                        is_gaming: user_info.is_gaming,
                    }
                    uNet.send(client, msg.G2H_UpUserInfo, null, send_info);
                }
            }
        }
    }
    else if (data.msg == msg.H2G_UserEnterGame) {
        console.log(data)
        console.log("H2G_UserEnterGame")
        RoomMgr.setUsersInfo(data);
    }
    else if (data.msg == msg.H2G_SetDifficultyDegree) {
        console.log(data)
        console.log("H2G_SetDifficultyDegree")
        RoomMgr.setDifficultyDegree(data);
    }
    else if (data.msg == msg.H2G_UpdateCoinsConfig) {
        console.log(data)
        console.log("H2G_UpdateCoinsConfig")
        RoomMgr.updateCoinsConfig();
    }
    else if (data.msg == msg.H2G_UpdateCtrlRatio) {
        console.log(data)
        console.log("H2G_UpdateCtrlRatio")
        RoomMgr.updateCtrlRatio(data);
    }
    else if (data.msg == msg.H2G_UserUpdateCoins) {
        console.log(data)
        console.log("H2G_UserUpdateCoins")
        RoomMgr.updateUserCoins(data.user_id, data.coins);
    }
}

module.exports = {
    start(config) {
        client = uNet.createClient(config.HALL_PORT, config.HALL_IP, config.LOCAL_COIN_PORT);
        uNet.clientOnConnection(client, dealMsg)
        client.on('connect', (c) => {
            const data = {
                kind_id: config.KIND_ID,
                client_port: config.CLIENT_PORT,
                client_ip: config.CLIENT_IP,
                is_special: RoomMgr.conf.is_special,
                is_free: RoomMgr.conf.is_free,
                base_score: RoomMgr.conf.base_score,
                limit_mix_score: RoomMgr.conf.limit_mix_score,
                limit_max_score: RoomMgr.conf.limit_max_score,
                room_code: RoomMgr.conf.room_code,
                roomName: RoomMgr.conf.name,
            }
            console.log("hallsocket = " + config.HALL_PORT + ":" + config.HALL_IP)
            // setInterval(() => {
            //     uNet.send(client, msg.G2H_Heart);
            // }, config.HTTP_TICK_TIME)
            uNet.send(client, msg.G2H_Register, null, data);
        })
    },
    sendUserGameStart(room_id) {
        let room = RoomMgr.getRoom(room_id)
        if (room) {
            let ret = {
                user_infos: [],
            }
            for (const key in room.seats) {
                let user_id = room.seats[key].userId;
                let user_info = RoomMgr.getUserInfo(user_id);
                if (user_info) {
                    ret.user_infos.push({
                        user_id: user_id,
                        is_gaming: user_info.is_gaming
                    })
                }
                else {
                    return
                }
            }

            uNet.send(client, msg.G2H_UserGameStart, null, ret);
        }
    },
    sendUserGameFinish(user_id) {
        let user_info = RoomMgr.getUserInfo(user_id);
        if (user_info) {
            let ret = {
                user_id: user_id,
                is_gaming: user_info.is_gaming,
                // coins: user_info.coins
            }
            uNet.send(client, msg.G2H_UserGameFinish, null, ret);
        }
    },
    sendUserCoins(account, coins) {
        let ret = {
            account: account,
            coins: coins,
        }
        uNet.send(client, msg.G2H_UserUpdateCoins, null, ret);
    },
    sendUserEnterGame(user_id) {
        const data = {
            kind_id: RoomMgr.conf.kind_id,
            base_score: RoomMgr.conf.base_score,
            is_special: RoomMgr.conf.is_special,
            is_free: RoomMgr.conf.is_free,
            roomName: RoomMgr.conf.name,
            user_id: user_id
        }
        uNet.send(client, msg.G2H_UserEnterGame, null, data);
    },
    sendUserExitGame() {
        const data = {
            kind_id: RoomMgr.conf.kind_id,
            base_score: RoomMgr.conf.base_score,
            is_special: RoomMgr.conf.is_special,
            is_free: RoomMgr.conf.is_free
        }
        uNet.send(client, msg.G2H_UserExitGame, null, data);
    }
}