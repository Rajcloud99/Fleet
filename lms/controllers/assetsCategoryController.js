let router = express.Router();
const AssetsCategory = commonUtil.getModel('assetsCategory');

let AssetsCategoryService = promise.promisifyAll(commonUtil.getService('assetsCategory'));
let Bill = commonUtil.getModel('bills');
const Joi = require('joi');
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));



router.post('/get', async function (req, res, next) {

	try {
		// let data = await AssetsCategoryService.find(req.body, req.user);

			AssetsCategoryService.find(req.body)
				.then(function (data) {
					if(req.body.download){
						ReportExelService.assetsCategoryReport(data, req.body.end_date, req.body.start_date, req.user.clientId, function (d) {
							return res.status(200).json({
									'status': 'OK',
									'message': 'report download available.',
									'url': d.url
								}
							);
						});
					}else{
						return res.status(200).json({
							'status': 'OK',
							'message': 'Data found.',
							'data': data
						});
					}


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

router.post('/getDetail', async function (req, res, next) {

	try {
		// let data = await AssetsCategoryService.find(req.body, req.user);

			AssetsCategoryService.findDetail(req.body)
				.then(function (data) {

					return res.status(200).json({
						'status': 'OK',
						'message': 'Data found.',
						'data': data
					});
				}).catch(next);


	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}

});

router.post('/add', async function (req, res, next) {
	try {
		let categ = req.body;
		// let arr = [];


		// await validateRequest(req, 'add');


		// req.body.createdBy = req.user.full_name;
		// if(AssetsCategory.findOne({"req.body.category" : { $exists: true}}))

		// let obj = {
		// 	effectiveDate: categ.effectiveDate,
		// 	CActRateSLM: categ.CActRateSLM,
		// 	ITActRateSLM: categ.ITActRateSLM,
		// 	CActRateWDV: categ.CActRateWDV,
		// 	ITActRateWDV: categ.ITActRateWDV
		// };
		// categ.aRates = [];
		// categ.aRates.push(obj);

		let savedData = await AssetsCategoryService.add(req.body);
		return res.status(200).json({
			'status': 'OK',
			'message': 'category Created',
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

router.put('/edit/:_id', async function (req, res, next) {
	try {

		// validating request body
		// await validateRequest(req, 'edit');
		let data = await AssetsCategoryService.edit({_id:req.params._id},req.body);
		return res.status(200).json({
			'status': 'OK',
			'message': 'Credit Note Successfully Updated',
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

router.delete('/remove/:_id', async function (req, res, next) {
	try {

		// validating request body
		// await validateRequest(req, 'remove');

		let data = await AssetsCategoryService.remove({_id:req.params._id});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Credit Note Successfully Removed',
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

router.put('/delink/:id', async (req, res, next) => {
	try {
		let data1 = await AssetsCategory.findOneAndUpdate({account : req.params.id},{$unset:{account:1}});
		return res.status(200).json({
			status:'OK',
			message: 'Account delinked successfully'
		});
	} catch(e) {
		return res.status(500).json({
			status:'ERROR',
			message: e.toString()
		});
	}
});

// router.post('/calDeprReport', async function (req, res, next) {
//
// 	try {
// 		 let data = await AssetsCategoryService.calDeprReport(data, req.body.end_date, req.body.start_date, req.user.clientId, function (d));
// 			if (req.body.download) {
// 				ReportExelService.calDeprReport(data, req.body.end_date, req.body.start_date, req.user.clientId, function (d) {
// 					return res.status(200).json({
// 							'status': 'OK',
// 							'message': 'report download available.',
// 							'url': d.url
// 						}
// 					);
// 				});
//
// 		 }
// 	} catch (e) {
// 		return res.status(500).json({
// 			'status': 'ERROR',
// 			'message': e.toString(),
// 			'data': e
// 		});
// 	}
//
// });


module.exports = router;


async function validateRequest({body, params}, schemaType) {
	try {
		const addSchema = {
			body: Joi.object().keys({
				category: Joi.string().required(),
				CActSlab: Joi.string().required(),
				ITActslab: Joi.string().required(),
				categoryCode: Joi.string().required(),
				description:Joi.string().required(),

				'aRates': (Joi.object().keys({
					effectiveDate: Joi.string().required(),
					CActRateSLM: Joi.string().required(),
					ITActRateSLM: Joi.string().required(),
					CActRateWDV: Joi.string().required(),
					ITActRateWDV: Joi.string().required()
				}).pattern(/./, Joi.any())),
				// aRates: [{
				// 	effectiveDate:  Joi.string().required(),
				// 	CActRateSLM: Joi.string().required(),
				// 	ITActRateSLM: Joi.string().required(),
				// 	CActRateWDV: Joi.string().required(),
				// 	ITActRateWDV:Joi.string().required(),
				// }],
				// account: Joi.string().required()
			}).pattern(/./, Joi.any())
		};

		const editSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required()
			}).pattern(/./, Joi.any()),
			body: Joi.object().keys({
				category: Joi.string().required(),
				CActSlab: Joi.string().required(),
				ITActslab: Joi.string().required(),
				categoryCode: Joi.string().required(),
				description:Joi.string().required(),

				'aRates': (Joi.object().keys({
					effectiveDate: Joi.string().required(),
					CActRateSLM: Joi.string().required(),
					ITActRateSLM: Joi.string().required(),
					CActRateWDV: Joi.string().required(),
					ITActRateWDV: Joi.string().required()
				}).pattern(/./, Joi.any())),
				// aRates: [{
				// 	effectiveDate:  Joi.string().required(),
				// 	CActRateSLM: Joi.string().required(),
				// 	ITActRateSLM: Joi.string().required(),
				// 	CActRateWDV: Joi.string().required(),
				// 	ITActRateWDV:Joi.string().required(),
				// }],
				// account: Joi.string().required()
			}).pattern(/./, Joi.any())
		};


		const removeSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required()
			}).unknown(true),
		};

		let ptr;

		if(schemaType === 'add')
			ptr = addSchema;
		else if(schemaType === 'edit')
			ptr = editSchema;
		else if(schemaType === 'remove')
			ptr = removeSchema;
		else
			throw new Error('Invalid Type');

		const schema = {
			params: Joi.object().pattern(/./, Joi.any()),
			body: Joi.object().pattern(/./, Joi.any()),
			...ptr
		};

		await Joi.validate({body, params}, schema);

		return true;

	} catch (e) {
		console.log(e);
		throw new Error('Mandatory Fields are required.');
	}
}
