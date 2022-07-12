var mongoose = require ('mongoose');

var CitiesSchema = new mongoose.Schema({
		clientId: String,
		c: String,
		s: String,
		p: Number,
		d: String,
		sf : String,
		zone : String,
		address_components:{
			  street_number: String,//'short_name'
			  route: String,//'long_name'
			  sublocality_level_2: String,//'long_name'
			  sublocality_level_3: String,//'long_name'
			  sublocality_level_1: String,//'long_name'
			  sublocality: String,//'long_name'
			  locality: String,//'long_name'
			  administrative_area_level_2: String,//'long_name'
			  administrative_area_level_1: String,//'short_name',
			  administrative_area_level_1_f: String,//'long_name'
			  country : String,//'short_name',
			  country_f : String,//'long_name',
			  postal_code: Number,//'short_name'
		},
		formatted_address: String,
		geometry: {
			location:{
				lat: Number,
				lng:Number
			}
		},
		place_id:String,
		types:Array,
		url : String,
		vicinity:String,
	    createdBy: String,
	    createdAt: Date,
	    lastModifiedBy: String,
	    lastModifiedAt: Date,
	}
);

CitiesSchema.index({
	c: 'text',
	s: 'text',
}, {
	weights: { c: 2 },
	name: "TextIndex",
});

module.exports = mongoose.model('cities', CitiesSchema, 'cities');
