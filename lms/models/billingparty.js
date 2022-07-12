

let mongoose = require('mongoose');

let BillingParty = new mongoose.Schema({

	clientId : constant.requiredString,
	'clientR': [String],
	name: {
		type:String,
		required:true
	},
	courierAddress:String,
	"account": {
		type: mongoose.Schema.Types.ObjectId,
		ref: "accounts"
	},
	"withHoldAccount": {
		type: mongoose.Schema.Types.ObjectId,
		ref: "accounts"
	},
	"cnBook": [{
		ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
		name: String,
	}],
	billBook: [{
		ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
		name: String,
		branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
		branchName: String,
	}],
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

	"billTemplate": [{
		name: String,
		key: String,
		type: {
			type: String
		},
	}],
	segment_type: String,
	billName : String,
	address : String,
	address2 : String,
	address3 : String,
	contact_person : String,
	contact_number : Number,
	gstin : String,
	isdgst : String,
	state_code : Number,
	state_name : String,
	state_name_code : String,
	businessLocation : String,
	pan_number : String,
	cin_number : String,
	reverse_charge : String,
	category:
		{
			type : String,
			enum:constant.gst_category
		},
	percent:
		{
			type : String,
			enum:constant.gst_percent
		},

	billing_dates: { 'type': Date },
	email : String,
	created_by: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	customer: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Customer'
	}],
	billingBranch:{
		refId: {type: mongoose.Schema.Types.ObjectId, ref: 'Branch'},
		name:String
	},
	last_modified_by_name: String,
	last_modified_employee_code: String,
	last_modified_by: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	"group" : {
		type: String,
			enum : ['Freight Corporation','Fleet Carrier', 'Export', 'Misc. Fleet', 'ToPay Freight']
	},
	"isCustomer": {
		type: Boolean,
		default: false
	},
	"isConsignor": {
		type: Boolean,
		default: false
	},
	"isConsignee": {
		type: Boolean,
		default: false
	},

}, constant.timeStamps);

module.exports = mongoose.model("billingparty",BillingParty);
