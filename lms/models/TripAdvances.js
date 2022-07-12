'use strict';

const mongoose = require('mongoose');
const constants = require('../../constant');

const COST_CENTER = {
	_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "costCenter"
	},
	name: String,
	category: String
};

const tripAdvancesSchema = new mongoose.Schema({
	clientId: constant.requiredString,
	branch: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Branch',
		_delta: true
	},
	trip_no: {
		type: Number,
		_delta: true
	},
	gr: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'TripGr'
	}],
	grData: [{
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'TripGr'
		},
		grNumber: String
	}],
	trip: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'tripV2',
		_delta: true
	},
	suspenseTrip: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'tripV2',
		_delta: true
	},
	vehicle_no: {
		type: String,
		_delta: true
	},
	vehicle: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'RegisteredVehicle',
		_delta: true
	},
	ccVehicle: COST_CENTER, // vehicle cost center
	ccBranch: COST_CENTER, // branch cost center
	voucher: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Voucher'
	},
	reversed: {
		type: Boolean,
		default: false,
		_delta: true
	},
	reverseHistory: [{
		remark: String,
		reversed_by: String,
		reversed_at: Date,
	}],
	driver: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Driver"
	},
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'VendorTransport',
		_delta: true
	},
	purchaseBill: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'purchaseBill',
		_delta: true
	},
	slip: {
		stationery: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'stationery'
		},
		number: {
			type: Number
		},
		formatted: {
			type: String
		}
	},
	vendorPayment: {
		paymentMode: {
			type: String,
			_delta: true
		},
		paymentRef: {
			type: String,
			_delta: true
		},
		payRefNo: {
			type: String,
			_delta: true
		},
		paymentDate: {
			type: Date,
			_delta: true
		},
		ChequeClearDate: {
			type: Date,
			_delta: true
		},
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch',
			_delta: true
		}
	},
	vAdv: {
		type: String,
		_delta: true
	},
	vType: {
		type: String,
		_delta: true
	},
	amount: {
		type: Number,
		_delta: true
	},
	remainingAmount: Number,
	bill_no: {
		type: String,
		_delta: true
	},
	person: {
		type: String,
		_delta: true
	},
	driverCode: {
		type: String,
		_delta: true
	},
	remark: {
		type: String,
		_delta: true
	},
	deleteRemark: {
		type: String,
		_delta: true
	},
	narration: {
		type: String,
		_delta: true
	},
	reference_no: {
		type: String,
		required: true,
		_delta: true
	},
	/*
	vtype:{
		type: String,
		enum: constant.voucherType,
		default:'Payment',
		required: true
	},*/
	paidToBroker: {
		type: Boolean,
		_delta: true
	},
	advanceType: {
		type: String,
		enum: constants.aAdvanceType,
		required: true,
		_delta: true
	},
	aExtraCharges : [{
		amtType: {
			type: String,
			enum: constants.aAmtType,
			_delta: true
		},
		amtTypeAmount :{
			type: Number,
			_delta: true
		}
	}],
	totalExtraChrges: Number,
	category: {
		type: String,
		required: true,
		default: 'trip',
		_delta: true
	},
	status: {
		type: String,
		default: 'Advance',
	},
	dieseInfo: {
		rate: {
			type: Number,
			_delta: true
		},
		litre: {
			type: Number,
			_delta: true
		},
		vendor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'VendorFuel',
			_delta: true
		},
		_vendorName: {
			type: String,
			_delta: true
		}, // vendor name during advances upload if not found in masters
		station: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'FuelStation',
			_delta: true
		}
	},
	fastagDetail: {
		"DateOfTransaction": Date,
		"Amount": Number,
		"TypeOfTransaction": String,
		"VehicleNumber": String
	},
	from_account: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'accounts',
		_delta: true
	},
	to_account: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'accounts',
		_delta: true
	},
	to_account_list: {
		driver_happay: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		driver_account: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		vehicle_fasttag: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		vendor_account: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		branch_master: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
	},
	unmapHistory: [{
		user_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		user_name: {
			type: String,
			ref: 'User'
		},
		date: Date,
		trip_no: String,
		suspenseRemark: String,
	}],
	stationaryId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'billStationary',
		_delta: true
	},
	removedTrip: {
		type: Boolean,
		default: false
	},
	settleTheTrip: {
		type: Boolean,
		default: false
	},
	date: {
		type: Date,
		required: true,
		_delta: true
	},
	uploaded_at: Date,
	isCancelled: {
		type: Boolean,
		default: false
	},
	editable: {
		type: Boolean,
		default: true
	},
	linkable: {
		type: Boolean,
		default: true
	},
	created_at: Date,
	createdBy: String,
	partnerRefId:String,
	pDV: Date,
	created_by: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	multiAdv: {
		default: false,
		type: Boolean
	},
}, {
	timestamps: {
		updatedAt: "onUpdDate"
	},
	strict: false
});

tripAdvancesSchema.pre('find', function () {
	this.populate({
		path: 'branch',
		select: {'name': 1, 'prim_contact_no': 1, 'prim_email': 1, 'profit_center': 1, 'cost_center': 1}
	});
	this.populate({
		path: 'created_by',
		select: {'userId': 1, 'full_name': 1}
	});
});

// tripAdvancesSchema.statics.eachTripSummary = function(aTrip){
// 	aTrip.forEach(oTrip =>{
// 		if(oTrip._doc && oTrip._doc.trip && oTrip._doc.trip._doc)
// 			oTrip._doc.trip._doc.trip_totalKm = (oTrip._doc && oTrip._doc.trip && oTrip._doc.trip._doc.route && oTrip._doc.trip._doc.route._doc && oTrip._doc.trip._doc.route._doc.route_distance || 1) + ( oTrip._doc && oTrip._doc.trip && oTrip._doc.trip._doc && oTrip._doc.trip._doc.extraKm || 0); // routeDistance + extra Km
// 	});
// }

tripAdvancesSchema.index({reference_no: 1, clientId: 1, bill_no: 1}, {unique: true});

module.exports = mongoose.model('tripadvances', tripAdvancesSchema, 'tripadvances');
