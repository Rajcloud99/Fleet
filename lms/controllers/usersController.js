var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var winston = require('winston');
var passport = require('passport');
var multer = require('multer');
var path = require('path');
var UserService = Promise.promisifyAll(commonUtil.getService('user'));
var MechanicService = Promise.promisifyAll(commonUtil.getMaintenanceService('mechanic'));
var RoleService = Promise.promisifyAll(commonUtil.getService('roles'));
var acService = promise.promisifyAll(commonUtil.getService('accessControl'));
let CustomerService = commonUtil.getService('customer');
var acccountsServiceV2 = commonUtil.getService('accounts');
var Client = promise.promisifyAll(commonUtil.getModel('client'));
var UserModel = Promise.promisifyAll(commonUtil.getModel('user'));
let billingPartyModel = commonUtil.getModel('billingparty');
let customerModel = commonUtil.getModel('customer');
let accountModel = commonUtil.getModel('accounts');
const logsService = commonUtil.getService('logs');


function prepareUserResponse(user){
	var userResponse =JSON.parse(JSON.stringify(user));
	userResponse.password = undefined;
	userResponse.pwd = undefined;
	return userResponse;
 }



router.get('/isAvailable/:user_id', function(req, res) {
	    UserService.getUserByUSERIDAsync(req.params.user_id)
		.then(function(user){
			if(user) {
				return res.status(200).json({"status": "OK","isAvailable":false});
			} else {
				return res.status(200).json({"status": "OK","isAvailable":true});
			}
		})
		.error(function(e){
				return res.status(500).json({"status": "ERROR","message":e});
		});
  });

router.post('/add',
    /***Find user if it already exists ***/
    function (req,res,next){
        if(otherUtil.validateAdmin(req,res)){
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "Access Denied!!"
            });
        }
        UserService.findUsersByQueryAsync({userId:req.body.userId,clientId:req.body.clientId})
            .then(function(users){
                if (users && users[0]){
                    return res.status(500).json({"status":"ERROR","message":"User with this id already exists"});
                }else{
                    return next();
                }
            }).catch(next)
    },
	/** validation if user is broker **/
	async function(req,res,next){

		try {

			if(req.body.bmBillName){     // broker memo bill name
				let foundbp = await billingPartyModel.findOne({name: new RegExp('^' + (req.body.bmBillName.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId});

				if(foundbp)
					throw new Error(`${req.body.bmBillName}  BillingParty name already exists. Please choose a different name`);

				let oCustomer = await customerModel.findOne({name: new RegExp('^' + (req.body.bmBillName.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId});

				if(oCustomer)
					throw new Error(`${req.body.bmBillName} Customer name already exists. Please choose a different name`);

				let oAccount = await accountModel.findOne({name: new RegExp('^' + (req.body.bmBillName.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId});

				if(oAccount)
					throw new Error(`${req.body.bmBillName} Account name already exists. Please choose a different name`);

			}

			return next();

		}catch (e) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': e.toString(),
				'data': e
			});
		}
	},

	function(req, res, next) {
		if(req.body.bmBillName){
			acccountsServiceV2.findAccountByQueryV2({isGroup: true,
				name: "Sundry Debtors",
				clientId:req.user.clientId})
				.then(function (account) {
					if(!(account && account.data && account.data[0])) {
						return res.status(500).json({
							'status': 'ERROR',
							'message': 'Sundry Debtors ledger group  not exists',
						});
					} else {
						req.body.type = account.data[0];
						return next();
					}
				}).catch(next)
		}else{
			next();
		}
	},

	function(req, res, next) {
		if(req.body.bmBillName){
			let obj = {
				clientId:req.user.clientId,
				accountType: "Cash in Hand",
				group: ["Customer"],
				isAdd: true,
				name: req.body.bmBillName,
				ledger_name: req.body.bmBillName,
				isGroupNotAllowed: true,
				type: {name: "Sundry Debtors", level: req.body.type.lvl, _id: req.body.type._id}
			}
			delete req.body.type;
			acccountsServiceV2.addAccountAsync(obj)
				.then(function(data) {
					if (data) {
						req.body.accountV2 = data;
						return next();
					} else {
						return res.status(200).json({
							'status': 'OK',
							'message': 'Nothing added.',
							'data': null
						})
					}
				})
				.catch(next)
		}else{
			next();
		}
	},

	async function(req,res,next) {
		try {

			if(req.body.bmBillName) {
				let custFilter = {
					created_at: req.body.created_at,
					clientId: req.body.clientId,
					name: req.body.bmBillName,
				};

				let aCustomer = await CustomerService.addCustomerV2(custFilter);

				let oFilter = {
					clientId: req.user.clientId,
					name: req.body.bmBillName,
				};

				let bpbody = {
					created_at: Date.now(),
					clientId: req.user.clientId,
					name: req.body.bmBillName,
					account: req.body.accountV2._id,
					customer: aCustomer._id,
					billName: req.body.bmBillName,
				}

				let aBillingParty = await billingPartyModel.findOneAndUpdate(oFilter, {$set: bpbody}, {
					new: true,
					upsert: true
				});

				// await billingPartyModel.updateOne({_id: billingParty._id},{$set:{customer:customer._id}});
				req.body.brokerCustomer = aCustomer._id;
				req.body.brokerCustName = aCustomer.name;
				req.body.brokerbp = aBillingParty._id;
				req.body.brokerbpName = aBillingParty.name;
			}

			return next();

		}catch (e) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': e.toString(),
				'data': e
			});
		}
	},
    /***Append appropriate keys and validations for super user/ client admin user/normal***/
    function(req,res,next){
        if (req.isAdminKeyOperation){ //if super admin is getting added
            req.body.userId = config.super_admin_id;
            req.body.clientId = config.super_admin_id;
            req.body.full_name = config.super_admin_user_name;
            req.body.role = config.super_admin_role_name;
            return next();
        }else if (req.user.userId===config.super_admin_id){ // if super admin is adding clientAdmin
            req.body.clientAdmin = true;
            return next();
        }else{
            //normal user registration, prevent any fraudulent clientId registration
            req.body.clientAdmin=false;
            req.body.clientId = req.user.clientId;
            return next();
        }
    },
    /***Append dasboard app accesses fetching from role data. Skip fetch for admin key operation ***/
    function(req,res,next){
        if (req.isAdminKeyOperation){
            //if super admin user registration
            req.body.apps_visible = config.super_admin_apps_visible;
            return next();
        } else if (req.body.access){
			acService.findAccessControlByIdAsync(req.body.access)
				.then(function (access) {
					if(!access){
						return res.status(500).json({
							"status": "ERROR",
							"message": "Selected role is not found in DB"
						});
					}
					else {
						req.body.access = mongoose.Types.ObjectId(req.body.access);
						return next();
					}
				})

        }else if(req.body.accessBody){
			if (otherUtil.isEmptyObject(req.body.accessBody)){
				return res.status(500).json({"status":"ERROR","message":"Role not provided"});
			}
			else {
				req.body.accessBody.clientId = req.user.clientId;
				acService.addAccessControlAsync(req.body.accessBody)
					.then(function (data) {
						if(data && data._id){
							req.body.access = mongoose.Types.ObjectId(data._id);
							return next();
						}
						else {
							return res.status(500).json({
								"status": "ERROR",
								"message": "Unable to created new role"
							});
						}
					})
					.catch(next);
			}
        }else {
        	return next();
		}
    },
    /*** Finally add the user ***/
    function(req,res,next){
        UserService.addUserAsync(req.body)
            .then(function(user){
                /**add mechanic user to respective schema **/
                if (user.user_type && user.user_type==="Mechanic"){
                    MechanicService.addMechanicAsync({clientId:req.user.clientId,
                        full_name:user.full_name, employee_code:user.userId});
                }
                if (user && req.isAdminKeyOperation) {
                    return res.status(200).json({"status":"OK",
                        "message":"Super user has been added successfully",
                        "data":user});
                }
                else if(user && req.user.role ===config.super_user_role_name){
                    return res.status(200).json({"status":"OK",
                        "message":"Client admin user has been added successfully",
                        "data":user});
                }else if (user){
                    return res.status(200).json({"status":"OK",
                        "message":"User has been added successfully",
                        "data":user});
                }else{
                    return res.status(500).json({"status":"ERROR",
                        "message":"Some error occurred in user registration process"
                    });
                }
            })
            .catch(next);
    }
 );

const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

/***Get users list ***/
router.get('/get', function(req, res) {
    UserService.searchUserAsync(req)
        .then(function(dataSearchUsers) {
			if (req.query.download) {
				ReportExelService.userReport(dataSearchUsers.users, req.user.clientId, function (data) {
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			} else {
				for (var i = 0; i < dataSearchUsers.users.length; i++) {
					dataSearchUsers.users[i] = prepareUserResponse(dataSearchUsers.users[i]);
				}
				return res.status(200).json({
					"status": "OK",
					"message": "Users found",
					"count": dataSearchUsers.count,
					"pages": dataSearchUsers.pages,
					"data": dataSearchUsers.users
				});
			}
        })
        .error(function(e){
            return res.status(500).json({"status": "ERROR","error_message":e});
        });
});

/***Get users list ***/
router.get('/fetch_password_lms/:_id', async function(req, res) {

    try{
		let userPass = await UserModel.findOne({'_id': req.params._id}, {password: 1});
		return res
			.status(200)
			.json({
				"status": "OK",
				"message":"Users found",
				"data":userPass
			});
	}catch(e){
    	console.log(e);
	}
});

router.put('/update/:_id',
    function(req, res, next) {
        if (req.params.user_id === config.super_admin_id){
            if (req.isAdminKeyOperation){
                return next();
            }else{
                return res.status(500).json({"status":"ERROR","error_message":"You are not a Super Admin"});
            }
        }else{
            return next();
        }
    },
    /***Reject fraudelent updates and modify any keys which could be fraudulently entered ***/
    function (req,res,next){
            if (req.isAdminKeyOperation){
                return next();
            }else if (req.user.role===config.super_admin_role_name){
                // if super admin is updating user, skip any below checks
                return next();
            }else if (req.body.role && req.body.role ===config.super_admin_role_name) {
                //checking reserved role registrations
                return res.status(500).json({"status":"ERROR","error_message":"This role name is reserved for usage"});
            }else if (req.body.clientAdmin && !req.user.role===config.super_admin_role_name){
                return res.status(500).json({"status":"ERROR","error_message":"You are not allowed to register admin users"});
            }else{
                //normal user updation, prevent any fraudulent clientId registrations
                req.body.clientId = req.user.clientId;
                return next();
            }
    },
    /*** If update body contains role, fetch role data and append apps visible. Role query would be different
     for client admin / normal user. Role query would be skipped for super admin***/
    /***Append dashboard app accesses fetching from role data. Skip fetch for admin key operation ***/

	async function (req, res, next) {
		try{
			let data = await acService.getRoleName(req.body);
			if(data && data[0]){
				return res.status(500).json({
					"status": "ERROR",
					"message": `Role name "${req.body.accessBody.name}" already exists`,
				});
			}else {
				return next();
			}

		}catch (err) {
			return res.status(501).json({
				"status": "ERROR",
				"message": err.toString()
			});
		}

	},

    function(req,res,next){
        if (req.isAdminKeyOperation){
            //if super admin user registration
            //req.body.main_apps_accessible = config.all_apps;
            req.body.apps_visible = config.super_admin_apps_visible;
            req.body.apps_visible = config.super_admin_apps_visible;
            return next();
        } else if (req.body.access){
			acService.findAccessControlByIdAsync(req.body.access)
				.then(function (access) {
					if(!access){
						return res.status(500).json({
							"status": "ERROR",
							"message": "Selected role is not found in DB"
						});
					}
					else {
						req.body.access = mongoose.Types.ObjectId(req.body.access);
						return next();
					}
				})

		}else if(req.body.accessBody){
			if (otherUtil.isEmptyObject(req.body.accessBody)){
				return res.status(500).json({"status":"ERROR","message":"Role not provided"});
			}
			else {
				req.body.accessBody.clientId = req.user.clientId;
				acService.addAccessControlAsync(req.body.accessBody)
					.then(function (data) {
						if(data && data._id){
							req.body.access = mongoose.Types.ObjectId(data._id);
							return next();
						}
						else {
							return res.status(500).json({
								"status": "ERROR",
								"message": "Unable to created new role"
							});
						}
					})
					.catch(next);
			}
		}else {
			return next();
		}
    },
	function(req,res,next){
        // if(otherUtil.validateAdmin(req,res)){
        //     return res.status(500).json({
        //         "status": "ERROR",
        //         "error_message": "Access Denied!!"
        //     });
        // }
                delete req.body.clientId;
        UserModel.findOne({'_id': req.params._id})
        .then( function(oUserRec){
            UserService.updateUserByIdAsync(req.params._id, req.body)
                .then(
                    function(user) {
                        if(user){

                            logsService.add('User', {
                                uif: oUserRec.userId,
                                category: 'Update',
                                nData: user,
                                oData: JSON.parse(JSON.stringify(oUserRec)),
                            }, req);

                            var userResponse = prepareUserResponse(user);
                            return res.status(200).json({"status": "OK",
                                "message":"User data has been updated successfully",
                                "data":userResponse
                                });
                        }else{
                            return res.status(500).json({"status": "ERROR","error_message":"User details are not updated"});
                        }
                    }
                )
                .catch(function(e){
                    return res.status(500).json({"status": "ERROR", "message":e});
                });
        }).catch(function(e){
            return res.status(500).json({"status": "ERROR", "message":e});
        });
    });

router.delete('/delete/:_id',
 function(req, res, next) {
     if(otherUtil.validateAdmin(req,res)){
         return res.status(500).json({
             "status": "ERROR",
             "error_message": "Access Denied!!"
         });
     }

     UserModel.findOne({'_id': req.params._id})
    .then( function(oUserRec){
        UserService.deleteUserByIdAsync(req.params._id)
        .then(function(){
            logsService.add('User', {
                uif: oUserRec.userId,
                category: 'delete',
                nData: {},
                oData: JSON.parse(JSON.stringify(oUserRec)),
            }, req);

            return res.status(200).json({"status": "OK","message": 'User deleted successfully'});
        })
        .error(function(e){
            return res.status(500).json({"status": "ERROR", "error_message":e});
        });
    }).error(function(e){
        return res.status(500).json({"status": "ERROR", "error_message":e});
    });

  });

router.post('/getUsertrim/', async function (req, res, next) {

	try {

		const aFoundUser = await UserModel.find({
			'notifId': req.body.notifId,
			'_id': {$ne: mongoose.Types.ObjectId(req.body._id)},
		},{_id:1, userId:1,clientId:1,notifId:1}).lean();


		if(aFoundUser && aFoundUser.length)
			for(var i in aFoundUser) {
				if(aFoundUser[i].clientId && aFoundUser[i].clientId[0]){
					const aFoundData = await Client.findOne({
						"clientId": aFoundUser[i].clientId[0],
					},{_id:1, gpsId:1}).lean();
					if(aFoundData){
						aFoundUser[i].gpsId = aFoundData.gpsId;
					}
				}
			}


		return res.status(200).json({
			'status': 'OK',
			'message': 'Data Found',
			data: aFoundUser
		});

	} catch (e) {
		throw e;
	}
});

router.post('/updateUserNotifId/:_id', async function (req, res, next) {

	try {

		await UserModel.updateOne({
			_id: mongoose.Types.ObjectId(req.params._id)
		},{
			$set: {
				notifId: req.body.notifId
			},
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Updated Successfully'
		});

	} catch (e) {
		throw e;
	}
});

router.post('/removeUserNotifId/', async function (req, res, next) {

	try {

		await UserModel.updateMany({
			_id: {$in: mongoose.Types.ObjectId(req.body._id)},
		},{
			$set: {
				notifId:1
			},
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Updated Successfully'
		});

	} catch (e) {
		throw e;
	}
});

module.exports = router;
