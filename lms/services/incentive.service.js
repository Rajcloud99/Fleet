  const mongoose = require('mongoose');

const ALLOWED_FIELDS = ['customer', 'vehicle', 'date', 'effectiveStart', 'effectiveEnd', 'from', 'to'];

function constructIncentiveFilter(obj) {
	const oFilter = {};
	for (key in obj) {
		if (obj.hasOwnProperty(key) && (ALLOWED_FIELDS.indexOf(key) > -1)) {
			if (key === 'from') {
				let startOfTheDate = new Date(obj[key]);
				startOfTheDate.setHours(0, 0, 0, 0);
				oFilter['effectiveStart'] = {$gte: startOfTheDate};
			}else if (key === 'to') {
				let endOfTheDate = new Date(obj[key]);
				endOfTheDate.setHours(23, 59, 59, 999);
				oFilter['effectiveEnd'] = {$lte: endOfTheDate};
			}else if (key === 'date') {
				let endOfTheDate = new Date(obj[key]);
				endOfTheDate.setHours(23,59,59,999);
				oFilter['effectiveStart'] = { $lte: endOfTheDate };
			} else if (key === 'customer' || key === 'vehicle') {
				oFilter[key] = mongoose.Types.ObjectId(obj[key]);
			} else {
				oFilter[key] = obj[key];
			}
		}
	}
	return oFilter;
}

function constructIncentiveOption(obj) {
	const oOption = {};
	oOption.limit = obj.no_of_docs || 10;
	if(obj.skip && obj.skip>0){
		oOption.skip = (obj.skip-1)*oOption.limit;
	}else{
		oOption.skip = 0;
	}
	return oOption;
}

function constructIncentiveProjection(obj) {
	let oProject = {};
	if(obj.projection) {
		oProject = obj.projection.split(',').reduce((acc, curr) => {
			var isExclamation = curr.slice(0, 1) === '!';
			return { ...acc, [isExclamation ? curr.slice(1) : curr]: !isExclamation };
		}, {});
	}
	return oProject;
}

module.exports = function(incentiveSchema) {

	// Get new incentives
	incentiveSchema.statics.get = function (obj) {
		const oQuery = constructIncentiveFilter(obj);
		const oOptions = constructIncentiveOption(obj);
		const oProjection = constructIncentiveProjection(obj);
		return this.find(oQuery, oProjection, oOptions);
	};

	// Add new incentive
	incentiveSchema.statics.add = function (obj) {
		return this.create(obj);
	};

	// Autosuggest incentive
	incentiveSchema.statics.autosuggest = function (obj) {
		const oQuery = constructIncentiveFilter(obj);
		return this.find(oQuery).sort({effectiveStart: -1}).limit(1).then(incentive => incentive[0]);
	};

};
