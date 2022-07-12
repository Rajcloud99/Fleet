var mongoose = require('mongoose');
var validator = require('validator');

var LiveTrackSchema = new mongoose.Schema({
		"clientId": constant.requiredString,
		"vehicle_number": constant.requiredString,
		"trip": {
			type: mongoose.Schema.Types.ObjectId,
			ref: "tripV2"
		},
		"current_location":{
		},
		"address":String,
		"speed":String,
		"duration":String,
		"lat":Number,
		"lng":Number,
		"status": {
			type: String,
			enum: constant.liveTrackStatus
		},
		"remarks":String,
		"datetime":Date,
	    loadingdate: Date,
	    reportingdate: Date,
		location: {
			type: {
				type: String,
				default: 'Point'
			},
			coordinates: {
				type: [Number],
				default: [0, 0]
			}
		},
		"created_by": String,
		"created_at":Date
	}
);

LiveTrackSchema.pre("save", async function(next) {
	try {
		if(this.isNew){
			this.created_at = new Date();
		}
		next();
	} catch (err) {
		next(err);
	}
});

module.exports = mongoose.model('LiveTrack', LiveTrackSchema);
