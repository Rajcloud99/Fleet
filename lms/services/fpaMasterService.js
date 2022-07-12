const mongoose = require('mongoose');

const ALLOWED_FIELDS = ['customer', 'vendor', 'date'];

function constructIncentiveFilter(obj) {
	const oFilter = {};
	for (key in obj) {
		if (obj.hasOwnProperty(key) && (ALLOWED_FIELDS.indexOf(key) > -1)) {
			if (key === 'date') {
				let endOfTheDate = new Date(obj[key]);
				endOfTheDate.setHours(23,59,59,999);
				oFilter[key] = { $lte: endOfTheDate };
			} else if (key === 'customer' || key === 'vendor') {
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
	oOption.skip = obj.skip || 0;
	oOption.limit = obj.no_of_docs || 10;
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

module.exports = function(fpaMasterSchema) {

	// Get new incentives
	fpaMasterSchema.statics.get = function (obj) {
		const oQuery = constructIncentiveFilter(obj);
		const oOptions = constructIncentiveOption(obj);
		const oProjection = constructIncentiveProjection(obj);
		return this.find(oQuery, oProjection, oOptions);
	};

	// Add new incentive
	fpaMasterSchema.statics.add = function (obj) {
		return this.create(obj);
	};

	// Autosuggest incentive
	fpaMasterSchema.statics.autosuggest = function (obj) {
		const oQuery = constructIncentiveFilter(obj);
		const oProjection = constructIncentiveProjection(obj);
		return this.find(oQuery, oProjection).sort({date: -1}).limit(1).then(fpa => fpa[0]);
	};

};
