let mongoose = require('mongoose');
let LiveTrack = commonUtil.getModel('liveTrack');
let Pagination = promise.promisify(otherUtil.findPagination);
let Trip = commonUtil.getModel('trip');
let RegisteredVehicle = promise.promisifyAll(commonUtil.getService('registeredVehicle'));
let Async = require('async');
var RegisteredVehicleMo = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));


const ALLOWED_FILTER = ['_id', 'clientId', 'status', 'address', 'vehicle_number', 'from', 'to','trip'];

function constructFilters(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				oFilter["datetime"] = oFilter["datetime"] || {};
				oFilter["datetime"].$gte = startDate;
			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds (59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				oFilter["datetime"] = oFilter["datetime"] || {};
				oFilter["datetime"].$lte = endDate;
			} else if (i === '_id') {
				oFilter[i] = mongoose.Types.ObjectId(oQuery[key])
			} else if (i === 'remarks') {
				oFilter[i] = {$regex: oQuery[i], $options: 'i'}
			} else if (i === 'address') {
				oFilter[i] = {$regex: oQuery[i], $options: 'i'}
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}
async function get(req, res, next) {
	try {
		//The comma operator evaluates all of its operands and returns the value of the last (rightmost) one.
		//let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		if(req && req.body)
		{
			req.body.clientId = req.user.clientId;
			let oQuery = req.body;
			oQuery.queryFilter = constructFilters(oQuery);
			oQuery.sort = {created_at: -1};
			let aLiveTrack = await Pagination(LiveTrack, req.body);
			//send response
			res.status(200).json({status: "OK", "data": aLiveTrack ? aLiveTrack : {data: []}});
		}
		else{
			res.status(200).json({status: "NotOK", "data": aLiveTrack ? aLiveTrack : {data: []}});
		}
	} catch (err) {
		next(err);
	}
}

// Delete Vehicle Track Trip
/*
module.exports.deleteliveTrackId = function(id, next) {
	LiveTrack.deleteOne({
		_id: id
	})
		.then(function(removed) {
			return next(null, removed);
		}).catch(function(err) {
		return next(err);
	});
};*/

async function findId(id, proj) {
	try{
		return await LiveTrack.findOne({
			"_id": id
		}, proj).lean();
	}catch(e){
		throw e;
	}
};


async function deleteliveTrackId(id) {
	try{

		// get lastest record by id in live track
		const latestCord = await LiveTrack.findOne({
			_id: id
		});

		if(latestCord && latestCord._id)
		{
			let latDesc 		= latestCord.lat;
			let lngDesc 		= latestCord.lng;
			let vehicleNumber 	= latestCord.vehidatetimecle_number;
			let datetimeDesc	= latestCord.datetime;

			// check record found or not in register vehicle
			let oRegVehicle = await RegisteredVehicleMo.findOne({
				vehicle_reg_no: vehicleNumber,
				clientId: latestCord.clientId
			},{mTrack:1,_id:1});

			if(oRegVehicle && oRegVehicle._id){
				// get the just previous balue from live track
				const getJustPrevVal = await LiveTrack.findOne({
					datetime: {$lt:new Date(datetimeDesc)},
					vehicle_number:vehicleNumber
				}).sort( { datetime: -1 } );

				// make object and Update data in Registered Vehicle collection

				const oSave = {

					address: 	getJustPrevVal.address,
					speed: 		getJustPrevVal.speed,
					lat: 		getJustPrevVal.lat,
					lng: 		getJustPrevVal.lng,
					datetime: 	getJustPrevVal.datetime,
					location:  {
						coordinates:  [getJustPrevVal.lng, getJustPrevVal.lat]
					}
					};

					await Promise.all([
						RegisteredVehicleMo.updateOne({_id: oRegVehicle._id}, {$set: {
							mTrack: oSave
						}})
					]);

					// END Update data in Registered Vehicle collection
			}

			// Finally delete the live track collection by id.
			return await LiveTrack.deleteOne({_id: id});
		}
	}
	catch(e){
		throw e;
	}
};

async function add(req, res, next) {
	try {
		let oRes = {status: "OK", message: "Vehicle not found."};
		let oVehicle = await RegisteredVehicle.getRegisteredVehicle({
			clientId: req.user.clientId,
			vehicle_reg_no: req.body.vehicle_number
		});

		let maxSpeed	= 60;

		// END
		//============= Greater than ============

		let stopCtr 	= 0;
		let getSpeedGr 	= 0;
		let distanceGr 	= 0;
		let getSpeedLs 	= 0;
		let distanceLs 	= 0;
		let messageRes 	= '';

		 let entryDatetime = req.body.datetime;

		if(req.body.lat && req.body.lng){
			let lat 		= req.body.lat;
			let lng 		= req.body.lng;

			req.body.location = {
				coordinates:  [req.body.lng, req.body.lat]
			};


			let currDateHour = new Date(req.body.datetime).getTime();

			const lastTripGrThan = await LiveTrack.findOne({
				datetime: {$gt:new Date(entryDatetime)},
				vehicle_number: req.body.vehicle_number
			}).sort( { date: 1 } );

			if(lastTripGrThan && lastTripGrThan.lat && lastTripGrThan.lng){

				distanceGr = otherUtil.getDistanceInKm(lat, lng, lastTripGrThan.lat, lastTripGrThan.lng);
				let grtDateInHour = new Date(lastTripGrThan.datetime).getTime();
				let actutalSecLsGrt = '';
				if(grtDateInHour>=currDateHour)
					actutalSecLsGrt = (grtDateInHour - currDateHour);
				else
					actutalSecLsGrt = (currDateHour - grtDateInHour);

				let actutalMinutLsGrt = (actutalSecLsGrt/(60 * 1000));

				if(actutalMinutLsGrt>=5){
					let actutalHourLsGrt = (actutalSecLsGrt/(3600 * 1000));
					getSpeedGr = (distanceGr/actutalHourLsGrt);
					stopCtr=0;
				}
				else{

					stopCtr = 1;
					messageRes = "You can not add location within 5 min.";
				}
			}

			//---------- END ---------------------

			//============= Less than ============
			if(stopCtr==0){
				const lastTripLesThan = await LiveTrack.findOne({
					datetime: {$lt:new Date(entryDatetime)},
					vehicle_number: req.body.vehicle_number
				}).sort( { datetime: -1 } );

				if(lastTripLesThan && lastTripLesThan.lat && lastTripLesThan.lng){
					distanceLs = otherUtil.getDistanceInKm(lat, lng, lastTripLesThan.lat, lastTripLesThan.lng);

					let lsDateInHour = new Date(lastTripLesThan.datetime).getTime(); //getMilliseconds();
					let actutalSecLs = '';//getTime();
					if(lsDateInHour>currDateHour)
						actutalSecLs = (lsDateInHour - currDateHour);
					else
						actutalSecLs = (currDateHour - lsDateInHour);


					let actutalMinuteLs = (actutalSecLs/(60 * 1000));

					if(actutalMinuteLs>=5){
						let actutalHourLs 	= (actutalSecLs/(3600 * 1000));
						getSpeedLs = (distanceLs/actutalHourLs);
						stopCtr=0;
					}
					else{

						stopCtr = 1;
						messageRes = "You can not add location within 5 min..";
					}

				}
				//-------------------
				if(stopCtr==0){
					if(getSpeedGr || getSpeedLs){
						if(getSpeedGr>maxSpeed || getSpeedLs>maxSpeed){
							stopCtr = 1;
							messageRes = "Please update correct address location coordinates.";
						}
					}
				}
			}
		}


		if(stopCtr==0)
		{
			// Start get trip id
			if(oVehicle){
				oRes.message = "Trip not found."
				let oTrip = await Trip.findOne({
					clientId: req.user.clientId,
					vehicle_no: req.body.vehicle_number,
					isCancelled: false,
					allocation_date: {$lte: new Date(entryDatetime)},

					$or: [
						{
							"statuses": {
								$elemMatch: {
									status: "Trip ended",
									date: {
										"$gt": new Date(entryDatetime),
									}
								}
							}
						}, {
							"statuses.status": {$ne: "Trip ended"}
						}]

				},null,{$natural:-1});

				// End Get Trip id

				if(oTrip && oTrip._id || oVehicle.status === 'Available') {
				//-- Validation  ...

				// Get Register Vehicle last entry datetime
				let oVehicleRecord = await RegisteredVehicle.getRegisteredVehicle({
					clientId: req.user.clientId,
					vehicle_reg_no: req.body.vehicle_number
				});

				let lngVal = 0;
				if(req.body.lng)
				{
					lngVal = req.body.lng;
				}

				let latVal = 0;
				if(req.body.lat)
				{
					latVal = req.body.lat;
				}

				let speedVal = 0;
				if(req.body.speed){
					speedVal = req.body.speed;
				}



				//if(oVehicleRecord && oVehicleRecord._id)
				if(oVehicleRecord && oVehicleRecord.mTrack && oVehicleRecord.mTrack.datetime)
				{
					// Update data in Registered Vehicle collection

					let oVehicleRecordDt = await RegisteredVehicle.getRegisteredVehicle({
						clientId: req.user.clientId,
						vehicle_reg_no: req.body.vehicle_number,
						'mTrack.datetime': {
							"$lte": new Date(entryDatetime)
						}
					});

					if(oVehicleRecordDt && oVehicleRecordDt._id)
					{
						const oSave = {

						address: 	req.body.address,
						created_at: 	new Date(),
						created_by: 	req.user.full_name,
						remarks: 	req.body.remarks,
						status: 	req.body.status,
						speed: 		speedVal,
						lat: 		latVal,
						lng: 		lngVal,
						datetime: 	entryDatetime,
						location:  {
							coordinates:  [lngVal, latVal]
						}
						};

						if(req.body.loadingdate)
							oSave.loadingdate = req.body.loadingdate;
						if(req.body.reportingdate)
							oSave.reportingdate = req.body.reportingdate;

						await Promise.all([
							RegisteredVehicleMo.updateOne({_id: oVehicle._id}, {$set: {
								mTrack: oSave
							}})
						]);
						if (vwData.data && vwData.data.length > 0){
							let findItem = vwData.data.find((item) => item.vehicle._id.toString() === oVehicle._id.toString());
							findItem.vehicle.mTrack = oSave;
						}
					}
						// END Update data in Registered Vehicle collection
				}
				else
				{

				// Update data in Registered Vehicle collection in first time

				const oSave = {

					address: 	req.body.address,
					created_at: 	new Date(),
					created_by: 	req.user.full_name,
					remarks: 	req.body.remarks,
					status: 	req.body.status,
					speed: 		speedVal,
					lat: 		latVal,
					lng: 		lngVal,
					datetime: 	entryDatetime,
					location:  {
						coordinates:  [lngVal, latVal]
					}
					};
				if(req.body.loadingdate)
					oSave.loadingdate = req.body.loadingdate;
					if(req.body.reportingdate)
						oSave.reportingdate = req.body.reportingdate;

					await Promise.all([
						RegisteredVehicleMo.updateOne({_id: oVehicle._id}, {$set: {
							mTrack: oSave
						}})
					]);
					if (vwData.data && vwData.data.length > 0){
						let findItem = vwData.data.find((item) => item.vehicle._id.toString() === oVehicle._id.toString());
						findItem.vehicle.mTrack = oSave;
					}

					// END Update data in Registered Vehicle collection

				}

					// Live track collection
					req.body.created_by = req.user.full_name;
					const newTrip = new LiveTrack(req.body);
					let savedTrip = await newTrip.save();
					oRes.data = savedTrip;
					oRes.message = "Live track updated successfully.";
					oRes.types = 'success';

					res.status(200).json(oRes);
					// END Live track collection
				}
				else{
					res.status(200).json({
						'status': 'OK',
						'message': 'Trip not ended.',
						'types': 'fail',
					});
				}
			}
		}
		else
		{
			res.status(200).json({
				'status': 'OK',
				'message': messageRes,
				'types': 'fail',
			});
		}
		//send response

	} catch (err) {
		next(err);
	}
}

module.exports = {
	get,
	add,
	deleteliveTrackId,
	findId,
};
