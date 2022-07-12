var mongoose = require ('mongoose');

var Template   = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		name: constant.requiredString,
		skeletonName: constant.requiredString,
		skeleton: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Skeleton',
			required: true
		},
		htmlString: constant.requiredString,
		deleted:{
			type: Boolean,
			default: false
		}
	},
	constant.timeStamps
);

module.exports = mongoose.model('template', Template);
