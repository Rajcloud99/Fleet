let express = require('express');
let reportApp = express();
//let httpLogger = require('morgan')('dev');
let httpLogger = require('morgan');
let compression = require('compression');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let cors = require('cors');
let child_process = require('child_process');
global.runningReqReport = {};
// Added to accept request from other ports.
reportApp.configureHeaders = function() {
	reportApp.all('*', function(req, res, next) {
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
		res.header('Access-Control-Allow-Credentials', true);
		res.header('Access-Control-Max-Age', '86400');
		res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization');
		next();
	});
};

reportApp.configureRoutes = function() {
	let authUtil = commonUtil.getUtil("auth-util");
	reportApp.all('/api/*', authUtil.authenticateUser);
	reportApp.use('/api/branch', authUtil.authenticateRoutes, commonUtil.getController('branch'));
	reportApp.use('/api/dashboard', commonUtil.getController('dashBoard'));
	reportApp.use('/api/regvehicle', authUtil.authenticateRoutes, commonUtil.getController('registeredVehicle'));
	reportApp.use('/api/customerRateChart', authUtil.authenticateUser, commonUtil.getController('customerRateChart'));
	reportApp.use('/api/transportroute/', authUtil.authenticateRoutes, commonUtil.getController('transportRoute'));
	reportApp.use('/api/bookings', /*authUtil.authenticateRoutes,*/ commonUtil.getController('booking'));
	reportApp.use('/api/consignor_consignee', /*authUtil.authenticateRoutes,*/ commonUtil.getController('consignor_consignee'));
	reportApp.use('/api/billingParty', /*authUtil.authenticateRoutes,*/  commonUtil.getController('billingParty'));
	reportApp.use('/api/trips', require('./lms/controllers/tripV2Controller'));
	reportApp.use('/api/trip_gr', require('./lms/controllers/tripGrV2Controller'));
	reportApp.use('/api/logs'/*,authUtil.authenticateRoutes*/, commonUtil.getController('logs'));
	reportApp.use('/api/tripAdvances', require('./lms/controllers/tripAdvancesController'));
	reportApp.use('/api/reports', require('./lms/controllers/reportController'));
	reportApp.use('/api/reports/v2', commonUtil.getController("newReport"));
	reportApp.use('/api/voucher', require('./lms/controllers/accountsVoucherController'));
	reportApp.use('/api/voucher2', require('./lms/controllers/voucherController'));
	reportApp.use('/api/tripGrReportDown', require('./lms/controllers/reportCronController'));
	reportApp.use('/api/bills', commonUtil.getController('bills'));
	reportApp.use('/api/tracking', commonUtil.getController('tracking'));
	reportApp.use('/api/moneyReceipt', commonUtil.getController('moneyReceipt'));
	reportApp.use('/api/creditNote', commonUtil.getController('creditNote'));
	reportApp.use('/api/billStationary', commonUtil.getController('billStationary'));
	reportApp.use('/api/account_balances', commonUtil.getController('accountbalances'));
};

reportApp.configureViews = function() {
	reportApp.set('view engine', 'hbs');
};

function errorHandler (err, req, res, next) {
	if(runningReqReport[req.body.request_id]){
		//console.log('deleting request id from errorHandler',req.body.request_id);
		delete runningReqReport[req.body.request_id];
	}
	res.status(500).json({ error: err.toString() });
}

reportApp.configureUtilities = function() {
	//reportApp.use(httpLogger);
	reportApp.use(httpLogger(function (tokens, req, res) {
			if(runningReqReport[req.body.request_id]){
				//console.log('deleting request id',req.body.request_id);
				if(!tokens['response-time'](req, res) || tokens['response-time'](req, res) == 0){
					console.log([
						'prevent deleting request id',
						tokens.method(req, res),
						tokens.url(req, res),
						tokens.status(req, res),
						tokens.res(req, res, 'content-length'), '-',
						tokens['response-time'](req, res), 'ms',
						new Date().toLocaleString()
					].join(' '));
				}else{
					delete runningReqReport[req.body.request_id];
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
					new Date().toLocaleString()
				].join(' ');
			}else{
			  return [
				  tokens.method(req, res),
				  tokens.url(req, res),
				  tokens.status(req, res),
				  tokens.res(req, res, 'content-length'), '-',
				  tokens['response-time'](req, res), 'ms',
				  new Date().toLocaleString()
			  ].join(' ');
			}
		},
		{
			skip: function (req, res) {
				//console.log(res.statusCode,req.skipMe,res.skipMe);
				//return res.statusCode < 400;
			}
		}));
	reportApp.use(bodyParser.json({limit: '50mb'}));
	reportApp.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
	reportApp.use(cookieParser());
	reportApp.use(cors());
	reportApp.use(compression());
	reportApp.use(errorHandler);
	reportApp.use(myRunningRequestReport);
};
var myRunningRequestReport = function (req, res, next) {
	//console.log('myRunningRequestReport',req.url,req.method,req.status,req.stateCode,req.body.request_id);
	if(runningReqReport[req.body.request_id]){
		console.log('duplicate request',req.body.request_id,runningReqReport[req.body.request_id]);
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'duplicate request '+ runningReqReport[req.body.request_id].url
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
		//console.log('generation request_id',req.body.request_id);
	}
	runningReqReport[req.body.request_id] = {st:'r',u:req.url};
	next();
};

reportApp.initialize = function(opts) {
	reportApp.configureUtilities();
	reportApp.configureHeaders();
	reportApp.configureRoutes();
};

let apiServer = reportApp.listen(commonUtil.getConfig('reporting_port'), function() {
	console.log("listening reporting app on port : " + commonUtil.getConfig('reporting_port'));
	let today = new Date();
	console.log(config.isProductionServer ? 'Production' : (config.isTestServer ? 'Test' : 'Develop'), config.serverName+' Server started at :', new Date(today).toLocaleString());
	if (commonUtil.getConfig('debug')) {
		require('debug')('node-server')('Express server listening on port ' + server.address().port);
	}
});
apiServer.timeout = 300000;
module.exports = reportApp;
