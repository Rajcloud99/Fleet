
var Consignor_Consignee = promise.promisifyAll(commonUtil.getModel('consignor_consignee'));
let Async = require('async');


module.exports.addConsignor_Consignee = function(reqBody, next) {
	reqBody.created_at = new Date();
	if(reqBody.lat && reqBody.lng){
		reqBody.location = {
			type: 'Point',
				coordinates: [reqBody.lng, reqBody.lat]
		}
	}
	var consignor_ee = new Consignor_Consignee(reqBody);
	consignor_ee.saveAsync(reqBody)
		.then(function(consign) {
			winston.info("added new consignor" + JSON.stringify(consign));
			return next(null, consign);
		}).catch(function(err) {
		return next(err);
	});
};

module.exports.findConsignor_ConsigneeId = function(id, next) {
	Consignor_Consignee.findAsync({
		"_id": id
	})
		.then(function(consign) {
			return next(null, consign);
		})
		.catch(function(err) {
			return next(err);
		});
};

module.exports.findConsignor_ConsigneeQuery = function(query, next) {
	Consignor_Consignee.findAsync(query)
		.then(function(consign) {
			return next(null, consign);
		})
		.catch(function(err) {
			return next(err);
		});
};

module.exports.updateConsignor_ConsigneeId = function(id, reqBody, next) {
	Consignor_Consignee.findOneAndUpdateAsync({
		_id: id
	}, {
		$set: reqBody
	}, {
		new: true
	})
		.then(function(updated) {
			return next(null, updated);
		}).catch(function(err) {
		return next(err);
	});
};

module.exports.updateDriverIdSetPush = function(id, newData, next) {
	var newDetails = {};
	if (newData.toSet) {
		newDetails["$set"] = newData.toSet;
	}
	if (newData.toPush) {
		newDetails["$push"] = newData.toPush;
	}
	Consignor_Consignee.findOneAndUpdateAsync({
		_id: id
	}, newDetails, {
		new: true
	})
		.then(function(updated) {
			return next(null, updated);
		}).catch(function(err) {
		return next(err);
	});
};

module.exports.deleteConsignor_ConsigneeId = function(id, next) {
	 Consignor_Consignee.deleteOne({
		_id: id
	})
		.then(function(removed) {
			return next(null, removed);
		}).catch(function(err) {
		return next(err);
	});
};


var allowedSearchFields = {
	"_id": 1, "uerId": 1, "from":1, "to":1, "type":1, "name":1 ,"address":1,"contact_person":1, "customer":1
};


function createConsignor_ConsigneeAggrFilter(reqQuery) {
	var aggrFilter = [];
	aggrFilter.push({
		$match: {
			deleted: {
				$ne: true
			},
			$or:[{clientId:reqQuery.clientId},{clientR:reqQuery.clientId}]
		}
	});
	for (var key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if(key==="from")
			{
				obj = {};
				let startDate = new Date (reqQuery[key]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				obj["created_at"] = obj["created_at"] || {};
				obj["created_at"].$gte = startDate;
				aggrFilter.push({ $match: obj });
			}

			else if(key==="to")
			{
				let endDate = new Date (reqQuery[key]);
				endDate.setSeconds (59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				obj["created_at"] = obj["created_at"] || {};
				obj["created_at"].$lte = endDate;
				aggrFilter.push({ $match: obj });
			}
			else if (key === "address"||key === "contact_person") {
				var obj = {};
				obj[key] = {
					$regex: reqQuery[key].replace(' ','.+'),
					$options: 'i'
				};
				aggrFilter.push({
					$match: obj
				});
			}
			else if (key === "name") {
				var obj = {};
				obj['$or'] = obj['$or'] || [];
				obj['$or'].push({
					'name': new RegExp(reqQuery[key].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i')
				}, {
					'gstin': new RegExp(reqQuery[key].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i')
				});
				aggrFilter.push({
					$match: obj
				});
			}
			else if (key === "_id") {
				obj = {};
				obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
				aggrFilter.push({
					$match: obj
				});
			}else if(key === "customer"){
				obj = {};
				obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
				aggrFilter.push({
					$match: obj
				});
			}else if(key==="clientId"){
				obj ={};

				if(reqQuery[key] instanceof Array){

					obj[key] = {$in: reqQuery[key]};
					aggrFilter.push({
						$match: obj
					});

				}
				else if(typeof reqQuery[key] === "string"||Number){
					obj = {};
					obj[key] = reqQuery[key];
					aggrFilter.push({
						$match: obj
					});

				}
			}
			else {
				obj = {};
				obj[key] = reqQuery[key];
				aggrFilter.push({
					$match: obj
				});
			}
		}
	}
	return aggrFilter;
}

module.exports.searchConsignor_Consignee = function(reqQuery, trim, next) {
	reqQuery.aggQuery= createConsignor_ConsigneeAggrFilter(reqQuery);

	reqQuery.aggQuery.push({$lookup:{from:'customers',localField:'customer',foreignField:'_id',as:'customer'}},{
			$unwind: {
				path: '$customer',
				preserveNullAndEmptyArrays: true
			}
		});

	otherUtil.pagination(Consignor_Consignee, reqQuery, next);

};

