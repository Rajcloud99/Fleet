var mongoose = require ('mongoose');
var validator = require('validator');
var oGoogleCity = {
		c: String,
		s: String,
		p: Number,
		d: String,
		sf : String,
		address_components:{
			  street_number: String,//'short_name'
			  route: String,//'long_name'
			  sublocality_level_2: String,//'long_name'
			  sublocality_level_3: String,//'long_name'
			  sublocality_level_1: String,//'long_name'
			  sublocality: String,//'long_name'
			  locality: String,//'long_name'
			  administrative_area_level_2: String,//'long_name'
			  administrative_area_level_1: String,//'short_name',
			  administrative_area_level_1_f: String,//'long_name'
			  country : String,//'short_name',
			  country_f : String,//'long_name',
			  postal_code: Number,//'short_name'
		},
		formatted_address : String,
		geometry : {
			location:{
				lat: Number,
				lng:Number
			}
		},
		place_id:String,
		types:[String],
		url : String,
		vicinity:String		
	 };
var ShowInterestSchema = new mongoose.Schema(
  {
	  entityName :{
		 type: String,
		 enum: ['INTEREST'],
	     default:'INTEREST'
	     },
	  accept_price : String,
	  postingId : String,
	  posting_id: String,
	  booking_id : String,
	  bookingId:String,
	  interestId : String,
	  interestDate:String,
	  shedule_date:{type:Date},
	  posting : {
		  type: mongoose.Schema.Types.ObjectId,
	      ref: 'Posting'  
	     },
	  type : {
			type: String,
			enum: ['truck', 'load'],
			default:'load'
		 },
	  verified : {
			'type': 'String',
			'enum': ['active', 'pending', 'inactive','booked','history'],
			default : 'pending'
	    	},
	  status : {
			'type': 'String',
			'enum': ['pending', 'cancel','confirm','rejected','history'],
			default : 'pending'
	    	},
	  expected_price : Number,
	  mobile : Number,
	  interest_mobile : Number,
	  email:String,
	  load_person:String,
	  load_person_company:String,
	  load_person_contact:Number,
	  load_person_email:String,
	  vehicle_person:String,
      vehicle_person_contact:Number,
      vehicle_person_email:String,
      vehicle_person_company:String,
	  interest_owner_name:String,
	  interest_owner_company:String,
	  comment : String,
	  post_email : String,
	  post_mobile :Number,
	  post_owner_name:String,
	  post_owner_company: String,
	  postingDate : String,
	  userId:{
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User'
         },
      trucks :  [{
		  type: mongoose.Schema.Types.ObjectId,
	      ref: 'RegisteredVehicle'  
	     }],
	  drivers :  [{
		  type: mongoose.Schema.Types.ObjectId,
	      ref: 'Driver'  
	     }],
      posted_UId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User'
         },
      source:oGoogleCity,
      destination:[oGoogleCity],
  	  otp : Number,
	  nOtp : Number,
	  isRegisteredCustomer : {
		 type : Boolean,
		 default : true
	     },
	  otp_verified : {
	     type : Boolean,
		 default : false
	     },
	  quote_prices : [Number],
	  counter_quotes : [Number],
	  deal_price_posting : Number,
	  deal_price_interest : Number,
	  acceptedBy_posting : {
	 	 type : Boolean,
	     default : false
         },
      acceptedBy_interest : {
 	     type : Boolean,
 	     default : false
         },
      confirmBy_interest : {
  		 type : Boolean,
  		 default : false
  	     },
   	  booked_by_other : {
 	  	 type : Boolean,
		 default : false
	     },
   	  confirmBy_posting : {
	 	 type : Boolean,
		 default : false
	     },
	  truckType:{
		 _id : String,
		 code: String,
		 truck_type: String,
		 capacity:Number,
		 category:String
	     },
 	  weight:Number,
	  weight_unit :  {
			'type': 'String',
			'enum': ['Tonne', 'KG'],
			default : 'Tonne'
	    	},
	  materialType:  {
	     _id : String,
	     code: String,
	     material_type: String
	     },
	  payment_interest : {
	    	code: {
	   		 type:String,
				'enum': ['ADV','8A2D','7A3D','5A5D','DEL','NA'],
			     default : 'NA'
			 },
			desc: String,
			mode: { 
				type:String,
				'enum': ['Internet','Wallet','Cash','Check','NA'],
		        default : 'NA'
		     },
	     	pDate : {'type': Date },
	     	options : [{
	    		code: String,
	    		desc: String,
	    		cost : Number
	    	}],
	    	status :  { 
				type:String,
				'enum': ['pending','received','NA'],
		        default : 'pending'
		     },
	     },
	  invoice_interest : {	 
	    	invoice_no : Number,
	    	customer_name : String,
	    	customer_address : String,
	    	items :[{
	    		name : String,
	    		quantity : Number,
	    		price  : String,
	    		cost : Number
	    	}],
	    	total_amount_payable : Number,
	    	grand_total_amount : Number,
	    	bookingDate :  {'type': Date}
	     },
	  contact_person_payment_at_dropofLocation : {
	    	name : String,
	    	number : Number,
	    	amount : Number,
	    	percent: Number,
	    	status :  { 
				type:String,
				'enum': ['pending','received','paid','NA'],
		        default : 'pending'
		     },
	     },
   	  contact_person_payment_at_pickupLocation : {
	    	name : String,
	    	number : Number,
	    	amount : Number,
	    	percent: Number,
	    	status :  { 
				type:String,
				'enum': ['pending','received','paid','NA'],
		        default : 'pending'
		     },
	     },
	  dropofLocation : {
	  	  name : String,
	  	  mobile: Number,
	  	  address : String,
	  	  landmark : String,
	  	  city : String,
	  	  district : String,
	  	  state : String,
	  	  pincode: Number     	  
	    	},
      dropofTime : {'type': Date},
  	  pickupLocation : {
	  	  name : String,
	  	  mobile: Number,
	  	  address : String,
	  	  landmark : String,
	  	  city : String,
	  	  district : String,
	  	  state : String,
	  	  pincode: Number 
	  	 },
	  pickupTime : {'type': Date},
	  no_of_trucks : Number,
      created_at: {'type': Date, default: Date.now()},
	  latModified: {'type': Date, default: Date.now()},
	  offer: {
			type: Number,
			enum: [0, 1],
			default: 0
	    	},
	  status_comment:String,
	  truck_driver_details: [{
         truck : {
		  type: mongoose.Schema.Types.ObjectId,
	      ref: 'RegisteredVehicle'  
	  	 },
	  	 truck_id:String,
	  	 truck_number_palate:String,	  	
         driver : {
		  type: mongoose.Schema.Types.ObjectId,
	      ref: 'Driver'  
	  	 },
	  	 truckType:	{
	     _id : String,
	     code: String,
	  	 truck_type: String,
	  	 category: String,
	  	 capacity:Number
	     },
	     weight:Number,
	  	 driver_id:String,
	  	 driver_name:String,
	  	 driver_mobile:Number,
	  	 varified_by_admin:{
         type : Boolean,
         default : false
         },
         varified_by_user:{
         type : Boolean,
         default : false
         },
         delivered:{
         type : Boolean,
         default : false
         },
         comment:String
         }]
  }
);

module.exports = mongoose.model('ShowInterest',ShowInterestSchema);
