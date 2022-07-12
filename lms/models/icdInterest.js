var mongoose = require('mongoose');
var validator = require('validator');
var ICDcity = require('./icdcity');
var User = require('./user');

var ICDShowInterestSchema = new mongoose.Schema(
	{
	  postingId : String,
	  interestId : String,

	  entityName :{
			type: String,
			enum: ['INTEREST'],
			default:'INTEREST'
	  },

	  posting : {
		  type: mongoose.Schema.Types.ObjectId,
	      ref: 'ICDContainers'  
	  },

	  truck_driver_detail: [
    	{
      		truck : {
		  		type: mongoose.Schema.Types.ObjectId,
	      		ref: 'RegisteredVehicle'  
	  		},
	  	
       		driver : {
		  		type: mongoose.Schema.Types.ObjectId,
	      		ref: 'Driver'  
	  		},
	  		
	  	
      		twentyFeet: Number,
      		fourtyFeet: Number
    	}],
	  containers: [
	  	{
	  		container_type: String,
        	cost : {
            	type: Number,
            	min: 0
        	},
        
        	posted_container:{
            	type: Number,
            	min: 0
        	},
        
        	remaining_container:{
            	type: Number,
            	min: 0
        	},
    }],

	 type : {
				type: String,
				enum: ['container'],
				default:'container'
	 },
	 
	 verified : 
		{
			'type': 'String',
			'enum': ['active', 'pending', 'inactive','booked','history'],
			default : 'pending'
		},

	 isDaily : {
        	type : Boolean,
        	default : false
     },

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

	 radius: Number,
	 interest_owner_mobile : Number,
	 interest_owner_email:String,
	 interest_owner_name:String,
	 interest_owner_company:String,

	 post_owner_email : String,
	 post__owner_mobile :Number,
	 post_owner_name:String,
	 post_owner_company: String,
	  
	 userId:
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      
     source:
      {
        port_name: { 
        	type:String,
          	ref: 'ICDcity',
          	required: true
        }
      },
     destination:
      [
        {
          port_name: { 
          		type:String,
          		ref: 'ICDcity',
          		required: true
       	  }
        }
      ],

  	 isRegisteredCustomer : {
			type : Boolean,
			default : true
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
		    }
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
		     }
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
	  	  
	 date: {
    		 "pickDate": {'type': Date},
  		    },

	 repoTime : {'type': Date},
	  	
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

	 bank_details : [
	   {
	  		bank_name : String,
	  		branch_name : String,
	  		customer_name : String,
	  		account_no : Number,
	  		ifscCode : String
	    }],
		
	 cancelledGR : String,
		
	 created_at: {'type': Date, default: Date.now()},
	 latModified: {'type': Date, default: Date.now()}
  
  });

module.exports = mongoose.model('ICDShowInterest',ICDShowInterestSchema);