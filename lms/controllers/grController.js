
 /**
 * Created by Ajay on 3/10/16.
 */

var router = express.Router();
var GRService = promise.promisifyAll(commonUtil.getService('gr'));

/***********add GR*******/
router.post("/add",
    function(req,res,next){
        GRService.addGRAsync(req.body)
            .then(function(gr){
                return res.status(200).json({"status":"OK",
                    "message":"GR data has been added successfully",
                    "data":gr});
            }).catch(next)
    }
);

/***********get GR*******/
/*router.get("/get",function(req,res,next){
    GRService.searchGRAsync(req.query)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"GRs found",
                "data":data});
        }).catch(next)
});
*/
/***********get GR Availability*******/
router.get("/get",function(req,res,next){
    GRService.isGRavailableinMasterAsync(req.query)
        .then(function(available){
            if(available){
               return res.status(200).json({"status":"OK",
                "isAvailable":true,
                "message":"GR is available",
                "data":available.data, "no_of_pages":available.no_of_pages}); 
            }else{
                return res.status(200).json({"status":"OK","isAvailable":false,
                "message":"GR is not available"});
            }
        }).catch(next)
    }
);

/***********update GR*******/
router.put("/update/:_id",
    function(req,res,next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({"status": "ERROR", "error_message": "Nothing in body for gr update"});
        }
        GRService.findGrIdAsync({_id:req.params._id})
            .then(function (gr) {
                if (gr && gr[0]) {
                    return next();
                } else {
                    return res.status(500).json({"status": "ERROR", "error_message": "Gr does not exist"});
                }
            });
    },
    function(req,res,next){
        GRService.updateGrIdAsync(req.params._id,req.body)
            .then(function(updated){
                return res.status(200).json({"status":"OK",
                    "message":"GR data has been updated successfully",
                    "data":updated});
            }).catch(next)
    }
);


/***********centralized gr*******/
router.get("/generate_gr",
    function(req,res,next){
        GRService.generateGRAsync(req.query)
            .then(function(gr){
                if(gr){
                  return res.status(200).json({"status":"OK",
                    "message":"GR has generated been successfully",
                    "data":gr});  
              }else{
                return res.status(200).json({"status":"OK",
                    "message":"GR generation faild due. User does not have active gr book.",
                    "data":null});  
              }
                
            }).catch(next)
    }
);

module.exports = router;
