/**
 * @author hyw
 * @date 2018/6/15 0015
 * @description: 玩家转账service
 */
var db = require('../../utils/db');
var async = require('async');
var dateUtil = require('../../utils/dateUtil');
module.exports = {
    /**
     * 保存转账记录
     */
    saveTransferRecord: function (transferEntity, callback) {
        var sql = 'insert into t_transfer_record set ?';
        db.save(sql, transferEntity, callback);
    },
    /**
     * 分页获取转账记录列表
     */
    getTransferRecord: function (pagenum, pagesize, entity, callback) {
        var sql = 'select u.id,u.sender_id,u.receiver_id, u.send_before, u.receive_before,u.transfer_count, u.service_fee,u.service_fee_rate, u.actual_sum, u.transfer_time,u.transfer_type,u.sender_name,u.receiver_name from t_transfer_record u where 1=1 ';
        var args = [];
        if (entity.transfer_type) {
            sql += 'and u.transfer_type = ? ';
            args.push(entity.transfer_type)
        }
        if (entity.sender_id) {
            sql += ' and u.sender_id = ? ';
            args.push(entity.sender_id)
        }
        if (entity.receiver_id) {
            sql += ' and u.receiver_id = ? ';
            args.push(entity.receiver_id)
        }

        sql += 'order by u.transfer_time desc';

        db.queryForList(pagenum, pagesize, sql, args, callback);
    },
    /**
     * 存储礼物转账记录
     * @param {*} obj 
     * @param {*} callback 
     */
    saveGiftGrantRecord(obj, callback) {
        let sql = "insert into t_gift_grant_record set ?"
        db.save(sql, obj, callback);
    },
    /**
     * 获取打赏记录
     * @param {*} userId 
     * @param {*} type 
     * @param {*} isDaShang 被打赏 0 打赏 1
     */
    getDaShangAsync(userId, type, isDaShang) {
        return new Promise((resolve, reject) => {
            let sql = 'select * from t_transfer_record where transfer_type = ? ';
            if (parseInt(isDaShang) === 0) {
                sql += "and sender_id = ?";
            }
            else {
                sql += "and receiver_id = ?";
            }
            sql += " order by transfer_time desc";
            db.queryForList(1, 10, sql, [type, userId], (error, res) => {
                if (error) {
                    console.log(error);
                    reject(error);
                    return
                }
                resolve(res);
            })
        }).catch((err) => {
            console.log(`transferRecordService:G:74 ${err}`);
        })
    }
}