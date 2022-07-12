var mongoose = require('mongoose');

var VehicleDriverAssociationSchema = new mongoose.Schema ({
	"clientId": String,
	"vehicle": {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'RegisteredVehicle'
	},
	"driver": {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Driver'
	},
	"disassociated":{
		type: Boolean,
		default: false
	},
	"driver2": {                                      // assistantDriver
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Driver'
	},
	"driver2Name": String,

	"ass_date": Date,
	"ass_remark": String,
	"ass_gps_odo": Number,
	"ass_veh_odo": Number,
	"ass_by": {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	"disass_date": Date,
	"disass_remark": String,
	"disass_gps_odo": Number,
	"disass_veh_odo": Number,
	"disass_by": {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	"last_modified_at": Date,
	"last_modified_by": String,
},constant.timeStamps);

VehicleDriverAssociationSchema.pre('find', function () {
	this.populate ('vehicle');
	this.populate ('driver');
	this.populate ('driver2');
	this.populate ('ass_by');
	this.populate ('disass_by');
});

module.exports = mongoose.model('VehicleDriverAssociation', VehicleDriverAssociationSchema);
