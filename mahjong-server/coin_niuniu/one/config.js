/**
 * 金币场房间管理(初级)
 */
exports.config = {
    
    jinbijiesuan: false,
   room_type:"50万",
    //是否金币场,客户端需要
    is_coins: true,
    is_special: false,//特殊玩法

    diZhu:20*10,
    maxGames:-1,//无限局数
    fengDing:10,
    
    isPrivate:0,
    type:"qiangzhuangniuniu",
    kindId:"105",
    robotCount:1,
    //开始初始房间数
    room_count: -1,
    seatCount: 4,
    qiangZhuangBeiShu:4,//最大强壮倍数
    coins:50000,
    //最低入场分数

    minScoreLimit: 500000,
    //最高入场分数
    maxScoreLimit: 100000000000,
    choushuiRate:0.5,//房间抽水率(按照底注的50%抽水)


    //金币场编号 左边 代表是否是特殊场 右边代表 场次
    serial_num : '2',
}