const PurchaseBill = commonUtil.getModel('purchaseBill');
const PurchaseBillService = commonUtil.getService('bills');
const billStationaryService = commonUtil.getService('billStationary');
const DebitNote = commonUtil.getModel('debitNote');
const Account = commonUtil.getModel('accounts');
const voucherService = commonUtil.getService('voucher');
const Vendor = commonUtil.getModel('vendorTransport');

const ALLOWED_FILTER =['_id', 'debitNo','purBillRef', 'vendor','voucher','clientId', 'vendorName', 'purBillNo', 'date', 'start_date', 'end_date','purBillRefNo'];
const ALLOWED_KEY_TO_UPDATE =['debitNo',  'date', 'branch', 'amount', 'cGST', 'sGST', 'iGST', 'cGSTPercent', 'sGSTPercent', 'iGSTPercent', 'totalAmount', 'billingParty',
	'lastModifiedBy'];

module.exports = {
	add,
	edit,
	find,
	remove,
	isActualVchGen: checkIsActualVoucherGenerated,
	isVchGen: checkIsVoucherApproved,
	unApprove,
	approve,
};

function constructFilters(oQuery) {
	let oFilter={};

	for(i in oQuery){
		if(otherUtil.isAllowedFilter(i, ALLOWED_FILTER)){
			if (i === 'from_date') {
				let startDate = new Date (oQuery[i]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				oFilter[oQuery.dateType || "created_at"] = oFilter[oQuery.dateType || "created_at"] || {};
				oFilter[oQuery.dateType || "created_at"].$gte = startDate;
			} else if (i === 'to_date') {
				let endDate = new Date (oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				oFilter[oQuery.dateType || "created_at"] = oFilter[oQuery.dateType || "created_at"] || {};
				oFilter[oQuery.dateType || "created_at"].$lte = endDate;
			} else if (i === 'start_date') {
				let startDate = new Date (oQuery[i]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				oFilter[oQuery.dateType || "date"] = oFilter[oQuery.dateType || "date"] || {};
				oFilter[oQuery.dateType || "date"].$gte = startDate;
			} else if (i === 'end_date') {
				let endDate = new Date (oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				oFilter[oQuery.dateType || "date"] = oFilter[oQuery.dateType || "date"] || {};
				oFilter[oQuery.dateType || "date"].$lte = endDate;
			} else if(i === 'vendor') {
				oFilter[i] = otherUtil.arrString2ObjectId(oQuery[i])
			}else if(i === '_id') {
				oFilter[i] = {
					$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
				};
			}else {
				oFilter[i] = oQuery[i];
			}

		}
	}
	return oFilter;
}

async function find(body, user, type, req) {

	try{

		if(!body.download)
			body.no_of_docs = body.no_of_docs || 10;
		else
			body.no_of_docs	= 1000;

		if(!body.sort)
			body.sort = {date:-1};

		let oFilter = constructFilters(body);
		oFilter.clientId = user.clientId;

		body.skip = body.skip || 1;
		body.populate = body.populate || [];
        console.log(oFilter);
		const debitNoteQuery = [
			{ $match: oFilter },

			{ $sort: body.sort || {_id: -1} },
			{ $skip: (body.no_of_docs * body.skip) - body.no_of_docs },
			{ $limit: body.no_of_docs },

			{ $lookup: { from: 'accounts', localField: 'cGSTAccount', foreignField: '_id', as: 'cGSTAccount' } },
			{ $unwind: { path: '$cGSTAccount', preserveNullAndEmptyArrays: true } },

			{ $lookup: { from: 'accounts', localField: 'sGSTAccount', foreignField: '_id', as: 'sGSTAccount' } },
			{ $unwind: { path: '$sGSTAccount', preserveNullAndEmptyArrays: true } },

			{ $lookup: { from: 'accounts', localField: 'iGSTAccount', foreignField: '_id', as: 'iGSTAccount' } },
			{ $unwind: { path: '$iGSTAccount', preserveNullAndEmptyArrays: true } }
		];

		if(body.populate.indexOf('branch')+1)
			debitNoteQuery.push(
				{ $lookup: { from: 'branches', localField: 'branch', foreignField: '_id', as: 'branch' } },
				{ $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } }
			);
		if(body.populate.indexOf('vendor')+1)
		debitNoteQuery.push(
			{ $lookup: { from: 'vendortransports', localField: 'vendor', foreignField: '_id', as: 'vendor' } },
			{ $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } }
		);
		if(body.populate.indexOf('purBillRef')+1)
		debitNoteQuery.push(
			{ $lookup: { from: 'purchasebills', localField: 'purBillRef', foreignField: '_id', as: 'purBillRef' } },
			{ $unwind: { path: '$purBillRef', preserveNullAndEmptyArrays: true } }
		);
		if(type === 'template'){
			debitNoteQuery.push(
				{
					$lookup:{
						from : "vouchers",
						"localField" : "voucher",
						"foreignField" :"_id",
						"as": "voucher"
					}
				},
				{
					"$unwind": {
						"path": "$voucher",
						"preserveNullAndEmptyArrays": true
					}

				},
			)
		}
		const debitNoteData = await DebitNote
			.aggregate(debitNoteQuery)
			.allowDiskUse(true);

		// if(body.populate.indexOf('billRef')+1 && debitNoteData.length && debitNoteData.length==1){
		// 	let foundbill = await billService.getAllBillsAggr({
		// 		_id: creditNoteData[0].billRef,
		// 		populate: ['consignee']
		// 	});
		//
		// 	if(foundbill.data && foundbill.data.length){
		// 		creditNoteData[0].billRef = foundbill.data[0];
		// 	}
		// }

		return { data: debitNoteData };

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function add(body, req) {

	try {

		let foundBill = await PurchaseBill.findOne({_id: otherUtil.arrString2ObjectId(body.purBillRef)})
			.populate({path: 'vendor', select: 'name'});

		if(!(foundBill && foundBill._id))
			throw new Error('Purchase Bill Not Found');

		body.vendor = foundBill.vendor;
		body.vendorName = foundBill.vendor.name;
		let saveDebitNote = await (new DebitNote(body)).save();
		let id = saveDebitNote._id;

		if(id){
			await PurchaseBill.findByIdAndUpdate(foundBill._id, {
				$set: {
					'deduction': saveDebitNote.items,
					"debitNo":saveDebitNote.debitNo,
					"dNoteRef":id,
					debitAmount:saveDebitNote.totalAmount,
					remainingAmount: foundBill.billAmount - saveDebitNote.totalAmount,
				}
			});
		}

		if(body.debitStationaryId){
			await billStationaryService.updateStatus({
				userName: body.createdBy,
				docId: id,
				modelName: 'DebitNote',
				stationaryId: body.debitStationaryId,
			}, 'used');
		}

		if(body.approve)
			await approve(req, id, body);

		return saveDebitNote;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function edit(req, body) {

	try {
		let _id = req.params._id;

		let foundDebitNoteNote = await DebitNote.findOne({_id}).lean();

		if(!(foundDebitNoteNote && foundDebitNoteNote._id))
			throw new Error('No Debit Note Found');

		let foundBill = await PurchaseBill.findOne({_id: otherUtil.arrString2ObjectId(foundDebitNoteNote.purBillRef)}).lean();

		if(!(foundBill && foundBill._id))
			throw new Error('Purchase Bill Not Found');

		if(foundDebitNoteNote.debitNo != body.debitNo && foundDebitNoteNote.debitStationaryId){
			await billStationaryService.updateStatus({
				userName: body.lastModifiedBy,
				docId: _id,
				modelName: 'DebitNote',
				stationaryId: foundDebitNoteNote.debitStationaryId,
			}, 'cancelled');
		}

		let DebitNoteBody = otherUtil.pickPropertyFromObject(body, ALLOWED_KEY_TO_UPDATE);

		let oUpdateDebitNote = await DebitNote.findOneAndUpdate({_id: otherUtil.arrString2ObjectId(_id)}, {
			$set: DebitNoteBody
		}, {new: true});

		if(_id){

			await PurchaseBill.findByIdAndUpdate(foundBill._id, {
				$set: {
					'deduction': body.items,
					debitAmount: body.totalAmount,
					remainingAmount: foundBill.billAmount - body.totalAmount,
				}
			});
		}

		if(foundDebitNoteNote.debitNo != body.debitNo && body.debitStationaryId){
			await billStationaryService.updateStatus({
				userName: body.lastModifiedBy,
				docId: _id,
				modelName: 'DebitNote',
				stationaryId: body.debitStationaryId,
			}, 'used');
		}
		if(body.approve)
			await approve(req, _id, body);

		return oUpdateDebitNote;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

// TODO fix remove
async function remove(_id, body) {

	try {

		let foundDebitNote = await DebitNote.findOne({_id: otherUtil.arrString2ObjectId(_id)}).lean();

		if(!(foundDebitNote && foundDebitNote._id))
			throw new Error('No Debit Note Found');

		let foundBill = await PurchaseBill.findOne({_id: foundDebitNote.purBillRef}).lean();

		if(!(foundBill && foundBill._id))
			throw new Error('Bill Not Found');

		if(foundDebitNote.debitStationaryId){
			await billStationaryService.updateStatus({
				userName: body.userName,
				docId: _id,
				modelName: 'DebitNote',
				stationaryId: foundDebitNote.debitStationaryId,
			}, 'cancelled');
		}

		// foundBill.receiving = foundBill.receiving;
		// foundBill.receiving.deduction = foundBill.receiving.deduction || [];

		await PurchaseBill.findByIdAndUpdate(foundBill._id, {
			$unset: {
				'deduction': 1,
				'purBillNo':1,
				'purBillRefNo':1,
				'purBillRef':1

			}
		});

		await DebitNote.remove({_id: otherUtil.arrString2ObjectId(_id)});

		return true;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function approve(req, _id, body) {

	let userName = body.createdBy;
	let clientId = body.clientId;
	let foundDebitNote;

	try {

		// Checking: does debit note exists
		foundDebitNote = await DebitNote.findOne({_id}).lean();

		if(!(foundDebitNote && foundDebitNote._id))
			throw new Error('No Debit Note Found');

		let oVoucher;

		let fdBill = await PurchaseBill.findOne({_id: foundDebitNote.purBillRef}, {acknowledge: 1,deduction:1}).lean();

		if(!(fdBill && fdBill._id))
			throw new Error('Bill not Found');

		if(fdBill.deduction && fdBill.deduction.length)
			oVoucher = await genNormalVoucher(foundDebitNote);

		let vType = req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.debitNote && req.clientConfig.config.debitNote.vType;
		if(vType)
			oVoucher.type = vType;

		if(foundDebitNote.voucher){
			oVoucher._id = foundDebitNote.voucher;
			await voucherService.editVoucher(oVoucher);
		}else{
			oVoucher._id = mongoose.Types.ObjectId();
			await voucherService.addVoucherAsync(oVoucher);

			await DebitNote.findByIdAndUpdate(foundDebitNote._id, {
				$set: {
					voucher: oVoucher._id
				}
			});
		}

		return true;

	}catch (e) {
		console.log(e);
		throw e;
	}
	// it takes the Credit Note Object and generate the Normal voucher,
	// Normal i.e. it contain transaction form Billing Party to Sales A/c
	async function genNormalVoucher(foundDebitNote) {
		try {

			// Checking: does billing party Exists
			let foundVendor = await Vendor.findOne({_id: foundDebitNote.vendor}, {account: 1}).lean();

			if(!(foundVendor && foundVendor._id))
				throw new Error('No Vendor Data Found');

			// Checking: is withhold account linked with billing party
			let vendorAccount = foundVendor.account && foundVendor.account[0] && foundVendor.account[0].ref;

			if(!vendorAccount)
				throw new Error('No With Hold Account linked with Billing Party');

			let aLedger = [],
				crBills = [],
				drAmount = 0;

			let oVoucher = {
				type: "Journal",
				date: foundDebitNote.date,
				clientId,
				narration: foundDebitNote.narration,
				refNo: foundDebitNote.debitNo,
				vT: 'Debit Note',
				trackPayAs: 'purchaseBill',
				isEditable: false,
				createdBy: userName,
			};

			// cGST Ledger
			if(foundDebitNote.cGST){
				if(!foundDebitNote.cGSTAccount)
					throw new Error(`CGST A/c Not Found`);

				drAmount += foundDebitNote.cGST;
				aLedger.push({
					account: foundDebitNote.cGSTAccount,
					lName: (await Account.findOne({_id: foundDebitNote.cGSTAccount}, {name: 1})).name,
					amount: foundDebitNote.cGST,
					cRdR: 'CR',
					bills: [{
						billNo:  foundDebitNote.purBillNo,
						billType: 'New Ref',
						amount: foundDebitNote.cGST,
						remAmt: foundDebitNote.cGST
					}]
				});
			}

			// sGST Ledger
			if(foundDebitNote.sGST){
				if(!foundDebitNote.sGSTAccount)
					throw new Error(`SGST A/c Not Found`);

				drAmount += foundDebitNote.sGST;
				aLedger.push({
					account: foundDebitNote.sGSTAccount,
					lName: (await Account.findOne({_id: foundDebitNote.sGSTAccount}, {name: 1})).name,
					amount: foundDebitNote.sGST,
					cRdR: 'CR',
					bills: [{
						billNo:  foundDebitNote.purBillNo,
						billType: 'New Ref',
						amount: foundDebitNote.sGST,
						remAmt: foundDebitNote.sGST
					}]
				});
			}

			// iGST Ledger
			if(foundDebitNote.iGST){
				if(!foundDebitNote.iGSTAccount)
					throw new Error(`IGST A/c Not Found`);

				drAmount += foundDebitNote.iGST;
				aLedger.push({
					account: foundDebitNote.iGSTAccount,
					lName: (await Account.findOne({_id: foundDebitNote.iGSTAccount}, {name: 1})).name,
					amount: foundDebitNote.iGST,
					cRdR: 'CR',
					bills: [{
						billNo:  foundDebitNote.purBillNo,
						billType: 'New Ref',
						amount: foundDebitNote.iGST,
						remAmt: foundDebitNote.iGST
					}]
				});
			}

			// deduction Ledger
			for(let k in foundDebitNote.items){
				let  oItem = foundDebitNote.items[k];
				if(oItem.amount){
					let amount = (oItem.amount * 100) / (100 + (foundDebitNote.cGSTPercent || 0) + (foundDebitNote.sGSTPercent || 0) + (foundDebitNote.iGSTPercent || 0));
					// amount = Math.round(amount * 100)/100 || 0;
					drAmount += amount;
					aLedger.push({
						account: oItem.deductionAccount,
						lName: (await Account.findOne({_id: oItem.deductionAccount}, {name: 1})).name,
						amount: amount,
						cRdR: 'CR'
						/*
						bills: [{
							billNo:  constant.dedCharges[oGr.deductionType] + '-' + foundCreditNote.billNo,
							billType: 'Against Ref',
							amount: amount,
							remAmt: amount
						}]*/
					});

					crBills.push({
						billNo:  foundDebitNote.purBillNo,
						billType: 'Against Ref',
						amount: foundDebitNote.totalAmount,
						remAmt: foundDebitNote.totalAmount
					});
				}
			}

			// CR Ledger
			aLedger.push({
				account: vendorAccount,
				lName: (await Account.findOne({_id: vendorAccount}, {name: 1})).name,
				amount: foundDebitNote.totalAmount,
				cRdR: 'DR',
				bills: crBills
			});

			oVoucher.ledgers = aLedger;

			return oVoucher;

		}catch (e) {
			throw e;
		}
	}
}

async function unApprove(_id, body) {
	try {

		let clientId = body.clientId;

		// Checking: does credit note exists
		let foundDebitNote = await DebitNote.findOne({_id}, {voucher:1}).lean();

		if(!(foundDebitNote && foundDebitNote._id))
			throw new Error('No Debit Note Found');

		if(foundDebitNote.voucher)
			await voucherService.removeVoucher({
				_id: foundDebitNote.voucher,
				clientId
			});

		await DebitNote.findByIdAndUpdate(foundDebitNote._id, {
			$unset: {
				'voucher': 1
			}
		})

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

				// Checking: does credit note exists
				let foundDebitNote = await DebitNote.findOne({_id}, {
					voucher: 1
				}).lean();

				if(!(foundDebitNote && foundDebitNote._id))
					throw new Error('No Debit Note Found');

				if(foundDebitNote.voucher)
					return true;
			}
		}

		return false;

	}catch (e) {
		throw e;
	}

}

async function checkIsActualVoucherGenerated(aId) {

	// checking is Actual Voucher is generated for any Plain Voucher in Credit Note
	// Below Code test for "voucher" keys Only.

	try{

		aId = Array.isArray(aId) ? aId : [aId];

		for(let k in aId){
			if(aId.hasOwnProperty(k)){
				let _id = aId[k];

				// Checking: does credit note exists
				let foundDebitNote = await DebitNote.findOne({_id}, {voucher: 1}).lean();

				if(!(foundDebitNote && foundDebitNote._id))
					throw new Error('No Debit Note Found');

				let foundVoucher;

				foundVoucher = await voucherService.findVoucherByIdAsync(foundDebitNote.voucher, {acImp: 1});
				if(foundVoucher && foundVoucher.acImp && foundVoucher.acImp.st)
					return true;
			}
		}

		return false;

	}catch (e) {
		throw e;
	}
}

