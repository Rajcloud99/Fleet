/**
 * Created by pratik on 21/10/16.
 */

var mongoose = require ('mongoose');

var courierOfficeSchema= new mongoose.Schema(
    {   
        "clientId":constant.requiredString,
        "branch_name": String,
        "city": String,
        "state": String,
        "contact_person": String,
        "alt_contact_person": String,
        "contact_prime": Number,
        "alter_contact": Number,
        "e-mail_prime": String,
        "alter_e-mail": String,
        "website": String,
        "address": String,
        "vendorId":constant.requiredString,
        "courier_vendor_id":{
            type:mongoose.Schema.Types.ObjectId,
            ref:"VendorCourier"
        },
    },
    constant.timeStamps
);

courierOfficeSchema.plugin(mongoose_delete,{overrideMethods:'all'});

module.exports = mongoose.model('courierOffice', courierOfficeSchema);
