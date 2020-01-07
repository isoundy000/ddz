/**
 * @author hyw
 * @date 2018/5/25 0025
 * @description: 麻将机器人管理类
 */

var chuPaiStrategy = require("./chuPaiStrategy");

const MJ_CARDS = [
    "一万", "二万", "三万", "四万", "五万", "六万", "七万", "八万", "九万",
    "一筒", "二筒", "三筒", "四筒", "五筒", "六筒", "七筒", "八筒", "九筒",
    "一条", "二条", "三条", "四条", "五条", "六条", "七条", "八条", "九条",
    "东", "南", "西", "北", "中", "发", "白",
]

function printHolds(holds) {
    let _holds = holds.concat();
    _holds.sort((a, b) => {
        return a - b;
    });
    let str = "手牌："
    for (const key in _holds) {
        str += MJ_CARDS[_holds[key]] + ","
    }
    console.log(str);
}


function MjRobotMgr(gameMgr) {
    this.gameMgr = gameMgr;

    //数据结构{'userId':{holds:[],hun:0,que:1},'userId'}
    this.robot_holds = {};


    /**
     * 记录混牌
     */
    this.noticeHunPai = function (userId, hun) {
        if (this.robot_holds[userId] == null) {
            this.robot_holds[userId] = {}
        };
        // var mahjongs = this.robot_holds[userId] || {};
        this.robot_holds[userId].hun = hun;
    }

    /**
     * 定缺
     * @param userId
     * @param que
     */
    this.dingQue = function (userId, que) {
        if (this.robot_holds[userId] == null) {
            this.robot_holds[userId] = {}
        };
        // var mahjongs = this.robot_holds[userId] || {};;
        this.robot_holds[userId].que = que;
    }

    /**
     * 下跑
     * @param userId
     */
    this.doXiaPao = function (userId) {
        var xiapao = Math.floor(Math.random() * 4);
        this.gameMgr.xiaPao(userId, xiapao);
    }

    /**
     * 初始化手牌数据并保存
     */
    this.initHolds = function (userId, holds) {
        if (this.robot_holds[userId] == null) {
            this.robot_holds[userId] = {}
        };
        this.robot_holds[userId].holds = holds;
        console.log("机器人：" + userId + "获取手牌：");
        printHolds(holds);
        //this.robot_holds[userId] = mahjong//.concat();
    }



    /**
     * 出牌
     */
    this.chuPai = function (userid) {
        var mahjongs = this.robot_holds[userid];
        if (mahjongs && mahjongs.holds.length > 0) {
            // var robotMajongs = mahjongs.concat();
            bestPai = chuPaiStrategy.getBestPai(mahjongs);
            printHolds(mahjongs.holds)
            console.log("机器人：" + userid + "执行出牌" + MJ_CARDS[bestPai]);
            this.gameMgr.chuPai(userid, bestPai);
        }
    }

    /**
     * 出牌完成
     */
    // this.doChupai = function (userId, pai) {
    //     let mahjongs = this.robot_holds[userId];
    //     if (mahjongs == null) {
    //         return
    //     }
    //     console.log("机器人：" + userId + "出牌了" + MJ_CARDS[pai]);
    //     let index = mahjongs.holds.indexOf(pai);
    //     if (index == -1) {
    //         console.log("can't find mj chupai.");
    //         return;
    //     }
    //     mahjongs.holds.splice(index, 1);
    // }


    /**
     * 碰牌
     * @param data
     */
    this.peng = function (userId) {
        console.log("机器人：" + userId + "执行碰牌操作");
        this.gameMgr.peng(userId);
    }

    /**
     * 杠牌
     */
    this.gang = function (userId, gangpais) {
        // let count_map = {

        // }
        // let holds = this.robot_holds[userId].holds;
        // let pai = null;
        // for (let i = 0; i < holds.length - 1; ++i) {
        //     count_map[holds[i]] = count_map[holds[i]] || 0;
        //     ++count_map[holds[i]];
        //     if (count_map[holds[i]] == 4) {
        //         pai = holds[i];
        //         break;
        //     }
        // }
        // if (pai != null) {
        console.log("机器人：" + userId + "执行杠牌操作" + MJ_CARDS[gangpais[0]]);
        this.gameMgr.gang(userId, gangpais[0]);
        // }
    }

    /*
     * 胡牌
     * @param userId
     */
    this.doHu = function (userId) {
        console.log("机器人：" + userId + "执行胡牌操作");
        this.gameMgr.hu(userId);
    }

    /**
     * 游戏结束
     * @param data
     */
    this.gameOver = function (data) {

    }

}

module.exports = MjRobotMgr;