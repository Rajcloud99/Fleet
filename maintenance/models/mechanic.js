/**
 * Created by manish on 22/12/16.
 */
var mongoose = require ('mongoose');

var MechanicSchema = new mongoose.Schema(
    {
        "clientId":constant.requiredString,
        "full_name" : constant.requiredString,
        "employee_code":constant.requiredString,
        "branchId": constant.requiredString,
        "branchName":constant.requiredString,
        "speciality_parts":[String],
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

module.exports = mongoose.model('Mechanic', MechanicSchema);
