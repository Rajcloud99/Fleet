var ModelMaster = promise.promisifyAll(commonUtil.getMaintenanceModel('modelmaster'));
var NO_OF_DOCS =15;
var allowedFilter = ['manufacturer','variant'];
var isAllowedFilter  = function(sFilter){
    var isAllowed = false;
    if(allowedFilter.indexOf(sFilter)>=0){
        isAllowed =  true;
    }
    return isAllowed;
};

var constructFilters = function(query){
    var objFilter = {};
    for(var i in query){
        if (query.hasOwnProperty(i)) {
            if (isAllowedFilter(i)) {
                objFilter[i] = query[i];
            }
        }
    }
    return objFilter;
};

module.exports.addModel = function(data,next) {
    delete data.clientId;
    var ModelData = new ModelMaster(data);
    ModelData.saveAsync(data)
        .then(function(savedData) {
            return next(null, savedData);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.deleteModelById = function(id,next) {
    var remove = {};
    remove._id= id;
    ModelMaster.deleteAsync(remove)
    .then(function(removed) {
        return next(null, removed);
    })
    .catch(function(err) {
        return next(err);
    });
};

module.exports.updateModelById = function(id,reqBody,next) {
    ModelMaster.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};

module.exports.getModel = function(reqQuery, next) {
    delete reqQuery.clientId;
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    ModelMaster.countAsync(queryFilters)
    .then(function(count){
        var cursor = ModelMaster.find(queryFilters);
        var no_of_documents;
        if(reqQuery.all == "true"){
            no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : 1000;
            if(count/no_of_documents>1){
                no_of_pages = postingsCount/no_of_documents;
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

module.exports.findModel = function(oQuery, next) {
    ModelMaster.findAsync(oQuery)
    .then(function (available) {
        return next(null, available);
    })
    .catch(function (err) {
        return next(err);
    });
};
