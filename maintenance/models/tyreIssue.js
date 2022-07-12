var mongoose = require ('mongoose');

var TyreIssueSchema = new mongoose.Schema(
    {
        "clientId": constant.requiredString,
        "jobId":constant.requiredString,
        "taskId":constant.requiredString,
        "tyre_number":constant.requiredString,
	    "tyre_id": {
			"type": mongoose.Schema.Types.ObjectId,
			"ref": 'TyreMaster'
		},
	    "tyre_last_status":constant.requiredString,
		"issue_category":String,
	    "isReturned": {
            type: Boolean,
		    default: false
		},
		'jobVehicle':String,
	    "issue_slip_number":constant.requiredString,
        "return_slip_number": String,
	    "branch": String,
        "issued_by_employee_code":constant.requiredString,
        "issued_by_employee_name":constant.requiredString,
	    "user_type":constant.requiredString,
		"amount":Number,
	    "returned_by_employee_code":String,
        "returned_by_employee_name":String,
        "tyre_return_quality_remark":String,
	    "association_position":constant.requiredString,
	    "issued_odometer":constant.requiredNumber,
	    "returned_odometer":Number,
        "vehicle_no":String,
	    "structure_name":String,
	    "vehicle_type":{
		    type:String,
		    enum:constant.vehicleType
	    },
	    "action_on_return":String
    },
    constant.timeStamps
);

module.exports = mongoose.model('TyreIssue', TyreIssueSchema);
