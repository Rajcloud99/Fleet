const Account = commonUtil.getModel('accounts');
const Bill = commonUtil.getModel('bills');
const BillingParty = commonUtil.getModel('billingparty');
const billService = commonUtil.getService('bills');
const billStationaryService = commonUtil.getService('billStationary');
const CreditNote = commonUtil.getModel('creditNote');
const GR = commonUtil.getModel('tripGr');
const moneyReceiptService = commonUtil.getService('moneyReceipt');
const voucherService = commonUtil.getService('voucher');
const serverSidePage = require('../../utils/serverSidePagination');

const ALLOWED_FILTER =['_id', 'creditNo', 'voucher','clientId', 'billNo', 'billRef', 'billingParty', 'refNo', 'date', 'start_date', 'end_date'];
const ALLOWED_KEY_TO_UPDATE =['creditNo', 'refNo', 'date', 'grs', 'branch', 'amount', 'cGST', 'sGST', 'iGST', 'cGSTPercent', 'sGSTPercent', 'iGSTPercent', 'totalAmount', 'billingParty',
	'lastModifiedBy', 'genRevVch'];

module.exports = {
	add,
	approve,
	deductionReport,
	edit,
	find,
	isActualVchGen: checkIsActualVoucherGenerated,
	isVchGen: checkIsVoucherApproved,
	remove,
	unApprove,
	updateByBillDeduction,
	crDeduction,
	addMisc,
	editMisc,
	deleteMisc,
	miscVouchApprove
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
			} else if(i === '_id') {
				oFilter[i] = {
					$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
				};
			} else if(i === 'billingParty') {
				oFilter[i] = otherUtil.arrString2ObjectId(oQuery[i]);
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

		const creditNoteQuery = [
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

		if((body.populate.indexOf('billingParty')+1) || type === 'template' )
			creditNoteQuery.push(
				{ $lookup: { from: 'billingparties', localField: 'billingParty', foreignField: '_id', as: 'billingParty' } },
				{ $unwind: { path: '$billingParty', preserveNullAndEmptyArrays: true } }
			);

		if(body.populate.indexOf('branch')+1)
			creditNoteQuery.push(
				{ $lookup: { from: 'branches', localField: 'branch', foreignField: '_id', as: 'branch' } },
				{ $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } }
			);
		if(type === 'template'){
			creditNoteQuery.push(
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
		const creditNoteData = await CreditNote
			.aggregate(creditNoteQuery)
			.allowDiskUse(true);

		if(body.populate.indexOf('billRef')+1 && creditNoteData.length && creditNoteData.length==1){
			let foundbill = await billService.getAllBillsAggr({
				_id: creditNoteData[0].billRef,
				populate: ['consignee']
			});

			if(foundbill.data && foundbill.data.length){
				creditNoteData[0].billRef = foundbill.data[0];
			}
		}

		return { data: creditNoteData };

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function add(body, req) {

	try {

		let foundBill = await Bill.findOne({_id: otherUtil.arrString2ObjectId(body.billRef)}).lean();

		if(!(foundBill && foundBill._id))
			throw new Error('Bill Not Found');

		if(!foundBill.acknowledge.status)
			throw new Error('Bill is Not Acknowledged');

		validateCategory(body.category, foundBill);

		if(['Full', 'Full(Gr Reversal)'].indexOf(body.category) != -1)
			await reverseBill(foundBill, body, req);

		body.grs = body.grs || [];
		body._id = mongoose.Types.ObjectId();

		let billDeduction = generateBillDeduction(foundBill, body.grs, body);

		let savedCreditNote = await (new CreditNote(body)).save();
		savedCreditNote.grs = savedCreditNote.grs || [];
		let id = savedCreditNote._id;
		let grIds = savedCreditNote.grs.map(o => o.grRef);

		if(id){

			let billSet = {
				deduction: billDeduction,
				moneyReceipt: foundBill.receiving && foundBill.receiving.moneyReceipt || []
			};

			await Bill.findByIdAndUpdate(foundBill._id, {
				$set: {
					'receiving': billSet
				}
			});

			// let mrToUpdate = billDeduction.reduce((arrSet, oBillDed) => {
            //
			// 	if(oBillDed.mrRef && oBillDed.cNoteRef && oBillDed.cNoteRef.toString() === body._id.toString())
			// 		arrSet.add(oBillDed.mrRef.toString());
            //
			// 	return arrSet;
            //
			// }, new Set());
            //
			// if(mrToUpdate.size)
			// 	await moneyReceiptService.updateByBillDeduction([...mrToUpdate]);

			if(grIds.length)
				await GR.updateMany({
					_id: grIds
				}, {
					$addToSet: {
						"creditNote": id
					}
				});
		}

		if(body.creditStationaryId){
			await billStationaryService.updateStatus({
				userName: body.createdBy,
				docId: id,
				modelName: 'CreditNote',
				stationaryId: body.creditStationaryId,
			}, 'used');
		}

		// if approve key is defined then create the plain Voucher
		if(body.approve)
			await approve(req, body._id, body);

		return savedCreditNote;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function addMisc(body, req) {

	try {

		let foundBill = await Bill.findOne({_id: otherUtil.arrString2ObjectId(body.billRef)}).lean();

		if(!(foundBill && foundBill._id))
			throw new Error('Bill Not Found');

		if(!foundBill.acknowledge.status)
			throw new Error('Bill is Not Acknowledged');

		validateCategory(body.category, foundBill);

		if(['Full', 'Full(Gr Reversal)'].indexOf(body.category) != -1)
			await reverseBill(foundBill, body, req);

		body.grs = body.grs || [];
		body._id = mongoose.Types.ObjectId();

		let billDeduction = generateBillDeduction(foundBill, body.grs, body);

		let savedCreditNote = await (new CreditNote(body)).save();
		savedCreditNote.grs = savedCreditNote.grs || [];
		let id = savedCreditNote._id;
		let grIds = savedCreditNote.grs.map(o => o.grRef);

		if(id){

			let billSet = {
				deduction: billDeduction,
				moneyReceipt: foundBill.receiving && foundBill.receiving.moneyReceipt || []
			};

			await Bill.findByIdAndUpdate(foundBill._id, {
				$set: {
					'receiving': billSet
				}
			});

			// let mrToUpdate = billDeduction.reduce((arrSet, oBillDed) => {
            //
			// 	if(oBillDed.mrRef && oBillDed.cNoteRef && oBillDed.cNoteRef.toString() === body._id.toString())
			// 		arrSet.add(oBillDed.mrRef.toString());
            //
			// 	return arrSet;
            //
			// }, new Set());
            //
			// if(mrToUpdate.size)
			// 	await moneyReceiptService.updateByBillDeduction([...mrToUpdate]);

			if(grIds.length)
				await GR.updateMany({
					_id: grIds
				}, {
					$addToSet: {
						"creditNote": id
					}
				});
		}

		if(body.creditStationaryId){
			await billStationaryService.updateStatus({
				userName: body.createdBy,
				docId: id,
				modelName: 'CreditNote',
				stationaryId: body.creditStationaryId,
			}, 'used');
		}

		// if approve key is defined then create the plain Voucher
		if(body.approve)
			await approve(req, body._id, body);

		return savedCreditNote;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function edit(req, body) {

	try {
		let _id = req.params._id;

		let foundCreditNote = await CreditNote.findOne({_id}).lean();

		if(!(foundCreditNote && foundCreditNote._id))
			throw new Error('No Credit Note Found');

		if(body.category != foundCreditNote.category)
			throw new Error('Credit Note category Cannot be Changed');

		let foundBill = await Bill.findOne({_id: otherUtil.arrString2ObjectId(foundCreditNote.billRef)}).lean();

		if(!(foundBill && foundBill._id))
			throw new Error('Bill Not Found');

		if(['Full', 'Full(Gr Reversal)'].indexOf(body.category)+1){
			body.category === 'Full(Gr Reversal)' && await relinkFreedGr(body.grs.map(oGrs => oGrs.grRef), foundBill);
			await reverseBill(foundBill, body, {});
		}

		let grsToUnset = [];
		foundCreditNote.grs = foundCreditNote.grs || [];
		body.grs = body.grs || [];

		foundCreditNote.grs.forEach(oGr => {
			if(oGr.grRef && body.grs.findIndex(o => o.grRef === oGr.grRef.toString()) === -1)
				grsToUnset.push(oGr.grRef);
		});

		// remove the credit note id from gr if gr id is not found on editing
		if(grsToUnset.length)
			await GR.updateMany({_id: {$in: grsToUnset}}, {$pull: {creditNote: otherUtil.arrString2ObjectId(_id)}});

		if(foundCreditNote.creditNo != body.creditNo && foundCreditNote.creditStationaryId){
			await billStationaryService.updateStatus({
				userName: body.lastModifiedBy,
				docId: _id,
				modelName: 'CreditNote',
				stationaryId: foundCreditNote.creditStationaryId,
			}, 'cancelled');
		}

		let billDeduction = generateBillDeduction(foundBill, body.grs, foundCreditNote);

		let creditNoteBody = otherUtil.pickPropertyFromObject(body, ALLOWED_KEY_TO_UPDATE);

		let oUpdatedCreditNote = await CreditNote.findOneAndUpdate({_id: otherUtil.arrString2ObjectId(_id)}, {
			$set: creditNoteBody
		}, {new: true});

		let grIds = oUpdatedCreditNote.grs.map(o => o.grRef);

		if(_id){

			let billSet = {
				deduction: billDeduction,
				moneyReceipt: foundBill.receiving && foundBill.receiving.moneyReceipt || []
			};

			await Bill.findByIdAndUpdate(foundBill._id, {
				$set: {
					'receiving': billSet
				}
			});

			// let mrToUpdate = billDeduction.reduce((arrSet, oBillDed) => {
            //
			// 	if(oBillDed.mrRef && oBillDed.cNoteRef && oBillDed.cNoteRef.toString() === _id.toString())
			// 		arrSet.add(oBillDed.mrRef.toString());
            //
			// 	return arrSet;
            //
			// }, new Set());
            //
			// if(mrToUpdate.size)
			// 	await moneyReceiptService.updateByBillDeduction([...mrToUpdate]);

			await GR.updateMany({
				_id: grIds
			}, {
				$addToSet: {
					"creditNote": _id
				}
			});
		}

		if(foundCreditNote.creditNo != body.creditNo && body.creditStationaryId){
			await billStationaryService.updateStatus({
				userName: body.lastModifiedBy,
				docId: _id,
				modelName: 'CreditNote',
				stationaryId: body.creditStationaryId,
			}, 'used');
		}

		// if approve key is defined then create the plain Voucher
		if(body.approve)
			await approve(req, _id, body);

		return oUpdatedCreditNote;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

function validateCategory(category, billObj) {

	try{

		if(category == 'Full' && billObj.receiving && billObj.receiving.moneyReceipt && billObj.receiving.moneyReceipt.length)
			throw new Error('Money is Received on the Bill. So, Credit Note Category Cannot be put as Full');
		else
			return true;

	}catch (e) {
		throw e;
	}
}

async function reverseBill(oBill, body, req) {

	try{
		if(oBill.acknowledge.status){

			let aBillItems = [];

			if(body.category === 'Full'){
				aBillItems = oBill.items;
			}else if(body.category === 'Full(Gr Reversal)'){
				aBillItems = oBill.items.filter(o => {
					if(Array.isArray(body.grs) && body.grs.find(oGr => (oGr.grRef && oGr.grRef.toString()) === (o.gr && o.gr.toString())))
						return true;
					return false;
				});
			}

			for(let i in aBillItems){
				let oItem = aBillItems[i];
				let oQuery = {};

				if(oBill.type === "Supplementary Bill"){

					oQuery['$pull'] = oQuery['$pull'] || {};
					oQuery['$pull']['supplementaryBillRef']= oBill._id;
					oQuery['$pull']['selectedSupply'] = {
						$in: oItem.selectedSupply
					};

				}else if(oBill.type === "Provisional Bill"){
					// isProvBillGen
					// if(body.category === 'Full'){
					// 	oQuery['$unset'] = oQuery['$unset'] || {};
					// 	oQuery['$unset'].provisionalBill = 1;
					// }else if(body.category === 'Full(Gr Reversal)'){
					//
					// }
					oQuery['$set'] = oQuery['$set'] || {};
					oQuery['$set']['isProvBillGen'] = false;
					oQuery['$pull'] = oQuery['$pull'] || {};
					oQuery['$pull']['provisionalBill']= {
						ref: oBill._id
					};
				}else if(oBill.type === "Actual Bill"){
					oQuery['$unset'] = oQuery['$unset'] || {};
					oQuery['$unset'].bill = 1;
				}

				if(Object.keys(oQuery).length && oItem.gr)
					await GR.findOneAndUpdate({_id: oItem.gr}, {
						...oQuery
					});
			}

			let billItem = false;

			if(body.category === 'Full'){
				billItem = oBill.items.map(o => {
					let obj = {...o};
					delete obj.gr;
					return obj;
				});
			}else if(body.category === 'Full(Gr Reversal)'){
				billItem = oBill.items.map(o => {
					let obj = {...o};
					if(body.grs.find(oGr => oGr.grRef.toString() === (o.gr && o.gr.toString())))
						delete obj.gr;
					return obj;
				});
			}

			billItem && await Bill.updateMany({_id: oBill._id},{
				$set: {
					'items': billItem
				}
			});

			// Bill.updateMany({_id: oBill._id},{$unset: {'items.$[].gr': 1 }}
			return true;

		}
	}catch (e) {
		throw e;
	}

}

function generateBillDeduction(oBill, aDed, body) {

	try{

		oBill.receiving = oBill.receiving || {};
		oBill.receiving.deduction = oBill.receiving.deduction || [];

		// In case creditNote.category is any one these ['Full(Gr Reversal)', 'Full'] then the deduction is existing deduciton is modified and new deductions are pushed
		// deduction type and account isn't provided. because entrie amount is reversed.
		if(['Full(Gr Reversal)', 'Full'].indexOf(body.category) != -1){
			oBill.receiving.deduction = oBill.receiving.deduction.filter(o => o.cNoteRef.toString() != body._id.toString());
			oBill.receiving.deduction.push(...aDed.map(o => ({
				cNoteRef: body._id,
				creditNo: body.creditNo,
				amount: o.amount,
				grRef: o.grRef,
				grNumber: o.grNumber,
				dedAccName: o.account ? o.account.name : o.dedAccName,
				deductionAccount: o.account ? o.account._id : o.deductionAccount,
				genFrom: 'cn'
			})));

			return oBill.receiving.deduction;
		}

		//Below case is only for creditNote.category === "Partial"

		// Here we have to check that the same deduction shouldn't be applied on it because of Money Receipt deduction.
		aDed.forEach(oDed => {
			let foundData = oBill.receiving.deduction.find(oRecDed => (oRecDed.grRef && oDed.grRef) ? oDed.grRef.toString() === oRecDed.grRef.toString() && oDed.deductionType === oRecDed.deductionType : oDed.deductionType === oRecDed.deductionType);

			if(foundData){ // modifying existing deduction of same credit note
				if(foundData.genFrom === 'mr' && foundData.amount != oDed.amount)
					throw new Error(`Amount Cannot be modified for Deduction ${foundData.deductionType}, its generated from Money Receipt ${foundData.mrNo}`);

				if(foundData.cNoteRef && foundData.cNoteRef.toString() != body._id.toString())
					throw new Error(`Credit Note No ${foundData.creditNo} is already using Deduction ${foundData.deductionType} on Bill No ${oBill.billNo} Gr Number ${foundData.grNumber}`);

				foundData.amount = oDed.amount;
				foundData.dedAccName = oDed.account ? oDed.account.name : oDed.dedAccName;
				foundData.deductionAccount = oDed.account ? oDed.account._id : oDed.deductionAccount;

				foundData.cNoteRef = body._id;
				foundData.creditNo = body.creditNo;
				foundData.isModified = true;
			}else{
				oBill.receiving.deduction.push({
					cNoteRef: body._id,
					creditNo: body.creditNo,
					grRef: oDed.grRef,
					grNumber: oDed.grNumber,
					deductionType: oDed.deductionType,
					amount: oDed.amount,
					dedAccName: oDed.account ? oDed.account.name : oDed.dedAccName,
					deductionAccount: oDed.account ? oDed.account._id : oDed.deductionAccount,
					genFrom: 'cn',
					isModified: true
				});
			}
		});

		// In case any deduction is deleted for current Credit Note then modify the "oBill.receiving.deduction"
		oBill.receiving.deduction = oBill.receiving.deduction.reduce((arr, oReceiving) => {

			let allowedFlag = true;

			if(oReceiving.cNoteRef && oReceiving.cNoteRef.toString() === body._id.toString() && !oReceiving.isModified){
				if(oReceiving.mrRef){
					delete oReceiving.cNoteRef;
					delete oReceiving.creditNo;
				}else
					allowedFlag = false;
			}

			if(allowedFlag)
				arr.push(oReceiving);

			return arr;

		}, []);

		if(!Bill.billReceivingDeductionValidation(oBill.receiving.deduction))
			throw new Error(`Deduction Cannot be entered again. It already exist.`);

		return oBill.receiving.deduction;

	}catch(e){
		throw e;
	}

}

// TODO fix remove
async function remove(_id, body) {

	try {

		let foundCreditNote = await CreditNote.findOne({_id: otherUtil.arrString2ObjectId(_id)}).lean();

		if(!(foundCreditNote && foundCreditNote._id))
			throw new Error('No Credit Note Found');

		let foundBill = await Bill.findOne({_id: foundCreditNote.billRef}).lean();

		if(!(foundBill && foundBill._id))
			throw new Error('Bill Not Found');

		if(['Full(Gr Reversal)', 'Full'].indexOf(foundCreditNote.category)+1){
			let aGr = foundCreditNote.grs.length && foundCreditNote.grs.map(oGr => oGr.grRef) || foundBill.items.map(oItem => oItem.gr && oItem.gr._id || oItem.grData.grId);
			aGr.length && await isGrFreeToLinkBack(aGr, foundBill);
			aGr.length && await relinkFreedGr(aGr, foundBill);
		}

		let grsToUnset = foundCreditNote.grs.map(oGr => oGr.grRef);

		// remove the credit note id from gr if gr id is not found on editing
		if(grsToUnset.length)
			await GR.updateMany({_id: {$in: grsToUnset}}, {$pull: {creditNote: _id}});

		if(foundCreditNote.creditStationaryId){
			await billStationaryService.updateStatus({
				userName: body.userName,
				docId: _id,
				modelName: 'CreditNote',
				stationaryId: foundCreditNote.creditStationaryId,
			}, 'cancelled');
		}

		foundBill.receiving = foundBill.receiving;
		foundBill.receiving.deduction = foundBill.receiving.deduction || [];

		let updatedDeduction = foundBill.receiving.deduction.reduce((arr, oDed) => {

			let allowedFlag = true;

			if(oDed.cNoteRef && oDed.cNoteRef.toString() === foundCreditNote._id.toString()){

				if(oDed.mrRef){
					delete oDed.cNoteRef;
					delete oDed.creditNo;
				}else
					allowedFlag = false;
			}

			if(allowedFlag)
				arr.push(oDed);

			return arr;
		}, []);


		let billSet = {
			deduction: updatedDeduction,
			moneyReceipt: foundBill.receiving && foundBill.receiving.moneyReceipt || []
		};

		await Bill.findByIdAndUpdate(foundBill._id, {
			$set: {
				'receiving': billSet
			}
		});

		await CreditNote.remove({_id: otherUtil.arrString2ObjectId(_id)});

		return true;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function approve(req, _id, body) {

	let userName = body.createdBy;
	let clientId = body.clientId;
	let foundCreditNote;

	try {

		// Checking: does credit note exists
		foundCreditNote = await CreditNote.findOne({_id}).lean();

		foundCreditNote.genRevVch = !!foundCreditNote.genRevVch;

		if(!(foundCreditNote && foundCreditNote._id))
			throw new Error('No Credit Note Found');

		let oVoucher;

		if(foundCreditNote.genRevVch || ['Full', 'Full(Gr Reversal)'].indexOf(foundCreditNote.category) != -1){

			oVoucher = await genReverseVoucher(foundCreditNote);

		}else{

			let fdBill = await Bill.findOne({_id: foundCreditNote.billRef}, {acknowledge: 1}).lean();

			if(!(fdBill && fdBill._id))
				throw new Error('Bill not Found');

			if(fdBill.receiving && fdBill.receiving.moneyReceipt && fdBill.receiving.moneyReceipt.length){
				oVoucher = await genReverseVoucher(foundCreditNote);
			}else
				oVoucher = await genNormalVoucher(foundCreditNote);

		}

		let vType = req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.creditNote && req.clientConfig.config.creditNote.vType;
		if(vType)
			oVoucher.type = vType;

		if(foundCreditNote.voucher){
			oVoucher._id = foundCreditNote.voucher;
			await voucherService.editVoucher(oVoucher);
		}else{
			oVoucher._id = mongoose.Types.ObjectId();
			await voucherService.addVoucherAsync(oVoucher);

			await CreditNote.findByIdAndUpdate(foundCreditNote._id, {
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

	// it takes the Credit Note Object and generate the Reverse voucher,
	// Revers i.e. it contain transaction form Billing Party With hold A/c to Deduction A/c
	async function genReverseVoucher(foundCreditNote) {
		try {

			let fdBill = await Bill.findOne({_id: foundCreditNote.billRef}, {acknowledge: 1, adjDebitAc:1}).lean();

			if(!(fdBill && fdBill._id))
				throw new Error('Bill not Found');

			let fdVch = await voucherService.findVoucherByIdAsync(fdBill.acknowledge.voucher);

			fdVch = JSON.parse(JSON.stringify(fdVch));

			let aledgers = [];

			if(fdVch.ledgers && fdVch.ledgers.length)
			fdVch.ledgers.forEach(o => {
				if (o.cRdR === 'DR') {
					o.cRdR = 'CR';
					if(['Full'].indexOf(foundCreditNote.category) != -1 && o.account === (fdBill.adjDebitAc && fdBill.adjDebitAc.toString())){
						if (o.bills && o.bills.length === 1) {
							o.bills[0].billType = 'Against Ref';
						}
					}else {
						o.amount = foundCreditNote.totalAmount;
						if (o.bills && o.bills.length === 1) {
							o.bills[0].billType = 'Against Ref';
							o.bills[0].amount = foundCreditNote.totalAmount;
						}
					}
				} else {
					if (o.account === (fdBill.acknowledge.salesAccount && fdBill.acknowledge.salesAccount.toString())) {
						o.amount = foundCreditNote.amount;
					} else if (o.account === (fdBill.acknowledge.iGSTAccount && fdBill.acknowledge.iGSTAccount.toString())) {
						o.amount = foundCreditNote.iGST;
					} else if (o.account === (fdBill.acknowledge.cGSTAccount && fdBill.acknowledge.cGSTAccount.toString())) {
						o.amount = foundCreditNote.cGST;
					} else if (o.account === (fdBill.acknowledge.sGSTAccount && fdBill.acknowledge.sGSTAccount.toString())) {
						o.amount = foundCreditNote.sGST;
					} else if(['Full'].indexOf(foundCreditNote.category) != -1 && o.account === (fdBill.adjDebitAc && fdBill.adjDebitAc.toString())) {
						if (o.bills && o.bills.length === 1) {
							o.bills[0].billType = 'Against Ref';
						}
					}

					o.cRdR = 'DR';
					o.bills = [];
				}

				if(['Partial'].indexOf(foundCreditNote.category) != -1 && o.account === (fdBill.adjDebitAc && fdBill.adjDebitAc.toString())){

				}else{
					aledgers.push(o);
				}

			})

			return {
				type: "Journal",
				date: foundCreditNote.date,
				clientId,
				narration: foundCreditNote.narration || '',
				refNo: foundCreditNote.creditNo,
				vT: 'Credit Note',
				trackPayAs: 'bill',
				isEditable: false,
				createdBy: userName,
				ledgers: aledgers,
			};

		}catch (e) {
			throw e;
		}
	}

	// it takes the Credit Note Object and generate the Normal voucher,
	// Normal i.e. it contain transaction form Billing Party to Sales A/c
	async function genNormalVoucher(foundCreditNote) {
		try {

			// Checking: does billing party Exists
			let foundBillingParty = await BillingParty.findOne({_id: foundCreditNote.billingParty}, {withHoldAccount: 1}).lean();

			if(!(foundBillingParty && foundBillingParty._id))
				throw new Error('No Billing Party Found');

			// Checking: is withhold account linked with billing party
			let billingPartyWithHoldAccount = foundBillingParty.withHoldAccount;

			if(!billingPartyWithHoldAccount)
				throw new Error('No With Hold Account linked with Billing Party');

			let aLedger = [],
				crBills = [],
				crAmount = 0;

			let oVoucher = {
				type: "Journal",
				date: foundCreditNote.date,
				clientId,
				narration: foundCreditNote.narration,
				refNo: foundCreditNote.creditNo,
				vT: 'Credit Note',
				trackPayAs: 'bill',
				isEditable: false,
				createdBy: userName,
			};

			// cGST Ledger
			if(foundCreditNote.cGST){
				if(!foundCreditNote.cGSTAccount)
					throw new Error(`CGST A/c Not Found`);

				crAmount += foundCreditNote.cGST;
				aLedger.push({
					account: foundCreditNote.cGSTAccount,
					lName: (await Account.findOne({_id: foundCreditNote.cGSTAccount}, {name: 1})).name,
					amount: foundCreditNote.cGST,
					cRdR: 'DR',
					bills: [{
						billNo:  foundCreditNote.billNo,
						billType: 'New Ref',
						amount: foundCreditNote.cGST,
						remAmt: foundCreditNote.cGST
					}]
				});
			}

			// sGST Ledger
			if(foundCreditNote.sGST){
				if(!foundCreditNote.sGSTAccount)
					throw new Error(`SGST A/c Not Found`);

				crAmount += foundCreditNote.sGST;
				aLedger.push({
					account: foundCreditNote.sGSTAccount,
					lName: (await Account.findOne({_id: foundCreditNote.sGSTAccount}, {name: 1})).name,
					amount: foundCreditNote.sGST,
					cRdR: 'DR',
					bills: [{
						billNo:  foundCreditNote.billNo,
						billType: 'New Ref',
						amount: foundCreditNote.sGST,
						remAmt: foundCreditNote.sGST
					}]
				});
			}

			// iGST Ledger
			if(foundCreditNote.iGST){
				if(!foundCreditNote.iGSTAccount)
					throw new Error(`IGST A/c Not Found`);

				crAmount += foundCreditNote.iGST;
				aLedger.push({
					account: foundCreditNote.iGSTAccount,
					lName: (await Account.findOne({_id: foundCreditNote.iGSTAccount}, {name: 1})).name,
					amount: foundCreditNote.iGST,
					cRdR: 'DR',
					bills: [{
						billNo:  foundCreditNote.billNo,
						billType: 'New Ref',
						amount: foundCreditNote.iGST,
						remAmt: foundCreditNote.iGST
					}]
				});
			}

			// deduction Ledger
			for(let k in foundCreditNote.grs){
				let  oGr = foundCreditNote.grs[k];
				if(oGr.amount){
					let amount = (oGr.amount * 100) / (100 + (foundCreditNote.cGSTPercent || 0) + (foundCreditNote.sGSTPercent || 0) + (foundCreditNote.iGSTPercent || 0));
					// amount = Math.round(amount * 100)/100 || 0;
					crAmount += amount;
					aLedger.push({
						account: oGr.deductionAccount,
						lName: (await Account.findOne({_id: oGr.deductionAccount}, {name: 1})).name,
						amount: amount,
						cRdR: 'DR'
						/*
						bills: [{
							billNo:  constant.dedCharges[oGr.deductionType] + '-' + foundCreditNote.billNo,
							billType: 'Against Ref',
							amount: amount,
							remAmt: amount
						}]*/
					});

					crBills.push({
						billNo:  constant.dedCharges[oGr.deductionType] + '-' + foundCreditNote.billNo,
						billType: 'Against Ref',
						amount: oGr.amount,
						remAmt: oGr.amount
					});
				}
			}

			// CR Ledger
			aLedger.push({
				account: billingPartyWithHoldAccount,
				lName: (await Account.findOne({_id: billingPartyWithHoldAccount}, {name: 1})).name,
				amount: foundCreditNote.totalAmount,
				cRdR: 'CR',
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
		let foundCreditNote = await CreditNote.findOne({_id}, {voucher:1}).lean();

		if(!(foundCreditNote && foundCreditNote._id))
			throw new Error('No Credit Note Found');

		if(foundCreditNote.voucher)
			await voucherService.removeVoucher({
				_id: foundCreditNote.voucher,
				clientId
			});

		await CreditNote.findByIdAndUpdate(foundCreditNote._id, {
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
				let foundCreditNote = await CreditNote.findOne({_id}, {
					voucher: 1
				}).lean();

				if(!(foundCreditNote && foundCreditNote._id))
					throw new Error('No Credit Note Found');

				if(foundCreditNote.voucher)
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
				let foundCreditNote = await CreditNote.findOne({_id}, {voucher: 1}).lean();

				if(!(foundCreditNote && foundCreditNote._id))
					throw new Error('No Credit Note Found');

				let foundVoucher;

				foundVoucher = await voucherService.findVoucherByIdAsync(foundCreditNote.voucher, {acImp: 1});
				if(foundVoucher && foundVoucher.acImp && foundVoucher.acImp.st)
					return true;
			}
		}

		return false;

	}catch (e) {
		throw e;
	}
}

async function updateByBillDeduction(aId) {

	try {

		if(await checkIsVoucherApproved(aId))
			throw new Error('Cannot Update Credit Note because Voucher already generated');

		for(let k in aId){
			if(aId.hasOwnProperty(k)){
				let _id = aId[k];

				let foundCreditNote = await CreditNote.findOne({_id}, {billRef: 1, grs: 1}).lean();

				if(!(foundCreditNote && foundCreditNote._id))
					throw new Error('Credit Note Not Found');

				let foundBill = await Bill.findOne({_id: foundCreditNote.billRef}, {receiving: 1}).lean();

				if(!(foundBill && foundBill._id))
					throw new Error('Bill Not Found');

				foundBill.receiving = foundBill.receiving || {};
				foundBill.receiving.deduction = foundBill.receiving.deduction || [];
				let updatedGrs = foundCreditNote.grs || [];

				foundBill.receiving.deduction.filter(o => o.cNoteRef && o.cNoteRef.toString() === foundCreditNote._id.toString()).forEach(oBillDed => {
					updatedGrs.forEach(oGr => {
						if(oGr.grRef.toString() === oBillDed.grRef.toString() && oGr.deductionType === oBillDed.deductionType){
							oGr.amount = oBillDed.amount;
						}
					});
				});

				await CreditNote.findByIdAndUpdate(foundCreditNote._id, {
					$set: {
						'grs': updatedGrs
					}
				});
			}
		}
	}catch (e) {
		throw e;
	}

}

async function isGrFreeToLinkBack(aGr, oBill) {
	try {

		if(!(Array.isArray(aGr) && aGr.length))
			throw new Error("Mandatory Fields are required");

		if(!(oBill && oBill._id))
			throw new Error("Mandatory Fields are required");

		for(let gr of aGr){

			let fdItem = oBill.items.find(oItem => !oItem.gr && oItem.grData.grId.toString() === (gr && gr.toString()));

			if(!fdItem)
				continue;

			switch (oBill.type) {
				case "Supplementary Bill":{

					let fdGr = await GR.findOne({
						_id: gr,
						'selectedSupply': {
							$in: fdItem.selectedSupply
						}
					}, {_id: 1});

					if(fdGr)
						throw new Error(`Reverting Bill Failed. Bill has been generated for Supplementary charges`);
					break;
				}
				case "Provisional Bill":{
					let fdGr = await GR.findOne({
						_id: gr
					}, {provisionalBill: 1, totalFreight: 1}).lean();

					if(!fdGr)
						throw new Error('Gr Not found for reverting');

					let totPercent = fdGr.provisionalBill.reduce((acc,cur) => acc + cur.percent, 0);

					if(totPercent >= 100)
						throw new Error('Reverting Bill Failed. Bill has been generated for some or all freed Gr\'s');

					break;
				}
				case "Actual Bill":{
					let fdGr = await GR.findOne({
						_id: gr,
						bill: {$exists: true}
					}, {_id: 1, grNumber: 1}).lean();

					if(fdGr)
						throw new Error(`Reverting Bill Failed. Bill has been generated for Gr Number: ${fdGr.grNumber}`);
					break;
				}
			}
		}

		return true;

	}catch (e) {
		throw e;
	}
}

async function relinkFreedGr(aGr, oBill) {
	try {

		if(!(Array.isArray(aGr) && aGr.length))
			throw new Error("Mandatory Fields are required");

		if(!(oBill && oBill._id))
			throw new Error("Mandatory Fields are required");

		for(let gr of aGr){
			let fdItem = oBill.items.find(oItem => !oItem.gr && oItem.grData.grId.toString() === gr.toString());

			if(!fdItem)
				continue;

			fdItem.gr = gr;
			switch (oBill.type) {
				case "Supplementary Bill":{

					await GR.updateOne({
						_id: gr,
					}, {
						$addToSet: {
							supplementaryBillRef: oBill._id,
							selectedSupply: {$each: fdItem.selectedSupply}
						}
					});
					break;
				}
				case "Provisional Bill":{

					let fdGr = await GR.findOne({
						_id: gr
					}, {provisionalBill: 1,totalFreight: 1}).lean();

					let totPercent = fdGr.provisionalBill.reduce((acc,cur) => acc + cur.percent, 0);
					let percent = (fdItem.totFreight * 100)/fdGr.totalFreight;

					let query = {
						$addToSet: {
							provisionalBill: {
								ref: oBill._id,
								percent,
							}
						}
					};

					if(totPercent + percent == 100)
						query['$set'] = {
							isProvBillGen: true
						};

					Object.keys(query || {}).length && await GR.updateOne({
						_id: gr
					}, query);

					break;
				}
				case "Actual Bill":{
					let fdGr = await GR.updateOne({
						_id: gr
					}, {
						$set: {
							bill: oBill._id
						}
					});

					break;
				}
			}
		}

		await Bill.updateOne({
			_id: oBill._id
		},{
			$set:{
				items: oBill.items
			}
		});

		return true;

	}catch (e) {
		throw e;
	}
}

async function deductionReport(body, req) {
	try{

		let oFilter = {
			category: 'Partial',
			clientId: req.user.clientId,
			...constructFiltersForDeductionReport(body)
		};

		let aggrQuery = [
			{$match: oFilter},
			{$project: {
					creditNo: 1,
					clientId: 1,
					billingParty: 1,
					my: {$dateToString: {
							date: '$date',
							format: "%m-%Y",
							timezone: 'Asia/Kolkata'
						}},
					grs: {
						deductionType: 1,
						dedAccName: 1,
						amount: 1
					}
				}},
			{
				$unwind: {
					path: "$grs",
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$group: {
					_id: {
						bp: '$billingParty',
						name: '$grs.deductionType',
						my: '$my'
					},
					sum: {$sum: '$grs.amount'},
					// cn: {$push: '$creditNo'}
				}
			},
			{
				$group: {
					_id: {
						bp: '$_id.bp',
						name: '$_id.name',
					},
					my: {$push: {
							k: '$_id.my',
							v: '$sum',
						}},
				}
			},
			{$addFields: {
					keyVal: { $arrayToObject: "$my" }
				}},
			{
				$group: {
					_id: {
						bp: '$_id.bp',
					},
					aDed: {$push: {
							name: '$_id.name',
							month: '$keyVal'
						}},
					// cn: {$push: '$cn'}
				}
			},
			{$sort: {'_id.bp': 1}},
			{
				$lookup: {
					from: "billingparties",
					localField: "_id.bp",
					foreignField: "_id",
					as: "bp"
				}
			},
			{
				$unwind: {
					path: '$bp',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$project: {
					_id: 0,
					bp: '$bp.name',
					aDed: 1
				}
			}
		];

		let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
		let aData = await serverSidePage.requestData(CreditNote, oQuery);

		return aData;
	}catch (e) {
		console.log('error => ', e);
		throw e;
	}

	function constructFiltersForDeductionReport(oQuery) {
		let oFilter={};

		for(let i in oQuery){
			if(oQuery.hasOwnProperty(i) && otherUtil.isAllowedFilter(i, ['billingParty', 'start_date', 'end_date'])){
				if (i === 'start_date') {
					let startDate = new Date (oQuery[i]);
					startDate.setSeconds (0);
					startDate.setHours (0);
					startDate.setMinutes (0);
					oFilter["date"] = oFilter["date"] || {};
					oFilter["date"].$gte = startDate;
				} else if (i === 'end_date') {
					let endDate = new Date (oQuery[i]);
					endDate.setSeconds(59);
					endDate.setHours (23);
					endDate.setMinutes (59);
					oFilter["date"] = oFilter["date"] || {};
					oFilter["date"].$lte = endDate;
				} else if(i === '_id') {
					oFilter[i] = {
						$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
					};
				} else if(i === 'billingParty') {
					oFilter[i] = otherUtil.arrString2ObjectId(oQuery[i]);
				} else {
					oFilter[i] = oQuery[i];
				}
			}
		}
		return oFilter;
	}

}

async function crDeduction(reqBody, next) {
	try {
		let oPFil = constructFilters(reqBody);
		const aggrQuery = [
			{$match: oPFil},
			{$sort: {_id: -1}},
			{
				"$unwind": "$grs"
			},
			{
				"$project": {
					"creditNo": 1,
					"grs.grNumber": 1,
					"billNo": 1,
					"date": 1,
					"grs.deductionType": 1,
					"grs.amount": 1,
					"grs.remark": 1,

				}
			}
		];
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
		let getData = await serverSidePage.requestData(CreditNote, oQuery);
		return getData;
	}catch(e){
		console.log('error => ', e);
		throw e;
	}
};

async function addMisc(body, req) {

	try {

		body.grs = body.grs || [];
		body._id = mongoose.Types.ObjectId();

		let savedCreditNote = await (new CreditNote(body)).save();
		savedCreditNote.grs = savedCreditNote.grs || [];
		let id = savedCreditNote._id;


		if(body.creditStationaryId){
			await billStationaryService.updateStatus({
				userName: body.createdBy,
				docId: id,
				modelName: 'CreditNote',
				stationaryId: body.creditStationaryId,
			}, 'used');
		}

		if(body.approve)
			await miscVouchApprove(body._id, body);

		return savedCreditNote;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function editMisc(_id, body) {

	try {

		let foundCreditNote = await CreditNote.findOne({_id}).lean();

		if(!(foundCreditNote && foundCreditNote._id))
			throw new Error('No Credit Note Found');

		if(body.category != foundCreditNote.category)
			throw new Error('Credit Note category Cannot be Changed');


		if(foundCreditNote.creditNo != body.creditNo && foundCreditNote.creditStationaryId){
			await billStationaryService.updateStatus({
				userName: body.lastModifiedBy,
				docId: _id,
				modelName: 'CreditNote',
				stationaryId: foundCreditNote.creditStationaryId,
			}, 'cancelled');
		}

		let creditNoteBody = otherUtil.pickPropertyFromObject(body, ALLOWED_KEY_TO_UPDATE);

		let oUpdatedCreditNote = await CreditNote.findOneAndUpdate({_id: otherUtil.arrString2ObjectId(_id)}, {
			$set: creditNoteBody
		}, {new: true});

		if(foundCreditNote.creditNo != body.creditNo && body.creditStationaryId){
			await billStationaryService.updateStatus({
				userName: body.lastModifiedBy,
				docId: _id,
				modelName: 'CreditNote',
				stationaryId: body.creditStationaryId,
			}, 'used');
		}

		// if approve key is defined then create the plain Voucher
		if(body.approve)
			await miscVouchApprove(_id, body);

		return oUpdatedCreditNote;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function deleteMisc(_id, body) {

	try {

		let foundCreditNote = await CreditNote.findOne({_id: otherUtil.arrString2ObjectId(_id)}).lean();

		if(!(foundCreditNote && foundCreditNote._id))
			throw new Error('No Credit Note Found');


		if(foundCreditNote.creditStationaryId){
			await billStationaryService.updateStatus({
				userName: body.userName,
				docId: _id,
				modelName: 'CreditNote',
				stationaryId: foundCreditNote.creditStationaryId,
			}, 'cancelled');
		}

		await CreditNote.remove({_id: otherUtil.arrString2ObjectId(_id)});

		return true;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function miscVouchApprove(_id, body) {

	let userName = body.createdBy;
	let clientId = body.clientId;
	let foundCreditNote;

	try {

		// Checking: does credit note exists
		foundCreditNote = await CreditNote.findOne({_id}).lean();

		if(!(foundCreditNote && foundCreditNote._id))
			throw new Error('No Credit Note Found');

		let oVoucher;

		oVoucher = await genNormalVoucher(foundCreditNote);

		if(foundCreditNote.voucher){
			oVoucher._id = foundCreditNote.voucher;
			await voucherService.editVoucher(oVoucher);
		}else{
			oVoucher._id = mongoose.Types.ObjectId();
			await voucherService.addVoucherAsync(oVoucher);

			await CreditNote.findByIdAndUpdate(foundCreditNote._id, {
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
	async function genNormalVoucher(foundCreditNote) {
		try {

			// Checking: does billing party Exists
			let foundBillingParty = await BillingParty.findOne({_id: foundCreditNote.billingParty}, {withHoldAccount: 1}).lean();

			if(!(foundBillingParty && foundBillingParty._id))
				throw new Error('No Billing Party Found');

			// Checking: is withhold account linked with billing party
			let billingPartyWithHoldAccount = foundBillingParty.withHoldAccount;

			if(!billingPartyWithHoldAccount)
				throw new Error('No With Hold Account linked with Billing Party');

			let aLedger = [],
				crBills = [],
				crAmount = 0;

			let oVoucher = {
				type: "Journal",
				date: foundCreditNote.date,
				clientId,
				narration: foundCreditNote.narration,
				refNo: foundCreditNote.creditNo,
				branch: foundCreditNote.branch,
				vT: 'Credit Note',
				trackPayAs: 'bill',
				isEditable: false,
				createdBy: userName,
			};

			// cGST Ledger
			if(foundCreditNote.cGST){
				if(!foundCreditNote.cGSTAccount)
					throw new Error(`CGST A/c Not Found`);

				aLedger.push({
					account: foundCreditNote.cGSTAccount,
					lName: (await Account.findOne({_id: foundCreditNote.cGSTAccount}, {name: 1})).name,
					amount: foundCreditNote.cGST,
					cRdR: 'DR',
					bills: []
				});
			}

			// sGST Ledger
			if(foundCreditNote.sGST){
				if(!foundCreditNote.sGSTAccount)
					throw new Error(`SGST A/c Not Found`);

				aLedger.push({
					account: foundCreditNote.sGSTAccount,
					lName: (await Account.findOne({_id: foundCreditNote.sGSTAccount}, {name: 1})).name,
					amount: foundCreditNote.sGST,
					cRdR: 'DR',
					bills: []
				});
			}

			// iGST Ledger
			if(foundCreditNote.iGST){
				if(!foundCreditNote.iGSTAccount)
					throw new Error(`IGST A/c Not Found`);

				aLedger.push({
					account: foundCreditNote.iGSTAccount,
					lName: (await Account.findOne({_id: foundCreditNote.iGSTAccount}, {name: 1})).name,
					amount: foundCreditNote.iGST,
					cRdR: 'DR',
					bills: []
				});
			}

			// deduction Ledger
			for(let k in foundCreditNote.grs){
				let  oGr = foundCreditNote.grs[k];
				if(oGr.amount){
					// let amount = (oGr.amount * 100) / (100 + (foundCreditNote.cGSTPercent || 0) + (foundCreditNote.sGSTPercent || 0) + (foundCreditNote.iGSTPercent || 0));
					// amount = Math.round(amount * 100)/100 || 0;
					aLedger.push({
						account: oGr.deductionAccount,
						lName: (await Account.findOne({_id: oGr.deductionAccount}, {name: 1})).name,
						amount: oGr.amount,
						cRdR: 'DR'
						/*
						bills: [{
							billNo:  constant.dedCharges[oGr.deductionType] + '-' + foundCreditNote.billNo,
							billType: 'Against Ref',
							amount: amount,
							remAmt: amount
						}]*/
					});
				}
			}

			// CR Ledger
			aLedger.push({
				account: billingPartyWithHoldAccount,
				lName: (await Account.findOne({_id: billingPartyWithHoldAccount}, {name: 1})).name,
				amount: foundCreditNote.totalAmount,
				cRdR: 'CR',
				bills: [{
					billNo:  foundCreditNote.billNo,
					billType: 'Against Ref',
					amount: foundCreditNote.totalAmount,
					remAmt: foundCreditNote.totalAmount
				}]
			});

			oVoucher.ledgers = aLedger;

			return oVoucher;

		}catch (e) {
			throw e;
		}
	}
}
