let invoiceSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"branch": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		"customer": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		"invoice_date": {
			type: Date,
			default: Date.now()
		},
		"invoice_no":constant.requiredString,
		"sos": [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'so'
		}],
		"ship_date": Date,
		"delivery_date": Date,
		"billing_address": {
			"contact_person": String,
			"company_name": String,
			"street_address": String,
			"city": String,
			"state": String,
			"country": String,
			"pincode": String,
			"phone": String,
			"email": String
		},
		"shipping_address": {
			"contact_person": String,
			"company_name": String,
			"street_address": String,
			"city": String,
			"state": String,
			"pincode": String,
			"phone": String,
			"email": String
		},
		"ship_to":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		"shipping_terms": String,
		"shipping_method": String,
		"items": [
			{
				"so_number": String,
				"so_ref": {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'so'
				},
				"item": {
					type: String,
					enum: constant.spType,
					default: "Gps"
				},
				"item_ref": {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Parts'
				},
				"imei_list":[String],
				"mobile_no_list":[String],
				"sim_no_list":[String],
				"quantity": {
					type: Number,
					default:0
				},
				"price_per_unit": {
					type: Number,
					default:0
				},
				"discount_percent": {
					type: Number,
					default:0
				},
				"cgst_percent":{
					type: Number,
					default:0
				},
				"cgst_amount":{
					type: Number,
					default:0
				},
				"sgst_percent":{
					type: Number,
					default:0
				},
				"sgst_amount":{
					type: Number,
					default:0
				},
				"igst_percent":{
					type: Number,
					default:0
				},
				"igst_amount":{
					type: Number,
					default:0
				},
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
		"total_cgst": {
			type: Number,
			default:0
		},
		"total_sgst": {
			type: Number,
			default:0
		},
		"total_igst": {
			type: Number,
			default:0
		},
		"total_tax": {
			type: Number,
			default:0
		},
		"subtotal2": {
			type: Number,
			default:0
		},
		"shipping_charges": {
			type: Number,
			default:0
		},
		"other_charges": {
			type: Number,
			default:0
		},
		"total": {
			type: Number,
			default:0
		},
		"total_quantity": {
			type: Number,
			default:0
		},
		"due_date": Date,
		"payment_terms": String,
		"status": {
			type: String,
			enum: ["Unapproved", "Approved", "Dispatched", "Cancelled", "Acknowledged", "Part Payment Received", "Full Payment Received"],
			default: "Unapproved"
		},
		"additional_notes": String,
		"acknowledged_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"acknowledged_date": Date,
		"acknowledge_remark": String,
		"approved_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"approved_by_date": Date,
		"dispatched_via": {
			type: String,
			enum: ['Courier', 'Person']
		},
		"dispatched_by": String,
		"dispatched_by_date": Date,
		"cancelled_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"cancelled_by_date": Date,
		"cancel_remark": String,
		"created_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"approver": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"payment": [{
			"mode": String,
			"amount": Number,
			"reference_no": String,
			"person": String,
			"remark": String,
			"payment_date": Date
		}],
		"courier": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'courierOffice'
		},
		"courier_date": Date,
	},
	constant.timeStamps
);

module.exports = mongoose.model('soInvoice', invoiceSchema);
