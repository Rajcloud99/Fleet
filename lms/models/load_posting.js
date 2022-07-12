var mongoose = require('mongoose');
var validator = require('validator');
var City = require('./city');
var User = require('./user');

var LoadPostingSchema = new mongoose.Schema(
  {
	  postingId : String,
	  expected_price : Number,
	  mobile : Number,
	  verified : 
		{
			type: String,
			enum: ['active', 'pending', 'inactive'],
			default : 'pending'
		},
      userId:
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      interested_to: [{
	        type: mongoose.Schema.Types.ObjectId,
	        ref: 'ShowInterest'
	      }],
     postingDate : String,
     source:
      {
        type: String,
        ref: 'City',
        required: true
      },
    destination:
      [
        {
          type: String,
          ref: 'City',
          required: true
        }
      ],
    radius:
      {
        type: Number
      },
     shedule_date:
      {
    	 type: Date  
      },
    date:
      {
        from:
          {
            type: Date
          },
        to:
          {
            type: Date
          }
      },
       weight:
          {
            type: Number,
            min: 0
          },
       materialType:
          {
    	   _id : String,
   	       code: String,
   	       material_type: String
          },
       truckType:
          {
    	   _id : String,
   	       code: String,
   	       truck_type: String
          },
       load_type :
         {
    	   type: String,
    	   enum : ['full','partial'],
    	   default : 'full'
    	  },
    	refrigeration :{
    		type : Boolean,
		    default : false
	     },
    	no_of_trucks : Number,
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
      created_at: {type: Date, default: Date.now()},
      latModified: {type: Date, default: Date.now()}
  }
);

module.exports = mongoose.model('LoadPosting',LoadPostingSchema);
