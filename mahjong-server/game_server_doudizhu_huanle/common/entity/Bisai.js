// 玩家状态
function Bisai(matchId,matchConfig) {
    //所在房间
    this.roomId = matchId;
    this.usersNum = matchConfig.userNum
    this.type = matchConfig.type
    this.level = 0
    this.jushu = 0
    this.diZhu = matchConfig.diZhu
    this.users = []

}