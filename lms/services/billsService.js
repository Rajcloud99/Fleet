var Promise = require('bluebird');
var winston = require('winston');
var async = require('async');
//var PDFMerge = require('pdf-merge');
const uuidv4 = require('uuid/v4');
const billStationaryService = commonUtil.getService('billStationary');
const voucherService = commonUtil.getService('voucher');
let Accounts = commonUtil.getModel('accounts');
let customerModel = commonUtil.getModel('customer');
var pdftkPath = 'C:/Program Files (x86)/PDFtk/bin/pdftk.exe'; //Linux doesn't need this param
let GR = Promise.promisifyAll(commonUtil.getModel('tripGr'));
let moment = require('moment');
var allowedFilter = ['_id', 'clientId', 'cGST_percent', 'sGST_percent', 'iGST_percent', 'boe_no', 'trip_no', 'status', 'booking_type', 'booking_no', 'bookingId', 'booking_date',
	'customer_id', 'transporter', 'start_date', 'end_date', 'status', 'branch', 'allocated', 'acknowledge.status', 'cancelled', 'billNo', 'billingParty', 'grNumber', 'coverNote.cnNo',
	'totalAmount', 'provisionalBill', 'multiBill'];
let Bill = Promise.promisifyAll(commonUtil.getModel('bills'));
let BillNew = commonUtil.getModel('bills');
let PurchaseBill = Promise.promisifyAll(commonUtil.getModel('purchaseBill'));
let PurchaseBillNew = commonUtil.getModel('purchaseBill');
const BillingParty = commonUtil.getModel('billingparty');
const Branch = commonUtil.getModel('branch');
const billingPartyService = commonUtil.getService('billingParty');
const TripAdvance = commonUtil.getModel('TripAdvances');
const serverSidePage = require('../../utils/serverSidePagination');
const grService = commonUtil.getService('tripGrV2');
const ReportExcelService = commonUtil.getService('reportExel');
const VoucherModel = commonUtil.getModel('voucher');


function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

module.exports.generateDriverPdf = function (data, clientId, next) {
	phantom.create().then(function (ph) {
		ph.createPage().then(function (page) {
			var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/bills/driver.html?" + formatData(data);
			// console.log(url);
			page.open(url).then(function (status) {
				// console.log('status', status);
				page.render('files/users/' + clientId + '/driver.pdf').then(function () {
					// console.log('rendered...');
					ph.exit();
					next(null, "users/" + clientId + "/driver.pdf");
				});
			});
		});
	})
		.catch(
			function (err) {
				console.log(err);
				return next(err);
			}
		);
};

var constructFilters = function (query) {
	var fFilter = {};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, allowedFilter)) {
			if (i == 'start_date' && query.end_date) {
				var startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				var nextDay = new Date(query.end_date);
				nextDay.setHours(23);
				nextDay.setMinutes(59);
				nextDay.setSeconds(59);
				fFilter[query.dateType || 'billDate'] = {
					'$gte': startDate,
					'$lt': nextDay
				};
			} else if (i == 'start_date') {
				var startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				var nextDay = new Date(startDate);
				nextDay.setDate(startDate.getDate() + 1);
				fFilter[query.dateType || 'last_modified_at'] = {
					'$gte': startDate,
					'$lt': nextDay
				};
			} else if (i == 'end_date') {
				if (!query.start_date) {
					var endDate = new Date(query[i]);
					fFilter[query.dateType || 'last_modified_at'] = {
						'$lt': endDate
					};
				}
			} else if (i == 'grNumber') {
				fFilter.items = {'gr.grNumber': query[i]};
			} else if (i === '_id' && Array.isArray(query[i])) {
				fFilter[i] = {$in: otherUtil.arrString2ObjectId(query[i])};
			} else if (query[i].toString().match(/^[0-9a-fA-F]{24}$/)) {
				fFilter[i] = otherUtil.arrString2ObjectId(query[i]);
			} else if (i === 'coverNote.cnNo' && typeof fFilter[i] === 'string') {
				fFilter[i] = {$regex: query[i], $options: 'i'}
			} else if (i === 'billNo') {
				fFilter[i] = new RegExp(query[i].replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i')
			} else if (i === 'provisionalBill') {
				if (typeof query[i] === 'object') {
					if (query[i].$exists)
						fFilter['provisionalBill.0'] = {$exists: true};
					else
						fFilter['provisionalBill.0'] = {$exists: false};
				} else
					fFilter[i] = query[i];
			} else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

var constructGRFilters = function (query) {
	var fFilter = {};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, ['items.gr.grNumber', 'items.gr.customer', 'branches'])) {
			if (i === 'items.gr.customer') {
				fFilter[i] = otherUtil.arrString2ObjectId(query[i]);
			} else if (i === 'branches') {
				if (query[i] && query[i] != "undefined" && query[i].length > 0) {
					fFilter['$or'] = [
						{'items.gr.branch': {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])}},
						{'items': {}}
					];
				}
			} else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

var constructBPFilters = function (query) {
	var fFilter = {};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, ['billingParty.name', 'billingParty.customer'])) {
			if (i === 'billingParty.customer')
				fFilter[i] = otherUtil.arrString2ObjectId(query[i]);
			else
				fFilter[i] = query[i];
		}
	}
	return fFilter;
};

var constructVchFilters = function (query) {
	var fFilter = {};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, ['acknowledge.voucher.acImp.st', 'acknowledge.voucher.refNo'])) {
			fFilter[i] = query[i];
		}
	}
	return fFilter;
};

// Purchase bill Filters
var allowedFilterOfPurchaseBill = ['billNo','advanceType', 'refNo', 'from', 'to', '_id', 'account', 'billType', 'from_account', 'clientId', 'vendorFuel', 'plainVoucher', 'multiBill', 'items'];

var constructFilterOfPurchaseBill = function (query) {
	query.dateType = query.dateType || 'billDate';
	var fFilter = {};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, allowedFilterOfPurchaseBill)) {
			if (i == 'from') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$gte = startDate;
			} else if (i == 'to') {
				let endDate = new Date(query[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$lte = endDate;
			} else if (i === "account") {
				if (query[i] && query[i] != "undefined" && query[i].length > 0) {
					fFilter['account'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])};
				}
			} else if (i === "vendorFuel") {
				if (query[i] && query[i] != "undefined" && query[i].length > 0) {
					fFilter['vendorFuel'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])};
				}
			} else if (i === 'plainVoucher') {
				fFilter[i] = {$exists: query[i]};
			} else if (typeof query[i] === 'string' && query[i].match(/^[0-9a-fA-F]{24}$/)) {
				fFilter[i] = mongoose.Types.ObjectId(query[i]);
			} else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

var allowedFilterOfBillingParty = ['start_date', 'end_date', 'clientId'];

var constructFilterOfBillingParty = function (query) {
	query.dateType = query.dateType || 'billDate';
	var fFilter = {};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, allowedFilterOfBillingParty)) {
			if (i == 'start_date') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$gte = startDate;
			} else if (i == 'end_date') {
				let endDate = new Date(query[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$lte = endDate;
			} else if (query[i].match(/^[0-9a-fA-F]{24}$/)) {
				fFilter[i] = mongoose.Types.ObjectId(query[i]);
			} else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

var allowedFilterOfTripAdv = ['from', 'to', 'clientId'];

var constructFilterOfTripAdvParty = function (query) {
	query.dateType = 'date';
	var fFilter = {};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, allowedFilterOfTripAdv)) {
			if (i == 'from') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$gte = startDate;
			} else if (i == 'to') {
				let endDate = new Date(query[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$lte = endDate;
			} else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

module.exports.getClientMonthlyReport = async function (reqBody, next) {
	var oPFil = constructFilterOfBillingParty(reqBody);
	const aggrQuery = [
		{$match: oPFil},
		{$sort: {_id: -1}},
		{
			"$group": {
				"_id": {
					"billingParty": "$billingParty",
					"month": {
						"$month": "$billDate"
					},
					"year": {
						"$year": "$billDate"
					}
				},

				"amount": {$sum: "$totalAmount"}

			}
		},
		{
			$project: {
				"billingParty": "$_id.billingParty",
				"month": "$_id.month",
				"year": "$_id.year",
				amount: "$amount"
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
			$lookup: {
				from: "customers",
				localField: "billingParty.customer",
				foreignField: "_id",
				as: "billingParty.customer"
			}
		},
		{
			"$unwind": {
				"path": "$billingParty.customer",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$project: {
				"bPName": "$billingParty.name",
				"custName": "$billingParty.customer.name",
				"month": 1,
				"year": 1,
				"amount": 1
			}
		},
		{$sort: {custName: 1}},

		// {

		// 	"$group": {
		// 	 "_id": {
		// 		"bPName": "$bPName",
		// 	 },
		// 	 "aMonthlyData": {
		// 		 $push: "$$ROOT"
		// 	 }

		//  }
		//  }


	];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let aFoundData = await serverSidePage.requestData(Bill, oQuery);
	let massagedData = {};

	aFoundData.forEach(oData => {
		massagedData[oData.bPName] = massagedData[oData.bPName] || {};
		massagedData[oData.bPName].name = oData.bPName;
		massagedData[oData.bPName].custName = oData.custName;
		let monthYear = moment().month(oData.month - 1).year(oData.year).format('MM-YYYY');
		massagedData[oData.bPName][monthYear] = massagedData[oData.bPName][monthYear] || 0;
		massagedData[oData.bPName][monthYear] += oData.amount;
	});

	// console.log(Object.values(massagedData));
	return Object.values(massagedData);
	//return massagedData;
};

var allowedGrSummaryReportFilter = ['fromDate', 'toDate', 'clientId'];

var grSummaryReportFilter = function (query) {
	query.dateType = query.dateType || 'billDate';
	var fFilter = {};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, allowedGrSummaryReportFilter)) {
			if (i == 'fromDate') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$gte = startDate;
			} else if (i == 'toDate') {
				let endDate = new Date(query[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$lte = endDate;
			} else if (query[i].match(/^[0-9a-fA-F]{24}$/)) {
				fFilter[i] = mongoose.Types.ObjectId(query[i]);
			}
			// else if (i === 'billingParty.customer') {
			// 	//fFilter[i] = mongoose.Types.ObjectId(query[i]);
			// 	fFilter[i] = otherUtil.arrString2ObjectId(query[i]);
			// }
			else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

module.exports.grSummaryReport = async function (reqBody, next) {
	var oPFil = grSummaryReportFilter(reqBody);
	//var oCFil = constructCustomerFilter(reqBody);
	const aggrQuery = [
		{$match: oPFil},
		{$sort: {_id: -1}},


	];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let getData = await serverSidePage.requestData(Bill, oQuery);
	return getData;
};

var allowedFilterOfOutstandingReport = ['start_date', 'end_date', 'clientId'];

var constructOutstandingFilter = function (query) {
	query.dateType = query.dateType || 'billDate';
	var fFilter = {};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, allowedFilterOfOutstandingReport)) {
			if (i == 'start_date') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$gte = startDate;
			} else if (i == 'end_date') {
				let endDate = new Date(query[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				fFilter[query.dateType] = fFilter[query.dateType] || {};
				fFilter[query.dateType].$lte = endDate;
			} else if (query[i].match(/^[0-9a-fA-F]{24}$/)) {
				fFilter[i] = mongoose.Types.ObjectId(query[i]);
			}
			// else if (i === 'billingParty.customer') {
			// 	//fFilter[i] = mongoose.Types.ObjectId(query[i]);
			// 	fFilter[i] = otherUtil.arrString2ObjectId(query[i]);
			// }
			else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

module.exports.cNdR_Deduction = async function (reqBody, next) {
	try {
		let oPFil = constructFilters(reqBody);
		const aggrQuery = [
			{$match: oPFil},
			{$sort: {_id: -1}},
			{
				"$unwind": "$receiving.deduction"
			},
			{
				"$project": {
					"grNumber": "$receiving.deduction.grNumber",
					"amount": "$receiving.deduction.amount",
					"creditNo": "$receiving.deduction.creditNo",
					"cNoteRef": "$receiving.deduction.cNoteRef",
					"mrRef": "$receiving.deduction.mrRef",
					"mrNo": "$receiving.deduction.mrNo",
					"deductionType": "$receiving.deduction.deductionType",
					"remarks": 1,
					"billNo": 1,
					"billDate": 1
				}
			}
		];
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
		let getData = await serverSidePage.requestData(Bill, oQuery);
		return getData;
	} catch (e) {
		console.log('error => ', e);
		throw e;
	}
};

module.exports.customerOutstandingReport = async function (reqBody, next) {
	var oPFil = constructOutstandingFilter(reqBody);
	//var oCFil = constructCustomerFilter(reqBody);
	let oBillingParty = {};
	if (reqBody.billingParty) {
		oBillingParty = {"billingParty._id": otherUtil.arrString2ObjectId(reqBody.billingParty)};
	}
	let oCustomer = {};
	if (reqBody.customer) {
		oCustomer = {"customers._id": otherUtil.arrString2ObjectId(reqBody.customer)};
	}
	oPFil.cancelled = false;
	const aggrQuery = [
		{$match: oPFil},
		{$sort: {_id: -1}},
		{
			$project: {
				"dueDate": 1,
				"submitionDate": 1,
				"billDate": 1,
				"billingParty": 1,
				"billAmount": 1,
				"billNo": 1,
				"remarks": 1,
				"moneyReceipt.Sum": {
					$reduce: {
						input: '$receiving.moneyReceipt',
						initialValue: 0,
						in: {$add: ["$$value", '$$this.amount']}
					}
				},
				"deduction.Sum": {
					$reduce: {
						input: '$receiving.deduction',
						initialValue: 0,
						in: {
							"$add": ["$$value", {
								$cond: {
									if: {"$ifNull": ["$$this.mrRef", false]},
									then: 0,
									else: {"$ifNull": ["$$this.amount", 0]}
								}
							}]
						}
					}
				}
			}
		},
		{
			"$lookup": {
				from: "billingparties",
				localField: "billingParty",
				foreignField: "_id",
				as: "billingParty"
			}
		},
		{
			"$unwind": "$billingParty"
		},
		{$match: oBillingParty},
		{
			"$lookup": {
				from: "customers",
				localField: "billingParty.customer",
				foreignField: "_id",
				as: "customers"
			}
		},
		{
			"$unwind": "$customers"
		},
		{$match: oCustomer},
		{
			$project: {
				customerName: "$customers.name",
				billingPartyName: "$billingParty.name",
				"billNo": 1,
				"dueDate": 1,
				"submitionDate": 1,
				"billDate": 1,
				"remarks": 1,
				billAmount: 1,
				"receivedAmt": {$add: ["$moneyReceipt.Sum", "$deduction.Sum"]},
				overDueAmount: {
					$subtract: ["$billAmount", {$add: ["$moneyReceipt.Sum", "$deduction.Sum"]}],
				},
			}
		},
		{
			$sort: { billingPartyName: 1},
		},
		{
			"$group": {
				"_id": {
					"customerName": "$customerName"
				},
				"aMonthlyData": {
					$push: "$$ROOT"
				}

			}
		},
		{
			$sort: { "_id.customerName": 1}

		}
	];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let getData = await serverSidePage.requestData(Bill, oQuery);
	// console.log(getData);
	return getData;
};

module.exports.ledgerTransactionReport = async function (reqBody, next) {
	var oPFil = constructOutstandingFilter(reqBody);

	if (reqBody.customer) {

		let aCustomer = Array.isArray(reqBody.customer) ? reqBody.customer : [reqBody.customer];
		let aBillingParty = await billingPartyService.getBillingParty({
			customer: {$in: otherUtil.arrString2ObjectId(aCustomer)}
		}, {
			_id: 1,
			name: 1,
			account: 1,
		});
		oPFil.billingParty = {$in: aBillingParty.map(o => o._id)};
	}

	oPFil.cancelled = false;
	const aggrQuery = [
		{$match: oPFil},
		//{$sort: {_id: -1}},
		{
			$project: {
				clientId: 1,
				billingParty: 1,
				"billNo": 1,
				"dueDate": 1,
				"submitionDate": 1,
				"billDate": 1,
				"remarks": 1,
				billAmount: 1,
				receiving: 1
			}
		},
		{
			$match: {
				"receiving": {
					$nin: [0, null]
				}
			}
		},
		{
			$addFields: {
				"moneyReceipt.Sum": {
					$reduce: {
						input: '$receiving.moneyReceipt',
						initialValue: 0,
						in: {$add: ["$$value", '$$this.amount']}
					}
				},
				"deduction.Sum": {
					$reduce: {
						input: '$receiving.deduction',
						initialValue: 0,
						in: {
							"$add": ["$$value", {
								$cond: {
									if: {"$ifNull": ["$$this.mrRef", false]},
									then: 0,
									else: {"$ifNull": ["$$this.amount", 0]}
								}
							}]
						}
					}
				}
			}
		},
		{
			$project: {
				clientId: 1,
				billingParty: 1,
				"billNo": 1,
				"dueDate": 1,
				"submitionDate": 1,
				"billDate": 1,
				"remarks": 1,
				billAmount: 1,
				overDueAmount: {
					$subtract: ["$billAmount", {$add: ["$moneyReceipt.Sum", "$deduction.Sum"]}],
				},
			}
		},
		{
			$match: {
				overDueAmount: {"$gte": 0.10}
				// {$ne : 0}
			}
		},
		//TODO why overdue should be 0 for normal bill transaction report
		{
			"$group": {
				"_id": '$billingParty',
				"aBills": {
					$push: "$$ROOT"
				},
				clientId: {
					$first: "$clientId"
				}
			}
		},
		{
			"$lookup": {
				from: "billingparties",
				localField: "_id",
				foreignField: "_id",
				as: "billingParty"
			}
		},
		{
			"$unwind": "$billingParty"
		},
		/*
		//projection for bp
		{
			"$lookup": {
				"from": "vouchers",
				"let": {
					"clientId": "$clientId",
					"account": "$billingParty.account"
				},
				"pipeline": [
					{
						"$match": {
							"$expr": {
								"$and": [
									{
										"$eq": [
											"$clientId",
											"$$clientId"
										]
									},
									{
										"$in": [
											"$$account",
											"$ledgers.account"
										]
									}
								]
							},
							"ledgers.bills.billType": "On Account",
							"vT": "Customer Receipts",
							"deleted": {
								"$not": {
									"$eq": true
								}
							}
						}
					},
					{
						"$addFields": {
							"ledger": {
								"$filter": {
									"input": "$ledgers",
									"as": "ledger",
									"cond": {
										"$eq": [
											"$$ledger.cRdR",
											"CR"
										]
									}
								}
							}
						}
					},
					{
						"$addFields": {
							"ledger": {
								"$arrayElemAt": [
									"$ledger",
									0
								]
							}
						}
					},
					{
						"$group": {
							"_id": "$ledger.account",
							"amount": {
								$sum: "$ledger.amount"
							}
						}
					}
				],
				"as": "onAccount"
			}
		}
		*/
	];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let getData = await serverSidePage.requestData(Bill, oQuery);
	let onAcD = await getOnAccountForBP(getData, oPFil);
	// console.log(getData);
	return getData;
};

module.exports.OutstandingPeriodWiseReport = async function (reqBody, next) {
	var oPFil = constructOutstandingFilter(reqBody);
	oPFil.cancelled = false;
	const aggrQuery = [
		{$match: oPFil},
		{
			"$project": {
				"billDate": 1,
				"billingParty": 1,
				"billAmount": 1,
				"moneyReceipt.aggr": {
					"$reduce": {
						"input": "$receiving.moneyReceipt",
						"initialValue": 0,
						"in": {
							"$add": [
								"$$value",
								"$$this.amount"
							]
						}
					}
				},
				"deduction.aggr": {
					"$reduce": {
						"input": "$receiving.deduction",
						"initialValue": 0,
						"in": {
							"$add": ["$$value", {
								$cond: {
									if: {"$ifNull": ["$$this.mrRef", false]},
									then: 0,
									else: {"$ifNull": ["$$this.amount", 0]}
								}
							}]
						}
					}
				}
			}
		},
		{$sort: {_id: -1}},
		{
			"$lookup": {
				"from": "billingparties",
				"localField": "billingParty",
				"foreignField": "_id",
				"as": "billingParty"
			}
		},
		{
			"$unwind": "$billingParty"
		},
		{
			"$lookup": {
				"from": "customers",
				"localField": "billingParty.customer",
				"foreignField": "_id",
				"as": "customers"
			}
		},
		{
			"$unwind": "$customers"
		},
		{
			"$project": {
				"billDate": 1,
				"customerName": "$customers.name",
				"billAmount": 1,
				"overDueAmount": {
					"$subtract": [
						"$billAmount",
						{
							"$add": [
								"$moneyReceipt.aggr",
								"$deduction.aggr"
							]
						}
					]
				}
			}
		},
		{
			"$group": {
				"_id": {
					"customerName": "$customerName",
					"month": {
						"$month": "$billDate"
					},
					"year": {
						"$year": "$billDate"
					}
				},
				"outstandingSum": {$sum: "$billAmount"},
				"overdueSum": {$sum: "$overDueAmount"}
			}
		},
		{
			$project: {
				customer: "$_id.customerName",
				month: "$_id.month",
				year: "$_id.year",
				outstandingSum: 1,
				overdueSum: 1
			}
		}
	];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	//console.log(oQuery)
	let aFoundData = await serverSidePage.requestData(Bill, oQuery);
	//return getData;
	let massagedData = {};

	aFoundData.forEach(oData => {
		massagedData[oData.customer] = massagedData[oData.customer] || {};
		massagedData[oData.customer].name = oData.customer;
		let monthYear = moment().month(oData.month - 1).year(oData.year).format('MM-YYYY');
		massagedData[oData.customer][monthYear] = massagedData[oData.customer][monthYear] || {};
		massagedData[oData.customer][monthYear].outstandingSum = oData.outstandingSum;
		massagedData[oData.customer][monthYear].overdueSum = oData.overdueSum;
		massagedData[oData.customer][monthYear].outstandingSum += oData.outstandingSum;
		massagedData[oData.customer][monthYear].overdueSum += oData.overdueSum;
	});
	return Object.values(massagedData);
};

module.exports.billLedgerOutstandingReport = async function (body, req) {
	try {

		body.aCustomer =  [];

		if(body.customer)
		body.aCustomer.push(body.customer);

		if(body.category){
			let oCustomer = await customerModel.find({category: {$in :body.category}});

			if(oCustomer){
				oCustomer.forEach(obj=>{
					body.aCustomer.push(obj._id);
				})
			}
		}

		let asOnDate = body.asOnDate ? new Date(body.asOnDate) : new Date(body.to);
		let category = body.category;
		let from = new Date(body.from);
		let to = new Date(body.to);
		const DAYS_180 = 180 * 24 * 60 * 60 * 1000;
		const DAYS_90 = 90 * 24 * 60 * 60 * 1000;
		const DAYS_60 = 60 * 24 * 60 * 60 * 1000;
		const DAYS_30 = 30 * 24 * 60 * 60 * 1000;
		const DEFAULT_CREDIT_DAY = 30;

		if (body.aCustomer && body.aCustomer.length) {
			let aCustomer = Array.isArray(body.aCustomer) ? body.aCustomer : [body.aCustomer];
			let aBillingParty = await billingPartyService.getBillingParty({
				customer: {$in: otherUtil.arrString2ObjectId(aCustomer)}
			}, {
				_id: 1,
				name: 1,
				account: 1,
			});
			body.billingParty = aBillingParty.map(o => o._id.toString());
		}
		body.clientId = req.user.clientId;
		let oPFil = constructFilter(body);

        const aggrQuery = [
			{"$match": oPFil},
			{
				$project: {
					clientId: 1,
					billDate: 1,
					submissionDate: 1,
					dueDate: 1,
					receiving: 1,
					billNo: 1,
					amount: 1,
					billAmount: 1,
					billingParty: 1,
					"creditDays": {"$ifNull": ["$contract.creditDays", DEFAULT_CREDIT_DAY]}
				}
			},
			{
				"$addFields": {
					"submissionDate": {"$ifNull": ["$submitionDate", "$billDate",]},
					"dueDate": {
						"$ifNull": [
							"$dueDate",
							{
								"$add": [
									{"$ifNull": ["$submitionDate", "$billDate"]},
									{
										$multiply: [
											"$creditDays",
											24 * 60 * 60 * 1000
										]
									}
								]
							}
						]
					},
					"receivedAmt": {
						"$add": [
							{
								"$reduce": {
									"input": "$receiving.moneyReceipt",
									"initialValue": 0,
									"in": {
										"$add": [
											"$$value",
											"$$this.amount"
										]
									}
								}
							},
							{
								"$reduce": {
									"input": "$receiving.deduction",
									"initialValue": 0,
									"in": {
										"$add": [
											"$$value",
											{
												"$cond": {
													"if": {
														"$ifNull": [
															"$$this.mrRef",
															false
														]
													},
													"then": 0,
													"else": {
														"$ifNull": [
															"$$this.amount",
															0
														]
													}
												}
											}
										]
									}
								}
							}
						]
					},
				}
			},
			{
				"$project": {
					"clientId": 1,
					"billNo": 1,
					"billingParty": 1,
					"amount": 1,
					"billAmount": 1,
					"creditDays": 1,
					"remainingAmt": {
						"$subtract": [
							"$billAmount",
							"$receivedAmt"
						]
					},
					"billDate": 1,
					"billDays": {
						"$subtract": [
							asOnDate,
							"$billDate"
						]
					},
					dueDate: 1,
					"dueDays": {
						"$subtract": [
							asOnDate,
							"$dueDate"
						]
					},
					submissionDate: 1,
					"submissionDays": {
						"$subtract": [
							asOnDate,
							"$submissionDate"
						]
					}
				}
			},
			{
				"$addFields": {
					"0_due": {
						"$cond": [
							{
								$and: [
									{
										"$gte": [
											"$dueDays",
											0
										],
									},
									{
										"$lt": [
											"$dueDays",
											DAYS_30
										]
									}
								]
							},
							true,
							false
						]
					},
					"0_revenue": {
						"$cond": [
							{
								$and: [
									{
										"$gte": [
											"$billDays",
											0
										],
									},
									{
										"$lt": [
											"$billDays",
											DAYS_30
										]
									}
								]
							},
							true,
							false
						]
					},
					"0_sub": {
						"$cond": [
							{
								"$lt": [
									"$submissionDays",
									DAYS_30
								]
							},
							true,
							false
						]
					},
					"30_due": {
						"$cond": [
							{
								$and: [
									{
										"$gte": [
											"$dueDays",
											DAYS_30
										],
									},
									{
										"$lt": [
											"$dueDays",
											DAYS_60
										]
									}
								]
							},
							true,
							false
						]
					},
					"30_revenue": {
						"$cond": [
							{
								$and: [
									{
										"$gte": [
											"$billDays",
											DAYS_30
										],
									},
									{
										"$lt": [
											"$billDays",
											DAYS_60
										]
									}
								]
							},
							true,
							false
						]
					},
					"30_sub": {
						"$cond": [
							{
								$and: [
									{
										"$gte": [
											"$submissionDays",
											DAYS_30
										],
									},
									{
										"$lt": [
											"$submissionDays",
											DAYS_60
										]
									}
								]
							},
							true,
							false
						]
					},
					"60_due": {
						"$cond": [
							{
								"$and": [
									{
										"$gte": [
											"$dueDays",
											DAYS_60
										]
									},
									{
										"$lt": [
											"$dueDays",
											DAYS_90
										]
									}
								]
							},
							true,
							false
						]
					},
					"60_revenue": {
						"$cond": [
							{
								"$and": [
									{
										"$gte": [
											"$billDays",
											DAYS_60
										]
									},
									{
										"$lt": [
											"$billDays",
											DAYS_90
										]
									}
								]
							},
							true,
							false
						]
					},
					"60_sub": {
						"$cond": [
							{
								"$and": [
									{
										"$gte": [
											"$submissionDays",
											DAYS_60
										]
									},
									{
										"$lt": [
											"$submissionDays",
											DAYS_90
										]
									}
								]
							},
							true,
							false
						]
					},
					"90_due": {
						"$cond": [
							{
								"$and": [
									{
										"$gte": [
											"$dueDays",
											DAYS_90
										]
									},
									{
										"$lt": [
											"$dueDays",
											DAYS_180
										]
									}
								]
							},
							true,
							false
						]
					},
					"90_revenue": {
						"$cond": [
							{
								"$and": [
									{
										"$gte": [
											"$billDays",
											DAYS_90
										]
									},
									{
										"$lt": [
											"$billDays",
											DAYS_180
										]
									}
								]
							},
							true,
							false
						]
					},
					"90_sub": {
						"$cond": [
							{
								"$and": [
									{
										"$gte": [
											"$submissionDays",
											DAYS_90
										]
									},
									{
										"$lt": [
											"$submissionDays",
											DAYS_180
										]
									}
								]
							},
							true,
							false
						]
					},
					"180_due": {
						"$gte": [
							"$dueDays",
							DAYS_180
						]
					},
					"180_revenue": {
						"$gte": [
							"$billDays",
							DAYS_180
						]
					},
					"180_sub": {
						"$gte": [
							"$submissionDays",
							DAYS_180
						]
					}
				}
			},
			{
			"$group": {
				"_id": "$billingParty",
				"180_due": {
					"$sum": {
						"$cond": [
							"$180_due",
							"$remainingAmt",
							0
						]
					}
				},
				"90_due": {
					"$sum": {
						"$cond": [
							"$90_due",
							"$remainingAmt",
							0
						]
					}
				},
				"60_due": {
					"$sum": {
						"$cond": [
							"$60_due",
							"$remainingAmt",
							0
						]
					}
				},
				"30_due": {
					"$sum": {
						"$cond": [
							"$30_due",
							"$remainingAmt",
							0
						]
					}
				},
				"0_due": {
					"$sum": {
						"$cond": [
							"$0_due",
							"$remainingAmt",
							0
						]
					}
				},
				"180_revenue": {
					"$sum": {
						"$cond": [
							"$180_revenue",
							"$amount",
							0
						]
					}
				},
				"90_revenue": {
					"$sum": {
						"$cond": [
							"$90_revenue",
							"$amount",
							0
						]
					}
				},
				"60_revenue": {
					"$sum": {
						"$cond": [
							"$60_revenue",
							"$amount",
							0
						]
					}
				},
				"30_revenue": {
					"$sum": {
						"$cond": [
							"$30_revenue",
							"$amount",
							0
						]
					}
				},
				"0_revenue": {
					"$sum": {
						"$cond": [
							"$0_revenue",
							"$amount",
							0
						]
					}
				},
				"180_sub": {
					"$sum": {
						"$cond": [
							"$180_sub",
							"$remainingAmt",
							0
						]
					}
				},
				"90_sub": {
					"$sum": {
						"$cond": [
							"$90_sub",
							"$remainingAmt",
							0
						]
					}
				},
				"60_sub": {
					"$sum": {
						"$cond": [
							"$60_sub",
							"$remainingAmt",
							0
						]
					}
				},
				"30_sub": {
					"$sum": {
						"$cond": [
							"$30_sub",
							"$remainingAmt",
							0
						]
					}
				},
				"0_sub": {
					"$sum": {
						"$cond": [
							"$0_sub",
							"$remainingAmt",
							0
						]
					}
				},
				"revenue": {
					"$sum": "$amount"
				},
				"outstanding": {
					"$sum": "$remainingAmt"
				},
				"billingParty": {
					"$first": "$billingParty"
				},
				"clientId": {
					"$first": "$clientId"
				},
				"creditDays": {
					"$first": "$creditDays"
				}
			}
		},
			{$sort: {outstanding: -1}},
			{$lookup: {from: 'billingparties', localField: 'billingParty', foreignField: '_id', as: 'billingParty'}},
			{
				"$unwind": {
					"path": "$billingParty",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				$group: {
					_id: "$billingParty.customer",
					data: {
						$push: "$$ROOT"
					}
				}
			},
			{$lookup: {from: 'customers', localField: '_id', foreignField: '_id', as: 'customer'}},
			{
				"$unwind": {
					"path": "$customer",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				$lookup: {
					from: 'branches',
					localField: 'customer.branch',
					foreignField: '_id',
					as: 'customer.branch'
				}
			},
			{
				$unwind: {
					path: '$customer.branch',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$sort: {
					"customer.name":1
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
				$sort: {
					"_id": 1
				}
			}
		];
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
		let aFoundData = await serverSidePage.requestData(Bill, oQuery);
		let aBpsAc = [];
		for (let i = 0; i < aFoundData.length; i++) {
			for (j = 0; j < (aFoundData[i].data && aFoundData[i].data.length); j++) {
				for (k = 0; k < (aFoundData[i].data[j].data && aFoundData[i].data[j].data.length); k++) {
					if (aFoundData[i].data[j].data[k].billingParty && aFoundData[i].data[j].data[k].billingParty.account) {
						aBpsAc.push(mongoose.Types.ObjectId(aFoundData[i].data[j].data[k].billingParty.account));
					}
				}
			}
		}
		let aOnAcc = await onAccountQuery({account: aBpsAc}, req);

		if (aOnAcc.length) {
			loop1 : for (let i = 0; i < aFoundData.length; i++) {
				for (j = 0; j < (aFoundData[i].data && aFoundData[i].data.length); j++) {
					for (k = 0; k < (aFoundData[i].data[j].data && aFoundData[i].data[j].data.length); k++) {
						if (aOnAcc.length == 0) {
							break loop1;
						}
						for (let a = 0; a < aOnAcc.length; a++) {
							if (aFoundData[i].data[j].data[k].billingParty && aFoundData[i].data[j].data[k].billingParty.account && aFoundData[i].data[j].data[k].billingParty.account.toString() == aOnAcc[a]._id.toString()) {
								aFoundData[i].data[j].data[k].onAccount = aOnAcc[a].amount;
								aOnAcc.splice(a, 1);
							}
						}
					}
				}
			}
		}

		return new Promise((resolve, reject) => {
			ReportExcelService.ledgerOutstandingReport(aFoundData, {
				from, to,
				category,
				clientId: req.user.clientId
			}, function (data) {
				resolve(data.url);
			});
		});

	} catch (e) {
		throw e;
	}
};

async function onAccountQuery({account}, req) {
	// return new Promise((resolve, reject) => {
		let onAccFil = {
			type: "Receipt",
			clientId: req.user.clientId,
			'ledgers.account': {$in: account},
			"ledgers.bills.billType": "On Account",
			"vT": {"$not": {"$eq": 'Money Receipt'}},
			"deleted": {"$not": {"$eq": true}},
			"date" :{
				"$gte":new Date(req.body.from),
				"$lte":new Date(req.body.to) || new Date()
			}
		};
		const onAccountQ = [
			{$match: onAccFil},
			{$project: {ledgers: 1}},
			{
				"$unwind": {
					"path": "$ledgers",
					"preserveNullAndEmptyArrays": true
				}
			},
			{$match: {'ledgers.cRdR': 'CR'}},
			{
				"$group": {
					"_id": "$ledgers.account",
					"amount": {
						$sum: "$ledgers.amount"
					}
				}
			}
		];
		let onAcQuery = {aggQuery: onAccountQ, no_of_docs: 10000};

		let aOnAcc = await serverSidePage.requestData(VoucherModel, onAcQuery);

		return aOnAcc;

	// });
}

function constructFilter(query) {
	let fFilter = {
		cancelled: false,
	};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, ['from', 'to', 'billingParty', 'clientId'])) {
			if (i == 'from') {
				fFilter['billDate'] = fFilter['billDate'] || {};
				fFilter['billDate'].$gte = moment(query[i]).startOf('day').toDate();
			} else if (i == 'to') {
				fFilter['billDate'] = fFilter['billDate'] || {};
				fFilter['billDate'].$lte = moment(query[i]).endOf('day').toDate();
			} else if (i === 'billingParty') {
				if (query[i] && query[i] != "undefined" && query[i].length > 0) {
					fFilter['billingParty'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])};
				}
			} else if (query[i].match(/^[0-9a-fA-F]{24}$/)) {
				fFilter[i] = mongoose.Types.ObjectId(query[i]);
			} else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
}

function monthsDiff(d1, d2) {
	let date1 = new Date(d1);
	let date2 = new Date(d2);
	let years = (date2.getFullYear() - date1.getFullYear());
	let months =(years * 12) + (date2.getMonth() - date1.getMonth()) ;
	return months;
}

function setLastDate(newDate) {
	 let newMonth = newDate.getMonth() - 1;
	newDate = new Date(newDate.setMonth(newMonth));
	if(newMonth > 6){
		if(newMonth % 2 === 0){
			newDate.setDate(30);
		}else{
			newDate.setDate(31);
		}
	}else{
		if(newMonth % 2 != 0){
			newDate.setDate(30);
		}else{
			newDate.setDate(31);
		}
	}
	return newDate;
}

function prepareGroup(month, body) {
	let groupMonth = {};
	if(month >= 4){
		let date1 = new Date(body.from);
		let newDate = new Date(date1.setMonth(date1.getMonth() + 4));
		newDate = setLastDate(newDate);
		let max = moment( new Date(body.from)).format('DD-MM-YYYY') + ' to ' + moment(newDate).format('DD-MM-YYYY');
		groupMonth[max] = groupMonth[max] || {};
		groupMonth[max].$get = new Date(body.from);
		groupMonth[max].$let = newDate;
		month -= 4;
		for(let i = 3; i < month; i++){
			let from = new Date(newDate.setDate(newDate.getDate() + 1));
			date1 =new Date(from);
			newDate = new Date(date1.setMonth(date1.getMonth() + 4));
			newDate = setLastDate(newDate);
			max =  moment(from).format('DD-MM-YYYY') + ' to ' + moment(newDate).format('DD-MM-YYYY');
			groupMonth[max] = groupMonth[max] || {};
			groupMonth[max].$get = from;
			groupMonth[max].$let = newDate;
			month -= 4;
			i--;
		}
		if(month < 4 && month > 0) {
			for (let i = 1; i <= month; i++) {
				let from = new Date(newDate.setDate(newDate.getDate() + 1));
				if(i === month){
					max =  moment(from).format('DD-MM-YYYY') + ' to ' + moment(new Date(body.to)).format('DD-MM-YYYY');
					groupMonth[max] = groupMonth[max] || {};
					groupMonth[max].$get = from;
					groupMonth[max].$let = new Date(body.to);
				}else {
					date1 = new Date(from);
					newDate = new Date(date1.setMonth(date1.getMonth() + 1));
					newDate = setLastDate(newDate);
					max = moment(from).format('DD-MM-YYYY') + ' to ' + moment(newDate).format('DD-MM-YYYY');
					groupMonth[max] = groupMonth[max] || {};
					groupMonth[max].$get = from;
					groupMonth[max].$let = newDate;
				}
			}
		}
	}else if(month < 4 && month > 0) {
		let date1 = new Date(body.from);
		let newDate = new Date(date1.setMonth(date1.getMonth() + 1));
		newDate = setLastDate(newDate);
		let max = moment( new Date(body.from)).format('DD-MM-YYYY') + ' to ' + moment(newDate).format('DD-MM-YYYY');
		groupMonth[max] = groupMonth[max] || {};
		groupMonth[max].$get = new Date(body.from);
		groupMonth[max].$let = newDate;
		month -= 1;
		for (let i = 1; i <= month; i++) {
			let from = new Date(newDate.setDate(newDate.getDate() + 1));
			if(i === month){
				max =  moment(from).format('DD-MM-YYYY') + ' to ' + moment(new Date(body.to)).format('DD-MM-YYYY');
				groupMonth[max] = groupMonth[max] || {};
				groupMonth[max].$get = from;
				groupMonth[max].$let = new Date(body.to);
			}else {
				date1 = new Date(from);
				newDate = new Date(date1.setMonth(date1.getMonth() + 1));
				newDate = setLastDate(newDate);
				max = moment(from).format('DD-MM-YYYY') + ' to ' + moment(newDate).format('DD-MM-YYYY');
				groupMonth[max] = groupMonth[max] || {};
				groupMonth[max].$get = from;
				groupMonth[max].$let = newDate;
			}
		}
	}else if(month === 0){
		let max = moment( new Date(body.from)).format('DD-MM-YYYY') + ' to ' + moment(new Date(body.to)).format('DD-MM-YYYY');
		groupMonth[max] = groupMonth[max] || {};
		groupMonth[max].$get = new Date(body.from);
		groupMonth[max].$let = new Date(body.to);
	}


	return groupMonth;
}

module.exports.billLedgerOutstandingMonthlyReport = async function (reqBody, next) {
	var oPFil = constructFilter(reqBody);
	oPFil.cancelled = false;
	var months =  monthsDiff(reqBody.from, reqBody.to);
	 let aData = prepareGroup(months, reqBody);
	// let tmFrom = new Date(reqBody.to);
	//  tmFrom = new Date(tmFrom.setMonth(tmFrom.getMonth() - 3));
	//  tmFrom = new Date(tmFrom.setDate(1)).getTime();
	// let tmTo = new Date(reqBody.to).getTime();
	const aggrQuery = [
		{$match: oPFil},
		{
			"$project": {
				"billDate": 1,
				"billingParty": 1,
				"billAmount": 1,
				"recMoneyReceiptAmt": {
					"$reduce": {
						"input": "$receiving.moneyReceipt",
						"initialValue": 0,
						"in": {
							"$add": [
								"$$value",
								"$$this.amount"
							]
						}
					}
				},
				"recDeductionAmt": {
					"$reduce": {
						"input": "$receiving.deduction",
						"initialValue": 0,
						"in": {
							"$add": [
								"$$value",
								{
									"$cond": {
										"if": {
											"$ifNull": [
												"$$this.mrRef",
												false
											]
										},
										"then": 0,
										"else": {
											"$ifNull": [
												"$$this.amount",
												0
											]
										}
									}
								}
							]
						}
					}
				}
			}
		},
		{
			"$sort": {
				"_id": -1
			}
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
			"$unwind": "$billingParty"
		},
		{
			"$lookup": {
				"from": "customers",
				"localField": "billingParty.customer",
				"foreignField": "_id",
				"as": "customers"
			}
		},
		{
			"$unwind": "$customers"
		},
		{
			"$project": {
				"billDate": 1,
				"bpName": "$billingParty.name",
				"bpAccount": "$billingParty.account",
				"customerName": "$customers.name",
				"customerType": "$customers.category",
				"billAmount": 1,
				"overDueAmount": {
					"$subtract": [
						"$billAmount",
						{
							"$add": [
								"$recMoneyReceiptAmt",
								"$recDeductionAmt"
							]
						}
					]
				}
			}
		},
		{
			"$group": {
				"_id": {
					"billingParty": "$bpName",
					"bpAccount": "$bpAccount",
					"customer": "$customerName",
					"month": {
						"$month": "$billDate"
					},
					"year": {
						"$year": "$billDate"
					}
				},
				"outstandingSum": {
					"$sum": "$billAmount"
				},
				"overdueSum": {
					"$sum": "$overDueAmount"
				},
				"customerType": {
					"$first": "$customerType"
				}
			}
		},
		{
			$sort: {
				"_id.customer": 1
			}
		},
		{
			"$group": {
				"_id": "$customerType",
				"data": {
					"$push": "$$ROOT"
				}
			}
		},
		{
			$sort: {
				"_id":-1
			}
		}
	];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let aFoundData = await serverSidePage.requestData(Bill, oQuery);
	// let monthYear = moment().month(oData.month - 1).year(oData.year).format('MM-YYYY');
	let massagedData = {};

	let aBpsAc = [];
	aFoundData.forEach(oData => {
		oData.data.forEach(obj =>{
				if (obj._id && obj._id.bpAccount) {
					aBpsAc.push(mongoose.Types.ObjectId(obj._id.bpAccount));
				}
		});
	});

	let aOnAcc = await onAccountQuery({account: aBpsAc}, req);

	aFoundData.forEach(oData => {
		oData.data.forEach(obj =>{
			let monthYear = moment().month(obj._id.month - 1).year(obj._id.year).format('MM-YYYY');
			monthYear = moment(monthYear, "MM-YYYY").toDate().getTime();
			let name = oData._id || 'Dummy';
			for (let [key, val] of Object.entries(aData)) {
				let start = new Date(val.$get).getTime();
				let end  = new Date(val.$let).getTime();
				if(new Date(reqBody.from).getTime() === val.$get.getTime())
					 start = new Date(val.$get.setDate(1)).getTime();

				if(monthYear >= start && monthYear < end){
					massagedData[name] = massagedData[name] || {};
					massagedData[name][obj._id.customer] = massagedData[name][obj._id.customer] || {};
					massagedData[name][obj._id.customer][obj._id.billingParty] = massagedData[name][obj._id.customer][obj._id.billingParty] || {};
					massagedData[name][obj._id.customer][obj._id.billingParty].bpAccount = obj._id.bpAccount;
					// massagedData[name][obj._id.customer][obj._id.billingParty].customer = obj._id.customer;
					// massagedData[name][obj._id.customer][obj._id.billingParty].customerType = obj.customerType;
					massagedData[name][obj._id.customer][obj._id.billingParty][key] = massagedData[name][obj._id.customer][obj._id.billingParty][key] || {};
					massagedData[name][obj._id.customer][obj._id.billingParty][key].outstandingSum = (massagedData[name][obj._id.customer][obj._id.billingParty][key].outstandingSum || 0) +  obj.outstandingSum;
					massagedData[name][obj._id.customer][obj._id.billingParty][key].overdueSum = (massagedData[name][obj._id.customer][obj._id.billingParty][key].overdueSum || 0) +  obj.overdueSum;
					// obj[key] = obj[key] || {};
					// obj[key] = {outstandingSum: obj.outstandingSum,overdueSum: obj.overdueSum};
					// if(monthYear >= tmFrom && monthYear < tmTo){
					// 	massagedData[name][obj._id.customer][obj._id.billingParty].tmoss = (massagedData[name][obj._id.customer][obj._id.billingParty].tmoss || 0) +  obj.outstandingSum;
					// 	massagedData[name][obj._id.customer][obj._id.billingParty].tmods = (massagedData[name][obj._id.customer][obj._id.billingParty].tmods || 0) +  obj.overdueSum;
					// 	massagedData[name][obj._id.customer][obj._id.billingParty].tmto = ((massagedData[name][obj._id.customer][obj._id.billingParty].tmoss || 0) +  obj.outstandingSum) - ((massagedData[name][obj._id.customer][obj._id.billingParty].tmods || 0) +  obj.overdueSum);
					// }
				}else{
					massagedData[name] = massagedData[name] || {};
					massagedData[name][obj._id.customer] = massagedData[name][obj._id.customer] || {};
					massagedData[name][obj._id.customer][obj._id.billingParty] = massagedData[name][obj._id.customer][obj._id.billingParty] || {};
					massagedData[name][obj._id.customer][obj._id.billingParty].bpAccount = obj._id.bpAccount;
					// massagedData[name][obj._id.customer][obj._id.billingParty].customer = obj._id.customer;
					// massagedData[name][obj._id.customer][obj._id.billingParty].customerType = obj.customerType;
					massagedData[name][obj._id.customer][obj._id.billingParty][key] = massagedData[name][obj._id.customer][obj._id.billingParty][key] || {};
					massagedData[name][obj._id.customer][obj._id.billingParty][key] = {outstandingSum: (massagedData[name][obj._id.customer][obj._id.billingParty][key].outstandingSum || 0),overdueSum: (massagedData[name][obj._id.customer][obj._id.billingParty][key].overdueSum || 0)};
					// obj[key] = obj[key] || {};
					// obj[key] = {outstandingSum: 0,overdueSum: 0};
				}
			}
			// massagedData[oData._id][obj._id.customer].push(obj);
		 })
	});
	Object.values(massagedData).forEach(type=> {
		Object.values(type).forEach(customer => {
			Object.values(customer).forEach(bp => {
				aOnAcc.forEach((onAc, index)=>{
					if(bp.bpAccount && onAc._id.toString() === bp.bpAccount.toString()) {
						bp.onAccount = onAc.amount;
						aOnAcc.splice(index, 1);
					}
				})
			});
		});
	});
	let fobj = {}
	fobj.data ={};
	fobj.data.massagedData = massagedData;
	fobj.aData = aData;
	return fobj;
	// return Object.values(data.massagedData);
};

module.exports.billLedgerOutstandingPeriodWiseReport = async function (body, req) {

	let asOnDate = body.asOnDate ? new Date(body.asOnDate) : new Date(body.to);
	let from = new Date(body.from);
	let to = new Date(body.to);
	const DAYS_30 = 30 * 24 * 60 * 60 * 1000;
	const DEFAULT_CREDIT_DAY = 30;
	const CURRENT_FY = getFirstDateOfFY(asOnDate);
	const LAST_FY = CURRENT_FY.add(-1, 'year');
	const SIX_FORMAT = ({
		'04': ['04'],
		'05': ['05','04'],
		'06': ['06','05','04'],
		'07': ['07','06','05','04'],
		'08': ['08','07','06','05','04'],
		'09': ['09','08','07','06','05','04'],
		'10': ['10','09','08','07','06',['04','05']],
		'11': ['11','10','09','08','07',['04','05','06']],
		'12': ['12','11','10','09',['07','08'],['04','05','06']],
		'01': ['01','12','11','10',['07','08','09'],['04','05','06']],
		'02': ['02','01','12',['10','11'],['07','08','09'],['04','05','06']],
		'03': ['03','02','01',['10','11','12'],['07','08','09'],['04','05','06']],
	})[moment(asOnDate).format("MM")].reverse();
	let aGroupMonth = groupMonth(from, to);
	let header = [...aGroupMonth.keys()].reverse();
	let aMonth = prepMonth(moment(from), moment(to));
	let last3Month = aMonth.slice(-3);

	try {

		body.aCustomer =  [];

		if(body.customer)
			body.aCustomer.push(body.customer);

		if(body.category){
			let oCustomer = await customerModel.find({category: {$in :body.category}});

			if(oCustomer){
				oCustomer.forEach(obj=>{
					body.aCustomer.push(obj._id);
				})
			}
		}


		if (body.aCustomer && body.aCustomer.length) {
			let aCustomer = Array.isArray(body.aCustomer) ? body.aCustomer : [body.aCustomer];
			let aBillingParty = await billingPartyService.getBillingParty({
				customer: {$in: otherUtil.arrString2ObjectId(aCustomer)}
			}, {
				_id: 1,
				name: 1,
				account: 1,
			});
			body.billingParty = aBillingParty.map(o => o._id.toString());
		}

		let category = body.category;

		body.clientId = req.user.clientId;
		let oPFil = constructFilter(body);
		const aggrQuery = [
			{"$match": oPFil},
			{
				$project: {
					clientId: 1,
					billDate: 1,
					submissionDate: 1,
					dueDate: 1,
					receiving: 1,
					billNo: 1,
					amount: 1,
					billAmount: 1,
					billingParty: 1,
					"creditDays": {"$ifNull": ["$contract.creditDays", DEFAULT_CREDIT_DAY]}
				}
			},
			{
				"$addFields": {
					"submissionDate": {"$ifNull": ["$submitionDate", "$billDate",]},
					"dueDate": {
						"$ifNull": [
							"$dueDate",
							{
								"$add": [
									{"$ifNull": ["$submitionDate", "$billDate"]},
									{
										$multiply: [
											"$creditDays",
											24 * 60 * 60 * 1000
										]
									}
								]
							}
						]
					},
					"receivedAmt": {
						"$add": [
							{
								"$reduce": {
									"input": "$receiving.moneyReceipt",
									"initialValue": 0,
									"in": {
										"$add": [
											"$$value",
											"$$this.amount"
										]
									}
								}
							},
							{
								"$reduce": {
									"input": "$receiving.deduction",
									"initialValue": 0,
									"in": {
										"$add": [
											"$$value",
											{
												"$cond": {
													"if": {
														"$ifNull": [
															"$$this.mrRef",
															false
														]
													},
													"then": 0,
													"else": {
														"$ifNull": [
															"$$this.amount",
															0
														]
													}
												}
											}
										]
									}
								}
							}
						]
					},
				}
			},
			{
				"$project": {
					"clientId": 1,
					"billNo": 1,
					"billDate": 1,
					"billingParty": 1,
					"amount": 1,
					"billAmount": 1,
					"creditDays": 1,
					"remainingAmt": {
						"$subtract": [
							"$billAmount",
							"$receivedAmt"
						]
					},
					"dueDate": 1,
					"submissionDate": 1,
					"billMY": {
						"$dateToString": {
							"date": "$billDate",
							"format": "%m-%Y",
							"timezone": "Asia/Kolkata"
						}
					},
					"subMY": {
						"$dateToString": {
							"date": "$submissionDate",
							"format": "%m-%Y",
							"timezone": "Asia/Kolkata"
						}
					},
					"dueMY": {
						"$dateToString": {
							"date": "$dueDate",
							"format": "%m-%Y",
							"timezone": "Asia/Kolkata"
						}
					}
				}
			},
			{
				"$group": {
					"_id": "$billingParty",
					aBill: {$push: "$$ROOT"},
					"billingParty": {
						"$first": "$billingParty"
					},
					"clientId": {
						"$first": "$clientId"
					}
				}
			},
			{$lookup: {from: 'billingparties', localField: 'billingParty', foreignField: '_id', as: 'billingParty'}},
			{
				"$unwind": {
					"path": "$billingParty",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				$group: {
					_id: "$billingParty.customer",
					aBp: {
						$push: "$$ROOT"
					}
				}
			},
			{$lookup: {from: 'customers', localField: '_id', foreignField: '_id', as: 'customer'}},
			{
				"$unwind": {
					"path": "$customer",
					"preserveNullAndEmptyArrays": true
				}
			},
			{$lookup: {from: 'branches', localField: 'customer.branch', foreignField: '_id', as: 'customer.branch'}},
			{
				"$unwind": {
					"path": "$customer.branch",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				$sort: {
					"customer.name":1
				}
			},
			{
				"$group": {
					"_id": "$customer.category",
					"aCust": {
						"$push": "$$ROOT"
					}
				}
			},
			{
				$sort: {
					"_id": 1
				}
			}
		];
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
		let aFoundData = await serverSidePage.requestData(Bill, oQuery);
		let aRow = [];
		let bills = 0;

		let oBpAcc = {};

		aFoundData.forEach(oCategory => {
			oCategory.aCust.forEach(oCustomer => {
				oCustomer.aBp.forEach(oBp => {
					let obj = {};
					oBpAcc[oBp.billingParty.account] = obj; //oBp;
					obj.category = oCategory._id;
					obj.customer = oCustomer.customer.name;
					obj.branch = oCustomer.customer.branch && oCustomer.customer.branch.name;
					obj.billingParty = oBp.billingParty.name;
					obj.creditDays = oBp.aBill[0].creditDays;
					obj.oMonth = {};
					obj.last3Outstanding = 0;
					obj.totOutstanding = 0;
					obj.totOverDue = 0;
					obj.totRevenue = 0;

					oBp.aBill.forEach(oBill => {

						let subDate = moment(oBill.submissionDate);
						let dueDate = moment(oBill.dueDate);
						let billDate = moment(oBill.billDate);
						aGroupMonth.forEach((v,k) => {
							obj.oMonth[k] = obj.oMonth[k] || {
								outstanding: 0,
								overDue: 0,
								revenue: 0,
							}

							if(moment(subDate).isBetween(v.from, v.to, undefined, '[)')) {
								obj.oMonth[k].outstanding += oBill.remainingAmt || 0;
								obj.totOutstanding += oBill.remainingAmt || 0;
							}

							if(moment(dueDate).isBetween(v.from, v.to, undefined, '[)')) {
								obj.oMonth[k].overDue += oBill.remainingAmt || 0;
								obj.totOverDue += oBill.remainingAmt || 0;
							}

							if(moment(billDate).isBetween(v.from, v.to, undefined, '[)')) {
								obj.oMonth[k].revenue += oBill.amount || 0;
								obj.totRevenue += oBill.amount || 0;
							}
						});

						if(last3Month.indexOf(oBill.subMY) != -1)
							obj.last3Outstanding += oBill.billAmount || 0;

					});

					aRow.push(obj);
				});
			});
		});
		delete aFoundData;
		let aOnAcc = await onAccountQuery({account: otherUtil.arrString2ObjectId(Object.keys(oBpAcc))}, req);
		aOnAcc.forEach(o => {
			if(oBpAcc[o._id.toString()])
				oBpAcc[o._id.toString()].onAcc = o.amount;
		});
		delete oBpAcc;

		return new Promise((resolve, reject) => {
			ReportExcelService.billLedgerOutstandingPeriodWiseReport(aRow, header, {from, to, category, clientId: body.clientId}, function (data) {
				resolve(data.url);
			});
		});

	} catch (e) {
		throw e;
	}

	function prepMonth(from, to){
		let arr = [];
		while(from.isBefore(to)){
			arr.push(from.format('MM-YYYY'));
			from = from.add(1, 'month');
		}
		return arr;
	}

	function groupMonth(from, to){
		let mFrom = moment(from);
		let mTo = moment(to);
		let aMonth = prepMonth(mFrom.clone(), mTo.clone()).reverse();
		let oDate = new Map();
		const FY = getFirstDateOfFY(moment(aMonth[0], 'MM-YYYY'));
		const LFY = FY.clone().add(-1, 'year');
		aMonth.forEach(s => {
			let date = moment(s, 'MM-YYYY');
			let f;
			let l;
			if(moment(s, 'MM-YYYY').isSameOrAfter(FY)){
				let month = date.format('MM');
				let year = date.format('YYYY');
				let key;
				SIX_FORMAT.find(any => {
					if(Array.isArray(any) && any.indexOf(month) != -1){
						f = moment(`${any[0]}-${any[0] < 3 ? year+1 : year}`, 'MM-YYYY');
						l = moment(`${any.slice(-1)[0]}-${any.slice(-1)[0] < 3 ? year+1 : year}`, 'MM-YYYY').endOf('month');
						return true;
					}else if(month === any){
						f = moment(`${any}-${any < 3 ? year+1 : year}`, 'MM-YYYY');
						l = moment(`${any}-${any < 3 ? year+1 : year}`, 'MM-YYYY').endOf('month');
						return true;
					}
					return false;
				});
			}else if(moment(s, 'MM-YYYY').isSameOrAfter(LFY)){
				let year = LFY.format('YYYY');
				let f1 = quarterToDate(1, year, true);
				let f2 = quarterToDate(2, year, true);
				let f3 = quarterToDate(3, year, true);
				let f4 = quarterToDate(4, year, true);
				let key;
				if(date.isSameOrBefore(f1)){
					f = f1.clone().startOf('quarter');
					l = f1;
				}else if(date.isSameOrBefore(f2)){
					f = f2.clone().startOf('quarter');
					l = f2;
				}else if(date.isSameOrBefore(f3)){
					f = f3.clone().startOf('quarter');
					l = f3;
				}else if(date.isSameOrBefore(f4)){
					f = f4.clone().startOf('quarter');
					l = f4;
				}
			}else{
				let year = moment(s, 'MM-YYYY').format('YYYY');
				f = getFirstDateOfFY(moment(year, 'YYYY'));
				l = getLastDateOfFY(moment(year, 'YYYY'));
			}

			f = moment.max([f, mFrom]);
			l = moment.min([l, mTo]);

			oDate.set(f.format('DD-MM-YYYY') + ' TO ' + l.format('DD-MM-YYYY'), {
				from: f,
				to: l
			});
		});

		return oDate;
	}

	function getFirstDateOfFY(date){
		date = moment(date);
		let year;
		if(date.format('MM') <= 3){
			year = moment(date).format('YYYY') - 1;
		}else{
			year = moment(date).format('YYYY');
		}
		return moment(`01/04/${year}`, 'DD/MM/YYYY');
	}

	function getLastDateOfFY(date){
		date = moment(date);
		let year;
		if(date.format('MM') > 3){
			year = moment(date).format('YYYY') + 1;
		}else{
			year = moment(date).format('YYYY');
		}
		return moment(`31/03/${year}`, 'DD/MM/YYYY').endOf('day');
	}

	function dateToQuarter(date) {
		const INDIAN_QUARTER = {
			1:4,
			2:1,
			3:2,
			4:3
		}
		return INDIAN_QUARTER[moment(date).quarter()];
	}

	function quarterToDate(quarter, year, type = false) {
		const INTERNATIONAL_QUARTER = {
			4:1,
			1:2,
			2:3,
			3:4
		};

		return moment().quarter(INTERNATIONAL_QUARTER[quarter])[type ? 'endOf' : 'startOf']('quarter').set('year', quarter === 4 ? (+year + 1) : year);
	}
};

module.exports.getAllBills = function (reqBody, next) {
	reqBody.queryFilter = constructFilters(reqBody);
	reqBody.sort = reqBody.sort || {_id: -1};
	if (reqBody.dateType) {
		reqBody.sort[reqBody.dateType] = -1;
	}
	// delete ffFilters.start_date;
	// delete ffFilters.end_date;
	// req.queryFilter = ffFilters;
	otherUtil.findPagination(Bill, reqBody, next);
};

module.exports.getAllBillsAggr = async function (reqBody, next) {
	try {
		let oFilter = constructFilters(reqBody);

		if(oFilter.billNo && reqBody.isBillRegexDisable)
			oFilter.billNo = reqBody.billNo;

		if (!oFilter.status) {
			oFilter.status = {$not: {$eq: 'Cancelled'}};
		}

		let sort = reqBody.sort || {billNoInt: 1};

		let aggrPipe = [
			{$match: oFilter},
			{$sort: sort}
		];

		if (!reqBody.skip)
			reqBody.skip = 1;

		if (reqBody.start_date && reqBody.end_date && moment(reqBody.end_date).diff(reqBody.start_date, 'days', true) < 5) {
			reqBody.no_of_docs = 100;
		}
		if (reqBody.all)
			reqBody.no_of_docs = Number.MAX_SAFE_INTEGER;
		else
			reqBody.no_of_docs = reqBody.no_of_docs || 10;

		let grFilter = constructGRFilters(reqBody);
		let bpFilter = constructBPFilters(reqBody);

		// if (!Object.keys(grFilter).length && !Object.keys(bpFilter).length) {
		// 	aggrPipe.push(
		// 		{$skip: (reqBody.no_of_docs * reqBody.skip) - reqBody.no_of_docs},
		// 		{$limit: reqBody.no_of_docs}
		// 	);
		// }
		aggrPipe.push(
			{$lookup: {from: 'billingparties', localField: 'billingParty', foreignField: '_id', as: 'billingParty'}},
			{$unwind: {path: '$billingParty', preserveNullAndEmptyArrays: true}}
		);


		if (Object.keys(bpFilter).length)
			aggrPipe.push({$match: bpFilter});

		if (Array.isArray(reqBody.populate) && reqBody.populate.indexOf('acknowledge.voucher') + 1) {
			aggrPipe.push(
				{
					$lookup: {
						from: 'vouchers',
						localField: 'acknowledge.voucher',
						foreignField: '_id',
						as: 'acknowledge.voucher'
					}
				},
				{$unwind: {path: '$acknowledge.voucher', preserveNullAndEmptyArrays: true}}
			);

			aggrPipe.push({$match: constructVchFilters(reqBody)});
		}

		aggrPipe.push(
			{$unwind: {path: '$items', preserveNullAndEmptyArrays: true}},
			{$lookup: {from: 'tripgrs', localField: 'items.gr', foreignField: '_id', as: 'items.gr'}},
			{$unwind: {path: '$items.gr', preserveNullAndEmptyArrays: true}},
		);

		if (Object.keys(grFilter).length > 0) {
			aggrPipe.push({$match: grFilter});
		}

		aggrPipe.push(
			{
				$lookup: {
					from: 'customers',
					localField: 'items.gr.customer',
					foreignField: '_id',
					as: 'items.gr.customer'
				}
			},
			{$unwind: {path: '$items.gr.customer', preserveNullAndEmptyArrays: true}},
			// {$skip: (reqBody.no_of_docs * reqBody.skip) - reqBody.no_of_docs},
			// {$limit: reqBody.no_of_docs}
		);
		aggrPipe.push(
			{
				$lookup: {
					from: 'branches',
					localField: 'branch',
					foreignField: '_id',
					as: 'branch'
				}
			},
			{$unwind: {path: '$branch', preserveNullAndEmptyArrays: true}},
		);

		Array.isArray(reqBody.populate) && reqBody.populate.forEach(toPop => {
			switch (toPop) {
				case 'consignor':
					aggrPipe.push(
						{
							$lookup: {
								from: 'consignor_consignees',
								localField: 'items.gr.consignor',
								foreignField: '_id',
								as: 'items.gr.consignor'
							}
						},
						{$unwind: {path: '$items.gr.consignor', preserveNullAndEmptyArrays: true}},
					);
					break;

				case 'consignee':
					aggrPipe.push(
						{
							$lookup: {
								from: 'consignor_consignees',
								localField: 'items.gr.consignee',
								foreignField: '_id',
								as: 'items.gr.consignee'
							}
						},
						{$unwind: {path: '$items.gr.consignee', preserveNullAndEmptyArrays: true}},
					);
					break;

				case 'vehicle':
					aggrPipe.push(
						{
							$lookup: {
								from: 'registeredvehicles',
								localField: 'items.gr.vehicle',
								foreignField: '_id',
								as: 'items.gr.vehicle'
							}
						},
						{$unwind: {path: '$items.gr.vehicle', preserveNullAndEmptyArrays: true}},
					);
					break;

				case 'billingParty.account':
					aggrPipe.push(
						{
							$lookup: {
								from: 'accounts',
								localField: 'billingParty.account',
								foreignField: '_id',
								as: 'billingParty.account'
							}
						},
						{$unwind: {path: '$billingParty.account', preserveNullAndEmptyArrays: true}},
					);
					break;
					id = "my_fixable_table_header"

				case 'billingParty.withHoldAccount':
					aggrPipe.push(
						{
							$lookup: {
								from: 'accounts',
								localField: 'billingParty.withHoldAccount',
								foreignField: '_id',
								as: 'billingParty.withHoldAccount'
							}
						},
						{$unwind: {path: '$billingParty.withHoldAccount', preserveNullAndEmptyArrays: true}},
					);
					break;
			}
		});

		if (Array.isArray(reqBody.populate) && reqBody.populate.indexOf('creditNote') + 1) {
			aggrPipe.push(
				{
					$lookup: {
						from: 'creditnotes',
						localField: 'receiving.deduction.cNoteRef',
						foreignField: '_id',
						as: 'creditNote'
					},
				},
				{
					"$unwind": {
						"path": '$creditNote', preserveNullAndEmptyArrays: true

					}
				},
			);
		}

		aggrPipe.push(
			{
				$group: {
					_id: "$_id",
					items: {$push: "$items"},
					acknowledge: {$first: "$acknowledge"},
					billDate: {$first: "$billDate"},
					creditNo: {$first: "$creditNote.creditNo"},
					category: {$first: "$creditNote.category"},
					billNo: {$first: "$billNo"},
					billNoInt: {$first: "$billNoInt"},
					billingParty: {$first: "$billingParty"},
					branch: {$first: "$branch"},
					branchName: {$first: "$branchName"},
					receiving: {$first: "$receiving"},
					cGST: {$first: "$cGST"},
					cGST_percent: {$first: "$cGST_percent"},
					clientId: {$first: "$clientId"},
					created_at: {$first: "$created_at"},
					created_by_name: {$first: "$created_by_name"},
					dueDate: {$first: "$dueDate"},
					submitionDate: {$first: "$submitionDate"},
					last_modified_at: {$first: "$last_modified_at"},
					last_modified_by: {$first: "$last_modified_by"},
					iGST: {$first: "$iGST"},
					iGST_percent: {$first: "$iGST_percent"},
					remarks: {$first: "$remarks"},
					refNo: {$first: "$refNo"},
					sGST: {$first: "$sGST"},
					sGST_percent: {$first: "$sGST_percent"},
					stationaryId: {$first: "$stationaryId"},
					totalAmount: {$first: "$totalAmount"},
					billAmount: {$first: "$billAmount"},
					amount: {$first: "$amount"},
					totCwt: {$first: "$totCwt"},
					adjAmount: {$first: "$adjAmount"},
					tripNo: {$first: "$tripNo"},
					vehicle_no: {$first: "$vehicle_no"},
					type: {$first: "$type"},
					status: {$first: "$status"},
					coverNote: {$first: "$coverNote"},
					salesAccountName: {$first: "$salesAccountName"},
					salesAccount: {$first: "$salesAccount"},
					iGSTAccountName: {$first: "$iGSTAccountName"},
					iGSTAccount: {$first: "$iGSTAccount"},
					cGSTAccountName: {$first: "$cGSTAccountName"},
					cGSTAccount: {$first: "$cGSTAccount"},
					sGSTAccountName: {$first: "$sGSTAccountName"},
					sGSTAccount: {$first: "$sGSTAccount"},
					documents: {$first: "$documents"},
					multiBill: {$first: "$multiBill"},
					adjDebitAc: {$first: "$adjDebitAc"},
					adjDebitAcName: {$first: "$adjDebitAcName"},
					sacCode: {$first: "$sacCode"},
				}
			},

			{
				"$addFields": {
					"amountRecM": {
						"$reduce": {
							input: "$receiving.moneyReceipt",
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
					"amountRecD": {
						"$reduce": {
							input: "$receiving.deduction",
							initialValue: 0,
							in: {
								"$add": ["$$value", {
									$cond: {
										if: {"$ifNull": ["$$this.mrRef", false]},
										then: 0,
										else: {"$ifNull": ["$$this.amount", 0]}
									}
								}]
							}
						}
					}
				}
			},

			{
				"$addFields": {
					"recAmt": {
						"$add": ["$amountRecM", "$amountRecD"]
					}
				}
			},
			{
				"$addFields": {
					"totDueAmt": {
						"$subtract": ["$recAmt", "$billAmount"]
					}
				}
			},

			{$sort: sort}
		);

		if (reqBody.project && reqBody.project.length) {
			aggrPipe.push({
				$project: reqBody.project.reduce((obj, o) => {
					obj[o] = 1;
					return obj;
				}, {})
			})
		}

		if (reqBody.skip) {
			aggrPipe.push({$skip: ((reqBody.no_of_docs * reqBody.skip) - reqBody.no_of_docs)});
		}
		if (reqBody.no_of_docs) {
			aggrPipe.push({$limit: reqBody.no_of_docs});
		}

		const aggrData = await BillNew.aggregate(aggrPipe).allowDiskUse(true);
		return {
			data: aggrData,
		};
	} catch (e) {
		throw(e)
	}

};

module.exports.getAllPurchaseBills = async function (reqBody, next) {
	if(!reqBody.download) {
		reqBody.no_of_docs = reqBody.no_of_docs || 10;
		reqBody.skip = reqBody.skip || 1;
	}
	let oPFil = constructFilterOfPurchaseBill(reqBody);

	const aggrQuery = [
		{$match: oPFil},
		{$sort: {_id: -1}},
		{$skip: ((reqBody.no_of_docs * reqBody.skip) - reqBody.no_of_docs)},
		{$limit: reqBody.no_of_docs},
		{$lookup: {from: 'vendortransports', localField: 'vendor', foreignField: '_id', as: 'vendor'}},
		{$unwind: {path: '$vendor', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'branches', localField: 'branch', foreignField: '_id', as: 'branch'}},
		{$unwind: {path: '$branch', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'accounts', localField: 'account', foreignField: '_id', as: 'account'}},
		{$unwind: {path: '$account', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'accounts', localField: 'from_account', foreignField: '_id', as: 'from_account'}},
		{$unwind: {path: '$from_account', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'accounts', localField: 'adjDebitAc', foreignField: '_id', as: 'adjDebitAc'}},
		{$unwind: {path: '$adjDebitAc', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'accounts', localField: 'igstAcnt', foreignField: '_id', as: 'igstAcnt'}},
		{$unwind: {path: '$igstAcnt', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'accounts', localField: 'sgstAcnt', foreignField: '_id', as: 'sgstAcnt'}},
		{$unwind: {path: '$sgstAcnt', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'accounts', localField: 'cgstAcnt', foreignField: '_id', as: 'cgstAcnt'}},
		{$unwind: {path: '$cgstAcnt', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'tripadvances', localField: 'items', foreignField: '_id', as: 'items'}},
		{$lookup: {from: 'dues', localField: 'duesBillItems', foreignField: '_id', as: 'duesBillItems'}},
		{$lookup: {from: 'vouchers', localField: 'plainVoucher', foreignField: '_id', as: 'plainVoucher'}},
		{$unwind: {path: '$plainVoucher', preserveNullAndEmptyArrays: true}},
		{
			$addFields:{
				"IGST0":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.iGSTPercent",0]},
									then:"$$this.iGST",
									else:"$$value"
								}}}
					}},
				"IGST5":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.iGSTPercent",5]},
									then:"$$this.iGST",
									else:"$$value"
								}}}
					}},
				"IGST12":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.iGSTPercent",12]},
									then:"$$this.iGST",
									else:"$$value"
								}}}
					}},
				"IGST18":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.iGSTPercent",18]},
									then:"$$this.iGST",
									else:"$$value"
								}}}
					}},
				"IGST28":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.iGSTPercent",28]},
									then:"$$this.iGST",
									else:"$$value"
								}}}
					}},
				"SGST0":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.sGSTPercent",0]},
									then:"$$this.sGST",
									else:"$$value"
								}}}
					}},
				"SGST25":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.sGSTPercent", 2.5]},
									then:"$$this.sGST",
									else:"$$value"
								}}}
					}},
				"SGST6":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.sGSTPercent",6]},
									then:"$$this.sGST",
									else:"$$value"
								}}}
					}},
				"SGST9":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.sGSTPercent",9]},
									then:"$$this.sGST",
									else:"$$value"
								}}}
					}},
				"SGST14":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.sGSTPercent",14]},
									then:"$$this.sGST",
									else:"$$value"
								}}}
					}},
				"CGST0":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.cGSTPercent",0]},
									then:"$$this.cGST",
									else:"$$value"
								}}}
					}},
				"CGST25":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.cGSTPercent",2.5]},
									then:"$$this.cGST",
									else:"$$value"
								}}}
					}},
				"CGST6":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.cGSTPercent",6]},
									then:"$$this.cGST",
									else:"$$value"
								}}}
					}},
				"CGST9":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.cGSTPercent",9]},
									then:"$$this.cGST",
									else:"$$value"
								}}}
					}},
				"CGST14":{$reduce:{
						input:"$materialItems",
						initialValue:0,
						in:{$sum:{$cond:{if:{$eq:["$$this.cGSTPercent",14]},
									then:"$$this.cGST",
									else:"$$value"
								}}}
					}},
			}}
	];
	let acGroup = {};
	if (reqBody.accountGroup) {
		if (reqBody.accountGroup && reqBody.accountGroup != "undefined" && reqBody.accountGroup.length > 0) {
			acGroup['from_account.type._id'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(reqBody.accountGroup) ? reqBody.accountGroup : [reqBody.accountGroup])};
		}
		aggrQuery.push({$match: acGroup}
		);
	}
	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let aData = await serverSidePage.requestData(PurchaseBillNew, oQuery);

	return aData;

	// const aggrCursor = PurchaseBillNew.aggregate(aggrQuery);
	// aggrCursor.options = {allowDiskUse: true, batchSize: 1000};
	// aggrCursor.exec(function (err, aData) {
	// 	if (err) {
	// 		return next(err);
	// 	}
	// 	next(null, {data: aData});
	// });
};

// module.exports.getAllPurchaseBillsByGroup = function (reqBody, next) {
// 	reqBody.no_of_docs = reqBody.no_of_docs || 10;
// 	reqBody.skip = reqBody.skip || 1;
//
// 	if (reqBody.download && ['combineDiesel', 'combineDieselLtr'].indexOf(reqBody.download) != -1) {
// 		let oFilter = constructFilterOfTripAdvParty(reqBody);
// 		let acGroup = {};
// 		oFilter.advanceType = reqBody.advanceType;
// 		let findFualComp = {};
// 		if (reqBody.fuelCompany && reqBody.fuelCompany.length > 0) {
// 			findFualComp = {"vendorFual.fuel_company": {"$in": reqBody.fuelCompany}};
// 		}
// 		const aggrQuery = [{$match: oFilter}];
// 		if (reqBody.accountGroup) {
// 			if (reqBody.accountGroup && reqBody.accountGroup != "undefined" && reqBody.accountGroup.length > 0) {
// 				acGroup['from_account.type._id'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(reqBody.accountGroup) ? reqBody.accountGroup : [reqBody.accountGroup])};
// 			}
// 			aggrQuery.push(
// 				{$lookup: {from: 'accounts', localField: 'from_account', foreignField: '_id', as: 'from_account'}},
// 				{$unwind: {path: '$from_account', preserveNullAndEmptyArrays: true}},
// 				{
// 					$match: acGroup
// 				});
// 		}
// 		aggrQuery.push({
// 				"$lookup": {
// 					"from": "vendorfuels",
// 					"localField": "dieseInfo.vendor",
// 					"foreignField": "_id",
// 					"as": "vendorFual"
// 				}
// 			},
// 			{
// 				"$unwind": {
// 					"path": "$vendorFual",
// 					"preserveNullAndEmptyArrays": true
// 				}
// 			},
// 			{
// 				"$match": findFualComp
// 			},
// 			{
// 				"$project": {
// 					"vendorFual": 1,
// 					"date": 1,
// 					"dieseInfo": 1,
// 				}
// 			},
// 			{
// 				"$group": {
// 					"_id": {
// 						"vendorFual": "$vendorFual",
// 						"m": {
// 							$month: {date: "$date", timezone: 'Asia/Kolkata'}
// 						},
// 						"y": {
// 							$year: {date: "$date", timezone: 'Asia/Kolkata'}
// 						}
// 					},
// 					"totQty": {
// 						"$sum": "$dieseInfo.litre"
// 					},
// 					"totAmt": {
// 						"$sum": {"$multiply": ["$dieseInfo.rate", "$dieseInfo.litre"]}
// 					},
//
// 					"month": {
// 						"$first": {
// 							$month: {date: "$date", timezone: 'Asia/Kolkata'}
// 						}
// 					},
// 					"year": {
// 						"$first": {
// 							$year: {date: "$date", timezone: 'Asia/Kolkata'}
// 						}
// 					},
// 					"vendorFual": {
// 						"$first": "$vendorFual"
// 					},
// 					"aData": {
// 						"$push": "$$ROOT"
// 					}
//
//
// 				}
// 			},
// 			{
// 				"$project": {
// 					"vendorFual.name": 1,
// 					"vendorFual.fuel_company": 1,
// 					"vendorFual.address": 1,
// 					"totQty": 1,
// 					"totAmt": 1,
// 					"month": 1,
// 					"year": 1
// 				}
// 			},
// 			{
// 				"$group": {
// 					"_id": "$vendorFual",
// 					"monthwise": {
// 						"$push": "$$ROOT"
// 					},
// 					"vendorFualName": {
// 						"$first": "$vendorFual.name"
// 					},
// 					"vendorFualComp": {
// 						"$first": "$vendorFual.fuel_company"
// 					},
// 					"state": {
// 						"$first": "$vendorFual.address.state"
// 					},
// 					"city": {
// 						"$first": "$vendorFual.address.city"
// 					}
// 				}
// 			},
// 			{
// 				"$sort": {
// 					"vendorFualComp": -1
// 				}
// 			});
//
// 		const aggrCursor = TripAdvance.aggregate(aggrQuery);
// 		aggrCursor.options = {allowDiskUse: true, batchSize: 1000};
// 		aggrCursor.exec(function (err, aData) {
// 			if (err) {
// 				return next(err);
// 			}
// 			next(null, {data: aData});
// 		});
//
// 	}
// 	else if (reqBody.download && ['combineDieselDaywise', 'combineDieselLtrDaywise'].indexOf(reqBody.download) != -1) {
// 		let oFilter = constructFilterOfTripAdvParty(reqBody);
// 		let acGroup = {};
// 		oFilter.advanceType = reqBody.advanceType;
// 		let findFualComp = {};
// 		if (reqBody.fuelCompany && reqBody.fuelCompany.length > 0) {
// 			findFualComp = {"vendorFual.fuel_company": {"$in": reqBody.fuelCompany}};
// 		}
// 		const aggrQuery = [{$match: oFilter}];
// 		if (reqBody.accountGroup) {
// 			if (reqBody.accountGroup && reqBody.accountGroup != "undefined" && reqBody.accountGroup.length > 0) {
// 				acGroup['from_account.type._id'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(reqBody.accountGroup) ? reqBody.accountGroup : [reqBody.accountGroup])};
// 			}
// 			aggrQuery.push(
// 				{$lookup: {from: 'accounts', localField: 'from_account', foreignField: '_id', as: 'from_account'}},
// 				{$unwind: {path: '$from_account', preserveNullAndEmptyArrays: true}},
// 				{
// 					$match: acGroup
// 				});
// 		}
// 		aggrQuery.push({
// 				"$lookup": {
// 					"from": "vendorfuels",
// 					"localField": "dieseInfo.vendor",
// 					"foreignField": "_id",
// 					"as": "vendorFual"
// 				}
// 			},
// 			{
// 				"$unwind": {
// 					"path": "$vendorFual",
// 					"preserveNullAndEmptyArrays": true
// 				}
// 			},
// 			{
// 				"$match": findFualComp
// 			},
// 			{
// 				"$project": {
// 					"vendorFual": 1,
// 					"date": 1,
// 					"dieseInfo": 1,
// 				}
// 			},
// 			{
// 				"$group": {
// 					"_id": {
// 						"vendorFual": "$vendorFual",
// 						"d": {
// 							"$dayOfMonth": {date: "$date", timezone: 'Asia/Kolkata'}
// 						},
// 						"m": {
// 							$month: {date: "$date", timezone: 'Asia/Kolkata'}
// 						},
// 						"y": {
// 							$year: {date: "$date", timezone: 'Asia/Kolkata'}
// 						}
// 					},
// 					"totQty": {
// 						"$sum": "$dieseInfo.litre"
// 					},
// 					"totAmt": {
// 						"$sum": {
// 							"$multiply": [
// 								"$dieseInfo.rate",
// 								"$dieseInfo.litre"
// 							]
// 						}
// 					},
// 					"day": {
// 						"$first":{
// 							"$dayOfMonth": {date: "$date", timezone: 'Asia/Kolkata'}
// 						}
// 					},
// 					"month": {
// 						"$first": {
// 							$month: {date: "$date", timezone: 'Asia/Kolkata'}
// 						}
// 					},
// 					"year": {
// 						"$first": {
// 							$year: {date: "$date", timezone: 'Asia/Kolkata'}
// 						}
// 					},
// 					"vendorFual": {
// 						"$first": "$vendorFual"
// 					},
// 					"aData": {
// 						"$push": "$$ROOT"
// 					}
// 				}
// 			},
// 			{
// 				"$project": {
// 					"vendorFual.name": 1,
// 					"vendorFual.fuel_company": 1,
// 					"vendorFual.address": 1,
// 					"totQty": 1,
// 					"totAmt": 1,
// 					"day": 1,
// 					"month": 1,
// 					"year": 1
// 				}
// 			},
// 			{
// 				"$group": {
// 					"_id": "$vendorFual",
// 					"monthwise": {
// 						"$push": "$$ROOT"
// 					},
// 					"vendorFualName": {
// 						"$first": "$vendorFual.name"
// 					},
// 					"vendorFualComp": {
// 						"$first": "$vendorFual.fuel_company"
// 					},
// 					"state": {
// 						"$first": "$vendorFual.address.state"
// 					},
// 					"city": {
// 						"$first": "$vendorFual.address.city"
// 					}
// 				}
// 			},
// 			{
// 				"$sort": {
// 					"vendorFualComp": 1
// 				}
// 			}
// 		);
//
// 		const aggrCursor = TripAdvance.aggregate(aggrQuery);
// 		aggrCursor.options = {allowDiskUse: true, batchSize: 1000};
// 		aggrCursor.exec(function (err, aData) {
// 			if (err) {
// 				return next(err);
// 			}
// 			next(null, {data: aData});
// 		});
//
// 	}
// 	else {
// 		let oFilter = constructFilterOfPurchaseBill(reqBody);
// 		let acGroup = {};
// 		if (reqBody.accountGroup) {
// 			if (reqBody.accountGroup && reqBody.accountGroup != "undefined" && reqBody.accountGroup.length > 0) {
// 				acGroup['from_account.type._id'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(reqBody.accountGroup) ? reqBody.accountGroup : [reqBody.accountGroup])};
// 			}
// 		}
// 		const aggrQuery = [
// 			{$match: oFilter},
// 			{$lookup: {from: 'accounts', localField: 'from_account', foreignField: '_id', as: 'from_account'}},
// 			{$unwind: {path: '$from_account', preserveNullAndEmptyArrays: true}},
// 			{$match: acGroup},
// 			{
// 				$project: {
// 					billNo: 1,
// 					amount: '$billAmount',
// 					from_account: 1,
// 					billDate: 1,
// 					account: 1,
// 					totItem: 1,
// 					totDiscount: 1,
// 					qty: '$ltr',
// 					// 'items': 1
// 				}
// 			},
// 			{$sort: {'from_account.name': -1}},
// 			{
// 				$group: {
// 					_id: {from_account: '$from_account', m: {$month: '$billDate'}, y: {$year: '$billDate'}},
// 					totQty: {$sum: '$qty'},
// 					totAmt: {$sum: '$amount'},
// 					month: {$first: {$month: '$billDate'}},
// 					year: {$first: {$year: '$billDate'}},
// 					billAc: {$first: "$from_account"},
// 					aData: {$push: '$$ROOT'}
// 				}
// 			},
// 			{$project: {'billAc.name': 1, 'billAc.type.name': 1, totQty: 1, totAmt: 1, month: 1, year: 1}},
// 			{
// 				$group: {
// 					_id: '$billAc',
// 					monthwise: {$push: '$$ROOT'},
// 					billAcc: {$first: '$billAc.name'},
// 					group: {$first: '$billAc.type.name'}
// 				}
// 			},
// 			{$sort: {group: -1}}
// 		];
// 		const aggrCursor = PurchaseBillNew.aggregate(aggrQuery);
// 		aggrCursor.options = {allowDiskUse: true, batchSize: 1000};
// 		aggrCursor.exec(function (err, aData) {
// 			if (err) {
// 				return next(err);
// 			}
// 			next(null, {data: aData});
// 		});
// 	}
// };

module.exports.getAllPurchaseBillsByGroup = function (reqBody, next) {
	reqBody.no_of_docs = reqBody.no_of_docs || 10;
	reqBody.skip = reqBody.skip || 1;
	let acGroup = {}, findFualComp = {};
	let oFilter = constructFilterOfTripAdvParty(reqBody);

	if (reqBody.fuelCompany && reqBody.fuelCompany.length > 0) {
		findFualComp = {"vendor.fuel_company": {"$in": reqBody.fuelCompany}};
	}

//combineDiesel monthwise
	if (reqBody.download && ['combineDiesel', 'combineDieselLtr'].indexOf(reqBody.download) != -1) {
		// let oFilter = constructFilterOfTripAdvParty(reqBody);
		// let acGroup = {};
		// oFilter.advanceType = reqBody.advanceType;
		// let findFualComp = {};
		// if (reqBody.fuelCompany && reqBody.fuelCompany.length > 0) {
		// 	findFualComp = {"vendor.fuel_company": {"$in": reqBody.fuelCompany}};
		// }

		// oFilter.$or = [{advanceType: "Diesel"},
		// 	{"vendorPayment.paymentMode": "Diesel"}];

		const aggrQuery = [{$match: oFilter}];
		if (reqBody.accountGroup) {
			if (reqBody.accountGroup && reqBody.accountGroup != "undefined" && reqBody.accountGroup.length > 0) {
				acGroup['from_account.type._id'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(reqBody.accountGroup) ? reqBody.accountGroup : [reqBody.accountGroup])};
			}
			aggrQuery.push(
				{$lookup: {from: 'accounts', localField: 'from_account', foreignField: '_id', as: 'from_account'}},
				{$unwind: {path: '$from_account', preserveNullAndEmptyArrays: true}},
				{
					$match: acGroup
				});
		}
		aggrQuery.push(
			{
				"$project": {
					"state" :1,
					"_vendorName":"$dieseInfo._vendorName",
					"vendor": "$dieseInfo.vendor",
					"rate": "$dieseInfo.rate",
					"litre": "$dieseInfo.litre",
					"date": {
						"$dateToString": {
							"date": "$date",
							"format": "%m-%Y",
							"timezone": "Asia/Kolkata"
						}
					}
				}
			},
			{
				"$group": {
					"_id": {
						"vendor": "$vendor",
						"date": "$date"
						//	"state": "$state"
					},
					"totQty": {
						"$sum": "$litre"
					},
					"totAmt": {
						"$sum": {
							"$multiply": [
								"$rate",
								"$litre"
							]
						}
					},
					"date": {
						"$first": "$date"
					},
					"vendor": {
						"$first": "$vendor"
					},
					"_vendorName": {
						"$first": "$_vendorName"
					},
					"state" : {
						"$first" : "$state"
					}
				}
			},
			{
				"$lookup": {
					"from": "vendorfuels",
					"localField": "vendor",
					"foreignField": "_id",
					"as": "vendor"
				}
			},
			{
				"$unwind": {
					"path": "$vendor",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$project": {
					"_id": 0,
					"_vendorName":1,
					"vendor._id": 1,
					"vendor.name": 1,
					"vendor.fuel_company": 1,
					"vendor.address": 1,
					"totQty": 1,
					"totAmt": 1,
					"date": 1,
					"AdvState": "$state"
				}
			},
			{
				"$match": findFualComp
			},
			{
				"$group": {
					"_id":{
						"vendorId": "$vendor._id",
						"state": "$AdvState"
					},
					"monthwise": {
						"$push": {
							"date": "$date",
							"amt": "$totAmt",
							"qty": "$totQty"
						}
					},
					"vendorName": {
						"$first": "$vendor.name"
					},
					"_vendorName": {
						"$first": "$_vendorName"
					},
					"vendorComp": {
						"$first": "$vendor.fuel_company"
					},
					"state": {
						"$first": "$vendor.address.state"
					},
					"AdvanceState": {
						"$first": "$AdvState"
					},
					"city": {
						"$first": "$vendor.address.city"
					}
				}
			},
			{
				"$sort": {
					"vendorComp":  1,"vendorName":  1
				}
			});
		//combineDiesel monthwise
		const aggrCursor = TripAdvance.aggregate(aggrQuery);
		aggrCursor.options = {allowDiskUse: true, batchSize: 1000};
		aggrCursor.exec(function (err, aData) {
			if (err) {
				return next(err);
			}
			next(null, {data: aData});
		});

	}
	else if (reqBody.download && ['combineDieselDaywise', 'combineDieselLtrDaywise'].indexOf(reqBody.download) != -1) {
		// let oFilter = constructFilterOfTripAdvParty(reqBody);
		// let acGroup = {};
		// oFilter.advanceType = reqBody.advanceType;
		// let findFualComp = {};
		// if (reqBody.fuelCompany && reqBody.fuelCompany.length > 0) {
		// 	findFualComp = {"vendor.fuel_company": {"$in": reqBody.fuelCompany}};
		// }
		// oFilter.$or = [{advanceType: "Diesel"},
		// 	{"vendorPayment.paymentMode": "Diesel"}];

		const aggrQuery = [{$match: oFilter}];
		if (reqBody.accountGroup) {
			if (reqBody.accountGroup && reqBody.accountGroup != "undefined" && reqBody.accountGroup.length > 0) {
				acGroup['from_account.type._id'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(reqBody.accountGroup) ? reqBody.accountGroup : [reqBody.accountGroup])};
			}
			aggrQuery.push(
				{$lookup: {from: 'accounts', localField: 'from_account', foreignField: '_id', as: 'from_account'}},
				{$unwind: {path: '$from_account', preserveNullAndEmptyArrays: true}},
				{
					$match: acGroup
				});
		}
		aggrQuery.push(
			{
				"$project": {
					"state" :1 ,
					"vendor": "$dieseInfo.vendor",
					"rate": "$dieseInfo.rate",
					"litre": "$dieseInfo.litre",
					"date": {
						"$dateToString": {
							"date": "$date",
							"format": "%d-%m-%Y",
							"timezone": "Asia/Kolkata"
						}
					}
				}
			},
			{
				"$group": {
					"_id": {
						"vendor": "$vendor",
						"date": "$date",
						//"state": "$state"
					},
					"totQty": {
						"$sum": "$litre"
					},
					"totAmt": {
						"$sum": {
							"$multiply": [
								"$rate",
								"$litre"
							]
						}
					},
					"date": {
						"$first": "$date"
					},
					"vendor": {
						"$first": "$vendor"
					},
					"state" : {
						"$first" : "$state"
					}
				}
			},
			{
				"$lookup": {
					"from": "vendorfuels",
					"localField": "vendor",
					"foreignField": "_id",
					"as": "vendor"
				}
			},
			{
				"$unwind": {
					"path": "$vendor",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$project": {
					"_id": 0,
					"vendor._id": 1,
					"vendor.name": 1,
					"vendor.fuel_company": 1,
					"vendor.address": 1,
					"totQty": 1,
					"totAmt": 1,
					"date": 1,
					"AdvState": "$state"
				}
			},
			{
				"$match": findFualComp
			},
			{
				"$group": {
					"_id":{
						"vendorId": "$vendor._id",
						"state": "$AdvState"
					},
					"dayWise": {
						"$push": {
							"date": "$date",
							"amt": "$totAmt",
							"qty": "$totQty"
						}
					},
					"vendorName": {
						"$first": "$vendor.name"
					},
					"vendorComp": {
						"$first": "$vendor.fuel_company"
					},
					"state": {
						"$first": "$vendor.address.state"
					},
					"AdvanceState": {
						"$first": "$AdvState"
					},
					"city": {
						"$first": "$vendor.address.city"
					},
				}
			},
			{
				"$sort": {
					"vendorComp":  1,"vendorName":  1
				}
			}
		);
		// if(req.body.download === "combineDieselDaywise"){
		// 	let downloadPath = await new csvDownload(TripAdvance, aggrQuery, {
		// 		filePath: `${req.user.clientId}/CombineDieselDaywise`,
		// 		fileName: `combineDieselDaywiseCSV_Report_${moment().format('DD-MM-YYYY hh:mm')}`
		// 	}).exec(combineDieselDaywise.transform, combineDieselDaywise.prepareHeader(from, to), req);
		//
		// 	return downloadPath;
		//
		// }

		//combineDiesel Daywise
		const aggrCursor = TripAdvance.aggregate(aggrQuery);
		aggrCursor.options = {allowDiskUse: true, batchSize: 1000};
		aggrCursor.exec(function (err, aData) {
			if (err) {
				return next(err);
			}
			next(null, {data: aData});
		});

	}

	else {
		oFilter = constructFilterOfPurchaseBill(reqBody);
		// let acGroup = {};
		if (reqBody.accountGroup) {
			if (reqBody.accountGroup && reqBody.accountGroup != "undefined" && reqBody.accountGroup.length > 0) {
				acGroup['from_account.type._id'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(reqBody.accountGroup) ? reqBody.accountGroup : [reqBody.accountGroup])};
			}
		}
		const aggrQuery = [
			{$match: oFilter},
			{$lookup: {from: 'accounts', localField: 'from_account', foreignField: '_id', as: 'from_account'}},
			{$unwind: {path: '$from_account', preserveNullAndEmptyArrays: true}},
			{$match: acGroup},
			{
				$project: {
					billNo: 1,
					amount: '$billAmount',
					from_account: 1,
					billDate: 1,
					account: 1,
					totItem: 1,
					totDiscount: 1,
					qty: '$ltr',
					// 'items': 1
				}
			},
			{$sort: {'from_account.name': -1}},
			{
				$group: {
					_id: {from_account: '$from_account', m: {$month: '$billDate'}, y: {$year: '$billDate'}},
					totQty: {$sum: '$qty'},
					totAmt: {$sum: '$amount'},
					month: {$first: {$month: '$billDate'}},
					year: {$first: {$year: '$billDate'}},
					billAc: {$first: "$from_account"},
					aData: {$push: '$$ROOT'}
				}
			},
			{$project: {'billAc.name': 1, 'billAc.type.name': 1, totQty: 1, totAmt: 1, month: 1, year: 1}},
			{
				$group: {
					_id: '$billAc',
					monthwise: {$push: '$$ROOT'},
					billAcc: {$first: '$billAc.name'},
					group: {$first: '$billAc.type.name'}
				}
			},
			{$sort: {group: -1}}
		];
		const aggrCursor = PurchaseBillNew.aggregate(aggrQuery);
		aggrCursor.options = {allowDiskUse: true, batchSize: 1000};
		aggrCursor.exec(function (err, aData) {
			if (err) {
				return next(err);
			}
			next(null, {data: aData});
		});
	}
};


module.exports.findById = async function (id, proj = {}) {
	return await BillNew.findOne({"_id": id}, proj).lean();
};

module.exports.updateBills = async function (billId, details, req) {
	try {

		let billType = details.type;

		details.latModified = Date.now();
		delete details.created_by;

		if (details.amount && !(details.salesAccount && details.salesAccountName))
			throw new Error('Sales A/c not Defined');

		if (details.iGST && !(details.iGSTAccount && details.iGSTAccountName))
			throw new Error('IGST A/c not Defined');

		if (details.cGST && !(details.cGSTAccount && details.cGSTAccountName))
			throw new Error('CGST A/c not Defined');

		if (details.sGST && !(details.sGSTAccount && details.sGSTAccountName))
			throw new Error('SGST A/c not Defined');

		if (details.totCwt && !(details.woAcc && details.woAccName))
			throw new Error('Without Tax A/c not Defined');

		const oldBill = await BillNew.findOne({_id: billId}).lean();

		details.items = details.items || [];

		details.receiving = {
			moneyReceipt: [],
			deduction: []
		};

		for (let k in details.items) {
			let oItem;
			if (details.items.hasOwnProperty(k) && (oItem = details.items[k]) && oItem.gr) {

				let foundGr = await GR.findById(oItem.gr).lean();

				if (foundGr) {
					oItem.grData = BillNew.extractGrKeys(foundGr);
					if (billType == constant.billType[0]) { // Provisional bill validation
						let total = (foundGr.provisionalBill || []).reduce((percent, oPov) => percent + (oPov.ref.toString() != billId.toString() ? oPov.percent : 0), 0);
						if (total + details.billPercent > 100)
							throw new Error(`Provision Bill of ${total} for Gr Number ${foundGr.grNumber} is already generated. Cannot Exceed Bill Percent`);
					}

					if (Array.isArray(oItem.tMemoReceipt)) {
						oItem.tMemoReceipt.forEach(oTMemo => {
							const tMemoPtr = details.receiving.moneyReceipt.find(o => o.tmRefNo === oTMemo.refNo);
							if (tMemoPtr) {
								tMemoPtr.grs.push({
									grRef: oItem.gr,
									tMemo: oTMemo.tMemoNo,
									amount: oTMemo.amount,
								});
								tMemoPtr.amount += oTMemo.amount;
							} else {
								details.receiving.moneyReceipt.push({
									tmRef: oTMemo._id,
									tmRefNo: oTMemo.refNo,
									grs: [{
										grRef: oItem.gr,
										tMemo: oTMemo.tMemoNo,
										amount: oTMemo.amount,
									}],
									amount: oTMemo.amount,
								});
							}
						});
					}
				}
			}
		}

		if (oldBill.billNo != details.billNo) {

			let fdBill = await BillNew.findOne({
				billNo: details.billNo,
				clientId: oldBill.clientId,
				cancelled: false,
				type: {$ne: 'Provisional Bill'}
			}, {_id: 1}).lean();

			if (fdBill && fdBill._id)
				throw new Error('Bill No is already used');

			let bsFound = await billStationaryService.findByRefAndType({
				bookNo: details.billNo,
				clientId: oldBill.clientId,
				type: 'Bill',
				status: 'unused'
			}, {_id: 1, status: 1});

			if (bsFound) {
				details.stationaryId = bsFound && bsFound._id;
				await billStationaryService.updateStatus({
					userName: details.user_full_name,
					docId: oldBill._id,
					modelName: 'bill',
					stationaryId: details.stationaryId
				}, 'used');
			}else
				throw new Error('Invalid Bill No');

			await billStationaryService.updateStatusV2({
				bookNo: oldBill.billNo,
				clientId: oldBill.clientId,
				type: 'Bill'
			},{
				userName: details.user_full_name,
				docId: oldBill._id,
				modelName: 'bill',
				status: 'cancelled'
			});
		}

		// Bill-Gr Link if gr is removed from bill
		for (let oOldItem of oldBill.items) {
			let foundGr = details.items.find(oNewItem => oNewItem.gr.toString() === oOldItem.gr.toString());
			if (foundGr) {
				if (billType == constant.billType[3]) { // unset Supplementary bill removed charges
					let aRemovedSelectedSupplementaryCharges = oOldItem.selectedSupply.filter(oOldSupply => !(foundGr.selectedSupply.indexOf(oOldSupply) + 1));
					if (aRemovedSelectedSupplementaryCharges.length)
						await GR.updateOne({
							_id: foundGr.gr
						}, {
							$pull: {
								selectedSupply: {$in: aRemovedSelectedSupplementaryCharges}
							}
						});

				}
			} else {
				let query = {};
				if (billType == constant.billType[0]) { // remove provisional bill
					query = {
						$pull: {
							provisionalBill: {
								ref: billId
							}
						},
						$set: {
							isProvBillGen: false
						}
					};

				} else if (billType == constant.billType[1]) {
					query = {
						$unset: {
							bill: 1
						}
					};

				} else if (billType == constant.billType[3]) {

					query = {
						$pull: {
							supplementaryBillRef: billId,
							selectedSupply: {$in: oOldItem.selectedSupply}
						}
					};
				}

				if (Object.keys(query).length)
					await GR.updateOne({
						_id: oOldItem.gr
					}, query);
			}

		}

		// updating Bill Info on Gr
		if (Array.isArray(details.items) && details.items.length) {

			if (billType == constant.billType[0]) {

				for (let oItem of details.items) {
					let foundGr = await GR.findById(oItem.gr, {provisionalBill: 1}).lean();
					let percent = ((foundGr && Array.isArray(foundGr.provisionalBill) && foundGr.provisionalBill || []).reduce((amt, o) => {
						if(o.ref.toString() == billId.toString())
							return amt;
						return amt + o.percent;
					}, 0) + oItem.billPercent);
					await GR.updateOne({_id: oItem.gr, 'provisionalBill.ref': billId}, {
						$set: {
							'provisionalBill.$.percent': oItem.billPercent,
							isProvBillGen: percent >= 100
						}
					});
				}

			} else if (billType == constant.billType[1]) {

				for (let oItem of details.items) {
					await GR.updateOne({_id: oItem.gr}, {
						$set: {
							bill: billId
						},
						$addToSet: {
							bills: billId
						}
					});
				}

			} else if (billType == constant.billType[3]) {

				for (let oItem of details.items) {
					await GR.updateOne({_id: oItem.gr}, {
						$addToSet: {
							supplementaryBillRef: billId,
							selectedSupply: {$each: oItem.selectedSupply || []}
						}
					});
				}
			}
		}

		var intPart = parseInt((details.billNo || '').replace(/^.*([0-2][0-9]|(3)[0-1])(\-|\/)(((0)[0-9])|((1)[0-2]))(\-|\/)\d{2,4}/i, '').replace(/\D+/g, ''));
		var wordPart = (details.billNo || '').replace(/\W+/ig, '').replace(/\d+/g, '');
		if (intPart) details['billNoInt'] = intPart;
		if (wordPart) details['billNoWord'] = wordPart;
		var oUpdate = {};
		oUpdate.$set = details;
		let updatedBill = await BillNew.findByIdAndUpdate(billId, oUpdate, {"new": true}).lean();

		await grService.updateUpdateTime([...details.items.map(o => o.gr), ...oldBill.items.map(o => o.gr)]);

		if (details.approve && billType != constant.billType[0]) {
			var data = await acknowledgeSalesBill(billId, details, req);
		}
		if (data){
	         return data;
        }else{
			return updatedBill;
		}
	} catch (e) {
		throw(e)
	}
};

module.exports.generateBuiltyPdf = function (data, clientId, next) {
	phantom.create().then(function (ph) {
		ph.createPage().then(function (page) {
			var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/bills/builty.html?" + formatData(data);
			// console.log(url);
			page.property('viewportSize', {width: 595, height: 420})
				.then(function () {

				});
			page.property('clipRect', {top: 0, left: 0, width: 595, height: 420}).then(function () {

			});
			page.open(url).then(function (status) {
				// // console.log('status', status);
				page.render('files/users/' + clientId + '/builty.pdf').then(function () {
					// // console.log('rendered...');
					ph.exit();
					next(null, "users/" + clientId + "/builty.pdf");
				});
			});
		});
	})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generateDieselPdfs = function (data, clientId, next) {
	// console.log('generating');
	if (data instanceof Array) {
		var pdfs = [];
		async.each(data, function (slip, cb) {
			Promise.promisify(module.exports.generateDieselPdf)(slip, clientId)
				.then(function (url) {
					var url2 = path.dirname(process.mainModule.filename).replace(/\\/g, '/') + '/files/' + url;
					pdfs.push(url2);
					cb();
				})
				.error(function (err) {
					console.log(err);
					cb(err);
				});
		}, function (err) {
			// console.log('pdfs', pdfs);
			var pdfMerge = new PDFMerge(pdfs, pdftkPath);
			var suffix = Date.now().toString(36);
			pdfMerge.asNewFile('files/users/' + clientId + '/diesel-' + suffix + '.pdf').merge(function (error, filePath) {
				winston.info('err:', error);
				next(null, "users/" + clientId + '/diesel-' + suffix + '.pdf');
			});
		});
	} else {
		module.exports.generateDieselPdf(data, clientId, next);
	}
};

module.exports.generateDieselSlipPdf = function (data, clientId, next) {
	phantom.create().then(function (ph) {
		ph.createPage().then(function (page) {
			var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/bills/dieselSlip.html?" + formatData(data);
			// console.log(url);
			page.property('viewportSize', {width: 680, height: 200})
				.then(function () {

				});
			page.property('clipRect', {top: 0, left: 0, width: 595, height: 200}).then(function () {

			});
			page.open(url).then(function (status) {
				// // console.log('status', status);
				page.render('files/users/' + clientId + '/dieselSlip.pdf').then(function () {
					// // console.log('rendered...');
					ph.exit();
					next(null, "users/" + clientId + "/dieselSlip.pdf");
				});
			});
		});
	})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generateDieselPdf = function (data, clientId, next) {
	phantom.create().then(function (ph) {
		ph.createPage().then(function (page) {
			var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/bills/diesel.html?" + formatData(data);
			// console.log(url);
			page.property('viewportSize', {width: 800, height: 600}).then(function () {
				page.open(url).then(function (status) {
					// // console.log('status', status);
					var suffix = Date.now().toString(36);
					page.render('files/users/' + clientId + '/diesel-' + suffix + '.pdf').then(function (a, b) {
						// // console.log('rendered...');
						ph.exit();
						next(null, "users/" + clientId + '/diesel-' + suffix + '.pdf');
					});
				});
			});
		});
	})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generateInvoicePdf = function (data, clientId, next) {
	phantom.create()
		.then(function (ph) {
			ph.createPage()
				.then(function (page) {
					var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/bills/billApp.html?" + formatData(data);
					// console.log(url);
					//page.property('viewportSize',{width:800})
					/*page.paperSize={
						format: 'A4',
						orientation: 'landscape',
						margin: '1cm'
					}*/
					page.property('viewportSize', {width: 1024, height: 768})
						.then(function () {

						});
					page.property('clipRect', {top: 0, left: 0, width: 1024, height: 768}).then(function () {

					});
					//page.viewportSize = { width: 50,height: 50}
					page.open(url).then(function (status) {
						// // console.log('status', status);
						var fname = 'users/' + clientId + '/invoice' + Date.now() + '.pdf';
						page.render('files/' + fname).then(function (a, b) {
							// console.log('rendered.', a, b);
							ph.exit();
							next(null, fname);
						}).catch(function (err) {
							console.log(err);
						});
					});
				});
		})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generateInventoryInwardPdf = function (data, clientId, next) {
	phantom.create()
		.then(function (ph) {
			ph.createPage()
				.then(function (page) {
					var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/slips/inventoryInwardApp.html?" + formatData(data);
					// console.log(url);
					//page.property('viewportSize',{width:800})
					/*page.paperSize={
						format: 'A4',
						orientation: 'landscape',
						margin: '1cm'
					}*/
					page.property('viewportSize', {width: 1024, height: 768})
						.then(function () {

						});
					page.property('clipRect', {top: 0, left: 0, width: 1024, height: 768}).then(function () {

					});
					//page.viewportSize = { width: 50,height: 50}
					page.open(url).then(function (status) {
						// // console.log('status', status);
						var fname = 'users/' + clientId + '/inventoryInward' + Date.now() + '.pdf';
						page.render('files/' + fname).then(function (a, b) {
							// console.log('rendered.', a, b);
							ph.exit();
							next(null, fname);
						}).catch(function (err) {
							console.log(err);
						});
					});
				});
		})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generateToolInventoryInwardPdf = function (data, clientId, next) {
	phantom.create()
		.then(function (ph) {
			ph.createPage()
				.then(function (page) {
					var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/slips/toolInvInwardApp.html?" + formatData(data);
					// console.log(url);
					//page.property('viewportSize',{width:800})
					/*page.paperSize={
						format: 'A4',
						orientation: 'landscape',
						margin: '1cm'
					}*/
					page.property('viewportSize', {width: 1024, height: 768})
						.then(function () {

						});
					page.property('clipRect', {top: 0, left: 0, width: 1024, height: 768}).then(function () {

					});
					//page.viewportSize = { width: 50,height: 50}
					page.open(url).then(function (status) {
						// // console.log('status', status);
						var fname = 'users/' + clientId + '/toolInventoryInward' + Date.now() + '.pdf';
						page.render('files/' + fname).then(function (a, b) {
							// console.log('rendered.', a, b);
							ph.exit();
							next(null, fname);
						}).catch(function (err) {
							console.log(err);
						});
					});
				});
		})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generateTyreInventoryInwardPdf = function (data, clientId, next) {
	phantom.create()
		.then(function (ph) {
			ph.createPage()
				.then(function (page) {
					var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/slips/tyreInvInwardApp.html?" + formatData(data);
					// console.log(url);
					page.property('paperSize', {format: 'A4', orientation: 'portrait'})
						.then(function () {

						});
					page.property('margin', '0.8cm')
						.then(function () {

						});
					page.property('zoomFactor', 2)
						.then(function () {

						});
					page.viewportSize = {width: 50, height: 50};
					/*page.property('viewportSize', {width: 1024, height: 768})
					.then(function() {

					});
					page.property('clipRect', { top: 0, left: 0, width: 1024, height: 768}).then(function() {

					});*/
					//
					page.open(url).then(function (status) {
						// // console.log('status', status);
						var fname = 'users/' + clientId + '/tyreInventoryInward' + Date.now() + '.pdf';
						page.render('files/' + fname).then(function (a, b) {
							// console.log('rendered.', a, b);
							ph.exit();
							next(null, fname);
						}).catch(function (err) {
							console.log(err);
						});
					});
				});
		})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generateJcdPdf = function (data, clientId, next) {
	phantom.create()
		.then(function (ph) {
			ph.createPage()
				.then(function (page) {
					var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/slips/jcd.html?" + formatData(data);
					// console.log(url);
					//page.property('viewportSize',{width:800})
					/*page.paperSize={
						format: 'A4',
						orientation: 'landscape',
						margin: '1cm'
					}*/
					page.property('viewportSize', {width: 1024, height: 768})
						.then(function () {

						});
					page.property('clipRect', {top: 0, left: 0, width: 1024, height: 768}).then(function () {

					});
					//page.viewportSize = { width: 50,height: 50}
					page.open(url).then(function (status) {
						// // console.log('status', status);
						var fname = 'users/' + clientId + '/jcd' + Date.now() + '.pdf';
						page.render('files/' + fname).then(function (a, b) {
							// console.log('rendered.', a, b);
							ph.exit();
							next(null, fname);
						}).catch(function (err) {
							console.log(err);
						});
					});
				});
		})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generatepoQuotePdf = function (data, clientId, next) {
	phantom.create()
		.then(function (ph) {
			ph.createPage()
				.then(function (page) {
					var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/bills/poQuotationPrint.html?" + formatData(data);
					// console.log(url);
					page.open(url).then(function (status) {
						// console.log('status', status);
						var fname = 'users/' + clientId + '/poQuotationPrint' + Date.now() + '.pdf';
						page.render('files/' + fname).then(function (a, b) {
							console.log('rendered.', a, b);
							ph.exit();
							next(null, fname);
						}).error(function (err) {
							console.log(err);
						});
					});
				});
		})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generatePrSlipPdf = function (data, clientId, next) {
	phantom.create()
		.then(function (ph) {
			ph.createPage()
				.then(function (page) {
					var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/slips/prSlip.html?" + formatData(data);
					// console.log(url);
					//page.property('viewportSize',{width:800})
					/*page.paperSize={
						format: 'A4',
						orientation: 'landscape',
						margin: '1cm'
					}*/
					page.property('viewportSize', {width: 800, height: 600})
						.then(function () {

						});
					//page.viewportSize = { width: 50,height: 50}
					page.open(url).then(function (status) {
						// // console.log('status', status);
						var fname = 'users/' + clientId + '/prSlip' + Date.now() + '.pdf';
						page.render('files/' + fname).then(function (a, b) {
							// console.log('rendered.', a, b);
							ph.exit();
							next(null, fname);
						}).catch(function (err) {
							console.log(err);
						});
					});
				});
		})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generateServiceSlipPdf = function (data, clientId, next) {
	phantom.create()
		.then(function (ph) {
			ph.createPage()
				.then(function (page) {
					var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/slips/jobServiceSlip.html?" + formatData(data);
					// console.log(url);
					//page.property('viewportSize',{width:800})
					/*page.paperSize={
						format: 'A4',
						orientation: 'landscape',
						margin: '1cm'
					}*/
					page.property('viewportSize', {width: 800, height: 600})
						.then(function () {

						});
					//page.viewportSize = { width: 50,height: 50}
					page.open(url).then(function (status) {
						// console.log('status', status);
						var fname = 'users/' + clientId + '/serviceSlip' + Date.now() + '.pdf';
						page.render('files/' + fname).then(function (a, b) {
							console.log('rendered.', a, b);
							ph.exit();
							next(null, fname);
						}).catch(function (err) {
							console.log(err);
						});
					});
				});
		})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generatePOPdf = function (dataPdf, clientId, next) {
	phantom.create().then(function (ph) {
		ph.createPage().then(function (page) {
			var sData = JSON.stringify(dataPdf);
			var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/slips/poSlip.html";
			// console.log(url);
			page.property('viewportSize', {width: 800, height: 600})
				.then(function () {
					page.open(url).then(function (status) {
						// console.log('status', status);
						var fname = 'users/' + clientId + '/PO' + Date.now() + '.pdf';
						page.evaluate(function (sData) {
							data = sData;
							var sub_total = 0;
							if (data.spare && data.spare.length > 0) {
								for (var i = 0; i < data.spare.length; i++) {
									sub_total = (sub_total + ((data.spare[i].rate_inc_tax) * (data.spare[i].quantity)));
								}
							}
							var scope = angular.element(document.querySelector("[ng-controller]")).scope();
							data.created_at = new Date(data.created_at).toDateString();
							data.currency = 'INR';
							data.modif_subtotal = sub_total;
							scope.poLocalData = data;
							scope.$apply();
						}, dataPdf)
							.then(function () {
								page.render('files/' + fname).then(function (a, b) {
									// console.log('rendered.', a, b);
									ph.exit();
									next(null, fname);
								})
							})
							.catch(
								function (err) {
									return next(err);
								}
							);
					});
				});

		});
	})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generateIssueSlipPdf = function (data, clientId, next) {
	phantom.create()
		.then(function (ph) {
			ph.createPage()
				.then(function (page) {
					var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/bills/issueSlip.html?" + formatData(data);
					// console.log(url);
					//page.property('viewportSize',{width:800})
					/*page.paperSize={
						format: 'A4',
						orientation: 'landscape',
						margin: '1cm'
					}*/
					page.property('viewportSize', {width: 1024, height: 768})
						.then(function () {

						});
					page.property('clipRect', {top: 0, left: 0, width: 1024, height: 768}).then(function () {

					});
					//page.viewportSize = { width: 50,height: 50}
					page.open(url).then(function (status) {
						// console.log('status', status);
						var fname = 'users/' + clientId + '/issueSlip' + Date.now() + '.pdf';
						page.render('files/' + fname).then(function (a, b) {
							console.log('rendered.', a, b);
							ph.exit();
							next(null, fname);
						}).catch(function (err) {
							console.log(err);
						});
					});
				});
		})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generateTyreIssueSlipPdf = function (data, clientId, next) {
	phantom.create()
		.then(function (ph) {
			ph.createPage()
				.then(function (page) {
					var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/slips/tyreSlip.html?" + formatData(data);
					page.property('viewportSize', {width: 800, height: 200})
						.then(function () {

						});
					page.open(url).then(function (status) {
						// console.log('status', status);
						var fname = 'users/' + clientId + '/tyreIssueSlip' + Date.now() + '.pdf';
						page.render('files/' + fname).then(function (a, b) {
							console.log('rendered.', a, b);
							ph.exit();
							next(null, fname);
						}).catch(function (err) {
							console.log(err);
						});
					});
				});
		})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.generateTyreRetreadIssueSlipPdf = function (data, clientId, next) {
	phantom.create()
		.then(function (ph) {
			ph.createPage()
				.then(function (page) {
					var url = "file:///" + path.dirname(process.mainModule.filename).replace(/\\/g, '/') + "/views/slips/retreadIssueSlip.html?" + formatData(data);
					page.property('viewportSize', {width: 800, height: 200})
						.then(function () {

						});
					page.open(url).then(function (status) {
						// console.log('status', status);
						var fname = 'users/' + clientId + '/retreadIssueSlip' + Date.now() + '.pdf';
						page.render('files/' + fname).then(function (a, b) {
							console.log('rendered.', a, b);
							ph.exit();
							next(null, fname);
						}).catch(function (err) {
							console.log(err);
						});
					});
				});
		})
		.catch(
			function (err) {
				return next(err);
			}
		);
};

module.exports.updateBillRemark = async function (req, res) {

	try {

		let aBill = req.body.aBIds;
		let billData;
		let oUpdate;
		if (req.body.submitionDate && !req.body.remarks) {
			oUpdate = {
				submitionDate: new Date(req.body.submitionDate)
			};
		} else if (!(req.body.submitionDate) && req.body.remarks) {
			oUpdate = {
				remarks: req.body.remarks
			};
		} else {
			oUpdate = {
				submitionDate: new Date(req.body.submitionDate),
				remarks: req.body.remarks
			};
		}

		for (let b of aBill) {
			billData = await Bill.findOne({_id: otherUtil.arrString2ObjectId(b)}, {_id: 1}).lean();
			if (billData) {
				await Bill.updateOne({_id: otherUtil.arrString2ObjectId(b)}, {
					$set: oUpdate
				});
			}
		}

		return true;

	} catch (e) {
		console.log(e);
		throw e
	}
};

module.exports.upsertCoverNote = function (data, req) {
	return new Promise(async function (resolve, reject) {

		let {cnNo, remark, aBill} = data;

		// check of cnNo is unique and all the bill exists without any cnNo
		let bill = await Bill.find(
			{
				_id: {
					$in: aBill
				},
				'coverNote.cnNo': {
					$exists: false
				},
				clientId: req.user.clientId
			});

		if (bill.length != aBill.length)
			reject('1) Bill Not found 2) Some bill already belong to other covenote');

		// finding next covetNote index

		let cnIndex = await Bill
			.find({
				clientId: req.user.clientId,
				'coverNote.index': {$exists: true}
			}, {'coverNote.index': 1})
			.sort({'coverNote.index': -1})
			.limit(1);

		if (Array.isArray(cnIndex) && cnIndex.length)
			cnIndex = cnIndex[0].advSettled.cnIndex + 1;
		else
			cnIndex = 1;

		// generating conver note object
		let oCoverNote = {
			index: cnIndex,
			cnNo,
			remark,
			user: req.user._id,
			systemDate: Date.now()
		};

		//save cnNo info. on all the bills
		await promise.all(bill.forEach(async oBill => {
			await oBill.set({
				coverNote: oCoverNote
			}).save();
		}));

		resolve(true);
	});
};

module.exports.prepareInvoiceData = function (trip) {

	var data = [];
	//aTempTripNo.filter(onlyUnique)

	for (var j = 0; j < trip.gr.length; j++) {
		var gr = trip.gr[j];
		var aTempBOE = [];
		var aTempBookingNo = [];
		var aTempBookingType = [];
		var aContainerNo = [];
		var aContainerSize = [];
		var aAdvance = [];
		var aBalance = [];
		if (gr.booking_info && gr.booking_info.length > 0) {
			for (var m = 0; m < gr.booking_info.length; m++) {
				if (gr.booking_info[m].boe_no) {
					aTempBOE.push(gr.booking_info[m].boe_no);
				}
				if (gr.booking_info[m].booking_no) {
					aTempBookingNo.push(gr.booking_info[m].booking_no);
				}
				if (gr.booking_info[m].booking_type) {
					aTempBookingType.push(gr.booking_info[m].booking_type);
				}
				if (gr.booking_info[m].container_no) {
					aContainerNo.push(gr.booking_info[m].container_no);
					aContainerSize.push(gr.booking_info[m].container_type)
				}
			}
		}
		var aBOE = aTempBOE.filter(onlyUnique);
		var aBookings = aTempBookingNo.filter(onlyUnique);
		var aBookingType = aTempBookingType.filter(onlyUnique);
		var invoice = {
			clientId: trip.clientId,
			isMarketVehicle: trip.isMarketVehicle,
			gr_no: gr.gr_no,
			ack_stage: gr.ack_stage,
			payment_basis: gr.payment_basis,
			rate: (gr.rate || 0),
			isTransporter: gr.isTransporter,
			po_number: gr.po_number,
			freight: (gr.freight || 0),
			client_gstin_no: trip.client_gstin_no,
			customer_id: gr.customer_id,
			customer_name: gr.customer_name,
			sap_id: gr.sap_id,
			vehicle_type: trip.vehicle_type,
			vehicle_type_id: trip.vehicle_type_id,
			vehicle_no: trip.vehicle_no,
			vehicle: trip.vehicle,
			billing_party_name: gr.billing_party_name,
			billing_party_id: gr.billing_party_id,
			billing_party_address: gr.billing_party_address,
			billing_party_gstin_no: gr.billing_party_gstin_no,
			gstin_state_code: gr.gstin_state_code,
			apply_gst: ((typeof gr.is_gstin_registered == 'boolean') && (gr.is_gstin_registered === true)) ? false : true,
			branch: gr.branch,
			invoice_date: new Date(),
			sub_total: 0,
			driver_name: trip.driver_name,
			driver_sap_id: trip.driver_sap_id,
			driver_id: trip.driver,

			m_vehicle_no: trip.m_vehicle_no,
			trip_start_time: trip.trip_start && trip.trip_start.time,
			trip_start_user: trip.trip_start && trip.trip_start.user,
			trip_end_time: trip.trip_end && trip.trip_end.time,
			trip_end_user: trip.trip_end && trip.trip_end.user,
			created_by: {
				date: Date.now(),
				name: trip.trip_end && trip.trip_end.user,
				userId: trip.trip_end && trip.trip_end.user_id
			},
			//service_tax_percent: 0,
			//service_tax_code: 'AADCM9293KST001',
			//pan: 'AADCM9293K',
			//note: '',
			//mob_no: 8826993040,
			//email: ' billing@futuretrucks.com',
			booking_info: [],
			boe_no: aBOE,
			booking_type: aBookingType,
			booking_no: aBookings,
			container_no: aContainerNo,
			trip_no: trip.trip_no,
			datetime: Date.now()
		};


		var oInfo = {
			sl_no: j + 1,
			boe_no: aBOE,
			isMarketVehicle: trip.isMarketVehicle,
			container_no: aContainerNo,
			isTransporter: gr.isTransporter,
			payment_basis: gr.payment_basis,
			payment_type: gr.payment_type,
			container_size: aContainerSize,
			trip_no: trip.trip_no,
			gr_date: gr.gr_date,
			gr_no: gr.gr_no,
			gr_type: trip.gr_type,
			veh_no: trip.vehicle_no,
			totalAdvance: gr.totalAdvance,
			totalBalance: gr.totalBalance,
			m_vehicle_no: trip.m_vehicle_no,
			veh_type: trip.vehicle_type,
			route: trip.route.route_name,
			consigner_name: gr.consigner_name,
			consignee_name: gr.consignee_name,
			weight: gr.weight || 0,
			weight_unit: 'tonne',
			rate: gr.rate || 0,
			freight: gr.freight || 0,
			previous_rate: gr.rate || 0,
			previous_freight: gr.freight || 0,
			gr_charges: gr.gr_charges || 0,
			loading_charges: gr.loading_charges || 0,
			unloading_charges: gr.unloading_charges || 0,
			//munshiyana_charges: gr.munshiyana_charges || 0,
			other_charges: gr.other_charges || 0,
			ovr_wt_chrgs: gr.ovr_wt_chrgs || 0,
			fuel_price_hike: gr.fuel_price_hike || 0,
			dtn_amt: gr.dtn_amt || 0,
			othr_exp: gr.othr_exp || 0,
			wt_charge: gr.weightman_charges || 0,
			total: gr.total || ((gr.rate || 0) + (gr.fuel_price_hike || 0) + (gr.gr_charges || 0) +
				+(gr.loading_charges || 0) + (gr.unloading_charges || 0) +
				(gr.other_charges || 0) + (gr.ovr_wt_chrgs || 0) + (gr.dtn_amt || 0) + (gr.othr_exp || 0))
		};
		invoice.booking_info.push(oInfo);
		invoice.sub_total = parseFloat((Math.round((oInfo.total) * 100) / 100).toFixed(2));
		//invoice.service_tax = parseFloat((Math.round(((invoice.sub_total)*invoice.service_tax_percent/100) * 100) / 100).toFixed(2));
		invoice.total_expenses = invoice.sub_total;
		data.push(invoice);
	}
	return data;
};

module.exports.acknowledgeBill = acknowledgePurchaseBill;

module.exports.acknowledgeSalesBill = acknowledgeSalesBill;

module.exports.acknowledgePurAssetsBill = acknowledgePurAssetsBill;

module.exports.revertAcknowledgedSalesBill = revertAcknowledgedSalesBill;

module.exports.getAllGeneratedBills = async function (reqBody, next) {
	try {
		console.log("hiii");
		let oFilter = constructFilters(reqBody);
		console.log(oFilter);
		cha.b;
		if (!oFilter.status) {
			oFilter.status = {$not: {$eq: 'Cancelled'}};
		}

		let sort = reqBody.sort || {billNoInt: 1};

		let aggrPipe = [
			{$match: oFilter},
			{$sort: sort}
		];

		if (!reqBody.skip)
			reqBody.skip = 1;

		if (reqBody.start_date && reqBody.end_date && moment(reqBody.end_date).diff(reqBody.start_date, 'days', true) < 5) {
			reqBody.no_of_docs = 200;
		}
		if (reqBody.all)
			reqBody.no_of_docs = Number.MAX_SAFE_INTEGER;
		else
			reqBody.no_of_docs = reqBody.no_of_docs || 10;

		let grFilter = constructGRFilters(reqBody);
		let bpFilter = constructBPFilters(reqBody);

		aggrPipe.push(
			{$lookup: {from: 'billingparties', localField: 'billingParty', foreignField: '_id', as: 'billingParty'}},
			{$unwind: {path: '$billingParty', preserveNullAndEmptyArrays: true}}
		);

		if (Object.keys(bpFilter).length)
			aggrPipe.push({$match: bpFilter});

		if (Array.isArray(reqBody.populate) && reqBody.populate.indexOf('acknowledge.voucher') + 1) {
			aggrPipe.push(
				{
					$lookup: {
						from: 'vouchers',
						localField: 'acknowledge.voucher',
						foreignField: '_id',
						as: 'acknowledge.voucher'
					}
				},
				{$unwind: {path: '$acknowledge.voucher', preserveNullAndEmptyArrays: true}}
			);

			aggrPipe.push({$match: constructVchFilters(reqBody)});
		}

		aggrPipe.push(
			{$unwind: {path: '$items', preserveNullAndEmptyArrays: true}},
			{$lookup: {from: 'tripgrs', localField: 'items.gr', foreignField: '_id', as: 'items.gr'}},
			{$unwind: {path: '$items.gr', preserveNullAndEmptyArrays: true}},
		);

		if (Object.keys(grFilter).length > 0) {
			aggrPipe.push({$match: grFilter});
		}

		if(!reqBody.doNotPopCust) {
			aggrPipe.push(
				{
					$lookup: {
						from: 'customers',
						localField: 'items.gr.customer',
						foreignField: '_id',
						as: 'items.gr.customer'
					}
				},
				{$unwind: {path: '$items.gr.customer', preserveNullAndEmptyArrays: true}},
				// {$skip: (reqBody.no_of_docs * reqBody.skip) - reqBody.no_of_docs},
				// {$limit: reqBody.no_of_docs}
			);
		}

		Array.isArray(reqBody.populate) && reqBody.populate.forEach(toPop => {
			switch (toPop) {
				case 'consignor':
					aggrPipe.push(
						{
							$lookup: {
								from: 'consignor_consignees',
								localField: 'items.gr.consignor',
								foreignField: '_id',
								as: 'items.gr.consignor'
							}
						},
						{$unwind: {path: '$items.gr.consignor', preserveNullAndEmptyArrays: true}},
					);
					break;

				case 'consignee':
					aggrPipe.push(
						{
							$lookup: {
								from: 'consignor_consignees',
								localField: 'items.gr.consignee',
								foreignField: '_id',
								as: 'items.gr.consignee'
							}
						},
						{$unwind: {path: '$items.gr.consignee', preserveNullAndEmptyArrays: true}},
					);
					break;

				case 'vehicle':
					aggrPipe.push(
						{
							$lookup: {
								from: 'registeredvehicles',
								localField: 'items.gr.vehicle',
								foreignField: '_id',
								as: 'items.gr.vehicle'
							}
						},
						{$unwind: {path: '$items.gr.vehicle', preserveNullAndEmptyArrays: true}},
					);
					break;

				case 'billingParty.account':
					aggrPipe.push(
						{
							$lookup: {
								from: 'accounts',
								localField: 'billingParty.account',
								foreignField: '_id',
								as: 'billingParty.account'
							}
						},
						{$unwind: {path: '$billingParty.account', preserveNullAndEmptyArrays: true}},
					);
					break;
					id = "my_fixable_table_header"

				case 'billingParty.withHoldAccount':
					aggrPipe.push(
						{
							$lookup: {
								from: 'accounts',
								localField: 'billingParty.withHoldAccount',
								foreignField: '_id',
								as: 'billingParty.withHoldAccount'
							}
						},
						{$unwind: {path: '$billingParty.withHoldAccount', preserveNullAndEmptyArrays: true}},
					);
					break;
			}
		});

		if (Array.isArray(reqBody.populate) && reqBody.populate.indexOf('creditNote') + 1) {
			aggrPipe.push(
				{
					$lookup: {
						from: 'creditnotes',
						localField: 'receiving.deduction.cNoteRef',
						foreignField: '_id',
						as: 'creditNote'
					},
				},
				{
					"$unwind": {
						"path": '$creditNote', preserveNullAndEmptyArrays: true

					}
				},
			);
		}

		aggrPipe.push(
			{
				$group: {
					_id: "$_id",
					items: {$push: "$items"},
					acknowledge: {$first: "$acknowledge"},
					billDate: {$first: "$billDate"},
					creditNo: {$first: "$creditNote.creditNo"},
					category: {$first: "$creditNote.category"},
					billNo: {$first: "$billNo"},
					billNoInt: {$first: "$billNoInt"},
					billingParty: {$first: "$billingParty"},
					receiving: {$first: "$receiving"},
					cGST: {$first: "$cGST"},
					cGST_percent: {$first: "$cGST_percent"},
					clientId: {$first: "$clientId"},
					created_at: {$first: "$created_at"},
					created_by_name: {$first: "$created_by_name"},
					dueDate: {$first: "$dueDate"},
					submitionDate: {$first: "$submitionDate"},
					iGST: {$first: "$iGST"},
					iGST_percent: {$first: "$iGST_percent"},
					remarks: {$first: "$remarks"},
					refNo: {$first: "$refNo"},
					sGST: {$first: "$sGST"},
					sGST_percent: {$first: "$sGST_percent"},
					stationaryId: {$first: "$stationaryId"},
					totalAmount: {$first: "$totalAmount"},
					billAmount: {$first: "$billAmount"},
					amount: {$first: "$amount"},
					totCwt: {$first: "$totCwt"},
					adjAmount: {$first: "$adjAmount"},
					tripNo: {$first: "$tripNo"},
					vehicle_no: {$first: "$vehicle_no"},
					type: {$first: "$type"},
					status: {$first: "$status"},
					coverNote: {$first: "$coverNote"},
					salesAccountName: {$first: "$salesAccountName"},
					salesAccount: {$first: "$salesAccount"},
					iGSTAccountName: {$first: "$iGSTAccountName"},
					iGSTAccount: {$first: "$iGSTAccount"},
					cGSTAccountName: {$first: "$cGSTAccountName"},
					cGSTAccount: {$first: "$cGSTAccount"},
					sGSTAccountName: {$first: "$sGSTAccountName"},
					sGSTAccount: {$first: "$sGSTAccount"},
					documents: {$first: "$documents"},
					multiBill: {$first: "$multiBill"},
					adjDebitAc: {$first: "$adjDebitAc"},
					adjDebitAcName: {$first: "$adjDebitAcName"},
					last_modified_at: {$first: "$last_modified_at"},
					last_modified_by: {$first: "$last_modified_by"},
				}
			},

			{
				"$addFields": {
					"amountRecM": {
						"$reduce": {
							input: "$receiving.moneyReceipt",
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
					"amountRecD": {
						"$reduce": {
							input: "$receiving.deduction",
							initialValue: 0,
							in: {
								"$add": ["$$value", {
									$cond: {
										if: {"$ifNull": ["$$this.mrRef", false]},
										then: 0,
										else: {"$ifNull": ["$$this.amount", 0]}
									}
								}]
							}
						}
					}
				}
			},

			{
				"$addFields": {
					"recAmt": {
						"$add": ["$amountRecM", "$amountRecD"]
					}
				}
			},
			{
				"$addFields": {
					"totDueAmt": {
						"$subtract": ["$recAmt", "$billAmount"]
					}
				}
			},

			{$sort: sort}
		);

		if (reqBody.project && reqBody.project.length) {
			aggrPipe.push({
				$project: reqBody.project.reduce((obj, o) => {
					obj[o] = 1;
					return obj;
				}, {})
			})
		}

		if (reqBody.skip) {
			aggrPipe.push({$skip: ((reqBody.no_of_docs * reqBody.skip) - reqBody.no_of_docs)});
		}
		if (reqBody.no_of_docs) {
			aggrPipe.push({$limit: reqBody.no_of_docs});
		}

		const aggrData = await BillNew.aggregate(aggrPipe).allowDiskUse(true);
		return {
			data: aggrData,
		};
	} catch (e) {
		throw(e)
	}

};

// Function Definition

async function acknowledgePurchaseBill(id, body, req) {

	let aLedger = [];

	try {

		if (!id)
			throw new Error('Mandatory Fields are required');

		let user = req.user.full_name;
		let clientId = req.user.clientId;

		let oPurchaseBill = await PurchaseBill.findOne({_id: id}).populate({
			path: 'items',
			select: {reference_no: 1, amount: 1}
		}).populate({
			path: 'duesBillItems',
			select: {refNo: 1, amount: 1}
		}).lean();

		if (oPurchaseBill.plainVoucher)
			throw new Error('Voucher is already generated');

		if (oPurchaseBill.aDiscount.length)
			for (let oDis of oPurchaseBill.aDiscount)
				if (oDis.voucherRef)
					throw new Error('Voucher is already generated');

		if (oPurchaseBill && oPurchaseBill.materialItems) {
			oPurchaseBill.materialItems.forEach(obj => {
				if (obj.discount)
					oPurchaseBill.totMaterial += obj.discount;
			})
		}

		if (oPurchaseBill && oPurchaseBill.labRepItems) {
			oPurchaseBill.labRepItems.forEach(obj => {
				if (obj.discount)
					oPurchaseBill.labourAmt += obj.discount;
			})
		}

		if (oPurchaseBill.totDues) {
			if (!oPurchaseBill.account)
				throw new Error('credit A/c not Defined');

			let fName = await Accounts.findOne({_id: oPurchaseBill.account}, {name: 1, ledger_name: 1}).lean();
			oPurchaseBill.accountName = fName.ledger_name || fName.name;

			if (!oPurchaseBill.from_account)
				throw new Error('Debit A/c not Defined');

			 fName = await Accounts.findOne({_id: oPurchaseBill.from_account}, {name: 1, ledger_name: 1}).lean();
			oPurchaseBill.from_accountName = fName.ledger_name || fName.name;
		}

		if (oPurchaseBill.iGST) {
			if (!oPurchaseBill.igstAcnt)
				throw new Error('IGST A/c not Defined');

			let fName = await Accounts.findOne({_id: oPurchaseBill.igstAcnt}, {name: 1, ledger_name: 1}).lean();
			oPurchaseBill.igstAcntName = fName.ledger_name || fName.name;
		}

		if (oPurchaseBill.cGST) {
			if (!oPurchaseBill.cgstAcnt)
				throw new Error('CGST A/c not Defined');

			let fName = await Accounts.findOne({_id: oPurchaseBill.cgstAcnt}, {name: 1, ledger_name: 1}).lean();
			oPurchaseBill.cgstAcntName = fName.ledger_name || fName.name;
		}

		if (oPurchaseBill.sGST) {
			if (!oPurchaseBill.sgstAcnt)
				throw new Error('SGST A/c not Defined');

			let fName = await Accounts.findOne({_id: oPurchaseBill.sgstAcnt}, {name: 1, ledger_name: 1}).lean();
			oPurchaseBill.sgstAcntName = fName.ledger_name || fName.name;
		}

		let multiVoucher = new voucherService.multiVoucherOpr();

		let oVoucher = {
			type:  oPurchaseBill.vchType || 'Purchase',
			refNo: oPurchaseBill.refNo,
			branch: oPurchaseBill.branch,
			narration: oPurchaseBill.remark,
			stationaryId: oPurchaseBill.stationaryId,
			paymentMode: oPurchaseBill.paymentMode,
			paymentRef: oPurchaseBill.paymentRef,
			paymentDate: oPurchaseBill.billDate || new Date(),
			trackPayAs: "bill",
			date: oPurchaseBill.billDate || new Date(),
			dueDate: oPurchaseBill.dueDate ? oPurchaseBill.dueDate : (oPurchaseBill.billDate || new Date()),
			billNo: oPurchaseBill.billNo,
			clientId,
			isEditable: false,
			createdBy: user
		};

		let voucherId = Array.isArray(oPurchaseBill.plainVoucher) ? false : oPurchaseBill.plainVoucher;

		if (oPurchaseBill.totItem) {
			oPurchaseBill.totalAmount = Number(parseFloat(oPurchaseBill.totalAmount).toFixed(2));
			await addLedger({
				account: oPurchaseBill.from_account,
				accountName: oPurchaseBill.from_accountName,
				amount: oPurchaseBill.billAmount,
				type: 'CR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'New Ref',
					amount: oPurchaseBill.billAmount,
					remAmt: oPurchaseBill.billAmount
				}
			});

			oPurchaseBill.totItem = Number(parseFloat(oPurchaseBill.totItem).toFixed(2));
			await addLedger({
				account: oPurchaseBill.account,
				accountName: oPurchaseBill.accountName,
				amount: oPurchaseBill.totItem,
				type: 'DR',
				oBill: oPurchaseBill.items.map(oItem => ({
					billType: 'Against Ref',
					billNo: oItem.reference_no,
					amount: oItem.amount
				}))
			});

			oVoucher.vT = 'Diesel Bill';
			oVoucher.type = 'Journal';
		}

		if (oPurchaseBill.totDues) {
			oPurchaseBill.totalAmount = Number(parseFloat(oPurchaseBill.totalAmount).toFixed(2));
			await addLedger({
				account: oPurchaseBill.from_account,
				accountName: oPurchaseBill.from_accountName,
				amount: oPurchaseBill.billAmount,
				type: 'CR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'New Ref',
					amount: oPurchaseBill.billAmount,
					remAmt: oPurchaseBill.billAmount
				}
			});

			oPurchaseBill.totDues = Number(parseFloat(oPurchaseBill.totDues).toFixed(2));
			await addLedger({
				account: oPurchaseBill.account,
				accountName: oPurchaseBill.accountName,
				amount: oPurchaseBill.totDues,
				type: 'DR',
				oBill: oPurchaseBill.duesBillItems.map(oItem => ({
					billType: 'Against Ref',
					billNo: oItem.refNo,
					amount: oItem.amount
				}))
			});

			oVoucher.vT = 'Dues Bill';
			oVoucher.type = 'Journal';
		}

		if (oPurchaseBill.adjAmount) {
			oPurchaseBill.adjAmount = Number(parseFloat(oPurchaseBill.adjAmount).toFixed(2));
		} else {
			oPurchaseBill.adjAmount = 0;
		}

		if (oPurchaseBill.totMaterial || oPurchaseBill.labourAmt) {

			await addLedger({
				account: oPurchaseBill.account,
				accountName: oPurchaseBill.accountName,
				amount: oPurchaseBill.billAmount,
				type: 'CR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'New Ref',
					amount: oPurchaseBill.billAmount,
					remAmt: oPurchaseBill.billAmount
				}
			});

			if (oPurchaseBill.totMaterial && oPurchaseBill.from_account) {
				await addLedger({
					account: oPurchaseBill.from_account,
					accountName: oPurchaseBill.from_accountName,
					amount: oPurchaseBill.totMaterial,
					type: 'DR'
				});
			}

			if (oPurchaseBill.totDiscount && oPurchaseBill.discountAcnt) {
				await addLedger({
					account: oPurchaseBill.discountAcnt,
					accountName: oPurchaseBill.discountAcName,
					amount: oPurchaseBill.totDiscount,
					type: 'CR',
				});
			}

			oVoucher.vT = oPurchaseBill.billType;
		}

		if (oPurchaseBill.iGST && oPurchaseBill.igstAcnt) {
			await addLedger({
				account: oPurchaseBill.igstAcnt,
				accountName: oPurchaseBill.igstAcntName,
				amount: oPurchaseBill.iGST,
				type: 'DR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'On Account',
					amount: oPurchaseBill.iGST,
					remAmt: oPurchaseBill.iGST
				}
			});
		}

		if (oPurchaseBill.sGST && oPurchaseBill.sgstAcnt) {

			await addLedger({
				account: oPurchaseBill.sgstAcnt,
				accountName: oPurchaseBill.sgstAcntName,
				amount: oPurchaseBill.sGST,
				type: 'DR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'On Account',
					amount: oPurchaseBill.sGST,
					remAmt: oPurchaseBill.sGST
				}
			});
		}

		if (oPurchaseBill.cGST && oPurchaseBill.cgstAcnt) {
			await addLedger({
				account: oPurchaseBill.cgstAcnt,
				accountName: oPurchaseBill.cgstAcntName,
				amount: oPurchaseBill.cGST,
				type: 'DR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'On Account',
					amount: oPurchaseBill.cGST,
					remAmt: oPurchaseBill.cGST
				}
			});
		}

		if (oPurchaseBill.labourAmt && oPurchaseBill.labourAc) {
			let ownAmt = oPurchaseBill.labRepItems.reduce((acc, o) => acc + (o.vehType != "Associate" ? o.totalWithoutTax : 0), 0);

			if(ownAmt)
				await addLedger({
					account: oPurchaseBill.labourAc,
					accountName: oPurchaseBill.labourAcName,
					amount: ownAmt,
					type: 'DR'
				});

			for(let oRep of oPurchaseBill.labRepItems) {
				if(oRep.vehType == "Associate")
					await addLedger({
						account: oRep.vehAcc,
						amount: oRep.totalWithoutTax,
						type: 'DR'
					});
			}
		}

		if (oPurchaseBill.tdsAmt && oPurchaseBill.tdsAc) {
			await addLedger({
				account: oPurchaseBill.tdsAc,
				accountName: oPurchaseBill.tdsAcName,
				amount: oPurchaseBill.tdsAmt,
				type: 'CR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'On Account',
					amount: oPurchaseBill.tdsAmt,
					remAmt: oPurchaseBill.tdsAmt
				}
			});
		}

		if (oPurchaseBill.tcsAmt && oPurchaseBill.tcsAc) {
			await addLedger({
				account: oPurchaseBill.tcsAc,
				accountName: oPurchaseBill.tcsAcName,
				amount: oPurchaseBill.tcsAmt,
				type: 'CR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'On Account',
					amount: oPurchaseBill.tcsAmt,
					remAmt: oPurchaseBill.tcsAmt
				}
			});
		}

		if (oPurchaseBill.adjAmount) {
			await addLedger({
				account: oPurchaseBill.adjDebitAc,
				accountName: oPurchaseBill.adjDebitAcName,
				amount: Math.abs(oPurchaseBill.adjAmount),
				type: oPurchaseBill.adjAmount < 0 ? 'CR' : 'DR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: "On Account",
					amount: Math.abs(oPurchaseBill.adjAmount),
					remAmt: Math.abs(oPurchaseBill.adjAmount)
				}
			});
		}

		if (oPurchaseBill.aDiscount.length) {
			// add new discount Voucher
			for (let i in oPurchaseBill.aDiscount) {
				let oDis = oPurchaseBill.aDiscount[i];

				oDis.voucherRef = mongoose.Types.ObjectId();

				await multiVoucher.add({
					type: 'Journal',
					narration: oDis.remark,
					refNo: `${oPurchaseBill.refNo}-${i}D`,
					stationaryId: oPurchaseBill.stationaryId,
					branch: oPurchaseBill.branch,
					vT: 'Purchase Discount',
					paymentMode: oPurchaseBill.paymentMode,
					paymentRef: oPurchaseBill.paymentRef,
					paymentDate: new Date(),
					date: oPurchaseBill.billDate || new Date(),
					trackPayAs: "discount",
					isEditable: false,
					clientId,
					createdBy: user,
					ledgers: [{
						account: oDis.accountRef,
						lName: (await Accounts.findOne({_id: oDis.accountRef}, {
							name: 1,
							ledger_name: 1
						}).lean() || {}).name,
						amount: oDis.amount,
						cRdR: 'CR',
						bills: []
					}, {
						account: oPurchaseBill.from_account,
						lName: (await Accounts.findOne({_id: oPurchaseBill.from_account}, {
							name: 1,
							ledger_name: 1
						}).lean() || {}).name,
						amount: oDis.amount,
						cRdR: 'DR',
						bills: [{
							billNo: oPurchaseBill.billNo,
							billType: 'Against Ref',
							amount: oDis.amount,
							remAmt: 0
						}]
					}],
					_id: oDis.voucherRef
				});
			}
		}

		oVoucher.ledgers = aLedger;

		if (!voucherId) {
			oVoucher._id = mongoose.Types.ObjectId();
			await multiVoucher.add(oVoucher);

			let setQuery = {
				'plainVoucher': oVoucher._id,
				'lastModifiedBy' : {
					date: new Date(),
					name: req.user.full_name,
					userId: req.user._id,
				}
			};

			await multiVoucher.exec();

			if (Array.isArray(oPurchaseBill.aDiscount) && oPurchaseBill.aDiscount.length)
				setQuery.aDiscount = oPurchaseBill.aDiscount;

			await PurchaseBill.findByIdAndUpdate(id, {
				$set: setQuery
			});

		} else {
			oVoucher._id = voucherId;
			await voucherService.editVoucher(oVoucher);
		}

		return true;

	} catch (e) {
		console.log(e);
		throw e
	}

	async function addLedger(oData) {
		let foundVoucher = aLedger.find(o => o.account.toString() === oData.account.toString() && o.cRdR === oData.type);

		if (foundVoucher) {
			foundVoucher.amount += oData.amount;
			oData.oBill && foundVoucher.bills.push(oData.oBill);
		} else {
			aLedger.push({
				account: oData.account,
				lName: (await Accounts.findOne({_id: oData.account}, {name: 1, ledger_name: 1}).lean() || {}).name,
				amount: oData.amount,
				cRdR: oData.type,
				bills: oData.oBill ? (Array.isArray(oData.oBill) ? oData.oBill : [oData.oBill]) : []
			});
		}
	}
}

async function acknowledgeSalesBill(id, body, req) {

	let userName = req.user.full_name;
	let user = req.user;
	let clientId = req.user.clientId;
	let foundBill;
	let billingPartyAccount;
	let billingPartyAccountName;
	let remark = body.remark || '';

	try {

		foundBill = await BillNew.findOne({_id: id}).lean();

		if (!(foundBill && foundBill._id))
			throw new Error('No Bill Found');

		if (foundBill.acknowledge.status)
			throw new Error('Bill is already Approved');

		if (foundBill.billAmount === 0)
			throw new Error('Bill Cannot be Approved, Amount is Zero.');

		clientId = foundBill.clientId;

		let acknowledgeObj = {
			status: true,
			systemDate: Date.now(),
			date: body.date || Date.now(),
			remark,
			voucher: mongoose.Types.ObjectId(),
			user: user._id
		};

		if (foundBill.amount) {
			if (!body.salesAccount)
				throw new Error('Sales A/c not Defined');

			acknowledgeObj.salesAccount = body.salesAccount;
			let fName = await Accounts.findOne({_id: body.salesAccount}, {name: 1, ledger_name: 1}).lean();
			body.salesAccountName = fName.ledger_name || fName.name;
		}

		if (foundBill.iGST) {
			if (!body.iGSTAccount)
				throw new Error('IGST A/c not Defined');

			acknowledgeObj.iGSTAccount = body.iGSTAccount;
			let fName = await Accounts.findOne({_id: body.iGSTAccount}, {name: 1, ledger_name: 1}).lean();
			body.iGSTAccountName = fName.ledger_name || fName.name;
		}

		if (foundBill.cGST) {
			if (!body.cGSTAccount)
				throw new Error('CGST A/c not Defined');

			acknowledgeObj.cGSTAccount = body.cGSTAccount;
			let fName = await Accounts.findOne({_id: body.cGSTAccount}, {name: 1, ledger_name: 1}).lean();
			body.cGSTAccountName = fName.ledger_name || fName.name;
		}

		if (foundBill.sGST) {
			if (!body.sGSTAccount)
				throw new Error('SGST A/c not Defined');

			acknowledgeObj.sGSTAccount = body.sGSTAccount;
			let fName = await Accounts.findOne({_id: body.sGSTAccount}, {name: 1, ledger_name: 1}).lean();
			body.sGSTAccountName = fName.ledger_name || fName.name;
		}

		if (foundBill.totCwt) {
			if (!body.woAcc)
				throw new Error('Without Tax A/c not Defined');

			acknowledgeObj.woAcc = body.woAcc;
			let fName = await Accounts.findOne({_id: body.woAcc}, {name: 1, ledger_name: 1}).lean();
			body.woAccName = fName.ledger_name || fName.name;
		}

		let foundBillingParty = await BillingParty.findOne({_id: foundBill.billingParty}, {account: 1}).lean();

		if (!(foundBillingParty && foundBillingParty._id))
			throw new Error('No Billing Party Found');

		if (!(foundBillingParty.account))
			throw new Error('No Billing Party A/c linked to Billing party');

		billingPartyAccount = foundBillingParty.account;
		let fName = await Accounts.findOne({_id: billingPartyAccount}, {name: 1, ledger_name: 1}).lean();
		billingPartyAccountName = fName.ledger_name || fName.name;

		let aLedger = [],
			taxAmt = 0;

		let includeCostCenter = req.clientConfig.config && req.clientConfig.config.costCenter && req.clientConfig.config.costCenter.show;

		if (foundBill.amount != 0) {

			if (!body.salesAccount)
				throw new Error('Sales A/c not Selected');
			// drAmount += foundBill.amount;
		}

		if (foundBill.cGST) {

			if (!body.cGSTAccount)
				throw new Error('CGST Payable A/c not Selected');

			taxAmt += foundBill.cGST;
		}

		if (foundBill.sGST) {

			if (!body.sGSTAccount)
				throw new Error('SGST Payable A/c not Selected');

			taxAmt += foundBill.sGST;
		}

		if (foundBill.iGST) {

			if (!body.iGSTAccount)
				throw new Error('IGST Payable A/c not Selected');

			taxAmt += foundBill.iGST;
		}

		if (foundBill.adjAmount) {
			foundBill.adjAmount = foundBill.adjAmount;
		} else {
			foundBill.adjAmount = 0;
		}

		aLedger.push({
			account: billingPartyAccount,
			lName: billingPartyAccountName,
			amount: foundBill.billAmount,
			cRdR: 'DR',
			bills: [{
				billNo: foundBill.billNo,
				billType: 'New Ref',
				amount: foundBill.billAmount,
				remAmt: foundBill.billAmount
			}]
		});

		let crLedger;
		if (foundBill.amount) {
			foundBill.amount=Math.round((foundBill.amount + Number.EPSILON) * 100) / 100;
			 crLedger = {
				account: body.salesAccount,
				lName: body.salesAccountName,
				amount: foundBill.amount,
				cRdR: 'CR',
				bills: []
			};
		}

		if (includeCostCenter && foundBill.items.length)
			crLedger.costCategory = [{
				category: foundBill.items[0].ccVehicle && foundBill.items[0].ccVehicle.category,
				center: Object.values(foundBill.items.reduce((obj, oItem) => {
					if(obj[oItem.ccVehicle]){
						obj[oItem.ccVehicle].amount += oItem.totFreight;
					}else
						obj[oItem.ccVehicle] = {
							name: oItem.ccVehicle.name,
							amount: oItem.totFreight
						};
					return obj;
				}, {}))
			}, {
				category: foundBill.ccBranch.category,
				center: [{
					name: foundBill.ccBranch.name,
					amount: foundBill.amount
				}]
			}];

		if(crLedger)
		aLedger.push(crLedger);


		if (foundBill.cGST) {
			aLedger.push({
				account: body.cGSTAccount,
				lName: body.cGSTAccountName,
				amount: foundBill.cGST,
				cRdR: 'CR',
				bills: [{
					billNo: foundBill.billNo,
					billType: 'New Ref',
					amount: foundBill.cGST,
					remAmt: foundBill.cGST
				}]
			});
		}

		if (foundBill.sGST) {
			aLedger.push({
				account: body.sGSTAccount,
				lName: body.sGSTAccountName,
				amount: foundBill.sGST,
				cRdR: 'CR',
				bills: [{
					billNo: foundBill.billNo,
					billType: 'New Ref',
					amount: foundBill.sGST,
					remAmt: foundBill.sGST
				}]
			});
		}

		if (foundBill.iGST) {
			aLedger.push({
				account: body.iGSTAccount,
				lName: body.iGSTAccountName,
				amount: foundBill.iGST,
				cRdR: 'CR',
				bills: [{
					billNo: foundBill.billNo,
					billType: 'New Ref',
					amount: foundBill.iGST,
					remAmt: foundBill.iGST
				}]
			});
		}

		if (foundBill.adjAmount) {
			aLedger.push({
				account: body.adjDebitAc || foundBill.adjDebitAc,
				lName:  body.adjDebitAcName  || foundBill.adjDebitAcName,
				amount: Math.abs(foundBill.adjAmount),
				cRdR: foundBill.adjAmount < 0 ? 'CR' : 'DR',
				bills: [{
					billNo: foundBill.billNo,
					billType: "On Account",
					amount: Math.abs(foundBill.adjAmount),
					remAmt: Math.abs(foundBill.adjAmount)
				}]
			});
		}

		if (foundBill.totCwt) {
			aLedger.push({
				account: body.woAcc || foundBill.woAcc,
				lName:  body.woAccName  || foundBill.woAccName,
				amount: foundBill.totCwt,
				cRdR: 'CR',
				bills: [{
					billNo: foundBill.billNo,
					billType: "On Account",
					amount: foundBill.totCwt,
					remAmt: foundBill.totCwt
				}]
			});
		}

		let voucherType = req.clientConfig.config.voucher && req.clientConfig.config.voucher.type || "Sales";

		let oVoucher = {
			_id: acknowledgeObj.voucher,
			type: voucherType,
			isEditable: false,
			date: foundBill.billDate,
			dueDate: foundBill.dueDate ? foundBill.dueDate : foundBill.billDate ,
			billNo: foundBill.billNo,
			billType: 'New Ref',
			vT: 'Gr Bill',
			refNo: foundBill.billNo,
			clientId,
			createdBy: userName,
			branch: foundBill.branch,
			narration: remark || '',
			ledgers: aLedger
		};

		let sVch = await voucherService.addVoucherAsync(oVoucher);
		if (sVch && sVch[0] && sVch[0].voucher) {
			acknowledgeObj.voucher = sVch[0].voucher._id;
			try{
				await BillNew.findOneAndUpdate({_id: id}, {
					$set: {
						'acknowledge': acknowledgeObj,
						status: 'Approved'
					}
				});
			}catch(e){
				await voucherService.removeVoucher({
					_id: acknowledgeObj.voucher,
					clientId
				});
				throw e;
			}
		}
		if(req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.account && req.clientConfig.config.account.autoImport){
			return acknowledgeObj.voucher;
		}else{
			return true;
		}

	} catch (e) {
		winston.error('approve sales bill ', e.toString());
		throw e;
	}
}

async function acknowledgePurAssetsBill(id, body, req) {

	let aLedger = [];

	try {

		if (!id)
			throw new Error('Mandatory Fields are required');

		let user = req.user.full_name;
		let clientId = req.user.clientId;

		let oPurchaseBill = await PurchaseBill.findOne({_id: id}).populate(
			{path: 'items', select: {reference_no: 1, amount: 1}}).lean();

		if (oPurchaseBill.plainVoucher)
			throw new Error('Voucher is already generated');

		let multiVoucher = new voucherService.multiVoucherOpr();

		let oVoucher = {
			type: "Purchase",
			refNo: oPurchaseBill.refNo,
			branch: oPurchaseBill.branch,
			narration: oPurchaseBill.remark,
			stationaryId: oPurchaseBill.stationaryId,
			paymentMode: oPurchaseBill.paymentMode,
			paymentRef: oPurchaseBill.paymentRef,
			paymentDate: oPurchaseBill.billDate || new Date(),
			trackPayAs: "bill",
			date: oPurchaseBill.billDate || new Date(),
			dueDate: oPurchaseBill.dueDate ? oPurchaseBill.dueDate : (oPurchaseBill.billDate || new Date()),
			billNo: oPurchaseBill.billNo,
			clientId,
			isEditable: false,
			createdBy: user
		};

		let voucherId = Array.isArray(oPurchaseBill.plainVoucher) ? false : oPurchaseBill.plainVoucher;


		if (oPurchaseBill.adjAmount) {
			oPurchaseBill.adjAmount = Number(parseFloat(oPurchaseBill.adjAmount).toFixed(2));
		} else {
			oPurchaseBill.adjAmount = 0;
		}
		let mergeAc = {};
		if (oPurchaseBill.assetItems.length) {
			// add new discount Voucher
			oPurchaseBill.assetItems.forEach(oData => {
				if (!(oData.accountId && oData.accountName))
					throw new Error(`No account linked on ${oData.name} assets`);

				mergeAc[oData.accountId] = mergeAc[oData.accountId] || {};
				mergeAc[oData.accountId].name = oData.accountName;
				mergeAc[oData.accountId]._id = oData.accountId;
				mergeAc[oData.accountId].amount = mergeAc[oData.accountId].amount || 0;
				mergeAc[oData.accountId].amount += oData.amount;
			});
		}


		if (oPurchaseBill.totAssets) {

			await addLedger({
				account: oPurchaseBill.account,
				accountName: oPurchaseBill.accountName || body.accountName,
				amount: body.billAmount || oPurchaseBill.billAmount,
				type: 'CR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'New Ref',
					amount: body.billAmount || oPurchaseBill.billAmount,
					remAmt: body.billAmount || oPurchaseBill.billAmount
				}
			});

			if (Object.values(mergeAc) && Object.values(mergeAc).length) {
				for (let i = 0; i < Object.values(mergeAc).length; i++) {
					let oMergeAc = Object.values(mergeAc)[i];
					await addLedger({
						account: oMergeAc._id,
						accountName: oMergeAc.name,
						amount: oMergeAc.amount,
						type: 'DR'
					});
				}
			}

			if (oPurchaseBill.totDiscount && oPurchaseBill.discountAcnt) {
				await addLedger({
					account: oPurchaseBill.discountAcnt,
					accountName: oPurchaseBill.discountAcName || body.discountAcName,
					amount: oPurchaseBill.totDiscount,
					type: 'CR',
					oBill: {
						billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
						billType: 'Against Ref',
						amount: oPurchaseBill.totDiscount,
						remAmt: oPurchaseBill.totDiscount
					}
				});
			}

			oVoucher.vT = oPurchaseBill.billType;
		}

		if (oPurchaseBill.iGST && oPurchaseBill.igstAcnt) {
			await addLedger({
				account: oPurchaseBill.igstAcnt,
				accountName: oPurchaseBill.igstAcntName || body.igstAcntName,
				amount: oPurchaseBill.iGST,
				type: 'DR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'On Account',
					amount: oPurchaseBill.iGST,
					remAmt: oPurchaseBill.iGST
				}
			});
		}

		if (oPurchaseBill.sGST && oPurchaseBill.sgstAcnt) {

			await addLedger({
				account: oPurchaseBill.sgstAcnt,
				accountName: oPurchaseBill.sgstAcntName || body.sgstAcntName,
				amount: oPurchaseBill.sGST,
				type: 'DR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'On Account',
					amount: oPurchaseBill.sGST,
					remAmt: oPurchaseBill.sGST
				}
			});
		}

		if (oPurchaseBill.cGST && oPurchaseBill.cgstAcnt) {
			await addLedger({
				account: oPurchaseBill.cgstAcnt,
				accountName: oPurchaseBill.cgstAcntName || body.cgstAcntName,
				amount: oPurchaseBill.cGST,
				type: 'DR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: 'On Account',
					amount: oPurchaseBill.cGST,
					remAmt: oPurchaseBill.cGST
				}
			});
		}


		if (oPurchaseBill.adjAmount) {
			await addLedger({
				account: oPurchaseBill.adjDebitAc,
				accountName: oPurchaseBill.adjDebitAcName,
				amount: Math.abs(oPurchaseBill.adjAmount),
				type: oPurchaseBill.adjAmount < 0 ? 'CR' : 'DR',
				oBill: {
					billNo: oPurchaseBill.refNo || oPurchaseBill.billNo,
					billType: "On Account",
					amount: Math.abs(oPurchaseBill.adjAmount),
					remAmt: Math.abs(oPurchaseBill.adjAmount)
				}
			});
		}

		oVoucher.ledgers = aLedger;

		if (!voucherId) {
			oVoucher._id = mongoose.Types.ObjectId();
			await multiVoucher.add(oVoucher);

			let setQuery = {
				'plainVoucher': oVoucher._id
			};

			await multiVoucher.exec();

			await PurchaseBill.findByIdAndUpdate(id, {
				$set: setQuery
			});

		} else {
			oVoucher._id = voucherId;
			await voucherService.editVoucher(oVoucher);
		}

		return true;

	} catch (e) {
		console.log(e);
		throw e
	}

	async function addLedger(oData) {
		let foundVoucher = aLedger.find(o => o.account.toString() === oData.account.toString() && o.cRdR === oData.type);

		if (foundVoucher) {
			foundVoucher.amount += oData.amount;
			oData.oBill && foundVoucher.bills.push(oData.oBill);
		} else {
			aLedger.push({
				account: oData.account,
				lName: (await Accounts.findOne({_id: oData.account}, {name: 1, ledger_name: 1}).lean() || {}).name,
				amount: oData.amount,
				cRdR: oData.type,
				bills: oData.oBill ? (Array.isArray(oData.oBill) ? oData.oBill : [oData.oBill]) : []
			});
		}
	}
}

async function revertAcknowledgedSalesBill(id, req) {
	let userName = req.user.full_name;
	let clientId = req.user.clientId;
	let foundBill;

	try {
		foundBill = await BillNew.findOne({_id: id}).lean();

		if (!(foundBill && foundBill._id))
			throw new Error('No Bill Found');

		if (!foundBill.acknowledge.status)
			throw new Error('Bill is Not Acknowledged');

		if (foundBill.receiving && foundBill.receiving.moneyReceipt && foundBill.receiving.moneyReceipt.length) {
			if(foundBill.receiving.moneyReceipt.filter(o => !o.tmRef).length)
				throw new Error('Bill cannot be Reverted. Money is received on the bill');
		}

		if (foundBill.receiving && foundBill.receiving.deduction && foundBill.receiving.deduction.length)
			throw new Error('Bill cannot be Reverted. Credit Note is generated for the bill');

		let foundVoucher = await voucherService.findVoucherByIdAsync(foundBill.acknowledge.voucher, {acImp: 1});

		if (!(foundVoucher && foundVoucher._id))
			throw new Error('Voucher doesn\'t exist');

		if (foundVoucher.acImp.st)
			throw new Error('Bill cannot be Reverted, Voucher is already imported to A/c');

		await voucherService.removeVoucher({
			_id: foundBill.acknowledge.voucher
		});

		await BillNew.findOneAndUpdate({_id: id}, {
			$set: {
				status: 'Unapproved',
				'acknowledge.user': req.user,
				'acknowledge.status': false,
				last_modified_by : req.user.full_name,
				last_modified_at : new Date()
			},
			$unset: {
				'acknowledge.date': 1,
				'acknowledge.dueDate': 1,
				'acknowledge.systemDate': 1,
				'acknowledge.remark': 1,
				'acknowledge.voucher': 1
			}
		});

	} catch (e) {
		console.error('sale bill voucher revert error', e.message, e);
		throw e;
	}
}

async function getOnAccountForBP(aFoundData, oPFil) {
	let aBpsAc = [];
	for (let i = 0; i < aFoundData.length; i++) {
		if (aFoundData[i].billingParty && aFoundData[i].billingParty.account) {
			if (aFoundData[i].billingParty && aFoundData[i].billingParty.account) {
				aBpsAc.push(mongoose.Types.ObjectId(aFoundData[i].billingParty.account));
			}

		}
	}
	let onAccFil = {
		date: oPFil.billDate,
		clientId: oPFil.clientId,
		'ledgers.account': {$in: aBpsAc},
		"ledgers.bills.billType": "On Account",
		"vT": "Customer Receipts",
		"deleted": {"$not": {"$eq": true}}
	};
	const onAccountQ = [
		{$match: onAccFil},
		{
			"$unwind": {
				"path": "$ledgers",
				"preserveNullAndEmptyArrays": true
			}
		},
		{$match: {'ledgers.cRdR': 'CR'}},
		{
			"$group": {
				"_id": "$ledgers.account",
				"amount": {
					$sum: "$ledgers.amount"
				}
			}
		}
	];
	let onAcQuery = {aggQuery: onAccountQ, no_of_docs: 10000};
	let aOnAcc = await serverSidePage.requestData(VoucherModel, onAcQuery);
	if (aOnAcc.length) {
		for (let i = 0; i < aFoundData.length; i++) {
			for (let a = 0; a < aOnAcc.length; a++) {
				if (aFoundData[i].billingParty && aFoundData[i].billingParty.account && aFoundData[i].billingParty.account.toString() == aOnAcc[a]._id.toString()) {
					aFoundData[i].onAccount = aOnAcc[a].amount;
					aOnAcc.splice(a, 1);
				}
			}
		}
	}
};

function formatData(data) {
	var formattedData = "";
	// for (var key in data) {
	//     formattedData += (key + '=' + data[key] + '&');
	// }
	formattedData = 'data=' + JSON.stringify(data);

	formattedData = formattedData.replace(/  /g, " ");
	formattedData = formattedData.replace(/ /g, "%20");
	formattedData = formattedData.replace(/ /g, "%20");
	formattedData = formattedData.replace(/"/g, '%22');
	formattedData = formattedData.replace(/&/g, '%26');

	// console.log(formattedData.substring(0, formattedData.length - 1));
	// return formattedData.substring(0, formattedData.length - 1);
	return formattedData;
}
