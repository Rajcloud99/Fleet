/**
 * Created by nipun on 21/12/16.
 */

var mongoose = require ('mongoose');

var VendorMaintenanceSchema_ = new mongoose.Schema(
    {
        "clientId":constant.requiredString,
        "name": constant.requiredString,
        "vendorId":constant.requiredString,
        "address":constant.address,
        "prim_contact_person":String,
        "alt_contact_person":String,
        "prim_contact_no":Number,
        "alt_contact_no":Number,
        "banking_details":[{
            "a_c":String,
            "ifsc":String,
            "declaration":String
        }],
        "pan_no":String,
        "tin_no":String,
        "email":String,
        "status":constant.customerStatus,
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

module.exports = mongoose.model('VendorMaintenance_', VendorMaintenanceSchema_);
