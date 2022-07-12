var router = require('express').Router();
var TripLocations = promise.promisifyAll(commonUtil.getService("tripLocations"));

router.post("/add",function(req,res,next){
	if (otherUtil.isEmptyObject(req.body)) {
        return res.status(500).json({"status": "ERROR", "error_message": "Nothing in body"});
    }
    TripLocations.addTripAsync(req.body)
    .then(function(data){
        return res.status(200).json({"status":"OK",
            "message":"Trip location added.",
            "data":data
        });
    }).catch(next)
});
router.get("/get",function(req,res,next){
    TripLocations.getTripsAsync(req.query)
    .then(function(trips){
        if(trips && trips.data){
            return res.status(200).json({"status":"OK",
            "message":"Trip location found.",
            "data":trips.data,
            "no_of_pages":trips.no_of_pages});
        }else{
            return res.status(200).json({"status":"OK",
            "message":"No Trip location found."});
        }
    }).catch(next)
});

router.put("/update/:_id",
    function(req,res,next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({"status": "ERROR", "error_message": "Nothing in body to update"});
        }
        TripLocations.findTripByIdAsync({_id:req.params._id})
        .then(function (trip) {
            if (trip) {
                return next();
            }else {
                return res.status(500).json({"status": "ERROR", "error_message": "Trip location does not exist"});
            }
        });
    },
    function(req,res,next){
        TripLocations.updateTripLocationByIdAsync(req.params._id,req.body)
        .then(function(updated){
            return res.status(200).json({"status":"OK",
                "message":"Trip location data has been updated successfully.",
                "data":updated});
        }).catch(next)
    }
);

module.exports = router;