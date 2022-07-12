
var mongoose = require ('mongoose');

var partsSchema = new mongoose.Schema(
    {
        "clientId":constant.requiredString,
		"sn":Number,
        "code": constant.requiredString,
        "category_wise_code":constant.requiredString,
        "name":constant.requiredString,
        "category_name":constant.requiredString,
        "category_code":constant.requiredString,
		"mileage":Number,
        "type":{
            type:String,
            enum:constant.spType,
            default:"Spare"
        },
    	"uom": {
            type:String,
            enum:constant.uom,
            required:true
        },
        "min_buffer":constant.requiredNumber,
        "max_buffer":constant.requiredNumber,
    	"vehicle_models":[String],
        "active_status":{
            type:Boolean,
            default:true
        },
        "room":String,
        "shelf":String,
        "rack":String,
		"rate":Number,
		"manufacturer":String,
    	"created_by_name":String,
        "created_by_employee_code":String,
        "last_modified_by_name":String,
        "last_modified_employee_code":String
    },
    constant.timeStamps
);

module.exports = mongoose.model('Parts',partsSchema);
