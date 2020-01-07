/**
 * @author hyw
 * @date 2018/12/27 0027
 * @description: {描述一下文件的功能}
 */
/**
 * Created by 皇雅伟 on 2015/5/25.
 * 文档说明：请求帮助类
 */
var request = require('request');
var requestUtil = {
    /**
     * 发送get请求 超时时间3s
     * @param url
     * @param callback
     */
    get:function(url,callback){
        request({
            url:url,
            method:'GET',
            timeout:1500
        },function(err,httpResponse,body){
            if(err){
                //不抛出错误
                console.error('GET请求推荐服务出错：'+JSON.stringify(err));
                return callback(null,null);
            }else{
                var data = [];
                if(httpResponse.statusCode==200){
                    var dataStr = httpResponse.body;
                    if(dataStr){
                        data = JSON.parse(dataStr);
                    }
                }
                callback(null,data);
            }
        });
    },
    /**
     * 发送post请求
     * @param url
     * @param params
     * @param callback
     */
    post:function(url,params,callback){
        request({
            url:url,
            method:'POST',
            timeout:1500,
            form: params
        }, function(err,httpResponse,body){
            if(err){
                console.error('POST请求推荐服务出错：'+JSON.stringify(err));
                return callback(null,null);
            }else{
                var data = null;
                if(httpResponse.statusCode==200){
                    data = httpResponse.body;
                    //data = JSON.parse(data);
                }
                callback(null,data);
            }
        });
    }
}

module.exports=requestUtil;