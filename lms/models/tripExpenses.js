/**
 * Created by nipun on 3/1/18.
 */

var mongoose = require('mongoose');

var tripExpenseSchema = new mongoose.Schema(
	{
		clientId: String,
		trip_no: Number,
		isCancelled: Boolean,
		user: String,
		trip: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'tripV2',
			//required: true
		},
		type: {
			type: String,
			required: true
		},
		person: constant.requiredString,
		// amount: constant.requiredNumber,
		amount: Number,
		date: Date,
		advanceType: {
			type: String,
			required: true
		},
		remark: String,
		paidToVendor: {
			type: Boolean,
			default: false
		},
		diesel_info: {
			rate: Number,
			litre: Number,
			vendor: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'VendorFuel'
			},
			station: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'FuelStation'
			}
		},
		voucher:{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Voucher'
		},
		banking_detail: {
			a_c: String,
			ifsc: String,
			declaration: String
		},
		fastagDetail:{
			"ProcessingDateTime": Date,
			"TransactionDateTime": Date,
			"TransactionAmount": Number,
			"TransactionId": Number,
			"VehicleNumber": String,
			"LaneCode": String,
			"PlazaCode": String,
			"TransactionStatus": String,
			"TransactionReferenceNumber": String,
			"PlazaName": String
		},
		reference_no: String,
		created_by: String
	}, constant.timeStamps
);

tripExpenseSchema.pre('save', function (next) {
	/*
	if (this.schema.path('type').enumValues.indexOf(this.type) > 16) {
		this.amount = Math.abs(this.amount) * -1;
	}
	*/
	if (!this.date) {
		this.date = Date.now();
	}
	if (this.type === 'Diesel' || this.type === 'Extra Diesel') {
		if (!this.diesel_info.rate || !this.diesel_info.litre) {
			let errors = new Error('Please provide diesel rate and litre');
			next(errors);
		}
		else {
			this.amount = this.diesel_info.rate * this.diesel_info.litre;
		}
	}
	this.created_at = Date.now();
	next();
});

tripExpenseSchema.pre('find', function () {
	if (this._conditions.populate === 'true') {
		this.populate('trip');
	}
	this.populate('diesel_info.vendor');
	this.populate('diesel_info.station');
	this.populate('voucher');
	//validate query
	for (let query in this._conditions) {
		if (!this.schema.paths.hasOwnProperty(query)) {
			delete this._conditions[query];
		}
	}
});

tripExpenseSchema.statics.createTripExpense = function (trip, cb) {
	let ExpenseModel = this.model('TripsExpense');
	let data2Save = new ExpenseModel({
		clientId: trip.clientId,
		trip_no: trip.trip_no,
		trip: trip._id,
		type: this.schema.path('type').enumValues[0],
		person: 'System',
		amount: 0
	});
	data2Save.save(cb);
};

module.exports = mongoose.model('TripsExpense', tripExpenseSchema);
