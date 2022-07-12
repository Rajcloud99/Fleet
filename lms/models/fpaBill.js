/**
 * Initial version by: kamal
 * Initial version created on: 07/03/19
 */

var FPASchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"type": {
			type: String,
			enum: constant.fpaType,
			default: 'Associate',
		},
		"billNo": Number,
		"billDate": Date,
		"dueDate": Date,
		"actualBillNo": String,
		"advanceReceived": Number,
		"branch": {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Branch"
		},
		"vendor": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'VendorTransport'
		},
		"plainVoucher":[{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'PlainVoucher'
		}],
		"items": [{
			"gr": {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'TripGr'
			},
			"remark": String,
			"comission_percent":Number,
			"freight": Number,
			"total":Number
		}],
		"settled": {
			type: Boolean,
			default: false
		},
		"cGST": Number,
		"sGST": Number,
		"iGST": Number,
		"cGST_percent": Number,
		"sGST_percent": Number,
		"iGST_percent": Number,
		amount: Number,
		paidAmount: {
			type: Number,
			default: 0
		},
		"totalAmount": Number,
		"advanceAsked": Number,
		"cancel_reason": String,
		"cancel_remark": String,
		"cancelled": {
			type: Boolean,
			default: false
		},
		"remarks":String,
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
			dueDate:Date,
			systemDate: Date,
			remark:String,
			user:String

		},
		"approve":{
			status:{
				type: Boolean,
				default: false
			},
			date:Date,
			user:String,
			reason: String,
			remark: String
		},
		"created_by": String
	},
	constant.timeStamps
);

require('../services/fpaBillService')(FPASchema);

FPASchema.pre('find', function () {
	this.populate({path: 'vendor',select:{name:1}});
	this.populate({path: 'branch',select:{name:1}});
	this.populate('items.gr');
});

let dontAllowToAddKeys = ["approve","dispatch","status","cancel_reason","cancel_remark","cancelled","billNo"];

FPASchema.pre("save", async function (next) {
	try {
		for(let key in this._doc){
			if(dontAllowToAddKeys.indexOf(key)>-1){
				delete this._doc[key];
			}
		}
		if (this.isNew) {
			const lastBill = await this.constructor.find({ clientId: this.clientId }, { billNo: 1 }).sort({ billNo: -1 }).limit(1);
			this.billNo = (lastBill && lastBill[0] && lastBill[0].billNo) ? (parseInt(lastBill[0].billNo) + 1) : 1;
			this.created_at = new Date();
		}
		this.last_modified_at = new Date();
		next();
	} catch (err) {
		next(err);
	}
});

module.exports = mongoose.model('fpaBill', FPASchema);
