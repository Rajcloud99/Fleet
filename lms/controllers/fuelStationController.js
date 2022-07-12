/**
 * Created by pratik on 14/10/16.
 */

var router = express.Router();
var VendorFuelService = promise.promisifyAll(commonUtil.getService('vendorFuel'));
var FuelStationService = promise.promisifyAll(commonUtil.getService('fuelStation'));
var TripAdvances = promise.promisifyAll(commonUtil.getModel('TripAdvances'));

/**************fuel vendor *********/
router.post("/add",
    function(req,res,next){
        VendorFuelService.findFuelVendorAsync({_id:req.body.fuel_vendor_id})
            .then(function(vendor){
                if (vendor && vendor[0]) {
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This fuel vendor name does not exists.",
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        FuelStationService.addFuelStationAsync(req.body)
        .then(function(station){
            if(station){
              return res.status(200).json({"status":"OK",
                "message":"Fuel station has been added successfully.",
                "data":station});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"Unable to add fuel station."});
            }
        }).catch(next)
    }
);
const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

router.get("/get",function(req,res,next){
    FuelStationService.getFuelStationsAsync(req.query)
    .then(function(data){
		if (req.query.download) {
			if(data){
				ReportExelService.fuelStationReports(data.data, req.user.clientId, function(data){
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			}else{
				return res.status(500).json({"status":"warning",
					"message":"No Fuel station found.",
					"data":[]});
			}
		}
        else if(data){
           return res.status(200).json({"status":"OK",
            "message":"Fuel station found.",
            "data":data.data,
            "pages":data.no_of_pages});
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No Fuel station found.",
            "data":[]});
       }
    }).catch(next)
});

router.put("/update/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found."});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating fuel station."});
        }
        FuelStationService.findFuelStationAsync({_id:req.params._id})
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
        FuelStationService.updateFuelStationByIdAsync(req.params._id,req)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"fuel station data has been updated successfully.",
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
        FuelStationService.findFuelStationAsync({_id:req.params._id})
        .then(async function(station){
			if (station && station[0]) {
				let adv  = await TripAdvances.findOne({"dieseInfo.station":mongoose.Types.ObjectId(req.params._id)},{advanceType:1});
				if(adv){
					return res.status(500).json({
						     'status': 'ERROR',
						     'error_message': "This fuel station link with advance can not delete."
					});
				}else{
					return next();
				}
			} else {
				return res.status(200).json({
					"status": "ERROR",
					"message": "This fuel station name does not exists.",
				});
			}
        }).catch(next)
    },
    function(req,res,next) {
        FuelStationService.deleteFuelStationAsync(req.params._id)
        .then(function(deleted){
            if(deleted){
                return res.status(200).json({"status":"OK",
                "message":"Fuel station has been deleted successfully.",
                "data":deleted});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to delete fuel station."});
            }
        }).catch(next)
    }
);

module.exports = router;
