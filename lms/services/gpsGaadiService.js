var Promise = require('bluebird');
var winston = Promise.promisifyAll(require('winston'));

var gpsGaadi = Promise.promisifyAll(commonUtil.getModel('gpsGaadi'));

module.exports.saveGpsGaadiContact = function(data, next) {
		var newGpsGaadiInfo = new gpsGaadi(data);
		newGpsGaadiInfo.saveAsync()
  .then(
    function(gpsGaadiInfo) {
    	var tempGpsGaadiInfo = JSON.parse(JSON.stringify(gpsGaadiInfo[0]));
      	winston.info("Gps Gaadi Contact Info saved: " + tempGpsGaadiInfo);
    	return next(null,tempGpsGaadiInfo);
    }
  )
  .catch(
    function(err) {
      winston.error("Error in Gps Gaadi Contact Info: " + err.toString());
      return next(err);
    }
  );
};