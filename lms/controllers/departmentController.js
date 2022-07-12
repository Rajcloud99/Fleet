/**
 * Created by manish on 29/8/16.
 */

var router = express.Router();
var DepartmentService = promise.promisifyAll(commonUtil.getService('department'));


router.post("/add",
    function(req,res,next) {
        if(otherUtil.validateClientAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }
        if (req.body.name === config.client_default_department
                && req.user.role!==config.super_admin_role_name) {
            return res.status(500).json({"status":"ERROR","error_message":"This department name is reserved for usage"});
        }else{
            DepartmentService.addDepartmentAsync(req.body)
                .then(function (department) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "Department data has been added successfully",
                        "data": department
                    });
                }).catch(next)
        }
    }
);

router.get("/get",function(req,res,next){
    DepartmentService.searchDepartmentByQueryAsync(req.query,false)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Departments found",
                "data":data.departments,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});

router.get("/get/trim",function(req,res,next){
    DepartmentService.searchDepartmentByQueryAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Departments found",
                "data":data.departments,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});

router.put("/update/:_id",function(req,res,next){
    if(otherUtil.validateClientAdmin(req,res)){
        return res.status(500).json({
            "status": "ERROR",
            "error_message": "Access Denied!!"
        });
    }
    if (otherUtil.isEmptyObject(req.body)){
        return res.status(500).json({"status":"ERROR","message":"No update body found"});
    }
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided for updating department"});
    }
    DepartmentService.updateDepartmentByIdAsync(req.params._id,req.body)
        .then(function(updated){
            return res.status(200).json({"status":"OK",
                "message":"Department data has been updated successfully",
                "data":updated});
        }).catch(next)
});

router.delete("/delete/:_id",function(req,res,next){
    if(otherUtil.validateClientAdmin(req,res)){
        return res.status(500).json({
            "status": "ERROR",
            "error_message": "Access Denied!!"
        });
    }
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for department"});
    }
    DepartmentService.deleteDepartmentByIdAsync(req.params._id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"Department has been deleted successfully",
                "data":deleted});
        }).catch(next)
});

module.exports = router;
