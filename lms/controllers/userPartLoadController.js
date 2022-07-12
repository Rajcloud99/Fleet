var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var jwt = require('jwt-simple');
var passport = require('passport');

var userService = Promise.promisifyAll(commonUtil.getService('user'));
var UserPartLoad = Promise.promisifyAll(commonUtil.getService('userPartLoad'));


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
       		  		if(req.body.mobile){
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
						var reverseFunc = function reverse(stringValue) {
  											return stringValue.split('').reverse().join('');
										}

	   					req.body.status = 'active';
	   					var forPassword = req.body.mobile.toString();
	   					var lastFour = forPassword.substring(6,10);
	   					var reverseLastFour = reverseFunc(lastFour);
	   					
	   					req.body.password = reverseLastFour;
						req.body.tnc_accepted = true;
						req.body.lastUpdateBy = {
							name : user.owner_name,
							role : user.role,
							type : 'admin'
						};

						UserPartLoad.addUserforPartLoadAsync(req.body)
						.then(function(addedData){
							if(!addedData){
			 					return res.status(400).json({'message':'This number is already registered as USER or PART-LOAD-USER.','status':'OK'});
							}
							else if(addedData && addedData.status == 'ERROR'){
      		  					return res.status(500).json(addedData);
	    					}else{
	    						var oData = {'message':'Part Load User registered successfully.','status':'OK'};
	        					return res.status(200).json(oData);
	    					}
						})
					}else{
						return res.status(400).json({'status':'ERROR',"error_message":"Please provide mobile number."});
					}	
	 			}else{
	 				return res.status(400).json({'status':'ERROR',"error_message":"No data found."});
	 			}
			}else{
		 		return res.status(401).json({'status': 'ERROR','message':'You do not have admin privilege'});
	 	  	}
       	}else{
  		 	return res.status(401).json({'status': 'ERROR','message':'You are not an Admin'});
	 	}
	})(req, res, next);
});
//*****************************************************************************************************************************
router.get('/', function (req, res, next) {
	passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error); 
	    }
	   if(user.type == 'ft_admin'){
			if((user.role == 'showAdmin') || (user.role=='updateAdmin') || (user.role=='superAdmin')){
       		
				UserPartLoad.getAllUserOfPartLoadAsync(req)
				.then(
					function(UserPartLoad) {
						res.status(200).json({'status': 'OK','data':UserPartLoad.data,'no_of_pages':UserPartLoad.no_of_pages});
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
//*****************************************************************************************************************************
router.put(
	'/:userPartLoad_id',
	function(req, res, next) {
		console.log('update Part-load User',req.body);
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
					UserPartLoad.getPartLoadUserByIdAsync(req.params.userPartLoad_id)
			    	.then(function(posting){
			    		if(posting){
			    			return next();
			    		}
			    		else{
			    			res.status(404).json({'status': 'ERROR','message':'No Part-load user found on this ID'});
			    			}

			    	}).catch(next);
				}
			}
		)(req, res, next);
	},

	function(req, res, next) {
		if(Object.getOwnPropertyNames(req.body).length>0){
			UserPartLoad.updatePartLoadUserAsync(req.params.userPartLoad_id,req.body)
			.then(function(unregisteredUsers){
			if(unregisteredUsers){
				res.status(200).json(unregisteredUsers);
			}
			else{
		    	res.status(400).json({'status': 'ERROR',"error_message":"Part-load user not updated."});
		       }
			}).catch(next);
		}else{
			res.status(400).json({'status': 'ERROR',"error_message":"Nothing to update."});
		}
	}
);
//*****************************************************************************************************************************
router.delete(
	'/:userPartLoad_id',
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
					UserPartLoad.getPartLoadUserByIdAsync(req.params.userPartLoad_id)
			    	.then(function(posting){
			    		if(posting){
			    			return next();
			    		}
			    		else{
			    				res.status(404).json({'status': 'ERROR','message':'No Part-load user found on this ID'});
			    			}

			    	}).catch(next);
				}
			}
		)(req, res, next);
	},

	function(req, res, next) {
		if((req.params)&&(req.params.userPartLoad_id)){
			UserPartLoad.deletePartLoadUserByIdAsync(req.params.userPartLoad_id)
			.then(function(posting){
			if(posting){
				res.status(200).json({'status': 'OK',"message":"Part-load User deleted."});
			}
			else{
		    	res.status(400).json({'status': 'ERROR',"error_message":"Part-load User not deleted."});
		    }
			}).catch(next);
		}else{
			res.status(400).json({'status': 'ERROR',"error_message":"Nothing to delete."});
		}
	}
);
//*****************************************************************************************************************************
module.exports = router;