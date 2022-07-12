let router = require('express').Router();
let GR = commonUtil.getModel('tripGr');
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

module.exports = router;
