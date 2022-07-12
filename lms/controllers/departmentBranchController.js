/**
 * Created by manish on 6/1/17.
 */
var router = express.Router();
var DepartmentBranchService = promise.promisifyAll(commonUtil.getService('departmentBranch'));

router.post("/add",
    /**validations**/
    function(req,res,next){
        DepartmentBranchService.findDepartmentBranchByQueryAsync({clientId:req.user.clientId,
            branchId:req.body.branchId, depName:req.body.depName})
            .then(function(dataArr){
                if (dataArr && dataArr.length>0){
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": "Department already exists for this branch",
                    });
                }else{
                    return next();
                }
            })
    },
    function(req,res,next) {
        DepartmentBranchService.addDepartmentBranchAsync(req.body)
            .then(function (departmentBranch) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Department Branch data has been added successfully",
                    "data": departmentBranch
                });
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    DepartmentBranchService.searchDepartmentBranchByQueryAsync(req.query,false)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"DepartmentBranchs found",
                "data":data.departmentBranchs,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});

router.put("/update/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.body)){
        return res.status(500).json({"status":"ERROR","message":"No update body found"});
    }
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided for updating departmentBranch"});
    }
    DepartmentBranchService.updateDepartmentBranchByIdAsync(req.params._id,req.body)
        .then(function(updated){
            return res.status(200).json({"status":"OK",
                "message":"DepartmentBranch data has been updated successfully",
                "data":updated});
        }).catch(next)
});

router.delete("/delete/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for departmentBranch"});
    }
    DepartmentBranchService.deleteDepartmentBranchByIdAsync(req.params._id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"DepartmentBranch has been deleted successfully",
                "data":deleted});
        }).catch(next)
});

module.exports = router;
