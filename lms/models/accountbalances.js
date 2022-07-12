/**
 * Initial version by: Kamal Mewada
 * Initial version created on: 28/05/2019
 */

let mongoose = require('mongoose');

let AccountsBalances = new mongoose.Schema({
		clientId: constant.requiredString,
	    account:{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
	    date:Date,
		ob:{
			type:Number,
			default:0
		},
		cb:{
			type:Number,
			default:0
		},
		cr:{
			type:Number,
			default:0
		},
		dr:{
			type:Number,
			default:0
		},
		deleted:{
			type: Boolean,
			default: false
		},
		},
	{ ...constant.timeStamps }
);

module.exports = mongoose.model('accountbalances', AccountsBalances);
