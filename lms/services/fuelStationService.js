
/**
 * Created by pratik on 3/10/16.
 */
var FuelStation = promise.promisifyAll(commonUtil.getModel('fuelStations'));
var NO_OF_DOCS =15;
var allowedFilter = ["_id","clientId","fuel_type","fuel_company", "from", "to", "fuel_price","area_code","address","vendorId","fuel_vendor_id"];
var isAllowedFilter  = function(sFilter){
    var isAllowed = false;
    if(allowedFilter.indexOf(sFilter)>=0){
        isAllowed =  true;
    }
    return isAllowed;
};
var constructFilters = function(query){
    var oFilter = {};
    for(let i in query){
			if (otherUtil.isAllowedFilter(i, allowedFilter)) {
				if (i === 'from') {
					let startDate = new Date(query[i]);
					startDate.setSeconds(0);
					startDate.setHours(0);
					startDate.setMinutes(0);
					if (!query.dateType || query.dateType === 'effective_date') {
						oFilter["effective_date"] = oFilter["effective_date"] || {};
						oFilter["effective_date"].$gte = startDate;
					}
				} else if (i === 'to') {
					let endDate = new Date(query[i]);
					endDate.setSeconds(59);
					endDate.setHours(23);
					endDate.setMinutes(59);
					if (!query.dateType || query.dateType === 'effective_date') {
						oFilter["effective_date"] = oFilter["effective_date"] || {};
						oFilter["effective_date"].$lte = endDate;
					}
				} else {
					oFilter[i] = query[i];
				}
			}
    }
    return oFilter;
};

module.exports.addFuelStation = function(data,next) {
    var FuelStationData = new FuelStation(data);
    FuelStationData.saveAsync(data)
    .then(function(station) {
        return next(null, station);
    })
    .catch(function(err) {
        return next(err);
    });
};

module.exports.getFuelStations = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
	reqQuery.sort = {effective_date:-1, _id: -1};
    var no_of_pages = 1;
    FuelStation.countAsync(queryFilters)
    .then(function(count){
        var cursor = FuelStation.find(queryFilters);

        var no_of_documents = reqQuery && reqQuery.no_of_docs ? reqQuery.no_of_docs : NO_OF_DOCS;
        if(no_of_documents>15){
            no_of_documents = 15;
        }
        if(reqQuery && reqQuery.skip){//TODO check field is valid or not
            var skip_docs = (reqQuery.skip-1)*no_of_documents;
            cursor.skip(parseInt(skip_docs));
        }
        if(count/no_of_documents>1){
            no_of_pages = count/parseInt(no_of_documents);
        }
		if(reqQuery && reqQuery.sort){
			cursor.sort(reqQuery.sort);
		}

        cursor.exec(
            function(err,available) {
                if (err){
                  return next(err);
                }
                if(available && available[0]){
                    var tempGR = JSON.parse(JSON.stringify(available));
                    var oRes = {};
                    oRes.no_of_pages =Math.ceil(no_of_pages);
                    oRes.data = tempGR;
                    return next(null, oRes);
                }else{
                    return next(null, false);
                }
            }
        )
    })
    .catch(
        function(err) {
            return next(err);
        }
    );
};

module.exports.findFuelStation = function(oQuery, next) {
    FuelStation.findAsync(oQuery)
    .then(function (trip) {
        return next(null, trip);
    })
    .catch(function (err) {
        return next(err);
    });
};

module.exports.updateFuelStationById = function(id,req,next) {

	const reqBody = req.body;
	const toUpdate = {
		deleted: reqBody.deleted,
		fuel_price: reqBody.fuel_price,
	};

    FuelStation.findOneAndUpdateAsync({_id: id},{
    	$set: toUpdate,
		$push: {
			"fuel_history":{
				"fuel_price": reqBody.fuel_price,
				"created_by": req.user._id,
				"created_by_name": req.user.full_name,
				"created_at": new Date()
			}
		}
	}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};

module.exports.deleteFuelStation = function(id,next) {
    var remove = {};
    remove._id= id;
    FuelStation.deleteAsync(remove)
    .then(function(removed) {
        return next(null, removed);
    })
    .catch(function(err) {
        return next(err);
    });
};





