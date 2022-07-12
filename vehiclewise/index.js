'use strict';
//let vwData = {};
const PDD = 400;
const conf = require('../utils/common-util').mergeObjects(require('../config/default'), require(`../config/${process.env.LMS_ENV||'dev'}`));
const cronConfig = conf.cacheVehicle;
const mongoConf = conf.mongoDB;
const _ = require('lodash');
const moment = require('moment');
const Promise = require('bluebird');
const CronJob = require('cron').CronJob;
const Vehicle = require('../lms/models/registeredVehicle');
var serverSidePagination = Promise.promisifyAll(require('../utils/serverSidePagination'));
var mongooseChildP = require('mongoose');

let isCronRunn = false;
console.log('index called');
/*
if(process && process.argv && process.argv[2]){
	console.log('process.argv',process.argv);
	var dependency = process.argv && process.argv[2];
	if(dependency == 'cacheVehicleDependency'){
		console.log('event attached with main process');
		process.on('message', (msg) => {
			console.log('Message from parent:', msg);
			if(msg && msg.runCron){
				module.exports.runCron();
			}
		});
	}
}
*/
module.exports._runCron = function (){
	if (cronConfig) {
		if(cronConfig.fork) {
			/*
			process.on('message', async ({ req, res, callback }) => {
				console.log('process on message on first time');
				let d = await trackVehicles(req, res);
				callback(d);
			});
			*/
			let Uri = "mongodb://";
			if (mongoConf.user) {
				Uri = Uri + mongoConf.user + ":" + mongoConf.password + "@"
			}
			Uri = Uri + mongoConf.host + ":" + mongoConf.port + "/" + mongoConf.db;
			let options = {
				useMongoClient: true,
				autoIndex: true,
				poolSize: 10,
				connectTimeoutMS:480000,
				socketTimeoutMS:300000,
				keepAlive: 300000,
				bufferMaxEntries: 0
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
			mongooseChildP.connect(Uri, options, function(err) {
				if (err) return console.log('app.js err ' + err);
				return console.log('Connected to MongoDB from child process => ' + Uri);
			});
		}
		console.log('cron init in index.js');
/*
		const job = new CronJob({
			timeZone: 'Asia/Kolkata',
			runOnInit: cronConfig.runOnInit,
			*/
			//cronTime: `0 */${cronConfig.interval} * * * *`,
		/*
			onTick: () => {
				console.log('***************************');
				console.log('VEHICLEWISE CACHING STARTED');
				console.log('***************************');
				if(isCronRunn) {
					console.error('cron was already running');
					return;
				}
				//isCronRunn = true;
				//trackVehicles({body: { __SRC__: 'CRON' }});
			},
		});
		job.start();
		*/

	}
};

function preVehicleFilter(reqQuery) {
	let preVehicleSearchFields = { 'clientId': 1, 'vendor_id': 1, 'vehicle_reg_no': 1, 'vehicles': 1, 'regVehicle': 1, 'device_imei': 1, 'gpsExists': 1,
		'gpsData.status': 1, 'status': 1, 'segment_type': 1, 'ownershipType': 1, 'owner_group': 1};
	let fFilter = {
		$or:[
			{'ownershipType': 'Own'},
			{$and: [ {'ownershipType': 'Associate'}, {device_imei:{$exists:true}}]}
		]
	};
	for (let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in preVehicleSearchFields)) {
			 if (key === 'vehicles') {
				fFilter['_id'] = { $in: otherUtil.arrString2ObjectId(reqQuery[key]) };
			} else if(key==='vehicle_reg_no') {
				if(reqQuery[key] instanceof Array){
					fFilter[key] = {$in:reqQuery[key]};
				}
				else{
					fFilter[key] = { $regex: reqQuery[key].replace(' ', '.+'), $options: '-i' };
				}
			} else if(key === 'gpsExists') {
				fFilter['device_imei'] = { $exists: reqQuery[key] };
			} else if(key === 'gpsExists') {
			 	fFilter['owner_group'] = { $exists: reqQuery[key] };
			} else {
				fFilter[key] = reqQuery[key];
			}
		}
	}
	return fFilter;
}

function tripFilter(reqQuery) {
	let tripSearchFields = { 'branch': 1, 'trip_no': 1, 'route': 1, 'route_name': 1, 'driver': 1, 'trip_manager': 1, 'loading_babu': 1, 'gr': 1 };
	let fFilter = {};
	//fFilter['trip.isCancelled'] =false;
	for (let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in tripSearchFields)) {
			if (key === 'route' || key === 'driver') {
				fFilter['trip.' + key] = mongoose.Types.ObjectId(reqQuery[key]);
			} else {
				fFilter['trip.' + key] = reqQuery[key];
			}
		}
	}
	return fFilter;
}

function grFilter(reqQuery) {
	let grSearchFields = { 'gr_type': 1, 'booking': 1, 'grNumber': 1, customer:1 };
	let fFilter = {};
	//fFilter['gr.tripCancelled'] =false;
	for (let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in grSearchFields)) {

			if (key === 'customer') {
				fFilter['gr.' + key] = { $in: otherUtil.arrString2ObjectId(reqQuery[key]) };
			} else {
				fFilter['gr.' + key] = reqQuery[key];
			}
		}
	}
	return fFilter;
}

async function trackVehicles(req = { body: {} }, res = {}) {
	const commonGenericFilterFields = {
		'clientId': 'vehicle.clientId',
		'vehicle_reg_no': 'vehicle.vehicle_reg_no',
		'customer': 'vehicle.custId',
		'vehicles': 'vehicle._id',
		'status': 'vehicle.status',
		'segment_type': 'vehicle.segment_type',
		'gpsExists': 'vehicle.device_imei',
		'gpsData.status': 'vehicle.gpsData.status',
	};
	let skip = req.body.skip || 1;
	req.body.no_of_docs = req.body.no_of_docs || 10;
	if (req.body.download || req.body.group_by || (req.body.__SRC__ === 'CRON')) {
		req.body.no_of_docs = Number.MAX_SAFE_INTEGER;
	}
	req.body.countQuery = [{
		$match: preVehicleFilter(req.body)
	}];
	req.body.aggQuery = [
		{
			$match: preVehicleFilter(req.body)
		},
		{
			$skip: ((req.body.no_of_docs * skip) - req.body.no_of_docs)
		},
		{
			$limit: req.body.no_of_docs
		},
		{
			"$lookup": {
				"from": "tripv2",
				"let": {
					"tid": "$last_known.trip",
					"v_cid": "$clientId",
					"te": "Trip ended",
					"tc": "Trip cancelled"
				},
				"pipeline": [
					{
						"$match": {
							"$expr": {
								"$and": [
									{
										"$eq": [
											"$$tid",
											"$_id"
										]
									},
									{
										"$eq": [
											"$$v_cid",
											"$clientId"
										]
									},
									{
										"$and": [
											{
												"$ne": [
													"$$te",
													"$status"
												]
											},
											{
												"$ne": [
													"$$tc",
													"$status"
												]
											}
										]
									}
								]
							}
						}
					}
				],
				"as": "trip"
			}
		},
		{
			$unwind: {
				path: '$trip',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$match: tripFilter(req.body)
		},
		{
			$addFields: {
				"last_known.trip": '$trip'
			},
		},
/*
		{
			"$lookup": {
				"from": "tripv2",
				"let": {
					"tid": "$last_known.trip",
					"v_cid": "$clientId",
					"te": "Trip ended",
					"tc": "Trip cancelled"
				},
				"pipeline": [
					{
						"$match": {
							"$expr": {
								"$and": [
									{
										"$eq": [
											"$$tid",
											"$_id"
										]
									},
									{
										"$eq": [
											"$$v_cid",
											"$clientId"
										]
									},
									{

										"$eq": [
											"$status",
											"$$te"
										]
									}
								]
							}
						}
					}
				],
				"as": "last_known.trip"
			}
		},
		{
			$unwind: {
				path: '$last_known.trip',
				preserveNullAndEmptyArrays: true
			}
		},
		*/
		{
			$lookup: {
				from: 'tripgrs',
				localField: 'last_known.trip.gr',
				foreignField: '_id',
				as: 'last_known.trip.gr'
			}
		},
		{
			$unwind: {
				path: '$last_known.trip.gr',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'transportroutes',
				localField: 'trip.route',
				foreignField: '_id',
				as: 'route'
			}
		},
		{
			$unwind: {
				path: '$route',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$addFields: {
				route_name: '$trip.route_name'
			},
		},
		{
			$unwind: {
				path: '$trip.gr',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'tripgrs',
				localField: 'trip.gr',
				foreignField: '_id',
				as: 'gr'
			}
		},
		{
			$unwind: {
				path: '$gr',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$match: grFilter(req.body)
		},
		{
			$group: {
				_id: '$_id',
				'aGr': { $push: '$gr' },
				'vehicle': { $first: '$$ROOT' },
			}
		},
		{
			$lookup: {
				from: 'consignor_consignees',
				localField: 'vehicle.gr.consignor',
				foreignField: '_id',
				as: 'vehicle.gr.consignor'
			}
		},
		{
			$unwind: {
				path: '$vehicle.gr.consignor',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'consignor_consignees',
				localField: 'vehicle.gr.consignee',
				foreignField: '_id',
				as: 'vehicle.gr.consignee'
			}
		},
		{
			$unwind: {
				path: '$vehicle.gr.consignee',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'customers',
				localField: 'vehicle.gr.customer',
				foreignField: '_id',
				as: 'vehicle.gr.customer'
			}
		},
		{
			$unwind: {
				path: '$vehicle.gr.customer',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'transportroutes',
				localField: 'vehicle.trip.route',
				foreignField: '_id',
				as: 'vehicle.trip.route'
			}
		},
		{
			$unwind: {
				path: '$vehicle.trip.route',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'drivers',
				localField: 'vehicle.trip.driver',
				foreignField: '_id',
				as: 'vehicle.trip.driver'
			}
		},
		{
			$unwind: {
				path: '$vehicle.trip.driver',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$addFields: {
				'vehicle.trip.trip_start_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$vehicle.trip.statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'Trip started'] }
						}
					}, 0]
				},
				'vehicle.trip.trip_not_start_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$vehicle.trip.statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'Trip not started'] }
						}
					}, 0]
				},
				'vehicle.trip.trip_end_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$vehicle.trip.statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'Trip ended'] }
						}
					}, 0]
				},
				'vehicle.gr.loading_started_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$vehicle.gr.statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'Loading Started'] }
						}
					}, 0]
				},
				'vehicle.gr.loading_ended_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$vehicle.gr.statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'Loading Ended'] }
						}
					}, 0]
				},
				'vehicle.gr.unloading_started_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$vehicle.gr.statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'Unloading Started'] }
						}
					}, 0]
				},
				'vehicle.gr.unloading_ended_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$vehicle.gr.statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'Unloading Ended'] }
						}
					}, 0]
				},
				'vehicle.gr.vehicle_arrived_for_loading_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$vehicle.gr.statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'Vehicle Arrived for loading'] }
						}
					}, 0]
				},
				'vehicle.gr.vehicle_arrived_for_unloading_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$vehicle.gr.statuses',
							as: 'item',
							cond: { $eq: ['$$item.status', 'Vehicle Arrived for unloading'] }
						}
					}, 0]
				},
				'delay_in_ms': {
					$let: {
						vars: {
							'pdd': { $literal: PDD }
						},
						in: {
							$multiply: [{ $divide: ['$vehicle.route.route_distance', '$$pdd'] }, 86400000]
						}
					}
				}
			}
		},
		{
			$addFields: {
				'expected_eta': {
					$add: [
						{ $ifNull: ['$vehicle.gr.loading_ended_status.date',
								{ $ifNull: ['$vehicle.trip.trip_start_status.date',
										'$vehicle.trip.trip_not_start_status.date'
								] }
						] },
						'$delay_in_ms'
					]
				}
			}
		},
		{
			$addFields: {
				'distance_travelled': {
					$cond: [
						{ $ifNull: ['$vehicle.trip.trip_start_status.gpsData.odo', false] },
						{ $subtract: [
							{ $divide: [ { $ifNull: [ "$vehicle.gr.vehicle_arrived_for_unloading_status.gpsData.odo", '$vehicle.gpsData.odo' ] }, 1000 ] },
							{ $divide: ['$vehicle.trip.trip_start_status.gpsData.odo', 1000] }
						   ]
						},0 ]
				}
			}
		},
		{
			$addFields: {
				'current_delay_in_ms': {
					$multiply: [
						{ $divide: [
								{ $subtract: [
										'$vehicle.route.route_distance', '$distance_travelled'
								] },
								PDD
						] },
						86400000
					]
				}
			}
		},
		{
			$addFields: {
				'current_eta': {
					$add: [
						{ $ifNull: ['$vehicle.gr.vehicle_arrived_for_unloading_status.date',
								{ $ifNull: ['$vehicle.gr.unloading_started_status.date',
										{ $ifNull: ['$vehicle.gr.unloading_ended_status.date',
												{ $ifNull: ['$vehicle.trip.trip_end_status.date',
														new Date()
												] }
										] }
								] }
						] },
						'$current_delay_in_ms'
					]
				}
			}
		},
		{
			$project: {
				current_eta: 1,
				distance_travelled: 1,
				expected_eta: 1,
				delay_in_ms: 1,
				current_delay_in_ms: 1,
				'vehicle.clientId': 1,
				// 'vehicle.custId': 1,
				'vehicle.trip.driver._id': 1,
				'vehicle.trip.driver.name': 1,
				'vehicle.trip.driver.prim_contact_no': 1,
				'vehicle.trip._id': 1,
				'vehicle.trip.imd': 1,
				'vehicle.trip.rmk': 1,
				'vehicle.trip.rName': 1,
				'vehicle.trip.tat_hr':1,
				'vehicle.trip.rKm': 1,
				'vehicle.trip.trip_no': 1,
				'vehicle.trip.statuses.date': 1,
				'vehicle.trip.statuses.status': 1,
				'vehicle.trip.trip_start_status.date': 1,
				'vehicle.trip.trip_end_status.date': 1,
				'vehicle.trip.route.destination': 1,
				'vehicle.trip.route.name': 1,
				'vehicle.trip.route.route_distance': 1,
				'vehicle.trip.geofence_points': 1,
				'vehicle.segment': 1,
				'vehicle.segment_type': 1,
				'vehicle.gpsApi': 1,
				'vehicle.trip.allocation_date': 1,
				'vehicle._id': 1,
				'vehicle.owner_group': 1,
				'vehicle.mTrack': 1,
				'vehicle.vehicle_reg_no': 1,
				'vehicle.driver_name': 1,
				'vehicle.driver_contact_no': 1,
				'vehicle.device_imei': 1,
				'vehicle.last_known.trip_name': 1,
				'vehicle.last_known.trip_no': 1,
				'vehicle.last_known.datetime': 1,
				'vehicle.last_known.status': 1,
				'vehicle.last_known.trip.statuses.date': 1,
				'vehicle.last_known.trip.statuses.status': 1,
				'vehicle.last_known.trip.gr.statuses.date': 1,
				'vehicle.last_known.trip.gr.statuses.status': 1,
				'vehicle.gpsData': 1,
				'vehicle.ododmeter': 1,
				'vehicle.status': 1,
				'vehicle.capacity_tonne': 1,
				'vehicle.veh_group_name': 1,
				'vehicle.veh_type_name': 1,
				'vehicle.gr.status': 1,
				'vehicle.gr.vehicle_arrived_for_loading_status.date': 1,
				'vehicle.gr.vehicle_arrived_for_unloading_status.date': 1,
				'vehicle.gr.loading_ended_status.date': 1,
				'vehicle.gr.loading_started_status.date': 1,
				'vehicle.gr.unloading_started_status.date': 1,
				'vehicle.gr.unloading_ended_status.date': 1,
				'vehicle.gr.consignee.name': 1,
				'vehicle.gr.consignor.name': 1,
				'vehicle.gr.customer.name': 1,
				'vehicle.route.route_distance': 1,
				'vehicle.route.name': 1,
				'vehicle.route.source.c': 1,
				'vehicle.route.destination.c': 1,
				'vehicle.route_name': 1,
				'vehicle.gr.consigner.name': 1,
				'vehicle.owner_mobile': 1,
				'vehicle.length_ft': 1,
				'vehicle.remark': 1,
				'vehicle.trailerAttach': 1,
			}
		}
	];

	if(
		req.clientConfig
		&& req.clientConfig.config
		&& req.clientConfig.config.booking
		&& req.clientConfig.config.booking.showRoute
	){
		req.body.aggQuery.push({
			$addFields: {
				'vehicle.route_name': '$vehicle.trip.rName',
				'vehicle.route': {
					_id: null,
					name: '$vehicle.trip.rName',
					route_distance: "$vehicle.trip.rKm"
				}
			}
		},{
			$project: {
				current_eta: 1,
				distance_travelled: 1,
				expected_eta: 1,
				delay_in_ms: 1,
				current_delay_in_ms: 1,
				'vehicle.clientId': 1,
				'vehicle.trip.driver._id': 1,
				'vehicle.trip.driver.name': 1,
				'vehicle.trip.driver.prim_contact_no': 1,
				'vehicle.trip._id': 1,
				'vehicle.trip.rmk': 1,
				'vehicle.trip.imd': 1,
				'vehicle.trip.trip_no': 1,
				'vehicle.trip.statuses.date': 1,
				'vehicle.trip.statuses.status': 1,
				'vehicle.trip.trip_start_status.date': 1,
				'vehicle.trip.trip_end_status.date': 1,
				'vehicle.trip.route.destination': 1,
				'vehicle.trip.route.name': 1,
				'vehicle.trip.route.route_distance': 1,
				'vehicle.trip.geofence_points': 1,
				'vehicle.segment': 1,
				'vehicle.segment_type': 1,
				'vehicle.gpsApi': 1,
				'vehicle.trip.allocation_date': 1,
				'vehicle._id': 1,
				'vehicle.owner_group': 1,
				'vehicle.mTrack': 1,
				'vehicle.vehicle_reg_no': 1,
				'vehicle.driver_name': 1,
				'vehicle.driver_contact_no': 1,
				'vehicle.device_imei': 1,
				'vehicle.last_known.trip_name': 1,
				'vehicle.last_known.trip_no': 1,
				'vehicle.last_known.datetime': 1,
				'vehicle.last_known.status': 1,
				'vehicle.last_known.trip.statuses.date': 1,
				'vehicle.last_known.trip.statuses.status': 1,
				'vehicle.last_known.trip.gr.statuses.date': 1,
				'vehicle.last_known.trip.gr.statuses.status': 1,
				'vehicle.gpsData': 1,
				'vehicle.ododmeter': 1,
				'vehicle.status': 1,
				'vehicle.capacity_tonne': 1,
				'vehicle.veh_group_name': 1,
				'vehicle.veh_type_name': 1,
				'vehicle.gr.status': 1,
				'vehicle.gr.vehicle_arrived_for_loading_status.date': 1,
				'vehicle.gr.vehicle_arrived_for_unloading_status.date': 1,
				'vehicle.gr.loading_ended_status.date': 1,
				'vehicle.gr.loading_started_status.date': 1,
				'vehicle.gr.unloading_started_status.date': 1,
				'vehicle.gr.unloading_ended_status.date': 1,
				'vehicle.gr.consignee.name': 1,
				'vehicle.gr.consignor.name': 1,
				'vehicle.gr.customer.name': 1,
				'vehicle.route.route_distance': 1,
				'vehicle.route.name': 1,
				'vehicle.route.source.c': 1,
				'vehicle.route.destination.c': 1,
				'vehicle.route_name': 1,
				'vehicle.gr.consigner.name': 1,
				'vehicle.owner_mobile': 1,
				'vehicle.length_ft': 1,
				'vehicle.remark': 1,
				'vehicle.trailerAttach': 1,
			}
		});
	}



	delete req.body.skip;
	if(req.body.__SRC__ && req.body.__SRC__ !== 'CRON') {
		if (vwData.data && vwData.data.length > 0) {
			let arr = [...vwData.data];
			const filtersToApply = Object.keys(req.body).reduce((acc, curr) => {
				if (commonGenericFilterFields[curr]) {
					acc[commonGenericFilterFields[curr]] = req.body[curr];
				}
				return acc;
			}, {});
			arr = arr.filter((vehObj) => {
				for (key in filtersToApply) {
					if (filtersToApply.hasOwnProperty(key)) {
						if(Array.isArray(filtersToApply[key])) {
							if(filtersToApply[key].indexOf(_.get(vehObj, key).toString()) < 0)
								return false;
						} else if (filtersToApply[key] !== (filtersToApply[key] === true ? Boolean(_.get(vehObj, key)) : _.get(vehObj, key))) {
							return false;
						}
					}
				}
				return true;
			});
			let begin = (skip - 1) * req.body.no_of_docs;
			let end = begin + req.body.no_of_docs;
			return {
				data: arr.slice(begin, end),
				pages: Math.ceil(arr.length/req.body.no_of_docs),
				count: arr.length,
			};
		}
		return vwData;
	} else {
		try {
			let tempData = await serverSidePagination.paginationServer(Vehicle, req.body);
			if(req.body.__SRC__ === 'CRON') {
				//vwData = tempData;
				console.log('*****************************');
				console.log('VEHICLEWISE CACHING COMPLETED');
				console.log('*****************************');
				if(cronConfig && cronConfig.fork) {
					console.log('CHILD process sending vwData using IPC');
					console.log('process id in main',process.pid);
					isCronRunn = false;
					if(process.send)
						process.send(tempData);
				}
			}
			return tempData;
		} catch(e) {
			isCronRunn = false;
			console.error(e.toString());
		}
	}
}

module.exports.trackVehicles = trackVehicles;
