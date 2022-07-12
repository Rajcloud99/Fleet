/**
 * Created by nipun on 21/1/16.
 */
var winston = require('winston');
var structureMaster = promise.promisifyAll(commonUtil.getMaintenanceModel('structureMaster'));
var NO_OF_DOCS = 15;
var allowedFilter = [];
var isAllowedFilter  = function(sFilter){
    var isAllowed = false;
    if(allowedFilter.indexOf(sFilter)>=0){
        isAllowed =  true;
    }
    return isAllowed;
};
var constructFilters = function(query){
    var fFilter = {};
    for(i in query){
        if(isAllowedFilter(i)){
            fFilter[i] = query[i];
        }
    }
    return fFilter;
};

module.exports.addstructureMaster = function(reqBody,next) {
    var structureMasters = new structureMaster(reqBody);
    structureMasters.saveAsync(reqBody)
        .then(function(structure) {
            winston.info("added structure",JSON.stringify(structure));
            return next(null, structure);
        })
        .catch(function(err) {
            winston.error("error in add structure:" + err);
            return next(err);
        });
};

module.exports.getstructureMasters = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    structureMaster.countAsync(queryFilters)
    .then(function(count){
        var cursor = structureMaster.find(queryFilters);
        var no_of_documents;
        if(reqQuery.all == "true"){
            no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : 1000;
            if(count/no_of_documents>1){
                no_of_pages = count/no_of_documents;
            }
            cursor.limit(parseInt(no_of_documents));
        }else{
            no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
            if(no_of_documents>15){
                no_of_documents = 15;
            }
            if(count/no_of_documents>1){
                no_of_pages = count/no_of_documents;
            }
            cursor.limit(parseInt(no_of_documents));
        }

        if(reqQuery && reqQuery.skip){
            var skip_docs = (reqQuery.skip-1)*no_of_documents;
            cursor.skip(parseInt(skip_docs));
        }

        cursor.exec(
            function(err,available) {
                if (err){
                  return next(err);
                }
                if(available && available[0]){
                    var temp = JSON.parse(JSON.stringify(available));
                    var oRes = {};
                    oRes.no_of_pages =Math.ceil(no_of_pages);
                    oRes.data = temp;
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

module.exports.findstructureMaster = function(oQuery, next) {
    structureMaster.findAsync(oQuery)
    .then(function (available) {
        return next(null, available);
    })
    .catch(function (err) {
        return next(err);
    });
};

module.exports.updatestructureMasterById = function(id,reqBody,next) {
    structureMaster.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};

module.exports.deletestructureMasterById = function(id,next) {
    var remove = {};
    remove._id= id;
    structureMaster.removeAsync(remove)
    .then(function(removed) {
        return next(null, removed);
    })
    .catch(function(err) {
        return next(err);
    });
};
