var mongoose = require ('mongoose');

var otherExpensesSchema = new mongoose.Schema(
    {
        "clientId": constant.requiredString,
        "expense_no": constant.requiredString,
        "type":{
            type : String,
            enum : constant.aExpenseType,
            default : 'Other'
        },
        "jobId":String,
        "branchName": String,
        "branchId": String,
		"vehicle_no": constant.requiredString,
        "created_by_name":constant.requiredString,
        "created_by_id":constant.requiredString,
        "approved_by_name":String,
        "approved_by_id":String,
		"remark":String,
		"partyName":String,
		"amount":Number,
		"bill_no": constant.requiredString,
		"bill_date":Date
    },
    constant.timeStamps
);

module.exports = mongoose.model('otherExpenses',otherExpensesSchema);
