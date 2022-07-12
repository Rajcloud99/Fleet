var winston = require('winston');
var MaterialType = promise.promisifyAll(commonUtil.getModel('materialType'));
var MaterialGroup = promise.promisifyAll(commonUtil.getModel('materialGroup'));
var NO_OF_DOCS = 15;
module.exports.addMaterialGroup = function(reqBody,next) {
	var materialGroup = new MaterialGroup(reqBody);
	materialGroup.saveAsync(reqBody)
	.then(function(materialGroup) {
			return next(null, materialGroup);
		})
	.catch(function(err) {
			winston.error("error in add material group:" + err);
			return next(err);
		});
};

module.exports.addMaterialType = function(reqBody,next) {
	var materialType= new MaterialType(reqBody);
	materialType.saveAsync()
		.then(function(materialType) {
				winston.info("added material type ",JSON.stringify(materialType));
				return next(null, materialType);
		}).catch(function(err) {
				winston.error("error in add material type:" + err);
				return next(err);
		});
};

module.exports.updateMaterialTypeId = function(id,reqBody,next) {
	MaterialType.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
		.then(function(materialType) {
				winston.info("updated material type ", JSON.stringify(materialType));
				return next(null, materialType);
		})
		.catch(function(err) {
				winston.error("error in update material type:" + err);
				return next(err);
		});
};

module.exports.updateMaterialGroupId = function(id,reqBody,next) {
	MaterialGroup.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
		.then(function(materialGroup) {
				winston.info("updated material group", JSON.stringify(materialGroup));
				return next(null, materialGroup);
		}).catch(function(err) {
				winston.error("error in update material group" + err);
				return next(err);
		});
};

module.exports.updateMaterialTypeIdSetPush = function(id,newData,next) {
	var newDetails = {};
	if (newData.toSet){
		newDetails["$set"]=newData.toSet;
	}
	if (newData.toPush){
		newDetails["$push"]=newData.toPush;
	}
	MaterialType.findOneAndUpdateAsync({_id:id},newDetails,{new: true})
		.then(function(materialType) {
			winston.info("updated material type ", JSON.stringify(materialType));
			return next(null, materialType);
		})
		.catch(function(err) {
			winston.error("error in update material type:" + err);
			return next(err);
		});
};

module.exports.updateMaterialGroupIdSetPush = function(id,newData,next) {
	var newDetails = {};
	if (newData.toSet){
		newDetails["$set"]=newData.toSet;
	}
	if (newData.toPush){
		newDetails["$push"]=newData.toPush;
	}
	MaterialGroup.findOneAndUpdateAsync({_id:id},newDetails,{new: true})
		.then(function(materialGroup) {
			winston.info("updated material group", JSON.stringify(materialGroup));
			return next(null, materialGroup);
		}).catch(function(err) {
		winston.error("error in update material group" + err);
		return next(err);
	});
};

module.exports.findMaterialTypeId = function(id,next) {
	MaterialType.findAsync({_id:id})
		.then(function (materialType) {
			winston.info("found material type", JSON.stringify(materialType));
			return next(null, materialType);
		}).catch(function (err) {
			winston.error("error in find material type:" + err);
			return next(err);
		});
};

module.exports.findMaterialGroupId = function(id,next) {
	MaterialGroup.findAsync({_id:id})
		.then(function (materialGroup) {
			winston.info("found material group", JSON.stringify(materialGroup));
			return next(null, materialGroup);
		})
		.catch(function (err) {
			winston.error("error in find material group:" + err);
			return next(err);
		});
};

module.exports.findMaterialTypeQuery = function(query,next) {
	MaterialType.findAsync(query)
		.then(function (materialType) {
			winston.info("found material type", JSON.stringify(materialType));
			return next(null, materialType);
		}).catch(function (err) {
		winston.error("error in find material type:" + err);
		return next(err);
	});
};

module.exports.findMaterialGroupQuery = function(query,next) {
	MaterialGroup.findAsync(query)
		.then(function (materialGroup) {
			winston.info("found material group", JSON.stringify(materialGroup));
			return next(null, materialGroup);
		})
		.catch(function (err) {
			winston.error("error in find material group:" + err);
			return next(err);
		});
};

module.exports.deleteMaterialTypeId = function(id,next) {
	MaterialType.removeAsync({_id:id})
		.then(function(removed) {
				winston.info("removed material type",JSON.stringify(removed));
				return next(null, removed);
		})
		.catch(function(err) {
				winston.error("error in remove material type " + err);
				return next(err);
		});
};

module.exports.deleteMaterialGroupId = function(id,next) {
	MaterialGroup.removeAsync({_id:id})
		.then(function(removed) {
				winston.info("removed material group ",JSON.stringify(removed));
				return next(null, removed);
		})
		.catch(function(err) {
				winston.error("error in removing material group:" + err);
				return next(err);
		});
};

module.exports.allMaterials = function(next){
	var cursor = MaterialGroup.find({},{_id:1,name:1,code:1,material_types:1});
	cursor.populate("material_types",{_id:1,name:1,code:1})
		.exec(function (err,material_groups) {
			if (err){
				return next(err);
			}
			return next(null, material_groups);
		}).catch(next)
};

/**************search material group**********************/
var allowedSearchFieldsGroup = {"_id":1,"name":1,"code":1,"clientId":1,"rate":1,"applicableDate":1};


function createMaterialGroupAggrFilter(reqBody){
	var aggrFilter = [];
	for(var key in reqBody) {
		if (reqBody.hasOwnProperty(key) && (key in allowedSearchFieldsGroup)) {
			if (key === "name") {
				var obj ={};
				obj[key]= {$regex: reqBody[key], $options: 'i'};
				aggrFilter.push({$match: obj});
			} else if (key==="_id"){
				obj ={};
				obj[key]= mongoose.Types.ObjectId(reqBody[key]);
				aggrFilter.push({$match: obj});
			} /*else if (key==="clientId"){
				obj = {};
				obj['$or'] = [{clientId:{$exists:false}},{clientId:reqBody[key]}];
				aggrFilter.push({$match: obj});
			}*/else {
				obj ={};
				obj[key]= reqBody[key];
				aggrFilter.push({$match: obj});
			}
		}
	}
	return aggrFilter;
}
/* driver search params
 driver name, father's name, employee id, driver contact no1, license no, insurance policy no,
 blood group, gender, driver code, date of  joining, date of leaving, religion, date of birth,
 photo_id_no, gender, guarantor approved by, verif_prev_company_name, verif_prev_contact_name, created_by,
 last modified by ,
 */
module.exports.searchMaterialGroup = function(reqQuery, trim, next) {
	var aggrFilter  = createMaterialGroupAggrFilter(reqQuery);

	// if (reqQuery.sort){
	// 	aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
	// }
	aggrFilter.push({$sort:{name : 1}});
	if (trim){
		var projection = {"_id":1,"name":1,"code":1};
		aggrFilter.push({$project:projection});
	}
	var datacursor = MaterialGroup.aggregate(aggrFilter);
	aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
	var countCursor = MaterialGroup.aggregate(aggrFilter);
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
			var materialGroupCount = countArr[0].count;
			var no_of_pages;
			if(materialGroupCount/no_of_documents>1){
				no_of_pages = Math.ceil(materialGroupCount/no_of_documents);
			}else{
				no_of_pages =1;
			}
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }
			datacursor.exec(function (err, materialGroups) {
				var materialGroup0 = JSON.parse(JSON.stringify(materialGroups));
				//console.log(leads0);
				//var leads_ = makeLeadsResponseKeyChanges(leads0);
				if (err){
					return next(err);
				}
				var objToReturn = {};
				objToReturn.material_types = materialGroup0;
				objToReturn.pages = no_of_pages;
				objToReturn.count = materialGroupCount;
				return next(null, objToReturn);
			});
		}else{
			var objToReturn = {};
			objToReturn.material_types = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};

/**************search material type**********************/

var allowedSearchFieldsType = {"_id":1,"name":1,"code":1,"clientId":1,'hsnCode':1,'sacCode':1,'material':1};

function createMaterialTypeAggrFilter(reqBody){
    var aggrFilter = [];
    for(var key in reqBody) {
        if (reqBody.hasOwnProperty(key) && (key in allowedSearchFieldsType)) {
            if (key === "name" || key === 'material' || key === 'hsnCode' || key === 'sacCode') {
                var obj ={};
                obj[key]= {$regex: reqBody[key], $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key==="_id"){
                obj ={};
                obj[key]= mongoose.Types.ObjectId(reqBody[key]);
                aggrFilter.push({$match: obj});
            }
            /*else if (key==="clientId"){
            	obj = {};
            	obj['$or'] = [{clientId:{$exists:false}},{clientId:reqBody[key]}];
				aggrFilter.push({$match: obj});
			} */else {
                obj ={};
                obj[key]= reqBody[key];
                aggrFilter.push({$match: obj});
            }
        }
    }
    return aggrFilter;
}
/* driver search params
 driver name, father's name, employee id, driver contact no1, license no, insurance policy no,
 blood group, gender, driver code, date of  joining, date of leaving, religion, date of birth,
 photo_id_no, gender, guarantor approved by, verif_prev_company_name, verif_prev_contact_name, created_by,
 last modified by ,
 */
module.exports.searchMaterialType= function(reqQuery, trim, next) {
    var aggrFilter  = createMaterialTypeAggrFilter(reqQuery);
    if (reqQuery.sort){
		aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
	}
    if (trim){
        var projection = {"_id":1,"name":1,"code":1};
        aggrFilter.push({$project:projection});
    }
    var datacursor = MaterialType.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = MaterialType.aggregate(aggrFilter);
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
            var materialTypeCount = countArr[0].count;
            var no_of_pages;
            if(materialTypeCount/no_of_documents>1){
                no_of_pages = Math.ceil(materialTypeCount/no_of_documents);
            }else{
                no_of_pages =1;
            }
            if (reqQuery && !reqQuery.all) {
                datacursor.limit(parseInt(no_of_documents));
            }
            datacursor.exec(function (err, materialTypes) {
                var materialType0 = JSON.parse(JSON.stringify(materialTypes));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.material_types = materialType0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = materialTypeCount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.material_types = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};

