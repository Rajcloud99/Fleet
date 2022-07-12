/**
 * Created by manish on 30/12/16.
 */

var router = express.Router();
var SpareUseService = promise.promisifyAll(commonUtil.getMaintenanceService('spareUse'));
var Inventory = promise.promisifyAll(commonUtil.getMaintenanceModel("inventory"));

router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        return next();
    },
    /**validate if inventory has spare quantity requested **/
    function(req,res,next){
        Inventory.aggregateAsync([{$match : {"spare_code" : req.body.code}}
            ,{ $group : { _id : "$spare_code", "remaining":{$sum : "$remaining_quantity"} }}])
            .then(function(data){
                if (data[0].remaining>=req.body.quantity){
                    return next();
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "error_message":"Requested quantity for this spare is not available in inventory : ERROR 2",
                    });
                }
            })
    },
    /**Make spareUse entry and deduct inventory **/
    function(req,res,next) {
        var quantityNeeded = req.body.quantity;
        var cursor = Inventory.find({clientId:req.body.clientId,
            spare_code:req.body.spare_code,homId:req.body.homId}).sort({$natural:1}).limit(100);
        var dataToReturn = [];
        cursor.exec(function(err,inventoryDocs){
            if (err) return next(err);
            if (inventoryDocs.length>0){
                var quantityAvailable = 0;
                var inventoryDocsNeeded = [];
                for (var i=0;i<inventoryDocs.length;i++){
                    if (inventoryDocs[i].remaining_quantity >0){
                        quantityAvailable+=inventoryDocs[i].remaining_quantity;
                        inventoryDocsNeeded.push(inventoryDocs[i]);
                        if (quantityAvailable>=quantityNeeded){
                            break;
                        }
                    }
                }
                async.forEachOf(inventoryDocsNeeded,function(inventoryDoc,indexInner,callbackInner){
                    var spareUseAddbody ={};
                    spareUseAddbody.clientId = req.body.clientId;
                    spareUseAddbody.taskId = req.body.taskId;
                    spareUseAddbody.spare_code = req.body.spare_code;
                    spareUseAddbody.spare_name = req.body.spare_name;
                    spareUseAddbody.inventoryEntryId = inventoryDoc.entryId;
                    spareUseAddbody.cost_per_piece = inventoryDoc.rate_per_piece;
                    var quantityAvailable = inventoryDoc.remaining_quantity;
                    if (quantityAvailable<=quantityNeeded){
                        inventoryDoc.remaining_quantity = 0;
                        spareUseAddbody.quantity = quantityAvailable;
                        quantityNeeded -= quantityAvailable;
                    }else if (quantityAvailable>quantityNeeded && quantityNeeded>0){
                        spareUseAddbody.quantity = quantityNeeded;
                        inventoryDoc.remaining_quantity = quantityAvailable-quantityNeeded;
                        quantityNeeded=0;
                    }
                    SpareUseService.addSpareUseAsync(spareUseAddbody)
                        .then(function(addedSpareUse){
                            if (addedSpareUse) {
                                dataToReturn[indexInner]=addedSpareUse;
                                Inventory.findByIdAndUpdateAsync(inventoryDoc._id,
                                    {$set:{remaining_quantity: inventoryDoc.remaining_quantity}})
                                    .then(function (modified) {
                                        if (modified) {
                                            callbackInner();
                                        } else {
                                            callbackInner("Error in inventory mod : ERROR 1");
                                        }
                                    }).catch(callbackInner)
                            }else{
                                callbackInner("Error in spare use add: ERROR 2");
                            }
                        }).catch(next)
                },function(err) {
                    if(err) {return res.status(500).json({"status":"ERROR",
                        "error_message":err.toString()})}
                    else {
                        return res.status(200).json({"status":"OK",
                            "message":"Spare Usage has been added successfully",
                            "data":dataToReturn})
                    }
                })
            }else{
                return res.status(500).json({"status":"ERROR",
                    "error_message":"No inventory found for the requested spare",
                    });
            }
        }).catch(next);
    }
);

router.get("/get",function(req,res,next){
    SpareUseService.searchSpareUseAsync(req.query)
        .then(function(data){
            if(data){
                return res.status(200).json({"status":"OK",
                    "message":"SpareUse found.",
                    "data":data});
            }else{
                return res.status(200).json({"status":"OK",
                    "error_message":"No SpareUse found.",
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
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating SpareUse."});
        }
        SpareUseService.findSpareUseByQueryAsync({_id:req.params._id})
            .then(function(available){
                if (available) {
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This spareUse does not exists."
                    });
                }
            }).catch(next)
    },
    /**Query for associated INV Id if change in spare count can be adjusted, else throw error **/
    function(req,res,next){

    },
    function(req,res,next) {
        SpareUseService.updateSpareUseByIdAsync(req.params._id,req.body)
            .then(function(updated){
                if(updated){
                    return res.status(200).json({"status":"OK",
                        "message":"SpareUse data has been updated successfully",
                        "data":updated});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to update spareUse data."});
                }
            }).catch(next)
    }
);

router.delete("/delete/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the part."});
        }
        SpareUseService.findSpareUseByQueryAsync({_id:req.params._id})
            .then(function(available){
                if (available) {
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This spareUse does not exists."
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        SpareUseService.deleteSpareUseByIdAsync(req.params._id)
            .then(function(deleted){
                if(deleted){
                    return res.status(200).json({"status":"OK",
                        "message":"SpareUse has been deleted successfully",
                        "data":deleted});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to delete SpareUse."});
                }
            }).catch(next)
    }
);

module.exports = router;
