var mongoose = require('mongoose');
var validator = require('validator');

var GRstatusSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"branch_name": String,
		"branch_code": String,
		"customer_name": String,
		"isCentralized": {'type': Boolean, default: false},
		"grCode": String,
		"grSeries": String,
		"book_no": Number,
		"book_year": Number,
		"branch": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		"gr": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'TripGr'
		},
		"tripId": String,
		"trip_no": Number,
		"bookingId": String,
		"booking_no": Number,
		"gr_no": String,
		"centralized_gr_no": String,
		"gr_type": {
			type: String,
			enum: constant.gr_types
		},
		"gr_Status": {
			type: String,
			enum: ['Used', 'Cancelled', 'Approved', 'Unallocated'],
			default: 'Used'
		},
		history: [{
			title: String,
			person: String,
			reason: String,
			time: String,
			remark: String
		}]
	}
);
module.exports = mongoose.model('grStatus', GRstatusSchema);
