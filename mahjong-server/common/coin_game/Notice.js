module.exports = {
    ID: {
        UserIsGaming: 0,
        NotExistUser: 1,
        BeSortOfGoldCoins: 2,
        OverGoldCoins: 3,
        NoCoins: 4,
        GrantPropFailed: 5,
        NoProp: 6,
        GrantPropNoCoins: 7,
        CoinsClosed: 8,
    },
    MSG: [
    ],
}
let MSG = module.exports.MSG;
let ID = module.exports.ID;
MSG[ID.UserIsGaming] = "当前玩家正在游戏中。";
MSG[ID.NotExistUser] = "当前玩家ID不存在。";
MSG[ID.BeSortOfGoldCoins] = "金币不足，请充值或进入更低场次进行游戏。";
MSG[ID.OverGoldCoins] = "金币超出当前场次限制，请前往更高场次进行游戏。";
MSG[ID.NoCoins] = "金币已经输完，无法继续在该场次进行游戏。";
MSG[ID.GrantPropFailed] = "赠送道具失败。";
MSG[ID.NoProp] = "道具不存在";
MSG[ID.GrantPropNoCoins] = "金币不足，道具赠送失败";
MSG[ID.CoinsClosed] = "当前金币场已关闭";
