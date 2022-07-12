var mongoose = require ('mongoose');

var BillBook   = new mongoose.Schema({
		clientId: constant.requiredString,
		name: constant.requiredString,
		min: Number,
		max: Number,
		format: {
			type: String,
			regex: /{\d{0,5}}/,
			_delta: true,
		},
		current: {
			type: Number,
			default: 0
		},
		startDate: constant.requiredDate,
		endDate: constant.requiredDate,
		user: String,
		centralize: {
			type: Boolean,
			default: false
		},
		'auto': {
			type: Boolean,
			default: false
		},
		type: {
			type: String,
			enum: constant.billBookType,
			_delta: true,
		},
		branch: [{
			ref:  {type: mongoose.Schema.Types.ObjectId, ref: 'Branch'},
			name: String,
		}],
		deleted: {
			type: Boolean,
			default: false,
			_delta: true
		},
		isLinked: {
			type: Boolean,
			default: false,
		},
		lastModifiedBy: String
	},
	constant.timeStamps
);

module.exports = mongoose.model('billBook', BillBook);
