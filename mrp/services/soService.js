const SO = promise.promisifyAll(commonUtil.getMRPModel('so'));
const Quotation = promise.promisifyAll(commonUtil.getMRPModel('quotation'));
const async = require('async');
const NO_OF_DOCS = 15;

function append(reqBody) {
	if (reqBody.items && reqBody.items.length > 0) {
		for (let y = 0; y < reqBody.items.length; y++) {
			reqBody.items[y].remaining_quantity = reqBody.items[y].quantity;
		}
	}
	reqBody.total_quantity ? reqBody.total_remaining_quantity = reqBody.total_quantity : null;
}

function removeNotAddable(reqBody) {
	delete reqBody.status;
	delete reqBody._id;
	delete reqBody.__v;
	delete reqBody.so_date;
}

function removeUnupdatable(reqBody) {
	otherUtil.removeStaticNonUpdatableKeys(reqBody);
	delete reqBody.so_number;
	delete reqBody.so_date;
	delete reqBody.customer;
}

module.exports.addSO = function (data, next) {
	idUtil.generateSOIDAsync({clientId: data.clientId})
		.then(function (id) {
			data.so_number = id;
			module.exports.updateSO({clientId: data.clientId, so_number: id}, data, true, function (err, resp) {
				if (err) {
					return next(err)
				}
				else {
					return next(null, resp)
				}
			});
		}).catch(next)
};

module.exports.findSO = function (queryObj, populate, next) {
	if (populate) {
		SO.find(queryObj)
			.populate("branch", "name id _id")
			.populate("customer", "customerId name _id")
			.populate("sales_person", "full_name userId _id")
			.populate("approved_by", "full_name userId _id")
			.populate("declined_by", "full_name userId _id")
			.populate("invoiced_by", "full_name userId _id")
			.populate("approver", "full_name userId _id")
			.populate("items.item_ref", "name code uom _id category_name category_code rate manufacturer type")
			.populate("created_by", "full_name userId _id")
			.populate("last_modified_by", "full_name userId _id")
			.execAsync()
			.then(function (SO) {
				winston.info("found SO", JSON.stringify(SO));
				return next(null, SO);
			}).catch(function (err) {
			winston.error("error in find SO:" + err);
			return next(err);
		});
	} else {
		SO.findAsync(queryObj)
			.then(function (SO) {
				winston.info("found SO", JSON.stringify(SO));
				return next(null, SO);
			}).catch(function (err) {
			winston.error("error in find SO:" + err);
			return next(err);
		});
	}
};

module.exports.updateSO = function (queryObj, reqBody, upsert, next) {
	let reqBody_ = JSON.parse(JSON.stringify(reqBody));
	let previousItems = (reqBody_.oldSO && reqBody_.oldSO.items && (reqBody_.oldSO.items.length > 0)) ? JSON.parse(JSON.stringify(reqBody_.oldSO.items)) : [];
	let newItems = (reqBody_.items && (reqBody_.items.length > 0)) ? reqBody_.items : [];
	let newItemsExistBool = !!reqBody_.items;
	let oldItemsExistBool = !!(reqBody_.oldSO && reqBody_.oldSO.items);
	let finalItems = [];
	let quotations = [];

	let soAddCalled = !!(upsert);
	let soUpdateCalledBool = !(upsert);

	soAddCalled ? append(reqBody_) : null;
	soAddCalled ? removeNotAddable(reqBody_) : null;

	for (let i = 0; i < newItems.length; i++) {
		newItems[i].delta = newItems[i].quantity ? -newItems[i].quantity : 0;
		reqBody_.items[i].quot_ref ? quotations.push(reqBody_.items[i].quot_ref) : null;
		reqBody_.items[i].remaining_quantity = reqBody_.items[i].quantity;
		if (previousItems.length > 0) {
			for (let j = 0; j < previousItems.length; j++) {
				if (previousItems[j].quot_number && newItems[i].quot_number
					&& (previousItems[j].quot_number === newItems[i].quot_number)
					&& (previousItems[j].item_ref.toString() === newItems[i].item_ref.toString())) {
					if (previousItems[j].quantity === newItems[i].quantity) {
						newItems[i].delta = 0;
					} else {
						newItems[i].delta = previousItems[j].quantity - newItems[i].quantity;
					}
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

	if (newItemsExistBool && oldItemsExistBool) {
		for (let i = 0; i < previousItems.length; i++) {
			if (!previousItems[i].matched && previousItems[i].quot_number) {
				previousItems[i].delta = previousItems[i].quantity;
				finalItems.push(previousItems[i]);
			}
		}
	}

	reqBody_.quotations = Array.from(new Set(quotations));

	soUpdateCalledBool ? removeUnupdatable(reqBody_) : null;

	SO.findOneAndUpdate(queryObj, {$set: reqBody_}, {new: true, upsert: upsert, setDefaultsOnInsert: true})
		.populate("branch", "name id _id")
		.populate("customer", "customerId name _id")
		.populate("sales_person", "full_name userId _id")
		.populate("approved_by", "full_name userId _id")
		.populate("declined_by", "full_name userId _id")
		.populate("invoiced_by", "full_name userId _id")
		.populate("approver", "full_name userId _id")
		.populate("items.item_ref", "name code uom _id category_name category_code rate manufacturer type")
		.populate("created_by", "full_name userId _id")
		.populate("last_modified_by", "full_name userId _id")
		.execAsync()
		.then(function (updatedSO) {
			let updatedSO_ = JSON.parse(JSON.stringify(updatedSO));
			if (finalItems.length>0) {
				async.forEachOf(finalItems, function (item, i, callback) {
					if (item.quot_number) {
						Quotation.findOneAsync({
							"quot_number": item.quot_number
						})
							.then(function (foundQuoteDoc) {
								Quotation.findOneAndUpdateAsync({
										"quot_number": item.quot_number,
										"items.item_ref": mongoose.Types.ObjectId(item.item_ref)
									},
									{
										"$addToSet": {"items.$.so_number": updatedSO_.so_number},
										"$inc": {
											"items.$.remaining_quantity": item.delta,
											"total_remaining_quantity": item.delta
										},
										"quot_status": (foundQuoteDoc.total_remaining_quantity + item.delta) !== foundQuoteDoc.total_quantity
											? ((foundQuoteDoc.total_remaining_quantity + item.delta) === 0) ? "Fully converted to SO" : "Partially converted to SO"
											: "Approved for sale",
										"last_modified_by": reqBody.last_modified_by
									}, {new: true})
									.then(function (updated) {
										callback();
									})
									.catch(function (err) {
										callback();
									});
							})
							.catch(function (err) {
								callback()
							})
					} else {
						callback();
					}
				}, function (err) {
					if (err) return (err);
					return next(null, updatedSO_)
				});
			} else {
				next(null, updatedSO_)
			}
		})
		.catch(function (err) {
			winston.error("error in update SO:" + err);
			return next(err);
		});
};

module.exports.newSO = function (queryObj, next) {
	let soData = {};
	soData.clientId = queryObj.clientId;
	soData.created_by = queryObj.created_by;
	soData.last_updated_by = queryObj.created_by;
	soData.customer = queryObj.customer;
	idUtil.generateSOIDAsync({clientId: queryObj.clientId})
		.then(function (id) {
			soData.so_number = id;
			let SO_ = new SO(soData);
			SO_.save()
				.then(function (savedData) {
					return next(null, savedData);
				})
				.catch(function (err) {
					return next(err);
				});
		}).catch(next)
};

module.exports.deleteSO = function (queryObj, next) {
	SO.removeAsync(queryObj)
		.then(function (removed) {
			winston.info("removed SO", JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function (err) {
			winston.error("error in remove SO " + err);
			return next(err);
		});
};

const allowedSearchFields = {
	"_id": 1,
	"clientId": 1,
	"customer": 1,
	"so_number": 1,
	"so_date": 1,
	"po_number": 1,
	"priority": 1,
	"ship_date": 1,
	"delivery_date": 1,
	"approver": 1,
	"sales_person": 1,
	"status": 1
};

const projection = {
	_id: 1,
	so_number: 1,
	customer: 1
};

function createSOAggrFilter(reqQuery) {
	let obj;
	const aggrFilter = [];
	for (let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === "_id" || key === "customer" || key === "approver" || key === "sales_person") {
				obj = {};
				obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
				aggrFilter.push({$match: obj});
			} else if (key === "so_date") {
				obj = {};
				let dateArr = reqQuery[key].split(",");
				let startDate = new Date(dateArr[0]);
				dateArr.length === 2
					? aggrFilter.push({$match: {so_date: {$gte: new Date(dateArr[0]), $lt: new Date(dateArr[1])}}})
					: aggrFilter.push({
						$match: {
							so_date: {
								$gte: new Date(dateArr[0]),
								$lt: new Date(startDate.setDate(startDate.getDate() + 1))
							}
						}
					});
			} else if (key === "status") {
				obj = {};
				let statusArr = reqQuery[key].split(",");
				statusArr.length >= 2
					? aggrFilter.push({$match: {status: {$in: statusArr}}})
					: aggrFilter.push({$match: {status: statusArr[0]}});
			} else {
				obj = {};
				obj[key] = reqQuery[key];
				aggrFilter.push({$match: obj});
			}
		}
	}

	return aggrFilter;
}

module.exports.searchSO = function (reqQuery, next) {
	const aggrFilter = createSOAggrFilter(reqQuery);

	if (reqQuery.sort) {
		aggrFilter.push({$sort: {created_at: parseInt(reqQuery.sort)}})
	}
	if (reqQuery.trim) {
		aggrFilter.push({$project: projection});
	}

	const datacursor = SO.aggregate(aggrFilter);
	aggrFilter.push({$group: {_id: null, count: {$sum: 1}}});
	const countCursor = SO.aggregate(aggrFilter);
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
			datacursor.exec(function (err, SOs) {
				SO.populate(SOs, [{path: "branch", select: "name id _id"},
						{path: "customer", select: "customerId name _id"},
						{path: "sales_person", select: "full_name userId _id"},
						{path: "approved_by", select: "full_name userId _id"},
						{path: "declined_by", select: "full_name userId _id"},
						{path: "invoiced_by", select: "full_name userId _id"},
						{path: "approver", select: "full_name userId _id"},
						{
							path: "items.item_ref",
							select: "name code uom _id category_name category_code rate manufacturer type"
						},
						{path: "created_by", select: "full_name userId _id"},
						{path: "last_modified_by", select: "full_name userId _id"}]
					, function (err, populatedTransactions) {
						if (err) {
							return next(err);
						}
						const objToReturn = {};
						objToReturn.SOs = populatedTransactions;
						objToReturn.pages = no_of_pages;
						objToReturn.count = count;
						return next(null, objToReturn);
					});
			});
		} else {
			const objToReturn = {};
			objToReturn.SOs = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};
