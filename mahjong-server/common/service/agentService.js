/**
 * Created by Administrator on 2017/5/12 0012.
 */
var db = require('../../utils/db');
var crypto = require('../../utils/crypto');
var globalCfgService = require('./globalCfgService');
var rechargeService = require('./rechargeService');
var commonService = require('./commonService');
var uArray = require('../../utils/uArray');
var dateUtil = require('../../utils/dateUtil');
var async = require('async');
function baseFrom64Name(err, results, callback) {
    if (results == null) {
        callback(err, results);
        return;
    }
    for (const key in results) {
        results[key].name = crypto.fromBase64(results[key].name);
    }
    callback(err, results)
}

module.exports = {
    /**
     * 根据代理号查询代理信息
     * @param account
     * @param callback
     */
    getByAgentCode: function (agentCode, callback) {
        var sql = 'select id,username,wx,agent_code from t_agent where agent_code = ? ';
        var args = [];
        args.push(agentCode);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 根据userid
     * 号查询游戏群信息
     * @param {*} club_id 
     * @param {*} callback 
     */
    getClubInfoByUserId(userId, callback) {
        let sql = "select * from t_users_club where userId =?"
        db.queryForAll(sql,userId,function(err,data){
            if(err){
                callback(err,null)
                return;
            }
            if(!data || data.length==0){
                callback(null,[]);
                return;
            }
            let clubIds=[];
            for(let i of data){
                clubIds.push(i.clubId)
            }
            let sql = 'select club.*,users.name from t_club as club,t_users as users where club.club_id in ? and users.userid = club.create_user';
            let args = [[clubIds]];
            db.queryForAll(sql, args, callback);
        })

    },


    /**
     * 用户通过游戏群ID加入游戏群
     * @param {*} user_id 
     * @param {*} club_id 
     * @param {*} callback 
     */
    userJoinClubByClubId(user_id, club_id, belongs_agent, callback) {
        let sql1 ="select belongs_club from t_users where userid = ? "
        let args = [user_id]
        db.queryForAll(sql1,args,function(err,result){
            if(err|| !result){
                callback(err,null)
            }else{
                let clubs = result[0].belongs_club ;
                if(!clubs){
                    clubs=[]
                }else{
                    clubs= JSON.parse(clubs)
                }
                console.log("clubs1",clubs)
                clubs.push(club_id+"")
                console.log("clubs2",clubs)

                let belongs_club = JSON.stringify(clubs)
                let sql = `update t_users set belongs_agent=?,belongs_club=? where userid = ?;
                update t_club set member_count = member_count + 1 where club_id = ?;
                insert  into t_users_club (userId,clubId,userType) values (?,?,0) `;
                
                let args = uArray.push(belongs_agent, belongs_club, user_id, club_id,user_id,club_id);
                db.batchExecute(sql, args, callback);
            }

        })

    },
    /**
     * 获取当前游戏群所有玩家信息
     * @param {*} club_id 
     * @param {*} callback 
     */
    getAllClubUserInfoByClubId: function(club_id, callback) {
        let sql = `select headimg,name,last_login_time,users.userid,club.userType from t_users as users,t_users_club as club where club.clubId = ? and users.userid=club.userId order by users.last_login_time desc`;
        let args = uArray.push(club_id);
        db.queryForList(null, null, sql, args, callback);
    },
    /**
     * 从游戏群踢出玩家
     * @param {*} left_user_id 
     * @param {*} club_id 
     * @param {*} callback 
     */
    hadLeftClub(left_user_id, club_id, callback) {
        let sql1 = "select belongs_club from t_users where userid =?"
        let data = [left_user_id]
        db.queryForAll(sql1,data,function(err,result){
            if(err||!result){
                callback(err,null)
            }else{
                console.log(left_user_id,club_id)
                console.log(result[0].belongs_club)
                let belongs_club = JSON.parse(result[0].belongs_club)
                console.log("belongs_club",belongs_club)
                let index = belongs_club.indexOf(club_id)
                console.log(index)
                if(index==-1){
                    callback(null,null)
                }else{
                    belongs_club.splice(index,1)
                    belongs_club = JSON.stringify(belongs_club)
                    let sql = `update t_users set belongs_club = ? where userid = ?;
                    update t_club set member_count = member_count - 1 where club_id = ?;`;
                    let args = uArray.push(belongs_club,left_user_id, club_id);
                    db.batchExecute(sql, args, callback);
                }

            }
        })

    },
    /**
     * 修改游戏群公告
     * @param {*} club_id 
     * @param {*} content 
     * @param {*} callback 
     */
    rewriteClubNotice(club_id, content, callback) {
        let sql = "update t_club set club_manifesto = ? where club_id = ?";
        let args = uArray.push(content, club_id);
        db.update(sql, args, callback);
    },
    /**
     * 获取所有游戏群信息
     * @param {*} callback 
     */
    getAllClubInfo(callback) {
        let sql = ' select t.*,(select name from t_users where userid=t.create_user) name from t_club t  where is_private = 0 and status != 2 order by member_count desc ';
        db.queryForList(null, null, sql, null, (err, results) => {
            baseFrom64Name(err, results, callback);
        });
    },
    /**
     * 获取在当前游戏群里开的所有房间
     * @param {*} club_id 
     * @param {*} callback 
     */
    getAllPriRoomsInThisClub(club_id, callback) {
        let sql = `select * from t_rooms where belongs_club = ? order by create_time desc`;
        let args = uArray.push(club_id);
        db.queryForList(null, null, sql, args, callback);
    },
    /**
     * 模糊搜索游戏群信息
     * @param {*} content 
     * @param {*} callback 
     */
    searchClub(content, callback) {
        let sql = `select c.*,u.name from t_club c,t_users u where (c.club_id like ? or c.club_name like ?) and c.status != 2 and u.userid = c.create_user order by c.member_count desc`;
        let _content = `%${content}%`;
        let args = uArray.push(_content, _content);
        db.queryForList(null, null, sql, args, (err, results) => {
            baseFrom64Name(err, results, callback);
        })
    },

    /**
     * 三级分销返利
     * @param {*} user_id 被抽取手续费的玩家 
     * @param {*} coins 抽取的金币数量
     * @param {*} level 返利等级，最高返利几个人
     * @param {*} remark
     */
    async someLevelRebate(user_id, coins, level, remark) {

        if (coins <= 0) {
            console.log("金币抽水小于0");
            return
        }

        try {
            let user_info = await commonService.getTableValuesAsync("recommender,parents,name", "t_users", { userid: user_id });
            if (user_info == null || user_info.parents == null || user_info.parents == "") {
                //console.log("无推荐人");
                return
            }
            let _parents = user_info.parents.trim().split(",");
            let parents = [];
            for (let i = 0; i < _parents.length; i++) {
                if (_parents[i] != "" && _parents[i] != null) {
                    parents.push(_parents[i]);
                }
            }
            while (true) {
                if (parents.length <= level) {
                    level = parents.length;
                    break;
                }
                parents.shift();
            }
            for (let i = parents.length - 1; i >= 0; --i) {
                let parent_id = parents[i];
                let lv = level - i;
                let rebate = await globalCfgService.getByParamKeyAsync(`lv${lv}_rake_back_rate`)
                rebate = parseInt(rebate);
                if (Number.isNaN(rebate)) {
                    console.log(`未获取到lv${lv}_rake_back_rate的值`);
                    continue;
                }
                //存储
                let rebate_coins = Math.floor(coins * rebate / 100);

                // let parent_info = await commonService.getTableValuesAsync("name,coins,userid,yongjin", "t_users", { userid: parent_id })
                // if (parent_info == null) {
                //     console.log(`未获取上级：${parent_id}的信息`);
                //     continue;
                // }
                // // console.log("user" + parent_id + "获取佣金前：" + parent_info.yongjin);

                // let bank_statement = {}
                // bank_statement.fk_player_id = parent_id;
                // bank_statement.username = parent_info.name;
                // bank_statement.change_type = 9;
                // bank_statement.change_before = parent_info.coins;
                // bank_statement.change_count = rebate_coins;
                // bank_statement.remark = `${remark}:${lv}级推荐[${user_id}]返利`;
                // bank_statement.record_time = dateUtil.getCurrentTimestapm();
                // bank_statement.treasure_type = "coins";
                // rechargeService.saveBankStatement(bank_statement, (err, result) => {
                //     if (err) {
                //         console.log(err);
                //     }
                // });

                rechargeService.changeUserGoldsAndSaveBankStatementAsync(parent_id, rebate_coins/*返利*/, 9, `${remark}:${lv}级推荐[${user_id}]返利`, "coins", true,user_id,lv);
                commonService.changeNumberOfObjForTableAsync("t_users", { yongjin: rebate_coins }, { userid: parent_id });
            }
        } catch (error) {
            console.trace(`佣金返利出错：${error}`);
        }
    },
    /**
     * 获取佣金
     * @param {*} userId 
     * @param {string} timeType 时间类型：week获取本周，month获取本月，all获取所有 
     */
    async getYongJin(userId, timeType, callback) {
        if (timeType !== "week" && timeType !== "month" && timeType !== "all" && timeType !== "day") {
            callback("参数错误");
            return
        }
        let queryTime = 0;
        if (timeType == "month") {
            var monthFirstDay = dateUtil.getCurrentMonthFirstDay();
            queryTime = dateUtil.getBeginTimestamp(monthFirstDay);
        }
        else if (timeType == "week") {
            var weekFirstDay = dateUtil.getWeekStartDate();
            queryTime = dateUtil.getBeginTimestamp(weekFirstDay);
        }
        else if (timeType == "day") {
            var todayStr = dateUtil.getToday();
            queryTime = dateUtil.getBeginTimestamp(todayStr);
        }
        let sql = "select sum(change_count) yongJin from t_bank_statement where fk_player_id = ? and record_time > ? and change_type = 9";
        let args = uArray.push(userId, queryTime);
        db.queryForInt(sql, args, callback)
    },
    /**
     * 获取直推
     * @param {*} userId 
     * @param {string} timeType 时间类型：week获取本周，month获取本月，all获取所有 
     */
    async getZhiTui(userId, timeType, callback) {
        if (timeType !== "week" && timeType !== "month" && timeType !== "all" && timeType !== "day") {
            callback("参数错误");
            return
        }
        let queryTime = 0;
        let nowTime = Date.now();
        let date = new Date(nowTime);
        let todaySeconds = date.getSeconds() + date.getMinutes() * 60 + date.getHours() * 60 * 60;
        if (timeType == "month") {
            queryTime = nowTime / 1000 - date.getDate() * 24 * 60 * 60 - todaySeconds;
        }
        else if (timeType == "week") {
            queryTime = nowTime / 1000 - date.getDay() * 24 * 60 * 60 - todaySeconds;
        }
        else if (timeType == "day") {
            queryTime = nowTime / 1000 - todaySeconds;
        }
        let sql = "select u.recommender,u.userid from t_users u, t_bank_statement b where u.recommender=? and b.fk_player_id=u.userid and b.change_type=4 and b.record_time>? and b.remark like '%" + userId + "%'";
        let args = uArray.push(userId, queryTime);
        db.queryForList(null, null, sql, args, callback);
    },

    /**
     * 提现
     * @param userInfo
     * @param count
     * @param callback
     */
    tiXian: function (userInfo, count, callback) {
        async.auto({
            tixian: function (cb) {
                var sql = 'update t_users set coins=coins+?,yongjin=yongjin-? where userid=?';
                var args = [];
                count = parseInt(count);
                args.push(count);
                args.push(count);
                args.push(userInfo.userid);
                db.update(sql, args, cb);
            },
            addRecord: function (cb) {
                var sql = 'insert into t_tixian_record set ? ';
                var record = {};
                record.player_id = userInfo.userid;
                record.tixian_count = count;
                record.tixian_coins_before = userInfo.coins;
                record.tixian_yongjin_before = userInfo.yongjin;
                record.username = userInfo.name;
                record.record_time = dateUtil.getCurrentTimestapm();
                db.save(sql, record, cb);
            }
        }, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, result);
            }
        });
    },

};