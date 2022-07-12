/**
 * Created by manish on 21/12/16.
 */

var router = express.Router();
var ManufacturerService = promise.promisifyAll(commonUtil.getMaintenanceService('manufacturer'));

router.post("/add",
    /**validate existing name/code **/
    function(req,res,next){
        ManufacturerService.findManufacturerByQueryAsync({name:req.body.name})
            .then(function (manufacturers) {
                if (manufacturers && manufacturers.length>0) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Manufacturer name already exists"
                    });
                }else{
                    return next();
                }
            }).catch(next);
    },
    function(req,res,next) {
        ManufacturerService.addManufacturerAsync(req.body)
            .then(function (manufacturer) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Manufacturer data has been added successfully",
                    "data": manufacturer
                });
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    ManufacturerService.searchManufacturerAsync(req.query)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Manufacturers found",
                "data":data.manufacturers,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});

router.put("/update/:_id",function(req,res,next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({"status": "ERROR", "message": "No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({"status": "ERROR", "message": "No id provided for updating manufacturer"});
        }
        /**validate existing name/code **/
        ManufacturerService.findManufacturerByQueryAsync({
            $and: [{name: req.body.name},
                {_id: {$ne: mongoose.Types.ObjectId(req.params._id)}}]
        })
            .then(function (manufacturers) {
                if (manufacturers && manufacturers.length == 1) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Manufacturer name already exists",
                        "data": manufacturers
                    });
                } else {
                    return next();
                }
            }).catch(next);
    }
    ,function(req,res,next){
        ManufacturerService.updateManufacturerByIdAsync(req.params._id,req.body)
            .then(function(updated){
                return res.status(200).json({"status":"OK",
                    "message":"Manufacturer data has been updated successfully",
                    "data":updated});
            }).catch(next)
});

router.delete("/delete/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for manufacturer"});
    }
    ManufacturerService.deleteManufacturerByIdAsync(req.params._id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"Manufacturer has been deleted successfully",
                "data":deleted});
        }).catch(next)
});

module.exports = router;
