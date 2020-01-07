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


//商户ID
let MCH_ID = 11;
//商户秘钥
let MCH_KEY = 'QtMDdhNi00ZGRhLTliMTMtNjQ4ZGFiMG';

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

    if(channel=='wx'){
        res.render("500",{errormsg:'该微信支付通道暂时维护，请选择其他支付通道'});
        return;
    }

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
                    //获取商户订单号
                    var out_trade_no = orderId;
                    //获取交易金额
                    var money =Math.ceil(parseFloat(amount));
                    //alipay:支付宝,tenpay:财付通,qqpay:QQ钱包,wxpay:微信支付
                    var type = 'wxpay';
                    if('zfb'==channel){
                        type = 'alipay';
					}
                    //网站名称
                    var sitename = '老司机娱乐';
                    //商品名称
                    var name = '众众通充值';

                    //异步通知地址
                    var notify_url = 'http://pay.xxdswlkj.com/zztpay/notify';
                    //跳转通知地址
                    var return_url = 'http://pay.xxdswlkj.com/zztpay/complete';
                    var sign_type = 'MD5';
                    //获取订单签名
                    var sign_content='money='+money+'&name='+name+'&notify_url='+notify_url+'&out_trade_no='+out_trade_no+'&pid='+MCH_ID+'&return_url='+return_url+'&sitename='+sitename+'&type='+type;
                    console.log('*********请求了众众通支付【'+channel+'】************');
                    console.log(sign_content);

                    //md5签名
                    var sign=md5(sign_content+MCH_KEY)
                    //拼接请求url
                    var params = {};
                    params.pid = MCH_ID;
                    params.type = type;
                    params.out_trade_no = out_trade_no;
                    params.notify_url = notify_url;
                    params.return_url = return_url;
                    params.name = name;
                    params.money = money;
                    params.sitename = sitename;
                    params.sign = sign;
                    params.sign_type = sign_type;
                    var request_url ="http://pay.iec2.com/submit.php";
                    requestUtil.post(request_url,params,function(err,data){
                        if(err){
                            console.log(err);
                            res.render("500",{errormsg:'请求支付网关超时'});
                        }else{
                            res.writeHead(200,{'Content-Type':'html'});
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
router.get('/notify', function(req, res){
    console.log('*******zzy支付回调了*******');
    var params =req.query;
    console.log(params);
    var pid = params.pid;
    //获取商户订单号
    var out_trade_no = params.out_trade_no;
    //获取平台订单号
    var trade_no = params.trade_no;
    //获取交易金额
    var money = params.money;
    //获取订单完成时间
    var name = params.name;
    //获取交易状态
    var trade_status = params.trade_status;

    //获取类型
    var type = params.type;

    var sign_type = params.sign_type;
    //获取订单签名
    var sign = params.sign;
    var sign_content='money='+money+'&name='+name+'&out_trade_no='+out_trade_no+'&pid='+pid+'&trade_no='+trade_no+'&trade_status='+trade_status+'&type='+type;
    var check_sign=md5(sign_content+MCH_KEY)
    if(sign==check_sign){
        if(trade_status=='TRADE_SUCCESS'){
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
