/**
 * 金币场房间管理
 */
exports.config = {

    // jiangdui: true,//将对
    // hsz: true,//换三张
    // menqing: true,//门清
    // tiandihu: true,//天地胡
    // zimo: 0,//自摸加底
    // dianganghua: 0,//点炮胡  
    hunpai: 0,//0带混，1不带混
    fengpai: 1,//0带风，1不带风
    xiapao: 0,//0下跑，1不下跑
    hupai: 0,//0点炮胡，1自模糊
    gangpao: false,
    zhuangjiajiadi: false,
    qiduijiabei: false,
    gangshanghuajiabei: false,

    player_count: 4,
    //是否金币场,客户端需要
    is_coins: true,
    //开始初始房间数
    room_count: 1,
    //自动出牌几次进入托管
    trustee_times: 2,
    //游戏类型
    type: "zzmj",
    kind_id: "104",

    is_free: true,
    base_score: 100,//低分
    //最低入场分数
    limit_mix_score: 0,
    //最高入场分数
    limit_max_score: 0,
    //下跑为true，不下跑为fasle
    is_special: true,

    //金币场编号 左边 代表是否是特殊场 右边代表 场次
    serial_num: '0',
}