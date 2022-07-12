/**
 * Created by manish on 6/1/17.
 */
/**
 * Created by manish on 22/12/16.
 */

var router = require('express').Router();
var UserPrefService = promise.promisifyAll(commonUtil.getService("userPref"));

/***********add/update new userPref. Removes all earlier prefs*******/
router.post("/add",
    function(req,res,next){
        req.body.employeeId = req.user.userId;
        UserPrefService.addUserPrefAsync(req.body)
            .then(function (userPref) {
                if (userPref) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "User Preferences added successfully",
                        "data":userPref
                    });
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": "Some error occurred in userPref add"
                    });
                }
            }).catch(next);
    }
);

/***********get + search*******/
router.get("/get",function(req,res,next){
    UserPrefService.searchUserPrefAsync(req.query)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"UserPrefs found",
                "data":data.userPrefs,
                "pages":data.pages,
                "count":data.count});
        }).catch(next);
});

/***********update userPref*******/
router.put("/update/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({"status": "ERROR", "error_message": "No id supplied for update operation"});
        }
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({"status": "ERROR", "error_message": "No update body found"});
        }
        UserPrefService.findUserPrefByIdAsync(req.params._id)
            .then(function (userPref) {
                if (userPref) {
                    return next();
                }else{
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "User preference does not exist"
                    });
                }
            }).catch(next);
    },
    function (req,res,next){
        UserPrefService.updateUserPrefByIdAsync(req.params._id,req.body)
            .then(function (userPref) {
                return res.status(200).json({"status":"OK",
                    "message":"User Preference updated successfully",
                    "data":userPref});
            })
            .catch(next)
    }
);

/***********delete userPref*******/
router.delete("/delete/:id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({"status": "ERROR", "error_message": "No id supplied for delete operation"});
        }
        UserPrefService.deleteUserPrefByIdAsync(req.params.id)
            .then(function(deleted){
                return res.status(200).json({"status":"OK",
                    "message":"UserPref deleted successfully",
                    "data":(deleted)});
            })
            .catch(next);
    }
);

module.exports = router;