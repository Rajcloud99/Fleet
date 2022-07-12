/**
 * Created by manish on 9/8/16.
 */
let mongoose = require('mongoose');

let DeviceSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"imei": constant.requiredString,
		"po_number":String,
		"po_ref":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'po'
		},
		"stock_status": {
			type: String,
			default:"In stock",
			enum: ["In stock","Sold","Issued","In Repobin","Scrapped", "Sent for Repair"]
		},
		"branch": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		"purchase_invoice_no":String,
		"purchase_invoice_date":Date,
		"sell_invoice_no":String,
		"sell_invoice_ref":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'soInvoice'
		},
		"health_status":{
			type: String,
			default:"Healthy",
			enum: ["Healthy","Damaged","Used"]
		},
		"purchase_date": Date,
		"sell_date":Date,
		"activation_date": Date,
		"renewal_date": Date,
		"expiry_date":Date,
		"part_ref":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Parts'
		},
		"sim_card":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'simMaster'
		},
		"purchased_from_vendor":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'vendormaintenance_'
		},
		"sold_to_customer":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		"issued_date": Date,
		"issued_to":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		issued_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		returned_to: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		returned_date: Date,
		"return_reason": {
			type: String,
			enum: ['New','Old','Damaged']
		},
		"return_remark": String,
		"allocation_status":{
			type: String,
			default:"Un-allocated",
			enum: ["Allocated","Un-allocated"]
		},
		"allocation_date":Date,
		"allocation_done_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"allocated_to":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"created_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"last_modified_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"rate":Number,
		"rate_inc_tax":Number,
		"device_history":[
			{
				"action": {
					type: String,
					enum: ["purchase","se"]
				},
			}
		]
	},
	constant.timeStamps
);

DeviceSchema.index({clientId: 1, imei: 1}, {unique: true});

module.exports = mongoose.model('deviceMaster', DeviceSchema);
