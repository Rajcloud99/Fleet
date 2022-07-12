var Promise = require('bluebird'),
crypto = require('crypto');
module.exports.generateShaKey = function(oPUM) {
 if(commonUtil. getConfig('enabl_online_payment')){
	oPUM.key = commonUtil. getConfig('pKey');
	var SALT = commonUtil. getConfig('pst');
	oPUM.service_provider =  commonUtil. getConfig('psrv');
	var shasum = crypto.createHash('sha512');
	var dataSequence =oPUM.key + '|' + oPUM.txnid + '|' + oPUM.amount + '|' + oPUM.productinfo + '|' +
	oPUM.firstname + '|'+ oPUM.email + '|'+ oPUM.udf1 +'|'+ oPUM.udf2 +'|'+ oPUM.udf3 +'|'+ oPUM.udf4 +'|'+ oPUM.udf5 +'||||||' + SALT;
	resultKey = shasum.update(dataSequence).digest('hex');
	oPUM.hash = resultKey;
	oPUM.surl = commonUtil. getConfig('surl');
	oPUM.furl = commonUtil. getConfig('furl');
	oPUM.curl = commonUtil. getConfig('curl');
	logger.info(dataSequence,oPUM);
 }else{
 	logger.info('online payment disabled');
 }
	
};
