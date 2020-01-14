/**
 * Created by Administrator on 2015/1/24.
 * 日期处理帮助类
 */
/**
 * 增加日期的格式化方法，把日期类型转为特定格式的字符串
 * @param format
 * @returns {*}
 */
Date.prototype.format = function (format) {
    var o = {
        "M+": this.getMonth() + 1, //month
        "d+": this.getDate(), //day
        "h+": this.getHours(), //hour
        "m+": this.getMinutes(), //minute
        "s+": this.getSeconds(), //second
        "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
        "S": this.getMilliseconds() //millisecond
    }

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
}
var now = new Date(); //当前日期
var nowDayOfWeek = now.getDay(); //今天本周的第几天
var nowDay = now.getDate(); //当前日
var nowMonth = now.getMonth(); //当前月
var nowYear = now.getYear(); //当前年
nowYear += (nowYear < 2000) ? 1900 : 0;
var dateHelper = {
    /**
     * 日期格式化
     */
    dateFormat: function (date, format) {
        return date.format(format);
    },
    /**
     * 日期字符串转时间戳
     * @param str_time
     * @returns {number}
     */
    dateToTimestapm: function (dateStr) {
        var new_str = dateStr.replace(/:/g, '-');
        new_str = new_str.replace(/ /g, '-');
        var arr = new_str.split("-");
        var date = new Date(Date.UTC(arr[0], arr[1] - 1, arr[2], arr[3] - 8, arr[4], arr[5]));
        return date.getTime();
    },
    /**
     * 时间戳转特定格式的日期字符串
     * @param unixtime
     * @returns {*}
     */
    timestampToDate: function (timestamp, format) {
        var datatime = new Date(parseInt(timestamp) * 1000);
        var datetimeStr = null;
        if (format) {
            datetimeStr = datatime.format(format);
        } else {
            datetimeStr = datatime.format("MM/dd hh:mm:ss");
        }
        return datetimeStr;
    },
    /**
     * 获取当前系统时间的时间戳
     * @returns {number}
     */
    getCurrentTimestapm: function () {
        return parseInt((new Date().getTime()) / 1000);
    },
    /**
     * 获取制定格式的昨天的日期
     */
    getYesterdayTime: function (format) {
        var currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        var yesterday = currentDate.format(format);
        return yesterday;
    },
    /**
     * 获取周几
     */
    getWeekDayStr: function () {
        var weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
        var mydate = new Date();
        var myddy = mydate.getDay();//获取存储当前日期
        return weekdays[myddy]
    },
    /**
     * 获取某天的开始时间戳
     * dateStr 格式 yyyy-MM-dd
     */
    getBeginTimestamp: function (dateStr) {
        dateStr += ' 00:00:00';
        return this.dateToTimestapm(dateStr) / 1000;
    },
    /**
     * 获取某天的结束时间戳
     * dateStr 格式 yyyy-MM-dd
     */
    getEndTimestamp: function (dateStr) {
        dateStr += ' 23:59:59';
        return this.dateToTimestapm(dateStr) / 1000;
    },
    /**
     * 获取今天的时间戳
     */
    getToday: function () {
        var day = new Date();
        var str = day.format("yyyy-MM-dd");
        return str;
    },
    /**
     * 获取当前系统时间的时间戳
     * @returns {number}
     */
    getCurrentTimestamp: function () {
        return parseInt((new Date().getTime()) / 1000);
    },
    /**
     * 获取当月第一天
     * @returns {Date}
     */
    getCurrentMonthFirstDay: function () {
        var date = new Date(), y = date.getFullYear(), m = date.getMonth();
        var firstDay = new Date(y, m, 1);
        return this.dateFormat(firstDay, 'yyyy-MM-dd');
    },
    //获得本周的开始日期
    getWeekStartDate: function () {
        var weekStartDate = new Date(nowYear, nowMonth, nowDay - nowDayOfWeek + 1);
        return this.dateFormat(weekStartDate, 'yyyy-MM-dd');
    }
}
module.exports = dateHelper;