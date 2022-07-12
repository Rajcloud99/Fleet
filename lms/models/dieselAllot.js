/**
 * Created by manish on 19/7/16.
 */

var mongoose = require ('mongoose');

var DieselAllotSchema= new mongoose.Schema(
    {
        "dieselAllotId":constant.requiredString,
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
        "trip_type":String,
        "distance":Number,
        "route__id":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TransportRoute',
            required:true
        },
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

DieselAllotSchema.plugin(mongoose_delete,{overrideMethods:'all'});


module.exports = mongoose.model('DieselAllotService', DieselAllotSchema);
