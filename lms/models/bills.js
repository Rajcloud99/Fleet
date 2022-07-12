const mongoose = require("mongoose");
/**
 * Initial version by: Nipun Bhardwaj
 * Initial version created on: 09/02/18
 */

const COST_CENTER = {
	_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "costCenter"
	},
	name: String,
	category: String
};

const BillsSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"type": {
			type: String,
			enum: constant.billType,
			required: true
		},
		stationaryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billStationary'
		},
		"multiBill": Boolean,
		"billAmount":Number,
		"billNo": String,
		billNoInt: Number,
		billNoWord: String,
		"bno":Number,
		"actualBillNo": String,
		"billDate": Date,
		"dueDate": Date,
		"submitionDate": Date,
		"advanceRecived": Number,
		"tripNo": String,
		"vehicle_no": String,
		"sacCode": String,
		"coverNote": {
			unNo: Number,
			cnNo: String,
			coverNoteId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'CoverNote'
			}
		},
		receiving: {
			moneyReceipt: [{
				tmRef: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "accountVoucher"
				},
				tmRefNo: String,
				mrRef: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "MoneyReceipt"
				},
				grs: [{
					grRef: {
						type: mongoose.Schema.Types.ObjectId,
						ref: 'TripGr'
					},
					grNumber: String,
					tMemo: String,
					amount: Number,
				}],
				mrNo: String,
				amount: constant.requiredNumber,

			}],
			deduction: [{
				mrRef: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "MoneyReceipt"
				},
				cNoteRef: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "CreditNote"
				},
				grRef: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'TripGr'
				},
				dedAccName: String,
				deductionAccount: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'accounts',
				},
				grNumber: String,
				mrNo: String,
				creditNo: String,
				deductionType: constant.requiredString,
				amount: constant.requiredNumber,
				genFrom: { // it checks from where the deduction is generated from
					type: String,
					requied: true,
					enum: ['cn', 'mr']
				}
			}]
		},
		"refNo": String,
		"branch": {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Branch"
		},
		branchName: String,
		ccBranch: COST_CENTER, // branch cost center
		"billingParty": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'billingparty'
		},
		"reciveDate": Date,
		"batchNumber": String,
		"source": String,
		"destination": String,
		"routeDistance": Number,
		"vouchers":[{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accountVoucher'
		}],
		"items": [{
			"gr": {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'TripGr'
			},
			"grData": {},
			"cwt": Number, // charges without tax
			"totFreight": Number,
			selectedSupply: [{
				type:String
			}],
			ccVehicle: COST_CENTER, // vehicle cost center
			supplementaryBill: {
				basicFreight: Number,
				totalCharges: Number,
				totalDeduction: Number,
				charges: {
					'grCharges': Number,
					'surCharges': Number,
					'cartageCharges': Number,
					'labourCharges': Number,
					'prevFreightCharges': Number,
					'detentionLoading': Number,
					'detentionUnloading': Number,
					'loading_charges': Number,
					'unloading_charges': Number,
					'weightman_charges': Number,
					'overweight_charges': Number,
					'other_charges': Number,
					'extra_running': Number,
					'dala_charges': Number,
					'diesel_charges': Number,
					'kanta_charges': Number,
					'factory_halt': Number,
					'company_halt': Number,
					'toll_charges': Number,
					'green_tax': Number,
					'twoPtDelivery': Number
				},
				deduction: {
					'penalty': Number,
					'shortage': Number,
					'damage': Number,
					'discount': Number,
					'advance_charges': Number,
					'ttDelay': Number
				}
			},
		}],
		"settled": {
			type: Boolean,
			default: false
		},
		'detentionCharges': [{
			'vehicleTypeName': String,
			'dateRange':[{
				'start_day': Number,
				'end_day': Number,
				'label': String,
				'charge': Number
			}],
		}],
		"fromDate": Date,
		"toDate": Date,
		"amount": Number,
		"adjAmount": Number,
		"cGST": Number,
		"sGST": Number,
		"iGST": Number,
		"cGST_percent": Number,
		"sGST_percent": Number,
		"iGST_percent": Number,
		"comission_percent":Number,
		"comission_value":Number,
		"totCwt": Number, // total charges w/o tax
		"totalAmount": Number,
		"advanceAsked": Number,
		"cancel_reason": String,
		"cancel_remark": String,
		"cancelled": {
			type: Boolean,
			default: false
		},
		"contract": {
			creditDays: Number,
		},
		"adjDebitAc": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		"adjDebitAcName": String,
		documents: [{
			name: String,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			}
		}],
		"remarks":String,
		"intRemarks":String,
		"status": {
			type: String,
			enum: constant.billStatus,
			default: constant.billStatus[0]
		},
		"dispatch": {
			status:{
				type: Boolean,
				default: false
			},
			"courier_id": {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'VendorCourier'
			},
			"courier_office_id": {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'courierOffice'
			},
			"courier_date": Date,
			"place": String,
			"branch_id": {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Branch'
			},
			"dispatch_person": String,
			"dispatch_date":Date,
			"user":{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			}
		},
		"acknowledge":{
			status:{
				type:Boolean,
				default:false
			},
			date: Date,
			dueDate: Date,
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
			woAcc: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'voucher'
			},
			voucher: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'voucher'
			},
			user:{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			}
		},
		"approve":{
			status:{
				type: Boolean,
				default: false
			},
			date:Date,
			user:{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			reason: String,
			remark: String
		},
		"created_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"created_by_name": String,
		"last_modified_by" :  String
	},
	constant.timeStamps
);

BillsSchema.index({billNo: 1, clientId: 1}, {unique: true, partialFilterExpression: {cancelled: {$eq: false}}});

BillsSchema.pre("save", async function (next) {
	try {
		if (this.isNew) {
			this.created_at = new Date();
		}
		this.last_modified_at = new Date();
		next();
	} catch (err) {
		next(err);
	}
});

BillsSchema.statics.extractGrKeys = extractGrKeys;

BillsSchema.statics.billReceivingDeductionValidation = billReceivingDeductionValidation;

module.exports = mongoose.model('bill', BillsSchema);

// function definition

function extractGrKeys(oGr) {

	let obj = {
		clientId: oGr.clientId,
		grNumber: oGr.grNumber,
		grDate: oGr.grDate,
		trip_no: oGr.trip_no,
		payment_type: oGr.payment_type,
		payment_basis: oGr.payment_basis,
		rate: oGr.rate,
		vehicle_no: oGr.vehicle_no,
		invoices: oGr.invoices,
		customer: (oGr.customer instanceof Object) ? {
			_id: oGr.customer._id,
			name: oGr.customer.name,
		} : oGr.customer,
		consignor: (oGr.consignor instanceof Object) ? {
			_id: oGr.consignor._id,
			name: oGr.consignor.name,
		} : oGr.consignor,
		consignee: (oGr.consignee instanceof Object) ? {
			_id: oGr.consignee._id,
			name: oGr.consignee.name,
		} : oGr.consignee,
		billingParty: (oGr.billingParty instanceof Object) ? {
			_id: oGr.billingParty._id,
			name: oGr.billingParty.name,
		} : oGr.billingParty,
		totalCharges: oGr.totalCharges,
		totalChargesWithoutTax: oGr.totalChargesWithoutTax,
		standardTime: oGr.standardTime,
		chargeableTime: oGr.chargeableTime,
		transitTime: oGr.transitTime,
		incentivePercent: oGr.incentivePercent,
		loadingDetentionRate: oGr.loadingDetentionRate,
		unloadingDetentionRate: oGr.unloadingDetentionRate,
		basicFreight: oGr.basicFreight,
		totalFreight: oGr.totalFreight,
		cGST: oGr.cGST,
		sGST: oGr.sGST,
		iGST: oGr.iGST,
		cGST_percent: oGr.cGST_percent,
		sGST_percent: oGr.sGST_percent,
		iGST_percent: oGr.iGST_percent,
		totalAmount: oGr.totalAmount,
		acknowledge: oGr.acknowledge,
		charges: oGr.charges,
		isGrBillable: oGr.isGrBillable,
		deduction: oGr.deduction,
		supplementaryBill: oGr.supplementaryBill,
		grId: oGr._id
	};

	return obj;
}

function billReceivingDeductionValidation(aDeduction) {

	// it validate that same deduction cannot be used again.

	let flag = true;

	aDeduction.forEach(oDed => {

		if(!flag)
			return;

		let foundData = aDeduction.filter(o => (o.grRef || '').toString() === (oDed.grRef || '').toString() && (o.deductionType ? o.deductionType.toString() === oDed.deductionType.toString() : true));

		if(foundData.length > 1)
			flag = false;
	});

	return flag;
}

