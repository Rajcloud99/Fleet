/**
 * Created by manish on 29/12/16.
 */

var winston = require('winston');
var Task = promise.promisifyAll(commonUtil.getMaintenanceModel('task'));
var NO_OF_DOCS = 15;

module.exports.addTask = function(reqBody,next) {
    idUtil.generateTaskIdAsync({clientId:reqBody.clientId})
        .then(function(taskId){
            reqBody.taskId = taskId;
            var task = new Task(reqBody);
            task.saveAsync()
                .then(function(task) {
                    winston.info("added task", JSON.stringify(task));
                    return next(null, task);
                })
                .catch(function(err) {
                    winston.error("error in add task:" + err);
                    return next(err);
                });
        }).catch(next);
};

module.exports.updateTaskById = function(id,reqBody,next) {
    Task.findByIdAndUpdateAsync(id,{$set:reqBody},{new:true})
        .then(function(task) {
            winston.info("updated task", JSON.stringify(task));
            return next(null, task);
        }).catch(function(err) {
        winston.error("error in update task" + err);
        return next(err);
    });
};

module.exports.findTaskById = function(id,next) {
    Task.findByIdAsync(id)
        .then(function (task) {
            winston.info("found task", JSON.stringify(task));
            return next(null, task);
        })
        .catch(function (err) {
            winston.error("error in find task:" + err);
            return next(err);
        });
};

module.exports.findTaskByQuery = function(query,next) {
    Task.findAsync(query)
        .then(function (task) {
            winston.info("found task", JSON.stringify(task));
            return next(null, task);
        })
        .catch(function (err) {
            winston.error("error in find task:" + err);
            return next(err);
        });
};

module.exports.deleteTaskById = function(id,next) {
    var remove = {};
    remove._id= id;
    Task.removeAsync(remove)
        .then(function(removed) {
            winston.info("removed task ",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in removing task:" + err);
            return next(err);
        });
};

/**************search task**********************/
var allowedSearchFieldsCategory = {"_id":1,"jobId":1,"clientId":1};

function createTaskAggrFilter(reqBody){
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


module.exports.searchTask = function(reqQuery,next) {
    var aggrFilter  = createTaskAggrFilter(reqQuery);
    var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

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
    var datacursor = Task.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = Task.aggregate(aggrFilter);

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }

    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }
        if (countArr.length>0){
            var taskCount = countArr[0].count;
            var no_of_pages;
            if(taskCount/no_of_documents>1){
                no_of_pages = Math.ceil(taskCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }else{
                datacursor.limit(10000);
            }
            datacursor.exec(function (err, tasks) {
                var task0 = JSON.parse(JSON.stringify(tasks));
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.tasks = task0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = taskCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.tasks = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};
