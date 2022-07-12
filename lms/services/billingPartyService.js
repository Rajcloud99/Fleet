
let billingParty = promise.promisifyAll(commonUtil.getModel('billingparty'));
let Async = require('async');

module.exports.getBillingParty = getBillingParty;

module.exports.addBillingParty = function(reqBody, next) {
	var BillingParty = new billingParty(reqBody);
	BillingParty.saveAsync(reqBody)
		.then(function(billing) {
			winston.info("added new billingPartyor" + JSON.stringify(billing));
			return next(null, billing);
		}).catch(function(err) {
		return next(err);
	});
};

module.exports.findbillingPartyId = function(id, next) {
	billingParty.findAsync({
		"_id": id
	})
		.then(function(billingParty) {
			return next(null, billingParty);
		})
		.catch(function(err) {
			return next(err);
		});
};

module.exports.findbillingPartyQuery = function(query, next) {
	billingParty.findAsync(query)
		.then(function(billingParty) {
			return next(null, billingParty);
		})
		.catch(function(err) {
			return next(err);
		});
};

module.exports.updatebillingPartyId = function(id, reqBody, next) {
	billingParty.findOneAndUpdate(
		{
			_id: id
		}, {
			$set: reqBody
		}, {
			new: true
		})
		.populate('account')
		.then(function(updated) {
			return next(null, updated);
		})
		.catch(function(err) {
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
	billingParty.findOneAndUpdateAsync({
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

module.exports.deletebillingPartyId = function(id, next) {
	billingParty.deleteOne({
		_id: id
	})
		.then(function(removed) {
			return next(null, removed);
		}).catch(function(err) {
		return next(err);
	});
};


var allowedSearchFields = {
	"_id": 1, "userId": 1,"type":1, "name":1 ,"address":1, "state_name": 1,"contact_person":1,"gstin":1,"category":1, "from":1,"to":1,"customer":1
};


function createbillingPartyAggrFilter(reqQuery) {
	var aggrFilter = [];
	aggrFilter.push({
		$match: {
			deleted: {
				$ne: true
			},
	      clientId: reqQuery.clientId
			// $or:[{clientId:reqQuery.clientId},{clientR:reqQuery.clientId}]
		}
	});
	for (var key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if(key==="from")
			{
				var obj = {};
				let startDate = new Date (reqQuery[key]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				obj["billing_dates"] = obj["billing_dates"] || {};
				obj["billing_dates"].$gte = startDate;
				aggrFilter.push({ $match: obj });
			}

			else if(key==="to")
			{   obj ={};
				let endDate = new Date (reqQuery[key]);
				endDate.setSeconds (59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				obj["billing_dates"] = obj["billing_dates"] || {};
				obj["billing_dates"].$lte = endDate;
				aggrFilter.push({ $match: obj });
			}
			else if(key==="clientId"){
				var a = JSON.parse(reqQuery[key])
				obj ={};
				if(a instanceof Array){

					obj[key] = {$in: a};
					aggrFilter.push({
						$match: obj
					});

				}
				else if (key === "_id" || key === 'customer') {
					obj = {};
					obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
					aggrFilter.push({
						$match: obj
					});
				}
			else if(typeof a=== "string"||Number){
					obj = {};
					obj[key] = reqQuery[key];
					aggrFilter.push({
						$match: obj
					});

				}
			}
			else if (key === "name"|| key ==="address"|| key ==="gstin") {
				var obj = {};
				obj[key] = new RegExp(`^${reqQuery[key].trim().replace(/[ .|\\{}()[\]^$+*?.]/g, '.*')}`, 'i');
				aggrFilter.push({
					$match: obj
				});
			}else if (key === 'customer') {
				obj = {};
				obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
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

module.exports.searchbillingParty = function(reqQuery, trim, next) {
	reqQuery.aggQuery = createbillingPartyAggrFilter(reqQuery);

	reqQuery.aggQuery.push({$lookup:{from:'accounts',localField:'account',foreignField:'_id',as:'account'}},{
		$unwind: {
			path: '$account',
			preserveNullAndEmptyArrays: true
		}
	},
	{$lookup:{from:'accounts',localField:'withHoldAccount',foreignField:'_id',as:'withHoldAccount'}},{
		$unwind: {
			path: '$withHoldAccount',
			preserveNullAndEmptyArrays: true
		}
	},
		{$lookup:{from:'customers',localField:'customer',foreignField:'_id',as:'customer'}},{
		$unwind: {
			path: '$customer',
			preserveNullAndEmptyArrays: true
		}
	},
		{$lookup:{from:'schemaconfigurations',localField:'configs.GR',foreignField:'_id',as:'configs.GR'}},{
			$unwind: {
				path: '$configs.GR',
				preserveNullAndEmptyArrays: true
			}
		},
		{$lookup:{from:'schemaconfigurations',localField:'configs.RATE_CHART',foreignField:'_id',as:'configs.RATE_CHART'}},{
			$unwind: {
				path: '$configs.RATE_CHART',
				preserveNullAndEmptyArrays: true
			}
		}
		);

	if(reqQuery.project && (reqQuery.project = JSON.parse(reqQuery.project)) && reqQuery.project.length){
		reqQuery.aggQuery.push({
			$project: reqQuery.project.reduce((o, s) => {o[s] = 1; return o;}, {})
		});
		delete reqQuery.project;
	}

	otherUtil.pagination(billingParty,reqQuery, next)
};

async function getBillingParty(query, proj = {}) {
	try{
		return await billingParty.find(query, proj);
	}catch(e){
		throw e;
	}
}
