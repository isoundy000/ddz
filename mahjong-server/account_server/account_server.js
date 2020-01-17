var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require("../utils/http");
var playerService = require('../common/service/playerService');
var gameService = require('../common/service/gameService')
var crypto = require("../utils/crypto")
var redisClient = require("../utils/redis")
var commonUtils = require("../utils/commonUtil")
var configs = require("../configs")
// var redis_client = require("../utils/redis")
//缓存帮助类
var cacheUtil = require('../utils/cacheUtil');


var app = express();
var hallAddr = "";

function send(res, ret) {
	var str = JSON.stringify(ret);
	res.send(str)
}

var config = null;

exports.start = function (cfg) {
	config = cfg;
	hallAddr = config.HALL_IP + ":" + config.HALL_CLIENT_PORT;
	app.listen(config.CLIENT_PORT);
	console.log("account server is listening on " + config.CLIENT_PORT);
}

//设置跨域访问
app.all('*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", ' 3.2.1')
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});


var appInfo = {
	Android: {
		appid: "wx20f99e5365cae8ab",
		secret: "14637449a2e1bfe9736ec8227118e23c",
	},
	iOS: {
		appid: "wx20f99e5365cae8ab",
		secret: "14637449a2e1bfe9736ec8227118e23c",
	}
};

/**
 * 获取服务器配置信息
 */
app.get('/get_serverinfo', function (req, res) {
	var ret = {
		version: config.VERSION,
		hall: hallAddr,
		appweb: config.APP_WEB,
	}
	send(res, ret);
});

app.get("/sendnum", function (req, res) {
	console.log("sendnum")
	let mobile = req.query.account
	if (!mobile) {
		console.log("mobile", mobile)
		return;
	}
	let url = "http://47.52.107.254:8002/api/auth/send_number"
	http.get2(url, { mobile: mobile }, false, function (err, data) {
		if (err) {
			send(res, { code: 1, msg: "验证码发送失败" })
			return;
		}
		if (data.code == 0) {
			res.send(data)
			return;
		}
	})
})

/**
 * 回应客户端连接
 */
app.get('/getSign', function (req, res) {
	var ret = {
		version: 20161227
	}
	send(res, ret);
});


/**
 * 游客登录
 */

var i = 1;
app.get('/guest', function (req, res) {

	var account = req.query.account;
	if (account) {
		getuser(account, res);
		return;
	}

	createUser(account, account, res);

});
let chengyu = ["金蝉脱壳", "百里挑一", "金玉满堂", "背水一战", "霸王别姬", "天上人间", "不吐不快",
	"海阔天空", "情非得已", "满腹经纶", "兵临城下", "春暖花开", "黄道吉日", "生财有道",
	"天下无双", "偷天换日", "两小无猜", "卧虎藏龙", "珠光宝气", "花花公子", "绘声绘影",
	"国色天香", "相亲相爱", "八仙过海", "金玉良缘", "掌上明珠", "皆大欢喜", "文武双全",
]
app.get("/register", function (req, res) {

	var name = req.query.name;
	var account = req.query.account;
	var password = req.query.password;
	var bind_recommender = req.query.bind_recommender;
	var code = req.query.code;
	// if(!code){
	// 	return send(res,{errcode:1,errmsg:"code is error"});
	// }
	let url = "http://47.52.107.254:8002/api/auth/check_mobile"
	// console.log(account)
	var sign = crypto.md5(account + password + config.ACCOUNT_PRI_KEY);
	var fnFailed = function () {
		send(res, { errcode: 1, errmsg: "account has been used." });
	};
	if (!account || !password) {
		send(res, { errcode: 1, errmsg: "参数错误" });
		return;
	}
	var fnSucceed = function () {
		send(res, { errcode: 0, errmsg: "ok" });
	};
	// http.get2(url,{mobile:account,verifyCode:code},false,function(err,data){
	// 	if(err){
	// 		send(res,{errcode:1,errmsg:"服务器异常"})
	// 		return;
	// 	}
	// 	if(data.code === 0){
	playerService.isAccountExist(account, function (err, exist) {
		if (err) {
			send(res, { errcode: "1", errmsg: "出错" })
			return;
		}
		if (!exist) {
			playerService.createAccount(account, password, function (err, resu) {
				if (err) {
					fnFailed();
				} else {
					if (!name) {
						let time = new Date().getTime();
						let firstNameIndex = commonUtils.randomFrom(0, (chengyu.length - 1))
						let firstName = chengyu[firstNameIndex];
						let s = commonUtils.randomFrom(10, 1000)
						name = firstName + s
					}
					let rand = commonUtils.randomFrom(1, 450);
					let url = "http://47.105.174.215:12345/photos/" + rand + ".jpg";
					playerService.createUser(account, name, 1, url, null, function (err, result) {
						if (err) {
							fnFailed();
							return;
						}
						if (result) {
							playerService.getByAccount(account, function (err, result) {
								if (err) {
									send(res, { errcode: "1", errmsg: "出错" })
									return;
								}
								if (result) {
									console.log(result)
									let userid = result["userid"]
									// console.log(user_id)
									//如果是从别人分享的链接注册则绑定推荐人
									console.log("bind_recommender", bind_recommender)
									if (bind_recommender) {
										var data = {
											recommender: bind_recommender,
											account: account
										};
										console.log(bind_recommender)
										http.get(config.HALL_IP, config.HALL_CLIENT_PORT, '/bind_recommender', data, function (ret, data) {
											if (data.errcode != 0) {
												http.send(res, data.errcode, data.errmsg)
											} else {
												http.send(res, 0, "ok", data);
											}
										})
									} else {
										send(res, { errcode: "0", user_id: userid, sign: sign, errmsg: "ok" })
									}

								}
							})

						}
					})
				}
			})
		}
		else {
			fnFailed();
			console.log("account has been used.");
		}

	})
	// 	}else{
	// 		send(res,data)
	// 	}

	// })




})

/**
 * 通过code获取access_token
 * @param code
 * @param os
 * @param callback
 */
function get_access_token(code, os, callback) {
	var info = appInfo[os];
	if (info == null) {
		callback(false, null);
	}
	var data = {
		appid: info.appid,
		secret: info.secret,
		code: code,
		grant_type: "authorization_code"
	};
	http.get2("https://api.weixin.qq.com/sns/oauth2/access_token", data, callback, true);
}

/**
 * 获取微信登录的用户信息
 * @param access_token
 * @param openid
 * @param callback
 */
function get_state_info(access_token, openid, callback) {
	var data = {
		access_token: access_token,
		openid: openid
	};
	http.get2("https://api.weixin.qq.com/sns/userinfo", data, callback, true);
}

function create_user(account, name, sex, headimgurl, openid, callback) {
	playerService.isAccountExist(account, (err, result) => {
		if (err) {
			console.log(err);
			callback(err);
		} else {
			if (!result) {
				playerService.createUser(account, name, sex, headimgurl, openid, (err, result) => {
					if (err) {
						console.log(err);
						callback(err);
					} else {
						callback(null);
					}
				});
			} else {
				playerService.updateUserInfoByAccount(account, name, headimgurl, sex, openid, (err, result) => {
					if (err) {
						console.log(err);
						callback(err);
					} else {
						callback(null);
					}
				});
			}
		}
	});
};
function getuser(account, res) {
	playerService.getAccountInfo(account, function (err, info) {
		if (err) {
			send(res, { errcode: "1", errmsg: "服务器出错" })
			return;
		}
		if (info == null) {
			send(res, { errcode: 1, errmsg: "invalid account" });
			return;
		}
		var sign = crypto.md5(account + config.ACCOUNT_PRI_KEY);
		playerService.getByAccount(account, function (err, result) {
			if (err) {
				send(res, { errcode: "1", errmsg: "出错" })
				return;
			}
			if (result) {
				console.log(result)
				let userid = result["userid"]
				playerService.getUserBaseInfo(userid, (err, result) => {
					if (err) {
						console.log(err);
						return
					}
					if (!result) {
						return
					}
					var ret = {
						user_id: userid,
						errcode: 0,
						errmsg: "ok",
						name: crypto.fromBase64(result.name),
						sex: result.sex,
						headimgurl: result.headimg,
						coins: result.coins,
						gems: result.gems,
						sign: sign
					};
					send(res, ret);
				});
			}
		})

	});
}
function createUser(account, name, res) {
	if (i.toString().length === 1) {
		account = "guest_" + "00" + i;
	} else if (i.toString().length === 2) {
		account = "guest_" + "0" + i;
	} else {
		account = "guest_" + i;
	}
	i += 1
	let sex = 1;
	function loop(account) {
		playerService.isAccountExist(account, function (err, exist) {
			if (err) {
				send(res, { errcode: "1", errmsg: "出错" })
				return;
			}
			if (!exist) {
				console.log(account)
				playerService.createAccount(account, "12345678", function (err, resu) {
					if (err) {
						console.log(err)
						send(res, { errcode: 1, errmsg: "生成账号错误" });
					} else {
						if (!name) {
							let time = new Date().getTime()
							let s = commonUtils.randomFrom(10, 1000)
							name = "nihao" + s
							console.log(s)
						}
						playerService.createUser(account, account, 1, 0, null, function (err, result) {
							if (err) {
								fnFailed();
								return;
							}
							if (result) {
								playerService.getByAccount(account, function (err, result) {
									if (err) {
										send(res, { errcode: "1", errmsg: "出错" })
										return;
									}
									if (result) {
										console.log(result)
										let userid = result["userid"]
										send(res, { errcode: "0", user_id: userid, errmsg: "ok" })


									}
								})

							}
						})
					}
				})
			}
			else {
				if (i.toString().length === 1) {
					account = "guest_" + "00" + i;
				} else if (i.toString().length === 2) {
					account = "guest_" + "0" + i;
				} else {
					account = "guest_" + i;
				}
				i += 1
				return loop(account)
			}

		})
	}
	loop(account)
}
/**
 * 根据code 获取微信用户信息
 */
app.get('/wechat_auth', function (req, res) {
	var code = req.query.code;
	var os = req.query.os;
	if (code == null || code == "" || os == null || os == "") {
		return;
	}
	get_access_token(code, os, function (suc, data) {
		if (suc) {
			var access_token = data.access_token;
			var openid = data.openid;
			get_state_info(access_token, openid, function (suc2, data2) {
				if (suc2) {
					var unionid = data2.unionid;
					var openid = data2.openid;
					var nickname = data2.nickname;
					var sex = data2.sex;
					var headimgurl = data2.headimgurl;
					var account = unionid;
					create_user(account, nickname, sex, headimgurl, openid, function (err) {
						if (err) {
							console.log(err);
							var ret = {
								errcode: 1,
								errmsg: "创建用户失败",
							};
							send(res, ret);
						} else {
							var sign = crypto.md5(account /*+ req.ip*/ + config.ACCOUNT_PRI_KEY);
							var ret = {
								errcode: 0,
								errmsg: "ok",
								account: unionid,
								halladdr: hallAddr,
								sign: sign
							};
							send(res, ret);
						}
					});
				}
			});
		} else {
			send(res, { errcode: -1, errmsg: "unkown err." });
		}
	});
});
/**
 * 微信登录
 */
app.get("/wechat", function (req, res) {
	let sex = req.query.sex;
	let nickname = req.query.nickname;
	let openid = req.query.openid;
	let headimg = req.query.headimgurl;
	console.log("lalalalalallalalalal")
	if (!sex || !nickname || !openid || !headimg) {
		send(res, { errcode: 1, errmsg: "参数错误" });
		return;
	}

	playerService.getUserDataByOpenid(openid, function (err, result) {
		if (err) {
			return send(res, { errcode: 1, errmsg: "服务异常" });
		}
		if (result) {
			// console.log("result",result)
			console.log("用户已存在")
			playerService.updateUserInfoByOpenid(openid, nickname, headimg, sex, openid, function (err, result) {
				if (err) {
					return send(res, { errcode: 1, errmsg: "服务异常" });
				}
				playerService.getByAccount(openid, function (err, result) {
					if (err) {
						send(res, { errcode: 1, errmsg: "出错" })
						return;
					}
					if (result) {
						console.log(result)
						let userid = result["userid"]
						// console.log(user_id)
						redisClient.set("session" + userid, 1, function (err, value) {
							if (err) {
								send(res, { errcode: "1", errmsg: "服务器出错请稍后再试" })
								return;
							}
						})
						send(res, { errcode: 0, user_id: userid, errmsg: "ok" })
						return;

					}
				})
			});
		} else {

			playerService.createUser(openid, nickname, sex, headimg, openid, function (err, result) {
				if (err) {
					send(res, { errcode: 1, errmsg: "出错" })
					return;
				}
				if (result) {
					console.log("result", result)
					playerService.getByAccount(openid, function (err, result) {
						if (err) {
							send(res, { errcode: "1", errmsg: "出错" })
							return;
						}
						if (result) {
							console.log(result)
							let userid = result["userid"]
							redisClient.set("session" + userid, 1, function (err, value) {
								if (err) {
									send(res, { errcode: "1", errmsg: "服务器出错请稍后再试" })
									return;
								}
							})
							return send(res, { errcode: 0, user_id: userid, errmsg: "ok" })

						}
					})

				}
			})
		}

	});

})
app.get('/base_info', function (req, res) {
	var userid = req.query.user_id;
	playerService.getUserBaseInfo(userid, (err, result) => {
		if (err) {
			console.log(err);
			return
		}
		if (!result) {
			return
		}

		var ret = {
			errcode: 0,
			errmsg: "ok",
			name: crypto.fromBase64(result.name),
			sex: result.sex,
			headimgurl: result.headimg,
			coins: result.coins,
			gems: result.gems,
		};
		send(res, ret);
	});
});


//登录
app.get('/auth', function (req, res) {
	let account = req.query.account;
	var password = req.query.password;
	var password = req.query.code;
	console.log(typeof account)

	let time = new Date().getTime()
	var sessions = crypto.md5(account + password + time);
	playerService.getAccountInfo(account, function (err, info) {
		if (err) {
			send(res, { errcode: "1", errmsg: "服务器出错" })
			return;
		}
		if (info == null) {
			send(res, { errcode: 1, errmsg: "invalid account" });
			return;
		}

		let pwd = crypto.md5(password);
		if (info.password !== pwd) {
			send(res, { errcode: 1, errmsg: "invalid password" });
			return;
		}
		var sign = crypto.md5(account + password + config.ACCOUNT_PRI_KEY);
		playerService.getByAccount(account, function (err, result) {
			if (err) {
				send(res, { errcode: "1", errmsg: "出错" })
				return;
			}
			if (result) {
				console.log(result)
				let userid = result["userid"]
				playerService.getUserBaseInfo(userid, (err, result) => {
					if (err) {
						console.log(err);
						return
					}
					if (!result) {
						return
					}
					var ret = {
						user_id: userid,
						errcode: 0,
						errmsg: "ok",
						name: crypto.fromBase64(result.name),
						sex: result.sex,
						headimgurl: result.headimg,
						coins: result.coins,
						gems: result.gems,
						sign: sign,
						session: sessions
					};
					console.log(ret)
					send(res, ret);
				});
				redisClient.set("session" + userid, sessions, function (err, value) {
					if (err) {
						send(res, { errcode: "1", errmsg: "服务器出错请稍后再试" })
						return;
					}
				})
				playerService.updateSession(userid, sessions, function (err, value) {
					if (err) {
						send(res, { errcode: "1", errmsg: "服务器出错请稍后再试" })
						return;
					}
				})
			}
		})

	});

});

app.get("/forget", function (req, res) {
	let account = req.query.account
	let code = req.query.code
	let password = req.query.password
	if (!account || !code || !password) {
		send(res, { errcode: 1, errmsg: "有参数为空" })
		return;
	}
	let a = new Promise((resolve, reject) => {
		playerService.getAccountInfo(account, function (err, info) {
			if (err) {
				send(res, { errcode: "1", errmsg: "服务器出错" })
				return;
			}
			if (info == null) {
				send(res, { errcode: 1, errmsg: "invalid account" });
				return;
			}
			resolve("ok")
		});
	})
	let url = "http://47.52.107.254:8002/api/auth/check_mobile"

	a.then(function (r) {
		http.get2(url, { mobile: account, verifyCode: code }, false, function (err, data) {
			if (err) {
				send(res, { errcode: 1, errmsg: "验证码验证失败" })
				return;
			}
			if (data.code === 0) {
				playerService.updateAccount(account, password, function (err, value) {
					if (err) {
						send(res, { errcode: 1, errmsg: "服务器出错" })
						return;

					}

					send(res, { errcode: 1, errmsg: "密码修改成功" })
					return;
				})
			}

		})
		// let time = Math.floor(Math.random()*900000 + 100000);
		// 	redis_client.set(account,time,function(err,result){
		// 	if(err){
		// 		send(res,{errcode:"1",errmsg:"redis出错"});
		// 		console.log(err)
		// 		return;
		// 	}
		// 	if(result){
		// 		let flag = redis_client.expire(account,3600)
		// 		console.log(flag)
		// 		if(flag){
		// 			send(res,{errcode:"0",errmsg:"ok",time:"1小时",code:time})
		// 		}else{
		// 			send(res,{errcode:"1",errmsg:"出错"});
		// 		}

		// 	}
		// })
	})
})

app.get("/update_pwd", function (req, res) {
	let account = req.query.account
	let password = req.query.password
	let code = req.query.code;
	console.log("UPdate");
	let url = "http://47.52.107.254:8002/api/auth/check_mobile"
	let a = new Promise((resolve, reject) => {
		playerService.getAccountInfo(account, function (err, info) {
			if (err) {
				send(res, { errcode: "1", errmsg: "服务器出错" })
				return;
			}
			if (info == null) {
				send(res, { errcode: 1, errmsg: "invalid account" });
				return;
			}
			resolve("ok")
		});
	})
	a.then(function (r) {
		http.get2(url, { mobile: account, verifyCode: code }, false, function (err, data) {
			if (err) {
				send(res, { errcode: 1, errmsg: "验证码验证失败" })
				return;
			}
			if (data.code === 0) {
				playerService.updateAccount(account, password, function (err, value) {
					if (err) {
						send(res, { errcode: 1, errmsg: "服务器出错" })
						return;

					}

					send(res, { errcode: 0, errmsg: "密码修改成功" })
					return;
				})
			}

		})
	})


})
/**
 * 获取在线玩家信息列表
 */
app.get('/ws/get_online_player_list', (req, res) => {
	const user_id = req.query.user_id;
	var data = {
		user_id: user_id,
	};
	http.get(config.HALL_IP, config.HALL_CLIENT_PORT, '/get_online_player_list', data, function (ret, data) {
		if (data.errcode != 0) {
			http.send(res, data.errcode, data.errmsg)
		} else {
			http.send(res, 0, "ok", data);
		}
	})
})

/**
 * 根据缓存的key删除对应的缓存
 */
app.get('/ws/del_cache/:key', function (req, res) {
	var cacheKey = req.params.key;
	if (!cacheKey) {
		http.send(res, 1, "参数错误");
		return;
	}
	cacheUtil.del(cacheKey);
	http.send(res, 0, "ok");
});

