/**
 * Created by manish on 19/7/16.
 */

var mongoose = require ('mongoose');

var RateSchema= new mongoose.Schema(
    {   
        "clientId":constant.requiredString,
        "rateId":constant.requiredString,
        "contract_name":constant.requiredString,
        "contractId":String,
        "contract__id":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contract',
            required:true
        },
        "customer_name":String,
        "customerId":String,
        "customer__id":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Client',
            required:true
        },
        "route_name":constant.requiredString,
        "route_distance":Number,
        "route__id":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TransportRoute',
            required:true
        },
        "rate":[
            {
                "cargo_type":{
                    type:String,
                    enum:constant.cargoType
                },
                "vehicle_type":String,
                "vehicle_id":{
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'VehicleType'
                },
                "price_per_unit": Number,
                "price_per_mt":Number,
                "price_per_trip":Number,
                "detention_rate_1-48":Number,
                "detention_rate_48-96":Number,
                "detention_rate_above_96":Number,
                "from_date": Date,
                "to_date": Date
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
        "remarks":String
    },
    constant.timeStamps
);

RateSchema.plugin(mongoose_delete,{overrideMethods:'all'});

module.exports = mongoose.model('RouteData', RateSchema);
