/**
 * @author hyw
 * @date 2018/6/27 0027
 * @description: 俱乐部服务类
 */
var crypto = require("../../utils/crypto")
var db = require('../../utils/db');
var async = require('async');
var dateUtil = require('../../utils/dateUtil');

var playerService = require('./playerService');
var notificationService = require('./notificationService');
var rechargeService = require('./rechargeService');
let commonService = require("./commonService")

module.exports = {

    /**
     * 创建俱乐部
     */
    createClub:async function(userId,club_avatar,club_name,is_private,callback){
        var sql = 'insert into t_club set ?';
        let data = {};
        let id = await generateClubId();
        data.club_id = id;
        data.create_user = userId;
        data.club_avatar = club_avatar;
        data.club_name = club_name;
        data.is_private = is_private;
        db.save(sql,data,function(err,data){
            if(err){
                console.log(err)
                console.log("data.club_id",{clubId:id})
                callback(err,null)
                
            }else{
                console.log("data.club_id",{clubId:id})
                callback(null,{clubId:id})
            }
        });
    },


        /**
     * 更新俱乐部
     */
    updateClub:async function(club_id,club_name,club_manifesto,norank,status,check,private,callback){
        var sql = 'update  t_club set ? where club_id=?';
        let data = {};
        data.club_name = club_name;
        data.norank= norank;
        data.status = status;
        data.club_manifesto=club_manifesto;
        data.check = check;
        data.private = private;

        let args=[data,club_id]
        db.save(sql,args,function(err,data){
            if(err){
                console.log(err)
                // console.log("data.club_id",{clubId:club_id})
                callback(err,null)
                
            }else{
                // console.log("data.club_id",{clubId:club_id})
                callback(null,data)
            }
        });
    },

    getClubIdByuserId:async function(userId,callback){
        let sql = "select * from  t_users_club where userId = ?"
        let args = [userId]
        db.queryForAll(sql,args,callback)
    },


    //获得一定时间不登录的玩家信息
    getTimeOutUser:function(timeSpace,clubid,callback){
        let nowTime = new Date().getTime()/1000;
        let timeEnd = nowTime-timeSpace;
        // console.log("nowTime",timeEnd)
        // console.log("timeEnd",timeEnd)
        // console.log("timeEnd",timeEnd)
        let sql = `select headimg,name,last_login_time,users.userid from t_users as users,t_users_club as club where club.clubId = ? and users.userid=club.userId and last_login_time<? order by users.last_login_time desc`;
        let args = [clubid,timeEnd]
        db.queryForList(null, null, sql, args, callback);
    },
//获得俱乐部内所有所开房间内所有玩家信息
getRoomUsersByClubid:async function(clubId,callback){
    async.auto({
        getRoomId:function(callback){
            var sql = "select id from t_rooms where club_id =?"
            let args=[clubId];
            db.queryForAll(sql,args,callback)
        },
        getRoomInfo:["getRoomId",function(result,callback){
            let d=[]
            if(result.getRoomId.length!==0){
                for(let i of result.getRoomId){
                    d.push(i.id)
                }
                let sql2 = "select rooms.id,rooms.room_type,rooms.base_info from t_rooms as rooms where rooms.id in ? group by rooms.id"
                let data = [[d]]
                db.queryForAll(sql2,data,callback)
            }else{
                callback(null,[])
            }
        }],
        getUserInfo:["getRoomInfo",function(result,callback){
            let d=[];
            if(result.getRoomId.length!==0){
                for(let i of result.getRoomId){
                    d.push(i.id)
                }
                console.log(d)
                let sql2 = "select headimg,roomid from t_users  where roomid in ?"
                let data = [[d]]
                console.log("data222",data)
                db.queryForAll(sql2,data,callback)
            }else{
                callback(null,[])
            }
        }]

        },function(err,result){
            if(err){
                callback(err,[])
            }else{
                let users = []
                let rooms={};
                for(let i of result.getRoomInfo){
                    let info = JSON.parse(i.base_info);
                    let temp = {}
                    temp.seatCount = info.seatCount
                    temp.room_type = i.room_type
                    temp.diZhu = info.diZhu
                    let users = [];

                    for(let j of result.getUserInfo){
                        if(j.roomid==i.id){
                            users.push(j.headimg)
                        }
                    }
                    temp.users=users;
                    rooms[i.id] = temp
                }
                let s={}
                s.rooms=rooms
                console.log(rooms)
                // s.users = result.getUserInfo
                callback(null,s)
            }
            
        }
    )


},


//获得俱乐部内所有所开房间的信息
getRoomByClubid:async function(clubId,callback){
    async.auto({
        getRoomId:function(callback){
            var sql = "select id from t_rooms where club_id =?"
            let args=[clubId];
            db.queryForAll(sql,args,callback)
        },
        getRoomInfo:["getRoomId",function(result,callback){
            let d=[]
            if(result.getRoomId.length!==0){
                for(let i of result.getRoomId){
                    d.push(i.id)
                }
                let sql2 = "select rooms.id,rooms.room_type,rooms.base_info from t_rooms as rooms where rooms.id in ? group by rooms.id"
                let data = [[d]]
                db.queryForAll(sql2,data,callback)
            }else{
                callback(null,[])
            }
        }],

        },function(err,result){
            if(err){
                callback(err,[])
            }else{
                let users = []
                let rooms={};
                for(let i of result.getRoomInfo){
                    let info = JSON.parse(i.base_info);
                    let temp = {}
                    temp.seatCount = info.seatCount
                    temp.room_type = i.room_type
                    temp.diZhu = info.diZhu
                    let users = [];
                    rooms[i.id] = temp
                }
                // console.log(rooms)
                // s.users = result.getUserInfo
                callback(null,rooms)
            }
            
        }
    )


},
    //更新俱乐部用户角色


updateClueUserType:function(clubId,userId,user_type,callback){
    let sql = "update t_users_club set userType=? where clubId=? and userId=?"
    let args = [user_type,clubId,userId]
    db.save(sql,args,callback)
},


    updateAdmin: async function (club_id,userId,callback){
        let sql1 = "select headimg from t_users where userId=?"
        db.queryForObject(sql1,[userId],function(err,value){
            if(err || !value){
                callback(err,null)
            }else{
                var sql = 'update  t_club set create_user = ?, club_avatar=? where club_id=?';
                // console.log(value)
                // console.log(value.headimg)
                // console.log(value[0].headimg)
                let args=[userId,value.headimg,club_id]
                db.save(sql,args,callback)
            }
        })

    },
    updateClub_users:async function (club_id,userId,user_type,callback){
        var sql = 'update  t_users_club set userType = ? where clubId=? and userId=?';
        let args=[user_type,club_id,userId]
        db.save(sql,args,callback)
    },
    
    updateUsers_belongs_club:async function (club_id,userId,callback){
        let self = this;
        self.getJoinClub(userId,function(err,data){
            if(err || !data){
                callback(err,null)
            }else{
                console.log("data.belongs_club",data.belongs_club)
                console.log("data",data)
                if ( typeof (data[0].belongs_club) =="number" || !data[0].belongs_club){
                    
                    var belongs_club =[]
                    if(data[0].belongs_club){
                        belongs_club.push(data.belongs_club)
                    }
                    
                }else{
                    var belongs_club = JSON.parse(data[0].belongs_club)
                }
                
                if(!belongs_club){
                    belongs_club = [];
                }
                belongs_club.push(club_id)
                belongs_club = JSON.stringify(belongs_club)
                console.log("belongs_club123",belongs_club)
                var sql = 'update  t_users set belongs_club = ? where userId=?';
                let args=[belongs_club,userId]
                console.log("args",args)
                db.save(sql,args,callback)
            }
        })

    },

    deleteUsers_belongs_club:async function (club_id,userId){
        let self = this;
        self.getJoinClub(userId,function(err,data){
            if(err || !data){
                callback(err,null)
            }else{
                let belongs_club = JSON.parse(data.belongs_club)
                if(belongs_club){
                    let index = belongs_club.indexOf(club_id);
                    if(index != -1){
                        belongs_club.splice(index,1);
                    }
                }else{
                    belongs=[]
                }
                belongs_club = JSON.stringify(belongs_club);
                var sql = 'update  t_users set belongs_club = ?where userId=?';
                let args=[belongs_club,userId]
                db.save(sql,args,callback)
            }
        })

    },
            /**
     * 更新俱乐部老板
     */
    updateClubCreate:async function(club_id,userId,admin_userId,callback){
        let self = this;
        //依次为更新t_club中create_user,更换t_users_club的usertype,t_users中的blong_club
        async.auto({
            updateadmin:function(callback){
                self.updateAdmin(club_id,userId,callback)
            },
            updateNewClub_users:["updateadmin",function(result,callback){
                if(result){
                    self.updateClub_users(club_id,userId,2,callback)
                }
                
            }],
            updateOldClub_users:["updateNewClub_users",function(result,callback){
                if(result){
                    self.updateClub_users(club_id,admin_userId,0,callback)
                }
                
            }],

        },function(err,result){
            if(err){
                return callback(err,null)
            }
            callback(null,result)
        })

    },

    //获取当前玩家在当前俱乐部的身份
    getClubPermission:async function(clubId,userId,callback){
        var sql = "select userType from t_users_club where userId =? and clubId=? "
        let data = [userId,clubId]
        db.queryForAll(sql,data,callback)
    },
    /**
     * 更新俱乐部成员
     */
    createClub:async function(userId,club_avatar,club_name,is_private,callback){
        var sql = 'insert into t_club set club_id=?,create_user=?,club_avatar=?,club_name=?,is_private=?,create_time=?,member_count =member_count+1';

        let id = await generateClubId();
        
        let create_time = new Date().getTime();
        let data = [id,userId,club_avatar,club_name,is_private,create_time]

        db.save(sql,data,function(err,data){
            if(err){
                callback(err,null)
            }else{
                console.log("data.club_id",{clubId:id})
                callback(null,{clubId:id})
            }
        });
    },

    dleteClubUsers:async function(userId,clubId,callback){
        let sql = "delete from t_users_club where userId=? and clubId=? "
        let args = [userId,clubId]
        db.save(sql,args,callback)
    },
    /**
     * 
     * 创建俱乐部和用户的对应关系
     */
    createClubUsers:async function(userId,clubid,userType,callback){
        var sql = 'insert into t_users_club set ?';
        let data = {};
        data.clubId = await generateClubId();
        data.userId = userId;
        data.clubId = clubid;
        data.userType = userType;
        db.save(sql,data,callback);
    },

    /**
     * 根据申请ID获取详情
     */
    getApplyById: function (applyId, callback) {
        var sql = ' select a.id,a.club_id,a.apply_user,a.apply_username,a.apply_time,b.create_user,b.belongs_agent,b.club_name from t_club_join_apply a LEFT JOIN t_club b on a.club_id = b.club_id where a.id = ? ';
        var args = [];
        args.push(applyId);
        db.queryForObject(sql, args, callback);
    },
    /**
     * 根据俱乐部ID获取加入申请列表
     */
    getApplyListByClubId: function (clubId, callback) {
        var sql = 'select u.headimg,t.id,t.club_id,t.apply_user,t.apply_username,t.apply_time from t_club_join_apply as t,t_users as u where t.club_id = ?and u.userid = t.apply_user';
        var args = [];
        args.push(clubId);
        db.queryForList(null, null, sql, args, callback);
    },


    //统计俱乐部消费
    getTongjiClub:function(clubId,callback){
        let yesterday = dateUtil.getYesterdayTime("yyyy-MM-dd");
        let yesterdayB = dateUtil.getBeginTimestamp(yesterday);
        let yesterdayE = dateUtil.getEndTimestamp(yesterday);
        let now = dateUtil.getCurrentTimestamp();
        console.log(yesterdayB,yesterdayE,now)
        async.auto({
            yesterdayRoom:function(callback){
                let sql = "select count(distinct roomId) as yes_count from t_game_record where club_id = ? and record_time<=? and record_time>=? "
                let args = [clubId,yesterdayE,yesterdayB]
                db.save(sql,args,callback)
            },
            nowRoom:function(callback){
                let sql = "select count(distinct roomId) as now_count from t_game_record where club_id = ? and record_time<=? and record_time>=? "
                let args = [clubId,now,yesterdayE]
                db.save(sql,args,callback)
            },
            yesterdayGems:function(callback){
                let sql = "select sum(consume_count) as yes_gems from t_consume_record where consume_type='gems' and clubId=? and record_time<=? and record_time>=? and  sum_all=0"
                let args = [clubId,yesterdayE,yesterdayB]
                db.save(sql,args,callback)
            },
            nowGems:function(callback){
                let sql = "select sum(consume_count) as now_gems from t_consume_record where consume_type='gems' and clubId=? and record_time<=? and record_time>=? and  sum_all=0"
                let args = [clubId,now,yesterdayE]
                db.save(sql,args,callback);
            }
        },function(err,result1){
            if(err){
                console.log(err)
                return callback(err,null)
            }
            // console.log(nowData.now_count)
            // console.log(nowData[0].now_count)
            let yes_room = 0;
            let now_room = 0;
            let yes_gems = 0;
            let now_gems = 0;
            if(result1.nowRoom[0].now_count){
                now_room = result1.nowRoom[0].now_count
            }
            if(result1.yesterdayRoom[0].yes_count){
                yes_room = result1.nowRoom[0].now_count
            }
            if(result1.yesterdayGems[0].yes_gems){
                yes_gems=result1.yesterdayGems[0].yes_gems
            }
            if(result1.nowGems[0].now_gems){
                yes_gems=result1.nowGems[0].now_gems
            }
            let result = {yesterdayRoom:now_room,nowRoom:yes_room,yes_gems:yes_gems,now_gems:now_gems}
            callback(null,result)
        }
        )



    },
    /**
     * 申请加入俱乐部
     */
    applyJoinClub: function (applyEntity, callback) {
        var sql = 'insert into t_club_join_apply set ? ';
        db.save(sql, applyEntity, callback);
    },


    /**
     * 
     * 更新t_users_club
     */
    updateUserClub:function(club_id,userid,usertype,callback){
        var sql = "insert into t_users_club set clubId =?,userId=?,userType=? "
        let args=[club_id,userid,usertype]
        db.save(sql, args, callback);
    },
    /**
     * 同意加入俱乐部
     */
    agreeJoinClub: function (applyId, callback) {
        var self = this;
        this.getApplyById(applyId, function (err, applyEntity) {
            if (err) {
                callback(err);
            } else {
                if (applyEntity) {
                    //确认加入  1、更新用户俱乐部信息 2、更新俱乐部信息 3、删除所有的申请记录 4、发送系统通知  5、赠送房卡 6、添加银行流水记录
                    async.auto({
                        updateUser: function (callback) {
                            playerService.updateBelongsClubAndAgent(applyEntity.apply_user, applyEntity.belongs_agent, applyEntity.club_id, callback);
                        },
                        updateClub: function (callback) {
                            self.updateMemberCount(applyEntity.club_id, 1, callback);
                        },
                        updateClubUser:function(callback){
                            self.updateUserClub(applyEntity.club_id,applyEntity.apply_user,0,callback)
                        },
                        delApply: function (callback) {
                            self.delByUserId(applyEntity.apply_user, callback);
                        },

                        sendNotification: function (callback) {
                            var notification = {};
                            notification.title = '俱乐部申请反馈';
                            notification.content = '俱乐部【编号：' + applyEntity.club_id + '】的管理员已经同意了您的加入申请';
                            notification.status = 0;
                            notification.to_user = applyEntity.apply_user;
                            notification.to_username = applyEntity.apply_username;
                            notification.type = 'sys';
                            notification.create_time = dateUtil.getCurrentTimestapm();

                            notificationService.saveNotification(notification, callback);
                        },

                        is_first_join_club(callback) {
                            playerService.isFirstJoinClub(applyEntity.apply_user, callback);
                        },

                        //获取加入俱乐部赠送房卡的数量
                        getGrantGemsCount: function (callback) {
                            playerService.getParamConfigByPKey("join_club_reward", callback);
                        },
                        //赠送房卡并添加流水记录
                        grantGems: ["is_first_join_club","getGrantGemsCount", function (result, callback) {

                            console.log("************是否是第一次加入俱乐部************");
                            console.log(JSON.stringify(result));
                            if(!result.is_first_join_club){
                                var grantGemsCount = result.getGrantGemsCount.p_value;
                                if (grantGemsCount) {
                                    rechargeService.changeUserGoldsAndSaveBankStatement(applyEntity.apply_user, grantGemsCount, 3, "第一次加入俱乐部赠送的房卡", "gems", callback);
                                } else {
                                    callback(null, 0);
                                }
                            }else{
                                callback(null, 0);
                            }
                        }]
                    }, function (err, result) {
                        if (err) {
                            callback(err);
                        } else {
                            if (result.updateUser.affectedRows > 0 && result.updateClub.affectedRows > 0) {
                                callback(null, 1);
                            } else {
                                callback(null, 0);
                            }
                        }

                    });
                } else {
                    callback(null, 1);
                }
            }
        })
    },
    /**
     * 拒绝加入俱乐部
     */
    refuseJoinClub: function (applyId, callback) {
        var self = this;
        this.getApplyById(applyId, function (err, applyEntity) {
            if (err) {
                callback(err);
            } else {
                //拒绝加入  1、删除申请记录 2、发送系统通知
                async.auto({
                    delApply: function (callback) {
                        self.delByApplyId(applyEntity.id, callback);
                    },
                    sendNotification: function (callback) {
                        var notification = {};
                        notification.title = '俱乐部申请反馈';
                        notification.content = '俱乐部【编号：' + applyEntity.club_id + '】的管理员拒绝了您的加入申请';
                        notification.status = 0;
                        notification.to_user = applyEntity.apply_user;
                        notification.to_username = applyEntity.apply_username;
                        notification.type = 'sys';
                        notification.create_time = dateUtil.getCurrentTimestapm();

                        notificationService.saveNotification(notification, callback);
                    }
                }, function (err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        if (result.delApply.affectedRows > 0) {
                            callback(null, 1);
                        } else {
                            callback(null, 0);
                        }
                    }
                });
            }
        })
    },
    /**
     * 更新俱乐部的成员数量
     */
    updateMemberCount: function (clubId, count, callback) {
        var sql = 'update t_club set member_count=member_count+? where club_id=? ';
        var args = [];
        args.push(count);
        args.push(clubId);
        db.update(sql, args, callback);
    },
    /**
     * 删除申请记录
     */
    delByApplyId: function (id, callback) {
        var sql = 'delete from t_club_join_apply where id=? ';
        var args = [];
        args.push(id);
        db.delete(sql, args, callback);
    },
    /**
     * 删除申请记录
     */
    delByUserId: function (userId, callback) {
        var sql = 'delete from t_club_join_apply where apply_user=? ';
        var args = [];
        args.push(userId);
        db.delete(sql, args, callback);
    },
    /**
     * 是否在申請中
     */
    isApplying: function (userId,clubId, callback) {
        var sql = 'select count(*) from t_club_join_apply where apply_user = ? and club_id=? ';
        var args = [];
        args.push(userId);
        args.push(clubId);
        db.queryForInt(sql, args, callback);
    },

    //获取玩家所加入的俱乐部id
    getJoinClub:function(userId,callback){
        let sql = "select belongs_club from t_users where userid=?"
        let args = [userId]
        db.queryForAll(sql,args,callback)
    },
        /**
     * 根据游戏群Id号查询游戏群信息
     * @param {*} club_id 
     * @param {*} callback 
     */
    getClubInfoByClubId: function(club_id, callback) {
        let sql = 'select * from t_club where club_id = ?';
        let args = [];
        args.push(club_id);
        db.queryForObject(sql, args, callback);
    },

            /**
     * 获得所有俱乐部玩家的赢牌次数
     * @param {*} club_id 
     * @param {*} callback 
     */
    getWinNum: function(club_id, callback) {
        let sql = 'select fk_player_id ,count(fk_player_id) as win_num from t_game_record where (win_score>0 or jifen>0) and club_id = ? group BY fk_player_id  order by win_num desc';
        let args = [];
        args.push(club_id);
        db.queryForAll(sql, args, function(err,data){
            if(err){
                return callback(err,null)
            }
            if(data.length==0){
                return callback(null,[])
            }
            let sql1="select userid,headimg,name from t_users where userid in ? "
            let args2=[]
            
            for(let i of data){
                args2.push(i.fk_player_id)
            }
            let args3=[[args2]]
            db.queryForAll(sql1,args3,function(err,data2){
                if(err){
                    return callback(err,null)
                }
 
                for(let i of data2){
                    i.name = crypto.fromBase64(i.name)
                    for(let j of data){
                        if(j.fk_player_id==i.userid){
                            i.win_num=j.win_num
                        }
                    }
                }
                return callback(null,data2)
            })
            
        });
    },

    getFailNum: function(club_id, callback) {
        let sql = 'select fk_player_id ,count(fk_player_id) as fail_num from t_game_record where (win_score<0 or jifen<0) and club_id = ? group BY fk_player_id  order by fail_num desc';
        let args = [];
        args.push(club_id);
        db.queryForAll(sql, args, function(err,data){
            if(err){
                return callback(err,null)
            }
            if(data.length==0){
                return callback(null,[])
            }
            let sql1="select userid,headimg,name from t_users where userid in ? "
            let args2=[]
            
            for(let i of data){
                args2.push(i.fk_player_id)
            }
            let args3=[[args2]]
            db.queryForAll(sql1,args3,function(err,data2){
                if(err){
                    return callback(err,null)
                }
 
                for(let i of data2){
                    i.name = crypto.fromBase64(i.name)
                    for(let j of data){
                        if(j.fk_player_id==i.userid){
                            i.fail_num=j.fail_num
                        }
                    }
                }
                return callback(null,data2)
            })
            
        });
    },

    //获取俱乐部内玩家的赢得分数

    getFaiJifen: function(club_id, callback) {
        let sql = 'select fk_player_id ,sum(jifen) as sum_jifen from t_game_record where  jifen<0 and club_id = ? group BY fk_player_id  order by sum_jifen asc';
        let args = [];
        args.push(club_id);
        db.queryForAll(sql, args, function(err,data){
            if(err){
                return callback(err,null)
            }
            if(data.length==0){
                return callback(null,[])
            }
            let sql1="select userid,headimg,name from t_users where userid in ? "
            let args2=[]
            
            for(let i of data){
                args2.push(i.fk_player_id)
            }
            let args3=[[args2]]
            db.queryForAll(sql1,args3,function(err,data2){
                if(err){
                    return callback(err,null)
                }
 
                for(let i of data2){
                    i.name = crypto.fromBase64(i.name)
                    for(let j of data){
                        if(j.fk_player_id==i.userid){
                            i.sum_jifen=j.sum_jifen
                        }
                    }
                }
                return callback(null,data2)
            })
            
        });
    },

    getWinJifen: function(club_id, callback) {
        let sql = 'select fk_player_id ,sum(jifen) as sum_jifen from t_game_record where  jifen>0 and club_id = ? group BY fk_player_id  order by sum_jifen desc';
        let args = [];
        args.push(club_id);
        db.queryForAll(sql, args, function(err,data){
            if(err){
                return callback(err,null)
            }
            if(data.length==0){
                return callback(null,[])
            }
            let sql1="select userid,headimg,name from t_users where userid in ? "
            let args2=[]
            
            for(let i of data){
                args2.push(i.fk_player_id)
            }
            let args3=[[args2]]
            db.queryForAll(sql1,args3,function(err,data2){
                if(err){
                    return callback(err,null)
                }
 
                for(let i of data2){
                    i.name = crypto.fromBase64(i.name)
                    for(let j of data){
                        if(j.fk_player_id==i.userid){
                            i.sum_jifen=j.sum_jifen
                        }
                    }
                }
                return callback(null,data2)
            })
            
        });
    },

    /**
     * 
     * @param {*} userId 
     * @param {*} callback 
     */
    getClubInfoByUserId(userId, callback) {
        let sql = "select * from t_users_club where userId =?"
        db.queryForAll(sql,userId,function(err,data){
            if(err){
                callback(err,null)
                return;
            }
            if(!data || data.length==0){
                callback(null,[]);
                return;
            }
            let clubIds=[];
            for(let i of data){
                clubIds.push(i.clubId)
            }
            let sql = 'select club.*,users.name  from t_club as club,t_users as users where club.club_id in ? and users.userid = club.create_user group by club.club_id';
            let args = [[clubIds]];
            console.log("args",args)
            db.queryForAll(sql, args, callback);
        })

    },




}
async function generateClubId() {
    var clubId = "";
    for (var i = 0; i < 7; ++i) {
        clubId += Math.floor(Math.random() * 10);
    }
        try {
            let roomInfo = await commonService.getTableValuesAsync('*', 't_club', {
                club_id: clubId,
            })
            // console.log("clubId",clubId,clubId.length)
            if (roomInfo != null ||clubId.length<7||clubId[0]==0) {
                return await generateClubId();
            } else {
                return clubId;
            }
        } catch (error) {
            console.log(error);
            return 0;
        }
    
}

