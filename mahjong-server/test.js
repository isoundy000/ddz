// let dateUtil = require("./utils/dateUtil")
// let jintianT = dateUtil.getBeginTimestamp("2019-12-19")
// console.log(jintianT)
// let jt = dateUtil.getToday()
// console.log(jt)
// let jintianT2 = dateUtil.getBeginTimestamp(jt)
// console.log(jintianT2)
// // let s={1:0,2:1,3:1,4:0,5:0}
// // for(let i in s){
// //     if(i>2){
// //         s[i] = -1
// //     }
// // }
// let s = new Date().getTime();
// console.log(s)

// let s=[1,2,3]
// let s2 = JSON.stringify(s)
// console.log(s2,typeof s2,s2[0])
// let s3=JSON.parse(s2)
// console.log(s3[0])
function sortByfen(a, b) {
    return b.fen - a.fen
}

let s = [{ fen: 1 }, { fen: 19 }, { fen: 15 }, { fen: 17 }]
s.sort(sortByfen)
console.log(s)