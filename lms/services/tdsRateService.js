const TdsRates = commonUtil.getModel('tdsRates');


module.exports = {
	add,
	find
};

const ALLOWED_FILTER =["date"];

function constructFilters(oQuery) {
	let oFilter = {};

	for (i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'date') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				oFilter["start"] = oFilter["start"] || {};
				oFilter["start"].$lte = startDate;

				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				oFilter["end"] = oFilter["end"] || {};
				oFilter["end"].$gte = endDate;
			} else {
				oFilter[i] = oQuery[i];
			}

			// }
		}
	}
	return oFilter;
}

async function find(req) {
	try{
		let query = req.body;
		query.no_of_docs = query.no_of_docs || 10;
		query.skip = query.skip || 1;
		let oFil = constructFilters(query, true);
		oFil.clientId = req.body.cClientId || req.user.clientId;
		let foundTDS = await TdsRates.find(oFil, {}).skip(((query.no_of_docs * query.skip) - query.no_of_docs)).limit(query.no_of_docs);

		if(!(foundTDS && foundTDS[0]))
			throw new Error('No TDS Rate Found');


		return foundTDS;

	}catch (e) {
		console.log(e);
		throw e;
	}
}

async function add(data) {

	try {
		let savedTDS = await (new TdsRates(data)).save();

		return savedTDS;

	}catch (e) {
		console.log(e);
		throw e;
	}
}



