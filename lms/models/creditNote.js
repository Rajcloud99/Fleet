let mongoose = require('mongoose');

let CreditNote = new mongoose.Schema(
	{
		creditNo: constant.requiredString,
		clientId: constant.requiredString,
		date: Date,
		createdBy: String,
		lastModifiedBy: String,
		narration: String,
		category: {
			type: String,
			enum: ['Full', 'Full(Gr Reversal)', 'Partial'],
			default: 'Partial'
		},
		genRevVch: Boolean, //if True then the voucher entry is reverse of bill Acknowledge entry else normal withHoldAccount deduction voucher is generated
		creditStationaryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billStationary'
		},
		billingParty: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billingparty'
		},
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		billNo: String,
		billRef: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'bill'
		},
		grs: [{
			grNumber: String,
			grRef: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'TripGr'
			},
			deductionType: String,
			dedAccName: String,
			deductionAccount: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts',
			},
			remark: String,
			amount: Number // this amount is inclusive of tax and ∑(grs.amount) is equal to totalAmount
		}],
		cGSTAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		sGSTAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		iGSTAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		voucher: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'voucher'
		},
		"adjDebitAc": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		"adjDebitAcName": String,
		// billrevVch: {
		// 	type: mongoose.Schema.Types.ObjectId,
		// 	ref: 'voucher'
		// },
		// cGSTVoucher: {
		// 	type: mongoose.Schema.Types.ObjectId,
		// 	ref: 'PlainVoucher'
		// },
		// sGSTVoucher: {
		// 	type: mongoose.Schema.Types.ObjectId,
		// 	ref: 'PlainVoucher'
		// },
		// iGSTVoucher: {
		// 	type: mongoose.Schema.Types.ObjectId,
		// 	ref: 'PlainVoucher'
		// },
		amount: Number,
		adjAmount: Number,
		cGST: Number,
		sGST: Number,
		iGST: Number,
		cGSTPercent: Number,
		sGSTPercent: Number,
		iGSTPercent: Number,
		totalAmount: Number,
		isMiscCreditNote: {
			type: Boolean,
			default: false
		},
	},
	constant.timeStamps
);

CreditNote.index({creditNo: 1, clientId: 1}, {unique: true});
module.exports = mongoose.model('CreditNote', CreditNote);
