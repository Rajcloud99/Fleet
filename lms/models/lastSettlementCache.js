const LastSettlementCache = new mongoose.Schema({
		rtNo : Number,
		totalTrip: Number,
		totalKM: Number,
		start_date: Date, //rtStartDate
		end_date: Date,   //rtEndDate
		mDate: Date,   //mark settle date
		cDate: Date,   //completely settle date
		vehicle: {
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'RegisteredVehicle'
			},
			owner_group: String,
			segment_type: String,
		},
		driver: {
			_id : {
				"type": mongoose.Schema.Types.ObjectId,
				"ref": "Driver"
			},
			'name': constant.requiredString,
			'code': String,
			'nameCode': String,
		},
		aAfterTrip: [{
			_id : {
				"type": mongoose.Schema.Types.ObjectId,
				"ref": "tripV2"
			},
			trip_no: String,
			basicFreight: Number,
			totalCharges: Number,
			totalDeduction: Number,
			totalFreight: Number,
			route: String,
			routeKm: Number,
			extraKm: Number
		}],
		aAfterAdvance: [{
			_id : {
				"type": mongoose.Schema.Types.ObjectId,
				"ref": "tripadvances"
			},
			refNo: String,
			advanceType: String,
			amount: Number,
		}],
		postRtAdv:{
			driverCash:Number,
			diesel:Number,
			dieselLtr:Number,
			fastag:Number,
			happay:Number,
			totalAdv:Number,
		},
		postRtTrip:{
			loaded:Number,
			empty:Number,
			rKm:Number,
			tTrips:Number
		},
		clientId:constant.requiredString
	},
	constant.timeStamps
);

LastSettlementCache.index({'vehicle._id': 1, clientId: 1}, {unique: true});
module.exports = mongoose.model('lastSettlementCache', LastSettlementCache);
