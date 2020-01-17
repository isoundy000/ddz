/**
 * Created by Administrator on 2017/5/12 0012.
 */
var db = require('../../utils/db');
var uArray = require('../../utils/uArray');
var uTime = require('../../utils/uTime');
var commonService = require('./commonService');
var async = require('async');

module.exports = {
    GemsChangeType: {
        CreateRoom: "0",
        CreateUser: "1",
        SharePerDay: "2",
        JoinClub: "3",
    },
    /**
     * 生成订单
     * @param account
     * @param callback
     */
    createRechargeRecord: function (entity, callback) {
        var sql = 'insert into t_recharge_record set recharge_time = unix_timestamp(now()),  ?';
        var object = {};
        if (entity.id) {
            object.id = entity.id;
        }
        if (entity.goods_count) {
            object.goods_count = entity.goods_count;
        }
        if (entity.goods_type) {
            object.goods_type = entity.goods_type;
        }
        if (entity.order_money) {
            object.order_money = entity.order_money;
        }
        object.pay_status = 0;
        if (entity.pay_way) {
            object.pay_way = entity.pay_way;
        }
        if (entity.player_id) {
            object.player_id = entity.player_id;
        }
        db.save(sql, object, callback);
    },
    /**
     * 确认支付
     */
    confirmPay: function (orderId, callback) {
        //查看订单状态是否已完成支付
        this.getByOrderId(orderId, function (err, result) {
            if (err) {
                callback(err);
            } else {
                if (result) {
                    var payStatus = result.pay_status;
                    var userId = result.player_id;
                    var exchangeCount = result.goods_count;
                    var type = result.goods_type;
                    var payMoney = result.pay_money;
                    //console.log("******支付完成，處理訂單：" + JSON.stringify(result));
                    if (payStatus != 1) {
                        //更新订单状态及更新玩家房卡数量
                        var args = [];
                        var sql = 'update t_recharge_record set pay_status=? where id=? '
                        args.push(1);
                        args.push(orderId);
                        if (type == "gems") {
                            sql = sql + ';update t_users set gems=gems+? where userid=? ';
                        } else {
                            sql = sql + ';update t_users set coins=coins+? where userid=? ';
                        }
                        args.push(exchangeCount);
                        args.push(userId);
                        //console.log("******充值完成，更新玩家信息：" + sql);
                        db.update(sql, args, callback);
                    } else {
                        var error = {};
                        error.msg = 'order has changed';
                        callback(null, error);
                    }
                } else {
                    var error = {};
                    error.msg = 'not found record';
                    callback(error);
                }
            }
        })
    },
    /**
     * 根据订单ID获取订单
     * @param orderId
     * @param callback
     */
    getByOrderId: function (orderId, callback) {
        var sql = 'select id,goods_count,goods_type,order_money,pay_status,pay_way,player_id,recharge_time  from t_recharge_record where id = ?';
        var args = [];
        args.push(orderId);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 修改玩家房卡
     * @param {*} user_id 玩家id
     * @param {*} change_count 修改数量
     * @param {*} callback 
     */
    changeUserGems(user_id, change_count, callback) {
        let sql = "update t_users set gems=gems+? where userid=?";
        let args = [];
        args.push(change_count);
        args.push(user_id);
        db.update(sql, args, callback);
    },

    /**
 * 修改玩家积分
 * @param {*} user_id 玩家id
 * @param {*} change_count 修改数量
 * @param {*} callback 
 */
    changeUserJifen(user_id, change_count, callback) {
        let sql = "update t_users set jifen=jifen+? where userid=?";
        let args = [];
        args.push(change_count);
        args.push(user_id);
        db.update(sql, args, callback);
    },
    /**
     * 修改玩家金币
     * @param {*} user_id 玩家id
     * @param {*} change_count 修改数量
     * @param {*} callback 
    */
    changeUserCoins(user_id, change_count, callback) {
        let sql = "update t_users set coins=coins+? where userid=?";
        let args = uArray.push(change_count, user_id);
        db.update(sql, args, callback);
    },
    /**
     * 修改玩家货币并且存到银行流水数据表中
     * @param {string | number} user_id 玩家ID
     * @param {number} change_count 修改数量
     * @param {number} change_type
     * @param {string} remark 备注
     *  @param {string} treasure_type 货币类型 "coins"、"gems
     * @param {*} callback 
     */
    changeUserGoldsAndSaveBankStatement(user_id, change_count, change_type, remark, treasure_type, callback) {
        if (treasure_type != "coins" && treasure_type != "gems") {
            callback("参数错误", null);
            return;
        }
        let self = this;
        let sql = `select name,coins,gems from t_users where userid = ?`;
        let args = [];
        args.push(user_id);
        db.queryForObject(sql, args, (err, user_info) => {
            if (err) {
                callback(err);
                return;
            };
            if (!user_info) {
                callback(null, null)
                return;
            }
            async.auto({
                change_info(cb) {
                    if (treasure_type == "coins") {
                        self.changeUserCoins(user_id, change_count, cb);
                    }
                    else if (treasure_type == "gems") {
                        self.changeUserGems(user_id, change_count, cb);
                    }
                },
                save_info(cb) {
                    let bank_statement = {}
                    bank_statement.fk_player_id = user_id;
                    bank_statement.username = user_info.name;
                    bank_statement.change_type = change_type;
                    if (treasure_type == "coins") {
                        bank_statement.change_before = user_info.coins;
                    }
                    else if (treasure_type == "gems") {
                        bank_statement.change_before = user_info.gems;
                    }
                    bank_statement.change_count = change_count;
                    bank_statement.remark = remark;
                    bank_statement.record_time = uTime.now();
                    bank_statement.treasure_type = treasure_type;
                    self.saveBankStatement(bank_statement, cb);
                }
            }, (err, res) => {
                if (err) {
                    callback(err);
                    return;
                };
                if (!res.change_info || !res.save_info) {
                    callback(null, null);
                    return;
                }
                callback(err, res);
            })
        })
    },
    /**
     * 修改玩家货币并且存到银行流水数据表中
     * @param {string | number} user_id 玩家ID
     * @param {number} change_count 修改数量
     * @param {number} change_type
     * @param {string} remark 备注
     *  @param {string} treasure_type 货币类型 "coins"、"gems
     * @param {boolean} not_change 是否在数据库修改金币
     */
    async changeUserGoldsAndSaveBankStatementAsync(user_id, change_count, change_type, remark, treasure_type, not_change, uid, lv) {
        return new Promise(async (resolve, reject) => {
            try {
                if (treasure_type != "coins" && treasure_type != "gems") {
                    reject("参数错误");
                    return;
                }
                let self = this;
                let user_info = await commonService.getTableValuesAsync("name,coins,gems", "t_users", { userid: user_id });
                if (user_info == null) {
                    reject("无法获取用户数据:" + user_id);
                    return;
                }
                async.auto({
                    change_info(cb) {
                        if (not_change) {
                            cb(null, "null");
                            return
                        }
                        if (treasure_type == "coins") {
                            self.changeUserCoins(user_id, change_count, cb);
                        }
                        else if (treasure_type == "gems") {
                            self.changeUserGems(user_id, change_count, cb);
                        }
                    },
                    save_info(cb) {
                        let bank_statement = {}
                        bank_statement.fk_player_id = user_id;
                        bank_statement.username = user_info.name;
                        bank_statement.change_type = change_type;
                        if (treasure_type == "coins") {
                            bank_statement.change_before = user_info.coins;
                        }
                        else if (treasure_type == "gems") {
                            bank_statement.change_before = user_info.gems;
                        }
                        bank_statement.change_count = change_count;
                        bank_statement.remark = remark;
                        bank_statement.record_time = uTime.now();
                        bank_statement.treasure_type = treasure_type;
                        bank_statement.ext1 = uid;
                        bank_statement.ext2 = lv;
                        self.saveBankStatement(bank_statement, cb);
                    }
                }, (err, res) => {
                    if (err) {
                        reject(err);
                        return;
                    };
                    if (!res.change_info || !res.save_info) {
                        reject("存储失败");
                        return;
                    }
                    resolve(res);
                })
            } catch (error) {
                reject(error);
            }
        }).catch((err) => {
            console.log(`rechargeService:G:259 ${err}`);
        })
    },
    /**
     * 存储游戏场中金币输赢的信息
     * @param {*} user_id 玩家ID
     * @param {*} consume_count 消费金额
     * @param {*} consume_game 在哪个游戏里的消费 zzmj 郑州麻将 hjmj 获嘉麻将  xlch  血流成河  xzdd 血战到底
     * @param {*} consume_type 消费类型 coins 金币消费
     * @param {*} remark 备注，写明变化原因
     * @param {*} callback 
     */
    changeUserGoldsAndSaveConsumeRecord(user_id, consume_count, consume_game, consume_type, remark, callback) {
        if (consume_type != "coins" && consume_type != "gems") {
            callback("参数错误", null);
            return;
        }
        let self = this;
        let sql = `select name,coins,gems from t_users where userid = ?`;
        let args = [];
        args.push(user_id);
        db.queryForObject(sql, args, (err, user_info) => {
            if (err) {
                callback(err);
                return;
            };
            if (!user_info) {
                callback(null, null)
                return;
            }
            async.auto({
                change_info(cb) {
                    if (consume_type == "coins") {
                        self.changeUserCoins(user_id, consume_count, cb);
                    }
                    else if (consume_type == "gems") {
                        self.changeUserGems(user_id, consume_count, cb);
                    }
                },
                save_info(cb) {
                    let consume_record = {}
                    consume_record.fk_player_id = user_id;
                    consume_record.username = user_info.name;
                    consume_record.consume_game = consume_game;
                    if (consume_type == "coins") {
                        consume_record.consume_before = user_info.coins;
                    }
                    else if (consume_type == "gems") {
                        consume_record.consume_before = user_info.gems;
                    }
                    consume_record.consume_count = consume_count;
                    consume_record.record_time = uTime.now();
                    consume_record.consume_type = consume_type;
                    consume_record.remark = remark;
                    self.saveConsumeRecord(consume_record, cb);
                }
            }, (err, res) => {
                if (err) {
                    callback(err);
                    return;
                };
                if (!res.change_info || !res.save_info) {
                    callback(null, null);
                    return;
                }
                callback(err, res);
            })
        })
    },
    /**
     * 存储游戏场中金币输赢的信息
     * @param {*} user_id 玩家ID
     * @param {*} consume_count 消费金额
     * @param {*} consume_game 在哪个游戏里的消费 zzmj 郑州麻将 hjmj 获嘉麻将  xlch  血流成河  xzdd 血战到底
     * @param {*} consume_type 消费类型 coins 金币消费
     * @param {*} remark 备注，写明变化原因
     * @param {*} callback 
     */
    async changeUserGoldsAndSaveConsumeRecordAsync(user_id, consume_count, consume_game, consume_type, remark, roomId, clubId) {
        return new Promise(async (resolve, reject) => {
            try {
                if (consume_type != "coins" && consume_type != "gems" && consume_type != "jifen") {
                    reject("consume_type:参数错误" + consume_type);
                    return;
                }
                let self = this;
                let user_info = await commonService.getTableValuesAsync("name,coins,gems,jifen", "t_users", { userid: user_id });
                if (user_info == null) {
                    reject("未获取到用户数据");
                    return;
                }
                async.auto({
                    change_info(cb) {
                        if (consume_type == "coins") {
                            //console.log('保存数据库【'+user_info.name+'】当前账户余额：'+user_info.coins+'     账变金币量:'+consume_count);
                            self.changeUserCoins(user_id, consume_count, cb);
                        }
                        else if (consume_type == "gems") {
                            self.changeUserGems(user_id, consume_count, cb);
                        }
                        else if (consume_type == "jifen") {
                            self.changeUserJifen(user_id, consume_count, cb);
                        }
                    },
                    save_info(cb) {
                        let consume_record = {}
                        consume_record.fk_player_id = user_id;
                        consume_record.username = user_info.name;
                        consume_record.consume_game = consume_game;
                        if (consume_type == "coins") {
                            consume_record.consume_before = user_info.coins;
                        }
                        else if (consume_type == "gems") {
                            consume_record.consume_before = user_info.gems;
                        } else if (consume_type == "jifen") {
                            consume_record.consume_before = user_info.jifen;
                        }
                        consume_record.consume_count = consume_count;
                        consume_record.record_time = uTime.now();
                        consume_record.consume_type = consume_type;
                        consume_record.remark = remark;
                        consume_record.roomId = roomId;
                        consume_record.clubId = clubId;
                        self.saveConsumeRecord(consume_record, cb);
                    }
                }, (err, res) => {
                    if (err) {
                        reject(err);
                        return;
                    };
                    if (!res.change_info || !res.save_info) {
                        reject("存储失败");
                        return;
                    }
                    resolve(res);
                })
            } catch (error) {
                reject(error);
            }
        }).catch((err) => {
            console.log(`rechargeService:G:391 ${err}`);
        })
    },
    /**
 * 存储游戏场中总的金币输赢的信息
 * @param {*} user_id 玩家ID
 * @param {*} consume_count 消费金额
 * @param {*} consume_game 在哪个游戏里的消费 zzmj 郑州麻将 hjmj 获嘉麻将  xlch  血流成河  xzdd 血战到底
 * @param {*} consume_type 消费类型 coins 金币消费
 * @param {*} remark 备注，写明变化原因
 * @param {*} callback 
 */
    async changeUserGoldsAndSaveConsumeRecordAsyncA(user_id, consume_count, consume_game, consume_type, remark, all) {
        return new Promise(async (resolve, reject) => {
            try {
                if (consume_type != "coins" && consume_type != "gems" && consume_type != "jifen") {
                    reject("consume_type:参数错误" + consume_type);
                    return;
                }
                let self = this;
                let user_info = await commonService.getTableValuesAsync("name,coins,gems,jifen", "t_users", { userid: user_id });
                if (user_info == null) {
                    reject("未获取到用户数据");
                    return;
                }
                async.auto({
                    change_info(cb) {
                        if (consume_type == "coins") {
                            //console.log('保存数据库【'+user_info.name+'】当前账户余额：'+user_info.coins+'     账变金币量:'+consume_count);
                            self.changeUserCoins(user_id, consume_count, cb);
                        }
                        else if (consume_type == "gems") {
                            self.changeUserGems(user_id, consume_count, cb);
                        }
                        else if (consume_type == "jifen") {
                            self.changeUserJifen(user_id, consume_count, cb);
                        }
                    },
                    save_info(cb) {
                        let consume_record = {}
                        consume_record.fk_player_id = user_id;
                        consume_record.username = user_info.name;
                        consume_record.consume_game = consume_game;
                        if (consume_type == "coins") {
                            consume_record.consume_before = user_info.coins;
                        }
                        else if (consume_type == "gems") {
                            consume_record.consume_before = user_info.gems;
                        } else if (consume_type == "jifen") {
                            consume_record.consume_before = user_info.jifen;
                        }
                        consume_record.consume_count = consume_count;
                        consume_record.record_time = uTime.now();
                        consume_record.consume_type = consume_type;
                        consume_record.remark = remark;
                        consume_record.all = all;
                        self.saveConsumeRecord(consume_record, cb);
                    }
                }, (err, res) => {
                    if (err) {
                        reject(err);
                        return;
                    };
                    if (!res.change_info || !res.save_info) {
                        reject("存储失败");
                        return;
                    }
                    resolve(res);
                })
            } catch (error) {
                reject(error);
            }
        }).catch((err) => {
            console.log(`rechargeService:G:391 ${err}`);
        })
    },
    /**
     * 获取商场物品信息
     */
    getAllShopInfo: function (callback) {
        let sql = `SELECT * FROM t_shop_info`;
        db.queryForList(null, null, sql, null, callback);
    },
    /**
     * 根据ID获取商品信息
     * @param {*} gift_id 
     * @param {*} callback 
     */
    getShopInfoByShopId(gift_id, callback) {
        let sql = 'select * from t_shop_info where id = ?';
        let args = [];
        args.push(gift_id);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 根据type获取商品信息
     * @param {*} type
     * @param {*} callback 
     */
    getShopInfoByType(type, callback) {
        let sql = 'select * from t_shop_info where type = ?';
        let args = [];
        args.push(type);
        db.queryForList(null, null, sql, args, callback);
    },
    /**
     * 获取财富榜消息
     * @param {*} user_id 
     * @param {*} callback 
     */
    getBankStatement(user_id, callback) {
        let sql = `select * from t_bank_statement where fk_player_id = ? order by record_time DESC`
        let args = uArray.push(user_id);
        db.queryForList(1, 20, sql, args, callback);
    },

    /**
 * 获取战绩
 * @param {*} user_id 
 * @param {*} callback 
 */
    getMeClubZhanji(user_id, BeginTimestamp, pagenum, size, club_id, callback) {
        let sql0 = "select roomId from t_game_record where play_duration>=? and fk_player_id=? and club_id=?"
        let args = [BeginTimestamp, user_id, club_id];
        db.queryForAll(sql0, args, function (err, res) {
            if (err) (
                callback(err)
            )
            let sql = `select fk_player_id,username,play_duration,win_score,game.jifen,game.roomId,jushu,game_type,seatCount,users.headimg from t_game_record as game,t_users as users 
            where game.roomId in ? 
            and play_duration>=? 
            and users.userid=game.fk_player_id
            and game.sum_all = 1
            order by record_time DESC`
            let res2 = []
            for (let i of res) {
                res2.push(i.roomId)
            }
            if (res2.length == 0) {
                callback(err, [])
                return;
            }
            // console.log("res2",res2)
            let args2 = [[res2], BeginTimestamp];
            db.queryForList(pagenum, size, sql, args2, callback);
        });

    },

    /**
* 获取俱乐部所有战绩
* @param {*} user_id 
* @param {*} callback 
*/
    getClubZhanji(BeginTimestamp, pagenum, size, club_id, callback) {
        let sql0 = "select roomId from t_game_record where play_duration>=? and club_id=?"
        let args = [BeginTimestamp, club_id];
        db.queryForAll(sql0, args, function (err, res) {
            if (err) (
                callback(err)
            )
            let sql = `select fk_player_id,username,play_duration,win_score,game.jifen,game.roomId,jushu,game_type,seatCount,users.headimg from t_game_record as game,t_users as users 
            where game.roomId in ? 
            and play_duration>=? 
            and users.userid=game.fk_player_id
            and game.sum_all = 1
            order by record_time DESC`
            let res2 = []
            for (let i of res) {
                res2.push(i.roomId)
            }
            if (res2.length == 0) {
                callback(err, [])
                return;
            }
            // console.log("res2",res2)
            let args2 = [[res2], BeginTimestamp];
            db.queryForList(pagenum, size, sql, args2, callback);
        });

    },

    /**
* 获取俱乐部与我相关的战绩
* @param {*} user_id 
* @param {*} callback 
*/
    getZhanji(user_id, BeginTimestamp, pagenum, size, callback) {
        let sql0 = "select roomId from t_game_record where play_duration>=? and fk_player_id=?"
        let args = [BeginTimestamp, user_id];
        db.queryForAll(sql0, args, function (err, res) {
            if (err) (
                callback(err)
            )
            let sql = `select fk_player_id,username,play_duration,win_score,game.jifen,game.roomId,jushu,game_type,seatCount,users.headimg,game.user_type from t_game_record as game,t_users as users 
            where game.roomId in ? 
            and play_duration>=? 
            and game.fk_player_id =?
            and users.userid = ?
            order by record_time DESC`
            let res2 = []
            for (let i of res) {
                res2.push(i.roomId)
            }
            if (res2.length == 0) {
                callback(err, [])
                return;
            }
            // console.log("res2",res2)
            let args2 = [[res2], BeginTimestamp, user_id, user_id];
            db.queryForList(pagenum, size, sql, args2, callback);
        });

    },

    /**
     * 获得玩家玩的总局数
     */
    getAlljushu(user_id, callback) {
        let sql = "select count(fk_player_id) as all_jushu from t_game_record where fk_player_id=?"
        db.queryForObject(sql, [user_id], callback)
    },

    /**
 * 获得玩家最高盈利
 */
    getMaxProfit(user_id, callback) {
        let sql = "select sum(win_score) as sum_win,count(fk_player_id) as win_number from t_game_record where fk_player_id=? and win_score>0"
        db.queryForObject(sql, [user_id], callback)
    },

    /**
* 获得玩家某日盈利
*/
    getSomeDayProfit(user_id, BeginTimestamp, EndTime, callback) {
        let sql = "select sum(win_score) as sum_win from t_game_record where fk_player_id=? and win_score>0 and play_duration>? and play_duration<?"
        db.queryForObject(sql, [user_id, BeginTimestamp, EndTime], callback)
    },

    /**
     * 保存银行流水记录
     */
    saveBankStatement: function (bankStatement, callback) {
        var sql = 'insert into t_bank_statement set ? ';
        db.save(sql, bankStatement, callback);
    },
    /**
     * 保存consume_record记录
     */
    saveConsumeRecord(consume_record, callback) {
        var sql = 'insert into t_consume_record set ? ';
        db.save(sql, consume_record, callback);
    },
    /**
     * 从商城购买礼物
     * @param {*} user_id 购买者的ID
     * @param {*} gift_id 礼物的ID
     * @param {*} buy_count 购买的数量
     * @param {*} cost 购买消耗的金币
     * @param {*} callback 
     */
    buyGiftFromShop(user_id, gift_id, buy_count, cost, callback) {
        let sql = 'select * from t_backpack where user_id = ? and items_id = ?';
        let args = uArray.push(user_id, gift_id);
        db.queryForObject(sql, args, (err, backpack_res) => {
            if (err) {
                console.error(err)
                callback(err, null);
                return
            }
            let _sql = "update t_users set coins = coins - ? where userid=?;"
            let _args = [];
            _args.push(cost);
            _args.push(user_id);
            if (backpack_res == null) {
                _sql += "insert into t_backpack (user_id,items_id,items_count,items_type)values(?,?,?,'gift');";
                _args.push(user_id);
                _args.push(gift_id);
                _args.push(buy_count);
            }
            else {
                _sql += "update t_backpack set items_count=items_count+? where user_id = ? and items_id=?;";
                _args.push(buy_count);
                _args.push(user_id);
                _args.push(gift_id);
            }
            db.batchExecute(_sql, _args, callback);
        })
    },
    /**
     * 把背包的礼物兑换成金币
     * @param {*} user_id 兑换者的ID
     * @param {*} gift_id 礼物ID
     * @param {*} exchange_count 兑换数量
     * @param {*} total_price 兑换总价格
     * @param {*} callback 
     */
    exchangeGiftForBackpack(user_id, gift_id, exchange_count, total_price, callback) {
        let sql = "update t_users u,t_backpack b set u.coins = u.coins + ?,b.items_count=b.items_count-? where b.user_id = ? and b.items_id=? and u.userid=b.user_id;"
        let args = [];
        args.push(total_price);
        args.push(exchange_count);
        args.push(user_id);
        args.push(gift_id);
        db.update(sql, args, callback);
    },
    /**
     * 通过type获取对应的所有商品信息
     * @param {string} type 
     */
    getShopsByType(type, callback) {
        let sql = 'select * from t_shop_info where type = ?';
        let args = uArray.push(type);
        db.queryForList(null, null, sql, args, callback)
    },
    /**
     * 存储商城购买礼物记录
     * @param {*} obj 
     * @param {*} callback 
     */
    saveGiftPurchaseRecord(obj, callback) {
        let sql = "insert into t_gift_purchase_record set ?"
        db.save(sql, obj, callback);
    },
    /**
     * 存储商城兑换禮物记录
     * @param {*} obj 
     * @param {*} callback 
     */
    saveGiftExchangeRecord(obj, callback) {
        let sql = "insert into t_gift_exchange_record set ?"
        db.save(sql, obj, callback);
    },
    /**
     * 存储商城兑换物品记录
     * @param {*} obj 
     * @param {*} callback 
     */
    saveGoodsExchangeRecord(obj, callback) {
        let sql = "insert into t_goods_exchange_record set ?"
        db.save(sql, obj, callback);
    }
};