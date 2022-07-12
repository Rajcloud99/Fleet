const net = require('net');
const split = require('split');
const handler = require('./handler');

class Receiver {
	constructor(ip,port) {
		this.ip = ip;
		this.port = port;
		this.cache = [];
        this.connect();
	}

	sendMessage(message) {
		if (message) this.cache.push(JSON.stringify(message));
		if (this.socket && this.socket.connecting) return;
		if (!this.socket || this.socket.destroyed) return this.connect();

		while (this.cache.length > 0) {
			// winston.info('sending', this.cache[0]);
			this.socket.write(Buffer.from(this.cache[0] + '\n'));
			this.cache.splice(0, 1);
		}
	}

	connect() {
		const _this = this;
		this.socket = new net.Socket();
		this.socket.connect(this.port, this.ip, function () {
			_this.sendMessage(null);
			console.log("Connection Attempt");
		});
		const stream = this.socket.pipe(split());
		stream.on('data', function (data) {
			// winston.info(data);
			try {
				data = JSON.parse(data);
				handler(data);
			} catch (err) {
				winston.error('json parse err', err);
			}
		});

		this.socket.on('error', function (err) {
			// do nothing since close will be called after this
			winston.error('rs err', err);
		});

		this.socket.on('close', function (err) {
			//winston.error('rs err close', err);
			// _this.connect();
		});

		this.socket.on('end', function (err) {
			//winston.error('rs err end', err);
			// _this.connect();
		});

	}

	sendHeartbeat() {
		const id = Math.floor(Math.random() * 1000);
		// winston.info('sending hb', id);
		this.sendMessage({ft: 'h', id: id});
	}

}

module.exports = Receiver;
