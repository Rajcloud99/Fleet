
let mongoose = require('mongoose');

let CoverNoteSchema = new mongoose.Schema(
	{
		unNo: Number,
		cnNo: String,
		date: Date,
		clientId: constant.requiredString,
		remark: String,
		poNo: String,
		systemDate: Date,
		lastModified: {
			date: Date,
			user: String
		},
		user: String,
		billingParty: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billingparty'
		},
		customer: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		bills: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'bill'
		}],
	},
	constant.timeStamps
);

module.exports = mongoose.model('CoverNote', CoverNoteSchema);
