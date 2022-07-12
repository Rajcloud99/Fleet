var Promise = require('bluebird');
var winston = require('winston');
var NO_OF_DOCS = 10;
var InterestShown = Promise.promisifyAll(commonUtil.getModel('interest_shown'));
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
var allowedFilter = ['status','userId','postingId','verified','postingDate','source','destination','interestId','from_date','to_date','isRegisteredCustomer'];
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
	if(allowedParams.indexOf(sParam)>=0){
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
			}else if(i == 'source'){
				fFilter['source.d'] =  query[i];
			}else if(i == 'destination'){
				fFilter['destination.d'] =  { "$in": [query[i]] }
			}else {
				fFilter[i] = query[i];
			}

		}
	}
	return fFilter;
 };
var constructParams = function(query){

 };
function createInterestId(post){
	var interestID,interestCount,Material_Truck_Type="NON",pCount = "000",interestDate = "";
	if(post.type == "truck"){
		interestID = "IT";
	}
	else{
		interestID = "IL";
	}
	interestCount = pendingBookingCounterForDay;
      // 	if(bookingCount < 10){
		//		pCount = "00"+bookingCount.toString();
		//	}else if(bookingCount >= 10 && bookingCount<100){
		//		pCount = "0"+bookingCount.toString();
		//
		//	}else{
		//		pCount = bookingCount.toString();
		//	}
 	pCount = interestCount.toString();
 	if(post.date){
 		var dateNow = new Date(post.date);
 	}
 	else{
			var dateNow = new Date();
	}
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
	interestDate = dMonth + "-" + dDate + "-" + dateNow.getFullYear().toString();
	dYear = dateNow.getFullYear().toString()[2] + dateNow.getFullYear().toString()[3];
	interestID = interestID  + dDate + dMonth +dYear+pCount;

	return {'interestID' : interestID,'interestDate' :interestDate } ;
 };
module.exports.addInterestShown = function(data, next) {
	var oNewPID = createInterestId(data);
	data.interestId =oNewPID.interestID;
	data.interestDate = oNewPID.interestDate;
	var newInterestShown = new InterestShown(data);
    newInterestShown.saveAsync()
  .then(
    function(interestShown) {
      winston.info("New interestShown saved: ");
      return next(null,interestShown);
    }
  )
  .catch(
    function(err) {
      winston.error("Error in addInterestShown: " + err.toString());
      return next(err);
    }
  );
 };
module.exports.getAllInterestShown = function(req,next) {
	var aInterestFields;
	if(req.query['device_type'] == 'android'){
		aInterestFields = ['_id','postingId','no_of_trucks','created_at','interestId','type','status','verified','expected_price','post_owner_name','post_owner_company','shedule_date',
	'post_mobile','source','destination','deal_price_interest','weight','materialType','truck_driver_details', 'truckType',
	'load_person','load_person_company','load_person_contact','load_person_email','vehicle_person','vehicle_person_contact','vehicle_person_email','vehicle_person_company','dropofLocation','pickupLocation','pickupTime','dropofTime'];
	}else{
	aInterestFields = ['_id','accept_price','no_of_trucks','dropofLocation','payment_interest','pickupLocation','postingId','interestId','created_at','type','verified','status','expected_price','post_owner_name','post_owner_company','shedule_date',
	'post_mobile','source','destination','quote_prices','deal_price_interest','deal_price_posting','counter_quotes','acceptedBy_interest','acceptedBy_posting','confirmBy_interest','confirmBy_posting','truckType','weight','materialType','truck_driver_details',
	'load_person','load_person_company','load_person_contact','load_person_email','vehicle_person','vehicle_person_contact','vehicle_person_email','vehicle_person_company','pickupTime','dropofTime'];
	}
	var aCityFields = ['c','d','s','p','formatted_address'];
	var ffFilters = constructFilters(req.query);
	winston.info("ffFilters",req.query,"filtersss",ffFilters);
	var no_of_pages = 1;
	InterestShown.countAsync(ffFilters)
		 .then(function(postingsCount) {
			  winston.info("interests retrieved: " + postingsCount);
			  var cursor = InterestShown.find(ffFilters);
				if(req.query && req.query.sortby && req.query.sortby.split(':')){
					var params = req.query.sortby.split(':');
						if(params[0]  && params[0] == 'created_at'){
							var oSort = {'created_at' : params[1]}
							cursor.sort(oSort);
						}

				}
				var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
				if(no_of_documents>15){
					no_of_documents = 15;
				}
			  	if(req.query && req.query.skip){//TODO check field is valid or not
			  		var skip_docs = (req.query.skip-1)*no_of_documents;
			  		console.log('skip' ,skip_docs)
			             cursor.skip(skip_docs);
			  	}
			  	if(req.query && req.query.no_of_docs){//TODO check field is valid or not
			  	   if(postingsCount/no_of_documents>1){
			  		no_of_pages = postingsCount/no_of_documents;
			  		}
			  		cursor.limit(parseInt(no_of_documents));
			  		console.log('no of docs' , no_of_documents,'no_of_pages',no_of_pages);
			  	}

			    cursor.populate('trucks')
			  	.populate('drivers').exec(function (err, interests) {
				  if (err){
					  logger.error("#getAllInterests: " + err);
				      return next(err);
				  }
				  var tempInterests = JSON.parse(JSON.stringify(interests));
				  for(var k in tempInterests){
				  	tempInterests[k] = commonUtil.prepareResponse(tempInterests[k],aInterestFields);
                    if(tempInterests[k]['source']){
                    	tempInterests[k]['source'] = commonUtil.prepareResponse(tempInterests[k]['source'],aCityFields);
                    }
                    if(tempInterests[k]['destination'] && tempInterests[k]['destination'][0]){
                    	tempInterests[k]['destination'][0] = commonUtil.prepareResponse(tempInterests[k]['destination'][0],aCityFields);
                    }

					  //tempInterests[k].userId =  prepareUserResponse(tempInterests[k].userId);
					  //tempInterests[k].mobile = undefined;
					  //tempInterests[k].userId = undefined;
					  //tempInterests[k].otp = undefined;
					  //tempInterests[k].nOtp = undefined;
					  //tempInterests[k].isRegisteredCustomer = undefined;
					  //tempInterests[k].otp_verified = undefined;
					 }
				  winston.info("#getAlInterestShowns: retrieved interest postings: ");
				  var objjj = {};
			  	  objjj.no_of_pages =Math.ceil(no_of_pages);
			    	objjj.data = tempInterests;
			        return next(null, objjj);
				 });
			    }).catch(function(err) {
		          logger.error("Error in getLastNPosting : " + err);
		      return next(err);
		    });


 };
module.exports.getInterestShownsByParams = function(data, next) {
 InterestShown.findAsync(data)
  .then(
    function(interestShowns) {
      winston.info("Interest postings retrieved: ");
      return next(null, interestShowns);
    }
  )
  .catch(
    function(err) {
      winston.info("Error in getInterestShownsByParams: " + err);
      return next(err);
    }
  );
 };
module.exports.updateInterestShown = function(_interest, newDetails, next) {
	var oUpdate = {};
	if(newDetails.setNewVal){
		oUpdate.$set = newDetails.setNewVal;
	}
	if(newDetails.pushToArr){
		oUpdate.$push = newDetails.pushToArr;
	}
   InterestShown.findByIdAndUpdateAsync(_interest, oUpdate, {"new": true,"runValidators" : true})
  .then(
    function(updatedInterestShown) {
      winston.info("Interest posting update status: ");
      if(updatedInterestShown[0]){
    	  return next(null,updatedInterestShown[0]);
      }else{
    	  return next(null,updatedInterestShown);
      }

    }
  )
  .catch(
    function(err) {
      winston.error("updateInterestShown: " + err);
      return next(err);
    }
  );
 };
module.exports.removeInterestShown = function(_interest, next) {
  InterestShown.findOneAndRemoveAsync({'_interest': _interest})
  .then(
    function(interestShown) {
      if (!interestShown) {
        winston.info("Removed interest posting: ");
        return next(null);
      } else {
        winston.info("The given posting does not exist!");
        return next(!interestShown);
      }
    }
  )
  .catch(
    function(err) {
      winston.info("Error in removeInterestShown: " + err);
      return next(err);
    }
  );
 };
module.exports.getLastNInterestShown = function(oldDate,newDate, next) {
	  InterestShown.find({'created_at':{$gte: new Date(oldDate), $lt: new Date(newDate)}})
	  .then(
			 function(interestShowns) {
			      winston.info("Interest postings retrieved: ");
			      return next(null, interestShowns);
			    }
			  )
			  .catch(
			    function(err) {
			      winston.info("Error in getLastNInterestShown : " + err);
			      return next(err);
			    }
			  );
			};
module.exports.getLastNInterestShownCount = function(pDate, next) {
	  InterestShown.count({'postingDate':pDate})
		 .then(
			 function(interestShownsCount) {
			      winston.info("Interest postings retrieved: " + interestShownsCount);
		      return next(null, interestShownsCount);
			    }
			  )
		  .catch(
		    function(err) {
		      winston.info("Error in getLastNInterestShown : " + err);
		      return next(err);
		    }
		  );
	 };
module.exports.addPublicInterestShown = function(data, next) {
		var oNewPID = createPostingId(data);
		data.postingId =oNewPID.postingID;
		data.postingDate = oNewPID.postingDate;
		var newPublicInterestShown = new InterestShown(data);
		newPublicInterestShown.saveAsync()
	  .then(
	    function(interestShown) {
	      winston.info("New public interestShown saved: ");
	      interestShownCounterForDay ++ ;
	      return next(null,interestShown);
	    }
	  )
	  .catch(
	    function(err) {
	      winston.error("Error in addPublicInterestShown: " + err.toString());
	      return next(err);
	    }
	  );
    	};
module.exports.updateOtherInterests = function(aOtherInterests, newDetails ,next) {
		 var resp = {"status": "OK","message":"Your deal price acceptance done successfully."};
		 //  return new Promise(function(resolve, reject){
		 if(aOtherInterests.length>0){
		    var bulk = InterestShown.collection.initializeUnorderedBulkOp();
		    aOtherInterests.forEach(function(interest_id){
		      var query = {'_id':interest_id};
		      console.log(query,newDetails);
		      bulk.find(query).updateOne( newDetails );
		    });
		     bulk.execute(function(err, bulkres){
			     if (err){ console.log('rejected',err); return next(err);}
			       resp.bulkres = bulkres;
			     return next(null,resp);
			   });
		 }else{
		    	console.log("no other interest found in array");
		    	return next(null,resp);
		    }

		 //  });
	    	}
module.exports.getLastNInterestCount = function(oFilter, next) {
	  InterestShown.countAsync(oFilter)
		 .then(function(bookingsCount) {
			 return next(null, bookingsCount);
			    }).catch(function(err) {
		         winston.info("Error in getLastNInterestCount : " + err);
		      return next(err);
		    });
    	};
