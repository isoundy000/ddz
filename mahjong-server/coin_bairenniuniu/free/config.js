/**
 * 金币场房间管理(初级)
 */
exports.config = {
    
    jinbijiesuan: false,
   room_type:"sibei",
    //是否金币场,客户端需要
    is_coins: true,
    is_special: false,//特殊玩法

    beishu:4,
    maxGames:-1,//无限局数
    fengDing:10,
    
    isPrivate:0,
    type:"bairenniuniu",
    kindId:"107",
    robotCount:1,
    //开始初始房间数
    room_count: -1,
    seatCount: 1000000,
    qiangZhuangBeiShu:5,//最大强壮倍数

    //最低入场分数

    minScore: 200000,
    //最高入场分数
    maxScore: 10000000,
    choushuiRate:0.05,//房间抽水率(按照底注的50%抽水)

    diZhu:20*4,
    //金币场编号 左边 代表是否是特殊场 右边代表 场次
    serial_num : '1',
}