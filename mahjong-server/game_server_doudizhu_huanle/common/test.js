let gameLogic = require("./gameLogic")
// let socketHandler = require("./socketHandler")
let commonUtil = require("../../utils/commonUtil")
let s = [{ color: 3, num: 15 },
{ color: 1, num: 15 },
{ color: 0, num: 14 },
{ color: 3, num: 14 },
{ color: 0, num: 13 },
{ color: 0, num: 12 },
{ color: 2, num: 12 },
{ color: 1, num: 12 },
{ color: 0, num: 11 },
{ color: 1, num: 11 },
{ color: 2, num: 9 },
{ color: 1, num: 9 },
{ color: 3, num: 6 },
{ color: 1, num: 4 },
{ color: 3, num: 3 }]
// let pokerType = gameLogic.getPokerType(s)
// let l = [{num:14},{num:14,color:1},{num:12,color:1},{num:11,color:1},{num:10,color:1},{num:9,color:1}]
// // console.log("compare",gameLogic.compare(s,l))
// console.log("结果",gameLogic.getBiggerPokers(s,l));
// console.log("结果2",gameLogic.getSuijiPai(l));

// let pokerType = gameLogic.getSuijiPai(s)
// console.log("pokerType", pokerType);
// // function sortSS(a,b){
//     return a.num-b.num
// }
// console.log(commonUtil.randomFrom(0,100))
// // let gameLogic = require("./gameLogic")
// let pokers = [{num:7},{num:7},{num:8},{num:8}]
// let mypokers = [{num:10},{num:10},{num:11},{num:11}]
// let getBig = gameLogic.getBiggerPokers(pokers,mypokers)
// console.log(123)
// console.log(getBig)





// let db= require("../../utils/db")
// let sql = "insert into t_paixing (paixing) values(?)"


// let s = [[3,4,5,6,7,8,9,10,11,12,13,14],
// [4,5,6,7,8,9,9,10,11,12,13,14],
// [4,5,6,6,7,8,9,10,11,12,13,14],
// [4,5,6,7,8,9,10,11,12,13,14,14],
// [3,3,5,6,7,8,9,10,11,12,13,14],
// [3,4,5,6,7,8,9,10,11,11,12,13],
// [3,4,5,7,8,9,10,11,12,13,14,14],
// [3,3,3,4,7,8,9,10,11,12,13,14],
// [3,4,5,6,7,8,9,11,11,11,11,14],
// [4,5,6,7,8,9,10,11,13,13,13,14],
// [3,5,6,7,8,9,10,11,12,13,14,14],
// [4,5,6,7,8,9,10,11,12,12,12,13],
// [5,6,7,8,9,10,11,12,13,13,14,14],
// [3,3,4,4,7,8,9,10,11,12,13,14],
// [4,4,4,5,6,7,8,9,10,11,12,13],
// [3,3,4,5,6,6,11,12,13,14,14,14],
// [6,7,7,7,8,9,10,11,12,13,14,14],
// [6,7,8,8,8,8,9,10,11,12,13,14],
// [4,5,6,7,7,8,8,9,9,10,11,12],
// [3,3,3,5,8,9,10,11,12,13,14,14],
// [3,4,5,6,7,8,9,10,10,11,12,13],
// [3,4,4,4,5,5,5,7,11,12,13,14],
// [3,4,5,7,8,8,8,8,10,12,13,14],
// [4,4,5,5,6,6,9,10,11,12,13,14],
// [3,3,4,5,6,7,8,9,10,11,12,13],
// [3,4,5,6,7,8,9,10,11,12,13,13],
// [3,4,5,5,6,7,8,9,10,11,12,13],
// [3,5,6,7,8,9,10,11,12,13,14,14],
// [3,3,7,7,8,8,9,9,11,12,13,14],
// [5,5,6,6,7,7,8,8,9,12,13,14],
// [14,14,14,12,12,12,12,10,7,6,5,4],
// [13,13,13,11,10,9,8,7,6,5,4,3],
// [12,12,12,11,10,9,8,7,6,5,4,3],
// [15,14,14,12,11,10,9,8,7,6,5,3],
// [15,11,10,10,10,9,8,7,6,5,4,3],
// [15,12,11,10,9,9,9,8,7,6,5,4],
// [15,13,12,11,10,9,8,7,6,5,3,3],
// [15,14,14,13,13,10,9,8,7,6,5,4],
// [15,14,13,13,13,12,9,8,7,6,5,4],
// [15,14,12,12,12,11,8,7,6,5,4,3],
// [15,14,13,12,11,10,9,8,6,6,5,5],
// [15,12,12,12,11,10,9,8,7,6,5,4],
// [15,14,14,14,13,13,9,8,7,7,6,4],
// [15,13,13,12,12,11,11,9,8,7,6,5],
// [14,14,13,13,13,9,8,7,6,6,5,4],
// [14,13,12,12,12,11,11,11,7,6,5,5],
// [14,13,12,9,9,9,8,8,8,6,3,3],
// [4,5,6,7,7,8,9,11,13,13,13,13],
// [14,13,12,9,9,8,8,7,7,6,5,4],
// [13,13,12,12,11,11,10,10,10,9,9,8],
// [3,4,5,6,7,8,9,10,11,12,12,13],
// [3,4,6,6,6,6,8,9,10,11,12,13],
// [4,5,5,5,5,7,8,9,10,11,12,13],
// [14,14,13,13,12,12,11,10,10,9,8,7],
// [14,13,13,12,12,11,10,9,8,7,6,4],
// [14,13,12,12,11,10,9,8,7,6,5,3],
// [3,3,3,3,5,7,8,10,11,12,13,14],
// [3,3,4,4,5,5,7,8,9,10,11,12],
// [3,4,5,6,6,7,7,8,8,9,10,11],
// [3,3,3,3,4,5,10,11,12,13,13,14],
// [3,3,7,7,7,7,8,9,10,11,12,13],
// [3,4,5,6,7,8,9,10,12,14,14,14],
// [5,6,7,8,9,10,11,12,12,13,13,13],
// [3,4,5,6,7,8,9,9,10,10,11,11],
// [5,6,7,8,9,9,10,10,11,11,12,13],
// [4,6,6,6,7,7,7,9,9,10,11,12],
// [3,4,5,6,7,8,9,10,11,12,14,14],
// [3,4,5,6,6,7,8,9,10,13,13,13],
// [3,4,6,7,8,9,10,11,12,13,13,13],
// [3,5,6,7,9,10,11,12,13,14,14,14],
// [14,14,13,13,13,12,11,11,11,9,8,7],
// [3,3,3,4,5,6,7,8,9,10,11,12],
// [3,4,5,6,7,8,11,11,11,12,13,14],
// [5,6,7,9,10,11,12,12,12,12,13,14],
// [3,4,5,6,7,8,8,8,9,10,11,12],
// [3,4,5,6,7,8,9,10,11,11,12,13],
// [4,5,5,6,7,8,9,10,11,12,13,14],
// [3,3,4,4,4,6,12,12,12,13,13,13],
// [3,4,5,7,7,12,12,12,13,13,14,14],
// [3,4,4,4,5,6,7,8,9,10,11,12],
// [3,5,5,5,6,6,6,9,10,12,13,14],
// [3,4,4,4,5,5,5,7,8,9,10,11],
// [3,4,4,9,9,9,10,10,10,12,13,14],
// [3,3,4,5,6,8,10,10,10,11,11,11],
// [5,6,7,8,9,9,10,11,12,13,14,14],
// [3,4,5,5,6,6,7,8,9,10,11,12],
// [3,3,5,6,7,8,9,10,11,12,13,14],
// [3,5,9,9,9,9,10,12,12,13,13,13],
// [3,4,6,8,8,8,8,11,11,13,13,13],
// [4,5,7,7,7,7,9,9,11,12,13,14],
// [3,4,5,6,8,10,10,10,10,12,13,14],
// [3,5,5,5,5,6,6,7,13,13,14,14],
// [3,4,5,6,7,8,9,10,11,13,14,14],
// [3,4,5,6,7,8,9,10,10,12,13,14],
// [3,3,3,4,7,8,9,10,11,12,13,14],
// [5,7,7,8,8,9,9,10,10,12,13,14],
// [3,4,5,6,7,8,9,10,11,14,14,14],
// [3,4,5,6,7,8,11,11,12,12,14,14],
// [4,5,6,7,10,10,11,11,12,12,12,13],
// [6,8,9,10,11,11,12,12,13,13,14,14]]
// let config = require("../../configs")
// db.init(config.mysql())

// setTimeout(function(){
//     for(let i of s){
//         for(let j in i){
//             i[j] +=""
//             // console.log(j)
//         }
//         i = JSON.stringify(i)
//         console.log(i)
//         db.save(sql,i,function(err,values){
//             if(err){
//                 console.log(err)
//                 return 
//             }

//         })
//     }

// },2000)
// let commonServer = require("../../common/service/commonService")
// let s = commonServer.getTableAListAsync(0,10000,"paixing","t_paixing")
// console.log(123)
// console.log(s)


// console.log(add.ip())


let j1 = [{ color: 1, num: 15 }, { color: 3, num: 15 }]

for (let j of j1) {
    if (j.num == 15) {
        console.log(j)
    }
    if (j.num == 15) {
        // commonUtil.removeOne(s, j)
        console.log(j)
        let index = s.indexOf(j)
        console.log(index)
        s.splice(index, 1)
    }
}

console.log(s)