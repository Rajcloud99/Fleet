const request = require('request-promise');
const RegisteredVehicleService = promise.promisifyAll(commonUtil.getService("registeredVehicle"));
const CronJob = require('cron').CronJob;
const dateUtils = require('../utils/dateutils');
let optionsAuth,optionsPostData;
if(config.t4uServer) {
	const job = new CronJob({
		cronTime: '00 */' + config.t4uServer.minInt + ' * * * *',
		onTick: function () {
			fFetchAndPost();
		},
		start: true
	});

	optionsAuth = {
		method: 'POST',
		uri: config.t4uServer.oAuth,
		body: {
			username: config.t4uServer.username,
			password: config.t4uServer.password,
		},
		headers: {
			'accesskey': config.t4uServer.accesskey
		},
		json: true
	};
	optionsPostData = {
		method: 'POST',
		uri: config.t4uServer.postData,
		body: {
			LocationData : []
		},
		headers: {
			username: config.t4uServer.username,
			password: config.t4uServer.password,
			accesskey: config.t4uServer.accesskey,
			'Content-Type':'application/json'
		},
		json: true
	};
}
let currentTime = Date.now()/1000;
let authResponse;

let fFetchAndPost = function () {
	currentTime = Date.now()/1000;
	/*
	if(authResponse && authResponse.access_token && currentTime - authResponse.time < authResponse.expires_in-20){
		promise.promisify(fFetchGpsData)()
			.then(function (gpsData) {
				let oData = {};
				fGpsDataPostRequest();
			});
	}else {
		promise.promisify(fAuthTokenRequest)(optionsAuth)
			.then(function (oAuth) {
				authResponse = oAuth;

				return promise.promisify(fFetchGpsData)();

			})
	*/
	var dt = new Date();
	dt = dt.setDate(dt.getDate()-5);
	let reqBody = {clientId:'10808',no_of_docs:2000,segment_type:'Container 6T','gpsData.datetime':{$gte:dt}};
	promise.promisify(fFetchGpsData)(reqBody).then(function (gpsData) {
		let oData = {payload:gpsData};//,token:authResponse.access_token} TODO removed oaut
		return promise.promisify(fGpsDataPostRequest)(oData);
	}).then(function (jresp) {
		// Deal with the error
		console.log('monda post done without error');
	});
	//}
};
let fFetchGpsData = function(reqBody,callback){
	RegisteredVehicleService.searchRegisteredVehicleAsync(reqBody)
		.then(function(respp) {
			let devs = respp.data;
			let resp = [];
			for (let i = 0; i < devs.length; i++) {
				let dev = devs[i];
				if(dev && dev.gpsData && dev.gpsData.datetime){
					if(dev.gpsData.speed>65){
						dev.gpsData.speed = 59;
					}
					let dt = dateUtils.getDMYHMSMs(dev.gpsData.datetime);
					resp.push({
						unit_no : dev.vehicle_reg_no,
						assetId: dev.vehicle_reg_no,
						latitude: dev.gpsData.lat,
						longitude: dev.gpsData.lng,
						speed: dev.gpsData.speed,
						gps_datetime: dt,
						gmt:dt,
						distance: dev.gpsData.odo,
						ignitionStatus:dev.gpsData.acc,
						countryCode:'IN',
						//addressLineOne : "",
						signalSource:"GPS",

					});
				}
			}
			return callback(null,resp);
		}).catch(callback);
};
let fAuthTokenRequest = function (oData, callback) {
	request(optionsAuth)
		.then(function (response) {
			// Handle the response
			callback(null,response);
		})
		.catch(function (err) {
			// Deal with the error
			callback(err);
		});
};
let fGpsDataPostRequest = function (oData, callback) {
	let postData_ = JSON.parse(JSON.stringify(oData.payload));
	//optionsPostData.headers.Authorization = oData.token;
	optionsPostData.body.LocationData = postData_;
	request(optionsPostData)
		.then(function (response,rest) {
			// Handle the response
			callback(null,response);
		}).error(function (err) {
		// Deal with the error
		console.log(' error in t4uServer');
		callback(err);
	}).catch(function (err) {
		// Deal with the error
		callback(err);
	});
};
