/**
 * @author hyw
 * @date 2018/8/21 0021
 * @description: {描述一下文件的功能}
 */
const gameService = require('../../../common/service/gameService')
const agentService = require('../../../common/service/agentService')
const commonService = require('../../../common/service/commonService');
const crypto = require('../../../utils/crypto');

function Room(roomId, roomConfig, createUser) {
    this.roomId = roomId;
    this.createUser = createUser;

    //座位列表
    this.seats = [];
    //是否是私密 0 否 1 是
    this.isPrivate = roomConfig.isPrivate;
    //上家出的牌
    this.lastPokers = { userId: 0, pokers: [] };
    //剩余的牌
    this.shengyuPokers = [];
    //底注
    this.diZhu = roomConfig.diZhu;
    this.diFen = roomConfig.diFen;
    //试玩房的初始金币
    this.coins = roomConfig.coins;
    //是否是固定房
    this.isDaiKai = roomConfig.isDaiKai || 0;
    this.dipai = [];
    //最低进入分数
    this.minScoreLimit = roomConfig.minScoreLimit;
    //最高进入分数
    this.maxScoreLimit = roomConfig.maxScoreLimit;
    //最低抢分
    this.minQiangFen = 0;
    //房间抽水率(按照底注的50%抽水)
    this.choushuiRate = roomConfig.choushuiRate;
    this.kindId = roomConfig.kindId;
    //房间类型畅玩房或者不同dizhu的其他房间
    this.room_type = roomConfig.room_type;
    //房间机器人的数量
    this.robotCount = roomConfig.robot_count || 0;
    //机器人胜率
    this.robotWinPR = roomConfig.robot_win_pr || 80;
    //玩家胜率
    this.playerWinPR = roomConfig.player_win_pr || 20;
    //场次
    this.serial_num = roomConfig.serial_num;
    //当前玩家
    this.curUserSeat = null;
    //地主牌
    this.bankerCards = null;
    //地主封顶(32分, 64分, 128分)
    this.dizhufengding_type = null;
    //玩家抢分按钮的值
    this.qiangfen = roomConfig.qiangfen;
    //房间的创建时间
    this.createTime = roomConfig.createTime;
    //最大容纳人数
    this.seatCount = 3;
    //最大游戏局数 -1 表示无限
    this.maxGames = -1;
    //出牌玩家
    this.outCardUserSeat = null;
    //当前游戏局数
    this.numOfGame = 1;
    //座位号是否有玩家存在
    this.seatsHasPlayer = [];
    for (let i = 0; i < this.seatCount; i++) {
        this.seatsHasPlayer[i] = false;
    }
    //炸弹数
    this.zhadanNum = 0;
    //明牌倍数
    this.mpBeishu = 0
    //炸弹翻倍
    this.zdBeishu = 0;
    //春天倍数
    this.spring = 0;
    //当前倍数
    this.beishu = (1 + this.zhadanNum) * this.minQiangFen;
    //上次的赢家
    this.lastWinner = null;
    //游戏的状态 ready 等待玩家准备   playing 比牌阶段  settlement 分数结算阶段
    this.GAME_STATE = { READY: 'ready', QIANGDIZHU: "qiangdizhu", JIABEI: "jiabei", PLAYING: 'playing', BUCHU: "buchu", CHUPAI: "chupai", SETTLEMENT: 'settlement' };
    //第一个叫分的人
    this.jiaofenNO1 = 0;
    this.gameState = this.GAME_STATE.READY;
    //等待准备超时时间（10S）
    this.READY_COUNTDOWN = 10 * 1000;
    //操作超时时间 10s
    this.OPT_COUNTDOWN = 20 * 1000;
    //加倍倒计时
    this.JB_COUNTDOWN = 7000;
    //抢地主倒计时
    this.QDZ_COUNTDOWN = 15000;
    this.chushi = roomConfig.chushibeishu;
    this.winer;
    this.clubId = roomConfig.clubId;
    //公共倍数
    this.public = 1;
    /**
     * 当前房间的倒计时
     * @type {number}
     */
    this.countdown = 0;
    this.noQiang = 0;//都不抢地主的次数
    let self = this
    this.publicBeishu = { chushi: roomConfig.chushibeishu, mingpai: 0, qiangdizhu: this.minQiangFen, dipai: 0, zhadan: this.zdBeishu, chuntian: 0, shengpai: 0 };
    this.nongminBeishu = 0;
}

//Room.prototype.GAME_STATE = {READY:'ready',PLAYING:'playing',SETTLEMENT:'settlement'};

Room.prototype.setQiangfenNo1 = function (userid) {
    this.jiaofenNO1 = userid;
}
//更新最新出的牌
Room.prototype.setLastPokers = function (userId, pokers) {
    this.lastPokers.pokers = pokers;
    this.lastPokers.userId = userId;
}


Room.prototype.setPublicBeishu = function (key, value) {
    this.publicBeishu[key] = value;
}

/**
 * 加入房间
 */
Room.prototype.joinRoom = function (player) {
    this.seatsHasPlayer[player.seatIndex] = true;
    this.seats.push(player);
}

Room.prototype.setBeiShu = function (beishu) {
    this.beishu = this.beishu * beishu
}
/**
 * 退出房间
 */
Room.prototype.exitRoom = function (playerId) {
    for (var i = 0; i < this.seats.length; i++) {
        var player = this.seats[i];
        if (player.userId == playerId) {
            this.seatsHasPlayer[player.seatIndex] = false;
            this.seats.splice(i, 1);
        }
    }
}

/**
 * 根据玩家ID获取玩家
 */
Room.prototype.getPlayerById = function (playerId) {
    var player = null;
    for (var i = 0; i < this.seats.length; i++) {
        var p = this.seats[i];
        if (p.userId == playerId) {
            player = p;
            break;
        }
    }
    return player;
}

/**
 * 获取玩家的位置信息
 */
Room.prototype.getPlayerSeatIndex = function (playerId) {
    var player = this.getPlayerById(playerId);
    var seatIndex = player.seatIndex;
    return seatIndex;
}

/**
 * 根据座位号获取玩家
 */
Room.prototype.getPlayerBySeatIndex = function (seatIndex) {
    var player = null;
    for (var i = 0; i < this.seats.length; i++) {
        var p = this.seats[i];
        if (p.seatIndex == seatIndex) {
            player = p;
            break;
        }
    }
    return player;
}

/**
 * 判断某个游戏状态中，所有的玩家是否都已经操作
 */
Room.prototype.isAllOpt = function (gameState) {
    var isAllOpt = true;
    for (let i = 0; i < this.seats.length; i++) {
        let player = this.seats[i];
        if (player.state !== gameState) {
            return false;
        }
    }

    return isAllOpt;
}

/**
 * 找出庄家
 */
Room.prototype.findDiZhu = function () {
    let ids = [];
    for (let i = 0; i < this.seats.length; i++) {
        let player = this.seats[i];
        if (player.qiangfen === this.minQiangFen) {
            ids.push(player.userId);
        }
    }
    if (ids.length === 1) {
        return ids[0];
    } else if (ids.length > 1) {
        if (ids.indexOf(this.jiaofenNO1) !== -1) {
            return this.jiaofenNO1;
        } else {
            return ids[0];
        }
    }


}
/**
 * 获取空椅子号
 */
Room.prototype.getFreeSeatIndex = function () {
    for (let i = 0; i < this.seatsHasPlayer.length; i++) {
        if (this.seatsHasPlayer[i] == false) {
            this.seatsHasPlayer[i] = true;
            return i
        }
    }
    return -1;
}

/**
 * 设置庄家
 */
Room.prototype.setBanker = function (userId) {
    for (var i = 0; i < this.seats.length; i++) {
        var player = this.seats[i];
        if (player.userId == userId) {
            player.setBanker(1);
        } else {
            player.setBanker(0);
        }
    }
}

/**
 * 获取当前房间的庄家
 */
Room.prototype.getBanker = function () {
    var banker = null;
    for (var i = 0; i < this.seats.length; i++) {
        var player = this.seats[i];
        if (player.isBanker == 1) {
            banker = player;
        }
    }
    return banker;
}

/**
 * 获取当前房间玩家的数量
 */
Room.prototype.getPlayerCount = function () {
    var count = 0;
    for (let i = 0; i < this.seats.length; i++) {
        var player = this.seats[i];
        if (player && player.userId) {
            count++;
        }
    }
    return count;
}


/**
 * 获取当前房间机器人的数量
 */
Room.prototype.getCurrentRobotCount = function () {
    var count = 0;
    for (let i = 0; i < this.seats.length; i++) {
        var player = this.seats[i];
        if (player.isRobot == 1) {
            count++;
        }
    }
    return count;
}


/**
 * 获取当前房间已经准备的玩家的数量
 */
Room.prototype.getPreparedPlayerCount = function () {
    var count = 0;
    for (let i = 0; i < this.seats.length; i++) {
        var player = this.seats[i];
        if (player.state == player.PLAY_STATE.READY) {
            count++;
        }
    }
    return count;
}




/**
 * 获取当前房间正在游戏中的玩家的数量
 */
Room.prototype.getPlayingPlayerCount = function () {
    var count = 0;
    for (let i = 0; i < this.seats.length; i++) {
        var player = this.seats[i];
        if (player.state == player.PLAY_STATE.PLAYING || player.state == player.PLAY_STATE.WAITTING) {
            count++;
        }
    }
    return count;
}


/**
 * 设置游戏的状态
 * @param state
 */
Room.prototype.setState = function (state) {
    this.gameState = state;
}

/**
 * 获取操作的下家
 */
Room.prototype.getNextTurnPlayer = function (currentTurn) {
    var nextTurnPlayer = null;
    //从当前的玩家位置开始遍历,最大遍历一圈
    for (let i = (currentTurn + 1); i < (currentTurn + this.seatCount); i++) {
        var player = this.getPlayerBySeatIndex(i % this.seatCount);
        if (player) {
            //如果游戏在准备状态
            if (1) {
                nextTurnPlayer = player;
                break;
            }
        }
    }
    return nextTurnPlayer;
}


/**
 * 获取操作的下家
 */
Room.prototype.changeBanker = function (currentBankerSeatIndex) {
    var nextTurnPlayer = null;
    //从当前的玩家位置开始遍历,最大遍历一圈
    for (let i = (currentBankerSeatIndex + 1); i < (currentBankerSeatIndex + this.seatCount); i++) {
        var player = this.getPlayerBySeatIndex(i % this.seatCount);
        if (player && player.isOnline == 1) {
            nextTurnPlayer = player;
            break;
        }
    }
    return nextTurnPlayer;
}




/**
 * 设置当前轮到操作的坐位号
 */
Room.prototype.setCurrentTurn = function (seatIndex) {
    this.currentTurn = seatIndex;
}

/**
 * 更新游戏局数
 */
Room.prototype.updateNumOfGame = function () {
    this.numOfGame++;
}

/**
 * 重置房间数据
 */
Room.prototype.reset = function () {
    this.minQiangFen = 0;
    this.nongminBeishu = 0;
    this.publicBeishu = { chushi: this.chushi, mingpai: 0, qiangdizhu: 0, dipai: 0, zhadan: this.zdBeishu, chuntian: 0, shengpai: 0 };
    this.zhadanNum = 0;
    this.lastPokers = { uesrId: 0, pokers: [] };
    this.zdBeishu = 0;
}

/**
 * 获取当前还未弃牌的
 */
Room.prototype.getPlayingUserCount = function () {
    var playingUserCount = 0;
    for (var i = 0; i < this.seats.length; i++) {
        var player = this.seats[i];
        if (player.state == player.PLAY_STATE.WAITTING || player.state == player.PLAY_STATE.PLAYING) {
            playingUserCount++;
        }
    }
    return playingUserCount;
}

/**
 * 房间抽水（每局抽底注的50%）,扣除
 */
Room.prototype.choushui = async function () {
    let fee = this.diZhu * this.choushuiRate
    for (let i = 0; i < this.seats.length; i++) {
        var player = this.seats[i];
        if (player.state != player.PLAY_STATE.FREE) {
            //console.log('*******抽水【'+player.userId+'】*******');
            let change_before = player.coins;
            player.updateCoins(player.coins - fee);
            let id = this.serial_num + this.kindId + ""
            try {
                gameService.updateBonusPoolByRoomCode(fee, id);
                agentService.someLevelRebate(player.userId, fee, 3, '炸金花')

                //保存抽水记录
                let choushui_record = {}
                choushui_record.fk_player_id = player.userId;
                choushui_record.username = crypto.toBase64(player.name);
                choushui_record.choushui_before = change_before;
                choushui_record.choushui_count = fee;
                choushui_record.remark = '炸金花房间[' + this.roomId + ']收取服务费';
                choushui_record.record_time = Math.floor(Date.now() / 1000);
                choushui_record.treasure_type = 'coins';
                choushui_record.room_id = 'zjh';
                await commonService.saveAsync("t_choushui_record", choushui_record);
                if (this.room_type !== "shiwanfang") {
                    commonService.changeNumberOfObjForTableAsync('t_users', { coins: -fee, choushui: fee }, { userid: player.userId });
                }

            } catch (error) {
                console.error(
                    `user_id:${user_id}扣除手续费出错。
                    ${error}`
                );
            }
        }
    }
    return;
}


/**
 * 记录房间内玩家未参与游戏观战游戏次数
 */
Room.prototype.recordWatchTimes = function () {
    for (let i = 0; i < this.seats.length; i++) {
        var player = this.seats[i];
        if (player.state != player.PLAY_STATE.FREE) {
            player.updateWatchTimes(0);
        } else {
            player.updateWatchTimes(player.watchTimes + 1);
        }
    }
}


/**
 * 设置倒计时
 */
Room.prototype.setTimer = function (timer) {
    //先清除一下上个倒计时，防止重复
    this.clearTimer();
    this.timer = timer;
}
/**
 * 取消倒计时
 */
Room.prototype.clearTimer = function () {
    clearInterval(this.timer);
    this.timer = null;
}
module.exports = Room;