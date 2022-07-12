"use strict";
let fs = require('fs');
let child_process = require('child_process');
let express = require('express');
let compression = require('compression');
global.projectHome = __dirname;
global.numberUtils = require('./lms/utility/number.utility');
global.dateUtil = require(projectHome + '/utils/dateutils');
let favicon = require('serve-favicon');
//let httpLogger = require('morgan')('dev');
let httpLogger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let Promise = require('bluebird');
let mongoose = Promise.promisifyAll(require('mongoose'));
mongoose.Promise = Promise;
let passport = require('passport');
let winston = require('winston');
let app = express();
//let fileApp = express();
let cors = require('cors');
//let multer = require('multer');
let accessControl = require("./accessControl");
let _ = require('lodash');

let Handlebars = require('hbs');
let handleBarHelper = require(projectHome + '/utils/handleBarHelper');
Handlebars.registerHelper(handleBarHelper);

/****** Indian Time Zone ******/
//process.env.TZ = 'Asia/Kolkata';
//console.log(new Date());
global.passport = passport;
global.mongoose_delete = require('mongoose-delete');
global.ValidationError = mongoose.Error.ValidationError;
global.ValidatorError = mongoose.Error.ValidatorError;
global.commonUtil = require(projectHome + '/utils/common-util');
global.validator = require('express-validator');

/////////setting configs`
//global.ENV=process.env.LMS_ENV;
/*
global.ENV = process.env.LMS_ENV || 'dev';
if (!ENV) {
	console.log("Please set your system's environment on key LMS_ENV!!!");
	console.log("For ubuntu command: export LMS_ENV=dev");
}
console.log("Current environment is: " + ENV);
let commonConfig = require(projectHome + '/config/default.json');
let envConfig = require(projectHome + '/config/' + ENV + ".json");
global.config = commonUtil.mergeObjects(commonConfig, envConfig);
*/

global.telegram = require(projectHome + "/utils/telegramBotUtil");

global.mongoose = mongoose;
global.express = express;
global.path = require('path');
global.winston = winston;
global.promise = Promise;
global.async = require('async');
global.constant = require(path.join(projectHome, "constant"));
global.app_constant = require(path.join(projectHome, "app_constant.json"));
global.logger = require(projectHome + '/utils/logger-util');
global.idUtil = Promise.promisifyAll(require(projectHome + '/utils/idUtil'));
global.otherUtil = Promise.promisifyAll(require(projectHome + '/utils/other-util'));
global.smsUtil = Promise.promisifyAll(require(projectHome + '/utils/sms-util'));
global.counterUtil = Promise.promisifyAll(require(projectHome + '/utils/counter-util'));
global.emailUtil = Promise.promisifyAll(require(projectHome + '/utils/email-util'));
global.remoteClientUtil = Promise.promisifyAll(require(projectHome + '/utils/remoteClient-util'));
global.googlePlaceUtil = Promise.promisifyAll(require(projectHome + '/utils/googlePlaceAPI-util'));
global.sha512Util = Promise.promisifyAll(require(projectHome + '/utils/sha512-util'));
global.gcmNotification = Promise.promisifyAll(require(projectHome + '/utils/notification-util'));
global.xmlbuilder = Promise.promisifyAll(require(projectHome + '/utils/xmlbuilder-util'));
global.ftpUtil = Promise.promisifyAll(require(projectHome + '/utils/ftp-util'));
global.serverSidePagination = Promise.promisifyAll(require(projectHome + '/utils/serverSidePagination'));
global.dashBoardClientDirty = {};
global.strings = require(path.join(projectHome, "strings"));
global.vwData = {};
global.runningReq = {};

//Password Encryption and Decryption***************************
let crypto = require('crypto'),
	algorithm = 'aes192',
	PasswordSecretKey = commonUtil.getConfig('user_pass_key');

global.encrypt = function (value) {
	let cipher = crypto.createCipher(algorithm, PasswordSecretKey);
	let crypted = cipher.update(value, 'utf8', 'hex');
	crypted += cipher.final('hex');
	return crypted;
};

global.decrypt = function (value) {
	let decipher = crypto.createDecipher(algorithm, PasswordSecretKey);
	let dec = decipher.update(value, 'hex', 'utf8');
	dec += decipher.final('utf8');
	return dec;
};

let scheduler = require(projectHome + '/utils/schedulerUtil');

//app.disable('etag');
app.configureViews = function () {
	//app.set('views', projectHome + '/views');
	app.set('view engine', 'hbs');
};

function errorHandler(err, req, res, next) {
	if(runningReq[req.body.request_id]){
		//console.log('deleting request id from errorHandler',req.body.request_id);
		delete runningReq[req.body.request_id];
	}
	res.status(500).json({error: err.toString()});
}

app.configureUtilities = function () {
	//app.use(favicon(projectHome + '/public/favicon2.ico'));
	app.set('etag', false);
	app.use(httpLogger(function (tokens, req, res) {
		if(runningReq[req.body.request_id]){
			//console.log('deleting request id',req.body.request_id);
			if(!tokens['response-time'](req, res) || tokens['response-time'](req, res) == 0){
				console.log([
					'prevent deleting request id',
					tokens.method(req, res),
					tokens.url(req, res),
					tokens.status(req, res),
					tokens.res(req, res, 'content-length'), '-',
					tokens['response-time'](req, res), 'ms',
					(req.user && req.user.name) || ( req.user && req.user.full_name ) ||  '',
					(req.user && req.user.clientId || ''),
					new Date().toLocaleString()
				].join(' '));
			}else{
				delete runningReq[req.body.request_id];
			}
		}
		if(tokens['response-time'](req, res) && tokens['response-time'](req, res) >  5000){
			return [
				'Taking long Time',
				tokens.method(req, res),
				tokens.url(req, res),
				tokens.status(req, res),
				tokens.res(req, res, 'content-length'), '-',
				tokens['response-time'](req, res), 'ms',
				(req.user && req.user.name) || ( req.user && req.user.full_name ) ||  '',
				(req.user && req.user.clientId || ''),
				new Date().toLocaleString()
			].join(' ');
		}else{
			console.log([
				tokens.method(req, res),
				tokens.url(req, res),
				tokens.status(req, res),
				tokens.res(req, res, 'content-length'), '-',
				tokens['response-time'](req, res), 'ms',
				(req.user && req.user.name) || ( req.user && req.user.full_name ) ||  '',
				(req.user && req.user.clientId || ''),
				new Date().toLocaleString()
			].join(' '));
			return;
		}
	}, {
			skip: function (req, res) {
				//console.log(res.statusCode,req.skipMe,res.skipMe);
				//return res.statusCode < 400;
			}
		}));
	app.use(bodyParser.json({limit: '50mb'}));
	app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
	app.use(cookieParser());
	app.use(cors());
	app.use(compression());
	app.use(errorHandler);
	app.use(myRunningRequest);
};

app.setupChildProcesses = function () {
	global.vwChild = child_process.fork(`${__dirname}/vehiclewise/vehicleCache.js`, ['cacheVehicleDependency'], {
		//detached: false,
		stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
		env: {LMS_ENV: process.env.LMS_ENV || 'dev',runCacheCron:'runCacheCron'},
		execArgv: [],
		//execArgv: ['--inspect-brk'], // enable this for debugging purposes
	});
	console.log('process id in main',process.pid,process.ppid);
	console.log('vwChild id in main',vwChild.pid,vwChild.ppid);
	// When process is killed
	global.vwChild.on('exit', function (code, signal) {
		console.log('child process exited with ' + `code ${code} and signal ${signal}`);
	});
	global.vwChild.on('disconnect', function (code, signal) {
		console.log('child process disconnect with ' + `code ${code} and signal ${signal}`);
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
	global.vwChild.send({ runCacheCron: true });
};

app.setupDB = function (oInitialize) {
	const mongoConf = config.mongoDB;
	let Uri = "mongodb://";
	if (mongoConf.user) {
		Uri = Uri + mongoConf.user + ":" + mongoConf.password + "@"
	}
	Uri = Uri + mongoConf.host + ":" + mongoConf.port + "/" + mongoConf.db;
	let options = {
		useMongoClient: true,
		autoIndex: true,
		poolSize: 100,
		connectTimeoutMS:480000,
		socketTimeoutMS:300000,
		keepAlive: 300000,
		//bufferCommands:false,
		bufferMaxEntries: 5
	};
	if(mongoConf.slaveOk){
		options.db = {
			readPreference: 'secondary',
			slaveOk: mongoConf.slaveOk ? mongoConf.slaveOk : false
		  };
		options.replSet =  {
	    	replicaSet: mongoConf.replicaSet ? mongoConf.replicaSet :  'rs0'
		  }
		}

	mongoose.connect(Uri, options, function (err) {
		if (err) return console.error('app.js err ' + err);
		return console.log('Connected to MongoDB ' + Uri);
	});
	mongoose.connection.once('open', () => {
		if(oInitialize.fork && config.cacheVehicle){
			let cronJob = require('./vehiclewise/vehicleCache');
		   cronJob.runCacheCron();
		}
	});
};

app.setUpScheduler = function () {
	let ipUtil = commonUtil.getUtil("ip-utils");
	ipUtil.getIpAsync().then(function (ip) {
		if (config.serverName) {
			config.serverName = config.serverName + " :" + ip + " : " + commonUtil.getConfig('http_port');
		} else {
			config.serverName = ip + " : " + commonUtil.getConfig('http_port');
		}
		let today = new Date();
		telegram.sendMessage(config.serverName + ' (LMSV2) started at :', new Date(today).toLocaleString());
		console.log(config.serverName + ' (LMSV2) started at :', new Date(today).toLocaleString());
	});
	if (commonUtil.getConfig('enable_scheduler')) {
		console.log("scheduler enabled : true");
		scheduler();
	}
};

app.initAuth = function () {
	app.use(passport.initialize());
	let authUtil = commonUtil.getUtil("auth-util");
	authUtil.localSetup();
	// authUtil.jwtSetup();
	//authUtil.authorizationSetup(mongoose.connection.db);
};
// Added to accept request from other ports.
app.configureHeaders = function () {
	app.all('*', function (req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		if (req.headers.origin) {
			//console.log('req.headers.origin',req.headers.origin)
			//res.header('Access-Control-Allow-Origin', req.headers.origin);
		}
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS ,PATCH');
		res.header('Access-Control-Allow-Credentials', true);
		res.header('Access-Control-Max-Age', '86400');
		res.header("Access-Control-Allow-Headers",
			"Origin, X-Requeted-With, Content-Type, Accept, Authorization, RBR, X-HTTP-Method-Override");
		next();
	});
};

/**** Introduced so as local api testing doesn't require tokens.
 Make true before pushing***/
//global.envProduction = true;
let server;
app.configureRoutes = function () {
	let authUtil = commonUtil.getUtil("auth-util");
	app.use('/api/gpsIntegration', require('./gpsIntegration/gpsApi'));
	app.use('/api/serverEvent', function (req, res, next) {
		if(req.body.sClose && req.body.sCode == 'lms@738'){
			console.log('Http server close request');
			server.close((err,servRes) => {
				console.log('Http server closed.');
				return res.status(200).json({
					message: (err && err.message) || 'Http server closed.' ,
					status:'OK'
				});
			});
		}
	});
	//app.use('/api/getdata', require('./gpsApi/axestrack'));
	app.all('/*', function (req, res, next) {
		//if(ENV == 'test' || ENV=='dev') return next();

		req._authTokenMatchKey = "authWeb";
		const userAgent = req.headers['user-agent'];
		if(userAgent.match(/Android|okhttp/))
			req._authTokenMatchKey = 'authAndroid'
		else if(userAgent.match(/like Mac OS X/))
			req._authTokenMatchKey = 'authIOS';

		return next();
		if (config.originAllowed && config.refererAllowed) {
			let origin = req.headers.origin;
			let referer = req.headers.referer;

			if (origin && origin[origin.length - 1] === "/") {
				origin = origin.substring(0, origin.length - 1);
			}
			if (referer && referer[referer.length - 1] === "/") {
				referer = referer.substring(0, referer.length - 1);
			}
			if (!config.originAllowed[origin] || !config.refererAllowed[referer]) {
				return res.status(404).send("Not found");
			}
			else {
				return next();
			}
		}
		else {
			return next();
		}
	});

	app.use('/api/public/driver', commonUtil.getController('driverPublic'));
	app.use('/auth', commonUtil.getController('auth'));
	app.all('/api/*', authUtil.authenticateUser);
	app.use('/', commonUtil.getController('home'));
	app.use('/documents', commonUtil.getController('document'));
	app.use('/api/dashboard', commonUtil.getController('dashBoard'));
	app.use('/api/roles', commonUtil.getController('roles'));
	app.use('/api/users', authUtil.authenticateRoutes, commonUtil.getController('users'));
	app.use('/api/department', authUtil.authenticateRoutes, commonUtil.getController('department'));
	app.use('/api/client', authUtil.authenticateRoutes, commonUtil.getController('client'));
	app.use('/api/material', commonUtil.getController('material'));
	app.use('/api/branch', authUtil.authenticateRoutes, commonUtil.getController('branch'));
	app.use('/api/driver', /*authUtil.authenticateRoutes,*/ commonUtil.getController('driver'));
	app.use('/api/vehicle', commonUtil.getController('vehicle'));
	app.use('/api/upload', authUtil.authenticateRoutes, commonUtil.getController('upload'));
	app.use('/api/download', authUtil.authenticateRoutes, commonUtil.getController('download'));
	app.use('/api/regvehicle', /*authUtil.authenticateRoutes,*/ commonUtil.getController('registeredVehicle'));
	app.use('/api/vendor/transport', authUtil.authenticateRoutes, commonUtil.getController('vendorTransport'));
	app.use('/api/vendor/fuel', authUtil.authenticateRoutes, commonUtil.getController('vendorFuel'));
	app.use('/api/fuel_station', authUtil.authenticateRoutes, commonUtil.getController('fuelStation'));
	app.use('/api/vendor/maintenance/', authUtil.authenticateRoutes, commonUtil.getController('vendorMaintenance'));
	app.use('/api/customerRateChart', authUtil.authenticateUser, commonUtil.getController('customerRateChart'));
	app.use('/api/commanRate', commonUtil.getController('commanRate'));
	app.use('/api/vendor/courier/', authUtil.authenticateRoutes, commonUtil.getController('vendorCourier'));
	app.use('/api/courier_office', authUtil.authenticateRoutes, commonUtil.getController('courierOffice'));
	app.use('/api/transportroute/', authUtil.authenticateRoutes, commonUtil.getController('transportRoute'));
	app.use('/api/customer/', /*authUtil.authenticateRoutes,*/ commonUtil.getController('customer'));
	app.use('/api/contract/', authUtil.authenticateRoutes, commonUtil.getController('contract'));
	app.use('/api/routedata/'/*, authUtil.authenticateRoutes*/, commonUtil.getController('routeData'));
	app.use('/api/shippingline/', authUtil.authenticateRoutes, commonUtil.getController('shippingLine'));
	app.use('/api/fleet/'/*, authUtil.authenticateRoutes*/, commonUtil.getController('fleet'));
	app.use('/api/tableAccess/'/*, authUtil.authenticateRoutes*/, commonUtil.getController('tableAccess'));
	app.use('/api/tableConfiguration/'/*, authUtil.authenticateRoutes*/, commonUtil.getController('tableConfiguration'));
	app.use('/api/icd/', authUtil.authenticateRoutes, commonUtil.getController('icd'));
	app.use('/api/accidentVehicle'/*, authUtil.authenticateRoutes*/, commonUtil.getController('accidentVehicle'));
	app.use('/api/driverCounselling'/*, authUtil.authenticateRoutes*/, commonUtil.getController('driverCounselling'));
	app.use('/api/bookings', /*authUtil.authenticateRoutes,*/ commonUtil.getController('booking'));
	app.use('/api/trip_gr'/*,authUtil.authenticateRoutes*/, commonUtil.getController('tripGrV2'));
	app.use('/api/logs'/*,authUtil.authenticateRoutes*/, commonUtil.getController('logs'));
	app.use('/api/trip_grreport'/*,authUtil.authenticateRoutes*/, commonUtil.getController('reportCron'));
	app.use('/api/tripGrReport'/*,authUtil.authenticateRoutes*/, commonUtil.getController('reportCron'));
	app.use('/api/tripGrReportDown'/*,authUtil.authenticateRoutes*/, commonUtil.getController('reportCron'));
	app.use('/api/trips'/*,authUtil.authenticateRoutes*/, commonUtil.getController('tripV2'));
	//app.use('/api/tripsreco'/*,authUtil.authenticateRoutes*/, commonUtil.getController('tripV2'));
	app.use('/api/dues'/*,authUtil.authenticateRoutes*/, commonUtil.getController('dues'));
	app.use('/api/dph'/*,authUtil.authenticateRoutes*/, commonUtil.getController('dph'));
	app.use('/api/genBill'/*,authUtil.authenticateRoutes*/, commonUtil.getController('genBill'));
	app.use('/api/incentives'/*,authUtil.authenticateRoutes*/, require('./lms/controllers/incentive.controller'));
	app.use('/api/liveTrack'/*,authUtil.authenticateRoutes*/, commonUtil.getController('liveTrack'));
	app.use('/api/city', commonUtil.getController('city'));
	app.use('/api/directory', commonUtil.getController('directory'));
	app.use('/api/bills', commonUtil.getController('bills'));
	app.use('/api/gr', authUtil.authenticateRoutes, commonUtil.getController('gr'));
	app.use('/api/grStatus', authUtil.authenticateRoutes, commonUtil.getController('grStatus'));
	app.use('/api/tripLocation', authUtil.authenticateRoutes, commonUtil.getController('tripLocations'));
	app.use('/api/vendorRoute', authUtil.authenticateRoutes, commonUtil.getController('vendorRoute'));
	app.use('/api/invoice', authUtil.authenticateRoutes, commonUtil.getController('invoice'));
	app.use('/api/trip_expenses', authUtil.authenticateRoutes, commonUtil.getController('tripExpense'));
	app.use('/api/departmentBranch', authUtil.authenticateRoutes, commonUtil.getController('departmentBranch'));
	app.use('/api/userPref'/*, authUtil.authenticateRoutes*/, commonUtil.getController('userPref'));
	app.use('/api/reports', commonUtil.getController("report"));
	app.use('/api/reports/v2', commonUtil.getController("newReport"));
	app.use('/api/sapXml', authUtil.authenticateRoutes, commonUtil.getController('sapXml'));
	app.use('/api/accesscontrol', authUtil.authenticateRoutes, commonUtil.getController('accessControl'));
	app.use('/api/consignor_consignee', /*authUtil.authenticateRoutes,*/ commonUtil.getController('consignor_consignee'));
	app.use('/api/billingParty', /*authUtil.authenticateRoutes,*/  commonUtil.getController('billingParty'));
	app.use('/api/pdf', commonUtil.getController('pdf'));
	app.use('/api/skeleton', commonUtil.getController('skeleton'));
	app.use('/api/template', commonUtil.getController('template'));
	app.use('/api/billBook', commonUtil.getController('billBook'));
	app.use('/api/billStationary', commonUtil.getController('billStationary'));
	app.use('/api/stationery', commonUtil.getController('stationery'));
	app.use('/api/tripAdvances', commonUtil.getController('tripAdvances'));
	app.use('/api/coverNote', commonUtil.getController('coverNote'));
	app.use('/api/creditNote', commonUtil.getController('creditNote'));
	app.use('/api/debitNote', commonUtil.getController('debitNote'));
	app.use('/api/ewayBill', commonUtil.getController('eWayBill'));
	app.use('/api/moneyReceipt', commonUtil.getController('moneyReceipt'));
	app.use('/api/assetsCategory', commonUtil.getController('assetsCategory'));
	app.use('/api/tdsRate', commonUtil.getController('tdsRate'));
	app.use('/api/vendorQuotes', commonUtil.getController('vendorQuote'));
	app.use('/api/trip_memo'/*,authUtil.authenticateRoutes*/, commonUtil.getController('tripMemo'));
	app.use('/api/brokerMemo'/*,authUtil.authenticateRoutes*/, commonUtil.getController('brokerMemo'));

	/* Assets Module*/
	app.use('/api/assets'/*,authUtil.authenticateRoutes*/, commonUtil.getController('assets'));

	/* dms Module*/
	app.use('/api/dms'/*,authUtil.authenticateRoutes*/, commonUtil.getController('datamanagements'));

	/** Accounts Module **/
	app.use('/api/accounts', /*authUtil.authenticateRoutes,*/ commonUtil.getController('accounts'));
	app.use('/api/voucher', /*authUtil.authenticateRoutes,*/ commonUtil.getController('accountsVoucher'));
	app.use('/api/voucher2', /*authUtil.authenticateRoutes,*/ commonUtil.getController('voucher'));
	app.use('/api/vehicleExp', /*authUtil.authenticateRoutes,*/ commonUtil.getController('vehicleExpense'));
	app.use('/api/plain_voucher',/* authUtil.authenticateRoutes,*/ commonUtil.getController('plainVoucher'));
	app.use('/api/vehicledriverasso', commonUtil.getController('vehicleDriverAssociation'));

	app.use('/api/loading_manager', /*authUtil.authenticateRoutes,*/ commonUtil.getController('loadingManager'));

	/** Maintenance Module **/
	app.use('/api/maintenance/manufacturer',/*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('manufacturer'));
	app.use('/api/maintenance/partcategory',/*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('partCategory'));
	app.use('/api/maintenance/vendor', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('vendorMaintenance_'));
	app.use('/api/maintenance/Parts', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('parts'));
	app.use('/api/maintenance/mechanic', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('mechanic'));
	app.use('/api/maintenance/inventory', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('inventory'));
	app.use('/api/maintenance/tool', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('tool'));
	app.use('/api/maintenance/toolissue', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('toolIssue'));
	app.use('/api/maintenance/vehicle_model', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('model'));
	app.use('/api/maintenance/taskMaster', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('taskMaster'));
	app.use('/api/maintenance/jobCard', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('jobCard'));
	app.use('/api/maintenance/task', /*authUtil.authenticateRoutes,*/commonUtil.getMaintenanceController('task'));
	app.use('/api/maintenance/pr', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('pr'));
	app.use('/api/maintenance/po', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('po'));
	app.use('/api/maintenance/spareUse', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('spareUse'));
	app.use('/api/maintenance/spareIssue', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('spareIssue'));
	app.use('/api/maintenance/trailerMaster', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('trailerMaster'));
	app.use('/api/maintenance/structureMaster', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('structureMaster'));
	app.use('/api/maintenance/primeMoverTrailerAssociation', /*authUtil.authenticateRoutes,*/commonUtil.getMaintenanceController('primeMoverTrailerAssociation'));
	app.use('/api/maintenance/otherExpenses', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('otherExpenses'));
	app.use('/api/maintenance/tyreMaster', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('tyreMaster'));
	app.use('/api/maintenance/tyreIssue', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('tyreIssue'));
	app.use('/api/maintenance/tyreRetread', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('tyreRetread'));
	app.use('/api/maintenance/contractor', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('contractor'));
	app.use('/api/maintenance/contractor_expense', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('contractor_expense'));
	app.use('/api/maintenance/diesel', /*authUtil.authenticateRoutes,*/ commonUtil.getMaintenanceController('diesel'));

	/** gps management module **/
	app.use('/api/gps/sim_master', commonUtil.getGpsController('simMaster'));
	app.use('/api/gps/device_type_master', commonUtil.getGpsController('deviceTypeMaster'));
	app.use('/api/gps/device_master', commonUtil.getGpsController('deviceMaster'));
	app.use('/api/gps/device_master_slip', require('./gpsmanagement/DeviceMasterSlip/deviceMasterSlip.controller'));

	/** mrp **/
	app.use('/api/quotation', commonUtil.getMRPController('quotation'));
	app.use('/api/so', commonUtil.getMRPController('so'));
	app.use('/api/soInvoice', commonUtil.getMRPController('invoice'));
	app.use('/api/tracking', commonUtil.getController('tracking'));
	app.use('/api/configs', commonUtil.getController('schemaConfiguration'));
	app.use('/api/fpa-master', commonUtil.getController('fpaMaster'));
	app.use('/api/fpa-bill', commonUtil.getController('fpaBill'));
	app.use('/api/account_balances', commonUtil.getController('accountbalances'));
	app.use('/api/utility', /*authUtil.authenticateRoutes,*/ commonUtil.getController('mixedUtility'));
	app.use('/api/directory', /*authUtil.authenticateRoutes,*/ commonUtil.getController('directory'));

	/** GPS APIs **/
	//app.use('/gpsApi/', require('./gpsApi/pragati'));


};

app.configureErrorHandlers = function () {
	//catch 404 as error
	app.use(function (req, res, next) {
		let err = new Error('Not Found');
		err.status = 404;
		next(err);
	});
	// Dont show stack trace on production
	if (commonUtil.getConfig('env') === 'production') {
		app.use(function (err, req, res, next) {
			if(runningReq[req.body.request_id]){
				console.log('deleting req_id from configureErrorHandlers',req.body.request_id);
				delete runningReq[req.body.request_id];
			}
			logger.error("app.jsconfigureErorrHandlers", err.message);
			return res.status(err.status || 500).render('error', {
				message: err.message,
				error: {}
			});
		});
	} else {
		app.use(function (err, req, res, next) {
			logger.error("dev env app.jsconfigureErorrHandlers", err.toString());
			return res.status(err.statusCode || 500).json({
				'status': 'ERROR',
				'message': err.message || err.toString()
			});
		});
	}
};

var myRunningRequest = function (req, res, next) {
	//console.log('myRunningRequest',req.url,req.method,req.status,req.stateCode);
	if(runningReq[req.body.request_id]){
		console.log('duplicate request',runningReq[req.body.request_id]);
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'duplicate request '+ runningReq[req.body.request_id].url
		});
	}
	if(!req.body.request_id){
		let aUr = req.url.split('/');
		let rGUID = "";
        if(aUr[aUr.length-2]){
			rGUID = aUr[aUr.length-2].charAt(0);
		}
		if(aUr[aUr.length-1]){
			rGUID = rGUID + aUr[aUr.length-1].charAt(0);
		}
		req.body.request_id = rGUID +"-"+ Date.now();
	}
	runningReq[req.body.request_id] = {st:'r',u:req.url};
	next();
};

app.initialize = function (oInitialize) {
	app.setupDB(oInitialize);
	app.configureUtilities();
	app.initAuth();
	app.configureHeaders();
	app.configureRoutes();
	app.configureErrorHandlers();
	app.configureViews();
	app.setUpScheduler();
};

if(!config.reporting || true){//don't start in reporting server
	server = app.listen(commonUtil.getConfig('http_port'), function () {
		if (commonUtil.getConfig('debug')) {
			require('debug')('node-server')('Express server listening on port ' + server.address().port);
		}
	});
	server.timeout = 30000;
}
process.on('unhandledRejection', (err) => {
	winston.error("unhandledRejection " + err && err.message);
});
process.on('exit', (err) => {
	winston.error("exit signal on process " + (err && err.toString()));
	console.log('Closing http server.');
	server.close(() => {
		console.log('Http server closed.');
		mongoose.connection.close(false, () => {
			console.log('MongoDb connection closed.');
			setTimeout(function() {
				console.log('Finished closing connections');
				process.exit(0);
			}, 3000);
		});
	});
	if(global.vwChild && global.vwChild.disconnect){
		console.log('child process exit called');
		global.vwChild.disconnect();
	}
});
process.on('beforeExit', (err) => {
	winston.error("beforeExit signal on process " + (err && err.toString()));
});
process.on('disconnect', (err) => {
	winston.error("disconnect signal on process " + (err && err.toString()));
});
process.on('SIGINT', () => {//SIGTERM
	console.info('SIGINT signal received.',new Date().toLocaleDateString());
	console.log('Closing http server.');
	server.close(() => {
		console.log('Http server closed.');
		mongoose.connection.close(false, () => {
			console.log('MongoDb connection closed.');
			setTimeout(function() {
				console.log('Finished closing connections');
				process.exit(0);
			}, 3000);
		});
		if(global.vwChild && global.vwChild.disconnect){
			console.log('child process exit called');
			global.vwChild.disconnect();
		}

	});
});
module.exports = app;

// function defination's

