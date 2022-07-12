var mongoose = require ('mongoose');

var cronLogSchema = new mongoose.Schema({
		clientId: String,
		name:String,//collection or report name
		st:Date,
		ip:String,//initiator server name or ip
		ed:Date,
		filters:{},
		analytics:{},
		completed:{
			type:Boolean,
			default:false
		},
		msg:String
	}
);

module.exports = mongoose.model('cronlogs', cronLogSchema);
