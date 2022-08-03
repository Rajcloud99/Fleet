/**
 * Created by kamal on 18/8/18.
 */
const router = express.Router();
const RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
const GR = commonUtil.getModel('tripGr');
let Trip = commonUtil.getModel('trip');
let telegram = require("../utils/telegramBotUtil");
const STATUS = ["Trip not started", "Trip started", "Trip ended", "Trip cancelled"];
router.post('/getGeofences',
	function (req, res, next) {
		if (!req.body.device_id) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please send imei'
			});
		} else {
			return next();
		}
	},
	function (req, res, next) {
		getGeofences(req, res, next);
});

router.post('/getTripGeofences', async function (req, res, next) {
		if (!req.body.device_id) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please send imei'
			});
		} else {
			req.body.device_id = req.body.device_id.toString();
			req.body.aggQuery = [{
					$match: {
						"device.imei": req.body.device_id,
						status: {
							$nin: ["Trip ended", "Trip cancelled"]
						}
					}
				},
				{$project:{"geofence_points":1}},
				{$limit:2}
			];
			try{
				let aData = await Trip.aggregate(req.body.aggQuery);
				return res.status(200).json({status: "OK", "message":"OK", data:aData && aData[0] && aData[0].geofence_points || [] });
			}catch (err){
				return res.status(500).json({
					"status": "ERROR",
					"message": err.toString()
				});
			}
		}
	});

router.post('/updateGrGeofence',
	function (req, res, next) {
		if (!req.body.l_id) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please send geofence_id'
			});
		} else {
			return next();
		}
	},
	function (req, res, next) {
		updateGrGeofence(req, res, next);
	});

router.post('/updateTripGeofence',async function (req, res, next) {
		if (!req.body.l_id) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please send geofence_id'
			});
		} else {
			let oRes = {status: "ERROR", message: "some error"};
			try {
				console.log('updateTripGeofence ', req.body.l_id, req.body.request_id);
				oRes = {status: "OK"};
				let oFilTrip = {
					'geofence_points._id': mongoose.Types.ObjectId(req.body.l_id),
					status: {$nin: ['Trip ended', 'Trip cancelled']}
				};
				let aggrTrip = [
					{$match: oFilTrip},
					{$project: {_id: 1, geofence_points: 1, status: 1, isCancelled: 1}},
					{$limit: 1}
				];
				let oTrip = await Trip.aggregate(aggrTrip);
				if (oTrip && oTrip[0]) {
					oTrip = oTrip[0]
				} else {
					oRes.message = 'reCheckTripGeofence';
					telegram.sendMessage('no trip found for geofence',req.body.l_id);
					return res.status(200).json(oRes);
				}
				let msgTel = " updateTripGeofence " + req.body.l_id + " request id "+  req.body.request_id;
				for (let i = 0; i < oTrip.geofence_points.length; i++) {
					if (oTrip.geofence_points[i]._id.toString() == req.body.l_id) {
						if (req.body.modified && req.body.modified.location_buffer && req.body.modified.location_buffer.length) {
							oTrip.geofence_points[i].location_buffer = req.body.modified.location_buffer;
							msgTel = msgTel + " with location buffers " + req.body.modified.location_buffer.length;
						}else{
							msgTel = msgTel + " without location buffers ";
						}
						if (req.body.modified) {
							oTrip.geofence_points[i].is_inside = req.body.modified.is_inside;
							msgTel = msgTel + " is_inside "+ req.body.modified.is_inside;
						}
						if (req.body.modified && req.body.modified.events) {
							if(oTrip.geofence_points[i].events && oTrip.geofence_points[i].events.length > 4){
								msgTel = msgTel + " events replaced ";
								oTrip.geofence_points[i].events = [req.body.modified.events];
							}else {
								msgTel = msgTel + " events pushed ";
								oTrip.geofence_points[i].events.push(req.body.modified.events);
							}
						}
					}
				}
				let oUpTrp = await Trip.update({_id:oTrip._id},{$set:{geofence_points:oTrip.geofence_points}});
				telegram.sendMessage(msgTel);
				oRes.message = 'Trip geofences updated';
				return res.status(200).json(oRes);
			} catch (err) {
				telegram.sendMessage(" updateTripGeofence error "+ err.message);
				console.error('updateTripGeofence errror ',err.message);
				oRes.message = err.message;
				return res.status(500).json(oRes);
			}
		}
	});

async function getGeofences(req,res,next) {
	req.body.aggQuery = [
		{
			$match: {
				device_imei: req.body.device_id,
				status: 'In Trip'
			}
		},
		{
			$graphLookup: {
				from: 'tripv2',
				startWith: '$_id',
				connectFromField: 'vehicle',
				connectToField: 'vehicle',
				restrictSearchWithMatch: {
					status: {
						$nin: ['Trip ended', 'Trip cancelled']
					}
				},
				as: 'trip_doc'
			}
		},
		{
			$unwind: '$trip_doc'
		},
		{
			$unwind: '$trip_doc.gr'
		},
		/*{
			$project: {
				'trip_doc.gr': true,
				'trip_doc.geofence_points': true
			}
		},*/
		{
			$lookup: {
				from: 'tripgrs',
				localField: 'trip_doc.gr',
				foreignField: '_id',
				as: 'trip_doc.gr_doc'
			}
		},
		{
			$unwind:'$trip_doc.gr_doc'
		},
		/*
		{
			$project: {
				'trip_doc.gr_doc.geofence_points': true,
				'trip_doc.geofence_points': true
			}
		},
		*/
		{
			$group: {
				_id: '$_id',
				'trip_geofence_points': {
					$first: '$trip_doc.geofence_points'
				},
				'gr_geofence_points': {
					$push: '$trip_doc.gr_doc.geofence_points'
				}
			}
		},
		{
			$addFields: {
				'gr_geofence_points': {
					$reduce: {
						input: "$gr_geofence_points",
						initialValue: [],
						in: {
							$concatArrays: ["$$value", "$$this"]
						}
					}
				}
			}
		},
		{
			$project: {
				'combined_geofence_points': {
					$concatArrays: ['$trip_geofence_points', '$gr_geofence_points']
				}
			}
		},
		{
			$group: {
				_id: null,
				'geofence_points': {
					$push: '$combined_geofence_points'
				}
			}
		},
		{
			$addFields: {
				'geofence_points': {
					$reduce: {
						input: "$geofence_points",
						initialValue: [],
						in: {
							$concatArrays: ["$$value", "$$this"]
						}
					}
				}
			}
		}
	];
	otherUtil.pagination(RegisteredVehicle,req.body, async function (err,dbData) {
		if(err) return res.status(500).json({
			"status": "ERROR",
			"message": err.toString()
		});
		if (dbData && dbData.data && dbData.data[0]) {
			return res.status(200).json({status: "OK", "message":"OK", data:dbData.data[0].geofence_points });
		}else{
			return res.status(200).json({
				"status": "OK",
				"message": "No data",
				"data" : []
			});
		}
	});
};

async function updateGrGeofence(req, res, next) {
	if(req.connection && req.connection.remoteAddress){
		console.log('updateGrGeofence from ',req.connection.remoteAddress);
	}
	try {
		let oRes = {success: 'OK', message: 'GR not found or trip cancelled.'};
		let oGR = await GR.findOne({'geofence_points._id': req.body.l_id});
		if(!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		if(oGR.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});
		if(oGR && (oGR.tripCancelled === false)) {
			for(let i = 0; i < oGR.geofence_points.length; i++) {
				if(oGR.geofence_points[i]._id == req.body.l_id) {
					if(req.body.modified && req.body.modified.location_buffer) {
						oGR.geofence_points[i].location_buffer = req.body.modified.location_buffer;
					}
                    if(req.body.modified){
						console.log(oGR.geofence_points[i].is_inside ,req.body.modified.is_inside);
						oGR.geofence_points[i].is_inside = req.body.modified.is_inside;
					}
					oGR.geofence_points[i].events.push(req.body.modified.events);
					if(oGR.geofence_points[i].events.length>5){
						console.log('event slices ',oGR.geofence_points[i].events.length);
						oGR.geofence_points[i].events = oGR.geofence_points[i].events.slice(oGR.geofence_points[i].events.length-4);
					}
					if(req.body.modified && req.body.modified.events) {
                    	console.log('events');
						let status,remark;
						if(req.body.modified.events.entry){
							if(oGR.geofence_points[i].type === 'Loading' && constant.grItemStatus.indexOf(oGR.status) < constant.grItemStatus.indexOf('Vehicle Arrived for loading')){
								status = 'Vehicle Arrived for loading';
								remark = 'Vehicle Arrived for loading at ' + oGR.geofence_points[i].name;
							}else if(oGR.geofence_points[i].type === 'Unloading' && constant.grItemStatus.indexOf(oGR.status) < constant.grItemStatus.indexOf('Vehicle Arrived for unloading')){
								status = 'Vehicle Arrived for unloading';
								remark = 'Vehicle Arrived for unloading at ' + oGR.geofence_points[i].name;
							}
						}else{
							if(oGR.geofence_points[i].type === 'Loading' && constant.grItemStatus.indexOf(oGR.status) < constant.grItemStatus.indexOf('Loading Ended')){
								status = 'Loading Ended';
								remark = 'Loading completed at ' + oGR.geofence_points[i].name;
							}else if(oGR.geofence_points[i].type === 'Unloading' && constant.grItemStatus.indexOf(oGR.status) < constant.grItemStatus.indexOf('Unloading Ended')){
								status = 'Unloading Ended';
								remark = 'Unloading completed at ' + oGR.geofence_points[i].name;
							}
						}
						if(status){
							let gpsData = getGpsDataFromEvent(req.body.modified.events);
							oGR.geofence_points[i].events.push(req.body.modified.events);
							let oStatus = {
								date: new Date(),
								systemDate: new Date(),
								status: status,
								remark: remark,
								gpsData:gpsData
							};
							oGR.status = status;
							console.log('update status',status);
							oGR.statuses.push(oStatus);
						}
					}
				}
			}
			console.log(req.body.device_id,req.body.l_id);
			oRes.data = await oGR.save();
			oRes.message = 'geofence updated successfully.';
		}
		//send response
		res.status(200).json(oRes);
	} catch(err) {
		next(err);
	}
}

function getGpsDataFromEvent(event){
	return {
	   address : event.address,
	   course:event.course,
	   datetime:event.datetime,
	   speed:event.speed,
	   odo:event.odo,
	   status:'running',
	   location:{coordinate:[event.lng,event.lat],type:'Point'}

	}
}
module.exports = router;
