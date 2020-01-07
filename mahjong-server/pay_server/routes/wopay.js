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

//商户ID
let MCH_ID = '600180';
//商户秘钥
let MCH_KEY = '02ba7563e105477ebb7f697cf8c9f002';

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
                    //商户ID
                    var parter = MCH_ID;
                    //银行类型  992	支付宝扫码  1004	微信扫码  1005	微信wap版  1006	支付宝wap版

                    var type = '1004';
                    if('zfb'==channel){
                        type = '1006';
                    }
                    //金额
                    var value = parseFloat(amount).toFixed(2);
                    //订单号
                    var orderid = orderId;
                    var callbackurl = 'http://pay.xxdswlkj.com/wopay/notify';
                    //附加
                    var attach = userid;
                    var sign_content = 'parter='+parter+'&type='+type+'&value='+value+'&orderid ='+orderid+'&callbackurl='+callbackurl+MCH_KEY;
                    var sign=md5(sign_content)
                    //拼接请求url
                    var params = "?sign=" +sign;
                    params += "&parter=" + parter;
                    params += "&type=" +type;
                    params += "&value=" +value;
                    params += "&orderid=" +orderid;
                    params += "&callbackurl=" +callbackurl;
                    params += "&attach=" +attach;
                    var request_url ="http://pay.wooopay.com/chargebank.aspx"+params;
                    //var request_url ="http://rexliu.free.idcfengye.com/lpay/pay/gateway"+params;
                    //console.log(request_url);
                    res.redirect(request_url);
                }
            });
        }
    })
});


/**
 * 支付成功异步回调
 */
router.use('/notify', function(req, res){
    console.log('*******支付回调了*******');
    var params =req.query;
    //获取请求数据----开始----
    if (req.method.toLowerCase() == "post") {     //POST请求
        params = req.body;
    }

    console.log(params);
    //获取商户订单号
    var orderid = params.orderid;
    //0：支付成功
    //-1 请求参数无效
    //-2 签名错误
    var opstate = params.opstate;
    //获取交易金额
    var ovalue = params.ovalue;
    var sysorderid = params.sysorderid;
    var systime = params.systime;
    var attach = params.attach;
    var msg = params.msg;
    //获取订单签名
    var sign = params.sign;
    var sign_content='orderid='+orderid+'&opstate='+opstate+'&ovalue='+ovalue+MCH_KEY;
    var check_sign=md5(sign_content)
    if(sign==check_sign){
        if(opstate==0){
            //订单成功
            rechargeService.confirmPay(orderid, function (err, result) {
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
module.exports = router;
