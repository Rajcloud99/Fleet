/**
 * Created by pratik on 22/12/16.
 */

var router = express.Router();
var partsService = promise.promisifyAll(commonUtil.getMaintenanceService('parts'));

/**************Parts vendor *********/
router.post("/add",
    /**validate **/
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        return next();
    },
    /**save**/
    function(req,res,next) {
        partsService.addPartAsync(req.body)
        .then(function(added){
            if(added){
              return res.status(200).json({"status":"OK",
                "message":"Part has been added successfully",
                "data":added});  
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"Unable to add part."});  
            }
        }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    partsService.getPartsAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"Parts found.",
            "data":data.data,
            "pages":data.no_of_pages}); 
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No parts found.",
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
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating part."});
        }
        partsService.findPartAsync({_id:req.params._id})
            .then(function(available){
                if (available) {
                     return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "This part does not exists.",
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        partsService.updatePartByIdAsync(req.params._id,req.body)
            .then(function(updated){
                if(updated){
                    return res.status(200).json({"status":"OK",
                    "message":"part data has been updated successfully",
                    "data":updated});
                }else{
                    return res.status(500).json({"status":"ERROR",
                    "message":"unable to update part data."});
                }
            }).catch(next)
    }
);

router.delete("/delete/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the part."});
        }
        partsService.findPartAsync({_id:req.params._id})
        .then(function(available){
            if (available) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This part does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        partsService.deletePartByIdAsync(req.params._id)
        .then(function(deleted){
            if(deleted){
                return res.status(200).json({"status":"OK",
                "message":"Part has been deleted successfully",
                "data":deleted});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to delete part."});
            }
        }).catch(next)
    }
);

module.exports = router;
