var Capacity = promise.promisifyAll(commonUtil.getModel('capacity'));
var NO_OF_DOCS =15;

function generateCapacityId(){
    var count = app_constant.capacityCount;
    var ddmmyy = otherUtil.getDDMMYY();
    return ddmmyy+(++count);
}

module.exports.addCapacity = function(reqBody,next) {
    reqBody.capacityId= generateCapacityId();
    var capacity = new Capacity(reqBody);
    capacity.saveAsync(reqBody)
        .then(function(capacity) {
            counterUtil.incrementCapacityCount();
            winston.info("added capacity",JSON.stringify(capacity));
            return next(null, capacity);
        })
        .catch(function(err) {
            winston.error("error in add capacity:" + err);
            return next(err);
        });
};

module.exports.updateCapacityId = function(id,reqBody,next) {
    Capacity.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
        .then(function(capacity) {
            winston.info("updated capacity ", JSON.stringify(capacity));
            return next(null, capacity);
        })
        .catch(function(err) {
            winston.error("error in update capacity:" + err);
            return next(err);
        });
};

module.exports.updateCapacityIdSetPush = function(id,newData,next) {
    var newDetails = {};
    if (newData.toSet){
        newDetails["$set"]=newData.toSet;
    }
    if (newData.toPush){
        newDetails["$push"]=newData.toPush;
    }
    console.log(newDetails);
    Capacity.findOneAndUpdateAsync({_id:id},newDetails,{new:true})
        .then(function(updated){
            return next(null, updated);
        }).catch(function (err) {
        return next(err);
    });
};

module.exports.getAssignedTransportRoute = function(capacity__id,next) {
    var cursor = Capacity.find({_id:capacity__id});
    //cursor.populate('transport_routes',{"_id": 1,"name":1})
    cursor.populate('transport_routes')
        .exec(function (err,capacity) {
            if (err){
                return next(err);
            }
            return next(null, capacity[0].transport_routes);
        }).catch(next)
};


module.exports.findCapacityId = function(id,next) {
    Capacity.findAsync({_id:id})
        .then(function (capacity) {
            winston.info("found capacity", JSON.stringify(capacity));
            return next(null, capacity);
        }).catch(function (err) {
        winston.error("error in find capacity:" + err);
        return next(err);
    });
};

module.exports.findCapacityQuery = function(query,next) {
    Capacity.findAsync(query)
        .then(function (capacity) {
            winston.info("found capacity", JSON.stringify(capacity));
            return next(null, capacity);
        }).catch(function (err) {
        winston.error("error in find capacity:" + err);
        return next(err);
    });
};

module.exports.deleteCapacityId = function(id,next) {
    var remove = {};
    remove._id= id;
    Capacity.deleteAsync(remove)
        .then(function(removed) {
            winston.info("removed capacity",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove capacity " + err);
            return next(err);
        });
};

module.exports.deleteCapacityQuery = function(query,next) {
    Capacity.deleteAsync(query)
        .then(function(removed) {
            winston.info("removed capacity",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove capacity " + err);
            return next(err);
        });
};

var allowedSearchFields = {"_id":1,"capacityId":1,"customer__id":1,"contract_name":1,
    "contractId":1, "contract__id":1, "customer_name":1, "customerId":1, "route_name":1, "route__id":1,
    "created_by":1,"last_modified_by":1};


function createCapacityAggrFilter(reqQuery){
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

module.exports.searchCapacity = function(reqQuery, trim, next) {
    var aggrFilter  = createCapacityAggrFilter(reqQuery);

    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (trim){
        var projection = {_id:1,capacityId:1,route_name:1};
        aggrFilter.push({$project:projection});
    }
    var datacursor = Capacity.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = Capacity.aggregate(aggrFilter);
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
            var capacityTcount = countArr[0].count;
            var no_of_pages;
            if(capacityTcount/no_of_documents>1){
                no_of_pages = Math.ceil(capacityTcount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            datacursor.limit(parseInt(no_of_documents));
            datacursor.exec(function (err, capacitys) {
                var capacity0 = JSON.parse(JSON.stringify(capacitys));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.capacitys = capacity0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = capacityTcount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.capacitys = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};





