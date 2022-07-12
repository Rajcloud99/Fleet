var mongoose = require ('mongoose');

var MaterialTypeSchema = new mongoose.Schema(
	{
			"clientId": String,
		// "name" : constant.requiredString,
		// "code": constant.requiredString,
		// "group_name":constant.requiredString,
		// "group_code":constant.requiredString,
		// "group_id": {
		// 	type:mongoose.Schema.Types.ObjectId,
		// 	ref:"MaterialGroup",
		// 	required:true
		// },
		material: [{
			type:  String
		}],
		"desc":String,
		category: String,
		"sacCode":String,
		"hsnCode":String,
		"pUnitWt":Number,
		"gstPercent": Number,
		"unit": String,
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

module.exports = mongoose.model('MaterialType', MaterialTypeSchema);
