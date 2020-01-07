var crypto = require('crypto');
var queryString = require('querystring');
/**
 * Created by 皇雅伟 on 2015/3/3.
 * 文档说明：公共工具类
 */
var commonUtil = {
    /**
     * 随机获取六位数字码
     * @returns {string}
     */
    getRandomCode: function (length) {
        var code = "";
        var selectChar = new Array(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);//所有候选组成验证码的字符，当然也可以用中文的
        for (var i = 0; i < length; i++) {
            var charIndex = Math.floor(Math.random() * 10);
            code += selectChar[charIndex];
        }
        return code;
    },


    /**
     * 验证手机号的正确性
     * @param tel
     * @returns {boolean}
     */
    isLegalPhoneNum: function (tel) {
        var rtn = false;
        //移动号段
        var regtel = /^((13[4-9])|(15([0-2]|[7-9]))|(18[2|3|4|7|8])|(178)|(147))[\d]{8}$/;
        if (regtel.test(tel)) {
            rtn = true;
        }
        //电信号段
        regtel = /^((133)|(153)|(18[0|1|9])|(177))[\d]{8}$/;
        if (regtel.test(tel)) {
            rtn = true;
        }
        //联通号段
        regtel = /^((13[0-2])|(145)|(15[5-6])|(176)|(18[5-6]))[\d]{8}$/;
        if (regtel.test(tel)) {
            rtn = true;
        }
        return rtn;
    },
    //为{num：1，color：1}结构设计删除数组中的指定值
    remove:function(arr,value){
        if(typeof value === "object"){
            let index;
            try {
                for (let i of value){
                    for(let j of arr){
                        if(j.num===i.num && j.i==value.color){
                            let index = arr.indexOf(j);
                            arr.splice(index,1);
                        }
                        
                    }
                    
                }
            } catch (error) {
                
            }

        }
        for(let j of arr){
            if(j.num===value.num && j.color==value.color){
                let index = arr.indexOf(j);
                arr.splice(index,1);
            }
            
        }
    },
    removeOne:function(arr,value){
        for(let j of arr){
            if(j.num===value.num && j.color==value.color){
                let index = arr.indexOf(j);
                // console.log(j)
                arr.splice(index,1);
            }
            
        }
    },

    remove2:function(arr,value){
        for(let j of arr){
            if(j==value){
                let index = arr.indexOf(j);
                // console.log(j)
                arr.splice(index,1);
            }
            
        }
    },
    /**
     * 是否是合法的姓名
     * @param name
     */
    isLegalName: function (name) {
        var reg = /^[\u4E00-\u9FA5]{2,4}$/;
        if (!reg.test(name)) {
            return false;
        }else{
            return true;
        }
    },
    /**
     * 是否是合法的身份证号
     * @param cardId
     */
    isLegalCardID: function (cardId) {
        // 1 "验证通过!", 0 //校验不通过
        var format = /^(([1][1-5])|([2][1-3])|([3][1-7])|([4][1-6])|([5][0-4])|([6][1-5])|([7][1])|([8][1-2]))\d{4}(([1][9]\d{2})|([2]\d{3}))(([0][1-9])|([1][0-2]))(([0][1-9])|([1-2][0-9])|([3][0-1]))\d{3}[0-9xX]$/;
        //号码规则校验
        if (!format.test(cardId)) {
            return false;
        }
        //区位码校验
        //出生年月日校验   前正则限制起始年份为1900;
        var year = cardId.substr(6, 4),//身份证年
            month = cardId.substr(10, 2),//身份证月
            date = cardId.substr(12, 2),//身份证日
            time = Date.parse(month + '-' + date + '-' + year),//身份证日期时间戳date
            now_time = Date.parse(new Date()),//当前时间戳
            dates = (new Date(year, month, 0)).getDate();//身份证当月天数
        if (time > now_time || date > dates) {
            return false;
        }
        //校验码判断
        var c = new Array(7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2);   //系数
        var b = new Array('1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2');  //校验码对照表
        var id_array = cardId.split("");
        var sum = 0;
        for (var k = 0; k < 17; k++) {
            sum += parseInt(id_array[k]) * parseInt(c[k]);
        }
        if (id_array[17].toUpperCase() != b[sum % 11].toUpperCase()) {
            return false;
        }
        return true;
    },
    //获取指定区间范围随机数，包括lowerValue和upperValue
    randomFrom:function(lowerValue,upperValue)
    {
        return Math.floor(Math.random() * (upperValue - lowerValue + 1) + lowerValue);
    }
}
module.exports = commonUtil;