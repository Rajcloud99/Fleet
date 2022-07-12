
/**
 * Created by pratik on 21/10/16.
 */
var CourierOffice = promise.promisifyAll(commonUtil.getModel('courierOffice'));
var NO_OF_DOCS =15;
var allowedFilter = ["_id","clientId","branch_name","city","state","address","vendorId","courier_vendor_id","contact_person"];
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

module.exports.addCourierOffice = function(data,next) {
    var CourierOfficeData = new CourierOffice(data);
    CourierOfficeData.saveAsync(data)
        .then(function(office) {
            //winston.info("added gr",JSON.stringify(office));
            return next(null, office);
        })
        .catch(function(err) {
            //winston.error("error in add gr:" + err);
            return next(err);
        });
};

module.exports.getCourierOffice = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    CourierOffice.countAsync(queryFilters)
    .then(function(count){
        var cursor = CourierOffice.find(queryFilters);
        
        var no_of_documents = reqQuery && reqQuery.no_of_docs ? reqQuery.no_of_docs : NO_OF_DOCS;
        if(no_of_documents>15){
            no_of_documents = 15;
        }
        if(reqQuery && reqQuery.skip){//TODO check field is valid or not
            var skip_docs = (reqQuery.skip-1)*no_of_documents;
            cursor.skip(parseInt(skip_docs));
        }
        if(count/no_of_documents>1){
            no_of_pages = count/parseInt(no_of_documents);
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

module.exports.findCourierOffice = function(oQuery, next) {
    CourierOffice.findAsync(oQuery)
    .then(function (office) {
        return next(null, office);
    })
    .catch(function (err) {
        return next(err);
    });
};

module.exports.updateCourierOfficeById = function(id,reqBody,next) {
    CourierOffice.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};

module.exports.deleteCourierOffice = function(id,next) {
    var remove = {};
    remove._id= id;
    CourierOffice.deleteAsync(remove)
    .then(function(removed) {
        return next(null, removed);
    })
    .catch(function(err) {
        return next(err);
    });
};





