// ********* Created by Dev Dhakad on 09/12/21. **********
// Diesel Petrol Hike (DPH)
let router = require('express').Router();

const Joi = require('joi');
const path = require('path');
let dphModel = commonUtil.getModel('dph');
const validate = require('express-validation');
const dphService = commonUtil.getService('dph');


/** POST Add DPH */
router.post('/add', async function (req, res, next) {

	try {

		if(!req.body.customer)
			throw new Error('Mandatory fields are required');
		if(!req.body.customer_name)
			throw new Error('Mandatory fields are required');
		if(!req.body.date)
			throw new Error('Mandatory fields are required');
		if(!req.body.hike)
			throw new Error('Mandatory fields are required');
		if(!req.body.rate)
			throw new Error('Mandatory fields are required');


		let data = await dphService.add({
			...req.body,
			createdBy: req.user.full_name
		}, req);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Rate Successfully Added',
			data
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}

});

/** POST Get DPH */
router.post('/get', async function (req, res, next) {

	try {
		dphService.find(req.body, req.user, req)
			.then(function (data) {
				if (req.body.download) {
					return res.status(200).json({
						'status': 'OK',
						'message': 'Data found.',
						'data': data
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

/** POST Delete DPH */
router.post('/delete/:_id', async (req, res, next) => {

	try {

		if(!req.params._id)
			throw new Error('Mandatory fields are required');

		let _id = req.params._id
		await dphModel.remove({_id: otherUtil.arrString2ObjectId(_id)});

		return res.status(200).json({
			status: 'SUCCESS',
			message: 'Rate deleted successfully',
		});

	} catch(e) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Something went wrong',
			error: e.toString()
		});
	}
});

module.exports = router;
