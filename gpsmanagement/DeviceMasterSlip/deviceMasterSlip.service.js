const DeviceMasterSlip = require('./deviceMasterSlip.model');
const deviceMasterUtil = require('./deviceMasterSlip.utility');
const NO_OF_DOCS = 15;

module.exports.addSlip = async data => {
	const slip_number = await deviceMasterUtil.generateSlipNumber({clientId: data.clientId});
	return DeviceMasterSlip.create({...data, slip_number});
};

module.exports.getSlips = async query => (
	await DeviceMasterSlip
		.find(query)
		.populate('issued_to', 'full_name')
		.populate('issued_by', 'full_name')
		.populate('returned_by', 'full_name')
		.populate('returned_to', 'full_name')
		.then()
);

const allowedSearchFields = {'_id':1, 'issued_by':1, 'issued_to':1, 'issued_date':1, 'slip_type':1};
/*
const projection = {
	_id: 1,
	so_number: 1,
	customer: 1
};*/

function createSlipAggrFilter(reqQuery) {
	let obj;
	const aggrFilter = [];
	for (let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === "_id" || key === "issued_by" || key === "issued_to") {
				obj = {};
				obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
				aggrFilter.push({$match: obj});
			} else if (key === "issued_date") {
				obj = {};
				let dateArr = reqQuery[key].split(",");
				let startDate = new Date(dateArr[0]);
				dateArr.length === 2
					? aggrFilter.push({$match: {issued_date: {$gte: new Date(dateArr[0]), $lt: new Date(dateArr[1])}}})
					: aggrFilter.push({
						$match: {
							issued_date: {
								$gte: new Date(dateArr[0]),
								$lt: new Date(startDate.setDate(startDate.getDate() + 1))
							}
						}
					});
			} else if (key === "slip_type") {
				obj = {};
				let statusArr = reqQuery[key].split(",");
				statusArr.length >= 2
					? aggrFilter.push({$match: {slip_type: {$in: statusArr}}})
					: aggrFilter.push({$match: {slip_type: statusArr[0]}});
			} else {
				obj = {};
				obj[key] = reqQuery[key];
				aggrFilter.push({$match: obj});
			}
		}
	}
	return aggrFilter;
}

module.exports.searchSlips = function (reqQuery, cb) {
	const aggrFilter = createSlipAggrFilter(reqQuery);
	if (reqQuery.sort) {
		aggrFilter.push({$sort: {created_at: parseInt(reqQuery.sort)}})
	}
	if (reqQuery.trim) {
		aggrFilter.push({$project: projection});
	}
	const datacursor = DeviceMasterSlip.aggregate(aggrFilter);
	aggrFilter.push({$group: {_id: null, count: {$sum: 1}}});
	const countCursor = DeviceMasterSlip.aggregate(aggrFilter);
	let no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;
	if (no_of_documents > NO_OF_DOCS) {
		no_of_documents = NO_OF_DOCS;
	}
	if (reqQuery.skip) {
		const skip_docs = (reqQuery.skip - 1) * no_of_documents;
		datacursor.skip(parseInt(skip_docs));
	}
	return countCursor.exec(function (err, countArr) {
		if (err) {
			cb(err, null);
			return;
		}
		if (countArr.length > 0) {
			const count = countArr[0].count;
			let no_of_pages;
			if ((count / no_of_documents) > 1) {
				no_of_pages = Math.ceil(count / no_of_documents);
			} else {
				no_of_pages = 1;
			}
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}
			datacursor.exec(function (err, Slips) {
				if(err) {
					cb(err, null);
					return;
				}
				DeviceMasterSlip.populate(Slips, [
						{path: "issued_by", select: "full_name _id"},
						{path: "issued_to", select: "full_name _id"},
						{path: "returned_to", select: "full_name _id"},
						{path: "returned_by", select: "full_name _id"}
					],
					function (err, populatedTransactions) {
						if (err) {
							cb(err, null);
							return;
						}
						const objToReturn = {};
						objToReturn.Slips = populatedTransactions;
						objToReturn.pages = no_of_pages;
						objToReturn.count = count;
						return cb(null, objToReturn);
					});
			});
		} else {
			const objToReturn = {};
			objToReturn.Slips = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return objToReturn;
		}
	});
};
