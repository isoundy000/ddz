/**
 * @author nt
 * @date 2018/7/25 0012
 * @description 一些公共的方法
 */
var db = require('../../utils/db');

module.exports = {
    /**
     * 从 t_name 表中获取 values 值
     * @param {string} values 獲取 t_name 信息的values值，獲取多個以,隔開，例：name,userid
     * @param {string} t_name 表的名字
     * @param {{table_key:any}} k_obj 限制条件，目前只能一个
     */
    async getTableValuesAsync(values, t_name, k_obj) {
        return new Promise((resolve, reject) => {
            if (typeof values !== "string"
                || typeof k_obj !== "object"
                || typeof t_name !== "string") {
                console.trace("参数错误：");
                reject("参数错误")
                return;
            }
            let sql = `select ${values} from ${t_name} where ?`;
            db.queryForObject(sql, k_obj, (err, result) => {
                if (err) {
                    reject(err);
                    return
                }
                resolve(result);
            })
        }).catch((err) => {
            console.log(`commonService:G:33${err}`);
        })
    },
    /**
     * 从 t_name 表中获取 values 值
     * @param {number} pos 起始点
     * @param {number} size 长度
     * @param {string} values 獲取 t_name 信息的values值，獲取多個以,隔開，例：name,userid
     * @param {string} t_name 表的名字
     * @param {{table_key:any}} k_obj 限制条件，目前只能一个
     */
    async getTableListAsync(pos, size, values, t_name, k_obj) {
        return new Promise((resolve, reject) => {
            if (typeof values !== "string"
                || typeof k_obj !== "object"
                || typeof t_name !== "string") {
                console.trace("参数错误：");
                reject("参数错误")
                return;
            }
            let sql = `select ${values} from ${t_name} where ?`;
            db.queryForList(pos, size, sql, k_obj, (err, result) => {
                if (err) {
                    reject(err);
                    return
                }
                resolve(result);
            })
        }).catch((err) => {
            console.log(`commonService:G:62${err}`);
        })
    },

       /**
     * 从 t_name 表中获取 values 值
     * @param {number} pos 起始点
     * @param {number} size 长度
     * @param {string} values 獲取 t_name 信息的values值，獲取多個以,隔開，例：name,userid
     * @param {string} t_name 表的名字
     * @param {{table_key:any}} k_obj 限制条件，目前只能一个
     */
    async getTableAListAsync(pos, size, values, t_name) {
        return new Promise((resolve, reject) => {
            if (typeof values !== "string"
                || typeof t_name !== "string") {
                console.trace("参数错误：");
                reject("参数错误")
                return;
            }
            let sql = `select ${values} from ${t_name} `;
            db.queryForList(pos, size, sql, (err, result) => {
                if (err) {
                    reject(err);
                    return
                }
                resolve(result);
            })
        }).catch((err) => {
            console.log(`commonService:G:62${err}`);
        })
    },
    /**
     * 
     * @param {string} t_name 表的名字
     * @param {{string:number}} v_obj 需要增加或减少的number类型数据
     * @param {{table_key:any}} k_obj 限制条件，目前只能一个
     */
    async changeNumberOfObjForTableAsync(t_name, v_obj, k_obj) {
        return new Promise((resolve, reject) => {
            if (typeof v_obj !== "object"
                || typeof k_obj !== "object"
                || typeof t_name !== "string") {
                reject(console.trace("参数错误："));
                return
            }
            let update_str = ''
            for (const key in v_obj) {
                if (v_obj.hasOwnProperty(key)) {
                    const element = parseInt(v_obj[key]);
                    if (Number.isNaN(element)) {
                        reject(`参数错误：${JSON.stringify(v_obj)},${key}：${element}`);
                        return
                    }
                    update_str += `${key}=${key}+${element},`
                }
            }
            let sql = `update ${t_name} set ${update_str.slice(0, update_str.length - 1)} where ?`
            db.update(sql, k_obj, (err, res) => {
                if (err) {
                    reject(err);
                    return
                }
                //console.log("修改数据库成功：" + sql + JSON.stringify(k_obj));
                resolve(res);
            })
        }).catch((err) => {
            console.log(`commonService:G:100${err}`);
        })
    },
    /**
     * 
     * @param {string} t_name 表的名字
     * @param {{string:number}} v_obj 需要增加或减少的number类型数据
     */
    async saveAsync(t_name, v_obj) {
        return new Promise((resolve, reject) => {
            if (typeof v_obj !== "object"
                || typeof t_name !== "string") {
                reject(console.trace("参数错误："));
                return
            }
            if (t_name.includes(" ")) {
                reject(console.trace("参数错误："));
                return
            }
            let sql = `insert into ${t_name} set ?`;
            db.save(sql, v_obj, (err, res) => {
                if (err) {
                    reject(err);
                    return
                }
                resolve(res);
            })
        }).catch((err) => {
            console.log(`commonService:G:128 ${err}`);
        })
    },
    /**
     * 
     * @param {string} t_name 表的名字
     * @param {{string:number}} v_obj 需要增加或减少的number类型数据
     * @param {} k_key 限制条件，索引
     * @param {} k_value 限制条件，值
     */
    async updateAsync(t_name, v_obj, k_key, k_value) {
        return new Promise((resolve, reject) => {
            if (typeof v_obj !== "object"
                || typeof t_name !== "string"
                || typeof k_key !== "string") {
                reject(console.trace("参数错误："));
                return
            }
            if (t_name.includes(" ") || k_key.includes(" ")) {
                reject(console.trace("参数错误："));
                return
            }
            let sql = `update ${t_name} set ? where ${k_key}='${k_value}'`;
            db.update(sql, v_obj, (err, res) => {
                if (err) {
                    reject(err);
                    return
                }
                resolve(res);
            })
        }).catch((err) => {
            console.log(`commonService:G:159${err}`);
        })
    },

        /**
     * 保存举报消息
     * @param entity
     * @param callback
     */
    savejubao(entity,callback){
        var sql = 'insert into t_jubao set ? ';
        db.save(sql,entity,callback);
     },
        /**
     * 只可用于百人牛牛
     * @param {string} t_name 表的名字
     * @param {{string:number}} v_obj 需要增加或减少的number类型数据
     * @param {} k_key 限制条件，索引
     * @param {} k_value 限制条件，值
     */
    async updateAsyncN(t_name, v_obj, k_key, k_value) {
        return new Promise((resolve, reject) => {
            if (typeof v_obj !== "object"
                || typeof t_name !== "string"
                || typeof k_key !== "string") {
                reject(console.trace("参数错误："));
                return
            }
            if (t_name.includes(" ") || k_key.includes(" ")) {
                reject(console.trace("参数错误："));
                return
            }
            let sql0 = `select seats from t_rooms where id=?`;
            let args = [k_value]
            db.queryForObject(sql0, args, (err, result) => {
                if (err) {
                    reject(err);
                    return
                }
                console.log(result)
                let seats = JSON.parse(result.seats);
                if(!seats){
                    seats={};
                }
                seats[v_obj["user_id"]]=v_obj;
                seats = JSON.stringify(seats);
                let sql = `update ${t_name} set seats=? where ${k_key}='${k_value}'`;
                db.update(sql, [seats], (err, res) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(res);
                })
            })

        }).catch((err) => {
            console.log(`commonService:G:159${err}`);
        })
    },
}