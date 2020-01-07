/**
 * @author hyw
 * @date 2018/6/25 0025
 * @description: 微信支付
 */

var urllib = require('urllib');
var util = require('./wechatUtil');

/**
 * 根据加密算法获取签名
 * @param params
 * @param type
 * @returns {string}
 */
function getSign(params,appkey) {
    let str = util.toQueryString(params) + '&key=' + appkey;
    var sign = util.md5(str).toUpperCase();
    return sign;
}

/**
 * 请求微信服务器
 * @returns {*}
 */
function request(url,params,callback){
    // 创建请求参数
    var reqData = util.buildXML(params);
    var  pkg = {method: 'POST', dataType: 'text', data: reqData};
    urllib.request(url,pkg,function(err, data, res){
        if (res.status !== 200) {
            callback('request fail');
        }else{
            callback(null,data);
        }
    });
}



/**
 *
 * @param appid 应用的APPID
 * @param mchid 商户ID
 * @param notify_url 支付成功回调地址
 *
 * @constructor
 */
function WechatPay(appid, mchid,appkey,notify_url){
    if (!appid) throw new Error('appid fail');
    if (!mchid) throw new Error('mchid fail');
    this.appid = appid;
    this.mchid = mchid;
    this.appkey = appkey;
    this.notify_url = notify_url;
}


WechatPay.prototype = {
    /**
     * 创建订单
     * @params {order_no: id,body: '商品简单描述',total_fee: 100}
     *
     */
    createOrder:function(params,callback){
        var self = this;
        var requestUrl = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
        var requestData = {
            appid: this.appid,
            mch_id:this.mchid,
            nonce_str: util.generate(),
            sign_type: 'MD5',
            notify_url:this.notify_url,
            body:params.body,
            out_trade_no:params.order_no,
            total_fee:params.total_fee,
            spbill_create_ip: params.spbill_create_ip || '127.0.0.1',
            trade_type: 'APP'
        }
        requestData.sign = getSign(requestData,self.appkey);
        request(requestUrl,requestData,function (err,data) {
            if(err){
                console.log(err);
                callback('create order fail');
            }else{
                util.parseXML(data,function(err,resData){
                    if(err){
                        callback(err);
                    }else{
                        if(resData.return_code=='SUCCESS'){
                            let rechargeObj = {
                                appid: self.appid,
                                partnerid: self.mchid,
                                prepayid: resData.prepay_id,
                                package: 'Sign=WXPay',
                                noncestr: util.generate(),
                                timestamp: '' + (Date.now() / 1000 |0)
                            };
                            rechargeObj.sign = getSign(rechargeObj,self.appkey);
                            callback(null,rechargeObj);
                        }else{
                            callback("request wechat server fail");
                        }
                    }
                })
            }
        })
    },
    /**
     * 根据返回的XML获取支付结果JSON
     */
    getPayResult:function(xml,callback){
        util.parseXML(xml,callback);
    },

    /**
     * 返回结果给微信服务器
     * @param msg
     */
    replyData:function (msg) {
        return util.buildXML(msg ? {return_code: 'FAIL', return_msg: msg} : {return_code: 'SUCCESS'});
    }
}
module.exports = WechatPay;