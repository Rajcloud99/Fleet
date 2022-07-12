const ExcelReader = require('../../utils/ExcelReader');
const mongoose = require('mongoose');
const async = require('async');
const moment = require('moment');
/*
* Created By Harikesh dated: 17-10-2019
* */
const RegisteredVehicleModel = commonUtil.getModel('registeredVehicle');
const serverSidePage = require('../../utils/serverSidePagination');

// Start tripGr Report Schema - Dated: 17-10-2019 - by Harikesh
var tripGrReportSchema = new mongoose.Schema({

		gr_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "TripGr"
		},
		trip_no: Number,
		grNumber:String,
		vehicle_no:String,
		tripCancelled: {
			type: Boolean,
			default: false
		},
		billNo:String,
		ownershipType:String,
		segment_type:String,
		gr_type: {
			type: String,
			enum: constant.gr_types
		},
		client_name:String, //customer.prim_contact_name
		brch_name:String,
		clientId: constant.requiredString,
		last_modified_at: Date,
		payment_type: String,
		payment_basis: String,
		rate: Number,
		basicFreight: Number,//only gr freight without extra charges and deductions
		totalFreight: Number,//with charges
		cGST: Number,
		sGST: Number,
		iGST: Number,
		cGST_percent: Number,
		sGST_percent: Number,
		iGST_percent: Number,
		totalAmount: Number,//Total with Tax
		remarks: String,
		status:String,
		grDate:Date,
		internal_rate: Number,
		created_at: Date,
		expected_arrival: Date,
		container: [{
			number: String,
			cType: String,
			length: Number,
			c_id: String,
			oldNumber: []
		}
		],

		// Invoices
		inv: [{
			routeDistance: Number,
			baseValue: Number,
			rateChartRate: Number,
			baseValueLabel: String,

			invoiceNo: String,
			invoiceDate: Date,
			invoiceAmt: Number, // Invoice  Amount
			rate: Number, // it comes from rateChart
			billingRate: Number,
			material: {
				material_type: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'MaterialType'
				},
				materialName: String,
				groupName: String,
				groupCode: String,
				groupId: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "MaterialGroup",
				}
			},
			showOnBill: {
				type: Boolean,
				default: true
			},

			// Actual Values
			weightPerUnit: Number, // it holds weight in case of PMT and Weight/Unit in case of PUnit
			noOfUnits: Number, // it hold Number Of Unit in case on PUnit only

			// Billing Values
			billingWeightPerUnit: Number, // it holds weight in case of PMT and Weight/Unit in case of PUnit
			billingNoOfUnits: Number, // it hold Number Of Unit in case on PUnit only

			freight: Number, // freight = rate * (BillingNoOfUnits(in case of PUnit) or BillingWeightPerUnit(in case of Weight))

			loadRefNumber: String,
			ref1: String,
			ref2: String,
			ref3: String,
			ref4: String,
			ref5: String,
			ref6: String,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			},
		}],
		provisionalBill: [{
			ref:{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'bill'
			},
			percent: Number,
			billNo:String,
			billDate:Date,
		}],
		eWayBills: [{
			number: String,
			expiry: Date,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			}
		}],
		statuses: [{
			status: {
				type: String,
				enum: constant.grItemStatus
			},
			date: Date,
			systemDate: Date,
			user_full_name: String,
			user_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			remark: String,
			gpsData: {
				type: Object,
				validate: {
					validator: function (o) {
						return !Array.isArray(o);
					}
				}
			}
		}],
		vehicle: { // registerd vehicle
			rvhl_id:{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'RegisteredVehicle'
			},
			model:String,
			owner_name:String,
			vendor_id:{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'VendorTransport'
			},
			veh_group_name:String,
		},
		trip: { // Trip
			tr_id:{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'tripV2'
			},
			trip_no:Number,
			vehicle_no:String,
			ownershipType:String,
			segment_type:String,
			venDeal_remark:String,
			venDeal_loadSlip: String,
		},
		customer: { // Customer
			c_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Customer'
			},
			c_name:String,
		},
		consignor: { // consignor
			cogo_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'consignor_consignee'
			},
			cogo_name:String,
		},
		consignee: { //consignee
			coge_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'consignor_consignee'
			},
			coge_name:String,
		},
		bilgprty: { // Billing Party
			bp_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'billingparty'
			},
			bp_name:String,
			bp_clntid:String,
		},
		tRoute: { // Transport Route
			rout_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'TransportRoute'
			},
			rout_name:String,
		},
		ack: { // Acknowledge
			ackSystemDate:Date,
			ack_source:String,
			ack_destin:String,
		},
		charges: { // Charges
			incentive: Number,
		},
		branch: { // Branches
			brch_id:{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Branch'
			},
			brch_name:String,
		},
		bill: { // Bill
			bill_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'bill'
			},
			billNo:String,
			billDate:Date,
		},
		pod: { // POD
			arNo: String,
			date: Date,
			systemDate: Date,
			arRemark: String,
			billingLoadingTime: Date,
			billingUnloadingTime: Date,
			loadingArrivalTime: Date,
			unloadingArrivalTime: Date,
			received: {
				type: Boolean,
				default: false
			},
		},
		fpa: {
			amt: Number,
			factor: Number,
			refNo: String,
			rmk: String,
			vndr: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'VendorTransport'
			},
			vch: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Voucher'
			}
		},
		supplementaryBill: {
			totalFreight: Number,
			basicFreight: Number,
			rate: Number,
			totalCharges: Number,
			totalDeduction: Number,
			incentivePercent: Number,
		},
		supplementaryBillRef: [{
			ref:{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'bill'
			},
			billNo:String,
			billDate:Date,
		}],
		isNonBillable: {
			default: false,
			type: Boolean
		},
		moneyReceipt: {
			collection: [{
				mrOffice: String,
				mrDate: Date,
				mrNo: String,
				mrAmount: Number,
				paymentMode: String,
				paymentRef: String,
				paymentRmk: String,
				paymentDate: Date,
				partyName: String,
			}],
			branch: {
				ref:  {type: mongoose.Schema.Types.ObjectId, ref: 'Branch'},
				name: String,
			},
			deduction:{
				'loadingAmount': Number,
				'unloadingAmount': Number,
				'ltDeliveryAmount': Number,
				'damageAmount': Number,
				'shortageAmount': Number,
				'tdsAmount': Number,
				'munshiyanaAmount': Number,
			},
			'totalMrAmount': Number,
			'chitPending': String,
			'balanceFreight': Number,
			'paymentParty': String,
			'responsiblePerson': String,
			'mobileNo': Number,
			'emailId': String,
			'remark': String,
			'letterNo': String,
		},
	},
	{usePushEach: true}
);

// END tripGr Report Schema
tripGrReportSchema.index({gr_id: 1}, {unique: true});

module.exports = mongoose.model('tripGrReport', tripGrReportSchema);
