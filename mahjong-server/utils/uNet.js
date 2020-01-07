const net = require('net');
const MSG = require('../common/msg')
const split_str = '+'

module.exports = {
    /**
     * 
     * @param {*} msg 
     * @param {*} data 
     * @param {*} err 
     */
    toJson(msg, err, _data) {
        let data = null;
        if (_data) {
            data = _data;
        }
        else {
            data = {};
        }
        data.msg = msg;
        if (err) {
            data.err = err;
        }
        return JSON.stringify(data);
    },
    /**
     * 
     * @param {Buffer} buffer
     */
    fromJson(buffer) {
        let str = buffer.toString();
        let data = str.split(split_str)
        let arr_data = []
        for (const key in data) {
            if (data[key] != "") {
                arr_data.push(JSON.parse(data[key]));
            }
        }
        return arr_data
    },
    /**
     * 
     * @param {net.Socket} socket 
     * @param {*} msg 
     * @param {*} err 
     * @param {*} _data 
     */
    send(socket, msg, err, _data) {
        const data = this.toJson(msg, err, _data) + split_str;
        let buffer = Buffer.from(data)
        socket.write(buffer, function (params) {
            // console.log('OKKKKKKKKKK');
        })
    },
    createServer() {
        return net.createServer()
    },
    /**
     * 
     * @param {net.Server} server 
     * @param {net.Socket[]} clients 
     * @param {*} dealMsgFun 
     * @param {} self 
     */
    serverOnConnection(server, clients, dealMsgFun, self) {
        server.on('connection', (client) => {
            var ip = client.remoteAddress;
            if (ip.indexOf("::ffff:") != -1) {
                ip = ip.substr(7);
            }
            const index = ip + ":" + client.remotePort

            client.on('close', (had_error) => {
                for (const index in clients) {
                    for (const key in clients[index]) {
                        if (clients[index][key].client == client) {
                            if (clients[index].length == 1) {
                                delete clients[index]
                            } else {
                                clients[index].splice(key, 1);
                            }
                        }
                    }
                }
                // console.log(index + "链接是否因为传输错误关闭：" + had_error);
            })

            client.on('end', () => {
                for (const index in clients) {
                    for (const key in clients[index]) {
                        if (clients[index][key].client == client) {
                            if (clients[index].length == 1) {
                                delete clients[index]
                            } else {
                                clients[index].splice(key, 1);
                            }
                        }
                    }
                }
            })

            client.on('error', (err) => {
                console.log(index + "链接发生错误：" + err.toString());
            })

            client.on('data', (buffer) => {
                const data = this.fromJson(buffer);
                for (const key in data) {
                    dealMsgFun(client, data[key], self);
                }
            })
        })

        server.on('error', (err) => {
            console.log(err);
        })
    },
    createClient(port, host, local_port) {
        let options = {
            port: port,
            host: host,
            localPort: local_port,
            family: 4,
        }
        let socket = net.createConnection(options)
        socket.on('close', (had_error) => {
            setTimeout(() => {
                socket.connect(options);
            }, 1000);            
            // console.log("链接是否因为传输错误关闭：" + had_error);
        })
        return socket;
    },
    /**
     * 
     * @param {net.Socket} client 
     * @param {Function} dealMsgFun 
     */
    clientOnConnection(client, dealMsgFun) {
        // client.on('close', (had_error) => {
            // console.log("链接是否因为传输错误关闭：" + had_error);
        // })

        client.on('end', () => {
            console.log("服务器关闭链接");
        })

        client.on('error', (err) => {
            console.log("链接发生错误：" + err.toString());
            // client.connect();
        })

        client.on('data', (buffer) => {
            const data = this.fromJson(buffer);
            for (const key in data) {
                dealMsgFun(client, data[key]);
            }
        })
    }
}