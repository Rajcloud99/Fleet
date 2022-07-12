
 /**
 * Created by PRATIK on 5/10/16.
 */

var router = express.Router();
var GRmasterService = promise.promisifyAll(commonUtil.getService('gr'));
var GRstatusService = promise.promisifyAll(commonUtil.getService('grStatus'));

/********************add**************************************************/
/*router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({"status": "ERROR", "error_message": "Nothing in body for gr update"});
        }
        GRstatusService.isGRstatusExistsAsync({"gr_no":req.body.gr_no})
        .then(function(exists){
            if(exists){
                return res.status(500).json({"status":"ERROR","canAdd":false,
                "message":"GR number already exists."});
            }else{
                GRmasterService.isGRavailableinMasterAsync(req.query)
                .then(function(available){
                    if(available){
                        GRstatusService.addGRAsync(req.body)
                        .then(
                            function(added){
                                return res.status().json({"status":"OK",
                                "canAdd":true,
                                "message":"GR is added",
                                "data":added});
                            }
                        )
                    }else{
                        return res.status(500).json({"status":"ERROR","canAdd":false,"message":"GR is not available in masters for this branch"});
                    }
                }).catch(next)
            }
        }).catch(next)
    }
);*/
//*************Get*********************
router.get("/get",function(req,res,next){
    GRstatusService.getGRstatusAsync(req.query)
        .then(function(available){
            if(available){
               return res.status(200).json({"status":"OK",
                "message":"GR status is available",
                "data":available.data, "no_of_pages":available.no_of_pages});
            }else{
                return res.status(200).json({"status":"OK",
                "message":"GR status is not available",
                "data":[]
                });
            }
        }).catch(next)
    }
);
/**************************get GR status update*************************************/
router.post("/freeGR/:_id",
	function(req,res,next){
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({"status": "ERROR", "error_message": "Nothing in body for gr update"});
		}
		GRstatusService.isGRstatusExistsAsync({"_id":req.params._id})
			.then(function(exists){
				if(exists && exists[0]){
                    exists = JSON.parse(JSON.stringify(exists));
					var history = exists[0].history && exists[0].history[0]? exists[0].history : [];
					history.push({
						title: "Unallocated",
						person: req.user.full_name,
						reason: req.body.reason,
						time: Date.now(),
						remark:req.body.remark
					});
					var oUpdate = {
						gr_Status : 'Unallocated',
						history : history
					};
					GRstatusService.updateGRbyIDAsync(req.params._id,oUpdate)
						.then(function(updatedData){
								return res.status(200).json({"status":"OK",
									"message":"GR is Unallocated"});
							}
						)
				}else{
					return res.status(500).json({"status":"ERROR","message":"GR is not available on this id."});
				}
			}).catch(next)
	}
);

router.post("/update/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({"status": "ERROR", "error_message": "Nothing in body for gr update"});
        }
        GRstatusService.isGRstatusExistsAsync({"_id":req.params._id})
        .then(function(exists){
            if(available){
                var oUpdate = {};
                if(req.body.gr_Status==="Cancelled"){
                    oUpdate.gr_Status = req.body.gr_Status;
                }
                if(req.body.booking_no){
                    oUpdate.booking_no = req.body.booking_no;
                }
                if(req.body.bookingId){
                    oUpdate.bookingId = req.body.bookingId;
                }
                if(req.body.trip_no){
                    oUpdate.trip_no = req.body.trip_no;
                }
                if(req.body.tripId){
                    oUpdate.tripId = req.body.tripId;
                }
                GRstatusService.updateGRbyIDAsync(req.params._id,oUpdate)
                .then(function(updatedData){
                        return res.status().json({"status":"OK",
                        "message":"GR is updated",
                        "data":updatedData});
                    }
                )
            }else{
                return res.status(500).json({"status":"ERROR","message":"GR is not available on this id."});
            }
        }).catch(next)
    }
);


module.exports = router;
