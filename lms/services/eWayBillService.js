const EwayBill = commonUtil.getModel('eWayBill');
const serverSidePage = require('../../utils/serverSidePagination');

const ALLOWED_FILTER = ['_id', 'Name','vehicleNo','transDocNo','toPlace', 'docNo','ewbNo' ,'docType', 'company', 'date', 'fromDate', 'toDate','status'];

function constructFilters(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'name') {
				oFilter[i] = otherUtil.searchRegex(oQuery[i]);
			}
			else if (otherUtil.isBSON(oQuery[i])) {
				oFilter[i] = otherUtil.toBSON(oQuery[i]);
			}else if ( i === 'fromDate') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				oFilter[oQuery["dateType"]] = oFilter[oQuery["dateType"]] || {};
				oFilter[oQuery["dateType"]].$gte = startDate;
			} else if ( i === 'toDate') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				oFilter[oQuery["dateType"]] = oFilter[oQuery["dateType"]] || {};
				oFilter[oQuery["dateType"]].$lte = endDate;
			} else {
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
		const EwayBillQuery = [
			{ $match: oFilter },
			{ $sort: body.sort || {_id: -1} },
			{ $skip: (body.no_of_docs * body.skip) - body.no_of_docs },
			{ $limit: body.no_of_docs },
			{ $unwind: { path: '$itemList', preserveNullAndEmptyArrays: true } },
			{ $unwind: { path: '$VehiclListDetails', preserveNullAndEmptyArrays: true } },
		];
		const EwayBillData = await EwayBill
			.aggregate(EwayBillQuery)
			.allowDiskUse(true);

		return { data: EwayBillData };

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function find2(body, user, type, req) {

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
		const EwayBillQuery = [
			{ $match: oFilter },
			{ $sort: body.sort || {_id: -1} },
			{ $skip: (body.no_of_docs * body.skip) - body.no_of_docs },
			{ $limit: body.no_of_docs }
		];
		const EwayBillData = await EwayBill
			.aggregate(EwayBillQuery)
			.allowDiskUse(true);

		return { data: EwayBillData };

	}catch (e) {
		console.log(e);
		throw e;
	}
}

module.exports = {
	find,
	find2
};
