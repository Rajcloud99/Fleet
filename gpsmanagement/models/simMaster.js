/**
 * Created by manish on 9/8/16.
 */
const mongoose = require('mongoose');

let SimMasterSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"sim_no": constant.requiredString,
		"mobile_no": constant.requiredNumber,
		"purchase_invoice_no":String,
		"po_number":String,
		"po_ref":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'po'
		},
		"sell_invoice_no":String,
		"activation_date": Date,
		"bill_expiry_date": String,
		"device_imei":String,
		"active_status":{
			type: String,
			default:"Active",
			enum: ["Expired","Active"]
		},
		"branch": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		"part_ref": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Parts'
		},
		"stock_status": {
			type: String,
			default:"In stock",
			enum: ["In stock","Sold"]
		},
		"rate":Number,
		"rate_inc_tax":Number,
		"purchased_from":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'VendorMaintenance_'
		},
		"sold_to_customer":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		"created_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		"last_modified_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
	},
	constant.timeStamps
);

module.exports = mongoose.model('simMaster', SimMasterSchema);
