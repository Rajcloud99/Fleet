/**
 * Created by manish on 3/2/17.
 */

var router = express.Router();
var PrimeMoverTrailerAssociationService = promise.promisifyAll(commonUtil.getMaintenanceService('primeMoverTrailerAssociation'));
var RegisteredVehicleService = promise.promisifyAll(commonUtil.getService("registeredVehicle"));
var TrailerMasterService = promise.promisifyAll(commonUtil.getMaintenanceService('trailerMaster'));
var pmtassoc = promise.promisifyAll(commonUtil.getMaintenanceService('primeMoverTrailerAssociation'));
var TyreMaster = promise.promisifyAll(commonUtil.getMaintenanceModel('tyreMaster'));
let ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
/**call add with trailer association data**/
router.post("/add",
    /**validate if vehicle is not associated with any trailer**/
    function (req, res, next) {
        RegisteredVehicleService.findRegisteredVehicleQueryAsync({
            clientId: req.user.clientId,
            vehicle_reg_no: req.body.vehicle_reg_no
        })
            .then(function (regVehicleArr) {
                if (regVehicleArr && regVehicleArr.length > 0 && !regVehicleArr[0].associated_with_trailer) {
                    req.regVehicle = regVehicleArr[0];
                    return next();
                } else if (regVehicleArr && regVehicleArr.length > 0 && regVehicleArr[0].associated_with_trailer) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "This vehicle is already associated with trailer "
                            + regVehicleArr[0].associated_trailer_no + " . Please disassociatree it first"
                    })
                } else
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Vehicle registration no. does not exist"
                    })
            })
    },
    /**validate if trailer is not associated with any vehicle **/
    function (req, res, next) {
        RegisteredVehicleService.findRegisteredVehicleQueryAsync({
            clientId: req.user.clientId,
            vehicle_reg_no: req.body.trailer_no, category: "Trailer"
        })
            .then(function (trailerArr) {
                if (trailerArr && trailerArr.length > 0 && !trailerArr[0].associationFlag) {
                    return next();
                } else if (trailerArr && trailerArr.length > 0 && trailerArr[0].associationFlag) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "This trailer is already associated with vehicle"
                            + trailerArr[0].associatedVehNo + " . Please disassociate it first"
                    })
                } else
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Trailer no. does not exist"
                    })
            })
    },
    /**add association entry **/
    function (req, res, next) {
        req.body.associated_by_employee_name = req.body.created_by_name;
        req.body.associated_by_employee_code = req.body.created_by_employee_code;
        PrimeMoverTrailerAssociationService.addPrimeMoverTrailerAssociationAsync(req.body)
            .then(function (primeMoverTrailerAssociation) {
                return next();
            }).catch(next)
    },
    /**Mark trailer with association boolean **/
    function (req, res, next) {
        RegisteredVehicleService.updateRegisteredVehicleByQueryAsync(
            { clientId: req.user.clientId, vehicle_reg_no: req.body.trailer_no },
            { associationFlag: true, associated_vehicle: req.body.vehicle_reg_no })
            .then(function (updated) {
                return next();
            }).catch(next);
    },
    /**mark regvehicle data with association boolean **/
    function (req, res, next) {
        RegisteredVehicleService.updateRegisteredVehicleIdAsync(req.regVehicle._id,
            { associationFlag: true, associated_vehicle: req.body.trailer_no })
            .then(function (updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Prime mover trailer association data has been added successfully",
                    "data": updated
                });
            }).catch(next)
    }
);

router.get("/get", function (req, res, next) {
    PrimeMoverTrailerAssociationService.searchPrimeMoverTrailerAssociationAsync(req.query)
        .then(function (data) {
			function ReportResponse(data) {
				return res.status(200).json({
					"status": "OK",
					"message": "horse trailer association  report download available.",
					"url": data.url
				});
			};
            if (req.query.download == 'true') {
            	let aData = {};
				aData.aggregateBy = 'vehicle_reg_no';
            	aData.data = data.primeMoverTrailerAssociations;
				ReportExelService.generatePMTAssocExcel(aData, req.query.clientId, ReportResponse)
            } else {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Prime mover trailer associations found",
                    "data": data.primeMoverTrailerAssociations,
                    "count": data.count,
                    "pages": data.pages
                });
            }
        }).catch(next)
});

router.put("/update/:_id",
    /**validate , find doc by id **/
    function (req, res, next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({ "status": "ERROR", "message": "No update body found" });
        }
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({
                "status": "ERROR",
                "message": "No id provided for updating Prime mover trailer association"
            });
        }
        PrimeMoverTrailerAssociationService.findPrimeMoverTrailerAssociationByIdAsync(req.params._id)
            .then(function (primeMoverTrailerAssociationDoc) {
                if (primeMoverTrailerAssociationDoc) {
                    req.primeMoverTrailerAssociationDoc = primeMoverTrailerAssociationDoc;
                    if (req.primeMoverTrailerAssociationDoc.isDisassociated) {
                        return res.status(500).json({
                            "status": "ERROR",
                            "message": "Prime mover trailer is already disassociate.",
                        })
                    } else {
                        return next();
                    }
                } else {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Prime mover trailer association data not found for update",
                    })
                }
            }).catch(next);
    },
    /**mark regvehicle data with association boolean = false if disassociate=true**/
    function (req, res, next) {
        if (req.body.isDisassociated) {
            req.body.disassociated_by_employee_name = req.body.last_modified_by_name;
            req.body.disassociated_by_employee_code = req.body.last_modified_employee_code;
            RegisteredVehicleService.updateRegisteredVehicleByQueryAsync(
                { clientId: req.user.clientId, vehicle_reg_no: req.body.vehicle_reg_no },
                { associationFlag: false, associated_vehicle: undefined })
                .then(function (updated) {
                    return next();
                }).catch(next);
        } else {
            return next();
        }
    },
    /**mark trailer doc with association boolean = false if disassociate=true**/
    function (req, res, next) {
        if (req.body.isDisassociated) {
            RegisteredVehicleService.updateRegisteredVehicleByQueryAsync(
                { clientId: req.user.clientId, vehicle_reg_no: req.body.trailer_no },
                { associationFlag: false, associated_vehicle: undefined })
                .then(function (updated) {
                    return next();
                }).catch(next);
        } else {
            return next();
        }
    },
    function (req, res, next) {
        PrimeMoverTrailerAssociationService.updatePrimeMoverTrailerAssociationByIdAsync(req.params._id, req.body)
            .then(function (updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Prime mover trailer association data has been updated successfully",
                    "data": updated
                });
            }).catch(next)
    }
);

/*router.delete("/delete/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR",
            "message":"No id provided to delete for Prime mover trailer association"});
    }
    PrimeMoverTrailerAssociationService.deletePrimeMoverTrailerAssociationByIdAsync(req.params._id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"Prime mover trailer association has been deleted successfully",
                "data":deleted});
        }).catch(next)
});*/

router.get("/getAsocVeh", function (req, res, next) {
    if (req.query.vehicle_no) {
        let pmtQuery = { isDisassociated: false, $or: [{ vehicle_reg_no: req.query.vehicle_no }, { trailer_no: req.query.vehicle_no }] }
        pmtassoc.findPrimeMoverTrailerAssociationByQueryAsync(pmtQuery).then((horseTrailerData) => {
            horseTrailerData = JSON.parse(JSON.stringify(horseTrailerData));
            if (horseTrailerData && horseTrailerData[0]) {
                if (horseTrailerData[0].vehicle_reg_no == req.query.vehicle_no) {
                    req.query.associatedVeh = horseTrailerData[0].trailer_no;
                    return next();
                } else {
                    req.query.associatedVeh = horseTrailerData[0].vehicle_reg_no;
                    return next();
                }
            }
        }).catch(next)
    }
    else {
        return res.status(200).json({
            "status": "OK",
            "message": "NO prime mover trailer associated found",
            "data": {}
        });
    }
},
    function (req, res, next) {
        RegisteredVehicleService.findRegisteredVehicleQueryAsync({
            vehicle_reg_no: req.query.associatedVeh
        }).then(function (regVehicleArr) {
            regVehicleArr = JSON.parse(JSON.stringify(regVehicleArr));
            if (regVehicleArr && regVehicleArr[0]) {
                return res.status(200).json({
                    "status": "OK",
                    "data": regVehicleArr[0]
                });
            }
        })
    })
module.exports = router;
