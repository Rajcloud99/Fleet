/**
 * Created by Nipun on 30/12/16.
 */

var router = express.Router();
var poService = promise.promisifyAll(commonUtil.getMaintenanceService('po'));

/**************Parts vendor *********/
router.post("/add",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        return next();
    },
    function(req,res,next) {
        req.body.created_by_name=req.user.full_name;
        req.body.created_by_employee_code=req.user.userId;
        req.body.created_by=req.user._id;
        poService.addpoAsync(req.body)
        .then(function(added){
            if(added){
              return res.status(200).json({"status":"OK",
                "message":"po has been added successfully",
                "data":added});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"Unable to add po."});
            }
        }).catch(next)
    }
);

router.get("/new",function(req,res,next){
    req.query.created_by_name=req.user.full_name;
    req.query.created_by_employee_code=req.user.userId;
    req.query.created_by=req.user._id;
    poService.newpoAsync(req.query)
    .then(function(data){
        if(data){
           return res.status(200).json({"status":"OK",
            "message":"New PO created",
            "data":data});
       }else{
            return res.status(200).json({"status":"OK",
            "message":"PO can't be created"});
       }
    }).catch(next)
});

router.get("/get",function(req,res,next){
    if(req.query.no_of_docs){
        poService.getpoAsync(req.query)
            .then(function(data){
                if(data){
                    return res.status(200).json({"status":"OK",
                        "message":"po found.",
                        "data":data.data,
                        "pages":data.no_of_pages});
                }else{
                    return res.status(200).json({"status":"OK",
                        "message":"No po found.",
                        "data":[]});
                }
            }).catch(next)
    }else {
        poService.getallpoAsync(req.query)
            .then(function(data){
                if(data){
                    return res.status(200).json({"status":"OK",
                        "message":"po found.",
                        "data":data});
                }else{
                    return res.status(200).json({"status":"OK",
                        "message":"No po found.",
                        "data":[]});
                }
            }).catch(next)
    }

});

router.put("/pr-to-po/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating po."});
        }
        poService.findpoAsync({_id:req.params._id})
        .then(function(available){
            if(available && available[0]){
                if(available[0].status=="Unapproved"){
                    req.oldPoData = JSON.parse(JSON.stringify(available[0]));
                    return next();
                }else{
                    return res.status(500).json({"status":"ERROR","message":"Only unapproved po can be update."});
                }
            }else {
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This po does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        var oldPoItems = (req.oldPoData.spare && (req.oldPoData.spare.length>0))?req.oldPoData.spare:[];
        var newPoItems = (req.body.spare && (req.body.spare.length>0))?JSON.parse(JSON.stringify(req.body.spare)):[];

        if(newPoItems.length>0){
            for (var i = 0; i < newPoItems.length; i++) {
                newPoItems[i].delta = newPoItems[i].quantity?-newPoItems[i].quantity:0;
                if(oldPoItems.length>0){
                    for (var j = 0; j < oldPoItems.length; j++) {
                      if((oldPoItems[j].prnumber==newPoItems[i].prnumber) && (oldPoItems[j].code==newPoItems[i].code)){
                        if(oldPoItems[j].quantity === newPoItems[i].quantity){
                            newPoItems[i].delta = 0;
                        }else{
                            newPoItems[i].delta = oldPoItems[j].quantity - newPoItems[i].quantity;
                        }
                      }
                    }
                }
            }
        }
        req.body.spare = newPoItems;
        req.body.last_modified_by_name=req.user.full_name;
        req.body.last_modified_by=req.user._id;
        delete req.body.status;
        poService.addPoItemByIdAsync(req.params._id,req.body)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"PO updated successfully",
                "data":updated});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to update PO."});
            }
        }).catch(next)
    }
);


router.put("/update/:_id",
    function(req,res,next){

        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No update body found"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for updating pr."});
        }
        poService.findpoAsync({_id:req.params._id})
        .then(function(available){
            if (available && available[0]) {
                if(req.body.status=="Approved"){
                    if(available[0].status=="Unapproved"){
                        if((available[0].approver) && (available[0].approver._id) && (available[0].approver._id.toString() == req.user._id.toString()) && (req.user.user_type && req.user.user_type.indexOf("POapprover")>-1)){
                            return next();
                        }else{
                            return res.status(500).json({"status":"ERROR","message":"You do not have access to approve PO."});
                        }
                    }else{
                        return res.status(500).json({"status":"ERROR","message":"PO status: "+available[0].status+". Only Unapproved status of PO can be approved."});
                    }
                }else if(req.body.status=="Released"){
                    if(available[0].status=="Approved"){
                    	req.body.rFreight = req.body.freight;
                        if(req.body.spare && req.body.spare.length>0){
                            for (var i = 0; i < available[0].spare.length; i++) {
								req.body.spare[i].remaining_quantity =req.body.spare[i].quantity?req.body.spare[i].quantity:0;
                            }
                            req.modifSpare = req.body.spare;
                        }

                        return next();
                    }else{
                        return res.status(500).json({"status":"ERROR","message":"PO status: "+available[0].status+". Only approved status of PO can be released."});
                    }
                }else if(req.body.status=="Received"){
                    if(available[0].status=="Released"){
                        return next();
                    }else{
                        return res.status(500).json({"status":"ERROR","message":"PO status: "+available[0].status+". Only released status of PO can be received."});
                    }
                }else if((req.body.status=="Inwarded")||(req.body.status=="Partial Inwarded")){
                    if(available[0].status=="Received"){
                        return next();
                    }else{
                        return res.status(500).json({"status":"ERROR","message":"PO status: "+available[0].status+". Only received status of PO can be inwarded."});
                    }
                }else{
                    return res.status(500).json({"status":"ERROR","message":"No status provided to update."});
                }
            }else{
                return res.status(200).json({
                    "status": "ERROR",
                    "message": "This PO does not exists.",
                });
            }
        }).catch(next)
    },
    function(req,res,next) {
        var prs=[];
        for (var i=0; i<req.body.spare.length; i++){
            prs.push(req.body.spare[i].prnumber);
        }
        req.body.prs=Array.from(new Set(prs));
        (req.body.status=="Released")?req.body.spare=req.modifSpare:delete req.body.spare;
        req.body.last_modified_by_name=req.user.full_name;
        req.body.last_modified_by=req.user._id;
        req.body.status=req.body.status;
        poService.findandUpdatePOByIdAsync(req.params._id,req.body)
        .then(function(updated){
            if(updated){
                return res.status(200).json({"status":"OK",
                "message":"PO data has been updated successfully",
                "data":updated});
            }else{
                return res.status(500).json({"status":"ERROR",
                "message":"unable to updated PO."});
            }
        }).catch(next)
    }
);

module.exports = router;
