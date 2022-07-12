var mongoose = require('mongoose');
var validator = require('validator');

var GRSchema = new mongoose.Schema({
		'clientId': constant.requiredString,
		'branch_name': String,
		format: {
			type: String,
			regex: /{\d{0,5}}/
		},
		'isCentralized': {'type': Boolean, default: false},
		'isActive': {'type': Boolean, default: false},
		'grCode': String,
		'grSeries': String,
		'branch_code': String,
		'branch': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		'gr_no_start': Number,
		'gr_no_end': Number,
		'book_no': Number,
		'book_year': Number,
		remark: String,
		created_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		created_at: {
			type: Date,
			default: Date.now()
		}
	}
);
module.exports = mongoose.model('gr', GRSchema);
