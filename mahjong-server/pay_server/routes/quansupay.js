var express = require("express")
var app = express()
var md5=require("md5")  
var router = express.Router();
var playerService = require('../../common/service/playerService');
var rechargeService = require('../../common/service/rechargeService');
var config = require('../../configs').pay_server;
var crypto = require('../../utils/crypto');
var uuid = require('node-uuid');
var moment = require('moment');
var commonUtil = require('../../utils/commonUtil');
/**
 * 创建ping++支付对象
 */
router.get('/pay', function (req, res) {
    var sign = req.query.sign;
    //玩家账号
    var account = req.query.account;
    if (!account|| !sign) {
        res.render("500",{errormsg:'参数错误'});
        return;
    }

    var serverSign = crypto.md5(account+config.API_TOKEN);
    if (serverSign != sign) {
        res.render("500",{errormsg:'请求不合法'});
        return;
    }

    var shopId = req.query.shopId;
    var amount = req.query.price;
    //转化成分
    //amount = amount * 100;
    var count = req.query.count;
    var channel = req.query.channel || "wx";
    //支付的货币类型  gems 房卡  coins 金币
    var type = req.query.type;

    var data = {};
    data.shopId = shopId;
    data.account = account;
    data.amount = amount;
    data.channel = channel;
    console.log("接收到客户端支付订单请求：" + JSON.stringify(data));
    //生成订单
    playerService.getByAccount(account, function (err, result) {
        if (err) {
            console.log(err);
            res.render("500",{errormsg:'获取玩家信息失败'});
        } else {
            var userid = result.userid;
            //var orderId = uuid.v1().replace(/-/g, "");
            var orderId = moment(new Date()).format("YYYYMMDDHHmmss")+commonUtil.getRandomCode(6);
            //创建支付订单
            var rechargeRecord = {};
            rechargeRecord.id = orderId;
            rechargeRecord.goods_count = count;
            rechargeRecord.goods_type = type;
            rechargeRecord.order_money = amount*100;
            rechargeRecord.pay_way = channel;
            rechargeRecord.player_id = userid;
            rechargeService.createRechargeRecord(rechargeRecord, function (err, result) {
                if (err) {
                    console.log(err);
                    res.render("500",{errormsg:'生成订单失败，请稍后重试'});
                } else {
                    //获取商户订单号
                    var out_trade_no = orderId;
                    //获取交易金额
                    var total_fee =Math.ceil(parseFloat(amount)*100);
                    //获取是否调用原生支付 1 原生 2 wap
                    var is_raw = 2;
                    //获取支付类型 11 支付宝wap  21 微信wap
                    var pay_type = '21';
                    if('zfb'==channel){
                        pay_type = '11';
					}
                    //获取商品名称
                    var body = '老司机娱乐-游戏充值';

                    //获取回调地址
                    var callback_url = config.CALLBACK_URL;
                    //获取订单签名
                    //获取请求数据----结束----
                    //商户订单号+交易金额+订单完成时间+商户号+商户秘钥
                    var sign_content=out_trade_no+total_fee+config.MCH_ID+config.MCH_KEY;
                    //md5签名
                    var sign=md5(sign_content)
                    //拼接请求url
                    var params = "?sign=" +sign;
                    params += "&mch_id=" + config.MCH_ID;
                    params += "&out_trade_no=" +out_trade_no;
                    params += "&total_fee=" +total_fee;
                    params += "&pay_type=" +pay_type;
                    params += "&is_raw=" +is_raw;
                    params += "&body=" +encodeURIComponent(body);
                    params += "&callback_url=" +encodeURIComponent(config["CALLBACK_URL"]);
                    var request_url ="https://api.gzname.com:8888/lpay/pay/gateway"+params;
                    //var request_url ="http://rexliu.free.idcfengye.com/lpay/pay/gateway"+params;
                    console.log('********支付通道一：请求了【'+channel+'】支付**********');
                    console.log(request_url);
                    res.redirect(request_url);
                }
            });
        }
    })
});


/**
 * 支付成功异步回调
 */
router.post('/notify', function(req, res){

    console.log('*******支付通道一：支付回调了*******');
    var params =req.body;
    console.log(params);
    //获取商户订单号
    var out_trade_no = params.out_trade_no;
    //获取平台订单号
    var transaction_id = params.transaction_id;
    //获取交易金额
    var total_fee = params.total_fee;
    //获取订单完成时间
    var time_end = params.time_end;
    //获取交易状态
    var status = params.status;
    //获取订单签名
    var sign = params.sign;
    //获取请求数据----结束----
    //商户订单号+平台订单号+订单完成时间+商户号+商户秘钥
    var sign_content=out_trade_no+transaction_id+time_end+config.MCH_ID+config.MCH_KEY;
    var check_sign=md5(sign_content)
    if(sign==check_sign){
        if(status==0){
            //订单成功
            rechargeService.confirmPay(out_trade_no, function (err, result) {
                if (err) {
                	console.log('*******支付回调更新订单状态失败*********');
                    console.log(err);
                    res.end("fail");
                } else {
                    //收到订单信息给服务器返回success
                    res.end("success");
                }
            })
        }
    } else {
        //收到订单信息给服务器返回fail
        res.end("fail");
    }
})

/**
 * 支付成功同步回调
 */
router.get('/complete', function(req, res){
    res.render("complete",{msg:'支付完成'});
})

module.exports = router;
