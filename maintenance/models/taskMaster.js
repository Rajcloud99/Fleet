var mongoose = require ('mongoose');

var TaskMasterSchema = new mongoose.Schema(
    {
        "clientId":String,
        "task_name":{
            type:String,
            required:true
        },
        "desc":String,
        "part_categories":{
            type:[String],
            required:true
        },
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

module.exports = mongoose.model('TaskMaster', TaskMasterSchema);
