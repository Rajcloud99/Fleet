/**
 * Created by Nipun on 5/25/2017.
 */

var mongoose = require ('mongoose');

var contractorSchema = new mongoose.Schema({
    "clientId": constant.requiredString,
    "name":constant.requiredString,
    "mobile":Number,
    "company":constant.requiredString,
    "address":String,
    "created_by_employee_name":String,
    "created_by_employee_code":String,
    "modified_by_employee_name":String,
    "modified_employee_code":String
}, constant.timeStamps);

module.exports = mongoose.model('contractor',contractorSchema);