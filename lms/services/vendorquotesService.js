const VendorQuote = commonUtil.getModel('vendorquotes');
const serverSidePage = require('../../utils/serverSidePagination');
let allowedFilter = ['customer','vendor','clientId','booking','finalised.status','_id'];

var constructFilters = function (query) {
	var fFilter = {};
	for (i in query) {
		if (otherUtil.isAllowedFilter(i, allowedFilter)) {
			if (i === 'start_date') {
				let startDate = new Date (query[i]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				fFilter["booking_date"] = fFilter["booking_date"] || {};
				fFilter["booking_date"].$gte = startDate;
			} else if (i === 'end_date') {
				let endDate = new Date (query[i]);
				endDate.setSeconds (59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				fFilter['booking_date'] = fFilter['booking_date'] || {};
				fFilter['booking_date'].$lte = endDate;
			} else if (i === 'customer_id') {
				fFilter['customer'] = query[i];
			}  else if (i === 'customer') {
				fFilter['customer'] =  mongoose.Types.ObjectId(query[i]);
			}else if (i === 'booking') {
				fFilter['booking'] =  mongoose.Types.ObjectId(query[i]);
			}else if (i === 'vendor') {
				fFilter['vendor'] =  mongoose.Types.ObjectId(query[i]);
			}else if (i === '_id') {
				fFilter['_id'] =  mongoose.Types.ObjectId(query[i]);
			}else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

async function addVQuote(query) {
	return await VendorQuote.create(query);
}

async function updateVQuote(query,body) {
	let pUpdate = {};
	if (body.set) {
		pUpdate.$set = body.set
	}
	if (body.addToSet) {
		pUpdate.$addToSet = body.addToSet;
	}
	if (body.pull) {
		pUpdate.$pull = body.pull;
	}

	if (Object.keys(pUpdate).length) {
		return await VendorQuote.updateOne(query, pUpdate);
	}
	return null;
}

async function removeVQuote(query) {
	if (Object.keys(query).length) {
		let savedData = await VendorQuote.remove(query);
		if (savedData) {
			return savedData;
		} else {
			return null;
		}
	} else {
		return null;
	}
};

async function getVQuote(query) {
	let oFil = constructFilters(query);
	let prj = {clientId:1,'vendor.name':1,'vendor.pan_no':1,'vendor._id':1,customer:1,booking:1,date:1,route:1,rname:1,
	'vt':1,payment_type:1,finalised:1,rate:1,pmtRate:1,perUnitPrice:1,totalUnits:1,minPayableAmt:1,pmtWeight:1,
		advance:1,toPay:1,munshiyana:1,total:1,remark:1,advance_due_date:1,topay_due_date:1,weight_type:1,
		created_By:1,updated_By:1,createdAt:1,	updatedAt:1,vehicleType:1,history:1,status:1, closedReason:1,weightPercent:1};
	const aggrQuery = [
		{
		  "$match": oFil
		},
		{$limit:query.no_of_docs || 20},
		{
			$lookup: {
				from: 'vendortransports',
				localField: 'vendor',
				foreignField: '_id',
				as: 'vendor'
			}
		},
		{
			$unwind: {
				path: '$vendor',
				preserveNullAndEmptyArrays: true
			}
		},
		{$project:prj}
	];
	let oQuery = {aggQuery: aggrQuery, no_of_docs: query.no_of_docs || 20};

	let aVQ = await serverSidePage.requestData(VendorQuote, oQuery);
	return aVQ;
}

module.exports = {
	addVQuote,
	getVQuote,
	updateVQuote,
	removeVQuote
};
