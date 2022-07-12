const mongoose = require('mongoose');

const tableConfiguration = mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		configs: Object,
		clientId: constant.requiredString,
		table: constant.requiredString,
		page:constant.requiredString,
		access:[],
		visible:[],
		clientAdmin:{type: Boolean, default: false},
		clientSuperAdmin:{type: Boolean, default: false},
		deleted: {type: Boolean, default: false},
		created_by_name: String,
		created_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		created_at:{type:Date,default:new Date()},
		last_modified_by_name: String,
		last_modified_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		last_modified_at:{type:Date,default:new Date()}

	},
	constant.timeStamps
);

module.exports = mongoose.model('tableConfiguration', tableConfiguration, );
