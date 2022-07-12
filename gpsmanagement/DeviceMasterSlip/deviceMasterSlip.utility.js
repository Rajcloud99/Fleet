'use strict';

const DeviceMasterSlip = require('./deviceMasterSlip.model');

const basePartCode = 1;

module.exports.generateSlipNumber = query => (
	DeviceMasterSlip
		.find(query)
		.sort({$natural: -1})
		.limit(1)
		.exec()
		.then(docs => {
			return (docs && docs.length > 0) ? `SLIP${parseInt(docs[0].slip_number.substr(4)) + 1}` : `SLIP${basePartCode}`;
		})
);
