var mongoose = require('mongoose');

var pomasterSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"branchId": String,
		"branchName": String,
		"ponumder": constant.requiredString,
		"branch": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		"approver": {
			"name": String,
			"_id": {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			}
		},
		"haveTool": {
			type: Boolean,
			default: false
		},
		"haveTyre": {
			type: Boolean,
			default: false
		},
		"haveSpare": {
			type: Boolean,
			default: false
		},
		"prs": [String],
		"spare": [
			{
				"prnumber": String,
				"needed_date": Date,
				"code": constant.requiredString,
				"name": constant.requiredString,
				"type": {
					type: String,
					enum: constant.spType,
					default: "Spare"
				},
				"part_ref": {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Parts'
				},
				"quantity": {
					type: Number,
					required: true
				},
				"remaining_quantity": Number,
				"uom": String,
				"brand": String,
				"tax": {
					type: Number,
					default: 0
				},
				"imei_list":[String],
				"mobile_no_list":[String],
				"sim_no_list":[String],
				"delta": Number,
				"rate": Number,
				"rate_inc_tax": Number,
				"previousRate": Number,
				"total": Number
			}
		],
		"freight": Number,
		"rFreight": Number,
		"tax": Number,
		"total": Number,
		"billing_location": String,
		"shipping_location": String,
		"vendor_name": String,
		"vendorId": String,
		"vendor_id": {
			"type": mongoose.Schema.Types.ObjectId,
			"ref": 'vendorproduct'
		},
		"promised_date": Date,

		"status": {
			type: String,
			enum: constant.poStatus,
			default: "Unapproved"
		},
		"payment_terms": String,
		"remark": String,
		"freightTerms": String,
		"payTerms": String,
		"note_to_supplier": String,
		"additional_note_to_supplier": String,
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

module.exports = mongoose.model('po', pomasterSchema);
