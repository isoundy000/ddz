/**
 * @author hyw
 * @date 2018/5/24 0024
 * @description: 机器人出牌逻辑
 */
var utils = require("./utils");
const MJ_CARDS = [
    "一万", "二万", "三万", "四万", "五万", "六万", "七万", "八万", "九万",
    "一筒", "二筒", "三筒", "四筒", "五筒", "六筒", "七筒", "八筒", "九筒",
    "一条", "二条", "三条", "四条", "五条", "六条", "七条", "八条", "九条",
    "东", "南", "西", "北", "中", "发", "白",
]
/**
 * 根据手牌，返回最佳可以出的牌
 * @param holds 手牌
 *
 */
exports.getBestPai = function (mahjong) {

    //先转换数据结构
    var holds = mahjong.holds.concat();
    var hun = mahjong.hun;
    var que = mahjong.que;
    var bestPai = null;
    if (hun || hun == 0) {
        bestPai = getBestInHunPai(holds, hun);
    } else if (que || que == 0) {
        bestPai = getBestInDingQue(holds, que);
    } else {
        var transformedMahjongs = transformDataStruct(holds);
        bestPai = dropCardStrategy_Robot(transformedMahjongs);
    }
    console.log("手牌数据：" + JSON.stringify(mahjong) + "   获取最佳牌：" + MJ_CARDS[bestPai]);
    return bestPai;
}


/**
 * 有混牌规则的前提下 从手牌中找出最佳打出的牌
 * @hun  混牌
 */
function getBestInHunPai(holds, hun) {
    var holds = delFromHolds(holds, hun);
    var transformedMahjongs = transformDataStruct(holds);
    return dropCardStrategy_Robot(transformedMahjongs);
}

/**
 * 从有定缺的牌型中获取最佳牌
 * @que 0 筒 1 条 2 万
 */
function getBestInDingQue(holds, que) {
    //被定缺的牌
    var queList = [];
    for (var i = 0; i < holds.length; i++) {
        if (isDingQuePai(que, holds[i])) {
            queList.push(holds[i]);
        }
    }
    //优先出被定缺的牌
    if (queList.length > 0) {
        //    var transformedMahjongs =  transformDataStruct(queList);
        let index = Math.floor((Math.random() * queList.length));
        return queList[index];//dropCardStrategy_Robot(transformedMahjongs);
    } else {
        var transformedMahjongs = transformDataStruct(holds);
        return dropCardStrategy_XLCH(transformedMahjongs);
    }
}

/**
 * 从手牌中删除混牌
 * @param holds
 * @param hun
 */
function delFromHolds(holds, hun) {
    var newList = [];
    for (var i = 0; i < holds.length; i++) {
        if (holds[i] != hun) {
            newList.push(holds[i]);
        }
    }
    return newList;
}

/**
 * 是否是被定缺的牌
 */
function isDingQuePai(que, pai) {
    if (que === Const.MAHJONG_CARD_TYPE.WAN) {
        if (pai < 9) {
            return true;
        } else {
            return false;
        }
    } else if (que === Const.MAHJONG_CARD_TYPE.TONG) {
        if (pai > 8 && pai < 18) {
            return true;
        } else {
            return false;
        }
    } else if (que === Const.MAHJONG_CARD_TYPE.TIAO) {
        if (pai > 17 && pai < 27) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}


/**
 * 常量
 * @type {{MAHJONG_CARD_TYPE: {TONG: number, TIAO: number, WAN: number, FENG: number}}}
 */
var Const = {
    MAHJONG_CARD_TYPE: {
        WAN: 0,
        TONG: 1,
        TIAO: 2,
        FENG: 3
    }
}



/**
 * 转换牌型数据结构
 * (0 ~ 8 表示筒  // 9 ~ 17表示条  // 18 ~ 26表示万
 * 27,28,29,30,31,32,33
 //东 南  西 北 中 发 白
 *
 */
function transformDataStruct(mahjongs) {

    //先进行排序
    mahjongs = mahjongs.sort();

    var transformed = [];
    var fengList = [];
    var tiaoList = [];
    var wanList = [];
    var tongList = [];

    for (var i = 0; i < mahjongs.length; i++) {
        if (mahjongs[i] <= 8) {
            wanList.push(mahjongs[i]);
        } else if (mahjongs[i] <= 17) {
            tongList.push(mahjongs[i]);
        } else if (mahjongs[i] <= 26) {
            tiaoList.push(mahjongs[i]);
        } else {
            fengList.push(mahjongs[i]);
        }
    }
    transformed.push(wanList);
    transformed.push(tongList);
    transformed.push(tiaoList);
    transformed.push(fengList);

    return transformed;
}



/*
 * 找出间隔gapNum 个空位的不连续单牌 
 */
function selectGapCards(oneTypeCards, gapNum) {
    let card = -1;
    let length = oneTypeCards.length;

    if (length < 1) {
        return card;
    }

    if (length == 1) {
        card = oneTypeCards[0];
        return card;
    }

    let cardPre = oneTypeCards[0];
    let cardCur = -1;
    let cardNext = -1;
    let isSingle = true;
    let singleIndex = 0;
    let diffPre = 0;
    let diffNext = 0;
    let bFound = false;
    for (let index = 0; index < length; index++) {

        cardCur = oneTypeCards[index];

        if (index <= 0) {
            diffPre = gapNum + 1;
        }
        else {
            diffPre = (cardCur - cardPre);
        }

        if (index >= (length - 1)) {
            diffNext = gapNum + 1;
        }
        else {
            cardNext = oneTypeCards[index + 1];
            diffNext = (cardNext - cardCur);
        }

        if (diffPre > gapNum && diffNext > gapNum) {
            bFound = true;
            isSingle = true;
            singleIndex = index;
            break;
        }

        cardPre = cardCur;
    }

    if (bFound) {
        card = oneTypeCards[singleIndex];
    }

    return card;
}

/*
 * 完全随机策略 
 */
function randomStrategy(mahjongs) {
    let holdCards = [];
    let holdCardsOri = mahjongs;
    for (let i in holdCardsOri) {
        holdCards.push(i);
    }
    let cardIndex = utils.fRandomBy(0, holdCards.length - 1);
    return holdCards[cardIndex];
}

/*
 * 机器人  出牌策略
 * 0,把混牌从待选牌中排除
 * 1,首先选择单张的风牌
 * 2,对序数牌，去除间隔两个空位的不连续单牌，从两头向中间排查
 * 3,对序数牌，去除间隔一个空位的不连续单牌，从两头向中间排查
 * 4,排除已有的刻子
 * 5,排除已有的顺子
 */
function dropCardStrategy_Robot(mahjongs) {
    let windCards = mahjongs[Const.MAHJONG_CARD_TYPE.FENG];
    let wangCards = mahjongs[Const.MAHJONG_CARD_TYPE.WAN];
    let tongCards = mahjongs[Const.MAHJONG_CARD_TYPE.TONG];
    let suoCards = mahjongs[Const.MAHJONG_CARD_TYPE.TIAO];

    let card = null;

    // 单张风牌
    if (windCards && windCards.length > 0) {
        card = selectGapCards(windCards, 0);
        if (card != -1) {
            return card;
        }
    }


    // 间隔两个空位，间隔一个空位
    for (let gapNum = 2; gapNum > 0; gapNum--) {

        if (wangCards && wangCards.length > 0) {
            card = selectGapCards(wangCards, gapNum);
            if (card != -1) {
                return card;
            }
        }


        if (tongCards && tongCards.length > 0) {
            card = selectGapCards(tongCards, gapNum);
            if (card != -1) {
                return card;
            }
        }

        if (suoCards && suoCards.length > 0) {
            card = selectGapCards(suoCards, gapNum);
            if (card != -1) {
                return card;
            }
        }
    }

    // 排除已有的刻子、顺子
    card = simpleTripleStraightStrategy(mahjongs);

    if (card == -1) {
        card = randomStrategy(mahjongs);
    }

    return card;
}

/*
 * 一种简单的排除已有刻子、顺子的策略 
 */
function simpleTripleStraightStrategy(mahjongs) {
    let card = -1;
    let windCards = mahjongs[Const.MAHJONG_CARD_TYPE.FENG];
    let wangCards = mahjongs[Const.MAHJONG_CARD_TYPE.WAN];
    let tongCards = mahjongs[Const.MAHJONG_CARD_TYPE.TONG];
    let suoCards = mahjongs[Const.MAHJONG_CARD_TYPE.TIAO];

    let holdCards = [];


    if (windCards && windCards.length > 0) {
        let windCpy = windCards.slice();
        // 排除刻子
        removeTriple(windCpy);

        for (let i of windCpy) {
            holdCards.push(i);
        }
    }

    if (wangCards && wangCards.length > 0) {
        let wangCpy = wangCards.slice();
        removeTriple(wangCpy);
        // 排除顺子
        removeStraight(wangCpy);

        for (let i of wangCpy) {
            holdCards.push(i);
        }

    }
    if (tongCards && tongCards.length > 0) {
        let tongCpy = tongCards.slice();
        removeTriple(tongCpy);
        removeStraight(tongCpy);

        for (let i of tongCpy) {
            holdCards.push(i);
        }
    }

    if (suoCards && suoCards.length > 0) {
        let suoCpy = suoCards.slice();
        removeTriple(suoCpy);
        removeStraight(suoCpy);

        for (let i of suoCpy) {
            holdCards.push(i);
        }

    }


    if (holdCards.length > 0) {
        let cardIndex = utils.fRandomBy(0, holdCards.length - 1);
        card = holdCards[cardIndex];
    }

    return card;
}

/*
 * 排除刻子
 */
function removeTriple(theArray) {
    let len = theArray.length;

    if (len < 3) return;

    let i = 0;
    do {
        if (utils.isTriple(theArray[i], theArray[i + 1], theArray[i + 2])) {
            theArray.splice(i, 3);
            len -= 3;
        }
        else {
            i++;
        }

    } while (i < (len - 2));
}


/*
 * 排除顺子
 */
function removeStraight(theArray) {
    let len = theArray.length;

    if (len < 3) return;

    let findResult = true;
    do {
        findResult = findStraight(theArray);
        if (findResult) {
            let p3 = findResult.p3;
            let p2 = findResult.p2;
            let p1 = findResult.p1;

            theArray.splice(p3, 1);
            theArray.splice(p2, 1);
            theArray.splice(p1, 1);

        }
    } while (findResult);

}

/*
 * 在数组中查找顺子牌所在位置索引
 */
function findStraight(theArray) {
    let len = theArray.length;

    for (let i = 0; i < (len - 2); i++) {
        let cur = theArray[i];
        for (let j = i + 1; j < (len - 1); j++) {
            let mid = theArray[j];
            if (mid == (cur + 1)) {
                for (let k = 0; k < len; k++) {
                    let last = theArray[k];
                    if (last == (mid + 1)) {
                        return { p1: i, p2: j, p3: k };
                    }
                }
            }
        }
    }

    return null;
}

/*
 * 排除对子
 */
function removePair(theArray) {
    let len = theArray.length;

    if (len < 2) return;

    let i = 0;
    do {
        if (utils.isPair(theArray[i], theArray[i + 1]) ) {
            theArray.splice(i, 2);
            len -= 2;
        }
        else {
            i++;
        }

    } while (i < (len - 1));
}

Array.intersect = function(arr1, arr2) {
    if(Object.prototype.toString.call(arr1) === "[object Array]" && Object.prototype.toString.call(arr2) === "[object Array]") {
      return arr1.filter(function(v){ 
       return arr2.indexOf(v)!==-1 
      }) 
    }
}

/* 
 *  血流成河机器人出牌策略 
 *  1，首先打出缺门的牌；
 *  2，统计每门（万、筒、条）的牌张数，对张数少的这门，进行如下处理；
 *  3，打出与其他牌间隔两个空位的牌；
 *  4，打出与其他牌间隔一个空位的牌；
 *  5，排除所有暗杠的牌；（可省略，机器人有杠的话立即就开）；
 *  6，对该门牌集合S，排除所有刻子，在剩余牌中再排除所有顺子，在剩余牌中再排除所有对子；剩余牌形成待选牌组集合S1；
 *  7，对该门牌集合S，排除所有顺子，在剩余牌中再排除所有刻子，在剩余牌中再排除所有对子；剩余牌形成待先牌组集合S2；
 *  8，如果S1 和S2 集合的交集Si不为空，取其最后一张牌，打出；
 *  9，对张数多的另外一门，同样进行3 -- 8 的处理；
 * 10，上面所有步骤完成仍没选出要打的牌，则对张数少的一门，取其最后一张牌，打出； 
 */
function dropCardStrategy_XLCH(mahjongs) {

    // 首先打出缺门的牌 (外层已处理，这里省略)

    let wangCards = mahjongs[Const.MAHJONG_CARD_TYPE.WAN];
    let tongCards = mahjongs[Const.MAHJONG_CARD_TYPE.TONG];
    let suoCards = mahjongs[Const.MAHJONG_CARD_TYPE.TIAO];

    let card = null;

    let mahjongsCpy = [];
    let wangCardsCount = 0;
    let tongCardsCount = 0;
    let suoCardsCount  = 0;

    if (wangCards && wangCards.length > 0) {
        wangCardsCount = wangCards.length;
        mahjongsCpy.push(wangCards.slice() );
    }

    if (tongCards && tongCards.length > 0) {
        tongCardsCount = tongCards.length;
        if (tongCardsCount < wangCardsCount) {
            mahjongsCpy.unshift(tongCards.slice() );
        }
        else {
            mahjongsCpy.push(tongCards.slice() );
        }
        
    }

    // 因为这时机器人手里只有两种牌，所以可以有下面这种unshift 操作 
    if (suoCards && suoCards.length > 0) {
        suoCardsCount = suoCards.length;
        if (suoCardsCount < wangCardsCount) {
            mahjongsCpy.unshift(suoCards.slice() );
        }
        else if (suoCardsCount < tongCardsCount) {
            mahjongsCpy.unshift(suoCards.slice() );
        }
        else {
            mahjongsCpy.push(suoCards.slice() );
        }
        
    }

    for (index = 0; index < mahjongsCpy.length; index++) {
        let currentTypeCards = mahjongsCpy[index];

        // 间隔两个空位，间隔一个空位 
        for (let gapNum = 2; gapNum > 0; gapNum--) {
            card = selectGapCards(currentTypeCards, gapNum);
            if (card != -1) {
                return card;
            }
        }

        let set1 = currentTypeCards.slice();
        removeTriple(set1);
        removeStraight(set1);
        removePair(set1);
        
        let set2 = currentTypeCards.slice();
        removeStraight(set2);
        removeTriple(set2);
        removePair(set2);
        
        let setInterSect = Array.intersect(set1, set2);
        if (setInterSect && setInterSect.length > 0) {
            card = setInterSect[setInterSect.length-1];
            return card;
        }
    }

    // 牌数较少一门的最后一张 
    card = mahjongsCpy[0][mahjongsCpy[0].length-1];
    
    return card;
}