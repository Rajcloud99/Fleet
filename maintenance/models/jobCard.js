var mongoose = require ('mongoose');
var validator = require('validator');

var jobCardSchema = new mongoose.Schema(
    {
        "clientId": constant.requiredString,
        "jobId": constant.requiredString,
        "branchId": constant.requiredString,
        "branchName":String,
		"vehicle":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'RegisteredVehicle'
		},
        "vehicle_number": constant.requiredString,
        "odometer_reading": Number,
        "last_trip_number": Number,
        "vehicle_models":String,
        "vehicle_category":{
            type: String,
            enum: constant.vehicleCategory
        },
        "vehicle_structure_name": String,
        "status": {
            type:String,
            enum:constant.jobCardStatusTypes,
            default:"Not started",
            required:true,
        },
        "job_card_open_datetime": Date,
        "vehicle_in_datetime": Date,
        "maintenance_type": {
            type:String,
            enum:constant.jobCardMaintenanceTypes
        },
        "flag":{
            type:String,
            enum:constant.jobCardFlagTypes
        },
        "estimated_cost": Number,
        "actual_cost": Number,
        "estimated_release_date": Date,
        "actual_release_date": Date,
        "driver_name": String,
        "driver_contact":Number,
        "location":String,
        "remark":String,
        "job_type":{
            "type": String,
            "enum": ['Internal','External'],
            default:"Internal",
            required:true
        },
        "created_by_employee_name":String,
        "created_by_employee_code":String,
        "modified_by_employee_name":String,
        "modified_employee_code":String
    },
    constant.timeStamps
);

module.exports = mongoose.model('jobCard',jobCardSchema);
