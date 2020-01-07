call pm2 start ./account_server/app.js --name account_server  -l ./logs/account_server.log --log-date-format="YYYY-MM-DD HH:mm Z"
call pm2 start ./hall_server/app.js --name hall_server -l ./logs/hall_server.log --log-date-format="YYYY-MM-DD HH:mm Z"

call pm2 start ./coin_niuniu/free/app.js --name coin_niuniu_free -l ./logs/coin_niuniu_free.log --log-date-format="YYYY-MM-DD HH:mm Z"
call pm2 start ./coin_niuniu/one/app.js --name coin_niuniu_one -l ./logs/coin_niuniu_one.log --log-date-format="YYYY-MM-DD HH:mm Z"
call pm2 start ./coin_niuniu/two/app.js --name coin_niuniu_two -l ./logs/coin_niuniu_two.log --log-date-format="YYYY-MM-DD HH:mm Z"
call pm2 start ./coin_niuniu/three/app.js --name coin_niuniu_three -l ./logs/coin_niuniu_three.log --log-date-format="YYYY-MM-DD HH:mm Z"

call pm2 start ./coin_bairenniuniu/free/app.js --name coin_niuniu_free -l ./logs/coin_bairenniuniu_free.log --log-date-format="YYYY-MM-DD HH:mm Z"
call pm2 start ./coin_bairenniuniu/one/app.js --name coin_niuniu_one -l ./logs/coin_bairenniuniu_one.log --log-date-format="YYYY-MM-DD HH:mm Z"


call pm2 start ./coin_ttz2/free/app.js --name coin_ttz2_free -l ./logs/coin_ttz2_free.log --log-date-format="YYYY-MM-DD HH:mm Z"
call pm2 start ./coin_ttz2/one/app.js --name coin_ttz2_one -l ./logs/coin_ttz2_one.log --log-date-format="YYYY-MM-DD HH:mm Z"
call pm2 start ./coin_ttz2/two/app.js --name coin_ttz2_two -l ./logs/coin_ttz2_two.log --log-date-format="YYYY-MM-DD HH:mm Z"
call pm2 start ./coin_ttz2/three/app.js --name coin_ttz2_three -l ./logs/coin_ttz2_three.log --log-date-format="YYYY-MM-DD HH:mm Z"
call       pm2 start ./coin_zhajinhua/free/app.js --name coin_zhajinhua_free -l ./logs/coin_zhajinhua_free.log --log-date-format="YYYY-MM-DD HH:mm Z"
call       pm2 start ./coin_zhajinhua/one/app.js --name coin_zhajinhua_one -l ./logs/coin_zhajinhua_one.log --log-date-format="YYYY-MM-DD HH:mm Z"
call       pm2 start ./coin_zhajinhua/two/app.js --name coin_zhajinhua_two -l ./logs/coin_zhajinhua_two.log --log-date-format="YYYY-MM-DD HH:mm Z"
call       pm2 start ./coin_zhajinhua/three/app.js --name coin_zhajinhua_three -l ./logs/coin_zhajinhua_three.log --log-date-format="YYYY-MM-DD HH:mm Z"
call       pm2 start ./staticServer/app.js --name staticServer -l ./logs/staticServer.log --log-date-format="YYYY-MM-DD HH:mm Z"



