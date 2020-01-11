/**
 * @author hyw
 * @date 2018/6/12 0012
 * @description: 大厅活动服务类
 */
var db = require('../../utils/db');
var async = require('async');
var dateUtil = require('../../utils/dateUtil');
var playerService = require('./playerService');
var uArray = require('../../utils/uArray');
module.exports = {

    /**
     * 签到
     */
    signIn:function(player,days,grantCount,signInfo,last_sign_timeStamp,callback){
        var self = this;
        async.auto({
            updateTreasure:function(callback){
               playerService.updateTreasure('coins',grantCount,player.userid,callback);
            },
            //保存或更新签到记录
            saveOrUpdateSignInRecord:function(callback){
               self.saveOrUpdateSignInRecord(player.userid,days,signInfo,last_sign_timeStamp,callback);
            },
            //保存赠送记录
            saveBankStatement:function(callback){
                var bankStatement = {};
                bankStatement.fk_player_id = player.userid;
                bankStatement.username = player.name;
                bankStatement.change_type = 6;
                bankStatement.change_before = player.coins;
                bankStatement.change_count = grantCount;
                bankStatement.remark = '连续第【'+days+'】天签到赠送金币';
                bankStatement.treasure_type = "coins";
                bankStatement.record_time = dateUtil.getCurrentTimestapm();
                self.saveBankStatement(bankStatement,callback);
            }
        },function(err,result){
             if(err){
                console.log(err)
                 callback(err);
             }else{
                 callback(null,true);
             }
        });
    },
    /**
     * 获取大转盘配置信息
     */
    getRouletteConfig:function(callback){
        var sql = 'select id,sequence,prize_type,prize_value,probability from t_roulette_config where roulette_type=0 order by sequence asc ';
        db.queryForList(null,null,sql,null,callback);
    },

    /**
     * 根据玩家ID获取最近一次抽奖记录
     */
    getLastLotteryDramRecord:function(playerId,callback){
        var sql = 'select * from t_bank_statement t where t.fk_player_id= ?  and change_type = 7 order by record_time desc limit 1';
        var args = [];
        args.push(playerId);
        db.queryForList(null,null,sql,args,function(err,records){
             if(err){
                 callback(err);
             }else{
                 var record = null;
                 if(records&&records.length>0){
                     record = records[0];
                 }
                 callback(null,record);
             }
        });
    },
    /**
     * 获取玩家最近一次签到时间
     */
    getLastSignInTime:function(userId,callback){
        var sql = 'select t.id,t.last_sign_time,t.current_sign_in,t.player_id,t.signInfo,t.first_sign_time from t_sign_record t where t.player_id = ? ';
        var args = [];
        args.push(userId);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 
     * 获取签到信息 sql = 'update t_sign_record set last_sign_time=?,current_sign_in=? where player_id=?'
     */
    getSignIn:function(userId,callback){
        var sql = 'select * from t_sign_record  where player_id=?';
        args = uArray.push(userId)
        db.queryForObject(sql,args,callback);
    },

    getALLSignIn:function(callback){
        var sql = 'select player_id,last_sign_time,signInfo from t_sign_record';
        args = [];
        db.queryForAll(sql,args,callback);
    },
    /**
     * 获取签到配置信息
     */
    getSignInConfig:function(callback){
        var sql = 'select id,award,`day` from t_sign_config order by id asc';
        db.queryForList(null,null,sql,null,callback);
    },
      /**
     * 
     *更新flag
     */
    updateFlag:function(p,callback){
        let sql = 'update t_sign_record set flag=?';
        db.update(sql,p,callback);
    },
          /**
     * 
     *更新第一天的签到时间
     */
    updateFST:function(t,u,callback){
        let sql = 'update t_sign_record set first_sign_time=? where player_id=?';
        let args=[];
        args.push(t)
        args.push(u)
        console.log("zhelime",args)
        db.update(sql,args,callback);
    },

    updateSignInfo:function(t,u,callback){
        let sql = 'update t_sign_record set signInfo=? where player_id=?';
        let args=[t,u]
        db.update(sql,args,callback);
    },
    /**
     * 更新签到记录
     */
    saveOrUpdateSignInRecord:function(userId,days,signInfo,last_sign_timeStamp,callback){
        //先判断是否签到过
        this.getLastSignInTime(userId,function(err,lastSignIn){
            if(err){
                
                callback(err);
            }else{
                var today = dateUtil.dateFormat(new Date(),'yyyyMMdd');
                var sql = '';
                var args=[];
                //更新记录
                if(lastSignIn){
                    sql = 'update t_sign_record set last_sign_time=?,current_sign_in=? ,signInfo =?,last_sign_timeStamp=? where player_id=?';
                    args.push(today);
                    args.push(days);
                    args.push(signInfo);
                    args.push(last_sign_timeStamp);
                    args.push(userId);
                    db.update(sql,args,callback);
                    console.log(args)
                }else{//添加记录
                    sql = 'insert into t_sign_record set ?';
                    var record = {};
                    record.last_sign_time = today;
                    record.current_sign_in = 1;
                    record.player_id = userId;
                    record.signInfo = signInfo;
                    record.last_sign_timeStamp = last_sign_timeStamp;
                    db.save(sql,record,callback);
                }
            }
        })
    },
    /**
     * 保存账户流水记录
     */
    saveBankStatement:function (bankStatement,callback) {
        var sql = 'insert into t_bank_statement set ?';
        db.save(sql,bankStatement,callback);
    },
    /**
     * 根据连续签到的天数获取签到配置
     */
    getSignInConfigByDays:function (days,callback) {
        var sql = 'select id,award,day from t_sign_config where day=? ';
        var args = [];
        args.push(days);
        db.queryForObject(sql,args,callback);
    },
    /**
     * 获取可参与抽奖的次数
     */
    getCanChouJiangTimes:function(userId,callback){
        var sql = 'select count(*) from t_reward_record t where t.`status`=0 and t.player_id = ?';
        var args = [];
        args.push(userId);
        db.queryForInt(sql,args,callback);
    },
    getCanChouJiangTimesAsync:function(userId){
        return new Promise((resolve,reject)=>{
            let sql = 'select count(*) from t_reward_record t where t.`status`=0 and t.player_id = ? ';
            var args = [];
            args.push(userId);
            db.queryForInt(sql,args, (error, res) => {
                if (error) {
                    reject(error);
                    return
                }
                resolve(res);
            })
        }).catch((err)=>{
            console.log(`getCanChouJiangTimesAsync:${err}`);
        });
    },


    /**
     * 获取新年抽奖转盘配置
     */
    getNewYearRouletteConfig:function(callback){
        var sql = 'select id,sequence,prize_type,prize_value,probability from t_roulette_config where roulette_type=1 order by sequence asc ';
        db.queryForList(null,null,sql,null,callback);
    },
    /**
     * 获取参加新年抽奖活动中奖名单
     */
    getWinningList:function(callback){
        //var sql = 'select fk_player_id,username,change_count,record_time,treasure_type from t_bank_statement where change_type=15 order by change_count desc ';
        var sql = 'select fk_player_id,CONVERT( FROM_BASE64(username)  using utf8) username,change_count,record_time,treasure_type from t_bank_statement where change_type=15 order by change_count desc ';
        db.queryForList(0,20,sql,null,callback);
    },
    //扣除抽奖次数
    deductChouJiangTimes:function(userId,callback){
        var sql = 'update t_reward_record a,(select id from t_reward_record where player_id=? and `status`=0 order by record_time asc limit 1) b set a.`status` =1 where a.id = b.id';
        var args = [];
        args.push(userId);
        db.update(sql,args,callback);
    },

    /**
     * 赠送抽奖次数
     */
    grantLuckDraw:function(rewardRecordEntity,callback){
        var sql = 'insert into t_reward_record set ?';
        db.save(sql, rewardRecordEntity, callback);
    },

    /**
     * 赠送抽奖次数
     */
    grantLuckDrawAsync:function(rewardRecordEntity){
        return new Promise((resolve,reject)=>{
            var sql = 'insert into t_reward_record set ?';
            db.save(sql, rewardRecordEntity,(error, res) => {
                if (error) {
                    reject(error);
                    return
                }
                resolve(res);
            })
        }).catch((err)=>{
            console.log(`grantLuckDrawAsync:${err}`);
        })
    },

    /**
     * 条件查询已抽奖次数
     */
    getAwardedLuckDrawTimesAsync:function(queryPrams){
        return new Promise((resolve,reject)=>{
            var sql = 'select count(*) from t_reward_record t where 1=1 ';
            var args = [];
            if(queryPrams.playerId){
                sql += ' and t.player_id = ? ';
                args.push(queryPrams.playerId);
            }
            if(queryPrams.type){
                sql += ' and t.type = ? ';
                args.push(queryPrams.type);
            }
            if(queryPrams.status){
                sql += ' and t.status = ? ';
                args.push(queryPrams.status);
            }
            if(queryPrams.beginDate&&queryPrams.endDate){
                sql += ' and t.record_time>=?  and t.record_time <= ? ';
                args.push(queryPrams.beginDate);
                args.push(queryPrams.endDate);
            }
            db.queryForInt(sql,args, (error, res) => {
                if (error) {
                    reject(error);
                    return
                }
                resolve(res);
            })
        }).catch((err)=>{
            console.log(`getAwardedLuckDrawTimesAsync:${err}`);
        })
    },
    /**
     * 获取直接推荐人的数量(开始统计时间 2019-01-20)
     */
    getRecommendPlayerCountAsync:function(recommendId){
        return new Promise((resolve,reject)=>{
            var sql = 'select count(*) from t_users t where t.recommender = ? and t.register_time >=? ';
            var args = [];
            args.push(recommendId);

            var dateStr = '2019-01-20 00:00:00';
            var beginDate = dateUtil.dateToTimestapm(dateStr)/1000;
            args.push(beginDate);
            db.queryForInt(sql,args, (error, res) => {
                if (error) {
                    reject(error);
                    return
                }
                resolve(res);
            })
        }).catch((err)=>{
            console.log(`getRecommendPlayerCount:${err}`);
        })

    },

    /**
     * 统计新年抽奖今日总共发放出去的金币的数量
     */
    getTodayTotalGrantCoinAsync:function(){
        return new Promise((resolve,reject)=>{
            var sql = 'select sum(change_count) from t_bank_statement t where t.change_type = 15 and t.treasure_type=\'coins\' and t.and t.record_time>= ? ';
            var args = [];
            var today = dateUtil.getToday();
            var beginDate = dateUtil.getBeginTimestamp(today);
            args.push(beginDate);
            db.queryForInt(sql,args, (error, res) => {
                if (error) {
                    reject(error);
                    return
                }
                resolve(res);
            })
        }).catch((err)=>{
            console.log(`getTodayTotalGrantCoinAsync:${err}`);
        })
    }
}

