/**
 * Created by Nipun on 5/29/2017.
 */
var mongoose = require ('mongoose');

var contractorExpenseSchema = new mongoose.Schema({
    "clientId": constant.requiredString,
    "vehicle_number": constant.requiredString,
    "jobId": constant.requiredString,
    "taskId":constant.requiredString,
    "task_name":constant.requiredString,
    "contractor_name":constant.requiredString,
    "contractor_id":{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'contractor'
    },
    "supervisor_employee_id":constant.requiredString,
    "supervisor_name":constant.requiredString,
    "start_time":Date,
    "end_time":Date,
    "bill_number":constant.requiredString,
    "amount":constant.requiredNumber,
    "remark":String,
    "deleted":{
        type:Boolean,
        default:false
    },
    "created_by_employee_name":String,
    "created_by_employee_code":String,
    "modified_by_employee_name":String,
    "modified_employee_code":String
}, constant.timeStamps);

module.exports = mongoose.model('contractorExpense',contractorExpenseSchema);