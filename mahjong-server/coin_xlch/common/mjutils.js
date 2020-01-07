function checkTingPai(seatData, begin, end) {
	for (var i = begin; i < end; ++i) {
		//如果这牌已经在和了，就不用检查了
		if (seatData.tingMap[i] != null) {
			continue;
		}
		//将牌加入到计数中
		var old = seatData.countMap[i];
		if (old == null) {
			old = 0;
			seatData.countMap[i] = 1;
		}
		else {
			seatData.countMap[i]++;
		}

		seatData.holds.push(i);
		//逐个判定手上的牌
		var ret = checkCanHu(seatData);
		if (ret) {
			//平胡 0番
			seatData.tingMap[i] = {
				pattern: "normal",
				fan: 0
			};
		}

		//搞完以后，撤消刚刚加的牌
		seatData.countMap[i] = old;
		seatData.holds.pop();
	}
}

var kanzi = [];
var record = false;
function debugRecord(pai) {
	if (record) {
		kanzi.push(pai);
	}
}

function matchSingle(seatData, selected) {
	//分开匹配 A-2,A-1,A
	var matched = true;
	var v = selected % 9;
	if (v < 2) {
		matched = false;
	}
	else {
		for (var i = 0; i < 3; ++i) {
			var t = selected - 2 + i;
			var cc = seatData.countMap[t];
			if (cc == null) {
				matched = false;
				break;
			}
			if (cc == 0) {
				matched = false;
				break;
			}
		}
	}


	//匹配成功，扣除相应数值
	if (matched) {
		seatData.countMap[selected - 2]--;
		seatData.countMap[selected - 1]--;
		seatData.countMap[selected]--;
		var ret = checkSingle(seatData);
		seatData.countMap[selected - 2]++;
		seatData.countMap[selected - 1]++;
		seatData.countMap[selected]++;
		if (ret == true) {
			debugRecord(selected - 2);
			debugRecord(selected - 1);
			debugRecord(selected);
			return true;
		}
	}

	//分开匹配 A-1,A,A + 1
	matched = true;
	if (v < 1 || v > 7) {
		matched = false;
	}
	else {
		for (var i = 0; i < 3; ++i) {
			var t = selected - 1 + i;
			var cc = seatData.countMap[t];
			if (cc == null) {
				matched = false;
				break;
			}
			if (cc == 0) {
				matched = false;
				break;
			}
		}
	}

	//匹配成功，扣除相应数值
	if (matched) {
		seatData.countMap[selected - 1]--;
		seatData.countMap[selected]--;
		seatData.countMap[selected + 1]--;
		var ret = checkSingle(seatData);
		seatData.countMap[selected - 1]++;
		seatData.countMap[selected]++;
		seatData.countMap[selected + 1]++;
		if (ret == true) {
			debugRecord(selected - 1);
			debugRecord(selected);
			debugRecord(selected + 1);
			return true;
		}
	}


	//分开匹配 A,A+1,A + 2
	matched = true;
	if (v > 6) {
		matched = false;
	}
	else {
		for (var i = 0; i < 3; ++i) {
			var t = selected + i;
			var cc = seatData.countMap[t];
			if (cc == null) {
				matched = false;
				break;
			}
			if (cc == 0) {
				matched = false;
				break;
			}
		}
	}

	//匹配成功，扣除相应数值
	if (matched) {
		seatData.countMap[selected]--;
		seatData.countMap[selected + 1]--;
		seatData.countMap[selected + 2]--;
		var ret = checkSingle(seatData);
		seatData.countMap[selected]++;
		seatData.countMap[selected + 1]++;
		seatData.countMap[selected + 2]++;
		if (ret == true) {
			debugRecord(selected);
			debugRecord(selected + 1);
			debugRecord(selected + 2);
			return true;
		}
	}
	return false;
}

function checkSingle(seatData) {
	var holds = seatData.holds;
	var selected = -1;
	var c = 0;
	for (var i = 0; i < holds.length; ++i) {
		var pai = holds[i];
		c = seatData.countMap[pai];
		if (c != 0) {
			selected = pai;
			break;
		}
	}
	//如果没有找到剩余牌，则表示匹配成功了
	if (selected == -1) {
		return true;
	}
	//否则，进行匹配
	if (c == 3) {
		//直接作为一坎
		seatData.countMap[selected] = 0;
		debugRecord(selected);
		debugRecord(selected);
		debugRecord(selected);
		var ret = checkSingle(seatData);
		//立即恢复对数据的修改
		seatData.countMap[selected] = c;
		if (ret == true) {
			return true;
		}
	}
	else if (c == 4) {
		//直接作为一坎
		seatData.countMap[selected] = 1;
		debugRecord(selected);
		debugRecord(selected);
		debugRecord(selected);
		var ret = checkSingle(seatData);
		//立即恢复对数据的修改
		seatData.countMap[selected] = c;
		//如果作为一坎能够把牌匹配完，直接返回TRUE。
		if (ret == true) {
			return true;
		}
	}

	//按单牌处理
	return matchSingle(seatData, selected);
}

function checkCanHu(seatData) {
	for (var k in seatData.countMap) {
		k = parseInt(k);
		var c = seatData.countMap[k];
		if (c < 2) {
			continue;
		}
		//如果当前牌大于等于２，则将它选为将牌
		seatData.countMap[k] -= 2;
		//逐个判定剩下的牌是否满足　３Ｎ规则,一个牌会有以下几种情况
		//1、0张，则不做任何处理
		//2、2张，则只可能是与其它牌形成匹配关系
		//3、3张，则可能是单张形成 A-2,A-1,A  A-1,A,A+1  A,A+1,A+2，也可能是直接成为一坎
		//4、4张，则只可能是一坎+单张
		kanzi = [];
		var ret = checkSingle(seatData);
		seatData.countMap[k] += 2;
		if (ret) {
			//kanzi.push(k);
			//kanzi.push(k);
			//console.log(kanzi);
			return true;
		}
	}
}

/*
console.log(Date.now());
//检查筒子
checkTingPai(seatData,0,9);
//检查条子
checkTingPai(seatData,9,18);
//检查万字
checkTingPai(seatData,18,27);
console.log(Date.now());

for(k in seatData.tingMap){
	console.log(nameMap[k]);	
}
*/

exports.checkTingPai = checkTingPai;

exports.getMJType = function (id) {
	if (id >= 0 && id < 9) {
		//筒
		return 0;
	}
	else if (id >= 9 && id < 18) {
		//条
		return 1;
	}
	else if (id >= 18 && id < 27) {
		//万
		return 2;
	}
}

//检查听牌
exports.setTingMaps = function (game, seatData) {
	// seatData.tingMaps = {};
	// seatData.canTing = false;	
	//检查手上的牌是不是已打缺，如果未打缺，则不进行判定
	if (seatData.que < 0 || seatData.que > 2) {
		return
	}
	let que_count = 0;
	let que = null;
	for (var i = 0; i < seatData.holds.length; ++i) {
		let pai = seatData.holds[i];
		if (exports.getMJType(seatData.holds[i]) == seatData.que) {
			que_count++;
			que = pai;
			if (que_count > 1)
				return;
		}
	}
	if (que != null) {
		--seatData.countMap[que];
		for (let i = 0; i < 27; ++i) {
			if (seatData.que == exports.getMJType(i)) {
				continue;
			}
			seatData.countMap[i] = seatData.countMap[i] || 0;
			++seatData.countMap[i];
			if (check7DuiHu(seatData.countMap) == true) {
				seatData.canTing = true;
				seatData.tingMaps[que] = seatData.tingMaps[que] || {};
				if (seatData.tingMaps[que][i] == null) {
					seatData.tingMaps[que][i] = {
						fan: 2,
						pattern: "7pairs",
						count: getMJLeftCount(seatData, i),
					};
				}
				else {
					if (seatData.tingMaps[que][i].fan <= 2) {
						seatData.tingMaps[que][i].fan = 2;
						seatData.tingMaps[que][i].pattern = "7pairs";
					}
				}
				--seatData.countMap[i];
				continue
			}
			if (checkPengPengHu(seatData.countMap) == true) {
				seatData.canTing = true;
				seatData.tingMaps[que] = seatData.tingMaps[que] || {};
				if (seatData.tingMaps[que][i] == null) {
					seatData.tingMaps[que][i] = {
						fan: 1,
						pattern: "duidui",
						count: getMJLeftCount(seatData, i),
					};
				}
				else {
					if (seatData.tingMaps[que][i].fan <= 1) {
						seatData.tingMaps[que][i].fan = 1;
						seatData.tingMaps[que][i].pattern = "duidui";
					}
				}
				--seatData.countMap[i];
				continue
			}
			if (checkCanHu(seatData) == true) {
				seatData.canTing = true;
				seatData.tingMaps[que] = seatData.tingMaps[que] || {};
				if (seatData.tingMaps[que][i] == null) {
					seatData.tingMaps[que][i] = {
						fan: 0,
						pattern: "normal",
						count: getMJLeftCount(seatData, i),
					};
				}
				else {
					if (seatData.tingMaps[que][i].fan <= 0) {
						seatData.tingMaps[que][i].fan = 0;
						seatData.tingMaps[que][i].pattern = "normal";
					}
				}
				--seatData.countMap[i];
				continue
			}
			--seatData.countMap[i];
		}
		++seatData.countMap[que];
	}
	else {
		for (const key in seatData.countMap) {
			let count = seatData.countMap[key]
			if (count != null && count > 0) {
				--seatData.countMap[key];
				for (let i = 0; i < 27; ++i) {
					if (seatData.que == exports.getMJType(i)) {
						continue;
					}
					seatData.countMap[i] = seatData.countMap[i] || 0;
					++seatData.countMap[i];
					if (check7DuiHu(seatData.countMap) == true) {
						seatData.canTing = true;
						seatData.tingMaps[key] = seatData.tingMaps[key] || {};
						if (seatData.tingMaps[key][i] == null) {
							seatData.tingMaps[key][i] = {
								fan: 2,
								pattern: "7pairs",
								count: getMJLeftCount(seatData, i),
							};
						}
						else {
							if (seatData.tingMaps[key][i].fan <= 2) {
								seatData.tingMaps[key][i].fan = 2;
								seatData.tingMaps[key][i].pattern = "7pairs";
							}
						}
						--seatData.countMap[i];
						continue
					}
					if (checkPengPengHu(seatData.countMap) == true) {
						seatData.canTing = true;
						seatData.tingMaps[key] = seatData.tingMaps[key] || {};
						if (seatData.tingMaps[key][i] == null) {
							seatData.tingMaps[key][i] = {
								fan: 1,
								pattern: "duidui",
								count: getMJLeftCount(seatData, i),
							};
						}
						else {
							if (seatData.tingMaps[key][i].fan <= 1) {
								seatData.tingMaps[key][i].fan = 1;
								seatData.tingMaps[key][i].pattern = "duidui";
							}
						}
						--seatData.countMap[i];
						continue
					}
					if (checkCanHu(seatData) == true) {
						seatData.canTing = true;
						seatData.tingMaps[key] = seatData.tingMaps[key] || {};
						if (seatData.tingMaps[key][i] == null) {
							seatData.tingMaps[key][i] = {
								fan: 0,
								pattern: "normal",
								count: getMJLeftCount(seatData, i),
							};
						}
						else {
							if (seatData.tingMaps[key][i].fan <= 0) {
								seatData.tingMaps[key][i].fan = 0;
								seatData.tingMaps[key][i].pattern = "normal";
							}
						}
						--seatData.countMap[i];
						continue
					}
					--seatData.countMap[i];
				}
				++seatData.countMap[key];
			}
		}
	}
}
/**
 * 检查7对胡
 * @param {Array} count_map 
 */
function check7DuiHu(count_map) {
	if (count_map == null) {
		return false
	}
	let count = 0;
	for (const key in count_map) {
		let c = count_map[key];
		if (c % 2 != 0) {
			return false
		}
		count += c;
	}
	//不是14张牌不能胡7对
	return count == 14
}
/**
 * 检查碰碰胡
 * @param {*} count_map 
 */
function checkPengPengHu(count_map) {
	if (count_map == null) {
		return false
	}
	//胡牌的时候手上只能有一对将牌，其它的是3张
	let count = 0;
	for (var k in count_map) {
		var c = count_map[k];
		if (c == 1) {
			return false
		}
		else if (c == 2) {
			count++;
		}
		else if (c == 4) {
			//手上有4个一样的牌，在四川麻将中是和不了对对胡的 随便加点东西
			return false
		}
	}
	return count == 1;
}

function getMJLeftCount(seatData, mj_id) {
	const gameSeats = seatData.game.gameSeats
	let count = 4;
	for (const key in gameSeats) {
		const seat = gameSeats[key];
		for (const idx in seat.angangs) {
			if (seat.angangs[idx] == mj_id) {
				count -= 4;
			}
		}
		for (const idx in seat.wangangs) {
			if (seat.wangangs[idx] == mj_id) {
				count -= 4;
			}
		}
		for (const idx in seat.diangangs) {
			if (seat.diangangs[idx] == mj_id) {
				count -= 4;
			}
		}
		for (const idx in seat.pengs) {
			if (seat.pengs[idx] == mj_id) {
				count -= 3;
			}
		}
		for (const idx in seat.folds) {
			if (seat.folds[idx] == mj_id) {
				--count;
			}
		}
	}
	for (const idx in seatData.holds) {
		if (seatData.holds[idx] == mj_id) {
			--count;
		}
	}
	return count;
}