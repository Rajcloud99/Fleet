/**
 * Created by manish on 9/8/16.
 * Last updated by kamal on 26/07/2017
 */
var Client = promise.promisifyAll(commonUtil.getModel('client'));
var NO_OF_DOCS = 1500;

/***remove one from count for super client ***/
function generateClientId() {
    var initCount = 100000;
    var count = app_constant.clientCount;
    return (initCount + (count));
}

const ALLOWED_FILTER =['_id', 'clientId', 'date', 'client_display_name','client_full_name'];
function constructFilters(oQuery) {
	let oFilter={};

	for(i in oQuery){
		if(otherUtil.isAllowedFilter(i, ALLOWED_FILTER)){
			if (i === 'from_date' || i === 'start_date') {
				let startDate = new Date (oQuery[i]);
				startDate.setSeconds (0);
				startDate.setHours (0);
				startDate.setMinutes (0);
				oFilter[oQuery.dateType || "created_at"] = oFilter[oQuery.dateType || "created_at"] || {};
				oFilter[oQuery.dateType || "created_at"].$gte = startDate;
			} else if (i === 'to_date' || i === 'end_date') {
				let endDate = new Date (oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours (23);
				endDate.setMinutes (59);
				oFilter[oQuery.dateType  || "created_at"] = oFilter[oQuery.dateType  || "created_at"] || {};
				oFilter[oQuery.dateType  || "created_at"].$lte = endDate;
			} else if(i === '_id') {
				oFilter[i] = {
					$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
				};
			} else if (i == 'billNo') {
				oFilter['receiving.billNo'] = {$regex: oQuery[i], $options: 'i'};
			} else if (i == 'billingParty') {
				oFilter['billingParty'] = otherUtil.arrString2ObjectId(oQuery[i]);
			}
			else if (i === 'branch'){
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['branch'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			}
			else {
				oFilter[i] = oQuery[i];
			}

		}
	}
	return oFilter;
}

module.exports.addClient = function(reqBody, next) {
    var client = new Client(reqBody);
    client.saveAsync(reqBody)
        .then(function(client) {
            winston.info("added client", JSON.stringify(client));
            return next(null, client);
        })
        .catch(function(err) {
            winston.error("error in add client:" + err);
            return next(err);
        });
};


module.exports.updateClientId = function(id, reqQuery, next) {
    Client.findOneAndUpdateAsync({ _id: id }, { $set: reqQuery }, { new: true })
        .then(function(client) {
            winston.info("updated client ", JSON.stringify(client));
            return next(null, client);
        })
        .catch(function(err) {
            winston.error("error in update client:" + err);
            return next(err);
        });
};

module.exports.updateClientQuery = function(query, reqBody, next) {
    Client.findOneAndUpdateAsync(query, { $set: reqBody }, { new: true })
        .then(function(client) {
            winston.info("updated client ", JSON.stringify(client));
            return next(null, client);
        })
        .catch(function(err) {
            winston.error("error in update client:" + err);
            return next(err);
        });
};

module.exports.findClientById = function(id, next) {
    Client.findByIdAsync(id)
        .then(function(client) {
            //winston.info("found client", JSON.stringify(client));
            return next(null, client);
        }).catch(function(err) {
            winston.error("error in find client:" + err);
            return next(err);
        });
};

module.exports.findClientByQuery = function(query, next) {
    Client.findAsync(query)
        .then(function(clients) {
            //winston.info("found client", JSON.stringify(client));
            return next(null, clients);
        }).catch(function(err) {
            winston.error("error in find client:" + err);
            return next(err);
        });
};

module.exports.deleteClientId = function(id, next) {
    Client.findByIdAndRemoveAsync(id)
        .then(function(removed) {
            //winston.info("removed client",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove client " + err);
            return next(err);
        });
};

module.exports.deleteClientQuery = function(query, next) {
    Client.removeAsync(query)
        .then(function(removed) {
            //winston.info("removed client",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove client " + err);
            return next(err);
        });
};

module.exports.find = async function(body, user) {

	try{

		body.no_of_docs = body.no_of_docs || 10;
		body.skip = body.skip || 1;
		body.sort = body.sort || {_id: 1};
		body.populate = body.populate || [];

		const clientQuery = [
			{ $match: constructFilters(body) },

			{ $sort: body.sort},

			{ $skip: (body.no_of_docs * body.skip) - body.no_of_docs },

			{ $limit: body.no_of_docs },

		];

		const clientData = await Client
			.aggregate(clientQuery)
			.allowDiskUse(true);

		return { data: clientData };

	}catch (e) {
		console.log(e);
		throw e;
	}
}

var allowedSearchFields = { "_id": 1, "client_full_name": 1, "client_display_name": 1 };


function createClientAggrFilter(reqQuery) {
    var aggrFilter = [];
    ////get all clients if request is from super admin
    if (reqQuery.clientId != "000000") {
        if (reqQuery.includeAdminClient) {
            aggrFilter.push({ $match: { clientId: { $ne: config.super_admin_id } } });
        } else {
            aggrFilter.push({ $match: { clientId: reqQuery.clientId } });
        }
    }
    for (var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "client_full_name" || key === "client_display_name") {
                var obj = {};
                obj[key] = { $regex: reqQuery[key], $options: 'i' };
                aggrFilter.push({ $match: obj });
            } else if (key === "_id") {
                obj = {};
                obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
                aggrFilter.push({ $match: obj });
            } else {
                obj = {};
                obj[key] = reqQuery[key];
                aggrFilter.push({ $match: obj });
            }
        }
    }

    return aggrFilter;
}

module.exports.searchClient = function(reqQuery, next) {
    var aggrFilter = createClientAggrFilter(reqQuery);

    if (reqQuery.sort) {
        aggrFilter.push({ $sort: { created_at: parseInt(reqQuery.sort) } })
    }
    if (reqQuery.trim) {
        var projection = {
            _id: 1,
            client_full_name: 1,
            client_display_name: 1,
            clientId: 1,
			gstin_no:1
        };
        aggrFilter.push({ $project: projection });
    }
    if (reqQuery.config) {
        var projection = {
            _id: 1,
            client_full_name: 1,
            client_display_name: 1,
            clientId: 1,
			gstin_no:1,
			client_theme_color: 1,
            client_logo: 1,
            client_favicon: 1,
            app_access_matrix: 1,
            "booking": 1,
            "allocation": 1,
            "trip": 1,
			"gr": 1,
            "fleet": 1,
            "dateTimeFormat": 1,
			"gr_templates": 1,
			"diesel_templates": 1,
			"bill_templates": 1,
			"accountDetails":1,
			gpsId:1,
            gpsPwd:1,
            gpsgaadi_token:1
        };
        aggrFilter.push({ $project: projection });
    }
    var datacursor = Client.aggregate(aggrFilter);
    aggrFilter.push({ $group: { _id: null, count: { $sum: 1 } } });
    var countCursor = Client.aggregate(aggrFilter);
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
            var count = countArr[0].count;
            var no_of_pages;
            if (count / no_of_documents > 1) {
                no_of_pages = Math.ceil(count / no_of_documents);
            } else {
                no_of_pages = 1;
            }
            datacursor.limit(parseInt(no_of_documents));
            datacursor.exec(function(err, clients) {
                var clients = JSON.parse(JSON.stringify(clients));
                if (err) {
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.clients = clients;
                objToReturn.pages = no_of_pages;
                objToReturn.count = count;
                return next(null, objToReturn);
            });
        } else {
            var objToReturn = {};
            objToReturn.clients = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
