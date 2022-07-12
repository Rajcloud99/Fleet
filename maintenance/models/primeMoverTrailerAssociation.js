var mongoose = require ('mongoose');

var PrimeMoverTrailerAssociationSchema = new mongoose.Schema(
    {
        "clientId": constant.requiredString,
        "vehicle_reg_no":constant.requiredString,
        "trailer_no":constant.requiredString,
        "odometer_on_association":Number,
        "odometer_on_disassociation":Number,
        "place_of_association":String,
        "association_datetime":Date,
        "disassociation_datetime":Date,
        "place_of_disassociation":String,
        "remarks":String,
        "associated_by_employee_name":String,
        "associated_by_employee_code":String,
        "isDisassociated": {
            "type" : Boolean,
            "default" : false
        },
        "disassociated_by_employee_name":String,
        "disassociated_by_employee_code":String,
		"remark":String
    },
    constant.timeStamps
);

module.exports = mongoose.model('PrimeMoverTrailerAssociation', PrimeMoverTrailerAssociationSchema);
