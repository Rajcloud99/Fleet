let Voucher = commonUtil.getModel('voucher');
const uuidv4 = require('uuid/v4');
let Accounts = commonUtil.getModel('accounts');
const serverSidePage = require('../../utils/serverSidePagination');
const billingPartyService = commonUtil.getService('billingParty');
let moment = require('moment');
let Driver = commonUtil.getModel('driver');
let Trip = commonUtil.getModel('trip');
const logsService = commonUtil.getService('logs');
let AcBal = commonUtil.getModel('accountbalances');
const ReportExcelService = commonUtil.getService('reportExel');

const ALLOWED_FILTER = ['_id','cost_center', 'type', 'branch', 'narration', 'createdBy', 'billNo', 'voucher', 'vT', 'from_date', 'to_date', 'from', 'to', 'clientId', 'ledger', 'refNo', 'refNos', '$and', '$or', 'clientId', 'reversed', 'acImp.st', 'acExp.st', 'ledgers.amount', 'tdsSection', 'tdsVoucher.paid', 'link.TDS', 'vehicleExp.purchaseBillNo', 'chequeClear.date'];

module.exports = {
	findVoucherByQuery,
	findVoucherByQueryAsync,
	findGSTVoucherByQuery,
	findGSTVoucherByQueryAsync,
	findGSTPaymentVoucherByQuery,
	findGSTPaymentVoucherByQueryAsync,
	findGSTVoucherCalByQuery,
	findGSTVoucherCalByQueryAsync,
	findVoucherByIdAsync,
	findVoucherById,
	editVoucher,
	addVoucher,
	addVoucherAsync,
	removeVoucher,
	removeVoucherByFilter,
	removeTripVoucher,
	aggrV2,
	formatPayload,
	formatPayloadAndAdd,
	formatPayloadAndEdit,
	adjustDailyBal,
	adjustDailyBalV2,
	adjustDailyBalOnRevert,
	importAccounts,
	importAccountsV2,
	importOne,
	updateExported,
	reverseAccounts,
	reverseOne,
	ledgerReport,
	bankReconciliation,
	resetDailyBal,
	resetDailyBalV2,
	bill2bill,
	billAgainstRef,
	updateBillRemainingAmount,
	tempUpdateBillRemainingAmountForOldData,
	multiVoucherOpr,
	billedLedgerOutstandingRpt,
	getTDSMonthlyReport,
	setChequeData,
	unSetChequeData,
	getDrSecurity,
	// getAllDrAcLedgers
};

var allowedFilterOfBranchExpense = ['from', 'to', 'account', 'clientId', 'branch'];

var constructFilterOfBranchExpense = function (query) {
	query.dateKey = query.dateKey || 'date';
	var fFilter = {
		deleted: {$not: {$eq: true}}
	};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, allowedFilterOfBranchExpense)) {
			if (i == 'from') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				fFilter[query.dateKey] = fFilter[query.dateKey] || {};
				fFilter[query.dateKey].$gte = startDate;
			} else if (i == 'to') {
				let endDate = new Date(query[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				fFilter[query.dateKey] = fFilter[query.dateKey] || {};
				fFilter[query.dateKey].$lte = endDate;
			} else if (i === 'account') {
				if (query[i] && query[i] != "undefined" && query[i].length > 0) {
					fFilter['ledgers.account'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])};
				}
			} else if (i === 'branch') {
				fFilter[i] = Array.isArray(query[i]) ? {$in: otherUtil.arrString2ObjectId(query[i])} : otherUtil.arrString2ObjectId(query[i]);
			} else if (query[i].match(/^[0-9a-fA-F]{24}$/)) {
				fFilter[i] = mongoose.Types.ObjectId(query[i]);
			} else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

module.exports.tdsServReport = async function (reqBody, next) {
	let oPFil = constructFilters(reqBody);
	const aggrQuery = [
		{$match: oPFil},
		{
			"$sort": {
				"_id": -1
			}
		},
		{
			$unwind: {
				"path": "$ledgers",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$project: {
				"date": 1,
				"refNo": 1, //reference
				"tdsSection": 1, //tdsSection
				"amount": "$ledgers.amount", // deductionDetails totalAmount
				"tdsAmount": "$ledgers.tdsAmount", // deductionDetails tdsAmount
				"DeducteeName": "$ledgers.lName"
			}
		}
	];

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let resultData =  await serverSidePage.requestData(Voucher, oQuery);
	let tdsData = [];
	 resultData.forEach(obj=>{
	 	if(obj.tdsAmount)
			tdsData.push(obj);
	 });
	return tdsData;
};

module.exports.getBranchExpenseAsync = async function (reqBody, next) {
	let oPFil = constructFilterOfBranchExpense(reqBody);
	oPFil.type = "Payment";
	const aggrQuery = [
		{$match: oPFil},
		{
			"$sort": {
				"_id": -1
			}
		},
		{
			"$unwind": {
				"path": "$ledgers",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$match: {
				'ledgers.cRdR': 'DR',
			}
		},
		{
			"$lookup": {
				"from": "accounts",
				"localField": "ledgers.account",
				"foreignField": "_id",
				"as": "ledgers.accountDetail"
			}
		},
		{
			"$unwind": {
				"path": "$ledgers.accountDetail",
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
				"path": "$branch",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			"$match": {
				"ledgers.accountDetail.type.name": {
					"$nin": [
						"Sundry Creditors",
						// "Sundry Creditors",
						"Sundry Creditors - Tracking GPS",
						"Sundry Creditors Spare Part",
						"Sundry Creditors Credit Card",
						"Sundry Creditors  BODY",
						"Sundry Creditors-Diesel A/c",
						"Sundry Creditors Freight Paid",
						"Sundry Creditors GENERAL",
						"Sundry Creditors Job Works",
						"Sundry Creditors-Store",
						"Sundry Creditors Lubricant",
						"Sundry Creditors Tyre",
						// "Sundry Creditors",
						// "Sundry Creditors Freight Paid",
						// "Sundry Creditors",
						"Sundry Creditors Freight Paid",
						"Sundry Creditors GENERAL",
						// "Sundry Creditors GENERAL",
						// "Sundry Creditors",
						// "Direct Expenses",
						"RIL",
						"Vehicle Opertational Expenses",
						"Sundry Debtors-To Pay",
						"Sundry Debtors",
						"Current Liabilities",
						"Assets",
						"TDS PAYABLE",
						"Unsecured Loans",
						"TRUCKS",
						// "Loans and Advances (Assets)",
						"Bio Diesel",
						// "Cash-in-hand",
						// "Vehicle Opertational Expenses",
						"Apolllo Tyre",
						"Sales Accounts",
						"Freight Receipts A/C",
						"Purchase Accounts",
						"Truck Hire Charges"
					]
				},
				"ledgers.accountDetail.group": {
					"$nin": [
						"banks",
						"Vendor"
					]
				}
			}
		},
		{
			"$group": {
				"_id": {
					"account": "$ledgers.account",
					"my": {
						"$dateToString": {
							"date": "$date",
							"format": "%m-%Y",
							"timezone": "Asia/Kolkata"
						}
					},
					"branch": "$branch.name"
				},
				"particular": {
					"$first": "$ledgers.lName"
				},
				"group": {
					"$first": "$ledgers.accountDetail.type.name"
				},
				"crSum": {
					"$sum": "$ledgers.amount"
				}
			}
		},
		{
			$project: {
				"branch": "$_id.branch",
				"account": "$_id.account",
				"my": "$_id.my",
				"particular": "$particular",
				group: "$group",
				crSum: "$crSum"
			}
		},

		{
			"$group": {
				"_id": {
					"account": "$account",
					"branch": "$branch"
				},
				"month": {
					"$push": {
						"k": "$my",
						"v": "$crSum"
					}
				},
				"name":   {
					"$first": "$particular"
				},
				"group": {
					"$first": "$group"
				},

			}
		},
		{
			$project: {
				_id: 0,
				name: '$name',
				group: '$group',
				branch: '$_id.branch',
				month: {
					$arrayToObject: '$month'
				}
			}
		},
		{
			"$group": {
				"_id": {
					"branch": "$branch"
				},
				"aExp": {
					"$push": "$$ROOT"
				}
			}
		},
		{
			$project: {
				_id: 0,
				aExp: 1,
				branch: '$_id.branch'
			}
		},
		{$sort: {branch: 1}},
	];

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	return await serverSidePage.requestData(Voucher, oQuery);
};

module.exports.adminExpenseAsync = async function (reqBody, next) {
	let oPFil = constructFilterOfBranchExpense(reqBody);
	const aggrQuery = [
		{$match: oPFil},
		{
			"$sort": {
				"_id": -1
			}
		},
		{
			"$unwind": {
				"path": "$ledgers",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			$match: {
				'ledgers.cRdR': 'CR',
			}
		},
		{
			"$lookup": {
				"from": "accounts",
				"localField": "ledgers.account",
				"foreignField": "_id",
				"as": "ledgers.accountDetail"
			}
		},
		{
			"$unwind": {
				"path": "$ledgers.accountDetail",
				"preserveNullAndEmptyArrays": true
			}
		},
		{
			"$group": {
				"_id": {
					"account": "$ledgers.account",
					my: {
						$dateToString: {
							date: '$date',
							format: "%m-%Y"
						}
					},
				},
				"particular": {
					"$first": "$ledgers.lName"
				},
				"crSum": {
					"$sum": "$ledgers.amount"
				}
			}
		},
		{
			"$group": {
				"_id": {
					"account": "$_id.account",
				},
				month: {
					$push: {
						'k': '$_id.my',
						'v': '$crSum'
					}
				},
				"name": {
					"$first": "$particular"
				},
			}
		},
		{
			$project: {
				_id: 0,
				name: '$name',
				month: {
					$arrayToObject: '$month'
				}
			}
		}
	];

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	return await serverSidePage.requestData(Voucher, oQuery);
};

function constructFiltersPayCal(oQuery) {
	oQuery.dateKey = oQuery.dateKey || oQuery.dateType || 'date';
	let oFilter = {deleted: {$not: {$eq: true}}};
	for (i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from_date') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				oFilter[i] = oFilter[i] || {};
				oFilter[i].$gte = startDate;
			} else if (i === 'to_date') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				endDate.setMilliseconds(59);
				oFilter[i] = oFilter[i] || {};
				oFilter[i].$lte = endDate;
			} else if (i === 'from' || i === 'to') {
				if (oQuery[i] instanceof Array) {
					oFilter['ledgers.account'] = {$in: otherUtil.arrString2ObjectId(oQuery[i])};
				} else if (typeof oQuery[i] === "string") {
					oFilter['ledgers.account'] = mongoose.Types.ObjectId(oQuery[i]);
				}
			} else if (i === 'ledger') {
				if (oQuery[i] instanceof Array) {
					oFilter['ledgers.account'] = {$in: otherUtil.arrString2ObjectId(oQuery[i])};
				} else if (typeof oQuery[i] === "string") {
					oFilter['ledgers.account'] = mongoose.Types.ObjectId(oQuery[i]);
				}
			} else if (i === 'refNo') {
				if (oQuery[i] instanceof RegExp)
					oFilter[i] = oQuery[i];
				else
					oFilter[i] = new RegExp('^' + oQuery[i].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
			} else if (i === 'refNos') {
				oFilter['refNo'] = {$in: oQuery[i]};
			} else if (i === '_id') {
				if (typeof oQuery[i] === 'object' && !Array.isArray(oQuery[i]))
					oFilter[i] = oQuery[i];
				else
					oFilter[i] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
			} else if (i === "narration") {
				oFilter[i] = {
					$regex: oQuery[i],
					$options: 'i'
				};
			} else if (i === 'vT') {
				if (oQuery[i] instanceof Array) {
					oFilter[i] = {$in: oQuery[i]};
				} else {
					oFilter[i] = oQuery[i];
				}
			} else if (i === '$or') {
				oFilter[i] = oFilter[i] || [];
				oFilter[i].push(...(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]]));
			} else if (i === 'type') {
				if (oQuery[i] instanceof Array) {
					oFilter['type'] = {$in: oQuery[i]};
				} else {
					oFilter['type'] = oQuery[i];
				}
			} else if (i === 'billNo') {
				oFilter["ledgers.bills"] = {$elemMatch: {"billNo": new RegExp(`^${oQuery[i].trim()}$`, 'i')}};
			} else if (i === 'branch') {
				oFilter["branch"] = otherUtil.arrString2ObjectId(oQuery[i]);
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

function constructFilters(oQuery) {
	oQuery.dateKey = oQuery.dateKey || oQuery.dateType || 'date';
	let oFilter = {deleted: {$not: {$eq: true}}};
	for (i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from_date') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				oFilter[oQuery.dateKey] = oFilter[oQuery.dateKey] || {};
				oFilter[oQuery.dateKey].$gte = startDate;
			} else if (i === 'to_date') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				endDate.setMilliseconds(59);
				oFilter[oQuery.dateKey] = oFilter[oQuery.dateKey] || {};
				oFilter[oQuery.dateKey].$lte = endDate;
			} else if (i === 'from' || i === 'to') {
				if (oQuery[i] instanceof Array) {
					oFilter['ledgers.account'] = {$in: otherUtil.arrString2ObjectId(oQuery[i])};
				} else if (typeof oQuery[i] === "string") {
					oFilter['ledgers.account'] = mongoose.Types.ObjectId(oQuery[i]);
				}
			} else if (i === 'ledger') {
				if (oQuery[i] instanceof Array) {
					oFilter['ledgers.account'] = {$in: otherUtil.arrString2ObjectId(oQuery[i])};
				} else if (typeof oQuery[i] === "string") {
					oFilter['ledgers.account'] = mongoose.Types.ObjectId(oQuery[i]);
				}
			} else if (i === 'refNo') {
				if (oQuery[i] instanceof RegExp)
					oFilter[i] = oQuery[i];
				else
					oFilter[i] = new RegExp('^' + oQuery[i].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
			} else if (i === 'refNos') {
				oFilter['refNo'] = {$in: oQuery[i]};
			} else if (i === '_id') {
				if (typeof oQuery[i] === 'object' && !Array.isArray(oQuery[i]))
					oFilter[i] = oQuery[i];
				else
					oFilter[i] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
			} else if (i === "narration") {
				oFilter[i] = {
					$regex: oQuery[i],
					$options: 'i'
				};
			} else if (i === 'vT') {
				if (oQuery[i] instanceof Array) {
					oFilter[i] = {$in: oQuery[i]};
				} else {
					oFilter[i] = oQuery[i];
				}
			} else if (i === '$or') {
				oFilter[i] = oFilter[i] || [];
				oFilter[i].push(...(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]]));
			} else if (i === 'type') {
				if (oQuery[i] instanceof Array) {
					oFilter['type'] = {$in: oQuery[i]};
				} else {
					oFilter['type'] = oQuery[i];
				}
			} else if (i === 'billNo') {
				oFilter["ledgers.bills"] = {$elemMatch: {"billNo": new RegExp(`^${oQuery[i].trim()}$`, 'i')}};
			} else if (i === 'branch') {
				oFilter["branch"] = otherUtil.arrString2ObjectId(oQuery[i]);
			}else if (i === 'cost_center') {
				oFilter["ledgers.costCategory.center"] = {$elemMatch: {"name": new RegExp(oQuery[i])}};
			}else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

async function insertVoucher(body, next) {
	let dataToSave = new Voucher(body);
	dataToSave.saveAsync()
		.then(async function (data) {
			if (data) {
				return next(null, {"voucher": data});
			}
		}).catch(function (e) {
		return next(e);
	});
}

async function findVoucherByBillNo(oBill, projection) {
	if (!projection) projection = {};
	let oFil = {
		"ledgers.bills": {$elemMatch: {"billType": "New Ref", "billNo": oBill.billNo}},
		clientId: oBill.clientId
	};
	//TODO check if ledgers.account filter can be appended for confirmation
	let aVch = await Voucher.find(oFil, projection);
	return aVch;
}

async function addVoucherAsync(body) {
	try {
		return await new Promise(function (resolve, reject) {
			addVoucher(body, function (err, data) {
				if (err) {
					reject(err);
				}
				resolve(data);
			});
		});
	} catch (e) {
		throw e;
	}
}

async function addVoucher(body, next) {
	let err, msg;

	if ((err = ledgerValidation(body.ledgers)) && !err.isValid)
		return next(err.message + " " + body.refNo);

	// if(body.ledgers && body.ledgers.length){
	//
	// 	for(let oLed of body.ledgers){
	// 		if(oLed.account) {
	// 			let foundAcc = await Accounts.findOne({_id: oLed.account}, {
	// 				'opn_bal_date': 1,
	// 				'opening_balance': 1,
	// 				'name': 1
	// 			}).lean();
	//
	// 			if(foundAcc && foundAcc.opn_bal_date && new Date(foundAcc.opn_bal_date) > new Date(body.date)){
	// 				msg = 'The transaction is not allowed before opening balance date in account ' + foundAcc.name;
	// 			}
	// 		}
	// 	}
	// }
	// if(msg)
	// 	return next(msg + " " + body.refNo);

	var intPart = parseInt((body.refNo || '').replace(/^.*([0-2][0-9]|(3)[0-1])(\-|\/)(((0)[0-9])|((1)[0-2]))(\-|\/)\d{2,4}/i, '').replace(/\D+/g, ''));
	var wordPart = (body.refNo || '').replace(/\W+/ig, '').replace(/\d+/g, '');
	if (intPart) body.refNoInt = intPart;
	if (wordPart) body.refNoWord = wordPart;
	body.uuid = uuidv4();
	for (let l = 0; l < body.ledgers.length; l++) {
		for (let b = 0; b < (body.ledgers[l].bills && body.ledgers[l].bills.length); b++) {
			if (body.ledgers[l].bills[b].billType == 'New Ref' && body.ledgers[l].bills[b].billNo) {
				body.ledgers[l].bills[b].remAmt = body.ledgers[l].bills[b].amount;
				/*
				let account = await Accounts.findOne({_id: body.ledgers[l].account}, {crDays: 1});
				if (account && account.crDays) {
					body.ledgers[l].bills[b].dueDate = new Date(body.date + (account.crDays * 24 * 3600000));
				} else {
					body.ledgers[l].bills[b].dueDate = new Date(body.date);
				}
				*/
				body.ledgers[l].bills[b].dueDate = body.dueDate ? new Date(body.dueDate) : new Date(body.date);
				body.trackPayAs = 'bill';
			}
		}
	}
	insertVoucher(body, async function (err, data) {
		if (err) {
			winston.error(err.toString());
			return next(err);
		}
		next(null, [data]);
		let voucher = data.voucher;// JSON.parse(JSON.stringify(data.voucher));
		try {
			let aBills = [];
			let excluded_vT = ['Happay','Fastag','Diesel','Driver Cash'];
			if(excluded_vT.indexOf(voucher.vT) > -1){
				//TODO exclude bill to bill for Trip advance
			}else{
				for (let l = 0; l < (voucher && voucher.ledgers.length); l++) {
					for (let b = 0; b < (voucher.ledgers[l].bills && voucher.ledgers[l].bills.length); b++) {
						if (voucher.ledgers[l].bills[b].billNo) {
							aBills.push({
								billNo: voucher.ledgers[l].bills[b].billNo,
								account: voucher.ledgers[l].account,
								clientId: voucher.clientId
							})
						}

					}
				}
			}

			next(null, [data]);

			if (aBills.length)
				await updateBillRemainingAmount(aBills);
		} catch (e) {
			winston.error(e);
			return next(null, [data]);
		}
	}).catch(next)
}

async function editVoucher(body) {
	try {
		let err, msg;
		if (body.ledgers && (err = ledgerValidation(body.ledgers)) && !err.isValid)
			throw new Error(err.message);

    // if(body.ledgers && body.ledgers.length){
	//
	// 	for(let oLed of body.ledgers){
	// 		if(oLed.account) {
	// 			let foundAcc = await Accounts.findOne({_id: oLed.account}, {
	// 				'opn_bal_date': 1,
	// 				'opening_balance': 1,
	// 				'name': 1
	// 			}).lean();
	//
	// 			if(foundAcc && foundAcc.opn_bal_date && new Date(foundAcc.opn_bal_date) > new Date(body.date)){
	// 				msg = 'The transaction is not allowed before opening balance date in account ' + foundAcc.name;
	// 			}
	// 		}
	// 	}
    // }
    // if(msg)
	// 	throw new Error(msg);

		let voucher = await Voucher.findById(body._id, {voucher: 1, _id: 1, acImp: 1, isEditable: 1}).lean();
		if (!voucher) {
			return Promise.reject({"status": "ERROR", "message": 'voucher id not found to update'});
		}

		// if (voucher.isEditable == false)
		// 	return Promise.reject({ "status": "ERROR", "message": 'Voucher isn\'t created Manually, so cannot be edited.'});
        console.log("hi");
		if (voucher && voucher.acImp && voucher.acImp.st) {
			return Promise.reject({"status": "ERROR", "message": 'please revert its voucher first'});
		}
		var intPart = parseInt((body.refNo || '').replace(/^.*([0-2][0-9]|(3)[0-1])(\-|\/)(((0)[0-9])|((1)[0-2]))(\-|\/)\d{2,4}/i, '').replace(/\D+/g, ''));
		var wordPart = (body.refNo || '').replace(/\W+/ig, '').replace(/\d+/g, '');
		let oSt = body;//{ ...getAllowedFields(body) };
		if (intPart) oSt['refNoInt'] = intPart;
		if (wordPart) oSt['refNoWord'] = wordPart;
		voucher = await Voucher.findByIdAndUpdate(body._id, {$set: oSt}, {new: true}).lean();

		let aBills = [];
		for (let l = 0; l < (voucher && voucher.ledgers.length); l++) {
			for (let b = 0; b < (voucher.ledgers[l].bills && voucher.ledgers[l].bills.length); b++) {
				if (voucher.ledgers[l].bills[b].billNo) {
					aBills.push({
						billNo: voucher.ledgers[l].bills[b].billNo,
						account: voucher.ledgers[l].account,
						clientId: voucher.clientId
					})
				}

			}
		}
		if (aBills.length) {
			updateBillRemainingAmount(aBills);
		}

		return Promise.resolve({"status": "OK", "message": "voucher edited successfully", data: voucher});
	} catch (e) {
		return Promise.reject({"status": "ERROR", "message": e.toString()});
	}
}

async function removeVoucher({_id, clientId}) {
	try {
		let voucher = await Voucher.findById(_id, {_id: 1, acImp: 1, ledgers: 1, clientId: 1}).lean();
		if (!voucher) {
			return Promise.reject({"status": "ERROR", "message": "voucher is does not exist in account."});
		} else if (voucher.acImp && !voucher.acImp.st) {
			let aBills = [];
			for (let l = 0; l < voucher.ledgers.length; l++) {
				for (let b = 0; b < (voucher.ledgers[l].bills && voucher.ledgers[l].bills.length); b++) {
					if (voucher.ledgers[l].bills[b].billNo) {
						aBills.push({
							billNo: voucher.ledgers[l].bills[b].billNo,
							account: voucher.ledgers[l].account,
							clientId: voucher.clientId
						})
					}

				}
			}
			let sV = await Voucher.remove({_id: voucher._id});
			if (aBills.length) {
				updateBillRemainingAmount(aBills);
			}
			return Promise.resolve({"status": "OK", "message": "voucher removed successfully"});
		} else {
			return Promise.reject({"status": "ERROR", "message": "voucher is imported in account."});
		}
	} catch (e) {
		return Promise.reject({"status": "ERROR", "message": e.toString()});
	}
}

async function removeVoucherByFilter(filter) {
	try {
		if (Object.keys(filter).length) {
			let aVoucher = await Voucher.find(filter, {_id: 1, acImp: 1}).lean();
			for (let oVch of aVoucher) {
				if (oVch && oVch.acImp && oVch.acImp.st)
					throw new Error("voucher is imported in account.");
			}
			await Voucher.remove({_id: {$in: aVoucher.map(o => o._id)}});
		} else {
			throw new Error("No filter found");
		}
	} catch (e) {
		throw e;
	}
}

async function removeTripVoucher({_id, clientId}) {
	try {
		let voucher = await Voucher.findById(_id, {_id: 1, acImp: 1}).lean();
		if (voucher) {
			let sV = await Voucher.remove({_id: voucher._id});
			return Promise.resolve({"status": "OK", "message": "voucher removed successfully"});
		} else {
			return Promise.reject({"status": "ERROR", "message": "voucher not found in account."});
		}
	} catch (e) {
		return Promise.reject({"status": "ERROR", "message": e.toString()});
	}
}

async function findGSTVoucherByQueryAsync(body, projection) {
	try {
		return await new Promise(function (resolve, reject) {
			findGSTVoucherByQuery(body, projection, function (err, data) {
				if (err) reject(err);
				resolve(data);
			});
		});

	} catch (e) {
		throw e;
	}
}

async function findGSTVoucherByQuery(query, projection, next) {
	let defPr = projection || {
		ledgers: 1,
		clientId: 1,
		refNo: 1,
		refNoInt: 1,
		vT: 1,
		date: 1,
		chequeDate: 1,
		narration: 1,
		uuid: 1,
		"branch._id": 1,
		"branch.name": 1,
		"branch.crBook": 1,
		"branch.mrBook": 1,
		"branch.refNoBook": 1,
		"branch.fpaBook": 1,
		type: 1,
		stationaryId: 1,
		paymentMode: 1,
		paymentRef: 1,
		paymentDate: 1,
		isEditable: 1,
		acImp: 1,
		acExp: 1,
		deleted: 1,
		reversed: 1,
		his: 1,
		createdBy: 1,
		created_at: 1,
		last_modified_at: 1,
		last_modified_by_name: 1
	};
	//query.date = query.date || query.billDate;
	let skip = 0, no_of_docs = 10000;
	let oFilter = constructFilters(query);
	if (query.no_of_docs) {
		no_of_docs = query.no_of_docs;
		if (query.skip) {
			skip = (query.skip - 1) * query.no_of_docs;
		}
	}
	let aggQuery = [
		{
			$match: oFilter
		},
		{
			"$addFields": {
				"ledgerIGST": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"IGST"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerSGST": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"SGST"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerCGST": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"CGST"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerFR": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"Freight Receipt"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerDr": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.cRdR",
								"DR"
							]
						}
					}
				}
			}
		},
		{
			"$unwind": {
				"path": "$ledgerIGST",
				"preserveNullAndEmptyArrays": true
			},

		},
		{
			"$unwind": {
				"path": "$ledgerSGST",
				"preserveNullAndEmptyArrays": true
			},

		},
		{
			"$unwind": {
				"path": "$ledgerCGST",
				"preserveNullAndEmptyArrays": true
			},

		},
		{
			"$unwind": {
				"path": "$ledgerFR",
				"preserveNullAndEmptyArrays": true
			},

		},
		{
			"$unwind": {
				"path": "$ledgerDr",
				"preserveNullAndEmptyArrays": true
			},

		},
		{
			$group:{
				_id:{
					ledgerDr:"$ledgerDr.lName"
				},
				ledgerDr: {$sum: "$ledgerDr.amount"},
				ledgerIGST: {$sum: "$ledgerIGST.amount"},
				ledgerSGST: {$sum: "$ledgerSGST.amount"},
				ledgerCGST: {$sum: "$ledgerCGST.amount"},
				ledgerFR: {$sum: "$ledgerFR.amount"},
				"ledger": {
					"$push": "$$ROOT"
				},
			}
		}
	];
	if (!query.sort) {
		aggQuery.push({$sort: {date: -1}});
	} else {
		aggQuery.push({$sort: query.sort});
	}
	if (query.skip) {
		aggQuery.push({$skip: skip});
	}
	aggQuery.push({$limit: no_of_docs});

	//aggQuery.push({$project: defPr});

	let oQuery = {aggQuery: aggQuery};
	try {
		let aVch = await serverSidePage.requestData(Voucher, oQuery);
		return next(null, aVch);
	} catch (e) {
		winston.error("findVoucherByQuery in VocherService ", e.toString());
		return next(e);
	}
}

async function findGSTPaymentVoucherByQueryAsync(body, projection) {
	try {
		return await new Promise(function (resolve, reject) {
			findGSTPaymentVoucherByQuery(body, projection, function (err, data) {
				if (err) reject(err);
				resolve(data);
			});
		});

	} catch (e) {
		throw e;
	}
}

async function findGSTPaymentVoucherByQuery(query, projection, next) {
	//query.date = query.date || query.billDate;
	let skip = 0, no_of_docs = 10000;
	let oFilter = constructFilters(query);
	if (query.no_of_docs) {
		no_of_docs = query.no_of_docs;
		if (query.skip) {
			skip = (query.skip - 1) * query.no_of_docs;
		}
	}
	let aggQuery = [
		{
			$match: oFilter
		},
		{
			"$addFields": {
				"ledgerIGST": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"IGST"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerSGST": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"SGST"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerCGST": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"CGST"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerFR": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"Freight Receipt"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerDr": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.cRdR",
								"DR"
							]
						}
					}
				}
			}
		},
		{
			"$unwind": {
				"path": "$ledgerIGST.bills",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerIGST",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerSGST",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerCGST",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerFR",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerDr",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$group": {
				"_id": "",
				"ledgerIGST":{$sum:"$ledgerIGST.amount"},
				"ledgerSGST":{$sum:"$ledgerSGST.amount"},
				"ledgerCGST":{$sum:"$ledgerCGST.amount"},
				"ledgerFR":{$sum:"$ledgerFR.amount"},
				"ledgerDr":{$sum:"$ledgerDr.amount"},
				"ledgerIGSTBills":{$sum:"$ledgerIGST.bills.amount"}
			}
		},
		{
			$project: {
				"_id":0,
				"ledgerIGST": "$ledgerIGST",
				"ledgerSGST": "$ledgerSGST",
				"ledgerCGST": "$ledgerCGST",
				"ledgerFR": "$ledgerFR",
				"ledgerDr": "$ledgerDr",
				"ledgerIGSTBills": "$ledgerIGSTBills"
			}
		}
	];
	if (!query.sort) {
		aggQuery.push({$sort: {date: -1}});
	} else {
		aggQuery.push({$sort: query.sort});
	}
	if (query.skip) {
		aggQuery.push({$skip: skip});
	}
	aggQuery.push({$limit: no_of_docs});

	let oQuery = {aggQuery: aggQuery};
	try {
		let aVch = await serverSidePage.requestData(Voucher, oQuery);
		return next(null, aVch);
	} catch (e) {
		winston.error("findVoucherByQuery in VocherService ", e.toString());
		return next(e);
	}
}

async function findGSTVoucherCalByQueryAsync(body, projection) {
	try {
		return await new Promise(function (resolve, reject) {
			findGSTVoucherCalByQuery(body, projection, function (err, data) {
				if (err) reject(err);
				resolve(data);
			});
		});

	} catch (e) {
		throw e;
	}
}

async function findGSTVoucherCalByQuery(query, projection, next) {
	//query.date = query.date || query.billDate;
	let skip = 0, no_of_docs = 10000;
	let oFilter = constructFiltersPayCal(query);
	if (query.no_of_docs) {
		no_of_docs = query.no_of_docs;
		if (query.skip) {
			skip = (query.skip - 1) * query.no_of_docs;
		}
	}
	let aggQuery = [
		{
			$match: oFilter
		},
		{
			"$addFields": {
				"ledgerIGST": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"IGST"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerIGSTFee": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"IGST Fee"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerIGSTPenalty": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"IGST Penalty"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerIGSTInterest": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"IGST Interest"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerSGST": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"SGST"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerSGSTFee": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"SGST Fee"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerSGSTPenalty": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"SGST Penalty"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerSGSTInterest": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"SGST Interest"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerCGST": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"CGST"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerCGSTFee": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"CGST Fee"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerCGSTPenalty": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"CGST Penalty"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerCGSTInterest": {
					"$filter": {
						"input": "$ledgers",
						"as": "ledger",
						"cond": {
							"$eq": [
								"$$ledger.lName",
								"CGST Interest"
							]
						}
					}
				}
			}
		},
		{
			"$addFields": {
				"ledgerDr": {
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
			"$unwind": {
				"path": "$ledgerIGST",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerIGSTFee",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerIGSTPenalty",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerIGSTInterest",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerSGST",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerSGSTFee",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerSGSTPenalty",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerSGSTInterest",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerCGST",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerCGSTFee",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerCGSTPenalty",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerCGSTInterest",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$unwind": {
				"path": "$ledgerCR",
				"preserveNullAndEmptyArrays": true
			},
		},
		{
			"$group": {
				"_id": "",
				"ledgerIGST":{$sum:"$ledgerIGST.amount"},
				"ledgerIGSTFee":{$sum:"$ledgerIGSTFee.amount"},
				"ledgerIGSTPenalty":{$sum:"$ledgerIGSTPenalty.amount"},
				"ledgerIGSTInterest":{$sum:"$ledgerIGSTInterest.amount"},
				"ledgerSGST":{$sum:"$ledgerSGST.amount"},
				"ledgerSGSTFee":{$sum:"$ledgerSGSTFee.amount"},
				"ledgerSGSTPenalty":{$sum:"$ledgerSGSTPenalty.amount"},
				"ledgerSGSTInterest":{$sum:"$ledgerSGSTInterest.amount"},
				"ledgerCGST":{$sum:"$ledgerCGST.amount"},
				"ledgerCGSTFee":{$sum:"$ledgerCGSTFee.amount"},
				"ledgerCGSTPenalty":{$sum:"$ledgerCGSTPenalty.amount"},
				"ledgerCGSTInterest":{$sum:"$ledgerCGSTInterest.amount"},
				"ledgerCR":{$sum:"$ledgerCR.amount"}
			}
		},
		{
			$project: {
				"_id":0,
				"ledgerIGSTPaid": "$ledgerIGST",
				"ledgerIGSTFeePaid": "$ledgerIGSTFee",
				"ledgerIGSTPenaltyPaid": "$ledgerIGSTPenalty",
				"ledgerIGSTInterestPaid": "$ledgerIGSTInterest",
				"ledgerSGSTPaid": "$ledgerSGST",
				"ledgerSGSTFeePaid": "$ledgerSGSTFee",
				"ledgerSGSTPenaltyPaid": "$ledgerSGSTPenalty",
				"ledgerSGSTInterestPaid": "$ledgerSGSTInterest",
				"ledgerCGSTPaid": "$ledgerCGST",
				"ledgerCGSTFeePaid": "$ledgerCGSTFee",
				"ledgerCGSTPenaltyPaid": "$ledgerCGSTPenalty",
				"ledgerCGSTInterestPaid": "$ledgerCGSTInterest",
				"ledgerCRPaid": "$ledgerCR"
			}
		}
	];
	if (!query.sort) {
		aggQuery.push({$sort: {date: -1}});
	} else {
		aggQuery.push({$sort: query.sort});
	}
	if (query.skip) {
		aggQuery.push({$skip: skip});
	}
	aggQuery.push({$limit: no_of_docs});

	let oQuery = {aggQuery: aggQuery};
	try {
		let aVch = await serverSidePage.requestData(Voucher, oQuery);
		return next(null, aVch);
	} catch (e) {
		winston.error("findVoucherByQuery in VocherService ", e.toString());
		return next(e);
	}
}

async function findVoucherByQueryAsync(body, projection) {
	try {
		return await new Promise(function (resolve, reject) {
			findVoucherByQuery(body, projection, function (err, data) {
				if (err) reject(err);
				resolve(data);
			});
		});

	} catch (e) {
		throw e;
	}
}

async function findVoucherByQuery(query, projection, next) {
	let defPr = projection || {
		ledgers: 1,
		clientId: 1,
		refNo: 1,
		refNoInt: 1,
		vT: 1,
		date: 1,
		chequeDate: 1,
		chequeNo: 1,
		narration: 1,
		from_date: 1,
		to_date: 1,
		uuid: 1,
		"branch._id": 1,
		"branch.name": 1,
		"branch.crBook": 1,
		"branch.mrBook": 1,
		"branch.refNoBook": 1,
		"branch.fpaBook": 1,
		type: 1,
		stationaryId: 1,
		paymentMode: 1,
		paymentRef: 1,
		paymentDate: 1,
		isEditable: 1,
		acImp: 1,
		acExp: 1,
		deleted: 1,
		reversed: 1,
		his: 1,
		createdBy: 1,
		created_at: 1,
		last_modified_at: 1,
		last_modified_by_name: 1,
		chequeClear: 1,
		link: 1,
		tdsVoucher:1,
		tdsCategory: 1,
		tdsSources: 1,
		tdsSection: 1,
		vehicleExp: 1,
	};
	//query.date = query.date || query.billDate;
	let skip = 0, no_of_docs = 10000;
	let oFilter = constructFilters(query);
	if (query.no_of_docs) {
		no_of_docs = query.no_of_docs;
		if (query.skip) {
			skip = (query.skip - 1) * query.no_of_docs;
		}
	}
	let aggQuery = [
		{$match: oFilter}
	];
	if (!query.sort) {
		aggQuery.push({$sort: {date: -1}});
	} else {
		aggQuery.push({$sort: query.sort});
	}
	if (query.skip) {
		aggQuery.push({$skip: skip});
	}
	aggQuery.push({$limit: no_of_docs});
	aggQuery.push({
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
	if (query.populate) {
		let key = query.key;
		aggQuery.push({
				$lookup: {
					from: 'vouchers',
					localField: 'link.' + key,
					foreignField: '_id',
					as: 'link.' + key
				}
			},
			{
				$unwind: {
					path: '$link.' + key,
					preserveNullAndEmptyArrays: true
				}
			});
	}
	if (query.populatePurBill) {
		aggQuery.push({
				$lookup: {
					from: 'purchasebills',
					localField: 'vehicleExp.purchaseBill',
					foreignField: '_id',
					as: 'vehicleExp.purchaseBill'
				}
			},
			{
				$unwind: {
					path: '$vehicleExp.purchaseBill',
					preserveNullAndEmptyArrays: true
				}
			});
	}
	aggQuery.push({$project: defPr});

	let oQuery = {aggQuery: aggQuery};
	try {
		let aVch = await serverSidePage.requestData(Voucher, oQuery);
		return next(null, aVch);
	} catch (e) {
		winston.error("findVoucherByQuery in VocherService ", e.toString());
		return next(e);
	}
}

function aggrV2(query) {
	let projection;
	if (!query.projection) projection = {};
	let oFilter = {clientId: query.clientId};
	if (query.ledgers) {
		oFilter["ledgers.account"] = {$in: otherUtil.arrString2ObjectId(query.ledgers)};
	}

	oFilter["ledgers.bills.remAmt"] = {
		$gt: 0
	};

	if (query.billNo) {
		if (typeof query.billNo == 'object') {
			if (Array.isArray(query.billNo.eq))
				oFilter["ledgers.bills"] = {
					$in: query.billNo.eq.map(o => ({
						$elemMatch: {
							"billType": "New Ref",
							"billNo": {$regex: o.trim(), $options: 'i'}
						}
					}))
				};
			else
				oFilter['$and'] = [
					{
						'ledgers.bills': {
							$elemMatch: {
								"billType": "New Ref",
								"billNo": {$regex: query.billNo.eq.trim(), $options: 'i'}
							}
						}
					}
				];

			if (query.billNo.ne)
				oFilter['$and'].push({
					'ledgers.bills.billNo': {$nin: Array.isArray(query.billNo.ne) ? query.billNo.ne : [query.billNo.ne]}
				});
		} else
			oFilter["ledgers.bills"] = {
				$elemMatch: {
					"billType": "New Ref",
					"billNo": {$regex: query.billNo.trim(), $options: 'i'}
				}
			};
	}

	let aggrPipe = [
		{$match: oFilter},
		{$unwind: {path: '$ledgers', preserveNullAndEmptyArrays: true}},
		{$match: {'ledgers.account': {$in: otherUtil.arrString2ObjectId(query.ledgers)}}},
		{$unwind: {path: '$ledgers.bills', preserveNullAndEmptyArrays: true}},
	];
	if (query.billNo) {
		let billFilter = {};
		billFilter["ledgers.bills.billType"] = "New Ref";
		if (typeof query.billNo == 'object') {
			if (Array.isArray(query.billNo.eq)) {
				billFilter["ledgers.bills.billNo"] = {
					$in: query.billNo.eq.map(o => ({
						$regex: o.trim(),
						$options: 'i'
					}))
				}
			} else {
				billFilter['$and'] = [{"ledgers.bills.billNo": {$regex: query.billNo.eq.trim(), $options: 'i'}}]
			}
			if (query.billNo.ne)
				billFilter['$and'].push({
					'ledgers.bills.billNo': {$nin: Array.isArray(query.billNo.ne) ? query.billNo.ne : [query.billNo.ne]}
				});
		} else
			billFilter["ledgers.bills.billNo"] = {$regex: query.billNo.trim(), $options: 'i'};

		aggrPipe.push({$match: billFilter});
	}
	aggrPipe.push({$sort: {date: 1, "ledgers.bills.billNo": 1}},
		{$limit: 10});
	return Voucher.aggregate(aggrPipe).allowDiskUse(true);
}

function isAllowed(c) {
	const allowed = ['branch', 'from', 'to', 'stationaryId', 'billNo', 'billType', 'paymentType', 'paymentMode', 'paymentRef', 'paymentDate', 'billDate', 'chequeDate', 'refNo', 'narration', 'amount', 'crBillNo', 'crRef', 'trackPayAs', 'remAmt', 'type'];
	return allowed.indexOf(c) !== -1;
}

function hasAllowedFields(obj) {
	let retVal = false;
	for (key in obj) {
		if (obj.hasOwnProperty(key)) {
			if (isAllowed(key)) {
				retVal = true;
				break;
			}
		}
	}
	return retVal;
}

function getAllowedFields(obj) {
	let oRet = {};
	for (key in obj) {
		if (obj.hasOwnProperty(key)) {
			if (isAllowed(key)) {
				oRet[key] = obj[key];
			}
		}
	}
	return oRet;
}

async function findVoucherByIdAsync(body, projection) {
	try {
		return await new Promise(function (resolve, reject) {
			findVoucherById(body, projection, function (err, data) {
				if (err) reject(err);
				resolve(data);
			});
		});

	} catch (e) {
		throw e;
	}
}

function findVoucherById(id, projection, next) {
	if (!projection) projection = {};
	Voucher.findOneAsync({_id: mongoose.Types.ObjectId(id)}, projection)
		.then(function (data) {
			return next(null, data);
		})
		.catch(next)
}

async function formatPayload(body) {

	try {

		if (body.from && !body.fromName) {
			let foundAcc = await Accounts.findOne({_id: body.from}, {name: 1}).lean();
			body.fromName = foundAcc.name;
		}

		if (body.to && !body.toName) {
			let foundAcc = await Accounts.findOne({_id: body.to}, {name: 1}).lean();
			body.toName = foundAcc.name;
		}

		if (!body.type)
			throw new Error('Voucher type not defined');

		return {
			type: body.type,
			clientId: body.clientId,
			vT: body.vT,
			refNo: body.refNo,
			stationaryId: body.stationaryId,
			isEditable: false,
			narration: body.narration,
			date: body.date,
			branch: body.branch,
			gr: body.gr,
			branchName: body.branchName,
			bSer: body.bSer,
			createdBy: body.createdBy,
			paymentMode: body.paymentMode,
			paymentRef: body.paymentRef,
			paymentDate: body.paymentDate,
			drPay: body.drPay,
			ledgers: [{
				account: body.from,
				lName: body.fromName,
				amount: body.amount,
				cRdR: 'CR',
				bills: calBills(body, 'CR')
			}, {
				account: body.to,
				lName: body.toName,
				amount: body.amount,
				cRdR: 'DR',
				bills: calBills(body, 'DR')
			}],
			_id: body._id || mongoose.Types.ObjectId()
		};

	} catch (e) {
		throw e;
	}

	function calRemAmt(body) {
		return body.billType == "New Ref" ? body.amount : 0;
	}

	function calBills(body, type) {
		if ((body.type === 'Receipt' && type === 'CR') || (body.type === 'Payment' && type === 'DR') || (body.type === 'Journal') || (body.type === 'Contra')) {
			return [{
				billNo: body.billNo,
				billType: body.billType,
				amount: body.amount,
				remAmt: calRemAmt(body),
			}];
		}
	}
}

async function formatPayloadAndAdd(body) {

	try {

		return await addVoucherAsync(await formatPayload(body));

	} catch (e) {
		throw e;
	}
}

async function formatPayloadAndEdit(body) {

	try {

		return await editVoucher(await formatPayload(body));

	} catch (e) {
		throw e;
	}
}

async function adjustDailyBal(voucher, next) {
	try {
		let acbal, oBal;
		let onlyDate = dateUtil.getMorning(voucher.date);
		let stDate = new Date(voucher.date);
		stDate.setDate(stDate.getDate() - 90);
		for (let l = 0; l < voucher.ledgers.length; l++) {
			let oLed = voucher.ledgers[l];
			let acBal = await AcBal.findOne({
				account: oLed.account,
				date: {$lte: onlyDate,$gte:stDate},
				clientId: voucher.clientId
			}).sort({date: -1});
			if (voucher.ledgers[l].cRdR == 'CR') {
				if (acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0) {
					acbal = await AcBal.update({account: oLed.account, date: onlyDate, clientId: voucher.clientId},
						{$inc: {cb: -1 * oLed.amount, cr: oLed.amount}});
				} else if (acBal) {
					oBal = {
						account: oLed.account,
						date: onlyDate,
						clientId: voucher.clientId,
						cb: (-1 * oLed.amount + acBal.cb),
						ob: acBal.cb,
						cr: oLed.amount,
						dr: 0
					};
					acbal = await AcBal.create(oBal);
				} else {
					oBal = {
						account: oLed.account, date: onlyDate, clientId: voucher.clientId, cb: -1 * oLed.amount,
						ob: 0, cr: oLed.amount, dr: 0
					};
					acbal = await AcBal.create(oBal);
				}
				let fAc = await AcBal.updateMany({
						account: oLed.account,
						clientId: voucher.clientId,
						date: {$gt: onlyDate}
					},
					{$inc: {cb: -1 * oLed.amount, ob: -1 * oLed.amount}});
			} else {
				if (acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0) {
					acbal = await AcBal.update({account: oLed.account, date: onlyDate, clientId: voucher.clientId},
						{$inc: {cb: oLed.amount, dr: oLed.amount}});
				} else if (acBal) {
					oBal = {
						account: oLed.account, date: onlyDate, clientId: voucher.clientId, cb: (oLed.amount + acBal.cb),
						ob: acBal.cb, dr: oLed.amount, cr: 0
					};
					acbal = await AcBal.create(oBal);
				} else {
					oBal = {
						account: oLed.account,
						date: onlyDate,
						clientId: voucher.clientId,
						cb: oLed.amount,
						ob: 0,
						dr: oLed.amount,
						cr: 0
					};
					acbal = await AcBal.create(oBal);
				}
				let tAc = await AcBal.updateMany({
						account: oLed.account,
						clientId: voucher.clientId,
						date: {$gt: onlyDate}
					},
					{$inc: {cb: oLed.amount, ob: oLed.amount}});
			}
		}
		return true;
	} catch (e) {
		console.error('adjustDailyBal vch error ',e.toString());
		telegram.sendMessage("adjustDailyBal vch error " + e.toString());
		if (typeof next === "function")
			return next(e.toString());
		else
			throw e;
	}
}

async function adjustDailyBalV2(voucher, next) {
	try {
		let acbal, oBal;
		let onlyDate = dateUtil.getMorning(voucher.date);
		let stDate = new Date(voucher.date);
		// console.log(onlyDate, stDate , voucher.clientId , voucher._id.account , voucher.date);
		stDate.setDate(stDate.getDate() - 90);
		let acBal = await AcBal.findOne({
			account: voucher._id.account,
			date: {$lte: onlyDate, $gte: stDate},
			clientId: voucher.clientId
		}).sort({date: -1});
		let diffDRCR = voucher.dr - voucher.cr;
		if (acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0) {
			acbal = await AcBal.update({account: voucher._id.account, date: onlyDate, clientId: voucher.clientId},
				{$inc: {cb: diffDRCR, dr: voucher.dr, cr: voucher.cr}});
		} else if (acBal) {
			oBal = {
				account: voucher._id.account, date: onlyDate, clientId: voucher.clientId, cb: (diffDRCR + acBal.cb),
				ob: acBal.cb, dr: voucher.dr, cr: voucher.cr
			};
			acbal = await AcBal.create(oBal);
		} else {
			oBal = {
				account: voucher._id.account,
				date: onlyDate,
				clientId: voucher.clientId,
				cb: diffDRCR,
				ob: 0,
				dr: voucher.dr,
				cr: voucher.cr
			};
			acbal = await AcBal.create(oBal);
		}
		let tAc = await AcBal.updateMany({
				account: voucher._id.account,
				clientId: voucher.clientId,
				date: {$gt: onlyDate}
			},
			{$inc: {cb: diffDRCR, ob: diffDRCR}});
		// let AcB = await AcBal.updateMany({
		// 		account: voucher._id.account,
		// 		clientId: voucher.clientId,
		// 		date: {$gt: onlyDate}
		// 	},
		// 	{$inc: {cb: diffDRCR, ob: diffDRCR}});

		let AB = await Accounts.updateMany({
			_id: voucher._id.account,
			clientId: voucher.clientId
		    },
			{$inc: {balance: diffDRCR}});

		return true;
	} catch (e) {
		console.error('adjustDailyBal vch error ', e.toString());
		telegram.sendMessage("adjustDailyBal vch error " + e.toString());
		if (typeof next === "function")
			return next(e.toString());
		else
			throw e;
	}
}

async function adjustDailyBalOnRevert(voucher, next) {
	try {
		let acbal, oBal;
		let onlyDate = dateUtil.getMorning(voucher.date);
		for (let l = 0; l < voucher.ledgers.length; l++) {
			let oLed = voucher.ledgers[l];
			let acBal = await AcBal.findOne({
				account: oLed.account,
				date: {$lte: onlyDate},
				clientId: voucher.clientId
			}).sort({date: -1});
			if (voucher.ledgers[l].cRdR == 'CR') {
				//TODO what if cr dr cb not exists ?
				if (acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0) {
					acbal = await AcBal.update({account: oLed.account, date: onlyDate, clientId: voucher.clientId},
						{$inc: {cb: oLed.amount, cr: -1 * oLed.amount}});
				} else if (acBal) {
					winston.error(" CR acBal on remove not on date  -> " + voucher.refNo + " id "+ voucher._id +" date " + onlyDate + " ac bal date " + acBal.date);
					telegram.sendMessage(" CR acBal on remove not on date  -> " + voucher.refNo + " id "+ voucher._id + " date " + onlyDate);
					oBal = {
						account: oLed.account, date: onlyDate, clientId: voucher.clientId, cb: oLed.amount + acBal.cb,
						ob: acBal.cb, cr: 0, dr: 0
					};
					acbal = await AcBal.create(oBal);
				} else {
					winston.error(" CR acBal on remove not on date  2-> " + voucher.refNo + " id "+ voucher._id + " date " + onlyDate);
					telegram.sendMessage(" CR acBal on remove not on date  2-> " + voucher.refNo + " id "+ voucher._id + " date " + onlyDate);
					oBal = {
						account: oLed.account, date: onlyDate, clientId: voucher.clientId, cb: oLed.amount,
						ob: 0, cr: 0, dr: 0
					};
					acbal = await AcBal.create(oBal);
				}
				//TODO what if some of he row don't have cb,ob
				let fAc = await AcBal.updateMany({
						account: oLed.account,
						clientId: voucher.clientId,
						date: {$gt: onlyDate}
					},
					{$inc: {cb: oLed.amount, ob: oLed.amount}});
			} else {
				if (acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0) {
					acbal = await AcBal.update({account: oLed.account, date: onlyDate, clientId: voucher.clientId},
						{$inc: {cb: -1 * oLed.amount, dr: -1 * oLed.amount}});
				} else if (acBal) {
					winston.error(" DR acBal on remove not on date  -> " + voucher.refNo + " id "+ voucher._id + " date " + onlyDate + " ac bal date " + acBal.date);
					telegram.sendMessage("DR acBal on remove not on date  -> " + voucher.refNo + " id "+ voucher._id + " date " + onlyDate + " ac bal date " + acBal.date);
					oBal = {
						account: oLed.account, date: onlyDate, clientId: voucher.clientId, cb: (acBal.cb - oLed.amount),
						ob: acBal.cb, dr: 0, cr: 0
					};
					acbal = await AcBal.create(oBal);
				} else {
					winston.error(" DR acBal on remove not on date  2-> " + voucher.refNo + " id "+ voucher._id + " date " + onlyDate);
					telegram.sendMessage(" DR acBal on remove not on date  2-> " + voucher.refNo + " id "+ voucher._id + " date " + onlyDate);
					oBal = {
						account: oLed.account,
						date: onlyDate,
						clientId: voucher.clientId,
						cb: -1 * oLed.amount,
						ob: 0,
						dr: 0,
						cr: 0
					};
					acbal = await AcBal.create(oBal);
				}
				let tAc = await AcBal.updateMany({
						account: oLed.account,
						clientId: voucher.clientId,
						date: {$gt: onlyDate}
					},
					{$inc: {cb: -1 * oLed.amount, ob: -1 * oLed.amount}});
			}
		}
		return true;
	} catch (e) {
		console.error('adjustDailyBalOnRevert',e.toString());
		telegram.sendMessage("revert vch error " + e.toString());
		return next(e.toString());
	}
}

async function importAccounts(req, res, next) {
	let aVouchers, aggQuery;
	let defPr = {
		ledgers: 1,
		clientId: 1,
		refNo: 1,
		refNoInt: 1,
		vT: 1,
		date: 1,
		narration: 1,
		uuid: 1,
		type: 1,
		acImp: 1
	};
	if (req.body.ids && (req.body.ids instanceof Array)) {
		aggQuery = [
			{
				$match: {
					clientId: req.user.clientId,
					'acImp.st': {$not: {$eq: true}},
					'acImp.ipr': {$not: {$eq: true}},
					deleted: false,
					_id: {$in: otherUtil.arrString2ObjectId(req.body.ids)}
				}
			},
			{$project: defPr},
		];
		let oQuery = {aggQuery: aggQuery, no_of_docs: 4000};
		aVouchers = await serverSidePage.requestData(Voucher, oQuery);
	} else if (req.body.reqQuery) {
		if (!req.body.reqQuery.from_date || !req.body.reqQuery.to_date) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'from date or  to date not provided !'
			})
		}
		if (moment(req.body.reqQuery.to_date).diff(req.body.reqQuery.from_date, 'days', true) > 31) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'more than 31 days voucher creation not allowed !'
			})
		}
		let oFilter = constructFilters(req.body.reqQuery);
		oFilter.clientId = req.user.clientId;
		oFilter['acImp.st'] = {$not: {$eq: true}};
		oFilter['acImp.ipr'] = {$not: {$eq: true}};
		aggQuery = [
			{$match: oFilter},
			{$project: defPr},
		];
		let oQuery = {aggQuery: aggQuery, no_of_docs: 4000};
		aVouchers = await serverSidePage.requestData(Voucher, oQuery);
	} else {
		return next({
			status: 'ERROR',
			message: 'filters not provided properly !'
		});
	}

	try {
		if (!aVouchers || !aVouchers.length) {
			return res.status(500).json({
				status: 'ERROR',
				message: `Vouchers not found to import`
			});
		} else {
			let aVchIds = [];
			for (let doc of aVouchers) {
				aVchIds.push(doc._id);
			}
			let LockVch = await Voucher.updateMany({_id: {$in: aVchIds}},
				{
					$set: {
						'acImp.ipr': true
					},
					$addToSet: {
						his: {
							by: req.user.full_name,
							at: new Date(),
							cat: 'ipr lock'
						}
					}
				}
			);

			if(!req.body.skipReturn)          // for  settleCompletely
			res.status(200).json({
				status: 'OK',
				message: 'We  are importing ' + aVouchers.length + ' vouchers please wait for some time. Thanks'
			});
			//telegram.sendMessage(aVouchers.length + " Voucher import Request " + config.serverName, req.user.full_name);
		}
		let aVchUpdate = [];
		let aRefs = [];
		let aRefsSuc = [];
		for (let doc of aVouchers) {
			aRefs.push(doc.refNo);
			let bal = await adjustDailyBal(doc, next);
			if (bal) {
				aRefsSuc.push(doc.refNo);
				aVchUpdate.push(doc._id);
			} else {
				winston.error('voucher error on import TA', doc.refNo);
			}
		}
		if (aVchUpdate.length < aVouchers.length) {
			telegram.sendMessage(aVchUpdate.length + "/" + aVouchers.length + " Voucher import error " + config.serverName, req.user.full_name);
			winston.error('Voucher import error ', aRefs.toString(), aRefsSuc.toString());
		}
		if (aVchUpdate.length) {
			let updateOp = await Voucher.updateMany({_id: {$in: aVchUpdate}},
				{
					$set: {
						reversed: false,
						acImp: {
							st: true,
							by: req.user.full_name,
							at: new Date(),
							ipr: false
						}
					}, $addToSet: {
						his: {
							by: req.user.full_name,
							at: new Date(),
							cat: 'AC import'
						}
					}
				}
			);
		}
		//telegram.sendMessage(aVchUpdate.length + "/" + aVouchers.length + " Voucher imported " + config.serverName, req.user.full_name);

		try {
			// Write Log...
			let oDelta = {};
			if (aVchUpdate.length === aVouchers.length) {
				oDelta = {
					"Success": {
						count: aVchUpdate.length,
						status: "Success",
						message: "All Voucher imported Successfully."
					}
				}
			} else if (aVchUpdate.length < aVouchers.length) {

				oDelta = {
					"Success": {
						count: aVchUpdate.length,
						status: "Success",
						message: "Voucher imported Successfully."
					},
					"Fail": {
						count: (aVouchers.length - aVchUpdate.length),
						status: "Fail",
						message: "Fail Recound found."
					}
				}
			}

			await logsService.addLog('Voucher', {
				uif: "create-vouchers-common-" + new Date().toLocaleString(),
				docId: req.user._id,
				category: 'Notification',
				delta: oDelta
			}, req);
			// END Log
		} catch (e) {
			console.log(e);
		}
	} catch (e) {
		winston.error("error in create-vouchers-common " + e.toString());
		telegram.sendMessage(config.serverName + " " + "error in create-vouchers-common " + e.toString(), new Date().toLocaleString());
		// Write Log...


		await logsService.addLog('Voucher', {
			uif: " create-vouchers-common -" + new Date().toLocaleString(),
			docId: req.user._id,
			category: 'Notification',
			delta: {
				"Fail": {
					count: 0,
					status: "Fail",
					message: e.toString()
				}
			}
		}, req);
		// END Log
		if (!res.headersSent) {
			return res.status(500).json({
				status: 'ERROR',
				message: e.toString(),
			});
		}
	}
}

async function importAccountsV2(req, res, next) {
	let aVouchers, aggQuery;
	let defPr = {
		ledgers: 1,
		clientId: 1,
		refNo: 1,
		refNoInt: 1,
		vT: 1,
		date: 1,
		narration: 1,
		uuid: 1,
		type: 1,
		acImp: 1
	};
	let oFil = {
		clientId: req.user.clientId,
		'acImp.st': {$not: {$eq: true}},
		'acImp.ipr': {$not: {$eq: true}},
		deleted: false
	}
	if (req.body.ids && (req.body.ids instanceof Array)) {
		oFil._id = {$in: otherUtil.arrString2ObjectId(req.body.ids)};
		aggQuery = [
			{$match: oFil},
			{$project:defPr},
			{$limit:4000},
			{"$unwind": {path: "$ledgers",preserveNullAndEmptyArrays: true}},
			{
				$group: {
					_id: {account:"$ledgers.account", day: {$dayOfMonth: {date:"$date",timezone:'+05:30'}}, month: {$month: {date:"$date",timezone:'+05:30'}}, year: {$year: "$date"}},
					cr:{"$sum":{"$cond": [{ "$eq": [ "$ledgers.cRdR", 'CR' ] }, "$ledgers.amount", 0]}},
					dr:{"$sum":{"$cond": [	{ "$eq": [ "$ledgers.cRdR", 'DR' ] }, "$ledgers.amount", 0]}},
					date: {$last: '$date'},
					clientId:{$last: '$clientId'},
					lName: {$last: '$lName'},
					aVIds:{$addToSet:'$_id'}
				}
			},
		//	{$project:{_id:1,cr:1,dr:1,date:1,lName:1,aVIdAll:{$push:'$aVIds'}}},
			{$sort:{date:1}}
		];
		let oQuery = {aggQuery: aggQuery, no_of_docs: 4000};
		aVouchers = await serverSidePage.requestData(Voucher, oQuery);
	} else if (req.body.reqQuery) {
		if (!req.body.reqQuery.from_date || !req.body.reqQuery.to_date) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'from date or  to date not provided !'
			})
		}
		if (moment(req.body.reqQuery.to_date).diff(req.body.reqQuery.from_date, 'days', true) > 31) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'more than 31 days voucher creation not allowed !'
			})
		}
		oFil = constructFilters(req.body.reqQuery);
		oFil.clientId = req.user.clientId;
		oFil['acImp.st'] = {$not: {$eq: true}};
		oFil['acImp.ipr'] = {$not: {$eq: true}};
		aggQuery = [
			{$match: oFil},
			{$project: defPr},
			{$limit:4000},
			{"$unwind": {path: "$ledgers",preserveNullAndEmptyArrays: true}},
			{
				$group: {
					_id: {account:"$ledgers.account", day: {$dayOfMonth: {date:"$date",timezone:'+05:30'}}, month: {$month: {date:"$date",timezone:'+05:30'}}, year: {$year: "$date"}},
					cr:{"$sum":{"$cond": [{ "$eq": [ "$ledgers.cRdR", 'CR' ] }, "$ledgers.amount", 0]}},
					dr:{"$sum":{"$cond": [	{ "$eq": [ "$ledgers.cRdR", 'DR' ] }, "$ledgers.amount", 0]}},
					date: {$last: '$date'},
					lName: {$last: '$lName'},
					clientId:{$last: '$clientId'},
					aVIds:{$addToSet:'$_id'}
				},
			},
			{$sort:{date:1}}
		];
		let oQuery = {aggQuery: aggQuery, no_of_docs: 4000};
		aVouchers = await serverSidePage.requestData(Voucher, oQuery);
	} else {
		return next({
			status: 'ERROR',
			message: 'filters not provided properly !'
		});
	}
	let aVchIds = [];
	try {
		if (!aVouchers || !aVouchers.length) {
			return res.status(500).json({
				status: 'ERROR',
				message: `Vouchers not found to import`
			});
		} else {
			for (let doc of aVouchers) {
				for(let i=0;i<doc.aVIds.length;i++){
					if(aVchIds.indexOf(doc.aVIds[i]) == -1){
						aVchIds.push(doc.aVIds[i]);
					}
				}
				//aVchIds = aVchIds.concat(doc.aVIds);
			}
			let LockVch = await Voucher.updateMany({_id: {$in: aVchIds}},
				{
					$set: {
						'acImp.ipr': true
					},
					$addToSet: {
						his: {
							by: req.user.full_name,
							at: new Date(),
							cat: 'ipr lock'
						}
					}
				}
			);
			res.status(200).json({
				status: 'OK',
				message: 'We  are importing ' + aVchIds.length + ' vouchers please wait for some time. Thanks'
			});
			//telegram.sendMessage(aVouchers.length + " Voucher import Request " + config.serverName, req.user.full_name);
		}
		let aVchUpdate = [];
		let aRefs = [];
		let aRefsSuc = [];
		for (let doc of aVouchers) {
			aRefs =aRefs.concat(doc.aVIds);
			let bal = await adjustDailyBalV2(doc, next);
			if (bal) {
				aRefsSuc = aRefsSuc.concat(doc.aVIds);
				aVchUpdate = aVchUpdate.concat(doc.aVIds);
			} else {
				winston.error('voucher error on import TA', doc.refNo);
			}
			if(bal && doc._id && doc._id.account){
				let foundDriver = await Driver.findOne({account:doc._id.account},{_id:1});
				if(foundDriver){
					let diffDRCR = doc.dr - doc.cr;
					let oTripFilter = {
						clientId: req.user.clientId,
						driver: foundDriver._id,
						'advSettled.isCompletelySettled': true,
						'markSettle.date': {
							$gte: new Date(doc.date),
						}
					};
					let aggrTrip = [
						{$match:oTripFilter},
						{$project:{_id:1,markSettle:1}},
						{$sort:{'markSettle.date': 1}},
						{$limit:1}
					];
					const aFoundRT = await Trip.aggregate(aggrTrip);
					try {
						if (Array.isArray(aFoundRT) && !aFoundRT.length && diffDRCR){
                               //Do nothing
						}else{
							let aRts = [];
							for(let rt=0;rt<aFoundRT.length;rt++){
								aRts.push(aFoundRT[rt]._id);
							}
							await Trip.update({_id: {$in:aRts}},
								{
									$inc: {"advSettled.openingBal": diffDRCR}
								});
						}
					} catch (err) {
						throw err;
					}
				}
			}
		}
		if (aVchUpdate.length < aVouchers.length) {
			telegram.sendMessage(aVchUpdate.length + "/" + aVouchers.length + " Voucher import error " + config.serverName, req.user.full_name);
		}
		if (aVchUpdate.length) {
			let updateOp = await Voucher.updateMany({_id: {$in: aVchUpdate}},
				{
					$set: {
						reversed: false,
						acImp: {
							st: true,
							by: req.user.full_name,
							at: new Date(),
							ipr: false
						}
					}, $addToSet: {
						his: {
							by: req.user.full_name,
							at: new Date(),
							cat: 'AC import'
						}
					}
				}
			);
		}

		try {
			// Write Log...
			let oDelta = {};
			if (aVchUpdate.length === aVouchers.length) {
				oDelta = {
					"Success": {
						count: aVchIds.length,
						status: "Success",
						message: "All Voucher imported Successfully."
					}
				}
			} else if (aVchUpdate.length < aVouchers.length) {

				oDelta = {
					"Success": {
						count: aVchIds.length,
						status: "Success",
						message: "Voucher imported Successfully."
					},
					"Fail": {
						count: (aVouchers.length - aVchUpdate.length),
						status: "Fail",
						message: "Fail Recound found."
					}
				}
			}

			await logsService.addLog('Voucher', {
				uif: "create-vouchers-common-" + new Date().toLocaleString(),
				docId: req.user._id,
				category: 'Notification',
				delta: oDelta
			}, req);
			// END Log
		} catch (e) {
			console.log(e);
		}
	} catch (e) {
		winston.error("error in create-vouchers-common " + e.toString());
		telegram.sendMessage(config.serverName + " " + "error in create-vouchers-common " + e.toString(), new Date().toLocaleString());
		// Write Log...


		await logsService.addLog('Voucher', {
			uif: " create-vouchers-common -" + new Date().toLocaleString(),
			docId: req.user._id,
			category: 'Notification',
			delta: {
				"Fail": {
					count: 0,
					status: "Fail",
					message: e.toString()
				}
			}
		}, req);
		// END Log
		if (!res.headersSent) {
			return res.status(500).json({
				status: 'ERROR',
				message: e.toString(),
			});
		}
	}
}

async function importOne(_id, body, req) {
	try {

		let userName = req.user.full_name;

		let bal = await adjustDailyBal(await Voucher.findOne({_id}));
		if (bal){
			await Voucher.updateOne({_id},
				{
					$set: {
						reversed: false,
						acImp: {
							st: true,
							by: userName,
							at: new Date()
						}
					}, $addToSet: {
						his: {
							by: userName,
							at: new Date(),
							cat: 'AC import'
						}
					}
				}
			);
		}else{
			console.error('importOne bal',e.toString());
		    telegram.sendMessage("importOne bal vch error " + e.toString());
		}
		return true;

	} catch (e) {
		console.error('importOne',e.toString());
		telegram.sendMessage("importOne vch error " + e.toString());
		throw e;
	}
}

function updateExported(query, oUpdate) {
	if (query && oUpdate) {
		return Voucher.updateMany(query, oUpdate);
	}
	return false;
}

async function reverseAccounts(req, res, next) {
	try {
		let aVouchers, aggQuery;
		let defPr = {ledgers: 1, clientId: 1, refNo: 1, vT: 1, date: 1, narration: 1, uuid: 1, type: 1, acImp: 1};
		let oFil = {
			clientId: req.user.clientId, _id: {$in: otherUtil.arrString2ObjectId(req.body.ids)},
			"acImp.st": true, deleted: false, isRev: true, 'acImp.ipr': {$not: {$eq: true}},'tdsVoucher.paid': {$not: {$eq: true}}
		};
		aggQuery = [
			{$match: oFil},
			{$project: defPr}
		];
		let oQuery = {aggQuery: aggQuery, no_of_docs: 100};
		aVouchers = await serverSidePage.requestData(Voucher, oQuery);

		if (!aVouchers || !aVouchers.length) {
			return res.status(500).json({
				status: 'ERROR',
				message: `Vouchers not found to reverse`
			});
		} else {
			let aRevLocVch = [];
			for (let i = 0; i < aVouchers.length; i++) {
				aRevLocVch.push(aVouchers[i]._id);
			}
			const lockRev = await Voucher.updateMany({_id: {$in: otherUtil.arrString2ObjectId(aRevLocVch)}},
				{
					$set: {
						"acImp.ipr": true,
					},
					$addToSet: {
						his: {
							by: req.user.full_name,
							at: new Date(),
							cat: 'revert lock',
							remark: req.body.remark
						}
					}
				});

			if(!req.body.skipReturn)              // for revert completely settle
			res.status(200).json({
				status: 'OK',
				message: 'We  are reverting ' + aVouchers.length + ' vouchers please wait for some time. Thanks'
			});
			//telegram.sendMessage(aVouchers.length + " Voucher revert Request " + config.serverName, req.user.full_name);
		}
		let aVchUpdate = [];
		let aRefs = [];
		let aRefsSucc = [];
		for (let i = 0; i < aVouchers.length; i++) {
			aRefs.push(aVouchers[i].refNo);
			try {
				let rVch = await adjustDailyBalOnRevert(aVouchers[i]);
				aVchUpdate.push(aVouchers[i]._id);
				aRefsSucc.push(aVouchers[i].refNo);

				let voucher = aVouchers[i];
				if(voucher.ledgers && voucher.ledgers.length) {
					for (let j = 0; j < voucher.ledgers.length; j++) {
					let led = voucher.ledgers[j];
						let foundDriver = await Driver.findOne({account: led.account});
						if (foundDriver) {
							let diffDRCR = led.amount;
							if (led.cRdR === 'DR')
								diffDRCR = -(diffDRCR);

							const aFoundRT = await Trip.find({
								clientId: req.user.clientId,
								driver: foundDriver._id,
								'advSettled.isCompletelySettled': true,
								'markSettle.date': {
									$gte: new Date(voucher.date),
								}
							}).sort({'markSettle.date': 1}).lean();


							try {
								if (Array.isArray(aFoundRT) && !aFoundRT.length)
									continue;

								if (diffDRCR) {
									for (let i = 0; i < aFoundRT.length; i++) {
										await Trip.update({
												_id: aFoundRT[i]._id
											},
											{
												$inc: {"advSettled.openingBal": diffDRCR}
											});
									}
								}

							} catch (err) {
								throw err;
							}
						}
					}
				}
			} catch (e) {
				telegram.sendMessage(aVouchers[i].refNo + " Voucher reverted error " + config.serverName, req.user.full_name);
			}
		}
		if (aVchUpdate.length < aVouchers.length) {
			telegram.sendMessage(" Voucher reverted error " + aRefsSucc.toString() + ">" + aRefs.toString(), config.serverName, req.user.full_name);
		}
		if (aVchUpdate.length) {
			const upd = await Voucher.updateMany({_id: {$in: otherUtil.arrString2ObjectId(aVchUpdate)}},
				{
					$set: {
						reversed: true,
						"acImp.st": false,
						"acImp.ipr": false,
					},
					$addToSet: {
						his: {
							by: req.user.full_name,
							at: new Date(),
							cat: 'Revert',
							remark: req.body.remark
						}
					}
				});
		}

		//telegram.sendMessage(aVchUpdate.length + "/" + aVouchers.length + " Voucher reverted " + config.serverName, req.user.full_name);
	} catch (e) {
		winston.error(e.toString());
		telegram.sendMessage("Voucher reverted error " + e.toString(), config.serverName, req.user.full_name);
		if (!res.headersSent) {
			return res.status(500).json({
				status: 'ERROR',
				message: e.toString(),
				error: e.toString()
			});
		}
	}
}

async function reverseOne(_id, body, req) {
	try {

		let userName = req.user.full_name;

		await adjustDailyBalOnRevert(await Voucher.findOne({_id}));

		await Voucher.updateOne({_id},
			{
				$set: {
					reversed: true,
					"acImp.st": false,
				},
				$addToSet: {
					his: {
						by: req.user.full_name,
						at: new Date(),
						cat: 'Revert',
						remark: req.body.remark
					}
				}
			}
		);

		return true;

	} catch (e) {
		throw e;
	}
}

async function ledgerReport(query, projection, next) {
	let defPr = {ledgers: 1, clientId: 1, refNo: 1, date: 1, narration: 1, type: 1, created_at: 1, chequeClear: 1};
	let oFilter = constructFilters(query);
	oFilter['acImp.st'] = true;
	let aggQuery = [
		{$match: oFilter},
		{$sort: {date: 1}},
		{$project: defPr}
	];
	let oQuery = {aggQuery: aggQuery, no_of_docs: 10000};
	let aVouchers = await serverSidePage.requestData(Voucher, oQuery);
	return aVouchers;
}

async function bankReconciliation(query, projection, next) {
	let defPr = {ledgers: 1, clientId: 1, refNo: 1, date: 1, narration: 1, type: 1, created_at: 1, chequeClear: 1, chequeDate:1,paymentMode:1,chequeNo:1};
	let oFilter = constructFilters(query);
	let aggQuery = [
		{$match: oFilter},
		{$sort: {date: 1}},
		{$project: defPr}
	];
	let oQuery = {aggQuery: aggQuery, no_of_docs: 10000};
	let aVouchers = await serverSidePage.requestData(Voucher, oQuery);
	return aVouchers;
}

async function resetLedgerName(req, res, next) {
	let oAcFilter = {clientId: req.body.clId || req.user.clientId};
	if (req.body.account) {
		oAcFilter._id = mongoose.Types.ObjectId(req.body.account)
	} else {
		//return res.status(200).json({message:'account id not provided '});
	}
	if (req.body.group) {
		oAcFilter.group = {$in: req.body.group};
	}
	if (!req.body.group && !req.body.account) {
		return res.status(200).json({message: 'account id or group not provided '});
	}
	let Accs = await Accounts.find(oAcFilter, {balance: 1, opening_balance: 1, name: 1}).lean();
	if (Accs) {
		for (let a = 0; a < Accs.length; a++) {
			console.log(a + "/" + Accs.length + " started");
			let oFil = {
				clientId: req.body.clId || req.user.clientId,
				'ledgers.account': Accs[a]._id,
				'ledger.lName': {$not: {$eq: Accs[a].ledger_name || Accs[a].name}},
			};
			if (req.body.start_date && req.body.end_date) {
				req.body.start_date = new Date(req.body.start_date).setHours(0, 0, 0, 0);
				req.body.end_date = new Date(req.body.end_date).setHours(0, 0, 0, 0);
				oFil.date = {$gte: req.body.start_date, $lte: req.body.end_date}
			}
			let aV = Voucher.find(oFil);
			if (aV && aV.length) {
				let uV = await Voucher.updateMany({'ledgers.account': Accs[a]._id}, {
					$set: {
						'ledgers.$.lName': Accs[a].ledger_name || Accs[a].name
					}
				})
			}
		}
	}
}

async function resetDailyBal(req, res, next) {
	//hard coding april 2019
	let clientId = req.body.clId || req.user.clientId;
	let oAcFilter = {clientId: clientId};
	if (req.body.account) {
		oAcFilter._id = mongoose.Types.ObjectId(req.body.account)
	} else {
		return {message: 'account not provided ', status: 'ERROR'};
	}
	if (req.body.group) {
		oAcFilter.group = {$in: req.body.group};
	}
	if (!req.body.group && !req.body.account) {
		//return {message:'account id or group not provided ',status:'ERROR'};
	}
	let Accs = await Accounts.find(oAcFilter, {balance: 1, opening_balance: 1, name: 1}).lean();
	if (Accs) {
		for (let a = 0; a < Accs.length; a++) {
			console.log(a + "/" + Accs.length + " started");
			let onlyDate = dateUtil.getMorning(req.body.start_date || '2019-04-01');//TODO make it dynamic
			//get first Account balance on or after 01 April 2019
			let obApr;
			let acBal = await AcBal.findOne({
				account: Accs[a]._id,
				date: {$gte: onlyDate},
				clientId: clientId
			}).sort({date: 1}).lean();
			if (acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0) {
				obApr = acBal; //consider it
			}
			let accId = Accs[a]._id;
			let oFil = {
				"date": {$gte: onlyDate},
				"acImp.st": true,
				"ledgers": {$elemMatch: {"account": accId}},
				deleted: {$not: {$eq: true}},
				clientId: clientId
			};
			let oProj = {
				ledgers: {
					$filter: {
						input: "$ledgers",
						as: "ledger",
						cond: {$eq: ["$$ledger.account", accId]}
					}
				}, date: 1
			};
			let aggrQ = [
				{$match: oFil},
				{"$project": oProj},
				{"$unwind": {path: "$ledgers", preserveNullAndEmptyArrays: true}},
				{
					$group: {
						_id: {
							day: {$dayOfMonth: {date: "$date", timezone: '+05:30'}},
							month: {$month: {date: "$date", timezone: '+05:30'}},
							year: {$year: {date: "$date", timezone: '+05:30'}}
						},

						cr: {
							"$sum": {
								"$cond": [{
									"$and": [
										{"$eq": ["$ledgers.account", accId]},
										{"$eq": ["$ledgers.cRdR", 'CR']}
									]
								}, "$ledgers.amount", 0]
							}
						},
						dr: {
							"$sum": {
								"$cond": [{
									"$and": [
										{"$eq": ["$ledgers.account", accId]},
										{"$eq": ["$ledgers.cRdR", 'DR']}
									]
								}, "$ledgers.amount", 0]
							}
						},

						date: {$last: '$date'}
					}
				},
				{$sort: {date: 1}}
			];
			let aV = await Voucher.aggregate(aggrQ).allowDiskUse(true);
			let ob, cb = 0, lastCb = 0;

			let acBalUpd = aV.map(adv => {
				if (!adv) return null;
				delete adv._id;
				if (ob != undefined) {
					ob = lastCb;
					cb = ob + adv.dr - adv.cr;
					lastCb = cb;
				} else {
					ob = obApr && obApr.ob || 0;
					lastCb = ob + adv.dr - adv.cr;
					cb = lastCb;
				}
				console.log(dateUtil.getMorning(adv.date), ob, cb, adv.cr, adv.dr);
				return {
					updateOne: {
						filter: {
							clientId: req.body.clId || req.user.clientId,
							date: dateUtil.getMorning(adv.date),
							account: Accs[a]._id,
							deleted: false,
						},
						update: {
							$setOnInsert: {
								created_at: new Date(),
								deleted: false,
								account: Accs[a]._id,
								date: dateUtil.getMorning(adv.date),
								clientId: req.body.clId || req.user.clientId
							},
							$set: {
								ob: ob,
								cb: cb,
								cr: adv.cr || 0,
								dr: adv.dr || 0
							},
						},
						upsert: true
					}
				}
			}).filter(x => x !== null);

			if (acBalUpd.length > 0) {
				//clear data first
				let aRm = await AcBal.remove({
					account: Accs[a]._id,
					date: {$gte: onlyDate},
					clientId: req.body.clId || req.user.clientId
				});
				const AcBalStats = await AcBal.bulkWrite(acBalUpd);
				console.log('complete for ', a);
			}
		}
	}
	return {message: 'work in progress', status: 'OK'};
}

async function resetDailyBalV2(req, res, next) {
	//hard coding april 2019
	let clientId = req.body.clId || req.user.clientId;
	let oAcFilter = {clientId: clientId};
	if (req.body.account) {
		oAcFilter._id = mongoose.Types.ObjectId(req.body.account)
	} else {
		return {message: 'account not provided ', status: 'ERROR'};
	}
	if (req.body.group) {
		oAcFilter.group = {$in: req.body.group};
	}
	if (!req.body.group && !req.body.account) {
		//return {message:'account id or group not provided ',status:'ERROR'};
	}
	let Accs = await Accounts.find(oAcFilter, {balance: 1, opening_balance: 1, name: 1}).lean();
	if (Accs) {
		for (let a = 0; a < Accs.length; a++) {
			console.log(a + "/" + Accs.length + " started");
			//start date
			let onlyDate = dateUtil.getMorning(req.body.start_date || '2019-04-01');//TODO make it dynamic
			let onlyDateEnd = dateUtil.getMorning(req.body.end_date);//TODO make it dynamic
			onlyDateEnd = dateUtil.addDays(onlyDateEnd,1);
			console.log('reseting for',onlyDate,onlyDateEnd);
			let obApr,cbApr;
			let acBal = await AcBal.findOne({
				account: Accs[a]._id,
				date: {$lte: onlyDate},
				clientId: clientId
			}).sort({date: -1}).lean();
			if (acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0) {
				obApr = acBal; //consider it
			}else if(acBal){
				cbApr = acBal;
			}
			let accId = Accs[a]._id;
			let oFil = {
				"date": {$gte: onlyDate,$lte:onlyDateEnd},
				"acImp.st": true,
				"ledgers": {$elemMatch: {"account": accId}},
				deleted: {$not: {$eq: true}},
				clientId: clientId
			};
			let oProj = {
				ledgers: {
					$filter: {
						input: "$ledgers",
						as: "ledger",
						cond: {$eq: ["$$ledger.account", accId]}
					}
				}, date: 1
			};
			let aggrQ = [
				{$match: oFil},
				{"$project": oProj},
				{"$unwind": {path: "$ledgers", preserveNullAndEmptyArrays: true}},
				{
					$group: {
						_id: {
							day: {$dayOfMonth: {date: "$date", timezone: '+05:30'}},
							month: {$month: {date: "$date", timezone: '+05:30'}},
							year: {$year: {date: "$date", timezone: '+05:30'}}
						},

						cr: {
							"$sum": {
								"$cond": [{
									"$and": [
										{"$eq": ["$ledgers.account", accId]},
										{"$eq": ["$ledgers.cRdR", 'CR']}
									]
								}, "$ledgers.amount", 0]
							}
						},
						dr: {
							"$sum": {
								"$cond": [{
									"$and": [
										{"$eq": ["$ledgers.account", accId]},
										{"$eq": ["$ledgers.cRdR", 'DR']}
									]
								}, "$ledgers.amount", 0]
							}
						},

						date: {$last: '$date'}
					}
				},
				{$sort: {date: 1}}
			];
			let aV = await Voucher.aggregate(aggrQ).allowDiskUse(true);
			let ob, cb = 0, lastCb = 0;

			let acBalUpd = aV.map(adv => {
				if (!adv) return null;
				delete adv._id;
				if (ob != undefined) {
					ob = lastCb;
					cb = ob + adv.dr - adv.cr;
					lastCb = cb;
				} else {
					if(obApr && obApr.ob){
						ob = obApr.ob;
					}else if(cbApr && cbApr.cb){
						ob = cbApr.cb;
					}else{
						ob = 0;
					}
					//ob = obApr && obApr.ob || 0;
					lastCb = ob + adv.dr - adv.cr;
					cb = lastCb;
				}
				console.log(dateUtil.getMorning(adv.date), ob, cb, adv.cr, adv.dr);
				return {
					updateOne: {
						filter: {
							clientId: req.body.clId || req.user.clientId,
							date: dateUtil.getMorning(adv.date),
							account: Accs[a]._id,
							deleted: false,
						},
						update: {
							$setOnInsert: {
								created_at: new Date(),
								deleted: false,
								account: Accs[a]._id,
								date: dateUtil.getMorning(adv.date),
								clientId: req.body.clId || req.user.clientId
							},
							$set: {
								ob: ob,
								cb: cb,
								cr: adv.cr || 0,
								dr: adv.dr || 0
							},
						},
						upsert: true
					}
				}
			}).filter(x => x !== null);

			if (acBalUpd.length > 0) {
				//clear data first
				let aRm = await AcBal.remove({
					account: Accs[a]._id,
					date: {$gte: onlyDate},
					clientId: req.body.clId || req.user.clientId
				});
				const AcBalStats = await AcBal.bulkWrite(acBalUpd);
				console.log('complete for ', a);
			}
		}
	}
	return {message: 'work in progress', status: 'OK'};
}

function ledgerValidation(aLedger) {

	let isValid = true,
		msg = '',
		crSum = 0,
		drSum = 0;

	if (aLedger.length == 0) {
		isValid = false;
		msg = 'Mandatory Fields are required';
	}

	isValid && aLedger.every((oLed, i) => {

		// mandatory fields validation
		if (!(oLed.account && oLed.lName && (typeof oLed.amount === 'number' && !Number.isNaN(oLed.amount)) && oLed.cRdR)) {
			isValid = false;
			msg = 'Mandatory Fields are required';
		}

		// do A/c occur multiple time
		if (aLedger.slice(i + 1).find(o => o.account === oLed.account)) {
			isValid = false;
			msg = `A/c ${oLed.lName} is Occurring Multiple Time`;
		}

		// gen CR and DR Sum
		if (oLed.cRdR === 'CR')
			crSum += oLed.amount;
		else if (oLed.cRdR === 'DR')
			drSum += oLed.amount;

		return isValid;
	});

	// CR & DR sum validation
	if (isValid && crSum.toFixed(2) != drSum.toFixed(2)) {
		isValid = false;
		msg = 'Sum of Cr and Dr should be equal';
	}

	return {
		isValid,
		message: msg
	};
}

function constructReportFilters(oQuery) {
	oQuery.dateKey = oQuery.dateKey || oQuery.dateType || 'date';
	oQuery.dateKey = oQuery.dateKey === 'dueDate' ? 'ledgers.bills.dueDate' : oQuery.dateKey;
	let oFilter = {deleted: {$not: {$eq: true}}};
	for (i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ['from_date', 'to_date', 'from', 'to', 'branch', 'billNo', 'refNo'])) {
			if (i === 'from_date' || i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setHours(0, 0, 0, 0);
				oFilter[oQuery.dateKey] = oFilter[oQuery.dateKey] || {};
				oFilter[oQuery.dateKey].$gte = startDate;
			} else if (i === 'to_date' || i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setHours(23, 59, 59, 999);
				oFilter[oQuery.dateKey] = oFilter[oQuery.dateKey] || {};
				oFilter[oQuery.dateKey].$lte = endDate;
			} else if (i === 'billNo') {
				oFilter['ledgers.bills.billNo'] = oQuery[i];
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter
}

async function bill2bill(body) {
	let account, aArray = [];
	if (body.account) {
		account = await Accounts.find({
			clientId: body.clientId,
			_id: mongoose.Types.ObjectId(body.account)
			//isGroup: {$ne: true},
			/*
			$or: [
				{'_id': mongoose.Types.ObjectId(body.account)},
				//{'ancestors': mongoose.Types.ObjectId(body.account)}
			]
			*/
		}, {_id: 1}).lean();
		for (a of account) {
			aArray.push(a._id);
		}
		if (aArray.length < 1) {
			throw new Error('Account not found');
		}
	}
	let oFilBill = {
		'ledgers.bills.billType': 'New Ref',
		...(aArray && aArray[0] ? {'ledgers.account': {$in: aArray}} : {}),
		...constructReportFilters(body),
	};
	let oFilBillInSide = {
		'ledgers.bills.billType': 'New Ref',
		...(aArray && aArray[0] ? {'ledgers.account': {$in: aArray}} : {}),
		...constructReportFilters(body),
	};
	let aggQuery = [{
		$match: oFilBill
	}, {
		$project: {
			date: 1,
			refNo: 1,
			narration: 1,
			ledgers: 1
		}
	}, {
		$unwind: '$ledgers'
	}, {
		$unwind: '$ledgers.bills'
	}, {
		$match: oFilBillInSide
	}, {
		$group: {
			_id: {account: '$ledgers.account', billNo: '$ledgers.bills.billNo'},
			billAmount: {
				$sum: {
					$cond: {
						if: {$eq: ['$ledgers.bills.billType', 'New Ref']},
						then: '$ledgers.bills.amount',
						else: 0
					}
				}
			},
			date: {$first: '$date'},
			dueDate: {$first: '$ledgers.bills.dueDate'},
			lName: {$first: '$ledgers.lName'},
			laName: {$first: '$ledgers.laName'},
			cRdr:{$first: '$ledgers.cRdR'},
			cr:{"$sum":{"$cond": [{ "$eq": [ "$ledgers.cRdR", 'CR' ] }, "$ledgers.bills.amount", 0]}},
			dr:{"$sum":{"$cond": [	{ "$eq": [ "$ledgers.cRdR", 'DR' ] }, "$ledgers.bills.amount", 0]}},
			narration: {$first: '$narration'},
			refNo: {$addToSet: '$refNo'}
		}
	}, {
		$sort: {
			...(body.dateKey === 'dueDate' ? {date: 1} : {dueDate: 1})
		}
	}, ...(body.aggregateBy && body.aggregateBy === 'account' ? [{
		$sort: {
			'lName': 1
		}
	}] : [])];
	let bills = await serverSidePage.requestData(Voucher, {aggQuery: aggQuery, no_of_docs: body.keys});

    /*
	let filterBills = [...bills].map((obj) => {
		return {
			'ledgers.account': obj._id.account,
			'ledgers.bills.billNo': obj._id.billNo,
			'ledgers.bills.billType': 'Against Ref'
		}
	});
     */
	let tCr=0,tDr=0;
	let ffilterBills = [...bills].map((obj) => {
		tCr = tCr + obj.cr;
		tDr = tDr + obj.dr;
		return obj._id.billNo
	});
	let payments = await serverSidePage.requestData(Voucher, {
		aggQuery: [{
			$match: {
				clientId: body.clientId,
				deleted: {$not: {$eq: true}},
				'ledgers.bills.billNo': {$in: ffilterBills},
				'ledgers.bills.billType': 'Against Ref'
				// $or: filterBills
			}
		}, {
			$project: {
				refNo: 1,
				ledgers: 1
			}
		}, {
			$unwind: '$ledgers'
		}, {
			$unwind: '$ledgers.bills'
		}, {
			$match: {
				'ledgers.bills.billNo': {$in: ffilterBills},
				'ledgers.bills.billType': 'Against Ref'
				// $or: filterBills
			}
		}, {
			$group: {
				_id: {account: '$ledgers.account', billNo: '$ledgers.bills.billNo'},
				receivedAmount: {
					$sum: {
						$cond: {
							if: {$eq: ['$ledgers.bills.billType', 'Against Ref']},
							then: '$ledgers.bills.amount',
							else: 0
						}
					}
				},
				refNo: {$addToSet: '$refNo'}
			}
		}]
	});
	let payIndex = -1, fBills = [];
	for (let bill of bills) {
		if (payments.length < 1 && !body.status) break;
		payIndex = -1;
		for (let pI = 0; pI < payments.length; pI++) {
			let payment = payments[pI];
			if (bill._id.account.toString() === payment._id.account.toString() && bill._id.billNo === payment._id.billNo) {
				bill.receivedAmount = payment.receivedAmount;
				bill.refNo.push(...payment.refNo);
				payIndex = pI;
				switch (body.status) {
					case 'settled':
						(bill.receivedAmount >= bill.billAmount) && fBills.push(bill);
						break;
					case 'unsettled':
						(bill.receivedAmount < bill.billAmount) && fBills.push(bill);
						break;
					case 'overpaid':
						(bill.receivedAmount > bill.billAmount) && fBills.push(bill);
						break;
				}
				break;
			}
		}
		if (payIndex > -1) {
			payments.splice(payIndex, 1);
			//payments = payments.slice(payIndex);
		}
		(body.status === 'unsettled') && !bill.receivedAmount && fBills.push(bill);
	}
	return body.status ? {data:fBills,tCr:tCr,tDr:tDr} : {data:bills,tCr:tCr,tDr:tDr};
}

async function billAgainstRef(query) {
	let projection;
	if (!query.projection) projection = {};
	let oFilter = {clientId: query.clientId};
	let limit = 10;
	if (query.ledgers) {
		oFilter["ledgers.account"] = {$in: otherUtil.arrString2ObjectId(query.ledgers)};
	}
	if (query.no_of_docs && query.no_of_docs < 50) {
		limit = query.no_of_docs;
	}
	if (query.billNo) {
		if (typeof query.billNo == 'object') {
			if (Array.isArray(query.billNo.eq))
				oFilter["ledgers.bills"] = {
					$in: query.billNo.eq.map(o => ({
						$elemMatch: {
							"billType": "New Ref",
							"billNo": {$regex: o.trim(), $options: 'i'}
						}
					}))
				};
			else
				oFilter['$and'] = [
					{
						'ledgers.bills': {
							$elemMatch: {
								"billType": "New Ref",
								"billNo": {$regex: query.billNo.eq.trim(), $options: 'i'}
							}
						}
					}
				];

			if (query.billNo.ne) {
				oFilter['$and'].push({
					'ledgers.bills.billNo': {$nin: Array.isArray(query.billNo.ne) ? query.billNo.ne : [query.billNo.ne]}
				});
			}
		} else
			oFilter["ledgers.bills"] = {
				$elemMatch: {
					"billType": "New Ref",
					"billNo": {$regex: query.billNo.trim(), $options: 'i'}
				}
			};
	} else {
		//TODO temp code
		//we can not allow all data to serach last 6 month bill to search
		let Today = new Date();
		let dateFilter = Today.setMonth(new Date().getMonth() - 6);
		oFilter['date'] = {$gte: new Date(dateFilter)};
		limit = 30;
	}

	let aggQuery = [
		{$match: oFilter},
		{$sort: {date: 1}},
		{$limit: limit},
		{$project: {date: 1, refNo: 1, ledgers: 1}},
		{$unwind: '$ledgers'},
		{$unwind: '$ledgers.bills'},
		{
			$match: {
				'ledgers.bills.billType': 'New Ref',
				'ledgers.account': {$in: otherUtil.arrString2ObjectId(query.ledgers)}
			}
		}

	];
	let bills = await serverSidePage.requestData(Voucher, {aggQuery: aggQuery, no_of_docs: 10});
	let ffilterBills = [...bills].map((obj) => {
		return obj.ledgers.bills.billNo
	});
	let aggQAgRef = [{
		$match: {
			clientId: query.clientId,
			deleted: {$not: {$eq: true}},
			'ledgers.bills': {$elemMatch: {"billType": "Against Ref", "billNo": {$in: ffilterBills}}}
		}
	}, {
		$project: {
			refNo: 1,
			ledgers: 1
		}
	}, {
		$unwind: '$ledgers'
	}, {
		$unwind: '$ledgers.bills'
	}, {
		$match: {
			'ledgers.bills.billNo': {$in: ffilterBills},
			'ledgers.bills.billType': 'Against Ref'
		}
	}, {
		$group: {
			_id: {account: '$ledgers.account', billNo: '$ledgers.bills.billNo'},
			receivedAmount: {
				$sum: {
					$cond: {
						if: {$eq: ['$ledgers.bills.billType', 'Against Ref']},
						then: '$ledgers.bills.amount',
						else: 0
					}
				}
			},
			refNo: {$addToSet: '$refNo'}
		}
	}]
	let payments = await serverSidePage.requestData(Voucher, {aggQuery: aggQAgRef});
	let payIndex = -1, fBills = [];
	for (let bill of bills) {
		if (query.neBillNo && query.neBillNo.indexOf(bill.ledgers.bills.billNo) > -1) {
			continue;
		}
		payIndex = -1;
		for (let pI = 0; pI < payments.length; pI++) {
			let payment = payments[pI];
			if (bill.ledgers.account.toString() === payment._id.account.toString() && bill.ledgers.bills.billNo === payment._id.billNo) {
				bill.receivedAmount = payment.receivedAmount;
				payIndex = pI;
				if (bill.receivedAmount < bill.ledgers.bills.amount) {
					bill.remAmt = bill.ledgers.bills.amount - bill.receivedAmount;
					fBills.push({
						billNo: bill.ledgers.bills.billNo,
						date: bill.date,
						remAmt: bill.remAmt,
						amount: bill.ledgers.bills.amount,
						_id: bill._id,
						refNo: bill.refNo
					});
					break;
				}
			}
		}
		if (payIndex > -1) {
			payments.splice(payIndex, 1);
		} else {
			fBills.push({
				billNo: bill.ledgers.bills.billNo,
				date: bill.date,
				remAmt: bill.remAmt || bill.ledgers.bills.amount,
				amount: bill.ledgers.bills.amount,
				_id: bill._id,
				refNo: bill.refNo
			});
		}
	}
	return fBills;

}

async function updateBillRemainingAmount(aBillNo) {
	try {

		let aError = [];
		for (const oBill of aBillNo) {

			let sBill = oBill.billNo;
			let account = oBill.account;
			let clientId = oBill.clientId;
			if (!sBill || !account) {
				aError.push(`Bill No and Account is required`);
				continue;
			}

			// validating each Bill No
			if (typeof sBill != 'string') {
				aError.push(`Bill No Type Invalid Bill Type`);
				continue;
			}
			/*
						if(typeof account != 'string'){
							aError.push(`Account Type Invalid Bill Type`);
							continue;
						}
			*/
			// finding bill No New Ref in DB
			let fdNewRefVch = await serverSidePage.requestData(Voucher, {
				aggQuery: [
					{
						$match: {
							'ledgers.bills.billNo': sBill,
							"ledgers.bills.billType": "New Ref",
							'ledgers.account': otherUtil.arrString2ObjectId(account),
							clientId
						}
					},
					{$limit: 2},
					{
						$project: {
							'ledgers.bills': {
								billNo: 1,
								billType: 1,
								amount: 1
							}
						}
					}
				]
			});
			if (!fdNewRefVch) {
				aError.push(`${sBill} Bills not found`);
				continue;
			} else if (fdNewRefVch.length === 0) {
				aError.push(`${sBill} has No New Ref Created`);
				continue;
			} else if (fdNewRefVch.length != 1) {
				aError.push(`${sBill} has more than 1 New Ref Created`);
				continue;
			}

			fdNewRefVch = fdNewRefVch && fdNewRefVch[0];

			// finding bill No Against Ref in DB
			let fdAgainstRefVch = await serverSidePage.requestData(Voucher, {
				aggQuery: [
					{
						$match: {
							'ledgers.bills.billNo': sBill,
							"ledgers.bills.billType": "Against Ref",
							'ledgers.account': otherUtil.arrString2ObjectId(account),
							clientId
						}
					},
					{$limit: 2000},
					{
						$project: {
							'ledgers.bills': {
								billNo: 1,
								billType: 1,
								amount: 1
							}
						}
					}
				]
			});

			let againstRefBillNoSum = 0;
			if (fdAgainstRefVch) {
				fdAgainstRefVch.forEach(oVch => {
					oVch.ledgers.forEach(oLedger => {
						oLedger.bills.forEach(oBill => {
							if (oBill.billNo === sBill && oBill.billType === "Against Ref")
								againstRefBillNoSum += (oBill.amount || 0);
						});
					})
				});
			}


			let ledgerIndex,
				billIndex,
				newRefBillPtr,
				isValid = true;

			if (fdNewRefVch && fdNewRefVch.ledgers) {
				fdNewRefVch.ledgers.forEach((oLedger, ledgerInd) => {
					oLedger.bills.forEach((oBill, billInd) => {
						if (isValid && oBill.billNo === sBill && oBill.billType === "New Ref") {
							if (newRefBillPtr) {
								isValid = false;
							} else {
								ledgerIndex = ledgerInd;
								billIndex = billInd;
								newRefBillPtr = oBill;
							}
						}
					});
				});
			}


			if (!isValid) {
				aError.push(`${sBill} has Multiple New with same bill No in same voucher`);
				continue;
			}
			if (fdNewRefVch && fdNewRefVch._id && newRefBillPtr && newRefBillPtr.amount && ledgerIndex > -1 && billIndex > -1) {
				await Voucher.updateOne({
					_id: fdNewRefVch._id
				}, {
					$set: {
						[`ledgers.${ledgerIndex}.bills.${billIndex}.remAmt`]: newRefBillPtr.amount - againstRefBillNoSum
					}
				});
			} else {
				winston.error('newRefBillPtr not found');
			}
		}

		return aError;

	} catch (e) {
		winston.error('error on against ref setting');
		winston.error(e && e.toString());
		//throw e;
	}
}

async function tempUpdateBillRemainingAmountForOldData(oData, body, req) {

	try {

		let fdVoucher = await Voucher.aggregate([
			{
				$match: {
					'ledgers.bills.billType': 'Against Ref',
					//'deleted': false,
					'date': {$gte: new Date(body.start_date), $lte: new Date(body.end_date)}
				}
			},
			{
				$unwind: {
					path: '$ledgers',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$unwind: {
					path: '$ledgers.bills',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$match: {
					'ledgers.bills.billType': 'Against Ref'
				}
			},
			{
				$addFields: {
					account: '$ledgers.account',
					billNo: '$ledgers.bills.billNo',
					billType: '$ledgers.bills.billType',
				}
			},
			{
				$project: {
					account: 1,
					billType: 1,
					billNo: 1,
					clientId: 1
				}
			},
			{
				$group: {
					_id: {
						billNo: '$billNo',
						account: '$account',
						clientId: '$clientId'
					}
				}
			},
			{
				$addFields: {
					account: '$_id.account',
					billNo: '$_id.billNo',
					clientId: '$_id.clientId'
				}
			},
			{
				$project: {
					account: 1,
					billNo: 1,
					clientId: 1
				}
			}
		]);

		let prepareData = {
			"aBill": fdVoucher.map(o => ({
				"billNo": o.billNo,
				"account": o.account,
				"clientId": o.clientId
			}))
		};

		let data = await updateBillRemainingAmount(prepareData.aBill, req.body, req);

		return true;

	} catch (e) {
		throw e;
	}
}

async function billedLedgerOutstandingRpt(body, req) {
	try {

		let aBillingParty;
		let asOnDate = body.asOnDate ? new Date(body.asOnDate) : new Date();
		const DAYS_180 = 180 * 24 * 60 * 60 * 1000;
		const DAYS_90 = 90 * 24 * 60 * 60 * 1000;
		const DAYS_60 = 60 * 24 * 60 * 60 * 1000;
		const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

		if (body.customer) {

			let aCustomer = Array.isArray(body.customer) ? body.customer : [body.customer];
			aBillingParty = await billingPartyService.getBillingParty({
				customer: {$in: otherUtil.arrString2ObjectId(aCustomer)}
			}, {
				name: 1,
				account: 1,
			});

			body.account = aBillingParty.map(o => o.account.toString());
		}

		let aData = await Voucher.aggregate([
			{
				$match: constructFilter(body)
			},
			{
				$addFields: {
					ledger: {$arrayElemAt: ['$ledgers', 0]}
				}
			},
			{
				$addFields: {
					bills: {$arrayElemAt: ['$ledger.bills', 0]}
				}
			},
			{
				"$lookup": {
					"from": "bills",
					"let": {
						"clientId": "$clientId",
						"billNo": "$refNo"
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
											"$eq": [
												"$billNo",
												"$$billNo"
											]
										}
									]
								}
							}
						},
						{
							"$project": {
								"billNo": 1,
								'billDate': {$ifNull: ['$dueDate', {$ifNull: ['$submitionDate', '$billDate']}]},
								"_id": 0,
							}
						}
					],
					"as": "bills"
				}
			},
			{
				"$unwind": {
					"path": "$bills",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				$project: {
					clientId: 1,
					refNo: 1,
					date: 1,
					branch: 1,
					billNo: '$bills.billNo',
					billDate: '$bills.billDate',
					name: '$ledger.lName',
					account: '$ledger.account',
					amt: '$ledger.amount',
					remainingAmt: '$bills.remAmt',
					subDate: {$subtract: [asOnDate, '$bills.billDate']},
				}
			},
			{$unwind: {path: '$onAccount', preserveNullAndEmptyArrays: true}},
			{
				$addFields: {
					'180': {$gte: ['$subDate', DAYS_180]},
					'90': {$cond: [{$and: [{$gte: ['$subDate', DAYS_90]}, {$lt: ['$subDate', DAYS_180]}]}, true, false]},
					'60': {$cond: [{$and: [{$gte: ['$subDate', DAYS_60]}, {$lt: ['$subDate', DAYS_90]}]}, true, false]},
					'30': {$cond: [{$lte: ['$subDate', DAYS_30]}, true, false]}
				}
			},
			{
				$group: {
					_id: '$account',
					'180_amt': {
						$sum: {$cond: ['$180', '$amt', 0]},
					},
					'180_remAmt': {
						$sum: {$cond: ['$180', '$remainingAmt', 0]},
					},
					'90_amt': {
						$sum: {$cond: ['$90', '$amt', 0]},
					},
					'90_remAmt': {
						$sum: {$cond: ['$90', '$remainingAmt', 0]},
					},
					'60_amt': {
						$sum: {$cond: ['$60', '$amt', 0]},
					},
					'60_remAmt': {
						$sum: {$cond: ['$60', '$remainingAmt', 0]},
					},
					'30_amt': {
						$sum: {$cond: ['$30', '$amt', 0]},
					},
					'30_remAmt': {
						$sum: {$cond: ['$30', '$remainingAmt', 0]},
					},
					clientId: {
						$first: '$clientId'
					},
					refNo: {
						$first: '$refNo'
					},
					date: {
						$first: '$date'
					},
					branch: {
						$first: '$branch'
					},
					name: {
						$first: '$name'
					},
					account: {
						$first: '$account'
					}
				}
			},
			{
				$lookup:
					{
						from: "vouchers",
						let: {clientId: "$clientId", account: "$account"},
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{$eq: ["$clientId", "$$clientId"]},
											{$in: ["$$account", "$ledgers.account"]},
										]
									},
									'ledgers.bills.billType': "On Account",
									'vT': 'Customer Receipts',
									'date': {
										"$gte": new Date(body.from),
										"$lte": new Date(body.to)
									},
									deleted: {$not: {$eq: true}}
								}
							},
							{
								$addFields: {
									'ledger': {
										$filter: {
											input: '$ledgers',
											as: "ledger",
											cond: {
												$eq: ['$$ledger.cRdR', 'CR']
											}
										}
									}
								}
							},
							{
								$addFields: {
									'ledger': {$arrayElemAt: ['$ledger', 0]}
								}
							},
							{
								$project: {
									_id: 0,
									amount: '$ledger.amount',
									date: 1
								}
							}
						],
						as: "onAccount"
					}
			},
			{
				$lookup:
					{
						from: "billingparties",
						let: {clientId: "$clientId", account: "$_id"},
						pipeline: [
							{
								$match:
									{
										$expr:
											{
												$and:
													[
														{$eq: ["$clientId", "$$clientId"]},
														{$eq: ["$account", "$$account"]},
													]
											}
									}
							},
							{$project: {name: 1, customer: 1, _id: 0, group: 1}}
						],
						as: "billingParty"
					}
			},
			{$unwind: {path: '$billingParty', preserveNullAndEmptyArrays: true}},
			{
				$lookup:
					{
						from: "customers",
						let: {customer: "$billingParty.customer"},
						pipeline: [
							{
								$match:
									{
										$expr:
											{
												$and:
													[
														{$eq: ["$_id", "$$customer"]}
													]
											}
									}
							},
							{$project: {name: 1, _id: 0}}
						],
						as: "billingParty.customer"
					}
			},
			{$unwind: {path: '$billingParty.customer', preserveNullAndEmptyArrays: true}},
// 	{
//       $lookup:
//          {
//           from: "branches",
//           let: { branch: "$branch"},
//           pipeline: [
//               { $match:
//                  { $expr:
//                     { $and:
//                       [
//                          { $eq: [ "$_id", "$$branch" ] }
//                       ]
//                     }
//                  }
//               },
//               { $project: { name: 1, _id: 0 } }
//           ],
//           as: "branch"
//          }
//     },
// 	{$unwind: {path: '$branch', preserveNullAndEmptyArrays: true}},
		]);

		aData.forEach(oVch => {
			oVch['180_onAccount'] = 0;
			oVch['90_onAccount'] = 0;
			oVch['60_onAccount'] = 0;
			oVch['30_onAccount'] = 0;
			(oVch.onAccount || []).forEach(oAcc => {

				let subDate = asOnDate - new Date(oAcc.date);
				if (subDate > DAYS_180) {
					oVch['180_onAccount'] += oAcc.amount;
				} else if (subDate > DAYS_90) {
					oVch['90_onAccount'] += oAcc.amount;
				} else if (subDate > DAYS_60) {
					oVch['60_onAccount'] += oAcc.amount;
				} else
					oVch['30_onAccount'] += oAcc.amount;
			});
		});

		return new Promise((resolve, reject) => {
			ReportExcelService.ledgerOutstandingReport(aData, {asOnDate, clientId: req.user.clientId}, function (data) {
				resolve(data.url);
			});
		});

	} catch (e) {
		throw e;
	}

	function constructFilter(query) {
		let fFilter = {
			deleted: {$not: {$eq: true}},
			vT: 'Gr Bill'
		};
		for (i in query) {
			if (otherUtil.isAllowedFilter(i, ['from', 'to', 'account'])) {
				if (i == 'from') {
					fFilter['date'] = fFilter['date'] || {};
					fFilter['date'].$gte = moment(query[i]).startOf('day').toDate();
				} else if (i == 'to') {
					fFilter['date'] = fFilter['date'] || {};
					fFilter['date'].$lte = moment(query[i]).endOf('day').toDate();
				} else if (i === 'account') {
					if (query[i] && query[i] != "undefined" && query[i].length > 0) {
						fFilter['ledgers.account'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])};
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
}

async function setChequeData(id, body, req) {
	try {

		return await Voucher.updateOne(id, {
			$set: {
				chequeClear: {
					date: body.date,
					rem: body.remark
				}
			}
		});

	}catch (e) {
		throw e;
	}
}

async function unSetChequeData(id) {
	try {

		return await Voucher.updateOne(id, {
			$unset: {
				chequeClear: 1
			}
		});

	}catch (e) {
		throw e;
	}
}

async function getTDSMonthlyReport(reqBody, next) {
	let oPFil = constructFilters(reqBody);
	const aggrQuery = [
		{$match: oPFil},
		{
			"$sort": {
				"_id": -1
			}
		},
		{
			$unwind: {
				"path": "$ledgers",
				"preserveNullAndEmptyArrays": true
			}
		}
	];
	if(reqBody.reportType === 'TDS Monthly Report') {
		aggrQuery.push({
			"$group": {
				"_id": {
					"ledgers": "$ledgers.lName",
					"month": {
						"$month": "$date"
					},
					"year": {
						"$year": "$date"
					}
				},

				"amount": {$sum: "$ledgers.amount"},
				"TdsAmount": {$sum: "$ledgers.tdsAmount"}

			}
		});
	}else if(reqBody.reportType === 'TDS SourceWise Report'){
		aggrQuery.push({
				$lookup: {
					from: 'vouchers',
					localField: 'link.TDS',
					foreignField: '_id',
					as: 'link.TDS'
				}
			},
			{
				$unwind: {
					path: '$link.TDS',
					preserveNullAndEmptyArrays: true
				}
			});
		aggrQuery.push({
			"$group": {
				"_id": {
					"ledgers": "$link.TDS.tdsSources",
					"month": {
						"$month": "$date"
					},
					"year": {
						"$year": "$date"
					}
				},

				"amount": {$sum: "$ledgers.amount"},
				"TdsAmount": {$sum: "$ledgers.tdsAmount"},
				// 'tds': {$first:"$link.TDS"}

			}
		});
	}

	aggrQuery.push(
		{
			$project: {
				"ledgers": "$_id.ledgers",
				"month": "$_id.month",
				"year": "$_id.year",
				amount: "$amount",
				TdsAmount: "$TdsAmount",
			}
		});

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	// return await serverSidePage.requestData(Voucher, oQuery);
	let aFoundData = await serverSidePage.requestData(Voucher, oQuery);

	let massagedData = {};

	aFoundData.forEach(oData => {
		if(oData.TdsAmount) {
			massagedData[oData.ledgers] = massagedData[oData.ledgers] || {};
			massagedData[oData.ledgers].name = oData.ledgers;
			let monthYear = moment().month(oData.month - 1).year(oData.year).format('MM-YYYY');
			massagedData[oData.ledgers][monthYear] = massagedData[oData.ledgers][monthYear] || {};
			massagedData[oData.ledgers][monthYear].amount = oData.amount;
			massagedData[oData.ledgers][monthYear].TdsAmount = oData.TdsAmount;
			massagedData[oData.ledgers][monthYear].amount += oData.amount;
			massagedData[oData.ledgers][monthYear].TdsAmount += oData.TdsAmount;
		}
	});
	return Object.values(massagedData);
}

function multiVoucherOpr() {
	let aVch = [],
		err, msg;

	return {
		add,
		exec
	};

	async function add(oVoucher) {
		try {
			if ((err = ledgerValidation(oVoucher.ledgers)) && !err.isValid)
				throw new Error(err.message + " " + oVoucher.refNo);

			// if(oVoucher.ledgers && oVoucher.ledgers.length){
			//
			// 	for(let oLed of oVoucher.ledgers){
			// 		if(oLed.account) {
			// 			let foundAcc = await Accounts.findOne({_id: oLed.account}, {
			// 				'opn_bal_date': 1,
			// 				'opening_balance': 1,
			// 				'name': 1
			// 			}).lean();
			//
			// 			if(foundAcc && foundAcc.opn_bal_date && new Date(foundAcc.opn_bal_date) > new Date(oVoucher.date)){
			// 				msg = 'The transaction is not allowed before opening balance date in account ' + foundAcc.name;
			// 			}
			// 		}
			// 	}
			// }
			// if(msg)
			// 	throw new Error(msg + " " + oVoucher.refNo);

			if (await Voucher.findOne({refNo: oVoucher.refNo, deleted: false, clientId: oVoucher.clientId}))
				throw new Error(`Voucher already exist with Ref No${oVoucher.refNo}`);

			aVch.push(oVoucher);
			return true;
		} catch (e) {
			throw e;
		}
	}

	async function exec() {
		try {
			for (let oVch of aVch)
				await addVoucherAsync(oVch);

			return true;
		} catch (e) {
			throw e;
		}
	}
}

async function getDrSecurity(body, req) {

	let aggQuery = [{
		$match: {
			clientId: body.clientId,
			deleted: {$not: {$eq: true}},
			'vT': body.vT,
			'ledgers.account': mongoose.Types.ObjectId(body.account)
		}
	}, {
		$project: {
			date: 1,
			refNo: 1,
			ledgers: 1
		}
	}, {
		$unwind: '$ledgers'
	},
		{
			"$group": {
				"_id":  null,
				// "data":{$push: "$$ROOT"},
				"amount":{$sum:{$cond:[{$eq:["$ledgers.cRdR","CR"]},"$ledgers.amount",0]}},
			}
		}
	];
	let data = await serverSidePage.requestData(Voucher, {aggQuery: aggQuery, no_of_docs: 50});

	return (data && data[0]) ? data[0] : data
}

// async function getAllDrAcLedgers(body, req) {
//
// 	let aggQuery = [{
// 		$match: {
// 			clientId: body.clientId,
// 			"acImp.st": true,
// 			deleted: {$not: {$eq: true}},
// 			'ledgers.account': mongoose.Types.ObjectId(body.ledger),
// 			"date": {
// 				"$gte": new Date(body.from_date),
// 				"$lt": new Date(body.to_date)
// 			},
// 		}
// 	}, {
// 		"$sort": {
// 			"date": 1
// 		}
// 	},{"$unwind": {path: "$ledgers",preserveNullAndEmptyArrays: true}},
// 		{
// 			"$match": {
// 				"ledgers.account": mongoose.Types.ObjectId(body.ledger),
// 			}},	{
// 			$group: {
// 				_id: {account:"$ledgers.account"},
// 				cr:{"$sum":{"$cond": [{ "$eq": [ "$ledgers.cRdR", 'CR' ] }, "$ledgers.amount", 0]}},
// 				dr:{"$sum":{"$cond": [	{ "$eq": [ "$ledgers.cRdR", 'DR' ] }, "$ledgers.amount", 0]}},
//
// 			}
// 		},
// 		{
// 			"$project": {
// 				"_id": 1,
// 				"total": {$subtract: ["$dr","$cr"]}
// 			}
// 		},
// 	];
// 	let data = await serverSidePage.requestData(Voucher, {aggQuery: aggQuery, no_of_docs: 50});
//
// 	return (data && data[0]) ? data[0] : data
// }

