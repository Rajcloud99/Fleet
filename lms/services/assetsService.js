const Assets = commonUtil.getModel('assets');
let Accounts = commonUtil.getModel('accounts');
const voucherService = commonUtil.getService('voucher');
const serverSidePage = require('../../utils/serverSidePagination');
let Pagination = promise.promisify(otherUtil.findPagination);
let ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

module.exports = {
	getAssetsRecord,
	getDistinctAssets,
	updateAssets,
	removeByAssetsId,
	saveAssets,
	calDeprecationRecord,
	acknowledgeDepVoucher
};

const ALLOWED_FILTER = ["_id", 'clientId', "name", "from", "to", "category", 'physicalStatus', 'method'];

function constructFilters(oQuery) {
	let oFilter = {
			deleted: {
				$ne: true
			}
	};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$gte = startDate;
			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$lte = endDate;
			}else if(i === 'name'){
				oFilter[i] = {$regex: oQuery[i], $options: 'i'};
			}else if (i === '_id') {
				oFilter[i] = {
					$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
				};
			} else if (i === 'category') {
				oFilter[i] = typeof oQuery[i] === "string" && mongoose.Types.ObjectId(oQuery[i]) || oQuery[i];
			}else {
				oFilter[i] = oQuery[i];
			}
		}
	}

	return oFilter;
}

function constructDisFilters(oQuery) {
	let oFilter = {
		$or: [{purBill: {$exists: false}}]
	};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$gte = startDate;
			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$lte = endDate;
			}else if(i === 'name') {
				oFilter[i] = {$regex: oQuery[i], $options: 'i'};
			}else {
				oFilter[i] = oQuery[i];
			}
		}
	}

	oFilter.$or.push({purBill: {$exists: true},  'name': oFilter.name});

	return oFilter;
}

async function saveAssets(body, user) {
	try {
		let acId, depId ,catId;
		if(body.category){
			catId = body.category && body.category._id || body.category;
		}else{
			throw new Error(`category not found`);
		}

		if(body.assetsAc){
			 acId = body.assetsAc && body.assetsAc._id || body.assetsAc;
			let oAcc = await Accounts.findOne({_id: acId}, {
				isGroup: 1,
			}).lean();

			if (oAcc.isGroup)
				throw new Error(`Selected Account: ${body.assetsAc.name} group must be false`);
		}else{
			throw new Error(`assetsAc not found`);
		}

		if(body.depreciationAc){
			depId = body.depreciationAc && body.depreciationAc._id || body.depreciationAc;
			let oAcc = await Accounts.findOne({_id: depId}, {
				isGroup: 1,
			}).lean();

			if (oAcc.isGroup)
				throw new Error(`Selected Account: ${body.depreciationAc.name} group must be false`);
		}else{
			throw new Error(`depreciationAc not found`);
		}

			let oCreate = {
				...body,
				clientId:user.clientId,
				user:user.full_name,
				name:body.name,
				category:otherUtil.arrString2ObjectId(catId),
				assetsAc:otherUtil.arrString2ObjectId(acId),
				depreciationAc:otherUtil.arrString2ObjectId(depId),
				physicalStatus:body.physicalStatus,
				depreRateCRate:body.depreRateCRate,
				depreRateItRate:body.depreRateItRate,
				qty:body.qty,
				rate:body.rate,
				method:body.method,
				location:body.location,
				bookBalanceLife:body.bookBalanceLife,
			};

		const savedBillBook = await Assets.create(oCreate);
		return savedBillBook;

	} catch (e) {
		throw e;
	}
}

async function removeByAssetsId(assetsId, user) {
	try {
		let objToUpdate = {
			typ:'Delete',
			by: user.full_name,
			at: new Date(),
			rmk: "assets deleted"
		};
		return await Assets.findByIdAndUpdate({_id: otherUtil.arrString2ObjectId(assetsId)},{
			$set:{deleted: true},
			$push: {
				his: objToUpdate
			}
		});
	} catch (e) {
		throw e;
	}
}

async function updateAssets(body, user, id) {
	 try {
		 let acId, depId, catId;
		 acId = body.assetsAc && body.assetsAc._id || body.assetsAc;
		 depId = body.depreciationAc && body.depreciationAc._id || body.depreciationAc;
		 catId = body.category && body.category._id || body.category;
		 let oUpdate = {
		 	...body,
			 clientId:user.clientId,
			 user:user.full_name,
			 name:body.name,
			 category:otherUtil.arrString2ObjectId(body.category._id || catId),
			 assetsAc:otherUtil.arrString2ObjectId(body.assetsAc._id || acId),
			 depreciationAc:otherUtil.arrString2ObjectId(body.depreciationAc._id || depId),
			 physicalStatus:body.physicalStatus,
			 depreRateCRate:body.depreRateCRate,
			 depreRateItRate:body.depreRateItRate,
			 qty:body.qty,
			 rate:body.rate,
			 method:body.method,
			 location:body.location,
			 bookBalanceLife:body.bookBalanceLife,
		 };

			return await Assets.findOneAndUpdate({_id:id}, {
				$set: oUpdate
			});

	 } catch (e) {
		 throw e;
	 }
}

async function getAssetsRecord(reqBody, res) {
	reqBody.no_of_docs = reqBody.no_of_docs || 10;
	reqBody.skip = reqBody.skip || 1;
	let oFil = constructFilters(reqBody);
	let sortQ = {_id: -1};
	const aggrQuery = [
		{
			$match: oFil
		},
		{
			$sort: sortQ
		},
		{$skip: ((reqBody.no_of_docs * reqBody.skip) - reqBody.no_of_docs)},
		{$limit: reqBody.no_of_docs},
		{
			"$lookup": {
				"from": "assetscategories",
				"localField": "category",
				"foreignField": "_id",
				"as": "category"
			}
		},
		{
			$unwind: {
				path: '$category',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'accounts',
				localField: 'assetsAc',
				foreignField: '_id',
				as: 'assetsAc'
			}
		},
		{
			$unwind: {
				path: '$assetsAc',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'accounts',
				localField: 'depreciationAc',
				foreignField: '_id',
				as: 'depreciationAc'
			}
		},
		{
			$unwind: {
				path: '$depreciationAc',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'purchasebills',
				localField: 'purBill',
				foreignField: '_id',
				as: 'purBill'
			}
		},
		{
			$unwind: {
				path: '$purBill',
				preserveNullAndEmptyArrays: true
			}
		},
	];

	let oQuery = {aggQuery: aggrQuery};
	let data = await serverSidePage.requestData(Assets, oQuery);
	return data;

}

async function getDistinctAssets(req, res) {
	let oFil = constructDisFilters(req.body);
	req.no_of_docs = 1;
	let sortQ = {_id: -1};
	const aggrQuery = [
		{
			$match: oFil
		},
		{
			"$lookup": {
				"from": "assetscategories",
				"localField": "category",
				"foreignField": "_id",
				"as": "category"
			}
		},
		{
			$unwind: {
				path: '$category',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'accounts',
				localField: 'assetsAc',
				foreignField: '_id',
				as: 'assetsAc'
			}
		},
		{
			$unwind: {
				path: '$assetsAc',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'accounts',
				localField: 'depreciationAc',
				foreignField: '_id',
				as: 'depreciationAc'
			}
		},
		{
			$unwind: {
				path: '$depreciationAc',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$lookup: {
				from: 'purchasebills',
				localField: 'purBill',
				foreignField: '_id',
				as: 'purBill'
			}
		},
		{
			$unwind: {
				path: '$purBill',
				preserveNullAndEmptyArrays: true
			}
		},

		{
			"$group": {_id: '$purBill._id', aData: {$push: '$$ROOT'}}
		},

		{
			"$project": {
				"_id": "$_id",
				"data": "$aData",
			}
		},

		{$sort: {_id: 1}},
	];

	let oQuery = {aggQuery: aggrQuery};
	let data = await serverSidePage.requestData(Assets, oQuery);
	if(data && data.length && data[0].data.length)
	return [data[0].data[0]];
	return (data = []);

}

async function calDeprecationRecord(req, res) {
	try {
		let oFil = constructFilters(req.body);
		let sortQ = {_id: -1};
		const aggrQuery = [
			{
				$match: oFil
			},
			{
				"$sort": {
					"_id": -1
				}
			},
			{
				"$lookup": {
					"from": "assetscategories",
					"localField": "category",
					"foreignField": "_id",
					"as": "category"
				}
			},

			{
				"$unwind": {
					"path": "$category",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'assetsAc',
					foreignField: '_id',
					as: 'assetsAc'
				}
			},
			{
				$unwind: {
					path: '$assetsAc',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'depreciationAc',
					foreignField: '_id',
					as: 'depreciationAc'
				}
			},
			{
				$unwind: {
					path: '$depreciationAc',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'purchasebills',
					localField: 'purBill',
					foreignField: '_id',
					as: 'purBill'
				}
			},
			{
				$unwind: {
					path: '$purBill',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$sort: sortQ
			}
		];


		let oQuery = {aggQuery: aggrQuery, no_of_docs: 10000};
		let getData = await serverSidePage.requestData(Assets, oQuery);
		return getData;
	} catch (e) {
		console.log('error => ', e);
		throw e;
	}
}

async function acknowledgeDepVoucher(id, body, req) {

	let aLedger = [], refNo, branch;

	try {

		if (!id)
			throw new Error('Mandatory Fields are required');

		let user = req.user.full_name;
		let clientId = req.user.clientId;

		let oAssets = await Assets.findOne({_id: id})
			.populate({path: 'purBill', select: {'refNo': 1, 'branch': 1}})
			.populate({path: 'assetsAc', select: {'_id': 1, 'name': 1}})
			.populate({path: 'depreciationAc', select: {'_id': 1, 'name': 1}})
			.lean();

		if (!oAssets.purBill)
			throw new Error('Assets purBill not generated');
		if (!oAssets.assetsAc)
			throw new Error('Assets Ac not Linked');
		if (!oAssets.depreciationAc)
			throw new Error('depreciation Ac not Linked');

		var d = new Date();
		var curDay = d.getDate();
		var curYear = d.getFullYear();

		if(oAssets.purBill){
			refNo = curDay + '/' + curYear + '/' + oAssets.purBill.refNo;
			branch = oAssets.purBill.branch;
		}

		let multiVoucher = new voucherService.multiVoucherOpr();

		let oVoucher = {
			vT: "Assets",
			type: "Purchase",
			refNo: refNo,
			branch: branch,
			paymentDate:  new Date(),
			trackPayAs: "bill",
			date:  new Date(),
			clientId: clientId,
			isEditable: false,
			createdBy: user
		};

		let voucherId = false;

		if (body.amount) {

			await addLedger({
				account: oAssets.assetsAc._id,
				accountName: oAssets.assetsAc.name,
				amount: body.amount,
				type: 'CR'
			});

				await addLedger({
					account: oAssets.depreciationAc._id,
					accountName:  oAssets.depreciationAc.name,
					amount: body.amount,
					type: 'DR',
					oBill: {
						billNo: oAssets.purBill.refNo,
						billType: 'Against Ref',
						amount: body.amount,
						remAmt: body.amount
					}
				});

		}

		oVoucher.ledgers = aLedger;

		if (!voucherId) {
			oVoucher._id = mongoose.Types.ObjectId();
			await multiVoucher.add(oVoucher);
			await multiVoucher.exec();
			return oVoucher;

		} else {
			oVoucher._id = voucherId;
			await voucherService.editVoucher(oVoucher);
			return oVoucher;
		}

		return false;

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
