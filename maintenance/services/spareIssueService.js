/**
 * Created by nipun on 17/1/16.
 */
 var SpareIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('spareIssue'));
 var Inventory = promise.promisifyAll(commonUtil.getMaintenanceModel('inventory'));
 var winston = require('winston');
 var async=require("async");

 module.exports.addSpareIssue = function(reqBody,next){
     if(reqBody.slip_number) reqBody.pslip_number=reqBody.slip_number;
     idUtil.generateSlipNumberAsync({clientId:reqBody.clientId})
         .then(function(slip_numbmer) {
             reqBody.slip_number = slip_numbmer;
             var issued_spare=[];
             async.forEachOf(reqBody.spare_list,function(spareToIssue,index,callback){
                 if(spareToIssue.flag=="issued"){
                     Inventory.aggregateAsync([{$match: {"spare_code": spareToIssue.spare_code, "clientId":reqBody.clientId, "branchId":reqBody.branchId}}
                         , {$group: {_id: "$spare_code", "remaining": {$sum: "$remaining_quantity"}}}])
                         .then(function(data){
                             if((data[0] && data[0].remaining)<spareToIssue.issue_quantity){
                                 callback("quantity unavailable");
                             }
                             else{
                                 getInventory(issued_spare,reqBody,spareToIssue,spareToIssue.issue_quantity,
                                     function(data){
                                         callback();
                                     })
                             }
                         })
                 }
                 else if (spareToIssue.flag=="returned") {
                     issued_spare.push(spareToIssue);
                     if(!reqBody.pslip_number) return next("Please provide previous slip_number");
                     var returnQuantity=Math.abs(spareToIssue.quantity);
                     Inventory.findOneAndUpdateAsync({"_id" : mongoose.Types.ObjectId(spareToIssue.inventory_id)},{$inc:{"remaining_quantity" : returnQuantity}})
                         .then(function(data){
							 if (data) {
								 var filter = {
									 "slip_number": reqBody.pslip_number,
									 "issued_spare.inventory_id": spareToIssue.inventory_id,
									 "issued_spare.flag": "issued"
								 };
								 var updateBody = {
									 $push: {
										 "issued_spare.$.returned": {
											 quantity: returnQuantity,
											 slip_number: reqBody.slip_number
										 }
									 },
									 $inc: {"issued_spare.$.total_returned": returnQuantity}
								 };
								 SpareIssue.updateAsync(filter, updateBody)
									 .then(function (data) {
										 console.log(data);
										 if (data.nModified > 0)
											 callback();
										 else {
											 callback("Some error occurred Check the log");
										 }
									 })
									 .catch(function (err) {
										 callback(err);
									 })
							 }
							 else{
								 callback("Inventory Update Failed!");
							 }
                         })
                         .catch(function(err){
                             callback(err);
                         })
                 } else{
                     return next("Please specify flag");
                 }
             }, function(err){
                 if(err) return next(err);
                 reqBody.issued_spare=issued_spare;
                 reqBody.slip_number=slip_numbmer;
                 var spareIssue = new SpareIssue(reqBody);
                 spareIssue.saveAsync(reqBody)
                     .then(function(spareIssued) {
                         winston.info(reqBody.flag+" spare", JSON.stringify(spareIssued));
                         logger.info(reqBody.flag+" spare"+ JSON.stringify(spareIssued));
                         return next(null, spareIssued);
                     })
                     .catch(function(err) {
                         winston.error("error in "+reqBody.flag+" Spare:" + err);
                         logger.error("error in "+reqBody.flag+" Spare:" + err);
                         return next(err);
                     });
             })
         }).catch(next);
 };

/*
 module.exports.findSpareIssue = function(oQuery, next) {
     if(oQuery.taskId){
         oQuery['issued_spare.taskId']=oQuery.taskId;
         delete oQuery.taskId;
     }
     SpareIssue.aggregateAsync([{$unwind:'$issued_spare'},{$match:oQuery}])
     .then(function (available) {
         return next(null, available);
     })
     .catch(function (err) {
         return next(err);
     });
 };
*/

module.exports.getSpareIssue = function(oQuery, next) {
    if(oQuery.taskId){
        oQuery['issued_spare.taskId']=oQuery.taskId;
        delete oQuery.taskId;
    }
    SpareIssue.findAsync(oQuery)
        .then(function (available) {
            return next(null, available);
        })
        .catch(function (err) {
            return next(err);
        });
};


 var getInventory=function(dataToReturn,reqBody,spareToIssue,quantity,next){
   Inventory.find({
                   clientId: reqBody.clientId,
                   spare_code: spareToIssue.spare_code, homId: reqBody.homId, remaining_quantity: { $gt: 0 }
               }).sort({$natural: 1}).limit(1)
        .then(function(data){
            var dataToPush={};
            dataToPush.taskId=spareToIssue.taskId;
            dataToPush.task_name=spareToIssue.task_name;
            dataToPush.spare_code=spareToIssue.spare_code;
            dataToPush.spare_name=spareToIssue.spare_name;
            dataToPush.flag=spareToIssue.flag;
            dataToPush.cost_per_piece=data[0].rate_inc_tax || data[0].rate_per_piece;
            dataToPush.category_name=data[0].category_name;
            dataToPush.category_code=data[0].category_code;
            dataToPush.uom=data[0].uom ;
            dataToPush.inventory_entryid=data[0].entryId;
			dataToPush.inventory_id=data[0]._id;
			if(quantity>data[0].remaining_quantity){
                dataToPush.quantity=data[0].remaining_quantity;
                dataToReturn.push(dataToPush);
                Inventory.findOneAndUpdateAsync({"_id" : data[0]._id},{$set:{"remaining_quantity" : 0}})
                    .then(function(updated){
                        getInventory(dataToReturn,reqBody,spareToIssue,quantity-data[0].remaining_quantity,next);
                    })
            }
            else{
              dataToPush.quantity=quantity;
              dataToReturn.push(dataToPush);
              Inventory.findOneAndUpdateAsync({clientId: reqBody.clientId,"_id" : data[0]._id},{$inc:{"remaining_quantity" : -1*quantity}})
                .then(function(updated){
                      return next(dataToReturn);
                })
            }
        })
 };

 var allowedFilter = ["clientId","branchId","branchName",'jobId','vehicle_number','slip_number','taskId','spare_code'];

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
            if(i =='start_date' && query.end_date){
                var startDate = new Date(query[i]);
                var nextDay = new Date(query.end_date);
                fFilter["created_at"] = {
                    "$gte" :startDate,
                    "$lt":nextDay
                };
                delete query.start_date;
                delete query.end_date;
            }else if(i =='start_date'){
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
            }else if(i =='end_date' && !query.start_date){
                var endDate = new Date(query[i]);
                fFilter["created_at"] = {
                    "$lt" :endDate
                };
            }else if(i =='taskId'){
				fFilter['issued_spare.taskId'] = query[i];
			}else {
                fFilter[i] = query[i];
            }

        }
    }
    return fFilter;
};
module.exports.findSpareIssue = function(reqQuery, next) {
    var queryFilters = constructFilters(reqQuery);
    var no_of_pages = 1;
    SpareIssue.countAsync(queryFilters)
        .then(function(count){
            var cursor = SpareIssue.find(queryFilters);
            cursor.sort({"created_at":-1});
            var no_of_documents;
            if(reqQuery.all == "true"){
                no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : 1000;
                if(count/no_of_documents>1){
                    no_of_pages = count/no_of_documents;
                }
                cursor.limit(parseInt(no_of_documents));
            }else{
                no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : 1000;
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
