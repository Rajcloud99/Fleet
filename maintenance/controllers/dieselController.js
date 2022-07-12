/**
 * Created by Nipun on 7/11/2017.
 */

var router = express.Router();
var dieselService = promise.promisifyAll(commonUtil.getMaintenanceService('diesel'));

router.post("/add",
    /**validate **/
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        return next();
    },
    function(req,res,next){
        dieselService.addDieselAsync(req.body)
            .then(function(added){
                if(added){
                    return res.status(200).json({"status":"OK",
                        "message":"Diesel has been issued successfully",
                        "data":added});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to issue diesel."});
                }
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    dieselService.getDieselAsync(req.query)
        .then(function(data){
            data.message="Diesel found";
            data.status="OK";
            return res.status(200).json(data);
        }).catch(next)

});

module.exports = router;