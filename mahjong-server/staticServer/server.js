let express = require("express")
let ejs = require("ejs")
let app = express();
var http = require('../utils/http');
let config = require("../configs")
let path = require("path")
var http = require("../utils/http");
var qr = require("./qr-image/qr")
let gm = require("gm")
let fs = require("fs")
const sharp = require('sharp')
//设置跨域访问
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1');
    // res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

app.engine("html",ejs.__express);
app.set("view engine","html");
app.set("views", path.join(__dirname, "../view"))
app.use(express.static(path.join(__dirname, '../public')))
app.use(express.static(path.join(__dirname, '../hotUpdate')))
app.get('/create_qrcode',function(req,res){
    let userId = req.query.userId;
    let hall_Server = config.static_server();
    let url = "http://"+hall_Server.HALL_IP + ":" + hall_Server.CLEINT_PORT +"/register?bind_recommender="+userId;
    console.log(111)
    if(!userId){
        http.send(res, 1, "参数错误")
        return;
    }
    try {
        console.log(url)
        let img = qr.image(url,{size:3});
        
        console.log(img)
        res.writeHead(200,{'Content-Type': 'image/png'});
        img.pipe(res);
    } catch (e) {
        http.send(res, 1, "出错")
    }
})
app.get("/createqrcode",function(req,res){
    let userId = req.query.userId;
    let hall_Server = config.static_server();
    let url = "http://"+hall_Server.HALL_IP + ":" + hall_Server.CLEINT_PORT +"/create_qrcode?userId="+userId;

    res.header("Content-Type","application/json;charset=utf-8");
    http.send(res,200,url);
}),
app.get("/img",function(req,res){
    let userId = req.query.userId;
    let hall_Server = config.static_server();
    let url = "http://"+hall_Server.HALL_IP + ":" + hall_Server.CLEINT_PORT +"/register?bind_recommender="+userId;
    console.log(111)
    if(!userId){
        http.send(res, 1, "参数错误")
        return;
    }
    // let d = Buffer.from("./i_love_qr.svg")
    // console.log(d)
    try {
        let img = qr.image(url,{size:12,type: 'png'});
        img.pipe(fs.createWriteStream(path.join(__dirname, '../public/er/'+userId+".png")));
        
        // res.writeHead(200,{'Content-Type': 'image/jpg'});
        // img.pipe(res);
        let P = new Promise((resolve,reject)=>{
            setTimeout(() => {
                sharp(path.join(__dirname, '../public/img/share.jpg'))
                
                .composite([{
                    input:path.join(__dirname, "./i_love_qr.png"),
                    top:980,
                    left:290
                }])
                
                .toFile(path.join(__dirname, "../public/share/"+userId+".jpg"), (err,info) => {
                    if (err){
                        console.log(err)
                        return reject(err)
                    }
                    resolve(info)
                    
                })
            }, 500);
        })
        P.then(
            // res.writeHead(302,{
            //     'Location': "http://"+hall_Server.HALL_IP + ":12345/share/"+userId+".jpg"
            // }),
            // res.end(),
            url1 = "http://"+hall_Server.HALL_IP + ":12345/share/"+userId+".jpg",
            http.send(res,0,"ok",{url1:url1}),
        )
        // console.log(path.join(__dirname, '../public/img/share.jpg'))

    } catch (e) {
        console.log(e)
        http.send(res, 1, "出错")
    }
})
app.get("/register",function(req,res){
    let userId = req.query.bind_recommender;
    var hall_Server = config.hall_server();
    let url = "http://"+hall_Server.HALL_IP+":"+hall_Server.CLEINT_PORT;
    console.log(url)
    res.render("register",{url:url});
})


exports.start = function ($config) {
    let config = $config;
    app.listen(config.CLEINT_PORT);
    console.log("client service is listening on port " + config.CLEINT_PORT);
};