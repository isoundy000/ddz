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
    this.bl = roomConfig.bl;
    //座位列表
    this.seats = [];
    //是否是私密 0 否 1 是
    this.isPrivate = roomConfig.isPrivate;
    //最大下注轮数
    this.fengDing = roomConfig.fengDing;
    //必闷轮数
    this.biMen = roomConfig.biMen;
    //最大多少轮可以比牌
    this.biPai = roomConfig.biPai;
    //底注
    this.diZhu = roomConfig.diZhu;
    //试玩房的初始金币
    this.coins = roomConfig.coins;
    //是否是固定房
    this.isDaiKai = roomConfig.isDaiKai||0;

    //最低进入分数
    this.minScoreLimit = roomConfig.minScoreLimit;
    //最高进入分数
    this.maxScoreLimit = roomConfig.maxScoreLimit;

    //房间抽水率(按照底注的50%抽水)
    this.choushuiRate = roomConfig.choushuiRate;
    this.kindId = roomConfig.kindId;
    //房间类型畅玩房或者不同dizhu的其他房间
    this.room_type= roomConfig.room_type;
    //房间机器人的数量
    this.robotCount = roomConfig.robot_count||0;
    //机器人胜率
    this.robotWinPR = roomConfig.robot_win_pr||80;
    //玩家胜率
    this.playerWinPR = roomConfig.player_win_pr||20;
    //场次
    this.serial_num = roomConfig.serial_num;



    //房间的创建时间
    this.createTime = roomConfig.createTime;
    //最大容纳人数
    this.seatCount = roomConfig.seatCount;
    //最大游戏局数 -1 表示无限
    this.maxGames = roomConfig.maxGames;

    //当前游戏局数
    this.numOfGame = 1;
    //座位号是否有玩家存在
    this.seatsHasPlayer = [];
    for (let i = 0; i < this.seatCount; i++) {
        this.seatsHasPlayer[i] = false;
    }

    //当前房间的下注轮数
    this.currentLunShu = 0;

    //上家押注
    this.minGenZhu = this.diZhu;
    //总下注
    this.totalBets = 0;

    //游戏的状态 ready 等待玩家准备   playing 比牌阶段  settlement 分数结算阶段
    this.GAME_STATE = {READY:'ready',PLAYING:'playing',SETTLEMENT:'settlement'};

    this.gameState = this.GAME_STATE.READY;
    //等待准备超时时间（10S）
    this.READY_COUNTDOWN = 10*1000;
    //操作超时时间 10s
    this.OPT_COUNTDOWN = 20*1000;

    /**
     * 当前房间的倒计时
     * @type {number}
     */
    this.countdown = 0;

    //玩家胜率
    this.player_param=0;
    //机器人胜率
    this.robot_param = 0;
    let code = roomConfig.kindId+"0"+roomConfig.serial_num;
    let self = this;
    (async function(){
        console.log("code",code)
        let result = await commonService.getTableValuesAsync("difficulty_degree,player_ctrl_param","t_room_info",{"room_code":parseInt(code)});
        console.log("result",result.player_ctrl_param)
        if(result.player_ctrl_param){
            self.player_param = result.player_ctrl_param;
            self.robot_param = result.difficulty_degree;
        }
    })()

}

//Room.prototype.GAME_STATE = {READY:'ready',PLAYING:'playing',SETTLEMENT:'settlement'};


/**
 * 加入房间
 */
Room.prototype.joinRoom = function (player) {
    this.seatsHasPlayer[player.seatIndex] = true;
    this.seats.push(player);
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
Room.prototype.getPlayerBySeatIndex = function(seatIndex){
    var player = null;
    for(var i = 0; i < this.seats.length; i++){
        var p = this.seats[i];
        if (p.seatIndex == seatIndex) {
            player = p;
            break;
        }
    }
    return player;
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
Room.prototype.setBanker = function(userId){
    for(var i=0;i<this.seats.length;i++){
        var player = this.seats[i];
        if(player.userId == userId){
            player.setBanker(1);
        }else{
            player.setBanker(0);
        }
    }
}

/**
 * 获取当前房间的庄家
 */
Room.prototype.getBanker = function(){
    var banker = null;
    for(var i=0;i<this.seats.length;i++){
        var player = this.seats[i];
        if(player.isBanker){
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
        if (player&&player.userId) {
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
        if (player.isRobot==1) {
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
        if (player.state==player.PLAY_STATE.READY) {
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
        if (player.state==player.PLAY_STATE.PLAYING||player.state==player.PLAY_STATE.WAITTING) {
            count++;
        }
    }
    return count;
}



/**
 * 更新房间总下注量
 */
Room.prototype.updateTotalBets = function(betCount){
    this.totalBets+=betCount;
}

/**
 * 更新房间当前玩家的下注量
 */
Room.prototype.updateMinGenZhu = function(minGenZhu){
    this.minGenZhu = minGenZhu;
}


/**
 * 设置游戏的状态
 * @param state
 */
Room.prototype.setState = function(state){
    this.gameState = state;
}

/**
 * 获取操作的下家
 */
Room.prototype.getNextTurnPlayer = function(currentTurn){
    var nextTurnPlayer = null;
    //从当前的玩家位置开始遍历,最大遍历一圈
    for(let i=(currentTurn+1);i<(currentTurn+this.seatCount);i++){
        var player = this.getPlayerBySeatIndex(i%this.seatCount);
        if(player){
            //遍历到庄家的位置，轮数+1
            if(player.isBanker==1){
                this.currentLunShu++;
            }
            //如果游戏在准备状态
            if(player.state==player.PLAY_STATE.WAITTING){
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
Room.prototype.changeBanker = function(currentBankerSeatIndex){
    var nextTurnPlayer = null;
    //从当前的玩家位置开始遍历,最大遍历一圈
    for(let i=(currentBankerSeatIndex+1);i<(currentBankerSeatIndex+this.seatCount);i++){
        var player = this.getPlayerBySeatIndex(i%this.seatCount);
        if(player&&player.isOnline==1){
            nextTurnPlayer = player;
            break;
        }
    }
    return nextTurnPlayer;
}




/**
 * 设置当前轮到操作的坐位号
 */
Room.prototype.setCurrentTurn = function(seatIndex){
    this.currentTurn = seatIndex;
}

/**
 * 更新游戏局数
 */
Room.prototype.updateNumOfGame = function(){
    this.numOfGame++;
}

/**
 * 重置房间数据
 */
Room.prototype.reset = function(){
    //this.gameState = this.GAME_STATE.READY;
    this.currentLunShu = 0;
    this.totalBets = 0;
    this.minGenZhu = this.diZhu;
}

/**
 * 获取当前还未弃牌的
 */
Room.prototype.getPlayingUserCount = function () {
    var playingUserCount = 0;
    for(var i=0;i<this.seats.length;i++){
        var player = this.seats[i];
        if(player.state==player.PLAY_STATE.WAITTING||player.state==player.PLAY_STATE.PLAYING){
            playingUserCount++;
        }
    }
    return playingUserCount;
}

/**
 * 房间抽水（每局抽底注的50%）,扣除
 */
Room.prototype.choushui = async function(){
    let fee = this.diZhu*this.choushuiRate
    for(let i=0;i<this.seats.length;i++){
       var player = this.seats[i];
       if(player.state!=player.PLAY_STATE.FREE){
           //console.log('*******抽水【'+player.userId+'】*******');
           let change_before = player.coins;
           player.updateCoins(player.coins-fee);
           let id = this.serial_num+this.kindId +""
           try {
               gameService.updateBonusPoolByRoomCode(fee, id);
               agentService.someLevelRebate(player.userId, fee, 3, '炸金花')

               //保存抽水记录
               let choushui_record = {}
               choushui_record.fk_player_id = player.userId;
               choushui_record.username = crypto.toBase64(player.name);
               choushui_record.choushui_before = change_before;
               choushui_record.choushui_count = fee;
               choushui_record.remark = '炸金花房间['+this.roomId+']收取服务费';
               choushui_record.record_time = Math.floor(Date.now() / 1000);
               choushui_record.treasure_type = 'coins';
               choushui_record.room_id = 'zjh';
               await commonService.saveAsync("t_choushui_record", choushui_record);
                if(this.room_type !=="shiwanfang"){
                    commonService.changeNumberOfObjForTableAsync('t_users', { coins: -fee, choushui: fee }, { userid: player.userId});
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
Room.prototype.recordWatchTimes = function(){
    for(let i=0;i<this.seats.length;i++) {
        var player = this.seats[i];
        if (player.state != player.PLAY_STATE.FREE) {
            player.updateWatchTimes(0);
        }else{
            player.updateWatchTimes(player.watchTimes+1);
        }
    }
}


/**
 * 设置倒计时
 */
Room.prototype.setTimer = function(timer){
    //先清除一下上个倒计时，防止重复
    this.clearTimer();
    this.timer = timer;
}
/**
 * 取消倒计时
 */
Room.prototype.clearTimer = function(){
    clearInterval(this.timer);
    this.timer = null;
}
module.exports = Room;