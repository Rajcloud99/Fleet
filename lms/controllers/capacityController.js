/**
 * Created by manish on 5/7/16.
 */

var router = express.Router();
var Capacity = promise.promisifyAll(commonUtil.getService('capacity'));

router.post("/add",
    function(req,res,next){
        Capacity.findCapacityQueryAsync({route_name:req.body.route_name,contractId:req.body.contractId})
            .then(function(capacity){
                if (capacity && capacity[0]) {
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "Capacity for this route and contract already exists",
                        "data":capacity
                    });
                }else{
                    return next();
                }
            }).catch(next)
    },
    function(req,res,next) {
        Capacity.addCapacityAsync(req.body)
            .then(function(Capacity){
                return res.status(200).json({"status":"OK",
                    "message":"Capacity  has been added successfully",
                    "data":Capacity});
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    Capacity.searchCapacityAsync(req.query,false)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Capacities found",
                "data":data.capacitys,
                "pages":data.pages,
                "count":data.count
            });
        }).catch(next)
});

router.get("/get/trim",function(req,res,next){
    Capacity.searchCapacityAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Capacities found",
                "data":data.capacitys
            });
        }).catch(next)
});

router.put("/update/:capacity__id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.body)){
        return res.status(500).json({"status":"ERROR","message":"No update body found"});
    }
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided for updating Capacity"});
    }
    Capacity.updateCapacityIdAsync(req.params.capacity__id,req.body)
        .then(function(updated){
            return res.status(200).json({"status":"OK",
                "message":"Capacity data has been updated successfully",
                "data":updated});
        }).catch(next)
});

router.delete("/delete/:capacity__id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for Capacity"});
    }
    Capacity.deleteCapacityIdAsync(req.params.capacity__id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"Capacity has been deleted successfully",
                "data":deleted});
        }).catch(next)
});


module.exports = router;
