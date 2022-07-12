var pr = promise.promisifyAll(commonUtil.getMaintenanceModel('pr'));
var po = promise.promisifyAll(commonUtil.getMaintenanceModel('po'));
var Inventory = promise.promisifyAll(commonUtil.getMaintenanceModel('inventory'));

var async = require('async');

var NO_OF_DOCS =15;
var allowedFilter = ["clientId","date","status","spare_code","approved_by","created_by","prnumber","more_status","find"];
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
            if(i =='date'){
                var startDate = new Date(query[i]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                var nextDay = new Date(startDate);
                nextDay.setDate(startDate.getDate() + 1);
                fFilter["created_at"] = {
                    "$gte" :startDate,
                    "$lt":nextDay
                };
            }else if(i =="spare_code"){
                fFilter["spare.code"] = {"$in":query[i]};
            }else if(i =="approved_by"){
                fFilter["approver._id"] = query[i];
            }else if(i =="more_status"){
                var parseFilter = JSON.parse(query[i]);
                fFilter["status"] = {"$in":parseFilter};
            }else if(i =="find"){
				fFilter.$or=[];
				fFilter.$or.push({"prnumber":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"approver.name":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"status":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"processed_by_name":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.po_no":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.code":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.name":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.category_name":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.category_code":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.type":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.uom":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.priority":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.brand":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.remark":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.vehicle_make":{$regex: query[i], $options:'i'}});
				fFilter.$or.push({"spare.previousVendorName":{$regex: query[i], $options:'i'}});
			}else{
                fFilter[i] = query[i];
            }
        }
    }
    return fFilter;
};



module.exports.addpr = function(request,next) {
    idUtil.generatePRCodeAsync({clientId:request.clientId})
        .then(function(codeData){
            request.prnumber=codeData;
            async.forEachOf(request.spare,function (spare, i, callback){
                request.spare[i].remaining_quantity = request.spare[i].quantity;
                callback();
                /*var invFilter={};
                invFilter.clientId=request.clientId;
                invFilter.branchId=request.branchId;
                invFilter.spare_code=spare.code;
                invFilter.spare_name=spare.name;
                var cursor=Inventory.find(invFilter).sort({ $natural: -1 }).limit(1);
                cursor.exec(function (err,iSpare) {
                    if(iSpare && iSpare[0]){
                        request.spare[i].previousRate=iSpare[0].rate_inc_tax||iSpare[0].rate_per_piece||0;
                        request.spare[i].previousQty=iSpare[0].quantity||0;
                        request.spare[i].previousVendorName=iSpare[0].vendor_name||"NA";
                        request.spare[i].previousDate=iSpare[0].created_at;
                        callback();
                    }else{
                        request.spare[i].previousRate=0;
                        callback();
                    }
                })*/
            }, function(err){
                if(err) return(err);
                var prData=new pr(request);
                prData.saveAsync()
                .then(function (savedData){
                    return next(null, savedData)
                })
                .catch(function(err) {
                    return next(err);
                });
            })
        }).catch(next)
};

module.exports.editprById = function(id,request,next) {
    async.forEachOf(request.spare,function (spare, i, callback){
        request.spare[i].remaining_quantity = request.spare[i].quantity || 0;
        callback();
        /*var invFilter={};
        invFilter.clientId=request.clientId;
        invFilter.branchId=request.branchId;
        invFilter.spare_code=spare.code;
        invFilter.spare_name=spare.name;
        var cursor=Inventory.find(invFilter).sort({ $natural: -1 }).limit(1);
        cursor.exec(function (err,iSpare) {
            if(iSpare && iSpare[0]){
                request.spare[i].previousRate=iSpare[0].rate_inc_tax||iSpare[0].rate_per_piece||0;
                callback();
            }else{
                request.spare[i].previousRate=0;
                callback();
            }
        })*/
    }, function(err){
        if(err) return(err);
        pr.findOneAndUpdateAsync({_id:id},{$set:request}, {new: true})
        .then(function (updated){
            return next(null, updated)
        })
        .catch(function(err) {
            return next(err);
        });
    })
};

module.exports.deleteprById = function(id,next) {
    var remove = {};
    remove._id= id;
    pr.deleteAsync(remove)
    .then(function(removed) {
        return next(null, removed);
    })
    .catch(function(err) {
        return next(err);
    });
};

module.exports.pushTopoById = function(id,reqBody,next) {
    po.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};

/*module.exports.editprById = function(id,reqBody,next) {
    pr.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};*/

module.exports.getpr = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    pr.countAsync(queryFilters)
    .then(function(count){
        var cursor = pr.find(queryFilters);
        cursor.sort({'created_at' : -1});
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
                    oRes.count =count;
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

module.exports.findpr = function(oQuery, next) {
    pr.findAsync(oQuery)
    .then(function (available) {
        return next(null, available);
    })
    .catch(function (err) {
        return next(err);
    });
};
