/**
 * Created by Nipun on 17/1/16.
 */

var router = express.Router();
var spareIssueService = promise.promisifyAll(commonUtil.getMaintenanceService('spareIssue'));
var inventoryService = promise.promisifyAll(commonUtil.getMaintenanceService('inventory'));
var TaskService = promise.promisifyAll(commonUtil.getMaintenanceService('task'));
var async=require("async");

router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        return next();
    },
    ///issue spare on open tasks only

    function(req,res,next){
		if (req.body.flag=="issued"){
			async.forEachOf(req.body.spare_list,function(spareToIssue,index,callback){
				if(req.body.issue_type=="Branch" || req.body.issue_type=="Other"){
					if(!req.body.jobId){
						req.body.spare_list[index].taskId=req.body.spare_list[index].taskId || "NA";
						req.body.spare_list[index].task_name=req.body.spare_list[index].task_name || "NA";
					}else {
						if(!req.body.spare_list[index].taskId || !req.body.spare_list[index].task_name){
							return res.status(500).json({"status":"ERROR","message":"Please provide task for each spare"});
						}
					}
				}else {
					if(!req.body.jobId){
						return res.status(500).json({"status":"ERROR","message":"Please provide jobId"});
					}
					if(!req.body.spare_list[index].taskId || !req.body.spare_list[index].task_name){
						return res.status(500).json({"status":"ERROR","message":"Please provide task for each spare"});
					}
				}
				callback();
				/*
				 TaskService.findTaskByQueryAsync({taskId:spareToIssue.taskId})
				 .then(function (taskInfo) {
				 if(taskInfo && taskInfo[0]){
				 if(taskInfo[0].status=="Closed"){
				 callback("Task you have selected is already closed");
				 }
				 else {
				 callback(null);
				 }
				 }
				 else {
				 callback("Task you have selected is not found");
				 }
				 })}*/
			},function (err, proceed) {
				if(err){
					return res.status(500).json({"status":"ERROR",
						"message":err});
				}
				else {
					return next();
				}
			})
		}
		else {
			return next();
		}

    },
    //validate required fields
    function(req,res,next) {
        if (req.body.flag=="issued" && !req.body.issuer){
            return res.status(500).json({"status":"ERROR","message":"Please provide issuer"});
        }
        if (!req.body.mechanic_name){
            return res.status(500).json({"status":"ERROR","message":"Please provide employee"});
        }
        if(req.body.spare_list.length<1) return res.status(500).json({"status":"ERROR",
            "message":"Please select spares"});
        req.body.branchName=req.body.branchName;
        req.body.branchId=req.body.branchId;
        req.body.created_by_employee_code=req.user.userId;
        req.body.mechanic_employee_code=req.body.mechanic_employee_code || 'NA';
        return next();
    },
    function(req,res,next) {
        req.unAvailable=[];
            async.forEachOf(req.body.spare_list,function(spareToIssue,index,callback){
                var query={};
                query.clientId=req.user.clientId;
                query.branchId=req.body.branchId;
                query.spare_code=spareToIssue.spare_code;
                if(spareToIssue.flag=="issued"){
                    inventoryService.getQuantityAsync(query)
                        .then(function (data) {
                            if(data && data[0] && data[0].availableQty>=spareToIssue.issue_quantity){

                            }
                            else{
                                req.body.spare_list[index].remaining_quantity=data[0].availableQty;
                                req.unAvailable.push(spareToIssue);
                                req.body.spare_list.splice(index, 1);
                            }
                            callback(null,index);
                        })
                        .catch(function (err) {
                            callback(err);
                        })
                }
                else{
                    callback();
                }
            },function (err,data) {
                console.log(data);
                if(err) return res.status(500).json({"status":"ERROR",
                    "message":err});
                else {
                    if(req.body.spare_list.length<1) return res.status(500).json({"status":"ERROR",
                        "message":"None of selected spares are available. Please check the inventory!"});

                    spareIssueService.addSpareIssueAsync(req.body)
                        .then(function(added){
                            if(added){
                                return res.status(200).json({"status":"OK",
                                    "message":req.body.flag+" Spare successfully",
                                    "data":added,
                                    "unAvailable":req.unAvailable});
                            }else{
                                return res.status(500).json({"status":"ERROR",
                                    "message":"Unable to Issue Spare"});
                            }
                        }).catch(function (err) {
                            console.log(err);
                            logger.error("error in Issuing Spare:" + err);
						return res.status(500).json({"status":"ERROR",
							"message":"Unable to "+req.body.flag+" Spare"});
                    })
                }

            });
        }

);

router.get("/get",
  function(req,res,next){
    spareIssueService.findSpareIssueAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"Data found.",
            "data":data.data,
            "pages":data.no_of_pages});
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No data found.",
            "data":[]});
       }
    }).catch(next)
});

router.post("/issue",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        return next();
    },
    function(req,res,next) {
        spareIssueService.issueSpareAsync(req.body)
        .then(function(added){
            if(added){
              return res.status(200).json({"status":"OK",
                "message":"SpareIssued successfully",
                "data":added});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"Unable to Issue Spare"});
            }
        }).catch(next)
    }
);

module.exports = router;
