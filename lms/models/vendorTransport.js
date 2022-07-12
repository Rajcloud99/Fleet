/**
 * Created by nipun on 19/1/17.
 */

var mongoose = require('mongoose');

var vendorTransportSchema = new mongoose.Schema({
		'clientId': constant.requiredString,
		'lmsId':String,
		'clientR': [String],
		'name': constant.requiredString,
		'account': [{
			clientId: String,
			ref: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts'
			}
		}],
		'contact_person_name': String,
		'phn': String,  //pan holder name
		'created_at': Date,
		'ownershipType': {
			type: String,
			enum: constant.aOwnershipVendor,
			required: true,
			default: 'Market'
		},
		'deleted': {
			"type": "Boolean",
			default: false
		},
		'category': [{
			type: String,
			enum: constant.aVendorCategory,
		}],
		'panVerify': {
			type: Boolean,
			default: false
		},
		'tdsVerify': {
			type: Boolean,
			default: false
		},
		billType: {
			type: String,
			enum: ['Maintenance', 'Spare', 'Tyre', 'FPA', 'Diesel','Printing']
		},
		'noOfVehilce': Number,
		'prim_contact_no': Number,
		'alt_contact_no1': Number,
		'alt_contact_no2': Number,
		'tdsRate': Number,
		'factor': Number,
		'email': constant.emailType,
		'alt_email1': String,
		'ho_address': Object,
		'pan_no': String,
		'gstn': String,
		'address_proof_type': String,
		'address_proof_no': String,
		'banking_details': [{
			'a_c': String,
			'ifsc': String,
			'declaration': String,
			'cancelled_cheque': String
		}],
		tdsCategory: {
			type: String,
			enum: constant.tdsCategory,
		},
		tdsSources: {
			type: String,
			enum: constant.tdsSource.source,
		},
		tdsSection: {
			type: String,
			enum: constant.tdsSource.section,
		},
		'routes': [{
			'route': {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'TransportRoute'
			},
			'vehicleTypes': [{
				'vehicleType': {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'VehicleType'
				},
				'rates': Number, //ratePerTrip
				'ratePerMT': Number,
				'ratePerUnit': Number,
				'minPayableAmt': Number,
			}]
		}],
		documents: [{
			name: String,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			}
		}],
		'status': constant.customerStatus,
		'remark': String,
		'ratings': [{
			'rating': Number,
			'remark': String
		}],
		'vendor_rating': Number,
		'comment': String,
		'area': String,
		'created_by': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		'last_modified_by': {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		statusDate: {
			type: Boolean,
			default: false
		},
		declaratonDate: Date,
		verificationDate: Date,
		vVDate: Date,// verification validity date
		person: String,
		financialYear: String,
		exeRate: Number,      // exempted Rate
		exeFrom: Date,   // exempted valid from
		exeTo: Date,     // exempted valid to
	},
	constant.timestamps
);

vendorTransportSchema.pre('find', function () {
	this.populate('routes.route');
	this.populate('routes.vehicleTypes.vehicleType');
	this.populate('account');
	this.populate({
		path: 'created_by',
		//match: this._conditions.created_by_query,
		select: {'userId':1,'full_name':1}
	})//.where('created_by').ne(null);;
	this.populate({
		path: 'last_modified_by',
		//match: this._conditions.last_modified_by_query,
		select: {'userId':1,'full_name':1}
	})//.where('last_modified_by').ne(null);;
});

module.exports = mongoose.model('VendorTransport', vendorTransportSchema);
