var router = require('express').Router();
var Driver = promise.promisifyAll(commonUtil.getModel('driver'));
var Branch = promise.promisifyAll(commonUtil.getModel('branch'));
var RegVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
var VendorTransport = promise.promisifyAll(commonUtil.getModel('vendorTransport'));
var VendorFuel = promise.promisifyAll(commonUtil.getModel('vendorFuel'));
var VendorMaintenance = promise.promisifyAll(commonUtil.getModel('vendorMaintenance'));
var VendorCourier = promise.promisifyAll(commonUtil.getModel('vendorCourier'));
var TransportRoute = promise.promisifyAll(commonUtil.getModel('transportRoute'));
var Customer = promise.promisifyAll(commonUtil.getModel('customer'));
var User = promise.promisifyAll(commonUtil.getModel('user'));
var Department = promise.promisifyAll(commonUtil.getModel('department'));
var Bookings = promise.promisifyAll(commonUtil.getModel('bookings'));
var Trip = promise.promisifyAll(commonUtil.getModel('trip'));
var Bill = promise.promisifyAll(commonUtil.getModel('bills'));
var Client = promise.promisifyAll(commonUtil.getModel('client'));
var GR = promise.promisifyAll(commonUtil.getModel('tripGr'));
var TripExp = promise.promisifyAll(commonUtil.getModel('tripExpenses'));

var async = require('async');

var dashBoardData = {};

var stats = {};

var statsKeys = ['driver', 'branch', 'regvehicle', 'transportVendor', 'fuelVendor', 'courierVendor',
	'maintenanceVendor', 'route', 'customer', 'user', 'department', 'client', 'bookings'
];
var statsDesc = ['Drivers', 'Branches', 'Vehicles', 'Transport Vendors', 'Fuel Vendors', 'Courier Vendors',
	'Maintenance Vendors', 'Routes', 'Customers ', 'Users', 'Departments', 'Clients', 'Bookings today'
];

/***return dashboard stats. Generate again if dirty or else send from saved ***/
router.get('/stats', function (req, res, next) {
	console.log('user data in dashboard controller ' + JSON.stringify(req.user));
	if (dashBoardClientDirty[req.user.clientId] == undefined || (dashBoardClientDirty[req.user.clientId])) {
		async.series([
				function (callback) {
					Driver.countAsync({clientId: req.user.clientId})
					.then(function (countDrivers) {
						callback(null, countDrivers);
					});
				},
				function (callback) {
					Branch.countAsync({clientId: req.user.clientId})
					.then(function (countBranch) {
						callback(null, countBranch);
					});
				},
				function (callback) {
					RegVehicle.countAsync({clientId: req.user.clientId})
					.then(function (countRegVehicle) {
						callback(null, countRegVehicle);
					});
				},
				function (callback) {
					VendorTransport.countAsync({clientId: req.user.clientId})
					.then(function (vendorTransport) {
						callback(null, vendorTransport);
					});
				},
				function (callback) {
					VendorFuel.countAsync({clientId: req.user.clientId})
					.then(function (vendorFuelCount) {
						callback(null, vendorFuelCount);
					});
				},
				function (callback) {
					VendorCourier.countAsync({clientId: req.user.clientId})
					.then(function (vendorCourierCount) {
						callback(null, vendorCourierCount);
					});
				},
				function (callback) {
					VendorMaintenance.countAsync({clientId: req.user.clientId})
					.then(function (countVendorMaintenance) {
						callback(null, countVendorMaintenance);
					});
				},
				function (callback) {
					TransportRoute.countAsync({clientId: req.user.clientId})
					.then(function (transportRouteCount) {
						callback(null, transportRouteCount);
					});
				},
				function (callback) {
					Customer.countAsync({clientId: req.user.clientId})
					.then(function (countCustomer) {
						callback(null, countCustomer);
					});
				},
				function (callback) {
					User.countAsync({clientId: req.user.clientId})
					.then(function (countCustomer) {
						callback(null, countCustomer - 1);
					});
				},
				function (callback) {
					Department.countAsync({clientId: req.user.clientId})
					.then(function (countCustomer) {
						callback(null, countCustomer);
					});
				},
				function (callback) {
					Client.countAsync()
					.then(function (countCustomer) {
						callback(null, countCustomer - 1);
					});
				},
				function (callback) {
					var startDay = new Date();
					startDay.setDate(startDay.getDate());
					startDay.setSeconds(0);
					startDay.setHours(0);
					startDay.setMinutes(0);
					var endDay = new Date();
					endDay.setDate(endDay.getDate());
					endDay.setSeconds(59);
					endDay.setHours(23);
					endDay.setMinutes(59);

					var dateFilter = {
						'$gte': startDay,
						'$lt': endDay
					};
					var filter = [{$match: {created_at: dateFilter}},
						{$group: {_id: null, count: {$sum: 1}}}];
					Bookings.aggregateAsync(filter)
					.then(function (countArr) {
						if (countArr.length > 0) {
							callback(null, countArr[0].count);
						} else {
							callback(null, 0);
						}
					});
				}
			],
			function (err, result) {
				console.log('Got results from async task get dashboard data:' + JSON.stringify(result));
				var toReturn = {};
				var masters = [];
				var booking = [];
				var user_management = [];
				var client_management = [];
				for (var i = 0; i < statsKeys.length; i++) {
					if (statsKeys[i] in req.loginuser_role_data) {
						var obj = {};
						var emptyArr = [];
						obj['desc'] = statsDesc[i];
						obj['value'] = result[i];
						if (config.app_main_sub_map.masters.indexOf(statsKeys[i]) > -1) {
							masters.push(obj);
						} else if (config.app_main_sub_map.booking.indexOf(statsKeys[i]) > -1) {
							booking.push(obj);
						} else if (config.app_main_sub_map.user_management.indexOf(statsKeys[i]) > -1) {
							user_management.push(obj);
						} else if (config.app_main_sub_map.client_management.indexOf(statsKeys[i]) > -1) {
							client_management.push(obj);
						}
						//var newObj = JSON.parse(JSON.stringify(obj));
						//newObj.desc="";
						emptyArr.push(obj);
						toReturn[statsKeys[i]] = emptyArr;
					}
				}
				toReturn['booking'] = booking;
				toReturn['masters'] = masters;
				toReturn['user_management'] = user_management;
				toReturn['client_management'] = client_management;
				dashBoardClientDirty[req.user.clientId] = false;
				dashBoardData[req.user.clientId] = result;
				return res.status(200).json({'status': 'OK', 'data': toReturn});
			}
		);
	} else {
		var result = dashBoardData[req.user.clientId];
		var toReturn = {};
		var masters = [];
		var booking = [];
		var user_management = [];
		var client_management = [];
		for (var i = 0; i < statsKeys.length; i++) {
			if (statsKeys[i] in req.loginuser_role_data) {
				var obj = {};
				var emptyArr = [];
				obj['desc'] = statsDesc[i];
				obj['value'] = result[i];
				if (config.app_main_sub_map.masters.indexOf(statsKeys[i]) > -1) {
					masters.push(obj);
				} else if (config.app_main_sub_map.booking.indexOf(statsKeys[i]) > -1) {
					booking.push(obj);
				} else if (config.app_main_sub_map.user_management.indexOf(statsKeys[i]) > -1) {
					user_management.push(obj);
				} else if (config.app_main_sub_map.client_management.indexOf(statsKeys[i]) > -1) {
					client_management.push(obj);
				}
				//var newObj = JSON.parse(JSON.stringify(obj));
				//newObj.desc="";
				emptyArr.push(obj);
				toReturn[statsKeys[i]] = emptyArr;
			}
		}
		toReturn['booking'] = booking;
		toReturn['masters'] = masters;
		toReturn['user_management'] = user_management;
		toReturn['client_management'] = client_management;
		return res.status(200).json({'status': 'OK', 'data': toReturn});
	}
});

/*let constructFilters = function (query, allowedFilter) {
	let fFilter = {};
	let dateKey = query.dateKey || "created_at";
	for (let i in query) {
		if (isAllowedFilter(i, allowedFilter)) {
			if (i === 'start_date' && query.end_date) {
				let startDate = new Date(query[i]);
				let nextDay = new Date(query.end_date);
				fFilter[dateKey] = {
					"$gte": startDate,
					"$lt": nextDay
				};
				delete query.start_date;
				delete query.end_date;
			} else if (i === 'start_date') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				let nextDay = new Date();
				fFilter[dateKey] = {
					"$gte": startDate,
					"$lt": nextDay
				};
			} else if (i === 'end_date' && !query.start_date) {
				let endDate = new Date(query[i]);
				fFilter[dateKey] = {
					"$lt": endDate
				};
			} else if (i === 'c_start_date' && query.c_end_date) {
				let startDate = new Date(query[i]);
				let nextDay = new Date(query.c_end_date);
				fFilter["actual_release_date"] = {
					"$gte": startDate,
					"$lt": nextDay
				};
				delete query.c_start_date;
				delete query.c_end_date;
			} else if (i === 'c_start_date') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				let nextDay = new Date();
				fFilter["actual_release_date"] = {
					"$gte": startDate,
					"$lt": nextDay
				};
			} else if (i === 'c_end_date' && !query.c_start_date) {
				let endDate = new Date(query[i]);
				fFilter["actual_release_date"] = {
					"$lt": endDate
				};
			} else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};*/

router.get('/booking-analysis', function (req, res, next) {

	var allowedFilter = ['_id', 'container.number', 'clientId', 'boe_no', 'trip_no', 'status', 'booking_type', 'booking_no', 'bookingId', 'booking_date', 'customer_id', 'transporter', 'start_date', 'end_date', 'status', 'branch_id', 'allocated', 'aggregateBy'];

	var constructFilters = function (query) {
		var fFilter = {};
		for (i in query) {
			if (otherUtil.isAllowedFilter(i, allowedFilter)) {
				if (i === 'start_date') {
					let startDate = new Date(query[i]);
					startDate.setSeconds(0);
					startDate.setHours(0);
					startDate.setMinutes(0);
					fFilter[query.dateKey || 'booking_date'] = fFilter[query.dateKey || 'booking_date'] || {};
					fFilter[query.dateKey || 'booking_date'].$gte = startDate;
				} else if (i === 'end_date') {
					let endDate = new Date(query[i]);
					endDate.setSeconds(59);
					endDate.setHours(23);
					endDate.setMinutes(59);
					fFilter[query.dateKey || 'booking_date'] = fFilter[query.dateKey || 'booking_date'] || {};
					fFilter[query.dateKey || 'booking_date'].$lte = endDate;
				} else if (i === 'aggregateBy') {
					if (query[i] === 'customer') {
						fFilter['customer'] = {$exists: 1};
					}
					if (query[i] === 'route') {
						fFilter['route'] = {$exists: 1};
					}
				} else if (i === 'boe_no') {
					fFilter['boe.number'] = query[i];
				} else if (i === 'materialType') {
					fFilter['materialType.material_type'] = query[i];
				} else if (i === 'trip_no') {
					fFilter['info.trip_no'] = query[i];
				} else if (i === 'allocated') {
					fFilter['info.vehicle_alloted'] = (query[i] === 'true');
				} else if (i === 'status') {
					fFilter['booking_status.status'] = query[i];
				} else if (i === 'container.number') {
					fFilter['container.number'] = {$regex: query[i], $options: '-i'};
				} else if (i === 'branch_id') {
					if (query[i] && query[i].length > 0) {
						fFilter['branch_id'] = {$in: query[i]};
					}
				} else {
					fFilter[i] = query[i];
				}
			}
		}
		return fFilter;
	};

	let aggr = [];
	req.query.dateKey = req.query.dateKey || 'booking_date';

	aggr.push({$match: constructFilters(req.query)});

	if (req.query.aggregateBy === 'date') {
		if (!req.query.level) {
			return res.status(500).json({status: 'ERROR', message: 'level not found in Date Wise aggregation'});
		}
		aggr.push({
			$sort: {[req.query.dateKey]: 1}
		});
		if (req.query.level === 'year') {
			aggr.push(
				{
					$project: {
						y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$group: {
						_id: {year: '$y'},
						count: {$sum: 1}
					}
				}
			);
		}
		if (req.query.level === 'month') {
			aggr.push(
				{
					$project: {
						m: {$month: `$${req.query.dateKey}`}, y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$group: {
						_id: {month: '$m', year: '$y'},
						count: {$sum: 1}
					}
				}
			);
		}
		if (req.query.level === 'day') {
			aggr.push(
				{
					$project: {
						d: {$dayOfMonth: `$${req.query.dateKey}`},
						m: {$month: `$${req.query.dateKey}`},
						y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$group: {
						_id: {year: '$y', month: '$m', day: '$d'}, count: {$sum: 1}
					}
				}
			);
		}
	}

	if (req.query.aggregateBy === 'route') {
		aggr.push(
			{
				$lookup: {
					from: 'transportroutes',
					localField: 'route',
					foreignField: '_id',
					as: 'route_doc'
				}
			},
			{
				$group: {
					_id: '$route_doc.name',
					count: {$sum: 1}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'customer') {
		aggr.push(
			{
				$lookup: {
					from: 'customers',
					localField: 'customer',
					foreignField: '_id',
					as: 'customer_doc'
				}
			},
			{
				$group: {
					_id: '$customer_doc.name',
					count: {$sum: 1}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'contract') {
		aggr.push(
			{
				$lookup: {
					from: 'contracts',
					localField: 'contract_id',
					foreignField: '_id',
					as: 'contracts_doc'
				}
			},
			{
				$unwind: {
					path: '$contracts_doc'
				}
			},
			{
				$group: {
					_id: '$contracts_doc.name',
					count: {$sum: 1}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'booking_type') {
		aggr.push(
			{
				$group: {
					_id: '$booking_type',
					count: {$sum: 1}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'payment_basis') {
		aggr.push(
			{
				$group: {
					_id: '$payment_basis',
					count: {$sum: 1}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'branch') {
		aggr.push(
			{
				$lookup: {
					from: 'branches',
					localField: 'branch_id',
					foreignField: '_id',
					as: 'branch_doc'
				}
			},
			{
				$unwind: {
					path: '$branch_doc'
				}
			},
			{
				$group: {
					_id: '$branch_doc.name',
					count: {$sum: 1}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'billing_party') {
		aggr.push(
			{
				$lookup: {
					from: 'customers',
					localField: 'billing_party',
					foreignField: '_id',
					as: 'billing_party_doc'
				}
			},
			{
				$unwind: {
					path: '$billing_party_doc'
				}
			},
			{
				$group: {
					_id: '$billing_party_doc.name',
					count: {$sum: 1}
				}
			}
		);
	}

	Bookings.aggregate(aggr)
	.then((docs) => {
		res.status(200).json(docs);
	})
	.catch((err) => {
		res.status(500).json(err);
	});
});

router.get('/trip-analysis', function (req, res, next) {

	var allowedFilter = ['clientId', 'isMarketVehicle', 'ack_stage', 'allocation_date', 'trip_start_date', 'ack_receiving_date', 'trip_end_date', 'trip_cancel_date', 'container_no', 'gr_done', 'trip_stage', 'gr_stage', 'diesel_stage', 'status', 'type', 'vehicle_no', 'trip_no', 'booking_no', 'boe_no', 'customer_id', 'customer_name', 'start_date', 'end_date', 'route_id', 'trip_end', 'gr_ack_exp_date', 'trip_status', 'status_value'];

	var constructFilters = function (query) {
		var fFilter = {deleted: false};
		for (i in query) {
			if (otherUtil.isAllowedFilter(i, allowedFilter)) {
				if (i === 'start_date') {
					let startDate = new Date(query[i]);
					startDate.setSeconds(0);
					startDate.setHours(0);
					startDate.setMinutes(0);
					fFilter[query.dateKey] = fFilter[query.dateKey] || {};
					fFilter[query.dateKey].$gte = startDate;
				} else if (i === 'end_date') {
					let endDate = new Date(query[i]);
					endDate.setSeconds(59);
					endDate.setHours(23);
					endDate.setMinutes(59);
					fFilter[query.dateKey] = fFilter[query.dateKey] || {};
					fFilter[query.dateKey].$lte = endDate;
				} else if (i == 'gr_stage') {
					fFilter['gr.gr_stage'] = query[i].toString() == 'true' ? true : false;
				} else if (i == 'ack_stage') {
					fFilter['gr.ack_stage'] = query[i].toString() == 'true' ? true : false;
				} else if (i == 'booking_no') {
					fFilter['gr.booking_info.booking_no'] = query[i];
				} else if (i == 'container_no') {
					fFilter['gr.booking_info.container_no'] = query[i];
				} else if (i == 'customer_name') {
					fFilter['gr.booking_info.customer_name'] = query[i];
				} else if (i == 'customer_id') {
					fFilter['gr.customer_id'] = query[i];
				} else if (i == 'boe_no') {
					fFilter['gr.booking_info.boe_no'] = query[i];
				} else if (i == 'materialType') {
					fFilter['materialType.material_type'] = query[i];
				} else if (i == 'driver') {
					fFilter['driver'] = mongoose.Types.ObjectId(query[i]);
				} else if (i == 'gr_done') {
					fFilter['gr.gr_no'] = query[i];
				} else if (i == 'ack_status') {
					fFilter['gr.ack_status'] = query[i];
				} else if (i == 'ack_stage') {
					fFilter['gr.ack_stage'] = query[i];
				} else if (i == 'gr_ack_exp_date') {
					fFilter['gr.gr_ack_exp_date'] = query[i];
				} else if (i == 'route_id') {
					fFilter['route.route_id'] = mongoose.Types.ObjectId(query[i]);
				} else if (i == 'trip_end') {
					fFilter['trip_end.status'] = ((query[i].toString() == 'true')) ? true : false;
				} else if (i == 'ack_receiving_date') {
					fFilter['gr.receiving_date'] = query[i];
				} else if (i == 'isMarketVehicle') {
					fFilter['trip.isMarketVehicle'] = query[i];
				} else if (i == 'status_value') {
					var status = query[i] == 'Started' ? 'trip_start.status' : query[i] == 'Completed' ? 'trip_end.status' : query[i] == 'Cancelled' ? 'trip_cancel.status' : '';
					fFilter[status] = true;
				} else if (i == 'materialType') {
					fFilter['materialType.material_type'] = query[i];
				} else if (i == 'trip_start_date') {
					fFilter['trip_start.time'] = query[i];
				} else if (i == 'trip_end_date') {
					fFilter['trip_end.time'] = query[i];
				} else if (i == 'trip_cancel_date') {
					fFilter['trip_cancel.time'] = query[i];
				} else {
					fFilter[i] = query[i];
				}
			}
		}
		return fFilter;
	};

	let aggr = [];
	req.query.dateKey = req.query.dateKey || 'allocation_date';

	if (req.query.aggregateBy === 'date') {
		if (!req.query.level) {
			return res.status(500).json({status: 'ERROR', message: 'level not found in Date Wise aggregation'});
		}
		aggr.push(
			{
				$match: constructFilters(req.query)
			},
			{
				$sort: {[req.query.dateKey]: 1}
			}
		);
		if (req.query.level === 'year') {
			aggr.push(
				{
					$project: {
						y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$group: {
						_id: {year: '$y'},
						count: {$sum: 1}
					}
				}
			);
		}
		if (req.query.level === 'month') {
			aggr.push(
				{
					$project: {
						m: {$month: `$${req.query.dateKey}`}, y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$group: {
						_id: {month: '$m', year: '$y'}, count: {$sum: 1}
					}
				}
			);
		}
		if (req.query.level === 'day') {
			aggr.push(
				{
					$project: {
						d: {$dayOfMonth: `$${req.query.dateKey}`},
						m: {$month: `$${req.query.dateKey}`},
						y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$group: {
						_id: {year: '$y', month: '$m', day: '$d'}, count: {$sum: 1}
					}
				}
			);
		}
	}

	if (req.query.aggregateBy === 'vendor') {
		aggr.push(
			{
				$match: {
					clientId: req.user.clientId,
					vendor: {$exists: 1},
					[req.query.dateKey]: {
						$gte: new Date(req.query.start_date),
						$lte: new Date(req.query.end_date)
					}
				}
			},
			{
				$lookup: {
					from: 'vendortransports',
					localField: 'vendor',
					foreignField: '_id',
					as: 'vendor_doc'
				}
			},
			{
				$group: {
					_id: '$vendor_doc.name',
					count: {$sum: 1}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'driver') {
		aggr.push(
			{
				$match: {
					clientId: req.user.clientId,
					driver: {$exists: 1},
					[req.query.dateKey]: {
						$gte: new Date(req.query.start_date),
						$lte: new Date(req.query.end_date)
					}
				}
			},
			{
				$lookup: {
					from: 'drivers',
					localField: 'driver',
					foreignField: '_id',
					as: 'driver_doc'
				}
			},
			{
				$group: {
					_id: '$driver_doc.name',
					count: {$sum: 1}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'vehicle_type') {
		aggr.push(
			{
				$match: {
					clientId: req.user.clientId,
					vehicle: {$exists: 1},
					[req.query.dateKey]: {
						$gte: new Date(req.query.start_date),
						$lte: new Date(req.query.end_date)
					}
				}
			},
			{
				$lookup: {
					from: 'registeredvehicles',
					localField: 'vehicle',
					foreignField: '_id',
					as: 'vehicle_doc'
				}
			},
			{
				$group: {
					_id: '$vehicle_doc.veh_type_name',
					count: {$sum: 1}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'route') {
		aggr.push(
			{
				$match: {
					clientId: req.user.clientId,
					route_name: {$exists: 1},
					[req.query.dateKey]: {
						$gte: new Date(req.query.start_date),
						$lte: new Date(req.query.end_date)
					}
				}
			},
			{
				$group: {
					_id: '$route_name',
					count: {$sum: 1}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'status') {
		aggr.push(
			{
				$match: {
					clientId: req.user.clientId,
					status: {$exists: 1},
					[req.query.dateKey]: {
						$gte: new Date(req.query.start_date),
						$lte: new Date(req.query.end_date)
					}
				}
			},
			{
				$group: {
					_id: '$status',
					count: {$sum: 1}
				}
			}
		);
	}


	Trip.aggregate(aggr)
	.then((docs) => {
		res.status(200).json(docs);
	})
	.catch((err) => {
		res.status(500).json(err);
	});
});

// Revenue Analysis
router.get('/bill-analysis', function (req, res, next) {

	var allowedFilter = ['clientId', 'cGST_percent', 'sGST_percent', 'iGST_percent', 'boe_no', 'trip_no', 'status', 'billingParty', 'booking_type', 'booking_no', 'bookingId', 'booking_date', 'customer_id', 'transporter', 'start_date', 'end_date', 'status', 'branch', 'allocated', 'approve.status', 'cancelled', 'billNo', 'aggregateBy'];

	var constructFilters = function (query) {
		var fFilter = {'approve.status': {$eq: true}};
		for (i in query) {
			if (otherUtil.isAllowedFilter(i, allowedFilter)) {
				if (i === 'start_date') {
					let startDate = new Date(query[i]);
					startDate.setSeconds(0);
					startDate.setHours(0);
					startDate.setMinutes(0);
					fFilter[query.dateKey] = fFilter[query.dateKey] || {};
					fFilter[query.dateKey].$gte = startDate;
				} else if (i === 'end_date') {
					let endDate = new Date(query[i]);
					endDate.setSeconds(59);
					endDate.setHours(23);
					endDate.setMinutes(59);
					fFilter[query.dateKey] = fFilter[query.dateKey] || {};
					fFilter[query.dateKey].$lte = endDate;
				} else if (i === 'aggregateBy') {
					if (query[i] === 'billing_party') {
						fFilter['billingParty'] = {$exists: 1};
					}
					if (query[i] === 'vendor' || query[i] === 'trip_manager' || query[i] === 'driver') {
						fFilter['items'] = {$exists: 1};
					}
				} else {
					fFilter[i] = query[i];
				}
			}
		}
		return fFilter;
	};

	let aggr = [];
	req.query.dateKey = req.query.dateKey || 'billDate';

	aggr.push({$match: constructFilters(req.query)});

	if (req.query.aggregateBy === 'date') {
		if (!req.query.level) {
			return res.status(500).json({status: 'ERROR', message: 'level not found in Date Wise aggregation'});
		}
		if(req.query.billCancelled === 'true') {
			aggr.push({ $match: { cancelled: true } });
		}
		if(req.query.billCancelled === 'false') {
			aggr.push({ $match: { cancelled: false } });
		}
		aggr.push({ $sort: {[req.query.dateKey]: 1} });
		if (req.query.level === 'year') {
			aggr.push(
				{
					$addFields: {
						y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$group: {
						_id: {year: '$y'},
						count: {$sum: '$totalAmount'}
					}
				}
			);
		}
		if (req.query.level === 'month') {
			aggr.push(
				{
					$addFields: {
						m: {$month: `$${req.query.dateKey}`}, y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$group: {
						_id: {month: '$m', year: '$y'}, count: {$sum: '$totalAmount'}
					}
				}
			);
		}
		if (req.query.level === 'day') {
			aggr.push(
				{
					$addFields: {
						d: {$dayOfMonth: `$${req.query.dateKey}`},
						m: {$month: `$${req.query.dateKey}`},
						y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$group: {
						_id: {year: '$y', month: '$m', day: '$d'}, count: {$sum: '$totalAmount'}
					}
				}
			);
		}
	}

	if (req.query.aggregateBy === 'billing_party') {
		aggr.push(
			{
				$lookup: {
					from: 'customers',
					localField: 'billingParty',
					foreignField: '_id',
					as: 'billing_party_doc'
				}
			},
      {
        $unwind: '$billing_party_doc'
      },
			{
				$group: {
					_id: '$billing_party_doc.name',
					count: {$sum: '$totalAmount'}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'vendor') {
		aggr.push(
			{
				$unwind: {
					path: '$items'
				}
			},
			{
				$lookup: {
					from: 'tripgrs',
					localField: 'items.gr',
					foreignField: '_id',
					as: 'trip_gr_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_gr_doc'
				}
			},
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip_gr_doc.trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_doc'
				}
			},
			{
				$lookup: {
					from: 'vendortransports',
					localField: 'trip_doc.vendor',
					foreignField: '_id',
					as: 'vendor_transports_doc'
				}
			},
			{
				$unwind: {
					path: '$vendor_transports_doc'
				}
			},
			{
				$group: {
					_id: '$vendor_transports_doc.name',
					count: {$sum: '$totalAmount'}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'ownership_type') {
		aggr.push(
			{
				$unwind: {
					path: '$items'
				}
			},
			{
				$lookup: {
					from: 'tripgrs',
					localField: 'items.gr',
					foreignField: '_id',
					as: 'trip_gr_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_gr_doc'
				}
			},
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip_gr_doc.trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_doc'
				}
			},
			{
				$lookup: {
					from: 'registeredvehicles',
					localField: 'trip_doc.vehicle',
					foreignField: '_id',
					as: 'registered_vehicles_doc'
				}
			},
			{
				$unwind: {
					path: '$registered_vehicles_doc'
				}
			},
			{
				$group: {
					_id: '$registered_vehicles_doc.ownershipType',
					count: {$sum: '$totalAmount'}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'trip_manager') {
		aggr.push(
			{
				$unwind: {
					path: '$items'
				}
			},
			{
				$lookup: {
					from: 'tripgrs',
					localField: 'items.gr',
					foreignField: '_id',
					as: 'trip_gr_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_gr_doc'
				}
			},
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip_gr_doc.trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_doc'
				}
			},
			{
				$lookup: {
					from: 'users',
					localField: 'trip_doc.trip_manager',
					foreignField: '_id',
					as: 'trip_manager_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_manager_doc'
				}
			},
			{
				$group: {
					_id: '$trip_manager_doc.full_name',
					count: {$sum: '$totalAmount'}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'driver') {
		aggr.push(
			{
				$unwind: {
					path: '$items'
				}
			},
			{
				$lookup: {
					from: 'tripgrs',
					localField: 'items.gr',
					foreignField: '_id',
					as: 'trip_gr_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_gr_doc'
				}
			},
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip_gr_doc.trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_doc'
				}
			},
			{
				$lookup: {
					from: 'drivers',
					localField: 'trip_doc.driver',
					foreignField: '_id',
					as: 'driver_doc'
				}
			},
			{
				$unwind: {
					path: '$driver_doc'
				}
			},
			{
				$group: {
					_id: '$driver_doc.name',
					count: {$sum: '$totalAmount'}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'route') {
		aggr.push(
			{
				$unwind: {
					path: '$items'
				}
			},
			{
				$lookup: {
					from: 'tripgrs',
					localField: 'items.gr',
					foreignField: '_id',
					as: 'trip_gr_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_gr_doc'
				}
			},
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip_gr_doc.trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_doc'
				}
			},
			{
				$group: {
					_id: '$trip_doc.route_name',
					count: {$sum: '$totalAmount'}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'vehicle') {
		aggr.push(
			{
				$unwind: {
					path: '$items'
				}
			},
			{
				$lookup: {
					from: 'tripgrs',
					localField: 'items.gr',
					foreignField: '_id',
					as: 'trip_gr_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_gr_doc'
				}
			},
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip_gr_doc.trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_doc'
				}
			},
			{
				$group: {
					_id: '$trip_doc.vehicle_no',
					count: {$sum: '$totalAmount'}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'vehicle_type') {
		aggr.push(
			{
				$unwind: {
					path: '$items'
				}
			},
			{
				$lookup: {
					from: 'tripgrs',
					localField: 'items.gr',
					foreignField: '_id',
					as: 'trip_gr_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_gr_doc'
				}
			},
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip_gr_doc.trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_doc'
				}
			},
			{
				$lookup: {
					from: 'registeredvehicles',
					localField: 'trip_doc.vehicle',
					foreignField: '_id',
					as: 'registered_vehicles_doc'
				}
			},
			{
				$unwind: {
					path: '$registered_vehicles_doc'
				}
			},
			{
				$group: {
					_id: {
						veh_type: '$registered_vehicles_doc.veh_type_name',
						veh_group: '$registered_vehicles_doc.veh_group_name'
					},
					count: {$sum: '$totalAmount'}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'receivables') {
		aggr.push(
			{
				$facet: {
					'totalBilledAmount': [
						{
							$group: {
								_id: {$literal: 'Billed Amount'},
								count: {$sum: '$totalAmount'}
							}
						}
					],
					'amountReceived': [
						{
							$unwind: '$items'
						},
						{
							$unwind: '$items.settlement'
						},
						{
							$addFields: {
								'_settled': {
									$add: ['$items.settlement.amountReceived', '$items.settlement.otherAmountTotal']
								}
							}
						},
						{
							$group: {
								_id: {$literal: 'Amount Received'},
								count: {$sum: '$_settled'},
							}
						}
					]
				}
			},
			{
				$project: {
					'data': {
						$concatArrays: ['$amountReceived', '$totalBilledAmount']
					}
				}
			}
		);
	}

	Bill.aggregate(aggr)
	.then((docs) => {
		res.status(200).json(docs);
	})
	.catch((err) => {
		res.status(500).json(err);
	});
});

router.get('/profit-analysis', function (req, res, next) {

	var allowedFilter = ['clientId', 'cGST_percent', 'sGST_percent', 'iGST_percent', 'boe_no', 'trip_no', 'status', 'billingParty', 'booking_type', 'booking_no', 'bookingId', 'booking_date', 'customer_id', 'transporter', 'start_date', 'end_date', 'status', 'branch', 'allocated', 'approve.status', 'cancelled', 'billNo'];

	var constructFilters = function (query) {
		var fFilter = {'approve.status': {$eq: true}};
		for (i in query) {
			if (otherUtil.isAllowedFilter(i, allowedFilter)) {
				if (i === 'start_date') {
					let startDate = new Date(query[i]);
					startDate.setSeconds(0);
					startDate.setHours(0);
					startDate.setMinutes(0);
					fFilter[query.dateKey] = fFilter[query.dateKey] || {};
					fFilter[query.dateKey].$gte = startDate;
				} else if (i === 'end_date') {
					let endDate = new Date(query[i]);
					endDate.setSeconds(59);
					endDate.setHours(23);
					endDate.setMinutes(59);
					fFilter[query.dateKey] = fFilter[query.dateKey] || {};
					fFilter[query.dateKey].$lte = endDate;
				} else {
					fFilter[i] = query[i];
				}
			}
		}
		return fFilter;
	};

	let aggr = [];
	req.query.dateKey = req.query.dateKey || 'billDate';

	aggr.push({$match: constructFilters(req.query)});

	if (req.query.aggregateBy === 'date') {
		if (!req.query.level) {
			return res.status(500).json({status: 'ERROR', message: 'level not found in Date Wise aggregation'});
		}
		aggr.push(
			{
				$sort: {[req.query.dateKey]: 1}
			}
		);
		if (req.query.level === 'year') {
			aggr.push(
				{
					$project: {
						items: 1,
						totalAmount: 1,
						y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$unwind: {
						path: '$items'
					}
				},
				{
					$lookup: {
						from: 'tripgrs',
						localField: 'items.gr',
						foreignField: '_id',
						as: 'trip_gr_doc'
					}
				},
				{
					$unwind: {
						path: '$trip_gr_doc'
					}
				},
				{
					$lookup: {
						from: 'tripsexpenses',
						localField: 'trip_gr_doc.trip',
						foreignField: 'trip',
						as: 'expenses'
					}
				},
				{
					$unwind: {
						path: '$expenses'
					}
				},
				{
					$group: {
						_id: {year: '$y'},
						billing_amount: {$first: '$totalAmount'},
						total_expenses: {$sum: '$expenses.amount'}
					}
				},
				{
					$project: {
						billing_amount: 1,
						total_expenses: 1,
						profit: {
							$subtract: ['$billing_amount', '$total_expenses']
						}
					}
				}
			);
		}

		if (req.query.level === 'month') {
			aggr.push(
				{
					$project: {
						items: 1,
						totalAmount: 1,
						m: {$month: `$${req.query.dateKey}`},
						y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$unwind: {
						path: '$items'
					}
				},
				{
					$lookup: {
						from: 'tripgrs',
						localField: 'items.gr',
						foreignField: '_id',
						as: 'trip_gr_doc'
					}
				},
				{
					$unwind: {
						path: '$trip_gr_doc'
					}
				},
				{
					$lookup: {
						from: 'tripsexpenses',
						localField: 'trip_gr_doc.trip',
						foreignField: 'trip',
						as: 'expenses'
					}
				},
				{
					$unwind: {
						path: '$expenses'
					}
				},
				{
					$group: {
						_id: {month: '$m', year: '$y'},
						billing_amount: {$first: '$totalAmount'},
						total_expenses: {$sum: '$expenses.amount'}
					}
				},
				{
					$project: {
						billing_amount: 1,
						total_expenses: 1,
						profit: {
							$subtract: ['$billing_amount', '$total_expenses']
						}
					}
				}
			);
		}

		if (req.query.level === 'day') {
			aggr.push(
				{
					$project: {
						items: 1,
						totalAmount: 1,
						d: {$dayOfMonth: `$${req.query.dateKey}`},
						m: {$month: `$${req.query.dateKey}`},
						y: {$year: `$${req.query.dateKey}`}
					}
				},
				{
					$unwind: {
						path: '$items'
					}
				},
				{
					$lookup: {
						from: 'tripgrs',
						localField: 'items.gr',
						foreignField: '_id',
						as: 'trip_gr_doc'
					}
				},
				{
					$unwind: {
						path: '$trip_gr_doc'
					}
				},
				{
					$lookup: {
						from: 'tripsexpenses',
						localField: 'trip_gr_doc.trip',
						foreignField: 'trip',
						as: 'expenses'
					}
				},
				{
					$unwind: {
						path: '$expenses'
					}
				},
				{
					$group: {
						_id: {day: '$d', month: '$m', year: '$y'},
						billing_amount: {$first: '$totalAmount'},
						total_expenses: {$sum: '$expenses.amount'}
					}
				},
				{
					$project: {
						billing_amount: 1,
						total_expenses: 1,
						profit: {
							$subtract: ['$billing_amount', '$total_expenses']
						}
					}
				}
			);

		}

	}

	if (req.query.aggregateBy === 'billing_party') {
		aggr.push(
			{
				$lookup: {
					from: 'customers',
					localField: 'billingParty',
					foreignField: '_id',
					as: 'billing_party_doc'
				}
			},
			{
				$unwind: {
					path: '$billing_party_doc'
				}
			},
			{
				$unwind: {
					path: '$items'
				}
			},
			{
				$lookup: {
					from: 'tripgrs',
					localField: 'items.gr',
					foreignField: '_id',
					as: 'trip_gr_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_gr_doc'
				}
			},
			{
				$lookup: {
					from: 'tripsexpenses',
					localField: 'trip_gr_doc.trip',
					foreignField: 'trip',
					as: 'expenses'
				}
			},
			{
				$unwind: {
					path: '$expenses'
				}
			},
			{
				$group: {
					_id: {billing_party_name: '$billing_party_doc.name'},
					billing_amount: {$first: '$totalAmount'},
					total_expenses: {$sum: '$expenses.amount'}
				}
			},
			{
				$project: {
					billing_amount: 1,
					total_expenses: 1,
					profit: {
						$subtract: ['$billing_amount', '$total_expenses']
					}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'vendor') {
		aggr.push(
			{
				$unwind: {
					path: '$items'
				}
			},
			{
				$lookup: {
					from: 'tripgrs',
					localField: 'items.gr',
					foreignField: '_id',
					as: 'trip_gr_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_gr_doc'
				}
			},
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip_gr_doc.trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_doc'
				}
			},
			{
				$lookup: {
					from: 'vendortransports',
					localField: 'trip_doc.vendor',
					foreignField: '_id',
					as: 'vendor_transports_doc'
				}
			},
			{
				$unwind: {
					path: '$vendor_transports_doc'
				}
			},
			{
				$lookup: {
					from: 'tripsexpenses',
					localField: 'trip_gr_doc.trip',
					foreignField: 'trip',
					as: 'expenses'
				}
			},
			{
				$unwind: {
					path: '$expenses'
				}
			},
			{
				$group: {
					_id: {vendor_transport_name: '$vendor_transports_doc.name'},
					billing_amount: {$first: '$totalAmount'},
					total_expenses: {$sum: '$expenses.amount'}
				}
			},
			{
				$project: {
					billing_amount: 1,
					total_expenses: 1,
					profit: {
						$subtract: ['$billing_amount', '$total_expenses']
					}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'ownership_type') {
		aggr.push(
			{
				$unwind: {
					path: '$items'
				}
			},
			{
				$lookup: {
					from: 'tripgrs',
					localField: 'items.gr',
					foreignField: '_id',
					as: 'trip_gr_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_gr_doc'
				}
			},
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip_gr_doc.trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: {
					path: '$trip_doc'
				}
			},
			{
				$lookup: {
					from: 'registeredvehicles',
					localField: 'trip_doc.vehicle',
					foreignField: '_id',
					as: 'registered_vehicles_doc'
				}
			},
			{
				$unwind: {
					path: '$registered_vehicles_doc'
				}
			},
			{
				$lookup: {
					from: 'tripsexpenses',
					localField: 'trip_gr_doc.trip',
					foreignField: 'trip',
					as: 'expenses'
				}
			},
			{
				$unwind: {
					path: '$expenses'
				}
			},
			{
				$group: {
					_id: {ownership_type: '$registered_vehicles_doc.ownershipType'},
					billing_amount: {$first: '$totalAmount'},
					total_expenses: {$sum: '$expenses.amount'}
				}
			},
			{
				$project: {
					billing_amount: 1,
					total_expenses: 1,
					profit: {
						$subtract: ['$billing_amount', '$total_expenses']
					}
				}
			}
		);
	}

	Bill.aggregate(aggr)
	.then((docs) => {
		res.status(200).json(docs);
	})
	.catch((err) => {
		res.status(500).json(err);
	});
});

router.get('/vehicle-analysis', function (req, res, next) {

	let vehicleSearchFields = {clientId: 1, start_date: 1, end_date: 1, 'segment_type': 1};
	let vehicleDateFilters = ['created_at', 'last_known.datetime'];

	function vehicleFilter(reqQuery) {
		let fFilter = {};
		for (let key in reqQuery) {
			if (reqQuery.hasOwnProperty(key) && (key in vehicleSearchFields)) {
				if (key === 'start_date') {
					if (reqQuery.dateKey && vehicleDateFilters.indexOf(reqQuery.dateKey) !== -1) {
						let startDate = new Date(reqQuery[key]);
						startDate.setSeconds(0);
						startDate.setHours(0);
						startDate.setMinutes(0);
						fFilter[reqQuery.dateKey] = fFilter[reqQuery.dateKey] || {};
						fFilter[reqQuery.dateKey].$gte = startDate;
					}
				} else if (key === 'end_date') {
					if (reqQuery.dateKey && vehicleDateFilters.indexOf(reqQuery.dateKey) !== -1) {
						let endDate = new Date(reqQuery[key]);
						endDate.setSeconds(59);
						endDate.setHours(23);
						endDate.setMinutes(59);
						fFilter[reqQuery.dateKey] = fFilter[reqQuery.dateKey] || {};
						fFilter[reqQuery.dateKey].$lte = endDate;
					}
				} else {
					fFilter[key] = reqQuery[key];
				}
			}
		}
		return fFilter;
	}

	req.query.dateKey = req.query.dateKey || 'created_at';

	let aggr = [];

	aggr.push({
		$match: vehicleFilter(req.query)
	});

  if (req.query.aggregateBy === 'date') {
    if (!req.query.level) {
      return res.status(500).json({status: 'ERROR', message: 'level not found in Date Wise aggregation'});
    }
    aggr.push({$sort: {[req.query.dateKey]: 1}});

    if (req.query.level === 'year') {
      aggr.push(
        {
          $addFields: {
            y: {$year: `$${req.query.dateKey}`}
          }
        },
        {
          $group: {
            _id: {year: '$y'},
            count: {$sum: 1}
          }
        }
      );
    }
    if (req.query.level === 'month') {
      aggr.push(
        {
          $addFields: {
            m: {$month: `$${req.query.dateKey}`}, y: {$year: `$${req.query.dateKey}`}
          }
        },
        {
          $group: {
            _id: {month: '$m', year: '$y'}, count: {$sum: 1}
          }
        }
      );
    }
    if (req.query.level === 'day') {
      aggr.push(
        {
          $addFields: {
            d: {$dayOfMonth: `$${req.query.dateKey}`},
            m: {$month: `$${req.query.dateKey}`},
            y: {$year: `$${req.query.dateKey}`}
          }
        },
        {
          $group: {
            _id: {year: '$y', month: '$m', day: '$d'}, count: {$sum: 1}
          }
        }
      );
    }
	}

	if (req.query.aggregateBy === 'status') {
		aggr.push(
			{
				$match: {
					status: {$exists: 1}
				}
			},
			{
				$group: {
					_id: '$status',
					count: {$sum: 1}
				}
			}
		);
	}

	RegVehicle.aggregate(aggr)
	.then((docs) => {
		res.status(200).json(docs);
	})
	.catch((err) => {
		res.status(500).json(err);
	});

});

router.get('/trip-expense-analysis', function (req, res, next) {

	let tripSearchFields = {clientId: 1, start_date: 1, end_date: 1, trip_no: 1, vendor: 1, driver: 1, vehicle_no: 1};
	let tripDateFilters = ['allocation_date', 'vendorDeal.advance_due_date', 'vendorDeal.topay_due_date', 'vendorDeal.ls_uploading_date', 'askPayment.date'];

	function tripFilter(reqQuery) {
		let fFilter = {};
		for (let key in reqQuery) {
			if (reqQuery.hasOwnProperty(key) && (key in tripSearchFields)) {
				if (key === 'start_date') {
					if (reqQuery.tripDateKey && tripDateFilters.indexOf(reqQuery.tripDateKey) !== -1) {
						let startDate = new Date(reqQuery[key]);
						startDate.setSeconds(0);
						startDate.setHours(0);
						startDate.setMinutes(0);
						fFilter[reqQuery.tripDateKey] = fFilter[reqQuery.tripDateKey] || {};
						fFilter[reqQuery.tripDateKey].$gte = startDate;
					}
				} else if (key === 'end_date') {
					if (reqQuery.tripDateKey && tripDateFilters.indexOf(reqQuery.tripDateKey) !== -1) {
						let endDate = new Date(reqQuery[key]);
						endDate.setSeconds(59);
						endDate.setHours(23);
						endDate.setMinutes(59);
						fFilter[reqQuery.tripDateKey] = fFilter[reqQuery.tripDateKey] || {};
						fFilter[reqQuery.tripDateKey].$lte = endDate;
					}
				}
				else if (key === 'vendor') {
					var vendorIds = reqQuery[key].split(',');
					if (vendorIds.length > 0) fFilter['trip_doc.vendor'] = {$in: otherUtil.arrString2ObjectId(vendorIds)};
				}
				else if (key === 'driver') {
					var driverIds = reqQuery[key].split(',');
					if (driverIds.length > 0) fFilter['trip_doc.driver'] = {$in: otherUtil.arrString2ObjectId(driverIds)};
				}
				else if (key === 'trip_no') {
					fFilter['trip_doc.trip_no'] = parseInt(reqQuery[key]);
				}
				else {
					fFilter[key] = reqQuery[key];
				}
			}
		}
		return fFilter;
	}

	let expenseSearchFields = {
		clientId: 1,
		type: 1,
		start_date: 1,
		end_date: 1,
		person: 1,
		amount: 1,
		remark: 1,
		paidToVendor: 1,
		reference_no: 1
	};
	let expenseDateFilters = ['date', 'created_at'];

	function expenseFilter(reqQuery) {
		let fFilter = {};
		for (let key in reqQuery) {
			if (reqQuery.hasOwnProperty(key) && (key in expenseSearchFields)) {
				if (key === 'start_date') {
					if (reqQuery.expenseDateKey && expenseDateFilters.indexOf(reqQuery.expenseDateKey) !== -1) {
						let startDate = new Date(reqQuery[key]);
						startDate.setSeconds(0);
						startDate.setHours(0);
						startDate.setMinutes(0);
						fFilter[reqQuery.expenseDateKey] = fFilter[reqQuery.expenseDateKey] || {};
						fFilter[reqQuery.expenseDateKey].$gte = startDate;
					}
				} else if (key === 'end_date') {
					if (reqQuery.expenseDateKey && expenseDateFilters.indexOf(reqQuery.expenseDateKey) !== -1) {
						let endDate = new Date(reqQuery[key]);
						endDate.setSeconds(59);
						endDate.setHours(23);
						endDate.setMinutes(59);
						fFilter[reqQuery.expenseDateKey] = fFilter[reqQuery.expenseDateKey] || {};
						fFilter[reqQuery.expenseDateKey].$lte = endDate;
					}
				} else {
					fFilter[key] = reqQuery[key];
				}
			}
		}
		return fFilter;
	}

	req.query.expenseDateKey = req.query.expenseDateKey || 'date';
	req.query.tripDateKey = req.query.tripDateKey || 'allocation_date';

	let aggr = [];

	aggr.push({
		$match: expenseFilter(req.query)
	});

	if (req.query.aggregateBy === 'vendor') {
		aggr.push(
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: '$trip_doc'
			},
			{
				$match: tripFilter(req.query)
			},
			{
				$lookup: {
					from: 'vendortransports',
					localField: 'trip_doc.vendor',
					foreignField: '_id',
					as: 'vendor_doc'
				}
			},
			{
				$unwind: '$vendor_doc'
			},
			{
				$group: {
					_id: '$vendor_doc.name',
					count: {$sum: '$amount'},
					vACPay: {
						$sum: {
							$cond: [{'$eq': ['$tripExpenses.type', 'Vendor A/C Pay']}, '$tripExpenses.amount', 0]
						}
					},
					vCash: {
						$sum: {
							$cond: [{'$eq': ['$tripExpenses.type', 'Vendor Cash']}, '$tripExpenses.amount', 0]
						}
					},
					vCheque: {'$sum': {'$cond': [{'$eq': ['$tripExpenses.type', 'Vendor Cheque']}, '$tripExpenses.amount', 0]}},
					vPenalty: {'$sum': {'$cond': [{'$eq': ['$tripExpenses.type', 'Vendor Penalty']}, '$tripExpenses.amount', 0]}},
					vDamage: {'$sum': {'$cond': [{'$eq': ['$tripExpenses.type', 'Vendor Damage']}, '$tripExpenses.amount', 0]}},
					vDetention: {'$sum': {'$cond': [{'$eq': ['$tripExpenses.type', 'Vendor Detention']}, '$tripExpenses.amount', 0]}},
					vChalan: {'$sum': {'$cond': [{'$eq': ['$tripExpenses.type', 'Vendor Chalan']}, '$tripExpenses.amount', 0]}},
					vOverload: {'$sum': {'$cond': [{'$eq': ['$tripExpenses.type', 'Vendor Overload Charges']}, '$tripExpenses.amount', 0]}},
					vNet: {'$sum': {'$cond': ['$tripExpenses.paidToVendor', '$tripExpenses.amount', 0]}}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'type') {
		aggr.push(
			{
				$group: {
					_id: '$type',
					count: {$sum: '$amount'}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'date') {
		if (!req.query.level) {
			return res.status(500).json({status: 'ERROR', message: 'level not found in Date Wise aggregation'});
		}
		if (req.query.level === 'year') {
			aggr.push(
				{
					$addFields: {
						y: {$year: `$${req.query.expenseDateKey}`}
					}
				},
				{
					$group: {
						_id: {year: '$y'},
						count: {$sum: '$amount'}
					}
				}
			);
		}
		if (req.query.level === 'month') {
			aggr.push(
				{
					$addFields: {
						m: {$month: `$${req.query.expenseDateKey}`},
						y: {$year: `$${req.query.expenseDateKey}`}
					}
				},
				{
					$group: {
						_id: {month: '$m', year: '$y'},
						count: {$sum: '$amount'}
					}
				}
			);
		}
		if (req.query.level === 'day') {
			aggr.push(
				{
					$addFields: {
						d: {$dayOfMonth: `$${req.query.expenseDateKey}`},
						m: {$month: `$${req.query.expenseDateKey}`},
						y: {$year: `$${req.query.expenseDateKey}`}
					}
				},
				{
					$group: {
						_id: {year: '$y', month: '$m', day: '$d'},
						count: {$sum: '$amount'}
					}
				}
			);
		}
	}

	if (req.query.aggregateBy === 'route') {
		aggr.push(
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: '$trip_doc'
			},
			{
				$group: {
					_id: '$trip_doc.route_name',
					count: {$sum: '$amount'}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'vehicle_no') {
		aggr.push(
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: '$trip_doc'
			},
			{
				$group: {
					_id: '$trip_doc.vehicle_no',
					count: {$sum: '$amount'}
				}
			}
		);
	}

	if (req.query.aggregateBy === 'vehicle_type') {
		aggr.push(
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip',
					foreignField: '_id',
					as: 'trip_doc'
				}
			},
			{
				$unwind: '$trip_doc'
			},
			{
				$lookup: {
					from: 'registeredvehicles',
					localField: 'trip_doc.vehicle',
					foreignField: '_id',
					as: 'trip_vehicle_doc'
				}
			},
			{
				$unwind: '$trip_vehicle_doc'
			},
			{
				$group: {
					_id: '$trip_vehicle_doc.veh_type_name',
					count: {$sum: '$amount'}
				}
			}
		);
	}

	TripExp.aggregate(aggr)
	.then((docs) => {
		res.status(200).json(docs);
	})
	.catch((err) => {
		res.status(500).json(err);
	});

});

router.get('/gr-analysis', function (req, res, next) {

	let grSearchFields = {clientId: 1, start_date: 1, end_date: 1};
	let grDateFilters = ['invoiceDate', 'grDate', 'expected_arrival'];

	function grFilter(reqQuery) {
		let fFilter = {};
		for (let key in reqQuery) {
			if (reqQuery.hasOwnProperty(key) && (key in grSearchFields)) {
				if (key === 'start_date') {
					if (reqQuery.dateKey && grDateFilters.indexOf(reqQuery.dateKey) !== -1) {
						let startDate = new Date(reqQuery[key]);
						startDate.setSeconds(0);
						startDate.setHours(0);
						startDate.setMinutes(0);
						fFilter[reqQuery.dateKey] = fFilter[reqQuery.dateKey] || {};
						fFilter[reqQuery.dateKey].$gte = startDate;
					}
				} else if (key === 'end_date') {
					if (reqQuery.dateKey && grDateFilters.indexOf(reqQuery.dateKey) !== -1) {
						let endDate = new Date(reqQuery[key]);
						endDate.setSeconds(59);
						endDate.setHours(23);
						endDate.setMinutes(59);
						fFilter[reqQuery.dateKey] = fFilter[reqQuery.dateKey] || {};
						fFilter[reqQuery.dateKey].$lte = endDate;
					}
				} else {
					fFilter[key] = reqQuery[key];
				}
			}
		}
		return fFilter;
	}

	req.query.dateKey = req.query.dateKey || 'grDate';

	let aggr = [];

	aggr.push({
		$match: grFilter(req.query)
	});

	if (req.query.aggregateBy === 'date') {
    if (!req.query.level) {
      return res.status(500).json({status: 'ERROR', message: 'level not found in Date Wise aggregation'});
    }
    aggr.push(
      {
        $sort: {[req.query.dateKey]: 1}
      }
    );
    if (req.query.level === 'year') {
      aggr.push(
        {
          $addFields: {
            y: {$year: `$${req.query.dateKey}`}
          }
        },
        {
          $group: {
            _id: {year: '$y'},
            count: {$sum: 1}
          }
        }
      );
    }
    if (req.query.level === 'month') {
      aggr.push(
        {
          $addFields: {
            m: {$month: `$${req.query.dateKey}`}, y: {$year: `$${req.query.dateKey}`}
          }
        },
        {
          $group: {
            _id: {month: '$m', year: '$y'}, count: {$sum: 1}
          }
        }
      );
    }
    if (req.query.level === 'day') {
      aggr.push(
        {
          $addFields: {
            d: {$dayOfMonth: `$${req.query.dateKey}`},
            m: {$month: `$${req.query.dateKey}`},
            y: {$year: `$${req.query.dateKey}`}
          }
        },
        {
          $group: {
            _id: {year: '$y', month: '$m', day: '$d'}, count: {$sum: 1}
          }
        }
      );
    }
	}

	if (req.query.aggregateBy === 'billed_unbilled') {
		aggr.push(
			{
				$facet: {
					'billed': [
						{
							$match: {
								$or: [
									{
										'bill': {$exists: 1}
									},
									{
										'provisionalBill': {$exists: 1}
									}
								]
							}
						},
						{
							$group: {
								_id: 'Billed',
								count: {$sum: 1}
							}
						}
					],
					'unbilled': [
						{
							$match: {
								$and: [
									{
										'bill': {$exists: 0}
									},
									{
										'provisionalBill': {$exists: 0}
									}
								]
							}
						},
						{
							$group: {
								_id: 'Unbilled',
								count: {$sum: 1}
							}
						}
					]
				}
			},
			{
				$project: {
					'data': {
						$concatArrays: ['$billed', '$unbilled']
					}
				}
			}
		);
	}

  if (req.query.aggregateBy === 'billed_unbilled_status') {
    aggr.push(
      {
        $facet: {
          'billed': [
            {
              $match: {
                $or: [
                  {
                    'bill': {$exists: 1}
                  },
                  {
                    'provisionalBill': {$exists: 1}
                  }
                ]
              }
            },
            {
              $group: {
                _id: '$status',
                count: {$sum: 1}
              }
            }
          ],
          'unbilled': [
            {
              $match: {
                $and: [
                  {
                    'bill': {$exists: 0}
                  },
                  {
                    'provisionalBill': {$exists: 0}
                  }
                ]
              }
            },
            {
              $group: {
                _id: '$status',
                count: {$sum: 1}
              }
            }
          ]
        }
      },
      {
        $project: {
          'data': {
            $concatArrays: ['$billed', '$unbilled']
          }
        }
      }
    );
  }

  if (req.query.aggregateBy === 'billed_unbilled_year') {
    aggr.push(
      {
        $facet: {
          'billed': [
            {
              $addFields: {
                y: {$year: `$${req.query.dateKey}`}
              }
            },
            {
              $match: {
                $or: [
                  {
                    'bill': {$exists: 1}
                  },
                  {
                    'provisionalBill': {$exists: 1}
                  }
                ]
              }
            },
            {
              $group: {
                _id: '$y',
                count: {$sum: 1}
              }
            }
          ],
          'unbilled': [
            {
              $addFields: {
                y: {$year: `$${req.query.dateKey}`}
              }
            },
            {
              $match: {
                $and: [
                  {
                    'bill': {$exists: 0}
                  },
                  {
                    'provisionalBill': {$exists: 0}
                  }
                ]
              }
            },
            {
              $group: {
                _id: '$y',
                count: {$sum: 1}
              }
            }
          ]
        }
      },
      {
        $project: {
          'data': {
            $concatArrays: ['$billed', '$unbilled']
          }
        }
      }
    );
  }

  if (req.query.aggregateBy === 'billed_unbilled_month') {
    aggr.push(
      {
        $facet: {
          'billed': [
            {
              $addFields: {
                y: {$year: `$${req.query.dateKey}`},
								m: {$month: `$${req.query.dateKey}`}
              }
            },
            {
              $match: {
                $or: [
                  {
                    'bill': {$exists: 1}
                  },
                  {
                    'provisionalBill': {$exists: 1}
                  }
                ]
              }
            },
            {
              $group: {
                _id: {month: '$m', year: '$y'},
                count: {$sum: 1}
              }
            }
          ],
          'unbilled': [
            {
              $addFields: {
                y: {$year: `$${req.query.dateKey}`},
                m: {$month: `$${req.query.dateKey}`}
              }
            },
            {
              $match: {
                $and: [
                  {
                    'bill': {$exists: 0}
                  },
                  {
                    'provisionalBill': {$exists: 0}
                  }
                ]
              }
            },
            {
              $group: {
                _id: {month: '$m', year: '$y'},
                count: {$sum: 1}
              }
            }
          ]
        }
      },
      {
        $project: {
          'data': {
            $concatArrays: ['$billed', '$unbilled']
          }
        }
      }
    );
  }

  if (req.query.aggregateBy === 'billed_unbilled_day') {
    aggr.push(
      {
        $facet: {
          'billed': [
            {
              $addFields: {
                y: {$year: `$${req.query.dateKey}`},
                m: {$month: `$${req.query.dateKey}`},
                d: {$dayOfMonth: `$${req.query.dateKey}`}
              }
            },
            {
              $match: {
                $or: [
                  {
                    'bill': {$exists: 1}
                  },
                  {
                    'provisionalBill': {$exists: 1}
                  }
                ]
              }
            },
            {
              $group: {
                _id: {day: '$d', month: '$m', year: '$y'},
                count: {$sum: 1}
              }
            }
          ],
          'unbilled': [
            {
              $addFields: {
                y: {$year: `$${req.query.dateKey}`},
                m: {$month: `$${req.query.dateKey}`},
                d: {$dayOfMonth: `$${req.query.dateKey}`},
              }
            },
            {
              $match: {
                $and: [
                  {
                    'bill': {$exists: 0}
                  },
                  {
                    'provisionalBill': {$exists: 0}
                  }
                ]
              }
            },
            {
              $group: {
                _id: {day: '$d', month: '$m', year: '$y'},
                count: {$sum: 1}
              }
            }
          ]
        }
      },
      {
        $project: {
          'data': {
            $concatArrays: ['$billed', '$unbilled']
          }
        }
      }
    );
  }

  if (req.query.aggregateBy === 'pod') {
		aggr.push(
			{
				$match: {
					'acknowledge.status': {$exists: 1}
				}
			},
			{
				$group: {
					_id: '$acknowledge.status',
					count: {$sum: 1}
				}
			},
			{
				$project: {
					_id: 0,
					_id: {
						$cond: {
							if: {$eq: ['$_id', true]},
							then: 'Acknowledged GR',
							else: 'Unacknowledged GR'
						}
					},
					count: 1
				}
			}
		);
	}

	if (req.query.aggregateBy === 'customer') {
	  aggr.push(
      {
        $lookup: {
          from: 'bookingv2',
          localField: 'booking',
          foreignField: '_id',
          as: 'booking_doc'
        }
      },
      {
        $unwind: '$booking_doc'
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'booking_doc.customer',
          foreignField: '_id',
          as: 'booking_doc.customer_doc'
        }
      },
      {
        $unwind: '$booking_doc.customer_doc'
      },
      {
        $group: {
          _id: '$booking_doc.customer_doc.name',
          count: {$sum: 1}
        }
      }
    );
  }

  if (req.query.aggregateBy === 'vendor') {
  	aggr.push(
      {
        $lookup: {
          from: 'tripv2',
          localField: 'trip',
          foreignField: '_id',
          as: 'trip_doc'
        }
      },
      {
        $unwind: '$trip_doc'
      },
      {
        $lookup: {
          from: 'vendortransports',
          localField: 'trip_doc.vendor',
          foreignField: '_id',
          as: 'trip_doc.vendor_doc'
        }
      },
      {
        $unwind: '$trip_doc.vendor_doc'
      },
      {
        $group: {
          _id: '$trip_doc.vendor_doc.name',
          count: {$sum: 1}
        }
      }
		);
  }

  if (req.query.aggregateBy === 'status') {
    aggr.push(
      {
        $group: {
          _id: '$status',
          count: {$sum: 1}
        }
      }
    );
  }

	GR.aggregate(aggr)
	.then((docs) => {
		res.status(200).json(docs);
	})
	.catch((err) => {
		res.status(500).json(err);
	});

});

module.exports = router;

/*router.get('/bill-acknowledge-analysis', function (req, res, next) {
	let aggr = [];
	Bill.aggregate(aggr)
		.then((docs) => {
			res.status(200).json(docs);
		})
		.catch((err) => {
			res.status(500).json(err);
		});
});*/

/*
	if(req.query.aggregateBy === 'vendor') {
    aggr.push(
        {
            $match : tripFilter(req.body)
        },
        {
            "$lookup": {
                "from": "tripsexpenses",
                "localField": "_id",
                "foreignField": "trip",
                "as": "tripExpenses"
            }
        },
        {
            "$unwind" : {
                "path":"$tripExpenses",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $match: expenseFilter(req.body)
        },
        {
            "$group":{
                "_id" : "$_id",
                "trip_no":{"$first":'$trip_no'},
                "vehicle_no":{"$first":'$vehicle_no'},
                "no_of_expense" : {"$sum" :1 },
                "netExpense" : {"$sum" : "$tripExpenses.amount"},
                "trip":{"$first":'$$ROOT'},
                "grCharges":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Gr Charges']},"$tripExpenses.amount",0]}},
                "diesel":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Diesel']},"$tripExpenses.amount",0]}},
                "dieselLtr":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Diesel']},"$tripExpenses.diesel_info.litre",0]}},
                "loadCharges":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Loading Charges']},"$tripExpenses.amount",0]}},
                "ulCharges":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Unloading Charges']},"$tripExpenses.amount",0]}},
                "oCharges":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Other Charges']},"$tripExpenses.amount",0]}},
                "chalan":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Chalan']},"$tripExpenses.amount",0]}},
                "driverCash":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Driver Cash']},"$tripExpenses.amount",0]}},
                "tollTax":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Toll Tax']},"$tripExpenses.amount",0]}},
                "vACPay":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor A/C Pay']},"$tripExpenses.amount",0]}},
                "vCash":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Cash']},"$tripExpenses.amount",0]}},
                "vCheque":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Cheque']},"$tripExpenses.amount",0]}},
                "vPenalty":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Penalty']},"$tripExpenses.amount",0]}},
                "vDamage":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Damage']},"$tripExpenses.amount",0]}},
                "vDetention":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Detention']},"$tripExpenses.amount",0]}},
                "vChalan":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Chalan']},"$tripExpenses.amount",0]}},
                "vOverload":{"$sum" : {"$cond":[{"$eq":['$tripExpenses.type','Vendor Overload Charges']},"$tripExpenses.amount",0]}},
                "vNet":{"$sum" : {"$cond":['$tripExpenses.paidToVendor',"$tripExpenses.amount",0]}}
            }
        },
        {
            "$lookup": {
                "from": "tripgrs",
                "localField": "trip.gr",
                "foreignField": "_id",
                "as": "trip.aGR"
            }
        },
        {
            "$lookup": {
                "from": "vendortransports",
                "localField": "trip.vendor",
                "foreignField": "_id",
                "as": "trip.vendorData"
            }
        },
        {
            "$unwind" : {
                "path":"$trip.vendorData",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $match : postAggrFilter(req.body)
        },
        {
            $group: {
                _id: '$trip.vendorData.name',
                count: {$sum: '$netExpense'}
            }
        }
    );
}




	const PAYMENT_STATUS = ["Pending", "Partial Paid", "Paid", "Over Paid"];
	let postAllowedSearchFields = {"customer_id": 1, "gr_no": 1, "from": 1, "to": 1, "paymentStatus": 1};
	let postDateFilters = ["trip.aGR.acknowledge.systemDate"];

	function postAggrFilter(reqQuery) {
		let fFilter = {};
		for (let key in reqQuery) {
			if (reqQuery.hasOwnProperty(key) && (key in postAllowedSearchFields)) {
				if (key === 'from') {
					if (reqQuery.dateType && postDateFilters.indexOf(reqQuery.dateType) !== -1) {
						let startDate = new Date(reqQuery[key]);
						startDate.setSeconds(0);
						startDate.setHours(0);
						startDate.setMinutes(0);
						fFilter[reqQuery.dateType] = fFilter[reqQuery.dateType] || {};
						fFilter[reqQuery.dateType].$gte = startDate;
					}
				} else if (key === 'to') {
					if (reqQuery.dateType && postDateFilters.indexOf(reqQuery.dateType) !== -1) {
						let endDate = new Date(reqQuery[key]);
						endDate.setSeconds(59);
						endDate.setHours(23);
						endDate.setMinutes(59);
						fFilter[reqQuery.dateType] = fFilter[reqQuery.dateType] || {};
						fFilter[reqQuery.dateType].$lte = endDate;
					}
				} else if (key === "customer_id" && reqQuery[key].length > 0) {
					fFilter["trip.aGR.booking.customer_id"] = {"$in": reqQuery[key]}
				} else if (key === "gr_no") {
					fFilter["trip.aGR.grNumber"] = reqQuery[key]
				} else if (key === "paymentStatus" && PAYMENT_STATUS.indexOf(reqQuery[key]) > -1) {
					fFilter[key] = reqQuery[key]
				}

			}
		}
		return fFilter;
	}

*/
