/**
 * Created by manish on 29/12/16.
 */

var router = express.Router();
var VendorMaintenanceService = promise.promisifyAll(commonUtil.getMaintenanceService('vendorMaintenance_'));

router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        return next();
    },
    function(req,res,next) {
        VendorMaintenanceService.addVendorMaintenanceAsync(req.body)
            .then(function(added){
                if(added){
                    return res.status(200).json({"status":"OK",
                        "message":"Vendor has been added successfully",
                        "data":added});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to add Vendor Maintenance."});
                }
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    VendorMaintenanceService.searchVendorMaintenanceAsync(req.query)
        .then(function(data){
            if(data){
                return res.status(200).json({"status":"OK",
                    "message":"VendorMaintenance found.",
                    "data":data.data,
                    "pages":data.no_of_pages});
            }else{
                return res.status(200).json({"status":"OK",
                    "error_message":"No Vendor Maintenance found.",
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
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating VendorMaintenance."});
        }
        VendorMaintenanceService.findVendorMaintenanceByQueryAsync({_id:req.params._id})
            .then(function(available){
                if (available) {
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This Vendor maintenance does not exists."
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        VendorMaintenanceService.updateVendorMaintenanceByIdAsync(req.params._id,req.body)
            .then(function(updated){
                if(updated){
                    return res.status(200).json({"status":"OK",
                        "message":"Vendor Maintenance data has been updated successfully",
                        "data":updated});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to update Vendor maintenance data."});
                }
            }).catch(next)
    }
);

router.delete("/delete/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the part."});
        }
        VendorMaintenanceService.findVendorMaintenanceByQueryAsync({_id:req.params._id})
            .then(function(available){
                if (available) {
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This vendor maintenance does not exists."
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        VendorMaintenanceService.deleteVendorMaintenanceByIdAsync(req.params._id)
            .then(function(deleted){
                if(deleted){
                    return res.status(200).json({"status":"OK",
                        "message":"Vendor Maintenance has been deleted successfully",
                        "data":deleted});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to delete Vendor Maintenance."});
                }
            }).catch(next)
    }
);

module.exports = router;
