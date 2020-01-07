var db = require('../../utils/db');
/**
 * @author hyw
 * @date 2018/5/16 0016
 * @description: 机器人服务器类
 */
var robotService = {
    /**
     * 根据房间ID获取机器人
     */
     getRobotByRoomId:function(roomId,callback){
        var sql = "select u.* from t_robot_config t,t_users u where t.user_id = u.userid and (u.roomid is NULL or u.roomid='') and t.room_id = ?";
        var args = [];
        args.push(roomId);
        db.queryForList(null,null,sql,args,callback);
     },

    /**
     * 获取当前能使用的机器人的数量
     * @returns {Promise.<T>}
     */
      getCanUsedRobotCountAsync:function(){
          return new Promise((resolve, reject) => {
              let sql = "select count(userid) from t_users t where userid>600000 and  t.is_robot = 1 and (t.roomid is null or t.roomid not in (select id from t_rooms))";
              db.queryForInt(sql, [], (error, res) => {
                  if (error) {
                      reject(error);
                      return
                  }
                  resolve(res);
              })
          }).catch((err) => {
              console.log(`getCanUsedRobotCountAsync:${err}`);
          })
      },

    /**
     * 随机获取一个可以使用的机器人（排除掉麻将金币场使用的机器人）
     */
    getRobot:function(){
       return new Promise((resolve,reject)=>{
           let sql = "select * from t_users where is_robot=1 and (roomid is null or roomid not in (select id from t_rooms)) and userid>600000 order by rand() limit 1";
           db.queryForObject(sql, [], (error, res) => {
               if (error) {
                   reject(error);
                   return
               }
               resolve(res);
           })
       }).catch((err) => {
           console.log(`getRobot:${err}`);
       })
    }
}

module.exports = robotService;