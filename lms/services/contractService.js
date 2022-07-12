var Contract = promise.promisifyAll(commonUtil.getModel('contract'));
var NO_OF_DOCS = 15;
var _ = require('lodash');

function generateContractId() {
    // var count = app_constant.contractCount;
    var count = Math.floor(Math.random() * 100) + 1;
    var ddmmyy = otherUtil.getDDMMYY();
    return "CTR" + ddmmyy + (++count);
}

module.exports.addContract = function (reqBody, next) {
    reqBody.contractId = generateContractId();
    var contract = new Contract(reqBody);
    contract.saveAsync(reqBody)
        .then(function (contract) {
            counterUtil.incrementContractCount();
            winston.info("added contract", JSON.stringify(contract));
            return next(null, contract);
        })
        .catch(function (err) {
            winston.error("error in add contract:" + err);
            return next(err);
        });
};

module.exports.updateContractId = function (id, reqBody, next) {
    if (reqBody.detentionUpdate == true) {
        Contract.findOneAndUpdateAsync({ _id: id, "detentionCharges._id": reqBody.vehicleType._id }, { $set: { 'detentionCharges.$.three_days': reqBody.three_days, 'detentionCharges.$.three_to_five_days': reqBody.three_to_five_days, 'detentionCharges.$.five_days_or_more': reqBody.five_days_or_more } }, { new: true }).then(updateDetention => {
            updateDetention = JSON.parse(JSON.stringify(updateDetention))
            return next(null, updateDetention);
        }).catch(next);
    }
    if (reqBody.detention == true) {
        Contract.findOneAsync({ _id: id }).then(contractData => {
            if (contractData) {
                contractData = JSON.parse(JSON.stringify(contractData))
                let check = _.find(contractData.detentionCharges, { 'vehicleTypeName': reqBody.vehicleTypeName });
                if (check) {
                    return next(null, contractData);
                }
                else {
                    Contract.findOneAndUpdateAsync({ _id: id }, { $push: { detentionCharges: { vehicleTypeName: reqBody.vehicleTypeName, three_days: reqBody.three_days, three_to_five_days: reqBody.three_to_five_days, five_days_or_more: reqBody.five_days_or_more } } }, { new: true }).then(updateDetention => {
                        winston.info("updated contract ", JSON.stringify(updateDetention));
                        return next(null, updateDetention);
                    }).catch(next);
                }
            }
        })
    }
    else {
        Contract.findOneAndUpdateAsync({ _id: id }, { $set: reqBody }, { new: true })
            .then(function (contract) {
                winston.info("updated contract ", JSON.stringify(contract));
                return next(null, contract);
            })
            .catch(next);
    }
};

module.exports.updateContractIdSetPush = function (id, newData, next) {
    var newDetails = {};
    if (newData.toSet) {
        newDetails["$set"] = newData.toSet;
    }
    if (newData.toPush) {
        newDetails["$push"] = newData.toPush;
    }
    Contract.findOneAndUpdateAsync({ _id: id }, newDetails, { new: true })
        .then(function (updated) {
            return next(null, updated);
        }).catch(function (err) {
            return next(err);
        });
};

module.exports.getAssignedTransportRoute = function (contract__id, next) {
    var cursor = Contract.find({ _id: contract__id });
    //cursor.populate('transport_routes',)
    cursor.populate('transport_routes', { "_id": 1, "name": 1, "routeId": 1 })
        .exec(function (err, contract) {
            if (err) {
                return next(err);
            }
            console.log("found transport routes" + contract);
            if (contract && contract[0]) {
                return next(null, contract[0].transport_routes);
            } else {
                return next(null, []);
            }
        }).catch(next)
};


module.exports.findContractId = function (id, next) {
    Contract.findAsync({ _id: id })
        .then(function (contract) {
            winston.info("found contract", JSON.stringify(contract));
            return next(null, contract);
        }).catch(function (err) {
            winston.error("error in find contract:" + err);
            return next(err);
        });
};

module.exports.findContractQuery = function (query, next) {
    Contract.findAsync(query)
        .then(function (contract) {
            winston.info("found contract", JSON.stringify(contract));
            return next(null, contract);
        }).catch(function (err) {
            winston.error("error in find contract:" + err);
            return next(err);
        });
};

module.exports.deleteContractId = function (id, next) {
    var remove = {};
    remove._id = id;
    Contract.deleteAsync(remove)
        .then(function (removed) {
            winston.info("removed contract", JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function (err) {
            winston.error("error in remove contract " + err);
            return next(err);
        });
};

module.exports.deleteContractQuery = function (query, next) {
    Contract.deleteAsync(query)
        .then(function (removed) {
            winston.info("removed contract", JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function (err) {
            winston.error("error in remove contract " + err);
            return next(err);
        });
};

var allowedSearchFields = {
    "_id": 1, "name": 1, "contractId": 1, "customer__id": 1, "contract_type": 1,
    "created_by": 1, "last_modified_by": 1
};


function createContractAggrFilter(reqQuery) {
    var aggrFilter = [];
    aggrFilter.push({ $match: { deleted: { $ne: true } } });
    for (var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "name") {
                var obj = {};
                obj[key] = { $regex: reqQuery[key], $options: 'i' };
                aggrFilter.push({ $match: obj });
            } else if (key === "_id" || key === "customer__id") {
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

module.exports.searchContract = function (reqQuery, trim, next) {
    var aggrFilter = createContractAggrFilter(reqQuery);

    if (reqQuery.sort) {
        aggrFilter.push({ $sort: { created_at: parseInt(reqQuery.sort) } })
    }
    if (trim) {
        var projection = { _id: 1, name: 1, contractId: 1 };
        aggrFilter.push({ $project: projection });
    }
    var datacursor = Contract.aggregate(aggrFilter);
    aggrFilter.push({ $group: { _id: null, count: { $sum: 1 } } });
    var countCursor = Contract.aggregate(aggrFilter);
    var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

    if (no_of_documents > NO_OF_DOCS) {
        no_of_documents = NO_OF_DOCS;
    }

    if (reqQuery.skip) {
        var skip_docs = (reqQuery.skip - 1) * no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }
    countCursor.exec(function (err, countArr) {
        if (err) {
            return next(err);
        }

        if (countArr.length > 0) {
            var contractTcount = countArr[0].count;
            var no_of_pages;
            if (contractTcount / no_of_documents > 1) {
                no_of_pages = Math.ceil(contractTcount / no_of_documents);
            } else {
                no_of_pages = 1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }
            datacursor.exec(function (err, contracts) {
                var contract0 = JSON.parse(JSON.stringify(contracts));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err) {
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.contracts = contract0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = contractTcount;
                return next(null, objToReturn);
            });
        } else {
            var objToReturn = {};
            objToReturn.contracts = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};

module.exports.updateBulkContract = function (data, next) {
    var bulk = Contract.collection.initializeUnorderedBulkOp();
    for (let x in data) {
        bulk.find(data[x].find).updateOne(data[x].update);
    }
    bulk.execute(function (err, bulkres) {
        if (err) { console.log('rejected', err); return next(err); }
        resp.bulkres = bulkres;
        return next(null, resp);
    });
};




