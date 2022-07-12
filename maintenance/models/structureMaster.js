var mongoose = require ('mongoose');

var StructureMasterSchema = new mongoose.Schema(
    {
        "clientId": constant.requiredString,
        "structure_name":constant.requiredString,
        "total_tyres":Number,
        "vehicle_type":{
            type:String,
            enum:constant.vehicleType,
            required:true
        },
        "spare_tyre":Number,
        "front_mapping":[Number],
        "rear_mapping":[Number]
    },
    constant.timeStamps
);

module.exports = mongoose.model('StructureMaster', StructureMasterSchema);
