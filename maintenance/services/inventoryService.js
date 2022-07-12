
/**
 * Created by pratik on 27/12/16.
 */
var Inventory = promise.promisifyAll(commonUtil.getMaintenanceModel('inventory'));
var Parts = promise.promisifyAll(commonUtil.getMaintenanceModel('parts'));
var async = require('async');
var NO_OF_DOCS =15;

module.exports.addInventory = function(dataBody,next) {
	if(dataBody.rate_inc_tax)dataBody.rate_inc_tax=Math.round(dataBody.rate_inc_tax * 100) / 100;
	if(dataBody.billing_amount)dataBody.billing_amount=Math.round(dataBody.billing_amount * 100) / 100;
	dataBody.remaining_quantity=dataBody.quantity;
    if(dataBody.bypassEntryID === true){
        var InventoryData = new Inventory(dataBody);
        InventoryData.saveAsync(dataBody)
            .then(function(savedData) {
                return next(null, savedData);
            })
            .catch(function(err) {
                return next(err);
            });
    }else{
        idUtil.generateInventoryEntryIdAsync({clientId:dataBody.clientId})
        .then(function(entryId){
            dataBody.entryId= entryId;
            var InventoryData = new Inventory(dataBody);
            InventoryData.saveAsync(dataBody)
                .then(function(savedData) {
                    return next(null, savedData);
                })
                .catch(function(err) {
                    return next(err);
                });
        }).catch(next);
    }
};

module.exports.findInventory = function(oQuery, next) {
    Inventory.findAsync(oQuery)
    .then(function (available) {
        return next(null, available);
    })
    .catch(function (err) {
        return next(err);
    });
};

module.exports.updateInventoryById = function(id,reqBody,next) {
    Inventory.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};

module.exports.getPrInventory=function(req,next){
  var data=[];
  Inventory.aggregateAsync([{$match: {clientId:req.user.clientId}},{ $group : { _id : "$spare_code", "remaining":{$sum : "$remaining_quantity"} }}])
    .then(function(countArr) {
      async.forEachOf(countArr,function (value, key, callback) {
        var x={};
        x.code=value._id;
        Parts.findAsync(x)
            .then(function (part) {
              var a=part[0].min_buffer;
              var b=value.remaining;
              if(a > b){
                   var result={};
                   result.spare_code=part[0].code;
                   result.spare_name=part[0].name;
                   result.category_name=part[0].category_name;
                   result.remaining=value.remaining;
                   result.min_buffer=part[0].min_buffer;
                   data.push(result);
                   }
              callback();
              })

      },function () {
             return next(null,data);
        })


})
    .catch(function (err) {
        return next(err);
    });

};

module.exports.deleteInventoryById = function(id,next) {
    var remove = {};
    remove._id= id;
    Inventory.deleteAsync(remove)
    .then(function(removed) {
        return next(null, removed);
    })
    .catch(function(err) {
        return next(err);
    });
};

module.exports.getQuantity=function(oQuery,next) {
    var filter={};
    filter.clientId=oQuery.clientId;
    if(oQuery.spare_code){
        filter.spare_code=oQuery.spare_code;
    }
    else{
        next("Please provide spare_code");
    }
    Inventory.aggregateAsync([{$match:filter},{$group: {_id: "$spare_code", "availableQty": {$sum: "$remaining_quantity"}}}])
        .then(function (data) {
            return next(null,data);
        })
};

var allowedSearchFieldsCategory = {"_id":1,"name":1,"code":1,"clientId":1,"spare_name":1,"vendor_name":1,"po_number":1,"invoice_number":1,"start_date":1,"end_date":1,
                                    "spare_code":1};


function createInventoryAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFieldsCategory)) {
            if(key =='start_date' && reqBody.end_date){
                var startDate = new Date(reqBody[key]);
                var nextDay = new Date(reqBody.end_date);
                obj ={};
                obj["created_at"] = {
                    "$gte" :startDate,
                    "$lt":nextDay
                };
                aggrFilter.push({$match: obj});
                delete reqBody.start_date;
                delete reqBody.end_date;
            }else if(key =='start_date'){
                var startDate = new Date(reqBody[key]);
                startDate.setSeconds(0);
                startDate.setHours(0);
                startDate.setMinutes(0);
                var nextDay = new Date();
                obj ={};
                obj["created_at"] = {
                    "$gte" :startDate,
                    "$lt":nextDay
                };
                aggrFilter.push({$match: obj});
            }else if(key =='end_date' && !reqBody.start_date){
                var endDate = new Date(reqBody[key]);
                obj ={};
                obj["created_at"] = {
                    "$lt" :endDate
                };
                aggrFilter.push({$match: obj});
            }else if (key === "name") {
                var obj ={};
                obj[key]= {$regex: reqBody[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key==="_id" ){
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


module.exports.searchInventory = function(reqQuery,next) {
    var aggrFilter  = createInventoryAggrFilter(reqQuery);

    var no_of_documents = parseInt(reqQuery.no_of_docs) || NO_OF_DOCS;

    if (no_of_documents > NO_OF_DOCS) {
        no_of_documents = NO_OF_DOCS;
    }

    if(reqQuery.all == "true"){
        no_of_documents=2000;
    }

    if(reqQuery.aggregate){
		aggrFilter.push({$match:{"remaining_quantity":{$gt:0}}});
		aggrFilter.push({$group:{_id: "$spare_code", "remaining_quantity":{$sum: "$remaining_quantity"},
            "spare_name":{$first:"$spare_name"},
            "rate_per_piece":{$last:"$rate_per_piece"},
            "rate_inc_tax":{$last:"$rate_inc_tax"},
            "category_name":{$first:"$category_name"},
            "category_code":{$first:"$category_code"},
            "uom":{$first:"$uom"}}});
        aggrFilter.push({$sort:{spare_code:1}});
    }

    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (reqQuery.trim){
        var projection = {$project :{_id:1,name:1,code:1}};
        aggrFilter.push(projection);
    }
    var datacursor = Inventory.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = Inventory.aggregate(aggrFilter);

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }

    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }

        if (countArr.length>0){
            var inventoryCount = countArr[0].count;
            var no_of_pages;
            if(inventoryCount/no_of_documents>1){
                no_of_pages = Math.ceil(inventoryCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }else{
                datacursor.limit(10000);
            }
            datacursor.exec(function (err, inventories) {
                var inventory0 = JSON.parse(JSON.stringify(inventories));
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.inventories = inventory0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = inventoryCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.inventories = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
