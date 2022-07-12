let router = express.Router();
const TdsRates = commonUtil.getModel('tdsRates');

let TdsRateService = promise.promisifyAll(commonUtil.getService('tdsRate'));
var TransportVendor = promise.promisifyAll(commonUtil.getModel('vendorTransport'));


router.post('/add', async function (req, res, next) {
	try {

		let savedData = await TdsRateService.add(req.body);
		return res.status(200).json({
			'status': 'OK',
			'message': 'TDS Created',
			savedData
		});
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/get', async function (req, res, next) {

	try {
		let vendordata, tdsRate;
		 if(req.body.account){
			vendordata = await TransportVendor.findOne({ "account.ref": req.body.account});
		}
		if(vendordata && vendordata.exeRate && vendordata.exeFrom && vendordata.exeTo){
			if(new Date(req.body.date) >= new Date(vendordata.exeFrom) && new Date(req.body.date) <= new Date(vendordata.exeTo)){
				tdsRate = vendordata.exeRate;
				let data = [{tdsRate: tdsRate}];
				return res.status(200).json({
					'status': 'OK',
					'message': 'Data found.',
					'data': data
				});
			}
		}
			TdsRateService.find(req)
				.then(function (data) {
					return res.status(200).json({
						'status': 'OK',
						'message': 'Data found.',
						'data': data
					});
				}).catch(next);

	}

	catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}

});


module.exports = router;

