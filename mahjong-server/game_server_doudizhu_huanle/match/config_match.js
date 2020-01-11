let matchServer = require("../../common/service/matchServer")
/**
 * 金币场房间管理(初级)
 */
let config={
    xinshou:xinshou(),
    jingying:jingying(),
    dashi:dashi(),
    bisai_config:bisai_config()
}
 function xinshou() {
     
    return {
        room_type:"xinshou",
        diZhu:10,
        maxGames:-1,//无限局数
        isPrivate:0,
        type:"doudizhu",
        jinji:[45,27,12,3],//晋级名次
        kindId:"200",
        usersNum:60,
        chushifenshu:4000,
        allAward:17000,//总奖励
        award:[{award:120000,type:0},
            {award:40000,type:0},
            {award:16000,type:0},
            {award:8000,type:0},
            {award:8000,type:0},
            {award:8000,type:0},], //奖励
        //明牌最大倍数
        mingpaiBeishu: 4,
        room_count: -1,
        chushibeishu:15,
        seatCount: 3,
        qiangfen:[1,2,3],
        //最低入场分数
        minScoreLimit: 1000,
        //最高入场分数
        maxScoreLimit: 100000,
        choushuiRate:0.5,//房间抽水率(按照底注的50%抽水)
        READY_COUNTDOWN:10*1000,    //等待准备超时时间（10S）
        OPT_COUNTDOWN:10*1000,//操作超时时间 10s
        //金币场编号 左边 代表是否是特殊场 右边代表 场次
        serial_num : '1',
    }

}
function jingying() {
    return {
        room_type:"jingying",
        diZhu:40,
        maxGames:-1,//无限局数
        isPrivate:0,
        jinji:[45,27,12,3],//晋级名次
        type:"doudizhu",
        kindId:"201",
        isDaiKai:0,
        usersNum:60,
        chushifenshu:4000,
        //明牌最大倍数
        mingpaiBeishu: 4,
        allAward:47000,//总奖励
        award:[{award:120000,type:0},
            {award:40000,type:0},
            {award:16000,type:0},
            {award:8000,type:0},
            {award:8000,type:0},
            {award:8000,type:0},],//奖励
        room_count: -1,
        chushibeishu:15,
        seatCount: 3,
        robot_count:1,//房间机器人的数量
        robotWinPR:80,//机器人胜率
        playerWinPR:20,//玩家胜率
        qiangfen:[1,2,3],
        //最低入场分数
        minScoreLimit: 5000,
        //最高入场分数
        maxScoreLimit: -1,
        choushuiRate:0.5,//房间抽水率(按照底注的50%抽水)
        READY_COUNTDOWN:10*1000,    //等待准备超时时间（10S）
        OPT_COUNTDOWN:10*1000,//操作超时时间 10s
        //金币场编号 左边 代表是否是特殊场 右边代表 场次
        serial_num : '1',
    }

}

function dashi() {
    return {
        room_type:"dashi",
        diZhu:200,
        maxGames:-1,//无限局数
        isPrivate:0,
        jinji:[45,27,12,3],//晋级名次
        chushifenshu:4000,
        type:"doudizhu",
        kindId:"202",
        isDaiKai:0,
        usersNum:60,
        //明牌最大倍数
        mingpaiBeishu: 4,
        allAward:20,//总奖励
        award:[{award:120000,type:0},
            {award:40000,type:0},
            {award:16000,type:0},
            {award:8000,type:0},
            {award:8000,type:0},
            {award:8000,type:0},],//奖励
        room_count: -1,
        chushibeishu:15,
        seatCount: 3,
        qiangfen:[1,2,3],
        //最低入场分数
        minScoreLimit: 20000,
        //最高入场分数
        maxScoreLimit: -1,
        choushuiRate:0.5,//房间抽水率(按照底注的50%抽水)
        READY_COUNTDOWN:10*1000,    //等待准备超时时间（10S）
        OPT_COUNTDOWN:10*1000,//操作超时时间 10s
        //金币场编号 左边 代表是否是特殊场 右边代表 场次
        serial_num : '1',
    }

}

function bisai_config(){
    return [{img:"http://192.168.0.192:12345/photos/4.jpg",
            type:"xinshou",
            description:"满60人开始",
            award:"1亿元现金",


            fee:"200",},
            {img:"http://192.168.0.192:12345/photos/4.jpg",
            type:"jingying",
            description:"满60人开始",
            award:"1亿元现金",
            fee:"2000",},
            {img:"http://192.168.0.192:12345/photos/4.jpg",
            type:"dashi",
            description:"满60人开始",
            award:"1亿元现金",
            fee:"20000",},
        ]
}
function getMatchDb(type){
    return new Promise((resolve,reject)=>{
        matchServer.getMatchConfig(type,function(err,result){
            if(err){
                console.log(err)
                return reject(err)
            }
            resolve(result)
        })
    })

}
async function getMatchConfig(type){
    let config = await getMatchConfig(type)
    console.log("config",config)
}
exports.config = getMatchConfig