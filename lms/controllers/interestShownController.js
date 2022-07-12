var express = require('express');
var router = express.Router();
var passport = require('passport');
var Promise = require('bluebird');
var winston = require('winston');
var interestShownService = Promise.promisifyAll(commonUtil.getService('interestShown'));
var postingService = Promise.promisifyAll(commonUtil.getService('posting'));
var bookingService = Promise.promisifyAll(commonUtil.getService('booking'));
var paymentService = Promise.promisifyAll(commonUtil.getService('payment'));
var truckService = Promise.promisifyAll(commonUtil.getService('truck'));
var driverService = Promise.promisifyAll(commonUtil.getService('driver'));
var userService = Promise.promisifyAll(commonUtil.getService('user'));
var notificationService = Promise.promisifyAll(commonUtil.getService('notification'));
var allowedFields = ['trucks','drivers','status','dropofLocation','dropofTime','pickupLocation','pickupTime','payment_mode','payment_code','acceptedBy_posting','contact_person_payment_at_dropofLocation','contact_person_payment_at_pickupLocation'];
var isAllowedFields = function(sField){
	var isAllowedF = false;
	if(allowedFields.indexOf(sField)>=0){
		isAllowedF =  true;
	}
	return isAllowedF;
 };
var getPercentage = function(total,code){
	var percentage = {pickup :{},dropof : {}};
	if(code == 'ADV'){
		percentage.pickup.percent = 100;
		percentage.pickup.amount = total;
		percentage.dropof.percent = 0
		percentage.dropof.amount =0 ;
	}else if(code == '8A2D'){
		percentage.pickup.percent = 80;
		percentage.pickup.amount = total*80/100;
		percentage.dropof.percent = 20
		percentage.dropof.amount = total * 20/100 ;
	}else if(code == '7A3D'){
		percentage.pickup.percent = 70;
		percentage.pickup.amount = total*70/100;
		percentage.dropof.percent = 30
		percentage.dropof.amount = total * 30/100 ;
	}else if(code == '5A5D'){
		percentage.pickup.percent = 50;
		percentage.pickup.amount = total*50/100;
		percentage.dropof.percent = 50
		percentage.dropof.amount = total * 50/100 ;
	}else if(code == 'DEL'){
		percentage.pickup.percent = 0;
		percentage.pickup.amount = 0;
		percentage.dropof.percent = 100;
		percentage.dropof.amount = total;
	}
	return percentage;
 };
var createSetNewValObject = function(req){
	var oQuery = req.body;
	console.log('oQuery',oQuery);
	var oUpdate = {"setNewVal" :{"latModified": new Date()}};
	for(i in oQuery){
    	if(isAllowedFields(i)){
    		 oUpdate.setNewVal[i] = oQuery[i];
		   	}
    	}
	console.log(oUpdate,'oUpdate');
	return oUpdate;
 };
var prepareObject = function(req){
	var oPUM = {};
	oPUM.txnid = req && req.booking? req.booking.paymentId :'';//booking_id
	var oPaymentP = req.booking.contact_person_payment_at_pickupLocation;
	oPUM.amount = oPaymentP.amount;
	oPUM.productinfo = req.booking.bookingId;
	//oPUM.percent = oPaymentP.percent; below using it
    /*	oPUM.productinfo = {'paymentParts':[],'paymentIdentifiers':[]};
	var invoice_items = req.booking && req.booking.invoice && req.booking.invoice.items ? req.booking.invoice.items:[];
	for(var i=0;i< invoice_items.length;i++){
		var oPaymentParts = {};
		oPaymentParts.name = invoice_items[i].name;
	    oPaymentParts.description = invoice_items[i].price;
	    oPaymentParts.isRequired = true;
		oPaymentParts.value = invoice_items[i].cost;
		oPaymentParts.settlementEvent = "EmailConfirmation";
		oPUM.productinfo.paymentParts.push(oPaymentParts);
	}
	oPUM.productinfo.paymentIdentifiers = [{'field':"bookingId",'value':req.booking.bookingId},{'field':"bookingDate",'value':req.booking.bookingDate}];
	*/
	oPUM.firstname = req.old_posting.interest_owner_name || req.user.owner_name;;
	oPUM.email = req.old_interest.email || "kamal@futuretrucks.in";
	oPUM.udf1 = req.booking.bookingId;
	oPUM.udf2 = req.old_interest._id;
	oPUM.udf3 = req.booking.bookingDate;
	oPUM.udf4 = req.booking.truckType && req.booking.truckType.truck_type ? req.booking.truckType.truck_type : req.booking.post_type;
    oPUM.udf5 = req.booking.post_type+"_post_owner";
    oPUM.udf6 = "http://futuretrucks.in/main.html#!/myBookings/myBookings-basic/"+req.booking.bookingId;
    oPUM.phone = req.old_interest.mobile || "9535888738";
    sha512Util.generateShaKey(oPUM);
	return oPUM;
 };
function prepareNotificationForOthers(interest,otherUser){
	var registrationTokens = [];
	if(otherUser && otherUser.devices && otherUser.devices.length>0){
		for(var i=0; i<otherUser.devices.length;i++){
			registrationTokens.push(otherUser.devices[i].token);
		}
	}else if(interest.post_mobile){
	userService.getUserByUSERIDAsync(interest.post_mobile)
	.then(function(user){
	   if(user && user.devices && user.devices.length>0){
	   	for(var i=0; i<user.devices.length;i++){
			registrationTokens.push(user.devices[i].token);
		}
        var entityType = interest.type;
	    if(interest.offer == 1){
		     entityType = interest.type+"offer";
	    }
    var oNotification = {
    	 "userId":user._id,
	     "users":[user._id], //need to find all relevent users here
	   "data": {
	       "entityId" : interest.postingId,
           "entityType": entityType +"booking",
           "message": interest.messageBody,
           "entitySecondLevel":interest.interestId
           },
	 "notification": {
		 "title":  "Someone booked your "+interest.type + ".",
		 "icon": "ic_launcher",
		 "body": interest.messageBody
    	 },
	 "priority":"normal",
	 "registrationTokens" : registrationTokens,
	 "mobiles" : [user.mobile],
	 "email":[user.email]
     }
    notificationService.addNotificationAsync(oNotification)
			 .then( function(notification) {
			     if(notification && notification.entityName == "NOTIFICATION"){
			    		var resp = {"status": "OK","message":"Your post owners notification saved successfully.","notification":notification};
			    		if(notification && notification.registrationTokens && notification.registrationTokens.length>0){
			    			gcmNotification.sendGCMNotification(notification);
			    		}
						console.log(resp);
					   //	return res.status(200).json(resp);
					  }else{
					   	 notification.status = "ERROR";
					   	console.log(notification);
					   //	 return res.status(200).json(notification);
					  }
			}).catch(function(err){
				console.log('error while saving notification',err);
			});
	    	}
			// body...
		});
	}
 };
function prepareNotification(interest,user){
	if(user.devices && user.devices.length>0){
		var registrationTokens = [];
		for(var i=0; i<user.devices.length;i++){
			registrationTokens.push(user.devices[i].token);
		}
	}
	var entityType = interest.type;
	if(interest.offer == 1){
		entityType = interest.type+"offer";
	}
    var oNotification = {
    	 "userId":user._id,
	     "users":[user._id], //need to find all relevent users here
	   "data": {
	       "entityId" : interest.interestId,
           "entityType": entityType+"pending_booking",
           "message": interest.messageBody
           },
	 "notification": {
		 "title": "You booked new "+ interest.type +".",
		 "icon": "ic_launcher",
		 "body": interest.messageBody
    	 },
	 "priority":"normal",
	 "registrationTokens" : registrationTokens,
	 "mobiles" : [user.mobile],
	 "email":[user.email]
     }
    notificationService.addNotificationAsync(oNotification)
			 .then( function(notification) {
			     if(notification && notification.entityName == "NOTIFICATION"){
			    		var resp = {"status": "OK","message":"Your notification saved successfully.","notification":notification};
			    		if(notification && notification.registrationTokens && notification.registrationTokens.length>0){
			    			gcmNotification.sendGCMNotification(notification);
			    		}
						console.log(resp);
					   //	return res.status(200).json(resp);
					  }else{
					   	 notification.status = "ERROR";
					   	console.log(notification);
					   //	 return res.status(200).json(notification);
					  }
			}).catch(function(err){
				console.log('error while saving notification',err);
			});
 };
router.get('/', function (req, res, next) {
	 passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error);
	    }
	 if(user){
		if(req.query){
			req.query.userId  = user._id;
		}else{
			req.query = {};
			req.query.userId  = user._id;
		}

	 req.userInterest = true;
	 interestShownService.getAllInterestShownAsync(req)
	 .then(
		function(interestShown) {
			winston.info('in routes succes');
			res.status(200).json({'status': 'OK','data':interestShown.data,'no_of_pages':interestShown.no_of_pages});
		},
		function(err) {
			winston.error("Error in interest retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		}).catch(next);
	 }else{
		 res.status(200).json({'status': 'OK','message':'Un-Authorised User.'});
	 }
	 })(req, res, next);
     });
router.post('/',
	 function(req, res, next) {
	     passport.authenticate('jwt',
		  function(error, user, info) {
	    	 if (error){
			   return next(error);
		   }
		   console.log('payload interest shown',req.body);
			 if(user && req.body.postingId){
			     var oParams = {"postingId":req.body.postingId};
			      postingService.getPostingsByParamsAsync(oParams)
			       .then(function(truckPosting){
			    	 if (truckPosting[0] === false) return {"verified": false, "message": "No such truck post exists"};
        			 //else if(truckPosting[0].date && new Date(truckPosting[0].date.from) < new Date()) {
        			 //		return {"verified" : false, "message": "RegisteredVehicle post outdated. Please contact at +919891705019"};
        			 //}
				     else if(truckPosting[0].userId && truckPosting[0].userId.toString() == user._id) {
				  	  return {"verified" : false, "message": "user is same for posting and interest"};
				      }else if(truckPosting[0].verified !='pending'){
					     if(truckPosting[0].interested_to && truckPosting[0].interested_to.length>=1) {
						 var alreadyShown = false;
						 for(var i = 0;i< truckPosting[0].interested_to.length; i++){
							 if(truckPosting[0].interested_to[i].userId && truckPosting[0].interested_to[i].userId.toString() == user._id){
								 alreadyShown = true;
								 return {"verified" : false, "message": "You have already shown interest to this RegisteredVehicle post earlier. Please check it in My Interest tab."};
							 }
						  }
						 if(!alreadyShown){
							 return truckPosting[0];
						 }
					     }else{
					     return truckPosting[0];
					     }
				     }else {
					 return {"verified" : false, "message": "truck posting is not verified by Future Trucks"};
				     }
	       }).then(function(interestPost){
	    	   if(interestPost.verified){
	    	   		registerDriverArray=[];
	    	   		registerTruckArray=[];
	    	   		req.driverIdArray=[];
	    	    	req.truckIdArray=[];

	    	    	if(req.body.truck_driver_details){
	    	   		if(req.body.truck_driver_details.length>0){

	    	   				for(i=0;i<req.body.truck_driver_details.length;i++){

	    	   						if(typeof(req.body.truck_driver_details[i].truck_id)=='undefined'){
	    	   									var prepareTruckData={};
	    	   									prepareTruckData.license_plate_num = req.body.truck_driver_details[i].truck_number_palate;
	    	   									prepareTruckData.userId = user._id;
	    	   									registerTruckArray.push(prepareTruckData)
	    	   						}
	    	   						else{
	    	   							req.body.truck_driver_details[i].truck=req.body.truck_driver_details[i].truck_id;
	    	   							req.truckIdArray.push(req.body.truck_driver_details[i].truck_id);
	    	   						}

	    	   						if(typeof(req.body.truck_driver_details[i].driver_id)=='undefined'){
	    	   									var prepareDriverData={};
	    	   									var fullName = req.body.truck_driver_details[i].driver_name;
	    	   									if(fullName.indexOf(' ') >= 0){
	    	   										prepareDriverData.first_name = fullName.substr(0,fullName.indexOf(' '));
	    	   										prepareDriverData.last_name = fullName.substr(fullName.indexOf(' ')+1);
	    	   									}
	    	   									else{
	    	   										prepareDriverData.first_name = fullName;
	    	   										prepareDriverData.last_name = " ";
	    	   									}
	    	   									prepareDriverData.license_no = "NA";
	    	   									prepareDriverData.mobile = req.body.truck_driver_details[i].driver_mobile?req.body.truck_driver_details[i].driver_mobile : user.mobile;
	    	   									prepareDriverData.userId = user._id;

	    	   									registerDriverArray.push(prepareDriverData)
	    	   						}
	    	   						else{
	    	   							req.body.truck_driver_details[i].driver=req.body.truck_driver_details[i].driver_id;
	    	   							req.driverIdArray.push(req.body.truck_driver_details[i].driver_id);
	    	   						}


	    	   				}

						}
					}

						if(registerTruckArray.length>0){
							 return truckService.registerTrucksOnIcdInterestsAsync(registerTruckArray)
							 .then(function(resultedTrucks){
								req.registerdTrucks = resultedTrucks.bulkres.getInsertedIds();

								 if(registerDriverArray.length>0){
									return driverService.registerDriversOnIcdInterestsAsync(registerDriverArray)
									.then(function(resultedDrivers){
										req.registerdDrivers = resultedDrivers.bulkres.getInsertedIds();
										return interestPost;
							 			}
									 )
								 }
								 return interestPost;
							 	}

							 )
						}
						else{
							if(registerDriverArray.length>0){
							return driverService.registerDriversOnIcdInterestsAsync(registerDriverArray)
							.then(function(resultedDrivers){
								req.registerdDrivers = resultedDrivers.bulkres.getInsertedIds();
								return interestPost;
							 	}
							 )
						}
						}
					return interestPost;
				 }else{
					return interestPost;
				 }
				 }).then(function(truckPost){
	    	   			console.log('post verified');
	    	   			var oInterest = {};

	    	  			if(truckPost.verified){

	    	  			 if(req.body.truck_driver_details){
	    	  			 	var j=0, k=0, l=0, m=0;
							for(i=0; i<req.body.truck_driver_details.length; i++){

							if(typeof(req.body.truck_driver_details[i].truck_id)=='undefined'){
									req.body.truck_driver_details[i].truck_id=req.registerdTrucks[j]._id;
									req.body.truck_driver_details[i].truck=req.registerdTrucks[j];
									j++;
							}else{
									req.body.truck_driver_details[i].truck_id=req.truckIdArray[k].truck_id;
									req.body.truck_driver_details[i].truck=req.truckIdArray[k];
									k++;

							}

							if(typeof(req.body.truck_driver_details[i].driver_id)=='undefined'){
									req.body.truck_driver_details[i].driver_id=req.registerdDrivers[l]._id;
									req.body.truck_driver_details[i].driver=req.registerdDrivers[l];
									l++;

							}else{
									req.body.truck_driver_details[i].driver_id=req.driverIdArray[m].driver_id;
									req.body.truck_driver_details[i].driver=req.driverIdArray[m];
									m++;
								}

						}
					  }

					 oInterest.userId = user._id;
					 oInterest.email = user.email;
					 oInterest.mobile = user.mobile;
					 oInterest.postingId = truckPost.postingId;
					 oInterest.interestId = "I"+truckPost.postingId;
					 oInterest.source = truckPost.source;
					 oInterest.destination = truckPost.destination;
					 oInterest.posted_UId = truckPost.userId;
					 oInterest.isRegisteredCustomer = true;
					 oInterest.posting = truckPost._id;
					 oInterest.posting_id = truckPost._id;
					 req.body.posting = truckPost._id;
					 req.body.posting_id = truckPost._id;
					 oInterest.type = truckPost.type;
					 oInterest.weight = truckPost.weight;
					 oInterest.comment = truckPost.comment;
					 oInterest.weight_unit = truckPost.weight_unit;
					 oInterest.quote_prices = req.body.expected_price?[req.body.expected_price]:[];
					 oInterest.deal_price_interest = req.body.expected_price ? req.body.expected_price : undefined;
					 oInterest.deal_price_posting = truckPost.expected_price;
					 oInterest.counter_quotes = truckPost.expected_price ? [truckPost.expected_price]:[];
					 if(req.body.truck_driver_details && req.body.truck_driver_details.length>0){
					 	oInterest.no_of_trucks = req.body.truck_driver_details.length;
					 	 oInterest.truck_driver_details = req.body.truck_driver_details;
                             for(var i=0;i<req.body.truck_driver_details.length;i++){
                             	if(req.body.truck_driver_details[i].truck_id){
                             		 oInterest.truck_driver_details[i].truck=req.body.truck_driver_details[i].truck_id;
                             	 	}
                             	if(req.body.truck_driver_details[i].driver_id){
                             		 oInterest.truck_driver_details[i].driver=req.body.truck_driver_details[i].driver_id;
                             	}
                             }
					 }else if(truckPost.type=='truck' && truckPost.truck_driver_details && truckPost.truck_driver_details.length>0){
					 	oInterest.truck_driver_details = truckPost.truck_driver_details;
					 }
					 if(req.body.expected_price){
					 	oInterest.expected_price = req.body.expected_price;
					 }else{
					 	oInterest.expected_price = truckPost.expected_price;
					 }
					 if(req.body.type){
					 	 oInterest.type = req.body.type;
					 }
					 oInterest.post_email = truckPost.email;
					 oInterest.post_mobile = truckPost.mobile;
					 oInterest.post_owner_name =truckPost.post_owner_name;
					 oInterest.post_owner_company = truckPost.post_owner_company;
					 oInterest.interest_owner_name = user.owner_name;
					 oInterest.interest_owner_company = user.company_name;
					 oInterest.interest_mobile = user.mobile;
					 oInterest.materialType = truckPost.materialType;
					 if(truckPost.type == 'load'){
                        oInterest.load_person = truckPost.post_owner_name;
                        oInterest.load_person_company = truckPost.post_owner_company,
    					oInterest.load_person_contact = truckPost.mobile;
   					    oInterest.load_person_email = truckPost.email;
   					    oInterest.vehicle_person= user.owner_name;
                        oInterest.vehicle_person_contact= user.mobile;
                        oInterest.vehicle_person_email= user.email;
                        oInterest.vehicle_person_company= user.company_name;
					 }else if(truckPost.type == 'truck'){
                        oInterest.vehicle_person=  truckPost.post_owner_name;
                        oInterest.vehicle_person_contact= truckPost.mobile;
                        oInterest.vehicle_person_email= truckPost.email;
                        oInterest.vehicle_person_company= truckPost.post_owner_company;
                        oInterest.load_person = user.owner_name;
                        oInterest.load_person_company = user.company_name;
    					oInterest.load_person_contact = user.mobile;
   					    oInterest.load_person_email = user.email;
					 }
					 if(req.body.mobile){
					 	oInterest.mobile = req.body.mobile;
					 }
					 if(req.body.acceptedBy_interest){
					 	oInterest.acceptedBy_interest = req.body.acceptedBy_interest;
					 }
					 if(req.body.materialType){
					 	oInterest.materialType = req.body.materialType;
					 }
					 if(req.body.truckType){
					 	oInterest.truckType = req.body.truckType;
					 }
					 if(req.body.weight){
					 	oInterest.weight  = req.body.weight ;
					 }
					 if(req.body.pickupLocation ){
					 	oInterest.pickupLocation  = req.body.pickupLocation ;
					 }else{
					 	oInterest.pickupLocation = truckPost.pickupLocation;
					 }
					 if(req.body.dropofLocation ){
					 	oInterest.dropofLocation  = req.body.dropofLocation ;
					 }else{
					 	oInterest.dropofLocation = truckPost.dropofLocation;
					 }
					 if(req.body.weight_unit){
					 	oInterest.weight_unit  = req.body.weight_unit;
					 }
					 if(req.body.comment){
					 	oInterest.comment  = req.body.comment;
					 }
					 if(req.body.trucks){
					 	oInterest.trucks  = req.body.trucks;
					 }
					 if(req.body.drivers){
					 	oInterest.drivers  = req.body.drivers;
					 }
					 oInterest.offer = truckPost.offer;
					 if(req.body.shedule_date){
					 	oInterest.shedule_date = req.body.shedule_date;
					 }else if(truckPost.date && truckPost.date.from){
					 	oInterest.shedule_date = truckPost.date.from;
					 }
					 if(req.body.pickupTime){
                         oInterest.pickupTime = req.body.pickupTime;
					 }else if(truckPost.pickupTime){
					 	oInterest.pickupTime = truckPost.pickupTime;
					 }
					 if(req.body.dropofTime){
                         oInterest.dropofTime = req.body.dropofTime;
					 }else if(truckPost.dropofTime){
					 	oInterest.dropofTime = truckPost.dropofTime;
					 }
					 oInterest.offer = truckPost.offer;
					 console.log('interest payload',oInterest);
					 return interestShownService.addInterestShownAsync(oInterest);
				 }else{
					return truckPost;
				 }}).then(function(interestShown) {
					 console.log('interest saved in db');
					 if(interestShown && interestShown.verified == false){
						 return interestShown;
					 }else if(interestShown[0].interestId){
						 req.interest_id = interestShown[0]._id;
						 req.interestId = interestShown[0].interestId;
						 req.savedInterest  = interestShown[0];
						 var updatePosting = {"pushToArr" :{'interested_to': {'$each' :[interestShown[0]._id]}}};
						return postingService.updatePostingInterestAsync(req.body.posting,updatePosting);
					 }
		      }).then(function(updatedPostingInterest) {
		    	  console.log('post updated with interest id');
		    	    if(updatedPostingInterest && updatedPostingInterest.verified == false){
						 return res.status(500).json(updatedPostingInterest);
					 }else if(updatedPostingInterest.postingId){
					 	var from="",to="",expected_cost="",material="",trucktype="",shedule_date="";
					 	if(req.savedInterest.expected_price){
			                		expected_cost =' for Rs ' + req.savedInterest.expected_price;
			            }
			                	if(req.savedInterest.source && req.savedInterest.source.c){
			                		from = req.savedInterest.source.c;
			                	}
			                	if(req.savedInterest.source && req.savedInterest.source.d){
			                		from = from + ' ' + req.savedInterest.source.d;
			                	}
			                	if(req.savedInterest.source && req.savedInterest.source.s){
			                		from = from + ' ' + req.savedInterest.source.s;
			                	}
			                	if(req.savedInterest.destination && req.savedInterest.destination[0] && req.savedInterest.destination[0].c){
			                		to = req.savedInterest.destination[0].c;
			                	}
			                	if(req.savedInterest.destination && req.savedInterest.destination[0] && req.savedInterest.destination[0].d){
			                		to = to  + ' ' + req.savedInterest.destination[0].d;
			                	}
			                	if(req.savedInterest.destination && req.savedInterest.destination[0] && req.savedInterest.destination[0].s){
			                		to = to  + ' ' + req.savedInterest.destination[0].s;
			                	}
			                	if(req.savedInterest.materialType && req.savedInterest.materialType.material_type){
			                		 material =', material type '+ req.savedInterest.materialType.material_type;
			                	}
			                	if(req.savedInterest.truckType && req.savedInterest.truckType.truck_type){
			                		 trucktype  =', RegisteredVehicle Type '+ req.savedInterest.truckType.truck_type;
			                	}
			                	if(updatedPostingInterest.date && updatedPostingInterest.date.from){
			                		shedule_date = ' ,shedule date '+updatedPostingInterest.date.from.toDateString();
			                	}
			                var messagePre = 'Thank you ' + user.owner_name+ ' ( '+ user.company_name +')' + ' for showing interest on ';
			              	var messageBody = 'Booking initiated for '+updatedPostingInterest.type+' post with posting id : '+ updatedPostingInterest.postingId +' from '+
			                	from+ ', to '+ to +material+ trucktype+ shedule_date + expected_cost;
			                var messagePost = ' at futuretrucks.in. For any help call us at 9891705019. Download our android application from  https://goo.gl/khpPCW';
			                var interest_mobile = req.savedInterest.mobile || user.mobile;
			                var interest_email = req.body.email || req.savedInterest.email || user.email;
							console.log(interest_mobile,messageBody);
							//if(interest_mobile){smsUtil.sendSMS(interest_mobile,message);}
							 if(interest_email){
							   var mailOptions = {
									    to: user.owner_name+ ' ✔ <'+interest_email+'>', // list of receivers
									    subject: 'Your Interest on '+req.body.type+' Post.✔ '+updatedPostingInterest.postingId,
									    text: 'Welcome from Future Trucks✔', // plaintext body
									    html: '<br>'  +messageBody+messagePost+ '<br>'// html body
									};
								emailUtil.sendMail(mailOptions);
							   }
							  var post_message = user.owner_name+ ' ( '+ user.company_name +')' + ' has shown interest on your '+updatedPostingInterest.type+' post with posting id : '+ updatedPostingInterest.postingId +' from '+
			                	from+ ', to '+ to +material+ trucktype+ shedule_date + expected_cost + ' at futuretrucks.in. For any help call us at 9891705019. Download our android application from  https://goo.gl/khpPCW';
			                  var post_mobile = req.body.post_mobile || updatedPostingInterest.mobile || req.savedInterest.post_mobile;
			                  var post_email = req.body.post_email || updatedPostingInterest.email || req.savedInterest.post_email;
			                  console.log(post_mobile,post_message);
							  if(post_mobile){smsUtil.sendSMS(post_mobile,post_message);}
							  if(post_email){
								   var mailOptions = {
										    to:  updatedPostingInterest.post_owner_name +'  ✔ <'+post_email+'>', // list of receivers
										    subject: 'Interest shown on '+updatedPostingInterest.type+' Post.✔ '+updatedPostingInterest.postingId, // Subject line
										    text: 'Welcome from Future Trucks✔', // plaintext body
										    html: '<br>'  +post_message+ '<br>'// html body
										};
									emailUtil.sendMail(mailOptions);
									console.log('email send to post owner',post_message);
								   }
					     req.savedInterest.messageBody = messageBody;
						 prepareNotification(req.savedInterest,user);
						 prepareNotificationForOthers(req.savedInterest);
						 var resp = {"status": "OK","interestId":req.interestId,"interest_id":req.interest_id,"message":messageBody+messagePost};
						 winston.info(resp);
						 return res.status(200).json(resp);
					 }
		      }).catch(next)
         }else{
        	winston.info("Un-Authorised user or session expired");
				 return res.status(200).json({"status": "OK","message":"Un-Authorised user or session expired or postingId is missing`."});
			 }
		  })(req, res, next);
		});
router.put('/:interest_id',
	 function(req, res, next) {
		  passport.authenticate('jwt',
		  function(error, user, info) {
			 if (error){
			   return next(error);
		   }
			if(user){
			  var oParams = {"_id":req.params.interest_id,"userId":user._id};
			    interestShownService.getInterestShownsByParamsAsync(oParams)//verify truck post
				   .then(function(interestShown){
			   if (interestShown[0] === false) return {"verified": false, "message": "No such interest post exists"};
     //				 else if(interestShown[0].date && new Date(interestShown[0].date.from) < new Date()) {
     //						return {"verified" : false, "message": "Interest shown  post outdated. Please contact at +919891705019"};
     //				  }
     //			   else if(interestShown[0].booked_by_other){
     //					return {"verified" : false, "message": "Booked by someone else. Please try later or show interest on other posting."};
     //				}
				 else if(interestShown[0].userId && interestShown[0].userId.toString() != user._id) {
					return {"verified" : false, "message": "User is not same as interest  owner"};
					}
				 else if(interestShown[0].postingId != req.body.postingId) {
						return {"verified" : false, "message": "Posting Id does not exist for this Interest."};
					}
				else {
					req.old_interest = interestShown[0];
				 	 return interestShown[0];
				 }
			   }).then(function(interestShown){
				   console.log('lllllllllllllllll');
		    	     if(interestShown && interestShown.interestId){
					    var updateInterest = createSetNewValObject(req);
					    // send sms and email to interest owner
					   return interestShownService.updateInterestShownAsync(req.params.interest_id,updateInterest);
					 }else{
						return interestShown;
			  }}).then( function(interestShown) {
				     if(interestShown && interestShown.interestId){
				    	 var resp = {"status": "OK","interest": interestShown,"message":"your interest is updated successfully."};
				    	 //logger.info(resp);
				    	 return res.status(200).json(resp);
				     }else{
				    	 interestShown.status = "ERROR";
				    	 winston.info(interestShown);
				    	 return res.status(200).json(interestShown);
				     }

			      }
			    )
			    .catch(next);
			}else{
				var resp = {"status": "ERROR","message":"Un-Authorised User."};
				 winston.info(resp);
				 return res.status(500).json(resp);
			}

		  })(req, res, next);
     });
router.post('/confirmBy_interest',
	 function(req, res, next) {
	     winston.info('confirmBy_interest_payload',req.body);
	     //TODO verify payload first{postingId,interest_id,payment_options for load owner,accept price etc.}
		  passport.authenticate('jwt',
		  function(error, user, info) {
			 if (error){
			   return next(error);
		   }
			if(user){
			    var oParams = {"postingId":req.body.postingId};
			    req.contacts = {};
			    postingService.getPostingsByIdAsync(oParams)//verify truck post
				 .then(function(truckPosting){
					 if (truckPosting[0] === false) return {"verified": false, "message": "No such posting exists"};
     //					 else if(truckPosting[0].date && new Date(truckPosting[0].date.from) < new Date()) {
     //							return {"verified" : false, "message": "RegisteredVehicle post outdated. Please contact at +919891705019"};
     //					  }
					 else if(truckPosting[0].userId && truckPosting[0].userId.toString() == user._id) {
						return {"verified" : false, "message": "User is same as  post owner"};
						}
					 else if(truckPosting[0].interested_to.indexOf(req.body.interest_id) < 0) {
							return {"verified" : false, "message": "Interest Id does not exist for this post."};
						}
					 else if(truckPosting[0].accepted_interest.interest_id != req.body.interest_id){
							return {"verified" : false, "message": "Interest Id does not match with the actual interest accepted by person."};
						}
					 else if(truckPosting[0].accepted_interest.confirmBy_interest){
							return {"verified" : false, "message": "You have already confirmed the booking."};
						}
     //					 else if(!truckPosting[0].acceptedBy_posting){
     //							return {"verified" : false, "message": "You have not accepted BID from any interest."};
     //						}
					else if(truckPosting[0].verified !='pending'){
					 	 req.body.posting_id = truckPosting[0]._id;
		    			 req.contacts.post_mobile = truckPosting[0].mobile;
		    			 req.contacts.post_email = truckPosting[0].email;
		    			 req.old_posting = truckPosting[0];
						 return truckPosting[0];
					 }else {
						 return {"verified" : false, "message": "posting is not verified by Future Trucks"};
					 }
		      }).then(function(truckPost){//verify interest deal price for acceptance
					if(truckPost.verified){
						    var oParams = {"_id":req.body.interest_id};
						    return interestShownService.getInterestShownsByParamsAsync(oParams)//verify truck interest
							 .then(function(interestShown){
							   if (interestShown[0] === false) return {"verified": false, "message": "No such interest post exists"};
     //								 else if(interestShown[0].date && new Date(interestShown[0].date.from) < new Date()) {
     //										return {"verified" : false, "message": "Interest shown  post outdated. Please contact at +919891705019"};
     //								  }
								 else if(interestShown[0].userId && interestShown[0].userId.toString() != user._id) {
									return {"verified" : false, "message": "User is not same as interest  owner"};
									}
								 else if(interestShown[0].postingId != req.body.postingId) {
										return {"verified" : false, "message": "Posting Id does not exist for this Interest."};
											 }
								 else if(!interestShown[0].acceptedBy_posting){//already accepted by interest owner0
										return {"verified" : false, "message": "You have not  accepted current deal price for this post."};
							     }
								 else if(interestShown[0].confirmBy_interest){//already accepted by interest owner0
										return {"verified" : false, "message": "You have already confirmed the booking this interest."};
							     }
								else {
								 	 return interestShown[0];
								 }
					      })
				}else{
						   return truckPost;
			        }
			}).then(function(interestPost){
	    	   if(interestPost.verified){
	    	   		registerDriverArray=[];
	    	   		registerTruckArray=[];
	    	   		req.driverIdArray=[];
	    	    	req.truckIdArray=[];

	    	    	if(req.body.truck_driver_details){
	    	   		if(req.body.truck_driver_details.length>0){

	    	   				for(i=0;i<req.body.truck_driver_details.length;i++){

	    	   						if(typeof(req.body.truck_driver_details[i].truck)=='undefined'){
	    	   									var prepareTruckData={};
	    	   									prepareTruckData.license_plate_num = req.body.truck_driver_details[i].truck_number_palate;
	    	   									prepareTruckData.userId = user._id;
	    	   									registerTruckArray.push(prepareTruckData)
	    	   						}
	    	   						else{
	    	   							req.truckIdArray.push(req.body.truck_driver_details[i].truck);
	    	   						}

	    	   						if(typeof(req.body.truck_driver_details[i].driver)=='undefined'){
	    	   									var prepareDriverData={};
	    	   									var fullName = req.body.truck_driver_details[i].driver_name;
	    	   									if(fullName.indexOf(' ') >= 0){
	    	   										prepareDriverData.first_name = fullName.substr(0,fullName.indexOf(' '));
	    	   										prepareDriverData.last_name = fullName.substr(fullName.indexOf(' ')+1);
	    	   									}
	    	   									else{
	    	   										prepareDriverData.first_name = fullName;
	    	   										prepareDriverData.last_name = " ";
	    	   									}
	    	   									prepareDriverData.license_no = "NA";
	    	   									prepareDriverData.mobile = user.mobile;
	    	   									prepareDriverData.userId = user._id;

	    	   									registerDriverArray.push(prepareDriverData)
	    	   						}
	    	   						else{
	    	   							req.driverIdArray.push(req.body.truck_driver_details[i].driver);
	    	   						}


	    	   				}

						}
					}

						if(registerTruckArray.length>0){
							 return truckService.registerTrucksOnIcdInterestsAsync(registerTruckArray)
							 .then(function(resultedTrucks){
								req.registerdTrucks = resultedTrucks.bulkres.getInsertedIds();

								 if(registerDriverArray.length>0){
									return driverService.registerDriversOnIcdInterestsAsync(registerDriverArray)
									.then(function(resultedDrivers){
										req.registerdDrivers = resultedDrivers.bulkres.getInsertedIds();
										return interestPost;
							 			}
									 )
								 }
								 return interestPost;
							 	}

							 )
						}
						else{
							if(registerDriverArray.length>0){
							return driverService.registerDriversOnIcdInterestsAsync(registerDriverArray)
							.then(function(resultedDrivers){
								req.registerdDrivers = resultedDrivers.bulkres.getInsertedIds();
								return interestPost;
							 	}
							 )
						}
						}
					return interestPost;
				 }else{
					return {"verified" : false};
				 }
				 }).then(function(interestShown){
					if(interestShown && interestShown.interestId){

						if(req.body.truck_driver_details){
	    	  			 	var j=0, k=0, l=0, m=0;
							for(i=0; i<req.body.truck_driver_details.length; i++){

							if(typeof(req.body.truck_driver_details[i].truck)=='undefined'){

									req.body.truck_driver_details[i].truck=req.registerdTrucks[j];
									j++;
							}else{

									req.body.truck_driver_details[i].truck=req.truckIdArray[k];
									k++;

							}

							if(typeof(req.body.truck_driver_details[i].driver)=='undefined'){

									req.body.truck_driver_details[i].driver=req.registerdDrivers[l];
									l++;

							}else{
									req.body.truck_driver_details[i].driver=req.driverIdArray[m];
									m++;
								}

						}
					  }

						req.old_interest = interestShown;
						req.contacts.interest_mobile = interestShown.mobile;
		    			req.contacts.interest_email = interestShown.email;
						var status = "active";
						if(interestShown.acceptedBy_interest){
							status = "booked";
						}
						 var oUpdate = {"setNewVal":{"confirmBy_interest":req.body.confirmBy_interest,"latModified": new Date()}};
						if(req.old_posting.type == 'truck'){
							//generate invoice
							oUpdate.setNewVal.payment_interest = req.old_interest.payment_interest || {};
			    			oUpdate.setNewVal.payment_interest.code = req.body.payment_code;
			    			oUpdate.setNewVal.payment_interest.mode = req.body.payment_mode;
			    			     var total_new_cost,p_code,per_truck_cost_inc = 0;
				    			 if(oUpdate.setNewVal.payment_interest.options){
				    				for(l=0;l<oUpdate.setNewVal.payment_interest.options.length;l++){
				    					if(oUpdate.setNewVal.payment_interest.options[l].code==req.body.payment_code){
				    						total_new_cost = oUpdate.setNewVal.payment_interest.options[l].cost;
				    						per_truck_cost_inc = l*100;
				    						p_code = req.body.payment_code;
				    					}
				    				}
				    			 }
				    			 console.log(total_new_cost,p_code,per_truck_cost_inc);
				    			 var percent = getPercentage(total_new_cost,p_code);
				    			 oUpdate.setNewVal.contact_person_payment_at_dropofLocation = req.old_interest.contact_person_payment_at_dropofLocation;
					    		 oUpdate.setNewVal.contact_person_payment_at_pickupLocation = req.old_interest.contact_person_payment_at_pickupLocation;

					    		 oUpdate.setNewVal.contact_person_payment_at_dropofLocation.amount = percent.dropof.amount;
					    		 oUpdate.setNewVal.contact_person_payment_at_dropofLocation.percent = percent.dropof.percent;
					    	     oUpdate.setNewVal.contact_person_payment_at_pickupLocation.amount = percent.pickup.amount;
							     oUpdate.setNewVal.contact_person_payment_at_pickupLocation.percent = percent.pickup.percent;
							 	if(req.body.contact_person_payment_at_dropofLocation){
									oUpdate.setNewVal.contact_person_payment_at_dropofLocation.name = req.body.contact_person_payment_at_dropofLocation.name;
									oUpdate.setNewVal.contact_person_payment_at_dropofLocation.number = req.body.contact_person_payment_at_dropofLocation.number;
								}if(req.body.contact_person_payment_at_pickupLocation){
									oUpdate.setNewVal.contact_person_payment_at_pickupLocation.name = req.body.contact_person_payment_at_pickupLocation.name;
									oUpdate.setNewVal.contact_person_payment_at_pickupLocation.number = req.body.contact_person_payment_at_pickupLocation.number;
								}
				    			 var payment_interest = {};
				    			 if(req.old_interest.payment_interest){
				    				 payment_interest = JSON.parse(JSON.stringify(req.old_interest.payment_interest));
				    			 }
				    			 payment_interest.invoice_posting_no = "000000025";//TODO generate invoice_posting no
				    			 payment_interest.total_amount_payable = 0;
				    			 payment_interest.grand_total_amount = 0;
						         var aItems = [];

						      //   for(var i=0;i<req.old_posting.trucks_info.length;i++){
						    		 var oTruck = req.old_interest.truckType || req.old_posting.truckType;
						    		 var oItem = {};
						    		 console.log(oTruck);
						    		 oItem.name = oTruck.truck_type ?oTruck.truck_type : "RegisteredVehicle" ;
						    		 oItem.quantity = req.old_posting.no_of_trucks || req.old_interest.no_of_trucks || 1;
						    		 console.log(req.old_posting.no_of_trucks, req.old_interest.no_of_trucks,1)
						    		 oTruck.price_per_truck = total_new_cost/oItem.quantity;
						    		 oItem.cost =  oItem.quantity * oTruck.price_per_truck;
						    		 console.log(oItem.cost,oTruck.price_per_truck);
						    		 payment_interest.total_amount_payable =  payment_interest.total_amount_payable + oItem.cost;
						    		 oTruck.price_per_truck = oTruck.price_per_truck*102/100;//2% TDS added;
						    		 oItem.cost= oItem.cost*102/100;
						    		 oItem.price = oItem.quantity + " * " + oTruck.price_per_truck;
						    		 payment_interest.grand_total_amount =  payment_interest.grand_total_amount + oItem.cost;
						     		 aItems.push(oItem);
						 //   	 }
						     		payment_interest.items = aItems;
						    	 oUpdate.setNewVal.invoice_interest = payment_interest;
						}else{
							if(req.body.trucks){
								oUpdate.setNewVal.trucks = req.body.trucks;
							}
							if(req.body.drivers){
								oUpdate.setNewVal.drivers = req.body.drivers;
							}
							if(req.body.truck_driver_details){
								oUpdate.setNewVal.truck_driver_details = req.body.truck_driver_details;
							}
						}
						console.log('uuuuuuuuuuuuuuuuuuuuuu',oUpdate);
						 return interestShownService.updateInterestShownAsync(req.body.interest_id,oUpdate)
					 }else{
						return interestShown;
			  }})
			  .then(function(interestShown){
				 	if(interestShown && interestShown.acceptedBy_interest && interestShown.acceptedBy_posting){
						// send sms and email to interest owner

				 		req.old_interest = interestShown;
				 		console.log("updating posting");
						req.body.interest_owner_id = interestShown.userId;
						 var oUpdate = {"setNewVal":{"latModified": new Date()}};
						 oUpdate.setNewVal.accepted_interest = req.old_posting.accepted_interest;
						 oUpdate.setNewVal.accepted_interest.confirmBy_interest = req.body.confirmBy_interest; //use req.body
						//sms and email to post owner
					   return postingService.updatePostingInterestAsync(req.body.posting_id,oUpdate);
					 }else{
						return interestShown;
			  }})
			  .then( function(truckPosting) {
				  var resp;
				   if(truckPosting.entityName == "POSTING" && !truckPosting.booking_id){
	 //create a booking entry and remove post and all interest from UI view
				    var oBooking = {};
					if(truckPosting.trucks && truckPosting.trucks[0]){
						oBooking.trucks =  truckPosting.trucks;
					 }else if(req.old_interest && req.old_interest.trucks && req.old_interest.trucks[0]){
						 oBooking.trucks =  req.old_interest.trucks;
					 }
				    if(truckPosting.drivers && truckPosting.drivers[0]){
				    	oBooking.drivers =  truckPosting.drivers;
					 }else if(req.old_interest && req.old_interest && req.old_interest.drivers && req.old_interest.drivers[0]){
				    	oBooking.drivers =  req.old_interest.drivers;
					 }
				    oBooking.post_type = truckPosting.type;
				    oBooking.posting_id = truckPosting._id;
				    oBooking.interest_id =  req.old_interest &&  req.old_interest._id ? req.old_interest._id : "";
				    oBooking.status = 'confirm';
				    oBooking.accept_price = truckPosting.accepted_interest.accept_price_posting || truckPosting.deal_price_posting;
				    oBooking.post_owner_id = truckPosting.userId;
				    oBooking.interest_owner_id = req.old_interest.userId;
				    oBooking.users = [truckPosting.userId,req.old_interest.userId];
				    oBooking.acceptedBy_posting =  truckPosting.acceptedBy_posting;
				    oBooking.acceptedBy_interest = req.old_interest.acceptedBy_interest;
				    if(truckPosting.truck_driver_details && truckPosting.truck_driver_details[0]){
					 oBooking.truck_driver_details =  truckPosting.truck_driver_details;
				     }else if(req.old_interest && req.old_interest.truck_driver_details && req.old_interest.truck_driver_details[0]){
					 oBooking.truck_driver_details =  req.old_interest.truck_driver_details;
				     }
		    		if(truckPosting.type=="load"){
		    			oBooking.weight = truckPosting.weight;
	    			    oBooking.weight_unit = truckPosting.weight_unit;
		    			oBooking.dropofLocation =  truckPosting.dropofLocation;
		    			oBooking.dropofTime =  truckPosting.dropofTime;
		    			oBooking.pickupLocation =  truckPosting.pickupLocation;
		    			oBooking.pickupTime =  truckPosting.pickupTime;
		    			oBooking.invoice = truckPosting.invoice_posting;
		    			oBooking.contact_person_payment_at_pickupLocation = truckPosting.contact_person_payment_at_pickupLocation;
		    			oBooking.contact_person_payment_at_dropofLocation = truckPosting.contact_person_payment_at_dropofLocation;
		         	}else{
		         		oBooking.weight = req.old_interest.weight;
	    			    oBooking.weight_unit = req.old_interest.weight_unit;
		    			oBooking.dropofLocation =  req.old_interest.dropofLocation;
		    			oBooking.dropofTime =  req.old_interest.dropofTime;
		    			oBooking.pickupLocation =  req.old_interest.pickupLocation;
		    			oBooking.pickupTime =  req.old_interest.pickupTime;
		    			oBooking.invoice = req.old_interest.invoice_interest;
		    			oBooking.contact_person_payment_at_pickupLocation = req.old_interest.contact_person_payment_at_pickupLocation;
		    			oBooking.contact_person_payment_at_dropofLocation = req.old_interest.contact_person_payment_at_dropofLocation;
		    	   	}
		    		if(truckPosting.truckType && truckPosting.truckType.truck_type){
		    			oBooking.truckType = truckPosting.truckType;
		    		}else{
		    			oBooking.truckType = req.old_interest.truckType;
		    		}
		    		if(truckPosting.materialTyp && truckPosting.materialTyp.material_type){
		    			oBooking.materialType = truckPosting.materialType;
		    		}else{
		    			oBooking.materialType = req.old_interest.materialType;
		    		}
		    		oBooking.source =  JSON.parse(JSON.stringify(truckPosting.source));
		    		oBooking.destination =  truckPosting.destination;
		    		oBooking.payment_posting = truckPosting.payment_posting;
		    		oBooking.payment_interest = req.old_interest.payment_interest;

		    		return bookingService.addBookingAsync(oBooking); //create booking as first person to confirm it
			   }else if(truckPosting.booking_id){
				   var updateBooking = {"setNewVal":{}};
				   if(truckPosting.trucks && truckPosting.trucks[0]){
					   updateBooking.setNewVal.trucks =  truckPosting.trucks;
					 }else if(req.old_interest && req.old_interest.trucks && req.old_interest.trucks[0]){
						 updateBooking.setNewVal.trucks =  req.old_interest.trucks;
					 }
				    if(truckPosting.drivers && truckPosting.drivers[0]){
				    	updateBooking.setNewVal.drivers =  truckPosting.drivers;
					 }else if(req.old_interest && req.old_interest && req.old_interest.drivers && req.old_interest.drivers[0]){
						 updateBooking.setNewVal.drivers =  req.old_interest.drivers;
					 }
					 if(truckPosting.truck_driver_details && truckPosting.truck_driver_details[0]){
					   updateBooking.setNewVal.truck_driver_details =  truckPosting.truck_driver_details;
				     }else if(req.old_interest && req.old_interest.truck_driver_details && req.old_interest.truck_driver_details[0]){
					   updateBooking.setNewVal.truck_driver_details =  req.old_interest.truck_driver_details;
				      }
					  if(truckPosting.type=="load"){
					  		updateBooking.setNewVal.weight = truckPosting.weight;
	    			        updateBooking.setNewVal.weight_unit = truckPosting.weight_unit;
							updateBooking.setNewVal.dropofLocation =  truckPosting.dropofLocation;
							updateBooking.setNewVal.dropofTime =  truckPosting.dropofTime;
							updateBooking.setNewVal.pickupLocation =  truckPosting.pickupLocation;
							updateBooking.setNewVal.pickupTime =  truckPosting.pickupTime;
							updateBooking.setNewVal.invoice = truckPosting.invoice_posting;
							updateBooking.setNewVal.contact_person_payment_at_pickupLocation = truckPosting.contact_person_payment_at_pickupLocation;
							updateBooking.setNewVal.contact_person_payment_at_dropofLocation = truckPosting.contact_person_payment_at_dropofLocation;
			    		}else{
			    			updateBooking.setNewVal.weight = req.old_interest.weight;
	    			        updateBooking.setNewVal.weight_unit = req.old_interest.weight_unit;
			    			updateBooking.setNewVal.dropofLocation =  req.old_interest.dropofLocation;
			    			updateBooking.setNewVal.dropofTime =  req.old_interest.dropofTime;
			    			updateBooking.setNewVal.pickupLocation =  req.old_interest.pickupLocation;
			    			updateBooking.setNewVal.pickupTime =  req.old_interest.pickupTime;
			    			updateBooking.setNewVal.invoice = req.old_interest.invoice_interest;
			    			updateBooking.setNewVal.contact_person_payment_at_pickupLocation = req.old_interest.contact_person_payment_at_pickupLocation;
			    			updateBooking.setNewVal.contact_person_payment_at_dropofLocation = req.old_interest.contact_person_payment_at_dropofLocation;
			    		}
						return bookingService.updateBookingAsync(truckPosting.booking_id,updateBooking);
				   }else{
				   return truckPosting;
			   }
			   }).then(function(interestShown){

				   if(interestShown && interestShown.entityName == "BOOKING"){
					   //save booking id on posting the entity.
					   req.booking_id = interestShown._id;
					   var oUpdate = {"setNewVal":{"booking_id":interestShown._id,"bookingId":interestShown.bookingId}};
					   return postingService.updatePostingInterestAsync(req.body.posting_id,oUpdate);
				   }else if(interestShown && interestShown.entityName == "POSTING"){
					   return interestShown;
				   }else{
					   return interestShown;
				   }
			   }).then(function(interestShown){
				   console.log(interestShown.entityName);
				   if(interestShown && interestShown.entityName == "POSTING" && interestShown.booking_id == req.booking_id){
					   //save booking id on both the entity.
					   var oUpdate = {"setNewVal":{"booking_id":interestShown._id,"bookingId":interestShown.bookingId}};
					   return interestShownService.updateInterestShownAsync(req.body.interest_id,oUpdate);
				   }else if(interestShown && interestShown.entityName == "POSTING"){
					   return interestShown;
				   }else{
					   return interestShown;
				   }
			   }).then(function(interestShown){
				   var accept_price;
				   if(interestShown && interestShown.entityName == 'INTEREST'){
					   accept_price = interestShown.accept_price || interestShown.deal_price_interest;
					   resp = {"status": "OK","bookingId":interestShown.bookingId, "message":"Your booking is confirmed for Rs. "+ accept_price};

					}else if(interestShown && interestShown.entityName == "POSTING"){
					   accept_price = interestShown.accepted_interest.accept_price_posting;
					   resp = {"status": "OK","bookingId":interestShown.bookingId, "message":"Your booking is confirmed for Rs. "+ accept_price};
					}else{
						interestShown.status = "ERROR";
					    resp = interestShown;
					}
					  if(resp.status == "OK"){
						// send sms and email to post owner
					    	 var susr = user.owner_name?user.owner_name:"";
							 var message = 'Hi '+ susr + ' your booking with booking id '+interestShown.bookingId+ 'is confirmed for Rs '+ accept_price +' at at www.futuretrucks.in Download our android application from  https://goo.gl/khpPCW';
							 if(req.contacts.interest_mobile){smsUtil.sendSMS(req.contacts.interest_mobile,message);}
								 if(req.contacts.post_email){
								   var mailOptions = {
										    to: user.owner_name+ ' ✔ <'+user.email+'>',
										    subject: 'Booking confirmation for '+interestShown.bookingId+'.✔ ',
										    text: 'Welcome from Future Trucks✔',
										    html: '<br>'  +message+ '<br>'
										};
									emailUtil.sendMail(mailOptions);
								   }
								 //sms and email to interest owner
								  var interest_message =susr  +' has confirmed booking with booking id '+interestShown.bookingId+ ' for Rs '+ accept_price +' at at www.futuretrucks.in Download our android application from  https://goo.gl/khpPCW';
								  if( req.contacts.post_mobile){smsUtil.sendSMS( req.contacts.post_mobile,interest_message);}
								  if(req.contacts.interest_email){
									   var mailOptions = {
											    to: ' post owner ✔ <'+req.contacts.interest_email+'>',
											    subject: 'Booking confirmed by post owner with booking id '+interestShown.bookingId +' .✔ ',
											    text: 'Welcome from Future Trucks✔',
											    html: '<br>'  +interest_message+ '<br>'
											};
										emailUtil.sendMail(mailOptions);
										console.log('email send to post owner',interest_message);
									   }
					  }
					   winston.info(resp);
					   return res.status(200).json(resp);
			    }).catch(next);
			}else{
				 return res.status(500).json({"status": "ERROR","message":"Un-Authorised User."});
			}

		  })(req, res, next);
		});
router.post('/getProductInfo_interest',
	 function(req, res, next) {
	     winston.info('getProductInfo_interest_payload',req.body); //TODO verify payload first{postingId,interest_id,payment_options for load owner,accept price etc.}
		  passport.authenticate('jwt',
		  function(error, user, info) {
			 if (error){
			   return next(error);
		   }
			if(user){
			    var oParams = {"postingId":req.body.postingId};// use payload
			    req.contacts = {};
			    postingService.getPostingsByIdAsync(oParams)//verify truck post
				 .then(function(truckPosting){
				 if (truckPosting[0] === false) return {"verified": false, "message": "No such truck post exists"};
				 else if(truckPosting[0].userId && truckPosting[0].userId.toString() == user._id) {
						return {"verified" : false, "message": "User is same as truck post owner"};
						}
					 else if(truckPosting[0].interested_to.indexOf(req.body.interest_id) < 0) {
							return {"verified" : false, "message": "Interest Id does not exist for this post."};
						}
					 else if(truckPosting[0].accepted_interest.interest_id != req.body.interest_id){
							return {"verified" : false, "message": "Interest Id does not match with the actual interest accepted by person."};
						}
				 else if(truckPosting[0].verified !='pending'){
					 	 req.body.posting_id = truckPosting[0]._id;
		    			 req.contacts.post_mobile = truckPosting[0].mobile;
		    			 req.contacts.post_email = truckPosting[0].email;
		    			 req.old_posting = truckPosting[0];
		    			 req.user = user;
						 return truckPosting[0];
					 }else {
						 return {"verified" : false, "message": "posting is not verified by Future Trucks"};
					 }
		      }).then(function(truckPost){//verify interest deal price for acceptance
					if(truckPost.verified){
						    var oParams = {"_id":req.body.interest_id};// use payload
						    return interestShownService.getInterestShownsByParamsAsync(oParams)//verify truck interest
							 .then(function(interestShown){
							   if (!interestShown[0]){
							   	  return {"verified": false, "message": "No such interest post exists"};
							    }
						       else if(interestShown[0].userId && interestShown[0].userId.toString() != user._id) {
									return {"verified" : false, "message": "User is not same as interest  owner"};
									}
								 else if(interestShown[0].postingId != req.body.postingId) {
										return {"verified" : false, "message": "Posting Id does not exist for this Interest."};
								 }
								 else if(!interestShown[0].acceptedBy_interest){//already accepted by interest owner0
										return {"verified" : false, "message": "Interest owner still has not  accepted current deal price for this post."};
							     }
								else {
								 	 return interestShown[0];
								 }
					      })
				}else{
						   return truckPost;
			         }
			}).then(function(interestShown){
					if(interestShown && interestShown.interestId){
						req.old_interest = interestShown;
						req.contacts.interest_mobile = interestShown.mobile;
		    			req.contacts.interest_email = interestShown.email;
						var status = "active";
						if(interestShown.acceptedBy_interest){
							status = "booked";
						}
						 var oUpdate = {"setNewVal":{"confirmBy_interest":req.body.confirmBy_interest,"latModified": new Date()}};
						if(req.old_posting.type == 'truck'){
							//generate invoice
							oUpdate.setNewVal.payment_interest = req.old_interest.payment_interest || {};
			    			oUpdate.setNewVal.payment_interest.code = req.body.payment_code;
			    			oUpdate.setNewVal.payment_interest.mode = req.body.payment_mode;
			    			     var total_new_cost,p_code,per_truck_cost_inc = 0;
				    			 if(oUpdate.setNewVal.payment_interest.options){
				    				for(l=0;l<oUpdate.setNewVal.payment_interest.options.length;l++){
				    					if(oUpdate.setNewVal.payment_interest.options[l].code==req.body.payment_code){
				    						total_new_cost = oUpdate.setNewVal.payment_interest.options[l].cost;
				    						per_truck_cost_inc = l*100;
				    						p_code = req.body.payment_code;
				    					}
				    				}
				    			 }
				    			 console.log(total_new_cost,p_code,per_truck_cost_inc);
				    			 var percent = getPercentage(total_new_cost,p_code);
				    			 oUpdate.setNewVal.contact_person_payment_at_dropofLocation = req.old_interest.contact_person_payment_at_dropofLocation;
					    		 oUpdate.setNewVal.contact_person_payment_at_pickupLocation = req.old_interest.contact_person_payment_at_pickupLocation;

					    		 oUpdate.setNewVal.contact_person_payment_at_dropofLocation.amount = percent.dropof.amount;
					    		 oUpdate.setNewVal.contact_person_payment_at_dropofLocation.percent = percent.dropof.percent;
					    	     oUpdate.setNewVal.contact_person_payment_at_pickupLocation.amount = percent.pickup.amount;
							     oUpdate.setNewVal.contact_person_payment_at_pickupLocation.percent = percent.pickup.percent;
							 	if(req.body.contact_person_payment_at_dropofLocation){
									oUpdate.setNewVal.contact_person_payment_at_dropofLocation.name = req.body.contact_person_payment_at_dropofLocation.name;
									oUpdate.setNewVal.contact_person_payment_at_dropofLocation.number = req.body.contact_person_payment_at_dropofLocation.number;
								}if(req.body.contact_person_payment_at_pickupLocation){
									oUpdate.setNewVal.contact_person_payment_at_pickupLocation.name = req.body.contact_person_payment_at_pickupLocation.name;
									oUpdate.setNewVal.contact_person_payment_at_pickupLocation.number = req.body.contact_person_payment_at_pickupLocation.number;
								}
				    			 var payment_interest = {};
				    			 if(req.old_interest.payment_interest){
				    				 payment_interest = JSON.parse(JSON.stringify(req.old_interest.payment_interest));
				    			 }
				    			 payment_interest.invoice_posting_no = "000000025";//TODO generate invoice_posting no
				    			 payment_interest.total_amount_payable = 0;
				    			 payment_interest.grand_total_amount = 0;
						         var aItems = [];

						      //   for(var i=0;i<req.old_posting.trucks_info.length;i++){
						    		 var oTruck = req.old_interest.truckType || req.old_posting.truckType;
						    		 var oItem = {};
						    		 console.log(oTruck);
						    		 oItem.name = oTruck.truck_type ?oTruck.truck_type : "RegisteredVehicle" ;
						    		 oItem.quantity = req.old_posting.no_of_trucks || req.old_interest.no_of_trucks || 1;
						    		 console.log(req.old_posting.no_of_trucks, req.old_interest.no_of_trucks,1)
						    		 oTruck.price_per_truck = total_new_cost/oItem.quantity;
						    		 oItem.cost =  oItem.quantity * oTruck.price_per_truck;
						    		 console.log(oItem.cost,oTruck.price_per_truck);
						    		 payment_interest.total_amount_payable =  payment_interest.total_amount_payable + oItem.cost;
						    		 oTruck.price_per_truck = oTruck.price_per_truck*102/100;//2% TDS added;
						    		 oItem.cost= oItem.cost*102/100;
						    		 oItem.price = oItem.quantity + " * " + oTruck.price_per_truck;
						    		 payment_interest.grand_total_amount =  payment_interest.grand_total_amount + oItem.cost;
						     		 aItems.push(oItem);
						 //   	 }
						     		payment_interest.items = aItems;
						    	 oUpdate.setNewVal.invoice_interest = payment_interest;
						}else{
							if(req.body.trucks){
								oUpdate.setNewVal.trucks = req.body.trucks;
							}
							if(req.body.drivers){
								oUpdate.setNewVal.drivers = req.body.drivers;
							}
						}
						console.log('uuuuuuuuuuuuuuuuuuuuuu',oUpdate);
						 return interestShownService.updateInterestShownAsync(req.body.interest_id,oUpdate)
					 }else{
						return interestShown;
			  }})
			  .then(function(interestShown){
				 	if(interestShown && interestShown.acceptedBy_interest && interestShown.acceptedBy_posting){
						// send sms and email to interest owner

				 		req.old_interest = interestShown;
				 		console.log("updating posting");
						req.body.interest_owner_id = interestShown.userId;
						 var oUpdate = {"setNewVal":{"latModified": new Date()}};
						 oUpdate.setNewVal.accepted_interest = req.old_posting.accepted_interest;
						 oUpdate.setNewVal.accepted_interest.confirmBy_interest = req.body.confirmBy_interest; //use req.body
						//sms and email to post owner
					   return postingService.updatePostingInterestAsync(req.body.posting_id,oUpdate);
					 }else{
						return interestShown;
			  }})
			  .then( function(truckPosting) {
				  var resp;
				   if(truckPosting.entityName == "POSTING" && !truckPosting.booking_id){
	 //create a booking entry and remove post and all interest from UI view
				    var oBooking = {};
					if(truckPosting.trucks && truckPosting.trucks[0]){
						oBooking.trucks =  truckPosting.trucks;
					 }else if(req.old_interest && req.old_interest.trucks && req.old_interest.trucks[0]){
						 oBooking.trucks =  req.old_interest.trucks;
					 }
				    if(truckPosting.drivers && truckPosting.drivers[0]){
				    	oBooking.drivers =  truckPosting.drivers;
					 }else if(req.old_interest && req.old_interest && req.old_interest.drivers && req.old_interest.drivers[0]){
				    	oBooking.drivers =  req.old_interest.drivers;
					 }
				    oBooking.post_type = truckPosting.type;
				    oBooking.posting_id = truckPosting._id;
				    oBooking.interest_id =  req.old_interest &&  req.old_interest._id ? req.old_interest._id : "";
				    oBooking.status = 'failed_online_payment';
				    oBooking.accept_price = truckPosting.accepted_interest.accept_price_posting || truckPosting.deal_price_posting;
				    oBooking.post_owner_id = truckPosting.userId;
				    oBooking.interest_owner_id = req.old_interest.userId;
				    oBooking.users = [truckPosting.userId,req.old_interest.userId];
				    oBooking.acceptedBy_posting =  truckPosting.acceptedBy_posting;
				    oBooking.acceptedBy_interest = req.old_interest.acceptedBy_interest;
		    		if(truckPosting.type=="load"){
		    			oBooking.dropofLocation =  truckPosting.dropofLocation;
		    			oBooking.dropofTime =  truckPosting.dropofTime;
		    			oBooking.pickupLocation =  truckPosting.pickupLocation;
		    			oBooking.pickupTime =  truckPosting.pickupTime;
		    			oBooking.invoice = truckPosting.invoice_posting;
		    			oBooking.contact_person_payment_at_pickupLocation = truckPosting.contact_person_payment_at_pickupLocation;
		    			oBooking.contact_person_payment_at_dropofLocation = truckPosting.contact_person_payment_at_dropofLocation;
		         	}else{
		    			oBooking.dropofLocation =  req.old_interest.dropofLocation;
		    			oBooking.dropofTime =  req.old_interest.dropofTime;
		    			oBooking.pickupLocation =  req.old_interest.pickupLocation;
		    			oBooking.pickupTime =  req.old_interest.pickupTime;
		    			oBooking.invoice = req.old_interest.invoice_interest;
		    			oBooking.contact_person_payment_at_pickupLocation = req.old_interest.contact_person_payment_at_pickupLocation;
		    			oBooking.contact_person_payment_at_dropofLocation = req.old_interest.contact_person_payment_at_dropofLocation;
		    	   	}
		    		if(truckPosting.truckType && truckPosting.truckType.truck_type){
		    			oBooking.truckType = truckPosting.truckType;
		    		}else{
		    			oBooking.truckType = req.old_interest.truckType;
		    		}
		    		if(truckPosting.materialTyp && truckPosting.materialTyp.material_type){
		    			oBooking.materialType = truckPosting.materialType;
		    		}else{
		    			oBooking.materialType = req.old_interest.materialType;
		    		}
		    		oBooking.source =  JSON.parse(JSON.stringify(truckPosting.source));
		    		oBooking.destination =  truckPosting.destination;
		    		oBooking.payment_posting = truckPosting.payment_posting;
		    		oBooking.payment_interest = req.old_interest.payment_interest;

		    		return bookingService.addBookingAsync(oBooking); //create booking as first person to confirm it
			   }else if(truckPosting.booking_id){
				   var updateBooking = {"setNewVal":{}};
				   updateBooking.setNewVal.status = "failed_online_payment";
				   if(truckPosting.trucks && truckPosting.trucks[0]){
					   updateBooking.setNewVal.trucks =  truckPosting.trucks;
					 }else if(req.old_interest && req.old_interest.trucks && req.old_interest.trucks[0]){
						 updateBooking.setNewVal.trucks =  req.old_interest.trucks;
					 }
				    if(truckPosting.drivers && truckPosting.drivers[0]){
				    	updateBooking.setNewVal.drivers =  truckPosting.drivers;
					 }else if(req.old_interest && req.old_interest && req.old_interest.drivers && req.old_interest.drivers[0]){
						 updateBooking.setNewVal.drivers =  req.old_interest.drivers;
					 }
					  if(truckPosting.type=="load"){
							updateBooking.setNewVal.dropofLocation =  truckPosting.dropofLocation;
							updateBooking.setNewVal.dropofTime =  truckPosting.dropofTime;
							updateBooking.setNewVal.pickupLocation =  truckPosting.pickupLocation;
							updateBooking.setNewVal.pickupTime =  truckPosting.pickupTime;
							updateBooking.setNewVal.invoice = truckPosting.invoice_posting;
							updateBooking.setNewVal.contact_person_payment_at_pickupLocation = truckPosting.contact_person_payment_at_pickupLocation;
							updateBooking.setNewVal.contact_person_payment_at_dropofLocation = truckPosting.contact_person_payment_at_dropofLocation;
			    		}else{
			    			updateBooking.setNewVal.dropofLocation =  req.old_interest.dropofLocation;
			    			updateBooking.setNewVal.dropofTime =  req.old_interest.dropofTime;
			    			updateBooking.setNewVal.pickupLocation =  req.old_interest.pickupLocation;
			    			updateBooking.setNewVal.pickupTime =  req.old_interest.pickupTime;
			    			updateBooking.setNewVal.invoice = req.old_interest.invoice_interest;
			    			updateBooking.setNewVal.contact_person_payment_at_pickupLocation = req.old_interest.contact_person_payment_at_pickupLocation;
			    			updateBooking.setNewVal.contact_person_payment_at_dropofLocation = req.old_interest.contact_person_payment_at_dropofLocation;
			    		}
						return bookingService.updateBookingAsync(truckPosting.booking_id,updateBooking);
				   }else{
				   return truckPosting;
			   }
			   }).then(function(interestShown){

				   if(interestShown && interestShown.entityName == "BOOKING"){
					   //save booking id on posting the entity.
					   req.booking_id = interestShown._id;
					   req.booking = interestShown;
					   var oUpdate = {"setNewVal":{"booking_id":interestShown._id,"bookingId":interestShown.bookingId}};
					   return postingService.updatePostingInterestAsync(req.body.posting_id,oUpdate);
				   }else if(interestShown && interestShown.entityName == "POSTING"){
					   return interestShown;
				   }else{
					   return interestShown;
				   }
			   }).then(function(interestShown){
				   console.log(interestShown.entityName);
				   if(interestShown && interestShown.entityName == "POSTING" && interestShown.booking_id == req.booking_id){
					   //save booking id on both the entity.
					   var oUpdate = {"setNewVal":{"booking_id":interestShown._id,"bookingId":interestShown.bookingId}};
					   return interestShownService.updateInterestShownAsync(req.body.interest_id,oUpdate);
				   }else if(interestShown && interestShown.entityName == "POSTING"){
					   return interestShown;
				   }else{
					   return interestShown;
				   }
			   }).then(function(interestShown){
		   	if(interestShown.entityName=="INTEREST"){
		   	   var oPayment = {};
		   	   oPayment.paymentId = req.booking.bookingId + new Date().getTime();
		   	   req.booking.paymentId = oPayment.paymentId;
		   	   oPayment.oPUM = prepareObject(req);
		   	   oPayment.amount = req.body.amount || oPayment.oPUM.amount;
               oPayment.bookingId = req.booking.bookingId;
               oPayment.bookingDate = req.booking.bookingDate;
               oPayment.post_type = req.booking.post_type;
               oPayment.interest_id = req.booking.interest_id;
               oPayment.posting_id = req.booking.posting_id;
               oPayment.status = "initiated";
               oPayment.post_owner_id = req.booking.post_owner_id;
               oPayment.interest_owner_id = req.booking.interest_owner_id;
               oPayment.done_by = "interest_owner";
               oPayment.code = req.body.payment_code;
               oPayment.mode = req.body.payment_mode;
               oPayment.PAYU_BASE_URL =  commonUtil. getConfig('pburl');
               if(req.booking.contact_person_payment_at_pickupLocation){
               	 oPayment.percent = req.booking.contact_person_payment_at_pickupLocation.percent;
                }
                return paymentService.addPaymentAsync(oPayment);
		     	}else{
		     	  return interestShown;
		     	}

			   }).then(function(payment){
		   	if(payment.entityName=="PAYMENT"){
			   return res.status(200).json({"status": "OK","message":"payUMoney hash",oPayUMoney : payment});

		   	}}).catch(next);
			}else{
				 return res.status(500).json({"status": "ERROR","message":"Un-Authorised User."});
			}

		  })(req, res, next);
     });
module.exports = router;
