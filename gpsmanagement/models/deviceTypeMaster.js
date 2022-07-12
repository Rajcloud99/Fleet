/**
 * Created by manish on 9/8/16.
 */
let mongoose = require('mongoose');

let DeviceTypeMasterSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"code":constant.requiredString,
		"model": String,
		"manufacturer": String,
		"firmware": String,
		"price":Number,
		"comments": String,
		"created_by_name":String,
		"created_by_employee_code":String,
		"last_modified_by_name":String,
		"last_modified_employee_code":String,
	},
	constant.timeStamps
);

module.exports = mongoose.model('deviceTypeMaster', DeviceTypeMasterSchema);
