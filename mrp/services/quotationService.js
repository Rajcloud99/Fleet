const Quotation = promise.promisifyAll(commonUtil.getMRPModel('quotation'));
const NO_OF_DOCS = 15;

function appendBeforeAdd(reqBody) {
	if (reqBody.items && reqBody.items.length>0) {
		for (let y = 0; y < reqBody.items.length; y++) {
			reqBody.items[y].remaining_quantity = reqBody.items[y].quantity;
		}
	}
	reqBody.total_quantity?reqBody.total_remaining_quantity = reqBody.total_quantity:null;
}

function removeBeforeAdd(reqBody) {
	delete reqBody.quot_status;
	delete reqBody._id;
	delete reqBody._v;
	delete reqBody.quot_date;
}

function removeBeforeUpdate(reqBody) {
	otherUtil.removeStaticNonUpdatableKeys(reqBody);
	delete reqBody.quot_number;
	delete reqBody.quot_date;
}

module.exports.addQuotation = function (reqBody, next) {
	appendBeforeAdd(reqBody);
	removeBeforeAdd(reqBody);
	idUtil.generateQuotationIDAsync({clientId: reqBody.clientId})
		.then(function (quot_no) {
			reqBody.quot_number = quot_no;
			module.exports.updateQuotation({clientId:reqBody.clientId,quot_number:quot_no}, reqBody, true, function(err,resp){
				if (err){
					winston.error("error in add Quotation:" + err);
					return next(err);
				}else{
					winston.info("added Quotation", JSON.stringify(resp));
					return next(null, resp);
				}
			});
		}).catch(next);
};

module.exports.updateQuotation = function (queryObj, reqBody, upsert, next) {
	upsert?null:removeBeforeUpdate(reqBody);

	Quotation.findOneAndUpdate(queryObj, {$set: reqBody}, {new: true, upsert:upsert, setDefaultsOnInsert: true})
		.populate("branch", "name id _id")
		.populate("customer", "customerId name _id")
		.populate("sales_person", "full_name userId _id")
		.populate("quot_approved_by", "full_name userId _id")
		.populate("quot_cancelled_by", "full_name userId _id")
		.populate("quot_converted_to_so_by", "full_name userId _id")
		.populate("quot_approver", "full_name userId _id")
		.populate("items.item_ref", "name code uom _id category_name category_code rate maufacturer type")
		.populate("created_by", "full_name userId _id")
		.populate("last_modified_by", "full_name userId _id")
		.execAsync()
		.then(function (Quotation) {
			winston.info("updated Quotation ", JSON.stringify(Quotation));
			return next(null, Quotation);
		})
		.catch(function (err) {
			winston.error("error in update Quotation:" + err);
			return next(err);
		});
};

module.exports.findQuotation = function (queryObj, populate, next) {
	if (populate) {
		Quotation.find(queryObj)
			.populate("branch", "name id _id")
			.populate("customer", "customerId name _id")
			.populate("sales_person", "full_name userId _id")
			.populate("quot_approved_by", "full_name userId _id")
			.populate("quot_cancelled_by", "full_name userId _id")
			.populate("quot_converted_to_so_by", "full_name userId _id")
			.populate("quot_approver", "full_name userId _id")
			.populate("items.item_ref", "name code uom _id category_name category_code rate maufacturer")
			.populate("created_by", "full_name userId _id")
			.populate("last_modified_by", "full_name userId _id")
			.execAsync()
			.then(function (quotation) {
				winston.info("found Quotation", JSON.stringify(quotation));
				return next(null, quotation);
			}).catch(function (err) {
			winston.error("error in find Quotation:" + err);
			return next(err);
		});
	}else{
		Quotation.findAsync(queryObj)
			.then(function (Quotation) {
				winston.info("found Quotation", JSON.stringify(Quotation));
				return next(null, Quotation);
			}).catch(function (err) {
			winston.error("error in find Quotation:" + err);
			return next(err);
		});
	}
};

module.exports.deleteQuotation = function (queryObj, next) {
	Quotation.removeAsync(queryObj)
		.then(function (removed) {
			winston.info("removed Quotation", JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function (err) {
			winston.error("error in remove Quotation " + err);
			return next(err);
		});
};

const allowedSearchFields = {
	"_id": 1,
	"clientId": 1,
	"customer": 1,
	"quot_number": 1,
	"quot_date": 1,
	"quot_approver": 1,
	"sales_person":1,
	"priority":1,
	"quot_approved_by":1,
	"quot_cancelled_by":1,
	"quot_status": 1
};

const trimProjection = {
	"_id": 1,
	"quot_number": 1,
	"customer": 1
};

function createQuotationAggrFilter(reqQuery) {

	const aggrFilter = [];
	for (let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === "_id" || key==="customer" || key==="sales_person" || key==="quot_approver") {
				let obj = {};
				obj[key] = mongoose.Types.ObjectId(reqQuery[key]);
				aggrFilter.push({$match: obj});
			} else if (key === "quot_date") {
				let dateArr = reqQuery[key].split(",");
				let startDate = new Date(dateArr[0]);
				dateArr.length === 2
					? aggrFilter.push({$match: {quot_date: {$gte: new Date(dateArr[0]), $lt: new Date(dateArr[1])}}})
					: aggrFilter.push({$match: {quot_date: {$gte: new Date(dateArr[0]),
								$lt: new Date(startDate.setDate(startDate.getDate()+1))}}});
			} else if (key === "quot_status") {
				let statusArr = reqQuery[key].split(",");
				statusArr.length >= 2
					? aggrFilter.push({$match: {quot_status:{$in : statusArr}}})
					: aggrFilter.push({$match: {quot_status: statusArr[0]}});
			}else {
				let obj = {};
				obj[key.toString()] = reqQuery[key];
				aggrFilter.push({$match: obj});
			}
		}
	}

	return aggrFilter;
}

module.exports.searchQuotation = function (reqQuery, next) {

	const aggrFilter = createQuotationAggrFilter(reqQuery);
	if (reqQuery.sort) {
		aggrFilter.push({$sort: {created_at: parseInt(reqQuery.sort)}})
	}
	if (reqQuery.trim) {
		aggrFilter.push({$project: trimProjection});
	}

	const datacursor = Quotation.aggregate(aggrFilter);
	aggrFilter.push({$group: {_id: null, count: {$sum: 1}}});
	const countCursor = Quotation.aggregate(aggrFilter);
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
			datacursor.exec(function (err, Quotations) {
				Quotation.populate(Quotations, [{path: "branch", select: "name id _id"},
						{path: "customer", select: "customerId name _id"},
						{path: "sales_person", select: "full_name userId _id"},
						{path: "quot_approved_by", select: "full_name userId _id"},
						{path: "quot_cancelled_by", select: "full_name userId _id"},
						{path: "quot_converted_to_so_by", select: "full_name userId _id"},
						{path: "quot_approver", select: "full_name userId _id"},
						{path: "items.item_ref", select: "name code uom _id category_name category_code rate maufacturer type"},
						{path: "created_by", select: "full_name userId _id"},
						{path: "last_modified_by", select: "full_name userId _id"}]
					, function (err, populatedTransactions) {
						if (err) {
							return next(err);
						}
						const objToReturn = {};
						objToReturn.Quotations = populatedTransactions;
						objToReturn.pages = no_of_pages;
						objToReturn.count = count;
						return next(null, objToReturn);
					});

			});
		} else {
			const objToReturn = {};
			objToReturn.Quotations = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};

