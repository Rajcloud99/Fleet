var Promise = require('bluebird');
var moment = require("moment");

var NO_OF_DOCS = 10;
var Booking = Promise.promisifyAll(commonUtil.getModel('bookings'));

var allowedFilter = ['status','type','otherCustomers','userId','driverId','truck','bookingId','verified','bookingDate','source','destination','radius','from_date','to_date','truckType','materialType','load_type','no_of_trucks','weight','isRegisteredCustomer','load_person','vehicle_person'];
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
				fFilter["shedule_date"] = {
					        "$gte" :startDate,
					        "$lt":nextDay
					};
			}else if(i == 'truckType'){
				fFilter['truckType.truck_type'] =  query[i]; 
			}else if(i === 'source'){
				if (query[i].toLowerCase().indexOf("delhi") > -1) {
					fFilter['$or'] = [{"source.d" :"delhi"}, {"source.d" :"north delhi"},
						{"source.d" :"south delhi"},{"source.d" :"west delhi"},{"source.d" :"east delhi"}];
				}else{
					fFilter['source.d'] = otherUtil.replaceFillerDistrict(query[i].toLowerCase());
				}
			}else if(i === 'destination'){
				//console.log('destination',[query[i]]);
				if (query[i].toLowerCase().indexOf("delhi") > -1) {
					fFilter['$or'] = [{"destination.d" :"delhi"}, {"destination.d" :"north delhi"},
						{"destination.d" :"south delhi"},{"destination.d" :"west delhi"},
						{"destination.d" :"east delhi"}];
				}else{
					fFilter['destination.d'] = otherUtil.replaceFillerDistrict(query[i].toLowerCase());
				}
			}else if(i == 'otherCustomers'){
				fFilter['userId'] =  { "$ne": query[i] } 
			}else if(i == 'userId'){
				fFilter['users'] =  { "$in": [query[i]] } 
			}
			else if(i == 'materialType'){
				fFilter['materialType.material_type'] =  query[i]; 
			}else {
				fFilter[i] = query[i];
			}
			
		}
	}
	return fFilter;
 };
var constructParams = function(query){
	
 };

 module.exports.getAllBookings = function(req,next) {
	var aBookingFields;
	if(req.query['device_type'] == 'android'){
		aBookingFields = ['bookingId','bookingDate','formattedBookingDate','post_type','status','verified',
		'expected_price','accept_price','post_mobile','source','destination','weight','materialType',
		'truck_driver_details','load_person','load_person_company','load_person_contact',
		'load_person_email','vehicle_person','vehicle_person_contact','vehicle_person_email',
		'vehicle_person_company','dropofLocation','dropofTime','pickupLocation','pickupTime',
		'bookingTime','truckType'];
	}else{
		aBookingFields = ['bookingId','bookingDate','formattedBookingDate','post_type','status','verified',
		'expected_price','accept_price','post_mobile','source','destination','weight','materialType',
		'truck_driver_details','load_person','load_person_company','load_person_contact',
		'load_person_email','vehicle_person','vehicle_person_contact','vehicle_person_email',
		'vehicle_person_company','dropofLocation','dropofTime','pickupLocation','pickupTime',
		'bookingTime','truckType','drivers'];
	}
	var aCityFields = ['c','d','s','p','formatted_address'];
	var ffFilters = constructFilters(req.query);
	var no_of_pages = 1;
	Booking.countAsync(ffFilters)
		 .then(function(postingsCount) {
			   logger.info(" bookings retrieved: " + postingsCount);
			  	var cursor = Booking.find(ffFilters);
				if(req.query && req.query.sortby && req.query.sortby.split(':')){
					var params = req.query.sortby.split(':');
						if(params[0]  && params[0] == 'created_at'){
							var oSort = {'shedule_date' : params[1]}
							cursor.sort(oSort);
						}
						
				}
				var no_of_documents = req.query && req.query.no_of_docs ? req.query.no_of_docs : NO_OF_DOCS;
			  	if(no_of_documents>15){
					no_of_documents = 15;
				}
			  	if(req.query && req.query.skip){//TODO check field is valid or not
			  		var skip_docs = (req.query.skip-1)*no_of_documents;
			  		cursor.skip(parseInt(skip_docs));
			  	}
			  	if(postingsCount/no_of_documents>1){
			  		no_of_pages = postingsCount/no_of_documents;
			  	}
				cursor.limit(parseInt(no_of_documents));
			   	cursor.populate('trucks')
				.populate('drivers')
				.populate('post_owner_id')
				.populate('interest_owner_id')
				.exec(function (err, posts) {
				  if (err){
					  logger.error("#getAllBookings: " + err);
				      return next(err);
				  }
				  var tempPosts = JSON.parse(JSON.stringify(posts));
				  for(var k in tempPosts){
				  	if(req.query['device_type'] == 'android'){
                      tempPosts[k] = commonUtil.prepareResponse(tempPosts[k],aBookingFields);
                      if(tempPosts[k]['source']){
                    	tempPosts[k]['source'] = commonUtil.prepareResponse(tempPosts[k]['source'],aCityFields);
                      }
                     if(tempPosts[k]['destination'] && tempPosts[k]['destination'][0]){
                    	tempPosts[k]['destination'][0] = commonUtil.prepareResponse(tempPosts[k]['destination'][0],aCityFields);
                     }
                    }
					//  tempPosts[k].users = undefined;
					  if(tempPosts[k].post_owner_id == req.query.userId){
						  tempPosts[k].loggedInUser = tempPosts[k].post_type+"_post_owner";
					  }
					  if(tempPosts[k].interest_owner_id == req.query.userId){
						  tempPosts[k].loggedInUser = tempPosts[k].post_type+"_interest_owner";
					  }
									  }
				  logger.info("#getAllBookings: retrieved bookings: ");
				  var objjj = {};
			  	  objjj.no_of_pages =Math.ceil(no_of_pages);
			  	  objjj.data = tempPosts;
			      return next(null, objjj);
				});
			    }).catch(function(err) {
		          logger.error("Error in getLastNPosting : " + err);
		      return next(err);
		    });
};


module.exports.updateBooking = function(booking_id, details, next) {
	details.latModified = new Date();
	Booking.findOneAndUpdateAsync(booking_id, {"$set": details}, {"new": true,"runValidators" : true})
	.then(function(doc) {
		var tempBooking = JSON.parse(JSON.stringify(doc));
		return next(null, tempBooking);
	})
	.catch(next);
};

module.exports.updateBookingonTrackSheet = function(booking_id, newDetails, next) {
	var oUpdate = {};
	if(newDetails.setNewVal){
		newDetails.latModified = new Date();
		oUpdate.$set = newDetails.setNewVal;
	}
	if(newDetails.pushToArr){
		oUpdate.$push = newDetails.pushToArr;
	}
	Booking.findOneAndUpdateAsync(booking_id, oUpdate, {"new": true,"runValidators" : true})
	.then(function(doc) {
		if(doc){
			var booking = JSON.parse(JSON.stringify(doc));
			var bookingId="",from="",to="",currentLocation="",currentStatus="",time="",truckNo="";
			if(booking.bookingId){
				bookingId = " for Booking ID "+booking.bookingId+".";
			}
			if((booking.detailed_status) && (booking.detailed_status.length>0)){
				var detailedS = booking.detailed_status;
				var lastS = detailedS.pop();
				if(lastS.status){
					if(lastS.status == 'confirm'){
						lastS.status = 'CONFIRM';
					}else if(lastS.status == 'loading_point'){
						lastS.status = 'LOADING POINT';
					}else if(lastS.status == 'loading_started'){
						lastS.status = 'LOADING STARTED';
					}else if(lastS.status == 'loading_completed'){
						lastS.status = 'LOADING COMPLETED';
					}else if(lastS.status == 'documets_received'){
						lastS.status = 'DOCUMENT RECEIVED';
					}else if(lastS.status == 'advance_payment_done'){
						lastS.status = 'ADVANCE PAYMENT DONE';
					}else if(lastS.status == 'journey'){
						lastS.status = 'JOURNEY';
					}else if(lastS.status == 'destination_reached'){
						lastS.status = 'DESTINATION REACHED';
					}else if(lastS.status == 'unloading_done'){
						lastS.status = 'UNLOADING DONE';
					}else if(lastS.status == 'pod_pending'){
						lastS.status = 'POD PENDING';
					}else if(lastS.status == 'pod_received'){
						lastS.status = 'POD RECEIVED';
					}else if(lastS.status == 'balance_paid'){
						lastS.status = 'BALANCE PAID';
					}else if(lastS.status == 'pod_dispatched'){
						lastS.status = 'POD DISPATCHED';
					}else if(lastS.status == 'payment_pending'){
						lastS.status = 'PAYMENT PENDING';
					}else if(lastS.status == 'closed'){
						lastS.status = 'CLOSED';
					}
					currentStatus = "status is "+lastS.status+" ";
				}
				if(lastS.time){
					//moment
					var date = moment(lastS.time);
					time = "at time "+date.format("DD-MM-YYYY hh:MMa")+", ";
				}
				if(lastS.location && lastS.location.formatted_address){
					currentLocation = lastS.location.formatted_address +" and ";
				}
			}
			if(booking.source && booking.source.c && booking.source.d){
				if(booking.source.c == booking.source.d){
					booking.source.d = null;
				}
			}
			if(booking.source && booking.source.c){
				from = "Which is going from "+booking.source.c;
			}
			if(booking.source && booking.source.d){
				if(from.length>0){
					from = from + " "+booking.source.d;
				}else{
					from = "Which is going from "+booking.source.d;
				}
			}
			if(booking.destination && booking.destination[0] && booking.destination[0].c && booking.destination[0].d){
				if(booking.destination[0].c == booking.destination[0].d){
					booking.destination[0].d = null;
				}
			}
			if(booking.destination && booking.destination[0] && booking.destination[0].c){
				to = " to "+booking.destination[0].c;
			}
			if(booking.destination && booking.destination[0] && booking.destination[0].d){
				to = to +" "+booking.destination[0].d;
			}
			function messagePrepare(truckNo){
				tNo = "";
				if(truckNo && (currentLocation.length>0)){
					tNo = "Current location of "+truckNo+" is "; 
					message = tNo + currentLocation + currentStatus + time + from + to + bookingId;	
				}else if(truckNo && (currentLocation.length===0)){
					tNo = "Current Status of "+truckNo+" is"; 
					message = tNo + currentStatus.substring(9) + time + from + to + bookingId;	
				}
				return message;
			}
			if(booking.truck_driver_details && booking.truck_driver_details.length>0){
				if(booking.vehicle_person_contact || booking.load_person_contact || booking.load_person_email || booking.vehicle_person_email){
					for(var i=0; i<booking.truck_driver_details.length; i++){
						var truck_number_palate = booking.truck_driver_details[i].truck_number_palate
						var messageToSend = messagePrepare(truck_number_palate);
						if(booking.load_person_contact){
							smsUtil.sendSMS(booking.load_person_contact,messageToSend);
						}
						if(booking.vehicle_person_contact){
							smsUtil.sendSMS(booking.vehicle_person_contact,messageToSend);
						}
						if(booking.load_person_email){
							var mailOptions = {
							to: booking.load_person+' ✔ <'+ booking.load_person_email+'>', 
							subject: 'Booking status.✔', 
							text: 'Welcome from Future Trucks✔', 
							html: '<br>'  +messageToSend+ '<br>'
						};
							emailUtil.sendMail(mailOptions);
						}
						if(booking.vehicle_person_email){
							var mailOptions = {
							to: booking.vehicle_person+' ✔ <'+ booking.vehicle_person_email+'>', 
							subject: 'Booking status.✔', 
							text: 'Welcome from Future Trucks✔', 
							html: '<br>'  +messageToSend+ '<br>'
						};
							emailUtil.sendMail(mailOptions);
						}
					}
				}
			}
			return next(null, booking);
		}else{
			return next(null, null);
		}
	})
	.catch(next);
};

/*module.exports.pushCurrentLocationByBookingId = function(bookingId, objectToPush) {
	//db.bookings.update({$and:[{"bookingId":"BL0303160"},{"truck_driver_details._id":ObjectId("56d7a674af6cb08406f3bf8a")}]},{$push:{"truck_driver_details.$.current_location":{"myName":"Pratik", "myPc":"HP"}}})
	var data = objectToPush.current_location;
	Booking.update({$and :[{"bookingId" : bookingId},{"truck_driver_details._id":objectToPush.objectId}]},{$push:{"truck_driver_details.$.current_location":data}})
};*/


module.exports.pushCurrentLocationByBookingId = function(bookingId, objectToPush, next) {
	//db.bookings.update({$and:[{"bookingId":"BL0303160"},{"truck_driver_details._id":ObjectId("56d7a674af6cb08406f3bf8a")}]},{$push:{"truck_driver_details.$.current_location":{"place":{"s":"Pratik"}, "myPc":"HP"}}})
		 //parsedData = JSON.parse(JSON.stringify(objectToPush.current_location));
		// parsedData = JSON.parse(objectToPush.current_location);
	Booking.findOneAndUpdateAsync({$and :[{"bookingId" : bookingId},{"truck_driver_details._id":objectToPush.objectId}]},{$push:{"truck_driver_details.$.current_location":objectToPush.current_location}}, {"new": true,"runValidators" : true})
	.then(function(doc) {
		var tempBooking = JSON.parse(JSON.stringify(doc));
		return next(null, tempBooking);
	})
	.catch(next);
};
//***************************************************************************
module.exports.expressBookingById = function(data, next) {
  Booking.findAsync(data)
  .then(
    function(booking) {
      if(booking&&booking[0]){
        var bookingData = JSON.parse(JSON.stringify(booking[0]));
        return next(null, bookingData);
      }else{
        return next(null, booking);
      }
    }).catch(function(err) {
        return next(err);
    }
  );
};

//**************************************************************************************************
module.exports.getTrackSheet = function(req, next) {
  var allowed_no_of_docs = 1;
  var allowed_skip_docs = 0;
  if(req.query && req.query.no_of_pages){
  	allowed_no_of_docs = parseInt(req.query.no_of_pages);
  	var skip_this = (allowed_no_of_docs - 1);
  	allowed_skip_docs = (100 * skip_this);
  }
  var ffFilters = {}; //= constructFilters(req.query);
	if(req.trackingDate && req.trackingDate.from && req.trackingDate.to){
		var startDate = new Date(req.trackingDate.from);
			    startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				var toDate = new Date(req.trackingDate.to);
				ffFilters.shedule_date = {
					        "$gte" :startDate.toISOString(),
					        "$lt":toDate.toISOString()
					};
	}
	else if(req.trackingDate && req.trackingDate.from){
		var startDate = new Date(req.trackingDate.from);
			    startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				var previousDay = new Date(startDate);
				previousDay.setDate(startDate.getDate() - 1);
				ffFilters.shedule_date = {
					        "$gte" :previousDay.toISOString(),
					        "$lt":startDate.toISOString()
					};
	}
	if(req.query && req.query.load_person){
		ffFilters.load_person = req.query.load_person; 
	}
	if(req.query && req.query.vehicle_person){
		ffFilters.vehicle_person = req.query.vehicle_person; 
	}
	if(req.query && req.query.status){
		ffFilters.status = req.query.status; 
	}
	if(req.query && req.query.bookingId){
		ffFilters.bookingId = req.query.bookingId; 
	}
	if(req.query && req.query.destination){
		ffFilters['destination.d'] =  { "$in": [req.query.destination] };
	}
	Booking.find(ffFilters).sort({ shedule_date: -1 }).limit(100).skip(allowed_skip_docs)
  	.then(function(booking) {
      if(booking && booking[0]){
        var bookingData = {};
         bookingData.data = JSON.parse(JSON.stringify(booking));
         return next(null, bookingData);
        }
        else{
        	return next(null, booking);
      	}
       }).catch(function(err) {
        return next(err);
    }
  );
};
//**************************************************************************************************
module.exports.stringSearchForBookingData = function(oFilter,next) {
  var thisFieldOnly;
  var thisFilterOnly;
  if(oFilter.tName){
      thisFieldOnly = {vehicle_person:1,_id:0};
      thisFilterOnly = oFilter.tName;
  }
  else if(oFilter.lName){
      thisFieldOnly = {load_person:1,_id:0};
      thisFilterOnly = oFilter.lName;
  }
  
  //db.booking.find({mobile:9026329011},{mobile:1,_id:0})
  Booking.findAsync(thisFilterOnly,thisFieldOnly)
  .then(
    function(bookingData) {
      return next(null, bookingData);
    }
  )
  .catch(
    function(err) {
      winston.error("Error in getUser:" + err);
      return next(err);
    }
  );
};
//**************************************************************************************************
