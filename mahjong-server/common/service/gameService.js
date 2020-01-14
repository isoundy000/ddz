/**
 * @author hyw
 * @date
 * @description: 游戏管理业务类
 */
var db = require('../../utils/db');
var crypto = require('../../utils/crypto');
var uArray = require('../../utils/uArray');
var uTime = require('../../utils/uTime');
var constants = require('../../constants');
var cacheUtil = require('../../utils/cacheUtil');
function nop(a, b, c, d, e, f, g) {

}

module.exports = {
    /**
     * 删除游戏存档
     */
    deleteGameArchive: function () {
        let sql = "SELECT * FROM t_games_archive";
        db.queryForList(null, null, sql, null, (err, archives) => {
            if (err) {
                console.log("执行定时任务，查询游戏存档出错：" + err);
                return;
            }
            let now_time = uTime.now();
            for (const archive of archives) {
                if (now_time - archive.create_time > 7 * 24 * 60 * 60) {
                    let sql = `DELETE FROM t_games_archive WHERE room_uuid = ${archive.room_uuid}`;
                    db.update(sql, null, (err, result) => {
                        if (err) {
                            console.log("执行定时任务，删除游戏存档出错：" + err);
                        } else {
                            console.log("执行定时任务，成功删除游戏存档数据");
                        }
                    })
                }
            }
        })
    },
    /**
     * 获取room_uuid房间的游戏记录
     */
    getGamesOfRoom: function (room_uuid, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT game_index,create_time,result FROM t_games_archive WHERE room_uuid = ?';
        const args = uArray.push(room_uuid);
        db.queryForList(null, null, sql, args, callback);
    },
    /**
     * 获取room_uuid中某一局游戏记录
     */
    getDetailOfGame: function (room_uuid, index, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT base_info,action_records,result_detail FROM t_games_archive WHERE room_uuid = ? AND game_index = ?';
        const args = uArray.push(room_uuid, index)
        db.queryForObject(sql, args, callback);
    },
    /**
     * 房间是否存在
     */
    isRoomExist: function (roomId, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT uuid FROM t_rooms WHERE id = ?';
        const args = uArray.push(roomId);
        db.queryForObject(sql, args, callback)
    },
    /**
     * 更新玩家游戏房间
     */
    updateRoomIdOfUserByUserId: function (userId, roomId, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'UPDATE t_users SET roomid = ? WHERE userid = ?';
        const args = uArray.push(roomId, userId);
        db.update(sql, args, callback);
    },
    /**
     * 
     * @param {*} user_id 
     * @param {*} seat_index 
     * @param {*} callback 
     */
    updateUserExitRoom(user_id, seat_index, callback) {
        let i = parseInt(seat_index);
        if (Number.isNaN(i)) {
            return;
        }
        let sql = `update t_rooms r, t_users u set r.user_id${i} = '0',r.user_icon${i} = '',r.user_name${i} = '',r.user_score${i}='0',r.user_gems${i}='0',r.user_coins${i} = '0',r.user_ctrl_param${i} = '',u.roomid = NULL where u.userid = ? and r.id = u.roomid;`
        let args = uArray.push(user_id, user_id);
        db.update(sql, args, callback);
    },

    /**
 * 百人牛牛删除玩家数据
 * @param {*} user_id 
 * @param {*} seat_index 
 * @param {*} callback 
 */
    updateUserExitRoomN(user_id, roomId, callback) {
        // let i = parseInt(seat_index);
        // if (Number.isNaN(i)) {
        //     return;
        // }
        let sql0 = "select seats from t_rooms where id = ?; ";
        const args = uArray.push(roomId);
        db.queryForObject(sql0, args, function (err, data) {
            if (!err) {
                let seats = JSON.parse(data.seats);
                delete seats[user_id];
                seats = JSON.stringify(seats);
                let sql = `update t_rooms r, t_users u set r.seats = ?,u.roomid = NULL where r.id =? and u.userid = ?;`
                let args = uArray.push(seats, roomId, user_id);
                db.update(sql, args, callback);
            }
        })

    },
    /**
     * 获取玩家房间信息
     */
    getRoomIdByUserId: function (userId, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT roomid FROM t_users WHERE userid = ?';
        const args = uArray.push(userId);
        db.queryForInt(sql, args, callback);
    },
    /**
     * 创建游戏房间
     */
    createRoom: function (roomId, conf, ip, port, create_time, creator_id, is_daikai, belongs_club, callback) {
        callback = callback == null ? nop : callback;
        var sql = "INSERT INTO t_rooms(uuid,id,base_info,ip,port,create_time,state,creator_id,is_daikai,belongs_club) VALUES(?,?,?,?,?,?,?,?,?,?)"
        const uuid = Date.now() + roomId;
        const baseInfo = JSON.stringify(conf);
        const args = uArray.push(uuid, roomId, baseInfo, ip, port, create_time, "ready", creator_id, is_daikai, belongs_club);

        db.save(sql, args, (err, result) => {
            if (err) {
                callback(null);
                console.log("createRoom: " + err);
                return;
            }
            callback(uuid);
        })
    },
	/**
	* @brief 创建游戏房间
	*
	* @param roomId
	* @param conf
	* @param ip
	* @param port
	* @param create_time
	* @param creator_id
	* @param is_daikai
	* @param belongs_club
	* @param is_private 是否是私人房间
	* @param game_id 房间id
	* @param callback
	*
	* @return 
	*/
    createRoom2: function (roomId, conf, ip, port, create_time, creator_id, is_daikai, belongs_club, is_private, game_id, callback) {
        callback = callback == null ? nop : callback;
        var sql = "INSERT INTO t_rooms(uuid,id,base_info,ip,port,create_time,state,creator_id,is_daikai,belongs_club, is_private, game_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)"
        const uuid = Date.now() + roomId;
        const baseInfo = JSON.stringify(conf);
        const args = uArray.push(uuid, roomId, baseInfo, ip, port, create_time, "ready", creator_id, is_daikai, belongs_club, is_private, game_id);

        db.save(sql, args, (err, result) => {
            if (err) {
                callback(null);
                console.log("createRoom: " + err);
                return;
            }
            callback(uuid);
        })
    },
    /**
     * 获取房间uuid
     */
    getRoomUuidByRoomId: function (roomId, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT uuid FROM t_rooms WHERE id = ?';
        const args = uArray.push(roomId);
        db.queryForInt(sql, args, callback);
    },
    /**
     * 更新房间用户信息
     */
    updateSeatInfo: function (roomId, seatIndex, userId, icon, name, coins, ctrl_param, callback) {
        callback = callback == null ? nop : callback;
        let i = parseInt(seatIndex);
        if (Number.isNaN(i)) {
            return;
        }
        var sql = `UPDATE t_rooms SET user_id${i} = ?,user_icon${i} = ?,user_name${i} = ?,user_coins${i} = ?,user_ctrl_param${i} = ? WHERE id = ?`;
        name = crypto.toBase64(name);
        const args = uArray.push(userId, icon, name, coins, ctrl_param, roomId);
        db.update(sql, args, callback);
    },
    /**
     * 更新局数
     */
    updateNumOfTurns: function (roomId, numOfTurns, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'UPDATE t_rooms SET num_of_turns = ? WHERE id = ?'
        const args = uArray.push(numOfTurns, roomId);
        db.update(sql, args, callback);
    },
    /**
     * 更新游戏房间存储局数
     * @param {*} roomId 
     * @param {*} numOfTurns 
     */
    async updateNumOfTurnsAsync(roomId, numOfTurns) {
        return new Promise((resolve, reject) => {
            var sql = 'UPDATE t_rooms SET num_of_turns = ? WHERE id = ?'
            const args = uArray.push(numOfTurns, roomId);
            db.update(sql, args, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        }).catch((err) => {
            console.log(`gameService:G:203${err}`);
        })
    },
    /**
     * 更新分数
     */
    updateUserScore: function (room_id, index, score, callback) {
        callback = callback == null ? nop : callback;
        var sql = `UPDATE t_rooms SET user_score${index} = ? WHERE id = ?`;
        const args = uArray.push(score, room_id);
        db.update(sql, args, callback);
    },
    /**
     * 更新房间存储分数
     * @param {*} room_id 
     * @param {{user_score$:number}} obj
     */
    async updateUserScoreAsync(room_id, obj) {
        return new Promise((resolve, reject) => {
            var sql = `UPDATE t_rooms SET ? WHERE id = ?`;
            const args = uArray.push(obj, room_id);
            db.update(sql, args, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        }).catch((err) => {
            console.log(`gameService:G:232${err}`);
        })
    },
    /**
     * 更新庄家
     */
    updateNextButton: function (roomId, nextButton, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'UPDATE t_rooms SET next_button = ? WHERE id = ?'
        const args = uArray.push(nextButton, roomId);
        db.update(sql, args, callback);
    },

    /**
     * 更新配置
     */
    updateBaseInfo: function (roomId, base_info, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'UPDATE t_rooms SET base_info = ? WHERE id = ?'
        const args = uArray.push(base_info, roomId);
        db.update(sql, args, callback);
    },

    /**
     * 获取房间所在服务器ip和端口号
     */
    getRoomAddr: function (roomId, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT ip,port FROM t_rooms WHERE id = ?';
        const args = uArray.push(roomId);
        db.queryForObject(sql, args, callback)
    },
    /**
     * 获取房间用户信息
     */
    getRoomData: function (roomId, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT * FROM t_rooms WHERE id = ?';
        const args = uArray.push(roomId);
        db.queryForObject(sql, args, callback)
    },
    /**
     * 删除游戏房间
     */
    deleteRoom: function (roomId, callback) {
        callback = callback == null ? nop : callback;
        var sql = "update t_users set roomid = NULL where roomid = ?;DELETE FROM t_rooms WHERE id = ?;";
        const args = uArray.push(roomId, roomId);
        db.batchExecute(sql, args, callback)
    },
    /**
     * 创建游戏
     */
    createGame: function (room_uuid, index, base_info, callback) {
        callback = callback == null ? nop : callback;
        var sql = "INSERT INTO t_games(room_uuid,game_index,base_info,create_time) VALUES(?,?,?,unix_timestamp(now()))";
        const args = uArray.push(room_uuid, index, base_info);
        db.save(sql, args, callback)
    },
    /**
     * 创建房间场游戏战绩
     * @param {*} obj 
     */
    async createGameAsync(obj) {
        return new Promise((resolve, reject) => {
            let sql = 'insert into t_games set ?';
            db.save(sql, obj, (err, res) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(res);
                }
            })
        }).catch((err) => {
            console.log(`gameService:G:306${err}`);
        })
    },
    /**
     * 刪除游戲
     */
    deleteGames: function (room_uuid, callback) {
        callback = callback == null ? nop : callback;
        var sql = "DELETE FROM t_games WHERE room_uuid = ?";
        const args = uArray.push(room_uuid);
        db.delete(sql, args, callback);
    },
    archiveGames: function (room_uuid, callback) {
        callback = callback == null ? nop : callback;
        var sql = "INSERT INTO t_games_archive(SELECT * FROM t_games WHERE room_uuid = ?)";
        const args = uArray.push(room_uuid);
        db.save(sql, args, (err, result) => {
            if (err) {
                console.log(err);
                callback(err, result);
                return
            }
            this.deleteGames(room_uuid, callback)
        });
    },
    /**
     * 更新玩家游戏操作
     */
    updateGameActionRecords: function (room_uuid, index, actions, callback) {
        callback = callback == null ? nop : callback;
        var sql = "UPDATE t_games SET action_records = ? WHERE room_uuid = ? AND game_index = ?";
        const args = uArray.push(actions, room_uuid, index);
        db.update(sql, args, callback)
    },
    /**
     * 更新游戏分数
     */
    updateGameResult: function (room_uuid, index, result, callback) {
        callback = callback == null ? nop : callback;
        const _result = JSON.stringify(result);
        var sql = "UPDATE t_games SET result = ? WHERE room_uuid = ? AND game_index = ?";
        const args = uArray.push(_result, room_uuid, index);
        db.update(sql, args, callback)
    },
    /**
     * 设置房间状态
     */
    setGameStatePlaying: function (roomid, callback) {
        callback = callback == null ? nop : callback;
        var sql = `UPDATE t_rooms SET state = "playing" WHERE id = ?`;
        const args = uArray.push(roomid);
        db.update(sql, args, callback)
    },
    //--------------------------------------------------------------
    /**
     * 根据创建人获取房间信息
     */
    getRoomsInfoByCreatorId: function (user_id, callback) {
        callback = callback == null ? nop : callback;
        var sql = `SELECT * FROM t_rooms WHERE creator_id = ? AND is_daikai = 1`;
        const args = uArray.push(user_id);
        db.queryForList(null, null, sql, args, callback);
    },
    /**
     * 通过用户id获取房卡数量
     * @param {*} user_id 
     * @param {*} callback 
     */
    getGemsByUserIds(user_ids, callback) {
        var sql = "";
        let args = [];
        for (const key in user_ids) {
            sql += "SELECT gems FROM t_users WHERE userid = ?;"
            args.push(user_ids[key])
        }
        db.queryForList(null, null, sql, args, callback);
    },
    //param {*} play_duration 游戏时长（单位秒）
    //@param {*} record_time 记录时间
    /**
     * 玩家游戏记录存储
     * @param {*} player_id 玩家ID
     * @param {*} username 玩家昵称
     * @param {*} game_type 游戏类别 hjmj 获嘉麻将 zzmj 郑州麻将
     * @param {*} create_ime 创建时间
     * @param {*} win_score 输赢分值
     * @param {*} callback 
     */
    saveGameRecord(player_id, username, game_type, create_ime, win_score, seatcount, roomId, jushu, sum_all, club_id, user_type, callback) {
        let sql = 'insert into t_game_record(fk_player_id, username, game_type, play_duration, win_score, record_time,seatcount,roomId,jushu,sum_all,club_id,user_type) values(?,?,?,?,?,?,?,?,?,?,?,?)'
        const record_time = uTime.now();
        const play_duration = record_time - create_ime;
        const name = crypto.toBase64(username);
        const args = uArray.push(player_id, name, game_type, play_duration, win_score, record_time, seatcount, roomId, jushu, sum_all, club_id, user_type)
        db.save(sql, args, callback)
    },

    /**
 * 玩家游戏积分记录存储
 * @param {*} player_id 玩家ID
 * @param {*} username 玩家昵称
 * @param {*} game_type 游戏类别 hjmj 获嘉麻将 zzmj 郑州麻将
 * @param {*} create_ime 创建时间
 * @param {*} jifen 输赢分值
 * @param {*} callback 
 */
    saveGameJiFenRecord(player_id, username, game_type, create_ime, jifen, seatcount, roomId, jushu, sum_all, club_id, callback) {
        let sql = 'insert into t_game_record(fk_player_id, username, game_type, play_duration, jifen, record_time,seatcount,roomId,jushu,sum_all,club_id) values(?,?,?,?,?,?,?,?,?,?,?)'
        const record_time = uTime.now();
        const play_duration = record_time - create_ime;
        const name = crypto.toBase64(username);
        const args = uArray.push(player_id, name, game_type, play_duration, jifen, record_time, seatcount, roomId, jushu, sum_all, club_id)
        db.save(sql, args, callback)
    },
    /**
     * 获取玩家游戏记录
     * @param {number} user_id 
     * @param {Function} callback 
     */
    getGameRecord(user_id, callback) {
        let sql = `select * from t_game_record where fk_player_id = ?`
        let args = uArray.push(user_id);
        db.queryForList(null, null, sql, args, callback);
    },
    /**
     * 获取玩家游戏记录
     * @param {number} user_id 
     * @param {Function} callback 
     */
    async getGameRecordAsync(user_id) {
        return new Promise((resolve, reject) => {
            let sql = `select * from t_game_record where fk_player_id = ?`
            let args = uArray.push(user_id);
            db.queryForList(null, null, sql, args, (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(res);
            });
        }).catch((err) => {
            console.log(`gameService:G:429${err}`);
        })
    },
    /**
     * 获取房间场配置
     */
    getCoinsRoomInfo(callback) {
        let sql = 'select * from t_room_info';
        db.queryForList(null, null, sql, null, callback);
    },

    /**
     * 获取配置信息
     * @param {*} room_code 
     */
    async getCoinsConfigs(room_code) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            let queryForDB = function () {
                self.getCoinsRoomInfo((err, res) => {
                    if (err) {
                        console.log(err);
                        resolve(null)
                    }
                    else {
                        cacheUtil.set(constants.CACHE_COINS_GAME_CONFIG, JSON.stringify(res));
                        for (const key in res) {
                            if (res[key].room_code == room_code) {
                                console.log('从数据库获取')
                                resolve(res[key])
                                break;
                            }
                        }
                        resolve(null)
                    }
                })
            }
            let configs = await cacheUtil.getAsync(constants.CACHE_COINS_GAME_CONFIG);
            if (configs == null) {
                await cacheUtil.selectAsync(1);
                configs = await cacheUtil.getAsync(constants.CACHE_COINS_GAME_CONFIG);
            }
            if (configs == null || configs == '') {
                queryForDB()
            }
            else {
                let _configs = JSON.parse(configs);
                for (const key in _configs) {
                    if (_configs[key].room_code == room_code) {
                        console.log('从Redis缓存获取')
                        resolve(_configs[key])
                        return;
                    }
                }
                queryForDB()
            }
        })
    },
    /**
     * 存储房间场游戏结算信息
     * @param {*} room_uuid 
     * @param {*} game_index 
     * @param {*} results 
     */
    async storeGameResultAsync(room_uuid, game_index, results) {
        return new Promise((resolve, reject) => {
            try {
                let sql = "update t_games set result_detail = ?";
                let args = [];
                args.push(results);
                db.update(sql, args, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        if (result == null) {
                            reject("更新出错，无返回");
                        }
                        else {
                            resolve(result);
                        }
                    }
                })
            } catch (error) {
                reject(error);
            }
        }).catch((err) => {
            console.log(`gameService:G:515${err}`);
        })
    },
    /**
     * 更新对应金币场入场费+抽水数据
     * @param {Number} bonus 
     * @param {*} room_code 
     */
    async updateBonusPoolByRoomCode(bonus, room_code) {
        return new Promise((resolve, reject) => {
            let sql = "update t_room_info set bonus_pool = bonus_pool + ? where room_code = ?";
            let args = [];
            args.push(bonus);
            args.push(room_code);
            db.update(sql, args, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            })
        }).catch((err) => {
            console.log(`gameService:G:537 ${err}`);
        })
    },
    /**
     * 根据游戏id获取当前游戏的公开房间
     * @param {number} pagePos 开始查询的位置
     * @param {number} pageSize 查询的长度
     * @param {string} gameIds 游戏id
     */
    getPublicRoomsAsync(pagePos, pageSize, gameIds) {
        return new Promise((resolve, reject) => {
            gameIds.trim()
            let ids = gameIds.split(",");
            let query_string = ''
            ids.forEach((id, index) => {
                if (!parseInt(id)) {
                    reject(`id错误${id}`);
                    return
                }
                if (index == ids.length - 1) {
                    query_string += '?'
                }
                else {
                    query_string += '?,'
                }
            })
            let sql = `select * from t_rooms where game_id in(${query_string}) and is_private = 0 order by create_time desc`;
            db.queryForList(pagePos, pageSize, sql, ids, (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(res);
            })
        })
    },
    /**
     * 获取玩家游戏记录
     * @param {number} user_id
     * @param {Function} callback
     */
    getGameStatusAsync() {
        return new Promise((resolve, reject) => {
            let sql = `select id,game_name,game_code,status from t_game_info where 1=1 order by id desc`
            db.queryForList(null, null, sql, [], (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(res);
            });
        }).catch((err) => {
            console.log(`getGameStatusAsync:${err}`);
        })
    },
}
