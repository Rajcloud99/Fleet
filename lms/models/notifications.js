var mongoose = require ('mongoose');
var validator = require('validator');
var requiredString =
	{
		'type': 'String',
		'required': 'true'
	}
;

var NotificationsSchema = new mongoose.Schema(
	{
		clientId:String,
		entityName :{
	  	  type: String,
		    enum: ['NOTIFICATION'],
		    default:'NOTIFICATION'
	     },
	    users:  [{
		    type: mongoose.Schema.Types.ObjectId,
	        ref: 'User'
	     }],
	    feature: {
				type:String,
				required:true
			},
			message:{
				type:String,
				required:true
			},
			category:String,
	    priority:String
    },
		constant.timeStamps
);


module.exports = mongoose.model('notifications', NotificationsSchema);
