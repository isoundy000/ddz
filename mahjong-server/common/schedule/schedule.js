var schedule = require('node-schedule')
var gameService = require('../service/gameService')

// *  *  *  *  *  *
// ┬  ┬  ┬  ┬  ┬  ┬
// │  │  │  │  │  |
// │  │  │  │  │  └ day of week(0 - 7)(0 or 7 is Sun)
// │  │  │  │  └───── month(1 - 12)
// │  │  │  └────────── day of month(1 - 31)
// │  │  └─────────────── hour(0 - 23)
// │  └──────────────────── minute(0 - 59)
// └───────────────────────── second(0 - 59, OPTIONAL)
// schedule.scheduleJob('* * * * * *', ()=>{
//     console.log("Date："+new Date());
// })
/**
 * 先暂时禁用定时器
 */
//schedule.scheduleJob('0 0 0 * * *', gameService.deleteGameArchive);