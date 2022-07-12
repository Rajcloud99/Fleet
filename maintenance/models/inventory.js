var mongoose = require ('mongoose');

var inventorySchema = new mongoose.Schema(
    {
        "clientId": constant.requiredString,
        "entryId":constant.requiredString,
        "spare_code": constant.requiredString,
        "spare_name":constant.requiredString,
        "vendor_name": constant.requiredString,
        "vendorId":constant.requiredString,
        "vendor_id":{
    	    "type": mongoose.Schema.Types.ObjectId,
    	    "ref": 'VendorMaintenance_'
        	},
      	"quantity": constant.requiredNumber,
        "remaining_quantity": constant.requiredNumber,
    	  "po_number": constant.requiredString,
    	  "invoice_number": constant.requiredString,
        "branchId": constant.requiredString,
        "branchName":constant.requiredString,
        "rate_per_piece": constant.requiredNumber,
        "rate_inc_tax" : Number,
        "tax":Number,
        "billing_amount": constant.requiredNumber,
		"freight": Number,
        "bill_date":Date,
        "category_name":String,
        "category_code":String,
        "uom": {
            type:String,
            enum:constant.uom,
            required:true
        },
        "created_by_employee_name":String,
        "created_by_employee_code":String,
        "modified_by_employee_name":String,
        "modified_employee_code":String
    },
    constant.timeStamps
);

module.exports = mongoose.model('inventory',inventorySchema);
