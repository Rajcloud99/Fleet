'use strict';
/*
* Created By Pratik
* */
let mongoose = require('mongoose');
let request = require('request');
let Trip = commonUtil.getModel('trip');
let GR = commonUtil.getModel('tripGr');
let customerModel = commonUtil.getModel('customer');
const tripService = commonUtil.getService('TripV2');
const datamgntService = commonUtil.getService('datamanagements');
let BookingModel = commonUtil.getModel('bookings');
let SchemaConfiguration = commonUtil.getModel('SchemaConfiguration');
let GRStatusModel = commonUtil.getModel('grStatus');
let TripExpenseModel = commonUtil.getModel('tripExpenses');
let GRmasterService = promise.promisifyAll(commonUtil.getService('gr'));
let GRstatusService = promise.promisifyAll(commonUtil.getService('grStatus'));
let ReportExelService = promise.promisifyAll(commonUtil.getService('reportExel'));
let voucherService = promise.promisifyAll(commonUtil.getService('accountsVoucher'));
const BillStationary = commonUtil.getModel('billStationary');
const billStationary = commonUtil.getService('billStationary');
var serverSidePagination = promise.promisifyAll(require('../../utils/serverSidePagination'));
let tableAccessService = commonUtil.getService('tableAccess');
//let GPSData = commonUtil.getModel('gpsData');
let moment = require('moment');
const ExcelReader = require('../../utils/ExcelReader');
let locationService = promise.promisifyAll(commonUtil.getService('location'));
const serverSidePage = require('../../utils/serverSidePagination');
const csvDownload = require('../../utils/csv-download');
const grCSV = commonUtil.getReports('tripGr.js');
const tripgrReport = commonUtil.getReports('grReport.js');
const mrReport = commonUtil.getReports('mrReport.js');
const logsService = commonUtil.getService('logs');
const ShipmentTrackingReports = commonUtil.getReports('shipment-tracking');
let gpsgaadiAdminToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiJER0ZDIn0.Yt9SM10dq7L8FqISaMdiCqJRVtL1xesy6gjnAeNDYAI';

var FileService = commonUtil.getUtil('file_upload_util');
let allowedFiles = ['GR', 'Invoice', 'Other'];

let Pagination = promise.promisify(otherUtil.findPagination);

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

const STATUS = ['GR Not Assigned', 'GR Assigned', 'Vehicle Arrived for loading', 'Loading Started', 'Loading Ended', 'Vehicle Arrived for unloading', 'Unloading Started', 'Unloading Ended', 'Trip cancelled', 'GR Acknowledged'];
const ALLOWED_UPDATE_STATUS = ['Vehicle Arrived for loading', 'Loading Started', 'Loading Ended', "Departure", 'Vehicle Arrived for unloading', 'Unloading Started', 'Unloading Ended'];
const ALLOWED_GET_FILTER = ['clientId', '_id', 'branch', 'gr_type', 'grNumber', 'bill_no', 'booking', 'container_no', 'status', 'isProvBillGen', 'isNonBillable',
	'container_type', 'acknowledge.status', 'pod.received', 'pod.arNo', 'statuses.status', 'statuses_from_date', 'statuses_to_date', 'segment_type',
	'ownershipType', 'statuses_user', 'statuses_remarks', 'remarks', 'from', 'to', 'provisionalBill', 'bill', '_id', 'expected_arrival', 'billedGr', 'unBilledGr',
	'vehicles', 'customer', 'consignee', 'consignor', 'billingParty', 'vehicle_no', 'trip_query', 'vehicle_query', 'booking_query', 'vehicle', 'billingParty.clientId',
	'billingParty._id', 'invoices.ref2', 'invoices.invoiceNo', 'invoices.loadRefNumber', 'trip_no', 'trip', 'shipmentNo', 'bill_query', 'in.refNo', 'fpa.refNo', 'documents.0', 'delivered', 'grNoorTmemoNo', 'tMNo'];

const ALLOWED_UPDATE_WITH_GR_FILTER = ['grNumber', 'grDate', 'branch', 'gr_type', 'pod', 'tjo_no', 'invoiceNumber', 'invoiceDate', 'container',
	'weight', 'l_tare_w', 'l_gross_w', 'l_net_w', 'ul_tare_w', 'ul_gross_w', 'ul_net_w', 'charges', 'eWayBills', 'supplementaryBill', 'moneyReceipt', 'acknowledge.status', 'remarks', 'consignee',
	'status', 'route', 'consignor', 'billingParty', 'payment_basis', 'payment_type', 'rate', 'total_no_of_units', 'weight_per_unit', 'invoices', 'acknowledge', 'totalChargesWithoutTax',
	'diesel_index', 'cGST', 'sGST', 'iGST', 'cGST_percent', 'sGST_percent', 'iGST_percent', 'totalAmount', 'basicFreight', 'totalFreight', 'totalCharges', 'vehicle2', 'incentivePercent'];

const ALLOWED_UPDATE_WITHOUT_GR_FILTER = ['grNumber', 'tjo_no', 'grDate', 'branch', 'invoiceNumber', 'invoiceDate', 'container', 'weight', 'l_tare_w', 'l_gross_w', 'l_net_w',
	'ul_tare_w', 'ul_gross_w', 'ul_net_w', 'charges', 'eWayBills', 'supplementaryBill', 'moneyReceipt', 'acknowledge.status', 'remarks', 'consignee', 'consignor', 'customer', 'billingParty', 'status', 'route', 'gr_type', 'grNumber', 'pod',
	'payment_basis', 'payment_type', 'rate', 'total_no_of_units', 'weight_per_unit', 'loadRefNumber', 'invoices', 'loadingDetentionRate', 'totalChargesWithoutTax', 'his',
	'unloadingDetentionRate', 'acknowledge', 'isGrBillable', 'diesel_index', 'cGST', 'sGST', 'iGST', 'cGST_percent', 'sGST_percent', 'iGST_percent', 'vehicle2', 'stationaryId', 'supplementaryBillRef',
	'totalAmount', 'basicFreight', 'totalFreight', 'totalCharges', 'standardTime', 'chargeableTime', 'transitTime', 'twoPtDelivery', 'deduction', 'internal_rate', 'billedSource', 'billedDestination',
	'incentivePercent', 'integration', 'num4', 'num5', 'num6', 'tnbCharges', 'nbCharges', 'loading_amount', 'unloading_amount', 'advanceAmt', 'gateoutDate',
	'gatePassDate' , 'detentionLoadingD1', 'detentionLoadingD2', 'detentionLoadingD3', 'detentionUnloadingD1', 'detentionUnloadingD2', 'detentionUnloadingD3'];

const ALLOWED_ADMIN_FILTER = ['branch', 'gr_type', 'booking', 'trip', 'status', 'grNumber', 'grDate', 'container', 'weight', 'l_tare_w', 'l_gross_w', 'l_net_w', 'ul_tare_w', 'ul_gross_w', 'ul_net_w', 'tripCancelled', 'acknowledge', 'charges', 'remarks'];
const ALLOWED_REFERENCED_GET = {'booking_query': 'booking', 'trip_query': 'trip', 'vehicle_query': 'vehicle'};
const ALLOWED_UPDATE_DIESEL_ESC_GR_FILTER = ['estimated_moisture', 'actual_moisture', 'internal_rate'];

function constructFilters(oQuery) {
	let status = oQuery && oQuery.trip_query && oQuery.trip_query.status==='Trip cancelled'? true: false;
	let oFilter = {tripCancelled: status};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_GET_FILTER)) {
			if (i == 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				if (constant.grItemStatus.indexOf(oQuery.dateType) >= 0) {
					oFilter['statuses'] = oFilter['statuses'] || {};
					oFilter['statuses']['$elemMatch'] = oFilter['statuses']['$elemMatch'] || {};
					oFilter['statuses']['$elemMatch']["systemDate"] = oFilter['statuses']['$elemMatch']["systemDate"] || {};
					oFilter['statuses']['$elemMatch']["systemDate"]['$gte'] = startDate;
				} else if (oQuery.dateType === 'billDate') {
					oFilter['bill_query'] = oFilter[`bill_query`] || {};
					oFilter['bill_query']['billDate'] = oFilter['bill_query']['billDate'] || {};
					oFilter['bill_query']['billDate']['$gte'] = startDate;
				}else if (oQuery.dateType === 'ewbDate') {
					oFilter['eWayBills.expiry'] = oFilter['eWayBills.expiry'] || {};
					oFilter['eWayBills.expiry'].$gte = startDate;
				} else {
					oFilter[oQuery.dateType || 'created_at'] = oFilter[oQuery.dateType || 'created_at'] || {};
					oFilter[oQuery.dateType || 'created_at'].$gte = startDate;
				}
			} else if (i == 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				if (constant.grItemStatus.indexOf(oQuery.dateType) >= 0) {
					oFilter['statuses'] = oFilter['statuses'] || {};
					oFilter['statuses']['$elemMatch'] = oFilter['statuses']['$elemMatch'] || {};
					oFilter['statuses']['$elemMatch']["systemDate"] = oFilter['statuses']['$elemMatch']["systemDate"] || {};
					oFilter['statuses']['$elemMatch']["systemDate"]['$lte'] = endDate;
				} else if (oQuery.dateType === 'billDate') {
					oFilter['bill_query'] = oFilter[`bill_query`] || {};
					oFilter['bill_query']['billDate'] = oFilter['bill_query']['billDate'] || {};
					oFilter['bill_query']['billDate']['$lte'] = endDate;
				} else if (oQuery.dateType === 'ewbDate') {
					oFilter['eWayBills.expiry'] = oFilter['eWayBills.expiry'] || {};
					oFilter['eWayBills.expiry'].$lte = endDate;
				}else {
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
					oFilter['branch'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			} else if (i === "customer") {
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['customer'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			} else if (i === 'vehicles' && Array.isArray(oQuery[i]) && oQuery[i].length > 0) {
				oFilter['vehicle'] = {$in: otherUtil.arrString2ObjectId(oQuery[i])};
			} else if (i === 'status') {
				if (oQuery[i] instanceof Array) {
					oFilter[i] = {$in: oQuery[i]};
				} else {
					oFilter[i] = oQuery[i];
				}
			} else if (i === 'vehicle_no') {
				oFilter[`trip.${i}`] = oQuery[i];
			} else if ((i === 'vehicle') || (i === 'consignor') || (i === 'consignee') || (i === 'billingParty')) {
				oFilter[i] = typeof oQuery[i] === "string" && mongoose.Types.ObjectId(oQuery[i]) || oQuery[i];
			} else if (i === '_id') {
				oFilter[i] = {
					$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
				};
			} else if (i === 'shipmentNo') {
				oFilter['$or'] = oFilter['$or'] || [];
				oFilter['$or'].push({
						'invoices.ref1': oQuery[i]
					}, {
						'invoices.ref2': oQuery[i]
					}, {
						'invoices.ref3': oQuery[i]
					}, {
						'invoices.ref4': oQuery[i]
					}, {
						'invoices.ref5': oQuery[i]
					}, {
						'invoices.ref6': oQuery[i]
					}, {
						'invoices.invoiceNo': oQuery[i]
					},
					{
						'invoices.loadRefNumber': oQuery[i]
					});
			} else if (i === 'billedGr') {
				oFilter['$or'] = oFilter['$or'] || [];
				oFilter['$or'].push({
					'bill': {$exists: true}
				}, {
					'provisionalBill.0': {$exists: true}
				}, {
					'supplementaryBillRef.0': {$exists: true}
				});
			} else if (i === 'unBilledGr') {
				oFilter['$and'] = oFilter['$and'] || [];
				oFilter['$and'].push({
					'bill': {$exists: false}
				}, {
					'provisionalBill.0': {$exists: false}
				}, {
					'supplementaryBillRef.0': {$exists: false}
				});
				oFilter['isNonBillable'] = {$not: {$eq: true}};
			} else if (i === 'provisionalBill') {
				if (typeof oQuery[i] === 'object') {
					if (oQuery[i].$exists)
						oFilter['provisionalBill.0'] = {$exists: true};
					else
						oFilter['provisionalBill.0'] = {$exists: false};
				} else
					oFilter[i] = oQuery[i];
			} else if (i === 'grNoorTmemoNo') {
				oFilter['$or'] = oFilter['$or'] || [];
				oFilter['$or'].push({
					'grNumber': {$exists: true}
				}, {
					'tMemo.tMNo': {$exists: true}
				});
			} else if (i === 'tMNo') {
				oFilter['tMemo.tMNo'] = oQuery[i];
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

var allowedFilterOfBillingParty = ['start_date', 'end_date', 'from', 'to', 'clientId', 'aBillingPartyDetail', 'aCustomerDetail', 'consignor', 'consignee', 'customer', 'billingParty._id', 'branch'];

var constructGrReportFilters = function (query) {
	query.dateType = query.dateType || 'grDate';
	var fFilter = {
		"tripCancelled": false,
	};
	for (let i in query) {
		if (otherUtil.isAllowedFilter(i, allowedFilterOfBillingParty)) {
			if (i == 'start_date' || i == 'from') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$gte = startDate;
			} else if (i == 'end_date' || i == 'to') {
				let endDate = new Date(query[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$lte = endDate;
			} else if (i === 'aBillingPartyDetail') {
				if (query[i] && query[i] != "undefined" && query[i].length > 0) {
					fFilter['billingParty'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])};
				}
			} else if (i === 'aCustomerDetail') {
				if (query[i] && query[i] != "undefined" && query[i].length > 0) {
					fFilter['customer'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])};
				}
			} else if (i === 'consignor' || i === 'consignee') {
				fFilter[i] = otherUtil.arrString2ObjectId(query[i])
			} else if (i === 'billingParty._id') {
				fFilter['billingParty'] = otherUtil.arrString2ObjectId(query[i])
			} else if (i === 'branch') {
				if (query[i] && query[i] != "undefined" && query[i].length > 0) {
					fFilter['branch'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])};
				}
			} else if (i === 'customer') {
				if (query[i] && query[i] != "undefined" && query[i].length > 0) {
					fFilter['customer'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])};
				}
			} else if (!Array.isArray(query[i]) && query[i].match(/^[0-9a-fA-F]{24}$/)) {
				fFilter[i] = mongoose.Types.ObjectId(query[i]);
			} else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

async function getGrReport(reqBody, next) {

	reqBody.aCustomerDetail = reqBody.aCustomerDetail || [];

	if (reqBody['customer.category']) {
		let oCustomer = await customerModel.find({category: {$in: reqBody['customer.category']}});

		if (oCustomer) {
			oCustomer.forEach(obj => {
				reqBody.aCustomerDetail.push(obj._id);
			})
		}
	}

	let oPFil = constructGrReportFilters(reqBody);
	if (reqBody.reportType === "Billed Monthly Report") {
		oPFil.$or = [
			{"supplementaryBillRef.0": {$exists: true}},
			{"provisionalBill.0": {$exists: true}},
			{"bill": {$exists: true}}
		]
	}
	if (reqBody.reportType === "Unbilled Monthly Report") {
		oPFil.$and = [
			{"supplementaryBillRef.0": {$exists: false}},
			{"provisionalBill.0": {$exists: false}},
			{"bill": {$exists: false}},
			{"isNonBillable": {$not: {$eq: true}}}
		]
	}
	let bpCId = {};
	if (reqBody.bPclientId)
		bpCId["billingParty.clientId"] = reqBody.bPclientId;
	if (reqBody["billingParty._id"])
		bpCId["billingParty._id"] = otherUtil.arrString2ObjectId(reqBody["billingParty._id"]);

	let oCustomerSrc = {};
	if (reqBody.customer)
		oCustomerSrc = {"customer._id": otherUtil.arrString2ObjectId(reqBody.customer)}

	const aggQuery = [
		{$match: oPFil},
		//{$sort: {_id: -1}},
		{
			"$group": {
				"_id": {
					"billingParty": "$billingParty",
					"customer": "$customer",
					"month": {$month: {date: "$grDate", timezone: 'Asia/Kolkata'}},
					"year": {"$year": {date: "$grDate", timezone: 'Asia/Kolkata'}}
				},
				"stotalFreight": {
					"$sum": {
						"$add": [
							{
								"$ifNull": [
									"$totalFreight",
									0
								]
							},
							{
								"$ifNull": [
									"$supplementaryBill.totalFreight",
									0
								]
							}
						]
					}
				},
				"count": {$sum: 1},
			}
		},
		{
			"$project": {
				"billingParty": "$_id.billingParty",
				"customer": "$_id.customer",
				"month": "$_id.month",
				"year": "$_id.year",
				"stotalFreight": "$stotalFreight",
				"count": "$count"
			}
		},

		{
			$lookup: {
				from: "billingparties",
				localField: "billingParty",
				foreignField: "_id",
				as: "billingParty"
			}
		},
		{
			"$unwind": {
				"path": "$billingParty",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$match: bpCId
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
			$match: oCustomerSrc
		},
		{
			"$project": {
				"custName": "$customer.name",
				"billingParty": "$billingParty.name",
				"month": 1,
				"year": 1,
				"amount": 1,
				"stotalFreight": 1,
				"count": 1
			}
		},
		{$sort: {custName: 1}},
	];
	let oQuery = {aggQuery: aggQuery, no_of_docs: 10000};
	let aFoundData = await serverSidePage.requestData(GR, oQuery);

	let massagedData = {};
	let totCNS = 0;

	aFoundData.forEach(oData => {
		massagedData[oData.billingParty] = massagedData[oData.billingParty] || {};
		massagedData[oData.billingParty].name = oData.billingParty;
		massagedData[oData.billingParty].custName = oData.custName;
		massagedData[oData.billingParty].count = massagedData[oData.billingParty].count || 0;
		massagedData[oData.billingParty].count += oData.count;
		let monthYear = moment().month(oData.month - 1).year(oData.year).format('MM-YYYY');
		massagedData[oData.billingParty][monthYear] = massagedData[oData.billingParty][monthYear] || 0;
		massagedData[oData.billingParty][monthYear] += oData.stotalFreight;
		totCNS += oData.count;
	});
	let data = {
		massagedData: massagedData,
		totCNS: totCNS
	}

	return data;
}

async function podReport(reqBody, next) {

	reqBody.aCustomerDetail = reqBody.aCustomerDetail || [];
	if (reqBody['customer.category']) {
		let oCustomer = await customerModel.find({category: {$in: reqBody['customer.category']}});

		if (oCustomer) {
			oCustomer.forEach(obj => {
				reqBody.aCustomerDetail.push(obj._id);
			})
		}

	}
	let oPFil = constructGrReportFilters(reqBody);

	// let data = await tripService.getV2(reqBody);

	// if (reqBody.isNonBillable === "Billed Monthly Report") {
	//   oPFil.$or = [
	//     {"supplementaryBillRef.0": {$exists: true}},
	//     {"provisionalBill.0": {$exists: true}},
	//     {"bill": {$exists: true}}
	//   ]
	// }
	// if (reqBody.reportType === "Unbilled Monthly Report") {
	//   oPFil.$and = [
	//     {"supplementaryBillRef.0": {$exists: false}},
	//     {"provisionalBill.0": {$exists: false}},
	//     {"bill": {$exists: false}}
	//   ]
	// }
	const aggQuery = [
		{$match: oPFil},
		//{$sort: {_id: -1}},
		{
			$project: {
				grDate: 1,
				vehicle_no: 1,
				customer: 1,
				consignor: 1,
				consignee: 1,
				statuses: 1,
				bill: 1,
				isNonBillable: 1 //false=unbilled ,true=non-billable
			}
		},
		{
			$lookup: {
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
			$lookup: {
				"from": "consignor_consignees",
				"localField": "consignor",
				"foreignField": "_id",
				"as": "consignor"
			}
		},
		{
			"$unwind": {
				"path": "$consignor",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$lookup: {
				"from": "consignor_consignees",
				"localField": "consignee",
				"foreignField": "_id",
				"as": "consignee"
			}
		},
		{
			"$unwind": {
				"path": "$consignee",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			"$unwind": {
				"path": "$statuses",
				"preserveNullAndEmptyArrays": true
			}
		}];

// {report
//     $lookup:{
//         "from": "bills",
//         "localField": "bill",
//         "foreignField": "_id",
//         "as": "bill"
//     }
// },
// {
//       "$unwind": {
//         "path": "$bill",
//         "preserveNullAndEmptyArrays": true
//       }
// },

	if (reqBody.grDocType && reqBody.grDocType.length > 0) {
		let aGrDt = reqBody.grDocType;
		aggQuery.push(
			{
				"$addFields": {"grStrId": {"$toString": "$_id"}},
			},
			{
				"$lookup": {
					"from": "datamanagements",
					"localField": "grStrId",
					"foreignField": "linkToId",
					"as": "datamanagements"
				}
			},
			{
				"$match": {
					"datamanagements.files.category": {$nin: aGrDt}
				}
			}
		);
	}

	aggQuery.push({
		$project: {
			_id: 1,
			grDate: 1,
			vehicle_no: 1,
			customer: "$customer.name",
			consignor: "$consignor.name",
			consignee: "$consignee.name",
			statuses: "$statuses.status",
			bill: 1,
			isNonBillable: 1
		}
	});

	let oQuery = {aggQuery: aggQuery, no_of_docs: 100};
	let aFoundData = await serverSidePage.requestData(GR, oQuery);
	if (aFoundData) {
		for (let o of aFoundData) {
			// get document count from datamanagement
			if (o._id) {
				let bodyClient = {
					_id: o._id.toString(),
					modelName: "gr"
				};
				let oDms = await datamgntService.findOneRec(bodyClient, {clientId: reqBody.clientId});
				if (oDms && oDms.files && oDms.files.length > 0) {
					o["noOfDocs"] = oDms.files.length;
				} else {
					o["noOfDocs"] = 0;
				}
			}
		}
	}

	return aFoundData;
}

async function get(req, res, next) {
	try {
		let oRes = {status: 'OK'};
		// req.body = otherUtil.bindBranchFilter(req.body, 'branch', req.user.branch);
		//The comma operator evaluates all of its operands and returns the value of the last (rightmost) one.

		if (req.clientConfig && req.clientConfig.config && req.clientConfig.config.clientOps && req.clientConfig.config.clientOps) {
			req.body.clientId = req.clientConfig.config.clientOps;
		} else if (req.user.clientId) {
			req.body.clientId = req.user.clientId;
		}

		if (req.body['customer.category']) {
			let oCustomer = await customerModel.find({
				category: {$in: req.body['customer.category']},
				clientId: req.user.clientId
			});

			if (oCustomer) {
				req.body.customer = [];
				oCustomer.forEach(obj => {
					req.body.customer.push(obj._id);
				})
			}

		}

		let oQuery = req.body;
		oQuery.queryFilter = constructFilters(oQuery);
		oQuery.populate = req.body.populate || [];

		let aGrDt = [];
		if (req.body.grDocType && req.body.grDocType.length > 0) {
			oQuery.aGrDt = req.body.grDocType;
		}
		if(req.body.trip_no){
			oQuery.sort = {grNumber: 1};
		}else{
			oQuery.sort = req.body.sort || {_id: -1};
		}


		oQuery.allowedRef = ALLOWED_REFERENCED_GET;
		oQuery.populate = req.body.populate;
		oQuery.projection = req.body.projection;
		let aTripGR = await GR.paginate(oQuery);

		if (aTripGR.data) {
			for (let o of aTripGR.data) {
				// get document count from datamanagement
				if (o._id) {
					let bodyClient = {
						_id: o._id.toString(),
						modelName: "gr"
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

		return res.status(200).json((oRes.data = (aTripGR ? aTripGR : []), oRes.message = 'GR found.', oRes));
	} catch (err) {
		next(err);
	}
}

function constructShipmentTrackingFilters(oQuery) {
	let oFilter = {tripCancelled: {$not: {$eq: true}}};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_GET_FILTER)) {
			if (i == 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				if (constant.grItemStatus.indexOf(oQuery.dateType) >= 0) {
					oFilter[`${oQuery.dateType} status.date`] = oFilter[`${oQuery.dateType} status.date`] || {};
					oFilter[`${oQuery.dateType} status.date`]['$gte'] = startDate;
				} else if (oQuery.dateType === 'billDate') {
					oFilter['bill_query'] = oFilter[`bill_query`] || {};
					oFilter['bill_query']['billDate'] = oFilter['bill_query']['billDate'] || {};
					oFilter['bill_query']['billDate']['$gte'] = startDate;
				}else {
					oFilter[oQuery.dateType || 'created_at'] = oFilter[oQuery.dateType || 'created_at'] || {};
					oFilter[oQuery.dateType || 'created_at'].$gte = startDate;
				}
			} else if (i == 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				if (constant.grItemStatus.indexOf(oQuery.dateType) >= 0) {
					oFilter[`${oQuery.dateType} status.date`] = oFilter[`${oQuery.dateType} status.date`] || {};
					oFilter[`${oQuery.dateType} status.date`]['$lte'] = endDate;
				} else if (oQuery.dateType === 'billDate') {
					oFilter['bill_query'] = oFilter[`bill_query`] || {};
					oFilter['bill_query']['billDate'] = oFilter['bill_query']['billDate'] || {};
					oFilter['bill_query']['billDate']['$lte'] = endDate;
				} else {
					oFilter[oQuery.dateType || 'created_at'] = oFilter[oQuery.dateType || 'created_at'] || {};
					oFilter[oQuery.dateType || 'created_at'].$lte = endDate;
				}
			} else if (i === 'shipmentNo') {
				oFilter['integration.shell.shipmentNo'] = oQuery[i];
			} else if (i === 'delivered') {
				oFilter['integration.shell.delivered'] = oQuery[i];
			} else if (i === 'statuses.status') {
				oFilter['statuses.status'] = Array.isArray(oQuery[i]) ? {$in: oQuery[i]} : oQuery[i];
			} else if (i === 'customer' || i === 'vehicle') {
				oFilter[i] = {
					$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
				};
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

async function getGr(req, res, next) {
	try {
		let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		let oPFil = constructShipmentTrackingFilters(oQuery);
		const defaultStatus = ["Vehicle Arrived for loading", "Loading Ended", "Vehicle Arrived for unloading", "Unloading Ended"];
		let statusesFilter = {
			"statuses.status": Array.isArray(req.body['statuses.status']) ? {$in: req.body['statuses.status']} : req.body['statuses.status'] || {$in: defaultStatus},
		};

		if (typeof req.body.sync !== 'undefined') {
			statusesFilter['statuses.syncDate'] = {$exists: req.body.sync}
		}

		const oCustMap = req.body.custStatus;
		const aggrQuery = [
			{$match: oPFil},
			{$sort: {_id: -1}},
			{
				$project: {
					grNumber: 1,
					grDate: 1,
					customer: 1,
					integration: 1,
					status: 1,
					statuses: 1,
					vehicle_no: 1,
					route: 1,
					"invoices.ref1": 1
				}
			},
			{$lookup: {from: 'customers', localField: 'customer', foreignField: '_id', as: 'customer'}},
			{$unwind: {path: '$customer', preserveNullAndEmptyArrays: true}},
			{$lookup: {from: 'transportroutes', localField: 'route', foreignField: '_id', as: 'route'}},
			{$unwind: {path: '$route', preserveNullAndEmptyArrays: true}},
			{
				$project: {
					grNumber: 1,
					grDate: 1,
					customer: {
						name: 1,
						shipperEnterprise: 1,
						shipperOrganization: 1,
					},
					route: {
						name: 1
					},
					vehicle_no: 1,
					integration: 1,
					status: 1,
					statuses: 1,
					"invoices.ref1": 1
				}
			},
			{
				$unwind: {
					path: '$statuses',
					preserveNullAndEmptyArrays: true
				}
			},
			{$match: statusesFilter}
		];
		let oQuerys = {
			aggQuery: aggrQuery,
			no_of_docs: req.body.no_of_docs || 10,
			skip: req.body.skip || 1,
			// sort: {'statuses.date': 1}
		};

		if (req.body.download === 'csv') {
			let downloadPath = await new csvDownload(GR, aggrQuery, {
				filePath: `${req.user.clientId}/shipment-track`,
				fileName: `shipment_${moment().format('DD-MM-YYYY')}`
			}).exec(ShipmentTrackingReports.transform, req);

			return res.status(200).json({
				status: "SUCCESS",
				message: 'Trip Gr Report ',
				url: downloadPath
			});
		} else {
			let foundData;
			foundData = await serverSidePage.requestData(GR, oQuerys);

			if (req.body.download) {
				ReportExelService.grShipmentReport(foundData, req.user.clientId, function (d) {
					return res.status(200).json({
							'status': 'OK',
							'message': 'report download available.',
							'url': d.url
						}
					);
				});
			} else {
				foundData.forEach(obj => {
					obj.statuses.shellStatus = oCustMap[obj.statuses.status];
				});
				return res.status(200).json({
					'status': 'OK',
					'message': 'Gr Data found',
					'data': foundData
				});
			}
		}


	} catch (err) {
		throw err;
	}
}

async function getV2Lite(req, res, next) {
	try {
		let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		let oPFil = constructFilters(oQuery);

		let projection = {status:1,grNumber:1,grDate:1,'statuses':1,'trip.trip_no':1,'trip.statuses':1,
			'trip.vehicle_no':1,'trip.ownershipType':1,'trip._id':1, invoices:1, num4: 1, num5: 1, num6: 1,'customer.name':1,
			'customer._id':1, 'customer.configs':1,'customer.billTemplate':1,'customer.category': 1,
			'trip.route':1, 'trip.route_name':1, 'consignor.name':1,'consignor._id':1,'stationaryId': 1, 'supplementaryBillRef':1,'consignee.name':1, 'consignee._id':1,
			'billingParty':1, 'deduction':1,'vehicle':1, 'route.name':1,'route.source.c':1, 'route.destination.c':1,'route.route_distance':1,acknowledge:1,
			payment_basis:1, payment_type:1, charges:1,moneyReceipt:1, supplementaryBill:1,basicFreight:1,'route._id':1,totalFreight:1,cGST:1,sGST:1,iGST:1,iGST_percent:1,
			cGST_percent:1,sGST_percent:1, totalAmount:1, 'branch.name':1,'branch.grBook.ref':1,'branch._id':1,eWayBills:1,remarks:1,pod:1,
			gr_type:1,isGrBillable:1,invToBill:1,his:1,isNonBillable:1, isSupplementaryShow:1,selectedSupply:1,totalCharges:1,totalDeduction:1, standardTime:1,
			totalChargesWithoutTax: 1,tnbCharges:1,nbCharges:1, chargeableTime:1,loadingDetentionRate:1, unloadingDetentionRate:1,total_no_of_units:1,internal_rate:1,pendingRemark:1,in:1,
			last_modified_at: 1, last_sync_at: 1, last_sync_by: 1, expected_arrival:1,bill:1,documents:1,diesel_index:1,created_by_full_name:1, created_at:1,
			incentivePercent:1, trip_no:1, vehicle_no:1, provisionalBill:1, coveringBuilty:1, clientId:1, chargableFreight:1,
		};

		const aggrQuery = [
			{$match: oPFil},
			{$sort: {_id: -1}},

			{$lookup: {from: 'customers', localField: 'customer', foreignField: '_id', as: 'customer'}},
			{$unwind: {path: '$customer', preserveNullAndEmptyArrays: true}},
			{$lookup: {
					from: 'billingparties',
					localField: 'billingParty',
					foreignField: '_id',
					as: 'billingParty'
				}},
			{$unwind: {path: '$billingParty', preserveNullAndEmptyArrays: true}},
			{$lookup: {from: 'tripv2', localField: 'trip', foreignField: '_id', as: 'trip'}},
			{$unwind: {path: '$trip', preserveNullAndEmptyArrays: true}},
			{$lookup: {from: 'bills', localField: 'bill', foreignField: '_id', as: 'bill'}},
			{$unwind: {path: '$bill', preserveNullAndEmptyArrays: true}},
			{ $lookup: { from: 'bills', localField: 'provisionalBill.ref', foreignField: '_id', as: 'provisionalBill.ref' } },
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
			},
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
			{$lookup: {from: 'transportroutes', localField: 'route', foreignField: '_id', as: 'route'}},
			{$unwind: {path: '$route', preserveNullAndEmptyArrays: true}},

			{
				$project: projection
			}
		];
		let oQuerys = {
			aggQuery: aggrQuery,
			no_of_docs: req.body.no_of_docs || 10,
			skip: req.body.skip || 1,
		};


		let foundData;
		foundData = await serverSidePage.requestData(GR, oQuerys);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Gr Data found',
			'data': foundData
		});


	} catch (err) {
		throw err;
	}
}


async function add_gr_number(req, res, next) {
	try {
		let oRes = {success: 'OK', message: 'GR does not exists or cancelled.'};

		if (!req.body.grDate)
			throw new Error('Gr Date is mandatory');

		if (new Date(req.body.grDate).getTime() > Date.now())
			throw new Error('GR Date cannot be set to future');

		let oUpdatedBy = {
			user_full_name: req.user.full_name,
			user_id: req.user._id,
			date: (req.body.grDate) ? req.body.grDate : new Date(),
			systemDate: new Date(),
			status: 'GR Assigned',
			remark: (req.body.remark) ? req.body.remark : null
		};
		let grPropertiesToUpdate = otherUtil.pickPropertyFromObject(req.body, ALLOWED_UPDATE_WITHOUT_GR_FILTER);
		if(grPropertiesToUpdate.payment_type == "FOC"){
			grPropertiesToUpdate.isNonBillable = true;
		}
		let oGrProject = {tripCancelled: 1, trip: 1, status: 1, statuses: 1, stationaryId: 1, eWayBills: 1};
		/*let oGR = await GR.findOne({_id: req.params._id}, oGrProject).populate({
			path: 'trip',
			select: {status: 1}
		}).lean();
		if (!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		*/
		let aggrGrPipe = [
			{$match: {_id: mongoose.Types.ObjectId(req.params._id)}},
			{$lookup: {from: 'tripv2', localField: 'trip', foreignField: '_id', as: 'trip'}},
			{$unwind: {path: '$trip', preserveNullAndEmptyArrays: true}},
			{$project: oGrProject}
		];
		let oGR = await GR.aggregate(aggrGrPipe);
		if (!oGR && !oGR[0]) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		oGR = oGR[0];
		if (oGR.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});
		if (oGR.trip && oGR.trip.status === 'Trip not started') return res.status(405).json({message: 'Trip must be started before adding GR'});
		if (oGR && (oGR.tripCancelled === false)) {

			let unsetQuery = {};

			// Gr Number validation code

			// Validates that gr Number is Unique in single client Id
			var fFilter = {
				clientId: req.user.clientId,
				tripCancelled: false,
				_id: {$ne: mongoose.Types.ObjectId(req.params._id)},
				$or: [{"grNumber": grPropertiesToUpdate.grNumber}]
			};
			if (grPropertiesToUpdate.integration && grPropertiesToUpdate.integration.shell && grPropertiesToUpdate.integration.shell.shipmentNo)
				fFilter.$or.push({'integration.shell.shipmentNo': grPropertiesToUpdate.integration.shell.shipmentNo});

			//let usedGrs = await GR.find(fFilter, {_id: 1, integration: 1, grNumber: 1});
			let aggrPipe2 = [
				{$match: fFilter},
				{$project: {_id: 1, integration: 1, grNumber: 1}}
			];
			let usedGrs = await GR.aggregate(aggrPipe2);

			if (usedGrs.length) {
				if (usedGrs[0].grNumber === grPropertiesToUpdate.grNumber)
					return res.status(500).json({status: 'ERROR', message: 'GR Number already used.'});
				else
					return res.status(500).json({status: 'ERROR', message: 'Shipment Number already used.'});

			}

			//Find stationary number if stationary id not provided to maintain 1 to 1 binding of stationary and grNumber
			if (!grPropertiesToUpdate.stationaryId) {
				let foundStationary = await billStationary.findByRefAndType({
					bookNo: grPropertiesToUpdate.grNumber,
					type: 'Gr',
					clientId: req.user.clientId
				});

				if (foundStationary)
					grPropertiesToUpdate.stationaryId = foundStationary._id;
				// else
				// 	return res.status(500).json({status: 'ERROR', message: 'Invalid GR Number'});

			}

			if ((grPropertiesToUpdate.stationaryId || oGR.stationaryId) && (grPropertiesToUpdate.stationaryId !== oGR.stationaryId)) {

				// if stationary is changed than cancel the previous stationary
				if (oGR.stationaryId) {
					await billStationary.updateStatusV2({
						_id: oGR.stationaryId
					}, {
						userName: req.user.full_name,
						status: 'cancelled',
						docId: oGR._id,
						modelName: 'TripGr',
					});
				}

				// if stationary is changed than mark "USED" the new stationary
				if (grPropertiesToUpdate.stationaryId) {
					await billStationary.updateStatusV2({
						_id: grPropertiesToUpdate.stationaryId
					}, {
						userName: req.user.full_name,
						status: 'used',
						docId: oGR._id,
						modelName: 'TripGr',
					});
				} else {
					// if no New stationary is provided than unset the stationaryId on gr
					unsetQuery = {
						$unset: {
							stationaryId: 1
						}
					};
				}
			}

			let checkStatus = false;
			for (let s = 0; s < oGR.statuses.length; s++) {
				if (oGR.statuses[s].status == oUpdatedBy.status) {
					oGR.statuses[s] = oUpdatedBy;
					checkStatus = true;
					break;
				}
			}
			if (!checkStatus) oGR.statuses.push(oUpdatedBy);
			grPropertiesToUpdate.statuses = oGR.statuses;
			if (oGR.status === 'GR Not Assigned' && grPropertiesToUpdate.grNumber)
				grPropertiesToUpdate.status = "GR Assigned";

			// if (Array.isArray(req.body.eWayBills) && req.body.eWayBills.length > 0) {
				// for (var _i = 0; _i < req.body.eWayBills.length; _i++) {
				// 	var isFound = oGR.eWayBills.findIndex(dbEway => dbEway.number === req.body.eWayBills[_i].number);
				// 	if (isFound !== -1) {
				// 		oGR.eWayBills.splice(isFound, 1);
				// 	}
				// }
			    oGR.eWayBills =[];
				oGR.eWayBills.push(...req.body.eWayBills);
				grPropertiesToUpdate.eWayBills = oGR.eWayBills;
			// }
			if (grPropertiesToUpdate.grDate) {
				grPropertiesToUpdate.expected_arrival = new Date(new Date(grPropertiesToUpdate.grDate).getTime() + ((((oGR.trip && oGR.trip.route ? oGR.trip.route.route_distance : oGR.trip && oGR.trip.rKm) || 0) / 200) + 1) * 24 * 60 * 60 * 1000);
			}

			oRes.data = await GR.updateOne({_id: oGR._id}, {
				...unsetQuery,
				$set: {
					last_modified_at: new Date(),
					last_modified_by: req.user.full_name,
					...grPropertiesToUpdate
				}
			});
			/*
                        if (oGR && oGR._id){
                            oRes.data = (await GR.aggregate([{$match:{_id: oGR._id}}]))[0];
                            //oRes.data = (await GR.find({_id: oGR._id}))[0];
                        }

             */

			oRes.message = 'GR number updated successfully.';
		}
		//send response
		return res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function addGr(req, res, next) {
	try {

		let body = req.body;
		body.clientId = req.user.clientId;
		body.created_by = req.user._id;
		body.created_by_full_name = req.user.full_name;
		body.status = "GR Not Assigned";
		body.statuses = [];

		let foundGr, shipNoSet = [];

		if (body.grNumber && !body.stationaryId) {
			let foundStationary = await BillStationary.findOne({
				bookNo: body.grNumber,
				type: 'Gr',
				status: 'unused'
			});

			if (foundStationary)
				body.stationaryId = foundStationary._id;
			// else
			// 	return res.status(500).json({status: 'ERROR', message: 'Invalid GR Number'});

			// if (oGR.grNumber && !oGR.stationaryId)
			// 	throw new Error('Gr Number not registered to any stationary or is user');
		}

		if (body.stationaryId) {
			body.status = 'GR Assigned';
			body.statuses = [{
				user_full_name: req.user.full_name,
				user_id: req.user._id,
				date: (body.grDate) ? body.grDate : new Date(),
				systemDate: new Date(),
				status: 'GR Assigned',
			}];


		}

		if (body.integration && body.integration.shell && body.integration.shell.shipmentNo) {
			foundGr = (await GR.find({
				'integration.shell.shipmentNo': body.integration.shell.shipmentNo,
				tripCancelled: {$not: {$eq: true}}
			}, {grNumber: 1}));
			shipNoSet.push(body.integration.shell.shipmentNo);
		}

		if (foundGr && foundGr.length)
			throw new Error(`Shipment Number ${body.integration.shell.shipmentNo} already registered to Gr ${foundGr[0].grNumber}`);

		if (body.tMemo && body.tMemo.tMNo) {
			let Tmemo = await GR.findOne({
				'tMemo.tMNo': body.tMemo.tMNo,
				tripCancelled: {$ne: true},
				"clientId": req.user.clientId
			}, {tMemo: 1});
			if (Tmemo) {
				throw new Error(` trip memo no ${Tmemo && Tmemo.tMemo && Tmemo.tMemo.tMNo} already generated`);
			}
		}

		if (body.tMemo && body.tMemo.tMNo && !body.tMemo.stationaryId) {
			let foundStationary = await BillStationary.findOne({
				bookNo: body.tMemo.tMNo,
				type: 'Trip Memo',
				status: {$in: ['unused', 'cancelled']}
			}, {_id: 1});

			if (foundStationary)
				body.tMemo.stationaryId = foundStationary._id;
		}


		if (shipNoSet.length && shipNoSet.length > 1) {
			var uniqueSet = new Set(shipNoSet);
			var uniqueArr = Array.from(uniqueSet);
			if (shipNoSet.length != uniqueArr.length)
				throw new Error(`All Shipment Number should be Unique`);
		}

		const newGR = new GR(body);

		let savedGR = await newGR.save();

		if (body.stationaryId) {
			await billStationary.updateStatusV2({
				_id: body.stationaryId
			}, {
				userName: req.user.full_name,
				status: 'used',
				docId: savedGR._id,
				modelName: 'TripGr',
			});
		}

		if (body.tMemo && body.tMemo.stationaryId) {
			await BillStationary.findByIdAndUpdate(body.tMemo.stationaryId, {
				$set: {status: 'used'},
				$push: {
					commonHistory: {
						user: req.user.full_name,
						date: new Date(),
						status: 'used',
						wasLinkedTo: savedGR._id,
						wasLinkedToSchema: 'TripGr',
					}
				}
			});
		}

		//send response

		res.status(200).json({status: "OK", "messages": "Succefully Created", data: savedGR});
	} catch (err) {
		winston.error(err.message || err.toString());
		next(err);
	}
}

async function update(id, req) {
	try {

		if (!req.body.grDate)
			throw new Error('Gr Date is mandatory');

		if (new Date(req.body.grDate).getTime() > Date.now())
			throw new Error('GR Date cannot be set to future');

		let oGrProject = {tripCancelled: 1, trip: 1, statuses: 1, stationaryId: 1, eWayBills: 1, expected_arrival: 1};
		let oGR = await GR.findOne({_id: id}, oGrProject).populate({path: 'trip', select: {status: 1}}).lean();
		if (!oGR)
			throw new Error('GR does not exists.');
		if (oGR.tripCancelled)
			throw new Error('GR does not exists.');
		let grPropertiesToUpdate = otherUtil.pickPropertyFromObject(req.body, ALLOWED_UPDATE_WITHOUT_GR_FILTER);

		let unsetQuery = {};

		// Gr Number validation code
		// Validates that gr Number is Unique in single client Id
		let usedGrs = await GR.find({
			'grNumber': grPropertiesToUpdate.grNumber,
			clientId: req.user.clientId,
			_id: {$ne: id}
		}, {_id: 1});

		if (usedGrs.length)
			throw new Error('GR Number already used.');

		grPropertiesToUpdate.grNumber = (grPropertiesToUpdate.grNumber || '').toString().trim();

		//Find stationary number if stationary id not provided to maintain 1 to 1 binding of stationary and grNumber
		if (!grPropertiesToUpdate.stationaryId) {
			let foundStationary = await BillStationary.findOne({
				clientId: req.user.clientId,
				bookNo: grPropertiesToUpdate.grNumber,
				type: 'Gr',
				status: 'unused'
			});

			if (foundStationary)
				grPropertiesToUpdate.stationaryId = foundStationary._id;
			// else
			// 	return res.status(500).json({status: 'ERROR', message: 'Invalid GR Number'});
		}

		if (!grPropertiesToUpdate.stationaryId)
			throw new Error('Gr Number not registered to any stationary');

		if ((grPropertiesToUpdate.stationaryId || oGR.stationaryId) && (grPropertiesToUpdate.stationaryId !== oGR.stationaryId)) {

			// if stationary is changed than cancel the previous stationary
			if (oGR.stationaryId) {
				await billStationary.updateStatusV2({
					_id: oGR.stationaryId
				}, {
					userName: req.user.full_name,
					status: 'cancelled',
					docId: oGR._id,
					modelName: 'TripGr',
				});
			}

			// if stationary is changed than mark "USED" the new stationary
			if (grPropertiesToUpdate.stationaryId) {
				await billStationary.updateStatusV2({
					_id: grPropertiesToUpdate.stationaryId
				}, {
					userName: req.user.full_name,
					status: 'used',
					docId: oGR._id,
					modelName: 'TripGr',
				});
			} else {
				// if no New stationary is provided than unset the stationaryId on gr
				unsetQuery = {
					$unset: {
						stationaryId: 1
					}
				};
			}
		}

		let oUpdatedBy = {
			user_full_name: req.user.full_name,
			user_id: req.user._id,
			date: (req.body.updated_status && req.body.updated_status.date) ? req.body.updated_status.date : new Date(),
			systemDate: new Date(),
			status: grPropertiesToUpdate.status,
			remark: (req.body.updated_status && req.body.updated_status.remark) ? req.body.updated_status.remark : undefined
		};
		if (!oGR.expected_arrival && grPropertiesToUpdate.grDate) {
			oGR.expected_arrival = new Date(new Date(grPropertiesToUpdate.grDate).getTime() + (((oGR.trip && oGR.trip.route ? oGR.trip.route.route_distance : oGR.trip.rKm) / 200) + 1) * 24 * 60 * 60 * 1000);
		}
		if (oGR && (oGR.tripCancelled === false)) {
			oGR.statuses.push(oUpdatedBy);
			grPropertiesToUpdate.statuses = oGR.statuses;
			if (Array.isArray(req.body.eWayBills) && req.body.eWayBills.length > 0) {
				for (var _i = 0; _i < req.body.eWayBills.length; _i++) {
					var isFound = oGR.eWayBills.findIndex(dbEway => dbEway.number === req.body.eWayBills[_i].number);
					if (isFound !== -1) {
						oGR.eWayBills.splice(isFound, 1);
					}
				}
				oGR.eWayBills.push(...req.body.eWayBills);
				grPropertiesToUpdate.eWayBills = oGR.eWayBills;
			}

			return await GR.updateOne({_id: oGR._id}, {
				...unsetQuery,
				$set: {
					last_modified_at: new Date(),
					...grPropertiesToUpdate
				}
			});
		}
	} catch (err) {
		throw err;
	}
}

async function updateProp(id, req) {
	try {
		let oGrProject = {tripCancelled: 1, trip: 1, statuses: 1, stationaryId: 1, eWayBills: 1, expected_arrival: 1};
		let oGR = await GR.findOne({_id: id}, oGrProject).populate({path: 'trip', select: {status: 1}}).lean();

		if (!oGR)
			throw new Error('GR does not exists.');

		if (oGR.tripCancelled)
			throw new Error('GR does not exists.');

		let grPropertiesToUpdate = otherUtil.pickPropertyFromObject(req.body, ALLOWED_UPDATE_WITH_GR_FILTER);

		if (oGR && (oGR.tripCancelled === false)) {
			if (Array.isArray(req.body.eWayBills) && req.body.eWayBills.length > 0) {
				for (var _i = 0; _i < req.body.eWayBills.length; _i++) {
					var isFound = oGR.eWayBills.findIndex(dbEway => dbEway.number === req.body.eWayBills[_i].number);
					if (isFound !== -1) {
						oGR.eWayBills.splice(isFound, 1);
					}
				}
				oGR.eWayBills.push(...req.body.eWayBills);
				grPropertiesToUpdate.eWayBills = oGR.eWayBills;
			}

			return await GR.findOneAndUpdate({_id: oGR._id}, {
				$set: {
					...grPropertiesToUpdate
				}
			}, {new: true});
		}
	} catch (err) {
		throw err;
	}
}

async function addAdvancePayment(req, res, next) {
	try {
		if (otherUtil.isAccountEnabled(req) && (!req.body.data.from || !req.body.data.to)) {
			return res.status(500).json({
				status: "OK",
				message: "Provide account's from and to"
			});
		}
		const response = await GR.update(
			{_id: req.params._id},
			{
				$push: {advance: req.body.data},
				$set: {
					last_modified_at: new Date()
				}
			},
			{new: true}
		);
		if (otherUtil.isAccountEnabled(req)) {
			let prepareExpenseData = {
				clientId: req.user.clientId,
				from: req.body.data.from,
				to: req.body.data.to,
				type: 'Receipt',
				amount: req.body.data.amount,
				refNo: req.body.data.ref,
				narration: req.body.data.remark,
				created_by: req.body.data.user
			};
			const expenseAdded = await voucherService.addVoucherAsync(prepareExpenseData);
		}
		const docx = await GR.findOne({_id: req.params._id});
		return res.status(200).json({status: 'OK', message: 'GR found', data: docx});
	} catch (err) {
		next(err);
	}
}

async function update_status(req, res, next) {
	try {
		let gpsData, location;
		let oRes = {status: 'OK', message: 'GR not found or trip cancelled.'};
		let oGrProject = {tripCancelled: 1, trip: 1, statuses: 1, stationaryId: 1, eWayBills: 1, expected_arrival: 1};
		let oGR = await GR.findOne({_id: req.params._id}, oGrProject).populate({
			path: 'vehicle',
			select: {device_imei: 1}
		}).lean();
		if (!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		if (oGR.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});
		if ((ALLOWED_UPDATE_STATUS.includes(req.body.status)) === false) return res.status(405).json({message: 'This status is not allowed to update.'});
		var stObj = {
			"Loading Started": "Vehicle Arrived for loading",
			"Loading Ended": "Vehicle Arrived for loading",
			"Vehicle Arrived for unloading": "Loading Ended",
			"Unloading Started": "Vehicle Arrived for unloading",
			"Unloading Ended": "Vehicle Arrived for unloading",
			"GR Received": "Vehicle Arrived for unloading",
			"GR Acknowledged": "Vehicle Arrived for unloading",
		};
		if ((req.body.status !== oGR.status) && stObj[req.body.status] && !(req.clientConfig.config.GR && req.clientConfig.config.GR.grStatusCheck)) {
			let stF = oGR.statuses.filter(s => s.status === stObj[req.body.status]);
			if (!stF.length) {
				return res.status(404).json({
					status: 'ERROR',
					message: `Please update ${stObj[req.body.status].toUpperCase()} details first`
				});
			} else if (new Date(req.body.updated_status.date).getTime() < new Date(stF[0].date).getTime()) {
				return res.status(404).json({
					status: 'ERROR',
					message: `Please update ${req.body.status.toUpperCase()} with date greater than ${moment(stF[0].date).format('DD-MM-YYYY h:mm a')}`
				});
			}
		}

		// var exStatus = {
		// 	"Loading Started": "Loading Ended",
		// 	"Unloading Started": "Unloading Ended",
		// };
		//
		// if(exStatus[req.body.status]){
		// 	let oldSt = oGR.statuses.filter(s => s.status === exStatus[req.body.status]);
		// 	if (oldSt.length) {
		// 		return res.status(404).json({
		// 			status: 'ERROR',
		// 			message: `Can not update ${exStatus[req.body.status].toUpperCase()} already`
		// 		});
		// 	}
		// }

		let timeInMillSec = new Date(req.body.updated_status.date).getTime();
		if (oGR.vehicle && oGR.vehicle.device_imei) {
			gpsData = await locationService.getOdometerAsync({
				device_imei: oGR.vehicle.device_imei,
				datetime: timeInMillSec
			});
		}

		if (gpsData instanceof Array) {
			if (gpsData[0]) {
				gpsData = gpsData[0];
			} else {
				gpsData = undefined;
			}
		}
		oGR.statuses = oGR.statuses.filter(st => st.status !== req.body.status);

		if (gpsData && gpsData.latitude && gpsData.longitude)
			location = await getLatLng(gpsData, req);

		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: (req.body.updated_status && req.body.updated_status.date) ? req.body.updated_status.date : new Date(),
			systemDate: new Date(),
			status: req.body.status,
			location2: req.body.location2,
			remark: (req.body.updated_status && req.body.updated_status.remark) ? req.body.updated_status.remark : undefined,
			gpsData: gpsData || {},
			location: location || {}
		};
		if (oGR && (oGR.tripCancelled === false)) {
			oGR.statuses.push(oUpdatedBy);
			oRes.data = await GR.updateOne({_id: oGR._id}, {
				$set: {
					status: req.body.status,
					statuses: oGR.statuses,
					last_modified_at: new Date(),
				}
			});
			let grData = await GR.findOne({_id: oGR._id}).lean();
			if (grData)
				oRes.data = grData;
			oRes.message = 'GR updated successfully.';
		}
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function adm_update(req, res, next) {
	try {
		let gpsData, location;
		let oRes = {status: 'OK', message: 'GR not found or trip cancelled.'};
		let oGrProject = {tripCancelled: 1, trip: 1, statuses: 1, stationaryId: 1, eWayBills: 1, expected_arrival: 1};
		let oGR = await GR.findOne({_id: req.params._id}, oGrProject).populate({
			path: 'vehicle',
			select: {device_imei: 1}
		}).lean();

		if (!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		if (oGR.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});

		let timeInMillSec = new Date(req.body.updated_status.date).getTime();
		if (oGR.vehicle && oGR.vehicle.device_imei) {
			gpsData = await locationService.getOdometerAsync({
				device_imei: oGR.vehicle.device_imei,
				datetime: timeInMillSec
			});
		}

		if (gpsData instanceof Array) {
			if (gpsData[0]) {
				gpsData = gpsData[0];
			} else {
				gpsData = undefined;
			}
		}

		oGR.statuses = oGR.statuses.filter(st => st.status !== req.body.status);
		if (gpsData)
			location = await getLatLng(gpsData, req);

		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: (req.body.updated_status && req.body.updated_status.date) ? req.body.updated_status.date : new Date(),
			systemDate: new Date(),
			status: req.body.status,
			location2: req.body.location2,
			remark: (req.body.updated_status && req.body.updated_status.remark) ? req.body.updated_status.remark : undefined,
			gpsData: gpsData || {},
			location: location || {}
		};

		if (oGR && (oGR.tripCancelled === false)) {
			oGR.statuses.push(oUpdatedBy);
			oRes.data = await GR.updateOne({_id: oGR._id}, {
				$set: {
					status: req.body.status,
					statuses: oGR.statuses,
					last_modified_at: new Date(),
				}
			});
			let grData = await GR.findOne({_id: oGR._id}).lean();
			if (grData)
				oRes.data = grData;
			oRes.message = 'GR updated successfully.';
		}
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function charge_update(req, res, next) {
	try {
		let oRes = {success: 'OK', message: 'GR not found or trip cancelled.'};
		let oGR = await GR.findOne({_id: req.params._id});
		if (!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		if (oGR.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});

		let grPropertiesToUpdate = otherUtil.pickPropertyFromObject(req.body, ['charges']);
		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: (req.body.updated_status && req.body.updated_status.date) ? req.body.updated_status.date : new Date(),
			systemDate: new Date(),
			status: grPropertiesToUpdate.status,
			remark: (req.body.updated_status && req.body.updated_status.remark) ? req.body.updated_status.remark : undefined
		};
		if (oGR && (oGR.tripCancelled === false)) {
			oGR.statuses.push(oUpdatedBy);
			oRes.data = await oGR.set(grPropertiesToUpdate).save();
			oRes.message = 'GR charges updated successfully.';
		}
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function acknowledge_gr(req, res, next) {
	try {
		let oRes = {success: 'OK', message: 'GR not found or trip cancelled.'};
		let oGR = await GR.findOne({_id: req.params._id});
		if (!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		if (oGR.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});
		// if(oGR.status === 'GR Acknowledged') return res.status(405).json({message: 'GR is already acknowledged.'});

		let grPropertiesToUpdate = otherUtil.pickPropertyFromObject(req.body, ['acknowledge', 'charges', 'pod']);

		// grPropertiesToUpdate.isGrBillable = req.body.isGrBillable;
		// grPropertiesToUpdate.payment_basis = req.body.payment_basis;
		// grPropertiesToUpdate.payment_type = req.body.payment_type;
		// grPropertiesToUpdate.rate = req.body.rate;
		// grPropertiesToUpdate.invoices.noOfUnits = req.body.invoices[0].noOfUnits;
		// grPropertiesToUpdate.invoices[0].weightPerUnit = req.body.invoices[0].weightPerUnit;
		// if(req.body.invoices[0].loadRefNumber)
		// 	grPropertiesToUpdate.invoices[0].loadRefNumber = req.body.invoices[0].loadRefNumber;
		// if(req.body.invoices[0].invoiceNo)
		// 	grPropertiesToUpdate.invoices[0].invoiceNo = req.body.invoices[0].invoiceNo;
		// if(req.body.invoices[0].invoiceDate)
		// 	grPropertiesToUpdate.invoices[0].invoiceDate = req.body.invoices[0].invoiceDate;
		// grPropertiesToUpdate.eWayBills = req.body.eWayBills;
		// grPropertiesToUpdate.invoices = req.body.invoices;
		grPropertiesToUpdate.acknowledge.systemDate = Date.now();

		let oUpdatedBy;

		if (!req.body.isAlreadyAck) {
			oUpdatedBy = {
				user_id: req.user._id,
				user_full_name: req.user.full_name,
				date: (req.body.updated_status && req.body.updated_status.date) ? req.body.updated_status.date : new Date(),
				systemDate: new Date(),
				status: 'GR Acknowledged',
				remark: (grPropertiesToUpdate.acknowledge && grPropertiesToUpdate.acknowledge.ack_remark) ? grPropertiesToUpdate.acknowledge.ack_remark : undefined
			};
		}

		if (oGR && (oGR.tripCancelled === false)) {
			if (!req.body.isAlreadyAck)
				oGR.statuses.push(oUpdatedBy);
			grPropertiesToUpdate.status = 'GR Acknowledged';
			oRes.data = await oGR.set(grPropertiesToUpdate).save();
			oRes.message = 'GR acknowledged successfully.';
		}
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function revertGrAcknowledge(req, res, next) {
	try {
		let oRes = {success: 'OK', message: 'GR not found or trip cancelled.'};
		let oGR = await GR.findOne({_id: req.params._id});
		if (!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		if (oGR.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});
		if (!oGR.acknowledge.status) return res.status(405).json({message: 'GR not acknowledged'});
		if (oGR.bill) return res.status(405).json({message: 'can not revert Bill already generated'});
		// if(oGR.provisionalBills) return res.status(405).json({message: 'can not revert Bill already generated'});

		oRes.data = await GR.updateOne({_id: oGR._id}, {
			$pull: {
				statuses: {
					status: 'GR Acknowledged'
				}
			},
			$set: {
				'acknowledge.status': false,
				status: 'Revert Acknowledged'
			}
		});
		oRes.message = 'GR acknowledged revert successfully.';
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function pending_gr_remark(req, res, next) {
	try {
		let oRes = {success: 'OK', message: 'GR not found or trip cancelled.'};
		let oGR = await GR.findOne({_id: req.params._id});
		if (!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		if (oGR.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});
		if (oGR.status === 'GR Acknowledged') return res.status(405).json({message: 'Acknowledged GR can not update pending remark.'});

		let grPropertiesToUpdate = otherUtil.pickPropertyFromObject(req.body, ['pendingRemark']);
		grPropertiesToUpdate.pendingRemark.systemDate = new Date();
		grPropertiesToUpdate.pendingRemark.user = req.user._id;
		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: (req.body.date) ? req.body.date : new Date(),
			systemDate: new Date(),
			status: undefined,
			remark: (grPropertiesToUpdate.pendingRemark && grPropertiesToUpdate.pendingRemark.remark) ? grPropertiesToUpdate.pendingRemark.remark : undefined
		};
		if (oGR && (oGR.tripCancelled === false)) {
			oGR.statuses.push(oUpdatedBy);
			oGR.pendingRemark.push(grPropertiesToUpdate.pendingRemark);
			oGR.expected_arrival = grPropertiesToUpdate.pendingRemark.expected_arrival;
			oRes.data = await oGR.save();
			oRes.message = 'Pending GR remarked successfully.';
		}
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function admin_update(req, res, next) {
	try {
		let oRes = {message: 'GR does not exists or cancelled.'};
		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: (req.body.date) ? req.body.date : new Date(),
			systemDate: new Date(),
			status: req.body.status,
			remark: (req.body.remark) ? `ADMIN UPDATED: ${req.body.remark}` : 'ADMIN UPDATED'
		};

		let grPropertiesToUpdate = otherUtil.pickPropertyFromObject(req.body, ALLOWED_ADMIN_FILTER);
		grPropertiesToUpdate.status = 'GR Assigned';
		let oGR = await GR.findOne({_id: req.params._id});
		if (!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		if (req.body.gr_type === 'Own') {
			let isExists = await GRstatusService.isGRstatusExistsAsync({
				clientId: req.user.clientId,
				'gr_no': grPropertiesToUpdate.grNumber,
				gr_Status: {$ne: 'Unallocated'}
			});
			if (isExists) {
				return res.status(405).json({message: 'GR number is already used.'});
			} else {
				let isExistsInMaster = await GRmasterService.isGRavailableinMasterAsync({
					clientId: req.user.clientId,
					'gr_no': grPropertiesToUpdate.grNumber,
					'branch_name': req.body.branch_name
				});
				if (isExistsInMaster) {
					let prepareStatusData = {
						clientId: req.user.clientId,
						branch_name: req.body.branch_name,
						branch_code: req.body.branch_code,
						customer_name: req.body.customer_name,
						grCode: req.body.grCode,
						grSeries: req.body.grSeries,
						book_no: req.body.book_no,
						book_year: req.body.book_year,
						branch: req.body.branch,
						tripId: req.body.tripId,
						trip_no: req.body.trip_no,
						bookingId: req.body.bookingId,
						booking_no: req.body.booking_no,
						gr: oGR._id,
						gr_no: grPropertiesToUpdate.grNumber,
						gr_type: grPropertiesToUpdate.gr_type
					};
					let addInGRstatus = await GRstatusService.addGRAsync(prepareStatusData);
				} else {
					return res.status(405).json({message: 'GR is not available in masters for this branch.'});
				}
			}
		} else if (req.body.gr_type === 'Centralized') {
			let grData = await GRmasterService.findUserActiveGRAsync({clientId: req.user.clientId});
			let prepareStatusData = {
				clientId: req.user.clientId,
				branch_name: 'Centralized',
				branch_code: req.body.branch_code,
				customer_name: req.body.customer_name,
				isCentralized: true,
				grCode: grData.grCode,
				grSeries: grData.grSeries,
				book_no: grData.book_no,
				book_year: grData.book_year,
				tripId: req.body.tripId,
				trip_no: req.body.trip_no,
				bookingId: req.body.bookingId,
				booking_no: req.body.booking_no,
				centralized_gr_no: req.body.gr_no
			};
			let addInGRstatus = await GRstatusService.addGRAsync(prepareStatusData);
		}
		oGR.statuses.push(oUpdatedBy);
		oRes.data = await oGR.set(grPropertiesToUpdate).save();
		oRes.message = 'GR updated successfully.';

		//send response
		return res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function add_geofence(req, res, next) {
	try {
		let oRes = {success: 'OK', message: 'GR not found or trip cancelled.'};
		let oGR = await GR.findOne({_id: req.params._id});
		if (!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		if (oGR.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});
		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: (req.body.date) ? req.body.date : new Date(),
			systemDate: new Date(),
			status: undefined,
			remark: 'add new geofence point for GR '
		};
		if (oGR && (oGR.tripCancelled === false)) {
			oGR.statuses.push(oUpdatedBy);
			req.body.geozones = [];
			oGR.geofence_points.push(req.body);
			delete req.body._id;
			delete req.body.status;
			delete req.body.trip_no;
			delete req.body.clientId;
			oRes.data = await oGR.save();
			oRes.message = 'geofence created successfully.';
		}
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function rm_geofence(req, res, next) {
	try {
		let oRes = {success: 'OK', message: 'GR not found or trip cancelled.'};
		let oGR = await GR.findOne({_id: req.params._id});
		if (!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		if (oGR.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});
		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: (req.body.date) ? req.body.date : new Date(),
			systemDate: new Date(),
			status: undefined,
			remark: 'remove geofence point for GR '
		};
		if (oGR && (oGR.tripCancelled === false)) {
			oGR.statuses.push(oUpdatedBy);
			for (let i = 0; i < oGR.geofence_points.length; i++) {
				if (oGR.geofence_points[i]._id == req.body.l_id) {
					oGR.geofence_points[i].deleted = true;
				}
			}
			delete req.body._id;
			delete req.body.status;
			delete req.body.trip_no;
			delete req.body.clientId;
			oRes.data = await oGR.save();
			oRes.message = 'geofence removed successfully.';
		}
		//send response
		res.status(200).json(oRes);
	} catch (err) {
		next(err);
	}
}

async function cancel(req, res, next) {
	try {
		let oRes = {status: 'OK', message: 'GR Successfully Cancelled.'};
		let oGrProject = {tripCancelled: 1, stationaryId: 1, grNumber: 1, trip: 1};
		let oGR = await GR.findOne({_id: req.params._id}, oGrProject).populate('trip').lean();
		if (!oGR) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
		if (oGR.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});

		if (oGR.bill || (Array.isArray(oGR.supplementaryBillRef) && oGR.supplementaryBillRef.length) || (Array.isArray(oGR.provisionalBill) && oGR.provisionalBill.length))
			return res.status(405).json({message: 'Gr is billed'});

		if (oGR.in && oGR.in.length) return res.status(405).json({message: 'Incidental is applied. Gr cannot be cancelled'});

		if (oGR.fpa && oGR.fpa.vch) return res.status(405).json({message: 'FPA is applied. Gr cannot be cancelled'});

		if (oGR.trip && oGR.trip.gr && oGR.trip.gr.length < 2) {
			return res.status(405).json({message: 'Trip can not cancelled as it is the last GR in the trip. Please ask operation team to cancel the trip ' + oGR.trip.trip_no});
		}

		let oUpdatedBy = {
			user_id: req.user._id,
			user_full_name: req.user.full_name,
			date: (req.body.updated_status && req.body.updated_status.date) ? req.body.updated_status.date : new Date(),
			systemDate: new Date(),
			status: req.body.status,
			remark: (req.body.updated_status && req.body.updated_status.remark) ? req.body.updated_status.remark : undefined
		};
		if (oGR && (oGR.tripCancelled === false)) {
			if (oGR.grNumber) {
				if (oGR.stationaryId) {
					await billStationary.updateStatusV2({
						_id: oGR.stationaryId
					}, {
						userName: req.user.full_name,
						status: 'cancelled',
						docId: oGR._id,
						modelName: 'TripGr',
					});
				}
			}

			let foundTrip = await Trip.updateOne({_id: oGR.trip._id}, {
				$pull: {
					gr: oGR._id
				}
			});

			if (foundTrip && foundTrip.nModified === 1) {

				oRes.data = await GR.updateOne({_id: oGR._id}, {
					$push: {
						statuses: oUpdatedBy
					},
					$set: {
						tripCancelled: true,
						status: 'GR Cancelled',
						last_modified_at: new Date(),
					},
					$unset: {
						grNumber: 1
					}
				});

			} else {
				oRes.message = `Trip not exists or already cancelled.`;
			}
			//send response
			res.status(200).json(oRes);
		}
	} catch (err) {
		next(err);
	}
}

async function documentsUpload(req, res, next) {
	try {
		if (req.files) {
			await FileService.uploadFiles(req, 'TripGr', req.grData, allowedFiles);
		}
		req.body.documents = req.grData.documents;
		delete req.files;
		let updated = await GR.findOneAndUpdateAsync({_id: req.params._id}, {$set: req.body}, {new: true});
		return res.status(200).json({
			'status': 'OK',
			'message': 'documents uploaded',
			'data': updated
		});
	} catch (err) {
		next(err);
	}
}

async function update_diesel_escalation(req, res, next) {
	try {
		if (req.body.aGR && req.body.aGR.length && req.body.aGR.length < 1) {
			return res.status(404).json({success: 'OK', message: 'Please provide GR ids'});
		}
		let aResponse = [];
		let dieselEscalationToUpdate = otherUtil.pickPropertyFromObject(req.body, ALLOWED_UPDATE_DIESEL_ESC_GR_FILTER);
		for (let grId of req.body.aGR) {
			let oGR = await GR.findOne({_id: grId});
			if (oGR && oGR.tripCancelled === false) {
				await oGR.set(dieselEscalationToUpdate).save();
				aResponse.push({'message': `GR No ${oGR.grNumber || ''} updated successfully.`});
			} else {
				aResponse.push({'message': `GR No ${oGR.grNumber || ''} not found or trip cancelled.`});
			}
		}
		//send response
		res.status(200).json({status: 'OK', message: aResponse});
	} catch (err) {
		next(err);
	}
}

async function report_diesel_escalation(req, res, next) {
	try {
		let clientId = req.user.clientId;
		let restrictSearch = {
			'clientId': clientId,
			'tripCancelled': false
		};
		if (req.body.start_date && req.body.end_date) {
			restrictSearch.grDate = {
				'$gte': new Date(req.body.start_date),
				'$lte': new Date(req.body.end_date)

			};
		}
		let aDOData = await BookingModel.aggregate(
			[
				{
					$match: {
						'clientId': clientId,
						'do_number': req.body.do_number,
						'customer': mongoose.Types.ObjectId(req.body.customer)
					}
				},
				{
					$group: {_id: '$do_number', aBooking: {$push: '$$ROOT'}}
				},
				{
					$graphLookup: {
						from: 'tripgrs',
						startWith: '$aBooking._id',
						connectFromField: 'aBooking._id',
						connectToField: 'booking',
						as: 'aGR',
						restrictSearchWithMatch: restrictSearch
					}
				},
				{
					$lookup: {
						from: 'contracts',
						localField: '_id',
						foreignField: 'do_number',
						as: 'contractByDO'
					}
				},
				{
					$lookup: {
						from: 'contracts',
						localField: '_id',
						foreignField: 'name',
						as: 'contractByName'
					}
				}
			]
		);

		/*,
				{ $lookup: {
						from: "tripgrs",
						localField:"aTrip.trip.gr",
						foreignField:"_id",
						as:"aTrip.trip.grData"
					}
				}*/

		var aGR = [];
		for (let o of aDOData) {
			aGR.push(...o.aGR);
		}
		await Trip.populate(aGR, {
			path: 'trip',
			populate: {
				path: 'trip_expenses'

			}
		});
		await BookingModel.populate(aGR, {path: 'booking'});
		aGR = JSON.parse(JSON.stringify(aGR));
		//await TripExpenseModel.populate(aGR, {path: "trip.trip_expenses"});
		let contract = {};
		if (aDOData && aDOData[0] && aDOData[0].contractByDO && aDOData[0].contractByDO[0]) {
			contract = aDOData[0].contractByDO[0];
		} else if (aDOData && aDOData[0] && aDOData[0].contractByName && aDOData[0].contractByName[0]) {
			contract = aDOData[0].contractByName[0];
		}
		let modifiedData = calculateDieselEsc(aGR, aDOData[0].aBooking);
		let resData = {
			'aData': aDOData,
			'do_number': req.body.do_number,
			'aGR': aGR,
			'aModifiedData': modifiedData,
			contract: contract,
			customerName: req.body.customerName
		};
		if (req.body.download) {
			ReportExelService.report_diesel_escalation(resData, req.clientData, req.user.clientId, function (data) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': data.url
				});
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'report download available.',
				'data': resData
			});
		}

		//send response
		//res.status(200).json({ success: "OK", "data": {owner_trips:aFleetOwnerTripDataWithExpense, totalDiesel:totalDiesel,totalTodayDiesel:totalTodayDiesel, workingDays:workingDays }});
	} catch (err) {
		next(err);
	}
}

let setRate = function (obj) {
	if (obj.rate)
		return;

	switch (obj.booking.payment_basis) {
		case 'PMT':
			obj.rate = obj.rateObj.price_per_mt;
			obj.totalWorking = obj.weight * obj.rate;
			break;

		case 'PUnit':
			obj.rate = obj.rateObj.price_per_unit;
			obj.totalWorking = obj.unit * obj.rate;
			break;

		case 'Fixed':
			obj.rate = obj.rateObj.vehicle_rate;
			obj.totalWorking = obj.rate;
			break;

		case 'Fixed per Trip/Fixed per Booking':
			obj.rate = obj.rateObj.price_per_trip;
			obj.totalWorking = obj.rate;
			break;
	}
};

function getPMTrate(obj) {
	if (obj.booking.routeData) {
		obj.rateObj = obj.booking.routeData.data.find(vObj =>
			((vObj.vehicle_type_id === obj.trip.vehicle.veh_type._id) && (vObj.booking_type === obj.booking.booking_type)));
		if (obj.rateObj) {
			obj.rateObj = obj.rateObj.rate;
			setRate(obj);
		} else {
			console.log('preferred vehicle not found');
		}
	} else
		obj.rate = obj.booking.rate;

}

function calculateDieselByKey(aExpense, type, key1, key2) {
	return aExpense.reduce(function (x, c) {
			return x + ((c.type == type) ? (key1 && key2) ? c[key1][key2] : c[key1] : 0);
		}, 0
	);
}

function aggregateByGRDate(aGR) {
	let oData = {};
	let aTempDate = [];
	for (let o of aGR) {
		if (o.grDate) {
			aTempDate.push(moment(o.grDate).format('DD-MM-YYYY'));
		}
	}
	let aGRDate = aTempDate.filter(onlyUnique).sort(-1);
	for (let d of aGRDate) {
		let aFilteredData = aGR.filter(oData => oData.grDate ? (moment(oData.grDate).format('DD-MM-YYYY') === d) : false);
		if (aFilteredData && aFilteredData.length > 0) {
			oData[d] = aFilteredData;
		}
	}
	return oData;
}

function calculateDieselEsc(aGR, aBookings) {
	let aData = [];
	let aggregatedData = aggregateByGRDate(aGR);
	for (let o in aggregatedData) {
		let oData = {
			date: o,
			no_of_trucks: aggregatedData[o].length
		};
		let total_grn_qty = 0;
		let main_actual_moisture = 0;
		let main_estimated_moisture = 0;
		let total_chalan_qty = 0;
		let total_received_qty = 0;
		let base_rate = 0;
		let total_diesel_value_ltr = 0;
		let total_diesel_value_amt = 0;
		let main_pmt_rate = 0;

		for (let oGR of aggregatedData[o]) {
			/*for(let booking of aBookings){
				if(oGR.booking.toString() === booking._id.toString()){
					oGR.booking = booking;
				}
			}
			*/
			getPMTrate(oGR);
			let grn_qty = Math.min((oGR.l_net_w || 0), (oGR.ul_net_w || 0));
			let chalan_qty = (oGR.l_net_w || 0);
			let received_qty = (oGR.ul_net_w || 0);
			let actual_moisture = oGR.actual_moisture || 0;
			let estimated_moisture = oGR.estimated_moisture || 0;
			let normalized_qty = (grn_qty * (100 - actual_moisture)) / (100 - estimated_moisture);
			let diesel_base_rate = (oGR.booking && oGR.booking.contract_id && oGR.booking.contract_id.diesel_base_price) ? oGR.booking.contract_id.diesel_base_price : 0;
			let aExpense = (oGR && oGR.trip && oGR.trip.trip_expenses) ? oGR.trip.trip_expenses : [];
			let total_diesel_ltr = calculateDieselByKey(aExpense, 'Diesel', 'diesel_info', 'litre');
			let total_diesel_amt = calculateDieselByKey(aExpense, 'Diesel', 'amount');
			let increased_rate = Number.isFinite(total_diesel_amt / total_diesel_ltr) ? total_diesel_amt / total_diesel_ltr : 0;
			let percent_inc_in_diesel_rate = Number.isFinite(((increased_rate - diesel_base_rate) * 100) / diesel_base_rate) ? ((increased_rate - diesel_base_rate) * 100) / diesel_base_rate : 0;
			let pmtRate = oGR.rate;
			let formula = Number.isFinite(0.37 * (percent_inc_in_diesel_rate / 100) * pmtRate) ? 0.37 * (percent_inc_in_diesel_rate / 100) * pmtRate : 0;
			let esc_amount = Number.isFinite(formula * normalized_qty) ? formula * normalized_qty : 0;

			//modify
			total_chalan_qty = total_chalan_qty + chalan_qty;
			total_received_qty = total_received_qty + received_qty;
			total_grn_qty = total_grn_qty + grn_qty;
			main_actual_moisture = actual_moisture;
			main_estimated_moisture = estimated_moisture;
			base_rate = diesel_base_rate;
			total_diesel_value_ltr = total_diesel_value_ltr + total_diesel_ltr;
			total_diesel_value_amt = total_diesel_value_amt + total_diesel_amt;
			main_pmt_rate = pmtRate;

			/*oGR.dieselEsc = {
				grn_qty:grn_qty,
				actual_moisture:actual_moisture,
				estimated_moisture:estimated_moisture,
				normalized_qty:normalized_qty,
				diesel_base_rate:diesel_base_rate,
				total_diesel_ltr:total_diesel_ltr,
				total_diesel_amt:total_diesel_amt,
				increased_rate:increased_rate,
				percent_inc_in_diesel_rate:percent_inc_in_diesel_rate,
				pmtRate:pmtRate,
				formula:formula,
				esc_amount:esc_amount
			}*/
		}
		aData.push({
			date: oData.date,
			no_of_trucks: oData.no_of_trucks,
			total_grn_qty: total_grn_qty,
			main_actual_moisture: main_actual_moisture,
			main_estimated_moisture: main_estimated_moisture,
			total_chalan_qty: total_chalan_qty,
			total_received_qty: total_received_qty,
			base_rate: base_rate,
			total_diesel_value_ltr: total_diesel_value_ltr,
			total_diesel_value_amt: total_diesel_value_amt,
			main_pmt_rate: main_pmt_rate
		});
	}
	return aData;
}

async function grReceive(req, res, next) {
	try {

		GR.findById(req.params._id, function (err, gr) {
			if (err) {
				console.log(err);
				res.status(400).json({
					status: "Error",
					message: 'No Gr Found',
					error: err
				});
			} else {
				let pod = req.body.pod;
				pod.received = true;
				pod.systemDate = new Date();
				pod.user = req.user._id;

				GR.findByIdAndUpdate(req.params._id, {
					$set: {
						pod,
						status: 'GR Received'
					},
					$push: {
						statuses: {
							status: 'GR Received',
							date: new Date(),
							systemDate: new Date(),
							user_id: req.user._id,
							user_full_name: req.user.full_name,
						}
					}
				}, {new: true}, function (err, updatedGr) {
					if (err) {
						res.status(400).json({
							status: "Error",
							message: 'Error on Gr updation',
							error: err
						});
					} else
						res.status(200).json({
							status: "OK",
							message: 'Gr Updated Successfully',
							data: updatedGr
						});
				});
			}
		});

	} catch (err) {
		next(err);
	}
}

async function grsforcovernote(req, res) {
	try {
		if (!req.body.lmsId) {
			return res.status(500).json({
				status: "ERROR",
				message: 'Please provide `lmsId`!'
			});
		}
		let from = new Date(req.body.from), to = new Date(req.body.to);
		if (!from || !to || dateUtil.getDateDifferece(from, to, 'day') > 200) {
			return res.status(500).json({
				status: "ERROR",
				message: 'Please provide `from` & `to` with upto 10 days difference!'
			});
		}

		let trips = await Trip.find({
			clientId: req.body.lmsId,
			vendor_query: {lmsId: req.user.clientId},
			refGr: {$exists: false},
			created_at: {
				$lt: to,
				$gte: from
			}
		}).populate('gr');
		let grs = [];
		for (let trip of trips) {
			if (trip.vendor) {
				grs.push(trip.gr);
			}
		}
		return res.status(200).json({
			status: "OK",
			message: 'Data sent!',
			data: grs
		});
	} catch (err) {
		return res.status(500).json({
			status: "ERROR",
			message: err.toString()
		});
	}
}

async function convertgrstocovernote(req, res) {
	return res.status(500).json({
		status: "ERROR",
		message: 'This feature is blocked as all parties are registered as for their company data(FCM, RCM,FRT)!'
	});
	try {
		if (!req.body.grs || req.body.grs.length < 1) {
			return res.status(500).json({
				status: "ERROR",
				message: 'Please provide `GRs`!'
			});
		}
		let grs = await GR.find({
			_id: {$in: req.body.grs}
		});
		let matchedGR = grs.length, insertedTrip = 0, insertedGr = 0, createdGRs = [];
		let tripWiseGr = {};
		for (let gr of grs) {
			if (!gr.trip.vendor || !gr.trip.vendor.lmsId || gr.trip.vendor.lmsId !== req.user.clientId) {
				return res.status(500).json({
					status: "ERROR",
					message: `You can't create covernote of 'GR: ${gr.grNumber}'`
				});
			}
			if (gr.refGr) {
				return res.status(500).json({
					status: "ERROR",
					message: `Already created covernote of 'GR: ${gr.grNumber}'`
				});
			}
			tripWiseGr[gr.trip._id] ?
				(tripWiseGr[gr.trip._id].push(gr)) : (tripWiseGr[gr.trip._id] = [gr]);
		}
		let aGR_id = [];
		for (let trip in tripWiseGr) {
			let grs = tripWiseGr[trip];
			let oTrip = grs[0].trip;
			/*********** reset/remove trip data ************/
			oTrip.settled = false;
			oTrip.advanceApprove = [];
			oTrip.advanceBudget = [];
			oTrip.trip_expenses = [];
			oTrip.askPayment = [];
			delete oTrip.vendor;
			delete oTrip._id;
			/*****************************************/
			const newTrip = new Trip(oTrip);
			let savedTrip = await newTrip.save();
			for (let oGr of grs) {
				/*********** reset/remove trip data ************/
				oGr.clientId = req.user.clientId;
				oGr.coverNote = {
					isCovernote: true,
					actualGrNumber: oGr.grNumber,
					actualGrDate: oGr.grDate
				};
				oGr.refGr = oGr._id;
				oGr.trip = savedTrip._id;
				oGr.grNumber = 'C00' + oGr.grNumber;
				oGr.provisionalBills = [];
				oGr.bills = [];
				oGr.advance = [];
				delete oGr.provisionalBill;
				delete oGr.bill;
				delete oGr._id;
				/***********************************************/
				const newGR = new GR(oGr);
				let savedGR = await newGR.save();
				await GR.update({_id: oGr.refGr}, {
					$set: {
						refGr: savedGR._id,
						last_modified_at: new Date(),
					},
				});
				aGR_id.push(savedGR._id);
				createdGRs.push(savedGR);
				insertedGr++;
			}
			await savedTrip.set({gr: aGR_id, trip_expenses: []}).save();
			insertedTrip++;
		}
		return res.status(200).json({
			status: "OK",
			message: 'Conversion Successful!',
			data: {
				matchedGR: matchedGR,
				insertedTrip: insertedTrip,
				insertedGr: insertedGr,
				createdGRs: createdGRs
			}
		});
	} catch (err) {
		return res.status(500).json({
			status: "ERROR",
			message: err.toString()
		});
	}
}

async function covernotesforgr(req, res, next) {
	try {
		if (!req.body.lmsId) {
			return res.status(500).json({
				status: "ERROR",
				message: 'Please provide `lmsId`!'
			});
		}
		let from = new Date(req.body.from), to = new Date(req.body.to);
		if (!from || !to || dateUtil.getDateDifferece(from, to, 'day') > 200) {
			return res.status(500).json({
				status: "ERROR",
				message: 'Please provide `from` & `to` with upto 10 days difference!'
			});
		}
		let projection = {
			status: 1,
			grNumber: 1,
			grDate: 1,
			'statuses.date': 1,
			'statuses.status': 1,
			'statuses.remark': 1,
			'statuses.user_full_name': 1,
			'trip.trip_no': 1,
			'trip.vehicle_no': 1,
			'trip._id': 1,
			'trip.ownershipType': 1,
			invoices: 1,
			'customer.name': 1,
			'customer._id': 1,
			'customer.clientId': 1,
			'customer.configs': 1,
			'consignor.name': 1,
			'consignor._id': 1,
			'consignee.name': 1,
			'consignee._id': 1,
			'billingParty.name': 1,
			'billingParty._id': 1,
			'billingParty.clientId': 1,
			'billingParty.config.GR': 1,
			'route.name': 1,
			'route.source.c': 1,
			'route.destination.c': 1,
			'route.route_distance': 1,
			acknowledge: 1,
			payment_basis: 1,
			payment_type: 1,
			charges: 1,
			basicFreight: 1,
			'route._id': 1,
			totalFreight: 1,
			cGST: 1,
			sGST: 1,
			iGST: 1,
			iGST_percent: 1,
			totalAmount: 1,
			'branch.name': 1,
			'branch._id': 1,
			'trip.vendor.name': 1,
			eWayBills: 1,
			remarks: 1,
			pod: 1,
			vehicle2: 1,
			gr_type: 1,
			coverNote: 1,
			isGrBillable: 1,
			fpaBill: 1,
			totalCharges: 1,
			standardTime: 1,
			chargeableTime: 1,
			loadingDetentionRate: 1,
			unloadingDetentionRate: 1,
			total_no_of_units: 1,
			internal_rate: 1,
			pendingRemark: 1,
			expected_arrival: 1,
			bill: 1,
			documents: 1,
			diesel_index: 1,
			created_by_full_name: 1,
			created_at: 1
		};
		/*let projection = {status:1,grNumber:1,grDate:1,'customer.name':1,'customer._id':1,'customer.clientId':1,'billingParty.clientId':1,coverNote:1,
			'billingParty.name':1,'billingParty._id':1,'route.name':1,'route._id':1,totalFreight:1,cGST:1,sGST:1,iGST:1,iGST_percent:1,totalAmount:1,'branch.name':1,'branch._id':1
		};*/
		let oFilter = {
			clientId: req.user.clientId || req.body.lmsId,
			//'coverNote.isCovernote': true,
			customer: mongoose.Types.ObjectId(req.body.customer),
			refGr: {$exists: false},
			grDate: {
				$lt: to,
				$gte: from
			}
		};
		let grAggQ = [
			// FILTER
			{$match: oFilter},
			{$sort: {_id: -1}},
			//$skip: ((req.body.no_of_docs * req.body.skip) - req.body.no_of_docs)},
			{$limit: req.body.no_of_docs || 2000},
			{$lookup: {from: 'tripv2', localField: 'trip', foreignField: '_id', as: 'trip'}},
			{$unwind: {path: '$trip', preserveNullAndEmptyArrays: true}},
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
			},
			{$match: {'customer.clientId': req.body.lmsId}},
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
			},
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
			},
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
			},
			{$match: {'billingParty.clientId': req.body.lmsId}},
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
				$project: projection
			}
		];
		let grs = await GR.aggregate(grAggQ);
		return res.status(200).json({
			status: "OK",
			message: 'Data sent!',
			data: grs
		});
	} catch (err) {
		return res.status(500).json({
			status: "ERROR",
			message: err.toString()
		});
	}
}

async function convertcovernotestogr(req, res) {
	return res.status(500).json({
		status: "ERROR",
		message: 'This feature is blocked as all parties are registered as for their company data(FCM, RCM,FRT)!'
	});
	try {
		if (!req.body.lmsId) {
			return res.status(500).json({
				status: "ERROR",
				message: 'Please provide `lmsid`!'
			});
		}
		if (!req.body.grs || req.body.grs.length < 1) {
			return res.status(500).json({
				status: "ERROR",
				message: 'Please provide `GRs`!'
			});
		}
		let grs = await GR.find({
			_id: {$in: req.body.grs}, clientId: req.body.lmsId
		});
		let matchedGR = grs.length, insertedTrip = 0, insertedGr = 0, createdGRs = [];
		let tripWiseGr = {};
		for (let gr of grs) {
			if (!gr.coverNote || (gr.customer.clientId !== req.user.clientId)) {
				return res.status(500).json({
					status: "ERROR",
					message: `You can't create GR of 'CoverNote: ${gr.grNumber}(${gr.coverNote && gr.coverNote.actualGrNumber})'`
				});
			}
			if (gr.refGr) {
				return res.status(500).json({
					status: "ERROR",
					message: `Already created GR of 'CoverNote: ${gr.grNumber}()'`
				});
			}
			tripWiseGr[gr.trip._id] ?
				(tripWiseGr[gr.trip._id].push(gr)) : (tripWiseGr[gr.trip._id] = [gr]);
		}
		let aGR_id = [];
		for (let trip in tripWiseGr) {
			let grs = tripWiseGr[trip];
			let oTrip = JSON.parse(JSON.stringify(grs[0].trip));
			/*********** reset/remove trip data ************/
			oTrip.settled = false;
			oTrip.clientId = req.user.clientId;
			oTrip.advanceApprove = [];
			oTrip.advanceBudget = [];
			oTrip.trip_expenses = [];
			oTrip.askPayment = [];
			//delete oTrip.vendor;
			delete oTrip._id;
			oTrip._id = undefined;
			/*****************************************/
			const newTrip = new Trip(oTrip);
			let savedTrip = await newTrip.save();
			for (let oGr of grs) {
				/*********** reset/remove trip data ************/
				let onGr = JSON.parse(JSON.stringify(oGr));
				onGr.clientId = req.user.clientId;
				onGr.refGr = oGr._id;
				onGr.trip = savedTrip._id;
				onGr.grNumber = oGr.coverNote && oGr.coverNote.actualGrNumber;
				onGr.grDate = oGr.coverNote && oGr.coverNote.actualGrDate;
				onGr.provisionalBills = [];
				onGr.bills = [];
				onGr.advance = [];
				delete onGr.coverNote;
				delete onGr.provisionalBill;
				delete onGr.bill;
				delete onGr._id;
				onGr._id = undefined;
				onGr.coverNote = undefined;
				/***********************************************/
				const newGR = new GR(onGr);
				let savedGR = await newGR.save();
				await GR.update({_id: onGr.refGr}, {
					$set: {
						refGr: savedGR._id,
						last_modified_at: new Date(),
					}
				});
				aGR_id.push(savedGR._id);
				createdGRs.push(savedGR);
				insertedGr++;
			}
			await savedTrip.set({gr: aGR_id}).save();
			insertedTrip++;
		}
		return res.status(200).json({
			status: "OK",
			message: 'Conversion Successful!',
			data: {
				matchedGR: matchedGR,
				insertedTrip: insertedTrip,
				insertedGr: insertedGr,
				createdGRs: createdGRs
			}
		});
	} catch (err) {
		return res.status(500).json({
			status: "ERROR",
			message: err.toString()
		});
	}
}

function constructFiltersNew(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ['status', 'grNumber', 'from', 'to', 'branch', 'trip_no', 'vehicle_no', 'customer', 'consignor', 'consignee', 'billingParty._id', 'vehicle', 'clientId', 'tripCancelled', 'segment_type', 'ownershipType', 'bill', 'provisionalBill', 'isNonBillable', 'invoices.ref2', 'invoices.invoiceNo','pod.received',  'acknowledge.status', 'invoices.loadRefNumber', 'billedGr', 'unBilledGr'])) {
			if (i == 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				if (constant.grItemStatus.indexOf(oQuery.dateType) >= 0) {
					oFilter['statuses'] = oFilter['statuses'] || {};
					oFilter['statuses']['$elemMatch'] = oFilter['statuses']['$elemMatch'] || {};
					oFilter['statuses']['$elemMatch']["systemDate"] = oFilter['statuses']['$elemMatch']["systemDate"] || {};
					oFilter['statuses']['$elemMatch']["systemDate"]['$gte'] = startDate;
				} else if (oQuery.dateType === 'billDate') {
					oFilter['bill_query'] = oFilter[`bill_query`] || {};
					oFilter['bill_query']['billDate'] = oFilter['bill_query']['billDate'] || {};
					oFilter['bill_query']['billDate']['$gte'] = startDate;
				}else if (oQuery.dateType === 'ewbDate') {
					oFilter['eWayBills.expiry'] = oFilter['eWayBills.expiry'] || {};
					oFilter['eWayBills.expiry'].$gte = startDate;
				} else {
					oFilter[oQuery.dateType || 'created_at'] = oFilter[oQuery.dateType || 'created_at'] || {};
					oFilter[oQuery.dateType || 'created_at'].$gte = startDate;
				}
			} else if (i == 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				if (constant.grItemStatus.indexOf(oQuery.dateType) >= 0) {
					oFilter['statuses'] = oFilter['statuses'] || {};
					oFilter['statuses']['$elemMatch'] = oFilter['statuses']['$elemMatch'] || {};
					oFilter['statuses']['$elemMatch']["systemDate"] = oFilter['statuses']['$elemMatch']["systemDate"] || {};
					oFilter['statuses']['$elemMatch']["systemDate"]['$lte'] = endDate;
				} else if (oQuery.dateType === 'billDate') {
					oFilter['bill_query'] = oFilter[`bill_query`] || {};
					oFilter['bill_query']['billDate'] = oFilter['bill_query']['billDate'] || {};
					oFilter['bill_query']['billDate']['$lte'] = endDate;
				} else if (oQuery.dateType === 'ewbDate') {
					oFilter['eWayBills.expiry'] = oFilter['eWayBills.expiry'] || {};
					oFilter['eWayBills.expiry'].$lte = endDate;
				}else {
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
			} else if (i === 'branch') {
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['branch'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			} else if (i === 'customer') {
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['customer'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			} else if (i === 'vehicles') {
				if (Array.isArray(oQuery[i]) && oQuery[i].length > 0) {
					(oFilter.trip_query && (oFilter.trip_query.vehicle = {
						$in: otherUtil.arrString2ObjectId(oQuery[i])
					})) || (oFilter.trip_query = {
						vehicle: {
							$in: otherUtil.arrString2ObjectId(oQuery[i])
						}
					});
				}
			} else if (i === 'vehicle') {
				oFilter[i] = mongoose.Types.ObjectId(oQuery[i]);
			} else if (i === 'provisionalBill') {
				if (typeof oQuery[i] === 'object') {
					if (oQuery[i].$exists)
						oFilter['provisionalBill.0'] = {$exists: true};
					else
						oFilter['provisionalBill.0'] = {$exists: false};
				} else
					oFilter[i] = oQuery[i];
			} else if (i === 'billedGr') {
				oFilter['$or'] = oFilter['$or'] || [];
				oFilter['$or'].push({
					'bill': {$exists: true}
				}, {
					'provisionalBill.0': {$exists: true}
				}, {
					'supplementaryBillRef.0': {$exists: true}
				});
			} else if (i === 'unBilledGr') {
				oFilter['$and'] = oFilter['$and'] || [];
				oFilter['$and'].push({
					'bill': {$exists: false}
				}, {
					'provisionalBill.0': {$exists: false}
				}, {
					'supplementaryBillRef.0': {$exists: false}
				});
				oFilter['isNonBillable'] = {$not: {$eq: true}};
				oFilter['tripCancelled'] = {$not: {$eq: true}};
				oFilter['payment_type'] = {$not: {$eq: "FOC"}};
			} else if (i === 'consignor' || i === 'consignee') {
				oFilter[i] = otherUtil.arrString2ObjectId(oQuery[i])
			} else if (i === 'billingParty._id') {
				oFilter['billingParty'] = otherUtil.arrString2ObjectId(oQuery[i])
			} else if (i === 'vehicle_no' || i === 'segment_type' || i === 'ownershipType' ||i === 'status') {
				oFilter[`trip.${i}`] = oQuery[i];
			} else if (i === 'trip_no') {
				oFilter[`trip.${i}`] = (+oQuery[i]);
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

// this filter fetch all the grs whose bill was not generated in system for a given date.
// if we select some past date then it show all unbilled gr on that day by ignoring bill generated after that day.
function constructBillFilters(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ['asOnDate'])) {
			if (i == 'asOnDate') {
				let endDate = moment(oQuery[i]).endOf('day').toDate();

				oFilter['$or'] = oFilter['$or'] || [];
				oFilter['$or'].push({
					"$and": [{
						'bill': {$exists: false}
					}, {
						'provisionalBill.0': {$exists: false}
					}, {
						'supplementaryBillRef.0': {$exists: false}
					}, {
						'isNonBillable': {$not: {$eq: true}}
					}]
				}, {
					'bill.billDate': {$gt: endDate}
				}, {
					'provisionalBill.ref.billDate': {$gt: endDate}
				}, {
					'supplementaryBillRef.billDate': {$gt: endDate}
				});
			}
		}
	}
	// oFilter.$or.push({bill: {$exists: true}, 'bill.billDate': oFilter.billDate});
	// oFilter.$or.push({'provisionalBill.ref.0': {$exists: true}, 'provisionalBill.ref.billDate': oFilter.billDate});
	// // oFilter.$or.push();
	return oFilter;
}

async function reportDownload(req, res) {
	try {

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

		req.body.trip_query = req.body.trip_query || {};
		req.body.vehicle_query = req.body.vehicle_query || {};
		req.body.tripCancelled = req.body.trip_query.status==='Trip cancelled'? true: false;
		let companyFilter = {};
		const grFilter = constructFiltersNew(req.body);
		if (req.body['billingParty.clientId']) {
			companyFilter = {'billingParty.clientId': req.body['billingParty.clientId']};
		}
		let custFilter = {};
		if (req.body['customer.category']) {
			custFilter = {'customer.category': {$in: req.body['customer.category']}};
		}
		let grLevel2Filters = {};
		if (grFilter['GR Assigned status.date']) {
			grLevel2Filters['GR Assigned status.date'] = grFilter['GR Assigned status.date'];
			delete grFilter['GR Assigned status.date'];
		}
		if (grFilter['Loading Ended status.date']) {
			grLevel2Filters['Loading Ended status.date'] = grFilter['Loading Ended status.date'];
			delete grFilter['Loading Ended status.date'];
		}
		if (grFilter['Vehicle Arrived for unloading status.date']) {
			grLevel2Filters['Vehicle Arrived for unloading status.date'] = grFilter['Vehicle Arrived for unloading status.date'];
			delete grFilter['Vehicle Arrived for unloading status.date'];
		}
		const tripFilter = constructFiltersNew(req.body.trip_query);
		let vehFilter = {};
		if (req.body.trip_query && req.body.trip_query.vendor) {
			tripFilter['trip.vendor'] = otherUtil.arrString2ObjectId(req.body.trip_query.vendor);
		}
		if (req.body.vehicle_query) {
			if (req.body.vehicle_query.veh_group_name)
				vehFilter['vehicle.veh_group_name'] = req.body.vehicle_query.veh_group_name;
			if (req.body.vehicle_query.vendor_id)
				vehFilter['vehicle.vendor_id'] = otherUtil.arrString2ObjectId(req.body.vehicle_query.vendor_id);
		}
		//const tripStatusFilter= tripFilter && tripFilter.status ? {"trip.status":tripFilter.status}:{};
		let bill_query = {};
		if (req.body.billQuery) {
			bill_query = constructBillFilters(req.body);
			delete bill_query.billDate;
		}
		// if (tripFilter.vendor) {
		// 	delete tripFilter.vendor;
		// }

		let prjGr = {
			_id: 1,
			status: 1,
			statuses: 1,
			grNumber: 1,
			grDate: 1,
			invoices: 1,
			acknowledge: 1,
			payment_basis: 1,
			payment_type: 1,
			charges: 1,
			basicFreight: 1,
			totalFreight: 1,
			cGST: 1,
			sGST: 1,
			iGST: 1,
			iGST_percent:1,
			totalAmount: 1,
			internal_rate: 1,
			pod: 1,
			eWayBills: 1,
			remarks: 1,
			"fpa.refNo": 1,
			billingParty: 1,
			customer: 1,
			consignor: 1,
			consignee: 1,
			branch: 1,
			trip: 1,
			route: 1,
			vehicle: 1,
			bill: 1,
			provisionalBill: 1,
			supplementaryBillRef: 1,
			supplementaryBill: 1,
			moneyReceipt: 1,
			isNonBillable: 1,
			gateoutDate:1
		};
		// if (req.body.mrReport){HR55T1234
		// 	grFilter['moneyReceipt.totalMrAmount'] = { $ne: 0, $exists: true} ;
		// }
		let aggrPipe = [
			{$match: grFilter},
			{$sort: {grNumber:1}},
			{$project: prjGr},
			/*
			{
				$addFields: {
					'GR Assigned status': {
						$arrayElemAt: [{
							$filter: {
								input: '$statuses',
								as: 'item',
								cond: {$eq: ['$$item.status', 'GR Assigned']}
							}
						}, 0]
					},
					'Loading Ended status': {
						$arrayElemAt: [{
							$filter: {
								input: '$statuses',
								as: 'item',
								cond: {$eq: ['$$item.status', 'Loading Ended']}
							}
						}, 0]
					},
					'Vehicle Arrived for unloading status': {
						$arrayElemAt: [{
							$filter: {
								input: '$statuses',
								as: 'item',
								cond: {$eq: ['$$item.status', 'Vehicle Arrived for unloading']}
							}
						}, 0]
					},
				}
			},
			{$match: grLevel2Filters}
		*/
		];


		if (req.body.grDocType && req.body.grDocType.length > 0) {
			let aGrDt = req.body.grDocType;
			aggrPipe.push(
				{
					"$addFields": {"grStrId": {"$toString": "$_id"}},
				},
				{
					"$lookup": {
						"from": "datamanagements",
						"localField": "grStrId",
						"foreignField": "linkToId",
						"as": "datamanagements"
					}
				},
				{
					"$match": {
						"datamanagements.files.category": {$nin: aGrDt}
					}
				}
			);
		}

		aggrPipe.push(
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
			});
		let prjBill = {...prjGr};
		//project trip
		delete prjBill.bill;
		prjBill['bill.billNo'] = 1;
		prjBill['bill.billDate'] = 1;
		aggrPipe.push(
			{$project: prjBill},
			{
				$lookup: {
					from: "bills",
					localField: "provisionalBill.ref",
					foreignField: "_id",
					as: "provisionalBill.ref"
				}
			},
			{
				$lookup: {
					from: "bills",
					localField: "supplementaryBillRef",
					foreignField: "_id",
					as: "supplementaryBillRef"
				}
			},
			{$match: bill_query});
		let prjProBill = {...prjBill};
		// project provisionalBill
		delete prjProBill.provisionalBill.ref;

		aggrPipe.push(
			{$project: prjProBill},
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
			}, {$match: companyFilter});
		let prjBP = {...prjProBill};
		//project billing party
		delete prjBP.billingParty;
		prjBP['billingParty.name'] = 1;
		prjBP['billingParty.clientId'] = 1;

		aggrPipe.push(
			{$project: prjBP},
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
			},
			{$match: custFilter});
		let prjCUST = {...prjBP};
		//project customers
		delete prjCUST.customer;
		prjCUST['customer.name'] = 1;
		prjCUST['customer.category'] = 1;
		aggrPipe.push(
			{$project: prjCUST},
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
		let prjCNG = {...prjCUST};
		//project consignor
		delete prjCNG.consignor;
		prjCNG['consignor.name'] = 1;
		aggrPipe.push(
			{$project: prjCNG},
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

		let prjCNGE = {...prjCNG};
		//project consignee
		delete prjCNGE.consignee;
		prjCNGE['consignee.name'] = 1;
		aggrPipe.push(
			{$project: prjCNGE},
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
		let prjBr = {...prjCNGE};
		//project consignee
		delete prjBr.branch;
		prjBr['branch.name'] = 1;

		aggrPipe.push(
			{$project: prjBr},
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
			});
		let prjRoute = {...prjBr};
		//project consignee
		delete prjRoute.route;
		prjRoute['route.name'] = 1;

		aggrPipe.push(
			{$project: prjRoute},
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
			{$match: tripFilter}
		);

		if (req.body.vendPaymStatus) {
			aggrPipe.push(
				{
					$lookup: {
						from: 'tripadvances',
						localField: 'trip.advanceBudget',
						foreignField: '_id',
						as: 'trip.advanceBudget'
					}
				},
				{
					"$addFields": {
						"totalVM": {
							"$add":
								["$trip.vendorDeal.totWithMunshiyana", "$trip.vendorDeal.totalCharges"]
						},
					}
				},

				{
					"$addFields": {
						"vendorAdvancePaid": {
							"$reduce": {
								input: "$trip.advanceBudget",
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
							"$add": ["$vendorAdvancePaid", "$trip.vendorDeal.tdsAmount", "$trip.vendorDeal.totalDeduction"]
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
				aggrPipe.push({$match: {"totRemAmt": 0, "totalVM": {$gt: 0}}});
			} else if (req.body.vendPaymStatus == 'Unpaid') {
				aggrPipe.push({
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
				aggrPipe.push({$match: {"totRemAmt": {$gt: 0}}});
			} else if (req.body.vendPaymStatus == 'Over Paid') {
				aggrPipe.push({$match: {"totRemAmt": {$lt: 0}}});
			}
		}


		let prjTr = {...prjBr};
		//project trip
		delete prjTr.trip;
		prjTr['trip.trip_no'] = 1;
		prjTr['trip.vehicle_no'] = 1;
		prjTr['trip.ownershipType'] = 1;
		prjTr['trip.segment_type'] = 1;
		prjTr['trip.vendorDeal'] = 1;
		prjTr['trip.end_date'] = 1;
		prjTr['trip.status'] = 1;
		prjTr['trip.statuses'] = 1;
		prjTr['trip.start_date'] = 1;
		prjTr['trip.imd'] = 1;
		aggrPipe.push(
			{$project: prjTr},
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
			{$match: vehFilter});

		let prjVeh = {...prjTr};
		//project trip
		delete prjVeh.vehicle;
		prjVeh['vehicle.model'] = 1;
		prjVeh['vehicle.owner_name'] = 1;
		prjVeh['vehicle.owner_group'] = 1;
		prjVeh['vehicle.last_known'] = 1;
		prjVeh['vehicle.gpsData'] = 1;

		aggrPipe.push(
			{$project: prjVeh},
			{$sort:{'trip.trip_no':1}},
			{$limit: 120000});//TODO use limit dynamically
		if (req.body.downloadCSV) {

			let downloadPath = await new csvDownload(GR, aggrPipe, {
				filePath: `${req.user.clientId}/Trip_GR`,
				fileName: `Trip_GR_${moment().format('DD-MM-YYYY_hh:mm')}`
			}).exec(grCSV.transform, req);

			if (hasTimeoutExecuted) {
				await logsService.addLog('GR Report', {
					uif: "Trip_GR_CSv" + moment().format('DD-MM-YYYY hh:mm'),
					docId: req.user._id,
					category: 'Notification',
					delta: [],
					dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
					userId: req.user._id,
					subCategory: 'Trip Gr CSV Report'
				}, req);
			} else {
				clearTimeout(timer);
				return res.status(200).json({
					status: "SUCCESS",
					message: 'Trip Gr Report',
					url: downloadPath
				});
			}

		} else { // else start

			/*
			server side pagination only if no sub collection filters are provided.
			 */
			//TODO cursor has implication with mongoose version
			let grDataCusor = GR.aggregate(aggrPipe).cursor({batchSize: 3000}) //tripgrs
			grDataCusor.options = {allowDiskUse: true, batchSize: 3000};
			let tStartTime = new Date().getTime();
			grDataCusor.exec(async function (err, grData) {
				if (err) {
					return res.status(500).json({
						status: "ERROR",
						message: err.toString()
					});
				}
				let configs;
				if (req.body.customer) {
					configs = await SchemaConfiguration.findOne({
						clientId: req.user.clientId,
						customer: mongoose.Types.ObjectId(req.body.customer),
						model: 'GR'
					}, {configs: 1}).lean();
					configs = configs && configs.configs;
				}

				req.tableAcc = [];
				if (req.body.tableId) {
					let tableAcc = await tableAccessService.findTableAccessFilterAsync(req.body.tableId);
					if (tableAcc && tableAcc.length > 0) {
						req.tableAcc = tableAcc[0].access;
					}
				}

				if (req.body.mrReport) {
					ReportExelService.mrReport(grData, req, success);

					async function success(d) {
						if (hasTimeoutExecuted) {
							configs = await logsService.addLog('GR Report', {
								uif: "Trip_GR_MR" + moment().format('DD-MM-YYYY hh:mm'),
								docId: req.user._id,
								category: 'Notification',
								delta: [],
								dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
								userId: req.user._id,
								subCategory: 'Trip GrMr Report'
							}, req);
						} else {
							clearTimeout(timer);
							return res.status(200).json({
								status: "SUCCESS",
								message: 'MRs report',
								url: d.url
							});
						}
					}

				} else {
					if (req.body.clientId === '10706') {
						ReportExelService.grMMTReport(grData, req, configs, function (d) {
							let tDiff = new Date().getTime() - tStartTime;
							tDiff = tDiff / 60000; //min
							console.log('time take in MIN ', tDiff);
							return res.status(200).json({
								status: "SUCCESS",
								message: 'GRs report',
								url: d.url
							});
						});
					} else {
						ReportExelService.grReport(grData, req, configs, success);

						let tDiff = new Date().getTime() - tStartTime;
						tDiff = tDiff / 60000; //min
						console.log('time take in MIN ', tDiff);

						async function success(d) {
							if (hasTimeoutExecuted) {
								configs = await logsService.addLog('GR Report', {
									uif: "Trip_GR_" + moment().format('DD-MM-YYYY hh:mm'),
									docId: req.user._id,
									category: 'Notification',
									delta: [],
									dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
									userId: req.user._id,
									subCategory: 'Trip Gr Report'
								}, req);
							} else {
								clearTimeout(timer);
								return res.status(200).json({
									status: "SUCCESS",
									message: 'GRs report',
									url: d.url
								});
							}
						}

					}
				}
			});
			/*
			TODO server side pagination
			implement count query also.
			if((tripFilter && Object.keys(tripFilter).length>0) || (companyFilter && Object.keys(companyFilter).length>0)) {
				grData = await GR.aggregate(aggrPipe).allowDiskUse(true);
			}else{
				//req.body.aggQuery = aggrPipe;
				let reqQuery = {aggQuery:aggrPipe};
				reqQuery.no_of_docs = 299;
				let aggrData = await serverSidePagination.paginationServer(GR, reqQuery);
				grData = aggrData.data;
			}*/
		}// else end
	} catch (e) {
		return res.status(500).json({
			status: "ERROR",
			message: e.toString(),
		});
	}
}

async function reportDownloadV2(req, res) {
	try {
		let hasTimeoutExecuted = false;
		let timer = setTimeout(() => {
			hasTimeoutExecuted = true;
			if (!res.headersSent) {
				return res.status(200).json({
					status: 'SUCCESS',
					message: 'Report is taking time. Please wait, you will receive notification.',
				});
			}
		}, 1000 * 60);
		req.body.trip_query = req.body.trip_query || {};
		req.body.vehicle_query = req.body.vehicle_query || {};
		req.body.tripCancelled = req.body.trip_query.status==='Trip cancelled'? true: false;
		let companyFilter = {};
		const grFilter = constructFiltersNew(req.body);
		if (req.body.trip_no) {
			grFilter.trip_no = req.body.trip_no;
			delete grFilter['trip.trip_no'];
		}
		if (req.body['billingParty.clientId']) {
			companyFilter = {'billingParty.clientId': req.body['billingParty.clientId']};
		}
		let custFilter = {};
		if (req.body['customer.category']) {
			custFilter = {'customer.category': {$in: req.body['customer.category']}};
		}
		let grLevel2Filters = {};
		if (grFilter['GR Assigned status.date']) {
			grLevel2Filters['GR Assigned status.date'] = grFilter['GR Assigned status.date'];
			delete grFilter['GR Assigned status.date'];
		}
		if (grFilter['Loading Ended status.date']) {
			grLevel2Filters['Loading Ended status.date'] = grFilter['Loading Ended status.date'];
			delete grFilter['Loading Ended status.date'];
		}
		if (grFilter['Vehicle Arrived for unloading status.date']) {
			grLevel2Filters['Vehicle Arrived for unloading status.date'] = grFilter['Vehicle Arrived for unloading status.date'];
			delete grFilter['Vehicle Arrived for unloading status.date'];
		}
		const tripFilter = constructFiltersNew(req.body.trip_query);
		let vehFilter = {};
		if (req.body.trip_query && req.body.trip_query.vendor) {
			tripFilter['trip.vendor'] = otherUtil.arrString2ObjectId(req.body.trip_query.vendor);
		}
		if (req.body.vehicle_query) {
			if (req.body.vehicle_query.veh_group_name)
				vehFilter['vehicle.veh_group_name'] = req.body.vehicle_query.veh_group_name;
			if (req.body.vehicle_query.vendor_id)
				vehFilter['vehicle.vendor_id'] = otherUtil.arrString2ObjectId(req.body.vehicle_query.vendor_id);
		}
		//const tripStatusFilter= tripFilter && tripFilter.status ? {"trip.status":tripFilter.status}:{};
		let bill_query = {};
		if (req.body.billQuery) {
			bill_query = constructBillFilters(req.body);
			delete bill_query.billDate;
			if(req.body.dateType){
				grFilter['bill'] = { $exists: true };
			}
		}
		// if (tripFilter.vendor) {
		// 	delete tripFilter.vendor;
		// }

		let prjGr = {
			_id: 1,
			status: 1,
			statuses: 1,
			grNumber: 1,
			grDate: 1,
			invoices: 1,
			acknowledge: 1,
			payment_basis: 1,
			payment_type: 1,
			charges: 1,
			basicFreight: 1,
			totalFreight: 1,
			cGST: 1,
			sGST: 1,
			iGST: 1,
			iGST_percent:1,
			totalAmount: 1,
			internal_rate: 1,
			pod: 1,
			eWayBills: 1,
			remarks: 1,
			"fpa.refNo": 1,
			billingParty: 1,
			customer: 1,
			consignor: 1,
			consignee: 1,
			branch: 1,
			trip: 1,
			route: 1,
			vehicle: 1,
			bill: 1,
			provisionalBill: 1,
			supplementaryBillRef: 1,
			supplementaryBill: 1,
			moneyReceipt: 1,
			isNonBillable: 1,
			gateoutDate:1,
		};
		// if (req.body.mrReport){HR55T1234
		// 	grFilter['moneyReceipt.totalMrAmount'] = { $ne: 0, $exists: true} ;
		// }

		if(grFilter.billDate){
			bill_query['bill.billDate'] = grFilter.billDate;
		}


		delete grFilter.billDate;
		let aggrPipe = [
			{$match: grFilter},
			{$sort: {grNumber:1}},
			{$project: prjGr},
			/*
			{
				$addFields: {
					'GR Assigned status': {
						$arrayElemAt: [{
							$filter: {
								input: '$statuses',
								as: 'item',
								cond: {$eq: ['$$item.status', 'GR Assigned']}
							}
						}, 0]
					},
					'Loading Ended status': {
						$arrayElemAt: [{
							$filter: {
								input: '$statuses',
								as: 'item',
								cond: {$eq: ['$$item.status', 'Loading Ended']}
							}
						}, 0]
					},
					'Vehicle Arrived for unloading status': {
						$arrayElemAt: [{
							$filter: {
								input: '$statuses',
								as: 'item',
								cond: {$eq: ['$$item.status', 'Vehicle Arrived for unloading']}
							}
						}, 0]
					},
				}
			},
			{$match: grLevel2Filters}
		*/
		];


		if (req.body.grDocType && req.body.grDocType.length > 0) {
			let aGrDt = req.body.grDocType;
			aggrPipe.push(
				{
					"$addFields": {"grStrId": {"$toString": "$_id"}},
				},
				{
					"$lookup": {
						"from": "datamanagements",
						"localField": "grStrId",
						"foreignField": "linkToId",
						"as": "datamanagements"
					}
				},
				{
					"$match": {
						"datamanagements.files.category": {$nin: aGrDt}
					}
				}
			);
		}

		aggrPipe.push(
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
			});
		let prjBill = {...prjGr};
		//project trip
		delete prjBill.bill;
		prjBill['bill.billNo'] = 1;
		prjBill['bill.billDate'] = 1;
		aggrPipe.push(
			{$project: prjBill},
			{
				$lookup: {
					from: "bills",
					localField: "provisionalBill.ref",
					foreignField: "_id",
					as: "provisionalBill.ref"
				}
			},
			{
				$lookup: {
					from: "bills",
					localField: "supplementaryBillRef",
					foreignField: "_id",
					as: "supplementaryBillRef"
				}
			},
			{$match: bill_query});
		let prjProBill = {...prjBill};
		// project provisionalBill
		delete prjProBill.provisionalBill.ref;

		aggrPipe.push(
			{$project: prjProBill},
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
			}, {$match: companyFilter});
		let prjBP = {...prjProBill};
		//project billing party
		delete prjBP.billingParty;
		prjBP['billingParty.name'] = 1;
		prjBP['billingParty.clientId'] = 1;

		aggrPipe.push(
			{$project: prjBP},
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
			},
			{$match: custFilter});
		let prjCUST = {...prjBP};
		//project customers
		delete prjCUST.customer;
		prjCUST['customer.name'] = 1;
		prjCUST['customer.category'] = 1;
		aggrPipe.push(
			{$project: prjCUST},
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
		let prjCNG = {...prjCUST};
		//project consignor
		delete prjCNG.consignor;
		prjCNG['consignor.name'] = 1;
		aggrPipe.push(
			{$project: prjCNG},
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

		let prjCNGE = {...prjCNG};
		//project consignee
		delete prjCNGE.consignee;
		prjCNGE['consignee.name'] = 1;
		aggrPipe.push(
			{$project: prjCNGE},
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
		let prjBr = {...prjCNGE};
		//project consignee
		delete prjBr.branch;
		prjBr['branch.name'] = 1;

		aggrPipe.push(
			{$project: prjBr},
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
			});
		let prjRoute = {...prjBr};
		//project consignee
		delete prjRoute.route;
		prjRoute['route.name'] = 1;
		aggrPipe.push(
			{$project: prjRoute},
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
			{$match: tripFilter},
		);

		if (req.body.vendPaymStatus) {
			aggrPipe.push(
				{
					$lookup: {
						from: 'tripadvances',
						localField: 'trip.advanceBudget',
						foreignField: '_id',
						as: 'trip.advanceBudget'
					}
				},
				{
					"$addFields": {
						"totalVM": {
							"$add":
								["$trip.vendorDeal.totWithMunshiyana", "$trip.vendorDeal.totalCharges"]
						},
					}
				},

				{
					"$addFields": {
						"vendorAdvancePaid": {
							"$reduce": {
								input: "$trip.advanceBudget",
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
							"$add": ["$vendorAdvancePaid", "$trip.vendorDeal.tdsAmount", "$trip.vendorDeal.totalDeduction"]
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
				aggrPipe.push({$match: {"totRemAmt": 0, "totalVM": {$gt: 0}}});
			} else if (req.body.vendPaymStatus == 'Unpaid') {
				aggrPipe.push({
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
				aggrPipe.push({$match: {"totRemAmt": {$gt: 0}}});
			} else if (req.body.vendPaymStatus == 'Over Paid') {
				aggrPipe.push({$match: {"totRemAmt": {$lt: 0}}});
			}
		}


		let prjTr = {...prjBr};
		//project trip
		delete prjTr.trip;
		prjTr['trip.trip_no'] = 1;
		prjTr['trip.vehicle_no'] = 1;
		prjTr['trip.ownershipType'] = 1;
		prjTr['trip.segment_type'] = 1;
		prjTr['trip.vendorDeal'] = 1;
		prjTr['trip.end_date'] = 1;
		prjTr['trip.status'] = 1;
		prjTr['trip.statuses'] = 1;
		prjTr['trip.start_date'] = 1;
		prjTr['trip.imd'] = 1;
		aggrPipe.push(
			{$project: prjTr},
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
			{$match: vehFilter});

		let prjVeh = {...prjTr};
		//project trip
		delete prjVeh.vehicle;
		prjVeh['vehicle.model'] = 1;
		prjVeh['vehicle.owner_name'] = 1;
		prjVeh['vehicle.owner_group'] = 1;
		prjVeh['vehicle.last_known'] = 1;
		prjVeh['vehicle.gpsData'] = 1;

		aggrPipe.push(
			{$project: prjVeh},
			{$sort:{'trip.trip_no':1}},
			{$limit: 120000});//TODO use limit dynamically

		let configs;
		if (req.body.customer) {
			configs = await SchemaConfiguration.findOne({
				clientId: req.user.clientId,
				customer: mongoose.Types.ObjectId(req.body.customer),
				model: 'GR'
			}, {configs: 1}).lean();
			configs = configs && configs.configs;
		}
		//billing party config start
		if (req.body.billingParty || req.body['billingParty._id']) {
			configs = await SchemaConfiguration.findOne({
				clientId: req.user.clientId,
				billingParty: mongoose.Types.ObjectId(req.body.billingParty || req.body['billingParty._id']),
				model: 'GR'
			}, {configs: 1}).lean();
			configs = configs && configs.configs;
		}
		//end

		let tableAcc = [];
		if (req.body.tableId) {
			let tableAcc = await tableAccessService.findTableAccessFilterAsync(req.body.tableId);
			if (tableAcc && tableAcc.length > 0)
				tableAcc = tableAcc[0].access;
		}

		let report;
		let option;

		if (req.body.mrReport) {
			report = new mrReport(configs, tableAcc, req);
			option = {
				collection: 'GR Report',
				uif: "Trip_GR_MR_",
				subCategory: 'Trip GrMr Report'
			};
		} else {
			report = new tripgrReport(configs, tableAcc, req);
			option = {
				collection: 'GR Report',
				uif: "Trip_GR_",
				subCategory: 'Trip Gr Report'
			}
		}

		await GR.aggregate(aggrPipe)
			.allowDiskUse(true)
			.cursor()
			.exec()
			.eachAsync(async (doc) => {
				report.addRow(doc);
			});
		let url = await report.genUrl();

		if (hasTimeoutExecuted) {
			configs = await logsService.addLog(option.collection, {
				uif: option.uif + moment().format('DD-MM-YYYY_hh:mm'),
				docId: req.user._id,
				category: 'Notification',
				delta: [],
				dwnldLnk: `<a href='${url}' download='${url}' target='_blank'>Click To Download</a>`,
				userId: req.user._id,
				subCategory: option.subCategory
			}, req);
		} else {
			clearTimeout(timer);
			return res.status(200).json({
				status: "SUCCESS",
				message: 'Report Generated Successfully',
				url: url
			});
		}

	} catch (e) {
		return res.status(500).json({
			status: "ERROR",
			message: e.toString(),
		});
	}
}

async function dailyMISreport(req, res){
	try{

		let reportFilter = constructFiltersNew(req.body);
		if(req.body.dateType === 'intransit'){
			reportFilter['pod.billingUnloadingTime'] = reportFilter.intransit;
			reportFilter['pod.unloadingArrivalTime'] = reportFilter.intransit;
		}
		delete reportFilter.intransit;

		const aggrQuery = [
			{$match: reportFilter},
			{
				$project:{
					trip_no: 1,
					vehicle_no: 1,
					"acknowledge.destination" : 1,
					"grNumber": 1,
					"invoices": 1,
					//invoices.noOfUnits
					gateoutDate:1,
					"pod.unloadingArrivalTime": 1, //Reporting Date
					"pod.billingUnloadingTime": 1, //Delivery Date
					"pod.arRemark": 1,
					vehicle: 1
				}
			},
			{
				$unwind: {
					path: "$invoices",
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$project:{
					trip_no: 1,
					vehicle_no: 1,
					"acknowledge.destination" : 1,
					"grNumber": 1,
					"invoices.noOfUnits": 1,
					//invoices.noOfUnits
					gateoutDate:1,
					"pod.unloadingArrivalTime": 1, //Reporting Date
					"pod.billingUnloadingTime": 1, //Delivery Date
					"pod.arRemark": 1,
					vehicle: 1
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
				$project:{
					trip_no: 1,
					vehicle_no: 1,
					"acknowledge.destination" : 1,
					"grNumber": 1,
					"invoices.noOfUnits": 1,
					//invoices.noOfUnits
					gateoutDate:1,
					"pod.unloadingArrivalTime": 1, //Reporting Date
					"pod.billingUnloadingTime": 1, //Delivery Date
					"pod.arRemark": 1,
					"vehicle.gpsData": 1
				}
			},
			{
				$group:{
					"_id" : {
						"grNumber" : "$grNumber"
					},
					// "grNumber": {
					//     "$first": "$grNumber"
					// },
					"vehicle_no": {
						"$first": "$vehicle_no"
					},
					"trip_no": {
						"$first": "$trip_no"
					},
					"arRemark": {
						"$first": "$pod.arRemark"
					},
					"destination": {
						"$first": "$acknowledge.destination"
					},
					"gateoutDate": {
						"$first": "$gateoutDate"
					},
					"unloadingArrivalTime": {
						"$first": "$pod.unloadingArrivalTime"
					},
					"billingUnloadingTime" : {
						"$first": "$pod.billingUnloadingTime"
					},
					"gpsData": {
						"$first": "$vehicle.gpsData"
					},
					"noOfUnits": {
						"$sum": "$invoices.noOfUnits"
					},
//             "data": {
// 				"$push": "$$ROOT"
// 			},
				}
			},
			{
				$project:{
					grNumber : "$_id.grNumber",
					trip_no: 1,
					vehicle_no: 1,
					arRemark: 1,
					"destination" : 1,
					gateoutDate:1,
					unloadingArrivalTime:1,
					billingUnloadingTime: 1,
					"gpsData.address": 1,
					"gpsData.positioning_time": 1,
					"noOfUnits": 1,
					// "pod.unloadingArrivalTime": 1, //Reporting Date
					// "pod.billingUnloadingTime": 1, //Delivery Date

				},
			},
			// {$sort: {grNumber: 1}},
			{$sort: {grNumber: 1 , trip_no: 1}},

		];
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
		let getData = await serverSidePage.requestData(GR, oQuery);

		// if (req.body.download) {
			ReportExelService.dailyMISreport(getData, req.clientData, req.user.clientId, function (data) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': data.url
				});
			});
		// } else {
		// 	return res.status(200).json({
		// 		'status': 'OK',
		// 		'message': 'report download available.',
		// 		'data': getData
		// 	});
		// }

	}catch(e){
		return res.status(500).json({
			status: "ERROR",
			message: e.toString(),
		});
	}
}

async function grUpload(req, res) {
	try {
		const excelData = new ExcelReader({
			filePath: req.file.path,
			config: {
				'GR ID': {
					keyName: '_id',
				},
				'GR NO.': {
					keyName: 'grNumber',
					ignoreIfValueIs: 'NA',
				},
				'GR DATE': {
					keyName: 'grDate',
					dateFormat: 'DD-MM-YYYY',
					ignoreIfValueIs: 'NA',
				},
				"GR TYPE": {
					keyName: 'gr_type',
					enum: ["Own", "Market", "Centralized"],
					ignoreIfValueIs: 'NA',
				},
				'LOADING DATE': {
					keyName: 'loadingEndDate',
					dateFormat: 'DD-MM-YYYY',
					ignoreIfValueIs: 'NA',
				},
				'VEHICLE NO.': {
					keyName: 'vehicle_no',
					required: true,
				},
				"INVOICE NO.": {
					// keyName: 'invoices.$[elem].invoiceNo',
					keyName: 'inv.invoiceNo',
					ignoreIfValueIs: 'NA',
					// ignoreKeyNameEvaluation: true,
				},
				"INVOICE DATE": {
					// keyName: 'invoices.$[elem].invoiceDate',
					keyName: 'inv.invoiceDate',
					// ignoreKeyNameEvaluation: true,
					ignoreIfValueIs: 'NA',
				},
				"WEIGHT PER UNIT": {
					// keyName: 'invoices.$[elem].weightPerUnit',
					keyName: 'inv.weight_per_unit',
					ignoreIfValueIs: 'NA',
					// ignoreKeyNameEvaluation: true,
				},
				"# OF UNITS": {
					// keyName: 'invoices.$[elem].noOfUnits',
					keyName: 'inv.total_no_of_units',
					ignoreIfValueIs: 'NA',
					// ignoreKeyNameEvaluation: true,
				},
				"LOAD REF. NO": {
					// keyName: 'invoices.$[elem].loadRefNumber',
					keyName: 'inv.loadRefNumber',
					ignoreIfValueIs: 'NA',
					// ignoreKeyNameEvaluation: true,
				},
				"INTERNAL RATE": {
					keyName: 'internal_rate',
					ignoreIfValueIs: 'NA',
				},
				"WEIGHT": {
					keyName: 'weight',
					ignoreIfValueIs: 'NA',
				},
				"UNIT": {
					keyName: 'unit',
					ignoreIfValueIs: 'NA',
				},
			},
		});

		let grDetails = await excelData.read();

		grDetails = grDetails.filter((g) => Object.keys(g).length > 1);

		let grBulk = grDetails.map(gr => {
			let grId = gr._id, grInv = {...gr.inv};
			delete gr.inv;
			delete gr._id;
			let upsertFil;
			if (grId) {
				upsertFil = {
					_id: grId,
				};
			} else {
				upsertFil = {
					vehicle_no: gr.vehicle_no,
					statuses: {
						$elemMatch: {
							status: 'Loading Ended',
							date: {
								$gte: moment(gr.loadingEndDate).startOf('day').toDate(),
								$lte: moment(gr.loadingEndDate).endOf('day').toDate(),
							}
						}
					}
				};
			}
			return {
				updateOne: {
					filter: upsertFil,
					update: {
						$set: gr,
						$push: {'invoices': grInv}
					},
					upsert: false,
					// multi: true,
					// arrayFilters: [ { 'elem.invoiceNo': gr['invoices.$[elem].invoiceNo'] } ],
				}
			}
		});

		const grStats = await GR.bulkWrite(grBulk);

		return res.status(200).json({
			status: "SUCCESS",
			message: `Existing GRs modified: ${grStats.nModified}`,
		});

	} catch (e) {
		console.error(e.toString());
		return res.status(500).json({
			status: "ERROR",
			message: e.toString(),
		});
	}
}

async function updateUpdateTime(aId, date = Date.now()) {
	await GR.updateMany({_id: {$in: (Array.isArray(aId) ? aId : [aId])}}, {$set: {last_modified_at: date}});
}

async function grSummaryReport(reqBody, next) {
	let oPFil = constructGrReportFilters(reqBody);
	//var oCFil = constructCustomerFilter(reqBody);
	// oPFil.cancelled = false;
	const aggrQuery = [
		{$match: oPFil},
		{$sort: {_id: -1}},
		// { $match : {"group" : {$exists : true}}},
		{
			"$project": {
				"billingParty": 1,
				"invoices": 1,
				"totalAmount": 1,
				"group": 1
			}
		},
		{
			$addFields: {
				'actualWeight': {
					$reduce: {
						input: "$invoices",
						initialValue: 0,
						in: {
							"$add": ["$$value", {"$ifNull": ["$$this.billingWeightPerUnit", 0]}]
						}
					}
				}
			}
		},
		{
			$addFields: {
				'noOfPieces': {
					$reduce: {
						input: "$invoices",
						initialValue: 0,
						in: {
							"$add": ["$$value", {"$ifNull": ["$$this.billingNoOfUnits", 0]}]
						}
					}
				}
			}
		},
		{
			$addFields: {
				'chargedWeight': {
					$reduce: {
						input: "$invoices",
						initialValue: 0,
						in: {
							"$add": ["$$value", {"$ifNull": ["$$this.billingWeightPerUnit", 0]}]
						}
					}
				}
			}
		},
		{
			"$group": {
				_id: {
					"bp": "$billingParty"
				},
				"totalAmount": {
					"$sum": "$totalAmount"
				},
				count: {"$sum": 1},
				"actualWeight": {
					"$sum": "$actualWeight"
				},
				"noOfPieces": {
					"$sum": "$noOfPieces"
				},
				"chargedWeight": {
					"$sum": "$chargedWeight"
				},
				// "gName" : { $first : "$group"},
			}
		},
		{
			"$lookup": {
				"from": "billingparties",
				"localField": "_id.bp",
				"foreignField": "_id",
				"as": "billingParty"
			}
		},
		{
			"$unwind": "$billingParty"
		},
		{
			"$group": {
				_id: {
					"groupName": "$billingParty.group"

				},
				"Data": {
					"$push": "$$ROOT"
				}
			}
		}
	];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let getData = await serverSidePage.requestData(GR, oQuery);
	return getData;
};

async function outstandingUnbilledReport(body, next) {
	try {

		body.aCustomerDetail = body.aCustomerDetail || [];

		if (body['customer.category']) {
			let oCustomer = await customerModel.find({category: {$in: body['customer.category']}});

			if (oCustomer) {
				oCustomer.forEach(obj => {
					body.aCustomerDetail.push(obj._id);
				})
			}
		}

		let asOnDate = body.asOnDate ? moment(body.asOnDate).endOf('day').toDate() : moment(body.to).endOf('day').toDate();
		let from = new Date(body.from);
		let to = new Date(body.to);
		const DAYS_180 = 180 * 24 * 60 * 60 * 1000;
		const DAYS_90 = 90 * 24 * 60 * 60 * 1000;
		const DAYS_60 = 60 * 24 * 60 * 60 * 1000;
		const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

		let oPFil = constructGrReportFilters(body);

		if (!oPFil.customer)
			oPFil.customer = {$exists: true};
		if (!oPFil.billingParty)
			oPFil.billingParty = {$exists: true};

		Object.assign(oPFil, {
			"supplementaryBillRef.0": {$exists: false},
			"provisionalBill.0": {$exists: false},
			"bill": {$exists: false},
			"grNumber": {$exists: true},
			"tripCancelled": false,
			"isNonBillable": {
				"$not": {
					"$eq": true
				}
			}
		});

		const aggrQuery = [
			{"$match": oPFil},
			{
				$project: {
					clientId: 1,
					grDate: 1,
					grNumber: 1,
					branch: 1,
					customer: 1,
					billingParty: 1,
					totalFreight: 1,
					"diffDays": {
						"$subtract": [
							asOnDate,
							"$grDate"
						]
					},
				}
			},
			{
				"$addFields": {
					"0_due": {
						"$cond": [
							{$and: [{"$gte": ["$diffDays", 0],}, {"$lt": ["$diffDays", DAYS_30]}]},
							true,
							false
						]
					},
					"30_due": {
						"$cond": [{$and: [{"$gte": ["$diffDays", DAYS_30],}, {"$lt": ["$diffDays", DAYS_60]}]},
							true,
							false
						]
					},
					"60_due": {
						"$cond": [{"$and": [{"$gte": ["$diffDays", DAYS_60]}, {"$lt": ["$diffDays", DAYS_90]}]},
							true,
							false
						]
					},
					"90_due": {
						"$cond": [{"$and": [{"$gte": ["$diffDays", DAYS_90]}, {"$lt": ["$diffDays", DAYS_180]}]},
							true,
							false
						]
					},
					"180_due": {"$gte": ["$diffDays", DAYS_180]},
				},
			},

			{
				"$lookup": {
					"from": "billingparties",
					"localField": "billingParty",
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
			{$match: {'billingParty._id': oPFil.billingParty}},
			// {
			// 	"$unwind": {
			// 		"path": "$billingParty.billingBranch",
			// 		"preserveNullAndEmptyArrays": true
			// 	}
			// },
			{
				"$project": {
					"clientId": 1,
					"grDate": 1,
					"grNumber": 1,
					"branch": 1,
					"customer": 1,
					"billingParty": "$billingParty.name",
					"billingBranch": "$billingParty.billingBranch",
					"totalFreight": 1,
					"diffDays": 1,
					"0_due": 1,
					"30_due": 1,
					"60_due": 1,
					"180_due": 1,
				}
			},

			{
				"$group": {
					"_id": {
						"billingBranch": "$billingBranch",
						"branch": "$branch",
						"billingParty": "$billingParty"
					},
					"0_due": {
						"$sum": {
							"$cond": [
								"$0_due",
								"$totalFreight",
								0
							]
						}
					},
					"0_due_count": {
						"$sum": {
							"$cond": [
								"$0_due",
								1,
								0
							]
						}
					},
					"30_due": {
						"$sum": {
							"$cond": [
								"$30_due",
								"$totalFreight",
								0
							]
						}
					},
					"30_due_count": {
						"$sum": {
							"$cond": [
								"$30_due",
								1,
								0
							]
						}
					},
					"60_due": {
						"$sum": {
							"$cond": [
								"$60_due",
								"$totalFreight",
								0
							]
						}
					},
					"60_due_count": {
						"$sum": {
							"$cond": [
								"$60_due",
								1,
								0
							]
						}
					},
					"90_due": {
						"$sum": {
							"$cond": [
								"$90_due",
								"$totalFreight",
								0
							]
						}
					},
					"90_due_count": {
						"$sum": {
							"$cond": [
								"$90_due",
								1,
								0
							]
						}
					},
					"180_due": {
						"$sum": {
							"$cond": [
								"$180_due",
								"$totalFreight",
								0
							]
						}
					},
					"180_due_count": {
						"$sum": {
							"$cond": [
								"$180_due",
								1,
								0
							]
						}
					},
					"gr": {
						"$push": "$$ROOT"
					},
					"totalFreight": {
						"$sum": "$totalFreight"
					},
					"customer": {
						"$first": "$customer"
					},
					//   "billingBranch": {
					//     "$first": "$billingBranch"
					//   }
				}
			},
			{
				"$sort": {
					"_id.billingBranch.name": 1
				}
			},
			{
				"$lookup": {
					"from": "branches",
					"localField": "_id.branch",
					"foreignField": "_id",
					"as": "branch"
				}
			},
			{
				"$unwind": {
					"path": "$branch",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$sort": {
					"branch.name": 1
				}
			},
//   {
//     "$lookup": {
//       "from": "billingparties",
//       "localField": "_id.billingParty",
//       "foreignField": "_id",
//       "as": "billingParty"
//     }
//   },
//   {
//     "$unwind": {
//       "path": "$billingParty",
//       "preserveNullAndEmptyArrays": true
//     }
//   },
			{
				"$group": {
					"_id": "$_id.billingParty",
					"data": {
						"$push": "$$ROOT"
					},
					"customer": {
						"$first": "$customer"
					},
					"bpName": {
						"$first": "$_id.billingParty"
					}
				}
			},
			{
				"$sort": {
					"bpName": 1
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
				"$group": {
					"_id": "$customer.category",
					"data": {
						"$push": "$$ROOT"
					}
				}
			},
			{
				"$sort": {
					"_id": 1
				}
			}

		];
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
		let aFoundData = await serverSidePage.requestData(GR, oQuery);

		return new Promise((resolve, reject) => {
			ReportExelService.outstandingUnbilledReport(aFoundData, {
				from, to,
				clientId: body.clientId
			}, function (data) {
				resolve(data);
			});
		});
	} catch (e) {
		throw e;

	}
}

async function syncStatus(req, res, next) {
	try {

		for (let body of req.body) {

			let latlonDatta, syncData;

			if (body.statuses.location) {
				latlonDatta = body.statuses.location;
			} else if (body.statuses && body.statuses.gpsData) {
				latlonDatta = await getLatLng(body.statuses.gpsData, body);
			} else {
				latlonDatta = {};
			}

			if (latlonDatta) {
				let requestData = {
					integration: body.integration,
					customer: body.customer,
					status: body.statuses.shellStatus,
					shipmentNo: body.shipmentNo,
					date: body.statuses.date,
					remark: body.statuses.remark,
				};
				syncData = await syncGPSData(latlonDatta, requestData);
			}

			if (syncData) {
				let obj = {
					...body.statuses,
					location: latlonDatta,
					syncDate: new Date(),
					syncBy: req.user.full_name
				};
				await GR.updateOne({_id: body._id, 'statuses._id': body.statuses._id}, {
					$set: {
						'statuses.$': obj,
					}
				});
			}
			if (body.statuses.shellStatus === 'Delivered') {
				await GR.updateOne({_id: body._id}, {
					$set: {
						'integration.shell.delivered': true
					}
				});
			}
		}

		return res.status(200).json({
			success: 'OK',
			message: 'GR Status sync successfully',
		});

	} catch (err) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': (err && err.error && err.error.toString()) || (error && error.toString()),
			'data': err
		});
	}
}

async function getLatLng(gpsData, req, callback) {
	return new Promise((resolve, reject) => {
		let filter = {
			lat: gpsData.latitude,
			lon: gpsData.longitude,
			detail: true
		};
		let url = 'http://13.229.178.235:4242/reverse2';
		var url_with_params = url + prepareQeuryParams(filter);

		request.post({
			headers: {'content-type': 'application/json', 'Authorization': gpsgaadiAdminToken},
			url: url_with_params,
			body: JSON.stringify(filter)
		}, function (error, response, body) {
			if (error) {
				winston.error('getOdometer', error);
				return reject(error);
			}
			if (body) {
				try {
					body = JSON.parse(body);
					if (!body) {
						return reject({});
					} else {
						return resolve(body);
					}
				} catch (e) {
					winston.error('getOdometer catch', e.toString());
					return reject(e, {});
				}
			}
		});
	});

}

async function syncGPSData(syncData, requestData, callback) {
	return new Promise((resolve, reject) => {
		let shipmentNo = requestData.shipmentNo;
		let dt = new Date(requestData.date);
		let istDate = dt.getFullYear() + "-";
		if (dt.getMonth() < 9) {
			istDate = istDate + "0" + (dt.getMonth() + 1);
		} else {
			istDate = istDate + (dt.getMonth() + 1);
		}
		istDate = istDate + "-";
		if (dt.getDate() < 10) {
			istDate = istDate + "0" + dt.getDate();
		} else {
			istDate = istDate + dt.getDate();
		}
		istDate = istDate + "T";
		if (dt.getHours() < 10) {
			istDate = istDate + "0" + dt.getHours();
		} else {
			istDate = istDate + dt.getHours();
		}
		istDate = istDate + ":";
		if (dt.getMinutes() < 10) {
			istDate = istDate + "0" + dt.getMinutes();
		} else {
			istDate = istDate + dt.getMinutes();
		}
		istDate = istDate + ":00+0530";
		let filter = {
			"ShipperEnterprise": "Shell International Petroleum Company Limited" || requestData.customer.shipperEnterprise,
			"ShipperOrganization": "Shell India Markets" || requestData.customer.shipperOrganization,
			"ShipmentNumber": shipmentNo,
			"Latitude": syncData.lat,
			"Longitude": syncData.lon,
			"Street1": syncData.detail && syncData.detail.locality,
			"Street2": syncData.detail && syncData.detail.place,
			"City": syncData.detail && syncData.detail.city,
			"State": syncData.detail && syncData.detail.state,
			"Country": "IN",
			"PostalCode": syncData.detail && syncData.detail.postal,
			"EventDateTime": istDate || new Date(requestData.date),
			"Event": requestData.status,
			"EventMessage": requestData.remark
		};
		console.log(JSON.stringify(filter));

		const SHELL_CONFIG = config.shellIntegration;
		request.post({
			headers: {
				'content-type':
					'application/json',
				'Authorization': 'Basic ' + Buffer.from(unescape(encodeURIComponent(SHELL_CONFIG.username + ':' + SHELL_CONFIG.password))).toString('base64')
			},
			url: SHELL_CONFIG.url,
			body: JSON.stringify(filter)
		}, function (error, response, body) {
			if (error) {
				winston.error('getShellIntegration', error);
				return reject(error);
			}
			if (body) {
				try {
					body = JSON.parse(body);
					if (!body.success) {
						return reject(body);
					} else {
						return resolve(body);
					}
				} catch (e) {
					winston.error('getShellIntegration catch', e.toString());
					return reject(e, {});
				}
			} else {
				winston.error('getShellIntegration', null);
				return reject((response && response.statusMessage) || "No response from ShellIntegration");
			}
		});
	});

}

function prepareQeuryParams(oQuery) {
	let sParam = oQuery.lat ? ("?lat=" + oQuery.lat) : "?lat=";
	for (let property in oQuery) {
		if (property !== "lat") {
			sParam = sParam + "&" + property + "=" + oQuery[property];
		}
	}
	return sParam;
}

module.exports = {
	documentsUpload,
	get,
	getGr,
	getV2Lite,
	addGr,
	syncStatus,
	getLatLng,
	syncGPSData,
	add_gr_number,
	cancel,
	update_status,
	charge_update,
	update,
	acknowledge_gr,
	revertGrAcknowledge,
	pending_gr_remark,
	updateProp,
	admin_update,
	add_geofence,
	rm_geofence,
	addAdvancePayment,
	update_diesel_escalation,
	report_diesel_escalation,
	grReceive,
	grsforcovernote,
	covernotesforgr,
	convertgrstocovernote,
	convertcovernotestogr,
	reportDownload,
	reportDownloadV2,
	dailyMISreport,
	grUpload,
	adm_update,
	getGrReport,
	podReport,
	updateUpdateTime,
	grSummaryReport,
	outstandingUnbilledReport
};
