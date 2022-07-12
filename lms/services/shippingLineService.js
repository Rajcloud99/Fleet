var ShippingLine = promise.promisifyAll(commonUtil.getModel('shippingLine'));
var NO_OF_DOCS =15;

function generateShippingLineId(){
    var count = app_constant.shippingLineCount;
    var ddmmyy = otherUtil.getDDMMYY();
    return "SHL"+ddmmyy+(++count);
}

module.exports.addShippingLine = function(reqBody,next) {
    reqBody.shippingLineId= generateShippingLineId();
    var shippingLine = new ShippingLine(reqBody);
    shippingLine.saveAsync(reqBody)
        .then(function(shippingLine) {
            counterUtil.incrementShippingLineCount();
            winston.info("added shippingLine",JSON.stringify(shippingLine));
            return next(null, shippingLine);
        })
        .catch(function(err) {
            winston.error("error in add shippingLine:" + err);
            return next(err);
        });
};

module.exports.updateShippingLineId = function(id,reqBody,next) {
    ShippingLine.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
        .then(function(shippingLine) {
            winston.info("updated shippingLine ", JSON.stringify(shippingLine));
            return next(null, shippingLine);
        })
        .catch(function(err) {
            winston.error("error in update shippingLine:" + err);
            return next(err);
        });
};

module.exports.updateShippingLineIdSetPush = function(id,newData,next) {
    var newDetails = {};
    if (newData.toSet){
        newDetails["$set"]=newData.toSet;
    }
    if (newData.toPush){
        newDetails["$push"]=newData.toPush;
    }
    console.log(newDetails);
    ShippingLine.findOneAndUpdateAsync({_id:id},newDetails,{new:true})
        .then(function(updated){
            return next(null, updated);
        }).catch(function (err) {
        return next(err);
    });
};


module.exports.findShippingLineId = function(id,next) {
    ShippingLine.findAsync({_id:id})
        .then(function (shippingLine) {
            winston.info("found shippingLine", JSON.stringify(shippingLine));
            return next(null, shippingLine);
        }).catch(function (err) {
        winston.error("error in find shippingLine:" + err);
        return next(err);
    });
};

module.exports.findShippingLineQuery = function(query,next) {
    ShippingLine.findAsync(query)
        .then(function (shippingLine) {
            winston.info("found shippingLine", JSON.stringify(shippingLine));
            return next(null, shippingLine);
        }).catch(function (err) {
        winston.error("error in find shippingLine:" + err);
        return next(err);
    });
};

module.exports.deleteShippingLineId = function(id,next) {
    var remove = {};
    remove._id= id;
    ShippingLine.deleteAsync(remove)
        .then(function(removed) {
            winston.info("removed shippingLine",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove shippingLine " + err);
            return next(err);
        });
};

module.exports.deleteShippingLineQuery = function(query,next) {
    ShippingLine.deleteAsync(query)
        .then(function(removed) {
            winston.info("removed shippingLine",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove shippingLine " + err);
            return next(err);
        });
};

var allowedSearchFields = {"_id":1,"clientId":1,"name":1,"code":1,"shippingLineId":1,
    "created_by":1,"last_modified_by":1};


function createShippingLineAggrFilter(reqQuery){
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

module.exports.searchShippingLine = function(reqQuery, trim, next) {
    var aggrFilter  = createShippingLineAggrFilter(reqQuery);
    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (trim){
        var projection = {_id:1,name:1,shippingLineId:1};
        aggrFilter.push({$project:projection});
    }
    var datacursor = ShippingLine.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = ShippingLine.aggregate(aggrFilter);
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
            var shippingLineCount = countArr[0].count;
            var no_of_pages;
            if(shippingLineCount/no_of_documents>1){
                no_of_pages = Math.ceil(shippingLineCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }
            datacursor.exec(function (err, shippingLines) {
                var shippingLine0 = JSON.parse(JSON.stringify(shippingLines));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.shippingLines = shippingLine0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = shippingLineCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.shippingLines = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};





