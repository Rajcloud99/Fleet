var mongoose = require ('mongoose');
var validator = require ('validator');

var TripLocationsSchema = new mongoose.Schema (
	{
		"clientId": constant.requiredString,
		"customer_name": String,
		"customerId": String,
		"customer__id": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Client'
		},
		"name": constant.requiredString,
		"address": constant.requiredString,
		"contact_person_name": String,
		"contact_person_number": Number,
		"contact_person_email": String,
		"location_type": String,
		"description": String,
		"location": {
			"lat": Number,
			"lng": Number
		},
		"routes":[{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'TransportRoute'
		}],
		"created_at": {'type': Date, default: Date.now ()}
	}
);

TripLocationsSchema.pre("find",function () {
	this.populate('routes');
});

module.exports = mongoose.model ('TripLocation', TripLocationsSchema);
