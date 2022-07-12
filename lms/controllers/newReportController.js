/**
 * Initial version by: Nipun Bhardwaj
 * Initial version created on: 04/10/19
 */

const router = express.Router();
const moment = require('moment');
const TripV2 = commonUtil.getModel('trip');
let Voucher = commonUtil.getModel('voucher');
const NewExcelService = commonUtil.getService("newExcel");
const serverSidePage = require('../../utils/serverSidePagination');
const AcBal = commonUtil.getModel('accountbalances');
let ReportExelService = commonUtil.getService("reportExel");

router.post("/driverPayment", async (req, res) => {
	if (!req.body.from || !req.body.to) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'from date, to date are mandatory',
		});
	}
	try {
		const consFilter = (oBody) => {
			let o = {
				'advSettled.tsNo': {$exists: true},
				"payments": {
					"$ne": []
				}
			};

			for (let key in oBody) {
				if (oBody.hasOwnProperty(key) && ['clientId' , 'vehicle', 'driver', 'vendor', 'branch','advSettled.tsNo'].indexOf(key) >= 0) {
					/*if (oBody[key].toString().match(/^[0-9a-fA-F]{24}$/)) {
						o[key] = otherUtil.arrString2ObjectId(oBody[key]);
					}*/
					if (key === 'driver') {
						o.driver = {$in: otherUtil.arrString2ObjectId(oBody[key])}
					}  else if (key === 'vendor') {
						o.vendor = otherUtil.arrString2ObjectId(oBody[key]._id);
					}  else if (key === 'vehicle') {
						o.vehicle = otherUtil.arrString2ObjectId(oBody[key]._id);
					} else if (key === 'branch') {
						o.branch = otherUtil.arrString2ObjectId(oBody[key]._id);
					} else {
						o[key] = oBody[key];
					}
				}
			}

			if(oBody.markSettle){
				o['markSettle.isSettled'] = true;
			}

			return o;
		};

		const consFilterVoucher = (oBody) => {
			let o = {};

			for (let key in oBody) {
				if (oBody.hasOwnProperty(key) && ['refNo','amount','type'].indexOf(key) >= 0) {

					if (key === 'type') {
						o['voucher.type'] = oBody[key];
					}  else if (key === 'refNo') {
						if (oBody[key] instanceof RegExp)
							o['voucher.refNo'] = oBody[key];
						else
							o['voucher.refNo'] = new RegExp('^' + oBody[key].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
					}
				}
			}

			o['voucher.date'] = {
					$gte: new Date(new Date(oBody.from).setHours(0, 0, 0, 0)),
					$lte: new Date(new Date(oBody.to).setHours(23, 59, 59, 999))
			};

			return o;
		};

		let oFil = consFilter(req.body);
		let oFilVC = consFilterVoucher(req.body);

		const aggrQuery = [
			{$match: oFil},
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
			{
				"$lookup": {
					"from": "vendortransports",
					"localField": "vendor",
					"foreignField": "_id",
					"as": "vendor"
				}
			},
			{
				"$unwind": {
					"path": '$vendor',
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "registeredvehicles",
					"localField": "vehicle",
					"foreignField": "_id",
					"as": "vehicle"
				}
			},
			{
				"$unwind": {
					"path": '$vehicle',
					"preserveNullAndEmptyArrays": true
				}
			},

			{
				"$lookup": {
					"from": "branches",
					"localField": "branch",
					"foreignField": "_id",
					"as": "branch"
				}
			},
			{
				"$unwind": {
					"path": '$branch',
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "vouchers",
					"localField": "payments",
					"foreignField": "_id",
					"as": "voucher"
				}
			},
			{
				"$unwind": {
					"path": '$voucher',
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$match": oFilVC
			},
			{
				"$project": {
					"branch.name": 1,
					"advSettled.tsNo": 1,
					"vendor.name":1,
					"vehicle.vehicle_reg_no":1,
					"driver.name":1,
					"voucher":1
				}
			},
			{
				"$sort": {
					"trip_start.date": -1
				}
			}
		];
		let rt = await TripV2.aggregate(aggrQuery).allowDiskUse(true);

		if (!req.body.download || req.body.download === "false") {
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Driver Payment Report',
				data: rt
			});
		} else {
			function ReportResponse(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "Driver Payment Report",
					"url": data.url,
					"html": data.html
				});
			}

			ReportExelService.driverPaymentReport(rt, req.user.clientId, ReportResponse)
		}
	} catch (err) {
		return res.status(500).json({
			status: "ERROR",
			message: err.toString()
		});
	}
});

router.post("/driverPerformance", async (req, res) => {
	if (!req.body.from || !req.body.to) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'from date, to date are mandatory',
		});
	}
	// if (!req.body.driver || !req.body.driver.length) {
	// 		return res.status(500).json({
	// 			status: 'ERROR',
	// 			message: 'please select driver',
	// 		});
	// }
	try {
		const consFilter = (oBody) => {
			let o = {
				'advSettled.tsNo': {$exists: true}
			};

			for (let key in oBody) {
				if (oBody.hasOwnProperty(key) && ['clientId', 'advSettled.tsNo', 'vehicle', 'driver'].indexOf(key) >= 0) {
					if (oBody[key].toString().match(/^[0-9a-fA-F]{24}$/)) {
						o[key] = otherUtil.arrString2ObjectId(oBody[key]);
					}
					if (key === 'driver') {
						o.driver = {$in: otherUtil.arrString2ObjectId(oBody[key])}
					} else {
						o[key] = oBody[key];
					}
				}
			}
			if ((typeof (o['advSettled.tsNo']) !== 'number') && oBody.from && oBody.to) {
				o['statuses'] = {
					$elemMatch: {
						'status': "Trip started",
						date: {
							$gte: new Date(new Date(oBody.from).setHours(0, 0, 0, 0)),
							$lte: new Date(new Date(oBody.to).setHours(23, 59, 59, 999))
						}
					}
				};
			}
			if ((typeof (o['advSettled.tsNo']) !== 'number') && oBody.segment_type) {
				o['segment_type'] = oBody.segment_type;
			}

			if(oBody.markSettle){
				o['markSettle.isSettled'] = true;
			}

			return o;
		};
		let oFil = consFilter(req.body);
		const aggrQuery = [
			{$match: oFil},
			{
				$lookup: {
					from: 'tripgrs',
					localField: 'gr',
					foreignField: '_id',
					as: 'gr'
				}
			},
			{
				$lookup: {
					from: 'drivers',
					localField: 'driver',
					foreignField: '_id',
					as: 'driver'
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
				$lookup: {
					from: 'tripsexpenses',
					localField: 'trip_expenses',
					foreignField: '_id',
					as: 'trip_expenses'
				}
			},
			{
				$lookup: {
					from: 'tripadvances',
					localField: 'advanceBudget',
					foreignField: '_id',
					as: 'advanceBudget'
				}
			},
			{
				$project: {
					'gr': 1,
					'route': {$arrayElemAt: ['$route', 0]},
					'trip_expenses': 1,
					'advanceBudget': 1,
					'vehicle': 1,
					'payments': 1,
					'driver': 1,
					'statuses': 1,
					'advSettled': 1,
					'extraKm':1,
					'markSettle': 1,
					'category': 1
				}
			},
			{
				$addFields: {
					'route': '$route.name',
					'actual_expense': {
						$reduce: {
							input: '$trip_expenses',
							initialValue: 0,
							in: {$add: ["$$value", {$ifNull: ["$$this.amount", 0]}]},
						}
					},
					'internal_freight': {
						$reduce: {
							input: '$gr',
							initialValue: 0,
							in: {
								$add: [
									"$$value",
									{"$ifNull": ["$$this.totalFreight", {"$ifNull": ["$$this.internal_rate", 0]}]}
								]
							},
						}
					},
					'tAdv': {
						$reduce: {
							input: '$advanceBudget',
							initialValue: 0,
							in: {$add: ["$$value", {$ifNull: ["$$this.amount", 0]}]},
						}
					},
					'totalKm': {
						$add: [
							{
								$cond: [
									{$eq: ['$route.route_distance', 0]},
									1,
									{$ifNull: ['$route.route_distance', 1]},
								]
							},
							{$ifNull: ['$extraKm', 0]}
						]
					},
					'trip_start': {
						$arrayElemAt: [{
							$filter: {input: '$statuses', as: 'item', cond: {$eq: ['$$item.status', 'Trip started']}}
						}, -1
						]
					},
					'trip_end': {
						$arrayElemAt: [{
							$filter: {input: '$statuses', as: 'item', cond: {$eq: ['$$item.status', 'Trip ended']}}
						}, -1
						]
					},
				}
			},
			{$sort: {'trip_start.date': 1}},
			{
				$group: {
					_id: '$advSettled.tsNo',
					trips: {$push: '$$ROOT'},
					trip_start: {$first: '$trip_start'},
					trip_end: {$last: '$trip_end'},
					advSettled: {$last: '$advSettled'},
					markSettle: {$last: '$markSettle'},
					route: {$push: '$route'},
					//{'$cond': [{$eq: ['$category', 'Empty']}, null, '$route']}
					vehicle: {$last: '$vehicle'},
					driver: {$last: '$driver'},
					totalKM: {$sum: '$totalKm'},
					internal_freight: {$sum: '$internal_freight'},
					total_advance: {$sum: '$tAdv'},
					netExpense: {$sum: '$actual_expense'}
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
				$project: {
					_id: 1,
					trip_start: '$trip_start.date',
					trip_end: '$trip_end.date',
					trips: 1,
					markSettle: 1,
					advSettled: 1,
					route: {
						$filter: {
							input: "$route",
							as: "r",
							cond: {
								$ne: ["$$r", null]
							}
						}
					},
					vehicle: {$arrayElemAt: ['$vehicle', 0]},
					driver: {$arrayElemAt: ['$driver', 0]},
					totalKM: 1,
					internal_freight: 1,
					total_advance: 1,
					netExpense: 1
				}
			},
			{$sort: {'trip_start': -1}},
			{
				$addFields: {
					vehicle: '$vehicle.vehicle_reg_no',
					driver: '$driver.name'
				}
			},
			{$sort: {driver: 1}}
		];
		let rt = await TripV2.aggregate(aggrQuery).allowDiskUse(true);
		rt = await Voucher.populate(rt, {
			path: "trips.payments",
			select: {"ledgers.amount": 1, "ledgers.account": 1, "ledgers.cRdR": 1},
			options: {lean: true}
		});
		if (rt && rt.length) {
			rt.forEach(obj => {
				obj.driverPayment = 0;
				obj.trips.forEach(oTrip => {
					Array.isArray(oTrip.payments) && oTrip.payments.forEach(oPayment => {
						let amt = oPayment.ledgers && oPayment.ledgers.reduce((amt, o) => {
							oTrip.driver.account = oTrip.driver[0].account._id || oTrip.driver[0].account;
							if (oTrip.driver.account.toString() === o.account.toString()) {
								if (o.cRdR === 'DR') {
									return amt + o.amount
								} else {
									return amt - o.amount;
								}
							} else
								return amt;

						}, 0);

						// driverIncentiveVch += amt || 0;
						obj.driverPayment += amt || 0;
					});
				});
			});
		}
		if (!req.body.download || req.body.download === "false") {
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Driver Performance Report',
				data: rt
			});
		} else {
			function ReportResponse(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "Driver Performance Report",
					"url": data.url,
					"html": data.html
				});
			}
			NewExcelService.driverPerformance(rt, req.user.clientId, ReportResponse)
		}
	} catch (err) {
		return res.status(500).json({
			status: "ERROR",
			message: err.toString()
		});
	}
});

router.post("/driverAccount", async (req, res) => {
	// if (!req.body.from || !req.body.to) {
	// 	return res.status(500).json({
	// 		status: 'ERROR',
	// 		message: 'from date, to date are mandatory',
	// 	});
	// }
	if (!req.body.driver || !req.body.driver.length) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'please select driver',
		});
	}
	try {
		const consFilter = (oBody) => {
			let o = {ownershipType: {$ne: "Market"}};
			for (let key in oBody) {
				if (oBody.hasOwnProperty(key) && ['clientId', 'driver'].indexOf(key) >= 0) {
					if (key === 'driver') {
						o.driver = {$in: otherUtil.arrString2ObjectId(oBody[key])}
					} else {
						o[key] = oBody[key];
					}
				}
			}
			if (oBody.from && oBody.to) {
				o['statuses'] = {
					$elemMatch: {
						'status': "Trip started",
						date: {
							$gte: new Date(new Date(oBody.from).setHours(0, 0, 0, 0)),
							$lte: new Date(new Date(oBody.to).setHours(23, 59, 59, 999))
						}
					}
				};
			}
			return o;
		};
		let oFil = consFilter(req.body);
		const aggrQuery = [
			{$match: oFil},
			{
				"$lookup": {
					"from": "tripsexpenses",
					"localField": "trip_expenses",
					"foreignField": "_id",
					"as": "trip_expenses"
				}
			},
			{
				"$lookup": {
					"from": "tripadvances",
					"localField": "advanceBudget",
					"foreignField": "_id",
					"as": "advanceBudget"
				}
			},
			{
				"$lookup": {
					"from": "vouchers",
					"localField": "payments",
					"foreignField": "_id",
					"as": "payments"
				}
			},
			{
				$lookup: {
					from: 'drivers',
					localField: 'driver',
					foreignField: '_id',
					as: 'driver'
				}
			},
			{
				"$unwind": {
					"path": "$driver",
					"preserveNullAndEmptyArrays": true
				}
			},
			// {
			// 	"$lookup": {
			// 		"from": "registeredvehicles",
			// 		"localField": "vehicle",
			// 		"foreignField": "_id",
			// 		"as": "vehicle"
			// 	}
			// },
			// {
			// 	"$unwind": {
			// 		"path": "$vehicle",
			// 		"preserveNullAndEmptyArrays": true
			// 	}
			// },
			{
				"$addFields": {
					"tripStart": {
						"$arrayElemAt": [
							{
								"$filter": {
									"input": "$statuses",
									"as": "item",
									"cond": {
										"$eq": [
											"$$item.status",
											"Trip started"
										]
									}
								}
							},
							-1
						]
					},
					"tripEnd": {
						"$arrayElemAt": [
							{
								"$filter": {
									"input": "$statuses",
									"as": "item",
									"cond": {
										"$eq": [
											"$$item.status",
											"Trip ended"
										]
									}
								}
							},
							-1
						]
					},
				}
			},

			{
				"$project": {
					trip_no: 1,
					vehicle_no: 1,
					"tExp": {
						"$reduce": {
							"input": "$trip_expenses",
							"initialValue": 0,
							"in": {
								"$add": [
									"$$value",
									{
										"$ifNull": [
											"$$this.amount",
											0
										]
									}
								]
							}
						}
					},
					"tAdv": {
						"$reduce": {
							"input": "$advanceBudget",
							"initialValue": 0,
							"in": {
								"$add": [
									"$$value",
									{
										"$ifNull": [
											"$$this.amount",
											0
										]
									}
								]
							}
						}
					},
					// "vehicleNo": "$vehicle.vehicle_reg_no",
					"payments": 1,
					"driverName": "$driver.name",
					"driverAcc": "$driver.account",
					"driverId": "$driver._id",
					"driverCode": "$driver.employee_code",
					"advSettled": 1,
					"markSettle": 1,
					"tripStart": "$tripStart.date",
					"tripEnd": "$tripEnd.date"
				}
			},
			{
				"$sort": {
					"tripStart": 1
				}
			},
			{
				"$group": {
					"_id": {
						"tsNo": "$advSettled.tsNo",
						"driver": "$driverName"
					},
					"trips": {
						"$push": "$$ROOT"
					},
					"tripStart": {
						"$first": "$tripStart"
					},
					"tripEnd": {
						"$last": "$tripEnd"
					},
					"markSettle": {
						"$first": "$markSettle"
					},
					// "vehicleNo": {
					// 	"$first": "$vehicleNo"
					// },
					"driverName": {
						"$first": "$driverName"
					},
					"driverId": {
						"$first": "$driverId"
					},
					"driverAcc": {
						"$first": "$driverAcc"
					},
					"driverCode": {
						"$first": "$driverCode"
					},
					"tAdv": {
						"$sum": "$tAdv"
					},
					"tExp": {
						"$sum": "$tExp"
					}
				}
			},
			{
				"$project": {
					"trip_no": 1,
					"vehicle_no": 1,
					"trips": 1,
					"tExp": 1,
					"tAdv": 1,
					"payments": 1,
					"driverName": 1,
					"driverAcc": 1,
					"driverId": 1,
					"driverCode": 1,
					"advSettled": 1,
					"markSettle": 1,
					"tripStart": 1,
					"tripEnd": 1
				}
			},
			{
				"$sort": {
					"tripStart": -1
				}
			},
			{
				"$group": {
					"_id": {
						"driver": "$driverName"
					},
					"aData": {
						"$push": "$$ROOT"
					}
				}
			}
		];

		let oQuery = {aggQuery:aggrQuery, no_of_docs:10000};
		let aDriver = await serverSidePage.requestData(TripV2 ,oQuery);
		// let aDriver = await TripV2.aggregate(aggrQuery).allowDiskUse(true);
		let aRtDriver = [];
		if (aDriver && aDriver.length) {
			for (let [index, oDriver] of aDriver.entries()) {
				oDriver.aData.sort( (a,b) => new Date(a.tripStart) - new Date(b.tripStart) );
				let drAcBal;
				let drAcc = oDriver.aData[0].driverAcc;
				if (drAcc) {
					drAcBal = await AcBal.findOne({
						account: drAcc,
						date: {$lte: moment(oDriver.aData[0].tripStart).startOf('day').toDate()}
					}, {ob: 1}).sort({date: -1}).limit(1).lean();
				}

				aRtDriver[index] = aRtDriver[index] || {
					ob: drAcBal ? drAcBal.ob : 0,
					driver: oDriver.aData[0].driverName,
					aTrips: []
				};

				let aUnsettled = [];
				oDriver.aData.forEach(oData => {

					let isMarkSettle = oData.trips[0].markSettle && oData.trips[0].markSettle.isSettled;
					let isRtSet = oData.trips[0].advSettled && oData.trips[0].advSettled.tsNo;

					if (!isMarkSettle && !isRtSet) {
						aUnsettled.push(...oData.trips);
					} else {
						oData.trips.forEach(oTrip => {
							oData.payments = oData.payments || [];
							oData.payments.push(...oTrip.payments);
						});
						aRtDriver[index].aTrips.push(oData);
					}
				});
				aRtDriver[index].aTrips.push(...aUnsettled);
			}
		}
		if (!req.body.download || req.body.download === "false") {
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Driver Account Report',
				data: aDriver
			});
		} else {
			function ReportResponse(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "Driver Account Report",
					"url": data.url,
					"html": data.html
				});
			}

			NewExcelService.driverAccReport(aRtDriver, req.user.clientId, ReportResponse)
		}
	} catch (err) {
		return res.status(500).json({
			status: "ERROR",
			message: err.toString()
		});
	}
});

module.exports = router;
