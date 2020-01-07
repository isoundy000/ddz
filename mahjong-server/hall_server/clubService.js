const http = require('../utils/http');
const crypto = require('../utils/crypto');
const agentService = require('../common/service/agentService');
const playerService = require('../common/service/playerService');
const rechargeService = require('../common/service/rechargeService');
let clubServer = require("../common/service/clubService")
var async = require('async');
/**
 * 获取玩家信息
 * @param {*} res 
 * @param {*} user_id 
 * @param {*} callback 
 */
function isUserExist(res, user_id, callback) {
    playerService.isUserExist(user_id, (err, user_exist_results) => {
        if (err) {
            console.error(err);
            return
        }
        if (user_exist_results == null) {
            http.send(res, 1, "用户不存在");
            return;
        }
        callback(user_exist_results);
    })
}
/**
 * 获取俱乐部信息
 * @param {*} res 
 * @param {*} club_id 
 * @param {*} callback 
 */
function getClubInfo(res, club_id, callback) {
    clubServer.getClubInfoByClubId(club_id, (err, club_results) => {
        if (err) {
            console.error(err);
            return
        }
        if (club_results == null) {
            http.send(res, 1, "俱乐部不存在");
            return;
        }
        isUserExist(res, club_results.create_user, (user_results) => {
            club_results.creator_name = crypto.fromBase64(user_results.name);
            callback(club_results);
        })
    })
}
/**
 * 验证当前玩家是否是俱乐部创建者
 * @param {*} res 
 * @param {*} club_id 
 * @param {*} user_id 
 * @param {*} callback 
 */
function isClubCreator(res, club_id, user_id, callback) {
    clubServer.getClubInfoByClubId(club_id, (err, club_results) => {
        if (err) {
            console.error(err);
            return;
        }
        if (club_results == null) {
            http.send(res, 1, "俱乐部不存在");
            return;
        }
        if (user_id != club_results.create_user) {
            http.send(res, 1, "不是俱乐部创建者");
            return;
        }
        callback(club_results);
    })
}

module.exports = {
    /**
     * 玩家通俱乐部ID加入俱乐部
     * @param {number | string} user_id
     * @param {number | string} club_id
     */
    joinClubByClubId(req, res) {
        let user_id = parseInt(req.query.user_id)
        let club_id = parseInt(req.query.club_id)
        if (user_id == null || club_id == null) {
            http.send(res, 1, "参数错误")
            return
        }
        async.auto({
            user_info(callback) {
                playerService.isUserExist(user_id, callback);
            },
            club_info(callback) {
                clubServer.getClubInfoByClubId(club_id, callback);
            },
            is_first_join_club(callback) {
                playerService.isFirstJoinClub(user_id, callback);
            }
        }, (err, results) => {
            if (err) {
                console.error(err);
                http.send(res, 1, "内部错误")
                return
            }
            let user_info = results.user_info;
            let club_info = results.club_info;
            let is_first_join_club = results.is_first_join_club;
            if (user_info == null) {
                http.send(res, 1, "用户不存在")
                return
            }
            if (club_info == null) {
                http.send(res, 1, "俱乐部不存在")
                return
            }
            agentService.userJoinClubByClubId(user_id, club_id, club_info.belongs_agent, (err, join_results) => {
                if (err) {
                    console.error(err);
                    return
                }
                if (join_results == null) {
                    http.send(res, 1, "加入俱乐部失败");
                    return;
                }
                if (is_first_join_club != null) {
                    http.send(res, 0, "加入俱乐部成功");
                }
                else {
                    playerService.getParamConfigByPKey("join_club_reward", (err, conf_results) => {
                        if (err) {
                            console.error(err);
                            return
                        }
                        if (conf_results == null) {
                            http.send(res, 1, "加入俱乐部成功,赠送房卡失败，请联系客服");
                            return;
                        }
                        rechargeService.changeUserGoldsAndSaveBankStatement(user_id, conf_results.p_value, 3,
                            "第一次加入俱乐部赠送的房卡", "gems", (err, results) => {
                                if (err || !results) {
                                    console.log(err);
                                    console.error("存储出错");
                                    http.send(res, 1, "内部错误");
                                    return
                                }
                                clubServer.updateUserClub(user_id,club_id,0,function(err,data){
                                    if(err || !data){
                                        return http.send(res, 1, "内部错误");
                                    }
                                })
                                http.send(res, 0, `加入俱乐部成功，赠送您${conf_results.p_value}房卡`);
                            }
                        );
                    })
                }
            })
            

        })
    },
    /**
     * 俱乐部里创建房间
     * @param {number | string} user_id
     * @param {number | string} club_id
     */
    createClubRoom(req, res) {
        //user_id, club_id
        let userId = parseInt(req.query.userId)
        let club_avatar = req.query.club_avatar
        let club_name = req.query.club_name
        let is_private = parseInt(req.query.is_private)
        if (userId == null) {
            http.send(res, 1, "用户ID有误")
            return
        }

        if(!club_name){
            return http.send(res,1,"参数错误")
        }
        async.auto({
            getUserBaseInfo:function(callback){
                playerService.getUserBaseInfo(userId,callback)
            },
            createClub:["getUserBaseInfo",function(result,callback){
                if(!result.getUserBaseInfo.user_type){
                    return http.send(res,1,"你暂无创建俱乐部的权限请联系客服");
                }else{
                    clubServer.createClub(userId,club_avatar,club_name,is_private,callback);
                }

            }],
            createClubUsers:["createClub",function(resut,callback){
                // let s = JSON.parse(resut.createClub)
                console.log("resut.createClub.clubId",resut.createClub.clubId)
                clubServer.createClubUsers(userId,resut.createClub.clubId,2,callback)
            }],
            createUserClub:["createClubUsers",function(result,callback){
                console.log(result)
                clubServer.updateUsers_belongs_club(result.createClub.clubId,userId,callback)
            }]
        },function (err,result) {
            if(err){
                console.log("err",err)
                return http.send(res,1,"服务器异常，请稍后重试")
            }
            if(!result.getUserBaseInfo.user_type){
                return http.send(res,1,"你暂无创建俱乐部的权限请联系客服");
            }else{
                return http.send(res,1,"创建成功");
            }
        }
        )

    },
    /**
     * 
     * 得到用户所有俱乐部 
     * 
     */
    /**
     * 刷新当前俱乐部内创建的所有房间
     * @param {number | string} user_id 用来验证玩家是否属于当前俱乐部
     * @param {number | string} club_id
     */
    refreshClubAllClubRooms(req, res) {
        let user_id = parseInt(req.query.user_id)
        if (user_id == null) {
            http.send(res, 1, "用户ID有误")
            return
        }
        let club_id = parseInt(req.query.club_id)
        if (club_id == null) {
            http.send(res, 1, "俱乐部ID有误")
            return
        }
        isUserExist(res, user_id, (user_results) => {
            if (user_results.belongs_club.indexOf(club_id)==-1 ) {
                http.send(res, 1, "玩家不属于该俱乐部");
                return;
            }
            agentService.getAllPriRoomsInThisClub(club_id, (err, room_infos) => {
                if (err) {
                    console.log(err);
                    return
                }
                for (var value of room_infos) {
                    for (var i = 0; i < 4; i++) {
                        // value["user_icon" + i] = undefined;
                        // value["user_score" + i] = undefined;
                        value["user_name" + i] = crypto.fromBase64(value["user_name" + i]);
                    }
                }
                http.send(res, 0, "ok", room_infos);
            })
        })
    },
    /**
     * 玩家加入俱乐部房间验证
     * @param {number | string} user_id 
     * @param {number | string} room_id 
     */
    enterClubRoom(user_id, room_id) {
        //是否属于当前俱乐部
        //是否是当前房间内的玩家，如果是直接加入（xx）
        //俱乐部房间人数是否满了，或者游戏是否已经开了
        //是否拥有加入俱乐部房间需要的货币道具
    },
    /**
     * 修改俱乐部公告
     * @param {number | string} user_id
     * @param {number | string} club_id
     * @param {string} content
     */
    rewriteClubNotice(req, res) {
        //验证是否时俱乐部创建人，只有创建人才能修改俱乐部公告
        let user_id = req.query.user_id;
        if (user_id == null) {
            http.send(res, 1, "用户ID有误");
            return;
        }
        let club_id = req.query.club_id;
        if (club_id == null) {
            http.send(res, 1, "俱乐部ID有误");
            return;
        }
        let content = req.query.content;
        if (content == null) {
            http.send(res, 1, "输入内容为空");
            return;
        }
        isClubCreator(res, club_id, user_id, (club_results) => {
            agentService.rewriteClubNotice(club_id, content, (err, write_results) => {
                if (err) {
                    console.error(err);
                    return
                }
                if (write_results == null) {
                    http.send(res, 1, "修改失败");
                    return
                }
                http.send(res, 0, "修改成功");
            })
        })
    },
    // /**
    //  * 俱乐部部长赠送俱乐部货币道具
    //  * @param {number | string} user_id 
    //  * @param {number | string} club_id 
    //  * @param {number | string} golds_count 
    //  */
    // giveAwayClubGolds(req, res) {
    //     let user_id = req.query.user_id;
    //     let contributor = req.query.contributor;
    //     if (user_id == null || contributor == null) {
    //         http.send(res, 1, "用户ID有误");
    //         return;
    //     }
    //     let club_id = req.query.club_id;
    //     if (club_id == null) {
    //         http.send(res, 1, "俱乐部ID有误");
    //         return;
    //     }
    //     if (user_id == contributor) {
    //         http.send(res, 1, "不能自己赠送自己房卡");
    //         return;
    //     }
    //     let golds_count = parseInt(req.query.golds_count);
    //     if (golds_count == null || golds_count < 0) {
    //         http.send(res, 1, "赠送数量有误");
    //         return;
    //     }
    //     //验证是否时俱乐部创建人，只有创建人才能赠送俱乐部货币道具
    //     isUserExist(res, user_id, (user_results) => {
    //         isUserExist(res, contributor, (contributor_results) => {
    //             if (contributor_results.gems < golds_count) {
    //                 http.send(res, 1, "房卡数量不足，无法赠送");
    //                 return
    //             }
    //             isClubCreator(res, club_id, contributor, (club_results) => {
    //                 async.auto({
    //                     sender(callback) {
    //                         rechargeService.changeUserGoldsAndSaveBankStatement(contributor, -golds_count, 5, `赠送给${user_id}的房卡`, "gems", callback);
    //                     },
    //                     receiver(callback) {
    //                         rechargeService.changeUserGoldsAndSaveBankStatement(user_id, golds_count, 5, `收到${contributor}赠送的房卡`, "gems", callback);
    //                     }
    //                 }, (err, results) => {
    //                     if (err || !results || !results.sender || !results.receiver) {
    //                         console.log(err);
    //                         console.error("存储出错");
    //                         http.send(res, 1, "内部错误,赠送房卡失败");
    //                         return
    //                     }
    //                     http.send(res, 0, "赠送房卡成功");
    //                 })
    //             })
    //         })
    //     })
    // },
    /**
     * 玩家被公会管理员踢出公会
     * @param {number | string} left_user_id
     * @param {number | string} club_admin_id
     * @param {number | string} club_id
     */
    hadLeftClub(req, res) {
        let left_user_id = req.query.userId;
        if (left_user_id == null) {
            http.send(res, 1, "被踢用户ID有误")
            return
        }
        let club_admin_id = req.query.adminId;
        if (club_admin_id == null) {
            http.send(res, 1, "管理员ID有误")
            return
        }
        if (club_admin_id == left_user_id) {
            http.send(res, 1, "被踢玩家不能和踢出玩家是同一个人")
            return
        }
        let club_id = req.query.clubId;
        if (club_id == null) {
            http.send(res, 1, "俱乐部有误")
            return
        }
        isUserExist(res, left_user_id, (_results) => {
            isClubCreator(res, club_id, club_admin_id, (club_results) => {
                agentService.hadLeftClub(left_user_id, club_id, (err, left_results) => {
                    if (err) {
                        console.error(err);
                        return
                    }
                    if (left_results == null) {
                        http.send(res, 1, "踢出俱乐部玩家失败");
                        return;
                    }
                    clubServer.dleteClubUsers(left_user_id,club_id,function(err,data){
                        if(err || !data){
                            console.error(err);
                            return
                        }
                        http.send(res, 0, "踢出俱乐部玩家成功");
                    })
                    
                })
            })
        })
    },
    /**
     * 查看工会玩家信息，名字，房卡数量，最后登陆时间
     * @param {number | string} club_id
     */
    getAllClubUserInfoByClubId(req, res) {
        let club_id = req.query.clubId;
        if (club_id == null) {
            http.send(res, 1, "俱乐部ID有误")
            return
        }
        agentService.getAllClubUserInfoByClubId(club_id, (err, users_results) => {
            if (err) {
                console.error(err);
                return
            }
            for (const key in users_results) {
                users_results[key].name = crypto.fromBase64(users_results[key].name);
            }
            http.send(res, 0, "ok", { users_info: users_results })
        })
    },
    /**
     * 获取玩家加入的俱乐部id
     * @param {*} req 
     * @param {*} res 
     */
    getClubIdByUserId(req, res) {
        let user_id = req.query.userId;
        if (user_id == null) {
            http.send(res, 1, "用户ID有误")
            return
        }
        isUserExist(res, user_id, (user_results) => {
            let club_id = user_results.belongs_club
            if (club_id == null || club_id.length == 0) {
                http.send(res, 1, "暂未加入俱乐部");
                return;
            }
            http.send(res, 0, "ok", { club_id: club_id });
        })
    },
    /**
     * 通过俱乐部id获取俱乐部信息
     * @param {*} req 
     * @param {*} res 
     */
    getClubInfo(req, res) {
        let club_id = req.query.clubId;
        if (club_id == null) {
            http.send(res, 1, "俱乐部ID有误")
            return
        }
        getClubInfo(res, club_id, (club_results) => {
            // isUserExist(res, club_results.create_user, (user_results) => {
            //     club_results.creator_name = crypto.fromBase64(user_results.name);
            http.send(res, 0, 'ok', { club_info: club_results });
            // })
        })
    },
    /**
    * 获取所有俱乐部信息
    * @param {*} req 
    * @param {*} res 
    */
    getAllCLubInfo(req, res) {
        clubServer.getClubInfoByUserId((err, results) => {
            if (err) {
                console.error(err);
                return
            }
            console.log("results","clubs_info")
            http.send(res, 0, "ok", { clubs_info: results })
        })
    },
    /**
     * 搜索俱乐部
     * @param {string | number} content 
     */
    searchClub(req, res) {
        let content = req.query.content;
        if (content == null || content == "") {
            http.send(res, 1, "输入内容有无")
            return;
        }
        agentService.searchClub(content, (err, club_results) => {
            if (err) {
                console.error(err);
                return;
            }
            http.send(res, 0, 'ok', { club_info: club_results });
        })
    }
}