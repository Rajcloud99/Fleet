/*
 *
 * Created by manish on 5/7/16.
 */

let router = express.Router();
let CustomerService = promise.promisifyAll(commonUtil.getService('customer'));
let billingPartyService = promise.promisifyAll(commonUtil.getService('billingParty'));
let ContractService = promise.promisifyAll(commonUtil.getService('contract'));
let CustomerXMLJsonModel = promise.promisifyAll(require('../models/customerXmlJsonModel'));
let billingPartyModel = commonUtil.getModel('billingparty');
let customerModel = commonUtil.getModel('customer');
let schemaConfigModel = commonUtil.getModel('SchemaConfiguration');
let XmlJsonMappingService = promise.promisifyAll(commonUtil.getService('xmlJsonMapping'));
let httPostUtil = promise.promisifyAll(require('../../utils/httpPostUtil.js'));
let tripGRModel = commonUtil.getModel('tripGr');
let multipartMiddleware = require('connect-multiparty')();
let FileService = commonUtil.getUtil('file_upload_util');
let logsService = commonUtil.getService('logs');
let allowedFiles = ['Contract Rate','Diesel escalation','Detention Clause','Non Placement clause','New Customer adoption','PAN Card','GSTIN','Other'];


router.post("/add",
    function(req,res,next){
        CustomerService.findCustomerQueryAsync({name:req.body.name,clientId:req.user.clientId})
            .then(function(customer){
                if (customer && customer[0]) {
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": "This customer name already exists. Please choose a different name",
                        "data":customer
                    });
                }else{
                    return next();
                }
            }).catch(next)
    },
	function(req,res,next){
    	if(!req.body.sap_id) return next();
		CustomerService.findCustomerQueryAsync({sap_id:req.body.sap_id,clientId:req.user.clientId})
			.then(function(customer){
				if (customer && customer[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"message": "This customer SAP ID already exists. Please choose a different ID",
						"data":customer
					});
				}else{
					return next();
				}
			}).catch(next)
	},
    function(req,res,next) {
    	req.body.created_at = Date.now();
    	req.body.last_modified_at = Date.now();
        CustomerService.addCustomerAsync(req.body)
			.then(function(customer){
                return res.status(200).json({"status":"OK",
					"message":"Customer has been added successfully",
					"data":customer
				});
            }).catch(next)
    }
);

router.get("/get",function(req,res,next){
	// req.query = otherUtil.bindBranchFilter(req.query,"branch",req.user.branch);
    CustomerService.searchCustomerAsync(req.query,false)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Customers found",
                "data":data.customers,
                "count":data.count,
                "pages":data.pages});
        }).catch(next)
});


router.get("/getCust",function(req,res,next){
    CustomerService.findCustomerQueryAsync(req.query)
        .then(function(data){
             if(data){
            async.forEachOf(data,function(customer,index,callback){
             generateCustomerXMLData(customer)
                .then(function(a){
                    callback();
                })
            },function (err, proceed) {
                if(err){
                 console.log('err',err);
                }else {
                return res.status(200).json({"status":"OK","message":"customer found", "data": data});
                }
            })
          }else{
                 return res.status(200).json({"status":"OK",
                 "message":"no customer found","data": []});
             }
        }).catch(next)
});
router.get("/get/trim",function(req,res,next){
    CustomerService.searchAggrAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Customers found",
                "data":data.customers});
        }).catch(next)
});

router.put("/update/:_id",
	function(req,res,next){
		if (req.params && !req.params._id) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "customer _id is not found",
				"data": customer
			});
		}
		if(!req.body.sap_id) return next();
		CustomerService.findCustomerQueryAsync({sap_id:req.body.sap_id,clientId:req.user.clientId})
			.then(function(customer){
				if (customer && customer[0] && customer[0]._id.toString() != req.params._id) {
					return res.status(500).json({
						"status": "ERROR",
						"message": "The SAP ID you are updating is already used by "+ customer[0].name,
						"data":customer
					});
				}else{
					req.customerData = JSON.parse(JSON.stringify(customer[0]));
					return next();
				}
			}).catch(next)
	},
	function(req,res,next){
		CustomerService.findCustomerQueryAsync({_id:req.params._id,clientId:req.user.clientId})
			.then(function(customer){
				if (customer && customer[0]) {
					req.customerData = JSON.parse(JSON.stringify(customer[0]));
					return next();
				}else{
					return res.status(500).json({
						"status": "ERROR",
						"message": "Customer not found on selected company."
					});
				}
			}).catch(next)
	},
	multipartMiddleware,
    async function(req,res,next){
		if(req.files){
			await FileService.uploadFiles(req,"Customer",req.customerData,allowedFiles);
		}
		req.body.documents = req.customerData.documents;
		delete req.files;
		delete req.body.created_at;
		req.body.last_modified_at = Date.now();
        CustomerService.updateCustomerIdAsync(req.params._id,req.body)
            .then(function(updated){
              	return res.status(200).json({"status":"OK",
					"message":"Customer has been added successfully",
					"data":updated
				})
            }).catch(next)
    });

router.post('/delete/:id', async (req, res, next) => {
	try {
		let reqBody = req.body;
		if(!req.params.id)
			throw new Error('Mandatory fields are required');
		if(!reqBody)
			throw new Error('Mandatory fields are required');
		let  oCustomer = await customerModel.find({deleted:false,_id: otherUtil.arrString2ObjectId(req.params.id)}, {_id: 1}).lean();
		if (reqBody.deleted && oCustomer && !oCustomer.length){
			throw new Error('Customer Not Found');
		}
		if(oCustomer && oCustomer[0]){
			let GR  = await tripGRModel.findOne({customer:otherUtil.arrString2ObjectId(req.params.id)},{customer:1});
			if(GR){
				throw new Error( 'customer exist on gr you can not delete');
			}
		}

		oCustomer = await customerModel.updateOne({_id: req.params.id, clientId: req.user.clientId}, {
			$set: {
				deleted:reqBody.deleted,
				last_modified_at: new Date(),
				last_modified_by_name:  req.user.full_name,
				last_modified_by:  req.user._id,
				last_modified_employee_code:  req.user.clientId
			}
		});

		return res.status(200).json({
			status: 'OK',
			message: 'Customer Updated!',
			data: oCustomer
		})
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

router.delete("/delete/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for customer"});
    }
    CustomerService.deleteCustomerIdAsync(req.params._id)
        .then(function(deleted){
            return res.status(200).json({"status":"OK",
                "message":"Customer has been deleted successfully",
                "data":deleted});
        }).catch(next)
});

function cleanData(req) {
	delete req.body.clientId;
	delete req.body.created_by_employee_code;
	delete req.body.created_by_id;
	delete req.body.created_by;
	delete req.body.last_modified_by;
	delete req.body.created_by_name;
	delete req.body.last_modified_by_id;
	delete req.body.last_modified_by_name;
	delete req.body.last_modified_employee_code;
}

router.post("/register_user_gpsgaadi", function (req,res,next) {
	cleanData(req);

	if (!req.body._id){
		return res.status(500).json({"status":"ERROR","message":"No id provided to register gpsgaadi user for customer"});
	}

	req.body.selected_uid = req.clientData.gpsgaadi_user_id;
	let token = req.clientData.gpsgaadi_token;
	if (!token || !req.body.selected_uid){
		return res.status(500).send({"status":"ERROR","message":"Either the client does not have token or gpsgaadi user id"});
	}
	httPostUtil.postToSocketServerAsync(req.body,token,"/api/lmsCustomer/register")
		.then(function (response) {
			if (response.status ==="OK"){
				delete response.data._id;
				delete response.data.created_at;
				CustomerService.updateCustomerIdAsync(req.body._id,{"gpsgaadi":JSON.parse(JSON.stringify(response.data))})
					.then(function (updated) {
						return res.status(200).send(response);
					}).catch(next)
			}else{
				return res.status(500).send(response);
			}
		}).catch(next)
});

router.post("/change_password_gpsgaadi",function (req,res,next) {
	let token = req.clientData.gpsgaadi_token;
	cleanData(req);
	req.body.selected_uid = req.clientData.gpsgaadi_user_id;
	if (!token || !req.body.selected_uid){
		return res.status(500).send({"status":"ERROR","message":"Either the client does not have token or gpsgaadi user id"});
	}
	httPostUtil.postToSocketServerAsync(req.body,token,"/api/lmsCustomer/change_password")
		.then(function (response) {
			return res.status(response.status ==="OK"?200:500).send(response);
		}).catch(next)
});

router.post("/forgot_password_gpsgaadi",function (req,res,next) {
	let token = req.clientData.gpsgaadi_token;
	cleanData(req);
	req.body.selected_uid = req.clientData.gpsgaadi_user_id;
	if (!token || !req.body.selected_uid){
		return res.status(500).send({"status":"ERROR","message":"Either the client does not have token or gpsgaadi user id"});
	}
	httPostUtil.postToSocketServerAsync(req.body,token,"/api/lmsCustomer/forgot_password")
		.then(function (response) {
			return res.status(response.status ==="OK"?200:500).send(response);
		}).catch(next)
});

router.post("/check_password_gpsgaadi",function (req,res,next) {
	req.body.selected_uid = req.clientData.gpsgaadi_user_id;
	let token = req.clientData.gpsgaadi_token;
	cleanData(req);
	if (!token || !req.body.selected_uid){
		return res.status(500).send({"status":"ERROR","message":"Either the client does not have token or gpsgaadi user id"});
	}
	httPostUtil.postToSocketServerAsync(req.body,token,"/api/lmsCustomer/check_password")
		.then(function (response) {
			return res.status(response.status ==="OK"?200:500).send(response);
		}).catch(next)
});

router.post("/user_id_availability_gpsgaadi",function (req,res,next) {
	let token = req.clientData.gpsgaadi_token;
	cleanData(req);
	req.body.selected_uid = req.clientData.gpsgaadi_user_id;
	if (!token || !req.body.selected_uid){
		return res.status(500).send({"status":"ERROR","message":"Either the client does not have token or gpsgaadi user id"});
	}
	httPostUtil.postToSocketServerAsync(req.body,token,"/api/lmsCustomer/user_id_availability")
		.then(function (response) {
			return res.status(response.status ==="OK"?200:500).send(response);
		}).catch(next)
});

router.post("/update_user_gpsgaadi",function (req,res,next) {
	let token = req.clientData.gpsgaadi_token;
	cleanData(req);
	req.body.selected_uid = req.clientData.gpsgaadi_user_id;
	if (!token || !req.body.selected_uid){
		return res.status(500).send({"status":"ERROR","message":"Either the client does not have token or gpsgaadi user id"});
	}
	httPostUtil.postToSocketServerAsync(req.body, token,"/api/lmsCustomer/update_user")
		.then(function (response) {
			if (response.status ==="OK"){
				CustomerService.findCustomerIdAsync(req.body._id)
					.then(function (customer) {
						if (customer && customer[0]){
							let gpsgaadi = customer[0].gpsgaadi?JSON.parse(JSON.stringify(customer[0].gpsgaadi)) : {};

							if (req.body.access===true || req.body.access===false) {
								let arrayAccessHistory = (customer[0].gpsgaadi && customer[0].gpsgaadi.access_history)?customer[0].gpsgaadi.access_history :[];
								let newAccessObj = {
									access: req.body.access,
									reason: req.body.reason,
									more_info: req.body.more_info
								};
								arrayAccessHistory.push(newAccessObj);
								gpsgaadi.access_history = arrayAccessHistory;
							}

							let allowedUpdateKeys = ["role", "name", "mobile", "user_type",
								"email", "type", "user_id", "access","activation_date","renewal_date"];
							for (let key in req.body){
								if (allowedUpdateKeys.indexOf(key)>-1) {
									gpsgaadi[key] = req.body[key];
								}
							}

							delete gpsgaadi._id;

							CustomerService.updateCustomerIdAsync(req.body._id,
								{
									"gpsgaadi":gpsgaadi
								})
								.then(function (updated) {
									return res.status(200).send(response);
								}).catch(next)
						}else{
							return res.status(500).send({"status":"ERROR","message":"Customer not found"});
						}
					});

			}else{
				return res.status(500).send(response);
			}
		}).catch(next)
});

router.post('/deleteConfig/:_id', async function (req, res, next) {
	try {

		let _id =  req.params._id || false;
		let foundData, key = req.body.key;

		if(!_id)
			throw new Error('Mandatory fields required');
		if(!key)
			throw new Error('Mandatory fields required');

		if(req.body.type === 'customer')
			foundData =	await customerModel.findOne({_id: _id}).lean();



		if(!(foundData && foundData._id))
			return res.status(500).json({
				'status': 'OK',
				'message': 'Customer Not Found',
			});

		await customerModel.updateOne({_id: _id}, {
			$unset: {
				[`configs.${key}`]: ''
			}
		});
		await schemaConfigModel.updateOne({'customer': _id}, {
			$set: {
				deleted: true
			}
		});

		await logsService.add('schemaconfigurations', {
			uif: req.body.type,
			category: 'delete',
			nData: {},
			oData: JSON.parse(JSON.stringify(req.body)),
		}, req);


		return res.status(200).json({
			'status': 'OK',
			'message': 'Config deleted',
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

let generateCustomerXMLData = function(customer){
        let dataIDOC = XmlJsonMappingService.prepareCustomerXMLJsonData(customer);
        let dataToSave = {clientId:customer.clientId,data:dataIDOC};
        let customerXMLJsonDataToSave = new CustomerXMLJsonModel(dataToSave);
        return customerXMLJsonDataToSave.saveAsync();
};

module.exports = router;
