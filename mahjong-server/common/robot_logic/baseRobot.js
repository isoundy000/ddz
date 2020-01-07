/**
 * @author hyw
 * @date 2018/5/22 0022
 * @description: 虚拟的机器人socket
 */
var events = require('events');
var util = require('util');

function BaseRobot(robotMgr) {
    this.robotMgr = robotMgr;
    this.socket = new events.EventEmitter(this);
    /**
     * 出牌队列
     * @type {{}}
     */
    this.chupai_queue = {};


    /**
     * 下跑
     */
    this.socket.on("game_xiapao_begin_push", (data) => {

        console.log("接收到下跑指令=>game_xiapao_begin_push");

        var userId = data.receiver;
        this.robotMgr.doXiaPao(userId);
    });


    /**
     * 混牌通知
     */
    this.socket.on("game_hunpai_push", (data) => {
        var userId = data.receiver;
        //混牌
        var hun = data.data;

        console.log("接收到混牌通知=>game_hunpai_push：" + hun);

        this.robotMgr.noticeHunPai(userId, hun);
    });


    /**
     * 定缺通知
     */
    this.socket.on("game_robot_dingque", (data) => {
        var userId = data.receiver;
        //定缺的类型 0 筒 1 条 2 万
        var type = data.data;
        this.robotMgr.dingQue(userId, type);
    });



    /**
     * 获取手牌数据
     */
    this.socket.on("game_holds_push", (data) => {
        console.log("接收到获取手牌的指令");

        var userId = data.receiver;
        var holds = data.data;
        this.robotMgr.initHolds(userId, holds);
    });



    /**
     * 接收到出牌通知
     */
    this.socket.on("game_chupai_push", (data) => {

        //根据手牌，判断应出牌
        const chupai_user_id = data.data;
        if (chupai_user_id == null) {
            return
        }
        //消息是广播的，为了防止多次被处理
        if (data.receiver != chupai_user_id) {
            return;
        }

        console.log(chupai_user_id + "：接收到出牌的指令");

        var self = this;

        //延时出牌，防止有碰杠胡操作
        var chupaiAction = setTimeout(() => {
            self.robotMgr.chuPai(chupai_user_id);
        }, Math.floor(Math.random() * 2000 + 1000))
        this.chupai_queue[chupai_user_id] = chupaiAction;

    });

    /**
     * 接受是否可以碰杠胡的操作
     */
    this.socket.on("game_action_push", (data) => {


        //有那个动作可执行，直接执行
        const user_id = data.receiver;
        const actions = data.data;
        if (user_id == null || actions == null) {
            return;
        }

        // console.log(user_id + "：接收到碰杠胡的指令");
        // console.log(JSON.stringify(actions));
        //取消出牌的定时器
        var chupaiAction = this.chupai_queue[user_id];
        if (actions.hu || actions.peng || actions.gang) {
            // console.log(user_id + "：取消出牌指令");
            clearTimeout(chupaiAction);
        }



        //执行相应的动作
        setTimeout(() => {
            if (actions.hu == true) {
                this.robotMgr.doHu(user_id);
            }
            else if (actions.gang == true) {
                this.robotMgr.gang(user_id, actions.gangpai);
            }
            else if (actions.peng == true) {
                this.robotMgr.peng(user_id);
            }
        }, Math.floor(Math.random() * 500 + 800));
    });
    /**
     * 出牌成功
     */
    // this.socket.on("game_chupai_notify_push", (data) => {
    //     const chupai_data = data.data;
    //     if (chupai_data == null) {
    //         return;
    //     }

    //     const chupai_user_id = chupai_data.user_id;
    //     //消息是广播的，为了防止多次被处理
    //     if (data.receiver != chupai_user_id) {
    //         return;
    //     }
    //     const pai = chupai_data.pai;
    //     this.robotMgr.doChupai(chupai_user_id, pai);
    // });

    /**
     * 有玩家碰牌的情况（广播）
     */
    // this.socket.on("peng_notify_push", (data) => {
    //     //根据手牌，判断应出牌
    //     const peng_data = data.data;
    //     if (peng_data == null) {
    //         return;
    //     }

    //     const peng_user_id = peng_data.user_id;
    //     //消息是广播的，为了防止多次被处理
    //     if (data.receiver != peng_user_id) {
    //         return;
    //     }
    //     const pai = peng_data.pai;

    //     this.robotMgr.doPeng(peng_user_id, pai);
    // });

    /**
     * 有玩家杠牌的情况,
     */
    // this.socket.on("gang_notify_push", (data) => {
    //     const gang_data = data.data;
    //     if (gang_data == null) {
    //         return;
    //     }
    //     const gang_user_id = gang_data.user_id;
    //     //消息是广播的，为了防止多次被处理
    //     if (data.receiver != gang_user_id) {
    //         return;
    //     }
    //     const pai = gang_data.pai;
    //     this.robotMgr.doGang(gang_user_id, pai);
    // });

    /**
    * 游戏结束,
    */
    this.socket.on("game_over_push", (data) => {
        const receiver = data.receiver;
        this.robotMgr.gameOver(receiver);
    });

}
util.inherits(BaseRobot, events.EventEmitter);
module.exports = BaseRobot;