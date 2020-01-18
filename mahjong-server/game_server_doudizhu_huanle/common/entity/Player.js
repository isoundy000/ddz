/**
 * @author hyw
 * @date 2018/8/21 0021
 * @description: {描述一下文件的功能}
 */
var dateUtil = require('../../../utils/dateUtil');
var rechargeService = require('../../../common/service/rechargeService');
var gameService = require('../../../common/service/gameService');
var commonService = require('../../../common/service/commonService');
var roomMgr = require("../gameMgr")

// 玩家状态
function Player(roomId, seatIndex, userInfo) {
    //所在房间
    this.roomId = roomId;
    //所在的位置
    this.seatIndex = seatIndex;
    this.userId = userInfo.userId;
    this.name = userInfo.name;
    this.headimg = userInfo.headimg;
    this.coins = userInfo.coins;
    this.beishu = 1;
    this.sex = userInfo.sex == '' ? 1 : parseInt(userInfo.sex);
    this.qiangfen = -1;
    //是否是机器人0 否 1是
    this.isRobot = userInfo.is_robot || 0;
    //是否正在被托管
    this.isTuoguan = 0
    //玩家的状态属性
    this.PLAY_STATE = { FREE: 'free', READY: 'ready', WAITTING: 'waitting', QIANGDIZHU: "qiangdizhu", PLAYING: 'playing', FAIL: 'fail' };

    //玩家的操作状态
    this.OPT_STATE = { QIANGDIZHU: 'qiangdizhu', TUOGUAN: 'tuoguan', BUCHU: 'buchu', JIABEI: "jiabei", MINGPAI: "mingpai" };
    //是否明牌
    this.mingpai = 0
    // //明牌倍数
    // this.mingpaiBeishu = 1;
    //默认是自由状态
    this.state = this.PLAY_STATE.FREE;
    this.totalWinJifen = 0;
    //是否是庄家 0 否 1 是
    this.isBanker = 0;
    this.jifen = parseInt(userInfo.jifen);

    //玩家开始游戏的时间
    this.beginGameTime = dateUtil.getCurrentTimestapm();
    //游戏局数
    this.numOfGame = 0;
    this.hasParticipateNumOfGame = 0;
    //玩家的pai
    this.pokers = [];
    this.privateBeishu = 1;

}

/**
 * 更新游戏局数
 */
Player.prototype.updateNumOfGame = function () {
    this.numOfGame++;
}

Player.prototype.updateBeishu = function (beishu) {
    this.beishu * beishu
}

Player.prototype.updatePokers = function (pokers) {
    this.pokers = pokers;
}
//庄家增加底牌
Player.prototype.addPokers = function (pokers) {
    // console.log("this.pokers",this.pokers)
    let s = this.pokers.concat(pokers);
    this.pokers = s;
    // console.log("s",s)

}
Player.prototype.mopai = function (pokers) {
    this.pokers = pokers;
}
/**
 * 更新所抢的分数
 */
Player.prototype.updateFenshu = function (fen) {
    this.qiangfen = fen;
}

Player.prototype.updateParticipateNumOfGame = function () {
    this.hasParticipateNumOfGame++;
}

/**
 * 初始参与游戏次数
 */
Player.prototype.resetParticipateNumOfGame = function () {
    this.hasParticipateNumOfGame = 0;
}


/**
 * 设置状态
 */
Player.prototype.setState = function (state) {
    this.state = state;
}


Player.prototype.updateTotalWinJifen = function (total) {
    this.totalWinJifen += total
}

/**
 * 设置为庄家
 */
Player.prototype.setBanker = function (isBanker) {
    this.isBanker = isBanker;
}

/**
 * 设置IP地址
 */
Player.prototype.setIP = function (ip) {
    this.ip = ip;
}

/**
 *  0 输 1赢
 */
Player.prototype.setWinOrLost = function (isWin) {
    this.isWin = isWin;
}

/**
 * 设置玩家的在线状态
 */
Player.prototype.setOnlineState = function (isOnline) {
    this.isOnline = isOnline;
}

/**
 * 更新玩家的金币
 */
Player.prototype.updateCoins = function (coins) {
    this.coins = coins;
}


/**
 * 设置总输赢
 */
Player.prototype.settlement = async function (totalWin) {
    var roomList = roomMgr.getRoomList()
    let roomInfo = roomList[this.roomId]
    //console.log('******更新玩家['+this.userId+']的totalWin******'+totalWin);
    //说明是赢
    var actualTotalWin = 0;
    if (totalWin > 0) {

        actualTotalWin = totalWin;
        if (totalWin > this.coins) {
            actualTotalWin = this.coins;
        }
        this.coins += actualTotalWin;
    } else {
        if (this.coins < (0 - totalWin)) {
            actualTotalWin = (0 - this.coins)
        } else {
            actualTotalWin = totalWin;
        }
        this.coins += actualTotalWin;
    }
    this.totalWin = actualTotalWin;
    this.allTalWin += actualTotalWin;
    console.log("actualTotalWin", actualTotalWin, totalWin, this.userId)
    //保存游戏记录
    let type;
    if (roomInfo.clubId) {
        type = "ddz_match"
    }
    else {
        type = "ddz_classic"
    }

    gameService.saveGameRecord(this.userId, this.name, type, 0, actualTotalWin, roomInfo.seatCount, this.roomId, this.numOfGame, 0, roomInfo.clubId, this.isBanker, (err, result) => {
        if (err) {
            console.log(err);
        }
    })


    //保存消费详情
    await rechargeService.changeUserGoldsAndSaveConsumeRecordAsync(
        this.userId, actualTotalWin, type, "coins",
        `[斗地主]房间号[${this.roomId}]输或赢的金币`, this.roomId, roomInfo.clubId
    );



    //判断是否是机器人，是机器人，更新房间的奖池
    let room_code = roomInfo.kindId + "0" + roomInfo.serial_num;
    if (this.isRobot == 1) {
        //console.log('****更新房间【'+this.roomId+'】的奖池,变化量：'+actualTotalWin);
        await commonService.changeNumberOfObjForTableAsync("t_rooms", { bonus_pool: actualTotalWin }, { id: this.roomId });
        await commonService.changeNumberOfObjForTableAsync("t_room_info", { robot_total_win: actualTotalWin }, { room_code: room_code });
    }
}

/**
 * 设置总输赢
 */
Player.prototype.settlementJifen = async function (totalWin, totalWinJifen) {
    var roomList = roomMgr.getRoomList()
    let roomInfo = roomList[this.roomId]
    //console.log('******更新玩家['+this.userId+']的totalWin******'+totalWin);
    //金币
    var actualTotalWin = 0;
    if (totalWin > 0) {

        actualTotalWin = totalWin;
        if (totalWin > this.coins) {
            actualTotalWin = this.coins;
        }
        this.coins += actualTotalWin;
    } else {
        if (this.coins < (0 - totalWin)) {
            actualTotalWin = (0 - this.coins)
        } else {
            actualTotalWin = totalWin;
        }
        this.coins += actualTotalWin;
    }
    this.totalWinJifen = totalWinJifen
    this.totalWin = actualTotalWin;
    this.jifen += totalWinJifen;
    console.log("actualTotalWin", actualTotalWin, totalWin, this.userId)
    //保存游戏记录
    let type;
    if (roomInfo.clubId) {
        type = "ddz_match"
    }
    else {
        type = "ddz_classic"
    }

    gameService.saveGameJiFenRecord(this.userId, this.name, type, 0, this.totalWin, this.totalWinJifen, roomInfo.seatCount, this.roomId, this.numOfGame, 0, roomInfo.clubId, (err, result) => {
        if (err) {
            console.log(err);
        }
    })


    //保存消费详情
    await rechargeService.changeUserGoldsAndSaveConsumeRecordAsync(
        this.userId, actualTotalWin, type, "coins",
        `[斗地主比赛场]房间号[${this.roomId}]输或赢的金币`, this.roomId, roomInfo.clubId
    );



    //判断是否是机器人，是机器人，更新房间的奖池
    let room_code = roomInfo.kindId + "0" + roomInfo.serial_num;
    if (this.isRobot == 1) {
        //console.log('****更新房间【'+this.roomId+'】的奖池,变化量：'+actualTotalWin);
        await commonService.changeNumberOfObjForTableAsync("t_rooms", { bonus_pool: actualTotalWin }, { id: this.roomId });
        await commonService.changeNumberOfObjForTableAsync("t_room_info", { robot_total_win: actualTotalWin }, { room_code: room_code });
    }
}

/**
 * 重置玩家数据
 */
Player.prototype.reset = function () {
    this.setState(this.PLAY_STATE.FREE);
    this.optState = null;
    this.compareList = [];
    this.qiangfen = 0;
    //是否是庄家 0 否 1 是
    this.isBanker = 0;
    this.isWin = 0;
    this.privateBeishu = 1;
}

/**
 * 设置倒计时
 */
Player.prototype.setTimer = function (timer, timeout) {
    //先清除一下上个倒计时，防止重复
    this.clearTimer();
    this.timer = setTimeout(timer, timeout);
}
/**
 * 取消倒计时
 */
Player.prototype.clearTimer = function () {
    clearTimeout(this.timer);
    this.timer = null;
}

module.exports = Player;