let mongoose = require('mongoose');

let MoneyReceipt = new mongoose.Schema(
	{
		mrNo: constant.requiredString,
		clientId: constant.requiredString,
		date: Date,
		createdBy: String,
		lastModifiedBy: String,
		narration: String,
		isVchAlGen: { // if "true" then the voucher is first generated and pull to Money Receipt, else if "False" the Voucher is generated after the Money Receipt
			type: Boolean,
			default: false
		},
		pulledVchClone: String,
		stationaryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billStationary'
		},
		billingParty: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billingparty'
		},
		bpNam: String, // Billing party name
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Branch"
		},
		paymentMode: String,
		paymentRef: String,
		mrReceiving: {
			type: String,
			default: 'grWise'
		},
		billReceiving: [{
			billNo: constant.requiredString,
			billRef: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'bill'
			},
			bP: {	// Billing party Ref
				type: mongoose.Schema.Types.ObjectId,
				ref: 'billingparty'
			},
			bpNam: String, // Billing party name
			bpAcc: {	// Billing party Ref
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts'
			},
			bpAccNam: String, // Billing party name
			totReceived: Number,
		}],
		receiving: [{
			billNo: constant.requiredString,
			billRef: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'bill'
			},
			bP: {	// Billing party Ref
				type: mongoose.Schema.Types.ObjectId,
				ref: 'billingparty'
			},
			bpNam: String, // Billing party name
			bpAcc: {	// Billing party Ref
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts'
			},
			bpAccNam: String, // Billing party name
			grNumber: String,
			grRef: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'TripGr'
			},
			totReceived: Number,
			deduction: [{
				type: {
					type: String
				},
				amount: Number,
				remark: String,
				account: {
					_id: {
						type: mongoose.Schema.Types.ObjectId,
						ref: "accounts"
					},
					name: String,
				},
				costCenter: {
					_id: {
						type: mongoose.Schema.Types.ObjectId,
						ref: "costCenter"
					},
					name: String,
					category: String
				}
			}],
			totalDeduction: Number, // sum of all (deduction.amount)
			tdsAmt: Number, // tds receiving
		}],
		extCharges: [{
			billNo: String,
			amt: Number,
			rmk: String
		}],
		extCharges2: [{
			billNo: String,
			amt: Number,
			rmk: String
		}],
		receivedAmount: Number,
		totBillReceiving: Number, // receiving on entire bill, sum of all (receiving.totReceived)
		totBillDedReceiving: Number, // receiving on entire bill, sum of all (receiving.totalDeduction)
		totTdsAmount: Number, // tds Receiving
		totExtChargeAmount: Number, // Extra Charge Receiving
		totExtChargeAmount2: Number, // Extra Charge Receiving
		adviceAmount: Number, // Total Received Amount on MR, sum of (totBillReceiving + totBillDedReceiving + tdsAmount + extChargeAmount)
		adjAmt: Number, // Adjustment Amount

	//	A/c's and Voucher's\
		bpAccNam: String, // Billing Party Account Name
		bpAcc:{	// Billing Party Account Ref
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		bankAccountName: String,
		bankAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		tdsAccountName: String,
		tdsAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		extChargeAccountName: String,
		extChargeAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		extChargeAccountName2: String,
		extChargeAccount2: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		dedAccNam: String, // deduction A/c Name
		dedAcc: {	// deduction A/c ref
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		adjAccNam: String, // deduction A/c Name
		adjAcc: {	// deduction A/c ref
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		vch: { // receipt voucher from Billing Party to Bank A/c
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Voucher'
		}
	},
	constant.timeStamps
);
MoneyReceipt.index({mrNo: 1, clientId: 1}, {unique: true});
module.exports = mongoose.model('MoneyReceipt', MoneyReceipt);
