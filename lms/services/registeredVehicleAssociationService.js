var RegisteredVehicleAssociation = promise.promisifyAll(commonUtil.getModel('registeredVehicleAssociation'));

module.exports.addRegisteredVehicleAssociation = function(vehicle_reg_no, clientId, vendorId, next) {
    winston.info('registered vehicle assoc', vehicle_reg_no, clientId, vendorId);
    var registeredVehicleAssoc = new RegisteredVehicleAssociation({
        vehicle_reg_no: vehicle_reg_no,
        clientId: clientId,
        vendorId: vendorId
    });
    registeredVehicleAssoc.saveAsync()
        .then(function(registeredVehicleAssoc) {
            return next(null, registeredVehicleAssoc);
        }).catch(function(err) {
            return next(err);
        });
};

module.exports.getVehiclesForClient = function(clientId, next) {
    RegisteredVehicleAssociation.findAsync({clientId: clientId})
    .then(function(vehicles){
        var res = [];
        for(var i = 0; i < vehicles.length; i++){
            res.push(vehicles[i].vehicle_reg_no);
        }
        next(null, res);
    })
    .error(function(err){
        winston.info('err');
        next(err);
    });
};
