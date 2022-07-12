/**
 * Created by bharath on 28/04/17.
 */

var mongoose = require ('mongoose');

var TyreRetreadSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"tyre_number":constant.requiredString,
		"issued_by_employee_code":constant.requiredString,
		"issued_by_employee_name":constant.requiredString,

		"issue_date": Date,
		"returned_by_employee_code":String,
		"returned_by_employee_name":String,

		"return_date": Date,

		"tyre_quality_remark": String,
		"bill_no": String,
		"bill_date": Date,
		"issue_slip_no": String,
		"vendor_name": constant.requiredString,
		"vendorId":constant.requiredString,
		"vendor_id":{
			"type": mongoose.Schema.Types.ObjectId,
			"ref": 'VendorMaintenance_'
		},
		"returned":{
			"type": Boolean,
			"default":false
		},
		"expected_return_date": Date,
		"cost": Number,
		"tax": Number,
		"freight": Number,
		"total_cost": Number
	},
	constant.timeStamps
);

module.exports = mongoose.model('TyreRetread', TyreRetreadSchema);
