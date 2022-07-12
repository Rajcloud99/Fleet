var VendorMaintenance = promise.promisifyAll(commonUtil.getMaintenanceModel('vendorMaintenance_'));
var NO_OF_DOCS =15;

var allowedFilter = ["clientId","vendorId","_id","find"];
var isAllowedFilter  = function(sFilter){
    var isAllowed = false;
    if(allowedFilter.indexOf(sFilter)>=0){
        isAllowed =  true;
    }
    return isAllowed;
};
var constructFilters = function(query){
    var fFilter = {clientId : query.clientId};
    for(i in query){
        if(isAllowedFilter(i)){
            if(i=='find'){
                fFilter.$or=[];
                fFilter.$or.push({"name":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"address":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"prim_contact_person":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"alt_contact_person":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"email":{$regex: query[i], $options:'i'}});
                fFilter.$or.push({"status":{$regex: query[i], $options:'i'}});
            }else
            fFilter[i] = query[i];
        }
    }
    return fFilter;
};


/**************maintenance vendor ***********/
module.exports.addVendorMaintenance = function(reqBody,next) {
    idUtil.generateNewVendorIdAsync({clientId:reqBody.clientId})
        .then(function (id) {
            reqBody.vendorId= id;
            var vendorC = new VendorMaintenance(reqBody);
            vendorC.saveAsync(reqBody)
                .then(function(vendorC) {
                    //counterUtil.incrementVendorMaintenanceCount();
                    winston.info("added product vendor",JSON.stringify(vendorC));
                    return next(null, vendorC);
                })
                .catch(function(err) {
                    winston.error("error in add product vendor:" + err);
                    return next(err);
                });
        })
        .catch(function(err) {
            winston.error("error in add product vendor:" + err);
            return next(err);
        });

};

module.exports.updateVendorMaintenanceById = function(id,reqBody,next) {
    VendorMaintenance.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
        .then(function(branch) {
            winston.info("updated product vendor", JSON.stringify(branch));
            return next(null, branch);
        })
        .catch(function(err) {
            winston.error("error in update productvendor:" + err);
            return next(err);
        });
};

module.exports.findVendorMaintenanceById = function(id,next) {
    VendorMaintenance.findAsync({_id:id})
        .then(function (vendor) {
            winston.info("found product vendor", JSON.stringify(vendor));
            return next(null, vendor);
        }).catch(function (err) {
        winston.error("error in find product vendor:" + err);
        return next(err);
    });
};

module.exports.findVendorMaintenanceByQuery = function(query,next) {
    VendorMaintenance.findAsync(query)
        .then(function (vendor) {
            winston.info("found vendor", JSON.stringify(vendor));
            return next(null, vendor);
        }).catch(function (err) {
        winston.error("error in find vendor:" + err);
        return next(err);
    });
};

module.exports.deleteVendorMaintenanceById = function(id,next) {
    VendorMaintenance.removeAsync({_id:id})
        .then(function(removed) {
            winston.info("removed vendor",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove vendor " + err);
            return next(err);
        });
};

module.exports.deleteVendorMaintenanceByQuery = function(query,next) {
    VendorMaintenance.deleteAsync(query)
        .then(function(removed) {
            winston.info("removed vendor",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove vendor " + err);
            return next(err);
        });
};


module.exports.searchVendorMaintenance = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    VendorMaintenance.countAsync(queryFilters)
    .then(function(count){
        var cursor = VendorMaintenance.find(queryFilters);
        
        if(reqQuery && reqQuery.sort){
            var params = reqQuery.sort.split(':');
            if(params[1]){
                var oSort = {'created_at' : parseInt(params[1])}
                cursor.sort(oSort);
            }
        }
        var no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : NO_OF_DOCS;
        if(no_of_documents>15){
            no_of_documents = 15;
        }
        if(reqQuery && reqQuery.skip){//TODO check field is valid or not
            var skip_docs = (parseInt(reqQuery.skip)-1)*no_of_documents;
            cursor.skip(parseInt(skip_docs));
        }
        if(count/no_of_documents>1){
            no_of_pages = count/no_of_documents;
        }
        if(reqQuery.all){
            cursor.limit(100000);
        }else{
            cursor.limit(parseInt(no_of_documents));
        }

        cursor.exec(
            function(err,available) {
                if (err){
                  return next(err);
                }
                if(available && available[0]){
                    winston.info("gr is available");
                    var maintenanceVendors = JSON.parse(JSON.stringify(available));
                    var oRes = {};
                    oRes.no_of_pages =Math.ceil(no_of_pages);
                    oRes.data = maintenanceVendors;
                    return next(null, oRes);
                }else{
                    return next(null, false);
                }
            }
        ) 
    })
        .catch(
        function(err) {
            winston.error("Error in get available:" + err);
            return next(err);
        }
    );
};

