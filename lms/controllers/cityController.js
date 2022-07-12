var express = require('express');
var router = express.Router();

var CityService = commonUtil.getService('city');
const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

router.post('/get', function (req, res) {
	CityService.get(req)
		.then(function (data) {
			if(req.body.download){
				ReportExelService.cityStateReports(data, req.user, function(data){
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			}else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'cities found',
					data
				});
			}
		})
		.catch(function (err) {
			return res.status(err.statusCode || 500).json({
				'status': 'ERROR',
				'message': err.message || err.toString()
			});
		});
});

router.post('/autosuggest', function (req, res) {
	CityService.autosuggest(req.body.query)
		.then(function (data) {
			return res.status(200).json({
				'status': 'OK',
				'message': 'cities found',
				data
			});
		})
		.catch(function (err) {
			return res.status(err.statusCode || 500).json({
				'status': 'ERROR',
				'message': err.message || err.toString()
			});
		});
});

router.post('/upsert', function (req, res) {
	CityService.upsert(req.body, req)
		.then(function (data) {
			return res.status(200).json({
				'status': 'OK',
				'message': 'cities found',
				data
			});
		})
		.catch(function (err) {
			return res.status(err.statusCode || 500).json({
				'status': 'ERROR',
				'message': err.message || err.toString()
			});
		});
});

router.put('/remove/:_id', async function (req, res, next) {
	try{
		let city = await CityService.removeCity({_id:req.params._id});
		return res.status(200).json({
			'status': 'OK',
			'message': ' City Removed',
			'data': city
		});
	}catch (e){
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.message
		});
	}
});

module.exports = router;
