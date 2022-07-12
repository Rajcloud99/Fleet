var Promise = require('bluebird');
var winston = require('winston');
var NO_OF_DOCS = 10;
var Posting = Promise.promisifyAll(commonUtil.getModel('postings'));


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
function createPostingId(post){
	var postingID,postingCount,Material_Truck_Type="NON",pCount = "000",postingDate = "";
	if(post.type == "truck"){
		postingID = "T";
		postingCount = truckPostingCounterForDay ++;
   //		if(post.truckType && post.truckType.code){
   //			Material_Truck_Type = post.truckType.code;
  //	    }		
	}else{
		postingID = "L";
		postingCount = loadPostingCounterForDay ++;
 //		if(post.materialType && post.materialType.code){
 //			Material_Truck_Type = post.materialType.code;
 //		}
	}
 // 	if(postingCount < 10){
 //		pCount = "00"+postingCount.toString();
 //	}else if(postingCount >= 10 && postingCount<100){
 //		pCount = "0"+postingCount.toString();
 //		
 //	}else{
 //		pCount = postingCount.toString();
 //	}
 	pCount = postingCount.toString();
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
	postingDate = dMonth + "-" + dDate + "-" + dateNow.getFullYear().toString();
	dYear = dateNow.getFullYear().toString()[2] + dateNow.getFullYear().toString()[3];
	postingID = postingID   + dDate + dMonth +dYear + pCount;
	
	return {'postingID' : postingID,'postingDate' :postingDate } ;
 };
var allowedFilter = ['offer','type','otherCustomers','userId','driverId','truck','postingId','verified','postingDate','source','destination','radius','from_date','to_date','truckType','materialType','load_type','no_of_trucks','weight','isRegisteredCustomer'];
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
	fFilter["lead_status"]={$ne:"rejected"};
	for(i in query){
    	if(isAllowedFilter(i)){
			if(i ==='from_date'){
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
			}else if(i === 'truckType'){
				fFilter['truckType.truck_type'] =  query[i]; 
			}else if(i === 'source'){
				if (query[i].toLowerCase().indexOf("delhi") > -1) {
					fFilter['$or'] = [{"source.d" :"delhi"}, {"source.d" :"north delhi"},
						{"source.d" :"south delhi"},{"source.d" :"west delhi"},{"source.d" :"east delhi"}];
				}else{
					fFilter['source.d'] = otherUtil.replaceFillerDistrict(query[i].toLowerCase());
				}
			}else if(i === 'destination'){
				if (query[i].toLowerCase().indexOf("delhi") > -1) {
					fFilter['$or'] = [{"destination.d" :"delhi"}, {"destination.d" :"north delhi"},
						{"destination.d" :"south delhi"},{"destination.d" :"west delhi"},
						{"destination.d" :"east delhi"}];
				}else{
					fFilter['destination.d'] = otherUtil.replaceFillerDistrict(query[i].toLowerCase());
				}
			}else if(i === 'otherCustomers'){
				//fFilter['userId'] =  { "$ne": query[i] } // do nothing
			}else if(i === 'materialType'){
				fFilter['materialType.material_type'] =  query[i]; 
			}else {
				fFilter[i] = query[i];
			}
		}
	}
	return fFilter;
 };

module.exports.addPosting = function(data, next) {
	var oNewPID = createPostingId(data);
	data.postingId =oNewPID.postingID;
	data.postingDate = oNewPID.postingDate;
	var newPosting = new Posting(data);
  newPosting.saveAsync()
  .then(
    function(posting) {
      winston.info("New posting saved: " + posting);
//      if(data.type=="truck"){
//    	  truckPostingCounterForDay ++ ;
//      }else{
//    	  loadPostingCounterForDay ++ ;
//      }
     return next(null,posting);
    }
  )
  .catch(
    function(err) {
      winston.error("Error in addPosting: " + err.toString());
      return next(err);
    }
  );
 };
module.exports.getAllPostings = function(req,next) {
	var aPostingFields = [];
	if(req.query['device_type'] == 'android'){
		aPostingFields = ['_id','postingId','type','no_of_trucks','verified','expected_price','isPricePerTruck','offer','deal_price_posting','post_owner_name',
		'post_owner_company','mobile','postingDate','source','destination','date','truckType','weight','weight_unit','interested_to',
		'materialType','payment_posting','userId','truck_driver_details','confirmBy_posting','acceptedBy_posting'];
	 }else{
		aPostingFields = ['_id','no_of_trucks','postingId','type','verified','expected_price','isPricePerTruck','offer','deal_price_posting','post_owner_name',
		'post_owner_company','mobile','postingDate','source','destination','date','truckType','weight','weight_unit','interested_to',
		'materialType','payment_posting','contact_person_payment_at_pickupLocation','contact_person_payment_at_dropofLocation',
		'acceptedBy_posting','quote_prices','pickupTime','pickupLocation','dropofTime','dropofLocation','accepted_interest',
		'drivers','trucks','comment','confirmBy_posting','userId','truck_driver_details'];
 	 }
	var aInterestFields;
	if(req.query['device_type'] == 'android'){
		aInterestFields = ['userId','_id','postingId','no_of_trucks','created_at','interestId','type','status','verified','expected_price','post_owner_name','post_owner_company',
	 'post_mobile','source','destination','deal_price_interest','weight','materialType','truck_driver_details','confirmBy_posting',
	 'load_person','load_person_company','load_person_contact','load_person_email','vehicle_person','vehicle_person_contact','vehicle_person_email','vehicle_person_company'];
	 }else{
	 aInterestFields = ['userId','_id', 
     'no_of_trucks','interest_owner_name','payment_interest','interest_owner_company','accept_price','postingId','interestId','created_at','type','verified','status','expected_price','post_owner_name','post_owner_company',
	 'post_mobile','source','destination','quote_prices','deal_price_interest','deal_price_posting','counter_quotes','acceptedBy_interest','acceptedBy_posting','confirmBy_interest','confirmBy_posting','truckType','weight','materialType','truck_driver_details',
	 'load_person','load_person_company','load_person_contact','load_person_email','vehicle_person','vehicle_person_contact','vehicle_person_email','vehicle_person_company'];
	 }
	var aCityFields = ['c','d','s','p','formatted_address'];
 	var ffFilters = constructFilters(req.query);
	var no_of_pages = 1;
	console.log("ffFilters",req.query,ffFilters);
	Posting.countAsync(ffFilters)
	 .then(function(postingsCount) {
	      winston.info(" postings retrieved: " + postingsCount);
	      var cursor = Posting.find(ffFilters);
	 	if(req.query && req.query.sortby && req.query.sortby.split(':')){
	  		var params = req.query.sortby.split(':');
	  			//if(params[0]  && params[0] == 'created_at'){
	  			//	var oSort = {'created_at' : params[1]}
	  			//	cursor.sort(oSort);
	  			//}else if(params[0]  && params[0] == 'available_date'){
	  				var oSort = {'date.from' : params[1],'_id':-1}
	  				console.log(oSort);
	  				cursor.sort(oSort);
	  			//}
	  	}
	 	var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
	 	if(no_of_documents>15){
			no_of_documents = 15;
		}
	  	if(req.query && req.query.skip && req.query.skip>0){//TODO check field is valid or not
	  		var skip_docs = (req.query.skip-1)*no_of_documents;
	  		console.log('skip' ,skip_docs)
	             cursor.skip(parseInt(skip_docs));
	  	}
	  	
	  	if(postingsCount/no_of_documents>1){
	  		no_of_pages = postingsCount/no_of_documents;
	  	}
	 // if(req.query && req.query.userId){
	  //      cursor.populate('interested_to');
	  //}
	  cursor.limit(parseInt(no_of_documents));
	  cursor.populate('interested_to')
	    .populate('trucks')
	  	.populate('drivers')
	  	.exec(function (err, posts) {
	  	  if (err){
	  		  logger.error("#getAllPostings: " + err);
	  	      return next(err);
	  	  }
	  	  var tempPosts = JSON.parse(JSON.stringify(posts));
	  	  for(var k in tempPosts){
	  	  	 tempPosts[k] = commonUtil.prepareResponse(tempPosts[k],aPostingFields);
	  	  	 if(req.loggedInUserId == tempPosts[k].userId){
	  		  	tempPosts[k].isUserPostOwner = true;
	  		  }
             if(tempPosts[k]['source']){
                    	tempPosts[k]['source'] = commonUtil.prepareResponse(tempPosts[k]['source'],aCityFields);
               }
              if(tempPosts[k]['destination'] && tempPosts[k]['destination'][0]){
                 	tempPosts[k]['destination'][0] = commonUtil.prepareResponse(tempPosts[k]['destination'][0],aCityFields);
               }
	  		  // tempPosts[k].userId = prepareUserResponse(tempPosts[k].userId);
	  		 // tempPosts[k].otp = undefined;
	  		 // tempPosts[k].nOtp = undefined;
	  		 // tempPosts[k].isRegisteredCustomer = undefined;
	  		 // tempPosts[k].otp_verified = undefined;
	  		  // tempPosts[k].interested_to_backup = undefined;
	  		  
	  		  if(tempPosts[k].interested_to && tempPosts[k].interested_to.length>=1) {
				for(var i = 0;i< tempPosts[k].interested_to.length; i++){
				  if(tempPosts[k].interested_to[i].userId && tempPosts[k].interested_to[i].userId.toString() == req.loggedInUserId){
				       tempPosts[k].alreadyShownInterest = true;
				   }
				   tempPosts[k].interested_to[i] = commonUtil.prepareResponse(tempPosts[k].interested_to[i],aInterestFields);
				   tempPosts[k].interested_to[i].userId = undefined;
				  }
			    }
	  		  tempPosts[k].userId = undefined;
	  		  if(!req.query.userId){
                 tempPosts[k].interested_to = [];
	  		  }


	  		  //req.loggedInUserId
	  		  //	  		  if(tempPosts[k].trucks) { //send only info whic are neede.
 //	  			    for(var l in tempPosts[k].trucks){
 //	  			    	var oTempTruckss = JSON.parse(JSON.stringify(tempPosts[k].trucks[l]));
 //	  			    	tempPosts[k].trucks[l] = {};
 //	  			    	tempPosts[k].trucks[l].license_plate_num = oTempTruckss.license_plate_num;
 //	  			    	tempPosts[k].trucks[l].truckType = oTempTruckss.truckType;
 //	  			    }
 //	  			  }
	  	  }
	  	  winston.info("#getAllPostings: retrieved postings: ");
	  	  var objjj = {};
	  	  if(Math.ceil(no_of_pages)>=0){
	  		objjj.no_of_pages =Math.ceil(no_of_pages);
	  	  }else{
	  		objjj.no_of_pages =1 ;
	  	  }
	  	  
	  	  objjj.data = tempPosts;
	        return next(null, objjj);
	  	});
	    }).catch(function(err) {
	         logger.error("Error in getLastNPosting : " + err);
	     return next(err);
	  });
	
	
 };
module.exports.getPostingsByParams = function(data, next) {
 var cursor =  Posting.find(data);
   cursor.populate('interested_to')
	 .exec(function (err, posts) {
	  if (err){
		  winston.error("#getAllPostings: " + err);
	      return next(err);
	  }
	  var tempPosts = JSON.parse(JSON.stringify(posts));
	  winston.info("#getAllPostings: retrieved post postings: ");
   return next(null, tempPosts);
	});
 };
module.exports.getPostingsById = function(data, next) {
     Posting.findAsync(data)
	  .then(
	    function(postings) {
	      winston.info("Post postings retrieved: ");
	      return next(null, postings);
	    }
	  )
	  .catch(
	    function(err) {
	      winston.info("Error in getPostingsByParams: " + err);
	      return next(err);
	    }
	  )
     };
module.exports.updatePosting = function(_post, newDetails, next) {
 Posting.findByIdAndUpdateAsync(_post, {"$set": newDetails }, {"new": true,"runValidators" : true})
  .then(
    function(updatedPosting) {
      winston.info("Post posting update status: ");
      if(updatedPosting[0]){
    	  return next(null,updatedPosting[0]);
      }else{
    	  return next(null,updatedPosting);
      }
     
    }
  )
  .catch(
    function(err) {
      winston.error("updatePosting: " + err);
      return next(err);
    }
  );
 };
module.exports.updatePostingInterest = function(_post, newDetails, next) {
	var oUpdate = {};
	if(newDetails.setNewVal){
		oUpdate.$set = newDetails.setNewVal;
	}
	if(newDetails.pushToArr){
		oUpdate.$push = newDetails.pushToArr;
	}
	console.log(_post,oUpdate);
 Posting.findByIdAndUpdateAsync(_post,oUpdate, {"new": true,"runValidators" : true})
	  .then(
	    function(updatedPosting) {
	      winston.info("Post posting update status: ");
	      if(updatedPosting[0]){
	    	  return next(null,updatedPosting[0]);
	      }else{
	    	  return next(null,updatedPosting);
	      }
	      
	    }
	  )
	  .catch(
	    function(err) {
	      winston.error("updatePosting: " + err);
	      return next(err);
	    }
	  );
	};
module.exports.removePosting = function(_post, next) {
  Posting.findOneAndRemoveAsync({'_post': _post})
  .then(
    function(posting) {
      if (!posting) {
        winston.info("Removed post posting: " + posting);
        return next(null);
      } else {
        winston.info("The given posting does not exist!");
        return next(!posting);
      }
    }
  )
  .catch(
    function(err) {
      winston.info("Error in removePosting: " + err);
      return next(err);
    }
  );
 };
 
 
module.exports.getLastNPostingCount = function(oFilter, next) {
	  Posting.countAsync(oFilter)
		 .then(function(postingsCount) {
			   return next(null, postingsCount);
			    }).catch(function(err) {
		          winston.info("Error in getLastNPosting : " + err);
		      return next(err);
		    });
};

module.exports.getPostingStats = function(oFilter, next) {
	  Posting.aggregateAsync(oFilter)
		 .then(function(postingStats) {
			   return next(null, postingStats);
			    })
		   .catch(function(err) {
		          winston.info("Error in getting posting stats : " + err);
		      return next(err);
		    });
};