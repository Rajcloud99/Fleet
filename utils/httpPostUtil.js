const request = require('request-promise');

const optionsSocketServer = {
	method: 'POST',
	uri: '',
	body: {
		foo: 'bar'
	},
	headers: {
		'Authorization' : ''
	},
	json: true
};

module.exports.postToSocketServer = function (postData, token, path, callback) {
	let postData_ = JSON.parse(JSON.stringify(postData));
	optionsSocketServer.uri = config.gpsServer + path;
	optionsSocketServer.headers.Authorization = token;
	optionsSocketServer.body = postData_;

	request(optionsSocketServer)
		.then(function (response) {
			// Handle the response
			callback(null,response);
		})
		.catch(function (err) {
			// Deal with the error
			callback(err);
		});
};

