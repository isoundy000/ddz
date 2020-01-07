const msg = require('../common/msg');
const uNet = require("../utils/uNet");
const http = require('../utils/http');
const crypto = require('../utils/crypto');
const playerService = require('../common/service/playerService')
const gameService = require('../common/service/gameService')
const server = uNet.createServer()
let config = null;
let clients = {};
let user_infos = {};

module.exports = {
    /**
     * 处理消息
     * @param {*} client 
     * @param {*} index 对应服务器的索引
     * @param {*} data 
     */
    dealMsg(client, data, self) {
        try {
            if (data.msg == msg.G2H_Heart) {
                uNet.send(client, msg.G2H_Heart);
            }
            //子游戏向大厅注册
            else if (data.msg == msg.G2H_Register) {
                if (data.kind_id) {
                    let client_info = {
                        client: client,
                        client_ip: data.client_ip,
                        client_port: data.client_port,
                        online_player_count: Math.floor(Math.random() * 50 + 10),
                        room_code: data.room_code,
                        status: 0,//1表示金币场关闭
                        is_free: data.is_free,
                        base_score: data.base_score,
                        is_special: data.is_special,
                        limit_mix_score: data.limit_mix_score,
                        limit_max_score: data.limit_max_score,
                        kind_id: data.kind_id,
                        roomName: data.roomName
                    }
                    if (clients[data.kind_id] == null) {
                        clients[data.kind_id] = []
                    }
                    clients[data.kind_id].push(client_info);
                    uNet.send(client, msg.H2G_Register);
                }
                else {
                    uNet.send(client, msg.H2G_Register, "no kind_id");
                }
            }
            //更新玩家信息到大厅
            else if (data.msg == msg.G2H_UpUserInfo) {
                if (data.account == null) {
                    console.log("coinsService:G54 账号为空");
                    return
                }
                let user_info = user_infos[data.account] || {}
                user_info.account = data.account;
                user_info.user_id = data.user_id;
                user_info.name = data.name;
                user_info.coins = data.coins;
                user_info.sex = data.sex;
                user_info.gems = data.gems;
                user_info.game_name = data.game_name;
                user_info.is_gaming = data.is_gaming;
                user_info.roomName = data.roomName;
                user_infos[data.account] = user_info;
                console.log(data);
            }
            //游戏开始
            else if (data.msg == msg.G2H_UserGameStart) {
                for (const key in data.user_infos) {
                    let user = data.user_infos[key]
                    let info = self.getUserInfo(user.user_id)
                    if (info) {
                        info.is_gaming = user.is_gaming;
                    }
                }
            }
            //游戏结束
            else if (data.msg == msg.G2H_UserGameFinish) {
                let user_info = self.getUserInfo(data.user_id)
                if (user_info) {
                    user_info.is_gaming = data.is_gaming;
                    if (self.isClientFree(client) == false) {
                        user_info.coins = data.coins;
                    }
                }
            }
            //更新金币
            else if (data.msg == msg.G2H_UserUpdateCoins) {
                let user_info = user_infos[data.account]
                if (user_info && self.isClientFree(client) == false) {
                    user_info.coins = data.coins;
                }
            }
            //玩家进入金币场
            else if (data.msg == msg.G2H_UserEnterGame) {
                let client_info = self.getGameClient(data.kind_id, data.base_score, data.is_special, data.is_free);
                if (client_info != null) {
                    client_info.online_player_count++;
                }
                let user_info = self.getUserInfo(data.user_id)
                if (user_info) {
                    user_info.roomName = data.roomName;
                    console.log(data);
                }
            }
            //玩家离开金币场
            else if (data.msg == msg.G2H_UserExitGame) {
                let client_info = self.getGameClient(data.kind_id, data.base_score, data.is_special, data.is_free);
                if (client_info != null) {
                    client_info.online_player_count--;
                }
            }
        } catch (error) {
            console.error(`coinService.js G:107 MsgID:${data.msg}
                error: ${error}`);
        }
    },
    getGameClient(kind_id, base_score, is_special, is_free) {
        const client_infos = clients[kind_id];
        for (const key in client_infos) {
            const client_info = client_infos[key];
            if (client_info.base_score == base_score
                && client_info.is_special == is_special
                && client_info.is_free == is_free) {
                return client_info;
            }
        }
        return null;
    },
    /**
     * 
     * @param {*} room_code 
     */
    getGameClientByRoomCode(room_code) {
        for (const kind_id in clients) {
            const client_infos = clients[kind_id];
            for (const key in client_infos) {
                const client_info = client_infos[key];
                if (client_info.room_code == room_code) {
                    return client_info;
                }
            }
        }
        return null;
    },
    isClientFree(socket) {
        for (const client_infos in clients) {
            for (const key in client_infos) {
                const client_info = client_infos[key];
                if (client_info.client == socket) {
                    return client_info.is_free;
                }
            }
        }
        return null;
    },
    /**
     * 获取已经开启的金币场信息
     * @param {*} req 
     * @param {*} res 
     */
    getStartGame(req, res) {
        let ret = [];
        for (const kind_id in clients) {
            ret.push(kind_id);
        }
        // console.log(ret)
        http.send(res, 0, "ok", ret);
    },
    /**
     * 通过kind_id获取子游戏的信息
     * @param {*} req 
     * @param {*} res 
     */
    getGameInfo(req, res) {
        const data = req.query;
        const kind_id = data.kind_id;
        const client_infos = clients[kind_id]
        let ret = [];
        if (client_infos) {
            for (const key in client_infos) {
                let client_info = {
                    kind_id: kind_id,
                    is_free: client_infos[key].is_free,
                    base_score: client_infos[key].base_score,
                    is_special: client_infos[key].is_special,
                    limit_mix_score: client_infos[key].limit_mix_score,
                    limit_max_score: client_infos[key].limit_max_score,
                    online_player_count: client_infos[key].online_player_count,
                }
                ret.push(client_info);
            }
            // console.log(ret)
            http.send(res, 0, "ok", { services: ret });
        } else {
            http.send(res, 1, "游戏暂未开放，敬请期待！");
        }
    },
    /**
     * 获取user_info
     * @param {*} user_id 
     */
    getUserInfo(user_id) {
        for (const key in user_infos) {
            if (user_infos[key].user_id == user_id) {
                return user_infos[key]
            }
        }
        return null;
    },
    /**
     * 进入金币场
     * @param {*} req 
     * @param {*} res 
     */
    enterCoinGame(req, res) {

        const data = req.query;
        const kind_id = data.kind_id;
        const base_score = parseInt(data.base_score);
        const is_special = data.is_special == "true";
        let is_free = null;
        if (data.is_free == "true") {
            is_free = true;
        }
        else if (data.is_free == "false") {
            is_free = false;
        }
        const account = data.account;
        const client_info = this.getGameClient(kind_id, base_score, is_special, is_free);

        let httpSend = function (obj) {
            if (obj.err_msg == null) {
                let ret = {
                    ip: obj.ip,
                    port: obj.port,
                    is_gaming: obj.is_gaming,
                    kind_id: obj.kind_id,
                    time: Date.now()
                }
                ret.sign = crypto.md5(ret.time + config.ROOM_PRI_KEY)
                http.send(res, 0, "ok", ret);
            }
            else {
                http.send(res, 1, obj.err_msg);
            }
        }

        let uNetSend = function (client, account, user_id, name, coins, sex, gems, ctrl_ratio) {
            uNet.send(client, msg.H2G_UserEnterGame, null, {
                account: account,
                user_id: user_id,
                sex: sex,
                name: name,
                coins: coins,
                gems: gems,
                ctrl_ratio: ctrl_ratio,
            })
        }

        let getUserDataByAccount = function (account, client_info) {
            playerService.getUserDataByAccount(account, (err, result) => {
                if (err) {
                    console.log(err);
                    return;
                }
                if (result == null) {
                    http.send(res, 1, "当前账号不存在");
                    return;
                }
                if (result.roomid != null) {
                    http.send(res, 1, "当前玩家正在私人房间");
                    return;
                }

                if (result.coins < client_info.limit_mix_score && client_info.is_free == false) {
                    httpSend({
                        ip: client_info.client_ip,
                        port: client_info.client_port,
                        kind_id: kind_id,
                        is_gaming: false,
                        err_msg: "金币不足,请充值",
                    })
                }
                else if (result.coins > client_info.limit_max_score && client_info.is_free == false) {
                    httpSend({
                        ip: client_info.client_ip,
                        port: client_info.client_port,
                        kind_id: kind_id,
                        is_gaming: false,
                        err_msg: "玩家拥有金币超出当前场次限制，请前往更高场次进行游戏。",
                    })
                }
                else {
                    let name = crypto.fromBase64(result.name);
                    user_infos[account] = user_infos[account] || {}
                    let user_info = user_infos[account];
                    user_info.account = account;
                    user_info.user_id = result.userid;
                    user_info.name = name;
                    user_info.coins = result.coins;
                    user_info.sex = result.sex;
                    user_info.gems = result.gems;
                    user_info.ip = client_info.client_ip;
                    user_info.port = client_info.client_port;
                    user_info.room_code = client_info.room_code;
                    user_info.roomName = client_info.roomName;
                    user_info.kind_id = kind_id;
                    user_info.base_score = base_score;
                    user_info.is_special = is_special;
                    user_info.is_free = false;
                    user_info.is_gaming = false;
                    if (client_info.is_free == true) {
                        user_info.is_free = true;
                        uNetSend(client_info.client, account, result.userid, name, base_score * 100, result.sex, result.gems, result.ctrl_ratio)
                    }
                    else {
                        user_info.is_free = false;
                        uNetSend(client_info.client, account, result.userid, name, result.coins, result.sex, result.gems, result.ctrl_ratio)
                    }
                    httpSend({
                        ip: client_info.client_ip,
                        port: client_info.client_port,
                        kind_id: kind_id,
                        is_gaming: false,
                        err_msg: null,
                    })
                }
            })
        }

        if (client_info == null || client_info.status == 1) {
            http.send(res, 1, "当前金币场未开");
            return;
        }

        if (user_infos[account]) {
            let user_info = user_infos[account]
            //进入还在玩的金币场
            if (user_info.is_gaming)
                if (user_info.base_score == base_score && user_info.is_special == is_special && user_info.is_free == is_free) {
                    httpSend({
                        ip: user_info.ip,
                        port: user_info.port,
                        kind_id: user_info.kind_id,
                        is_gaming: true,
                        err_msg: null,
                    });
                }
                else {
                    //进入其他的的金币场,会让用户返回之前已经再玩的金币场
                    let client_info = this.getGameClient(user_info.kind_id, user_info.base_score, user_info.is_special, user_info.is_free);
                    if (client_info != null) {
                        httpSend({
                            ip: client_info.client_ip,
                            port: client_info.client_port,
                            kind_id: client_info.kind_id,
                            is_gaming: true,
                            err_msg: null,
                        });
                    }
                    else {
                        user_info.is_gaming = false;
                        http.send(res, 1, "当前金币场已关闭");
                    }
                }
            else {
                getUserDataByAccount(account, client_info)
            }
        }
        else {
            getUserDataByAccount(account, client_info)
        }
    },
    /**
     * 修改金币场的机器人胜率
     * @param {*} req 
     * @param {*} res 
     */
    setDifficultyDegree(req, res) {
        let data = req.params;
        let room_code = data.room_code;
        let difficulty_degree = parseInt(data.difficulty_degree);
        let player_ctrl_param = parseInt(data.player_ctrl_param);
        if (!room_code || Number.isNaN(difficulty_degree) || Number.isNaN(player_ctrl_param)) {
            http.send(res, 1, "invalid arguments")
            return
        }
        let client_info = this.getGameClientByRoomCode(room_code);
        if (!client_info) {
            http.send(res, 1, "no this coins server")
            return
        }
        uNet.send(client_info.client, msg.H2G_SetDifficultyDegree, null, {
            difficulty_degree: difficulty_degree,
            player_ctrl_param: player_ctrl_param
        })
        http.send(res, 0, "ok");
    },
    /**
     * 更新金币场配置数据
     * @param {*} req 
     * @param {*} res 
     */
    async updateCoinsConfig(req, res) {
        try {
            let data = req.params;
            let room_code = data.room_code;
            let client_info = this.getGameClientByRoomCode(room_code);
            let redis_room = await gameService.getCoinsConfigs(room_code);
            if (client_info == null || redis_room == null) {
                http.send(res, 1, `无对应金币场数据`)
                return
            }
            client_info.status = redis_room.status || client_info.status;
            client_info.base_score = redis_room.base_score || client_info.base_score;
            client_info.limit_mix_score = redis_room.min_enter_score || client_info.limit_mix_score;
            client_info.limit_max_score = redis_room.max_enter_score || client_info.limit_max_score;
            uNet.send(client_info.client, msg.H2G_UpdateCoinsConfig, null, null)
            http.send(res, 0, `ok`);
        } catch (error) {
            console.log(error);
            http.send(res, 1, `error`);
        }
    },
    /**
     * 更新玩家点控
     * @param {*} req 
     * @param {*} res 
     */
    updateCtrlRatio(req, res) {
        let data = req.params;
        let user_id = data.user_id;
        let user_info = this.getUserInfo(user_id);
        if (user_info == null) {
            http.send(res, 1, `无玩家:${user_id}数据`)
            return
        }
        let client_info = this.getGameClientByRoomCode(user_info.room_code);
        if (client_info == null) {
            console.log(`无对应金币场：${user_info.room_code}数据`);
            http.send(res, 1, `无对应金币场：${user_info.room_code}数据`)
            return
        }
        uNet.send(client_info.client, msg.H2G_UpdateCtrlRatio, null, { user_id: user_id })
        http.send(res, 0, `ok`);
    },

    /**
     * 获取所有麻将金币场的在线玩家列表
     */
    getOnlinePlayers: function () {
        var userList = [];
        for (const key in user_infos) {
            var userInfo = user_infos[key];
            var playerInfo = {};
            if (userInfo.is_gaming == false) {
                continue;
            }
            playerInfo.userId = userInfo.user_id;
            playerInfo.name = userInfo.name;
            playerInfo.headimg = userInfo.headimg;
            playerInfo.coins = userInfo.coins;
            playerInfo.roomId = '000000';
            playerInfo.roomName = userInfo.roomName;
            userList.push(playerInfo);
        }
        console.log(userList);
        return userList;
    },
    start($config) {
        config = $config;
        uNet.serverOnConnection(server, clients, this.dealMsg, this);
        server.listen(config.COIN_SERVER_PORT, () => {
            console.log('server bound: ' + config.COIN_SERVER_PORT);
        })
    },
}



