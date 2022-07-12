const router = express.Router();
const Joi = require('joi');
const moneyReceiptService = commonUtil.getService('moneyReceipt');
const MoneyReceipt = commonUtil.getModel('moneyReceipt');
const billStationaryService = commonUtil.getService('billStationary');
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

router.post('/get', async function (req, res, next) {

	try {

		let data = req.body.populate ? await moneyReceiptService.findPop(req.body, req.user) : await moneyReceiptService.find(req.body, req.user);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Data found.',
			'data': data
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}

});

router.post('/add', async function (req, res, next) {
	try {

		// validating request body
		await validateRequest(req, 'add');

		let foundMoneyReceipt = await MoneyReceipt.findOne({
			mrNo: req.body.mrNo
		},{_id: 1}).lean();

		if(foundMoneyReceipt && foundMoneyReceipt._id){
			throw new Error('Money Receipt No already used');
		}

		if (!req.body.stationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: req.body.mrNo,
				type: 'Cash Receipt',
				clientId: req.body.clientId
			});

			if (foundStationary) {
				req.body.stationaryId = foundStationary._id;
			}
		}

		let data = await moneyReceiptService.add({
			...req.body,
			createdBy: req.user.full_name,
			lastModifiedBy: req.user.full_name
		}, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Money Receipt Successfully Created',
			data
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.put('/edit/:_id', async function (req, res, next) {
	try {

		// validating request body
		await validateRequest(req, 'edit');

		// if(await moneyReceiptService.isVchGen(req.params._id))
		// 	throw new Error('Edit not Possible. Voucher is Imported to Account');

		if (!req.body.stationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: req.body.mrNo,
				type: 'Cash Receipt',
				clientId: req.body.clientId
			});

			if (foundStationary) {
				req.body.stationaryId = foundStationary._id;
			}
		}

		let data = await moneyReceiptService.edit(req.params._id, req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Money Receipt Successfully Updated',
			data
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.delete('/remove/:_id', async function (req, res, next) {
	try {

		// validating request body
		await validateRequest(req, 'remove');

		if(await moneyReceiptService.isVchGen(req.params._id))
			throw new Error('Remove not Possible. Voucher is Imported to Account');

		let data = await moneyReceiptService.remove(req.params._id, {
			...req.body,
			userName: req.user.full_name
		}, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Money Receipt Successfully Removed',
			data
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.route('/pullVoucher/:_id').post(async function (req, res, next) {

	try {

		// validating request body
		await validateRequest(req, 'pullVch');

		let _id = req.params._id;

		if(!_id)
			throw new Error('Mandatory Fields are required');

		await moneyReceiptService.pullVoucher(_id, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Voucher Successfully Pulled'
		});

	}catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/mrDeductionReport', async function(req, res, next){
	try{
		let data = await moneyReceiptService.mrDeduction(req.body);
		if (req.body.download ) {
			ReportExelService.mrDeductionReport(data, req.body.start_date, req.body.end_date, req.user.clientId, function (d) {
				return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					}
				);
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found....',
				'data': data
			});
		}
	}
	catch(err){
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.post('/mrDeductionBillingPartyWiseReport', async function(req, res, next){
	try{
		let data = await moneyReceiptService.mrBillingPartyWiseDeductionReport(req.body);
		if (req.body.download ) {
			ReportExelService.mrBillingPartyWiseDeductionReport(data, req.body.to_date, req.body.from_date, req.user.clientId, function (d) {
				return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					}
				);
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found....',
				'data': data
			});
		}
	}
	catch(err){
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.post('/mrDeductionMonthlyReport', async function(req, res, next){
	try{
		let data = await moneyReceiptService.mrMonthlyDeductionReport(req.body);
		if (req.body.download ) {
			ReportExelService.mrMonthlyDeductionReport(data, req.body.to_date, req.body.from_date, req.user.clientId, function (d) {
				return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					}
				);
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found....',
				'data': data
			});
		}
	}
	catch(err){
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.post('/addV2', async function (req, res, next) {
	try {

		// validating request body
		// await validateRequest(req, 'add');

		let foundMoneyReceipt = await MoneyReceipt.findOne({
			mrNo: req.body.mrNo
		},{_id: 1}).lean();

		if(foundMoneyReceipt && foundMoneyReceipt._id){
			throw new Error('Money Receipt No already used');
		}

		if (!req.body.stationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: req.body.mrNo,
				type: 'Cash Receipt',
				clientId: req.body.clientId
			});

			if (foundStationary) {
				req.body.stationaryId = foundStationary._id;
			}
		}

		let data = await moneyReceiptService.addV2({
			...req.body,
			createdBy: req.user.full_name,
			lastModifiedBy: req.user.full_name
		}, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Money Receipt Successfully Created',
			data
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.put('/editV2/:_id', async function (req, res, next) {
	try {

		// validating request body
		// await validateRequest(req, 'edit');

		// if(await moneyReceiptService.isVchGen(req.params._id))
		// 	throw new Error('Edit not Possible. Voucher is Imported to Account');

		if (!req.body.stationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: req.body.mrNo,
				type: 'Cash Receipt',
				clientId: req.body.clientId
			});

			if (foundStationary) {
				req.body.stationaryId = foundStationary._id;
			}
		}

		let data = await moneyReceiptService.editV2(req.params._id, req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Money Receipt Successfully Updated',
			data
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

// function Definition
async function validateRequest({body, params}, schemaType) {

	try {

		const addSchema = {
			body: Joi.object().keys({
				'mrNo': Joi.string().required(),
				'date': Joi.date().iso().required(),
				'narration': Joi.string().allow('').optional(),
				'branch': Joi.string().required(),
				'billingParty': Joi.string().required(),
				'bpNam': Joi.string().required(),
				'paymentMode': Joi.string(),
				// 'paymentRef': Joi.string().allow('').optional(),
				'paymentDate': Joi.string(),
				'bpAcc': Joi.string().required(),
				'bpAccNam': Joi.string().required(),
				'bankAccount': Joi.string().required(),
				'bankAccountName': Joi.string().required(),
				'tdsAccount': Joi.string().when('totTdsAmount', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				'tdsAccountName': Joi.string().when('totTdsAmount', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				'extChargeAccount': Joi.string().when('totExtChargeAmount', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				'extChargeAccountName': Joi.string().when('totExtChargeAmount', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				// 'dedAcc': Joi.string().when('totBillDedReceiving', {
				// 	is: Joi.number().greater(0),
				// 	then: Joi.string().required(),
				// }),
				// 'dedAccNam': Joi.string().when('totBillDedReceiving', {
				// 	is: Joi.number().greater(0),
				// 	then: Joi.string().required(),
				// }),
				'adjAcc': Joi.string().when('adjAmt', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				'adjAccNam': Joi.string().when('adjAmt', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				'totTdsAmount': Joi.number().required(),
				'totExtChargeAmount': Joi.number().required(),
				'receiving': Joi.array().items(Joi.object().keys({
					billNo: Joi.string().allow('').optional(),
					billRef: Joi.string().allow('').optional(),
					grNumber: Joi.string().allow('').optional(),
					grRef: Joi.string().allow('').optional(),
					bP: Joi.string().allow('').optional(),
					bpNam: Joi.string().allow('').optional(),
					bpAcc: Joi.string().allow('').optional(),
					bpAccNam: Joi.string().allow('').optional(),
					totReceived: Joi.number().required(),
					deduction: Joi.array().items(Joi.object().keys({
						type: Joi.string().required(),
						amount: Joi.number().required(),
						remark: Joi.string().allow('').optional()
					}).pattern(/./, Joi.any()))
				}).pattern(/./, Joi.any())),
			}).pattern(/./, Joi.any())
		};

		const editSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required()
			}).pattern(/./, Joi.any()),
			body: Joi.object().keys({
				'mrNo': Joi.string().required(),
				'date': Joi.date().iso().required(),
				'branch': Joi.string().required(),
				'narration': Joi.string().allow('').optional(),
				'billingParty': Joi.string().required(),
				'bpNam': Joi.string().required(),
				'paymentMode': Joi.string(),
				// 'paymentRef': Joi.string().allow('').optional(),
				'paymentDate': Joi.string(),
				'bpAcc': Joi.string().required(),
				'bpAccNam': Joi.string().required(),
				'bankAccount': Joi.string().required(),
				'bankAccountName': Joi.string().required(),
				'tdsAccount': Joi.string().when('totTdsAmount', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				'tdsAccountName': Joi.string().when('totTdsAmount', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				'extChargeAccount': Joi.string().when('totExtChargeAmount', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				'extChargeAccountName': Joi.string().when('totExtChargeAmount', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				// 'dedAcc': Joi.string().when('totBillDedReceiving', {
				// 	is: Joi.number().greater(0),
				// 	then: Joi.string().required(),
				// }),
				// 'dedAccNam': Joi.string().when('totBillDedReceiving', {
				// 	is: Joi.number().greater(0),
				// 	then: Joi.string().required(),
				// }),
				'adjAcc': Joi.string().when('adjAmt', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				'adjAccNam': Joi.string().when('adjAmt', {
					is: Joi.number().greater(0),
					then: Joi.string().required(),
				}),
				'totTdsAmount': Joi.number().required(),
				'totExtChargeAmount': Joi.number().required(),
				'receiving': Joi.array().items(Joi.object().keys({
					billNo: Joi.string().allow('').optional(),
					billRef: Joi.string().allow('').optional(),
					grNumber: Joi.string().allow('').optional(),
					grRef: Joi.string().allow('').optional(),
					bP: Joi.string().allow('').optional(),
					bpNam: Joi.string().allow('').optional(),
					bpAcc: Joi.string().allow('').optional(),
					bpAccNam: Joi.string().allow('').optional(),
					totReceived: Joi.number().required(),
					deduction: Joi.array().items(Joi.object().keys({
						type: Joi.string().required(),
						amount: Joi.number().required(),
						remark: Joi.string().allow('').optional()
					}).pattern(/./, Joi.any()))
				}).pattern(/./, Joi.any())),
			}).pattern(/./, Joi.any())
		};

		const removeSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required()
			}).unknown(true),
		};

		let ptr;

		if (schemaType === 'add')
			ptr = addSchema;
		else if (schemaType === 'edit')
			ptr = editSchema;
		else if (schemaType === 'remove')
			ptr = removeSchema;
		else if (schemaType === 'pullVch')
			ptr = removeSchema;
		else
			throw new Error('Invalid Type');

		const schema = {
			params: Joi.object().pattern(/./, Joi.any()),
			body: Joi.object().pattern(/./, Joi.any()),
			...ptr
		};

		await Joi.validate({body, params}, schema);

		return true;

	} catch (e) {
		console.log(e);
		throw new Error('Mandatory Feilds are required.');
	}
}
