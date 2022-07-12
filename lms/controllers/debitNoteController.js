const billStationaryService = commonUtil.getService('billStationary');
const DebitNote = commonUtil.getModel('debitNote');
const debitNoteService = commonUtil.getService('debitNote');
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
let BillNew = commonUtil.getModel('bills');
const Joi = require('joi');
const router = express.Router();

router.post('/get', async function (req, res, next) {

	try {

		//let data = await creditNoteService.find(req.body, req.user);
		debitNoteService.find(req.body, req.user, req)
			.then(function (data) {
				if (req.body.download) {
					ReportExelService.debitNoteReportDownload(data.data, req.user.clientId, function (data) {
						return res.status(200).json({
							"status": "OK",
							"message": "Report Download Available.",
							"url": data.url
						});
					});
				}
				else {
					return res.status(200).json({
						'status': 'OK',
						'message': 'Data found.',
						'data': data
					});
				}
			}).catch(next);

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

		let foundDebitNote = await DebitNote.findOne({
			debitNo: req.body.debitNo
		},{debitNo:1});

		if(foundDebitNote && foundDebitNote._id){
			throw new Error('Debit Note No already used');
		}

		let foundStationary = await billStationaryService.findByRefAndType({
			bookNo: req.body.debitNo,
			type: 'Debit Note',
			clientId: req.body.clientId
		});

		if (foundStationary)
			req.body.debitStationaryId = foundStationary._id;
		else
			throw new Error('Invalid Debit Note No.');

		let data = await debitNoteService.add({
			...req.body,
			createdBy: req.user.full_name,
			lastModifiedBy: req.user.full_name
		}, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Debit Note Successfully Created',
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

		if(await debitNoteService.isVchGen(req.params._id))
			throw new Error('Edit not Possible. Voucher is Generated');

		if(await debitNoteService.isActualVchGen(req.params._id))
			throw new Error('Edit not Possible. Voucher is Imported to Account');

		// let foundStationary = await billStationaryService.findByRefAndType({
		// 	bookNo: req.body.debitNo,
		// 	type: 'Debit Note',
		// 	clientId: req.body.clientId
		// });
		//
		// if (foundStationary)
		// 	req.body.debitStationaryId = foundStationary._id;


		if (!req.body.debitStationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: req.body.debitNo,
				type: 'Debit Note',
				clientId: req.body.clientId
			});

			if (foundStationary) {
				req.body.debitStationaryId = foundStationary._id;
			}
		}

		let data = await debitNoteService.edit(req, {
			...req.body,
			lastModifiedBy: req.user.full_name
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Debit Note Successfully Updated',
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

		if(await debitNoteService.isVchGen(req.params._id))
			throw new Error('Edit not Possible. Voucher is Generated');

		if(await debitNoteService.isActualVchGen(req.params._id))
			throw new Error('Edit not Possible. Voucher is Imported to Account');

		let data = await debitNoteService.remove(req.params._id, {
			...req.body,
			userName: req.user.full_name
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Debit Note Successfully Removed',
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

router.put('/approve/:_id', async function (req, res, next) {
	try {

		// validating request body
		await validateRequest(req, 'remove');

		if(await debitNoteService.isVchGen(req.params._id))
			throw new Error('Voucher is already Approved');

		if(await debitNoteService.isActualVchGen(req.params._id))
			throw new Error('Approve not Possible. Voucher is Imported to Account');

		let data = await debitNoteService.approve(req.params._id, {
			...req.body,
			userName: req.user.full_name
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Debit Note Successfully Approved',
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

router.post('/unapprove/:_id', async function (req, res, next) {
	try {

		// validating request body
		await validateRequest(req, 'remove');

		if(!await debitNoteService.isVchGen(req.params._id))
			throw new Error('Voucher is not Approved');

		if(await debitNoteService.isActualVchGen(req.params._id))
			throw new Error('Unapprove not Possible. Voucher is Imported to Account');

		let data = await debitNoteService.unApprove(req.params._id, {
			...req.body,
			userName: req.user.full_name
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Debit Note Successfully Unapproved',
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
				'debitNo': Joi.string().required(),
				'date': Joi.date().iso().required(),
				'purBillNo': Joi.string().required(),
				'purBillRef': Joi.string().required(),
				'debitStationaryId': Joi.any(),
				'items': Joi.array().items(Joi.object().keys({
					HSNCode: Joi.string(),
					material: Joi.string(),
					deductionType: Joi.string(),
					deductionAccount: Joi.string(),
					remark: Joi.any(),
					amount: Joi.number().required(),
					totalAmount: Joi.number().required()
				}).pattern(/./, Joi.any())),
			}).pattern(/./, Joi.any())
		};

		const editSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required()
			}).pattern(/./, Joi.any()),
			body: Joi.object().keys({
				'debitNo': Joi.string().required(),
				'date': Joi.date().iso().required(),
				'purBillNo': Joi.string().required(),
				'purBillRef': Joi.string().required(),
				'grs': Joi.array().items(Joi.object().keys({
					HSNCode: Joi.string(),
					material: Joi.string(),
					deductionType: Joi.string(),
					deductionAccount: Joi.string(),
					remark: Joi.string(),
					amount: Joi.number().required()
				}).pattern(/./, Joi.any())),
			}).pattern(/./, Joi.any())
		};

		const removeSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required()
			}).unknown(true),
		};

		const rptSchema = {
			body: Joi.object().keys({
				start_date: Joi.date().iso().required(),
				end_date: Joi.date().iso().required()
			}).unknown(true),
		};

		let ptr;

		if(schemaType === 'add')
			ptr = addSchema;
		else if(schemaType === 'edit')
			ptr = editSchema;
		else if(schemaType === 'remove')
			ptr = removeSchema;
		else if(schemaType === 'rpt')
			ptr = rptSchema;
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
		throw new Error('Mandatory Fields are required.');
	}
}
