let Promise = require('bluebird');
var mongoose = require("mongoose");

var vehicleProfit = new mongoose.Schema({
		clientId: constant.requiredString,
		vehicle: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'RegisteredVehicle'
		},
	    date:Date,
	    revenue:{
			type:Number,
			default:0
		},
		voucherExp:[{
			amount: Number,
			category: String
		}],
		advExp: [{
			amount: Number,
			category: String
		}],
		duesExp: [{
			amount: Number,
			category: String
		}]
	},
	{...constant.timeStamps, strict: true}
);

// vehicleProfit.index({ clientId: 1,deleted:1}, {unique: true});

module.exports = mongoose.model("vehicleProfit", vehicleProfit);
