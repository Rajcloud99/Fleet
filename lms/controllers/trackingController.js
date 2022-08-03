const PDD = 400;

var moment = require('moment');
const request = require('request');
const gpsgaadiAdminToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiJER0ZDIn0.Yt9SM10dq7L8FqISaMdiCqJRVtL1xesy6gjnAeNDYAI';
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
const mongoose = require('mongoose');
let Trip = commonUtil.getModel('trip');
let Vehicle = commonUtil.getModel('registeredVehicle');
var Consignor_Consignee = commonUtil.getModel('consignor_consignee');
const GPSData = commonUtil.getModel('gpsData');
let TrackingReportService = commonUtil.getService('TrackingReport');
let router = require('express').Router();
const Vehiclewise = require('../../vehiclewise/index');

var tripDateFilter = (() => {
	var allowedDateFields = ['allocation_date'];
	return (query) => {
		var o = {
			[(query.dateKey && allowedDateFields.includes(query.dateKey)) || allowedDateFields[0]]: {
				$gte: new Date(query.startDate || '2000-01-20T00:00:00.000Z'),
				$lte: new Date(query.endDate || '3000-01-20T00:00:00.000Z')
			}
		};
		return o;
	};
})();

var vehicleFilters = (query) => {
	var o = {};
	if (query.segment_type) {
		o['vehicle.segment_type'] = query.segment_type;
	}
	if (query.vehicle_no) {
		o['vehicle.vehicle_reg_no'] = {
			$regex: new RegExp(query.vehicle_no, 'is')
		};
	}
	return o;
};

var grFilters = (query) => {
	var o = {};
	if (query.consignor) {
		o['gr.consignor._id'] = {
			$eq: mongoose.Types.ObjectId(query.consignor)
		};
	}
	if (query.consignee) {
		o['gr.consignee._id'] = {
			$eq: mongoose.Types.ObjectId(query.consignee)
		};
	}
	if (query.customer) {
		o['gr.customer._id'] = {
			$eq: mongoose.Types.ObjectId(query.customer)
		};
	}
	if (query.driver) {
		o['trip.driver._id'] = {
			$eq: mongoose.Types.ObjectId(query.driver)
		};
	}
	return o;
};

router.get('/tripwise', (req, res, next) => {
	req.query.aggQuery = [
		{
			$match: {
				clientId: req.user.clientId,
				trip_no: (req.query.trip_no && +req.query.trip_no) || {$exists: true},
				status: {
					$nin: ['Trip ended', 'Trip cancelled']
				},
				...tripDateFilter(req.query)
			}
		},
		{
			$lookup: {
				from: 'registeredvehicles',
				localField: 'vehicle',
				foreignField: '_id',
				as: 'vehicle'
			}
		},
		{
			$unwind: '$vehicle'
		},
		{
			$match: {
				'vehicle.vehicle_reg_no': (req.query.vehicle_no && {$regex: new RegExp(req.query.vehicle_no, 'is')}) || {$exists: true},
				'vehicle.device_imei': {$exists: true}
			}
		},
		{
			$lookup: {
				from: 'transportroutes',
				localField: 'route',
				foreignField: '_id',
				as: 'route'
			}
		},
		{
			$unwind: '$route'
		},
		{
			$unwind: '$gr'
		},
		{
			$group: {
				_id: '$_id',
				'gr': {$first: '$gr'},
				'route': {$first: '$route'},
				'vehicle': {$first: '$vehicle'},
				'trip_no': {$first: '$trip_no'},
				'trip': {$first: '$$ROOT'}
			}
		},
		{
			$lookup: {
				from: 'tripgrs',
				localField: 'gr',
				foreignField: '_id',
				as: 'gr'
			}
		},
		{
			$unwind: '$gr'
		},
		{
			$addFields: {
				'gr.loading_started_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$gr.statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Loading Started']}
						}
					}, 0]
				},
				'gr.loading_ended_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$gr.statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Loading Ended']}
						}
					}, 0]
				},
				'delay_in_ms': {
					$let: {
						vars: {
							'pdd': {$literal: PDD}
						},
						in: {
							$multiply: [{$divide: ['$route.route_distance', '$$pdd']}, 86400000]
						}
					}
				}
			}
		},
		{
			$addFields: {
				'expected_eta': {
					$add: [{
						$cond: [{
							$ifNull: ['$gr.loading_ended_status', false]
						},
							'$gr.loading_ended_status.date',
							new Date()]
					}, '$delay_in_ms']
				}
			}
		},
		{
			$addFields: {
				'distance_travelled': {
					$cond: [{
						$ifNull: ['$gr.loading_ended_status', false]
					},
						{
							$subtract: [
								{$divide: ['$vehicle.gpsData.odo', 1000]},
								{$divide: ['$gr.loading_ended_status.gpsData.odo', 1000]}]
						}, 0]
				}
			}
		},
		{
			$addFields: {
				'current_delay_in_ms': {
					$let: {
						vars: {
							'pdd': PDD
						},
						in: {
							$multiply: [
								{
									$divide: [
										{
											$subtract: [
												'$route.route_distance', '$distance_travelled'
											]
										},
										'$$pdd'
									]
								},
								86400000
							]
						}
					}
				}
			}
		},
		{
			$addFields: {
				'current_eta': {
					$add: [new Date(), '$current_delay_in_ms']
				}
			}
		}
	];

	otherUtil.pagination(Trip, req.query, async function (err, dbData) {
		if (err) return res.status(500).json({
			"status": "ERROR",
			"message": err.toString()
		});
		if (dbData && dbData.data && dbData.data[0]) {
			formatData(dbData.data);
			//console.log(dbData.data);
			return res.status(200).json({status: "OK", "message": "OK", data: dbData.data});
		} else {
			return res.status(200).json({
				"status": "OK",
				"message": "No data",
				"data": []
			});
		}
	});
});

router.get('/trip-history', (req, res, next) => {
	if (req.query.download === "1" && req.query.group_by) {
		req.query.no_of_docs = 3000;
	}
	req.query.aggQuery = [
		{
			$match: {
				clientId: req.user.clientId,
				trip_no: (req.query.trip_no && +req.query.trip_no) || {$exists: true},
				status: {
					$eq: 'Trip ended'
				},
				...tripDateFilter(req.query)
			}
		},
		{
			$lookup: {
				from: 'registeredvehicles',
				localField: 'vehicle',
				foreignField: '_id',
				as: 'vehicle'
			}
		},
		{
			$unwind: '$vehicle'
		},
		{
			$match: {
				'vehicle.device_imei': {$exists: true},
				...vehicleFilters(req.query),
			}
		},
		{
			$lookup: {
				from: 'transportroutes',
				localField: 'route',
				foreignField: '_id',
				as: 'route'
			}
		},
		{
			$unwind: '$route'
		},
		{
			$unwind: '$gr'
		},
		{
			$group: {
				_id: '$_id',
				'gr': {$first: '$gr'},
				'route': {$first: '$route'},
				'vehicle': {$first: '$vehicle'},
				'trip_no': {$first: '$trip_no'},
				'trip': {$first: '$$ROOT'}
			}
		},
		{
			$lookup: {
				from: 'tripgrs',
				localField: 'gr',
				foreignField: '_id',
				as: 'gr'
			}
		},
		{
			$unwind: '$gr'
		},
		{
			$lookup: {
				from: 'consignor_consignees',
				localField: 'gr.consignor',
				foreignField: '_id',
				as: 'gr.consignor'
			}
		},
		{
			$unwind: {
				path: '$gr.consignor',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'consignor_consignees',
				localField: 'gr.consignee',
				foreignField: '_id',
				as: 'gr.consignee'
			}
		},
		{
			$unwind: {
				path: '$gr.consignee',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			"$lookup": {
				"from": "customers",
				"localField": "gr.customer",
				"foreignField": "_id",
				"as": "gr.customer"
			}
		},
		{
			"$unwind": {
				"path": "$gr.customer",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$lookup: {
				from: 'drivers',
				localField: 'trip.driver',
				foreignField: '_id',
				as: 'trip.driver'
			}
		},
		{
			$unwind: {
				path: '$trip.driver',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$match: grFilters(req.query)
		},
		{
			$addFields: {
				'trip_start_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$trip.statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Trip started']}
						}
					}, 0]
				},
				'trip_end_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$trip.statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Trip ended']}
						}
					}, 0]
				},
				'gr.loading_started_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$gr.statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Loading Started']}
						}
					}, 0]
				},
				'gr.loading_ended_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$gr.statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Loading Ended']}
						}
					}, 0]
				},
				'gr.unloading_started_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$gr.statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Unloading Started']}
						}
					}, 0]
				},
				'gr.unloading_ended_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$gr.statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Unloading Ended']}
						}
					}, 0]
				},
				'gr.vehicle_arrived_for_loading_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$gr.statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Vehicle Arrived for loading']}
						}
					}, 0]
				},
				'gr.vehicle_arrived_for_unloading_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$gr.statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Vehicle Arrived for unloading']}
						}
					}, 0]
				},
				'delay_in_ms': {
					$let: {
						vars: {
							'pdd': {$literal: PDD}
						},
						in: {
							$multiply: [{$divide: ['$route.route_distance', '$$pdd']}, 86400000]
						}
					}
				}
			}
		},
		{
			$addFields: {
				'expected_eta': {
					$add: [
						{$ifNull: ['$gr.loading_ended_status.date', '$trip_start_status.date']},
						'$delay_in_ms'
					]
				}
			}
		},
		{
			$addFields: {
				'current_eta': {
					$add: [new Date(), '$current_delay_in_ms']
				}
			}
		},
		{
			$addFields: {
				'distance_travelled': {
					$subtract: [
						{
							$divide: [
								{
									$ifNull: [
										'$gr.unloading_ended_status.gpsData.odo',
										{
											$ifNull: [
												'$gr.unloading_started_status.gpsData.odo',
												'$trip_end_status.gpsData.odo'
											]
										}
									]
								},
								1000
							]
						},
						{
							$divide: [
								{
									$ifNull: [
										'$gr.loading_ended_status.gpsData.odo',
										{
											$ifNull: [
												'$gr.loading_started_status.gpsData.odo',
												'$trip_start_status.gpsData.odo'
											]
										}
									]
								},
								1000
							]
						},
					]
				},
				'delay': {
					$subtract: [
						'$gr.unloading_ended_status.date',
						'$expected_eta'
					]
				},
				'transit_time': {
					$subtract: [
						{$ifNull: ['$gr.unloading_started_status.date', '$trip_end_status.date']},
						{$ifNull: ['$gr.loading_ended_status.date', '$trip_start_status.date']}
					]
				},
				'manual_transit_time_of_trip': {
					$subtract: ['$trip_end_status.date', '$trip_start_status.date']
				},
				'trip_duration': {
					$subtract: [
						{$ifNull: ['$gr.unloading_ended_status.date', '$trip_end_status.date']},
						{$ifNull: ['$gr.loading_started_status.date', '$trip_start_status.date']}
					]
				},
				'loading_time': {
					$subtract: [
						{$ifNull: ['$gr.loading_ended_status.date', '$trip_start_status.date']},
						{$ifNull: ['$gr.loading_started_status.date', '$trip_start_status.date']},
					]
				},
				'unloading_time': {
					$subtract: [
						{$ifNull: ['$gr.unloading_ended_status.date', '$trip_end_status.date']},
						{$ifNull: ['$gr.unloading_started_status.date', '$trip_end_status.date']},
					]
				},
				'_parameters': {
					'_s': {
						$cond: ['$gr.loading_ended_status.date', 'LOADING_ENDED', 'TRIP_START']
					},
					'_d': {
						$cond: ['$gr.unloading_started_status.date', 'UNLOADING_STARTED', 'TRIP_END']
					},
				}
			}
		},
	];

	otherUtil.pagination(Trip, req.query, async function (err, dbData) {
		if (err) return res.status(500).json({
			"status": "ERROR",
			"message": err.toString()
		});
		if (dbData && dbData.data && dbData.data[0]) {
			formatDataForHistory(dbData.data);
			if (req.query.download === "1" && req.query.group_by) {

				if (req.query.group_by === 'consignor' || req.query.group_by === 'consignee') {
					var newAggrData = dbData.data.reduce((acc, curr, i) => {
						var consignor = (curr.gr && curr.gr[req.query.group_by] && curr.gr[req.query.group_by].name) || `${req.query.group_by} not assigned trips`;
						var matched = curr.t_status.match(/^Early|Delayed|On Time/i)[0];
						if(curr.trip && curr.trip.v_status)
							matched = curr.trip.v_status.match(/^Early|Delayed|On Time/i)[0];
						if (acc[consignor]) {
							if (acc[consignor][matched]) {
								acc[consignor][matched].push(curr);
							} else {
								acc[consignor][matched] = [curr];
							}
						} else {
							acc[consignor] = {};
							acc[consignor][matched] = [curr];
						}
						return acc;
					}, {});

					ReportExelService.tripHistoryGrouped(newAggrData, req.query.group_by, req.user.clientId, function (url) {
						return res.status(200).json({
							status: 'OK', message: 'report avalilabel for download', url
						});
					});
				}

				if (req.query.group_by === 'driver') {
					var newAggrData = dbData.data.reduce((acc, curr, i) => {
						var consignor = (curr.trip && curr.trip.driver && curr.trip.driver.name) || `${req.query.group_by} not defined trips`;
						var matched = curr.t_status.match(/^Early|Delayed|On Time/i)[0];
						if(curr.trip && curr.trip.v_status)
							matched = curr.trip.v_status.match(/^Early|Delayed|On Time/i)[0];
						if (acc[consignor]) {
							if (acc[consignor][matched]) {
								acc[consignor][matched].push(curr);
							} else {
								acc[consignor][matched] = [curr];
							}
						} else {
							acc[consignor] = {};
							acc[consignor][matched] = [curr];
						}
						return acc;
					}, {});

					ReportExelService.tripHistoryGrouped(newAggrData, req.query.group_by, req.user.clientId, function (url) {
						return res.status(200).json({
							status: 'OK', message: 'report avalilabel for download', url
						});
					});
				}

				if (req.query.group_by === 'segment') {
					var newAggrData = dbData.data.reduce((acc, curr, i) => {
						var consignor = (curr.vehicle && curr.vehicle.segment_type) || `${req.query.group_by} not defined trips`;
						var matched =  curr.t_status.match(/^Early|Delayed|On Time/i)[0];
						if(curr.trip && curr.trip.v_status)
							matched = curr.trip.v_status.match(/^Early|Delayed|On Time/i)[0];
						if (acc[consignor]) {
							if (acc[consignor][matched]) {
								acc[consignor][matched].push(curr);
							} else {
								acc[consignor][matched] = [curr];
							}
						} else {
							acc[consignor] = {};
							acc[consignor][matched] = [curr];
						}
						return acc;
					}, {});

					ReportExelService.tripHistoryGrouped(newAggrData, req.query.group_by, req.user.clientId, function (url) {
						return res.status(200).json({
							status: 'OK', message: 'report avalilabel for download', url
						});
					});
				}

			} else {
				return res.status(200).json({status: "OK", "message": "OK", data: dbData.data});
			}
		} else {
			return res.status(200).json({
				"status": "OK",
				"message": "No data",
				"data": []
			});
		}
	});

});

router.post('/vehiclewise', async (req, res) => {
	// let dbData = global.vwData;
	let dbData = await Vehiclewise.trackVehicles(req, res);
	if (dbData && Array.isArray(dbData.data) && dbData.data[0]) {
		formatData(dbData.data);

		if (req.body.download && !req.body.group_by) {
			try {
				ReportExelService.trackingVehicleWiseReport(dbData.data, req.user.clientId, function (data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Tracking Vehicle Report available",
						"url": data.url
					});
				});
			} catch (e) {
				console.log(e);
			}
		}

		else if (req.body.group_by) {

			if (req.body.group_by === 'consignor' || req.body.group_by === 'consignee') {
				var newAggrData = dbData.data.reduce((acc, curr, i) => {
					var consignor = (curr.vehicle && curr.vehicle.gr && curr.vehicle.gr[req.body.group_by] && curr.vehicle.gr[req.body.group_by].name)
						|| (curr.vehicle && curr.vehicle.gr && curr.vehicle.gr.booking && curr.vehicle.gr.booking[req.body.group_by === 'consignor' ? 'consigner' : 'consignee'] && curr.vehicle.gr.booking[req.body.group_by === 'consignor' ? 'consigner' : 'consignee'].name)
						|| `${req.body.group_by} not assigned trips`;
					var tStat = curr.t_status && curr.t_status.match(/^Early|Delayed|On Time|Not on trip/i);
					var matched = (tStat && tStat[0]) || 'NA';
					if (acc[consignor]) {
						if (acc[consignor][matched]) {
							acc[consignor][matched].push(curr);
						} else {
							acc[consignor][matched] = [curr];
						}
					} else {
						acc[consignor] = {};
						acc[consignor][matched] = [curr];
					}
					return acc;
				}, {});

				if (req.body.download) {
					ReportExelService.liveTripGrouped(newAggrData, req.body.group_by, req.user.clientId, function (url) {
						return res.status(200).json({
							status: 'OK', message: 'report avalilabel for download', url
						});
					});
				} else {
					for (consign in newAggrData) {
						if (newAggrData.hasOwnProperty(consign)) {
							var totalTripsOfConsign = Object.values(newAggrData[consign]).reduce((acc, curr, i) => acc += curr.length, 0);
							newAggrData[consign]['percentages'] = {};
							for (var x in newAggrData[consign]) {
								if (newAggrData[consign].hasOwnProperty(x)) {
									const percent = ((newAggrData[consign][x].length / totalTripsOfConsign) * 100);
									newAggrData[consign]['percentages'][`${x}`] = numberUtils.isFloat(percent) ? percent.toFixed(2) : percent;

								}
							}
							if (req.body.gpsExists === 1) {
								delete newAggrData[consign]['NA'];
							}
							delete newAggrData[consign]['percentages']['percentages'];
						}
					}
					return res.status(200).json({"status": "OK", "message": "No data", "data": newAggrData});
				}
			}

			if (req.body.group_by === 'driver') {
				var newAggrData = dbData.data.reduce((acc, curr, i) => {
					var consignor = (curr.vehicle && curr.vehicle.trip && curr.vehicle.trip.driver && curr.vehicle.trip.driver.name) || `${req.body.group_by} not defined trips`;
					var tStat = curr.t_status && curr.t_status.match(/^Early|Delayed|On Time|Not on trip/i);
					var matched = (tStat && tStat[0]) || 'NA';
					if (acc[consignor]) {
						if (acc[consignor][matched]) {
							acc[consignor][matched].push(curr);
						} else {
							acc[consignor][matched] = [curr];
						}
					} else {
						acc[consignor] = {};
						acc[consignor][matched] = [curr];
					}
					return acc;
				}, {});

				if (req.body.download) {
					ReportExelService.liveTripGrouped(newAggrData, req.body.group_by, req.user.clientId, function (url) {
						return res.status(200).json({
							status: 'OK', message: 'report avalilabel for download', url
						});
					});
				} else {
					for (consign in newAggrData) {
						if (newAggrData.hasOwnProperty(consign)) {
							var totalTripsOfConsign = Object.values(newAggrData[consign]).reduce((acc, curr, i) => acc += curr.length, 0);
							newAggrData[consign]['percentages'] = {};
							for (var x in newAggrData[consign]) {
								if (newAggrData[consign].hasOwnProperty(x)) {
									const percent = ((newAggrData[consign][x].length / totalTripsOfConsign) * 100);
									newAggrData[consign]['percentages'][`${x}`] = numberUtils.isFloat(percent) ? percent.toFixed(2) : percent;
								}
							}
							if (req.body.gpsExists === 1) {
								delete newAggrData[consign]['NA'];
							}
							delete newAggrData[consign]['percentages']['percentages'];
						}
					}
					return res.status(200).json({"status": "OK", "message": "No data", "data": newAggrData});
				}
			}

			if (req.body.group_by === 'segment') {
				var newAggrData = dbData.data.reduce((acc, curr, i) => {
					var consignor = (curr.vehicle && curr.vehicle.segment_type) || `${req.body.group_by} not defined trips`;
					var tStat = curr.t_status && curr.t_status.match(/^Early|Delayed|On Time|Not on trip/i);
					var matched = (tStat && tStat[0]) || 'NA';
					if (acc[consignor]) {
						if (acc[consignor][matched]) {
							acc[consignor][matched].push(curr);
						} else {
							acc[consignor][matched] = [curr];
						}
					} else {
						acc[consignor] = {};
						acc[consignor][matched] = [curr];
					}
					return acc;
				}, {});

				if (req.body.download) {
					ReportExelService.liveTripGrouped(newAggrData, req.body.group_by, req.user.clientId, function (url) {
						return res.status(200).json({
							status: 'OK', message: 'report avalilabel for download', url
						});
					});
				} else {
					for (consign in newAggrData) {
						if (newAggrData.hasOwnProperty(consign)) {
							var totalTripsOfConsign = Object.values(newAggrData[consign]).reduce((acc, curr, i) => acc += curr.length, 0);
							newAggrData[consign]['percentages'] = {};
							for (var x in newAggrData[consign]) {
								if (newAggrData[consign].hasOwnProperty(x)) {
									const percent = ((newAggrData[consign][x].length / totalTripsOfConsign) * 100);
									newAggrData[consign]['percentages'][`${x}`] = numberUtils.isFloat(percent) ? percent.toFixed(2) : percent;
								}
							}
							if (req.body.gpsExists === 1) {
								delete newAggrData[consign]['NA'];
							}
							delete newAggrData[consign]['percentages']['percentages'];
						}
					}
					return res.status(200).json({"status": "OK", "message": "No data", "data": newAggrData});
				}
			}

		}

		else {
			return res.status(200).json({
				status: "SUCCESS",
				message: "OK",
				data: dbData
			});
		}
	}
	else {
		return res.status(200).json({
			"status": "OK",
			"message": "No data",
			"data": []
		});
	}
});

router.post('/gpsKmAnalysis', async (req, res, next) => {
	if (otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({"status": "ERROR", "message": "No body found"});
	}
	if (!req.body.start_time || !req.body.end_time) {
		return res.status(500).json({"status": "ERROR", "message": "Date range not provided!"});
	}
	if (!req.clientData.gpsgaadi_token || !req.clientData.gpsId) {
		return res.status(500).json({"status": "ERROR", "message": "GPS authorization not found!"});
	}
	try {
		let vehicles;
		let gpsVehicles = [];
		let imeis = [];
		if(!req.body.device_imei) {
			vehicles = await Vehicle.find({clientId: req.user.clientId, device_imei: {$exists: true}}, {
				_id: 1,
				device_imei: 1
			});
			for (let veh of vehicles) {
				if (veh.device_imei) {
					imeis.push(veh.device_imei);
					gpsVehicles.push(veh);
				}
			}
		}
		let requestObj = {
			"device_id": req.body.device_imei || imeis,
			"request": "report_mileage",
			"start_time": req.body.start_time,
			"end_time": req.body.end_time,
			"selected_uid": req.clientData.gpsgaadi_user_id,
			"login_uid":  req.clientData.gpsgaadi_user_id
		};
		let url = "http://localhost:8081/api/reports/mileage";
		if(config.gpsApi){
			url = "http://"+config.gpsApi.host+":"+config.gpsApi.port+"/api/reports/mileage";
		}
		request.post({
			headers: {'content-type': 'application/json', 'Authorization': req.clientData.gpsgaadi_token},
			url: url,
			body: JSON.stringify(requestObj)
		}, function (error, response, body) {
			if (body) body = JSON.parse(body);
			if (error) {
				error.message = 'GPS KM data not found!!'
				return next(error);
			}
			if (body.status !== 'OK' || !body.devices) {
				return res.status(500).json({"status": "ERROR", "message": "GPS data not found"});
			}
			let resData = [];
			if(req.body.device_imei){
				resData = body;
			}else {
				for (let veh of gpsVehicles) {
					if (veh.device_imei && body.devices[veh.device_imei])
						veh.totalKm = body.devices[veh.device_imei].tot_dist / 1000 || 0;
					else
						veh.totalKm = 0;
					let index = resData.findIndex(r => r.key === veh.segment_type);
					if (index !== -1) {
						resData[index].count += veh.totalKm;
						resData[index].vehicles.push({
							"totalKm": veh.totalKm,
							"req_no": veh.vehicle_reg_no,
							"veh_status": veh._doc && veh._doc.gpsData && veh._doc.gpsData.status,
							"gps_exist": !!veh.gpsData,
							"address": (veh.gpsData.address && veh.gpsData.address) || false
						});
					} else {
						resData.push({
							"key": veh.segment_type,
							"count": veh.totalKm,
							"vehicles": [{
								"totalKm": veh.totalKm,
								"req_no": veh.vehicle_reg_no,
								"veh_status": veh._doc && veh._doc.gpsData && veh._doc.gpsData.status,
								"gps_exist": !!veh.gpsData,
								"address": (veh.gpsData.address && veh.gpsData.address) || false
							}]
						})
					}
				}
			}
			return res.status(200).json({
				"status": "OK",
				"message": "Segment Wise KM analysis data found!",
				"data": resData
			});
		});
	}
	catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString()
		});
	}
});

router.get('/vehicle-km-analysis', (req, res, next) => {
	if (req.query.download === "1" && req.query.group_by) {
		req.query.no_of_docs = 3000;
	}

	req.query.aggQuery = [];

	otherUtil.pagination(GPSData, req.query, async function (err, dbData) {
		if (err) return res.status(500).json({
			"status": "ERROR",
			"message": err.toString()
		});
		if (dbData && dbData.data && dbData.data[0]) {
			formatDataForHistory(dbData.data);
			if (req.query.download === "1" && req.query.group_by) {

				if (req.query.group_by === 'consignor' || req.query.group_by === 'consignee') {
					var newAggrData = dbData.data.reduce((acc, curr, i) => {
						var consignor = (curr.gr && curr.gr[req.query.group_by] && curr.gr[req.query.group_by].name) || `${req.query.group_by} not assigned trips`;
						var matched = curr.t_status.match(/^Early|Delayed|On Time/i)[0];
						if (acc[consignor]) {
							if (acc[consignor][matched]) {
								acc[consignor][matched].push(curr);
							} else {
								acc[consignor][matched] = [curr];
							}
						} else {
							acc[consignor] = {};
							acc[consignor][matched] = [curr];
						}
						return acc;
					}, {});

					ReportExelService.tripHistoryGrouped(newAggrData, req.query.group_by, req.user.clientId, function (url) {
						return res.status(200).json({
							status: 'OK', message: 'report avalilabel for download', url
						});
					});
				}

				if (req.query.group_by === 'driver') {
					var newAggrData = dbData.data.reduce((acc, curr, i) => {
						var consignor = (curr.trip && curr.trip.driver && curr.trip.driver.name) || `${req.query.group_by} not defined trips`;
						var matched = curr.t_status.match(/^Early|Delayed|On Time/i)[0];
						if (acc[consignor]) {
							if (acc[consignor][matched]) {
								acc[consignor][matched].push(curr);
							} else {
								acc[consignor][matched] = [curr];
							}
						} else {
							acc[consignor] = {};
							acc[consignor][matched] = [curr];
						}
						return acc;
					}, {});

					ReportExelService.tripHistoryGrouped(newAggrData, req.query.group_by, req.user.clientId, function (url) {
						return res.status(200).json({
							status: 'OK', message: 'report avalilabel for download', url
						});
					});
				}

				if (req.query.group_by === 'segment') {
					var newAggrData = dbData.data.reduce((acc, curr, i) => {
						var consignor = (curr.vehicle && curr.vehicle.segment_type) || `${req.query.group_by} not defined trips`;
						var matched = curr.t_status.match(/^Early|Delayed|On Time/i)[0];
						if (acc[consignor]) {
							if (acc[consignor][matched]) {
								acc[consignor][matched].push(curr);
							} else {
								acc[consignor][matched] = [curr];
							}
						} else {
							acc[consignor] = {};
							acc[consignor][matched] = [curr];
						}
						return acc;
					}, {});

					ReportExelService.tripHistoryGrouped(newAggrData, req.query.group_by, req.user.clientId, function (url) {
						return res.status(200).json({
							status: 'OK', message: 'report avalilabel for download', url
						});
					});
				}

			} else {
				return res.status(200).json({status: "OK", "message": "OK", data: dbData.data});
			}
		} else {
			return res.status(200).json({
				"status": "OK",
				"message": "No data",
				"data": []
			});
		}
	});

});

function getStateFromAddress(address) {
	let found;
	constant.states.forEach(function (state) {
		var s = state.exec(address);
		if (s) {
			found = s[0];
			if (found === 'Dadra And Nagar Haveli') {
				found = 'Dadra and Nagar Haveli';
			}
			if (found === 'Enmulanara') {
				found = 'Telangana';
			}
			if (found === 'Okhla') {
				found = 'Delhi';
			}
			if (found === 'Patna') {
				found = 'Bihar';
			}
			if (found === 'Gurugram' || found === 'Maruti Udyog' || found === 'Rewari' || found === 'Manesar' || found === 'Karnal' || found === 'Sonepat') {
				found = 'Haryana';
			}
			if (found === 'Bengaluru' || found === 'Chandapura' || found === 'Bijapur') {
				found = 'Karnataka';
			}
			if (found === 'Solapur' || found === 'Aurangabad' || found === 'Khamgaon' || found === 'Thane' || found === 'Kamothe' || found === 'Pune') {
				found = 'Maharashtra';
			}
			if (found === 'Hyderabad' || found === 'Secunderabad') {
				found = 'Telangana';
			}
			if (found === 'Vijayawada') {
				found = 'Andhra Pradesh';
			}
			if (found === 'Chennai' || found === 'Kavangarai') {
				found = 'Tamil Nadu';
			}
			if (found === 'Vapi' || found === 'Kalol' || found === 'Sabarkatha' || found === 'Ahmedabad') {
				found = 'Gujarat';
			}
			if (found === 'Varanasi' || found === 'Gulistanpur' || found === 'Mathura' || found === 'Naveen Galla Mandi') {
				found = 'Uttar Pradesh';
			}
			if (found === 'Haridwar') {
				found = 'Uttarakhand';
			}
			if (found.toLowerCase() === 'kota' || found === 'Ajmer') {
				found = 'Rajasthan';
			}
			if (found === 'Daman & Diu') {
				found = 'Daman and Diu';
			}
			if (found === 'Jabalpur') {
				found = 'Madhya Pradesh';
			}
		}
	});
	return found || 'Unknown';
}

router.post('/vehicle/location', async (req, res, next) => {

	let dbData = await Vehiclewise.trackVehicles(req, res);

	if (!(dbData && Array.isArray(dbData.data) && dbData.data[0])) {
		return res.status(200).json({
			"status": "OK",
			"message": "No data",
			"data": []
		});
	}

	let vehicles = dbData.data;
	var stateToVehicle = {};
	var zoneToVehicle = {};
	var zoneResult = [];
	var vehicleMapper = vehicles.map(async (veh) => {
		let obj = {
			device_imei: veh.vehicle.device_imei,
			vehicle_reg_no: veh.vehicle.vehicle_reg_no,
			address: (veh.vehicle.gpsData && veh.vehicle.gpsData.address) || 'No GPS Device',
			state: (req.body.route_type && req.body.route_type === 'destination')
				? (veh.vehicle.trip && veh.vehicle.trip.route && veh.vehicle.trip.route.destination && veh.vehicle.trip.route.destination.placeName && veh.vehicle.trip.route.destination.placeAddress && getStateFromAddress(`${veh.vehicle.trip.route.destination.placeName}, ${veh.vehicle.trip.route.destination.placeAddress}`)) || 'No GPS Device'
				: (veh.vehicle.gpsData && veh.vehicle.gpsData.address && getStateFromAddress(veh.vehicle.gpsData.address)) || 'No GPS Device',
			status: veh.vehicle.status,
			segment: veh.vehicle.segment_type,
			gpsData: veh.vehicle.gpsData,
			expected_eta: veh.expected_eta,
			current_eta: veh.current_eta,
			distance_travelled: veh.distance_travelled,
			trip: veh.vehicle.trip,
			gr: veh.vehicle.gr,
			driver_name: veh.vehicle.driver_name,
			last_known: {
				...veh.vehicle.last_known,
				trip: {
					gr: (veh.vehicle.last_known && veh.vehicle.last_known.trip && veh.vehicle.last_known.trip.gr) ? [veh.vehicle.last_known.trip.gr] : []
				}
			},
			veh_type_name: veh.vehicle.veh_type_name
		};
		if (obj.status === "Available" && veh.vehicle.gpsData && veh.vehicle.gpsData.location) {
			try {
				obj.nearestConsignor = await Consignor_Consignee.findOne({
					type: "Consignor",
					location: {
						$near: {
							$geometry: veh.vehicle.gpsData && veh.vehicle.gpsData.location
						}
					}
				}, {name: 1, lat: 1, lng: 1, address: 1});
			} catch(e) {
				obj.nearestConsignor = e;
			}
		}
		else {
			delete obj.last_known;
		}
		return Promise.resolve(obj);
	});
	vehicles = await Promise.all(vehicleMapper);
	vehicles.forEach(function (veh) {
		if (stateToVehicle[veh.state]) {
			stateToVehicle[veh.state].push(veh);
		} else {
			stateToVehicle[veh.state] = [veh];
		}
	});
	if (req.body.type === 'state') {
		return res.status(200).json({
			"status": "OK",
			"message": "Data",
			"data": stateToVehicle
		});
	} else if (req.body.type === 'zone') {
		for (var key in stateToVehicle) {
			if (stateToVehicle.hasOwnProperty(key)) {
				if (zoneToVehicle[constant.stateToZone[key]]) {
					zoneToVehicle[constant.stateToZone[key]].push(stateToVehicle[key]);
				} else {
					zoneToVehicle[constant.stateToZone[key]] = [stateToVehicle[key]];
				}
			}
		}
		for (var key in zoneToVehicle) {
			if (zoneToVehicle.hasOwnProperty(key)) {
				zoneResult.push({
					[key]: zoneToVehicle[key]
				});
			}
		}
		return res.status(200).json({
			"status": "OK",
			"message": "Data",
			"data": zoneResult
		});
	} else {
		return res.status(200).json({
			"status": "OK",
			"message": "Query type must be either 'state' or 'zone'",
			"data": []
		});
	}
});

let preVehicleSearchFields = {
	"clientId": 1,
	"vendor_id": 1,
	"vehicle_reg_no": 1,
	"vehicles": 1,
	"device_imei": 1,
	"gpsData.status": 1,
	'status': 1,
	'segment_type': 1
};

let preVehicleFilter = function (reqQuery) {
	let fFilter = {};
	for (let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in preVehicleSearchFields)) {
			if (key === "vehicle_reg_no") {
				fFilter[key] = {$regex: reqQuery[key].replace(' ', '.+'), $options: '-i'};
			} else if(key === 'vehicles') {
				fFilter['_id'] = { $in: otherUtil.arrString2ObjectId(reqQuery[key]) }
			} else {
				fFilter[key] = reqQuery[key];
			}
		}
	}
	return fFilter;
};
let tripSearchFields = {
	"branch": 1, "trip_no": 1, "route": 1, "route_name": 1, "driver": 1, "trip_manager": 1,
	"loading_babu": 1, "gr": 1
};

let tripFilter = function (reqQuery) {
	let fFilter = {};
	for (let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in tripSearchFields)) {
			if (key === "route" || key === "driver") {
				fFilter['trip.' + key] = mongoose.Types.ObjectId(reqQuery[key]);
			} else {
				fFilter['trip.' + key] = reqQuery[key];
			}
		}
	}
	return fFilter;
};

let grSearchFields = {"gr_type": 1, "booking": 1, "grNumber": 1};

let grFilter = function (reqQuery) {
	let fFilter = {};
	for (let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in grSearchFields)) {
			fFilter['gr.' + key] = reqQuery[key];
		}
	}
	return fFilter;
};

module.exports = router;

function formatData(d) {
	for (var i = 0; i < d.length; i++) {
		if (d[i].distance_travelled) {
			d[i].distance_travelled = Math.ceil(d[i].distance_travelled);
			//if(d[i].distance_travelled < 0 && d[i].distance_travelled > -200){
			if(d[i].distance_travelled < 0){
				d[i].distance_travelled = 0;
			}
		}
		if (d[i].current_eta && d[i].expected_eta) {
			d[i].delay_parameter = (d[i].vehicle && d[i].vehicle.gr && d[i].vehicle.gr.vehicle_arrived_for_unloading_status && d[i].vehicle.gr.vehicle_arrived_for_unloading_status.date)
				|| (d[i].vehicle && d[i].vehicle.gr && d[i].vehicle.gr.unloading_started_status && d[i].vehicle.gr.unloading_started_status.date)
				|| (d[i].vehicle && d[i].vehicle.gr && d[i].vehicle.gr.unloading_ended_status && d[i].vehicle.gr.unloading_ended_status.date)
				|| (d[i].vehicle && d[i].vehicle.trip && d[i].vehicle.trip.trip_end_status && d[i].vehicle.trip.trip_end_status.date)
				|| d[i].current_eta;
			d[i].trip_delay = (new Date(d[i].delay_parameter).getTime() - new Date(d[i].expected_eta)) / (1000 * 60 * 60);
			d[i].trip_delay = +d[i].trip_delay.toFixed(2);
			d[i].formattedDelay = (parseInt(d[i].trip_delay / 24)) + 'D ' + (parseInt(d[i].trip_delay % 24)) + 'H';
			if (d[i].trip_delay > 10) {
				d[i].status = d[i].t_status = 'Delayed';
				d[i].t_status = `${d[i].t_status} (${d[i].formattedDelay})`;
			} else if (d[i].trip_delay < - 12) {
				d[i].status = d[i].t_status = 'Early';
				d[i].t_status = `${d[i].t_status} (${d[i].formattedDelay})`;
			} else {
				d[i].status = d[i].t_status = 'On Time';
				d[i].trip_delay = 0;
				d[i].t_status = `${d[i].t_status} (${d[i].formattedDelay})`;
			}
		}
		if (d[i].vehicle.status !== 'In Trip' && d[i].vehicle.status !== 'Empty Trip') {
			d[i].t_status = 'Not on trip';
		}
		if (d[i].vehicle.status == 'Available' && d[i].vehicle.trip && d[i].vehicle.trip.trip_no) {
			d[i].vehicle.status = 'In Trip';
		}
	}
}

function formatDataForHistory(d) {
	for (var i = 0; i < d.length; i++) {
		d[i].transit_time = `${convertMS(d[i].transit_time, true)}`;
		d[i].trip_duration = `${convertMS(d[i].trip_duration, true)}`;
		d[i].loading_time = `${convertMS(d[i].loading_time, true)}`;
		d[i].unloading_time = `${convertMS(d[i].unloading_time, true)}`;
		d[i].route.route_distance = d[i].route.route_distance.toFixed(2);
		d[i].distance_travelled = (d[i].distance_travelled && d[i].distance_travelled.toFixed(2)) || '0';
		d[i].trip_delay = convertMS(d[i].delay);
		if (d[i].trip_delay.d >= 1 || d[i].trip_delay.h >= 3) {
			d[i].t_status = `Delayed (${convertMS(d[i].delay, true)})`;
			d[i].status = 'Delayed';
		} else if (d[i].trip_delay.d <= -1 || d[i].trip_delay.h <= -3) {
			d[i].t_status = `Early (${convertMS(d[i].delay, true)})`;
			d[i].status = 'Early';
		} else {
			d[i].t_status = `On Time (${convertMS(d[i].delay, true)})`;
			d[i].status = 'On Time';
		}
	}
}

function convertMS(ms, formatted) {
	var d, h, m, s;
	s = Math.floor(ms / 1000);
	m = Math.floor(s / 60);
	s = s % 60;
	h = Math.floor(m / 60);
	m = m % 60;
	d = Math.floor(h / 24);
	h = h % 24;
	if (formatted) {
		let _d = Math.abs(d);
		let _h = Math.abs(h);
		let _m = Math.abs(m);
		if (!_d && !_h) {
			return `${_m} min${_m > 1 ? 's' : ''}`;
		}
		if (!_d) {
			return `${_h} Hr${_h > 1 ? 's' : ''} ${_m} min${_m > 1 ? 's' : ''}`;
		}
		return `${_d} Day${_d > 1 ? 's' : ''} ${_h} Hr${_h > 1 ? 's' : ''} ${_m} min${_m > 1 ? 's' : ''}`;
	}
	return {d: d, h: h, m: m, s: s};
}
