let quotationSchema = new mongoose.Schema(
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
		"quot_date": {
			type: Date,
			default: Date.now()
		},
		"quot_number": String,
		"quot_expiry_date": constant.requiredDate,
		"quot_status": {
			type: String,
			enum: ["Unapproved", "Expired", "Cancelled", "Approved for sale", "Partially converted to SO",
				"Fully converted to SO"],
			default: "Unapproved"
		},
		"priority": {
			type: String,
			enum: ["Low", "Medium", "High"],
			default: "Medium"
		},
		"possible_delivery_by": Date,
		"address": {
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
		"quot_approved_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"quot_approval_date": Date,
		"quot_cancelled_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"quot_cancelled_date": Date,
		"quot_cancelled_reason": String,
		"sales_person": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"quot_approver": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"items": [
			{
				"item": {
					type: String,
					enum: constant.spType,
					default: "Gps"
				},
				"so_number": [String],
				"so_ref": [{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'so'
				}],
				"item_ref": {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Parts'
				},
				"remark": String,
				"quantity": {
					type: Number,
					default:0
				},
				"remaining_quantity": {
					type: Number,
					default: 0
				},
				"price_per_unit": {
					type: Number,
					default: 0
				},
				"discount_percent":{
					type: Number,
					default: 0
				},
				"tax_percent": {
					type: Number,
					default: 0
				},
				"total": {
					type: Number,
					default: 0
				}
			}
		],
		"shipping_terms": String,
		"shipping_method": String,
		"subtotal1": {
			type: Number,
			default: 0
		},
		"total_discount": {
			type: Number,
			default: 0
		},
		"total_tax": {
			type: Number,
			default: 0
		},
		"subtotal2": {
			type: Number,
			default: 0
		},
		"shipping_charges": {
			type: Number,
			default: 0
		},
		"other_charges": {
			type: Number,
			default: 0
		},
		"total": {
			type: Number,
			default: 0
		},
		"total_quantity": {
			type: Number,
			default: 0
		},
		"total_remaining_quantity": {
			type: Number,
			default: 0
		},
		"payment_terms": String,
		"additional_notes": String,
		"additional_notes_2": String,
		"created_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"last_modified_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	},
	constant.timeStamps
);

module.exports = mongoose.model('quotation', quotationSchema);
