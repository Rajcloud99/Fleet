/**
 * Created by Nipun on 27/12/16.
 */

var router = express.Router();
var ModelService = promise.promisifyAll(commonUtil.getMaintenanceService('model'));
var models = ['Ashok Leyland', 'Tata Motors', 'Bharat Benz',
    'Eicher Motors', 'Force Motors', 'Mahindra Navistar',
    'Swaraj Mazda', 'Premier Automobiles', 'Hindustan Motors',
    'Tata Daewoo', 'Asia motor works'];


/**************Parts vendor *********/
router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        return next();
    },
    function(req,res,next) {
        if(otherUtil.validateSuperAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }
        ModelService.addModelAsync(req.body)
        .then(function(added){
            if(added){
              return res.status(200).json({"status":"OK",
                "message":"Model has been added successfully",
                "data":added});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"Unable to add model."});
            }
        }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    ModelService.getModelAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"Model found.",
            "data":data.data,
            "pages":data.no_of_pages});
       }else{
            return res.status(200).json({"status":"OK",
            "message":"No model found.",
            "data":[]});
       }
    }).catch(next)
});

var models = ['Ashok Leyland', 'Tata Motors', 'Bharat Benz', 'Eicher Motors',
    'Force Motors', 'Mahindra Navistar', 'Swaraj Mazda', 'Premier Automobiles', 'Hindustan Motors',
    'Tata Daewoo', 'Asia motor works'];

router.get("/manufacturers/get",function(req,res,next){
    return res.status(200).json({
        "status":"OK",
        "message":"Vehicle manufacturers",
        "data":models
    });

});
function formAssociationMatrixToReturn(modelDataArr){
    var associationMatrix = {};
    for (var i=0;i<modelDataArr.length;i++){
        if (!associationMatrix[modelDataArr[i].manufacturer]){
            associationMatrix[modelDataArr[i].manufacturer] = [];
        }
        associationMatrix[modelDataArr[i].manufacturer].push(modelDataArr[i]);
    }
    return associationMatrix;
}

router.get("/matrix/get",function(req,res,next){
    req.query.all= 'true';
    ModelService.getModelAsync(req.query)
        .then(function(data){
            if(data){
                var toReturn =formAssociationMatrixToReturn(data.data);
                return res.status(200).json({"status":"OK",
                    "message":"Model matrix ",
                    "data":toReturn});
            }else{
                return res.status(200).json({"status":"OK",
                    "message":"No model found.",
                    "data":[]});
            }
        }).catch(next)
});

router.put("/update/:_id",
    function(req,res,next){
        if(otherUtil.validateSuperAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating model."});
        }
        ModelService.findModelAsync({_id:req.params._id})
        .then(function(available){
            if (available) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This model does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        ModelService.updateModelByIdAsync(req.params._id,req.body)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"part data has been updated successfully",
                "data":updated});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to update part data."});
            }
        }).catch(next)
    }
);

router.delete("/delete/:_id",
    function(req,res,next){
        if(otherUtil.validateSuperAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided to delete the part."});
        }
        ModelService.findModelAsync({_id:req.params._id})
        .then(function(available){
            if (available) {
                return next();
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This model does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        ModelService.deleteModelByIdAsync(req.params._id)
        .then(function(deleted){
            if(deleted){
                return res.status(200).json({"status":"OK",
                "message":"Model has been deleted successfully",
                "data":deleted});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to delete Model."});
            }
        }).catch(next)
    }
);


module.exports = router;
