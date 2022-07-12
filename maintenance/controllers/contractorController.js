/**
 * Created by Nipun on 5/25/2017.
 */

var router = express.Router();
var contractorService = promise.promisifyAll(commonUtil.getMaintenanceService('contractor'));

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
        contractorService.addContractorAsync(req.body)
            .then(function(added){
                if(added){
                    return res.status(200).json({"status":"OK",
                        "message":"Contractor has been added successfully",
                        "data":added});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to add contractor."});
                }
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    contractorService.getContractorAsync(req.query)
        .then(function(data){
            if(data){
                return res.status(200).json({"status":"OK",
                    "message":"Contractor found.",
                    "data":data.data,
                    "pages":data.no_of_pages});
            }else{
                return res.status(200).json({"status":"OK",
                    "message":"No contractor found.",
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
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating contractor."});
        }
        contractorService.findContractorAsync({_id:req.params._id})
            .then(function(available){
                if (available) {
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "The contractor does not exists.",
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        contractorService.updateContractorByIdAsync(req.params._id,req.body)
            .then(function(updated){
                if(updated){
                    return res.status(200).json({"status":"OK",
                        "message":"Contractor has been updated successfully",
                        "data":updated});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"unable to update contractor."});
                }
            }).catch(next)
    }
);

router.delete("/delete/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for deleting contractor."});
        }
        contractorService.findContractorAsync({_id:req.params._id})
            .then(function(available){
                if (available) {
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "The contractor does not exists.",
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        contractorService.deleteContractorByIdAsync(req.params._id)
            .then(function(deleted){
                if(deleted){
                    return res.status(200).json({"status":"OK",
                        "message":"Contractor has been deleted successfully"});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"unable to deleted contractor."});
                }
            }).catch(next)
    }
);

module.exports = router;