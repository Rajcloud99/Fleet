/* Created By Pratik
*New ES7 feature used Async and Await to replace promises .then or callback hell
* */

let router = require('express').Router();

let Trip = commonUtil.getModel('trip');
const tripService = commonUtil.getService('TripV2');
const GR = commonUtil.getModel('tripGr');
const validate = require('express-validation');
const paramValidation = commonUtil.getParamsValidation('trip');
var multipartMiddleware = require('connect-multiparty')();
const TripAdvances = require('../models/TripAdvances');
const billStationaryService = commonUtil.getService('billStationary');
let plainVoucherService = commonUtil.getService('plainVoucher');
let voucherService = commonUtil.getService('voucher');
let PlainVoucher = commonUtil.getModel('plainVoucher');
const locationService = commonUtil.getService('location');
let TripExpense = promise.promisifyAll(commonUtil.getModel('tripExpenses'));
let Voucher = commonUtil.getModel('voucher');
let Customer = promise.promisifyAll(commonUtil.getModel('customer'));
const FileService = commonUtil.getUtil('file_upload_util');
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
const TripCache = require(projectHome + "/lms/services/tripCache");
const {mapSuspense, unmapSuspense} = require(projectHome + "/lms/services/tripAdvance");
const csvDownload = require('../../utils/csv-download');
const tripSettlement = commonUtil.getReports('tripSettleCache.js');
const tripUnSettle = commonUtil.getReports('tripUnSettleCache.js');
const tripPreformanse = commonUtil.getReports('tripPreformanseCache.js');
const tripCacheV2 = commonUtil.getReports('trip.js');
const TripSettlementCache = commonUtil.getModel('tripSettlementCache');
const tripCache = commonUtil.getModel('tripCache');
let logsService = commonUtil.getService('logs');
const serverSidePage = require('../../utils/serverSidePagination');
const moment = require('moment');
const Promise = require("bluebird");
const traqoApiService = require("../../schedulers/simTrackingTraqo");
const BillStationary = commonUtil.getModel('billStationary');
const PDD = 400;
const PDD_SPEED = 0.00000462962;// 400/86400000
//const geolib = require('geolib');


/** POST /api/trips/vehicle_allocate - Create new trip */
router.route('/vehicle_allocate').post(validate(paramValidation.add), tripService.add);

router.route('/addGrNumber').post(tripService.addGrNumber);

router.route('/createTrip').post(tripService.createTrip);

router.route('/empty-trip').post(validate(paramValidation.addEmptyTrip), tripService.createEmptyTrip);

/** POST /api/trips/get - Get trips */
router.route('/get').post(tripService.get);

router.route('/getV2').post(tripService.getV2);

router.route('/getTripV2').post(tripService.getTripV2);

router.route('/getTrip').post(tripService.getTrip);

router.post("/settleNew", async (req, res, next) => {
	if (!req.body.from || !req.body.to) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'from date, to date are mandatory',
		});
	}
	let hasTimeoutExecuted = false;
	let timer = setTimeout(() => {
		hasTimeoutExecuted = true;
		if (!res.headersSent) {
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}
	}, 1000 * 30);


	let aggrQuery = [
		{
			$match: constructFilter()
		},
		{
			$limit: 20000
		},
		{
			$project: {
				"tsNo": 1,
				"startDate": 1,
				"endDate": 1,
				"cSettle": 1,
				"mSettle": 1,
				"openingBal": 1,
				"sysDate": 1,
				"date": 1,
				"csBy": 1,
				"msBy": 1,
				"csRemark": 1,
				"msRemark": 1,
				"creation.date": 1,
				"creation.user": 1,
				"vehicle.vehicleNo": 1,
				"vehicle.fleet": 1,
				"vehicle.segment": 1,
				"vehicle.ownership": 1,
				"driver.name": 1,
				"suspense": 1,
				"gapSuspense": 1,
				"totalKm": 1,
				"totalExtraKm": 1,
				"netBudget": 1,
				"netAdvVch": 1,
				"netAdvObj": 1,
				"netAdvance": 1,
				"netAdvVchObj": 1,
				"netExpense": 1,
				"netExpVch": 1,
				"netExpObj": 1,
				"netExpVchObj": 1,
				"dieselBudget": 1,
				"dieselGivLit": 1,
				"dieselGivAmt": 1,
				"overDue": 1,
				"openCloseBal": 1,
				"driverIncentiveVch": 1,
				"driverPayment": 1,
				"revenue": 1,
				"profit": 1,
				"revenueByKm": 1,
				"expenseByKm": 1,
				"profitByKm": 1,
				"profitByday": 1,
				"ttDays": 1,
				"totalSuspence": 1,
				"totBorderExp": 1,
				"totChallanExp": 1,

				"trip.trip_no": 1,
				"trip.bill_no": 1,
				"trip.startDate": 1,
				"trip.endDate": 1,
				"trip.suspenseRemark": 1,
				"trip.settled": 1,
				"trip.ownershipType": 1,
				"trip.AccManagerRmk": 1,
				"trip.advanceBudget": 1,
				"trip.status": 1,
				"trip.rmk": 1,
				"trip.category": 1,
				"trip.extraKm": 1,
				"trip.route_name": 1,
				"trip.routeKm": 1,
				"trip.allocation_date": 1,
				"trip.trip_expenses": 1,
				"trip.payments": 1,
				"trip.statuses": 1,
				"trip.gr": 1,
				"trip.remarks": 1,

			}
		}
	];


	let downloadPath = await new csvDownload(TripSettlementCache, aggrQuery, {
		filePath: `${req.user.clientId}/Trip_Settle`,
		fileName: `TripSettle_CacheReport_${moment().format('DD-MM-YYYY_hh:mm')}`
	}).exec(tripSettlement.transform, req);

	if (hasTimeoutExecuted) {
		await logsService.addLog('Trip_Settle_Report', {
			uif: "Trip_Settle_Cache_Report_" + moment().format('DD-MM-YYYY hh:mm'),
			docId: req.user._id,
			category: 'Notification',
			delta: [],
			dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
			userId: req.user._id,
			subCategory: 'Trip Settle CacheReport'
		}, req);
	} else {
		clearTimeout(timer);
		return res.status(200).json({
			status: "SUCCESS",
			message: 'Trip Settle CacheReport ',
			url: downloadPath
		});
	}

	function constructFilter() {
		let filter = {
			clientId: req.user.clientId
		};
		let query = req.body;
		const DATE_BY = {
			"Trip started": 'startDate',
			"Trip ended": 'endDate',
			"allocation_date": 'creation.date',
		};
		const KEY_MAPPER = {
			vehicle: 'vehicle._id',
			driver: 'driver._id',
			'advSettled.tsNo': 'tsNo',
			segment_type: 'vehicle.segment',
			trip_no: 'trip.trip_no',
			grNumber: 'trip.gr.grNumber',
			customer_id: 'trip.gr.customer._id',
			ownershipType: 'vehicle.ownership',
			tripSettleType: 'mSettle',
		};

		if (req.body.tripSettleType && req.body.tripSettleType === "Unsetteled")
			req.body.tripSettleType = false;
		else
			delete req.body.tripSettleType;


		const ALLOWED_KEY = ['from', 'to', 'vehicle', 'advSettled.tsNo', 'trip_no', 'segment_type', 'grNumber', 'driver', 'customer_id', 'ownershipType', 'tripSettleType'];
		for (let key in query) {
			if (req.body.hasOwnProperty(key) && ALLOWED_KEY.indexOf(key) != -1) {
				if (key == 'from' || key == 'to') {
					if (typeof query.rtNo != 'undefined' && query.rtNo)
						continue;
					let compareTo = DATE_BY[query.dateType] || "startDate";
					filter[compareTo] = filter[compareTo] || {};
					filter[compareTo][key === 'from' ? '$gte' : '$lt'] = moment(query[key])[key === 'from' ? 'startOf' : 'endOf']('day').toDate();
				} else
					filter[KEY_MAPPER[key] || key] = formatData(query[key]);
			}
		}

		return filter;
	}

	function formatData(value) {
		if (Array.isArray(value))
			if (value.length == 1)
				return value[0];
			else
				return {
					$in: value
				};

		if (typeof value == 'string' && value.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i))
			return otherUtil.arrString2ObjectId(value);

		return value;
	}
});

router.post("/unSettleNew", async (req, res, next) => {
	if (!req.body.from || !req.body.to) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'from date, to date are mandatory',
		});
	}
	let hasTimeoutExecuted = false;
	let timer = setTimeout(() => {
		hasTimeoutExecuted = true;
		if (!res.headersSent) {
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}
	}, 1000 * 30);


	let aggrQuery = [
		{
			$match: constructFilter()
		},
		{
			$project: {
				"branch": 1,
				"trip_no": 1,
				"bill_no": 1,
				ctrip: 1,
				corder: 1,
				gps_view: 1,
				suspenseRemark: 1,
				settled: 1,
				ownershipType: 1,
				"AccManagerRmk": 1,
				"markSettle": 1,
				"advSettled": 1,
				"advanceBudget": 1,
				"suspenseAdv": 1,
				"transShipment": 1,
				"status": 1,
				"rmk": 1,
				"category": 1,
				"extraKm": 1,
				"route": 1,
				"vehicle.vehicle_no": 1,
				"vehicle.fleet": 1,
				"vehicle.segment": 1,
				"driver": 1,
				"allocation_date": 1,
				"start_date": 1,
				"end_date": 1,
				"trip_expenses": 1,
				"isCancelled": 1,
				"payments": 1,
				"statuses": 1,
				"gr": 1,
				"vendor": 1,
				"vendorDeal": 1,
				"remarks": 1,
				"createdBy": 1,
				"modifBy": 1,
				"created_at": 1,
				"last_modified_at": 1,
			}
		}
	];
	let downloadPath;
	if (req.body.reportType === 'TripPerformance') {
		downloadPath = await new csvDownload(tripCache, aggrQuery, {
			filePath: `${req.user.clientId}/Trip_NewCSV`,
			fileName: `TripPerformance_CacheReport_${moment().format('DD-MM-YYYY_hh:mm')}`
		}).exec(tripPreformanse.transform, req);

		if (hasTimeoutExecuted) {
			await logsService.addLog('Trip_Performance_Report_', {
				uif: "Trip_Performance_Cache_Report_" + moment().format('DD-MM-YYYY hh:mm'),
				docId: req.user._id,
				category: 'Notification',
				delta: [],
				dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
				userId: req.user._id,
				subCategory: 'Trip Performance Cache Report'
			}, req);
		} else {
			clearTimeout(timer);
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Trip Performance Cache Report ',
				url: downloadPath
			});
		}
	}else if (req.body.reportType === 'onTrip') {
		downloadPath = await new csvDownload(tripCache, aggrQuery, {
			filePath: `${req.user.clientId}/Trip_CSV`,
			fileName: `Trip_CacheReport_${moment().format('DD-MM-YYYY_hh:mm')}`
		}).exec(tripCacheV2.transform, req);

		if (hasTimeoutExecuted) {
			await logsService.addLog('Trip_Report', {
				uif: "Trip_Cache_Report_" + moment().format('DD-MM-YYYY hh:mm'),
				docId: req.user._id,
				category: 'Notification',
				delta: [],
				dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
				userId: req.user._id,
				subCategory: 'Trip Cache Report'
			}, req);
		} else {
			clearTimeout(timer);
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Trip Cache Report ',
				url: downloadPath
			});
		}
	} else {
		downloadPath = await new csvDownload(tripCache, aggrQuery, {
			filePath: `${req.user.clientId}/Trip_NewCSV`,
			fileName: `TripUnsettle_CacheReport_${moment().format('DD-MM-YYYY_hh:mm')}`
		}).exec(tripUnSettle.transform, req);

		if (hasTimeoutExecuted) {
			await logsService.addLog('Trip_Settle_Report', {
				uif: "Trip_UnSettle_Cache_Report_" + moment().format('DD-MM-YYYY hh:mm'),
				docId: req.user._id,
				category: 'Notification',
				delta: [],
				dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
				userId: req.user._id,
				subCategory: 'Trip UnSettle Cache Report'
			}, req);
		} else {
			clearTimeout(timer);
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Trip UnSettle Cache Report ',
				url: downloadPath
			});
		}
	}

	if (hasTimeoutExecuted) {
		await logsService.addLog('Trip_Settle_Report', {
			uif: "Trip_Report_" + moment().format('DD-MM-YYYY hh:mm'),
			docId: req.user._id,
			category: 'Notification',
			delta: [],
			dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
			userId: req.user._id,
			subCategory: 'Trip Report'
		}, req);
	} else {
		clearTimeout(timer);
		return res.status(200).json({
			status: "SUCCESS",
			message: 'Trip Report ',
			url: downloadPath
		});
	}

	function constructFilter() {
		let filter = {
			clientId: req.user.clientId
		};
		let query = req.body;
		const DATE_BY = {
			"Trip started": 'start_date',
			"Trip ended": 'end_date',
			"allocation_date": 'allocation_date',
			"vendorDeal.deal_at": 'vendorDeal.deal_at',
			"vendorDeal.entryDate": 'vendorDeal.entryDate',
			"vendorDeal.acknowledge.date": 'vendorDeal.acknowledge.date',
		};
		const KEY_MAPPER = {
			vehicle: 'vehicle._id',
			driver: 'driver._id',
			segment_type: 'vehicle.segment',
			trip_no: 'trip_no',
			grNumber: 'gr.grNumber',
			customer_id: 'gr.customer._id',
			ownershipType: 'ownershipType',
			isCancelled: 'isCancelled',
			branch: 'branch._id',
			route: 'route._id',
			vendor: 'vendor._id',
			'vendorDeal.broker.id': 'vendorDeal.broker._id',
		};

		const ALLOWED_KEY = ['from', 'to', 'vehicle', 'trip_no', 'segment_type', 'grNumber', 'driver', 'customer_id', 'ownershipType', 'isCancelled', 'vendorDeal.loading_slip', 'branch', 'route', 'vendor', 'vendorDeal.broker.id'];
		for (let key in query) {
			if (req.body.hasOwnProperty(key) && ALLOWED_KEY.indexOf(key) != -1) {
				if (key == 'from' || key == 'to') {
					if (typeof query.rtNo != 'undefined' && query.rtNo)
						continue;
					let compareTo = DATE_BY[query.dateType] || "start_date";
					filter[compareTo] = filter[compareTo] || {};
					filter[compareTo][key === 'from' ? '$gte' : '$lt'] = moment(query[key])[key === 'from' ? 'startOf' : 'endOf']('day').toDate();
				} else
					filter[KEY_MAPPER[key] || key] = formatData(query[key]);
			}
		}

		if (req.body.branch) {
			if (req.body.branch && req.body.branch != "undefined" && req.body.branch.length > 0) {
				filter['branch._id'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(req.body.branch) ? req.body.branch : [req.body.branch])};
			}
		}

		if (req.body.reportType != 'TripPerformance')
			filter['advSettled.tsNo'] = {$exists: false};


		return filter;
	}

	function formatData(value) {
		if (Array.isArray(value))
			if (value.length == 1)
				return value[0];
			else
				return {
					$in: value
				};

		if (typeof value == 'string' && value.match(/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i))
			return otherUtil.arrString2ObjectId(value);

		return value;
	}
});


/********************Ritika Raj********************/
//api/trips/recoVehiclereports
// router.post('/recoVehiclereports', async function (req, res) {
// 	await tripService.tripRecoVehicleReports
// });
router.route('/recoVehiclereports').post(tripService.tripRecoVehicleReports);
/********************Ritika Raj/end********************/

//api/tripsreco/recoreports
router.route('/recoreports').post(tripService.tripRecoReports);

router.route('/vehMonthlyPerformanceRpt').post(tripService.vehMonthlyPerformanceRpt);

router.route('/hirePaymentRpt').post(tripService.hirePaymentRpt);

router.route('/reports').post(tripService.tripReport);
router.route('/detailreports').post(tripService.tripReportDetail);

/** PUT /api/trips/update_status/:_id - Update trip status*/
router.route('/update_status/:_id').put(validate(paramValidation.update_status), tripService.update_status);

router.route('/adm_update/:_id').put(validate(paramValidation.update_status), async function (req, res, next) {

	try {
		let oRes = {status: "OK",message: 'update successfully'};
		let gpsData = {};

		let oTrip = await Trip.findOne({_id: req.params._id}).populate(
			{path: 'gr', select: {statuses: 1}});

		if (req.body.status === 'Trip ended' && oTrip.category !== 'Empty' && oTrip.gr && oTrip.gr[0] && !req.clientConfig.config.tripStatusCheck) {
			let vehst = oTrip.gr[0].statuses.find(st => st.status === "Vehicle Arrived for unloading");
			if (!vehst) {
				return res.status(500).json({
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
			date: req.body.updated_status ? req.body.updated_status.date : new Date(),
			systemDate: new Date(),
			status: req.body.status,
			remark: req.body.updated_status ? req.body.updated_status.remark : '',
			gpsData: gpsData,
		};

		oTrip.statuses.push(oUpdatedBy);

		let setObj = {
			statuses: oTrip.statuses
		};
		if (req.body.status === 'Trip started'){
			if (moment(req.body.updated_status ? req.body.updated_status.date : new Date()).isAfter(moment())) {
				return res.status(500).json({
					status: 'ERROR',
					message: 'Trip start date can\'t be set to future.'
				});
			}
			// if (moment(req.body.updated_status ? req.body.updated_status.date : new Date()).isBefore(moment(oTrip.allocation_date))) {
			// 	return res.status(500).json({
			// 		status: 'ERROR',
			// 		message: 'Trip start date can\'t be set  before allocation date.'
			// 	});
			// }
			let obj = {
				"clientId" : req.user.clientId,
				_id: {$ne: mongoose.Types.ObjectId( req.params._id)},
				"isCancelled" : false,
				"$and":[
					{
						"$or":[
							{"start_date":{$lte: req.body.updated_status ? new Date(req.body.updated_status.date) : new Date()},
								"end_date":{$gte:req.body.updated_status ? new Date(req.body.updated_status.date) : new Date()}}]
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
			setObj.start_date = req.body.updated_status ? req.body.updated_status.date : new Date();
			setObj.startOdo = (req.body.updated_status && req.body.updated_status.startOdo) ? req.body.updated_status.startOdo : req.body.startOdo;

		}
		if (req.body.status === 'Trip ended') {
			if (moment(req.body.updated_status ? req.body.updated_status.date : new Date()).isAfter(moment())) {
				return res.status(500).json({
					status: 'ERROR',
					message: 'Trip end date can\'t be set to future.'
				});
			}
			if (moment(req.body.updated_status ? req.body.updated_status.date : new Date()).isBefore(moment(oTrip.start_date))) {
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
							{"start_date":{$gte: oTrip.start_date ? new Date(oTrip.start_date) : new Date()}, "end_date":{$lte:req.body.updated_status ? new Date(req.body.updated_status.date) : new Date()}},
							{"start_date":{$gte:req.body.updated_status ? new Date(req.body.updated_status.date) : new Date()}, "end_date":{$lte:req.body.updated_status ? new Date(req.body.updated_status.date) : new Date()}}
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
			setObj.end_date = req.body.updated_status ? req.body.updated_status.date : new Date();
			setObj.endOdo = (req.body.updated_status && req.body.updated_status.endOdo) ? req.body.updated_status.endOdo : req.body.endOdo;
		}
		oRes.data = await oTrip.set(setObj).save();

		//gps_km and gps_status
		if( oTrip.statuses.filter(st => st.status === 'Trip ended') ){

			let tripEndDate = req.body.updated_status && req.body.updated_status.date;
			let tripStartDate = oTrip.statuses.filter(st => st.status === 'Trip started');
			let grEndDate = oTrip.gr && oTrip.gr.statuses && oTrip.gr.statuses.filter(st => st.status === 'Loading Ended');
			let tat_in_ms = ( (oTrip.vehicle && oTrip.vehicle.trip && oTrip.vehicle.trip.tat_hr ? oTrip.vehicle.trip.tat_hr : 0 ) * 3600000);
			let tat_speed;
			if(oTrip.vehicle && oTrip.vehicle.trip && oTrip.vehicle.trip.tat_hr > 1){
				tat_speed = oTrip.vehicle && oTrip.vehicle.route && oTrip.vehicle.route.route_distance / ( ( oTrip.vehicle && oTrip.vehicle.trip && oTrip.vehicle.trip.tat_hr ? oTrip.vehicle.trip.tat_hr : null) * 3600000 )
			}else{
				tat_speed = null;
			}
			// let tripEndDate = oTrip.gr && oTrip.gr.loading_ended_status && oTrip.gr.loading_ended_status.date;
			let delay_in_ms = ( oTrip.route ? (oTrip.route.route_distance/400) * 86400000 : 0 );
			let distance_travelled;
			if(oTrip.vehicle && oTrip.vehicle.trip && oTrip.vehicle.trip.trip_start_status && oTrip.vehicle.trip.trip_start_status.gpsData && oTrip.vehicle.trip.trip_start_status.gpsData.odo){
				distance_travelled = [( oTrip.vehicle && oTrip.vehicle.gr && oTrip.vehicle.gr.vehicle_arrived_for_unloading_status && oTrip.vehicle.gr.vehicle_arrived_for_unloading_status.gpsData && oTrip.vehicle.gr.vehicle_arrived_for_unloading_status.gpsData.odo ?
						oTrip.vehicle && oTrip.vehicle.gr && oTrip.vehicle.gr.vehicle_arrived_for_unloading_status && oTrip.vehicle.gr.vehicle_arrived_for_unloading_status.gpsData && oTrip.vehicle.gr.vehicle_arrived_for_unloading_status.gpsData.odo :
						oTrip.vehicle && oTrip.vehicle.gpsData && oTrip.vehicle.gpsData.odo ) / 1000] -
					[
						oTrip.vehicle && oTrip.vehicle.trip && oTrip.vehicle.trip.trip_start_status && oTrip.vehicle.trip.trip_start_status.gpsData && oTrip.vehicle.trip.trip_start_status.gpsData.odo / 1000 || 1
					]
			}else{
				distance_travelled = 0;
			}
			let expected_eta = ( new Date((grEndDate ? grEndDate : tripStartDate[0].date)).getTime() +
				(tat_in_ms ? tat_in_ms : delay_in_ms) );
			let current_eta; //no use yet
			let current_delay_in_ms = (( (oTrip.vehicle && oTrip.vehicle.route && oTrip.vehicle.route.route_distance - distance_travelled) / 400) * 86400000);
			let tat_delay_in_ms ;
			if(tat_speed){
				tat_delay_in_ms = (oTrip.vehicle && oTrip.vehicle.route && oTrip.vehicle.route.route_distance - distance_travelled) / tat_speed ;
			}else{
				tat_delay_in_ms = (oTrip.vehicle && oTrip.vehicle.route && oTrip.vehicle.route.route_distance - distance_travelled) /400;
			}

			if(new Date(tripEndDate).getTime() > expected_eta){
				oTrip.v_status = 'Delay';
				oTrip.live_status.delay = new Date(tripEndDate) - expected_eta ;
			}
			else if(new Date(tripEndDate).getTime() < expected_eta){
				oTrip.v_status = 'Early';
				oTrip.live_status.early = expected_eta - new Date(tripEndDate);
			}
			else if(new Date(tripEndDate).getTime() === expected_eta){
				oTrip.v_status = 'On Time';
			}
			let gpsObj = {};
			gpsObj.v_status = oTrip.v_status;
			gpsObj.live_status = oTrip.live_status;

			// await oTrip.set(gpsObj).save();
			// await oTrip.set(gpsObj).save();

			//distance_covered
			// let grUnloadEnd = oTrip.gr && oTrip.gr.statuses && oTrip.gr.statuses.filter(st => st.status === 'Unloading Ended') || 0;
			// let grUnloadingStarted = oTrip.gr && oTrip.gr.statuses && oTrip.gr.statuses.filter(st => st.status === 'Unloading Started') || 0;
			// let grLoadingEnd = oTrip.gr && oTrip.gr.statuses && oTrip.gr.statuses.filter(st => st.status === 'Loading Ended') || 0;
			// let grLoadingStarted = oTrip.gr && oTrip.gr.statuses && oTrip.gr.statuses.filter(st => st.status === 'Loading Started') || 0;
			// let tripStarted = oTrip.statuses && oTrip.statuses.filter(st => st.status === 'Trip started');
			// let tripEnded = oTrip.statuses && oTrip.statuses.filter(st => st.status === 'Trip Ended');
			//
			// oTrip.gpsKM =  [(grUnloadEnd[0] && grUnloadEnd[0].gpsData && grUnloadEnd[0].gpsData.odo ? grUnloadEnd[0] && grUnloadEnd[0].gpsData && grUnloadEnd[0].gpsData.odo :
			// 		(grUnloadingStarted[0] && grUnloadingStarted[0].gpsData && grUnloadingStarted[0].gpsData.odo? grUnloadingStarted[0] && grUnloadingStarted[0].gpsData && grUnloadingStarted[0].gpsData.odo :
			// 			tripEnded[0] && tripEnded[0].gpsData && tripEnded[0].gpsData.odo ))/1000 || 0 ] -
			// 	[ (grLoadingEnd[0] && grLoadingEnd[0].gpsData && grLoadingEnd[0].gpsData.odo ?
			// 		grLoadingEnd[0] && grLoadingEnd[0].gpsData && grLoadingEnd[0].gpsData.odo :
			// 		(grLoadingStarted[0] && grLoadingStarted[0].gpsData && grLoadingStarted[0].gpsData.odo ?
			// 			grLoadingStarted[0] && grLoadingStarted[0].gpsData && grLoadingStarted[0].gpsData.odo :
			// 			tripStarted[0] && tripStarted[0].gpsData && tripStarted[0].gpsData.odo ) )/1000 || 0];
			//
			//
			//
			// if( oTrip.gpsKM < 0){
			// 	gpsObj.gpsKM = oTrip.gpsKM * -1;
			// }

			await oTrip.set(gpsObj).save();
		}
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}

});

router.route('/update/:_id').put(validate(paramValidation.update), tripService.update);

router.route('/updateVehicle/:_id').put(validate(paramValidation.update), async function (req, res, next) {
	try {

		// return res.status(500).json({
		// 	'status': 'ERROR',
		// 	'message': 'API Down for Maintenance'
		// });

		await tripService.updateVehicle(req.params._id, req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Vehicle Updated Successfully'
		});

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

router.route('/upload_slip/:_id').put(validate(paramValidation.update), tripService.getTripByIDslip, tripService.parseFiles, tripService.upload_slip);

router.route('/bulkStatusUpdate').put(/*validate(paramValidation.bulk_update_status),*/tripService.bulkStatusUpdate);

router.route('/cancel/:_id').put(validate(paramValidation.cancel), tripService.cancel);

router.route('/add_geofence/:_id').put(validate(paramValidation.add_geofence), tripService.add_geofence);

router.route('/rm_geofence/:_id').put(validate(paramValidation.rm_geofence), tripService.rm_geofence);

/** POST /api/trips/get - Get trips */
router.route('/report_fleet_owner').get(tripService.report_fleet_owner);

router.route('/askpayment/:_id').put(tripService.addAskPayment);

router.route('/vendorAcknowledge/:_id').put(tripService.vendorAcknowledge);

router.route('/vendorCharges/:_id').put(tripService.vendorExtraCharges);

router.route('/unlockVehicle').post(async function (req, res) {
	try {

		let vehicleNo = req.body.vehicleNo;

		if (!vehicleNo)
			throw new Error('Vehicle No is Mandatory');

		let data = await locationService.vehicleUnloadApi(vehicleNo);

		return res.status(200).json({
			status: 'OK',
			message: "Vehicle Unlocked Successfully",
			data
		});

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

router.route('/getAlerts').post(async function (req, res) {
	try {

		if (!req.body.device_imei)
			throw new Error('Vehicle No is Mandatory');

		if (!req.body.startDate)
			throw new Error('startDate is Mandatory');

		if (!req.body.endDate)
			throw new Error('endDate is Mandatory');

		let oTrip = {
			vehicle: {device_imei:req.body.device_imei},
			startDate: req.body.startDate,
			endDate: req.body.endDate
		            }

		let data = await tripService.getAlert(oTrip, req);

		return res.status(200).json({
			status: 'OK',
			message: "Alert found",
			data
		});

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

//vehicle wise opening closing and advance
router.route('/vehiclewiseData').post(async function (req, res) {
	try {

		let vehicle = req.body.vehicle;

		if (!vehicle)
			throw new Error('Vehicle No is Mandatory');
        //fetch last settle RT
		let data = await Trip.aggregate([{
			$match:{
				driver: {$exists: true},
				"advSettled.isCompletelySettled": {
					$exists: true
				},
				"advSettled.tsNo": {$exists: true},
				isCancelled: false,
				"clientId" : req.user.clientId,
				vehicle:mongoose.Types.ObjectId(req.body.vehicle)
			}
		},
			{
				"$sort": {"end_date": -1}

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
				$lookup: {
					from: 'tripadvances',
					localField: 'advanceBudget',
					foreignField: '_id',
					as: 'advanceBudget'
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
					from: 'vouchers',
					localField: 'payments',
					foreignField: '_id',
					as: 'payments'
				}
			},
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
					"path": "$driver",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "accounts",
					"localField": "driver.account",
					"foreignField": "_id",
					"as": "driver.account"
				}
			},
			{
				"$unwind": {
					"path": "$driver.account",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$group": {
					"_id": {ts:"$advSettled.tsNo"},
					"trip":{$push:"$$ROOT"},
					"vehicle": {
						"$first": "$vehicle"
					},
					"driver": {
						"$first": "$driver"
					},
					"rtNo": {
						"$first": "$advSettled.tsNo"
					},"mDate": {
						"$first": "$markSettle.date"
					},
					"cDate": {
						"$first": "$advSettled.date"
					},
					"start_date": {
						"$last": "$start_date"
					},
					"end_date": {
						"$first": "$end_date"
					},

				}
			},
			{
				"$sort": {
					"end_date": -1
				}
			},
			{$limit:1}
		])
		//Fetch advance after last RT
		let advanceFilter = {
			vehicle : mongoose.Types.ObjectId(req.body.vehicle),
			//trip : { $exists : false},
		}

		if(data && data[0]){
			advanceFilter.date ={$gt: new Date(data && data[0].end_date) }
		}
		let aTrpAdvPipe = [
				{
					$match:advanceFilter
				},
				{
					"$group": {
						"_id": "$vehicle",
						driverCash: {"$sum": {"$cond": [{"$eq": ['$advanceType', 'Driver Cash']}, "$amount", 0]}},
						diesel: {"$sum": {"$cond": [{"$eq": ['$advanceType', 'Diesel']}, "$amount", 0]}},
						dieselLtr: {"$sum": {"$cond": [{"$eq": ['$advanceType', 'Diesel']}, "$dieseInfo.litre", 0]}},
						fastag: {"$sum": {"$cond": [{"$eq": ['$advanceType', 'Fastag']}, "$amount", 0]}},
						happay: {"$sum": {"$cond": [{"$eq": ['$advanceType', 'Happay']}, "$amount", 0]}},
						totalAdv: {"$sum": "$amount"},

					}
				}
			];
		let advanceData = await TripAdvances.aggregate(aTrpAdvPipe).allowDiskUse();
		if(advanceData && advanceData[0] && data && data[0]){
			data[0].postRtAdv = advanceData[0];
		}
		if(data && data[0]){
			Trip.eachTripSummary(data && data[0].trip);
			let sumarry = await Trip.tripSummary(data && data[0].trip);
			data[0].opening = sumarry.openCloseBal.driver.opening;
			data[0].closing = sumarry.openCloseBal.driver.closing;
		}
		let finalData = {
			advanceAfterRt: data && data[0] && data[0].postRtAdv,
			opening: data && data[0] && data[0].opening,
			closing: data && data[0] && data[0].closing
		}
		return res.status(200).json({
			status: 'OK',
			message: "Vehicle data fetch Successfully",
			data:finalData
		});

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

router.route('/vendorPayment').post(async function (req, res, next) {

	try {

		let aTrip = req.body;

		if (!aTrip.length)
			throw new Error('Mandatory Fields are required');

		let refNo = aTrip[0].reference_no;
		let stationaryId = aTrip[0].stationaryId;

		let foundAdv = await TripAdvances.find({
			reference_no: refNo,
			clientId: req.user.clientId,
			isCancelled: {
				$not: {
					$eq: true
				}
			},
		});

		if (foundAdv.length)
			throw new Error('Reference No. already used');

		//Find stationary number if stationary id not provided to maintain 1 to 1 binding of stationary and Ref No.
		if (!stationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: refNo,
				type: 'Ref No',
				clientId: req.user.clientId
			});

			if (foundStationary) {
				stationaryId = foundStationary._id;

				req.body.forEach(o => {
					o.stationaryId = stationaryId;
				});
			}
		}

		if (stationaryId && (await billStationaryService.isUsed(stationaryId)))
			throw new Error('Reference No. already used');

		next();

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}

}, tripService.vendorAdvance);

router.route('/vendorPayment').put(async function (req, res, next) {

	try {

		let refNo = req.body.refNo;
		let aTrip = req.body.aTrip;

		if (!refNo) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Reference no. is a required field',
			});
		}

		let foundAdv = await TripAdvances.findOne({
			reference_no: refNo,
			clientId: req.user.clientId,
			isCancelled: {
				$not: {
					$eq: true
				}
			},
		});

		if (!(foundAdv && foundAdv._id))
			throw new Error('No Advance Found');

		let nStationaryId = aTrip[0].stationaryId;
		let oStationaryId = foundAdv.stationaryId;

		let nRefNo = aTrip[0].reference_no;
		let oRefNo = foundAdv.reference_no;

		if (!nStationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: nRefNo,
				type: 'Ref No',
				clientId: req.user.clientId
			});

			if (foundStationary) {
				nStationaryId = foundStationary._id;

				aTrip.forEach(o => {
					o.stationaryId = nStationaryId;
				});
			}
		}

		if (nRefNo != oRefNo) {

			let usedAdvance = await TripAdvances.findOne({
				reference_no: nRefNo,
				clientId: req.user.clientId,
				isCancelled: {
					$not: {
						$eq: true
					}
				},
			});

			if (usedAdvance && usedAdvance._id)
				throw new Error('Reference No. already used');

			if (nStationaryId && (await billStationaryService.isUsed(nStationaryId)))
				throw new Error('Reference No. already used');

			await billStationaryService.setUnset({
				modelName: 'tripadvances',
				userName: req.user.full_name,
			}, {
				refNo: nRefNo,
				stationaryId: nStationaryId
			}, {
				refNo: oRefNo,
				stationaryId: oStationaryId
			});

		}

		next();

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}

}, tripService.vendorPaymentEdit);

router.route('/vendorPaymentDel').put(async function (req, res, next) {

	try {

		let refNo = req.body.refNo;

		if (!refNo) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Reference no. is a required field',
			});
		}

		next();

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}

}, tripService.vendorPaymentDelete);

router.route('/upload_documents/:_id').put(async function (req, res, next) {
	if (otherUtil.isEmptyObject(req.params)) {
		return res.status(500).json({'status': 'ERROR', 'error_message': 'No id supplied'});
	}
	if (otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({'status': 'ERROR', 'error_message': 'Nothing in body'});
	}
	let trip = await Trip.findOne({_id: req.params._id});
	if (trip) {
		req.tripData = JSON.parse(JSON.stringify(trip));
		return next();
	} else {
		return res.status(500).json({status: 'ERROR', error_message: 'GR does not exist'});
	}
}, multipartMiddleware, tripService.documentsUpload);

router.route('/addAdvance/:_id').put(validate(paramValidation.addAdvanceValidator), tripService.addAdvance);
router.route('/dieselReq/:_id').put(tripService.addAdvance);

router.route('/UpdateSettleTrip/:_id').put(validate(paramValidation.UpdateSettleTripValidator), tripService.updateSettleTrip);

router.route('/settleTrip').put(validate(paramValidation.settleTripValidator), tripService.settleTrip);

router.route('/approvedBudget/all').get(validate(paramValidation.approvedBudgetValidator), tripService.getApprovedBudget);

router.route('/findByAdvanceDate').post(tripService.findByAdvanceDate);

router.route('/markSettle').put(tripService.markSettle);

router.route('/settleCompletely').put(tripService.settleCompletely);

router.route('/advAddTrip').put(tripService.advAddTrip);

router.route('/advDeleteTrip').put(tripService.advDeleteTrip);

router.route('/settleAcntMangerRmk').post(async function (req, res, next) {

	try {
		// Validation Start...
		if (!req.body.tsNo)
			throw new Error('Round trip number not found.');

		aFoundTrips = await Trip.find(
			{
				clientId: req.user.clientId,
				'advSettled.tsNo': req.body.tsNo
			});

		if (!aFoundTrips)
			throw new Error('Round trip number not found Or Invalid.');

		var tripRes = await tripService.accountMangerRemark(req, res, next);

		if (tripRes) {
			const oRes = {
				status: "OK",
				message: 'Account Manager Remark Added.'
			};
			oRes.data =  Trip.eachTripSummary(aFoundTrips);
			oRes.summary = await Trip.tripSummary(oRes.data);
			res.status(200).json(oRes);
		} else {

			return res.status(500).json({
				status: 'Error',
				message: 'Unexpected Error, Please contact to admin.',
			});
		}
	} catch (err) {
		winston.error(err.message || err.toString());
		next(err);
	}
});

router.route('/revertSettleCompletely').post(async function (req, res, next) {

	try {

		// Validation Start...
		if (!req.body.tsNo)
			throw new Error('Round trip number not found.');

		let aFoundTrips = await Trip.find(
			{
				clientId: req.user.clientId,
				'advSettled.tsNo': req.body.tsNo
			});

		if (!aFoundTrips)
			throw new Error('Round trip number not found Or Invalid.');

		if (aFoundTrips[0].markSettle && !aFoundTrips[0].markSettle.isSettled)
			throw new Error('Round trip not settled.');

		if (aFoundTrips[0].advSettled && !aFoundTrips[0].advSettled.isCompletelySettled)
			throw new Error('Round trip not completely settled.');

		if (aFoundTrips[0].advSettled && !aFoundTrips[0].advSettled.aVoucher)
			throw new Error('Voucher not found on this trip.');

		if (aFoundTrips[0].advSettled && aFoundTrips[0].advSettled.aVoucher && aFoundTrips[0].advSettled.aVoucher.length == 0)
			throw new Error('No any voucher found on this trip.');

		let fdVch;
		var voucherId;
		var avoucherVal = [];
		var aRevertVoucher = [];

		// Validation if any voucher's account imported.
		avoucherVal = aFoundTrips[0].advSettled.aVoucher;
		for (let j = 0; j < avoucherVal.length; j++) {
			voucherId = avoucherVal[j];
			if (voucherId) {
				fdVch = await Voucher.findOne({_id: voucherId}, {acImp: 1}).lean();
				if(!fdVch){
					let message = " Revert RT Action ,Settlement Voucher not found for RT No "+req.body.tsNo +" server :"+ config.serverName+" user : "+ req.user.full_name;
					telegram.sendMessage(message);
					console.error(message);
				}
				if (fdVch && fdVch.acImp && fdVch.acImp.st === true) {
					await voucherService.reverseOne(fdVch._id, req.body, req);
					//throw new Error('Voucher account already imported.');
				}
				// fdVch = await Voucher.findOne({_id: voucherId}, {acImp: 1}).lean();
				// if (fdVch && fdVch.acImp && fdVch.acImp.st === true) {
				// 	aRevertVoucher.push(voucherId)
				// 	// throw new Error('Voucher account already imported.');
				// }
			}
		}
		//aVoucherId.push(aFoundTrips.advSettled.aVoucher[i]);
		// req.body.ids = aRevertVoucher;
		// req.body.skipReturn = true;
		// let aVch = await voucherService.reverseAccounts(req, res, next);


		// Validation END

		var tripRes = await tripService.revertSettleCompletely(req, res, next);

		if (tripRes) {
			const oRes = {
				status: "OK",
				message: 'Completely Settled Trip REVERSED Successfully.'
			};
			oRes.data =  Trip.eachTripSummary(aFoundTrips);
			oRes.summary = await Trip.tripSummary(oRes.data);
			res.status(200).json(oRes);
		} else {
			return res.status(500).json({
				status: 'Error',
				message: 'Unexpected Error, Please contact to admin.',
			});
		}
	} catch (err) {
		winston.error(err.message || err.toString());
		next(err);
	}
});

// By Harikesh - 19-11-2019
router.route('/settleExpDeleteTrip/:_id').put(async function (req, res, next) {

	try {
		// Validation Start...
		if (!req.params._id) {
			return res.status(500).json({
				status: 'Error',
				message: 'Please Provide Expense',
			});
		}

		let oTrip = await Trip.findOne(
			{
				clientId: req.user.clientId,
				trip_expenses: otherUtil.arrString2ObjectId(req.params._id)
			});

		if (!oTrip._id) {
			return res.status(500).json({
				status: 'Error',
				message: 'No Trip Found',
			});
		}

		if (oTrip.advSettled.isCompletelySettled) {
			return res.status(500).json({
				status: 'Error',
				message: `The RT-${oTrip.advSettled.tsNo} group is already settled. So Trip expense cannot be removed.`,
			});
		}

		let oTripsExp = await TripExpense.findOne(
			{
				_id: otherUtil.arrString2ObjectId(req.params._id)
			});

		if (!oTripsExp._id) {
			return res.status(500).json({
				status: 'Error',
				message: 'No expense found on this Trip',
			});
		}
		// Validation END...

		// Delete Expense
		req.body.expId = otherUtil.arrString2ObjectId(req.params._id);
		let resExpDel = await tripService.expenseDeleteTrip(req, res);
		if (resExpDel) {
			// Delete Expense from trip
			req.body.tripId = oTrip._id;
			let resTripExpDel = await tripService.pullTripExp(req, res);

			if (resTripExpDel) {
				let aFoundTrips = await Trip.find(
					{
						clientId: req.user.clientId,
						_id: oTrip._id
					}).populate([
					{
						path: 'payments'
					}
				]);

				const oRes = {
					status: "OK",
					message: 'Trip Expense Removed Successfully'
				};

				let aTrips = await Trip.find({
					clientId: req.user.clientId,
					'advSettled.tsNo': aFoundTrips[0].advSettled.tsNo
				}).lean();

				oRes.data =  Trip.eachTripSummary(aTrips);
				oRes.summary = await Trip.tripSummary(oRes.data);

				res.status(200).json(oRes);

			} else {
				return res.status(500).json({
					status: 'Error',
					message: 'Trip Expense NOT Deleted',
				});
			}

		} else {
			return res.status(500).json({
				status: 'Error',
				message: 'Expense NOT Deleted',
			});
		}

	} catch (err) {
		winston.error(err.message || err.toString());
		next(err);
	}

});
// End

router.route('/payments/:_id').put(async function (req, res, next) {

	try {

		let fdTrip = await Trip.findOne({_id: req.params._id, clientId: req.user.clientId}, {
			advSettled: 1,
			isCancelled: 1
		}).lean();

		if (!(fdTrip && fdTrip._id))
			throw new Error('No Trip Found');

		if (fdTrip.isCancelled)
			throw new Error('Trip is cancelled. Payment Cannot be added.');

		if (fdTrip.advSettled.isCompletelySettled)
			throw new Error('Trip is completely settled. Payment Cannot be added.');

		// if(fdTrip.markSettle.isSettled)
		// 	throw new Error('Trip is Mark settled. Payment Cannot be added.');

		let refNo = req.body.refNo;
		let stationaryId = req.body.stationaryId;

		if (refNo) {
			let foundVoucher = await voucherService.findVoucherByQueryAsync({
				refNo: new RegExp('^' + refNo + '$')
			});

			if ((foundVoucher && foundVoucher.data && foundVoucher.data.length))
				throw new Error(`Voucher with Ref. No. ${refNo} already exists.`);
		}

		if (!stationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: refNo,
				type: 'Ref No',
				status: {
					$ne: 'used'
				},
				clientId: req.user.clientId
			});

			if (foundStationary) {
				req.body.stationaryId = stationaryId = foundStationary._id;
			}
		}

		if (stationaryId && (await billStationaryService.isUsed(stationaryId)))
			throw new Error('Ref No already used');

		let data = await voucherService.formatPayloadAndAdd({
			type: "Journal",
			clientId: req.user.clientId,
			vT: req.body.paymentType,
			refNo: req.body.refNo,
			gr: req.body.gr,
			stationaryId: req.body.stationaryId,
			isEditable: false,
			narration: req.body.narration,
			date: req.body.billDate,
			billNo: req.body.refNo,
			branch: req.body.branch,
			branchName: req.body.branchName,
			createdBy: req.user.full_name,
			drPay: req.body.drPay,

			from: req.body.from,
			fromName: req.body.fromName,
			to: req.body.to,
			toName: req.body.toName,
			amount: req.body.amount,
		});

		let voucherId = data[0].voucher._id;
		await voucherService.importOne(voucherId, req.body, req);

		if (stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'tripV2',
				docId: fdTrip._id.toString(),
				stationaryId,
			}, 'used');
		}

		if (voucherId)
			await Trip.updateOne({_id: fdTrip._id}, {
				$addToSet: {
					payments: voucherId
				}
			});

		if (voucherId && req.body.gr && req.body.gr._id)
			await GR.updateOne({_id: req.body.gr._id}, {
				$addToSet: {
					dedVchId: voucherId,
					dedVch: {
						_id: voucherId,
						amount: req.body.amount,
						date: req.body.billDate,
						refNo: req.body.refNo,
						vT: req.body.paymentType
					}
				}
			});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Data updated.',
			'data': data
		});

	} catch (e) {
		return res.status(500).json({
			status: "Error",
			message: e.toString(),
			error: e
		});
	}
});

router.route('/payments/:_id').delete(async function (req, res, next) {

	try {

		let fdTrip = await Trip.findOne(
			{
				clientId: req.user.clientId,
				'payments': req.params._id,
				'advSettled.isCompletelySettled': {$ne: true}
			}).lean();

		if (!(fdTrip && fdTrip._id))
			throw new Error(`No Trips found.`);

		if (fdTrip.advSettled && fdTrip.advSettled.isCompletelySettled)
			throw new Error(`Trip Advance Cannot be deleted. Because Trip no ${fdTrip.trip_no} is Completely Settled`);

		// if(fdTrip.markSettle && fdTrip.markSettle.isSettled)
		// 	throw new Error(`Trip Advance Cannot be deleted. Because Trip no ${fdTrip.trip_no} is Marked Settled`);

		let foundVoucher = await voucherService.findVoucherByIdAsync(req.params._id, {acImp: 1, stationaryId: 1, gr: 1});

		if (!foundVoucher)
			throw new Error(`Voucher Not Exist`);

		if (foundVoucher.acImp.st) {
			await voucherService.reverseOne(foundVoucher._id, req.body, req);
			// throw new Error('Payment Cannot be remove. Voucher is Imported to A/c');
		}

		if (foundVoucher.stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'tripV2',
				docId: foundVoucher._id,
				stationaryId: foundVoucher.stationaryId,
			}, 'cancelled');
		}

		await voucherService.removeVoucher({
			_id: req.params._id,
			clientId: req.user.clientId
		});

		await Trip.updateOne({_id: fdTrip._id}, {
			$pull: {
				payments: foundVoucher._id
			}
		});

		if(foundVoucher.gr && foundVoucher.gr._id)
			await GR.updateOne({_id: foundVoucher.gr._id}, {
				$pull: {
					dedVch: {
						_id: foundVoucher._id
					},
					dedVchId: foundVoucher._id
				}
			});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Payment Successfully Removed'
		});

	} catch (e) {
		return res.status(500).json({
			status: "Error",
			message: e.toString(),
			error: e
		});
	}
});

router.route('/paymentUpdate/:_id').put(async function (req, res, next) {

	try {

		let id = req.params._id;
		let clientId = req.user.clientId;
		let tsNo = req.body.tsNo;

		let fdTrip = await Trip.findOne(
			{
				clientId: req.user.clientId,
				'payments': req.params._id
			}, {advSettled: 1}).lean();

		if (!(fdTrip && fdTrip._id))
			throw new Error('No Trips found.');

		if (fdTrip.advSettled.isCompletelySettled)
			throw new Error('Payment cannot be edited. Trip is completely settled.');

		if (id) {

			let refNo = req.body.refNo;
			let foundVoucher = await voucherService.findVoucherByIdAsync(id);

			foundVoucher = JSON.parse(JSON.stringify(foundVoucher));

			if (!(foundVoucher && foundVoucher._id))
				throw new Error('No Voucher Found');

			if (foundVoucher.acImp.st) {
				await voucherService.reverseOne(foundVoucher._id, req.body, req);
				// throw new Error('Voucher Imported to A/c. Edit not allowed');
			}

			if (foundVoucher.refNo != refNo) {

				let fdVch = await voucherService.findVoucherByQueryAsync({
					refNo: new RegExp('^' + refNo + '$')
				}, {_id: 1});

				if (fdVch && fdVch.length)
					throw new Error(`Voucher with Ref. No. ${refNo} already exists.`);

				if (!req.body.stationaryId) {
					let foundStationary = await billStationaryService.findByRefAndType({
						bookNo: refNo,
						type: 'Ref No',
						status: {
							$ne: 'used'
						},
						clientId: req.user.clientId
					});

					if (foundStationary) {
						req.body.stationaryId = foundStationary._id;
					}
				}

				if (req.body.stationaryId && (await billStationaryService.isUsed(req.body.stationaryId)))
					throw new Error('Ref No already used');
			}

			let data = await voucherService.formatPayloadAndEdit({
				...foundVoucher,
				vT: req.body.paymentType,
				refNo: req.body.refNo,
				billNo: req.body.refNo,
				stationaryId: req.body.stationaryId,
				narration: req.body.narration,
				date: req.body.billDate,
				branch: req.body.branch,
				branchName: req.body.branchName,
				gr: req.body.gr || null,
				drPay: req.body.drPay,

				from: req.body.from,
				fromName: req.body.fromName,
				to: req.body.to,
				toName: req.body.toName,
				amount: req.body.amount,
				_id: id
			});

			await voucherService.importOne(foundVoucher._id, req.body, req);

			if (foundVoucher.refNo != refNo) {
				await billStationaryService.setUnset({
					modelName: 'tripV2',
					userName: req.user.full_name,
					docId: fdTrip._id.toString()
				}, {
					refNo: refNo,
					stationaryId: req.body.stationaryId
				}, {
					refNo: foundVoucher.refNo,
					stationaryId: foundVoucher.stationaryId
				});
			}

			if(foundVoucher.gr)
				await GR.updateOne({_id: foundVoucher.gr._id}, {
					$pull: {
						dedVch: {
							_id: id
						},
						dedVchId: id
					}
				});

			if(req.body.gr && req.body.gr._id)
				await GR.updateOne({_id: req.body.gr._id}, {
					$addToSet: {
						dedVchId: id,
						dedVch: {
							_id: id,
							amount: req.body.amount,
							date: req.body.billDate,
							refNo: req.body.refNo,
							vT: req.body.paymentType
						}
					}
				});



			return res.status(200).json({
				'status': 'OK',
				'message': 'Data updated.',
				'data': data
			});

		} else
			throw new Error('Mandatory Fields are required');

	} catch (e) {
		res.status(400).json({
			status: "Error",
			message: e.toString(),
			error: e
		});
	}
});

router.route('/rtTripDriver').put(async function (req, res, next) {

	let tsNo = req.body.tsNo || false;
	let aTrips = Array.isArray(req.body.aTrips) && req.body.aTrips.length > 0 && req.body.aTrips || false;
	let driverId = req.body.driver || false;
	let date = req.body.date || false;
	let msg = 'Driver Successfully Updated';
	let status = 'Ok';

	if (!(tsNo || aTrips) || !driverId || !date)
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Mandatory fields are required'
		});

	let oFilterQuery;

	if (tsNo)
		oFilterQuery = {'advSettled.tsNo': tsNo};
	else if (aTrips)
		oFilterQuery = {_id: {$in: otherUtil.arrString2ObjectId(aTrips)}};

	let updatedData = await Trip.updateMany({
		...oFilterQuery,
		'clientId': req.body.clientId,
		'statuses': {
			$elemMatch: {
				'status': 'Trip started',
				'date': {
					$gte: new Date(date)
				}
			}
		}
	}, {
		driver: driverId
	});

	if (updatedData && !updatedData.nModified) {
		msg = 'No Data found for Updated';
		status = 'Nothing to Update';
	}

	return res.status(200).json({
		'status': status,
		'message': msg,
		'data': updatedData
	});

});

router.route('/vendorDeal/:_id').put(async function (req, res, next) {

	let tripId = req.params._id || false;
	let vendorDeal = typeof req.body.vendorDeal === 'object' && req.body.vendorDeal || false;
	let branch = req.body.branch || false;
	let vendor = req.body.vendor || false;
	let clientId = req.body.cClientId || req.user.clientId || false;
	let tdsAccountData = req.body.tdsAccountData || false;
	let user = req.user._id || false;
	let userName = req.user.full_name;
	let isValid = true;

	// if there is any deduction and extra charge
	if(await Trip.count({
		"vendorDeal.loading_slip": vendorDeal.loading_slip,
		clientId,
		isCancelled :  {$ne: true},
		_id: {$ne: otherUtil.arrString2ObjectId(tripId)}
	}))
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Hire Slip already used'
		});

	if (vendorDeal.deduction) {
		for (let key in vendorDeal.deduction) {
			if (vendorDeal.deduction.hasOwnProperty(key)) {
				let ptr = vendorDeal.deduction[key];
				let from = ptr.from || false;
				let to = ptr.to || false;
				let typ = ptr.typ || false;
				let amount = ptr.amount || false;
				if (!from || !to || !amount || !typ) {
					isValid = false;
					break;
				}
			}
		}
	}

	if (vendorDeal.charges) {
		for (let key in vendorDeal.charges) {
			if (vendorDeal.charges.hasOwnProperty(key)) {
				let ptr = vendorDeal.charges[key];
				let from = ptr.from || false;
				let to = ptr.to || false;
				let typ = ptr.typ || false;
				let amount = ptr.amount || false;
				if (!from || !to || !amount || !typ) {
					isValid = false;
					break;
				}
			}
		}
	}

	if (vendorDeal && tripId && isValid) {

		try {

			//Find stationary number if stationary id not provided to maintain 1 to 1 binding of stationary and grNumber
			if (!vendorDeal.lsStationaryId) {
				let foundStationary = await BillStationary.findOne({
					bookNo: vendorDeal.loading_slip,
					type: 'Hire Slip',
					clientId: req.user.clientId
				}, {_id: 1}).lean();

				if (foundStationary)
					vendorDeal.lsStationaryId = foundStationary._id;
			}

			let foundVendorDeal = (await Trip.findOne({_id: tripId}, {vendorDeal: 1})).vendorDeal;

			if(!(foundVendorDeal.total_expense)){
				vendorDeal.created_by = req.user.full_name;
				vendorDeal.createdAt = new Date();
			}

			if ((vendorDeal.lsStationaryId || foundVendorDeal.lsStationaryId) && (vendorDeal.lsStationaryId !== foundVendorDeal.lsStationaryId)) {

				// if stationary is changed than cancel the previous stationary
				if (foundVendorDeal.lsStationaryId) {
					await BillStationary.findByIdAndUpdate(foundVendorDeal.lsStationaryId, {
						$set: {status: 'cancelled'},
						$push: {
							commonHistory: {
								user: req.user.full_name,
								date: new Date(),
								status: 'cancelled',
								wasLinkedTo: foundVendorDeal._id,
								wasLinkedToSchema: 'TripV2',
							}
						}
					});
				}

				// if stationary is changed than mark "USED" the new stationary
				if (vendorDeal.lsStationaryId) {
					await BillStationary.findByIdAndUpdate(vendorDeal.lsStationaryId, {
						$set: {status: 'used'},
						$push: {
							commonHistory: {
								user: req.user.full_name,
								date: new Date(),
								status: 'used',
								wasLinkedTo: foundVendorDeal._id,
								wasLinkedToSchema: 'TripGr',
							}
						}
					});
				} else {
					vendorDeal.lsStationaryId = null;
				}
			}


			vendorDeal.lastModifiedBy = req.user.full_name;
			vendorDeal.lastModifiedAt = new Date();
			let ack = await tripService.updateVendorDeal(tripId, {
				branch,
				clientId,
				user,
				userName,
				vendor,
				vendorDeal,
				tdsAccountData
			});


			let data = await Trip.find({_id: tripId});
			data =  Trip.eachTripSummary(data);
			let summary = await Trip.tripSummary(data);

			return res.status(200).json({
				'status': 'Success',
				'message': 'Vendor Deal Successfully Updated',
				'data': data,
				'summary': summary
			});

		} catch (err) {
			return res.status(500).json({
				'status': 'Error',
				'message': err.message || err.toString(),
				'data': err.toString()
			});
		}

	} else
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Mandatory fields are required'
		});
});

router.route('/vendorRvtAck/:_id').put(async function (req, res, next) {

	let tripId = req.params._id || false;

	// if there is any deduction and extra charge

	if (tripId) {

		try {

			let oTrip = await Trip.findOne({_id: tripId}, {vendorDeal: 1, advanceBudget: 1}).populate('vendorDeal.acknowledge.voucher').populate('vendorDeal.tdsVoucher').lean();

			if (!(oTrip && oTrip._id))
				throw new Error('No Trip Found');

			if (!oTrip.vendorDeal.acknowledge.status)
				throw new Error('Deal is not Acknowledged');
			if (oTrip.vendorDeal.acknowledge.voucher && oTrip.vendorDeal.acknowledge.voucher.acImp && oTrip.vendorDeal.acknowledge.voucher.acImp.st) {
				throw new Error('Deal vouchers are already imported please revert first');
			}

			if (oTrip.vendorDeal.tdsVoucher && oTrip.vendorDeal.tdsVoucher.acImp && oTrip.vendorDeal.tdsVoucher.acImp.st) {
				throw new Error('Deal TDS vouchers are already imported please revert first');
			}

			if (oTrip.advanceBudget && oTrip.advanceBudget.length) {
				throw new Error('Payment already done can not revert Deal');
			}
			// remove Ack voucher
			let foundVoucher = await voucherService.findVoucherByQueryAsync({
				_id: oTrip.vendorDeal.acknowledge.voucher && oTrip.vendorDeal.acknowledge.voucher._id,
				clientId: req.user.clientId
			});
			if (foundVoucher && foundVoucher[0]) {
				await voucherService.removeVoucher({
					_id: oTrip.vendorDeal.acknowledge.voucher && oTrip.vendorDeal.acknowledge.voucher._id,
					clientId: req.user.clientId
				});
			}
			// remove tds vch if exists
			if (oTrip.vendorDeal.tdsVoucher && oTrip.vendorDeal.tdsVoucher._id) {
				let foundTdsVoucher = await voucherService.findVoucherByQueryAsync({
					_id: oTrip.vendorDeal.tdsVoucher._id,
					clientId: req.user.clientId
				});
				if (foundTdsVoucher && foundTdsVoucher[0]) {
					await voucherService.removeVoucher({
						_id: oTrip.vendorDeal.tdsVoucher._id,
						clientId: req.user.clientId
					});
				}
			}

			let updatedData = await Trip.updateOne({_id: tripId}, {
				$unset: {
					'vendorDeal.acknowledge.date': 1,
					'vendorDeal.acknowledge.user': 1,
					'vendorDeal.acknowledge.userName': 1,
					'vendorDeal.acknowledge.voucher': 1,
					'vendorDeal.acknowledge.ackToAc': 1,
					'vendorDeal.tdsVoucher': 1,
					'vendorDeal.tdsFromAc': 1,
				},
				$set: {
					'vendorDeal.acknowledge.status': false,
				}
			}).lean();

			return res.status(200).json({
				'status': 'Success',
				'message': 'Vendor Deal Successfully Updated',
				'data': updatedData
			});

		} catch (err) {
			return res.status(500).json({
				'status': 'Error',
				'message': err.toString(),
				'err': err
			});
		}

	} else
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Mandatory fields are required'
		});
});

router.route('/vendorVoucherCheck').post(async function (req, res, next) {
	let oDealFilter = {
		clientId: req.body.clId || req.user.clientId,
		status: {$ne: 'Trip cancelled'},
		ownershipType: 'Market',
		//'vendorDeal.acknowledge.status':true,
		//'vendorDeal.acknowledge.voucher':{$exists:false}
	};
	if (req.body.loading_slip) {
		oDealFilter['vendorDeal.loading_slip'] = req.body.loading_slip;
	} else {
		if (req.body.start_date) {
			oDealFilter['created_at'] = {};
			oDealFilter['created_at']['$gte'] = new Date(req.body.start_date);
		}
		if (req.body.end_date) {
			if (!oDealFilter['created_at']) oDealFilter['created_at'] = {};
			oDealFilter['created_at']['$lte'] = new Date(req.body.end_date);
		}
	}

	let aTrip = await Trip.find(oDealFilter, {vendorDeal: 1, vendor: 1, trip_no: 1})
		.populate('vendor')
		.populate('vendorDeal.acknowledge.voucher')
		.populate('vendorDeal.tdsVoucher')
		//charges
		.populate('vendorDeal.charges.chalan_charges.voucher')
		.populate('vendorDeal.charges.chalan_charges.tdsVoucher')
		.populate('vendorDeal.charges.other_charges.voucher')
		.populate('vendorDeal.charges.other_charges.tdsVoucher')
		.populate('vendorDeal.charges.detention_charge.voucher')
		.populate('vendorDeal.charges.detention_charge.tdsVoucher')
		.populate('vendorDeal.charges.oveloading_charge.voucher')
		.populate('vendorDeal.charges.oveloading_charge.tdsVoucher')
		.populate('vendorDeal.charges.loading_charges.voucher')
		.populate('vendorDeal.charges.loading_charges.tdsVoucher')
		.populate('vendorDeal.charges.unloading_charges.voucher')
		.populate('vendorDeal.charges.unloading_charges.tdsVoucher')
		.populate('vendorDeal.charges.tirpal_charges.voucher')
		.populate('vendorDeal.charges.tirpal_charges.tdsVoucher')
		.populate('vendorDeal.charges.chalan_rto_charges.voucher')
		.populate('vendorDeal.charges.chalan_rto_charges.tdsVoucher')
		//deduction
		.populate('vendorDeal.deduction.tds_deduction.voucher')
		.populate('vendorDeal.deduction.damage_deduction.voucher')
		.populate('vendorDeal.deduction.penalty_deduction.voucher')
		.populate('vendorDeal.deduction.other_deduction.voucher')
		.lean();
	for (let i = 0; i < aTrip.length; i++) {
		let oTrip = aTrip[i];
		try {
			//check deal
			if (oTrip.vendorDeal && oTrip.vendorDeal.acknowledge && oTrip.vendorDeal.acknowledge.voucher) {
				if (((oTrip.vendorDeal.total_expense || 0) + (oTrip.vendorDeal.munshiyana || 0)) == oTrip.vendorDeal.acknowledge.voucher.ledgers[0].amount) {
					//console.log('deal and vch amount matched', oTrip.trip_no, i);
				} else {
					console.log('Fix Deal', oTrip.vendorDeal.loading_slip, oTrip.vendorDeal.totWithMunshiyana, oTrip.vendorDeal.total_expense, oTrip.vendorDeal.munshiyana, oTrip.vendorDeal.acknowledge.voucher.ledgers[0].amount, oTrip.vendorDeal.acknowledge.voucher.clientId);
					let refNo = 'HC' + oTrip.vendorDeal.loading_slip;
					let foundVoucher = await voucherService.findVoucherByQueryAsync({
						refNo: new RegExp('^' + refNo + '$')
					});
					if (foundVoucher && foundVoucher[0] && oTrip.vendor && (foundVoucher[0].clientId == oTrip.vendor.clientId)) {
						console.log('voucher found on same vendor', oTrip.vendorDeal.loading_slip);
						if (foundVoucher[0].ledgers[0].amount == ((oTrip.vendorDeal.total_expense || 0) + (oTrip.vendorDeal.munshiyana || 0))) {
							console.log('voucher found on same vendor with amount matched', oTrip.vendorDeal.loading_slip);
							//await Trip.update({_id:oTrip._id},{$set:{'vendorDeal.acknowledge.voucher':foundVoucher[0]._id}});
						}
					} else if (foundVoucher && foundVoucher[1] && oTrip.vendor && (foundVoucher[0].clientId == oTrip.vendor.clientId)) {
						console.log('voucher found 2', oTrip.vendorDeal.loading_slip);
						console.log('voucher found2 matched ', oTrip.vendorDeal.loading_slip);
						//await Trip.update({_id:oTrip._id},{$set:{'vendorDeal.acknowledge.voucher':foundVoucher[0]._id,'vendorDeal.acknowledge.status':false}});
						//await voucherService.updateExported(  { _id:foundVoucher[0]._id}, { $set:{clientId:oTrip.vendor.clientId}});
					} else {
						//console.log('no vch ',oTrip.vendorDeal.loading_slip);
					}
				}
			} else if (oTrip.vendorDeal.acknowledge.status) {
				console.log('deal acknowleged but voucher not found', oTrip.vendorDeal.loading_slip);
				let refNo = 'HC' + oTrip.vendorDeal.loading_slip;
				let foundVoucher = await voucherService.findVoucherByQueryAsync({
					refNo: new RegExp('^' + refNo + '$')
				});
				if (foundVoucher && foundVoucher[0] && oTrip.vendor && (foundVoucher[0].clientId == oTrip.vendor.clientId)) {
					console.log('voucher found on same vendor', oTrip.vendorDeal.loading_slip);
					if (foundVoucher[0].ledgers[0].amount == ((oTrip.vendorDeal.total_expense || 0) + (oTrip.vendorDeal.munshiyana || 0))) {
						console.log('voucher found on same vendor with amount matched', oTrip.vendorDeal.loading_slip);
						//await Trip.update({_id:oTrip._id},{$set:{'vendorDeal.acknowledge.voucher':foundVoucher[0]._id}});
					}
				} else if (foundVoucher && foundVoucher[0]) {
					console.log('voucher found', oTrip.vendorDeal.loading_slip);
					if (foundVoucher.length == 1 && oTrip.vendor.clientId && !foundVoucher[0].acImp.st) {
						console.log('voucher found not imported', oTrip.vendorDeal.loading_slip);
						//await Trip.update({_id:oTrip._id},{$set:{'vendorDeal.acknowledge.voucher':foundVoucher[0]._id,'vendorDeal.acknowledge.status':false}});
						//await voucherService.updateExported(  { _id:foundVoucher[0]._id}, { $set:{clientId:oTrip.vendor.clientId}});
					}
				} else {
					//console.log('no vch ');
				}

			}
			/*
						//check deal TDS
						if (oTrip.vendorDeal && oTrip.vendorDeal.tdsAmount) {
							if (oTrip.vendorDeal.tdsVoucher && oTrip.vendorDeal.tdsAmount == oTrip.vendorDeal.tdsVoucher.ledgers[0].amount) {
								//console.log('deal tds and vch amount matched', oTrip.trip_no, i);
							}else if (oTrip.vendorDeal.acknowledge.status) {
								console.log('deal acknowleged but tds amount not matched',oTrip.trip_no, i);
							}
						}


						//check chalan_charges
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.chalan_charges && oTrip.vendorDeal.charges.chalan_charges.voucher) {
							if (oTrip.vendorDeal.charges.chalan_charges.amount == oTrip.vendorDeal.charges.chalan_charges.voucher.ledgers[0].amount) {
								console.log('deal chalan_charges and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal chalan_charges',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but chalan_charges amount not matched',oTrip.trip_no, i);
						}

						//check chalan_charges TDS
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.chalan_charges && oTrip.vendorDeal.charges.chalan_charges.tdsVoucher) {
							if (oTrip.vendorDeal.charges.chalan_charges.tdsAmount == oTrip.vendorDeal.charges.chalan_charges.tdsVoucher.ledgers[0].amount) {
								console.log('deal chalan_charges tds and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal chalan_charges tds',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but chalan_charges tds amount not matched',oTrip.trip_no, i);
						}

						//check other_charges
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.other_charges && oTrip.vendorDeal.charges.other_charges.voucher) {
							if (oTrip.vendorDeal.charges.other_charges.amount == oTrip.vendorDeal.charges.other_charges.voucher.ledgers[0].amount) {
								console.log('deal other_charges and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal other_charges',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but other_charges amount not matched',oTrip.trip_no, i);
						}

						//check other_charges TDS
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.other_charges && oTrip.vendorDeal.charges.other_charges.tdsVoucher) {
							if (oTrip.vendorDeal.charges.other_charges.tdsAmount == oTrip.vendorDeal.charges.other_charges.tdsVoucher.ledgers[0].amount) {
								console.log('deal other_charges tds and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal other_charges tds',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but other_charges tds amount not matched',oTrip.trip_no, i);
						}

						//check detention_charge
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.detention_charge && oTrip.vendorDeal.charges.detention_charge.voucher) {
							if (oTrip.vendorDeal.charges.detention_charge.amount == oTrip.vendorDeal.charges.detention_charge.voucher.ledgers[0].amount) {
								console.log('deal detention_charge and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal detention_charge',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but detention_charge amount not matched',oTrip.trip_no, i);
						}

						//check detention_charge tds
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.detention_charge.detention_charge && oTrip.vendorDeal.charges.detention_charge.tdsVoucher) {
							if (oTrip.vendorDeal.charges.detention_charge.tdsAmount == oTrip.vendorDeal.charges.detention_charge.tdsVoucher.ledgers[0].amount) {
								console.log('deal detention_charge  tds and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal detention_charge tds ',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but detention_charge tds amount not matched',oTrip.trip_no, i);
						}

						//check oveloading_charge
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.oveloading_charge && oTrip.vendorDeal.charges.oveloading_charge.voucher) {
							if (oTrip.vendorDeal.charges.oveloading_charge.amount == oTrip.vendorDeal.charges.oveloading_charge.voucher.ledgers[0].amount) {
								console.log('deal oveloading_charge and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal oveloading_charge',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but oveloading_charge amount not matched',oTrip.trip_no, i);
						}

						//check oveloading_charge tds
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.oveloading_charge && oTrip.vendorDeal.charges.oveloading_charge.tdsVoucher) {
							if (oTrip.vendorDeal.charges.oveloading_charge.tdsAmount == oTrip.vendorDeal.charges.oveloading_charge.tdsVoucher.ledgers[0].amount) {
								console.log('deal oveloading_charge tds and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal oveloading_charge tds',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but oveloading_charge tds amount not matched',oTrip.trip_no, i);
						}

						//check loading_charges
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.loading_charges && oTrip.vendorDeal.charges.loading_charges.voucher) {
							if (oTrip.vendorDeal.charges.loading_charges.amount == oTrip.vendorDeal.charges.loading_charges.voucher.ledgers[0].amount) {
								console.log('deal loading_charges and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal loading_charges',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but loading_charges amount not matched',oTrip.trip_no, i);
						}

						//check loading_charges tds
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.loading_charges && oTrip.vendorDeal.charges.loading_charges.tdsVoucher) {
							if (oTrip.vendorDeal.charges.loading_charges.tdsAmount == oTrip.vendorDeal.charges.loading_charges.tdsVoucher.ledgers[0].amount) {
								console.log('deal loading_charges tds and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal loading_chargestds ',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but loading_charges tds amount not matched',oTrip.trip_no, i);
						}

						//check unloading_charges
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.unloading_charges && oTrip.vendorDeal.charges.unloading_charges.voucher) {
							if (oTrip.vendorDeal.charges.unloading_charges.amount == oTrip.vendorDeal.charges.unloading_charges.voucher.ledgers[0].amount) {
								console.log('deal unloading_charges and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal unloading_charges',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but unloading_charges amount not matched',oTrip.trip_no, i);
						}

						//check unloading_charges tds
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.unloading_charges && oTrip.vendorDeal.charges.unloading_charges.tdsVoucher) {
							if (oTrip.vendorDeal.charges.unloading_charges.tdsAmount == oTrip.vendorDeal.charges.unloading_charges.tdsVoucher.ledgers[0].amount) {
								console.log('deal unloading_charges tds and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal unloading_charges tds',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but unloading_charges tds amount not matched',oTrip.trip_no, i);
						}

						//check tirpal_charges
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.tirpal_charges && oTrip.vendorDeal.charges.tirpal_charges.voucher) {
							if (oTrip.vendorDeal.charges.tirpal_charges.amount == oTrip.vendorDeal.charges.tirpal_charges.voucher.ledgers[0].amount) {
								console.log('deal tirpal_charges and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal tirpal_charges',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but tirpal_charges amount not matched',oTrip.trip_no, i);
						}

						//check tirpal_charges tds
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.tirpal_charges && oTrip.vendorDeal.charges.tirpal_charges.tdsVoucher) {
							if (oTrip.vendorDeal.charges.tirpal_charges.tdsAmount == oTrip.vendorDeal.charges.tirpal_charges.tdsVoucher.ledgers[0].amount) {
								console.log('deal tirpal_charges tds and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal tirpal_charges tds',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but tirpal_charges tds amount not matched',oTrip.trip_no, i);
						}

						//check tds_deduction
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.tds_deduction && oTrip.vendorDeal.charges.tds_deduction.voucher) {
							if (oTrip.vendorDeal.charges.tds_deduction.amount == oTrip.vendorDeal.charges.tds_deduction.voucher.ledgers[0].amount) {
								console.log('deal tds_deduction and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal tds_deduction',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but tds_deduction amount not matched',oTrip.trip_no, i);
						}

						//check damage_deduction
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.damage_deduction && oTrip.vendorDeal.charges.damage_deduction.voucher) {
							if (oTrip.vendorDeal.charges.damage_deduction.amount == oTrip.vendorDeal.charges.damage_deduction.voucher.ledgers[0].amount) {
								console.log('deal damage_deduction and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal damage_deduction',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but damage_deduction amount not matched',oTrip.trip_no, i);
						}

						//check penalty_deduction
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.penalty_deduction && oTrip.vendorDeal.charges.penalty_deduction.voucher) {
							if (oTrip.vendorDeal.charges.penalty_deduction.amount == oTrip.vendorDeal.charges.penalty_deduction.voucher.ledgers[0].amount) {
								console.log('deal penalty_deduction and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal penalty_deduction',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but penalty_deduction amount not matched',oTrip.trip_no, i);
						}

						//check other_deduction
						if (oTrip.vendorDeal && oTrip.vendorDeal.charges && oTrip.vendorDeal.charges.other_deduction && oTrip.vendorDeal.charges.other_deduction.voucher) {
							if (oTrip.vendorDeal.charges.other_deduction.amount == oTrip.vendorDeal.charges.other_deduction.voucher.ledgers[0].amount) {
								console.log('deal other_deduction and vch amount matched', oTrip.trip_no, i);
							} else {
								console.log('Fix Deal other_deduction',oTrip.trip_no, i);
							}
						} else{
							console.log('deal acknowleged but other_deduction amount not matched',oTrip.trip_no, i);
						}
						*/
		} catch (e) {
			console.log('deal checking', e.toString(), oTrip.trip_no, i);
		}
	}

	return res.status(200).json({
		'status': 'OK',
		'message': 'Testing now'
	});
});

router.route('/plReport').post(async function (req, res, next) {

	try {

		let data = await tripService.plReport(req.body);
		if (req.body.download) {
			ReportExelService.plReport(data, req.body.to, req.body.from, req.user.clientId, function (d) {
				return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					}
				);
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found....',
				'data': data
			});
		}

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}

});

router.post('/resetRTBalance', async function (req, res, next) {

	try {

		await tripService.resetRTBalance(req, res);

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}

});

router.put('/docs/:_id', async function (req, res, next) {
	try {
		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		next();

	} catch (e) {
		return res.status(500).json({
			status: 'Error',
			message: e.toString(),
		});
	}
}, multipartMiddleware, async function (req, res, next) {
	try {
		if (!req.body.bodyKey)
			throw new Error('Mandatory Fields are required');

		let key = req.body.bodyKey;
		let _id = otherUtil.arrString2ObjectId(req.params._id);

		// console.log(req, req.body, req.files, req.params);

		if (req.files[key]) {
			let doc = {};
			req.files = req.files[key];
			await FileService.uploadFiles(req, 'tripV2', doc);

			await Trip.updateOne({_id, doc: {$exists: false}}, {
				$set: {
					doc: {
						rc: [],
						dl: [],
						insurance: [],
						fitness: [],
						permit: [],
						chalan: [],
						misc: [],
					}
				}
			});

			let trip = await Trip.updateOne({_id}, {
				$addToSet: {
					[`doc.${key}`]: {$each: doc.documents.map(o => o.docReference)}
				}
			});
		}

		let updatedDoc = await Trip.findOne({_id}, {doc: 1}).lean();

		return res.status(200).json({
			status: 'Success',
			message: "Doc. Successfully Uploaded",
			data: updatedDoc
		});

	} catch (e) {
		return res.status(500).json({
			status: 'Error',
			message: e.toString(),
		});
	}
});

router.delete('/docs/:_id', async function (req, res, next) {
	try {

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		if (!req.body.doc)
			throw new Error('Mandatory Fields are required');

		let _id = otherUtil.arrString2ObjectId(req.params._id);

		for (let [key, value] of Object.entries(req.body.doc)) {

		}

		if (req.files[key]) {
			let doc = {};
			req.files = req.files[key];
			await FileService.uploadFiles(req, 'tripV2', doc);

			await Trip.updateOne({_id, doc: {$exists: false}}, {
				$set: {
					doc: {
						rc: [],
						dl: [],
						insurance: [],
						fitness: [],
						permit: [],
						chalan: [],
						misc: [],
					}
				}
			});

			let trip = await Trip.updateOne({_id}, {
				$addToSet: {
					[`doc.${key}`]: {$each: doc.documents.map(o => o.docReference)}
				}
			});
		}

		let updatedDoc = await Trip.findOne({_id}, {doc: 1}).lean();

		return res.status(200).json({
			status: 'Success',
			message: "Doc. Successfully Uploaded",
			data: updatedDoc
		});

	} catch (e) {
		return res.status(500).json({
			status: 'Error',
			message: e.toString(),
		});
	}
});

router.route('/genMultiGr').post(tripService.genMultiGr);
router.route('/revertMultiGr/:_id').post(tripService.revertMultiGr);

router.route('/cachetrip').post(async function (req, res, next) {
	await new TripCache(req.body.from, req.body.to).exec();
	// await Promise.all([
	// 	new mapSuspense().exec(),
	// 	new unmapSuspense().exec()
	// ]);
	return res.status(200).json({
		"status": "OK",
		"message": "cached successfully",
	});
});

router.route('/roundTrip').post(async function (req, res, next){

	req.body.no_of_docs = req.body.no_of_docs || 10;
	req.body.skip = req.body.skip || 1;

	const consFilter = (oBody) => {
		let o = {
			'advSettled.tsNo': {$exists:true},
			'ownershipType': req.body.ownershipTyape ? {$in:req.body.ownershipType} :  {"$ne": "Market"}
		};
		for (let key in oBody) {
			if (oBody.hasOwnProperty(key) && ['advSettled.tsNo', 'vehicle', 'driver', 'markSettle.isSettled', 'segment_type'].indexOf(key) >= 0) {
				if(oBody[key].toString().match(/^[0-9a-fA-F]{24}$/)) {
					o[key] = otherUtil.arrString2ObjectId(oBody[key]);
				}else if (key === 'segment_type') {
					if (oBody[key] instanceof Array) {
						o[key] = {$in: oBody[key]};
					} else {
						o[key] = oBody[key];
					}
				}else {
					o[key] = oBody[key];
				}
			}
		}
		if ((typeof(o['advSettled.tsNo']) !== 'number') && oBody.from && oBody.to) {
			o[oBody.by || 'advSettled.creation.date'] = {
				$gte: moment(oBody.from).startOf('day').toDate(),
				$lte: moment(oBody.to).endOf('day').toDate(),
			};
		}
		return o;
	};

	let oFil = consFilter(req.body);
	oFil.clientId = req.user.clientId;
	let vehicleQuery = {};
	if(req.body.owner_group){
		if(req.body.owner_group instanceof Array){
			vehicleQuery['vehicle.owner_group'] = {$in:req.body.owner_group};
		}
		else{
			vehicleQuery['vehicle.owner_group'] = req.body.owner_group;

		}
	}
	const aggrQuery = [
		{$match: oFil},
		{
			$project: {
				"statuses": 1,
				category: 1,
				"gr": 1,
				"driver": 1,
				"route": 1,
				"trip_expenses": 1,
				"advanceBudget": 1,
				"extraKm": 1,
				"advSettled": 1,
				"vehicle": 1,
				"segment_type": 1,
				"trip_no": 1,
				"vehicle_no": 1,
				"markSettle": 1,
				"payments": 1
			}
		},
		{
			$addFields: {
				'trip_start_status': {
					$arrayElemAt: [{
						$filter: {input: '$statuses', as: 'item', cond: {$eq: ['$$item.status', 'Trip started']}}
					}, 0]
				},
				'trip_end_status': {
					$arrayElemAt: [{
						$filter: {input: '$statuses', as: 'item', cond: {$eq: ['$$item.status', 'Trip ended']}}
					}, 0]
				},
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
				"statuses": 1,
				category: 1,
				"driver": 1,
				"extraKm": 1,
				"vehicle": 1,
				"advSettled": 1,
				"segment_type": 1,
				"trip_no": 1,
				"vehicle_no": 1,
				"trip_expenses.amount": 1,
				"trip_expenses.type": 1,
				"gr":1,
				// "gr.totalFreight": 1,
				// "gr.internal_rate": 1,
				"advanceBudget.amount": 1,
				"advanceBudget.advanceType": 1,
				"advanceBudget.dieseInfo": 1,
				"route.route_distance": 1,
				"route_name": "$route.name",
				"trip_start_status": 1,
				"trip_end_status": 1,
				"markSettle": 1,
				"payments": 1
			}
		},
		{
			$addFields: {
				'actual_expense': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {$add: ["$$value", {$ifNull: ["$$this.amount", 0]}]},
					}
				},
				'borderExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Border"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'challanExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Challan"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'datacommiExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Dala Commision"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'diesalExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Diesel"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'fixedSalExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Fixed + Salary"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'oktimeExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "OK + Time"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'parkingExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Parking"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'rajaiExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Rajai"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'repairExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Repair"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'rotiExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Roti"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'serviceExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Service"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'extraExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Extra"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'missPendExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Miscellaneous Pending"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'fastagTollExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Fastag Toll Tax"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'cashTollExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Cash Toll Tax"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'tollExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Toll Tax"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'wagesExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Wages"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'localTripExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Local Trip"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'consumStoreExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Consumable store"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'addBlueExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Add Blue"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
					}
				},
				'phoneExp': {
					$reduce: {
						input: '$trip_expenses',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{$eq: ["$$this.type", "Phone Expense"]},
										{$ifNull: ["$$this.amount", 0]},
										0
									]
								}
							]
						},
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
				'diesel': {
					$reduce: {
						input: '$advanceBudget',
						initialValue: 0,
						in: {
							$add: [
								"$$value",
								{
									$cond: [
										{
											$or: [
												{$eq: ["$$this.advanceType", "Diesel"]},
												{$eq: ["$$this.advanceType", "Extra Diesel"]},
											]
										},
										{$ifNull: ["$$this.dieseInfo.litre", 0]},
										0
									]
								}
							]
						},
					}
				},
				'trip_total_dist': {$cond: [ {$eq: ["$route.route_distance", 0]}, 1, {$ifNull: ['$route.route_distance', 1]} ]},
				'trip_total_ext': {$ifNull: ['$extraKm', 0]},

				// 	'trip_total_dist': {
				// 		$add: [
				// 			{ $cond: [ { $eq: ['$route.route_distance', 0] }, 1, '$route.route_distance'] },
				// 			0,
				// 		]
				// 	},
				// 	'trip_total_dist_with_ekm': {
				// 		$add: [
				// 			{
				// 				$cond: [
				// 					{$eq: ['$route.route_distance', 0]},
				// 					1,
				// 					{$ifNull: ['$route.route_distance', 1]},
				// 				]
				// 			},
				// 			{$ifNull: ['$extraKm', 0]}
				// 		]
				// 	}
			}
		},
		{
			$addFields: {
				'initial_profit': {
					$subtract: ['$internal_freight', '$tAdv']
				},
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
		{$match: vehicleQuery},
		{
			$project: {
				"actual_expense": 1,
				"borderExp": 1,
				"challanExp": 1,
				"datacommiExp": 1,
				"diesalExp": 1,
				"fixedSalExp": 1,
				"oktimeExp": 1,
				"parkingExp": 1,
				"rajaiExp": 1,
				"repairExp": 1,
				"rotiExp": 1,
				"serviceExp": 1,
				"extraExp": 1,
				"missPendExp": 1,
				"fastagTollExp": 1,
				"cashTollExp": 1,
				"tollExp": 1,
				"wagesExp": 1,
				"localTripExp": 1,
				"addBlueExp": 1,
				"consumStoreExp": 1,
				"phoneExp": 1,
				"internal_freight": 1,
				"tAdv": 1,
				"diesel": 1,
				"trip_total_dist": 1,
				"trip_total_ext": 1,
				"initial_profit": 1,
				"vehicle": 1,
				"statuses": 1,
				"driver": 1,
				"extraKm": 1,
				"advSettled": 1,
				"segment_type": 1,
				"trip_no": 1,
				"vehicle_no": 1,
				"trip_expenses.amount": 1,
				"trip_expenses.type": 1,
				"gr":1,
				// "gr.totalFreight": 1,
				// "gr.internal_rate": 1,
				"advanceBudget.amount": 1,
				"advanceBudget.advanceType": 1,
				"advanceBudget.dieseInfo": 1,
				"route.route_distance": 1,
				"route_name": 1,
				"trip_start_status": 1,
				"trip_end_status": 1,
				"markSettle": 1,
				"payments": 1,
				category: 1,
			}
		},
		{
			"$lookup": {
				"from": "vouchers",
				"localField": "payments",
				"foreignField": "_id",
				"as": "payment"
			}
		},
		{$sort: {'advSettled.creation.date': 1}},
		{
			$group: {
				_id: '$advSettled.tsNo',
				trips: {$push: '$$ROOT'},
				allSegments: {$push: {$concat: ['$segment_type', '(', {$toString: '$trip_no'}, ')']}},
				segment: {$last: '$segment_type'},
				vehicle_no: {$last: '$vehicle_no'},
				vehicle_type: {$last: '$veh_type_name'},
				advSettled: {$last: '$advSettled'},
				route: {$last: '$route'},
				totalKM: {$sum: '$trip_total_dist'},
				totalExtKM: {$sum: '$trip_total_ext'},
				firstTripStart: {$first: '$trip_start_status'},
				lastTripEnd: {$last: '$trip_end_status'},
				netExpense: {$sum: '$actual_expense'},
				total_internal_freight: {$sum: '$internal_freight'},
				total_actual_profit: {$sum: '$initial_profit'},
				total_diesel: {$sum: '$diesel'},
				total_advance: {$sum: '$tAdv'},
				totBorderExp: {$sum: '$borderExp'},
				totChallanExp: {$sum: '$challanExp'},
				totDatacommiExp: {$sum: '$datacommiExp'},
				totDiesalExp: {$sum: '$diesalExp'},
				totFixedSalExp: {$sum: '$fixedSalExp'},
				totOktimeExp: {$sum: '$oktimeExp'},
				totParkingExp: {$sum: '$parkingExp'},
				totRajaiExp: {$sum: '$rajaiExp'},
				totRepairExp: {$sum: '$repairExp'},
				totRotiExp: {$sum: '$rotiExp'},
				totServiceExp: {$sum: '$serviceExp'},
				totExtraExp: {$sum: '$extraExp'},
				totMissPendExp: {$sum: '$missPendExp'},
				totFastagTollExp: {$sum: '$fastagTollExp'},
				totCashTollExp: {$sum: '$cashTollExp'},
				totTolltaxExp: {$sum: '$tollExp'},
				totWagesExp: {$sum: '$wagesExp'},
				totConsumStoreExp: {$sum: '$consumStoreExp'},
				totLocalTripExp: {$sum: '$localTripExp'},
				totPhoneExp: {$sum: '$phoneExp'},
				totAddBlueExp: {$sum: '$addBlueExp'},
			}
		},
	];
	aggrQuery.push(
		{
			$addFields: {
				// in days
				rtElapsed: {
					$divide: [
						{
							$subtract: ['$lastTripEnd.date', '$firstTripStart.date']
						},
						86400000
					]
				},
				sumTotKm: {
					$add: [
						{$ifNull: ['$totalKM', 0]},
						{$ifNull: ['$totalExtKM', 0]}
					]
				}
			}
		},
		{
			$addFields: {
				'revenue/km': {$divide: ['$total_internal_freight', {$cond: [{$eq: ['$totalKM', 0]}, 1, '$totalKM']}]},
				'expense/km': {$divide: ['$netExpense', {$cond: [{$eq: ['$sumTotKm', 0]}, 1, '$sumTotKm']}]},
				'profit/km': {$divide: ['$total_actual_profit', {$cond: [{$eq: ['$totalKM', 0]}, 1, '$totalKM']}]},
				'profit/day': {$divide: ['$total_actual_profit', {$cond: [{$eq: ['$rtElapsed', 0]}, 1, '$rtElapsed']}]},
			}
		},
		{
			$project: {
				_id: 1,
				segment_type: 1,
				trip_no: 1,
				segment: 1,
				vehicle_type: 1,
				vehicle_no: 1,
				advSettled: 1,
				route: 1,
				totalKM: 1,
				"totalExtKM": 1,
				'firstTripStart.date': 1,
				'firstTripStart.status': 1,
				'lastTripEnd.date': 1,
				'lastTripEnd.status': 1,
				netExpense: 1,
				total_internal_freight: 1,
				total_actual_profit: 1,
				total_diesel: 1,
				// Added New For Expense Report...
				totBorderExp: 1,
				totChallanExp: 1,
				totDatacommiExp: 1,
				totDiesalExp: 1,
				totFixedSalExp: 1,
				totOktimeExp: 1,
				totParkingExp: 1,
				totRajaiExp: 1,
				totRepairExp: 1,
				totRotiExp: 1,
				totServiceExp: 1,
				totExtraExp: 1,
				totMissPendExp: 1,
				totFastagTollExp: 1,
				totCashTollExp: 1,
				totTolltaxExp: 1,
				totWagesExp: 1,
				totPhoneExp: 1,
				totAddBlueExp: 1,
				totLocalTripExp: 1,
				totConsumStoreExp: 1,
				// END
				total_advance: 1,
				rtElapsed: 1,
				'revenue/km': 1,
				'expense/km': 1,
				'profit/km': 1,
				'profit/day': 1,
				"trips.markSettle": 1,
				"trips.trip_no": 1,
				"trips.category": 1,
				"trips.payments": 1,
				"trips.totalExtKM": 1,
				"trips.totalKM": 1,
				"trips.trip_start_status.status": 1,
				"trips.trip_start_status.date": 1,
				"trips.trip_end_status.status": 1,
				"trips.trip_end_status.date": 1,
				"trips.advSettled": 1,
				"trips.vehicle.veh_owner_group": 1,
				"trips.vehicle_no": 1,
				"trips.vehicle.veh_type_name": 1,
				"trips.vehicle.owner_group": 1,
				"trips.route_name": 1,
				"trips.route.route_distance": 1,
				"trips.extraKm": 1,
				"trips.driver.name": 1,
				"trips.driver.account": 1,
				"trips.internal_freight": 1,
				"trips.segment_type": 1,
				"trips.gr.grNumber": 1,
				"trips.gr.weight": 1,
				"trips.gr.customer": 1,
				"trips.payment": 1
			}
		});

	aggrQuery.push({$sort:{'trips.advSettled.creation.date': -1}});
	aggrQuery.push({ $skip: (req.body.no_of_docs * req.body.skip) - req.body.no_of_docs });


	let oQuery = {aggQuery: aggrQuery, no_of_docs: req.body.no_of_docs};
	let tripData = await serverSidePage.requestData(Trip, oQuery); //tripv2

			return res.status(200).json({
				status: "SUCCESS",
				message: 'Round Trip',
				data: {
					data:tripData || []
				},
			});
});

router.route('/tripComparison').post(async function(req, res, next){
	try{
		let data = await tripService.tripCmprTable(req.body);
		ReportExelService.tripComparisonReport(data, req.body, req.body.to, req.body.from, req.user.clientId, function (d) {
				return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					}
				);
			});
	}catch(err){
		return res.status(500).json({
			'status': 'ERROR',
			'message': err.toString(),
			'data': err
		});
	}

});

router.route('/tripsheetSummReport').post(async function(req, res, next) {
	try{
		let data = await tripService.tripsheetSummary(req);

		ReportExelService.tripsheetSummReport(data, req.body, req.user.clientId, function (d) {
			return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': d.url
				}
			);
		});
	}catch(err){
		return res.status(500).json({
			'status' : 'ERROR',
			'message' : err.toString(),
			'data' : err
		})
	}
});

router.route('/getDevice').post(async function (req, res) {
	try {

		let oTrFil = {
			"selected_uid":"MIDDLEMILE",
			"login_uid":"MIDDLEMILE"
		};
		if(req.body.imei){
			oTrFil.imei = req.body.imei;
		}
		let tracksheetData = await locationService.getTracksheetDataAsync(oTrFil);
		if(tracksheetData && tracksheetData.length){
			return res.status(200).json({
				status: 'OK',
				message: "All Device Get Successfully",
				data:tracksheetData
			});
		}else{
			return res.status(500).json({
				status: 'ERROR',
				message: "No Device Data Get",
			});
		}
	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

router.route('/simBasePlayBack').post(async function (req, res) {
	try {
		if((!req.body.trip_no)){
			throw new Error('Trip No is Mandatory');
		}
		if(req.body.trip_no){
			try {
				let data = await traqoApiService.fetchTripTraqo(req.body.trip_no);
				data = JSON.parse(data);
				if(data.status === "success"){
					data = await formatPlaybackData(data);
					let filter = {};
					if(req.body.trip_no){
						filter.trip_no = req.body.trip_no;
					}
					filter.clientId = req.user.clientId;
					const aggrQuery = [
						{$match: filter},
						{
							$project: {
								"driver": 1,
								"route": 1,
								"vendor":1,
								"trip_no": 1,
								"vehicle_no": 1,
								"start_date": 1,
								"created_at":1
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
							$project: {
								"driver.prim_contact_no": 1,
								"trip_no": 1,
								"vehicle_no": 1,
								"vendor.name": 1,
								"source":"$route.source.c",
								"destination":"$route.destination.c",
								"start_date": 1,
								"route_distance": "$route.route_distance",
							}
						},
					];
					aggrQuery.push({$sort:{'start_date': -1}});
					let oQuery = {aggQuery: aggrQuery};
					let tripData = await serverSidePage.requestData(Trip, oQuery); //tripv2
					if(req.body.download){

						data.driver = tripData && tripData[0] && tripData[0].driver && tripData[0].driver.prim_contact_no;
						data.vehicle = tripData && tripData[0] && tripData[0].vehicle_no;
						data.source = tripData && tripData[0] && tripData[0].source;
						data.destination = tripData && tripData[0] && tripData[0].destination;
						data.vendor = tripData && tripData[0] && tripData[0].vendor && tripData[0].vendor.name;
						ReportExelService.simBasePlayBackReport(data, req.body, req.user.clientId, function (d) {
							return res.status(200).json({
									'status': 'OK',
									'message': 'report download available.',
									'url': d.url
								}
							);
						});
					}
					else{
						data.tot_dist = tripData && tripData[0] && tripData[0].route_distance || 0;
						data.covDist = (data.tot_dist - data.rmDist)|| 0;
						return res.status(200).json({
							status: 'OK',
							message: "PlayBack data  Get Successfully",
							data:data
						});
					}
				}else{
					return res.status(200).json({
						status: 'OK',
						message: data.status,
						data:[]
					});
				}
			} catch (e) {
				console.error('[Tracqo Api  error]', e);
			}
		}
	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

router.route('/jobOrderReport').post(async function (req, res, next){
	try {
		if(!req.body.download){
			req.body.no_of_docs = req.body.no_of_docs || 10;
			req.body.skip = req.body.skip || 1;
		}
		let filter = {};
		if(req.body.vehicle){
			filter.vehicle = mongoose.Types.ObjectId(req.body.vehicle);
		}
		if(req.body.vehicle_no){
			filter.vehicle_no = req.body.vehicle_no;
		}
		if(req.body.from && req.body.to){
			filter['start_date'] ={
				$gte: moment(req.body.from).startOf('day').toDate(),
				$lte: moment(req.body.to).endOf('day').toDate()
			}
		}
		if(req.body.trip_no){
			filter.trip_no = req.body.trip_no;
		}
		filter.clientId = req.user.clientId;
		const aggrQuery = [
			{$match: filter},
			{
				$project: {
					"statuses": 1,
					category: 1,
					"driver": 1,
					"route": 1,
					"extraKm": 1,
					"vehicle": 1,
					"vendor":1,
					"segment_type": 1,
					"trip_no": 1,
					"vehicle_no": 1,
					"start_date": 1,
					"end_date":1,
					"device":1,
					"alert":1,
					"playBack":1,
					"geofence_points":1,
					"created_at":1,
					"currentStatus":1,
					"currentLocation":1,
					"tat_hr":1,
					"tat_min":1,
					"sealStatus":1
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
			{
				$project: {
					"statuses": 1,
					category: 1,
					"driver.name": 1,
					"driver.prim_contact_no": 1,
					"extraKm": 1,
					"advSettled": 1,
					"segment_type": 1,
					"trip_no": 1,
					"vehicle_no": 1,
					"vendor.name": 1,
					"route.route_distance": 1,
					"route_name": "$route.name",
					"source":"$route.source.c",
					"destination":"$route.destination.c",
					"start_date": 1,
					"end_date":1,
					"device":1,
					"alert":1,
					"playBack":1,
					"geofence_points":1,
					"created_at":1,
					"currentStatus":1,
					"currentLocation":1,
					"tat_hr":1,
					"tat_min":1,
					"sealStatus":1,
					"vehicle.gpsData.odo":1,
					"vehicle.gpsData.address":1,
					"vehicle.gpsData.status":1,

				}
			},
			{
				"$addFields": {
					'tat_in_ms': {$multiply: [{$ifNull:["$tat_hr",null]}, 3600000]},//tat_hr * ms in 1 hr
					"tat_speed": {//it internally usage tat_in_ms by formula
						"$cond": [{"$gt":['$tat_hr', 1]},{ $divide: ['$route.route_distance',{$multiply: [{$ifNull:["$tat_hr",null]}, 3600000]}] },null]
					},
				}
			},
			{
				$addFields: {
					'trip_start_gpsOdo': {
						$arrayElemAt: [{
							$filter: {
								input: '$statuses',
								as: 'item',
								cond: { $eq: ['$$item.status', 'Trip started'] }
							}
						}, 0]
					},
					'trip_not_start_status': {
						$arrayElemAt: [{
							$filter: {
								input: '$statuses',
								as: 'item',
								cond: { $eq: ['$$item.status', 'Trip not started'] }
							}
						}, 0]
					},
					'trip_end_status': {
						$arrayElemAt: [{
							$filter: {
								input: '$statuses',
								as: 'item',
								cond: { $eq: ['$$item.status', 'Trip ended'] }
							}
						}, 0]
					},
					'delay_in_ms': {
						$let: {
							vars: {
								'pdd': { $literal: PDD }
							},
							in: {
								$multiply: [{ $divide: ['$route.route_distance', '$$pdd'] }, 86400000]
							}
						}
					}
				}
			},
			{
				$addFields: {
					'expected_eta': {
						$add: [
							{ $ifNull: ['$trip_start_gpsOdo.date', '$trip_not_start_status.date'] },
							{  $ifNull: ['$tat_in_ms','$delay_in_ms'] }
						]
					},
					'distance_travelled': {
						$cond: [
							{ $ifNull: ['$trip_start_gpsOdo.gpsData.odo', false] },
							{ $subtract: [
									{ $divide: [ { $ifNull: [ "$vehicle_arrived_for_unloading_status.gpsData.odo", '$vehicle.gpsData.odo' ] }, 1000 ] },
									{ $divide: ['$trip_start_gpsOdo.gpsData.odo', 1000] }
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
											'$route.route_distance', '$distance_travelled'
										] },
									PDD
								] },
							86400000
						]
					},
					'tat_delay_in_ms':{
						$divide: [
							{ $subtract: [
									'$route.route_distance', '$distance_travelled'
								] },
							{  $ifNull: ['$tat_speed',PDD_SPEED] }
						]
					}
				}
			},
			{
				$addFields: {
					'current_eta': {
						$add: [
							{ $ifNull: ['$vehicle_arrived_for_unloading_status.date',
									{ $ifNull: ['$unloading_started_status.date',
											{ $ifNull: ['$unloading_ended_status.date',
													{ $ifNull: ['$trip_end_status.date',
															new Date()
														] }
												] }
										] }
								] },
							{  $ifNull: ['$tat_delay_in_ms','$current_delay_in_ms'] }
							//'$current_delay_in_ms'
						]
					}
				}
			},
		];
		aggrQuery.push({$sort:{'start_date': -1}});
		let oQuery = {aggQuery: aggrQuery};

		if(!req.body.download){
			aggrQuery.push({ $skip: (req.body.no_of_docs * req.body.skip) - req.body.no_of_docs });
			oQuery.no_of_docs = req.body.no_of_docs
		}
		let tripData = await serverSidePage.requestData(Trip, oQuery); //tripv2
		tripData = await formatReportData(tripData);
		if(tripData && tripData.length){
			if(req.body.download){
				ReportExelService.jobOrderReport(tripData, req.body, req.user.clientId, function (d) {
					return res.status(200).json({
							'status': 'OK',
							'message': 'report download available.',
							'url': d.url
						}
					);
				});
			}else{
				return res.status(200).json({
					status: 'OK',
					message: "Job Order Data Get Successfully",
					data:tripData
				});
			}
		}else{
			return res.status(500).json({
				status: 'ERROR',
				message: "No Job Order Data Get",
			});
		}
	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

router.route('/jobOrderRiskyReport').post(async function (req, res, next){
	try {
		if(!req.body.download){
			req.body.no_of_docs = req.body.no_of_docs || 10;
			req.body.skip = req.body.skip || 1;
		}
		let filter = {};
		if(req.body.vehicle){
			filter.vehicle = mongoose.Types.ObjectId(req.body.vehicle);
		}
		if(req.body.vehicle_no){
			filter.vehicle_no = req.body.vehicle_no;
		}
		if(req.body.from && req.body.to){
			filter['start_date'] ={
				$gte: moment(req.body.from).startOf('day').toDate(),
				$lte: moment(req.body.to).endOf('day').toDate()
			}
		}
		if(req.body.trip_no){
			filter.trip_no = req.body.trip_no;
		}
		filter.clientId = req.user.clientId;
		const aggrQuery = [
			{$match: filter},
			{
				$project: {
					"statuses": 1,
					category: 1,
					"driver": 1,
					"route": 1,
					"extraKm": 1,
					"vendor":1,
					"segment_type": 1,
					"trip_no": 1,
					"vehicle_no": 1,
					"start_date": 1,
					"end_date":1,
					"device":1,
					"alert":1,
					"playBack":1,
					"tat_hr":1,
					"tat_min":1,
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
				$project: {
					"statuses": 1,
					category: 1,
					"driver.name": 1,
					"driver.prim_contact_no": 1,
					"extraKm": 1,
					"advSettled": 1,
					"segment_type": 1,
					"trip_no": 1,
					"vehicle_no": 1,
					"vendor.name": 1,
					"route.route_distance": 1,
					"route_name": "$route.name",
					"start_date": 1,
					"end_date":1,
					"alert":1,
					"playBack":1,
					"tat_hr":1,
					"tat_min":1,
				}
			}
		];
		aggrQuery.push({$sort:{'start_date': -1}});
		let oQuery = {aggQuery: aggrQuery};

		if(!req.body.download){
			aggrQuery.push({ $skip: (req.body.no_of_docs * req.body.skip) - req.body.no_of_docs });
			oQuery.no_of_docs = req.body.no_of_docs
		}
		let tripData = await serverSidePage.requestData(Trip, oQuery); //tripv2
		tripData = await formatJobRiskyReportData(tripData);
		if(tripData && tripData.length){
			if(req.body.download){
				ReportExelService.jobOrderRiskyReport(tripData, req.body, req.user.clientId, function (d) {
					return res.status(200).json({
							'status': 'OK',
							'message': 'report download available.',
							'url': d.url
						}
					);
				});
			}else{
				return res.status(200).json({
					status: 'OK',
					message: "Job Order Data Get Successfully",
					data:tripData
				});
			}
		}else{
			return res.status(500).json({
				status: 'ERROR',
				message: "No Job Order Data Get",
			});
		}
	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

router.route('/jobOrderPowerConnectReport').post(async function (req, res, next){
	try {
		if(!req.body.download){
			req.body.no_of_docs = req.body.no_of_docs || 10;
			req.body.skip = req.body.skip || 1;
		}
		let filter = {};
		if(req.body.vehicle){
			filter.vehicle = mongoose.Types.ObjectId(req.body.vehicle);
		}
		if(req.body.vehicle_no){
			filter.vehicle_no = req.body.vehicle_no;
		}
		if(req.body.from && req.body.to){
			filter['start_date'] ={
				$gte: moment(req.body.from).startOf('day').toDate(),
				$lte: moment(req.body.to).endOf('day').toDate()
			}
		}
		filter.clientId = req.user.clientId;
		filter['device.imei'] = {$exists:true};
		const aggrQuery = [
			{$match: filter},
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
				$project: {
					"route_name": "$route.name",
					"trip_no": 1,
					"vehicle_no": 1,
					"start_date": 1,
					"end_date":1,
					"device":1,
				}
			}
		];
		aggrQuery.push({$sort:{'start_date': -1}});
		let oQuery = {aggQuery: aggrQuery};

		if(!req.body.download){
			aggrQuery.push({ $skip: (req.body.no_of_docs * req.body.skip) - req.body.no_of_docs });
			oQuery.no_of_docs = req.body.no_of_docs
		}
		let tripData = await serverSidePage.requestData(Trip, oQuery); //tripv2

		if(tripData && tripData.length){
			if(req.body.download){
				let imei = [];
				for(const d of tripData){
					let deviceIemi = parseFloat(d.device.imei);
					let index = imei.includes(deviceIemi);
					if(!index){
						imei.push(deviceIemi);
					}
				}
				let obj = {
					startDate:req.body.from,
					endDate:req.body.to,
				    device_imei: imei && imei.length ? imei : []
				}
				let gpsData = await tripService.getAlertV2(obj, req);
				if(gpsData && gpsData.length){
					for(const d of tripData){
						let start = new Date(d.start_date);
						let end = d.end_date ? new Date(d.end_date) : new Date();
						let findItems = gpsData.filter((item) => {
							    return d.device.imei == item.imei.toString() && new Date(item.datetime) > start && new Date(item.datetime) < end;
						});
						let sPoint;
						let dPoint;
						if(findItems && findItems[0] && findItems[0].code == 'Power cut'){
                             d.powerCut = findItems[0].datetime;
							 d.powerCutLocation = findItems[0].location.address;
							sPoint = {latitude:findItems[0].location.lat ,longitude:findItems[0].location.lng };
						}
						if(findItems && findItems[0] && findItems[0].code == 'power_connect'){
							d.powerReconnect = findItems[0].datetime;
							d.powerReconnectLocation = findItems[0].location.address;
							dPoint = {latitude:findItems[0].location.lat ,longitude:findItems[0].location.lng};
						}
						let  dur = d.powerReconnect && d.powerCut && (new Date(d.powerReconnect).getTime() - new Date(d.powerCut).getTime());
						d.dur = dur /60;
						//d.disConnectDistance = geolib.getDistance(sPoint,dPoint)/1000 || 0;
					}
				}
				ReportExelService.jobOrderPowerReport(tripData, req.body, req.user.clientId, function (d) {
					return res.status(200).json({
							'status': 'OK',
							'message': 'report download available.',
							'url': d.url
						}
					);
				});
			}else{
				return res.status(200).json({
					status: 'OK',
					message: "Job Order Data Get Successfully",
					data:tripData
				});
			}
		}else{
			return res.status(500).json({
				status: 'ERROR',
				message: "No Job Order Data Get",
			});
		}
	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

router.route('/consentHistory').post(async function (req, res) {
	try {
		if((!req.body.mobile)){
			throw new Error('Phone  No is Mandatory');
		}
		if(req.body.mobile){
			try {
				let data = await traqoApiService.fetchHistoryTraqo(req.body.mobile);
				data = JSON.parse(data);
				if(data.status === "success"){
					return res.status(200).json({
						status: 'OK',
						message: "Consent history data  Get Successfully",
						data:data
					});

				}else{
					return res.status(200).json({
						status: 'OK',
						message: data.status,
						data:[]
					});
				}
			} catch (e) {
				console.error('[Tracqo Api  error]', e);
			}
		}
	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

async function formatReportData(tripData){
	for(let i=0;i<tripData.length;i++){
		let oData = tripData[i];
		if (oData.geofence_points && oData.geofence_points.length) {//reomove fence id so that unique point created for each geofence
			let findSource = oData.geofence_points.find((item) => item.type === "Source");
			let findDestination = oData.geofence_points.find((item) => item.type === "Destination");
			if(findSource && findSource.events && findSource.events.length){
				for (let x = findSource.events.length-1; x > -1; x--) {
					if(findSource.events[x].entry ==  true){
						var sourceEntryDate = findSource.events[x].datetime;
						tripData[i].sourceEntryDate = sourceEntryDate;
						break;
					}
				}
				for (let x = findSource.events.length-1; x > -1; x--) {
					if(findSource.events[x].entry ==  false){
						var sourceExitDate = findSource.events[x].datetime;
						tripData[i].sourceExitDate = sourceExitDate;
						break;
					}
				}
			}
			if(findDestination && findDestination.events && findDestination.events.length){
				for (let x = findDestination.events.length-1; x > -1; x--) {
					if(findDestination.events[x].entry ==  true){
						var destEntryDate = findDestination.events[x].datetime;
						tripData[i].destEntryDate = destEntryDate;
						break;
					}
				}
				for (let x = findDestination.events.length-1; x > -1; x--) {
					if(findDestination.events[x].entry ==  false){
						var destExitDate = findDestination.events[x].datetime;
						tripData[i].destExitDate = destExitDate;
						break;
					}
				}
			}
		}
        if(oData.alert && oData.alert.length){
			tripData[i].ha = oData.alert.find((item) => item.code === "ha");
			tripData[i].hb = oData.alert.find((item) => item.code === "hb");
			tripData[i].over_speed = oData.alert.find((item) => item.code === "over_speed");
		}
		tripData[i].currentLocation = oData.currentLocation ? oData.currentLocation : oData.vehicle && oData.vehicle.gpsData && oData.vehicle.gpsData.address || "NA";
		tripData[i].currentStatus = oData.currentStatus ? oData.currentStatus : oData.vehicle && oData.vehicle.gpsData && oData.vehicle.gpsData.status || "NA";
		tripData[i].loadingDuration = tripData[i].sourceEntryDate && tripData[i].sourceExitDate && getDuration(tripData[i].sourceEntryDate,tripData[i].sourceExitDate) || "NA";
		tripData[i].unLoadingDuration = tripData[i].destExitDate ? (tripData[i].destEntryDate && getDuration(tripData[i].destEntryDate,tripData[i].destExitDate)) : (tripData[i].end_date ? (tripData[i].destEntryDate && getDuration(tripData[i].destEntryDate,tripData[i].end_date)) : "NA");
		tripData[i].stopTime = oData.playBack && (oData.playBack.dur_stop/60).toFixed(2);
		tripData[i].jobDistance = tripData[i].end_date ? (parseFloat(tripData[i] && tripData[i].playBack && (tripData[i].playBack.tot_dist/1000).toFixed(2)) || 0) : tripData[i].distance_travelled;
		tripData[i].scheduleDistance = tripData[i].route && tripData[i].route.route_distance || 0;
		tripData[i].delay = tripData[i].end_date && tripData[i].start_date && (((getDurationInMinute(oData.start_date,oData.end_date) - oData.tat_min ) || 0) > 0 ? ((('+' + getDurationInMinute(oData.start_date,oData.end_date) - oData.tat_min) || 0) + "M " + "late" ) : (((getDurationInMinute(oData.start_date,oData.end_date) - oData.tat_min) || 0) + "M " + "early")) || 0;
		tripData[i].jobEta = tripData[i].end_date && tripData[i].start_date && getDurationInMinute(oData.start_date,oData.end_date) > (oData.tat_min || 0) ? "Late" : (oData.end_date && oData.start_date && getDurationInMinute(oData.start_date,oData.end_date) < (oData.tat_min || 0)  ? "Early" : "On Time");
		tripData[i].duration = tripData[i].end_date && tripData[i].start_date && getDuration(oData.start_date,oData.end_date) || "NA";
		tripData[i].jobCompleted = tripData[i].end_date ? "100%" : parseFloat(((tripData[i].jobDistance/tripData[i].scheduleDistance) * 100).toFixed(2)) > 100 ? "100%" : parseFloat(((tripData[i].jobDistance/tripData[i].scheduleDistance) * 100).toFixed(2)) ;
		tripData[i].remainKM = (tripData[i].scheduleDistance > tripData[i].jobDistance) ? (tripData[i].scheduleDistance - tripData[i].jobDistance) : 0;
		tripData[i].expectedArrival = tripData[i].expected_eta && moment(new Date(tripData[i].expected_eta)).format("DD-MM-YYYY HH:mm") || 0;
		tripData[i].predecteArrival = tripData[i].current_eta && moment(new Date(tripData[i].current_eta)).format("DD-MM-YYYY HH:mm") || 0;
		tripData[i].predectedDelay = tripData[i].expected_eta && tripData[i].current_eta && getDuration(tripData[i].expected_eta,tripData[i].current_eta) || 0;
		tripData[i].actualTAT = tripData[i].end_date && tripData[i].start_date && parseFloat((getDurationInHours(tripData[i].start_date,tripData[i].end_date)).toFixed(2));
	}
	return tripData;
}

async function formatJobRiskyReportData(tripData){
	for(let i=0;i<tripData.length;i++){
		let  dur = tripData[i].start_date && tripData[i].end_date && (new Date(tripData[i].end_date).getTime() - new Date(tripData[i].start_date).getTime());
		let oData = tripData[i];
		tripData[i].dur = dur /60;
		if(oData.alert && oData.alert.length){
			tripData[i].power_cut = oData.alert.find((item) => item.code === "power_cut");
		}
		tripData[i].stoppage = oData.playBack && oData.playBack.stoppage ? oData.playBack.stoppage : 0;
		tripData[i].idleStoppage = oData.playBack && oData.playBack.idleStoppage ? oData.playBack.idleStoppage : 0;
		tripData[i].distance = oData.route && oData.route.route_distance || "NA";
		tripData[i].riskyPoints = 0;
		tripData[i].stoppage1 = tripData[i].stoppage > 5 ? "High Risk" : (tripData[i].stoppage < 3 ? "No Risk" : "Medium Risk");
		tripData[i].distance1 = tripData[i].distance > 700 ? "High Risk" : (tripData[i].distance < 636 ? "No Risk" : "Medium Risk");
		tripData[i].delayJobs = tripData[i].dur > 2100 ? "High Risk" : (tripData[i].dur < 1500 ? "No Risk" : "Medium Risk");
		tripData[i].riskyPoints1 =  tripData[i].riskyPoints < 1 ? "No Risk"  :  "High Risk" ;
		tripData[i].stoppage2 = tripData[i].stoppage > 5 ? 5 : (tripData[i].stoppage1 < 3 ? 0 : 3);
		tripData[i].distance2 = tripData[i].distance > 700 ? 5 : (tripData[i].distance < 636 ? 0 : 3);
		tripData[i].delayJobs1 = tripData[i].dur > 2100 ? 5 : (tripData[i].dur < 1500 ? 0 : 3);
		tripData[i].riskyPoints2 = tripData[i].riskyPoints < 1 ? 0 : 5 ;
		tripData[i].totalScore = 20 - (tripData[i].stoppage2  + tripData[i].riskyPoints2);
		tripData[i].grade = tripData[i].totalScore > 15 ? "A" : (tripData[i].totalScore > 10 ? "B" : (tripData[i].totalScore > 5 ? "C" : "D"));
		tripData[i].riskLevel = tripData[i].grade === "B" ? "High Risk" : (tripData[i].grade === "B" ? "High Risk" :"Medium Risk" );
		tripData[i].jobTransitTime = oData.start_date && oData.end_date && getDuration(oData.start_date,oData.end_date) || "NA";


	}
	return tripData;
}

async function formatPlaybackData(data){
	let obj = {
		trip_id:data && data.trips && data.trips['0'] && data.trips['0'].trip_id,
		vehicle_No:data && data.trips && data.trips['0'] && data.trips['0'].truck_number,
		tel:data && data.trips && data.trips['0'] && data.trips['0'].tel,
		invoice:data && data.trips && data.trips['0'] && data.trips['0'].invoice,
		start:{
			"latitude": data && data.trips && data.trips['0'] && data.trips['0'].origin && data.trips['0'].origin.loc[0],
			"longitude": data && data.trips && data.trips['0'] && data.trips['0'].origin && data.trips['0'].origin.loc[1]
		},
		stop: {
			"latitude": data && data.trips && data.trips['0'] && data.trips['0'].destination && data.trips['0'].destination.loc[0],
			"longitude": data && data.trips && data.trips['0'] && data.trips['0'].destination && data.trips['0'].destination.loc[1]
		},
		start_time: data && data.trips && data.trips['0'] && data.trips['0'].start_time,
		stop_addr: data && data.trips && data.trips['0'] && data.trips['0'].last_loc && data.trips['0'].last_loc.address,
		status: data && data.trips && data.trips['0'] && data.trips['0'].trip_status,
		eta: data && data.trips && data.trips['0'] && data.trips['0'].eta,
		last_loc: data && data.trips && data.trips['0'] && data.trips['0'].last_loc,
		destination_out: data && data.trips && data.trips['0'] && data.trips['0'].destination_out,
		total_halt_time: data && data.trips && data.trips['0'] && data.trips['0'].total_halt_time,
		rmDist: data && data.trips && data.trips['0'] && data.trips['0'].last_loc && data.trips['0'].last_loc.distance_remained || 0,
		points:[]
	}
	for(const d of data && data.trips && data.trips['0'] && data.trips['0'].halts){
		let haltData = {};
		haltData.place_name =  d.place_name;
		haltData.start_time =  d.start_time;
		haltData.leaving_time =  d.leaving_time;
		haltData.km =  d.km;
		haltData.lat =  d.latitude;
		haltData.lng = d.longitude;
		haltData.latitude = d.latitude;
		haltData.longitude = d.longitude;
		haltData.datetime =  new Date(d.start_time);
		haltData.duration = getDuration(d.start_time,d.leaving_time) || "NA";
		obj.points.push(haltData);
	}

	return obj;
}

function getDuration (start, end) {
	start = new Date(start);
	end = new Date(end);
	const dur = end.getTime() - start.getTime();
	return getDurationFromSecs(parseInt(dur / 1000));
};

function getDurationInMinute (start, end) {
	start = new Date(start);
	end = new Date(end);
	const dur = end.getTime() - start.getTime();
	return getDurationFromSecsInMinutes(parseInt(dur / 1000));
};

function getDurationInHours (start, end) {
	start = new Date(start);
	end = new Date(end);
	let dur = end.getTime() - start.getTime();
	dur = parseInt(dur/1000);
	let days = parseInt(dur / (60 * 60 * 24));
	let hours = parseInt((dur % (60 * 60 * 24)) / (60 * 60));
	let totalHrs = (days * 24) + hours;
	return totalHrs;
};

function getDurationFromSecs (dur) {
	if (dur < 60) return dur + ' Sec ';
	let days = parseInt(dur / (60 * 60 * 24));
	let hours = parseInt((dur % (60 * 60 * 24)) / (60 * 60));
	let mins = parseInt((dur % (60 * 60)) / 60);
	days = days > 0 ? days + ' D ' : '';
	hours = hours > 0 ? hours + ' H ' : '';
	mins = mins > 0 ? mins + ' M ' : '';
	return days + hours + mins;
};

function getDurationFromSecsInMinutes (dur) {
	if (dur < 60) return dur + ' Sec ';
	let mins = parseInt((dur % (60 * 60)) / 60);
	mins = mins > 0 ? mins  : 0;
	return mins;
};

module.exports = router;

