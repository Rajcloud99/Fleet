/*
	Notes: Keep object properties as strings to prevent name clashes with variables.
*/

var mongoose = require('mongoose');

var sStatus= {	
				 type: String,	
				'enum': ['empty','pending', 'approved', 'rejected','block'],
			 	 default: 'empty'
			 };
var sComment = {			
				  type:String,
				  default: null
			   };


var TruckAdminSchema = new mongoose.Schema(
	{
		'TRUCKID':'String',
		'license_plate_num':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'truckType':
			{	
				'status': sStatus,
				'comment': sComment,
			    'value':{
			    	'_id' : 'String',
			  		'code': 'String',
			  		'truck_type': 'String',
			  		'capacity':'Number',
			  		'category':'String'
			  	}
			},

		"truck_id":
			{
				"type" : mongoose.Schema.Types.ObjectId,
				"ref" : "RegisteredVehicle",
				"required":true
			},
		'userId' :
			{
				'type' : mongoose.Schema.Types.ObjectId,
				'ref' : 'User',
				'required': true
			},
		'driverId' :
			{
				'status': sStatus,
				'comment': sComment,
				'value':
					{
						'type' : mongoose.Schema.Types.ObjectId,
						'ref' : 'Driver'
					}
			},
		'driver_name': 
			{	
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'driver_mobile': 
			{
				'status': sStatus,
				'comment': sComment,
				'value': Number
			},
		'capacity': 
			{
				'status': sStatus,
				'comment': sComment,
				'value': Number
			},
		'body_type':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		
		'brand':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'make_year':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'manufecturer':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'reqd_services':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
	
		'length':
			{
				'status': sStatus,
				'comment': sComment,
				'value': Number
			},
		'width':
			{
				'status': sStatus,
				'comment': sComment,
				'value': Number
			},
		'height': 
			{
				'status': sStatus,
				'comment': sComment,
				'value': Number
			},
		'refrigeration': 
		    {
			   'status': sStatus,
				'comment': sComment,
				'value': Boolean
			},
		'multi_axle':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'language':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'status':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'natioal_permit' : 
		   {
			   'status': sStatus,
				'comment': sComment,
				'value': Boolean
			},
		'license_doc' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'vehicle_image' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'permit_doc' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'permit_expiry_date': 
			{
				'status': sStatus,
				'comment': sComment,
				'value': {'type': Date}
			},
		'fitness_certificate_doc' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'fitness_expiry_date':
			{
				'status': sStatus,
				'comment': sComment,
				'value': {'type': Date}
			},
		'chassis_trace' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'insuarance_doc' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'insurance_company':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'insurance_no':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'insurance_value': 
			{
				'status': sStatus,
				'comment': sComment,
				'value': Number
			},
		'insurance_price':
			{
				'status': sStatus,
				'comment': sComment,
				'value': Number
			},
		'insurance_expiry_date':
			{
				'status': sStatus,
				'comment': sComment,
				'value': {'type': Date}
			},
		'road_tax_doc' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'road_tax_expiry_date':
			{
				'status': sStatus,
				'comment': sComment,
				'value': {'type': Date}
			},
		'RC_book_doc' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'chassis_no': 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'engine_no' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'additional_doc' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'additional_doc1' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'additional_doc2' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'created_at': {'type': Date, default: Date.now()},
		'latModified': {'type': Date, default: Date.now()},
		'owner_name':
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		'owner_mobile' : 
			{
				'status': sStatus,
				'comment': sComment,
				'value': Number
			},
		'truck_model': 
			{
				'status': sStatus,
				'comment': sComment,
				'value': String
			},
		"percent_profile" : 
			{	
				'status': sStatus,
				'comment': sComment,
				'value':
					{
					 'type': Number,
					 'enum': [10,20,30,40,50,60,70,80,90,100],
					 default : 10
					}
			}	
	}
);
module.exports = mongoose.model('truckAdmin', TruckAdminSchema);
