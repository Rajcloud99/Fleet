/**
 * Created by nipun on 21/1/16
 */

var router = express.Router();
var TrailerMasterService = promise.promisifyAll(commonUtil.getMaintenanceService('trailerMaster'));

router.post("/add",
    function(req,res,next) {
        TrailerMasterService.addTrailerMasterAsync(req.body)
                .then(function (trailerMaster) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "Trailer Master data has been added successfully",
                        "data": trailerMaster
                    });
                }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    TrailerMasterService.searchTrailerMasterAsync(req.query)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Trailer Masters found",
                "data":data.trailerMasters,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});

router.put("/update/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating Trailer Master"});
        }
        /**validate existing name/code **/
        TrailerMasterService.findTrailerMasterByQueryAsync({$and:[{trailer_number:req.body.trailer_number},
            {_id:{$ne:mongoose.Types.ObjectId(req.params._id)}}]})
            .then(function (trailerMasters) {
                if (trailerMasters && trailerMasters.length==1) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "trailerMaster name/code already exists",
                        "data": trailerMasters
                    });
                }else{
                    return next();
                }
            }).catch(next);
    },
    function(req,res,next){
        TrailerMasterService.updateTrailerMasterByIdAsync(req.params._id,req.body)
            .then(function(updated){
                return res.status(200).json({"status":"OK",
                    "message":"Trailer Master data has been updated successfully",
                    "data":updated});
            }).catch(next)
    }
);

router.delete("/delete/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for Trailer Master"});
    }
    TrailerMasterService.deleteTrailerMasterByIdAsync(req.params._id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"Trailer Master has been deleted successfully",
                "data":deleted});
        }).catch(next)
});

module.exports = router;
