/**
 * Created by manish on 5/7/16.
 */

var router = express.Router();
var ShippingLineService = promise.promisifyAll(commonUtil.getService('shippingLine'));

router.post("/add",
    function(req,res,next){
        ShippingLineService.findShippingLineQueryAsync({name:req.body.name})
            .then(function(shippingLine){
                if (shippingLine && shippingLine[0]) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Shipping line name already exists",
                        "data":shippingLine
                    });
                }else{
                    return next();
                }
            }).catch(next)
    },
    function(req,res,next){
        ShippingLineService.findShippingLineQueryAsync({code:req.body.code})
            .then(function(shippingLine){
                if (shippingLine && shippingLine[0]) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Shipping line code already exists",
                        "data":shippingLine
                    });
                }else{
                    return next();
                }
            }).catch(next)
    },
    function(req,res,next) {
        ShippingLineService.addShippingLineAsync(req.body)
            .then(function(ShippingLine){
                return res.status(200).json({"status":"OK",
                    "message":"Shipping line has been added successfully",
                    "data":ShippingLine});
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    ShippingLineService.searchShippingLineAsync(req.query,false)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Shipping lines found",
                "data":data.shippingLines,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});

router.get("/get/trim",function(req,res,next){
    ShippingLineService.searchShippingLineAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Shipping lines found",
                "data":data.shippingLines});
        }).catch(next)
});

router.put("/update/:shippingLine__id"
    ,function(req,res,next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({"status": "ERROR", "message": "No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({"status": "ERROR", "message": "No id provided for updating Shipping line"});
        }
        ShippingLineService.findShippingLineIdAsync(req.params.shippingLine__id)
            .then(function (shippingLine) {
                if (shippingLine && shippingLine[0]){
                    return next();
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Shipping line data could not be found",
                        "data": shippingLine
                    });
                }
            }).catch(next)
    },
    function(req,res,next){
        ShippingLineService.findShippingLineQueryAsync({name:req.body.name})
            .then(function(shippingLine){
                if (shippingLine && shippingLine[0]) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Shipping line name already exists",
                        "data":shippingLine
                    });
                }else{
                    return next();
                }
            }).catch(next)
    },
    function(req,res,next){
        ShippingLineService.findShippingLineQueryAsync({code:req.body.code})
            .then(function(shippingLine){
                if (shippingLine && shippingLine[0]) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Shipping line code already exists",
                        "data":shippingLine
                    });
                }else{
                    return next();
                }
            }).catch(next)
    },
    function(req,res,next) {
        ShippingLineService.updateShippingLineIdAsync(req.params.shippingLine__id, req.body)
            .then(function (updated) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Shipping line data has been updated successfully",
                    "data": updated
                });
            }).catch(next)
    }
);

router.delete("/delete/:shippingLine__id",
    function(req,res,next) {
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({
                "status": "ERROR",
                "message": "No id provided to delete for Shipping line"
            });
        }
        ShippingLineService.findShippingLineIdAsync(req.params.shippingLine__id)
            .then(function (shippingLine) {
                if (shippingLine && shippingLine[0]){
                    return next();
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Shipping line data could not be found",
                        "data": shippingLine
                    });
                }
            }).catch(next);
    },
    function(req,res,next) {
        ShippingLineService.deleteShippingLineIdAsync(req.params.shippingLine__id)
            .then(function (deleted) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Shipping line data has been deleted successfully",
                    "data": deleted
                });
            }).catch(next)
    }
);


module.exports = router;
