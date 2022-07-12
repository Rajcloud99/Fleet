const deviceTypeMaster = promise.promisifyAll(commonUtil.getGpsModel('deviceTypeMaster'));
const NO_OF_DOCS = 15;

module.exports.addDeviceTypeMaster = function(reqBody,next) {
	let deviceTypeMaster_ = new deviceTypeMaster(reqBody);
	deviceTypeMaster_.saveAsync()
		.then(function(savedDeviceTypeMaster) {
			winston.info("added deviceTypeMaster",JSON.stringify(savedDeviceTypeMaster));
			return next(null, savedDeviceTypeMaster);
		})
		.catch(function(err) {
			winston.error("error in add deviceTypeMaster:" + err);
			return next(err);
		});
};

module.exports.updateDeviceTypeMasterById = function(id, reqQuery, next) {
	deviceTypeMaster.findOneAndUpdateAsync({_id:id},{$set:reqQuery},{new:true})
		.then(function(deviceTypeMaster) {
			winston.info("updated deviceTypeMaster ", JSON.stringify(deviceTypeMaster));
			return next(null, deviceTypeMaster);
		})
		.catch(function(err) {
			winston.error("error in update deviceTypeMaster:" + err);
			return next(err);
		});
};

module.exports.findDeviceTypeMasterById = function(id, next) {
	deviceTypeMaster.findAsync({_id:id})
		.then(function (deviceTypeMaster) {
			winston.info("found deviceTypeMaster", JSON.stringify(deviceTypeMaster));
			return next(null, deviceTypeMaster);
		}).catch(function (err) {
		winston.error("error in find deviceTypeMaster:" + err);
		return next(err);
	});
};

module.exports.findDeviceTypeMasterByQuery = function(query, next) {
	deviceTypeMaster.findAsync(query)
		.then(function (deviceTypeMaster) {
			winston.info("found deviceTypeMaster", JSON.stringify(deviceTypeMaster));
			return next(null, deviceTypeMaster);
		}).catch(function (err) {
		winston.error("error in find deviceTypeMaster:" + err);
		return next(err);
	});
};

module.exports.deleteDeviceTypeMasterById = function(id, next) {
	deviceTypeMaster.removeAsync({_id:id})
		.then(function(removed) {
			winston.info("removed deviceTypeMaster",JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function(err) {
			winston.error("error in remove deviceTypeMaster " + err);
			return next(err);
		});
};

module.exports.deleteDeviceTypeMasterByQuery = function(query, next) {
	deviceTypeMaster.removeAsync(query)
		.then(function(removed) {
			winston.info("removed deviceTypeMaster",JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function(err) {
			winston.error("error in remove deviceTypeMaster " + err);
			return next(err);
		});
};

const allowedSearchFields = {"name":1,"model":1};


function createDeviceTypeMasterAggrFilter(reqQuery){
	let obj;
	const aggrFilter = [];
	for(let key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === "name" || key==="model") {
				obj = {};
				obj[key]= {$regex: reqBody[key], $options: 'i'};
				aggrFilter.push({$match: obj});
			}else if (key ==="_id"){
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

module.exports.searchDeviceTypeMaster = function(reqQuery, next) {
	const aggrFilter = createDeviceTypeMasterAggrFilter(reqQuery);

	if (reqQuery.sort){
		aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
	}
	if (reqQuery.trim){
		const projection = {
			_id: 1,
			name:1,
			model:1
		};
		aggrFilter.push({$project:projection});
	}

	const datacursor = deviceTypeMaster.aggregate(aggrFilter);
	aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
	const countCursor = deviceTypeMaster.aggregate(aggrFilter);
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
			datacursor.exec(function (err, deviceTypeMasters) {
				const deviceTypeMasters_ = JSON.parse(JSON.stringify(deviceTypeMasters));
				//console.log(leads0);
				//var leads_ = makeLeadsResponseKeyChanges(leads0);
				if (err){
					return next(err);
				}
				const objToReturn = {};
				objToReturn.deviceTypeMasters = deviceTypeMasters_;
				objToReturn.pages = no_of_pages;
				objToReturn.count = count;
				return next(null, objToReturn);
			});
		}else{
			const objToReturn = {};
			objToReturn.deviceTypeMasters = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};
