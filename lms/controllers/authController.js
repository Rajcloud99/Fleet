var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var jwt = require('jwt-simple');
//var bcrypt = Promise.promisifyAll(require('bcrypt'));
var passport = Promise.promisifyAll(require('passport'));
var userService = Promise.promisifyAll(commonUtil.getService('user'));
const userServiceV2 = commonUtil.getService('user');
var clientService = Promise.promisifyAll(commonUtil.getService('client'));
var RoleService = Promise.promisifyAll(commonUtil.getService("roles"));
var accessControlService = Promise.promisifyAll(commonUtil.getService('accessControl'));
var ClientConf = promise.promisifyAll(commonUtil.getModel('clientConfig'));
var tableAccessService = Promise.promisifyAll(commonUtil.getService('tableAccess'));

//force upgrade and recommend upgrade both cannot be true at same time
var currAppVersion = "2.1.2";
var forceUpgrade = false;
var recommendUpgrade = false;
var bannerImagePath = "HOMENOTIF19-03-2016.png" ; // naming format has to be HOMENOTIFdd-mm-yyyy.ext
var types = {"1":"transporter","2":"truck_owner","3":"customer"}; //type of customers to show
var showBanner = true;
var adminRoles = require(projectHome+'/adminRoles');
//var tableRoles = require(projectHome+'/tableAccess');


function prepareUserResponse(userResponse){
  if(userResponse){
	userResponse.password = undefined;
	userResponse.pwd = undefined;
	userResponse.client_allowed = userResponse.client_allowed || userResponse._doc.client_allowed;

  }
	return userResponse;
 }

 function arrafyRoleData(objRoleData){
     var arrRoleData =[];
     for (key in objRoleData){
         var obj ={};
         obj["key"]=key;
         obj["perms"]=objRoleData[key];
         arrRoleData.push(obj);
     }
     return arrRoleData;
 }

router.post('/login',
	function(req, res, next) {
		passport.authenticate(
			'local',
			function(err, user, info) {
			    if (err) return next(err);
				if (user === false) {
					let token = req.headers['authorization'];
					if (token) {
						let decoded = jwt.decode(token, commonUtil.getConfig('app_secret'));
						userService.findUserByIdAsync(decoded._id)
							.then(async function(user) {
								//logger.info("Passed JWT:");
								if (!user) throw new Error ('user not found');
								req.decoded = decoded;
								req.user = prepareUserResponse (user);
								return next();
							})
					}
					else
						return res.status(500).json(info);
				}else {
					req.user = prepareUserResponse (user);
					return next ();
				}
			}
		)(req, res, next);
	},
	/**** set request client ****/
	async function(req, res, next){
		if(req.user.clientId instanceof Array){
			req.selectedClientId = req.user.clientId[0];
		}else{
			req.selectedClientId = req.user.clientId;
		}

		if(req.user.client_allowed && req.user.client_allowed.length>0){
			for(let i=0;i<req.user.client_allowed.length;i++){
				if(req.user.client_allowed[i].clientId == req.query.clientId || req.user.client_allowed[i].clientId == req.body.clientId){
					req.selectedClientId = req.user.client_allowed[i].clientId;
				}
			}
		}
		if(req.decoded){
			req.decoded.clientId = req.selectedClientId;
		}
		else {
			const randomString = require('randomstring').generate(8);
			await userServiceV2.updateV2({'_id':req.user._id}, {
				set: {
					[req._authTokenMatchKey]: randomString
				}
			});
			req.decoded = {'_id':req.user._id,
				'rand_str': randomString,
				'clientId': req.selectedClientId
			}
		}
		req.token = jwt.encode(req.decoded,
			commonUtil.getConfig('app_secret'));
		return next();
	},
	/***append client config***/
	function(req, res, next) {
		if (req.user.clientId ===config.super_admin_id) {
			clientService.searchClientAsync({"config": true, "includeAdminClient": true})
				.then(function (clientSearchData) {
					req.clientData = clientSearchData;
					return next();
				}).catch(next);
		}else{
			clientService.searchClientAsync({"clientId":req.selectedClientId, "config": true})
				.then(function (clientSearchData) {
					req.clientData = clientSearchData;
					return next();
				}).catch(next);
		}
    },
	/***Append role data for either super admin/client admin/normal user ***/
	function(req, res, next) {
		if(req.user.access){
			accessControlService.findAccessControlByIdAsync(req.user.access)
				.then(function (access) {
					access = JSON.parse(JSON.stringify(access));
					if(!access){
						return res.status(500).json({
							"status": "ERROR",
							"message": "This user don't have access to system!"
						});
					}
					req.access=access.role;
					return next();
				})
				.catch(function(err) {
					console.log(err);
					return res.status(500).json({ 'status': 'ERROR', 'message': "Could not find user" });
				});
		}else if(req.user.userId === "000000"){
			req.access = adminRoles;
			return next();
		}else {
			return next();
		}
		/*if(req.user.role === config.super_admin_role_name) {
			req.allowedResources = arrafyRoleData(config.super_admin_role_data);
			return next();
		} else if(req.user.role === config.super_client_role_name) {
			req.allowedResources = arrafyRoleData(config.super_client_role_data);
			return next();
		} else if  (req.user.clientAdmin){
            var query = {'role':req.user.role,'department':req.user.department,'clientId':config.super_admin_id};
            RoleService.findRoleByQueryAsync(query)
                .then(function(role){
                    role = JSON.parse(JSON.stringify(role));
                    if (role && role[0]) {
                        req.allowedResources = role[0].allows || [];
                    }else{
                        req.allowedResources = [];
					}
                    return next();
                })
                .catch(next)
        } else {
            query = {'role':req.user.role,'department':req.user.department,'clientId':req.user.clientId};
            RoleService.findRoleByQueryAsync(query)
                .then(function(role){
                    role = JSON.parse(JSON.stringify(role));
                    if (role && role[0]) {
                        req.allowedResources = role[0].allows || [];
					}else{
                        req.allowedResources = [];
					}
                    return next();
                })
                .catch(next)
        }*/
	},
	//Start Table access... By Harikesh - Dated: 15/11/2019

	function(req, res, next) {

		if(req.user._id){
			tableAccessService.findTableAccessByIdAsync(req.user._id)
			.then(function (tableAcc) {
				tableAcc = JSON.parse(JSON.stringify(tableAcc));

				if(!tableAcc){
					return res.status(500).json({
						"status": "ERROR",
						"message": "This user don't have tableAcc to system!"
					});
				}
				//console.log("tableAcc",tableAcc);
				req.tableAcc = tableAcc;
				return next();
			})
			.catch(function(err) {
				console.log(err);
				return res.status(500).json({ 'status': 'ERROR', 'message': "Could not find tableAcc for user" });
			});

		}else {
			return next();
		}
	},

	//END
	function(req, res, next) {
		ClientConf.findAsync({"clientId": req.selectedClientId})
			.then (function (clientConfigsData) {
				req.configs = (clientConfigsData && clientConfigsData[0]) ? (JSON.parse (JSON.stringify (clientConfigsData[0]))).config : {};
				return next ();
			}).catch (next);
	},
	function(req,res,next){
        return res.status(200).json({
                        'status': 'OK',
                        'token': req.token,
                        "user": req.user,
                        "client_config": req.clientData.clients[0],
						"access": req.access,
						"tableAccess": req.tableAcc,
						"configs": req.configs,
                        "role_data": req.allowedResources
        });
    }
);


/*router.post('/changePass',
	function (req, res, next) {
		passport.authenticate(
			'jwt',
			function (err, user, info) {
				if (err) return res.status(403).json(info);
				if (!user) return res.status(403).json(info);
			   return bcrypt.compareAsync(req.body.old_pass, user.password)
				.then(
					function(isMatch) {
						if (isMatch !== true) {
							logger.error("Old pass does not match");
							return Promise.reject({
								"code": 403,
								"info" : {
									"status" : "ERROR",
									"error_message" : "Old Password not matching"
								}
							});
						}
						else logger.info("Old pass matches");
						return bcrypt.hashAsync(req.body.new_pass, 8);
					}
				)
				.then (
					function (hash) {
						return UserService.updateUserAsync(user._id, {"password" : hash})
						.then (
							function () {
								logger.info('password changed');
								return res.status(200).json({"status" : "OK","message":"Password changed successfully."});
								}
						);
					}
				)
				.catch (
					function (err) {
						if (err.code) {
							logger.error('change password',err.code,err.info)
							return res.status(err.code).json(err.info);
						}
						else return next(err);
					}
				);
			}
		)(req, res, next);
	}
 );*/

router.post('/logout',
		function(req, res, next) {
			passport.authenticate(
				'jwt',
				function(err, user, info) {
					if (err) return next(err);
					if (user === false) return res.status(401).json(info);
					if(user.status=='active'){
						var update_device = false;
						var spliceIndex;
						if(req.body.devices && user.devices && user.devices[0]){
							for(var i=0;i<user.devices.length;i++){
								if(user.devices[i].token == req.body.devices.token){
									update_device = true;
									spliceIndex = i;
								}
							}
						}
						if(update_device){
							user.devices.splice(spliceIndex,1);
							var oDevices = {'devices':user.devices};
							return userService.updateUserAsync(user._id,oDevices)
						      .then(function(user) {
			                    if(user){
		    	         	     logger.info("user logged out from app",user.mobile,user.owner_name);
		    	         	     return res.status(200).json({'status':'OK', 'message':'user logged out successfully.'});
						        // return {'status':'OK', 'token': token, "user": userResponse};
		                       }else{
		    	                 return {"status": "ERROR","message":"User device details are not updated."};
		                       }
				            }).catch(next);
						 }else{
						 	logger.info("user logged out ",user.mobile,user.owner_name);
						    return res.status(200).json({'status':'OK', 'message':'user logged out successfully.'});

						 }
					}else{
						return res.status(200).json({'status':'OK',"message":"Inactive user, Please verify by OTP"});
					}
				}
			)(req, res, next);
		}
	 );
router.post('/forgotPass',
		function(req, res, next) {
		userService.getUserByUSERIDAsync(req.body.userId)
	    .then(function(user){
	    	if (user) {
                        var pass = {};
                        pass.password = user.password;
                        return res.status(200).json({"status":"OK",
                        "message":" password found ",
                        "data":pass});
                    }else{
                        return res.status(500).json({"status":"ERROR",
                        "message":"UserId not exists",
                        });
                }
		}).catch(next);
	 });

router.post('/verify_otp_fp',
		function(req, res, next) {
		userService.getUserByUSERIDAsync(req.body.mobile)
	    .then(function(user){
	    	if (user === false) return res.status(401).json({'message':'User does not exists.'});
	    	if(user.otp == req.body.otp){
	    	var message = 'Password for Future Trucks  is: ' + user.pwd +' If You have not requested it please call us imediately at  9891705459. Download our android application from  https://goo.gl/khpPCW' ;
			smsUtil.sendSMS(user.mobile,message);
			var sGreetings = "Dear Client,";
			if(user && user.email){
					  var sEmailMessage = "<b>" + sGreetings + "</b> <br>"  + message;
					  var mailOptions = {
							    to: user.owner_name+ ' ✔ <'+user.email+'>',
							    subject: 'Password for Future Trucks.✔',
							    text: 'Welcome from Future Trucks✔',
							    html: '<br>'+sEmailMessage+'<br>'
							};
					emailUtil.sendMail(mailOptions);
				}
	    	var resp = {'status':'OK','message':'Your password has been sent to your email and  mobile no '+user.mobile};
	    	res.status(200).json(resp);
	    	}else{
	    		var resp = {'status':'OK','message':'your otp '+ req.body.otp  +'does not match with otp sent by Future Trucks.'};
	    	res.status(200).json(resp);
	    	}
		}).catch(next);
	 });

router.get('/setup', function(req, res) {

   // create a sample user
   var admin = {};
   admin.mobile = 123456;
   admin.username = 'admin';
   admin.password = 'admin';
   admin.owner_name = 'bharath';

   userService.addUserAsync(admin)
   .then(function(addedData){
       if(!addedData){
            res.status(500).json({'message':'You are already registered. Please login','status':'OK','user_status':'inactive'});
       }
       else if(addedData && addedData.status == 'ERROR'){
             res.status(500).json(addedData);
       }
       res.send();
   }).error(function(e){
	   res.status(500).json(e);
   });

 });

router.post('/resetPassword',
		function(req, res, next) {
		userService.getUserByUSERIDAsync(req.body.userId)
	    .then(function(user){
	    	if (user) {
	    		    //if (user.password === req.body.password) {
	    		    	req.body.password = req.body.newPassword;
	    		    	console.log('updateUser',JSON.stringify(req.body));
	                    userService.updateUserAsync(user._id, req.body)
	                    .then(function(client) {
                        if (client){
                            return res.status(200).json({"status":"OK",
	                        "message":"Password update successfully"
	                        });
                        } else{
                        	return res.status(500).json({"status":"ERROR",
	                        "message":"Password does not updated"
	                        });
                        }
                       });
	    		    /*} /*else {
	    		    	return res.status(500).json({"status":"ERROR",
                        "message":"Password does not match",
                        });
	    		    }*/
                }else{
                    return res.status(500).json({"status":"ERROR",
                    "message":"UserId does not exists",
                    });
                }
		}).catch(next)
	 });

router.post('/updatePassword',
	function(req, res, next) {
		userService.getUserByUSERIDAsync(req.body.userId)
			.then(function(user){
				if (user) {
					if (user.password === req.body.old_password) {
					    var updateBody = {};
					    updateBody.password = req.body.new_password;
                        updateBody.pwd = encrypt(updateBody.password);
						updateBody.authWeb = '__reset__';
						updateBody.authAndroid = '__reset__';
						updateBody.authIOS = '__reset__';
                        userService.updateUserByIdAsync(user._id, updateBody)
                            .then(function(updated) {
                                if (updated){
                                    return res.status(200).json({"status":"OK",
                                        "message":"Password update successfully"
                                    });
                                } else{
                                    return res.status(500).json({"status":"ERROR",
                                        "message":"Some error occurred in password updation"
                                    });
                                }
                            });
					} else {
                         return res.status(500).json({"status":"ERROR",
                            "message":"Old password does not match"
                            });
					}
				}else{
					return res.status(500).json({"status":"ERROR",
						"message":"User id does not exist"
					});
				}
			}).catch(next)
	});

module.exports = router;
