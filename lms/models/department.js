/**
 * Created by manish on 29/8/16.
 */
var mongoose = require ('mongoose');
var validator = require('validator');

var DepartmentSchema   = new mongoose.Schema(
    {
        //basic info
        "name":constant.requiredString,
        "code":constant.requiredString,
        "clientId":constant.requiredString,
        "function":String,
        "created_by_name":String,
        "created_by_employee_code":String,
        "last_modified_by_name":String,
        "last_modified_employee_code":String
    },
    constant.timeStamps
);

module.exports = mongoose.model('Department', DepartmentSchema);
