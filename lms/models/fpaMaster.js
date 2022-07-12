const mongoose = require('mongoose');

const fpaMasterSchema = new mongoose.Schema({
	clientId: constant.requiredString,
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'VendorTransport',
		required: true
	},
	vendor_name: {
		type: String,
		required: true
	},
	customer_name: {
		type: String,
	},
	customer: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Customer'
	},
	date: {
		type: Date,
		required: true
	},
	rate: {
		type: Number,
		required: true
	},
	type: {
		type: String,
		enum: ['Commission', 'Other']
	},
	created_by:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	}
}, constant.timeStamps);

require('../services/fpaMasterService')(fpaMasterSchema);

module.exports = mongoose.model('fpamaster', fpaMasterSchema, 'fpamaster');
