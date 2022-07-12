var notification = promise.promisifyAll(commonUtil.getModel('notification'));
var NO_OF_DOCS =15;
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

module.exports.addnotification = function(data,next) {
    var notificationData = new notification(data);
    notificationData.saveAsync(data)
        .then(function(savedData) {
            return next(null, savedData);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.getnotification = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    notification.countAsync(queryFilters)
    .then(function(count){
        var cursor = notification.find(queryFilters);
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
            cursor.limit(parseInt(no_of_documents));reqQuery
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

module.exports.findnotification = function(oQuery, next) {
    notification.findAsync(oQuery)
    .then(function (available) {
        return next(null, available);
    })
    .catch(function (err) {
        return next(err);
    });
};
