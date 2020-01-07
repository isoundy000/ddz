var RoomMgr = require('../../common/coin_game/RoomMgr');
var UserMgr = require("../../common/usermgr");
var GameMgr = require("../../common/gamemgr");
var mjhulib = require("./mjlib_js/api").MHulib;
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
    //     15, 15, 15, 15,
    //     21, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
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
    var mj = game.mahjongs[game.mahjongs.length - 15]
    var hun = mj;
    if (mj == 8) {//9筒  0为9筒,然后1~8表示1-8筒
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

function checkQingYiSe(game, seatData) {
    var holds = seatData.holds;
    var count = holds.length;
    seataData.isqingYise = false;
    var tong = 0;
    var tiao = 0;
    var wan = 0;
    for (var i = 0; i < count; ++i) {
        if (0 < holds[i] && holds[i] <= 8) {
            console.log('清一色筒子!');
            tong++;
        }
        if (8 < holds[i] && holds[i] <= 17) {
            console.log('清一色条子!');
            tiao++;
        }
        if (17 < holds[i] && holds[i] <= 26) {
            console.log('清一色万子!');
            wan++;
        }
    }
    if (tong == count || tiao == count || wan == count) {
        console.log('判定为清一色+++++++++++');
        seataData.isqingYise = true;
    } else {
        console.log('不是清一色胡牌!!!');
    }

}

function checkCanHu(game, seatData, targetPai) {
    game.lastHuPaiSeat = -1;

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
        // console.log('进入到这一步了else');
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
    // setTingMap(turnSeat, pai);
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

function isTinged(seatData) {
    for (var k in seatData.tingMap) {
        return true;
    }
    return false;
}

//计算结算分数todo
function calculateResult(game) {
    var conf = RoomMgr.conf
    var baseScore = conf.base_score; //底分
    var beishu = conf.beishu; //倍数
    console.log('胡分倍数为++++++++++++++++++' + beishu);
    console.log('底分数为++++++++++++++++++' + baseScore);
    //杠跑=双方下跑+底分
    // var gangpao = conf.gangpao
    //七对加倍
    var qiduijiabei = conf.qiduijiabei
    //庄家加底：杠分和胡分再加一个底分
    // var zhuangjiajiadi = conf.zhuangjiajiadi
    //杠上花加倍
    var gangshanghuajiabei = conf.gangshanghuajiabei
    //清一色加倍
    var qingyisejiabei = conf.qingyisejiabei;
    //黄庄杠牌不得分。一般规则下：杠牌只扣底分不加倍
    //胡分=底分*倍数
    //加倍：底分*倍数
    // 杠分:底分
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
                    gameSeats[i].gangScore += gangFen;
                    gameSeats[targets[j]].gangScore -= gangFen;
                }
            }
            else if (action.type == "diangang" || action.type == "wangang") {
                var target = targets[0];
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

                        var target = k; //被胡的玩家
                        gameSeats[i].huScore += (beishu * baseScore);
                        gameSeats[target].huScore -= (beishu * baseScore);
                        console.log('基础自摸胡++++++++++++++++++++++');

                        if (qiduijiabei && gameSeats[i].tingMap[hu_data.pai].pattern["7pairs"]) { //七对加倍;
                            gameSeats[i].huScore += (beishu * baseScore);
                            gameSeats[target].huScore -= (beishu * baseScore);
                            console.log('自摸七对胡++++++++++++++++++++++');
                        }


                        if (gangshanghuajiabei && hu_data.isGangHua) { //杠上花加倍
                            gameSeats[i].huScore += (beishu * baseScore);
                            gameSeats[target].huScore -= (beishu * baseScore);
                            console.log('杠花胡++++++++++++++++++++++');
                        }
                        if (qingyisejiabei && gameSeats[i].tingMap[hu_data.pai].pattern["qingyise"]) { //清一色加倍
                            gameSeats[i].huScore += (beishu * baseScore);
                            gameSeats[target].huScore -= (beishu * baseScore);
                            console.log('自摸清一色胡++++++++++++++++++++++');
                        }
                    }
                }
            }
            else {

                var target = hu_data.target;
                gameSeats[i].huScore += (beishu * baseScore);
                gameSeats[target].huScore -= (beishu * baseScore);
                console.log('基础胡++++++++++++++++++++++');

                if (qiduijiabei && gameSeats[i].tingMap[hu_data.pai].pattern["7pairs"]) { //七对加倍;
                    gameSeats[i].huScore += (beishu * baseScore);
                    gameSeats[target].huScore -= (beishu * baseScore);
                    console.log('七对胡++++++++++++++++++++++');
                }
                if (qingyisejiabei && gameSeats[i].tingMap[hu_data.pai].pattern["qingyise"]) { //清一色加倍
                    gameSeats[i].huScore += (beishu * baseScore);
                    gameSeats[target].huScore -= (beishu * baseScore);
                    console.log('清一色胡++++++++++++++++++++++');
                }

            }
        }
    }
    for (var i = 0; i < game.gameSeats.length; ++i) {
        gameSeats[i].score = gameSeats[i].huScore + gameSeats[i].gangScore;
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


    if (game != null) {

        calculateResult(game, roomInfo);

        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var sd = game.gameSeats[i];
            // if (RoomMgr.conf.is_free == false) {  //收费
            var userRT = {
                userId: sd.userId,
                name: sd.name,
                pengs: sd.pengs,
                wangangs: sd.wangangs,
                diangangs: sd.diangangs,
                angangs: sd.angangs,
                holds: sd.holds,
                score: sd.score,
                huScore: sd.huScore,
                gangScore: sd.gangScore,
                hu_data: sd.hu_data,
            }
            // }
            // else {                          //免费
            //     var userRT = {
            //         userId: sd.userId,
            //         pengs: sd.pengs,
            //         wangangs: sd.wangangs,
            //         diangangs: sd.diangangs,
            //         angangs: sd.angangs,
            //         holds: sd.holds,
            //         score: 0,
            //         huScore: 0,
            //         gangScore: 0,
            //         hu_data: sd.hu_data,
            //     }
            // }

            results.push(userRT);

            dbresult[i] = sd.score;
            delete gameSeatsOfUsers[sd.userId];
        }
        delete games[roomId];

        UserMgr.broacastInRoom('game_over_push', { results: results }, userId, true);

        //如果局数已够，则进行整体结算，并关闭房间
        RoomMgr.destroy(roomId);
        // setTimeout(function () {

        //奖池增量
        let jackpotIncrement = 0;

        for (var i = 0; i < RoomMgr.conf.player_count; ++i) {
            let gs = game.gameSeats[i]
            let user = RoomMgr.getUserInfo(gs.userId);

            RoomMgr.setLastGameOverResults(gs.userId, results)

            user.coins += gs.score;
            if (user.coins <= 0) {
                gs.score = -user.coins;
                user.coins = 0;
            }
            if (RoomMgr.conf.is_free == false) {
                HallSocket.sendUserCoins(user.account, user.coins)
            }
            gameService.saveGameRecord(gs.userId, gs.name, "coins_" + RoomMgr.conf.type, 0, gs.score, (err, result) => {
                if (err) {
                    console.log(err);
                }
            })
            if (RoomMgr.conf.is_free == false && gs.score != 0 && !RoomMgr.isRobot(gs.userId)) {
                // console.log('进入到了推倒胡初级场金币结算+++++++++++++' + gs.score);

                //统计奖池增量
                jackpotIncrement -= gs.score;
                rechargeService.changeUserGoldsAndSaveConsumeRecord(gs.userId, gs.score, "coin_" + RoomMgr.conf.type, "coins", `参与${RoomMgr.conf.name}输或赢的金币`, (err, result) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    //    向客户端发送更新后的金币数
                    UserMgr.sendMsg(gs.userId, 'update_tdh_coins', user.coins);
                })
            }
        }


        //非体验房才更新房间奖池信息
        if(RoomMgr.conf.is_free == false){
            let roomCode = RoomMgr.conf.room_code;
            console.log('修改'+RoomMgr.conf.name+'房间奖池：'+roomCode+'   奖池增量：'+jackpotIncrement);
            await commonService.changeNumberOfObjForTableAsync("t_room_info", { robot_total_win: jackpotIncrement }, { room_code: roomCode});
        }// }

        // }, 1500);
    }
}

//记录
function recordUserAction(game, seatData, type, target) {  //记录玩家杠的类型以及被杠的玩家;
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

    if (game == null) {
        return;
    }

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
            gems: sd.gems,
            userid: sd.userId,
            folds: sd.folds,
            seatindex: sd.seatIndex,
            angangs: sd.angangs,
            angang_targets: sd.angang_targets,
            diangangs: sd.diangangs,
            diangang_targets: sd.diangang_targets,
            wangangs: sd.wangangs,
            wangang_targets: sd.wangang_targets,
            pengs: sd.pengs,
            peng_targets: sd.peng_targets,
            paofen: sd.paofen,
            ip: sd.ip,
            // is_trustee: sd.trustee_times >= RoomMgr.conf.trustee_times,
        }
        let aaa = 0;
        if (sd.userId == userId) {
            aaa++;
            s.holds = sd.holds;
            seatData = sd;
            sd.trustee_times = 0;
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

    var game = seatData.game;
    if (game.state != "xiapao") {
        console.log("can't recv xiaPao when game.state == " + game.state + 'coins');
        return;
    }

    seatData.paofen = paofen;
    var seats = game.gameSeats
    var numOfPao = 0;
    var player_count = RoomMgr.conf.player_count
    var hunpai = RoomMgr.conf.hunpai

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
        UserMgr.broacastInRoom('game_xiapao_finish_push', arr, seatData.userId, true);
        exports.begin(RoomMgr.getUserRoom(userId))
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
        // conf: roomInfo.conf,
        roomInfo: roomInfo,

        button: Math.floor(Math.random() * player_count),//庄家
        mahjongs: RoomMgr.conf.fengpai == 0 ? new Array(136) : new Array(108),//麻将数量(不包括风牌)
        currentIndex: 0,//majongs index
        gameSeats: new Array(player_count),//房间内玩家
        beishu: RoomMgr.conf.beishu,//倍数选择
        hun: 34,//34方便没有混牌时，查表法不用修改
        turn: 0,
        chuPai: -1,//出的牌
        state: "idle",//当前状态(空闲)
        askordermap: [],//用来做轮询的
        countdown: -1,
        is_peng: false, //(为了自动出牌判断当前是碰了出牌还是正常出牌)
    };
    game.turn = game.button; //第一次出牌的人为庄家
    for (var i = 0; i < player_count; ++i) {
        const user_id = seats[i].userId;
        const user = RoomMgr.getUserInfo(user_id);
        //扣除入场费
        RoomMgr.costPlayerEnterFee(user_id);
        game.gameSeats[i] = {
            name: user.name,
            sex: user.sex,
            coins: user.coins,
            gems: user.gems,
            ip: user.ip,

            game: game,
            //椅子号
            seatIndex: i,

            userId: seats[i].userId,
            //持有的牌
            holds: [],
            //打出的牌
            folds: [],
            //暗杠的牌
            angangs: [],
            angang_targets: [],
            //点杠的牌
            diangangs: [],
            diangang_targets: [],
            //弯杠的牌
            wangangs: [],
            wangang_targets: [],
            //碰了的牌
            pengs: [],
            peng_targets: [],
            canQYS: [], //把碰杠的牌都保存起来,用来判断玩家是否能胡清一色
            //跑分
            // data.paofen = -1;
            //玩家手上的牌的数目，用于快速判定碰杠
            countMap: [],
            canTing: false,
            tingMaps: {}, //玩家打出某牌能够听哪几张牌

            tingMap: {},//玩家听牌了，用于快速判定胡了的番数(胡的牌的牌型)

            //是否可以杠
            canGang: false,
            //用于记录玩家可以杠的牌
            gangPai: [],
            //是否可以碰
            canPeng: false,
            //是否可以胡
            canHu: false,
            //是否可以出牌
            canChuPai: false,

            //如果guoHuFan >=0 表示处于过胡状态，
            //如果过胡状态，那么只能胡大于过胡番数的牌
            guoHuFan: -1,

            actions: [],//记录玩家杠的类型以及次数

            fan: 0,
            huScore: 0,
            gangScore: 0,
            score: 0,

            lastFangGangSeat: -1, //最后一个杠的玩家

        };

        for (let j = 0; j < 34; ++j) {
            game.gameSeats[i].countMap[j] = 0;
        }
        var data = game.gameSeats[i];
        gameSeatsOfUsers[data.userId] = data;
        // console.log('清除上局玩家数据,重新赋值!!!');
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

//开始新的一局
exports.begin = function (roomId) {
    initGame(roomId);
    var game = games[roomId];
    if (game == null) {
        console.log('game为空进不去啊');
        return;
    }
    shuffle(game)
    deal(game)
    var hunpai = RoomMgr.conf.hunpai
    var numOfMJ = game.mahjongs.length - game.currentIndex;
    var seats = game.gameSeats;
    game.countdown = 16;
    for (var i = 0; i < seats.length; ++i) {
        var s = seats[i];
        if (hunpai == 0) {
            //通知混牌信息
            gen_hun(game)
            UserMgr.sendMsg(s.userId, 'game_hunpai_push', game.hun);
        }
        //开局时，通知前端必要的数据
        exports.gameSyncPush(s.userId);
        UserMgr.sendMsg(s.userId, 'countdown_push', game.countdown);
        //通知玩家手牌
        UserMgr.sendMsg(s.userId, 'game_holds_push', game.gameSeats[i].holds);
        //通知还剩多少张牌
        UserMgr.sendMsg(s.userId, 'mj_count_push', numOfMJ);
        UserMgr.sendMsg(s.userId, 'game_begin_push', game.button);
        UserMgr.sendMsg(s.userId, 'game_playing_push', null);
    }

    //进行听牌的
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var gs = game.gameSeats[i];
        if (gs.holds.length == 14) {
            setTingMaps(gs);
            setTingMap(gs, gs.holds[13])
        }
        else {
            setTingMaps(gs, 1)
            setTingMap(gs, 1)
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
    game.is_peng = false;
    seatData.holds.splice(index, 1);
    seatData.countMap[pai]--;
    game.chuPai = pai;
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
            UserMgr.broacastInRoom('guo_notify_push', {
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
        // console.log(seatData.holds);
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
    seatData.canQYS.push(pai);
    seatData.peng_targets.push(game.turn);
    game.chuPai = -1;
    game.is_peng = true;
    setTingMaps(seatData);
    //广播通知其它玩家
    UserMgr.broacastInRoom('peng_notify_push', {
        user_id: seatData.userId,
        pai: pai,
        target: game.turn
    }, seatData.userId, true);
    sendOperations(game, seatData, -1);
    //碰的玩家打牌
    moveToNextUser(game, seatData.seatIndex);

    //广播通知玩家出牌方
    seatData.canChuPai = true;
    UserMgr.broacastInRoom('game_chupai_push', seatData.userId, seatData.userId, true);
    //如果可以有操作，则进行操作
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
            // console.log(seatData.holds);
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
        seatData.canQYS.push(pai);
        seatData.angang_targets.push(gang_target)
        var ac = recordUserAction(game, seatData, "angang");
    }
    else if (gangtype == "diangang") {
        turnSeat.numFangGang += 1;
        seatData.diangangs.push(pai);
        seatData.canQYS.push(pai);
        seatData.diangang_targets.push(gang_target)
        var ac = recordUserAction(game, seatData, "diangang", gameTurn);
        // var fs = turnSeat;
        // recordUserAction(game, fs, "fanggang", seatIndex);
    }
    else if (gangtype == "wangang") {
        game.gameSeats[gang_target].numFangGang += 1;
        seatData.wangangs.push(pai);
        seatData.canQYS.push(pai);
        seatData.wangang_targets.push(gang_target)
        var ac = recordUserAction(game, seatData, "wangang", gang_target);
    }

    //通知其他玩家，有人杠了牌
    UserMgr.broacastInRoom('gang_notify_push', {
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
    // console.log(seatData);
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
    UserMgr.broacastInRoom('hu_push', {
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

function calMapCount(count_map) {
    var count = 0
    for (var i = 0; i < 34; ++i) {
        count += count_map[i];
    }
    return count;
}

function checkHuPai(seatData, count_map) {

    // const hun = seatData.game.hun;
    let map = count_map.concat();
    const count = calMapCount(map);  //查看有多少张手牌
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
    return is_7dui || mjhulib.get_hu_info(map, null)
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
    if (pai != null && (-1 < pai && pai < 34)) { //判断牌型是否合法
        ++count_map[pai];
        if (checkHuPai(seatData, count_map)) {
            if (seatData.tingMaps[pai] == null) {
                seatData.tingMaps[pai] = {};
                seatData.canTing = true;
            }
            var getPattern = calPattern(seatData, count_map);
            seatData.tingMaps[pai][j] = {
                pattern: getPattern,
                fan: 0,
                count: getMJLeftCount(seatData, j),
            };
        }
        --count_map[pai];
    }
    else {
        for (var i = 0; i < 34; ++i) {   //双重for循环,每次轮流打出一张手牌然后循环摸34种牌与当前手牌判断牌型,可以听了则表示听牌,若都不匹配则表示不能听
            if (count_map[i] > 0) {
                --count_map[i];
                for (var j = 0; j < 34; ++j) {
                    ++count_map[j];
                    if (checkHuPai(seatData, count_map)) {
                        if (seatData.tingMaps[i] == null) {
                            seatData.tingMaps[i] = {};
                            seatData.canTing = true;
                        }
                        var getPattern = calPattern(seatData, count_map);
                        seatData.tingMaps[i][j] = {
                            pattern: getPattern,
                            fan: 0,
                            count: getMJLeftCount(seatData, j),
                        };
                    }
                    --count_map[j];
                }
                ++count_map[i]
            }
        }
    }
}

function calPattern(seatData, count_map) {   //判断牌型
    let type = {
        '7pairs': false,
        'qingyise': false,
    };
    let map = count_map.concat();  //concat(),当不传参数时可以用来克隆当前数组,防止原数组被篡改
    const count = calMapCount(map);

    //-----------判断七对-------------
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
        type['7pairs'] = true;
    }

    //-----------判断清一色-------------
    let canQYS = seatData.canQYS.concat(); //所有碰杠胡的牌,判断是否是同一花色并且与手牌也是同一花色
    let tong = 0;
    let tiao = 0;
    let wan = 0;
    let num = map.length;
    for (let i = 0; i < num; ++i) {
        if (map[i] > 0) {
            if (0 < i && i <= 8) {
                tong++
            }
            if (8 < i && i <= 17) {
                tiao++
            }
            if (17 < i && i <= 26) {
                wan++
            }
        }
    }

    for (let i = 0; i < canQYS.length; ++i) {
        if (0 < canQYS[i] && canQYS[i] <= 8) {
            tong++
        }
        if (8 < canQYS[i] && canQYS[i] <= 17) {
            tiao++
        }
        if (17 < canQYS[i] && canQYS[i] <= 26) {
            wan++
        }
    }

    if (tong > 0 && tiao <= 0 && wan <= 0) { //清一色筒
        type.qingyise = true;
    }
    if (tiao > 0 && tong <= 0 && wan <= 0) { //清一色条
        type.qingyise = true;
    }
    if (wan > 0 && tong <= 0 && tiao <= 0) {  //清一色万
        type.qingyise = true;
    }

    //-----------返回参数-------------
    return type;
}


function getMJLeftCount(seatData, mj_id) { //计算某张牌剩余的张数
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
        }
        ;
    }
}

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
            if (curr_seat.trustee_times >= RoomMgr.conf.trustee_times) (
                UserMgr.broacastInRoom('trustee_push', { is_trustee: true, user_id: curr_user_id }, curr_user_id, true)
            )
        }
        let holds_count = curr_seat.holds.length;
        let holds = curr_seat.holds;
        let pai = holds[holds_count - 1];
        if (game.is_peng == true) {

            let max_idx = 0;
            let max_pai = holds[0];
            for (let idx in holds) {
                if (holds[idx] >= max_pai) {
                    max_idx = idx;
                    max_pai = holds[idx]
                }
            }
            pai = holds[max_idx];
        }
        exports.chuPai(curr_user_id, pai);
    }
}

function update() {
    for (const key in games) {
        let game = games[key];
        if (game.countdown == 0) {
            game.countdown = -1;
            if (game.state == "playing") {
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

setInterval(update, 1000);

exports.updateUserCoins = function (user_id, coins) {
    var seatData = gameSeatsOfUsers[user_id];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }
    seatData.coins += coins;
}