/**
 * Created by manish on 19/7/16.
 */

var mongoose = require ('mongoose');

var branchSchema= new mongoose.Schema(
    {
        "clientId":constant.requiredString,
        "name":constant.requiredString,
        "id":constant.requiredNumber,
		"grBook": [{
			ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
			name: String,
		}],
		"lsBook": [{
			ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
			name: String,
		}],
		"crBook": [{
			ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
			name: String,
		}],
		"refNoBook": [{
			ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
			name: String,
		}],
		"mrBook": [{
			ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
			name: String,
		}],
		"fpaBook": [{
			ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
			name: String,
		}],
		"miscCNBook": [{
			ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
			name: String,
		}],
		"debitBook": [{
			ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
			name: String,
		}],
		"tripMemoBook": [{
			ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
			name: String,
		}],
		"brokerMemoBook": [{
			ref: { type: mongoose.Schema.Types.ObjectId, ref: "billBook" },
			name: String,
		}],
        "type":{
            type:String,
            enum:constant.branchType,
            required:true
        },
		"code":String,
        "profit_center": Number,
        "prim_contact_no":constant.requiredNumber,
        "alt_contact_no1":Number,
        "alt_contact_no2":Number,
        "fax":Number,
        "prim_email":constant.requiredString,
        "alt_email":String,
        "branch_head_name":String,
        "branch_head_employee_code":String,
        "alt_contact_employee_code":String,
        "alt_contact_name":String,
        "branch_head_contact_no":Number,
		"alt_contact_employee_no":Number,
        "branch_head_email":String,
        "alt_head_email":String,
        "alt_contact_email":String,
        "address":constant.address,
        "branch_open_date":Date,
        "remarks":String,
        "created_by_name":String,
        "created_by_employee_code":String,
        "last_modified_by_name":String,
        "last_modified_employee_code":String,
		"last_modified_at": Date,
        "costCenter": String, // advance cost center Diesel
        "costCenterDC": String, // advance cost center Driver Cash
        "costCenterH": String, // advance cost center Happay
        "costCenterF": String, // advance cost center Fastag
        "billCC": String, // bill cost center
		"gstin" : String,
		"billAddress": String,
		"billgstin": String,
		"deleted": {
			"type": "Boolean",
			default: false
		}
    },
    constant.timeStamps
);

module.exports = mongoose.model('Branch', branchSchema);
