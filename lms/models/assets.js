/**
 * Created by Harikesh on 13/4/2020.
 */

var mongoose = require('mongoose');

var assetsSchema = new mongoose.Schema(
	{
		// Assets name
		clientId: constant.requiredString,
		name: String,                     // Assets name
		user: String,
		category: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "assetsCategory"
		},
		purBill: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "purchaseBill"
		},
		assetsAc: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		depreciationAc: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		physicalStatus: {
			type: String,
			enum: constant.physicalStatuses,
			default: 'Normal',
		},
		method: {type: String, enum: ['SLM', 'WDM']},       // Assets depreciation Method
		unit: {type: String, enum: ['Pcs', 'Dozen', 'Kg', 'Packet', 'Ltr']},
		location: String,
		date: Date,
		depreRateCRate: Number,        //  depreciation CRate
		depreRateItRate: Number,       //  depreciation ITRate
		qty: Number,                   //  Assets qty
		rate: Number,                  //  Assets rate
		amount: Number,                //  Assets originalPurCost
		bookBalanceLife: Number,       //  Assets depreciation Life
		itActNetVal: Number,                // (amount - itActAccumDep)
		cActNetVal: Number,                // (amount - cActAccumDep)
		itActAccumDep: Number,      // Accumulated depreciation of sum of itAct depreciation amount
		cActAccumDep: Number,      // Accumulated depreciation sum of cAct depreciation amount
		uId: [{
			uId: String,
			status: {type: String, enum: ['Own', 'Sold']},
		}],
		deleted: {
			type: Boolean,
			default: false
		},
		depreciation: [{
				date: Date,
			    itAcum: Number,
			    cAcum: Number,
				voucher: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Voucher'
				}
		      }],
		his: [{
			typ: String,
			by: String,
			at: Date,
			rmk: String,
		}]
	},
	constant.timeStamps
);
assetsSchema.index({uId: 1, clientId: 1,deleted:1}, {unique: true});

module.exports = mongoose.model('Assets', assetsSchema);
