/**
 * Created by manish on 19/7/16.
 */

var mongoose = require ('mongoose');

var transportRouteSchema= new mongoose.Schema(
    {
        "clientId":constant.requiredString,
        "name":constant.requiredString,
        "detailed_name":String,
        "source": {},
        "destination": {},
        "via":[],
        "toll_taxes":[
            {
                // todo: add "point":
                "remarks": String
            }
        ],
		"deleted": {
			"type": "Boolean",
			default: false
		},
		"islndmrk": {
			"type": "Boolean",
			default: false
		},
		"route_distance": {
			type: Number,
			_delta: true
		},
        "route_distance_text":String,
        "route_time_text":String,
        "route_time_value":Number,
        "route_time":[
            {
				"vehicle_type_id": String,
                "vehicle_type_name":String,
                "vehicle_group_name":String,
                "up_time":{
                    "days":Number,
                    "hours":Number
                },
                "down_time":{
                    "days":Number,
                    "hours":Number
                },
                "diesel_allot": Number,
                "cash_allot" : Number,
                "toll_tax" : Number
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
		tat_hr:Number,
		tat_min:Number,
    },
    constant.timeStamps
);

//transportRouteSchema.plugin(mongoose_delete,{overrideMethods:'all'});



module.exports = mongoose.model('TransportRoute', transportRouteSchema);
