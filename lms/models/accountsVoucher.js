/**
 * Initial version by: Nipun Bhardwaj
 * Initial version created on: 19/03/18
 */

let mongoose = require ('mongoose');

let AccountVoucher = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		vId: String,
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		from: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts",
			required: true
		},
		to: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts",
			required: true
		},
		fromClosing: Number,
		toClosing: Number,
		type: {
			type: String,
			enum: constant.voucherType,
			required: true
		},
		amount: {
			type: Number,
			required: true
		},
		date:Date,
		refNo: String,
		narration: String,
		systemGenerated: Boolean,
		created_by:{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		deleted:{
			type:Boolean,
			default:false
		},
		uuid: String,
		billNo: String,
		billType: String,
		crRef: String,
		crBillNo: String,

	},
	constant.timeStamps
);

AccountVoucher.pre('find', function () {
	this.populate('from');
	this.populate('to');
	this.populate({
		path: 'created_by',
		select: {'userId':1,'full_name':1}
	});
});

module.exports = mongoose.model('accountVoucher', AccountVoucher);
