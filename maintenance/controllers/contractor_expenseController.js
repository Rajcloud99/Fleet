/**
 * Created by Nipun on 5/29/2017.
 */
var router = express.Router();

var contractorExpenseService = promise.promisifyAll(commonUtil.getMaintenanceService('contractor_expense'));

router.get("/get",function(req,res,next){
    contractorExpenseService.findContractorExpenseAsync(req.query)
        .then(function(data){
            if(data){
                return res.status(200).json({"status":"OK",
                    "message":"Contractor expense found.",
                    "data":data});
            }else{
                return res.status(200).json({"status":"OK",
                    "message":"Contractor expense not found.",
                    "data":[]});
            }
        }).catch(next)
});

router.post("/update",
    function(req,res,next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({"status": "ERROR", "message": "No update body found"});
        }
        if(!req.body.contractor_expense || req.body.contractor_expense.length<1){
            return res.status(500).json({"status": "ERROR", "message": "'contractor_expense'[] not found"});
        }
        return next();
    },
    function(req,res,next) {
        req.body.contractor_expense.forEach(function (obj,index,array) {
            obj.clientId=req.user.clientId;
            obj.vehicle_number=req.body.vehicle_number;
            obj.jobId=req.body.jobId;
/*            obj.taskId=req.body.taskId;
            obj.task_name=req.body.task_name;
            obj.supervisor_employee_id=req.body.supervisor_employee_id;
            obj.supervisor_name=req.body.supervisor_name;
            obj.start_time=req.body.start_time;
            obj.end_time=req.body.end_time;*/
            obj.created_by_employee_name=req.user.full_name;
            obj.created_by_employee_code=req.user.userId;

        })
    contractorExpenseService.updateContractorExpenseAsync(req.body.contractor_expense)
        .then(function (response) {
            return res.status(200).json({"status":"OK",
                "message":"Contractor expense updated.",
                "data":response});
        })
        .catch(next)

    }
);

module.exports = router;
