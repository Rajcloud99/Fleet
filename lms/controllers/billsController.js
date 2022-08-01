var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var billsService = Promise.promisifyAll(commonUtil.getService('bills'));
var billsServiceNew = commonUtil.getService('bills');
let billingPartyService = promise.promisifyAll(commonUtil.getService('billingParty'));
var ClientService = promise.promisifyAll(commonUtil.getService('client'));
var JobCardService = promise.promisifyAll(commonUtil.getMaintenanceService('jobCard'));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
var domain = 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port') + '/';
let GR = Promise.promisifyAll(commonUtil.getModel('tripGr'));
let Bill = Promise.promisifyAll(commonUtil.getModel('bills'));
let BillNew = commonUtil.getModel('bills');
const assetsService = commonUtil.getService('assets');
const Assets = commonUtil.getModel('assets');
let PurchaseBill = Promise.promisifyAll(commonUtil.getModel('purchaseBill'));
const billStationaryService = commonUtil.getService('billStationary');
const TripAdvance = commonUtil.getModel('TripAdvances');
const Dues = commonUtil.getModel('dues');
const voucherService = commonUtil.getService('voucher');
let BillService = commonUtil.getService('bills');
const grService = commonUtil.getService('tripGrV2');
let Trip = commonUtil.getModel('trip');

let moment = require('moment');
const path = require("path");

router.post('/cn_dr_DeductionReport', async function (req, res, next) {
	try {
		let data = await BillService.cNdR_Deduction(req.body);
		if (req.body.download) {
			ReportExelService.cn_dr_DeductionReport(data, req.body.end_date, req.body.start_date, req.user.clientId, function (d) {
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
	} catch (err) {
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.post('/report', async function (req, res) {
	try {
		let data = await BillService.getClientMonthlyReport(req.body);
		if (req.body.download) {
			ReportExelService.billingPartyExpenseReport(data, req.body.reportType, req.body.end_date, req.body.start_date, req.user, function (d) {
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
				'message': 'Data found',
				'data': data
			});
		}
	} catch (err) {
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

// router.post('/grSummaryReport',async function(req, res, next){
// 	try{
// 		let data = await BillService.grSummaryReport(req.body);
//
// 	}catch(err){
// 		return  res.status(501).json({
// 			'status': 'error',
// 			'message' : err.toString()
// 		})
// 	}
// });

router.post('/outstandingReport', async function (req, res, next) {
	try {
		let data = await BillService.customerOutstandingReport(req.body);
		if (req.body.download) {
			ReportExelService.outstandingReport(data, req.body.end_date, req.body.start_date, req.user.clientId, function (d) {
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
	} catch (err) {
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.post('/ledgerTransactionReport', async function (req, res, next) {
	try {
		let data = await BillService.ledgerTransactionReport(req.body);
		if (req.body.download) {
			ReportExelService.ledgerTransactionReport(data, req.body.end_date, req.body.start_date, req.user.clientId, function (d) {
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
	} catch (err) {
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.post('/outstandingPeriodWiseReport', async function (req, res, next) {
	try {
		let data = await BillService.OutstandingPeriodWiseReport(req.body);
		if (req.body.download) {
			ReportExelService.outstandingPeriodWiseReport(data, req.body.end_date, req.body.start_date, req.user.clientId, function (d) {
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
	} catch (err) {
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.post('/billLedgerOutstandingReport', async function (req, res, next) {
	try {
		req.body.clientId = req.user.clientId;

		let url = await BillService.billLedgerOutstandingReport(req.body, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Data found....',
			'url': url
		});
	} catch (err) {
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.post('/billLedgerOutstandingMonthlyReport', async function (req, res, next) {
	try {
		let url = await BillService.billLedgerOutstandingPeriodWiseReport(req.body, req);
		return res.status(200).json({
				'status': 'OK',
				'message': 'report download available.',
				'url': url
			}
		);
	} catch (err) {
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.route('/revertAckBill/:_id').put(async function (req, res, next) {

	try {

		let id = req.params._id || false;

		if (!(id))
			throw new Error('Mandatory fields are required');

		await billsServiceNew.revertAcknowledgedSalesBill(id, req);

		return res.status(200).json({
			status: "OK",
			message: 'Bill Successfully Unapproved',
		});

	} catch (e) {
		return res.status(500).json({
			status: "ERROR",
			message: e.toString(),
			error: e,
		});
	}
});

router.post('/generateBill_withoutGr', async function (req, res) {
	try {

		let billsObj = req.body;
		let approveStatus = 'success';

		let billingPartyId = req.body.billingParty;
		let oBillingParty = await billingPartyService.findbillingPartyIdAsync({_id: billingPartyId});

		if (!(oBillingParty && oBillingParty[0]))
			return res.status(500).json({'status': 'ERROR', 'message': 'Billing Party does not exist'});
		else
			oBillingParty = oBillingParty[0];

		let clientId = oBillingParty.clientId;

		if (await BillNew.findOne({billNo: billsObj.billNo, clientId, cancelled: false}))
			return res.status(500).json({'status': 'ERROR', 'message': 'Bill No already used.'});

		let oFoundStationary = await billStationaryService.findByRefAndType({
			bookNo: billsObj.billNo,
			clientId,
			type: 'Bill',
			billBookId: oBillingParty.billBook.map(o => o.ref)
		}, {_id: 1, status: 1});

		if (oFoundStationary) {
			if (oFoundStationary.status === 'used')
				throw new Error('Bill Stationary Found but its already used');

			if (oFoundStationary.status === 'disable')
				throw new Error('Found Bill Stationary is disabled');

			req.body.stationaryId = oFoundStationary._id;
		}

		billsObj._id && delete billsObj._id;
		billsObj.created_by = req.user._id;
		billsObj.created_by_name = req.user.full_name;
		billsObj.clientId = clientId || req.body.clientId;

		let saveBill = new Bill(billsObj);
		await saveBill.save();

		req.body.stationaryId && await billStationaryService.updateStatusV2({
			_id: req.body.stationaryId
		}, {
			userName: req.user.full_name,
			status: 'used',
			docId: saveBill._id,
			modelName: 'bill',
		});

		if (billsObj.approve) {
			billsObj.remark = billsObj.remarks;
			try {
				await billsServiceNew.acknowledgeSalesBill(saveBill._id, billsObj, req);
			} catch (e) {
				approveStatus = e.message;
				console.log(e);
			}
		}

		return res.status(200).json({
			message: "Bill generated successfully.",
			status: approveStatus
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}

});

router.post('/genMultiBill', async function (req, res) {
	try {

		if (!(Array.isArray(req.body.aBill) && req.body.aBill.length))
			throw new Error('Mandatory Fields are required');

		for (let oBill of req.body.aBill) {
			let billsObj = oBill;

			let billingPartyId = billsObj.billingParty;
			let oBillingParty = await billingPartyService.findbillingPartyIdAsync({_id: billingPartyId});

			if (!(oBillingParty && oBillingParty[0]))
				return res.status(500).json({'status': 'ERROR', 'message': 'Billing Party does not exist'});
			else
				oBillingParty = oBillingParty[0];

			let clientId = oBillingParty.clientId;

			if (await BillNew.findOne({billNo: billsObj.billNo, clientId, cancelled: false}))
				return res.status(500).json({'status': 'ERROR', 'message': 'Bill No already used.'});

			// let oFoundStationary = await billStationaryService.findByRefAndType({
			// 	bookNo: billsObj.billNo,
			// 	clientId,
			// 	type: 'Bill',
			// 	billBookId: oBillingParty.billBook.map(o => o.ref)
			// }, {_id: 1, status: 1});
			//
			// if (oFoundStationary) {
			// 	if (oFoundStationary.status === 'used')
			// 		throw new Error('Bill Stationary Found but its already used');
			//
			// 	if (oFoundStationary.status === 'disable')
			// 		throw new Error('Found Bill Stationary is disabled');
			//
			// 	req.body.stationaryId = oFoundStationary._id;
			// }else
			// 	throw new Error('Invalid Bill no.');

			billsObj._id && delete billsObj._id;
			billsObj.created_by = req.user._id;
			billsObj.created_by_name = req.user.full_name;
			billsObj.clientId = clientId || req.body.clientId;
			billsObj.multiBill = true;

			let bill = new Bill(billsObj);
			await bill.save();

			await billsServiceNew.acknowledgeSalesBill(bill._id, {...billsObj, ...req.body}, req);
		}

		return res.status(200).json({
			message: "Bill generated successfully.",
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.put('/editMultiBill/:_id', async function (req, res, next) {
	try {
		let billObj = {};
		for (const obj of req.body.aBill) {
			// if(obj.billNo){
			// 	let foundBill = await BillNew.findOne({billNo: obj.billNo})
			// 		return res.status(500).json({'status': 'ERROR', 'message': 'Bill No already used.'});
			// }
			billObj = {
				billNo: obj.billNo,
				billDate: obj.billDate,
				amount: obj.amount,
				totalAmount: obj.amount,
				billAmount: obj.amount
			};
			// billsObj.clientId = clientId || req.body.clientId;
			await BillNew.updateOne({_id: otherUtil.arrString2ObjectId(obj._id)}, {$set: billObj});
		}
		return res.status(200).json({
			// 'status': 'OK',
			'message': 'Bill Successfully Updated'
			// 'data': {}
		});
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/genMultiCrBill', async function (req, res) {
	try {

		if (!(Array.isArray(req.body.aBill) && req.body.aBill.length))
			throw new Error('Mandatory Fields are required');

		for (let oBill of req.body.aBill) {
			let billObj = {
				clientId: req.user.clientId,
				...oBill,
				multiBill: true,
				billType: 'Maintenance'
			};

			if (billObj.refNo) {

				let foundPurchaseBill = await PurchaseBill.findOne({
					refNo: billObj.refNo
				});

				if (foundPurchaseBill && foundPurchaseBill._id)
					throw new Error('Bill No already used');

			} else {
				throw new Error('Ref No. is Mandatory');
			}

			billObj.aDiscount = [];
			billObj.totDiscount = 0;
			billObj['materialItems'] = [];
			billObj.totMaterial = billObj.totMaterial;

			// saving data to DB
			billObj = new PurchaseBill(billObj);

			let data = await billObj.save();

			if (req.body.acknowledge)
				await billsServiceNew.acknowledgeBill(data._id, billObj, req);
		}

		return res.status(200).json({
			message: `Purchase Bill Successfully Generated for Bill No.`,
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
			err: e
		});
	}
});

router.post('/editMultiCrBill/:_id', async function (req, res) {
	try {

		// if(!(Array.isArray(req.body.aBill) && req.body.aBill.length))
		// 	throw new Error('Mandatory Fields are required');
		let billObj = {};
		for (let obj of req.body.aBill) {
			billObj = {
				billNo: obj.billNo,
				billDate: obj.billDate,
				amount: obj.amount,
				totalAmount: obj.amount,
				billAmount: obj.amount
			};
			await PurchaseBill.updateOne({_id: otherUtil.arrString2ObjectId(obj._id)}, {$set: billObj});
		}

		return res.status(200).json({
			message: `Purchase Bill Successfully Updated.`,
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
		let billsObj = req.body;
		let grItems = [], arr = [], updateQuery;
		let approveStatus = 'success';

		let billingParty = await billingPartyService.findbillingPartyIdAsync({_id: billsObj.billingParty});

		if (!(billingParty && billingParty.length == 1))
			throw new Error('Billing Party Not found');

		let foundBill = await BillNew.findOne({
			billNo: billsObj.billNo.trim(),
			clientId: billingParty[0].clientId,
			cancelled: false,
			type: {$ne: 'Provisional Bill'}
		}).lean();

		if (foundBill && foundBill._id)
			throw new Error('Bill No already used');

		for (let grs of billsObj.items)
			grItems.push(grs.gr);

		if (billsObj.amount && !(billsObj.salesAccount && billsObj.salesAccountName))
			throw new Error('Sales A/c not Defined');

		if (billsObj.iGST && !(billsObj.iGSTAccount && billsObj.iGSTAccountName))
			throw new Error('IGST A/c not Defined');

		if (billsObj.cGST && !(billsObj.cGSTAccount && billsObj.cGSTAccountName))
			throw new Error('CGST A/c not Defined');

		if (billsObj.sGST && !(billsObj.sGSTAccount && billsObj.sGSTAccountName))
			throw new Error('SGST A/c not Defined');

		if (billsObj.totCwt && !(billsObj.woAcc && billsObj.woAccName))
			throw new Error('Without Tax A/c not Defined');

		let billType = billsObj.type;

		let clientId = billingParty[0].clientId;

		let grData = await GR.find({_id: {$in: grItems}}).lean();

		for (let i = 0; i < grData.length; i++) {
			if(req.clientConfig.config && req.clientConfig.config.Bill && req.clientConfig.config.Bill.vendorDeal){
				let tripData = await Trip.findOne({trip_no : grData[i].trip_no,"clientId" : req.user.clientId},{ownershipType:1}).lean();
				if(tripData && tripData.ownershipType === "Market"){
					let trip = await Trip.findOne({
						"trip_no" : grData[i].trip_no,
						"clientId" : req.user.clientId,
						isCancelled: false,
						"vendorDeal.loading_slip": {$exists: true},
						'vendor': {$exists: true},
					},{trip_no:1});
					if (!trip)
						throw new Error('Without Vendor deal can not generate bill');
				}
			}
			if (billType === constant.billType[3]) // Supplementary Bill
				arr.push(grData[i]._id);
			else if (billType === constant.billType[0]) // Provisional Bill
				arr.push(grData[i]._id);
			else if (!grData[i].bill && billType === constant.billType[1]) // Actual Bill
				arr.push(grData[i]._id);
		}

		if (arr.length > 0) {
			if (billsObj._id)
				delete billsObj._id;

			billsObj.created_by = req.user._id;
			billsObj.created_by_name = req.user.full_name;
			billsObj.last_modified_by = req.user.full_name;
			billsObj.clientId = clientId || req.body.clientId; // putting billing party clientId

			billsObj.receiving = {
				moneyReceipt: [],
				deduction: []
			};

			// it extract and put gr Basic information on respective Bill Item's
			billsObj.items.forEach(oItem => {
				let grId = oItem.gr && oItem.gr._id || oItem.gr || false;
				let foundGr;

				if (grId && (foundGr = grData.find(oGr => oGr._id.toString() === grId)))
					oItem.grData = BillNew.extractGrKeys(foundGr);

				if (billType == constant.billType[0]) { // Provisional bill validation
					let total = (foundGr.provisionalBill || []).reduce((percent, oPov) => percent + oPov.percent, 0);

					if (total + oItem.billPercent > 100)
						throw new Error(`Provision Bill of ${total} for Gr Number ${foundGr.grNumber} is already generated. Cannot Exceed Bill Percent`);
				}

				if (Array.isArray(oItem.tMemoReceipt)) {
					oItem.tMemoReceipt.forEach(oTMemo => {
						const tMemoPtr = billsObj.receiving.moneyReceipt.find(o => o.tmRefNo === oTMemo.refNo);
						if (tMemoPtr) {
							tMemoPtr.grs.push({
								grRef: oItem.gr,
								tMemo: oTMemo.tMemoNo,
								amount: oTMemo.amount,
							});
							tMemoPtr.amount += oTMemo.amount;
						} else {
							billsObj.receiving.moneyReceipt.push({
								tmRef: oTMemo._id,
								tmRefNo: oTMemo.refNo,
								grs: [{
									grRef: oItem.gr,
									tMemo: oTMemo.tMemoNo,
									amount: oTMemo.amount,
								}],
								amount: oTMemo.amount,
							});
						}
					});
				}
			});

			let intPart = parseInt((billsObj.billNo || '').replace(/^.*([0-2][0-9]|(3)[0-1])(\-|\/)(((0)[0-9])|((1)[0-2]))(\-|\/)\d{2,4}/i, '').replace(/\D+/g, ''));
			let wordPart = (billsObj.billNo || '').replace(/\W+/ig, '').replace(/\d+/g, '');
			if (intPart) billsObj['billNoInt'] = intPart;
			if (wordPart) billsObj['billNoWord'] = wordPart;

			let bill = new Bill(billsObj);
			let saveBill = await bill.save();

			if (saveBill) {
				saveBill = JSON.parse(JSON.stringify(saveBill));
				let saveObj = {};
				if (billType == constant.billType[0]) {
					saveObj = {
						$push: {
							provisionalBill: {
								percent: billsObj.billPercent,
								ref: saveBill._id
							}
						}
					};

				} else if (billType == constant.billType[1]) {
					saveObj = {
						$set: {
							bill: saveBill._id
						},
						$addToSet: {
							bills: saveBill._id
						}
					};

				} else if (billType == constant.billType[3]) {
					saveObj = {
						$addToSet: {
							supplementaryBillRef: saveBill._id,
						}
					};
				}

				for (let oItem of saveBill.items) {
					let bodyItem = billsObj.items.find(o => o.gr.toString() === oItem.gr.toString());

					if (billType == constant.billType[3]) {
						saveObj['$addToSet'] = saveObj['$addToSet'] || {};
						saveObj['$addToSet'].selectedSupply = {$each: oItem.selectedSupply};
					}

					if (billType == constant.billType[0]) {
						let fdGr = await GR.findOne({_id: oItem.gr}, {provisionalBill: 1}).lean();
						saveObj['$set'] = saveObj['$set'] || {};
						saveObj['$push']['provisionalBill']['percent'] = bodyItem.billPercent;
						saveObj['$set'].isProvBillGen = ((fdGr && Array.isArray(fdGr.provisionalBill) && fdGr.provisionalBill || []).reduce((amt, o) => amt + o.percent, 0) + bodyItem.billPercent) >= 100
					}

					if (Object.keys(saveObj).length)
						await GR.updateOne({_id: oItem.gr}, saveObj);
				}

				await billStationaryService.updateStatusV2({
					_id: req.body.stationaryId
				}, {
					userName: req.user.full_name,
					status: 'used',
					docId: bill._id,
					modelName: 'bill',
				});

				if (billsObj.approve) {
					billsObj.remark = billsObj.remarks;
					try {
						let data = await billsServiceNew.acknowledgeSalesBill(saveBill._id, billsObj, req);
						req.body.ids = [];
						req.body.ids.push(data);
						if(req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.account && req.clientConfig.config.account.autoImport){
							await voucherService.importAccountsV2(req,res);
						}
					} catch (e) {
						approveStatus = e.message;
						console.log(e);
					}
				}

				// updating
				grService.updateUpdateTime(saveBill.items.map(o => o.gr));

				return res.status(200).json({
					message: "Bill generated successfully..",
					GR: arr,
					status: approveStatus
				});

			}
		} else {
			return res.status(200).json({
				message: "GR bills are already generated"
			});
		}

	} catch (e) {
		return res.status(500).json({'status': 'ERROR', 'error_message': e && e.message || e.toString()});
	}
});

router.post("/get", function (req, res, next) {
	billsService.getAllBillsAsync(req.body)
		.then(function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "bookings found",
				"data": data.data,
				"count": data.count,
				"pages": data.no_of_pages
			});
		}).catch(next);
});

router.post("/getv2", function (req, res, next) {
	if (req.body.download) req.body.all = true;
	billsServiceNew.getAllBillsAggr(req.body)
		.then(function (data) {
			if (req.body.download) {
				ReportExelService.billReport(data.data, req.user.clientId, function (d) {
					return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						...d
					});
				});
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "bookings found",
					"data": data.data,
					"count": data.count,
					"pages": data.no_of_pages
				});
			}
		}).catch(next);
});

router.post("/gstSales", function (req, res, next) {
	billsServiceNew.getAllBillsAggr(req.body)
		.then(function (data) {
			if (req.body.download && req.body.gstSales) {
				ReportExelService.gstSales(data.data, req.user.clientId, function (d) {
					return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						...d
					});
				});
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "bookings found",
					"data": data.data,
					"count": data.count,
					"pages": data.no_of_pages
				});
			}
		}).catch(next);
});

/*********** update bill ***********/
router.put("/update/:_id",
	async function (req, res, next) {
		try {

			if (otherUtil.isEmptyObject(req.body)) {
				return res.status(500).json({"status": "ERROR", "error_message": "Nothing in body for Billing update"});
			}

			let oBill = await billsServiceNew.findById({_id: req.params._id}, {acknowledge: 1, receiving: 1});

			if (!oBill)
				throw new Error('Bill not found');

			if (oBill.acknowledge.status)
				throw new Error('Bill is Acknowledged. Thus, cannot be edited');

			if (oBill.receiving)
				if (oBill.receiving.moneyReceipt && oBill.receiving.moneyReceipt.length) {
					if (oBill.receiving.moneyReceipt.filter(o => !o.tmRef).length)
						throw new Error(`Money Receipt ${oBill.receiving.moneyReceipt.reduce((str, obj) => str += obj.mrNo + ' ', '')} is generated on this bill. Thus, cannot be edited`);
				}else if (oBill.receiving.deduction && oBill.receiving.deduction.length)
					throw new Error(`Deduction ${oBill.receiving.moneyReceipt.reduce((str, obj) => str += obj.creditNo + ' ', '')} is applied on this bill. Thus, cannot be edited`);

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
			let data = await billsServiceNew.updateBills(req.params._id, {
				...req.body,
				user_full_name: req.user.full_name,
				last_modified_by: req.user.full_name,
			}, req);
			if(req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.account && req.clientConfig.config.account.autoImport){
				req.body.ids = [];
				req.body.ids.push(data);
				await voucherService.importAccountsV2(req,res);
			}

			return res.status(200).json({
				"status": "OK",
				"message": "Updated successfully",
				"data": data
			});

		} catch (e) {
			return res.status(500).json({
				"status": "ERROR",
				"message": e.toString()
			});
		}
	}
);

// router.post('/bill_settle', async function (req, res, next) {
// 	if(otherUtil.isAccountEnabled(req) && (!req.body.account_data.from || !req.body.account_data.to)){
// 		return res.status(500).json({"status":"OK","message":"provide account's from and to"});
// 	}
// 	let aResp = [];
// 	let bulkUpdate = Bill.collection.initializeOrderedBulkOp();
// 	let settlementData = req.body.settlementData;
// 	let aBillIds = settlementData.map((obj)=>obj.bill_id);
// 	if(!aBillIds || aBillIds.length<1){
// 		return res.status(500).json({status: "ERROR", message: "bill_id not provided!"})
// 	}
// 	try {
// 		let aUnsetteledBill = await Bill.find({"clientId":req.user.clientId,_id:{$in:aBillIds}});
// 		for(let reqItem of settlementData){
// 			let b = aUnsetteledBill.find((e)=>e._id.toString() === reqItem.bill_id.toString());
// 			let i = b.items.find((e)=>e.gr._id.toString() === reqItem.gr.toString());
// 			if(reqItem) {
// 				let filterADeduction = req.body.aDeduction.filter( oDed => oDed.gr === i.gr._id.toString());
//
// 				//on settle if any amount is received on that gr
// 				if(reqItem.settlement.amountReceived > 0){
// 					let mr = {
// 						'mrNo': app_constant.mrCount,
// 						'checkNo': req.body.checkNo,
// 						'checkDate': req.body.checkDate,
// 					};
//
// 					//todo save Mr on gr //code
//
// 					Object.assign(reqItem.settlement, mr);
// 					if(req.body.account_data.to)
// 						reqItem.settlement.to_account = req.body.account_data.to;
// 					// incrementing mr counter
// 					counterUtil.incrementMRCount();
//
// 					i.settlement.push(reqItem.settlement);
// 				}
//
// 				// sum of gr totamount + bill tax
// 				let cGST = i.gr.totalFreight * b.cGST_percent / 100;
// 				let sGST = i.gr.totalFreight * b.sGST_percent / 100;
// 				let iGST = i.gr.totalFreight * b.iGST_percent / 100;
//
// 				let totalItemAmt = i.gr.totalFreight + cGST + sGST + iGST;
//
// 				let totalRec = i.settlement.reduce(function (accumulator, currentValue) {
// 					return accumulator + (currentValue.amountReceived || 0);
// 				}, 0);
//
// 				if (totalRec > totalItemAmt) {
// 					try {
// 						//let foundGR = await TripGR.findOne({_id: mongoose.Types.ObjectId(i.gr.toString())}, {grNumber: 1});
// 						aResp.push(`Gr Number ${i.gr.grNumber} from bill number ${b.billNo} cannot receive more than bill amount.`)
// 					} catch (err) {
//
// 					}
// 				}
// 				else {
//
// 					let updateQuery = {
// 						$set: {"items.$.settled": (totalRec === totalItemAmt)}
// 					};
//
// 					if(reqItem.settlement.amountReceived > 0){
// 						updateQuery['$push'] = {"items.$.settlement": reqItem.settlement};
// 					}
//
// 					bulkUpdate
// 						.find({_id: b._id, "items.gr": i.gr._id})
// 						.update(updateQuery);
//
// 					bulkUpdate
// 						.find({_id: b._id, "items.gr": i.gr._id})
// 						.update({
// 							$set: {"items.$.aDeduction": filterADeduction},
// 						});
// 				}
// 			}
// 			else {
// 				aResp.push(`Gr Number ${foundGR.grNumber} not found in bill number ${b.billNo}.`)
// 			}
// 		}
// 		if(aResp.length>0){
// 			return res.status(500).json({"message":aResp});
// 		}else {
// 			try {
// 				let bulkResp = await bulkUpdate.execute();
// 				if(!otherUtil.isAccountEnabled(req)) {
// 					return res.status(200).json({"status":"OK","message":"Bills Updated", data:bulkResp});
// 				}
// 				else {
// 					let receivedAmt = req.body.settlementData.reduce(function (accumulator, currentValue) {
// 						return accumulator + (currentValue.settlement.amountReceived || 0);
// 					},0);
//
// 					let reqbody = {
// 						type: "Receipt",
// 						amount: receivedAmt,
// 						narration: req.body.remark,
// 						from: req.body.account_data.from,
// 						to: req.body.account_data.to,
// 						refNo: req.body.refNo,
// 						clientId: req.user.clientId,
// 						created_by: req.user._id,
// 					};
// 					VoucherService.addVoucherAsync(reqbody)
// 						.then(function (data) {
// 							Bill.updateAsync({_id: req.params._id}, {
// 								$push: {
// 									"vouchers":{$each:data.map((obj)=>obj.voucher._id)}
// 								}
// 							});
// 							return res.status(200).json({status: "OK", "message":"Bills Updated", data:bulkResp})
// 						}).catch(function (err) {
// 						return res.status(200).json({status: "ERROR", "message":"Bills Updated "+ err.toString(), data:bulkResp });
// 					})
// 				}
// 			}catch (error) {
// 				return res.status(500).json({"message":"Requested Bills updation failed.", data:JSON.stringify(error)});
// 			}
// 		}
// 	}catch (e) {
// 		return res.status(500).json({"message":"Requested Bills not found.", data:JSON.stringify(e)});
// 	}
//
// 	/*
// 	* [{
// 	* 	"gr": {
// 			type: mongoose.Schema.Types.ObjectId,
// 			ref: 'TripGr'
// 		},
// 		"bill_id":
// 		"settlement":{
// 			"date": Date,
// 			"settled_by": {
// 				type: mongoose.Schema.Types.ObjectId,
// 				ref: 'User'
// 			},
// 			"amountReceived": Number,
// 			"otherAmountTotal": Number,
// 			"otherAmount": [{
// 				account: {
// 					type: mongoose.Schema.Types.ObjectId,
// 					ref: "accounts"
// 				},
// 				amount: Number
// 			}]
// 		}
// 		}]
// 	*
// 	* */
//
//
//
//
// });

// router.post('/amendBill/:_id',async function (req, res,next) {
// 	if(!req.params._id){
// 		res.status(500).json({
// 			status: "ERROR",
// 			message: "Invalid request"
// 		});
// 	}
// 	let bill_id = req.params._id;
// 	if(otherUtil.isAccountEnabled(req) && (!req.body.from || !req.body.to)){
// 		return res.status(500).json({"status":"OK","message":"provide account's from and to"});
// 	}
// 	if(!req.body.amount)
// 		return res.status(500).json({"status":"OK","message":"Amount not found."});
// 	try{
// 		let bill = await Bill.find({"clientId":req.user.clientId,_id:bill_id});
// 		if(bill && bill[0]){
// 			bill = bill[0];
// 			if(bill.cancelled === true){
// 				return res.status(500).json({
// 					"status": "ERROR",
// 					"message": "Credit / Debit Note can't be added if bill is cancelled."
// 				});
// 			}
// 			let reqbody = {
// 				voucherType: req.body.voucherType,
// 				type: req.body.voucherType,
// 				date: new Date(),
// 				amount: req.body.amount,
// 				narration: req.body.narration,
// 				from: req.body.from,
// 				to: req.body.to,
// 				refNo: req.body.refNo,
// 				clientId: req.user.clientId,
// 				created_by: req.user._id,
// 				cgst:0,
// 				sgst:0,
// 				igst:0,
// 				tax: []
// 			};
// 			if(bill.cGST_percent){
// 				if(!req.clientData.accountDetails.cgstPayable){
// 					return res.status(500).json({
// 						"status": "ERROR",
// 						"message": "CGST Payable account not configured."
// 					});
// 				}
// 				reqbody.cgst = reqbody.amount * (bill.cGST_percent/100);
// 				reqbody.tax.push({
// 					account: req.clientData.accountDetails.cgstPayable,
// 					amount: reqbody.cgst
// 				})
// 			}if(bill.sGST_percent){
// 				if(!req.clientData.accountDetails.sgstPayable){
// 					return res.status(500).json({
// 						"status": "ERROR",
// 						"message": "SGST Payable account not configured."
// 					});
// 				}
// 				reqbody.sgst = reqbody.amount * (bill.sGST_percent/100);
// 				reqbody.tax.push({
// 					account: req.clientData.accountDetails.sgstPayable,
// 					amount: reqbody.sgst
// 				})
// 			}if(bill.iGST_percent){
// 				if(!req.clientData.accountDetails.igstPayable){
// 					return res.status(500).json({
// 						"status": "ERROR",
// 						"message": "IGST Payable account not configured."
// 					});
// 				}
// 				reqbody.igst = reqbody.amount * (bill.iGST_percent/100);
// 				reqbody.tax.push({
// 					account: req.clientData.accountDetails.igstPayable,
// 					amount: reqbody.igst
// 				})
// 			}
// 			reqbody.netAmount = reqbody.amount + reqbody.igst+reqbody.sgst+reqbody.cgst;
// 			VoucherService.addVoucherAsync(reqbody)
// 				.then(function (data) {
// 					reqbody.vouchers = data.map((obj)=>obj.voucher._id);
// 					if(reqbody.voucherType === "Credit Note"){
// 						reqbody.amount = -1 * reqbody.amount;
// 						reqbody.netAmount = -1 * reqbody.netAmount;
// 						reqbody.sgst = -1 * reqbody.sgst;
// 						reqbody.cgst = -1 * reqbody.cgst;
// 						reqbody.igst = -1 * reqbody.igst;
// 					}
// 					Bill.updateAsync({_id: req.params._id}, {
// 						$push: {
// 							"vouchers":{$each:data.map((obj)=>obj.voucher._id)},
// 							"dcNotes":reqbody
// 						}
// 					}).then(function (savedBill){
// 						return res.status(200).json({status: "OK", "message":"Bills Updated", data:data})
// 					}).catch(function(err){
// 						return res.status(500).json({status: "ERROR", "message":"Voucher Added failed to update Bill "+ err});
// 					})
//
// 				}).catch(function (err) {
// 				return res.status(500).json({status: "ERROR", "message":err });
// 			})
//
// 		}
// 	}
// 	catch (e){
// 		next(e);
// 	}
// });

router.post('/addRemarkMultiBills', async function (req, res) {

	try {

		if (!req.body)
			throw new Error('Invalid request.');

		if (!Array.isArray(req.body.aBIds))
			throw new Error('Bill should be an array');

		if (!(req.body.submitionDate) && !req.body.remarks)
			throw new Error('Atleast one input required.');

		let aBill = req.body.aBIds;
		let billData;
		for (let b of aBill) {
			billData = await Bill.findOne({_id: otherUtil.arrString2ObjectId(b)}, {_id: 1}).lean();
			if (!billData) {
				throw new Error('Bill not found.');
			}
		}

		let billRes = billsServiceNew.updateBillRemark(req, res);

		if (billRes) {
			res.status(200).json({
				status: 'OK',
				message: 'Bill remark added successfully'
			});

		} else {
			return res.status(500).json({
				'status': 'ERROR',
				'message': e.toString()
			});
		}

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString()
		});
	}

});

router.put('/cancelBill/:_id', async function (req, res) {
	try {

		if (!req.params._id) {
			res.status(500).json({
				status: 'ERROR',
				message: 'Invalid request'
			});
		}
		let bill_id = req.params._id;
		let cancelObj = req.body;
		let billData = await Bill.findOne({_id: bill_id}).lean();

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
			modelName: 'bill',
		});

		// updating the respective Gr's
		if (billData.type === constant.billType[0]) {
			await GR.updateMany({_id: {$in: billData.items.map(o => o.gr)}}, {
				$set: {
					isProvBillGen: false
				},
				$pull: {
					'provisionalBill': {
						ref: billData._id
					}
				}
			}, {multi: true});
		} else if (billData.type === constant.billType[1]) {
			await GR.updateMany({_id: {$in: billData.items.map(o => o.gr)}}, {
				$unset: {
					'bill': 1
				}
			}, {multi: true});
		} else if (billData.type === constant.billType[3]) {
			for (let oItem of billData.items) {
				await GR.updateOne({_id: oItem.gr}, {
					$pull: {
						'supplementaryBillRef': bill_id,
						'selectedSupply': {$in: (oItem.selectedSupply || [])}
					}
				});
			}
		}


		await Bill.updateOne({_id: billData._id}, {
			$set: {
				cancelled: true,
				cancel_reason: cancelObj.cancel_reason,
				cancel_remark: cancelObj.cancel_remark,
				status: constant.billStatus[2],
				last_modified_by: req.user.full_name,
				last_modified_at: new Date()
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

router.put('/acknowledgeBill/:_id', async function (req, res, next) {

	try {
		let id = req.params._id || false;
		let date = req.body.date || false;
		req.body.remark = req.body.remark.trim() || '';

		if (!(id && date))
			throw new Error('Mandatory fields are required');

		let data = await billsServiceNew.acknowledgeSalesBill(id, req.body, req);
		req.body.ids = [];
		req.body.ids.push(data);
		if(req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.account && req.clientConfig.config.account.autoImport){
			let importData = await voucherService.importAccountsV2(req,res,next);
		}
		return res.status(200).json({
			status: "OK",
			message: 'Bill Successfully Acknowledged',
		});

	} catch (e) {
		return res.status(500).json({
			status: "ERROR",
			message: e.toString(),
			error: e,
		});
	}

});

router.put('/approveBill/:_id', function (req, res, next) {
	let approveObj = req.body;
	approveObj.status = true;
	approveObj.date = new Date();
	approveObj.user = req.user._id;
	Bill.find({_id: req.params._id}).then(async function (billData) {
		if (billData && (billData = billData[0])) {
			var billData = JSON.parse(JSON.stringify(billData));
			if (billData.approve && billData.approve.status === true) {
				return res.status(500).json({
					status: "OK",
					message: "Bill Already Approve"
				});
			} else {
				Bill.findOneAndUpdate({_id: req.params._id}, {
					$set: {
						status: constant.billStatus[1],
						approve: approveObj,
						last_modified_by: req.user.full_name,
						last_modified_at: new Date()
						//billDate: req.body.billDate
					}
				}).then(async updateBill => {

					return res.status(200).json({
						status: "OK",
						message: "Bill Approved"
					});
				})
					.catch(function (err) {
						return res.status(500).json({
							status: "ERROR",
							message: err
						});
					})
			}
		} else {
			return res.status(500).json({
				status: "ERROR",
				message: "Bill Id not Found"
			});
		}
	})
		.catch(next);
});

router.put('/dispatchBill/:_id', function (req, res, next) {
	return res.status(500).json({
		status: "ERROR",
		message: "Service Blocked Contact Administrator."
	});

	let dispatchObj = req.body;
	dispatchObj.status = true;
	dispatchObj.date = new Date();
	dispatchObj.user = req.user._id;
	Bill.findOne({_id: req.params._id}).then(billData => {
		if (billData) {
			var billData = JSON.parse(JSON.stringify(billData));
			if (billData.approve && billData.approve.status === true) {
				if (billData.dispatch && billData.dispatch.status === true) {
					res.status(500).json({
						status: "ERROR",
						message: "Bill Already Dispatched"
					});
				}
				Bill.findOneAndUpdate({_id: req.params._id}, {
					$set: {
						status: constant.billStatus[3],
						dispatch: dispatchObj
					}
				}).then(updateBill => {
					res.status(200).json({
						status: "OK",
						message: "Bill Dispatched"
					});
				})
					.catch(function (err) {
						res.status(500).json({
							status: "ERROR",
							message: err
						});
					})
			} else {
				res.status(500).json({
					status: "ERROR",
					message: "Bill Not Approved"
				});

			}
		} else {
			res.status(500).json({
				status: "ERROR",
				message: "Bill Id not Found"
			});
		}
	})
		.catch(next);
});

router.post('/driver', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.user.clientId})
		.then(function (client) {
			if (client && client[0]) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				req.body.client_full_name = clientData.client_full_name;
				req.body.client_gstin_no = clientData.gstin_no;
				req.body.client_iso = clientData.client_iso;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_subtitle = clientData.client_subtitle;
				req.body.client_t_n_c = clientData.client_t_n_c;
				req.body.client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address.country ? clientData.client_address.country : "");
				req.body.client_primary_contact_no = clientData.client_primary_contact_no;
				req.body.client_fax = clientData.client_fax;
				req.body.client_pan_no = clientData.client_pan_no;
				req.body.client_primary_email = clientData.client_primary_email;
				req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
				billsService.generateDriverPdfAsync(req.body, req.body.clientId)
					.then(function (url) {
						res.status(200).json({
							url: domain + url
						});
						res.send();
					}).catch(function (e) {
					return res.status(500).json({
						"status": "ERROR",
						"message": e
					});
				});
			}
		})
});

/*router.post('/driver', function(req, res) {
    billsService.generateDriverPdfAsync(req.body, req.body.clientId)
        .then(function(url) {
            res.status(200).json({
                url: domain + url
            });
            res.send();
        }).catch(function(e) {
            return res.status(500).json({
                "status": "ERROR",
                "message": e
            });
        });
});*/

router.post('/builty', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			var data = req.body;
			var clientData = JSON.parse(JSON.stringify(client[0]));
			req.body.client_full_name = clientData.client_full_name;
			req.body.clientId = clientData.clientId;
			req.body.client_iso = clientData.client_iso;
			req.body.client_display_line_1 = clientData.client_display_line_1;
			req.body.client_display_line_2 = clientData.client_display_line_2;
			req.body.client_display_line_3 = clientData.client_display_line_3;
			req.body.client_display_line_4 = clientData.client_display_line_4;
			req.body.client_subtitle = clientData.client_subtitle;
			req.body.client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
				(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
				(clientData.client_address.country ? clientData.client_address.country : "");
			req.body.client_primary_contact_no = clientData.client_primary_contact_no;
			req.body.client_fax = clientData.client_fax;
			req.body.client_pan_no = clientData.client_pan_no;
			req.body.client_primary_email = clientData.client_primary_email;
			req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
				+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
			//delete data.client_address;
			billsService.generateBuiltyPdfAsync(data, req.body.clientId)
				.then(function (url) {
					res.status(200).json({
						url: domain + url
					});
					res.send();
				}).catch(function (e) {
				return res.status(500).json({
					"status": "ERROR",
					"message": e
				});
			});
		});

});

router.post('/diesel', function (req, res) {

	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			var data = req.body;
			for (var i = 0; i < data.length; i++) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				data[i].client_full_name = clientData.client_full_name;
				req.body.client_iso = clientData.client_iso;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_subtitle = clientData.client_subtitle;
				data[i].client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address.country ? clientData.client_address.country : "");
				data[i].client_primary_contact_no = clientData.client_primary_contact_no;
				data[i].client_fax = clientData.client_fax;
				data[i].client_pan_no = clientData.client_pan_no;
				data[i].client_primary_email = clientData.client_primary_email;
				data[i].client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
			}

			//delete data.client_address;
			billsService.generateDieselPdfsAsync(data, req.body.clientId)
				.then(function (url) {
					res.status(200).json({
						url: domain + url
					});
					res.send();
				}).catch(function (e) {
				return res.status(500).json({
					"status": "ERROR",
					"message": e
				});
			});
		});

});

router.post('/invoice', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			if (client && client[0]) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				req.body.client_full_name = clientData.client_full_name;
				req.body.client_gstin_no = clientData.gstin_no;
				req.body.client_iso = clientData.client_iso;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_subtitle = clientData.client_subtitle;
				req.body.client_t_n_c = clientData.client_t_n_c;
				req.body.client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address.country ? clientData.client_address.country : "");
				req.body.client_primary_contact_no = clientData.client_primary_contact_no;
				req.body.client_fax = clientData.client_fax;
				req.body.client_pan_no = clientData.client_pan_no;
				req.body.client_primary_email = clientData.client_primary_email;
				req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
				billsService.generateInvoicePdfAsync(req.body, req.body.clientId)
					.then(function (url) {
						res.status(200).json({
							url: 'http://' + commonUtil.getConfig('download_host') + ':'
								+ commonUtil.getConfig('download_port') + '/' + url
						});
						res.send();
					}).catch(function (e) {
					return res.status(500).json({
						"status": "ERROR",
						"message": e
					});
				});
			}
		})
});

router.post('/inv_inward', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			if (client && client[0]) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				req.body.client_full_name = clientData.client_full_name;
				req.body.client_gstin_no = clientData.gstin_no;
				req.body.client_iso = clientData.client_iso;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_subtitle = clientData.client_subtitle;
				req.body.client_t_n_c = clientData.client_t_n_c;
				req.body.client_address = (clientData.client_address && clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address && clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address && clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address && clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address && clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address && clientData.client_address.country ? clientData.client_address.country : "");
				req.body.client_primary_contact_no = clientData.client_primary_contact_no;
				req.body.client_fax = clientData.client_fax;
				req.body.client_pan_no = clientData.client_pan_no;
				req.body.client_primary_email = clientData.client_primary_email;
				req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
				billsService.generateInventoryInwardPdfAsync(req.body, req.body.clientId)
					.then(function (url) {
						res.status(200).json({
							url: 'http://' + commonUtil.getConfig('download_host') + ':'
								+ commonUtil.getConfig('download_port') + '/' + url
						});
						res.send();
					}).catch(function (e) {
					return res.status(500).json({
						"status": "ERROR",
						"message": e
					});
				});
			}
		})
});

router.post('/tool_inv_inward', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			if (client && client[0]) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				req.body.client_full_name = clientData.client_full_name;
				req.body.client_gstin_no = clientData.gstin_no;
				req.body.client_iso = clientData.client_iso;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_subtitle = clientData.client_subtitle;
				req.body.client_t_n_c = clientData.client_t_n_c;
				req.body.client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address.country ? clientData.client_address.country : "");
				req.body.client_primary_contact_no = clientData.client_primary_contact_no;
				req.body.client_fax = clientData.client_fax;
				req.body.client_pan_no = clientData.client_pan_no;
				req.body.client_primary_email = clientData.client_primary_email;
				req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
				billsService.generateToolInventoryInwardPdfAsync(req.body, req.body.clientId)
					.then(function (url) {
						res.status(200).json({
							url: 'http://' + commonUtil.getConfig('download_host') + ':'
								+ commonUtil.getConfig('download_port') + '/' + url
						});
						res.send();
					}).catch(function (e) {
					return res.status(500).json({
						"status": "ERROR",
						"message": e
					});
				});
			}
		})
});

router.post('/tyre_inv_inward', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			if (client && client[0]) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				req.body.client_full_name = clientData.client_full_name;
				req.body.client_gstin_no = clientData.gstin_no;
				req.body.client_iso = clientData.client_iso;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_subtitle = clientData.client_subtitle;
				req.body.client_t_n_c = clientData.client_t_n_c;
				req.body.client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address.country ? clientData.client_address.country : "");
				req.body.client_primary_contact_no = clientData.client_primary_contact_no;
				req.body.client_fax = clientData.client_fax;
				req.body.client_pan_no = clientData.client_pan_no;
				req.body.client_primary_email = clientData.client_primary_email;
				req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
				billsService.generateTyreInventoryInwardPdfAsync(req.body, req.body.clientId)
					.then(function (url) {
						res.status(200).json({
							url: 'http://' + commonUtil.getConfig('download_host') + ':'
								+ commonUtil.getConfig('download_port') + '/' + url
						});
						res.send();
					}).catch(function (e) {
					return res.status(500).json({
						"status": "ERROR",
						"message": e
					});
				});
			}
		})
});

router.post('/jcd_pdf', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			if (client && client[0]) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				req.body.client_full_name = clientData.client_full_name;
				req.body.client_gstin_no = clientData.gstin_no;
				req.body.client_iso = clientData.client_iso;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_subtitle = clientData.client_subtitle;
				req.body.client_t_n_c = clientData.client_t_n_c;
				req.body.client_address = (clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address.country ? clientData.client_address.country : "");
				req.body.client_primary_contact_no = clientData.client_primary_contact_no;
				req.body.client_fax = clientData.client_fax;
				req.body.client_pan_no = clientData.client_pan_no;
				req.body.client_primary_email = clientData.client_primary_email;
				req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
				billsService.generateJcdPdfAsync(req.body, req.body.clientId)
					.then(function (url) {
						res.status(200).json({
							url: 'http://' + commonUtil.getConfig('download_host') + ':'
								+ commonUtil.getConfig('download_port') + '/' + url
						});
						res.send();
					}).catch(function (e) {
					return res.status(500).json({
						"status": "ERROR",
						"message": e
					});
				});
			}
		})
});

router.post('/po', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			if (client && client[0]) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				req.body.client_full_name = clientData.client_full_name;
				req.body.client_iso = clientData.client_iso;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_subtitle = clientData.client_subtitle;
				req.body.client_address = (clientData.client_address && clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address && clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address && clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address && clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address && clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address && clientData.client_address.country ? clientData.client_address.country : "");
				req.body.client_primary_contact_no = clientData.client_primary_contact_no;
				req.body.client_fax = clientData.client_fax;
				req.body.client_pan_no = clientData.client_pan_no;
				req.body.client_primary_email = clientData.client_primary_email;
				req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";


				let defaultPath = path.resolve(projectHome, "hbs", "maintenance", "po.hbs");

				if(defaultPath)
						res.render(defaultPath, {
							templateData: req.body
						});
				// billsService.generatePOPdfAsync(req.body, req.body.clientId)
				// 	.then(function (url) {
				// 		res.status(200).json({
				// 			url: 'http://' + commonUtil.getConfig('download_host') + ':'
				// 				+ commonUtil.getConfig('download_port') + '/' + url
				// 		});
				// 		res.send();
				// 	}).catch(function (e) {
				// 	return res.status(500).json({
				// 		"status": "ERROR",
				// 		"message": e
				// 	});
				// });
			}
		})
});

router.post('/issueSlip', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			if (client && client[0]) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				req.body.client_full_name = clientData.client_full_name;
				req.body.client_iso = clientData.client_iso;
				req.body.client_subtitle = clientData.client_subtitle;
				req.body.client_address = clientData.client_address ? ((clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address.country ? clientData.client_address.country : "")) : "";
				req.body.client_primary_contact_no = clientData.client_primary_contact_no;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_fax = clientData.client_fax;
				req.body.client_pan_no = clientData.client_pan_no;
				req.body.client_primary_email = clientData.client_primary_email;
				req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
				req.body.total = 0;

				for(const d of req.body.issued_spare){
					req.body.total += (d.quantity * d.cost_per_piece);
				}

				let defaultPath = path.resolve(projectHome, "hbs", "maintenance", "issueSlip.hbs");

				if(defaultPath)
					res.render(defaultPath, {
						templateData: req.body
					});
				// billsService.generateIssueSlipPdfAsync(req.body, req.body.clientId)
				// 	.then(function (url) {
				// 		res.status(200).json({
				// 			url: 'http://' + commonUtil.getConfig('download_host') + ':'
				// 				+ commonUtil.getConfig('download_port') + '/' + url
				// 		});
				// 		res.send();
				// 	}).catch(function (e) {
				// 	return res.status(500).json({
				// 		"status": "ERROR",
				// 		"message": e
				// 	});
				// });
			}
		})
});

router.post('/dieselSlip', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			if (client && client[0]) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				req.body.client_full_name = clientData.client_full_name;
				req.body.client_iso = clientData.client_iso;
				req.body.client_subtitle = clientData.client_subtitle;
				req.body.client_address = clientData.client_address ? ((clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address.country ? clientData.client_address.country : "")) : "";
				req.body.client_primary_contact_no = clientData.client_primary_contact_no;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_fax = clientData.client_fax;
				req.body.client_pan_no = clientData.client_pan_no;
				req.body.client_primary_email = clientData.client_primary_email;
				req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
				billsService.generateDieselSlipPdfAsync(req.body, req.body.clientId)
					.then(function (url) {
						res.status(200).json({
							url: 'http://' + commonUtil.getConfig('download_host') + ':'
								+ commonUtil.getConfig('download_port') + '/' + url
						});
						res.send();
					}).catch(function (e) {
					return res.status(500).json({
						"status": "ERROR",
						"message": e
					});
				});
			}
		})
});

router.post('/tyreIssueSlip', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			if (client && client[0]) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				req.body.client_full_name = clientData.client_full_name;
				req.body.client_iso = clientData.client_iso;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_subtitle = clientData.client_subtitle;
				req.body.client_address = clientData.client_address ? ((clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address.country ? clientData.client_address.country : "")) : "";
				req.body.client_primary_contact_no = clientData.client_primary_contact_no;
				req.body.client_fax = clientData.client_fax;
				req.body.client_pan_no = clientData.client_pan_no;
				req.body.client_primary_email = clientData.client_primary_email;
				req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
				JobCardService.findJobCardAsync({clientId: req.body.clientId, jobId: req.body.jobId})
					.then(function (jobCard) {
						if (jobCard && jobCard[0]) {
							req.body.driver_name = jobCard[0].driver_name;
							req.body.driver_contact = jobCard[0].driver_contact;
							billsService.generateTyreIssueSlipPdfAsync(req.body, req.body.clientId)
								.then(function (url) {
									res.status(200).json({
										url: 'http://' + commonUtil.getConfig('download_host') + ':'
											+ commonUtil.getConfig('download_port') + '/' + url
									});
									res.send();
								}).catch(function (e) {
								return res.status(500).json({
									"status": "ERROR",
									"message": e
								});
							});
						} else {
							return res.status(500).json({
								"status": "ERROR",
								"message": "Job card not found"
							});
						}
					})

			}
		})
});

router.post('/tyreRetreadIssueSlip', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			if (client && client[0]) {
				var clientData = JSON.parse(JSON.stringify(client[0]));
				req.body.client_full_name = clientData.client_full_name;
				req.body.client_iso = clientData.client_iso;
				req.body.client_display_line_1 = clientData.client_display_line_1;
				req.body.client_display_line_2 = clientData.client_display_line_2;
				req.body.client_display_line_3 = clientData.client_display_line_3;
				req.body.client_display_line_4 = clientData.client_display_line_4;
				req.body.client_subtitle = clientData.client_subtitle;
				req.body.client_address = clientData.client_address ? ((clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
					(clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address.state ? clientData.client_address.state : "") + " " +
					(clientData.client_address.country ? clientData.client_address.country : "")) : "";
				req.body.client_primary_contact_no = clientData.client_primary_contact_no;
				req.body.client_fax = clientData.client_fax;
				req.body.client_pan_no = clientData.client_pan_no;
				req.body.client_primary_email = clientData.client_primary_email;
				req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
					+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
				billsService.generateTyreRetreadIssueSlipPdfAsync(req.body, req.body.clientId)
					.then(function (url) {
						res.status(200).json({
							url: 'http://' + commonUtil.getConfig('download_host') + ':'
								+ commonUtil.getConfig('download_port') + '/' + url
						});
						res.send();
					}).catch(function (e) {
					return res.status(500).json({
						"status": "ERROR",
						"message": e
					});
				});
			}
		})
});

router.post('/prSlip', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			var data = req.body;
			var clientData = JSON.parse(JSON.stringify(client[0]));
			req.body.client_full_name = clientData.client_full_name;
			req.body.client_iso = clientData.client_iso;
			req.body.client_display_line_1 = clientData.client_display_line_1;
			req.body.client_display_line_2 = clientData.client_display_line_2;
			req.body.client_display_line_3 = clientData.client_display_line_3;
			req.body.client_display_line_4 = clientData.client_display_line_4;
			req.body.client_subtitle = clientData.client_subtitle;
			req.body.client_address = (clientData.client_address && clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address && clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
				(clientData.client_address && clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address && clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address && clientData.client_address.state ? clientData.client_address.state : "") + " " +
				(clientData.client_address && clientData.client_address.country ? clientData.client_address.country : "");
			req.body.client_primary_contact_no = clientData.client_primary_contact_no;
			req.body.client_fax = clientData.client_fax;
			req.body.client_pan_no = clientData.client_pan_no;
			req.body.client_primary_email = clientData.client_primary_email;
			req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
				+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
			if (req.body.exportToExcel == "true") {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "PR slip excel download available.",
						"url": data.url
					});
				}

				ReportExelService.generatePrSlipExcel(data, req.body.clientId, ReportResponse);
			} else {
				return billsService.generatePrSlipPdfAsync(data, req.body.clientId)
					.then(function (url) {
						res.status(200).json({
							url: domain + url
						});
						res.send();
					}).catch(function (e) {
						return res.status(500).json({
							"status": "ERROR",
							"message": e
						});
					});
			}
		});
});

router.post('/serviceSlip', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			var data = req.body;
			var clientData = JSON.parse(JSON.stringify(client[0]));
			req.body.client_full_name = clientData.client_full_name;
			req.body.client_iso = clientData.client_iso;
			req.body.client_display_line_1 = clientData.client_display_line_1;
			req.body.client_display_line_2 = clientData.client_display_line_2;
			req.body.client_display_line_3 = clientData.client_display_line_3;
			req.body.client_display_line_4 = clientData.client_display_line_4;
			req.body.client_subtitle = clientData.client_subtitle;
			req.body.client_address = (clientData.client_address && clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address && clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
				(clientData.client_address && clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address && clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address && clientData.client_address.state ? clientData.client_address.state : "") + " " +
				(clientData.client_address && clientData.client_address.country ? clientData.client_address.country : "");
			req.body.client_primary_contact_no = clientData.client_primary_contact_no;
			req.body.client_fax = clientData.client_fax;
			req.body.client_pan_no = clientData.client_pan_no;
			req.body.client_primary_email = clientData.client_primary_email;
			req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
				+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
			billsService.generateServiceSlipPdfAsync(data, req.body.clientId)
				.then(function (url) {
					res.status(200).json({
						url: domain + url
					});
					res.send();
				}).catch(function (e) {
				return res.status(500).json({
					"status": "ERROR",
					"message": e
				});
			});
		});

});

router.post('/poQuote', function (req, res) {
	ClientService.findClientByQueryAsync({"clientId": req.body.clientId})
		.then(function (client) {
			var data = req.body;
			var clientData = JSON.parse(JSON.stringify(client[0]));
			req.body.client_full_name = clientData.client_full_name;
			req.body.client_iso = clientData.client_iso;
			req.body.client_display_line_1 = clientData.client_display_line_1;
			req.body.client_display_line_2 = clientData.client_display_line_2;
			req.body.client_display_line_3 = clientData.client_display_line_3;
			req.body.client_display_line_4 = clientData.client_display_line_4;
			req.body.client_subtitle = clientData.client_subtitle;
			req.body.client_address = (clientData.client_address && clientData.client_address.line1 ? clientData.client_address.line1 : "") + " " + (clientData.client_address && clientData.client_address.line2 ? clientData.client_address.line2 : "") + " " +
				(clientData.client_address && clientData.client_address.district ? clientData.client_address.district : "") + " " + (clientData.client_address && clientData.client_address.city ? clientData.client_address.city : "") + " " + (clientData.client_address && clientData.client_address.state ? clientData.client_address.state : "") + " " +
				(clientData.client_address && clientData.client_address.country ? clientData.client_address.country : "");
			req.body.client_primary_contact_no = clientData.client_primary_contact_no;
			req.body.client_fax = clientData.client_fax;
			req.body.client_pan_no = clientData.client_pan_no;
			req.body.client_primary_email = clientData.client_primary_email;
			req.body.client_logo = 'http://' + commonUtil.getConfig('download_host') + ':'
				+ commonUtil.getConfig('download_port') + '/users/' + req.body.clientId + "/logo.jpg";
			billsService.generatepoQuotePdfAsync(data, req.body.clientId)
				.then(function (url) {
					res.status(200).json({
						url: domain + url
					});
					res.send();
				}).catch(function (e) {
				return res.status(500).json({
					"status": "ERROR",
					"message": e
				});
			});
		});

});

// purchase Bill Route's
// pur => pruchase
// router.post('/purGet', async function (req, res, next) {
// 	billsServiceNew.getAllPurchaseBillsAsync(req.body)
// 		.then(function (data) {
// 			if (req.body.download && req.body.billType == 'Diesel') {
// 				ReportExelService.purGetDieselReport(data.data, req.user.clientId, function (d) {
// 					return res.status(200).json({
// 						'status': 'OK',
// 						'message': 'report download available.',
// 						'url': d.url
// 					});
// 				});
// 			} else if (req.body.download) {
// 				ReportExelService.purGetReport(data.data, req.user.clientId, function (d) {
// 					return res.status(200).json({
// 						'status': 'OK',
// 						'message': 'report download available.',
// 						'url': d.url
// 					});
// 				});
// 			} else {
//
// 				// converting vendor array account to object
// 				for (let o of data.data) {
// 					if (o.vendor && o.vendor.account && Array.isArray(o.vendor.account) && o.vendor.account.length) {
// 						let obj = o.vendor.account.find(cId => cId.clientId === req.body.cClientId);
// 						o.vendor.account = obj;
// 					}
// 				}
//
// 				return res.status(200).json({
// 					"status": "OK",
// 					"message": "Purchase Bills found",
// 					...data
// 				});
// 			}
//
// 		}).catch(next);
// });

router.post('/purGet', async function (req, res, next) {

	try {
		let data = await billsServiceNew.getAllPurchaseBills(req.body);
		// .then(function (data) {
		if (req.body.download && req.body.billType == 'Diesel' && !(req.body.rptType)) {
			ReportExelService.purGetDieselReport(data, req.user.clientId, function (d) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': d.url
				});
			});
		} else if (req.body.download && req.body.rptType) {
			ReportExelService.purchaseBillSpareParts(data, req.body.billType, req.user.clientId, function (d) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': d.url
				});
			});
		} else if (req.body.download) {
			ReportExelService.purGetReport(data, req.user.clientId, function (d) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': d.url
				});
			});
		} else {

			// converting vendor array account to object
			for (let o of data) {
				if (o.vendor && o.vendor.account && Array.isArray(o.vendor.account) && o.vendor.account.length) {
					let obj = o.vendor.account.find(cId => cId.clientId === req.body.cClientId);
					o.vendor.account = obj;
				}
			}

			return res.status(200).json({
				"status": "OK",
				"message": "Purchase Bills found",
				data: data
			});
		}
		//).catch(next);
	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
			err: e
		});
	}

});

router.post('/dieselQtyMonthly', async function (req, res, next) {
	if (!req.body.from || !req.body.to) {
		return res.status(200).json({
			'status': 'ERROR',
			'message': 'please select from and to date',
		});
	}
	var end = moment(req.body.to);
	var start = moment(req.body.from);
	let daysDiff = end.diff(start, 'days');
	if (daysDiff > 181) {
		return res.status(200).json({
			'status': 'ERROR',
			'message': 'please select date range less than 6 month'
		});
	}
	billsService.getAllPurchaseBillsByGroupAsync(req.body)
		.then(function (data) {
			if (req.body.download && ['diesel', 'dieselLtr'].indexOf(req.body.download) != -1) {
				ReportExelService.purGetDieselMonthly(data.data, req.user.clientId, {
					to: req.body.to,
					from: req.body.from,
					aggrOn: req.body.download === 'dieselLtr' ? 'ltr' : 'amt'
				}, function (d) {
					return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					});
				});
			} else if (req.body.download && ['combineDieselLtr', 'combineDiesel'].indexOf(req.body.download) != -1) {
				ReportExelService.purGetCombineDieselMonthly(data.data, req.user.clientId, {
					to: req.body.to,
					from: req.body.from,
					aggrOn: req.body.download === 'combineDieselLtr' ? 'ltr' : 'amt'
				}, function (d) {
					return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					});
				});
			} else if (req.body.download && ['combineDieselLtrDaywise', 'combineDieselDaywise'].indexOf(req.body.download) != -1) {
				ReportExelService.purGetCombineDieselDaywise(data.data, req.user.clientId, {
					to: req.body.to,
					from: req.body.from,
					aggrOn: req.body.download === 'combineDieselLtrDaywise' ? 'ltr' : 'amt'
				}, function (d) {
					return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					});
				});
			} else if (req.body.download) {
				ReportExelService.purGetReport(data.data, req.user.clientId, function (d) {
					return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					});
				});
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "Purchase Bills found",
					...data
				});
			}

		}).catch(next);
});

// purchase Bill Assets Route's
router.post('/purAssetsGet', async function (req, res, next) {

	try {
		req.body.billType = 'Assets';
		let data = await billsServiceNew.getAllPurchaseBills(req.body);
		// .then(function (data) {
		if (data) {

			// converting vendor array account to object
			for (let o of data) {
				if (o.vendor && o.vendor.account && Array.isArray(o.vendor.account) && o.vendor.account.length) {
					let obj = o.vendor.account.find(cId => cId.clientId === req.body.cClientId);
					o.vendor.account = obj;
				}
			}
			return res.status(200).json({
				"status": "OK",
				"message": "Purchase Bills found",
				data: data
			});
		} else {
			return res.status(500).json({
				message: 'No Data Found',
				data: Null
			});
		}
		//).catch(next);
	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
			err: e
		});
	}

});

router.post('/purAssetsAdd', async function (req, res) {

	try {

		let body = req.body;
		if (!body)
			throw new Error('Bad Request');
		if (!body.refNo)
			throw new Error('Ref No. is Mandatory');
		if (!body.vendor)
			throw new Error('vendor is Mandatory');
		if (!body.branch)
			throw new Error('branch is Mandatory');
		if (!(body.assetItems && body.assetItems.length))
			throw new Error('assets data not found');
		let updateAssets = [];

		if (body.assetItems && body.assetItems.length) {
			for (let obj of body.assetItems) {
				let oAssets = await Assets.findOne({_id: obj._id}).lean();
				if (oAssets) {
					oAssets.qty = obj.qty;
					oAssets.rate = obj.rate;
					oAssets.amount = obj.rate * obj.qty;
					oAssets.uId = obj.uId;
				}
				if (oAssets && oAssets.purBill) {
					delete oAssets.purBill;
					delete oAssets._id;
					// delete oAssets.uId;
					let oData = await assetsService.saveAssets(oAssets, req.user);
					oAssets._id = oData._id;
					obj._id = oData._id;
					updateAssets.push(oAssets);
				} else if (!(oAssets && oAssets.purBill)) {
					updateAssets.push(oAssets);
				}
			}
		}


		let billObj = {
			clientId: req.user.clientId,
			...req.body,
		};

		if (billObj.refNo) {

			let foundPurchaseBill = await PurchaseBill.findOne({
				refNo: billObj.refNo
			});

			if (foundPurchaseBill && foundPurchaseBill._id)
				throw new Error('Ref No already used');

			if (req.body.stationaryId)
				billObj.stationaryId = req.body.stationaryId;
			else {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: billObj.refNo,
					type: 'Ref No',
					clientId: req.user.clientId
				});

				if (foundStationary) {
					billObj.stationaryId = foundStationary._id;
				}
			}

			let stationaryId = billObj.stationaryId || false;
			let foundStationary = (stationaryId && (await billStationaryService.isUsed(stationaryId)));

			if (foundStationary && foundStationary._id)
				throw new Error('Ref No already used');
		} else {
			throw new Error('Ref No. is Mandatory');
		}

		if (req.body.itemsType === 'materials') {
			billObj['materialItems'] = req.body.materialItems;
			billObj.totMaterial = req.body.totMaterial;
		}

		// saving data to DB
		billObj = new PurchaseBill(billObj);

		let data = await billObj.save();

		if (billObj.stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: data._id,
				modelName: 'purchaseBill',
				stationaryId: billObj.stationaryId,
			}, 'used');
		}


		if (req.body.acknowledge)
			await billsServiceNew.acknowledgePurAssetsBill(data._id, req.body, req);

		if (updateAssets && updateAssets.length) {
			for (let oAssets of updateAssets) {
				// oAssets.purBill = data._id;
				await Assets.updateOne({_id: oAssets._id}, {
					$set: {
						qty: oAssets.qty,
						rate: oAssets.rate,
						amount: oAssets.rate * oAssets.qty,
						uId: oAssets.uId,
						purBill: data._id
					}
				});
				// await assetsService.updateAssets(oAssets, req.user, oAssets._id);
			}

		}


		return res.status(200).json({
			message: `Purchase Bill Successfully Generated for Bill No. ${billObj.billNo}`,
			data
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
			err: e
		});
	}
});

router.post('/purAssetsUpdate/:_id', async function (req, res) {

	const ALLOWED_KEY_TO_UPDATE = ['vendor', 'account', 'tdsRate', 'gstn', 'state_name', 'state_code', 'advanceType', 'billType', 'plainVoucher', 'billDate', 'billNo', 'itemsType', 'items',
		'materialItems', 'from_account', 'refNo', 'branch', 'stationaryId', 'aDiscount', 'totDiscount', 'totMaterial', 'totItem', 'cGST', 'cGSTPercent', 'cgstAcnt', 'iGST', 'iGSTPercent',
		'igstAcnt', 'sGST', 'sGSTPercent', 'sgstAcnt', 'tdsAc', 'labourAc', 'amount', 'tdsAmt', 'labourAmt', 'paidAmount', 'adjDebitAc', 'totalAmount', 'billAmount', 'adjAmount', 'remark', 'from_accountName', 'accountName',
		'igstAcntName', 'sgstAcntName', 'cgstAcntName', 'labourAcName', 'tdsAcName', 'adjDebitAcName', 'discountAcName', 'discountAcnt', 'labRepItems', 'assetItems'
	];
	if (!req.params._id)
		throw new Error('Mandatory Fields are required');

	let body = req.body;
	body._id = body._id || req.params._id;
	if (!(body.assetItems && body.assetItems.length))
		throw new Error('assets data not found');

	let updateAssets = [];
	let addAssets = [];

	if (body.assetItems && body.assetItems.length) {
		for (let obj of body.assetItems) {
			let oAssets = await Assets.findOne({_id: obj._id}).lean();
			if (oAssets) {
				oAssets.qty = obj.qty;
				oAssets.rate = obj.rate;
				oAssets.amount = obj.rate * obj.qty;
				oAssets.uId = obj.uId;
			}
			if (oAssets.purBill && (oAssets.purBill).toString() != (body._id).toString()) {
				delete oAssets.purBill;
				delete oAssets._id;
				let data = await assetsService.saveAssets(oAssets, req.user);
				oAssets._id = data._id;
				obj._id = data._id;
				updateAssets.push(oAssets);
			} else {
				updateAssets.push(oAssets);
			}
		}
	}

	try {

		let foundPurchaseBill = await PurchaseBill.findOne({
			_id: req.params._id
		}).lean();

		if (!foundPurchaseBill)
			throw new Error('Purchase Bill Not Found');

		//Checking is voucher Gen
		if (foundPurchaseBill.plainVoucher) {
			throw new Error('Cannot Edit because Voucher is generated. Please Unapprove the Bill.');
		}

		if (!req.body.refNo)
			throw new Error('Ref No. is Mandatory');

		let billObj = {...otherUtil.pickPropertyFromObject(req.body, ALLOWED_KEY_TO_UPDATE)};

		billObj.aDiscount = billObj.aDiscount || [];

		billObj.remark = billObj.remark || '';

		if (billObj.refNo) {
			let refNo = billObj.refNo;
			let stationaryId;

			if (foundPurchaseBill.refNo !== refNo) { // if new refNo doesn't match with saved refNo

				let isRefUsed = await PurchaseBill.findOne({  // is the new refNo already exists on other purchase bill
					refNo,
					_id: {
						$ne: req.params._id
					}
				});

				if (isRefUsed && isRefUsed._id)
					throw new Error('Ref No already used');

				// if stationary provided the use the stationary id else check that new refNo exists in stationary or not
				if (billObj.stationaryId)
					stationaryId = billObj.stationaryId;
				else {
					let foundStationary = await billStationaryService.findByRefAndType({
						bookNo: refNo,
						type: 'Ref No',
						clientId: req.user.clientId
					});

					if (foundStationary) {
						stationaryId = foundStationary._id;
					}
				}

				// check the status of stationary id i.e. it is used or not
				if (stationaryId && (await billStationaryService.isUsed(stationaryId)))
					throw new Error('Ref No already used');

				billObj.refNo = refNo;

				// if stationary id is provided then update the stationary id else unset the stationary id
				if (stationaryId)
					billObj.stationaryId = stationaryId;
				else if (foundPurchaseBill.stationaryId) {
					await PurchaseBill.findOneAndUpdate({
						_id: req.params._id
					}, {
						$unset: {
							'stationaryId': 1
						}
					});
				}

				if (foundPurchaseBill.stationaryId) {
					await billStationaryService.updateStatus({
						userName: req.user.full_name,
						docId: foundPurchaseBill._id,
						modelName: 'purchaseBill',
						stationaryId: foundPurchaseBill.stationaryId,
					}, 'cancelled');
				}
			}
		} else {
			if (foundPurchaseBill.refNo) {
				await PurchaseBill.findOneAndUpdate({
					_id: req.params._id
				}, {
					$unset: {
						'stationaryId': 1,
						'refNo': 1
					}
				});
			}
		}

		let data = await PurchaseBill.findOneAndUpdate({
			_id: req.params._id
		}, {
			$set: billObj
		});

		if (foundPurchaseBill.refNo !== req.body.refNo && billObj.stationaryId)
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: foundPurchaseBill._id,
				modelName: 'purchaseBill',
				stationaryId: billObj.stationaryId,
			}, 'used');

		if (req.body.acknowledge)
			await billsServiceNew.acknowledgePurAssetsBill(req.params._id, req.body, req);

		if (updateAssets && updateAssets.length) {
			for (let oAssets of updateAssets) {
				await Assets.updateOne({_id: oAssets._id}, {
					$set: {
						qty: oAssets.qty,
						rate: oAssets.rate,
						amount: oAssets.rate * oAssets.qty,
						uId: oAssets.uId,
						purBill: data._id
					}
				});
				// await assetsService.updateAssets(oAssets, req.user, oAssets._id);
			}
		}

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

router.post('/purAssetsRemove/:_id', async function (req, res) {

	try {

		/*
		* it will check that voucher's(Main voucher and Discount voucher) shouldn't be created
		* if its any advances are linked than, its should be unlinked
		* then every things OK, can remove the bill document
		* */

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		let oPurchaseBill = await PurchaseBill.findOne({_id: req.params._id}, {
			plainVoucher: 1,
			stationaryId: 1,
			assetItems: 1
		}).lean();

		if (oPurchaseBill.plainVoucher)
			throw new Error('Cannot remove Voucher is generated');


		if (oPurchaseBill && oPurchaseBill.assetItems)
			for (let oPur of oPurchaseBill.assetItems) {
				await Assets.update({
					_id: oPur._id
				}, {
					$unset: {
						purBill: 1,
					}
				});
			}

		if (oPurchaseBill.stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: oPurchaseBill._id,
				modelName: 'purchaseBill',
				stationaryId: oPurchaseBill.stationaryId,
			}, 'cancelled');
		}

		await PurchaseBill.remove({_id: oPurchaseBill._id});


		return res.status(200).json({
			message: 'Bill Successfully Deleted'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.post('/purAssetsUnappove/:_id', async function (req, res) {

	try {

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		let oPurchaseBill = await PurchaseBill.findOne({_id: req.params._id}, {
			plainVoucher: 1,
			aDiscount: 1,
			assetItems: 1
		}).lean();
		let aRemoveVoucher = [];

		if (!oPurchaseBill.plainVoucher)
			throw new Error('Voucher not generated');

		let fData = await voucherService.findVoucherByIdAsync(oPurchaseBill.plainVoucher, {acImp: 1});

		if (!(fData && fData._id))
			throw  new Error('Voucher Not Found');

		if (fData.acImp.st)
			throw  new Error('Cannot Unapprove Voucher is imported to A/c');

		if (oPurchaseBill && oPurchaseBill.assetItems)
			for (let oPur of oPurchaseBill.assetItems) {

				let oAssets = await Assets.findOne({_id: oPur._id}, {
					depreciation: 1,
				}).lean();

				if (oAssets.depreciation && oAssets.depreciation.length)
					throw new Error('Cannot Unapprove depreciation calculated on assets');
			}

		aRemoveVoucher.push(oPurchaseBill.plainVoucher);

		for (let oRVch of aRemoveVoucher)
			await voucherService.removeVoucher({
				_id: oRVch
			});

		await PurchaseBill.update({
			_id: oPurchaseBill._id
		}, {
			$unset: {
				plainVoucher: 1,
			}
		});

		return res.status(200).json({
			message: 'Bill Successfully unapproved'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.post('/purAssetsAppove/:_id', async function (req, res) {

	try {

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		let oPurchaseBill = await PurchaseBill.findOne({_id: req.params._id}, {plainVoucher: 1, assetItems: 1}).lean();

		if (oPurchaseBill.plainVoucher)
			throw new Error('Voucher already generated');
		if (req.body) {
			oPurchaseBill.accountName = req.body.accountName,
				oPurchaseBill.discountAcName = req.body.discountAcName,
				oPurchaseBill.igstAcntName = req.body.igstAcntName,
				oPurchaseBill.sgstAcntName = req.body.sgstAcntName,
				oPurchaseBill.cgstAcntName = req.body.cgstAcntName
		}

		if (req.body.acknowledge)
			await billsServiceNew.acknowledgePurAssetsBill(req.params._id, oPurchaseBill, req);


		return res.status(200).json({
			message: 'Bill Successfully approved'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

// Dues Bill Route's
router.post('/duesBillAdd', async function (req, res) {

	try {

		let billObj = {
			clientId: req.user.clientId,
			...req.body,
		};

		if (billObj.refNo) {

			let foundPurchaseBill = await PurchaseBill.findOne({
				refNo: billObj.refNo
			});

			if (foundPurchaseBill && foundPurchaseBill._id)
				throw new Error('Ref No already used');

			if (req.body.stationaryId)
				billObj.stationaryId = req.body.stationaryId;
			else {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: billObj.refNo,
					type: 'Ref No',
					clientId: req.user.clientId
				});

				if (foundStationary) {
					billObj.stationaryId = foundStationary._id;
				}
			}

			let stationaryId = billObj.stationaryId || false;
			let foundStationary = (stationaryId && (await billStationaryService.isUsed(stationaryId)));

			if (foundStationary && foundStationary._id)
				throw new Error('Ref No already used');
		} else {
			throw new Error('Ref No. is Mandatory');
		}

		if (Array.isArray(billObj.duesBillItems)) {
			for (let bill of billObj.duesBillItems) {
				let foundDues = await Dues.findOne({
					_id: bill._id,
					purchaseBill: {
						$exists: true
					}
				}).lean();

				if (foundDues && foundDues._id)
					throw new Error(`Purchase Bill Already Generated on Dues ${foundDues.refNo}`);
			}
		}

		// saving data to DB
		billObj = new PurchaseBill(billObj);

		let data = await billObj.save();

		if (billObj.stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: data._id,
				modelName: 'purchaseBill',
				stationaryId: billObj.stationaryId,
			}, 'used');
		}

		if (Array.isArray(billObj.duesBillItems) && billObj.duesBillItems.length) {

			await Dues.updateMany({
				_id: {
					$in: billObj.duesBillItems
				}
			}, {
				$set: {
					purchaseBill: data._id
				}
			})
		}

		if (req.body.acknowledge)
			await billsServiceNew.acknowledgeBill(data._id, req.body, req);

		return res.status(200).json({
			message: `Purchase Bill Successfully Generated for Bill No. ${billObj.billNo}`,
			data
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
			err: e
		});
	}
});

router.post('/duesBillUpdate/:_id', async function (req, res) {

	const ALLOWED_KEY_TO_UPDATE = ['vendor', 'account', 'tdsRate', 'gstn', 'state_name', 'state_code', 'advanceType', 'billType', 'plainVoucher', 'billDate', 'billNo', 'itemsType', 'items',
		'materialItems', 'from_account', 'refNo', 'branch', 'stationaryId', 'aDiscount', 'totDiscount', 'totMaterial', 'totItem', 'cGST', 'cGSTPercent', 'cgstAcnt', 'iGST', 'iGSTPercent',
		'igstAcnt', 'sGST', 'sGSTPercent', 'sgstAcnt', 'tdsAc', 'labourAc', 'amount', 'tdsAmt', 'labourAmt', 'paidAmount', 'adjDebitAc', 'totalAmount', 'billAmount', 'adjAmount', 'remark', 'from_accountName', 'accountName',
		'igstAcntName', 'sgstAcntName', 'cgstAcntName', 'labourAcName', 'tdsAcName', 'adjDebitAcName', 'discountAcName', 'discountAcnt', 'labRepItems', 'totDues', 'duesBillItems'
	];

	try {

		let foundPurchaseBill = await PurchaseBill.findOne({
			_id: req.params._id
		}).lean();

		let aRemoveItem = [];
		let aAddItem = [];

		if (!foundPurchaseBill)
			throw new Error('Purchase Bill Not Found');

		//Checking is voucher Gen
		if (foundPurchaseBill.plainVoucher) {
			throw new Error('Cannot Edit because Voucher is generated. Please Unapprove the Bill.');
		}

		if (!req.body.refNo)
			throw new Error('Ref No. is Mandatory');

		let billObj = {...otherUtil.pickPropertyFromObject(req.body, ALLOWED_KEY_TO_UPDATE)};

		if (req.body.duesBillItems) {
			aAddItem = [];
			foundPurchaseBill.duesBillItems.forEach(id => {
				let index = billObj.duesBillItems.indexOf(id.toString());
				if (index === -1)
					aRemoveItem.push(id);
				else
					aAddItem.push(id);
			});
		}

		billObj.remark = billObj.remark || '';

		if (billObj.refNo) {
			let refNo = billObj.refNo;
			let stationaryId;

			if (foundPurchaseBill.refNo !== refNo) { // if new refNo doesn't match with saved refNo

				let isRefUsed = await PurchaseBill.findOne({  // is the new refNo already exists on other purchase bill
					refNo,
					_id: {
						$ne: req.params._id
					}
				});

				if (isRefUsed && isRefUsed._id)
					throw new Error('Ref No already used');

				// if stationary provided the use the stationary id else check that new refNo exists in stationary or not
				if (billObj.stationaryId)
					stationaryId = billObj.stationaryId;
				else {
					let foundStationary = await billStationaryService.findByRefAndType({
						bookNo: refNo,
						type: 'Ref No',
						clientId: req.user.clientId
					});

					if (foundStationary) {
						stationaryId = foundStationary._id;
					}
				}

				// check the status of stationary id i.e. it is used or not
				if (stationaryId && (await billStationaryService.isUsed(stationaryId)))
					throw new Error('Ref No already used');

				billObj.refNo = refNo;

				// if stationary id is provided then update the stationary id else unset the stationary id
				if (stationaryId)
					billObj.stationaryId = stationaryId;
				else if (foundPurchaseBill.stationaryId) {
					await PurchaseBill.findOneAndUpdate({
						_id: req.params._id
					}, {
						$unset: {
							'stationaryId': 1
						}
					});
				}

				if (foundPurchaseBill.stationaryId) {
					await billStationaryService.updateStatus({
						userName: req.user.full_name,
						docId: foundPurchaseBill._id,
						modelName: 'purchaseBill',
						stationaryId: foundPurchaseBill.stationaryId,
					}, 'cancelled');
				}
			}
		} else {
			if (foundPurchaseBill.refNo) {
				await PurchaseBill.findOneAndUpdate({
					_id: req.params._id
				}, {
					$unset: {
						'stationaryId': 1,
						'refNo': 1
					}
				});
			}
		}

		let data = await PurchaseBill.findOneAndUpdate({
			_id: req.params._id
		}, {
			$set: billObj
		});

		if (foundPurchaseBill.refNo !== req.body.refNo && billObj.stationaryId)
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: foundPurchaseBill._id,
				modelName: 'purchaseBill',
				stationaryId: billObj.stationaryId,
			}, 'used');

		if (aRemoveItem.length) {
			await Dues.updateMany({
				_id: {
					$in: aRemoveItem
				}
			}, {
				$unset: {
					purchaseBill: 1
				}
			})
		}

		if (aAddItem.length) {
			await Dues.updateMany({
				_id: {
					$in: aAddItem
				}
			}, {
				$set: {
					purchaseBill: req.params._id
				}
			})
		}

		if (req.body.acknowledge)
			await billsServiceNew.acknowledgeBill(req.params._id, req.body, req);

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

// purchase Bill Route's
// pur => pruchase
router.post('/purAdd', async function (req, res) {

	try {

		let billObj = {
			clientId: req.user.clientId,
			createdBy: {date: new Date(),name: req.user.full_name},
			...req.body,
		};

		if (billObj.refNo) {

			let foundPurchaseBill = await PurchaseBill.findOne({
				refNo: billObj.refNo,
				clientId: req.user.clientId
			});

			if (foundPurchaseBill && foundPurchaseBill._id)
				throw new Error('Ref No already used');

			if (req.body.stationaryId)
				billObj.stationaryId = req.body.stationaryId;
			else {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: billObj.refNo,
					type: 'Ref No',
					clientId: req.user.clientId
				});

				if (foundStationary) {
					billObj.stationaryId = foundStationary._id;
				}
			}

			let stationaryId = billObj.stationaryId || false;
			let foundStationary = (stationaryId && (await billStationaryService.isUsed(stationaryId)));

			if (foundStationary && foundStationary._id)
				throw new Error('Ref No already used');
		} else {
			throw new Error('Ref No. is Mandatory');
		}

		if (req.body.billAmount)
			billObj.remAmount = req.body.billAmount;

		if (req.body.aDiscount)
			billObj.aDiscount = req.body.aDiscount;

		if (req.body.totDiscount)
			billObj.totDiscount = req.body.totDiscount;

		if (req.body.itemsType === 'materials') {
			billObj['materialItems'] = req.body.materialItems;
			billObj.totMaterial = req.body.totMaterial;
		} else {
			billObj['items'] = req.body.items;
			billObj['advanceType'] = req.body.advanceType;
			billObj.totItem = req.body.totItem;
		}

		if (Array.isArray(billObj.items)) {
			let foundAdvance = await TripAdvance.findOne({
				_id: {
					$in: billObj.items
				},
				purchaseBill: {
					$exists: true
				}
			}).lean();

			if (foundAdvance && foundAdvance._id)
				throw new Error(`Purchase Bill Already Generated on advance ${foundAdvance.reference_no}`);
		}

		if (Array.isArray(billObj.items) && Array.isArray(billObj.aAdvances)) {

			for (let adv of billObj.aAdvances) {

				if (adv) {

                  let updateinfo = {
					// "dieseInfo.litre" : adv.dieseInfo.actualLit,
					"dieseInfo.rate" : adv.dieseInfo.rate,
					"amount": adv.amount,
					"billNo": adv.bill_no
                             }

						let updateTrip = await TripAdvance.updateOne({_id: otherUtil.arrString2ObjectId(adv._id)}, {
							$set: updateinfo
						});
				}
			}
		}

		// saving data to DB
		billObj = new PurchaseBill(billObj);

		let data = await billObj.save();

		if (billObj.stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: data._id,
				modelName: 'purchaseBill',
				stationaryId: billObj.stationaryId,
			}, 'used');
		}

		if (Array.isArray(billObj.items) && billObj.items.length) {

			await TripAdvance.updateMany({
				_id: {
					$in: billObj.items
				}
			}, {
				$set: {
					purchaseBill: data._id
				}
			})
		}

		if (req.body.acknowledge)
			await billsServiceNew.acknowledgeBill(data._id, req.body, req);

		return res.status(200).json({
			message: `Purchase Bill Successfully Generated for Bill No. ${billObj.billNo}`,
			data
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
			err: e
		});
	}
});

router.post('/purUpdate/:_id', async function (req, res) {

	const ALLOWED_KEY_TO_UPDATE = ['vendor', 'account', 'tdsRate', 'gstn', 'state_name', 'state_code', 'advanceType', 'billType', 'vchType', 'plainVoucher', 'billDate', 'billNo', 'itemsType', 'items',
		'materialItems', 'from_account', 'refNo', 'branch', 'stationaryId', 'aDiscount', 'totDiscount', 'totMaterial', 'totItem', 'cGST', 'cGSTPercent', 'cgstAcnt', 'iGST', 'iGSTPercent',
		'igstAcnt', 'sGST', 'sGSTPercent', 'sgstAcnt', 'tdsAc', 'labourAc', 'amount', 'tdsAmt', 'labourAmt', 'paidAmount', 'adjDebitAc', 'totalAmount', 'billAmount', 'adjAmount', 'remark', 'from_accountName', 'accountName',
		'igstAcntName', 'sgstAcntName', 'cgstAcntName', 'labourAcName', 'tdsAcName', 'adjDebitAcName', 'discountAcName', 'discountAcnt', 'labRepItems', 'tcsAc', 'tcsAcName', 'tcsAmt', 'tcsRate', 'remAmount', 'remMatQty'
	];

	try {

		let foundPurchaseBill = await PurchaseBill.findOne({
			_id: req.params._id
		}).lean();

		let aRemoveItem = [];
		let aAddItem = [];

		if (!foundPurchaseBill)
			throw new Error('Purchase Bill Not Found');

		//Checking is voucher Gen
		if (foundPurchaseBill.plainVoucher) {
			throw new Error('Cannot Edit because Voucher is generated. Please Unapprove the Bill.');
		}

		if (req.body.billAmount)
			req.body.remAmount = req.body.billAmount;

		if (foundPurchaseBill.aDiscount.length) {
			for (let oDis of foundPurchaseBill.aDiscount) {
				if (oDis.voucherRef) {
					throw new Error('Cannot Edit because Discount Voucher is generated. Please Unapprove the Bill.');
				}
			}
		}

		if (!req.body.refNo)
			throw new Error('Ref No. is Mandatory');

		let billObj = {...otherUtil.pickPropertyFromObject(req.body, ALLOWED_KEY_TO_UPDATE)};

		billObj.lastModifiedBy = {
			date: new Date(),
			name: req.user.full_name,
			userId: req.user._id,
		}

		billObj.aDiscount = billObj.aDiscount || [];

		if (req.body.items) {
			aAddItem = [];
			foundPurchaseBill.items.forEach(id => {
				let index = billObj.items.indexOf(id.toString());
				if (index === -1)
					aRemoveItem.push(id);
				else
					aAddItem.push(id);
			});
		}

		billObj.remark = billObj.remark || '';

		if (billObj.refNo) {
			let refNo = billObj.refNo;
			let stationaryId;

			if (foundPurchaseBill.refNo !== refNo) { // if new refNo doesn't match with saved refNo

				let isRefUsed = await PurchaseBill.findOne({  // is the new refNo already exists on other purchase bill
					refNo,
					clientId: req.user.clientId,
					_id: {
						$ne: req.params._id
					}
				});

				if (isRefUsed && isRefUsed._id)
					throw new Error('Ref No already used');

				// if stationary provided the use the stationary id else check that new refNo exists in stationary or not
				if (billObj.stationaryId)
					stationaryId = billObj.stationaryId;
				else {
					let foundStationary = await billStationaryService.findByRefAndType({
						bookNo: refNo,
						type: 'Ref No',
						clientId: req.user.clientId
					});

					if (foundStationary) {
						stationaryId = foundStationary._id;
					}
				}

				// check the status of stationary id i.e. it is used or not
				if (stationaryId && (await billStationaryService.isUsed(stationaryId)))
					throw new Error('Ref No already used');

				billObj.refNo = refNo;

				// if stationary id is provided then update the stationary id else unset the stationary id
				if (stationaryId)
					billObj.stationaryId = stationaryId;
				else if (foundPurchaseBill.stationaryId) {
					await PurchaseBill.findOneAndUpdate({
						_id: req.params._id
					}, {
						$unset: {
							'stationaryId': 1
						}
					});
				}

				if (foundPurchaseBill.stationaryId) {
					await billStationaryService.updateStatus({
						userName: req.user.full_name,
						docId: foundPurchaseBill._id,
						modelName: 'purchaseBill',
						stationaryId: foundPurchaseBill.stationaryId,
					}, 'cancelled');
				}
			}
		} else {
			if (foundPurchaseBill.refNo) {
				await PurchaseBill.findOneAndUpdate({
					_id: req.params._id
				}, {
					$unset: {
						'stationaryId': 1,
						'refNo': 1
					}
				});
			}
		}

		let data = await PurchaseBill.findOneAndUpdate({
			_id: req.params._id
		}, {
			$set: billObj
		});

		if (foundPurchaseBill.refNo !== req.body.refNo && billObj.stationaryId)
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: foundPurchaseBill._id,
				modelName: 'purchaseBill',
				stationaryId: billObj.stationaryId,
			}, 'used');

		if (aRemoveItem.length) {
			await TripAdvance.updateMany({
				_id: {
					$in: aRemoveItem
				}
			}, {
				$unset: {
					purchaseBill: 1
				}
			})
		}

		if (aAddItem.length) {
			await TripAdvance.updateMany({
				_id: {
					$in: aAddItem
				}
			}, {
				$set: {
					purchaseBill: req.params._id
				}
			})
		}

		if (req.body.acknowledge)
			await billsServiceNew.acknowledgeBill(req.params._id, req.body, req);

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

router.post('/purAppove/:_id', async function (req, res) {

	try {

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		await billsServiceNew.acknowledgeBill(req.params._id, req.body, req);

		return res.status(200).json({
			message: 'Bill Successfully Approved'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.post('/purUnappove/:_id', async function (req, res) {

	try {

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		let oPurchaseBill = await PurchaseBill.findOne({_id: req.params._id}, {
			plainVoucher: 1,
			aDiscount: 1,
			vehicleExp: 1
		}).lean();
		let aRemoveVoucher = [];

		if (!oPurchaseBill.plainVoucher)
			throw new Error('Voucher not generated');

		if (oPurchaseBill.vehicleExp && oPurchaseBill.vehicleExp.length)
			throw new Error('Cannot Unapprove vehicle Expenses linked');

		let fData = await voucherService.findVoucherByIdAsync(oPurchaseBill.plainVoucher, {acImp: 1});

		if (!(fData && fData._id))
			throw  new Error('Voucher Not Found');

		if (fData.acImp.st)
			throw  new Error('Cannot Unapprove Voucher is imported to A/c');

		aRemoveVoucher.push(oPurchaseBill.plainVoucher);

		oPurchaseBill.aDiscount = Array.isArray(oPurchaseBill.aDiscount) ? oPurchaseBill.aDiscount : [];

		for (let oDis of oPurchaseBill.aDiscount) {

			if (!oDis.voucherRef)
				throw new Error('Voucher not generated for Discount');

			fData = await voucherService.findVoucherByIdAsync(oDis.voucherRef, {acImp: 1});

			if (!(fData && fData._id))
				throw  new Error('Voucher Not Found');

			if (fData.acImp.st)
				throw  new Error('Cannot Unapprove Voucher is imported to A/c');

			aRemoveVoucher.push(oDis.voucherRef);
		}

		for (let oRVch of aRemoveVoucher)
			await voucherService.removeVoucher({
				_id: oRVch
			});

		await PurchaseBill.update({
			_id: oPurchaseBill._id
		}, {
			$unset: {
				plainVoucher: 1,
			},
			$set: {
				lastModifiedBy : {
					date: new Date(),
					name: req.user.full_name,
					userId: req.user._id,
				}
			}
		});

		await PurchaseBill.update({
			_id: oPurchaseBill._id
		}, {
			$set: {
				aDiscount: oPurchaseBill.aDiscount.map(oDed => {
					delete oDed.voucherRef;
					return oDed;
				})
			}
		});

		return res.status(200).json({
			message: 'Bill Successfully unapproved'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.post('/purRemove/:_id', async function (req, res) {

	try {

		/*
		* it will check that voucher's(Main voucher and Discount voucher) shouldn't be created
		* if its any advances are linked than, its should be unlinked
		* then every things OK, can remove the bill document
		* */

		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		let oPurchaseBill = await PurchaseBill.findOne({_id: req.params._id}, {
			items: 1,
			plainVoucher: 1,
			aDiscount: 1,
			stationaryId: 1,
			vehicleExp: 1
		}).lean();

		if (oPurchaseBill.plainVoucher)
			throw new Error('Cannot remove Voucher is generated');

		if (oPurchaseBill.vehicleExp && oPurchaseBill.vehicleExp.length)
			throw new Error('Cannot remove vehicle Expenses linked');

		if (Array.isArray(oPurchaseBill.aDiscount) && oPurchaseBill.aDiscount.length)
			for (let oDis of oPurchaseBill.aDiscount) {
				if (oDis.voucherRef)
					throw new Error('Cannot remove Voucher is generated for Discount');
			}

		if (oPurchaseBill.stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: oPurchaseBill._id,
				modelName: 'purchaseBill',
				stationaryId: oPurchaseBill.stationaryId,
			}, 'cancelled');
		}

		if (Array.isArray(oPurchaseBill.items) && oPurchaseBill.items.length)
			await TripAdvance.updateMany({
				_id: {$in: oPurchaseBill.items}
			}, {
				$unset: {
					purchaseBill: 1
				}
			});

		await PurchaseBill.remove({_id: oPurchaseBill._id});

		return res.status(200).json({
			message: 'Bill Successfully Deleted'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.post('/creditNote/:_id', async function (req, res) {

	try {
		//validation that paid amount is always less that amount
		let bill = await Bill.findOne(
			{
				_id: req.params._id
			});

		if (!bill) {
			return res.status(500).json({
				message: 'Bill Not found',
				err
			});
		}

		bill.items.forEach(oItem => {

			let aggDeduction = oItem.aDeduction.reduce((a, b) => a + b.amount, 0);
			let grTotalAmount = oItem.gr.totalFreight + oItem.cGST + oItem.sGST + oItem.iGST;
			let settledAmount = oItem.settlement.reduce((a, b) => a + (b.amountReceived || 0), 0);
			let remAmount = grTotalAmount - settledAmount;

			if (aggDeduction > remAmount) {
				return res.status(500).json({
					message: 'Deduction Should be less than equal to ' + remAmount + ' for Gr Number ' + oItem.gr.grNumber
				});
			}
		});

		bill.crNotes[0] = req.body.crNotes;
		bill.items.forEach((oItem, index) => {
			oItem.aDeduction = req.body.items[index].aDeduction
		});
		bill.save();
		return res.status(200).json({
			message: 'Credit Note successfully Generated'
		});
	} catch (err) {
		return res.status(500).json({
			message: 'Something Went Wrong',
			err
		});
	}

});

router.post('/coverNote', async function (req, res) {

	try {

		//check mandatory key
		let cnNo = req.body.cnNo || false;
		let remark = req.body.remark || '';
		let aBill = Array.isArray(req.body.bill) && req.body.bill.length && req.body.bill || false;

		if (!cnNo || !aBill)
			return res.status(500).json({
				message: 'Mandatory Fields are required'
			});

		await billsService.upsertCoverNote(
			{
				cnNo,
				remark,
				aBill
			}
		);

		return res.status(200).json({
			message: 'Cover Note successfully Generated'
		});


	} catch (err) {
		return res.status(500).json({
			message: 'Something Went Wrong',
			err
		});
	}

});

router.post('/billScriptRoute', async function (req, res) {

	try {

		// let foundBill = await BillNew.aggregate([
		// 	{$match: {'items.gr': {$exists: true}, cancelled: false, clientId: '10808'}},
		// 	{$unwind: {path: '$items', preserveNullAndEmptyArrays: false}},
		// 	{$lookup: {from: 'tripgrs', localField: 'items.gr', foreignField: '_id', as: 'items.gr'}},
		// 	{$unwind: {path: '$items.gr', preserveNullAndEmptyArrays: true}},
		// 	{
		// 		$group: {
		// 			_id: "$_id",
		// 			items: {$push: "$items"}
		// 		}
		// 	}
		// ]).allowDiskUse(true);
		//
		// for (let i in foundBill) {
		// 	let oBill = foundBill[i];
		//
		// 	for (let j in oBill.items) {
		// 		let oItem = oBill.items[j];
		//
		// 		if (oItem.gr)
		// 			oItem.grData = BillNew.extractGrKeys(oItem.gr);
		//
		// 	}
		//
		// 	console.log(i);
		//
		// 	let data = await BillNew.findOneAndUpdate({_id: oBill._id}, {
		// 		$set: {
		// 			'items': oBill.items
		// 		}
		// 	});
		// }

		let foundBill = await BillNew.aggregate([
			{
				$match: {
					clientId: {
						$in: ['10808', '11009', '11108', '10909']
					},
					'items.grData': {$exists: false},
					"type": "Actual Bill",
					cancelled: false,
					created_at: {
						$gt: new Date("2019-03-31T18:30:00.916Z")
					}
				}
			},
			{
				$project: {
					items: 1,
					clientId: 1,
					billNo: 1,
				}
			},
			// {$match: {'items.gr': {$exists: false}, 'items.grData': {$exists: true}, cancelled: false, clientId: '10808'}},

			{$unwind: {path: '$items', preserveNullAndEmptyArrays: false}},
			{$lookup: {from: 'tripgrs', localField: 'items.gr', foreignField: '_id', as: 'items.gr'}},
			{$unwind: {path: '$items.gr', preserveNullAndEmptyArrays: true}},

			// {$unwind: {path: '$items', preserveNullAndEmptyArrays: false}},
			// {$match: {'items.grData.grId': {$exists: false}, 'items.gr': {$exists: false}, clientId: '10808'}},

			{
				$group: {
					_id: "$_id",
					items: {$push: "$items"}
				}
			}
		]);

		for (let i in foundBill) {
			let oBill = foundBill[i];

			for (let j in oBill.items) {
				let oItem = oBill.items[j];

				if (oItem.gr && !oItem.grData) {
					// let fdGr = await GR.find({grNumber: oItem.grData.grNumber, clientId: oItem.grData.clientId}).lean();
					oItem.grData = BillNew.extractGrKeys(oItem.gr);

					// if (fdGr.length === 1) {
					// } else {
					// 	console.log(oBill.billNo, oBill._id, 'item => ', j, oItem.grData.grNumber, " length => ", fdGr.length);
					// }
				}
			}


			// console.log(i);

			let data = await BillNew.findOneAndUpdate({_id: oBill._id}, {
				$set: {
					'items': oBill.items
				}
			});
		}

		return res.status(200).json({
			message: 'Cover Note successfully Generated'
		});


	} catch (err) {
		return res.status(500).json({
			message: 'Something Went Wrong',
			err
		});
	}

});

router.post('/billWise', async function (req, res) {
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
		const aggQuery = [{
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
					"data":{$push: "$$ROOT"},
					"totalApprovedBill":{$sum:{$cond:[{$eq:["$status","Approved"]},1,0]}},
					"totalWithoutGSTBill":{$sum:{$cond:[{$eq:["$amount","$billAmount"]},1,0]}},
					"totalWithoutGSTBillValue":{$sum:{$cond:[{$eq:["$amount","$billAmount"]},"$amount",0]}},
					"totalCreditNote":{$sum:{$cond:[{$eq:["$creditNo","null"]},0,1]}},
					"totalCreditNoteTaxableValue":{$sum:{$cond:[{$eq:["$creditNo","null"]},0,"$amount"]}},
					"totalCreditNoteInvoiceValue":{$sum:{$cond:[{$eq:["$creditNo","null"]},0,"$billAmount"]}},
					"totalWithGSTBillValue":{$sum:{$cond:[{$ne:["$amount","$billAmount"]},"$amount",0]}},
					"grandTotalBill":{$sum:1},
					"totalTaxableFreightValue":{$sum:"$amount"},
					"totaligstAmount": {"$sum": "$iGST"},
					"totalcgstAmount": {"$sum": "$cGST"},
					"totalsgstAmount": {"$sum": "$sGST"},
					"totalAfterTaxAmount": {"$sum": "$billAmount"},
					count:{$sum:1}
				},
			}
		]
		let BillData = await Bill.aggregate(aggQuery);
		if (req.body.download) {
			ReportExelService.billWise(BillData[0].data, req.body.end_date, req.body.start_date, req.user.clientId, req.clientData, function (d) {
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
				'data': BillData
			});
		}

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.post('/billingPartyWise', async function (req, res) {
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
		const aggQuery = [{
			$match:{billDate:{$gte:startDate,$lte:nextDay},clientId:req.user.clientId,cancelled : false}
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
			// {$unwind:"$receiving.deduction"},
			{ $unwind: { path: "$receiving.deduction", preserveNullAndEmptyArrays: true } },
			{$project:{billNo:1,billDate:1,amount:1,GST:"$billingParty.gstin",status:1,
					creditNo:  { $ifNull: [ "$receiving.deduction.creditNo", "null" ] },
					billingName:"$billingParty.billName",billAmount:1,cGST:1,sGST:1,iGST:1}},
			{
				"$group": {
					"_id": {
						"billingName": "$billingName",
					},
					"invoiceAmount": {
						"$sum": "$amount"
					},
					"GST":{
						"$first":"$GST"
					},
					"status":{"$first":"$status"},
					"creditNo":{"$first":"$receiving.deduction.creditNo"},
					"igstAmount": {
						"$sum": "$iGST"
					},
					"cgstAmount": {
						"$sum": "$cGST"
					},
					"sgstAmount": {
						"$sum": "$sGST"
					},
					"finalAmount": {
						"$sum": "$billAmount"
					},
					"totalApprovedBill":{$sum:{$cond:[{$eq:["$status","Approved"]},1,0]}},
					"totalWithoutGSTBill":{$sum:{$cond:[{$eq:["$amount","$billAmount"]},1,0]}},
					"totalWithoutGSTBillValue":{$sum:{$cond:[{$eq:["$amount","$billAmount"]},"$amount",0]}},
					"totalCreditNote":{$sum:{$cond:[{$eq:["$creditNo","null"]},0,1]}},
					"totalCreditNoteTaxableValue":{$sum:{$cond:[{$eq:["$creditNo","null"]},0,"$amount"]}},
					"totalCreditNoteInvoiceValue":{$sum:{$cond:[{$eq:["$creditNo","null"]},0,"$billAmount"]}},
					"totalWithGSTBillValue":{$sum:{$cond:[{$ne:["$amount","$billAmount"]},"$amount",0]}},
					"grandTotalBill":{$sum:1},
					"count":{$sum:1},
				},
			},
			{$sort:{"_id.billingName":1}},
			{
				"$group": {
					"_id":  null,
					"data":{$push: "$$ROOT"},
					"count":{$sum:"$count"},
					"totalApprovedBill":{$sum:"$totalApprovedBill"},
					"totalWithoutGSTBill":{$sum:"$totalWithoutGSTBill"},
					"totalWithoutGSTBillValue":{$sum:"$totalWithoutGSTBillValue"},
					"totalCreditNote":{$sum:"$totalCreditNote"},
					"totalCreditNoteTaxableValue":{$sum:"$totalCreditNoteTaxableValue"},
					"totalCreditNoteInvoiceValue":{$sum:"$totalCreditNoteInvoiceValue"},
					"totalWithGSTBillValue":{$sum:"$totalWithGSTBillValue"},
					"grandTotalBill":{$sum:"$grandTotalBill"},
					"totalTaxableFreightValue":{$sum:"$invoiceAmount"},
					"totaligstAmount": {"$sum": "$igstAmount"},
					"totalcgstAmount": {"$sum": "$cgstAmount"},
					"totalsgstAmount": {"$sum": "$sgstAmount"},
					"totalAfterTaxAmount": {"$sum": "$finalAmount"},
				},
			},
		]
		let BillData = await Bill.aggregate(aggQuery);
		if (req.body.download) {
			ReportExelService.billingPartyWise(BillData[0] && BillData[0].data, req.body.end_date, req.body.start_date, req.user.clientId, function (d) {
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
				'data': BillData
			});
		}

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.post('/billinglifeCycle', async function (req, res) {
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
		const aggQuery = [{
			$match:{billDate:{$gte:startDate,$lte:nextDay},
				clientId:req.user.clientId,
				cancelled : false,
				settled:req.body.settled
			}
		},
			{$project:{billNo:1,billDate:1,amount:1,billingParty:1,billAmount:1,
					cGST:1,sGST:1,iGST:1,status:1,creditNote:1}},
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
			{$project:{billNo:1,billDate:1,amount:1,creditNote:1,
					billingName:"$billingParty.billName",billAmount:1,cGST:1,sGST:1,iGST:1,

				}},
			{
				"$group": {
					"_id":  null,
					"data":{$push: "$$ROOT"},
					"totalTaxableFreightValue":{$sum:"$amount"},
					"totaligstAmount": {"$sum": "$iGST"},
					"totalcgstAmount": {"$sum": "$cGST"},
					"totalsgstAmount": {"$sum": "$sGST"},
					"totalAfterTaxAmount": {"$sum": "$billAmount"},
					count:{$sum:1}
				},
			}
		]
		let BillData = await Bill.aggregate(aggQuery);
		if(BillData && BillData[0]){
			if (req.body.download) {
				ReportExelService.billinglifeCycle(BillData[0].data, req.body.end_date, req.body.start_date, req.user.clientId, function (d) {
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
					'data': BillData
				});
			}
		}else{
			return res.status(500).json({
				'status': 'OK',
				'message': ' Data not found',
				'data': BillData
			});
		}


	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

module.exports = router;
