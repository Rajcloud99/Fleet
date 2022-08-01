let router = require('express').Router();
let GR = commonUtil.getModel('tripGr');
let Voucher = commonUtil.getModel('voucher');
const billStationaryService = commonUtil.getService('billStationary');
const brokerMemoService = commonUtil.getService('brokerMemo');

/** Get broker Memos */
router.route('/get').post(async function (req, res, next) {

	try {
		let data = await brokerMemoService.get(req, res, next);

			return res.status(200).json({
				'status': 'Success',
				'message': 'Broker memo Successfully Updated',
				'data': data,
			});

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.message || e.toString(),
		});
	}
});

router.route('/update/:_id').post(async function (req, res, next) {
	let grId = req.params._id || false;
	let bMemo = typeof req.body.bMemo === 'object' && req.body.bMemo || false;
	req.body.clientId = req.body.cClientId || req.user.clientId || false;
	req.body.userName = req.user.full_name;

	if (bMemo && grId) {
		try {
			bMemo.lastModifiedBy = req.body.userName;
			bMemo.lastModifiedAt = new Date();
			let ack = await brokerMemoService.update(grId,req.body);
			let data = await GR.findOne({_id: grId});
			return res.status(200).json({
				'status': 'Success',
				'message': 'Broker memo Successfully Updated',
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

router.route('/multiPaymentAdd').post(async function (req, res, next) {

	try {

		let aBrokerMemo = req.body;

		if (!aBrokerMemo.length)
			throw new Error('Mandatory Fields are required');

		let refNo = aBrokerMemo[0].refNo;
		let stationaryId = aBrokerMemo[0].stationaryId;

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

}, brokerMemoService.multiPaymentAdd);

router.route('/multiPaymentEdit').post(async function (req, res, next) {

	try {

		let refNo = req.body.refNo;
		let aBrokerMemo = req.body.aBrokerMemo;

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

		let nStationaryId = aBrokerMemo[0].stationaryId;
		let oStationaryId = foundVouch.stationaryId;

		let nRefNo = aBrokerMemo[0].refNo;
		let oRefNo = foundVouch.refNo;

		if (!nStationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: nRefNo,
				type: 'Ref No',
				clientId: req.user.clientId
			});

			if (foundStationary) {
				nStationaryId = foundStationary._id;

				aBrokerMemo.forEach(o => {
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

}, brokerMemoService.multiPaymentEdit);

router.route('/multiPaymentDel').put(async function (req, res, next) {

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

}, brokerMemoService.multiPaymentDel);


module.exports = router;
