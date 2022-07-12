const router = require('express').Router();
const SchemaConfiguration = require('../models/SchemaConfiguration');
const logsService = commonUtil.getService('logs');

router.get('/:_id', async function (req, res, next) {
	const conf = await SchemaConfiguration.findById(req.params._id, 'configs').lean();
	return res.status(200).json({
		status: 'OK',
		message: 'Configuration found',
		data: conf
	});

});

router.post('/add', async function (req, res, next) {
	try{
		req.body.userName = req.user.full_name;
		const data = await SchemaConfiguration.upsert(req.body);
		await logsService.add('schemaconfigurations', {
			uif: req.body.customer ? req.body.customer : req.body.billingParty,
			category: 'update',
			nData: {},
			oData: JSON.parse(JSON.stringify(req.body)),
		}, req);
		return res.status(200).json({
			status: 'OK',
			message: 'Configurations saved',
		});
	}catch(e){
		console.error(e);
		next(e);
	}


});

module.exports = router;
