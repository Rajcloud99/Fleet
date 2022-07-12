const {check, body} = require('express-validator/check');

module.exports = {
	returnFromCustomer: [
		body('customer')
			.exists().withMessage('Customer _id must be provided'),
		body('devices')
			.exists().withMessage('Devices list should be provided')
			.isArray().withMessage('Devices list should be an array')
	],
	replaceDevice: [
		body('customer')
			.exists().withMessage('Customer _id must be provided'),
		body('devices')
			.exists().withMessage('Devices list should be provided')
			.isArray().withMessage('Devices list should be an array'),
		body('new_devices')
			.exists().withMessage('New Devices list should be provided')
			.isArray().withMessage('New Devices list should be an array')
	]
};
