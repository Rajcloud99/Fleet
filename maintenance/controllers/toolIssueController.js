/**
 * Created by Nipun on 4/12/2017.
 */
var router = express.Router();
var toolIssueService = promise.promisifyAll(commonUtil.getMaintenanceService('toolIssue'));
var toolService = promise.promisifyAll(commonUtil.getMaintenanceService('tool'));
var ToolIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('toolIssue'));

/**************toolIssue vendor *********/
router.post("/issue",
    /**validate **/
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No body found"});
        }
        toolService.findToolAsync({_id:req.body._id})
			.then(function (tool) {
				if(tool && tool[0]){
					req.tool=tool[0];
					return next();
				}
				else{
					return res.status(500).json({"status":"ERROR",
						"message":"Unable to find tool."});
				}
			})
    },
    /**save**/
    function(req,res,next) {
        req.body.tool_id=req.body._id;
        req.body.rate=req.tool.current_price;
        delete req.body._id;
        delete req.body.created_at;

		toolIssueService.addToolIssueAsync(req.body)
            .then(function(added){
                if(added){
                    return next();
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Unable to issue tool."});
                }
            }).catch(next)
    },
    function(req,res,next) {
        toolService.updateToolByIdAsync(req.tool._id,{status:"issued",current_price:0})
            .then(function(updated){
                if(updated){
                    return res.status(200).json({"status":"OK",
                        "message":"Tool issued successfully",
                        "data":updated});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Issued tool but status change failed."});
                }
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
    if(req.query.issued && req.query.issued=="true"){
        req.query.return_by_employee_name={$exists:false};
        delete req.query.issued;
        var cursor = ToolIssue.find(req.query).sort({$natural:-1}).limit(1);
        cursor.exec(function(err,data) {
            if(data){
                return res.status(200).json({"status":"OK",
                    "message":"Data found.",
                    "data":data});
            }else{
                return res.status(200).json({"status":"OK",
                    "message":"No data found.",
                    "data":[]});
            }
        });
    }
    else{
        toolIssueService.findToolIssueAsync(req.query)
            .then(function(data){
                if(data){
                    return res.status(200).json({"status":"OK",
                        "message":"Data found.",
                        "data":data});
                }else{
                    return res.status(200).json({"status":"OK",
                        "message":"No data found.",
                        "data":[]});
                }
            }).catch(next)
    }

});

router.post("/return/:_id",
    function(req,res,next){
        if (otherUtil.isEmptyObject(req.body)){
            return res.status(500).json({"status":"ERROR","message":"No data sent"});
        }
        if (otherUtil.isEmptyObject(req.params)){
            return res.status(500).json({"status":"ERROR","message":"No id provided for returning tool."});
        }
        toolIssueService.findToolIssueAsync({_id:req.params._id})
            .then(function(available){
                if (available) {
                    return next();
                }else{
                    return res.status(200).json({
                        "status": "ERROR",
                        "message": "Invalid id",
                    });
                }
            }).catch(next)
    },
    function(req,res,next) {
        req.body.tool_id=req.body._id;
        delete req.body._id;
        if(!req.body.return_by_type)
            return res.status(500).json({"status":"ERROR",
            "message":"return_status not privided"});
        if(!req.body.return_by_employee_code)
            return res.status(500).json({"status":"ERROR",
                "message":"return_by_employee_code not privided"});
        if(!req.body.return_by_employee_name)
            return res.status(500).json({"status":"ERROR",
                "message":"return_by_employee_name not privided"});
        if(!req.body.return_status )
            return res.status(500).json({"status":"ERROR",
                "message":"return_status not privided"});
        var returnBody={};
        returnBody.return_by_type=req.body.return_by_type;
        returnBody.return_by_employee_code=req.body.return_by_type;
        returnBody.return_by_employee_name=req.body.return_by_employee_name;
        returnBody.return_status=req.body.return_status;
        returnBody.return_date=new Date();
        returnBody.clientId=req.user.clientId;
        toolIssueService.updateToolIssueByIdAsync(req.params._id,returnBody)
            .then(function(updated){
                if(updated){
                    return next();
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"unable to return."});
                }
            }).catch(next)
    },
    function(req,res,next) {
        var dataBody={status:"InStock",category:req.body.return_status};
        if(dataBody.category=="scrapped")
            dataBody.status="scrapped";
        toolService.updateToolByIdAsync(req.body.tool_id,dataBody)
            .then(function(updated){
                if(updated){
                    return res.status(200).json({"status":"OK",
                        "message":"Tool returned successfully",
                        "data":updated});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Returned tool but status change failed."});
                }
            }).catch(next)
    }
);



module.exports = router;
