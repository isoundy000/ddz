/*****************************************************************************
 * gamemgr.js
 * 关于游戏实例的通用方法
 * 由发牌控制引入
 * lw
 * May.25th,2018
 *****************************************************************************/
var db = require('../utils/db');
var redisClient = require('../utils/redis');
var uArray = require('../utils/uArray');

/*
 * 获取某一游戏类型的控制参数
 * 有解析错误保护 以及 支持数值、字符串不同类型的容错处理
 * jsonCtrlParam 控制参数 可以取值 0 或者json对象 
 *                   json 对象包括游戏类型，形如 {"zzmj":50, "hjmj":20}
 * gameType 游戏类型，字符串，如 "zzmj"
 * 注意：保留给金币场使用 
 */
exports.getCtrlParam = function (jsonCtrlParam, gameType) {
        let ctrl_value = 0;

        // console.log("gameMgr getCtrlParam jsonCtrlParam: ", jsonCtrlParam);
        if (jsonCtrlParam != 0) {
            try {
                let ctrl_param = JSON.parse(jsonCtrlParam);
                if (ctrl_param != null && ctrl_param.hasOwnProperty(gameType)) {
                    ctrl_value = ctrl_param[gameType];
                    if (typeof(ctrl_value) == "string") {
                        ctrl_value = parseInt(ctrl_value, 10);
                        // console.log("gameMgr getCtrlParam ctrl_value parseInt: ", ctrl_value);
                    }
                }
                else {
                    ctrl_value = 0;
                }
            }
            catch (err) {
                console.log("gameMgr getCtrlParam catch err: ", err.message);
                ctrl_value = 0;
            }
            
        }
        else {
            ctrl_value = 0;
        }
        // console.log("gameMgr getCtrlParam ctrl_value: ", ctrl_value);

        return ctrl_value;
}

/*
 * 获取某一游戏类型的控制参数
 * 有解析错误保护 以及 支持数值、字符串不同类型的容错处理
 * jsonCtrlParam 控制参数 可以取值 0 或者json对象 
 *                   json 对象包括游戏类型，形如 {"zzmj":50, "hjmj":20}
 * gameType 游戏类型，字符串，如 "zzmj"
 */
exports.getCtrlParamV2 = function (jsonCtrlParam, gameType) {
    let ctrl_value = 0;

    // console.log("gameMgr getCtrlParamV2 jsonCtrlParam: ", jsonCtrlParam);
    try {
        let ctrl_param = null;
        if (typeof(jsonCtrlParam) == "number") {
            ctrl_value = jsonCtrlParam;
        }
        else if (typeof(jsonCtrlParam) == "string") {
            if (jsonCtrlParam.indexOf(':') == -1) {
                ctrl_value = parseInt(jsonCtrlParam, 10);
            }
            else {
                ctrl_param = JSON.parse(jsonCtrlParam);
            }
        }
        else if (typeof(jsonCtrlParam) == "object") {
            if (jsonCtrlParam != null) {
                if (jsonCtrlParam.hasOwnProperty("ctrl_param")) {
                    ctrl_param = JSON.parse(jsonCtrlParam['ctrl_param']);
                }
                else {
                    ctrl_param = jsonCtrlParam;
                }
            }
        }
        
        if (ctrl_param != null && ctrl_param.hasOwnProperty(gameType)) {
            ctrl_value = ctrl_param[gameType];
            if (typeof(ctrl_value) == "string") {
                ctrl_value = parseInt(ctrl_value, 10);
                // console.log("gameMgr getCtrlParamV2 ctrl_value parseInt: ", ctrl_value);
            }
        }
        
    }
    catch (ex) {
        // console.log("gameMgr getCtrlParamV2 catch ex: ", ex.message);
        ctrl_value = 0;
    }

    // console.log("gameMgr getCtrlParamV2 ctrl_value: ", ctrl_value);

    return ctrl_value;
}

/*
 * 根据玩家的好牌概率，可能会修改其摸到的牌
 * game 游戏实例
 * seatIndex 玩家座位
 * luckDegree 玩家好牌概率 取值范围 -100 ~ 100 
 * 注意：保留给金币场使用 
 */
exports.mopaiByLuckDegree = function(game, seatIndex, luckDegree) {
    if (luckDegree < -100 || luckDegree == 0 || luckDegree > 100) {
        console.log("gamemgr_zzmj mopaiByLuckDegree param error luckDegree: ", luckDegree)
        return ;
    }

    if (game == null || seatIndex < 0 || seatIndex > 3) {
        console.log("gamemgr_zzmj mopaiByLuckDegree param error game: %j, seatIndex: %d", game, seatIndex);
        return ;
    }

    let edge = luckDegree > 0 ? luckDegree : (0-luckDegree);
    let startCtrl = Math.floor(Math.random() * 100);
    // console.log('startCtrl: ', startCtrl);
    // startCtrl 在 0 ~ edge 之间时，启动干涉机制
    if (startCtrl <= edge) {
        if (luckDegree > 0) {

            console.log("***********换好牌***********")

            // 换到好牌
            allotNicePai(game, seatIndex);
        }
        else {
            console.log("***********换差牌***********")
            // 换到差牌
            allotBadPai(game, seatIndex);
        }
    }
}

/*
 * 祝你好运
 * 根据玩家的好牌概率，可能会修改其摸到的牌
 * game 游戏实例
 * seatIndex 玩家座位 
 * 由于会访问redis 和数据库，这个是带回调的异步版本
 * 上面的原版本保留给金币场使用 
 */
exports.goodLuck = function(game, seatIndex, callback) {
    
    let userId = game.gameSeats[seatIndex].userId;
    let key = 't_user.' + userId + '.ctrl_param';
    redisClient.get(key, function(err, reply) {
        if (err || null == reply || '' == reply) {
            // console.log('mopaiByLuckDegree redisClient.get err: %j, replay: %j', err, reply);

            // 从mysql 数据库取值
            var sql = 'SELECT ctrl_param FROM t_users WHERE userid = ?';
            const args = uArray.push(userId);

            // db.queryForObject(sql, args, luck_callback, game, seatIndex, true);
            db.queryForObject(sql, args, function (err, returnData) {
                luck_callback(err, returnData, game, seatIndex, true);
                callback(null, game, seatIndex);
            });
        }
        else {
            console.log('mopaiByLuckDegree redis reply: ', reply);
            luck_callback(null, reply, game, seatIndex);
            callback(null, game, seatIndex);
        }
    });
}

function luck_callback(err, result, game, seatIndex, upflag) {
    if (err) {
        console.log("gamemgr luck_callback err: ", err);
        return ;
    }

    // console.log("gamemgr luck_callback result: ", result);

    // 控制参数
    let gameType = game.roomInfo.conf.type;
    let luckDegree = exports.getCtrlParamV2(result, gameType);
    if (luckDegree < -100 || luckDegree == 0 || luckDegree > 100) {
        // console.log("gamemgr luck_callback param error luckDegree: ", luckDegree);
        return ;
    }

    if (game == null || seatIndex < 0 || seatIndex > 3) {
        console.log("gamemgr luck_callback param error game: %j, seatIndex: %d", game, seatIndex);
        return ;
    }

    let edge = luckDegree > 0 ? luckDegree : (0-luckDegree);
    let startCtrl = Math.floor(Math.random() * 100);
    // console.log('startCtrl: ', startCtrl);
    // startCtrl 在 0 ~ edge 之间时，启动干涉机制
    if (startCtrl <= edge) {
        if (luckDegree > 0) {
            // 换到好牌
            allotNicePai(game, seatIndex);
        }
        else {
            // 换到差牌
            allotBadPai(game, seatIndex);
        }
    }

    // 更新到redis 
    if (upflag) {
        let key = 't_user.' + game.gameSeats[seatIndex].userId + '.ctrl_param';
        redisClient.set(key, luckDegree, function (err, reply) {
            if (err) {
                console.log('redisClient.set err: ', err);
            }

            console.log('redisClient.set reply: ', reply);
        });
    }
}

/*
 * 发一张有用的好牌
 * game 游戏实例
 * seatIndex 玩家座位
 */
function allotNicePai(game, seatIndex) {

    let gameType = game.roomInfo.conf.type;

    if (gameType == "hjmj") {
        allotNicePai_hjmj(game, seatIndex);
    }
    else if (gameType == "hxmj") {
        allotNicePai_hxmj(game, seatIndex);
    }
    else if (gameType == "xzdd") {
        allotNicePai_xzdd(game, seatIndex);
    }
    else if (gameType == "xlch") {
        allotNicePai_xlch(game, seatIndex);
    }
    else {
        allotNicePai_default(game, seatIndex);
    }
}

/*
 * 发一张有用的好牌 滑县麻将
 * game 游戏实例
 * seatIndex 玩家座位
 */
function allotNicePai_hxmj(game, seatIndex) {
    // 如果已经听牌，直接找一张能胡的牌
    seatData = game.gameSeats[seatIndex];
    if (seatData.tingMap != null) {
        let tingMapLength = Object.getOwnPropertyNames(seatData.tingMap).length;
        // console.log('gamemgr allotNicePai_hxmj tingMapLength: ', tingMapLength);
        if (tingMapLength > 0) {
            for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
                let pai = game.mahjongs[index];
                if (seatData.tingMap.hasOwnProperty(pai) ) {
                    // console.log('gamemgr allotNicePai_hxmj 听牌列表项: ', pai);
                    let temp = game.mahjongs[game.currentIndex];
                    game.mahjongs[game.currentIndex] = pai;
                    game.mahjongs[index] = temp;
                    return;
                }
            }
        }
    }

    // 从当前牌开始查找，如果好牌就与当前牌互换
    for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
        let pai = game.mahjongs[index];
        if (isNicePai_hxmj(game, seatIndex, pai) ) {
            let temp = game.mahjongs[game.currentIndex];
            game.mahjongs[game.currentIndex] = pai;
            game.mahjongs[index] = temp;
            return ;
        }
    }
}

/*
 * 发一张有用的好牌 获嘉麻将
 * game 游戏实例
 * seatIndex 玩家座位
 */
function allotNicePai_hjmj(game, seatIndex) {
    // 如果已经听牌，直接找一张能胡的牌
    seatData = game.gameSeats[seatIndex];
    if (seatData.tingMap != null) {
        let tingMapLength = Object.getOwnPropertyNames(seatData.tingMap).length;
        // console.log('gamemgr allotNicePai_hjmj tingMapLength: ', tingMapLength);
        if (tingMapLength > 0) {
            for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
                let pai = game.mahjongs[index];
                if (seatData.tingMap.hasOwnProperty(pai) ) {
                    // console.log('gamemgr allotNicePai_hjmj 听牌列表项: ', pai);
                    let temp = game.mahjongs[game.currentIndex];
                    game.mahjongs[game.currentIndex] = pai;
                    game.mahjongs[index] = temp;
                    return;
                }
            }
        }
    }

    // 从当前牌开始查找，如果好牌就与当前牌互换
    for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
        let pai = game.mahjongs[index];
        if (isNicePai_hjmj(game, seatIndex, pai) ) {
            let temp = game.mahjongs[game.currentIndex];
            game.mahjongs[game.currentIndex] = pai;
            game.mahjongs[index] = temp;
            return ;
        }
    }
}

/*
 * 发一张有用的好牌 血战到底
 * game 游戏实例
 * seatIndex 玩家座位
 */
function allotNicePai_xzdd(game, seatIndex) {
    // 如果已经听牌，直接找一张能胡的牌
    seatData = game.gameSeats[seatIndex];
    if (seatData.tingMap != null) {
        let tingMapLength = Object.getOwnPropertyNames(seatData.tingMap).length;
        // console.log('gamemgr allotNicePai_xzdd tingMapLength: ', tingMapLength);
        if (tingMapLength > 0) {
            for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
                let pai = game.mahjongs[index];
                if (seatData.tingMap.hasOwnProperty(pai) ) {
                    // console.log('gamemgr allotNicePai_xzdd 听牌列表项: ', pai);
                    let temp = game.mahjongs[game.currentIndex];
                    game.mahjongs[game.currentIndex] = pai;
                    game.mahjongs[index] = temp;
                    return;
                }
            }
        }
    }

    // 从当前牌开始查找，如果好牌就与当前牌互换
    for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
        let pai = game.mahjongs[index];
        if (isNicePai_scmj(game, seatIndex, pai) ) {
            let temp = game.mahjongs[game.currentIndex];
            game.mahjongs[game.currentIndex] = pai;
            game.mahjongs[index] = temp;
            return ;
        }
    }
}

/*
 * 发一张有用的好牌 血流成河
 * game 游戏实例
 * seatIndex 玩家座位
 */
function allotNicePai_xlch(game, seatIndex) {
    // 如果已经听牌，按1/2的概率直接找一张能胡的牌
    seatData = game.gameSeats[seatIndex];
    if (seatData.tingMap != null) {

        console.log("&&&&&&&&&&有听牌&&&&&&&&&&&&");

        let tingMapLength = Object.getOwnPropertyNames(seatData.tingMap).length;
        // console.log('gamemgr allotNicePai_xlch tingMapLength: ', tingMapLength);
        if (tingMapLength > 0) {
            let startCtrl = Math.floor(Math.random() * 100);
            //console.log('gamemgr allotNicePai_xlch startCtrl: ', startCtrl);
            //有50%的概率直接胡牌
            if (startCtrl < 50) {
                for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
                    let pai = game.mahjongs[index];
                    if (seatData.tingMap.hasOwnProperty(pai) ) {
                        console.log('获取到了可胡的牌: ', pai);
                        let temp = game.mahjongs[game.currentIndex];
                        game.mahjongs[game.currentIndex] = pai;
                        game.mahjongs[index] = temp;
                        return;
                    }
                }
            }
        }
    }


    //如果当前手牌中有刻子，优先发能杠的牌
    if(seatData.countMap){
        let mahjongCountMap = seatData.countMap;
        //存储当前手牌中所有的刻子
        let keziList = [];
        for(let key in mahjongCountMap){
            if(mahjongCountMap[key]==3){
                keziList.push(key);
            }
        }
        //若手牌中有刻子，则查找剩余牌中能杠的牌
        if(keziList.length>0){

            console.log("&&&&&&&&&&有刻子&&&&&&&&&&&&");
            let startCtrl = Math.floor(Math.random() * 100);
            //console.log('gamemgr allotNicePai_xlch startCtrl: ', startCtrl);
            //有50%的概率直接获取暗杠牌
            if (startCtrl < 50) {
                //从剩余牌中查找能组成杠的牌
                for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
                    let pai = game.mahjongs[index];
                    if (keziList.indexOf(pai) > -1) {
                        console.log('获取到了可杠的牌: ', pai);
                        let temp = game.mahjongs[game.currentIndex];
                        game.mahjongs[game.currentIndex] = pai;
                        game.mahjongs[index] = temp;
                        return;
                    }
                }
            }
        }
    }

    //优先发能回头杠的牌
    if(seatData.pengs){
        var pengsList = seatData.pengs;
        if(pengsList.length>0){

            console.log("&&&&&&&&&&有碰牌&&&&&&&&&&&&");

            //从剩余牌中查找能组成杠的牌
            for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
                let pai = game.mahjongs[index];
                if (pengsList.indexOf(pai)>-1) {
                    console.log('获取到了回头杠的牌: ', pai);
                    let temp = game.mahjongs[game.currentIndex];
                    game.mahjongs[game.currentIndex] = pai;
                    game.mahjongs[index] = temp;
                    return;
                }
            }
        }
    }


    // 从当前牌开始查找，如果好牌就与当前牌互换
    for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
        let pai = game.mahjongs[index];
        if (isNicePai_scmj(game, seatIndex, pai) ) {
            let temp = game.mahjongs[game.currentIndex];
            game.mahjongs[game.currentIndex] = pai;
            game.mahjongs[index] = temp;
            return ;
        }
    }
}

/*
 * 发一张有用的好牌 用于 郑州麻将、红中麻将、推倒胡 
 * game 游戏实例
 * seatIndex 玩家座位
 */
function allotNicePai_default(game, seatIndex) {
    let gameType = game.roomInfo.conf.type;

    // 如果已经听牌，直接找一张能胡的牌
    seatData = game.gameSeats[seatIndex];
    if (seatData.tingMap != null) {
        let tingMapLength = Object.getOwnPropertyNames(seatData.tingMap).length;
        // console.log('gamemgr allotNicePai_default tingMapLength: ', tingMapLength);
        if (tingMapLength > 0) {
            for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
                if (gameType == "zzmj" && index == game.mahjongs.length-14) {
                    // 郑州麻将明牌不能换
                    // console.log('gamemgr allotNicePai_default 明牌跳过: ', index);
                    continue;
                }
                let pai = game.mahjongs[index];
                if (seatData.tingMap.hasOwnProperty(pai) ) {
                    // console.log('gamemgr allotNicePai_default 听牌列表项: ', pai);
                    let temp = game.mahjongs[game.currentIndex];
                    game.mahjongs[game.currentIndex] = pai;
                    game.mahjongs[index] = temp;
                    return;
                }
            }
        }
    }

    // 从当前牌开始查找，如果好牌就与当前牌互换
    for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
        if (gameType == "zzmj" && index == game.mahjongs.length-14) {
            // 郑州麻将明牌不能换
            // console.log('gamemgr_zzmj allotNicePai 明牌跳过: ', index);
            continue;
        }
        let pai = game.mahjongs[index];
        if (isNicePai_default(game, seatIndex, pai)) {
            let temp = game.mahjongs[game.currentIndex];
            game.mahjongs[game.currentIndex] = pai;
            game.mahjongs[index] = temp;
            return ;
        }
    }
}

/*
 * 发一张没用的差牌
 * game 游戏实例
 * seatIndex 玩家座位
 */
function allotBadPai(game, seatIndex) {

    let gameType = game.roomInfo.conf.type;

    if (gameType == "hjmj") {
        allotBadPai_hjmj(game, seatIndex);
    }
    else if (gameType == "hxmj") {
        allotBadPai_hxmj(game, seatIndex);
    }
    else if (gameType == "xzdd" || gameType == "xlch") {
        allotBadPai_scmj(game, seatIndex);
    }
    else {
        allotBadPai_default(game, seatIndex);
    }
}

/*
 * 发一张没用的差牌 滑县麻将
 * game 游戏实例
 * seatIndex 玩家座位
 */
function allotBadPai_hxmj(game, seatIndex) {
    let gameType = game.roomInfo.conf.type;

    // 从当前牌开始查找，如果差牌就与当前牌互换
    for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
        let pai = game.mahjongs[index];
        if (!isNicePai_hxmj(game, seatIndex, pai)) {
            let temp = game.mahjongs[game.currentIndex];
            game.mahjongs[game.currentIndex] = pai;
            game.mahjongs[index] = temp;
            return ;
        }
    }
}

/*
 * 发一张没用的差牌 获嘉麻将
 * game 游戏实例
 * seatIndex 玩家座位
 */
function allotBadPai_hjmj(game, seatIndex) {
    let gameType = game.roomInfo.conf.type;

    // 从当前牌开始查找，如果差牌就与当前牌互换
    for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
        let pai = game.mahjongs[index];
        if (!isNicePai_hjmj(game, seatIndex, pai)) {
            let temp = game.mahjongs[game.currentIndex];
            game.mahjongs[game.currentIndex] = pai;
            game.mahjongs[index] = temp;
            return ;
        }
    }
}

/*
 * 发一张没用的差牌 血战到底、血流成河 
 * game 游戏实例
 * seatIndex 玩家座位
 * PS:  根据牌墙当前牌是否缺门来控制换牌类型，以免缺门牌发的太多 
 */
function allotBadPai_scmj(game, seatIndex) {
    let gameType = game.roomInfo.conf.type;
    let seatData = game.gameSeats[seatIndex];
    let current = game.mahjongs[game.currentIndex];

    let notQue = true;
    if (getMJType(current) == seatData.que) {
        // 记录当前牌是否是缺门 
        notQue = false;
    }




    // 从当前牌开始查找，如果差牌就与当前牌互换
    for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
        let pai = game.mahjongs[index];
        // 如果当前牌是非缺门牌，找一张非缺门的差牌，避免给被控玩家一直发缺门牌 
        if (isBadPai_scmj(game, seatIndex, pai, notQue)) {
            let temp = game.mahjongs[game.currentIndex];
            game.mahjongs[game.currentIndex] = pai;
            game.mahjongs[index] = temp;
            return ;
        }
    }
}

/*
 * 发一张没用的差牌
 * game 游戏实例
 * seatIndex 玩家座位
 */
function allotBadPai_default(game, seatIndex) {
    let gameType = game.roomInfo.conf.type;

    // 从当前牌开始查找，如果差牌就与当前牌互换
    for (let index = game.currentIndex; index < game.mahjongs.length; index++) {
        if (gameType == "zzmj" && index == game.mahjongs.length-14) {
            // 郑州麻将明牌不能换
            // console.log('gamemgr_zzmj allotBadPai 明牌跳过: ', index);
            continue;
        }
        let pai = game.mahjongs[index];
        if (!isNicePai_default(game, seatIndex, pai)) {
            let temp = game.mahjongs[game.currentIndex];
            game.mahjongs[game.currentIndex] = pai;
            game.mahjongs[index] = temp;
            return ;
        }
    }
}

/*
 * 判断一张牌对于某玩家是好牌还是差牌 用于 郑州麻将、红中麻将、推倒胡 
 * game 游戏实例
 * seatIndex 玩家座位
 * pai  牌
 */
function isNicePai_default(game, seatIndex, pai) {
    // 混牌是好牌
    if (pai == game.hun) {
        // console.log('gamemgr isNicePai_default 好牌(混牌): ', pai);
        return true;
    }

    // 如果当前牌在听牌列表，说明能胡，是好牌
    seatData = game.gameSeats[seatIndex];
    if (seatData.tingMap != null && seatData.tingMap.hasOwnProperty(pai)) {
        // console.log('gamemgr isNicePai_default 好牌(听牌列表项): ', pai);
        return true;
    }

    // 如果当前牌是一张可搭牌，是好牌
    // 同张
    let count = seatData.countMap[pai];
    if (count != null && count > 0) {
        // console.log('gamemgr isNicePai_default 好牌(同张): ', pai);
        return true;
    }

    // 万、饼、条看是否有邻张 
    if (pai < 27) {
        if (pai == 0 || pai == 9 || pai == 18) {
            // 一萬、一饼、一条 
            count = seatData.countMap[pai+1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_default 好牌(一找二): ', pai);
                return true;
            }
        }
        else if (pai == 8 || pai == 17 || pai == 26) {
            // 九萬、九饼、九条 
            count = seatData.countMap[pai-1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_default 好牌(九找八): ', pai);
                return true;
            }
        }
        else {
            // 二 到 八 萬 饼 条
            count = seatData.countMap[pai-1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_default 好牌(小邻): ', pai);
                return true;
            }

            count = seatData.countMap[pai+1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_default 好牌(大邻): ', pai);
                return true;
            }
        }
    }
    
    // 其他，不是好牌
    // console.log('gamemgr isNicePai_default 差牌: ', pai);
    return false;
}

/*
 * 判断一张牌对于某玩家是好牌还是差牌 用于 滑县麻将
 * game 游戏实例
 * seatIndex 玩家座位
 * pai  牌
 */
function isNicePai_hxmj(game, seatIndex, pai) {
    let head_feng   = game.roomInfo.conf.head_feng; // 不管是否东风带头，好牌标准一样 
    let que_men = game.roomInfo.conf.que_men;       // 不管是否缺门，同样以可搭配为标准 

    // 混牌是好牌
    if (pai == game.hun) {
        // console.log('gamemgr isNicePai_hxmj 好牌(混牌): ', pai);
        return true;
    }

    // 如果当前牌在听牌列表，说明能胡，是好牌
    seatData = game.gameSeats[seatIndex];
    if (seatData.tingMap != null && seatData.tingMap.hasOwnProperty(pai)) {
        // console.log('gamemgr isNicePai_hxmj 好牌(听牌列表项): ', pai);
        return true;
    }

    // 如果当前牌是一张可搭牌，是好牌
    // 同张
    let count = seatData.countMap[pai];
    if (count != null && count > 0) {
        // console.log('gamemgr isNicePai_hxmj 好牌(同张): ', pai);
        return true;
    }

    // 万、饼、条看是否有邻张 
    if (pai < 27) {
        if (pai == 0 || pai == 9 || pai == 18) {
            // 一萬、一饼、一条 
            count = seatData.countMap[pai+1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_hxmj 好牌(一找二): ', pai);
                return true;
            }
        }
        else if (pai == 8 || pai == 17 || pai == 26) {
            // 九萬、九饼、九条 
            count = seatData.countMap[pai-1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_hxmj 好牌(九找八): ', pai);
                return true;
            }
        }
        else {
            // 二 到 八 萬 饼 条
            count = seatData.countMap[pai-1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_hxmj 好牌(小邻): ', pai);
                return true;
            }

            count = seatData.countMap[pai+1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_hxmj 好牌(大邻): ', pai);
                return true;
            }
        }
    }
    else {
        // 风成句，查找其他风牌 
        
        if (head_feng) { // 东风带头 
            // 因为前面已检查过同张，这里是匹配的风成句规则 
            if (pai == 27) {
                // console.log('gamemgr isNicePai_hxmj 东风带头，东风是好牌(风成句): ', pai);
                return true;
            }
        }

        if (pai == 27 || pai == 28 || pai == 29 || pai == 30) {
            // 東 南 西 北 
            count = seatData.countMap[27] + seatData.countMap[28] + 
                    seatData.countMap[29] + seatData.countMap[30];
            if (count != null && count > 0 && count%3 != 0) {
                // 因为前面已检查过同张，这里是匹配的风成句规则 
                // console.log('gamemgr isNicePai_hxmj 好牌(风成句): ', pai);
                return true;
            }
        }
        else if (pai == 31 || pai == 32 || pai == 33) {
            // 中 發 白 
            count = seatData.countMap[31] + seatData.countMap[32] + seatData.countMap[33];
            if (count != null && count > 0 && count%3 != 0) {
                // 因为前面已检查过同张，这里是匹配的风成句规则 
                // console.log('gamemgr isNicePai_hxmj 好牌(风成句): ', pai);
                return true;
            }
        }

    }
    
    // 其他，不是好牌
    // console.log('gamemgr isNicePai_hxmj 差牌: ', pai);
    return false;
}

/*
 * 判断一张牌对于某玩家是好牌还是差牌 用于 获嘉麻将
 * game 游戏实例
 * seatIndex 玩家座位
 * pai  牌
 */
function isNicePai_hjmj(game, seatIndex, pai) {
    let ju_19   = game.roomInfo.conf.ju_19;
    let ju_feng = game.roomInfo.conf.ju_feng;

    // 如果当前牌在听牌列表，说明能胡，是好牌
    seatData = game.gameSeats[seatIndex];
    if (seatData.tingMap != null && seatData.tingMap.hasOwnProperty(pai)) {
        // console.log('gamemgr isNicePai_hjmj 好牌(听牌列表项): ', pai);
        return true;
    }

    // 如果当前牌是一张可搭牌，是好牌
    // 同张
    let count = seatData.countMap[pai];
    if (count != null && count > 0) {
        // console.log('gamemgr isNicePai_hjmj 好牌(同张): ', pai);
        return true;
    }

    // 万、饼、条看是否有邻张 
    if (pai < 27) {
        if (pai == 0 || pai == 9 || pai == 18) {
            // 一萬、一饼、一条 
            count = seatData.countMap[pai+1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_hjmj 好牌(一找二): ', pai);
                return true;
            }
            else {
                // 如果有一九句规则，查找其他是一、九的牌
                if (ju_19) {
                    count = seatData.countMap[0] + seatData.countMap[8] + seatData.countMap[9] + 
                            seatData.countMap[17] + seatData.countMap[18] + seatData.countMap[26];
                    if (count != null && count > 0) {
                        // console.log('gamemgr isNicePai_hjmj 好牌(一九句): ', pai);
                        return true;
                    }
                }
            }
        }
        else if (pai == 8 || pai == 17 || pai == 26) {
            // 九萬、九饼、九条 
            count = seatData.countMap[pai-1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_hjmj 好牌(九找八): ', pai);
                return true;
            }
            else {
                // 如果有一九句规则，查找其他是一、九的牌
                if (ju_19) {
                    count = seatData.countMap[0] + seatData.countMap[8] + seatData.countMap[9] + 
                            seatData.countMap[17] + seatData.countMap[18] + seatData.countMap[26];
                    if (count != null && count > 0) {
                        // console.log('gamemgr isNicePai_hjmj 好牌(一九句): ', pai);
                        return true;
                    }
                }
            }
        }
        else {
            // 二 到 八 萬 饼 条
            count = seatData.countMap[pai-1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_hjmj 好牌(小邻): ', pai);
                return true;
            }

            count = seatData.countMap[pai+1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_hjmj 好牌(大邻): ', pai);
                return true;
            }
        }
    }
    else {
        // 如果有风成句规则，查找其他风牌 
        if (ju_feng) {
            if (pai == 27 || pai == 28 || pai == 29 || pai == 30) {
                // 東 南 西 北 
                count = seatData.countMap[27] + seatData.countMap[28] + 
                        seatData.countMap[29] + seatData.countMap[30];
                if (count != null && count > 0 && count%3 != 0) {
                    // 因为前面已检查过同张，这里是匹配的风成句规则 
                    // console.log('gamemgr isNicePai_hjmj 好牌(风成句): ', pai);
                    return true;
                }
            }
            else if (pai == 31 || pai == 32 || pai == 33) {
                // 中 發 白 
                count = seatData.countMap[31] + seatData.countMap[32] + seatData.countMap[33];
                if (count != null && count > 0 && count%3 != 0) {
                    // 因为前面已检查过同张，这里是匹配的风成句规则 
                    // console.log('gamemgr isNicePai_hjmj 好牌(风成句): ', pai);
                    return true;
                }
            }
            
        }
    }
    
    // 其他，不是好牌
    // console.log('gamemgr isNicePai_hjmj 差牌: ', pai);
    return false;
}

/*
 * 判断一张牌的类型
 * id  牌
 */
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
    else {
        return null;
    }
}

/*
 * 判断一张牌对于某玩家是好牌还是差牌 用于 血战到底、血流成河 
 * game 游戏实例
 * seatIndex 玩家座位
 * pai  牌
 */
function isNicePai_scmj(game, seatIndex, pai) {

    // 如果当前牌在听牌列表，说明能胡，是好牌
    seatData = game.gameSeats[seatIndex];
    if (seatData.tingMap != null && seatData.tingMap.hasOwnProperty(pai)) {
        // console.log('gamemgr isNicePai_scmj 好牌(听牌列表项): ', pai);
        return true;
    }

    // 如果是缺门的牌，直接返回是差牌
    if (getMJType(pai) == seatData.que) {
        // console.log('gamemgr isNicePai_scmj 差牌(缺门): ', pai);
        return false;
    }

    // 如果当前牌是一张可搭牌，是好牌
    // 同张
    let count = seatData.countMap[pai];
    if (count != null && count > 0) {
        // console.log('gamemgr isNicePai_scmj 好牌(同张): ', pai);
        return true;
    }

    // 万、饼、条看是否有邻张 
    if (pai < 27) {
        if (pai == 0 || pai == 9 || pai == 18) {
            // 一萬、一饼、一条 
            count = seatData.countMap[pai+1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_scmj 好牌(一找二): ', pai);
                return true;
            }
        }
        else if (pai == 8 || pai == 17 || pai == 26) {
            // 九萬、九饼、九条 
            count = seatData.countMap[pai-1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_scmj 好牌(九找八): ', pai);
                return true;
            }
        }
        else {
            // 二 到 八 萬 饼 条
            count = seatData.countMap[pai-1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_scmj 好牌(小邻): ', pai);
                return true;
            }

            count = seatData.countMap[pai+1];
            if (count != null && count > 0) {
                // console.log('gamemgr isNicePai_scmj 好牌(大邻): ', pai);
                return true;
            }
        }
    }
    
    // 其他，不是好牌
    // console.log('gamemgr isNicePai_scmj 差牌: ', pai);
    return false;
}

/*
 * 判断一张牌对于某玩家是差牌 并且非其缺门的牌 用于 血战到底、血流成河 
 * 进一步精确控制，避免之前方案给被控玩家一直发缺门牌的感觉 
 * game 游戏实例
 * seatIndex 玩家座位
 * pai  牌
 * notQue 非缺门，为true 时，缺门的牌不算差牌 
 * PS:  之所以添加本方法，而不修改isNicePai_scmj，是因为不想影响到发好牌的策略 
 */
function isBadPai_scmj(game, seatIndex, pai, notQue) {

    // 如果当前牌在听牌列表，说明能胡，是好牌
    seatData = game.gameSeats[seatIndex];
    if (seatData.tingMap != null && seatData.tingMap.hasOwnProperty(pai)) {
        console.log('gamemgr isNicePai_scmj 好牌(听牌列表项): ', pai);
        return false;
    }

    // 缺门的牌
    if (getMJType(pai) == seatData.que) {
        console.log('gamemgr isNicePai_scmj 缺门: ', pai);
        if (notQue) {
            // notQue 为true，代表需要的是非缺门的差牌，所以这张缺门的牌不能算差牌
            console.log('gamemgr isNicePai_scmj 缺门(notQue is true): ', pai);
            return false;
        }
        else {
            // 没有特意设置notQue，代表不介意是否非缺门，所以缺门的牌直接算差牌 
            console.log('gamemgr isNicePai_scmj 缺门(notQue is false): ', pai);
            return true;
        }
    }

    // 如果当前牌是一张可搭牌，是好牌
    // 同张
    let count = seatData.countMap[pai];
    if (count != null && count > 0) {
        console.log('gamemgr isNicePai_scmj 好牌(同张): ', pai);
        return false;
    }

    // 万、饼、条看是否有邻张 
    if (pai < 27) {
        if (pai == 0 || pai == 9 || pai == 18) {
            // 一萬、一饼、一条 
            count = seatData.countMap[pai+1];
            if (count != null && count > 0) {
                console.log('gamemgr isNicePai_scmj 好牌(一找二): ', pai);
                return false;
            }
        }
        else if (pai == 8 || pai == 17 || pai == 26) {
            // 九萬、九饼、九条 
            count = seatData.countMap[pai-1];
            if (count != null && count > 0) {
                console.log('gamemgr isNicePai_scmj 好牌(九找八): ', pai);
                return false;
            }
        }
        else {
            // 二 到 八 萬 饼 条
            count = seatData.countMap[pai-1];
            if (count != null && count > 0) {
                console.log('gamemgr isNicePai_scmj 好牌(小邻): ', pai);
                return false;
            }

            count = seatData.countMap[pai+1];
            if (count != null && count > 0) {
                console.log('gamemgr isNicePai_scmj 好牌(大邻): ', pai);
                return false;
            }
        }
    }
    
    // 其他，不是好牌
    console.log('gamemgr isNicePai_scmj 差牌: ', pai);
    return true;
}
