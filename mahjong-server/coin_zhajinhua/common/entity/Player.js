/**
 * @author hyw
 * @date 2018/8/21 0021
 * @description: {描述一下文件的功能}
 */
var dateUtil = require('../../../utils/dateUtil');
var rechargeService = require('../../../common/service/rechargeService');
var gameService = require('../../../common/service/gameService');
var commonService  = require('../../../common/service/commonService');
var roomMgr = require("../gameMgr")

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

    this.sex = userInfo.sex==''?1:parseInt(userInfo.sex);

    //是否是机器人0 否 1是
    this.isRobot = userInfo.is_robot||0;

    //玩家的状态属性
    this.PLAY_STATE = {FREE:'free',READY:'ready',WAITTING:'waitting',PLAYING:'playing',FAIL:'fail'};

    //玩家的操作状态
    this.OPT_STATE = {MEN_PAI:'menpai',KAN_PAI:'kanpai',QI_PAI:'qipai'};

    //默认是自由状态
    this.state = this.PLAY_STATE.FREE;

    //总押注
    this.allBets = 0;
    //是否是庄家 0 否 1 是
    this.isBanker = 0;
    //玩家当前的押注
    this.currentBet = 0;

    this.totalWin = 0;

    //比牌数组,记录所有我跟比牌和我跟别人比牌的人的ID
    this.compareList = [];

    //玩家开始游戏的时间
    this.beginGameTime = dateUtil.getCurrentTimestapm();
    //游戏局数
    this.numOfGame = 0;
    this.hasParticipateNumOfGame = 0;
    /**
     * 观战游戏的圈数
     * @type {number}
     */
    this.watchTimes = 0;

    //比牌次数
    this.bipaiTimes = 0;


    //玩家跟注次数
    this.timesOfGenZhu = 0;
}

/**
 * 更新游戏局数
 */
Player.prototype.updateNumOfGame = function(){
    this.numOfGame++;
}

Player.prototype.updateParticipateNumOfGame = function(){
    this.hasParticipateNumOfGame++;
}

/**
 * 初始参与游戏次数
 */
Player.prototype.resetParticipateNumOfGame = function(){
    this.hasParticipateNumOfGame = 0;
}


/**
 * 更新比牌次数
 */
Player.prototype.updateBiPaiTimes = function(){
    this.bipaiTimes++;
}


/**
 * 更新玩家跟注次数
 */
Player.prototype.updateTimesOfGenZhu = function(){
    this.timesOfGenZhu++;
}

/**
 * 重置玩家跟注次数
 */
Player.prototype.resetTimesOfGenZhu = function () {
    this.timesOfGenZhu = 0;
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
    //默认为闷牌状态
    this.optState =  this.OPT_STATE.MEN_PAI;
}

/**
 * 看牌
 */
Player.prototype.kanPai = function(){
   this.optState = this.OPT_STATE.KAN_PAI;
}

/**
 * 弃牌
 */
Player.prototype.qiPai = function(){
    this.optState = this.OPT_STATE.QI_PAI;
}

/**
 * 押注
 */
Player.prototype.bet = function(betCount){
    var self = this;
    self.coins = self.coins - betCount;
    self.allBets+=betCount;
    //更新当前的押注
    self.currentBet = betCount;
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
 *  0 输 1赢
 */
Player.prototype.setWinOrLost = function(isWin){
    this.isWin = isWin;
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
    //console.log('******更新玩家['+this.userId+']的totalWin******'+totalWin);
    //说明是赢
    var actualTotalWin = 0;
    if(totalWin>0){
        this.coins+=totalWin;
        actualTotalWin = totalWin - this.allBets;
    }else{
        if(this.coins<(0-totalWin)){
            actualTotalWin = (0-this.coins)
        }else{
            actualTotalWin = totalWin;
        }
        
    }
    this.totalWin = actualTotalWin;
    //保存游戏记录
    gameService.saveGameRecord(this.userId, this.name, "coins_zjh", 0, actualTotalWin, (err, result) => {
        if (err) {
            console.log(err);
        }
    })
    var roomList = roomMgr.getRoomList()
    let room = roomList[this.roomId]
    if(roomInfo.room_type !== "shiwanfang"){
        //保存消费详情
        await rechargeService.changeUserGoldsAndSaveConsumeRecordAsync(
            this.userId, actualTotalWin, 'zjh', "coins",
            `[炸金花]房间号[${this.roomId}]输或赢的金币`
        );
    }
    //判断是否是机器人，是机器人，更新房间的奖池
    if(this.isRobot==1){
        //console.log('****更新房间【'+this.roomId+'】的奖池,变化量：'+actualTotalWin);
        await commonService.changeNumberOfObjForTableAsync("t_rooms", { bonus_pool: actualTotalWin }, { id: this.roomId });
        await commonService.changeNumberOfObjForTableAsync("t_room_info", { robot_total_win: actualTotalWin }, { room_code: '008'});
    }
}

/**
 * 重置玩家数据
 */
Player.prototype.reset = function(){
    this.setState(this.PLAY_STATE.FREE);
    this.optState = null;
    this.compareList = [];
    //总押注
    this.allBets = 0;
    //是否是庄家 0 否 1 是
    this.isBanker = 0;
    //玩家当前的押注
    this.currentBet = 0;

    this.totalWin = 0;
    this.isWin = 0;

    this.timesOfGenZhu = 0;
    this.bipaiTimes = 0;
}

/**
 * 设置倒计时
 */
Player.prototype.setTimer = function(timer,timeout){
  //先清除一下上个倒计时，防止重复
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
 * 添加比牌记录
 */
Player.prototype.addCompareList = function(userId){
    this.compareList.push(userId);
}

/**
 * 更新玩家观战的圈数
 */
Player.prototype.updateWatchTimes = function(num){
    this.watchTimes = num;
}

module.exports = Player;