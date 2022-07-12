var mongoose = require('mongoose');

var VehicleTypeSchema = new mongoose.Schema(
	{
		"clientId": String,
		'name': constant.requiredString,
		'code': constant.requiredString,
		'clientInfo': [{
			'clientId': String,
			'sName': String
		}],
		'capacity': Number,
		'is_owned': Boolean,
		'group_name': String,
		'group_code': String,
		'group': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'VehicleGroup',
			required: true
		},
		'desc': String,
		'materialAllowed':[{
			material_type: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'MaterialType'
			},
			units: Number,
			weight: Number
		}],
		'trailer': Boolean,
		'length': Number,
		'created_by_name': String,
		'created_by_employee_code': String,
		'created_by': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		'documents': [{
			name: String,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			}
		}],
		'last_modified_by_name': String,
		'last_modified_employee_code': String,
		'last_modified_by': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	},
	constant.timeStamps
);

module.exports = mongoose.model('VehicleType', VehicleTypeSchema);
