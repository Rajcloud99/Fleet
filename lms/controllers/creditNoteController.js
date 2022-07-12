const billStationaryService = commonUtil.getService('billStationary');
const CreditNote = commonUtil.getModel('creditNote');
const creditNoteService = commonUtil.getService('creditNote');
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
let BillNew = commonUtil.getModel('bills');
const Joi = require('joi');
const router = express.Router();

router.post('/get', async function (req, res, next) {

	try {

		//let data = await creditNoteService.find(req.body, req.user);
		creditNoteService.find(req.body, req.user, req)
		.then(function (data) {
			if (req.body.download) {
				ReportExelService.creditNoteReportDownload(data.data, req.user.clientId, function (data) {
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

router.post('/crDeductionReport', async function(req, res, next){
	try{
		let data = await creditNoteService.crDeduction(req.body);
		if (req.body.download ) {
			ReportExelService.crDeductionReport(data, req.body.end_date, req.body.start_date, req.user.clientId, function (d) {
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

router.post('/add', async function (req, res, next) {
	try {

		// validating request body
		await validateRequest(req, 'add');

		let foundCreditNote = await CreditNote.findOne({
			creditNo: req.body.creditNo
		});

		if(foundCreditNote && foundCreditNote._id){
			throw new Error('Credit Note No already used');
		}

		let foundStationary = await billStationaryService.findByRefAndType({
			bookNo: req.body.creditNo,
			type: 'Credit Note',
			clientId: req.body.clientId
		});

		if (foundStationary)
			req.body.creditStationaryId = foundStationary._id;
		else
			throw new Error('Invalid Credit Note No.');

		let data = await creditNoteService.add({
			...req.body,
			createdBy: req.user.full_name,
			lastModifiedBy: req.user.full_name
		}, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Credit Note Successfully Created',
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

		if(await creditNoteService.isVchGen(req.params._id))
			throw new Error('Edit not Possible. Voucher is Generated');

		if(await creditNoteService.isActualVchGen(req.params._id))
			throw new Error('Edit not Possible. Voucher is Imported to Account');

		// let foundStationary = await billStationaryService.findByRefAndType({
		// 	bookNo: req.body.creditNo,
		// 	type: 'Credit Note',
		// 	clientId: req.body.clientId
		// });
		//
		// if (foundStationary)
		// 	req.body.creditStationaryId = foundStationary._id;
		// else
		// 	throw new Error('Invalid Credit Note No.');

		if (!req.body.creditStationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: req.body.creditNo,
				type: 'Credit Note',
				clientId: req.body.clientId
			});

			if (foundStationary) {
				req.body.creditStationaryId = foundStationary._id;
			}
		}

		let data = await creditNoteService.edit(req, {
			...req.body,
			lastModifiedBy: req.user.full_name
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Credit Note Successfully Updated',
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

		if(await creditNoteService.isVchGen(req.params._id))
			throw new Error('Edit not Possible. Voucher is Generated');

		if(await creditNoteService.isActualVchGen(req.params._id))
			throw new Error('Edit not Possible. Voucher is Imported to Account');

		let data = await creditNoteService.remove(req.params._id, {
			...req.body,
			userName: req.user.full_name
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Credit Note Successfully Removed',
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

		if(await creditNoteService.isVchGen(req.params._id))
			throw new Error('Voucher is already Approved');

		if(await creditNoteService.isActualVchGen(req.params._id))
			throw new Error('Approve not Possible. Voucher is Imported to Account');

		let data = await creditNoteService.approve(req.params._id, {
			...req.body,
			userName: req.user.full_name
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Credit Note Successfully Approved',
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

		if(!await creditNoteService.isVchGen(req.params._id))
			throw new Error('Voucher is not Approved');

		if(await creditNoteService.isActualVchGen(req.params._id))
			throw new Error('Unapprove not Possible. Voucher is Imported to Account');

		let data = await creditNoteService.unApprove(req.params._id, {
			...req.body,
			userName: req.user.full_name
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Credit Note Successfully Unapproved',
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

router.post('/dedRpt', async function (req, res, next) {
	try {

		// validating request body
		await validateRequest(req, 'rpt');

		let aData = await creditNoteService.deductionReport(req.body, req);
		ReportExelService.deductionReport(aData, {
			from: req.body.start_date,
			to: req.body.end_date
		}, req.clientId, function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Report Download available.",
				"url": data.url
			});
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/addMisc', async function (req, res, next) {
	try {


		let foundCreditNote = await CreditNote.findOne({
			creditNo: req.body.creditNo
		});

		if(foundCreditNote && foundCreditNote._id){
			throw new Error('Credit Note No already used');
		}

		let foundStationary = await billStationaryService.findByRefAndType({
			bookNo: req.body.creditNo,
			type: 'Credit Note',
			clientId: req.body.clientId
		});

		if (foundStationary)
			req.body.creditStationaryId = foundStationary._id;
		else
			throw new Error('Invalid Credit Note No.');

		let data = await creditNoteService.addMisc({
			...req.body,
			createdBy: req.user.full_name,
			lastModifiedBy: req.user.full_name
		}, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Misc Credit Note Successfully Created',
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

router.post('/editMisc/:_id', async function (req, res, next) {
	try {


		if(await creditNoteService.isVchGen(req.params._id))
			throw new Error('Edit not Possible. Voucher is Generated');

		if(await creditNoteService.isActualVchGen(req.params._id))
			throw new Error('Edit not Possible. Voucher is Imported to Account');

		if (!req.body.creditStationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: req.body.creditNo,
				type: 'Credit Note',
				clientId: req.body.clientId
			});

			if (foundStationary)
				req.body.creditStationaryId = foundStationary._id;
			else
				throw new Error('Invalid Credit Note No.');
		}

		let data = await creditNoteService.editMisc(req.params._id, {
			...req.body,
			lastModifiedBy: req.user.full_name
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Misc Credit Note Successfully Updated',
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

router.delete('/deleteMisc/:_id', async function (req, res, next) {
	try {


		if(await creditNoteService.isVchGen(req.params._id))
			throw new Error('Delete not Possible. Voucher is Generated');

		if(await creditNoteService.isActualVchGen(req.params._id))
			throw new Error('Delete not Possible. Voucher is Imported to Account');

		let data = await creditNoteService.deleteMisc(req.params._id, {
			...req.body,
			userName: req.user.full_name
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Misc Credit Note Successfully Removed',
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

router.post('/creditNoteReport', async function (req, res, next) {
	try {
		if (!(req.body.start_date && req.body.end_date)){
			throw new Error('Start Date and End date are required are required');
		}
		let startDate = new Date(req.body.start_date);
		startDate.setSeconds(0);
		startDate.setHours(0);
		startDate.setMinutes(0);
		let nextDay = new Date(req.body.end_date);
		nextDay.setHours(23);
		nextDay.setMinutes(59);
		nextDay.setSeconds(59);
		const aggQuery1 = [{
			$match:{billDate:{$gte:startDate,$lte:nextDay},
				clientId:req.user.clientId,
				cancelled : false
			}
		},
			{$project:{billNo:1,billDate:1,amount:1,billingParty:1,billAmount:1,cGST:1,sGST:1,iGST:1,status:1,"receiving.deduction":1}},
			{
				$lookup: {
					from: "billingparties",
					localField: "billingParty",
					foreignField: "_id",
					as: "billingParty"
				}
			},
			{
				"$unwind": "$billingParty"
			},
			{$sort:{billDate:1}},
			// {$unwind:"$receiving.deduction"},
			{ $unwind: { path: "$receiving.deduction", preserveNullAndEmptyArrays: true } },
			{$project:{billNo:1,billDate:1,amount:1,GST:"$billingParty.gstin",status:1,
					billingName:"$billingParty.billName",billAmount:1,cGST:1,sGST:1,iGST:1,
					creditNo:  { $ifNull: [ "$receiving.deduction.creditNo", "null" ] }
				}},
			{
				"$group": {
					"_id":  null,
					"totalApprovedBill":{$sum:{$cond:[{$eq:["$status","Approved"]},1,0]}},
					"totalWithoutGSTBill":{$sum:{$cond:[{$eq:["$amount","$billAmount"]},1,0]}},
					"totalWithoutGSTBillValue":{$sum:{$cond:[{$eq:["$amount","$billAmount"]},"$amount",0]}},
					"totalCreditNote":{$sum:{$cond:[{$eq:["$creditNo","null"]},0,1]}},
					"totalCreditNoteTaxableValue":{$sum:{$cond:[{$eq:["$creditNo","null"]},0,"$amount"]}},
					"totalCreditNoteInvoiceValue":{$sum:{$cond:[{$eq:["$creditNo","null"]},0,"$billAmount"]}},
					"totalWithGSTBillValue":{$sum:{$cond:[{$ne:["$amount","$billAmount"]},"$amount",0]}},
					"grandTotalBill":{$sum:1},
					"totalTaxableFreightValue":{$sum:"$amount"},
					"totalIGSTAmount": {"$sum": "$iGST"},
					"totalCGSTAmount": {"$sum": "$cGST"},
					"totalSGSTAmount": {"$sum": "$sGST"},
					"totalAfterTaxAmount": {"$sum": "$billAmount"},
					count:{$sum:1}
				},
			}
		]
		const aggQuery = [{
			$match:{date:{$gte:startDate,$lte:nextDay},
				clientId:req.user.clientId,
			}
		},
			{$project:{date:1,creditNo:1,amount:1,billingParty:1,totalAmount:1,cGST:1,sGST:1,iGST:1,voucher:1,billNo:1}},
			{
				$lookup: {
					from: "billingparties",
					localField: "billingParty",
					foreignField: "_id",
					as: "billingParty"
				}
			},
			{
				"$unwind": "$billingParty"
			},
			{
				$lookup: {
					from: 'vouchers',
					localField: "voucher",
					foreignField: '_id',
					as: "voucher"
				}
			},
			{$project:{date:1,creditNo:1,amount:1,GST:"$billingParty.gstin",billingName:"$billingParty.billName",
					totalAmount:1,cGST:1,sGST:1,iGST:1,billNo:1,type:"$voucher.vT"
				}},
			{$sort:{date:1}},
			{
				"$group": {
					"_id":  null,
					"data":{$push: "$$ROOT"},
					// "grandTotalBill":{$sum:1},
					// "totalAfterTaxAmount":{$sum:"$totalAmount"},
					// "totalApprovedBill":{$sum:1},
					// "totalCreditNote":{$sum:1},
					// "totalCreditNoteInvoiceValue":{$sum:"$totalAmount"},
                    // "totalCreditNoteTaxableValue":{$sum:{$cond:[{$ne:["$amount","$totalAmount"]},"$amount",0]}},
		            // "totalTaxableFreightValue":{$sum:{$cond:[{$ne:["$amount","$totalAmount"]},"$amount",0]}},
		            // "totalWithGSTBillValue":{$sum:{$cond:[{$ne:["$amount","$totalAmount"]},"$amount",0]}},
		            // "totalWithoutGSTBill":{$sum:{$cond:[{$eq:["$amount","$totalAmount"]},1,0]}},
                    // "totalWithoutGSTBillValue":{$sum:{$cond:[{$eq:["$amount","$totalAmount"]},"$amount",0]}},
		            //  "totalIGSTAmount": {"$sum": "$iGST"},
		            // "totalCGSTAmount": {"$sum": "$cGST"},
		            //  "totalSGSTAmount": {"$sum": "$sGST"},
				},
			}
		]
		let CreditData = await CreditNote.aggregate(aggQuery);
		let BillData = await BillNew.aggregate(aggQuery1);
		if(CreditData && CreditData[0]){
			CreditData[0].totalApprovedBill = BillData[0].totalApprovedBill;
			CreditData[0].totalWithoutGSTBill = BillData[0].totalWithoutGSTBill;
			CreditData[0].totalWithoutGSTBillValue = BillData[0].totalWithoutGSTBillValue;
			CreditData[0].totalCreditNote  = BillData[0].totalCreditNote;
			CreditData[0].totalCreditNoteTaxableValue = BillData[0].totalCreditNoteTaxableValue;
			CreditData[0].totalCreditNoteInvoiceValue = BillData[0].totalCreditNoteInvoiceValue;
			CreditData[0].totalWithGSTBillValue = BillData[0].totalWithGSTBillValue;
			CreditData[0].grandTotalBill = BillData[0].grandTotalBill;
			CreditData[0].totalTaxableFreightValue = BillData[0].totalTaxableFreightValue;
			CreditData[0].totalIGSTAmount = BillData[0].totalIGSTAmount;
			CreditData[0].totalCGSTAmount = BillData[0].totalCGSTAmount;
			CreditData[0].totalSGSTAmount = BillData[0].totalSGSTAmount;
			CreditData[0].totalAfterTaxAmount = BillData[0].totalAfterTaxAmount;
			CreditData[0].count = BillData[0].count;
		}
		if (req.body.download) {
			ReportExelService.creditNoteWise(CreditData[0].data, req.body.end_date, req.body.start_date, req.user.clientId, function (d) {
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
				'data': CreditData
			});
		}
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
				'creditNo': Joi.string().required(),
				'date': Joi.date().iso().required(),
				'billingParty': Joi.string().required(),
				'billNo': Joi.string().required(),
				'billRef': Joi.string().required(),
				'category': Joi.string().required(),
				'creditStationaryId': Joi.any(),
				'grs': Joi.array().items(Joi.object().keys({
					grNumber: Joi.string(),
					grRef: Joi.string(),
					deductionType: Joi.string(),
					deductionAccount: Joi.string(),
					remark: Joi.any(),
					amount: Joi.number().required()
				}).pattern(/./, Joi.any())),
			}).pattern(/./, Joi.any())
		};

		const editSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required()
			}).pattern(/./, Joi.any()),
			body: Joi.object().keys({
				'creditNo': Joi.string().required(),
				'date': Joi.date().iso().required(),
				'billingParty': Joi.string().required(),
				'billNo': Joi.string().required(),
				'billRef': Joi.string().required(),
				'category': Joi.string().required(),
				'grs': Joi.array().items(Joi.object().keys({
					grNumber: Joi.string(),
					grRef: Joi.string(),
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
