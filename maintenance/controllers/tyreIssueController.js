/**
 * Created by bharath on 26/04/17.
 */

var router = express.Router();
var tyreIssueService = promise.promisifyAll(commonUtil.getMaintenanceService('tyreIssue'));
var TyreMasterService = promise.promisifyAll(commonUtil.getMaintenanceService('tyreMaster'));
var jobCardService = promise.promisifyAll(commonUtil.getMaintenanceService('jobCard'));
var async = require('async');

router.post("/issue",
	function (req, res, next) {
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({"status": "ERROR", "message": "No body found"});
		}
		if (req.body.allTyre_number && req.body.allTyre_number.length < 1) {
			return res.status(500).json({"status": "ERROR", "message": "Tyre not found"});
		}
		return next();
	},
	function (req, res, next) {
		jobCardService.findJobCardAsync({jobId:req.body.jobId,clientId:req.user.clientId}).then(jobData=>{
			if(jobData && jobData[0]){
				req.body.jobVehicle=jobData[0].vehicle_number;
				return next();
			}
			else{
				return res.status(500).json({"status": "ERROR", "message": 'Job Card not found'});
			}
		}).catch(function (err) {
			return res.status(500).json({"status": "ERROR", "message": 'Job Card not found '+err});
		});
	},
	function (req, res, next) {
		req.body.clientId = req.user.clientId;
		req.body.issued_by_employee_code = req.user.userId;
		req.body.issued_by_employee_name = req.user.full_name;
		req.body.user_type = req.user.user_type;

		req.issued=[];
		req.notIssued=[];
		req.message="";
		async.forEachOf(req.body.allTyres,function (data,key,callback) {
			var d2s=JSON.parse(JSON.stringify(req.body));
			d2s.tyre_id=data._id;
			d2s.tyre_number=data.tyre_number;
			d2s.association_position=key;
			d2s.jobVehicle=req.body.jobVehicle;
			TyreMasterService.findTyreMasterByIdAsync(mongoose.Types.ObjectId(d2s.tyre_id))
				.then(function (tyreData) {
					if(tyreData && tyreData[0]){
						d2s.amount=tyreData[0].current_price;
						d2s.tyre_last_status=tyreData[0].status;
						d2s.issue_category=tyreData[0].tyre_category;
						tyreIssueService.getTyreIssueAsync({tyre_number: d2s.tyre_number, isReturned: false})
							.then(function (issue) {
								if (issue.length > 0){
									req.message=req.message+d2s.tyre_number+" is already issued!\n";
									callback();
								}
								else {
									tyreIssueService.addTyreIssueAsync(d2s)
										.then(function (added) {
											if (added) {
												req.message = req.message + d2s.tyre_number + " issued SUCCESSFULLY\n";
											} else {
												req.message = req.message + d2s.tyre_number + " unable to issue!\n";
											}
											callback();
										}).catch(function (err) {
										callback(err);
									})
								}
							})
							.catch(function (err) {
								callback(err);
							});
					}
					else {
						req.message=req.message+d2s.tyre_number+" not found!\n";
					}
				})
				.catch(function (err) {
					callback(err);
				});
		},
		function (err) {
			if(err) return res.status(500).json({"status": "ERROR", "message": req.message+err});
			return res.status(200).json({"status": "OK", "message": req.message});
		});
	}
);

router.post("/return",
	function (req, res, next) {
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({"status": "ERROR", "message": "No body found"});
		}
		return next();
	},
	function (req, res, next) {

		var required = ['issue_id', 'vehicle_no', 'returned_odometer', 'tyre_return_quality_remark'];
		var missing = [];
		for (var i = 0; i < required.length; i++) {
			if (!(required[i] in req.body)) missing.push(required[i]);
		}

		if (missing.length > 0) return res.status(500).json({
			"status": "ERROR",
			"message": "Please provide " + missing.toString()
		});


		req.body.clientId = req.user.clientId;
		req.body.returned_by_employee_code = req.user.userId;
		req.body.returned_by_employee_name = req.user.full_name;
		req.body.user_type = req.user.user_type;
		req.body.isReturned = true;

		next();
	},
	function (req, res, next) {
		tyreIssueService.getTyreIssueAsync({_id: req.body.issue_id, isReturned: false})
			.then(function (issue) {
				if (issue.length == 0) return res.status(500).json({
					"status": "ERROR",
					"message": "Tyre not issued/invalid issue_id"
				});
				next();
			});
	},
	function (req, res, next) {
		tyreIssueService.returnTyreIssueAsync(req.body)
			.then(function (added) {
				if (added) {
					return res.status(200).json({
						"status": "OK",
						"message": "Tyre Returned successfully",
						"data": added
					});
				} else {
					return res.status(500).json({
						"status": "ERROR",
						"message": "Unable to Issue Tyre"
					});
				}
			}).catch(next)
	}
);

router.get("/get",
	function (req, res, next) {
		tyreIssueService.getTyreIssueAsync(req.query)
			.then(function (data) {
				if (data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Data found.",
						"data": data
					});
				} else {
					return res.status(200).json({
						"status": "OK",
						"message": "No data found.",
						"data": []
					});
				}
			}).catch(next)
	}
);

module.exports = router;
