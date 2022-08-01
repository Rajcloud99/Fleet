/**
 * Modified by kamal on 19/11/18.
 */

let Promise = require('bluebird');
var mongoose = require("mongoose");
var mongoose_delete = require('mongoose-delete');
var constant = require('../../constant');
var otherUtil = Promise.promisifyAll(require('../../utils/other-util'));
var oManager = {
	"name": String,
	"mobile": Number,
	"email": String,
	"empl_id": String,
	"userId": String
};


function validator(v) {
	return v >= 0;
}

function trimNonAlpha(str) {
	return (otherUtil.replaceNonAlphaWithSpace(str)).toUpperCase();
}

var registeredVehicleSchema = new mongoose.Schema({
		"clientId": constant.requiredString,
		"device_imei": Number,
		"device_type":String,
		"vehicleId": String,
		"vehicle_reg_no": {
			type: String,
			required: true,
			set: trimNonAlpha
		},
		activeStatus: {
			type: Boolean,
			default: true
		},
		"account": {
			type: mongoose.Schema.Types.ObjectId,
			ref: "accounts"
		},
		"suspenseFastag": [{
			"DateOfTransaction": Date,
			"Amount": Number,
			"TypeOfTransaction": String,
			"VehicleNumber": String
		}],
		"gpsData": {
			acc: Boolean,
			address: String,
			device_id: Number,
			odo: Number,
			vehicle_no: [String],
			voltage: Number,
			speed: Number,
			positioning_time: Number,
			location_time: Number,
			lat: Number,
			lng: Number,
			io_state: String,
			datetime: Number,
			course: Number,
			today_km: Number,
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
			f_lvl:Number
		},
		"mTrack": {
			address: String,
			remarks: String,
			status: String,
			speed: Number,
			lat: Number,
			lng: Number,
			datetime: Date,
			loadingdate: Date,
			reportingdate: Date,
			created_at: Date,
			created_by: String,
			location: {
				type: {
					type: String,
					default: 'Point'
				},
				coordinates: {
					type: [Number],
					default: [0, 0]
				}
			}
		},
		'segment_type': {
			type: String,
			required: true,
			default: 'Market',
			// enum: ['Goods','HONDA','Container 10T','Container 12T','Associate Vehicle']
		},
		gpsApi:[{
			type: String
		}],
		"gpsVendor": [{
			type: String
		}],
		"segmentHistory": [{
			segment_type: String,
			person: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			full_name: String,
			time: Date,
		}],
		"fleetHistory": [{
			ownGrp: String,
			name: String,
			time: Date,
		}],
		"budgeting": [{
			"date": Date,
			"rpk": Number,
			"mileage": Number,
			"user": {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			}
		}],
		"current_budget": {
			'Normal': {
				"rpk": Number,
				"mileage": Number,
				"adv": Number,
				"date": Date,
			},
			'Express': {
				"rpk": Number,
				"mileage": Number,
				"adv": Number,
				"date": Date,
			},
			'Empty': {
				"rpk": Number,
				"mileage": Number,
				"adv": Number,
				"date": Date,
			},
			'Standard': {
				"rpk": Number,
				"mileage": Number,
				"adv": Number,
				"date": Date,
			},
			'Time Committed': {
				"rpk": Number,
				"mileage": Number,
				"adv": Number,
				"date": Date,
			},
			'Ferry/Empty': {
				"rpk": Number,
				"mileage": Number,
				"adv": Number,
				"date": Date,
			},
			"rpk": Number,
			"mileage": Number
		},
		"fasttag": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'accounts'
		},
		"fasttagHistory": [{
			tagAccount: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'accounts'
			},
			ass_date: Date
		}],
		"deleted": {
			"type": "Boolean",
			default: false
		},
		"model": String,
		"modelYear": String,
		"manufacturer": String,
		"manufactureDate": Date,
		"structure_name": String,
		"make_year": String,
		"length_ft": {
			"type": "Number",
			"validate": [validator, "Invalid length"]
		},
		"width_ft": {
			"type": "Number",
			"validate": [validator, "Invalid width"]
		},
		"height_ft": {
			"type": "Number",
			"validate": [validator, "Invalid width"]
		},
		"hypothecatedTo": String,
		"grossVehicleweight": Number,
		"unladenWeight": Number,
		"ladenWeight": Number,
		"gross_weight": Number,
		"unloaded_weight": Number,
		"sd":Date,                       //sold vehicle date
		"sa": Number,                    //sold vehicle amount
		"soldVendor_name": String,       //sold vehicle vendor Name
		"vendor_address": String,        //sold vehicle vendor Address
		"vendor_phno": Number,           //sold vehicle vendor phoneNo
		"vendor_panNo": String,          //sold vehicle vendor PanNo
		"refrigeration": {
			"type": "Boolean",
			default: false
		},
		"odometer": Number,
		"own": {
			"type": "Boolean",
			default: false
		},
		"capacity_tonne": Number,
		"cc": Number,
		"hp": Number,
		"veh_group_name": String,
		"veh_group": {
			"type": mongoose.Schema.Types.ObjectId,
			"ref": "VehicleGroup"
		},
		"veh_type_name": String,
		"veh_type": {
			"type": mongoose.Schema.Types.ObjectId,
			"ref": "VehicleType"
		},
		"category": {
			type: String,
			enum: constant.vehicleCategory
		},
		"owner_group": String,
		"supervisor_name": String,
		"supervisor_employee_code": String,
		"supervisor_contact_no": Number,
		"supervisor": {
			"type": mongoose.Schema.Types.ObjectId,
			"ref": "User"
		},
		"driver_name": String,
		"driver_license": String,
		"driver_employee_code": String,
		"driver_contact_no": Number,
		"driver": {
			"type": mongoose.Schema.Types.ObjectId,
			"ref": "Driver"
		},
		"driver2": {                                      // assistantDriver
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Driver'
		},
		"driver2Name": String,
		"axel": String,
		"wheel_base": Number,
		"tyre_type": String,
		"fuel_type": String,
		"body_type": String,
		"permit_no": String,
		"puc_no": String,
		"puc_issuance_date": Date,
		"puc_expiry_date": Date,
		"permit_front_copy": "String",
		"permit_back_copy": "String",
		"permission_cert_issuance_date": Date,
		"permit_expiry_date": Date,
		"fitness_cert_no": String,
		"fitness_cert_front_copy": "String",
		"fitness_cert_back_copy": "String",
		"fitness_cert_issuance_date": Date,
		"fitness_cert_expiry_date": Date,
		"emission_cert_no": String,
		"emission_cert_front_copy": "String",
		"emission_cert_back_copy": "String",
		"emission_cert_issuance_date": Date,
		"emission_cert_expiry_date": Date,
		"insurance_no": "String",
		//"insurance_doc_front_copy":"String",
		//"insurance_doc_back_copy":"String",
		"insurance_issuance_date": Date,
		"insurance_expiry_date": Date,
		"insurance_company": "String",
		"insured_amount": "Number",
		"road_tax_doc_no": String,
		//"road_tax_doc_front_copy" : "String",
		//"road_tax_doc_back_copy" : "String",
		"road_tax_doc_issuance_date": Date,
		"road_tax_doc_expiry_date": Date,
		"rc_book_no": String,
		"rc_book_front_copy": "String",
		"rc_book_back_copy": "String",
		"rc_issuance_date": Date,
		"rc_expiry_date": Date,
		"purchase_date": Date,
		"purchase_amount": Number,
		"chassis_no": "String",
		"engine_no": "String",
		"created_by_name": String,
		"created_by_employee_code": String,
		//Documents
		"vehicle_image": String,
		"permit_doc": String,
		"fitness_certificate_doc": String,
		"chassis_trace": String,
		"insurance_doc": String,
		"road_tax_doc": String,
		"rc_book_doc": String,

		documents: [{
			name: String,
			docReference: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Documents'
			}
		}],
		"ownershipType": {
			type: String,
			enum: constant.aOwnershipVehicle
		},
		"created_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"status": {
			type: String,
			enum: constant.vehStatus,
			default: "Available"
		},
		"last_modified_by_name": String,
		"last_modified_employee_code": String,
		"last_modified_by": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		"owner_name": String,
		"owner_mobile": Number,
		"vendor_name": String,
		"vendor_mobile": Number,
		"vendor_id": {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'VendorTransport'
		},
		manager: oManager,
		last_known: {
			status: {
				type: String,
				enum: constant.vehStatus,
				default: "Available"
			},
			address: String,
			lat: Number,
			lng: Number,
			datetime: Date,
			trip: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'tripV2'
			},
			trip_no: Number,
			trip_name: String,
		},
		"associationFlag": {
			type: Boolean,
			default: false
		},
		"associated_vehicle": String,
		"sap_id": String,
		"monthlyCharges": [{
			mm_yy: Date,//01 day fix
			component: String,//driver_salary
			amount: Number,
			created_by: String,
			created_at: Date
		}],
		"dieselInVehicle": {
			type: Number,
			default: 0
		},
		remark: String,
		"reg_date":Date,
		"costCenter": {
			_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "costCenter"
			},
			name: String,
			category: String
		},
		"trailerAttach": String
	},
	{...constant.timeStamps, strict: true}
);

registeredVehicleSchema.plugin(mongoose_delete, {overrideMethods: 'all'});

registeredVehicleSchema.pre('find', function () {
	this.populate('veh_type');
	this.populate('driver');
	this.populate('fasttag');
	this.populate('account');
	this.populate('fasttagHistory.tagAccount');
});

registeredVehicleSchema.index({'gpsData.location': '2dsphere'});

// stringified array to build populate query
registeredVehicleSchema.statics.buildPopQuery = function (str = false, req) {

	let arr, query = [];

	if (Array.isArray(str)) {
		arr = str;
	} else if (str)
		arr = JSON.parse(str);

	if (!Array.isArray(arr))
		return [];

	arr.forEach(key => {
		switch (key) {
			case 'vendor_id':
				query.push(
					{
						$lookup: {
							from: "vendortransports",
							localField: "vendor_id",
							foreignField: "_id",
							as: "vendor_id"
						}
					},
					{
						$unwind: {
							path: "$vendor_id",
							preserveNullAndEmptyArrays: true
						}
					},
				);
				break;
			case 'vendor_id.account':
				query.push(
					{
						$addFields: {
							"vendor_id.account": {
								$filter: {
									input: "$vendor_id.account",
									as: "item",
									cond: { $eq: [ "$$item.clientId", req.user.clientId ] }
								}
							}
						}
					},
					{
						"$lookup": {
							"from": "accounts",
							"localField": "vendor_id.account.ref",
							"foreignField": "_id",
							"as": "vendor_id.account"
						}
					},
					{
						"$unwind": {
							path: "$vendor_id.account",
							preserveNullAndEmptyArrays: true
						}
					}
				);
				break;
		}
	});

	return query;

};

registeredVehicleSchema.index({vehicle_reg_no: 1, ownershipType: 1, clientId: 1,deleted:1}, {unique: true});

module.exports = mongoose.model("RegisteredVehicle", registeredVehicleSchema);
