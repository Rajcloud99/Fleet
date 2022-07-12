/**
 * Created by manish on 30/12/16.
 */

var winston = require('winston');
var SpareUse = promise.promisifyAll(commonUtil.getMaintenanceModel('spareUse'));
var Inventory = promise.promisifyAll(commonUtil.getMaintenanceModel('inventory'));
var async=require("async");
var NO_OF_DOCS = 15;

module.exports.addSpareUse = function(reqBody,next) {
    var spareUse = new SpareUse(reqBody);
    spareUse.saveAsync(reqBody)
        .then(function(spareUse) {
            winston.info("added spareUse", JSON.stringify(spareUse));
            return next(null, spareUse);
        })
        .catch(function(err) {
            winston.error("error in add spareUse:" + err);
            return next(err);
        });
};

module.exports.updateSpareUseById = function(id,reqBody,next) {
    SpareUse.findByIdAndUpdateAsync(id,{$set:reqBody},{new:true})
        .then(function(spareUse) {
            winston.info("updated spareUse", JSON.stringify(spareUse));
            return next(null, spareUse);
        }).catch(function(err) {
        winston.error("error in update spareUse" + err);
        return next(err);
    });
};

module.exports.findSpareUseById = function(id,next) {
    SpareUse.findByIdAsync(id)
        .then(function (spareUse) {
            winston.info("found spareUse", JSON.stringify(spareUse));
            return next(null, spareUse);
        })
        .catch(function (err) {
            winston.error("error in find spareUse:" + err);
            return next(err);
        });
};

module.exports.findSpareUseByQuery = function(query,next) {
    SpareUse.findAsync(query)
        .then(function (spareUse) {
            winston.info("found spareUse", JSON.stringify(spareUse));
            return next(null, spareUse);
        })
        .catch(function (err) {
            winston.error("error in find spareUse:" + err);
            return next(err);
        });
};

module.exports.deleteSpareUseById = function(id,next) {
    var remove = {};
    remove._id= id;
    SpareUse.removeAsync(remove)
        .then(function(removed) {
            winston.info("removed spareUse ",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in removing spareUse:" + err);
            return next(err);
        });
};

/**************search spareUse**********************/
var allowedSearchFieldsCategory = {"_id":1,"clientId":1,"taskId":1};


function createSpareUseAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFieldsCategory)) {
            if (key === "supervisor_name") {
                var obj ={};
                obj[key]= {$regex: reqBody[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key==="_id"){
                obj ={};
                obj[key]= mongoose.Types.ObjectId(reqBody[key]);
                aggrFilter.push({$match: obj});
            }else {
                obj ={};
                obj[key]= reqBody[key];
                aggrFilter.push({$match: obj});
            }
        }
    }
    return aggrFilter;
}


module.exports.searchSpareUse = function(reqQuery,next) {
  if(reqQuery.jobId){
      SpareUse.findAsync({"jobId": reqQuery.jobId})
        .then(function(spareUse) {
            async.forEachOf(spareUse,function(spare, index, callback){
              Inventory.aggregateAsync([{$match: {"spare_code": spare.spare_code}}
                            , {$group: {_id: "$spare_code", "remaining": {$sum: "$remaining_quantity"}}}])
                            .then(function (data) {
                                if (data.length > 0) {
                                    spareUse[index]._doc.remaining_quantity = data[0].remaining;
                                } else {
                                    spareUse[index]._doc.remaining_quantity = 0;
                                }
                                callback();
                            })
            }, function () {
              winston.info("Found Estimated Spares", JSON.stringify(spareUse));
              return next(null, spareUse);
            })

          })
          .catch(function(err) {
            winston.error("error in finding estimated spares:" + err);
            return next(err);
          });
  }else{
     return next("Please provide the 'jobId'");
  }
};
