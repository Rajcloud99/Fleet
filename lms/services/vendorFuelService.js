var VendorFuel = promise.promisifyAll(commonUtil.getModel('vendorFuel'));
var NO_OF_DOCS = 15;
var allowedFilter = ["_id", "clientId", "name", "vendorId", "branch_name", "branch_id", "address", "prim_contact_person"];
var isAllowedFilter = function(sFilter) {
    var isAllowed = false;
    if (allowedFilter.indexOf(sFilter) >= 0) {
        isAllowed = true;
    }
    return isAllowed;
};
var constructFilters = function(query) {
    var fFilter = {};
    for (i in query) {
        if (isAllowedFilter(i)) {
            fFilter[i] = query[i];
        }
    }
    return fFilter;
};

function generateFuelVendorId() {
    var count = app_constant.vendorFuelCount;
    var ddmmyy = otherUtil.getDDMMYY();
    return "VF" + ddmmyy + (++count);
}

module.exports.addVendorFuel = function(reqBody, next) {
    reqBody.vendorId = generateFuelVendorId();
    var vendorT = new VendorFuel(reqBody);
    vendorT.saveAsync(reqBody)
        .then(function(vendorT) {
            counterUtil.incrementVendorFuelCount();
            winston.info("added vendor fuel", JSON.stringify(vendorT));
            return next(null, vendorT);
        })
        .catch(function(err) {
            winston.error("error in add vendor fuel:" + err);
            return next(err);
        });
};

module.exports.findFuelVendor = function(oQuery, next) {
    VendorFuel.findAsync(oQuery)
        .then(function(trip) {
            return next(null, trip);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.updateFuelStationById = function(id, reqBody, next) {
	reqBody.last_modified_at=new Date();
    VendorFuel.findOneAndUpdateAsync({ _id: id }, { $set: reqBody }, { new: true })
        .then(function(updated) {
            return next(null, updated);
        }).catch(function(err) {
            return next(err);
        });
};

module.exports.deleteVendorFuelId = function(id, next) {
    var remove = {};
    remove._id = id;
    VendorFuel.deleteAsync(remove)
        .then(function(removed) {
            winston.info("removed vendor fuel", JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove vendor fuel " + err);
            return next(err);
        });
};

/* module.exports.getFuelVendors = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    //db.grs.find({"branch_name" : "Okhla","gr_no_start" : {$lte:500}, "gr_no_end" : {$gte:500}})
    VendorFuel.countAsync(queryFilters)
        .then(function(count) {
            var cursor = VendorFuel.find(queryFilters);

            var no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
            if (no_of_documents > 15) {
                no_of_documents = 15;
            }
            if (reqQuery && reqQuery.skip) { //TODO check field is valid or not
                var skip_docs = (reqQuery.skip - 1) * no_of_documents;
                cursor.skip(parseInt(skip_docs));
            }
            if (reqQuery && reqQuery.sortby && reqQuery.sortby.split(':')) {
                var params = reqQuery.sortby.split(':');
                if (params[0] && params[0] == 'created_at') {
                    var oSort = { 'created_at': params[1] }
                    cursor.sort(oSort);
                }
            }
            if (count / no_of_documents > 1) {
                no_of_pages = count / no_of_documents;
            }
            cursor.limit(no_of_documents);
            cursor.exec(
                function(err, available) {
                    if (err) {
                        return next(err);
                    }
                    if (available && available[0]) {
                        var temp = JSON.parse(JSON.stringify(available));
                        var oRes = {};
                        oRes.no_of_pages = Math.ceil(no_of_pages);
                        oRes.data = temp;
                        return next(null, oRes);
                    } else {
                        return next(null, false);
                    }
                }
            )
        })
        .catch(
            function(err) {
                winston.error("Error in get fuel station available:" + err);
                return next(err);
            }
        );
}; */

var allowedFuelSearchFields = {
    "_id": 1,
    "clientId": 1,
    "name": 1,
    "vendorId": 1,
    "branch_name": 1,
    "branch_id": 1,
    "address": 1,
    "status": 1,
    "prim_contact_person": 1
};


function createFuelVendorFilter(reqQuery) {
    var aggrFilter = [];
    for (var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedFuelSearchFields)) {
            if (key == "name") {
                var obj = {};
                obj[key] = {
                    $regex: reqQuery[key],
                    $options: 'i'
                };
                aggrFilter.push({
                    $match: obj
                });
            }else if (key === '_id') {
				var obj = {};
				obj[key] = {$in: otherUtil.arrString2ObjectId([reqQuery[key]])}
				aggrFilter.push({
					$match: obj
				});
			} else {
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


module.exports.getFuelVendors = function(reqQuery, next) {
    var aggrFilter = createFuelVendorFilter(reqQuery);
    var oSort = { name: 1, created_at: -1 };
	aggrFilter.push(
		{
			$sort: oSort
		},
		{
			$lookup: {
				from: "accounts",
				localField: "account",
				foreignField: "_id",
				as: "account"
			}
		},
		{
			$unwind: {
				path:"$account",
				preserveNullAndEmptyArrays: true
			}
		}
	);
	reqQuery.aggQuery = aggrFilter;

    var datacursor = VendorFuel.aggregate(aggrFilter);

    var countCursor = VendorFuel.aggregate(aggrFilter);
    var no_of_documents;
    if (reqQuery.all == "true") {
        no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : 1000;
    } else {
        no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
        if (no_of_documents > NO_OF_DOCS) {
            no_of_documents = NO_OF_DOCS;
        }
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
            var fuelVendorCount = countArr.length;
            var no_of_pages;
            if (fuelVendorCount / no_of_documents > 1) {
                no_of_pages = Math.ceil(fuelVendorCount / no_of_documents);
            } else {
                no_of_pages = 1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }
            datacursor.exec(function(err, fuelVendorData) {
                var data = JSON.parse(JSON.stringify(fuelVendorData));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err) {
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.data = data;
                objToReturn.no_of_pages = no_of_pages;
                objToReturn.count = fuelVendorCount;
                return next(null, objToReturn);
            });
        } else {
            var objToReturn = {};
            objToReturn.data = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
