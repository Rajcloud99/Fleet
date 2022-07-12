let chargesType = {
	amount: Number,
	typ: String,
	narration: String,
	tdsAmount: Number,
	tdsPercent: Number,
	voucher: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Voucher'
	},
	tdsVoucher: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Voucher'
	},
	from: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'accounts'
	},
	fromName: String,
	to: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'accounts'
	},
	toName: String,
	tdsAccount: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'accounts'
	},
	tdsAccountName: String,
	date: Date
};
const AdvanceBudget = {
	_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'tripadvances'
	},
	reference_no: String,
	billNo: String,
	narration: String,
	from_account: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'accounts'
	},
	to_account: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'accounts'
	},
	toAc: {
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		name: String
	},
	FromAc: {
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		name: String
	},

	advanceType: String,
	category: String,
	date: Date,
	amount: Number,
	remainingAmount: Number
};
const TripExpense = {
	_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'TripsExpense'
	},
	type: {
		type: String
	},
	date: Date,
	amount: Number
};
const Payments = {
	_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'tripadvances'
	},
	refNo: String,
	vT: String,
	type: String,
	date: Date,
	amount: Number,
	ledgers: {}
};
const GR = {
	_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'tripadvances'
	},
	grNumber: String,
	invoices: {},
	basicFreight: Number,
	totalFreight: Number,
	customer: {
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		name: String,
		category: String
	}
};

let tripCache = new mongoose.Schema({
		clientId: constant.requiredString,
		branch: {
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "Branch"
			},
			name: String
		},
		trip_no: Number,
		bill_no: Number,
		ctrip: String,
		corder: String,
		gps_view: String,
		suspenseRemark: String,
		settled: Boolean,
		ownershipType: String,
		AccManagerRmk: {
			remark: String,
			by: String,
			date: Date,
		},
		markSettle: {
			isSettled: Boolean,
			remark: String,
			by: String,
			date: Date,
		},
		advSettled: {
			isCompletelySettled: Boolean,
			tsNo: Number,
			creation: {
				date: Date,
				user: String
			},
			by: String,
			date: Date,
			remark: String,
			systemDate: Date,
			aVoucher: [{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Voucher'
			}]
		},
		advanceBudget: [AdvanceBudget],
		suspenseAdv: [AdvanceBudget],
		transShipment: {
			vehicle_no: String,
			driver_name: String,
			vehicle: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'RegisteredVehicle'
			},
			driver: {
				"type": mongoose.Schema.Types.ObjectId,
				"ref": "Driver"
			},
			created_by: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			date: Date,
			remark: String,
		},
		status: String,
		rmk: String,
		category: String,
		extraKm: Number,
		route: {
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "TransportRoute"
			},
			name: String,
			km: Number
		},
		vehicle: {
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'RegisteredVehicle'
			},
			vehicle_no: String,
			segment: String,
			fleet: String
		},
		driver: {
			_id: {
				"type": mongoose.Schema.Types.ObjectId,
				"ref": "Driver"
			},
			name: String,
			code: String
		},
		allocation_date: Date,
	    start_date:Date,
	    end_date:Date,
		trip_expenses: [TripExpense],
		isCancelled: Boolean,
		payments: [Payments],
		statuses: [{
			date: Date,
			systemDate: Date,
			status: String,
			remark: String,
		}],
		gr: [GR],
		gTrip_id: String,
		vendor: {
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'VendorTransport'
			},
			name: String,
			pan: String
		},
		vendorDeal: {
			deal_at: Date,
			entryDate: Date,
			date: Date,
			tdsFromAc: {
				_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'accounts'
				},
				name: String,
			},
			lorryAc: {
				_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'accounts'
				},
				name: String,
			},
			broker: {
				_id: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'VendorTransport'
				},
				name: String,
			},
			diesel: {
				quantity: Number,
				rate: Number,
				amount: Number
			},
			acknowledge: {
				ackToAc: {
					_id: {
						type: mongoose.Schema.Types.ObjectId,
						ref: 'accounts'
					},
					name: String,
				},
				status: Boolean,
				date: Date,
				user: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User'
				},
				userName: String,
				voucher: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Voucher'
				}
			},
			totalUnits: Number,
			tdsPercent: Number,
			tdsAmount: Number,
			tdsVoucher: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Voucher'
			},
			perUnitPrice: Number,
			pmtWeight: Number,
			pmtRate: Number,
			driver_cash: Number,
			toll_tax: Number,
			totalCharges: Number,
			totalDeduction: Number,
			charges: {
				chalan_charges: chargesType,
				other_charges: chargesType,
				detention_charge: chargesType,
				oveloading_charge: chargesType,
				loading_charges: chargesType,
				unloading_charges: chargesType,
				tirpal_charges: chargesType,
				chalan_rto_charges: chargesType,
				toll_charges: chargesType,
			},
			deduction: {
				tds_deduction: chargesType,
				damage_deduction: chargesType,
				penalty_deduction: chargesType,
				other_deduction: chargesType,
				labourDeduction: chargesType,
				claimDeduction: chargesType,
			},
			total_expense: Number,
			munshiyana: Number,
			otherExp: Number,
			internalFreight: Number,
			totWithMunshiyana: Number,
			advance: Number,
			toPay: Number,
			totalDeal: Number,
			account_payment: Number,
			remark: String,
			account_payment_remark: String,
			other_charges_remark: String,
			loading_slip: String,
			lsStationaryId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'billStationary'
			},
			advance_due_date: Date,
			topay_due_date: Date,
			weight_type: String,
			payment_type: String,
			lsNo: String,
		},
		remarks: String,
		createdBy: String,
		modifBy: String,
		created_at: Date,
		last_modified_at: Date
	}
);

tripCache.index({trip_no: 1, clientId: 1}, {unique: true});

module.exports = mongoose.model('tripCache', tripCache);
