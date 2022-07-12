/**
 * Created by Harikesh on 29/4/2020.
 */

var mongoose = require('mongoose');

var datamanagementsSchema = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		files: [{
			name: String,
			size: String,
			category:String, // BodyKey
			date:Date,
			scanVal:String
		}],
		linkToId: String,
		linkTo: String, //modelName
		deleted: {
			type: Boolean,
			default: false
		},
	},
	constant.timeStamps
);

module.exports = mongoose.model('Datamanagements', datamanagementsSchema);
