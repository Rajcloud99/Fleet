/**
 * Created by manish on 30/12/16.
 */
var mongoose = require ('mongoose');

var SpareUseSchema= new mongoose.Schema(
    {
        "clientId":constant.requiredString,
        "jobId":constant.requiredString,
        "taskId":constant.requiredString,
        "task_name":constant.requiredString,
        "spare_code":constant.requiredString,
        "spare_name":constant.requiredString,
        "quantity":Number,
        "cost_per_piece":Number,
        "issued":{
            type:String,
            default:"No",
            enums:constant.yesNoTypes
        },
        "mechanic_name":String,
        "issued_by_name":String,
        "issued_by_employee_code":String,
        "issued_datettime":Date,
        "remarks":String,
        "created_by_name":String,
        "created_by_employee_code":String,
        "last_modified_by_name":String,
        "last_modified_employee_code":String,
    },
    constant.timeStamps
);

module.exports = mongoose.model('SpareUse', SpareUseSchema);
