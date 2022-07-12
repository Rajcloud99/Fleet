/**
 * Created by bharath on 28/04/17.
 */
 /**
 * Modified by Pratik on 29/04/17.
 */

var router = express.Router();
var TyreMasterService = promise.promisifyAll(commonUtil.getMaintenanceService('tyreMaster'));
var TyreRetreadService = promise.promisifyAll(commonUtil.getMaintenanceService('tyreRetread'));
router.post("/issue",
    function(req,res,next){
    	if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No request body found"});
        }
        if (!req.body.tyre_number){
            return res.status(500).json({"status":"ERROR",
                "message":"Please provide tyre number to issue for retreading."
            });
        }
        TyreMasterService.findTyreMasterByQueryAsync({clientId:req.user.clientId,
            tyre_number:req.body.tyre_number})
            .then(function (aTyre) {
                if (aTyre && aTyre.length>0){
                    req.tyreData = aTyre[0];
					return next();
                }else
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Tyre number: "+req.body.tyre_number+" does not exist."
                    })
                })
    },
    function(req,res,next) {
    	req.body.issued_by_employee_code=req.user.userId;
    	req.body.issued_by_employee_name=req.user.full_name;
    	TyreRetreadService.addTyreRetreadAsync(req.body)
            .then(function (added) {
            	if(added){
					TyreMasterService.updateTyreMasterByIdAsync(req.tyreData._id,{status:"Issued for retreading"})
						.then(function(updated){
							return res.status(200).json({"status":"OK",
								"message":"Tyre number: "+req.body.tyre_number+" issued for retreading successfully.",
								"data":added
							});
						})
            	}
            }).catch(next)
    }
);

router.put("/return/:_id",
    function(req,res,next){
    	if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR",
                "message":"No id provided for updating retread collection."});
        }
        TyreRetreadService.findTyreRetreadByIdAsync(req.params._id)
            .then(function (oTyreRetread) {
                if (oTyreRetread){
                	req.oTyreRetread = oTyreRetread;
                    return next();
                }else
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "data not found for update on provided id."
                    })
                })
    },
    function(req,res,next){
    	TyreMasterService.findTyreMasterByQueryAsync({clientId:req.user.clientId,
            tyre_number:req.oTyreRetread.tyre_number})
            .then(function (aTyre) {
                if (aTyre && aTyre.length>0){
                    req.tyreData = aTyre[0];
                    if((req.tyreData.status=="Issued for retreading")){
                    	return next();
                    }else{
                    	return res.status(500).json({"status":"ERROR",
			                "message": "Tyre number: "+req.tyreData.tyre_number+" is not issued for retreading."
			            });
                    }
                }else
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Tyre number: "+req.oTyreRetread.tyre_number+" does not exist."
                    })
                })
    },
    function(req,res,next) {
    	var toUpdateRetread = {
            "returned": true,
    		"returned_by_employee_code":req.user.userId,
    		"returned_by_employee_name":req.user.full_name,
    		"return_date":req.body.return_date,
    		"tyre_quality_remark":req.body.tyre_quality_remark,
    		"bill_no":req.body.bill_no,
    		"bill_date":req.body.bill_date,
    		"cost":req.body.cost ||0,
    		"tax":req.body.tax ||0,
    		"freight":req.body.freight ||0,
    		"total_cost":req.body.total_cost ||0
    	}
    	TyreRetreadService.updateTyreRetreadByIdAsync(req.params._id,toUpdateRetread)
            .then(function (updated) {
            	if(updated){
					TyreMasterService.updateTyreMasterByIdAsync(req.tyreData._id,{tyre_category:"Retreaded",retread_count:((req.tyreData.retread_count || 0)+1),status:(req.body.tyreMasterStatus|| "Repository Bin"),current_price:(req.tyreData.current_price||0)+updated.total_cost})
						.then(function(updatedMaster){
							return res.status(200).json({"status":"OK",
								"message":"Tyre number: "+req.tyreData.tyre_number+" retreaded successfully.",
								"data":updated
							});
						})
            	}
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    TyreRetreadService.searchTyreRetreadAsync(req.query)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Tyre Retread data found",
                "data":data.tyreRetreads,
                "count":data.count,
                "pages":data.pages
            });
        }).catch(next)
});


module.exports = router;
