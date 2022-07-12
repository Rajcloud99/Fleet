var mongoose = require ('mongoose');
var validator = require('validator');

var icdsRateSchema = new mongoose.Schema(
  {  
   truckTypes:
	[{
	    _id : String,
	  	code: String,
	  	truck_type: String,
	  	capacity:Number,
	  	price_per_truck : Number
	}],
	post_type:  {
		'type': 'String',
		'enum': ['SL'],
		default : 'SL'
	},
  userId:
    {
	    type: mongoose.Schema.Types.ObjectId,
	    ref: 'User'
	},
   source:
   {
		'_id': String,
		'c':  String,
		's': String,
		'p': Number,
		'd': String,
	},
    destination:
     [
      {
   		'_id': String,
   		'c':  String,
   		's': String,
   		'p': Number,
   		'd': String,
   	}
     ],
  verified : {
		type : Boolean,
        default : false
    },
    containerTypes:
    [{
       _id : String,
      	code: String,
       container_type: String,
       price_per_container: Number
    }],
  total_ammount_payable : Number,
  trip_price : Number,
  companyId : String,
  companyName : String,
  created_at: {'type': Date, default: Date.now()},
  latModified: {'type': Date, default: Date.now()}
  }
);

module.exports = mongoose.model('IcdsRate',icdsRateSchema);
