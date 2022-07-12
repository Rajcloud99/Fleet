var mongoose = require('mongoose');
var validator = require('validator');

var DriverSchema = new mongoose.Schema({
		'account': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		'clientId': constant.requiredString,
		'employee_code': constant.requiredString,
		'name': constant.requiredString,
		'nameCode': String,
		'license_no': String,
		'branch_name': String,
		'branch_code': String,
		'password': String,
		'pancard_no': String,
		'id_proof_type': String,
		'id_proof_value': String,
		'branch': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Branch'
		},
		'age': Number,
		'employee_status': {
			type: String,
			enum: constant.employeeStatus
		},
		'code': String,
		'leave_reason': String,
		'father_name': String,
		'mother_name': String,
		'wife_name': String,
		'nominee': String,
		'no_of_children': Number,
		'no_of_girl_childs': Number,
		'total_dependents': Number,
		'religion': {
			type: String,
			enum: constant.religion
		},
		'gender': {
			type: String,
			enum: constant.gender
		},
		'blood_group': {
			type: String,
			enum: constant.bloodGroup
		},
		'marital_status': {
			type: String,
			enum: constant.marital_status
		},
		'educationTypes': {
			type: String,
			enum: constant.educationTypes
		},
		'license_issuing_date': Date,
		'license_expiry_date': Date,
		'license_authority': String,
		'license_address': String,
		'license_category': String,
		'license_badge_no': String,
		'license_grade': String,
		'license_verified': {
			"type": "Boolean",
			default: false
		},
		'prim_contact_no': Number,
		'alt_contact_no1': Number,
		'alt_contact_no2': Number,
		'email_id': String,
		'temporary_address': constant.address,
		'permanent_address': constant.address,
		'insurance_policy_number': String,
		'insurance_company': String,
		'insured_amount': Number,
		'date_of_joining': Date,
		'date_of_leaving': Date,
		'dob': Date,
		'gross_fixed_salary': Number,

		'leaving_reason': String,

		'reference1': constant.reference,
		'reference2': constant.reference,
		'guarantor_name': String,
		'guarantor_company': String,
		'guarantor_profession': String,
		'guarantor_address': String,
		'guarantor_contact_no': Number,
		'guarantor_photo_id_no': String,
		'guarantor_address_proof_no': String,
		'verif_prev_company_name': String,
		'verif_prev_contact_name': String,
		'verif_prev_contact_no': String,
		'verif_prev_contact_address': String,
		'face_mark': String,
		'vision_test': String,
		'driver_face_mark':String,
		'driver_vision_test':String,
		'photo': String,
		'sap_id': String,
		'address_proof_front_copy': String,
		'address_proof_back_copy': String,
		'license_front_copy': String,
		'license_back_copy': String,
		documents: [{
			name: String,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			}
		}],
		'blacklisted': {
			type: Boolean,
			default: false
		},
		'blocklistRemark': String,
		'vehicle_assigned_reg_name': String,
		'vehicle_assigned_type': String,
		'vehicle_assigned': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'RegisteredVehicle'
		},
		'supervisor_name': String,
		'supervisor_employee_code': String,
		'supervisor': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		'hr_manager_name': String,
		'hr_manager_employee_code': String,
		'hr_manager': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		'remarks': String,
		'created_by_name': String,
		'created_by_employee_code': String,
		'created_by': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		'last_modified_by_name': String,
		'last_modified_employee_code': String,
		'last_modified_by': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"happay":{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		"happayHistory":[{
			happayAccount:{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts'
			},
			ass_date: Date
		}],

		'ddcFrom': Date,       // Driver Training detensive course valid from
		'ddcTo': Date,        // Driver Training detensive course valid to
	    'passportNo': String,
		'experience': String,
		"deleted": {
			"type": "Boolean",
			default: false
		},
		'drMaxSecurity': Number,        //Max Driver security deposit
	},
	constant.timeStamps
);
DriverSchema.index({name:1, employee_code: 1, clientId: 1}, {unique: true, /*partialFilterExpression: {deleted: {$eq: false}}*/});
DriverSchema.pre('find', function () {
	this.populate("account");
	if(this._conditions.populateVehicle && this._conditions.populateVehicle===true)
		this.populate("vehicle_assigned");
	delete this._conditions.populateVehicle;
	this.populate('happay');
	this.populate('happayHistory.happayAccount');
});
/*
DriverSchema.plugin(mongoose_delete, {
	overrideMethods: 'all'
});
*/
module.exports = mongoose.model('Driver', DriverSchema);
