'use strict';

const mongoose = require('mongoose');
const collectionName = 'vendorrates';

const vendorRatesSchema = new mongoose.Schema({
	'clientId': constant.requiredString,
	'vendor': {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'VendorTransport'
	},
	'routes': [{
		'route': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'TransportRoute'
		},
		'vehicleTypes': [{
			'vehicleType': {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'VehicleType'
			},
			'rates': Number, //ratePerTrip
			'ratePerMT': Number,
			'ratePerUnit': Number,
			'minPayableAmt': Number,
		}]
	}],
}, constant.timestamps);


module.exports = mongoose.model(collectionName, vendorRatesSchema, collectionName);
