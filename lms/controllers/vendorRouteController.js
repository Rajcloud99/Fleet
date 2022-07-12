/**
 * Created by kamal on 20/10/16.
 */
var router = require('express').Router();
var VendorRouteService = promise.promisifyAll(commonUtil.getService("vendorRoute"));
var VendorTransportService = promise.promisifyAll(commonUtil.getService('vendorTransport'));
/***********add new VendorRoute *******/
router.post("/add",
    function(req,res,next) {
        VendorRouteService.findVendorRouteQueryAsync({name:req.body.name,clientId:req.query.clientId,vendor:req.body.vendor})
            .then(function(VendorRoute){
                if (VendorRoute && VendorRoute[0]) {
                	var sResp = req.body.name + "vendor route for "+ req.body.vendor_name + " already exist."; 
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": sResp
                    });
                }else{
                    return next();
                }
            }).catch(next);
    },
    function(req,res,next) {
        VendorRouteService.addVendorRouteAsync(req.body)
        .then(function(VendorRoute){
            return res.status(200).json({"status":"OK",
                "message":"VendorRoute has been added successfully",
                "data":VendorRoute});
        }).catch(next);
    }
);

/***********get all VendorRoutees + search *******/
router.get("/get",function(req,res,next){
    VendorRouteService.searchVendorRouteAsync(req.query,false)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"VendorRoutees found",
                "data":data.VendorRoutees,
                "pages":data.pages,
                "count":data.count});
        }).catch(next);
});

/***********get all VendorRoutees + trim + search  *******/
router.get("/get/trim",function(req,res,next){
    VendorRouteService.searchVendorRouteAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"VendorRoutees found",
                "data":data.VendorRoutees});
        }).catch(next);
});
/***********get all VendorRoutees  + search + text search *******/
router.get("/get/search",function(req,res,next){
    VendorRouteService.getVendorRouteByTextAsync(req)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"VendorRoutees found",
                "data":data.data,
                "no_of_pages":data.no_of_pages});
        }).catch(next);
});

router.get("/get/vendors_route",function(req,res,next){
    VendorRouteService.getVendorRouteByTextAsync(req)
        .then(function(data){
            /*return res.status(200).json({"status":"OK",
                "message":"Vendor Routes found",
                "data":data.data,
                "no_of_pages":data.no_of_pages});*/
                if(data && data.data && data.data[0]){
                    var vendorIDs = [];
                    for (var i = 0; i < data.data.length; i++) {
                        if(data.data[i].vendor){
                            vendorIDs.push(mongoose.Types.ObjectId(data.data[i].vendor))
                        }
                    }
                    if(vendorIDs.length>0){
                        VendorTransportService.findVendorInBulkAsync({"$in":vendorIDs})
                        .then(function(vendor){
                        return res.status(200).json({"status":"OK",
                            "message":"Vendor found",
                            "data":vendor.data,
                            "no_of_pages":vendor.no_of_pages})
                        })
                    }else{
                        return res.status(200).json({"status":"OK",
                            "message":"No Vendor found",
                            "data":[],
                        })
                    }
                }else{
                    return res.status(200).json({"status":"OK",
                        "message":"No Vendor found",
                        "data":[],
                    })
                }
        }).catch(next);
});

/***********update VendorRoute *******/
router.put("/update/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","error_message":"No id supplied to update VendorRoute"});
        }
        VendorRouteService.findVendorRouteIdAsync(req.params._id)
            .then(function(VendorRoute){
                if (VendorRoute && VendorRoute[0]) {
                    req.VendorRoute = VendorRoute[0];
                    return next();
                }else{
                    return res.status(500).json({"status": "ERROR", "error_message": "VendorRoute does not exist"});
                }
            }).catch(next)
    },
    function(req,res,next){
    	if(req.VendorRoute.clientId != req.query.clientId){
    		 return res.status(200).json({"status":"ERROR",
                 "message":"Client Id does not match"
                });
    	}else if(req.VendorRoute.vendor != req.body.vendor){
    		 return res.status(200).json({"status":"ERROR",
                 "message":"vendor Id does not match."
                });
    	}else{	
    	  VendorRouteService.updateVendorRouteIdAsync(req.params._id,req.body)
            .then(function (VendorRoute) {
                return res.status(200).json({"status":"OK",
                    "message":"VendorRoute has been updated successfully",
                    "data":VendorRoute});
            }).catch(next);
    	}
    }
);

/***********delete VendorRoute *******/
router.delete("/delete/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","error_message":"No id supplied to delete for VendorRoute"});
        }
        VendorRouteService.findVendorRouteIdAsync(req.params._id)
            .then(function(VendorRoute){
                if (VendorRoute && VendorRoute[0]) {
                	 req.VendorRoute = VendorRoute[0];
                    return next();
                }else{
                    return res.status(500).json({"status": "ERROR", "error_message": "VendorRoute does not exist"});
                }
            })
            .catch(function (err) {
                return next(err);
            });
    },
    function(req,res,next) {
    	if(req.VendorRoute.clientId != req.query.clientId){
   		 return res.status(200).json({"status":"ERROR",
                "message":"Client Id does not match"
               });
   	}else if(req.VendorRoute.vendor != req.body.vendor){
   		 return res.status(200).json({"status":"ERROR",
                "message":"vendor Id does not match."
               });
   	}else{
        VendorRouteService.deleteVendorRouteIdAsync(req.params._id)
            .then(function(deleted){
                return res.status(200).json({"status":"OK",
                    "message":"VendorRoute has been deleted successfully",
                    "data":deleted});
            })
            .catch(function (err) {
                return next(err);
            });
   	}
   }
);

module.exports = router;