let express = require('express');
let fileApp = express();
fileApp.use(express.static(__dirname + '/files'));
fileApp.use('/', express.static(__dirname + '/views/bills'));
fileApp.use('/', express.static(__dirname + '/node_modules'));
fileApp.use(express.static(__dirname + '/sapXmlFiles'));
let downloadServer = fileApp.listen(commonUtil.getConfig('download_port'), function () {
	console.log("file download server listening on port : " + commonUtil.getConfig('download_port'));
	if (commonUtil.getConfig('debug')) {
		require('debug')('node-server')('Express file download server listening on port ' + downloadServer.address().port);
	}
});
