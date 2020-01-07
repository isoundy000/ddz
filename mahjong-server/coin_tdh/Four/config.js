/**
 * 金币场房间管理(初级)
 */
exports.config = {
    qiduijiabei: true,
    qingyisejiabei: true,
    gangshanghuajiabei: true,
    jinbijiesuan: false,
    fengpai: 1,
    hupai: 0,
    beishu: 1,
    qingyisejiabei: 0,//清一色加倍
    //是否金币场,客户端需要
    is_coins: true,
    is_special: false,//特殊玩法
    
    kind_id: '103',
    //游戏类型
    type: "tdhmj",
    
    //开始初始房间数
    room_count: 1,
    player_count: 4,
    //自动出牌几次进入托管
    trustee_times: 2,
    
    base_score: 10000,//底分
    //最低入场分数
    is_free: false,
    limit_mix_score: 200000,
    //最高入场分数
    limit_max_score: 2000000,

    //金币场编号 左边 代表是否是特殊场 右边代表 场次
    serial_num : '4',
}