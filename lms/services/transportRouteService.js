var TransportRoute = promise.promisifyAll(commonUtil.getModel('transportRoute'));
var NO_OF_DOCS =15;


function generateRouteId(){
    var count = app_constant.routeCount;
    var ddmmyy = otherUtil.getDDMMYY();
    return ddmmyy+(++count);
}

/**************transport route ***********/
module.exports.addTransportRoute = function(reqBody,next) {
    reqBody.routeId = generateRouteId();
    var route = new TransportRoute(reqBody);
    route.saveAsync(reqBody)
        .then(function(routeT) {
            counterUtil.incrementRouteCount();
            winston.info("added transport route",JSON.stringify(routeT));
            return next(null, route);
        })
        .catch(function(err) {
            winston.error("error in add transport route:" + err);
            return next(err);
        });
};

module.exports.updateTransportRouteId = function(id,reqBody,next) {
    TransportRoute.findOneAndUpdateAsync({_id:id},{$set:reqBody},{new:true})
        .then(function(branch) {
            winston.info("updated transport route ", JSON.stringify(branch));
            return next(null, branch);
        })
        .catch(function(err) {
            winston.error("error in update transport route:" + err);
            return next(err);
        });
};

module.exports.findTransportRouteId = function(id,next) {
    TransportRoute.findAsync({_id:id})
        .then(function (route) {
            winston.info("found transport route", JSON.stringify(route));
            return next(null, route);
        }).catch(function (err) {
        winston.error("error in find transport route:" + err);
        return next(err);
    });
};

module.exports.findTransportRouteQuery = function(query,next) {
    TransportRoute.findAsync(query)
        .then(function (route) {
            winston.info("found route", JSON.stringify(route));
            return next(null, route);
        }).catch(function (err) {
        winston.error("error in find route:" + err);
        return next(err);
    });
};

module.exports.deleteTransportRouteId = function(id,next) {
    TransportRoute.deleteAsync({_id:id})
        .then(function(removed) {
            winston.info("removed transport route",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove transport route " + err);
            return next(err);
        });
};

module.exports.deleteTransportRouteQuery = function(query,next) {
    TransportRoute.deleteAsync(query)
        .then(function(removed) {
            winston.info("removed transport route",JSON.stringify(removed));
            return next(null, removed);
        })
        .catch(function(err) {
            winston.error("error in remove transport route " + err);
            return next(err);
        });
};

var allowedSearchFields = {"_id":1,"name":1,"clientId":1,"routeId":1,"from":1,"to":1,"source.c":1,"source.d":1,"destination.c":1,"destination.d":1,"source.placeName":1};


function createTransportRouteAggrFilter(reqQuery){
    var aggrFilter = [];
    aggrFilter.push({$match:
			{deleted:
					{$ne:true}}
    });
    for(var key in reqQuery) {
        if (reqQuery.hasOwnProperty(key) && (key in allowedSearchFields)) {
			if (key === 'from') {
				obj = {};
				let startDate = new Date(reqQuery[key]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				if (!reqQuery.dateType || reqQuery.dateType === 'created_at') {
					obj["created_at"] = obj["created_at"] || {};
					obj["created_at"].$gte = startDate;
				}
				aggrFilter.push({ $match: obj });
			} else if (key === 'to') {
				obj = {};
				let endDate = new Date(reqQuery[key]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				if (!reqQuery.dateType || reqQuery.dateType === 'created_at') {
					obj["created_at"] = obj["created_at"] || {};
					obj["created_at"].$lte = endDate;
				}
				aggrFilter.push({ $match: obj });
			}else
            if (key === "name" || key === "source.c" || key ==="destination.c" || key === "source.d" || key ==="destination.d" || key==='source.placeName') {
                var obj ={};
                obj[key]= {$regex: reqQuery[key].replace(' ','.+'), $options: 'i'};
                aggrFilter.push({$match: obj});
            } else if (key ==="_id"){
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

module.exports.searchTransportRoute = function(reqQuery, trim, next) {
    var aggrFilter  = createTransportRouteAggrFilter(reqQuery);

    if (reqQuery.sort){
        aggrFilter.push({$sort:{created_at:parseInt(reqQuery.sort)}})
    }
    if (trim){
        var projection = {_id:1,name:1,routeId:1};
        aggrFilter.push({$project:projection});
    }
    var datacursor = TransportRoute.aggregate(aggrFilter);
    aggrFilter.push({ $group: {_id: null, count: { $sum : 1 }}});
    var countCursor = TransportRoute.aggregate(aggrFilter);
    if(reqQuery.all === "true"){
        //do nothing
    }else{
        var no_of_documents = reqQuery.no_of_docs || NO_OF_DOCS;
        if (no_of_documents > NO_OF_DOCS) {
            no_of_documents = NO_OF_DOCS;
        }
        if(reqQuery.skip){
            var skip_docs = (reqQuery.skip-1)*no_of_documents;
            datacursor.skip(parseInt(skip_docs));
        }
    }
    countCursor.exec(function(err, countArr){
        if (err){
            return next(err);
        }
        if (countArr.length>0){
            var routeTcount = countArr[0].count;
            var no_of_pages;
            if(routeTcount/no_of_documents>1){
                no_of_pages = Math.ceil(routeTcount/no_of_documents);
            }else{
                no_of_pages =1;
            }
			if (reqQuery && !reqQuery.all) {
				datacursor.limit(parseInt(no_of_documents));
			}else{
            	console.error("all routes fetched");
				datacursor.limit(routeTcount);
			}
            datacursor.exec(function (err, routes) {
                var route0 = JSON.parse(JSON.stringify(routes));
                //console.log(leads0);
                //var leads_ = makeLeadsResponseKeyChanges(leads0);
                if (err){
                    return next(err);
                }
                var objToReturn = {};
                objToReturn.routes = route0;
                objToReturn.pages = no_of_pages;
                objToReturn.count = routeTcount;
                return next(null, objToReturn);
            });
        }else{
            var objToReturn = {};
            objToReturn.routes = [];
            objToReturn.pages = 0;
            objToReturn.count = 0;
            return next(null, objToReturn);
        }
    });
};






