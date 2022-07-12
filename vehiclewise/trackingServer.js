let express = require('express');
let tracingApp = express();
let httpLogger = require('morgan')('dev');
let compression = require('compression');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let cors = require('cors');
// Added to accept request from other ports.
tracingApp.configureHeaders = function() {
	tracingApp.all('*', function(req, res, next) {
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
		res.header('Access-Control-Allow-Credentials', true);
		res.header('Access-Control-Max-Age', '86400');
		res.header('Access-Control-Allow-Headers',
			'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization');
		next();
	});
};

tracingApp.configureRoutes = function() {
	tracingApp.use('/api/tracking', commonUtil.getController('tracking'));
};
tracingApp.configureViews = function() {
	tracingApp.set('view engine', 'hbs');
};

function errorHandler (err, req, res, next) {
	res.status(500).json({ error: err.toString() });
}
tracingApp.setupDB = function (oInitialize) {
	if(!oInitialize.useDb) return;
	console.log('called in tracking app to init db');
	const mongoConf = config.mongoDB;
	let Uri = "mongodb://";
	if (mongoConf.user) {
		Uri = Uri + mongoConf.user + ":" + mongoConf.password + "@"
	}
	Uri = Uri + mongoConf.host + ":" + mongoConf.port + "/" + mongoConf.db;
	mongoose.connect(Uri, {
		useMongoClient: true,
		autoIndex: false,
		poolSize: 100,
		keepAlive: true,
		bufferMaxEntries: 0
	}, function (err) {
		if (err) return console.log('app.js err ' + err);
		return console.log('Connected to MongoDB ' + Uri);
	});
	mongoose.connection.once('open', () => {
		//require(projectHome + '/utils/gps-util');
		/*const cacheVeh = commonUtil.getConfig('cacheVehicle');
		if(cacheVeh && cacheVeh.runOnInit){
			require('./vehiclewise/trackingServer');
		}*/
	});
};
tracingApp.configureUtilities = function() {
	tracingApp.use(httpLogger);
	tracingApp.use(bodyParser.json({limit: '50mb'}));
	tracingApp.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
	tracingApp.use(cookieParser());
	tracingApp.use(cors());
	tracingApp.use(compression());
	tracingApp.use(errorHandler);
};
tracingApp.setupChildProcesses = function (oInitialize) {
	if(!oInitialize.fork) return;
	console.log('called in tracking app to fork child process');
	global.vwChild = child_process.fork(`${__dirname}/vehiclewise/index.js`, [], {
		//detached: false,
		stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
		env: {LMS_ENV: process.env.LMS_ENV || 'dev',runCron:'runCron'},
		//execArgv: [],
		execArgv: ['--inspect-brk'], // enable this for debugging purposes
	});
	console.log('process id in main',process.pid,process.ppid);
	console.log('vwChild id in main',vwChild.pid,vwChild.ppid);
	// When process is killed
	global.vwChild.on('exit', function (code, signal) {
		console.log('child process exited with ' + `code ${code} and signal ${signal}`);
	});
	// Fires when stdin, stdout, stderr streams get closed, but process is alive
	global.vwChild.on('close', function (code, signal) {
		console.log('child process closed with ' + `code ${code} and signal ${signal}`);
	});
	// When dbdata is received
	global.vwChild.on('message', (vwData) => {
		console.log('message from child vwData');
		global.vwData = vwData;
	});
	global.vwChild.send({ runCron: true });
};
tracingApp.initialize = function(oInitialize) {
	tracingApp.setupDB(oInitialize);
	if (oInitialize.fork && config.cacheVehicle && config.cacheVehicle.fork) {
		tracingApp.setupChildProcesses(oInitialize);
	}
	tracingApp.configureUtilities();
	tracingApp.configureHeaders();
	tracingApp.configureRoutes();
};
let apiServer = tracingApp.listen(commonUtil.getConfig('tracking_port'), function() {
	console.log(" tracingApp listening on port : " + commonUtil.getConfig('tracking_port'));
	let today = new Date();
	//require('./index').runCron();//TODO when run on another server
	console.log(config.isProductionServer ? 'Production' : (config.isTestServer ? 'Test' : 'Develop'), 'tracing Server started at :', new Date(today).toLocaleString());
	if (commonUtil.getConfig('debug')) {
		require('debug')('node-server')('Express server listening on port ' + server.address().port);
	}
});
module.exports = tracingApp;
