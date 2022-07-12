var mongoose = require ('mongoose');
var validator = require('validator');
var CallbackSchema = new mongoose.Schema(
  {
	  entityName :{
			type: String,
			enum: ['callbacknumber'],
			default:'callbacknumber'
		}, 
    mobile : Number,
    created_at: {'type': Date, default: Date.now()}
  }
);

module.exports = mongoose.model('CustomerCallback',CallbackSchema);
