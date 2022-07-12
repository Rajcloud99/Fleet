const request = require('request');

module.exports.getIpAsync = () => {
	return new Promise((resolve, reject) => {
		getIp((err, res) => {
			if(err) return reject(err);
			resolve(res);
		});
	});
};

function getIp(callback) {
	const url = 'http://myexternalip.com/raw';
	request(url, {
		timeout: 3000
	}, function(error, response, body) {
		if (error) {
			return callback(null, 'localhost');
		}
		callback(null, body);
	});
}
