/**
 * @author hyw
 * @date 2018/8/21 0021
 * @description: {描述一下文件的功能}
 */
var dateUtil = require('../../utils/dateUtil');
var rechargeService = require('../../common/service/rechargeService');
var gameService = require('../../common/service/gameService');
var commonService  = require('../../common/service/commonService');
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
    this.beishu = 1;
    this.allTalWin = 0; 
    this.sex = userInfo.sex==''?1:parseInt(userInfo.sex);
    this.qiangfen=-1;
    //是否是机器人0 否 1是
    this.isRobot = userInfo.is_robot||0;
    this.isTuoguan = 0;
    //玩家的状态属性
    this.PLAY_STATE = {FREE:'free',READY:'ready',WAITTING:'waitting',QIANGDIZHU:"qiangdizhu",PLAYING:'playing',FAIL:'fail'};
    //同意解散房间 1为同意 0为不同意 -1为还没操作
    this.jiesan = -1;
    //玩家的操作状态
    this.OPT_STATE = {QIANGANZHUANG:'qianganzhuang',TUOGUAN:'tuoguan',BUCHU:'buchu',MINGPAI:"mingpai"};

    //默认是自由状态
    this.state = this.PLAY_STATE.FREE;

    //是否是庄家 0 否 1 是
    this.isBanker = 0;
    this.totalWin = 0;

    //玩家开始游戏的时间
    this.beginGameTime = dateUtil.getCurrentTimestapm();
    //游戏局数
    this.numOfGame = 0;
    this.hasParticipateNumOfGame = 0;
    //玩家的pai
    this.pokers=[];

}

/**
 * 更新游戏局数
 */
Player.prototype.updateNumOfGame = function(){
    this.numOfGame++;
}

Player.prototype.updateBeishu = function(beishu){
    this.beishu * beishu
}

Player.prototype.updatePokers = function(pokers){
    this.pokers=pokers;
}
//庄家增加底牌
Player.prototype.addPokers = function(pokers){
    this.pokers = this.pokers.concat(pokers);
}
/**
 * 更新所抢的分数
 */
Player.prototype.updateFenshu = function(fen){
    this.qiangfen = fen;
}
Player.prototype.updateTotalWin = function(totalWin){
    this.totalWin += totalWin
}
/**
 * 摸牌
 */
Player.prototype.mopai = function(pokers){
    this.pokers = pokers;
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
 * 设置状态
 */
Player.prototype.setState = function(state){
    this.state = state;
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
Player.prototype.settlement = async function(totalWin){
    var roomList = roomMgr.getRoomList()
    let roomInfo = roomList[this.roomId]
    //console.log('******更新玩家['+this.userId+']的totalWin******'+totalWin);
    //说明是赢
    var actualTotalWin = 0;
    if(roomInfo.jiesuan =="jinbi"){
        if(totalWin>0){
            
            actualTotalWin = totalWin;
        }else{
            if(this.coins<(0-totalWin)){
                actualTotalWin = (0-this.coins)
            }else{
                actualTotalWin = totalWin;
            }
            
        }
        this.totalWin = actualTotalWin;
        
    }else{
        actualTotalWin = totalWin;
        this.totalWin = actualTotalWin;
        this.coins+=totalWin;
    }
    
    this.allTalWin += actualTotalWin;
    this.coins+=totalWin;
    console.log("actualTotalWin",actualTotalWin,totalWin,this.userId)
    //保存游戏记录
    if(roomInfo.jiesuan==="jinbi"){
        if(this.numOfGame==roomInfo.maxGames){
            gameService.saveGameRecord(this.userId, this.name, "game_server_paodekuai", 0, this.allTalWin,roomInfo.seatCount,this.roomId,this.numOfGame,1 ,roomInfo.clubId,(err, result) => {
                if (err) {
                    console.log(err);
                }
            })
        }else{
            gameService.saveGameRecord(this.userId, this.name, "game_server_paodekuai", 0, actualTotalWin,roomInfo.seatCount,this.roomId,this.numOfGame,0 ,roomInfo.clubId,(err, result) => {
                if (err) {
                    console.log(err);
                }
            })
        }

            //保存消费详情
    await rechargeService.changeUserGoldsAndSaveConsumeRecordAsync(
        this.userId, actualTotalWin, 'game_server_paodekuai', "coins",
        `[跑得快]房间号[${this.roomId}]输或赢的金币`,this.roomId,roomInfo.clubId
    );
    }else{
        if(this.numOfGame==roomInfo.maxGames){
            gameService.saveGameJiFenRecord(this.userId, this.name, "game_server_paodekuai", 0, this.allTalWin,roomInfo.seatCount,this.roomId,this.numOfGame,1 ,roomInfo.clubId, (err, result) => {
                if (err) {
                    console.log(err);
                }
            })
        }else{
            gameService.saveGameJiFenRecord(this.userId, this.name, "game_server_paodekuai", 0, this.totalWin,roomInfo.seatCount, this.roomId,this.numOfGame,0 ,roomInfo.clubId,(err, result) => {
                if (err) {
                    console.log(err);
                }
            })
        }

    }



    //判断是否是机器人，是机器人，更新房间的奖池
    let room_code = roomInfo.kindId+"0"+roomInfo.serial_num;
    if(this.isRobot==1){
        //console.log('****更新房间【'+this.roomId+'】的奖池,变化量：'+actualTotalWin);
        await commonService.changeNumberOfObjForTableAsync("t_rooms", { bonus_pool: actualTotalWin }, { id: this.roomId });
        await commonService.changeNumberOfObjForTableAsync("t_room_info", { robot_total_win: actualTotalWin }, { room_code: room_code});
    }
}

/**
 * 结算房卡
 */
Player.prototype.settlementGems = async function(gems,roomInfo){
    var self = this;
    await rechargeService.changeUserGoldsAndSaveConsumeRecordAsync(
        self.userId, gems, 'niuniu', "gems",
        `[牛牛]房间号[${self.roomId}]输或赢的金币`,this.roomId,roomInfo.clubId
    );

    self.gems+=parseInt(gems);
}
/**
 * 重置玩家数据
 */
Player.prototype.reset = function(){
    this.setState(this.PLAY_STATE.FREE);
    this.optState = null;
    this.compareList = [];
    this.totalWin = 0;
    this.qiangfen = 0;
    //是否是庄家 0 否 1 是
    this.isBanker = 0;
    this.isWin = 0;
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
    console.log("定时器取消了啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊",this.userId)
}

module.exports = Player;