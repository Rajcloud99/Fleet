var mongoose = require ('mongoose');

var AssetsCategory   = new mongoose.Schema(
	{
		// clientId: constant.requiredUniqueString,
		// createdBy: constant.requiredUniqueString,
		category: constant.requiredString,
		// CActSlab: constant.requiredNumber,
		// ITActslab: constant.requiredNumber,
		CActSlab: String,
		name: String,
		ITActslab: String,
		categoryCode: constant.requiredString,
		description:constant.requiredString,
		phyStatus:
			{
				type: String,
				enum: constant.physicalStatuses,
				default: 'Normal',
			},
		aRates: [{
			effectiveDate:  constant.requiredDate,
			CActRateSLM: constant.requiredNumber,
			ITActRateSLM: constant.requiredNumber,
			CActRateWDV: constant.requiredNumber,
			ITActRateWDV: constant.requiredNumber
		}],
		account: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		}
		// account:[{
		// 	account: {
		// 		type: mongoose.Schema.Types.ObjectId,
		// 		ref: "accounts"
		// 	},
		// 	date:Date,
		// 	linked:Boolean
		// }]

	},
	constant.timeStamps
);

module.exports = mongoose.model('assetsCategory', AssetsCategory);
