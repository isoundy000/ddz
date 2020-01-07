/**
 * @author hyw
 * @date 2018/8/15 0015
 * @description: 游戏逻辑服务
 */

/**
 * @author hyw
 * @date 2018/8/20 0020
 * @description: 扑克工具模块
 */
var commonUtil = require('../../utils/commonUtil');
/**
 * 生成一副已经洗过的扑克牌,牌的数据结构{color:0,num:1} color 3210 分别代表黑红梅方 1~13 代表值
 */
function generatePoker() {
    var pokers = [];
    for (var i = 1; i <= 4; i++) {
        for (var j = 1; j <= 13; j++) {
            var poker = {};
            poker.color = i;
            poker.num = j;
            pokers.push(poker);
        }
    }
    shuffle(pokers);
    return pokers;
}

/**
 * 洗牌
 */
function shuffle(pokers, times, scope) {
    times = times == undefined ? 10 : times;
    scope = scope == undefined ? 5 : scope;

    var index0;
    var index1;
    var len = pokers.length;
    var i = 0;
    var temp;
    var r0;
    var r1;
    while (times > 0) {
        index0 = Math.floor(Math.random() * len);
        index1 = Math.floor(Math.random() * len);

        while (index0 == index1) {
            index1 = Math.floor(Math.random() * len);
        }
        for (i = 0; i < scope; i++) {
            r0 = index0 % len;
            r1 = index1 % len;
            temp = pokers[r0];
            pokers[r0] = pokers[r1];
            pokers[r1] = temp;
            index0++;
            index1++;
        }
        times--;
    }
}

/**
 * 根据房间内当前玩家人数发牌
 * @param pokers 已经洗好的一副牌
 * @param playerCount 给几个人发牌
 */
exports.deal = function (playerCount) {
    var pokers = generatePoker();
    var playerPokerList = [];
    for (var i = 0; i < playerCount; i++) {
        //每人发3张牌
        var playerHolds = [];
        for (var j = 0; j < 3; j++) {
            var pokerLength = pokers.length;
            var random = commonUtil.randomFrom(0, pokers.length - 1);
            var poker = pokers.splice(random, 1);
            playerHolds.push(poker[0])
        }

        //按照概率进行发好牌控制
        let teshuRandom = commonUtil.randomFrom(0,100);
        if(teshuRandom<30){
            //console.log('*******获取特殊牌型*********');
            let pokerType = exports.getPokerType(playerHolds.concat());
            //console.log('当前pokerType:'+pokerType);
            if(pokerType<1){
                pokers = pokers.concat(playerHolds);
            }
            while(pokerType<1){
                playerHolds = [];
                for(var j=0;j<3;j++){
                    var pokerLength = pokers.length;
                    var random = commonUtil.randomFrom(0, pokers.length - 1);
                    var poker = pokers.splice(random,1);
                    playerHolds.push(poker[0])
                }
                pokerType = exports.getPokerType(playerHolds);
                //console.log('此刻pokerType:'+pokerType);
                if(pokerType<1){
                    pokers = pokers.concat(playerHolds);
                }
            }
            //console.log(playerHolds);
            playerPokerList.push(playerHolds);
            continue;
        }
        playerPokerList.push(pokerSort(playerHolds));
    }
    return playerPokerList;
}


/**
 * 换牌
 * @param usedPosers 已发出去的牌
 * @param pokerType 比这个牌型大  pokerType 不能是炸弹 否则会产生死循环
 */
exports.huanPai = function (usedPosers,comparedPokers) {
    var pokers = generatePoker();
    for(let i=0;i<usedPosers.length;i++){
        for(let j=0;j<pokers.length;j++){
            if(usedPosers[i].num==pokers[j].num&&usedPosers[i].color==pokers[j].color){
                pokers.splice(j,1);
                continue;
            }
        }
    }


    console.log(pokers.length);


    var playerHolds = [];
    for (let i = 0; i < 3; i++) {
        var random = commonUtil.randomFrom(0, pokers.length - 1);
        var poker = pokers.splice(random, 1);
        playerHolds.push(poker[0])
    }

    if(exports.compare(playerHolds,comparedPokers)!=1){
        pokers = pokers.concat(playerHolds);
    }

    while(exports.compare(playerHolds,comparedPokers)!=1){
        playerHolds = [];
        for(let i=0;i<3;i++){
            var random = commonUtil.randomFrom(0, pokers.length - 1);
            var poker = pokers.splice(random,1);
            playerHolds.push(poker[0])
        }
        if(exports.compare(playerHolds,comparedPokers)!=1){
            pokers = pokers.concat(playerHolds);
        }
    }
    return pokerSort(playerHolds);
}



/**
 * 获取poker的牌型 0:散牌，1:对子 2:顺子 3:金花 4:顺金 5:炸弹(三条) 6:235(遇炸弹时最大)
 */
exports.getPokerType = function (pokers) {
    var type = 0;

    if(!pokers){
        return type
    }

    if (isZhaDan(pokers)) {
        type = 5;
        return type;
    }
    if (isTongHuaShun(pokers)) {
        type = 4;
        return type;
    }
    if (isJinHua(pokers)) {
        type = 3;
        return type;
    }
    if (isShunzi(pokers)) {
        type = 2;
        return type;
    }
    if (isDuiZi(pokers)) {
        type = 1;
        return type;
    }
    if (is235(pokers)) {
        type = 6;
        return type;
    }
    return type;
}

/**
 * 是否是炸弹
 */
function isZhaDan(pokers) {
    pokers = pokerSort(pokers);
    for (var i = 1; i < pokers.length; i++) {
        if (pokers[0].num != pokers[i].num) {
            return false;
        }
    }
    return true;
}

/**
 * 是否是同花顺
 * @param pokers
 */
function isTongHuaShun(pokers) {
    //先判断是否是顺子
    if (!isShunzi(pokers)) {
        return false;
    }

    if (!isJinHua(pokers)) {
        return false;
    }
    return true;
}

/**
 * 是否是金花
 * @param pokers
 */
function isJinHua(pokers) {
    pokers = pokerSort(pokers);
    for (var i = 1; i < pokers.length; i++) {
        if (pokers[i - 1].color != pokers[i].color) {
            return false;
        }
    }
    return true;
}

/**
 * 是否是顺子
 * @param pokers
 */
function isShunzi(pokers) {
    if (is123(pokers)) {
        return true;
    }
    let logicCards = getHoldsLogicValues(pokers);
    for (var i = 1; i < logicCards.length; i++) {
        if (logicCards[i] - logicCards[i - 1] != 1) {
            return false;
        }
    }
    return true;
}

/**
 * 是否是对子
 */
function isDuiZi(pokers) {
    pokers = pokerSort(pokers);
    for (var i = 1; i < pokers.length; i++) {
        if (pokers[i - 1].num == pokers[i].num) {
            return true;
        }
    }
    return false;
}

/**
 * 是否是235
 */
function is235(pokers) {
    pokers = pokerSort(pokers);
    if (pokers[0].num == 2 && pokers[1].num == 3 && pokers[2].num == 5) {
        return true;
    } else {
        return false;
    }
}

//是否是123
function is123(pokers) {
    pokers = pokerSort(pokers);
    if (pokers[0].num == 1 && pokers[1].num == 2 && pokers[2].num == 3) {
        return true
    }
    return false;
}
/**
 * 扑克排序
 */
function pokerSort(pokers) {
    for (var i = 0; i < pokers.length - 1; i++) {//外层循环控制排序趟数
        for (var j = 0; j < pokers.length - 1 - i; j++) {//内层循环控制每一趟排序多少次
            if (parseInt(pokers[j].num) > parseInt(pokers[j + 1].num)) {
                var temp = pokers[j];
                pokers[j] = pokers[j + 1];
                pokers[j + 1] = temp;
            }
        }
    }
    return pokers;
}

/**
 * 比牌
 * @param myPokers 我的手牌
 * @param otherPokers 被比人的手牌
 * return 0 一样大 -1 我的牌小 1 我的牌大
 */
exports.compare = function (myPokers, otherPokers) {
    //获取牌型
    var myPokerType = exports.getPokerType(myPokers);
    var otherPokerType = exports.getPokerType(otherPokers);
    if (myPokerType == otherPokerType) {
        //炸弹比大小
        if (myPokerType == 5) {
            return compareZhaDan(myPokers, otherPokers)
        }
        //比较对子
        if (myPokerType == 1) {
            return compareDuiZi(myPokers, otherPokers)
        }
        //散牌, 顺子，金花，顺金大小
        if (myPokerType != 6) {
            return compareOther(myPokers, otherPokers)
        }
        return 0;
    }

    if (myPokerType > otherPokerType) {
        //判断自己的牌是不是235
        if (myPokerType == 6) {
            //对方的牌是不是炸弹
            if (otherPokerType == 5) {
                return 1;
            } else {
                return -1;
            }
        } else {
            return 1
        }
    }

    if (myPokerType < otherPokerType) {
        if (otherPokerType == 6) {
            //对方的牌是不是炸弹
            if (myPokerType == 5) {
                return -1;
            } else {
                return 1;
            }
        } else {
            return -1
        }
    }

}
//获取单张牌的logic值用来比较大小
function getCardLogicValue(card) {
    let num = parseInt(card.num)
    if (num == 1) {
        return 14;
    }
    return num
}
/**
 * 获取手牌的logic值用来比较大小
 * @param {*} holds 
 * @return {Array} holds
 */
function getHoldsLogicValues(holds) {
    let logicCards = [];
    for (var i = 0; i < holds.length; i++) {
        logicCards.push(getCardLogicValue(holds[i]))
    }
    logicCards.sort((a, b) => {
        return a - b
    });
    return logicCards;
}
/**
 * 比较同类型散牌,顺子，金花，同花顺大小
 * @param {*} myPokers 
 * @param {*} otherPokers 
 */
function compareOther(myPokers, otherPokers) {
    let mIs123 = is123(myPokers);
    let oIs123 = is123(otherPokers);
    //双方都是123
    if (mIs123 && oIs123) {
        return 0
    } 
    //我是123
    else if (mIs123 && !oIs123) {
        return -1;
    } 
    //对方是123
    else if (!mIs123 && oIs123) {
        return 1;
    }
    //都不是123的情况下
    let myLogicCards = getHoldsLogicValues(myPokers);
    let otherLogicCards = getHoldsLogicValues(otherPokers);
    for (let i = myLogicCards.length - 1; i >= 0; i--) {
        //对方的牌小于我的牌
        if (otherLogicCards[i] < myLogicCards[i]) {
            return 1;
        }
        //我的牌小于对方的牌（对方的牌大于我的牌）
        else if (myLogicCards[i] < otherLogicCards[i]) {
            return -1;
        }
    }
    return 0;
}
/**
 * 比较对子
 * @param {*} myPokers 
 * @param {*} otherPokers 
 */
function compareDuiZi(myPokers, otherPokers) {
    //提取对子和单牌并做排序
    let getCardsCount = function (pokers) {
        let cards = {}
        for (let i = 0; i < pokers.length; i++) {
            let num = pokers[i].num;
            if (num == 1) {
                num = 14;
            }
            if (cards[num] == null) {
                cards[num] = {
                    num: num,
                    count: 1,
                }
            }
            else {
                cards[num].count++
            }
        }
        let cardArr = [];
        for (const key in cards) {
            cardArr.push(cards[key])
        }
        //对子在前，单牌在后
        cardArr.sort((a, b) => {
            return b.count - a.count;
        })
        return cardArr
    }

    let myCards = getCardsCount(myPokers);
    let otherCards = getCardsCount(otherPokers);

    for (let i = 0; i < myCards.length; i++) {
        if (myCards[i].num < otherCards[i].num) {
            return -1;
        } else if (otherCards[i].num < myCards[i].num) {
            return 1;
        }
    }

    return 0;
}

/**
 * 比较炸弹
 * @param {*} myPokers 
 * @param {*} otherPokers 
 */
function compareZhaDan(myPokers, otherPokers) {
    let myNum = parseInt(myPokers[0].num);
    let otherNum = parseInt(otherPokers[0].num);
    if (myNum == 1) {
        return 1
    };
    if (otherNum == 1) {
        return -1
    };
    if (myNum < otherNum) {
        return -1;
    } else {
        return 1;
    }
}


/*****************************发牌控制********************************/

/**
 * 根据概率获取好牌
 */
exports.getPokerByRadio=function(pokers,radio){
    //获取好牌
    let poker = null;
    if(radio){
        let random = commonUtil.randomFrom(0,100);
        //在概率范围内就发好牌
        if(radio>random){
            poker = pokers.splice(pokers.length-1,1);
        }else{
            //随机挑选
            let rd = commonUtil.randomFrom(0,pokers.length-1);
            poker = pokers.splice(rd,1);
        }
    }else{
        //随机挑选
        let rd = commonUtil.randomFrom(0,pokers.length-1);
        poker = pokers.splice(rd,1);
    }
    return poker[0];
}









/**
 * 对发出的牌，按牌型的大小进行排序
 */
exports.sortPoker = function(oldPokers){
    var pokers = JSON.parse(JSON.stringify(oldPokers.concat()));
    var sorted = pokers.sort(function(a,b){
        return exports.compare(a,b);
    })
    return sorted;
}


/**
 * 手牌转换成牌型
 */
exports.toPokerType = function(pokers){
    let types = [];
    for(let i=0;i<pokers.length;i++){
        let type = exports.getPokerType(pokers[i]);
        types.push(type);
    }
    return types;
}

