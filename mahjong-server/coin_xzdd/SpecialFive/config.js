/**
 * 金币场房间管理
 */
exports.config = {

    jiangdui: true,//将对
    menqing: true,//门清
    tiandihu: true,//天地胡
    zimo: 1,//自摸加倍
    dianganghua: 0,//点炮胡  

    player_count: 4,
    //是否金币场,客户端需要
    is_coins: true,
    //开始初始房间数
    room_count: 1,
    //自动出牌几次进入托管
    trustee_times: 2,
    //游戏类型
    type: "xzdd",
    kind_id: "101",

    is_free: false,
    base_score: 200000,//低分
    //最低入场分数
    limit_mix_score: 4000000,
    //最高入场分数
    limit_max_score: 0xfffffffff,
   
    hsz: true,//换三张
    is_special: true,

    //金币场编号 左边 代表是否是特殊场 右边代表 场次
    serial_num : '5',
}