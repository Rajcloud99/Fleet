/**
 * Created by manish on 19/7/16.
 */

let mongoose = require('mongoose');

let CustomerSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		'clientR': [String],
		"account": {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		"branch": {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Branch"
		},
		"configs": {
			'GR': {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'schemaconfigurations'
			},
			'RATE_CHART': {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'schemaconfigurations'
			},
		},
		lastUpdateConfigsBy: String,
		lastUpdateConfigsAt: Date,
		"customerId": constant.requiredString,
		"customer": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		"category":  String,
		"name": constant.requiredString,
		"cno": Number,
		"gstin_registered": {
			type: Boolean,
			default: false
		},
		"state_code": String,
		"gstin_no": String,
		"pan_no": String,
		"vendor_code": String,
		"ecc": String,
		"address": constant.address,
		"active_contract": String,
		"active_contractId": String,
		"active_contract__id": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Contract'
		},
		"billTemplate": [{
			name: String,
			key: String,
			type: {
				type: String
			},
		}],
		"grTemplate": [{
			name: String,
			key: String,
		}],
		"type": [{
			type:String,
			enum: constant.customerTypes
		}],
		"documents":[{
			name: String,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			}
		}],
		"status": {
			type: String,
			enum: constant.customerStatus,
			default: "Active"
		},
		"designation_type": {
			type: String,
			enum: constant.designationType
		},
		"company_type": {
			type: String,
			enum: constant.companyType
		},
		"service_tax_no": String,
		"tin_no": String,
		"prim_contact_name": String,
		"prim_contact_designation": String,
		"prim_cont_no": Number,
		"sec_contact_name": String,
		"sec_contact_designation": String,
		"sec_cont_no": Number,
		"other_cont_no": Number,
		"prim_email": String,
		"alt_email1": String,
		"alt_email2": String,
		"fax": String,
		"website_address": String,
		"remarks": String,
		"black_listed": Boolean,
		"created_by_name": String,
		"created_by_employee_code": String,
		"sap_id": String,
		"sap_no": Number,
		"created_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"last_modified_by_name": String,
		"last_modified_employee_code": String,
		"last_modified_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"belongs_to": {
			type: String,
			enum: ["lms", "gps_management"],
			default: "lms"
		},
		'detentionDateRange': [{
			'start_day': Number,
			'end_day': Number,
			'label': String
		}],
		'detentionCharges': [{
			'vehicleTypeName': String,
			'dateRange': [{
				'start_day': Number,
				'end_day': Number,
				'label': String,
				'charge': Number
			}]
		}],
		"bank_details": [
			{
				"bank_name": String,
				"account_no": String,
				"account_type": String,
				"ifsc_code": String,
				"branch": String
			}
		],
		"gpsgaadi": {
			"role": {
				type: String
			},
			"name": {
				type: String
			},
			"mobile": {
				type: Number
			},
			"user_type": {
				type: String
			},
			"email": {
				type: String
			},
			"parent_user": {
				type: String
			},
			"type": {
				type: String
			},
			"user_id": {
				type: String
			},
			"access": {
				type: Boolean,
				default: true
			},
			"access_history": [
				{
					"access": Boolean,
					"reason": String,
					"more_info": String
				}
			],
			"activation_date": Date,
			"renewal_date": Date
		},
		"docs": {
			"pan": String,
			"adhaar": String,
			"tin": String,
		},
		"deleted": {
			"type": "Boolean",
			default: false
		},
	},
	constant.timeStamps
);

module.exports = mongoose.model('Customer', CustomerSchema);
