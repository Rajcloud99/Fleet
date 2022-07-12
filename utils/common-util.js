module.exports.getService = function(serviceName){
    var servicesDir = projectHome + "/lms/services";
    return require(servicesDir + '/' + serviceName + "Service");
};

module.exports.getModel = function(modelName) {
    var modelsDir = projectHome + "/lms/models";
    return require(modelsDir + '/' + modelName);
};

module.exports.getModelVehicle = function(modelName) {
    var modelsDir = projectHome + "/lms/models";
    return require(modelsDir + '/' + modelName);
};

module.exports.getReports = function(reportName){
	var servicesDir = projectHome + "/lms/reports";
	return require(servicesDir +  (reportName ? '/' + reportName : ''));
};

module.exports.getController = function(controllerName) {
	var controllersDir = projectHome + "/lms/controllers";
	return require(controllersDir + '/' + controllerName + "Controller");
};

module.exports.getParamsValidation = function(name) {
	var paramDir = projectHome + "/lms/param-validation";
	return require(paramDir + '/' + name);
};

/**Maintenance import ***/
module.exports.getMaintenanceController = function(controllerName) {
	var controllersDir = projectHome + "/maintenance/controllers";
	return require(controllersDir + '/' + controllerName + "Controller");
};

module.exports.getMaintenanceService = function(serviceName){
    var servicesDir = projectHome + "/maintenance/services";
    return require(servicesDir + '/' + serviceName + "Service");
};

module.exports.getMaintenanceModel = function(modelName) {
    var modelsDir = projectHome + "/maintenance/models";
    return require(modelsDir + '/' + modelName);
};

module.exports.getGpsController = function(controllerName) {
	var controllersDir = projectHome + "/gpsmanagement/controllers";
	return require(controllersDir + '/' + controllerName + "Controller");
};

module.exports.getGpsService = function(serviceName){
	var servicesDir = projectHome + "/gpsmanagement/services";
	return require(servicesDir + '/' + serviceName + "Service");
};

module.exports.getGpsModel = function(modelName) {
	var modelsDir = projectHome + "/gpsmanagement/models";
	return require(modelsDir + '/' + modelName);
};

module.exports.getMRPController = function(controllerName) {
	var controllersDir = projectHome + "/mrp/controllers";
	return require(controllersDir + '/' + controllerName + "Controller");
};

module.exports.getMRPService = function(serviceName){
	let servicesDir = projectHome + "/mrp/services";
	return require(servicesDir + '/' + serviceName + "Service");
};

module.exports.getMRPModel = function(modelName) {
	let modelsDir = projectHome + "/mrp/models";
	return require(modelsDir + '/' + modelName);
};


module.exports.getDbPath = function() {
    return "mongodb://" + config["db_host"]+ ":" + config["db_port"] + "/"
		+ config["db_name"];
};

module.exports.getAclDbPath = function() {
    return "mongodb://" + config["db_host"]
		+ ":" + config["db_port"] + "/" + config["db_name"];
};

module.exports.getConfig = function(param) {
	if (config.hasOwnProperty(param)) {
		return config[param];
	}else{
		return "config not found";
	}
};

module.exports.getUtil = function(utilName) {
	return require("./"+utilName);
};
module.exports.getCopy = function(data) {
  if(data){
    return JSON.parse(JSON.stringify(data));
  }else{
    return data;
  }
};
module.exports.prepareResponse = function(oEntity,aFieldsToShow){
	var aDefaultFields = [],oResponse={},oResponseFinal={};
	if(aFieldsToShow && aFieldsToShow.length>0){
		aDefaultFields = aFieldsToShow;
	}
	if(oEntity){
		oResponse = JSON.parse(JSON.stringify(oEntity));
	}
	if(oResponse){
	for (var i = 0; i < aDefaultFields.length; i++) {
		if(oResponse[aDefaultFields[i]] || oResponse[aDefaultFields[i]] == false){
			oResponseFinal[aDefaultFields[i]] = oResponse[aDefaultFields[i]];
		}
	}
   }
   return oResponseFinal;
};

module.exports.mergeObjects=function () {
	var obj={};
	for(var i=0; i<arguments.length; i++){
		for (key in arguments[i]){
			obj[key]=arguments[i][key];
		}
	}
	return obj;
};







