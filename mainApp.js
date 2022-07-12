/**
 * Created by kamal on 20/04/19.
 */

process.env.TZ = 'Asia/Kolkata';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.log(new Date());
global.projectHome = __dirname;
global.commonUtil = require(projectHome + '/utils/common-util');
global.ENV = process.env.LMS_ENV || 'dev';
console.log('global.ENV',process.env.LMS_ENV);
if (!ENV) {
	console.log("Please set your system's environment on key LMS_ENV!!!");
	console.log("For ubuntu command: export LMS_ENV=dev");
}
console.log("Current environment is: " + ENV);
let commonConfig = require(projectHome + '/config/default.json');
let envConfig = require(projectHome + '/config/' + ENV + ".json");

global.config = commonUtil.mergeObjects(commonConfig, envConfig);

if(config.lmsAppEnabled){
	const lms_app = require('./lms_app');
	lms_app.initialize({fork:true,useDb:true});
}

if(config.downloadEnabled){
	require('./fileServer');
}

if(config.gpsApiEnabled){
	const apiApp = require('./gpsApi/apiServer');
	apiApp.initialize();
}

if (config.reporting) {
	const reportApp = require('./reportingApp');
	reportApp.initialize(config.reporting);
}
if(config.cacheVehicle){
	const tracingApp = require('./vehiclewise/trackingServer');
	tracingApp.initialize({fork:false,useDb:false});
}

