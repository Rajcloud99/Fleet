'use strict';

const mongoose = require('mongoose');
const collectionName = 'vendorquotes';

const vendorQuotesSchema = new mongoose.Schema({
	'clientId': constant.requiredString,
	'vendor': {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'VendorTransport'
	},
	'customer': {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Customer'
	},
	booking: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'BookingV2'
	},
	date:Date,
	'route': {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'TransportRoute'
	},
	'rname':String,
	'vt': {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'VehicleType'
	},
	'vehicleType':String,
	'finalised':{
		status:{
			type: Boolean,
			default: false
        },
		date:Date,
		by:String
	},
	history:[{
		finalised:{
			type: Boolean,
			default: false
		},
		date:Date,
		by:String
	}],
	'rate': Number, //ratePerTrip
	'pmtRate': Number,
	"perUnitPrice": Number,
	"totalUnits":Number,
	'minPayableAmt': Number,
	"pmtWeight": Number,
	advance: Number,
	toPay: Number,
	munshiyana:Number,
	total: Number,
	remark: String,
	advance_due_date: Date,
	topay_due_date: Date,
	weight_type: String,
	weightPercent: Number,
	payment_type: String,
	created_By: String,
	updated_By: String,
	status:{
		type: String,
		default: 'open'
	},
	closedReason: String,
}, constant.timestamps);


module.exports = mongoose.model(collectionName, vendorQuotesSchema, collectionName);
