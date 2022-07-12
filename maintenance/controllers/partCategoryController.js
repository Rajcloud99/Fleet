/**
 * Created by manish on 21/12/16.
 */
/**
 * Created by manish on 19/7/16.
 */
var router = require('express').Router();
var path = require('path');
var PartCategoryService = promise.promisifyAll(commonUtil.getMaintenanceService("partCategory"));

/***********add new part category *******/
router.post("/add",
    function(req,res,next){
        PartCategoryService.findPartCategoryByQueryAsync({$and:[{clientId:req.user.clientId},{$or:[{name:req.body.name},{code:req.body.code}]}]})
            .then(function (partCategory) {
                if (partCategory && partCategory.length>0) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": "Part category name/code already exists",
                        "data": partCategory
                    });
                }else{
                    return next();
                }
            }).catch(next);
    },
    function(req,res,next){
        req.body.clientId=req.user.clientId;
        PartCategoryService.addPartCategoryAsync(req.body)
            .then(function (partGroup) {
                return res.status(200).json({
                    "status": "OK",
                    "message": "Part category has been added successfully",
                    "data": partGroup
                });
            }).catch(next);
    }
);

/***********get all part categorys + search*******/
router.get("/get",function(req,res,next){
    PartCategoryService.searchPartCategoryAsync(req.query)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Part categories found",
                "data":data.partCategories,
                "pages":data.pages,
                "count":data.count});
        }).catch(next);
});

/***********update part category*******/
router.put("/update/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({"status": "ERROR", "error_message": "No id supplied for update operation"});
        }
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({"status": "ERROR", "error_message": "No update body found"});
        }
        PartCategoryService.findPartCategoryByQueryAsync({$and:[{$or:[{name:req.body.name}
            ,{code:req.body.code}]},{_id:{$ne:mongoose.Types.ObjectId(req.params._id)}}]})
            .then(function (partCategories) {
                if (partCategories && partCategories.length==1) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "Part category name/code already exists",
                        "data": partCategories
                    });
                }else{
                    return next();
                }
            }).catch(next);
    },
    function(req,res,next){
        PartCategoryService.updatePartCategoryByIdAsync(req.params._id,req.body)
            .then(function (partGroup) {
                return res.status(200).json({"status":"OK",
                    "message":"Part category updated successfully",
                    "data":partGroup});
            })
            .catch(next)
    }
);

/***********delete part category*******/
router.delete("/delete/:id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({"status": "ERROR", "error_message": "No id supplied for delete operation"});
        }
        PartCategoryService.deletePartCategoryByIdAsync(req.params.id)
            .then(function(deleted){
                return res.status(200).json({"status":"OK",
                    "message":"Part category deleted successfully",
                    "data":(deleted)});
            })
            .catch(next);
    }
);

module.exports = router;