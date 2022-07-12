const request = require('request-promise');
const RegisteredVehicleService = promise.promisifyAll(commonUtil.getService("registeredVehicle"));
const CronJob = require('cron').CronJob;
let optionsAuth,optionsPostData;
if(config.mindaServer) {
  const job = new CronJob({
    cronTime: '00 */' + config.mindaServer.minInt + ' * * * *',
    onTick: function () {
      fFetchAndPost();
    },
    start: true
  });

  optionsAuth = {
    method: 'POST',
    uri: config.mindaServer.oAuth,
    body: {
      username: config.mindaServer.username,
      password: config.mindaServer.password,
    },
    headers: {
      'Authorization': config.mindaServer.token
    },
    json: true
  };
  optionsPostData = {
    method: 'POST',
    uri: config.mindaServer.postData,
    body: {
      foo: 'bar'
    },
    headers: {
        'Authorization': config.mindaServer.token,
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
	let reqBody = {clientId:'10808',no_of_docs:2000,segment_type:{$in:['Container 12T','Goods']},'gpsData.datetime':{$gte:dt}};
	reqBody.project = {vehicle_reg_no:1,'gpsData':1};
	promise.promisify(fFetchGpsData)(reqBody).then(function (gpsData) {
		let oData = {payload:gpsData};//,token:authResponse.access_token} TODO removed oaut
		return promise.promisify(fGpsDataPostRequest)(oData);
	}).then(function (jresp) {
	   // Deal with the error
		console.log('minda post done without error');
	});
	//}
};
let fFetchGpsData = function(reqBody,callback){
	RegisteredVehicleService.searchRegisteredVehicleAggrAsync(reqBody)
		.then(function(respp) {
			let devs = respp.data;
			let resp = [];
			for (let i = 0; i < devs.length; i++) {
				let dev = devs[i];

				if(dev && dev.gpsData){
					if(dev.gpsData.speed>65){
						dev.gpsData.speed = 59;
					}
					resp.push({
						vehicleUIN: dev.vehicle_reg_no,
						transporterCode:'ups',
						latitude: dev.gpsData.lat,
						longitude: dev.gpsData.lng,
						speed: dev.gpsData.speed,
						timestamp: new Date(dev.gpsData.datetime).getTime(),
						distance: dev.gpsData.odo,
						ignitionStatus:dev.gpsData.acc,
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
	optionsPostData.body = postData_;
	request(optionsPostData)
		.then(function (response,rest) {
			// Handle the response
			callback(null,response);
		}).error(function (err) {
		// Deal with the error
		console.log(' error in minda',err.toString);
		callback(err);
	    }).catch(function (err) {
			// Deal with the error
			callback(err);
		});
};

function testCB(err,resp) {
	console.log('minda fetch',err.toString());
}
/*
setTimeout(function(){
	let reqBody = {clientId:'10808',no_of_docs:2000,segment_type:'Container 10T',"gpsData":{$exists:true}};
	reqBody.project = {vehicle_reg_no:1,'gpsData':1};
	fFetchGpsData(reqBody,testCB);
},3000);


*/
