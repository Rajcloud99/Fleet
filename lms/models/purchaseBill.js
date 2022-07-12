var PurchaseBillSchema = new mongoose.Schema({
		clientId: constant.requiredString,
		vendor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'VendorTransport'
		},
		vendorFuel: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'VendorFuel'
		},
		account: { // vendor Account
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts',
			required: true
		},
		multiBill: Boolean,
		approved_by: String,
		approved_at: Date,
		tdsRate: Number,
		tcsRate: Number,
		gstn: String,
		state_name: String,
		state_code: String,
		prchType: String,
		partyType: String,
		advanceType: {
			type: String,
			enum: constant.aAdvanceType,
		},
		billType: {
			type: String,
			enum: ['Maintenance', 'Spare', 'Tyre', 'FPA', 'Printing', 'Diesel', 'Assets', 'Dues Bill', 'lorry Hire']
		},
		vchType: {
			type: String,
			enum: ['Journal', 'Purchase']
		},
		plainVoucher: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'voucher'
		},
		billDate: Date,
		actulDate: Date,
		billNo: constant.requiredString,
		itemsType: {
			type: String,
			enum: ['tripadvances', 'materials', 'assets', 'dues'],
			default: 'tripadvances'
		},
		ltr: Number,
		remMatQty: Number,
		items: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'tripadvances'
		}],
		materialItems: [{
			_id: {type: mongoose.Schema.Types.ObjectId, ref: 'MaterialType'},
			quantity: {type: Number, required: true},
			rate: {type: Number, required: true},
			unit: {type: String, required: true},
			total: {type: Number, required: true},
			totalWithoutTax: {type: Number, required: true},
			discount: Number,
			name: String,
			code: String,
			material: String,
			hsnCode: String,
			desc: String,
			iGST: Number,
			iGSTPercent: Number,
			cGST: Number,
			cGSTPercent: Number,
			sGST: Number,
			sGSTPercent: Number,
			gstPercent: Number,
			frgt: Number,
			frgtIGST: Number,
			frgtIGSTPercent: Number,
			frgtCGST: Number,
			frgtCGSTPercent: Number,
			frgtSGST: Number,
			frgtSGSTPercent: Number,
			vehicle_no: String,
			remark: String,
		}],
		labRepItems: [{
			quantity: {type: Number, required: true},
			amount: {type: Number, required: true}, // rate
			type: {type: String, required: true},
			total: {type: Number, required: true}, // totalWithoutTax + tax
			totalWithoutTax: {type: Number, required: true}, // rate * quantity
			tds: {type: Boolean, default: false},
			discount: Number,
			vehicle_no: String,
			remark: String,
			sacCode: String,
			vehType: String,
			vehAcc: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts'
			},
			vehOwnerName: String,
			iGST: Number,
			iGSTPercent: Number,
			cGST: Number,
			cGSTPercent: Number,
			sGST: Number,
			sGSTPercent: Number,
			gstPercent: Number,
		}],
		assetItems: [{
			_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Assets'},
			accountId: String,
			accountName: String,
			name: String,
			qty: Number,
			rate: Number,
			amount: Number,
			amountWithTax: Number,
			discount: Number,
			uId: [{
				uId: String,
				status: {type: String, enum: ['Own', 'Sold']},
			}],
			iGST: Number,
			iGSTPercent: Number,
			cGST: Number,
			cGSTPercent: Number,
			sGST: Number,
			sGSTPercent: Number,
			gstPercent: Number,
		}],
		duesBillItems: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'dues'
		}],
		from_account: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		refNo: constant.requiredString,
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		stationaryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billStationary'
		},
		debitNo: String,
		dNoteRef: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "DebitNote"
		},
		deduction: [{
			hsnCode: String,
			material: String,
			deductionType: constant.requiredString,
			dedAccName: String,
			deductionAccount: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts',
			},
			quantity: constant.requiredNumber,
			rate: constant.requiredNumber,
			remark: String,
			amount: constant.requiredNumber,
			cGST: Number,
			sGST: Number,
			iGST: Number,
			cGSTPercent: Number,
			sGSTPercent: Number,
			iGSTPercent: Number,
			gstPercent: constant.requiredNumber,
			totalAmount: constant.requiredNumber
		}],
		aDiscount: [{
			amount: {
				type: Number,
				default: 0
			},
			accountRef: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts'
			},
			accountName: String,
			remark: String,
			voucherRef: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'voucher'
			}
		}],
	    vehicleExp: [{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'voucher'
		}],
		remAmount: {               // billAmount - sum of vehicleExp amount
			type: Number,
		},
		totDiscount: {
			type: Number,
			default: 0
		},
		totMaterial: {
			type: Number,
			default: 0
		},
		totAssets: {
			type: Number,
			default: 0
		},
		totItem: {
			type: Number,
			default: 0
		},
		totDues: {
			type: Number,
			default: 0
		},
		cGST: {
			type: Number,
			default: 0
		},
		cGSTPercent: {
			type: Number,
			default: 0
		},
		cgstAcnt: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		iGST: {
			type: Number,
			default: 0
		},
		iGSTPercent: {
			type: Number,
			default: 0
		},
		igstAcnt: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		sGST: {
			type: Number,
			default: 0
		},
		sGSTPercent: {
			type: Number,
			default: 0
		},
		sgstAcnt: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		amount: { // Amount without GST
			type: Number,
			default: 0
		},
		paidAmount: { // Amount paid i.e. sum of all voucher amount
			type: Number,
			default: 0
		},
		adjDebitAc: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		labourAcName: String,
		labourAc: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		tdsAcName: String,
		tdsAc: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		tcsAcName: String,
		tcsAc: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		discountAcName: String,
		discountAcnt: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		tdsAmt: Number, // tds Amount
		tcsAmt: Number, // tds Amount
		labourAmt: Number, // labour Amount
		totalAmount: Number, // Amount with TAX
		billAmount: Number, // Some Calculation's on totalAmount
		debitAmount: Number, // Some Calculation's on debitAmount
		remainingAmount: Number, // Some Calculation's on purchaseamount - debitamount
		adjAmount: Number, // billAmount - totalAmount
		remark: String,
		createdBy: {
			date: Date,
			name: String,
			userId: String
		},
		lastModifiedBy: {
			date: Date,
			name: String,
			userId: String
		},
	},
	constant.timeStamps
);

PurchaseBillSchema.index({refNo: 1, clientId: 1, bill_no: 1}, {unique: true});

module.exports = mongoose.model('purchaseBill', PurchaseBillSchema);
