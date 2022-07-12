/**
 * Created by manish on 19/7/16.
 */

var mongoose = require ('mongoose');

var vendorCourierSchema= new mongoose.Schema(
    {
		"account": {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		"name": constant.requiredString,
        "vendorId":constant.requiredString,
        "clientId":constant.requiredString,
        "prim_contact_person":String,
        "alt_contact_person":String,
        "prim_contact_no":Number,
        "alt_contact_no1":Number,
        "alt_contact_no2":Number,
        "prim_email":String,
        "website": String,
        "fax":String,
        "alt_email":String,
        "address": constant.address,
        /*"address2": constant.address,
        "address3": constant.address,*/
        "rating": Number,
        "status":constant.customerStatus,
        "total_times_rated":Number,
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
        },
        "created_at": {'type': Date, default: Date.now()}
    }
 );

vendorCourierSchema.plugin(mongoose_delete,{overrideMethods:'all'});

module.exports = mongoose.model('VendorCourier', vendorCourierSchema);
