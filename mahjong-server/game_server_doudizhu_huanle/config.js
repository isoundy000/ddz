/**
 * 金币场房间管理(初级)
 */
exports.xinshou = function() {
    return {
        room_type:"xinshou",
        diZhu:8,
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