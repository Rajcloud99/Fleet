var mongoose = require('mongoose');

var DriverAssociationSchema = new mongoose.Schema({
        "license_no": constant.requiredString,
        "clientId": String,
        "vendorId": String
    },
    constant.timeStamps
);

module.exports = mongoose.model('DriverAssociation', DriverAssociationSchema);
