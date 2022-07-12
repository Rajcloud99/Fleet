/**
 * Created by pratik on 16/11/16.
 */

var mongoose = require ('mongoose');

var tripExpenseSchema = new mongoose.Schema(
	{
		clientId: String,
		trip_no : Number,
		vehicle_no : String,
		driver_name : String,
		driver_sap_id:String,
		gr_nos : [String],
		total_weight : Number,
		weight_unit : String,
		sap_id:String,
		branch:String,
		isMarketcle : Boolean,
		isMultiCustomer : Boolean,
		vendor_payment : {
			advance: Number,
			toPay: Number
		},
		advance :Number,
		balance:Number,
		diesel_expenses : [{
			vendor_name : String,
			vendor_id : String,
			additional_diesel : Boolean,
			station_address : String,
			station_id : String,
			fuel_type : String,
			rate : Number,
			litres : Number,
			amount : Number
		}],

		//     created_by: {
		//     date: Date.now(),
		//     name: vendorTransport.created_by_name,
		//     last_modified: vendorTransport.last_modified_by_name

		//  },

		created_by: {
			date: Date,
			name: String,
			last_modified: String

		},


		driver_additional_cash_alloted : Number,
		driver_actual_cash_alloted : Number,

		gr_charges : Number,
		weightman_charges : Number,
		loading_charges : Number,
		unloading_charges : Number,
		//munshiyana_charges : Number,
		other_charges : Number,
		rate : Number,
		chalan : Number,
		detaintion : Number,
		damage : Number,
		deleted:{type:Boolean,default:false},
		diesel_expenses_total_price: Number,
		diesel_expenses_total_litre: Number,
		toll_tax_expenses : [{
			toll_name : String,
			toll_address : String,
			toll_cost : Number
		}],
		toll_tax_total_price: Number,
		additional_expenses : [{
			reason : String,
			cost : Number
		}],
		additional_expenses_total_price : Number,
		penalty : [{
			reason : String,
			cost : Number
		}],
		penalty_total_price : Number,
		driver_cash : Number,
		payment:[{
			key: String,
			mode: String,
			amount: Number,
			status: String,
			reference_no:String,
			person:String,
			remark:String,
			scheduled_date:Date,
			payment_date: Date,
			"banking_detail":{
				"a_c":String,
				"ifsc":String,
				"declaration":String
			},
		}],
		total_expense: Number,
		customer_name:String,
		route_name : String,
		customer_id:String,
		vendor_name:String,
		vendor_contact:Number,
		vendor:{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'VendorTransport'
		}
	}
);

module.exports = mongoose.model('TripExpense', tripExpenseSchema);
