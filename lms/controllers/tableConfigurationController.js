const router = require('express').Router();
const TableConfiguration = require('../services/tableConfigurationService');

router.post('/add', async function (req, res, next) {
	try{
		req.body.clientId = req.user.clientId;
		req.body.created_by_name = req.user.full_name;
		req.body.created_by = req.user._id;
		req.body.last_modified_by_name = req.user.full_name;
		req.body.last_modified_by = req.user._id;
		if (!req.body.page) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Page name not found.'
			});
		}
		if (!req.body.table) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Table name not found.'
			});
		}
		if (!req.body.visible) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Visible column not found.'
			});
		}
		if (!req.body.access) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Access column not found.'
			});
		}
		const data = await TableConfiguration.addTableConfiguration(req.body);
		return res.status(200).json({
			status: 'OK',
			message: 'Table Configurations saved',
		});
	}catch(e){
		console.error(e);
		next(e);
	}


});

router.post('/get', async function (req, res, next) {
	try{
		req.body.user = req.user._id;
		req.body.clientId = req.user.clientId;
		const data = await TableConfiguration.getTableConfiguration(req.body);
		return res.status(200).json({
			status: 'OK',
			message: 'Table Configurations Get successfully',
			data:data
		});
	}catch(e){
		console.error(e);
		next(e);
	}


});

module.exports = router;
