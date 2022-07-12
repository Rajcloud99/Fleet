const Bill = commonUtil.getModel('bills');
const BillingParty = commonUtil.getModel('billingparty');
const billService = commonUtil.getService('bills');
const billStationaryService = commonUtil.getService('billStationary');
const creditNoteService = commonUtil.getService('creditNote');
const GR = commonUtil.getModel('tripGr');
const MoneyReceipt = commonUtil.getModel('moneyReceipt');
const voucherService = commonUtil.getService('voucher');
const Accounts = commonUtil.getModel('accounts');
const serverSidePage = require('../../utils/serverSidePagination');
let moment = require('moment');
const logsService = commonUtil.getService('logs');

const ALLOWED_FILTER =['_id', 'clientId', 'mrNo', 'billNo', 'billRef', 'billingParty', 'refNo', 'date', 'from_date','start_date', 'to_date','end_date', 'customer_name', 'billingParty', 'branch'];
const ALLOWED_KEY_TO_UPDATE = ['mrNo', 'branch', 'narration', 'billingParty', 'paymentMode', 'paymentRef', 'paymentDate', 'receivedAmount', 'tdsAmount',
	'bankAccount', 'adviceAmount', 'tdsAccount', 'extChargeAccount', 'lastModifiedBy', 'receiving', 'bpAccNam', 'bpAcc', 'bankAccountName',
	'bankAccount', 'tdsAccountName', 'tdsAccount', 'extChargeAccountName', 'extChargeAccount', 'dedAccNam', 'dedAcc', 'bpNam', 'totBillReceiving',
	'totBillDedReceiving', 'totTdsAmount', 'totExtChargeAmount', 'totExtChargeAmount2', 'adviceAmount', 'receivedAmount', 'adjAccNam', 'adjAcc',
	'adjAmt', 'extCharges', 'extCharges2', 'extChargeAccount2', 'extChargeAccountName2', 'billReceiving'
];

module.exports = {
	add,
	addV2,
	edit,
	editV2,
	find,
	findPop,
	// isActualVchGen: checkIsActualVoucherGenerated,
	isVchGen: checkIsVoucherApproved,
	pullVoucher,
	remove,
	updateByBillDeduction,
	mrDeduction,
	mrBillingPartyWiseDeductionReport,
	mrMonthlyDeductionReport
};

function constructFilters(oQuery) {
	let oFilter={};

	for(i in oQuery){
		if(otherUtil.isAllowedFilter(i, ALLOWED_FILTER)){
			if (i === 'from_date' || i === 'start_date') {
				let startDate = new Date (oQuery[i]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				oFilter[oQuery.dateType || "created_at"] = oFilter[oQuery.dateType || "created_at"] || {};
				oFilter[oQuery.dateType || "created_at"].$gte = startDate;
			} else if (i === 'to_date' || i === 'end_date') {
				let endDate = new Date (oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				oFilter[oQuery.dateType  || "created_at"] = oFilter[oQuery.dateType  || "created_at"] || {};
				oFilter[oQuery.dateType  || "created_at"].$lte = endDate;
			} else if(i === '_id') {
				oFilter[i] = {
					$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
				};
			} else if (i == 'billNo') {
				oFilter['receiving.billNo'] = {$regex: oQuery[i], $options: 'i'};
			} else if (i == 'billingParty') {
				oFilter['billingParty'] = otherUtil.arrString2ObjectId(oQuery[i]);
			}
			else if (i === 'branch'){
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['branch'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			}
			// else if (i === 'customer_name') {
			// 	oFilter[i] = mongoose.Types.ObjectId(oQuery[key]);
			// 	oFilter.push({
			// 		$match: oFilter
			// 	});
			// }else if (key === "billing_party_name") {
			// 	var obj = {};
			// 	obj[key] = {
			// 		$regex: reqQuery[key],
			// 		$options: 'i'
			// 	};
			// 	aggrFilter.push({
			// 		$match: obj
			// 	});
			else {
				oFilter[i] = oQuery[i];
			}

		}
	}
	return oFilter;
}

async function find(body, user) {

	try{

		body.no_of_docs = body.no_of_docs || 10;
		body.skip = body.skip || 1;
		body.sort = body.sort || {_id: 1};
		body.populate = body.populate || [];

		const moneyReceiptQuery = [
			{ $match: constructFilters(body) },

			{ $sort: body.sort},

			{ $skip: (body.no_of_docs * body.skip) - body.no_of_docs },

			{ $limit: body.no_of_docs },

		];

		const moneyReceiptData = await MoneyReceipt
			.aggregate(moneyReceiptQuery)
			.allowDiskUse(true);

		return { data: moneyReceiptData };

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function findPop(body, user) {

	try{

		body.no_of_docs = body.no_of_docs || 10;
		body.skip = body.skip || 1;
		body.sort = body.sort || {_id: 1};
		body.clientId = user.clientId || body.clientId;
		body.populate = body.populate || [];

		let  billQuery = body.billQuery;

		const moneyReceiptQuery = [
			{ $match: constructFilters(body) },

			{ $sort: body.sort},

			{ $skip: (body.no_of_docs * body.skip) - body.no_of_docs },

			{ $limit: body.no_of_docs },

			{ $lookup: { from: 'billingparties', localField: 'billingParty', foreignField: '_id', as: 'billingParty' } },
			{ $unwind: { path : '$billingParty', preserveNullAndEmptyArrays: true } },

			{ $lookup: { from: 'accounts', localField: 'billingParty.account', foreignField: '_id', as: 'billingParty.account' } },
			{ $unwind: { path : '$billingParty.account', preserveNullAndEmptyArrays: true } },

			{ $lookup: { from: 'accounts', localField: 'billingParty.withHoldAccount', foreignField: '_id', as: 'billingParty.withHoldAccount' } },
			{ $unwind: { path : '$billingParty.withHoldAccount', preserveNullAndEmptyArrays: true } },
		];

		const moneyReceiptData = await MoneyReceipt
			.aggregate(moneyReceiptQuery)
			.allowDiskUse(true);

		if(moneyReceiptData && moneyReceiptData[0] && Array.isArray(moneyReceiptData[0].receiving) && moneyReceiptData[0].receiving.length > 0){

			let aBillRef = new Set();

			moneyReceiptData[0].receiving.forEach(o => {
				o.billRef && aBillRef.add(o.billRef.toString());
			});

			let aFoundbill;
			if(aBillRef.size)
				aFoundbill = await billService.getAllBillsAggr({
					_id: [...aBillRef],
					...billQuery,
					// 'acknowledge.voucher.acImp.st': true,
					populate: ['billingParty.account', 'billingParty.withHoldAccount', 'acknowledge.voucher'],
					no_of_docs: 1000
				});

			if(aFoundbill.data && aFoundbill.data.length){

				moneyReceiptData[0].receiving.forEach(o => {
					let foundData = aFoundbill.data.find(oBill => o.billRef && o.billRef.toString() === oBill._id.toString());
					o.billRef = foundData;
				});
			}
		}

		return { data: moneyReceiptData };

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function add(body, req) {

	try {

		let aFoundBill = await Bill.find({_id: otherUtil.arrString2ObjectId(body.receiving.map(o => o.billRef))}).lean();

		if(!(aFoundBill && aFoundBill.length))
			throw new Error('Bills Not Found');

		aFoundBill.forEach(foundBill => { // All bill should be Acknowledged
			if(!foundBill.acknowledge.status)
				throw new Error(`Bill No. ${foundBill.billNo} is Not Acknowledged`);
		});

		body.receiving = body.receiving || [];
		body._id = mongoose.Types.ObjectId();

		updateMrAmount(body);
		generateBillDeduction(aFoundBill, body.receiving, body);

		let savedMoneyReceipt = await (new MoneyReceipt(body)).save();
		savedMoneyReceipt.receiving = savedMoneyReceipt.receiving || [];
		let id = savedMoneyReceipt._id;
		let grIds = savedMoneyReceipt.receiving.map(o => o.grRef);

		if(id){

			// let creditNoteToUpdate = new Set();

			for(let k in aFoundBill){
				if(aFoundBill.hasOwnProperty(k)){
					let oBill = aFoundBill[k];

					await Bill.findByIdAndUpdate(oBill._id, {
						$set: {
							'receiving': oBill.receiving
						}
					});

					// oBill.receiving.deduction.forEach(oBillDed => {
                    //
					// 	if(oBillDed.cNoteRef && oBillDed.mrRef && oBillDed.mrRef.toString() === id.toString())
					// 		creditNoteToUpdate.add(oBillDed.cNoteRef.toString());
                    //
					// });
				}
			}

			// if(creditNoteToUpdate.size)
			// 	await creditNoteService.updateByBillDeduction([...creditNoteToUpdate]);

			if(grIds.length)
				await GR.updateMany({
					_id: grIds
				}, {
					$addToSet: {
						"moneyReceiptRef": id
					}
				});
		}

		// update gr money receipt
		if(body.grPayment && Array.isArray(body.grPayment)){
			for(let k in body.grPayment){
				if(body.grPayment.hasOwnProperty(k)){
					let oGr = body.grPayment[k];

					let fd = await GR.findOne({
						_id: otherUtil.arrString2ObjectId(oGr.gr_id),
						'moneyReceipt.collection.paymentId': {
							$in: otherUtil.arrString2ObjectId(oGr.paymentId)
						}
					}, {'moneyReceipt.collection': 1});

					if(fd){
						(fd.moneyReceipt && fd.moneyReceipt.collection || []).forEach(o => {
							if(o.paymentId)
								if(oGr.paymentId.find(op => op.toString() === o.paymentId.toString()))
									o.mrRef = id;
						})
						await fd.save();
					}

				}
			}
		}

		if(body.stationaryId){
			await billStationaryService.updateStatus({
				userName: body.createdBy,
				docId: id,
				modelName: 'MoneyReceipt',
				stationaryId: body.stationaryId,
			}, 'used');
		}

		await approve(body._id, body, req);

		return savedMoneyReceipt;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function addV2(body, req) {

	try {

		let aFoundBill = await Bill.find({_id: otherUtil.arrString2ObjectId(body.receiving.map(o => o.billRef))}).lean();

		if(!(aFoundBill && aFoundBill.length))
			throw new Error('Bills Not Found');

		aFoundBill.forEach(foundBill => { // All bill should be Acknowledged
			if(!foundBill.acknowledge.status)
				throw new Error(`Bill No. ${foundBill.billNo} is Not Acknowledged`);
		});

		body.billReceiving = body.billReceiving || [];
		body.receiving = body.receiving || [];
		body._id = mongoose.Types.ObjectId();

		updateMrAmountV2(body);
		generateBillDeductionV2(aFoundBill, body.receiving, body);

		let savedMoneyReceipt = await (new MoneyReceipt(body)).save();
		savedMoneyReceipt.receiving = savedMoneyReceipt.receiving || [];
		let id = savedMoneyReceipt._id;
		let grIds = savedMoneyReceipt.receiving.map(o => o.grRef);

		if(id){

			// let creditNoteToUpdate = new Set();

			for(let k in aFoundBill){
				if(aFoundBill.hasOwnProperty(k)){
					let oBill = aFoundBill[k];

					await Bill.findByIdAndUpdate(oBill._id, {
						$set: {
							'receiving': oBill.receiving
						}
					});

					// oBill.receiving.deduction.forEach(oBillDed => {
                    //
					// 	if(oBillDed.cNoteRef && oBillDed.mrRef && oBillDed.mrRef.toString() === id.toString())
					// 		creditNoteToUpdate.add(oBillDed.cNoteRef.toString());
                    //
					// });
				}
			}

			// if(creditNoteToUpdate.size)
			// 	await creditNoteService.updateByBillDeduction([...creditNoteToUpdate]);

			if(grIds.length)
				await GR.updateMany({
					_id: grIds
				}, {
					$addToSet: {
						"moneyReceiptRef": id
					}
				});
		}

		// update gr money receipt
		if(body.grPayment && Array.isArray(body.grPayment)){
			for(let k in body.grPayment){
				if(body.grPayment.hasOwnProperty(k)){
					let oGr = body.grPayment[k];

					let fd = await GR.findOne({
						_id: otherUtil.arrString2ObjectId(oGr.gr_id),
						'moneyReceipt.collection.paymentId': {
							$in: otherUtil.arrString2ObjectId(oGr.paymentId)
						}
					}, {'moneyReceipt.collection': 1});

					if(fd){
						(fd.moneyReceipt && fd.moneyReceipt.collection || []).forEach(o => {
							if(o.paymentId)
								if(oGr.paymentId.find(op => op.toString() === o.paymentId.toString()))
									o.mrRef = id;
						})
						await fd.save();
					}

				}
			}
		}

		if(body.stationaryId){
			await billStationaryService.updateStatus({
				userName: body.createdBy,
				docId: id,
				modelName: 'MoneyReceipt',
				stationaryId: body.stationaryId,
			}, 'used');
		}

		await approveV2(body._id, body, req);

		return savedMoneyReceipt;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function edit(_id, body, req) {

	try {

		let foundMoneyReceipt = await MoneyReceipt.findOne({_id}).lean();
		let userName = req.user.full_name;

		if(!(foundMoneyReceipt && foundMoneyReceipt._id))
			throw new Error('No Money Receipt Found');

		let aFoundBill = await Bill.find({_id: {$in: otherUtil.arrString2ObjectId(body.receiving.reduce((arr, o) => {
			if(o.billRef)
				arr.push(o.billRef);
			return arr;
		},[]))}}).lean();

		if(!(aFoundBill && aFoundBill.length))
			throw new Error('Bills Not Found');

		let grsToUnset = [];
		let billsToUnset = [];

		foundMoneyReceipt.receiving = foundMoneyReceipt.receiving || [];
		body.receiving = body.receiving || [];

		foundMoneyReceipt.receiving.forEach(oReceiving => {
			if(!body.receiving.find(o => o.grRef === (oReceiving.grRef && oReceiving.grRef.toString())))
				grsToUnset.push(oReceiving.grRef);

			if(!body.receiving.find(o => o.billRef === (oReceiving.billRef && oReceiving.billRef.toString())))
				billsToUnset.push(oReceiving.billRef);
		});

		updateMrAmount(body);
		generateBillDeduction(aFoundBill, body.receiving, foundMoneyReceipt);

		let moneyReceiptBody = otherUtil.pickPropertyFromObject(body, ALLOWED_KEY_TO_UPDATE);

		// remove the Money Receipt id from gr
		grsToUnset.length && await removeGrRef(_id, grsToUnset);

		// remove the Money Receipt id from bill
		billsToUnset.length && await removeBillRef(_id, billsToUnset);

		if(foundMoneyReceipt.mrNo != body.mrNo){

			if(foundMoneyReceipt.stationaryId)
				await billStationaryService.updateStatus({
					userName,
					docId: _id,
					modelName: 'MoneyReceipt',
					stationaryId: foundMoneyReceipt.stationaryId,
				}, 'cancelled');

			if(body.stationaryId)
				await billStationaryService.updateStatus({
					userName: body.lastModifiedBy,
					docId: _id,
					modelName: 'MoneyReceipt',
					stationaryId: body.stationaryId,
				}, 'used');
		}

		await MoneyReceipt.updateOne({_id}, {
			$set: moneyReceiptBody
		});

		let oUpdatedCreditNote = await MoneyReceipt.findOne({_id}).lean();

		let grIds = oUpdatedCreditNote.receiving.map(o => o.grRef);
		grIds.length && await removeGrPayment(_id, grIds);

		if(_id){

			// let creditNoteToUpdate = new Set();

			for(let k in aFoundBill){
				if(aFoundBill.hasOwnProperty(k)){
					let oBill = aFoundBill[k];

					await Bill.findByIdAndUpdate(oBill._id, {
						$set: {
							'receiving': oBill.receiving
						}
					});

					// oBill.receiving.deduction.forEach(oBillDed => {
                    //
					// 	if(oBillDed.cNoteRef && oBillDed.mrRef && oBillDed.mrRef.toString() === _id.toString())
					// 		creditNoteToUpdate.add(oBillDed.cNoteRef.toString());
                    //
					// });
				}
			}

			// if(creditNoteToUpdate.length)
			// 	await creditNoteService.updateByBillDeduction([...creditNoteToUpdate]);

			if(grIds.length)
				await GR.updateMany({
					_id: {
						$in: grIds
					}
				}, {
					$addToSet: {
						"moneyReceiptRef": _id
					}
				});
		}

		// update gr money receipt
		if(body.grPayment && Array.isArray(body.grPayment)){
			for(let k in body.grPayment){
				if(body.grPayment.hasOwnProperty(k)){
					let oGr = body.grPayment[k];

					let fd = await GR.findOne({
						_id: otherUtil.arrString2ObjectId(oGr.gr_id),
						'moneyReceipt.collection.paymentId': {
							$in: otherUtil.arrString2ObjectId(oGr.paymentId)
						}
					}, {'moneyReceipt.collection': 1});

					if(fd){
						(fd.moneyReceipt && fd.moneyReceipt.collection || []).forEach(o => {
							if(o.paymentId)
								if(oGr.paymentId.find(op => op.toString() === o.paymentId.toString()))
									o.mrRef = _id;
						})
						await fd.save();
					}
				}
			}
		}

		// if approve the money receipt
		await approve(_id, body, req);

		return oUpdatedCreditNote;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function editV2(_id, body, req) {

	try {

		let foundMoneyReceipt = await MoneyReceipt.findOne({_id}).lean();
		let userName = req.user.full_name;

		if(!(foundMoneyReceipt && foundMoneyReceipt._id))
			throw new Error('No Money Receipt Found');

		let aFoundBill = await Bill.find({_id: {$in: otherUtil.arrString2ObjectId(body.receiving.reduce((arr, o) => {
					if(o.billRef)
						arr.push(o.billRef);
					return arr;
				},[]))}}).lean();

		if(!(aFoundBill && aFoundBill.length))
			throw new Error('Bills Not Found');

		let grsToUnset = [];
		let billsToUnset = [];

		foundMoneyReceipt.receiving = foundMoneyReceipt.receiving || [];
		body.receiving = body.receiving || [];
		body.billReceiving = body.billReceiving || [];

		foundMoneyReceipt.receiving.forEach(oReceiving => {
			if(!body.receiving.find(o => o.grRef === (oReceiving.grRef && oReceiving.grRef.toString())))
				grsToUnset.push(oReceiving.grRef);

			if(!body.receiving.find(o => o.billRef === (oReceiving.billRef && oReceiving.billRef.toString())))
				billsToUnset.push(oReceiving.billRef);
		});

		updateMrAmountV2(body);
		generateBillDeductionV2(aFoundBill, body.receiving, foundMoneyReceipt);

		let moneyReceiptBody = otherUtil.pickPropertyFromObject(body, ALLOWED_KEY_TO_UPDATE);

		// remove the Money Receipt id from gr
		grsToUnset.length && await removeGrRef(_id, grsToUnset);

		// remove the Money Receipt id from bill
		billsToUnset.length && await removeBillRef(_id, billsToUnset);

		if(foundMoneyReceipt.mrNo != body.mrNo){

			if(foundMoneyReceipt.stationaryId)
				await billStationaryService.updateStatus({
					userName,
					docId: _id,
					modelName: 'MoneyReceipt',
					stationaryId: foundMoneyReceipt.stationaryId,
				}, 'cancelled');

			if(body.stationaryId)
				await billStationaryService.updateStatus({
					userName: body.lastModifiedBy,
					docId: _id,
					modelName: 'MoneyReceipt',
					stationaryId: body.stationaryId,
				}, 'used');
		}

		await MoneyReceipt.updateOne({_id}, {
			$set: moneyReceiptBody
		});

		let oUpdatedCreditNote = await MoneyReceipt.findOne({_id}).lean();

		let grIds = oUpdatedCreditNote.receiving.map(o => o.grRef);
		grIds.length && await removeGrPayment(_id, grIds);

		if(_id){

			// let creditNoteToUpdate = new Set();

			for(let k in aFoundBill){
				if(aFoundBill.hasOwnProperty(k)){
					let oBill = aFoundBill[k];

					await Bill.findByIdAndUpdate(oBill._id, {
						$set: {
							'receiving': oBill.receiving
						}
					});

					// oBill.receiving.deduction.forEach(oBillDed => {
					//
					// 	if(oBillDed.cNoteRef && oBillDed.mrRef && oBillDed.mrRef.toString() === _id.toString())
					// 		creditNoteToUpdate.add(oBillDed.cNoteRef.toString());
					//
					// });
				}
			}

			// if(creditNoteToUpdate.length)
			// 	await creditNoteService.updateByBillDeduction([...creditNoteToUpdate]);

			if(grIds.length)
				await GR.updateMany({
					_id: {
						$in: grIds
					}
				}, {
					$addToSet: {
						"moneyReceiptRef": _id
					}
				});
		}

		// update gr money receipt
		if(body.grPayment && Array.isArray(body.grPayment)){
			for(let k in body.grPayment){
				if(body.grPayment.hasOwnProperty(k)){
					let oGr = body.grPayment[k];

					let fd = await GR.findOne({
						_id: otherUtil.arrString2ObjectId(oGr.gr_id),
						'moneyReceipt.collection.paymentId': {
							$in: otherUtil.arrString2ObjectId(oGr.paymentId)
						}
					}, {'moneyReceipt.collection': 1});

					if(fd){
						(fd.moneyReceipt && fd.moneyReceipt.collection || []).forEach(o => {
							if(o.paymentId)
								if(oGr.paymentId.find(op => op.toString() === o.paymentId.toString()))
									o.mrRef = _id;
						})
						await fd.save();
					}
				}
			}
		}

		// if approve the money receipt
		await approveV2(_id, body, req);

		return oUpdatedCreditNote;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function remove(_id, body, req) {

	try {

		let foundMoneyReceipt = await MoneyReceipt.findOne({_id: otherUtil.arrString2ObjectId(_id)}, {receiving: 1, stationaryId: 1, isVchAlGen: 1, vch: 1, pulledVchClone: 1})
			.populate({
				path: "vch"
			}).lean();

		if(!(foundMoneyReceipt && foundMoneyReceipt._id))
			throw new Error('No Money Receipt Found');

		// remove the Money Receipt id from gr
		let grRef = foundMoneyReceipt.receiving.map(o => o.grRef);
		grRef.length && await removeGrRef(_id, grRef);

		// remove the Money Receipt id from bill
		let billRef = foundMoneyReceipt.receiving.map(o => o.billRef);
		billRef.length && await removeBillRef(_id, billRef);

		if(foundMoneyReceipt.stationaryId){
			await billStationaryService.updateStatus({
				userName: body.userName,
				docId: _id,
				modelName: 'MoneyReceipt',
				stationaryId: foundMoneyReceipt.stationaryId,
			}, 'cancelled');
		}

		let foundVch = foundMoneyReceipt.vch;

		 if(foundMoneyReceipt.isVchAlGen && foundMoneyReceipt.pulledVchClone)
			await voucherService.editVoucher(JSON.parse(foundMoneyReceipt.pulledVchClone));
		else
			await unApprove(_id, body, foundVch, req);

		await MoneyReceipt.remove({_id: otherUtil.arrString2ObjectId(_id)});

		return true;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function removeGrRef(_id, aGrId) {
	try{

		if(aGrId.length) {
			await GR.updateMany({_id: {$in: aGrId}}, {$pull: {moneyReceiptRef: _id}});
			for(let gr_id of aGrId){
				let fd = await GR.findOne({
					_id: gr_id,
				}, {'moneyReceipt.collection': 1}).lean();

				if(fd){
					(fd.moneyReceipt && fd.moneyReceipt.collection || []).forEach(o => {
						if(o.mrRef && o.mrRef.toString() == _id.toString())
							delete o.mrRef
					})

					if(fd.moneyReceipt && fd.moneyReceipt.collection)
						await GR.updateOne({
							_id: gr_id,
						}, {
							$set: {
								'moneyReceipt.collection': fd.moneyReceipt.collection
							}
						});
				}
			}
		}

		return true;


	}catch (e) {
		throw e;
	}
}

async function removeGrPayment(_id, aGrId) {
	try{

		if(aGrId.length) {
			for(let gr_id of aGrId){
				let fd = await GR.findOne({
					_id: gr_id,
				}, {'moneyReceipt.collection': 1}).lean();

				if(fd){
					(fd.moneyReceipt && fd.moneyReceipt.collection || []).forEach(o => {
						if(o.mrRef && o.mrRef.toString() == _id.toString())
							delete o.mrRef
					})

					if(fd.moneyReceipt && fd.moneyReceipt.collection)
						await GR.updateOne({
							_id: gr_id,
						}, {
							$set: {
								'moneyReceipt.collection': fd.moneyReceipt.collection
							}
						});
				}
			}
		}

		return true;


	}catch (e) {
		throw e;
	}
}

async function removeBillRef(_id, aBillId) {
	try{

		let aFoundBill = await Bill.find({_id: aBillId}).lean();

		if(!(aFoundBill && aFoundBill.length))
			throw new Error('Bills Not Found');

		for(let k in aFoundBill){
			if(aFoundBill.hasOwnProperty(k)){
				let foundBill = aFoundBill[k];

				foundBill.receiving = foundBill.receiving || {};
				foundBill.receiving.deduction = foundBill.receiving.deduction || [];

				let updatedDeduction = foundBill.receiving.deduction.reduce((arr, oDed) => {

					let allowedFlag = true;

					if(oDed.mrRef && oDed.mrRef.toString() === _id.toString()){

						if(oDed.cNoteRef){
							delete oDed.mrRef;
							delete oDed.mrNo;
						}else
							allowedFlag = false;

					}

					if(allowedFlag)
						arr.push(oDed);

					return arr;
				}, []);


				let billSet = {
					deduction: updatedDeduction,
					moneyReceipt: Array.isArray(foundBill.receiving.moneyReceipt) && foundBill.receiving.moneyReceipt.filter(o => o.mrRef.toString() != _id.toString()) || []
				};

				await Bill.findByIdAndUpdate(foundBill._id, {
					$set: {
						'receiving': billSet
					}
				});
			}
		}

		return true;

	}catch (e) {
		throw e;
	}
}

async function approve(_id, body, req) {

	let userName = req.user.full_name;
	let clientId = req.user.clientId;
	let foundMoneyReceipt;
	let implementByCostCenter = req.clientConfig
		&& req.clientConfig.config
		&& req.clientConfig.config.costCenter
		&& req.clientConfig.config.costCenter.show || false;
	let notToWithHold = req.clientConfig
		&& req.clientConfig.config
		&& req.clientConfig.config.moneyReceipt
		&& req.clientConfig.config.moneyReceipt.dedNotToWithHold || false;

	try {

		// Checking: does Money Receipt exists
		foundMoneyReceipt = await MoneyReceipt.findOne({_id}).lean();

		if(!(foundMoneyReceipt && foundMoneyReceipt._id))
			throw new Error('No Money Receipt Found');

		// Checking: does billing party Exists
		let foundBillingParty = await BillingParty.findOne({_id: foundMoneyReceipt.billingParty}, {withHoldAccount: 1, account: 1, name: 1}).lean();

		if(!(foundBillingParty && foundBillingParty._id))
			throw new Error('No Billing Party Found');

		// Checking: is account linked with billing party
		if(!foundBillingParty.account)
			throw new Error(`No A/c linked with Billing Party ${foundBillingParty.name}`);

		if(notToWithHold) {
			// do nothing
		}else if(foundMoneyReceipt.totBillDedReceiving && !foundBillingParty.withHoldAccount) // Checking: is withhold account linked with billing party
			throw new Error(`No With Hold A/c linked with Billing Party ${foundBillingParty.name}`);

		let oVoucher = {
			type: "Receipt",
			date: foundMoneyReceipt.date,
			clientId,
			branch: foundMoneyReceipt.branch,
			narration: foundMoneyReceipt.narration,
			refNo: foundMoneyReceipt.mrNo,
			vT: 'Money Receipt',
			trackPayAs: 'bill',
			isEditable: false,
			createdBy: userName
		},
			aLedger = [];

		aLedger.push({
			account: foundMoneyReceipt.bankAccount,
			lName: foundMoneyReceipt.bankAccountName,
			amount: foundMoneyReceipt.receivedAmount,
			cRdR: 'DR',
			bills: []
		});

		if(foundMoneyReceipt.totBillDedReceiving){
			let obj = {};
			let dedLedger = {};

			if(notToWithHold){
				for(let oRec of foundMoneyReceipt.receiving) {
					for(let oDed of oRec.deduction) {
						let ptr = oDed.account && oDed.account._id.toString();

						if(!dedLedger[ptr]){
							dedLedger[ptr] = {
								account: oDed.account && oDed.account._id,
								lName: oDed.account && oDed.account.name,
								cRdR: 'DR',
								amount: oDed.amount,
								bills: []
							};

							if(implementByCostCenter){
								dedLedger[ptr].costCategory = [{
									category: oDed.costCenter.category,
									center: [{
										centerId: oDed.costCenter._id,
										name: oDed.costCenter.name,
										amount: oDed.amount
									}]
								}]
							}
						}else {
							dedLedger[ptr].amount += oDed.amount;
							if(implementByCostCenter)
								dedLedger[ptr].costCategory[0].center[0].amount += oDed.amount;
						}
					}
				}
			}else {
				for(let oRec of foundMoneyReceipt.receiving) {

					let ptr = foundMoneyReceipt.billingParty && foundMoneyReceipt.billingParty.toString();
					let fdBp;
					if(oRec.bP){
						// Checking: does billing party Exists
						fdBp = await BillingParty.findOne({_id: oRec.bP}, {withHoldAccount: 1, name: 1}).lean();

						if(!fdBp.withHoldAccount)
							throw new Error(`No With Hold A/c linked with Billing Party ${fdBp.name}`);

						ptr = oRec.bP && oRec.bP.toString();
					}

					dedLedger[ptr] = dedLedger[ptr] || {};
					dedLedger[ptr].amount = dedLedger[ptr].amount || 0;
					dedLedger[ptr].bills = dedLedger[ptr].bills || {};

					if(ptr === (foundMoneyReceipt.billingParty && foundMoneyReceipt.billingParty.toString())){
						dedLedger[ptr].account = foundBillingParty.withHoldAccount;
						dedLedger[ptr].lName = foundMoneyReceipt.dedAccNam;
					}else{
						dedLedger[ptr].account = fdBp.withHoldAccount;
						dedLedger[ptr].lName = (await Accounts.findOne({_id: fdBp.withHoldAccount}, {name: 1}).lean()).name;
					}

					for(let oDed of oRec.deduction) {

						dedLedger[ptr].bills[oRec.billNo] = dedLedger[ptr].bills[oRec.billNo] || [];
						dedLedger[ptr].amount += oDed.amount;

						let fdDed = dedLedger[ptr].bills[oRec.billNo].find(o => {o.type === oDed.type});

						if(fdDed){
							fdDed.amount += oDed.amount;
						}else
							dedLedger[ptr].bills[oRec.billNo].push({
								billNo:  constant.dedCharges[oDed.type] + '-' + (oRec.billNo || foundMoneyReceipt.mrNo),
								type: oDed.type,
								billType: 'New Ref',
								amount: oDed.amount,
								remAmt: 0
							});
					}
				}
			}

			Object.values(dedLedger).forEach(o => {
				if(o.amount)
					aLedger.push({
						account: o.account,
						lName: o.lName,
						cRdR: 'DR',
						amount: o.amount,
						bills: Object.values(o.bills).reduce((arr, a) => (arr.push(...a), arr), []),
						costCategory: (o.costCategory || [])
					});
			});
		}

		if(foundMoneyReceipt.totTdsAmount){
			let tdsBills = foundMoneyReceipt.receiving.reduce((arr, oRec) => {
				if(oRec.tdsAmt){
					arr.push({
						billNo:  'TDS-' + oRec.billNo,
						billType: 'New Ref',
						amount: oRec.tdsAmt,
						remAmt: 0
					});
				}
				return arr;
			}, []);

			aLedger.push({
				account: foundMoneyReceipt.tdsAccount,
				lName: foundMoneyReceipt.tdsAccountName,
				amount: foundMoneyReceipt.totTdsAmount,
				cRdR: 'DR',
				bills: tdsBills.length ? tdsBills : [{
					billNo:  foundMoneyReceipt.mrNo,
					billType: 'New Ref',
					amount: foundMoneyReceipt.totTdsAmount,
					remAmt: 0
				}]
			});
		}

		if(foundMoneyReceipt.totExtChargeAmount)
			aLedger.push({
				account: foundMoneyReceipt.extChargeAccount,
				lName: foundMoneyReceipt.extChargeAccountName,
				amount: foundMoneyReceipt.totExtChargeAmount,
				cRdR: 'DR',
				bills: (foundMoneyReceipt.extCharges || []).map(o => ({
					billNo:  o.billNo,
					billType: 'New Ref',
					amount: o.amt,
					remAmt: 0
				}))
			});

		if(foundMoneyReceipt.totExtChargeAmount2)
			aLedger.push({
				account: foundMoneyReceipt.extChargeAccount2,
				lName: foundMoneyReceipt.extChargeAccountName2,
				amount: foundMoneyReceipt.totExtChargeAmount2,
				cRdR: 'DR',
				bills: (foundMoneyReceipt.extCharges2 || []).map(o => ({
					billNo:  o.billNo,
					billType: 'New Ref',
					amount: o.amt,
					remAmt: 0
				}))
			});

		if(foundMoneyReceipt.adjAmt)
			aLedger.push({
				account: foundMoneyReceipt.adjAcc,
				lName: foundMoneyReceipt.adjAccNam,
				amount: Math.abs(foundMoneyReceipt.adjAmt),
				cRdR: foundMoneyReceipt.adjAmt > 0 ? 'DR' : 'CR',
				bills: []
			});


		aLedger.push(...foundMoneyReceipt.receiving.reduce((arr, oRec) => {

			if(!oRec.bpAcc)
				return arr;

			let fdArr = arr.find(o => o.account.toString() === oRec.bpAcc.toString());

			let recAndDec = oRec.totReceived /*+ oRec.totalDeduction*/;

			if(fdArr){

				fdArr.amount += recAndDec;

				let fdBill = fdArr.bills.find(o => o.billNo === oRec.billNo);

				if(fdBill){
					fdBill.amount += recAndDec;
				}else{
					fdArr.bills.push({
						billNo: oRec.billNo,
						billType: 'Against Ref',
						amount: recAndDec,
						remAmt: 0
					});
				}
			}else{
				arr.push({
					account: oRec.bpAcc,
					lName: oRec.bpAccNam,
					amount: recAndDec,
					cRdR: 'CR',
					bills: [{
						billNo:  oRec.billNo,
						billType: 'Against Ref',
						amount: recAndDec,
						remAmt: 0
					}]
				});
			}

			return arr;
		}, []));

		oVoucher.ledgers = aLedger;

		if(foundMoneyReceipt.vch){
			oVoucher._id = foundMoneyReceipt.vch;

			let isVoucherImp = await checkIsVoucherApproved(foundMoneyReceipt._id);

			// revert Voucher
			isVoucherImp && await voucherService.reverseOne(oVoucher._id, body, req);

			// edit Voucher
			await voucherService.editVoucher(oVoucher);

			// import Voucher
			isVoucherImp && await voucherService.importOne(oVoucher._id, body, req);
		}else{
			oVoucher._id = mongoose.Types.ObjectId();
			await voucherService.addVoucherAsync(oVoucher);
			await MoneyReceipt.updateOne({
				_id: foundMoneyReceipt._id
			}, {
				vch: oVoucher._id
			});
		}

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function approveV2(_id, body, req) {

	let userName = req.user.full_name;
	let clientId = req.user.clientId;
	let foundMoneyReceipt;
	let implementByCostCenter = req.clientConfig
		&& req.clientConfig.config
		&& req.clientConfig.config.costCenter
		&& req.clientConfig.config.costCenter.show || false;
	let notToWithHold = req.clientConfig
		&& req.clientConfig.config
		&& req.clientConfig.config.moneyReceipt
		&& req.clientConfig.config.moneyReceipt.dedNotToWithHold || false;

	try {

		// Checking: does Money Receipt exists
		foundMoneyReceipt = await MoneyReceipt.findOne({_id}).lean();

		if(!(foundMoneyReceipt && foundMoneyReceipt._id))
			throw new Error('No Money Receipt Found');

		// Checking: does billing party Exists
		let foundBillingParty = await BillingParty.findOne({_id: foundMoneyReceipt.billingParty}, {withHoldAccount: 1, account: 1, name: 1}).lean();

		if(!(foundBillingParty && foundBillingParty._id))
			throw new Error('No Billing Party Found');

		// Checking: is account linked with billing party
		if(!foundBillingParty.account)
			throw new Error(`No A/c linked with Billing Party ${foundBillingParty.name}`);

		if(notToWithHold) {
			// do nothing
		}else if(foundMoneyReceipt.totBillDedReceiving && !foundBillingParty.withHoldAccount) // Checking: is withhold account linked with billing party
			throw new Error(`No With Hold A/c linked with Billing Party ${foundBillingParty.name}`);

		let oVoucher = {
				type: "Receipt",
				date: foundMoneyReceipt.date,
				clientId,
				branch: foundMoneyReceipt.branch,
				narration: foundMoneyReceipt.narration,
				refNo: foundMoneyReceipt.mrNo,
				vT: 'Money Receipt',
				trackPayAs: 'bill',
				isEditable: false,
				createdBy: userName
			},
			aLedger = [];

		aLedger.push({
			account: foundMoneyReceipt.bankAccount,
			lName: foundMoneyReceipt.bankAccountName,
			amount: foundMoneyReceipt.receivedAmount,
			cRdR: 'DR',
			bills: []
		});

		if(foundMoneyReceipt.totBillDedReceiving){
			let obj = {};
			let dedLedger = {};

			if(notToWithHold){
				for(let oRec of foundMoneyReceipt.receiving) {
					for(let oDed of oRec.deduction) {
						let ptr = oDed.account && oDed.account._id.toString();

						if(!dedLedger[ptr]){
							dedLedger[ptr] = {
								account: oDed.account && oDed.account._id,
								lName: oDed.account && oDed.account.name,
								cRdR: 'DR',
								amount: oDed.amount,
								bills: []
							};

							if(implementByCostCenter){
								dedLedger[ptr].costCategory = [{
									category: oDed.costCenter.category,
									center: [{
										centerId: oDed.costCenter._id,
										name: oDed.costCenter.name,
										amount: oDed.amount
									}]
								}]
							}
						}else {
							dedLedger[ptr].amount += oDed.amount;
							if(implementByCostCenter)
								dedLedger[ptr].costCategory[0].center[0].amount += oDed.amount;
						}
					}
				}
			}else {
				for(let oRec of foundMoneyReceipt.receiving) {

					let ptr = foundMoneyReceipt.billingParty && foundMoneyReceipt.billingParty.toString();
					let fdBp;
					if(oRec.bP){
						// Checking: does billing party Exists
						fdBp = await BillingParty.findOne({_id: oRec.bP}, {withHoldAccount: 1, name: 1}).lean();

						if(!fdBp.withHoldAccount)
							throw new Error(`No With Hold A/c linked with Billing Party ${fdBp.name}`);

						ptr = oRec.bP && oRec.bP.toString();
					}

					dedLedger[ptr] = dedLedger[ptr] || {};
					dedLedger[ptr].amount = dedLedger[ptr].amount || 0;
					dedLedger[ptr].bills = dedLedger[ptr].bills || {};

					if(ptr === (foundMoneyReceipt.billingParty && foundMoneyReceipt.billingParty.toString())){
						dedLedger[ptr].account = foundBillingParty.withHoldAccount;
						dedLedger[ptr].lName = foundMoneyReceipt.dedAccNam;
					}else{
						dedLedger[ptr].account = fdBp.withHoldAccount;
						dedLedger[ptr].lName = (await Accounts.findOne({_id: fdBp.withHoldAccount}, {name: 1}).lean()).name;
					}

					for(let oDed of oRec.deduction) {

						dedLedger[ptr].bills[oRec.billNo] = dedLedger[ptr].bills[oRec.billNo] || [];
						dedLedger[ptr].amount += oDed.amount;

						let fdDed = dedLedger[ptr].bills[oRec.billNo].find(o => {o.type === oDed.type});

						if(fdDed){
							fdDed.amount += oDed.amount;
						}else
							dedLedger[ptr].bills[oRec.billNo].push({
								billNo:  constant.dedCharges[oDed.type] + '-' + (oRec.billNo || foundMoneyReceipt.mrNo),
								type: oDed.type,
								billType: 'New Ref',
								amount: oDed.amount,
								remAmt: 0
							});
					}
				}
			}

			Object.values(dedLedger).forEach(o => {
				if(o.amount)
					aLedger.push({
						account: o.account,
						lName: o.lName,
						cRdR: 'DR',
						amount: o.amount,
						bills: Object.values(o.bills).reduce((arr, a) => (arr.push(...a), arr), []),
						costCategory: (o.costCategory || [])
					});
			});
		}

		if(foundMoneyReceipt.totTdsAmount){
			let tdsBills = foundMoneyReceipt.receiving.reduce((arr, oRec) => {
				if(oRec.tdsAmt){
					arr.push({
						billNo:  'TDS-' + oRec.billNo,
						billType: 'New Ref',
						amount: oRec.tdsAmt,
						remAmt: 0
					});
				}
				return arr;
			}, []);

			aLedger.push({
				account: foundMoneyReceipt.tdsAccount,
				lName: foundMoneyReceipt.tdsAccountName,
				amount: foundMoneyReceipt.totTdsAmount,
				cRdR: 'DR',
				bills: tdsBills.length ? tdsBills : [{
					billNo:  foundMoneyReceipt.mrNo,
					billType: 'New Ref',
					amount: foundMoneyReceipt.totTdsAmount,
					remAmt: 0
				}]
			});
		}

		if(foundMoneyReceipt.totExtChargeAmount)
			aLedger.push({
				account: foundMoneyReceipt.extChargeAccount,
				lName: foundMoneyReceipt.extChargeAccountName,
				amount: foundMoneyReceipt.totExtChargeAmount,
				cRdR: 'DR',
				bills: (foundMoneyReceipt.extCharges || []).map(o => ({
					billNo:  o.billNo,
					billType: 'New Ref',
					amount: o.amt,
					remAmt: 0
				}))
			});

		if(foundMoneyReceipt.totExtChargeAmount2)
			aLedger.push({
				account: foundMoneyReceipt.extChargeAccount2,
				lName: foundMoneyReceipt.extChargeAccountName2,
				amount: foundMoneyReceipt.totExtChargeAmount2,
				cRdR: 'DR',
				bills: (foundMoneyReceipt.extCharges2 || []).map(o => ({
					billNo:  o.billNo,
					billType: 'New Ref',
					amount: o.amt,
					remAmt: 0
				}))
			});

		if(foundMoneyReceipt.adjAmt)
			aLedger.push({
				account: foundMoneyReceipt.adjAcc,
				lName: foundMoneyReceipt.adjAccNam,
				amount: Math.abs(foundMoneyReceipt.adjAmt),
				cRdR: foundMoneyReceipt.adjAmt > 0 ? 'DR' : 'CR',
				bills: []
			});


		aLedger.push(...foundMoneyReceipt.billReceiving.reduce((arr, oRec) => {

			if(!oRec.bpAcc)
				return arr;

			let fdArr = arr.find(o => o.account.toString() === oRec.bpAcc.toString());

			let recAndDec = oRec.totReceived /*+ oRec.totalDeduction*/;

			if(fdArr){

				fdArr.amount += recAndDec;

				let fdBill = fdArr.bills.find(o => o.billNo === oRec.billNo);

				if(fdBill){
					fdBill.amount += recAndDec;
				}else{
					fdArr.bills.push({
						billNo: oRec.billNo,
						billType: 'Against Ref',
						amount: recAndDec,
						remAmt: 0
					});
				}
			}else{
				arr.push({
					account: oRec.bpAcc,
					lName: oRec.bpAccNam,
					amount: recAndDec,
					cRdR: 'CR',
					bills: [{
						billNo:  oRec.billNo,
						billType: 'Against Ref',
						amount: recAndDec,
						remAmt: 0
					}]
				});
			}

			return arr;
		}, []));

		oVoucher.ledgers = aLedger;

		if(foundMoneyReceipt.vch){
			oVoucher._id = foundMoneyReceipt.vch;

			let isVoucherImp = await checkIsVoucherApproved(foundMoneyReceipt._id);

			// revert Voucher
			isVoucherImp && await voucherService.reverseOne(oVoucher._id, body, req);

			// edit Voucher
			await voucherService.editVoucher(oVoucher);

			// import Voucher
			isVoucherImp && await voucherService.importOne(oVoucher._id, body, req);
		}else{
			oVoucher._id = mongoose.Types.ObjectId();
			await voucherService.addVoucherAsync(oVoucher);
			await MoneyReceipt.updateOne({
				_id: foundMoneyReceipt._id
			}, {
				vch: oVoucher._id
			});
		}

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function unApprove(_id, body, foundVch, req) {
	try {

		let clientId = body.clientId;

		// Checking: does Money Receipt exists
		let foundMoneyReceipt = await MoneyReceipt.findOne({_id}, {vch: 1}).lean();

		if(!(foundMoneyReceipt && foundMoneyReceipt._id))
			throw new Error('No Money Receipt Found');


		if(foundMoneyReceipt.vch)
			await voucherService.removeVoucher({
				_id: foundMoneyReceipt.vch,
				clientId
			});

		await MoneyReceipt.findByIdAndUpdate(foundMoneyReceipt._id, {
			$unset: {
				'vch': 1
			}
		});

		if(foundVch)
			await logsService.add('Voucher', {
				uif: foundVch.refNo,
				category: 'delete',
				nData: {},
				oData: JSON.parse(JSON.stringify(foundVch)),
			}, req);


	}catch (e) {
		throw e;
	}
}

async function checkIsVoucherApproved(aId) {
	try {

		aId = Array.isArray(aId) ? aId : [aId];

		for(let k in aId){
			if(aId.hasOwnProperty(k)){
				let _id = aId[k];

				// Checking: does Money Receipt exists
				let foundMoneyReceipt = await MoneyReceipt.findOne({_id}, {vch: 1}).lean();

				if(!(foundMoneyReceipt && foundMoneyReceipt._id))
					throw new Error('No Money Receipt Found');

				let foundVoucher = await voucherService.findVoucherByIdAsync(foundMoneyReceipt.vch, {acImp: 1});

				if(foundVoucher && foundVoucher.acImp && foundVoucher.acImp.st)
					return true;
			}
		}

		return false;

	}catch (e) {
		throw e;
	}
}

function generateBillDeduction(aBill, aMrReceiving, body) {

	// this function modify bill receiving object on bill
	// params: aBill => all the bills, aMrReceiving => Mr receiving array

	// it iterate on mr receiving array and update respective deductions

	try{

		aMrReceiving.forEach(oMrReceiving => {

			let oBill = aBill.find(o => o._id.toString() === (oMrReceiving.billRef && oMrReceiving.billRef.toString()));

			if(!oBill)
				return;

			oBill.receiving = oBill.receiving || {};
			oBill.receiving.moneyReceipt = oBill.receiving.moneyReceipt || [];
			oBill.receiving.deduction = oBill.receiving.deduction || [];

			oMrReceiving.deduction = oMrReceiving.deduction || [];

			oMrReceiving.deduction.forEach(oMrDeduction => {

				let foundData = oBill.receiving.deduction.find(oDed => oDed.grRef ? (oDed.grRef.toString() === (oMrReceiving.grRef && oMrReceiving.grRef.toString()) && oDed.deductionType === oMrDeduction.type) : false);

				if(foundData){
					if(foundData.genFrom === 'mr'){
						if(foundData.mrRef && foundData.mrRef.toString() != body._id.toString())
							throw new Error(`Money Receipt No ${foundData.mrNo} is already using Deduction ${foundData.deductionType} on Bill No ${oBill.billNo} Gr Number ${foundData.grNumber}`);

						foundData.amount = oMrDeduction.amount;
						foundData.dedAccName = oMrDeduction.account ? oMrDeduction.account.name :oMrDeduction.dedAccName;
						foundData.deductionAccount = oMrDeduction.account ? oMrDeduction.account._id : oMrDeduction.deductionAccount;
						foundData.mrRef = body._id;
						foundData.mrNo = body.mrNo;
						foundData.isModified = true;
					}
				}else{
					oBill.receiving.deduction.push({
						mrRef: body._id,
						mrNo: body.mrNo,
						grRef: oMrReceiving.grRef,
						grNumber: oMrReceiving.grNumber,
						deductionType: oMrDeduction.type,
						amount: oMrDeduction.amount,
						dedAccName: oMrDeduction.account ? oMrDeduction.account.name : oMrDeduction.dedAccName,
						deductionAccount: oMrDeduction.account ? oMrDeduction.account._id : oMrDeduction.deductionAccount,
						genFrom: 'mr',
						isModified: true
					});
				}
			});
		});

		// it iterate on mr receiving array and update respective mr array
		aBill.forEach(oBill => {

			oBill.receiving = oBill.receiving || {};
			oBill.receiving.moneyReceipt = oBill.receiving.moneyReceipt || [];
			oBill.receiving.deduction = oBill.receiving.deduction || [];

			let foundBillMr = oBill.receiving.moneyReceipt.find(o => o.mrRef.toString() === body._id.toString());

			if(foundBillMr){
				foundBillMr.mrNo = body.mrNo;
				let oMrBillAmountWithoutDeduction = 0;
				foundBillMr.grs = aMrReceiving.filter(o => (o.billRef && o.billRef.toString()) === oBill._id.toString()).map(o => {
					oMrBillAmountWithoutDeduction += ((o.totReceived || 0) /*+ (o.tdsAmt || 0)+ (o.extraChargeAmt|| 0)*/);
					return {
						grRef: o.grRef,
						grNumber: o.grNumber,
						amount: o.totReceived,
						// tdsAmount: o.tdsAmt,
						// extChargeAmount: o.extraChargeAmt
					}
				});
				foundBillMr.amount = oMrBillAmountWithoutDeduction;
			}else{
				let oMrBillAmountWithoutDeduction = 0;
				oBill.receiving.moneyReceipt.push({
					mrRef: body._id,
					mrNo: body.mrNo,
					grs: aMrReceiving.filter(o => (o.billRef && o.billRef.toString()) === oBill._id.toString()).map(o => {
						oMrBillAmountWithoutDeduction += ((o.totReceived || 0) /*+ (o.tdsAmt || 0)+ (o.extraChargeAmt|| 0)*/);
						return {
							grRef: o.grRef,
							grNumber: o.grNumber,
							amount: o.totReceived,
							// tdsAmount: o.tdsAmt,
							// extChargeAmount: o.extraChargeAmt
						};
					}),
					amount: oMrBillAmountWithoutDeduction + (body.adjAmt || 0),
				});
			}

			oBill.receiving.deduction = oBill.receiving.deduction.reduce((arr, oDed) => {

				let allowedFlag = true;

				if(oDed.mrRef && oDed.mrRef.toString() === body._id.toString() && !oDed.isModified){
					if(oDed.cNoteRef){
						delete oDed.mrRef;
						delete oDed.mrNo;
					}else
						allowedFlag = false;
				}

				if(allowedFlag)
					arr.push(oDed);

				return arr;

			}, []);

			if(!Bill.billReceivingDeductionValidation(oBill.receiving.deduction))
				throw new Error(`Deduction Cannot be entered again. It already exist.`);

			// setting the mrRef on deduction which was appied on credit note but not on any gr. Because we don't want that deduction to be used on other credit note
			oBill.receiving.deduction.forEach(oDed => {
				if(!oDed.mrRef && !oDed.grRef && oDed.cNoteRef && oDed.genFrom == 'cn'){
					oDed.mrRef = body._id;
					oDed.mrNo = body.mrNo;
				}
			});
		});

		return true;

	}catch(e){
		throw e;
	}

}

function generateBillDeductionV2(aBill, aMrReceiving, body) {

	// this function modify bill receiving object on bill
	// params: aBill => all the bills, aMrReceiving => Mr receiving array

	// it iterate on mr receiving array and update respective deductions

	try{

		aMrReceiving.forEach(oMrReceiving => {

			let oBill = aBill.find(o => o._id.toString() === (oMrReceiving.billRef && oMrReceiving.billRef.toString()));

			if(!oBill)
				return;

			oBill.receiving = oBill.receiving || {};
			oBill.receiving.moneyReceipt = oBill.receiving.moneyReceipt || [];
			oBill.receiving.deduction = oBill.receiving.deduction || [];

			oMrReceiving.deduction = oMrReceiving.deduction || [];

			oMrReceiving.deduction.forEach(oMrDeduction => {

				let foundData = oBill.receiving.deduction.find(oDed => oDed.grRef ? (oDed.grRef.toString() === (oMrReceiving.grRef && oMrReceiving.grRef.toString()) && oDed.deductionType === oMrDeduction.type) : false);

				if(foundData){
					if(foundData.genFrom === 'mr'){
						if(foundData.mrRef && foundData.mrRef.toString() != body._id.toString())
							throw new Error(`Money Receipt No ${foundData.mrNo} is already using Deduction ${foundData.deductionType} on Bill No ${oBill.billNo} Gr Number ${foundData.grNumber}`);

						foundData.amount = oMrDeduction.amount;
						foundData.mrRef = body._id;
						foundData.mrNo = body.mrNo;
						foundData.isModified = true;
					}
				}else{
					oBill.receiving.deduction.push({
						mrRef: body._id,
						mrNo: body.mrNo,
						grRef: oMrReceiving.grRef,
						grNumber: oMrReceiving.grNumber,
						deductionType: oMrDeduction.type,
						amount: oMrDeduction.amount,
						genFrom: 'mr',
						isModified: true
					});
				}
			});
		});

		// it iterate on mr receiving array and update respective mr array
		aBill.forEach(oBill => {

			oBill.receiving = oBill.receiving || {};
			oBill.receiving.moneyReceipt = oBill.receiving.moneyReceipt || [];
			oBill.receiving.deduction = oBill.receiving.deduction || [];

			let foundBillMr = oBill.receiving.moneyReceipt.find(o => o.mrRef.toString() === body._id.toString());

			if(foundBillMr){
				foundBillMr.mrNo = body.mrNo;
				let oMrBillAmountWithoutDeduction = 0;
				foundBillMr.grs = [];
				body.billReceiving.filter(o => (o.billRef && o.billRef.toString()) === oBill._id.toString()).map(o => {
					oMrBillAmountWithoutDeduction += ((o.totReceived || 0) /*+ (o.tdsAmt || 0)+ (o.extraChargeAmt|| 0)*/);
					// return {
					// 	grRef: o.grRef,
					// 	grNumber: o.grNumber,
					// 	amount: o.totReceived,
					// 	// tdsAmount: o.tdsAmt,
					// 	// extChargeAmount: o.extraChargeAmt
					// }
				});
				foundBillMr.amount = oMrBillAmountWithoutDeduction;
			}else{
				let oMrBillAmountWithoutDeduction = 0;
				body.billReceiving.filter(o => (o.billRef && o.billRef.toString()) === oBill._id.toString()).map(o => {
					oMrBillAmountWithoutDeduction += ((o.totReceived || 0) /*+ (o.tdsAmt || 0)+ (o.extraChargeAmt|| 0)*/);
				});
				oBill.receiving.moneyReceipt.push({
					mrRef: body._id,
					mrNo: body.mrNo,
					grs: [],
					amount: oMrBillAmountWithoutDeduction + (body.adjAmt || 0),
				});
			}

			oBill.receiving.deduction = oBill.receiving.deduction.reduce((arr, oDed) => {

				let allowedFlag = true;

				if(oDed.mrRef && oDed.mrRef.toString() === body._id.toString() && !oDed.isModified){
					if(oDed.cNoteRef){
						delete oDed.mrRef;
						delete oDed.mrNo;
					}else
						allowedFlag = false;
				}

				if(allowedFlag)
					arr.push(oDed);

				return arr;

			}, []);

			if(!Bill.billReceivingDeductionValidation(oBill.receiving.deduction))
				throw new Error(`Deduction Cannot be entered again. It already exist.`);

			// setting the mrRef on deduction which was appied on credit note but not on any gr. Because we don't want that deduction to be used on other credit note
			oBill.receiving.deduction.forEach(oDed => {
				if(!oDed.mrRef && !oDed.grRef && oDed.cNoteRef && oDed.genFrom == 'cn'){
					oDed.mrRef = body._id;
					oDed.mrNo = body.mrNo;
				}
			});
		});

		return true;

	}catch(e){
		throw e;
	}

}

async function updateByBillDeduction(aId) {

	try {

		if(await checkIsActualVoucherGenerated(aId))
			throw new Error('Cannot Update Money Receipt because Voucher already generated');

		for(let k in aId){
			if(aId.hasOwnProperty(k)){
				let _id = aId[k];

				let foundMoneyReceipt = await MoneyReceipt.findById(_id);

				if(!(foundMoneyReceipt && foundMoneyReceipt._id))
					throw new Error('Money Receipt Not Found');

				let aFoundBill = await Bill.find({_id: otherUtil.arrString2ObjectId(foundMoneyReceipt.receiving.map(o => o.billRef))}).lean();

				if(!(aFoundBill && aFoundBill.length))
					throw new Error('Bills Not Found');

				for(let k in aFoundBill){
					if(aFoundBill.hasOwnProperty(k)){
						let foundBill = aFoundBill[k];

						foundBill.receiving = foundBill.receiving || {};
						foundBill.receiving.deduction = (foundBill.receiving.deduction || []).filter(o => o.mrRef && o.mrRef.toString() === foundMoneyReceipt._id.toString());

						foundBill.receiving.deduction.forEach(oDed => {

							let foundReceivingData = foundMoneyReceipt.receiving.find(o => o.grRef.toString() === oDed.grRef.toString());
							let foundReceivingDeductionData;

							if(foundReceivingData && (foundReceivingDeductionData= foundReceivingData.deduction.find(o => o.type === oDed.deductionType)))
								foundReceivingDeductionData.amount = oDed.amount;
						});
					}
				}

				updateMrAmount(foundMoneyReceipt);

				await MoneyReceipt.findByIdAndUpdate(foundMoneyReceipt._id, {
					$set: {
						'receiving': foundMoneyReceipt.receiving,
						'totBillReceiving': foundMoneyReceipt.totBillReceiving,
						'totBillDedReceiving': foundMoneyReceipt.totBillDedReceiving,
						'adviceAmount': foundMoneyReceipt.adviceAmount,
					}
				});
			}
		}
	}catch (e) {
		throw e;
	}
}

function updateMrAmount(foundMoneyReceipt) {

	let totBillReceiving = 0;
	let totBillDedReceiving = 0;
	let tdsAmt = 0;

	foundMoneyReceipt.receiving.forEach(o => {
		o.totalDeduction = o.deduction.reduce((a,b) => a+(b.amount || 0),0);
		totBillReceiving += (o.totReceived || 0);
		totBillDedReceiving += (o.totalDeduction || 0);
		tdsAmt += o.tdsAmt;
	});

	if(Array.isArray(foundMoneyReceipt.extCharges) && foundMoneyReceipt.extCharges.length){
		foundMoneyReceipt.totExtChargeAmount = foundMoneyReceipt.extCharges.reduce((amt, o) => amt + (o.amt || 0), 0);
	}

	if(Array.isArray(foundMoneyReceipt.extCharges2) && foundMoneyReceipt.extCharges2.length){
		foundMoneyReceipt.totExtChargeAmount2 = foundMoneyReceipt.extCharges2.reduce((amt, o) => amt + (o.amt || 0), 0);
	}

	if(tdsAmt)
		foundMoneyReceipt.totTdsAmount = tdsAmt;

	foundMoneyReceipt.totBillReceiving = totBillReceiving;
	foundMoneyReceipt.totBillDedReceiving = totBillDedReceiving;
	foundMoneyReceipt.adviceAmount = Math.round(foundMoneyReceipt.totBillReceiving * 100)/100 /*+ foundMoneyReceipt.totBillDedReceiving*/;
}

function updateMrAmountV2(foundMoneyReceipt) {

	let totBillReceiving = 0;
	let totBillDedReceiving = 0;
	let tdsAmt = 0;

	foundMoneyReceipt.receiving.forEach(o => {
		o.totalDeduction = o.deduction.reduce((a,b) => a+(b.amount || 0),0);
		// totBillReceiving += (o.totReceived || 0);
		totBillDedReceiving += (o.totalDeduction || 0);
		tdsAmt += o.tdsAmt;
	});

	foundMoneyReceipt.billReceiving.forEach(o => {
		totBillReceiving += (o.totReceived || 0);
	});

	if(Array.isArray(foundMoneyReceipt.extCharges) && foundMoneyReceipt.extCharges.length){
		foundMoneyReceipt.totExtChargeAmount = foundMoneyReceipt.extCharges.reduce((amt, o) => amt + (o.amt || 0), 0);
	}

	if(Array.isArray(foundMoneyReceipt.extCharges2) && foundMoneyReceipt.extCharges2.length){
		foundMoneyReceipt.totExtChargeAmount2 = foundMoneyReceipt.extCharges2.reduce((amt, o) => amt + (o.amt || 0), 0);
	}

	if(tdsAmt)
		foundMoneyReceipt.totTdsAmount = tdsAmt;

	foundMoneyReceipt.totBillReceiving = totBillReceiving;
	foundMoneyReceipt.totBillDedReceiving = totBillDedReceiving;
	foundMoneyReceipt.adviceAmount = Math.round(foundMoneyReceipt.totBillReceiving * 100)/100 /*+ foundMoneyReceipt.totBillDedReceiving*/;
}

async function pullVoucher(_id, req) {

	let clientId = req.user.clientId;
	let userName = req.user.full_name;

	try{

		let foundVch = await voucherService.findVoucherByIdAsync(_id);

		if(!(foundVch && foundVch._id))
			throw new Error('Voucher not found');

		if(foundVch.acImp.st)
			throw new Error('Voucher Cannot be pulled. Its Imported to A/c');

		let foundMr = await MoneyReceipt.findOne({
			mrNo: foundVch.refNo,
			clientId
		},{_id: 1}).lean();

		if(foundMr && foundMr._id){
			throw new Error('Money Receipt is already pulled');
		}

		let drAcc,
			drAccName,
			crAcc,
			crAccName;

		foundVch.ledgers.forEach(o => {
			if(o.cRdR === 'CR'){
				crAcc = o.account;
				crAccName = o.lName;
			}else if(o.cRdR === 'DR'){
				drAcc = o.account;
				drAccName = o.lName;
			}
		});

		// found billing with a/c
		let fBp = false;//\ await BillingParty.findOne({account: crAcc}, {name: 1}).lean();

		let oMr = {
			mrNo: foundVch.refNo,
			clientId,
			date: foundVch.date,
			createdBy: userName,
			lastModifiedBy: userName,
			narration: foundVch.narration,
			isVchAlGen: true,
			stationaryId: foundVch.stationaryId,
			branch: foundVch.branch,
			paymentMode: foundVch.paymentMode,
			paymentRef: foundVch.paymentRef,
			receiving: [],
			receivedAmount: foundVch.ledgers.reduce((amt, aLed) => {
				if(aLed.cRdR === 'DR')
					amt += (aLed.amount || 0);

				return amt;
			}, 0),

			//	A/c's and Voucher's
			bpAccNam: crAccName, // Billing Party Account Name
			bpAcc: crAcc,
			bankAccountName: drAccName,
			bankAccount: drAcc,
			vch: foundVch._id,
			pulledVchClone: JSON.stringify(foundVch)
		};

		if(fBp && fBp._id){
			oMr.billingParty = fBp._id;
			oMr.bpNam = fBp.name;
		}

		await MoneyReceipt.create(oMr);

		await voucherService.editVoucher({
			_id: foundVch._id,
			isEditable: false
		})

	}catch (e) {
		throw e;
	}
}

async function mrDeduction(reqBody, next) {
	try {

		let oPFil = constructFilters(reqBody);
		const aggrQuery = [
			{$match: oPFil},
			{$sort: {_id: -1}},
			{$limit:20000},
			{
				"$match": {
					"clientId": "10808",
				}
			},
			{
				"$sort": {
					"_id": -1
				}
			},
			{
				"$unwind": {
					"path": "$receiving",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "tripgrs",
					"localField": "receiving.grRef",     //receiving = mr
					"foreignField": "_id",
					"as": "grData"
				}
			},
			{
				"$unwind": {
					"path": "$grData",
					"preserveNullAndEmptyArrays": true
				}
			},
//     {
//     "$lookup": {
//       "from": "tripv2",
//       "localField": "grData.trip",     //receiving = mr
//       "foreignField": "_id",
//       "as": "vendDeal"
//     }
//   },
//   {
//     "$unwind": {
//       "path": "$vendDeal",
//       "preserveNullAndEmptyArrays": true
//     }
//   },
//   {
//       "$match":{
//           "vendDeal.segment_type": "Market"
//       }
//   },
			{
				"$unwind": {
					"path": "$receiving.deduction",
					"preserveNullAndEmptyArrays": true
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
				"$unwind": {
					"path": "$billingParty",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "bills",
					"localField": "receiving.billRef",
					"foreignField": "_id",
					"as": "billData"
				}
			},
			{
				"$unwind": {
					"path": "$billData",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$unwind": {
					"path": "$billData.items",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "tripgrs",
					"localField": "billData.items.gr",
					"foreignField": "_id",
					"as": "billGrData"   //TripGR data
				}
			},
			{
				"$unwind": {
					"path": "$billGrData",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "tripv2",
					"localField": "grData.trip",
					"foreignField": "_id",
					"as": "tripData"
				}
			},
			{
				"$unwind": {
					"path": "$tripData",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "drivers",
					"localField": "tripData.driver",
					"foreignField": "_id",
					"as": "driverData"
				}
			},
			{
				"$unwind": {
					"path": "$driverData",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "consignor_consignees",
					"localField": "grData.consignor",
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
				"$unwind": {
					"path": "$grData.invoices",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "consignor_consignees",
					"localField": "grData.consignee",
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
				"$lookup": {
					"from": "registeredvehicles",
					"localField": "tripData.vehicle",
					"foreignField": "_id",
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
				"$lookup": {
					"from": "customers",
					"localField": "billingParty.customer",
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
				"$unwind": {
					"path": "$grData.creditNote",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "creditnotes",
					"localField": "grData.creditNote",
					"foreignField": "_id",
					"as": "creditNoteData"
				}
			},
			{
				"$unwind": {
					"path": "$creditNoteData",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$unwind": {
					"path": "$creditNoteData.grs",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$project": {
					"customer": "$customer.name",
					"consignee": "$consignee.name",//done
					"consignor": "$consignor.name",//done
					"adviceDate": "$date",//done
					"adviceNo": "$mrNo",//done
					"cnDate": "$grData.grDate",//done
					"cnNo": "$grData.grNumber",//done
					"LR_Total_Freight": "$grData.totalFreight", //done
					"billDate": "$billData.billDate",//done
					"BillNo": "$billData.billNo",//done
					"CreditNoteNO": "$creditNoteData.creditNo",
					"CreditNoteDate": "$creditNoteData.date",
					"CreditNoteDedType": "$creditNoteData.grs.deductionType",
					"CreditNoteDedAmt": "$creditNoteData.amount",
					"AdvicePartyName": "$billingParty.name",//done
					"CN_Route_Source_Name": "$grData.acknowledge.source",//done
					"CN_Route_Destination_Name": "$grData.acknowledge.destination",//done
					"CrossingVehicleNo": "$vehicleData.transShipment.vehicle_no",
					"ChargedWeight": "$grData.invoices.billingWeightPerUnit",//done
					"CN_VEHICLE_OWNER" : "$vehicleData.transShipment.driver_name",
					"CN_VEHICLE_NO": "$grData.vehicle_no",//done
					"OwnerName": "$vehicleData.owner_name",//done
					"InvoiceNo": "$grData.invoices.invoiceNo",//done
					"PartyRef1": "$grData.invoices.ref1",//done
					"PartyRef2": "$grData.invoices.ref2",
					"PartyRef3": "$grData.invoices.ref3",
					"PartyRef4": "$grData.invoices.ref4",
					"PartyRef5": "$grData.invoices.ref5",
					"NatureOfDeduction": "$receiving.deduction.type",//done
					"DeductionAmount": "$receiving.deduction.amount",//done
					"ReachingDate": "$grData.pod.unloadingArrivalTime",//done
					"UnloadingDate": "$grData.pod.billingUnloadingTime",//done
					"Detention1": "$grData.charges.detentionLoading",
					"Detention2": "$grData.charges.detentionUnloading",  //done
					"CN_Remark": "$grData.remarks", //done
					"DedDOE": "$date",  //done
					"DriverName": "$driverData.name",//done
					"LD_Cal1": "$grData.grDate",//done
					"LD_Cal2": "$grData.pod.loadingArrivalTime",       //done
					"DTN_Cal1": "$grData.pod.unloadingArrivalTime", //done
					"DTN_Cal2": "$grData.pod.billingUnloadingTime", //done
					"HM_NO": "$tripData.vendorDeal.loading_slip", //done
					"HM_Amount": "$tripData.vendorDeal.totWithMunshiyana",// done
					"HMBasicHireChrg": "$tripData.vendorDeal.total_expense", //done
					"NetBalance": "$tripData.vendorDeal.toPay", //done
					"HM_PaidAmount1": "$tripData.vendorDeal.totalDeal",
					//   "HM_PaidAmount2": "$tripData.tAdv",
					"HM_Penalty": "$tripData.vendorDeal.deduction.penalty_deduction",
					"HM_Claim": "$tripData.vendorDeal.deduction.damage_deduction",
					"HM_OtherDeduction": "$tripData.vendorDeal.deduction.other_deduction",
					"BrokerName": "$vehicleData.owner_name"//done
				}
			}
		];
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
		let getData = await serverSidePage.requestData(MoneyReceipt, oQuery);
		return getData;
	}catch(e){
		console.log('error => ', e);
		throw e;
	}
};

async function mrBillingPartyWiseDeductionReport(reqBody, next) {
	try {

		let oPFil = constructFilters(reqBody);
		const aggrQuery = [
			{$match: oPFil},
			{$sort: {_id: -1}},
			{
				"$unwind": "$receiving"
			},
			{
				"$unwind": "$receiving.deduction"
			},
			{
				"$project": {
					"bpNam": 1,
					"type" : "$receiving.deduction.type",
					"amount": "$receiving.deduction.amount"
				}
			},
			{
				"$group": {
					"_id": {party: "$bpNam", type: "$type"},

					amount: { "$sum": "$amount"}
				}
			},
			{
				"$group":{
					"_id": "$_id.party",
					"data" : {
						"$push" : "$$ROOT"
					}
				}
			}

		];
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
		let getData = await serverSidePage.requestData(MoneyReceipt, oQuery);
		return getData;
	}catch(e){
		console.log('error => ', e);
		throw e;
	}
};

async function mrMonthlyDeductionReport(reqBody, next) {
	try {

		let oPFil = constructFilters(reqBody);
		const aggrQuery = [
			{$match: oPFil},
			{$sort: {_id: -1}},
			{
				"$unwind": "$receiving"
			},
			{
				"$unwind": "$receiving.deduction"
			} ,
			{
				"$project": {
					"date":1,
					"bpNam": 1,
					"type" : "$receiving.deduction.type",
					"amount": "$receiving.deduction.amount"
				}
			},
			{
				"$group": {
					"_id": {party: "$bpNam",
						"month": {
							"$month" : "$date"
						},
						"year" : {
							"$year": "$date"
						}
					},
					amount: { "$sum": "$amount"}
				}
			},
			{
				"$project":{
					"party" : "$_id.party",
					"month" : "$_id.month",
					"year" : "$_id.year",
					"amount" : "$amount"
				}
			},
			// {
			// 	"$group":{
			// 		"_id": "$party",
			// 		"data" : {
			// 			"$push" : "$$ROOT"
			// 		}
			// 	}
			// }

		];
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
		let aFoundData = await serverSidePage.requestData(MoneyReceipt, oQuery);
		let massagedData = {};
		aFoundData.forEach(oData => {
			massagedData[oData.party] = massagedData[oData.party] || {};
			massagedData[oData.party].name = oData.party;
			let monthYear = moment().month(oData.month - 1).year(oData.year).format('MM-YYYY');
			massagedData[oData.party][monthYear] = massagedData[oData.party][monthYear] || {};
			massagedData[oData.party][monthYear].amount = oData.amount;
			// massagedData[oData._id][monthYear].overdueSum = oData.overdueSum;
			// massagedData[oData.party][monthYear].amount += oData.amount;
			// massagedData[oData._id][monthYear].overdueSum += oData.overdueSum;
		});
		return Object.values(massagedData);

	}catch(e){
		console.log('error => ', e);
		throw e;
	}
};
