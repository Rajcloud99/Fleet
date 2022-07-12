
let router = require('express').Router();
/*
* Created By Harikesh dated: 17-10-2019
* */
const validate = require('express-validation');
var multipartMiddleware = require('connect-multiparty')();
const path = require('path');
let GR = commonUtil.getModel('tripGr');
const Joi = require('joi');
const reportCronService = commonUtil.getService('reportCron');
const moment = require('moment');


router.route('/getDownload').post(reportCronService.getDownloadRep);

router.route('/getDownloadMMT').post(reportCronService.getDownloadRep);

router.post('/getDaily', async function (req, res, next) {
	try {

        let to = moment().toDate();
        let from = moment(to).add(-1, 'day').toDate();

		await reportCronService.getGrReportDaily({
			from,
			to
		})

		return res.status(200).json({
			"status": "OK",
			"message": "Report daily sync successfully"
		});

	} catch (e) {
		console.log(e);
        throw new Error('Error in getGrReportDaily fun..');
	}
});

module.exports = router;
