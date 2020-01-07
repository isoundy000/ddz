var mjutils = require('./mjutils');
var UserMgr = require("../../common/usermgr");
var GameMgr = require("../../common/gamemgr");
var RoomMgr = require('../../common/coin_game/RoomMgr');
const gameService = require('../../common/service/gameService')
const rechargeService = require('../../common/service/rechargeService')
const Notice = require('../../common/coin_game/Notice').ID

var HallSocket = null;
exports.setHallSocket = function (hall_socket) {
    HallSocket = hall_socket;
}

var games = {};

var ACTION_CHUPAI = 1;
var ACTION_MOPAI = 2;
var ACTION_PENG = 3;
var ACTION_GANG = 4;
var ACTION_HU = 5;
var ACTION_ZIMO = 6;

var gameSeatsOfUsers = {};

function getMJType(id) {
    if (id >= 0 && id < 9) {
        //筒
        return 0;
    }
    else if (id >= 9 && id < 18) {
        //条
        return 1;
    }
    else if (id >= 18 && id < 27) {
        //万
        return 2;
    }
}
//洗牌
function shuffle(game) {

    var mahjongs = game.mahjongs;

    //-----------------------------------------------
    // game.mahjongs = [
    //     0, 0, 0, 0,
    //     0, 0, 0, 0,
    //     0, 0, 0, 0,
    //     13, 1, 1, 1,
    //     2, 2, 2, 2,
    //     3, 3, 14, 13,
    //     4, 4, 4, 4,
    //     5, 5, 5, 5,
    //     6, 6, 12, 11,
    //     7, 7, 7, 7,
    //     8, 8, 8, 8,
    //     9, 6, 6, 6,
    //     9, 9, 9, 9,
    //     6, 7, 0, 0, 0,0
    // ]
    // return
    //--------------------------------------------
    // game.mahjongs = [
    //     1, 2, 3, 4,
    //     1, 2, 3, 4,
    //     1, 2, 3, 4,
    //     5, 6, 7, 8,
    //     5, 6, 7, 8,
    //     5, 6, 7, 8,
    //     9, 10, 11, 12,
    //     9, 10, 11, 12,
    //     9, 10, 11, 12,
    //     9, 13, 14, 15,
    //     15, 13, 14, 15,
    //     15, 13, 14, 15,
    //     15, 17, 17, 17,
    //     17,
    //     12, 26, 26
    // ]
    // return
    /*
    var idx = 0;
    for (var i = 0; i < 12; ++i) {
        game.mahjongs[idx++] = 0;
    }

    for (var i = 0; i < 12; ++i) {
        game.mahjongs[idx++] = 1;
    }

    for (var i = 0; i < 12; ++i) {
        game.mahjongs[idx++] = 2;
    }

    for (var i = 0; i < 12; ++i) {
        game.mahjongs[idx++] = 3;
    }


    for (var i = idx; i < game.mahjongs.length; ++i) {
        game.mahjongs[i] = 4;
    }
    return;
    */

    //筒 (0 ~ 8 表示筒子
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
    //洗牌
    for (var i = 0; i < mahjongs.length; ++i) {
        var lastIndex = mahjongs.length - 1 - i;
        var index = Math.floor(Math.random() * lastIndex);
        var t = mahjongs[index];
        mahjongs[index] = mahjongs[lastIndex];
        mahjongs[lastIndex] = t;
    }
}

function mopai(game, seatIndex) {
    if (game.currentIndex == game.mahjongs.length) {
        return -1;
    }
    var data = game.gameSeats[seatIndex];
    var mahjongs = data.holds;

    // 给机器人好牌的概率，如果不为0，则进行干涉
    // 跳过发牌阶段
    var luckDegree = RoomMgr.getDifficultyDegree(game.gameSeats[seatIndex].userId);
    if (luckDegree != 0
        && (mahjongs.length + 3 * (data.pengs.length) + 4 * (data.angangs.length + data.wangangs.length + data.diangangs.length)) > 12) {
        GameMgr.mopaiByLuckDegree(game, seatIndex, luckDegree);
    }

    var pai = game.mahjongs[game.currentIndex];
    mahjongs.push(pai);

    //统计牌的数目 ，用于快速判定（空间换时间）
    var c = data.countMap[pai];
    if (c == null) {
        c = 0;
    }
    data.countMap[pai] = c + 1;
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
    for (var i = 0; i < player_count * 13; ++i) {
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

//检查是否可以碰
function checkCanPeng(game, seatData, targetPai) {
    if (getMJType(targetPai) == seatData.que) {
        return;
    }
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
    if (getMJType(targetPai) == seatData.que) {
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
        if (getMJType(pai) != seatData.que) {
            var c = seatData.countMap[key];
            if (c != null && c == 4) {
                seatData.canGang = true;
                seatData.gangPai.push(pai);
            }
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
    if (getMJType(targetPai) == seatData.que) {
        return;
    }
    seatData.canHu = false;
    for (var k in seatData.tingMap) {
        if (targetPai == k) {
            seatData.canHu = true;
        }
    }
}

function clearAllOptions(game, seatData) {
    var fnClear = function (sd) {
        sd.canPeng = false;
        sd.canGang = false;
        sd.gangPai = [];
        sd.canHu = false;
        sd.lastFangGangSeat = -1;
    }
    if (seatData) {
        fnClear(seatData);
    }
    else {
        game.qiangGangContext = null;
        for (var i = 0; i < game.gameSeats.length; ++i) {
            fnClear(game.gameSeats[i]);
        }
    }
}

//检查听牌
function checkCanTingPai(game, seatData) {
    seatData.tingMap = {};

    //检查手上的牌是不是已打缺，如果未打缺，则不进行判定
    for (var i = 0; i < seatData.holds.length; ++i) {
        var pai = seatData.holds[i];
        if (getMJType(pai) == seatData.que) {
            return;
        }
    }

    //检查是否是七对 前提是没有碰，也没有杠 ，即手上拥有13张牌
    if (seatData.holds.length == 13) {
        //有5对牌
        var hu = false;
        var danPai = -1;
        var pairCount = 0;
        for (var k in seatData.countMap) {
            var c = seatData.countMap[k];
            if (c == 2 || c == 3) {
                pairCount++;
            }
            else if (c == 4) {
                pairCount += 2;
            }

            if (c == 1 || c == 3) {
                //如果已经有单牌了，表示不止一张单牌，并没有下叫。直接闪
                if (danPai >= 0) {
                    break;
                }
                danPai = k;
            }
        }

        //检查是否有6对 并且单牌是不是目标牌
        if (pairCount == 6) {
            //七对只能和一张，就是手上那张单牌
            //七对的番数＝ 2番+N个4个牌（即龙七对）
            seatData.tingMap[danPai] = {
                fan: 2,
                pattern: "7pairs"
            };
            //如果是，则直接返回咯
        }
    }

    //检查是否是对对胡  由于四川麻将没有吃，所以只需要检查手上的牌
    //对对胡叫牌有两种情况
    //1、N坎 + 1张单牌
    //2、N-1坎 + 两对牌
    var singleCount = 0;
    var colCount = 0;
    var pairCount = 0;
    var arr = [];
    for (var k in seatData.countMap) {
        var c = seatData.countMap[k];
        if (c == 1) {
            singleCount++;
            arr.push(k);
        }
        else if (c == 2) {
            pairCount++;
            arr.push(k);
        }
        else if (c == 3) {
            colCount++;
        }
        else if (c == 4) {
            //手上有4个一样的牌，在四川麻将中是和不了对对胡的 随便加点东西
            singleCount++;
            pairCount += 2;
        }
    }

    if ((pairCount == 2 && singleCount == 0) || (pairCount == 0 && singleCount == 1)) {
        for (var i = 0; i < arr.length; ++i) {
            //对对胡1番
            var p = arr[i];
            if (seatData.tingMap[p] == null) {
                seatData.tingMap[p] = {
                    pattern: "duidui",
                    fan: 1
                };
            }
        }
    }

    //console.log(seatData.holds);
    //console.log(seatData.countMap);
    //console.log("singleCount:" + singleCount + ",colCount:" + colCount + ",pairCount:" + pairCount);
    //检查是不是平胡
    if (seatData.que != 0) {
        mjutils.checkTingPai(seatData, 0, 9);
    }

    if (seatData.que != 1) {
        mjutils.checkTingPai(seatData, 9, 18);
    }

    if (seatData.que != 2) {
        mjutils.checkTingPai(seatData, 18, 27);
    }
}

function hasOperations(seatData) {
    if (seatData.canGang || seatData.canPeng || seatData.canHu) {
        return true;
    }
    return false;
}

function sendOperations(game, seatData, pai) {
    // /*
    seatData.canTing = false;
    seatData.tingMaps = {};
    if (game.turn == seatData.seatIndex) {
        mjutils.setTingMaps(game, seatData)
    }
    if (hasOperations(seatData) || seatData.canTing) {
        // */
        // if (hasOperations(seatData)) {
        if (pai == -1) {
            pai = seatData.holds[seatData.holds.length - 1];
        }
        var data = {
            pai: pai,
            hu: seatData.canHu,
            peng: seatData.canPeng,
            gang: seatData.canGang,
            gangpai: seatData.gangPai,
            ting: seatData.canTing,
            tingMaps: seatData.tingMaps,
        };

        //如果可以有操作，则进行操作
        if (data.hu == true || data.peng == true || data.gang == true) {
            game.countdown = 10;
            UserMgr.broacastInRoom('countdown_push', game.countdown, seatData.userId, true)
        }
        UserMgr.sendMsg(seatData.userId, 'game_action_push', data);

        data.si = seatData.seatIndex;
    }
    else {
        UserMgr.sendMsg(seatData.userId, 'game_action_push');
    }
}

function moveToNextUser(game, nextSeat) {
    game.fangpaoshumu = 0;
    game.gameSeats[game.turn].lastFangGangSeat = -1;
    //找到下一个没有和牌的玩家
    if (nextSeat == null) {
        while (true) {
            game.turn++;
            game.turn %= RoomMgr.conf.player_count;
            var turnSeat = game.gameSeats[game.turn];
            if (turnSeat.hued == false) {// && turnSeat.no_coins != true) {
                return;
            }
        }
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
    //牌摸完了，结束
    if (pai == -1) {
        doGameOver(game, turnSeat.userId);
        return;
    }
    else {
        var numOfMJ = game.mahjongs.length - game.currentIndex;
        UserMgr.broacastInRoom('mj_count_push', numOfMJ, turnSeat.userId, true);
    }
    //通知前端新摸的牌
    UserMgr.sendMsg(turnSeat.userId, 'game_mopai_push', pai);
    //检查是否可以暗杠或者胡
    //检查胡，直杠，弯杠
    checkCanAnGang(game, turnSeat);
    checkCanWanGang(game, turnSeat, pai);

    //检查看是否可以和
    checkCanHu(game, turnSeat, pai);

    //广播通知玩家出牌方
    turnSeat.canChuPai = true;
    UserMgr.broacastInRoom('game_chupai_push', turnSeat.userId, turnSeat.userId, true);
    //客户端指针问题，需要放在这
    game.countdown = 16;
    UserMgr.broacastInRoom('countdown_push', game.countdown, turnSeat.userId, true)

    //通知玩家做对应操作
    sendOperations(game, turnSeat, game.chuPai);
}

function isSameType(type, arr) {
    for (var i = 0; i < arr.length; ++i) {
        var t = getMJType(arr[i]);
        if (type != -1 && type != t) {
            return false;
        }
        type = t;
    }
    return true;
}

function isQingYiSe(gameSeatData) {
    var type = getMJType(gameSeatData.holds[0]);

    //检查手上的牌
    if (isSameType(type, gameSeatData.holds) == false) {
        return false;
    }

    //检查杠下的牌
    if (isSameType(type, gameSeatData.angangs) == false) {
        return false;
    }
    if (isSameType(type, gameSeatData.wangangs) == false) {
        return false;
    }
    if (isSameType(type, gameSeatData.diangangs) == false) {
        return false;
    }

    //检查碰牌
    if (isSameType(type, gameSeatData.pengs) == false) {
        return false;
    }
    return true;
}

function isMenQing(gameSeatData) {
    return (gameSeatData.pengs.length + gameSeatData.wangangs.length + gameSeatData.diangangs.length) == 0;
}

function isZhongZhang(gameSeatData) {
    var fn = function (arr) {
        for (var i = 0; i < arr.length; ++i) {
            var pai = arr[i];
            if (pai == 0 || pai == 8 || pai == 9 || pai == 17 || pai == 18 || pai == 26) {
                return false;
            }
        }
        return true;
    }

    if (fn(gameSeatData.pengs) == false) {
        return false;
    }
    if (fn(gameSeatData.angangs) == false) {
        return false;
    }
    if (fn(gameSeatData.diangangs) == false) {
        return false;
    }
    if (fn(gameSeatData.wangangs) == false) {
        return false;
    }
    if (fn(gameSeatData.holds) == false) {
        return false;
    }
    return true;
}

function isJiangDui(gameSeatData) {
    var fn = function (arr) {
        for (var i = 0; i < arr.length; ++i) {
            var pai = arr[i];
            if (pai != 1 && pai != 4 && pai != 7
                && pai != 9 && pai != 13 && pai != 16
                && pai != 18 && pai != 21 && pai != 25
            ) {
                return false;
            }
        }
        return true;
    }

    if (fn(gameSeatData.pengs) == false) {
        return false;
    }
    if (fn(gameSeatData.angangs) == false) {
        return false;
    }
    if (fn(gameSeatData.diangangs) == false) {
        return false;
    }
    if (fn(gameSeatData.wangangs) == false) {
        return false;
    }
    if (fn(gameSeatData.holds) == false) {
        return false;
    }
    return true;
}

function isTinged(seatData) {
    for (var k in seatData.tingMap) {
        return true;
    }
    return false;
}

function computeFanScore(game, fan) {
    // if (fan > RoomMgr.conf.maxFan) {
    //     fan = RoomMgr.conf.maxFan;
    // }
    console.log("fan = " + fan)
    console.log(1 << fan)
    return (1 << fan) * RoomMgr.conf.base_score;
}

//是否需要查大叫(有两家以上未胡，且有人没有下叫)
function needChaDaJiao(game) {
    //查叫
    var numOfHued = 0;
    var numOfTinged = 0;
    var numOfUntinged = 0;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ts = game.gameSeats[i];
        if (ts.hued) {
            numOfHued++;
            // numOfTinged++;
        }
        else if (isTinged(ts)) {
            numOfTinged++;
        }
        else {
            numOfUntinged++;
        }
    }

    //如果三家都胡牌了，不需要查叫
    if (numOfHued == 3) {
        return false;
    }

    //如果没有任何一个人叫牌，也没有任何一个胡牌，则不需要查叫
    if (numOfTinged == 0) {
        return false;
    }

    //如果都听牌了，也不需要查叫
    if (numOfUntinged == 0) {
        return false;
    }
    return true;
}

function findMaxFanTingPai(ts) {
    //找出最大番
    var cur = null;
    for (var k in ts.tingMap) {
        var tpai = ts.tingMap[k];
        if (cur == null || tpai.fan > cur.fan) {
            cur = tpai;
        }
    }
    return cur;
}

function findUnTingedPlayers(game) {
    var arr = [];
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ts = game.gameSeats[i];
        //如果没有胡，且没有听牌
        if (!ts.hued && !isTinged(ts)) {
            arr.push(i);
            recordUserAction(game, ts, "beichadajiao", -1);
        }
    }
    return arr;
}

function chaJiao(game) {
    var arr = findUnTingedPlayers(game);
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ts = game.gameSeats[i];
        //如果没有胡，但是听牌了，则未叫牌的人要给钱
        if (!ts.hued && isTinged(ts)) {
            var cur = findMaxFanTingPai(ts);
            ts.fan = cur.fan;
            ts.pattern = cur.pattern;
            recordUserAction(game, ts, "chadajiao", arr);
        }
    }
}

function doGameOver(game, userId) {
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
        realTimeCalculateResult(game)
        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var sd = game.gameSeats[i];
            var userRT = {
                userId: sd.userId,
                name: sd.name,
                pengs: sd.pengs,
                actions: [],
                wangangs: sd.wangangs,
                diangangs: sd.diangangs,
                angangs: sd.angangs,
                numofgen: sd.numofgen,
                holds: sd.holds,
                fan: sd.fan,
                score: sd.score,

                qingyise: sd.qingyise,
                pattern: sd.pattern,
                isganghu: sd.isGangHu,
                menqing: sd.isMenQing,
                zhongzhang: sd.isZhongZhang,
                jingouhu: sd.isJinGouHu,
                haidihu: sd.isHaiDiHu,
                tianhu: sd.isTianHu,
                dihu: sd.isDiHu,
                huorder: game.hupaiList.indexOf(i),
            };

            for (var k in sd.actions) {
                userRT.actions[k] = {
                    type: sd.actions[k].type,
                };
            }
            results.push(userRT);


            dbresult[i] = sd.score;
            // delete gameSeatsOfUsers[sd.userId];
        }
        delete games[roomId];

        UserMgr.broacastInRoom('game_over_push', { results: results }, userId, true);
        //如果局数已够，则进行整体结算，并关闭房间
        RoomMgr.destroy(roomId);
        for (var i = 0; i < player_count; ++i) {
            let gs = game.gameSeats[i]
            let user_id = gs.userId;
            let user = RoomMgr.getUserInfo(user_id);

            RoomMgr.setLastGameOverResults(gs.userId, results)

            if (user != null) {
                // user.coins += gs.score;
                if (RoomMgr.conf.is_free == false)
                    HallSocket.sendUserCoins(user.account, user.coins)
            }
            UserMgr.sendMsg(user_id, "coins_update", user.coins);
            gameService.saveGameRecord(user_id, gs.name, "coins_" + RoomMgr.conf.type, 0, gs.score, (err, result) => {
                if (err) {
                    console.log(err);
                }
            })
            if (RoomMgr.conf.is_free == false && gs.score != 0 && !RoomMgr.isRobot(gs.userId)) {
                rechargeService.changeUserGoldsAndSaveConsumeRecord(user_id, gs.score, "coin_" + RoomMgr.conf.type, "coins", `参与${RoomMgr.conf.name}输或赢的金币`, (err, result) => {
                    if (err) {
                        console.log(err);
                    }
                })
            }
        }
    }
}

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
            if (i != seatData.seatIndex && s.hued == false) {
                d.targets.push(i);
            }
        }
    }
    console.log("ddddddddddddddddddd=" + d.targets)
    console.log("======================" + type + "=====================")
    seatData.actions.push(d);
    return d;
}

exports.gameSyncPush = function (userId) {
    var roomId = RoomMgr.getUserRoom(userId);
    if (roomId == null) {
        return;
    }
    var player_count = RoomMgr.conf.player_count
    var game = games[roomId];
    if (game == null) {
        return
    }
    var numOfMJ = game.mahjongs.length - game.currentIndex;
    var data = {
        state: game.state,
        numofmj: numOfMJ,
        button: game.button,
        turn: game.turn,
        chuPai: game.chuPai,
        huanpaimethod: game.huanpaiMethod,
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
            folds: sd.folds,
            angangs: sd.angangs,
            angang_targets: sd.angang_targets,
            diangangs: sd.diangangs,
            diangang_targets: sd.diangang_targets,
            wangangs: sd.wangangs,
            wangang_targets: sd.wangang_targets,
            pengs: sd.pengs,
            peng_targets: sd.peng_targets,
            que: sd.que,
            hued: sd.hued,
            iszimo: sd.iszimo,
            ip: sd.ip,
        }
        if (sd.userId == userId) {
            s.holds = sd.holds;
            s.huanpais = sd.huanpais;
            seatData = sd;
            sd.trustee_times = 0;
        }
        else {
            s.huanpais = sd.huanpais ? [] : null;
        }
        s.is_trustee = sd.trustee_times >= RoomMgr.conf.trustee_times;
        data.seats.push(s);
    }
    //同步整个信息给客户端
    UserMgr.sendMsg(userId, 'game_sync_push', data);
    sendOperations(game, seatData, game.chuPai);
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

//开始新的一局
exports.begin = function (roomId) {
    var roomInfo = RoomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }
    var seats = roomInfo.seats;
    var player_count = RoomMgr.conf.player_count
    //游戏开始时初始化游戏状态
    var game = {
        roomInfo: roomInfo,

        button: Math.floor(Math.random() * player_count),//庄家
        mahjongs: new Array(108),//麻将数量(不包括风牌)
        currentIndex: 0,//牌桌上下一张被摸的牌的索引
        gameSeats: new Array(player_count),//房间内玩家
        numOfQue: 0,
        turn: -1,
        chuPai: -1,//？出的牌
        state: "idle",//当前状态(空闲)
        firstHupai: -1,//最先胡牌的玩家
        yipaoduoxiang: -1,//一炮多响
        fangpaoshumu: -1,//放炮数目
        hupaiList: [],//胡牌列表
        chupaiCnt: 0,//出牌？？？
        countdown: -1,
        hu_info: [],

        peng: false,
    };
    game.turn = game.button;
    //初始化房间内玩家牌的数据
    for (var i = 0; i < player_count; ++i) {
        const user_id = seats[i].userId;
        const user = RoomMgr.getUserInfo(user_id); //m_users[user_id]
        //扣除入场费
        RoomMgr.costPlayerEnterFee(user_id);
        game.gameSeats[i] = {
            name: user.name,
            sex: user.sex,
            coins: user.coins,
            ip: user.ip,
            gems: user.gems,
            // no_coins:false,

            game: game,
            seatIndex: i,
            userId: user_id,
            holds: [],//持有的牌
            folds: [],//打出的牌
            angangs: [],//暗杠的牌
            angang_targets: [],
            diangangs: [],//点杠的牌
            diangang_targets: [],
            wangangs: [],//弯杠的牌
            wangang_targets: [],
            pengs: [],//碰了的牌
            peng_targets: [],
            que: -1,//缺一门
            huanpais: null,//换三张的牌
            countMap: {},//玩家手上的牌的数目，用于快速判定碰杠
            tingMap: {},//玩家听牌，用于快速判定胡了的番数
            pattern: "",
            canGang: false, //是否可以杠
            gangPai: [],//用于记录玩家可以杠的牌
            canPeng: false,//是否可以碰
            canHu: false, //是否可以胡
            canChuPai: false,//是否可以出牌
            //如果guoHuFan >=0 表示处于过胡状态，
            //如果过胡状态，那么只能胡大于过胡番数的牌
            guoHuFan: -1,
            hued: false, //是否胡了
            iszimo: false,//是否是自摸
            isGangHu: false,
            actions: [],
            fan: 0,
            score: 0,
            lastFangGangSeat: -1,
            trustee_times: 0,//托管，表示，服务器出牌次数，>=2会加快出牌
            // //统计信息
            // numZiMo: 0;
            // numJiePao: 0;
            // numDianPao: 0;
            // numAnGang: 0;
            // numMingGang: 0;
            // numChaJiao: 0;
        };
        delete gameSeatsOfUsers[user_id]
        gameSeatsOfUsers[user_id] = game.gameSeats[i];
    }
    games[roomId] = game;
    //洗牌
    shuffle(game);
    //发牌
    deal(game);



    var numOfMJ = game.mahjongs.length - game.currentIndex;
    var huansanzhang = RoomMgr.conf.hsz;
    // console.log(game);
    // console.log("===============game================")
    game.countdown = huansanzhang == true ? 16 : 10;
    for (var i = 0; i < seats.length; ++i) {
        //开局时，通知前端必要的数据
        let user_id = seats[i].userId;
        exports.gameSyncPush(user_id);
        UserMgr.sendMsg(user_id, 'countdown_push', game.countdown);
        //通知玩家手牌
        UserMgr.sendMsg(user_id, 'game_holds_push', game.gameSeats[i].holds);
        //通知还剩多少张牌
        UserMgr.sendMsg(user_id, 'mj_count_push', numOfMJ);
        //通知游戏开始
        UserMgr.sendMsg(user_id, 'game_begin_push', game.button);

        if (huansanzhang == true) {
            game.state = "huanpai";
            //通知准备换牌
            UserMgr.sendMsg(user_id, 'game_huanpai_push');
        }
        else {
            game.state = "dingque";
            //通知准备定缺
            UserMgr.sendMsg(user_id, 'game_dingque_push');
        }
    }
};

exports.huanSanZhang = function (userId, p1, p2, p3) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;
    if (game.state != "huanpai") {
        console.log("can't recv huansanzhang when game.state == " + game.state);
        return;
    }

    if (seatData.huanpais != null) {
        console.log("player has done this action.");
        return;
    }

    if (seatData.countMap[p1] == null || seatData.countMap[p1] == 0) {
        return;
    }
    seatData.countMap[p1]--;

    if (seatData.countMap[p2] == null || seatData.countMap[p2] == 0) {
        seatData.countMap[p1]++;
        return;
    }
    seatData.countMap[p2]--;

    if (seatData.countMap[p3] == null || seatData.countMap[p3] == 0) {
        seatData.countMap[p1]++;
        seatData.countMap[p2]++;
        return;
    }

    seatData.countMap[p1]++;
    seatData.countMap[p2]++;

    seatData.huanpais = [p1, p2, p3];

    for (var i = 0; i < seatData.huanpais.length; ++i) {
        var p = seatData.huanpais[i];
        var idx = seatData.holds.indexOf(p);
        seatData.holds.splice(idx, 1);
        seatData.countMap[p]--;
    }
    UserMgr.sendMsg(seatData.userId, 'game_holds_push', seatData.holds);

    for (var i = 0; i < game.gameSeats.length; ++i) {
        var sd = game.gameSeats[i];
        if (sd == seatData) {
            var rd = {
                si: seatData.userId,
                huanpais: seatData.huanpais
            };
            UserMgr.sendMsg(sd.userId, 'huanpai_notify', rd);
        }
        else {
            var rd = {
                si: seatData.userId,
                huanpais: []
            };
            UserMgr.sendMsg(sd.userId, 'huanpai_notify', rd);
        }
    }

    //如果还有未换牌的玩家，则继承等待
    for (var i = 0; i < game.gameSeats.length; ++i) {
        if (game.gameSeats[i].huanpais == null) {
            return;
        }
    }


    //换牌函数
    var fn = function (s1, huanjin) {
        for (var i = 0; i < huanjin.length; ++i) {
            var p = huanjin[i];
            s1.holds.push(p);
            if (s1.countMap[p] == null) {
                s1.countMap[p] = 0;
            }
            s1.countMap[p]++;
        }
    }

    //开始换牌
    var f = Math.random();
    var s = game.gameSeats;
    var huanpaiMethod = 0;
    //对家换牌
    if (f < 0.33) {
        fn(s[0], s[2].huanpais);
        fn(s[1], s[3].huanpais);
        fn(s[2], s[0].huanpais);
        fn(s[3], s[1].huanpais);
        huanpaiMethod = 0;
    }
    //换下家的牌
    else if (f < 0.66) {
        fn(s[0], s[1].huanpais);
        fn(s[1], s[2].huanpais);
        fn(s[2], s[3].huanpais);
        fn(s[3], s[0].huanpais);
        huanpaiMethod = 1;
    }
    //换上家的牌
    else {
        fn(s[0], s[3].huanpais);
        fn(s[1], s[0].huanpais);
        fn(s[2], s[1].huanpais);
        fn(s[3], s[2].huanpais);
        huanpaiMethod = 2;
    }

    var rd = {
        method: huanpaiMethod,
    }
    game.huanpaiMethod = huanpaiMethod;

    game.state = "dingque";
    game.countdown = 10;
    for (var i = 0; i < s.length; ++i) {
        var userId = s[i].userId;
        UserMgr.sendMsg(userId, 'countdown_push', game.countdown);
        UserMgr.sendMsg(userId, 'game_huanpai_over_push', rd);

        UserMgr.sendMsg(userId, 'game_holds_push', s[i].holds);
        //通知准备定缺
        UserMgr.sendMsg(userId, 'game_dingque_push');
    }
};

exports.dingQue = function (userId, type) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;
    if (game.state != "dingque") {
        console.log("can't recv dingQue when game.state == " + game.state);
        return;
    }

    if (seatData.que < 0) {
        game.numOfQue++;
    }

    seatData.que = type;
    var player_count = RoomMgr.conf.player_count

    //检查玩家可以做的动作
    //如果4个人都定缺了，通知庄家出牌
    if (game.numOfQue == player_count) {
        var arr = [1, 1, 1, 1];
        for (var i = 0; i < game.gameSeats.length; ++i) {
            arr[i] = game.gameSeats[i].que;
            UserMgr.sendMsg(game.gameSeats[i].userId, "game_robot_dingque", game.gameSeats[i].que)
        }
        game.countdown = 16;
        UserMgr.broacastInRoom('countdown_push', game.countdown, seatData.userId, true);
        UserMgr.broacastInRoom('game_dingque_finish_push', arr, seatData.userId, true);
        UserMgr.broacastInRoom('game_playing_push', null, seatData.userId, true);
        //进行听牌检查
        for (var i = 0; i < game.gameSeats.length; ++i) {
            var duoyu = -1;
            var gs = game.gameSeats[i];
            if (gs.holds.length == 14) {
                duoyu = gs.holds.pop();
                gs.countMap[duoyu] -= 1;
            }
            checkCanTingPai(game, gs);
            if (duoyu >= 0) {
                gs.holds.push(duoyu);
                gs.countMap[duoyu]++;
            }
        }

        var turnSeat = game.gameSeats[game.turn];
        game.state = "playing";
        //通知玩家出牌方
        turnSeat.canChuPai = true;
        UserMgr.broacastInRoom('game_chupai_push', turnSeat.userId, turnSeat.userId, true);
        //检查是否可以暗杠或者胡
        //直杠
        checkCanAnGang(game, turnSeat);
        //检查胡 用最后一张来检查
        checkCanHu(game, turnSeat, turnSeat.holds[turnSeat.holds.length - 1]);
        //通知前端
        sendOperations(game, turnSeat, game.chuPai);
    }
    else {
        UserMgr.broacastInRoom('game_dingque_notify_push', seatData.userId, seatData.userId, true);
    }
};
//is_player:是否是玩家自己出牌
exports.chuPai = function (userId, pai, is_player) {

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

    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
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
    game.chupaiCnt++;
    seatData.guoHuFan = -1;

    seatData.holds.splice(index, 1);
    seatData.countMap[pai]--;
    game.chuPai = pai;
    game.peng = false;
    checkCanTingPai(game, seatData);

    UserMgr.broacastInRoom('game_chupai_notify_push', { user_id: seatData.userId, pai: pai }, seatData.userId, true);

    //如果出的牌可以胡，则算过胡
    if (seatData.tingMap[game.chuPai]) {
        seatData.guoHuFan = seatData.tingMap[game.chuPai].fan;
    }

    //检查是否有人要胡，要碰 要杠
    var hasActions = false;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        //玩家自己不检查
        if (game.turn == i) {
            continue;
        }
        var ddd = game.gameSeats[i];
        //已经和牌的不再检查
        if (ddd.hued) {
            continue;
        }

        checkCanHu(game, ddd, pai);
        if (seatData.lastFangGangSeat == -1) {
            if (ddd.canHu && ddd.guoHuFan >= 0 && ddd.tingMap[pai].fan <= ddd.guoHuFan) {
                console.log("ddd.guoHuFan:" + ddd.guoHuFan);
                ddd.canHu = false;
                UserMgr.sendMsg(ddd.userId, 'guohu_push');
            }
        }
        checkCanPeng(game, ddd, pai);
        checkCanDianGang(game, ddd, pai);
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

    //和的了，就不要再来了
    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
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

    //广播通知其它玩家
    UserMgr.broacastInRoom('peng_notify_push', { user_id: seatData.userId, pai: pai, target: game.turn }, seatData.userId, true);

    //碰的玩家打牌
    moveToNextUser(game, seatData.seatIndex);
    //听牌提示
    sendOperations(game, seatData);
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
    if (seatData.hued) {
        return false;
    }
    return true;
}

function checkCanQiangGang(game, turnSeat, seatData, pai) {
    var hasActions = false;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        //杠牌者不检查
        if (seatData.seatIndex == i) {
            continue;
        }
        var ddd = game.gameSeats[i];
        //已经和牌的不再检查
        if (ddd.hued) {
            continue;
        }

        checkCanHu(game, ddd, pai);
        if (ddd.canHu) {
            sendOperations(game, ddd, pai);
            hasActions = true;
        }
    }
    if (hasActions) {
        game.qiangGangContext = {
            turnSeat: turnSeat,
            seatData: seatData,
            pai: pai,
            isValid: true,
        }
    }
    else {
        game.qiangGangContext = null;
    }
    return game.qiangGangContext != null;
}

function doGang(game, turnSeat, seatData, gangtype, numOfCnt, pai) {
    var seatIndex = seatData.seatIndex;
    var gameTurn = turnSeat.seatIndex;
    var gang_target = gameTurn;

    var isZhuanShouGang = false;
    if (gangtype == "wangang") {
        var idx = seatData.pengs.indexOf(pai);
        if (idx >= 0) {
            seatData.pengs.splice(idx, 1);
            gang_target = seatData.peng_targets[idx];
            seatData.peng_targets.splice(idx, 1);
        }

        //如果最后一张牌不是杠的牌，则认为是转手杠
        if (seatData.holds[seatData.holds.length - 1] != pai) {
            isZhuanShouGang = true;
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

    //记录下玩家的杠牌
    if (gangtype == "angang") {
        seatData.angangs.push(pai);
        seatData.angang_targets.push(gang_target)
        var ac = recordUserAction(game, seatData, "angang");
        ac.score = RoomMgr.conf.base_score * 2;
        realTimeCalGang(game, seatData, ac, "angang", gang_target)
    }
    else if (gangtype == "diangang") {
        seatData.diangangs.push(pai);
        seatData.diangang_targets.push(gang_target)
        var ac = recordUserAction(game, seatData, "diangang", gameTurn);
        ac.score = RoomMgr.conf.base_score * 2;
        var fs = turnSeat;
        recordUserAction(game, fs, "fanggang", seatIndex);
        realTimeCalGang(game, seatData, ac, "diangang", gang_target)
    }
    else if (gangtype == "wangang") {
        seatData.wangangs.push(pai);
        seatData.wangang_targets.push(gang_target)
        if (isZhuanShouGang == false) {
            var ac = recordUserAction(game, seatData, "wangang");
            ac.score = RoomMgr.conf.base_score;
            realTimeCalGang(game, seatData, ac, "wangang", gang_target)
        }
        else {
            recordUserAction(game, seatData, "zhuanshougang");
        }
    }

    checkCanTingPai(game, seatData);
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

    //和的了，就不要再来了
    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
        return;
    }

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
            var ddd = game.gameSeats[seat_index];
            if (ddd.canHu && seat_index != seatData.seatIndex) {
                return;
            }
        }
    }

    var numOfCnt = seatData.countMap[pai];

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

    game.chuPai = -1;
    clearAllOptions(game);
    seatData.canChuPai = false;

    UserMgr.broacastInRoom('hangang_notify_push', seatIndex, seatData.userId, true);

    //如果是弯杠，则需要检查是否可以抢杠
    var turnSeat = game.gameSeats[game.turn];
    if (numOfCnt == 1) {
        var canQiangGang = checkCanQiangGang(game, turnSeat, seatData, pai);
        if (canQiangGang) {
            return;
        }
    }

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

    //和的了，就不要再来了
    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
        return;
    }

    //标记为和牌
    seatData.hued = true;
    var hupai = game.chuPai;
    var isZimo = false;

    var turnSeat = game.gameSeats[game.turn];
    seatData.isGangHu = turnSeat.lastFangGangSeat >= 0;
    var notify = -1;

    if (game.qiangGangContext != null) {
        var gangSeat = game.qiangGangContext.seatData;
        hupai = game.qiangGangContext.pai;
        notify = hupai;
        var ac = recordUserAction(game, seatData, "qiangganghu", gangSeat.seatIndex);
        ac.iszimo = false;
        seatData.isQiangGangHu = true;
        game.qiangGangContext.isValid = false;


        var idx = gangSeat.holds.indexOf(hupai);
        if (idx != -1) {
            gangSeat.holds.splice(idx, 1);
            gangSeat.countMap[hupai]--;
            UserMgr.sendMsg(gangSeat.userId, 'game_holds_push', gangSeat.holds);
        }
        //将牌添加到玩家的手牌列表，供前端显示
        seatData.holds.push(hupai);
        if (seatData.countMap[hupai]) {
            seatData.countMap[hupai]++;
        }
        else {
            seatData.countMap[hupai] = 1;
        }

        recordUserAction(game, gangSeat, "beiqianggang", seatIndex);
    }
    else if (game.chuPai == -1) {
        hupai = seatData.holds[seatData.holds.length - 1];
        notify = -1;
        if (seatData.isGangHu) {
            if (turnSeat.lastFangGangSeat == seatIndex) {
                var ac = recordUserAction(game, seatData, "ganghua");
                ac.iszimo = true;
            }
            else {
                var diangganghua_zimo = RoomMgr.conf.dianganghua == 1;
                if (diangganghua_zimo) {
                    var ac = recordUserAction(game, seatData, "dianganghua");
                    ac.iszimo = true;
                }
                else {
                    var ac = recordUserAction(game, seatData, "dianganghua", turnSeat.lastFangGangSeat);
                    ac.iszimo = false;
                }
            }
        }
        else {
            var ac = recordUserAction(game, seatData, "zimo");
            ac.iszimo = true;
        }

        isZimo = true;
    }
    else {
        notify = game.chuPai;
        //将牌添加到玩家的手牌列表，供前端显示
        seatData.holds.push(game.chuPai);
        if (seatData.countMap[game.chuPai]) {
            seatData.countMap[game.chuPai]++;
        }
        else {
            seatData.countMap[game.chuPai] = 1;
        }

        console.log(seatData.holds);

        var at = "hu";
        //炮胡
        if (turnSeat.lastFangGangSeat >= 0) {
            at = "gangpaohu";
        }

        var ac = recordUserAction(game, seatData, at, game.turn);
        ac.iszimo = false;

        //毛转雨
        if (turnSeat.lastFangGangSeat >= 0) {
            for (var i = turnSeat.actions.length - 1; i >= 0; --i) {
                var t = turnSeat.actions[i];
                if (t.type == "diangang" || t.type == "wangang" || t.type == "angang") {
                    t.state = "nop";
                    t.payTimes = 0;

                    var nac = {
                        type: "maozhuanyu",
                        owner: turnSeat,
                        ref: t
                    }
                    seatData.actions.push(nac);
                    break;
                }
            }
        }

        //记录玩家放炮信息
        var fs = game.gameSeats[game.turn];
        recordUserAction(game, fs, "fangpao", seatIndex);

        game.fangpaoshumu++;

        if (game.fangpaoshumu > 1) {
            game.yipaoduoxiang = seatIndex;
        }
    }

    if (game.firstHupai < 0) {
        game.firstHupai = seatIndex;
    }

    //保存番数
    var ti = seatData.tingMap[hupai];
    seatData.fan = ti.fan;
    seatData.pattern = ti.pattern;
    seatData.iszimo = isZimo;
    //如果是最后一张牌，则认为是海底胡
    seatData.isHaiDiHu = game.currentIndex == game.mahjongs.length;
    game.hupaiList.push(seatData.seatIndex);

    if (RoomMgr.conf.tiandihu) {
        if (game.chupaiCnt == 0 && game.button == seatData.seatIndex && game.chuPai == -1) {
            seatData.isTianHu = true;
        }
        else if (game.chupaiCnt == 1 && game.turn == game.button && game.button != seatData.seatIndex && game.chuPai != -1) {
            seatData.isDiHu = true;
        }
    }

    clearAllOptions(game, seatData);

    game.hu_info.push({ seatindex: seatIndex, iszimo: isZimo, hupai: notify })
    UserMgr.sendMsg(seatData.userId, "guo_result");

    if (game.lastHuPaiSeat == -1) {
        game.lastHuPaiSeat = seatIndex;
    }
    else {
        var player_count = RoomMgr.conf.player_count
        var lp = (game.lastFangGangSeat - game.turn + player_count) % player_count;
        var cur = (seatData.seatIndex - game.turn + player_count) % player_count;
        if (cur > lp) {
            game.lastHuPaiSeat = seatData.seatIndex;
        }
    }

    //清空所有非胡牌操作
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ddd = game.gameSeats[i];
        ddd.canPeng = false;
        ddd.canGang = false;
        ddd.canChuPai = false;
        sendOperations(game, ddd, hupai);
    }

    //如果还有人可以胡牌，则等待
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ddd = game.gameSeats[i];
        if (ddd.canHu) {
            return;
        }
    }

    if (game.hu_info.length == 1) {
        //通知前端，有人和牌了
        let hu_seat_data = game.gameSeats[game.hu_info[0].seatindex]
        // RoomMgr.setUserGaming(hu_seat_data.userId, false);
        UserMgr.broacastInRoom('hu_push', game.hu_info[0], hu_seat_data.userId, true);
        realTimeCalPinHu(game, hu_seat_data);
        game.hu_info = [];
    }
    else if (game.hu_info.length > 1) {
        realTimeCalYiPaoDuoXiang(game);
        game.hu_info = [];
    }

    //如果只有一家没有胡，则结束
    var numOfHued = 0;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ddd = game.gameSeats[i];
        if (ddd.hued) {
            numOfHued++;
        }
    }
    //和了三家
    if (numOfHued == game.gameSeats.length - 1 || numOfHued == game.gameSeats.length) {
        doGameOver(game, seatData.userId);
        return;
    }

    //和牌的下家继续打
    clearAllOptions(game);
    game.turn = game.lastHuPaiSeat;
    moveToNextUser(game);
    doUserMoPai(game);
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
    clearAllOptions(game, seatData);

    //这里还要处理过胡的情况
    if (game.chuPai >= 0 && seatData.canHu) {
        seatData.guoHuFan = seatData.tingMap[game.chuPai].fan;
    }

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

    if (game.hu_info.length == 1) {
        //通知前端，有人和牌了
        let hu_sd = game.gameSeats[game.hu_info[0].seatindex]
        // RoomMgr.setUserGaming(hu_sd.userId, false);
        UserMgr.broacastInRoom('hu_push', { seatindex: game.hu_info[0].seatindex, iszimo: game.hu_info[0].iszimo, hupai: game.hu_info[0].hupai }, hu_sd.userId, true);
        realTimeCalPinHu(game, hu_sd);
        game.hu_info = [];
    }
    else if (game.hu_info.length > 1) {
        realTimeCalYiPaoDuoXiang(game);
        game.hu_info = [];
    }

    //如果是已打出的牌，则需要通知。
    if (game.chuPai >= 0) {
        var uid = game.gameSeats[game.turn].userId;
        UserMgr.broacastInRoom('guo_notify_push', { user_id: uid, pai: game.chuPai }, seatData.userId, true);
        seatData.folds.push(game.chuPai);
        game.chuPai = -1;
    }

    var qiangGangContext = game.qiangGangContext;
    //清除所有的操作
    clearAllOptions(game);

    if (qiangGangContext != null && qiangGangContext.isValid) {
        doGang(game, qiangGangContext.turnSeat, qiangGangContext.seatData, "wangang", 1, qiangGangContext.pai);
    }
    else {
        //下家摸牌
        moveToNextUser(game);
        doUserMoPai(game);
    }


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
        seatData.trustee_times = 2;
        UserMgr.broacastInRoom('trustee_push', { is_trustee: is_trustee, user_id: user_id }, user_id, true)
    }
    if (is_trustee == false || is_trustee == "false") {
        seatData.trustee_times = 0;
        UserMgr.broacastInRoom('trustee_push', { is_trustee: is_trustee, user_id: user_id }, user_id, true)
    }
}

//换牌倒计时结束处理
function countdownHuanPai(gameSeats) {
    for (let i = 0; i < gameSeats.length; ++i) {
        let seat = gameSeats[i];
        if (seat.huanpais == null) {
            let counts = [{ count: 0, type: 0 }, { count: 0, type: 1 }, { count: 0, type: 2 },]

            for (const key in seat.countMap) {
                let type = getMJType(key)
                if (type != null) {
                    counts[type].count += seat.countMap[key];
                }
            }
            counts.sort((a, b) => {
                return a.count - b.count;
            });
            for (let j = 0; j < counts.length; ++j) {
                if (counts[j].count >= 3) {
                    let huanpais = [-1, -1, -1];
                    let idx = 0;
                    let type = counts[j].type
                    for (let pai = 9 * type; pai < 9 * (type + 1); ++pai) {
                        if (seat.countMap[pai] != null && seat.countMap[pai] > 0) {
                            for (let pai_count = 0; pai_count < seat.countMap[pai]; ++pai_count) {
                                huanpais[idx] = pai;
                                ++idx
                                if (idx == 3) {
                                    exports.huanSanZhang(seat.userId, huanpais[0], huanpais[1], huanpais[2])
                                    break;
                                }
                            }
                        }
                    }
                    break;
                }
            }
        }
    }
}

function countdownDingQue(gameSeats) {
    for (let i = 0; i < gameSeats.length; ++i) {
        let seat = gameSeats[i];
        if (seat.que == -1) {
            let counts = [0, 0, 0];
            for (const key in seat.countMap) {
                let type = getMJType(key)
                if (type != null) {
                    counts[type] += seat.countMap[key];
                }
            }
            let que = 0
            for (let j = 1; j < 3; ++j) {
                if (counts[j] < counts[que]) {
                    que = j;
                }
            }
            exports.dingQue(seat.userId, que)
        }
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
        if (getMJType(holds[holds_count - 1]) == curr_seat.que) {
            exports.chuPai(curr_user_id, holds[holds_count - 1]);
            return;
        }
        for (let i = 0; i < holds_count; ++i) {
            let pai = holds[i];
            if (getMJType(pai) == curr_seat.que) {
                exports.chuPai(curr_user_id, pai);
                return;
            }
        }

        let max_pai = holds[holds_count - 1];
        if (game.peng == true) {
            max_pai = holds[0];
            for (let idx = 1; idx < holds.length; idx++) {
                if (max_pai < holds[idx] && getMJType(holds[idx]) != curr_seat.que) {
                    max_pai = holds[idx];
                }
            }
        }
        exports.chuPai(curr_user_id, max_pai);
    }
}

function update() {
    for (const key in games) {
        let game = games[key];
        if (game.countdown == 0) {
            game.countdown = -1;
            if (game.state == "huanpai") {
                countdownHuanPai(game.gameSeats)
            }
            else if (game.state == "dingque") {
                countdownDingQue(game.gameSeats)
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

function dealScoreChange(win_seat, lose_seat, score) {
    if (lose_seat.coins < score && RoomMgr.conf.is_free == false) {
        score = lose_seat.coins;
        NoticeUserCoinsLess(lose_seat.userId)
    }
    lose_seat.coins += -score;
    win_seat.coins += score;

    lose_seat.score += -score;
    win_seat.score += score;

    let lose_user = RoomMgr.getUserInfo(lose_seat.userId);
    if (lose_user != null) {
        lose_user.coins = lose_seat.coins;
        if (RoomMgr.conf.is_free == false) {
            HallSocket.sendUserCoins(lose_user.account, lose_user.coins);
        }
    }

    let win_user = RoomMgr.getUserInfo(win_seat.userId);
    if (win_user != null) {
        win_user.coins = win_seat.coins;
        if (RoomMgr.conf.is_free == false) {
            HallSocket.sendUserCoins(win_user.account, win_user.coins);
        }
    }

    return score
}

function realTimeCalGang(game, seatData, ac, type, target) {

    ac.scores = []
    for (let i = 0; i < RoomMgr.conf.player_count; ++i) {
        ac.scores[i] = 0;
    }

    if (type == "diangang") {
        let lose_seat = game.gameSeats[target]
        let score = dealScoreChange(seatData, lose_seat, ac.score)
        ac.scores[seatData.seatIndex] += score;
        ac.scores[lose_seat.seatIndex] += -score;
    }
    else {
        for (let seat_idx = 0; seat_idx < ac.targets.length; ++seat_idx) {
            //如果当前玩家的金币不足扣，就需要进行充值
            let lose_seat = game.gameSeats[ac.targets[seat_idx]];
            let score = dealScoreChange(seatData, lose_seat, ac.score)
            ac.scores[seatData.seatIndex] += score;
            ac.scores[lose_seat.seatIndex] += -score;
        }
    }

    let change_type = "One2One"
    if (ac.targets.length > 1) {
        change_type = "Two2One"
    }
    UserMgr.broacastInRoom('score_change_push', { change_type: change_type, scores: ac.scores }, seatData.userId, true);
    checkGameOver(game, seatData.userId);
}

function calFan(seatData) {

    var sd = seatData;

    //统计自己的番子和分数
    //基础番(平胡0番，对对胡1番、七对2番) + 清一色2番 + 杠+1番
    //杠上花+1番，杠上炮+1番 抢杠胡+1番，金钩胡+1番，海底胡+1番
    //天胡3番，地胡2番
    var fan = sd.fan;
    if (isQingYiSe(sd)) {
        sd.qingyise = true;
        fan += 2;
    }

    var numOfGangs = sd.diangangs.length + sd.wangangs.length + sd.angangs.length;
    for (var j = 0; j < sd.pengs.length; ++j) {
        var pai = sd.pengs[j];
        if (sd.countMap[pai] == 1) {
            numOfGangs++;
        }
    }
    for (var k in sd.countMap) {
        if (sd.countMap[k] == 4) {
            numOfGangs++;
        }
    }
    sd.numofgen = numOfGangs;

    //金钩胡
    if (sd.holds.length == 1 || sd.holds.length == 2) {
        fan += 1;
        sd.isJinGouHu = true;
    }

    if (sd.isHaiDiHu) {
        fan += 1;
    }

    if (RoomMgr.conf.tiandihu) {
        if (sd.isTianHu) {
            fan += 3;
        }
        else if (sd.isDiHu) {
            fan += 2;
        }
    }

    var isjiangdui = false;
    if (RoomMgr.conf.jiangdui) {
        if (sd.pattern == "7pairs") {
            if (sd.numofgen > 0) {
                sd.numofgen -= 1;
                sd.pattern == "l7pairs";
                isjiangdui = isJiangDui(sd);
                if (isjiangdui) {
                    sd.pattern == "j7paris";
                    fan += 2;
                }
                else {
                    fan += 1;
                }
            }
        }
        else if (sd.pattern == "duidui") {
            isjiangdui = isJiangDui(sd);
            if (isjiangdui) {
                sd.pattern = "jiangdui";
                fan += 2;
            }
        }
    }

    if (RoomMgr.conf.menqing) {
        //不是将对，才检查中张
        if (!isjiangdui) {
            sd.isZhongZhang = isZhongZhang(sd);
            if (sd.isZhongZhang) {
                fan += 1;
            }
        }

        sd.isMenQing = isMenQing(sd);
        if (sd.isMenQing) {
            fan += 1;
        }
    }

    fan += sd.numofgen;
    if (sd.isGangHu) {
        fan += 1;
    }
    if (sd.isQiangGangHu) {
        fan += 1;
    }
    return fan;
}

function realTimeCalPinHu(game, seatData) {
    var base_score = RoomMgr.conf.base_score;

    if (seatData.hued == false) {
        return
    }

    let fan = calFan(seatData)

    let ac = null;
    for (let ac_idx = seatData.actions.length - 1; ac_idx >= 0; --ac_idx) {
        ac = seatData.actions[ac_idx]
        if (ac.type == "zimo" || ac.type == "hu" || ac.type == "ganghua" || ac.type == "dianganghua" || ac.type == "gangpaohu" || ac.type == "qiangganghu") {
            ac = seatData.actions[ac_idx];
            break;
        }
    }
    if (ac != null) {
        var extraScore = 0;
        if (ac.iszimo) {
            if (RoomMgr.conf.zimo == 0) {
                //自摸加底
                extraScore = base_score;
            }
            if (RoomMgr.conf.zimo == 1) {
                fan += 1;
            }
            else {
                //nothing.
            }
        }

        var score = computeFanScore(game, fan) + extraScore;

        ac.scores = []
        for (let i = 0; i < RoomMgr.conf.player_count; ++i) {
            ac.scores[i] = 0;
        }

        for (let t = 0; t < ac.targets.length; ++t) {
            let lose_idx = ac.targets[t];
            let lose_seat = game.gameSeats[lose_idx];
            let mazhuanyu_ac = null;
            if (ac.type == "gangpaohu") {
                for (let j = seatData.actions.length - 1; j > 0; --j) {
                    if (seatData.actions[j].type == "maozhuanyu" && seatData.actions[j].owner == lose_seat) {
                        score += seatData.actions[j].ref.scores[lose_idx]
                        break;
                    }
                }
            }
            let _score = dealScoreChange(seatData, lose_seat, score);
            ac.scores[seatData.seatIndex] += _score;
            ac.scores[lose_seat.seatIndex] += -_score;
        }
        let change_type = "One2One";
        if (ac.targets.length > 1) {
            change_type = "Two2One";
        }
        UserMgr.broacastInRoom('score_change_push', { change_type: change_type, scores: ac.scores }, seatData.userId, true)
    }
    // if (fan > RoomMgr.conf.maxFan) {
    //     fan = RoomMgr.conf.maxFan;
    // }
    //一定要用 += 。 因为此时的sd.score可能是负的
    if (seatData.pattern != null) {
        seatData.fan = fan;
    }
}

function checkGameOver(game, user_id) {
    let hued_num = 0;
    for (let i = 0; i < game.gameSeats.length; ++i) {
        if (game.gameSeats[i].hued == true) {
            hued_num++;
        }
    }
    if (hued_num == game.gameSeats.length - 1 || hued_num == game.gameSeats.length) {
        doGameOver(game, user_id);
    }
}

function realTimeCalYiPaoDuoXiang(game) {

    let actions = {};
    let hu_info = game.hu_info;
    let total_lose_score = 0;
    let targets = [];
    let lose_seat = game.gameSeats[game.turn];

    for (let index = 0; index < hu_info.length; index++) {
        let seat_index = hu_info[index].seatindex;
        let iszimo = hu_info[index].iszimo;
        let hupai = hu_info[index].hupai;
        let seatData = game.gameSeats[seat_index];
        let fan = calFan(seatData)

        let ac = null;
        for (let ac_idx = seatData.actions.length - 1; ac_idx >= 0; --ac_idx) {
            ac = seatData.actions[ac_idx];
            if (ac.type == "zimo" || ac.type == "hu" || ac.type == "ganghua" || ac.type == "dianganghua" || ac.type == "gangpaohu" || ac.type == "qiangganghu") {
                ac = seatData.actions[ac_idx];
                break;
            }
        }
        if (ac != null) {
            var score = computeFanScore(game, fan)
            if (ac.type == "gangpaohu") {
                for (let j = seatData.actions.length - 1; j > 0; --j) {
                    if (seatData.actions[j].type == "maozhuanyu" && seatData.actions[j].owner == lose_seat) {
                        score += seatData.actions[j].ref.scores[lose_seat.seatIndex]
                        break;
                    }
                }
            }
            ac.score = score;
            actions[seatData.seatIndex] = ac;
            total_lose_score += ac.score;
            targets.push(seat_index);
        }
        // if (fan > RoomMgr.conf.maxFan) {
        //     fan = RoomMgr.conf.maxFan;
        // }
        //一定要用 += 。 因为此时的sd.score可能是负的
        if (seatData.pattern != null) {
            seatData.fan = fan;
        }
    }

    let ac = null;

    ac = recordUserAction(game, lose_seat, "yipaoduoxiang", targets)

    ac.scores = [];

    for (let i = 0; i < RoomMgr.conf.player_count; i++) {
        ac.scores[i] = 0
    }

    if (lose_seat.coins < total_lose_score && RoomMgr.conf.is_free == false) {
        NoticeUserCoinsLess(lose_seat.userId);
        for (const seat_index in actions) {
            let score = Math.floor(actions[seat_index].score / total_lose_score * lose_seat.coins);
            ac.scores[seat_index] += score;
            ac.scores[lose_seat.seatIndex] += -score;
        }
    }
    else {
        for (const seat_index in actions) {
            ac.scores[seat_index] += actions[seat_index].score;
            ac.scores[lose_seat.seatIndex] += -actions[seat_index].score;
        }
    }

    for (let i = 0; i < ac.scores.length; ++i) {
        let sd = game.gameSeats[i];
        sd.coins += ac.scores[i];
        sd.score += ac.scores[i];
        let user = RoomMgr.getUserInfo(sd.userId);
        if (user != null) {
            user.coins = sd.coins;
            if (RoomMgr.conf.is_free == false) {
                HallSocket.sendUserCoins(user.account, user.coins)
            }
        }
    }
    console.log("yipaoduoxiang")
    console.log({ change_type: "One2Two", scores: ac.scores })
    UserMgr.broacastInRoom('score_change_push', { change_type: "One2Two", scores: ac.scores }, game.gameSeats[0].userId, true)
    for (let index = 0; index < hu_info.length; index++) {
        let gs = game.gameSeats[hu_info[index].seatindex];
        // RoomMgr.setUserGaming(gs.userId, false);
        UserMgr.broacastInRoom('hu_push', { seatindex: hu_info[index].seatindex, iszimo: hu_info[index].iszimo, hupai: hu_info[index].hupai }, gs.userId, true);
    }
}

function realTimeCalculateResult(game) {

    var isNeedChaDaJia = needChaDaJiao(game);
    //如果有杠分没叫的情况先退杠分
    //退分流程
    //1.查找需要退分的玩家，并记录玩家当前金币数量和需要退给各玩家的金币数和总金币数
    //tuifen_obj[i] = {coins:coins,total_tuifen:total_tuifen,tuifen_arr:[]}
    //流局的情况下才退分
    if (game.currentIndex == game.mahjongs.length) {
        let tuifen_obj = {}
        for (var i = 0; i < game.gameSeats.length; ++i) {
            var sd = game.gameSeats[i];
            if (isTinged(sd) == false && sd.hued == false /*&& sd.no_coins == false*/) {
                let tuifen_arr = [];
                let total_tuifen = 0;
                for (let index = 0; index < RoomMgr.conf.player_count; index++) {
                    tuifen_arr[index] = 0;
                }
                for (var a = sd.actions.length - 1; a >= 0; --a) {
                    let ac = sd.actions[a];
                    if (ac.type == "diangang" || ac.type == "angang" || ac.type == "wangang") {

                        let tuifen_ac = recordUserAction(game, sd, "tuifen", ac.targets);
                        tuifen_ac.scores = [];
                        //这里退分是为了把杠的分还回去，所以用负的
                        for (let j = 0; j < ac.scores.length; ++j) {
                            tuifen_ac.scores[j] = -ac.scores[j];
                            tuifen_arr[j] += -ac.scores[j];
                        }
                        total_tuifen += ac.scores[sd.seatIndex];
                    }
                }
                if (total_tuifen != 0) {
                    tuifen_obj[i] = {
                        coins: sd.coins,
                        total_tuifen: total_tuifen,
                        tuifen_arr: tuifen_arr
                    }
                }
            }
        }
        //2.如果金币不够退的情况下，按照比例退分
        for (const lose_idx in tuifen_obj) {
            let coins = tuifen_obj[lose_idx].coins;
            let total_tuifen = tuifen_obj[lose_idx].total_tuifen;
            let tuifen_arr = tuifen_obj[lose_idx].tuifen_arr;
            let win_count = 0;
            tuifen_arr[lose_idx] = 0;
            for (const win_idx in tuifen_arr) {
                if (tuifen_arr[win_idx] <= 0) {
                    continue;
                }
                win_count++;
                let tuifen = tuifen_arr[win_idx];
                if (RoomMgr.conf.is_free == false && coins < total_tuifen) {
                    tuifen = Math.floor(tuifen / total_tuifen * coins);
                }
                tuifen_arr[win_idx] = tuifen;
                let win_seat = game.gameSeats[win_idx];
                win_seat.coins += tuifen;
                win_seat.score += tuifen;
                let win_user = RoomMgr.getUserInfo(win_seat.user_id)
                if (win_user != null) {
                    win_user.coins = win_seat.coins;
                    if (RoomMgr.conf.is_free == false) {
                        HallSocket.sendUserCoins(win_user.account, win_user.coins);
                    }
                }

                tuifen_arr[lose_idx] += -tuifen;
                let lose_seat = game.gameSeats[lose_idx];
                lose_seat.coins += -tuifen;
                lose_seat.score += -tuifen;
                let lose_user = RoomMgr.getUserInfo(lose_seat.user_id)
                if (lose_user != null) {
                    lose_user.coins = lose_seat.coins;
                    if (RoomMgr.conf.is_free == false) {
                        HallSocket.sendUserCoins(lose_user.account, lose_user.coins);
                    }
                }
            }
            let change_type = "One2One";
            if (win_count > 1) {
                change_type = "One2Two";
            }
            UserMgr.broacastInRoom('score_change_push', { change_type: change_type, scores: tuifen_arr }, sd.userId, true)
        }
    }
    //若果查大叫，计算查大叫的分数
    if (isNeedChaDaJia) {
        chaJiao(game);
        //统计查叫的情况
        let chajia_obj_ac = {};
        let chajiao_score = 0;
        for (var i = 0; i < game.gameSeats.length; ++i) {
            let scores = [];
            for (let index = 0; index < RoomMgr.conf.player_count; index++) {
                scores[index] = 0;
            }
            let sd = game.gameSeats[i];
            if (isTinged(sd) == true) {
                for (let ac_idx = sd.actions.length - 1; ac_idx >= 0; --ac_idx) {
                    let ac = sd.actions[ac_idx]
                    if (ac.type == "chadajiao") {
                        let fan = calFan(sd);
                        ac = sd.actions[ac_idx];
                        ac.score = computeFanScore(game, fan);
                        ac.scores = scores;
                        chajiao_score += ac.score;
                        chajia_obj_ac[i] = ac;
                        sd.fan = fan;
                        break;
                    }
                }
            }
        }

        //查大叫分数比例计算
        let lose_coins = {}
        for (const win_idx in chajia_obj_ac) {
            let ac = chajia_obj_ac[win_idx];
            for (const _key in ac.targets) {
                let lose_idx = ac.targets[_key];
                let lose_seat = game.gameSeats[lose_idx];
                lose_coins[lose_idx] = lose_seat.coins;
            }
            break;
        }

        for (const win_idx in chajia_obj_ac) {
            let win_seat = game.gameSeats[win_idx];
            let ac = chajia_obj_ac[win_idx];
            let count = ac.targets.length;
            for (const _key in ac.targets) {
                let lose_idx = ac.targets[_key];
                let lose_seat = game.gameSeats[lose_idx];
                let lose_score = 0;
                if (RoomMgr.conf.is_free == false && lose_coins[lose_idx] < chajiao_score) {
                    lose_score = Math.floor(lose_coins[lose_idx] * ac.score / chajiao_score);
                }
                else {
                    lose_score = ac.score;
                }
                ac.scores[lose_idx] += -lose_score;
                ac.scores[win_idx] += lose_score;

                win_seat.coins += lose_score;
                win_seat.score += lose_score;
                let win_user = RoomMgr.getUserInfo(win_seat.userId);
                if (win_user != null) {
                    win_user.coins = win_seat.coins;
                    if (RoomMgr.conf.is_free == false) {
                        HallSocket.sendUserCoins(win_user.account, win_user.coins);
                    }
                }

                lose_seat.coins += -lose_score;
                lose_seat.score += -lose_score;
                let lose_user = RoomMgr.getUserInfo(lose_seat.userId);
                if (lose_user != null) {
                    lose_user.coins = lose_seat.coins;
                    if (RoomMgr.conf.is_free == false) {
                        HallSocket.sendUserCoins(lose_user.account, lose_user.coins);
                    }
                }
            }
            let change_type = "One2One";
            if (count > 1) {
                change_type = "Two2One";
            }
            console.log({ change_type: change_type, scores: ac.scores })
            console.log("chadajiao")
            UserMgr.broacastInRoom('score_change_push', { change_type: change_type, scores: ac.scores }, win_seat.userId, true)
        }
    }
}

function NoticeUserCoinsLess(user_id) {
    let seatData = gameSeatsOfUsers[user_id]
    if (seatData == null) {
        console.log("seatData is null")
        return
    }
    // RoomMgr.setUserGaming(user_id, false);
    if (RoomMgr.conf.is_free == false) {
        seatData.hued = true;
        UserMgr.sendMsg(user_id, "notice", Notice.NoCoins);
    }
}
// function realTimeCalculateResult(game) {

//     var isNeedChaDaJia = needChaDaJiao(game);

//     //若果查大叫，计算查大叫的分数
//     if (isNeedChaDaJia) {
//         chaJiao(game);
//         //如果有杠分没叫的情况先退杠分
//         let gang_arr_scores = [];
//         for (var i = 0; i < game.gameSeats.length; ++i) {
//             var sd = game.gameSeats[i];
//             if (isTinged(sd) == false) {
//                 let is_tuifen = false;
//                 let scores = [];
//                 for (let index = 0; index < RoomMgr.conf.player_count; index++) {
//                     scores[index] = 0;
//                 }
//                 for (var a = sd.actions.length - 1; a >= 0; --a) {
//                     let ac = sd.actions[a];
//                     if (ac.type == "diangang" || ac.type == "angang" || ac.type == "wangang") {
//                         for (let j = 0; j < ac.scores.length; ++j) {
//                             scores[j] += -ac.scores[j];
//                         }
//                         is_tuifen = true;
//                     }
//                 }
//                 if (is_tuifen == true) {
//                     let tuifen_ac = recordUserAction(game, sd, "tuifen");
//                     tuifen_ac.scores = scores;
//                     gang_arr_scores.push(scores);
//                     for (let j = 0; j < scores.length; ++j) {
//                         if (scores[j] != 0) {
//                             let gs = game.gameSeats[j];
//                             gs.coins += scores[j];
//                             gs.score += scores[j];
//                             let user = RoomMgr.getUserInfo(gs.user_id)
//                             if (user != null) {
//                                 user.coins = gs.coins;
//                                 if (RoomMgr.conf.is_free == false) {
//                                     HallSocket.sendUserCoins(user.account, user.coins);
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//         //查大叫
//         let chajia_arr_scores = [];
//         for (let index = 0; index < RoomMgr.conf.player_count; index++) {
//             chajia_arr_scores[index] = 0;
//         }
//         //统计查叫的情况
//         let chajia_obj_ac = {};
//         let chajiao_score = 0;
//         //查叫赢分人的个数
//         let chajia_win_count = 0;
//         //查叫输分人的个数
//         let chajia_lose_count = 0;
//         for (var i = 0; i < game.gameSeats.length; ++i) {
//             let scores = [];
//             for (let index = 0; index < RoomMgr.conf.player_count; index++) {
//                 scores[index] = 0;
//             }
//             let sd = game.gameSeats[i];
//             if (isTinged(sd) == true) {
//                 for (let ac_idx = sd.actions.length - 1; ac_idx >= 0; --ac_idx) {
//                     let ac = sd.actions[ac_idx]
//                     if (ac.type == "chadajiao") {
//                         let fan = calFan(sd);
//                         ac = sd.actions[ac_idx];
//                         ac.score = computeFanScore(game, fan);
//                         ac.scores = scores;
//                         chajiao_score += ac.score;
//                         chajia_obj_ac[i] = ac;
//                         sd.fan += fan;
//                         break;
//                     }
//                 }
//             }
//         }
//         chajia_win_count = 0;
//         for (const key in chajia_obj_ac) {
//             // let win_seat = game.gameSeats[key];
//             let ac = chajia_obj_ac[key];
//             chajia_win_count++;
//             chajia_lose_count = ac.targets.length;
//             ac.targets.forEach((seat_idx) => {
//                 let lose_seat = game.gameSeats[seat_idx];
//                 let lose_score = 0;
//                 if (RoomMgr.conf.is_free == false && lose_seat.coins < chajiao_score) {
//                     lose_score = Math.floor(lose_seat.coins * ac.score / chajiao_score);
//                 }
//                 else {
//                     lose_score = ac.score;
//                 }
//                 ac.scores[seat_idx] += -lose_score;
//                 ac.scores[key] += lose_score;

//                 chajia_arr_scores[seat_idx] += -lose_score;
//                 chajia_arr_scores[key] += lose_score;
//             })
//         }
//         //查大叫分数计算
//         for (let index = 0; index < chajia_arr_scores.length; index++) {
//             let sd = game.gameSeats[index];
//             sd.coins += chajia_arr_scores[index];
//             sd.score += chajia_arr_scores[index];
//             let user = RoomMgr.getUserInfo(sd.userId);
//             if (user != null) {
//                 user.coins = sd.coins;
//                 if (RoomMgr.conf.is_free == false) {
//                     HallSocket.sendUserCoins(user.account, user.coins);
//                 }
//             }
//         }

//         //通知退分分数变更
//         if (gang_arr_scores.length > 1) {
//             for (let index = 0; index < gang_arr_scores.length; index++) {
//                 let count = 0;
//                 gang_arr_scores[index].forEach(score => {
//                     if (score > 0) {
//                         count++;
//                     }
//                 })
//                 let change_type = "One2One";
//                 if (count > 1) {
//                     change_type = "One2Two";
//                 }
//                 console.log("退分")
//                 console.log({ change_type: change_type, scores: gang_arr_scores[index] })
//                 UserMgr.broacastInRoom('score_change_push', { change_type: change_type, scores: gang_arr_scores[index] }, game.gameSeats[0].userId, true)
//             }
//         }
//         //通知查大叫分数变更
//         let change_type = "";
//         let one_str = "One";
//         if (chajia_win_count > 1) {
//             one_str = "Two";
//         }
//         let two_str = "One";
//         if (chajia_lose_count > 1) {
//             two_str = "Two";
//         }
//         console.log("查大叫")
//         console.log({ change_type: one_str + "2" + two_str, scores: chajia_arr_scores })
//         UserMgr.broacastInRoom('score_change_push', { change_type: one_str + "2" + two_str, scores: chajia_arr_scores }, game.gameSeats[0].userId, true)
//     }
//     //总分数计算
//     // for (let sd in game.gameSeats) {
//     //     for (let ac in sd.actions) {
//     //         if (ac.scores != null) {
//     //             ac.scores.forEach(score => {
//     //                 sd.score += score;
//     //             })
//     //         }
//     //     }
//     // }
// }

setInterval(update, 1000);

exports.updateUserCoins = function (user_id, coins) {
    var seatData = gameSeatsOfUsers[user_id];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }
    seatData.coins += coins;
    if (seatData.coins <= 0 && RoomMgr.conf.is_free == false) {
        seatData.hued = true;
    }
}