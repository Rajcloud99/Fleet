var express = require('express');
var router = express.Router();
var async = require('async');
var Promise = require('bluebird');
var RoleService = Promise.promisifyAll(commonUtil.getService('roles'));

/***Note
 * Role data is an array to preserve order since objects do not preserve order. Whenever it is to be used internally ,
 * recommended way is to toss around an object
 ***/


router.post("/add",
    /***Make validations first ***/
    function(req,res,next){
        if(otherUtil.validateAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }
        if (req.body.role===config.super_admin_role_name){
            return res.status(500).json({"status":"ERROR","error_message":"This role name is reserved"})
        }else if(req.body.role && !req.body.department){
            return res.status(500).json({"status":"ERROR","error_message":"Department name is needed for role registration"});
        }else{
            return next();
        }
    },
    /***Verify role is unique ***/
    function(req,res,next){
        RoleService.findRoleByQueryAsync(
            {"role": req.body.role, "department": req.body.department, "clientId": req.user.clientId})
            .then(function (role) {
                if (role && role[0]) {
                    return res.status(500).json({"status": "ERROR", "error_message": "Role already exists"});
                } else {
                    return next();
                }
            }).catch(next);
    },
    function(req,res,next){
        var saveRoleObj={};
        if (req.user.role === config.super_admin_role_name) {
            saveRoleObj.role = req.body.role;
            saveRoleObj.department = req.body.department;
            saveRoleObj.clientId = config.super_admin_id;
            saveRoleObj.allows = req.body.allows;
        }else {
            saveRoleObj.role = req.body.role;
            saveRoleObj.department = req.body.department;
            saveRoleObj.clientId = req.user.clientId;
            saveRoleObj.allows = [];
            var fraudulentRoleEntry = false;
            console.log("was here :" + JSON.stringify(req.loginuser_role_data));
            for (var i=0;i<req.body.allows.length;i++) {
                if (req.body.allows[i]["key"] in req.loginuser_role_data) {
                    saveRoleObj.allows.push(req.body.allows[i]);
                }
                else {
                    // console.log("fraudulent role entry key :" +key);
                    fraudulentRoleEntry = true;
                    break;
                }
            }
            if (fraudulentRoleEntry) {
                return res.status(500).json({
                    "status": "ERROR",
                    "error_message": "You tried to add fraudulent role accesses"
                });
            }
        }
        RoleService.addRoleAsync(saveRoleObj)
            .then(function(role){
                if (role) {
                    return res.status(200).json({"status":"OK",
                        "message":"Role added successfully",
                        "data":role
                    });
                }
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    RoleService.searchRoleAsync(req.query)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Roles found",
                "data":data.roles,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});

router.put("/update/:_id",
    /***Make validations ***/
    function(req,res,next){
        if(otherUtil.validateAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        } else if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating role"});
        }else if (req.body.role===config.super_admin_role_name){
            return res.status(500).json({"status":"ERROR","error_message":"This role name is reserved"})
        }else if(req.body.role && !req.body.department){
            return res.status(500).json({"status":"ERROR","error_message":"Department name is needed for role registration"});
        }else{
            return next();
        }
    },
    /***Find role***/
    function(req,res,next){
        RoleService.findRoleByQueryAsync({
                "role": req.body.role, 
                "department": req.body.department,
                "clientId": req.user.clientId,
                "_id":{$ne:mongoose.Types.ObjectId(req.params._id)}
                })
                .then(function (roles) {
                    if (roles && roles[0]) {
                        return res.status(500).json({"status": "ERROR", "message": "Role name already exists in this department"});
                    } else {
                        return next();
                    }
                }).catch(next);

    },
    function(req,res,next) {
        var saveRoleObj = {};
        if (req.user.role ===config.super_admin_role_name) {
            saveRoleObj.role = req.body.role;
            saveRoleObj.department = req.body.department;
            saveRoleObj.clientId = config.super_admin_id;
            saveRoleObj.allows = req.body.allows;
        } else {
            saveRoleObj.role = req.body.role;
            saveRoleObj.department = req.body.department;
            saveRoleObj.clientId = req.user.clientId;
            saveRoleObj.allows = [];
            var fraudulentRoleEntry = false;
            console.log("was here :" + JSON.stringify(req.loginuser_role_data));
            for (var i=0;i<req.body.allows.length;i++) {
                if (req.body.allows[i]["key"] in req.loginuser_role_data) {
                    saveRoleObj.allows.push(req.body.allows[i]);
                }
                else {
                    // console.log("fraudulent role entry key :" +key);
                    fraudulentRoleEntry = true;
                    break;
                }
            }
            if (fraudulentRoleEntry) {
                return res.status(500).json({
                    "status": "ERROR",
                    "error_message": "You tried to add fraudulent role accesses"
                });
            }
        }
        RoleService.updateRoleByIdAsync(req.params._id, saveRoleObj)
            .then(function (updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Role data has been updated successfully",
                    "data": updated
                });
            }).catch(next)
    });

router.delete("/delete/:_id",function(req,res,next) {
    if(otherUtil.validateAdmin(req,res)){
        return res.status(500).json({
            "status": "ERROR",
            "error_message": "Access Denied!!"
        });
    }
    if (otherUtil.isEmptyObject(req.params)) {
        return res.status(500).json({"status": "ERROR", "message": "No id provided to delete for client"});
    }
    RoleService.deleteRoleByIdAsync(req.params._id)
        .then(function (deleted) {
            return res.status(200).json({
                "status": "OK",
                "message": "Role has been deleted successfully"
            }).catch(next)
        });
});


module.exports = router;
