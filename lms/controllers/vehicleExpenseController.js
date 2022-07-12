let router = require('express').Router();
const Joi = require('joi');

let Accounts = commonUtil.getModel('accounts');
let Voucher = commonUtil.getModel('voucher');
const logsService = commonUtil.getService('logs');
let PurchaseBill = commonUtil.getModel('purchaseBill');
let VoucherService = commonUtil.getService('voucher');
const billStationaryService = commonUtil.getService('billStationary');

router.post('/add', async function (req, res, next) {
		try {
			let refNo;
			let stationaryType;
			//maintain Stationary
			if (Array.isArray(req.body)) {
				throw new Error('please add single voucher only');
			}
			if (!req.body || !req.body.refNo) {
				throw new Error('please provide reference no');
			}
			req.body.vT = "Vehicle Expense";
			req.body.type = "Journal";
			req.body.isEditable = false;

			// validating request body
			await validateVehExpRequest(req, 'add');

			refNo = req.body.refNo;
			let stationaryId = req.body.stationaryId;

			let oQuery = {
				refNo: new RegExp('^' + refNo.trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&') + '$'),
				clientId: req.user.clientId,
				deleted: {
					$not: {
						$eq: true
					}
				}
			};

			if (stationaryId) {
				oQuery.stationaryId = stationaryId;
			}

			let foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

			if (foundVoucher && foundVoucher[0])
				throw new Error('Voucher Already Exists');

			if (!stationaryId) {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: refNo,
					type: "Ref No",
					clientId: req.user.clientId
				});
				if (foundStationary) {
					req.body.stationaryId = foundStationary._id;
				}
			}

			let ledger = await prepareLedger(req, req.body)
			req.body.ledgers = ledger;

			next();

		} catch (e) {
			return res.status(500).json({
				"status": "ERROR",
				"message": e.toString()
			});
		}

	},
	async function (req, res, next) {
		try {
			let msg;
			req.body.createdBy = req.user.full_name;
			req.body.clientId = req.user.clientId;
			let data = await VoucherService.addVoucherAsync(req.body);
			let stationaryId = req.body.stationaryId;

			if (stationaryId) {
				await billStationaryService.updateStatus({
					userName: req.user.full_name,
					stationaryId,
				}, 'used');
			}

			if (req.body.vehicleExp && req.body.vehicleExp.purchaseBill) {
				let linkTOpurBill = await linkToPurBill(req, data)
				if (!linkTOpurBill) {
					let id = data[0].voucher._id;
					await Voucher.findOneAndUpdate({
						_id: id
					}, {
						$unset: {
							'vehicleExp.purchaseBill': 1,
							'vehicleExp.purchaseBillNo': 1
						},
					});
					msg = 'Voucher created but cant link with purchase Bill!! remaining amount should be greater than or equal to voucher amount';
				}
			}


			return res.status(200).json({
				'status': 'OK',
				'message': msg || 'Data updated.',
				'data': data
			});

		} catch (e) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': e.toString()
			})
		}
	});

router.post('/edit/:_id', async function (req, res, next) {
	try {
		let nRefNo, oPurBill, nPurBill, oAmount;
		let nStationaryId;
		let stationaryType;
		let _id = req.params._id;

		if (Array.isArray(req.body))
			throw new Error('please edit single voucher only');

		// validating request body
		await validateVehExpRequest(req, 'edit');

		//maintain Stationary
		nRefNo = req.body.refNo;
		nStationaryId = req.body.stationaryId;
		if (req.body.vehicleExp && req.body.vehicleExp.purchaseBillNo)
			nPurBill = req.body.vehicleExp.purchaseBillNo;

		if (!nRefNo)
			throw new Error('Mandatory fields are required');

		let foundVoucher = await VoucherService.findVoucherByIdAsync(_id, {
			_id: 1,
			acImp: 1,
			refNo: 1,
			stationaryId: 1,
			vehicleExp: 1
		});

		if (!(foundVoucher && foundVoucher._id))
			throw new Error(`Voucher Not Found`);

		if (foundVoucher.acImp.st) {
			throw new Error(`Account already imported`);
		}

		let oRefNo = foundVoucher.refNo;
		let oStationaryId = foundVoucher.stationaryId;
		if (foundVoucher.vehicleExp && foundVoucher.vehicleExp.purchaseBillNo)
			oPurBill = foundVoucher.vehicleExp.purchaseBillNo;

		if (foundVoucher.vehicleExp && foundVoucher.vehicleExp.totalWithTax)
			oAmount = foundVoucher.vehicleExp.totalWithTax

		if (!nStationaryId) {
			let foundId = await billStationaryService.findByRefAndType({
				bookNo: nRefNo,
				type: "Ref No",
				clientId: req.user.clientId
			});

			if (foundId) {
				nStationaryId = foundId._id.toString();
				req.body.stationaryId = nStationaryId;
			}
		}

		if (nRefNo != oRefNo) {

			let oQuery = {
				refNo: nRefNo,
				clientId: req.user.clientId,
				deleted: {
					$not: {
						$eq: true
					}
				}
			};

			foundVoucher = await Voucher.find(oQuery, {_id: 1}).lean();

			if ((foundVoucher && foundVoucher._id) || (nStationaryId && (await billStationaryService.isUsed(nStationaryId))))
				throw new Error(`Voucher With Ref. No. ${nRefNo} Already Exists.`);


			await billStationaryService.setUnset({
				modelName: 'Voucher',
				userName: req.user.full_name,
				docId: _id
			}, {
				refNo: nRefNo,
				stationaryId: nStationaryId
			}, {
				refNo: oRefNo,
				stationaryId: oStationaryId
			});

			if (!nStationaryId && oStationaryId) {
				await VoucherService.update({_id: {$in: otherUtil.arrString2ObjectId(_id)}}, {
					$unset: {
						stationaryId: 1,
						refNo: 1
					}
				});
			}
		} else {
			nStationaryId && await billStationaryService.setUsed(nStationaryId);
		}

		if (oPurBill != nPurBill) {
			if (oPurBill) {
				req.body.oAmount = oAmount;
				let dlinkTOpurBill = await dlinkToPurBill(req, oPurBill)
			}

			if (nPurBill) {
				let linkTOpurBill = await linkToPurBill(req, req.body)
				if (!linkTOpurBill) {
					delete req.body.vehicleExp.purchaseBill
					delete req.body.vehicleExp.purchaseBillNo
					req.body.msg = 'Voucher updated but cant link with purchase Bill!! remaining amount should be greater than or equal to voucher amount';
				}

			}

		}


		let ledger = await prepareLedger(req, req.body)
		req.body.ledgers = ledger;

		next();

	} catch (e) {
		return res.status(500).json({
			"status": "ERROR",
			"message": e.toString()
		});
	}

}, async function (req, res, next) {
	VoucherService.editVoucher({
		_id: req.params._id,
		...req.body
	})
		.then(function (data) {
			return res.status(200).json({
				'status': 'OK',
				'message': req.body.msg || 'Data updated.',
				'data': data});
		}).catch(next)
});

router.post('/delete', async function (req, res, next) {
	try {
		let _id = req.body._id || false;

		if (!_id)
			throw new Error('No vouchers are selected to delete.');


			let foundVch = await VoucherService.findVoucherByIdAsync(_id);

			if (!(foundVch && foundVch._id)) {
				return res.status(500).json({
					'status': 'OK',
					'message': 'Vouchers Not Found',
				});
			}

			if (foundVch.acImp && foundVch.acImp.st)
				throw new Error('Voucher imported to A/c. Revert the Imported Voucher to Delete.');

			if (foundVch.stationaryId) {
				await billStationaryService.updateStatus({
					userName: req.user.full_name,
					modelName: 'vouchers',
					docId: foundVch._id,
					stationaryId: foundVch.stationaryId,
				}, 'cancelled');
			}

		  let purBill = foundVch.vehicleExp.purchaseBillNo;
		  let voucherAmt = foundVch.vehicleExp.totalWithTax;

			await VoucherService.removeVoucher({
				_id,
				clientId: req.user.clientId,
			});

			await logsService.add('Voucher', {
				uif: foundVch.refNo,
				category: 'delete',
				nData: {},
				oData: JSON.parse(JSON.stringify(foundVch)),
			}, req);

			if(purBill){
				req.body.oAmount = voucherAmt || 0;
				let dlinkTOpurBill = await dlinkToPurBill(req, purBill)
			}


		return res.status(200).json({
			'status': 'OK',
			'message': 'Vouchers deleted',
		});
	} catch (e) {
		return res.status(500).json({
			'status': 'OK',
			'message': e.toString(),
		});
	}
});

async function validateVehExpRequest({body, params}, schemaType) {
	try {

		const addSchema = {
			body: Joi.object().keys({
				'refNo': Joi.string().required(),
				'vT': Joi.string().required(),
				'type': Joi.string().required(),
				'date': Joi.date().iso().required(),
				'branch': Joi.string().required(),
				'vehicleExp': Joi.object().keys({
					creditAcnt: Joi.string().required(),
					creditAcntName: Joi.string().required(),
					gstType: Joi.string(),
					purchaseBill: Joi.string(),
					purchaseBillNo: Joi.string(),
					igstAcntName: Joi.string(),
					igstAcnt: Joi.string(),
					cgstAcntName: Joi.string(),
					cgstAcnt: Joi.string(),
					sgstAcntName: Joi.string(),
					sgstAcnt: Joi.string(),
					totalWithoutTax: Joi.number(),
					totalWithTax: Joi.number(),
					iGST: Joi.number(),
					cGST: Joi.number(),
					sGST: Joi.number(),
					totQty: Joi.number(),
					'items': Joi.array().items(Joi.object().keys({
						account: Joi.string().required(),
						accountName: Joi.string().required(),
						vehicle: Joi.string().required(),
						vehicleNo: Joi.string().required(),
						name: Joi.string().required(),
						qty: Joi.number().required(),
						rate: Joi.number().required(),
						amount: Joi.number().required(),
						uId: Joi.string(),
					}).pattern(/./, Joi.any())).min(1).required(),
				}),
			}).pattern(/./, Joi.any())
		};

		const editSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required(),
			}).pattern(/./, Joi.any()),
			body: Joi.object().keys({
				'refNo': Joi.string().required(),
				'vT': Joi.string().required(),
				'type': Joi.string().required(),
				'date': Joi.date().iso().required(),
				'branch': Joi.string().required(),
				'vehicleExp': Joi.object().keys({
					creditAcnt: Joi.string().required(),
					creditAcntName: Joi.string().required(),
					gstType: Joi.string(),
					purchaseBill: Joi.string(),
					purchaseBillNo: Joi.string(),
					igstAcntName: Joi.string(),
					igstAcnt: Joi.string(),
					cgstAcntName: Joi.string(),
					cgstAcnt: Joi.string(),
					sgstAcntName: Joi.string(),
					sgstAcnt: Joi.string(),
					totalWithoutTax: Joi.number(),
					totalWithTax: Joi.number(),
					iGST: Joi.number(),
					cGST: Joi.number(),
					sGST: Joi.number(),
					totQty: Joi.number(),
					'items': Joi.array().items(Joi.object().keys({
						account: Joi.string().required(),
						accountName: Joi.string().required(),
						vehicle: Joi.string().required(),
						vehicleNo: Joi.string().required(),
						name: Joi.string().required(),
						qty: Joi.number().required(),
						rate: Joi.number().required(),
						amount: Joi.number().required(),
						uId: Joi.string(),
					}).pattern(/./, Joi.any())).min(1).required(),
				}),
			}).pattern(/./, Joi.any())
		};

		let ptr;

		if (schemaType === 'add')
			ptr = addSchema;
		else if (schemaType === 'edit')
			ptr = editSchema;
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

async function prepareLedger(req, body) {
	let aLedger = [];

	try {

		if (!body.vehicleExp)
			throw new Error('Mandatory Fields are required');

		let vehicleExp = body.vehicleExp;
		let user = req.user.full_name;
		let clientId = req.user.clientId;

		if (vehicleExp.totalWithTax) {
			if (!vehicleExp.creditAcnt)
				throw new Error('credit A/c not Defined');

			let fName = await Accounts.findOne({_id: vehicleExp.creditAcnt}, {name: 1, ledger_name: 1}).lean();
			vehicleExp.creditAcntName = fName.ledger_name || fName.name;
		}

		if (vehicleExp.iGST) {
			if (!vehicleExp.igstAcnt)
				throw new Error('IGST A/c not Defined');

			let fName = await Accounts.findOne({_id: vehicleExp.igstAcnt}, {name: 1, ledger_name: 1}).lean();
			vehicleExp.igstAcntName = fName.ledger_name || fName.name;
		}

		if (vehicleExp.cGST) {
			if (!vehicleExp.cgstAcnt)
				throw new Error('CGST A/c not Defined');

			let fName = await Accounts.findOne({_id: vehicleExp.cgstAcnt}, {name: 1, ledger_name: 1}).lean();
			vehicleExp.cgstAcntName = fName.ledger_name || fName.name;
		}

		if (vehicleExp.sGST) {
			if (!vehicleExp.sgstAcnt)
				throw new Error('SGST A/c not Defined');

			let fName = await Accounts.findOne({_id: vehicleExp.sgstAcnt}, {name: 1, ledger_name: 1}).lean();
			vehicleExp.sgstAcntName = fName.ledger_name || fName.name;
		}

		if (vehicleExp.totalWithTax) {

			await addLedger({
				account: vehicleExp.creditAcnt,
				accountName: vehicleExp.creditAcntName,
				amount: vehicleExp.totalWithTax,
				type: 'CR',
				oBill: {
					billNo: vehicleExp.refNo || vehicleExp.billNo,
					billType: 'New Ref',
					amount: vehicleExp.totalWithTax,
					remAmt: vehicleExp.totalWithTax
				}
			});
		}

		if (vehicleExp.iGST && vehicleExp.igstAcnt) {
			await addLedger({
				account: vehicleExp.igstAcnt,
				accountName: vehicleExp.igstAcntName,
				amount: vehicleExp.iGST,
				type: 'DR',
				oBill: {
					billNo: vehicleExp.refNo || vehicleExp.billNo,
					billType: 'On Account',
					amount: vehicleExp.iGST,
					remAmt: vehicleExp.iGST
				}
			});
		}

		if (vehicleExp.sGST && vehicleExp.sgstAcnt) {

			await addLedger({
				account: vehicleExp.sgstAcnt,
				accountName: vehicleExp.sgstAcntName,
				amount: vehicleExp.sGST,
				type: 'DR',
				oBill: {
					billNo: vehicleExp.refNo || vehicleExp.billNo,
					billType: 'On Account',
					amount: vehicleExp.sGST,
					remAmt: vehicleExp.sGST
				}
			});
		}

		if (vehicleExp.cGST && vehicleExp.cgstAcnt) {
			await addLedger({
				account: vehicleExp.cgstAcnt,
				accountName: vehicleExp.cgstAcntName,
				amount: vehicleExp.cGST,
				type: 'DR',
				oBill: {
					billNo: vehicleExp.refNo || vehicleExp.billNo,
					billType: 'On Account',
					amount: vehicleExp.cGST,
					remAmt: vehicleExp.cGST
				}
			});
		}

		if (vehicleExp.items && vehicleExp.items.length) {

			for (let val of vehicleExp.items) {
				await addLedger({
					account: val.account,
					accountName: val.accountName,
					amount: val.amount,
					type: 'DR'
				});
			}
		}


		return aLedger;

	} catch (e) {
		console.log(e);
		throw e
	}

	async function addLedger(oData) {
		let foundVoucher = aLedger.find(o => o.account.toString() === oData.account.toString() && o.cRdR === oData.type);

		if (foundVoucher) {
			foundVoucher.amount += oData.amount;
			oData.oBill && foundVoucher.bills.push(oData.oBill);
		} else {
			aLedger.push({
				account: oData.account,
				lName: (await Accounts.findOne({_id: oData.account}, {name: 1, ledger_name: 1}).lean() || {}).name,
				amount: oData.amount,
				cRdR: oData.type,
				bills: oData.oBill ? (Array.isArray(oData.oBill) ? oData.oBill : [oData.oBill]) : []
			});
		}
	}
}

async function linkToPurBill(req, data) {
	try {

		let id = req.body.vehicleExp.purchaseBill;
		let voucher = data._id || data[0].voucher._id;

		let oPurchaseBill = await PurchaseBill.findOne({_id: id}).lean();

		if (oPurchaseBill.remAmount >= req.body.vehicleExp.totalWithTax) {
			await PurchaseBill.findOneAndUpdate({
				_id: id
			}, {
				$inc: {remAmount: -(req.body.vehicleExp.totalWithTax),
					   remMatQty: -(req.body.vehicleExp.totQty)},
				$push: {
					vehicleExp: voucher
				}
			});
		} else {
			return false;
		}

		return true;


	} catch (e) {
		console.log(e);
		throw new Error('Mandatory Fields are required.');
	}
}

async function dlinkToPurBill(req, purBill) {
	try {

		// let billNo = purBill;
		let voucher = req.body._id;

		let oPurchaseBill = await PurchaseBill.findOne({billNo: purBill}).lean();

		if (oPurchaseBill && oPurchaseBill._id) {
			await PurchaseBill.findOneAndUpdate({
				_id: oPurchaseBill._id
			}, {
				$inc: {remAmount: req.body.oAmount,
					  remMatQty: req.body.vehicleExp.totQty},
				$pull: {
					vehicleExp: voucher
				}
			});
		} else {
			throw new Error('purchase Bill not found');
		}

		return true;


	} catch (e) {
		console.log(e);
		throw new Error('Mandatory Fields are required.');
	}
}

module.exports = router;
