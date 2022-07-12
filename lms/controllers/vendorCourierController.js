/**
 * Created by manish on 5/7/16.
 */

var router = express.Router();
var VendorCourierService = promise.promisifyAll(commonUtil.getService('vendorCourier'));

/**************courier vendor *********/
router.post("/add",
    function(req,res,next){
        VendorCourierService.findVendorCourierQueryAsync({name:req.body.name})
            .then(function(vendor){
                if (vendor && vendor[0]) {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This courier vendor name already exists. Please choose a different vendor name.",
                        "data": vendor
                    });
                }else{
                    return next();
                }
            }).catch(next)
    },
    function(req,res,next) {
        VendorCourierService.addVendorCourierAsync(req.body)
            .then(function(vendor){
                return res.status(200).json({"status":"OK",
                    "message":"Courier vendor has been added successfully.",
                    "data":vendor});
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    VendorCourierService.getVendorCourierAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"Courier vendors found",
            "data":data.data,
            "pages":data.no_of_pages}); 
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No Courier vendors found",
            "data":[]});
       }
    }).catch(next)
});

router.put("/update/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.body)){
        return res.status(500).json({"status":"ERROR","message":"No update body found."});
    }
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided for updating courier vendor."});
    }
    VendorCourierService.updateVendorCourierIdAsync(req.params._id,req.body)
        .then(function(updated){
            return res.status(200).json({"status":"OK",
                "message":"Courier vendor data has been updated successfully.",
                "data":updated});
        }).catch(next)
});

router.delete("/delete/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for courier vendor."});
    }
    VendorCourierService.deleteVendorCourierIdAsync(req.params._id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"Courier vendor has been deleted successfully",
                "data":deleted});
        }).catch(next)
});

module.exports = router;
