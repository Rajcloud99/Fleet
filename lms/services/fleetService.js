/**
 * Created by pratik on 4/10/17.
 */
var Fleet = promise.promisifyAll(commonUtil.getModel('fleet'));
var RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
var NO_OF_DOCS = 15;

module.exports.addFleet = function(data, next) {
    var FleetData = new Fleet(data);
    FleetData.saveAsync(data)
        .then(function(added) {
            return next(null, added);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.findFleet = function(oQuery, next) {
    Fleet.findAsync(oQuery)
        .then(function(trip) {
            return next(null, trip);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.updateFleetById = function(id, reqBody, next) {
    Fleet.findOneAndUpdateAsync({ _id: id }, { $set: reqBody }, { new: true })
        .then(function(updated) {
            return next(null, updated);
        }).catch(function(err) {
            return next(err);
        });
};

module.exports.deleteFleet = function(id, next) {
    var remove = {};
    remove._id = id;
    
    Fleet.removeAsync(remove)
        .then(function(removed) {
            return next(null, removed);
        })
        .catch(function(err) {
            return next(err);
        });
};

var allowedSearchFields = {
    "_id": 1,
    "clientId": 1,
    "name": 1
};

function createFleetAggrFilter(reqQuery) {
    var aggrFilter = [];
    aggrFilter.push({
        $match: {}
    });
    for (var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key == "name") {
                var obj = {};
                obj[key] = {
                    $regex: reqQuery[key].replace(' ','.+'),
                    $options: 'i'
                };
                aggrFilter.push({
                    $match: obj
                });
            } else if (key === "_id") {
                obj = {};
                obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
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

module.exports.getFleet = function(reqQuery, next) {
    var aggrFilter = createFleetAggrFilter(reqQuery);
    var oSort = { name: 1, created_at: -1 };
    aggrFilter.push({ $sort: oSort });

    var datacursor = Fleet.aggregate(aggrFilter);
    aggrFilter.push({
        $group: {
            _id: null,
            count: {
                $sum: 1
            }
        }
    });
    var countCursor = Fleet.aggregate(aggrFilter);
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
            var registeredFleetCount = countArr[0].count;
            var no_of_pages;
            if (registeredFleetCount / no_of_documents > 1) {
                no_of_pages = Math.ceil(registeredFleetCount / no_of_documents);
            } else {
                no_of_pages = 1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }
            datacursor.exec(function(err, registeredFleet) {
                var registeredFleet0 = JSON.parse(JSON.stringify(registeredFleet));
                if (err) {
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.data = registeredFleet0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = registeredFleetCount;
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


// Added By Harikesh - Fleet Sigment - Dated: 08/11/2019

module.exports.updateMultipleVehicleFleetSegment = async function({body, user}, next) {

	try {

		return next(null, await RegisteredVehicle.bulkWrite(
			body.aVehicle.map( obj  => {
				return { updateOne :
					{
						"filter" : { "_id" : obj._id },
						"update" : {
							$set : { "owner_group" : body.fleetName },
							$push: {
								"fleetHistory" : {
									ownGrp: obj.owner_group,
									name: user.full_name,
									time: new Date()
								}
							}
						}
					}
				};
			} )
		));

	}catch (e) {
		console.log(err);
		return next(err);
	}
};

//END
