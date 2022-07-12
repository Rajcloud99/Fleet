var RouteData = promise.promisifyAll(commonUtil.getModel('routeData'));
let ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
const serverSidePage = require('../../utils/serverSidePagination');
var NO_OF_DOCS =15;
const Async = require('async');

var allowedLatestContractFilters = ['clientId','customer__id','contract__id','route__id', 'category','service','vehType'];

var allowedSearchFields = {"_id":1,"customer__id":1,"contract_name":1,
	"contractId":1, "contract__id":1, "customer_name":1, "customerId":1, "route_name":1, "route__id":1,
	"created_by":1,"last_modified_by":1};

var constructLatestContractFilters = function(query){
	var fFilter = {};
	for(i in query){
		if(otherUtil.isAllowedFilter(i,allowedLatestContractFilters)){
		if (i === 'route__id') {
			fFilter[i] = {$in: otherUtil.arrString2ObjectId([query[i]])}
			}else if (i === 'customer__id') {
				fFilter[i] = {$in: otherUtil.arrString2ObjectId([query[i]])}
			}else if (i === 'vehType') {
				fFilter[i] = {$in: otherUtil.arrString2ObjectId([query[i]])}
			}else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
};

function createRouteDataAggrFilter(reqQuery){
	var aggrFilter = [];
	for(var key in reqQuery) {
		if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === "name") {
				var obj ={};
				obj[key]= {$regex: reqQuery[key], $options: 'i'};
				aggrFilter.push({$match: obj});
			} else if (key ==="_id" || key==="contract__id" || key ==="customer__id"){
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

module.exports.addRouteData = function(reqBody,next) {
	var routeData = new RouteData(reqBody);
	routeData.saveAsync(reqBody)
		.then(function(routeData) {
			winston.info("added routeData",JSON.stringify(routeData));
			return next(null, routeData);
		})
		.catch(function(err) {
			winston.error("error in add routeData:" + err);
			return next(err);
		});
};

module.exports.updateRouteDataId = function(id,reqBody,next) {
	RouteData.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
		.then(function(routeData) {
			winston.info("updated routeData ", JSON.stringify(routeData));
			return next(null, routeData);
		})
		.catch(function(err) {
			winston.error("error in update routeData:" + err);
			return next(err);
		});
};

module.exports.updateRouteDataIdSetPush = function(id,newData,next) {
	var newDetails = {};
	if (newData.toSet){
		newDetails["$set"]=newData.toSet;
	}
	if (newData.toPush){
		newDetails["$push"]=newData.toPush;
	}
	console.log(newDetails);
	RouteData.findOneAndUpdateAsync({_id:id},newDetails,{new:true})
		.then(function(updated){
			return next(null, updated);
		}).catch(function (err) {
		return next(err);
	});
};

module.exports.findRouteDataId = function(id,next) {
	RouteData.findAsync({_id:id})
		.then(function (routeData) {
			winston.info("found routeData", JSON.stringify(routeData));
			return next(null, routeData);
		}).catch(function (err) {
		winston.error("error in find routeData:" + err);
		return next(err);
	});
};

module.exports.findRouteDataQuery = function(query,next) {
	RouteData.findAsync(query)
		.then(function (routeData) {
			winston.info("found routeData", JSON.stringify(routeData));
			return next(null, routeData);
		}).catch(function (err) {
		winston.error("error in find routeData:" + err);
		return next(err);
	});
};

module.exports.findLatestContractRate = function(oQuery,next) {
		var ffFilters = constructLatestContractFilters(oQuery);
		var no_of_pages = 1;
		RouteData.countAsync(ffFilters)
			.then(function(count) {
			   	var cursor = RouteData.find(ffFilters);
				var oSort = {'created_at' : -1}
				cursor.sort(oSort);
				var no_of_documents = oQuery && oQuery.no_of_docs ? parseInt(oQuery.no_of_docs) : NO_OF_DOCS;
			  	if(no_of_documents>15){
					no_of_documents = 15;
				}
			  	if(oQuery && oQuery.skip){//TODO check field is valid or not
			  		var skip_docs = (parseInt(oQuery.skip)-1)*no_of_documents;
			  		cursor.skip(skip_docs);
			  	}
			  	if(count/no_of_documents>1){
			  		no_of_pages = count/no_of_documents;
			  	}
			  	if(oQuery.all){
					cursor.limit(100000);
			  	}else{
					cursor.limit(no_of_documents);
			  	}
			   	cursor.exec(function (err, ratesData) {
					if (err){
						return next(err);
					}
					var latestContractRate = JSON.parse(JSON.stringify(ratesData));
					var oResponse = {};
				  	oResponse.pages =Math.ceil(no_of_pages);
				  	oResponse.data = latestContractRate;
				    oResponse.count = count;
				    return next(null, oResponse);
				});
			}).catch(function(err) {
		      	return next(err);
			});
	};

module.exports.deleteRouteDataId = function(id,next) {
	var remove = {};
	remove._id= id;
	RouteData.deleteAsync(remove)
		.then(function(removed) {
			winston.info("removed routeData",JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function(err) {
			winston.error("error in remove routeData " + err);
			return next(err);
		});
};

module.exports.deleteRouteDataQuery = function(query,next) {
	RouteData.deleteAsync(query)
		.then(function(removed) {
			winston.info("removed routeData",JSON.stringify(removed));
			return next(null, removed);
		})
		.catch(function(err) {
			winston.error("error in remove routeData " + err);
			return next(err);
		});
};

module.exports.searchRouteData = function(reqQuery, trim, next) {
	var aggrFilter  = createRouteDataAggrFilter(reqQuery);

	if (reqQuery.sort){
		aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
	}
	if (trim){
		var projection = {_id:1,route_name:1,routeDataId:1};
		aggrFilter.push({$project:projection});
	}
	var datacursor = RouteData.aggregate(aggrFilter);
	aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
	var countCursor = RouteData.aggregate(aggrFilter);
	var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;

	if(no_of_documents > NO_OF_DOCS){
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
			var routeDataTcount = countArr[0].count;
			var no_of_pages;
			if(routeDataTcount/no_of_documents>1){
				no_of_pages = Math.ceil(routeDataTcount/no_of_documents);
			}else{
				no_of_pages =1;
			}
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}else{
				datacursor.limit(parseInt(10000));
			}
			datacursor.exec(function (err, routeDatas) {
				RouteData.populate(routeDatas, [{path: "data.vehicle_id"}, {path: "data.materialType"}]
					, function (err, populatedTransactions) {
						if (err) {
							return next(err);
						}
						var routeData0 = JSON.parse(JSON.stringify(populatedTransactions));
						//console.log(leads0);
						//var leads_ = makeLeadsResponseKeyChanges(leads0);
						if (err) {
							return next(err);
						}
						var objToReturn = {};
						objToReturn.routeDatas = routeData0;
						objToReturn.pages = no_of_pages;
						objToReturn.count = routeDataTcount;
						return next(null, objToReturn);
					});
			});
		}else{
			var objToReturn = {};
			objToReturn.routeDatas = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};


// Route Data Download Report - made by harikesh dated: 12/10/2019

async function routeDateDownload() {

	const aggrQuery = [
		/*{
		  "$match": {
			  clientId:'100003',
			  route_name:/loni to hisar to loni/i,
			  'data.1': {$exists: true}
		  }
		},*/
		{
		  "$sort": {
			"_id": 1
		  }
		},
		{
		  "$project": {
			"_id": true,
			"clientId": true,
			"created_at": true,
			"customer_name": true,
			"route_name": true,
			"route_distance": true,
			"route_type": true,
			"data.vehicle_group_name": true,
			"data.vehicle_type": true,
			"data.allot.diesel": true,
			"data.allot.cash": true,
			"data.rate.vehicle_rate": true,
			"data.rate.price_per_unit": true,
			"data.rate.price_per_mt": true,
			"data.rate.price_per_trip": true,
			"data.rate.min_payble_mt": true,
		  }
		},
		{
		  "$unwind": {
			"path": "$data",
			"preserveNullAndEmptyArrays": true
		  }
		},

		];
		// aggrQuery End

	let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};

	let data = await serverSidePage.requestData(RouteData, oQuery);

	ReportExelService.routeDataDownload(data, '10108', function (data) {
		console.log(data.url);
	});

}

module.exports.getTracking = async function(req, res, next) {
	try {

		let reqFilter = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		reqFilter = constructLatestContractFilters(reqFilter);

		const aggrQuery = [
			{
				"$match": reqFilter
			},
			{
				"$sort": {
					"_id": 1
				}
			},
			{
				"$project": {
					"_id": true,
					"clientId": true,
					"category": true,
					"created_at": true,
					"customer_name": true,
					"customer__id": true,
					"route_name": true,
					"route_distance": true,
					"route__id": true,
					"milestone": true,
					"vehicleType": true,
					"vehTypeNam": true,
					"vehType": true,
					"service": true,
					"tat_hr": true,
					"tat_min": true,
					"rateKm": true,
					"dieselKm": true,
					"toll": true,
					"milestone": true,
					"createdBy": true,
					"lastModifiedBy": true,
				}
			},
			{
				$lookup: {
					from: "vehicletypes",
					localField: "vehType",
					foreignField: "_id",
					as: "vehType"
				}
			},
			 {
				"$unwind": {
					"path": "$vehType",
			 		"preserveNullAndEmptyArrays": true
			 	}
			 }

		];
		// aggrQuery End

		let oQuery = {aggQuery: aggrQuery, no_of_docs: 20000};

		let data = await serverSidePage.requestData(RouteData, oQuery);

		if(data){
			return res.status(200).json({
				"status": "OK",
				"message": "Tracking Found",
				"data": data
			});
		}

	} catch (err) {
		throw err;
	}
}

module.exports.trackingData = async function(req, res, next){

	const aggrQuery = [];
	let oFilter = constructLatestContractFilters(req.query) ;
	oFilter.category = req.query.type;

	aggrQuery.push(
		{
			$match: oFilter
		});

		let oQuery = {aggQuery: aggrQuery, no_of_docs: 1000};
		let data = await serverSidePage.requestData(RouteData, oQuery);
		return data;

}



