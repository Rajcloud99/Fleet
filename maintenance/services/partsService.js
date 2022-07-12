
/**
 * Created by pratik on 22/12/16.
 */
var Parts = promise.promisifyAll(commonUtil.getMaintenanceModel('parts'));
var NO_OF_DOCS =15;
var allowedFilter = ['clientId','find','code','category_wise_code','name','category_name','category_code','type','uom','vehicle_models'];
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
            if(i=='find'){
                fFilter.$or=[];
                fFilter.$or.push({"code":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"category_wise_code":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"name":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"category_name":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"category_code":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"type":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"uom":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"vehicle_models":{$regex: query[i], $options:'i'}});
            }
            else{
                fFilter[i] = query[i];
            }
        }
    }
    return fFilter;
};

module.exports.addPart = function(reqBody,next) {
    idUtil.generatePartCodeAsync({clientId:reqBody.clientId})
        .then(function(partCode){
            idUtil.generatePartCategoryWiseCodeAsync({clientId:reqBody.clientId,category_code:reqBody.category_code}
            ,reqBody.category_code)
                .then(function(partCategoryWiseCode){
                    reqBody.sn = partCode;
					reqBody.code = "SP"+partCode;
					reqBody.category_wise_code = partCategoryWiseCode;
                    var PartsData = new Parts(reqBody);
                    PartsData.saveAsync(reqBody)
                        .then(function(savedData) {
                            return next(null, savedData);
                        })
                        .catch(function(err) {
                            return next(err);
                        });
                }).catch(next)
        }).catch(next);
};

module.exports.getParts = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    Parts.countAsync(queryFilters)
    .then(function(count){
        var cursor = Parts.find(queryFilters);
        var no_of_documents;
        if(reqQuery && reqQuery.sort){
            var params = reqQuery.sort.split(':');
            if(params[1]){
                var oSort = {'created_at' : parseInt(params[1])}
                cursor.sort(oSort);
            }
        }
        if(reqQuery.all == "true"){
            no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : 4000;
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

module.exports.findPart = function(oQuery, next) {
    Parts.findAsync(oQuery)
    .then(function (available) {
        return next(null, available);
    })
    .catch(function (err) {
        return next(err);
    });
};

module.exports.updatePartById = function(id,reqBody,next) {
    Parts.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};

module.exports.deletePartById = function(id,next) {
    var remove = {};
    remove._id= id;
    Parts.removeAsync(remove)
    .then(function(removed) {
        return next(null, removed);
    })
    .catch(function(err) {
        return next(err);
    });
};
