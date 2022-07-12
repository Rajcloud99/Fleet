const mongoose = require ('mongoose');

const TdsRate   = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		year: String,
		start: Date,
		end: Date,
		aRate: [{
			amount: Number,
			// iRate: Number,    //Individuals Rate
			// niRate: Number,   //Non Individuals Rate
			ipRate: Number,   //Individuals PAN Rate
			nipRate: Number,   //Non Individuals PAN Rate
			iwpRate: Number,   //Individuals Without PAN Rate
			niwpRate: Number,  //Non Individuals Without PAN Rate
			section: constant.requiredString,
			sources: String,
		}]
	},
	constant.timeStamps
);

TdsRate.index({year: 1, clientId: 1}, {unique: true});

module.exports = mongoose.model('tdsRates', TdsRate);
