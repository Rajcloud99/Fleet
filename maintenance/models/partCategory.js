/**
 * Created by manish on 21/12/16.
 */
var mongoose = require ('mongoose');

var PartCategorySchema = new mongoose.Schema(
    {
        "name" : constant.requiredString,
        "code":constant.requiredString,
        "type":{
            type:String,
            enum:constant.spType,
            default:"Spare"
        },
        "clientId":constant.requiredString,
        "description":String,
        "created_by_name":String,
        "created_by_employee_code":String,
        "last_modified_by_name":String,
        "last_modified_employee_code":String,
    },
    constant.timeStamps
);

module.exports = mongoose.model('PartCategory', PartCategorySchema);
