'use strict';

let mongoose = require('mongoose');
let Dues = commonUtil.getModel('dues');
const validate = require('express-validation');
let SchemaConfiguration = commonUtil.getModel('SchemaConfiguration');
let ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
let voucherService = promise.promisifyAll(commonUtil.getService('accountsVoucher'));
let VoucherServiceV2 = commonUtil.getService('voucher');
const billStationaryService = commonUtil.getService('billStationary');
var serverSidePagination = promise.promisifyAll(require('../../utils/serverSidePagination'));
let moment = require('moment');
let Accounts = commonUtil.getModel('accounts');
const ExcelReader = require('../../utils/ExcelReader');
let locationService = promise.promisifyAll(commonUtil.getService('location'));
let Pagination = promise.promisify(otherUtil.findPagination);

const ALLOWED_FILTER =['refNo', 'duesType', 'veh', 'branch', 'from', 'to', 'account', 'invoiceNo', 'purchaseBill', 'clientId'];

function constructFilters(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				// if (!oQuery.dateType || oQuery.dateType === 'date') {
					oFilter[oQuery.dateType || 'date'] = oFilter[oQuery.dateType || 'date'] || {};
					oFilter[oQuery.dateType || 'date'].$gte = startDate;
				// }
			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				// if (!oQuery.dateType || oQuery.dateType === 'date') {
					oFilter[oQuery.dateType || 'date'] = oFilter[oQuery.dateType || 'date'] || {};
					oFilter[oQuery.dateType || 'date'].$lte = endDate;
				// }
			}
			else if (i === 'branch') {
				oFilter[i] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			}
			else if (i === 'veh') {
				oFilter['aVehCollection.veh'] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			}
			else if(i==='account'){
				if(typeof oQuery[i] === "string"){
					oFilter.$or = [{from_account:mongoose.Types.ObjectId(oQuery[i])},
						{to_account:mongoose.Types.ObjectId(oQuery[i])}];
				}
			}
			else if (i === 'duesType') {
				if(oQuery[i] instanceof Array){
					oFilter[i] = {$in:oQuery[i]}
				}else{
					oFilter[i] = oQuery[i];
				}
			}
			else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

async function add(req, res, next) {
	try {

		let oRes = {
				status: "OK",
				message: 'Dues Added Successfully'
			},
			 body = req.body;

		// validate refNo and mark it used
		let refNo = body.refNo.trim();
		let stationaryId = body.stationaryId;

		if(!refNo)
			throw new Error('Mandatory fields are required');
		if(!body.duesType)
			throw new Error('Mandatory fields are required');
		if(!body.branch)
			throw new Error('Mandatory fields are required');
		if(!body.from_account)
			throw new Error('Mandatory fields are required');
		if(!body.to_account)
			throw new Error('Mandatory fields are required');
		if(!body.amount)
			throw new Error('Mandatory fields are required');

		let prepareDuesObj = {
			...req.body,
			clientId: req.user.clientId,
			created_at: new Date(),
			created_by: req.user._id,
			refNo: req.body.refNo,
			date: req.body.date || new Date(),
			amount: req.body.amount,
			from_account: req.body.from_account,
			to_account: req.body.to_account
		};

		if (refNo) {
			let foundVoucher = await Dues.findOne({
				refNo
			});

			if (foundVoucher && foundVoucher._id)
				throw new Error(`Dues with Ref. No. ${refNo} already exists.`);

			if (!stationaryId) {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: refNo,
					type: 'Ref No',
					clientId: req.user.clientId
				});

				if (foundStationary) {
					prepareDuesObj.stationaryId = stationaryId = foundStationary._id;
				}
			}

			if (stationaryId && (await billStationaryService.isUsed(stationaryId)))
				throw new Error('Ref No already used');
		}


		if (req.body.duesType) {
			prepareDuesObj.voucher = mongoose.Types.ObjectId();
			let aLedger = [];

			if(body.iGST){
				if(!body.iGSTAccount)
					throw new Error('IGST A/c not Defined');

				let fName = await Accounts.findOne({_id: body.iGSTAccount}, {name: 1, ledger_name: 1}).lean();
				body.iGSTAccountName = fName.ledger_name || fName.name;
			}

			if(body.cGST){
				if(!body.cGSTAccount)
					throw new Error('CGST A/c not Defined');

				let fName = await Accounts.findOne({_id: body.cGSTAccount}, {name: 1, ledger_name: 1}).lean();
				body.cGSTAccountName = fName.ledger_name || fName.name;
			}

			if(body.sGST){
				if(!body.sGSTAccount)
					throw new Error('SGST A/c not Defined');

				let fName = await Accounts.findOne({_id: body.sGSTAccount}, {name: 1, ledger_name: 1}).lean();
				body.sGSTAccountName = fName.ledger_name || fName.name;
			}

			aLedger.push({
				account: body.from_account,
				lName: body.fromAcName,
				amount: body.amount,
				cRdR: 'CR',
				bills:  [{
					billNo: body.refNo,
					billType: 'New Ref',
					amount: body.amount,
					remAmt: body.amount
				}]
			});


			if(body.tdsAmt)
				aLedger.push({
					account: body.tdsAccount,
					lName: body.tdsAccountName,
					amount: body.tdsAmt,
					cRdR: 'CR',
					bills:  []
				});

			aLedger.push({
				account: body.to_account,
				lName: body.toAcName,
				amount: body.amt,
				cRdR: 'DR',
				bills: []
			});

			if(body.prepaidAmt){
				aLedger.push({
					account: body.prepaidAcc,
					lName: body.prepaidAccName,
					amount: body.prepaidAmt,
					cRdR: 'DR',
					bills: []
				});
			}

			if(body.cGST){
				aLedger.push({
					account: body.cGSTAccount,
					lName: body.cGSTAccountName,
					amount: body.cGST,
					cRdR: 'DR',
					bills: []
				});
			}

			if(body.sGST){
				aLedger.push({
					account: body.sGSTAccount,
					lName: body.sGSTAccountName,
					amount: body.sGST,
					cRdR: 'DR',
					bills: []
				});
			}

			if(body.iGST){
				aLedger.push({
					account: body.iGSTAccount,
					lName: body.iGSTAccountName,
					amount: body.iGST,
					cRdR: 'DR',
					bills: []
				});
			}

			// if(body.tPiGST){
			// 	aLedger.push({
			// 		account: body.tPiGSTAcc,
			// 		lName: body.tPiGSTAccName,
			// 		amount: body.tPiGST,
			// 		cRdR: 'DR',
			// 		bills: []
			// 	});
			// }
			// if(body.tPcGST){
			// 	aLedger.push({
			// 		account: body.tPcGSTAcc,
			// 		lName: body.tPcGSTAccName,
			// 		amount: body.tPcGST,
			// 		cRdR: 'DR',
			// 		bills: []
			// 	});
			// }
			// if(body.tPsGST){
			// 	aLedger.push({
			// 		account: body.tPsGSTAcc,
			// 		lName: body.tPsGSTAccName,
			// 		amount: body.tPsGST,
			// 		cRdR: 'DR',
			// 		bills: []
			// 	});
			// }


			let oVoucher = {
				_id: prepareDuesObj.voucher,
				type: 'Journal',
				clientId: req.user.clientId,
				vT: prepareDuesObj.duesType,
				refNo: prepareDuesObj.refNo,
				stationaryId: prepareDuesObj.stationaryId,
				isEditable: false,
				narration: prepareDuesObj.narration,
				date: prepareDuesObj.date,
				createdBy: req.body.created_by_name,
				branch:prepareDuesObj.branch,
				ledgers: aLedger
			};

			let Vch = await VoucherServiceV2.addVoucherAsync(oVoucher);

		}


		let oFilter = {
			clientId: req.user.clientId,
			duesType: req.body.duesType,
		};
		if (req.body.refNo) {
			oFilter.refNo = req.body.refNo.trim();
		}

		let duesObj = await Dues.findOneAndUpdate(oFilter, {$set: prepareDuesObj}, {
			new: true,
			upsert: true
		});

		if (stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'dues',
				docId: advanceObj._id,
				stationaryId,
			}, 'used');
		}

		return res.status(200).json(oRes);
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
}

async function get(req, res, next) {
	try {

		let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		oQuery.queryFilter = constructFilters(oQuery);
		if (req.body.all) {
			oQuery.all = req.body.all;
		}else if(req.body.sort){
			oQuery.sort = req.body.sort;
		} else{
			oQuery.sort = {_id: -1};
		}
		oQuery.populate = [
			{path: 'voucher'},
			{path: 'vehicle'},
			{path: 'from_account'},
			{path: 'to_account'},
			{path: 'created_by'},
		];
		otherUtil.findPagination(Dues, oQuery, function (err, data) {
			if (err) {
				return res.status(500).json({
					status: 'ERROR',
					message: err.toString()
				})
			}
			if (req.body.download) {
				if(req.body.reportType === 'Insurance') {
					ReportExelService.duesInsuranceReport(data.data, req.user.clientId, function (data) {
						return res.status(200).json({
							"status": "OK",
							"message": "report download available.",
							"url": data.url
						});
					});
				}else if(req.body.reportType === 'Permit'){
					ReportExelService.duesPermitReport(data.data, req.user.clientId, function (data) {
						return res.status(200).json({
							"status": "OK",
							"message": "report download available.",
							"url": data.url
						});
					});
				}else {
					ReportExelService.duesReport(data.data, req.user.clientId, function (data) {
						return res.status(200).json({
							"status": "OK",
							"message": "report download available.",
							"url": data.url
						});
					});
				}
			}else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Dues Data found',
					'data': data
				});
			}
		})
	} catch (err) {
		throw err;
	}
}

// async function validateRequest({body, params}, schemaType) {
//
// 	try {
//
// 		const addSchema = {
// 			body: Joi.object().keys({
// 				'branch': Joi.string().required(),
// 				'refNo': Joi.string().required(),
// 				'date': Joi.date().iso().required(),
// 				'narration': Joi.string().default(''),
// 				'stationaryId': Joi.any(),
// 				'paymentMode': Joi.string(),
// 				'paymentRef': Joi.string(),
// 				'paymentDate': Joi.string(),
// 				'ledgers': Joi.array().items(Joi.object().keys({
// 					account: Joi.string().required(),
// 					lName: Joi.string().required(),
// 					amount: Joi.number().required(),
// 					cRdR: Joi.string().required(),
// 				}).pattern(/./, Joi.any())).min(1).required(),
// 				'gr': Joi.array().items(Joi.object().keys({
// 					amt: Joi.number().required(),
// 				}).pattern(/./, Joi.any())).min(1).required(),
// 			}).pattern(/./, Joi.any())
// 		};
//
// 		const editSchema = {
// 			params: Joi.object().keys({
// 				_id: Joi.string().required()
// 			}).pattern(/./, Joi.any()),
// 			body: Joi.object().keys({
// 				'branch': Joi.string().required(),
// 				'refNo': Joi.string().required(),
// 				'date': Joi.date().iso().required(),
// 				'narration': Joi.string().default(''),
// 				'stationaryId': Joi.any(),
// 				'paymentMode': Joi.string(),
// 				'paymentRef': Joi.string(),
// 				'paymentDate': Joi.string(),
// 				'ledgers': Joi.array().items(Joi.object().keys({
// 					account: Joi.string().required(),
// 					lName: Joi.string().required(),
// 					amount: Joi.number().required(),
// 					cRdR: Joi.string().required(),
// 				}).pattern(/./, Joi.any())).min(1).required(),
// 				'gr': Joi.array().items(Joi.object().keys({
// 					amt: Joi.number().required(),
// 				}).pattern(/./, Joi.any())).min(1).required(),
// 			}).pattern(/./, Joi.any())
// 		};
//
// 		const removeSchema = {
// 			params: Joi.object().keys({
// 				_id: Joi.string().required()
// 			}).unknown(true),
// 		};
//
// 		let ptr;
//
// 		if (schemaType === 'add')
// 			ptr = addSchema;
// 		else if (schemaType === 'edit')
// 			ptr = editSchema;
// 		else if (schemaType === 'remove')
// 			ptr = removeSchema;
// 		else
// 			throw new Error('Invalid Type');
//
// 		const schema = {
// 			params: Joi.object().pattern(/./, Joi.any()),
// 			body: Joi.object().pattern(/./, Joi.any()),
// 			...ptr
// 		};
//
// 		await Joi.validate({body, params}, schema);
//
// 		return true;
//
// 	} catch (e) {
// 		console.log(e);
// 		throw new Error('Mandatory Feilds are required.');
// 	}
// }



module.exports = {
	add,
	get
};
