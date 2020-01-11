/**
 * 金币场房间管理(初级)
 */

let config={
    xinshou:xinshou(),
    jingying:jingying(),
    dashi:dashi(),
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
        award:[8000,3000,1000,800,800,800,500,500,500,500,500,500],//奖励
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
        award:[20000,12000,6000,3000,3000,3000],//奖励
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
        award:[120000,40000,16000,8000,8000,8000],//奖励
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
    
}

exports.config = config