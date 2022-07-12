var mongoose = require ('mongoose');

var BillStationary = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		bookNo: constant.requiredString,
		unformattedBookNo: Number,
		billBookId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billBook',
			required: true
		},
		type: {
			type: String,
			enum: constant.billBookType,
			required: true
		},
		status: {
			type: String,
			enum: 'unused',
			required: true,
		},
		disable: Boolean,
		min: Number,
		max: Number,
		startDate: Date,
		endDate: Date,
		deleted: {
			type: Boolean,
			default: false
		},
		linkedTo: String,
		commonHistory: [{
			user: String,
			date: Date,
			remark: String,
			status: String,
			wasLinkedTo: String,
			wasLinkedToSchema: String,
		}]
	},
	constant.timeStamps
);

BillStationary.index({bookNo: 1, clientId: 1}, {unique: true});

module.exports = mongoose.model('billStationary', BillStationary);
