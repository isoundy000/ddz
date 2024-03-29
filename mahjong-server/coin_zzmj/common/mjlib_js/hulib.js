"use strict";

var MTableMgr = require('./table_mgr.js');

const MAX_CARD = 34;
// var ProbabilityItem = { };
var ProbabilityItemTable = {};

function _init() {
    //需要初始化多个对象
    ProbabilityItemTable = { array_num: 0, m_num: [0, 0, 0, 0], m: [] };
    for (var i = 0; i < 4; i++) {
        ProbabilityItemTable.m[i] = [];
        for (var j = 0; j < 5; j++) {
            var ProbabilityItem = { eye: false, gui_num: 0 };
            ProbabilityItemTable.m[i].push(ProbabilityItem);
        }
    }
}
//初始化牌型
_init();

var HuLib = module.exports;

// HuLib.gui_index1 = 31;
// HuLib.gui_index2 = 32;

// HuLib.init = function()
// {
//     //初始化数据
//     this.gui_index1 = 31;
//     this.gui_index2 = 32;
//     _init();
// };

HuLib.get_hu_info = function (cards, cur_card, gui_1, gui_2) {
    _init();

    //返回当前数组的副本
    var tmp_cards = cards.concat();
    if (cur_card != null && cur_card != MAX_CARD) {
        tmp_cards[cur_card] += 1;
    }

    //两张鬼牌的索引
    var gui_index1 = gui_1;
    var gui_index2 = gui_2;

    var gui_num = 0;
    if (gui_index1 != null && gui_index1 != MAX_CARD) {
        if (cur_card == gui_index1) {
            gui_num += (tmp_cards[gui_index1] - 1);
            tmp_cards[gui_index1] = 1;
        }
        else {
            gui_num += tmp_cards[gui_index1];
            tmp_cards[gui_index1] = 0;
        }
    }

    if (gui_index2 != null && gui_index2 != MAX_CARD) {
        if (cur_card == gui_index1) {
            gui_num += (parseInt(tmp_cards[gui_index2]) - 1);
            tmp_cards[gui_index2] = 1;
        }
        else {
            gui_num += parseInt(tmp_cards[gui_index2]);
            tmp_cards[gui_index2] = 0;
        }
    }

    if (!this._split(tmp_cards, gui_num, ProbabilityItemTable)) {

        return false;
    }


    return this.check_probability(ProbabilityItemTable, gui_num);
};

HuLib.check_7dui = function (cards, gui_num) {
    var need = 0;
    for (var i = 0; i < 34; i++) {
        if (cards[i] % 2 != 0) {
            need += 1;
        }
    }
    return need > gui_num ? false : true;
};

HuLib.check_probability = function (ptbl, gui_num) {
    // 全是鬼牌
    if (ptbl.array_num == 0) {
        return gui_num >= 2;
    }
    // 只有一种花色的牌的鬼牌
    if (ptbl.array_num == 1) {
        return true;
    }
    // 尝试组合花色，能组合则胡
    for (var i = 0; i < ptbl.m_num[0]; i++) {
        var item = ptbl.m[0][i];
        var eye = item.eye;
        var gui = gui_num - item.gui_num;

        if (this.check_probability_sub(ptbl, eye, gui, 1, ptbl.array_num)) {

            return true;
        }
    }

    return false;
};

HuLib.check_probability_sub = function (ptbl, eye, gui_num, level, max_level) {
    for (var i = 0; i < ptbl.m_num[level]; i++) {
        var item = ptbl.m[level][i];
        if (eye && item.eye) {
            continue;
        }
        if (gui_num < item.gui_num) {
            continue;
        }
        if (level < max_level - 1) {
            if (this.check_probability_sub(ptbl, eye || item.eye, gui_num - item.gui_num, level + 1, ptbl.array_num)) {
                return true;
            }
            continue;
        }
        if (!eye && !item.eye && item.gui_num + 2 > gui_num) {
            continue;
        }
        return true;
    }

    return false;
};

HuLib._split = function (cards, gui_num, ptbl) {

    if (!this._split_color(cards, gui_num, 0, 0, 8, true, ptbl)) {
        return false;
    }
    if (!this._split_color(cards, gui_num, 1, 9, 17, true, ptbl)) {
        return false;
    }
    if (!this._split_color(cards, gui_num, 2, 18, 26, true, ptbl)) {
        return false;
    }
    if (!this._split_color(cards, gui_num, 3, 27, 33, false, ptbl)) {
        return false;
    }
    return true;
}

HuLib._split_color = function (cards, gui_num, color, min, max, chi, ptbl) {

    var key = 0;
    var num = 0;
    for (var i = min; i <= max; i++) {
        key = key * 10 + cards[i];
        num = num + cards[i];
    }
    if (num === 0) {
        return true;
    }
    if (!this.list_probability(color, gui_num, num, key, chi, ptbl)) {
        return false;
    }
    return true;
};

HuLib.list_probability = function (color, gui_num, num, key, chi, ptbl) {
    var find = false
    var anum = ptbl.array_num;

    for (var i = 0; i <= gui_num; i++) {
        var eye = false;
        var yu = (num + i) % 3;
        if (yu == 1) {
            continue;
        }
        else if (yu == 2) {
            eye = true;
        }
        if (find || MTableMgr.check(key, i, eye, chi)) {
            var item = ptbl.m[anum][ptbl.m_num[anum]];
            ptbl.m_num[anum]++;
            item.eye = eye;
            item.gui_num = i;
            find = true
        }
    }


    if (ptbl.m_num[anum] <= 0) {
        return false;
    }

    ptbl.array_num++;


    return true;
};
