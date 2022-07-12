/**
 * Created by Nipun on 4/12/2017.
 */

var mongoose = require ('mongoose');

var toolIssueSchema = new mongoose.Schema(
    {
        "clientId":constant.requiredString,
		"tool_id":{
			"type": mongoose.Schema.Types.ObjectId,
			"ref": 'tool'
		},
        "tool_code": constant.requiredString,
        "toolId":constant.requiredString,
        "issuer_type":constant.requiredString,
        "issue_to_employee_code":constant.requiredString,
        "issue_to_employee_name":constant.requiredString,
        "issue_status":constant.requiredString,
        "vehicle_number":String,
        "issue_slip_number":String,
		"rate":Number,
		"return_by_type":String,
        "return_by_employee_code":String,
        "return_by_employee_name":String,
        "return_slip_number":String,
        "return_status":String,
        "return_date":Date,
        "created_by_name":String,
        "created_by_employee_code":String,
        "last_modified_by_name":String,
        "last_modified_employee_code":String
    },
    constant.timeStamps
);

module.exports = mongoose.model('ToolIssue',toolIssueSchema);
