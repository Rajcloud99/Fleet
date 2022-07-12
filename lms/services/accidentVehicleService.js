var AccidentVehicle = promise.promisifyAll(commonUtil.getModel('accidentVehicle'));
// const serverSidePage = require('../../utils/serverSidePagination');
var allowedFilter = ['_id','plcyNo','plcytyp','place','policeFIR','spotSrvyName','claimNo','workshopName','estCost','vehicle','from', 'to'];


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
			}else if (i == 'vehicle') {
				fFilter[i] = otherUtil.arrString2ObjectId(query[i]);
			}else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

module.exports.addAccidentVehicle = function(reqQuery,next) {
	var accidentVehicle = new AccidentVehicle(reqQuery);
	accidentVehicle.saveAsync(reqQuery)
		.then(function(accidentVehicle) {
			//counterUtil.incrementICDCount();
			winston.info("added accident Vehicle",JSON.stringify(accidentVehicle));
			return next(null, accidentVehicle);
		})
		.catch(function(err) {
			winston.error("error in add accident Vehicle:" + err);
			return next(err);
		});
};

module.exports.updateAccidentVehicleId = function(id,reqQuery,next) {
	AccidentVehicle.findOneAndUpdateAsync({_id:id},{$set:reqQuery},{new:true})
		.then(function(accidentVehicle) {
			winston.info("updated accident Vehicle ", JSON.stringify(accidentVehicle));
			return next(null, accidentVehicle);
		})
		.catch(function(err) {
			winston.error("error in update accident Vehicle:" + err);
			return next(err);
		});
};

module.exports.allAccidentVehicles = function(reqBody,next){
	reqBody.no_of_docs = reqBody.no_of_docs || 10;
	reqBody.skip = reqBody.skip || 1;
	var oVehicle = constructFilters(reqBody);
	const aggQuery = [
		{$match: oVehicle},
		{$sort: {_id: -1}},
		{$skip: ((reqBody.no_of_docs * reqBody.skip) - reqBody.no_of_docs)},
		{$limit: reqBody.no_of_docs},
		{$lookup: {from: 'dues', localField: 'vehicle', foreignField: '_id', as: 'vehicle'}}
	];
	const aggrCursor = AccidentVehicle.aggregate(aggQuery);
	aggrCursor.options = {allowDiskUse: true, batchSize: 1000};
	aggrCursor.exec(function (err, aData) {
		if (err) {
			return next(err);
		}
		next(null, {data: aData});
	});
};

module.exports.deleteAccidentVehicleId = function(id,next) {
	AccidentVehicle.removeAsync({_id:id})
		.then(function(removed) {
			winston.info("removed accident Vehicle",JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function(err) {
			winston.error("error in remove accident Vehicle " + err);
			return next(err);
		});
};



