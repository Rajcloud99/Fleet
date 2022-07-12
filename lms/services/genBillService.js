var Promise = require('bluebird');
var winston = require('winston');
var async = require('async');
//var PDFMerge = require('pdf-merge');
const uuidv4 = require('uuid/v4');
let moment = require('moment');

const GenBill = Promise.promisifyAll(commonUtil.getModel('genBill'));
const genBillService = commonUtil.getService('genBill');
const BillingParty = commonUtil.getModel('billingparty');
const voucherService = commonUtil.getService('voucher');
const Accounts = commonUtil.getModel('accounts');
const ReportExcelService = commonUtil.getService('reportExel');
const serverSidePage = require('../../utils/serverSidePagination');

var allowedFilter = ['billNo', 'refNo', 'from', 'to', '_id', 'billType', 'clientId', 'billingParty', 'status', 'acknowledge.voucher', ];

var constructFilter = function (query) {
	query.dateType = query.dateType || 'billDate';
	var fFilter = {};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, allowedFilter)) {
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
			}else if (i === 'billingParty'){
				fFilter[i] = otherUtil.arrString2ObjectId(query[i]);
			} else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};


// Function Definition

module.exports.getAllGenBills = async function (reqBody, next) {
	reqBody.no_of_docs = reqBody.no_of_docs || 10;
	reqBody.skip = reqBody.skip || 1;
	let oPFil = constructFilter(reqBody);

	const aggrQuery = [
		{$match: oPFil},
		{$sort: {_id: -1}},
		{$skip: ((reqBody.no_of_docs * reqBody.skip) - reqBody.no_of_docs)},
		{$limit: reqBody.no_of_docs},
		{$lookup: {from: 'branches', localField: 'branch', foreignField: '_id', as: 'branch'}},
		{$unwind: {path: '$branch', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'billingparties', localField: 'billingParty', foreignField: '_id', as: 'billingParty'}},
		{$unwind: {path: '$billingParty', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'accounts', localField: 'acknowledge.salesAccount', foreignField: '_id', as: 'acknowledge.salesAccount'}},
		{$unwind: {path: '$acknowledge.salesAccount', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'accounts', localField: 'billingParty.account', foreignField: '_id', as: 'billingParty.account'}},
		{$unwind: {path: '$billingParty.account', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'vouchers', localField: 'acknowledge.voucher', foreignField: '_id', as: 'acknowledge.voucher'}},
		{$unwind: {path: '$acknowledge.voucher', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'accounts', localField: 'acknowledge.sGSTAccount', foreignField: '_id', as: 'acknowledge.sGSTAccount'}},
		{$unwind: {path: '$acknowledge.sGSTAccount', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'accounts', localField: 'acknowledge.cGSTAccount', foreignField: '_id', as: 'acknowledge.cGSTAccount'}},
		{$unwind: {path: '$acknowledge.cGSTAccount', preserveNullAndEmptyArrays: true}},
		{$lookup: {from: 'accounts', localField: 'acknowledge.iGSTAccount', foreignField: '_id', as: 'acknowledge.iGSTAccount'}},
		{$unwind: {path: '$acknowledge.iGSTAccount', preserveNullAndEmptyArrays: true}},

	];


	let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
	let aData = await serverSidePage.requestData(GenBill, oQuery);

	return aData;

};

module.exports.acknowledgeBill = async function (id, body, req) {

	let userName = req.user.full_name;
	let user = req.user;
	let clientId = req.user.clientId;
	let foundBill;
	let billingPartyAccount;
	let billingPartyAccountName;
	let remark = body.remark || '';

	try {

		foundBill = await GenBill.findOne({_id: id}).lean();

		if (!(foundBill && foundBill._id))
			throw new Error('No Bill Found');

		if (foundBill.acknowledge.status)
			throw new Error('Bill is already Approved');

		if (foundBill.billAmt === 0)
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

		if (foundBill.totDiscount) {
			if (!body.discountAcnt)
				throw new Error('Discount A/c not Defined');

			acknowledgeObj.discountAcnt = body.discountAcnt;
			let fName = await Accounts.findOne({_id: body.discountAcnt}, {name: 1, ledger_name: 1}).lean();
			body.discountAcName = fName.ledger_name || fName.name;
			acknowledgeObj.discountAcName = body.discountAcName;
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
			amount: foundBill.billAmt,
			cRdR: 'DR',
			bills: [{
				billNo: foundBill.billNo,
				billType: 'New Ref',
				amount: foundBill.billAmt,
				remAmt: foundBill.billAmt
			}]
		});
		aLedger.push({
			account: body.salesAccount,
			lName: body.salesAccountName,
			amount: foundBill.amount + (foundBill.totDiscount || 0),
			cRdR: 'CR',
			bills: []
		});

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
				amount: foundBill.adjAmount,
				cRdR: foundBill.adjAmount < 0 ? 'CR' : 'DR',
				bills: [{
					billNo: foundBill.billNo,
					billType: "On Account",
					amount: foundBill.adjAmount,
					remAmt: foundBill.adjAmount
				}]
			});
		}

		if (foundBill.totDiscount) {
			aLedger.push({
				account: body.discountAcnt,
				lName: body.discountAcName,
				amount: foundBill.totDiscount,
				cRdR: 'DR',
				bills: [{
					billNo: foundBill.billNo,
					billType: 'Against Ref',
					amount: foundBill.totDiscount,
					remAmt: foundBill.totDiscount
				}]
			});
		}

		let oVoucher = {
			_id: acknowledgeObj.voucher,
			type: "Sales",
			isEditable: false,
			date: foundBill.billDate,
			billNo: foundBill.billNo,
			billType: 'New Ref',
			vT: 'Sales Bill',
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
			await GenBill.findOneAndUpdate({_id: id}, {
				$set: {
					'acknowledge': acknowledgeObj,
					status: 'Approved'
				}
			});
		}
		return true;
	} catch (e) {
		winston.error('approve sales bill ', e.toString());
		throw e;
	}
}

