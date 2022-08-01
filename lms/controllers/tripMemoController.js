let router = require('express').Router();
let GR = commonUtil.getModel('tripGr');
let Voucher = commonUtil.getModel('voucher');
const tripMemoService = commonUtil.getService('tripMemo');
const billStationaryService = commonUtil.getService('billStationary');
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

/** POST /api/trip_memo/get_trip_memo - Get trip Memos */
router.route('/get_trip_memo').post(async function (req, res, next) {

	try {
		let data = await tripMemoService.getTrimMemo(req, res, next);
		if (req.body.download ) {
			ReportExelService.tripReport(data, req.user.clientId, function (d) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': d.url
				});
			});
		} else {

			// return res.status(200).json((oRes.data = (data ? data : []), oRes.message = 'Trip Memo found.', oRes));

			return res.status(200).json({
				'status': 'Success',
				'message': 'Trip memo Successfully Updated',
				'data': data,
			});
		}
	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.message || e.toString(),
		});
	}
});

router.route('/updateTripMemo/:_id').post(async function (req, res, next) {
	let grId = req.params._id || false;
	let tMemo = typeof req.body.tMemo === 'object' && req.body.tMemo || false;
	req.body.clientId = req.body.cClientId || req.user.clientId || false;
	req.body.userName = req.user.full_name;
	let isValid = true;

	// if there is any deduction and extra charge

	// if (tMemo.deduction) {
	// 	for (let key in tMemo.deduction) {
	// 		if (tMemo.deduction.hasOwnProperty(key)) {
	// 			let ptr = tMemo.deduction[key];
	// 			let from = ptr.from || false;
	// 			let to = ptr.to || false;
	// 			let typ = ptr.typ || false;
	// 			let amount = ptr.amount || false;
	// 			if (!from || !to || !amount || !typ) {
	// 				isValid = false;
	// 				break;
	// 			}
	// 		}
	// 	}
	// }
	//
	// if (tMemo.charges) {
	// 	for (let key in tMemo.charges) {
	// 		if (tMemo.charges.hasOwnProperty(key)) {
	// 			let ptr = tMemo.charges[key];
	// 			let from = ptr.from || false;
	// 			let to = ptr.to || false;
	// 			let typ = ptr.typ || false;
	// 			let amount = ptr.amount || false;
	// 			if (!from || !to || !amount || !typ) {
	// 				isValid = false;
	// 				break;
	// 			}
	// 		}
	// 	}
	// }

	if (tMemo && grId && isValid) {
		try {
			tMemo.lastModifiedBy = req.body.userName;
			tMemo.lastModifiedAt = new Date();
			let ack = await tripMemoService.updateTrimMemo(grId,req.body);
			let data = await GR.findOne({_id: grId});
			return res.status(200).json({
				'status': 'Success',
				'message': 'Trip memo Successfully Updated',
				'data': data,
			});
		} catch (err) {
			return res.status(500).json({
				'status': 'Error',
				'message': err.message || err.toString(),
				'data': err.toString()
			});
		}

	} else
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Mandatory fields are required'
		});
});

router.route('/custPaymentReceipt').post(async function (req, res, next) {

	try {

		let aTripMemo = req.body;

		if (!aTripMemo.length)
			throw new Error('Mandatory Fields are required');

		let refNo = aTripMemo[0].refNo;
		let stationaryId = aTripMemo[0].stationaryId;

		let foundVouch= await Voucher.find({
			refNo: refNo,
			clientId: req.user.clientId,
			deleted: {
				$not: {
					$eq: true
				}
			},
		});

		if (foundVouch.length)
			throw new Error('Reference No. already used');

		//Find stationary number if stationary id not provided to maintain 1 to 1 binding of stationary and Ref No.
		if (!stationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: refNo,
				type: 'Ref No',
				clientId: req.user.clientId
			});

			if (foundStationary) {
				stationaryId = foundStationary._id;

				req.body.forEach(o => {
					o.stationaryId = stationaryId;
				});
			}
		}

		if (stationaryId && (await billStationaryService.isUsed(stationaryId)))
			throw new Error('Reference No. already used');

		next();

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}

}, tripMemoService.custPaymentReceipt);

router.route('/custPaymentReceiptEdit').post(async function (req, res, next) {

	try {

		let refNo = req.body.refNo;
		let aTripMemo = req.body.aTripMemo;

		if (!refNo) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Reference no. is a required field',
			});
		}

		let foundVouch = await Voucher.findOne({
			refNo: refNo,
			clientId: req.user.clientId,
			deleted: {
				$not: {
					$eq: true
				}
			},
		});

		if (!(foundVouch && foundVouch._id))
			throw new Error('No Voucher Found');

		let nStationaryId = aTripMemo[0].stationaryId;
		let oStationaryId = foundVouch.stationaryId;

		let nRefNo = aTripMemo[0].refNo;
		let oRefNo = foundVouch.refNo;

		if (!nStationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: nRefNo,
				type: 'Ref No',
				clientId: req.user.clientId
			});

			if (foundStationary) {
				nStationaryId = foundStationary._id;

				aTripMemo.forEach(o => {
					o.stationaryId = nStationaryId;
				});
			}
		}

		if (nRefNo != oRefNo) {

			let usedVoucher = await Voucher.findOne({
				refNo: refNo,
				clientId: req.user.clientId,
				deleted: {
					$not: {
						$eq: true
					}
				},
			});

			if (usedVoucher && usedVoucher._id)
				throw new Error('Reference No. already used');

			if (nStationaryId && (await billStationaryService.isUsed(nStationaryId)))
				throw new Error('Reference No. already used');

			await billStationaryService.setUnset({
				modelName: 'voucher',
				userName: req.user.full_name,
			}, {
				refNo: nRefNo,
				stationaryId: nStationaryId
			}, {
				refNo: oRefNo,
				stationaryId: oStationaryId
			});

		}

		next();

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}

}, tripMemoService.custPaymentReceiptEdit);

router.route('/custPaymentReceiptDel').put(async function (req, res, next) {

	try {

		let refNo = req.body.refNo;

		if (!refNo) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Reference no. is a required field',
			});
		}

		next();

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}

}, tripMemoService.custPaymentReceiptDelete);

router.route('/addRemark/:_id').post(async function (req, res, next) {
	let grId = req.params._id || false;
	let isValid = true;


	if (grId && isValid) {
		try {

			let ack = await tripMemoService.addRemarkMemo(grId,req.body);
			let data = await GR.findOne({_id: grId});
			return res.status(200).json({
				'status': 'Success',
				'message': 'Remark Successfully Added',
				'data': data,
			});
		} catch (err) {
			return res.status(500).json({
				'status': 'Error',
				'message': err.message || err.toString(),
				'data': err.toString()
			});
		}

	} else
		return res.status(500).json({
			'status': 'ERROR',
			'message': 'Id is required'
		});
});

module.exports = router;
