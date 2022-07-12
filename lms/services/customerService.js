var Customer = promise.promisifyAll(commonUtil.getModel('customer'));
var NO_OF_DOCS =10;

module.exports.addCustomer = function(reqBody,next) {
    idUtil.generateCustomerIdAsync({clientId:reqBody.clientId})
        .then(function(oCust){
            reqBody.customerId= oCust.customerId;
            reqBody.cno = oCust.cno;
            reqBody.sap_id = reqBody.sap_id || oCust.sap_id;
            reqBody.sap_no =  reqBody.sap_id && reqBody.sap_id.split('M') && reqBody.sap_id.split('M')[1] ? reqBody.sap_id.split('M')[1]:oCust.sap_no;
            var customer = new Customer(reqBody);
            customer.saveAsync()
                .then(function(savedCustomer) {
                    winston.info("added customer",JSON.stringify(savedCustomer));
                    return next(null, customer);
                })
                .catch(function(err) {
                    winston.error("error in add customer:" + err);
                    return next(err);
                });
        }).catch(next);
};

module.exports.addCustomerV2 = function(reqBody) {
	return new Promise( (resolve,reject)=>{
		idUtil.generateCustomerIdAsync({clientId:reqBody.clientId})
			.then(async function(oCust){
				reqBody.customerId= oCust.customerId;
				reqBody.cno = oCust.cno;
				reqBody.sap_id = reqBody.sap_id || oCust.sap_id;
				reqBody.sap_no =  reqBody.sap_id && reqBody.sap_id.split('M') && reqBody.sap_id.split('M')[1] ? reqBody.sap_id.split('M')[1]:oCust.sap_no;
				let customer = new Customer(reqBody);
				await customer.save();
				return resolve(customer);
			}).catch((e)=>{
				return reject(e);
		});
	});
};

module.exports.updateCustomerId = function(id,reqQuery,next) {
	if(reqQuery.clientId == '100003' && reqQuery.sap_id && reqQuery.sap_id.split('M') && reqQuery.sap_id.split('M')[1]){
		reqQuery.sap_no =   reqQuery.sap_id.split('M')[1];
	}
    Customer.findOneAndUpdateAsync({_id:id},{$set:reqQuery},{new:true})
        .then(function(customer) {
            winston.info("updated customer ", JSON.stringify(customer));
            return next(null, customer);
        })
        .catch(function(err) {
            winston.error("error in update customer:" + err);
            return next(err);
        });
};

module.exports.findCustomerId = function(id,next) {
    Customer.findAsync({_id:id})
        .then(function (customer) {
            winston.info("found customer", JSON.stringify(customer));
            return next(null, customer);
        }).catch(function (err) {
        winston.error("error in find customer:" + err);
        return next(err);
    });
};

module.exports.findCustomerQuery = function(query,next) {
    Customer.findAsync(query)
        .then(function (customer) {
            winston.info("found customer", JSON.stringify(customer));
            return next(null, customer);
        }).catch(function (err) {
        winston.error("error in find customer:" + err);
        return next(err);
    });
};

module.exports.deleteCustomerId = function(id,next) {
    Customer.removeAsync({_id:id})
        .then(function(removed) {
            winston.info("removed customer",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove customer " + err);
            return next(err);
        });
};

module.exports.deleteCustomerQuery = function(query,next) {
    Customer.removeAsync(query)
        .then(function(removed) {
            winston.info("removed customer",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove customer " + err);
            return next(err);
        });
};

var allowedSearchFields = ["_id","name","customerId","status","branch",
    "company_type","service_tax_no","tin_no", "from", "to", "prim_contact_name","email","type","customer", "deleted"];

var createCustomerAggrFilter = function(query){
	var fFilter = {
		$and:[
			{ $or:[
					{clientId:query.clientId},
					{clientR:query.clientId}
				] }
		],
		deleted: {
			$ne: true
		}
	};

	if(query.cClient){
		fFilter['$and'][0]['$or'].push({clientId: query.cClient});
	}

	if(query.src !== 'masters') {
		fFilter['status'] = { $ne: 'Inactive' };
	}
	for(i in query){
		if(otherUtil.isAllowedFilter(i,allowedSearchFields)){
			if (i === 'from') {
				let startDate = new Date(query[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				if (!query.dateType || query.dateType === 'created_at') {
					fFilter["created_at"] = fFilter["created_at"] || {};
					fFilter["created_at"].$gte = startDate;
				}
			} else if (i === 'to') {
				let endDate = new Date(query[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				if (!query.dateType || query.dateType === 'created_at') {
					fFilter["created_at"] = fFilter["created_at"] || {};
					fFilter["created_at"].$lte = endDate;
				}
			}else if (i === "name") {
				fFilter[i]= {$regex: query[i].replace(' ','.+'), $options: 'i'};
			} else if (i ==="_id" || i==='customerId'){
				fFilter['_id']= mongoose.Types.ObjectId(query[i]);
			}else if (i ==="type"){
				fFilter[i] = { $in: JSON.parse(query[i])};
			}else if (i ==="branch"){
				fFilter["$and"].push({
					$or:[
						{branch:{$exists:false}},
						{branch:{$in: (query[i] && query[i].length>0)?JSON.parse(JSON.stringify(query[i])):[]}}
					]
				})
			} else if (i === 'deleted') {
				fFilter[i] = (query[i] === true) ? true : query[i] === 'true' ? true:{$ne: true};
			}
			else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};
/*
module.exports.searchCustomer = function(reqQuery, trim, next) {
    var filter  = createCustomerAggrFilter(reqQuery);

	var cursor = Customer.find(filter);
	if (reqQuery.sort){
		aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
		cursor.sort(reqQuery.sort);
	}
	cursor.populate("branch");


    aggrFilter.push({
		$lookup:
			{
				from: "branches",
				localField: "branch",
				foreignField: "_id",
				as: "branch"
			}
	});
	aggrFilter.push({ $unwind: "$branch"});
    var datacursor = Customer.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = Customer.aggregate(aggrFilter);
    var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

    if (no_of_documents > NO_OF_DOCS) {
        no_of_documents = NO_OF_DOCS;
    }

    if(reqQuery.skip){
        var skip_docs = (reqQuery.skip-1)*no_of_documents;
        datacursor.skip(parseInt(skip_docs));
    }
    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }

        if (countArr.length>0){
            var count = countArr[0].count;
            var no_of_pages;
            if(count/no_of_documents>1){
                no_of_pages = Math.ceil(count/no_of_documents);
            }else{
                no_of_pages =1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }
            datacursor.exec(function (err, customers) {
                var customer0 = JSON.parse(JSON.stringify(customers));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.customers = customer0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = count;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.customers = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};*/


module.exports.searchCustomer= function(reqQuery,trim,next) {
	var ffFilters = createCustomerAggrFilter(reqQuery);
	var no_of_pages = 1;
	Customer.countAsync(ffFilters)
		.then(function(c_count) {
			var cursor = Customer.find(ffFilters);
			if (reqQuery.sort){
				cursor.sort(reqQuery.sort);
			}
			var no_of_documents = reqQuery && reqQuery.no_of_docs ? reqQuery.no_of_docs : NO_OF_DOCS;
			if (no_of_documents > NO_OF_DOCS) {
				no_of_documents = NO_OF_DOCS;
			}
			if(reqQuery.skip){
				var skip_docs = (reqQuery .skip-1)*no_of_documents;
				cursor.skip(parseInt(skip_docs));
			}
			if(c_count/no_of_documents>1){
				no_of_pages = c_count/no_of_documents;
			}
			if (reqQuery && reqQuery.all) {
				cursor.limit(parseInt(100000));
			}else{
				cursor.limit(parseInt(no_of_documents));
			}
			cursor.populate("branch");
			cursor.populate("customer");
			cursor.populate({path:"configs.GR",select:{configs:true}});
			cursor.populate({path:"configs.RATE_CHART",select:{configs:true}});
			cursor.exec(function (err, customer) {
				if (err){
					return next(err);
				}
				var temp = JSON.parse(JSON.stringify(customer));
				if(temp  && temp.length>0){
					var objToReturn = {};
					objToReturn.customers = temp ;
					objToReturn.pages = Math.ceil(no_of_pages);
					objToReturn.count = c_count;
					return next(null, objToReturn);
				}else{
					var objToReturn = {};
					objToReturn.customers = [];
					objToReturn.pages = 0;
					objToReturn.count = 0;
					return next(null, objToReturn);

				}
			});
		}).catch(function(err) {
		return next(err);
	});
};

module.exports.searchAggr = function (reqQuery, trim, next) {
	let project = {name: 1,customerId: 1};
	var ffFilters = createCustomerAggrFilter(reqQuery);

	let aggr = [{$match: ffFilters}];
	var no_of_documents = reqQuery && reqQuery.no_of_docs ? reqQuery.no_of_docs : NO_OF_DOCS;
	if (no_of_documents > NO_OF_DOCS) {
		no_of_documents = NO_OF_DOCS;
	}
	if (reqQuery.skip) {
		var skip_docs = (reqQuery.skip - 1) * no_of_documents;
		aggr.push({$skip: skip_docs});
		cursor.skip(parseInt(skip_docs));
	}

	if (reqQuery && reqQuery.all) {
		aggr.push({$limit: parseInt(100000)});
	} else {
		aggr.push({$limit: parseInt(no_of_documents)});
	}
	aggr.push({$sort: {_id: -1}});
	aggr.push({$project: project})
	var cursor = Customer.aggregate(aggr);
	cursor.exec(function (err, customer) {
		if (err) {
			console.log(err.toString());
			return next(err);
		}
		var temp = JSON.parse(JSON.stringify(customer));
		if (temp && temp.length > 0) {
			var objToReturn = {};
			objToReturn.customers = temp;
			return next(null, objToReturn);
		} else {
			var objToReturn = {};
			objToReturn.customers = [];
			return next(null, objToReturn);

		}
	}).catch(function (err) {
		console.log(err.toString());
		return next(err);
	});
};
