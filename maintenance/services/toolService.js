
/**
 * Created by pratik on 27/12/16.
 */
var Tool = promise.promisifyAll(commonUtil.getMaintenanceModel('tool'));
var Parts = promise.promisifyAll(commonUtil.getMaintenanceModel('parts'));
var async = require('async');
var NO_OF_DOCS =10000;

module.exports.addTool = function(dataBody,next) {
	if(dataBody.rate_inc_tax)dataBody.rate_inc_tax=Math.round(dataBody.rate_inc_tax * 100) / 100;
    var ToolData = new Tool(dataBody);
    ToolData.saveAsync()
        .then(function(savedData) {
            return next(null, savedData);
        })
        .catch(function(err) {
            return next(err);
        });
};

module.exports.findTool = function(oQuery, next) {
    Tool.findAsync(oQuery)
    .then(function (available) {
        return next(null, available);
    })
    .catch(function (err) {
        return next(err);
    });
};

module.exports.updateToolById = function(id,reqBody,next) {
    Tool.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};

module.exports.deleteToolById = function(data,next) {
    var filter = {};
    filter._id= data._id;
    var deleted ={};
    deleted.status=true;
    deleted.deleted_by_employee_name=data.name;
    deleted.deleted_by_employee_code=data.userId;
    deleted.reason=data.reason;
    Task.findByIdAndUpdateAsync(filter,{$set:{deleted:deleted}})
        .then(function(removed) {
            winston.info("removed task ",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in removing task:" + err);
            return next(err);
        });
};

var allowedSearchFieldsCategory = {"_id":1,"name":1,"category":1,"code":1,"branchId":1,"clientId":1,"spare_name":1,"vendor_name":1,"po_number":1,"invoice_number":1};


function createToolAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFieldsCategory)) {
            if (key === "name") {
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


module.exports.searchTool = function(reqQuery,next) {
    var aggrFilter  = createToolAggrFilter(reqQuery);

    var no_of_documents = parseInt(reqQuery.no_of_docs) || NO_OF_DOCS;

    if (no_of_documents > NO_OF_DOCS) {
        no_of_documents = NO_OF_DOCS;
    }

    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (reqQuery.trim){
        var projection = {$project :{_id:1,name:1,code:1}};
        aggrFilter.push(projection);
    }
    var datacursor = Tool.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = Tool.aggregate(aggrFilter);

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }
    datacursor.sort({'created_at' : -1});

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
				no_of_pages =1;
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
