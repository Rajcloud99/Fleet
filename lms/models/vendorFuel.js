/**
 * Created by manish on 19/7/16.
 */

var mongoose = require('mongoose');

var vendorFuelSchema = new mongoose.Schema({
		'account': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		'clientId': constant.requiredString,
		'name': constant.requiredString,
		'vendorId': constant.requiredString,
	    "fuel_company": String,
		'branch_name': String,
		'branch_code': String,
		'branch_id': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		'address': constant.address,
		'prim_contact_person': String,
		'alt_contact_person': String,
		'prim_contact_no': Number,
		'alt_contact_no1': Number,
		'alt_contact_no2': Number,
		'fax': String,
		'prim_email': String,
		'alt_email': String,

		'effective_from': Date,
		'rating': Number,
		'status': {
			type: String,
			enum: constant.customerStatus
		},
		'banking_details': [{
			'a_c': String,
			'ifsc': String,
			'declaration': String
		}],
		'pan_no': String,
		'tin_no': String,
		'total_times_rated': Number,
		'created_by_name': String,
		'created_by_employee_code': String,
		'created_by': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		'last_modified_by_name': String,
		'last_modified_at':Date,
		'last_modified_employee_code': String,
		'last_modified_by': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		'created_at': { 'type': Date, default: Date.now() }
	}
);

vendorFuelSchema.plugin(mongoose_delete, { overrideMethods: 'all' });

vendorFuelSchema.pre('find', function () {
	//this.populate({path: 'account'});
});

module.exports = mongoose.model('VendorFuel', vendorFuelSchema);
