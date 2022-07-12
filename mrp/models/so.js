let mongoose = require('mongoose');

let soSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"branch": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		"customer":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		"so_date":{
			type:Date,
			default:Date.now()
		},
		"sales_person":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"priority":{
			type:String,
			enum:["Low","Medium","High"],
			default:"Medium"
		},
		"quotations":[{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'quotation'
		}],
		"so_number": String,
		"po_number": String,
		"ship_date":Date,
		"delivery_date":Date,
		"billing_address":{
			"contact_person":String,
			"company_name":String,
			"street_address":String,
			"city":String,
			"state":String,
			"country":String,
			"pincode":String,
			"phone":String,
			"email":String
		},
		"shipping_address": {
			"contact_person":String,
			"company_name":String,
			"street_address":String,
			"city":String,
			"state":String,
			"pincode":String,
			"phone":String,
			"email":String
		},
		"shipping_terms": String,
		"shipping_method":String,
		"approver": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"items": [
			{
				"quot_number":String,
				"quot_ref":{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'quotation'
				},
				"item": {
					type: String,
					enum: constant.spType,
					default: "Gps"
				},
				"item_ref":{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Parts'
				},
				"quantity": {
					type: Number,
					default:0
				},
				"remaining_quantity":{
					type: Number,
					default:0
				},
				"price_per_unit": {
					type: Number,
					default:0
				},
				"discount_percent":{
					type: Number,
					default:0
				},
				"tax_percent": {
					type: Number,
					default: 0
				},
				"invoice_no": [String],
				"invoice_ref":[{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'soInvoice'
				}],
				"total": {
					type: Number,
					default:0
				}
			}
		],
		"subtotal1":{
			type: Number,
			default:0
		},
		"total_discount":{
			type: Number,
			default:0
		},
		"total_tax": {
			type: Number,
			default:0
		},
		"subtotal2":{
			type: Number,
			default:0
		},
		"shipping_charges":{
			type: Number,
			default:0
		},
		"other_charges":{
			type: Number,
			default:0
		},
		"total": {
			type: Number,
			default:0
		},
		"total_quantity":{
			type: Number,
			default:0
		},
		"total_remaining_quantity":{
			type: Number,
			default:0
		},
		"payment_terms":String,
		"status": {
			type: String,
			enum: ["Unapproved","Approved", "Declined", "Partially Invoiced", "Fully Invoiced"],
			default: "Unapproved"
		},
		"approved_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"approved_by_date":Date,
		"invoiced_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"invoiced_by_date":Date,
		"declined_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"declined_by_date":Date,
		"additional_notes": String,
		"additional_notes_2":String,
		"created_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"last_modified_by":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
	},
	constant.timeStamps
);

module.exports = mongoose.model('so', soSchema);
