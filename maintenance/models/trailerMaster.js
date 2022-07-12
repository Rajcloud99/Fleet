var mongoose = require ('mongoose');

var TrailerMasterSchema = new mongoose.Schema(
    {
        "clientId": constant.requiredString,
        "trailer_no":constant.requiredString,
        "structure_name":String,
        "manufacturer_name":String,
        "number_of_tyres":Number,
        "trailer_make":String,
        "number_of_axle":Number,
        "associationFlag":{
            type:Boolean,
            default:false
        },
        "associatedVehNo":String
    },
    constant.timeStamps
);

module.exports = mongoose.model('TrailerMaster', TrailerMasterSchema);
