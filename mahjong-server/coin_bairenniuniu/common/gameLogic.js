/**
 * @author hyw
 * @date 2018/8/20 0020
 * @description: 扑克工具模块
 */
var commonUtil = require('../../utils/commonUtil');
/**
 * 生成一副已经洗过的扑克牌,牌的数据结构{color:0,num:1} color 4321 分别代表黑红梅方 1~13 代表值
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
        for (var j = 0; j < 5; j++) {
            var pokerLength = pokers.length;
            var random = commonUtil.randomFrom(0, pokers.length - 1);
            var poker = pokers.splice(random, 1);
            playerHolds.push(poker[0])
        }
        playerPokerList.push(pokerSort(playerHolds));
    }
    return playerPokerList;
}


/**
 * 赔率配置
 * @type {{}}
 */
exports.radio = {
    0: 1,
    1: 1,
    2: 1,
    3: 1,
    4: 1,
    5: 1,
    6: 1,
    7: 2,
    8: 2,
    9: 3,
    10: 4,
    11: 5,
    12: 6,
    13: 7,
    14: 8,
    15: 8,
    16: 9,
    17: 10,
}

/**
 * 获取poker的牌型  0:无牛，1~9:牛一~牛9，10:牛牛,11:顺子牛,12:同花牛,13:葫芦牛,14:五花牛，15: 五小牛,16:炸弹,17:同花顺；
 */
exports.getPokerType = function (pokers) {
    var type = 0;
    // if (isTongHuaShun(pokers)){
    //     type =17;
    //     return type;s
    // }
    // if (isZhaDan(pokers)) {
    //     type = 16;
    //     return type;
    // }
    // if (isWuXiaoNiu(pokers)) {
    //     type = 15;
    //     return type;
    // }
    if (isWuHuaNiu(pokers)) {
        type = 14;
        return type;
    }
    // if(isHuLuNiu(pokers)){
    //     type = 13;
    //     return type;
    // }
    // if(isTongHuaNiu(pokers)){
    //     type = 12;
    //     return type;
    // }
    // if(isShunZiNiu(pokers)){
    //     type = 11;
    //     return type;
    // }
    type = getNiuNum(pokers)
    return type;
}

/**
 * 是否是炸弹
 */
function isZhaDan(pokers) {
    pokers = pokerSort(pokers);
    //数组第二个值
    var max2 = pokers[1].num;
    //数组倒数第二个
    var min3 = pokers[3].num;
    //如果数组第二个值和数组最后一个值一样，或者数组倒数第二个值个第一个一样那么是4炸
    if (max2 == pokers[4].num || min3 == pokers[0].num) {
        return true;
    } else {
        return false;
    }
}

/**
 * 是否是同花牛
 */
function isTongHuaNiu(pokers){
    pokers = pokerSort(pokers);
    let color = pokers[0].color;
    for(let i of pokers){
        if (color !== i.color){
            return false;
        }
    }
    if(getNiuNum(pokers)>0){
        return true;
    }
    return false;
}
/**
 * 是否是同花顺
 */
function isTongHuaShun(pokers) {
    pokers = pokerSort(pokers);
    let color = pokers[0].color;
    let min = pokers[0].num;

    for(let i of pokers){
        if (color !== i.color){
            return false;
        }
    }
    if(pokers[0].num ===1&&pokers[1].num>=10){
        return true;
    }
    for(let i=1;i<pokers.length;i++){
         
        if((min + i )!==pokers[i].num){
            return false
        }
    }
    
    
    return true;
}

/**
 * 是否是顺子牛
 */
function isShunZiNiu(pokers){
    pokers = pokerSort(pokers);
    let min = pokers[0].num;
    for(let i=1;i<pokers.length;i++){
         
        if((min + i )!==pokers[i].num){
            return false
        }
    }
    if (getNiuNum(pokers)>0){
        return true
    }
    return false;

}

/**
 * 
 * 是否是葫芦牛
 */
function isHuLuNiu(pokers){
    pokers = pokerSort(pokers);
    let num1 = pokers[0].num;
    let num2 = pokers[4].num;
    for (let i of pokers){
        if (i.num !==num1 || i.num !== num2){
            return false;
        }
    }
    if(getNiuNum(pokers)>0){
        return true;
    }
    return false;

}


/**
 * 是否是五小牛
 */
function isWuXiaoNiu(pokers) {
    //先进行排序
    pokers = pokerSort(pokers);
    var min = pokers[0].num;
    var max = pokers[4].num;
    var total = 0;
    for (var i = 0; i < 5; i++) {
        total += pokers[i].num;
    }

    if (max < 5 && total <= 10) {
        return true;
    } else {
        return false;
    }
}
/**
 * 是否是五花牛
 * @param pokers
 */
function isWuHuaNiu(pokers) {
    pokers = pokerSort(pokers);
    //如果数组最小值是大于10，那么就是五花
    var min = pokers[0].num;
    if (min > 10) {
        return true;
    } else {
        return false;
    }
}

/**
 * 获取是牛几
 */
function getNiuNum(pokers) {
    var pokerNum = [];
    for (var i = 0; i < 5; i++) {
        if (pokers[i].num > 10) {
            pokerNum[i] = 10;
        } else {
            pokerNum[i] = pokers[i].num;
        }
    }

    var niuNum = calculateNiuNum(pokerNum);
    return niuNum;
}

/**
 * 获取牛几
 * @param arr [5,4,2,4,3];
 * @returns {*}
 */
function calculateNiuNum(arr) {
    for (let m = 0; m <= 2; m++) {
        for (let n = m + 1; n <= 3; n++) {
            for (let z = n + 1; z <= 4; z++) {
                //说明有牛
                if ((arr[m] + arr[n] + arr[z]) % 10 == 0) {
                    let num = 0;
                    for (let x = 0; x <= 4; x++) {
                        if (x != m && x != n && x != z) {
                            num += arr[x];
                        }
                    }
                    if (num % 10 == 0) {
                        return 10;
                    } else {
                        return num % 10;
                    }
                }
            }
        }
    }
    return 0;
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
 * return -1 我的牌小 1 我的牌大
 */
exports.compare = function (myPokers, otherPokers) {
    myPokers = pokerSort(myPokers);
    otherPokers = pokerSort(otherPokers);
    //获取牌型
    var myPokerType = exports.getPokerType(myPokers);
    var otherPokerType = exports.getPokerType(otherPokers);

    //牌型相同，比较最大牌，最大牌相同，比较花色
    if (myPokerType == otherPokerType) {
        if(myPokerType==13){//如果是葫芦牛
            if (myPokers[2].num == otherPokers[2].num) {
                if (myPokers[2].color > otherPokers[2].color) {
                    return 1;
                } else {
                    return -1;
                }
            } else if (myPokers[2].num > otherPokers[2].num) {
                return 1;
            } else {
                return -1;
            }
        }
        if (myPokers[4].num == otherPokers[4].num) {
            if (myPokers[4].color > otherPokers[4].color) {
                return 1;
            } else {
                return -1;
            }
        } else if (myPokers[4].num > otherPokers[4].num) {
            return 1;
        } else {
            return -1;
        }
    } else if (myPokerType > otherPokerType) {
        return 1;
    } else {
        return -1;
    }
}

/**
 *  将扑克分组，如果有牛，则把有牛的牌放一块
 */
exports.group = function (pokers) {
    var type = exports.getPokerType(pokers);
    pokers = pokerSort(pokers);
    
    if (type >= 1) {
        let arranged = [];

        let pokerNum = [];
        for (let i = 0; i < 5; i++) {
            if (pokers[i].num > 10) {
                pokerNum[i] = 10;
            } else {
                pokerNum[i] = pokers[i].num;
            }
        }
        for (let m = 0; m <= 2; m++) {
            for (let n = m + 1; n <= 3; n++) {
                for (let z = n + 1; z <= 4; z++) {
                    if ((pokerNum[m] + pokerNum[n] + pokerNum[z]) % 10 == 0) {
                        arranged[0] = pokers[m];
                        arranged[1] = pokers[n];
                        arranged[2] = pokers[z];

                        let num = 3;
                        for (let x = 0; x <= 4; x++) {
                            if (x != m && x != n && x != z) {
                                arranged[num] = pokers[x];
                                num++;
                            }
                        }
                    }
                }
            }
        }
        // console.log(arranged)
        // console.log("typepppppppppppppp"+type)
        return arranged;
        
    } else {
        return pokers;
    }
}


/*****************************发牌控制********************************/

/**
 * 根据概率获取好牌
 */
exports.getPokerByRadio = function (pokers, radio) {
    let random = commonUtil.randomFrom(0, 100);
    let random2 = commonUtil.randomFrom(0, pokers.length-1);
    //获取好牌
    let poker = null;
    if (radio > random) {
        poker = pokers.splice(pokers.length - 1, 1);
    } else {
        poker = pokers.splice(random2, 1);
    }
    return poker[0];
}

/**
 * 对发出的牌，按牌型的大小进行排序
 */
exports.sortPoker = function (pokers) {
    var sorted = pokers.sort(function (a, b) {
        return exports.compare(a, b);
    })
    return sorted;
}


/**
 * 手牌转换成牌型
 */
exports.toPokerType = function (pokers) {
    let types = [];
    for (let i = 0; i < pokers.length; i++) {
        let type = exports.getPokerType(pokers[i]);
        types.push(type);
    }
    return types;
}
