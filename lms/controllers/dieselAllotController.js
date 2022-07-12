/**
 * Created by manish on 5/7/16.
 */

var router = express.Router();
var DieselAllotService = promise.promisifyAll(commonUtil.getService('dieselAllot'));

router.post("/add",
    function(req,res,next){
        DieselAllotService.findDieselAllotQueryAsync({route__id:req.body.route__id,contract__id:req.body.contract__id})
            .then(function(dieselallot){
                if (dieselallot && dieselallot[0]) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Diesel allottment for this route and contract already exists",
                        "data":dieselallot
                    });
                }else{
                    return next();
                }
            }).catch(next)
    },
    function(req,res,next) {
        DieselAllotService.addDieselAllotAsync(req.body)
            .then(function(DieselAllot){
                return res.status(200).json({"status":"OK",
                    "message":"Diesel allotment has been added successfully",
                    "data":DieselAllot});
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    DieselAllotService.searchDieselAllotAsync(req.query,false)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Diesel allotments found",
                "data":data.dieselAllots,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});

router.get("/get/trim",function(req,res,next){
    DieselAllotService.searchDieselAllotAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Diesel allotments found",
                "data":data.dieselAllots});
        }).catch(next)
});

router.put("/update/:dieselallot__id"
    ,function(req,res,next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({"status": "ERROR", "message": "No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({"status": "ERROR", "message": "No id provided for updating Diesel allotment"});
        }
        DieselAllotService.findDieselAllotIdAsync(req.params.dieselallot__id)
            .then(function (dieselAllot) {
                if (dieselAllot && dieselAllot[0]){
                    return next();
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Diesel allotment data could not be found",
                        "data": dieselAllot
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        DieselAllotService.updateDieselAllotIdAsync(req.params.dieselallot__id, req.body)
            .then(function (updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Diesel allotment data has been updated successfully",
                    "data": updated
                });
            }).catch(next)
    }
);

router.delete("/delete/:dieselallot__id",
    function(req,res,next) {
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({
                "status": "ERROR",
                "message": "No id provided to delete for Diesel allotment"
            });
        }
        DieselAllotService.findDieselAllotIdAsync(req.params.dieselallot__id)
            .then(function (dieselAllot) {
                if (dieselAllot && dieselAllot[0]){
                    return next();
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Diesel allotment data could not be found",
                        "data": dieselAllot
                    });
                }
            }).catch(next);
    },
    function(req,res,next) {
        DieselAllotService.deleteDieselAllotIdAsync(req.params.dieselallot__id)
            .then(function (deleted) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Diesel allotment data has been deleted successfully",
                    "data": deleted
                });
            }).catch(next)
    }
);


module.exports = router;
