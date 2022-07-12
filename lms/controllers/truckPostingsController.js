var express = require('express');
var router = express.Router();
var passport = require('passport');
var Promise = require('bluebird');
var winston = require('winston');

var truckPostingService = Promise.promisifyAll(commonUtil.getService('truckPosting'));
var truckService = Promise.promisifyAll(commonUtil.getService('truck'));
router.get('/:app_key', function (req, res) {
	if(req.params['app_key'] ==commonUtil.getConfig('app_public_api')){
	truckPostingService.getAllTruckPostingsAsync(req)
	.then(
		function(trucks) {
			winston.info('in routes succes');
			res.status(200).json({'status': 'OK','data':trucks});
		},
		function(err) {
			winston.error("Error in truck retrieval route: "+err);
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
	truckPostingService.getAllTruckPostingsAsync(req)
	.then(
		function(trucks) {
			winston.info('in routes succes');
			res.status(200).json({'status': 'OK','data':trucks});
		},
		function(err) {
			winston.error("Error in truck retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		}).catch(next);
	 }else{
		 res.status(200).json({'status': 'OK','message':'Un-Authorised User.'});
	 }
	 })(req, res, next);
});
router.post('/',
		 function(req, res, next) {
	     console.log('in truck posting');
		 passport.authenticate('jwt',
		  function(error, user, info) {
			 if (error){
			   return next(error); 
		   }
			 truckService.findTruckAsync(req.body.truck)
			 .then(function(truck){
				 if (truck === false) return {"status": false, "message": "No such truck exists"};
				 else if(truck.userId.toString() != user._id) {
					return {"status" : false, "message": "Unauthorized user for truck"};
					}
				 else if(truck.status=='active'){
					 return truck;
				 }else {
					 return {"status" : false, "message": "RegisteredVehicle is not verified by Future Trucks"};
				 }
				 
			 })
			 .then(function(truck){
				 console.log('status',truck);
				 if(truck.status){
					 req.body.userId = user._id;
					 req.body.verified = 'active';
					 if(!req.body.truckType){
						 req.body.truckType = truck.truckType;
					 }
					 if(!req.body.wieght){
						 req.body.wieght = truck.capacity;
					 }
					 return truckPostingService.addTruckPostingAsync(req.body)
					 .then(
		      function(truckPosting) {
		    	  //send SMS
		        return res.status(200).json({"status": "OK","message":"RegisteredVehicle posting done. Its under verification."});
		      }
		    )
				 }else{
					return  res.status(401).json(truck);
				 }
			 })
	     .catch(next);
		  })(req, res, next);
		});

//Posting updation
router.put('/:truck_id',
  passport.authenticate('jwt'),
  function(req, res, next) {
    truckPostingService.updateTruckPostingAsync(req.params.truck_id,req.body)
    .then(
      function() {
        return res.status(200).json({"status": "OK"});
      }
    )
    .catch(next);
  }
);

router.delete('/:truck_id',
  passport.authenticate('jwt'),
  function(req, res, next) {
    truckPostingService.removeTruckPostingAsync(req.params.truck_id)
    .then(
      function() {
        return res.status(200).json({"status": "OK"});
      }
    )
    .catch(next);
  }
);

module.exports = router;
