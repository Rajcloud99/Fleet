/**
 * Created by pratik on 10/04/17.
 */

var router = express.Router();
var toolService = promise.promisifyAll(commonUtil.getMaintenanceService('tool'));
var poService = promise.promisifyAll(commonUtil.getMaintenanceService('po'));

var async = require('async');

router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        req.body.branchName=req.body.branchName || "ICD Loni";
        req.body.branchId=req.body.branchId || "loni";
        if(!req.body.category)
            return res.status(500).json({"status":"ERROR","message":"Specify category as new or old"});
        if(req.body.category=="new"){
            if(!req.body.po_number) return res.status(500).json({"status":"ERROR","message":"po_number is mandatory"});
            if(!req.body.invoice_number) return res.status(500).json({"status":"ERROR","message":"invoice_number is mandatory"});
            if(!req.body.vendorId || !req.body.vendor_name) return res.status(500).json({"status":"ERROR","message":"Vendor detail missing"});
			poService.findpoAsync({clientId:req.body.clientId,_id:req.body.po_id})
				.then(function(available){
					if (available  && (available.length>0)) {
						req.po_data = JSON.parse(JSON.stringify(available[0]));
						return next();
					}else{
						return res.status(200).json({
							"status": "ERROR",
							"message": "This po does not exists."
						});
					}
				}).catch(next)
        }
        else{
			return next();
		}

    },
    function(req,res,next){
        /*var mainBody={};
        mainBody.branchName=req.body.branchName;
        mainBody.branchName=req.body.branchName;
        mainBody.branchId=req.body.branchId;
        mainBody.category=req.body.category;
        mainBody.po_number=req.body.po_number || "NA";
        mainBody.invoice_number=req.body.invoice_number || "NA";
        mainBody.vendorId=req.body.vendorId || "NA";
        mainBody.vendor_name=req.body.vendor_name || "NA";*/
        var responseData=[];
        async.forEachOf(req.body.data,function (tool,key,mainCallback) {
            if(!tool.quantity) return res.status(500).json({"status":"ERROR","message":"Specify quantity"});
            /*if(!tool.codes || tool.codes.length<tool.quantity)
                return res.status(500).json({"status":"ERROR","message":"Please provide "+tool.quantity+" codes"});*/
            idUtil.generateToolIdAsync({clientId:req.body.clientId})
                .then(function (toolId){
                    req.body.id=toolId;
                    ///if toolcode not provided set NA as code
                    for(var i=0; i<tool.quantity; i++){
                    	tool.codes[i]=tool.codes[i]||"NA";
					}
                    async.forEachOf(tool.codes,function (code,index,innerCallback) {
                        var dataToSave=req.body;
                        dataToSave.spare_code=tool.spare_code;
                        dataToSave.spare_name=tool.spare_name;
                        dataToSave.tax=tool.tax;
                        dataToSave.rate=tool.rate_per_piece;
                        dataToSave.rate_inc_tax=tool.rate_inc_tax;
						dataToSave.current_price=tool.rate_inc_tax || tool.rate_per_piece || 0;
                        dataToSave.code=code;
                        dataToSave.purchase_category=dataToSave.category;
                        dataToSave.status="InStock";
                        dataToSave.toolId="TOOL"+(req.body.id++);
                        dataToSave.created_by_employee_name=req.user.full_name;
						dataToSave.created_by_employee_code=req.user.userId;
                        toolService.addToolAsync(dataToSave)
                            .then(function (savedData) {
                                if(savedData)
                                    responseData.push(savedData);
                                innerCallback();
                            })
                    },function (err) {
                        mainCallback();
                    });
                }).catch(next);
        },function (err) {
            if(err)
                return res.status(500).json({"status":"ERROR",
                    "message":"Unable to add tool."
                });
            if(responseData.length<1)
                return res.status(500).json({"status":"ERROR","message":"No tool added"});
            if(req.body && req.po_data && req.po_data.spare && (req.po_data.spare.length>0) && req.body.data && (req.body.data.length>0)){
                var po_update = {};
                var completeInwarded=true;
                for (var i = 0; i < req.po_data.spare.length; i++) {
                    for (var j = 0; j < req.body.data.length; j++) {
                        if(req.po_data.spare[i]._id == req.body.data[j].spare_id){
                            req.po_data.spare[i].remaining_quantity = req.po_data.spare[i].remaining_quantity - req.body.data[j].quantity;
                            if(completeInwarded && req.po_data.spare[i].remaining_quantity !=0){
                                completeInwarded=false;
                            }else if(j==req.body.data.length-1){
								if(completeInwarded && req.po_data.spare[i].remaining_quantity !=0){
									completeInwarded=false;
								}
							}
                        }
                    }
                }
                if (req.body.to_inward===true || completeInwarded) {
                	if(!req.po_data.haveTyre && !req.po_data.haveSpare){
						po_update.status = constant.poStatus[3];
					}
					else{
						po_update.status = constant.poStatus[4];
					}
                    po_update.haveTool = false;
                }else{
                    po_update.status = constant.poStatus[4];
                }
                po_update.spare = req.po_data.spare;
				po_update.rFreight = req.po_data.rFreight?req.po_data.rFreight:req.po_data.freight;
				po_update.rFreight -= req.body.freight;
                poService.findandUpdatePOByIdAsync(req.po_data._id,po_update)
                    .then(function(updated){
                        if(updated){
                            return res.status(200).json({"status":"OK",
                                "message":"Tool has been added successfully",
                                "data":responseData
                            });
                        }else{
                            return res.status(500).json({"status":"ERROR",
                                "message":"unable to update PO data."});
                        }
                    }).catch(next)
            }else{
                return res.status(200).json({"status":"OK",
                    "message":"Tool has been added successfully",
					"data":responseData
				});
            }
        })

    }
    );

router.get("/get",function(req,res,next){
    req.query.branchId=req.query.branchId || "loni";
    toolService.searchToolAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"Tool found.",
            "data":data.inventories,
            "pages":data.pages});
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No tool found.",
            "data":[],
                "pages":data.pages});
       }
    }).catch(next)
});

router.get("/getQty",function(req,res,next){
    req.query.branchId=req.query.branchId || "loni";
    toolService.getQuantityAsync(req.query)
        .then(function(data){
            if(data && data[0]){
                return res.status(200).json({"status":"OK",
                    "message":"Spare Quantity Found",
                    "data":data[0]});
            }else{
                return res.status(200).json({"status":"OK",
                    "message":"Selected spare is not available in inventory",
                    "data":[],
                    "pages":data.pages});
            }
        }).catch(next)
});

router.put("/update/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating tool."});
        }
        toolService.findToolAsync({_id:req.params._id})
        .then(function(available){
            if (available) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This tool does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        req.body.branchId=req.body.branchId || "loni";
        toolService.updateToolByIdAsync(req.params._id,req.body)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"Tool data has been updated successfully",
                "data":updated});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to update tool data."});
            }
        }).catch(next)
    }
);

router.delete("/delete/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the tool."});
        }
        toolService.findToolAsync({_id:req.params._id})
        .then(function(available){
            if (available) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This tool does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        if(!req.query.reason || req.query.reason==null || req.query.reason=="") return res.status(500).json({"status":"ERROR",
            "message":"Please provide the reason to delete"});
        var data={};
        data._id=req.params._id;
        data.reason=req.query.reason;
        data.userId=req.user.userId;
        data.name=req.user.full_name;
        toolService.deleteToolByIdAsync(data)
        .then(function(deleted){
            if(deleted){
                return res.status(200).json({"status":"OK",
                "message":"Tool has been deleted successfully",
                "data":deleted});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to delete tool."});
            }
        }).catch(next)
    }
);

module.exports = router;
