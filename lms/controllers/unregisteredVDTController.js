//Unregistered Vehicle, Driver and Transporter Registration Controller
var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var jwt = require('jwt-simple');
var passport = require('passport');

var unregisteredVDTService = Promise.promisifyAll(commonUtil.getService('unregisteredVDT'));


var allowedFields = ['mobile','owner_name','email','company_name','office_address','type','alt_mobile','addr_line_1','addr_line_2','area','city','district','landline','pincode'];
var isAllowedFields = function(sField){
	var isAllowedF = false;
	if(allowedFields.indexOf(sField)>=0){
		isAllowedF =  true;
	}
	return isAllowedF;

};
//**************************************************************************************************
router.post('/', function (req, res, next) {
	passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error); 
	    }
	   if(user.type == 'ft_admin'){
			if((user.role == 'showAdmin') || (user.role=='updateAdmin') || (user.role=='superAdmin')){	
       			if(Object.getOwnPropertyNames(req.body).length>0){
       		  		unregisteredVDTService.addUnregisteredVDTAsync(req.body)
					.then(function(addedData){
						res.status(200).json({'status':'OK','message':'New unregistered RegisteredVehicle, Driver and Transporter data added.',"data":addedData});
					}).catch(next);
				}else{
	 				res.status(400).json({'status':'ERROR',"error_message":"No data found."});
	 			}
			}else{
		 		res.status(401).json({'status': 'ERROR','message':'You do not have admin privilege'});
	 	  	}
       	}else{
  		 	res.status(401).json({'status': 'ERROR','message':'You are not an Admin'});
	 	}
	})(req, res, next);
});
//**************************************************************************************************************************************************************
router.get('/', function (req, res, next) {
	passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error); 
	    }
	   if(user.type == 'ft_admin'){
			if((user.role == 'showAdmin') || (user.role=='updateAdmin') || (user.role=='superAdmin')){
       		
				unregisteredVDTService.getAllUnregisteredVDTAsync(req)
				.then(
					function(unregisteredVDT) {
						res.status(200).json({'status': 'OK','data':unregisteredVDT.data,'no_of_pages':unregisteredVDT.no_of_pages});
					},
					function(err) {
						res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
					}
				)
				.catch(next);
	 		}else{
		 		res.status(200).json({'status': 'OK','message':'You do not have admin privilege'});
	 	  	}
       	}else{
  		 	res.status(200).json({'status': 'OK','message':'You are not an Admin'});
	 	}
	})(req, res, next);
});
//**************************************************************************************************************************************************************
router.put(
	'/:unregisteredVDT_id',
	function(req, res, next) {
		console.log('update unregistered VDT',req.body);
		passport.authenticate(
			'jwt',
			function (err, user, info) {
				if (err) return next(err);
				if (!user) return res.status(401).json(info);
			    if(user.type != 'ft_admin'){
		    	return res.status(401).json({'status': 'You are not an admin'});
				}	
				if((user.role != 'updateAdmin')&&(user.role != 'superAdmin')){
					return res.status(401).json({'status': 'You do not have update privilege'});
				}

				if((user.type == 'ft_admin')&&((user.role == 'updateAdmin')||(user.role == 'superAdmin'))){
					unregisteredVDTService.getUnregisteredVDTByIdAsync(req.params.unregisteredVDT_id)
			    	.then(function(unregisteredVDTunregisteredVDT){
			    		if(unregisteredVDTunregisteredVDT){
			    			return next();
			    		}
			    		else{
			    			res.status(404).json({'status': 'ERROR','message':'No unregistered RegisteredVehicle, Driver, Transporter found on this ID'});
			    			}

			    	}).catch(next);
				}
			}
		)(req, res, next);
	},

	function(req, res, next) {
		if(Object.getOwnPropertyNames(req.body).length>0){
			unregisteredVDTService.updateUnregisteredVDTAsync(req.params.unregisteredVDT_id,req.body)
			.then(function(unregisteredVDT){
			if(unregisteredVDT){
				res.status(200).json(unregisteredVDT);
			}
			else{
		    	res.status(400).json({'status': 'ERROR',"error_message":"your Status not updated."});
		       }
			}).catch(next);
		}else{
			res.status(400).json({'status': 'ERROR',"error_message":"Nothing to update."});
		}
	}
);
//**************************************************************************************************************************************************************
router.delete(
	'/:unregisteredVDT_id',
	function(req, res, next) {
		passport.authenticate(
			'jwt',
			function (err, user, info) {
				if (err) return next(err);
				if (!user) return res.status(401).json(info);
			    if(user.type != 'ft_admin'){
		    	return res.status(401).json({'status': 'You are not an admin'});
				}	
				if(user.role != 'superAdmin'){
					return res.status(401).json({'status': 'You do not have delete privilege'});
				}
				if((user.type == 'ft_admin')&&((user.role == 'updateAdmin')||(user.role == 'superAdmin'))){
					unregisteredVDTService.getUnregisteredVDTByIdAsync(req.params.unregisteredVDT_id)
			    	.then(function(unregisteredVDTunregisteredVDT){
			    		if(unregisteredVDTunregisteredVDT){
			    			return next();
			    		}
			    		else{
			    				res.status(404).json({'status': 'ERROR','message':'No unregistered RegisteredVehicle, Driver, Transporter found on this ID'});
			    			}

			    	}).catch(next);
				}
			}
		)(req, res, next);
	},

	function(req, res, next) {
		if((req.params)&&(req.params.unregisteredVDT_id)){
			unregisteredVDTService.deleteUnregisteredVDTByIdAsync(req.params.unregisteredVDT_id)
			.then(function(posting){
			if(posting){
				res.status(200).json({'status': 'OK',"message":"Unregistered RegisteredVehicle, Driver, Transporter deleted."});
			}
			else{
		    	res.status(400).json({'status': 'ERROR',"error_message":"Unregistered RegisteredVehicle, Driver, Transporter not deleted."});
		    }
			}).catch(next);
		}else{
			res.status(400).json({'status': 'ERROR',"error_message":"Nothing to delete."});
		}
	}
);
//**************************************************************************************************************************************************************
module.exports = router;