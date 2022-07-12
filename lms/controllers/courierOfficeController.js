/**
 * Created by pratik on 21/10/16.
 */

var router = express.Router();
var VendorCourierService = promise.promisifyAll(commonUtil.getService('vendorCourier'));
var CourierOfficeService = promise.promisifyAll(commonUtil.getService('courierOffice'));

/**************fuel vendor *********/
router.post("/add",
    function(req,res,next){
        VendorCourierService.findCourierVendorAsync({_id:req.body.courier_vendor_id})
            .then(function(vendor){
                if (vendor && vendor[0]) {
                    CourierOfficeService.findCourierOfficeAsync({courier_vendor_id:req.body.courier_vendor_id, branch_name:req.body.branch_name})
                    .then(function(office){
                        if(office && office[0]){
                            return res.status(200).json({
                                "status": "OK",
                                "message": "This courier office branch already exists for this vendor.",
                            });
                        }else{
                            return next();
                        }
                    })
                }else{
                    return res.status(200).json({
                        "status": "OK",
                        "message": "This courier vendor name does not exists.",
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        CourierOfficeService.addCourierOfficeAsync(req.body)
        .then(function(office){
            if(office){
              return res.status(200).json({"status":"OK",
                "message":"Courier office has been added successfully",
                "data":office});  
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"Unable to add courier office."});  
            }
        }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    CourierOfficeService.getCourierOfficeAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"Courier office found.",
            "data":data.data,
            "pages":data.no_of_pages}); 
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No Courier Office found.",
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
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating courier office."});
        }
        CourierOfficeService.findCourierOfficeAsync({_id:req.params._id})
        .then(function(office){
            if (office) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This courier office does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        CourierOfficeService.updateCourierOfficeByIdAsync(req.params._id,req.body)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"courier office data has been updated successfully",
                "data":updated});  
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to update courier office data."});
            }
        }).catch(next)
    }
);

router.delete("/delete/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the courier office."});
        }
        CourierOfficeService.findCourierOfficeAsync({_id:req.params._id})
        .then(function(office){
            if (office) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This courier office does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        CourierOfficeService.deleteCourierOfficeAsync(req.params._id)
        .then(function(deleted){
            if(deleted){
                return res.status(200).json({"status":"OK",
                "message":"Courier office has been deleted successfully",
                "data":deleted});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to delete courier office."});
            }
        }).catch(next)
    }
);

module.exports = router;
