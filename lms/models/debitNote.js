let mongoose = require('mongoose');

let DebitNote = new mongoose.Schema(
	{
		debitNo: constant.requiredString,
		clientId: constant.requiredString,
		date: Date,
		createdBy: String,
		lastModifiedBy: String,
		narration: String,
		debitStationaryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billStationary'
		},
		vendor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'VendorTransport'
		},
		vendorName:constant.requiredString,
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		purBillNo: String,
		purBillRefNo: String,
		purBillRef: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'purchaseBill'
		},
		items: [{
			HSNCode: String,
			material: String,
			deductionType: String,
			dedAccName: String,
			deductionAccount: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts',
			},
			quantity: Number,
			rate: Number,
			remark: String,
			amount: Number,
			cGST: Number,
			sGST: Number,
			iGST: Number,
			cGSTPercent: Number,
			sGSTPercent: Number,
			iGSTPercent: Number,
			gstPercent: Number,
			totalAmount: Number

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
		amount: Number,
		cGST: Number,
		sGST: Number,
		iGST: Number,
		gstPercent: Number,
		cGSTPercent: Number,
		sGSTPercent: Number,
		iGSTPercent: Number,
		totalAmount: Number
	},
	constant.timeStamps
);

DebitNote.index({debitNo: 1, clientId: 1}, {unique: true});
module.exports = mongoose.model('DebitNote', DebitNote);
