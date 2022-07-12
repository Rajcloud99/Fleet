var express = require('express');
var router = express.Router();
var passport = require('passport');
var Promise = require('bluebird');
var PostingPartLoadService = Promise.promisifyAll(commonUtil.getService('postingPartLoad'));
var notificationService = Promise.promisifyAll(commonUtil.getService('notification'));
var searchService = Promise.promisifyAll(commonUtil.getService('search'));

function prepareNotificationForBroadCastToUnRegPartLoadUsers(posting,sQuery){
	var user_type = ['partLoad','broker','truck_owner','aggregator', 'transporter'];
	 var qStr = {noLimit:true,query :{search:sQuery,'unique':true,type:{'$in':user_type}}};
	 searchService.getAllUnRegPartLoadUsersByTextAsync(qStr)
	     .then(function(users) {
	  	 if(users && users.length>0){
	 	 var registrationTokens = [],aUserIds = [],aUserMobiles = [], aUserEmails = [];
	 	 for(var j=0;j<users.length;j++){
	 	 	if(users[j].mobile){
	 	 		aUserMobiles.push(users[j].mobile);
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
		  "title":  "Someone posted new part load",//+ posting.type + ".",
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

router.post('/', function (req, res, next) {
	passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error); 
	    }
	   if(user.type == 'ft_admin'){
			if((user.role == 'showAdmin') || (user.role=='updateAdmin') || (user.role=='superAdmin')){	
       			if(Object.getOwnPropertyNames(req.body).length>0){
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
					PostingPartLoadService.addPostingAsync(req.body)
					.then(function(Posting) {
			        	var pMobile = Posting[0].mobile;
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
			                    var messagePre = "Dear " + Posting[0].post_owner_name+ ' ( '+ Posting[0].post_owner_company +'), ';
			                	var messageBody = Posting[0].type.toUpperCase() +" "+Posting[0].postingId +' from '+	from+ ', to '+ to +material+ trucktype+ shedule_date + expected_cost;
			                	var messagePost =  ' at futuretrucks.in. For any help call us at 9891705019.';
			                	Posting[0].messageBody = messageBody;
			                	sQuery = fromS + " " + toS;
			                	console.log(messageBody);
							    
							    if(Posting[0].email){
							        var mailOptions = {
									    to: Posting[0].owner_name+' ✔ <'+ Posting[0].email+'>', 
									    subject: 'New  '+Posting[0].type+' Post.✔', 
									    text: 'Welcome from Future Trucks✔', 
									    html: '<br>'  +messageBody + messagePost + '<br>'
									};
							    emailUtil.sendMail(mailOptions);
							    }
							    var toSendMessage = messagePre + messageBody + messagePost;
							    if(Posting[0].mobile){
							    	smsUtil.sendSMS(Posting[0].mobile,toSendMessage);
								}
							    prepareNotificationForBroadCastToUnRegPartLoadUsers(Posting[0],sQuery);
			                	var resp = {"status": "OK","postingId":Posting[0].postingId,"message":toSendMessage};
			                	console.log(resp);
			                    return res.status(200).json(resp);
		                    })
				}else{
	 				res.status(400).json({'status':'ERROR',"error_message":"No data found."});
	 			}
			}else{
	 		res.status(401).json({'status': 'ERROR','message':'You do not have admin privilege'});
 	  		}
   		}else{
  	 		res.status(401).json({'status': 'ERROR','message':'You are not an Admin'});
 		}
	})(req, res, next);
});
//**********************************************************************************************
router.get('/', function (req, res, next) {
	passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error); 
	    }
	   if(user.type == 'ft_admin'){
			if((user.role == 'showAdmin') || (user.role=='updateAdmin') || (user.role=='superAdmin')){
       		
				PostingPartLoadService.getAllPostingAsync(req)
				.then(
					function(partLoad) {
						res.status(200).json({'status': 'OK','data':partLoad.data,'no_of_pages':partLoad.no_of_pages});
					},
					function(err) {
						res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
					}
				)
				.catch(next);
	 		}else{
		 		res.status(200).json({'status': 'OK','message':'You do not have admin privilege'});
	 	  	}
       	}else{
  		 	res.status(200).json({'status': 'OK','message':'You are not an Admin'});
	 	}
	})(req, res, next);
});
//**********************************************************************************************
module.exports = router;
