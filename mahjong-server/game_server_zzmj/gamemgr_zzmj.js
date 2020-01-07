var roomMgr = require("./roommgr");
var userMgr = require("../common/usermgr");
var gameMgr = require("../common/gamemgr");
userMgr.setRoomMgr(roomMgr);
var mjhulib = require("./mjlib_js/api").MHulib;
var redisClient = require("../utils/redis");
var gameService = require('../common/service/gameService')
const MahjongLogic = require('../common/room_game/MahjongLogic')
const MahjongDB = require('../common/room_game/MahjongDB')

var games = {};

var gameSeatsOfUsers = {};

function checkCanHu(game, seatData, targetPai) {
    seatData.canHu = false;
    for (var k in seatData.tingMap) {
        if (targetPai == k) {
            seatData.canHu = true;
            return;
        }
    }
}

function clearAllOptions(game, seatData) {
    var fnClear = function (sd) {
        sd.canPeng = false;
        sd.canGang = false;
        sd.gangPai = [];
        sd.canHu = false;
        sd.canTing = false;
        sd.lastFangGangSeat = -1;
    }
    if (seatData) {
        fnClear(seatData);
    }
    else {
        for (var i = 0; i < game.gameSeats.length; ++i) {
            fnClear(game.gameSeats[i]);
        }
    }
}

// function getSeatIndex(userId) {
//     var seatIndex = roomMgr.getUserSeat(userId);
//     if (seatIndex == null) {
//         return null;
//     }
//     return seatIndex;
// }

// function getGameByUserID(userId) {
//     var roomId = roomMgr.getUserRoom(userId);
//     if (roomId == null) {
//         return null;
//     }
//     var game = games[roomId];
//     return game;
// }

function hasOperations(seatData) {
    if (seatData.canGang || seatData.canPeng || seatData.canHu || seatData.canTing) {
        return true;
    }
    return false;
}

function sendOperations(game, seatData, pai) {
    if (hasOperations(seatData)) {
        if (pai == -1) {
            pai = seatData.holds[seatData.holds.length - 1];
        }

        var data = {
            pai: pai,
            hu: seatData.canHu,
            peng: seatData.canPeng,
            gang: seatData.canGang,
            ting: seatData.canTing,
            gangpai: seatData.gangPai,
            tingMaps: seatData.tingMaps,
        };

        //如果可以有操作，则进行操作
        userMgr.sendMsg(seatData.userId, 'game_action_push', data);
        if (seatData.canTing) {
            seatData.canTing = false;
        }
        data.si = seatData.seatIndex;
    }
    else {
        userMgr.sendMsg(seatData.userId, 'game_action_push');
    }
}

function askHuByOrder(game) {
    if (game == null || game.askordermap == null) {
        return false;
    }
    var chupai = game.chuPai;
    if (game.askordermap.length > 0) {
        var seatIndex = game.askordermap.shift();
        game.gameSeats[seatIndex].canHu = true;
        sendOperations(game, game.gameSeats[seatIndex], chupai);
        return true;
    }
    else {
        //检查是否有人要胡，要碰 要杠
        clearAllOptions(game);
        for (var i = 0; i < game.gameSeats.length; ++i) {
            //玩家自己不检查
            if (game.turn == i) {
                continue;
            }
            var ddd = game.gameSeats[i];
            MahjongLogic.checkCanPeng(game, ddd, chupai);
            MahjongLogic.checkCanDianGang(game, ddd, chupai);

            if (hasOperations(ddd)) {
                sendOperations(game, ddd, chupai);
            }
        }
        return false
    }
}

function moveToNextUser(game, nextSeat) {
    //找到下一个没有和牌的玩家
    game.gameSeats[game.turn].lastFangGangSeat = -1;
    if (nextSeat == null) {
        game.turn++;
        game.turn %= game.roomInfo.conf.player_count;
        return;
    }
    else {
        game.turn = nextSeat;
    }
}

function doUserMoPai(gameParam) {
    gameMgr.goodLuck(gameParam, gameParam.turn, function (err, game) {
        game.chuPai = -1;
        var turnSeat = game.gameSeats[game.turn];
        // turnSeat.lastFangGangSeat = -1;
        turnSeat.guoHuFan = -1;
        var pai = MahjongLogic.moPai(game, game.turn);
        //牌摸完了，结束,流局
        if (pai == -1) {
            doGameOver(game, turnSeat.userId);
            return;
        }
        else {
            var numOfMJ = game.mahjongs.length - game.currentIndex;
            userMgr.broacastInRoom('mj_count_push', numOfMJ, turnSeat.userId, true);
        }

        MahjongDB.recordGameAction(game, game.turn, MahjongLogic.ACTION_MOPAI, pai);

        //通知前端新摸的牌
        userMgr.sendMsg(turnSeat.userId, 'game_mopai_push', pai);
        //检查是否可以暗杠或者胡
        //检查胡，直杠，弯杠

        MahjongLogic.checkCanAnGang(game, turnSeat);

        //摸起来的牌可以杠，才检查弯杠
        if (turnSeat.holds[turnSeat.holds.length - 1] == pai) {
            MahjongLogic.checkCanWanGang(game, turnSeat, pai);
        }
        setTingMaps(turnSeat);
        setTingMap(turnSeat, pai);
        //检查看是否可以和
        checkCanHu(game, turnSeat, pai);

        //广播通知玩家出牌方
        turnSeat.canChuPai = true;
        userMgr.broacastInRoom('game_chupai_push', turnSeat.userId, turnSeat.userId, true);

        //通知玩家做对应操作
        sendOperations(game, turnSeat, game.chuPai);
    });
}

//计算结算分数todo
function calculateResult(game) {
    var conf = game.roomInfo.conf
    var baseScore = conf.baseScore;
    //杠跑=双方下跑+底分
    var gangpao = conf.gangpao
    //七对加倍
    var qiduijiabei = conf.qiduijiabei
    //庄家加底：杠分和胡分再加一个底分
    var zhuangjiajiadi = conf.zhuangjiajiadi
    //杠上花加倍
    var gangshanghuajiabei = conf.gangshanghuajiabei
    //黄庄杠牌不得分。一般规则下：杠牌只扣底分
    //胡分=双方下跑+底分
    //加倍：（底分+双方下跑）*2
    //总分 = 杠分 + 胡分
    for (var i = 0; i < game.gameSeats.length; ++i) {
        //计算杠分
        var gameSeats = game.gameSeats;
        var actions = game.gameSeats[i].actions
        for (var idx in actions) {
            var action = actions[idx];
            var targets = action.targets;
            var gangFen = baseScore;
            if (action.type == "angang") {
                for (var j = 0; j < targets.length; ++j) {
                    //杠跑
                    if (gangpao) {
                        gangFen = gameSeats[i].paofen + gameSeats[targets[j]].paofen
                    }
                    //庄家加底
                    if (zhuangjiajiadi) {
                        if (game.button == i || game.button == targets[j]) {
                            gangFen += baseScore;
                        }
                    }
                    gameSeats[i].gangScore += gangFen;
                    gameSeats[targets[j]].gangScore -= gangFen;
                }
            }
            else if (action.type == "diangang" || action.type == "wangang") {
                //杠跑
                var target = targets[0];
                if (gangpao) {
                    gangFen = gameSeats[i].paofen + gameSeats[target].paofen
                }
                //庄家加底
                if (zhuangjiajiadi) {
                    if (game.button == i || game.button == target) {
                        gangFen += baseScore;
                    }
                }
                gameSeats[i].gangScore += gangFen;
                gameSeats[target].gangScore -= gangFen;
            }
        }

        //计算胡分
        var hu_data = gameSeats[i].hu_data;
        if (hu_data != null) {
            var huFen = 0;//conf.baseScore;
            if (hu_data.iszimo) {
                for (var k = 0; k < gameSeats.length; k++) {
                    if (i != k) {
                        var paofen = 0;
                        var target = k;
                        if (conf.xiapao == 0) {
                            paofen = gameSeats[i].paofen + gameSeats[target].paofen;
                        }

                        gameSeats[i].huScore += paofen + baseScore;
                        gameSeats[target].huScore -= (paofen + baseScore);

                        if (qiduijiabei && gameSeats[i].tingMap[hu_data.pai].pattern == "7pairs") {
                            gameSeats[i].huScore += paofen + baseScore;
                            gameSeats[target].huScore -= (paofen + baseScore);
                        }

                        if (gameSeats[i].tingMap[hu_data.pai].pattern == "4hun") {
                            gameSeats[i].huScore += paofen + baseScore;
                            gameSeats[target].huScore -= (paofen + baseScore);
                        }

                        if (zhuangjiajiadi && (i == game.button || target == game.button)) {
                            gameSeats[i].huScore += baseScore;
                            gameSeats[target].huScore -= baseScore;
                        }

                        if (gangshanghuajiabei && hu_data.isGangHua) {
                            gameSeats[i].huScore += paofen + baseScore;
                            gameSeats[target].huScore -= (paofen + baseScore);
                        }
                    }
                }
            }
            else {
                var paofen = 0;
                var target = hu_data.target;
                if (conf.xiapao == 0) {
                    paofen = gameSeats[i].paofen + gameSeats[target].paofen;
                }

                gameSeats[i].huScore += paofen + baseScore;
                gameSeats[target].huScore -= (paofen + baseScore);

                if (qiduijiabei && gameSeats[i].tingMap[hu_data.pai].pattern == "7pairs") {
                    gameSeats[i].huScore += paofen + baseScore;
                    gameSeats[target].huScore -= (paofen + baseScore);
                }

                if (gameSeats[i].tingMap[hu_data.pai].pattern == "4hun") {
                    gameSeats[i].huScore += paofen + baseScore;
                    gameSeats[target].huScore -= (paofen + baseScore);
                }

                if (zhuangjiajiadi && (i == game.button || target == game.button)) {
                    gameSeats[i].huScore += baseScore;
                    gameSeats[target].huScore -= baseScore;
                }
            }
        }
    }
    for (var i = 0; i < game.gameSeats.length; ++i) {
        if (conf.jinbijiesuan) {
            gameSeats[i].huScore *= conf.coins_bei_shu;
            gameSeats[i].gangScore *= conf.coins_bei_shu;
        }
        gameSeats[i].score = gameSeats[i].huScore + gameSeats[i].gangScore;
    }
}

//forceEnd是否强制结束
async function doGameOver(game, userId, forceEnd) {
    var roomId = roomMgr.getUserRoom(userId);
    if (roomId == null) {
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }

    var results = [];
    var dbresult = [0, 0, 0, 0];

    var fnNoticeResult = function (isEnd) {
        var endinfo = null;
        if (isEnd) {
            endinfo = [];
            for (var i = 0; i < roomInfo.seats.length; ++i) {
                var rs = roomInfo.seats[i];
                endinfo.push({
                    score: rs.score,
                    numHu: rs.numHu,
                    numDianPao: rs.numDianPao,
                    numGang: rs.numGang,
                    numFangGang: rs.numFangGang,
                });
            }
        }

        userMgr.broacastInRoom('game_over_push', {
            results: results,
            endinfo: endinfo,
            duration_time: Math.floor(Date.now() / 1000) - roomInfo.createTime
        }, userId, true);

        //如果局数已够，则进行整体结算，并关闭房间
        if (isEnd) {
            setTimeout(function () {
                if (roomInfo.numOfGames > 1 || game == null) {
                    MahjongDB.storeHistory(roomInfo);
                }
                userMgr.kickAllInRoom(roomId);
                roomMgr.destroy(roomId);
                gameService.archiveGames(roomInfo.uuid, (err, result) => {
                    if (err) {
                        console.log(err);
                    }
                });
                for (var i = 0; i < roomInfo.seats.length; ++i) {
                    var rs = roomInfo.seats[i];
                    gameService.saveGameRecord(rs.userId, rs.name, "zzmj", roomInfo.createTime, rs.score, (err, result) => {
                        if (err) {
                            console.log(err);
                        }
                    })
                }
            }, 1500);
        }
    }

    if (game != null) {

        // 清除缓存
        for (let index = 0; index < game.gameSeats.length; index++) {
            let key = 't_user.' + game.gameSeats[index].userId + '.ctrl_param';
            redisClient.del(key, function (err, reply) {
                if (err) {
                    console.log('redisClient.del err: ', err);
                }

                // console.log('redisClient.del %s reply: %d', key, reply);
            });
        }

        if (!forceEnd) {
            calculateResult(game, roomInfo);
        }

        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var rs = roomInfo.seats[i];
            var sd = game.gameSeats[i];

            rs.ready = false;
            rs.score += forceEnd ? 0 : sd.score;
            rs.numHu += forceEnd ? 0 : sd.numHu;
            rs.numDianPao += forceEnd ? 0 : sd.numDianPao;
            rs.numGang += forceEnd ? 0 : sd.numGang;
            rs.numFangGang += forceEnd ? 0 : sd.numFangGang;

            var userRT = {
                userId: sd.userId,
                pengs: sd.pengs,
                name: sd.name,
                wangangs: sd.wangangs,
                diangangs: sd.diangangs,
                angangs: sd.angangs,
                holds: sd.holds,
                score: forceEnd ? 0 : sd.score,
                huScore: forceEnd ? 0 : sd.huScore,
                gangScore: forceEnd ? 0 : sd.gangScore,
                totalscore: rs.score,
                hu_data: sd.hu_data,
            }

            results.push(userRT);

            dbresult[i] = sd.score;
            delete gameSeatsOfUsers[sd.userId];
        }
        delete games[roomId];

        var old = roomInfo.nextButton;
        if (game.firstHupai >= 0) {
            roomInfo.nextButton = game.firstHupai;
        }
        else {
            roomInfo.nextButton = (game.turn + 1) % roomInfo.conf.player_count;
        }

        if (old != roomInfo.nextButton) {
            gameService.updateNextButton(roomId, roomInfo.nextButton, (err, result) => {
                if (err) {
                    console.log(err);
                }
            });
        }
    }

    if (forceEnd || game == null) {
        fnNoticeResult(true);
        if (roomInfo.numOfGames == 1)
            MahjongDB.returnGemsWhenDisRoom(roomInfo);
    }
    else {
        //保存游戏
        fnNoticeResult(await MahjongDB.storeGameAsync(game, roomId, dbresult, results))
    }
}

//玩家上线，强制设置为TRUE,准备
//socket 107
//游戏准备开始
exports.setReady = function (userId, callback) {
    var roomId = roomMgr.getUserRoom(userId);
    if (roomId == null) {
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }

    roomMgr.setReady(userId, true);
    var game = games[roomId];
    var player_count = roomInfo.conf.player_count

    if (game == null) {
        //modify by nt 

        if (roomInfo.seats.length == player_count) {
            for (var i = 0; i < roomInfo.seats.length; ++i) {
                var s = roomInfo.seats[i];
                if (s.ready == false || userMgr.isOnline(s.userId) == false) {
                    return;
                }
            }
            gameService.setGameStatePlaying(roomId, (err, result) => {
                if (err) {
                    console.log(err);
                    return
                }
                //都准备了
                var game = initGame(roomId);
                userMgr.broacastInRoom('game_num_push', roomInfo.numOfGames, s.userId, true);
                if (roomInfo.conf.xiapao == 0) {
                    game.state = "xiapao";
                    userMgr.broacastInRoom('game_xiapao_begin_push', null, s.userId, true);
                    userMgr.broacastInRoom('game_begin_push', game.button, userId, true);
                }
                else {
                    userMgr.broacastInRoom('game_begin_push', game.button, userId, true);
                    exports.begin(roomId);
                }
            })
        }
    }
    else {
        var numOfMJ = game.mahjongs.length - game.currentIndex;

        var data = {
            state: game.state,
            numofmj: numOfMJ,
            button: game.button,
            turn: game.turn,
            chuPai: game.chuPai,
            hun: game.hun,
        };

        data.seats = [];
        var seatData = null;
        for (var i = 0; i < player_count; ++i) {
            var sd = game.gameSeats[i];

            var s = {
                userid: sd.userId,
                coins: sd.coins,
                folds: sd.folds,
                angangs: sd.angangs,
                angang_targets: sd.angang_targets,
                diangangs: sd.diangangs,
                diangang_targets: sd.diangang_targets,
                wangangs: sd.wangangs,
                wangang_targets: sd.wangang_targets,
                pengs: sd.pengs,
                peng_targets: sd.peng_targets,
                paofen: sd.paofen,
                seatindex: sd.seatIndex,
                ready: sd.game.roomInfo.seats[i].ready,
                name: sd.game.roomInfo.seats[i].name,
                score: sd.game.roomInfo.seats[i].score,
                online: userMgr.isOnline(sd.userId)
            }
            if (sd.userId == userId) {
                s.holds = sd.holds;
                seatData = sd;
            }
            data.seats.push(s);
        }

        //同步整个信息给客户端
        userMgr.sendMsg(userId, 'game_sync_push', data);
        sendOperations(game, seatData, game.chuPai);
    }
}
//下跑todo
exports.xiaPao = function (userId, paofen) {
    paofen = Number.parseInt(paofen);
    var seatData = gameSeatsOfUsers[userId]
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;
    if (game.state != "xiapao") {
        console.log("can't recv xiaPao when game.state == " + game.state);
        return;
    }

    seatData.paofen = paofen;
    var seats = game.gameSeats
    var numOfPao = 0;
    var player_count = game.roomInfo.conf.player_count
    var hunpai = game.roomInfo.conf.hunpai

    for (var key in seats) {
        if (seats[key].paofen >= 0 && seats[key].paofen < 4) {
            numOfPao++;
        }
    }

    //下跑人数齐了
    if (numOfPao == player_count) {
        var arr = new Array(player_count);
        for (var i = 0; i < player_count; ++i) {
            arr[i] = game.gameSeats[i].paofen;
        }
        userMgr.broacastInRoom('game_xiapao_finish_push', arr, seatData.userId, true);
        exports.begin(roomMgr.getUserRoom(userId))
    }
}

initGame = function (roomId) {
    //获取有关房间的信息
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }
    var seats = roomInfo.seats;
    var player_count = roomInfo.conf.player_count;

    var game = {
        // conf: roomInfo.conf,
        roomInfo: roomInfo,
        gameIndex: roomInfo.numOfGames,//当前局数

        button: roomInfo.nextButton,//庄家
        mahjongs: roomInfo.conf.fengpai == 0 ? new Array(136) : new Array(108),//麻将数量(不包括风牌)
        currentIndex: 0,//majongs index
        gameSeats: new Array(player_count),//房间内玩家

        hun: 34,//34方便没有混牌时，查表法不用修改
        turn: 0,
        chuPai: -1,//出的牌
        state: "idle",//当前状态(空闲)
        actionList: [],
        askordermap: [],//用来做轮询的
        liujucount: 0,
    };

    roomInfo.numOfGames++;

    for (var i = 0; i < player_count; ++i) {
        var data = game.gameSeats[i] = {};

        data.game = game;
        // 控制参数
        let gameType = game.roomInfo.conf.type;
        data.ctrl_param = gameMgr.getCtrlParam(seats[i].ctrl_param, gameType);
        //椅子号
        data.seatIndex = i;
        data.coins = seats[i].coins;
        data.userId = seats[i].userId;
        data.name = seats[i].name
        //持有的牌
        data.holds = [];
        //打出的牌
        data.folds = [];
        //暗杠的牌
        data.angangs = [];
        data.angang_targets = [];
        //点杠的牌
        data.diangangs = [];
        data.diangang_targets = [];
        //弯杠的牌
        data.wangangs = [];
        data.wangang_targets = [];
        //碰了的牌
        data.pengs = [];
        data.peng_targets = [];
        //跑分
        data.paofen = -1;
        //玩家手上的牌的数目，用于快速判定碰杠
        data.countMap = [];
        for (var j = 0; j < 34; ++j) {
            data.countMap[j] = 0;
        }
        data.canTing = false;
        data.tingMaps = {};
        //玩家听牌，用于快速判定胡了的番数
        data.tingMap = {};

        //是否可以杠
        data.canGang = false;
        //用于记录玩家可以杠的牌
        data.gangPai = [];

        //是否可以碰
        data.canPeng = false;
        //是否可以胡
        data.canHu = false;
        //是否可以出牌
        data.canChuPai = false;

        //如果guoHuFan >=0 表示处于过胡状态，
        //如果过胡状态，那么只能胡大于过胡番数的牌
        data.guoHuFan = -1;

        data.actions = [];

        data.fan = 0;
        data.huScore = 0;
        data.gangScore = 0;
        data.score = 0;

        data.lastFangGangSeat = -1;

        //统计信息
        data.numHu = 0;
        data.numDianPao = 0;
        data.numGang = 0;
        data.numFangGang = 0;
        data.hu_data = null;
        gameSeatsOfUsers[data.userId] = data;
    }
    games[roomId] = game;
    return game;
}

//开始新的一局
exports.begin = function (roomId) {

    var game = games[roomId];
    if (game == null) {
        return;
    }

    MahjongLogic.shuffle(game.mahjongs, game.roomInfo.conf.fengpai == 0)
    // game.mahjongs = [
    //     1, 5, 9, 13,
    //     1, 5, 9, 13,
    //     1, 5, 9, 13,
    //     1, 6, 9, 13,
    //     2, 6, 10, 14,
    //     2, 6, 10, 14,
    //     2, 2, 10, 14,
    //     3, 7, 11, 15,
    //     3, 7, 11, 15,
    //     3, 7, 11, 15,
    //     4, 8, 12, 16,
    //     4, 8, 12, 16,
    //     4, 8, 12, 16,
    //     5, 2, 2, 2, 10, 11, 12, 6, 14, 7, 15, 8, 16, 0, 0,
    //     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // ]

    MahjongLogic.deal(game)
    var hunpai = game.roomInfo.conf.hunpai
    var numOfMJ = game.mahjongs.length - game.currentIndex;
    var seats = game.gameSeats;
    for (var i = 0; i < seats.length; ++i) {
        //开局时，通知前端必要的数据
        var s = seats[i];
        if (hunpai == 0) {
            //通知混牌信息
            MahjongLogic.genHun(game)
            userMgr.sendMsg(s.userId, 'game_hunpai_push', game.hun);
        }
        //通知玩家手牌
        userMgr.sendMsg(s.userId, 'game_holds_push', game.gameSeats[i].holds);
        //通知还剩多少张牌
        userMgr.sendMsg(s.userId, 'mj_count_push', numOfMJ);
        userMgr.sendMsg(s.userId, 'game_playing_push', null);
    }
    MahjongDB.constructGameBaseInfo(game);

    //进行听牌检查
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var gs = game.gameSeats[i];
        if (hunpai == 0) {
            MahjongDB.recordGameAction(game, i, MahjongLogic.ACTION_HUN, game.hun);
        }
        if (gs.holds.length == 14) {
            setTingMaps(gs);
            setTingMap(gs, gs.holds[13])
        }
        else {
            setTingMaps(gs, 1)
            setTingMap(gs, 1)
            gs.canTing = false;
        }
    }

    var turnSeat = game.gameSeats[game.turn];
    game.state = "playing";
    //通知玩家出牌方
    turnSeat.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push', turnSeat.userId, turnSeat.userId, true);
    //检查是否可以暗杠或者胡
    //直杠
    MahjongLogic.checkCanAnGang(game, turnSeat);
    //检查胡 用最后一张来检查
    checkCanHu(game, turnSeat, turnSeat.holds[turnSeat.holds.length - 1]);
    //通知前端
    sendOperations(game, turnSeat, game.chuPai);
};

exports.chuPai = function (userId, pai) {

    pai = Number.parseInt(pai);
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;
    var seatIndex = seatData.seatIndex;
    //如果不该他出，则忽略
    if (game.turn != seatData.seatIndex) {
        console.log("not your turn.");
        return;
    }

    if (seatData.canChuPai == false) {
        console.log('no need chupai.');
        return;
    }

    if (hasOperations(seatData)) {
        console.log('plz guo before you chupai.');
        return;
    }

    //从此人牌中扣除
    var index = seatData.holds.indexOf(pai);
    if (index == -1) {
        console.log("holds:" + seatData.holds);
        console.log("can't find mj." + pai);
        return;
    }

    seatData.canChuPai = false;
    // seatData.guoHuFan = -1;

    seatData.holds.splice(index, 1);
    seatData.countMap[pai]--;
    game.chuPai = pai;
    MahjongDB.recordGameAction(game, seatData.seatIndex, MahjongLogic.ACTION_CHUPAI, pai);
    setTingMap(seatData, pai);
    userMgr.broacastInRoom('game_chupai_notify_push', { user_id: seatData.userId, pai: pai }, seatData.userId, true);
    //点炮胡
    if (game.roomInfo.conf.hupai == 0) {
        //如果出的牌可以胡，则算过胡
        if (seatData.tingMap[game.chuPai] != null) {
            seatData.guoHuFan = seatData.tingMap[game.chuPai].fan;
        }
        checkAskOrderMap(game, pai, seatData)
        //如果要轮询胡牌操作，就return
        //can ask when at least 2 people
        if (game.askordermap.length > 1) {
            askHuByOrder(game);
            return;
        }
    }

    //检查是否有人要胡，要碰 要杠
    var hasActions = false;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        //玩家自己不检查
        if (game.turn == i) {
            continue;
        }
        var ddd = game.gameSeats[i];
        MahjongLogic.checkCanPeng(game, ddd, pai);
        MahjongLogic.checkCanDianGang(game, ddd, pai);
        if (game.roomInfo.conf.hupai == 0) {
            checkCanHu(game, ddd, pai);
        }
        if (seatData.lastFangGangSeat == -1) {
            if (ddd.canHu && ddd.guoHuFan >= 0 && ddd.tingMap[pai].fan <= ddd.guoHuFan) {
                console.log("ddd.guoHuFan:" + ddd.guoHuFan);
                ddd.canHu = false;
                userMgr.sendMsg(ddd.userId, 'guohu_push');
            }
        }

        if (hasOperations(ddd)) {
            sendOperations(game, ddd, game.chuPai);
            hasActions = true;
        }
    }

    //如果没有人有操作，则向下一家发牌，并通知他出牌
    if (!hasActions) {
        setTimeout(function () {
            userMgr.broacastInRoom('guo_notify_push', {
                user_id: seatData.userId,
                pai: game.chuPai
            }, seatData.userId, true);
            seatData.folds.push(game.chuPai);
            game.chuPai = -1;
            moveToNextUser(game);
            doUserMoPai(game);
        }, 150);
    }
};

exports.peng = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;

    //如果是他出的牌，则忽略
    if (game.turn == seatData.seatIndex) {
        console.log("it's your turn.");
        return;
    }

    //如果没有碰的机会，则不能再碰
    if (seatData.canPeng == false) {
        console.log("seatData.peng == false");
        return;
    }

    //如果有人可以胡牌，则需要等待
    let seat_index = game.turn;
    var player_count = game.roomInfo.conf.player_count
    while (true) {
        seat_index = (seat_index + 1) % player_count;
        if (seat_index == game.turn) {
            break;
        }
        else {
            var ddd = game.gameSeats[seat_index];
            if (ddd.canHu && seat_index != seatData.seatIndex) {
                return;
            }
        }
    }


    clearAllOptions(game);

    //验证手上的牌的数目
    var pai = game.chuPai;
    var c = seatData.countMap[pai];
    if (c == null || c < 2) {
        console.log("pai:" + pai + ",count:" + c);
        console.log(seatData.holds);
        console.log("lack of mj.");
        return;
    }

    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for (var i = 0; i < 2; ++i) {
        var index = seatData.holds.indexOf(pai);
        if (index == -1) {
            console.log("can't find mj.");
            return;
        }
        seatData.holds.splice(index, 1);
        seatData.countMap[pai]--;
    }
    seatData.pengs.push(pai);
    seatData.peng_targets.push(game.turn);
    game.chuPai = -1;

    MahjongDB.recordGameAction(game, seatData.seatIndex, MahjongLogic.ACTION_PENG, pai);

    //广播通知其它玩家
    userMgr.broacastInRoom('peng_notify_push', {
        user_id: seatData.userId,
        pai: pai,
        target: game.turn
    }, seatData.userId, true);

    setTingMaps(seatData);
    sendOperations(game, seatData, -1);
    //碰的玩家打牌
    moveToNextUser(game, seatData.seatIndex);

    //广播通知玩家出牌方
    seatData.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push', seatData.userId, seatData.userId, true);
};

exports.isPlaying = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        return false;
    }

    var game = seatData.game;

    if (game.state == "idle") {
        return false;
    }
    return true;
}

function doGang(game, turnSeat, seatData, gangtype, numOfCnt, pai) {
    var seatIndex = seatData.seatIndex;
    var gameTurn = turnSeat.seatIndex;
    var gang_target = gameTurn;

    if (gangtype == "wangang") {
        var idx = seatData.pengs.indexOf(pai);
        if (idx >= 0) {
            seatData.pengs.splice(idx, 1);
            gang_target = seatData.peng_targets[idx];
            seatData.peng_targets.splice(idx, 1);
        }
    }
    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for (var i = 0; i < numOfCnt; ++i) {
        var index = seatData.holds.indexOf(pai);
        if (index == -1) {
            console.log(seatData.holds);
            console.log("can't find mj.");
            return;
        }
        seatData.holds.splice(index, 1);
        seatData.countMap[pai]--;
    }

    MahjongDB.recordGameAction(game, seatData.seatIndex, MahjongLogic.ACTION_GANG, pai);

    seatData.numGang += 1;
    //记录下玩家的杠牌
    if (gangtype == "angang") {
        seatData.angangs.push(pai);
        seatData.angang_targets.push(gang_target)
        var ac = MahjongLogic.recordUserAction(game, seatData, "angang");
    }
    else if (gangtype == "diangang") {
        turnSeat.numFangGang += 1;
        seatData.diangangs.push(pai);
        seatData.diangang_targets.push(gang_target)
        var ac = MahjongLogic.recordUserAction(game, seatData, "diangang", gameTurn);
    }
    else if (gangtype == "wangang") {
        game.gameSeats[gang_target].numFangGang += 1;
        seatData.wangangs.push(pai);
        seatData.wangang_targets.push(gang_target)
        var ac = MahjongLogic.recordUserAction(game, seatData, "wangang", gang_target);
    }

    //通知其他玩家，有人杠了牌
    userMgr.broacastInRoom('gang_notify_push', {
        user_id: seatData.userId,
        pai: pai,
        gangtype: gangtype,
        target: gang_target
    }, seatData.userId, true);

    //变成自己的轮子
    moveToNextUser(game, seatIndex);
    //再次摸牌
    doUserMoPai(game);

    //只能放在这里。因为过手就会清除杠牌标记
    seatData.lastFangGangSeat = gameTurn;
}

exports.gang = function (userId, pai) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果没有杠的机会，则不能再杠
    if (seatData.canGang == false) {
        console.log("seatData.gang == false");
        return;
    }

    var numOfCnt = seatData.countMap[pai];

    if (seatData.gangPai.indexOf(pai) == -1) {
        console.log("the given pai can't be ganged.");
        return;
    }

    //如果有人可以胡牌，则需要等待
    let seat_index = game.turn;
    var player_count = game.roomInfo.conf.player_count
    while (true) {
        seat_index = (seat_index + 1) % player_count;
        if (seat_index == game.turn) {
            break;
        }
        else {
            let ddd = game.gameSeats[seat_index];
            if (ddd.canHu && seat_index != seatData.seatIndex) {
                return;
            }
        }
    }

    var gangtype = ""
    //弯杠 去掉碰牌
    if (numOfCnt == 1) {
        gangtype = "wangang"
    }
    else if (numOfCnt == 3) {
        gangtype = "diangang"
    }
    else if (numOfCnt == 4) {
        gangtype = "angang";
    }
    else {
        console.log("invalid pai count.");
        return;
    }
    //弯杠抢胡
    if (gangtype == "wangang") {
        //点炮胡
        if (game.roomInfo.conf.hupai == 0) {
            //如果出的牌可以胡，则算过胡
            if (seatData.tingMap[game.chuPai]) {
                seatData.guoHuFan = seatData.tingMap[game.chuPai].fan;
            }
            checkAskOrderMap(game, pai, seatData)
            //如果要轮询胡牌操作，就return
            //can ask when at least 2 people
            if (game.askordermap.length > 1) {
                askHuByOrder(game);
                return;
            }
        }
    }

    game.chuPai = -1;
    clearAllOptions(game);
    seatData.canChuPai = false;

    userMgr.broacastInRoom('hangang_notify_push', seatIndex, seatData.userId, true);

    var turnSeat = game.gameSeats[game.turn];
    doGang(game, turnSeat, seatData, gangtype, numOfCnt, pai);
};

exports.hu = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果他不能和牌，那和个啥啊
    if (seatData.canHu == false) {
        console.log("invalid request.");
        return;
    }

    var hupai = game.chuPai;
    var isZimo = false;

    var turnSeat = game.gameSeats[game.turn];

    var hu_data = {
        pai: -1,
        isGangHua: false,
        iszimo: false,
        target: -1,
        target_id: -1,
    };

    game.firstHupai = seatIndex;
    seatData.hu_data = hu_data;

    // hu_data.isGangHua = turnSeat.lastFangGangSeat == seatIndex;
    hu_data.isGangHua = (turnSeat.lastFangGangSeat != -1);
    var notify = -1;
    if (game.chuPai == -1) {
        hupai = seatData.holds[seatData.holds.length - 1];
        seatData.numHu++;
        // seatData.countMap[hupai]--;
        notify = -1;
        hu_data.pai = hupai;
        hu_data.iszimo = true;

        MahjongDB.recordGameAction(game, seatIndex, MahjongLogic.ACTION_ZIMO, hupai);
    }
    else {

        //将牌添加到玩家的手牌列表，供前端显示
        seatData.holds.push(hupai);
        seatData.countMap[hupai]++;
        seatData.numHu++;
        turnSeat.numDianPao++;
        notify = game.chuPai;
        hu_data.pai = hupai;

        hu_data.iszimo = false;
        hu_data.target = game.turn;
        hu_data.target_id = turnSeat.userId;

        MahjongDB.recordGameAction(game, seatIndex, MahjongLogic.ACTION_HU, hupai);
    }

    clearAllOptions(game, seatData);

    //通知前端，有人和牌了
    userMgr.broacastInRoom('hu_push', {
        seatindex: seatIndex,
        iszimo: hu_data.iszimo,
        hupai: notify
    }, seatData.userId, true);

    doGameOver(game, seatData.userId);
};

exports.guo = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果玩家没有对应的操作，则也认为是非法消息
    if ((seatData.canGang || seatData.canPeng || seatData.canHu) == false) {
        console.log("no need guo.");
        return;
    }

    //如果是玩家自己的轮子，不是接牌，则不需要额外操作
    var doNothing = game.chuPai == -1 && game.turn == seatIndex;

    userMgr.sendMsg(seatData.userId, "guo_result");

    //这里还要处理过胡的情况
    if (game.chuPai >= 0 && seatData.canHu) {
        seatData.guoHuFan = seatData.tingMap[game.chuPai].fan;
    }

    //if when ask hu by order , return
    if (askHuByOrder(game)) {
        return;
    }

    clearAllOptions(game, seatData);

    if (doNothing) {
        return;
    }

    //如果还有人可以操作，则等待
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ddd = game.gameSeats[i];
        if (hasOperations(ddd)) {
            return;
        }
    }

    //如果是已打出的牌，则需要通知。
    if (game.chuPai >= 0) {
        var uid = game.gameSeats[game.turn].userId;
        userMgr.broacastInRoom('guo_notify_push', { user_id: uid, pai: game.chuPai }, seatData.userId, true);
        seatData.folds.push(game.chuPai);
        game.chuPai = -1;
    }


    //清除所有的操作
    clearAllOptions(game);
    //下家摸牌
    moveToNextUser(game);
    doUserMoPai(game);
};

exports.hasBegan = function (roomId) {
    var game = games[roomId];
    if (game != null) {
        return true;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo != null) {
        return roomInfo.numOfGames > 0;
    }
    return false;
};


var dissolvingList = [];

exports.doDissolve = function (roomId) {
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return null;
    }
    delete roomInfo.dr;
    var game = games[roomId];
    doGameOver(game, roomInfo.seats[0].userId, true);
};

exports.dissolveRequest = function (roomId, userId) {
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return null;
    }

    if (roomInfo.dr != null) {
        return null;
    }

    var seatIndex = roomMgr.getUserSeat(userId);
    if (seatIndex == null) {
        return null;
    }

    roomInfo.dr = {
        endTime: Date.now() + 60000,
        states: [false, false, false, false]
    };
    roomInfo.dr.states[seatIndex] = true;

    dissolvingList.push(roomId);

    return roomInfo;
};

exports.dissolveAgree = function (roomId, userId, agree) {
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return null;
    }

    if (roomInfo.dr == null) {
        return null;
    }

    var seatIndex = roomMgr.getUserSeat(userId);
    if (seatIndex == null) {
        return null;
    }

    if (agree) {
        roomInfo.dr.states[seatIndex] = true;
    }
    else {
        roomInfo.dr = null;
        var idx = dissolvingList.indexOf(roomId);
        if (idx != -1) {
            dissolvingList.splice(idx, 1);
        }
    }
    return roomInfo;
};

function update() {
    for (var i = dissolvingList.length - 1; i >= 0; --i) {
        var roomId = dissolvingList[i];

        var roomInfo = roomMgr.getRoom(roomId);
        if (roomInfo != null && roomInfo.dr != null) {
            if (Date.now() > roomInfo.dr.endTime) {
                console.log("delete room and games");
                exports.doDissolve(roomId);
                dissolvingList.splice(i, 1);
            }
        }
        else {
            dissolvingList.splice(i, 1);
        }
    }
}

function checkHuPai(seatData, count_map) {
    const hun = seatData.game.hun;
    let map = count_map.concat();
    const count = MahjongLogic.calMapCount(map);
    //7对
    let is_7dui = true
    if (count == 14) {
        for (const pai_count of map) {
            if (pai_count % 2 != 0) {
                is_7dui = false;
                break;
            }
        }
    }
    else {
        is_7dui = false;
    }
    return is_7dui || mjhulib.get_hu_info(map, null, hun) || map[hun] == 4
}

//出牌且听牌后检查能胡那些牌
function setTingMap(seatData, pai) {
    //是否已经听牌了
    seatData.tingMap = {};
    if (seatData.tingMaps[pai] != null) {
        seatData.tingMap = seatData.tingMaps[pai];
    }
    else {
        seatData.tingMap = {};
    }
}

//摸牌时检查能否听牌
function setTingMaps(seatData, pai) {
    //是否已经听牌了
    seatData.tingMaps = {};
    var count_map = seatData.countMap.concat();
    if (pai != null && (-1 < pai && pai < 34)) {
        ++count_map[pai];
    }

    for (var i = 0; i < 34; ++i) {
        if (count_map[i] > 0) {
            --count_map[i];
            for (var j = 0; j < 34; ++j) {
                ++count_map[j];
                if (checkHuPai(seatData, count_map)) {
                    if (seatData.tingMaps[i] == null) {
                        seatData.tingMaps[i] = {};
                        seatData.canTing = true;
                    }
                    seatData.tingMaps[i][j] = {
                        fan: 0,
                        pattern: calPattern(count_map, seatData.game.hun),
                        count: MahjongLogic.getMJLeftCount(seatData, j),
                    };
                }
                --count_map[j];
            }
            ++count_map[i]
        }
    }
}

function calPattern(count_map, hun) {
    let map = count_map;
    const count = MahjongLogic.calMapCount(map);
    if (count_map[hun] && count_map[hun] == 4) {
        return "4hun"
    }
    let is_7dui = true
    if (count == 14) {
        for (const pai_count of map) {
            if (pai_count % 2 != 0) {
                is_7dui = false;
                break;
            }
        }
    }
    else {
        is_7dui = false;
    }
    if (is_7dui == true) {
        return "7pairs"
    }
    return "pinghu"
}

function checkAskOrderMap(game, pai, seatData) {
    //添加轮询操作，多人胡牌时，按座位顺序发送
    game.askordermap = [];
    var player_count = game.roomInfo.conf.player_count
    for (var i = game.turn + 1; i < game.gameSeats.length + game.turn; ++i) {
        const idx = i % player_count
        if (idx == game.turn) {
            continue;
        }
        var gameSeat = game.gameSeats[idx];
        checkCanHu(game, gameSeat, pai);
        if (seatData.lastFangGangSeat == -1) {
            if (gameSeat.canHu && gameSeat.guoHuFan >= 0 && gameSeat.tingMap[pai].fan <= gameSeat.guoHuFan) {
                console.log("gameSeat.guoHuFan:" + gameSeat.guoHuFan);
                gameSeat.canHu = false;
                userMgr.sendMsg(gameSeat.userId, 'guohu_push');
            }
        }
        if (gameSeat.canHu == true) {
            game.askordermap.push(idx);
            gameSeat.canHu = false;
        }
        ;
    }
}

setInterval(update, 1000);

exports.updateUserCoins = function (user_id, coins) {
    var seatData = gameSeatsOfUsers[user_id];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }
    seatData.coins += coins;
}