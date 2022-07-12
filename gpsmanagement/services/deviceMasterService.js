const deviceMaster = promise.promisifyAll(commonUtil.getGpsModel('deviceMaster'));
const NO_OF_DOCS = 15;

module.exports.addDeviceMaster = function (reqBody, next) {
	deviceMaster.findAsync({
		clientId: reqBody.clientId,
		imei: reqBody.imei
	})
		.then(function (foundDevice) {
			if (foundDevice && foundDevice[0]) {
				let err = new Error("This device imei already exists."); // Tells us which IP tried to reach a particular URL
				err.statusCode = 500;
				return next(err);
			} else {
				let deviceMaster_ = new deviceMaster(reqBody);
				deviceMaster_.saveAsync()
					.then(function (savedDeviceMaster) {
						deviceMaster.find({_id: savedDeviceMaster._id})
							.populate("branch", "name id _id")
							.populate("purchased_from", "vendorId name _id")
							.populate("sold_to_customer", "customerId name _id")
							.populate("part_ref", "name code uom _id category_name category_code rate manufacturer")
							.populate("created_by", "full_name userId _id")
							.populate("last_modified_by", "full_name userId _id")
							.execAsync()
							.then(function (data) {
								winston.info("added deviceMaster", JSON.stringify(data));
								return next(null, data);
							}).catch(next);
					})
					.catch(function (err) {
						winston.error("error in add deviceMaster:" + err);
						return next(err);
					});
			}
		}).catch(next);
};

module.exports.updateDeviceMaster = function (query, reqBody, populate, next) {

	function findDevice(query, reqBody, populate, callback) {
		if (reqBody.imei) {
			deviceMaster.findAsync({
				clientId: reqBody.clientId,
				imei: reqBody.imei,
				_id: {$ne: query._id}
			})
				.then(function (foundDevice) {
					if (foundDevice && foundDevice[0]) {
						let err = new Error("This device imei already exists."); // Tells us which IP tried to reach a particular URL
						err.statusCode = 500;
						return callback(err);
					} else {
						callback(null, query, reqBody, populate)
					}
				}).catch(callback);
		}else{
			callback(null, query, reqBody,populate)
		}
	}

	function updateDevice(query, reqBody,populate, callback) {
		if (populate) {
			deviceMaster.findOneAndUpdate(query, {$set: reqBody}, {
				new: true,
				upsert: true,
				setDefaultsOnInsert: true
			})
				.populate("branch", "name id _id")
				.populate("purchased_from", "vendorId name _id")
				.populate("sold_to_customer", "customerId name _id")
				.populate("part_ref", "name code uom _id category_name category_code rate manufacturer")
				.populate("created_by", "full_name userId _id")
				.populate("last_modified_by", "full_name userId _id")
				.execAsync()
				.then(function (foundDevice) {
					winston.info("updated deviceMaster ", JSON.stringify(foundDevice));
					return callback(null, foundDevice);
				})
				.catch(function (err) {
					winston.error("error in update deviceMaster:" + err);
					return callback(err);
				});
		}else{
			deviceMaster.findOneAndUpdateAsync(query, {$set: reqBody}, {
				new: true,
				upsert: true,
				setDefaultsOnInsert: true
			})
				.then(function (deviceMaster) {
					winston.info("updated deviceMaster ", JSON.stringify(deviceMaster));
					return callback(null, deviceMaster);
				})
				.catch(function (err) {
					winston.error("error in update deviceMaster:" + err);
					return callback(err);
				});
		}
	}


	async.waterfall([
		async.apply(findDevice,query, reqBody,populate),
		updateDevice
		],
		function(err, result){
			if (err) {return next(err)}
			else return next(null,result)
	});
};

module.exports.findDeviceMaster = function (query, populate, next) {
	if (populate) {
		deviceMaster.find(query)
			.populate("branch", "name id _id")
			.populate("purchased_from", "vendorId name _id")
			.populate("sold_to_customer", "customerId name _id")
			.populate("part_ref", "name code uom _id category_name category_code rate manufacturer")
			.populate("created_by", "full_name userId _id")
			.populate("last_modified_by", "full_name userId _id")
			.execAsync()
			.then(function (deviceMaster) {
				winston.info("found deviceMaster", JSON.stringify(deviceMaster));
				return next(null, deviceMaster);
			}).catch(function (err) {
			winston.error("error in find deviceMaster:" + err);
			return next(err);
		});
	} else {
		deviceMaster.findAsync(query)
			.then(function (deviceMaster) {
				winston.info("found deviceMaster", JSON.stringify(deviceMaster));
				return next(null, deviceMaster);
			}).catch(function (err) {
				winston.error("error in find deviceMaster:" + err);
				return next(err);
			});
	}
};

module.exports.deleteDeviceMaster = function (query, next) {
	deviceMaster.removeAsync(query)
		.then(function (removed) {
			winston.info("removed deviceMaster", JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function (err) {
			winston.error("error in remove deviceMaster " + err);
			return next(err);
		});
};

const allowedSearchFields = {
	"_id": 1,
	"part_ref": 1,
	"clientId": 1,
	"purchase_invoice_no":1,
	"imei":1,
	"po_number":1,
	"stock_status":1,
	"allocation_status":1,
	"health_status":1,
	"issued_to":1
};

function createDeviceMasterAggrFilter(reqQuery) {
	let obj;
	const aggrFilter = [];
	for (let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === "name" || key === "model"|| key === "imei") {
				obj = {};
				obj[key] = {$regex: reqQuery[key], $options: 'i'};
				aggrFilter.push({$match: obj});
			} else if (key === "_id" || key === "part_ref" || key === "issued_to") {
				obj = {};
				obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
				aggrFilter.push({$match: obj});
			} else {
				obj = {};
				obj[key] = reqQuery[key];
				aggrFilter.push({$match: obj});
			}
		}
	}
	return aggrFilter;
}

module.exports.searchDeviceMaster = function (reqQuery, next) {
	const aggrFilter = createDeviceMasterAggrFilter(reqQuery);

	if (reqQuery.sort) {
		aggrFilter.push({$sort: {created_at: parseInt(reqQuery.sort)}})
	}
	if (reqQuery.trim) {
		const projection = {
			_id: 1,
			imei: 1
		};
		aggrFilter.push({$project: projection});
	}
	aggrFilter.push({$sort: {created_at: -1}});
	const datacursor = deviceMaster.aggregate(aggrFilter);
	aggrFilter.push({$group: {_id: null, count: {$sum: 1}}});

	const countCursor = deviceMaster.aggregate(aggrFilter);
	let no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

	if (no_of_documents > NO_OF_DOCS) {
		no_of_documents = NO_OF_DOCS;
	}

	if (reqQuery.skip) {
		const skip_docs = (reqQuery.skip - 1) * no_of_documents;
		datacursor.skip(parseInt(skip_docs));
	}

	countCursor.exec(function (err, countArr) {
		if (err) {
			return next(err);
		}

		if (countArr.length > 0) {
			const count = countArr[0].count;
			let no_of_pages;
			if (count / no_of_documents > 1) {
				no_of_pages = Math.ceil(count / no_of_documents);
			} else {
				no_of_pages = 1;
			}
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}
			datacursor.exec(function (err, deviceMasters) {
				deviceMaster.populate(deviceMasters, [{path: "branch", select: "name id _id"},
						{path: "sold_to_customer", select: "customerId name _id"},
						{path: "purchased_from", select: "vendorId name _id"},
						{path: "part_ref", select: "name code uom _id category_name category_code rate manufacturer"},
						{path: "created_by", select: "full_name userId _id"},
						{path: "last_modified_by", select: "full_name userId _id"}]
					, function (err, populatedTransactions) {
						const deviceMasters_ = JSON.parse(JSON.stringify(populatedTransactions));
						if (err) {
							return next(err);
						}
						const objToReturn = {};
						objToReturn.deviceMasters = deviceMasters_;
						objToReturn.pages = no_of_pages;
						objToReturn.count = count;
						return next(null, objToReturn);
					});

			});
		} else {
			const objToReturn = {};
			objToReturn.deviceMasters = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};

module.exports.bulkUpdateDeviceMaster = function (reqBody, op = 'allocate', next) {
	let bulkUpdate = deviceMaster.collection.initializeOrderedBulkOp();
	for(let index=0; index<reqBody.devices.length; index++){
		//let data =JSON.parse(JSON.stringify(masterData[index]));
		let id = reqBody.devices[index].device_ref;
		let reason = reqBody.devices[index].return_reason;
		let remark = reqBody.devices[index].return_remark;
		switch(op) {
			case 'allocate':
				bulkUpdate
					.find({_id:mongoose.Types.ObjectId(id)})
					.update({$set:{allocation_status:"Allocated",allocation_date:new Date(),allocation_done_by:reqBody.created_by}});
				break;
			case 'allocationInReplace':
				bulkUpdate
					.find({_id:mongoose.Types.ObjectId(reqBody.new_devices[index].device_ref)})
					.update({$set:{allocation_status:"Allocated",allocation_date:new Date(),allocation_done_by:reqBody.returned_to}});
				break;
			case 'issue':
				bulkUpdate
					.find({_id:mongoose.Types.ObjectId(id)})
					.update({$set:{
							stock_status:'Issued',
							issued_date:reqBody.issued_date,
							issued_by:mongoose.Types.ObjectId(reqBody.issued_by),
							issued_to:mongoose.Types.ObjectId(reqBody.issued_to)
					}});
				break;
			case 'returnFromSalesExecutive':
				bulkUpdate
					.find({_id:mongoose.Types.ObjectId(id)})
					.update({$set:{
						stock_status:'In Repobin',
						returned_to: reqBody.returned_to,
						returned_date: reqBody.returned_date,
						return_reason: reason,
						return_remark: remark,
						health_status:reason==='New'?'Healthy':reason==='Damaged'?'Damaged':'Used' // return_reason === Old : Used
					}});
				break;
			case 'returnFromCustomer':
				bulkUpdate
					.find({_id:mongoose.Types.ObjectId(id)})
					.update({$set:{
						stock_status:'In Repobin',
						allocation_status: 'Un-allocated',
						returned_to: reqBody.returned_to,
						returned_date: reqBody.returned_date,
						return_reason: reason,
						return_remark: remark,
						health_status: reason==='New'?'Healthy':reason==='Damaged'?'Damaged':'Used'
					}});
				break;
			case 'deallocate':
				bulkUpdate
					.find({_id:mongoose.Types.ObjectId(id)})
					.update({$set:{
							allocation_status: 'Un-allocated'
					}});
				break;
			default:
				console.log('none');
		}
	}
	bulkUpdate.execute(function(err, updatedDBResponse) {
		if (err) {return next(err)}
		let response=JSON.parse(JSON.stringify(updatedDBResponse));
		return next(null,response);
	});
};
