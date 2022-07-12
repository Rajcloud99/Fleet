

let router = express.Router();
let billingPartyService = promise.promisifyAll(commonUtil.getService('billingParty'));
let billingPartyModel = commonUtil.getModel('billingparty');
let customerModel = commonUtil.getModel('customer');
let tripGRModel = commonUtil.getModel('tripGr');
let CustomerService = commonUtil.getService('customer');
let Consignor_nee = commonUtil.getModel('consignor_consignee');
let Consignor_neeService = promise.promisifyAll(commonUtil.getService('consignor_consignee'));
let schemaConfigModel = commonUtil.getModel('SchemaConfiguration');
let logsService = commonUtil.getService('logs');
let Async = require('async');

router.post("/add",
	async function(req,res,next){

	try {

		let oBParty = await billingPartyModel.findOne({name: new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId});

		if(oBParty)
			throw new Error('This billing party name already exists. Please choose a different name');

		if(req.body.account){
			let foundAccount = await billingPartyModel.findOne({account: mongoose.Types.ObjectId(req.body.account._id), clientId: req.user.clientId},{name:1});
			if(foundAccount)
				throw new Error(`Account already link with Billing Party${foundAccount.name}`);
		}

		if(req.body.isCustomer){
			let oCustomer = await customerModel.findOne({name: new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId});

			if(oCustomer)
				throw new Error('This Customer name already exists. Please choose a different name');
		}

		if(req.body.isConsignor){
			let oConsignor = await Consignor_nee.findOne({name: new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId, type: 'Consignor'});

			if(oConsignor)
				throw new Error('This Consignor name already exists. Please choose a different name');
		}

		if(req.body.isConsignee){
			let oConsignee = await Consignor_nee.findOne({name: new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId, type: 'Consignee'});

			if(oConsignee)
				throw new Error('This Consignee name already exists. Please choose a different name');
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

	async function(req,res,next) {
	try {
		let customer;
		req.body.created_at = Date.now();
		req.body.last_modified_at = Date.now();
		req.body.clientId =  req.user.clientId;
		let oFilter = {
			clientId: req.user.clientId,
			name: req.body.name,
		};
		let custFilter = {
			created_at: req.body.created_at,
	    	clientId: req.body.clientId,
			name: req.body.name,
			gstin_no : req.body.gstin,
			gstin_registered: true,
			deleted: false,
			status: "Active",
			state_code : req.body.state_code,
			address : {
				"line1": req.body.address,
				"line2": req.body.address2,
				"state": req.body.state_name,
			}
		};
		let congiFilter = {
			created_at: req.body.created_at,
			clientId: req.body.clientId,
			name: req.body.name,
			state:  req.body.state_name,
			gstin: req.body.gstin,
			address: req.body.address,
			businessLocation: req.body.businessLocation,
		};

		let billingParty = await billingPartyModel.findOneAndUpdate(oFilter, {$set: req.body}, {
			new: true,
			upsert: true
		});


		if(req.body.isCustomer){
			customer = await CustomerService.addCustomerV2(custFilter);

			await billingPartyModel.updateOne({_id: billingParty._id},{$set:{customer:customer._id}});

		}
		if(req.body.isConsignor){
			congiFilter.type = 'Consignor';
			// congiFilter.customer = customer._id;
			let Consignor = await Consignor_nee.findOneAndUpdate(congiFilter, {$set: congiFilter}, {
				new: true,
				upsert: true
			});
		}
		if(req.body.isConsignee){
			congiFilter.type = 'Consignee';
			// congiFilter.customer = customer._id;
			let Consignee = await Consignor_nee.findOneAndUpdate(congiFilter, {$set: congiFilter}, {
				new: true,
				upsert: true
			});
		}

		return res.status(200).json({"status":"OK",
			"message":"Billing Party has been added successfully",
			"data":billingParty
		});

	}catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
	}

	// function(req,res,next) {
	// 	req.body.created_at = Date.now();
	// 	req.body.last_modified_at = Date.now();
	// 	billingPartyService.addBillingPartyAsync(req.body)
	// 		.then(function(billingParty){
	// 			return res.status(200).json({"status":"OK",
	// 				"message":"Billing Party has been added successfully",
	// 				"data":billingParty
	// 			});
	// 		}).catch(next)
	// }
);
const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

router.get('/get', function(req, res, next) {
	req.query.clientId = req.user.clientId;
	billingPartyService.searchbillingPartyAsync(req.query, false)
		.then(function(data) {

			if (req.query.download) {
				ReportExelService.billingPartyReports(data.data, req.user, function(data){
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			}else if(data && data.data && data.data[0]) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Billing Parties found!!',
					'data': data.data,
					'count': data.count,
					'pages': data.pages
				})
			}
			else{
				return res.status(200).json({
					'status': 'OK',
					'message': 'No Billing Parties found',
					'data':data

				})
			};
		}).catch(next);
});


router.get('/get/trim', function(req, res, next) {
	billingPartyService.searchbillingPartyAsync(req.query, true)
		.then(function(data) {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Billing Parties found',
				'data': data.billingParty
			});
		}).catch(next);
});

router.put('/update/:_id',
	async function(req,res,next){

		try {

			if(!req.params._id) {
				throw new Error('Mandatory Feild required for Update Billing Party');
			}

			let oBParty = await billingPartyModel.findOne({_id: {$ne: req.params._id}, name: new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId});

			if(oBParty)
				throw new Error('This billing party name already exists. Please choose a different name');

			let foundBParty = await billingPartyModel.findOne({_id:  req.params._id, clientId: req.user.clientId});

			if(!foundBParty)
				throw new Error('Billing Party does not exist');

			if(req.body.isCustomer && !foundBParty.isCustomer){
				let oCustomer = await customerModel.findOne({name: new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId});

				if(oCustomer)
					throw new Error('This Customer name already exists. Please choose a different name');
			}

			if(req.body.isConsignor && !foundBParty.isConsignor){
				let oConsignor = await Consignor_nee.findOne({name: new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId, type: 'Consignor'});

				if(oConsignor)
					throw new Error('This Consignor name already exists. Please choose a different name');
			}

			if(req.body.isConsignee && !foundBParty.isConsignee){
				let oConsignee = await Consignor_nee.findOne({name: new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i'), clientId: req.user.clientId, type: 'Consignee'});

				if(oConsignee)
					throw new Error('This Consignee name already exists. Please choose a different name');
			}

			req.body.BP = foundBParty;

			return next();

		}catch (e) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': e.toString(),
				'data': e
			});
		}
	},

	async function(req,res,next) {
		try {
			let customer;
			req.body.last_modified_at = Date.now();
			req.body.clientId =  req.user.clientId;
			let oFilter = {
				clientId: req.user.clientId,
				_id: req.params._id,
			};

			let custFindFilter = {
				clientId: req.body.clientId,
				name: req.body.BP.name
			};

			let custUpdateFilter = {
				last_modified_at : new Date(),
				last_modified_by: req.user._id,
				last_modified_by_name: req.user.full_name,
				clientId: req.body.clientId,
				name: req.body.name,
				gstin_no : req.body.gstin,
				gstin_registered: true,
				state_code : req.body.state_code,
				address : {
					"line1": req.body.address,
					"line2": req.body.address2,
					"state": req.body.state_name,
				}
			};

			let congiFindFilter = {
				clientId: req.body.clientId,
				name: req.body.BP.name
			};

			let congiUpdateFilter = {
				last_modified_at : new Date(),
				last_modified_by: req.user._id,
				last_modified_by_name: req.user.full_name,
				clientId: req.body.clientId,
				name: req.body.name,
				state:  req.body.state_name,
				gstin: req.body.gstin,
				address: req.body.address,
				businessLocation: req.body.businessLocation,
			};

			let billingParty = await billingPartyModel.findOneAndUpdate(oFilter, {$set: req.body}, {
				new: true,
				upsert: true
			});


			if(req.body.isCustomer && !req.body.BP.isCustomer){
				customer = await CustomerService.addCustomerV2(custUpdateFilter);

				await billingPartyModel.updateOne({_id: billingParty._id},{$set:{customer:customer._id}});

			}else if(req.body.isCustomer && req.body.BP.isCustomer){

				 customer = await customerModel.findOneAndUpdate(custFindFilter, {$set: custUpdateFilter}, {
					new: true,
					upsert: true
				});
			}

			if(req.body.isConsignor){
				congiFindFilter.type = 'Consignor';
				// congiFindFilter.customer = customer._id;
				let Consignor = await Consignor_nee.findOneAndUpdate(congiFindFilter, {$set: congiUpdateFilter}, {
					new: true,
					upsert: true
				});
			}

			if(req.body.isConsignee){
				congiFindFilter.type = 'Consignee';
				// congiFindFilter.customer = customer._id;
				let Consignee = await Consignor_nee.findOneAndUpdate(congiFindFilter, {$set: congiUpdateFilter}, {
					new: true,
					upsert: true
				});
			}

			return res.status(200).json({"status":"OK",
				"message":"Billing Party has been Updated successfully",
				"data":billingParty
			});

		}catch (e) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': e.toString(),
				'data': e
			});
		}
	}

	// async function(req, res, next) {
	// 	if(otherUtil.isEmptyObject(req.body)) {
	// 		return res.status(500).json({'status': 'ERROR', 'error_message': 'Nothing in body for Consignor update'});
	// 	}
	// 	let duplicateAc;
	// 	let dupFilter={};
	// 	if(req.body.name){
	// 		dupFilter.name = new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i');
	// 	}
	// 	if(Object.keys(dupFilter).length>0){//check duplicacy for name
	// 		dupFilter.clientId = req.user.clientId || req.body.clientId;
	// 		duplicateAc = await billingPartyModel.find(dupFilter,{name:1}).lean();
	// 		if (duplicateAc) {
	// 			for (let i = 0; i < duplicateAc.length; i++) {
	// 				if(duplicateAc[i]._id.toString() !== req.params._id.toString()){
	// 					return res.status(500).json({"status":"ERROR","message":"This name already exists can't update it."});
	// 				}
	// 			}
	// 		}
	// 	}
	// 	billingPartyService.findbillingPartyIdAsync({_id: req.params._id})
	// 		.then(function(billingParty) {
	// 			if(billingParty && billingParty[0]) {
	// 				req.billingPartyData = JSON.parse(JSON.stringify(billingParty[0]));
	// 				return next();
	// 			} else {
	// 				return res.status(500).json({'status': 'ERROR', 'error_message': 'Billing Party does not exist'});
	// 			}
	// 		});
	// },

	// async function(req, res, next) {
	// 	billingPartyService.updatebillingPartyIdAsync(req.params._id, req.body)
	// 		.then(function(updated) {
	// 			return res.status(200).json({
	// 				'status': 'OK',
	// 				'message': 'billingParty data has been updated successfully',
	// 				'data': updated
	// 			});
	// 		}).catch(next);
	// }
);

router.delete("/delete/:_id",function(req,res,next) {
	if (otherUtil.isEmptyObject(req.params)) {
		return res.status(500).json({"status": "ERROR", "message": "No id provided to delete for billingparty"});
	}

	billingPartyService.findbillingPartyIdAsync(req.params._id)
		.then(async function (billing) {
			if (billing && billing[0]) {
                let GR  = await tripGRModel.findOne({billingParty:mongoose.Types.ObjectId(req.params._id)},{billingParty:1});
				if(GR){
					return res.status(500).json({'status': 'ERROR', 'error_message': 'Billing Party exist on gr you can not delete'});
				}else{
					return next();
				}
			} else {
				return res.status(500).json({'status': 'ERROR', 'error_message': 'Billing Party does not exist'});
			}
		}).catch(next);
		},
		function (req,res,next) {
		billingPartyService.deletebillingPartyIdAsync(req.params._id)
			.then(function(deleted){
				return res.status(200).json({"status":"OK",
					"message":"billingParty has been deleted successfully",
					"data":deleted});
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

		if(req.body.type === 'billingParty')
			foundData =	await billingPartyModel.findOne({_id: _id}).lean();



		if(!(foundData && foundData._id))
			return res.status(500).json({
				'status': 'OK',
				'message': 'BillingParty Not Found',
			});

		await billingPartyModel.updateOne({_id: _id}, {
				$unset: {
					[`configs.${key}`]: ''
				}
			});
		await schemaConfigModel.updateOne({'billingParty': _id}, {
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


module.exports = router;
