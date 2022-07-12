/**
 * Created by manish on 5/7/16.
 */

var router = express.Router();
var VendorMaintenanceService = promise.promisifyAll(commonUtil.getService('vendorMaintenance'));

router.post("/add",
    function(req,res,next){
        VendorMaintenanceService.findVendorMaintenanceQueryAsync({name:req.body.name})
            .then(function(vendor){
                if (vendor && vendor[0]) {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This maintenance vendor name already exists. Please choose a different vendor name",
                        "data": vendor
                    });
                }else{
                    return next();
                }
            }).catch(next)
    },
    function(req,res,next) {
        VendorMaintenanceService.addVendorMaintenanceAsync(req.body)
            .then(function(vendor){
                return res.status(200).json({"status":"OK",
                    "message":"Maintenance vendor has been added successfully",
                    "data":vendor});
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    VendorMaintenanceService.searchVendorMaintenanceAsync(req.query,false)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Maintenance vendors found",
                "data":data.vendors,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});

router.get("/get/trim",function(req,res,next){
    VendorMaintenanceService.searchVendorMaintenanceAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Maintenance vendors found",
                "data":data.vendors});
        }).catch(next)
});

router.get("/one/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id supplied to find maintenance vendor"});
    }
    VendorMaintenanceService.findVendorMaintenanceIdAsync(req.params._id)
        .then(function(vendor){
            return res.status(200).json({"status":"OK",
                "message":"Maintenance vendor found",
                "data":vendor});
        }).catch(next)
});


router.put("/update/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.body)){
        return res.status(500).json({"status":"ERROR","message":"No update body found"});
    }
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided for updating maintenance vendor"});
    }
    VendorMaintenanceService.updateVendorMaintenanceIdAsync(req.params._id,req.body)
        .then(function(updated){
            return res.status(200).json({"status":"OK",
                "message":"Maintenance vendor data has been updated successfully",
                "data":updated});
        }).catch(next)
});

router.delete("/delete/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for driver"});
    }
    VendorMaintenanceService.deleteVendorMaintenanceIdAsync(req.params._id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"Maintenance vendor has been deleted successfully",
                "data":deleted});
        }).catch(next)
});

module.exports = router;
