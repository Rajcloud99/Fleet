/**
 * Created by bharath on 26/04/17.
 */

var TyreIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('tyreIssue'));
var tyreMasterService = promise.promisifyAll(commonUtil.getMaintenanceService('tyreMaster'));
var TyreMaster = promise.promisifyAll(commonUtil.getMaintenanceModel('tyreMaster'));
var winston = require('winston');
var async = require("async");

module.exports.addTyreIssue = function (reqBody, next) {
	if (reqBody.slip_number) reqBody.pslip_number = reqBody.slip_number;
	delete reqBody.created_at;
	idUtil.generateTyreSlipNumberAsync({clientId: reqBody.clientId})
		.then(function (slip_number) {
			reqBody.slip_number = slip_number;
			var issued_tyre;
			reqBody.issue_slip_number = slip_number;
			var tyreIssue = new TyreIssue(reqBody);
			tyreIssue.saveAsync(reqBody)
				.then(function (tyreIssued) {
					issued_tyre = tyreIssued;
					return tyreMasterService.updateTyreMasterByIdAsync(reqBody.tyre_id, {
						status: constant.tyreStatus[1],
						issue_id: tyreIssue._id,
						structure_name: tyreIssue.structure_name,
						vehicle_no: tyreIssue.vehicle_no,
                        association_date: new Date(),
						current_price : 0
					});
				})
				.then(function () {
					winston.info("Issued tyre", JSON.stringify(issued_tyre));
					return next(null, issued_tyre);
				})
				.catch(function (err) {
					winston.error("error in Issuing Tyre:" + err);
					return next(err);
				});
		}).catch(next);
};

module.exports.returnTyreIssue = function (reqBody, next) {
	if (reqBody.slip_number) reqBody.pslip_number = reqBody.slip_number;
	idUtil.generateTyreSlipNumberAsync({clientId: reqBody.clientId})
		.then(function (slip_number) {
			reqBody.slip_number = slip_number;
			var issued_tyre;

			reqBody.issued_tyre = issued_tyre;
			reqBody.return_slip_number = slip_number;

			var issue_id = reqBody.issue_id;
			delete reqBody.issue_id;
			var tyre_id = reqBody._id;
			delete reqBody._id;

			promise.promisify(exports.updateTyreIssueById)(issue_id, reqBody)
				.then(function (tyreIssued) {
					issued_tyre = tyreIssued;
					winston.info("Updated tyre", JSON.stringify(tyreIssued));
					var tyreRun = reqBody.returned_odometer-issued_tyre.issued_odometer;
					var tyreMasterReq = {
						status: constant.tyreStatus[2], //Repo bin
                        tyre_category: reqBody.return_status,
                        vehicle_no: "",
                        association_date: ""
					};
					return TyreMaster.findOneAndUpdateAsync({_id:tyre_id},{$set:tyreMasterReq,$inc:{total_run: tyreRun}});
				})
				.then(function(tyreMaster) {
					winston.info('Updated tyreMaster', JSON.stringify(tyreMaster));
					return next(null, issued_tyre);
				})
				.catch(function (err) {
					winston.error("error in Updating Tyre:" + err);
					return next(err);
				});
		}).catch(next);
};

module.exports.updateTyreIssueById = function(id,reqBody,next) {
	TyreIssue.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new:true})
		.then(function(TyreMaster) {
			winston.info("updated TyreIssue ", JSON.stringify(TyreMaster));
			return next(null, TyreMaster);
		})
		.catch(function(err) {
			winston.error("error in update TyreMaster:" + err);
			return next(err);
		});
};

module.exports.findTyreIssue = function (oQuery, next) {
	if (oQuery.taskId) {
		oQuery['issued_tyre.taskId'] = oQuery.taskId;
		delete oQuery.taskId;
	}
	TyreIssue.aggregateAsync([{$unwind: '$issued_tyre'}, {$match: oQuery}])
		.then(function (available) {
			return next(null, available);
		})
		.catch(function (err) {
			return next(err);
		});
};

module.exports.getTyreIssue = function (oQuery, next) {
	if (oQuery.taskId) {
		oQuery['issued_tyre.taskId'] = oQuery.taskId;
		delete oQuery.taskId;
	}
	delete oQuery.request_id;
	delete oQuery.validate;
	TyreIssue.findAsync(oQuery)
		.then(function (available) {
			return next(null, available);
		})
		.catch(function (err) {
			return next(err);
		});
};


var getInventory = function (dataToReturn, reqBody, tyreToIssue, quantity, next) {
	Inventory.find({
		clientId: reqBody.clientId,
		tyre_code: tyreToIssue.tyre_code, homId: reqBody.homId, remaining_quantity: {$gt: 0}
	}).sort({$natural: 1}).limit(1)
		.then(function (data) {
			var dataToPush = {};
			dataToPush.taskId = tyreToIssue.taskId;
			dataToPush.task_name = tyreToIssue.task_name;
			dataToPush.tyre_code = tyreToIssue.tyre_code;
			dataToPush.tyre_name = tyreToIssue.tyre_name;
			dataToPush.flag = tyreToIssue.flag;
			dataToPush.cost_per_piece = data[0].rate_per_piece;
			dataToPush.category_name = data[0].category_name;
			dataToPush.category_code = data[0].category_code;
			dataToPush.uom = data[0].uom;
			dataToPush.inventory_entryid = data[0].entryId;
			if (quantity > data[0].remaining_quantity) {
				dataToPush.quantity = data[0].remaining_quantity;
				dataToReturn.push(dataToPush);
				Inventory.findOneAndUpdateAsync({"entryId": data[0].entryId}, {$set: {"remaining_quantity": 0}})
					.then(function (updated) {
						getInventory(dataToReturn, reqBody, tyreToIssue, quantity - data[0].remaining_quantity, next);
					})
			}
			else {
				dataToPush.quantity = quantity;
				dataToReturn.push(dataToPush);
				Inventory.findOneAndUpdateAsync({"entryId": data[0].entryId}, {$inc: {"remaining_quantity": -1 * quantity}})
					.then(function (updated) {
						return next(dataToReturn);
					})
			}
		})
};
