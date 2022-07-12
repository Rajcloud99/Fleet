let Voucher = promise.promisifyAll(commonUtil.getModel('plainVoucher'));
let PlainVoucher = commonUtil.getModel('plainVoucher');
let moneyReceiptService = commonUtil.getService('moneyReceipt');
const uuidv4 = require('uuid/v4');
let Accounts = promise.promisifyAll(commonUtil.getModel('accounts'));
let async = require('async');

const ALLOWED_FILTER =['_id','type','branch', 'narration', 'billNo', 'voucher', 'paymentType', 'from_date','to_date','from','to','PlanVoucherId','clientId','ledger','refNo','refNos','$and','$or','clientId', 'reversed'];

function constructFilters(oQuery) {
	oQuery.dateKey=oQuery.dateKey||oQuery.dateType||'billDate';
	let oFilter={deleted:{$not:{$eq:true}}};
	/*if(oQuery.deleted) {
		oFilter={deleted:true};
	}*/
	for(i in oQuery){
		if(otherUtil.isAllowedFilter(i,ALLOWED_FILTER)){
			if (i === 'from_date') {
				let startDate = new Date (oQuery[i]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				startDate.setMilliseconds(0);
				oFilter[oQuery.dateKey] = oFilter[oQuery.dateKey] || {};
				oFilter[oQuery.dateKey].$gte = startDate;
			} else if (i === 'to_date') {
				let endDate = new Date (oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				endDate.setMilliseconds(59);
				oFilter[oQuery.dateKey] = oFilter[oQuery.dateKey] || {};
				oFilter[oQuery.dateKey].$lte = endDate;
			} else if(i==='from'|| i==='to'){
				if(oQuery[i] instanceof Array){
					oFilter[i] = {$in: otherUtil.arrString2ObjectId(oQuery[i])}
				}
				else if(typeof oQuery[i] === "string"){
					oFilter[i] = mongoose.Types.ObjectId(oQuery[i]);
				}
			} else if(i==='ledger') {
				oFilter.$or = oFilter.$or || [];
				oFilter.$or.push(...[
					{from:mongoose.Types.ObjectId(oQuery[i])},
					{to:mongoose.Types.ObjectId(oQuery[i])}
				]);
			} else if(i==='refNo') {
				oFilter[i] = {$regex: '^'+oQuery[i].trim()+'$', $options:'i'};
			}else if(i==='refNos') {
				oFilter['refNo'] = {$in:oQuery[i]};
			}else if(i==='_id') {
				oFilter[i] = {$in:otherUtil.arrString2ObjectId(oQuery[i])};
			}else if (i === "narration") {
				oFilter[i] = {
					$regex: oQuery[i],
					$options: 'i'
				};
			} else if(i==='paymentType') {
				oFilter[i] = {$in:oQuery[i]};
			}else if(i==='$or') {
				oFilter[i] = oFilter[i] || [];
				oFilter[i].push(...(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]]));
			}else {
				oFilter[i] = oQuery[i];
			}

		}
	}
	return oFilter;
}

module.exports.findVoucherByQuery = findVoucherByQuery;

module.exports.findVoucherByQueryAsync = findVoucherByQueryAsync;

module.exports.aggrPort = function(query) {
	let oFil = constructFilters(query);
	oFil.dpV = {$exists:false};
	oFil.refNo = {$exists:true};
	if(query.cClientId) oFil.clientId = query.cClientId;
	let aggrPipe = [
		{ $match:  oFil },
		{ $lookup: { from: 'accounts', localField: 'from', foreignField: '_id', as: 'from' } },
		{ $unwind: { path: '$from', preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'accounts', localField: 'to', foreignField: '_id', as: 'to' } },
		{ $unwind: { path: '$to', preserveNullAndEmptyArrays: true } },
		{ $group : {
				_id: '$refNo',
				v_id:{$first:"$_id"},
				uuid: {$first:"$uuid"},
				clientId: {$first:"$clientId"},
				type:{$first:"$type"},
				narration: {$first:"$narration"},
				refNo: {$first:"$refNo"},
				refNoInt: {$first:"$refNoInt"},
				billNo: {$first:"$billNo"},
				billType: {$first:"$billType"},
				crBillNo: {$first:"$crBillNo"},
				crRef: {$first:"$crRef"},
				billDate: {$first:"$billDate"},
				paymentDate: {$first:"$paymentDate"},
				paymentMode: {$first:"$paymentMode"},
				paymentRef: {$first:"$paymentRef"},
				paymentType: {$first:"$paymentType"},
				created_at: {$first:"$created_at"},
				isEditable: {$first:"$isEditable"},
				voucher: {$first:"$voucher"},
				export: {$first:"$export"},
				total:{$sum:"$amount"},
				svd:{$addToSet:"$to._id"},
				svc:{$addToSet:"$from._id"},
				a_id:{$push:"$_id"},
				vch:{$push:{amount:"$amount",billNo:"$billNo",billType:"$billType",from:"$from",to:"$to",refNo:"$refNo",
						crRef:"$crRef",crBillNo:"$crBillNo"}}
			}},
		{ $sort: { 'refNoInt': 1 } }
	];
	return Voucher.aggregate(aggrPipe).allowDiskUse(true);
};

module.exports.aggr = function(query) {//TODO rename aggrXml
	let oFil = constructFilters(query);
	let aggrPipe = [
		{ $match:  oFil },
		{ $lookup: { from: 'accounts', localField: 'from', foreignField: '_id', as: 'from' } },
		{ $unwind: { path: '$from', preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'accounts', localField: 'to', foreignField: '_id', as: 'to' } },
		{ $unwind: { path: '$to', preserveNullAndEmptyArrays: true } },
		//{ $lookup: { from: 'accountvouchers', localField: 'voucher', foreignField: '_id', as: 'voucher' } },
		//{ $unwind: { path: '$voucher', preserveNullAndEmptyArrays: true } },
		//{ $lookup: { from: 'plainvouchers', localField: 'sv', foreignField: '_id', as: 'sv' } }
	];
	if(query.download =='tally'){
		aggrPipe.push({ $group: {
			    _id: '$refNo',
			    v_id:{$first:"$_id"},
				uuid: {$first:"$uuid"},
				type:{$first:"$type"},
				//sv: {$first:"$sv"},
				//voucher: {$first:"$voucher"},
				//from: {$first:"$from"},
				//to: {$first:"$to"},
				narration: {$first:"$narration"},
				refNo: {$first:"$refNo"},
				refNoInt: {$first:"$refNoInt"},
				//amount: {$first:"$amount"},
				billNo: {$first:"$billNo"},
				billType: {$first:"$billType"},
				crBillNo: {$first:"$crBillNo"},
				crRef: {$first:"$crRef"},
				billDate: {$first:"$billDate"},
			    paymentDate: {$first:"$paymentDate"},
				created_at: {$first:"$created_at"},
				total:{$sum:"$amount"},
				svd:{$addToSet:"$to._id"},
				svc:{$addToSet:"$from._id"},
			    vch:{$push:{amount:"$amount",billNo:"$billNo",billType:"$billType",from:"$from",to:"$to",refNo:"$refNo",
					crRef:"$crRef",crBillNo:"$crBillNo"}}
			}
		});
	}
	aggrPipe.push({ $sort: { 'refNoInt': 1 } });
	return Voucher.aggregate(aggrPipe);
};

module.exports.aggrV2 = function(query) {
	let oFilter = {};
	if(query.billNo){
		oFilter.billNo = {$regex: query.billNo.trim(), $options:'i'};
		oFilter.trackPayAs = "bill";
		oFilter.remAmt = {$gt:0};
	}
	if(query.type == 'Payment'){
		if(query.to){
			oFilter.$or = [
				{from:mongoose.Types.ObjectId(query.to)},
				{to:mongoose.Types.ObjectId(query.to)}
			];
		}
	}else if(query.type == 'Receipt'){
		if(query.from){
			oFilter.$or = [
				{from:mongoose.Types.ObjectId(query.from)},
				{to:mongoose.Types.ObjectId(query.from)}
			];
		}
	}else{
		if(query.from){
			oFilter.$or = [
				{from:mongoose.Types.ObjectId(query.from)},
				{to:mongoose.Types.ObjectId(query.from)}
			];
		}
		if(query.to && oFilter.$or.length>0){
			oFilter.$or.push(
				{from:mongoose.Types.ObjectId(query.to)},
				{to:mongoose.Types.ObjectId(query.to)}
			);
		}else if(query.to){
			oFilter.$or = [
				{from:mongoose.Types.ObjectId(query.to)},
				{to:mongoose.Types.ObjectId(query.to)}
			];
		}
	}

	let aggrPipe = [
		{ $match: oFilter},
		{$sort:{billDate:1}},
		{$limit:10}
		];
	return Voucher.aggregate(aggrPipe).allowDiskUse(true);
};

let insertVoucher = async function (body,next) {
	idUtil.generatePVIdAsync(body.clientId,body.type)
		.then(async function(pvId){
			body.pvId = pvId;
			body.uuid = body.uuid || uuidv4();
			let dataToSave = new Voucher (body);
			dataToSave.saveAsync ()
				.then (async function (data) {
					if (data) {
						if(data.billType === 'Against Ref' && data.bill && data.bill.toString().match(/^[0-9a-fA-F]{24}$/)) {
							await PlainVoucher.findByIdAndUpdate(data.bill.toString(), {
								$inc: { remAmt: -1 * data.amount  },
								$push: { payments: data._id },
							});
						}
						return next (null, {"voucher":data});
					}
				})
				.catch(next);
		}).catch(next);

};

module.exports.addVoucher = addVoucher;

module.exports.addVoucherAsync = addVoucherAsync;

module.exports.findVoucherById = findVoucherById;

module.exports.editVoucher = editVoucher;

module.exports.findVoucherByIdAsync = findVoucherByIdAsync;

module.exports.removeVoucher = async ({ _id, clientId }) =>  {
	try {
		let voucher = await Voucher.findById(_id).lean();
		if(voucher && !voucher.voucher){
			let sV = await Voucher.update({ _id: voucher._id },{ $set: { deleted: true } });
			return Promise.resolve({"status":"OK","message":"voucher removed successfully"});
		} else {
			return Promise.resolve({"status":"OK","message":"voucher not found"});
		}
	} catch(e) {
		return Promise.reject({"status":"OK","message":"voucher not found"});
	}
};

module.exports.addMultiTransactionSingleVoucher = async (body) =>  {

	try{
		if(Array.isArray(body.aVoucher) || !body.clientId) {
			let multi = 'NO',crA=[],drA=[];
			if(body.aVoucher.length>1){//find multi cr or dr
				for(let n=0; n<body.aVoucher.length; n++) {
					if(crA.indexOf(body.aVoucher[n].from) == -1){
						crA.push(body.aVoucher[n].from);
					}
					if(drA.indexOf(body.aVoucher[n].to) == -1){
						drA.push(body.aVoucher[n].to);
					}
				}
				if(crA.length>1){
					multi = 'CR';
				}else {
					multi = 'DR';
				}
			}
			let resp = [];
			const uuid = uuidv4();
			for(let i=0; i<body.aVoucher.length; i++) {
				let oSend = { ...body.aVoucher[i], clientId: body.clientId, uuid: body.vT === 'same' ? uuid : uuidv4(),multi:multi};
				// TODO Move Below Code to Add Plain Voucher
				if(oSend.billType == 'New Ref' && oSend.billNo){
					oSend.remAmt = oSend.remAmt ||  oSend.amount;
					oSend.trackPayAs = oSend.trackPayAs || 'bill';
				}
				oSend.created_by_name = body.created_by_name;

				var r = await new Promise(function (resolve, reject) {
					addVoucher(oSend, function(err, data){
						if(err) reject(err);
						resolve(data);
					})
				});
				resp.push(r[0]);
			}
			const bulkQuery = resp.reduce((acc, curr, i) => ([
				...acc,
				{
					updateOne: {
						filter: { _id: curr.voucher._id },
						update: { $set: {
								sv: resp.reduce((acc2, curr2, i2) => (i !== i2) ? [...acc2, curr2.voucher._id] : acc2, [])
							} },
						upsert: false
					}
				}
			]), []);
			const bulkResult = await PlainVoucher.bulkWrite(bulkQuery);
			return resp;
		}else{
			throw new Error('Mandatory Fields are required');
		}
	}catch (e) {
		console.log(e);
		throw e;
	}
};

// function definition

async function addVoucherAsync(body, next) {

	try{

		return await new Promise(function (resolve, reject) {
			addVoucher(body, function(err, data){
				if(err) reject(err);
				resolve(data);
			});
		});

	}catch(e){
		throw e;
	}
}

async function addVoucher(body, next) {

	let PlainVoucherId = 0;
	idUtil.generatePlainVoucherIdAsync(body.clientId)
		.then(async function (id) {
			PlainVoucherId = id;
			body.PlainVoucherId = PlainVoucherId;
			var intPart = parseInt((body.refNo||'').replace(/^.*([0-2][0-9]|(3)[0-1])(\-|\/)(((0)[0-9])|((1)[0-2]))(\-|\/)\d{2,4}/i, '').replace(/\D+/g, ''));
			var wordPart = (body.refNo||'').replace(/\W+/ig, '').replace(/\d+/g, '');
			if (intPart) body.refNoInt = intPart;
			if (wordPart) body.refNoWord = wordPart;
			insertVoucher(body, async function (err, data) {
				if (err) return next(err);

				// if type is "Receipt" then create new Money Receipt
				let oData = data.voucher;
				if(oData.type === 'Receipt'){

					let toAccount = await Accounts.findOne({_id: oData.to}).lean();

					await moneyReceiptService.addMRFromVoucher({
						mrNo: oData.refNo,
						clientId: oData.clientId,
						createdBy: body.created_by_name,
						stationaryId: oData.stationaryId,
						receivedAmount: oData.amount,
						fromAccount: oData.from,
						bankAccount: toAccount._id,
						bankAccountName: toAccount.name,
						voucher: oData._id,
						paymentMode: oData.paymentMode,
						paymentRef: oData.paymentRef,
						paymentDate: oData.paymentDate,
						narration: oData.narration,
						branch: oData.branch,
					});
				}

				return next(null,[data]);
			})
		})
		.catch(next)
}

async function editVoucher({ _id, ...rest }) {
	try {
		let voucher = await Voucher.findById(_id).lean();
		if(voucher.voucher){
			return Promise.reject({"status": "ERROR", "message": 'please revert its voucher first'});
		}
		if(voucher.bill && rest.bill && (voucher.bill.toString() !== rest.bill.toString())) {
			await Voucher.findByIdAndUpdate(voucher.bill,
				{
					$inc: { remAmt: -1 * voucher.amount },
					$pull: {payments: _id}
				}, {new: true}).lean();
			await Voucher.findByIdAndUpdate(rest.bill,
				{
					$inc: { remAmt: rest.amount },
					$push: {payments:_id}
				}, {new: true}).lean();
		} else {
			await Voucher.findByIdAndUpdate(rest.bill || _id, {$inc: {
					remAmt: rest.amount - voucher.amount
				}}, {new: true}).lean();
		}
		if (hasAllowedFields(rest)) {
			var intPart = parseInt((rest.refNo||'').replace(/^.*([0-2][0-9]|(3)[0-1])(\-|\/)(((0)[0-9])|((1)[0-2]))(\-|\/)\d{2,4}/i, '').replace(/\D+/g, ''));
			var wordPart = (rest.refNo||'').replace(/\W+/ig, '').replace(/\d+/g, '');
			let oSt = { ...getAllowedFields(rest) };
			if (intPart) oSt['refNoInt'] = intPart;
			if (wordPart) oSt['refNoWord'] = wordPart;
			voucher = await Voucher.findByIdAndUpdate(_id, {$set: oSt}, {new: true}).lean();
		}

		// if type is "Receipt" then update its respective Money Receipt
		if(rest.type === 'Receipt'){

			let toAccount = await Accounts.findOne({_id: rest.to}).lean();

			await moneyReceiptService.editMRFromVoucher(voucher.refNo, {
				mrNo: rest.refNo,
				clientId: rest.clientId,
				createdBy: rest.created_by,
				stationaryId: rest.stationaryId,
				receivedAmount: rest.amount,
				fromAccount: rest.from,
				bankAccount: toAccount._id,
				bankAccountName: toAccount.name,
				voucher: _id,
				paymentMode: rest.paymentMode,
				paymentRef: rest.paymentRef,
				paymentDate: rest.paymentDate,
				narration: rest.narration,
				branch: rest.branch,
			});
		}

		return Promise.resolve({"status": "OK", "message": "voucher edited successfully", data: voucher});
	} catch (e) {
		return Promise.reject({"status": "ERROR", "message": e.toString()});
	}
}

function isAllowed(c) {
	const allowed = ['branch', 'from', 'to', 'stationaryId', 'billNo', 'billType', 'paymentType', 'paymentMode', 'paymentRef', 'paymentDate', 'billDate', 'chequeDate', 'refNo', 'narration', 'amount', 'crBillNo', 'crRef', 'trackPayAs', 'remAmt','type'];
	return allowed.indexOf(c) !== -1;
}

function hasAllowedFields(obj) {
	let retVal = false;
	for (key in obj) {
		if(obj.hasOwnProperty(key)) {
			if(isAllowed(key)) {
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
		if(obj.hasOwnProperty(key)) {
			if(isAllowed(key)) {
				oRet[key] = obj[key];
			}
		}
	}
	return oRet;
}

async function findVoucherByIdAsync(body) {
	try{

		return await new Promise(function (resolve, reject) {
			findVoucherById(body, function (err, data) {
				if(err) reject(data);
				resolve(data);
			});
		});

	}catch (e) {
		throw e;
	}
}

async function findVoucherByQueryAsync(body) {
	try{

		return await new Promise(function (resolve, reject) {
			findVoucherByQuery(body, function (err, data) {
				if(err) reject(err);
				resolve(data);
			});
		});

	}catch (e) {
		throw e;
	}
}

function findVoucherByQuery(query, next) {
	let reqQuery = query;
	reqQuery.queryFilter = constructFilters(query);
	if(!reqQuery.sort){
		reqQuery.sort = {date:-1};
	}
	reqQuery.populate = ['sv'];
	otherUtil.findPagination(Voucher, reqQuery, next);
}

function findVoucherById(id, next) {
	Voucher.findOneAsync({ _id: mongoose.Types.ObjectId(id), deleted: false })
		.then(function(data) {
			return next(null, data);
		})
		.catch(next)
}
