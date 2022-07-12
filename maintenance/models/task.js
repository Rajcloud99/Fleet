/**
 * Created by manish on 29/12/16.
 */

var mongoose = require ('mongoose');

var TaskMaintenanceSchema= new mongoose.Schema(
    {
        "clientId":constant.requiredString,
        "jobId":constant.requiredString,
        "taskId":constant.requiredString,
        "task_name":constant.requiredString,
        "supervisor_employee_id":constant.requiredString,
        "supervisor_name":constant.requiredString,
        "mechanics_involved": {
            type: [{
                "name": String,
                "employee_id": String
            }],
            required: true
        },
        "status":{
            type:String,
            enum:constant.taskStatusTypes,
            default:"Open"
        },
        "priority":{
            type:String,
            enum:constant.taskPriorityTypes
        },
        "start_datetime":Date,
        "close_datetime":Date,
        "remarks":String,
        "created_by_name":String,
        "created_by_employee_code":String,
        "created_by":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        "last_modified_by_name":String,
        "last_modified_employee_code":String,
        "last_modified_by":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    constant.timeStamps
);

module.exports = mongoose.model('TaskMaintenance', TaskMaintenanceSchema);
