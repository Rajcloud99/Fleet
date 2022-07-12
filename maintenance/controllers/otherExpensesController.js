var router = express.Router();
var oeService = promise.promisifyAll(commonUtil.getMaintenanceService('otherExpenses'));
var async = require('async');

router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        return next();
    },
    function(req,res,next) {
		req.body.created_by_id = req.user.userId;
		req.body.created_by_name = req.user.full_name;

		console.log('oec', JSON.stringify(req.body));
		oeService.addOEAsync(req.body)
		.then(function(data) {
			return res.status(200).json({
				"status":"OK",
				"data":data,
				"message":"Successfully added."
			});
		})
		.error(function() {
			return res.status(500).json({
				"status":"ERROR",
				"message":"Add error"
			});
		});

    }
);

router.get("/get",function(req,res,next){
    oeService.searchOEAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"data found.",
            "data":data.oe,
            "pages":data.pages,
            "count":data.count
        });
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No data found.",
            "data":[],
            "pages":data.pages});
       }
    }).catch(next)
});

router.put("/update/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating."});
        }
        oeService.findOEAsync({_id:req.params._id})
        .then(function(available){
            if (available) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "does not exist.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        oeService.updateOEByIdAsync(req.params._id,req.body)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"data has been updated successfully",
                "data":updated});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to update data."});
            }
        }).catch(next)
    }
);

router.put("/approve/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating."});
        }
        oeService.findOEAsync({_id:req.params._id})
        .then(function(available){
            if (available) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "does not exist.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
		var appr = {};
		appr.approved_by_id = req.user.userId;
		appr.approved_by_name = req.user.full_name;
        oeService.updateOEByIdAsync(req.params._id,appr)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"data has been updated successfully",
                "data":updated});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to update data."});
            }
        }).catch(next)
    }
);

module.exports = router;
