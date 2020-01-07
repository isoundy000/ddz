/**
 * Created by hyw on 2018/06/30.
 * 文档说明：缓存帮助类
 */
var redis = require('./redis');
var cacheUtil = {
    /**
     * 根据key值获取缓存
     * @param key
     * @param callback
     */
    get: function (key, callback) {
        redis.get(key + '', function (err, value) {
            if (err) {
                callback(null);
            } else {
                callback(value);
            }
        });
    },
    smembers:function(key,callback){
        redis.smembers(key +"",function(err,value){
            if(err){
                callback(null);
            }else{
                callback(value);
            }
        })
    },
    sadd:function(key,value,callback){
        redis.sadd(key+"",value,function(err,r){
            if(err){
                callback(null);
            }else{
                callback(r)
            }
        })
    },
    srem:function(key,value,callback){
        redis.srem(key+"",value)
    },
    /**
     * 保存数据
     * @param key
     * @param value
     * @param expiration 过期时间(单位：秒)
     */
    set: function (key, value, expiration) {
        redis.set(key + '', value.toString());
        if (expiration) {
            redis.expire(key + '', expiration);
        }
    },
    /**
     * 根据key值删除
     * @param key
     */
    del: function (key) {
        redis.del(key + '');
    },
    /**
     * 根据key值删除
     * @param key
     */
    delAsync: function (key) {
        return new Promise((resolve, reject) => {
            redis.del(key + '', (res) => {
                console.log(`清理redis中：${key}`)
                resolve(res);
            });
        })
    },
    /**
     * 选择分区
     * @param {*} number 
     */
    async selectAsync(number) {
        return new Promise((resolve, reject) => {
            redis.select(1, function () {
                console.log('redis select 1.');
                resolve(true);
            });
        })
    },
    /**
     * 根据key值获取缓存
     * @param key
     * @param callback
     */
    async getAsync(key) {
        return new Promise((resolve, reject) => {
            redis.get(key + '', function (err, value) {
                if (err) {
                    resolve(null);
                } else {
                    resolve(value);
                }
            });
        })
    },
}
module.exports = cacheUtil;