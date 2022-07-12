var mongoose = require ('mongoose');

var AccessControl   = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		name: String,
		role:{
			type:Object,
			_delta:true
		},
		deleted:{
			type: Boolean,
			default: false
		}
	},
	constant.timeStamps
);

module.exports = mongoose.model('accessControl', AccessControl);
