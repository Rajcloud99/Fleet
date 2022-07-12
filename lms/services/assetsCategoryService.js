const AssetsCategory = commonUtil.getModel('assetsCategory');
const serverSidePage = require('../../utils/serverSidePagination');

const ALLOWED_FILTER =['_id', 'account', 'name', 'phyStatus', 'effectiveDate',"from", "to", "from_date", "end_date", "start_date", "end_date", "effectiveDate", "category"];
const ALLOWED_KEY_TO_UPDATE =['account'];

module.exports = {
	find,
	add,
	edit,
	remove,
	findDetail

};

function constructFilters(oQuery) {
	let oFilter = {};

	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from_date' || i === 'start_date' || i ==='from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$gte = startDate;
				if (oQuery.dateType || oQuery.dateType === 'effectiveDate') {
					oFilter["effectiveDate"] = oFilter["effectiveDate"] || {};
					oFilter["effectiveDate"].$gte = startDate;
				}
			} else if (i === 'to_date' || i === 'end_date' || i ==='to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				oFilter["created_at"] = oFilter["created_at"] || {};
				oFilter["created_at"].$lte = endDate;
				if (oQuery.dateType || oQuery.dateType === 'effectiveDate') {
					oFilter["effectiveDate"] = oFilter["effectiveDate"] || {};
					oFilter["effectiveDate"].$lte = endDate;
				}
				}
			// else if (i === 'start_date') {
				// 	let startDate = new Date (oQuery[i]);
				// 	startDate.setSeconds (0);
				// 	startDate.setHours (0);
				// 	startDate.setMinutes (0);
				// 	oFilter["date"] = oFilter["date"] || {};
				// 	oFilter["date"].$gte = startDate;
				// } else if (i === 'end_date') {
				// 	let endDate = new Date (oQuery[i]);
				// 	endDate.setSeconds(59);
				// 	endDate.setHours (23);
				// 	endDate.setMinutes (59);
				// 	oFilter["date"] = oFilter["date"] || {};
				// 	oFilter["date"].$lte = endDaeffectiveDatete;
				// }
				else if (i === '_id') {
					oFilter[i] = {
						$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
					};
				} else if (i === 'name') {
					let key = typeof oQuery[i] === 'object' ? oQuery[i].key : oQuery[i];
					if (oQuery[i].indexOf(' ') + 1) {
						oFilter[i] = new RegExp(key.trim().replace(/[|\\{}()[\]^$+*?.]/g, ' ').replace(/[ ]+/g, '__SEPERATOR__').split('__SEPERATOR__').join('.*'), 'i');
					} else {
						oFilter[i] = new RegExp(`^${key.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}`, 'im');
					}
				}else if (i === 'category') {
				let key = typeof oQuery[i] === 'object' ? oQuery[i].key : oQuery[i];
				if (oQuery[i].indexOf(' ') + 1) {
					oFilter[i] = new RegExp(key.trim().replace(/[|\\{}()[\]^$+*?.]/g, ' ').replace(/[ ]+/g, '__SEPERATOR__').split('__SEPERATOR__').join('.*'), 'i');
				} else {
					oFilter[i] = new RegExp(`^${key.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}`, 'im');
				}
			}
				else if (i === 'phyStatus') {
				let key = typeof oQuery[i] === 'object' ? oQuery[i].key : oQuery[i];
				if (oQuery[i].indexOf(' ') + 1) {
					oFilter[i] = new RegExp(key.trim().replace(/[|\\{}()[\]^$+*?.]/g, ' ').replace(/[ ]+/g, '__SEPERATOR__').split('__SEPERATOR__').join('.*'), 'i');
				} else {
					oFilter[i] = new RegExp(`^${key.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}`, 'im');
				}
			}
				else if (i === 'account') {
					oFilter['account'] = otherUtil.arrString2ObjectId(oQuery[i]);
				} else {
					oFilter[i] = oQuery[i];
				}

			// }
		}

	}
	return oFilter;
}

async function find(query) {

	try{
		query.no_of_docs = query.no_of_docs || 10;
		query.skip = query.skip || 1;
		let oFil = constructFilters(query, true);
		let foundCategory = await AssetsCategory.find(oFil, {}).skip(((query.no_of_docs * query.skip) - query.no_of_docs)).limit(query.no_of_docs).populate({path:'account' , select:'name'});

		if(!(foundCategory && foundCategory[0]))
			throw new Error('No Category Found');


		return foundCategory;



	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function findDetail(data) {

	try{
		console.log(data)
		let foundCategory = await AssetsCategory.find({_id:data._id}).populate({path:'account' , select:'name'});

		if(!(foundCategory && foundCategory[0]))
			throw new Error('No Credit Note Found');


		return foundCategory;



	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function add(data) {

	try {
		let savedCategory = await (new AssetsCategory(data)).save();

		return savedCategory;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function edit(_id, body) {

	try {
		let foundCategory = await AssetsCategory.findOne({_id});

		if(!foundCategory)
			throw new Error('No Credit Note Found');

		let oUpdatedCreditNote = await AssetsCategory.findOneAndUpdate({_id},{$set:body});
		return oUpdatedCreditNote;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function remove(_id) {

	try {

		let foundCategory = await AssetsCategory.findOne({_id});

		if(!foundCategory)
			throw new Error('No Credit Note Found');

		let oUpdatedCreditNote = await AssetsCategory.findOneAndRemove({_id});
		return oUpdatedCreditNote;
	}catch (e) {
		console.log(e);
		throw e;
	}
}


