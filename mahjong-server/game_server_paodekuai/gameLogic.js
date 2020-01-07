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
var commonUtil = require('../utils/commonUtil');
var gameMgr = require("./gameMgr");
var userMgr = require("./userMgr")
/**
 * 生成一副已经洗过的扑克牌,牌的数据结构{color:0,num:1} color 3210 分别代表黑红梅方 1~13 代表值
 */
function generatePoker() {
    var pokers = [];
    for (var i = 0; i <= 3; i++) {
        for (var j = 3; j <= 13; j++) {
            var poker = {};
            poker.color = i;
            poker.num = j;
            pokers.push(poker);
        }
        
    }
    let A = [{ color: 0, num: 14 },{ color: 1, num: 14 },{ color: 2, num: 14 }];
    let er={ color: 0, num: 15 }
    let p = pokers.concat(A);
    p.push(er);
    shuffle(p);
    return p;
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
exports.deal = function (roomInfo) {
    var pokers = generatePoker();
    roomInfo.shengyuPokers = pokers;
    var playerPokerList = [];
    for (var i = 0; i < 4; i++) {
        var playerHolds = [];
        for (var j = 0; j < 12; j++) {
            var pokerLength = pokers.length;
            var random = commonUtil.randomFrom(0, pokers.length - 1);
            var poker = pokers.splice(random, 1);
            playerHolds.push(poker[0])
        }
        console.log("playerHolds",playerHolds)
        playerPokerList.push(pokerSort(playerHolds));
    }
    return {pokers:playerPokerList,dipai:pokers}
}

/**
 * 获取poker的牌型
 */
exports.getPokerType = function (pokers,userId) {
    let roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        console.log("getPokerType roomInfo异常");
        return;
    }
    let player = roomInfo.getPlayerById(userId);
    if(!player){
        console.log("getPokerType player异常");
        return;
    }
        let AAA = isAAA(pokers)
    if (AAA) {
        return {type:"AAA",pokers:14};
    }
    let iszhadan = isZhaDan(pokers)
    if (iszhadan) {
        return {type:"zhadan",pokers:iszhadan};
    }
    let isdanzhang =  isDanZhang(pokers)
    if (isdanzhang) {
        return {type:"danzhang",pokers:pokers[0].num};
    }
    let isduizi = isDuizi(pokers)
    if (isduizi) {
        return {type:"duizi",pokers:pokers[0].num};
    }

        let sanzhang = isSanZhang(pokers)
        if (sanzhang) {
            return {type:"sanzhang",pokers:sanzhang};
        }

    let issanandone = isSanAndOne(pokers)
    if (issanandone) {
        return {type:"sandaiyi",pokers:issanandone};
    }
    let issanandotwo = isSanAndTwo(pokers)
    if (issanandotwo) {
        return {type:"sandaier",pokers:issanandotwo};
    }
    let DanShun = isDanShun(pokers)
    if (DanShun) {
        return {type:"danshun",pokers:DanShun};
    }
    let ShuangShun = isShuangShun(pokers,roomInfo.roomId);
    if (ShuangShun) {
        return {type:"shuangshun",pokers:ShuangShun};
    }
    let SanShun = isSanShun(pokers);
    if (SanShun) {
        return {type:"sanshun",pokers:SanShun};
    }
    let feiji = isFeiji(pokers)
    if (feiji) {
        let keys = Object.keys(feiji);
        let maxIndex = keys.length-1
        return {type:"feiji",pokers:keys[maxIndex],len:keys.length};
    }
    let SiAndTwo = isSiAndTwo(pokers)
    if (SiAndTwo) {
        let keys = Object.keys(SiAndTwo);
        let maxIndex = keys.length-1;
        return {type:"sidaier",pokers:keys[maxIndex],len:keys.length};
    }
    return false;
}

function sortss(a,b){

    return a-b
}
function sortll(a,b){
    return b-a
}
/***
 * 获得玩家的炸弹
 */

exports.getZhadan = function(pokers){
    let temp = {}
    for(let i of pokers){
        temp[i.num]=0;
    }
    for(let i of pokers){
        temp[i.num] +=1;
    }
    let keys = Object.keys(temp);
    for(let i of keys){
        if (temp[i]!==4){
            delete temp[i]
        }
    }
    let keys2 = Object.keys(temp);
    console.log(keys2)
    for(let k=0;k<keys2.length;k++){
        keys2[k] = parseInt(keys2[k])
    }
    console.log(keys2)
    return keys2.sort(sortss);

}

/***
 * 获得玩家的AAA
 */
exports.getAAA = function(pokers){
    let temp = {}
    let i=0;
    let res = []
    for(let i of pokers){
        if(i.num ===14){
            i+=1
            res.push(i)
        }
    }
    if(i !==3){
        return [];
    }
    return res;


}

/***
 * 
 * 获得玩家所有相同点数的牌比如111，222
 * weishu标识几张相同的111就是3张
 * 当weishu为1时，会获得所有连续的牌
 * 
 */
exports.getSamePai = function(pokers,weishu,len,otherPokerMax){
    pokers = [].concat(pokers)
    console.log(pokers);
    // let jin;
    // if(weishu !==1){
    //     jin= [2,16,17];
    // }else{
    //     jin= [];
    // }
    
    // for(let i of jin){
    //     commonUtil.remove(pokers,i);
    // }
    let temp = {}
    //初始化temp
    for(let i of pokers){
        //如果牌A在此数组内，为了方便先把牌A的值改为14
        if(i.num === 1){
            temp[14]=0;
            continue;
        }
        if(i.num === 2){
            temp[15]=0;
            continue;
        }      
        temp[i.num]=0;
    }
    for(let i of pokers){
        //如果牌A在此数组内，为了方便先把牌A的值改为14
        if(i.num === 1){
            temp[14]+=1;
            continue;
        }
        if(i.num === 2){
            temp[15]+=1;
            continue;
        }
        temp[i.num] +=1;
    }
    let keys = Object.keys(temp);

    for(let i of keys){
        if (temp[i]!==weishu){
            delete temp[i]
        }
    }
    console.log("temp",temp)
    //如果牌A在此数组内，为了方便先把牌A的值改为14
    let keys2 = Object.keys(temp).reverse();
    if(keys2.length===0){
        // console.log("keys.length",keys.length)
        return [];
    }
    for(let i=0;i<keys2.length;i++){
        keys2[i] = parseInt(keys2[i])
    }
    console.log("keys2",keys2);
    
    let res=[]
    let result =[];
    res.push(keys2[0]);
    
    for (let i=1;i<keys2.length;i++){
        console.log(keys2[i]+1)

        // console.log(keys2[i-1])
        console.log(keys2[i-1] === (keys2[i]+1))
        if(keys2[i-1] === (keys2[i]+1)){

            res.push(keys2[i]);
        }else{

            result.push(res);
            res=[];
            res.push(keys2[i])
        }
        if(i === keys2.length-1 ){
            result.push(res);
        }

    }
    console.log("res1",res)
    if(keys2.length <=1){
        console.log("res2",res)
        result.push(res)  
    }
    return result;

}
exports.getAllSamePai = function(pokers,weishu){
    // console.log(pokers);
    let jin = [15];
    if(weishu == 1){
        jin=[]
    }
    for(let i of jin){
        for(let j of pokers){
            if (j.num == i){
                commonUtil.removeOne(pokers,j);
            }
        }
        
    }
    let temp = {}
    //初始化temp
    for(let i of pokers){     
        temp[i.num]=0;
    }
    for(let i of pokers){
        temp[i.num] +=1;
    }
    let keys = Object.keys(temp);
    for(let i of keys){
        // console.log("temp[i]",temp[i])
        // console.log("weishu",weishu)
        // console.log("temp[i]<weishu",temp[i]<weishu)


        if (temp[i]<weishu || temp[i]==4){ //和上边那一个函数的不同点
            // console.log("shanchule")
            delete temp[i]
        }
    }
    // console.log(temp)
    let keys2 = Object.keys(temp).reverse();
    for(let i=0;i<keys2.length;i++){
        keys2[i] = parseInt(keys2[i])
    }
    console.log("keys2",keys2)
    
    let res=[]
    let result =[];
    res.push(keys2[0]);
    for (let i=1;i<keys2.length;i++){
        // console.log(keys2[i]+1)

        // console.log(keys2[i-1])
        console.log(keys2[i-1] === (keys2[i]+1))
        if(keys2[i-1] === (keys2[i]+1)){

            res.push(keys2[i]);
        }else{
            // console.log("res",res)
            result.push(res);
            res=[];
            res.push(keys2[i])
        }
        if(keys2.length-1 ==i ){
            result.push(res);
        }

    }
    if(keys2.length ===1 ){
        result.push(res);
    }
    return result;

}
//如果一副符合的牌的长度大于要比较的牌就将此付牌截取的和要比较的牌一样的长度
function getSomePokers(mypokers,pokers){
    var mypokers1 = [].concat(mypokers)
    let myLength = mypokers1.length;
    let otherLength = pokers.length;
    let differ = myLength - otherLength;
    if(differ ===0){
        return mypokers;
    }
    for(let i=0;i<differ;i++){
        if(mypokers1[1].num>pokers[0].num){
            mypokers1.splice(0,1)
        }else{
            mypokers1.splice((mypokers1.length-1),1)
        }

    }
    return mypokers1

    

}
function sortSS(a,b){
    return a.num-b.num
}
function sortgg(a,b){
    return a[0]-b[0]
}
/**
 * 根据牌获取比他大的牌
 * @param {pokers} pokers 
 */
exports.getBiggerPokers = function(pokers,mepokers,userId,needBig){
    let mypokers = [].concat(mepokers)//.pokers;
    if(pokers.length==0){
        return [];
    }
    let huojian = exports.getAAA(pokers);
    let roomInfo = gameMgr.getRoomByUserId(userId);
    if(!roomInfo){
        console.log("房间不存在了啊啊啊啊");
        return [];
    }
    //参与比较两幅相同牌型牌 大小的值
    
    let pokerType = exports.getPokerType(pokers,userId);
    if(!pokerType){
        return []
    }
    console.log(pokerType);
    let otherPokerMax = pokerType.pokers;
    // //转换1和2这两个比较特殊的牌
    // if(otherPokerMax == 1){
    //     otherPokerMax = 14;
    // }
    // if(otherPokerMax == 2){
    //     otherPokerMax = 15;
    // }
    // for(let i of mypokers){
    //     if(i.num===1){
    //         i.num=14
    //     }
    //     if(i.num===2){
    //         i.num=15
    //     }
    // }
    console.log("otherPokerMax",otherPokerMax)
    console.log("otherPokerMax1",typeof otherPokerMax)
    if(pokerType.type === "AAA"){
        
        return [];
    }
    if(pokerType.type === "zhadan"){
        let s = zhadan(mypokers);
        console.log(pokerType.type)
        return s;
    }
    if(pokerType.type === "danzhang"){
        // console.log(pokerType.type)
        // let myPokers1 = [].concat(mypokers);
        // console.log("myPokers1",myPokers1)
        if(needBig==1){
            let res = biggestDanzhang(mypokers);
            return res;
        }
        let res = danzhang(mypokers);
        console.log("res",res)
        return res;
    }
    if(pokerType.type ==="danshun"){
        let shunzi = exports.getAllSamePai(mypokers,1);
        console.log("dan",shunzi)
        let res = [];
        for(let i of shunzi){
            for (j of i){
                if (j===15){
                    let index = i.indexOf(j);
                    i.splice(index,1)
                }
            }
        }
        for(let i of shunzi){
            if(i.length>= pokers.length && i[0]>otherPokerMax){
                res.push(i);
            }
        }
        if(res.length ===0){
            return []
        }
        let lastRes=[];
        let temp = {};
        for(let i of res){
            for(let j of mypokers){
                if(i.indexOf(j.num) !== -1 &&temp[j.num] !==1){
                    temp[j.num] = 1
                    lastRes.push(j);
                }
            }
            let su = getSomePokers(lastRes,pokers);
            if(su.length === 0){
                let res = zhadan(mypokers);
                return res;
            }
            return su;
        }

    }
    if(pokerType.type ==="shuangshun"){
        let shunzi = exports.getAllSamePai(mypokers,2);
        console.log("shunzi",shunzi)
        let res = [];
        for(let i of shunzi){
            if((i.length)*2 >= pokers.length && i[0]>otherPokerMax){
                res.push(i);
            }
        }
        if(res.length ===0){
            return []
        }
        let lastRes=[];
        let temp = {};
        for(let i of mypokers){
            temp[i.num]=0;
        }
        for(let i of res){
                for(let j of mypokers){
                    if(i.indexOf(j.num) !==-1 &&temp[j.num] !==2){
                        temp[j.num] += 1
                        lastRes.push(j);
                    }
                    
                }
            let su = getSomePokers(lastRes,pokers);
            if(su.length === 0){
                let res = zhadan(mypokers);
                return res;
            }
            return su;
        }

    }
    if(pokerType.type ==="sanshun"){

        let shunzi = exports.getAllSamePai(mypokers,3);
        console.log("shunzi",shunzi)
        let res = [];
        for(let i of shunzi){
            if((i.length)*3 >= pokers.length && i[0]>otherPokerMax){
                res.push(i);
            }
        }
        if(res.length ===0){
            return []
        }
        let lastRes=[];
        let temp = {};
        for(let i of mypokers){
            temp[i.num]=0;
        }
        for(let i of res){

                for(let j of mypokers){
                    if(i.indexOf(j.num) !== -1 &&temp[j.num] !==3){
                        temp[j.num] += 1
                        lastRes.push(j);
                    }
                    
                }
            
            
            let su = getSomePokers(lastRes,pokers);
            if(su.length === 0){
                let res = zhadan(mypokers);
                return res;
            }
            return su;
        }

    }
    if(pokerType.type === "duizi"){
        let mypokers1 = [].concat(mypokers)
        let d = duizi(mypokers1);
        if(d.length === 0){
            let res = zhadan(mypokers);
            return res;
        }
        return d
    }

    if(pokerType.type === "sanzhang"){
        let sz = sanzhang(mypokers);
        if(sz.length === 0){
            let res = zhadan(mypokers);
            return res;
        }
        return sz
    }
    if(pokerType.type === "sandaiyi"){
        let res = sanzhang(mypokers);
        for(let i of res){
            commonUtil.removeOne(mypokers,i);
        }
        let dz = danzhang(mypokers);
        if(dz.length === 0 || res.length ===0){
            let res = zhadan(mypokers);
            return res;
        }
        return res.concat(dz)
    }
    if(pokerType.type === "sandaier"){
        let res = sanzhang(mypokers);
        for(let i of mypokers){
            commonUtil.removeOne(mypokers,i)
        }
        let dz = duizi(mypokers);
        if(dz.length === 0 || res.length ===0){
            let res = zhadan(mypokers);
            return res;
        }
        return res.concat(dz)
    }
    if(pokerType.type === "feiji"){
        let length = pokers.length;
        let myfeiji = exports.getSamePai(mypokers,3);
        let my = mypokers.sort(sortSS)
        console.log("myfeiji",my)

        let res = [];
        for(let i of myfeiji){
            if(i.length >=pokerType.len){
                let newI = i.sort(sortll)
                res.push(newI)
            }
        }
        let newRes = res.sort(sortSS);
        if(newRes.length===0){
            return [];
        }
        console.log("newRes",newRes)
        //如果飞机是带的单张牌
        console.log("len",length)
        if(length === pokerType.len*(3+1)){
            console.log("danpai")
            for(let i of newRes){

                    let res = [];
                    for(let k of i){
                        for(let j of mypokers){
                            if (j.num === k){
                                res.push(j)
                            }
                        }
                    }
                    
                    let s = getSomePokers(res,pokers);
                    commonUtil.remove(mypokers,s)
                    let dz ;

                        // for(let i =0;i<4;i++){
                            let dz1 = danzhang(mypokers);
                        //     console.log("dz1ssssssssss",dz1)
                            s.push(dz1);
                        // }
                        
                        
                        for(let i=0;i<pokerType.len-1;i++){
                            function loop(dz){
                                let dz2 = danzhang(mypokers);
                                if(dz2.length ===0){
                                    return;
                                }
                                if(dz2[0].num !==dz[0].num){
    
                                    s.push(dz2);
                                    return;
                                }else{
                                    return loop(dz2);
                                }
                            }
                            loop(dz1);

                        }

                        
                        
                        if(s.length === 0 ){
                            let res = zhadan(mypokers);
                            return res;
                        }
                    return s
                    

            }
        }else{
            console.log("duizi")
            for(let i of newRes){

                if(i.length>=pokerType.len){
                    let res = [];
                    for(let k of i){
                        for(let j of mypokers){
                            if (j.num === k){
                                res.push(j)
                            }
                        }
                    }
                    let dz ;
                    dz= duizi(mypokers);
                    
                    let s = getSomePokers(res,pokers);
                    commonUtil.remove(mypokers,s)
                    s.push(dz);
                    console.log("s",s)
                    for(let i=0;i<pokerType.len-1;i++){
                        function loop(dz){
                            let dz2 = duizi(mypokers);
                            if(dz2.length ===0){
                                return;
                            }
                            if(dz2[0].num !==dz[0].num){

                                s.push(dz2);
                                return;
                            }else{
                                return loop(dz2);
                            }
                        }

                        loop(dz)
                    }
                    if(s.length === 0 ){
                        let res = zhadan(mypokers);
                        return res;
                    }
                    return s
                }
            }
        }
        
    }

    if(pokerType.type === "sidaier"){
        let length = pokers.length;
        let mysizhang = exports.getSamePai(mypokers,4);
        commonUtil.remove(mypokers,mysizhang)
        if(mysizhang.length ===0){
            return []
        }
        let min = 14;
        for(let i of mysizhang){
            if(i.length === 1){
                if(i[0] > otherPokerMax && i[0]<min){
                    min =i[0];
                }
            }else{
                for (let j of i){
                    if(j>otherPokerMax && j<min){
                        min = j
                    }
                }
            }
        }
        if (min ===14){
            return [];
        }
        let lastRes = [];
        for(let i of mypokers){
            if(i.num === min){
                lastRes.push(i);
            }
            
        }
        if(pokers.length === 8){
            let t;
            t = duizi(mypokers);
            lastRes.push(t);


               function loop(dz){
                let dz2 = duizi(mypokers);
                if(dz2.length ===0){
                    return;
                }
                if(dz2[0].num !==dz[0].num){

                    lastRes.push(dz2);
                    return;
                }else{
                    return loop(dz2);
                }
            }

            loop(t)


            return lastRes;
        }
        if(pokers.length === 6){
            let t;
            t = danzhang(mypokers);
            lastRes.push(t);
                function loop(dz){
                    let dz2 = danzhang(mypokers);
                    if(dz2.length ===0){
                        return;
                    }
                    if(dz2[0].num !==dz[0].num){

                        lastRes.push(dz2);
                        return;
                    }else{
                        return loop(dz2);
                    }
                }
                loop(t);


            
            return lastRes;
        }
        
    }

    function danzhang(mypokers){
        let mypokers1 = mypokers.sort(sortSS);
        let myDanPai = exports.getSamePai(mypokers,1);
        console.log("myDanPai",myDanPai);
        let res =[];
        for (let i of myDanPai){
            if(i.length<3){
                let newI = i.sort(sortss)
                res.push(newI);
            }
        }
        let min = 18;
        console.log("res",res);
        for(let i of res){
            for(let j of i){

                    if(j<min && j>otherPokerMax){
                        min = j;
                    }


            }
        }
        console.log("min",min)
        let lastRes = []
        
        for(let i of mypokers){
            if(i.num === min){
                lastRes.push(i)
                commonUtil.remove2(mypokers,i)
            }
        }
// console.log("my",mypokers1)
// console.log("my",otherPokerMax)
        if(lastRes.length ===0){
            for(let i of mypokers1){
                // console.log("j",i.num,typeof i.num)
                // console.log("otherPokerMax",otherPokerMax,typeof otherPokerMax)
                if (i.num>otherPokerMax){
                    commonUtil.removeOne(mypokers,i);
                    lastRes.push(i);
                    console.log("lastRes111",lastRes)
                    break;
                }
            }
            
        }
        // for(let i of lastRes){
        //     if(i.num ===14){
        //         i.num = 1;
        //     }
        //     if(i.num ===15){
        //         i.num=2
        //     }
        // }
        console.log("lastRes",lastRes)
        return lastRes

    }
    //获得所持牌中最大的单张牌
    function biggestDanzhang(mypokers){
        let data = mypokers.shift()
        let res=[];
        res.push(data)
        return res;

    }
    function sanzhang(mypokers){
        let mypokers1 = mypokers.sort(sortSS)
        let length = pokers.length;
        let myDuiZi = exports.getSamePai(mypokers,3);
        console.log("myDuiZi",myDuiZi)
        let res = [];
        for(let i of myDuiZi){
            let newI = i.sort(sortss)
            res.push(newI)
        }
        
        console.log("Res",res)
        let newRes = res.sort(sortgg);
        console.log("newRes",newRes)
        let lastRes=[];
        bf:
        for(let i of newRes){
            for(let j of i){
                if(j>otherPokerMax){
                    for(let k of mypokers){
                        if (j===k.num){
                            lastRes.push(k);
                            if(lastRes.length===3){
                                break bf;
                            }
                            console.log("k",k)  
                        }
                    }
                    commonUtil.remove(mypokers,lastRes);
                    console.log("lastRes",lastRes)           
                }
            }

        }
        // let temp = {}
        // for(let i of mypokers1 ){
        //     temp[i.num] = 0
        // }
        // for(let i of mypokers1 ){
        //     temp[i.num] +=1
        // }
        // if(lastRes.length ===0){
        //     for(let i of mypokers1){
        //         // console.log("j",i.num,typeof i.num)
        //         // console.log("otherPokerMax",otherPokerMax,typeof otherPokerMax)
        //         if (i.num>otherPokerMax && temp[i.num]===3){
        //             for(let j of mypokers1){
        //                 commonUtil.remove(mypokers,i);
        //                 lastRes.push(i);
        //                 if(lastRes.length===2){
        //                     break;
        //                 }
        //             }
                    
                    
        //             break;
        //         }
        //     }
            
        // }
        // for(let i of lastRes){
        //     if(i.num ===14){
        //         i.num = 1;
        //     }
        //     if(i.num ===15){
        //         i.num=2
        //     }
        // }
        console.log("lastRes",lastRes)
        return lastRes
    }
    function duizi(mypokers){
        let mypokers1 = mypokers.sort(sortSS);
        let length = pokers.length;
        let myDuiZi = exports.getAllSamePai(mypokers,2);
        console.log("myDuiZi",myDuiZi)
        let res = [];
        for(let i of myDuiZi){
            let newI = i.sort(sortss)
            res.push(newI)
        }
        
        console.log("Res",res)
        let newRes = res.sort(sortgg);
        console.log("newRes",newRes)
        let lastRes=[];
        bf:
        for(let i of newRes){
            for(let j of i){
                if(j>otherPokerMax){
                    for(let k of mypokers){
                        // console.log("j",j)
                        if (j===k.num){
                            lastRes.push(k);
                            if(lastRes.length===2){
                                break bf;
                            }
                        }
                    }
                    
                    console.log("lastRes",lastRes)           
                }
            }

        }
        let temp = {}
        for(let i of mypokers1 ){
            temp[i.num] = 0
        }
        for(let i of mypokers1 ){
            temp[i.num] +=1
        }
        if(lastRes.length ===0){
            for(let i of mypokers1){
                // console.log("j",i.num,typeof i.num)
                // console.log("otherPokerMax",otherPokerMax,typeof otherPokerMax)
                if (i.num>otherPokerMax && temp[i.num]===3){
                    for(let j of mypokers1){
                        commonUtil.removeOne
                        lastRes.push(i);
                        if(lastRes.length===2){
                            break;
                        }
                    }
                    
                    
                    break;
                }
            }
            
        }
        // for(let i of lastRes){
        //     if(i.num ===14){
        //         i.num = 1;
        //     }
        //     if(i.num ===15){
        //         i.num=2
        //     }
        // }
        console.log("lastRes",lastRes)
        commonUtil.remove(mypokers,lastRes);
        return lastRes
    }
    function zhadan (mypokers){
        let myZhaDan= exports.getZhadan(mypokers);
        console.log("myZhaDan",myZhaDan)
        if(myZhaDan.length ===0){
            return huojian;
            
        }
        let lastRes = []
        bf:
        for(let i of myZhaDan){
            for(let j of mypokers){
                if(j.num===i){
                    lastRes.push(j);
                    if(lastRes.length ===4){
                        break bf;
                    }
                }
            }
        }
        // for(let i of lastRes){
        //     if(i.num ===14){
        //         i.num = 1;
        //     }
        //     if(i.num ===15){
        //         i.num=2
        //     }
        // }
        return lastRes
    }
}
exports.danzhang = function(mypokers){
    let mypokers1 = mypokers.sort(sortSS);
    let myDanPai = exports.getSamePai(mypokers,1);
    console.log("myDanPai",myDanPai)
    let res =[];
    for (let i of myDanPai){
        if(i.length<5){
            let newI = i.sort(sortss)
            res.push(newI);
        }
    }
    let min = 18;
    console.log("res",res)
    for(let i of res){
        for(let j of i){

                if(j<min && j>2){
                    min = j;
                }


        }
    }
    console.log("min",min)
    let lastRes = []
    commonUtil.remove(mypokers1,min)
    for(let i of mypokers){
        if(i.num === min){
            lastRes.push(i)
        }
    }
// console.log("my",mypokers1)
// console.log("my",otherPokerMax)
    if(lastRes.length ===0){
        for(let i of mypokers1){
            // console.log("j",i.num,typeof i.num)
            // console.log("otherPokerMax",otherPokerMax,typeof otherPokerMax)
            if (i.num>otherPokerMax){
                commonUtil.removeOne(mypokers,i);
                lastRes.push(i);
                console.log("lastRes111",lastRes)
                break;
            }
        }
        
    }
    // for(let i of lastRes){
    //     if(i.num ===14){
    //         i.num = 1;
    //     }
    //     if(i.num ===15){
    //         i.num=2
    //     }
    // }
    console.log("lastRes",lastRes)
    commonUtil.remove(mypokers,lastRes)
    return lastRes

}
exports.getSuijiPai=function(mypokers){
    function sortLen(a,b){
        return b.length-a.length
    }
    mypokers = [].concat(mypokers)
    // function danshun(){
    //     let shunzi = exports.getAllSamePai(mypokers,1);
    //     console.log("danshun2",shunzi)
    //     for(let i of shunzi){
    //         for (j of i){
    //             if (j===15){
    //                 let index = i.indexOf(j);
    //                 i.splice(index,1)
    //             }
    //         }
    //     }
    //     shunzi.sort(sortLen)
    //     console.log("SSSSSSS",shunzi)
    //     let res = []
    //     console.log(shunzi[0].length)
    //         if(shunzi[0].length>=3){
    //             console.log(12)
    //             for(let m of shunzi[0]){
    //                 for(let i of mypokers){
    //                     if(i.num ==m){
    //                         res.push(i)
    //                     }
    //                 }
    //             }

    //         }
    //         console.log("SSSSSSS",res)

    //     return res
        
    // }
    // function shuangshun(){
    //     let shunzi = exports.getAllSamePai(mypokers,2);
    //     console.log("shuangshun",shunzi)
    //     let res = [];
    //     for(let i of shunzi){
    //         if(i.length >= 2){
    //             res.push(i);
    //         }
    //     }
    //     if(res.length ===0){
    //         return []
    //     }
    //     let temp = {}
    //     let lastRes=[];
    //     res.sort(sortLen)
    //     for(let i of res[0]){
    //         temp[i]=0
    //     }
    //     for(let i of res[0]){
    //         for(let j of mypokers){
    //             if(i==j.num && temp[i]!==2){
    //                 temp[i]+=1
    //                 lastRes.push(j)
    //             }
                
    //         }
    //     }
    //     return lastRes

    // }
    // function sanshun(){
    //     let shunzi = exports.getAllSamePai(mypokers,3);
    //     console.log("sanshun",shunzi)
    //     let res = [];
    //     for(let i of shunzi){
    //         if(i.length >= 2){
    //             res.push(i);
    //         }
    //     }
    //     if(res.length ===0){
    //         return []
    //     }
    //     let lastRes=[];
    //     res.sort(sortLen)
    //     for(let i of res[0]){
    //         temp[i]=0
    //     }
    //     for(let i of res[0]){
    //         for(let j of mypokers){
    //             if(i==j.num && temp[i]!==3){
    //                 temp[i]+=1
    //                 lastRes.push(j)
    //             }
                
    //         }
    //     }
    //     return lastRes

    // }
    function danzhang(){
        mypokers = pokerSort(mypokers)
        let res = [];
         res.push(mypokers.pop());
        return res
    }
    // function duizi(){
    //     console.log("duizi2")
    //     let duizi = exports.getAllSamePai(mypokers,2);
    //     let temp = {}
    //     let res = []
    //     duizi.sort(sortgg);
    //     for(let i of mypokers){
    //         let s = 0;
    //         if(i.num == duizi[0] && s !=2){
    //             s++;
    //             res.push(i)
    //         }
    //     }
    //     console.log("duizi",res)
    //     return res;
    // }
    // let result = sanshun()
    // if(result &&result.length>0){
    //     console.log("sanshun",result)
    //     return result;
    // }
    // result=shuangshun()
    // if(result &&result.length>0){
    //     console.log("shuangshun",result)
    //     return result
    // }
    // result = danshun()
    // console.log("danshun7",result)
    // if(result &&result.length>0){
    //     console.log("danshun",result)
    //     return result
    // }
    // result = duizi()
    // if(result &&result.length>0){
    //     console.log("duizi",result)

    //     return result
    // }
    result = danzhang()
    if(result &&result.length>0){
        console.log("danzhang",result)

        return result
    }
}
/**
 * 是否AAA
 */
function isAAA(pokers) {
    pokers = pokerSort(pokers);
    if(pokers.length ===3 && pokers[0].num==pokers[2].num==14){
        return true;
    }
    return false;
    
}

/**
 * 炸弹
 * @param pokers
 */
function isZhaDan(pokers) {
    pokers = pokerSort(pokers);
    let len = pokers.length
    if(pokers.length === 4 && pokers[0].num===pokers[len-1].num){
        return pokers[0].num;
    }
    return false;
    
}

/**
 * 是否是三张
 * @param pokers
 */
function isSanZhang(pokers) {
    pokers = pokerSort(pokers);
    let len = pokers.length;
    if(pokers.length === 3 && pokers[0].num===pokers[len-1].num){
        return pokers[0].num;
    }
    return false;
}

/**
 * 是否是对子
 * @param pokers
 */
function isDuizi(pokers) {
    pokers = pokerSort(pokers);
    let len = pokers.length
    if(pokers.length === 2 && pokers[0].num===pokers[len-1].num){
        return pokers[0].num
    }
    return false;

}

/**
 * 是否是单牌
 */
function isDanZhang(pokers) {
    let len = pokers.length
    if(pokers.length === 1){
        return true;
    }
    return false;
}

/**
 * 是否是三带一
 */
function isSanAndOne(pokers) {
    pokers = pokerSort(pokers);
    if(pokers.length!==4){
        return false;
    }
    if(pokers[0].num!==pokers[1].num){
        if(pokers[1].num === pokers[3].num){
            return pokers[1].num;
        }
    }
    if(pokers[2].num!==pokers[3].num){
        if(pokers[0].num === pokers[2].num){
            return pokers[0].num;
        }
    }
    return false;
}

/**
 * 是否是三带二
 */
function isSanAndTwo(pokers) {
    pokers = pokerSort(pokers);
    if(pokers.length!==5){
        return false;
    }
    if(pokers[0].num!==pokers[2].num){
        if(pokers[1].num === pokers[0].num && pokers[2].num==pokers[4].num){
            return pokers[4].num;
        }
    }
    if(pokers[2].num!==pokers[3].num){
        if(pokers[0].num === pokers[2].num && pokers[3].num ==pokers[4].num){
            return pokers[0].num;
        }
    }
    return false;
}
/**
 * 是否是飞机
 */
function isFeiji(pokers) {
    pokers = pokerSort(pokers);
    let temp = {};

    //初始化temp
    for(let i of pokers){
        temp[i.num] = 0
    }
    // console.log(temp)
    for(let i of pokers){
        temp[i.num] +=1
    }
    console.log(temp)
    let keys = Object.keys(temp)
    //按照value的大小从大到小排序
    function sorts(a,b){
        return temp[a] < temp[b]
    }
    keys.sort(sorts)

    if(temp[keys[0]]!==3){
        return false;
    }
    let temp2={}
    //初始化temp2
    for(let i in temp){
        temp2[temp[i]]=0;
    }
    // console.log(temp2)
    for(let i in temp){
        temp2[temp[i]] += 1;
    }
    // console.log("temp2",temp2)
    let keys2 = Object.keys(temp2)
    if (keys2.length !==2){
        return false
    }
    if(temp2[keys2[0]] !== temp2[keys2[1]]){
        return false;
    }
    for(let i of keys){
        if(temp[i] !== 3){
            delete temp[i];
        }
       
    }
    if(Object.keys(temp).length!==2){
        return false;
    }
    return temp;
}
exports.issanander = function(pokers) {
    pokers = pokerSort(pokers);
    // console.log(pokers.length)
    if(pokers.length!==6 && pokers.length!==8){
        return false;
    }
    let temp = {};
    //初始化temp
    for(let i of pokers){
        temp[i.num] = 0
    }
    // console.log(temp)

    let keys = Object.keys(temp)
    if(keys.length !== 3){
        return false;
    }
    for(let i of pokers){
        temp[i.num] +=1
    }
    // console.log(temp)
    //按照value的大小从大到小排序
    function sorts(a,b){
        return temp[a] < temp[b]
    }
    keys.sort(sorts)

    if(temp[keys[0]]!==4){
        return false;
    }
    let temp2={}
    //初始化temp2
    for(let i in temp){
        temp2[temp[i]]=0;
    }
    // console.log(temp2)
    for(let i in temp){
        temp2[temp[i]] += 1;
    }
    // console.log(temp2)
    let keys2 = Object.keys(temp2)
    if (keys2.length !==2){
        return false
    }
    for(let i of keys){
        if(temp[i] !== 4){
            delete temp[i];
        }
        
    }
    return temp;
}
/**
 * 是否是四带二
 */
function isSiAndTwo(pokers) {
    pokers = pokerSort(pokers);
    // console.log(pokers.length)
    if(pokers.length!==6 && pokers.length!==8){
        return false;
    }
    let temp = {};
    //初始化temp
    for(let i of pokers){
        temp[i.num] = 0
    }
    // console.log(temp)

    let keys = Object.keys(temp)
    if(keys.length !== 3){
        return false;
    }
    for(let i of pokers){
        temp[i.num] +=1
    }
    // console.log(temp)
    //按照value的大小从大到小排序
    function sorts(a,b){
        return temp[a] < temp[b]
    }
    keys.sort(sorts)

    if(temp[keys[0]]!==4){
        return false;
    }
    let temp2={}
    //初始化temp2
    for(let i in temp){
        temp2[temp[i]]=0;
    }
    // console.log(temp2)
    for(let i in temp){
        temp2[temp[i]] += 1;
    }
    // console.log(temp2)
    let keys2 = Object.keys(temp2)
    if (keys2.length !==2){
        return false
    }
    for(let i of keys){
        if(temp[i] !== 4){
            delete temp[i];
        }
        
    }
    return temp;
}
//是否是单顺
function isDanShun(pokers) {
    pokers = pokerSort(pokers);
    let limit = [15];
    let len = pokers.length
    if(len<3){
        return false;
    }
    for(let i of pokers){
        if(limit.indexOf(i.num) !== -1){
            return false;
        }
    }
    // console.log(pokers)
    for(let i=1;i<len;i++){
        if(pokers[i].num !== pokers[i-1].num -1){
            return false;
        }
    }
    return pokers[0].num;
}

/***
 * 是否是双顺
 */

function isShuangShun(pokers,roomId){
    let roomInfo = gameMgr.getRoomById(roomId);
    if(!roomInfo){
        console.log("isShuangShun roomInfo is err");
        return;
    }
    let weishu = roomInfo.liandui;
    pokers = pokerSort(pokers);
    let limit = [];
    let len = pokers.length
    if(len<weishu || len%2!==0){
        return false;
    }
    for(let i of pokers){
        if(limit.indexOf(i.num) !== -1){
            return false;
        }
    }
    let bs = len/2;
    //判断是不是每一组数据是否相等
    for(let i=0;i<bs;i++){
        if(pokers[2*i].num !== pokers[2*i+1].num ){
            return false;
        }
    }
    //判断相邻两组是否相差一
    for(let i=0;i<bs-1;i++){
        if(pokers[2*i+1].num !== pokers[2*i+2].num+1 ){
            return false;
        }
    }
    return pokers[0].num;
}

/**
 * 是否是三顺
 * @param {*} pokers 
 */
function isSanShun(pokers){
    pokers = pokerSort(pokers);
    let limit = [15];
    let len = pokers.length
    if(len<6 || len%3!==0){
        return false;
    }
    // console.log(pokers)
    for(let i of pokers){
        if(limit.indexOf(i.num) !== -1){
            return false;
        }
    }
    // console.log(pokers)
    let bs = len/3;
    //判断是不是每一组数据是否相等
    for(let i=0;i<bs;i++){
        if(pokers[3*i].num !== pokers[3*i+1].num ){
            return false;
        }
    }
    //判断相邻两组是否相差一
    for(let i=0;i<bs-1;i++){
        if(pokers[3*i+2].num !== pokers[3*i+3].num+1 ){
            return false;
        }
    }
    return pokers[0].num;
}

/**
 * 扑克排序从大到小
 */
function pokerSort(pokers) {
    for (var i = 0; i < pokers.length - 1; i++) {//外层循环控制排序趟数
        for (var j = 0; j < pokers.length - 1 - i; j++) {//内层循环控制每一趟排序多少次
            if (parseInt(pokers[j].num) < parseInt(pokers[j + 1].num)) {
                var temp = pokers[j];
                pokers[j] = pokers[j + 1];
                pokers[j + 1] = temp;
            }
        }
    }
    return pokers;
}
exports.pokerSort = function(pokers) {
    for (var i = 0; i < pokers.length - 1; i++) {//外层循环控制排序趟数
        for (var j = 0; j < pokers.length - 1 - i; j++) {//内层循环控制每一趟排序多少次
            if (parseInt(pokers[j].num) < parseInt(pokers[j + 1].num)) {
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
 * return 0 不能比较 -1 我的牌小 1 我的牌大 2 无此牌型
 */
exports.compare = function (myPokers, otherPokers,meUserId,otherUserId) {

    let mytype= exports.getPokerType(myPokers,meUserId);
    let otherType = exports.getPokerType(otherPokers,otherUserId);
    let myPokersType = mytype.type;
    let otherPokersType = otherType.type;
    if(otherPokers.length===0 &&mytype){
        return 1;
    }
    if(!mytype){
        return 2;
    }
    if(myPokersType == "AAA"){
        return 1
    }
    if(otherPokersType == "AAA"){
        return -1
    }
    if(myPokersType == "zhadan"){
        if(otherPokersType !== "zhandan"){
            return 1
        }else{
            if(mytype.pokers > otherType.pokers){
                return 1
            }else if(mytype.pokers < otherType.pokers){
                return -1
            }else{
                return 0
            }
        }
    }
    if(otherPokersType == "zhadan"){
        if(myPokersType !== "zhandan"){
            return -1
        }else{
            if(mytype.pokers > otherType.pokers){
                return 1
            }else if(mytype.pokers < otherType.pokers){
                return -1
            }else{
                return 0
            }
        }
    }
    if(myPokersType !== otherPokersType){
        return 0;
    }
    if(myPokers.length !== otherPokers.length){
        return 0;
    }
    if(mytype.pokers > otherType.pokers){
        return 1
    }else if(mytype.pokers < otherType.pokers){
        return -1
    }else{
        return 0;
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


// /**
//  * 对发出的牌，按牌型的大小进行排序
//  */
// exports.sortPoker = function(oldPokers){
//     var pokers = JSON.parse(JSON.stringify(oldPokers.concat()));
//     var sorted = pokers.sort(function(a,b){
//         return exports.compare(a,b);
//     })
//     return sorted;
// }

/**
 * 手牌转换成牌型
 */
exports.toPokerType = function(pokers,userId){
    let types = [];
    for(let i=0;i<pokers.length;i++){
        let type = exports.getPokerType(pokers[i],userId);
        types.push(type.type);
    }
    return types;
}

