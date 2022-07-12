/**
 * Created by manish on 21/12/16.
 */
var mongoose = require ('mongoose');

var ManufacturerSchema= new mongoose.Schema(
    {
        "name":constant.requiredString,
        "address1":constant.address,
        "address2":constant.address,
        "prim_contact":String,
        "prim_contact_no":String,
        "sec_contact":String,
        "sec_contact_no":String,
        "email":String,
        "fax":String,
        "active":{
            type:Boolean,
            default:true
        },
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

module.exports = mongoose.model('Manufacturer', ManufacturerSchema);
