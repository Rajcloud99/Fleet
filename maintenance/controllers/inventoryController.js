/**
 * Created by pratik on 27/12/16.
 */

var router = express.Router();
var inventoryService = promise.promisifyAll(commonUtil.getMaintenanceService('inventory'));
var poService = promise.promisifyAll(commonUtil.getMaintenanceService('po'));
var Parts = promise.promisifyAll(commonUtil.getMaintenanceModel('parts'));
var inventorySnapshotService = promise.promisifyAll(commonUtil.getMaintenanceService('inventorySnapshot'));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

var async = require('async');

router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (!req.body.po_id){
            return res.status(500).json({"status":"ERROR","message":"PO id is required."});
        }
        poService.findpoAsync({_id:req.body.po_id})
        .then(function(available){
            if (available  && (available.length>0)) {
                req.po_data = JSON.parse(JSON.stringify(available[0]));
                //return next();
                idUtil.generateInventoryEntryIdAsync({clientId:req.body.clientId})
                    .then(function(entryIdVal){
                        if(entryIdVal){
                           req.body.utilInvEntryValue = parseInt(entryIdVal.slice(3));
                           return next();
                        }else{
                            return res.status(500).json({"status":"ERROR","message":"Inventory EntryId not generated."});
                        }
                    })
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This po does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        var responseData = [];
        async.forEachOf(req.body.data,function (data,key,callback) {
            var dataBody={};
            dataBody=data;
            data.vendor_name=req.body.vendor_name;
            data.vendorId=req.body.vendorId;
            data.vendor_id=req.body.vendor_id;
            data.branchName=req.body.branchName || "ICD Loni";
            data.branchId=req.body.branchId || "loni";
            data.invoice_number=req.body.invoice_number;
            data.freight = req.body.freight;
            data.bill_date=req.body.bill_date;
            data.po_number=req.body.po_number;
            data.clientId=req.user.clientId;
            data.created_by_employee_name=req.user.full_name;
            data.created_by_employee_code=req.body.created_by_employee_code;

            Parts.findAsync({code:data.spare_code})
                .then(function (partData) {
                    if(!partData || !partData[0])
                        return res.status(500).json({"status":"ERROR",
                        "message":"Please register the part in part master"});
                    dataBody.catepgory_name=partData[0].category_name;
                    dataBody.category_code=partData[0].category_code;
                    dataBody.uom=partData[0].uom;
                    dataBody.entryId = "INV" +(req.body.utilInvEntryValue+key);
                    dataBody.bypassEntryID = true;
                    inventoryService.addInventoryAsync(dataBody)
                        .then(function(added){
                            responseData.push(JSON.parse(JSON.stringify(added)));
                            callback();
                        }).catch(next)
                })
        },function (err) {
            if(err){
                return res.status(500).json({"status":"ERROR",
                    "message":"Unable to add inventory."
                });
            }else{
                //PO UPDATE by PO ID
                if(req.body && req.po_data && req.po_data.spare && (req.po_data.spare.length>0) && req.body.data && (req.body.data.length>0)){
                    var po_update = {};
                    var completeInwarded=true;
                    for (var i = 0; i < req.po_data.spare.length; i++) {
                        for (var j = 0; j < req.body.data.length; j++) {
                            if(req.po_data.spare[i]._id == req.body.data[j].spare_id){
                                req.po_data.spare[i].remaining_quantity = req.po_data.spare[i].remaining_quantity - req.body.data[j].quantity;
                                if(completeInwarded && req.po_data.spare[i].remaining_quantity !=0){
                                    completeInwarded=false;
                                }
                            }else if(j==req.body.data.length-1){
								if(completeInwarded && req.po_data.spare[i].remaining_quantity !=0){
									completeInwarded=false;
								}
							}
                        }
                    }
                    if (req.body.to_inward===true || completeInwarded) {
						if(!req.po_data.haveTyre && !req.po_data.haveTool) {
							po_update.status = constant.poStatus[3];
						}
						else{
							po_update.status = constant.poStatus[4];
						}
                        po_update.haveSpare = false;
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
                                "message":"Inventory has been added successfully",
                                "data":responseData
                            });
                        }else{
                            return res.status(500).json({"status":"ERROR",
                            "message":"unable to update PO data."});
                        }
                    }).catch(next)
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"unable to update PO data."
                    });
                }
            }
        })

    }
);

router.get("/get",function(req,res,next){
    // req.query.branchId=req.query.branchId || "loni";
    inventoryService.searchInventoryAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"Inventory found.",
            "data":data.inventories,
            "count":data.count,
            "pages":data.pages});
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No inventory found.",
            "data":[],
                "pages":data.pages});
       }
    }).catch(next)
});

router.get("/getQty",function(req,res,next){
    inventoryService.getQuantityAsync(req.query)
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
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating inventory."});
        }
        inventoryService.findInventoryAsync({_id:req.params._id})
        .then(function(available){
            if (available) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This inventory does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        req.body.branchId=req.body.branchId || "loni";
        inventoryService.updateInventoryByIdAsync(req.params._id,req.body)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"Inventory data has been updated successfully",
                "data":updated});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to update inventory data."});
            }
        }).catch(next)
    }
);

router.get("/getpr",function(req,res,next){
      inventoryService.getPrInventoryAsync(req)
      .then(function(data){
          if(data){
             return res.status(200).json({"status":"OK",
              "message":"Inventory for PR found.",
              "data":data});
         }else{
              return res.status(200).json({"status":"OK",
              "message":"No PR inventory found.",
              "data":[]});
         }
      }).catch(next)
    });

router.delete("/delete/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the inventory."});
        }
        inventoryService.findInventoryAsync({_id:req.params._id})
        .then(function(available){
            if (available) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This inventory does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        inventoryService.deleteInventoryByIdAsync(req.params._id)
        .then(function(deleted){
            if(deleted){
                return res.status(200).json({"status":"OK",
                "message":"Inventory has been deleted successfully",
                "data":deleted});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to delete inventory."});
            }
        }).catch(next)
    }
);

router.get("/snapshot",function (req,res,next) {
	if(!req.query.date){
		return res.status(500).json({"status":"ERROR",
			"message":"Please provide date!!"});
	}
	inventorySnapshotService.getAsync(req.query)
		.then(function (data) {
			if(req.query.download && req.query.download=="true"){
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Snapshot report download available.",
						"url": data.url
					});
				};
				ReportExelService.generateInvSnapshotExcel(data, req.query.clientId, ReportResponse)
			}
			else{
				return res.status(200).json({"status":"OK",
					"message":"Snapshot found",
					"data":data});

			}
		})
		.catch(next);
});

router.get("/snapshot/getDates",function (req,res,next) {
	inventorySnapshotService.getDatesAsync(req.query.clientId)
		.then(function (data) {
			return res.status(200).json({"status":"OK",
				"message":"Snapshot dates found",
				"data":data});
		})
		.catch(next);
});

module.exports = router;
