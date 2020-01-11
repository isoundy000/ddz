var db = require('../../utils/db');

module.exports = {
    getMatchConfig:function(type,callback){
        let sql = "select * from t_bisai_config where type=?"
        db.queryForObject(sql,[type],callback)
    }
}