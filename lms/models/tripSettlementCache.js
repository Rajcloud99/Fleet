const AdvanceBudget = {
	_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'tripadvances'
	},
	refNo: String,
	billNo: String,
	from: String,
	fromId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Voucher'
	},
	to: String,
	toId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Voucher'
	},
	advanceType: String,
	category: String,
	date: Date,
	amount: Number
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
	amount: Date,
	from: String,
	fromId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Voucher'
	},
	to: String,
	toId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Voucher'
	},
};
const GR = {
	_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'tripadvances'
	},
	grNumber: String,
	basicFreight: String,
	totalFreight: String,
	customer: {
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		},
		name: String,
		category: String
	}
};

const TripSettlementSchema = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		tsNo: Number,
		startDate: Date,
		endDate: Date,
		cSettle: { // is completely settled
			type: Boolean,
			default: false
		},
		mSettle: { // is marked settled
			type: Boolean,
			default: false
		},
		openingBal: Number,
		sysDate: Date,
		date: Date, // Settle date
		csBy: String, // completely Settle By
		msBy: String, // mark Settle By
		csRemark: String,
		msRemark: String,
		creation: {
			date: Date,
			user: String
		},
		vehicle: {
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'RegisteredVehicle'
			},
			vehicleNo: String,
			segment: String,
			fleet: String,
			ownership: String,
		},
		driver: {
			_id: {
				"type": mongoose.Schema.Types.ObjectId,
				"ref": "Driver"
			},
			name: String,
			code: String
		},
		trip: [{
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'tripV2',
			},
			trip_no: Number,
			bill_no: Number,
			startDate: Date,
			endDate: Date,
			suspenseRemark: String,
			settled: {
				type: Boolean,
				default: false
			},
			ownershipType: String,
			AccManagerRmk: {
				remark: String,
				user_full_name: String,
				date: Date,
			},
			advanceBudget: [AdvanceBudget],
			suspenseAdv: [AdvanceBudget],
			status: String,
			rmk: String,
			category: String,
			extraKm: Number,
			route_name: String,
			routeKm: Number,
			route: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "TransportRoute"
			},
			allocation_date: Date,
			trip_expenses: [TripExpense],
			isCancelled: Boolean,
			payments: [Payments],
			statuses: [{
				by: String,
				date: Date,
				status: String
			}],
			gr: [GR],
			remarks: String,
		}],
		suspense: [AdvanceBudget],
		gapSuspense: [AdvanceBudget],
		// summary keys
		"totalKm": Number,
		"totalExtraKm": Number,
		"netBudget": Number,
		"netAdvVch": Number,
		"netAdvObj": {
			"driver": Number,
			"happay": Number,
			"fastag": Number,
			"vendor": Number,
			"diesel": Number,
			"driverCash": Number
		},
		"netAdvance": Number,
		"netAdvVchObj": {
			"driver": Number,
			"happay": Number,
			"fastag": Number,
			"vendor": Number,
		},
		"netExpense": Number,
		"netExpVch": Number,
		"netExpObj": {
			"driver": Number,
			"happay": Number,
			"fastag": Number,
			"vendor": Number,
		},
		"netExpVchObj": {
			"driver": Number,
			"happay": Number,
			"fastag": Number,
			"vendor": Number,
		},
		"dieselBudget": Number,
		"dieselGivLit": Number,
		"dieselGivAmt": Number,
		"overDue": Number,
		"openCloseBal": {},
		"driverIncentiveVch": Number,
		"driverPayment": Number,
		"revenue": Number,
		"profit": Number,
		"revenueByKm": Number,
		"expenseByKm": Number,
		"profitByKm": Number,
		"profitByday": Number,
		"ttDays": Number,
		"totalSuspence": Number,
	},
	constant.timeStamps
);

TripSettlementSchema.index({tsNo: 1, clientId: 1}, {unique: true});

module.exports = mongoose.model('tripSettlementCache', TripSettlementSchema);
