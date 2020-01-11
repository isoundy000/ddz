/**
 * Created by Administrator on 2017/5/12 0012.
 */
var db = require('../../utils/db');
var crypto = require('../../utils/crypto');
var uTime = require('../../utils/uTime');
var uArray = require('../../utils/uArray');
var rechargeService = require('./rechargeService');
var globalCfgService = require('./globalCfgService');
var async = require("async");
function nop(a, b, c, d, e, f, g) {

}

module.exports = {
    /**
     * 根据账号查询玩家
     * @param account
     * @param callback
     */
    getByAccount: function (account, callback) {
        var sql = 'select userid,account,name,sex,belongs_agent,belongs_club from t_users where account = ?';
        var args = [];
        args.push(account);
        db.queryForObject(sql, args, callback);
    },
    saveFeedback: function (entity, callback) {
        var sql = 'insert into t_feedback set create_time = now(),  ?';
        db.save(sql, entity, callback);
    },
    /**
     * 查询当前账号是否存在
     * @param 账号
     */
    isAccountExist: function (account, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT * FROM t_users WHERE account = ? ';
        var args = [];
        args.push(account);
        db.queryForObject(sql, args, callback);
    },

    /**
     * 创建账号
     */
    createAccount: function (account, password, callback) {
        callback = callback == null ? nop : callback;
        var psw = crypto.md5(password);
        var sql = 'INSERT INTO t_accounts(account,password) VALUES(?,?)';
        var args = uArray.push(account, psw);
        db.save(sql, args, callback);
    },


    /**
     * 
     * 更新密码
     */
    updateAccount: function (account, password, callback) {
        callback = callback == null ? nop : callback;
        var psw = crypto.md5(password);
        var sql = 'UPDATE t_accounts SET password =? WHERE account=?';
        var args = uArray.push(psw,account);
        db.update(sql, args, callback);
    },
        /**
     * 
     * 更新session
     */
    updateSession: function (id, session, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'UPDATE t_users SET session =? WHERE userid=?';
        var args = uArray.push(session,id);
        db.update(sql, args, callback);
    },
    /**
     * 获取账号信息
     */
    getAccountInfo: function (account, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT * FROM t_accounts WHERE account = ?';
        var args = uArray.push(account);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 用户是否存在
     */
    isUserExist: function (user_id, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT * FROM t_users WHERE userid = ?';
        const args = uArray.push(user_id);
        db.queryForObject(sql, args, callback);
    },

        /**
     * 用户是否存在
     */
    isUserExistByOpenid: function (open_id, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT * FROM t_users WHERE open_id = ?';
        const args = uArray.push(open_id);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 通过账号获取用户信息
     */
    getUserDataByAccount: function (account, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT userid,account,name,sex,lv,exp,coins,last_login_time,gems,roomid,is_lock,user_type,belongs_agent,recommender,ctrl_param,belongs_club,is_authenticated,ctrl_ratio,(last_login_time=register_time) is_first_login_today,is_spreader FROM t_users WHERE account = ?';
        const args = uArray.push(account);
        db.queryForObject(sql, args, callback);
    },


    /**
     * 通过用户id获取用户信息
     */
    getUserDataByUserId: function (userid, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT userid,account,name,sex,lv,exp,coins,gems,roomid,belongs_agent,user_type,belongs_club,ctrl_ratio,manifesto FROM t_users WHERE userid = ?';
        const args = uArray.push(userid);
        db.queryForObject(sql, args, callback);
    },

        /**
     * 通过用户id获取用户好牌率
     */
    getUserParamByUserId: function (userid, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT ctrl_param,userid FROM t_users WHERE userid = ?';
        const args = uArray.push(userid);
        db.queryForObject(sql, args, callback);
    },

        /**
     * 通过用户openid获取用户信息
     */
    getUserDataByOpenid: function (open_id, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT userid,account,name,sex,open_id,lv,exp,coins,gems,roomid,belongs_agent,user_type,belongs_club,ctrl_ratio,manifesto FROM t_users WHERE open_id = ?';
        const args = uArray.push(open_id);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 通过用户id获取用户session
     */
    getUserSessionByUserId: function (userid, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT session FROM t_users WHERE userid = ?';
        const args = uArray.push(userid);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 获取房卡和金币数量
     */
    getUserStatus: function (account, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT gems,coins FROM t_users WHERE account = ?';
        const args = uArray.push(account);
        db.queryForObject(sql, args, callback);
    },
    getGems: function (account, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT gems FROM t_users WHERE account = ?';
        const args = uArray.push(account);
        db.queryForInt(sql, args, callback);
    },
    /**
     * 获取战绩
     */
    getUserHistory: function (userId, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT history FROM t_users WHERE userid = ?';
        const args = uArray.push(userId);
        db.queryForInt(sql, args, callback);
    },
    /**
     * 更新战绩
     */
    updateUserHistory: function (userId, history, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'UPDATE t_users SET roomid = null, history = ? WHERE userid = ?';
        const _history = JSON.stringify(history);
        const args = uArray.push(_history, userId)
        db.update(sql, args, callback)
    },
    /**
     * 根据key获取配置表信息
     * @param {*} p_key 
     * @param {*} callback 
     */
    getParamConfigByPKey(p_key, callback) {
        var sql = 'select * from t_param_config where p_key = ?'
        const args = uArray.push(p_key);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 创建玩家
     */
    createUser: function (account, name, sex, headimg, openid, callback) {
        async.auto({
            gems(cb) {
                globalCfgService.getByParamKey("register_reward", (res) => {
                    cb(null, res);
                })
            },
            coins(cb) {
                globalCfgService.getByParamKey("register_coin_reward", (res) => {
                    cb(null, res);
                })
            }
        }, (err, result) => {

            console.log(result);

            let gems = parseInt(result.gems);
            let coins = parseInt(result.coins);
            if (Number.isNaN(gems) || Number.isNaN(coins)) {
                callback("创建用户失败，未获取到赠送房卡或金币的配置")
                return;
            }
            //let sql = 'INSERT INTO t_users(account,name,sex,headimg,register_time,last_login_time,union_id,manifesto,history) VALUES(?,?,?,?,?,?,?,?,?)';
            let sql = 'INSERT INTO t_users set ?';
            const _name = crypto.toBase64(name);
            let nowTime = uTime.now();
            var userEntity = {};
            userEntity.account = account;
            userEntity.name = _name;
            userEntity.sex = sex;
            userEntity.headimg = headimg;
            userEntity.register_time = nowTime;
            userEntity.last_login_time = nowTime;
            userEntity.union_id = account;
            if (openid && openid != '') {
                userEntity.open_id = openid;
            }
            userEntity.manifesto = '这个人很懒，什么都没有留下';
            userEntity.history = '';

            db.save(sql, userEntity, (err, result) => {
                callback(err, result);
                if (result != null) {
                    //非网页注册的用户才赠送金币和房卡
                    if(account.indexOf('guest_')==-1){
                        rechargeService.changeUserGoldsAndSaveBankStatement(result.insertId, gems, 1, "注册赠送的房卡", "gems", (err, result) => {
                            if (err || result == null) {
                                console.error("创建用户成功，未存储赠送房卡的数据");
                            }
                        });
                        rechargeService.changeUserGoldsAndSaveBankStatement(result.insertId, coins, 1, "注册赠送的金币", "coins", (err, result) => {
                            if (err || result == null) {
                                console.error("创建用户成功，未存储赠送金币的数据");
                            }
                        });
                    }
                }
                else {
                    console.error("创建用户成功，未存储赠送数据");
                }
            });
        })
    },
    /**
     * 更新用户信息
     */
    updateUserInfoByAccount: function (account, name, headimg, sex, openid, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'UPDATE t_users SET name=?,headimg=?,sex=?,union_id = ?,open_id=?,account=?,last_login_time=? WHERE account=?';
        const _name = crypto.toBase64(name);
        const args = uArray.push(_name, headimg, sex, account, openid, account, uTime.now(), account);
        db.update(sql, args, callback);
    },
        /**
     * 更新用户所在俱乐部 
     */
    updateUserInfoByAccount: function (account, name, headimg, sex, openid, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'UPDATE t_users SET name=?,headimg=?,sex=?,union_id = ?,open_id=?,account=?,last_login_time=? WHERE account=?';
        const _name = crypto.toBase64(name);
        const args = uArray.push(_name, headimg, sex, account, openid, account, uTime.now(), account);
        db.update(sql, args, callback);
    },
        /**
     * 更新用户信息
     */
    updateUserInfoByOpenid: function (account, name, headimg, sex, open_id, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'UPDATE t_users SET name=?,headimg=?,sex=?,union_id = ?,open_id=?,account=?,last_login_time=? WHERE open_id=?';
        const _name = crypto.toBase64(name);
        const args = uArray.push(_name, headimg, sex, account, open_id, account, uTime.now(), open_id);
        db.update(sql, args, callback);
    },
    /**
     * 获取用户信息
     */
    getUserBaseInfo: function (userid, callback) {
        callback = callback == null ? nop : callback;
        var sql = 'SELECT name,sex,headimg,coins,gems,last_login_time,user_type,belongs_club FROM t_users WHERE userid=?';
        const args = uArray.push(userid);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 获取公告
     */
    getMessage: function (type, version, callback) {
        callback = callback == null ? nop : callback;
        var sql;
        var args;
        if (version == null || version == "null") {
            sql = 'SELECT * FROM t_message WHERE type = ?';
            args = uArray.push(type);
        }
        else {
            sql = 'SELECT * FROM t_message WHERE type = ? AND version != ?';
            args = uArray.push(type, version);
        }
        db.queryForObject(sql, args, callback);
    },
    /**
     * 更新最后一次登录时间
     */
    updateLastLoginTime: function (account, callback) {
        callback = callback == null ? nop : callback;
        var sql = `UPDATE t_users SET last_login_time = ? WHERE account = ?`;
        const args = uArray.push(uTime.now(), account);
        db.update(sql, args, callback);
    },
    /**
     * 获取排行榜信息(特殊处理几个ID不显示在排行榜)
     */
    getRankingList(page, callback) {
        callback = callback == null ? nop : callback;
        var sql = "SELECT name,userid,coins,manifesto FROM t_users where userid not in ('611785','600535','600594') order by coins DESC";
        db.queryForList(1, 50, sql, null, callback);
    },
    /**
     * 反馈
     */
    saveFeedbackByClient: function (player_id, content, contact_way, callback) {
        callback = callback == null ? nop : callback;
        var sql = `INSERT t_feedback (content,create_time,player_id,contact_way) VALUES (?,?,?,?)`;
        const time = uTime.now();
        const args = uArray.push(content, time, player_id, contact_way)
        db.save(sql, args, callback);
    },
    /**
     * 更新玩家的上线
     */
    updateBelongsAgent: function (user_id, agent_id, callback) {
        callback = callback == null ? nop : callback;
        let sql = `UPDATE t_users SET belongs_agent = ? WHERE userid = ?`;
        let args = uArray.push(agent_id, user_id);
        db.update(sql, args, callback);
    },
    /**
     * 获取玩家类型
     */
    getUserTypeByUserId: function (agent_id, callback) {
        callback = callback == null ? nop : callback;
        var sql = `SELECT user_type FROM t_users WHERE  userid = ?`;
        let args = uArray.push(agent_id);
        db.queryForInt(sql, args, callback);
    },

    
    /**
     * 玩家实名认证存储数据库
     */
    saveAuthenticated: function (account, fk_user_id, name, identity_card, phone, callback) {
        callback = callback == null ? nop : callback;
        if (!fk_user_id || !name || !identity_card) {
            callback(false);
            return;
        }
        var time = uTime.now();
        var sql = `INSERT INTO t_userinfo(fk_user_id,name,identity_card,phone,create_time) VALUES(?,?,?,?,?);
        UPDATE t_users SET is_authenticated = '1' WHERE account = ?;`;
        let args = uArray.push(fk_user_id, name, identity_card, phone, time, account)
        db.batchExecute(sql, args, callback);
    },
    /**
     * 根据代理获取所有玩家id
     */
    getUserIdByBelongsAgent: (agent_id, callback) => {
        var sql = 'select userid from t_users where belongs_agent = ?'
        const args = uArray.push(agent_id);
        db.queryForList(null, null, sql, args, callback);
    },
    /**
     * 根据代理获取所有玩家相关信息
     */
    getUserConfByBelongsAgent: (agent_id, callback) => {
        var sql = 'select userid,name,gems from t_users where belongs_agent = ?'
        const args = uArray.push(agent_id);
        db.queryForList(null, null, sql, args, callback);
    },
    /**
     * 获取玩家俱乐部id
     */
    getUserClubId: (user_id, callback) => {
        var sql = 'select belongs_club from t_users where userid = ?'
        const args = uArray.push(user_id);
        db.queryForInt(sql, args, callback);
    },
    /**
     * 获取最后一次分享时间
     * @param {*} player_id 
     */
    getLastShareTimeByPlayerId(player_id, callback) {
        let sql = 'select max(share_time) from t_share_record where player_id = ?';
        const args = uArray.push(player_id);
        db.queryForInt(sql, args, callback);
    },
    /**
     * 保存分享记录
     * @param {*} player_id 
     * @param {*} platform 
     * @param {*} share_time 
     * @param {*} callback 
     */
    saveShareRecord(player_id, platform, share_time, callback) {
        let sql = "insert into t_share_record(platform,player_id,share_time) values(?,?,?)"
        const args = uArray.push(platform, player_id, share_time);
        db.save(sql, args, callback);
    },
    /**
     * 获取绑定推荐人
     * @param {*} account 
     * @param {*} callback 
     */
    getBindRecommender(account, callback) {
        let sql = "select recommender from t_users where account = ?";
        const args = uArray.push(account);
        db.queryForInt(sql, args, callback)
    },
    /**
     * 绑定推荐人
     * @param {*} user_info 自己
     * @param {*} recommender_info 推荐人
     * @param {*} callback 
     */
    bindRecommender(user_info, recommender_info, callback) {
        let sql = "update t_users set recommender = ? , parents = ? where userid = ?; ";

        //判断是否出现相互绑定的情况
        if(recommender_info.parents&&recommender_info.parents.indexOf(user_info.userid)>-1){
            console.log('相互绑定，存在刷分嫌疑');
            return;
        }

        let selfParents = '';
        let recommender = recommender_info.userid;
        let parents = recommender_info.parents;
        if (parents == null || parents == "") {
            selfParents = recommender + '';
        } else {
            selfParents = parents + ',' + recommender;
        }
        const args = uArray.push(recommender, selfParents, user_info.userid);
        let _parents_arr = selfParents.split(",");
        let level = 0;
        for (let i = _parents_arr.length - 1; i >= 0; i--) {
            if (_parents_arr[i] != "" && _parents_arr[i] != null) {
                level++;
                if (user_info[`lv${level}_count`] !== undefined) {
                    sql += `update t_users set lv1_count = lv1_count + ?,lv2_count = lv2_count + ?,lv3_count = lv3_count + ? where userid = ?;`
                    if (level == 1) {
                        args.push(1);
                        args.push(user_info.lv1_count || 0);
                        args.push(user_info.lv2_count || 0);
                    }
                    else if (level == 2) {
                        args.push(0);
                        args.push(1);
                        args.push(user_info.lv1_count || 0);
                    }
                    else if (level == 3) {
                        args.push(0);
                        args.push(0);
                        args.push(1);
                    }
                    args.push(_parents_arr[i]);
                }
            }
        }

        let diGui = function (recommender, selfParents) {
            let sql = 'select parents,userid from t_users where recommender = ?';
            db.queryForList(null, null, sql, recommender, (err, res) => {
                if (err) {
                    console.log("获取" + recommender + "下级失败");
                    return;
                }
                if (res.length == 0) {
                    console.log("绑定完成");
                    return
                }
                for (let index = 0; index < res.length; index++) {
                    let _parents = selfParents + "," + res[index].parents;
                    let _userid = res[index].userid
                    let _sql = 'update t_users set parents = ? where userid = ?';
                    db.update(_sql, uArray.push(_parents, _userid), function (err, res) {
                        if (err) {
                            console.log(`${_userid}添加推荐人${selfParents}失败`);
                            return;
                        }
                        console.log(`${_userid}添加推荐人${selfParents}成功`);
                        diGui(_userid, selfParents);
                    })
                }
            })
        }
        console.log(sql);
        console.log(args);
        db.update(sql, args, (err, res) => {
            callback(err, res)
            if (err) {
                return;
            }
            diGui(user_info.userid, selfParents);
        })
    },
    // bindRecommender(user_info, recommender, parents, callback) {
    //     let sql = "update t_users set recommender = ? , parents = ? ,recommend_time = ? where userid = ?; ";
    //     let selfParents = '';
    //     if (parents == null || parents == "") {
    //         selfParents = recommender + '';
    //     } else {
    //         selfParents = parents + ',' + recommender;
    //     }
    //     const args = uArray.push(recommender, selfParents, uTime.now(), user_info.userid);
    //     let _parents_arr = selfParents.split(",");
    //     let level = 0;
    //     for (let i = _parents_arr.length - 1; i >= 0; i--) {
    //         if (_parents_arr[i] != "" && _parents_arr[i] != null) {
    //             level++;
    //             if (user_info[`lv${level}_count`] !== undefined) {
    //                 sql += `update t_users set lv${level}_count = lv${level}_count + ? where userid = ?;`
    //                 args.push(1, _parents_arr[i]);
    //             }
    //         }
    //     }
    //     db.update(sql, args, callback)
    // },
    /**
     *更新玩家俱乐部状态
     */
    // updatePlayerClub(user_id, belongs_agent, callback) {
    //     let sql = "update t_users set belongs_agent = ? where userid = ?";
    //     const args = uArray.push(belongs_agent, user_id);
    //     db.update(sql, args, callback)
    // },
    /**
     * 根据玩家ID获取玩家信息
     */
    getPlyaerInfoById: function (playerId, callback) {
        var sql = 'select * from t_users where userid=?';
        var args = [];
        args.push(playerId);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 赠送房卡或者金币
     * @param sender 赠送人
     * @param receiver 接收人
     * @param grantType 赠送类型  coins 金币  gems 房卡
     * @param grantCount 赠送数量
     * @param callback
     */
    grantTreasure: function (sender, receiver, grantType, grantCount, callback) {
        var sql = '';
        var args = [];
        if (grantType == 'coins') {
            sql = 'update t_users set coins = coins-? where userid=?;update t_users set coins = coins+? where userid=?';
        } else if (grantType == 'gems') {
            sql = 'update t_users set gems = gems-? where userid=?;update t_users set gems = gems+? where userid=?';
        }
        args.push(grantCount);
        args.push(sender.userid);
        args.push(grantCount);
        args.push(receiver.userid);
        db.batchExecute(sql, args, callback);
    },
    /**
     * 根据ID更新玩家的财富信息
     * @param type coins  金币 gems 房卡
     * @param count  更新的量
     * @param playerId 玩家ID
     * @param callback
     */
    updateTreasure: function (type, count, playerId, callback) {

        console.log('*********更新:'+type+'   count:'+count+'  playerId:'+playerId);

        var sql = '';
        var args = [];
        if (type == 'coins') {
            sql = 'update t_users set coins=coins+? where userid=? ';
        } else {
            sql = 'update t_users set gems=gems+? where userid=? ';
        }
        args.push(count);
        args.push(playerId);
        db.update(sql, args, callback);
    },
    /**
     * 获取玩家背包中当前礼物信息
     * @param {*} user_id 用户id
     * @param {*} item_id 物品id
     * @param {*} callback 
     */
    getUserBackpackItemByItemId(user_id, item_id, callback) {
        var sql = "select * from t_backpack where user_id = ? and items_id = ?";
        var args = uArray.push(user_id, item_id);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 获取玩家背包中物品信息
     * @param {*} user_id 用户id
     * @param {*} type 物品種類
     * @param {*} callback 
     */
    getUserBackpackByType(user_id, type, callback) {
        var sql = "select * from t_backpack where user_id = ? and items_type = ?";
        var args = uArray.push(user_id, type);
        db.queryForList(null, null, sql, args, callback);
    },
    /**
     * 获取玩家背包物品信息带着物品名字
     * @param {*} user_id 用户id
     * @param {*} callback 
     */
    getUserBackpackInfo(user_id, callback) {
        var sql = "select b.items_id,b.items_count,b.items_type,(select name from t_shop_info where t_shop_info.id = b.items_id) name from t_backpack b where b.user_id = ?";
        var args = uArray.push(user_id);
        db.queryForList(null, null, sql, args, callback);
    },
    /**
     * 礼物赠送
     * @param {number} sender 赠送玩家Info
     * @param {*} receiver 接收玩家Info
     * @param {*} gift_id 礼物ID
     * @param {*} grant_count 赠送数量
     * @param {*} receiver_items 接收玩家背包物品
     * @param {*} callback 
     */
    grantGift(sender, receiver, gift_id, grant_count, receiver_items, callback) {

        var sql = "update t_backpack set items_count = items_count-? where user_id=? and items_id=?;";
        var args = [];
        args.push(grant_count);
        args.push(sender.userid);
        args.push(gift_id);
        if (receiver_items == null) {
            sql += "insert into t_backpack(user_id, items_id, items_count, items_type)values(?,?,?, 'gift');"
            args.push(receiver.userid);
            args.push(gift_id);
            args.push(grant_count);
        } else {
            sql += 'update t_backpack set items_count = items_count+? where user_id=? and items_id=?;';
            args.push(grant_count);
            args.push(receiver.userid);
            args.push(gift_id);
        }
        db.batchExecute(sql, args, callback);
    },
    /**
     * 获取玩家第一次加入俱乐部的信息
     * @param {*} user_id 
     * @param {*} callback 
     */
    isFirstJoinClub(user_id, callback) {
        var sql = "select * from t_bank_statement where fk_player_id = ? and change_type = '3'";
        var args = uArray.push(user_id);
        db.queryForObject(sql, args, callback);
    },

    /**
     * 更新玩家所属的俱乐部和代理
     * @param agentId
     * @param clubId
     * @param callback
     */
    updateBelongsClubAndAgent: function (userId, agentId, clubId, callback) {
        let sql1 = "select belongs_club from t_users where userid = ?"
        let data = [userId]
        db.queryForAll(sql1,data,function(err,result){
            if(err){
                callback(err,null);
            }else{
                console.log("data")
                if ( typeof (result[0].belongs_club) =="number" || !result[0].belongs_club){
                    
                    var belongs_club =[]
                    if(result[0].belongs_club){
                        belongs_club.push(data.belongs_club)
                    }
                    
                }else{
                    var belongs_club = JSON.parse(result[0].belongs_club)
                }
                
                if(!belongs_club){
                    belongs_club = [];
                }
                console.log("belongs_club1",belongs_club)

                belongs_club.push(clubId+"")
                console.log("belongs_club3",belongs_club)

                belongs_club = JSON.stringify(belongs_club)
                console.log("belongs_club2",belongs_club)
                var sql = 'update t_users set belongs_club=?,belongs_agent=? where userid=? ';
                var args = [belongs_club,agentId,userId];
                db.save(sql, args, callback)
            }
        })

    },


    /**
     * 
     *  更新玩家所属的比赛场
     */
        updatePlayerClub(user_id, belongs_club, callback) {
        let sql = "update t_users set belongs_club = ? where userid = ?";
        const args = uArray.push(belongs_club, user_id);
        db.update(sql, args, callback)
    },
    /**
     * 修改玩家的key值
     * @param {*} account 
     * @param {{key:content}} obj 
     */
    async setUserInfoByKeyAsync(account, obj) {
        return new Promise((resolve, reject) => {
            let sql = 'update t_users set ? where account = ?'
            let args = [];
            args.push(obj);
            args.push(account);
            db.update(sql, args, (err, results) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(results);
                }
            })
        }).catch((err) => {
            console.log(`playerService:G:613${err}`);
        })
    },
    /**
     * 修改玩家的key值
     * @param {*} user_id 
     * @param {String} key 獲取玩家信息的key值，獲取多個以,隔開，例：name,account
     */
    async getUserInfoByKeysAsync(user_id, key) {
        return new Promise((resolve, reject) => {
            if (typeof key !== "string") {
                reject(`传入key值:${key}错误`);
                return;
            }
            let sql = `select ${key} from t_users where userid = ?`
            let args = [];
            args.push(user_id);
            db.queryForObject(sql, args, (err, results) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(results);
                }
            })
        }).catch((err) => {
            console.log(`playerService:G:639${err}`);
        })
    },
    /**
     * 修改玩家的key值
     * @param {*} user_id 
     * @param {String} key 獲取玩家信息的key值，獲取多個以,隔開，例：name,account
     */
    getUserInfoByKeys(user_id, key, callback) {
        if (typeof key !== "string") {
            callback(`传入key值:${key}错误`, null);
        }
        let sql = `select ${key} from t_users where userid = ?`
        let args = [];
        args.push(user_id);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 修改玩家的key值
     * @param {*} account 
     * @param {String} key 獲取玩家信息的key值，獲取多個以,隔開，例：name,userid
     */
    async getUserInfoByKeysAndAccountAsync(account, key) {
        return new Promise((resolve, reject) => {
            if (typeof key !== "string") {
                reject(`传入key值:${key}错误`);
                return;
            }
            let sql = `select ${key} from t_users where account = ?`
            let args = [];
            args.push(account);
            db.queryForObject(sql, args, (err, results) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(results);
                }
            })
        }).catch((err) => {
            console.log(`playerService:G:679${err}`);
        })
    },
    /**
     * 进入房间时获取玩家
     * @param {*} account 
     */
    async getUserInfoAndRoomInfoByAccountAsync(account) {
        return new Promise((resolve, reject) => {
            let sql = `select u.userid,u.gems,u.coins,u.ctrl_param,u.name,u.roomid,r.* from t_users u ,t_rooms r where u.account = ? or r.id = u.roomid`
            // let sql = `select userid,gems,coins,ctrl_param,name,roomid from t_users where account = ?`
            let args = [];
            args.push(account);
            db.queryForObject(sql, args, (err, results) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(results);
                }
            })
        }).catch((err) => {
            console.log(`playerService:G:701${err}`);
        })
    },
};