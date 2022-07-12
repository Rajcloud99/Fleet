
var router = express.Router();

var AccidentVehicleService = promise.promisifyAll(commonUtil.getService('accidentVehicle'));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

router.post("/add",	function(req,res,next){
		// if(otherUtil.validateSuperAdmin(req,res)){
		// 	return res.status(500).json({
		// 		"status": "ERROR",
		// 		"error_message": "Access Denied!!"
		// 	});
		// }
	AccidentVehicleService.addAccidentVehicleAsync(req.body)
			.then(function(accidentVehicle){
				return res.status(200).json({"status":"OK",
					"message":"Accident Vehicle data has been added successfully",
					"data":accidentVehicle});
			}).catch(next)
	});

router.post("/get",async function(req,res,next){
	try {
		let data = await AccidentVehicleService.allAccidentVehiclesAsync(req.body);
		if (req.body.download ) {
			ReportExelService.accidentVehicleReport(data.data, req.user.clientId, function (d) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'report download available.',
					'url': d.url
				});
			});
		} else {
			return res.status(200).json({
				"status": "OK",
				"message": "Accident vehicle data found",
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

router.put("/update/:_id",function(req,res,next){
	// if(otherUtil.validateSuperAdmin(req,res)){
	// 	return res.status(500).json({
	// 		"status": "ERROR",
	// 		"error_message": "Access Denied!!"
	// 	});
	// }
	if (otherUtil.isEmptyObject(req.body)){
		return res.status(500).json({"status":"ERROR","message":"No update body found"});
	}
	if (otherUtil.isEmptyObject(req.params)){
		return res.status(500).json({"status":"ERROR","message":"No id provided for updating icd"});
	}
	AccidentVehicleService.updateAccidentVehicleIdAsync(req.params._id,req.body)
		.then(function(updated){
			return res.status(200).json({"status":"OK",
				"message":"Accident Vehicle data has been updated successfully",
				"data":updated});
		}).catch(next)
});

router.delete("/delete/:_id",function(req,res,next){
	// if(otherUtil.validateSuperAdmin(req,res)){
	// 	return res.status(500).json({
	// 		"status": "ERROR",
	// 		"error_message": "Access Denied!!"
	// 	});
	// }
	if (otherUtil.isEmptyObject(req.params)){
		return res.status(500).json({"status":"ERROR","message":"No id provided to delete for icd"});
	}
	AccidentVehicleService.deleteAccidentVehicleIdAsync(req.params._id)
		.then(function(deleted){
			return res.status(200).json({"status":"OK",
				"message":"Accident Vehicle has been deleted successfully",
				"data":deleted});
		}).catch(next)
});

module.exports = router;
