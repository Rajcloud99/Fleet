const Invoice = promise.promisifyAll(commonUtil.getMRPModel('invoice'));
const SimMaster = promise.promisifyAll(commonUtil.getGpsService('simMaster'));
const DeviceMaster = promise.promisifyAll(commonUtil.getGpsService('deviceMaster'));
const SO = promise.promisifyAll(commonUtil.getMRPModel('so'));
const async = require('async');
const NO_OF_DOCS = 15;

function removeBeforeAdd(reqBody) {
	delete reqBody.status;
	delete reqBody._id;
	delete reqBody._v;
	delete reqBody.invoice_date;
}

function removeBeforeUpdate(reqBody) {
	otherUtil.removeStaticNonUpdatableKeys(reqBody);
	delete reqBody.invoice_no;
	delete reqBody.invoice_date;
	delete reqBody.customer;
}

module.exports.addInvoice = function (data, next) {

	removeBeforeAdd(data);

	idUtil.generateInvoiceIDAsync({clientId: data.clientId})
		.then(function (invoice_no) {
			data.invoice_no = invoice_no;
			module.exports.updateInvoice({clientId:data.clientId,invoice_no:invoice_no},data, true, function(err,resp){
				if (err) {return next(err)}
				else return next(null, resp);
			});
		}).catch(next)
};

module.exports.findInvoice = function (queryObj, populate, next) {
	if (populate) {
		Invoice.find(queryObj)
			.populate("branch", "name id _id")
			.populate("customer", "customerId name _id")
			.populate("approved_by", "full_name userId _id")
			.populate("declined_by", "full_name userId _id")
			.populate("dispatched_by", "full_name userId _id")
			.populate("approver", "full_name userId _id")
			.populate("items.item_ref", "name code uom _id category_name category_code rate manufacturer")
			.populate("created_by", "full_name userId _id")
			.populate("last_modified_by", "full_name userId _id")
			.populate("ship_to", "customerId name _id address prim_contact_name prim_cont_no prim_email")
			.execAsync()
			.then(function (Invoice) {
				winston.info("found Invoice", JSON.stringify(Invoice));
				return next(null, Invoice);
			}).catch(function (err) {
			winston.error("error in find Invoice:" + err);
			return next(err);
		});
	} else {
		Invoice.findAsync(queryObj)
			.then(function (Invoice) {
				winston.info("found Invoice", JSON.stringify(Invoice));
				return next(null, Invoice);
			}).catch(function (err) {
			winston.error("error in find Invoice:" + err);
			return next(err);
		});
	}
};

/** If invoice doesn't exist, upsert makes sure to create a new one **/
module.exports.updateInvoice = function (queryObj, reqBody, upsert, next) {
	let reqBody_ = JSON.parse(JSON.stringify(reqBody));
	let previousItems = (reqBody_.oldInvoice && reqBody_.oldInvoice.items && (reqBody_.oldInvoice.items.length > 0)) ? JSON.parse(JSON.stringify(reqBody_.oldInvoice.items)) : [];
	let newItemsExistBool = !!reqBody_.items;
	let oldItemsExistBool = (reqBody_.oldInvoice && reqBody_.oldInvoice.items);
	let newItems = (reqBody_.items && (reqBody_.items.length > 0)) ? reqBody_.items : [];
	let finalItems = [];
	let sos = [];

	if (newItems.length > 0) {
		for (let i = 0; i < newItems.length; i++) {
			newItems[i].delta = newItems[i].quantity ? -newItems[i].quantity : 0;
			reqBody_.items[i].so_ref ? sos.push(reqBody_.items[i].so_ref) : null;
			if (previousItems.length > 0) {
				for (let j = 0; j < previousItems.length; j++) {
					if ((previousItems[j].item_ref.toString() === newItems[i].item_ref.toString())) {
						if (previousItems[j].quantity === newItems[i].quantity) {
							newItems[i].delta = 0;
						} else {
							newItems[i].delta = previousItems[j].quantity - newItems[i].quantity;
						}

						let imeiUndoSold= [];
						let simUndoSold= [];
						if (previousItems[j].item.toLowerCase() === "gps"){
							let previousImei = previousItems[j].imei_list || [];
							let newImei = newItems[i].imei_list || [];
							for (let k=0;k<previousImei.length;k++){
								if (newImei.indexOf(previousImei[k])===-1){
									imeiUndoSold.push(previousImei[k]);
								}
							}
						}

						if (previousItems[j].item.toLowerCase() === "sim"){
							let previousSim = previousItems[j].mobile_no_list || [];
							let newSim = newItems[i].mobile_no_list || [];
							for (let k=0;k<previousSim.length;k++){
								if (newSim.indexOf(previousSim[k])===-1){
									simUndoSold.push(previousSim[k]);
								}
							}
						}

						newItems[i].imeiUndoSold = imeiUndoSold;
						newItems[i].simUndoSold = simUndoSold;

						newItems[i].matched = true;
						previousItems[j].matched = true;
						finalItems.push(newItems[i]);
					}
				}
			}
			if (!newItems[i].matched) {
				finalItems.push(newItems[i]);
			}
		}
	}

	if (newItemsExistBool && oldItemsExistBool) {
		for (let i = 0; i < previousItems.length; i++) {
			if (!previousItems[i].matched && previousItems[i].so_number) {
				previousItems[i].delta = previousItems[i].quantity;
				if (previousItems[i].item.toLowerCase() === "gps") {
					let previousImei = previousItems[i].imei_list || [];
					previousItems[i].imeiUndoSold = [...previousImei];
				}

				if (previousItems[i].item.toLowerCase() === "sim") {
					let previousSim = previousItems[i].mobile_no_list || [];
					previousItems[i].simUndoSold = [...previousSim];

				}
				finalItems.push(previousItems[i]);
			}
		}
	}

	reqBody_.sos = Array.from(new Set(sos));

	upsert?null:removeBeforeUpdate(reqBody_);

	Invoice.findOneAndUpdate(queryObj, {$set: reqBody_}, {new: true, upsert:upsert, setDefaultsOnInsert: true})
		.populate("branch", "name id _id")
		.populate("customer", "customerId name _id")
		.populate("approved_by", "full_name userId _id")
		.populate("declined_by", "full_name userId _id")
		.populate("approver", "full_name userId _id")
		.populate("items.item_ref", "name code uom _id category_name category_code rate manufacturer")
		.populate("created_by", "full_name userId _id")
		.populate("last_modified_by", "full_name userId _id")
		.populate("ship_to", "customerId name _id address prim_contact_name prim_cont_no prim_email")
		.execAsync()
		.then(function (updatedInvoice) {
			let updatedInvoice_ = JSON.parse(JSON.stringify(updatedInvoice));
			if (finalItems.length>0) {
				async.forEachOf(finalItems, function (item, i, callback) {
					if (item.so_number) {
						SO.findOneAsync({
							"so_number": item.so_number
						})
							.then(function (foundSODoc) {
								SO.findOneAndUpdateAsync({
										"so_number": item.so_number,
										"items.item_ref": mongoose.Types.ObjectId(item.item_ref)
									},
									{
										"$addToSet": {
											"items.$.invoice_no": updatedInvoice_.invoice_no,
											"items.$.invoice_ref": updatedInvoice_._id
										},
										"$inc": {
											"items.$.remaining_quantity": item.delta,
											"total_remaining_quantity": item.delta
										},
										"status": (foundSODoc.total_remaining_quantity + item.delta) !== foundSODoc.total_quantity
											? ((foundSODoc.total_remaining_quantity + item.delta) === 0) ? "Fully Invoiced" : "Partially Invoiced"
											: foundSODoc.status,
										"last_modified_by": reqBody.last_modified_by
									}, {new: true})
									.then(function (updated) {
										callback();
									})
									.catch(callback);
							})
							.catch(callback)
					} else {
						callback();
					}
				}, function (err) {
					if (err) return next(err);
					async.forEachOf(finalItems, function (item, i, callback) {
						async.parallel([
								function (callback) {
									if (item.item.toLowerCase() === "gps" && item.imei_list && item.imei_list.length > 0) {
										async.forEach(item.imei_list, function (imei, callb) {
											let updateDeviceInfo = {};
											updateDeviceInfo.sell_invoice_no = updatedInvoice.invoice_no;
											updateDeviceInfo.sell_invoice_ref = updatedInvoice._id;
											updateDeviceInfo.sell_date = updatedInvoice.invoice_date;
											updateDeviceInfo.sold_to_customer = updatedInvoice.customer;
											updateDeviceInfo.stock_status = "Sold";
											DeviceMaster.updateDeviceMasterAsync({"imei": imei}, updateDeviceInfo)
												.then(function (updated) {
													callb()
												}).catch(callb)
										}, function (err) {
											if (err) {
												return callback(err)
											}
											return callback();
										})
									} else {
										return callback();
									}
								},
								function (callback) {
									if (item.item.toLowerCase() === "gps" && item.imeiUndoSold && item.imeiUndoSold.length > 0) {
										async.forEach(item.imeiUndoSold, function (imei, callb) {
											let updateDeviceInfo = {};
											updateDeviceInfo.sell_invoice_no = null;
											updateDeviceInfo.sell_invoice_ref = null;
											updateDeviceInfo.sell_date = null;
											updateDeviceInfo.sold_to_customer = null;
											updateDeviceInfo.stock_status = "In stock";
											DeviceMaster.updateDeviceMasterAsync({"imei": imei}, updateDeviceInfo)
												.then(function (updated) {
													callb()
												}).catch(callb)
										}, function (err) {
											if (err) {
												return callback(err)
											}
											return callback();
										})
									} else {
										return callback();
									}
								},
								function (callback) {
									if (item.item.toLowerCase() === "sim" && item.mobile_no_list && item.mobile_no_list.length > 0) {
										async.forEachOf(item.mobile_no_list, function (mobile_no, index, callb) {
											let updateSimInfo = {};
											updateSimInfo.sell_invoice_no = updatedInvoice.invoice_no;
											updateDeviceInfo.sell_invoice_ref = updatedInvoice._id;
											updateSimInfo.sell_date = updatedInvoice.invoice_date;
											updateSimInfo.sold_to_customer = updatedInvoice.customer;
											updateDeviceInfo.stock_status = "Sold";
											SimMaster.updateSimMasterAsync({"mobile_no": mobile_no}, updateSimInfo)
												.then(function (updated) {
													callb()
												}).catch(callb)
										}, function (err) {
											if (err) {
												return callback(err)
											}
											return callback();
										})
									} else {
										return callback();
									}
								},
								function (callback) {
									if (item.item.toLowerCase() === "sim" && item.simUndoSold && item.simUndoSold.length > 0) {
										async.forEachOf(item.simUndoSold, function (mobile_no, index, callb) {
											let updateSimInfo = {};
											updateSimInfo.sell_invoice_no = null;
											updateDeviceInfo.sell_invoice_ref = null;
											updateSimInfo.sell_date = null;
											updateSimInfo.sold_to_customer = null;
											updateDeviceInfo.stock_status = "In stock";
											SimMaster.updateSimMasterAsync({"mobile_no": mobile_no}, updateSimInfo)
												.then(function (updated) {
													callb()
												}).catch(callb)
										}, function (err) {
											if (err) {
												return callback(err)
											}
											return callback();
										})
									} else {
										return callback();
									}
								}
							],
							function (err, results) {
								if (err) {
									return next(err)
								}
								return callback()
							});
					}, function (err) {
						if (err) return next(err);
						return next(null, updatedInvoice_);
					})
				})
			}else{
				return next(null, updatedInvoice_);
			}
		})
		.catch(function (err) {
			winston.error("error in update Invoice:" + err);
			return next(err);
		});
};

module.exports.deleteInvoice = function (queryObj, next) {
	Invoice.removeAsync(queryObj)
		.then(function (removed) {
			winston.info("removed Invoice", JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function (err) {
			winston.error("error in remove Invoice " + err);
			return next(err);
		});
};

const allowedSearchFields = {
	"_id": 1,
	"clientId": 1,
	"customer": 1,
	"invoice_no": 1,
	"invoice_date": 1,
	"approver": 1,
	"status": 1,
	"branch":1,
};

const projection = {
	_id: 1,
	invoice_no: 1,
	customer: 1
};

function createInvoiceAggrFilter(reqQuery) {
	let obj;
	const aggrFilter = [];
	for (let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === "_id" || key==="customer" ||key==="approver") {
				obj = {};
				obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
				aggrFilter.push({$match: obj});
			} else if (key === "invoice_date") {
				obj = {};
				let dateArr = reqQuery[key].split(",");
				let startDate = new Date(dateArr[0]);
				dateArr.length === 2
					? aggrFilter.push({$match: {invoice_date: {$gte: new Date(dateArr[0]), $lt: new Date(dateArr[1])}}})
					: aggrFilter.push({$match: {invoice_date: {$gte: new Date(dateArr[0]),
								$lt: new Date(startDate.setDate(startDate.getDate()+1))}}});
			} else if (key === "status") {
				obj = {};
				let statusArr = reqQuery[key].split(",");
				statusArr.length >= 2
					? aggrFilter.push({$match: {status: {$in: statusArr}}})
					: aggrFilter.push({$match: {status: statusArr[0]}});
			}else {
				obj = {};
				obj[key] = reqQuery[key];
				aggrFilter.push({$match: obj});
			}
		}
	}

	return aggrFilter;
}

module.exports.searchInvoice = function (reqQuery, next) {
	const aggrFilter = createInvoiceAggrFilter(reqQuery);

	if (reqQuery.sort) {
		aggrFilter.push({$sort: {created_at: parseInt(reqQuery.sort)}})
	}
	if (reqQuery.trim) {
		aggrFilter.push({$project: projection});
	}

	const datacursor = Invoice.aggregate(aggrFilter);
	aggrFilter.push({$group: {_id: null, count: {$sum: 1}}});
	const countCursor = Invoice.aggregate(aggrFilter);
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
			datacursor.exec(function (err, Invoices) {
				Invoice.populate(Invoices, [{path: "branch", select: "name id _id"},
						{path: "customer", select: "customerId name _id"},
						{path: "approved_by", select: "full_name userId _id"},
						{path: "declined_by", select: "full_name userId _id"},
						{path: "dispatched_by", select: "full_name userId _id"},
						{path: "approver", select: "full_name userId _id"},
						{path: "items.item_ref", select: "name code uom _id category_name category_code rate manufacturer"},
						{path: "created_by", select: "full_name userId _id"},
						{path: "last_modified_by", select: "full_name userId _id"},
						{path: "ship_to", select: "customerId name _id address prim_contact_name prim_cont_no prim_email"}]

					, function (err, populatedTransactions) {
						if (err) {
							return next(err);
						}
						const objToReturn = {};
						objToReturn.Invoices = populatedTransactions;
						objToReturn.pages = no_of_pages;
						objToReturn.count = count;
						return next(null, objToReturn);
					});
			});
		} else {
			const objToReturn = {};
			objToReturn.Invoices = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};

module.exports.preview = function (reqQuery, next) {
	const aggrFilter = createInvoiceAggrFilter(reqQuery);

	if (reqQuery.sort) {
		aggrFilter.push({$sort: {created_at: parseInt(reqQuery.sort)}})
	}
	if (reqQuery.trim) {
		aggrFilter.push({$project: projection});
	}

	const datacursor = Invoice.aggregate(aggrFilter);
	aggrFilter.push({$group: {_id: null, count: {$sum: 1}}});
	const countCursor = Invoice.aggregate(aggrFilter);
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
			datacursor.exec(function (err, Invoices) {
				Invoice.populate(Invoices, [{path: "branch", select: "name id _id"},
						{path: "customer"},
						{path: "approved_by", select: "full_name userId _id"},
						{path: "declined_by", select: "full_name userId _id"},
						{path: "dispatched_by", select: "full_name userId _id"},
						{path: "approver", select: "full_name userId _id"},
						{path: "items.item_ref", select: "name code uom _id category_name category_code rate manufacturer"},
						{path: "created_by"},
						{path: "last_modified_by", select: "full_name userId _id"}]
					, function (err, populatedTransactions) {
						if (err) {
							return next(err);
						}
						const objToReturn = {};
						objToReturn.Invoices = populatedTransactions;
						objToReturn.pages = no_of_pages;
						objToReturn.count = count;
						return next(null, objToReturn);
					});
			});
		} else {
			const objToReturn = {};
			objToReturn.Invoices = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};
