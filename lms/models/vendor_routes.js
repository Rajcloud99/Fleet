/**
 * Created by kamal on 20/10/16.
 */

var mongoose = require ('mongoose');

var vendorRouteSchema= new mongoose.Schema(
    {
        "name":constant.requiredString,
        "detailed_name":String,
        "route_id": {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TransportRoute'
        },
        "clientId":constant.requiredString,
        "route_type":String,
        "vehicle_types" : [{
        	"vehicle_type" : String,
        	"vehicle_type_id":String,
        	"vehile_group":String,
        	"vehicle_group_id":String
        }],
        "vendor_name":String,
        "vendor":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VendorTransport'
        },
        "vendor_contact":Number,
        "remarks":String,
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
        }
    },
    constant.timeStamps
);

module.exports = mongoose.model('VendorRoute', vendorRouteSchema);
