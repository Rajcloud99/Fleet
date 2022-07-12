//Unregistered Vehicle, Driver and Transporter Registration Schema
var mongoose = require ('mongoose');
var validator = require('validator');

var oCity = {
		_id: String,//autogenerated bt our server
		c: String,
		s: String,
		p: Number,
		d: String,
		sf : String,
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
		formatted_address : String,
		geometry : {
			location:{
				lat: Number,
				lng:Number
			}
		},
		place_id:String,
		types:[String],
		url : String,
		vicinity:String		
};

var intNumber =
	{
		'type': 'Number',
		'set' :
			function(num) {
				return Math.abs(Math.round(num));
			}
	};

var UnregisteredVDTSchema = new mongoose.Schema(
	{
		vehicle_details:{
			owner_name:String,
			owner_mobile:intNumber,
			type_of_ID:String,
			ID_number:String,
			truck_model:String,
			license_plate_num:{
				type : 'String',
				'set' :
					function(licplate) {
						return licplate.toUpperCase();
					}
			},
		},
		driver_details:{
			first_name:String,
			last_name:String,
			license_no:String,
			mobile:intNumber,
			father_name:String,
			company_name : String,
			date_of_birth:{type:Date},
			dl_issue_date: {type:Date},
			dl_expiry_date:{type:Date},
			address:oCity,
			driver_image:String,
			dr_licence_doc:String,
			address_proof_doc:String,
			address_proof_type:String,	
			police_verification_doc:"String",
			additional_doc:String,
			additional_doc1:String,
			reference1 : {
		 		first_name : String,
		 		last_name : String,
		 		mobile: Number,
		 		address : String,
		 		relation: String
	 		},
	 		reference2 : {
		 		first_name : String,
		 		last_name : String,
		 		mobile: Number,
		 		address : String,
		 		relation: String
	 		},
		},
		transporter_details:{
			owner_name:String,
			company_name:String,
			mobile:intNumber,
			city:oCity,
			from_to:[{
				from:oCity,
				to:oCity
			}]
		},
		agent_name:String,
		isRegistered:{
			type: Boolean,
			default: false
		},
		created_at: {'type': Date, default: new Date()},
		latModified: {'type': Date, default: new Date()}
	}
)

module.exports = mongoose.model('UnregisteredV_D_T', UnregisteredVDTSchema);