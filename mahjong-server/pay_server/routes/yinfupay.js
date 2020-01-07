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
var requestUtil = require('../../utils/requestUtil');
var moment = require('moment');


//商户ID
let MCH_ID = 200077;
//商户秘钥
let MCH_KEY = 'kgjyj1vk14bh9t59u9687hqp7mv3krrf';

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

    var channel = req.query.channel || "zfb";

    var amount = req.query.price;
    var count = req.query.count;

    // if(channel=='wx'){
    //     res.render("500",{errormsg:'该微信支付通道暂时维护，请选择其他支付通道'});
    //     return;
    // }

    // res.render("500",{errormsg:'该支付通道暂未开放，如有其他问题，请及时联系客服'});
    // return;

    var shopId = req.query.shopId;

    //转化成分
    //amount = amount * 100;
    //支付的货币类型  gems 房卡  coins 金币
    var type = req.query.type;

    var data = {};
    data.shopId = shopId;
    data.account = account;
    data.amount = amount;
    data.channel = channel;
    //console.log("接收到客户端支付订单请求：" + JSON.stringify(data));
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

                   var pay_memberid = MCH_ID;
                   var pay_orderid =orderId;
                   var pay_amount = Math.ceil(parseFloat(amount));
                   var pay_applydate = moment().format('YYYY-MM-DD HH:mm:ss');
                    //支付宝扫码	914  支付宝手机支付	915  微信扫码支付	913   微信H5支付	916
                    var pay_bankcode = 915;
                    if('wx'==channel){
                        pay_bankcode = 916;
                    }
                   var pay_notifyurl = 'http://pay.xxdswlkj.com/yinfupay/notify';
                   var pay_callbackurl = 'http://pay.xxdswlkj.com/yinfupay/complete';

                    //获取订单签名
                    var sign_content='pay_amount='+pay_amount+'&pay_applydate='+pay_applydate+'&pay_bankcode='+pay_bankcode+'&pay_callbackurl='+pay_callbackurl+'&pay_memberid='+pay_memberid+'&pay_notifyurl='+pay_notifyurl+'&pay_orderid='+pay_orderid;

                    //md5签名
                    var sign=md5(sign_content+'&key='+MCH_KEY);
                    sign = sign.toUpperCase();
                    //拼接请求url
                    var params = {};
                    params.pay_memberid = pay_memberid;
                    params.pay_orderid = pay_orderid;
                    params.pay_amount = pay_amount;
                    params.pay_applydate = pay_applydate;
                    params.pay_bankcode = pay_bankcode;
                    params.pay_notifyurl = pay_notifyurl;
                    params.pay_callbackurl = pay_callbackurl;
                    params.pay_md5sign = sign;
                    params.pay_productname = '虚拟物品';
                    params.pay_attach = userid;
                    var request_url ="http://www.yinfupay.net/Pay_Index.html";
                    requestUtil.post(request_url,params,function(err,data){
                        if(err){
                            console.log(err);
                            res.render("500",{errormsg:'请求支付网关超时'});
                        }else{
                            res.writeHead(200,{"Content-Type":"text/html"});
                            res.write(data);
                            res.end();
                        }
                    })
                }
            });
        }
    })
});



/**
 * 支付成功异步回调
 */
router.post('/notify', function(req, res){
    console.log('*******yinfu支付异步回调了*******');
    var params =req.body;
    console.log(params);
    var memberid = params.memberid; // 商户ID
    var orderid = params.orderid; // 订单号
    var amount = params.amount;// 交易金额
    var datetime = params.datetime;// 交易时间
    var returncode = params.returncode;
    var transaction_id = params.transaction_id;
    var attach = params.attach;

    //获取订单签名
    var sign = params.sign;
    var sign_content='amount='+amount+'&datetime='+datetime+'&memberid='+memberid+'&orderid='+orderid+'&returncode='+returncode+'&transaction_id='+transaction_id+'&key='+MCH_KEY;
    var check_sign=md5(sign_content);
    check_sign = check_sign.toUpperCase();
    if(sign==check_sign){
        if(returncode=='00'){
            //订单成功
            rechargeService.confirmPay(orderid, function (err, result) {
                if (err) {
                	console.log('*******支付回调更新订单状态失败*********');
                    console.log(err);
                    res.end("fail");
                } else {
                    //收到订单信息给服务器返回success
                    res.end("OK");
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
router.post('/complete', function(req, res){
    console.log('*******yinfu支付同步回调了*******');
    res.render("complete",{msg:'支付完成,请返回游戏查看,若充值金币未到账，请及时联系客服'});
})

module.exports = router;
