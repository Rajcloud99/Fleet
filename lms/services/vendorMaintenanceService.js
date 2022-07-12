var VendorMaintenance = promise.promisifyAll(commonUtil.getModel('vendorMaintenance'));
var NO_OF_DOCS =15;

function generateMaintenanceVendorId(){
    var count = app_constant.vendorMaintenanceCount;
    var ddmmyy = otherUtil.getDDMMYY();
    return "VM"+ddmmyy+(++count);
}

/**************maintenance vendor ***********/
module.exports.addVendorMaintenance = function(reqBody,next) {
    reqBody.vendorId= generateMaintenanceVendorId();
    var vendorC = new VendorMaintenance(reqBody);
    vendorC.saveAsync(reqBody)
        .then(function(vendorC) {
            counterUtil.incrementVendorMaintenanceCount();
            return next(null, vendorC);
        })
        .catch(function(err) {
            winston.error("error in add vendor maintenance:" + err);
            return next(err);
        });
};

module.exports.updateVendorMaintenanceId = function(id,reqBody,next) {
    VendorMaintenance.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
        .then(function(branch) {
            return next(null, branch);
        })
        .catch(function(err) {
            winston.error("error in update vendor maintenance:" + err);
            return next(err);
        });
};

module.exports.findVendorMaintenanceId = function(id,next) {
    VendorMaintenance.findAsync({_id:id})
        .then(function (vendor) {
            return next(null, vendor);
        }).catch(function (err) {
        winston.error("error in find vendor maintenance:" + err);
        return next(err);
    });
};

module.exports.findVendorMaintenanceQuery = function(query,next) {
    VendorMaintenance.findAsync(query)
        .then(function (vendor) {
            return next(null, vendor);
        }).catch(function (err) {
        winston.error("error in find vendor:" + err);
        return next(err);
    });
};

module.exports.deleteVendorMaintenanceId = function(id,next) {
    VendorMaintenance.deleteAsync({_id:id})
        .then(function(removed) {
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove vendor maintenance " + err);
            return next(err);
        });
};

module.exports.deleteVendorMaintenanceQuery = function(query,next) {
    VendorMaintenance.deleteAsync(query)
        .then(function(removed) {
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove vendor maintenance " + err);
            return next(err);
        });
};

var allowedSearchFields = {"_id":1,"name":1,"vendorId":1,"contact_person":1,
    "prim_contact_no":1,"email":1,"created_by":1,"last_modified_by":1};


function createVendorMaintenanceAggrFilter(reqQuery){
    var aggrFilter = [];
    aggrFilter.push({$match:{deleted:{$ne:true}}});
    for(var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
            if (key === "name" || key === "contact_person") {
                var obj ={};
                obj[key]= {$regex: reqQuery[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key==="_id"){
                obj ={};
                obj[key]= mongoose.Types.ObjectId(reqQuery[key]);
                aggrFilter.push({$match: obj});
            } else {
                obj ={};
                obj[key]= reqQuery[key];
                aggrFilter.push({$match: obj});
            }
        }
    }

    return aggrFilter;
}

module.exports.searchVendorMaintenance = function(reqQuery, trim, next) {
    var aggrFilter  = createVendorMaintenanceAggrFilter(reqQuery);

    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (trim){
        var projection = {_id:1,name:1,vendorId:1};
        aggrFilter.push({$project:projection});
    }
    var datacursor = VendorMaintenance.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = VendorMaintenance.aggregate(aggrFilter);
    var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

    if (no_of_documents > NO_OF_DOCS) {
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
            var vendorTcount = countArr[0].count;
            var no_of_pages;
            if(vendorTcount/no_of_documents>1){
                no_of_pages = Math.ceil(vendorTcount/no_of_documents);
            }else{
                no_of_pages =1;
            }

            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }
            datacursor.exec(function (err, vendors) {
                var vendor0 = JSON.parse(JSON.stringify(vendors));
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.vendors = vendor0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = vendorTcount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.vendors = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};






