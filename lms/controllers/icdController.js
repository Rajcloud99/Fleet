/**
 * Created by manish on 31/8/16.
 */
/**
 * Created by manish on 9/8/16.
 */

var router = express.Router();
var ICDService = promise.promisifyAll(commonUtil.getService('icd'));

router.post("/add",
    function(req,res,next){
        if(otherUtil.validateSuperAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }
        ICDService.addICDAsync(req.body)
            .then(function(icd){
                return res.status(200).json({"status":"OK",
                    "message":"ICD data has been added successfully",
                    "data":icd});
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    ICDService.searchICDAsync(req.query,false,req.query.config)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"ICDs found",
                "data":data.icds,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});

router.put("/update/:_id",function(req,res,next){
    if(otherUtil.validateSuperAdmin(req,res)){
        return res.status(500).json({
            "status": "ERROR",
            "error_message": "Access Denied!!"
        });
    }
    if (otherUtil.isEmptyObject(req.body)){
        return res.status(500).json({"status":"ERROR","message":"No update body found"});
    }
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided for updating icd"});
    }
    ICDService.updateICDIdAsync(req.params._id,req.body)
        .then(function(updated){
            return res.status(200).json({"status":"OK",
                "message":"ICD data has been updated successfully",
                "data":updated});
        }).catch(next)
});

router.delete("/delete/:_id",function(req,res,next){
    if(otherUtil.validateSuperAdmin(req,res)){
        return res.status(500).json({
            "status": "ERROR",
            "error_message": "Access Denied!!"
        });
    }
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for icd"});
    }
    ICDService.deleteICDIdAsync(req.params._id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"ICD has been deleted successfully",
                "data":deleted});
        }).catch(next)
});

module.exports = router;
