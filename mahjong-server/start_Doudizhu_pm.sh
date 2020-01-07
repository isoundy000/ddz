#!/bin/sh

pm2 list | grep doudizhu | awk '{system("pm2 delete "$4)}'
#rm -f ./logs/*doudizhu*.log
pm2 start ./game_server_doudizhu/app.js --name game_server_doudizhu  -l ./logs/game_server_doudizhu.log
