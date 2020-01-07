/**
 * 奖池操作
 * lw
 * Dec.7th,2018
 */
var db = require('../../utils/db');

/**
 * 推饼万人场总奖池
 */
var jackpot_tb_melee = null;

/**
 * 推饼万人场活动奖池
 */
var jackpot_tb_melee_active = null;

/**
 * 推饼房间场总奖池
 */
var jackpot_tb = null;

/**
 * 推饼房间场活动奖池
 */
var jackpot_tb_active = null;

/**
 * 缓存版本
 * 如果从其他渠道(比如后台管理)改变了动态奖池，注意采取同步措施
 */
var jackpotService = {

    /**
     * 根据游戏KIND_ID获取其动态奖池
     */
    getActiveJackpotByKindId:async function(kindId) {
        let jackpotActive = null;

        if (kindId == '202') {
            if (jackpot_tb_melee_active == null) {
                await this.syncActiveJackpotWithDb(kindId);
            }

            jackpotActive = jackpot_tb_melee_active;
        }
        else if (kindId == '201') {
            if (jackpot_tb_active == null) {
                await this.syncActiveJackpotWithDb(kindId);
            }

            jackpotActive = jackpot_tb_active;
        }
        else {
            console.error('jackpotService getActiveJackpotByKindId UNKNOWN kindId: ', kindId);
        }
        
        return jackpotActive;
    },

    /**
     * 通过其他渠道改变动态奖池后一定要使用此方法使缓存得到更新
     * 为避免误用，此函数不返回值
     * @param {string} kindId 游戏类型
     */
    syncActiveJackpotWithDb : async function(kindId) {
        if (kindId == '202') {
            let sql = "select tb_melee_active from t_jackpot where id=0";
            jackpot_tb_melee_active = await this.getIntValueFromDb(sql);
        }
        else if (kindId == '201') {
            let sql = "select tb_active from t_jackpot where id=0";
            jackpot_tb_active = await this.getIntValueFromDb(sql);
        }
        else {
            console.error('jackpotService syncActiveJackpotWithDb UNKNOWN kindId: ', kindId);
        }
    },

    /**
     * 从数据库同步获取当前活动奖池
     * @returns {Promise.<T>}
     */
    getIntValueFromDb : function(sql) {
        return new Promise((resolve, reject) => {
            db.queryForInt(sql, [], (error, res) => {
                if (error) {
                    reject(error);
                    return
                }
                resolve(res);
            })
        }).catch((err) => {
            console.error(`getIntValueFromDb:${err}`);
        });
    },

    /**
     * 更新活动奖池
     * kindId  游戏类型
     * x  活动奖池变动值
     */
    deltaActiveJackpotByKindId:async function(kindId, x) {
        if (kindId == '202') {
            if (jackpot_tb_melee_active == null) {
                await this.syncActiveJackpotWithDb(kindId);
                if (isNaN(jackpot_tb_melee_active)) {
                    console.error('jackpotService deltaActiveJackpotByKindId jackpot_tb_melee_active: ', jackpot_tb_melee_active);
                    jackpot_tb_melee_active = 0;
                }
            }
            jackpot_tb_melee_active += x;
            sql = "update t_jackpot set tb_melee_active=tb_melee_active+? where id=0";
        }
        else if (kindId == '201') {
            if (jackpot_tb_active == null) {
                await this.syncActiveJackpotWithDb(kindId);
                if (isNaN(jackpot_tb_active)) {
                    console.error('jackpotService deltaActiveJackpotByKindId jackpot_tb_active: ', jackpot_tb_active);
                    jackpot_tb_active = 0;
                }
            }
            jackpot_tb_active += x;
            sql = "update t_jackpot set tb_active=tb_active+? where id=0";
        }
        else {
            console.error('jackpotService deltaActiveJackpotByKindId kindId: ', kindId);
            return ;
        }
        let args = [];
        args.push(x);
        db.update(sql, args, function(err){
            if (err) {
                console.error('jackpotService deltaActiveJackpotByKindId db.update err: ', err);
            }
        });
    },

    /**
     * 在活动奖池和总奖池之间转移金币
     * x 是相对于活动奖池而言，
     * 正值是活动奖池增加，总奖池减少
     * 负值是活动奖池减少，总奖池增加
     */
    jackpotTransfer :async function(kindId, x) {
        await this.deltaActiveJackpotByKindId(kindId, x);

        if (kindId == '202') {
            let sql = `update t_jackpot set tb_melee=tb_melee+? where id=0`;
            let args = [];
            args.push(0-x);
            db.update(sql, args, function(err){
                if (err) {
                    console.error('jackpotService jackpotTransfer db.update err: ', err);
                }
            });
        }
        else if (kindId == '201') {
            let sql = `update t_jackpot set tb=tb+? where id=0`;
            let args = [];
            args.push(0-x);
            db.update(sql, args, function(err){
                if (err) {
                    console.error('jackpotService jackpotTransfer db.update err: ', err);
                }
            });
        }
        else {
            console.error('jackpotService jackpotTransfer kindId: ', kindId);
            return false;
        }
        
        return true;
    }
}

module.exports = jackpotService;