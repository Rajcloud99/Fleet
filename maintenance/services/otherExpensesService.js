var OE = promise.promisifyAll(commonUtil.getMaintenanceModel('otherExpenses'));
var ContractorExpense = promise.promisifyAll(commonUtil.getMaintenanceModel('contractor_expense'));
var TyreIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('tyreIssue'));
var SpareIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('spareIssue'));
var ToolIssue = promise.promisifyAll(commonUtil.getMaintenanceModel('toolIssue'));
var async = require('async');
var NO_OF_DOCS =15;

module.exports.addOE = function(dataBody,next) {
	idUtil.generateMaintenanceExpenseAsync({clientId:dataBody.clientId})
		.then(function(count) {
            dataBody.expense_no = count;
            var OEData = new OE(dataBody);
			OEData.saveAsync(dataBody)
                .then(function(savedData) {
                    return next(null, savedData);
                })
		})
		.catch(function(err) {
			return next(err);
		});
};

module.exports.findOE = function(oQuery, next) {
    OE.findAsync(oQuery)
    .then(function (available) {
        return next(null, available);
    })
    .catch(function (err) {
        return next(err);
    });
};

module.exports.updateOEById = function(id,reqBody,next) {
    OE.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new: true})
    .then(function(updated){
        return next(null, updated);
    }).catch(function (err) {
        return next(err);
    });
};

var allowedSearchFieldsCategory = {"_id":1,"type":1,"vehicle_no":1,"trip_no":1,"clientId":1,"find":1};


function createOEAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFieldsCategory)) {
            if (key==="_id" ){
                obj ={};
                obj[key]= mongoose.Types.ObjectId(reqBody[key]);
                aggrFilter.push({$match: obj});
            }else if(key =="find"){
                var fFilter={};
                fFilter.$or=[];
                fFilter.$or.push({"vehicle_no":{$regex: reqBody[key], $options:'i'}});
                fFilter.$or.push({"jobId":{$regex: reqBody[key], $options:'i'}});
                fFilter.$or.push({"expense_no":{$regex: reqBody[key], $options:'i'}});
                fFilter.$or.push({"type":{$regex: reqBody[key], $options:'i'}});
                fFilter.$or.push({"created_by_name":{$regex: reqBody[key], $options:'i'}});
                fFilter.$or.push({"approved_by_name":{$regex: reqBody[key], $options:'i'}});
                fFilter.$or.push({"bill_no":{$regex: reqBody[key], $options:'i'}});
                fFilter.$or.push({"amount":{$regex: reqBody[key], $options:'i'}});
				fFilter.$or.push({"partyName":{$regex: reqBody[key], $options:'i'}});
				aggrFilter.push({$match: fFilter});
            } else {
                obj ={};
                obj[key]= reqBody[key];
                aggrFilter.push({$match: obj});
            }
        }
    }
    return aggrFilter;
}


module.exports.searchOE = function(reqQuery,next) {
    var aggrFilter  = createOEAggrFilter(reqQuery);
    var no_of_documents = parseInt(reqQuery.no_of_docs) || NO_OF_DOCS;

    if (no_of_documents > NO_OF_DOCS) {
        no_of_documents = NO_OF_DOCS;
    }

    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (reqQuery.trim){
        var projection = {$project :{_id:1,name:1,code:1}};
        aggrFilter.push(projection);
    }
    var datacursor = OE.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = OE.aggregate(aggrFilter);

    if(reqQuery.skip){
        var skip_docs = (parseInt(reqQuery.skip)-1)*no_of_documents;
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
            }else{
                datacursor.limit(10000);
            }
            datacursor.exec(function (err, data) {
                data = JSON.parse(JSON.stringify(data));
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.oe = data;
                objToReturn.pages = no_of_pages;
                objToReturn.count = count;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.oe = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};

module.exports.getCombineExpense = function (query,next) {
	async.parallel({
		issuedSpare: function (callback) {
			SpareIssue.aggregateAsync([{$match:query},
				{$unwind :"$issued_spare"},
				{$match:{flag:"issued"}},
				{$project:{jobId:1,vehicle_number:1,total:{$multiply:[{$subtract:["$issued_spare.quantity","$issued_spare.total_returned"]},"$issued_spare.cost_per_piece"]}}},
				{$group:{_id:"$jobId",jobId:{$first:"$jobId"},vehicle_number:{$first:"$vehicle_number"},Amount:{$sum:"$total"}}},
				{$addFields:{"type":"Spare"}}
			])
				.then(function (issuedSpare) {
					callback(null,issuedSpare);
				})
				.catch(function (err) {
					callback(err);
				})
		},
		oExpense: function (callback) {
			OE.aggregateAsync([{$match:query},
				{$match:{type:"Other"}},
				{$project:{jobId:1,vehicle_no:1,amount:1,type:1}},
				{$group:{_id:{jobId:"$jobId",vehicle_number:"$vehicle_no"},jobId:{$first:"$jobId"},type:{$first:"$type"},vehicle_number:{$first:"$vehicle_no"},Amount:{$sum:"$amount"}}}
			])
				.then(function (otherExpense) {
					callback(null,otherExpense);
				})
				.catch(function (err) {
					callback(err);
				})
		},
		tyre: function (callback) {
			TyreIssue.aggregateAsync([{$match:query},
				{$project:{jobId:1,jobVehicle:1,amount:1}},
				{$group:{_id:"$jobId",jobId:{$first:"$jobId"},vehicle_number:{$first:"$jobVehicle"},Amount:{$sum:"$amount"}}},
				{$addFields:{"type":"Tyre"}}
			])
				.then(function (tasks) {
					callback(null,tasks);
				})
				.catch(function (err) {
					callback(err);
				})
		},
		cExpense: function (callback) {
			ContractorExpense.aggregateAsync([{$match:query},
				{$project:{jobId:1,vehicle_number:1,amount:1}},
				{$group:{_id:"$jobId",jobId:{$first:"$jobId"},vehicle_number:{$first:"$vehicle_number"},Amount:{$sum:"$amount"}}},
				{$addFields:{"type":"Contractor"}}
			])
				.then(function (cExpense) {
					callback(null,cExpense);
				})
				.catch(function (err) {
					callback(err);
				})
		},
		tool: function (callback) {
			ToolIssue.aggregateAsync([{$match:query},
				{$project:{vehicle_number:1,rate:1}},
				{$group:{_id:"$vehicle_number",jobId:{$first:"$jobId"},vehicle_number:{$first:"$vehicle_number"},Amount:{$sum:"$rate"}}},
				{$addFields:{"type":"Tool"}}
			])
				.then(function (cExpense) {
					callback(null,cExpense);
				})
				.catch(function (err) {
					callback(err);
				})
		}
	},function (err,result) {
		if(err) {
			return next(err);
		}
		else {
			var arr=otherUtil.mergeArray(result.issuedSpare,result.oExpense,result.tyre,result.cExpense,result.tool);
			return next(null,arr);
		}
	})
}
