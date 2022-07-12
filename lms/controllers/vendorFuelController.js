/**
 * Created by manish on 5/7/16.
 */

var router = express.Router();
var VendorFuelService = promise.promisifyAll(commonUtil.getService('vendorFuel'));
var TripAdvances = promise.promisifyAll(commonUtil.getModel('TripAdvances'));

/**************fuel vendor *********/
router.post("/add",
    function(req,res,next){
        VendorFuelService.findFuelVendorAsync({name:req.body.name, clientId: req.user.clientId})
            .then(function(vendor){
                if (vendor && vendor[0]) {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This fuel vendor name already exists. Please choose a different vendor name",
                        "data": vendor
                    });
                }else{
                    return next();
                }
            }).catch(next)
    },
    function(req,res,next) {
        VendorFuelService.addVendorFuelAsync(req.body)
        .then(function(vendor){
            if(vendor){
                return res.status(200).json({"status":"OK",
                "message":"Fuel vendor has been added successfully",
                "data":vendor});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"Unable to add fuel vendor."});
            }

        }).catch(next)
    }
);

router.get("/get",function(req,res,next){

	if(req.query.cClientId)
		req.query.clientId = req.query.cClientId

    VendorFuelService.getFuelVendorsAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"Fuel vendor found",
            "data":data.data,
            "pages":data.no_of_pages});
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No Fuel vendor found",
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
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating fuel station."});
        }
        VendorFuelService.findFuelVendorAsync({_id:req.params._id})
        .then(function(station){
            if (station) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This fuel station name does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        VendorFuelService.updateFuelStationByIdAsync(req.params._id,req.body)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"fuel station data has been updated successfully",
                "data":updated});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to update fuel station data."});
            }
        }).catch(next)
    }
);

router.delete("/delete/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the fuel station."});
        }
        VendorFuelService.findFuelVendorAsync({_id:req.params._id})
        .then(async function(station){
			if (station && station[0]) {
				let adv  = await TripAdvances.findOne({"dieseInfo.vendor":mongoose.Types.ObjectId(req.params._id)},{advanceType:1});
				if(adv){
					return res.status(500).json({
						'status': 'ERROR',
						'error_message': "This fuel vendor link with advance can not delete."
					});
				}else{
					return next();
				}
			} else {
				return res.status(200).json({
					"status": "ERROR",
					"message": "This fuel vendor id does not exists.",
				});
			}
        }).catch(next)
    },
    function(req,res,next) {
        VendorFuelService.deleteVendorFuelIdAsync(req.params._id)
        .then(function(deleted){
            if(deleted){
                return res.status(200).json({"status":"OK",
                "message":"Fuel vendor has been deleted successfully",
                "data":deleted});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to delete fuel vendor."});
            }
        }).catch(next)
    }
);

module.exports = router;
