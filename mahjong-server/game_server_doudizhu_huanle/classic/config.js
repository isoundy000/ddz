/**
 * 金币场房间管理(初级)
 */

let config={
    xinshou:xinshou(),
    chuji:chuji(),
    putong:putong(),
    zhongji:zhongji(),
    gaoji:gaoji(),
    dingji:dingji()
}
 function xinshou() {
    return {
        room_type:"xinshou",
        diZhu:10,
        maxGames:-1,//无限局数
        isPrivate:0,
        type:"doudizhu",
        kindId:"107",
        isDaiKai:0,
        //明牌最大倍数
        mingpaiBeishu: 4,
        room_count: -1,
        chushibeishu:15,
        seatCount: 3,
        robot_count:1,//房间机器人的数量
        robotWinPR:80,//机器人胜率
        playerWinPR:20,//玩家胜率
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
function chuji() {
    return {
        room_type:"chuji",
        diZhu:25,
        maxGames:-1,//无限局数
        isPrivate:0,
        type:"doudizhu",
        kindId:"108",
        isDaiKai:0,
        //明牌最大倍数
        mingpaiBeishu: 4,
        room_count: -1,
        chushibeishu:15,
        seatCount: 3,
        robot_count:1,//房间机器人的数量
        robotWinPR:80,//机器人胜率
        playerWinPR:20,//玩家胜率
        qiangfen:[1,2,3],
        //最低入场分数
        minScoreLimit: 2000,
        //最高入场分数
        maxScoreLimit: 300000,
        choushuiRate:0.5,//房间抽水率(按照底注的50%抽水)
        READY_COUNTDOWN:10*1000,    //等待准备超时时间（10S）
        OPT_COUNTDOWN:10*1000,//操作超时时间 10s
        //金币场编号 左边 代表是否是特殊场 右边代表 场次
        serial_num : '1',
    }

}

function putong() {
    return {
        room_type:"putong",
        diZhu:60,
        maxGames:-1,//无限局数
        isPrivate:0,
        type:"doudizhu",
        kindId:"109",
        isDaiKai:0,
        //明牌最大倍数
        mingpaiBeishu: 4,
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
function zhongji() {
    return {
        room_type:"zhongji",
        diZhu:150,
        maxGames:-1,//无限局数
        isPrivate:0,
        type:"doudizhu",
        kindId:"110",
        isDaiKai:0,
        //明牌最大倍数
        mingpaiBeishu: 4,
        room_count: -1,
        chushibeishu:15,
        seatCount: 3,
        robot_count:1,//房间机器人的数量
        robotWinPR:80,//机器人胜率
        playerWinPR:20,//玩家胜率
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
function gaoji() {
    return {
        room_type:"gaoji",
        diZhu:400,
        maxGames:-1,//无限局数
        isPrivate:0,
        type:"doudizhu",
        kindId:"112",
        isDaiKai:0,
        //明牌最大倍数
        mingpaiBeishu: 4,
        room_count: -1,
        chushibeishu:15,
        seatCount: 3,
        robot_count:1,//房间机器人的数量
        robotWinPR:80,//机器人胜率
        playerWinPR:20,//玩家胜率
        qiangfen:[1,2,3],
        //最低入场分数
        minScoreLimit: 50000,
        //最高入场分数
        maxScoreLimit: -1,
        choushuiRate:0.5,//房间抽水率(按照底注的50%抽水)
        READY_COUNTDOWN:10*1000,    //等待准备超时时间（10S）
        OPT_COUNTDOWN:10*1000,//操作超时时间 10s
        //金币场编号 左边 代表是否是特殊场 右边代表 场次
        serial_num : '1',
    }

}
function dingji() {
    return {
        room_type:"dingji",
        diZhu:1000,
        maxGames:-1,//无限局数
        isPrivate:0,
        type:"doudizhu",
        kindId:"113",
        isDaiKai:0,
        //明牌最大倍数
        mingpaiBeishu: 4,
        room_count: -1,
        chushibeishu:15,
        seatCount: 3,
        robot_count:1,//房间机器人的数量
        robotWinPR:80,//机器人胜率
        playerWinPR:20,//玩家胜率
        qiangfen:[1,2,3],
        //最低入场分数
        minScoreLimit: 100000,
        //最高入场分数
        maxScoreLimit: -1,
        choushuiRate:0.5,//房间抽水率(按照底注的50%抽水)
        READY_COUNTDOWN:10*1000,    //等待准备超时时间（10S）
        OPT_COUNTDOWN:10*1000,//操作超时时间 10s
        //金币场编号 左边 代表是否是特殊场 右边代表 场次
        serial_num : '1',
    }

}

exports.config = config