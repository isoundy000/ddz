/**
 * @author hyw
 * @date 2018/7/6 0006
 * @description: 全局配置服务类
 */
var db = require('../../utils/db');
var cacheUtil = require('../../utils/cacheUtil');
var constants = require('../../constants');
module.exports = {
    /**
     * 查询全局配置信息
     */
    getGlobalCfg: function (callback) {
        var sql = " select p_key,p_value from t_param_config order by id ";
        var args = [];
        db.queryForAll(sql, args, callback);
    },

       /**
     * 查询weixin信息
     */
    getweixinCfg: function (callback) {
        var sql = " select p_value,nickname from t_param_config where p_key='wx_kefu' order by id ";
        var args = [];
        db.queryForAll(sql, args, callback);
    },
    /**
     * 根据key值获取参数
     */
    getByParamKey: function (key, callback) {
        var self = this;
        //先查询缓存中是否存在缓存数据
        cacheUtil.get(constants.CACHE_GLOBAL_CONFIG, function (value) {
            //缓存中无值则从数据库读取
            if (value) {
                var configs = JSON.parse(value);
                callback(configs[key]);
            } else {
                self.getGlobalCfg(function (err, configsList) {
                    if (err) {
                        console.log(err);
                        callback(null);
                    } else {
                        if (configsList && configsList.length > 0) {
                            var globalCfgs = {};
                            for (var i = 0; i < configsList.length; i++) {
                                globalCfgs[configsList[i].p_key] = configsList[i].p_value;
                            }
                            cacheUtil.set(constants.CACHE_GLOBAL_CONFIG, JSON.stringify(globalCfgs));
                            callback(globalCfgs[key]);
                        } else {
                            callback(null);
                        }
                    }
                })
            }
        })
    },
    async getByParamKeyAsync(key) {
        var self = this;
        return new Promise((resolve, reject) => {
            //先查询缓存中是否存在缓存数据
            cacheUtil.get(constants.CACHE_GLOBAL_CONFIG, function (value) {
                //缓存中无值则从数据库读取
                if (value) {
                    var configs = JSON.parse(value);
                    resolve(configs[key]);
                } else {
                    self.getGlobalCfg(function (err, configsList) {
                        if (err) {
                            console.log(err);
                            resolve(null);
                        } else {
                            if (configsList && configsList.length > 0) {
                                var globalCfgs = {};
                                for (var i = 0; i < configsList.length; i++) {
                                    globalCfgs[configsList[i].p_key] = configsList[i].p_value;
                                }
                                cacheUtil.set(constants.CACHE_GLOBAL_CONFIG, JSON.stringify(globalCfgs));
                                resolve(globalCfgs[key]);
                            } else {
                                resolve(null);
                            }
                        }
                    })
                }
            })
        })
    }
}
