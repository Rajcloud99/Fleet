/**
 * Created by nipun on 21/1/16
 */

var router = express.Router();
var structureMasterService = promise.promisifyAll(commonUtil.getMaintenanceService('structureMaster'));

router.post("/add",
    function(req,res,next) {
        structureMasterService.addstructureMasterAsync(req.body)
                .then(function (structureMaster) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "structureMaster data has been added successfully",
                        "data": structureMaster
                    });
                }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    structureMasterService.getstructureMastersAsync(req.query)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"structureMasters found",
                "data":data.data,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});


router.delete("/delete/:_id",function(req,res,next){
	return res.status(500).json({"status":"ERROR",
		"message":"Please contact service provider!!"});
    /*if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for structureMaster"});
    }
    structureMasterService.deletestructureMasterByIdAsync(req.params._id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"structureMaster has been deleted successfully",
                "data":deleted});
        }).catch(next)*/
});

module.exports = router;
