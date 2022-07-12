/**
 * Created by manish on 2/2/17.
 */
var winston = require('winston');
var TyreMaster = promise.promisifyAll(commonUtil.getMaintenanceModel('tyreMaster'));
var NO_OF_DOCS = 15;

module.exports.addTyreMaster = function(reqBody,next) {
	if(reqBody.rate_per_piece)reqBody.rate_per_piece=Math.round(reqBody.rate_per_piece * 100) / 100;
	if(reqBody.billing_amount)reqBody.billing_amount=Math.round(reqBody.billing_amount * 100) / 100;
	if(reqBody.current_price)reqBody.current_price=Math.round(reqBody.current_price * 100) / 100;
	reqBody.purchase_category = reqBody.tyre_category;
	var tyreMaster = new TyreMaster(reqBody);
    tyreMaster.saveAsync(reqBody)
        .then(function(tyreMaster) {
            winston.info("added TyreMaster",JSON.stringify(tyreMaster));
            return next(null, tyreMaster);
        })
        .catch(function(err) {
            winston.error("error in add TyreMaster:" + err);
            return next(err);
        });
};

module.exports.updateTyreMasterById = function(id,reqBody,next) {
	delete reqBody.created_at;
    TyreMaster.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new:true})
        .then(function(TyreMaster) {
            winston.info("updated TyreMaster ", JSON.stringify(TyreMaster));
            return next(null, TyreMaster);
        })
        .catch(function(err) {
            winston.error("error in update TyreMaster:" + err);
            return next(err);
        });
};

module.exports.findTyreMasterById = function(id,next) {
    TyreMaster.findAsync({_id:id})
        .then(function (TyreMaster) {
            winston.info("found TyreMaster", JSON.stringify(TyreMaster));
            return next(null, TyreMaster);
        }).catch(function (err) {
        winston.error("error in find TyreMaster:" + err);
        return next(err);
    });
};

module.exports.findTyreMasterByQuery = function(query,next) {
    TyreMaster.findAsync(query)
        .then(function (TyreMaster) {
            winston.info("found TyreMaster", JSON.stringify(TyreMaster));
            return next(null, TyreMaster);
        }).catch(function (err) {
        winston.error("error in find TyreMaster:" + err);
        return next(err);
    });
};

module.exports.findTyreMasterByQueryWithProjections = function(query,projections,next) {
    TyreMaster.findAsync(query,projections)
        .then(function (TyreMaster) {
            winston.info("found TyreMaster", JSON.stringify(TyreMaster));
            return next(null, TyreMaster);
        }).catch(function (err) {
        winston.error("error in find TyreMaster:" + err);
        return next(err);
    });
};

module.exports.deleteTyreMasterById = function(id,next) {
    TyreMaster.removeAsync({_id:mongoose.Types.ObjectId(id)})
        .then(function(removed) {
            winston.info("removed TyreMaster",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove TyreMaster " + err);
            return next(err);
        });
};

var allowedSearchFields = {"clientId":1,"_id":1,"tyre_number":1,"status":1, "vehicle_no": 1, "tyre_category": 1, "from": 1, "to": 1, "po_number": 1, "invoice_number": 1,"vendor_name":1, "vendor_id":1};

function createTyreMasterAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "tyre_number" || key === "tyre_category") {
                var obj ={};
                obj[key]= {$regex: reqBody[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            }if (key === "vehicle_no") {
                if(reqBody.associatedVeh){
                    aggrFilter.push({$match: {$or: [{ vehicle_no:reqBody.vehicle_no },{vehicle_no:reqBody.associatedVeh}]}});
                }else{
                    var obj ={};
                    obj[key]= reqBody.vehicle_no;
                    aggrFilter.push({$match: obj});
                }
            } else if (key==="_id" || key==='vendor_id'){
                obj ={};
                obj[key]= mongoose.Types.ObjectId(reqBody[key]);
                aggrFilter.push({$match: obj});
            }else if(key =='from' && query.to){
                var startDate = new Date(query[key]);
                var nextDay = new Date(query.to);
                fFilter["created_at"] = {
                    "$gte" :startDate,
                    "$lt":nextDay
                };
                delete query.from;
                delete query.to;
            }else if(key =='from'){
                var startDate = new Date(query[key]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                var nextDay = new Date(startDate);
                nextDay.setDate(startDate.getDate() + 1);
                fFilter["created_at"] = {
                    "$gte" :startDate,
                    "$lt":nextDay
                };
            }else if(key =='to' && !query.from){
                var endDate = new Date(query[key]);
                fFilter["created_at"] = {
                    "$lt" :endDate
                };
			}else {
                obj ={};
                obj[key]= reqBody[key];
                aggrFilter.push({$match: obj});
            }
        }
    }
    return aggrFilter;
}

module.exports.searchTyreMaster = function(reqQuery,next) {
    var aggrFilter  = createTyreMasterAggrFilter(reqQuery);

    if (reqQuery.sort) {
		aggrFilter.push({
			$sort: {
				created_at: parseInt(reqQuery.sort)
			}
		})
	}
	var datacursor = TyreMaster.aggregate(aggrFilter);
	aggrFilter.push({
		$group: {
			_id: null,
			count: {
				$sum: 1
			}
		}
	});
	var countCursor = TyreMaster.aggregate(aggrFilter);
	var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

	if (no_of_documents > NO_OF_DOCS) {
		no_of_documents = NO_OF_DOCS;
	}

	if (reqQuery.skip) {
		var skip_docs = (reqQuery.skip - 1) * no_of_documents;
		datacursor.skip(parseInt(skip_docs));
	}
	countCursor.exec(function(err, countArr) {
		if (err) {
			return next(err);
		}
		if (countArr.length > 0) {
			var tyreCount = countArr[0].count;
			var no_of_pages;
			if (tyreCount / no_of_documents > 1) {
				no_of_pages = Math.ceil(tyreCount / no_of_documents);
			} else {
				no_of_pages = 1;
			}
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}
			else {
				no_of_pages = 1;
			}
			datacursor.exec(function(err, tyres) {
				var tyre0 = JSON.parse(JSON.stringify(tyres));
				//console.log(leads0);
				//var leads_ = makeLeadsResponseKeyChanges(leads0);
				if (err) {
					return next(err);
				}
				var objToReturn = {};
				objToReturn.tyreMasters = tyre0;
				objToReturn.pages = no_of_pages;
				objToReturn.count = tyreCount;
				return next(null, objToReturn);
			});
		} else {
			var objToReturn = {};
			objToReturn.tyreMasters = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};
