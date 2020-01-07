module.exports = {
    /**
     * 返回参数组成的数组
     */
    push: function () {
        var args = [];
        for (var value of arguments) {
            args.push(value);
        }
        return args;
    },
}