var DriverAssociation = promise.promisifyAll(commonUtil.getModel('driverAssociation'));
var departmentService = promise.promisifyAll(commonUtil.getService('department'));
var roleService = promise.promisifyAll(commonUtil.getService('roles'));

module.exports.addDriverAssociation = function(license_no, clientId, vendorId, next) {
    winston.info('driver assoc', license_no, clientId, vendorId);
    var driverAssoc = new DriverAssociation({
        license_no: license_no,
        clientId: clientId,
        vendorId: vendorId
    });
    departmentService.addDepartmentIfRequiredAsync({clientId: clientId, name: 'Driver Department', code: 'DRIVER'})
    .then(function(dept){
        return roleService.addRoleIfRequiredAsync({clientId: clientId, department: 'Driver Department', role: 'Driver', allows: config.all_apps});
    })
    .then(function(){
        return driverAssoc.saveAsync();
    })
    .then(function(driverAssoc) {
        return next(null, driverAssoc);
    }).catch(function(err) {
        return next(err);
    });
};

module.exports.getDriversForClient = function(clientId, next) {
    DriverAssociation.findAsync({clientId: clientId})
    .then(function(drivers){
        var res = [];
        for(var i = 0; i < drivers.length; i++){
            res.push(drivers[i].license_no);
        }
        next(null, res);
    })
    .error(function(err){
        winston.info('err');
        next(err);
    });
};
