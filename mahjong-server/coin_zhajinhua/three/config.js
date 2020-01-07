/**
 * 金币场房间管理(初级)
 */
exports.config = {
    
    jinbijiesuan: false,
   room_type:"800万",
    //是否金币场,客户端需要
    is_coins: true,
    is_special: false,//特殊玩法

    diZhu:5000,
    maxGames:-1,//无限局数
    fengDing:10,//最大下注轮数
    biMen:0,//必闷轮数
    biPai:0,//最大多少轮可以比牌
    isPrivate:0,
    type:"zhajinhua",
    kindId:"106",
    isDaiKai:0,
    //开始初始房间数
    room_count: -1,
    seatCount: 4,
    qiangZhuangBeiShu:5,//最大强壮倍数
    coins:50000,
    robot_count:1,//房间机器人的数量
    robotWinPR:80,//机器人胜率
    playerWinPR:20,//玩家胜率
    bl:[1,2,4,10],
    //最低入场分数
    minScoreLimit: 8000000,
    //最高入场分数
    maxScoreLimit: 10000000000000000,
    choushuiRate:0.5,//房间抽水率(按照底注的50%抽水)
    READY_COUNTDOWN:10*1000,    //等待准备超时时间（10S）
    OPT_COUNTDOWN:10*1000,//操作超时时间 10s

    //金币场编号 左边 代表是否是特殊场 右边代表 场次
    serial_num : '4',
}