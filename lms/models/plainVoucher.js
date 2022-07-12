/**
 * Initial version by: Dev
 * Initial version created on: 12/03/19
 */

let mongoose = require('mongoose');

let PlainVoucherSchema = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		PlainVoucherId: constant.requiredUniqueNumber,
		pvId: constant.requiredString,
		uuid: String,
		sv: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'PlainVoucher'
		}],
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		voucher: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accountVoucher'
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
		stationaryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "billStationary"
		},
		paymentType: String,
		paymentMode: String,
		paymentRef: String,
		paymentDate: Date,
		amount: {
			type: Number,
			required: true
		},
		isEditable: {
			type:Boolean,
			default: true
		},
		export: {
			toTally: {
				by: String,
				at: Date,
			},
			toLMSAccounting: {
				by: String,
				at: Date,
			},
		},
		billDate:Date,
		chequeDate:Date,
		refNo: String,
		refNoInt: Number,
		refNoWord: String,
		billNo: String,
		billType: String,
		crRef: String,
		crBillNo: String,
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
		reversed:{
			type:Boolean,
			default:false
		},
		reverseHistory: [{
			remark: String,
			reversed_by: String,
			reversed_at: Date,
		}],
		remAmt:Number,
		payments:[{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'PlainVoucher'
		}],
		bill:{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'PlainVoucher'
		},
		trackPayAs:String,
		multi:String,
		dpV: Date,
		nvch:{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Voucher'
		}
	},
	constant.timeStamps
);

PlainVoucherSchema.pre('find', function () {
	this.populate('from');
	this.populate('to');
	this.populate('branch');
	this.populate({
		path: 'created_by',
		select: {'userId':1,'full_name':1}
	});
});

module.exports = mongoose.model('PlainVoucher', PlainVoucherSchema);
