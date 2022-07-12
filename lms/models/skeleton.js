var mongoose = require ('mongoose');

var Skeleton   = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		name: String,
		htmlString: String,
		deleted:{
			type: Boolean,
			default: false
		}
	},
	constant.timeStamps
);

module.exports = mongoose.model('skeleton', Skeleton);
