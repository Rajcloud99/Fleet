
var router = express.Router();

var DriverCounsellingService = promise.promisifyAll(commonUtil.getService('driverCounselling'));

var ReportExcelService = promise.promisifyAll(commonUtil.getService("reportExel"));

router.post("/add",	function(req,res,next){
	// if(otherUtil.validateSuperAdmin(req,res)){
	// 	return res.status(500).json({
	// 		"status": "ERROR",
	// 		"error_message": "Access Denied!!"
	// 	});
	// }
	DriverCounsellingService.addDriverCounsellingAsync(req.body)
		.then(function(driverCounselling){
			return res.status(200).json({"status":"OK",
				"message":"Driver Counselling data has been added successfully",
				"data":driverCounselling});
		}).catch(next)
});

router.post("/get",async function(req,res,next){
	try {
		let data = await DriverCounsellingService.allDriverCounsellingAsync(req.body);
		if (req.body.download ) {
			ReportExcelService.driverCounsellingReport(data.data, req.user.clientId, function (d) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': d.url
				});
			});
		} else {
			return res.status(200).json({
				"status": "OK",
				"message": "Driver Counselling data found",
				"data": data.data,
				"count": data.count,
				"pages": data.no_of_pages
			});
		}
	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
			err: e
		});
	}
});

router.delete("/delete/:_id",function(req,res,next){
	// if(otherUtil.validateSuperAdmin(req,res)){
	// 	return res.status(500).json({
	// 		"status": "ERROR",
	// 		"error_message": "Access Denied!!"
	// 	});
	// }
	if (otherUtil.isEmptyObject(req.params)){
		return res.status(500).json({"status":"ERROR","message":"No id provided to delete for driver Counselling"});
	}
	DriverCounsellingService.deleteDriverCounsellingIdAsync(req.params._id)
		.then(function(deleted){
			return res.status(200).json({"status":"OK",
				"message":"Driver Counselling has been deleted successfully",
				"data":deleted});
		}).catch(next)
});

module.exports = router;
