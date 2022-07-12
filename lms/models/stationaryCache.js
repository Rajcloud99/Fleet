var mongoose = require ('mongoose');

var stationaryCache   = new mongoose.Schema({
       billBookId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'billBook',
         required: true
       },
		clientId: constant.requiredString,
		name: constant.requiredString,
		min: Number,
		max: Number,
		type: {
			type: String,
			enum: constant.billBookType,
			_delta: true,
		},
		branch: [{
			ref:  {type: mongoose.Schema.Types.ObjectId, ref: 'Branch'},
			name: String,
		}],
		deleted: {
			type: Boolean,
			default: false,
			_delta: true
		},
        ranges:[String],
        count:Number,
		startDate:Date,
	    usDate:Date,         // used first stationary date
	},
	constant.timeStamps
);
stationaryCache.index({billBookId: 1}, {unique: true});

module.exports = mongoose.model('stationaryCache', stationaryCache);
