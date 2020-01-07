/**
 * @author hyw
 * @date 2018/6/27 0027
 * @description: 消息通知服务类
 */
var db = require('../../utils/db');
var async = require('async');
module.exports = {
    /**
     * 保存消息
     * @param entity
     * @param callback
     */
    saveNotification:function(entity,callback){
       var sql = 'insert into t_notification set ? ';
       db.save(sql,entity,callback);
    },
    /**
     * 改变消息的阅读状态
     */
    changeStatus:function(id,status,callback){
       var sql = ' update t_notification set status = ? where id=? ';
       var args = [];
       args.push(status);
       args.push(id);
       db.update(sql,args,callback);
    },
    /**
     * 删除消息
     */
    delNotification(id,callback){
        var sql = ' delete from t_notification where id=? ';
        var args = [];
        args.push(id);
        db.update(sql,args,callback);
    },
    /**
     * 根据ID获取公告详情
     * @param id
     * @param callback
     */
    getDetailById:function (id,callback) {
        async.auto({
            noticeDetail:function(cb){
                var sql = 'select * from t_notification where id = ?';
                var args = [];
                args.push(id)
                db.queryForObject(sql,args,cb);
            },
            updateStatus:function(cb){
                var sql = 'update t_notification set status = 1 where id=? ';
                var args = [];
                args.push(id)
                db.update(sql,args,cb)
            }
        },function(err,result){
            if(err){
                callback(err);
            }else{
                callback(null,result.noticeDetail);
            }
        })
    },
    /**
     * 根据玩家ID获取消息通知列表
     */
    getNoticeListByPlayerId:function(playerId,callback){
        var sql = 'select * from t_notification where to_user = ? order by create_time desc ';
        var args = [];
        args.push(playerId);
        db.queryForList(null,null,sql,args,callback);
    },

    /**
     * 获取系统公告列表
     */
    getSysNoticeList:function(callback){
        let sql = " select id,title,content,create_time from t_sys_notice where status = 1 order by create_time desc ";
        var args = [];
        db.queryForAll(sql,args,callback);
    }
}