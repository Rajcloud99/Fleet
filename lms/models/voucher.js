/**
 * Initial version by: Kamal
 * Initial version created on: 11/08/19
 */

let mongoose = require('mongoose');

const COST_CENTER = {
	category: String,
	categoryId:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'costCategory',
	},
	center: [{
		centerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'costCenter',
		},
		name: String,
		amount: Number
	}]
};

let Voucher = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		refNo: {
			type: String,
			required: true,
			_delta: true
		},
		refNoInt: {
			type: Number,
			_delta: true
		},
		refNoWord: {
			type: String,
			_delta: true
		},
		vT: {//replace by paymentType key
			type: String,
			required: true,
			_delta: true
		},
		bSer: {
			type:String,
			//required:true,
			enum: constant.billServices
		},
		date:{
			type:Date,
			required:true,
			_delta: true
		},
		chequeDate: {
			type: Date,
			_delta: true
		},
		chequeClear: {
			date: Date,
			rem: String
		},
		narration: {
			type: String,
			_delta: true
		},
		uuid: String,
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch',
			_delta: true
		},
		branchName: String,
		type: {
			type: String,
			// enum: constant.voucherType,
			required: true,
			_delta: true
		},
		stationaryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "billStationary",
			_delta: true
		},
		from_date: {
			type: Date,
			_delta: true
		},
		to_date: {
			type: Date,
			_delta: true
		},
		link: Object,
		ledgers:[{
			account:{
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts",
				required: true,
				_delta: true
			},
			lName:{
				type: String,
				required: true,
				_delta: true
			},
			laName: {	//associate name in tally
				type: String,
				_delta: true
			},
			amount: {
				type: Number,
				required: true,
				_delta: true
			},
			cRdR:{
				type: String,
				required: true,
				_delta: true
			},
			tdsRate: Number,
			tdsAmount: Number,
			bills:[{
				billNo:  {
					type: String,
					_delta: true
				},
				billType:  {
					type: String,
					_delta: true
				},
				amount: {
					type: Number,
					_delta: true
				},
				dueDate:  {
					type: Date,
					_delta: true
				},
				remAmt: {
					type: Number,
					_delta: true
				},
			}],
			costCategory: [COST_CENTER]
		}],
		paymentMode: {
			type: String,
			_delta: true
		},
		paymentRef: {
			type: String,
			_delta: true
		},
		chequeNo: {
			type: String,
			_delta: true
		},
		isEditable: {
			type:Boolean,
			default: true,
			_delta: true
		},
		drPay: { // driver payment
			rate: Number,
			liter: Number
		},
		tdsCategory: {
			type: String,
			enum: constant.tdsCategory,
		},
		tdsSources: {
			type: String,
			enum: constant.tdsSource.source,
		},
		tdsSection: {
			type: String,
			enum: constant.tdsSource.section,
		},
		tdsVoucher :{
			paid: {
				type:Boolean,
				default: false,
				_delta: true
			},
			by:{
				type: String,
				_delta: true
			},
			at: {
				type: Date,
				_delta: true
			},
			payment: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'voucher'
			},
		},
		acImp:{
			st:{
				type:Boolean,
				default:false,
				_delta: true
			},
			ipr:{
				type:Boolean,
				default:false,
				_delta: true
			},
			by:{
				type: String,
				_delta: true
			},
			at: {
				type: Date,
				_delta: true
			}
		},
		acExp:{
			st: {
				type:Boolean,
				default:false,
				_delta: true
			},
			by: {
				type: String,
				_delta: true
			},
			at: {
				type: Date,
				_delta: true
			}
		},
		systemGenerated: Boolean,
		deleted:{
			type:Boolean,
			default:false
		},
		reversed:{
			type:Boolean,
			default:false,
			_delta: true
		},
		isRev:{//voucher which generated from voucher page can reverse from here
			type:Boolean,
			default:true,
			_delta: true
		},
		his: [{
			remark: String,
			by: String,
			at: Date,
			cat:String
		}],
		upload: {
			creUpld: Boolean, // "Created on Upload"
			edtUpld: Boolean, // "Edited while Uploading"
		},
		trackPayAs: String,
		createdBy: String,
		last_modified_by_name: String,
		a_id:[{//old plain voucher id to restore data
			type: mongoose.Schema.Types.ObjectId,
			ref: 'PlainVoucher'
		}],
		gr: {
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'TripGr'
			},
			grNumber: String
		},
		vehicleExp:{
			gstType: String,
			purchaseBill: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'purchaseBill'
			},
			purchaseBillNo: String,
			creditAcntName: String,
			creditAcnt: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts"
			},
			labourAcName: String,
			labourAc: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts'
			},
			igstAcntName: String,
			igstAcnt: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts"
			},
			cgstAcntName: String,
			cgstAcnt: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts"
			},
			sgstAcntName: String,
			sgstAcnt: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "accounts"
			},
			totalWithoutTax: Number,
			totalWithTax: Number,
			labourAmt: Number,
			itemAmt: Number,
			iGST: Number,
			cGST: Number,
			sGST: Number,
			items: [{
				account: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'accounts'
				},
				accountName: String,
				vehicle: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'RegisteredVehicle'
				},
				vehicleNo: String,
				ownershipType: String,
				name: String,
				qty: Number,
				rate: Number,
				amount: Number,
				amountWithTax: Number,
				uId: String,
				iGST: Number,
				iGSTPercent: Number,
				cGST: Number,
				cGSTPercent: Number,
				sGST: Number,
				sGSTPercent: Number,
				gstPercent: Number,
			}],
			labRepItems: [{
				account: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'accounts'
				},
				accountName: String,
				vehicle: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'RegisteredVehicle'
				},
				vehicleNo: String,
				ownershipType: String,
				qty: {type: Number},
				rate: {type: Number}, // rate
				type: {type: String},
				total: {type: Number}, // totalWithoutTax + tax
				totalWithoutTax: {type: Number}, // rate * quantity
				iGST: Number,
				iGSTPercent: Number,
				cGST: Number,
				cGSTPercent: Number,
				sGST: Number,
				sGSTPercent: Number,
				gstPercent: Number,
			}],
		}
	},
	constant.timeStamps
);

Voucher.index({refNo: 1, clientId: 1,deleted:1}, {unique: true});

module.exports = mongoose.model('Voucher', Voucher);



