/**
 * Created by Nipun on 30/12/16.
 */

var router = express.Router();
var prService = promise.promisifyAll(commonUtil.getMaintenanceService('pr'));
var pr = promise.promisifyAll(commonUtil.getMaintenanceModel('pr'));

router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        return next();
    },
    function(req,res,next) {
        req.body.clientId = req.user.clientId;
        req.body.created_by_name=req.user.full_name;
        req.body.created_by=req.user._id;
        req.body.branchName=req.body.branchName || "ICD Loni";
        req.body.branchId=req.body.branchId || "loni";
        prService.addprAsync(req.body)
        .then(function(added){
            if(added){
              return res.status(200).json({"status":"OK",
                "message":"pr has been added successfully",
                "data":added});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"Unable to add pr."});
            }
        }).catch(next)
    }
);



router.get("/get",function(req,res,next){
    /*if(req.query.aggregate && req.query.aggregate=="true"){
        delete req.query.aggregate;
        req.query.deleted=false;
        pr.aggregateAsync([{$match: req.query},{$group : {_id : "$spare_code", "Quantity":{$sum : "$quantity"},
            "spare_name":{$first:"$spare_name"},
            "spare_code":{$first:"$spare_code"} }}])
            .then(function(data){
                if(data && data[1]){
                    return res.status(200).json({"status":"OK",
                        "message":"pr found.",
                        "data":data});
                }else{
                    return res.status(200).json({"status":"OK",
                        "message":"No pr found.",
                        "data":[]});
                }
            }).catch(next)
    }
    else {*/
        prService.getprAsync(req.query)
            .then(function(data){
                if(data){
                    return res.status(200).json({"status":"OK",
                        "message":"pr found.",
                        "data":data.data,
                        "count":data.count,
                        "pages":data.no_of_pages});
                }else{
                    return res.status(200).json({"status":"OK",
                        "message":"No pr found.",
                        "data":[]});
                }
            }).catch(next)
    //}

});

router.put("/update/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating pr."});
        }
        prService.findprAsync({_id:req.params._id})
        .then(function(available){
            if (available && available[0]) {
                if(available[0].status=="New"){
                    return next();
                }else{
                    return res.status(500).json({"status":"ERROR","message":"PR status: "+available[0].status+". Only New status of PR can be update."});
                }
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This pr does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        req.body.last_modified_by_name=req.user.full_name;
        req.body.last_modified_by=req.user._id;
        req.body.branchName=req.body.branchName || "ICD Loni";
        req.body.branchId=req.body.branchId || "loni";
        prService.editprByIdAsync(req.params._id,req.body)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"PR data has been updated successfully",
                "data":updated});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to update PR data."});
            }
        }).catch(next)
    }
);

router.put("/approve/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating pr."});
        }
        prService.findprAsync({_id:req.params._id})
        .then(function(available){
            if (available && available[0]) {
                if(available[0].status=="New"){
                    if((available[0].approver) && (available[0].approver._id) && (available[0].approver._id.toString() == req.user._id.toString()) && (req.user.user_type && req.user.user_type.indexOf("PRapprover"))> -1){
                        return next();
                    }else{
                        return res.status(500).json({"status":"ERROR","message":"You do not have access to approve PR."});
                    }
                }else{
                    return res.status(500).json({"status":"ERROR","message":"PR status: "+available[0].status+". Only New status of PR can be update."});
                }
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This pr does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        var oUpdate = {
            "last_modified_by_name":req.user.full_name,
            "last_modified_by":req.user._id,
            "status":"Approved"
        }
        prService.editprByIdAsync(req.params._id,oUpdate)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"PR data has been approved successfully",
                "data":updated});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to approved PR."});
            }
        }).catch(next)
    }
);

router.put("/process/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating pr."});
        }
        prService.findprAsync({_id:req.params._id})
        .then(function(available){
            if (available && available[0]) {
                if(available[0].status=="Processed"){
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This pr is already processed.",
                    });
                }else{
                    return next();
                }
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This pr does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        var oUpdate = {
            "processed_by_name":req.body.processed_by_name || req.user.full_name,
            "processed_by":req.body.processed_by || req.user._id,
            "last_modified_by_name":req.user.full_name,
            "last_modified_by":req.user._id,
            "status":"Processed"
        }
        prService.editprByIdAsync(req.params._id,oUpdate)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"PR data has been process successfully",
                "data":updated});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to process PR."});
            }
        }).catch(next)
    }
);

router.delete("/delete/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the part."});
        }
        prService.findprAsync({_id:req.params._id})
        .then(function(available){
            if (available) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This pr does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        prService.editprByIdAsync(req.params._id,{deleted:true})
        .then(function(deleted){
            if(deleted){
                return res.status(200).json({"status":"OK",
                "message":"pr has been deleted successfully",
                "data":deleted});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to delete pr."});
            }
        }).catch(next)
    }
);

module.exports = router;
