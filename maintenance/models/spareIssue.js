/**
 * Created by nipun on 17/1/16.
 */
var mongoose = require ('mongoose');

var SpareIssueSchema= new mongoose.Schema(
    {
        "clientId":constant.requiredString,
        "jobId":String,
        "vehicle_number":String,
        "job_type":{
            "type": String,
            "enum": ['Internal','External'],
            default:"Internal",
            required:true
        },
        "slip_number":String,
        "issue_type":{
            type:String,
            enum:["Mechanic","Branch","Contractor","Other"],
            default:"Mechanic"
        },
        "issuer":String,
        "mechanic_name":String,
        "mechanic_employee_code":String,
        "branchId":String,
        "branchName":String,
        "issued_spare":[{
            "taskId":constant.requiredString,
            "task_name":constant.requiredString,
            "spare_code":constant.requiredString,
            "spare_name":constant.requiredString,
            "category_name":String,
            "category_code":String,
            "uom": {
                type:String,
                enum:constant.uom,
                required:true
            },
            "returned":[{
                "quantity":Number,
                "slip_number":String
            }],
            "total_returned":{
                type:Number,
                default:0
            },
            "quantity":Number,
            "cost_per_piece":Number,
            "inventory_entryid":constant.requiredString,
			"inventory_id":{
				"type": mongoose.Schema.Types.ObjectId,
				"ref": 'inventory'
			},
            "flag":{
                type:String,
                default:"No",
                enum:["issued","returned"]
            }
        }],
        "total_cost":Number,
        "remarks":String,
        "flag": {
            type: String,
            enum: ["issued", "returned"]
        },
        "created_by_name":String,
        "created_by_employee_code":String,
        "last_modified_by_name":String,
        "last_modified_employee_code":String,
    },
    constant.timeStamps
);

module.exports = mongoose.model('SpareIssue', SpareIssueSchema);
