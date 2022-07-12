// ********* Created by Dev Dhakad on 09/12/21. **********
// Diesel Petrol Hike (DPH)

'use strict';

let moment = require('moment');
let mongoose = require('mongoose');
const validate = require('express-validation');
const serverSidePage = require("../../utils/serverSidePagination");
let dphModel = commonUtil.getModel('dph');
var serverSidePagination = promise.promisifyAll(require('../../utils/serverSidePagination'));


const ALLOWED_FILTER =['from', 'to', 'customer'];

function constructFilters(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				// if (!oQuery.dateType || oQuery.dateType === 'date') {
				oFilter[oQuery.dateType || 'date'] = oFilter[oQuery.dateType || 'date'] || {};
				oFilter[oQuery.dateType || 'date'].$gte = startDate;
				// }
			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				// if (!oQuery.dateType || oQuery.dateType === 'date') {
				oFilter[oQuery.dateType || 'date'] = oFilter[oQuery.dateType || 'date'] || {};
				oFilter[oQuery.dateType || 'date'].$lte = endDate;
				// }
			}
			else if (i === 'customer') {
				oFilter[i] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			}
			else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

async function add(body, req) {

	try {


		let oFilter = {
			clientId: req.user.clientId,
			customer: body.customer,
			date: body.date,
		};

		let prepareDuesObj = {
		...body
		};

		let savedDph = await dphModel.findOneAndUpdate(oFilter, {$set: prepareDuesObj}, {
			new: true,
			upsert: true
		});

		return savedDph;

	}catch (e) {
		console.log(e);
		throw e;
	}
}


async function find(body, user, req) {
	try{

		let oFilter = {
			clientId: user.clientId,
			...constructFilters(body)
		};

		if(!body.download)
			body.no_of_docs = body.no_of_docs || 10;
		else
			body.no_of_docs	= 1000;

		body.skip = body.skip || 1;

		let aggrQuery = [
			{$match: oFilter},
			{ $sort: body.sort || {date: -1} },
			{ $skip: (body.no_of_docs * body.skip) - body.no_of_docs },
			{ $limit: body.no_of_docs },
		];

		const dphData = await dphModel
			.aggregate(aggrQuery)
			.allowDiskUse(true);

		return { data: dphData };
	}catch (e) {
		console.log('error => ', e);
		throw e;
	}

}

module.exports = {
	add,
	find
};
