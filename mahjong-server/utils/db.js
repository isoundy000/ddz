var mysql = require("mysql");
var crypto = require('./crypto');

var pool = null;

function nop(a, b, c, d, e, f, g) {

}

function query(sql, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            callback(err, null, null);
        } else {
            conn.query(sql, function (qerr, vals, fields) {
                //释放连接  
                conn.release();
                //事件驱动回调  
                callback(qerr, vals, fields);
            });
        }
    });
};

exports.init = function (config) {
    pool = mysql.createPool({
        host: config.HOST,
        user: config.USER,
        password: config.PSWD,
        database: config.DB,
        port: config.PORT,
        connectionLimit: 50,
        dateStrings: true,
        charset: 'utf8mb4',
        multipleStatements: true
    });
};

/************************新增base方法******************************/

/**
 * 查询单个对象
 */
exports.queryForObject = function (sql, args, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.log(err);
            connection.release();
            return callback(err);
        } else {
            connection.query(sql, args, function (err, result) {
                connection.release();
                if (err) {
                    return callback(err);
                } else {
                    var returnedData = null;
                    if (result && result.length > 0) {
                        returnedData = result[0];
                    }
                    callback(null, returnedData);
                }
            });
        }
    });
};
/**
 * 查询单个值
 */
exports.queryForInt = function (sql, args, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            return callback(err);
        } else {
            connection.query(sql, args, function (err, result) {
                connection.release();
                if (err) {
                    return callback(err);
                } else {
                    var returnedData = null;
                    if (result && result.length > 0) {
                        var tempRes = result[0];
                        var keyList = [];
                        for (var key in tempRes) {
                            keyList.push(key);
                        }
                        if (keyList.length = 1) {
                            returnedData = tempRes[keyList[0]];
                        }
                    }
                    callback(null, returnedData);
                }
            });
        }
    });
};
/**
 * 分页查询列表
 * 若分页查询时，
 */
exports.queryForList = function (pagenum, pagesize, sql, args, callback) {
    var beginNum = 0;
    if (pagenum && pagesize) {
        pagesize = parseInt(pagesize);
        beginNum = (parseInt(pagenum) - 1);
        sql += ' LIMIT ' + beginNum + "," + pagesize;
    }

    pool.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            return callback(err);
        } else {
            connection.query(sql, args, function (err, result) {
                connection.release();
                if (err) {
                    return callback(err);
                } else {
                    callback(null, result);
                }
            });
        }
    });
};


/**
 * 查询所有
 */
exports.queryForAll = function (sql, args, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            return callback(err);
        } else {
            connection.query(sql, args, function (err, result) {
                connection.release();
                if (err) {
                    return callback(err);
                } else {
                    callback(null, result);
                }
            });
        }
    });
};


/**
 * 保存对象,返回保存后对象的ID
 * @param sql
 * @param entity
 * @param callback
 */
exports.save = function (sql, entity, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            return callback(err);
        } else {
            connection.query(sql, entity, function (err, result) {
                connection.release();
                if (err) {
                    return callback(err);
                } else {
                    callback(null, result);
                }
            });
        }
    });
};
/**
 * 更新对象
 * @param sql
 * @param args
 * @param callback
 */
exports.update = function (sql, args, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            return callback(err);
        } else {
            connection.query(sql, args, function (err, result) {
                connection.release();
                if (err) {
                    return callback(err);
                } else {
                    callback(null, result);
                }
            });
        }
    });
};
/**
 * 删除对象
 * @param sql
 * @param args
 * @param callback
 */
exports.delete = function (sql, args, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            return callback(err);
        } else {
            connection.query(sql, args, function (err, result) {
                connection.release();
                if (err) {
                    return callback(err);
                } else {
                    callback(null, result);
                }
            });
        }
    });
};
/**
 * 批量执行
 * @param sql
 * @param args
 * @param callback
 */
exports.batchExecute = function (sql, args, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            return callback(err);
        } else {
            connection.query(sql, args, function (err, result) {
                connection.release();
                if (err) {
                    return callback(err);
                } else {
                    callback(null, result);
                }
            });
        }
    });
}


