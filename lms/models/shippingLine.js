var mongoose = require('mongoose');

var ShippingLineSchema = new mongoose.Schema (
    {   
        "clientId":constant.requiredString,
        "name":constant.requiredString,
        "code": constant.requiredString,
        "shippingLineId":constant.requiredString,
        "contact_person_name":String,
        "alt_contact_person_name":String,
        "prim_contact_no":Number,
        "alt_contact_no1":Number,
        "alt_contact_no2":Number,
        "email":String,
        "alt_email":String,
        "details":String,
        "address1":constant.address,
        "address2":constant.address,
        "address3":constant.address,
        "port_name":String,
        "remarks": String,
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

ShippingLineSchema.plugin(mongoose_delete,{overrideMethods:'all'});

module.exports = mongoose.model('ShippingLine', ShippingLineSchema);