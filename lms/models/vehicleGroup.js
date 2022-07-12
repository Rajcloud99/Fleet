var mongoose = require ('mongoose');

var VehicleGroupSchema = new mongoose.Schema(
    {
		"clientId": String,
		"name" : constant.requiredString,
        "code": constant.requiredString,
        "desc":String,
        "vehicle_types":[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'VehicleType'
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
        }
    },
    constant.timeStamps
);

module.exports = mongoose.model('VehicleGroup', VehicleGroupSchema);
