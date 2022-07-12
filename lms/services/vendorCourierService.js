var VendorCourier = promise.promisifyAll(commonUtil.getModel('vendorCourier'));
var NO_OF_DOCS =15;

var allowedFilter = ["_id","clientId","name","vendorId","last_modified_by","created_by","status","prim_contact_person"];
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

function generateCourierVendorId(){
    var count = app_constant.vendorCourierCount;
    var ddmmyy = otherUtil.getDDMMYY();
    return "VC"+ddmmyy+(++count);
}

/**************courier vendor ***********/
module.exports.addVendorCourier = function(reqBody,next) {
    reqBody.vendorId= generateCourierVendorId();
    var vendorC = new VendorCourier(reqBody);
    vendorC.saveAsync(reqBody)
        .then(function(vendorC) {
            counterUtil.incrementVendorCourierCount();
            winston.info("added vendor courier",JSON.stringify(vendorC));
            return next(null, vendorC);
        })
        .catch(function(err) {
            winston.error("error in add vendor courier:" + err);
            return next(err);
        });
};

module.exports.updateVendorCourierId = function(id,reqBody,next) {
    VendorCourier.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
        .then(function(branch) {
            winston.info("updated vendor courier ", JSON.stringify(branch));
            return next(null, branch);
        })
        .catch(function(err) {
            winston.error("error in update vendor courier:" + err);
            return next(err);
        });
};

module.exports.findVendorCourierId = function(id,next) {
    VendorCourier.findAsync({_id:id})
        .then(function (vendor) {
            winston.info("found vendor courier", JSON.stringify(vendor));
            return next(null, vendor);
        }).catch(function (err) {
        winston.error("error in find vendor courier:" + err);
        return next(err);
    });
};
module.exports.findCourierVendor = function(oQuery, next) {
    VendorCourier.findAsync(oQuery)
    .then(function (vendor) {
        return next(null, vendor);
    })
    .catch(function (err) {
        return next(err);
    });
};

module.exports.findVendorCourierQuery = function(query,next) {
    VendorCourier.findAsync(query)
        .then(function (vendor) {
            winston.info("found vendor", JSON.stringify(vendor));
            return next(null, vendor);
        }).catch(function (err) {
        winston.error("error in find vendor:" + err);
        return next(err);
    });
};

module.exports.deleteVendorCourierId = function(id,next) {
    var remove = {};
    remove._id= id;
    VendorCourier.deleteAsync(remove)
        .then(function(removed) {
            winston.info("removed vendor courier",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove vendor courier " + err);
            return next(err);
        });
};

module.exports.deleteVendorCourierQuery = function(query,next) {
    VendorCourier.deleteAsync(query)
        .then(function(removed) {
            winston.info("removed vendor courier",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove vendor courier " + err);
            return next(err);
        });
};

module.exports.getVendorCourier = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    VendorCourier.countAsync(queryFilters)
    .then(function(count){
        var cursor = VendorCourier.find(queryFilters);
        
        var no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
        if(no_of_documents>15){
            no_of_documents = 15;
        }
        if(reqQuery && reqQuery.skip){//TODO check field is valid or not
            var skip_docs = (reqQuery.skip-1)*no_of_documents;
            cursor.skip(parseInt(skip_docs));
        }
        if(reqQuery && reqQuery.sortby && reqQuery.sortby.split(':')){
            var params = reqQuery.sortby.split(':');
            if(params[0]  && params[0] == 'created_at'){
                var oSort = {'created_at' : params[1]}
                cursor.sort(oSort);
            }
        }
        if(count/no_of_documents>1){
            no_of_pages = count/no_of_documents;
        }
        cursor.limit(no_of_documents);
        cursor.exec(
            function(err,available) {
                if (err){
                  return next(err);
                }
                if(available && available[0]){
                    var tempGR = JSON.parse(JSON.stringify(available));
                    var oRes = {};
                    oRes.no_of_pages =Math.ceil(no_of_pages);
                    oRes.data = tempGR;
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


