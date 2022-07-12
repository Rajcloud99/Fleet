/**
 * Created by manish on 21/12/16.
 */
var mongoose = require ('mongoose');

var PartTypeSchema = new mongoose.Schema(
    {
        "clientId":String,
        "name" : constant.requiredString,
        "code": constant.requiredString,
        "group_name":String,
        "group_code":String,
        "group_id": {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PartGroup",
            required: true
        },
        "desc":String,
        "created_by_name":String,
        "created_by_employee_code":String,
        "created_by":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        "last_modified_by_name":String,
        "last_modified_employee_code":String,
        "last_modified_by":{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    constant.timeStamps
);

module.exports = mongoose.model('PartType', PartTypeSchema);