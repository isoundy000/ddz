let matchServer = require("../../common/service/matchServer")
/**
 * 金币场房间管理(初级)
 */
let config = {
    xinshou: xinshou(),
    jingying: jingying(),
    dashi: dashi(),
    bisai_config: bisai_config()
}
async function xinshou() {

    let data = await getMatchDb("xinshou")
    let usersNum = data.min_user_num
    return {
        room_type: "xinshou",
        diZhu: data.dizhu,
        diFen: data.difen,
        limitFen: data.limit_fen,
        maxGames: -1,//无限局数
        isPrivate: 0,
        type: "doudizhu",

        kindId: "200",
        usersNum: usersNum,
        jinji: [21, 12, 3],//晋级名次
        chushifenshu: data.chushifenshu,
        allAward: data.award_name,//总奖励
        award: data.award, //奖励
        //明牌最大倍数
        mingpaiBeishu: 4,
        room_count: -1,
        chushibeishu: 15,
        seatCount: 3,
        qiangfen: [1, 2, 3],
        //最低入场分数
        minScoreLimit: data.minScoreLimit,
        // //最高入场分数
        // maxScoreLimit: 100000,
        choushuiRate: 0.5,//房间抽水率(按照底注的50%抽水)
        READY_COUNTDOWN: 10 * 1000,    //等待准备超时时间（10S）
        OPT_COUNTDOWN: 10 * 1000,//操作超时时间 10s
        //金币场编号 左边 代表是否是特殊场 右边代表 场次
        serial_num: '1',
    }

}
async function jingying() {
    let data = await getMatchDb("jingying")
    let usersNum = data.min_user_num
    return {
        room_type: "jingying",
        diZhu: data.dizhu,
        diFen: data.difen,
        limitFen: data.limit_fen,
        maxGames: -1,//无限局数
        isPrivate: 0,
        type: "doudizhu",

        kindId: "200",
        usersNum: usersNum,
        jinji: [21, 12, 3],//晋级名次
        chushifenshu: data.chushifenshu,
        allAward: data.award_name,//总奖励
        award: data.award, //奖励
        //明牌最大倍数
        mingpaiBeishu: 4,
        room_count: -1,
        chushibeishu: 15,
        seatCount: 3,
        qiangfen: [1, 2, 3],
        //最低入场分数
        minScoreLimit: data.minScoreLimit,
        // //最高入场分数
        // maxScoreLimit: 100000,
        choushuiRate: 0.5,//房间抽水率(按照底注的50%抽水)
        READY_COUNTDOWN: 10 * 1000,    //等待准备超时时间（10S）
        OPT_COUNTDOWN: 10 * 1000,//操作超时时间 10s
        //金币场编号 左边 代表是否是特殊场 右边代表 场次
        serial_num: '1',
    }

}

async function dashi() {
    let data = await getMatchDb("dashi")
    let usersNum = data.min_user_num
    return {
        room_type: "jingying",
        diZhu: data.dizhu,
        diFen: data.difen,
        limitFen: data.limit_fen,
        maxGames: -1,//无限局数
        isPrivate: 0,
        type: "doudizhu",

        kindId: "200",
        usersNum: usersNum,
        jinji: [21, 12, 3],//晋级名次
        chushifenshu: data.chushifenshu,
        allAward: data.award_name,//总奖励
        award: data.award, //奖励
        //明牌最大倍数
        mingpaiBeishu: 4,
        room_count: -1,
        chushibeishu: 15,
        seatCount: 3,
        qiangfen: [1, 2, 3],
        //最低入场分数
        minScoreLimit: data.minScoreLimit,
        // //最高入场分数
        // maxScoreLimit: 100000,
        choushuiRate: 0.5,//房间抽水率(按照底注的50%抽水)
        READY_COUNTDOWN: 10 * 1000,    //等待准备超时时间（10S）
        OPT_COUNTDOWN: 10 * 1000,//操作超时时间 10s
        //金币场编号 左边 代表是否是特殊场 右边代表 场次
        serial_num: '1',
    }

}

async function bisai_config() {
    let jingying = await getMatchDb("jingying")
    let xinshou = await getMatchDb("xinshou")
    let dashi = await getMatchDb("dashi")
    // console.log("jingying", jingying)
    return [{
        img: xinshou.img,
        type: "xinshou",
        description: xinshou.description,
        award: xinshou.award_name,


        fee: xinshou.fee,
    },
    {
        img: jingying.img,
        type: "jingying",
        description: jingying.description,
        award: jingying.award_name,


        fee: jingying.fee,
    },
    {
        img: dashi.img,
        type: "dashi",
        description: dashi.description,
        award: dashi.award_name,


        fee: dashi.fee,
    },
    ]
}
function getMatchDb(type) {
    return new Promise((resolve, reject) => {
        matchServer.getMatchConfig(type, function (err, result) {
            if (err) {
                console.log(err)
                return reject(err)
            }
            resolve(result)
        })
    })

}
function getMatchDb2(type, callback) {
    matchServer.getMatchConfig(type, function (err, result) {
        if (err) {
            console.log(err)
            return callback(err, null)
        }
        return callback(null, result)
    })

}

exports.config = config