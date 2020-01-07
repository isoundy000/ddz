/**
 * @author hyw
 * @date 2018/8/21 0021
 * @description: {描述一下文件的功能}
 */
var dateUtil = require('../../../utils/dateUtil');
var rechargeService = require('../../../common/service/rechargeService');

// 玩家状态
function Player(roomId,seatIndex,userInfo) {
    //所在房间
    this.roomId = roomId;
    //所在的位置
    this.seatIndex = seatIndex;
    this.userId = userInfo.userId;
    this.name = userInfo.name;
    this.headimg = userInfo.headimg;
    this.coins = userInfo.coins;

    //是否是机器人0 否 1是
    this.isRobot = userInfo.is_robot||0;

    //玩家的状态属性
    this.PLAY_STATE = {FREE:'free',READY:'ready',PLAYING:'playing'};

    //默认是自由状态
    this.state = this.PLAY_STATE.FREE;

    //玩家的操作状态 0 暂无操作  1 已抢庄 2 已押注 3 已亮牌
    this.optState = 0;

    //是否是庄家 0 否 1 是
    this.isBanker = 0;
    //玩家当前的押注倍数
    this.betBeiShu = -1;//-1 表示未操作

    this.totalWin = 0;

    //玩家开始游戏的时间
    this.beginGameTime = dateUtil.getCurrentTimestapm();
    //游戏局数
    this.numOfGame = 0;
}
/**
 * 更新游戏局数
 */
Player.prototype.updateNumOfGame = function(){
    this.numOfGame++;
}
/**
 * 设置状态
 */
Player.prototype.setState = function(state){
    this.state = state;
}

/**
 * 摸牌
 */
Player.prototype.mopai = function(pokers){
    this.hold = pokers;
}



/**
 * 押注
 */
Player.prototype.setBetBeiShu = function(betBeiShu){
    this.betBeiShu = betBeiShu;
}

/**
 * 设置为庄家
 */
Player.prototype.setBanker = function(isBanker){
    this.isBanker = isBanker;
}

/**
 * 设置IP地址
 */
Player.prototype.setIP = function(ip){
   this.ip = ip;
}


/**
 * 设置玩家的在线状态
 */
Player.prototype.setOnlineState = function(isOnline){
    this.isOnline = isOnline;
}

/**
 * 更新玩家的金币
 */
Player.prototype.updateCoins = function(coins){
    this.coins = coins;
}

/**
 * 设置总输赢
 */
Player.prototype.settlement = async function(totalWin,roomInfo){
    var self = this;
    
    await rechargeService.changeUserGoldsAndSaveConsumeRecordAsync(
        self.userId, totalWin, 'niuniu', "coins",
        `[牛牛]房间号[${self.roomId}]输或赢的金币`
    );


    self.totalWin = parseInt(totalWin);
    self.coins+=parseInt(totalWin);
}

/**
 * 更新总输赢
 * @param totalWin
 */
Player.prototype.updateTotalWin = function (totalWin) {
    this.totalWin += totalWin;
    this.coins+=totalWin;
}



/**
 * 重置玩家数据
 */
Player.prototype.reset = function(){
    this.setState(this.PLAY_STATE.FREE);
    this.optState = 0;
    //是否是庄家 0 否 1 是
    this.isBanker = 0;
    //玩家当前的押注
    this.betBeiShu = -1;
    this.totalWin = 0;
}

/**
 * 设置倒计时
 */
Player.prototype.setTimer = function(timer,timeout){
  this.clearTimer();
  this.timer = setTimeout(timer,timeout);
}
/**
 * 取消倒计时
 */
Player.prototype.clearTimer = function(){
    clearTimeout(this.timer);
    this.timer = null;
}

/**
 * 更新操作状态
 * @param optState
 */
Player.prototype.setOptState = function (optState) {
    this.optState = optState;
}


module.exports = Player;