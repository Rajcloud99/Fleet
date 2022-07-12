/**
 * Created by manish on 29/12/16.
 */

var router = express.Router();
var TaskService = promise.promisifyAll(commonUtil.getMaintenanceService('task'));
var Inventory = promise.promisifyAll(commonUtil.getMaintenanceModel('inventory'));
var SpareUseService = promise.promisifyAll(commonUtil.getMaintenanceService('spareUse'));
var SpareUse = promise.promisifyAll(commonUtil.getMaintenanceModel('spareUse'));
var JobCard = promise.promisifyAll(commonUtil.getMaintenanceModel('jobCard'));
var Task = promise.promisifyAll(commonUtil.getMaintenanceModel('task'));
var contractorExpenseService = promise.promisifyAll(commonUtil.getMaintenanceService('contractor_expense'));
var async = require('async');

var estimatedCost=0;

router.post("/add",
    /**validations **/
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        /*if(!req.body.contractor_expense || req.body.contractor_expense.length<1){
            return res.status(500).json({"status": "ERROR", "message": "'contractor_expense'[] not found"});
        }*/
        return next();
    },
    /**fetch job card **/
    function(req,res,next){
        JobCard.findOneAsync({clientId:req.user.clientId,jobId:req.body.jobId})
            .then(function(jobCard){
                if (jobCard){
                    req.jobCard = jobCard;
                    return next();
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to find job card : ERROR 2"});
                }
            }).catch(next)
    },

    function(req,res,next){
        var query={};
        query.clientId=req.user.clientId;
        query.jobId=req.body.jobId;
        query.task_name=req.body.task_name;
        Task.findAsync(query)
            .then(function (countTask) {
                if(countTask.length>0){
                    return res.status(500).json({"status":"ERROR",
                        "message":"The task "+req.body.task_name+" already exists in this Job Card"});
                }
                else{
                    return next();
                }
            })
    },
    /**Add task **/
    function(req,res,next) {
        TaskService.addTaskAsync(req.body)
            .then(function(addedTask){
                if(addedTask){
                    req.addedTask = addedTask;
                    return next();
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to add Task."});
                }
            }).catch(next)
    },
    function(req,res,next) {
        if(!req.body.contractor_expense || req.body.contractor_expense.length<1){
            return next();
        }
        req.body.contractor_expense.forEach(function (obj,index,array) {
            obj.clientId=req.user.clientId;
            obj.vehicle_number=req.body.vehicle_number;
            obj.jobId=req.body.jobId;
            obj.taskId=req.addedTask.taskId;
            obj.task_name=req.body.task_name;
            obj.supervisor_employee_id=req.body.supervisor_employee_id;
            obj.supervisor_name=req.body.supervisor_name;
        });
        contractorExpenseService.updateContractorExpenseAsync(req.body.contractor_expense)
            .then(function (response) {
                req.expense_response=response;
                return next();
            })
            .catch(next)

    },
    /**Aggregate inventory and validate amount of requested spares is within limits
     * Only for internal job cards**/
    function(req,res,next){
        if (req.jobCard.job_type ==="Internal") {
            var matchAggr = {$match: {spare_code: {$in: []}}};
            for (var i = 0; i < req.body.spares_needed.length; i++) {
                matchAggr.$match.spare_code.$in.push(req.body.spares_needed[i].spare_code);
            }
            Inventory.aggregateAsync([matchAggr, {
                $group: {
                    _id: "$spare_code",
                    "remaining": {$sum: "$remaining_quantity"}
                }
            }])
                .then(function (countArr) {
                    if (countArr.length > 0) {
                        var proceedFurther = true;
                        for (var i in countArr) {
                            if (countArr[i].remaining < req.body.spares_needed[i].quantity) {
                                proceedFurther = false;
                                break;
                            }
                        }
                        if (proceedFurther) {
                            return next();
                        } else {
                            return res.status(200).json({
                                "status": "ERROR", "message": "Task added successfully but Inventory doesnt have the " +
                                "needed quantity of spares : ERROR 3"
                            })
                        }
                    } else {
                        return res.status(200).json({
                            "status": "ERROR",
                            "message": "Task added successfully but Inventory doesnt have the needed spares."
                        })
                    }
                }).catch(next)
        }else{
            return next();
        }
    },
    /**find needed inventory docs
     * and modify them satisfy each spare quantity requirement. Also make an entry in spare use
     **/

    function(req,res,next){
        var spareDataToReturn =  [];
        if (req.jobCard.job_type ==="Internal") {
            async.forEachOf(req.body.spares_needed, function (objSpare, indexOuter, callbackOuter) {
                var quantityNeeded = objSpare.quantity;
                var cursor = Inventory.find({
                    clientId: req.user.clientId,
                    spare_code: objSpare.spare_code, homId: req.body.homId
                }).sort({$natural: 1}).limit(1);
                cursor.exec(function (err, inventoryDocs) {
                    if (err) return next(err);
                    if (inventoryDocs.length > 0) {
                      var dataToFeed={};
                      dataToFeed.clientId=req.body.clientId;
                      dataToFeed.task_name = req.body.task_name;
                      dataToFeed.taskId=req.body.taskId;
                      dataToFeed.spare_code=objSpare.spare_code;
                      dataToFeed.spare_name=inventoryDocs[0].spare_name;
                      dataToFeed.quantity=objSpare.quantity;
                      dataToFeed.cost_per_piece=inventoryDocs[0].rate_per_piece;
                      dataToFeed.jobId=req.body.jobId;
                      estimatedCost+=dataToFeed.cost_per_piece*dataToFeed.quantity;

                      SpareUseService.addSpareUseAsync(dataToFeed)
                          .then(function(addedSpareUse){
                                  if (addedSpareUse) {
                                      spareDataToReturn.push(addedSpareUse);
                                      callbackOuter();
                                  }
                           })

                    } else {
                        callbackOuter("No inventory found");
                    }
                }).catch(callbackOuter)
            }, function (err) {
                if (err) {return next(err)}
                else {
                      req.spares_allotted = spareDataToReturn;
                    return next();
                }
            });
        }
        else {
            async.forEachOf(req.body.spares_needed, function (objSpare, index, callback) {
                var spareUseAddbody = {};
                spareUseAddbody.clientId = req.user.clientId;
                spareUseAddbody.task_name = req.addedTask.task_name;
                spareUseAddbody.taskId = req.addedTask.taskId;
                spareUseAddbody.jobId = req.jobCard.jobId;
                spareUseAddbody.spare_code = objSpare.spare_code;
                spareUseAddbody.spare_name = objSpare.spare_name;
                spareUseAddbody.inventoryEntryId = "External";
                spareUseAddbody.cost_per_piece = objSpare.cost_per_piece;
                spareUseAddbody.quantity = objSpare.quantity;
                spareUseAddbody.issued = "Yes";
                SpareUseService.addSpareUseAsync(spareUseAddbody)
                    .then(function (addedSpareUse) {
                        if (addedSpareUse) {
                            spareDataToReturn[index] = addedSpareUse;
                            callback();
                        } else {
                            callback("Error in spare use add: ERROR 2");
                        }
                    }).catch(next)
            }, function (err) {
                if (err) {return next(err)}
                else {
                    req.spares_allotted = spareDataToReturn;
                    return next();
                }
            });
        }
    },
    /**update job card estimate **/
    function(req,res,next){
        var estimated_cost = 0;
        // if (req.jobCard.job_type ==="Internal") {
        //     for (var i in req.spares_allotted) {
        //         for (var j in req.spares_allotted[i]) {
        //             estimated_cost += (req.spares_allotted[i][j].quantity * req.spares_allotted[i][j].cost_per_piece);
        //         }
        //     }
        // }
        JobCard.updateAsync({clientId:req.user.clientId,jobId:req.body.jobId},
            {$inc:{estimated_cost:estimatedCost}})
            .then(function (updatedJobCard) {
                if (updatedJobCard){
                    return res.status(200).json({"status":"OK",
                        "message":"Task and spare added successfully",
                        "data":{task:req.addedTask,spares_allotted:req.spares_allotted,expense_response:req.expense_response}});
                }else{
                    return res.status(200).json({"status":"OK",
                        "message":"Some error in task add : ERROR 5"});
                }
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    TaskService.searchTaskAsync(req.query)
        .then(function(taskDocs){
            async.forEachOf(taskDocs.tasks,function(taskDoc,index,callback){
                var cursor = SpareUse.find({taskId:taskDoc.taskId,clientId:req.user.clientId}).sort({$natural:1});
                cursor.exec(function(err,spareUseDocs){
                    if (err) {callback(err);}
                    taskDocs.tasks[index].spares_allotted = spareUseDocs;
                    callback();
                }).catch(callback)
            },function(err) {
                if(err) {callback(err)}
                else {
                    return res.status(200).json({"status":"OK",
                        "message":"Task found.",
                        "data":taskDocs.tasks,
                        "pages":taskDocs.no_of_pages});
                }
            });
        }).catch(next)
});

router.put("/update/:_id",
    /**validations **/
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating Task."});
        }
        TaskService.findTaskByQueryAsync({_id:req.params._id})
            .then(function(taskArr){
                if (taskArr && taskArr.length>0) {
                    req.task = taskArr[0];
                    if(req.task.status=="Closed"){
                        return res.status(200).json({
                            "status": "ERROR",
                            "message": "This task is closed."
                        });
                    }
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This task does not exists."
                    });
                }
            }).catch(next)
    },
    /**fetch job card **/
    function(req,res,next){
        JobCard.findOneAsync({clientId:req.user.clientId,jobId:req.task.jobId})
            .then(function(jobCard){
                if (jobCard){
                    req.jobCard = jobCard;
                    return next();
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to find job card : ERROR 2"});
                }
            }).catch(next)
    },
    /**validate requested new spare use quantity is within inventoryDoc limits **/
    /*function(req,res,next){
        if (req.body.spare_allotted_update) {
            if (req.jobCard.job_type ==="Internal") {
                async.forEachOf(req.body.spares_allotted, function (objSpare, indexOuter, callbackOuter) {
                    Inventory.findOneAsync({
                        clientId: req.user.clientId, homId: req.body.homId,
                        entryId: objSpare.inventoryEntryId
                    })
                        .then(function (inventoryDoc) {
                            if (inventoryDoc) {
                                req[objSpare.inventoryEntryId] = inventoryDoc;
                                return SpareUseService.findSpareUseByIdAsync(objSpare._id)
                            } else {
                                callbackOuter("Inventory doc not found for update");
                            }
                        })
                        .then(function (spareUseDoc) {
                            req[objSpare._id] = spareUseDoc;
                            var newInventoryCount =
                                req[objSpare.inventoryEntryId].remaining_quantity - (objSpare.quantity - spareUseDoc.quantity);
                            req[objSpare.inventoryEntryId].newInventoryCount = newInventoryCount;
                            if (newInventoryCount >= 0) {
                                callbackOuter();
                            } else {
                                callbackOuter("Inventory id " + req[objSpare.inventoryEntryId].entryId + " does not have the needed spares." +
                                    " Please try to manually issue new spare");
                            }
                        })
                }, function (err) {
                    if (err) {return next(err)}
                    else {return next();}
                });
            }else{
                return next();
            }
        }else{
            return next();
        }
    },
    /!**update spareUse docs if spare_allotted_update key is supplied **!/
    function(req,res,next){
        var updatedSpareAllotment =[];
        if (req.body.spare_allotted_update){
            if (req.jobCard.job_type === "Internal"){
                async.forEachOf(req.body.spares_allotted, function (objSpare, indexOuter, callbackOuter) {
                    SpareUseService.updateSpareUseByIdAsync(objSpare._id,
                        {quantity: objSpare.quantity})
                        .then(function (updated) {
                            if (updated) {
                                updatedSpareAllotment[indexOuter] = updated;
                                Inventory.findByIdAndUpdateAsync(req[objSpare.inventoryEntryId]._id,
                                    {$set: {remaining_quantity: req[objSpare.inventoryEntryId].newInventoryCount}})
                                    .then(function (updated) {
                                        if (updated) {
                                            callbackOuter();
                                        } else {
                                            callbackOuter("Not able to update inventory doc");
                                        }
                                    }).catch(callbackOuter)
                            } else {
                                callbackOuter("Not able to update spare use doc");
                            }
                        })
                        .catch(callbackOuter)
                }, function (err) {
                    if (err) {
                        return next(err)
                    }
                    else {
                        req.updatedSpareAllotment = updatedSpareAllotment;
                        return next();
                    }
                });
            }else{
                async.forEachOf(req.body.spares_allotted, function (objSpare, indexOuter, callbackOuter) {
                    SpareUseService.updateSpareUseByIdAsync(objSpare._id,
                        {quantity: objSpare.quantity})
                        .then(function (updated) {
                            if (updated) {
                                updatedSpareAllotment[indexOuter] = updated;
                                callbackOuter();
                            } else {
                                callbackOuter("Not able to update spare use doc");
                            }
                        })
                        .catch(callbackOuter)
                }, function (err) {
                    if (err) {return next(err)}
                    else {
                        req.updatedSpareAllotment = updatedSpareAllotment;
                        return next();
                    }
                });
            }
        }else{
            return next();
        }
    },*/
    /**Update if task_update key is allotted**/

    /**update contractor expense*/
    function(req,res,next) {
        if(!req.body.contractor_expense || req.body.contractor_expense.length<1){
            return next();
        }
        req.body.contractor_expense.forEach(function (obj,index,array) {
            obj.clientId=req.user.clientId;
            obj.vehicle_number=req.body.vehicle_number;
            obj.jobId=req.body.jobId;
            obj.taskId=req.body.taskId;
            obj.task_name=req.body.task_name;
            obj.supervisor_employee_id=req.body.supervisor_employee_id;
            obj.supervisor_name=req.body.supervisor_name;
        });
        contractorExpenseService.updateContractorExpenseAsync(req.body.contractor_expense)
            .then(function (response) {
                req.expense_response=response;
                return next();
            })
            .catch(next)

    },
    function(req,res,next) {

        if (req.body.start_datetime) {
            req.body.start_datetime=new Date();
        }
        if (req.body.status=="Closed" || req.body.close_datetime) {
            req.body.close_datetime=new Date();
        }

            TaskService.updateTaskByIdAsync(req.params._id, req.body)
                .then(function (updated) {
                    if (updated) {
                        return res.status(200).json({
                            "status": "OK",
                            "message": "Task data has been updated successfully",
                            "data": {
                                task:updated,
                                updated_expense:req.expense_response
                                //task_update:req.body.task_update,
                                //spares_alloted:req.updatedSpareAllotment,
                                //spare_allotted_update:req.body.spare_allotted_update
                            }
                        });
                    } else {
                        return res.status(500).json({
                            "status": "ERROR",
                            "message": "Unable to update task data."
                        });
                    }
                }).catch(next)
        /*}else{
            return res.status(200).json({
                "status": "OK",
                "message": "Task and spare data has been updated successfully",
                "data": {
                    spares_alloted:req.updatedSpareAllotment,
                    spare_allotted_update:req.body.spare_allotted_update
                }
            });
        }*/
    }
);

router.delete("/delete/:_id",
    /**validations **/
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the part."});
        }
        TaskService.findTaskByQueryAsync({_id:req.params._id})
            .then(function(taskArr){
                if (taskArr && taskArr.length>0) {
                    req.task = taskArr[0];
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This task does not exists."
                    });
                }
            }).catch(next)
    },
    /**fetch job card **/
    function(req,res,next){
        JobCard.findOneAsync({clientId:req.user.clientId,jobId:req.task.jobId})
            .then(function(jobCard){
                if (jobCard){
                    req.jobCard = jobCard;
                    return next();
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to find job card : ERROR 2"});
                }
            }).catch(next)
    },
    /**Remove spareUsed docs entered for this task. Adjust inventory count only for internal jobs**/
    function(req,res,next) {
        if (req.jobCard.job_type ==="Internal") {
            SpareUseService.findSpareUseByQueryAsync({"taskId": req.task.taskId, clientId: req.user.clientId})
                .then(function (arrSpareUse) {
                    req.spares_allotted = arrSpareUse;
                    async.forEachOf(arrSpareUse, function (spareUseDoc, index, callback) {
                        Inventory.updateAsync({entryId: spareUseDoc.inventoryEntryId}, {$inc: {remaining_quantity: spareUseDoc.quantity}})
                            .then(function (updatedInventory) {
                                if (updatedInventory) {
                                    SpareUseService.deleteSpareUseByIdAsync(spareUseDoc._id)
                                        .then(function (deletedSpareUse) {
                                            if (deletedSpareUse) {
                                                callback();
                                            } else {
                                                callback("Error in spare use delete");
                                            }
                                        })
                                } else {
                                    callback("Error in task delete with inventory update: ERROR 2")
                                }
                            }).catch(next)
                    }, function (err) {
                        if (err) {
                            return next(err)
                        }
                        else {
                            return next();
                        }
                    });
                }).catch(next)
        }else{
            SpareUseService.findSpareUseByQueryAsync({"taskId": req.task.taskId, clientId: req.user.clientId})
                .then(function (arrSpareUse) {
                    req.spares_allotted = arrSpareUse;
                    async.forEachOf(arrSpareUse, function (spareUseDoc, index, callback) {
                        SpareUseService.deleteSpareUseByIdAsync(spareUseDoc._id)
                            .then(function (deletedSpareUse) {
                                if (deletedSpareUse) {
                                    callback();
                                } else {
                                    callback("Error in spare use delete");
                                }
                            })
                    }, function (err) {
                        if (err) {
                            return next(err)
                        }
                        else {
                            return next();
                        }
                    });
                }).catch(next)
        }
    },
    /**Delete task **/
    function(req,res,next) {
        TaskService.deleteTaskByIdAsync(req.params._id)
            .then(function(deleted){
                if(deleted){
                    return next();
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to delete Task. ERROR 3"});
                }
            }).catch(next)
    },
    /**update job card estimate **/
    function(req,res,next){
        return res.status(200).json({"status":"OK",
            "message":"Task has been deleted successfully"});
        /* var estimated_cost = 0;
        if (req.jobCard.job_type ==="Internal") {
            for (var i in req.spares_allotted) {
                estimated_cost += (req.spares_allotted[i].quantity * req.spares_allotted[i].cost_per_piece);
            }
        }
        JobCard.updateAsync({clientId:req.user.clientId,jobId:req.task.jobId},
            {$inc:{estimated_cost:(-estimated_cost)}})
            .then(function (updatedJobCard) {
                if (updatedJobCard){
                    return res.status(200).json({"status":"OK",
                        "message":"Task has been deleted successfully"});
                }else{
                    return res.status(500).json({"status":"OK",
                        "message":"Some error in task delete : ERROR 4"});
                }
            }).catch(next)
            */
    }
);

module.exports = router;
