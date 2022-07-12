var mongoose = require('mongoose');

var accidentVehicleSchema = new mongoose.Schema(
	{
        vehicle:{type: mongoose.Schema.Types.ObjectId, ref: "dues"},
		date:Date,
		place:constant.requiredString,
		policeFIR:constant.requiredString,
		spotSrvyName:constant.requiredString,   //on spot survey person name
		spotSrvyNo:Number,               // on spot survey person contact number
		plcyNo: constant.requiredString,            //Policy no
		plcytyp: {                                 //Policy Type
			type: String,
			enum:  ['Comprehenssive', 'Comprehensive with zero dep','3rd Party']
		},
		frmInsDt:Date,
		toInsDt:Date,
		fitnessToDt:Date,
		taxVal:Date,
		permitNo:String,
		consignee: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'consignor_consignee'
		},
		trip_no:Number,
		consigneeName: String,
		claimNo:constant.requiredString,
		finalSrvyDate:Date,                        //final survey date
		finalSrvyName:String,                      //final survey person
		estCost:Number,                               //estimated cost
		reinspectionDate:Date,
		workshopName:constant.requiredString,
		address:constant.requiredString,
		finalPayment:{
			amount:Number,
			chequeNO:String,
			date:Date
		},
		driverName:constant.requiredString,
		driverLicenceNumber:constant.requiredString,
		clientId: String,
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

module.exports = mongoose.model('AccidentVehicle', accidentVehicleSchema);
