/**
 * @author hyw
 * @date 2018/8/20 0020
 * @description: 扑克工具模块
 */
var commonUtil = require('../../utils/commonUtil');
/**
 * 生成一副已经洗过的扑克牌,牌的数据结构{color:0,num:1} color 4321 分别代表黑红梅方 1~13 代表值
 */
function generateMahjongs() {
    var mahjongs = [];
    //筒 (0 ~ 8 表示筒子，9表示发财
    for(var i = 0; i < 10; ++i){
        for(var c = 0; c < 4; ++c){
            mahjongs.push(i);
        }
    }
    shuffle(mahjongs);
    return mahjongs;
}

/**
 * 洗牌
 */
function shuffle(mahjongs) {
    for(var i = 0; i < mahjongs.length; ++i){
        var lastIndex = mahjongs.length - 1 - i;
        var index = Math.floor(Math.random() * lastIndex);
        var t = mahjongs[index];
        mahjongs[index] = mahjongs[lastIndex];
        mahjongs[lastIndex] = t;
    }
}

//骰子
exports.shaizi = function(){
    //生成随机数
    function randomNunber(min,max){
        let r = Math.random();
        let range = max - min;
        let num = min + Math.round(r * range);//四舍五如
        return num ;
    }
    let shaizi = [];
    shaizi[0] = randomNunber(1,6);
    shaizi[1] = randomNunber(1,6);

    return shaizi
}

//发牌
exports.deal = function(playerCount,roomInfo){ //d为前端传过来的庄家和闲家押注倍数，{zhuangjia:{userId:xxx,peishu:2},xianjia:{userId:1,userId:23}}其中闲家中userId是指玩家的userId，值是倍数
    let mahjongs = generateMahjongs();
    let mjList=[]//暂时储存选出来的麻将
    let mjres = [] //所有选出来的麻将
    //强制清0
    let banker;
    for (let i of roomInfo.seats){
        if(i.isBanker === 1){
            banker = i.userId;
        }
    }
    if (!banker){
        banker = roomInfo.createUser;
    }

        
    for(let i = 0; i < playerCount; i++){
        var playerHolds = [];
        for (let i=0;i<2;i++){
            var random = commonUtil.randomFrom(0, mahjongs.length - 1);
            var mj = mahjongs.splice(random, 1);
            playerHolds.push(mj[0]);
        }
        mjres.push(playerHolds);
    }
    return mjres
    

}

//获取发牌的顺序
exports.getFapaiShuunxu = function(roomInfo,sz,zj){

    let sz_sum = sz[0] + sz[1];//色子点数和
    
    let zj_index = roomInfo.getPlayerSeatIndex(zj);//庄家的位置
    let keys = roomInfo.getPreparedPlayer();//获取已经准备的玩家信息
    let leng = keys.length;
    //获得发牌的玩家的位置
    function loop(l){
        if(l<=leng){
            return l-1;
        }
        if(l-leng<leng){
            return l-leng-1
        }else{
            return loop(l-leng);
        }
    }
    let fp_index = loop(sz_sum+zj_index+1);//发牌玩家的位置
    let r = []
    for (let i=0;i<leng;i++){
        let id = keys[fp_index].userId;
        fp_index +=1;
        if(fp_index > leng-1){
            fp_index = 0;
        }
        r.push(id);
    }
    return r;
}



/**
 * 获取牌型,22为豹子，11为对子
 */
exports.getMJType = function (pai) {
    if(pai[0] === pai[1]){
        if ((pai[0]) ===9){
            return 22
        }else {
            return 11
        }
    }
    let sum = (pai[0] + pai[1]) +2
    var res = 0;
    if(sum>=10 && (pai[0] !==9 && pai[1]!==9)){
        res = (sum) % 10;
    }else if(sum>=10){
        if(pai[0]===9){
            res = pai[1]+0.5+1
        }else{
            res = pai[0]+0.5+1
        }
    }else{
        res = sum;
    }

    
    return res
}

//获得倍数
function beishu (pai){
    let sum = (pai[0] + pai[1]) +2
    if (sum>10){
        var res = sum % 10;
    }else{
        var res = sum;
    }
    if(pai[0] === pai[1]){
        if (pai[0] ===9){
            return 5
        }else {
            return 4
        }
    }else if (res=== 9.5 || res === 9){
        return 3
    }else if(res ===8 || res ===8.5){
        return 2
    }
    return 1
    
}

/**
 * 赔率配置
 * @type {{}}
 */
exports.radio = {
    0: 1,0.5:1,
    1: 1,1.5:1,
    2: 1,2.5:1,
    3: 1,3.5:1,
    4: 1,4.5:1,
    5: 1,5.5:1,
    6: 1,6.5:1,
    7: 2,7.5:2,
    8: 2,
    8.5:2,
    9: 3,
    9.5:3,
    11: 4,
    22: 5
}

/**
 * 比牌
 * @param myPokers 我的手牌
 * @param otherPokers 被比人的手牌
 * return -1 我的牌小 1 我的牌大
 */
//两副牌比大小
exports.compare = function(p1,p2){
    function max(d){
        let num1 = d[0];
        let num2 = d[1];
        if(num1>num2){
            return num1;
        }else{
            return num2;
        }
    }
    let sum = 0
    let r = {}
    let b1 = exports.getMJType(p1);
    let b2 = exports.getMJType(p2);
    if(b1 >b2){
        return 1;
    }else if(b1 < b2){
        return -1;
    }else{
        let p1_max = max(p1);
        let p2_max = max(p2);
        if(p1_max > p2_max){
            return 1;
        }else if(p1_max < p2_max){
            return -1;
        }else{
            return 0;
        }
    }

}




/*****************************发牌控制********************************/

/**
 * 根据概率获取好牌
 */
exports.getMJByRadio = function (pokers, radio) {
    let random = commonUtil.randomFrom(0, 100);
    //获取好牌
    let poker = null;
    if (radio > random) {
        poker = pokers.splice(pokers.length - 1, 1);
    } else {
        poker = pokers.splice(0, 1);
    }
    return poker[0];
}

/**
 * 对发出的牌，按牌型的大小进行排序
 */
exports.sortMJ = function (MJ) {
    var sorted = MJ.sort(function (a, b) {
        return exports.compare(a, b);
    })
    return sorted;
}


/**
 * 手牌转换成牌型
 */
exports.toMJType = function (mjs) {
    let types = [];
    for (let i = 0; i < mjs.length; i++) {
        let type = exports.getMJType(mjs[i]);
        types.push(type);
    }
    return types;
}
