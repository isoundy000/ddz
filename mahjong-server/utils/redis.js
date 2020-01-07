var redis = require("redis")
/**
 * 連接阿里雲redis服務器
  */
var client = redis.createClient(6379, '127.0.0.1', { no_ready_check: true });
// client.auth("12345678")
//client.auth('s9hfBfZabw');
client.on('connect', function () {
    console.log('redis is connected.');
    /**
     * 正式服務器使用1 數據庫，測試的請修改成其他的數據庫
     */
    client.select(1, function () {
        console.log('redis select 1.');
    });
});

/**
 * 打印錯誤信息
 */
client.on('error', function (err) {
    console.log('Error ' + err);
});

module.exports = client;