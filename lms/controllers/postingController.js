var express = require('express');
var passport = require('passport');
var router = require('express').Router();
var Promise = require('bluebird');
var winston = require('winston');
var postingService = Promise.promisifyAll(commonUtil.getService('posting'));
var truckService = Promise.promisifyAll(commonUtil.getService('truck'));
var interestShownService = Promise.promisifyAll(commonUtil.getService('interestShown'));
var bookingService = Promise.promisifyAll(commonUtil.getService('booking'));
var paymentService = Promise.promisifyAll(commonUtil.getService('payment'));
var notificationService = Promise.promisifyAll(commonUtil.getService('notification'));
var searchService = Promise.promisifyAll(commonUtil.getService('search'));
var oPaymentOptions = [{code:'ADV',desc:'100% Advance'},{code:'8A2D',desc:'80% Advance 20% on delivery'},{code:'7A3D',desc:'70% Advance 30% on delivery'},{code:'5A5D',desc:'50% Advance 50% on delivery'},{code:'DEL',desc:'100% on delivery'}];
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
	oUpdate = {"setNewVal" :{"latModified": new Date()}};
	for(i in oQuery){
    	if(isAllowedFields(i)){
    		oUpdate.setNewVal.payment_posting = req.old_posting.payment_posting;
    		 if(i=='payment_code' && req.old_posting.type =='load'){
    			 oUpdate.setNewVal.payment_posting.code = oQuery[i];
    			 var total_new_cost,p_code,per_truck_cost_inc = 0;
    			 if(oUpdate.setNewVal.payment_posting.options){
    				for(l=0;l<oUpdate.setNewVal.payment_posting.options.length;l++){
    					if(oUpdate.setNewVal.payment_posting.options[l].code==oQuery[i]){
    						total_new_cost = oUpdate.setNewVal.payment_posting.options[l].cost;
    						per_truck_cost_inc = l*100;
    						p_code = oQuery[i];
    					}
    				}
    			 }
    			 console.log(total_new_cost,p_code,per_truck_cost_inc);
    			 var invoice_posting = {};
    			 if(req.old_posting.invoice_posting){
    				 invoice_posting = JSON.parse(JSON.stringify(req.old_posting.invoice_posting));
    			 }
    		     invoice_posting.invoice_posting_no = "000000025";//TODO generate invoice_posting no
		    	 invoice_posting.total_amount_payable = 0;
		    	 invoice_posting.grand_total_amount = 0;
		         var aItems = [];

		      //   for(var i=0;i<req.old_posting.trucks_info.length;i++){
		    		 var oTruck = req.old_posting.truckType;
		    		 var oItem = {};
		    		 console.log(oTruck);
		    		 oItem.name = oTruck.truck_type ?oTruck.truck_type : "RegisteredVehicle" ;
		    		 oItem.quantity = req.old_posting.no_of_trucks;
		    		 oTruck.price_per_truck = total_new_cost/req.old_posting.no_of_trucks;
		    		 oItem.cost = req.old_posting.no_of_trucks * oTruck.price_per_truck;
		    		 invoice_posting.total_amount_payable =  invoice_posting.total_amount_payable + oItem.cost;
		    		 oTruck.price_per_truck = oTruck.price_per_truck*102/100;//2% TDS added;
		    		 oItem.cost= oItem.cost*102/100;
		    		 oItem.price = req.old_posting.no_of_trucks + " * " + oTruck.price_per_truck;
		    		 invoice_posting.grand_total_amount =  invoice_posting.grand_total_amount + oItem.cost;
		     		 aItems.push(oItem);
		 //   	 }
		    	 invoice_posting.items = aItems;
		    	 oUpdate.setNewVal.invoice_posting = invoice_posting;
		   	}else if(i=='payment_mode' && req.old_posting.type =='load'){
   			 oUpdate.setNewVal.payment_posting.mode = oQuery[i];
		   	}else{
		   		oUpdate.setNewVal[i] = oQuery[i];
		   	}

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
    oPUM.firstname = req.old_posting.post_owner_name || req.user.owner_name;
	oPUM.email = req.old_posting.email || "kamal@futuretrucks.in";
	oPUM.udf1 = req.booking.bookingId;
	oPUM.udf2 = req.old_interest._id;
	oPUM.udf3 = req.booking.bookingDate;
	oPUM.udf4 = req.booking.truckType && req.booking.truckType.truck_type ? req.booking.truckType.truck_type : req.booking.post_type;
    oPUM.udf5 = req.booking.post_type+"_post_owner";
    oPUM.udf6 = "http://futuretrucks.in/main.html#!/myBookings/myBookings-basic/"+req.booking.bookingId;
    oPUM.phone = req.old_posting.mobile || "9535888738";
    sha512Util.generateShaKey(oPUM);
    return oPUM;
 };
function prepareNotification(posting,user){
	if(user.devices && user.devices.length>0){
		var registrationTokens = [];
		for(var i=0; i<user.devices.length;i++){
			registrationTokens.push(user.devices[i].token);
		}
	}
	var entityType = posting.type;
	if(posting.offer == 1){
		entityType = posting.type+"offer";
	}
    var oNotification = {
    	 "userId":user._id,
	     "users":[user._id], //need to find all relevent users here
	     "data": {
	       "entityId" : posting.postingId,
           "entityType": entityType +"posting",
           "message": posting.messageBody,
           },
	 "notification": {
		 "title": "You posted new "+ posting.type +".",
		 "icon": "ic_launcher",
		 "body": posting.messageBody
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
function prepareNotificationForBroadCast(posting,sQuery){
	var user_type = ['broker','truck_owner','aggregator', 'transporter'];
	 var qStr = {noLimit:true,query :{search:sQuery,'unique':true,type:{'$in':user_type}}};
	 searchService.getAllUsersByTextAsync(qStr)
	     .then(function(users) {
	  	 if(users && users.length>0){
	 	 var registrationTokens = [],aUserIds = [],aUserMobiles = [], aUserEmails = [];
	 	 for(var j=0;j<users.length;j++){
	 		 aUserMobiles.push(users[j].mobile);
	 		 if(users[j].email && users[j].email != posting.email){
	 		 	 aUserEmails.push(users[j].email);
	 		     }
	 	 	 if(users[j]._id && posting.userId != users[j]._id){
	 	 	     aUserIds.push(users[j]._id);
	 	 	     }
	 	 	 var user = users[j];
	 	 	 if(user.devices && user.devices.length>0){
		        for(var i=0; i<user.devices.length;i++){
		          if(users[j]._id && posting.userId != users[j]._id){
		    	   registrationTokens.push(user.devices[i].token);
		    	   }
		          }
	            }
	 	  }
	 	 }
	 	 var entityType = posting.type;
	     if(posting.offer == 1){
		 entityType = posting.type+"offer";
	     }
         var oNotification = {
         "userId":posting.userId,
	     "users":aUserIds, //need to find all relevent users here
	     "data": {
	       "entityId" : posting.postingId,
           "entityType": entityType +"available"
           },
	     "notification": {
		  "title":  "Someone posted new "+ posting.type + ".",
		  "icon": "ic_launcher",
		  "body": posting.messageBody
    	 },
	     "priority":"normal",
	     "registrationTokens" : registrationTokens,
	     "mobiles" : aUserMobiles,
	     "email":aUserEmails
         };
         notificationService.addNotificationAsync(oNotification)
			 .then(function(notification) {
			     if(notification && notification.entityName == "NOTIFICATION"){
			    		var resp = {"status": "OK","message":"Your notification saved successfully.","notification":notification};
			    		   if(commonUtil.getConfig('promotionalGCM') == true && notification && notification.registrationTokens && notification.registrationTokens.length>0){
			    			  gcmNotification.sendGCMNotification(notification);
			    			 }
                           if(commonUtil.getConfig('promotionalSMS') == true && notification.mobiles && notification.mobiles.length>0){
                           	console.log('number of SMS to be sent ',notification.mobiles.length);
                           	/*if(notification.mobiles.length>20){
                           		notification.mobiles = notification.mobiles.slice(0,19);
                           	}*/
                           	 notification.notification.body =  notification.notification.body +  " Install our android app to get more loads  https://goo.gl/khpPCW or call http://futuretrucks.in at +919891705019";
			    				smsUtil.sendSMS(notification.mobiles,notification.notification.body);
			    			 }
			    		   if(commonUtil.getConfig('promotionalEmail') == true && notification.email){
						       var mailOptions = {
								   to: notification.email,
								   subject: notification.notification.title +'.✔',
								   text: 'Welcome from Future Trucks✔',
								   html: '<br>'  +notification.notification.body+ '<br>'
								 };
							      emailUtil.sendMail(mailOptions);
			    			 }
	                 }else{
					   	console.log(notification);
			         }
		 }).catch(function(err){
				console.log('error while saving notification',err);
		 });
	     }).catch(function(err){
				console.log('error while searching users',err);
	     });
 };
function prepareNotificationForBroadCastToUnRegUsers(posting,sQuery){
	var user_type = ['broker','truck_owner','aggregator', 'transporter'];
	 var qStr = {noLimit:true,query :{search:sQuery,'unique':true,type:{'$in':user_type}}};
	 searchService.getAllUnRegUsersByTextAsync(qStr)
	     .then(function(users) {
	  	 if(users && users.length>0){
	 	 var registrationTokens = [],aUserIds = [],aUserMobiles = [], aUserEmails = [];
	 	 for(var j=0;j<users.length;j++){
	 	 	if(users[j].mobile && users[j].mobile[0]){
	 	 		aUserMobiles.push(users[j].mobile[0]);
	 	 	}
	 		if(users[j].email && users[j].email != posting.email){
	 		 	 aUserEmails.push(users[j].email);
	 		     }
	 	 	 if(users[j]._id && posting.userId != users[j]._id){
	 	 	     aUserIds.push(users[j]._id);
	 	 	     }
	 	    }
	 	 }
	 	 var entityType = posting.type;
	     if(posting.offer == 1){
		 entityType = posting.type+"offer";
	     }
         var oNotification = {
         "userId":posting.userId,
	     "users":aUserIds, //need to find all relevent users here
	     "data": {
	       "entityId" : posting.postingId,
           "entityType": entityType +"available"
           },
	     "notification": {
		  "title":  "Someone posted new "+ posting.type + ".",
		  "icon": "ic_launcher",
		  "body": posting.messageBody
    	 },
	     "priority":"normal",
	     "registrationTokens" : registrationTokens,
	     "mobiles" : aUserMobiles,
	     "email":aUserEmails
         }
         notificationService.addNotificationAsync(oNotification)
			 .then(function(notification) {
			     if(notification && notification.entityName == "NOTIFICATION"){
			    	var resp = {"status": "OK","message":"Your notification saved successfully.","notification":notification};
			    	if(commonUtil.getConfig('promotionalSMStoUnRegUsers') == true && notification.mobiles && notification.mobiles.length>0){
                     	console.log('number of SMS to be sent ',notification.mobiles.length);
                      	/*if(notification.mobiles.length>50){
                       		notification.mobiles = notification.mobiles.slice(0,49);
                       	}*/
                       	notification.notification.body =  notification.notification.body +  " Install our android app to get more loads  https://goo.gl/khpPCW or call http://futuretrucks.in at +919891705019";
			    		smsUtil.sendSMS(notification.mobiles,notification.notification.body);
			    	 }
			    	if(commonUtil.getConfig('promotionalEmail') == true && notification.email){
					     var mailOptions = {
						   to: notification.email,
						   subject: notification.notification.title +'.✔',
						   text: 'Welcome from Future Trucks✔',
						   html: '<br>'  +notification.notification.body+ '<br>'
						 };
					     emailUtil.sendMail(mailOptions);
			    	 }
	                 }else{
					   	console.log(notification);
			         }
		 }).catch(function(err){
				console.log('error while saving notification',err);
		 });
	     }).catch(function(err){
				console.log('error while searching users',err);
	     });
 };
router.get('/:app_key', function (req, res) {
	if(req.params['app_key'] ==commonUtil.getConfig('app_public_api')){
	postingService.getAllPostingsAsync(req)
	.then(
		function(trucks) {
			remoteClientUtil.getRemoteIpAddress(req,"get postigs publicly");
			winston.info('in routes succes');
			res.status(200).json({'status': 'OK','data':trucks.data,'no_of_pages':trucks.no_of_pages});
		},
		function(err) {
			winston.error("Error in truck retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		});
	}else{
		res.status(500).json({'status': 'ERROR', 'error_messages': "application secure key is not correct"});
	}});
router.get('/', function (req, res, next) {
	 passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error);
	    }
	 if(user){
	 if(req.query && req.query.otherCustomers){
		req.query.otherCustomers = user._id;
	 }else if(req.query){
		req.query.userId = user._id;
	 }else{
		req.query = {};
		req.query.userId = user._id;
 	 }
	 req.userPosting = true;
	 req.loggedInUserId = user._id;
	 postingService.getAllPostingsAsync(req)
	 .then(
		function(trucks) {
			res.status(200).json({'status': 'OK','data':trucks.data,'no_of_pages':trucks.no_of_pages});
		},
		function(err) {
			winston.error("Error in truck retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		}).catch(next);
	 }else{
		 res.status(200).json({'status': 'OK','message':'Un-Authorised User.'});
	 }
	 })(req, res, next);
     });
router.post('/',
	 function(req, res, next) {
	 console.log('request payload for posting',JSON.stringify(req.body));
	     passport.authenticate('jwt',
		  function(error, user, info) {
			 if (error){
			   return next(error);
		   }
            var oModifiedCitySource,oModifiedCityDestination;
			 if(req.body.source && req.body.source.address_components){
			   	 oModifiedCitySource = googlePlaceUtil.getFormattedCity(req.body.source.address_components);
			   }
			 if(!req.body.source.c && oModifiedCitySource){
			   	req.body.source.c = oModifiedCitySource.c;
			   }
			 if(!req.body.source.d && oModifiedCitySource){
				   	req.body.source.d = oModifiedCitySource.d;
			   }
			 if(!req.body.source.s && oModifiedCitySource){
				   	req.body.source.s = oModifiedCitySource.s;
			  }
			 if(!req.body.source.p && oModifiedCitySource){
				   	req.body.source.p = oModifiedCitySource.p;
			   }
			 if(req.body.destination && req.body.destination && req.body.destination[0].address_components){
				 oModifiedCityDestination = googlePlaceUtil.getFormattedCity(req.body.destination[0].address_components);
			   }
			 if(!req.body.destination[0].c && oModifiedCityDestination){
			   	req.body.destination[0].c = oModifiedCityDestination.c;
			   }
			 if(!req.body.destination[0].d && oModifiedCityDestination){
				   	req.body.destination[0].d = oModifiedCityDestination.d;
			   }
			 if(!req.body.destination[0].s && oModifiedCityDestination){
				   	req.body.destination[0].s = oModifiedCityDestination.s;
			  }
			 if(!req.body.destination[0].p && oModifiedCityDestination){
				   	req.body.destination[0].p = oModifiedCityDestination.p;
			 }
			 req.body.userId = user._id;
			 req.body.email = user.email;
			 req.body.mobile = req.body.mobile || user.mobile;
			 req.body.post_owner_name = user.owner_name;
			 req.body.post_owner_company = user.company_name;
			 req.body.verified = 'active';

            if(req.body.type =='truck'){
				 var oTruck_Driver_details = {};
				 if(req.body.trucks && req.body.trucks[0]){
					  oTruck_Driver_details.truck = req.body.trucks[0];
					  oTruck_Driver_details.truck_id = req.body.trucks[0];
				 }
				 if(req.body.drivers && req.body.drivers[0]){
					  oTruck_Driver_details.driver = req.body.drivers[0];
					  oTruck_Driver_details.drver_id = req.body.drivers[0];
				 }
				if(req.body.truckType && req.body.trucks && req.body.trucks[0]){
					  oTruck_Driver_details.truckType = req.body.truckType;
				 }
				 if(oTruck_Driver_details.truck){
					req.body.truck_driver_details = [oTruck_Driver_details];
				 }
				req.body.is_lead = false;
            }

			 if(req.body.expected_price){
						 var total_numberof_trucks = 1;
						 if(req.body.no_of_trucks){
							 total_numberof_trucks = req.body.no_of_trucks;
						 }
						 if(req.body.type == 'load'){
						 var paymentOptions = JSON.parse(JSON.stringify(oPaymentOptions));
				    	 var minAmt = req.body.expected_price;
				    	 for(var j=0;j<paymentOptions.length;j++){
				    		 paymentOptions[j].cost = minAmt;
				    		 minAmt = minAmt+100*total_numberof_trucks;//two places where we are setting 100 ext cost per option
				    	 }
				    	req.body.payment_posting = {};
				    	req.body.payment_posting.options = paymentOptions;
				    	console.log(req.body,paymentOptions);
						 }
			 }

			 postingService.addPostingAsync(req.body)
			        .then(function(Posting) {
			        	var pMobile = Posting[0].mobile || user.mobile;
			                	var fromS,toS,from="",to="",expected_cost="",material="",trucktype="",shedule_date="";
			                	if(Posting[0].expected_price){
			                		expected_cost =' for Rs ' + Posting[0].expected_price;
			                	}
			                	if(Posting[0].source && Posting[0].source.c){
			                		from = Posting[0].source.c;
			                	}
			                	if(Posting[0].source && Posting[0].source.d){
			                		from = from + ' ' + Posting[0].source.d;
			                	}
			                	fromS = from;
			                	if(Posting[0].source && Posting[0].source.s){
			                		from = from + ' ' + Posting[0].source.s;
			                	}
			                	if(Posting[0].destination && Posting[0].destination[0] && Posting[0].destination[0].c){
			                		to = Posting[0].destination[0].c;
			                	}
			                	if(Posting[0].destination && Posting[0].destination[0] && Posting[0].destination[0].d){
			                		to = to  + ' ' + Posting[0].destination[0].d;
			                	}
			                	toS = to;
			                	if(Posting[0].destination && Posting[0].destination[0] && Posting[0].destination[0].s){
			                		to = to  + ' ' + Posting[0].destination[0].s;
			                	}
			                	if(Posting[0].materialType && Posting[0].materialType.material_type){
			                		 material =', material type '+ Posting[0].materialType.material_type;
			                	}
			                	if(Posting[0].truckType && Posting[0].truckType.truck_type){
			                		 trucktype  =', RegisteredVehicle Type '+ Posting[0].truckType.truck_type;
			                	}
			                	if(Posting[0].date && Posting[0].date.from){
			                		shedule_date = ' ,shedule date '+ Posting[0].date.from.toDateString();
			                	}
			                    var messagePre = Posting[0].type + ' posting from ' + user.owner_name+ ' ( '+ user.company_name +') ';
			                	var messageBody = Posting[0].type +" "+Posting[0].postingId +' from '+	from+ ', to '+ to +material+ trucktype+ shedule_date + expected_cost;
			                	var messagePost =  ' at futuretrucks.in. For any help call us at 9891705019.';
							    console.log(messageBody);
							    var sQuery,sQueryDest,sQueryTruck, sQueryFrom;
							    /*if(Posting[0].source && Posting[0].source.formatted_address){
							    	sQueryFrom = Posting[0].source.formatted_address.split('India')[0] ? Posting[0].source.formatted_address.split('India')[0] : Posting[0].source.formatted_address;
							    }else{
							    	sQueryFrom = from;
							    }
							    if(Posting[0].destination && Posting[0].destination[0] && Posting[0].destination[0].formatted_address){
							    	sQueryDest = Posting[0].destination[0].formatted_address.split('India')[0] ? Posting[0].destination[0].formatted_address.split('India')[0] : Posting[0].destination[0].formatted_address;
							    }else{
							    	sQueryFrom =  to;
							    }*/
							    if(Posting[0].truckType && Posting[0].truckType.truck_type){
							    	sQueryTruck =  Posting[0].truckType.truck_type;
							    }
							    sQuery = fromS + " " + toS;// + " " + sQueryTruck;
							     /*var mobileNum = req.body.mobile || user.mobile;
							    if(Posting[0].type != 'truck'){
							    	console.log('SMS should not send for truck post.')
							    	smsUtil.sendSMS(mobileNum,message);
							    }*/
							    if(user.email){
							        var mailOptions = {
									    to: user.owner_name+' ✔ <'+ user.email+'>',
									    subject: 'New  '+Posting[0].type+' Post.✔',
									    text: 'Welcome from Future Trucks✔',
									    html: '<br>'  +messageBody + messagePost + '<br>'
									};
							    emailUtil.sendMail(mailOptions);
							    }
							    Posting[0].messageBody = messageBody;
							    prepareNotification(Posting[0],user);
							    if(Posting[0].type == 'load'){
							    	 prepareNotificationForBroadCast(Posting[0],sQuery);
							    	 prepareNotificationForBroadCastToUnRegUsers(Posting[0],sQuery);
								}
							    //smsUtil.sendSMS(commonUtil.getConfig('mobile_ft'),message);
			                	var resp = {"status": "OK","postingId":Posting[0].postingId,"message":messageBody + messagePost};
			                	console.log(resp);
			                    return res.status(200).json(resp);
		                    }).catch(next);
	      })(req, res, next);
     });
router.put('/:posting_id',
	 function(req, res, next) {
 	 console.log('request payload for posting update',req.body);
		  passport.authenticate('jwt',
		  function(error, user, info) {
			 if (error){
			   return next(error);
		   }
			if(user){
			    var oParams = {"_id":req.params.posting_id};
			    postingService.getPostingsByIdAsync(oParams)//verify truck post
				 .then(function(truckPosting){
					 if (truckPosting[0] === false) return {"verified": false, "message": "No such  post exists"};
         //					 else if(truckPosting[0].date && new Date(truckPosting[0].date.from) < new Date()) {
         //							return {"verified" : false, "message": "RegisteredVehicle post outdated. Please contact at +919891705019"};
         //					  }
					 else if(truckPosting[0].userId && truckPosting[0].userId.toString() != user._id) {
						return {"verified" : false, "message": "User is not same as truck post owner"};
						}
					else if(truckPosting[0].verified != 'pending'){
					 	 req.body.posting_mongoId = truckPosting[0]._id;
					 	 req.old_posting =  truckPosting[0];
						 return truckPosting[0];
					 }else {
						 return {"verified" : false, "message": "truck posting is not verified by Future Trucks"};
					 }
		      }).then(function(truckPost){
		    	     if(truckPost && truckPost.verified){
					    var updatePosting = createSetNewValObject(req);//{"setNewVal":{"acceptedBy_interest":false,"deal_price_posting":req.body.counter_quote,"latModified": new Date()},"pushToArr" :{'counter_quotes': {'$each' :[req.body.counter_quote]}}};
						// send sms and email to interest owner
					   return postingService.updatePostingInterestAsync(req.body.posting_mongoId,updatePosting);
					 }else{
						return truckPost;
			  }}).then( function(truckPosting) {
				     if(truckPosting && truckPosting.verified){
				    	 var resp = {"status": "OK","posting": truckPosting,"message":"your posting is updated successfully."};
				    	 //logger.info(resp);
				    	 return res.status(200).json(resp);
				     }else{
				    	 truckPosting.status = "ERROR";
				    	 winston.info(truckPosting);
				    	 return res.status(200).json(truckPosting);
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
router.post('/confirmBy_posting',
	 function(req, res, next) {
	 console.log('request payload for confirmBy_posting',req.body);
     //TODO verify payload first{postingId,interest_id,payment_options for load owner,accept price etc.}
		  passport.authenticate('jwt',
		  function(error, user, info) {
			 if (error){
			   return next(error);
		   }
			if(user){
			    var oParams = {"postingId":req.body.postingId,"userId":user._id};// use payload
			    req.contacts = {};
			    postingService.getPostingsByIdAsync(oParams)//verify truck post
				 .then(function(truckPosting){
				 if (truckPosting[0] === false) return {"verified": false, "message": "No such truck post exists"};
        //					 else if(truckPosting[0].date && new Date(truckPosting[0].date.from) < new Date()) {
        //							return {"verified" : false, "message": "RegisteredVehicle post outdated. Please contact at +919891705019"};
        //					  }
					 else if(truckPosting[0].userId && truckPosting[0].userId.toString() != user._id) {
						return {"verified" : false, "message": "User is not same as truck post owner"};
						}
					 else if(truckPosting[0].interested_to.indexOf(req.body.interest_id) < 0) {
							return {"verified" : false, "message": "Interest Id does not exist for this post."};
						}
					 else if(truckPosting[0].accepted_interest.interest_id != req.body.interest_id){
							return {"verified" : false, "message": "Interest Id does not match with the actual interest accepted by person."};
						}
					 else if(truckPosting[0].confirmBy_posting){
							return {"verified" : false, "message": "You have already confirmed the booking."};
						}
					 else if(!truckPosting[0].acceptedBy_posting){
							return {"verified" : false, "message": "You have not accepted BID from any interest."};
						}
					else if(truckPosting[0].verified !='pending'){
					 	 req.body.posting_id = truckPosting[0]._id;
		    			 req.contacts.post_mobile = truckPosting[0].mobile;
		    			 req.contacts.post_email = truckPosting[0].email;
		    			 req.old_posting = truckPosting[0];
						 return truckPosting[0];
					 }else {
						 return {"verified" : false, "message": "truck posting is not verified by Future Trucks"};
					 }
		      }).then(function(truckPost){//verify interest deal price for acceptance
					if(truckPost.verified){
						    var oParams = {"_id":req.body.interest_id};// use payload
						    return interestShownService.getInterestShownsByParamsAsync(oParams)//verify truck interest
							 .then(function(interestShown){
							   if (interestShown[0] === false) return {"verified": false, "message": "No such interest post exists"};

								 else if(interestShown[0].userId && interestShown[0].userId.toString() == user._id) {
									return {"verified" : false, "message": "User is same as interest  owner"};
									}
								 else if(interestShown[0].postingId != req.body.postingId) {
										return {"verified" : false, "message": "Posting Id does not exist for this Interest."};
								 }
								 else if(!interestShown[0].acceptedBy_posting){//already accepted by interest owner0
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
						 var oUpdate = {"setNewVal":{"confirmBy_posting":req.body.confirmBy_posting,"latModified": new Date()}};// use payload
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
						 var oUpdate = {"setNewVal":{"confirmBy_posting":req.body.confirmBy_posting,"latModified": new Date()}};
							if(req.old_posting.type == 'load'){
								//generate invoice
								//calculate % amount here
								oUpdate.setNewVal.payment_posting = req.old_posting.payment_posting || {};
								if(req.body.payment_mode){
									oUpdate.setNewVal.payment_posting.mode = req.body.payment_mode; // use payload
							 	}
								if(req.body.payment_code){
								    oUpdate.setNewVal.payment_posting.code = req.body.payment_code; // use payload
							 	}
					    		var total_new_cost,p_code,per_truck_cost_inc = 0;
					    		if(oUpdate.setNewVal.payment_posting.options){
					    			for(l=0;l<oUpdate.setNewVal.payment_posting.options.length;l++){
					    				if(oUpdate.setNewVal.payment_posting.options[l].code==req.body.payment_code){
					    					total_new_cost = oUpdate.setNewVal.payment_posting.options[l].cost;
					    					per_truck_cost_inc = l*100;
					    					p_code = req.body.payment_code;
					    				}
					    			}
					    		 }
					    		 console.log(total_new_cost,p_code,per_truck_cost_inc);
					    		 oUpdate.setNewVal.contact_person_payment_at_dropofLocation = req.old_posting.contact_person_payment_at_dropofLocation;
					    		 oUpdate.setNewVal.contact_person_payment_at_pickupLocation = req.old_posting.contact_person_payment_at_pickupLocation;
					    		 var percent = getPercentage(total_new_cost,p_code);
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
					    		 var payment_posting = {};
					    		 if(req.old_posting.payment_posting){
					    			 payment_posting = JSON.parse(JSON.stringify(req.old_posting.payment_posting));
					    		 }
					    		 payment_posting.invoice_posting_no = "000000025";//TODO generate invoice_posting no
					    		 payment_posting.total_amount_payable = 0;
					    		 payment_posting.grand_total_amount = 0;
							     var aItems = [];

							     //   for(var i=0;i<req.old_posting.trucks_info.length;i++){
							    	 var oTruck = req.old_interest.truckType || req.old_posting.truckType;
							    	 var oItem = {};
							    	 console.log(oTruck);
							    	 oItem.name = oTruck.truck_type ?oTruck.truck_type : "RegisteredVehicle" ;
							    	 oItem.quantity = req.old_posting.no_of_trucks || req.old_interest.no_of_trucks;
							    	 oTruck.price_per_truck = total_new_cost/oItem.quantity;
							    	 oItem.cost =  oItem.quantity * oTruck.price_per_truck;
							    	 payment_posting.total_amount_payable =  payment_posting.total_amount_payable + oItem.cost;
							    	 oTruck.price_per_truck = oTruck.price_per_truck*102/100;//2% TDS added;
							    	 oItem.cost= oItem.cost*102/100;
							    	 oItem.price = oItem.quantity + " * " + oTruck.price_per_truck;
							    	 payment_posting.grand_total_amount =  payment_posting.grand_total_amount + oItem.cost;
							    	 aItems.push(oItem);
							 //  	 }
							    	payment_posting.items = aItems;
							        oUpdate.setNewVal.invoice_posting = payment_posting;
							}else{
								if(req.body.trucks){
									oUpdate.setNewVal.trucks = req.body.trucks;
								}
								if(req.body.drivers){
									oUpdate.setNewVal.drivers = req.body.drivers;
								}
							}
						//sms and email to post owner
				      console.log('uuuuuuuuuuuuuuuuuuuuuu',oUpdate);
					   return postingService.updatePostingInterestAsync(req.body.posting_id,oUpdate);
					 }else{
						return interestShown;
			  }})
			  .then( function(truckPosting) {
				  var resp;
			   if(truckPosting.entityName == "POSTING" && !truckPosting.booking_id){//create a booking entry and remove post and all interest from UI view

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
			  console.log('update booking');
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
				   resp = {"status": "OK","bookingId":interestShown.bookingId, "message":"Your booking is confirmed  for Rs. "+ accept_price};
				}else{
					interestShown.status = "ERROR";
				    resp = interestShown;
				}
				  if(resp.status == "OK"){
					// send sms and email to post owner
				    	 var susr = user.owner_name?user.owner_name:"";
						 var message = 'Hi '+ susr + ', your booking with booking id '+interestShown.bookingId+ 'is confirmed for Rs '+ accept_price +' at at www.futuretrucks.in Download our android application from  https://goo.gl/khpPCW';
						  console.log('kkkkkkkkkkkkkkkkkkkkkkkkkkk',message);

						 if(req.contacts.post_mobile){smsUtil.sendSMS(req.contacts.post_mobile,message);}
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
							  if( req.contacts.interest_mobile){smsUtil.sendSMS( req.contacts.interest_mobile,interest_message);}
							  if(req.contacts.interest_email){
								   var mailOptions = {
										    to: ' interest owner ✔ <'+req.contacts.interest_email+'>',
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
router.post('/getProductInfo_posting',
	 function(req, res, next) {
          console.log('getProductInfo_posting_payload',req.body); //TODO verify payload first{postingId,interest_id,payment_options for load owner,accept price etc.}
		  passport.authenticate('jwt',
		  function(error, user, info) {
			 if (error){
			   return next(error);
		   }
			if(user){
			    var oParams = {"postingId":req.body.postingId,"userId":user._id};// use payload
			    req.contacts = {};
			    postingService.getPostingsByIdAsync(oParams)//verify truck post
				 .then(function(truckPosting){
				 if (truckPosting[0] === false) return {"verified": false, "message": "No such truck post exists"};
					 else if(truckPosting[0].userId && truckPosting[0].userId.toString() != user._id) {
						return {"verified" : false, "message": "User is not same as truck post owner"};
						}
					 else if(truckPosting[0].interested_to.indexOf(req.body.interest_id) < 0) {
							return {"verified" : false, "message": "Interest Id does not exist for this post."};
						}
					 else if(truckPosting[0].accepted_interest.interest_id != req.body.interest_id){
							return {"verified" : false, "message": "Interest Id does not match with the actual interest accepted by person."};
						}
					 else if(!truckPosting[0].acceptedBy_posting){
							return {"verified" : false, "message": "You have not accepted BID from any interest."};
						}
					else if(truckPosting[0].verified !='pending'){
					 	 req.body.posting_id = truckPosting[0]._id;
		    			 req.contacts.post_mobile = truckPosting[0].mobile;
		    			 req.contacts.post_email = truckPosting[0].email;
		    			 req.old_posting = truckPosting[0];
	                     req.user = user;
						 return truckPosting[0];
					 }else {
						 return {"verified" : false, "message": "truck posting is not verified by Future Trucks"};
					 }
		      }).then(function(truckPost){//verify interest deal price for acceptance
					if(truckPost.verified){
						    var oParams = {"_id":req.body.interest_id};// use payload
						    return interestShownService.getInterestShownsByParamsAsync(oParams)//verify truck interest
							 .then(function(interestShown){
							   if (!interestShown[0]) {
							   	return {"verified": false, "message": "No such interest post exists"};
							   	}
							   	else if(interestShown[0].userId && interestShown[0].userId.toString() == user._id) {
							     	return {"verified" : false, "message": "User is same as interest  owner"};
								}
								 else if(interestShown[0].postingId != req.body.postingId) {
										return {"verified" : false, "message": "Posting Id does not exist for this Interest."};
								 }
								 else if(!interestShown[0].acceptedBy_posting){//already accepted by interest owner0
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
						 var oUpdate = {"setNewVal":{"latModified": new Date()}};// use payload
						 return interestShownService.updateInterestShownAsync(req.body.interest_id,oUpdate)
					 }else{
						return interestShown;
			  }}).then(function(interestShown){
				 	if(interestShown && interestShown.acceptedBy_interest && interestShown.acceptedBy_posting){
						// send sms and email to interest owner
				 		req.old_interest = interestShown;
				 		console.log("updating posting");
						req.body.interest_owner_id = interestShown.userId;
						 var oUpdate = {"setNewVal":{"latModified": new Date()}};
							if(req.old_posting.type == 'load'){
								//generate invoice
								//calculate % amount here
								oUpdate.setNewVal.payment_posting = req.old_posting.payment_posting || {};
								if(req.body.payment_mode){
									oUpdate.setNewVal.payment_posting.mode = req.body.payment_mode; // use payload
							 	}
								if(req.body.payment_code){
								    oUpdate.setNewVal.payment_posting.code = req.body.payment_code; // use payload
							 	}
					    		var total_new_cost,p_code,per_truck_cost_inc = 0;
					    		if(oUpdate.setNewVal.payment_posting.options){
					    			for(l=0;l<oUpdate.setNewVal.payment_posting.options.length;l++){
					    				if(oUpdate.setNewVal.payment_posting.options[l].code==req.body.payment_code){
					    					total_new_cost = oUpdate.setNewVal.payment_posting.options[l].cost;
					    					per_truck_cost_inc = l*100;
					    					p_code = req.body.payment_code;
					    				}
					    			}
					    		 }
					    		 console.log(total_new_cost,p_code,per_truck_cost_inc);
					    		 oUpdate.setNewVal.contact_person_payment_at_dropofLocation = req.old_posting.contact_person_payment_at_dropofLocation;
					    		 oUpdate.setNewVal.contact_person_payment_at_pickupLocation = req.old_posting.contact_person_payment_at_pickupLocation;
					    		 var percent = getPercentage(total_new_cost,p_code);
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
					    		 var payment_posting = {};
					    		 if(req.old_posting.payment_posting){
					    			 payment_posting = JSON.parse(JSON.stringify(req.old_posting.payment_posting));
					    		 }
					    		 payment_posting.invoice_posting_no = "000000025";//TODO generate invoice_posting no
					    		 payment_posting.total_amount_payable = 0;
					    		 payment_posting.grand_total_amount = 0;
							     var aItems = [];

							    	 var oTruck = req.old_interest.truckType || req.old_posting.truckType;
							    	 var oItem = {};
							    	 console.log(oTruck);
							    	 oItem.name = oTruck.truck_type ?oTruck.truck_type : "RegisteredVehicle" ;
							    	 oItem.quantity = req.old_posting.no_of_trucks || req.old_interest.no_of_trucks;
							    	 oTruck.price_per_truck = total_new_cost/oItem.quantity;
							    	 oItem.cost =  oItem.quantity * oTruck.price_per_truck;
							    	 payment_posting.total_amount_payable =  payment_posting.total_amount_payable + oItem.cost;
							    	 oTruck.price_per_truck = oTruck.price_per_truck*102/100;//2% TDS added;
							    	 oItem.cost= oItem.cost*102/100;
							    	 oItem.price = oItem.quantity + " * " + oTruck.price_per_truck;
							    	 payment_posting.grand_total_amount =  payment_posting.grand_total_amount + oItem.cost;
							    	 aItems.push(oItem);
							    	payment_posting.items = aItems;
							        oUpdate.setNewVal.invoice_posting = payment_posting;
							}else{
								if(req.body.trucks){
									oUpdate.setNewVal.trucks = req.body.trucks;
								}
								if(req.body.drivers){
									oUpdate.setNewVal.drivers = req.body.drivers;
								}
							}
				       console.log('uuuuuuuuuuuuuuuuuuuuuu',oUpdate);
					   return postingService.updatePostingInterestAsync(req.body.posting_id,oUpdate);
					 }else{
						return interestShown;
			  }})
			  .then( function(truckPosting) {
				  var resp;
			   if(truckPosting.entityName == "POSTING" && !truckPosting.booking_id){
				   req.old_posting = truckPosting;//create a booking entry and remove post and all interest from UI view
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
			   req.old_posting = truckPosting;
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
			  console.log('update booking');
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
				   return interestShown;p
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
               oPayment.done_by = "post_owner";
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
router.post('/setPaymentStatus_posting',
	 function(req, res, next) {
          console.log('setPaymentStatus_posting_payload',req.body); //TODO verify payload first{postingId,interest_id,payment_options for load owner,accept price etc.}
			    var oParams = {"bookingId":req.body.bookingId};// use payload
			    req.contacts = {};
			    bookingService.getBookingsByIdAsync(oParams)//verify truck post
				 .then(function(booking){
				 if (booking === false) return {"verified": false, "message": "No such booking exists"};
				  //else if(booking.users && booking.users.indexOf(user._id)<0) {
					//	return {"verified" : false, "message": "User is not same as the booking owner"};
				    // }
				 else if(booking.interestId != req.body.interestId) {
							return {"verified" : false, "message": "Interest Id does match with booking."};
				 	 }
				 else if(booking.postingId != req.body.postingId){
							return {"verified" : false, "message": "postingId  does not match with the actual postingId ."};
						}
				 else if(booking.status == 'confirm'){
							return {"verified" : false, "message": "You have already paid."};
						}
				  else if(booking.status == 'failed_online_payment'){
					 	 req.body.old_booking = booking;
					 	 var bStatus = "failed_online_payment";
					 	 if(req.body.status== "success"){
					 	 	bStatus = "confirm";
					 	 }else if(req.body.status== "pending"){
					 	 	bStatus = "pending_online_payment";
					 	 }
					 	 var oUpdate = {"setNewVal":{"status":bStatus,"latModified": new Date()}};
		    			 return bookingService.updateBookingAsync(booking._id ,oUpdate);
					 }else {
						 return {"verified" : false, "message": "truck posting is not verified by Future Trucks"};
					 }
		      }).then(function(booking){//verify interest deal price for acceptance
					if(booking.entityName == "BOOKING"){
						    var oRes = req.body;
						    var oParams = {"paymentId":req.body.txnid};// use payload
						    var oUpdate = {"setNewVal":{"oRes":oRes,"latModified": new Date()}};
						    return paymentService.updatePaymentAsync(oParams,oUpdate);//verify truck interest
					}else{
						return booking;
					}
			  }).then(function(payment){
			     if(payment.ok== 1){
			        return res.status(200).json({"status": "OK","message":"payment saved successfull."});

		          }else{
		          	return res.status(500).json({"status": "ERROR","data":payment});

		          }
		      }).catch(next);
     });
module.exports = router;
