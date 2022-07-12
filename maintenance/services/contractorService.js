/**
 * Created by Nipun on 5/25/2017.
 */

var Contractor=promise.promisifyAll(commonUtil.getMaintenanceModel('contractor'));

var NO_OF_DOCS =15;

var allowedFilter = ['clientId','name','mobile','company','address'];
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
            if(i=='name' || i=='company' || i=='address'){
                fFilter[i]={$regex: query[i], $options:'i'};
            }else {
                fFilter[i] = query[i];
            }

        }
    }
    return fFilter;
};

module.exports.addContractor = function(reqBody,next) {
    var ContractorData = new Contractor(reqBody);
    ContractorData.saveAsync()
        .then(function(savedData) {
            return next(null, savedData);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.getContractor = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    Contractor.countAsync(queryFilters)
        .then(function(count){
            var cursor = Contractor.find(queryFilters);
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

module.exports.findContractor = function(oQuery, next) {
    Contractor.findAsync(oQuery)
        .then(function (available) {
            return next(null, available);
        })
        .catch(function (err) {
            return next(err);
        });
};

module.exports.updateContractorById = function(id,reqBody,next) {
    Contractor.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
        .then(function(updated){
            return next(null, updated);
        }).catch(function (err) {
        return next(err);
    });
};

module.exports.deleteContractorById = function(id,next) {
    var remove = {};
    remove._id= id;
    Contractor.removeAsync(remove)
        .then(function(removed) {
            return next(null, removed);
        })
        .catch(function(err) {
            return next(err);
        });
};