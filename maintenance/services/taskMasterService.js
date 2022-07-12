/**
 * Created by manish on 22/12/16.
 */
var winston = require('winston');
var TaskMaster = promise.promisifyAll(commonUtil.getMaintenanceModel('taskMaster'));
var Parts = promise.promisifyAll(commonUtil.getMaintenanceModel('parts'));
var Inventory = promise.promisifyAll(commonUtil.getMaintenanceModel('inventory'));
var NO_OF_DOCS = 15;

module.exports.addTask = function(reqBody,next) {
    var taskMaster = new TaskMaster(reqBody);
    taskMaster.saveAsync(reqBody)
        .then(function(taskMaster) {
            winston.info("added taskMaster", JSON.stringify(taskMaster));
            return next(null, taskMaster);
        })
        .catch(function(err) {
            winston.error("error in add taskMaster:" + err);
            return next(err);
        });
};

module.exports.getSpareSuggestion = function(reqQeury,next) {
    //var task={};
    //task.task_name=query.task_name;
    TaskMaster.findAsync({task_name:reqQeury.task_name})
        .then(function (taskMasterArr) {
          var task = taskMasterArr[0];
          var index=0;
          var findQuery={};
          var projection = {code:1,name:1,category_name:1};
          findQuery.$and=[{},{}];
          if(reqQeury.vehicle_models){
              findQuery.$and[index].vehicle_models=reqQeury.vehicle_models;
              index++;
          }
          findQuery.$and[index].$or=[];
            for (var i=0; i<task.part_categories.length; i++) {
                var category={};
                category.category_name=task.part_categories[i];
                findQuery.$and[index].$or.push(category);
            }
            Parts.findAsync(findQuery,projection)
                .then(function(partArr){
                    if (partArr.length>0) {
                        async.forEachOf(partArr, function (part, index, callback) {
                            Inventory.aggregateAsync([{$match: {"spare_code": part.code}}
                                , {$group: {_id: "$spare_code", "remaining": {$sum: "$remaining_quantity"}}}])
                                .then(function (data) {
                                    if (data.length > 0) {
                                        partArr[index]._doc.remaining_quantity = data[0].remaining;
                                    } else {
                                        partArr[index]._doc.remaining_quantity = 0;
                                    }
                                    callback();
                                })
                        }, function () {
                            return next(null, partArr);
                        })
                    }else{
                        return next(null,[]);
                    }
                })
                .catch(function (err) {
                    winston.error("error in find Part:" + err);
                    return next(err);
                });
        })
        .catch(function (err) {
            winston.error("error in find taskMaster:" + err);
            return next(err);
        });
};

module.exports.updateTaskById = function(id,reqBody,next) {
    TaskMaster.findByIdAndUpdateAsync(id,{$set:reqBody},{new:true})
        .then(function(taskMaster) {
            winston.info("updated taskMaster", JSON.stringify(taskMaster));
            return next(null, taskMaster);
        }).catch(function(err) {
        winston.error("error in update taskMaster" + err);
        return next(err);
    });
};

module.exports.findTaskById = function(id,next) {
    TaskMaster.findByIdAsync(id)
        .then(function (taskMaster) {
            winston.info("found taskMaster", JSON.stringify(taskMaster));
            return next(null, taskMaster);
        })
        .catch(function (err) {
            winston.error("error in find taskMaster:" + err);
            return next(err);
        });
};

module.exports.findTaskByQuery = function(query,next) {
    TaskMaster.findAsync(query)
        .then(function (taskMaster) {
            winston.info("found taskMaster", JSON.stringify(taskMaster));
            return next(null, taskMaster);
        })
        .catch(function (err) {
            winston.error("error in find taskMaster:" + err);
            return next(err);
        });
};

module.exports.deleteTaskById = function(id,next) {
    var remove = {};
    remove._id= id;
    TaskMaster.removeAsync(remove)
        .then(function(removed) {
            winston.info("removed taskMaster ",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in removing taskMaster:" + err);
            return next(err);
        });
};

/**************search taskMaster**********************/
var allowedSearchFieldsCategory = {"_id":1,"task_name":1,"clientId":1};


function createTaskMasterAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFieldsCategory)) {
            if (key === "task_name") {
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


module.exports.searchTask = function(reqQuery,next) {
    var aggrFilter  = createTaskMasterAggrFilter(reqQuery);
	var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;
    if(reqQuery.all == "true"){
        no_of_documents = reqQuery && reqQuery.no_of_docs ? parseInt(reqQuery.no_of_docs) : 1000;
    }else if (no_of_documents > NO_OF_DOCS) {
        no_of_documents = NO_OF_DOCS;
    }

    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (reqQuery.trim){
        var projection = {$project :{_id:1,name:1,code:1}};
        aggrFilter.push(projection);
    }
    var datacursor = TaskMaster.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = TaskMaster.aggregate(aggrFilter);

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }

    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }
        if (countArr.length>0){
            var taskMasterCount = countArr[0].count;
            var no_of_pages;
            if(taskMasterCount/no_of_documents>1){
                no_of_pages = Math.ceil(taskMasterCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }else{
                datacursor.limit(10000);
            }
            datacursor.exec(function (err, taskMasters) {
                var taskMaster0 = JSON.parse(JSON.stringify(taskMasters));
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.taskMasters = taskMaster0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = taskMasterCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.taskMasters = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
