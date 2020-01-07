var gameLogic = require('../game_server_zhajinhua/gameLogic');

var usedPokers = [];
var p1 = {num:1,color:1};
var p2 = {num:1,color:2};
var p3 = {num:1,color:3};
var p4 = {num:1,color:4};

var p4 = {num:7,color:1};
var p5 = {num:7,color:2};
var p6 = {num:7,color:3};
var p7 = {num:7,color:4};


usedPokers.push(p1);
usedPokers.push(p2);
usedPokers.push(p3);
usedPokers.push(p4);

usedPokers.push(p4);
usedPokers.push(p5);
usedPokers.push(p6);
usedPokers.push(p7);


var otherHold = [];

var o1 = {num:1,color:1};
var o2 = {num:12,color:1};
var o3 = {num:13,color:1};

otherHold.push(o1);
otherHold.push(o2);
otherHold.push(o3);

var changed = gameLogic.huanPai(usedPokers,otherHold);

console.log(changed);