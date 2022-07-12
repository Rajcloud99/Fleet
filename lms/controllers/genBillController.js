var express = require('express');
var router = express.Router();
var Promise = require('bluebird');

let billingPartyService = promise.promisifyAll(commonUtil.getService('billingParty'));
let GenBill = Promise.promisifyAll(commonUtil.getModel('genBill'));
let genBillService = promise.promisifyAll(commonUtil.getService('genBill'));
const BillStationary = commonUtil.getModel('billStationary');
const billStationaryService = commonUtil.getService('billStationary');
let BillService = commonUtil.getService('bills');
const voucherService = commonUtil.getService('voucher');
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

let moment = require('moment');

router.post('/get', async function (req, res, next) {

	try {
		let data = await genBillService.getAllGenBills(req.body);

			return res.status(200).json({
				"status": "OK",
				"message": "Bills found",
				data: data
			});
	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
			err: e
		});
	}

});

router.post('/add', async function (req, res) {

	try {

		let billObj = {
			clientId: req.user.clientId,
			...req.body,
		};

		let billingParty = await billingPartyService.findbillingPartyIdAsync({_id: billObj.billingParty});

		if (!(billingParty && billingParty.length == 1))
			throw new Error('Billing Party Not found');

		let foundBill = await GenBill.findOne({
			billNo: billObj.billNo.trim(),
			clientId: billingParty[0].clientId,
			cancelled: false,
		}).lean();

		if (foundBill && foundBill._id)
			throw new Error('Bill No already used');


		if (billObj.amount && !(billObj.salesAccount && billObj.salesAccountName))
			throw new Error('Sales A/c not Defined');

		if (billObj.iGST && !(billObj.iGSTAccount && billObj.iGSTAccountName))
			throw new Error('IGST A/c not Defined');

		if (billObj.cGST && !(billObj.cGSTAccount && billObj.cGSTAccountName))
			throw new Error('CGST A/c not Defined');

		if (billObj.sGST && !(billObj.sGSTAccount && billObj.sGSTAccountName))
			throw new Error('SGST A/c not Defined');

		if (billObj.totDiscount && !(billObj.discountAcnt && billObj.discountAcName))
			throw new Error('Discount A/c not Defined');

		// saving data to DB
		billObj = new GenBill(billObj);

		let data = await billObj.save();

		if (billObj.stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: data._id,
				modelName: 'genBill',
				stationaryId: billObj.stationaryId,
			}, 'used');
		}


		if (req.body.approve)
			await genBillService.acknowledgeBill(data._id, req.body, req);

		return res.status(200).json({
			message: `Bill Successfully Generated for Bill No. ${billObj.billNo}`,
			data
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
			err: e
		});
	}
});

router.post('/update/:_id', async function (req, res) {

	const ALLOWED_KEY_TO_UPDATE = ['category', 'billDate', 'billNo','dueDate', 'subDate', 'billingParty', 'recDate', 'batchNum', 'src', 'destination', 'rutDis', 'items',
		 'fromDate', 'toDate','branch', 'stationaryId', 'cGST', 'cGSTPercent', 'iGST', 'iGSTPercent',
		 'sGST', 'sGSTPercent', 'amount', 'amountWithTax', 'billAmt', 'remark', 'status', 'acknowledge'
	];

	try {

		let foundGenBill = await GenBill.findOne({
			_id: req.params._id
		}).lean();

		let aRemoveItem = [];
		let aAddItem = [];

		if (!foundGenBill)
			throw new Error('Bill Not Found');

		//Checking is voucher Gen
		if (foundGenBill.acknowledge.voucher) {
			throw new Error('Cannot Edit because Voucher is generated. Please Unapprove the Bill.');
		}


		if (!req.body.billNo)
			throw new Error('Bill No is Mandatory');

		let billObj = {...otherUtil.pickPropertyFromObject(req.body, ALLOWED_KEY_TO_UPDATE)};

		billObj.remark = billObj.remark || '';

		if (billObj.billNo) {
			let billNo = billObj.billNo;
			let stationaryId;

			if (foundGenBill.billNo !== billNo) { // if new Bill doesn't match with saved Bill

				let isBillUsed = await GenBill.findOne({  // is the new Bill No already exists on other Gen bill
					billNo,
					_id: {
						$ne: req.params._id
					}
				});

				if (isBillUsed && isBillUsed._id)
					throw new Error('bill No already used');

				// if stationary provided the use the stationary id else check that new refNo exists in stationary or not
				if (billObj.stationaryId)
					stationaryId = billObj.stationaryId;
				else {
					let foundStationary = await billStationaryService.findByRefAndType({
						bookNo: billNo,
						type: 'Bill',
						clientId: req.user.clientId
					});

					if (foundStationary) {
						stationaryId = foundStationary._id;
					}
				}

				// check the status of stationary id i.e. it is used or not
				if (stationaryId && (await billStationaryService.isUsed(stationaryId)))
					throw new Error('Bill No already used');

				billObj.billNo = billNo;

				// if stationary id is provided then update the stationary id else unset the stationary id
				if (stationaryId)
					billObj.stationaryId = stationaryId;
				else if (foundGenBill.stationaryId) {
					await GenBill.findOneAndUpdate({
						_id: req.params._id
					}, {
						$unset: {
							'stationaryId': 1
						}
					});
				}

				if (foundGenBill.stationaryId) {
					await billStationaryService.updateStatus({
						userName: req.user.full_name,
						docId: foundGenBill._id,
						modelName: 'genBill',
						stationaryId: foundGenBill.stationaryId,
					}, 'cancelled');
				}
			}
		} else {
			if (foundGenBill.billNo) {
				await GenBill.findOneAndUpdate({
					_id: req.params._id
				}, {
					$unset: {
						'stationaryId': 1,
						'refNo': 1
					}
				});
			}
		}

		let data = await GenBill.findOneAndUpdate({
			_id: req.params._id
		}, {
			$set: billObj
		});

		if (foundGenBill.billNo !== req.body.billNo && billObj.stationaryId)
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: foundGenBill._id,
				modelName: 'genBill',
				stationaryId: billObj.stationaryId,
			}, 'used');


		if (req.body.approve)
			await genBillService.acknowledgeBill(req.params._id, req.body, req);

		return res.status(200).json({
			message: `Bill Successfully Updated`,
			data
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
			err: e
		});
	}

});

router.post('/remove/:_id', async function (req, res) {

	try {

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		let oGenBill = await GenBill.findOne({_id: req.params._id}, {
			acknowledge: 1,
			stationaryId: 1
		}).lean();

		if (oGenBill.acknowledge.voucher)
			throw new Error('Cannot remove Voucher is generated');

		if (oGenBill.stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: oGenBill._id,
				modelName: 'genBill',
				stationaryId: oGenBill.stationaryId,
			}, 'cancelled');
		}

		await GenBill.remove({_id: oGenBill._id});

		return res.status(200).json({
			message: 'Bill Successfully Deleted'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.post('/unApprove/:_id', async function (req, res) {

	let userName = req.user.full_name;
	let clientId = req.user.clientId;
	let foundBill;

	try {
		foundBill = await GenBill.findOne({_id: req.params._id});

		if (!(foundBill && foundBill._id))
			throw new Error('No Bill Found');

		if (!foundBill.acknowledge.status)
			throw new Error('Bill is Not Acknowledged');


		let foundVoucher = await voucherService.findVoucherByIdAsync(foundBill.acknowledge.voucher, {acImp: 1});

		if (!(foundVoucher && foundVoucher._id))
			throw new Error('Voucher doesn\'t exist');

		if (foundVoucher.acImp.st)
			throw new Error('Bill cannot be Reverted, Voucher is already imported to A/c');

		await voucherService.removeVoucher({
			_id: foundBill.acknowledge.voucher
		});

		await GenBill.findOneAndUpdate({_id: req.params._id}, {
			$set: {
				status: 'Unapproved',
				'acknowledge.user': req.user,
				'acknowledge.status': false
			},
			$unset: {
				'acknowledge.date': 1,
				'acknowledge.dueDate': 1,
				'acknowledge.systemDate': 1,
				'acknowledge.remark': 1,
				'acknowledge.voucher': 1
			}
		});

		return res.status(200).json({
			message: 'Bill Successfully Unappove'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.post('/approve/:_id', async function (req, res) {

	try {

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		let oGenBill = await GenBill.findOne({_id: req.params._id}, {acknowledge: 1, billingParty: 1}).lean();

		if (oGenBill && oGenBill.acknowledge.voucher)
			throw new Error('Voucher already generated');

		if(req.body){
			    oGenBill.salesAccount= oGenBill.acknowledge.salesAccount,
				oGenBill.iGSTAccount= oGenBill.acknowledge.iGSTAccount,
				oGenBill.cGSTAccount= oGenBill.acknowledge.cGSTAccount,
				oGenBill.sGSTAccount= oGenBill.acknowledge.sGSTAccount,
				oGenBill.discountAcnt= oGenBill.acknowledge.discountAcnt

		}

		if (req.body.approve)
			await genBillService.acknowledgeBill(req.params._id, oGenBill, req);



		return res.status(200).json({
			message: 'Bill Successfully approved'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.post('/cancel/:_id', async function (req, res) {
	try {

		if (!req.params._id) {
			res.status(500).json({
				status: 'ERROR',
				message: 'Invalid request'
			});
		}
		let bill_id = req.params._id;
		let cancelObj = req.body;
		let billData = await GenBill.findOne({_id: bill_id}).lean();

		// validating Bill
		if (!(billData && billData._id))
			throw new Error('Bill not found');

		if (billData.cancelled)
			throw new Error('Bill Already Cancelled');

		if (billData.acknowledge.status)
			throw new Error('Bill Cannot be cancelled. Its already Acknowledged');

		// freeing the stationary
		await billStationaryService.updateStatusV2({
			_id: billData.stationaryId
		}, {
			userName: req.user.full_name,
			status: 'cancelled',
			docId: billData._id,
			modelName: 'genBill',
		});

		await GenBill.updateOne({_id: billData._id}, {
			$set: {
				cancelled: true,
				cancel_reason: cancelObj.cancel_reason,
				cancel_remark: cancelObj.cancel_remark,
				status: constant.billStatus[2]
			}
		});

		res.status(200).json({
			status: 'OK',
			message: 'Bill cancelled successfully'
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString()
		});
	}
});



module.exports = router;
