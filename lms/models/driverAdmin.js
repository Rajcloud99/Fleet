var mongoose = require('mongoose');
var validator = require('validator');

var sStatus= {	
				 type: String,	
				'enum': ['empty','pending', 'approved', 'rejected','block'],
			 	 default: 'empty'
			 };
var sComment = {			
				  type:String,
				  default: null
			   };

var DriverAdminSchema = new mongoose.Schema ({

	"DRIVERID":String,
	"first_name":{
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : String }
		},
	"last_name":{
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : String }
		},
	"license_no" : {
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : String }
		},
	"mobile" :{
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : Number }
		},
	
	"driver_id":{
		"type" : mongoose.Schema.Types.ObjectId,
		"ref" : "Driver",
		"required":true
	},
	"userId" : {
		"type" : mongoose.Schema.Types.ObjectId,
		"ref" : "User",
		"required":true
		
	},
	"address_line_1" :{
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : String }
		},
	"address_line_2" : {
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : String }
		},
	"area" : {
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : String }
		},
	"city" :{
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : String }
		},
	"district" : {
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : String }
			},
	"pincode" :{
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : Number }
		},
	"email" :{
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : String }
		},
	"alt_mobile" : {
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type' : Number }
		},
	"isAddrNotReq": 
			{
			'status': sStatus,
			'comment': sComment, 
			'value':{ 'type':'Boolean',
		   			   default: false
		   			}
		},
	 "reference1" :{
			'status': sStatus,
			'comment': sComment, 
			'value':{
		 		first_name : String,
		 		last_name : String,
			    mobile: Number,
		 		address : String,
		 		pincode : String, 
		 		relation: String
	 		}
		},
	 "reference2" : {
			'status': sStatus,
			'comment': sComment, 
			'value':{
		 		first_name : String,
		 		last_name : String,
		 		mobile: Number,
		 		pincode : String, 
		 		address : String,
		 		relation: String
	 		}
		},
	"dl_issue_date": {
			'status': sStatus,
			'comment': sComment, 
			'value':{'type': Date}
		},
	"dl_expiry_date": {
			'status': sStatus,
			'comment': sComment, 
			'value':{'type': Date}
		},
	"date_of_birth": {
			'status': sStatus,
			'comment': sComment, 
			'value':{'type': Date}
		},
	"father_name": {
			'status': sStatus,
			'comment': sComment, 
			'value':{'type': String }
		},
	"mother_name": {
		'status': sStatus,
		'comment': sComment, 
		'value':{'type': String }
	},
	"company_name" : {
			'status': sStatus,
			'comment': sComment, 
			'value':{'type': String}
		},
	'driver_image' :{
			'status': sStatus,
			'comment': sComment, 
			'value':{'type': String}
		},
	'dr_licence_doc':{
			'status': sStatus,
			'comment': sComment, 
			'value':{'type': String}
		},
	'address_proof_doc':{
			'status': sStatus,
			'comment': sComment, 
			'value':{'type': String}
		},
	'police_verification_doc':{
			'status': sStatus,
			'comment': sComment, 
			'value':{'type': String}
		},
	'isPoliceVerified':{
			'status': sStatus,
			'comment': sComment, 
			'value':{'type': Boolean}
	},

	'additional_doc':{
			'status': sStatus,
			'comment': sComment, 
			'value':{
				'additional_doc_loc':String,
				'additional_doc_type':String,
				'additional_doc_id':String
			}
		},

	'additional_doc1':{
			'status': sStatus,
			'comment': sComment,
			'value':{
				'additional_doc_loc1':String,
				'additional_doc_type1':String,
				'additional_doc_id1':String
			}
		},

	'transport_details':{
		'status': sStatus,
		'comment': sComment,
		'value':{
				'transport_name': String,
				'transporter_name': String,
				'transporter_address':String,
				'transporter_mobile':String
			} 	
	 },
	 'veh_owner_details':{
	 	'status': sStatus,
		'comment': sComment,
		'value':{	
			'veh_owner_name': String,
			'veh_owner_mobile': String,
			'veh_owner_id_type': String,
			'veh_owner_id_no': String
		}
	},
	'other_details':{
	 	'status': sStatus,
		'comment': sComment,
		'value':{	
			'from':String,
			'to':String,
			'vehicle_no':String,
			'veh_model':String
		}
	},

	"created_at": {'type': Date, default: new Date()},
	"latModified": {'type': Date, default: new Date()},

	"percent_profile" : {
			'status': sStatus,
			'comment': sComment, 
			'value':{
				'type': Number,
				'enum': [10,20,30,40,50,60,70,80,90,100],
				default : 10
			}
	}
});

module.exports = mongoose.model('driverAdmin', DriverAdminSchema);