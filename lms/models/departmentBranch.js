/**
 * Created by manish on 6/1/17.
 */
var mongoose = require ('mongoose');

var DepartmentBranchSchema   = new mongoose.Schema(
    {
        "clientId":constant.requiredString,
        "depName":constant.requiredString,
        "depId":constant.requiredString,
        "branchId":constant.requiredString,
        "strength":Number,
        "head":String,
        "headEmployeeId":String,
        "email":String,
        "openDate":{
        	type:Date,
			default:Date.now()
		}
    },
    constant.timeStamps
);

module.exports = mongoose.model('DepartmentBranch', DepartmentBranchSchema);
