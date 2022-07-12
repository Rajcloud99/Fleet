/**
 * @Author: Kamal
 * @Date:   2016-12-02
 * "gpsgaadi_token":"100003maple2017KkZytr","gpsgaadi_user_id":"maple"
 * "gpsgaadi_token":"100002mapletest2017KkZytr","gpsgaadi_user_id":"kamal"
 */

let request = require('request');
let ClientService = promise.promisifyAll(commonUtil.getService('client'));
let gpsgaadiAdminToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiJncHNnYWFkaUFkbWluIiwicmFuZF9pbnQiOjI3MTA4MjIwfQ.ddnRIuiyqvpZrFtvx29yrGAA-hQTgDR-G89mIueW9Ic';
let httPostUtil = promise.promisifyAll(require('../../utils/httpPostUtil.js'));

exports.getSingleLocation = function (reg_no, callback) {
	request.post({
		headers: {'content-type': 'application/json', 'Authorization': gpsgaadiAdminToken},
		url: 'http://trucku.in:8081/api/location/getLocationFromRegno',
		body: JSON.stringify({reg_no: reg_no})
	}, function (error, response, body) {
		if (body) body = JSON.parse(body);
		if (error) {
			winston.error('getLocationFromRegno', error);
			callback(error);
			return;
		}
		if (body.status != 'OK') {
			callback('no data found');
			return;
		}
		callback(error, body.data);
	});
};

exports.fillTripsWithLocation = function (trips, callback) {
	async.each(trips.data, function (trip, done) {
		if (trip.trip_start.status && !trip.trip_end.status) {
			promise.promisify(exports.getSingleLocation)(trip.vehicle_no)
				.then(function (loc) {
					if (trip.vehicle_no != loc.reg_no) console.error('vehicle no mismached ', trip.vehicle_no, loc.reg_no);
					trip.current_location = {
						lat: loc.lat,
						lng: loc.lng,
						address: loc.address,
						positioning_time: loc.positioning_time,
						location_time: loc.location_time
					};
					done();
				})
				.error(function (err) {
					console.log('was in .error');
					done();
				});
		} else {
			console.log('trip ended');
			done();
		}
	}, function (err) {
		callback(null, trips);
	});
};

exports.fillVehiclesWithLocation = function (aVehicle, callback) {
	async.forEachOf(aVehicle, function (oVehicle, key, done) {
		if (oVehicle && oVehicle.trip_doc && oVehicle.trip_doc[0]) {
			promise.promisify(exports.getSingleLocation)(oVehicle.vehicle_reg_no)
				.then(function (loc) {
					aVehicle[key].trip_doc[0].current_location = {
						lat: loc.lat,
						lng: loc.lng,
						address: loc.address,
						positioning_time: loc.positioning_time,
						location_time: loc.location_time
					};
					done();
				})
				.error(function () {
					done();
				});
		} else {
			done();
		}
	}, function (err) {
		callback(null, aVehicle);
	});
};

exports.createTripOnGPSGAADI = function (oTrip, callback) {
	ClientService.findClientByQueryAsync({"clientId": oTrip.clientId})
		.then(function (client) {
			client = JSON.parse(JSON.stringify(client));
			let tripPayload = JSON.parse(JSON.stringify(oTrip));
			let client_token;
			if (client && client[0] && client[0].gpsgaadi_token) {
				client_token = client[0].gpsgaadi_token;
			}
			/*else{
                            client_token = "Axzzyyuu889878drft";//for testing only
                        }*/
			if (client && client[0] && client[0].gpsgaadi_user_id) {
				tripPayload.user_id = client[0].gpsgaadi_user_id;
			}
			/*else{
                            tripPayload.user_id = "kamal";
                        }*/
			if (client_token && tripPayload.user_id) {
				//console.log(config.get("gpsServer"));

				tripPayload = prepareGPSGAADITripData(tripPayload);
				console.log("******************************************************************************")
				console.log('sdsdsdsadas', tripPayload)

				request.post({
					headers: {'content-type': 'application/json', 'Authorization': client_token},
					url: config.gpsServer + '/api/extrips/addTrip',
					body: JSON.stringify(tripPayload)
				}, function (error, response, body) {
					if (body) body = JSON.parse(body);
					if (error) {
						winston.error('getLocationFromRegno', error);
						callback(error);
						return;
					}
					if (body.status != 'OK') {
						callback('no data found');
						return;
					}
					return callback(error, body.data);
				});
			}
		});
};

function prepareGPSGAADITripData(oLMSTrip) {
	let src, dst;
	let route;
	if (oLMSTrip.route && oLMSTrip.route.route_name) {
		src = oLMSTrip.route.route_name;
		route = oLMSTrip.route.route_name;
		if (oLMSTrip.route.route_name.split('to')[0] && oLMSTrip.route.route_name.split('to')[1]) {
			src = oLMSTrip.route.route_name.split('to')[0];
			dst = oLMSTrip.route.route_name.split('to')[1];
			if (oLMSTrip.route.route_name.split('to')[2]) {
				dst = dst + ", " + oLMSTrip.route.route_name.split('to')[2];
			}
		}
	}
	let oGPSTrip = {
		"user_id": oLMSTrip.user_id,
		"branch": oLMSTrip.branch,
		"source": src || 'NA',
		"destination": dst || 'NA',
		//"duration": "3d12h30min",
		"vehicle_no": oLMSTrip.vehicle_no.toUpperCase(),
		"driver_name": oLMSTrip.driver_name,
		"driver_contact": oLMSTrip.driver_contact,
		"trip_no": oLMSTrip.trip_no ? oLMSTrip.trip_no.toString() : '0',
		"extrip_no": oLMSTrip.clientId + "-" + oLMSTrip.trip_no,
		"driver": oLMSTrip.driver_name,
		"manager": oLMSTrip.trip_manager ? oLMSTrip.trip_manager.name : 'NA',
		"geozones": [],
		"route": route,
		"owner_group": oLMSTrip.owner_group,
		"vehicle_status": "Booked"

	};
	//let uniqueGeozones = [];
	if (oLMSTrip.gr && oLMSTrip.gr[0]) {
		oGPSTrip.customer = oLMSTrip.gr[0].customer_name;
	}
	//akash changes geogencing
	//binding geofence point in uniqueGeozones
	for (let i = 0; i < oLMSTrip.gr.length; i++) {
		for (let j = 0; j < oLMSTrip.gr[i].geofence_points.length; j++) {
			oLMSTrip.gr[i].geofence_points[j].created_at = Date.now() + +j * 300;
			oGPSTrip.geozones.push(oLMSTrip.gr[i].geofence_points[j]);
		}
	}

	// for(let i=0;i<oLMSTrip.gr.length;i++){
	// 	if(oLMSTrip.gr[i].loading_point && oLMSTrip.gr[i].loading_point.location && oLMSTrip.gr[i].loading_point.location.lat && uniqueGeozones.indexOf(oLMSTrip.gr[i].loading_point.name) <= -1 ){
	// 		uniqueGeozones.push(oLMSTrip.gr[i].loading_point.name);
	// 		oGPSTrip.geozones.push(getGeozone(oLMSTrip.gr[i].loading_point,'tds',i));
	// 	}
	// 	if(oLMSTrip.gr[i].unloading_point && oLMSTrip.gr[i].unloading_point.location && oLMSTrip.gr[i].unloading_point.location.lat && uniqueGeozones.indexOf(oLMSTrip.gr[i].unloading_point.name) <= -1){
	// 		uniqueGeozones.push(oLMSTrip.gr[i].unloading_point.name);
	// 		oGPSTrip.geozones.push(getGeozone(oLMSTrip.gr[i].unloading_point,'unloading',i+1));
	// 	}
	// }
	return oGPSTrip;
}

function prepareUpdateGPSGAADITripData(oLMSTrip, status) {
	let oGPSTrip = {
		"user_id": oLMSTrip.user_id,
		"vehicle_no": oLMSTrip.vehicle_no.toUpperCase(),
		"driver": oLMSTrip.driver,
		"driver_no": oLMSTrip.driver_no,
		"status": status,
		"trip_id": oLMSTrip.trip_id || oLMSTrip.gTrip_id
	};
	if (status == "start") {
		oGPSTrip.start_time = oLMSTrip.trip_start.time;
	}
	else if (status == "complete") {
		oGPSTrip.end_time = oLMSTrip.trip_end.time;
		oGPSTrip.enabled = 0;
		oGPSTrip.customer = "NA";
		oGPSTrip.route = "NA";
	}
	return oGPSTrip;
}

function getGeozone(oPoint, type, i) {
	return {
		"name": oPoint.name,
		"addr": oPoint.address || oPoint.addr,
		"lat": oPoint.location.lat,
		"lng": oPoint.location.lng,
		"sms": oPoint.contact_person_name,
		"email": oPoint.contact_person_email,
		"type": type || "loading",//["tds","unloading","landmark"]
		"category": oPoint.category,
		"entry": 1,
		"exit": 1,
		"enabled": 1,
		"loc": oPoint.loc,
		"created_at": Date.now() + i * 300 //ramdomize creation time to uniquly identify landmarks
	};
};

exports.updateTripOnGPSGAADI = function (oTrip, status, callback) {
	ClientService.findClientByQueryAsync({"clientId": oTrip.clientId})
		.then(function (client) {
			client = JSON.parse(JSON.stringify(client));
			let tripPayload = JSON.parse(JSON.stringify(oTrip));
			let client_token;
			if (client && client[0] && client[0].gpsgaadi_token) {
				client_token = client[0].gpsgaadi_token;
			}
			/*else{
                            client_token = "Axzzyyuu889878drft";//for testing only
                        }*/
			if (client && client[0] && client[0].gpsgaadi_user_id) {
				tripPayload.user_id = client[0].gpsgaadi_user_id;
			}
			/*else{
                            tripPayload.user_id = "kamal";
                        }*/

			if (client_token && tripPayload.user_id) {
				tripPayload = prepareUpdateGPSGAADITripData(tripPayload, status);
				console.log(tripPayload);
				request.post({
					headers: {'content-type': 'application/json', 'Authorization': client_token},
					url: config["gpsServer"] + '/api/extrips/updateTrip',
					body: JSON.stringify(tripPayload)
				}, function (error, response, body) {
					if (body) body = JSON.parse(body);
					if (error) {
						winston.error('getLocationFromRegno', error);
						callback(error);
						return;
					}
					if (body.status != 'OK') {
						callback('no data found');
						console.log(response.message);
						return;
					}
					callback(error, body.data);
				});
			}
		});

};

exports.updateVehicleOnGPSGAADI = function (oVehicle, callback) {
	ClientService.findClientByQueryAsync({"clientId": oVehicle.clientId})
		.then(function (client) {
			client = JSON.parse(JSON.stringify(client));
			let vehiclePayload = JSON.parse(JSON.stringify(oVehicle));
			let client_token;
			if (client && client[0] && client[0].gpsgaadi_token) {
				client_token = client[0].gpsgaadi_token;
			}
			if (client && client[0] && client[0].gpsgaadi_user_id) {
				vehiclePayload.user_id = client[0].gpsgaadi_user_id;
			}

			if (client_token && vehiclePayload.user_id) {
				request.post({
					headers: {'content-type': 'application/json', 'Authorization': client_token},
					url: config["gpsServer"] + '/api/extrips/updateVehiceStatus',
					body: JSON.stringify(vehiclePayload)
				}, function (error, response, body) {
					if (body) body = JSON.parse(body);
					if (error) {
						winston.error('updateVehiceStatus', error);
						callback(error);
						return;
					}
					if (body.status !== 'OK') {
						console.log(response.message);
						return callback('no data found');
					}
					callback(error, body.data);
				});
			}
		});

};

exports.allocateIMEI = function (oData, callback) {
	ClientService.findClientByQueryAsync({"clientId": oData.clientId})
		.then(function (client) {
			client = JSON.parse(JSON.stringify(client));
			let oPayload = JSON.parse(JSON.stringify(oData));
			let client_token;
			if (client && client[0] && client[0].gpsgaadi_token) {
				client_token = client[0].gpsgaadi_token;
			}
			if (client && client[0] && client[0].gpsgaadi_user_id) {
				oPayload.user_id = client[0].gpsgaadi_user_id;
			}
			if (client_token && oPayload.user_id) {
				oPayload = prepareGPSGAADIDeviceAllocationData(oPayload);
				request.post({
					headers: {'content-type': 'application/json', 'Authorization': client_token},
					url: config.gpsServer + '/api/device/associate_device',
					body: JSON.stringify(oPayload)
				}, function (error, response, body) {
					if (body) body = JSON.parse(body);
					if (error) {
						winston.error('getLocationFromRegno', error);
						callback(error);
						return;
					}
					if (body.status !== 'OK') {
						callback('no data found');
						return;
					}
					return callback(error, body.data);
				});
			}
		});

};

exports.registerDevice = function (oData, callback) {
	ClientService.findClientByQueryAsync({"clientId": oData.clientId})
		.then(function (client) {
			client = JSON.parse(JSON.stringify(client));
			let oPayload = JSON.parse(JSON.stringify(oData));
			let client_token;
			if (client && client[0] && client[0].gpsgaadi_token) {
				client_token = client[0].gpsgaadi_token;
			}
			if (client && client[0] && client[0].gpsgaadi_user_id) {
				oPayload.selected_uid = client[0].gpsgaadi_user_id;
			}
			if (client_token && oPayload.user_id) {
				httPostUtil.postToSocketServerAsync(oPayload, client_token,
					'/api/device/register_device')
					.then(function (response) {
						return callback(null, response);
					}).catch(callback);
			}
		});

};

exports.deRegisterDevice = function (oData, callback) {
	httPostUtil.postToSocketServerAsync(oData, oData.client_token,
		'/api/device/deregister_device')
		.then(function (response) {
			return callback(null, response);
		}).catch(callback);
};

function prepareGPSGAADIDeviceAllocationData(oData) {
	return {
		"selected_uid": oData.user_id,
		"new_uid": oData.allocateGpsUserID,
		"login_uid": oData.user_id,
		"devices": oData.devices
	}
}

function getOdometer(req, callback) {
	let url = "http://trucku.in:8081";
	if(config.gpsApi){
		url = config.gpsApi.host+":"+config.gpsApi.port;
	}
	let payload = {
        device_id : req.device_imei,
		end_time: req.datetime
	};
	request.post({
		headers: {'content-type': 'application/json', 'Authorization': gpsgaadiAdminToken},
		url: url+'/api/reports/odometer',
		body: JSON.stringify(payload)
	}, function (error, response,body) {
		if (error) {
			winston.error('getOdometer', error);
			return callback(error,{});
		}
		if (body){
			try {
				body = JSON.parse(body);
				if (body.status != 'OK') {
					return callback(error,{});
				}
				if(Array.isArray(body.data)){
					return callback(error, body.data[0]);
				}else{
					return callback(error, body.data);
				}
			} catch(e) {
				winston.error('getOdometer catch', e.toString());
				return callback(e,{});
			}
		}

	});
};

function getTracksheetData(req, callback) {
	let url = "http://trucku.in:8081";
	if(config.gpsApi){
		url = config.gpsApi.host+":"+config.gpsApi.port;
	}
	let payload = {
		request:'tracksheetData',
		"version":2,
        selected_uid : req.selected_uid,
		login_uid: req.login_uid
	};
	request.post({
		headers: {'content-type': 'application/json', 'Authorization': gpsgaadiAdminToken},
		url: url+'/api/reports/tracksheet',
		body: JSON.stringify(payload)
	}, function (error, response,body) {
		if (error) {
			winston.error('getTracksheetData', error);
			return callback(error,{});
		}
		if (body){
			try {
				body = JSON.parse(body);
				if (body.status != 'OK') {
					return callback(error,{});
				}
				return callback(error, body.data);
			} catch(e) {
				winston.error('getTracksheetData catch', e.toString());
				return callback(e,{});
			}
		}

	});
};
/* Ritika Raj */
exports.vehicleUnloadApi = async function (vehicleNo) {
	let url="http://mmthinkbiz.com/MobileService.aspx/getds?";
	let payload={
		method: 'StartStopVehicleOpenGate_New_Web',
		ContactID: '52072',
		VehicleNo: vehicleNo,
		type: 'OPENGATE',
		userId: 'kpds',
		pwd: 'kpdg@1234',
		lockpwd: 'kdg789'
	};

	let payloadString='';
	for (var i in payload) {
		payloadString+=i+'='+payload[i]+'&'
	}

	return new Promise(function(resolve, reject){
		request.get({
			url: url+payloadString,
		},function(error,response,body) {
			if (error) {
				winston.error('urlConstructor', error);
				reject(error);
			}
			if (body) {
				try {
					resolve(JSON.parse(body));
				} catch (e) {
					winston.error('urlConstructor', e);
					reject(e);
				}

			}
		});
	});
};

module.exports.getOdometerAsync = (req) => {
	return new Promise((resolve, reject) => {
		getOdometer(req,(err, res) => {
			if(err) return reject(err);
			resolve(res);
		});
	});
};

module.exports.getTracksheetDataAsync = (req) => {
	return new Promise((resolve, reject) => {
		getTracksheetData(req,(err, res) => {
			if(err) return reject(err);
			resolve(res);
		});
	});
};

exports.updateTripAlerts = function (oDevice, callback) {
	//TODO identify server ip based on device type in futur for load balancing multi server architecutre
	request.post({
		headers: {'content-type': 'application/json', 'Authorization': gpsgaadiAdminToken},
		url: 'http://truckadda.in:5006/api/deviceCon/updateTripAlerts',
		body: JSON.stringify({device_id: oDevice.device_id,device_type:oDevice.device_type})
	}, function (error, response, body) {
		if (body) body = JSON.parse(body);
		if (error) {
			winston.error('updateTripAlerts ', error);
			callback(error);
			return;
		}
		if(callback){
			callback(error, body);
		}
	});
};

/*
let locationService = promise.promisifyAll(commonUtil.getService('location'));

if(oGR.trip && oGR.trip.vehicle && oGR.trip.vehicle.device_imei){
	///gpsData = await locationService.getOdometerAsync({device_imei:oGR.trip.vehicle.device_imei,datetime:timeInMillSec});
}
*/
