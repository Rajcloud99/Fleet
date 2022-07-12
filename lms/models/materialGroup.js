/**
 * Created by manish on 19/7/16.
 */
var mongoose = require ('mongoose');

var MaterialGroupSchema = new mongoose.Schema(
    {
		"clientId": String,
		"name" : constant.requiredString,
        "code": {
					type:String,
					trim: true
		},
        "description":String,
		"rate":"Number",
		"applicableDate":"Date",
        "material_types":[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'MaterialType'
            }
        ],
        "created_by_name":String,
        "created_by_employee_code":String,
        "created_by":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        "last_modified_by_name":String,
        "last_modified_employee_code":String,
        "last_modified_by":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
		unit: [{
			type:  String
		}],
    },
    constant.timeStamps
);

module.exports = mongoose.model('MaterialGroup', MaterialGroupSchema);
