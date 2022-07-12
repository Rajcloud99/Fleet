var router = require('express').Router();
var DriverService = promise.promisifyAll(commonUtil.getService("driver"));

/***********add new driver *******/
router.post("/add",
    function(req,res,next){
            DriverService.findDriverQueryAsync({license_no:req.body.license_no})
                .then(function(driver){
                    if (driver && driver[0]){
                        return res.status(500).json({"status":"ERROR",
                            "message":"Driver with this license no already exists",
                            "data":driver});
                    }else{
                        return next();
                    }
                }).catch(next)
    },
    function(req,res,next){
        req.body.clientId = '000000';
        DriverService.addDriverAsync(req.body)
            .then(function(driver){
                return res.status(200).json({"status":"OK",
                    "message":"Driver has been added successfully",
                    "data":driver});
            }).catch(next)
    }
);

module.exports = router;
