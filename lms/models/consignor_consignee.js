

let mongoose = require('mongoose');

let Consignor_Consignee = new mongoose.Schema(
	{
		clientId : constant.requiredString,
		'clientR': [String],
		name: {
			type:String,
			required:true
		},
		d_code: String,
		address: String,
		contact_person : String,
		contact_number: String,
		type: {
			type: String,
			enum: constant.cType
		},
		gstin : String,
		lat: Number,
		lng: Number,
		businessLocation: String,
		state: String,
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
		loadingManager: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		created_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		created_at: { 'type': Date },
		last_modified_at: { 'type': Date },
		last_modified_by_name: String,
		last_modified_employee_code: String,
		last_modified_by: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		customer: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer'
		}],
	}

);
Consignor_Consignee.index({location: '2dsphere'});

module.exports = mongoose.model("consignor_consignee",Consignor_Consignee);
