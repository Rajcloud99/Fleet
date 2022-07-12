var mongoose = require ('mongoose');
var validator = require('validator');

var ICDSchema = new mongoose.Schema(
	{
		port_code : String,
		port_name : String,
		address: constant.address
	}
);
module.exports = mongoose.model('ICD', ICDSchema);
