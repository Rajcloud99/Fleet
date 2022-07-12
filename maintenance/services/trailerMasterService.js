/**
 * Created by nipun on 21/1/16.
 */
var winston = require('winston');
var TrailerMaster = promise.promisifyAll(commonUtil.getMaintenanceModel('trailerMaster'));
var NO_OF_DOCS = 15;

module.exports.addTrailerMaster = function(reqBody,next) {
    var trailerMaster = new TrailerMaster(reqBody);
    trailerMaster.saveAsync(reqBody)
        .then(function(trailerMaster) {
            winston.info("added TrailerMaster",JSON.stringify(trailerMaster));
            return next(null, trailerMaster);
        })
        .catch(function(err) {
            winston.error("error in add TrailerMaster:" + err);
            return next(err);
        });
};

module.exports.updateTrailerMasterById = function(id,reqBody,next) {
    TrailerMaster.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new:true})
        .then(function(TrailerMaster) {
            winston.info("updated TrailerMaster ", JSON.stringify(TrailerMaster));
            return next(null, TrailerMaster);
        })
        .catch(function(err) {
            winston.error("error in update TrailerMaster:" + err);
            return next(err);
        });
};

module.exports.updateTrailerMasterByQuery = function(query,reqBody,next) {
    TrailerMaster.findOneAndUpdateAsync(query,{$set:reqBody}, {new:true})
        .then(function(TrailerMaster) {
            winston.info("updated TrailerMaster ", JSON.stringify(TrailerMaster));
            return next(null, TrailerMaster);
        })
        .catch(function(err) {
            winston.error("error in update TrailerMaster:" + err);
            return next(err);
        });
};

module.exports.findTrailerMasterById = function(id,next) {
    TrailerMaster.findAsync({_id:id})
        .then(function (TrailerMaster) {
            winston.info("found TrailerMaster", JSON.stringify(TrailerMaster));
            return next(null, TrailerMaster);
        }).catch(function (err) {
        winston.error("error in find TrailerMaster:" + err);
        return next(err);
    });
};

module.exports.findTrailerMasterByQuery = function(query,next) {
    TrailerMaster.findAsync(query)
        .then(function (TrailerMaster) {
            winston.info("found TrailerMaster", JSON.stringify(TrailerMaster));
            return next(null, TrailerMaster);
        }).catch(function (err) {
        winston.error("error in find TrailerMaster:" + err);
        return next(err);
    });
};

module.exports.deleteTrailerMasterById = function(id,next) {
    TrailerMaster.removeAsync({_id:mongoose.Types.ObjectId(id)})
        .then(function(removed) {
            winston.info("removed TrailerMaster",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove TrailerMaster " + err);
            return next(err);
        });
};

var allowedSearchFields = {"clientId":1,"_id":1,"name":1,"code":1,"associationFlag":1};

function createTrailerMasterAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "name" || key === "code") {
                var obj ={};
                obj[key]= {$regex: reqBody[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key==="_id"){
                obj ={};
                obj[key]= mongoose.Types.ObjectId(reqBody[key]);
                aggrFilter.push({$match: obj});
            }else if (key==="associationFlag"){
                obj ={};
                obj[key]= reqBody[key]=="true";
                aggrFilter.push({$match: obj});
            }else {
                obj ={};
                obj[key]= reqBody[key];
                aggrFilter.push({$match: obj});
            }
        }
    }
    return aggrFilter;
}

module.exports.searchTrailerMaster = function(reqQuery,next) {
    var aggrFilter  = createTrailerMasterAggrFilter(reqQuery);

    var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;
    if (no_of_documents > NO_OF_DOCS) {
        no_of_documents = NO_OF_DOCS;
    }
    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (reqQuery.trim){
        var projection = {_id:1,trailer_no:1};
        aggrFilter.push({$project:projection});
    }
    if (!reqQuery.all){
        aggrFilter.push({$limit:parseInt(no_of_documents)});
    }else{
        aggrFilter.push({$limit:10000});
    }
    var datacursor = TrailerMaster.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = TrailerMaster.aggregate(aggrFilter);

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }
    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }

        if (countArr.length>0){
            var TrailerMasterCount = countArr[0].count;
            var no_of_pages;
            if(TrailerMasterCount/no_of_documents>1){
                no_of_pages = Math.ceil(TrailerMasterCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            datacursor.exec(function (err, TrailerMasters) {
                var TrailerMasters0 = JSON.parse(JSON.stringify(TrailerMasters));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.trailerMasters = TrailerMasters0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = TrailerMasterCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.trailerMasters = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
