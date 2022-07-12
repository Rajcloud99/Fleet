/**
 * Created by Nipun on 30/12/16.
 */

var router = express.Router();
var notificationService = promise.promisifyAll(commonUtil.getService('notification'));

/**************Parts vendor *********/
router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        return next();
    },
    function(req,res,next) {
        notificationService.addnotificationAsync(req.body)
        .then(function(added){
            if(added){
              return res.status(200).json({"status":"OK",
                "message":"notification has been added successfully",
                "data":added});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"Unable to add notification."});
            }
        }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    notificationService.getnotificationAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"notification found.",
            "data":data.data,
            "pages":data.no_of_pages});
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No notification found.",
            "data":[]});
       }
    }).catch(next)
});
module.exports = router;
