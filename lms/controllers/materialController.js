/**
 * Created by manish on 19/7/16.
 */
var router = require('express').Router();
var path = require('path');
var MaterialService = promise.promisifyAll(commonUtil.getService("material"));


/***********add new material group *******/
router.post("/group/add",
    function(req,res,next){
        /*if(otherUtil.validateSuperAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }
        */
        MaterialService.findMaterialGroupQueryAsync({name:req.body.name,clientId:req.body.clientId || req.user.clientId})
            .then(function (materialGroup) {
                if (materialGroup && materialGroup[0]) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Material group name already exists",
                        "data": materialGroup
                    });
                }else{
                   return next();
                }
            }).catch(next);
    },
    function(req,res,next){
		return next();
        MaterialService.findMaterialGroupQueryAsync({code:req.body.code, clientId: req.user.clientId})
            .then(function (materialGroup) {
                if (materialGroup && materialGroup[0]) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Material group code already exists",
                        "data": materialGroup
                    });
                }else{
                    return next();
                }
            }).catch(next);
    },
    function(req,res,next) {
        MaterialService.addMaterialGroupAsync(req.body)
            .then(function (materialGroup) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Material group has been added successfully",
                    "data": materialGroup
                });
            }).catch(function (err) {
            return next(err);
        });
    }
);

/***********add new material type *******/
router.post("/type/add",
    function(req,res,next){
        let query = {
			clientId: req.user.clientId,
			[req.body.sacCode? 'sacCode' : 'hsnCode']: req.body.sacCode? req.body.sacCode : req.body.hsnCode
		}
        MaterialService.findMaterialTypeQueryAsync(query)
            .then(function(materialType){
                if (materialType && materialType[0]) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "HSN code already exists",
                        "data": materialType
                    });
                }else{
                    return next();
                }
            }).catch(next);
    },
    function(req,res,next) {
        MaterialService.addMaterialTypeAsync(req.body)
            .then(function(materialType){
				return res.status(200).json({"status":"OK",
					"message":"Material type has been added successfully",
					"data":materialType});
            }).catch(next);
    },
    // function(req,res,next) {
    //     var newData = {};
    //     newData.toPush = {"material_types":req.material_type._id};
    //     MaterialService.updateMaterialGroupIdSetPushAsync(req.body.group_id,newData)
    //         .then(function(updated){
    //             return res.status(200).json({"status":"OK",
    //                 "message":"Material type has been added successfully",
    //                 "data":req.body.material_type});
    //         }).catch(next);
    // }
);

/***********get all material groups + search *******/
router.get("/group/get",function(req,res,next){
            MaterialService.searchMaterialGroupAsync(req.query,false)
                .then(function(data){
                    return res.status(200).json({"status":"OK",
                        "message":"Material groups found",
                        "data":data.material_types,
                        "pages":data.pages,
                        "count":data.count});
                }).catch(function(err){
                    return next(err);
                });
});

/***********get all material types + search *******/
router.get("/type/get",function(req,res,next){
            MaterialService.searchMaterialTypeAsync(req.query,false)
                .then(function(data){
                    return res.status(200).json({"status":"OK",
                        "message":"Material types found",
                        "data":data.material_types,
                        "count":data.count,
                        "pages":data.pages});
                }).catch(next)
});

/***********get all material groups + trim + search *******/
router.get("/group/get/trim",function(req,res,next){
    MaterialService.searchMaterialGroupAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Material groups found",
                "data":data.material_types});
        }).catch(function(err){
        return next(err);
    });
});

/***********get all material types + trim + search *******/
router.get("/type/get/trim",function(req,res,next){
    MaterialService.searchMaterialTypeAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Material types found",
                "data":data.material_types});
        }).catch(next)
});


/*******get all materials for dropdowns *****************/
router.get("/get",function(req,res,next){
    MaterialService.allMaterialsAsync()
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Materials found",
                "data":data});
        }).catch(next)
});

/***********update material group*******/
router.put("/group/update/:_id",
    function(req,res,next){
        /*if(otherUtil.validateSuperAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }*/
        MaterialService.findMaterialGroupIdAsync(req.params._id)
                .then(function(materialType){
                    if (materialType && materialType[0]){
                        return next();
                    }else{
                        return res.status(200).json({"status":"ERROR",
                            "error_message":"Material group not found"});
                    }
                }).catch(next)
    },
    function(req,res,next){
        MaterialService.updateMaterialGroupIdAsync(req.params._id,req.body)
            .then(function (materialGroup) {
                return res.status(200).json({"status":"OK",
                    "message":"material group updated successfully",
                    "data":materialGroup});
            })
            .catch(function (err) {
                return next(err);
            })
    }
);

/***********update material type*******/
router.put("/type/update/:_id",function(req,res,next){
        /*if(otherUtil.validateSuperAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }*/
        MaterialService.findMaterialTypeIdAsync(req.params._id)
                .then(function(materialType){
                    req.material_type = materialType;
                    return next();
                },function (err) {
                    return res.status(500).json({"status":"ERROR","message":(err)});
                })
                .catch(next)
    },
    function(req,res,next){
        MaterialService.updateMaterialTypeIdAsync(req.params._id,req.body)
            .then(function (materialGroup) {
                return res.status(200).json({"status":"OK",
                    "message":"Material type updated successfully",
                    "data":materialGroup});
            })
            .catch(function (err) {
                return next(err);
            })
    }
);

/***********delete material group*******/
router.delete("/group/delete/:id",function(req,res,next){
    /*if(otherUtil.validateSuperAdmin(req,res)){
        return res.status(500).json({
            "status": "ERROR",
            "error_message": "Access Denied!!"
        });
    }*/
    MaterialService.deleteMaterialGroupIdAsync(req.params.id)
            .then(function(deleted){
                return res.status(200).json({"status":"OK",
                    "message":"material group deleted successfully",
                    "data":(deleted)});
            })
            .catch(function (err) {
                return next(err);
            });
});

/***********delete material type*******/
router.delete("/type/delete/:_id",function(req,res,next){
    /*if(otherUtil.validateSuperAdmin(req,res)){
        return res.status(500).json({
            "status": "ERROR",
            "error_message": "Access Denied!!"
        });
    }*/
    MaterialService.deleteMaterialTypeIdAsync(req.params._id)
            .then(function(deleted){
                return res.status(200).json({"status":"OK",
                    "message":"Material type has been deleted successfully",
                    "data":deleted});
            })
            .catch(function (err) {
                return next(err);
            });
});


/***********get list of material groups with search criteria *******/
router.post("/group/search",function(req,res,next){
    MaterialService.searchMaterialGroupAsync(req.params,req.body)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Material groups found",
                "data":data.material_types,
                "pages":data.pages,
                "count":data.count});
        }).catch(function(err){
        return next(err);
    });
});

/***********get list of material types with search criteria *******/
router.post("/type/search",function(req,res,next){
    MaterialService.searchMaterialTypeAsync(req.params,req.body)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Material types found",
                "data":data.material_types,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});



module.exports = router;
