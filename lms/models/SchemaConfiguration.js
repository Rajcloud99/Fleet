const mongoose = require('mongoose');

const schemaConfiguration = mongoose.Schema(
	{
		'clientId': constant.requiredString,
		'model': constant.requiredString,
		'customer': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer',
			_delta: true,
		},
		'billingParty': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billingparty',
			_delta: true,
		},
		'configs': {type:Object,
			_delta: true},
		'deleted': {type: Boolean, default: false}
	},
	{ ...constant.timeStamps, strict: true }
);

require('../services/schemaConfigurationService')(schemaConfiguration);

module.exports = mongoose.model('schemaconfigurations', schemaConfiguration, 'schemaconfigurations');
