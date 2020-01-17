let address = require("address")
var HALL_IP = address.ip() || "0.0.0.0";
// var HALL_IP = "47.52.107.254";
var HALL_CLIENT_PORT = 18003;
var HALL_ROOM_PORT = 18004;
var COIN_SERVER_PORT = 20000;

var ACCOUNT_PRI_KEY = "S&*#$%()X";
var ROOM_PRI_KEY = "S!@#$(*&^%$X";

var LOCAL_IP = '127.0.0.1';

// //  正式环境数据库
exports.mysql = function () {
    return {
        HOST: '127.0.0.1',
        USER: 'root',
        PSWD: 'root',
        DB: 'doudizhu',
        PORT: 3306,
    }
}
// 线下环境数据库
// exports.mysql = function () {
//     return {
//         HOST: '192.168.1.142',
//         USER: 'root',
//         PSWD: 'root',
//         DB: 'laosiji',
//         PORT: 3306,
//     }
// }

//账号服配置
exports.account_server = function () {
    return {
        CLIENT_PORT: 19002,
        HALL_IP: HALL_IP,
        HALL_CLIENT_PORT: HALL_CLIENT_PORT,
        ACCOUNT_PRI_KEY: ACCOUNT_PRI_KEY,
        CLIENT_PORT2: 19003,
        //
        DEALDER_API_IP: LOCAL_IP,
        DEALDER_API_PORT: 22583,
        VERSION: '20161227',
        APP_WEB: 'http://download.6u3w5.cn/spread',
    };
};
//静态服务
exports.static_server = function () {
    return {
        HALL_IP: HALL_IP,
        CLEINT_PORT: 54321,

    };
};
//大厅服配置
exports.hall_server = function () {
    return {
        HALL_IP: HALL_IP,
        CLEINT_PORT: HALL_CLIENT_PORT,
        FOR_ROOM_IP: LOCAL_IP,
        ROOM_PORT: HALL_ROOM_PORT,
        ACCOUNT_PRI_KEY: ACCOUNT_PRI_KEY,
        ROOM_PRI_KEY: ROOM_PRI_KEY,
        COIN_SERVER_PORT: COIN_SERVER_PORT,
    };
};

//游戏服配置
exports.game_server_scmj = function () {
    return {
        SERVER_ID: "001",
        KIND_ID: "001",//四川麻将
        //暴露给大厅服的HTTP端口号
        HTTP_PORT: 19003,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        FOR_HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: HALL_ROOM_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 10003,
    };
};
//游戏服配置1
exports.game_server_zzmj = function () {
    return {
        SERVER_ID: "002",
        KIND_ID: "002",//郑州麻将
        //暴露给大厅服的HTTP端口号
        HTTP_PORT: 19004,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        FOR_HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: HALL_ROOM_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 10001,
    };
};
//游戏服配置
exports.game_server_hjmj = function () {
    return {
        SERVER_ID: "003",
        KIND_ID: "003",//霍家麻将
        //暴露给大厅服的HTTP端口号
        HTTP_PORT: 19005,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        FOR_HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: HALL_ROOM_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 10002,
    };
};
//游戏服配置
exports.game_server_tdhmj = function () {
    return {
        SERVER_ID: "004",
        KIND_ID: "004",//推倒胡麻将
        //暴露给大厅服的HTTP端口号
        HTTP_PORT: 19009,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        FOR_HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: HALL_ROOM_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 10008,
    };
};
//游戏服配置
exports.game_server_hzlmj = function () {
    return {
        SERVER_ID: "005",
        KIND_ID: "005",//推倒胡麻将
        //暴露给大厅服的HTTP端口号
        HTTP_PORT: 19010,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        FOR_HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: HALL_ROOM_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 10010,
    };
};
//游戏服配置
exports.game_server_hxmj = function () {
    return {
        SERVER_ID: "006",
        KIND_ID: "006",//推倒胡麻将
        //暴露给大厅服的HTTP端口号
        HTTP_PORT: 19011,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        FOR_HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: HALL_ROOM_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 10011,
    };
};
exports.coinXZDD = function () {
    return {
        SERVER_ID: "101",
        KIND_ID: "101",//四川麻将金币场
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: COIN_SERVER_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: null,
        LOCAL_COIN_PORT: null,
        CLIENT_PORT_HSZ_One: 21001,
        LOCAL_COIN_PORT_HSZ_One: 21002,
        CLIENT_PORT_HSZ_Tow: 21003,
        LOCAL_COIN_PORT_HSZ_Tow: 21004,
        CLIENT_PORT_HSZ_Three: 21005,
        LOCAL_COIN_PORT_HSZ_Three: 21006,
        CLIENT_PORT_HSZ_Four: 21007,
        LOCAL_COIN_PORT_HSZ_Four: 21008,
        CLIENT_PORT_HSZ_Five: 21009,
        LOCAL_COIN_PORT_HSZ_Five: 21010,
        CLIENT_PORT_HSZ_Six: 21011,
        LOCAL_COIN_PORT_HSZ_Six: 21012,
        CLIENT_PORT_One: 21013,
        LOCAL_COIN_PORT_One: 21014,
        CLIENT_PORT_Tow: 21015,
        LOCAL_COIN_PORT_Tow: 21016,
        CLIENT_PORT_Three: 21017,
        LOCAL_COIN_PORT_Three: 21018,
        CLIENT_PORT_Four: 21019,
        LOCAL_COIN_PORT_Four: 21020,
        CLIENT_PORT_Five: 21021,
        LOCAL_COIN_PORT_Five: 21022,
        CLIENT_PORT_Six: 21023,
        LOCAL_COIN_PORT_Six: 21024,
        CLIENT_PORT_FREE: 21025,
        LOCAL_COIN_PORT_FREE: 21026,
    };
};
exports.coinXLCH = function () {
    return {
        SERVER_ID: "102",
        KIND_ID: "102",//四川麻将金币场
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: COIN_SERVER_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        //暴露给客户端的端口
        CLIENT_PORT: 22001,
        //链接大厅服务器的接口
        LOCAL_COIN_PORT: 22002,
        CLIENT_PORT_HSZ_One: 22001,
        LOCAL_COIN_PORT_HSZ_One: 22002,
        CLIENT_PORT_HSZ_Tow: 22003,
        LOCAL_COIN_PORT_HSZ_Tow: 22004,
        CLIENT_PORT_HSZ_Three: 22005,
        LOCAL_COIN_PORT_HSZ_Three: 22006,
        CLIENT_PORT_HSZ_Four: 22007,
        LOCAL_COIN_PORT_HSZ_Four: 22008,
        CLIENT_PORT_HSZ_Five: 22009,
        LOCAL_COIN_PORT_HSZ_Five: 22010,
        CLIENT_PORT_HSZ_Six: 22011,
        LOCAL_COIN_PORT_HSZ_Six: 22012,
        CLIENT_PORT_One: 22013,
        LOCAL_COIN_PORT_One: 22014,
        CLIENT_PORT_Tow: 22015,
        LOCAL_COIN_PORT_Tow: 22016,
        CLIENT_PORT_Three: 22017,
        LOCAL_COIN_PORT_Three: 22018,
        CLIENT_PORT_Four: 22019,
        LOCAL_COIN_PORT_Four: 22020,
        CLIENT_PORT_Five: 22021,
        LOCAL_COIN_PORT_Five: 22022,
        CLIENT_PORT_Six: 22023,
        LOCAL_COIN_PORT_Six: 22024,
        CLIENT_PORT_FREE: 22025,
        LOCAL_COIN_PORT_FREE: 22026,
    };
};
exports.coinTDH = function () {
    return {
        SERVER_ID: "103",
        KIND_ID: "103",//推倒胡麻将金币场
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: COIN_SERVER_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 23001,
        LOCAL_COIN_PORT: 23002,
        CLIENT_PORT_One: 23003,
        LOCAL_COIN_PORT_One: 23004,
        CLIENT_PORT_Tow: 23005,
        LOCAL_COIN_PORT_Tow: 23006,
        CLIENT_PORT_Three: 23007,
        LOCAL_COIN_PORT_Three: 23008,
        CLIENT_PORT_Four: 23009,
        LOCAL_COIN_PORT_Four: 23010,
        CLIENT_PORT_Five: 23011,
        LOCAL_COIN_PORT_Five: 23012,
        CLIENT_PORT_Six: 23013,
        LOCAL_COIN_PORT_Six: 23014,
        CLIENT_PORT_FREE: 23015,
        LOCAL_COIN_PORT_FREE: 23016,
    };
};
exports.coinZZMJ = function () {
    return {
        SERVER_ID: "104",
        KIND_ID: "104",//郑州麻将金币场
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: COIN_SERVER_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 24001,
        LOCAL_COIN_PORT: 24002,
        CLIENT_PORT_XP_One: 24001,
        LOCAL_COIN_PORT_XP_One: 24002,
        CLIENT_PORT_XP_Tow: 24003,
        LOCAL_COIN_PORT_XP_Tow: 24004,
        CLIENT_PORT_XP_Three: 24005,
        LOCAL_COIN_PORT_XP_Three: 24006,
        CLIENT_PORT_XP_Four: 24007,
        LOCAL_COIN_PORT_XP_Four: 24008,
        CLIENT_PORT_XP_Five: 24009,
        LOCAL_COIN_PORT_XP_Five: 24010,
        CLIENT_PORT_XP_Six: 24011,
        LOCAL_COIN_PORT_XP_Six: 24012,
        CLIENT_PORT_FREE: 24025,
        LOCAL_COIN_PORT_FREE: 24026,
    };
};
exports.coinNIUNIU = function () {
    return {
        SERVER_ID: "105",
        KIND_ID: "105",//抢庄牛牛金币场
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: COIN_SERVER_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,
        HTTP_PORT: 25017,
        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 25001,
        LOCAL_COIN_PORT: 25002,
        CLIENT_PORT_One: 25003,
        LOCAL_COIN_PORT_One: 25004,
        CLIENT_PORT_Tow: 25005,
        LOCAL_COIN_PORT_Tow: 25006,
        CLIENT_PORT_Three: 25007,
        LOCAL_COIN_PORT_Three: 25008,
        CLIENT_PORT_Four: 25009,
        LOCAL_COIN_PORT_Four: 25010,
        CLIENT_PORT_Five: 25011,
        LOCAL_COIN_PORT_Five: 25012,
        CLIENT_PORT_Six: 25013,
        LOCAL_COIN_PORT_Six: 25014,
        CLIENT_PORT_FREE: 25015,
        LOCAL_COIN_PORT_FREE: 25016,
    }
};


exports.coinDoudizhu = function () {
    return {
        SERVER_ID: "106",
        KIND_ID: "106",//炸金花金币场
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: COIN_SERVER_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 26001,
        LOCAL_COIN_PORT: 26002,
        CLIENT_PORT_XP_One: 26001,
        LOCAL_COIN_PORT_XP_One: 26002,
        CLIENT_PORT_XP_Tow: 26003,
        LOCAL_COIN_PORT_XP_Tow: 26004,
        CLIENT_PORT_XP_Three: 26005,
        LOCAL_COIN_PORT_XP_Three: 26006,
        CLIENT_PORT_XP_Four: 26007,
        LOCAL_COIN_PORT_XP_Four: 26008,
        CLIENT_PORT_XP_Five: 26009,
        LOCAL_COIN_PORT_XP_Five: 26010,
        CLIENT_PORT_XP_Six: 26011,
        LOCAL_COIN_PORT_XP_Six: 26012,
        CLIENT_PORT_FREE: 26025,
        LOCAL_COIN_PORT_FREE: 26026,
    };
};

exports.coinTTZ = function () {
    return {
        SERVER_ID: "107",
        KIND_ID: "107",//抢庄牛牛金币场
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: COIN_SERVER_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 27001,
        LOCAL_COIN_PORT: 27002,
        CLIENT_PORT_One: 27003,
        LOCAL_COIN_PORT_One: 27004,
        CLIENT_PORT_Tow: 27005,
        LOCAL_COIN_PORT_Tow: 27006,
        CLIENT_PORT_Three: 27007,
        LOCAL_COIN_PORT_Three: 27008,
        CLIENT_PORT_Four: 27009,
        LOCAL_COIN_PORT_Four: 27010,
        CLIENT_PORT_Five: 27011,
        LOCAL_COIN_PORT_Five: 27012,
        CLIENT_PORT_Six: 27013,
        LOCAL_COIN_PORT_Six: 27014,
        CLIENT_PORT_FREE: 27015,
        LOCAL_COIN_PORT_FREE: 27016,
    }
};
exports.coinBRNN = function () {
    return {
        SERVER_ID: "108",
        KIND_ID: "108",//抢庄牛牛金币场
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: COIN_SERVER_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 28001,
        LOCAL_COIN_PORT: 28002,
        CLIENT_PORT_One: 28003,
        LOCAL_COIN_PORT_One: 28004,
        CLIENT_PORT_Tow: 28005,
        LOCAL_COIN_PORT_Tow: 28006,
        CLIENT_PORT_Three: 28007,
        LOCAL_COIN_PORT_Three: 28008,
        CLIENT_PORT_Four: 28009,
        LOCAL_COIN_PORT_Four: 28010,
        CLIENT_PORT_Five: 28011,
        LOCAL_COIN_PORT_Five: 28012,
        CLIENT_PORT_Six: 28013,
        LOCAL_COIN_PORT_Six: 28014,
        CLIENT_PORT_FREE: 28015,
        LOCAL_COIN_PORT_FREE: 28016,
    }
};
//斗地主
exports.game_server_doudizhu = function () {
    return {
        SERVER_ID: "007",
        KIND_ID: "007",//推倒斗地主
        //暴露给大厅服的HTTP端口号
        HTTP_PORT: 19012,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        FOR_HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: HALL_ROOM_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 10012,
    };
};

/**
 * 炸金花服务器配置
 * @type {{}}
 */
exports.game_server_zhajinhua = {
    SERVER_ID: "008",
    KIND_ID: "008",//推倒斗地主
    //暴露给大厅服的HTTP端口号
    HTTP_PORT: 19013,
    //HTTP TICK的间隔时间，用于向大厅服汇报情况
    HTTP_TICK_TIME: 5000,
    //大厅服IP
    HALL_IP: LOCAL_IP,
    FOR_HALL_IP: LOCAL_IP,
    //大厅服端口
    HALL_PORT: HALL_ROOM_PORT,
    //与大厅服协商好的通信加密KEY
    ROOM_PRI_KEY: ROOM_PRI_KEY,

    //暴露给客户端的接口
    CLIENT_IP: HALL_IP,
    CLIENT_PORT: 10013,
}


/**
 * 牛牛服务器配置
 * @type {{}}
 */
exports.game_server_niuniu = {
    SERVER_ID: "009",
    KIND_ID: "009",
    //暴露给大厅服的HTTP端口号
    HTTP_PORT: 19041,
    //HTTP TICK的间隔时间，用于向大厅服汇报情况
    HTTP_TICK_TIME: 5000,
    //大厅服IP
    HALL_IP: LOCAL_IP,
    FOR_HALL_IP: LOCAL_IP,
    //大厅服端口
    HALL_PORT: HALL_ROOM_PORT,
    //与大厅服协商好的通信加密KEY
    ROOM_PRI_KEY: ROOM_PRI_KEY,

    //暴露给客户端的接口
    CLIENT_IP: HALL_IP,
    CLIENT_PORT: 10041,
}


/**
 * 闲逸牛牛服务器配置
 * @type {{}}
 */
exports.game_server_xynn = {
    SERVER_ID: "010",
    KIND_ID: "010",
    //暴露给大厅服的HTTP端口号
    HTTP_PORT: 19015,
    //HTTP TICK的间隔时间，用于向大厅服汇报情况
    HTTP_TICK_TIME: 5000,
    //大厅服IP
    HALL_IP: LOCAL_IP,
    FOR_HALL_IP: LOCAL_IP,
    //大厅服端口
    HALL_PORT: HALL_ROOM_PORT,
    //与大厅服协商好的通信加密KEY
    ROOM_PRI_KEY: ROOM_PRI_KEY,

    //暴露给客户端的接口
    CLIENT_IP: HALL_IP,
    CLIENT_PORT: 10015,
}


/**
 * 百人牛牛服务器配置
 * @type {{}}
 */
exports.game_server_bairenniuniu = {
    SERVER_ID: "011",
    KIND_ID: "011",
    //暴露给大厅服的HTTP端口号
    HTTP_PORT: 19016,
    //HTTP TICK的间隔时间，用于向大厅服汇报情况
    HTTP_TICK_TIME: 5000,
    //大厅服IP
    HALL_IP: LOCAL_IP,
    FOR_HALL_IP: LOCAL_IP,
    //大厅服端口
    HALL_PORT: HALL_ROOM_PORT,
    //与大厅服协商好的通信加密KEY
    ROOM_PRI_KEY: ROOM_PRI_KEY,

    //暴露给客户端的接口
    CLIENT_IP: HALL_IP,
    CLIENT_PORT: 10016,
}

//推筒子服务器配置
exports.game_server = function () {
    return {
        SERVER_ID: "012",

        //暴露给大厅服的HTTP端口号
        HTTP_PORT: 19017,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        FOR_HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: HALL_ROOM_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 10017,
    };
};


//推饼游戏服配置
exports.game_server_tb = function () {
    return {
        SERVER_ID: "201",
        KIND_ID: "201", // 推饼
        //暴露给大厅服的HTTP端口号
        HTTP_PORT: 19023,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        FOR_HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: HALL_ROOM_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 30001,
    };
};



// 推饼大厅版(万人场)
exports.game_server_tb_melee = function () {
    return {
        SERVER_ID: "202",
        KIND_ID: "202", // 推饼万人场
        //暴露给大厅服的HTTP端口号
        HTTP_PORT: 19024,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: LOCAL_IP,
        FOR_HALL_IP: LOCAL_IP,
        //大厅服端口
        HALL_PORT: HALL_ROOM_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP: HALL_IP,
        CLIENT_PORT: 30002,
    };
};




/**
 * 微信支付配置
 * @type {{}}
 */
exports.wechat_pay = {
    APP_ID: "wx20f99e5365cae8ab",
    APP_KEY: "14637449a2e1bfe9736ec8227118e23c",
    MCH_ID: "1512155981",
    NOTIFY_URL: "http://" + HALL_IP + ":" + HALL_CLIENT_PORT + "/webhooks"
}

/**
 * 支付宝支付配置
 * @type {{}}
 */
exports.ali_pay = {
    APP_ID: '',
    PARTNER_ID: '',
    APP_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\r\n' +
        'MIIEpAIBAAKCAQEAtzsHL8hpwQg9RV4h5EEqdWw9BJ70urjFY0+pRI8M5vQumqz1' +
        '75r5rkl1KL2SMoPaiCLW00/Aq/6iMiaa+hYQ0ZGnN7avqnzJ0sKm7wFdxnkPoJg7' +
        'yOK0H9siL4fjAAXV52Klb5pm1zAadLP+QVnTXgGILy4XPgz5oIQq+DU6WfnIgoOy' +
        'DN2bZOfLXUNV5qj+4mpjvx4S+iTkKSeIDoaJfs7fGiPDWjFUQlZdTIDrlZLGwEf+' +
        'kd1RCkpAeTOsmWhbXgQ1zuw+ODJVWPQleimA7r+S64Ql5qcJhUQxUCLXeGKmb0Ms' +
        'WRKdBD6Vh1Anvgch98ifjAXH1yMZv3s23Hu1pwIDAQABAoIBAElA7yGaVTVYLu7B' +
        'sHkJ2Iizaj2jsyHHZxrKKVkAe98FtnAeQAC4C6QzOAS+rWlGr6KHky1OEDBzD7NP' +
        'Hdxn3/d47MpoXhih5So+qfCZsjz7/1RsKFKq1+p4eFVaVVWX/6mPFablqsHTOHB5' +
        '2WeVGtzVbfW2zpH/K/mRfYBX/2kituN/k4ZU+y7HVqhG8SboSlGfjDLsWIOuk5RB' +
        'jPhyfZJuISB8tjMa2ZcLGm1aZi/ZLqb+QtfJhF5VSarmOGZM6/Az0NQAXgYu6DaU' +
        'ZxRPRw5twmrbpprhQN2UAH+jdj1pZKTigWWqgl7QWBfQHM3Zeh9wE4SPa5MZuuZ4' +
        'TJuYFBECgYEA6jCqdeeh2B1kYBqF5qov57SmTL5obywZQz+QaQQ6HlWhbaM2yLEV' +
        '1u3r0w/zQEkmqlf1nH3hMgFViH1x859STsS348xUaerrc0HpVqQJ3QfBhI6IjwyV' +
        'CI9Gf2yIYQFFGOI3x6GvnhOvWfvt6YI1rXRZgAP/1Pijga/Fo0fpIzkCgYEAyEtv' +
        'O7doIExJPY64YQB8opO5RAfsuOs9OL/g1p7Ts9DiIreUV9hCiTO8h8oXoABTOuZf' +
        'mDdy3K8l02hgt4kYddFBwg02OvdVzw1Vf3Z0up8zHzEkLoGWx3jjp8ouPBtLdGsP' +
        'ko708HJa7m7mgH+VnsCso7E5/tfDc3Bqu5eTP98CgYAMRWSJLQvz8QZTatBdV8mO' +
        '0I5uMwPx31OrjGcauZf6Au6kegri1TSZwHm843cRhUO7ZUR/YLEuF5fNwRT5eP2t' +
        'Fu2zx/8cVazkqy141ruVk1R2h6lsJXKhsjA1eRBkVNa0CRZ3JWe4Vru3cVX0CFib' +
        'sB8IcC01kZmvr/AhMCFtMQKBgQCnqqYBukV7DAEfe7KS2QJ8YebrsSqTnbBRKiZ/' +
        '4tLbKteyMjUG2CzSh7GhhiYCtWL24lRRqtEHNcMXVr/nw+bq8XH3jHHCKLv3KHVS' +
        'zwlmE9CKoutj1u0uK99+3PuZK0wdt2WAzRTzlvbRs5pXJPZNv4KFQN2InHurzgY6' +
        '5ObJxwKBgQC8GcHs0zzKJH2gx9HCwNhDA7PY6q2DyKww8sXFjXc/lTMQBnkwoafc' +
        'cnhuii5Vc71ZzTuKJ0DLBEjZwM2i/yX3ZNhUNu1wM3dD0s0g/emHIvbujKj6x7Kq' +
        '5tjJO+yKiR4f7p2edrUkq2029rg0vAPZctrR3ARhDYZz2xWjgOqebw==' +
        '\r\n-----END RSA PRIVATE KEY-----',
    RSA_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\r\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtzsHL8hpwQg9RV4h5EEqdWw9BJ70urjFY0+pRI8M5vQumqz175r5rkl1KL2SMoPaiCLW00/Aq/6iMiaa+hYQ0ZGnN7avqnzJ0sKm7wFdxnkPoJg7yOK0H9siL4fjAAXV52Klb5pm1zAadLP+QVnTXgGILy4XPgz5oIQq+DU6WfnIgoOyDN2bZOfLXUNV5qj+4mpjvx4S+iTkKSeIDoaJfs7fGiPDWjFUQlZdTIDrlZLGwEf+kd1RCkpAeTOsmWhbXgQ1zuw+ODJVWPQleimA7r+S64Ql5qcJhUQxUCLXeGKmb0MsWRKdBD6Vh1Anvgch98ifjAXH1yMZv3s23Hu1pwIDAQAB\r\n-----END PUBLIC KEY-----',
    NOTIFY_URL: ''
}



/**
 * 阿里大鱼短信配置
 * @type {{}}
 */
exports.sms_config = {
    AccessKeyId: 'LTAI6g5GltkMKEbM',
    AccessKeySecret: '6xBuLINFCS0qIjkMnoPPK3jJHfzc6u'
}


/**
 * H5支付服务器配置
 * @type {{}}
 */
exports.pay_server = {
    //接口验签
    API_TOKEN: "S&*#$%()X",
    //支付服务器端口
    HTTP_PORT: 6688,
    MCH_ID: '10048',
    MCH_KEY: 'db1d1860092e4accb7a553e3cdbc107a',
    //同步回调地址
    CALLBACK_URL: "http://pay.6u3w5.cn/quansupay/complete",
    //异步回调地址
    NOTIFY_URL: ""
}