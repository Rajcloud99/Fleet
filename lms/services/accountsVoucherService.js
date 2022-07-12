let Voucher = promise.promisifyAll(commonUtil.getModel('accountsVoucher'));
let Accounts = promise.promisifyAll(commonUtil.getModel('accounts'));
let AcBal = commonUtil.getModel('accountbalances');
let moment = require('moment');
const serverSidePage = require('../../utils/serverSidePagination');

const ALLOWED_FILTER =['_id','type','from_date','to_date','from','to','voucherId', 'refNo', 'clientId','particular','ledger','branch'];

function constructFilters(oQuery) {
	oQuery.dateKey=oQuery.dateKey||oQuery.dateType||'date';
	let oFilter={deleted:false};
	for( i in oQuery){
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
				endDate.setSeconds (59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				endDate.setMilliseconds(59);
				oFilter[oQuery.dateKey] = oFilter[oQuery.dateKey] || {};
				oFilter[oQuery.dateKey].$lte = endDate;
			}else if (i === 'from') {
				let startDate = new Date (oQuery[i]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				startDate.setMilliseconds(0);
				oFilter[oQuery.dateKey] = oFilter[oQuery.dateKey] || {};
				oFilter[oQuery.dateKey].$gte = startDate;
			} else if (i === 'to') {
				let endDate = new Date (oQuery[i]);
				endDate.setSeconds (59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				endDate.setMilliseconds(59);
				oFilter[oQuery.dateKey] = oFilter[oQuery.dateKey] || {};
				oFilter[oQuery.dateKey].$lte = endDate;
			} else if(i==='branch'){
				if(oQuery[i] instanceof Array){
					oFilter[i] = {$in: otherUtil.arrString2ObjectId(oQuery[i])}
				} else if(typeof oQuery[i] === "string"){
					oFilter[i] = mongoose.Types.ObjectId(oQuery[i]);
				}
			}else if(i==='ledger'){
				if(typeof oQuery[i] === "string"){
					oFilter.$or = [{from:mongoose.Types.ObjectId(oQuery[i])},
						{to:mongoose.Types.ObjectId(oQuery[i])}];
				}
			} else {
				oFilter[i] = oQuery[i];
			}

		}
	}
	return oFilter;
}
module.exports.findVoucherByQuery = function(query, next) {
	let reqQuery = query;
	reqQuery.queryFilter = constructFilters(query);
	if(!reqQuery.sort){
		reqQuery.sort = {date:1};
	}
	otherUtil.findPagination(Voucher, reqQuery, next);
};

module.exports.findVoucherByQueryAggr = async function(query, next) {
	let vFil = constructFilters(query);
	let aggQuery = [
		{$match:vFil},
		{ $lookup: { from: 'accounts', localField: 'from', foreignField: '_id', as: 'from' } },
		{ $unwind: { path: '$from', preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'accounts', localField: 'to', foreignField: '_id', as: 'to' } },
		{ $unwind: { path: '$to', preserveNullAndEmptyArrays: true } },
	];
	if(!query.sort){
		aggQuery.push({$sort:query.sort});
	}
	if(!query.no_of_docs){
		query.no_of_docs = 30000;
	}
	aggQuery.push({$limit:query.no_of_docs});
	aggQuery.push({$project:query.project});
    let oQuery = {aggQuery:aggQuery,no_of_docs:30000};
	let aVch = await serverSidePage.requestData(Voucher,oQuery);
	//return aVch;
	return next(null,aVch);
};

let insertVoucher = async function (body,next) {
	idUtil.generateVIdAsync(body.clientId,body.type)
		.then(async function(vId){
			body.vId = vId;
			let from = await Accounts.findOne({_id:body.from});
			if(!from) return next('\'From\' account not found');
			let to = await Accounts.findOne({_id:body.to});
			if(!to) return next('\'To\' account not found');

			if(body.amount<0){
				body.amount = Math.abs(body.amount);
				let from = body.from;
				body.from = body.to;
				body.to = from;
			}

			body.fromClosing = from.balance;
			body.toClosing = to.balance;
			let dataToSave = new Voucher (body);
			dataToSave.saveAsync ()
			.then (async function (data) {
				if (data) {
					let fromUpdate = await Accounts.update ({_id: data.from}, {$inc: {balance: -1 * data.amount}});
					let toUpdate = await Accounts.update ({_id: data.to}, {$inc: {balance: data.amount}});
					/******* start alter account balances ****/
					let onlyDate = dateUtil.getMorning(body.date);
					let acbal,oBal;
					let acBal = await AcBal.findOne({account:data.from,date:{ $lte: onlyDate },clientId:body.clientId}).sort({date:-1});
					if(acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0){
						acbal = await AcBal.update({account:data.from,date:onlyDate,clientId:body.clientId},{ $inc : { cb: -1 * data.amount,cr:data.amount}});
					}else if(acBal){
						oBal = {account:data.from,date:onlyDate,clientId:body.clientId,cb:(-1 * data.amount + acBal.cb),ob:acBal.cb,cr:data.amount,dr:0};
						acbal = await AcBal.create(oBal);
					}else{
						oBal = {account:data.from,date:onlyDate,clientId:body.clientId,cb:-1 * data.amount,ob:0,cr:data.amount,dr:0};
						acbal = await AcBal.create(oBal);
					}
					acBal =await AcBal.findOne({account:data.to,date:{ $lte: onlyDate },clientId:body.clientId}).sort({date:-1});
					if(acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0){
						acbal = await AcBal.update({account:data.to,date:onlyDate,clientId:body.clientId},{ $inc : { cb: data.amount,dr:data.amount}});
					}else if(acBal){
						oBal = {account:data.to,date:onlyDate,clientId:body.clientId,cb:(data.amount + acBal.cb),ob:acBal.cb,dr:data.amount,cr:0};
						acbal = await AcBal.create(oBal);
					}else{
						oBal = {account:data.to,date:onlyDate,clientId:body.clientId,cb:data.amount,ob:0,dr:data.amount,cr:0};
						acbal = await AcBal.create(oBal);
					}

					let fAc = await AcBal.updateMany({account:data.from,clientId:body.clientId,date:{ $gt: onlyDate }},
						{ $inc: { cb: -1 * data.amount,ob: -1 * data.amount } }
					);
					let tAc = await AcBal.updateMany({account:data.to,clientId:body.clientId,date:{ $gt: onlyDate }},
						{ $inc: { cb: data.amount,ob: data.amount } }
					);
					/******* end alter account balances ****/
					return next (null, {"voucher":data,"from":fromUpdate,"to":toUpdate});
				}

			})
			.catch(next);
		}).catch(next);

};

let insertVoucherV2 = async function (body, next) {
	if (body.amount < 0) {
		body.amount = Math.abs(body.amount);
		let from = body.from;
		body.from = body.to;
		body.to = from;
	}
	const oUpsertFilter = {
		refNo: body.refNo,
		clientId:body.clientId,
		//date: body.date,
		from: body.from,
		to: body.to,
		billNo:body.billNo,
		deleted:false
	};
	body.deleted = false;
	const vch = await Voucher.findOne(oUpsertFilter,{_id:1}).lean();
	let data;
	if(vch){
		data = await Voucher.findByIdAndUpdate(vch._id, body, {new: true}).lean();
		telegram.sendMessage("duplicate vch create request "+ oUpsertFilter.refNo);
		return next(null, {"voucher": data});
	}else{
		try {
			let dataToSave = new Voucher (body);
			dataToSave.saveAsync ()
				.then (async function (data) {
					if (data) {
						let onlyDate = dateUtil.getMorning(body.date);
						let acbal, oBal;
						let acBal = await AcBal.findOne({
							account: data.from,
							date: {$lte: onlyDate},
							clientId: body.clientId
						}).sort({date: -1});
						if (acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0) {
							acbal = await AcBal.update({
								account: data.from,
								date: onlyDate,
								clientId: body.clientId
							}, {$inc: {cb: -1 * data.amount, cr: data.amount}});
						} else if (acBal) {
							oBal = {
								account: data.from,
								date: onlyDate,
								clientId: body.clientId,
								cb: (-1 * data.amount + acBal.cb),
								ob: acBal.cb,
								cr: data.amount,
								dr: 0
							};
							acbal = await AcBal.create(oBal);
						} else {
							oBal = {
								account: data.from,
								date: onlyDate,
								clientId: body.clientId,
								cb: -1 * data.amount,
								ob: 0,
								cr: data.amount,
								dr: 0
							};
							acbal = await AcBal.create(oBal);
						}
						acBal = await AcBal.findOne({
							account: data.to,
							date: {$lte: onlyDate},
							clientId: body.clientId
						}).sort({date: -1});
						if (acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0) {
							acbal = await AcBal.update({
								account: data.to,
								date: onlyDate,
								clientId: body.clientId
							}, {$inc: {cb: data.amount, dr: data.amount}});
						} else if (acBal) {
							oBal = {
								account: data.to,
								date: onlyDate,
								clientId: body.clientId,
								cb: (data.amount + acBal.cb),
								ob: acBal.cb,
								dr: data.amount,
								cr: 0
							};
							acbal = await AcBal.create(oBal);
						} else {
							oBal = {
								account: data.to,
								date: onlyDate,
								clientId: body.clientId,
								cb: data.amount,
								ob: 0,
								dr: data.amount,
								cr: 0
							};
							acbal = await AcBal.create(oBal);
						}

						let fAc = await AcBal.updateMany({account: data.from, clientId: body.clientId, date: {$gt: onlyDate}},
							{$inc: {cb: -1 * data.amount, ob: -1 * data.amount}}
						);
						let tAc = await AcBal.updateMany({account: data.to, clientId: body.clientId, date: {$gt: onlyDate}},
							{$inc: {cb: data.amount, ob: data.amount}}
						);
						//return next(null, {"voucher": data, "from": fromUpdate, "to": toUpdate});
						return next(null, {"voucher": data});
					}
				}).catch(next);

		} catch (e) {
			console.error(e.toString());
			telegram.sendMessage("add vch error "+ e.toString());
			return next(e.toString());
		}
	}
};

module.exports.addVoucher = function(body, next) {
	insertVoucherV2(body, function (err, data) {
		if (err) return next(err);
		let respData = [data];
		return next(null,respData);
	});
}

module.exports.findVoucherById = function(id, next) {
    Voucher.findOneAsync({ _id: mongoose.Types.ObjectId(id), deleted: false })
        .then(function(data) {
            return next(null, data);
        })
        .catch(next)
};

async function removeVoucher(body) {

	let voucher = await Voucher.findById(body._id);

	if(voucher && voucher.amount){
       try{
		   let sV = await Voucher.update(
			   { _id: voucher._id },
			   { $set: { deleted: true } }
		   );

		   let fromAccntUpdate = await Accounts.updateOne(
			   { _id: voucher.from },
			   { $inc: { balance: voucher.amount } }
		   );

		   let toAccntUpdate = await Accounts.updateOne(
			   { _id: voucher.to },
			   { $inc: { balance: -1 * voucher.amount } }
		   );

		   /******* start alter account balances ****/

		   let onlyDate = dateUtil.getMorning(voucher.date);
		   let fAcBi = await AcBal.updateMany({account:voucher.from,clientId:body.clientId,date: onlyDate },
			   { $inc: { cr:-1 * voucher.amount } }
		   );
		   let fAcB = await AcBal.updateMany({account:voucher.from,clientId:body.clientId,date:{ $gte: onlyDate }},
			   { $inc: { cb: voucher.amount,ob: voucher.amount } }
		   );
		   let tAcBi = await AcBal.updateMany({account:voucher.to,clientId:body.clientId,date: onlyDate },
			   { $inc: { dr: -1 * voucher.amount } }
		   );
		   let tAcB = await AcBal.updateMany({account:voucher.to,clientId:body.clientId,date:{ $gte: onlyDate }},
			   { $inc: { cb: -1 * voucher.amount,ob: -1 * voucher.amount } }
		   );
		   /******* end alter account balances ****/
		   return {"status":"OK","message":"voucher removed successfully"};
	   }catch(e){
       	winston.error("error in remove vocucher " + e.toString());
       	telegram.sendMessage("error in remove vocucher " + e.toString(),new Date().toLocaleString());
       	return {"status":"ERROR","message":"error in remove vocucher " + e.toString()};
	   }
	}else{
		return {"status":"ERROR","message":"voucher not found"};
	}

}

module.exports.removeVoucher = removeVoucher;

module.exports.editVoucher = async ({ _id, clientId, amount }) => {
    //amount = New Amount - Old Amount
	let voucher = await Voucher.findById(_id);

	if(voucher && voucher.amount){
		let sV = await Voucher.updateOne(
			{ _id: voucher._id },
			{ $inc: { amount: amount } }
		);

		let fromAccntUpdate = await Accounts.updateOne(
			{ _id: voucher.from },
			{ $inc: { balance: amount } }
		);

		let toAccntUpdate = await Accounts.updateOne(
			{ _id: voucher.to },
			{ $inc: { balance: -1 * amount } }
		);
		/******* start alter account balances ****/
		let onlyDate = dateUtil.getMorning(voucher.date);
		let fAcB = await AcBal.updateMany({account:voucher.from,clientId:clientId,date:{ $gte: onlyDate }},
			{ $inc: { cb: -1 * amount,ob: -1 * amount } }
		);
		let tAcB = await AcBal.updateMany({account:voucher.to,clientId:clientId,date:{ $gte: onlyDate }},
			{ $inc: { cb: amount,ob: amount } }
		);
		return {"status":"OK","message":"voucher edited successfully"};
	}else{
		return {"status":"OK","message":"voucher not found"};
	}

};

module.exports.removeVoucherV2 = async (body) => {
	try {
		const accV1 = await Voucher.findOne({_id:body._id},{deleted:1,amount:1,refNo:1}).lean();
		if(accV1.deleted){
			winston.error(" voucher already deleted -> "+ accV1.refNo +" date ");
			telegram.sendMessage(" voucher already deleted -> "+ accV1.refNo);
			return {"voucher":accV1};
		}else{
			const accV = await Voucher.findByIdAndUpdate(body._id, {$set:{deleted: true}}, {new: true}).lean();
			let fromUpdate = await Accounts.update ({_id: accV.from}, {$inc: {balance: accV.amount}});
			let toUpdate = await Accounts.update ({_id: accV.to}, {$inc: {balance: -1 * accV.amount}});
			/******* start alter account balances ****/
			let onlyDate = dateUtil.getMorning(accV.date);
			let acbal,oBal;
			let acBal = await AcBal.findOne({
				clientId:accV.clientId,
				account:accV.from,
				date:{ $lte: onlyDate },
			}).sort({date:-1}).lean();
			if(acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0){
				acbal = await AcBal.update({
					account:accV.from,
					date:onlyDate,
					clientId:accV.clientId
				}, { $inc: { cb: accV.amount,cr: -1 * accV.amount}});
			}else if(acBal){
				winston.error(" from acBal on remove not on date "+ accV.refNo +" date " +onlyDate);
				telegram.sendMessage("from acBal on remove not on date "+ accV.refNo +" date " +onlyDate);
				oBal = {
					account:accV.from,
					date:onlyDate,
					clientId:accV.clientId,
					cb:acBal.cb + accV.amount,
					ob: acBal.cb,
					cr:0,
					dr:0
				};
				acbal = await AcBal.create(oBal);
			}else{
				winston.error(" from acBal on remove not on date 2 -> "+ accV.refNo +" date " +onlyDate);
				telegram.sendMessage(" from acBal on remove not on date 2 -> "+ accV.refNo +" date " +onlyDate);
				oBal = {
					account:accV.from,
					date:onlyDate,
					clientId:accV.clientId,
					cb:accV.amount,
					ob:0,
					cr:0,
					dr:0
				};
				acbal = await AcBal.create(oBal);
			}
			acBal =await AcBal.findOne({account:accV.to,date:{ $lte: onlyDate },clientId:accV.clientId}).sort({date:-1});
			if(acBal && moment(acBal.date).diff(onlyDate, 'days', true) == 0){
				acbal = await AcBal.update({
					account:accV.to,
					date:onlyDate,
					clientId:accV.clientId
				},{ $inc : { cb: -1 * accV.amount, dr: -1 * accV.amount}});
			}else if(acBal){
				winston.error(" to acBal on remove not on date 2 -> "+ accV.refNo +" date " +onlyDate);
				telegram.sendMessage(" to acBal on remove not on date 2 -> "+ accV.refNo +" date " +onlyDate);
				oBal = {account:accV.to,date:onlyDate,clientId:accV.clientId,cb:(acBal.cb - accV.amount ),ob:acBal.cb,cr:0,dr:0};
				acbal = await AcBal.create(oBal);
			}else{
				winston.error(" to acBal on remove not on date 2 -> "+ accV.refNo +" date " +onlyDate);
				telegram.sendMessage(" to acBal on remove not on date 2 -> "+ accV.refNo +" date " +onlyDate);
				oBal = {account:accV.to,date:onlyDate,clientId:accV.clientId,cb:-accV.amount,ob:0,cr:0,dr:0};
				acbal = await AcBal.create(oBal);
			}
			let fAc = await AcBal.updateMany({account:accV.from,clientId:accV.clientId,date:{ $gt: onlyDate }},
				{ $inc: { cb: accV.amount,ob:accV.amount } }
			);
			let tAc = await AcBal.updateMany({account:accV.to,clientId:accV.clientId,date:{ $gt: onlyDate }},
				{ $inc: { cb: -1*accV.amount,ob: -1*accV.amount } }
			);
			/******* end alter account balances ****/
			return {"voucher":accV,"from":fromUpdate,"to":toUpdate};
		}
	} catch(e) {
		winston.error("error in removeVoucherV2 "  + e.toString());
		telegram.sendMessage("error in removeVoucherV2 "  + e.toString(),new Date().toLocaleString());
		return {"error":e.toString()};
	}
};

function isAllowed(c) {
	const allowed = ['branch', 'refNo', 'narration', 'deleted'];
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
