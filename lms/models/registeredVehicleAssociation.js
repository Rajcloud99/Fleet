var mongoose = require('mongoose');

function trimNonAlpha(str) {
    return (otherUtil.replaceNonAlphaWithSpace(str)).toUpperCase();
}

var RegisteredVehicleAssociationSchema = new mongoose.Schema({
        "vehicle_reg_no": {
            type : String,
            required:true,
            set : trimNonAlpha
        },
        "clientId": String,
        "vendorId": String
    },
    constant.timeStamps
);

module.exports = mongoose.model('RegisteredVehicleAssociation', RegisteredVehicleAssociationSchema);
