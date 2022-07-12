/**
 * Created by Nipun on 8/14/2017.
 */
var mongoose = require ('mongoose');
var invSnapSchema = new mongoose.Schema(
	{
		"clientId": constant.requiredString,
		"data":[{
			"inv_id":[{
				"type": mongoose.Schema.Types.ObjectId,
				"ref": 'inventory'
			}],
			"entryId":[String],
			"spare_code": constant.requiredString,
			"spare_name":constant.requiredString,
			"uom": {
				type:String,
				enum:constant.uom,
				required:true
			},
			"remaining_quantity": constant.requiredNumber,
			"rate_per_piece":[Number],
			"rate_inc_tax":[Number],
			"category_name":String,
			"category_code":String
	}],
	},
	constant.timeStamps
);

module.exports = mongoose.model('inventorysnapshot',invSnapSchema);
