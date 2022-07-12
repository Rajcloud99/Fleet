var router = express.Router()
var authUtil = commonUtil.getUtil('auth-util')
const logsService = commonUtil.getService('logs');
const Logs = commonUtil.getModel('logs');
const ReportExelService = promise.promisifyAll(commonUtil.getService('reportExel'));

router.route('/getAll').post(async function(req,res,next){
    try{
        let data = await logsService.findLogsDetail(req.body, req);
        if(req.body.download) {
			if(req.body.selectedRep === "Advance"){
				ReportExelService.reportDeleteLogsAlert(data, req.body.clientId, function (data) {
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			}else{
				ReportExelService.reportLogsAlert(data, req.body.clientId, function (data) {
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			}


		}else {
			return res.status(200).json({
				status: 'OK',
				message: "Logs Found",
				data
			});
		}
    }catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});


router.route('/addRemarkLogs').post(async function(req,res,next){
	try{
		if(!req.body._id){
			throw new Error('Remark not found');
		}

		let oLogs = await Logs.findOne({_id:otherUtil.arrString2ObjectId(req.body._id)},{_id:1}).lean();
		if(!(oLogs && oLogs._id)){
			throw new Error('Invalid Remark');
		}

		let data = await logsService.updateLogsRemark(req, res);
		return res.status(200).json({
			status: 'OK',
			message: "Remark Added",
			data
		});

	}catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

router.route('/getNotif').get(async function(req,res,next){
    try{

        let data = await logsService.findNotif(req, res);
        return res.status(200).json({
			status: 'OK',
			message: "Logs Found",
			data
        });

    }catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});





module.exports = router
