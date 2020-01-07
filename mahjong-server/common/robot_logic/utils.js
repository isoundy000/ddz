var utils = {};
utils.clone = function(target) {
    var buf;
    if (target instanceof Array) {
        buf = [];  //创建一个空的数组
        var i = target.length;
        while (i--) {
            buf[i] = utils.clone(target[i]);
        }
        return buf;
    }else if (target instanceof Object){
        buf = {};  //创建一个空对象
        for (var k in target) {  //为这个对象添加新的属性
            buf[k] = utils.clone(target[k]);
        }
        return buf;
    }else{
        return target;
    }
};

/*
 * 输出指定范围内的随机整数
 */
utils.fRandomBy = function(under, over) {

    switch (arguments.length) {

        case 1:
            return parseInt(Math.random() * under + 1);

        case 2:
            return parseInt(Math.random() * (over - under + 1) + under);

        default:
            return 0;

    }
};

utils.size = function(obj) {
  if(!obj) {
    return 0;
  }

  var size = 0;
  for(var f in obj) {
    if(obj.hasOwnProperty(f)) {
      size++;
    }
  }

  return size;
};




// lw add

utils.bind = function(fn, context) {
    if (arguments.length < 2 && context == undefined) return fn;
    var method = fn,
    slice = Array.prototype.slice,
    args = slice.call(arguments, 2);
    return function() {
        var array = slice.call(arguments, 0);
        method.apply(context, args.concat(array) );
    }    
};


utils.isTriple = function isTriple(a, b, c)
{
    return a == b && b == c;
};

utils.isPair = function isPair(a, b)
{
    return a == b;
};

utils.random = function random(a, b)
{
    if(a == b)
    {
        return a;
    }

    var min = a < b ? a : b;
    var max = a > b ? a : b;
    var delta = max - min;
    var value = Math.round(Math.random()*delta + min);
    return value;
};

utils.shuffle = function shuffle(list)
{
    var len = list.length;
    for(let i=len -1; i > 0; i--)
    {
        var index = utils.random(0, i);
        var temp = list[index];
        list[index] = list[i];
        list[i] = temp;
    }
};


module.exports = utils;
