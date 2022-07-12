/**
 * Created by Pratik on 5/10/16.
 */
var GRStatus = promise.promisifyAll(commonUtil.getModel('grStatus'));
var NO_OF_DOCS = 10;

var allowedFilter = ["_id", "clientId", "branch_name", "gr_no", "gr_Status","isActive","trip_no","booking_no"];
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
        	if(i=="isActive"){
				fFilter['isActive'] =  query[i].toString()=="true"?true:false;
			}else {
				fFilter[i] = query[i];
			}

        }
    }
    return fFilter;
};

module.exports.addGR = function(data, next) {
    var oGRstatus = new GRStatus(data);
    oGRstatus.saveAsync(data)
        .then(function(grData) {
            winston.info("added gr status", JSON.stringify(grData));
            return next(null, grData);
        })
        .catch(function(err) {
            winston.error("error in add gr status:" + err);
            return next(err);
        });
};
module.exports.getGRstatus = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    //db.grs.find({"branch_name" : "Okhla","gr_no_start" : {$lte:500}, "gr_no_end" : {$gte:500}})
    GRStatus.countAsync(queryFilters)
        .then(function(count) {
            var cursor = GRStatus.find(queryFilters);

            var no_of_documents = reqQuery && reqQuery.no_of_docs ? reqQuery.no_of_docs : NO_OF_DOCS;
            if (no_of_documents > 10) {
                no_of_documents = 10;
            }
            if (reqQuery && reqQuery.skip) { //TODO check field is valid or not
                var skip_docs = (reqQuery.skip - 1) * no_of_documents;
                cursor.skip(parseInt(skip_docs));
            }
			cursor.sort({_id:-1})
            if (count / no_of_documents > 1) {
                no_of_pages = count / no_of_documents;
            }
            cursor.limit(parseInt(no_of_documents));
            cursor.exec(
                function(err, available) {
                    if (err) {
                        return next(err);
                    }
                    if (available && available[0]) {
                        winston.info("gr is available");
                        var tempGR = JSON.parse(JSON.stringify(available));
                        var oRes = {};
                        oRes.no_of_pages = Math.ceil(no_of_pages);
                        oRes.data = tempGR;
                        return next(null, oRes);
                    } else {
                        return next(null, false);
                    }
                }
            )
        })

    .catch(
        function(err) {
            winston.error("Error in get available:" + err);
            return next(err);
        }
    );
};

module.exports.isGRstatusExists = function(data, next) {
    var queryFilters = constructFilters(data);
    GRStatus.findAsync(queryFilters)
        .then(
            function(available) {
                if (available && available[0]) {
                    winston.info("gr is available");
                    return next(null, available);
                } else {
                    return next(null, false);
                }
            }
        )
        .catch(
            function(err) {
                winston.error("Error in get available:" + err);
                return next(err);
            }
        );
};

module.exports.countGRstatusByQuery = function(query, next) {
    GRStatus.countAsync(query)
        .then(function(grStatus) {
            return next(null, grStatus);
        }).catch(
            function(err) {
                return next(err);
            }
        );
};


module.exports.updateGRbyID = function(id, reqBody, next) {
    GRStatus.findOneAndUpdateAsync({ _id: id }, { $set: reqBody }, { "new": true, "runValidators": true })
        .then(function(updated) {
            return next(null, updated);
        }).catch(function(err) {
            return next(err);
        });
};
module.exports.updateBulkGRStatus = function(details, status, next) {
    var resp = { "status": "OK", "message": "grs bulk updated." };
    var bulk = prepareGRStatusUpdate(details, status);
    bulk.execute(function(err, bulkres) {
        if (err) { console.log('rejected', err); return next(err); }
        resp.bulkres = bulkres;
        return next(null, resp);
    });
};

function prepareGRStatusUpdate(oTrip, grStatus) {
    var bulk = GRStatus.collection.initializeUnorderedBulkOp();
    for (var k = 0; k < oTrip.gr.length; k++) {
        var oFilter = {};
        if (oTrip.gr[k].gr_no) {}
        oFilter.clientId = oTrip.clientId;
        oFilter.gr_no = oTrip.gr[k].gr_no;
        oFilter.trip_no = parseInt(oTrip.trip_no);
        oFilter.branch_name = oTrip.gr[k].branch;
        var oUpdate = { gr_Status: grStatus };
        if (oTrip.gr_history) {
            oUpdate.history = [oTrip.gr_history];
        }
        bulk.find(oFilter).updateOne({ $set: oUpdate });
    }
    return bulk;
};
