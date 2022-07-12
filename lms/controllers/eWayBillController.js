const EWayBillService = commonUtil.getService('eWayBill');
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
let EWayBill = commonUtil.getModel('eWayBill');
const router = express.Router();

router.post('/get', async function (req, res, next) {

	try {
		//let data = await creditNoteService.find(req.body, req.user);
		EWayBillService.find(req.body, req.user, req)
			.then(function (data) {
				if (req.body.download) {
					ReportExelService.eWayBillReport(data.data, req.user.clientId, function (data) {
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

router.post('/get2', async function (req, res, next) {

	try {
		//let data = await creditNoteService.find(req.body, req.user);
		EWayBillService.find2(req.body, req.user, req)
			.then(function (data) {
				if (req.body.download) {
					ReportExelService.eWayBillReport2(data.data, req.user.clientId, function (data) {
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


module.exports = router;

