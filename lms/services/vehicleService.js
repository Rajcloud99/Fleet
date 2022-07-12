var winston = require('winston');
var VehicleType = promise.promisifyAll(commonUtil.getModel('vehicleType'));
var VehicleGroup = promise.promisifyAll(commonUtil.getModel('vehicleGroup'));
var NO_OF_DOCS = 15;

module.exports.addVehicleGroup = function(reqBody,next) {
	var vehicleGroup = new VehicleGroup(reqBody);
	vehicleGroup.saveAsync(reqBody)
		.then(function(vehicleGroup) {
			winston.info("added vehicle group",JSON.stringify(vehicleGroup));
			return next(null, vehicleGroup);
		})
		.catch(function(err) {
			winston.error("error in add vehicle group:" + err);
			return next(err);
		});
};

module.exports.addVehicleType = function(reqBody,next) {


	var vehicleType= new VehicleType(reqBody);
	vehicleType.clientInfo.push({"clientId":reqBody.clientId})

	vehicleType.saveAsync()
		.then(function(vehicleType) {
			winston.info("added vehicle type ",JSON.stringify(vehicleType));
			return next(null, vehicleType);
		}).catch(function(err) {
		winston.error("error in add vehicle type:" + err);
		return next(err);
	});
};

module.exports.updateVehicleTypeId = function(id,reqBody,next) {
	VehicleType.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
		.then(function(vehicleType) {
			winston.info("updated vehicle type ", JSON.stringify(vehicleType));
			return next(null, vehicleType);
		})
		.catch(function(err) {
			winston.error("error in update vehicle type:" + err);
			return next(err);
		});
};

module.exports.updateVehicleGroupId = function(id,reqBody,next) {
	VehicleGroup.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
		.then(function(vehicleGroup) {
			winston.info("updated vehicle group", JSON.stringify(vehicleGroup));
			return next(null, vehicleGroup);
		}).catch(function(err) {
		winston.error("error in update vehicle group" + err);
		return next(err);
	});
};

module.exports.updateVehicleGroupIdSetPush = function(id,newData,next) {
	var newDetails = {};
	if (newData.toSet){
		newDetails["$set"]=newData.toSet;
	}
	if (newData.toPush){
		newDetails["$push"]=newData.toPush;
	}
	VehicleGroup.findOneAndUpdateAsync({_id:id},newDetails,{new: true})
		.then(function(vehicleGroup) {
			winston.info("updated vehicle group", JSON.stringify(vehicleGroup));
			return next(null, vehicleGroup);
		}).catch(next);
};

module.exports.findVehicleTypeId = function(id,next) {
	VehicleType.findAsync({_id:id})
		.then(function (vehicleType) {
			winston.info("found vehicle type", JSON.stringify(vehicleType));
			return next(null, vehicleType);
		}).catch(function (err) {
		winston.error("error in find vehicle type:" + err);
		return next(err);
	});
};

module.exports.findVehicleGroupId = function(id,next) {
	VehicleGroup.findAsync({_id:id})
		.then(function (vehicleGroup) {
			winston.info("found vehicle group", JSON.stringify(vehicleGroup));
			return next(null, vehicleGroup);
		})
		.catch(function (err) {
			winston.error("error in find vehicle group:" + err);
			return next(err);
		});
};

module.exports.findVehicleTypeQuery = function(query,next) {
	VehicleType.findAsync(query)
		.then(function (vehicleType) {
			return next(null, vehicleType);
		}).catch(function (err) {
		winston.error("error in find vehicle type:" + err);
		return next(err);
	});
};

module.exports.findVehicleGroupQuery = function(query,next) {
	VehicleGroup.findAsync(query)
		.then(function (vehicleGroup) {
			winston.info("found vehicle group", JSON.stringify(vehicleGroup));
			return next(null, vehicleGroup);
		})
		.catch(function (err) {
			winston.error("error in find vehicle group:" + err);
			return next(err);
		});
};

module.exports.allVehicles = function(next){
	var cursor = VehicleGroup.find({},{_id:1,name:1,code:1,vehicle_types:1});
	cursor.populate("vehicle_types",{_id:1,name:1,code:1,trailer:1,length:1})
		.exec(function (err,vehicle_groups) {
			if (err){
				return next(err);
			}
			return next(null, vehicle_groups);
		}).catch(next)
};

module.exports.allVehiclesOwned = function(next){
    var cursor = VehicleType.find({is_owned:true},{_id:1,name:1,group_name:1,code:1,group_code:1});
    cursor.exec(function (err,vehicle_types) {
            if (err){
                return next(err);
            }
            return next(null, vehicle_types);
        }).catch(next)
};


module.exports.deleteVehicleTypeId = function(id,next) {
	var remove = {};
	remove._id= id;
	VehicleType.removeAsync(remove)
		.then(function(removed) {
			winston.info("removed vehicle type",JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function(err) {
			winston.error("error in remove vehicle type " + err);
			return next(err);
		});
};

module.exports.deleteVehicleGroupId = function(id,next) {
	var remove = {};
	remove._id= id;
	VehicleGroup.removeAsync(remove)
		.then(function(removed) {
			winston.info("removed vehicle group ",JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function(err) {
			winston.error("error in removing vehicle group:" + err);
			return next(err);
		});
};

/**************search vehicle group**********************/
var allowedSearchFieldsGroup = {"_id":1,"name":1,"code":1};


function createVehicleGroupAggrFilter(reqBody){
	var aggrFilter = [];
	for(var key in reqBody) {
		if (reqBody.hasOwnProperty(key) && (key in allowedSearchFieldsGroup)) {
			if (key === "name") {
				var obj ={};
				obj[key]= {$regex: reqBody[key].replace(' ','.+'), $options: 'i'};
				aggrFilter.push({$match: obj});
			} else if (key==="_id"){
				obj ={};
				obj[key]= mongoose.Types.ObjectId(reqBody[key]);
				aggrFilter.push({$match: obj});
			} else if(key==="clientId"){
				//skip
			}else {
				obj ={};
				obj[key]= reqBody[key];
				aggrFilter.push({$match: obj});
			}
		}
	}
	return aggrFilter;
}

module.exports.searchVehicleGroup = function(reqQuery, trim, next) {
	var aggrFilter  = createVehicleGroupAggrFilter(reqQuery);
	if (reqQuery.sort){
		aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
	}
	if (trim){
		var projection = {$project :{_id:1,name:1,code:1}};
		aggrFilter.push(projection);
	}
	var datacursor = VehicleGroup.aggregate(aggrFilter);
	aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
	var countCursor = VehicleGroup.aggregate(aggrFilter);
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
			var vehicleGroupCount = countArr[0].count;
			var no_of_pages;
			if(vehicleGroupCount/no_of_documents>1){
				no_of_pages = Math.ceil(vehicleGroupCount/no_of_documents);
			}else{
				no_of_pages =1;
			}
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}else{
				datacursor.limit(100000);
			}
			datacursor.exec(function (err, vehicleGroups) {
				var vehicleGroup0 = JSON.parse(JSON.stringify(vehicleGroups));
				if (err){
					return next(err);
				}
				var objToReturn = {};
				objToReturn.vehicle_types = vehicleGroup0;
				objToReturn.pages = no_of_pages;
				objToReturn.count = vehicleGroupCount;
				return next(null, objToReturn);
			});
		}else{
			var objToReturn = {};
			objToReturn.vehicle_types = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};

/**************search vehicle type**********************/

var allowedSearchFieldsType = {"_id":1,"name":1,"code":1,"clientId":1,"trailer":1,"length":1};

function createVehicleTypeAggrFilter(reqBody){
	var aggrFilter = [];
	for(var key in reqBody) {
		if (reqBody.hasOwnProperty(key) && (key in allowedSearchFieldsType)) {
			if (key === "name") {
				var obj ={};
				obj[key]= {$regex: reqBody[key].replace(' ','.+'), $options: 'i'};
				aggrFilter.push({$match: obj});
			} else if (key==="_id"){
				var obj ={};
				obj[key]= mongoose.Types.ObjectId(reqBody[key]);
				aggrFilter.push({$match: obj});
			} else if (key==="clientId"){
				///if req is not from super admin then unwind the clientinfo and filter by clientId
				if(reqBody[key]!="000000"){
					aggrFilter.push({$unwind: "$clientInfo"});
                    aggrFilter.push({$match: {"clientInfo.clientId":reqBody[key]}});
                }
			}else {
				var obj ={};
				obj[key]= reqBody[key];
				aggrFilter.push({$match: obj});
			}
		}
	}
	return aggrFilter;
}

module.exports.searchVehicleType= function(reqQuery, trim, next) {
	var aggrFilter  = createVehicleTypeAggrFilter(reqQuery);
	if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
	if (trim){
		var projection = {$project :{_id:1,name:1,code:1,capacity:1}};
		aggrFilter.push(projection);
	}
	var datacursor = VehicleType.aggregate(aggrFilter);
	aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
	var countCursor = VehicleType.aggregate(aggrFilter);
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
			var vehicleTypeCount = countArr[0].count;
			var no_of_pages;
			if(vehicleTypeCount/no_of_documents>1){
				no_of_pages = Math.ceil(vehicleTypeCount/no_of_documents);
			}else{
				no_of_pages =1;
			}
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}else{
                datacursor.limit(10000);
            }
			datacursor.exec(function (err, vehicleTypes) {
				var vehicleType0 = vehicleTypes;
				if (err){
					console.log("error mongo :"+JSON.stringify(err));
					return next(err);
				}
				var objToReturn = {};
				objToReturn.vehicle_types = vehicleType0;
				objToReturn.pages = no_of_pages;
				objToReturn.count = vehicleTypeCount;
				return next(null, objToReturn);
			});
		}else{
			var objToReturn = {};
			objToReturn.vehicle_types = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};
