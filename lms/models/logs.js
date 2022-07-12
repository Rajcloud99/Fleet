let mongoose = require('mongoose');

let Logs = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		uif: String, //Unique Identifier
		docId: {
			type: mongoose.Schema.Types.ObjectId,
			// type: String,
			required: false
		},
		docDate: Date,
		deleteRemark : String,
		refTo: constant.requiredString, // collection reference
		category: constant.requiredString,
		subCategory: String,
		dwnldLnk: String, // Download Link
		time: {
			type: Date,
			default: Date.now()
		},
		delta: constant.requiredString,
		user: {
			type: String,
			required: true
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		action: {
			tsNo: Number,
			trip_no: Number,
			refNo: String,
			addedUser: String,
			datetime: Date,
			remark: String,
			remarkByUser: String,
			remarkDatetime: Date,
			isActioned:{type: Boolean, default: false}
		}
	},
	constant.timeStamps
);


module.exports = mongoose.model('Logs', Logs);
