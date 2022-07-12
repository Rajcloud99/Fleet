'use strict';

const _ = require('lodash');
let request = require('request');
const requestPromise = require("request-promise");
const TripAdvances = require('../models/TripAdvances');
let Booking = commonUtil.getModel('bookings');
let Trip = commonUtil.getModel('trip');
let TripCache = commonUtil.getModel('tripCache');
let RouteData = commonUtil.getModel('routeData');
let GR = commonUtil.getModel('tripGr');
const Voucher = commonUtil.getModel('voucher');
let customerModel = commonUtil.getModel('customer');
const AcBal = commonUtil.getModel('accountbalances');
let TripsExpense = commonUtil.getModel('tripExpenses');
let RegisteredVehicleModel = commonUtil.getModel('registeredVehicle');
let transportRoute = commonUtil.getModel('transportRoute');
let TripExpense = promise.promisifyAll(commonUtil.getModel('tripExpenses'));
let RegisteredVehicle = promise.promisifyAll(commonUtil.getService('registeredVehicle'));
let ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
let VoucherService = promise.promisifyAll(commonUtil.getService('accountsVoucher'));
var acccountsService = promise.promisifyAll(commonUtil.getService('accounts'));
const StationeryService = commonUtil.getService('stationery');
let Pagination = promise.promisify(otherUtil.findPagination);
const billStationaryService = commonUtil.getService('billStationary');
let moment = require("moment");
const XML = require('../../utils/createXML.utility');
var FileService = commonUtil.getUtil('file_upload_util');
let VendorTransport = require('../models/vendorTransport');
const serverSidePage = require('../../utils/serverSidePagination');
let VoucherServiceV2 = commonUtil.getService('voucher');
let tableAccessService = commonUtil.getService('tableAccess');
let logsService = commonUtil.getService('logs');
const BillStationary = commonUtil.getModel('billStationary');
const datamgntService = commonUtil.getService('datamanagements');
const csvDownload = require('../../utils/csv-download');
const tripSettlement = commonUtil.getReports('tripSettlementV2.js');
const tripPerfMarketVehicle = commonUtil.getReports('tripPerfMarketVehicle.js');
const tripPerfOwnVehicle = commonUtil.getReports('tripPerfOwnVehicle.js');
const Driver = promise.promisifyAll(commonUtil.getModel('driver'));
const traqoApiService = require('../../schedulers/simTrackingTraqo');
let gpsgaadiAdminToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiJER0ZDIn0.Yt9SM10dq7L8FqISaMdiCqJRVtL1xesy6gjnAeNDYAI';

let allowedFiles = ['Other'];
//var GPSDataUtils = require('../utility/gpsData.utility');
let locationService = promise.promisifyAll(commonUtil.getService('location'));
/***********Multer Configuration for upload vehicle docs**************/
let maxFileSize = 2 * 1000 * 1000;//bytes(default)--->==1MB
let path = require('path');
let multer = require('multer');
let storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, path.join(projectHome, "files", "users", req.user.clientId));
	},
	filename: function (req, file, cb) {
		cb(null, file.fieldname + "_" + req.params._id + path.extname(file.originalname));

	}
});

let upload = multer({
	storage: storage,
	limits: {fileSize: maxFileSize},
	fileFilter: function (req, file, cb) {
		if ((file.mimetype == 'image/jpeg') || (file.mimetype == 'image/png') || (file.mimetype == 'image/bmp') || (file.mimetype == 'application/pdf')) {
			cb(null, true);
		} else {
			cb(null, false)
		}
	}
});
//****************************************************************
//************Allowed Docs****************************************
let TripUpload = upload.fields(
	[
		{name: "loading_slip", maxCount: 1}
	]
);
//*****************************************************************


const STATUS = ["Trip not started", "Trip started", "Trip ended", "Trip cancelled"];

const ALLOWED_FILTER = ['_id', 'branch', 'clientId', 'trip_no', 'status', 'route', 'vehicle', 'vehicle_no', 'driver',
	'trip_manager', 'loading_babu', 'vendor', 'allocation_date', 'isCancelled', 'statuses', 'gTrip_id', 'remarks', 'from', 'to', 'start_date', 'end_date',
	'branch_query', 'route_query', 'vehicle_query', 'trip_manager_query', 'vendor_query', 'created_by_query', "tripSettleType", "markSettle.isSettled",
	'last_modified_by_query', 'booking_query', 'gr_query', 'vehicles', 'segment_type', 'status', 'category', 'advSettled.tsNo', 'createdBy',
	'ownershipType', 'advanceBudget.0', 'vendorDeal.acknowledge.status', 'vendorDeal.loading_slip', 'tripStart', 'vendorDeal.broker.id', 'gps_view', 'tripStatus','tMNo',
'source','destination' , 'vendorDeal.broker.id'];

const ALLOWED_GR_FILTER = ['dateType', 'customer_id', 'consignor_id', 'consignee_id', 'grNumber'];

const ALLOWED_REFERENCED_GET = {'vehicle_query': 'vehicle', 'gr_query': 'gr', 'vendor_query': 'vendor'};

async function findTripById(id, projection = {}) {
	try {
		return await Trip.findOne({_id: otherUtil.arrString2ObjectId(id)}, projection).lean();
	} catch (e) {
		throw e;
	}
}

function setStartDate(date) {
	let startDate = (date) ? new Date(date) : new Date(moment().startOf('month'));
	startDate.setHours(0);
	startDate.setSeconds(0);
	startDate.setMinutes(0);
	return startDate;
}

function setEndDate(date) {
	let endDate = (date) ? new Date(date) : new Date();
	endDate.setHours(23);
	endDate.setSeconds(59);
	endDate.setMinutes(59);
	return endDate;
}

async function calculateOCBalance(body) {
	try {
		let summary;
		let date = body.rtDate || new Date();

		if (!body.vehicle)
			throw new Error('vehicle  required.');

		const foundTrips = await Trip.find({
			clientId: body.clientId,
			vehicle: body.vehicle,
			'advSettled.isCompletelySettled': true,
			'markSettle.date': {
				$lte: new Date(date)
			}
		}).populate("payments").sort({'markSettle.date': -1}).lean();

		let oTrip = [], rtNo;
		if (Array.isArray(foundTrips) && foundTrips.length > 0) {
			foundTrips.forEach(obj => {
				rtNo = rtNo || obj.advSettled && obj.advSettled.tsNo;
				if (obj.advSettled && obj.advSettled.tsNo && obj.advSettled.tsNo === rtNo) {
					oTrip[obj.advSettled.tsNo] = oTrip[obj.advSettled.tsNo] || [];
					oTrip[obj.advSettled.tsNo].push(obj);
				}
			});
			Trip.eachTripSummary(oTrip[rtNo]);
			summary = await Trip.tripSummary(oTrip[rtNo]);
		}

		return summary;

	} catch (err) {
		throw err;
	}
}

async function updateOCBalance(body) {
	try {

		if (!body.rtDate)
			throw new Error('Rt Date required.');

		if (!body.vehicle)
			throw new Error('vehicle  required.');

		let date = body.rtDate || new Date();

		const aFoundRT = await Trip.find({
			clientId: body.clientId,
			vehicle: body.vehicle,
			'advSettled.isCompletelySettled': true,
			'advSettled.tsNo': {$ne: body.tsNo},
			'markSettle.date': {
				$gte: new Date(date),
			}
		}).sort({'markSettle.date': 1}).lean();

		if (Array.isArray(aFoundRT) && !aFoundRT.length)
			return true;

		let delta = 0;
		let lastRTBalance = await calculateOCBalance(body);

		if (lastRTBalance)
			delta = Number(aFoundRT[0].advSettled.openingBal - lastRTBalance.openCloseBal.driver.closing) || 0;
		else
			delta = Number(aFoundRT[0].advSettled.openingBal);


		if (delta) {
			for (let i = 0; i < aFoundRT.length; i++) {
				await Trip.update({
						_id: aFoundRT[i]._id
					},
					{
						$inc: {"advSettled.openingBal": -delta}
					});
			}
		}

		return true;

	} catch (err) {
		throw err;
	}
}

async function reSetOCBal(body, balance) {
	try {

		if (Array.isArray(body) && !body.length)
			return true;

		body[0].advSettled.openingBal = body[0].advSettled.openingBal || 0;

		let delta = 0;
		if (balance && body[0].advSettled.openingBal != balance)
			delta = Number(balance - (body[0].advSettled.openingBal || 0)) || 0;

		if (delta) {
			for (var i in body) {
				await Trip.update({
						_id: body[i]._id
					},
					{
						$inc: {"advSettled.openingBal": delta}
					});
			}
		}

		return true;

	} catch (err) {
		throw err;
	}
}

function calculateWorkingDays(date1, date2) {
	let a = moment(date1);
	let b = moment(date2);
	return a.diff(b, 'days') + 1;
}

function constructFilterOfRT(oQuery) {
	let oFilter = {};//{"isCancelled": (oQuery.isCancelled === true)};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ['advSettled.tsNo', 'advSettled.isCompletelySettled'])) {
			if (i === 'vehicle') {
				oFilter[i] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

function constructFilters(oQuery, isAggr) {
	let oFilter = {};//{"isCancelled": (oQuery.isCancelled === true)};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from' || i === 'start_date') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				//oFilter[oQuery.dateType || "allocation_date"] = oFilter[oQuery.dateType || "allocation_date"] || {};
				//oFilter[oQuery.dateType || "allocation_date"].$gte = startDate;
				if (!oQuery.dateType) {
					oFilter["created_at"] = oFilter["created_at"] || {};
					oFilter["created_at"].$gte = startDate;
				} else if (oQuery.dateType === 'Trip started' || oQuery.dateType === 'Trip ended') {
					if (isAggr) {
						if (oQuery.dateType === 'Trip started') {
							oFilter['start_date'] = oFilter['start_date'] || {};
							oFilter['start_date'].$gte = startDate;
						} else if (oQuery.dateType === 'Trip ended') {
							oFilter['end_date'] = oFilter['end_date'] || {};
							oFilter['end_date'].$gte = startDate;
						}
					} else {
						oFilter['statuses'] = oFilter['statuses'] || {$elemMatch: {status: oQuery.dateType, date: {}}};
						oFilter['statuses'].$elemMatch.date.$gte = startDate;
					}
				} else if (oQuery.dateType === 'vendorDeal.deal_at' || oQuery.dateType === 'vendorDeal.entryDate' || oQuery.dateType === 'vendorDeal.acknowledge.date') {
					oFilter[oQuery.dateType] = oFilter[oQuery.dateType] || {};
					oFilter[oQuery.dateType].$gte = startDate;
				} else {
					oFilter[oQuery.dateType] = oFilter[oQuery.dateType] || {};
					oFilter[oQuery.dateType].$gte = startDate;
				}
			} else if (i === 'to' || i === 'end_date') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				//oFilter[oQuery.dateType || "allocation_date"] = oFilter[oQuery.dateType || "allocation_date"] || {};
				//oFilter[oQuery.dateType || "allocation_date"].$lte = endDate;
				if (!oQuery.dateType) {
					oFilter["created_at"] = oFilter["created_at"] || {};
					oFilter["created_at"].$lte = endDate;
				} else if (oQuery.dateType === 'Trip started' || oQuery.dateType === 'Trip ended') {
					if (isAggr) {
						if (oQuery.dateType === 'Trip started') {
							oFilter['start_date'] = oFilter['start_date'] || {};
							oFilter['start_date'].$lte = endDate;
						} else if (oQuery.dateType === 'Trip ended') {
							oFilter['end_date'] = oFilter['end_date'] || {};
							oFilter['end_date'].$lte = endDate;
						}
					} else {
						oFilter['statuses'] = oFilter['statuses'] || {$elemMatch: {status: oQuery.dateType, date: {}}};
						oFilter['statuses'].$elemMatch.date.$lte = endDate;
					}
				} else if (oQuery.dateType === 'vendorDeal.deal_at' || oQuery.dateType === 'vendorDeal.entryDate' || oQuery.dateType === 'vendorDeal.acknowledge.date') {
					oFilter[oQuery.dateType] = oFilter[oQuery.dateType] || {};
					oFilter[oQuery.dateType].$lte = endDate;
				} else {
					oFilter[oQuery.dateType] = oFilter[oQuery.dateType] || {};
					oFilter[oQuery.dateType].$lte = endDate;
				}
			} else if (i === 'remarks') {
				oFilter[i] = {$regex: oQuery[i].replace(' ', '.+'), $options: 'i'}
				// } else if (i === 'vehicle_query') {
				// 	oFilter[i] = oQuery[i];
				// 	oFilter["vehicle"] = {$ne: null}
			} else if (i === 'vehicle' || i === 'driver') {
				oFilter[i] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			} else if (i === 'vehicles' && oQuery['vehicles'].length > 0) {
				oFilter['vehicle'] = {$in: otherUtil.arrString2ObjectId(oQuery[i])}
			} else if (i === 'vehicle_no' && oQuery['vehicle_no'].length > 2) {
				oFilter['vehicle_no'] = {$regex: oQuery[i], $options: 'i'}
			} else if (i === 'vendorDeal.loading_slip') {
				oFilter[i] = {$regex: oQuery[i], $options: 'i'}
			}
			else if (i === 'route') {
				oFilter['route'] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			} else if (i === 'createdBy') {
				oFilter['created_by'] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			}
			else if (i === 'advanceBudget.0') {
				oFilter['advanceBudget.0'] = {$type: 'objectId'};
			} else if (i === 'tripSettleType') {
				oFilter['advSettled.tsNo'] = {$exists: oQuery[i] == "Unsetteled" ? false : true};
			} else if (i === "branch") {
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['branch'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			} else if (i === "vendor") {
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['vendor'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			}
			//
			else if ((i === 'source' || i === 'destination') && oQuery.source && oQuery.destination) {
				oFilter['$and'] =  [];
				oFilter['$and'].push({
					'rName': {$regex: oQuery['source'], $options: 'i'}
				}, {
					'rName': {$regex: oQuery['destination'], $options: 'i'}
				})
				// oFilter['rName'] = {$regex: oQuery['source'], $options: 'i'} ;
			}else if (i === 'source') {
				oFilter['rName'] = {$regex: oQuery[i], $options: 'i'}
			}
			else if (i === 'destination') {
				oFilter['rName'] = {$regex: oQuery[i], $options: 'i'}
			}
			//
			else if (i === '_id') {
				oFilter['_id'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
			}else if (i === 'segment_type') {
				if (oQuery[i] instanceof Array) {
					oFilter[i] = {$in: oQuery[i]};
				} else {
					oFilter[i] = oQuery[i];
				}
			}
			else if (i === 'vendorDeal.broker.id') {
				oFilter['vendorDeal.broker.id'] = otherUtil.arrString2ObjectId(oQuery[i]);
			}
			// else if (i === "tMNo"){
			// 	oFilter["tMemo.tMNo"] = {$regex: oQuery[i], $options: 'i'}
			// }
			else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

function constructGRFilters(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (oQuery.hasOwnProperty(i) && otherUtil.isAllowedFilter(i, ALLOWED_GR_FILTER)) {
			if (i === 'dateType' && oQuery[i] === 'loading_date') {
				oFilter = {
					'gr.statuses': {
						$elemMatch: {
							'status': 'Loading Ended',
							'date': {
								$gte: new Date(oQuery['from'] || '2000-01-20T00:00:00.000Z'),
								$lte: new Date(oQuery['to'] || '2050-01-20T00:00:00.000Z'),
							}
						}
					}
				};
			} else if (i === 'dateType' && oQuery[i] === 'unloading_date') {
				oFilter = {
					'gr.statuses': {
						$elemMatch: {
							'status': 'Unloading Ended',
							'date': {
								$gte: new Date(oQuery['from'] || '2000-01-20T00:00:00.000Z'),
								$lte: new Date(oQuery['to'] || '2050-01-20T00:00:00.000Z'),
							}
						}
					}
				};
			} else if (i === 'customer_id') {
				if (oQuery['download']) {
					oFilter = {
						'gr.customer': {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])}
					};
				} else {
					oFilter = {
						'customer': {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])}
					};
				}
			} else if (i === 'consignor_id') {
				if (oQuery['download']) {
					oFilter = {
						'gr.consignor': otherUtil.arrString2ObjectId(oQuery[i])
					};
				} else {
					oFilter = {
						'consignor': otherUtil.arrString2ObjectId(oQuery[i])
					};
				}
			} else if (i === 'consignee_id') {
				if (oQuery['download']) {
					oFilter = {
						'gr.consignee': otherUtil.arrString2ObjectId(oQuery[i])
					};
				} else {
					oFilter = {
						'consignee': otherUtil.arrString2ObjectId(oQuery[i])
					};
				}
			} else if (i == 'grNumber' && typeof oQuery[i] === 'string') {

				oFilter['grNumber'] = new RegExp(oQuery[i].replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');

			}
		}
	}
	return oFilter;
}

function constructFiltersforCache(oQuery, isAggr) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ['vehicle','branch', 'category', 'vehicle_no', 'owner_group', 'segment_type', 'from', 'to', 'account'])) {
			if (i === 'from' || i === 'start_date') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				//oFilter[oQuery.dateType || "allocation_date"] = oFilter[oQuery.dateType || "allocation_date"] || {};
				//oFilter[oQuery.dateType || "allocation_date"].$gte = startDate;
				if (!oQuery.dateType) {
					oFilter["created_at"] = oFilter["created_at"] || {};
					oFilter["created_at"].$gte = startDate;
				} else if (oQuery.dateType === 'Trip started' || oQuery.dateType === 'Trip ended') {
					if (isAggr) {
						if (oQuery.dateType === 'Trip started') {
							oFilter['start_date'] = oFilter['start_date'] || {};
							oFilter['start_date'].$gte = startDate;
						} else if (oQuery.dateType === 'Trip ended') {
							oFilter['end_date'] = oFilter['end_date'] || {};
							oFilter['end_date'].$gte = startDate;
						}
					} else {
						oFilter['statuses'] = oFilter['statuses'] || {$elemMatch: {status: oQuery.dateType, date: {}}};
						oFilter['statuses'].$elemMatch.date.$gte = startDate;
					}
				} else if (oQuery.dateType === 'vendorDeal.deal_at' || oQuery.dateType === 'vendorDeal.entryDate' || oQuery.dateType === 'vendorDeal.acknowledge.date') {
					oFilter[oQuery.dateType] = oFilter[oQuery.dateType] || {};
					oFilter[oQuery.dateType].$gte = startDate;
				} else {
					oFilter[oQuery.dateType] = oFilter[oQuery.dateType] || {};
					oFilter[oQuery.dateType].$gte = startDate;
				}
			} else if (i === 'to' || i === 'end_date') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				//oFilter[oQuery.dateType || "allocation_date"] = oFilter[oQuery.dateType || "allocation_date"] || {};
				//oFilter[oQuery.dateType || "allocation_date"].$lte = endDate;
				if (!oQuery.dateType) {
					oFilter["created_at"] = oFilter["created_at"] || {};
					oFilter["created_at"].$lte = endDate;
				} else if (oQuery.dateType === 'Trip started' || oQuery.dateType === 'Trip ended') {
					if (isAggr) {
						if (oQuery.dateType === 'Trip started') {
							oFilter['start_date'] = oFilter['start_date'] || {};
							oFilter['start_date'].$lte = endDate;
						} else if (oQuery.dateType === 'Trip ended') {
							oFilter['end_date'] = oFilter['end_date'] || {};
							oFilter['end_date'].$lte = endDate;
						}
					} else {
						oFilter['statuses'] = oFilter['statuses'] || {$elemMatch: {status: oQuery.dateType, date: {}}};
						oFilter['statuses'].$elemMatch.date.$lte = endDate;
					}
				} else if (oQuery.dateType === 'vendorDeal.deal_at' || oQuery.dateType === 'vendorDeal.entryDate' || oQuery.dateType === 'vendorDeal.acknowledge.date') {
					oFilter[oQuery.dateType] = oFilter[oQuery.dateType] || {};
					oFilter[oQuery.dateType].$lte = endDate;
				} else {
					oFilter[oQuery.dateType] = oFilter[oQuery.dateType] || {};
					oFilter[oQuery.dateType].$lte = endDate;
				}
			} else if (i === 'vehicle') {
				oFilter['vehicle._id'] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			}else if (i === 'branch') {
				oFilter['branch._id'] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			}else if (i === 'account') {
				if (typeof oQuery[i] === "string") {
					oFilter.$or = [{'advanceBudget.from_account': mongoose.Types.ObjectId(oQuery[i])},
						{'advanceBudget.to_account': mongoose.Types.ObjectId(oQuery[i])}];
				}
			}else if (i === 'vehicle_no' && oQuery['vehicle_no'].length > 2) {
				oFilter['vehicle.vehicle_no'] = {$regex: oQuery[i], $options: 'i'}
			}else if (i === "segment_type") {
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['vehicle.segment'] = {$in: Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]]};
				}
			}else if (i === "owner_group") {
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['vehicle.fleet'] = {$in: Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]]};
				}
			}  else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

function tripsheetConstructFilters(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ['trip_no','route','clientId', 'vehicle_no', 'tsNo', 'from', 'to', 'driver'])) {
			if(i === 'from' || i === 'to'){
				oFilter['markSettle.date'] ={
					$gte: moment(oQuery.from).startOf('day').toDate(),
					$lte: moment(oQuery.to).endOf('day').toDate()
				}
			}
			else if (i === 'vehicle_no') {
				oFilter[i] =  {$regex: oQuery[i], $options: 'i'}
			}
			else if(i === 'tsNo'){
				oFilter['advSettled.tsNo'] = oQuery[i];
			}
			else if (i === 'driver') {
				oFilter[i] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			}
			else if (i === 'route') {
				oFilter[i] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			}
			else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

async function add(req, res, next) {
	try {
		let aResponse = [];
		let aTrip = req.body.trips;
		let isTripStarted = false;
		for (let oTrip of aTrip) {
			let aGR = (oTrip.gr && oTrip.gr.length > 0) ? oTrip.gr : [];
			delete oTrip.gr;

			let oRoute = await transportRoute.findOne({
				_id: oTrip.route
			},{name:1, source:1, destination:1,route_distance:1, tat_hr:1, tat_min:1,});

			let driver = await Driver.findOne({clientId: req.user.clientId, _id: oTrip.driver},{prim_contact_no:1});

			var GrArr = aGR.map(function(item){ return item.grNumber }); //check duplicate Gr number in the same trip
			var isDuplicate = GrArr.some(function(item, idx){
				return GrArr.indexOf(item) != idx
			});
			if(isDuplicate){
				return res.status(500).json({
					status: 'ERROR',
					message: 'Gr Number already used. for this Trip.'
				});
			}

			let foundGr, shipNoSet = [];
			for (let oGR of aGR) {
				if (oGR.grNumber && !oGR.stationaryId) {
					let foundGrNo = await GR.find({grNumber: oGR.grNumber, clientId: req.user.clientId, tripCancelled: {$ne: true}}); //check duplicate Gr number in db
					if(foundGrNo && foundGrNo.length){
						return res.status(500).json({
							status: 'ERROR',
							message: 'Gr Number already used.'
						});
					}
					let foundStationary = await BillStationary.findOne({
						bookNo: oGR.grNumber,
						type: 'Gr',
						status: 'unused'
					});

					if (foundStationary)
						oGR.stationaryId = foundStationary._id;
					// else
					// 	return res.status(500).json({status: 'ERROR', message: 'Invalid GR Number'});

					// if (oGR.grNumber && !oGR.stationaryId)
					// 	throw new Error('Gr Number not registered to any stationary or is user');
				}

				if (oGR.integration && oGR.integration.shell && oGR.integration.shell.shipmentNo) {
					foundGr = (await GR.find({
						'integration.shell.shipmentNo': oGR.integration.shell.shipmentNo,
						tripCancelled: {$not: {$eq: true}},
						clientId: req.user.clientId
					},{grNumber:1}));
					shipNoSet.push(oGR.integration.shell.shipmentNo);
				}

				if (foundGr && foundGr.length)
					throw new Error(`Shipment Number ${oGR.integration.shell.shipmentNo} already registered to Gr ${foundGr[0].grNumber}`);
				// Trip MEMO
				if (oGR.tMemo && oGR.tMemo.tMNo){
					let Tmemo = await GR.findOne({'tMemo.tMNo':oGR.tMemo.tMNo,tripCancelled :  {$ne: true}, "clientId": req.user.clientId},{tMemo: 1});
					if(Tmemo){
						throw new Error(` trip memo no ${Tmemo  && Tmemo.tMemo && Tmemo.tMemo.tMNo} already generated`);
					}
				}
				if (oGR.tMemo && oGR.tMemo.tMNo && !oGR.tMemo.stationaryId) {
					let foundStationary = await BillStationary.findOne({
						bookNo: oGR.tMemo.tMNo,
						type: 'Trip Memo',
						status: {$in: ['unused', 'cancelled']}
					},{_id:1});

					if (foundStationary)
						oGR.tMemo.stationaryId = foundStationary._id;
				}
				// broker MEMO
				if (oGR.bMemo && oGR.bMemo.bmNo){
					let foundData = await GR.findOne({'bMemo.bmNo':oGR.bMemo.bmNo,tripCancelled :  {$ne: true}, "clientId": req.user.clientId},{bMemo: 1});
					if(foundData){
						throw new Error(` Broker memo no ${foundData  && foundData.bMemo && foundData.bMemo.bmNo} already generated`);
					}
				}
				if (oGR.bMemo && oGR.bMemo.bmNo && !oGR.bMemo.stationaryId) {
					let foundStationary = await BillStationary.findOne({
						bookNo: oGR.bMemo.bmNo,
						type: 'Broker Memo',
						status: {$in: ['unused', 'cancelled']}
					},{_id:1});

					if (foundStationary)
						oGR.bMemo.stationaryId = foundStationary._id;
				}
			}

			if (shipNoSet.length && shipNoSet.length > 1) {
				var uniqueSet = new Set(shipNoSet);
				var uniqueArr = Array.from(uniqueSet);
				if (shipNoSet.length != uniqueArr.length)
					throw new Error(`All Shipment Number should be Unique`);
			}
          // mobile app scenarios
			let oVehicle = await RegisteredVehicle.getRegisteredVehicle({
				_id: oTrip.vehicle
			},{vehicle_reg_no:1,status:1,ownershipType:1,driver:1,_id:1,segment_type:1,device_imei:1,driver2:1,driver2Name:1, veh_type_name:1});
			if ((oVehicle && (oVehicle.status === "Available")) || (oTrip.trip_start && oTrip.trip_end)) {
				let createTripTraqoObj = {};
				oTrip.clientId = req.user.clientId;
				if(req.clientConfig && req.clientConfig.config && req.clientConfig.config.vehAlloc && req.clientConfig.config.vehAlloc.deviceAttach && oTrip.device && oTrip.device.imei){
					if(oTrip.device.imei != oVehicle.device_imei){
						let deviceAttachInTripVehicle = await RegisteredVehicle.getRegisteredVehicle({
							"device_imei":oTrip.device.imei,
							// "status" : "In Trip",
							"last_known.status" : "In Trip"
						},{vehicle_reg_no:1,status:1,_id:1,segment_type:1,device_imei:1});
						if(deviceAttachInTripVehicle){
							throw new Error(`Device already attach with ${deviceAttachInTripVehicle.vehicle_reg_no}`);
						}
						let deviceAttachVehicle = await RegisteredVehicle.getRegisteredVehicle({
							"device_imei":oTrip.device.imei,
							// "status" : {$ne: "In Trip"},
							"last_known.status" : {$ne: "In Trip"}
						},{vehicle_reg_no:1,status:1,_id:1,segment_type:1,device_imei:1});
						if(deviceAttachVehicle){
							let vehicleUpdate = await RegisteredVehicleModel.findOneAndUpdate({
								_id:deviceAttachVehicle._id
							},{$unset:{device_imei:1}});
						}
						oVehicle.device_imei = oTrip.device.imei;
					}
				}
				oTrip.statuses = [{
					user_full_name: req.user.full_name,
					user_id: req.user._id,
					date: new Date(),
					systemDate: new Date(),
					status: "Trip not started",
					remark: "System generated."
				}];
				if (oTrip.trip_start && oTrip.trip_end) {
					if (moment(oTrip.trip_start).isAfter(moment())) {
						return res.status(500).json({
							status: 'ERROR',
							message: 'Trip start date can\'t be set to future.'
						});
					}
					if (moment(oTrip.trip_end).isAfter(moment())) {
						return res.status(500).json({
							status: 'ERROR',
							message: 'Trip end date can\'t be set to future.'
						});
					}
					if (moment(oTrip.trip_end).isBefore(moment(oTrip.trip_start))) {
						return res.status(500).json({
							status: 'ERROR',
							message: 'Trip end date can\'t be before trip start date.'
						});
					}
					let tripFilter = {
						vehicle: oVehicle._id,
						trip_start: oTrip.trip_start,
						trip_end: oTrip.trip_end,
						clientId: req.user.clientId
					};
					let project = {_id: 1, trip_no: 1};
					let tripBW = await Trip.findByStatusDate(tripFilter, project);
					if (tripBW && tripBW[0]) {
						return res.status(500).json({
							status: 'ERROR',
							message: 'Trip No ' + tripBW[0].trip_no + ' already exists for  start time ' + new Date(oTrip.trip_start).toLocaleDateString()
								+ ' end time ' + new Date(oTrip.trip_end).toLocaleDateString()
						});
					}
					if (oVehicle.device_imei) {
						var loadedTripStartGPS = await locationService.getOdometerAsync({
							device_imei: oVehicle.device_imei,
							datetime: new Date(oTrip.trip_start).getTime()
						});
						var loadedTripEndGPS = await locationService.getOdometerAsync({
							device_imei: oVehicle.device_imei,
							datetime: new Date(oTrip.trip_end).getTime()
						});
						if (Array.isArray(loadedTripStartGPS)) {
							if (loadedTripStartGPS[0]) {
								loadedTripStartGPS = loadedTripStartGPS[0];
							} else {
								loadedTripStartGPS = undefined;
							}
						}
						if (Array.isArray(loadedTripEndGPS)) {
							if (loadedTripEndGPS[0]) {
								loadedTripEndGPS = loadedTripEndGPS[0];
							} else {
								loadedTripEndGPS = undefined;
							}
						}
					}
					oTrip.status = 'Trip ended';
					oTrip.start_date = oTrip.trip_start;
					oTrip.end_date = oTrip.trip_end;
					oTrip.startOdo = oTrip.startOdo;
					oTrip.statuses = [
						{
							user_full_name: req.user.full_name,
							user_id: req.user._id,
							date: oTrip.trip_start,
							systemDate: new Date(),
							status: "Trip started",
							remark: "System generated.",
							gpsData: loadedTripStartGPS || {}
						},
						{
							user_full_name: req.user.full_name,
							user_id: req.user._id,
							date: oTrip.trip_end,
							systemDate: new Date(),
							status: "Trip ended",
							remark: "System generated.",
							gpsData: loadedTripEndGPS || {}
						}
					];
				}
				else if(oTrip.trip_start){
					if (moment(oTrip.trip_start).isAfter(moment())) {
						return res.status(500).json({
							status: 'ERROR',
							message: 'Trip start date can\'t be set to future.'
						});
					}

					if (moment(oTrip.trip_start).isBefore(moment(oTrip.allocation_date))) {
						return res.status(500).json({
							status: 'ERROR',
							message: 'Trip start date can\'t be set  before allocation date.'
						});
					}

					let tripFilter = {
						vehicle: oVehicle._id,
						trip_start: oTrip.trip_start,
						trip_end: new Date(),
						clientId: req.user.clientId
					};
					let project = {_id: 1, trip_no: 1};
					let tripBW = await Trip.findByStatusDate(tripFilter, project);
					if (tripBW && tripBW[0]) {
						return res.status(500).json({
							status: 'ERROR',
							message: 'Trip No ' + tripBW[0].trip_no + ' already exists for  start time ' + new Date(oTrip.trip_start).toLocaleDateString()
								+ ' end time ' + new Date().toLocaleDateString()
						});
					}
					if (oVehicle.device_imei) {
						var loadedTripStartGPS = await locationService.getOdometerAsync({
							device_imei: oVehicle.device_imei,
							datetime: new Date(oTrip.trip_start).getTime()
						});

						if (Array.isArray(loadedTripStartGPS)) {
							if (loadedTripStartGPS[0]) {
								loadedTripStartGPS = loadedTripStartGPS[0];
							} else {
								loadedTripStartGPS = undefined;
							}
						}
					}
					oTrip.status = 'Trip started';
					oTrip.start_date = oTrip.trip_start;
					oTrip.startOdo = oTrip.startOdo;
					oTrip.statuses = [
						{
							user_full_name: req.user.full_name,
							user_id: req.user._id,
							date: oTrip.trip_start,
							systemDate: new Date(),
							status: "Trip started",
							remark: "System generated.",
							gpsData: loadedTripStartGPS || {}
						}
					];
					isTripStarted = oTrip.trip_start;
				}
				oTrip.ownershipType = oVehicle.ownershipType;
				oTrip.driver = oTrip.driver || oVehicle.driver;

				if(oVehicle.driver2) {
					oTrip.driver2 = oVehicle.driver2;
					oTrip.driver2Name = oVehicle.driver2Name;
				}
				if(oTrip.driver){
					let driverOnCurrentTrip = await Trip.findOne({
						"clientId" : req.user.clientId,
						"driver" :mongoose.Types.ObjectId(oTrip.driver),
						"start_date":{$exists:true},
						"end_date":{$exists:false},
						"isCancelled" : false
					},{trip_no:1, statuses:1 })
					if(driverOnCurrentTrip){
						return res.status(500).json({
							status: 'ERROR',
							message: `Driver already attach on trip ${driverOnCurrentTrip.trip_no} .`
						});
					}

					let driverOnTrip = await Trip.findOne({
						"clientId" : req.user.clientId,
						"driver" :mongoose.Types.ObjectId(oTrip.driver) ,
						"start_date":{$lte:new Date(oTrip.allocation_date)},
						"end_date":{$gte:new Date(oTrip.allocation_date)},
						"isCancelled" : false
					},{trip_no:1, statuses:1 })
					let tripCan = driverOnTrip && driverOnTrip.statuses.find(obj => obj.status === 'Trip cancelled');
					let tripTime = driverOnTrip && driverOnTrip.statuses.find(obj =>
						obj.status === 'Trip ended' && (obj.date > new Date(oTrip.allocation_date)));
					if(tripTime && !tripCan){
						return res.status(500).json({
							status: 'ERROR',
							message: `Allocation time should be greater than trip end date for this vehicle on Trip:.` + driverOnTrip.trip_no
						});
					}
					if(driverOnTrip && !tripCan){
							return res.status(500).json({
								status: 'ERROR',
								message: `Driver already attach on trip ${driverOnTrip.trip_no} in this date .`
							});
					}
				}
				oTrip.lastTrip = oVehicle._id;
				oTrip.created_by = req.user._id;
				oTrip.segment_type = oVehicle.segment_type;
				if (oTrip.geofence_points) {//reomove fence id so that unique point created for each geofence
					for (let x = 0; k < oTrip.geofence_points.length; x++) {
						delete oTrip.geofence_points[x]._id;
					}
				}
				if (oTrip.vendorDeal && oTrip.vendorDeal.total_expense && !oTrip.vendorDeal.entryDate) {
					oTrip.vendorDeal.entryDate = new Date();
					oTrip.vendorDeal.created_by = req.user.full_name;
					oTrip.vendorDeal.createdAt = new Date();
					if (oTrip.vendorDeal.loading_slip) {

						let isSlipNoUsed = await Trip.aggregate([
							{
								$match: {
									'vendorDeal.loading_slip': oTrip.vendorDeal.loading_slip,
									'clientId': oTrip.clientId,
									isCancelled :  {$ne: true},
								}
							},
							{$project:{bookNo:1,_id:1}}
						]);

						if (isSlipNoUsed && isSlipNoUsed[0])
							throw new Error('Hire Slip Ref No already used');

						let lsStationaryId;

						if (oTrip.vendorDeal.lsStationaryId)
							lsStationaryId = oTrip.vendorDeal.lsStationaryId;
						else {
							let foundStationary = await billStationaryService.findByRefAndType({
								bookNo: oTrip.vendorDeal.loading_slip,
								type: 'Hire Slip',
								clientId: oTrip.clientId
							},{_id:1,bookNo:1});

							if (foundStationary) {
								lsStationaryId = foundStationary._id;
							}
						}

						if (lsStationaryId) {
							oTrip.vendorDeal.lsStationaryId = lsStationaryId;
						}

						if (oTrip.vendorDeal.lsStationaryId) {
							await billStationaryService.updateStatus({
								userName: req.user.full_name,
								modelName: 'tripV2',
								stationaryId: oTrip.vendorDeal.lsStationaryId,
							}, 'used');
						}
					}
				}

				//Save New Trip
				let geofence_points = [], oRouteData;
				if(oRoute && oRoute.source && oRoute.source.name && oRoute.destination && oRoute.destination.name && oRoute.source.latitude){
					geofence_points.push({
						name: oRoute.source.name,
						type: 'Source',
						geozone : [{latitude: oRoute.source.latitude, longitude: oRoute.source.longitude}]
					})

					geofence_points.push({
						name: oRoute.destination.name,
						type: 'Destination',
						geozone : [{latitude: oRoute.destination.latitude, longitude: oRoute.destination.longitude}]
					})
				}

				if(aGR && aGR[0] && aGR[0].booking){
					let bookingDoc = await Booking.findOne({_id: aGR && aGR[0] && aGR[0].booking}, {type:1, sr:1, preference:1, customer:1});
					if(bookingDoc){
						oTrip.type = bookingDoc && bookingDoc.type;
					}
					//tracking scenarios
					let srTyp = oTrip.serviceTyp || bookingDoc.sr;  //service type
					if(srTyp && oVehicle.veh_type_name && bookingDoc.customer && oTrip.route){
						let oFilRoute = {
							category: "tracking",
							route__id: oTrip.route,
							customer__id: bookingDoc.customer,
							vehTypeNam: oVehicle.veh_type_name,
							service: srTyp,
						};
						 oRouteData = await RouteData.findOne(oFilRoute,{milestone:1,tat_hr:1,tat_min:1}).lean();

						if(oRouteData && oRouteData.milestone && oRouteData.milestone.length){
							oRouteData.milestone.forEach(obj=> {
								geofence_points.push({
									name: obj.name,
									type: obj.category,
									tat_hr:obj.tat_hr,
									tat_min:obj.tat_min,
									tat_km:obj.tat_km,
									halt_d:obj.halt_d,
									geozone : [{latitude: obj.location.lat, longitude: obj.location.lng}]
								})
							})
						}
					}
					let isCustwiseBudgeting = req.clientConfig && req.clientConfig.config && req.clientConfig.config.tripSettlement && req.clientConfig.config.tripSettlement.custwiseBudgeting;
					if( isCustwiseBudgeting && srTyp && oVehicle.veh_type_name && bookingDoc.customer && oTrip.route){
						try {
							let qryObj = {
								category: "budgeting",
								service: srTyp,
								vehTypeNam: oVehicle.veh_type_name,
								route__id: mongoose.Types.ObjectId(oTrip.route),
								customer__id:mongoose.Types.ObjectId(bookingDoc.customer)
							};
							let data = await RouteData.findOne(qryObj,{"rateKm":1,"dieselKm":1,"toll":1}).lean();
							if(data) {
								// customer wise budgeting
								oTrip.tripBudget = {
									dieselKm: data.dieselKm || 0,
									rateKm: data.rateKm || 0,
									toll: data.toll || 0,
								}
							}

						} catch (err) {
							console.log(err);
						}
					}
				}

				if(oRouteData && oRouteData.tat_hr){
					oTrip.tat_hr = oRouteData.tat_hr;
					oTrip.tat_min = oRouteData.tat_min || 0;
				}else if(oRoute && oRoute.tat_hr){
					oTrip.tat_hr = oRoute.tat_hr;
					oTrip.tat_min = oRoute.tat_min || 0;
				}

				if(geofence_points.length){
					oTrip.geofence_points = geofence_points;
				}

				if(req.clientConfig && req.clientConfig.config && req.clientConfig.config.vehAlloc && req.clientConfig.config.vehAlloc.autoStartTrip){
					oTrip.statuses = oTrip.statuses || [];
					if (oVehicle.device_imei) {
						var loadedTripStartGPS = await locationService.getOdometerAsync({
							device_imei: oVehicle.device_imei,
							datetime: new Date(oTrip.allocation_date).getTime()
						});

						if (Array.isArray(loadedTripStartGPS)) {
							if (loadedTripStartGPS[0]) {
								loadedTripStartGPS = loadedTripStartGPS[0];
							} else {
								loadedTripStartGPS = undefined;
							}
						}
					}
					if (!oTrip.statuses.find(o => o.status === 'Trip started')) {
						oTrip.status = 'Trip started';
						oTrip.startOdo = oTrip.startOdo;
						oTrip.start_date = oTrip.trip_start || oTrip.allocation_date || new Date();
						oTrip.statuses.push({
							user_id: req.user._id,
							user_full_name: req.user.full_name,
							date: oTrip.trip_start || oTrip.allocation_date || new Date(),
							systemDate: new Date(),
							status: 'Trip started',
							gpsData: loadedTripStartGPS || {},
							remark: (req.body.remark) ? req.body.remark : "System generated",
						});
						isTripStarted = oTrip.allocation_date;
					}
				}
				const newTrip = new Trip(oTrip);
				let savedTrip = await newTrip.save();
				if(oTrip.tripBase === "Sim Based" && req.clientConfig && req.clientConfig.config && req.clientConfig.config.vehAlloc && req.clientConfig.config.vehAlloc.createTripTraqo){
					try {
						createTripTraqoObj.tel = driver && driver.prim_contact_no.toString();
						createTripTraqoObj.src = oRoute && oRoute.source && oRoute.source.latitude.toString().concat(",", oRoute && oRoute.source && oRoute.source.longitude.toString());
						createTripTraqoObj.dest = oRoute && oRoute.destination && oRoute.destination.latitude.toString().concat("," ,oRoute && oRoute.destination && oRoute.destination.longitude.toString());
						createTripTraqoObj.srcname = oRoute && oRoute.source && oRoute.source.c;
						createTripTraqoObj.destname = oRoute &&  oRoute.destination && oRoute.destination.c;
						createTripTraqoObj.truck_number = savedTrip.vehicle_no;
						createTripTraqoObj.invoice = savedTrip.trip_no;
						createTripTraqoObj.eta_hrs = 0;
						let oTripId = await traqoApiService.createTripTraqo(createTripTraqoObj);
						if (oTripId) {
							oTripId = JSON.parse(oTripId);
							let updateTrip = await savedTrip.set({traqoTripId: oTripId.tripId}).save();
						}
					} catch (e) {
						console.error('[Tracqo Create trip Api  error]', e);
						//telegram.sendMessage('[Fastag Api error] ' + e.message);
					}

				}


				//let newExpense = await TripExpense.createTripExpenseAsync(savedTrip);
				let aGR_id = [];
				for (let oGR of aGR) {
					var bookingDoc = await Booking.find({_id: oGR.booking}, {consigner: 1, customer: 1,type:1});
					if (bookingDoc && bookingDoc[0]) {
						bookingDoc = bookingDoc[0];
						bookingDoc = JSON.parse(JSON.stringify(bookingDoc));
					}
					bookingDoc = bookingDoc || {};
					oGR.vehicle = oVehicle._id;
					if (!oGR.customer && bookingDoc && bookingDoc.customer)
						oGR.customer = bookingDoc.customer;
					if (!oGR.consignor && bookingDoc && bookingDoc.consigner)
						oGR.consignor = bookingDoc.consigner;
					if (!oGR.consignee && bookingDoc && bookingDoc.consignee && bookingDoc.consignee[0])
						oGR.consignee = bookingDoc.consignee[0];
					// oGR.consignee = bookingDoc && bookingDoc.consignee[0];
					oGR.clientId = req.user.clientId;
					oGR.created_by = req.user._id;
					oGR.created_by_full_name = req.user.full_name;
					oGR.route = oGR.route ? oGR.route : savedTrip.route;
					oGR.trip = savedTrip._id;
					oGR.vehicle_no = oVehicle.vehicle_reg_no;
					oGR.trip_no = savedTrip.trip_no;
					oGR.status = "GR Not Assigned";
					oGR.statuses = [];
					let isCovernote = bookingDoc.customer && bookingDoc.customer.type && (bookingDoc.customer.type.length > 0 &&
						bookingDoc.customer.type.indexOf('Transporter') > -1) ||
						(bookingDoc.customer && bookingDoc.customer.clientId !== req.user.clientId);
					if (isCovernote) {
						oGR.coverNote = {
							isCovernote: true
						}
					}
					if (oGR.geofence_points) {//reomove fence id so that unique point created for each geofence
						for (let k = 0; k < oGR.geofence_points.length; k++) {
							delete oGR.geofence_points[k]._id;
						}
					}

					if (oGR.grNumber && !oGR.stationaryId) {
						let foundStationary = await BillStationary.findOne({
							bookNo: oGR.grNumber,
							type: 'Gr',
							status: 'unused'
						});

						if (foundStationary)
							oGR.stationaryId = foundStationary._id;
						// else
						// 	return res.status(500).json({status: 'ERROR', message: 'Invalid GR Number'});
					}

					// if (oGR.grNumber && !oGR.stationaryId)
					// 	throw new Error('Gr Number not registered to any stationary or is user');

					if (oGR.stationaryId) {
						oGR.status = 'GR Assigned';
						oGR.statuses = [{
							user_full_name: req.user.full_name,
							user_id: req.user._id,
							date: (oGR.grDate) ? oGR.grDate : new Date(),
							systemDate: new Date(),
							status: 'GR Assigned',
						}];

						if (!newTrip.statuses.find(o => o.status === 'Trip started')) {
							newTrip.status = 'Trip started';
							newTrip.start_date = (req.clientConfig
								&& req.clientConfig.config
								&& req.clientConfig.config.trip
								&& req.clientConfig.config.trip.tripDateAllocationDate) ? (oTrip.allocation_date || new Date()) : (oGR.grDate || new Date());
							newTrip.statuses.push({
								user_id: req.user._id,
								user_full_name: req.user.full_name,
								date: (req.clientConfig
									&& req.clientConfig.config
									&& req.clientConfig.config.trip
									&& req.clientConfig.config.trip.tripDateAllocationDate) ? (oTrip.allocation_date || new Date()) : (oGR.grDate || new Date()),
								systemDate: new Date(),
								status: 'Trip started',
								remark: (req.body.remark) ? req.body.remark : undefined,
							});
							newTrip.save();
							isTripStarted = (req.clientConfig
								&& req.clientConfig.config
								&& req.clientConfig.config.trip
								&& req.clientConfig.config.trip.tripDateAllocationDate) ? (oTrip.allocation_date || new Date()) : (oGR.grDate || new Date());;
						}
					}
					//Trip Memo Handling for transporter booking
                    //  if(oGR.gr_type == 'Trip Memo' && oGR.tMemo && oGR.tMemo.total){
					// 	 oGR.basicFreight = oGR.tMemo.total || 0;
					// 	 oGR.totalFreight =  oGR.tMemo.total || 0;
					//  }
                    //Trip memo handling finished
					//Add Trip GR
					const newGR = new GR(oGR);
					let savedGR = await newGR.save();
					aGR_id.push(savedGR._id);

					if (oGR.stationaryId) {
						await billStationaryService.updateStatusV2({
							_id: oGR.stationaryId
						}, {
							userName: req.user.full_name,
							status: 'used',
							docId: oGR._id,
							modelName: 'TripGr',
						});
					}

					if (oGR.tMemo && oGR.tMemo.stationaryId) {
						await billStationaryService.updateStatusV2({
							_id: oGR.tMemo.stationaryId
						}, {
							userName: req.user.full_name,
							status: 'used',
							docId: oGR._id,
							modelName: 'TripGr',
						});
					}

					if (oGR.bMemo && oGR.bMemo.stationaryId) {
						await billStationaryService.updateStatusV2({
							_id: oGR.bMemo.stationaryId
						}, {
							userName: req.user.full_name,
							status: 'used',
							docId: oGR._id,
							modelName: 'TripGr',
						});
					}
				}

				if (oTrip.vendorDeal && oTrip.vendorDeal.lsStationaryId) {
					await billStationaryService.updateStatus({
						userName: req.user.full_name,
						docId: newTrip._id.toString(),
						modelName: 'tripV2',
						stationaryId: oTrip.vendorDeal.lsStationaryId,
					}, 'used');
				}

				//Update Trip
				let updateTrip = await savedTrip.set({gr: aGR_id, trip_expenses: []}).save();
				//let updateTrip = await Trip.findOneAndUpdate({ _id: savedTrip._id }, { $set: { gr: aGR_id, trip_expenses: [newExpense._id] } }, { new: true });

				//Update Vehicle
				if (isTripStarted) {
					let oVehicleUpdate = {
						status: "In Trip",
						previousStatus: "Booked",
						last_known: {
							status: "In Trip",
							datetime: isTripStarted || new Date(),
							trip: newTrip._id,
							trip_no: newTrip.trip_no,
							trip_name: newTrip.route_name
						}
					};

					if(req.clientConfig && req.clientConfig.config && req.clientConfig.config.vehAlloc && req.clientConfig.config.vehAlloc.deviceAttach  && oTrip.device && oTrip.device.imei){
						oVehicleUpdate.device_imei = oTrip.device.imei;
						oVehicleUpdate.device_type = oTrip.device.device_type;
					}

					await RegisteredVehicle.updateRegisteredVehicle({
						_id: oTrip.vehicle
					}, {$set: oVehicleUpdate});
				} else if (!(oTrip.trip_start && oTrip.trip_end)) {
					let oVehicleUpdate = {
						status: "Booked",
						last_known: {
							status: "Booked",
							datetime: new Date(),
							trip: updateTrip._id,
							trip_no: updateTrip.trip_no,
							trip_name: oTrip.route_name,
						}
					};
					if(req.clientConfig && req.clientConfig.config && req.clientConfig.config.vehAlloc && req.clientConfig.config.vehAlloc.deviceAttach  && oTrip.device && oTrip.device.imei){
						oVehicleUpdate.device_imei = oTrip.device.imei;
						oVehicleUpdate.device_type = oTrip.device.device_type;
					}
					let updateVehicle = await RegisteredVehicle.updateRegisteredVehicle(
						{_id: oTrip.vehicle, clientId: req.user.clientId, vehicle_reg_no: oTrip.vehicle_no},
						{$set: oVehicleUpdate}
					);
				}

				let tripData = await Trip.find({_id: updateTrip._id, populateGR: true});
				//Message
				let message = {
					status: "Success",
					vehicle: updateTrip.vehicle_no,
					message: `Vehicle ${updateTrip.vehicle_no} is on trip number ${updateTrip.trip_no}.`,
					data: tripData[0]
				};
				aResponse.push(message);
				//update alarm setting on trip start to switch on geofence checking
				if(oTrip.device && oTrip.device.imei){
					let oDevice = {device_id:oTrip.device.imei,device_type:oTrip.device.device_type};
					locationService.updateTripAlerts(oDevice,function(err,resp){
						if(err){
							console.error('updateTripAlerts err' ,err.message);
						}
					});
				}
			} else {
				let message = {
					status: "Failed",
					vehicle: (oVehicle && oVehicle.vehicle_reg_no) ? oVehicle.vehicle_reg_no : "NOT FOUND",
					message: `FAILED! Vehicle ${(oVehicle && oVehicle.vehicle_reg_no) ? oVehicle.vehicle_reg_no + " is not available for trip." : ' not found.'}`
				};
				aResponse.push(message);
			}
		}

		res.status(200).json({status: "OK", "messages": aResponse});
	} catch (err) {
		winston.error(err.message || err.toString());
		next(err);
	}
}

async function addGrNumber(req, res, next) {
	try{
		if(req.body.grNumber){
			let foundGr = await GR.find({grNumber: req.body.grNumber, clientId: req.user.clientId});
			if(foundGr && foundGr.length){
				return res.status(500).json({
					status: 'ERROR',
					message: 'Gr Number already used.'
				});
			}else {
				return res.status(200).json({
					status: 'Success',
					message: 'GR Not found'
				});
			}
		}
	}catch(err){
		throw err;
	}
}

async function createTrip(req, res, next) {
	try {
		let aResponse = [];
		let aTrip = req.body.trips;
		for (let oTrip of aTrip) {
			let aGR = (oTrip.gr && oTrip.gr.length > 0) ? oTrip.gr : [];
			delete oTrip.gr;
			/*
			let oRoute = await transportRoute.findOne({
				_id: oTrip.route
			});
			 */

			let foundGr, shipNoSet = [];

			for (let oGR of aGR) {
				if (oGR.grNumber && !oGR.stationaryId) {
					let foundStationary = await BillStationary.findOne({
						bookNo: oGR.grNumber,
						type: 'Gr',
						status: 'unused'
					});

					if (foundStationary)
						oGR.stationaryId = foundStationary._id;
					// else
					// 	return res.status(500).json({status: 'ERROR', message: 'Invalid GR Number'});

					// if (oGR.grNumber && !oGR.stationaryId)
					// 	throw new Error('Gr Number not registered to any stationary or is user');
				}

				if (oGR.integration && oGR.integration.shell && oGR.integration.shell.shipmentNo) {
					foundGr = (await GR.find({
						'integration.shell.shipmentNo': oGR.integration.shell.shipmentNo,
						tripCancelled: {$not: {$eq: true}}
					},{grNumber:1}));
					shipNoSet.push(oGR.integration.shell.shipmentNo);
				}

				if (foundGr && foundGr.length)
					throw new Error(`Shipment Number ${oGR.integration.shell.shipmentNo} already registered to Gr ${foundGr[0].grNumber}`);
				if (oGR.tMemo && oGR.tMemo.tMNo){
					let Tmemo = await GR.findOne({'tMemo.tMNo':oGR.tMemo.tMNo,tripCancelled :  {$ne: true}, "clientId": req.user.clientId},{tMemo: 1});
					if(Tmemo){
						throw new Error(` trip memo no ${Tmemo  && Tmemo.tMemo && Tmemo.tMemo.tMNo} already generated`);
					}
				}
				if (oGR.tMemo && oGR.tMemo.tMNo && !oGR.tMemo.stationaryId) {
					let foundStationary = await BillStationary.findOne({
						bookNo: oGR.tMemo.tMNo,
						type: 'Trip Memo',
						status: {$in: ['unused', 'cancelled']}
					},{_id:1});

					if (foundStationary)
						oGR.tMemo.stationaryId = foundStationary._id;
				}
			}

			if (shipNoSet.length && shipNoSet.length > 1) {
				var uniqueSet = new Set(shipNoSet);
				var uniqueArr = Array.from(uniqueSet);
				if (shipNoSet.length != uniqueArr.length)
					throw new Error(`All Shipment Number should be Unique`);
			}
			// mobile app scenarios
			let oVehicle = await RegisteredVehicle.getRegisteredVehicle({
				_id: oTrip.vehicle
			},{vehicle_reg_no:1,status:1,ownershipType:1,driver:1,_id:1,segment_type:1,device_imei:1});
			if ((oVehicle && (oVehicle.status === "Available")) || (oTrip.trip_start && oTrip.trip_end)) {
				oTrip.clientId = req.user.clientId;
				oTrip.statuses = [{
					user_full_name: req.user.full_name,
					user_id: req.user._id,
					date: new Date(),
					systemDate: new Date(),
					status: "Trip not started",
					remark: "System generated."
				}];
				if (oTrip.trip_start && oTrip.trip_end) {
					if (moment(oTrip.trip_start).isAfter(moment())) {
						return res.status(500).json({
							status: 'ERROR',
							message: 'Trip start date can\'t be set to future.'
						});
					}
					if (moment(oTrip.trip_end).isAfter(moment())) {
						return res.status(500).json({
							status: 'ERROR',
							message: 'Trip end date can\'t be set to future.'
						});
					}
					if (moment(oTrip.trip_end).isBefore(moment(oTrip.trip_start))) {
						return res.status(500).json({
							status: 'ERROR',
							message: 'Trip end date can\'t be before trip start date.'
						});
					}
					let tripFilter = {
						vehicle: oVehicle._id,
						trip_start: oTrip.trip_start,
						trip_end: oTrip.trip_end,
						clientId: req.user.clientId
					};
					let project = {_id: 1, trip_no: 1};
					let tripBW = await Trip.findByStatusDate(tripFilter, project);
					if (tripBW && tripBW[0]) {
						return res.status(500).json({
							status: 'ERROR',
							message: 'Trip No ' + tripBW[0].trip_no + ' already exists for  start time ' + new Date(oTrip.trip_start).toLocaleDateString()
							+ ' end time ' + new Date(oTrip.trip_end).toLocaleDateString()
						});
					}
					if (oVehicle.device_imei) {
						var loadedTripStartGPS = await locationService.getOdometerAsync({
							device_imei: oVehicle.device_imei,
							datetime: new Date(oTrip.trip_start).getTime()
						});
						var loadedTripEndGPS = await locationService.getOdometerAsync({
							device_imei: oVehicle.device_imei,
							datetime: new Date(oTrip.trip_end).getTime()
						});
						if (Array.isArray(loadedTripStartGPS)) {
							if (loadedTripStartGPS[0]) {
								loadedTripStartGPS = loadedTripStartGPS[0];
							} else {
								loadedTripStartGPS = undefined;
							}
						}
						if (Array.isArray(loadedTripEndGPS)) {
							if (loadedTripEndGPS[0]) {
								loadedTripEndGPS = loadedTripEndGPS[0];
							} else {
								loadedTripEndGPS = undefined;
							}
						}
					}
					oTrip.status = 'Trip ended';
					oTrip.start_date = oTrip.trip_start;
					oTrip.end_date = oTrip.trip_end;
					oTrip.statuses = [
						{
							user_full_name: req.user.full_name,
							user_id: req.user._id,
							date: oTrip.trip_start,
							systemDate: new Date(),
							status: "Trip started",
							remark: "System generated.",
							gpsData: loadedTripStartGPS || {}
						},
						{
							user_full_name: req.user.full_name,
							user_id: req.user._id,
							date: oTrip.trip_end,
							systemDate: new Date(),
							status: "Trip ended",
							remark: "System generated.",
							gpsData: loadedTripEndGPS || {}
						}
					];
				}
				oTrip.ownershipType = oVehicle.ownershipType;
				oTrip.driver = oTrip.driver || oVehicle.driver;
				oTrip.lastTrip = oVehicle._id;
				oTrip.created_by = req.user._id;
				oTrip.segment_type = oVehicle.segment_type;
				if (oTrip.geofence_points) {//reomove fence id so that unique point created for each geofence
					for (let x = 0; k < oTrip.geofence_points.length; x++) {
						delete oTrip.geofence_points[x]._id;
					}
				}
				if (oTrip.vendorDeal && oTrip.vendorDeal.total_expense && !oTrip.vendorDeal.entryDate) {
					oTrip.vendorDeal.entryDate = new Date();
					oTrip.vendorDeal.created_by = req.user.full_name;
					oTrip.vendorDeal.createdAt = new Date();
					if (oTrip.vendorDeal.loading_slip) {

						let isSlipNoUsed = await Trip.aggregate([
							{
								$match: {
									'vendorDeal.loading_slip': oTrip.vendorDeal.loading_slip,
									'clientId': oTrip.clientId,
									isCancelled :  {$ne: true},
								}
							},
							{$project:{bookNo:1,_id:1}}
						]);

						if (isSlipNoUsed && isSlipNoUsed[0])
							throw new Error('Hire Slip Ref No already used');

						let lsStationaryId;

						if (oTrip.vendorDeal.lsStationaryId)
							lsStationaryId = oTrip.vendorDeal.lsStationaryId;
						else {
							let foundStationary = await billStationaryService.findByRefAndType({
								bookNo: oTrip.vendorDeal.loading_slip,
								type: 'Hire Slip',
								clientId: oTrip.clientId
							},{_id:1,bookNo:1});

							if (foundStationary) {
								lsStationaryId = foundStationary._id;
							}
						}

						if (lsStationaryId) {
							oTrip.vendorDeal.lsStationaryId = lsStationaryId;
						}

						if (oTrip.vendorDeal.lsStationaryId) {
							await billStationaryService.updateStatus({
								userName: req.user.full_name,
								modelName: 'tripV2',
								stationaryId: oTrip.vendorDeal.lsStationaryId,
							}, 'used');
						}
					}
				}

				//Save New Trip
				if(aGR && aGR[0] && aGR[0].booking){
					let bookingDoc = await Booking.findOne({_id: aGR && aGR[0] && aGR[0].booking}, {type:1});
					if(bookingDoc){
						oTrip.type = bookingDoc && bookingDoc.type;
					}
				}
				const newTrip = new Trip(oTrip);
				let savedTrip = await newTrip.save();
				let isTripStarted = false;
				//let newExpense = await TripExpense.createTripExpenseAsync(savedTrip);
				let aGR_id = [];
				aGR.sort( (a,b) => new Date(a.grDate || new Date) - new Date(b.grDate || new Date) );
				for (let oGR of aGR) {
					var bookingDoc = await Booking.find({_id: oGR.booking}, {consigner: 1, customer: 1,type:1});
					if (bookingDoc && bookingDoc[0]) {
						bookingDoc = bookingDoc[0];
						bookingDoc = JSON.parse(JSON.stringify(bookingDoc));
					}
					bookingDoc = bookingDoc || {};
					oGR.vehicle = oVehicle._id;
					if (!oGR.customer && bookingDoc && bookingDoc.customer)
						oGR.customer = bookingDoc.customer;
					if (!oGR.consignor && bookingDoc && bookingDoc.consigner)
						oGR.consignor = bookingDoc.consigner;
					if (!oGR.consignee && bookingDoc && bookingDoc.consignee && bookingDoc.consignee[0])
						oGR.consignee = bookingDoc.consignee[0];
					// oGR.consignee = bookingDoc && bookingDoc.consignee[0];
					oGR.clientId = req.user.clientId;
					oGR.created_by = req.user._id;
					oGR.created_by_full_name = req.user.full_name;
					oGR.route = oGR.route ? oGR.route : savedTrip.route;
					oGR.trip = savedTrip._id;
					oGR.vehicle_no = oVehicle.vehicle_reg_no;
					oGR.trip_no = savedTrip.trip_no;
					oGR.status = "GR Not Assigned";
					oGR.statuses = [];
					let isCovernote = bookingDoc.customer && bookingDoc.customer.type && (bookingDoc.customer.type.length > 0 &&
						bookingDoc.customer.type.indexOf('Transporter') > -1) ||
						(bookingDoc.customer && bookingDoc.customer.clientId !== req.user.clientId);
					if (isCovernote) {
						oGR.coverNote = {
							isCovernote: true
						}
					}
					if (oGR.geofence_points) {//reomove fence id so that unique point created for each geofence
						for (let k = 0; k < oGR.geofence_points.length; k++) {
							delete oGR.geofence_points[k]._id;
						}
					}

					if (oGR.grNumber && !oGR.stationaryId) {
						let foundStationary = await BillStationary.findOne({
							bookNo: oGR.grNumber,
							type: 'Gr',
							status: 'unused'
						});

						if (foundStationary)
							oGR.stationaryId = foundStationary._id;
						// else
						// 	return res.status(500).json({status: 'ERROR', message: 'Invalid GR Number'});
					}

					// if (oGR.grNumber && !oGR.stationaryId)
					// 	throw new Error('Gr Number not registered to any stationary or is user');

					if (oGR.stationaryId) {
						oGR.status = 'GR Assigned';
						oGR.statuses = [{
							user_full_name: req.user.full_name,
							user_id: req.user._id,
							date: (oGR.grDate) ? oGR.grDate : new Date(),
							systemDate: new Date(),
							status: 'GR Assigned',
						}];

						if (!newTrip.statuses.find(o => o.status === 'Trip started')) {
							newTrip.status = 'Trip started';
							newTrip.start_date = oGR.grDate || new Date();
							newTrip.statuses.push({
								user_id: req.user._id,
								user_full_name: req.user.full_name,
								date: oGR.grDate || new Date(),
								systemDate: new Date(),
								status: 'Trip started',
								remark: (req.body.remark) ? req.body.remark : undefined,
							});
							newTrip.save();
							isTripStarted = oGR.grDate;
						}
					}
					//Trip Memo Handling for transporter booking
					//  if(oGR.gr_type == 'Trip Memo' && oGR.tMemo && oGR.tMemo.total){
					// 	 oGR.basicFreight = oGR.tMemo.total || 0;
					// 	 oGR.totalFreight =  oGR.tMemo.total || 0;
					//  }
					//Trip memo handling finished
					//Add Trip GR
					if(!oGR._id) {
						const newGR = new GR(oGR);
						let savedGR = await newGR.save();
						aGR_id.push(savedGR._id);

						if (oGR.stationaryId) {
							await billStationaryService.updateStatusV2({
								_id: oGR.stationaryId
							}, {
								userName: req.user.full_name,
								status: 'used',
								docId: oGR._id,
								modelName: 'TripGr',
							});
						}
					}else{
						aGR_id.push(oGR._id);
						await GR.updateOne({_id: oGR._id}, {
							$set: {
								trip : savedTrip._id,
								vehicle_no : oVehicle.vehicle_reg_no,
								vehicle : oVehicle._id,
								trip_no : savedTrip.trip_no,
								status : oGR.status,
								statuses : oGR.statuses || [],
								last_modified_at: new Date(),
								last_modified_by: req.user.full_name,
							}
						});
					}

					if (oGR.tMemo && oGR.tMemo.stationaryId) {
						await BillStationary.findByIdAndUpdate(oGR.tMemo.stationaryId, {
							$set: {status: 'used',last_modified_at: new Date()},
							$push: {
								commonHistory: {
									user: req.user.full_name,
									date: new Date(),
									status: 'used',
									wasLinkedTo: oGR._id,
									wasLinkedToSchema: 'TripGr',
								}
							}
						});
					}
				}

				if (oTrip.vendorDeal && oTrip.vendorDeal.lsStationaryId) {
					await billStationaryService.updateStatus({
						userName: req.user.full_name,
						docId: newTrip._id.toString(),
						modelName: 'tripV2',
						stationaryId: oTrip.vendorDeal.lsStationaryId,
					}, 'used');
				}

				//Update Trip
				let updateTrip = await savedTrip.set({gr: aGR_id, trip_expenses: []}).save();
				//let updateTrip = await Trip.findOneAndUpdate({ _id: savedTrip._id }, { $set: { gr: aGR_id, trip_expenses: [newExpense._id] } }, { new: true });

				//Update Vehicle
				if (isTripStarted) {
					let oVehicleUpdate = {
						status: "In Trip",
						previousStatus: "Booked",
						last_known: {
							status: "In Trip",
							datetime: isTripStarted || new Date(),
							trip: newTrip._id,
							trip_no: newTrip.trip_no,
							trip_name: newTrip.route_name
						}
					};

					await RegisteredVehicle.updateRegisteredVehicle({
						_id: oTrip.vehicle
					}, {$set: oVehicleUpdate});
				} else if (!(oTrip.trip_start && oTrip.trip_end)) {
					let oVehicleUpdate = {
						status: "Booked",
						last_known: {
							status: "Booked",
							datetime: new Date(),
							trip: updateTrip._id,
							trip_no: updateTrip.trip_no,
							trip_name: oTrip.route_name,
						}
					};
					let updateVehicle = await RegisteredVehicle.updateRegisteredVehicle(
						{_id: oTrip.vehicle, clientId: req.user.clientId, vehicle_reg_no: oTrip.vehicle_no},
						{$set: oVehicleUpdate}
					);
				}

				let tripData = await Trip.find({_id: updateTrip._id, populateGR: true});
				//Message
				let message = {
					status: "Success",
					vehicle: updateTrip.vehicle_no,
					message: `Vehicle ${updateTrip.vehicle_no} is on trip number ${updateTrip.trip_no}.`,
					data: tripData[0]
				};
				aResponse.push(message);
				/*if(receiver && oVehicle.device_imei){
					let message = {	d: oVehicle.device_imei,ft: 'tg'};
					receiver.sendMessage(message);
				}*/
			} else {
				let message = {
					status: "Failed",
					vehicle: (oVehicle && oVehicle.vehicle_reg_no) ? oVehicle.vehicle_reg_no : "NOT FOUND",
					message: `FAILED! Vehicle ${(oVehicle && oVehicle.vehicle_reg_no) ? oVehicle.vehicle_reg_no + " is not available for trip." : ' not found.'}`
				};
				aResponse.push(message);
			}
		}
		//send response

		res.status(200).json({status: "OK", "messages": aResponse});
	} catch (err) {
		winston.error(err.message || err.toString());
		next(err);
	}
}

async function createEmptyTrip(req, res, next) {
	try {

		if (moment(req.body.tripStartDate).isAfter(moment())) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Trip start date can\'t be set to future.'
			});
		}

		if (req.body.tripEndDate && moment(req.body.tripEndDate).isAfter(moment())) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Trip end date can\'t be set to future.'
			});
		}

		if (req.body.tripEndDate && moment(req.body.tripEndDate).isBefore(moment(req.body.tripStartDate))) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Trip end date can\'t be before trip start date.'
			});
		}

		/*const foundTrips = await Trip.findByVehicleWithin({
			clientId: req.user.clientId,
			vehicle: req.body.vehicle,
			start: req.body.tripStartDate,
			end: req.body.tripEndDate || new Date(),
		});*/

		const foundTrips = await Trip.find({
			clientId: req.user.clientId,
			vehicle: req.body.vehicle,
			status: {$in: ['Trip not started', 'Trip started', 'Trip ended']},
			allocation_date: {
				$gte: new Date(req.body.tripStartDate),
				$lte: (req.body.tripEndDate && new Date(req.body.tripEndDate)) || new Date()
			}
		});
		if (Array.isArray(foundTrips) && foundTrips.length > 0) {
			return res.status(500).json({
				status: 'ERROR',
				message: `${req.body.vehicle_no} is already on some trips in the specified timeframe.\nFound :- ${foundTrips.map(t => `Trip #${t.trip_no}`).join(', ')}`,
			});
		}
		const foundVehicle = await RegisteredVehicleModel.findById(req.body.vehicle);
		let emptyTripStartGPS, emptyTripEndGPS;
		if (foundVehicle && foundVehicle.device_imei) {
			emptyTripStartGPS = await locationService.getOdometerAsync({
				device_imei: foundVehicle.device_imei,
				datetime: new Date(req.body.tripStartDate).getTime()
			});
			if (req.body.tripEndDate)
				emptyTripEndGPS = await locationService.getOdometerAsync({
					device_imei: foundVehicle.device_imei,
					datetime: new Date(req.body.tripEndDate).getTime()
				});
		}
		// GET GPSData of that vehicle when the trip was started and ended
		/*		if(!emptyTripStartGPS ||  !emptyTripStartGPS.odo)
                    emptyTripStartGPS = await GPSDataUtils.findGPSDataByTime(req.body.vehicle_no, req.body.tripStartDate, {window: 3})[0];
                if(!emptyTripEndGPS ||  !emptyTripEndGPS.odo)
                    emptyTripEndGPS = req.body.tripEndDate && await GPSDataUtils.findGPSDataByTime(req.body.vehicle_no, req.body.tripEndDate, {window: 3})[0];
        */
		// GET vehicle for its current status
		if (emptyTripStartGPS instanceof Array) {
			if (emptyTripStartGPS[0]) {
				emptyTripStartGPS = emptyTripStartGPS[0];
			} else {
				emptyTripStartGPS = undefined;
			}
		}
		if (emptyTripEndGPS instanceof Array) {
			if (emptyTripEndGPS[0]) {
				emptyTripEndGPS = emptyTripEndGPS[0];
			} else {
				emptyTripEndGPS = undefined;
			}
		}

		let routeObj = {};
		if(req.clientConfig.config && req.clientConfig.config.booking && req.clientConfig.config.booking.showGoogleRoute){
			routeObj = {
				ld: req.body.ld,
				uld: req.body.uld,
				rName: req.body.rName,
				rKm: req.body.rKm,
			}
		}else{
			routeObj = {
				route: req.body.route,
				route_name: req.body.route_name,
			}
		}

		if ((foundVehicle.status === 'Booked' || foundVehicle.status === 'In Trip' || foundVehicle.status === 'Available') && req.body.tripEndDate) {
			const tripBeforeEmptyTripStart = await Trip.find({
				clientId: req.user.clientId,
				vehicle: req.body.vehicle,
				allocation_date: {
					$lt: new Date(req.body.tripStartDate),
				}
			}).sort({allocation_date: -1}).limit(1);

			const emptyTrip = await Trip.create({
				...routeObj,
				allocation_date: req.body.tripStartDate,
				driver: req.body.driver,
				clientId: req.user.clientId,
				created_by: req.user._id,
				vehicle: foundVehicle._id,
				vehicle_no: foundVehicle.vehicle_reg_no,
				segment_type: foundVehicle.segment_type,
				branch: tripBeforeEmptyTripStart && tripBeforeEmptyTripStart[0] && tripBeforeEmptyTripStart[0].branch && tripBeforeEmptyTripStart[0].branch._id,
				lastTrip: tripBeforeEmptyTripStart && tripBeforeEmptyTripStart[0] && tripBeforeEmptyTripStart[0]._id,
				category: 'Empty',
				status: 'Trip ended',
				start_date : req.body.tripStartDate,
		    	end_date : req.body.tripEndDate,
				startOdo : req.body.startOdo,
				endOdo : req.body.endOdo,
				statuses: [
					{
						user_id: req.user._id,
						user_full_name: req.user.full_name,
						date: req.body.tripStartDate,
						systemDate: new Date(),
						status: 'Trip started',
						gpsData: emptyTripStartGPS || {}
					},
					{
						user_id: req.user._id,
						user_full_name: req.user.full_name,
						date: req.body.tripEndDate,
						systemDate: new Date(),
						status: 'Trip ended',
						gpsData: emptyTripEndGPS || {}
					},
				],
			});
			return res.status(201).json({
				status: 'SUCCESS',
				message: `Empty trip created on this vehicle ${req.body.vehicle_no}`
			});
		}

		if ((foundVehicle.status === 'Booked' || foundVehicle.status === 'In Trip') && !req.body.tripEndDate) {
			const latestTripOnThisVehicle = await Trip.findOneAndUpdate(
				{
					clientId: req.user.clientId,
					vehicle: req.body.vehicle,
					status: {$in: ['Trip not started', 'Trip started']}
				},
				{
					$set: {status: 'Trip ended', category: 'Loaded', end_date : req.body.tripStartDate},
					$push: {
						statuses: {
							user_id: req.user._id,
							user_full_name: req.user.full_name,
							date: req.body.tripStartDate,
							systemDate: new Date(),
							status: 'Trip ended',
							gpsData: emptyTripStartGPS || {}
						}
					}
				},
				{new: true}
			);
			if (!latestTripOnThisVehicle) {
				return res.status(201).json({
					status: 'ERROR',
					message: `No live trip found on vehicle ${req.body.vehicle_no}. Please provide Empty trip end date`
				});
			}
			const emptyTrip = await Trip.create({
				...routeObj,
				allocation_date: req.body.tripStartDate,
				driver: req.body.driver,
				clientId: req.user.clientId,
				created_by: req.user._id,
				vehicle: foundVehicle._id,
				vehicle_no: foundVehicle.vehicle_reg_no,
				segment_type: foundVehicle.segment_type,
				lastTrip: latestTripOnThisVehicle._id,
				branch: latestTripOnThisVehicle.branch,
				category: 'Empty',
				status: 'Trip started',
				start_date: req.body.tripStartDate,
				startOdo : req.body.startOdo,
				statuses: [
					{
						user_id: req.user._id,
						user_full_name: req.user.full_name,
						date: req.body.tripStartDate,
						systemDate: new Date(),
						status: 'Trip started',
						gpsData: emptyTripStartGPS || {}
					}
				],
			});
			const updatedVehicle = await RegisteredVehicleModel.findOneAndUpdate(
				{_id: req.body.vehicle},
				{
					$set: {
						status: 'Empty Trip',
						last_known: {
							status: "Empty Trip",
							datetime: new Date(),
							trip: emptyTrip._id,
							trip_no: emptyTrip.trip_no,
							trip_name: emptyTrip.route_name || emptyTrip.rName,
						}
					}
				},
				{new: true}
			);
			return res.status(201).json({
				status: 'SUCCESS',
				message: `Empty trip created on this vehicle ${req.body.vehicle_no}`
			});
		}

		if ((foundVehicle.status === 'Available') && !req.body.tripEndDate) {
			const lastKnownTrip = await Trip.findById(foundVehicle.last_known.trip);
			if (lastKnownTrip) {
				const tripCancelledStatus = lastKnownTrip.statuses.find(s => s.status === 'Trip cancelled');
				const tripEndStatus = lastKnownTrip.statuses.find(s => s.status === 'Trip ended');
				if (!tripCancelledStatus && tripEndStatus && (moment(req.body.tripStartDate) < moment(tripEndStatus.date))) {
					return res.status(200).json({
						status: 'ERROR',
						message: 'Empty trip start date must be greater than last trip end date ' + tripEndStatus.date,
					});
				}
			}
			const emptyTrip = await Trip.create({
				...routeObj,
				clientId: req.user.clientId,
				created_by: req.user._id,
				allocation_date: req.body.tripStartDate,
				driver: req.body.driver,
				branch: lastKnownTrip && lastKnownTrip.branch,
				lastTrip: lastKnownTrip && lastKnownTrip._id,
				vehicle: foundVehicle._id,
				vehicle_no: foundVehicle.vehicle_reg_no,
				segment_type: foundVehicle.segment_type,
				category: 'Empty',
				status: 'Trip started',
				start_date: req.body.tripStartDate,
				startOdo : req.body.startOdo,
				statuses: [
					{
						user_id: req.user._id,
						user_full_name: req.user.full_name,
						date: req.body.tripStartDate,
						systemDate: new Date(),
						status: 'Trip started',
						gpsData: emptyTripStartGPS || {}
					}
				],
			});
			const updatedVehicle = await RegisteredVehicleModel.findOneAndUpdate(
				{_id: req.body.vehicle},
				{
					$set: {
						status: 'Empty Trip',
						last_known: {
							status: "Empty Trip",
							datetime: new Date(),
							trip: emptyTrip._id,
							trip_no: emptyTrip.trip_no,
							trip_name: emptyTrip.route_name || emptyTrip.rName,
						}
					}
				},
				{new: true}
			);
			return res.status(200).json({
				status: 'SUCCESS',
				message: `Empty trip created on vehicle ${req.body.vehicle_no}`,
			});
		}

		return res.status(500).json({
			status: 'ERROR',
			message: 'Empty trip can\'t be created on this vehicle'
		});

	} catch (err) {
		return next(err);
	}
}

async function addGR(req, res, next) {
	try {
		let oTrip = req.body.trip;
		let aGR = (Array.isArray(oTrip.gr) && oTrip.gr.length > 0) ? oTrip.gr : [];
		delete oTrip.gr;
		let savedTrip = await Trip.findOne({_id: oTrip._id}, {vehicle: 1, trip_no: 1, gr: 1, category: 1}).populate(
			{path: 'gr', model: GR, select: {grDate: 1, customer: 1, branch: 1, booking: 1}})
		// .populate(
		// {
		// 	path: 'gr', model: GR, select: {customer: 1},
		// 	populate: {path: 'customer', select: {_id: 1}}
		// })
		// .populate(
		// {
		// 	path: 'gr', model: GR, select: {branch: 1},
		// 	populate: {path: 'branch', select: {_id: 1}}
		// })
			.populate(
				{
					path: 'vehicle', model: 'RegisteredVehicle', select: {vehicle_reg_no: 1},
				}).lean();

		if(savedTrip.category != "Loaded")
			throw new Error('Gr can only be added on Loaded Trip');

		let aGR_id = [];
		for (let oGR of aGR) {
			let provBill = [];
			let grKeysToCopy = {
				clientId: req.user.clientId,
				gr_type: 'Own',
				grDate: savedTrip.gr && savedTrip.gr[0] && savedTrip.gr[0].grDate,
				created_by: req.user._id,
				created_by_full_name: req.user.full_name,
				customer: savedTrip.gr && savedTrip.gr[0] && savedTrip.gr[0].customer,
				branch: savedTrip.gr && savedTrip.gr[0] && savedTrip.gr[0].branch,
				booking: savedTrip.gr && savedTrip.gr[0] && savedTrip.gr[0].booking,
				trip: savedTrip._id,
				trip_no: savedTrip.trip_no,
				vehicle: savedTrip.vehicle._id,
				vehicle_no: savedTrip.vehicle.vehicle_reg_no,
				status: oGR.status || 'GR Not Assigned',
				statuses: oGR.statuses || [],
				geofence_points: Array.isArray(oGR.geofence_points) && oGR.geofence_points.map(o => {
					let obj = {...o};
					delete o._id;
					return obj;
				}) || []
			};

			//Add Trip GR
			const newGR = new GR(grKeysToCopy);
			let savedGR = await newGR.save();
			aGR_id.push(savedGR._id);
		}
		let updateTrip = await Trip.updateOne({_id: savedTrip._id}, {$set: {gr: [...savedTrip.gr, ...aGR_id]}});
		let tripData = await Trip.findOne({_id: savedTrip._id, populateGR: true});

		return res.status(200).json({
			status: 'Success',
			message: 'GR added successfully',
			data: tripData
		});

	} catch (err) {
		next(err);
	}
}

async function genMultiGr(req, res, next) {
	try {
		let oTrip = req.body.trip;
		if (!oTrip._id)
			throw new Error('Mandatory fields are required');
		if (!oTrip.gr)
			throw new Error('Mandatory fields are required');
		if (!oTrip.grId)
			throw new Error('Mandatory fields are required');
		if (!oTrip.grNumber)
			throw new Error('Mandatory fields are required');

		let aGR = (Array.isArray(oTrip.gr) && oTrip.gr.length > 0) ? oTrip.gr : [];
		delete oTrip.gr;
		let savedTrip = await Trip.findOne({_id: oTrip._id}, {vehicle: 1, trip_no: 1, gr: 1}).populate(
			{path: 'gr', model: GR, select: {grDate: 1, grNumber: 1, customer: 1, branch: 1, booking: 1}})
			.populate(
				{
					path: 'vehicle', model: 'RegisteredVehicle', select: {vehicle_reg_no: 1},
				}).lean();
		// if(savedTrip.gr && savedTrip.gr.length>1)
		// 	throw new Error('can`t generate trip have more then one gr');

		if (oTrip.grId && oTrip.grNumber) {
			await GR.updateOne({_id: oTrip.grId}, {
				$set: {
					grNumber: oTrip.grNumber + '-01',
					invToBill: true,
				}
			});
		}

		let aGR_id = [];
		let count = 2;
		let num;
		for (let oGR of aGR) {
			if (count >= 10)
				num = '-' + count++;
			else
				num = '-0' + count++;

			let allowedClone = {
				...oGR,
				clientId: req.user.clientId,
				gr_type: 'Own',
				grNumber: oGR.grNumber + num,
				created_by: req.user._id,
				created_by_full_name: req.user.full_name,
				status: oGR.status || 'GR Not Assigned',
				statuses: oGR.statuses || [],
				invToBill: true,
				acknowledge: {
					status: false
				},
				basicFreight: 0,
				totalFreight: 0,
				totalCharges: 0,
				totalAmount: 0,
				totalChargesWithoutTax: 0,
				geofence_points: Array.isArray(oGR.geofence_points) && oGR.geofence_points.map(o => {
					let obj = {...o};
					delete o._id;
					return obj;
				}) || []
			};
			if (allowedClone) {
				delete allowedClone.moneyReceipt,
					delete allowedClone.invoices,
					delete allowedClone.in,
					delete allowedClone.charges,
					delete allowedClone.bills,
					delete allowedClone.provisionalBill,
					delete allowedClone.supplementaryBill,
					delete allowedClone.supplementaryBillRef,
					delete allowedClone.selectedSupply
			}


			//Add Trip GR
			const newGR = new GR(allowedClone);
			let savedGR = await newGR.save();
			aGR_id.push(savedGR._id);
		}
		let updateTrip = await Trip.updateOne({_id: savedTrip._id}, {$set: {gr: [...savedTrip.gr, ...aGR_id]}});
		let tripData = await Trip.findOne({_id: savedTrip._id, populateGR: true});

		return res.status(200).json({
			status: 'Success',
			message: 'GR added successfully',
			data: tripData
		});

	} catch (err) {
		next(err);
	}
}

async function revertMultiGr(req, res, next) {
	try {
		let tripId = req.params._id;
		let grNumber = req.body.grNumber;
		if (grNumber) {
			grNumber = grNumber.slice(0, -3);
		}
		if (!tripId)
			throw new Error('Mandatory fields are required');
		if (!grNumber)
			throw new Error('Mandatory fields are required');

		let savedTrip = await Trip.findOne({_id: tripId}, {vehicle: 1, trip_no: 1, gr: 1}).populate(
			{
				path: 'gr',
				model: GR,
				select: {grDate: 1, grNumber: 1, customer: 1, branch: 1, booking: 1, bill: 1, provisionalBill: 1}
			})
			.populate(
				{
					path: 'vehicle', model: 'RegisteredVehicle', select: {vehicle_reg_no: 1},
				}).lean();
		if (savedTrip.gr && !savedTrip.gr.length)
			throw new Error('gr Not found');

		let aGR = savedTrip.gr;

		let count = 1;
		let num;
		for (let oGR of aGR) {
			if (count >= 10)
				num = '-' + count;
			else
				num = '-0' + count;
			if (oGR.grNumber === (grNumber + num)) {
				count++;
				if ((oGR.bill || (oGR.provisionalBill && oGR.provisionalBill.ref && oGR.provisionalBill.ref.length)))
					throw new Error('bill already genereted can not revert');
			}
		}


		let aGR_id = [];
		count = 2;
		for (let oGR of aGR) {
			if (count >= 10)
				num = '-' + count;
			else
				num = '-0' + count;
			if (oGR.grNumber === (grNumber + '-01')) {
				let grNo = (grNumber + '-01');
				await GR.updateOne({grNumber: grNo}, {
					$set: {
						grNumber: grNumber,
						invToBill: false,
					}
				});
			} else if (oGR.grNumber === (grNumber + num)) {
				aGR_id.push(oGR._id);
				let grNo = (grNumber + num);
				await GR.remove({grNumber: grNo});
				count++;
			}

		}
		let updateTrip = await Trip.updateOne({_id: savedTrip._id}, {$pull: {gr: [...aGR_id]}});
		let grData = await GR.find({trip_no: savedTrip.trip_no});

		return res.status(200).json({
			status: 'Success',
			message: 'GR Revert successfully',
			data: grData
		});

	} catch (err) {
		next(err);
	}
}

// Trip Detail Report - made by harikesh dated: 10/10/2019

const tripReportDetail = async (req, res, next) => {
	let skip = (req.body.all) ? 1 : req.body.skip ? req.body.skip : 1;
	let no_of_docs = 20000; //req.body.all ? Number.MAX_SAFE_INTEGER : req.body.no_of_docs ? +req.body.no_of_docs : 10;
	let oFil = constructFilters(req.body, true);

	const aggrQuery = [
		{
			$addFields: {
				'trip_start_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Trip started']}
						}
					}, 0]
				},
				'trip_end_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Trip ended']}
						}
					}, 0]
				},
			}
		},
		{
			$match: oFil
		},
		{
			$sort: {_id: 1}
		},
		/*{
			$skip: ((no_of_docs * skip) - no_of_docs)
		},*/
		{
			$limit: no_of_docs
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
			$unwind: {
				path: '$vehicle',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$match: {
				vehicle: {
					$exists: true
				}
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
			$unwind: {
				path: '$driver',
				preserveNullAndEmptyArrays: true
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
			$unwind: {
				path: '$route',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'vendortransports',
				localField: 'vendor',
				foreignField: '_id',
				as: 'vendor'
			}
		},
		{
			$unwind: {
				path: '$vendor',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'branches',
				localField: 'branch',
				foreignField: '_id',
				as: 'branch'
			}
		},
		{
			$unwind: {
				path: '$branch',
				preserveNullAndEmptyArrays: true
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
			$unwind: {
				path: '$gr',
				preserveNullAndEmptyArrays: true
			}
		},
		/*{
			$match: constructGRFilters(req.body)
		},*/
		{
			$lookup: {
				from: 'customers',
				localField: 'gr.customer',
				foreignField: '_id',
				as: 'gr.customer'
			}
		},
		{
			$unwind: {
				path: '$gr.customer',
				preserveNullAndEmptyArrays: true
			}
		},
		// {
		// 	$lookup: {
		// 		from: 'consignor_consignees',
		// 		localField: 'gr.consignor',
		// 		foreignField: '_id',
		// 		as: 'gr.consignor'
		// 	}
		// },
		// {
		// 	$unwind: {
		// 		path: '$gr.consignor',
		// 		preserveNullAndEmptyArrays: true
		// 	}
		// },
		{
			"$group": {
				"_id": "$_id",
				'trip': {$first: '$$ROOT'},
				"gr": {"$push": "$gr"}
			}
		},
		{
			$addFields: {
				'trip.gr': "$gr"
			}
		},
		{
			$replaceRoot: {newRoot: "$trip"}
		}];
	// aggrQuery End


	aggrQuery.push({
		$project: {
			'trip_start_status.date': true,
			'gr.customer.name': true,
			'route_name': true,
			'vehicle_no': true,
			'vendor.name': true,
			'driver.prim_contact_no': true,
			'vendor.prim_contact_no': true,
			'status': true,
			"vehicle.mTrack.address": 1,
			"vehicle.mTrack.datetime": 1,
		}
	});

	//let data = await Trip.aggregate(aggrQuery).allowDiskUse(true);
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};

	let data = await serverSidePage.requestData(Trip, oQuery);

	if (req.body.download === 'onTripDetail') {
		ReportExelService.reportTripDetail(data, req.user.clientId, function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "report download available.",
				"url": data.url
			});
		});
	} else {
		return res.status(200).json({
			status: 'SUCCESS',
			message: 'trips found',
			data
		});
	}
};

//end
/********************Ritika Raj********************/
const tripRecoVehicleReports = async (req, res, next) => {

	try {
		//console.log('ritika', req.body);
		let oFil = constructFilters(req.body, true);
		//console.log("oFil", oFil)
		let prjTrip = {
			'_id': true,
			'vendorDeal': true,
			'branch': true,
			'vehicle_no': true,
			'trip_no': true,
			'vendorPan': true,
			'vendor': true,
			'remarks': true,
			'ownershipType': true,
			'advanceBudget': true,
			'allocation_date': true,
			'vehicle': true  //vehicle
		}
		//console.log("qqqqq", prjTrip)
		const aggrQuery = [
			{
				$match: oFil
			},
			{
				$sort: {
					_id: -1
				}
			}
		]
		//console.log("aggrQuery1", aggrQuery)
		aggrQuery.push(
			{
				$project: prjTrip
			},
			{
				$group: {
					_id: '$vehicle',
					'trips': {$push: '$$ROOT'}
				}
			}
		)
		//console.log("aggrQuery2", aggrQuery)
		let prjTripRe = {};
		prjTripRe['_id'] = 1;
		prjTripRe['trips._id'] = 1;
		prjTripRe['trips.trip_no'] = 1;
		prjTripRe['trips.vehicle_no'] = 1;
		prjTripRe['trips.vendorPan'] = 1;
		prjTripRe['trips.remarks'] = 1;
		prjTripRe['trips.branch'] = 1;
		prjTripRe['trips.allocation_date'] = 1;
		prjTripRe['trips.ownershipType'] = 1;
		prjTripRe['trips.advanceBudget'] = 1;
		prjTripRe['trips.vendorDeal'] = 1;
		prjTripRe['trips.vehicle'] = 1;

		prjTrip = {}; // Delete Previous objects

		aggrQuery.push(
			{$project: prjTripRe},
			{
				"$lookup": {
					"from": "registeredvehicles",
					"localField": "_id",
					"foreignField": "_id",
					"as": "vehicleDetails"
				}
			},
			{
				"$unwind": {
					"path": "$vehicleDetails",
					"preserveNullAndEmptyArrays": true
				}
			},
		);
		// console.log("final data", aggrQuery)
		prjTripRe["vehicleDetails.vehicleId"] = 1;
		prjTripRe['vendorDetail.vehicle_reg_no'] = 1;
		// console.log("final data", prjTripRe)
		aggrQuery.push(
			{$project: prjTripRe},
			{
				$unwind: {
					path: '$trips',
					preserveNullAndEmptyArrays: true
				}
			}
		);
		//console.log("final data", aggrQuery)

		// unwind tripVehicle

		aggrQuery.push(
			{
				"$lookup": {
					"from": "registeredvehicles",
					"localField": "trips.vehicle",
					"foreignField": "_id",
					"as": "tripsVehicle"
				}
			},
			{
				"$unwind": {
					"path": "$tripsVehicle",
					"preserveNullAndEmptyArrays": true
				}
			});
		//console.log('ritika', aggrQuery)
		aggrQuery.push(
			{
				"$lookup": {
					"from": "branches",
					"localField": "trips.branch",
					"foreignField": "_id",
					"as": "trips.branch"
				}
			},
			{
				"$unwind": {
					"path": "$trips.branch",
					"preserveNullAndEmptyArrays": true
				}
			});

		aggrQuery.push(
			{
				"$lookup": {
					"from": "tripadvances",
					"localField": "trips.advanceBudget",
					"foreignField": "_id",
					"as": "trips.advanceBudget"
				}
			},
			{
				"$unwind": {
					"path": "$trips.advanceBudget",
					"preserveNullAndEmptyArrays": true
				}
			});
		//console.log('ritika', aggrQuery)
		aggrQuery.push({
			$project: {
				"_id": 1,
				"trips._id": 1,
				"trips.trip_no": 1,
				"trips.vehicle_no": 1,
				"trips.vendorPan": 1,     ////
				"trips.remark": 1,    ////
				"trips.allocation_date": 1,
				"trips.ownershipType": 1,
				"trips.vendorDeal": 1,
				"trips.vehicle": 1,
				"trips.branch": 1,
				"trips.advanceBudget": 1,
				"vehicleDetails.vehicleId": 1,
				"vehicleDetails.vehicle_reg_no": 1,
			}
		});

		//console.log("final data", aggrQuery)
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};
		let tripData = await serverSidePage.requestData(Trip, oQuery);

		// console.log(tripData)
		ReportExelService.tripRecoReportDownload(tripData, req.user, {}, function (d) {
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Trip Reco Report Downloaded ',
				data: d.url
			});
		});
	} catch (e) {
		console.log(e);
		return res.status(500).json({
			status: "ERROR",
			message: err.toString()
		});
	}


};
/********************Ritika Raj/end********************/

// Reco Report - Harikesh : dated: 31-10-2019

const tripRecoReports = async (req, res, next) => {
	console.log(req.body);
	let skip = (req.body.all) ? 1 : req.body.skip ? req.body.skip : 1;
	let no_of_docs = req.body.all ? Number.MAX_SAFE_INTEGER : req.body.no_of_docs ? +req.body.no_of_docs : 10;
	let oFil = constructFilters(req.body, true);

	let prjTrip = {
		'_id': true,
		'vendorDeal': true,
		'branch': true,
		'vehicle_no': true,
		'trip_no': true,
		'vendorPan': true,
		'vendor': true,
		'remarks': true,
		'ownershipType': true,
		'advanceBudget': true,
		'allocation_date': true,
		'gr': true,
		'route_name': true
	};


	const aggrQuery = [
		{
			$match: oFil
		},
		{
			$sort: {_id: -1}
		},
		//{$limit: 1000},
	];
	// Prject ...

	// END
	aggrQuery.push(
		{$project: prjTrip},
		{
			$group: {
				_id: '$vendor',
				'trips': {$push: '$$ROOT'}
			}
		});

	let prjTripRe = {};
	prjTripRe['_id'] = 1;
	prjTripRe['trips._id'] = 1;
	prjTripRe['trips.trip_no'] = 1;
	prjTripRe['trips.vehicle_no'] = 1;
	prjTripRe['trips.vendorPan'] = 1;
	prjTripRe['trips.remarks'] = 1;
	prjTripRe['trips.branch'] = 1;
	prjTripRe['trips.allocation_date'] = 1;
	prjTripRe['trips.ownershipType'] = 1;
	prjTripRe['trips.advanceBudget'] = 1;
	prjTripRe['trips.vendorDeal'] = 1;
	prjTripRe['trips.gr'] = 1;
	prjTripRe['trips.route_name'] = 1;

	prjTrip = {}; // Delete Previous objects

	aggrQuery.push(
		{$project: prjTripRe},
		{
			$lookup: {
				from: 'vendortransports',
				localField: '_id',
				foreignField: '_id',
				as: 'vendorDetail'
			}
		},
		{
			$unwind: {
				path: '$vendorDetail',
				preserveNullAndEmptyArrays: true
			}
		}
	);

	prjTripRe['vendorDetail.name'] = 1;
	prjTripRe['vendorDetail.pan_no'] = 1;

	aggrQuery.push(
		{$project: prjTripRe},
		{
			$unwind: {
				path: '$trips',
				preserveNullAndEmptyArrays: true
			}
		}
	);

	// unwind tripadvance

	aggrQuery.push(
		{
			$lookup: {
				from: 'vendortransports',
				localField: 'trips.vendor',
				foreignField: '_id',
				as: 'trips.vendor'
			}
		},
		{
			$unwind: {
				path: '$trips.vendor',
				preserveNullAndEmptyArrays: true
			}
		});

	aggrQuery.push(
		{
			$lookup: {
				from: 'branches',
				localField: 'trips.branch',
				foreignField: '_id',
				as: 'trips.branch'
			}
		},
		{
			$unwind: {
				path: '$trips.branch',
				preserveNullAndEmptyArrays: true
			}
		});

	aggrQuery.push(
		{
			$lookup: {
				from: 'tripadvances',
				localField: 'trips.advanceBudget',
				foreignField: '_id',
				as: 'trips.advanceBudget'
			}
		},
		{
			$unwind: {
				path: '$advanceBudget',
				preserveNullAndEmptyArrays: true
			}
		});

	aggrQuery.push(
		{
			$lookup: {
				from: 'tripgrs',
				localField: 'trips.gr',
				foreignField: '_id',
				as: 'trips.gr'
			}
		},
		// {
		// 	$unwind: {
		// 		path: '$trips.gr',
		// 		preserveNullAndEmptyArrays: true
		// 	}
		// }
		);

	aggrQuery.push({
		$project: {
			'_id': true,
			'trips._id': true,
			'vendorDetail.name': true,
			'vendorDetail.pan_no': true,
			'trips.branch.name': true,
			'trips.vehicle_no': true,
			'trips.vendorDeal': true,
			'trips.trip_no': true,
			'trips.vendorPan': true,
			'trips.remarks': true,
			'trips.ownershipType': true,
			'trips.advanceBudget': true,
			'trips.allocation_date': true,
			'trips.gr': true,
			'trips.route_name': true
		}
	});

	/************By Harikesh - dated: 11/01/2019 ***********/

		//let tripData = await  Trip.aggregate(aggrQuery).allowDiskUse(true);

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};
	let tripData = await serverSidePage.requestData(Trip, oQuery);

	ReportExelService.tripRecoReportDownload(tripData, req.user, {}, function (d) {
		return res.status(200).json({
			status: "SUCCESS",
			message: 'Trip Reco Report Downloaded ',
			url: d.url
		});
	});
};
// END

const vehMonthlyPerformanceRpt = async (req, res, next) => {

	let skip = (req.body.all) ? 1 : req.body.skip ? req.body.skip : 1;
	let no_of_docs = 10;
	if(req.body.no_of_docs){
		no_of_docs = req.body.no_of_docs;
	}
	if(req.body.all){//TODO need to remove it once query is optimized or local server is created
		no_of_docs = 30000;
	}
	//let no_of_docs = req.body.all ? Number.MAX_SAFE_INTEGER : req.body.no_of_docs ? req.body.no_of_docs : 10;
	let oFil = constructFiltersforCache(req.body, true);
	oFil.clientId = req.body.clientId;
	let vehicleQuery = {};
	if(req.body.owner_group){
		if(req.body.owner_group instanceof Array){
			vehicleQuery['vehicle.fleet'] = {$in:req.body.owner_group};
		}
		else{
			vehicleQuery['vehicle.fleet'] = req.body.owner_group;

		}
	}

	const aggrQuery = [];
	aggrQuery.push({
		$match: oFil
	});

	// aggrQuery.push(

		// {
		// 	$lookup: {
		// 		from: 'tripgrs',
		// 		localField: 'gr',
		// 		foreignField: '_id',
		// 		as: 'gr'
		// 	}
		// },
		// {
		// 	$lookup: {
		// 		from: 'tripadvances',
		// 		localField: 'advanceBudget',
		// 		foreignField: '_id',
		// 		as: 'advanceBudget'
		// 	}
		// },
		// {
		// 	$lookup: {
		// 		from: 'tripsexpenses',
		// 		localField: 'trip_expenses',
		// 		foreignField: '_id',
		// 		as: 'trip_expenses'
		// 	}
		// });

	aggrQuery.push({
		$project: {
			'vehicle.vehicle_no': true,
			'vehicle.fleet': true,
			'vehicle.segment': true,
			'advanceBudget': true,
			'trip_expenses': true,
			'gr': true,
			// 'gr.totalFreight': true,
			'totFreight': {$sum: '$gr.totalFreight'},
			'basicFreight': {$sum: '$gr.basicFreight'},
			'totAdv': {$sum: '$advanceBudget.amount'},
			'totExp': {$sum: '$trip_expenses.amount'},
		}
	},
			{
				$group: {
					_id: '$vehicle.vehicle_no',
					fleet: {$first:"$vehicle.fleet"},
					segment: {$first:"$vehicle.segment"},
					// advanceBudget: {$push:"$advanceBudget"},
					// trip_expenses: {$push:"$trip_expenses"},
					// gr: {$push:"$gr"},
					totFreight: {$sum: '$totFreight'},
					basicFreight: {$sum: '$basicFreight'},
					totAdv: {$sum: '$totAdv'},
					totExp: {$sum: '$totExp'},
					count: {$sum: 1}
					// aData: {$push: '$$ROOT'}
				}
			}
	);


		//let data = await Trip.aggregate(aggrQuery).allowDiskUse(true);
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};
		let tripData = await serverSidePage.requestData(TripCache, oQuery); //tripv2

	ReportExelService.vehMonthlyPerformanceRpt(tripData, req.user.clientId, function (d) {
		return res.status(200).json({
			status: "SUCCESS",
			message: 'Report Downloaded ',
			url: d.url
		});
	});

};

const hirePaymentRpt = async (req, res, next) => {

	let skip = (req.body.all) ? 1 : req.body.skip ? req.body.skip : 1;
	let no_of_docs = 10;
	if(req.body.no_of_docs){
		no_of_docs = req.body.no_of_docs;
	}
	if(req.body.all){//TODO need to remove it once query is optimized or local server is created
		no_of_docs = 30000;
	}
	//let no_of_docs = req.body.all ? Number.MAX_SAFE_INTEGER : req.body.no_of_docs ? req.body.no_of_docs : 10;
	let oFil = constructFiltersforCache(req.body, true);
	oFil['vendorDeal.loading_slip'] =  {$exists:true};
	oFil.clientId = req.body.clientId;

	const aggrQuery = [];
	aggrQuery.push({
		$match: oFil
	});

	// aggrQuery.push(
	// 	{
	// 		$lookup: {
	// 			from: 'accounts',
	// 			localField: 'advanceBudget.from_account',
	// 			foreignField: '_id',
	// 			as: 'advanceBudget.from_account'
	// 		}
	// 	},
	// 	{
	// 		$unwind: {
	// 			path: '$advanceBudget.from_account',
	// 			preserveNullAndEmptyArrays: true
	// 		}
	// 	},
	// 	{
	// 		$lookup: {
	// 			from: 'accounts',
	// 			localField: 'advanceBudget.to_account',
	// 			foreignField: '_id',
	// 			as: 'advanceBudget.to_account'
	// 		}
	// 	},
	// 	{
	// 		$unwind: {
	// 			path: '$advanceBudget.to_account',
	// 			preserveNullAndEmptyArrays: true
	// 		}
	// 	}
	// 	);

	aggrQuery.push({
			$project: {
				'vendorDeal': true,
				'start_date': true,
				'end_date': true,
				'trip_no': true,
				'vehicle.vehicle_no': true,
				'vendor': true,
				'advanceBudget': true,
				'branch': true,
			}
		}
	);


	//let data = await Trip.aggregate(aggrQuery).allowDiskUse(true);
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};
	let tripData = await serverSidePage.requestData(TripCache, oQuery); //tripv2

	ReportExelService.hirePaymentRpt(tripData, req.user.clientId, function (d) {
		return res.status(200).json({
			status: "SUCCESS",
			message: 'Report Downloaded ',
			url: d.url
		});
	});

};

const tripReport = async (req, res, next) => {

	let hasTimeoutExecuted = false;
	let timer = setTimeout(() => {
		hasTimeoutExecuted = true;
		if (!res.headersSent) {
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}
	}, 1000 * 15);

	let skip = (req.body.all) ? 1 : req.body.skip ? req.body.skip : 1;
	let no_of_docs = 10;
	if(req.body.no_of_docs){
		no_of_docs = req.body.no_of_docs;
	}
	if(req.body.all){//TODO need to remove it once query is optimized or local server is created
		no_of_docs = 30000;
	}
	//let no_of_docs = req.body.all ? Number.MAX_SAFE_INTEGER : req.body.no_of_docs ? req.body.no_of_docs : 10;
	let oFil = constructFilters(req.body, true);

	let aCustomer = [];
	if(req.body.customer_id)
		aCustomer.push(req.body.customer_id);

	if(req.body['customer.category']){
		let oCustomer = await customerModel.find({category: {$in :req.body['customer.category']}});

		if(oCustomer){
			oCustomer.forEach(obj=>{
				aCustomer.push(obj._id);
			})
		}
	}

	if(aCustomer && aCustomer.length)
		req.body.customer_id = aCustomer;

	// if (req.body.tripSettleType) {
	// 	if (req.body.tripSettleType == 'Setteled')
	// 		oFil['markSettle.isSettled'] = true;
	// 	else
	// 		oFil['markSettle.isSettled'] = false;
	// }

	let sortQ = {};
	if (req.body.dateType == 'Trip Start' || req.body.dateType == 'Trip started') {
		sortQ = {"trip_end_status.date": -1};
	} else {
		sortQ = {_id: -1};
	}
	let oGRFil = constructGRFilters(req.body);
    if(req.body.grGenerated || req.body.grNotGenerated){
		oGRFil["gr.grNumber"] = req.body.grGenerated.grNumber;
	}
	const aggrQuery = [];
	aggrQuery.push({
		$match: oFil
	});
	if(Object.keys(oGRFil).length == 0){
		aggrQuery.push({
				$skip: ((no_of_docs * skip) - no_of_docs)
			},
			{
				$limit: no_of_docs
			});
	}
	aggrQuery.push({
			$addFields: {
				// 'gr': {$arrayElemAt: ['$gr', 0]},
				'trip_start_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Trip started']}
						}
					}, 0]
				},
				'trip_end_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Trip ended']}
						}
					}, 0]
				},
			}
		},
		/*
		{
			$match: oFil
		},
		 */
		{
			$lookup: {
				from: 'drivers',
				localField: 'driver',
				foreignField: '_id',
				as: 'driver'
			}
		},
		{
			$unwind: {
				path: '$driver',
				preserveNullAndEmptyArrays: true
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
			$unwind: {
				path: '$vehicle',
				preserveNullAndEmptyArrays: true
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
			$unwind: {
				path: '$route',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'vendortransports',
				localField: 'vendor',
				foreignField: '_id',
				as: 'vendor'
			}
		},
		{
			$unwind: {
				path: '$vendor',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'branches',
				localField: 'branch',
				foreignField: '_id',
				as: 'branch'
			}
		},
		{
			$unwind: {
				path: '$branch',
				preserveNullAndEmptyArrays: true
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
			$unwind: {
				path: '$gr',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$match: oGRFil
		});

	if (req.body.tripDocType && req.body.tripDocType.length > 0) {
		let aTripDt = req.body.tripDocType;
		aggrQuery.push(
			{
				"$addFields": {"tripStrId": {"$toString": "$_id"}},
			},
			{
				"$lookup": {
					"from": "datamanagements",
					"localField": "tripStrId",
					"foreignField": "linkToId",
					"as": "datamanagements"
				}
			},
			{
				"$match": {
					"datamanagements.files.category": {$nin: aTripDt}
				}
			});
	}
	if(req.body.download === "onTripAdvance" || req.body.download === "onTripSettle"){
		aggrQuery.push(

			{
				"$lookup": {
					"from": "bills",
					"localField": "gr.bills",
					"foreignField": "_id",
					"as": "bill"
				}
			},
			{
				'$addFields': {
					"bills": {
						$filter: {
							input: "$bill",
							cond:{  $ne: ["$$this.status", "Cancelled"] }}

					},
				}
			},
			{
				"$unwind": {
					"path": "$bills",
					"preserveNullAndEmptyArrays": true
				}
			},

		);
	}
	if(req.body.download === "onTripAdvance" || req.body.download === "onTripSettle"){
		aggrQuery.push(
			// {
			// 	$match:{
			// 		"gr.bills.0" : {$exists: true},
			// 	}
			// },

			{
				"$lookup": {
					"from": "billingparties",
					"localField": "gr.billingParty",
					"foreignField": "_id",
					"as": "billingParty"
				}
			},
			{
				"$unwind": {
					"path": "$billingParty",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				$lookup: {
					from: 'bookingv2',
					localField: 'gr.booking',
					foreignField: '_id',
					as: 'gr.booking'
				}
			},
			{
				$unwind: {
					path: '$gr.booking',
					preserveNullAndEmptyArrays: true
				}
			},
		);
	}
	aggrQuery.push(
		{
			$skip: ((no_of_docs * skip) - no_of_docs)
		},
		{
			$limit: no_of_docs
		},
		{
			$addFields: {
				'gr.loading_ended_status': {
					$arrayElemAt: [{
						$filter: {
							input: '$gr.statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Loading Ended']}
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
				}
			}
		},
		{
			$lookup: {
				from: 'customers',
				localField: 'gr.customer',
				foreignField: '_id',
				as: 'gr.customer'
			}
		},
		{
			$unwind: {
				path: '$gr.customer',
				preserveNullAndEmptyArrays: true
			}
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
		// {
		// 	"$lookup": {
		// 		"from": "tripadvances",
		// 		"localField": "suspenseAdv",
		// 		"foreignField": "_id",
		// 		"as": "suspenseAdv"
		// 	}
		// },
		// {
		// 	"$unwind": {
		// 		"path": "$suspenseAdv",
		// 		"preserveNullAndEmptyArrays": true
		// 	}
		// },
		{
			"$group": {
				"_id": "$_id",
				"avgRate":{ $push : { $avg : "$gr.invoices.rate"} },
				'trip': {$first: '$$ROOT'},
				"gr": {"$addToSet": "$gr"},
				// "sum_suspenseAdv" : {
				// 	"$sum" : "$suspenseAdv.amount"
				// }
			}
		},
		{
			"$addFields": {
				"trip.avgRate": "$avgRate"
			}
		},
		// {
		// 	"$addFields": {
		// 		"trip.sum_suspenseAdv": "$sum_suspenseAdv"
		// 	}
		// },
		{
			$addFields: {
				'trip.gr': "$gr"
			}
		},
		{
			$replaceRoot: {newRoot: "$trip"}
		},
		{
			$sort: sortQ
		}
	);

	if (req.body.download === "onTripAdvance" || req.body.download === "onTripSettle" || req.body.download === "onTrip") {
		aggrQuery.push({
			$lookup: {
				from: 'tripadvances',
				localField: 'advanceBudget',
				foreignField: '_id',
				as: 'advanceBudget'
			}
		},
			{
				"$lookup": {
					from: 'tripsexpenses',
					localField: 'trip_expenses',
					foreignField: '_id',
					as: 'trip_expenses'
				}
			},
			{
				"$lookup": {
					"from": "tripadvances",
					"localField": "suspenseAdv",
					"foreignField": "_id",
					"as": "suspenseAdv"
				}
			},
			);

		// ----

		if (req.body.vendPaymStatus) {

			aggrQuery.push({
					"$addFields": {
						"totalVM": {
							"$add":
								["$vendorDeal.totWithMunshiyana", "$vendorDeal.totalCharges"]
						},
					}
				},

				{
					"$addFields": {
						"vendorAdvancePaid": {
							"$reduce": {
								input: "$advanceBudget",
								initialValue: 0,
								in: {
									"$add": ["$$value", {"$ifNull": ["$$this.amount", 0]}]
								}
							}
						}
					}
				},

				{
					"$addFields": {
						"totSubsAmt": {
							"$add": ["$vendorAdvancePaid", "$vendorDeal.tdsAmount", "$vendorDeal.totalDeduction"]
						}
					}
				},

				{
					"$addFields": {
						"totRemAmt": {
							"$subtract": ["$totalVM", "$totSubsAmt"]
						}
					}
				});

			if (req.body.vendPaymStatus == 'Paid') {
				aggrQuery.push({$match: {"totRemAmt": 0, "totalVM": {$gt: 0}}});
			} else if (req.body.vendPaymStatus == 'Unpaid') {
				aggrQuery.push({
						$match: {
							$expr: {
								$and: [
									{
										$eq: [
											"$totRemAmt",
											"$totalVM"
										]
									},
									{
										$gt: [
											"$totalVM",
											0
										]
									}
								]
							}
						}
					}
				);
			} else if (req.body.vendPaymStatus == 'Balance Pending') {
				aggrQuery.push({$match: {"totRemAmt": {$gt: 0}}});
			} else if (req.body.vendPaymStatus == 'Over Paid') {
				aggrQuery.push({$match: {"totRemAmt": {$lt: 0}}});
			}
		}

		// ----

	}
	aggrQuery.push({
		$project: {
			'allocation_date': true,
			'segment_type': true,
			'created_at': true,
			'clientId': true,
			'trip_no': true,
			'documents': true,
			'status': true,
			'last_modified_at': true,
			'remark': true,
			'remarks': true,
			'vehicle': true,
			'category': true,
			'vehicle_no': true,
			'ownershipType': true,
			'advanceBudget': true,
			'suspenseAdv' : true,
			'trip_expenses': true,
			'driver.name': true,
			'driver.nameCode': true,
			//'branch':true,
			'branch.name': true,
			'driver.prim_contact_no': true,
			'route': true,
			'extraKm': true,
			'route_name': true,
			'rName': true,
			'rKm': true,
			'type': true,
			'vendor.name': true,
			'vendor.pan_no': true,
			'vendor.tdsRate': true,
			'vendor.clientId': true,
			'vendorDeal': true,
			'trip_start_status.user_full_name': true,
			'trip_start_status.date': true,
			'trip_end_status.user_full_name': true,
			'trip_end_status.date': true,
			'gr.consignor.name': true,
			'gr.consignee.name': true,
			'gr.customer.name': true,
			'gr.customer.category': true,
			'billingParty.name': true,
			'gr.internal_rate': true,
			'gr.loading_ended_status.date': true,
			'gr.unloading_ended_status.date': true,
			'gr.loading_started_status.date': true,
			'gr.unloading_started_status.date': true,
			"gr.pod.billingLoadingTime":true,
			"gr.pod.billingUnloadingTime":true,
			"gr.basicFreight":true,
			"gr.invoices":true,
			"avgRate" : true,
			'gr.grNumber': true,
			'gr.grDate': true,
			'gr.totalAmount': true,
			'gr.totalFreight': true,
			'gr.tMemo': true,
			'gr.booking.imd': true,
			'advSettled.tsNo': true,
			'bills.billDate': true,
			'bills.billNo': true,
			'bills.billAmount': true,
			"gr.acknowledge.source": true,
			"gr.acknowledge.destination": true,
			"imd":true,
			// "sum_suspenseAdv": true,
		}

	});
	if(req.body.downloadCSV && req.body.download === "onTripAdvance"){
		let downloadPath = await new csvDownload(Trip, aggrQuery, {
			filePath: `${req.user.clientId}/Trip_Performance`,
			fileName: `Trip_Performance_Report_${moment().format('DD-MM-YYYY')}`
		}).exec(tripSettlement.transform, req);

		if(hasTimeoutExecuted){
			await logsService.addLog('Trip_Performance_Report_', {
				uif: "Trip_Performance_Report_" + moment().format('DD-MM-YYYY hh:mm'),
				docId: req.user._id,
				category: 'Notification',
				delta: [],
				dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
				userId: req.user._id,
				subCategory: 'Trip Performance Report'
			}, req);
		}else {
			clearTimeout(timer);
			return res.status(200).json({
				status: "SUCCESS",
				message: 'report download available',
				url: downloadPath
			});
		}

	}


	// else if(!req.body.downloadCSV && req.body.download === "onTripAdvance" && req.body.tripHireOwnCSV){
	// 	let oQuery = {aggQuery: aggrQuery, no_of_docs: 20};
	//
	// 	let data = await serverSidePage.requestData(Trip, oQuery);
	//
	// 	 ReportExelService.tripHireOwnReports(data, req, onSuccess);
	// 	function onSuccess(d) {
	// 		return res.status(200).json({
	// 			status: "SUCCESS",
	// 			message: 'report download available',
	// 			url: d.url
	// 		});
	// 	}
	// }

	else if(!req.body.downloadCSV && req.body.download === "onTripAdvance" && req.body.tripHireOwnCSV){
		let downloadPath = await new csvDownload(Trip, aggrQuery, {
			filePath: `${req.user.clientId}/Trip_Performance`,
			fileName: `Trip_Performance_Report_${moment().format('DD-MM-YYYY')}`
		}).exec(tripPerfOwnVehicle.transform, req);

		if(hasTimeoutExecuted){
			await logsService.addLog('Trip_Performance_Report_', {
				uif: "Trip_Performance_Report_" + moment().format('DD-MM-YYYY hh:mm'),
				docId: req.user._id,
				category: 'Notification',
				delta: [],
				dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
				userId: req.user._id,
				subCategory: 'Trip Performance Report'
			}, req);
		}else {
			clearTimeout(timer);
			return res.status(200).json({
				status: "SUCCESS",
				message: 'report download available',
				url: downloadPath
			});
		}

	}
	else if(!req.body.downloadCSV && req.body.download === "onTripAdvance" && req.body.tripHireMarketCSV){
		let downloadPath = await new csvDownload(Trip, aggrQuery, {
			filePath: `${req.user.clientId}/Trip_Performance`,
			fileName: `Trip_Performance_Report_${moment().format('DD-MM-YYYY')}`
		}).exec(tripPerfMarketVehicle.transform, req);

		if(hasTimeoutExecuted){
			await logsService.addLog('Trip_Performance_Report_', {
				uif: "Trip_Performance_Report_" + moment().format('DD-MM-YYYY hh:mm'),
				docId: req.user._id,
				category: 'Notification',
				delta: [],
				dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
				userId: req.user._id,
				subCategory: 'Trip Performance Report'
			}, req);
		}else {
			clearTimeout(timer);
			return res.status(200).json({
				status: "SUCCESS",
				message: 'report download available',
				url: downloadPath
			});
		}

	}
	else if(req.body.downloadCSV && req.body.download === "onTripSettle"){
		let downloadPath = await new csvDownload(Trip,  aggrQuery, {
			filePath: `${req.user.clientId}/Trip_Settle`,
			fileName: `Trip_Settle_Report_${moment().format('DD-MM-YYYY')}`
		}).exec(tripSettlement.transform, req);

		if(hasTimeoutExecuted){
			await logsService.addLog('Trip_Settle_Report', {
				uif: "Trip_Settle_Report_" + moment().format('DD-MM-YYYY hh:mm'),
				docId: req.user._id,
				category: 'Notification',
				delta: [],
				dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
				userId: req.user._id,
				subCategory: 'Trip Settle Report'
			}, req);
		}else {
			clearTimeout(timer);
			return res.status(200).json({
				status: "SUCCESS",
				message: 'report download available',
				url: downloadPath
			});
		}
	}else {

		//let data = await Trip.aggregate(aggrQuery).allowDiskUse(true);
		aggrQuery.push({
			$sort:{'trip_no':1}
		})
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};

		let data = await serverSidePage.requestData(Trip, oQuery); //tripv2

		req.tableAcc = [];
		if (req.body.tableId) {
			let tableAcc = await tableAccessService.findTableAccessFilterAsync(req.body.tableId);
			if (tableAcc && tableAcc.length > 0) {
				req.tableAcc = tableAcc[0].access;
			}
		}

		if (req.body.fDownload === 'onTrip') {
			return res.status(200).json({
				"status": "OK",
				"message": "report download available.",
				"data": ReportExelService.commonTripReportsV2(data, req)
			});
		} else if (req.body.download === 'onTrip') {
			ReportExelService.commonTripReports(data, req, success);
			async function success(d) {
				if(hasTimeoutExecuted){
					await logsService.addLog('Trip_Report', {
						uif: "Trip_Report_" + moment().format('DD-MM-YYYY hh:mm'),
						docId: req.user._id,
						category: 'Notification',
						delta: [],
						dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
						userId: req.user._id,
						subCategory: 'Trip Report'
					}, req);
				}else {
					clearTimeout(timer);
					return res.status(200).json({
						status: "SUCCESS",
						message: 'report download available',
						url: d.url
					});
				}
			}

		}
		else if (req.body.download === "onTripAdvance") {
			data = Trip.eachTripSummary(data);
			if (data && data.length) {

				ReportExelService.commonTripReportsAdvance(data, req, success);

				async function success(d) {
					if(hasTimeoutExecuted){
						await logsService.addLog('Trip_Performance_Report_', {
							uif: "Trip_Performance_Report_" + moment().format('DD-MM-YYYY hh:mm'),
							docId: req.user._id,
							category: 'Notification',
							delta: [],
							dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
							userId: req.user._id,
							subCategory: 'Trip Performance Report'
						}, req);
					}else {
						clearTimeout(timer);
						return res.status(200).json({
							status: "SUCCESS",
							message: 'report download available',
							url: d.url
						});
					}
				};
			}
			else {
				console.error('some error in trip report');
				return res.status(500).json({
					"status": "OK",
					"message": "report download failed.",
					"data": data
				});
			}

		}
		else if (req.body.download === "onTripSettle") {
			data =  Trip.eachTripSummary(data);
			if (data && data.length) {
				ReportExelService.commonTripReportsAdvance(data, req, success);
				async function success(d) {
					if(hasTimeoutExecuted){
						await logsService.addLog('Trip_Settle_Report', {
							uif: "Trip_Settle_Report_" + moment().format('DD-MM-YYYY hh:mm'),
							docId: req.user._id,
							category: 'Notification',
							delta: [],
							dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
							userId: req.user._id,
							subCategory: 'Trip Settle Report'
						}, req);
					}else {
						clearTimeout(timer);
						return res.status(200).json({
							status: "SUCCESS",
							message: 'report download available',
							url: d.url
						});
					}
				}
			} else {
				console.error('some error in trip report');
				return res.status(500).json({
					"status": "OK",
					"message": "report download failed.",
					"data": data
				});
			}
		} else {
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'trips found',
				data
			});
		}
	}
};

async function get(req, res, next) {

	try {
		//The comma operator evaluates all of its operands and returns the value of the last (rightmost) one.
		//req.body = otherUtil.bindBranchFilter(req.body, "branch", req.user.branch);
		let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		//req.body.gr_query = constructGRFilters(req.body);
		oQuery.queryFilter = constructFilters(oQuery);
		if (req.body['vendor.clientId']) {
			oQuery.queryFilter.vendor_query = {clientId: req.body['vendor.clientId']};
		}

		if (req.body.tripSettleType) {
			if (req.body.tripSettleType == 'Setteled')
				oQuery.queryFilter['markSettle.isSettled'] = true;
			else
				oQuery.queryFilter['markSettle.isSettled'] = false;
		}

		//share trips to other clients for market vehicle only
		if (req.clientConfig && req.clientConfig.config && req.clientConfig.config.clientOps && req.body.clientId != req.clientConfig.config.clientOps) {
			delete oQuery.queryFilter.clientId;
			oQuery.queryFilter.$or = [{'clientId': req.clientConfig.config.clientOps}, {'clientId': req.body.clientId}];
			oQuery.queryFilter.ownershipType = 'Market';
		}
		if (req.body.all) {
			if (!req.body.from || !req.body.to || (calculateWorkingDays(req.body.to, req.body.from) > 31)) {
				return res.status(500).json({
					"status": "ERROR",
					"message": "from , to date missing or date range exceeds"
				});
			}
			oQuery.queryFilter.all = req.body.all;
		} else {
			if (req.body.dateType == 'Trip Start' || req.body.dateType == 'Trip started') {
				oQuery.sort = {"statuses.1.date": -1};
			} else {
				oQuery.sort = {_id: -1};
			}
		}

		let grProj = {
			_id: 1,
			status: 1,
			grNumber: 1,
			grDate: 1,
			'statuses.date': 1,
			'statuses.status': 1,
			'statuses.systemDate': 1,
			'statuses.user_full_name': 1,
			invoices: 1,
			'customer': 1,
			'consignor': 1,
			'consignee': 1,
			'branch': 1,
			'route': 1,
			acknowledge: 1,
			payment_basis: 1,
			payment_type: 1,
			eWayBills: 1,
			remarks: 1,
			pod: 1,
			gr_type: 1,
			coverNote: 1,
			internal_rate: 1,
			totalAmount: 1,
			totalFreight: 1,
			totalCharges: 1,
			pendingRemark: 1,
			expected_arrival: 1,
			documents: 1
		};
		oQuery.populate = [
			{
				path: 'gr',
				select: grProj,
				match: req.body.gr_query,
				//populate: { path: 'booking', match: req.body.booking_query }
			}];

		if (oQuery.queryFilter.vehicle_query) {
			oQuery.populate.push({
				path: 'vehicle',
				model: RegisteredVehicleModel,
				match: oQuery.queryFilter.vehicle_query,
				select: {
					'vehicle_reg_no': 1,
					'device_imei': 1,
					'driver_name': 1,
					'driver_license': 1,
					'driver_contact_no': 1,
					'driver': 1,
					'ownershipType': 1,
					'owner_group': 1,
					'veh_group_name': 1,
					'veh_type': 1,
					"current_budget": 1,
					"fasttag": 1,
					"dieselInVehicle": 1,
					"capacity_tonne": 1
				}
			});
		}

		if (oQuery.queryFilter.vendor_query) {
			oQuery.populate.push({
				path: 'vendor',
				model: VendorTransport,
				match: oQuery.queryFilter.vendor_query,
				select: {
					'name': 1, 'contact_person_name': 1, 'prim_contact_no': 1, 'email': 1,
					'banking_details': 1, pan_no: 1, "account": 1, "tdsRate": 1, 'documents': 1, 'clientId': 1
				}
			})
		}
		if (req.body.summary || req.body.download) {
			oQuery.populate.push({
				path: 'advanceBudget',
				model: TripAdvances,
				populate: [
					{path: 'voucher'},
					{path: 'from_account'},
					{path: 'to_account'},
					{path: 'dieseInfo.vendor', select: {name: 1}},
					{path: 'dieseInfo.station', select: {fuel_type: 1, address: 1}},
				]
			}, {
				path: 'payments',
			})
		}
		if (req.body.gr_query && req.body.gr_query.grNumber) {
			let oGR = await GR.findOne({
				grNumber: req.body.gr_query.grNumber.trim(),
				clientId: req.clientConfig && req.clientConfig.config && req.clientConfig.config.clientOps || req.body.clientId
			}, {trip: 1}).lean();
			if (oGR && oGR.trip) {
				oQuery.queryFilter._id = oGR.trip;
				delete oQuery.gr_query;
				delete oQuery.queryFilter.gr_query;
			}
		}

		if (req.body.vehicle_query && req.body.vehicle_query.veh_group_name) {
			let oVeh = await RegisteredVehicleModel.find({
				veh_group_name: req.body.vehicle_query.veh_group_name,
				clientId: req.clientConfig && req.clientConfig.config && req.clientConfig.config.clientOps || req.body.clientId
			}, {_id: 1}).lean();
			if (oVeh) {
				oQuery.queryFilter.vehicle = {$in: oVeh.map(o => o._id)};
				delete oQuery.vehicle_query;
				delete oQuery.queryFilter.vehicle_query;
			}
		}

		oQuery.allowedRef = ALLOWED_REFERENCED_GET;
		/*
		if (Object.keys(oQuery.queryFilter).length < 3) {
			let nDays = 1;
			let toDate = new Date();
			let fromDate = new Date();
			fromDate.setDate(toDate.getDate() - nDays);
			oQuery.queryFilter = {
				created_at: {$gte: fromDate}
			};
		}
		*/
		let aTrip = await Pagination(Trip, oQuery);
		if (req.clientConfig && req.clientConfig.config && req.clientConfig.config.clientOps && req.body.clientId != req.clientConfig.config.clientOps) {
			for (let i = 0; i < aTrip.data.length; i++) {
				if (!aTrip.data[i].vendor || (aTrip.data[i].vendor && aTrip.data[i].vendor.clientId != req.user.clientId)) {
					aTrip.data.splice(i, 1);
					i--;
				}
			}
		}

		if (req.body.summary || req.body.download) {
			aTrip.data =  Trip.eachTripSummary(aTrip.data);
			aTrip.summary = await Trip.tripSummary(aTrip.data);
		}

		aTrip = JSON.parse(JSON.stringify(aTrip));

		if (aTrip.data) {
			for (let o of aTrip.data) {
				if (o.vendor && Array.isArray(o.vendor.account) && o.vendor.account.length) {
					let obj = o.vendor.account.find(cId => cId.clientId === req.user.clientId);

					if (obj && obj.ref) {
						// obj = await acccountsService.findById(req.params._id, {_id: 1});
						obj = await acccountsService.findById(otherUtil.arrString2ObjectId(obj.ref), {
							name: 1,
							balance: 1
						});
						o.vendor.account = obj;
					}
				}
				if (o.documents && Array.isArray(o.documents) && o.documents.length) {
					o["noOfDocs"] = o.documents.length;
				}
			}
		}

		if (req.body.download) {
			switch (req.body.download) {
				case 'onTripAdvance':
					ReportExelService.reportTripAdvance(aTrip.data, req.user.clientData, onSuccess);
					break;
				case 'onTrip':
					ReportExelService.reportTrip(aTrip.data, req.user.clientData, onSuccess);
					break;
			}

			// noinspection JSAnnotator
			function onSuccess(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "report download available.",
					"url": data.url
				});
			}
		} else
			return res.status(200).json({status: "OK", "data": aTrip ? aTrip : {data: []}});
	} catch (err) {
		next(err);
	}
}

async function getV3(req) {
	try {
		let aCustomer = [];
		if(req.body.customer_id)
			aCustomer.push(req.body.customer_id);

		if(req.body['customer.category']){
			let oCustomer = await customerModel.find({category: {$in :req.body['customer.category']}});

			if(oCustomer){
				oCustomer.forEach(obj=>{
					aCustomer.push(obj._id);
				})
			}
		}

		if(aCustomer && aCustomer.length)
			req.body.customer_id = aCustomer;

		let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		//
		req.body.gr_query = constructGRFilters(req.body);
		oQuery.queryFilter = constructFilters(oQuery);
		if (req.clientConfig && req.clientConfig.config && req.clientConfig.config.clientOps && req.body.clientId != req.clientConfig.config.clientOps) {
			delete oQuery.queryFilter.clientId;
			oQuery.queryFilter.$or = [{'clientId': req.clientConfig.config.clientOps}, {'clientId': req.body.clientId}];
			oQuery.queryFilter.ownershipType = 'Market';
		}
		if (req.body['advanceBudget.reference_no']) {
			oQuery.queryFilter.advance_query = {reference_no: req.body['advanceBudget.reference_no']}
		}

		if (req.body.tripDocType && req.body.tripDocType.length > 0) {
			oQuery.tripDocType = req.body.tripDocType;
		}

		if (req.body.all) {
			oQuery.queryFilter.all = req.body.all;
		} else {
			if (req.body.status == 'Trip Start' || req.body.status == 'Trip started') {
				oQuery.sort = {"statuses.1.date": -1};
			} else {
				//TODO ask fronend to send object insted of string.
				if( req.body.sort && typeof(req.body.sort) == 'string'){
					oQuery.sort = JSON.parse(req.body.sort);
				}else{
					oQuery.sort = req.body.sort || {_id: -1};
				}
			}
		}
		if(req.body.customer_id)
			oQuery.custFil = true;
		oQuery.sort = req.body.sort ;
		oQuery.skip = req.body.skip || 1;
		oQuery.no_of_docs = req.body.no_of_docs || 10;
		let grProj = {
			_id: 1,
			status: 1,
			grNumber: 1,
			grDate: 1,
			'statuses.date': 1,
			'statuses.status': 1,
			'statuses.systemDate': 1,
			'statuses.user_full_name': 1,
			invoices: 1,
			'customer': 1,
			'consignor': 1,
			'consignee': 1,
			'branch': 1,
			'route': 1,
			acknowledge: 1,
			payment_basis: 1,
			payment_type: 1,
			eWayBills: 1,
			remarks: 1,
			pod: 1,
			gr_type: 1,
			coverNote: 1,
			internal_rate: 1,
			pendingRemark: 1,
			expected_arrival: 1,
			documents: 1,
			'booking.imd': 1,
			'booking._id': 1,
		};

		if(
			req.clientConfig
			&& req.clientConfig.config
			&& req.clientConfig.config.booking
			&& req.clientConfig.config.booking.showRoute
		){
			oQuery.addField = {
				$addFields: {
					route_name: '$rName',
					route: {
						_id: null,
						name: '$rName',
						route_distance: "$rKm"
					}
				}
			}
		}
		let aTrip = await Trip.paginate(oQuery);
		if (req.body.summary || req.body.download) {
			aTrip.data =  Trip.eachTripSummary(aTrip.data);
			aTrip.summary = await Trip.tripSummary(aTrip.data);
		}

		if (aTrip.data) {
			for (let o of aTrip.data) {
				if (o.vendor && Array.isArray(o.vendor.account) && o.vendor.account.length) {
					let obj = o.vendor.account.find(cId => cId.clientId === req.user.clientId);

					if (obj && obj.ref) {
						// obj = await acccountsService.findById(req.params._id, {_id: 1});
						obj = await acccountsService.findById(otherUtil.arrString2ObjectId(obj.ref), {
							name: 1,
							balance: 1
						});
						o.vendor.account = obj;
					}
				}
				// get document count from datamanagement
				if (o._id) {
					let bodyClient = {
						_id: o._id.toString(),
						modelName: "trip"
					};
					let oDms = await datamgntService.findOneRec(bodyClient, {clientId: req.body.clientId});
					if (oDms && oDms.files && oDms.files.length > 0) {
						o["noOfDocs"] = oDms.files.length;
					} else {
						o["noOfDocs"] = 0;
					}
				}
			}
		}

		return aTrip;

	} catch (err) {
	}
}

async function getV2(req, res, next) {
	try {
		//The comma operator evaluates all of its operands and returns the value of the last (rightmost) one.
		//req.body = otherUtil.bindBranchFilter(req.body, "branch", req.user.branch);
		let aCustomer = [];
		if(req.body.customer_id)
			aCustomer.push(req.body.customer_id);

		if(req.body['customer.category']){
			let oCustomer = await customerModel.find({category: {$in :req.body['customer.category']}});

			if(oCustomer){
				oCustomer.forEach(obj=>{
					aCustomer.push(obj._id);
				})
			}
		}

		if(aCustomer && aCustomer.length)
			req.body.customer_id = aCustomer;

		let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		//
		req.body.gr_query = constructGRFilters(req.body);
		oQuery.queryFilter = constructFilters(oQuery);
		if (req.clientConfig && req.clientConfig.config && req.clientConfig.config.clientOps && req.body.clientId != req.clientConfig.config.clientOps) {
			delete oQuery.queryFilter.clientId;
			oQuery.queryFilter.$or = [{'clientId': req.clientConfig.config.clientOps}, {'clientId': req.body.clientId}];
			oQuery.queryFilter.ownershipType = 'Market';
		}
		if (req.body['advanceBudget.reference_no']) {
			oQuery.queryFilter.advance_query = {reference_no: req.body['advanceBudget.reference_no']}
		}

		if (req.body.tripDocType && req.body.tripDocType.length > 0) {
			oQuery.tripDocType = req.body.tripDocType;
		}

		if (req.body.all) {
			if (!req.body.from || !req.body.to || (calculateWorkingDays(req.body.to, req.body.from) > 31)) {
				return res.status(500).json({
					"status": "ERROR",
					"message": "from , to date missing or date range exceeds"
				});
			}
			oQuery.queryFilter.all = req.body.all;
		} else {
			if (req.body.status == 'Trip Start' || req.body.status == 'Trip started' || req.body.dateType == 'Trip started') {
				oQuery.sort = {"statuses.1.date": -1};
			} if (req.body.dateType == 'allocation_date') {
				oQuery.sort = {"allocation_date": -1};
			} else {
				//TODO ask fronend to send object insted of string.
				if( req.body.sort && typeof(req.body.sort) == 'string'){
					oQuery.sort = JSON.parse(req.body.sort);
				}else{
					oQuery.sort = req.body.sort || {_id: -1};
				}
			}
		}
		// oQuery.sort = {"statuses.1.date": 1};
		if(req.body.customer_id)
			oQuery.custFil = true;
		oQuery.sort = req.body.sort ;
		oQuery.skip = req.body.skip || 1;
		oQuery.no_of_docs = req.body.no_of_docs || 10;
		let grProj = {
			_id: 1,
			status: 1,
			grNumber: 1,
			grDate: 1,
			'statuses.date': 1,
			'statuses.status': 1,
			'statuses.systemDate': 1,
			'statuses.user_full_name': 1,
			invoices: 1,
			'customer': 1,
			'consignor': 1,
			'consignee': 1,
			'branch': 1,
			'route': 1,
			acknowledge: 1,
			payment_basis: 1,
			payment_type: 1,
			eWayBills: 1,
			remarks: 1,
			pod: 1,
			gr_type: 1,
			coverNote: 1,
			internal_rate: 1,
			pendingRemark: 1,
			expected_arrival: 1,
			documents: 1,
			'booking.imd': 1,
			'booking._id': 1,
		};

		if(
			req.clientConfig
			&& req.clientConfig.config
			&& req.clientConfig.config.booking
			&& req.clientConfig.config.booking.showRoute
		){
			oQuery.addField = {
				$addFields: {
					route_name: '$rName',
					route: {
						_id: null,
						name: '$rName',
						route_distance: "$rKm"
					}
				}
			}
		}
		let aTrip = await Trip.paginate(oQuery);
		let configs = req.clientConfig && req.clientConfig.config;
		if (req.body.summary || req.body.download) {
			aTrip.data =  Trip.eachTripSummary(aTrip.data, configs);
			aTrip.summary = await Trip.tripSummary(aTrip.data);
		}

		if (aTrip.data) {
			for (let o of aTrip.data) {
				if (o.vendor && Array.isArray(o.vendor.account) && o.vendor.account.length) {
					let obj = o.vendor.account.find(cId => cId.clientId === req.user.clientId);

					if (obj && obj.ref) {
						// obj = await acccountsService.findById(req.params._id, {_id: 1});
						obj = await acccountsService.findById(otherUtil.arrString2ObjectId(obj.ref), {
							name: 1,
							balance: 1
						});
						o.vendor.account = obj;
					}
				}
				// get document count from datamanagement
				if (o._id) {
					let bodyClient = {
						_id: o._id.toString(),
						modelName: "trip"
					};
					let oDms = await datamgntService.findOneRec(bodyClient, {clientId: req.body.clientId});
					if (oDms && oDms.files && oDms.files.length > 0) {
						o["noOfDocs"] = oDms.files.length;
					} else {
						o["noOfDocs"] = 0;
					}
				}
			}
		}

		if (req.body.download) {
			switch (req.body.download) {
				case 'onTripAdvance':
					ReportExelService.reportTripAdvance(aTrip.data, req.user.clientData, onSuccess);
					break;
				case 'onTrip':
					ReportExelService.reportTrip(aTrip.data, req.user.clientData, onSuccess);
					break;
			}
		} else
			return res.status(200).json({status: "OK", "data": aTrip ? aTrip : {data: []}});

		function onSuccess(data) {
			return res.status(200).json({
				"status": "OK",
				"message": "report download available.",
				"url": data.url
			});
		}
	} catch (err) {
		next(err);
	}
}

async function getTripV2(req, res, next) {
	try {

		let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		let oPFil = constructFilters(oQuery);
		if (req.clientConfig && req.clientConfig.config && req.clientConfig.config.clientOps && req.body.clientId != req.clientConfig.config.clientOps) {
			delete oPFil.clientId;
			oPFil.$or = [{'clientId': req.clientConfig.config.clientOps}, {'clientId': req.body.clientId}];
			oPFil.ownershipType = 'Market';
		}

		req.body.skip = req.body.skip || 1;
		req.body.no_of_docs = 300 || req.body.no_of_docs;

		let advance_query = {};
		if (req.body['advanceBudget.reference_no']) {
			advance_query = {"advanceBudget.reference_no": req.body['advanceBudget.reference_no']};
			oPFil["advanceBudget.0"] = {$exists: true};
		}

		const aggrQuery = [
			{$match: oPFil},
			{$sort: {_id: -1}},
			{$skip: (req.body.no_of_docs * req.body.skip) - req.body.no_of_docs},
			{
				$lookup: {
					from: 'vendortransports',
					localField: 'vendor',
					foreignField: '_id',
					as: 'vendor'
				}
			},
			{
				$unwind: {
					path: '$vendor',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$match: {
					'vendor.clientId': req.body.clientId
				}
			},
			{
				$lookup: {
					from: 'vendortransports',
					localField: 'vendorDeal.broker.id',
					foreignField: '_id',
					as: 'vendorDeal.broker'
				}
			},
			{
				$unwind: {
					path: '$vendorDeal.broker',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'branches',
					localField: 'branch',
					foreignField: '_id',
					as: 'branch'
				}
			},
			{
				$unwind: {
					path: '$branch',
					preserveNullAndEmptyArrays: true
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
			{$match: advance_query},
			{
				$lookup: {
					from: 'tripsexpenses',
					localField: 'trip_expenses',
					foreignField: '_id',
					as: 'trip_expenses'
				}
			},
			{
				"$addFields": {
					"totalVM": {
						"$add":
							["$vendorDeal.totWithMunshiyana", "$vendorDeal.totalCharges"]
					},
				}
			},

			{
				"$addFields": {
					"vendorAdvancePaid": {
						"$reduce": {
							input: "$advanceBudget",
							initialValue: 0,
							in: {
								"$add": ["$$value", {"$ifNull": ["$$this.amount", 0]}]
							}
						}
					}
				}
			},

			{
				"$addFields": {
					"totSubsAmt": {
						"$add": ["$vendorAdvancePaid", "$vendorDeal.tdsAmount", "$vendorDeal.totalDeduction"]
					}
				}
			},

			{
				"$addFields": {
					"totRemAmt": {
						"$subtract": ["$totalVM", "$totSubsAmt"]
					}
				}
			}

		];
		let oQuerys = {aggQuery: aggrQuery, no_of_docs: req.body.no_of_docs};


		let foundData = await serverSidePage.requestData(Trip, oQuerys);

		return res.status(200).json({
				'status': 'OK',
				'message': 'Trip Data found',
				"data": foundData ? foundData : {data: []}
			});

	} catch (err) {
		throw err;
	}
}

async function getTrip(req, res, next) {
	try {
		let _id = [];
		let oFilter = {
			gps_view: req.body.gps_view,
			status: 'Trip started'
		};

		let oTrip = await Trip.find(oFilter, {_id: 1}).lean();

		if (oTrip && oTrip.length) {
			oTrip.forEach(obj => {
				_id.push(obj._id);
			})
		}

		oFilter = {
			trip: {$in: _id},
		};
		if (req.body.st === 'Trip started')
			oFilter['statuses.status'] = {$ne: 'Vehicle Arrived for unloading'};
		else if (req.body.st === 'Trip ended')
			oFilter['statuses.status'] = {$eq: 'Vehicle Arrived for unloading'};

		let oGr = await GR.find(oFilter, {trip: 1, statuses: 1}).lean();
		_id = [];
		if (oGr && oGr.length) {
			oGr.forEach(obj => {
				_id.push(obj.trip._id);
			})
		}

		if (req.body.st === 'Trip ended') {
			oFilter = {
				gps_view: req.body.gps_view,
				status: 'Trip ended'
			};
			let oTrips = await Trip.find(oFilter, {_id: 1}).lean();
			if (oTrips && oTrips.length) {
				oTrips.forEach(obj => {
					_id.push(obj._id);
				})
			}
			req.body._id = _id;
		} else {
			req.body._id = _id;
		}


		let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		req.body.no_of_docs = req.body.no_of_docs || 500;
		let oPFil = constructFilters(oQuery);
		const aggrQuery = [
			{$match: oPFil},
			{$sort: {_id: -1}},
			{$skip: (req.body.no_of_docs * req.body.skip) - req.body.no_of_docs},
			{
				$lookup: {
					from: 'registeredvehicles',
					localField: 'vehicle',
					foreignField: '_id',
					as: 'vehicle'
				}
			},
			{
				$unwind: {
					path: '$vehicle',
					preserveNullAndEmptyArrays: true
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
				$unwind: {
					path: '$driver',
					preserveNullAndEmptyArrays: true
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
				$unwind: {
					path: '$route',
					preserveNullAndEmptyArrays: true
				}
			},
		];
		let oQuerys = {aggQuery: aggrQuery, no_of_docs: req.body.no_of_docs};


		let foundData = await serverSidePage.requestData(Trip, oQuerys);

		if (foundData) {
			for (let oTrip of foundData) {
				for (let key of oTrip.statuses) {
					switch (key.status) {
						case 'Trip started':
							oTrip.startDate = new Date(key.date);
							break;
						case 'Trip ended':
							oTrip.endDate = new Date(key.date);
							break;
					}
				}
				if (oTrip.startDate && req.body.type === 'Trip Details') {
					let alertData = await getAlert(oTrip, req);
					if (alertData)
						oTrip.alertData = alertData;
				} else
					oTrip.alertData = [];
				if (oTrip.alertData && oTrip.alertData.length) {
					let actionAlert = await getActionAlert(oTrip, req);
					if (actionAlert)
						oTrip.actionAlert = actionAlert;
					else
						oTrip.actionAlert = {};

				}
			}
		}

		if (foundData && foundData.length && req.body.type === 'Trip Details') {
			foundData.forEach(obj => {
				obj.actionCount = 0;
				if (obj.actionAlert && obj.actionAlert.length) {
					obj.actionAlert[0].alerts.forEach(ac => {
						obj.actionCount += ac.actions.length;
					})
				}
			})
		}

		if (req.body.download) {
			if (req.body.type === 'Oder Details') {
				ReportExelService.oderDetailsReport(foundData, req.user.clientId, function (data) {
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			} else if (req.body.type === 'Trip Details') {
				ReportExelService.tripDetailsReport(foundData, req.user.clientId, function (data) {
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			}
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Trip Data found',
				'data': foundData
			});
		}


	} catch (err) {
		throw err;
	}
}

async function getAlertV2(oTrip, req, callback) {
	return new Promise((resolve, reject) => {
		let filter = {
			imei: oTrip.device_imei,
			code: ["power_cut","power_connect"]
		};
		if (oTrip.startDate)
			filter.from = oTrip.startDate;

		filter.to = oTrip.endDate || new Date();
		request.post({
			headers: {'content-type': 'application/json', 'Authorization': gpsgaadiAdminToken},
			url: 'http://13.229.178.235:4242/alert/getV2',
			body: JSON.stringify(filter)
		}, function (error, response, body) {
			if (error) {
				winston.error('getOdometer', error);
				return reject(error);
			}
			if (body) {
				try {
					body = JSON.parse(body);
					if (body) {
						return resolve(body);
					}
				} catch (e) {
					winston.error('getOdometer catch', e.toString());
					return reject(e, {});
				}
			}
		});
	});

};

async function getAlert(oTrip, req, callback) {
	return new Promise((resolve, reject) => {
		let filter = {
			imei: [oTrip.vehicle.device_imei],
			code: ["over_speed", "sos", "power_cut", "tempering", "hb", "ha", "rt", "idl", "fw", "nd", "idle", "tl"],
			groupBy: "exception"
		};
		if (oTrip.startDate)
			filter.from = oTrip.startDate;

		filter.to = oTrip.endDate || new Date();

		request.post({
			headers: {'content-type': 'application/json', 'Authorization': gpsgaadiAdminToken},
			url: 'http://13.229.178.235:4242/alert/groupAlerts',
			body: JSON.stringify(filter)
		}, function (error, response, body) {
			if (error) {
				winston.error('getOdometer', error);
				return reject(error);
			}
			if (body) {
				try {
					body = JSON.parse(body);
					if (body.status != 'ok') {
						return reject({});
					} else {
						return resolve(body.data);
					}
				} catch (e) {
					winston.error('getOdometer catch', e.toString());
					return reject(e, {});
				}
			}
		});
	});

};

async function playBackData(obj){
	try {
		const option = {
			method: "POST",
			url:"http://trucku.in:8081/api/reports/playback",
			body: {
				device_id: obj.device_id,
				start_time: obj.start_time,
				end_time: obj.end_time,
				idling:obj.idling || false
			},
			'headers': {
				'Authorization':obj.Authorization,
				'Content-Type': 'application/json'
			},
			json: true
		};
		let data = await requestPromise(option);
		if (data) {
			return data;
		} else {
			return undefined;
		}
	} catch (e) {
		console.error('[PlayBack Api  error]', e);
		return null;
	}
}

async function getActionAlert(oTrip, req, callback) {
	return new Promise((resolve, reject) => {
		let filter = {
			imei: [oTrip.vehicle.device_imei],
			login_uid: req.body.login_uid,
			user_id: req.body.user_id
		};

		if (oTrip.startDate)
			filter.from = oTrip.startDate;

		filter.to = oTrip.endDate || new Date();

		request.post({
			headers: {'content-type': 'application/json', 'Authorization': gpsgaadiAdminToken},
			url: 'http://13.229.178.235:4242/alert/action_alerts',
			body: JSON.stringify(filter)
		}, function (error, response, body) {
			if (error) {
				winston.error('getOdometer', error);
				return reject(error);
			}
			if (body) {
				try {
					body = JSON.parse(body);
					if (body.status != 'SUCCESS') {
						return reject({});
					} else {
						return resolve(body.data);
					}
				} catch (e) {
					winston.error('getOdometer catch', e.toString());
					return reject(e, {});
				}
			}
		});
	});

};

async function bulkStatusUpdate(req, res, next) {
	try {
		if (!req.body.tripIds || req.body.tripIds.length < 1) {
			return res.status(500).json({"status": "ERROR", "message": "tripIds not found!"});
		}
		let oRes = {status: "OK", message: "Successful", response: []};
		let aTrip = await Trip.find({_id: {$in: otherUtil.arrString2ObjectId(req.body.tripIds)}}).populate(
			{path: 'gr', select: {statuses: 1}});
		if (req.body.status === 'Trip ended' && aTrip[0].category !== 'Empty' && aTrip[0].ownershipType !== 'Market' && !req.clientConfig.config.tripStatusCheck) {
			let vehst = JSON.parse(JSON.stringify(aTrip))[0].gr[0].statuses.find(st => st.status === "Vehicle Arrived for unloading");
			if (!vehst) {
				console.error(`{{ User :- ${req.user.full_name} }} set Vehicle Arrived for unloading status first`);
				return res.status(500).json({
					status: "Error",
					error: true,
					message: 'set Vehicle Arrived for unloading status first'
				});
			} else if (new Date(req.body.date).getTime() < new Date(vehst.date).getTime()) {
				console.error(`set trip end date greater than ${moment(vehst.date).format('DD-MM-YYYY h:mm a')}`);
				return res.status(500).json({
					status: "Error",
					error: true,
					message: `{{ User :- ${req.user.full_name} }} set trip end date greater than ${moment(vehst.date).format('DD-MM-YYYY h:mm a')}`
				});
			}
		}
		for (let oTrip of aTrip) {
			var gpsDatax = {};
			let otRes = {data: oTrip};
			if (oTrip.vehicle && oTrip.vehicle.device_imei) {
				gpsDatax = await locationService.getOdometerAsync({
					device_imei: oTrip.vehicle.device_imei,
					datetime: new Date(req.body.date).getTime()
				});

			}
			/*if(!gpsDatax && !gpsDatax.odo) {
				gpsDatax = await GPSDataUtils.findGPSDataByTime(oTrip.vehicle_no, req.body.date, {window: 10}); // 10 days
                if(gpsDatax instanceof Array){
					gpsDatax = gpsDatax[0];
				}
			}*/
			let oUpdatedBy = {
				user_full_name: req.user.full_name,
				user_id: req.user._id,
				date: (req.body.date) ? req.body.date : new Date(),
				systemDate: new Date(),
				status: req.body.status,
				remark: (req.body.remark) ? req.body.remark : undefined,
				gpsData: gpsDatax,
			};
			let grUpdatedBy = JSON.parse(JSON.stringify(oUpdatedBy));
			let oVehicleUpdate = {
				status: "Available",
				previousStatus: "Booked",
				last_known: {
					status: "Available",
					datetime: oUpdatedBy.date || new Date(),
					trip: oTrip._id,
					trip_no: oTrip.trip_no,
					trip_name: oTrip.route_name || req.body.route_name
				}
			};
			if (oTrip && (!oTrip.isCancelled)) {
				switch (req.body.status) {
					//"Trip started"
					case STATUS[1]:
						if (oTrip.status === STATUS[0]) {
							oTrip.statuses.push(oUpdatedBy);
							oTrip.start_date = oUpdatedBy.date;
							otRes.data = await oTrip.set({
								allocation_date: (req.body.date) ? req.body.date : new Date(),
								status: req.body.status || oTrip.status,
								route: req.body.route || oTrip.route,
								route_name: req.body.route_name || oTrip.route_name
							}).save();
							oVehicleUpdate['status'] = "In Trip";
							oVehicleUpdate['last_known']['status'] = "In Trip";
							await RegisteredVehicle.updateRegisteredVehicle({
								clientId: req.user.clientId,
								vehicle_reg_no: oTrip.vehicle_no
							}, {$set: oVehicleUpdate});
							if (req.body.trip && req.body.trip.gr) {
								var bulkOp = req.body.trip.gr.map(ji_r => (
									{
										updateOne: {
											filter: {_id: ji_r._id},
											update: {$set: {consignee: ji_r.consignee, consignor: ji_r.consignor}},
											upsert: false
										}
									}
								));
								await GR.bulkWrite(bulkOp);
							}
							otRes.message = "Trip started";
						}
						break;
					//"Trip ended"
					case STATUS[2]:
						if (oTrip.status === STATUS[1]) {
							oTrip.statuses.push(oUpdatedBy);
							oTrip.end_date = oUpdatedBy.date;
							otRes.data = await oTrip.set({status: req.body.status}).save();
							grUpdatedBy.status = "Unloading Ended";
							if (oTrip && oTrip.gr && JSON.stringify(oTrip.gr) && JSON.parse(JSON.stringify(oTrip.gr))) {
								await GR.updateMany({_id: {$in: JSON.parse(JSON.stringify(oTrip.gr))}}, {
									$push: {statuses: grUpdatedBy},
									$set: {
										last_modified_at: new Date(),
									}
								});
							}
							let oVehicle = await RegisteredVehicle.getRegisteredVehicle({
								_id: oTrip.vehicle,
							});
							if (oVehicle && oVehicle.status !== "Maintenance") {
								await oVehicle.set(oVehicleUpdate).save();
							}
							if(oTrip.tripBase === "Sim Based"){
								try {
									let data = await traqoApiService.endTripTraqo(oTrip.traqoTripId)
								} catch (e) {
									console.error('[Tracqo Api  error]', e);
									//telegram.sendMessage('[Fastag Api error] ' + e.message);
								}
							}
							if(req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.trips && req.clientConfig.config.trips.playBackData){
								try {
									const option = {
										method: "POST",
										url:"http://trucku.in:8081/api/reports/playback",
										body: {
											device_id: oTrip.device.imei,
											start_time: oTrip.start_date,
											end_time: oUpdatedBy.date
										},
										'headers': {
											'Authorization':req.headers['authorization'],
											'Content-Type': 'application/json'
										},
										json: true
									};
									let data = await requestPromise(option);
									if (data) {
										await oTrip.set({
											"playBack":{
												"data":data.data,
												"idling": data.idling,
												"imei": data.imei,
												"reg_no": data.reg_no,
												"top_speed": data.top_speed,
												"num_stops": data.num_stops,
												"num_idle": data.num_idle,
												"avg_speed_w_stops": data.avg_speed_w_stops,
												"avg_speed_wo_stops": data.avg_speed_wo_stops,
												"tot_dist": data.tot_dist,
												"dur_total": data.dur_total,
												"dur_idle": data.dur_idle,
												"dur_stop": data.dur_stop,
												"dur_wo_stop": data.dur_wo_stop,
												"engine_hours": data.engine_hours,
												"message": data.message,
												"device_id": data.device_id.device_imei,
												"start_time": data.start_time,
												"end_time": data.end_time,
												"status": data.status
											},
										}).save();
									}
								} catch (e) {
									console.error('[PlayBack Api  error]', e);
								}
							}
							if(req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.trips && req.clientConfig.config.trips.alertData){
								let oData = {
									vehicle: {device_imei:oTrip.device.imei},
									startDate: oTrip.start_date,
									endDate: oUpdatedBy.date
								};
								let data = await getAlert(oData, req);
								await oTrip.set({
									alert:data
								}).save();
							}
							otRes.message = `Trip ended, Item Unloaded and Vehicle ${oTrip.vehicle_no} is available now.`;
						}
						break;
					default:
						otRes.message = `Nothing to update`;
						break
				}
			}
			oRes.response.push(otRes);
		}

		//send response
		res.status(200).json(oRes);
	} catch (err) {
		console.error(err.toString());
		next(err);
	}
}

async function update(req, res, next) {

	try {
		let oRes = {status: "OK", message: "Trip not found or cancelled."};
		let oTrip = await Trip.findOne({_id: req.params._id,populateGR: true}, {
			driver: 1,
			trip_no: 1,
			advSettled: 1,
			vendorDeal: 1,
			isCancelled: 1,
			statuses: 1,
			driverHistory: 1,
			allocation_date:1,
			serviceTyp:1,
			vehicle:1,
			geofence_points:1
		});
		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			systemDate: new Date(),
			date: (req.body.updated_status && req.body.updated_status.date) ? req.body.updated_status.date : new Date(),
			status: req.body.updated_status && req.body.updated_status.status,
			remark: req.body.updated_status && req.body.updated_status.remark || req.body.remark,
		};

		if(req.body.status === 'Trip started')
			oTrip.start_date = req.body.updated_status ? req.body.updated_status.date : new Date();
		if(req.body.status === 'Trip ended')
			oTrip.end_date = req.body.updated_status ? req.body.updated_status.date : new Date();
		if((oTrip.driver && oTrip.driver._id) != req.body.driver){
			let driverOnTrip = await Trip.findOne({
				_id: {$ne: req.params._id},
				"clientId" : req.user.clientId,
				"driver" :mongoose.Types.ObjectId(req.body.driver) ,
				"start_date":{$lte:new Date(oTrip.allocation_date)},
				"end_date":{$gte:new Date(oTrip.allocation_date)}
			},{trip_no:1, statuses:1 })
			let tripCan = driverOnTrip && driverOnTrip.statuses.find(obj => obj.status === 'Trip cancelled');
			if(driverOnTrip && !tripCan){
				return res.status(500).json({
					status: 'ERROR',
					message: `Driver already attach on trip ${driverOnTrip.trip_no} in this date .`
				});
			}
		}
		if (oTrip.driver && (oTrip.driver._id !== req.body.driver)) {
			oTrip.driverHistory.push({
				driver: oTrip.driver._id,
				person: req.user.full_name,
				time: new Date()
			});
		}
		if (oTrip.vendorDeal && !oTrip.vendorDeal.entryDate) {
			oTrip.vendorDeal.entryDate = new Date();
		}
		if (!oTrip.statuses) {
			oTrip.statuses = [];
		}
		if(req.body.route && req.body.route._id){
			if(oTrip.gr && oTrip.gr[0] && oTrip.gr[0].booking){
				let geofence_points = [];
				let oRoute = await transportRoute.findOne({
					_id: mongoose.Types.ObjectId(req.body.route._id)
				},{name:1, source:1, destination:1,route_distance:1}).lean();
				if(oRoute && oRoute.source && oRoute.source.name && oRoute.destination && oRoute.destination.name && oRoute.source.latitude){
					geofence_points.push({
						name: oRoute.source.name,
						type: 'Source',
						geozone : [{latitude: oRoute.source.latitude, longitude: oRoute.source.longitude}]
					})

					geofence_points.push({
						name: oRoute.destination.name,
						type: 'Destination',
						geozone : [{latitude: oRoute.destination.latitude, longitude: oRoute.destination.longitude}]
					})
				}
				let bookingDoc = await Booking.findOne({_id: oTrip.gr && oTrip.gr[0] && mongoose.Types.ObjectId(oTrip.gr[0].booking)}, {type:1, sr:1, preference:1, customer:1});
				if(bookingDoc){
					oTrip.type = bookingDoc && bookingDoc.type;
				}
				//tracking scenarios
				if(oTrip.vehicle.veh_type_name && bookingDoc.customer && oTrip.route){
					let oFilRoute = {
						category: "tracking",
						route__id: mongoose.Types.ObjectId(req.body.route._id),
						customer__id: mongoose.Types.ObjectId(bookingDoc.customer),
						vehTypeNam: oTrip.vehicle.veh_type_name
					};
					let oRouteData = await RouteData.findOne(oFilRoute,{tat_hr:1,tat_min:1}).lean();
					if(oRouteData && oRouteData.milestone && oRouteData.milestone.length){
						oRouteData.milestone.forEach(obj=> {
							geofence_points.push({
								name: obj.name,
								type: obj.category,
								tat_hr:obj.tat_hr,
								tat_min:obj.tat_min,
								tat_km:obj.tat_km,
								halt_d:obj.halt_d,
								geozone : [{latitude: obj.location.lat, longitude: obj.location.lng}]
							})
						})
					}
					if(oRouteData && oRouteData.tat_hr){
						req.body.tat_hr = oRouteData.tat_hr;
						req.body.tat_min = oRouteData.tat_min || 0;
					}
					if(geofence_points.length)
						req.body.geofence_points = geofence_points;
				}
			}
		}
		if (oTrip && (!oTrip.isCancelled)) {
			oTrip.statuses.push(oUpdatedBy);
			delete req.body._id;
			delete req.body.trip_no;
			delete req.body.clientId;
			delete req.body.vehicle;//vehicle update restricted
			oRes.data = await oTrip.set(req.body).save();
			oRes.message = "Trip updated successfully."
		}

		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function updateVehicle(_id, body, req) {

	try {

		let oTrip = await Trip.findOne({
			_id,
			isCancelled: false,
		}, {
			gr: 1,
			vendorDeal: 1,
			advanceBudget: 1,
			ownershipType: 1,
			trip_no: 1,
			route_name: 1,
			markSettle:1,
			advSettled:1,
			payments:1,
			start_date:1,
			end_date:1,
			vehicle:1,
			vehicle_no:1
		}).populate({path: 'gr', select: {bill: 1, provisionalBill: 1, supplementaryBillRef: 1}})
			.populate({path: 'vehicle', select: {vehicle_reg_no: 1}}).lean();

		if (!(oTrip && oTrip._id))
			throw new Error('Trip Not Found');

		if (oTrip.vendorDeal && oTrip.vendorDeal.acknowledge && oTrip.vendorDeal.acknowledge.voucher) {
			throw new Error('Vendor deal has been acknowledged and it\'s vouchers have been created');
		}

		if (oTrip.vendorDeal && !otherUtil.isEmptyObject(oTrip.vendorDeal.charges) || !otherUtil.isEmptyObject(oTrip.vendorDeal.chargesdeduction)) {
			throw new Error('Vendor deal charges/deduction added and it\'s vouchers have been created');
		}

		if (oTrip.advanceBudget && oTrip.advanceBudget.length) {
			throw new Error('Advances vouchers have been created');
		}
		if (oTrip.trip_expenses && oTrip.trip_expenses.length) {
			throw new Error('Expense vouchers have been created');
		}

		if (oTrip.payments && oTrip.payments.length) {
			throw new Error('vehicle can not update driver payments done already');
		}

		if (oTrip.markSettle && oTrip.markSettle.isSettled) {
			throw new Error('vehicle can not update trip markSettle already');
		}

		if (oTrip.advSettled && oTrip.advSettled.tsNo) {
			throw new Error('vehicle can not update on trip.. RT already maped on trip');
		}

		for (let oGr of oTrip.gr) {
			if (oGr.bill || (Array.isArray(oGr.provisionalBill) && oGr.provisionalBill.length) || (Array.isArray(oGr.supplementaryBillRef) && oGr.supplementaryBillRef.length))
				throw new Error('Gr is already billed for Gr Number ' + oGr.grNumber);
		}


		await RegisteredVehicleModel.updateOne({
			_id: oTrip.vehicle
		},{
			$set: {
				status: "Available",
				last_modified_at: new Date(),
				last_modified_by_name:  req.user.full_name,
				last_modified_by:  req.user._id,
				last_modified_employee_code:  req.user.clientId
			},
		});

		//Update Vehicle
		if (oTrip.start_date) {
			let oVehicleUpdate = {
				status: "In Trip",
				previousStatus: "Booked",
				last_known: {
					status: "In Trip",
					datetime:  new Date(),
					trip: oTrip._id,
					trip_no: oTrip.trip_no,
					trip_name: oTrip.route_name
				}
			};

			await RegisteredVehicleModel.updateOne({
				_id: body.vehId
			}, {$set: oVehicleUpdate});
		} else if (!(oTrip.start_date && oTrip.end_date)) {
			let oVehicleUpdate = {
				status: "Booked",
				last_known: {
					status: "Booked",
					datetime: new Date(),
					trip: oTrip._id,
					trip_no: oTrip.trip_no,
					trip_name: oTrip.route_name,
				}
			};
			await RegisteredVehicleModel.updateOne(
				{_id: body.vehId, clientId: req.user.clientId, vehicle_reg_no: body.vehNo},
				{$set: oVehicleUpdate}
			);
		}

		let vehicle = await RegisteredVehicleModel.findOne({_id: body.vehId},{driver2:1,driver2Name:1});

		await Trip.updateOne({
			_id: oTrip._id
		}, {
			$set: {
				vehicle: body.vehId,
				vehicle_no: body.vehNo,
				driver2: vehicle && vehicle.driver2 ? vehicle.driver2 : undefined,
				driver2Name: vehicle && vehicle.driver2Name ? vehicle.driver2Name : "",


			},
			$push: {
				statuses: {
					user_id: req.user._id,
					user_full_name: req.user.full_name,
					systemDate: new Date(),
					remark: oTrip.vehicle_no + ' => ' + body.vehNo + ';' + body.rmk,
				}
			}
		});

		if (oTrip.gr.length) {
			await GR.updateMany({
				_id: {
					$in: oTrip.gr.map(o => o._id)
				}
			}, {
				$set: {
					vehicle: body.vehId,
					vehicle_no: body.vehNo,
					last_modified_at: new Date(),
				},
				$push: {
					statuses: {
						user_id: req.user._id,
						user_full_name: req.user.full_name,
						systemDate: new Date(),
						remark: oTrip.vehicle_no + ' => ' + body.vehNo + ';' + body.rmk,
					}
				}
			});
		}

		return true;

	} catch (e) {
		throw e;
	}
}

async function updateOneTrip(_id, body, query = false) {

	try {

		let oTrip = await Trip.findOne({
			_id: typeof _id === 'string' ? otherUtil.arrString2ObjectId(_id) : _id,
			isCancelled: false,
		}, {_id: 1}).lean();

		if (!(oTrip && oTrip._id))
			throw new Error('Trip Not Found');

		if (!Object.keys(body).length)
			throw new Error('Nothing to found for update');

		let oQuery = query ? body : {$set: body};

		let data = await Trip.updateOne({
			_id: oTrip._id
		}, oQuery);

		console.log(data);

		return true;

	} catch (e) {
		throw e;
	}
}

async function documentsUpload(req, res, next) {
	try {
		if (req.files) {
			await FileService.uploadFiles(req, 'tripV2', req.tripData, allowedFiles);
		}
		req.body.documents = req.tripData.documents;
		delete req.files;
		let updated = await Trip.findOneAndUpdateAsync({_id: req.params._id}, {$set: req.body}, {new: true});
		return res.status(200).json({
			'status': 'OK',
			'message': 'documents uploaded',
			'data': updated
		});
	} catch (err) {
		next(err);
	}
}

async function upload_slip(req, res, next) {
	try {
		let oRes = {status: "OK", message: "Trip not found or cancelled."};
		let oTrip = await Trip.findOne({_id: req.params._id});
		if (oTrip && (!oTrip.isCancelled)) {
			if (req.files) {
				if ((req.files.loading_slip) && (req.files.loading_slip[0]) && (req.files.loading_slip[0].filename !== undefined)) {
					//req.body.cancelled_cheque = req.files.loading_slip[0].filename;
					let oUpdate = {
						"vendorDeal.loading_slip": req.files.loading_slip[0].filename,
						"vendorDeal.ls_uploading_date": new Date()
					};
					oRes.data = await oTrip.set(oUpdate).save();
					oRes.message = "Loading slip uploaded on trip successfully."
				}
			}
		}
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function getTripByIDslip(req, res, next) {
	try {
		req.oTrip = await Trip.findOne({_id: req.params._id});
		next();
	} catch (err) {
		next(err);
	}
}

async function parseFiles(req, res, next) {
	TripUpload(req, res, function (err) {
		if (err) {
			return res.status(500).json({
				"status": "ERROR",
				"error_message": JSON.stringify(err)
			});
		} else {
			return next();
		}
	})
}

async function addAskPayment(req, res, next) {
	try {
		if (!req.body.askPayment) {
			return res.status(500).json({status: "ERROR", message: "Body not found!"});
		}
		if (req.body.askPayment.amount <= 0) {
			return res.status(500).json({status: "ERROR", message: "Invalid amount"});
		}
		if (!req.body.askPayment.type) {
			return res.status(500).json({status: "ERROR", message: "Invalid type"});
		}
		let askPayment = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: (req.body.askPayment.date) ? req.body.askPayment.date : new Date(),
			amount: req.body.askPayment.amount,
			remark: req.body.askPayment.remark,
			type: (req.body.askPayment.type) ? req.body.askPayment.type : undefined
		};
		Trip.updateAsync({_id: req.params._id, clientId: req.user.clientId}, {$push: {askPayment: askPayment}})
			.then(function (data) {
				res.status(200).json({status: "OK", message: "Payment added", data: data});
			})
			.catch(function (err) {
				res.status(500).json({status: "ERROR", message: err.toString()});
			})

	} catch (err) {
		next(err);
	}
}

async function vendorAcknowledge(req, res, next) {
	try {

		if (otherUtil.isAccountEnabled(req) && !(req.body.account_data.from || req.body.account_data.to || req.body.tdsAccountData.to || req.body.tdsAccountData.to))
			throw new Error("provide account's from and to");

		let oTrip = await Trip.findOne({_id: req.params._id}, {
			vendorDeal: 1, gr: 1, vehicle_no: 1, route_name: 1, vendor: 1, branch: 1
		}).populate('vendorDeal.acknowledge.voucher').populate({
			path: 'gr',
			select: {'grNumber': 1, 'grDate': 1}
		}).lean();

		if (!oTrip)
			throw new Error("Trip not Found");

		if (!(oTrip.vendorDeal && oTrip.vendorDeal.total_expense))
			throw new Error("Vendor deal not found. Please add vendor deal in trip detail view by clicking update trip button.");

		if (otherUtil.isAccountEnabled(req)) {

			let tdsVchIdPtr;
			let ackVchIdPtr;

			if (oTrip.vendorDeal.acknowledge.voucher && oTrip.vendorDeal.acknowledge.voucher.acImp && oTrip.vendorDeal.acknowledge.voucher.acImp.st)
				throw new Error('Voucher Imported to Account. Data cannot be updated');

			let dealAck = oTrip.vendorDeal.acknowledge.voucher;
			let ackVoucher = dealAck && dealAck._id;
			let oQuery = {};
			let totWithMunshiyana = oTrip.vendorDeal.totWithMunshiyana || 0;
			let narration = oTrip.vehicle_no + "[Hire], Route: " + oTrip.route_name;
			if (oTrip.gr && oTrip.gr[0] && oTrip.gr[0].grNumber) {
				narration = narration + " ,LRNO: " + oTrip.gr[0].grNumber;
			}

			if (oTrip.gr && oTrip.gr[0] && oTrip.gr[0].grDate && oTrip.gr[0].grDate && oTrip.gr[0].grDate) {
				let dt = new Date(oTrip.gr[0].grDate);
				narration = narration + " ,LR Date " + dt.toLocaleDateString();
			}

			if (totWithMunshiyana != 0) {
				let dVch = {
					_id: mongoose.Types.ObjectId(),
					clientId: req.user.clientId,
					type: "Journal",
					narration: narration,
					amount: totWithMunshiyana,
					date: new Date(oTrip.vendorDeal.deal_at || oTrip.vendorDeal.entryDate),
					remAmt: req.body.remainingAmount,
					trackPayAs: "bill",
					billNo: oTrip.vendorDeal.loading_slip,
					refNo: oTrip.vendorDeal.loading_slip,
					billType: 'New Ref',
					vT: 'Vendor Deal',
					isEditable: false,
					from: req.body.account_data.from,
					fromName: req.body.account_data.fromName,
					to: req.body.account_data.to,
					toName: req.body.account_data.toName,
					branch: oTrip.branch,
					createdBy: req.user.full_name
				};
				dVch.ledgers = [
					{
						account: req.body.account_data.from,
						lName: req.body.account_data.fromName,
						amount: totWithMunshiyana,
						cRdR: 'CR',
						bills: [{
							billNo: oTrip.vendorDeal.loading_slip,
							billType: 'New Ref',
							amount: totWithMunshiyana,
							remAmt: totWithMunshiyana,
						}]
					}];

				if(oTrip.vendorDeal.tdsAmount){

					dVch.ledgers[0].amount -= oTrip.vendorDeal.tdsAmount;
					dVch.ledgers[0].bills[0].amount -= oTrip.vendorDeal.tdsAmount;
					// dVch.ledgers[1].amount += oTrip.vendorDeal.tdsAmount;

					dVch.ledgers.push({
						account: req.body.tdsAccountData.from,
							lName: req.body.tdsAccountData.fromName,
						amount: oTrip.vendorDeal.tdsAmount,
						cRdR: 'CR',
						bills: [{
							billNo: oTrip.vendorDeal.loading_slip,
							billType: 'New Ref',
							amount: oTrip.vendorDeal.tdsAmount,
							remAmt: oTrip.vendorDeal.tdsAmount,
						}]
					})
				}

				dVch.ledgers.push({
					account: req.body.account_data.to,
					lName: req.body.account_data.toName,
					amount: totWithMunshiyana,
					cRdR: 'DR',
					bills: []
				});

				//narration = oTrip.vehicle_no + "[Hire],Route : "+oTrip.route_name + " Vendor: "+oTrip.vendor.name;
				ackVchIdPtr = dVch._id;
				let voucher = await VoucherServiceV2.addVoucherAsync(dVch);

				oQuery['$set'] = oQuery['$set'] || {};

				Object.assign(oQuery['$set'], {
					'vendorDeal.acknowledge': {
						status: true,
						user: req.user._id,
						userName: req.user.full_name,
						date: new Date(),
						voucher: voucher[0].voucher._id,
						ackToAc: req.body.account_data.to
					},
					'vendorDeal.tdsVoucher': voucher[0] && voucher[0].voucher._id,
				});
			}

			if (!otherUtil.isEmptyObject(oQuery))
				oTrip = await Trip.findByIdAndUpdate(req.params._id, oQuery, {new: true});
		} else {

			oTrip = await Trip.findByIdAndUpdate(req.params._id,
				{
					$set: {
						'vendorDeal': {
							acknowledge: {status: true, user: req.user._id, userName: req.user.name, date: new Date()}
						}
					}
				}
			);
		}

		return res.status(200).json({
			status: "OK",
			message: "VendorDeal Acknowledged",
			data: oTrip
		});

	} catch (err) {
		winston.error(err.message || err.toString());
		if (err) {
			return res.status(500).json({
				status: "OK",
				message: err.message || err.toString(),
				error: err
			});
		} else {
			return res.status(500).json({
				status: "OK",
				message: err,
				error: err
			});
		}

	}

}

async function vendorExtraCharges(req, res, next) {
	try {
		if (!req.body.vendorDeal) {
			return res.status(500).json({status: "ERROR", message: "Vendor Deal not Found"});
		}
		if (otherUtil.isAccountEnabled(req) && (!req.body.account_data.from || !req.body.account_data.to)) {
			return res.status(500).json({"status": "OK", "message": "provide account's from and to"});
		}
		let oTrip = await Trip.findOne({_id: req.params._id});
		if (!oTrip) {
			return res.status(500).json({status: "ERROR", message: "Trip not Found"});
		}
		if (!oTrip.vendorDeal) {
			return res.status(500).json({status: "ERROR", message: "Vendor Deal Required"});
		}
		let updatedTripObj = {
			...oTrip._doc,
			vendorDeal: {
				...oTrip._doc.vendorDeal,
				...req.body.vendorDeal
			}
		};

		let updatedTrip = await Trip.update({_id: req.params._id}, {$set: {"vendorDeal": updatedTripObj.vendorDeal}});

		if (!otherUtil.isAccountEnabled(req)) {
			return res.status(200).json({status: "OK", message: "Deal Updated Successfully", data: updatedTripObj})
		} else {
			let reqbody = {
				type: "Journal",
				amount: req.body.vendorDeal[req.body.charge],
				narration: `Charges for TripNo ${oTrip.trip_no}`,
				from: req.body.account_data.from,
				to: req.body.account_data.to,
				refNo: `TripNo ${oTrip.trip_no}`,
				clientId: req.user.clientId,
				created_by: req.user._id
			};

			VoucherService.addVoucherAsync(reqbody)
				.then(function (data) {
					return res.status(200).json(
						{
							status: "OK",
							message: "Deal Updated Successfully",
							data: updatedTripObj
						})
				}).catch(function (err) {
				winston.error(err.message || err.toString());
				return res.status(500).json({status: "ERROR", message: "Something went wrong => " + err.toString()});
			})
		}
	} catch (err) {
		winston.error(err.message || err.toString());
		next(err);
	}

}

async function updateVendorDeal(id, body) {

	let foundTrip;

	try {
		foundTrip = await Trip.findOne({_id: id})
			.populate({path: 'gr', select: {'grNumber': 1, 'grDate': 1}})
			.populate({path: 'vendor', select: {'name': 1, 'clientId': 1}})
			.lean();

		if (!foundTrip)
			throw new Error('No Trip Found');

		if (body.vendorDeal.loading_slip) {

			if (!foundTrip.vendorDeal.loading_slip) {

				let isSlipNoUsed = await Trip.aggregate([
					{
						$match: {
							'vendorDeal.loading_slip': body.vendorDeal.loading_slip,
							isCancelled :  {$ne: true},
							clientId: body.clientId,
							_id: {
								$ne: otherUtil.arrString2ObjectId(id)
							}
						}
					},
					{
						$lookup: {
							from: 'vendortransports',
							localField: 'vendor',
							foreignField: '_id',
							as: 'vendor'
						}
					}, {
						$unwind: {
							path: '$vendor',
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$match: {
							"vendor.clientId": body.clientId
						}
					},
					{
						$project: {
							_id: 1
						}
					}
				]);

				if (isSlipNoUsed && isSlipNoUsed[0])
					throw new Error('Hire Slip Ref No already used');

				let lsStationaryId;

				if (body.vendorDeal.lsStationaryId)
					lsStationaryId = body.vendorDeal.lsStationaryId;
				else {
					let foundStationary = await billStationaryService.findByRefAndType({
						bookNo: body.vendorDeal.loading_slip,
						type: 'Hire Slip',
						clientId: body.clientId
					});

					if (foundStationary) {
						lsStationaryId = foundStationary._id;
					}
				}

			} else if (foundTrip.vendorDeal.loading_slip && foundTrip.vendorDeal.loading_slip != body.vendorDeal.loading_slip) {

				let isSlipNoUsed = await Trip.aggregate([
					{
						$match: {
							isCancelled :  {$ne: true},
							clientId: body.clientId,
							'vendorDeal.loading_slip': body.vendorDeal.loading_slip,
							_id: {
								$ne: otherUtil.arrString2ObjectId(id)
							}
						}
					},
					{
						$lookup: {
							from: 'vendortransports',
							localField: 'vendor',
							foreignField: '_id',
							as: 'vendor'
						}
					}, {
						$unwind: {
							path: '$vendor',
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$match: {
							"vendor.clientId": body.clientId
						}
					},
					{
						$project: {
							_id: 1
						}
					}
				]);

				if (isSlipNoUsed && isSlipNoUsed[0])
					throw new Error('Hire Slip Ref No already used');

				let lsStationaryId;

				if (body.vendorDeal.lsStationaryId)
					lsStationaryId = body.vendorDeal.lsStationaryId;
				else {
					let foundStationary = await billStationaryService.findByRefAndType({
						bookNo: body.vendorDeal.loading_slip,
						type: 'Hire Slip',
						clientId: body.clientId
					});

					if (foundStationary) {
						lsStationaryId = foundStationary._id;
					}
				}

				// if(lsStationaryId && (await billStationaryService.isUsed(lsStationaryId)))
				// 	throw new Error('Ref No already used');

				if (lsStationaryId) {
					body.vendorDeal.lsStationaryId = lsStationaryId;
				} else if (foundTrip.vendorDeal.lsStationaryId) {
					await Trip.findOneAndUpdate({
						_id: id
					}, {
						$unset: {
							'vendorDeal.loading_slip': 1
						}
					});
				}

				if (foundTrip.vendorDeal.lsStationaryId) {
					await billStationaryService.updateStatus({
						userName: body.userName,
						docId: foundTrip._id.toString(),
						modelName: 'tripV2',
						stationaryId: foundTrip.vendorDeal.lsStationaryId,
					}, 'cancelled');
				}
			}

		} else {
			throw new Error('Mandatory Fields are required');
		}

		let oUpdate = {};

		if (body.branch)
			oUpdate.branch = body.branch;

		if (body.vendor)
			oUpdate.vendor = body.vendor;

		// Voucher alteration for charges
		await generateAlteredVoucher('charges');

		// Voucher alteration for Deduction
		await generateAlteredVoucher('deduction');

		oUpdate.vendorDeal = Object.assign({}, foundTrip.vendorDeal, body.vendorDeal || {});

		let updateAck = await Trip.updateOne({_id: otherUtil.arrString2ObjectId(id)}, {
			$set: oUpdate
		});

		if (foundTrip.vendorDeal.loading_slip != body.vendorDeal.loading_slip && body.vendorDeal.lsStationaryId) {
			await billStationaryService.updateStatus({
				userName: body.userName,
				docId: foundTrip._id.toString(),
				modelName: 'tripV2',
				stationaryId: body.vendorDeal.lsStationaryId,
			}, 'used');
		}

		return updateAck;

	} catch (e) {
		winston.error(e.message || e.toString());
		console.log('deal update', e.toString());
		throw e;
	}

	async function generateAlteredVoucher(keyPtr) {

		let paymentType = keyPtr === 'charges' ? 'Vendor Charges' : 'Vendor Deduction';

		body.vendorDeal[keyPtr] = body.vendorDeal[keyPtr] || {};
		foundTrip.vendorDeal[keyPtr] = foundTrip.vendorDeal[keyPtr] || {};
		let newObj = Object.assign({}, body.vendorDeal[keyPtr]);
		let deleteKeys = [];
		let narration = foundTrip.vehicle_no + "[Hire], Route: " + foundTrip.route_name;

		if (foundTrip.gr && foundTrip.gr[0]) {
			if (foundTrip.gr[0].grNumber)
				narration = narration + " ,LRNO: " + foundTrip.gr[0].grNumber;
			if (foundTrip.gr[0].grDate) {
				let dt = new Date(foundTrip.gr[0].grDate);
				narration = narration + " ,LR Date " + dt.toLocaleDateString();
			}
		}

		for (let key in foundTrip.vendorDeal[keyPtr]) {
			if (foundTrip.vendorDeal[keyPtr].hasOwnProperty(key) && !otherUtil.isEmptyObject(foundTrip.vendorDeal[keyPtr][key])) {
				let value = foundTrip.vendorDeal[keyPtr][key];

				// TODO remove below code its just add for fixing the old data

				if ((value.voucher = await VoucherServiceV2.findVoucherByIdAsync(value.voucher, {_id: 1})))
					value.voucher = value.voucher._id;

				// TODO END

				// TODO remove below code its just add for fixing the old data

				if (value.tdsVoucher && (value.tdsVoucher = await VoucherServiceV2.findVoucherByIdAsync(value.tdsVoucher, {_id: 1})))
					value.tdsVoucher = value.tdsVoucher._id;

				// TODO END

				if (value.voucher) {
					if (newObj[key] && newObj[key].amount) {
						// the charge exist
						deleteKeys.push(key);

						let dVch = {
							clientId: body.clientId,
							refNo: constant.sCharges[key] + body.vendorDeal.loading_slip,
							type: "Journal",
							narration: value.narration ? (value.narration + '; ' + narration) : narration,
							date: new Date(newObj[key].date || body.vendorDeal.deal_at || foundTrip.vendorDeal.deal_at || foundTrip.vendorDeal.entryDate || new Date()),
							vT: paymentType,
							isEditable: false,
							branch: body.branch || foundTrip.branch,
							createdBy: body.userName,
						};

						dVch.ledgers = [
							{
								account: newObj[key].from,
								lName: newObj[key].fromName,
								amount: newObj[key].amount,
								cRdR: 'CR',
								bills: []
							},
							{
								account: newObj[key].to,
								lName: newObj[key].toName,
								amount: newObj[key].amount,
								cRdR: 'DR',
								bills: []
							}];

						if (paymentType == 'Vendor Charges') {
							dVch.trackPayAs = "bill";
							dVch.ledgers[0].bills.push({
								billNo: body.vendorDeal.loading_slip,
								billType: 'New Ref',
								amount: newObj[key].amount,
								remAmt: newObj[key].amount,
							});
						} else if (paymentType == 'Vendor Deduction') {
							dVch.ledgers[1].bills.push({
								billNo: body.vendorDeal.loading_slip,
								billType: 'Against Ref',
								amount: newObj[key].amount
							});
						}

						body.vendorDeal[keyPtr][key].voucher = dVch._id = value.voucher;
						await VoucherServiceV2.editVoucher(dVch);

						if (value.tdsVoucher) {
							if (newObj[key].tdsAmount) {

								let dVch = {
									_id: value.tdsVoucher,
									clientId: body.clientId,
									refNo: constant.sCharges[key] + "TDS" + body.vendorDeal.loading_slip,
									type: "Journal",
									narration: narration,
									date: new Date(newObj[key].date || body.vendorDeal.deal_at || foundTrip.vendorDeal.deal_at || foundTrip.vendorDeal.entryDate || new Date()),
									trackPayAs: "bill",
									vT: 'Vendor TDS',
									isEditable: false,
									branch: body.branch || foundTrip.branch,
									createdBy: body.userName,
								};
								dVch.ledgers = [
									{
										account: newObj[key].tdsAccount,
										lName: newObj[key].tdsAccountName,
										amount: newObj[key].tdsAmount,
										cRdR: 'CR',
										bills: [{
											billNo: body.vendorDeal.loading_slip,
											billType: 'New Ref',
											amount: newObj[key].tdsAmount,
											remAmt: newObj[key].tdsAmount,
										}]
									},
									{
										account: newObj[key].from,
										lName: newObj[key].fromName,
										amount: newObj[key].tdsAmount,
										cRdR: 'DR',
										bills: [{
											billNo: body.vendorDeal.loading_slip,
											billType: 'Against Ref',
											amount: newObj[key].tdsAmount
										}]
									}];

								body.vendorDeal[keyPtr][key].tdsVoucher = dVch._id;
								await VoucherServiceV2.editVoucher(dVch);
							} else {
								await VoucherServiceV2.removeVoucher({
									_id: value.tdsVoucher,
									clientId: body.clientId
								});
							}

						} else if (newObj[key].tdsAmount) {

							let dVch = {
								clientId: body.clientId,
								refNo: constant.sCharges[key] + "TDS" + body.vendorDeal.loading_slip,
								type: "Journal",
								narration: narration,
								date: new Date(value.date || body.vendorDeal.deal_at || foundTrip.vendorDeal.deal_at || foundTrip.vendorDeal.entryDate || new Date()),
								trackPayAs: "bill",
								vT: 'Vendor TDS',
								isEditable: false,
								branch: body.branch || foundTrip.branch,
								createdBy: body.userName,
							};
							dVch.ledgers = [
								{
									account: newObj[key].tdsAccount,
									lName: newObj[key].tdsAccountName,
									amount: newObj[key].tdsAmount,
									cRdR: 'CR',
									bills: [{
										billNo: body.vendorDeal.loading_slip,
										billType: 'New Ref',
										amount: newObj[key].tdsAmount,
										remAmt: newObj[key].tdsAmount,
									}]
								},
								{
									account: newObj[key].from,
									lName: newObj[key].fromName,
									amount: newObj[key].tdsAmount,
									cRdR: 'DR',
									bills: [{
										billNo: body.vendorDeal.loading_slip,
										billType: 'Against Ref',
										amount: newObj[key].tdsAmount
									}]
								}];

							let voucherTDS = await VoucherServiceV2.addVoucherAsync(dVch);
							let tdsMongoId = voucherTDS && voucherTDS[0] && voucherTDS[0].voucher._id;
							body.vendorDeal[keyPtr][key].tdsVoucher = tdsMongoId;
						}

					} else {
						// the charge don't exist so, will delete it
						await VoucherServiceV2.removeVoucher({
							_id: value.voucher,
							clientId: body.clientId
						});

						if (value.tdsVoucher)
							await VoucherServiceV2.removeVoucher({
								_id: value.tdsVoucher,
								clientId: body.clientId
							});
					}
				}
			}
		}

		deleteKeys.forEach(s => delete newObj[s]);
		//create new vouchers if not exists
		for (let k in newObj) {
			if (newObj.hasOwnProperty(k)) {
				let val = newObj[k];
				let dVch = {
					clientId: body.clientId,
					refNo: constant.sCharges[k] + body.vendorDeal.loading_slip,
					type: "Journal",
					narration: val.narration ? (val.narration + '; ' + narration) : narration,
					date: new Date(val.date || body.vendorDeal.deal_at || foundTrip.vendorDeal.deal_at || foundTrip.vendorDeal.entryDate || new Date()),
					vT: paymentType,
					isEditable: false,
					branch: body.branch || foundTrip.branch,
					createdBy: body.userName,
				};

				let fdVch = await VoucherServiceV2.findVoucherByQueryAsync({
					refNo: new RegExp('^' + constant.sCharges[k] + body.vendorDeal.loading_slip + '$'),
					clientId: foundTrip.vendor.clientId
				}, {_id: 1});

				if (fdVch[0] && fdVch[0]._id)
					dVch._id = fdVch[0]._id;

				dVch.ledgers = [
					{
						account: val.from,
						lName: val.fromName,
						amount: val.amount,
						cRdR: 'CR',
						bills: []
					},
					{
						account: val.to,
						lName: val.toName,
						amount: val.amount,
						cRdR: 'DR',
						bills: []
					}];
				if (paymentType == 'Vendor Charges') {
					dVch.trackPayAs = "bill";
					dVch.ledgers[0].bills.push({
						billNo: body.vendorDeal.loading_slip,
						billType: 'New Ref',
						amount: val.amount,
						remAmt: val.amount,
					});
				} else if (paymentType == 'Vendor Deduction') {
					dVch.ledgers[1].bills.push({
						billNo: body.vendorDeal.loading_slip,
						billType: 'Against Ref',
						amount: val.amount
					});
				}

				if (dVch._id) {
					await VoucherServiceV2.editVoucher(dVch);
					body.vendorDeal[keyPtr][k].voucher = dVch._id;
				} else {
					let voucher = await VoucherServiceV2.addVoucherAsync(dVch);
					body.vendorDeal[keyPtr][k].voucher = voucher && voucher[0] && voucher[0].voucher._id;
				}

				if (val.tdsAmount) {
					let dVch = {
						clientId: body.clientId,
						refNo: constant.sCharges[k] + "TDS" + body.vendorDeal.loading_slip,
						type: "Journal",
						narration: narration,
						date: new Date(val.date || body.vendorDeal.deal_at || foundTrip.vendorDeal.deal_at || foundTrip.vendorDeal.entryDate || new Date()),
						trackPayAs: "bill",
						vT: 'Vendor TDS',
						isEditable: false,
						branch: body.branch || foundTrip.branch,
						createdBy: body.userName,
					};

					fdVch = await VoucherServiceV2.findVoucherByQueryAsync({
						refNo: new RegExp('^' + constant.sCharges[k] + "TDS" + body.vendorDeal.loading_slip + '$'),
						clientId: foundTrip.vendor.clientId
					}, {_id: 1});

					if (fdVch[0] && fdVch[0]._id)
						dVch._id = fdVch[0]._id;

					dVch.ledgers = [
						{
							account: val.tdsAccount,
							lName: val.tdsAccountName,
							amount: val.tdsAmount,
							cRdR: 'CR',
							bills: [{
								billNo: body.vendorDeal.loading_slip,
								billType: 'New Ref',
								amount: val.tdsAmount,
								remAmt: val.tdsAmount,
							}]
						},
						{
							account: val.from,
							lName: val.fromName,
							amount: val.tdsAmount,
							cRdR: 'DR',
							bills: [{
								billNo: body.vendorDeal.loading_slip,
								billType: 'Against Ref',
								amount: val.tdsAmount
							}]
						}];

					if (dVch._id) {
						await VoucherServiceV2.editVoucher(dVch);
						body.vendorDeal[keyPtr][k].tdsVoucher = dVch._id;
					} else {
						let voucher = await VoucherServiceV2.addVoucherAsync(dVch);
						body.vendorDeal[keyPtr][k].tdsVoucher = voucher && voucher[0] && voucher[0].voucher._id;
					}

				}
			}
		}

	}

	async function generateOVch(obj) {
		return await VoucherServiceV2.formatPayloadAndAdd({
			type: "Journal",
			clientId: body.clientId,
			vT: obj.paymentType,
			refNo: obj.refNo,
			stationaryId: obj.stationaryId,
			isEditable: false,
			narration: obj.narration || `Charges for TripNo ${obj.trip_no}`,
			date: obj.billDate || new Date(),
			branch: body.branch,
			createdBy: body.userName,

			amount: obj.amount,
			from: obj.from,
			fromName: obj.fromName,
			to: obj.to,
			toName: obj.toName,
			billNo: obj.billNo,
			billType: obj.billType || 'New Ref',
			_id: obj._id
		})
	}

}

async function update_status(req, res, next) {
	try {
		let oRes = {status: "OK"};
		let gpsData;
		let oTrip = await Trip.findOne({_id: req.params._id}).populate(
			{path: 'gr', select: {statuses: 1}});
		if (req.body.status === 'Trip ended' && oTrip.category !== 'Empty' && oTrip.gr && oTrip.gr[0] && oTrip.ownershipType !== 'Market' && !req.clientConfig.config.tripStatusCheck) {
			let vehst = oTrip.gr[0].statuses.find(st => st.status === "Vehicle Arrived for unloading");
			if (!vehst) {
				return res.status(200).json({
					status: "Error",
					error: true,
					message: 'set Vehicle Arrived for unloading status first'
				});
			} else if (new Date(req.body.date).getTime() < new Date(vehst.date).getTime()) {
				return res.status(200).json({
					status: "Error",
					error: true,
					message: `set trip end date greater than ${moment(vehst.date).format('DD-MM-YYYY h:mm a')}`
				});
			}
		}

		if(req.body.status === 'Trip started'){
			if (moment(req.body.date).isBefore(moment(oTrip.allocation_date))) {
				return res.status(500).json({
					status: 'ERROR',
					message: 'Trip start date can\'t be set  before allocation date.'
				});
			}
		}

		if (oTrip.vehicle && oTrip.vehicle.device_imei) {
			gpsData = await locationService.getOdometerAsync({
				device_imei: oTrip.vehicle.device_imei,
				datetime: new Date(req.body.date).getTime()
			});
		}
		if (gpsData instanceof Array) {
			if (gpsData[0]) {
				gpsData = gpsData[0];
			} else {
				gpsData = undefined;
			}
		}
		oTrip.statuses = oTrip.statuses.filter(st => st.status !== req.body.status);
		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: (req.body.date) ? req.body.date : new Date(),
			systemDate: new Date(),
			status: req.body.status,
			remark: (req.body.remark) ? req.body.remark : undefined,
			gpsData: gpsData,
		};

		if(oUpdatedBy.status === 'Trip started'){
			let obj = {
				"clientId" : req.user.clientId,
				_id: {$ne: mongoose.Types.ObjectId( req.params._id)},
				"isCancelled" : false,
				"$and":[
					{
						"$or":[
							{"start_date":{$lte: req.body.date ? new Date(req.body.date) : new Date()},
								"end_date":{$gte:req.body.date ? new Date(req.body.date) : new Date()}}]
					},
					{
						'$or': [
							{ vehicle: mongoose.Types.ObjectId(oTrip.vehicle && oTrip.vehicle._id)},
							{ driver: mongoose.Types.ObjectId(oTrip.driver && oTrip.driver._id) }
						]
					}

				]
			}
			if(oTrip.vehicle || oTrip.driver){
				let driverOnTrip = await Trip.aggregate([{$match:obj},{$project:{
						trip_no:1
					}}]);
				if(driverOnTrip && driverOnTrip[0]){
					return res.status(500).json({
						status: 'ERROR',
						message: `vehicle already attach on trip ${driverOnTrip[0].trip_no} in this date .`
					});
				}
			}
		}
		let grUpdatedBy = JSON.parse(JSON.stringify(oUpdatedBy));
		let oVehicleUpdate = {
			status: "Available",
			previousStatus: "Booked",
			last_known: {
				status: "Available",
				datetime: oUpdatedBy.date || new Date(),
				trip: oTrip._id,
				trip_no: oTrip.trip_no,
				trip_name: oTrip.route_name
			}
		};
		if(oUpdatedBy.status === 'Trip ended'){
			if (moment(req.body.date ? req.body.date : new Date()).isAfter(moment())) {
				return res.status(500).json({
					status: 'ERROR',
					message: 'Trip end date can\'t be set to future.'
				});
			}
			if (moment(req.body.date ? req.body.date : new Date()).isBefore(moment(oTrip.start_date))) {
				return res.status(500).json({
					status: 'ERROR',
					message: 'Trip end date can\'t be before trip start date.'
				});
			}
		    let obj = {
			"clientId" : req.user.clientId,
			_id: {$ne: mongoose.Types.ObjectId( req.params._id)},
			"isCancelled" : false,
			"$and":[
				{
					"$or":[
						{"start_date":{$gte: oTrip.start_date ? new Date(oTrip.start_date) : new Date()}, "end_date":{$lte:req.body.date ? new Date(req.body.date) : new Date()}},
						{"start_date":{$gte:req.body.date ? new Date(req.body.date) : new Date()}, "end_date":{$lte:req.body.date ? new Date(req.body.date) : new Date()}}
					],
				},
				{
					"$or":[{"vehicle" :mongoose.Types.ObjectId(oTrip.vehicle && oTrip.vehicle._id)},{"driver" :mongoose.Types.ObjectId(oTrip.driver && oTrip.driver._id)}]
				}
			]
		     }
		     if(oTrip.vehicle || oTrip.driver){
			let driverOnTrip = await Trip.aggregate([{$match:obj},{$project:{
					trip_no:1
				}}]);
			if(driverOnTrip && driverOnTrip[0]){
				return res.status(500).json({
					status: 'ERROR',
					message: `vehicle already attach on trip ${driverOnTrip[0].trip_no} in this date .`
				});
			}
		}
		}
		if (oTrip && (!oTrip.isCancelled)) {
			switch (req.body.status) {
				//"Trip started"
				case STATUS[1]:
					if (oTrip.status === STATUS[0]) {
						oTrip.statuses.push(oUpdatedBy);
						oRes.data = await oTrip.set({
							allocation_date: oTrip.allocation_date ? oTrip.allocation_date : ((req.body.date) ? req.body.date : new Date()),
							status: req.body.status,
							start_date: oUpdatedBy.date || new Date(),
							startOdo: req.body.startOdo
						}).save();
						oVehicleUpdate['status'] = "In Trip";
						oVehicleUpdate['last_known']['status'] = "In Trip";
						await RegisteredVehicle.updateRegisteredVehicle({
							clientId: req.user.clientId,
							_id: oTrip.vehicle,
							// vehicle_reg_no: oTrip.vehicle_no
						}, {$set: oVehicleUpdate});
						oRes.message = "Trip started";
					}
					break;
				//"Trip ended"
				case STATUS[2]:
					if (oTrip.status === STATUS[1]) {
						oTrip.statuses.push(oUpdatedBy);
						oRes.data = await oTrip.set({
							status: req.body.status,
							end_date: oUpdatedBy.date || new Date(),
							endOdo: req.body.endOdo
						}).save();
						// grUpdatedBy.status = "Unloading Ended";
						// await GR.updateMany({_id: {$in: JSON.parse(JSON.stringify(oTrip.gr))}}, {
						// 	$push: {statuses: grUpdatedBy},
						// 	$set: {last_modified_at: new Date()}
						// });
						let oVehicle = await RegisteredVehicle.getRegisteredVehicle({
							_id: oTrip.vehicle,
							clientId: req.user.clientId,
						});

						// oVehicleUpdate.last_known.status = "In Trip";

						if (oVehicle && oVehicle.status !== "Maintenance") {
							await oVehicle.set(oVehicleUpdate).save()
						}
						oRes.message = `Trip ended, Item Unloaded and Vehicle ${oTrip.vehicle_no} is available now.`;
					}
					break;
				default:
					oRes.message = `Nothing to update`;
					break
			}
		}

		//send response
		res.status(200).json(oRes);
		if(oTrip && oTrip.device && oTrip.device.imei){
			if(req.body.status === 'Trip ended' && req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.trips && req.clientConfig.config.trips.playBackData){
				try {
					let obj = {
						device_id: oTrip.device.imei,
						start_time: oTrip.start_date,
						end_time: oUpdatedBy.date,
						idling:true,
						Authorization:req.headers['authorization']
					}
					let data = await playBackData(obj);
					if (data) {
						let obj1 = {
							"currentLocation": data.data && data.data.length && data.data[data.data.length-1].stop_addr,
							"currentStatus":data.data && data.data.length && data.data[data.data.length-1].status,
							"playBack":{
								"idling": data.idling,
								"top_speed": data.top_speed,
								"num_stops": data.num_stops,
								"num_idle": data.num_idle,
								"tot_dist": data.tot_dist,
								"dur_total": data.dur_total,
								"dur_idle": data.dur_idle,
								"dur_stop": data.dur_stop,
								"dur_wo_stop": data.dur_wo_stop,
								"stoppage":0,
								"idleStoppage":0
							}
						}
						if(data.data && data.data.length){
							for(const d of data.data){
								if(d.status == "stopped" && (d.duration/60 > 30)){
									obj1.playBack.stoppage += 1;
								}
								if(d.status == "running" && (d.duration/60 > 30)){
									obj1.playBack.idleStoppage += 1;
								}
							}
						}
						await oTrip.set(obj1).save();
					}
				} catch (e) {
					console.error('[PlayBack Api  error]', e);
				}
			}
			if(req.body.status === 'Trip ended' && req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.trips && req.clientConfig.config.trips.alertData){
				let oData = {
					vehicle: {device_imei:oTrip.device.imei},
					startDate: oTrip.start_date,
					endDate: oUpdatedBy.date
				};
				let dataCount = await getAlert(oData, req);
				await oTrip.set({
					alert:dataCount,
				}).save();
				//update alarm setting on trip end to switch off geofence checking
				let oDevice = {device_id:oTrip.device.imei,device_type:oTrip.device.device_type};
				locationService.updateTripAlerts(oDevice,function(err,resp){
					if(err){
						console.error('updateTripAlerts err' ,err.message);
					}
				});
			}
		}
		if(req.body.status === 'Trip ended' && oTrip.tripBase === "Sim Based"){
			try {
				let data = await traqoApiService.endTripTraqo(oTrip.traqoTripId);
				let playBackData = await traqoApiService.fetchTripTraqo(oTrip.trip_no);
				playBackData = JSON.parse(playBackData);
				if(playBackData.status === "success"){
					let obj = {
						currentLocation:playBackData && playBackData.trips && playBackData.trips['0'] && playBackData.trips['0'].last_loc && playBackData.trips['0'].last_loc.address,
						currentStatus:"stopped",
					    playBack:{
							tot_dist:(oTrip.route && oTrip.route.route_distance && oTrip.route.route_distance*1000) - ( playBackData && playBackData.trips && playBackData.trips['0'] && playBackData.trips['0'].last_loc && playBackData.trips['0'].last_loc.distance_remained || 0),
							total_halt_time: playBackData && playBackData.trips && playBackData.trips['0'] && playBackData.trips['0'].total_halt_time,
							dur_stop : 0,
							rmDist: playBackData && playBackData.trips && playBackData.trips['0'] && playBackData.trips['0'].last_loc && playBackData.trips['0'].last_loc.distance_remained || 0,
							dur_total : 0,
							num_stops: playBackData && playBackData.trips && playBackData.trips['0'] && playBackData.trips['0'].halts && playBackData.trips['0'].halts.length,
							stoppage : playBackData && playBackData.trips && playBackData.trips['0'] && playBackData.trips['0'].halts && playBackData.trips['0'].halts.length
					    }
					}
					for(const d of playBackData && playBackData.trips && playBackData.trips['0'] && playBackData.trips['0'].halts){
						obj.playBack.dur_stop += ((getDurationInMinute(d.start_time,d.leaving_time) * 60) || 0);
					}
					await oTrip.set(obj).save();
				}
			} catch (e) {
				console.error('[Tracqo Api  error]', e);
			}
		}
	} catch (err) {
		winston.error(err.message || err.toString());
		next(err);
	}
}

function getDurationInMinute (start, end) {
	start = new Date(start);
	end = new Date(end);
	const dur = end.getTime() - start.getTime();
	return getDurationFromSecsInMinutes(parseInt(dur / 1000));
};

function getDurationFromSecsInMinutes (dur) {
	if (dur < 60) return dur + ' Sec ';
	let mins = parseInt((dur % (60 * 60)) / 60);
	mins = mins > 0 ? mins  : 0;
	return mins;
};

async function cancel(req, res, next) {
	try {
		let oRes = {status: "OK", message: "Nothing to update"};
		let oTrip = await Trip.findOne({_id: req.params._id}).populate(
			{path: 'gr', select: {tMemo:1,stationaryId: 1, bill: 1, grNumber: 1, supplementaryBillRef: 1, in: 1}});
		let oUpdatedBy = {
			user_full_name: req.user.full_name,
			user_id: req.user._id,
			date: req.body.date || new Date(),
			systemDate: new Date(),
			status: "Trip cancelled",
			remark: req.body.remark,
		};

		let grUpdatedBy = JSON.parse(JSON.stringify(oUpdatedBy));

		let oVehicleUpdate = {
			status: "Available",
			previousStatus: "Booked",
			last_known: {
				status: "Available",
				datetime: oUpdatedBy.date || new Date(),
				trip: oTrip._id,
				trip_no: oTrip.trip_no,
				trip_name: oTrip.route_name
			}
		};

		if (oTrip && (!oTrip.isCancelled)) {
			var stats = [];
			var shouldBegin = true;

			if (oTrip.vendorDeal.acknowledge && oTrip.vendorDeal.acknowledge.voucher) {
				shouldBegin = false;
				stats.push('Vendor deal has been acknowledged and it\'s vouchers have been created');
			}

			if (oTrip.vendorDeal.charges)
				for (let k in oTrip.vendorDeal.charges) {
					let oCh = oTrip.vendorDeal.charges[k];
					if (oCh && oCh.voucher) {
						shouldBegin = false;
						stats.push('Vendor deal has Charges and it\'s vouchers have been created');
						break;
					}
				}

			if (oTrip.vendorDeal.deduction)
				for (let k in oTrip.vendorDeal.charges) {
					let oCh = oTrip.vendorDeal.charges[k];
					if (oCh && oCh.voucher) {
						shouldBegin = false;
						stats.push('Vendor deal has Deductions and it\'s vouchers have been created');
						break;
					}
				}

			if (oTrip.advanceBudget.length || oTrip.trip_expenses.length) {
				shouldBegin = false;
				stats.push('Advances Or Expense vouchers have been created');
			}

			for (let i = 0; i < oTrip.gr.length; i++) {
				if (oTrip.gr[i].bill || (Array.isArray(oTrip.gr[i].supplementaryBillRef) && oTrip.gr[i].supplementaryBillRef.length)) {
					shouldBegin = false;
					stats.push('Gr is already billed ' + oTrip.gr[i].grNumber);
				} else if (oTrip.gr[i].in && oTrip.gr[i].in.length) {
					shouldBegin = false;
					stats.push('Incidental is applied on' + oTrip.gr[i].grNumber);
				} else if (oTrip.gr[i].fpa && oTrip.gr[i].fpa.vch) {
					shouldBegin = false;
					stats.push('FPA is applied on' + oTrip.gr[i].grNumber);
				}else if (oTrip.gr[i].tMemoReceipt && oTrip.gr[i].tMemoReceipt.length) {
					shouldBegin = false;
					stats.push('tMemoReceipt is generated on' + oTrip.gr[i].tMemo.tMNo);
				}else if (oTrip.gr[i].grNumber) {
					shouldBegin = false;
					stats.push('Gr number on it Remove this Gr number' + oTrip.gr[i].grNumber );
				}
			}

			if (shouldBegin) {

				if (oTrip.vendorDeal.lsStationaryId) {
					await billStationaryService.updateStatus({
						userName: req.user.full_name,
						docId: oTrip.vendorDeal.lsStationaryId,
						modelName: 'tripV2',
						stationaryId: oTrip.vendorDeal.lsStationaryId,
					}, 'cancelled');
				}

				oTrip.statuses.push(oUpdatedBy);
				oRes.data = await oTrip.set({status: "Trip cancelled", isCancelled: true}).save();
				grUpdatedBy.status = "Trip cancelled";
				let oGRupdate = {
					status: "Trip cancelled",
					tripCancelled: true,
					last_modified_at: new Date()
				};
				let aGrIds = [];
				for (let i = 0; i < oTrip.gr.length; i++) {
					let oGR = oTrip.gr[i];
					aGrIds.push(oGR._id);
					if (oGR.stationaryId) {
						await billStationaryService.updateStatus({
							userName: req.user.full_name,
							docId: oGR._id,
							modelName: 'TripGr',
							stationaryId: oGR.stationaryId,
						}, 'cancelled');
					}
					if(oGR.tMemo && oGR.tMemo.stationaryId){
						await billStationaryService.updateStatus({
							userName: req.user.full_name,
							stationaryId: oGR.tMemo.stationaryId,
						}, 'cancelled');
					}
				}
				if (aGrIds && aGrIds.length > 0) {
					await GR.updateMany({_id: {$in: aGrIds}},
						{
							$set: oGRupdate, $push: {statuses: grUpdatedBy}
						});
				}

				let oVehicle = await RegisteredVehicle.getRegisteredVehicle({
					_id: oTrip.vehicle,
				});
				if (oVehicle && oVehicle.status !== "Maintenance") {
					await oVehicle.set(oVehicleUpdate).save()
				}
				if(oTrip.tripBase === "Sim Based"){
					try {
						let data = await traqoApiService.endTripTraqo(oTrip.traqoTripId)
					} catch (e) {
						console.error('[Tracqo Api  error]', e);
						//telegram.sendMessage('[Fastag Api error] ' + e.message);
					}
				}
				oRes.message = `Trip, GR, Advances, Expenses cancelled and Vehicle ${oTrip.vehicle_no} is available now.`;
			} else {
				oRes.status = 'ERROR';
				oRes.message = `Trip can't be cancelled.\nInfo: ${stats.join(', ')}`;
			}
		} else {
			oRes.status = 'ERROR';
			oRes.message = `Trip not exists or already cancelled.`;
		}
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function add_geofence(req, res, next) {
	try {
		let oRes = {status: "OK", message: "Nothing to update"};
		let oTrip = await Trip.findOne({_id: req.params._id});
		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: new Date(),
			systemDate: new Date(),
			remark: 'Geofences ' + req.body.name + " for " + req.body.name
		};
		if (oTrip && (!oTrip.isCancelled) && !(oTrip.status === STATUS[2])) {
			oTrip.statuses.push(oUpdatedBy);
			oTrip.geofence_points.push(req.body);
			delete req.body._id;
			delete req.body.status;
			delete req.body.trip_no;
			delete req.body.clientId;
			oRes.data = await oTrip.save();
			oRes.message = `Trip geofences added`;
		} else {
			oRes.message = `Trip geofence can not be added as trips status is ` + oTrip.status;
		}
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function rm_geofence(req, res, next) {
	try {
		let oRes = {status: "OK", message: "Nothing to update"};
		let oTrip = await Trip.findOne({_id: req.params._id});
		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: new Date(),
			systemDate: new Date(),
			remark: 'Geofences ' + req.body.name + ' disabled '
		};
		if (oTrip && (!oTrip.isCancelled) && !(oTrip.status === STATUS[2])) {
			oTrip.statuses.push(oUpdatedBy);
			for (let i = 0; i < oTrip.geofence_points.length; i++) {
				if (oTrip.geofence_points[i]._id === req.body.l_id) {
					oTrip.geofence_points[i].deleted = true;
				}
			}
			delete req.body._id;
			delete req.body.status;
			delete req.body.trip_no;
			delete req.body.clientId;
			oRes.data = await oTrip.save();
			oRes.message = `Trip geofences removed`;
		} else {
			oRes.message = `Trip geofence can not be removed as trips status is ` + oTrip.status;
		}
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

function calculateDiesel(aTrips) {
	let totalDiesel = 0;
	let totalExtraDiesel = 0;
	if (aTrips && aTrips.length > 0) {
		for (let j = 0; j < aTrips.length; j++) {
			if (aTrips[j].trip_expenses && aTrips[j].trip_expenses.length > 0) {
				let totalExpenseDiesel = 0;
				let totalExpenseExtraDiesel = 0;
				for (let k = 0; k < aTrips[j].trip_expenses.length; k++) {
					let oExpense = aTrips[j].trip_expenses[k];
					if (oExpense.type === "Diesel") {
						totalExpenseDiesel = totalExpenseDiesel + (oExpense.diesel_info && oExpense.diesel_info.litre ? oExpense.diesel_info.litre : 0)
					}
					if (oExpense.type === "Extra Diesel") {
						totalExpenseExtraDiesel = totalExpenseExtraDiesel + (oExpense.diesel_info && oExpense.diesel_info.litre ? oExpense.diesel_info.litre : 0)
					}
				}
				totalDiesel = totalDiesel + totalExpenseDiesel;
				totalExtraDiesel = totalExtraDiesel + totalExpenseExtraDiesel;
				aTrips[j]["totalExpenseDiesel"] = totalExpenseDiesel;
				aTrips[j]["totalExpenseExtraDiesel"] = totalExpenseExtraDiesel;
			}
		}
	}
	return {aTrips: aTrips, totalTripDiesel: totalDiesel, totalTripExtraDiesel: totalExtraDiesel};
}

async function report_fleet_owner(req, res, next) {
	try {
		let clientId = req.user.clientId;
		let status = (req.query.status) ? req.query.status : "Trip started";
		let startDate = req.query.start_date ? setStartDate(req.query.start_date) : setStartDate();
		let currentEndDate = req.query.end_date ? setEndDate(req.query.end_date) : setEndDate();
		let currentStartDate = new Date(req.query.end_date);
		currentStartDate.setDate(currentStartDate.getDate());
		currentStartDate = setStartDate(currentStartDate);
		let workingDays = calculateWorkingDays(currentEndDate, startDate);
		let aFleetOwnerTripData = await RegisteredVehicleModel.aggregate(
			[
				{
					$match: {clientId: req.user.clientId, "owner_group": {$exists: true}, "category": {$ne: "Trailer"}}
				},
				{
					$group: {_id: "$owner_group", aVehicle: {$push: "$vehicle_reg_no"}, count: {$sum: 1}}
				},
				{
					$graphLookup: {
						from: "tripv2",
						startWith: "$aVehicle",
						connectFromField: "aVehicle",
						connectToField: "vehicle_no",
						as: "aTrips",
						restrictSearchWithMatch: {
							"clientId": req.user.clientId,
							"statuses": {
								$elemMatch: {
									status: status,
									date: {
										"$gte": startDate,
										"$lte": currentEndDate
									}
								}
							},
							"isCancelled": false
						}
					}
				},
				{
					$graphLookup: {
						from: "tripv2",
						startWith: "$aVehicle",
						connectFromField: "aVehicle",
						connectToField: "vehicle_no",
						as: "aTodaysTrips",
						restrictSearchWithMatch: {
							"clientId": req.user.clientId,
							"statuses": {
								$elemMatch: {
									status: status,
									date: {
										"$gte": currentStartDate,
										"$lte": currentEndDate
									}
								}
							},
							"isCancelled": false
						}
					}
				},
				{$sort: {count: -1}}
			]
		);
		await TripExpense.populate(aFleetOwnerTripData, {path: "aTrips.trip_expenses"});
		let aFleetOwnerTripDataWithExpense = await TripExpense.populate(aFleetOwnerTripData, {path: "aTodaysTrips.trip_expenses"});
		let totalDiesel = 0;
		let totalTodayDiesel = 0;
		let totalTodayExtraDiesel = 0;
		let totalVehicle = 0;
		let totalTodayTrips = 0;
		let totalTrips = 0;
		let totalTodayHSD = 0;
		let totalHSD = 0;
		let totalTripExtraDiesel = 0;

		for (let i = 0; i < aFleetOwnerTripDataWithExpense.length; i++) {
			totalVehicle = totalVehicle + (aFleetOwnerTripDataWithExpense[i].count || 0);
			totalTodayTrips = totalTodayTrips + (aFleetOwnerTripDataWithExpense[i].aTodaysTrips.length || 0);
			totalTrips = totalTrips + (aFleetOwnerTripDataWithExpense[i].aTrips.length || 0);
			//totalTodayHSD = totalTodayHSD+(aFleetOwnerTripDataWithExpense[i].totalTodayTripDiesel || 0);
			//totalHSD = totalHSD+(aFleetOwnerTripDataWithExpense[i].totalTripDiesel || 0);

			let calculateTrip = calculateDiesel(aFleetOwnerTripDataWithExpense[i].aTrips);
			totalHSD = totalHSD + (calculateTrip.totalTripDiesel || 0);
			aFleetOwnerTripDataWithExpense[i]["aTrips"] = calculateTrip.aTrips;
			aFleetOwnerTripDataWithExpense[i]["totalTripDiesel"] = calculateTrip.totalTripDiesel;
			aFleetOwnerTripDataWithExpense[i]["totalTripExtraDiesel"] = calculateTrip.totalTripExtraDiesel;
			totalDiesel = totalTodayDiesel + calculateTrip.totalTripDiesel;
			totalTripExtraDiesel = totalTripExtraDiesel + calculateTrip.totalTripExtraDiesel;
			let calculateTodayTrip = calculateDiesel(aFleetOwnerTripDataWithExpense[i].aTodaysTrips);
			totalTodayHSD = totalTodayHSD + (calculateTodayTrip.totalTodayTripDiesel || 0);
			aFleetOwnerTripDataWithExpense[i]["aTodaysTrips"] = calculateTodayTrip.aTrips;
			aFleetOwnerTripDataWithExpense[i]["totalTodayTripDiesel"] = calculateTodayTrip.totalTripDiesel;
			totalTodayDiesel = totalTodayDiesel + calculateTodayTrip.totalTripDiesel;
		}
		let resData = {
			totalTripExtraDiesel: totalTripExtraDiesel,
			totalVehicle: totalVehicle,
			totalTodayTrips: totalTodayTrips,
			totalTrips: totalTrips,
			totalTodayHSD: totalTodayHSD,
			totalHSD: totalHSD,
			owner_trips: aFleetOwnerTripDataWithExpense,
			totalDiesel: totalDiesel,
			totalTodayDiesel: totalTodayDiesel,
			workingDays: workingDays
		};
		if (req.query.download) {
			ReportExelService.generate_report_fleet_owner(resData, req.user.clientData, req.user.clientId, function (data) {
				return res.status(200).json({
					"status": "OK",
					"message": "report download available.",
					"url": data.url
				});
			});
		} else {
			return res.status(200).json({
				"status": "OK",
				"message": "report download available.",
				"data": resData
			});
		}


		//send response
		//res.status(200).json({ success: "OK", "data": {owner_trips:aFleetOwnerTripDataWithExpense, totalDiesel:totalDiesel,totalTodayDiesel:totalTodayDiesel, workingDays:workingDays }});
	} catch (err) {
		next(err);
	}
}

async function addAdvance(req, res, next) {
	try {

		let oRes = {
				status: "OK",
				message: 'Trip Advance Added Successfully'
			},
			body = req.body,
			prepareAdvanceObj = {
				clientId: req.user.clientId,
				...req.body,
				remainingAmount: req.body.amount,
				date: req.body.date || new Date(),
				category: req.body.category || 'trip',
				created_at: new Date(),
				created_by: req.user._id,
				createdBy: req.user.full_name,
				from_account: req.body.account_data.from,
				to_account: req.body.account_data.to
			};

		// validate refNo and mark it used
		let refNo = prepareAdvanceObj.reference_no.trim();
		let stationaryId = prepareAdvanceObj.stationaryId;
		if(req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.zeroNotAllow){
			if(req.body.amount === 0){
				throw new Error('Amount Can not  be Zero');
			}
		}
		if(req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.ZeroAndMinusNotAllow){
			if(req.body.amount < 1){
				throw new Error('Amount can not be zero or minus');
			}
		}

		if (refNo) {
			let foundVoucher = await TripAdvances.findOne({
				reference_no: refNo,
				clientId: req.user.clientId
			});

			if (foundVoucher && foundVoucher._id)
				throw new Error(`Advance with Ref. No. ${refNo} already exists.`);

			if (!stationaryId) {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: refNo,
					type: 'Ref No',
					clientId: req.user.clientId
				});

				if (foundStationary) {
					prepareAdvanceObj.stationaryId = stationaryId = foundStationary._id;
				}
			}

			if (stationaryId && (await billStationaryService.isUsed(stationaryId)))
				throw new Error('Trip Advance Ref No already used');
		}


		let oTrip = false;

		if (req.params._id != 'no_trip')
			oTrip = await Trip.findOne({_id: req.params._id, clientId: req.user.clientId});

		if (oTrip) {
			prepareAdvanceObj.trip = oTrip._id;
			prepareAdvanceObj.trip_no = oTrip.trip_no;

			if (oTrip && oTrip.advSettled && oTrip.advSettled.isCompletelySettled)
				throw new Error(`Trip Advance Cannot be added. Because Trip no ${oTrip.trip_no} is Completely Settled`);

			if (oTrip && oTrip.markSettle && oTrip.markSettle.isSettled)
				throw new Error(`Trip Advance Cannot be added. Because Trip no ${oTrip.trip_no} is Marked Settled`);
		}

		if (prepareAdvanceObj.advanceType === 'Diesel') {
			prepareAdvanceObj.dieseInfo = req.body.diesel_info;
			// prepareAdvanceObj.amount = req.body.diesel_info.rate * req.body.diesel_info.litre;
		}

		if (req.body.ownershipType == 'Market') {

			prepareAdvanceObj.vendorPayment = prepareAdvanceObj.vendorPayment || {};
			prepareAdvanceObj.voucher = mongoose.Types.ObjectId();

			await VoucherServiceV2.addVoucherAsync({
				type: 'Payment',
				clientId: req.user.clientId,
				vT: prepareAdvanceObj.advanceType,
				refNo: prepareAdvanceObj.reference_no,
				stationaryId: prepareAdvanceObj.stationaryId,
				isEditable: false,
				narration: prepareAdvanceObj.narration,
				date: prepareAdvanceObj.vendorPayment.paymentDate,
				branch: prepareAdvanceObj.branch,
				createdBy: req.body.created_by_name,
				paymentMode: prepareAdvanceObj.vendorPayment.paymentMode,
				paymentRef: prepareAdvanceObj.vendorPayment.paymentRef,
				paymentDate: prepareAdvanceObj.vendorPayment.paymentDate,
				ledgers: [{
					account: prepareAdvanceObj.from_account,
					lName: prepareAdvanceObj.fromAccountName,
					amount: prepareAdvanceObj.amount,
					cRdR: 'CR',
					bills: []
				}, {
					account: prepareAdvanceObj.to_account,
					lName: prepareAdvanceObj.toAccountName,
					amount: prepareAdvanceObj.amount,
					cRdR: 'DR',
					bills:[{
						billNo: oTrip && oTrip.vendorDeal && oTrip.vendorDeal.loading_slip,
						billType: prepareAdvanceObj.billType,
						amount: prepareAdvanceObj.amount,
						remAmt: prepareAdvanceObj.billType == "New Ref" ? prepareAdvanceObj.amount : 0,
					}],
					costCategory: [{
						category: "Primary",
						center: [{
							name: prepareAdvanceObj.ccVehicle,
							amount: prepareAdvanceObj.amount
						}]
					}, {
						category: "Caravan",
						center: [{
							name: prepareAdvanceObj.ccBranch,
							amount: prepareAdvanceObj.amount
						}]
					}]
				}],
				_id: prepareAdvanceObj.voucher
			});

		}

		let oFilter = {
			clientId: req.user.clientId,
			advanceType: req.body.advanceType,
		};
		if (req.body.vehicle_no) {
			oFilter.vehicle_no = req.body.vehicle_no;
		}
		if (req.body.reference_no) {
			oFilter.reference_no = req.body.reference_no.trim();
		}

		let advanceObj = await TripAdvances.findOneAndUpdate(oFilter, {$set: prepareAdvanceObj}, {
			new: true,
			upsert: true
		});

		if (stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'tripadvances',
				docId: advanceObj._id,
				stationaryId,
			}, 'used');
		}

		let tripToUpdate = {
			$push: {
				'advanceBudget': advanceObj._id
			}
		};

		if (req.params._id != 'no_trip') {
			let updated = await Trip.findOneAndUpdate(
				{
					_id: req.params._id
				},
				tripToUpdate,
				{
					new: true
				}
			);

			oRes.data = req.body.summary ?  Trip.eachTripSummary(updated) : updated;
		}

		if (prepareAdvanceObj.advanceType === "Diesel") {
			await RegisteredVehicleModel.update(
				{_id: prepareAdvanceObj.vehicle}, {
					$inc: {
						'dieselInVehicle': prepareAdvanceObj.dieseInfo.litre
					}
				}
			);

			// Send Notification
			let alertTotalDiesel = 950;
			let dieselLtr = prepareAdvanceObj.dieseInfo.litre;
			if (dieselLtr > alertTotalDiesel) {
				let oDelta = {
					"Success": {
						count: dieselLtr,
						status: "Success",
						message: "Totol Diesel Ltr Exceeded from " + alertTotalDiesel
					}
				};
				alertTripAdvLog(req, prepareAdvanceObj.reference_no, oDelta);
			}

		}

		let oDeltaLog = {};
		if (prepareAdvanceObj.advanceType == 'Happay') {
			let alertHappayAmt = 50000;
			let totalHappayAmt = prepareAdvanceObj.amount;
			if (totalHappayAmt > alertHappayAmt) {
				oDeltaLog = {
					"Success": {
						count: totalHappayAmt,
						status: "Success",
						message: "Totol Happay Exceeded from " + alertHappayAmt
					}
				};
				alertTripAdvLog(req, prepareAdvanceObj.reference_no, oDeltaLog);
			}
		} else if (prepareAdvanceObj.advanceType == 'Driver Cash') {
			let alertDriverCashAmt = 50000;
			let totalDriverCashAmt = prepareAdvanceObj.amount;
			if (totalDriverCashAmt > alertDriverCashAmt) {
				oDeltaLog = {
					"Success": {
						count: totalDriverCashAmt,
						status: "Success",
						message: "Totol Driver Cash Amount Exceeded from " + alertDriverCashAmt
					}
				};
				alertTripAdvLog(req, prepareAdvanceObj.reference_no, oDeltaLog);
			}
		} else if (prepareAdvanceObj.advanceType == 'Fastag') {
			let alertFastTagAmt = 3000;
			let totalFastTagAmt = prepareAdvanceObj.amount;
			if (totalFastTagAmt > alertFastTagAmt) {
				oDeltaLog = {
					"Success": {
						count: totalFastTagAmt,
						status: "Success",
						message: "Totol Fastag Exceeded from " + alertFastTagAmt
					}
				};
				alertTripAdvLog(req, prepareAdvanceObj.reference_no, oDeltaLog);
			}
			// END
		}
		return res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

function alertTripAdvLog(req, oRefNo, oDelta) {
	try {
		logsService.addLog('TripAdvances', {
			uif: "TripAdvances-" + new Date().toLocaleString(),
			docId: req.user._id,
			category: 'Notification',
			delta: oDelta,
			action: {
				refNo: oRefNo,
				addedUser: req.user.full_name,
				datetime: Date.now(),
				isActioned: true
			}
		}, req);
	} catch (e) {
		throw e;
	}

}

async function updateSettleTrip(req, res, next) {
	if (!req.params._id) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Please provide _id'
		})
	}
	if (otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({'status': 'ERROR', 'message': 'No update body found'})
	}
	try {

		let foundExp = await TripExpense.findOne({_id: req.params._id}, {voucher: 1});

		let objBody = {};
		if(req.body.amount)
			objBody.amount = req.body.amount;
		if(req.body.diesel_info)
			objBody['diesel_info.litre'] = req.body.diesel_info.litre;
		if(req.body.remark)
			objBody.remark = req.body.remark;

		let updateSettleTrip = await TripExpense.updateOne({
			_id: foundExp._id
		}, {
			$set: objBody
		});

		let foundVoucher = await VoucherServiceV2.findVoucherByIdAsync(foundExp.voucher, {ledgers: 1});

		if (foundVoucher) {
			foundVoucher.ledgers.forEach(o => {
				o.amount = req.body.amount;
			});

			await VoucherServiceV2.editVoucher({
				_id: foundExp.voucher,
				clientId: req.user.clientId,
				ledgers: foundVoucher.ledgers
			});
		}

		if (updateSettleTrip) {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data updated.',
				'data': updateSettleTrip
			});
		} else {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'SettleTrip not updated!'
			})
		}

	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString()
		})
	}
}

async function settleTrip(req, res, next) {

	try {
		const oRes = {
			status: "OK",
			message: 'Trip Settled Successfully'
		};

		const uniqueTripId = [];

		let isTsNoGen = false;

		isTsNoGen = !!(await Trip.findOne(
			{
				clientId: req.user.clientId,
				_id: req.body.aTrips[0],
				'advSettled.tsNo': {
					$exists: true,
				}
			}));

		const tripExpense = await Promise.all(req.body.aSettle.map(async obj => {

			let voucher;
			if (obj.account_data) {
				let reqbody = {
					amount: obj.amount,
					narration: obj.remark,
					from: obj.account_data.from,
					to: obj.account_data.to,
					refNo: obj.reference_no,
					clientId: req.user.clientId,
					created_by: req.user._id
				};

				try {
					voucher = await VoucherServiceV2.formatPayloadAndAdd({
						type: "Journal",
						clientId: req.user.clientId,
						vT: obj.paymentType,
						refNo: `${req.body.aTrips[0].advSettled.tsNo || 1}/${Date.now()}`,
						isEditable: false,
						narration: obj.remark,
						date: new Date(),
						// branch: obj.branch,
						createdBy: req.body.created_by_name,

						from: obj.account_data.from,
						fromName: obj.account_data.fromName,
						to: obj.account_data.to,
						toName: obj.account_data.toName,
						amount: obj.amount,
					});
				} catch (e) {
					throw e;
				}
			}

			obj.trip = obj.trip_id;
			obj.user = req.user.full_name;

			if (!uniqueTripId.find(id => id === obj.trip_id))
				uniqueTripId.push(obj.trip_id);

			if (obj.account_data)
				obj.voucher = voucher[0].voucher._id;

			delete obj.trip_id;

			if (obj.type === "Diesel" && obj.diesel_info && obj.diesel_info.litre) {
				await RegisteredVehicleModel.update(
					{
						_id: obj.trip
					}, {
						$inc: {
							dieselInVehicle: (-1 * obj.diesel_info.litre)
						}
					}
				);
			}

			return new TripsExpense(obj);
		}));

		let tripExpId;

		try {
			tripExpId = await TripsExpense.insertMany(tripExpense);
		} catch (e) {
			res.status(400).json({
				status: "Error",
				message: e,
				error: true,
				data: tripExpense
			});
			return;
		}

		const bulk = Trip.collection.initializeOrderedBulkOp();

		tripExpId.forEach(function (obj) {
			bulk.find({"_id": obj.trip}).updateOne({
				"$set": {"settled": true},
				"$addToSet": {"trip_expenses": obj._id}
			});
		});

		bulk.execute(async function (err, result) {
			if (err) {
				console.log(err);
				throw new Error('Trip Not Update');

			} else {

				if (!isTsNoGen) {
					let tsNo = await Trip.find({
						clientId: req.user.clientId,
						'advSettled.tsNo': {$exists: true}
					}, {'advSettled.tsNo': 1}).sort({'advSettled.tsNo': -1}).limit(1);
					if (Array.isArray(tsNo) && tsNo.length > 0) {
						tsNo = tsNo[0].advSettled.tsNo + 1;
					} else
						tsNo = 1;

					try {
						await Trip.updateMany(
							{
								_id: {
									$in: otherUtil.arrString2ObjectId(req.body.aTrips)
								}
							},
							{
								$set: {
									advSettled: {
										tsNo,
										creation: {
											date: Date.now(),
											user: req.user.full_name
										}
									}
								}
							},
							{
								new: true
							});
					} catch (err) {
						next(err);
					}

				}

				let aTripGroup;
				try {
					aTripGroup = await Trip.find(
						{
							clientId: req.user.clientId,
							_id:
								{
									$in: otherUtil.arrString2ObjectId(req.body.aTrips)
								}
						}).populate([
						{
							path: 'payments'
						}
					]);
				} catch (err) {
					next(err);
				}

				oRes.data =  Trip.eachTripSummary(aTripGroup);
				oRes.summary = await Trip.tripSummary(oRes.data);
				res.status(200).json(oRes);
			}


		});

	} catch (err) {
		next(err);
	}
}

async function markSettle(req, res, next) {
	try {

		const oRes = {
			status: "OK",
			message: 'Trip Marked Settled Successfully'
		};
		let foundSettleTrip;

		let aFoundTrips = await Trip.find(
			{
				clientId: req.user.clientId,
				'advSettled.tsNo': req.body.tsNo,
				'advSettled.isCompletelySettled': {$ne: true}
			}).populate([
			{
				path: 'payments'
			}
		]).lean();

		// if(aFoundTrips.length && aFoundTrips[0].vehicle)
		// 	foundSettleTrip =  await Trip.find({vehicle: aFoundTrips[0].vehicle._id, "markSettle.isSettled": true, "advSettled.tsNo": {$not:{$eq:aFoundTrips[0].advSettled.tsNo}},
		// 	}).sort({"markSettle.isSettled":-1}).lean();
		// if(foundSettleTrip && foundSettleTrip.length){
		// 	let from = new Date(new Date(foundSettleTrip[0].markSettle.date).setHours(0,0,0));
		// 	let to = new Date(new Date(foundSettleTrip[0].markSettle.date).setHours(23,59,59));
		// 	let lastSettleDate = new Date(req.body.date);
		// 	if(lastSettleDate >= from && lastSettleDate <= to)
		// 		throw new Error('Two RT of Same Driver can not be settled on Same Day');
		// }

		if (aFoundTrips.length) {
			for (let i = 0; i < aFoundTrips.length; i++) {
				let o = aFoundTrips[i];

				await Trip.updateOne({_id: o._id}, {
					$set: {
						'markSettle.isSettled': true,
						'markSettle.date': req.body.date,
						'markSettle.remark': req.body.remark,
						'markSettle.user_full_name': req.user.full_name,
					}
				});
			}
			if (oRes.status == 'OK') {
				oRes.data =  Trip.eachTripSummary(aFoundTrips);
				oRes.summary = await Trip.tripSummary(oRes.data);
				let tsNumber = oRes.data[0].advSettled.tsNo;
				// Start Notification
				//let totalKm = oRes.summary.totalKm;
				let oDelta = {};
				let alertTotalExp = 500000;
				let totalExpense = oRes.summary.netExpense; //
				if (totalExpense && totalExpense > alertTotalExp) {
					oDelta = {
						"Success": {
							count: totalExpense,
							status: "Success",
							message: "Totol Expense Exceeded from " + alertTotalExp
						}
					};
					alertSentToUser(req, tsNumber, oDelta);
				}


				let alertTotalExtraKm = 2000;
				let totalExtraKm = oRes.summary.totalExtraKm;//

				if (totalExtraKm && totalExtraKm > alertTotalExtraKm) {
					oDelta = {
						"Success": {
							count: totalExtraKm,
							status: "Success",
							message: "Totol Extra Km Exceeded from " + alertTotalExtraKm
						}
					};
					alertSentToUser(req, tsNumber, oDelta);
				}

				let alertAdvancePerKm = 45;
				let advancePerKm = (oRes.summary.netAdvance / oRes.summary.totalKm);//

				if (advancePerKm && advancePerKm > alertAdvancePerKm) {
					oDelta = {
						"Success": {
							count: advancePerKm,
							status: "Success",
							message: "Totol Advance Per Km Exceeded from " + alertAdvancePerKm
						}
					};
					alertSentToUser(req, tsNumber, oDelta);
				}

				let alertExpencePerKm = 40;
				let expencePerKm = (oRes.summary.netExpense / oRes.summary.totalKm);//

				if (expencePerKm && expencePerKm > alertExpencePerKm) {
					oDelta = {
						"Success": {
							count: expencePerKm,
							status: "Success",
							message: "Totol Expense Per Km Exceeded from " + alertExpencePerKm
						}
					};
					alertSentToUser(req, tsNumber, oDelta);
				}

				let alertBalancePerKm = 4;
				let balancePerKm = ((oRes.summary.netAdvance - oRes.summary.netExpense) / oRes.summary.totalKm);//

				if (balancePerKm && balancePerKm > alertBalancePerKm) {
					oDelta = {
						"Success": {
							count: balancePerKm,
							status: "Success",
							message: "Totol Balance Per Km Exceeded from " + alertBalancePerKm
						}
					};
					alertSentToUser(req, tsNumber, oDelta);
				}

				let alertTripBalance = 12000;
				let tripBalance = (oRes.summary.netAdvance - oRes.summary.netExpense - oRes.summary.driverPayment);//

				if (tripBalance && tripBalance > alertTripBalance) {
					oDelta = {
						"Success": {
							count: tripBalance,
							status: "Success",
							message: "Totol Trip Balance Exceeded from " + alertTripBalance
						}
					};
					alertSentToUser(req, tsNumber, oDelta);
				}
				// END


				res.status(200).json(oRes);
			} else {
				res.status(400).json(oRes);
			}
		} else {
			res.status(400).json({
				status: "Error",
				message: `No Trips of RT-${req.body.tsNo} found`,
				error: true
			});

		}

	} catch (err) {
		next(err);
	}
}

function alertSentToUser(req, tsNumber, oDelta) {
	try {
		logsService.addLog('TripSettle', {
			uif: "TripSettle-" + new Date().toLocaleString(),
			docId: req.user._id,
			category: 'Notification',
			delta: oDelta,
			action: {
				tsNo: tsNumber,
				addedUser: req.user.full_name,
				datetime: Date.now(),
				isActioned: true
			}
		}, req);
	} catch (e) {
		throw e;
	}
}

async function revertSettleCompletely(req, res, next) {

	try {

		let aFoundTrips = await Trip.find({
			clientId: req.user.clientId,
			'advSettled.tsNo': req.body.tsNo
		}).lean();

		let voucherId;
		let aVoucherVal = [];
		// Delete Voucher

		aVoucherVal = aFoundTrips[0].advSettled.aVoucher;
		for (let j = 0; j < aVoucherVal.length; j++) {
			voucherId = aVoucherVal[j];
			if (voucherId){
				try{
					await VoucherServiceV2.removeVoucher({_id: voucherId});
				}catch(e){
					console.error('no voucher on revert RT :'+req.body.tsNo,voucherId);
				}
			}
		}

		// Unlink All Trip with Associated with same tsno

		let aRts = [];
		for (let i = 0; i < aFoundTrips.length; i++) {
			aRts.push(aFoundTrips[i]._id);
		}
		let revertHis = {
			action : 'RT Revert',
			dt : new Date(),
			person : req.user.full_name,
			rmk: req.body.remark + '; adv: ' + req.body.adv + '; exp: ' + req.body.exp + '; dp: ' + req.body.dp,
			netAdvObj : req.body.netAdvObj,
			netExpObj : req.body.netExpObj,
		}

		let oTrpUPr = await Trip.updateMany({_id:{$in:aRts}},{
			$set:{'advSettled.isCompletelySettled': false,'onUpdDate':new Date()},
			$unset: {
				'advSettled.openingBal': 1,
				'advSettled.date': 1,
				'advSettled.systemDate': 1,
				'advSettled.aVoucher': 1,
				'advSettled.remark': 1,
				'advSettled.user_full_name': 1
			},
			$push: {
				his: revertHis
			},
		});

		await updateOCBalance({
			rtDate: aFoundTrips[0].markSettle.date,
			vehicle: aFoundTrips[0].vehicle._id,
			clientId: req.user.clientId,
			'tsNo': req.body.tsNo
		});

		return true;

	} catch (err) {
		next(err);
	}

}

// Account Manager Remark

async function accountMangerRemark(req, res, next) {

	try {

		let aFoundTrips = await Trip.find({
			clientId: req.user.clientId,
			'advSettled.tsNo': req.body.tsNo
		}).lean();

		for (let i = 0; i < aFoundTrips.length; i++) {

			await Trip.update(
				{
					'_id': aFoundTrips[i]._id
				},
				{
					$set: {
						'AccManagerRmk.user_full_name': req.user.full_name,
						'AccManagerRmk.date': new Date(),
						'AccManagerRmk.remark': req.body.remark
					}
				}
			);
		}

		return true;

	} catch (err) {
		next(err);
	}

}

// END

async function settleCompletely(req, res, next) {
	try {

		const oRes = {
			status: "OK",
			message: 'Trip Completely Settled Successfully'
		};

		let aFoundTrips,foundSettleTrip, summaryData, openingBal;

		try {
			aFoundTrips = await Trip.find(
				{
					clientId: req.user.clientId,
					'advSettled.tsNo': req.body.tsNo
				}).populate([
				{
					path: 'payments',
					model: Voucher
				}
			]);

		} catch (e) {
			res.status(400).json({
				status: "Error",
				message: e,
				error: true,
				data: 'No Trip found'
			});
			return;
		}
		if(!aFoundTrips.length)
			throw new Error('No Trip found');

		let calOCBalance = {
			clientId: req.user.clientId,
			vehicle: req.body.vehicle,
			rtDate: aFoundTrips[0].markSettle.date || new Date(),
			tsNo: req.body.tsNo
		};

		if (aFoundTrips.length && !aFoundTrips[0].advSettled.isCompletelySettled) {
			try {
				summaryData = await calculateOCBalance(calOCBalance);
			} catch (e) {
				return res.status(500).json({
					'status': 'ERROR',
					'message': e.toString(),
				});
			}
		}
		if(summaryData){
			openingBal = summaryData.openCloseBal.driver.closing || 0;
		}
		// if(aFoundTrips.length && aFoundTrips[0].vehicle)
		// 	foundSettleTrip =  await Trip.find({vehicle: aFoundTrips[0].vehicle._id, "advSettled.isCompletelySettled": true
		// 	}).sort({"advSettled.systemDate":-1}).lean();
		// if(foundSettleTrip && foundSettleTrip.length){
		// 	let from = new Date(new Date(foundSettleTrip[0].markSettle.date).setHours(0,0,0));
		// 	let to = new Date(new Date(foundSettleTrip[0].markSettle.date).setHours(23,59,59));
		// 	let lastSettleDate = new Date(aFoundTrips[0].markSettle.date);
		// 	if(lastSettleDate >= from && lastSettleDate <= to)
		// 		throw new Error('Two RT of Same Driver can not be settled on Same Day');
		// }

		if (aFoundTrips.length) {
			if (!aFoundTrips[0].advSettled.isCompletelySettled) {

				let aVoucher = [];
				// creating voucher for advance and settlement

				for (let i = 0; i < req.body.aVoucher.length; i++) {

					let ptr = req.body.aVoucher[i];

					let _id = mongoose.Types.ObjectId();
					await VoucherServiceV2.formatPayloadAndAdd({
						type: "Journal",
						clientId: req.user.clientId,
						vT: ptr.vT,
						refNo: ptr.refNo,
						// stationaryId: obj.stationaryId,
						isEditable: false,
						narration: ptr.narration,
						date: new Date(req.body.date),
						// branch: obj.branch,
						createdBy: req.body.created_by_name,

						from: ptr.from,
						to: ptr.to,
						amount: ptr.amount,
						_id
					});

					aVoucher.push(_id);
				}

				for (let k in aFoundTrips)
					if (aFoundTrips.hasOwnProperty(k)) {
						let o = aFoundTrips[k];
						o.set({
							'advSettled.openingBal': openingBal || req.body.openingBal,
							'advSettled.isCompletelySettled': true,
							'advSettled.date': new Date(req.body.date),
							'advSettled.systemDate': new Date(),
							'advSettled.aVoucher': aVoucher,
							'advSettled.remark': req.body.remark,
							'advSettled.user_full_name': req.user.full_name
						});
						await o.save();
					}

				if (req.body.date) {
					try {

						await updateOCBalance(calOCBalance);

					} catch (e) {
						return res.status(500).json({
							'status': 'ERROR',
							'message': e.toString(),
						});
					}
				}

				req.body.ids = aVoucher;
				req.body.skipReturn = true;
				let aVch = await VoucherServiceV2.importAccounts(req, res, next);


				oRes.data =  Trip.eachTripSummary(aFoundTrips);
				oRes.summary = await Trip.tripSummary(oRes.data);
				res.status(200).json(oRes);

			} else {
				res.status(400).json({
					status: "Error",
					message: `Trips of RT-${req.body.tsNo} Already Settled`,
					error: true
				});

			}
		} else {
			res.status(400).json({
				status: "Error",
				message: `No Trips of RT-${req.body.tsNo} found`,
				error: true
			});

		}

	} catch (err) {
		next(err);
	}
}

const createBudgetFilterFromRequestObj = (reqObj, defaultKeys) => {
	defaultKeys = {
		dateKey: defaultKeys.dateKey || 'advanceBudget.created_at',
		typeKey: defaultKeys.typeKey || 'advanceBudget.advanceType',
	};
	const filter = {};
	if (reqObj.query.startDate) {
		filter[defaultKeys.dateKey] = filter[defaultKeys.dateKey] || {};
		filter[defaultKeys.dateKey]['$gte'] = new Date(reqObj.query.startDate);
	}
	if (reqObj.query.endDate) {
		filter[defaultKeys.dateKey] = filter[defaultKeys.dateKey] || {};
		filter[defaultKeys.dateKey]['$lte'] = new Date(reqObj.query.endDate);
	}
	if (reqObj.query.type) {
		if (Array.isArray(reqObj.query.type) && reqObj.query.type.length > 0) {
			filter[defaultKeys.typeKey] = {$in: reqObj.query.type};
		} else {
			filter[defaultKeys.typeKey] = {$eq: reqObj.query.type};
		}
	}
	return filter;
};

const getApprovedBudget = async (req, res, next) => {
	try {
		const aggr = [
			{
				$match: {
					clientId: req.user.clientId,
					'advanceBudget.0': {$exists: true}
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
				$unwind: {
					path: '$driver',
					preserveNullAndEmptyArrays: true
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
				$unwind: {
					path: '$vehicle',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$unwind: {
					path: '$advanceBudget'
				}
			},
			{
				$addFields: {
					'advanceBudget.trip_no': '$trip_no',
					'advanceBudget.vehicle_no': '$vehicle_no',
					'advanceBudget.vehicle_ownership': '$vehicle.ownershipType',
					'advanceBudget.driver_name': '$driver.name',
					'advanceBudget.driver_no': '$driver.prim_contact_no',
					'advanceBudget.route_name': '$route_name'
				}
			},
			{
				$lookup: {
					from: 'accountvouchers',
					localField: 'advanceBudget.voucher',
					foreignField: '_id',
					as: 'advanceBudget.voucher'
				}
			},
			{
				$unwind: {
					path: '$advanceBudget.voucher',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'advanceBudget.voucher.to',
					foreignField: '_id',
					as: 'advanceBudget.voucher.to'
				}
			},
			{
				$unwind: {
					path: '$advanceBudget.voucher.to',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'advanceBudget.voucher.from',
					foreignField: '_id',
					as: 'advanceBudget.voucher.from'
				}
			},
			{
				$unwind: {
					path: '$advanceBudget.voucher.from',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$replaceRoot: {
					newRoot: '$advanceBudget'
				}
			},
			{
				$match: createBudgetFilterFromRequestObj(req, {dateKey: 'created_at', typeKey: 'advanceType'})
			},
			{
				$group: {
					_id: null,
					allAdvanceBudgets: {
						$push: "$$ROOT"
					}
				}
			},
		];
		//const data = await Trip.aggregate(aggr);
		let oQuery = {aggQuery: aggr, no_of_docs: 10000};
		let data = await serverSidePage.requestData(Trip, oQuery);
		if (data.length > 0) {
			if (req.query.downloadType === 'xlsx') {
				ReportExelService.generateApprovedBudgetReport(data[0].allAdvanceBudgets, req.user.clientId, (report) => {
					return res.status(200).json({
						status: "SUCCESS",
						message: "Trips approved budget report generated",
						data: report.url
					});
				});
			} else if (req.query.downloadType === 'tally-xml') {
				const xml = new XML()
					.for('TripApprovedPayments')
					.use(data[0].allAdvanceBudgets)
					.createXML()
					.download()
					.then(url => {
						return res.status(200).json({
							status: "SUCCESS",
							message: "Trip approved payments xml generated",
							data: url
						});
					});
			} else {
				return res.status(200).json({
					status: "SUCCESS",
					message: "Trip approved payments found",
					data: data[0].allAdvanceBudgets
				});
			}
		} else {
			return res.status(200).json({
				status: "SUCCESS",
				message: "No Trip approved payments",
				data: data
			});
		}
	} catch (e) {
		return res.status(500).json({
			status: "ERROR",
			message: "Something went wrong",
			errorMessage: e.toString()
		});
	}

};

const findByAdvanceDate = async (req, res, next) => {
	if (!req.body.vehicle_no || !req.body.advanceDate) {
		return res.status(200).json({
			status: 'ERROR',
			message: 'Provide vehicle_no and advanceDate both in body',
		});
	}
	let tripOnThatVehicle = await Trip.findByAdvanceDate({
		clientId: req.user.clientId,
		vehicle_no: req.body.vehicle_no,
		advanceDate: req.body.advanceDate,
	});
	return res.status(200).json({
		status: 'SUCCESS',
		message: 'Trip found',
		data: tripOnThatVehicle
	});
};

const advAddTrip = async (req, res, next) => {

	/*
	* This controller receive 'TsNo (round Trip no/ trip settlement no)'
	* it add the a trip to particular tsNo group(round Trip)
	* it checks that the particular 'Trip' should not belong to other tsNo group
	* it checks that the particular 'Trip' should not already belong same tsNo group
	* */

	try {

		if (!req.body.tsNo) {
			return res.status(400).json({
				status: 'Error',
				message: 'Please Provide RT Number',
			});
		}

		if (!req.body.trip) {
			return res.status(400).json({
				status: 'Error',
				message: 'No Trip Provided',
			});
		}

		let tsTrip = await Trip.findOne(
			{
				clientId: req.user.clientId,
				'advSettled.tsNo': req.body.tsNo
			});

		if (tsTrip.advSettled.isCompletelySettled) {
			return res.status(400).json({
				status: 'Error',
				message: `The RT-${req.body.tsNo} group is already settled. So Trip cannot be added.`,
			});
		}

		let oTrip = await Trip.findOne(
			{
				clientId: req.user.clientId,
				_id: otherUtil.arrString2ObjectId(req.body.trip)
			});

		if (!oTrip._id) {
			return res.status(400).json({
				status: 'Error',
				message: 'No Trip Found',
			});
		}

		if (oTrip.advSettled.tsNo) {
			return res.status(400).json({
				status: 'Error',
				message: `This trip Already belong to RT-${oTrip.advSettled.tsNo}`,
			});
		}

		const oRes = {
			status: "OK",
			message: 'Trip Added Successfully'
		};

		oTrip.advSettled = tsTrip.advSettled;
		oTrip.markSettle = tsTrip.markSettle;
		oTrip.documents = tsTrip.documents;
		oTrip.settled = tsTrip.settled;

		oTrip.save();

		let aFoundTrips = await Trip.find(
			{
				clientId: req.user.clientId,
				'advSettled.tsNo': req.body.tsNo
			}).populate([
			{
				path: 'payments'
			}
		]);
		oRes.data =  Trip.eachTripSummary(aFoundTrips);
		oRes.summary = await Trip.tripSummary(oRes.data);

		res.status(200).json(oRes);

	} catch (err) {
		next(err);
	}
};

// Added By Harikesh - Dated: 19-11-2019
const expenseDeleteTrip = async (req, res, next) => {

	try {
		await TripExpense.remove({_id: req.body.expId});
		return true;
	} catch (err) {
		winston.error(err.message || err.toString());
		next(err);
	}
};

const pullTripExp = async (req, res, next) => {

	try {
		await Trip.findOneAndUpdate(
			{
				clientId: req.user.clientId,
				_id: req.body.tripId
			}, {
				$pull: {
					trip_expenses: req.body.expId
				}
			});

		return true;
	} catch (err) {
		winston.error(err.message || err.toString());
		next(err);
	}
};

const advDeleteTrip = async (req, res, next) => {

	/*
	* This controller receive 'TsNo (round Trip no/ trip settlement no)' as paramString and 'tripNo as query param'
	* it delete a trip from particular tsNo group(round Trip)
	* */

	try {

		if (!req.body.tsNo) {
			return res.status(400).json({
				status: 'Error',
				message: 'Please Provide RT Number',
			});
		}

		if (!req.body.trip) {
			return res.status(400).json({
				status: 'Error',
				message: 'No Trip Provided',
			});
		}

		let tsTrip = await Trip.findOne(
			{
				clientId: req.user.clientId,
				'advSettled.tsNo': req.body.tsNo
			});

		if (tsTrip.advSettled.isCompletelySettled) {
			return res.status(400).json({
				status: 'Error',
				message: `The RT-${req.body.tsNo} group is already settled. So Trip cannot be removed.`,
			});
		}

		let oTrip = await Trip.findOne(
			{
				clientId: req.user.clientId,
				_id: otherUtil.arrString2ObjectId(req.body.trip)
			});

		if (!oTrip._id) {
			return res.status(400).json({
				status: 'Error',
				message: 'No Trip Found',
			});
		}

		if (!oTrip.advSettled.tsNo) {
			return res.status(400).json({
				status: 'Error',
				message: `This Trip doesn't belong to RT-${req.body.tsNo} Group`,
			});
		}

		const oRes = {
			status: "OK",
			message: 'Trip Removed Successfully'
		};

		await Trip.findOneAndUpdate(
			{
				clientId: req.user.clientId,
				_id: otherUtil.arrString2ObjectId(req.body.trip)
			}, {
				$unset: {
					'advSettled.tsNo': '',
					// 'markSettle': '',
					'documents': ''
				}
			});

		let aFoundTrips = await Trip.find(
			{
				clientId: req.user.clientId,
				'advSettled.tsNo': req.body.tsNo
			}).populate([
			{
				path: 'payments'
			}
		]);
		oRes.data =  Trip.eachTripSummary(aFoundTrips);
		oRes.summary = await Trip.tripSummary(oRes.data);

		res.status(200).json(oRes);

	} catch (err) {
		winston.error(err.message || err.toString());
		next(err);
	}
};

const vendorAdvance = async (req, res, next) => {
	try {
		let aTrip = req.body;
		let stationaryId = aTrip[0].stationaryId;
		let aLinkPayment = [];

		//start vch
		let oVch = {ledgers: []}, ledger = {}, crAmt = 0, drAmt = 0;

		for (let i = 0; i < aTrip.length; i++) {
			if (i == 0) {//extract voucher level info
				oVch.refNo = aTrip[i].reference_no;
				oVch.date = aTrip[i].vendorPayment.paymentDate;
				oVch.type = aTrip[i].vType || 'Payment';
				oVch.vT = aTrip[i].advanceType;
				oVch.bSer = "Transportation";
				oVch.clientId = req.user.clientId;
				oVch.stationaryId = aTrip[i].stationaryId;
				oVch.isEditable = false;
				oVch.narration = aTrip[i].narration;
				oVch.branch = aTrip[i].branch;
				oVch.createdBy = req.user.full_name || req.user.user_full_name;
				oVch.paymentMode = aTrip[i].vendorPayment.paymentMode;
				oVch.paymentRef = aTrip[i].vendorPayment.paymentRef;
				oVch.paymentDate = aTrip[i].vendorPayment.paymentDate;
			}

			if (ledger[aTrip[i].account_data.from]) {
				ledger[aTrip[i].account_data.from].amount = ledger[aTrip[i].account_data.from].amount + aTrip[i].amount;
				crAmt = crAmt + aTrip[i].amount;
				if (aTrip[i].vendorPayment.paymentMode && ['Diesel', 'Broker'].indexOf(aTrip[i].vendorPayment.paymentMode) + 1) {
					let oBill = {
						billNo: aTrip[i].reference_no,
						billType: 'New Ref',
						amount: aTrip[i].amount,
						remAmt: aTrip[i].amount
					};
					ledger[aTrip[i].account_data.from]["bills"].push(oBill);
				}
			} else {
				ledger[aTrip[i].account_data.from] = {
					account: aTrip[i].account_data.from,
					amount: aTrip[i].amount,
					cRdR: "CR",
					lName: aTrip[i].account_data.fromName,
					bills: []
				};
				ledger[aTrip[i].account_data.from].amount = aTrip[i].amount;
				crAmt = crAmt + aTrip[i].amount;
				if (aTrip[i].vendorPayment.paymentMode && ['Diesel', 'Broker'].indexOf(aTrip[i].vendorPayment.paymentMode) + 1) {
					let oBill = {
						billNo: aTrip[i].reference_no,
						billType: 'New Ref',
						amount: aTrip[i].amount,
						remAmt: aTrip[i].amount
					};
					ledger[aTrip[i].account_data.from]["bills"].push(oBill);
				}
			}
			if (ledger[aTrip[i].account_data.to]) {
				ledger[aTrip[i].account_data.to].amount = ledger[aTrip[i].account_data.to].amount + aTrip[i].amount;
				drAmt = drAmt + aTrip[i].amount;
				if (aTrip[i].billNo) {
					let oBill = {
						billNo: aTrip[i].billNo,
						billType: aTrip[i].billType,
						amount: aTrip[i].amount,
						remAmt: aTrip[i].billType == "New Ref" ? aTrip[i].amount : 0
					};
					ledger[aTrip[i].account_data.to]["bills"].push(oBill);
				}
			} else {
				ledger[aTrip[i].account_data.to] = {
					account: aTrip[i].account_data.to,
					amount: aTrip[i].amount,
					cRdR: "DR",
					lName: aTrip[i].account_data.toName,
					bills: []
				};
				ledger[aTrip[i].account_data.to].amount = aTrip[i].amount;
				drAmt = drAmt + aTrip[i].amount;
				if (aTrip[i].billNo) {
					let oBill = {
						billNo: aTrip[i].billNo,
						billType: aTrip[i].billType,
						amount: aTrip[i].amount,
						remAmt: aTrip[i].billType == "New Ref" ? aTrip[i].amount : 0
					};
					ledger[aTrip[i].account_data.to]["bills"].push(oBill);
				}
			}
		}

		if (crAmt !== drAmt) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Total of CR and DR amount not matched'
			});
		}

		for (let le in ledger) {
			oVch.ledgers.push(ledger[le]);
		}

		let aVch = await VoucherServiceV2.addVoucherAsync(oVch);

		//vch work done

		let aAdvance = aTrip.map((oTrip, index) => {
			let _id = mongoose.Types.ObjectId();
			let oAdv = {
				...oTrip,
				clientId: req.user.clientId,
				_id,
				bill_no: oTrip.billNo,
				created_at: new Date(),
				created_by: req.user._id,
				from_account: oTrip.account_data.from,
				to_account: oTrip.account_data.to,
				vendorPayment: oTrip.vendorPayment,
				//voucher: aVch[index].voucher._id,
				voucher: aVch && aVch[0] && aVch[0].voucher._id
			};

			if (oTrip.linkPayment)
				aLinkPayment.push(oAdv);

			return new TripAdvances(oAdv);
		});

		if (stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'tripadvances',
				stationaryId: stationaryId,
			}, 'used');
		}

		let insertAdvs = await TripAdvances.insertMany(aAdvance);

		let tripUpd = await Trip.bulkWrite(aAdvance.map(t => {
			return {
				updateOne: {
					filter: {_id: otherUtil.arrString2ObjectId(t.trip)},
					update: {
						// $set: {
						// 	vendorAdvance: {
						// 		from: t.account_data.from,
						// 		to: t.account_data.to,
						// 		amount: t.amount,
						// 	},
						// },
						$addToSet: {
							advanceBudget: t._id
						}
					},
					upsert: false
				}
			}
		}));

		// grNumber
		// gr_id
		// vendorName

		for (let oPay of aLinkPayment) {
			await GR.updateOne({
				_id: oPay.gr_id
			}, {
				$push: {
					"moneyReceipt.collection": {
						mrOffice: oPay.branch.name,
						mrDate: oPay.vendorPayment.paymentDate,
						mrNo: `MR-${oPay.grNumber}`,
						mrAmount: oPay.amount,
						paymentMode: oPay.vendorPayment.paymentMode,
						paymentRef: oPay.vendorPayment.paymentRef,
						paymentDate: oPay.vendorPayment.paymentDate,
						partyName: oPay.vendorName,
						paymentId: oPay._id
					},
				},
				$set: {
					'moneyReceipt.balanceFreight': oPay.balFr,
					'moneyReceipt.totalMrAmount': oPay.totMr
				}
			});
		}

		return res.status(200).json({
			status: 'OK',
			message: 'Done',
		});
	} catch (e) {
		winston.error(e.message || e.toString());
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
};

const vendorPaymentEdit = async (req, res, next) => {
	try {

		let aTrip = req.body.aTrip;
		let updateManyTripQuery = [];
		let updateManyAdvQuery = [];
		let updateManyGrQuery = [];
		let refNo = req.body.refNo;
		let aNewLinkPayment = [];

		let foundAccountVch = await VoucherServiceV2.findVoucherByQueryAsync({
			refNo: new RegExp('^' + refNo + '$'),
			clientId: req.user.clientId,
			deleted: false
		}, {_id: 1, acImp: 1});

		if (foundAccountVch.find(o => o.acImp.st))
			throw new Error('Edit not possible. Some or All Voucher are Imported to Account');

		let newStationaryId = aTrip[0].stationaryId;
		let unsetQuery = {};
		let setQuery = {};

		if (newStationaryId) {
			setQuery.stationaryId = newStationaryId;
		} else {
			unsetQuery = {
				$unset: {
					stationaryId: 1
				}
			};
		}

		//start vch
		let oVch = {ledgers: []}, ledger = {}, crAmt = 0, drAmt = 0;
		for (let i = 0; i < aTrip.length; i++) {
			if (i == 0) {//extract voucher level info
				oVch.refNo = aTrip[i].reference_no;
				oVch.date = aTrip[i].vendorPayment.paymentDate;
				oVch.type = aTrip[i].vType || 'Payment';
				oVch.vT = aTrip[i].advanceType;
				oVch.bSer = "Transportation";
				oVch.clientId = req.user.clientId;
				oVch.stationaryId = aTrip[i].stationaryId;
				oVch.isEditable = false;
				oVch.narration = aTrip[i].narration;
				oVch.branch = aTrip[i].branch;
				oVch.createdBy = req.user.full_name || req.user.user_full_name;
				oVch.paymentMode = aTrip[i].vendorPayment.paymentMode;
				oVch.paymentRef = aTrip[i].vendorPayment.paymentRef;
				oVch.paymentDate = aTrip[i].vendorPayment.paymentDate;
			}
			if (ledger[aTrip[i].account_data.from]) {
				ledger[aTrip[i].account_data.from].amount = ledger[aTrip[i].account_data.from].amount + aTrip[i].amount;
				crAmt = crAmt + aTrip[i].amount;
				if (aTrip[i].vendorPayment.paymentMode && ['Diesel', 'Broker'].indexOf(aTrip[i].vendorPayment.paymentMode) + 1) {
					let oBill = {
						billNo: aTrip[i].reference_no,
						billType: 'New Ref',
						amount: aTrip[i].amount,
						remAmt: aTrip[i].amount
					};
					ledger[aTrip[i].account_data.from]["bills"].push(oBill);
				}
			} else {
				ledger[aTrip[i].account_data.from] = {
					account: aTrip[i].account_data.from,
					amount: aTrip[i].amount,
					cRdR: "CR",
					lName: aTrip[i].account_data.fromName,
					bills: []
				};
				ledger[aTrip[i].account_data.from].amount = aTrip[i].amount;
				crAmt = crAmt + aTrip[i].amount;
				if (aTrip[i].vendorPayment.paymentMode && ['Diesel', 'Broker'].indexOf(aTrip[i].vendorPayment.paymentMode) + 1) {
					let oBill = {
						billNo: aTrip[i].reference_no,
						billType: 'New Ref',
						amount: aTrip[i].amount,
						remAmt: aTrip[i].amount
					};
					ledger[aTrip[i].account_data.from]["bills"].push(oBill);
				}
			}
			if (ledger[aTrip[i].account_data.to]) {
				ledger[aTrip[i].account_data.to].amount = ledger[aTrip[i].account_data.to].amount + aTrip[i].amount;
				drAmt = drAmt + aTrip[i].amount;
				if (aTrip[i].billNo) {
					let oBill = {
						billNo: aTrip[i].billNo,
						billType: aTrip[i].billType,
						amount: aTrip[i].amount,
						remAmt: aTrip[i].billType == "New Ref" ? aTrip[i].amount : 0
					};
					ledger[aTrip[i].account_data.to]["bills"].push(oBill);
				}
			} else {
				ledger[aTrip[i].account_data.to] = {
					account: aTrip[i].account_data.to,
					amount: aTrip[i].amount,
					cRdR: "DR",
					lName: aTrip[i].account_data.toName,
					bills: []
				};
				ledger[aTrip[i].account_data.to].amount = aTrip[i].amount;
				drAmt = drAmt + aTrip[i].amount;
				if (aTrip[i].billNo) {
					let oBill = {
						billNo: aTrip[i].billNo,
						billType: aTrip[i].billType,
						amount: aTrip[i].amount,
						remAmt: aTrip[i].billType == "New Ref" ? aTrip[i].amount : 0
					};
					ledger[aTrip[i].account_data.to]["bills"].push(oBill);
				}
			}
		}
		if (crAmt !== drAmt) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Total of CR and DR amount not matched'
			});
		}
		for (let le in ledger) {
			oVch.ledgers.push(ledger[le]);
		}
		if (foundAccountVch && foundAccountVch[0]) {
			oVch._id = foundAccountVch && foundAccountVch[0] && foundAccountVch[0]._id;
			let aVch = await VoucherServiceV2.editVoucher(oVch);
		} else {
			throw new Error('No Voucher found');
		}

		//vch work done

		let foundAdv = await TripAdvances.find({
			reference_no: refNo,
			clientId: req.user.clientId,
			isCancelled: {
				$not: {
					$eq: true
				}
			},
		}).lean();

		for (let i = 0; i < foundAdv.length; i++) {
			let oAdv = foundAdv[i];
			let matchIndex = aTrip.findIndex(o => o.advanceId === oAdv._id.toString());
			if (matchIndex + 1) {
				let matchTrip = aTrip[matchIndex];
				aTrip.splice(matchIndex, 1);
				if (matchTrip.linkPayment)
					updateManyGrQuery.push({
						updateOne: {
							filter: {
								_id: matchTrip.gr_id,
								'moneyReceipt.collection.paymentId': oAdv._id
							},
							update: {
								$set: {
									"moneyReceipt.collection.$": {
										mrOffice: matchTrip.branch.name,
										mrDate: matchTrip.vendorPayment.paymentDate,
										mrNo: `MR-${matchTrip.grNumber}`,
										mrAmount: matchTrip.amount,
										paymentMode: matchTrip.vendorPayment.paymentMode,
										paymentRef: matchTrip.vendorPayment.paymentRef,
										paymentDate: matchTrip.vendorPayment.paymentDate,
										partyName: matchTrip.vendorName,
										paymentId: oAdv._id
									},
									'moneyReceipt.balanceFreight': matchTrip.balFr,
									'moneyReceipt.totalMrAmount': matchTrip.totMr
								}
							}
						}
					});
				updateManyAdvQuery.push({
					updateOne: {
						filter: {_id: oAdv._id},
						update: {
							...unsetQuery,
							$set: {
								voucher: oVch._id,
								amount: matchTrip.amount,
								from_account: matchTrip.account_data.from,
								to_account: matchTrip.account_data.to,
								reference_no: matchTrip.reference_no,
								date: matchTrip.vendorPayment.paymentDate,
								bill_no: matchTrip.billNo,
								'vendorPayment': matchTrip.vendorPayment,
								'dieseInfo': matchTrip.dieseInfo,
								'vType': matchTrip.vType,
								...setQuery
							}
						},
						upsert: false
					}
				});
			} else {
				let fdGR = await GR.findOne({
					'moneyReceipt.collection.paymentId': oAdv._id
				}, {
					'moneyReceipt.collection.$': 1,
					"_id": 1
				}).lean();

				if (fdGR)
					updateManyGrQuery.push({
						updateOne: {
							filter: {
								_id: fdGR._id,
								'moneyReceipt.collection.paymentId': oAdv._id
							},
							update: {
								$pull: {
									'moneyReceipt.collection': {
										paymentId: oAdv._id
									}
								},
								$inc: {
									'moneyReceipt.balanceFreight': fdGR.moneyReceipt.collection[0].mrAmount,
									'moneyReceipt.totalMrAmount': -1 * fdGR.moneyReceipt.collection[0].mrAmount
								}
							}
						}
					});
				updateManyTripQuery.push({
					updateOne: {
						filter: {_id: oAdv.trip},
						update: {
							$pull: {
								advanceBudget: oAdv._id
							}
						},
						upsert: false
					}
				});

				updateManyAdvQuery.push({
					deleteOne: {
						filter: {_id: oAdv._id}
					}
				})
			}
		}

		for (let i = 0; i < aTrip.length; i++) { // vch to add
			let oTrip = aTrip[i];
			let advanceMongoId = mongoose.Types.ObjectId();
			await TripAdvances.create({
				...oTrip,
				clientId: req.user.clientId,
				_id: advanceMongoId,
				created_at: new Date(),
				created_by: req.user._id,
				from_account: oTrip.account_data.from,
				to_account: oTrip.account_data.to,
				vendorPayment: oTrip.vendorPayment,
				dieseInfo: oTrip.dieseInfo,
				voucher: oVch._id,
				bill_no: oTrip.billNo,
				stationaryId: newStationaryId
			});
			if (oTrip.linkPayment)
				updateManyGrQuery.push({
					updateOne: {
						filter: {
							_id: oTrip.gr_id
						},
						update: {
							$push: {
								"moneyReceipt.collection": {
									mrOffice: oTrip.branch.name,
									mrDate: oTrip.vendorPayment.paymentDate,
									mrNo: `MR-${oTrip.grNumber}`,
									mrAmount: oTrip.amount,
									paymentMode: oTrip.vendorPayment.paymentMode,
									paymentRef: oTrip.vendorPayment.paymentRef,
									paymentDate: oTrip.vendorPayment.paymentDate,
									partyName: oTrip.vendorName,
									paymentId: advanceMongoId
								},
							},
							$set: {
								'moneyReceipt.balanceFreight': oTrip.balFr,
								'moneyReceipt.totalMrAmount': oTrip.totMr
							}
						}
					}
				});
			updateManyTripQuery.push({
				updateOne: {
					filter: {_id: oTrip.trip},
					update: {
						$addToSet: {
							advanceBudget: advanceMongoId
						}
					},
					upsert: false
				}
			});
		}

		updateManyTripQuery.length && await Trip.bulkWrite(updateManyTripQuery);
		updateManyAdvQuery.length && await TripAdvances.bulkWrite(updateManyAdvQuery);
		updateManyGrQuery.length && await GR.bulkWrite(updateManyGrQuery);

		return res.status(200).json({
			status: 'OK',
			message: 'Done',
		});

	} catch (e) {
		winston.error(e.message || e.toString());
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
			data: e,
		});
	}
};

const vendorPaymentDelete = async (req, res, next) => {
	try {

		let refNo = req.body.refNo;
		let clientId = req.user.clientId;

		// fetching the voucher and validating them before deletion
		let foundVch = await VoucherServiceV2.findVoucherByQueryAsync({
			refNo: new RegExp('^' + refNo + '$'),
			clientId: req.user.clientId,
			deleted: false
		}, {_id: 1, voucher: 1});

		if (!foundVch.every(o => !o.voucher))
			throw new Error('Vouchers are already Imported to A/c');

		// fetching the Trip Advance and validating them before deletion
		let foundAdv = await TripAdvances.find({
			reference_no: refNo,
			clientId,
			isCancelled: {
				$not: {
					$eq: true
				}
			},
		}).lean();

		// Deletion code start
		// 1) freeing the stationary

		let foundStationary = await billStationaryService.findByRefAndType({
			bookNo: refNo,
			type: 'Ref No',
			clientId
		});

		if (foundStationary) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'tripadvances',
				docId: foundAdv.map(o => o._id.toString()).join(', '),
				stationaryId: foundStationary._id,
			}, 'cancelled');
		}

		// 2) removing the plain voucher
		foundVch[0] && await VoucherServiceV2.removeVoucher({_id: foundVch[0]._id, clientId});

		// 3) removing the advances and pulling the advance id from the linked trip

		for (let k in foundAdv) {

			let oAdv = foundAdv[k];

			if (oAdv.trip)
				await Trip.updateOne({_id: oAdv.trip}, {$pull: {advanceBudget: oAdv._id}});

			await TripAdvances.remove({_id: oAdv._id});

			await logsService.add('tripadvances', {
				uif: oAdv.reference_no,
				category: 'delete',
				nData: {},
				oData: oAdv,
			}, req);
		}

		return res.status(200).json({
			status: 'OK',
			message: 'Deleted Successfully.',
		});
	} catch (e) {
		winston.error(e.message || e.toString());
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}

};

async function plReport(req, res, next) {
	let oPFil = constructFilters(req);
	const aggrQuery = [
		{$match: oPFil},
		{$sort: {_id: -1}},
		{
			$project: {
				"purchaseAmount": "$vendorDeal.total_expense",  //purchaseAmount
				"balance": "$vendorDeal.toPay",  // balance
				"gr": 1,
				"vehicle_no": 1,
				"trip_no": 1,
				"vehicle": 1,  //vendor_name //transporter
				"customer": 1,
				allocation_date: 1,
				advanceBudget: 1,
				advanceF: "$vendorDeal.advance"

			}
		},
		{
			"$unwind": {
				"path": "$gr",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			"$lookup": {
				"from": "tripgrs",
				"localField": "gr",
				"foreignField": "_id",
				"as": "gr"
			}
		},
		{
			"$unwind": {
				"path": "$gr",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$project: {
				trip_no: 1,
				vehicle_no: 1,
				destination: "$gr.acknowledge.destination",
				grNumber: "$gr.grNumber",
				saleAmount: "$gr.basicFreight",
				"purchaseAmount": 1,
				"balance": 1,
				"customer": "$gr.customer",
				"vehicle": 1,
				allocation_date: 1,
				"advanceBudget": 1,
				advanceF: 1
			}
		},
		{
			"$lookup": {
				"from": "customers",
				"localField": "customer",
				"foreignField": "_id",
				"as": "customer"
			}
		},
		{
			"$unwind": {
				"path": "$customer",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$project: {
				trip_no: 1,
				"customerName": "$customer.name",
				vehicle_no: 1,
				destination: 1,
				grNumber: 1,
				saleAmount: 1,
				"purchaseAmount": 1,
				"balance": 1,
				"vehicle": 1,
				allocation_date: 1,
				"advanceBudget": 1,
				advanceF: 1
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
				"path": "$vehicle",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			"$unwind": {
				"path": "$advanceBudget",
				"preserveNullAndEmptyArrays": true
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
//      {
//         "$unwind": {
//           "path": "$advanceBudget",
//           "preserveNullAndEmptyArrays": true
//         }
//   },
		{
			$project: {
				trip_no: 1,
				"customerName": 1,
				vehicle_no: 1,
				destination: 1,
				grNumber: 1,
				saleAmount: 1,
				"purchaseAmount": 1,
				"balance": 1,
				vendorName: "$vehicle.vendor_name",
				month: {$month: "$allocation_date"},
				advanceBudget: 1,
				allocation_date: 1,
				advanceF: 1
				//  advanceType : "$advanceBudget.advanceType"
			}
		},
		{
			$addFields: {
				month: {
					$let: {
						vars: {
							monthsInString: [, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
						},
						in: {
							$arrayElemAt: ['$$monthsInString', '$month']
						}
					}
				}
			}
		},
		// {
		// 	"$addFields": {
		// 		"advance": {
		// 			"$reduce": {
		// 				"input": "$advanceBudget",
		// 				"initialValue": 0,
		// 				"in": {
		// 					"$add": [
		// 						"$$value",
		// 						{
		// 							"$cond": [
		// 								{
		// 									"$eq": [
		// 										"$$this.advanceType",
		// 										"Vendor Advance"
		// 									]
		// 								},
		// 								{
		// 									"$ifNull": [
		// 										"$$this.amount",
		// 										0
		// 									]
		// 								},
		// 								0
		// 							]
		// 						}
		// 					]
		// 				}
		// 			}
		// 		}
		// 	}
		// },
		// {
		// 	$project:{
		// 		trip_no:1,
		// 		"customerName": 1,
		// 		vehicle_no:1,
		// 		destination: 1,
		// 		grNumber : 1,
		// 		saleAmount : 1,
		// 		"purchaseAmount" :1,
		// 		"balance":1,
		// 		vendorName: 1,
		// 		month : {$month : "$allocation_date"},
		// 		advance:1,
		// 		allocation_date:1,
		// 		advanceF:1
		// 		//  advanceType : "$advanceBudget.advanceType"
		// 	}
		// }
	];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let getData = await serverSidePage.requestData(Trip, oQuery);
	return getData;
};

async function resetRTBalance(req, res, next) {
	let oFilter = constructFilterOfRT(req.body);

	const aggrQuery = [
		{
			$addFields: {
				'tripStart': {
					$arrayElemAt: [{
						$filter: {
							input: '$statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Trip started']}
						}
					}, 0]
				},
				'tripEnd': {
					$arrayElemAt: [{
						$filter: {
							input: '$statuses',
							as: 'item',
							cond: {$eq: ['$$item.status', 'Trip ended']}
						}
					}, 0]
				},
			}
		},
		{$match: oFilter},
		{
			$lookup: {
				from: 'drivers',
				localField: 'driver',
				foreignField: '_id',
				as: 'driver'
			}
		},
		{
			$unwind: {
				path: '$driver',
				preserveNullAndEmptyArrays: true
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
			$unwind: {
				path: '$vehicle',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$project: {
				driver: 1,
				statuses: 1,
				advSettled: 1,
				markSettle: 1,
				vehicle: 1,
				vehicle_no: 1,
				payments: 1,
				'tripStart.date': 1,
				'tripEnd.date': 1
			}
		},
		{$sort: {'advSettled.systemDate': 1}},
		// {$limit:req.no_of_docs },

		{
			$project: {
				driver: 1,
				statuses: 1,
				advSettled: 1,
				markSettle: 1,
				vehicle: 1,
				vehicle_no: 1,
				payments: 1,
				'tripStart.date': 1,
				'tripEnd.date': 1
			}
		},
		{
			$group: {
				_id: {vehicle: '$vehicle'},
				vehicleNo: {$first: "$vehicle_no"},
				aData: {$push: '$$ROOT'}
			}
		},
		{$sort: {group: -1}}
	];

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};
	let data = await serverSidePage.requestData(Trip, oQuery);

	try {
		if (data && data.length) {
			for (var i in data) {

				let aSortedTrip = data[i].aData;

				let driverBal = 0;
				if (aSortedTrip[0].driver && aSortedTrip[0].driver.account) {
					driverBal = await AcBal.findOne({
						account: aSortedTrip[0].driver.account._id || aSortedTrip[0].driver.account,
						date: {$lte: moment(aSortedTrip[0].tripStart.date).startOf('day').toDate()}
					}, {ob: 1, date: 1, cb: 1}).sort({date: -1}).limit(1).lean();

					if (driverBal) {
						driverBal = driverBal.cb;
					} else
						driverBal = 0;
				}

				if (driverBal)
					await reSetOCBal(aSortedTrip, driverBal);
			}

			return res.status(200).json({
				message: 'RT Balance Reset Successfully'
			});

		} else {
			return res.status(200).json({
				message: 'No data Found'
			});
		}

	} catch (err) {
		throw err;
	}
};

async function tripCmprTable(req, res, next) {
	// let start_date = new Date(new Date(req.to) - 1000 * 60 * 60 * 24 );
	// let end_date = new Date((start_date).setMonth( (start_date).getMonth() - 6));
	// req.to = start_date;
	// req.from = end_date;
	req.to = new Date(req.to);
	let d = req.to;
	let dateDay = 33;
	if(req.rptType === 'daywise')
		dateDay = d.getDate();
	let end_date = new Date(req.to);
	req.from = new Date((end_date).setMonth( (end_date).getMonth() - 5));
	let oFiltr = constructFilters(req);
	oFiltr.category = "Loaded";
	oFiltr.ownershipType = "Own";

	const aggrQuery = [
		{$match: oFiltr},
		{
			$project:{
				start_date : 1,
				trip_no : 1,
				vehicle : 1,
				day : { $dayOfMonth : "$start_date"},
			}
		},
		{
			$match: {
				day : { $lt : dateDay}
			}
		},

		{
			$lookup:{
				from : "registeredvehicles",
				"localField" : "vehicle",
				"foreignField" :"_id",
				"as": "vehicleData"

			}
		},
		{

			"$unwind": {
				"path": "$vehicleData",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$project:{
				start_date : 1,
				trip_no : 1,
				"segment_type" : "$vehicleData.segment_type",
				"fleet" : "$vehicleData.owner_group",
				"ownershipType" : "$vehicleData.ownershipType"
			}
		},
		{
			$group: {
				_id : {
					segment_type : "$segment_type",
					fleet : "$fleet",
					month : { $month : "$start_date"},
					year : { $year : "$start_date"}
				},
				data : {
					"$push" : "$$ROOT"
				}
			}

		},
		// {
		// 	"$sort": {
		// 		"_id.month": 1,
		// 		"_id.year": 1,
		// 		"_id.segment_type" : 1,
		// 	}
		// },
		{
			$project : {
				"segment" : "$_id.segment_type",
				"fleet" : "$_id.fleet",
				"month" : "$_id.month",
				"year" : "$_id.year",
				"numberOfTrips" : { $size: "$data" },
				// data : 1

			}
		},
		{
			$sort:{
				segment : 1,
				fleet :1
			}
		}

	];
	//req.clientConfig.config.master.aSegmentType
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let getData = await serverSidePage.requestData(Trip, oQuery);
	let massageData = {};
	getData.forEach( oData => {
		massageData[oData.segment] = massageData[oData.segment] || {};
		massageData[oData.segment].segment = oData.segment || 'NA';
		if(oData.month && oData.year){
			let monthName = moment().month(oData.month - 1).year(oData.year).format('MM-YYYY') || 'NULL';
			massageData[oData.segment][monthName] = massageData[oData.segment][monthName] || 0;
			massageData[oData.segment][monthName] += oData.numberOfTrips;
		}
	})

	let massageFleetData = {};
	getData.forEach( oData => {
		massageFleetData[oData.fleet] = massageFleetData[oData.fleet] || {};
		massageFleetData[oData.fleet].fleet = oData.fleet || 'dummy';
		if(oData.month && oData.year){
			let monthName = moment().month(oData.month - 1).year(oData.year).format('MM-YYYY') || 'NULL';
			massageFleetData[oData.fleet][monthName] = massageFleetData[oData.fleet][monthName] || 0;
			massageFleetData[oData.fleet][monthName] += oData.numberOfTrips;
		}
	})

	return {massageData,massageFleetData};
};

async function tripsheetSummary(req, res, next){
	try{

		if(!req.body.from && !req.body.to)
			throw new Error(`Select date`);

		// let data = [];
		let oFilter = {};
		oFilter = tripsheetConstructFilters(req.body);

		// if(!(oFilter.advSettled && oFilter.advSettled.tsNo))
		// 	 oFilter.advSettled.tsNo = {$exists: true} ;

		let data = await Trip.find(oFilter).lean().populate('payments');

		// if(req.body.vehicle_no){
		// 	data = await Trip.find({
		// 		clientId: req.body.clientId,
		// 		"vehicle_no": req.body.vehicle_no ,
		// 		"advSettled.tsNo": req.body.tsNo ? req.body.tsNo : {$exists: true},
		// 		"markSettle.date":{
		// 			"$gte": req.body.from,
		// 			"$lte": req.body.to
		// 		}
		// 	}).sort({vehicle_no: 1}).lean();
		// }else{
		// 	data = await Trip.find({
		// 		clientId: req.body.clientId,
		// 		// "vehicle_no": req.body.vehicle_no ,
		// 		"advSettled.tsNo": req.body.tsNo ? req.body.tsNo : {$exists: true},
		// 		"markSettle.date":{
		// 			"$gte": req.body.from,
		// 			"$lte": req.body.to
		// 		}
		// 	}).sort({vehicle_no: 1}).lean();
		// }

		let result = data.reduce(function (r, a) {
			r[a.advSettled.tsNo] = r[a.advSettled.tsNo] || [];
			r[a.advSettled.tsNo].push(a);
			return r;
		}, Object.create(null));

		let aResult = Object.entries(result);
		let aData = [];
		for(var obj of aResult){
			let arr =  Trip.eachTripSummary(obj[1]);
			arr[0].summary = await Trip.tripSummary(arr);

			aData.push(arr);
		}
		return aData;
	}catch(err){
		throw err;
	}
}

module.exports = {
	add,
	createTrip,
	addGR,
	tripReport,
	vehMonthlyPerformanceRpt,
	hirePaymentRpt,
	tripRecoVehicleReports,
	tripRecoReports,
	tripReportDetail,
	genMultiGr,
	revertMultiGr,
	get,
	getV2,
	getV3,
	getTripV2,
	getTrip,
	update,
	update_status,
	cancel,
	bulkStatusUpdate,
	add_geofence,
	rm_geofence,
	report_fleet_owner,
	getTripByIDslip,
	parseFiles,
	upload_slip,
	addAskPayment,
	documentsUpload,
	vendorAcknowledge,
	vendorExtraCharges,
	getApprovedBudget,
	addAdvance,
	settleTrip,
	updateSettleTrip,
	createEmptyTrip,
	findByAdvanceDate,
	markSettle,
	settleCompletely,
	revertSettleCompletely,
	advAddTrip,
	advDeleteTrip,
	expenseDeleteTrip,
	pullTripExp,
	vendorAdvance,
	vendorPaymentEdit,
	vendorPaymentDelete,
	updateVendorDeal,
	updateVehicle,
	findTripById,
	updateOneTrip,
	resetRTBalance,
	accountMangerRemark,
	plReport,
	getAlert,
	getAlertV2,
	tripCmprTable,
	// vehicleCmprTable,
	tripsheetSummary,
	addGrNumber
};
