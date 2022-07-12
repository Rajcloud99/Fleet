'use strict';
/*
* Created By Harikesh dated: 17-10-2019
* */
let mongoose = require('mongoose');
let Trip = commonUtil.getModel('trip');
let GR = commonUtil.getModel('tripGr');
let customerModel = commonUtil.getModel('customer');
let GrReport = commonUtil.getModel('tripGrReport');
let SchemaConfiguration = commonUtil.getModel('SchemaConfiguration');
let ReportExelService = promise.promisifyAll(commonUtil.getService('reportExel'));
const serverSidePage = require('../../utils/serverSidePagination');
let telegram = require("../../utils/telegramBotUtil");
let tableAccessService = commonUtil.getService('tableAccess');
const moment = require('moment');
const fastcsv = require('fast-csv');
const fs = require('fs');
const mkdirp = require('mkdirp');
const csvDownload = require('../../utils/csv-download');
const CronLogUtil = commonUtil.getUtil('cronLogger-util');
const ClientId = ['10806','11309','11709','11409'];


const ALLOWED_GET_FILTER = ['clientId', '_id', 'branch', 'gr_type', 'grNumber', 'bill_no', 'booking', 'container_no', 'status',
	'isProvBillGen', 'isNonBillable', 'container_type', 'acknowledge.status', 'pod.received', 'pod.arNo', 'statuses.status',
	'statuses_from_date', 'statuses_to_date', 'segment_type', 'ownershipType', 'statuses_user', 'statuses_remarks', 'remarks',
	'from', 'to', 'provisionalBill', 'bill', '_id', 'expected_arrival', 'billedGr', 'unBilledGr', 'vehicles', 'customer',
	'consignee', 'consignor', 'billingParty', 'vehicle_no', 'vehicle', 'billingParty.clientId', 'bill_query', 'trip_query',
	'vehicle_query', 'billingParty._id', 'invoices.ref2', 'invoices.invoiceNo', 'invoices.loadRefNumber', 'trip_no', 'shipmentNo',
	'in.refNo', 'fpa.refNo', 'documents.0', 'asOnDate'];

async function getGrReportDaily(body) {
	try {
		let oStLog = {
			date: new Date(),
			// clientId:body.clientId || '10808',
			name:'tripGrReportCacheCron',
			st:new Date(),
			ip:'carvan-prod',
			filters:{
				start:body.from,
				end:body.to
			}
		};
		let processCompRes;
		for( const id of ClientId){
			oStLog.clientId = id;
			let stc = await  CronLogUtil.startLog(oStLog);
			processCompRes = await recursiveGrReport({
				startDate: body.from,
				endDate: body.to,
				clientId:id
			});
			if(stc && stc._id){
				let oEdLog = {
					completed: true,
					ed:new Date(),
					msg:processCompRes && processCompRes.message
				};
				let etc = await CronLogUtil.endLog(stc._id,oEdLog);
			}
			if (processCompRes.status === 'OK')
				console.log(processCompRes , id) ;
		}
		if (processCompRes.status === 'OK')
			return processCompRes;


	} catch (e) {
		throw e;
	}
}

async function recursiveGrReport(body) {
	try {
		if (body.startDate > body.endDate) {
			return {
				'status': 'OK',
				'message': 'Done - Trip Gr to Gr Report Upsert Successfully...'
			};
		}

		let startDate = moment(body.startDate).startOf('day').toDate();
		let endDate = moment(body.startDate).endOf('day').toDate();
		let clientId = body.clientId;
		console.log(startDate, endDate,clientId);
		let oFilt = {
			startDate:startDate,
			endDate:endDate,
			clientId:clientId
		}
		await getGrReportDailyProcess(oFilt);
		body.startDate = moment(body.startDate).add(1, 'day').toDate();
		return recursiveGrReport(body);

	} catch (e) {
		console.log(e);
		throw new Error('recursiveGrReport error',e.toString(),e.message);
	}
}

async function getGrReportDailyProcess(body) {
	try {

		let prjGr = {
			_id: 1,
			status: 1,
			statuses: 1,
			grNumber: 1,
			clientId: 1,
			grDate: 1,
			gr_type: 1,
			last_modified_at: 1,
			created_at: 1,
			invoices: 1,
			rate: 1,
			cGST_percent: 1,
			acknowledge: 1,
			payment_basis: 1,
			payment_type: 1,
			charges: 1,
			basicFreight: 1,
			totalFreight: 1,
			cGST: 1,
			sGST: 1,
			iGST: 1,
			totalAmount: 1,
			internal_rate: 1,
			pod: 1,
			eWayBills: 1,
			remarks: 1,
			customer: 1,
			container: 1,
			consignor: 1,
			consignee: 1,
			branch: 1,
			trip: 1,
			route: 1,
			vehicle: 1,
			bill: 1,
			provisionalBill: 1,
			moneyReceipt: 1,
			supplementaryBill: 1,
			supplementaryBillRef: 1,
			fpa: 1,
			tripCancelled: 1,
			isNonBillable: 1
		};
		let oFilter = {
			clientId:body.clientId,
			$or: [
				{
					last_modified_at: {$lte: new Date(body.endDate), $gte: new Date(body.startDate)}
				},
				{
					created_at: {$lte: new Date(body.endDate), $gte: new Date(body.startDate)}
				}
			]
		};
		// if(body.clientId){
		// 	oFilter.clientId = body.clientId;
		// }
		let countQuery = [	{
			$match: oFilter
		}];
		let aggrPipe = [
			{
				$match: oFilter
			},
			{$skip:0},
			{$limit:1000},

			// Start Billing Party...
			{
				$lookup: {
					from: 'billingparties',
					localField: 'billingParty',
					foreignField: '_id',
					as: 'billingParty'
				}
			},
			{
				$unwind: {
					path: '$billingParty',
					preserveNullAndEmptyArrays: true
				}
			}
		];

		Object.assign(prjGr, {
			'billingParty._id': 1,
			'billingParty.name': 1,
			'billingParty.clientId': 1
		});

		// customer populate
		aggrPipe.push(
			{$project: Object.assign({}, prjGr)},
			{
				$lookup: {
					from: 'customers',
					localField: 'customer',
					foreignField: '_id',
					as: 'customer'
				}
			},
			{
				$unwind: {
					path: '$customer',
					preserveNullAndEmptyArrays: true
				}
			});

		delete prjGr.customer;
		Object.assign(prjGr, {
			'customer._id': 1,
			'customer.name': 1
		});

		//Consignor populate
		aggrPipe.push(
			{$project: Object.assign({}, prjGr)},
			{
				$lookup: {
					from: 'consignor_consignees',
					localField: 'consignor',
					foreignField: '_id',
					as: 'consignor'
				}
			},
			{
				$unwind: {
					path: '$consignor',
					preserveNullAndEmptyArrays: true
				}
			});

		delete prjGr.consignor;
		Object.assign(prjGr, {
			'consignor._id': 1,
			'consignor.name': 1,
		});

		// Consignee populate
		aggrPipe.push(
			{$project: Object.assign({}, prjGr)},
			{
				$lookup: {
					from: 'consignor_consignees',
					localField: 'consignee',
					foreignField: '_id',
					as: 'consignee'
				}
			},
			{
				$unwind: {
					path: '$consignee',
					preserveNullAndEmptyArrays: true
				}
			});

		delete prjGr.consignee;
		Object.assign(prjGr, {
			'consignee._id': 1,
			'consignee.name': 1
		});

		// Branch populate
		aggrPipe.push(
			{$project: Object.assign({}, prjGr)},
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
			});

		delete prjGr.branch;
		Object.assign(prjGr, {
			'branch._id': 1,
			'branch.name': 1
		});

		// Transport Route populate
		aggrPipe.push(
			{$project: Object.assign({}, prjGr)},
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
			}
		);

		delete prjGr.route;
		Object.assign(prjGr, {
			'route._id': 1,
			'route.name': 1
		});

		// TripV2 populate
		aggrPipe.push(
			{$project: Object.assign({}, prjGr)},
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip',
					foreignField: '_id',
					as: 'trip'
				}
			},
			{
				$unwind: {
					path: '$trip',
					preserveNullAndEmptyArrays: true
				}
			},
		);

		delete prjGr.trip;
		Object.assign(prjGr, {
			'trip._id': 1,
			'trip.trip_no': 1,
			'trip.vehicle_no': 1,
			'trip.ownershipType': 1,
			'trip.segment_type': 1,
			'trip.vendorDeal': 1
		});

		// Registered Vehicle populate
		aggrPipe.push(
			{$project: Object.assign({}, prjGr)},
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
			}
		);

		delete prjGr.vehicle;
		Object.assign(prjGr, {
			'vehicle._id': 1,
			'vehicle.model': 1,
			'vehicle.owner_name': 1
		});

		// Bill populate
		aggrPipe.push(
			{$project: Object.assign({}, prjGr)},
			{
				$lookup: {
					from: 'bills',
					localField: 'bill',
					foreignField: '_id',
					as: 'bill'
				}
			},
			{
				$unwind: {
					path: '$bill',
					preserveNullAndEmptyArrays: true
				}
			}
		);

		delete prjGr.bill;
		Object.assign(prjGr, {
			'bill._id': 1,
			'bill.billNo': 1,
			'bill.billDate': 1
		});


		// supplementary Bill Populate
		aggrPipe.push(
			{$project: Object.assign({}, prjGr)},
			{
				$lookup: {
					from: 'bills',
					localField: 'supplementaryBillRef',
					foreignField: '_id',
					as: 'supplementaryBillRef'
				}
			}
		);

		// provisional Bill Populate
		aggrPipe.push(
			{$project: Object.assign({}, prjGr)},
			{
				$lookup: {
					from: 'bills',
					localField: 'provisionalBill.ref',
					foreignField: '_id',
					as: 'provisionalBill.ref'
				}
			}
		);
		//let aTripGr = await GR.aggregate(aggrPipe).allowDiskUse(true);
		let oQ = {countQuery:countQuery,aggQuery:aggrPipe,batchSize:100};
		let aTripGr = await serverSidePage.paginationServer(GR, oQ);
		aTripGr = aTripGr.data || [];
		let oUpsertRep = [];
		for (let oGr of aTripGr) {

			let copyGr = {
				gr_id: oGr._id,
				created_at: (oGr.created_at),
				trip_no: (oGr.trip && oGr.trip.trip_no),
				grNumber: (oGr.grNumber),
				vehicle_no: (oGr.vehicle_no),
				billNo: (oGr.bill && oGr.bill.billNo),
				ownershipType: (oGr.trip && oGr.trip.ownershipType),
				segment_type: (oGr.trip && oGr.trip.segment_type),
				gr_type: (oGr.gr_type),
				client_name: (oGr.customer && oGr.customer.prim_contact_name),
				brch_name: (oGr.branch && oGr.branch.name),
				clientId: (oGr.clientId),
				tripCancelled: (oGr.tripCancelled),
				last_modified_at: (oGr.last_modified_at),
				payment_type: (oGr.payment_type),
				payment_basis: (oGr.payment_basis),
				rate: (oGr.rate) || 0,
				basicFreight: (oGr.basicFreight) || 0,
				totalFreight: (oGr.totalFreight) || 0,
				cGST: (oGr.cGST) || 0,
				sGST: (oGr.sGST) || 0,
				iGST: (oGr.iGST) || 0,
				cGST_percent: (oGr.cGST_percent) || 0,
				sGST_percent: (oGr.sGST_percent) || 0,
				iGST_percent: (oGr.iGST_percent) || 0,
				totalAmount: (oGr.totalAmount) || 0,
				remarks: (oGr.remarks),
				status: (oGr.status),
				grDate: (oGr.grDate),
				internal_rate: (oGr.internal_rate) || 0,
				container: (oGr.container),
				expected_arrival: (oGr.expected_arrival),
				inv: (oGr.invoices),
				eWayBills: (oGr.eWayBills),
				statuses: (oGr.statuses),
				vehicle: { // registered vehicle
					rvhl_id: (oGr.vehicle && oGr.vehicle._id),
					model: (oGr.vehicle && oGr.vehicle.model),
					owner_name: (oGr.vehicle && oGr.vehicle.owner_name),
					vendor_id: (oGr.vehicle && oGr.vehicle.vendor_id),
					veh_group_name: (oGr.vehicle && oGr.vehicle.veh_group_name),
				},
				trip: { // Trip
					tr_id: (oGr.trip && oGr.trip._id),
					trip_no: (oGr.trip && oGr.trip.trip_no) || 0,
					vehicle_no: (oGr.trip && oGr.trip.vehicle_no),
					ownershipType: (oGr.trip && oGr.trip.ownershipType),
					segment_type: (oGr.trip && oGr.trip.segment_type),
					venDeal_remark: (oGr.trip && oGr.trip.vendorDeal && oGr.trip.vendorDeal.remark),
					venDeal_loadSlip: (oGr.trip && oGr.trip.vendorDeal && oGr.trip.vendorDeal.loading_slip),
				},
				customer: { // Customer
					c_id: (oGr.customer && oGr.customer._id),
					c_name: (oGr.customer && oGr.customer.name),
				},
				consignor: { // consignor
					cogo_id: (oGr.consignor && oGr.consignor._id),
					cogo_name: (oGr.consignor && oGr.consignor.name),
				},
				consignee: { //consignee
					coge_id: (oGr.consignee && oGr.consignee._id),
					coge_name: (oGr.consignee && oGr.consignee.name)
				},
				bilgprty: { // Billing Party
					bp_id: (oGr.billingParty && oGr.billingParty._id),
					bp_name: (oGr.billingParty && oGr.billingParty.name),
					bp_clntid: (oGr.billingParty && oGr.billingParty.clientId),
				},
				tRoute: { // Transport Route
					rout_id: (oGr.route && oGr.route._id),
					rout_name: (oGr.route && oGr.route.name),
				},
				ack: { // Acknowledge
					ack_source: (oGr.acknowledge && oGr.acknowledge.source),
					ack_destin: (oGr.acknowledge && oGr.acknowledge.destination),
					ack_systemDate: (oGr.acknowledge && oGr.acknowledge.systemDate),
				},
				charges: { // Charges
					incentive: (oGr.charges && oGr.charges.incentive) || 0,
				},
				branch: { // Branches
					brch_id: (oGr.branch && oGr.branch._id),
					brch_name: (oGr.branch && oGr.branch.name),
				},
				bill: { // Bill
					bill_id: (oGr.bill && oGr.bill._id),
					billNo: (oGr.bill && oGr.bill.billNo),
					billDate: (oGr.bill && oGr.bill.billDate),
				},
				pod: { // POD
					arNo: (oGr.pod && oGr.pod.arNo),
					date: (oGr.pod && oGr.pod.date),
					systemDate: (oGr.pod && oGr.pod.systemDate),
					arRemark: (oGr.pod && oGr.pod.arRemark),
					billingLoadingTime: (oGr.pod && oGr.pod.billingLoadingTime),
					billingUnloadingTime: (oGr.pod && oGr.pod.billingUnloadingTime),
					loadingArrivalTime: (oGr.pod && oGr.pod.loadingArrivalTime),
					unloadingArrivalTime: (oGr.pod && oGr.pod.unloadingArrivalTime),
					received: (oGr.pod && oGr.pod.received)
				},
				fpa: (oGr.fpa),
				isNonBillable: (oGr.isNonBillable),
				moneyReceipt: (oGr.moneyReceipt),
				supplementaryBill: {
					totalFreight: (oGr.supplementaryBill && oGr.supplementaryBill.totalFreight),
					basicFreight: (oGr.supplementaryBill && oGr.supplementaryBill.basicFreight),
					rate: (oGr.supplementaryBill && oGr.supplementaryBill.rate),
					totalCharges: (oGr.supplementaryBill && oGr.supplementaryBill.totalCharges),
					totalDeduction: (oGr.supplementaryBill && oGr.supplementaryBill.totalDeduction),
					incentivePercent: (oGr.supplementaryBill && oGr.supplementaryBill.incentivePercent),
				},
			};

			copyGr.provisionalBill = [];
			if (oGr.provisionalBill && oGr.provisionalBill.ref && oGr.provisionalBill.ref.length) {
				for (let pb = 0; pb < oGr.provisionalBill.ref.length; pb++) {
					let oPbBill = {
						ref: oGr.provisionalBill.ref[pb]._id,
						billNo: oGr.provisionalBill.ref[pb].billNo,
						billDate: oGr.provisionalBill.ref[pb].billDate
					};
					copyGr.provisionalBill.push(oPbBill);
				}
			}
			copyGr.supplementaryBillRef = [];
			if (oGr.supplementaryBillRef && oGr.supplementaryBillRef.length) {
				for (let pb = 0; pb < oGr.supplementaryBillRef.length; pb++) {
					let oPbBill = {
						ref: oGr.supplementaryBillRef[pb]._id,
						billNo: oGr.supplementaryBillRef[pb].billNo,
						billDate: oGr.supplementaryBillRef[pb].billDate
					};
					copyGr.supplementaryBillRef.push(oPbBill);
				}
			}

			let grReport = JSON.parse(JSON.stringify(new GrReport(copyGr)));
			delete grReport._id;

			// Upsert query
			oUpsertRep.push({
				updateOne: {
					filter: {
						gr_id: oGr._id,
					},
					update: {
						$set: grReport,
					},
					upsert: true
				}
			});
		}

		if (oUpsertRep.length) {
			telegram.sendMessage(oUpsertRep.length + " grs caching start for " + body.startDate);
			//let success = await GrReport.bulkWrite(oUpsertRep);
			let aBatchSize = 50;
			if (oUpsertRep.length > aBatchSize) {
				let nC = parseInt(oUpsertRep.length / aBatchSize);
				console.log("no of itr", nC);
				for (let b = 0; b <= nC; b++) {
					let nArray = oUpsertRep.slice(b * aBatchSize, (b + 1) * aBatchSize);
					if (nArray.length) {
						await GrReport.bulkWrite(nArray, {ordered: false});
					}
					console.log("batch", b);
				}
			} else if (oUpsertRep.length) {
				let tT = await GrReport.bulkWrite(oUpsertRep, {ordered: false});
			}
		}
		telegram.sendMessage(oUpsertRep.length + " grs caching completed for " + body.startDate);
		return true;

	} catch (e) {
		throw e;
	}
}

function constructFiltersGrRepots(oQuery) {
	let oFilter = {tripCancelled: {$not: {$eq: true}}};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_GET_FILTER)) {
			if (i == 'from') {
				let startDate = moment(oQuery[i]).startOf('day').toDate();

					if (constant.grItemStatus.indexOf(oQuery.dateType) >= 0) {
						let dateKey = 'date';
						if(oQuery.dateType === 'GR Assigned')
							dateKey = 'systemDate';
					oFilter['statuses'] = oFilter['statuses'] || {};
					oFilter['statuses']['$elemMatch'] = oFilter['statuses']['$elemMatch'] || {};
					oFilter['statuses']['$elemMatch'][dateKey] = oFilter['statuses']['$elemMatch'][dateKey] || {};
					oFilter['statuses']['$elemMatch'][dateKey]['$gte'] = startDate;
				} else if (oQuery.dateType === 'billDate') {
					oFilter['$or'] = oFilter['$or'] || [];
					let obj = {};
					obj['billDate'] = obj['billDate'] || {};
					obj['billDate']['$gte'] = startDate;
					oFilter['$or'].push({bill: {$exists: true}, 'bill.billDate': obj.billDate});
					oFilter['$or'].push({
						'provisionalBill.0': {$exists: true},
						'provisionalBill.billDate': obj.billDate
					});
					oFilter['$or'].push({
						'supplementaryBillRef.0': {$exists: true},
						'supplementaryBillRef.billDate': obj.billDate
					});
					// oFilter['bill'] = oFilter[`bill`] || {};
					// oFilter['bill']['billDate'] = oFilter['bill']['billDate'] || {};
					// oFilter['bill']['billDate']['$gte'] = startDate;

				} else if (oQuery.dateType === 'acknowledge.systemDate') {
					oFilter['acknowledge.systemDate'] = oFilter[`acknowledge.systemDate`] || {};
					oFilter['acknowledge.systemDate']['$gte'] = startDate;
				} else if (oQuery.dateType === 'pod.pendingRemark.systemDate') {
					oFilter['pod.systemDate'] = oFilter[`pod.systemDate`] || {};
					oFilter['pod.systemDate']['$gte'] = startDate;
				} else {
					oFilter[oQuery.dateType || 'created_at'] = oFilter[oQuery.dateType || 'created_at'] || {};
					oFilter[oQuery.dateType || 'created_at'].$gte = startDate;
				}
			} else if (i == 'to') {
				let endDate = moment(oQuery[i]).endOf('day').toDate();

					if (constant.grItemStatus.indexOf(oQuery.dateType) >= 0) {
						let dateKey = 'date';
						if(oQuery.dateType === 'GR Assigned')
							dateKey = 'systemDate';
					oFilter['statuses'] = oFilter['statuses'] || {};
					oFilter['statuses']['$elemMatch'] = oFilter['statuses']['$elemMatch'] || {};
					oFilter['statuses']['$elemMatch'][dateKey] = oFilter['statuses']['$elemMatch'][dateKey] || {};
					oFilter['statuses']['$elemMatch'][dateKey]['$lte'] = endDate;
					oFilter['statuses']['$elemMatch']["status"] = oQuery.dateType;

				} else if (oQuery.dateType === 'billDate') {
					oFilter['$or'] = oFilter['$or'] || [];
					let obj = {};
					obj['billDate'] = obj['billDate'] || {};
					obj['billDate']['$lte'] = endDate;
					oFilter['$or'].push({bill: {$exists: true}, 'bill.billDate': obj.billDate});
					oFilter['$or'].push({
						'provisionalBill.0': {$exists: true},
						'provisionalBill.billDate': obj.billDate
					});
					oFilter['$or'].push({
						'supplementaryBillRef.0': {$exists: true},
						'supplementaryBillRef.billDate': obj.billDate
					});
					// oFilter['bill'] = oFilter[`bill`] || {};
					// oFilter['bill']['billDate'] = oFilter['bill']['billDate'] || {};
					// oFilter['bill']['billDate']['$lte'] = endDate;
				} else if (oQuery.dateType === 'acknowledge.systemDate') {
					oFilter['acknowledge.systemDate'] = oFilter[`acknowledge.systemDate`] || {};
					oFilter['acknowledge.systemDate']['$lte'] = endDate;
				} else if (oQuery.dateType === 'pod.pendingRemark.systemDate') {
					oFilter['pod.systemDate'] = oFilter[`pod.systemDate`] || {};
					oFilter['pod.systemDate']['$lte'] = endDate;
				} else {
					oFilter[oQuery.dateType || 'created_at'] = oFilter[oQuery.dateType || 'created_at'] || {};
					oFilter[oQuery.dateType || 'created_at'].$lte = endDate;
				}
			} else if (i === 'statuses_from_date' && oQuery.statuses_to_date) {
				let startDate = new Date(oQuery[i]);
				let nextDay = new Date(oQuery.statuses_from_to);
				oFilter['statuses.date'] = {
					'$gte': startDate,
					'$lt': nextDay
				};
			} else if (i == 'statuses_from_date') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				oFilter['statuses.date'] = {
					'$gte': startDate
				};
			} else if (i == 'statuses_to_date' && !oQuery.statuses_from_date) {
				let endDate = new Date(oQuery[i]);
				oFilter['statuses.date'] = {
					'$lt': endDate
				};
			} else if (i == 'remarks') {
				oFilter[i] = {$regex: oQuery[i], $options: 'i'};
			} else if (i == 'grNumber' && typeof oQuery[i] === 'string') {
				oFilter[i] = new RegExp(oQuery[i].replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
			} else if (i == 'statuses_user') {
				oFilter['statuses.date'] = oQuery[i];
			} else if (i == 'statuses_remarks') {
				oFilter['statuses.remarks'] = {$regex: oQuery[i], $options: 'i'};
			} else if (i == 'container_no') {
				oFilter['container.number'] = oQuery[i];
			} else if (i == 'container_type') {
				oFilter['container.type_of_container'] = oQuery[i];
			} else if (i == 'expected_arrival') {
				oFilter['expected_arrival'] = {$lte: new Date(oQuery[i])};
			} else if (i === "branch") {
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['branch.brch_id'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			}else if (i === "customer") {
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['customer.c_id'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			}
			else if (i === 'vehicles' && Array.isArray(oQuery[i]) && oQuery[i].length > 0) {
				oFilter['vehicle.rvhl_id'] = {$in: otherUtil.arrString2ObjectId(oQuery[i])};
			} else if (i === 'vehicle_no') {
				oFilter[`vehicle_no`] = oQuery[i];
			} else if (i === 'vehicle') {
				oFilter['vehicle.rvhl_id'] = typeof oQuery[i] === "string" && mongoose.Types.ObjectId(oQuery[i]) || oQuery[i];
			}else if (i === 'consignor') {
				oFilter['consignor.cogo_id'] = typeof oQuery[i] === "string" && mongoose.Types.ObjectId(oQuery[i]) || oQuery[i];
			} else if (i === 'consignee') {
				oFilter['consignee.coge_id'] = typeof oQuery[i] === "string" && mongoose.Types.ObjectId(oQuery[i]) || oQuery[i];
			} else if (i === 'billingParty._id') {
				oFilter['bilgprty.bp_id'] = typeof oQuery[i] === "string" && mongoose.Types.ObjectId(oQuery[i]) || oQuery[i];
			} else if (i === 'billingParty.clientId') {
				oFilter['bilgprty.bp_clntid'] = oQuery[i];
			} else if (i === '_id') {
				oFilter['gr_Id'] = {
					$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
				};
			} else if (i === 'bill_query') {
				if (oQuery[i].billNo) {
					oFilter['$or'] = oFilter['$or'] || [];
					oFilter['$or'].push({
						'bill.billNo': oQuery[i].billNo
					}, {
						'provisionalBill.billNo': oQuery[i].billNo
					}, {
						'supplementaryBillRef.billNo': oQuery[i].billNo
					});
				}
			} else if (i === 'trip_query') {
				if (oQuery[i].segment_type) {
					oFilter['trip.segment_type'] = oQuery[i].segment_type;
				} else if (oQuery[i].ownershipType) {
					oFilter['trip.ownershipType'] = oQuery[i].ownershipType;
				} else if (oQuery[i].statuses) {
					oFilter['trip.tr_id.status'] = oQuery[i].statuses.status;
				}
			} else if (i === 'vehicle_query') {
				if (oQuery[i].veh_group_name) {
					oFilter['vehicle.veh_group_name'] = oQuery[i].veh_group_name;
				}
			} else if (i === 'shipmentNo') {
				oFilter['$or'] = oFilter['$or'] || [];
				oFilter['$or'].push({
					'inv.ref1': oQuery[i]
				}, {
					'inv.ref2': oQuery[i]
				}, {
					'inv.ref3': oQuery[i]
				}, {
					'inv.ref4': oQuery[i]
				}, {
					'inv.ref5': oQuery[i]
				}, {
					'inv.ref6': oQuery[i]
				}, {
					'inv.invoiceNo': oQuery[i]
				}, {
					'inv.loadRefNumber': oQuery[i]
				});
			} else if (i === 'billedGr') {
				oFilter['$or'] = oFilter['$or'] || [];
				oFilter['$or'].push({
					'bill.bill_id': {$exists: true}
				}, {
					'provisionalBill.0': {$exists: true}
				}, {
					'supplementaryBillRef.0': {$exists: true}
				});
			} else if (i === 'unBilledGr') {
				oFilter['$and'] = oFilter['$and'] || [];
				oFilter['$and'].push({
					'bill.bill_id': {$exists: false}
				}, {
					'provisionalBill.0': {$exists: false}
				}, {
					'supplementaryBillRef.0': {$exists: false}
				}, {
					'isNonBillable': {$not:{$eq:true}}
				});
				oFilter['payment_type'] = {$not: {$eq: "FOC"}};
			} else if (i === 'asOnDate') {
				let endDate = moment(oQuery[i]).endOf('day').toDate();

				oFilter['$or'] = oFilter['$or'] || [];
				oFilter['$or'].push({
					"$and": [{
						'bill.bill_id': {$exists: false}
					}, {
						'provisionalBill.0': {$exists: false}
					},/* {
						'supplementaryBillRef.0': {$exists: false}
					},*/ {
						'isNonBillable': {$not:{$eq:true}}
					}]
				},{
					'bill.billDate': {$gt: endDate}
				}, {
					'provisionalBill.billDate': {$gt: endDate}
				}/*
					{
					'supplementaryBillRef.billDate': {$gt: endDate}
				}*/
				);
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

async function getDownloadRep(req, res) {
	try {
		req.body.trip_query = req.body.trip_query || {};
		req.body.vehicle_query = req.body.vehicle_query || {};
		req.body.tripCancelled = req.body.trip_query.status==='Trip cancelled'? true: false;
		if(req.body['customer.category']){
			let oCustomer = await customerModel.find({category: {$in :req.body['customer.category']}, clientId: req.user.clientId});

			if(oCustomer){
				req.body.customer = [];
				oCustomer.forEach(obj=>{
					req.body.customer.push(obj._id);
				})
			}

		}
		//let companyFilter = {};
		const grFilter = constructFiltersGrRepots(req.body);

		let project = {
			trip_no: 1,
			grNumber: 1,
			vehicle_no: 1,
			c_name: 1,
			tripCancelled: 1,
			cogo_name: 1,
			ownershipType: 1,
			segment_type: 1,
			gr_type: 1,
			client_name: 1,
			brch_name: 1,
			dateSearch: 1,
			clientId: 1,
			payment_type: 1,
			payment_basis: 1,
			rate: 1,
			basicFreight: 1,
			totalFreight: 1,//with charges
			cGST: 1,
			sGST: 1,
			iGST: 1,
			cGST_percent: 1,
			sGST_percent: 1,
			iGST_percent: 1,
			totalAmount: 1,//Total with Tax
			remarks: 1,
			status: 1,
			grDate: 1,
			internal_rate: 1,
			created_at: 1,
			expected_arrival: 1,

			// Invoices
			inv: 1,
			provisionalBill: 1,
			//eWayBills:1,
			statuses: 1,
			vehicle: 1,
			trip: 1,
			customer: 1,
			consignor: 1,
			consignee: 1,
			bilgprty: 1,
			tRoute: 1,
			ack: 1,
			charges: 1,
			branch: 1,
			bill: 1,
			pod: 1,
			fpa: 1,
			supplementaryBill: 1,
			supplementaryBillRef: 1,
			isNonBillable: 1,
			'moneyReceipt.totalMrAmount': 1,
			'moneyReceipt.chitPending': 1,
		};
		let aggrPipe = [
			{$match: grFilter},
			{$project: project},
			{$sort: req.body.sort},
			{$skip: 0}
			//	{$limit: 130000}
		];

		if (req.body.tableId) {
			let tableAcc = await tableAccessService.findTableAccessFilterAsync(req.body.tableId);
			req.tableAcc = Array.isArray(tableAcc) && tableAcc[0] && tableAcc.access || [];
			req.headers = buildHeaders();
		} else {
			req.headers = buildHeaders();
		}

		let downloadPath = await new csvDownload(GrReport, aggrPipe, {
			filePath: `${req.user.clientId}/tripGrReport`,
			fileName: `Trip_GrReport_${moment().format('DD-MM-YYYY')}`
		}).exec(tripGrReportDownload, req);

		return res.status(200).json({
			status: "SUCCESS",
			message: 'Trip Gr Report ',
			url: downloadPath
		});

	} catch (e) {
		console.error('error in gr cache report', e);
		return res.status(500).json({
			status: "ERROR",
			message: e.toString(),
		});
	}
}

module.exports = {
	getGrReportDaily,
	getDownloadRep
};

function buildHeaders(tableAcc = [], configs = {}) {
	return [
		// 'GR ID',
		// ...((tableAcc.length ? tableAcc.indexOf('tripNo') + 1 : true) && [configName(configs, 'trip_no', "TRIP NO.")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('status') + 1 : true) && [configName(configs, 'status', "GR STATUS")] || []),
		...((tableAcc.length ? tableAcc.indexOf('grNo') + 1 : true) && [configName(configs, 'grNumber', "GR NO.")] || []),
		...((tableAcc.length ? tableAcc.indexOf('grDate') + 1 : true) && [configName(configs, 'grDate', "GR DATE")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('loadingDate') + 1 : true) && [configName(configs, 'loadingDate', "LOADING DATE")] || []),
		...((tableAcc.length ? tableAcc.indexOf('vehNo') + 1 : true) && [configName(configs, 'vehicle_no', "VEHICLE NO.")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('model') + 1 : true) && [configName(configs, 'model', "VEHICLE MODEL")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('materialCode') + 1 : true) && [configName(configs, 'material', "MATERIAL CODE")] || []),
		...((tableAcc.length ? tableAcc.indexOf('materialName') + 1 : true) && [configName(configs, 'materialName', "MATERIAL NAME")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('unloadingDate') + 1 : true) && [configName(configs, 'billingUnloadingTime', "UNLOADING DATE")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('unloadingDate') + 1 : true) && [configName(configs, 'billingUnloadingTime', "UNLOADING TIME")] || []),
		...((tableAcc.length ? tableAcc.indexOf('customer') + 1 : true) && [configName(configs, 'customer', "CUSTOMER")] || []),
		...((tableAcc.length ? tableAcc.indexOf('consignor') + 1 : true) && [configName(configs, 'consignor', "CONSIGNOR")] || []),
		...((tableAcc.length ? tableAcc.indexOf('consignee') + 1 : true) && [configName(configs, 'consignee', "CONSIGNEE")] || []),
		...((tableAcc.length ? tableAcc.indexOf('billingParty') + 1 : true) && [configName(configs, 'billingParty', "BILLINGPARTY")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('billingRoute') + 1 : true) && [configName(configs, 'route', "BILLING ROUTE")] || []),
		...((tableAcc.length ? tableAcc.indexOf('source') + 1 : true) && [configName(configs, 'source', "SOURCE")] || []),
		...((tableAcc.length ? tableAcc.indexOf('destination') + 1 : true) && [configName(configs, 'destination', "DESTINATION")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('km') + 1 : true) && [configName(configs, 'routeDistance', "KM")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('paymentBasis') + 1 : true) && [configName(configs, 'payment_basis', "PAYMENT BASIS")] || []),
		...((tableAcc.length ? tableAcc.indexOf('paymentType') + 1 : true) && [configName(configs, 'payment_type', "PAYMENT TYPE")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('baseValueLabel') + 1 : true) && [configName(configs, 'baseValueLabel', "CAPACITY")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('fpaNo') + 1 : true) && [configName(configs, false, "FPA NO")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('hireSlipNo') + 1 : true) && [configName(configs, 'loading_slip', "HIRESLIP NO")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('invDate') + 1 : true) && [configName(configs, 'invDate', "INVOICE DATE")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('invNo') + 1 : true) && [configName(configs, 'invoiceNo', "INVOICE NO.")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('invAmt') + 1 : true) && [configName(configs, 'invoiceAmt', "INVOICE AMOUNT")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('loadRefNo') + 1 : true) && [configName(configs, 'loadRefNumber', "LOAD REF. NO")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('ref1') + 1 : true) && [configName(configs, 'ref1', "REF1")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('ref2') + 1 : true) && [configName(configs, 'ref2', "REF2")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('ref3') + 1 : true) && [configName(configs, 'ref3', "REF3")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('ref4') + 1 : true) && [configName(configs, 'ref4', "REF4")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('incentive') + 1 : true) && [configName(configs, 'incentive', "INCENTIVE")] || []),
		...((tableAcc.length ? tableAcc.indexOf('qty') + 1 : true) && [configName(configs, 'noOfUnits', "QTY")] || []),
		...((tableAcc.length ? tableAcc.indexOf('weight') + 1 : true) && [configName(configs, 'weightPerUnit', "WEIGHT(T)")] || []),
		...((tableAcc.length ? tableAcc.indexOf('billingUnit') + 1 : true) && [configName(configs, 'billingNoOfUnits', "BILLING UNIT")] || []),
		...((tableAcc.length ? tableAcc.indexOf('billingWeight') + 1 : true) && [configName(configs, 'billingWeightPerUnit', "BILLING WEIGHT")] || []),
		...((tableAcc.length ? tableAcc.indexOf('rate') + 1 : true) && [configName(configs, 'rate', "RATE")] || []),
		...((tableAcc.length ? tableAcc.indexOf('freight') + 1 : true) && [configName(configs, 'basicFreight', "FREIGHT")] || []),
		...((tableAcc.length ? tableAcc.indexOf('totfreight') + 1 : true) && [configName(configs, 'totalFreight', "TOTAL FREIGHT")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('cGST') + 1 : true) && [configName(configs, 'cGST', "CGST")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('sGST') + 1 : true) && [configName(configs, 'sGST', "SGST")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('iGST') + 1 : true) && [configName(configs, 'iGST', "IGST")] || []),
		...((tableAcc.length ? tableAcc.indexOf('totAmt') + 1 : true) && [configName(configs, 'totalAmount', "TOTAL AMOUNT")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('totSuppAmt') + 1 : true) && [configName(configs, 'totalFreight', "TOT SUPPLY AMOUNT")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('internal_rate') + 1 : true) && [configName(configs, 'internal_rate', "INTERNAL RATE")] || []),
		...((tableAcc.length ? tableAcc.indexOf('branch') + 1 : true) && [configName(configs, 'branch', "BRANCH")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('billNo') + 1 : true) && [configName(configs, 'billNo', "BILL NO")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('billDate') + 1 : true) && [configName(configs, 'billDate', "BILL DATE")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('arNo') + 1 : true) && [configName(configs, 'arNo', "AR NO")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('arDate') + 1 : true) && [configName(configs, 'arDate', "AR DATE")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('ewayBill') + 1 : true) && [configName(configs, 'eWayBills', "EWAY BILLS")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('grRemark') + 1 : true) && [configName(configs, 'remarks', "GR REMARK")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('podRem') + 1 : true) && [configName(configs, 'arRemark', "POD REMARK")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('entryBy') + 1 : true) && [configName(configs, 'entryBy', "ENTRY BY")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('entryAt') + 1 : true) && [configName(configs, 'entryAt', "ENTRY AT")] || []),
		...((tableAcc.length ? tableAcc.indexOf('ownership') + 1 : true) && [configName(configs, 'ownershipType', "OWNERSHIP")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('tripStartDate') + 1 : true) && [configName(configs, 'tripStartDate', "TRIP START DATE")] || []),
		...((tableAcc.length ? tableAcc.indexOf('routeName') + 1 : true) && [configName(configs, 'routeName', "ROUTE NAME")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('mrRec') + 1 : true) && [configName(configs, 'mrReceived', "MR RECEIVED")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('mrBalFrei') + 1 : true) && [configName(configs, 'mrBalanceFreight', "MR BALANCE FREIGHT")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('mrChitStatus') + 1 : true) && [configName(configs, 'mrChitStatus', "MR CHIT STATUS")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('unloadedBy') + 1 : true) && [configName(configs, 'unLoadedBy', "UNLOADED BY")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('fpaAmt') + 1 : true) && [configName(configs, 'fpaAmt', "FPA AMT")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('hireSlipTotPay') + 1 : true) && [configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('nonBillGr') + 1 : true) && [configName(configs, 'nonBillableGr', "NONBILLABLE GR")] || []),
		...((tableAcc.length ? tableAcc.indexOf('vehOwnerName') + 1 : true) && [configName(configs, 'owner_name', "VEHICLE OWNER NAME")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('segment') + 1 : true) && [configName(configs, 'segment_type', "SEGMENT")] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('billed') + 1 : true) && [configName(configs, 'billed', "BILLED")] || []),
		...((tableAcc.length ? tableAcc.indexOf('company') + 1 : true) && [configName(configs, 'client', 'COMPANY')] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('reportDate') + 1 : true) && [configName(configs, 'unloadingArrivalTime', 'REPORTING DATE')] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('reportDate') + 1 : true) && [configName(configs, 'unloadingArrivalTime', 'REPORTING TIME')] || []),
		// ...((tableAcc.length ? tableAcc.indexOf('vendorRemark') + 1 : true) && [configName(configs, 'vendorRemark', 'HIRE PARTY REMARK')] || [])
	];
}

function tripGrReportDownload(doc, {headers, user, clientData}) {
	try{
		if (!headers) return;
		let configs = {};

		let row = {};
		if (!doc.inv) doc.inv = [];
		if (headers.indexOf('GR ID') + 1)
			row['GR ID'] = doc.gr_id && doc.gr_id.toString();
		if (headers.indexOf('TRIP NO.') + 1)
			row['TRIP NO.'] = (doc.trip && doc.trip.trip_no) || 'NA';
		if (headers.indexOf(configName(configs, 'status', "GR STATUS")) + 1)
			row[configName(configs, 'status', "GR STATUS")] = doc.status || 'NA';
		if (headers.indexOf(configName(configs, 'grNumber', "GR NO.")) + 1)
			row[configName(configs, 'grNumber', "GR NO.")] = `="${doc.grNumber ? (doc.grNumber).toString().trim() : 'NA'}"`;
		if (headers.indexOf(configName(configs, 'grDate', "GR DATE")) + 1)
			row[configName(configs, 'grDate', "GR DATE")] = doc.grDate ? moment(doc.grDate).format("DD-MM-YYYY") : 'NA';
		if (headers.indexOf(configName(configs, 'vehicle_no', "VEHICLE NO.")) + 1)
			row[configName(configs, 'vehicle_no', "VEHICLE NO.")] = (doc.trip && doc.trip.vehicle_no) || 'NA';
		if (headers.indexOf(configName(configs, 'model', "VEHICLE MODEL")) + 1)
			row[configName(configs, 'model', "VEHICLE MODEL")] = (doc.vehicle && doc.vehicle.model) || 'NA';
		if (headers.indexOf(configName(configs, 'loadingDate', "LOADING DATE")) + 1)
			row[configName(configs, 'loadingDate', "LOADING DATE")] = doc.statuses && doc.statuses.find(st => st.status === 'Loading Ended') ? moment(new Date(doc.statuses.find(st => st.status === 'Loading Ended').date)).format("DD-MM-YYYY") : 'NA';
		if (headers.indexOf(configName(configs, 'material', "MATERIAL CODE")) + 1)
			row[configName(configs, 'material', "MATERIAL CODE")] = (doc.inv.length && doc.inv[0].material) ? doc.inv.map(o => o.material && o.material.groupCode).filter(x => Boolean(x)).join(' ') : 'NA';
		if (headers.indexOf(configName(configs, 'materialName', "MATERIAL NAME")) + 1)
			row[configName(configs, 'materialName', "MATERIAL NAME")] = (doc.inv.length && doc.inv[0].material) ? doc.inv.map(o => o.material && o.material.groupName).filter(x => Boolean(x)).join(' ') : 'NA';
		if (headers.indexOf(configName(configs, 'unloadingArrivalTime', 'REPORTING DATE')) + 1)
			row[configName(configs, 'unloadingArrivalTime', 'REPORTING DATE')] = (doc.pod && doc.pod.unloadingArrivalTime) ? moment(doc.pod.unloadingArrivalTime).format("DD-MM-YYYY") : 'NA';
		if (headers.indexOf(configName(configs, 'unloadingArrivalTime', 'REPORTING TIME')) + 1)
			row[configName(configs, 'unloadingArrivalTime', 'REPORTING TIME')] = (doc.pod && doc.pod.unloadingArrivalTime) ? moment(doc.pod.unloadingArrivalTime).format("HH:mm") : 'NA';
		if (headers.indexOf(configName(configs, 'billingUnloadingTime', 'UNLOADING DATE')) + 1)
			row[configName(configs, 'billingUnloadingTime', 'UNLOADING DATE')] = (doc.pod && doc.pod.billingUnloadingTime) ? moment(doc.pod.billingUnloadingTime).format("DD-MM-YYYY") : 'NA';
		if (headers.indexOf(configName(configs, 'billingUnloadingTime', 'UNLOADING TIME')) + 1)
			row[configName(configs, 'billingUnloadingTime', 'UNLOADING TIME')] = (doc.pod && doc.pod.billingUnloadingTime) ? moment(doc.pod.billingUnloadingTime).format("HH:mm") : 'NA';
		if (headers.indexOf(configName(configs, 'customer', "CUSTOMER")) + 1)
			row[configName(configs, 'customer', "CUSTOMER")] = (doc.customer && doc.customer.c_name) || 'NA';
		if (headers.indexOf(configName(configs, 'consignor', "CONSIGNOR")) + 1)
			row[configName(configs, 'consignor', "CONSIGNOR")] = (doc.consignor && doc.consignor.cogo_name) || 'NA';
		if (headers.indexOf(configName(configs, 'consignee', "CONSIGNEE")) + 1)
			row[configName(configs, 'consignee', "CONSIGNEE")] = (doc.consignee && doc.consignee.coge_name) || 'NA';
		if (headers.indexOf(configName(configs, 'bilgprty', "BILLINGPARTY")) + 1)
			row[configName(configs, 'bilgprty', "BILLINGPARTY")] = (doc.bilgprty && doc.bilgprty.bp_name) || 'NA';
		if (headers.indexOf("ROUTE") + 1)
			row["ROUTE"] = (doc.tRoute && doc.tRoute.rout_name) || 'NA';
		if (headers.indexOf(configName(configs, 'tRoute', "BILLING ROUTE")) + 1)
			row[configName(configs, 'tRoute', "BILLING ROUTE")] = ((doc.ack && doc.ack.ack_source) ? ((doc.ack.ack_source) + ' to ' + (doc.ack.ack_destin)) : 'NA');
		if (headers.indexOf(configName(configs, 'source', "SOURCE")) + 1)
			row[configName(configs, 'source', "SOURCE")] = (doc.ack && doc.ack.ack_source) ? (doc.ack.ack_source) : 'NA';
		if (headers.indexOf(configName(configs, 'destination', "DESTINATION")) + 1)
			row[configName(configs, 'destination', "DESTINATION")] = (doc.ack && doc.ack.ack_destin) ? (doc.ack.ack_destin) : 'NA';
		if (headers.indexOf(configName(configs, 'routeDistance', "KM")) + 1)
			row[configName(configs, 'routeDistance', "KM")] = doc.inv && doc.inv[0] && doc.inv[0].routeDistance || 'NA';
		if (headers.indexOf(configName(configs, 'payment_basis', "PAYMENT BASIS")) + 1)
			row[configName(configs, 'payment_basis', "PAYMENT BASIS")] = doc.payment_basis || 'NA';
		if (headers.indexOf(configName(configs, 'payment_type', "PAYMENT TYPE")) + 1)
			row[configName(configs, 'payment_type', "PAYMENT TYPE")] = doc.payment_type || 'NA';
		if (headers.indexOf(configName(configs, 'baseValueLabel', "CAPACITY")) + 1)
			row[configName(configs, 'baseValueLabel', "CAPACITY")] = doc.inv && doc.inv[0] && doc.inv[0].baseValueLabel || 'NA';
		if (headers.indexOf(configName(configs, false, "FPA NO")) + 1)
			row[configName(configs, false, "FPA NO")] = (doc.fpa && doc.fpa.refNo) || 'NA';
		if (headers.indexOf(configName(configs, 'loading_slip', "HIRESLIP NO")) + 1)
			row[configName(configs, 'loading_slip', "HIRESLIP NO")] = (doc.trip && doc.trip.venDeal_loadSlip) || 'NA';
		if (headers.indexOf(configName(configs, 'invoiceNo', "INVOICE DATE")) + 1)
			row[configName(configs, 'invoiceNo', "INVOICE DATE")] = doc.inv && doc.inv[0] && doc.inv[0].invoiceDate || 'NA';
		if (headers.indexOf(configName(configs, 'invoiceNo', "INVOICE NO.")) + 1)
			row[configName(configs, 'invoiceNo', "INVOICE NO.")] = doc.inv.map(o => o.invoiceNo).join(' ') || 'NA';
		if (headers.indexOf(configName(configs, 'invoiceAmt', "INVOICE AMOUNT")) + 1)
			row[configName(configs, 'invoiceAmt', "INVOICE AMOUNT")] = doc.inv.map(o => o.invoiceAmt).join(' ') || 'NA';
		if (headers.indexOf(configName(configs, 'incentive', "INCENTIVE")) + 1)
			row[configName(configs, 'incentive', "INCENTIVE")] = doc.charges ? doc.charges.incentive : 'NA';
		if (headers.indexOf(configName(configs, 'noOfUnits', "QTY")) + 1)
			row[configName(configs, 'noOfUnits', "QTY")] = doc.inv.reduce((acc, invcObj) => acc + invcObj.noOfUnits || 0, 0);
		if (headers.indexOf(configName(configs, 'weightPerUnit', "WEIGHT(T)")) + 1)
			row[configName(configs, 'weightPerUnit', "WEIGHT(T)")] = doc.inv.reduce((acc, invcObj) => acc + invcObj.weightPerUnit || 0, 0) + ' T';
		if (headers.indexOf(configName(configs, 'billingNoOfUnits', "BILLING UNIT")) + 1)
			row[configName(configs, 'billingNoOfUnits', "BILLING UNIT")] = doc.inv.reduce((acc, invcObj) => acc + invcObj.billingNoOfUnits || 0, 0);
		if (headers.indexOf(configName(configs, 'billingWeightPerUnit', "BILLING WEIGHT")) + 1)
			row[configName(configs, 'billingWeightPerUnit', "BILLING WEIGHT")] = doc.inv.reduce((acc, invcObj) => acc + invcObj.billingWeightPerUnit || 0, 0);
		if (headers.indexOf(configName(configs, 'rate', "RATE")) + 1)
			row[configName(configs, 'rate', "RATE")] = doc.inv.map(o => (o.rate && parseFloat(o.rate.toFixed(2) || 0))).join(',') || 'NA';
		if (headers.indexOf(configName(configs, 'basicFreight', "FREIGHT")) + 1)
			row[configName(configs, 'basicFreight', "FREIGHT")] = parseFloat(doc.basicFreight && doc.basicFreight.toFixed(2) || 0);
		if (headers.indexOf(configName(configs, 'totalFreight', "TOTAL FREIGHT")) + 1)
			row[configName(configs, 'totalFreight', "TOTAL FREIGHT")] = parseFloat(doc.totalFreight && doc.totalFreight.toFixed(2) || 0);
		if (headers.indexOf(configName(configs, 'cGST', "CGST")) + 1)
			row[configName(configs, 'cGST', "CGST")] = doc.cGST && parseFloat(doc.cGST.toFixed(2) || 0);
		if (headers.indexOf(configName(configs, 'sGST', "SGST")) + 1)
			row[configName(configs, 'sGST', "SGST")] = doc.sGST && parseFloat(doc.sGST.toFixed(2) || 0);
		if (headers.indexOf(configName(configs, 'iGST', "IGST")) + 1)
			row[configName(configs, 'iGST', "IGST")] = doc.iGST && parseFloat(doc.iGST.toFixed(2) || 0);
		if (headers.indexOf(configName(configs, 'totalAmount', "TOTAL AMOUNT")) + 1)
			row[configName(configs, 'totalAmount', "TOTAL AMOUNT")] = parseFloat(doc.totalAmount && doc.totalAmount.toFixed(2) || 0);
		if (headers.indexOf(configName(configs, 'totalFreight', "TOT SUPPLY AMOUNT")) + 1)
			row[configName(configs, 'totalFreight', "TOT SUPPLY AMOUNT")] = parseFloat(doc.supplementaryBill && doc.supplementaryBill.totalFreight && doc.supplementaryBill.totalFreight.toFixed(2) || 0);
		if (headers.indexOf(configName(configs, 'internal_rate', "INTERNAL RATE")) + 1)
			row[configName(configs, 'internal_rate', "INTERNAL RATE")] = doc.internal_rate && doc.internal_rate.toFixed(2) || 0;
		if (headers.indexOf(configName(configs, 'branch', "BRANCH")) + 1)
			row[configName(configs, 'branch', "BRANCH")] = doc.branch && doc.branch.brch_name || 'NA';
		if (headers.indexOf(configName(configs, 'billNo', "BILL NO")) + 1) {
			if(doc.bill && doc.bill.billNo){
				row[configName(configs, 'billNo', "BILL NO")] = `="${doc.bill && doc.bill.billNo || 'NA'}"`;
			}else if(Array.isArray(doc.provisionalBill) && doc.provisionalBill.length){
				row[configName(configs, 'billNo', "BILL NO")] = `="${doc.provisionalBill.map(o => o.billNo).join(' ,') || 'NA'}"`;
			}
			/*
			//remove supplimentary bill no from as on date report
			else if(Array.isArray(doc.supplementaryBillRef) && doc.supplementaryBillRef.length){
				row[configName(configs, 'billNo', "BILL NO")] = `="${doc.supplementaryBillRef.map(o => o.billNo).join(' ,') || 'NA'}"`;
			}*/
			else
				row[configName(configs, 'billNo', "BILL NO")] = 'NA';
		}
		if (headers.indexOf(configName(configs, 'billDate', "BILL DATE")) + 1) {
			if(doc.bill && doc.bill.billNo){
				row[configName(configs, 'billDate', "BILL DATE")] = `="${moment(doc.bill.billDate).format("DD-MM-YYYY") || 'NA'}"`;
			}else if(Array.isArray(doc.provisionalBill) && doc.provisionalBill.length){
				row[configName(configs, 'billDate', "BILL DATE")] = `="${doc.provisionalBill.map(o => moment(o.billDate).format("DD-MM-YYYY")).join(' ,') || 'NA'}"`;
			}
			/*
			else if(Array.isArray(doc.supplementaryBillRef) && doc.supplementaryBillRef.length){
				row[configName(configs, 'billDate', "BILL DATE")] = `="${doc.supplementaryBillRef.map(o => moment(o.billDate).format("DD-MM-YYYY")).join(' ,') || 'NA'}"`;
			}
			*/
			else
				row[configName(configs, 'billDate', "BILL DATE")] = 'NA';
		}
		if (headers.indexOf(configName(configs, 'arNo', "AR NO")) + 1)
			row[configName(configs, 'arNo', "AR NO")] = doc.pod && doc.pod.arNo || 'NA';
		if (headers.indexOf(configName(configs, 'arDate', "AR DATE")) + 1)
			row[configName(configs, 'arDate', "AR DATE")] = doc.pod && doc.pod.date && moment(doc.pod.date).format("DD-MM-YYYY") || 'NA';
		if (headers.indexOf(configName(configs, 'loadRefNumber', "LOAD REF. NO")) + 1)
			row[configName(configs, 'loadRefNumber', "LOAD REF. NO")] = doc.inv.map(o => o.loadRefNumber).join(' ') || 'NA';
		if (headers.indexOf(configName(configs, 'ref1', "REF1")) + 1)
			row[configName(configs, 'ref1', "REF1")] = doc.inv.map(o => o.ref1).join(' ') || 'NA';
		if (headers.indexOf(configName(configs, 'ref2', "REF2")) + 1)
			row[configName(configs, 'ref2', "REF2")] = doc.inv.map(o => o.ref2).join(' ') || 'NA';
		if (headers.indexOf(configName(configs, 'ref3', "REF3")) + 1)
			row[configName(configs, 'ref3', "REF3")] = doc.inv.map(o => o.ref3).join(' ') || 'NA';
		if (headers.indexOf(configName(configs, 'ref4', "REF4")) + 1)
			row[configName(configs, 'ref4', "REF4")] = doc.inv.map(o => o.ref4).join(' ') || 'NA';
		if (headers.indexOf(configName(configs, 'eWayBills', "EWAY BILLS")) + 1)
			row[configName(configs, 'eWayBills', "EWAY BILLS")] = doc.eWayBills ? doc.eWayBills.map(o => o.number).join(' ') : 'NA';
		if (headers.indexOf(configName(configs, 'remarks', "GR REMARK")) + 1)
			row[configName(configs, 'remarks', "GR REMARK")] = doc.remarks || 'NA';
		if (headers.indexOf(configName(configs, 'arRemark', "POD REMARK")) + 1)
			row[configName(configs, 'arRemark', "POD REMARK")] = doc.pod && doc.pod.arRemark || 'NA';

		let grAss = doc.statuses.find(st => st.status === 'GR Assigned');

		if (headers.indexOf(configName(configs, 'entryBy', "ENTRY BY")) + 1)
			row[configName(configs, 'entryBy', "ENTRY BY")] = grAss && grAss.user_full_name || 'NA';
		if (headers.indexOf(configName(configs, 'entryAt', "ENTRY AT")) + 1)
			row[configName(configs, 'entryAt', "ENTRY AT")] = grAss && moment(grAss.date).format("DD-MM-YYYY") || 'NA';
		if (headers.indexOf(configName(configs, 'ownershipType', "OWNERSHIP")) + 1)
			row[configName(configs, 'ownershipType', "OWNERSHIP")] = (doc.trip && doc.trip.ownershipType) || 'NA';

		if (headers.indexOf(configName(configs, 'tripStartDate', "TRIP START DATE")) + 1)
			row[configName(configs, 'tripStartDate', "TRIP START DATE")] = (doc.trip && doc.trip.statuses && doc.trip.statuses.length > 0) ? moment(doc.trip.statuses.find(function (element) {
				return element.status === "Trip not started";
			}).date).format("DD-MM-YYYY") : "NA";
		if (headers.indexOf(configName(configs, 'routeName', "ROUTE NAME")) + 1)
			row[configName(configs, 'routeName', "ROUTE NAME")] = (doc.trip && doc.trip.route_name) || 'NA';

		let mrRec = (((doc.moneyReceipt && doc.moneyReceipt.totalMrAmount) || 0) + ((doc.moneyReceipt && doc.moneyReceipt.deduction) || 0));
		if (headers.indexOf(configName(configs, 'mrReceived', "MR RECEIVED")) + 1) {
			row[configName(configs, 'mrReceived', "MR RECEIVED")] = mrRec || 'NA';
		}
		if (headers.indexOf(configName(configs, 'mrBalanceFreight', "MR BALANCE FREIGHT")) + 1) {
			let mrBalFr = (((doc.totalFreight || 0) + (doc.supplementaryBill && doc.supplementaryBill.totalFreight || 0)) - mrRec);
			row[configName(configs, 'mrBalanceFreight', "MR BALANCE FREIGHT")] = mrBalFr || 'NA';
		}
		if (headers.indexOf(configName(configs, 'mrChitStatus', "MR CHIT STATUS")) + 1)
			row[configName(configs, 'mrChitStatus', "MR CHIT STATUS")] = (doc.moneyReceipt && doc.moneyReceipt.chitPending) || 'NA';
		if (headers.indexOf(configName(configs, 'unLoadedBy', "UNLOADED BY")) + 1) {
			let uploadedBy = doc.statuses.find(st => st.status === 'Unloading Ended');
			row[configName(configs, 'unLoadedBy', "UNLOADED BY")] = (uploadedBy && uploadedBy.user_full_name) || 'NA';
		}
		if (headers.indexOf(configName(configs, 'fpaAmt', "FPA AMT")) + 1)
			row[configName(configs, 'fpaAmt', "FPA AMT")] = (doc.fpa && doc.fpa.amt) || 'NA';
		if (headers.indexOf(configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE")) + 1)
			row[configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE")] = doc.totpayable || 'NA';
		if (headers.indexOf(configName(configs, 'nonBillableGr', "NONBILLABLE GR")) + 1)
			row[configName(configs, 'nonBillableGr', "NONBILLABLE GR")] = (doc.isNonBillable) ? "Yes" : "No";

		if (headers.indexOf(configName(configs, 'owner_name', "VEHICLE OWNER NAME")) + 1)
			row[configName(configs, 'owner_name', "VEHICLE OWNER NAME")] = doc.vehicle && doc.vehicle.owner_name || 'NA';
		if (headers.indexOf(configName(configs, 'segment_type', "SEGMENT")) + 1)
			row[configName(configs, 'segment_type', "SEGMENT")] = (doc.trip && doc.trip.segment_type) || 'NA';
		if (headers.indexOf(configName(configs, 'billed', "BILLED")) + 1) {
			if(doc.bill && doc.bill.billNo){
				row[configName(configs, 'billed', "BILLED")] = 'Yes';
			}else if(Array.isArray(doc.provisionalBill) && doc.provisionalBill.length){
				row[configName(configs, 'billed', "BILLED")] = 'Yes';
			}else if(Array.isArray(doc.supplementaryBillRef) && doc.supplementaryBillRef.length){
				row[configName(configs, 'billed', "BILLED")] = 'Yes';
			}else
				row[configName(configs, 'billed', "BILLED")] = 'No';
		}
		if (headers.indexOf(configName(configs, 'client', 'COMPANY')) + 1) {
			let cId = (doc.bilgprty && doc.bilgprty.bp_clntid) || doc.bp_clntid;
			let clientAllowed = user.client_allowed.find(ca => ca.clientId === cId);
			row[configName(configs, 'client', 'COMPANY')] = clientAllowed && clientAllowed.name || clientData.client_full_name;
		}
		if (headers.indexOf(configName(configs, 'vendorRemark', 'HIRE PARTY REMARK')) + 1)
			row[configName(configs, 'vendorRemark', 'HIRE PARTY REMARK')] = doc.trip && doc.trip.venDeal_remark || 'NA';

		return row;
	}catch(e){
		console.log('[error]', e);
		return {};
	}
}

function configName(configs, key, fallBack) {
	if (configs && configs[key]) {
		if (configs[key].visible) {
			return configs[key].label || configs[key].ourLabel;
		} else {
			return;
		}
	} else {
		return fallBack;
	}
}
