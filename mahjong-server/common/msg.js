//G2H子游戏到大厅的消息
//H2G大厅到子游戏的消息协议
module.exports = {
    /**金币场到大厅：心跳*/
    G2H_Heart: 0,
    /**大厅到金币场：心跳*/
    H2G_Heart: 1,
    /**金币场向大厅：注册服务*/
    G2H_Register: 2,
    /**大厅到金币场：注册服务*/
    H2G_Register: 3,
    /**金币场向大厅：玩家进入金币场*/
    G2H_UserEnterGame: 4,
    /**大厅到金币场：玩家进入金币场*/
    H2G_UserEnterGame: 5,

    /**金币场向大厅：玩家开始金币场游戏*/
    G2H_UserGameStart: 6,

    /**金币场向大厅：玩家结束金币场游戏*/
    G2H_UserGameFinish: 8,

    /**金币场向大厅：更新金币到大厅*/
    G2H_UserUpdateCoins: 10,
    /**大厅到金币场：更新金币到金币场*/
    H2G_UserUpdateCoins: 11,

    /**金币场向大厅：玩家从游戏离开金币场*/
    G2H_UserExitGame: 12,

    /**大厅到金币场：修改金币场的机器人胜率*/
    H2G_SetDifficultyDegree: 13,
    /**大厅到金币场：更新config配置*/
    H2G_UpdateCoinsConfig: 15,
    /**大厅到金币场：更新玩家点控*/
    H2G_UpdateCtrlRatio: 17,

    //向大厅发送游戏用户信息
    G2H_UpUserInfo: 18,
    H2G_UpUserInfo: 19,
}