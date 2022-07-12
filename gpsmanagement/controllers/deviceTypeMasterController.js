/**
 * Created by manish on 5/7/16.
 */
const router = express.Router();
const DeviceTypeMasterService = promise.promisifyAll(commonUtil.getGpsService('deviceTypeMaster'));

router.post("/add",
	function(req,res,next){
		if (!req.body.code){
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide complete data to add device type"
			});
		}else{
			return next();
		}
	},
	function(req,res,next){
		DeviceTypeMasterService.findDeviceTypeMasterByQueryAsync({
			code:req.body.code})
			.then(function(deviceTypeMaster){
				if (deviceTypeMaster && deviceTypeMaster[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"message": "This device type already exists.",
						"data":deviceTypeMaster
					});
				}else{
					return next();
				}
			}).catch(next)
	},
	function(req,res,next) {
		DeviceTypeMasterService.addDeviceTypeMasterAsync(req.body)
			.then(function(deviceTypeMaster){
				return res.status(200).json({"status":"OK",
					"message":"Device type has been added successfully",
					"data":deviceTypeMaster
				});
			}).catch(next)
	}
);

router.get("/get",function(req,res,next){
	DeviceTypeMasterService.searchDeviceTypeMasterAsync(req.query)
		.then(function(data){
			return res.status(200).json({"status":"OK",
				"message":"Device type found",
				"data":data.deviceTypeMasters,
				"count":data.count,
				"pages":data.pages});
		}).catch(next)
});

router.put("/update/:_id",
	function(req,res,next) {
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({"status": "ERROR", "message": "No update body found"});
		}
		if (otherUtil.isEmptyObject(req.params)) {
			return res.status(500).json({"status": "ERROR", "message": "No id provided for updating device type"});
		}
		return next();
	},function(req,res,next){
		DeviceTypeMasterService.findDeviceTypeMasterByQueryAsync({
			_id:{$ne:req.params._id},
			code:req.body.code,
			clientId:req.body.clientId})
			.then(function(deviceTypeMaster){
				if (deviceTypeMaster && deviceTypeMaster[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"message": "This device type already exists.",
						"data":deviceTypeMaster
					});
				}else{
					return next();
				}
			}).catch(next)
	},function(req,res,next){
		delete req.body.created_at;
		delete req.body.last_modified_at;
		delete req.body._id;
		DeviceTypeMasterService.updateDeviceTypeMasterByIdAsync(req.params._id,req.body)
			.then(function(updated){
				return res.status(200).json({"status":"OK",
					"message":"Device type has been updated successfully",
					"data":updated
				})
			}).catch(next)
	});

router.delete("/delete/:_id",function(req,res,next){
	if (otherUtil.isEmptyObject(req.params)){
		return res.status(500).json({"status":"ERROR","message":"No id provided to delete for device type"});
	}
	DeviceTypeMasterService.deleteDeviceTypeMasterIdAsync(req.params._id)
		.then(function(deleted){
			return res.status(200).json({"status":"OK",
				"message":"Device type has been deleted successfully",
				"data":deleted});
		}).catch(next)
});

module.exports = router;
