var mongoose = require ('mongoose');

var toolSchema = new mongoose.Schema(
    {
        "clientId": constant.requiredString,
        "toolId":constant.requiredString,
        "code":constant.requiredString,
        "spare_code": constant.requiredString,
        "spare_name":constant.requiredString,
        "vendor_name": String,
        "vendorId":String,
    	"po_number": String,
        "invoice_number": String,
    	"invoice_date": Date,
        "branchId": constant.requiredString,
        "branchName":constant.requiredString,
        "tax":{
            type:Number,
            default:0
        },
        "rate":Number,
        "rate_inc_tax":Number,
		"current_price":Number,
		"freight":Number,
        "manufacturer":String,
        "category":{
            type:String,
            enum:constant.toolCategory
        },
        "status":{
            type:String,
            enum:constant.toolStatus
        },
        "purchase_category":{
            type:String,
            enum:constant.toolCategory
        },
        "deleted":{
            "status":{
                type:Boolean,
                default:false
            },
            "deleted_by_employee_name":String,
            "deleted_by_employee_code":String,
            "reason":String
        },
        "created_by_employee_name":String,
        "created_by_employee_code":String,
        "modified_by_employee_name":String,
        "modified_employee_code":String
    },
    constant.timeStamps
);

module.exports = mongoose.model('tool',toolSchema);
