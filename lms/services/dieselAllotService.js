var DieselAllot = promise.promisifyAll(commonUtil.getModel('dieselAllot'));
var NO_OF_DOCS =15;

function generateDieselAllotId(){
    var count = app_constant.dieselAllotCount;
    var ddmmyy = otherUtil.getDDMMYY();
    return ddmmyy+(++count);
}

module.exports.addDieselAllot = function(reqBody,next) {
    reqBody.dieselAllotId= generateDieselAllotId();
    var dieselAllot = new DieselAllot(reqBody);
    dieselAllot.saveAsync(reqBody)
        .then(function(dieselAllot) {
            counterUtil.incrementDieselAllotCount();
            winston.info("added dieselAllot",JSON.stringify(dieselAllot));
            return next(null, dieselAllot);
        })
        .catch(function(err) {
            winston.error("error in add dieselAllot:" + err);
            return next(err);
        });
};

module.exports.updateDieselAllotId = function(id,reqBody,next) {
    DieselAllot.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
        .then(function(dieselAllot) {
            winston.info("updated dieselAllot ", JSON.stringify(dieselAllot));
            return next(null, dieselAllot);
        })
        .catch(function(err) {
            winston.error("error in update dieselAllot:" + err);
            return next(err);
        });
};

module.exports.updateDieselAllotIdSetPush = function(id,newData,next) {
    var newDetails = {};
    if (newData.toSet){
        newDetails["$set"]=newData.toSet;
    }
    if (newData.toPush){
        newDetails["$push"]=newData.toPush;
    }
    console.log(newDetails);
    DieselAllot.findOneAndUpdateAsync({_id:id},newDetails,{new:true})
        .then(function(updated){
            return next(null, updated);
        }).catch(function (err) {
        return next(err);
    });
};


module.exports.findDieselAllotId = function(id,next) {
    DieselAllot.findAsync({_id:id})
        .then(function (dieselAllot) {
            winston.info("found dieselAllot", JSON.stringify(dieselAllot));
            return next(null, dieselAllot);
        }).catch(function (err) {
        winston.error("error in find dieselAllot:" + err);
        return next(err);
    });
};

module.exports.findDieselAllotQuery = function(query,next) {
    DieselAllot.findAsync(query)
        .then(function (dieselAllot) {
            winston.info("found dieselAllot", JSON.stringify(dieselAllot));
            return next(null, dieselAllot);
        }).catch(function (err) {
        winston.error("error in find dieselAllot:" + err);
        return next(err);
    });
};

module.exports.deleteDieselAllotId = function(id,next) {
    var remove = {};
    remove._id= id;
    DieselAllot.deleteAsync(remove)
        .then(function(removed) {
            winston.info("removed dieselAllot",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove dieselAllot " + err);
            return next(err);
        });
};

module.exports.deleteDieselAllotQuery = function(query,next) {
    DieselAllot.deleteAsync(query)
        .then(function(removed) {
            winston.info("removed dieselAllot",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove dieselAllot " + err);
            return next(err);
        });
};

var allowedSearchFields = {"_id":1,"dieselAllotId":1,"customer__id":1,"contract_name":1,
    "contractId":1, "contract__id":1, "customer_name":1, "customerId":1, "route_name":1, "route__id":1,
    "created_by":1,"last_modified_by":1};


function createDieselAllotAggrFilter(reqQuery){
    var aggrFilter = [];
    aggrFilter.push({$match:{deleted:{$ne:true}}});
    for(var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "name") {
                var obj ={};
                obj[key]= {$regex: reqQuery[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key ==="_id" || key==="contract__id"){
                obj ={};
                obj[key]= mongoose.Types.ObjectId(reqQuery[key]);
                aggrFilter.push({$match: obj});
            }else {
                obj ={};
                obj[key]= reqQuery[key];
                aggrFilter.push({$match: obj});
            }
        }
    }

    return aggrFilter;
}

module.exports.searchDieselAllot = function(reqQuery, trim, next) {
    var aggrFilter  = createDieselAllotAggrFilter(reqQuery);

    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (trim){
        var projection = {_id:1,route_name:1,dieselAllotId:1};
        aggrFilter.push({$project:projection});
    }
    var datacursor = DieselAllot.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = DieselAllot.aggregate(aggrFilter);
    var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

    if(no_of_documents > NO_OF_DOCS){
        no_of_documents = NO_OF_DOCS;
    }

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }
    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }

        if (countArr.length>0){
            var dieselAllotCount = countArr[0].count;
            var no_of_pages;
            if(dieselAllotCount/no_of_documents>1){
                no_of_pages = Math.ceil(dieselAllotCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            datacursor.limit(parseInt(no_of_documents));
            datacursor.exec(function (err, dieselAllots) {
                var dieselAllot0 = JSON.parse(JSON.stringify(dieselAllots));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.dieselAllots = dieselAllot0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = dieselAllotCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.dieselAllots = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};





