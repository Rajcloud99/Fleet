var router = express.Router();
var directoryService = commonUtil.getService('directory');
const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

router.post('/get', async function(req, res, next) {
	req.body.user = req.user;
	try{
		let aDirectory = await directoryService.findDirectoryAggr(req.body);
		let data = {data:aDirectory};
		if(req.body.download){
			ReportExelService.directoryReports(aDirectory, req.user, function(data){
				return res.status(200).json({
					"status": "OK",
					"message": "report download available.",
					"url": data.url
				});
			});
		}else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found.',
				'data': data
			});
		}
	}catch(e) {
		console.error('in catch of get directory',e.toString());
		next(e);
	}
});


module.exports = router;
