
let mongoose = require('mongoose');

let DuesSchema = new mongoose.Schema(
	{
		clientId: constant.requiredString,
		duesType: {                //dues Type
			type: String,
			enum:  ['Fitness Worksheet', 'Good and Token Tax', 'Sale Deed', 'Insurance', 'Permit', 'EMI', 'Calibration', 'Miscellaneous', 'PUC']
		},
		amount: Number,            //amount
		tpAmount: Number,          //third party amount
		prepaidAmt: Number,
		othrexp: Number,           //Other Expenses
		proCharge: Number,           //Processing Charges
		tdsAmt: Number,             //TDS Amount
		chqueno: String,           //Cheque No
		refNo: String,             //Ref Number
		frmdt: Date,               //from Date
		todt: Date,                //to Date
		date: Date,                // Date
		plcnm: String,             //Place Name
		rmk: String,               //remark
		narration: String,         //narration
		crtficNo: String,          //Certificate no
		insBroker: String,         //Insurance Broker
		plcyNo: String,            //Policy no
		invoiceNo: String,            //invoice no
		prmityp: {                   //Permit Type
			type: String,
			enum:  ['National Permit','5 years']
		},
		plcytyp: {                   //Policy Type
			type: String,
			enum:  ['Comprehenssive', '3rd Party']
		},
		txtyp: {                  //tax Type
			type: String,
			enum:  ['HR TAX', 'NL TAX', 'KA TAX', 'MH TAX']
		},

		insCompany: {                //Insurance Company
			type: String,
			enum: ['ICICI','Oriental','Bajaj','New india']
		},
		insCtgry: {                  //Insurance type category
			type: String,
			enum: ['Capex', 'Opex']
		},
		insType: {                   //Insurance type
			type: String,
			enum: ['New', 'Renewal']
		},
		"tdsRate": Number,            //TDS %
		"cGST": Number,            //cgst amount
		"sGST": Number,            //sgst amount
		"iGST": Number,            //igst amount
		"iGST_percent": Number,    //igst %
		"cGST_percent": Number,    //cgst %
		"sGST_percent": Number,    //sgst %
		"tPcGST": Number,          //third party cgst amount
		"tPsGST": Number,          //third party sgst amount
		"tPiGST": Number,          //third party igst amount
		"tPiGSTpCent": Number,     //third party igst %
		"tPcGSTpCent": Number,     //third party cgst %
		"tPsGSTpCent": Number,     //third party sgst %
		from_account: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts",
		},
		to_account: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts",
		},
		prepaidAcc: {          	   // prepaid account
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts",
		},
		iGSTAccountName: String,
		iGSTAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		cGSTAccountName: String,
		cGSTAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		sGSTAccountName: String,
		sGSTAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		// tPiGSTAccName: String,
		// tPiGSTAcc: {
		// 	type: mongoose.Schema.Types.ObjectId,
		// 	ref: "accounts"
		// },
		// tPcGSTAccName: String,
		// tPcGSTAcc: {
		// 	type: mongoose.Schema.Types.ObjectId,
		// 	ref: "accounts"
		// },
		// tPsGSTAccName: String,
		// tPsGSTAcc: {
		// 	type: mongoose.Schema.Types.ObjectId,
		// 	ref: "accounts"
		// },
		tdsAccountName: String,
		tdsAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		veh_no: String,           //Vehicle Number
		veh: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'RegisteredVehicle'
		},
		voucher: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Voucher'
		},
		branch_name: String,       //branch name
		branch: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		created_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},

		aVehCollection: [{  //vehicle collection
			"amount": Number,             //amount withOut GST
			"total": Number,             //total amount with GST
			"prepaidAmt": Number,        //prepaid amount
			"tpAmount": Number,          //third party amount
			"proCharge": Number,         //Processing Charges
			"othrexp": Number,           //Other Expenses
			"frmdt": Date,               //from Date
			"todt": Date,                //to Date
			"plcyNo": String,            //Policy no or CoverNote No
			"permitNo": String,            //Permit No
			"tdsRate": Number,            //TDS %
			"tds": {
				default: false,
				type: Boolean
			},
			"prmityp": {                   //Permit Type
				type: String,
				enum:  ['National Permit','5 years']
			},
			plcytyp: {                   //Policy Type
				type: String,
				enum:  ['Comprehenssive', 'Comprehensive with zero dep', '3rd Party']
			},
			"cGST": Number,            //cgst amount
			"sGST": Number,            //sgst amount
			"iGST": Number,            //igst amount
			"iGSTPercent": Number,    //igst %
			"cGSTPercent": Number,    //cgst %
			"sGSTPercent": Number,    //sgst %
			"tPcGST": Number,          //third party cgst amount
			"tPsGST": Number,          //third party sgst amount
			"tPiGST": Number,          //third party igst amount
			"tPiGSTpCent": Number,     //third party igst %
			"tPcGSTpCent": Number,     //third party cgst %
			"tPsGSTpCent": Number,     //third party sgst %
			"veh_no": String,           //Vehicle Number
			"vehModel": String,           //Vehicle Model
			"vehOwnerName": String,           //Vehicle OwnerName
			"emiNo": String,            //EMI No
			"calibrationNo": String,            //Calibration No
			"veh": {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'RegisteredVehicle'
			},
		}],
		purchaseBill: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'purchaseBill'
		},
	},
	constant.timeStamps
);

module.exports = mongoose.model('dues', DuesSchema);
