'use strict';

const mongoose = require('mongoose');

const ALLOWED_FIELDS = ['clientId', 'model', 'customer', 'billingParty'];

function constructQueryFilter(obj) {
	const o = {
		deleted: {
			$ne: true
		}
	};
	for (key in obj) {
		if (obj.hasOwnProperty(key) && (ALLOWED_FIELDS.indexOf(key) >= 0)) {
			if (key === 'customer' || key === 'billingParty') {
				o[key] = mongoose.Types.ObjectId(obj[key]);
			} else {
				o[key] = obj[key];
			}
		}
	}
	return o;
}

module.exports = function(schemaConfiguration) {

	schemaConfiguration.statics.upsert = async function (obj) {
		const oQuery = constructQueryFilter(obj);
		const op =  await this.findOneAndUpdate(oQuery, obj, { upsert: true, new: true }).lean();
		let model, id;
		if(oQuery.customer) {
			model = 'Customer';
			id = oQuery.customer;
		}
		if(oQuery.billingParty) {
			model = 'billingparty';
			id = oQuery.billingParty;
		}
		return mongoose.model(model).findByIdAndUpdate(
			id,
			{ $set: {
				[`configs.${oQuery.model}`]: op._id,
					lastUpdateConfigsBy: obj.userName,
					lastUpdateConfigsAt: new Date()
			} },
			{ new: true }
		);
	};

};
