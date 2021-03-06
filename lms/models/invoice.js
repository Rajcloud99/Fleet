/**
* @Author: bharath
* @Date:   2016-10-20T11:54:41+05:30
*/

var mongoose = require('mongoose');
var oManager = {
	"name" : String,
	"mobile" : Number,
	"email" : String,
	"empl_id" :String,
	"userId" : String
};
var InvoiceSchema = new mongoose.Schema({
	status :{
		  type: String,
			enum: ['pending','no_bill', 'billed', 'approved', 'dispatched', 'cancelled'],
			default:'pending'
	},
	gr_no: String,
	ack_stage : Boolean,
	payment_basis:String,
	edited_by:[{
		date: Date,
		name:String,
		userId: String
	}],
	approved_by:{
		date: Date,
		name:String,
		userId: String
	},
	trip_start_time : Date,
	trip_start_user : String,
	trip_end_time : Date,
	trip_end_user : String,
	billed_by:{
		date: Date,
		name:String,
		userId: String
	},
	created_by:{
		date: Date,
		name:String,
		userId: String
	},
	dispatched_by:{
		date: Date,
		name:String,
		userId: String
	},
	cancelled_by:{
		date: Date,
		name:String,
		userId: String
	},
	clientId:constant.requiredString,
	billing_party_gstin_no:String,
	gstin_state_code:String,
	isTransporter: Boolean,
	po_number: Number,
	apply_gst : {
		type: Boolean,
		default : false
	},
	tax_code:String,
	customer_id: String,
	customer_name:String,
	sap_id:String,
	bill_no: String,
	due_date: Date,
	billed_date: Date,
	cha_id: String,
	cha_name: String,
	shipping_line_id: String,
	shipping_line_name: String,
	billing_party_id:String,
	billing_party_name: String,
	billing_party_address: String,
	invoice_no: constant.requiredNumber,
	invoice_date: Date,
	m_vehicle_no: String,
	vehicle_type:String,
	vehicle_type_id : String,
	vehicle_no:String,
	vehicle_sap_id : String,
	vehicle:String,

	sub_total: Number,
	//service_tax_percent:Number,
	advance: Number,
	balance: Number,
	loading_charges : Number,
	unloading_charges : Number,
	isMarketVehicle:Boolean,
	boe_no: [String],
	booking_no: [Number],
	booking_type: [String],
	container_no : [String],
	trip_no: Number,
	//munshiyana_charges : Number,
	other_charges : Number,
	rate: Number,
	freight: Number,
	//previous_rate: Number,
	//previous_freight: Number,
	chalan : Number,
	detaintion : Number,
	damage : Number,
	toll_tax_total_price: Number,
	driver_cash: Number,
	diesel_charges: Number,
	total_expenses: Number,
	//service_tax: Number,
	//service_tax_code: String,
	//pan: String,
	note: String,
	//mob_no: Number,
	//email: String,
	datetime: Date,
	//dispatch_status : {type:Boolean,default:false},
	//dispatch_stage : {type:Boolean,default:true},
	branch : String,
	courier_name : String,
	courier_id : String,
	courier_office : String,
	courier_office_id : String,
	courier_date : Date,
	dispatch_date : Date,
	dispatch_person : String,
	driver_name : String,
	driver_sap_id : String,
	driver_id:String,
	branch_id:String,
	booking_info: [{
		sl_no: Number,
		payment_basis:String,
		payment_type:String,
		no_of_unit: Number,
		//boe_no: Number,
		isTransporter: Boolean,
		isMarketVehicle:Boolean,
		boe_no: [String],
		totalAdvance: Number,
		totalBalance: Number,
		//booking_no: Number,
		container_no : [String],
		container_size : [String],
		gr_type: String,
		branch : String,
		trip_no: Number,
		gr_date: Date,
		gr_no: String,
		veh_no: String,
		m_vehicle_no: String,
		veh_type: String,
		route: String,
		consigner_name: String,
		consignee_name: String,
		weight: Number,
		weight_unit: String,
		rate: Number,
		freight: Number,
		previous_rate: Number,
		previous_freight: Number,
		remarks : String,
		gr_charges : Number,
		loading_charges:Number,
		unloading_charges:Number,
		weightman_charges : Number,
		fuel_price_hike : Number,
		//munshiyana_charges : Number,
		other_charges : Number,
		ovr_wt_chrgs: Number,
		dtn_amt: Number,
		//wt_charge: Number,
		othr_exp: Number,
		total: Number,
	}],
	payment:[{
		key: String,
		mode: String,
		amount: Number,
		status: String,
		reference_no:String,
		person:String,
		remark:String,
		scheduled_date:Date,
		payment_date: Date
	}]
});

InvoiceSchema.plugin(mongoose_delete,{overrideMethods:'all'});
module.exports = mongoose.model('Invoice', InvoiceSchema);
