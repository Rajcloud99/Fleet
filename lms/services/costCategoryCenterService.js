let CostCategory = commonUtil.getModel('costCategory');
let CostCenter = commonUtil.getModel('costCenter');
let Voucher = commonUtil.getModel('voucher');
const serverSidePage = require('../../utils/serverSidePagination');

module.exports = {
	findCategory,
	findCenter,
	addCategory,
	addCenter,
	updateCategory,
	updateCenter,
	deleteCenter,
	// costCenterReport
};

function categoryFilter(body) {
	let oFilter = {};

	["_id", 'name'].forEach(key => {
		let val;
		if(!(val = body[key]))
			return;

		if(key === 'name')
			oFilter[key] = new RegExp('^' + (val.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')), 'i');
		else
			oFilter[key] = val;
	})
	return oFilter;
}

function centerFilter(body) {
	let oFilter = {};

	["_id", 'name', 'feature', 'branch', 'category', 'from', 'to'].forEach(key => {
		let val;
		if(!(val = body[key]))
			return;

		if(key === 'name')
			oFilter[key] = new RegExp('^' + (val.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')), 'i');
		else if(key === 'feature')
			oFilter[key] = Array.isArray(val) ? {$in: val} : val;
		else if(key === 'category')
			oFilter[`category._id`] = otherUtil.arrString2ObjectId(val);
		else if(key === 'branch')
			oFilter[`branch._id`] = Array.isArray(val) ? {$in: otherUtil.arrString2ObjectId(val)} : otherUtil.arrString2ObjectId(val);
		else if(key === 'from'){
			let startDate = new Date(val);
			startDate.setSeconds(0);
			startDate.setHours(0);
			startDate.setMinutes(0);
			startDate.setMilliseconds(0);
			oFilter["created_at"] = oFilter["created_at"] || {};
			oFilter["created_at"]["$gte"] = startDate;
		}
		else if(key === 'to'){
			let endDate = new Date(val);
			endDate.setSeconds(59);
			endDate.setHours(23);
			endDate.setMinutes(59);
			oFilter["created_at"] = oFilter["created_at"] || {};
			oFilter["created_at"]["$lte"] = endDate;
		}
		else
			oFilter[key] = val;
	})

	return oFilter;
}

async function findCategory(body, req) {
	let oFilter = categoryFilter(body);
	oFilter.clientId = req.user.clientId;

	if(!body.download)
		body.no_of_docs = body.no_of_docs || 10;
	else
		body.no_of_docs	= 1000;

	if(!body.sort)
		body.sort = {date:-1};

	body.skip =  body.skip || 1;

	let aggrQuery = [
		{ $match: oFilter },

		...(body.projection ? [{ $project: body.projection }] : []),

		{ $sort: body.sort || {_id: -1} },
		{ $skip: (body.no_of_docs * body.skip) - body.no_of_docs },
		{ $limit: body.no_of_docs }
	];

	return await CostCategory.aggregate(aggrQuery);
}

async function findCenter(body, req) {
	let oFilter = centerFilter(body);
	oFilter.clientId = req.user.clientId;
	oFilter.deleted = {$ne: true};
	if(!body.download)
		body.no_of_docs = body.no_of_docs || 10;
	else
		body.no_of_docs	= 1000;

	if(!body.sort)
		body.sort = {date:-1};

	body.skip = body.skip || 1;

	let aggrQuery = [
		{ $match: oFilter },

		...(body.projection ? [{ $project: body.projection }] : []),

		{ $sort: body.sort || {_id: -1} },
		{ $skip: (body.no_of_docs * body.skip) - body.no_of_docs },
		{ $limit: body.no_of_docs }
	];

	return await CostCenter.aggregate(aggrQuery);
}

async function addCategory(body, req) {
	try {
		body.created_by = req.user.full_name;
		return await (new CostCategory(body)).save();
	}catch (e) {
		throw e;
	}
}

async function addCenter(body, req) {
	try {
		body.created_by = req.user.full_name;
		body.created_at = new Date();
		delete body.last_modified_by;

		return await (new CostCenter(body)).save();
	}catch (e) {
		throw e;
	}
}

async function updateCategory(_id, body, req) {
	try {
		body.last_modified_by = req.user.full_name;

		let foundCostCategory = await CostCategory.findOne({
			_id
		}, {_id: 1, name: 1});

		if(!(foundCostCategory && foundCostCategory._id))
			throw new Error('Cost Category Not Found');

		if(await isCategoryUsedOnVoucher(foundCostCategory.name))
			throw new Error('Cannot update Cost Category,  voucher created.');

		await CostCategory.findOneAndUpdate({_id: otherUtil.arrString2ObjectId(_id)}, {
			$set: body
		});

		await CostCenter.updateMany({"category._id": otherUtil.arrString2ObjectId(_id)}, {
			$set: {
				"category.name": body.name
			}
		});
	}catch (e) {
		throw e;
	}
}

async function updateCenter(_id, body, req) {
	try {
		body.last_modified_by = req.user.full_name;
		body.last_modified_at = new Date();

		let foundCostCenter = await CostCenter.findOne({
			_id
		});

		if(!(foundCostCenter && foundCostCenter._id))
			throw new Error('Cost Center Not Found');

		if(await isCenterUsedOnVoucher(foundCostCenter.name))
			throw new Error('Cannot update Cost Center, voucher created.');

		await CostCenter.findOneAndUpdate({_id: otherUtil.arrString2ObjectId(_id)}, {
			$set: body
		});
	}catch (e) {
		throw e;
	}
}

async function isCategoryUsedOnVoucher(category) {
	!!(await Voucher.count({"ledgers.costCategory.category": category}));
}

async function isCenterUsedOnVoucher(center) {
	!!(await Voucher.count({"ledgers.costCategory.center.name": center}));
}

async function deleteCenter(center, res){
	try{
		let aggQuery = [
			{
				"$match": {
					//   "_id" : ObjectId("609e59bbeb75053ea880adb0")
					"ledgers": {$exists: true, $ne:[]}
				}
			},
			{
				"$project":{ "ledgers": 1}
			},
			{
				"$unwind": {
					"path": "$ledgers",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$match": {
					"ledgers.costCategory": {"$exists": true, "$ne":[]}
				}
			},
			{
				"$project":{ "ledgers.costCategory": 1}
			},
			{
				"$unwind": {
					"path": "$ledgers.costCategory",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$match": {
					"ledgers.costCategory.center": { "$exists": true, "$ne": []}
				}
			},
			{
				"$unwind": {
					"path": "$ledgers.costCategory.center",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$match": {
					"ledgers.costCategory.center.centerId": { "$exists": true, "$ne": []}
				}
			},
			{
				"$project": {
					"voucher_costCenter" : "$ledgers.costCategory.center"
				}
			}
		];

		let oQuery = {aggQuery: aggQuery, no_of_docs: 10000};
		let dbData = await serverSidePage.requestData(Voucher, oQuery);

		dbData.map(obj => {
			if(obj.voucher_costCenter.centerId === center._id){
				return res.status(500).send({
					message : "Can't Delete Vocher Associated Cost-Center."
				});
			}
		});
		await CostCenter.update({_id : center._id}, {
			$set : { deleted: true }
		});
		return res.status(200).json({
			'status': 'OK',
			'message': 'Cost-Center Deleted',
		});
		// CostCenter.findById(center._id)
		// 	.then(function(remove){
		// 			if(!remove){
		// 				return res.status(404).send({
		// 					message: "Cost center not found"
		// 				});
		// 			}else{
		// 				  CostCenter.update({_id : center._id}, {
		// 					$set : { delete: true }
		// 				});
		// 				res.send({ message : "Cost Center deletes successfully"});
		// 			}
		// 	}).catch(function (err) {
		// 			return res.status(500).send({
		// 				message : "Cost center not deleted"
		// 			});
		// })
	}catch(err){
		return res.status(500).send({
							message : "Cost center not deleted"
						});
	}

}

// async function costCenterReport(req, res){
// 	try{
// 		const oF = centerFilter(req.body);
// 		let oProj = {"name": 1, "feature" :1, "category" :1, "branch" :1, "created_by": 1, "created_at" :1, "last_modified_by" : 1,	"last_modified_at": 1};
// 		let aggrQuery = [{$match: oF},
// 			{
// 				$sort: {created_at: 1}
// 			},
// 			{$project: oProj},
// 		];
// 		const costCenterData = await CostCenter.aggregate(aggrQuery).allowDiskUse(true);
// 		return costCenterData;
// 	}catch(err){
// 		throw err.message;
// 	}
// }
