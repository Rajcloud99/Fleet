var mongoose = require('mongoose');

var driverCounsellingSchema = new mongoose.Schema(
	{
		vehicle:{type: mongoose.Schema.Types.ObjectId, ref: "RegisteredVehicle"},
		date:Date,
		totalAdv:{type:Number,required:true},   //total advance
		advKm:{type:Number,required:true},   //advance kilometer
		totalExpense:{type:Number,required:true},
		expKm:{type:Number,required:true},
		totalKm:{type:Number,required:true},
		tripBal:{type:Number,required:true},
		driverCode:{type: mongoose.Schema.Types.ObjectId, ref: "Driver"},
		avgRun:{type:Number,required:true},
		remark:{type:String,required:true},
		driverBalCopy:{type:Number,required:true},
		driverBalSystem:{type:Number},
		clientId: String,
		fleet:{type:String},
		created_by_name: String,
		created_by_employee_code: String,
		created_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		last_modified_by_name: String,
		last_modified_employee_code: String,
		last_modified_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	},
	constant.timeStamps
);

module.exports = mongoose.model('DriverCounselling', driverCounsellingSchema);
