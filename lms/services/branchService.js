var winston = require('winston');
var Branch = promise.promisifyAll(commonUtil.getModel('branch'));
var NO_OF_DOCS = 15;

module.exports.addBranch = function(reqBody,next) {
	idUtil.generateBranchIdAsync({clientId:reqBody.clientId})
		.then(function(branchId){
			reqBody.id = branchId;
            var branch = new Branch(reqBody);
            branch.saveAsync(reqBody)
                .then(function(branch) {
                    winston.info("added branch",JSON.stringify(branch));
                    return next(null, branch);
                })
                .catch(function(err) {
                    winston.error("error in add branch:" + err);
                    return next(err);
                });
		}).catch(next);
};

module.exports.addBranchV2 = function(reqBody) {
	return new Promise( (resolve,reject)=>{
		idUtil.generateBranchIdAsync({clientId:reqBody.clientId})
			.then(async function(branchId){
				reqBody.id = branchId;
				var branch = new Branch(reqBody);
				await branch.save();
				return resolve(branch);
			}).catch((e)=>{
			return reject(e);
		});
	});
};

module.exports.updateBranchId = function(id,reqBody,next) {
	Branch.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new:true})
		.then(function(branch) {
				winston.info("updated branch ", JSON.stringify(branch));
				return next(null, branch);
		})
		.catch(function(err) {
				winston.error("error in update branch:" + err);
				return next(err);
		});
};

module.exports.updateBranchIdSetPush = function(id,newData,next) {
	var newDetails = {};
	if (newData.toSet){
		newDetails["$set"]=newData.toSet;
	}
	if (newData.toPush){
		newDetails["$push"]=newData.toPush;
	}
	Branch.findOneAndUpdateAsync({_id:id},newDetails)
		.then(function(branch) {
			winston.info("updated branch ", JSON.stringify(branch));
			return next(null, branch);
		})
		.catch(function(err) {
			winston.error("error in update branch:" + err);
			return next(err);
		});
};

module.exports.findBranchId = function(id,next) {
	Branch.findAsync({_id:id})
		.then(function (branch) {
			return next(null, branch);
		}).catch(function (err) {
			winston.error("error in find branch:" + err);
			return next(err);
		});
};

module.exports.findBranchQuery = function(query,next) {
	Branch.findAsync(query)
		.then(function (branch) {
			winston.info("found branch", JSON.stringify(branch));
			return next(null, branch);
		}).catch(function (err) {
			winston.error("error in find branch:" + err);
			return next(err);
		});
};

module.exports.deleteBranchId = function(id,next) {
	Branch.removeAsync({_id:id})
		.then(function(removed) {
				winston.info("removed branch",JSON.stringify(removed));
				return next(null, removed);
		})
		.catch(function(err) {
				winston.error("error in remove branch " + err);
				return next(err);
		});
};

var allowedSearchFields = {"_id":1,"_ids":1, "clientId":1,"name":1,"code":1,"type":1,"category":1,
	"branch_head_name":1, "branch_head_employee_code":1,
	"branch_head":1, "prim_email":1, "deleted": 1};

function createBranchAggrFilter(reqBody){
	// var aggrFilter = [];
	var obj ={deleted:{$ne:true}};
	// aggrFilter.push({$match:{deleted:{$ne:true}}});
	for(var key in reqBody) {
		if (reqBody.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === "name" || key === "branch_head_name") {
				// var obj ={};
				obj[key]= {$regex: reqBody[key], $options: 'i'};
				// aggrFilter.push({$match: obj});
			} else if (key==="_id" || key ==="branch_head"){
				// obj ={};
				obj[key]= mongoose.Types.ObjectId(reqBody[key]);
				// aggrFilter.push({$match: obj});
			} else if(key === 'deleted'){
				// obj ={};
				obj[key] = reqBody[key] === 'true' ? true : {$ne: true};
				// aggrFilter.push({$match: obj});
			} else if (key==="_ids"){
				// obj ={};

				try{
					let parseData = JSON.parse(reqBody._ids);

					if(Array.isArray(parseData))
						obj["_id"] = {$in: parseData.map(o => mongoose.Types.ObjectId(o))};
					else
						obj['_id'] = parseData.toString();

				}catch (e) {
					obj["_id"]= reqBody[key].toString();
				}

				// aggrFilter.push({$match: obj});

			}
			else if (key==="clientId"){
				// obj ={};

				try{
					let parseData = JSON.parse(reqBody.clientId);

					if(Array.isArray(parseData))
						obj[key] = {$in: parseData.map(o => o.toString())};
					else
						obj[key] = parseData.toString();

				}catch (e) {
					obj[key]= reqBody[key].toString();
				}

				// aggrFilter.push({$match: obj});

			}else {
				// obj ={};
				obj[key]= reqBody[key];
				// aggrFilter.push({$match: obj});
			}
		}
	}
	return obj;
}

module.exports.searchBranch = function(reqQuery,trim, next) {
	var obj  = createBranchAggrFilter(reqQuery);
	var aggrFilter = [];
	aggrFilter.push({$match: obj});

	if (reqQuery.sort){
		aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
	}
	if (trim){
		var projection = {_id:1,name:1,code:1};
		aggrFilter.push({$project:projection});
	}
	var datacursor = Branch.aggregate(aggrFilter);
	aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});

	var countCursor = Branch.aggregate(aggrFilter);
	var no_of_documents = 100 || reqQuery.no_of_docs || NO_OF_DOCS;

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
			var branchCount = countArr[0].count;
			var no_of_pages;
			if(branchCount/no_of_documents>1){
				no_of_pages = Math.ceil(branchCount/no_of_documents);
			}else{
				no_of_pages =1;
			}
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}
			datacursor.exec(function (err, branches) {
				var branches0 = JSON.parse(JSON.stringify(branches));
				//console.log(leads0);
				//var leads_ = makeLeadsResponseKeyChanges(leads0);
				if (err){
					return next(err);
				}
				var objToReturn = {};
				objToReturn.branches = branches0;
				objToReturn.pages = no_of_pages;
				objToReturn.count = branchCount;
				return next(null, objToReturn);
			});
		}else{
			var objToReturn = {};
			objToReturn.branches = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};
