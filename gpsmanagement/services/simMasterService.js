let simMaster = promise.promisifyAll(commonUtil.getGpsModel('simMaster'));
const NO_OF_DOCS = 15;

module.exports.addSimMaster = function(reqBody,next) {
	let simMaster_ = new simMaster(reqBody);
	simMaster_.saveAsync()
				.then(function(savedSimMaster) {
					// noinspection BadExpressionStatementJS
					simMaster.find({_id:savedSimMaster._id})
						.populate("branch", "name id _id")
						.populate("purchased_from", "vendorId name _id")
						.populate("sold_to_customer", "customerId name _id")
						.populate("part_ref", "name code uom _id category_name category_code rate manufacturer")
						.populate("created_by", "full_name userId _id")
						.populate("last_modified_by", "full_name userId _id")
						.execAsync()
						.then(function (data) {
							winston.info("added simMaster",JSON.stringify(data));
							return next(null, data);
						}).catch(next);
				})
				.catch(function(err) {
					winston.error("error in add simMaster:" + err);
					return next(err);
				});
};

module.exports.updateSimMaster = function(query, data, next) {
	simMaster.findOneAndUpdate(query,{$set:data}, {new:true, upsert:true, setDefaultsOnInsert: true})
		.populate("branch", "name id _id")
		.populate("purchased_from", "vendorId name _id")
		.populate("sold_to_customer", "customerId name _id")
		.populate("part_ref", "name code uom _id category_name category_code rate manufacturer")
		.populate("created_by", "full_name userId _id")
		.populate("last_modified_by", "full_name userId _id")
		.execAsync()
		.then(function(simMaster) {
			winston.info("updated simMaster ", JSON.stringify(simMaster));
			return next(null, simMaster);
		})
		.catch(function(err) {
			winston.error("error in update simMaster:" + err);
			return next(err);
		});
};

module.exports.findSimMaster= function(query, populate, next) {
	if (populate) {
		simMaster.find(query)
			.populate("branch", "name id _id")
			.populate("purchased_from", "vendorId name _id")
			.populate("sold_to_customer", "customerId name _id")
			.populate("part_ref", "name code uom _id category_name category_code rate manufacturer")
			.populate("created_by", "full_name userId _id")
			.populate("last_modified_by", "full_name userId _id")
			.execAsync()
			.then(function (simMaster) {
				winston.info("found simMaster", JSON.stringify(simMaster));
				return next(null, simMaster);
			}).catch(function (err) {
			winston.error("error in find simMaster:" + err);
			return next(err);
		});
	}else{
		simMaster.findAsync(query)
			.then(function (simMaster) {
				winston.info("found simMaster", JSON.stringify(simMaster));
				return next(null, simMaster);
			}).catch(function (err) {
			winston.error("error in find simMaster:" + err);
			return next(err);
		});
	}
};

module.exports.deleteSimMaster = function(query, next) {
	simMaster.removeAsync({_id:query})
		.then(function(removed) {
			winston.info("removed simMaster",JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function(err) {
			winston.error("error in remove simMaster " + err);
			return next(err);
		});
};

const allowedSearchFields = {"sim_no":1,"mobile_no":1,"status":1};


function createSimMasterAggrFilter(reqQuery){
	const aggrFilter = [];
	for(let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key ==="_id"){
				obj ={};
				obj[key]= mongoose.Types.ObjectId(reqQuery[key]);
				aggrFilter.push({$match: obj});
			}else {
				obj ={};
				obj[key]= reqQuery[key];
				aggrFilter.push({$match: obj});
			}
		}
	}

	return aggrFilter;
}

module.exports.searchSimMaster = function(reqQuery, next) {
	const aggrFilter = createSimMasterAggrFilter(reqQuery);

	if (reqQuery.sort){
		aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
	}
	if (reqQuery.trim){
		const projection = {
			_id: 1,
			sim_no:1,
			mobile_no:1
		};
		aggrFilter.push({$project:projection});
	}

	const datacursor = simMaster.aggregate(aggrFilter);
	aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
	const countCursor = simMaster.aggregate(aggrFilter);
	let no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

	if (no_of_documents > NO_OF_DOCS) {
		no_of_documents = NO_OF_DOCS;
	}

	if(reqQuery.skip){
		const skip_docs = (reqQuery.skip - 1) * no_of_documents;
		datacursor.skip(parseInt(skip_docs));
	}

	countCursor.exec(function(err, countArr){
		if (err){
			return next(err);
		}

		if (countArr.length>0){
			const count = countArr[0].count;
			let no_of_pages;
			if(count/no_of_documents>1){
				no_of_pages = Math.ceil(count/no_of_documents);
			}else{
				no_of_pages =1;
			}
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}
			datacursor.exec(function (err, simMasters) {
				simMaster.populate(simMasters, [{path: "branch", select: "name id _id"},
						{path: "sold_to_customer", select: "customerId name _id"},
						{path: "purchased_from", select: "vendorId name _id"},
						{path: "part_ref", select: "name code uom _id category_name category_code rate manufacturer"},
						{path: "created_by", select: "full_name userId _id"},
						{path: "last_modified_by", select: "full_name userId _id"}]
					, function (err, populatedTransactions) {
						if (err) {
							return next(err);
						}
						const objToReturn = {};
						objToReturn.simMasters = simMasters_;
						objToReturn.pages = no_of_pages;
						objToReturn.count = count;
						return next(null, objToReturn);
					});
			});
		}else{
			const objToReturn = {};
			objToReturn.simMasters = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};
