// *******vehicleBudget******
// ******* 13/04/2022********

let mongoose = require('mongoose');

let vehicleBudgetSchema = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		"serviceTyp": constant.requiredString,
		"rpk": constant.requiredNumber,
		"mileage": constant.requiredNumber,
		"adv": constant.requiredNumber,
		"userName": String,
		"veh": {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'RegisteredVehicle',
			    required:true
			},

	},
	constant.timeStamps
);

module.exports = mongoose.model('vehicleBudget', vehicleBudgetSchema);
