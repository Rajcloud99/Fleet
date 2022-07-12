/**
 * Created by manish on 19/7/16.
 */

var mongoose = require ('mongoose');

var RouteDataSchema= new mongoose.Schema(
    {
        "clientId":constant.requiredString,
		"route_name":constant.requiredString,
		"category":constant.requiredString,
		"customer__id":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'customers',
			required:true
		},
		"route__id":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'TransportRoute',
			required:true
		},
		"contract_name":String,
        "contractId":String,
        "contract__id":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contract'
        },
        "customer_name":String,
        "route_distance":Number,
        "customerId":String,

        "data": [
            {
                "vehicle_id": {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'VehicleType'
                },
				"materialType": {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'MaterialType'
				},
				"rate": {
                        "price_per_unit": Number,
                        "price_per_mt": Number,
                        "price_per_trip": Number,
                        "min_payable_mt": Number
                },
                "allot": {
                        "diesel": Number,
                        "cash": Number,
                        "toll":  Number
                }
            }
        ],
		"milestone":[{
			name:String,
			tat_hr:Number,
			tat_min:Number,
			tat_km: Number,
			halt_d:Number,
			"location": {
				"lat": Number,
				"lng": Number
			},
			sn:Number,
			category:{
				enum:['city','toll','parking'],
				type:String
			}
		}],
		"vehTypeNam": String,
		"vehType": {
			"type": mongoose.Schema.Types.ObjectId,
			"ref": "VehicleType"
		},
		service:String,
		tat_hr:Number,
		tat_min:Number,
		rateKm:Number,
		dieselKm:Number,
		toll:Number,
        "createdBy":String,
        "lastModifiedBy":String,
    },
    constant.timeStamps
);
RouteDataSchema.pre("find",function () {
	this.populate('materialType');
	this.populate('vehicle_id');
});

//RouteDataSchema.plugin(mongoose_delete,{overrideMethods:'all'});


module.exports = mongoose.model('RouteData', RouteDataSchema);
