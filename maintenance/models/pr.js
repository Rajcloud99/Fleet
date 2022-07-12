var mongoose = require('mongoose');

var prmasterSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"branchId": String,
		"branchName": String,
		"prnumber": constant.requiredString,
		"approver": {
			"name": String,
			"_id": {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			}
		},
		"branch": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		"spare": [
			{
				"po_no": [String],
				"needed_date": Date,
				"code": constant.requiredString,
				"name": constant.requiredString,
				"category_name": String,
				"category_code": String,
				"type": {
					type: String,
					enum: constant.spType,
					default: "Spare"
				},
				"quantity": {
					type: Number,
					required: true
				},
				"part_ref": {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Parts'
				},
				"remaining_quantity": Number,
				"uom": String,
				"priority": String,
				"brand": String,
				"remark": String,
				"vehicle_make": String,
				"previousRate": Number,
				"inStockQty": Number,
				"previousQty": Number,
				"previousVendorName": String,
				"previousDate": Date
			}
		],
		//"total":Number,
		"status": {
			type: String,
			enum: constant.prStatus,
			default: "New"
		},
		"processed_by_name": String,
		"processed_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"created_by_name": String,
		"created_by_employee_code": String,
		"created_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"last_modified_by_name": String,
		"last_modified_employee_code": String,
		"last_modified_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	},
	constant.timeStamps
);

module.exports = mongoose.model('pr', prmasterSchema);
