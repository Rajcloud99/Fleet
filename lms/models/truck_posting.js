var mongoose = require ('mongoose');
var validator = require('validator');

var TruckPostingSchema = new mongoose.Schema(
  {
	  postingId : String,
	  verified : 
		{
			'type': 'String',
			'enum': ['active', 'pending', 'inactive'],
			default : 'pending'
		},
	  expected_price : Number,
	  mobile : Number,
	  comment : String,
	  postingDate : String,
	  userId:
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      driverId:
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
      },
     truck:
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RegisteredVehicle'
       },
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
        type: Number,
        min: 0.5,
        max: 50
      },
    date:{
      from: {
        type: Date
      },
      to: {
        type: Date
      }
    },
    truckType:
	{
	    _id : 'String',
	  	code: 'String',
	  	truck_type: 'String'
	},
	weight:
	{
		type: Number,
		min: 0.5,
		max: 200
	},
	interested_to: [{
	        type: mongoose.Schema.Types.ObjectId,
	        ref: 'ShowInterest'
	      }],
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
    created_at: {'type': Date, default: Date.now()},
	latModified: {'type': Date, default: Date.now()}
  }
);

module.exports = mongoose.model('TruckPosting',TruckPostingSchema);
