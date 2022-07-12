/**
 * Created by manish on 22/12/16.
 */

var router = require('express').Router();
var path = require('path');
var MechanicService = promise.promisifyAll(commonUtil.getMaintenanceService("mechanic"));
var UserService = promise.promisifyAll(commonUtil.getService("user"));

/***********add new mechanic *******/
router.post("/add",
    function(req,res,next){
        /**validate required fields **/
        if (!req.body.full_name){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Mechanic name is required"
            });
        }
        if (!req.body.employee_code){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Mechanic employee code is required"
            });
        }
        MechanicService.findMechanicByQueryAsync({$or:[{full_name:req.body.full_name},
            {employee_code:req.body.employee_code}]})
            .then(function (mechanic) {
                if (mechanic && mechanic.length>0) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": "Mechanic name/employee_code already exists",
                        "data": mechanic
                    });
                }else{
                    return next();
                }
            }).catch(next);
    },
    function(req,res,next){
        req.body.userId = req.body.employee_code;
        req.body.password = "password";
        UserService.addUserAsync(req.body)
            .then(function (user) {
                if (user) {
                    return next();
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": "Some error occurred in mechanic add"
                    });
                }
            }).catch(next);

    },function(req,res,next){
        MechanicService.addMechanicAsync(req.body)
            .then(function (mechanic) {
                if (mechanic) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "Mechanic added successfully",
                        "data":mechanic
                    });
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": "Some error occurred in mechanic add"
                    });
                }
            }).catch(next);
    }
);

/***********get + search*******/
router.get("/get",function(req,res,next){
    MechanicService.searchMechanicAsync(req.query)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Mechanics found",
                "data":data.mechanics,
                "pages":data.pages,
                "count":data.count});
        }).catch(next);
});

/***********update mechanic*******/
router.put("/update/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({"status": "ERROR", "error_message": "No id supplied for update operation"});
        }
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({"status": "ERROR", "error_message": "No update body found"});
        }
        MechanicService.findMechanicByQueryAsync({$and:[{full_name:req.body.full_name}
            ,{_id:{$ne:mongoose.Types.ObjectId(req.params._id)}}]})
            .then(function (mechanics) {
                if (mechanics && mechanics.length==1) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Mechanic name already exists"
                    });
                }else{
                    return next();
                }
            }).catch(next);
    },
    function(req,res,next){
        UserService.updateUserByQueryAsync({userId:req.body.employee_code},req.body)
            .then(function (user) {
                if (user) {
                    return next();
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": "Some error occurred in mechanic update"
                    });
                }
            })
            .catch(next)
    },
    function (req,res,next){
        MechanicService.updateMechanicByIdAsync(req.params._id,req.body)
            .then(function (mechanic) {
                return res.status(200).json({"status":"OK",
                    "message":"Mechanic updated successfully",
                    "data":mechanic});
            })
            .catch(next)
    }
);

/***********delete mechanic*******/
router.delete("/delete/:id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({"status": "ERROR", "error_message": "No id supplied for delete operation"});
        }
        MechanicService.deleteMechanicByIdAsync(req.params.id)
            .then(function(deleted){
                return res.status(200).json({"status":"OK",
                    "message":"Mechanic deleted successfully",
                    "data":(deleted)});
            })
            .catch(next);
    }
);

module.exports = router;