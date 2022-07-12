const GenBill = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"category": {
			type: String,
			// required: true
		},
		"billNo": String,
		"billDate": Date,
		"dueDate": Date,
		"subDate": Date, // submission date
		stationaryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billStationary'
		},
		"branch": {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Branch"
		},
		"billingParty": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billingparty'
		},
		"recDate": Date, // received Date
		"batchNum": String,
		"sellerName": String,
		"src": String, // source
		"destination": String, // destination
		"rutDis": Number, // route distance
		"items": [{
			name: constant.requiredString,
			// desc: constant.requiredString,
			hsn: constant.requiredString,
			qty: constant.requiredNumber,
			qtyUnit: {
				type: String,
			}, // like - 'Pcs, Box etc'
			amount: constant.requiredNumber,
			subTotal: constant.requiredNumber,  //amount * qty
			iGST: Number,
			iGSTPercent: Number,
			cGST: Number,
			cGSTPercent: Number,
			sGST: Number,
			sGSTPercent: Number,
			gstPercent: Number,
			amountWithTax: constant.requiredNumber,
			discount: Number,
			vehicle_no: String,
		}],
		"fromDate": Date,
		"toDate": Date,
		"amount": Number,
		"amountWithTax": Number,
		"cGST": Number,
		"sGST": Number,
		"iGST": Number,
		"billAmt":Number,
		"totDiscount":Number,
		"cancel_reason": String,
		"cancel_remark": String,
		"cancelled": {
			type: Boolean,
			default: false
		},
		"remark":String,
		"status": {
			type: String,
			enum: constant.billStatus,
			default: constant.billStatus[0]
		},
		"acknowledge":{
			status:{
				type:Boolean,
				default:false
			},
			date: Date,
			systemDate: Date,
			remark:String,
			salesAccount: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts"
			},
			iGSTAccount: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts"
			},
			cGSTAccount: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts"
			},
			sGSTAccount: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts"
			},
			voucher: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'voucher'
			},
			discountAcName: String,
			discountAcnt: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts'
			},
			user:{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			}
		},
		"created_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"created_by_name": String
	},
	constant.timeStamps
);

GenBill.index({billNo: 1, clientId: 1}, {unique: true, partialFilterExpression: {cancelled: {$eq: false}}});

module.exports = mongoose.model('genBill', GenBill);
