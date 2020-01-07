/**
 * @author hyw
 * @date 2018/7/16 0016
 * @description: 阿里大鱼短信发送帮助模块
 */

const SMSClient = require('@alicloud/sms-sdk')
const SMSConfig = require('../configs').sms_config;

// ACCESS_KEY_ID/ACCESS_KEY_SECRET 根据实际申请的账号信息进行替换
const accessKeyId = SMSConfig.AccessKeyId;
const secretAccessKey = SMSConfig.AccessKeySecret

//初始化sms_client
let smsClient = new SMSClient({accessKeyId, secretAccessKey})
module.exports = {
    /**
     * 发送短信
     */
    sendSMS:function(phone,code,callback){
        //发送短信
        smsClient.sendSMS({
            PhoneNumbers: phone,
            SignName: '老司机',
            TemplateCode: 'SMS_137335117',
            TemplateParam: '{"code":"'+code+'"}'
        }).then(function (res) {
            let {Code}=res
            if (Code === 'OK') {
                //处理返回参数
                console.log("手机号【"+phone+'】发送验证码成功');
                callback(null,'OK');
            }
        }, function (err) {
            console.log("手机号【"+phone+'】发送验证码失败:'+JSON.stringify(err));
            callback(err);
        })
    }
}