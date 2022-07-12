var Promise = require('bluebird');
var winston = require('winston');

var LoadPosting = Promise.promisifyAll(commonUtil.getModel('load_posting'));
function prepareUserResponse(user){
	var userResponse;
	if(user){
	var userResponse = JSON.parse(JSON.stringify(user));
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

function createPostingId(loadPost){
	var postingID = "L";
	var pCount = "000";
	var postingDate = "";
	var material_type="";
	if(loadPostingCounterForDay < 10){
		pCount = "00"+loadPostingCounterForDay.toString();
	}else if(loadPostingCounterForDay >= 10 && loadPostingCounterForDay<100){
		pCount = "0"+loadPostingCounterForDay.toString();
		
	}else{
		pCount = loadPostingCounterForDay.toString();
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
	if(loadPost.materialType && loadPost.materialType.code){
		material_type = loadPost.materialType.code;
	}else{
		material_type = "GEN";
	}
	postingDate = dMonth + "-" + dDate + "-" + dateNow.getFullYear().toString();
	
	dYear = dateNow.getFullYear().toString()[2] + dateNow.getFullYear().toString()[3];
	postingID = postingID + pCount + material_type + dDate + dMonth +dYear;
	
	return {'postingID' : postingID,'postingDate' :postingDate } ;
};
var allowedFilter = ['otherCustomers','userId','postingId','verified','postingDate','source','destination','radius','from_date','to_date','truckType','materialType','load_type','no_of_trucks','weight','isRegisteredCustomer'];
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
			}else if(i == 'destination'){
				fFilter['destination'] =  { "$in": [query[i]] }; 
			}else if(i == 'materialType'){
				fFilter['materialType.material_type'] =  query[i]; 
			}else if(i == 'truckType'){
				fFilter['truckType.truck_type'] =  query[i]; 
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
module.exports.addLoadPosting = function(data, next) {
	var oNewPID = createPostingId(data);
	data.postingId =oNewPID.postingID;
	data.postingDate = oNewPID.postingDate;
	
  var newLoadPosting = new LoadPosting(data);
  newLoadPosting.saveAsync()
  .then(
      function(loadPosting) {
      winston.log("#addLoadPosting: new load posting created" + loadPosting);
      loadPostingCounterForDay ++ ;
      return next(null,loadPosting);
    }
  )
  .catch(
    function(err) {
                                                                                                                                                                   winston.error("#addLoadPosting: " + err);
      return next(err);
    }
  );
};

module.exports.getAllLoadPostings = function(req,next) {
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
	var cursor = LoadPosting.find(ffFilters);
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
	.exec(function (err, loads) {
	  if (err){
		  winston.error("#getAllLoadPostings: " + err);
	      return next(err);
	  }
      var tempLoads = JSON.parse(JSON.stringify(loads));
	  for(var k in tempLoads){
		  //tempLoads[k].userId =  prepareUserResponse(tempLoads[k].userId);
		  tempLoads[k].mobile = undefined;
		  tempLoads[k].userId = undefined; 
		  if(req.userPosting){
			  for(var j in tempLoads[k].interested_to){
				  tempLoads[k].interested_to[j].mobile = undefined;
				  tempLoads[k].interested_to[j].userId = undefined;
			  }
		  }else{
			  tempLoads[k].interested_to = undefined;
		  }
		  tempLoads[k].otp = undefined;
		  tempLoads[k].nOtp = undefined;
		  tempLoads[k].isRegisteredCustomer = undefined;
		  tempLoads[k].otp_verified = undefined;
		  if(tempLoads[k].source && tempLoads[k].source.p)  tempLoads[k].source.p =undefined;
		  if(tempLoads[k].destination) {
		    for(var l in tempLoads[k].destination){
		    	tempLoads[k].destination[l].p =undefined;
		    }
		  }
		}
	  winston.info("#getAllLoadPostings: retrieved load postings: ");
      return next(null, tempLoads);
	});
};
module.exports.findLoadPostingByOwner = function(_owner, next) {
  LoadPosting.findOneAsync({ '_owner': _owner })
  .then(
    function(loadPosting) {
      winston.log("#findLoadPostingByOwner: load posting found: " + loadPosting);
      return next(null, loadPosting);
    }
  )
  .catch(
    function(err) {
      winston.error("#findLoadPostingByOwner: " + err);
    }
  );
};

module.exports.getLoadPostingsByParams = function(data, next) {
	 var cursor =  LoadPosting.find(data);
	   cursor.populate('interested_to')
		 .exec(function (err, loadPostings) {
		  if (err){
			  winston.error("#getAllPostings: " + err);
		      return next(err);
		  }
		  var tempLoads = JSON.parse(JSON.stringify(loadPostings));
		  winston.info("#getPostings: retrieved postings: ");
	   return next(null, tempLoads);
		});
};
module.exports.getLoadPostingsById = function(data, next) {
	  LoadPosting.findAsync(data)
	  .then(
	    function(loadPostings) {
	      winston.info("#findLoadPostingsByParams: load postings retrieved: " + loadPostings);
	      return next(null, loadPostings);
	    }
	  )
	  .catch(
	    function(err) {
	      winston.error("#findLoadPostingsByParams: " + err);
	    }
	  );
	};

module.exports.updateLoadPosting = function(_owner, newDetails, next) {
	LoadPosting.findByIdAndUpdateAsync(_owner, {"$set": newDetails }, {"new": true,"runValidators" : true})
  .then(
    function(updatedLoadPostingStatus) {
      winston.info("#updateLoadPosting: update load posting status: " + updatedLoadPostingStatus[0]);
      return next(null,updatedLoadPostingStatus[0]);
    }
  )
  .catch(
    function(err) {
      winston.error("#updateLoadPosting: " + err);
    }
  );
};
module.exports.updateLoadPostingInterest = function(_truck, newDetails, next) {
	var oUpdate = {};
	if(newDetails.setNewVal){
		oUpdate.$set = newDetails.setNewVal;
	}
	if(newDetails.pushToArr){
		oUpdate.$push = newDetails.pushToArr;
	}
	console.log('uuuuuuuuuuuuuuuuuuuu',oUpdate);
	LoadPosting.findByIdAndUpdateAsync(_truck, oUpdate, {"new": true,"runValidators" : true})
	  .then(
	    function(updatedLoadPosting) {
	      winston.info("Load posting update status: " + JSON.stringify(updatedLoadPosting));
	      return next(null,updatedLoadPosting[0]);
	    }
	  )
	  .catch(
	    function(err) {
	      winston.error("updatedLoadPosting: " + err);
	      return next(err);
	    }
	  );
	};
module.exports.removeLoadPosting = function(_owner) {
  LoadPosting.removeAsync({"_owner": _owner})
  .then(
    function(loadPosting) {
      if (!!loadPosting) {
        winston.info("#removeLoadPosting: removed load posting: " + loadPosting);
        return next(null, loadPosting);
      } else {
        winston.error("#removeLoadPosting: load does not exist!");
        return next(!loadPosting);
      }
    }
  )
  .catch(
    function(err) {
      winston.info("#removeLoadPosting: " + err);
      return next(err);
    }
  );
};
module.exports.getLastNLoadPostingCount = function(pDate, next) {
	LoadPosting.count({'postingDate':pDate})
		 .then(
			 function(truckPostingsCount) {
			     winston.info("Load postings retrieved: " + truckPostingsCount);
		      return next(null, truckPostingsCount);
			    }
			  )
		  .catch(
		    function(err) {
		      winston.info("Error in getLastNLoadPosting : " + err);
		      return next(err);
		    }
		  );
	};
	module.exports.addPublicLoadPosting = function(data, next) {
		var oNewPID = createPostingId(data);
		data.postingId =oNewPID.postingID;
		data.postingDate = oNewPID.postingDate;
		var newPublicLoadPosting = new LoadPosting(data);
		newPublicLoadPosting.saveAsync()
	  .then(
	    function(loadPosting) {
	      winston.info("New public loadPosting saved: " + loadPosting);
	      loadPostingCounterForDay ++ ;
	      return next(null,loadPosting);
	    }
	  )
	  .catch(
	    function(err) {
	      winston.error("Error in addPublicLoadPosting: " + err.toString());
	      return next(err);
	    }
	  );
	};