var Promise = require('bluebird');
var winston = require('winston');

var TruckPosting = Promise.promisifyAll(commonUtil.getModel('truck_posting'));
function prepareUserResponse(user){
	var userResponse =undefined;
	if(user){
    userResponse = JSON.parse(JSON.stringify(user));
	userResponse.password = undefined;
	userResponse.pwd = undefined;
	userResponse.status = undefined;
	userResponse.otp = undefined;
	userResponse.nOtp = undefined;
	userResponse.noncust_details = undefined;
	userResponse.latModified = undefined;
	userResponse.created_at = undefined;
	}
    return userResponse;
};
function createPostingId(truckPost){
	var postingID = "T";
	var pCount = "000";
	var postingDate = "";
	var truck_type="";
	if(truckPostingCounterForDay < 10){
		pCount = "00"+truckPostingCounterForDay.toString();
	}else if(truckPostingCounterForDay >= 10 && truckPostingCounterForDay<100){
		pCount = "0"+truckPostingCounterForDay.toString();
		
	}else{
		pCount = truckPostingCounterForDay.toString();
	}
	var dateNow = new Date();
	if(dateNow.getMonth()<9){
		dMonth = "0" + (dateNow.getMonth() +1).toString();
	}else{
		dMonth = (dateNow.getMonth()+1).toString();	
	}
	if(dateNow.getDate()<10){
		dDate =  "0" + dateNow.getDate().toString();
	}else{
		dDate =  dateNow.getDate().toString();
	}
	if(truckPost.truckType && truckPost.truckType.code){
		truck_type = truckPost.truckType.code;
    }
	postingDate = dMonth + "-" + dDate + "-" + dateNow.getFullYear().toString();
	
	dYear = dateNow.getFullYear().toString()[2] + dateNow.getFullYear().toString()[3];
	postingID = postingID + pCount + truck_type + dDate + dMonth +dYear;
	
	return {'postingID' : postingID,'postingDate' :postingDate } ;
};
var allowedFilter = ['otherCustomers','userId','driverId','truck','postingId','verified','postingDate','source','destination','radius','from_date','to_date','truckType','weight','isRegisteredCustomer'];
var allowedParams = ['sortby'];
var isAllowedFilter  = function(sFilter){
	var isAllowed = false;
	if(allowedFilter.indexOf(sFilter)>=0){
		isAllowed =  true;
	}
	return isAllowed;
};
var isAllowedParam = function(sParam){
	var isAllowedP = false;
	if(allowedParams.indexOf(sParam)>0){
		isAllowedP =  true;
	}
	return isAllowedP;
};
var constructFilters = function(query){
	var fFilter = {};
	for(i in query){
		if(isAllowedFilter(i)){
			if(i =='from_date'){
				var startDate = new Date(query[i]);
			    startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				var nextDay = new Date(startDate);
				nextDay.setDate(startDate.getDate() + 1);
				fFilter["date.from"] = {
					        "$gte" :startDate,
					        "$lt":nextDay
					};
			}else if(i == 'truckType'){
				fFilter['truckType.truck_type'] =  query[i]; 
			}else if(i == 'destination'){
				fFilter['destination'] =  { "$in": [query[i]] } 
			}else if(i == 'otherCustomers'){
				fFilter['userId'] =  { "$ne": query[i] } 
			}else {
				fFilter[i] = query[i];
			}
			
		}
	}
	return fFilter;
};
var constructParams = function(query){
	
};
module.exports.addTruckPosting = function(data, next) {
	var oNewPID = createPostingId(data);
	data.postingId =oNewPID.postingID;
	data.postingDate = oNewPID.postingDate;
	var newTruckPosting = new TruckPosting(data);
  newTruckPosting.saveAsync()
  .then(
    function(truckPosting) {
      winston.info("New truckPosting saved: " + truckPosting);
      truckPostingCounterForDay ++ ;
      return next(null,truckPosting);
    }
  )
  .catch(
    function(err) {
      winston.error("Error in addTruckPosting: " + err.toString());
      return next(err);
    }
  );
};

module.exports.getAllTruckPostings = function(req,next) {
//	var startDate = new Date(); // this is the starting date that looks like ISODate("2014-10-03T04:00:00.188Z")
//    startDate.setSeconds(0);
//	startDate.setHours(0);
//	startDate.setMinutes(0);
//	var oFromDate_filter = { 
//		     "date.from" : {
//		        "$gte" :startDate
//		    }
//		};
	var ffFilters = constructFilters(req.query);
	console.log("ffFilters",req.query,ffFilters);
	var cursor = TruckPosting.find(ffFilters);
	if(req.query && req.query.sortby && req.query.sortby.split(':')){
		var params = req.query.sortby.split(':');
			if(params[0]  && params[0] == 'created_at'){
				var oSort = {'created_at' : params[1]}
				cursor.sort(oSort);
			}
			
	}
	if(req.query && req.query.no_of_docs){//TODO check field is valid or not
           cursor.limit(req.query.no_of_docs);
	}
	
   cursor.populate('source')
	.populate('interested_to')
	.populate('destination')
	.populate('trucks')
	//.populate('drivers')
	.exec(function (err, trucks) {
		console.log('kkkkkkkkkkkkkkkkkkkkkkkk',trucks);
	  if (err){
		  winston.error("#getAllLoadPostings: " + err);
	      return next(err);
	  }
	  var tempTrucks = JSON.parse(JSON.stringify(trucks));
	  for(var k in tempTrucks){
		  // tempTrucks[k].userId = prepareUserResponse(tempTrucks[k].userId);
		  tempTrucks[k].mobile = undefined;
		  tempTrucks[k].userId = undefined;
		  if(req.userPosting){
			  for(var j in tempTrucks[k].interested_to){
				  tempTrucks[k].interested_to[j].mobile = undefined;
				  tempTrucks[k].interested_to[j].userId = undefined;
			  }
		  }else{
			  tempTrucks[k].interested_to = undefined;
		  }
		  tempTrucks[k].otp = undefined;
		  tempTrucks[k].nOtp = undefined;
		  tempTrucks[k].isRegisteredCustomer = undefined;
		  tempTrucks[k].otp_verified = undefined;
		  if(tempTrucks[k].source && tempTrucks[k].source.p)  tempTrucks[k].source.p =undefined;
		  if(tempTrucks[k].destination) {
		    for(var l in tempTrucks[k].destination){
		    	tempTrucks[k].destination[l].p =undefined;
		    }
		  }
	  }
	  winston.info("#getAlTruckPostings: retrieved truck postings: ");
      return next(null, tempTrucks);
	});
};

module.exports.findTruckPostingByTruck = function(_truck, next) {
  TruckPosting.findOneAsync({'_truck': _truck})
  .then(
    function(truckPosting) {
      winston.info("RegisteredVehicle posting found: " + JSON.stringify(truckPosting));
      return next(null, truckPosting);
    }
  )
  .catch(
    function(err) {
      next(err);
    }
  );
};
module.exports.getTruckPostingsByParams = function(data, next) {
 var cursor =  TruckPosting.find(data);
   cursor.populate('interested_to')
	 .exec(function (err, trucks) {
	  if (err){
		  winston.error("#getAllPostings: " + err);
	      return next(err);
	  }
	  var tempTrucks = JSON.parse(JSON.stringify(trucks));
	  winston.info("#getAlTruckPostings: retrieved truck postings: ");
   return next(null, tempTrucks);
	});
};
module.exports.getTruckPostingsById = function(data, next) {
	  TruckPosting.findAsync(data)
	  .then(
	    function(truckPostings) {
	      winston.info("RegisteredVehicle postings retrieved: " + truckPostings);
	      return next(null, truckPostings);
	    }
	  )
	  .catch(
	    function(err) {
	      winston.info("Error in getTruckPostingsByParams: " + err);
	      return next(err);
	    }
	  );
	};
module.exports.updateTruckPosting = function(_truck, newDetails, next) {
 // TruckPosting.updateAsync({ '_id': _truck}, newDetails)
  TruckPosting.findByIdAndUpdateAsync(_truck, {"$set": newDetails }, {"new": true,"runValidators" : true})
  .then(
    function(updatedTruckPosting) {
      winston.info("RegisteredVehicle posting update status: " + JSON.stringify(updatedTruckPosting));
      return next(null,updatedTruckPosting[0]);
    }
  )
  .catch(
    function(err) {
      winston.error("updateTruckPosting: " + err);
      return next(err);
    }
  );
};
module.exports.updateTruckPostingInterest = function(_truck, newDetails, next) {
	var oUpdate = {};
	if(newDetails.setNewVal){
		oUpdate.$set = newDetails.setNewVal;
	}
	if(newDetails.pushToArr){
		oUpdate.$push = newDetails.pushToArr;
	}
 TruckPosting.findByIdAndUpdateAsync(_truck,oUpdate, {"new": true,"runValidators" : true})
	  .then(
	    function(updatedTruckPosting) {
	      winston.info("RegisteredVehicle posting update status: " + JSON.stringify(updatedTruckPosting));
	      return next(null,updatedTruckPosting[0]);
	    }
	  )
	  .catch(
	    function(err) {
	      winston.error("updateTruckPosting: " + err);
	      return next(err);
	    }
	  );
	};
module.exports.removeTruckPosting = function(_truck, next) {
  TruckPosting.findOneAndRemoveAsync({'_truck': _truck})
  .then(
    function(truckPosting) {
      if (!truckPosting) {
        winston.info("Removed truck posting: " + truckPosting);
        return next(null);
      } else {
        winston.info("The given posting does not exist!");
        return next(!truckPosting);
      }
    }
  )
  .catch(
    function(err) {
      winston.info("Error in removeTruckPosting: " + err);
      return next(err);
    }
  );
};
module.exports.getLastNTruckPosting = function(oldDate,newDate, next) {
	  TruckPosting.find({'created_at':{$gte: new Date(oldDate), $lt: new Date(newDate)}})
	  .then(
			 function(truckPostings) {
			      winston.info("RegisteredVehicle postings retrieved: " + truckPostings);
			      return next(null, truckPostings);
			    }
			  )
			  .catch(
			    function(err) {
			      winston.info("Error in getLastNTruckPosting : " + err);
			      return next(err);
			    }
			  );
			};
			
module.exports.getLastNTruckPostingCount = function(pDate, next) {
	  TruckPosting.count({'postingDate':pDate})
		 .then(
			 function(truckPostingsCount) {
			      winston.info("RegisteredVehicle postings retrieved: " + truckPostingsCount);
		      return next(null, truckPostingsCount);
			    }).catch(function(err) {
		      winston.info("Error in getLastNTruckPosting : " + err);
		      return next(err);
		    });
	};
	
module.exports.addPublicTruckPosting = function(data, next) {
		var oNewPID = createPostingId(data);
		data.postingId =oNewPID.postingID;
		data.postingDate = oNewPID.postingDate;
		var newPublicTruckPosting = new TruckPosting(data);
		newPublicTruckPosting.saveAsync()
	  .then(function(truckPosting) {
	      winston.info("New public truckPosting saved: " + truckPosting);
	      truckPostingCounterForDay ++ ;
	      return next(null,truckPosting);
	    }).catch(function(err) {
	      winston.error("Error in addPublicTruckPosting: " + err.toString());
	      return next(err);
	    });
	};