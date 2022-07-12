var DriverCounselling = promise.promisifyAll(commonUtil.getModel('driverCounselling'));
// const serverSidePage = require('../../utils/serverSidePagination');
var allowedFilter = ['_id','vehicle','from', 'to','driverCode','avgRun','driverBalCopy','driverBalSystem','fleet'];


var constructFilters = function (query) {
	var fFilter = {};
	for (var i in query) {
		if (otherUtil.isAllowedFilter(i, allowedFilter)) {
			if (i === 'from') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				fFilter[query.dateType || 'date'] = fFilter[query.dateType || 'date'] || {};
				fFilter[query.dateType || 'date'].$gte = startDate;
			} else if (i === 'to') {
				let endDate = new Date(query[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				fFilter[query.dateType || 'date'] = fFilter[query.dateType || 'date'] || {};
				fFilter[query.dateType || 'date'].$lte = endDate;
			}else if (i == '_id') {
				fFilter[i] = otherUtil.arrString2ObjectId(query[i]);
			} else if (i === 'vehicle') {
				if (query[i] && query[i] != "undefined" && query[i].length > 0) {
					fFilter['vehicle'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(query[i]) ? query[i] : [query[i]])};
				}
			}else if (i == 'driverCode') {
				fFilter[i] = otherUtil.arrString2ObjectId(query[i]);
			}else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

module.exports.addDriverCounselling = function(reqQuery,next) {
	var driverCounselling = new DriverCounselling(reqQuery);
	driverCounselling.saveAsync(reqQuery)
		.then(function(driverCounselling) {
			//counterUtil.incrementICDCount();
			winston.info("added driver Counselling",JSON.stringify(driverCounselling));
			return next(null, driverCounselling);
		})
		.catch(function(err) {
			winston.error("error in add driver counselling:" + err);
			return next(err);
		});
};

module.exports.allDriverCounselling = function(reqBody,next){
	reqBody.no_of_docs = reqBody.no_of_docs || 10;
	reqBody.skip = reqBody.skip || 1;
	var oDriver = constructFilters(reqBody);
	const aggQuery = [
		{$match: oDriver},
		{$sort: {_id: -1}},
		{$skip: ((reqBody.no_of_docs * reqBody.skip) - reqBody.no_of_docs)},
		{$limit: reqBody.no_of_docs},
		{$lookup: {from: 'registeredvehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle'}},
		{$lookup: {from: 'drivers', localField: 'driverCode', foreignField: '_id', as: 'driverCode'}}
	];
	const aggrCursor = DriverCounselling.aggregate(aggQuery);
	aggrCursor.options = {allowDiskUse: true, batchSize: 1000};
	aggrCursor.exec(function (err, aData) {
		if (err) {
			return next(err);
		}
		next(null, {data: aData});
	});
};

module.exports.deleteDriverCounsellingId = function(id,next) {
	DriverCounselling.removeAsync({_id:id})
		.then(function(removed) {
			winston.info("removed Driver Counselling",JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function(err) {
			winston.error("error in remove Driver Counselling " + err);
			return next(err);
		});
};



