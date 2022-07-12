/**
 * Created by manish on 19/7/16.
 */

var mongoose = require ('mongoose');

var vendorMaintenanceSchema= new mongoose.Schema(
    {   
        "clientId":constant.requiredString,
        "name": constant.requiredString,
        "vendorId":constant.requiredString,
        "branch_name":String,
        "branch_code":String,
        "branch_id":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch'
        },
        "address1":constant.address,
        "prim_contact_person":String,
        "alt_contact_person":String,
        "prim_contact_no":Number,
        "alt_contact_no1":Number,
        "alt_contact_no2":Number,
        "prim_email":String,
        "alt_email":String,
        "rating":Number,
        "total_times_rated":Number,
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

vendorMaintenanceSchema.plugin(mongoose_delete,{overrideMethods:'all'});


module.exports = mongoose.model('VendorMaintenance', vendorMaintenanceSchema);
