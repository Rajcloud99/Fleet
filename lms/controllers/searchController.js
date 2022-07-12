var express = require('express');
var router = express.Router();
var passport = require('passport');
var Promise = require('bluebird');
var winston = require('winston');
var searchService = Promise.promisifyAll(commonUtil.getService('search'));
router.get('/postings', function (req, res, next) {
	/* passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error); 
	    }
	 if(user){
	 if(req.query && req.query.otherCustomers){
		req.query.otherCustomers = user._id;
	 }else if(req.query){
		req.query.userId = user._id;
	 }else{
		req.query = {};
		req.query.userId = user._id;
 	 }
	 req.userPosting = true;
	 req.loggedInUserId = user._id;
	 */
	 var qStr = {query : req.query};
	searchService.getAllPostingsByTextAsync(qStr)
	 .then(function(trucks) {
			res.status(200).json({'status': 'OK','data':trucks});
		},
		function(err) {
			winston.error("Error in truck retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		}).catch(next);
	 /*}
	 else{
		 res.status(200).json({'status': 'OK','message':'Un-Authorised User.'});
	 }
	 })(req, res, next);
     */
     });
router.get('/interests', function (req, res, next) {
	 var qStr = {query : req.query};
	 searchService.getAllInterestByTextAsync(qStr)
	 .then(function(trucks) {
			res.status(200).json({'status': 'OK','data':trucks});
		},
		function(err) {
			winston.error("Error in truck retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		}).catch(next);
     });
router.get('/bookings', function (req, res, next) {
	 var qStr = {query : req.query};
	 searchService.getAllBookingsByTextAsync(qStr)
	 .then(function(trucks) {
			res.status(200).json({'status': 'OK','data':trucks});
		},
		function(err) {
			winston.error("Error in truck retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		}).catch(next);
     });
router.get('/users', function (req, res, next) {
	var user_type = ['broker','truck_owner','aggregator', 'transporter'];
	 var qStr = {query : req.query};
	 if(!req.query.type){
	 	qStr.query.type = {'$in':user_type};
	 }	 
	 searchService.getAllUsersByTextAsync(qStr)
	 .then(function(trucks) {
			res.status(200).json({'status': 'OK','data':trucks});
		},
		function(err) {
			winston.error("Error in truck retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		}).catch(next);
 });
router.post('/directory', function (req, res, next) {
	 passport.authenticate('jwt',
		  function(error, user, info) {
			 if (error){
			   return next(error); 
		   }
     var sQuery;
     console.log(req.body);
     if(req.body.source){
     	sQuery = req.body.source.formatted_address 
		&& req.body.source.formatted_address.split('India')[0]
            ? req.body.source.formatted_address.split('India')[0]
            : req.body.source.formatted_address;
     }
     if(req.body.destination){
     	var sDest = req.body.destination.formatted_address 
		&& req.body.destination.formatted_address.split('India')[0]
            ? req.body.destination.formatted_address.split('India')[0]
            : req.body.destination.formatted_address;
     	sQuery =  sQuery + " "+ sDest;
     }
     if(req.body.truckType && req.body.truckType.truck_type){
     		sQuery =  sQuery + "  "+ req.body.truckType.truck_type;
     }
     if(req.body.type){
     	user_type = req.body.type;
     }else{
     	user_type = 'transporter';
     }
     var qStr = {};
     qStr.query = req.query || {};
     qStr.query.search = sQuery;
     qStr.query.type = user_type;
	 console.log(sQuery);
	 searchService.getAllUsersByTextAsync(qStr)
	 .then(function(searchResults) {
			res.status(200).json({'status': 'OK','data':searchResults.data,'no_of_pages':searchResults.no_of_pages});
		},
		function(err) {
			winston.error("Error in directory retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		}).catch(next);
	  })(req, res, next);
     });

router.get('/unRegUsers', function (req, res, next) {
	var user_type = ['broker','truck_owner','aggregator', 'transporter'];
	 var qStr = {query : req.query};
	 if(!req.query.type){
	 	qStr.query.type = {'$in':user_type};
	 }	 
	 searchService.getAllUnRegUsersByTextAsync(qStr)
	 .then(function(trucks) {
			res.status(200).json({'status': 'OK','data':trucks});
		},
		function(err) {
			winston.error("Error in truck retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		}).catch(next);
 });


module.exports = router;
