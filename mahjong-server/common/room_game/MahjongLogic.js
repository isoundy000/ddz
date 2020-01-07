/**
 * 房间场game_mgr提取的公告部分
 * author：nt
 * data：2018.06.27
 */

// const UserMgr = require('../usermgr');
const GameMgr = require('../gamemgr');
module.exports = {
    /**出牌*/
    ACTION_CHUPAI: 1,
    /**摸牌*/
    ACTION_MOPAI: 2,
    /**碰*/
    ACTION_PENG: 3,
    /**杠*/
    ACTION_GANG: 4,
    /**胡*/
    ACTION_HU: 5,
    /**自摸*/
    ACTION_ZIMO: 6,
    /**混牌*/
    ACTION_HUN: 7,
    /**晒张*/
    ACTION_SHAIZHANG: 8,
    getMJType(id){
        if (id >= 0 && id < 9) {
            //筒
            return 0;
        }
        else if (id >= 9 && id < 18) {
            //条
            return 1;
        }
        else if (id >= 18 && id < 27) {
            //万
            return 2;
        }
    },
    /**
     * 洗牌
     * @param {*} game 
     */
    shuffle(mahjongs, is_daifeng) {
        // 万 (0 ~ 8 表示万
        var index = 0;
        for (var i = 0; i < 9; ++i) {
            for (var c = 0; c < 4; ++c) {
                mahjongs[index] = i;
                index++;
            }
        }

        //筒 9 ~ 17表示筒
        for (var i = 9; i < 18; ++i) {
            for (var c = 0; c < 4; ++c) {
                mahjongs[index] = i;
                index++;
            }
        }

        //条 18 ~ 26表示条
        for (var i = 18; i < 27; ++i) {
            for (var c = 0; c < 4; ++c) {
                mahjongs[index] = i;
                index++;
            }
        }
        //feng
        //27,28,29,30,31,32,33
        //东 南  西 北 中 发 白
        // == 0
        if (is_daifeng) {
            for (var i = 27; i < 34; ++i) {
                for (var c = 0; c < 4; ++c) {
                    mahjongs[index] = i;
                    index++;
                }
            }
        }

        for (var i = 0; i < mahjongs.length; ++i) {
            var lastIndex = mahjongs.length - 1 - i;
            var index = Math.floor(Math.random() * lastIndex);
            var t = mahjongs[index];
            mahjongs[index] = mahjongs[lastIndex];
            mahjongs[lastIndex] = t;
        }
    },
    /**
     * 摸牌
     * @param {*} game 房间场game对象
     * @param {*} seatIndex 
     */
    moPai(game, seatIndex) {
        if (game.currentIndex == game.mahjongs.length - game.liujucount) {
            return -1;
        }
        var data = game.gameSeats[seatIndex];
        var mahjongs = data.holds;

        var pai = game.mahjongs[game.currentIndex];
        mahjongs.push(pai);

        //统计牌的数目 ，用于查表法
        data.countMap[pai]++;
        game.currentIndex++;
        return pai;
    },
    /**
     * 发牌
     * @param {*} game 
     */
    deal(game) {
        //强制清0
        game.currentIndex = 0;

        //每人13张 一共 13*4 ＝ 52张 庄家多一张 53张
        var seatIndex = game.button;
        var player_count = game.roomInfo.conf.player_count
        for (var i = 0; i < 13 * player_count; ++i) {
            if (game.gameSeats[seatIndex].holds == null) {
                game.gameSeats[seatIndex].holds = [];
            }
            this.moPai(game, seatIndex);
            seatIndex++;
            seatIndex %= player_count;
        }

        //庄家多摸最后一张
        this.moPai(game, game.button);
        //当前轮设置为庄家
        game.turn = game.button;
    },
    /**
     * 生成混牌
     * @param {*} game 
     */
    genHun(game) {
        var mj = game.mahjongs[game.mahjongs.length - 14]
        var hun = mj + 1;
        if (mj == 8) {//9筒
            hun = 0;
        }
        else if (mj == 17) {//9条
            hun = 9;
        }
        else if (mj == 26) {//9万
            hun = 18;
        }
        else if (mj == 33) {//白
            hun = 27;
        }
        game.hun = hun;
    },
    /**
     * 检查是否可以碰
     * @param {*} game 
     * @param {*} seatData gameSeats[i]
     * @param {*} targetPai 能否碰的那张牌
     */
    checkCanPeng(game, seatData, targetPai) {
        var count = seatData.countMap[targetPai];
        if (count != null && count >= 2) {
            seatData.canPeng = true;
        }
    },
    /**
     * 检查是否可以点杠
     * @param {*} game 
     * @param {*} seatData 
     * @param {*} targetPai 
     */
    checkCanDianGang(game, seatData, targetPai) {
        //检查玩家手上的牌
        //如果没有牌了，则不能再杠
        if (game.mahjongs.length <= game.currentIndex) {
            return;
        }
        var count = seatData.countMap[targetPai];
        if (count != null && count >= 3) {
            seatData.canGang = true;
            seatData.gangPai.push(targetPai);
            return;
        }
    },
    /**
     * 检查是否可以暗杠
     * @param {*} game 
     * @param {*} seatData 
     */
    checkCanAnGang(game, seatData) {
        //如果没有牌了，则不能再杠
        if (game.mahjongs.length <= game.currentIndex) {
            return;
        }

        for (var key in seatData.countMap) {
            var pai = parseInt(key);

            var c = seatData.countMap[key];
            if (c != null && c == 4) {
                seatData.canGang = true;
                seatData.gangPai.push(pai);
            }

        }
    },
    /**
     * 检查是否可以弯杠(自己摸起来的时候)
     * @param {*} game 
     * @param {*} seatData 
     */
    checkCanWanGang(game, seatData) {
        //如果没有牌了，则不能再杠
        if (game.mahjongs.length <= game.currentIndex) {
            return;
        }

        //从碰过的牌中选
        for (var i = 0; i < seatData.pengs.length; ++i) {
            var pai = seatData.pengs[i];
            if (seatData.countMap[pai] == 1) {
                seatData.canGang = true;
                seatData.gangPai.push(pai);
            }
        }
    },
    /**
     * 是否已经听牌了
     * @param {*} seatData 
     */
    isTinged(seatData) {
        for (var k in seatData.tingMap) {
            return true;
        }
        return false;
    },
    /**
     * 记录玩家碰杠胡信息
     * @param {*} game 
     * @param {*} seatData 
     * @param {*} type 
     * @param {*} target 
     */
    recordUserAction(game, seatData, type, target) {
        var d = { type: type, targets: [] };
        if (target != null) {
            if (typeof (target) == 'number') {
                d.targets.push(target);
            }
            else {
                d.targets = target;
            }
        }
        else {
            for (var i = 0; i < game.gameSeats.length; ++i) {
                var s = game.gameSeats[i];
                if (i != seatData.seatIndex) {
                    d.targets.push(i);
                }
            }
        }
        seatData.actions.push(d);
        return d;
    },
    /**
     * 获取还剩余的牌
     * @param {*} seatData 
     * @param {*} mj_id 
     */
    getMJLeftCount(seatData, mj_id) {
        const gameSeats = seatData.game.gameSeats
        let count = 4;
        for (const key in gameSeats) {
            const seat = gameSeats[key];
            for (const idx in seat.angangs) {
                if (seat.angangs[idx] == mj_id) {
                    count -= 4;
                }
            }
            for (const idx in seat.wangangs) {
                if (seat.wangangs[idx] == mj_id) {
                    count -= 4;
                }
            }
            for (const idx in seat.diangangs) {
                if (seat.diangangs[idx] == mj_id) {
                    count -= 4;
                }
            }
            for (const idx in seat.pengs) {
                if (seat.pengs[idx] == mj_id) {
                    count -= 3;
                }
            }
            for (const idx in seat.folds) {
                if (seat.folds[idx] == mj_id) {
                    --count;
                }
            }
        }
        for (const idx in seatData.holds) {
            if (seatData.holds[idx] == mj_id) {
                --count;
            }
        }
        return count;
    },
    /**
     * 计算手牌张数
     * @param {*} count_map 
     */
    calMapCount(count_map) {
        var count = 0
        for (var i = 0; i < 34; ++i) {
            count += count_map[i];
        }
        return count;
    }
}