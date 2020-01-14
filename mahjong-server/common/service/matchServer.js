var db = require('../../utils/db');
var config = require("../../configs")
db.init(config.mysql())
module.exports = {

    getMatchConfig: function (type, callback) {
        let sql = "select * from t_bisai_config where type=?"
        db.queryForObject(sql, [type], callback)
    }
}