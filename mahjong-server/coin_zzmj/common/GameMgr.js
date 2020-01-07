var RoomMgr = require('../../common/coin_game/RoomMgr');
var UserMgr = require("../../common/usermgr");
var GameMgr = require("../../common/gamemgr");
var mjhulib = require("./mjlib_js/api").MHulib;
var playerService = require('../../common/service/playerService')
var gameService = require('../../common/service/gameService')
var rechargeService = require('../../common/service/rechargeService')
const Notice = require('../../common/coin_game/Notice').ID

var commonService = require('../../common/service/commonService');

var HallSocket = null;
exports.setHallSocket = function (hall_socket) {
    HallSocket = hall_socket;
}

var games = {};

var ACTION_CHUPAI = 1;  //出牌
var ACTION_MOPAI = 2;   //摸牌
var ACTION_PENG = 3;    //碰
var ACTION_GANG = 4;    //杠
var ACTION_HU = 5;      //胡
var ACTION_ZIMO = 6;    //自摸

var gameSeatsOfUsers = {};

//洗牌
function shuffle(game) {

    var mahjongs = game.mahjongs;
    //-----------------------------------------------
    // game.mahjongs = [
    //     1, 1, 1, 1,
    //     2, 2, 2, 2,
    //     3, 3, 3, 3,
    //     4, 4, 4, 4,
    //     5, 5, 5, 5,
    //     6, 6, 6, 6,
    //     7, 7, 7, 7,
    //     8, 8, 8, 8,
    //     9, 9, 9, 9,
    //     10, 10, 10, 10,
    //     11, 11, 11, 11,
    //     12, 12, 12, 12,
    //     12, 12, 12, 12,
    //     19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //     0, 0, 0, 0, 0, 0, 0, 0, 30, 0, 0,
    //     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // ]
    // return
    //--------------------------------------------
    // 筒 (0 ~ 8 表示筒子
    var index = 0;
    for (var i = 0; i < 9; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }

    //条 9 ~ 17表示条子
    for (var i = 9; i < 18; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }

    //万
    //条 18 ~ 26表示万
    for (var i = 18; i < 27; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }
    //feng
    //27,28,29,30,31,32,33
    //东 南  西 北 中 发 白
    if (RoomMgr.conf.fengpai == 0) {
        for (var i = 27; i < 34; ++i) {
            for (var c = 0; c < 4; ++c) {
                mahjongs[index] = i;
                index++;
            }
        }
    }

    for (var i = 0; i < mahjongs.length; ++i) {
        var lastIndex = mahjongs.length - 1 - i;
        var index = Math.floor(Math.random() * lastIndex);
        var t = mahjongs[index];
        mahjongs[index] = mahjongs[lastIndex];
        mahjongs[lastIndex] = t;
    }
}

function mopai(game, seatIndex) {
    if (game.currentIndex == game.mahjongs.length - 15) {
        return -1;
    }
    var data = game.gameSeats[seatIndex];
    var mahjongs = data.holds;

    // 给机器人好牌的概率，如果不为0，则进行干涉
    // 跳过发牌阶段
    var luckDegree = RoomMgr.getDifficultyDegree(game.gameSeats[seatIndex].userId);
    console.log("luckDegree:" + luckDegree);
    if (luckDegree != 0 && (mahjongs.length + 3 * (data.pengs.length) + 4 * (data.angangs.length + data.wangangs.length + data.diangangs.length)) > 12) {
        GameMgr.mopaiByLuckDegree(game, seatIndex, luckDegree);
    }

    var pai = game.mahjongs[game.currentIndex];
    mahjongs.push(pai);

    //统计牌的数目 ，用于查表法
    data.countMap[pai]++;
    game.currentIndex++;
    return pai;
}
//发牌
function deal(game) {
    //强制清0
    game.currentIndex = 0;

    //每人13张 一共 13*4 ＝ 52张 庄家多一张 53张
    var seatIndex = game.button;
    var player_count = RoomMgr.conf.player_count
    for (var i = 0; i < 13 * player_count; ++i) {
        var mahjongs = game.gameSeats[seatIndex].holds;
        if (mahjongs == null) {
            mahjongs = [];
            game.gameSeats[seatIndex].holds = mahjongs;
        }
        mopai(game, seatIndex);
        seatIndex++;
        seatIndex %= player_count;
    }

    //庄家多摸最后一张
    mopai(game, game.button);
    //当前轮设置为庄家
    game.turn = game.button;
}
//生成混牌
function gen_hun(game) {
    // var mj = game.mahjongs[54]
    // game.mahjongs[55] = mj
    // game.mahjongs[56] = mj
    // game.mahjongs[57] = mj
    // game.hun = mj
    // return
    var mj = game.mahjongs[game.mahjongs.length - 14]
    var hun = mj + 1;
    if (mj == 8) {//9筒
        hun = 0;
    }
    else if (mj == 17) {//9条
        hun = 9;
    }
    else if (mj == 26) {//9万
        hun = 18;
    }
    else if (mj == 33) {//白
        hun = 27;
    }
    game.hun = hun;
}

//检查是否可以碰
function checkCanPeng(game, seatData, targetPai) {
    var count = seatData.countMap[targetPai];
    if (count != null && count >= 2) {
        seatData.canPeng = true;
    }
}

//检查是否可以点杠
function checkCanDianGang(game, seatData, targetPai) {
    //检查玩家手上的牌
    //如果没有牌了，则不能再杠
    if (game.mahjongs.length <= game.currentIndex) {
        return;
    }
    var count = seatData.countMap[targetPai];
    if (count != null && count >= 3) {
        seatData.canGang = true;
        seatData.gangPai.push(targetPai);
        return;
    }
}

//检查是否可以暗杠
function checkCanAnGang(game, seatData) {
    //如果没有牌了，则不能再杠
    if (game.mahjongs.length <= game.currentIndex) {
        return;
    }

    for (var key in seatData.countMap) {
        var pai = parseInt(key);

        var c = seatData.countMap[key];
        if (c != null && c == 4) {
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }

    }
}

//检查是否可以弯杠(自己摸起来的时候)
function checkCanWanGang(game, seatData) {
    //如果没有牌了，则不能再杠
    if (game.mahjongs.length <= game.currentIndex) {
        return;
    }

    //从碰过的牌中选
    for (var i = 0; i < seatData.pengs.length; ++i) {
        var pai = seatData.pengs[i];
        if (seatData.countMap[pai] == 1) {
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }
    }
}

function checkCanHu(game, seatData, targetPai) {
    game.lastHuPaiSeat = -1;
    seatData.canHu = false;
    if (seatData.seatIndex == game.turn) {
        for (var k in seatData.tingMap) {
            if (targetPai == k) {
                seatData.canHu = true;
                return;
            }
        }
    }
    else {
        let count_map = seatData.countMap.concat();
        count_map[targetPai]++;
        const count = calMapCount(count_map);
        //7对
        let is_7dui = true
        if (count == 14) {
            for (const pai_count of count_map) {
                if (pai_count % 2 != 0) {
                    is_7dui = false;
                    break;
                }
            }
        }
        else {
            is_7dui = false;
        }
        count_map[targetPai]--;

        if (is_7dui == true) {
            seatData.canHu = true;
            return;
        }
        seatData.canHu = mjhulib.get_hu_info(count_map, targetPai, game.hun)
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
        if (data.hu == true || data.peng == true || data.gang == true) {
            game.countdown = 10;
            UserMgr.broacastInRoom('countdown_push', game.countdown, seatData.userId, true)
        }
        UserMgr.sendMsg(seatData.userId, 'game_action_push', data);

        if (seatData.canTing) {
            seatData.canTing = false;
        }
        data.si = seatData.seatIndex;
    }
    else {
        UserMgr.sendMsg(seatData.userId, 'game_action_push');
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
            checkCanPeng(game, ddd, chupai);
            checkCanDianGang(game, ddd, chupai);

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
        game.turn %= RoomMgr.conf.player_count;
        return;
    }
    else {
        game.turn = nextSeat;
    }
}

function doUserMoPai(game) {
    game.chuPai = -1;
    var turnSeat = game.gameSeats[game.turn];
    // turnSeat.lastFangGangSeat = -1;
    turnSeat.guoHuFan = -1;
    var pai = mopai(game, game.turn);
    //牌摸完了，结束,流局
    if (pai == -1) {
        doGameOver(game, turnSeat.userId);
        return;
    }
    else {
        var numOfMJ = game.mahjongs.length - game.currentIndex;
        // console.log('mj_count_push:::::::' + numOfMJ + "==" + turnSeat.userId)
        UserMgr.broacastInRoom('mj_count_push', numOfMJ, turnSeat.userId, true);
    }

    //通知前端新摸的牌
    UserMgr.sendMsg(turnSeat.userId, 'game_mopai_push', pai);
    //检查是否可以暗杠或者胡
    //检查胡，直杠，弯杠

    setTingMaps(turnSeat);
    setTingMap(turnSeat, pai);
    checkCanAnGang(game, turnSeat);

    //摸起来的牌可以杠，才检查弯杠
    if (turnSeat.holds[turnSeat.holds.length - 1] == pai) {
        checkCanWanGang(game, turnSeat, pai);
    }
    //检查看是否可以和
    checkCanHu(game, turnSeat, pai);

    //广播通知玩家出牌方
    turnSeat.canChuPai = true;
    UserMgr.broacastInRoom('game_chupai_push', turnSeat.userId, turnSeat.userId, true);

    game.countdown = 16;
    UserMgr.broacastInRoom('countdown_push', game.countdown, turnSeat.userId, true);
    //通知玩家做对应操作
    sendOperations(game, turnSeat, game.chuPai);
}

function isTinged(seatData) {
    for (var k in seatData.tingMap) {
        return true;
    }
    return false;
}
//计算结算分数todo
function calculateResult(game) {
    var conf = RoomMgr.conf
    var baseScore = conf.base_score;
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
                        gangFen = (gameSeats[i].paofen + gameSeats[targets[j]].paofen) * baseScore
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
                    gangFen = (gameSeats[i].paofen + gameSeats[target].paofen) * baseScore
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
                            paofen = (gameSeats[i].paofen + gameSeats[target].paofen) * baseScore;
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
                    paofen = (gameSeats[i].paofen + gameSeats[target].paofen) * baseScore;
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
    // let scores = [];
    for (var i = 0; i < game.gameSeats.length; ++i) {
        gameSeats[i].score = gameSeats[i].huScore + gameSeats[i].gangScore;
        // let score = gameSeats[i].huScore + gameSeats[i].gangScore;
        // scores[i] = score;
    }
}
//forceEnd是否强制结束
async function doGameOver(game, userId) {
    var roomId = RoomMgr.getUserRoom(userId);
    if (roomId == null) {
        return;
    }
    var roomInfo = RoomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }

    var results = [];
    var dbresult = [0, 0, 0, 0];
    var player_count = RoomMgr.conf.player_count;

    if (game != null) {

        calculateResult(game);

        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var sd = game.gameSeats[i];

            var userRT = {
                userId: sd.userId,
                pengs: sd.pengs,
                name: sd.name,
                wangangs: sd.wangangs,
                diangangs: sd.diangangs,
                angangs: sd.angangs,
                holds: sd.holds,
                score: sd.score,
                huScore: sd.huScore,
                gangScore: sd.gangScore,
                hu_data: sd.hu_data,
                paofen: sd.paofen,
            }

            results.push(userRT);

            dbresult[i] = sd.score;
            delete gameSeatsOfUsers[sd.userId];
        }
        delete games[roomId];


        UserMgr.broacastInRoom('game_over_push', { results: results }, userId, true);

        //如果局数已够，则进行整体结算，并关闭房间
        RoomMgr.destroy(roomId);
        // for (var i = 0; i < player_count; ++i) {

        //奖池增量
        let jackpotIncrement = 0;

        for (var i = 0; i < player_count; ++i) {
            let gs = game.gameSeats[i]
            let user = RoomMgr.getUserInfo(gs.userId);
            user.coins += gs.score;
            RoomMgr.setLastGameOverResults(gs.userId, results)

            if (RoomMgr.conf.is_free == false) {
                HallSocket.sendUserCoins(user.account, user.coins)
            }

            gameService.saveGameRecord(gs.userId, gs.name, "coin_" + RoomMgr.conf.type, 0, gs.score, (err, result) => {
                if (err) {
                    console.log(err);
                }
            })

            if (RoomMgr.conf.is_free == false && gs.score != 0 && !RoomMgr.isRobot(gs.userId)) {
                //统计奖池增量
                jackpotIncrement -= gs.score;
                rechargeService.changeUserGoldsAndSaveConsumeRecord(gs.userId, gs.score, "coin_" + RoomMgr.conf.type, "coins", `参与${RoomMgr.conf.name}输或赢的金币`, (err, result) => {
                    if (err) {
                        console.log(err);
                    }
                })
            }
        }

        //非体验房才更新房间奖池信息
        if(RoomMgr.conf.is_free == false){
            let roomCode = RoomMgr.conf.room_code;
            console.log('修改'+RoomMgr.conf.name+'房间奖池：'+roomCode+'   奖池增量：'+jackpotIncrement);
            await commonService.changeNumberOfObjForTableAsync("t_room_info", { robot_total_win: jackpotIncrement }, { room_code: roomCode});
        }// }
    }
}
//记录
function recordUserAction(game, seatData, type, target) {
    var d = { type: type, targets: [] };
    if (target != null) {
        if (typeof (target) == 'number') {
            d.targets.push(target);
        }
        else {
            d.targets = target;
        }
    }
    else {
        for (var i = 0; i < game.gameSeats.length; ++i) {
            var s = game.gameSeats[i];
            if (i != seatData.seatIndex) {
                d.targets.push(i);
            }
        }
    }

    seatData.actions.push(d);
    return d;
}

//玩家上线，强制设置为TRUE,准备
//socket 107
//游戏准备开始
exports.gameSyncPush = function (userId) {
    var roomId = RoomMgr.getUserRoom(userId);
    if (roomId == null) {
        return;
    }

    var game = games[roomId];
    var player_count = RoomMgr.conf.player_count


    var numOfMJ = game.mahjongs.length - game.currentIndex;

    var data = {
        state: game.state,
        numofmj: numOfMJ,
        button: game.button,
        turn: game.turn,
        chuPai: game.chuPai,
        hun: game.hun,
        countdown: game.countdown,
    };

    data.seats = [];
    var seatData = null;
    for (var i = 0; i < player_count; ++i) {
        var sd = game.gameSeats[i];

        var s = {
            coins: sd.coins,
            name: sd.name,
            seatindex: sd.seatIndex,
            userid: sd.userId,
            gems: sd.gems,
            ip: sd.ip,

            userid: sd.userId,
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
            // is_trustee: sd.trustee_times >= RoomMgr.conf.trustee_times,
        }
        if (sd.userId == userId) {
            s.holds = sd.holds;
            seatData = sd;
        }
        s.is_trustee = sd.trustee_times >= RoomMgr.conf.trustee_times;
        data.seats.push(s);
    }

    //同步整个信息给客户端
    UserMgr.sendMsg(userId, 'game_sync_push', data);
    sendOperations(game, seatData, game.chuPai);
}
//下跑todo
exports.xiaPao = function (userId, paofen) {
    paofen = Number.parseInt(paofen);
    var seatData = gameSeatsOfUsers[userId]
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    if (seatData.paofen != -1) {
        console.log("user has xiapao");
        return;
    }

    var game = seatData.game;
    if (game.state != "xiapao") {
        console.log("can't recv xiaPao when game.state == " + game.state);
        return;
    }

    seatData.paofen = paofen//*RoomMgr.conf.base_score;
    var seats = game.gameSeats
    var numOfPao = 0;
    var player_count = RoomMgr.conf.player_count
    var hunpai = RoomMgr.conf.hunpai

    for (var key in seats) {
        if (seats[key].paofen >= 0 && seats[key].paofen < 4/*RoomMgr.conf.base_score*/) {
            numOfPao++;
        }
    }

    //下跑人数齐了
    if (numOfPao == player_count) {
        var arr = new Array(player_count);
        for (var i = 0; i < player_count; ++i) {
            arr[i] = game.gameSeats[i].paofen;
        }
        UserMgr.broacastInRoom('game_xiapao_finish_push', arr, seatData.userId, true);
        exports.afterBegin(RoomMgr.getUserRoom(userId))
    }
}

function initGame(roomId) {
    //获取有关房间的信息
    var roomInfo = RoomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }

    var seats = roomInfo.seats;
    var player_count = RoomMgr.conf.player_count;

    var game = {
        roomInfo: roomInfo,
        button: Math.floor(Math.random() * player_count),//庄家
        mahjongs: RoomMgr.conf.fengpai == 0 ? new Array(136) : new Array(108),//麻将数量(不包括风牌)
        currentIndex: 0,//majongs index
        gameSeats: new Array(player_count),//房间内玩家

        hun: 34,//34方便没有混牌时，查表法不用修改
        turn: -1,
        chuPai: -1,//出的牌
        state: "idle",//当前状态(空闲)
        askordermap: [],//用来做轮询的
        countdown: -1,
        peng: false,//用来处理碰后自动出牌和客户端对不上的问题
    };
    game.turn = game.button;

    for (var i = 0; i < player_count; ++i) {
        const user_id = seats[i].userId;
        const user = RoomMgr.getUserInfo(user_id); //m_users[user_id]
        //扣除入场费
        RoomMgr.costPlayerEnterFee(user_id);
        game.gameSeats[i] = {
            game: game,

            name: user.name,
            sex: user.sex,
            coins: user.coins,
            ip: user.ip,
            gems: user.gems,
            trustee_times: 0,//托管，表示，服务器出牌次数，>=2会加快出牌

            seatIndex: i,//椅子号
            userId: seats[i].userId,
            holds: [],//持有的牌
            folds: [],//打出的牌
            angangs: [],//暗杠的牌
            angang_targets: [],
            diangangs: [],//点杠的牌
            diangang_targets: [],
            wangangs: [],//弯杠的牌
            wangang_targets: [],
            pengs: [], //碰了的牌
            peng_targets: [],
            paofen: -1,//跑分
            countMap: [],//玩家手上的牌的数目，用于快速判定碰杠
            canTing: false,
            tingMaps: {},
            tingMap: {},//玩家听牌，用于快速判定胡了的番数

            canGang: false,//是否可以杠
            gangPai: [],//用于记录玩家可以杠的牌

            canPeng: false, //是否可以碰
            canHu: false,//是否可以胡
            canChuPai: false,//是否可以出牌

            //如果guoHuFan >:0 表示处于过胡状态，
            //如果过胡状态，那么只能胡大于过胡番数的牌
            guoHuFan: -1,

            actions: [],

            fan: 0,
            huScore: 0,
            gangScore: 0,
            score: 0,

            lastFangGangSeat: -1,

            hu_data: null,
        };
        for (var j = 0; j < 34; ++j) {
            game.gameSeats[i].countMap[j] = 0;
        }
        delete gameSeatsOfUsers[user_id]
        gameSeatsOfUsers[user_id] = game.gameSeats[i];
    }
    games[roomId] = game;
    return game;
}

exports.setReady = function (user_id) {
    var roomId = RoomMgr.getUserRoom(user_id);
    if (roomId == null) {
        return;
    }
    //获取有关房间的信息
    var roomInfo = RoomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }

    let user_info = RoomMgr.getUserInfo(user_id);
    if (user_info == null) {
        return;
    }

    RoomMgr.setReady(user_id, true)
    // UserMgr.broacastInRoom('user_ready_push', { userid: user_id, ready: true }, user_id, true);

    var player_count = RoomMgr.conf.player_count
    if (roomInfo.player_count == player_count) {
        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var s = roomInfo.seats[i];
            if (s.ready == false) {
                return;
            }
        }
        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var s = roomInfo.seats[i];
            RoomMgr.setUserGaming(s.userId, true);
        }
        HallSocket.sendUserGameStart(roomId);
        exports.begin(roomId);
    }
}

exports.begin = function (roomId) {
    var game = initGame(roomId);
    if (game == null) {
        return;
    }
    if (RoomMgr.conf.xiapao == 0) {
        game.state = "xiapao";
        let seats = game.gameSeats
        game.countdown = 10;
        for (var i = 0; i < seats.length; ++i) {
            //开局时，通知前端必要的数据
            let user_id = seats[i].userId;
            exports.gameSyncPush(user_id);
            UserMgr.sendMsg(user_id, 'countdown_push', game.countdown);
            UserMgr.sendMsg(user_id, 'game_xiapao_begin_push', null);
            // UserMgr.sendMsg(user_id, 'game_begin_push', game.button);
        }
    }
    else {
        // UserMgr.broacastInRoom('game_begin_push', game.button, userId, true);
        exports.afterBegin(roomId);
    }
}

//开始新的一局
exports.afterBegin = function (roomId) {

    var game = games[roomId];
    if (game == null) {
        return;
    }
    shuffle(game)
    deal(game)
    var hunpai = RoomMgr.conf.hunpai
    var numOfMJ = game.mahjongs.length - game.currentIndex;
    var seats = game.gameSeats;
    for (var i = 0; i < seats.length; ++i) {
        //开局时，通知前端必要的数据
        var s = seats[i];
        //如果是下跑则不需要重新发送给客户端发送玩家数据
        if (RoomMgr.conf.xiapao == 1) {
            exports.gameSyncPush(s.userId);
        }
        if (hunpai == 0) {
            //通知混牌信息
            gen_hun(game)
            UserMgr.sendMsg(s.userId, 'game_hunpai_push', game.hun);
        }
        //通知玩家手牌
        UserMgr.sendMsg(s.userId, 'game_holds_push', game.gameSeats[i].holds);
        //通知还剩多少张牌
        UserMgr.sendMsg(s.userId, 'mj_count_push', numOfMJ);
        UserMgr.sendMsg(s.userId, 'game_playing_push', null);
    }

    //进行听牌检查
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var gs = game.gameSeats[i];
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
    UserMgr.broacastInRoom('game_chupai_push', turnSeat.userId, turnSeat.userId, true);
    game.countdown = 16;
    UserMgr.broacastInRoom('countdown_push', game.countdown, turnSeat.userId, true);
    //检查是否可以暗杠或者胡
    //直杠
    checkCanAnGang(game, turnSeat);
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
    game.peng = false;
    setTingMap(seatData, pai);
    UserMgr.broacastInRoom('game_chupai_notify_push', { user_id: seatData.userId, pai: pai }, seatData.userId, true);
    //点炮胡
    if (RoomMgr.conf.hupai == 0) {
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

    //检查是否有人要胡，要碰 要杠
    var hasActions = false;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        //玩家自己不检查
        if (game.turn == i) {
            continue;
        }
        var ddd = game.gameSeats[i];
        checkCanPeng(game, ddd, pai);
        checkCanDianGang(game, ddd, pai);
        if (RoomMgr.conf.hupai == 0) {
            checkCanHu(game, ddd, pai);
        }
        if (seatData.lastFangGangSeat == -1) {
            if (ddd.canHu && ddd.guoHuFan >= 0 && ddd.tingMap[pai].fan <= ddd.guoHuFan) {
                console.log("ddd.guoHuFan:" + ddd.guoHuFan);
                ddd.canHu = false;
                UserMgr.sendMsg(ddd.userId, 'guohu_push');
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
            UserMgr.broacastInRoom('guo_notify_push', { user_id: seatData.userId, pai: game.chuPai }, seatData.userId, true);
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
    var player_count = RoomMgr.conf.player_count
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
    game.peng = true;
    setTingMaps(seatData);
    //广播通知其它玩家
    UserMgr.broacastInRoom('peng_notify_push', { user_id: seatData.userId, pai: pai, target: game.turn }, seatData.userId, true);

    sendOperations(game, seatData, -1);
    //碰的玩家打牌
    moveToNextUser(game, seatData.seatIndex);

    //广播通知玩家出牌方
    seatData.canChuPai = true;
    UserMgr.broacastInRoom('game_chupai_push', seatData.userId, seatData.userId, true);
    game.countdown = 16;
    UserMgr.broacastInRoom('countdown_push', game.countdown, seatData.userId, true)
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

    seatData.numGang += 1;
    //记录下玩家的杠牌
    if (gangtype == "angang") {
        seatData.angangs.push(pai);
        seatData.angang_targets.push(gang_target)
        var ac = recordUserAction(game, seatData, "angang");
    }
    else if (gangtype == "diangang") {
        turnSeat.numFangGang += 1;
        seatData.diangangs.push(pai);
        seatData.diangang_targets.push(gang_target)
        var ac = recordUserAction(game, seatData, "diangang", gameTurn);
        // var fs = turnSeat;
        // recordUserAction(game, fs, "fanggang", seatIndex);
    }
    else if (gangtype == "wangang") {
        game.gameSeats[gang_target].numFangGang += 1;
        seatData.wangangs.push(pai);
        seatData.wangang_targets.push(gang_target)
        var ac = recordUserAction(game, seatData, "wangang", gang_target);
    }

    //通知其他玩家，有人杠了牌
    UserMgr.broacastInRoom('gang_notify_push', { user_id: seatData.userId, pai: pai, gangtype: gangtype, target: gang_target }, seatData.userId, true);

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
    var player_count = RoomMgr.conf.player_count
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
        if (RoomMgr.conf.hupai == 0) {
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

    UserMgr.broacastInRoom('hangang_notify_push', seatIndex, seatData.userId, true);

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
    }

    clearAllOptions(game, seatData);

    //通知前端，有人和牌了
    UserMgr.broacastInRoom('hu_push', { seatindex: seatIndex, iszimo: hu_data.iszimo, hupai: notify }, seatData.userId, true);

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

    UserMgr.sendMsg(seatData.userId, "guo_result");

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
        //杠牌和自摸点过后不再自动出牌的问题
        game.countdown = 16;
        UserMgr.broacastInRoom('countdown_push', game.countdown, seatData.userId, true)
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
        UserMgr.broacastInRoom('guo_notify_push', { user_id: uid, pai: game.chuPai }, seatData.userId, true);
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
    var roomInfo = RoomMgr.getRoom(roomId);
    if (roomInfo != null) {
        return !roomInfo.is_idle;
    }
    return false;
};

//托管
exports.trustee = function (user_id, is_trustee) {
    var seatData = gameSeatsOfUsers[user_id];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }
    if (is_trustee == true || is_trustee == "true") {
        seatData.trustee_times = RoomMgr.conf.trustee_times;
        UserMgr.broacastInRoom('trustee_push', { is_trustee: is_trustee, user_id: user_id }, user_id, true)
    }
    if (is_trustee == false || is_trustee == "false") {
        seatData.trustee_times = 0;
        UserMgr.broacastInRoom('trustee_push', { is_trustee: is_trustee, user_id: user_id }, user_id, true)
    }
}

function countdownPlaying(game) {
    if (countdownOtherOp(game, false) == false) {
        countdownCurrtPlayerOp(game, false);
    }
}

function countdownTrustee(game) {
    if (countdownOtherOp(game, true) == false) {
        if (game.gameSeats[game.turn].trustee_times >= RoomMgr.conf.trustee_times) {
            countdownCurrtPlayerOp(game, true);
        }
    }
}
//自动出牌时先计算当前出牌玩家之外的其他玩家是否操作
//如果有则先不处理当前出牌玩家的操作
//is_trusteeship : 假设是在托管状态下调用
function countdownOtherOp(game, is_trusteeship) {
    let seats = game.gameSeats;
    let is_other_op = false;

    if (game.askordermap.length > 1) {
        askHuByOrder(game);
    }

    for (let i = 0; i < seats.length; ++i) {
        if (i != game.turn) {
            if (hasOperations(seats[i])) {
                if (is_trusteeship == false
                    || (is_trusteeship == true && seats[i].trustee_times >= RoomMgr.conf.trustee_times)) {
                    if (seats[i].canHu) {
                        exports.hu(seats[i].userId);
                    }
                    else {
                        exports.guo(seats[i].userId);
                    }
                }
                is_other_op = true;
            }
        }
    }
    return is_other_op
}
//如果有则先不处理当前出牌玩家的操作
function countdownCurrtPlayerOp(game, is_trusteeship) {
    let seats = game.gameSeats;
    let curr_seat = seats[game.turn];
    let curr_user_id = curr_seat.userId;

    if (hasOperations(curr_seat)) {
        if (curr_seat.canHu) {
            exports.hu(curr_user_id);
        }
        else {
            exports.guo(curr_user_id);
        }
    } else {
        if (is_trusteeship == false) {
            curr_seat.trustee_times++;
            if (curr_seat.trustee_times >= RoomMgr.conf.trustee_times) {
                UserMgr.broacastInRoom('trustee_push', { is_trustee: true, user_id: curr_user_id }, curr_user_id, true)
            }
        }
        let holds_count = curr_seat.holds.length;
        let holds = curr_seat.holds;
        let max_pai = holds[holds_count - 1];
        if (game.peng == true) {
            max_pai = holds[0];
            for (let idx = 1; idx < holds.length; idx++) {
                if (max_pai < holds[idx]) {
                    max_pai = holds[idx];
                }
            }
        }
        exports.chuPai(curr_user_id, max_pai);
    }
}

function countdownXiaPao(gameSeats) {
    // if (typeof gameSeats !== "Array") {
    //     console.log(typeof gameSeats);
    //     return
    // }
    for (let i = 0; i < gameSeats.length; ++i) {
        let gs = gameSeats[i];
        if (gs.paofen == -1) {
            exports.xiaPao(gs.userId, 0);
        }
    }
}

function update() {
    for (const key in games) {
        let game = games[key];
        if (game.countdown == 0) {
            game.countdown = -1;
            if (game.state == "xiapao") {
                countdownXiaPao(game.gameSeats)
            }
            else if (game.state == "playing") {
                countdownPlaying(game)
            }
        }
        else if (game.countdown > 0) {
            if (game.state == "playing") {
                countdownTrustee(game)
            }
            game.countdown += (-1);
        }
    }
}

function calMapCount(count_map) {
    var count = 0
    for (var i = 0; i < 34; ++i) {
        count += count_map[i];
    }
    return count;
}

function checkHuPai(seatData, count_map) {
    const hun = seatData.game.hun;
    let map = count_map.concat();
    const count = calMapCount(map);
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
                        count: getMJLeftCount(seatData, j),
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
    const count = calMapCount(map);
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

function getMJLeftCount(seatData, mj_id) {
    const gameSeats = seatData.game.gameSeats
    let count = 4;
    for (const key in gameSeats) {
        const seat = gameSeats[key];
        for (const idx in seat.angangs) {
            if (seat.angangs[idx] == mj_id) {
                count -= 4;
            }
        }
        for (const idx in seat.wangangs) {
            if (seat.wangangs[idx] == mj_id) {
                count -= 4;
            }
        }
        for (const idx in seat.diangangs) {
            if (seat.diangangs[idx] == mj_id) {
                count -= 4;
            }
        }
        for (const idx in seat.pengs) {
            if (seat.pengs[idx] == mj_id) {
                count -= 3;
            }
        }
        for (const idx in seat.folds) {
            if (seat.folds[idx] == mj_id) {
                --count;
            }
        }
    }
    for (const idx in seatData.holds) {
        if (seatData.holds[idx] == mj_id) {
            --count;
        }
    }
    return count;
}
function checkAskOrderMap(game, pai, seatData) {
    //添加轮询操作，多人胡牌时，按座位顺序发送
    game.askordermap = [];
    var player_count = RoomMgr.conf.player_count
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
                UserMgr.sendMsg(gameSeat.userId, 'guohu_push');
            }
        }
        if (gameSeat.canHu == true) {
            game.askordermap.push(idx);
            gameSeat.canHu = false;
        };
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