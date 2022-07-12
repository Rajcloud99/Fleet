/**
 * Created by manish on 19/7/16.
 */
var router = require('express').Router();
var path = require('path');
var VehicleService = promise.promisifyAll(commonUtil.getService("vehicle"));
var async = require('async');
var VehicleType = promise.promisifyAll(commonUtil.getModel('vehicleType'));

var multipartMiddleware = require('connect-multiparty')();
var FileService = commonUtil.getUtil('file_upload_util');
let allowedFiles = ['RC', 'Insurance', 'Photo', 'Pollution Certificate', 'National Permit', 'Other'];

function appendClientIdToQuery(req){
	req.query.clientId = req.user.clientId;
	return req;
}

var validateSuperAdmin = function (req,res) {
    if(req.body.clientId==config.super_admin_id || req.query.clientId==config.super_admin_id){
        return;
    }
    else{
        return res.status(500).json({
            "status": "ERROR",
            "error_message": "Access Denied!!"
        });
    }
}

/***********add new vehicle group *******/
router.post("/group/add",
	function(req,res,next){
        //validateSuperAdmin(req,res);
		VehicleService.findVehicleGroupQueryAsync({name:req.body.name})
			.then(function (vehicleGroup) {
				if (vehicleGroup && vehicleGroup[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"message": "Vehicle group name already exists",
						"data": vehicleGroup
					});
				}else{
					return next();
				}
			}).catch(next);
	},
	function(req,res,next){
		VehicleService.findVehicleGroupQueryAsync({code:req.body.code})
			.then(function (vehicleGroup) {
				if (vehicleGroup && vehicleGroup[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"message": "Vehicle group code already exists",
						"data": vehicleGroup
					});
				}else{
					return next();
				}
			}).catch(next);
	},
	function(req,res,next){
		VehicleService.addVehicleGroupAsync(req.body)
			.then(function (vehicleGroup) {
				return res.status(200).json({
					"status": "OK",
					"message": "Vehicle group has been added successfully",
					"data": vehicleGroup
				});
			}).catch(function (err) {
			return next(err);
		});
	}
);

/***********add new vehicle type *******/
router.post("/type/add",
	function(req,res,next){
        //validateSuperAdmin(req,res);
		VehicleService.findVehicleTypeQueryAsync({name:req.body.name,clientId:req.body.clientId})
			.then(function(vehicleType){
				if (vehicleType && vehicleType[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"message": "Vehicle type name already exists",
						"data": vehicleType
					});
				}else{
					return next();
				}
			}).catch(function(err){
			return next(err);
		});
	},
	function(req,res,next) {
		VehicleService.findVehicleTypeQueryAsync({code:req.body.code})
			.then(function(vehicleType){
				if (vehicleType && vehicleType[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"message": "Vehicle type code already exists",
						"data": vehicleType
					});
				}else{
					return next();
				}
			}).catch(next);
	},
	function(req,res,next) {
		VehicleService.addVehicleTypeAsync(req.body)
			.then(function(vehicleType){
				req.body.vehicle_type = vehicleType;
				return next();
			}).catch(next);
	},
	function(req,res,next) {
		var newData = {};
		newData.toPush = {"vehicle_types":req.body.vehicle_type._id};
		VehicleService.updateVehicleGroupIdSetPushAsync(req.body.group,newData)
			.then(function(updated){
				return res.status(200).json({"status":"OK",
					"message":"Vehicle type has been added successfully",
					"data":req.body.vehicle_type});
			}).catch(next);
	}
);

/***********get all vehicle groups + search*******/
router.get("/group/get",function(req,res,next){
	//req = appendClientIdToQuery(req);
	VehicleService.searchVehicleGroupAsync(req.query,false)
		.then(function(data){
			return res.status(200).json({"status":"OK",
				"message":"Vehicle groups found",
				"data":data.vehicle_types,
				"pages":data.pages,
				"count":data.count});
		}).catch(function(err){
		return next(err);
	});
});

/***********get all vehicle types *******/
router.get("/type/get",function(req,res,next){
	VehicleService.searchVehicleTypeAsync(req.query,false)
		.then(function(data){
		    ///////format data for UI so that checked boxes can be shown while associating vehicle_type to a client
			if(req.query.byClient && req.query.byClient!=""){
			    for(index=0; index<data.vehicle_types.length; index++){
                    if(data.vehicle_types[index].clientInfo){
                        for(i=0; i<data.vehicle_types[index].clientInfo.length; i++){
                            if(data.vehicle_types[index].clientInfo[i].clientId==req.query.byClient){
                                data.vehicle_types[index].avlClient=true;
                                data.vehicle_types[index].sName=data.vehicle_types[index].clientInfo[i].sName;
                                break;
                            }
                        }
                    }
                }
			}
			//////
			return res.status(200).json({"status":"OK",
				"message":"Vehicle types found",
				"data":data.vehicle_types,
				"count":data.count,
				"pages":data.pages});
		}).catch(next)
});

/***********get all vehicle groups + trim + search *******/
router.get("/group/get/trim",function(req,res,next){
	VehicleService.searchVehicleGroupAsync(req.query,true)
		.then(function(data){
			return res.status(200).json({"status":"OK",
				"message":"Vehicle groups found",
				"data":data.vehicle_types});
		}).catch(function(err){
		return next(err);
	});
});

/***********get all vehicle types + trim + search *******/
router.get("/type/get/trim",function(req,res,next){
	VehicleService.searchVehicleTypeAsync(req.query,true)
		.then(function(data){
			return res.status(200).json({"status":"OK",
				"message":"Vehicle types found",
				"data":data.vehicle_types});
		}).catch(next)
});

/*******get all vehicles for dropdowns *****************/
router.get("/get",function(req,res,next){
	VehicleService.allVehiclesAsync()
		.then(function(data){
			return res.status(200).json({"status":"OK",
				"message":"Vehicles found",
				"data":data});
		}).catch(next)
});

/*******get all vehicles for dropdowns *****************/
router.get("/get/owned",function(req,res,next){
	VehicleService.allVehiclesOwnedAsync()
		.then(function(data){
			return res.status(200).json({"status":"OK",
				"message":"Vehicles found",
				"data":data});
		}).catch(next)
});

/***********update vehicle group*******/
router.put("/group/update/:_id",
	function(req,res,next){
        //validateSuperAdmin(req,res);
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({"status": "ERROR", "error_message": "No id supplied for update operation"});
        }
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({"status": "ERROR", "error_message": "No update body found"});
		}
		VehicleService.findVehicleGroupIdAsync(req.params._id)
			.then(function(vehicleType){
				if (vehicleType && vehicleType[0]) {
					return next();
				}else{
					return res.status(500).json({"status": "ERROR", "error_message": "No vehicle group found"});
				}
			},function (err) {
				return res.status(500).json({"status":"ERROR","message":err});
			})
	},
	function(req,res,next){
		VehicleService.updateVehicleGroupIdAsync(req.params._id,req.body)
			.then(function (vehicleGroup) {
				return res.status(200).json({"status":"OK",
					"message":"Vehicle group updated successfully",
					"data":vehicleGroup});
			})
			.catch(function (err) {
				return next(err);
			})
	}
);

/***********update vehicle type*******/
router.put('/type/update/:_id',
	function(req, res, next) {
		//validateSuperAdmin(req, res);
		if(otherUtil.isEmptyObject(req.params)) {
			return res.status(500).json({'status': 'ERROR', 'error_message': 'No id supplied for update operation'});
		}
		if(otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({'status': 'ERROR', 'error_message': 'No update body found'});
		}
		VehicleService.findVehicleTypeIdAsync(req.params._id)
			.then(function(vehicleType) {
				if(vehicleType && vehicleType[0]) {
					req.vehicleTypeData = JSON.parse(JSON.stringify(vehicleType[0]));
					return next();
				} else {
					return res.status(500).json({'status': 'ERROR', 'error_message': 'No vehicle type found'});
				}
			}, function(err) {
				return res.status(500).json({'status': 'ERROR', 'message': (err)});
			})
			.catch(next);
	},
	multipartMiddleware,
	async function(req, res, next) {
		if(req.files) {
			await FileService.uploadFiles(req, 'VehicleType', req.vehicleTypeData, allowedFiles);
		}
		req.body.documents = req.vehicleTypeData.documents;
		delete req.files;
		VehicleService.updateVehicleTypeIdAsync(req.params._id, req.body)
			.then(function(vehicleGroup) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'vehicle type updated successfully',
					'data': vehicleGroup
				});
			})
			.catch(function(err) {
				return next(err);
			});
	}
);

/***********delete vehicle group*******/
router.delete("/group/delete/:id",
	function(req,res,next){
        //validateSuperAdmin(req,res);
		if (otherUtil.isEmptyObject(req.params)) {
			return res.status(500).json({"status": "ERROR", "error_message": "No id supplied for delete operation"});
		}
		VehicleService.deleteVehicleGroupIdAsync(req.params.id)
			.then(function(deleted){
				return res.status(200).json({"status":"OK",
					"message":"vehicle group deleted successfully",
					"data":(deleted)});
			})
			.catch(function (err) {
				return next(err);
			});
	}
);

/***********delete vehicle type*******/
router.delete("/type/delete/:_id",
	function(req,res,next){
        //validateSuperAdmin(req,res);
		if (otherUtil.isEmptyObject(req.params)) {
			return res.status(500).json({"status": "ERROR", "error_message": "No id supplied for delete operation"});
		}
		VehicleService.deleteVehicleTypeIdAsync(req.params._id)
			.then(function(deleted){
				return res.status(200).json({"status":"OK",
					"message":"vehicle type deleted successfully",
					"data":deleted});
			})
			.catch(function (err) {
				return next(err);
			});
	}
);


/***********get list of vehicle groups with search criteria *******/
router.post("/group/search",function(req,res,next){
	VehicleService.searchVehicleGroupAsync(req.params,req.body)
		.then(function(data){
			return res.status(200).json({"status":"OK",
				"message":"Vehicle groups found",
				"data":data.vehicle_types,
				"pages":data.pages,
				"count":data.count});
		}).catch(function(err){
		return next(err);
	});
});

/***********get list of vehicle types with search criteria *******/
router.post("/type/search",function(req,res,next){
	VehicleService.searchVehicleTypeAsync(req.params,req.body)
		.then(function(data){
			return res.status(200).json({"status":"OK",
				"message":"Vehicle types found",
				"data":data.vehicle_types,
				"count":data.count,
				"pages":data.pages});
		}).catch(next)
});

router.put("/type/updatemulti",
    function(req,res,next) {
        //validateSuperAdmin(req, res);
        if (otherUtil.isEmptyObject(req.body) || otherUtil.isEmptyObject(req.body.vehTypes)) {
            return res.status(500).json({"status": "ERROR", "error_message": "No update body found"});
        }
        return next();
    },
    function(req,res,next) {
        var bulkUpdate = VehicleType.collection.initializeOrderedBulkOp();

        for(var index=0; index<req.body.vehTypes.length; index++){
            var vehTypeData=JSON.parse(JSON.stringify(req.body.vehTypes[index]));
            var id=req.body.vehTypes[index]._id;
            delete vehTypeData._id;
            bulkUpdate.find({_id:mongoose.Types.ObjectId(id)}).update({$set:vehTypeData});
        }
        bulkUpdate.execute(function(err, updatedDBResponse) {
            console.log(err);
            var response=JSON.parse(JSON.stringify(updatedDBResponse));
            if(err){
                return next(err);
            }else {
                return res.status(200).json({"status":"OK",
                    "message":"vehicle type updated",
                    "response":updatedDBResponse});
            }
        });
    }
);

module.exports = router;
