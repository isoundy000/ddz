/**
 * @author hyw
 * @date 2019/1/14 0014
 * @description: {描述一下文件的功能}
 */
const moment = require('moment');
const crypto = require('crypto');
const fs = require('fs');
const config = require('../configs').ali_pay;

/**
 * 构建app支付需要的参数
 * @param subject       商品名称
 * @param outTradeNo    自己公司的订单号
 * @param totalAmount   金额
 * @returns {string}
 */
function buildParams(subject, outTradeNo, totalAmount) {
    let params = {};
    params.app_id = config.APP_ID;
    params.method = 'alipay.trade.app.pay';
    params.charset = 'utf-8';
    params.sign_type = 'RSA2';
    params.timestamp =  moment().format('YYYY-MM-DD HH:mm:ss');
    params.version = '1.0';
    params.notify_url = config.NOTIFY_URL;
    params.biz_content =  buildBizContent(subject, outTradeNo, totalAmount);
    return params;
}


/**
 * 生成业务请求参数的集合
 * @param subject       商品的标题/交易标题/订单标题/订单关键字等。
 * @param outTradeNo    商户网站唯一订单号
 * @param totalAmount   订单总金额，单位为元，精确到小数点后两位，取值范围[0.01,100000000]
 * @returns {string}    json字符串
 * @private
 */
 function buildBizContent(subject, outTradeNo, totalAmount) {
    let bizContent = {
        subject: subject,
        out_trade_no: outTradeNo,
        total_amount: totalAmount
    };
    return JSON.stringify(bizContent);
}

/**
 * 按照支付宝sign生成的规则，对请求参数进行排序
 * @param params
 * @returns {*}
 */
function getVerifyParams(params) {
    var sPara = [];
    if(!params) return null;
    for(var key in params) {
        if((!params[key]) || key == "sign" || key == "sign_type") {
            continue;
        };
        sPara.push([key, params[key]]);
    }
    sPara = sPara.sort();
    var prestr = '';
    for(var i2 = 0; i2 < sPara.length; i2++) {
        var obj = sPara[i2];
        if(i2 == sPara.length - 1) {
            prestr = prestr + obj[0] + '=' + obj[1] + '';
        } else {
            prestr = prestr + obj[0] + '=' + obj[1] + '&';
        }
    }
    return prestr;
}

/**
 *
 * @param params
 * @returns {*}
 */
function getSign(params) {
    try {
        //应用私钥
        var key = config.APP_PRIVATE_KEY;
        var prestr = getVerifyParams(params);
        var sign = crypto.createSign('RSA-SHA1');
        sign.update(prestr);
        sign = sign.sign(key, 'base64');
        return encodeURIComponent(sign)
    } catch(err) {
        console.log('err', err)
    }
}
//验签
function veriySign(params) {
    try {
        //支付宝公钥
        var publicKey = config.RSA_PUBLIC_KEY;
        var prestr = getVerifyParams(params);
        var sign = params['sign'] ? params['sign'] : "";
        var verify = crypto.createVerify('RSA-SHA1');
        verify.update(prestr);
        return verify.verify(publicKey, sign, 'base64')
    } catch(err) {
        console.log('veriSign err', err)
    }
}



/**
 * 生成支付订单
 * @param subject       商品名称
 * @param outTradeNo    自己公司的订单号
 * @param totalAmount   金额
 * @returns {string}
 */
exports.createPayOrder = function(subject, outTradeNo, totalAmount){
     var reqParams = buildParams(subject,outTradeNo,totalAmount);
     var sign = getSign(reqParams);
     var params = getVerifyParams(reqParams);
     var paramsString = params+'&sign='+sign+'&sign_type=RSA';
     return encodeURIComponent(paramsString);
}

/**
 * 验证回调
 * @param req
 * @param res
 */
exports.checkNotify = function(req, res) {
    var params = req.body
    var mysign = veriySign(params);
    try {
        //验签成功
        if(mysign) {
            if(params['notify_id']) {
                var partner = config.PARTNER_ID;
                //生成验证支付宝通知的url
                var url = 'https://mapi.alipay.com/gateway.do?service=notify_verify&' + 'partner=' + partner + '&notify_id=' + params['notify_id'];
                console.log('url:' + url)
                //验证是否是支付宝发来的通知
                https.get(url, function(text) {
                    //有数据表示是由支付宝发来的通知
                    if(text) {
                        //交易成功
                        console.log('success')
                    } else {
                        //交易失败
                        console.log('err')
                    }
                })
            }
        }
    } catch(err) {
        console.log(err);
    }
}
