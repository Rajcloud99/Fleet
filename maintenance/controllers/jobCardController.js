/**
 * Created by pratik on 27/12/16.
 */
var router = express.Router();
var jobCardService = promise.promisifyAll(commonUtil.getMaintenanceService('jobCard'));
var RegVehicleService = promise.promisifyAll(commonUtil.getService("registeredVehicle"));
var TaskService = promise.promisifyAll(commonUtil.getMaintenanceService('task'));
var Task = promise.promisifyAll(commonUtil.getMaintenanceModel('task'));
var TyreMaster = promise.promisifyAll(commonUtil.getMaintenanceModel('tyreMaster'));
var SpareUse = promise.promisifyAll(commonUtil.getMaintenanceModel('spareUse'));
var Inventory = promise.promisifyAll(commonUtil.getMaintenanceModel('inventory'));
var SpareIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('spareIssue'));
var SpareUseService = promise.promisifyAll(commonUtil.getMaintenanceService('spareUse'));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
var async = require('async');
var spareIssueService = promise.promisifyAll(commonUtil.getMaintenanceService('spareIssue'));
var oeService = promise.promisifyAll(commonUtil.getMaintenanceService('otherExpenses'));
var tyreIssueService = promise.promisifyAll(commonUtil.getMaintenanceService('tyreIssue'));
var TyreMasterService = promise.promisifyAll(commonUtil.getMaintenanceService('tyreMaster'));
var ContractorExpenseService = promise.promisifyAll(commonUtil.getMaintenanceService('contractor_expense'));
var tripService = promise.promisifyAll(commonUtil.getService('trip'));

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
router.post("/add",
    /** validate body **/
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No data found."});
        }
        return next();
    },
   //validate if vehicle exists and is not owned**!/
   function (req,res,next){
        RegVehicleService.findRegisteredVehicleQueryAsync
        ({"clientId":req.body.clientId,"vehicle_reg_no":req.body.vehicle_number})
           .then(function(regvehicles){
                if (regvehicles && regvehicles.length>0){
                    {
						if(regvehicles[0]["ownershipType"]==="Own"){
							req.regVehicle = regvehicles[0];
							return next();
						}else{
							return res.status(500).json({"status":"ERROR",
								"error_message":"Vehicle no. is not owned vehicle"});
						}
                    }

                }else{
                    return res.status(500).json({"status":"ERROR",
                        "error_message":"Vehicle no. does not exist"});
                }
           }).catch(next)
    },
    //VALIDATE IF JOB CARD WITH THE SAME vehicle_number EXISTS*/
    function (req,res,next){
        jobCardService.findJobCardAsync
        ({"clientId":req.body.clientId,"vehicle_number":req.body.vehicle_number,"status":{$ne:"Closed"}})
            .then(function(jobcard){
                if (jobcard && jobcard.length>0){
                    return res.status(500).json({"status":"ERROR",
                        "error_message":"Job card of this vehicle is already open"});
                }else{
                    return next();
                }
            }).catch(next)
    },
    /**Add job card **/
    function(req,res,next) {
        req.body.branchName=req.body.branchName || "ICD Loni";
        req.body.branchId=req.body.branchId || "loni";
        req.body.vehicle_models=req.regVehicle.model;
		req.body.vehicle=req.regVehicle._id;
		jobCardService.addJobCardAsync(req.body)
        .then(function(added){
            if(added){
                var toUpdate = {
                    "status":"Maintenance",
					"previousStatus":"Available",
                    "last_known.status" : "Maintenance",
					"last_known.datetime":Date.now()
                };
				RegVehicleService.updateRegisteredVehicleStatusByIdAsync(req.regVehicle._id,toUpdate)
                //RegVehicleService.updateRegisteredVehicleIdAsync(req.regVehicle._id,toUpdate)
                    .then(function(updated) {
                        return res.status(200).json({"status":"OK",
                            "message":"Job Card has been added successfully",
                            "data":added
                        });
                    })
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"Unable to add job card."});
            }
        }).catch(next)
    }
);



router.get("/get",function(req,res,next){
    //req.query.branchId=req.query.branchId||"loni";
    jobCardService.getJobCardAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"Job Card found.",
            "data":data.data,
            "pages":data.no_of_pages});
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No job card found.",
            "data":[]});
       }
    }).catch(next)
});

router.put("/update/:_id",
    /**Validations **/
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No data found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating job card."});
        }
        jobCardService.findJobCardAsync({_id:req.params._id})
        .then(function(available){
            if (available && available[0]) {
                req.jobCardData = JSON.parse(JSON.stringify(available[0]));
                if(req.jobCardData.status == "Closed"){
                    return res.status(500).json({"status":"ERROR","message":"Closed job card can not be update."});
                }else{
                    return next();
                }
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This job card does not exists."
                });
            }
        }).catch(next)
    },

    /**validate if vehicle exists and is owned**/
    function (req,res,next){
        if (req.jobCardData.vehicle_number) {
            RegVehicleService.findRegisteredVehicleQueryAsync
            ({"clientId": req.user.clientId, "vehicle_reg_no": req.jobCardData.vehicle_number})
                .then(function (regvehicles) {
                    if (regvehicles && regvehicles.length > 0) {
						req.regVehicle = regvehicles[0];
						/*if(req.body.status === "Closed" && req.regVehicle && req.regVehicle.last_known && req.regVehicle.last_known.trip_no){
							tripService.findTripQueryWithDeletedAsync
							({"clientId": req.user.clientId, "trip_no": req.regVehicle.last_known.trip_no})
								.then(function(tripData){
									if((tripData && tripData[0] && tripData[0].trip_end.status) || (tripData && tripData[0] && tripData[0].trip_cancel && tripData[0].trip_cancel.status)){
										req.body.current_veh_status = "Available";
										return next();
									}else{
										req.body.current_veh_status = "Booked";
										return next();
									}
								})
						}else{*/
						//todo: ise thiik karo
						return next();
						//}
                    } else {
                        return res.status(500).json({
                            "status": "ERROR",
                            "error_message": "Vehicle no. does not exist"
                        });
                    }
                }).catch(next)
        }else{
            return next();
        }
    },
    /**Set vehicle status basis current job card status**/
    function (req,res,next){
        if (req.body.status === "Maintenance") {
                var updateBody = {
                    "status":"Maintenance",
                    "last_modified_by_name":req.body.last_modified_by_name,
                    "last_modified_employee_code":req.body.last_modified_employee_code,
                    "last_modified_by":req.body.last_modified_by
                };
                RegVehicleService.updateRegisteredVehicleIdAsync(req.regVehicle._id,updateBody)
                    .then(function(updatedRegVehice){
                        if (updatedRegVehice){
                            return next();
                        }else{
                            return res.status(500).json({"status":"ERROR",
                                "error_message":"Some error occurred in job card add : error 1"});
                        }
                    }).catch(next)
        }
        else if (req.body.status === "Closed"){
            var updateBody = {
                "last_modified_by_name": req.body.last_modified_by_name,
                "last_modified_employee_code": req.body.last_modified_employee_code,
                "last_modified_by": req.body.last_modified_by
            };
            if(req.body.current_veh_status) {
				updateBody.status = req.body.current_veh_status;
				updateBody.previousStatus = "Maintenance";
				updateBody["last_known.status"] = req.body.current_veh_status;

				RegVehicleService.updateRegisteredVehicleStatusByIdAsync(req.regVehicle._id, updateBody)
					.then(function (updatedRegVehice) {
						if (updatedRegVehice) {
							return next();
						} else {
							return res.status(500).json({
								"status": "ERROR",
								"error_message": "Some error occurred in job card add : error 1"
							});
						}
					}).catch(next)
			}
        }else{
            return next();
        }
    },
    function(req,res,next) {
        if(req.body.vehicle_number){
            delete req.body.vehicle_number;
        }
        if(req.body.last_trip_number){
            delete req.body.last_trip_number;
        }
        if(req.body.vehicle_in_datetime){
            delete req.body.vehicle_in_datetime;
        }
        if(req.body.driver_name){
            delete req.body.driver_name;
        }
        ///add actual release date if job card is being closed
        if(req.body.status === "Closed"){
            req.body.actual_release_date=new Date();
        }
        ///make estimated release date editable
        /*if(req.body.estimated_release_date){
            delete req.body.estimated_release_date;
        }*/
        jobCardService.updateJobCardByIdAsync(req.params._id,req.body)
        .then(function(updated){
            if(updated){
                req.toSendThis = updated;
                if(req.body.status === "Closed"){
                    return next();
                }else{
                    return res.status(200).json({"status":"OK",
                        "message":"Job card data has been updated successfully",
                        "data":req.toSendThis
                    });
                }
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to update job card data."});
            }
        }).catch(next)
    },
    function(req,res,next) {
        if(req.body.status === "Closed"){
            spareIssueService.getSpareIssueAsync({"clientId":req.jobCardData.clientId,"jobId":req.jobCardData.jobId})
            .then(function(spareIssue){
                if(spareIssue && spareIssue.length>0){
                    var oExpense = generateIssueExpense(spareIssue);
                    oExpense.created_by_name=req.user.full_name;
                    oExpense.created_by_id=req.user.userId;
                    oeService.addOEAsync(oExpense)
                        .then(function(oe){
                            return res.status(200).json({"status":"OK",
                                "message":"Job card data has been updated successfully",
                                "data":req.toSendThis
                            });
                        }).catch(next)
                }
                else{
                    return next();
                }
            })
        }else{
            return res.status(200).json({"status":"OK",
                "message":"Job card data has been updated successfully",
                "data":updated
            });
        }
    },
    function(req,res,next) {
        if(req.body.status === "Closed"){
            tyreIssueService.getTyreIssueAsync({"clientId":req.jobCardData.clientId,"jobId":req.jobCardData.jobId, isReturned: false})
            .then(function(tyreIssue){
                if(tyreIssue && tyreIssue.length>0){
                    var aTyreNumber = [];
                    var aVehicleNumber = [];
                    for (var i = 0; i < tyreIssue.length; i++) {
                        if(tyreIssue[i].tyre_number){
                            aTyreNumber.push(tyreIssue[i].tyre_number);
                        }
                        if(tyreIssue[i].vehicle_no){
                            aVehicleNumber.push(tyreIssue[i].vehicle_no);
                        }
                    }
                    aTyreNumberUnique = aTyreNumber.filter(onlyUnique);
                    aVehicleNumberUnique = aVehicleNumber.filter(onlyUnique);
                    TyreMasterService.findTyreMasterByQueryWithProjectionsAsync({ "tyre_number": { "$in": aTyreNumberUnique } })
                        .then(function(masterData){
                            if(masterData && masterData.length>0){
                                var totalCost = 0;
                                for (var r = 0; r < masterData.length; r++) {
                                    totalCost = totalCost+ (masterData[r].current_price || 0);
                                }
                                var expense = {
                                    "clientId":tyreIssue[0].clientId,
                                    "type":"Tyre",
                                    "jobId":tyreIssue[0].jobId,
                                    "branchName": tyreIssue[0].branch,
                                    "vehicle_no": aVehicleNumberUnique.join(),
                                    "amount":totalCost,
                                    "bill_no": "NA",
                                    "bill_date":new Date(),
                                    "created_by_name":req.user.full_name,
                                    "created_by_id":req.user.userId
                                }
                               // bulkUpdateTyrePrice(masterData);
                                oeService.addOEAsync(expense)
                                    .then(function(oe){
                                        return res.status(200).json({"status":"OK",
                                            "message":"Job card data has been updated successfully",
                                            "data":req.toSendThis
                                        });
                                    }).catch(next)
                            }else{
                                return res.status(200).json({"status":"OK",
                                    "message":"Job card data has been updated successfully",
                                    "data":req.toSendThis
                                });
                            }
                        }).catch(next)
                }
                else{
                    return res.status(200).json({"status":"OK",
                        "message":"Job card data has been updated successfully",
                        "data":req.toSendThis
                    });
                }
            })
        }else{
            return res.status(200).json({"status":"OK",
                "message":"Job card data has been updated successfully",
                "data":req.toSendThis
            });
        }
    }
);

var bulkUpdateTyrePrice=function(masterData){
    var bulkUpdate = TyreMaster.collection.initializeOrderedBulkOp();

    for(var index=0; index<masterData.length; index++){
        var Data=JSON.parse(JSON.stringify(masterData[index]));
            var id=masterData[index]._id;
            delete Data._id;
            Data.current_price=0;
            bulkUpdate.find({_id:mongoose.Types.ObjectId(id)}).update({$set:Data});
    }
    bulkUpdate.execute(function(err, updatedDBResponse) {
        console.log(err);
        var response=JSON.parse(JSON.stringify(updatedDBResponse));
        return response;
    });
}

router.delete("/delete/:_id",
    /**validations **/
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the job card."});
        }
        jobCardService.findJobCardAsync({_id:req.params._id})
        .then(function(jobCardArr){
            if (jobCardArr && jobCardArr.length>0) {
                req.jobCard = jobCardArr[0];
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This job card does not exists.",
                });
            }
        }).catch(next)
    },
    /**find tasks associated with this job card **/
    function (req,res,next) {
        TaskService.findTaskByQueryAsync({clientId:req.jobCard.clientId,jobId:req.jobCard.jobId})
            .then(function(arrTasks){
                req.tasks = arrTasks;
                return next();
            }).catch(next)
    },
    /**remove all tasks for this job card and all spare use docs **/
    function(req,res,next){
        if (req.jobCard.job_type ==="Internal") {
            async.forEachOf(req.tasks, function (task, index, callbackOuter) {
                SpareUseService.findSpareUseByQueryAsync({"taskId": task.taskId, clientId: req.user.clientId})
                    .then(function (arrSpareUse) {
                        async.forEachOf(arrSpareUse, function (spareUseDoc, index, callbackInner) {
                            Inventory.updateAsync(
                                {entryId: spareUseDoc.inventoryEntryId},
                                {$inc: {remaining_quantity: spareUseDoc.quantity}})
                                .then(function (updatedInventory) {
                                    if (updatedInventory) {
                                        SpareUseService.deleteSpareUseByIdAsync(spareUseDoc._id)
                                            .then(function (deletedSpareUse) {
                                                if (deletedSpareUse) {
                                                    callbackInner();
                                                } else {
                                                    callbackInner("Error in spare use delete");
                                                }
                                            })
                                    } else {
                                        callbackInner("Error in task delete with inventory update: ERROR 2")
                                    }
                                }).catch(next)
                        }, function (err) {
                            if (err) {return next(err)}
                            else {callbackOuter();}
                        });
                    }).catch(next);
            }, function (err) {
                if (err) return next(err);
                Task.removeAsync({jobId: req.jobCard.jobId, clientId: req.user.clientId}).
                    catch(next);
                return next();
            })

        }else {
            async.forEachOf(req.tasks, function (task, index, callback) {
                SpareUse.removeAsync({taskId: task.taskId, clientId: req.user.clientId})
                    .catch(callback);
                callback();
            }, function (err) {
                if (err) return next(err);
                Task.removeAsync({jobId: req.jobCard.jobId, clientId: req.user.clientId}).
                    catch(next);
                return next();
            })
        }
    },
    function(req,res,next) {
        jobCardService.deleteJobCardByIdAsync(req.params._id)
        .then(function(deleted){
            if(deleted){
                return res.status(200).json({"status":"OK",
                "message":"Job Card has been deleted successfully",
                "data":deleted});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to delete job card."});
            }
        }).catch(next)
    }
);

router.get("/jcd/:jobId",function (req,res,next) {
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No jobId provided to generate JCD"});
    }
    req.jcd={};
    async.parallel({
        issuedSpare: function (callback) {
            SpareIssue.aggregateAsync([{$match:{clientId:req.body.clientId,jobId: req.params.jobId,flag:"issued"}},{$unwind :"$issued_spare"}])
                .then(function (issuedSpare) {
                    callback(null,issuedSpare);
                })
                .catch(function (err) {
                    callback(err);
                })
        },
        oExpense: function (callback) {
            oeService.findOEAsync({clientId:req.body.clientId,jobId: req.params.jobId, type: 'Other'})
                .then(function (otherExpense) {
                    callback(null,otherExpense);
                })
                .catch(function (err) {
                    callback(err);
                })
        },
        tasks: function (callback) {
            TaskService.findTaskByQueryAsync({clientId:req.body.clientId,jobId: req.params.jobId})
                .then(function (tasks) {
                    callback(null,tasks);
                })
                .catch(function (err) {
                    callback(err);
                })
        },
        cExpense: function (callback) {
            ContractorExpenseService.findContractorExpenseAsync({clientId:req.body.clientId,jobId: req.params.jobId,deleted:false})
                .then(function (cExpense) {
                    callback(null,cExpense);
                })
                .catch(function (err) {
                    callback(err);
                })
        }
    },function (err,result) {
        if(err) {
            return res.status(500).json({"status":"ERROR","message":err});
        }
        else {
            return res.status(200).json({"status":"OK","message":"Job Card Details Found.","data":result});
        }
    })

});

function generateIssueExpense(issueData){
    var aTyre = [];
    var aSpare = [];
    for (var i = 0; i < issueData.length; i++) {
        for (var j = 0; j < issueData[i].issued_spare.length; j++) {
            aSpare.push(issueData[i].issued_spare[j]);
        }
    }

    function calculateCost(aData,type){
        var totalCost = 0;
        for (var r = 0; r < aData.length; r++) {
            totalCost = totalCost+(((aData[r].quantity||0)-(aData[r].total_returned||0))*(aData[r].cost_per_piece||0));
        }
        var expense = {
            "clientId":issueData[0].clientId,
            "type":"Spare",
            "jobId":issueData[0].jobId,
            "branchName": issueData[0].branchName,
            "branchId": issueData[0].branchId,
            "vehicle_no": issueData[0].vehicle_number,
            "amount":totalCost,
            "bill_no": "NA",
            "bill_date":new Date()
        }
        return expense;
    }

    return calculateCost(aSpare)
}

module.exports = router;
