const mongoose = require('mongoose');

const incentiveSchema = new mongoose.Schema({
	clientId: constant.requiredString,
	vehicle_no: {
		type: String,
		required: true
	},
	vehicle: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'RegisteredVehicle',
		required: true
	},
	customer_name: {
		type: String,
		required: true
	},
	customer: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Customer',
		required: true
	},
	effectiveStart: {
		type: Date,
		required: true
	},
	effectiveEnd: {
		type: Date,
		required: true
	},
	basis: {
		type: String,
		enum: ['Fixed', 'Percentage'],
		default: 'Percentage'
	},
	rate: {
		type: Number,
		required: true
	},
	created_by:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	}
}, constant.timeStamps);

require('../services/incentive.service')(incentiveSchema);

module.exports = mongoose.model('incentive', incentiveSchema, 'incentive');
