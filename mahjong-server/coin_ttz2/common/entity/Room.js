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
    this.shaizi=[];
    //创建者默认设置为庄家
    this.isBanker = 1;
    this.robotCount = roomConfig.robotCount;
    //房间类型畅玩房或者不同dizhu的其他房间
    this.room_type= roomConfig.room_type;
    //座位列表
    this.seats = [];
    //是否是私密 0 否 1 是
    this.isPrivate = roomConfig.isPrivate;

    //是否是固定房
    this.isDaiKai = roomConfig.isDaiKai||0;

    //底注
    this.diZhu = roomConfig.diZhu;
    //房间的创建时间
    this.createTime = roomConfig.createTime;
    //最大容纳人数
    this.seatCount = roomConfig.seatCount;
    //最大游戏局数 -1 表示无限
    this.maxGames = roomConfig.maxGames;

    //最大抢庄倍数
    this.qiangZhuangBeiShu = roomConfig.qiangZhuangBeiShu;
    //游戏id
    this.kindId = roomConfig.kindId;
    //游戏场次
    this.serial_num = roomConfig.serial_num;
    //最低进入分数
    this.minScoreLimit = roomConfig.minScoreLimit;
    //最高进入分数
    this.maxScoreLimit =roomConfig.maxScoreLimit;
    //试玩房的初始金币
    this.coins = roomConfig.coins;
    //房间抽水率(按照底注的50%抽水)
    this.choushuiRate = roomConfig.choushuiRate;

    //当前游戏局数
    this.numOfGame = 0;
    //座位号是否有玩家存在
    this.seatsHasPlayer = [];
    for (let i = 0; i < this.seatCount; i++) {
        this.seatsHasPlayer[i] = false;
    }

    //游戏的状态 ready 等待玩家准备   qiangzhuang 抢庄阶段  yazhu 押注阶段  settlement 分数结算阶段
    this.GAME_STATE = {READY:'ready',QIANG_ZHUANG:'qiangzhuang',YA_ZHU:'yazhu',SETTLEMENT:'settlement'};

    this.gameState = this.GAME_STATE.READY;
    //等待准备超时时间（10S）
    this.READY_COUNTDOWN = 10*1000;
    //操作超时时间 10s
    this.OPT_COUNTDOWN = 10*1000;

    /**
     * 当前房间的倒计时
     * @type {number}
     */
    this.countdown = 0;

    /**
     * 房间的定时器
     * @type {null}
     */
    this.timer = null;

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
        if (player.isOnline) {
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
        if (player.isOnline==1&&player.state==player.PLAY_STATE.READY) {
            count++;
        }
    }
    return count;
}

/**
 * 获取已准备的玩家信息
 */
Room.prototype.getPreparedPlayer = function(){
    var s = [];
    for (let i = 0; i < this.seats.length; i++) {
        var player = this.seats[i];
        if (player.isOnline==1&&player.state==player.PLAY_STATE.READY) {
            s.push(player);
        }
    }
    return s;
}

/**
 * 设置游戏的状态
 * @param state
 */
Room.prototype.setState = function(state){
    this.gameState = state;
}


/**
 * 更新游戏局数
 */
Room.prototype.updateNumOfGame = function(){
    this.numOfGame++;
}

/**
 * 抢庄
 */
Room.prototype.qiangZhuang = function(userId,beishu){
    var data = {};
    var timestamp = new Date().getTime();
    data.userId = userId;
    data.beishu = beishu;
    data.timestamp = timestamp;
    if(!this.qiangZhuangList){
        this.qiangZhuangList = [];
    }
    this.qiangZhuangList.push(data);

    var player = this.getPlayerById(userId);
    player.setBetBeiShu(beishu);
    //设置状态为已抢庄
    player.setOptState(1);
}

/**
 * 判断某个游戏状态中，所有的玩家是否都已经操作
 */
Room.prototype.isAllOpt = function(gameState){
    var isAllOpt = true;
    for(let i=0;i<this.seats.length;i++){
        let player = this.seats[i];
        //如果是游戏中的玩家
        if(player.state!=player.PLAY_STATE.FREE){
            if(gameState==this.GAME_STATE.QIANG_ZHUANG){
                //如果没操作
                if(player.optState!=1){
                    return false;
                }
            }else if(gameState==this.GAME_STATE.YA_ZHU){//押注阶段
                //如果没操作
                if(!player.isBanker&&player.optState!=2){
                    return false;
                }
            }else if(gameState==this.GAME_STATE.SETTLEMENT){//结算阶段
                //如果没操作
                if(player.optState!=3){
                    return false;
                }
            }
        }
    }

    return isAllOpt;
}



/**
 * 重置房间数据
 */
Room.prototype.reset = function(){
    //this.setState(this.GAME_STATE.READY);
    this.qiangZhuangList = [];
}


/**
 * 设置倒计时
 */
Room.prototype.setTimer = function(timer,timeout){
    this.clearTimer();
    this.timer = setTimeout(timer,timeout);
}
/**
 * 取消倒计时
 */
Room.prototype.clearTimer = function(){
    if(this.timer){
        clearTimeout(this.timer);
        this.timer = null;
    }
}


/**
 * 房间抽水（每局抽底注的50%）,扣除
 */
Room.prototype.choushui = async function(){
    let fee = this.diZhu*this.choushuiRate
    let id = this.kindId+ this.serial_num;
    for(let i=0;i<this.seats.length;i++){
        var player = this.seats[i];
        if(player.state!=player.PLAY_STATE.FREE){
            let change_before = player.coins;
            player.updateCoins(player.coins-fee);
            try {
                gameService.updateBonusPoolByRoomCode(fee, id);
                agentService.someLevelRebate(player.userId, fee, 3, '推筒子')

                //保存抽水记录
                let choushui_record = {}
                choushui_record.fk_player_id = player.userId;
                choushui_record.username = crypto.toBase64(player.name);
                choushui_record.choushui_before = change_before;
                choushui_record.choushui_count = fee;
                choushui_record.remark = '牛牛房间['+this.roomId+']收取服务费';
                choushui_record.record_time = Math.floor(Date.now() / 1000);
                choushui_record.treasure_type = 'coins';
                choushui_record.room_id = 'niuniu';
                await commonService.saveAsync("t_choushui_record", choushui_record);
                if(this.room_type!=="shiwanfang"){
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
 * 设置倒计时
 */
Room.prototype.setIntervalTimer = function(timer){
    //先清除一下上个倒计时，防止重复
    this.clearIntervalTimer();
    this.interValTimer = timer;
}
/**
 * 取消倒计时
 */
Room.prototype.clearIntervalTimer = function(){
    clearInterval(this.interValTimer);
    this.interValTimer = null;
}
module.exports = Room;