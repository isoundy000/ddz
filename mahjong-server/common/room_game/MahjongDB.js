/**
 * 房间场game_mgr提取的有关数据库的公共部分
 * author：nt
 * data：2018.06.27
 */

// const UserMgr = require('../usermgr');
// const GameMgr = require('../gamemgr');
const playerService = require('../service/playerService');
const gameService = require('../service/gameService');
const rechargeService = require('../service/rechargeService');
const crypto = require('../../utils/crypto')
const uTime = require('../../utils/uTime');
const GameType = {
    xlch: '血流成河',
    xzdd: '血战到底',
    zzmj: '郑州麻将',
    hjmj: '获嘉麻将',
    tdhmj: '推倒胡麻将',
    hzlmj: '红中赖子麻将',
    hxmj: '滑县麻将',
}
module.exports = {
    GameType: GameType,
    /**
     * 记录玩家游戏步骤
     * @param {*} game 
     * @param {*} si 
     * @param {*} action 
     * @param {*} pai 
     */
    recordGameAction(game, si, action, pai) {
        game.actionList.push(si);
        game.actionList.push(action);
        if (pai != null) {
            game.actionList.push(pai);
        }
    },
    /**
     * 游戏第一局结束前解散房间t退还代理的房卡
     * @param {*} roomInfo 
     */
    returnGemsWhenDisRoom(roomInfo) {
        //不是AA才退
        if (roomInfo.conf.is_daikai == true && roomInfo.conf.cost_type != 1) {
            var cost = roomInfo.conf.cost
            rechargeService.changeUserGoldsAndSaveConsumeRecord(roomInfo.conf.creator, cost, roomInfo.conf.type,
                "gems", `[${GameType[roomInfo.conf.type]}]房间号[${roomInfo.id}]第一局结束前解散房间退还的房卡"`, (err, res) => {
                    if (err || !res) {
                        console.log(err);
                        console.error("存储出错");
                    }
                }
            );
        }
    },
    /**
     * 保存单局游戏记录
     * @param {*} userId 
     * @param {*} history 
     */
    storeSingleHistory(userId, history) {
        playerService.getUserHistory(userId, (err, result) => {
            if (err) {
                console.log(err);
                return
            }
            if (result == null || result == "") {
                result = [];
            }
            else {
                result = JSON.parse(result)
            }
            while (result.length >= 10) {
                result.shift();
            }
            result.push(history);
            playerService.updateUserHistory(userId, result, (err, res) => {
                console.log("存储战绩结果:" + JSON.stringify(err))
            });
        });
    },
    /**
     * 保存游戏记录
     * @param {*} roomInfo 
     */
    storeHistory(roomInfo) {
        var seats = roomInfo.seats;
        var history = {
            uuid: roomInfo.uuid,
            id: roomInfo.id,
            time: roomInfo.createTime,
            conf: roomInfo.conf,
            seats: new Array(roomInfo.conf.player_count)
        };

        for (var i = 0; i < seats.length; ++i) {
            var rs = seats[i];
            var hs = history.seats[i] = {};
            hs.userid = rs.userId;
            hs.name = crypto.toBase64(rs.name);
            hs.score = rs.score;
        }
        for (var i = 0; i < seats.length; ++i) {
            var s = seats[i];
            this.storeSingleHistory(s.userId, history);
        }
    },
    /**
     * 保存游戏基本信息
     * @param {*} game 
     */
    constructGameBaseInfo(game) {
        const conf = game.roomInfo.conf
        const player_count = conf.player_count
        var baseInfo = {
            conf: conf,
            type: conf.type,
            button: game.button,
            index: game.gameIndex,
            mahjongs: game.mahjongs,
            game_seats: new Array(player_count),
            coins: new Array(player_count),
        }
        if (conf.hunpai == 0) {
            baseInfo.hun = game.hun;
        }
        for (var i = 0; i < player_count; ++i) {
            baseInfo.game_seats[i] = game.gameSeats[i].holds;
            baseInfo.coins[i] = game.gameSeats[i].coins;
        }
        game.baseInfoJson = JSON.stringify(baseInfo);
    },
    /**
     *  保存游戏
     * @param {*} game 
     * @param {*} roomId 
     * @param {*} dbresult 
     * @param {*} result_detail 
     */
    async storeGameAsync(game, roomId, dbresult, result_detail) {
        return new Promise(async (resolve, reject) => {
            try {
                let roomInfo = game.roomInfo;
                let games = {
                    room_uuid: roomInfo.uuid,
                    game_index: game.gameIndex,
                    base_info: game.baseInfoJson,
                    create_time: uTime.now(),
                    action_records: JSON.stringify(game.actionList),
                    result: JSON.stringify(dbresult),
                    result_detail: JSON.stringify(result_detail),
                }
                await gameService.createGameAsync(games)
                //保存游戏局数
                gameService.updateNumOfTurnsAsync(roomId, roomInfo.numOfGames);
                //保存用户分数
                let scores = {}
                for (var key in game.gameSeats) {
                    scores['user_score' + key] = game.gameSeats[key].score;
                }
                gameService.updateUserScoreAsync(roomId, scores);
                //如果是第一次，则扣除房卡
                var cost = roomInfo.conf.cost;
                var conf = roomInfo.conf;
                if (roomInfo.numOfGames == 1 && (!conf.is_daikai || (conf.is_daikai && conf.cost_type == 1))) {
                    if ((conf.cost_type == 0 || conf.cost_type == null) && conf.creator == game.gameSeats[0].userId) {
                        rechargeService.changeUserGoldsAndSaveConsumeRecordAsync(
                            conf.creator, -cost, conf.type, "gems",
                            `[${GameType[conf.type]}]房间号[${roomInfo.id}]第一局结束房主扣除的房卡`
                        );
                    }
                    //AA支付
                    else if (conf.cost_type == 1) {
                        for (var i = 0; i < roomInfo.seats.length; ++i) {
                            rechargeService.changeUserGoldsAndSaveConsumeRecordAsync(
                                game.gameSeats[i].userId, -cost / roomInfo.seats.length, conf.type,
                                "gems", `[${GameType[conf.type]}]房间号[${roomInfo.id}]第一局结束AA扣除的房卡`
                            );
                        }
                    }
                }
                if (conf.jinbijiesuan) {
                    for (var i = 0; i < roomInfo.seats.length; ++i) {
                        let rs = roomInfo.seats[i];
                        rs.coins += dbresult[i];
                        if (dbresult[i] != 0) {
                            rechargeService.changeUserGoldsAndSaveConsumeRecordAsync(
                                rs.userId, dbresult[i], conf.type, "coins",
                                `[${GameType[conf.type]}]房间号[${roomInfo.id}]输或赢的金币`
                            );
                        }
                    }
                }
                console.log(`结算时roomInfo局数：${roomInfo.numOfGames},gameIndex:${game.gameIndex},最大局数：${conf.maxGames}`)
                resolve(roomInfo.numOfGames >= conf.maxGames);
            } catch (error) {
                console.error(error);
            }
        })
    },
    /**
     * 存储房间场游戏结算信息
     * @param {*} room_uuid 
     * @param {*} game_index 
     * @param {*} results 
     */
    async storeGameResult(room_uuid, game_index, results) {
        try {
            await gameService.storeGameResultAsync(room_uuid, game_index, JSON.stringify(results));
        } catch (error) {
            console.error(error);
        }
    }
}