/**
 * Created by manish on 5/7/16.
 */
const router = express.Router();
const SimMasterService = promise.promisifyAll(commonUtil.getGpsService('simMaster'));
const async = require('async');
const poService = promise.promisifyAll(commonUtil.getMaintenanceService('po'));

router.post("/add",
	function (req, res, next) {
		if (!req.body.sim_no || !req.body.mobile_no) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide complete data to add sim"
			});
		} else {
			return next();
		}
	},
	function (req, res, next) {
		SimMasterService.findSimMasterByQueryAsync({
			$or: [{
				clientId: req.body.clientId,
				sim_no: req.body.sim_no
			}, {clientId: req.body.clientId, mobile_no: req.body.mobile_no}]
		})
			.then(function (simMaster) {
				if (simMaster && simMaster[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"message": "This sim no./mobile no. already exists.",
						"data": simMaster
					});
				} else {
					return next();
				}
			}).catch(next)
	},
	function (req, res, next) {
		SimMasterService.addSimMasterAsync(req.body)
			.then(function (simMaster) {
				return res.status(200).json({
					"status": "OK",
					"message": "Sim has been added successfully",
					"data": simMaster
				});
			}).catch(next)
	}
);

router.post("/inward",
	/*validate */
	function (req, res, next) {
		if (otherUtil.isEmptyObject(req.body)){
			return res.status(500).json({"status":"ERROR","message":"Sent request is empty"});
		}
		if (!req.body.purchased_from) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide vendor identifier"
			});
		}if (!req.body.po_number || !req.body.po_ref) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide po number and po identifier"
			});
		}if (!req.body.purchase_invoice_no) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide invoice number"
			});
		}
		if (!req.body.items) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide atleast one item row"
			});
		}

		/*fetch PO */
		poService.findpoAsync({_id:req.body.po_ref})
			.then(function(pos_found){
				if (pos_found  && (pos_found.length>0)) {
					req.po_data = JSON.parse(JSON.stringify(pos_found[0]));
					return next();
				}else{
					return res.status(200).json({
						"status": "ERROR",
						"message": "This po does not exist.",
					});
				}
			}).catch(next);
	},
	/* update sim inventory */
	function (req,res,next) {
		async.forEach(req.body.items,function (item,callback2) {
			async.forEachOf(item.mobile_no_list,function (mobile_no, index, callback1) {
				let simBody = {};
				simBody.clientId= req.body.clientId;
				simBody.purchased_from = req.body.purchased_from;
				simBody.branch = req.body.branch;
				simBody.sim_no = item.sim_no_list[index];
				simBody.mobile_no = mobile_no;
				simBody.created_by = req.body.created_by;
				simBody.last_modified_by = req.body.last_modified_by;
				simBody.rate = item.rate;
				simBody.rate_inc_tax = item.rate_inc_tax;
				simBody.part_ref= item.part_ref;
				simBody.purchase_invoice_no = req.body.purchase_invoice_no;
				simBody.po_number= req.body.po_number;
				simBody.po_ref= req.body.po_ref;
				SimMasterService.updateSimMasterAsync({mobile_no:mobile_no},simBody)
					.then(function (updatedDoc) {
						return callback1();
					}).catch(callback1)
			},function (err) {
				if (err) {return callback2(err)}
				return callback2();
			})
		},function (err) {
			if (err) {return next(err)}
			return next();
		})
	}
	/* update PO */
	,function (req, res, next) {
		if(req.body && req.po_data && req.po_data.spare && (req.po_data.spare.length>0) && req.body.items && (req.body.items.length>0)){
			let po_update = {};
			let completeInwarded=true;
			for (let i = 0; i < req.po_data.spare.length; i++) {
				for (let j = 0; j < req.body.items.length; j++) {
					if(req.po_data.spare[i].part_ref === req.body.items[j].part_ref){
						req.po_data.spare[i].remaining_quantity = (req.po_data.spare[i].remaining_quantity ||req.po_data.spare[i].quantity) - req.body.items[j].quantity;
						req.po_data.spare[i].mobile_no_list = req.body.items[j].mobile_no_list;
						req.po_data.spare[i].sim_no_list = req.body.items[j].sim_no_list;
					}
				}
				if(completeInwarded && req.po_data.spare[i].remaining_quantity !==0){
					completeInwarded=false;
				}
			}

			po_update.status = completeInwarded?constant.poStatus[3]:constant.poStatus[4];
			po_update.spare = req.po_data.spare;
			po_update.rFreight = req.po_data.rFreight?req.po_data.rFreight:req.po_data.freight;
			po_update.rFreight -= req.body.freight?req.body.freight:0;

			poService.findandUpdatePOByIdAsync(req.po_data._id,po_update)
				.then(function(updated){
					if(updated){
						return res.status(200).json({"status":"OK",
							"message":"Sim inventory has been added successfully",
							"data":req.body
						});
					}else{
						return res.status(500).json({"status":"ERROR",
							"message":"Unable to update sim inventory. PO error."});
					}
				}).catch(next)
		}else{
			return res.status(500).json({"status":"ERROR",
				"message":"Unable to update sim inventory. PO error 2"
			});
		}
	}
);

router.get("/get", function (req, res, next) {
	SimMasterService.searchSimMasterAsync(req.query)
		.then(function (data) {
			return res.status(200).json({
				"status": "OK",
				"message": "Sim found",
				"data": data.simMasters,
				"count": data.count,
				"pages": data.pages
			});
		}).catch(next)
});

router.put("/update/:_id",
	function (req, res, next) {
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({"status": "ERROR", "message": "No update body found"});
		}
		if (otherUtil.isEmptyObject(req.params)) {
			return res.status(500).json({"status": "ERROR", "message": "No id provided for updating sim"});
		}
		if (!req.body.sim_no || !req.body.mobile_no || req.body.sim_no.length === 0
			|| req.body.mobile_no.length === 0) {
			return res.status(500).json({
				"status": "ERROR",
				"message": "Please provide complete data to update sim"
			});
		}
		return next();
	}, function (req, res, next) {
		SimMasterService.findSimMasterByQueryAsync({
			$or: [{clientId: req.body.clientId, sim_no: req.body.sim_no},
				{clientId: req.body.clientId, mobile_no: req.body.mobile_no}],
			_id:{$ne:req.params._id}})
			.then(function (simMaster) {
				if (simMaster && simMaster[0]) {
					return res.status(500).json({
						"status": "ERROR",
						"message": "This sim no./mobile no. already exists.",
						"data": simMaster
					});
				} else {
					return next();
				}
			}).catch(next)
	},
	function (req, res, next) {
		delete req.body.created_at;
		delete req.body.last_modified_at;
		delete req.body._id;
		SimMasterService.updateSimMasterByIdAsync(req.params._id, req.body)
			.then(function (updated) {
				return res.status(200).json({
					"status": "OK",
					"message": "Sim has been updated successfully",
					"data": updated
				})
			}).catch(next)
	});

router.delete("/delete/:_id", function (req, res, next) {
	if (otherUtil.isEmptyObject(req.params)) {
		return res.status(500).json({"status": "ERROR", "message": "No id provided to delete sim"});
	}
	SimMasterService.deleteSimMasterIdAsync(req.params._id)
		.then(function (deleted) {
			return res.status(200).json({
				"status": "OK",
				"message": "Sim has been deleted successfully",
				"data": deleted
			});
		}).catch(next)
});

module.exports = router;
