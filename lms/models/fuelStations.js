/**
 * Created by pratik on 14/10/16.
 */

var mongoose = require ('mongoose');

var fuelStationSchema= new mongoose.Schema(
    {
		"clientId":constant.requiredString,
        "fuel_type": constant.requiredString,
        "fuel_company": String,
        "fuel_price": Number,
        "area_code":String,
        "address":String,
		"effective_date": Date,
        "vendorId":constant.requiredString,
        "fuel_vendor_id":{
            type:mongoose.Schema.Types.ObjectId,
            ref:"VendorFuel"
        },
    },
    constant.timeStamps
);

fuelStationSchema.plugin(mongoose_delete,{overrideMethods:'all'});

module.exports = mongoose.model('FuelStation', fuelStationSchema);
