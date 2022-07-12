/**
 * Created by Nipun on 27/12/16.
 */

var router = express.Router();
var TaskMasterService = promise.promisifyAll(commonUtil.getMaintenanceService('taskMaster'));

router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        return next();
    },
    function(req,res,next){
        TaskMasterService.findTaskByQueryAsync(
            {"clientId":req.user.clientId,"task_name": req.body.task_name})
            .then(function (task) {
                if (task && task[0]) {
                    return res.status(500).json({"status": "ERROR", "error_message": "Task with this name already exists"});
                } else {
                    return next();
                }
            }).catch(next);
    },
    function(req,res,next) {
        TaskMasterService.addTaskAsync(req.body)
            .then(function(added){
                if(added){
                  return res.status(200).json({"status":"OK",
                    "message":"Task has been added successfully",
                    "data":added});
                }else{
                    return res.status(500).json({"status":"ERROR",
                    "message":"Unable to add Task."});
                }
            }).catch(next)
    }
);

router.post("/getSpareSuggestion",function(req,res,next){
    TaskMasterService.getSpareSuggestionAsync(req.body)
        .then(function(data){
            if(data){
               return res.status(200).json({"status":"OK",
                "message":"Task found.",
                "data":data});
           }else{
                return res.status(200).json({"status":"OK",
                "message":"No Task found.",
                "data":[]});
           }
        }).catch(next)
});

router.get("/get",function(req,res,next){
    TaskMasterService.searchTaskAsync(req.query)
        .then(function(data){
            if(data){
               return res.status(200).json({"status":"OK",
                "message":"Task found.",
                "data":data.taskMasters,
                "pages":data.pages,
                "count":data.count});
           }else{
                return res.status(200).json({"status":"OK",
                "message":"No Task found.",
                "data":[]});
           }
        }).catch(next)
});

router.put("/update/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating Task."});
        }
        TaskMasterService.findTaskByQueryAsync({_id:req.params._id})
            .then(function(available){
                if (available) {
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This Task does not exists."
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        TaskMasterService.updateTaskByIdAsync(req.params._id,req.body)
            .then(function(updated){
                if(updated){
                    return res.status(200).json({"status":"OK",
                    "message":"Task data has been updated successfully",
                    "data":updated});
                }else{
                    return res.status(500).json({"status":"ERROR",
                    "message":"Unable to update task data."});
                }
            }).catch(next)
    }
);

router.delete("/delete/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the part."});
        }
        TaskMasterService.findTaskByQueryAsync({_id:req.params._id})
            .then(function(available){
                if (available) {
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This Task does not exists."
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        TaskMasterService.deleteTaskByIdAsync(req.params._id)
            .then(function(deleted){
                if(deleted){
                    return res.status(200).json({"status":"OK",
                    "message":"Task has been deleted successfully",
                    "data":deleted});
                }else{
                    return res.status(500).json({"status":"ERROR",
                    "message":"unable to delete Task."});
                }
            }).catch(next)
    }
);

module.exports = router;
