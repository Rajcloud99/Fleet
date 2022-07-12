var mongoose = require ('mongoose');

var TyreMasterSchema = new mongoose.Schema(
    {
        "clientId": constant.requiredString,
        "tyre_category":{
          type:String,
          enum:constant.tyreCategory,
          required:true
        },
		"purchase_category":{
			type:String,
			enum:constant.tyreCategory,
			required:true
		},
		"spare":{
			"type": mongoose.Schema.Types.ObjectId,
			"ref": 'parts'
		},
        "spare_code":String,
        "spare_name":String,
        "tyre_number":constant.requiredUniqueString,
        "dateOfPurchase":Date,
        "status":{
          type:String,
          enum:constant.tyreStatus,
          required:true
        },
        "invoice_date": Date,
        "association_date":Date,
        "vehicle_no":String,
        "structure_name":String,
	    "vehicle_type":{
		    type:String,
		    enum:constant.vehicleType
	    },
        "manufacturer":String,
	    "vendor_name": String,
	    "vendorId":String,
	    "vendor_id":{
		    "type": mongoose.Schema.Types.ObjectId,
		    "ref": 'VendorMaintenance_'
	    },
        "model":String,
        "rate_per_piece":Number,
        "billing_amount":Number,
        "current_price":Number,
        "mileage":Number,
		"remark":String,
        "total_run":Number,
		"freight":Number,
        "tax":Number,
        "retread_count":{
          type:Number,
          default:0
        },
        "invoice_number":String,
	    "po_number": String,
        "created_by_employee_code":String,
        "created_by_employee_name":String,
        "issue_id": String
    },
    constant.timeStamps
);

module.exports = mongoose.model('TyreMaster', TyreMasterSchema);
