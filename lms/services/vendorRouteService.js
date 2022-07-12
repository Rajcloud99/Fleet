/**
 * Created by kamal on 20/10/16.
 */
var winston = require('winston');
var VendorRoute = promise.promisifyAll(commonUtil.getModel('vendor_routes'));
var NO_OF_DOCS = 15;
module.exports.addVendorRoute = function(reqBody,next) {
	var VRoute = new VendorRoute(reqBody);
	VRoute.saveAsync(reqBody)
	.then(function(vroute) {
			winston.info("added VendorRoute",JSON.stringify(vroute));
			return next(null, vroute);
		})
	.catch(function(err) {
			winston.error("error in add VendorRoute:" + err);
			return next(err);
		});
};

module.exports.updateVendorRouteId = function(id,reqBody,next) {
	VendorRoute.findOneAndUpdateAsync({_id:id},{$set:reqBody}, {new:true})
		.then(function(VendorRoute) {
				winston.info("updated VendorRoute ", JSON.stringify(VendorRoute));
				return next(null, VendorRoute);
		})
		.catch(function(err) {
				winston.error("error in update VendorRoute:" + err);
				return next(err);
		});
};

module.exports.updateVendorRouteIdSetPush = function(id,newData,next) {
	var newDetails = {};
	if (newData.toSet){
		newDetails["$set"]=newData.toSet;
	}
	if (newData.toPush){
		newDetails["$push"]=newData.toPush;
	}
	VendorRoute.findOneAndUpdateAsync({_id:id},newDetails)
		.then(function(VendorRoute) {
			winston.info("updated VendorRoute ", JSON.stringify(VendorRoute));
			return next(null, VendorRoute);
		})
		.catch(function(err) {
			winston.error("error in update VendorRoute:" + err);
			return next(err);
		});
};

module.exports.findVendorRouteId = function(id,next) {
	VendorRoute.findAsync({_id:id})
		.then(function (VendorRoute) {
			winston.info("found VendorRoute", JSON.stringify(VendorRoute));
			return next(null, VendorRoute);
		}).catch(function (err) {
			winston.error("error in find VendorRoute:" + err);
			return next(err);
		});
};

module.exports.findVendorRouteQuery = function(query,next) {
	VendorRoute.findAsync(query)
		.then(function (VendorRoute) {
			winston.info("found VendorRoute", JSON.stringify(VendorRoute));
			return next(null, VendorRoute);
		}).catch(function (err) {
			winston.error("error in find VendorRoute:" + err);
			return next(err);
		});
};

module.exports.deleteVendorRouteId = function(id,next) {
	VendorRoute.removeAsync({_id:id})
		.then(function(removed) {
				winston.info("removed VendorRoute",JSON.stringify(removed));
				return next(null, removed);
		})
		.catch(function(err) {
				winston.error("error in remove VendorRoute " + err);
				return next(err);
		});
};

var allowedSearchFields = {"clientId":1,"vendor_name":1, "name":1};

function createVendorRouteAggrFilter(reqBody){
	var aggrFilter = [];
	//aggrFilter.push({$match:{deleted:{$ne:true}}});
	for(var key in reqBody) {
		if (reqBody.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === "name" ) {
				var obj = {};
				obj[key] = { $regex: reqBody[key], $options: 'i' };
				aggrFilter.push({ $match: obj });
			}
			else{
				obj = {};
				obj[key] = reqBody[key];
				aggrFilter.push({ $match: obj });
			}
		}
	}
	return aggrFilter;
}

module.exports.searchVendorRoute = function(reqQuery,trim, next) {
	var aggrFilter  = createVendorRouteAggrFilter(reqQuery);
	if (reqQuery.sort){
		aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
	}
	if (trim){
		var projection = {_id:1,name:1,code:1};
		aggrFilter.push({$project:projection});
	}
	var datacursor = VendorRoute.aggregate(aggrFilter);
	aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});

	var countCursor = VendorRoute.aggregate(aggrFilter);
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
			var VendorRouteCount = countArr[0].count;
			var no_of_pages;
			if(VendorRouteCount/no_of_documents>1){
				no_of_pages = Math.ceil(VendorRouteCount/no_of_documents);
			}else{
				no_of_pages =1;
			}
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}
			datacursor.exec(function (err, VendorRoutees) {
				var VendorRoutees0 = JSON.parse(JSON.stringify(VendorRoutees));
				if (err){
					return next(err);
				}
				var objToReturn = {};
				objToReturn.VendorRoutees = VendorRoutees0;
				objToReturn.pages = no_of_pages;
				objToReturn.count = VendorRouteCount;
				return next(null, objToReturn);
			});
		}else{
			var objToReturn = {};
			objToReturn.VendorRoutees = [];
			objToReturn.pages = 0;
			objToReturn.count = 0;
			return next(null, objToReturn);
		}
	});
};


module.exports.getVendorRouteByText = function(req,next) {
	var filterOnAgg =  [];
	//var  ffFilters= constructAggFilters(req.query);
	console.log('search service get all users by text query',req.query);
	if(req.query.search && req.query.clientId){
		filterOnAgg.push({ $match: { $text: { $search: req.query.search },clientId:req.query.clientId} });
	}else if(req.query.search){
		filterOnAgg.push({ $match: { $text: { $search: req.query.search } } });
	}else if(req.query.clientId){
		filterOnAgg.push({ $match: {clientId:req.query.clientId} });
	}
	if(req.query.unique){
		filterOnAgg.push({"$group":{"_id":{"mobile":"$vendor"},
     "name":{"$last":"$name"},"detailed_name":{"$last":"$detailed_name"},
     "vendor_name":{"$last":"$vendor_name"},"vendor_contact":{"$last":"$vendor_contact"},
     "vehicle_types":{"$last":"$vehicle_types"}, "route_type":{"$last":"$route_type"}
     }})
	}
	if(req.query.search){
	    filterOnAgg.push({ $sort: { score: { $meta: "textScore" }}});
    }
    //filterOnAgg.push(  { "$sum": "no_of_pages" });
	if(req.query.unique){
       filterOnAgg.push({ $project: { name : 1,detailed_name:1,route_id:1,
           'route_type':1,'vendor_name':1,'vendor':1,'vendor_contact':1,"remarks":1} });
	}else{
	    filterOnAgg.push({ $project: { name : 1,detailed_name:1,route_id:1,
	           'route_type':1,'vendor_name':1,'vendor':1,'vendor_contact':1,"remarks":1} });
	}
  var cursor = VendorRoute.aggregate(filterOnAgg);
  filterOnAgg.push({ $group: {_id: null, count: { $sum : 1 }}});
  var countCursor = VendorRoute.aggregate(filterOnAgg);
  var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
  if(no_of_documents>15){
	no_of_documents = 15;
   }

  if(req.query && req.query.skip){//TODO check field is valid or not
	var skip_docs = (req.query.skip-1)*no_of_documents;
	cursor.skip(parseInt(skip_docs));
    }
  if(req.noLimit){
    no_of_documents = 50;
  }
  cursor.limit(parseInt(no_of_documents));
  countCursor.exec(function(err, countArr) {
      if (err) {
          return next(err);
      }
      if (countArr && countArr.length > 0) {
            var dirSearchCount = countArr[0].count;
            var no_of_pages;
            if (dirSearchCount / no_of_documents > 1) {
                no_of_pages = Math.ceil(dirSearchCount / no_of_documents);
            } else {
                no_of_pages = 1;
            }
            cursor.exec(function (err, vendors) {
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.data = vendors;
                objToReturn.no_of_pages = no_of_pages;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.data = [];
            objToReturn.no_of_pages = 0;
            return next(null, objToReturn);
        }
    });
 };




