let gameLogic  = require("./gameLogic")
let commonUtil = require("../utils/commonUtil")
let s=[{num:3},{num:3},{num:3},{num:4},{num:4}]
let l = [{num:7},{num:7},{num:7},{num:6},{num:6}]
console.log(gameLogic.getBiggerPokers(s,l));
let pokerType = gameLogic.getPokerType(s)
console.log(pokerType);
// function sortSS(a,b){
//     return a.num-b.num
// }
// console.log(l.sort(sortSS))
// function generatePoker() {
//     var pokers = [];
//     for (var i = 0; i < 4; i++) {
//         for (var j = 3; j <= 13; j++) {
//             var poker = {};
//             poker.color = i;
//             poker.num = j;
//             pokers.push(poker);
//         }
        
//     }
//     let er = [{ color: 0, num: 14 },{ color: 1, num: 14 },{ color: 2, num: 14 }];
//     let A={ color: 0, num: 15 }
//     let p = pokers.concat(er);
//     p.push(A);
//     // shuffle(p);
//     return p;
// }
// let p = generatePoker()
// console.log(generatePoker())
// for(let j of p){
//     // console.log(j.num)
//     if(j.num==3 && j.clolor ==2){
//         console.log(j)
//         console.log("jjjjjjjjjjjjjjjjj")
        
//     }
// }
// let s = "0"
// console.log(!s)


// let s = gameLogic.issanander([{num:3},{num:3},{num:3},{num:4},{num:4}],606078)
// console.log(s)
let gameLogic  = require("./gameLogic")
// // let commonUtil = require("../utils/commonUtil")
// let s=[{num:3},{num:3}]
// let l = [{num:7,color:1},{num:7,color:2}]
// console.log(gameLogic.getBiggerPokers(s,l));
// let pokerType = gameLogic.getPokerType(s)
// console.log(pokerType);
// let pokers = [ { color: 3, num: 3 },
//     { color: 0, num: 3 },
//     { color: 1, num: 4 },
//     { color: 1, num: 6 },
//     { color: 0, num: 6 },
//     { color: 2, num: 7 },
//     { color: 3, num: 8 },
//     { color: 1, num: 11 },
//     { color: 2, num: 11 },
//     { color: 1, num: 12 },
//     { color: 3, num: 12 },
//     { color: 2, num: 12 } ]
// gameLogic.getAllSamePai(pokers,2)

// let r = require("./entity/RobotSocket")
// let f = new r(123)
// console.log(f)
// console.log(1111111111111)
// console.log(r(123))
// function sortLen(a,b){
//     return b.length-a.length
// }
// let s = [[1],[2,3,4],[9]]
// s.sort(sortLen)
// console.log(s)

// let gameLogic = require("./gameLogic")
// let pai = [{num:3},{num:4},{num:5}]
// let res = gameLogic.getSuijiPai(pai)
// console.log(123)
// console.log(res);

// let r = pai.filter((world)=>world.num>3)
// console.log(r)
// console.log(pai)