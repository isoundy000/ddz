/**
 * @author hyw
 * @date 2018/12/17 0017
 * @description: ip帮助类
 */
var commonUtil = require('./commonUtil');
//ip地址库
var ips = ["1.192.217.130","27.50.128.0","42.1.128.0","42.51.0.0","42.228.6.94","42.231.131.163","42.236.4.0","42.236.7.0","42.236.10.0","42.236.19.0","42.236.71.0","42.236.72.0","42.247.1.224","42.247.2.0","49.122.0.0","49.122.24.0","49.122.48.0","49.122.70.0","58.207.200.0","59.33.253.10","59.39.146.73","59.45.63.238","59.53.172.146","59.69.128.0","59.69.160.0","59.69.192.0","59.69.208.0","59.70.0.0","59.70.8.0","59.70.16.0","59.70.32.0","59.70.48.0","59.70.64.0","59.70.96.0","59.70.112.0","59.70.128.0","59.70.160.0","59.70.168.0","59.70.176.0","59.70.192.0","59.70.224.0","60.21.138.110","60.21.158.6","60.22.134.131","60.190.84.59","60.209.125.182","60.221.232.27","61.52.1.194","61.52.8.242","61.52.11.252","61.52.15.230","61.52.15.244","61.52.15.245","61.52.31.39","61.52.31.103","61.52.46.169","61.52.50.110","61.52.60.179","61.52.72.22","61.52.73.102","61.52.75.109","61.52.75.175","61.52.75.200","61.52.106.5","61.52.106.22","61.52.119.72","61.52.121.175","61.52.125.241","61.52.125.251","61.52.134.101","61.52.139.84","61.52.139.138","61.52.142.218","61.52.143.12","61.52.158.18","61.52.174.131","61.52.175.218","61.52.246.0","61.52.251.97","61.52.253.124","61.52.254.242","61.53.6.220","61.53.7.247","61.53.14.162","61.53.18.0","61.53.19.39","61.53.19.232","61.53.19.236","61.53.21.122","61.53.21.171","61.53.21.252","61.53.27.123","61.53.30.204","61.53.30.225","61.53.30.226","61.53.30.227","61.53.30.228","61.53.30.240","61.53.30.242","61.53.30.245","61.53.30.248","61.53.30.249","61.53.30.250","61.53.30.251","61.53.30.252","61.53.30.253","61.53.31.243","61.53.34.3","61.53.34.4","61.53.34.5","61.53.34.9","61.53.34.12","61.53.34.15","61.53.34.53","61.53.34.61","61.53.34.122","61.53.34.123","61.53.34.124","61.53.34.252","61.53.35.1","61.53.35.2","61.53.35.3","61.53.35.5","61.53.35.6","61.53.35.8","61.53.35.10","61.53.35.11","61.53.35.250","61.53.36.13","61.53.37.90","61.53.38.156","61.53.40.5","61.53.41.2","61.53.41.3","61.53.41.4","61.53.41.5","61.53.41.6","61.53.41.9","61.53.41.10","61.53.41.194","61.53.41.248","61.53.42.169","61.53.43.15","61.53.44.3","61.53.44.4","61.53.44.6","61.53.44.7","61.53.44.9","61.53.44.10","61.53.44.12","61.53.44.13","61.53.44.14","61.53.44.15","61.53.44.34","61.53.44.35","61.53.44.36","61.53.44.37","61.53.44.38","61.53.44.40","61.53.44.41","61.53.44.42","61.53.44.43","61.53.44.44","61.53.44.45","61.53.44.46","61.53.44.47","61.53.44.48","61.53.44.49","61.53.44.50","61.53.44.51","61.53.44.54","61.53.44.58","61.53.44.67","61.53.44.130","61.53.48.1","61.53.48.4","61.53.48.58","61.53.48.64","61.53.48.94","61.53.48.124","61.53.51.253","61.53.60.130","61.53.143.0","61.53.146.40","61.53.146.113","61.53.146.171","61.53.146.239","61.53.146.244","61.53.146.245","61.53.146.248","61.53.146.252","61.53.147.226","61.53.147.234","61.53.147.246","61.53.147.247","61.53.147.248","61.53.148.85","61.53.148.109","61.53.148.227","61.53.148.229","61.53.148.238","61.53.148.239","61.53.148.243","61.53.148.246","61.53.148.248","61.53.148.250","61.53.150.5","61.53.150.46","61.53.151.0","61.53.152.72","61.53.152.150","61.53.152.249","61.53.158.18","61.53.160.2","61.53.161.44","61.53.163.1","61.53.164.232","61.53.166.249","61.53.169.123","61.53.170.123","61.53.176.139","61.53.179.225","61.53.179.233","61.53.179.236","61.53.179.249","61.53.179.252","61.53.186.6","61.53.186.7","61.53.186.13","61.53.186.26","61.53.186.27","61.53.186.35","61.53.187.13","61.53.188.3","61.53.188.4","61.53.188.6","61.53.188.8","61.53.188.9","61.53.188.10","61.53.188.11","61.53.188.12","61.53.188.13","61.53.188.14","61.53.188.15","61.53.188.35","61.53.188.36","61.53.188.37","61.53.188.38","61.53.188.39","61.53.188.40","61.53.188.41","61.53.188.43","61.53.188.44","61.53.188.46","61.53.188.48","61.53.188.98","61.53.188.119","61.53.189.39","61.53.189.42","61.53.190.8","61.53.190.92","61.53.190.130","61.53.190.131","61.53.190.132","61.53.190.135","61.53.190.136","61.53.190.137","61.53.190.140","61.53.190.142","61.53.190.145","61.53.191.16","61.53.191.35","61.53.191.40","61.53.191.45","61.53.191.103","61.53.191.202","61.53.192.4","61.53.192.6","61.53.192.13","61.53.192.16","61.53.192.22","61.53.192.25","61.53.192.41","61.53.192.69","61.53.192.115","61.53.192.117","61.53.192.118","61.53.192.222","61.53.193.66","61.53.193.77","61.53.193.96","61.53.193.222","61.53.194.204","61.53.195.179","61.53.195.195","61.53.195.197","61.53.195.198","61.53.195.211","61.53.195.212","61.53.195.213","61.53.195.214","61.53.195.215","61.53.195.216","61.53.195.217","61.53.195.218","61.53.195.219","61.53.195.245","61.53.195.246","61.53.195.251","61.53.200.3","61.53.200.19","61.53.200.40","61.53.200.124","61.53.200.155","61.53.201.3","61.53.201.4","61.53.201.5","61.53.201.6","61.53.201.8","61.53.201.9","61.53.201.10","61.53.201.12","61.53.201.13","61.53.201.14","61.53.201.15","61.53.201.16","61.53.201.17","61.53.201.18","61.53.201.21","61.53.201.66","61.53.201.68","61.53.201.227","61.53.202.30","61.53.202.105","61.53.202.144","61.53.202.150","61.53.202.151","61.53.202.158","61.53.202.178","61.53.202.195","61.53.202.196","61.53.202.198","61.53.202.201","61.53.202.211","61.53.202.212","61.53.202.213","61.53.202.214","61.53.202.215","61.53.202.216","61.53.202.217","61.53.202.219","61.53.202.220","61.53.202.221","61.53.202.222","61.53.202.227","61.53.202.242","61.53.203.122","61.53.203.195","61.53.203.232","61.53.204.130","61.53.204.138","61.53.205.65","61.53.205.224","61.53.207.5","61.53.207.18","61.53.207.24","61.53.207.52","61.53.207.112","61.53.207.214","61.53.208.13","61.53.208.67","61.53.208.68","61.53.208.70","61.53.208.71","61.53.208.72","61.53.208.73","61.53.208.74","61.53.208.76","61.53.208.77","61.53.208.78","61.53.208.79","61.53.208.80","61.53.208.82","61.53.208.130","61.53.208.143","61.53.210.33","61.53.212.1","61.53.212.2","61.53.212.3","61.53.212.4","61.53.212.6","61.53.212.7","61.53.212.8","61.53.212.9","61.53.212.10","61.53.212.11","61.53.212.13","61.53.212.14","61.53.212.16","61.53.212.17","61.53.212.18","61.53.212.19","61.53.212.21","61.53.212.22","61.53.212.23","61.53.212.24","61.53.212.28","61.53.212.29","61.53.212.30","61.53.212.31","61.53.212.32","61.53.212.36","61.53.212.37","61.53.212.39","61.53.212.41","61.53.212.42","61.53.212.49","61.53.212.72","61.53.213.49","61.53.213.66","61.53.214.130","61.53.214.132","61.53.214.140","61.53.215.162","61.53.216.45","61.53.216.70","61.53.217.2","61.53.217.16","61.53.217.18","61.53.217.21","61.53.217.23","61.53.217.24","61.53.217.83","61.53.217.84","61.53.217.98","61.53.217.120","61.53.219.89","61.53.229.113","61.53.230.40","61.53.230.161","61.53.231.253","61.53.232.0","61.53.232.25","61.53.232.29","61.53.232.42","61.53.232.51","61.53.232.53","61.53.232.59","61.53.232.93","61.53.232.172","61.53.232.176","61.53.232.179","61.53.232.185","61.53.232.186","61.53.232.187","61.53.233.162","61.53.233.190","61.53.234.132","61.53.234.133","61.53.234.134","61.53.234.141","61.53.234.142","61.53.234.143","61.53.234.145","61.53.234.147","61.53.234.149","61.53.234.151","61.53.234.152","61.53.234.153","61.53.234.155","61.53.234.156","61.53.234.234","61.53.234.236","61.53.234.240","61.53.234.241","61.53.234.246","61.53.234.247","61.53.234.248","61.53.234.249","61.53.234.250","61.53.234.251","61.53.234.252","61.53.235.9","61.53.235.10","61.53.235.12","61.53.235.17","61.53.235.18","61.53.235.21","61.53.235.25","61.53.235.26","61.53.235.27","61.53.235.33","61.53.235.34","61.53.235.35","61.53.235.36","61.53.235.37","61.53.235.39","61.53.235.40","61.53.235.42","61.53.235.46","61.53.235.58","61.53.235.66","61.53.235.68","61.53.235.69","61.53.235.70","61.53.235.71","61.53.235.89","61.53.235.91","61.53.235.97","61.53.235.98","61.53.235.99","61.53.235.100","61.53.235.132","61.53.235.133","61.53.235.134","61.53.235.136","61.53.235.138","61.53.235.139","61.53.235.140","61.53.235.143","61.53.235.146","61.53.235.148","61.53.235.150","61.53.235.151","61.53.235.153","61.53.235.156","61.53.235.157","61.53.235.158","61.53.235.163","61.53.235.165","61.53.235.166","61.53.235.169","61.53.235.170","61.53.235.177","61.53.235.178","61.53.235.180","61.53.235.193","61.53.236.140","61.53.236.232","61.53.236.246","61.53.237.0","61.53.237.136","61.53.237.137","61.53.237.148","61.53.237.149","61.53.237.188","61.53.237.189","61.53.238.178","61.53.238.180","61.53.238.183","61.53.238.184","61.53.238.188","61.53.240.181","61.53.240.186","61.53.240.187","61.53.241.59","61.53.241.129","61.53.241.221","61.53.242.3","61.53.242.24","61.53.242.165","61.53.242.184","61.53.242.189","61.53.244.121","61.53.244.162","61.53.245.90","61.53.245.131","61.53.245.132","61.53.245.141","61.53.245.145","61.53.245.166","61.53.245.186","61.53.245.195","61.53.245.209","61.53.245.219","61.53.245.226","61.53.245.251","61.53.245.253","61.53.247.154","61.53.250.135","61.53.250.147","61.53.250.150","61.53.250.155","61.53.250.173","61.53.251.13","61.53.251.121","61.53.252.143","61.53.252.145","61.53.252.146","61.53.253.90","61.53.253.117","61.54.0.200","61.54.0.231","61.54.1.89","61.54.1.90","61.54.1.93","61.54.1.95","61.54.1.107","61.54.1.116","61.54.1.120","61.54.3.37","61.54.5.50","61.54.5.56","61.54.5.57","61.54.5.103","61.54.5.108","61.54.5.119","61.54.5.124","61.54.5.236","61.54.5.237","61.54.5.241","61.54.6.76","61.54.6.77","61.54.6.104","61.54.6.171","61.54.9.0","61.54.10.0","61.54.12.0","61.54.13.238","61.54.13.239","61.54.14.1","61.54.22.241","61.54.25.200","61.54.27.0","61.54.29.0","61.54.30.162","61.54.30.166","61.54.33.10","61.54.33.11","61.54.35.15","61.54.35.18","61.54.35.52","61.54.35.54","61.54.35.59","61.54.35.65","61.54.35.67","61.54.35.68","61.54.35.70","61.54.35.101","61.54.35.108","61.54.35.152","61.54.37.45","61.54.38.203","61.54.39.10","61.54.39.11","61.54.42.16","61.54.42.157","61.54.42.249","61.54.44.194","61.54.44.214","61.54.47.0","61.54.50.11","61.54.51.1","61.54.58.232","61.54.59.9","61.54.59.17","61.54.59.83","61.54.59.89","61.54.60.0","61.54.61.154","61.54.62.64","61.54.62.120","61.54.63.1","61.54.63.3","61.54.63.8","61.54.63.20","61.54.69.102","61.54.73.93","61.54.73.177","61.54.74.0","61.54.75.118","61.54.75.126","61.54.79.97","61.54.80.2","61.54.80.10","61.54.80.18","61.54.80.34","61.54.82.82","61.54.82.130","61.54.86.52","61.54.88.2","61.54.88.38","61.54.88.42","61.54.88.66","61.54.88.74","61.54.88.181","61.54.93.12","61.54.93.70","61.54.93.129","61.54.95.12","61.54.100.130","61.54.101.18","61.54.101.50","61.54.106.188","61.54.107.187","61.54.110.35","61.54.110.233","61.54.115.0","61.54.116.85","61.54.116.92","61.54.116.103","61.54.117.253","61.54.118.3","61.54.119.46","61.54.119.93","61.54.120.129","61.54.123.99","61.54.123.102","61.54.123.103","61.54.123.104","61.54.123.106","61.54.123.124","61.54.123.211","61.54.123.214","61.54.123.215","61.54.123.216","61.54.123.217","61.54.123.221","61.54.123.226","61.54.123.230","61.54.126.249","61.54.128.41","61.54.128.207","61.54.129.114","61.54.131.14","61.54.131.18","61.54.131.22","61.54.131.34","61.54.131.38","61.54.131.39","61.54.131.40","61.54.131.41","61.54.131.43","61.54.131.46","61.54.131.51","61.54.131.53","61.54.131.55","61.54.131.56","61.54.131.57","61.54.131.82","61.54.131.86","61.54.131.94","61.54.131.116","61.54.131.117","61.54.131.118","61.54.131.119","61.54.131.120","61.54.131.121","61.54.131.122","61.54.131.130","61.54.131.131","61.54.131.132","61.54.131.154","61.54.131.162","61.54.131.173","61.54.131.186","61.54.131.222","61.54.131.226","61.54.131.230","61.54.131.234","61.54.131.238","61.54.131.242","61.54.131.246","61.54.131.250","61.54.133.10","61.54.134.222","61.54.135.251","61.54.141.96","61.54.142.15","61.54.142.99","61.54.142.130","61.54.142.131","61.54.142.132","61.54.142.133","61.54.142.134","61.54.142.135","61.54.142.136","61.54.142.138","61.54.142.140","61.54.142.141","61.54.142.146","61.54.142.150","61.54.142.154","61.54.142.158","61.54.142.163","61.54.142.164","61.54.142.165","61.54.142.167","61.54.142.168","61.54.142.169","61.54.142.170","61.54.142.171","61.54.142.172","61.54.142.186","61.54.142.190","61.54.142.198","61.54.143.94","61.54.143.182","61.54.143.230","61.54.145.12","61.54.145.15","61.54.145.32","61.54.145.40","61.54.145.43","61.54.145.47","61.54.145.61","61.54.145.104","61.54.145.129","61.54.148.193","61.54.148.196","61.54.149.7","61.54.149.15","61.54.149.16","61.54.149.100","61.54.149.101","61.54.149.110","61.54.149.111","61.54.149.136","61.54.149.137","61.54.149.138","61.54.150.4","61.54.150.14","61.54.150.16","61.54.150.19","61.54.150.21","61.54.150.25","61.54.150.26","61.54.150.27","61.54.150.31","61.54.150.37","61.54.150.171","61.54.150.204","61.54.150.216","61.54.150.239","61.54.151.2","61.54.151.3","61.54.151.10","61.54.155.54","61.54.155.58","61.54.160.0","61.54.171.251","61.54.178.143","61.54.184.10","61.54.184.20","61.54.185.22","61.54.186.67","61.54.186.68","61.54.186.107","61.54.186.108","61.54.186.144","61.54.186.145","61.54.186.178","61.54.186.179","61.54.186.180","61.54.186.181","61.54.186.182","61.54.186.183","61.54.186.184","61.54.186.186","61.54.186.187","61.54.190.189","61.54.191.139","61.54.219.0","61.54.246.189","61.54.248.90","61.54.250.172","61.54.252.74","61.54.253.2","61.54.253.28","61.54.254.170","61.54.254.173","61.54.254.174","61.133.194.178","61.133.208.126","61.133.218.226","61.136.64.0","61.136.65.34","61.136.65.36","61.136.65.131","61.136.65.133","61.136.65.134","61.136.65.135","61.136.65.136","61.136.66.42","61.136.68.54","61.136.68.81","61.136.68.86","61.136.68.102","61.136.68.166","61.136.68.242","61.136.69.6","61.136.69.38","61.136.69.62","61.136.69.138","61.136.70.38","61.136.70.54","61.136.70.58","61.136.70.86","61.136.70.98","61.136.70.110","61.136.70.114","61.136.70.118","61.136.70.122","61.136.70.142","61.136.70.146","61.136.70.186","61.136.70.206","61.136.72.130","61.136.73.18","61.136.73.206","61.136.76.22","61.136.76.154","61.136.77.202","61.136.79.210","61.136.85.34","61.136.93.54","61.136.93.86","61.136.99.4","61.136.99.6","61.136.99.48","61.136.105.14","61.136.107.131","61.136.108.134","61.136.108.138","61.136.108.142","61.136.108.146","61.136.108.150","61.136.108.170","61.136.108.174","61.136.108.182","61.136.108.186","61.136.108.190","61.136.108.210","61.136.110.18","61.136.110.19","61.136.110.20","61.136.110.22","61.136.110.23","61.136.110.24","61.136.110.25","61.136.110.26","61.136.110.27","61.136.110.28","61.136.110.29","61.136.110.34","61.136.110.35","61.136.110.38","61.136.110.40","61.136.110.58","61.136.113.2","61.136.113.38","61.136.114.158","61.136.116.66","61.136.116.67","61.136.116.68","61.136.116.70","61.136.116.71","61.136.116.73","61.136.116.115","61.136.116.116","61.136.116.118","61.136.116.120","61.136.116.123","61.136.116.126","61.136.119.118","61.136.122.0","61.136.124.86","61.136.216.25","61.143.103.105","61.146.40.26","61.146.40.186","61.146.42.6","61.155.235.62","61.158.132.70","61.158.132.76","61.158.132.79","61.158.132.88","61.158.133.0","61.158.137.242","61.158.145.248","61.158.149.251","61.158.150.59","61.158.155.106","61.158.158.97","61.158.158.101","61.158.159.208","61.158.159.209","61.158.168.43","61.158.168.81","61.158.168.86","61.158.168.135","61.158.168.253","61.158.169.8","61.158.169.9","61.158.169.11","61.158.169.59","61.158.169.61","61.158.169.90","61.158.169.100","61.158.169.103"];
module.exports = {
    /**
     * ip 转 int
     * @returns {number}
     */
    ip2int:function(){
        var num = 0;
        ip = ip.split(".");
        num = Number(ip[0]) * 256 * 256 * 256 + Number(ip[1]) * 256 * 256 + Number(ip[2]) * 256 + Number(ip[3]);
        num = num >>> 0;
        return num;
    },
    /**
     * int 转 ip
     * @returns {string|*}
     */
    int2ip(){
        var str;
        var tt = new Array();
        tt[0] = (num >>> 24) >>> 0;
        tt[1] = ((num << 8) >>> 24) >>> 0;
        tt[2] = (num << 16) >>> 24;
        tt[3] = (num << 24) >>> 24;
        str = String(tt[0]) + "." + String(tt[1]) + "." + String(tt[2]) + "." + String(tt[3]);
        return str;
    },
    /**
     * @getClientIP
     * @desc 获取用户 ip 地址
     * @param {Object} req - 请求
     */
    getClientIP:function(req) {
        return req.headers['x-forwarded-for'] || // 判断是否有反向代理 IP
            req.connection.remoteAddress || // 判断 connection 的远程 IP
            req.socket.remoteAddress || // 判断后端的 socket 的 IP
            req.connection.socket.remoteAddress;
    },
    /**
     * 获取随机IP（机器人使用）
     */
    getRandomIP:function(){
        var randomNum = commonUtil.randomFrom(0,ips.length-1);
        return ips[randomNum];
    }
}
