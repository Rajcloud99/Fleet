const DeviceMasterSlipService = require('./deviceMasterSlip.service');
const router = express.Router();

router.get('/', async (req, res, next) => {
	try {
		let data = await DeviceMasterSlipService.getSlips(req.query);
		return res.status(200).json({
			"status": "OK",
			"message": "Slips found",
			"data": data
		});
	} catch(e) {
		return next(e);
	}
});

router.get('/preview', (req, res, next) => {
	DeviceMasterSlipService.searchSlips(req.query, function (err, d) {
		let templateData = {
			layout: false,
			slip: d.Slips[0],
			clientData: req.clientData,
			printedOn: new Date()
		};
		return res.render('deviceMasterSlip', templateData);
	});
});

router.post('/', async (req, res, next) => {

});

module.exports = router;
