var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var jwt = require('jwt-simple');
var passport = require('passport');

var userService = Promise.promisifyAll(commonUtil.getService('user'));
var unregisteredUserService = Promise.promisifyAll(commonUtil.getService('unregisteredUser'));


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
       		  		if((req.body.mobile)&&(req.body.mobile.length>0)){
       					userService.getUserByUSERIDAsync(req.body.mobile[0])
						.then(function(user) {
							if(user == null){
								var oModifiedCitySource;
	 							if(req.body.city){
		 							req.body.city = JSON.parse(JSON.stringify(req.body.city));
	 							}
	 							if(req.body.city && req.body.city.address_components){
	   	 							oModifiedCitySource = googlePlaceUtil.getFormattedCity(req.body.city.address_components);
	   							}
	 							if(req.body.city && !req.body.city.c && oModifiedCitySource){
	   								req.body.city.c = oModifiedCitySource.c;
	   							}
	 							if(req.body.city && !req.body.city.d && oModifiedCitySource){
		   							req.body.city.d = oModifiedCitySource.d;
	   							}
	 							if(req.body.city && !req.body.city.s && oModifiedCitySource){
		   							req.body.city.s = oModifiedCitySource.s;
	  							}
	 							if(req.body.city && !req.body.city.p && oModifiedCitySource){
		   							req.body.city.p = oModifiedCitySource.p;
	   							}
	   							unregisteredUserService.addUnregisteredUserAsync(req.body)
								.then(function(addedData){
									res.status(200).json({'status':'OK','message':'New unregistered user added.',"data":addedData});
								})
							}else{
								res.status(400).json({'status':'ERROR',"error_message":"This mobile no is already registered."});
							}
						}).catch(next);
					}else{
						res.status(400).json({'status':'ERROR',"error_message":"Please provide at least one mobile number."});
					}	
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
//******************************************************************************************************************************************
router.get('/', function (req, res, next) {
	passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error); 
	    }
	   if(user.type == 'ft_admin'){
			if((user.role == 'showAdmin') || (user.role=='updateAdmin') || (user.role=='superAdmin')){
       		
				unregisteredUserService.getAllUnregisteredUserAsync(req)
				.then(
					function(unregisteredUsers) {
						res.status(200).json({'status': 'OK','data':unregisteredUsers.data,'no_of_pages':unregisteredUsers.no_of_pages});
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
//**********************************************************************************************************************
router.put(
	'/:unregisteredUser_id',
	function(req, res, next) {
		console.log('update unregistered User',req.body);
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
					unregisteredUserService.getUnregisteredUserByIdAsync(req.params.unregisteredUser_id)
			    	.then(function(posting){
			    		if(posting){
			    			return next();
			    		}
			    		else{
			    			res.status(404).json({'status': 'ERROR','message':'No Posting found on this Posting ID'});
			    			}

			    	}).catch(next);
				}
			}
		)(req, res, next);
	},

	function(req, res, next) {
		if(Object.getOwnPropertyNames(req.body).length>0){
			unregisteredUserService.updateUnregisteredUserAsync(req.params.unregisteredUser_id,req.body)
			.then(function(unregisteredUsers){
			if(unregisteredUsers){
				res.status(200).json(unregisteredUsers);
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
//**********************************************************************************************************************
router.delete(
	'/:unregisteredUser_id',
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
					unregisteredUserService.getUnregisteredUserByIdAsync(req.params.unregisteredUser_id)
			    	.then(function(posting){
			    		if(posting){
			    			return next();
			    		}
			    		else{
			    				res.status(404).json({'status': 'ERROR','message':'No Posting found on this Posting ID'});
			    			}

			    	}).catch(next);
				}
			}
		)(req, res, next);
	},

	function(req, res, next) {
		if((req.params)&&(req.params.unregisteredUser_id)){
			unregisteredUserService.deleteUnregisteredUserByIdAsync(req.params.unregisteredUser_id)
			.then(function(posting){
			if(posting){
				res.status(200).json({'status': 'OK',"message":"Unregistered User deleted."});
			}
			else{
		    	res.status(400).json({'status': 'ERROR',"error_message":"Unregistered User not deleted."});
		    }
			}).catch(next);
		}else{
			res.status(400).json({'status': 'ERROR',"error_message":"Nothing to delete."});
		}
	}
);
//**********************************************************************************************************************
module.exports = router;