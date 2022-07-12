var express = require('express');
var router = express.Router();
var passport = require('passport');
var Promise = require('bluebird');
var winston = require('winston');

var icdsRateService = Promise.promisifyAll(commonUtil.getService('icdsRate'));
router.get('/:app_key', function (req, res) {
	if(req.params['app_key'] ==commonUtil.getConfig('app_public_api')){
		icdsRateService.getAllICDsRateAsync(req)
	.then(
		function(rates) {
			winston.info('in routes succes');
			res.status(200).json({'status': 'OK','data':rates});
		},
		function(err) {
			winston.error("Error in rates retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		});
	}else{
		res.status(500).json({'status': 'ERROR', 'error_messages': "application secure key is not correct"});
	}});
router.get('/', function (req, res, next) {
	 passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error); 
	    }
	if(user){
	if(req.query && req.query.otherCustomers){
		req.query.otherCustomers = user._id;
	}else{
		req.query = {'userId':user._id};
	}
	
	req.userPosting = true;
	icdsRateService.getAllICDsRateAsync(req)
	.then(
		function(rates) {
			winston.info('in routes succes');
			res.status(200).json({'status': 'OK','data':rates});
		},
		function(err) {
			winston.error("Error in rates retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		}).catch(next);
	 }else{
		 res.status(200).json({'status': 'OK','message':'Un-Authorised User.'});
	 }
	 })(req, res, next);
});

module.exports = router;
