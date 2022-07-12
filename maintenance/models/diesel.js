/**
 * Created by Nipun on 7/11/2017.
 */

var mongoose = require ('mongoose');

var dieselSchema = new mongoose.Schema({
    "clientId": constant.requiredString,
    "flag":{
        type:String,
        enum:["Inward","Outward"],
        required: true
    },
    "slip_number":String,
    "from_to_type":{
        type: String,
        enum:["Vendor","Vehicle","Generator","Other"],
        required: true
    },
    "from_to":constant.requiredString,
    "quantity":constant.requiredNumber,
    "price":Number,
    "total_amount":Number,
    "bill_no":String,
    "remark":String,
    "employee_involved_name":String,
    "employee_involved_code":String,
    "created_by_employee_name":String,
    "created_by_employee_code":String,
    "modified_by_employee_name":String,
    "modified_employee_code":String
}, constant.timeStamps);

module.exports = mongoose.model('diesel',dieselSchema);