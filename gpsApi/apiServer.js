let express = require('express');
let apiApp = express();
let httpLogger = require('morgan')('dev');
let compression = require('compression');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let cors = require('cors');
// Added to accept request from other ports.
apiApp.configureHeaders = function() {
	apiApp.all('*', function(req, res, next) {
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
		res.header('Access-Control-Allow-Credentials', true);
		res.header('Access-Control-Max-Age', '86400');
		res.header('Access-Control-Allow-Headers',
			'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization');
		next();
	});
};

apiApp.configureRoutes = function() {
	apiApp.use('/api/getdata', require('./axestrack'));
	apiApp.use('/gpsApi/', require('./pragati'));
	apiApp.use('/basf/', require('./basf'));
	apiApp.use('/tvs/', require('./tvs'));
};
apiApp.configureViews = function() {
	//app.set('views', projectHome + '/views');
	apiApp.set('view engine', 'hbs');
};

function errorHandler (err, req, res, next) {
	res.status(500).json({ error: err.toString() });
}

apiApp.configureUtilities = function() {
	apiApp.use(httpLogger);
	apiApp.use(bodyParser.json({limit: '50mb'}));
	apiApp.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
	apiApp.use(cookieParser());
	apiApp.use(cors());
	apiApp.use(compression());
	apiApp.use(errorHandler);
};
apiApp.initialize = function() {
	apiApp.configureUtilities();
	apiApp.configureHeaders();
	apiApp.configureRoutes();
	};
let apiServer = apiApp.listen(commonUtil.getConfig('api_port'), function() {
	console.log("gpa api listening on port : " + commonUtil.getConfig('api_port'));
	let today = new Date();
	console.log(config.isProductionServer ? 'Production' : (config.isTestServer ? 'Test' : 'Develop'), 'API Server started at :', new Date(today).toLocaleString());
    require('./minda');
	require('./t4u');
	if (commonUtil.getConfig('debug')) {
		require('debug')('node-server')('Express server listening on port ' + server.address().port);
	}
});
module.exports = apiApp;
