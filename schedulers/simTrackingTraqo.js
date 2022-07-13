const moment = require('moment');
const request = require("request-promise");
const Trips = commonUtil.getModel("trip");
const LiveTrack = commonUtil.getModel('liveTrack');
const RegVehicle = commonUtil.getModel('registeredVehicle');

module.exports = class smsTrackingTraqo {
	constructor(clientId, from, to) {
		this._aTripToSave = [];
		this.clientId = clientId;
	}

	async exec() {
		await this._startCache(this.tripAggregateQueryByLastUpdate());
	}

	async _startCache(oTripFilter) {
		try {
			console.log('[Trip settlement cache] start time: ', moment(this._from).toString());
			await this.activateStream(this._getTrip(oTripFilter));

			if (config.traqoApi && config.traqoApi.individual && this._aTripToSave.length) {
				for (let t = 0; t < this._aTripToSave.length; t++) {
					let oLocation = await this._fetchDataFromTraqoApi(this._aTripToSave[t]);
					if (oLocation) {
						oLocation = JSON.parse(oLocation);
						await this._saveLoacation(this._aTripToSave[t], oLocation);
					}

				}
			}
		} catch (e) {
			console.log(e);
		}
	}

	tripAggregateQueryByLastUpdate() {
		let dt = new Date();
		dt.setDate(dt.getDate() - 30);
		//don't track 1 month older trips there might be some issues
		return {
			$match: {
				clientId: this.clientId,
				status: {$in: ["Trip not started", "Trip started"]},
				start_date: {$gt: dt},
				driver: {$exists: true},
				ownershipType: "Market"
			}
		};
	}


	_getTrip(oTripFilter) {
		let project = {
			clientId: 1,
			trip_no: 1,
			status: 1,
			category: 1,
			route: 1,
			vehicle: 1,
			vehicle_no: 1,
			'driver.prim_contact_no': 1,
			'driver.name': 1,
			'driver.code': 1,
			start_date: 1,
		};
		let aggrQuery = [
			oTripFilter,
			{
				"$lookup": {
					"from": "drivers",
					"localField": "driver",
					"foreignField": "_id",
					"as": "driver"
				}
			},
			{
				"$unwind": {
					"path": '$driver',
					"preserveNullAndEmptyArrays": true
				}
			},
			{$match: {"driver.prim_contact_no": {$exists: true}}},
			{$project: project}
		];
		return Trips.aggregate(aggrQuery);
	}

	_transformTrip(_aTrip) {
		for (let oTrip of _aTrip) {
			this._aTripToSave.push(oTrip);
		}
	}

	activateStream(aggregate) {
		return new Promise((resolve, reject) => {
			aggregate.options = {allowDiskUse: true, batchSize: 3000};
			this.cursor = aggregate.cursor({batchSize: 2000}).exec();
			this.stream = this.cursor.stream();

			this.stream.on('data', (data) => {
				this._transformTrip(Array.isArray(data) ? data : [data]);
			});

			this.stream.on("end", async () => {
				try {
					console.log("caching", this._aTripToSave.length, "trips")
					//await this._save();
				} catch (e) {
					console.log("error => ", e);
				}
				resolve();
			});
		});
	}

	async _fetchDataFromTraqoApi(oTrip) {
		try {
			const option = {
				strictSSL: false,
				method: config.traqoApi.individual.method,
				url: config.traqoApi.individual.get_location,
				body: JSON.stringify({
					"phone_number":  oTrip.driver.prim_contact_no.toString() || "9535888738"
				}),
				'headers': {
					'Authorization': 'Basic OTUzNTg4ODczODo5NTM1ODg4NzM4QDEyMw==',
					'Content-Type': 'application/json'
				},
				//json: true
			};
			let data = await request(option);
			if (data) {
				return data;
			} else {
				return undefined;
			}
		} catch (e) {
			console.error('[Tracqo Api  error]', e);
			return null;
		}
	}

	async _saveLoacation(oTrip, oLocation) {
		let sTime = oLocation.time_recorded;
		let aDt = sTime.split(' ');
		let date = aDt && aDt[1];
		let aDate = date.split('-');
		let MM = aDate && aDate[1];
		let DD = aDate && aDate[0];
		let sHHMMSS =  aDt && aDt[0];
		let aHHMMSS = sHHMMSS.split(':');
		let Hr = aHHMMSS && aHHMMSS[0];
		let Min = aHHMMSS && aHHMMSS[1];
		let Sec = aHHMMSS && aHHMMSS[2];
		let fDt = new Date();
		fDt.setMonth(MM - 1);
		fDt.setDate(DD);
		fDt.setHours(Hr,Min,Sec);

		let oLocAdd = {
			clientId: oTrip.clientId,
			vehicle_number: oTrip.vehicle_no,
			trip: oTrip._id,
			address: oLocation.location,
			lat: oLocation.latitude,
			lng: oLocation.longitude,
			status: 'SIM',
			remarks: "SIM tracking",
			datetime: fDt,
			created_at: new Date(),
			location: {
				coordinates: [oLocation.longitude, oLocation.latitude]
			},
			created_by:"Tracqo API"

		}
		const newLoc = new LiveTrack(oLocAdd);
		let savedLoc = await newLoc.save();
		let oVehUp = await RegVehicle.updateOne({_id:oTrip.vehicle},{$set:{mTrack:oLocAdd}});
	}

}

module.exports.createTripTraqo = async function(obj){
	try {
		const options = {
			strictSSL: false,
			method: config.traqoApi.createTrip.method,
			url: config.traqoApi.createTrip.url,
			body: JSON.stringify(obj),

			'headers': {
				'Authorization': "Basic " + new Buffer(config.traqoApi.userName + ":" + config.traqoApi.password).toString("base64"),
				'Content-Type': 'application/json'
			},
			// json: true
		};
		let data = await request(options);
		if (data) {
			return data;
		} else {
			return undefined;
		}
	} catch (e) {
		console.error('[Tracqo Api  error]', e);
		//telegram.sendMessage('[Fastag Api error] ' + e.message);
		return null;
	}
}

module.exports.endTripTraqo = async function(obj){
	try {
		const option = {
			strictSSL: false,
			method: config.traqoApi.endTrip.method,
			url: config.traqoApi.endTrip.url,
			body: JSON.stringify({
				"id":obj
			}),
			'headers': {
				'Authorization': "Basic " + new Buffer(config.traqoApi.userName + ":" + config.traqoApi.password).toString("base64"),
				'Content-Type': 'application/json'
			},
			// json: true
		};
		let data = await request(option);
		if (data) {
			return data;
		} else {
			return undefined;
		}
	} catch (e) {
		console.error('[Tracqo Api  error]', e);
		//telegram.sendMessage('[Fastag Api error] ' + e.message);
		return null;
	}
}

module.exports.fetchTripTraqo = async function(obj){
	try {
		const option = {
			strictSSL: false,
			method: config.traqoApi.fetchTrip.method,
			url: config.traqoApi.fetchTrip.url,
			body: JSON.stringify({
				"invoice":obj
			}),
			'headers': {
				'Authorization': "Basic " + new Buffer(config.traqoApi.userName + ":" + config.traqoApi.password).toString("base64"),
				'Content-Type': 'application/json'
			},
			// json: true
		};
		let data = await request(option);
		if (data) {
			return data;
		} else {
			return undefined;
		}
	} catch (e) {
		console.error('[Tracqo Api  error]', e);
		//telegram.sendMessage('[Fastag Api error] ' + e.message);
		return null;
	}
}
