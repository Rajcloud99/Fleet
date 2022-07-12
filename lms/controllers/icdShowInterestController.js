var express = require('express');
var router = express.Router();
var passport = require('passport');
var Promise = require('bluebird');
var winston = require('winston');

var icdContainerService = Promise.promisifyAll(commonUtil.getService('icdContainer'));
var icdShowInterestService = Promise.promisifyAll(commonUtil.getService('icdShowInterest'));

var driverService = Promise.promisifyAll(commonUtil.getService('driver'));
var driverAdminService = Promise.promisifyAll(commonUtil.getService('driverAdmin'));

var truckService = Promise.promisifyAll(commonUtil.getService('truck'));
var truckAdminService = Promise.promisifyAll(commonUtil.getService('truckAdmin'));




//****************************************************************************************************

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
	 icdShowInterestService.getAllInterestShownAsync(req)
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


//****************************************************************************************************

router.post('/',
	 function(req, res, next) {
	     passport.authenticate('jwt',
		  function(error, user, info) {
	    	 if (error){
			   return next(error); 
		   }
			 
			 if(user){
			 var oParams = {"postingId":req.body.postingId};
			 icdContainerService.getPostingsByParamsAsync(oParams)
			 .then(function(containerPosting){
				 if (containerPosting.length === 0) return {"verified": false, "message": "No such container post exists"};
     
				 else if(containerPosting[0].userId && containerPosting[0].userId.toString() == user._id) {
					return {"verified" : false, "message": "user is same for posting and interest"};
				}
				/*else if(((containerPosting[0].containers[0].remaining_container)==(containerPosting[0].containers[0].posted_container)) && ((containerPosting[0].containers[1].remaining_container)==(containerPosting[0].containers[1].posted_container))) {
					return {"verified" : false , "message": "No Remaining Container"};
				}*/
				else if(containerPosting[0].verified !='pending'){
					 if(containerPosting[0].interested_to && containerPosting[0].interested_to.length>=1) {
						 var alreadyShown = false;
						 /*for(var i = 0;i< containerPosting[0].interested_to.length; i++){
							 if(containerPosting[0].interested_to[i].userId && containerPosting[0].interested_to[i].userId.toString() == user._id){
								 alreadyShown = true;
								 return {"verified" : false, "message": "You have already shown interest to this Container post earlier. Please check it in My Container Interest tab."};
							 }
						 }*/
						 if(!alreadyShown){
							 return containerPosting[0];
						 }
					  }else{
					 return containerPosting[0];
					 }
				 }else {
					 return {"verified" : false, "message": "container posting is not verified by Future Trucks"};
				 }
	       }).then(function(containerPost){
	    	   if(containerPost.verified){
	    	   		if(req.body.truck_driver_detail && req.body.truck_driver_detail.length>0){
	    	   					 registerDriverArray=[];
	    	   					 registerTruckArray=[];
	    	   					 req.driverIdArray=[];
	    	   					 req.truckIdArray=[];

	    	   					 req.totalTwentyFeetContainer=0;
	    	   					 req.totalFourtyFeetContainer=0;

	    	   				for(i=0;i<req.body.truck_driver_detail.length;i++){

	    	   						if(req.body.truck_driver_detail[i].twentyFeet>0){
	    	   							req.totalTwentyFeetContainer=req.totalTwentyFeetContainer+req.body.truck_driver_detail[i].twentyFeet;
	    	   						}

	    	   						if(req.body.truck_driver_detail[i].fourtyFeet>0){
	    	   							req.totalFourtyFeetContainer=req.totalFourtyFeetContainer+req.body.truck_driver_detail[i].fourtyFeet;
	    	   						}

	    	   					 
	    	   					 if(typeof(req.body.truck_driver_detail[i].truck)=='undefined'){
	    	   									var prepareTruckData={};
	    	   									prepareTruckData.license_plate_num = req.body.truck_driver_detail[i].trucks_no_plate;
	    	   									prepareTruckData.userId = user._id;
	    	   									registerTruckArray.push(prepareTruckData)
	    	   						}
	    	   						else{
	    	   							req.truckIdArray.push(req.body.truck_driver_detail[i].truck);
	    	   						}

	    	   						if(typeof(req.body.truck_driver_detail[i].driver)=='undefined'){
	    	   									var prepareDriverData={};
	    	   									var fullName = req.body.truck_driver_detail[i].drivers_name;
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
	    	   							req.driverIdArray.push(req.body.truck_driver_detail[i].driver);
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
										return containerPost;
							 			}
									 )
								 }
								 return containerPost;
							 	}

							 )
						}
						else{
							if(registerDriverArray.length>0){
							return driverService.registerDriversOnIcdInterestsAsync(registerDriverArray)
							.then(function(resultedDrivers){
								req.registerdDrivers = resultedDrivers.bulkres.getInsertedIds();
								return containerPost;
							 	}
							 )
						}
						}
					return containerPost;
				 }else{
					return containerPost;
				 }
				 }).then(function(containerPost){
					if(containerPost.verified){
						var j=0, k=0, l=0, m=0;
						for(i=0; i<req.body.truck_driver_detail.length; i++){
							
							if(typeof(req.body.truck_driver_detail[i].truck)=='undefined'){
									
									req.body.truck_driver_detail[i].truck=req.registerdTrucks[j];
									j++;
							}else{
								
									req.body.truck_driver_detail[i].truck=req.truckIdArray[k];
									k++;

							}

							if(typeof(req.body.truck_driver_detail[i].driver)=='undefined'){
								
									req.body.truck_driver_detail[i].driver=req.registerdDrivers[l];
									l++;
								
							}else{
									req.body.truck_driver_detail[i].driver=req.driverIdArray[m];
									m++;
								}
							
						}


	    	   			req.body.verified = 'active';
					 	req.body.userId = user._id;
					 	req.body.postingId = containerPost.postingId;
					 	req.body.posting = containerPost._id;

					 	req.body.interest_owner_mobile = user.mobile;
					 	req.body.interest_owner_email = user.email;
					 	req.body.interest_owner_name = user.owner_name;
					 	req.body.interest_owner_company = user.company_name;

					 	req.body.post_owner_email = containerPost.post_owner_email;
					 	req.body.post_owner_mobile = containerPost.post_owner_mobile;
					 	req.body.post_owner_name = containerPost.post_owner_name;
					 	req.body.post_owner_company = containerPost.post_owner_company;

					 	req.body.source = containerPost.source;
					 	req.body.destination = containerPost.destination;
					 	req.body.isRegisteredCustomer = true;
					 	req.body.type = containerPost.type;

					 	req.body.latModified = Date.now();
					 
					 
					 	return icdShowInterestService.addInterestShownAsync(req.body);

	    	   		}else{
					return containerPost;
					}}).then(function(interestShown) {
					 if(interestShown.verified === false){
						 return interestShown;
					 }else if(typeof(interestShown[0].interestId)!='undefined'){
						 req.interest_id = interestShown[0]._id;
						 req.interestId = interestShown[0].interestId;
						 req.savedInterest  = interestShown[0];
						 var updatePosting = {"pushToArr" :{'interested_to': {'$each' :[interestShown[0]._id]}}};
						return icdContainerService.updatePostingInterestAsync(req.body.posting,updatePosting);
					 }
		      }).then(function(interestShown) {
					 if(interestShown.verified === false){
						 return interestShown;
					 }else if((req.totalTwentyFeetContainer>0)||(req.totalFourtyFeetContainer>0)){

					 		var twentyFeetContainer_id;
					 		var twentyFeetContainer_old_remaining;
					 		var twentyFeetContainer_new_remaining;

					 		var fourtyFeetContainer_id;
					 		var fourtyFeetContainer_old_remaining;
					 		var fourtyFeetContainer_new_remaining;
					 	for(i=0; i<interestShown.containers.length; i++){
					 		if(interestShown.containers[i].container_type=="20 ft"){
								twentyFeetContainer_old_remaining = interestShown.containers[i].remaining_container;
								
								twentyFeetContainer_id = interestShown.containers[i]._id;
					 			twentyFeetContainer_new_remaining = (twentyFeetContainer_old_remaining - req.totalTwentyFeetContainer)
							}

							if(interestShown.containers[i].container_type=="40 ft"){
								fourtyFeetContainer_old_remaining = interestShown.containers[i].remaining_container;
								
								fourtyFeetContainer_id = interestShown.containers[i]._id;
					 			fourtyFeetContainer_new_remaining = (fourtyFeetContainer_old_remaining - req.totalFourtyFeetContainer)
							}
					 			
					 		}
					 		
					 	if((req.totalTwentyFeetContainer>0)&&(twentyFeetContainer_new_remaining>=0)){
					 		var bothIds = { postId:interestShown.postingId,
					 						contId : twentyFeetContainer_id
					 					  }

					 		 icdContainerService.updateRemainingContainer(bothIds,twentyFeetContainer_new_remaining);
					 	}
					 	
					 	if((req.totalFourtyFeetContainer>0)&&(fourtyFeetContainer_new_remaining>=0)){
					 		var bothIds = { postId:interestShown.postingId,
					 						contId : fourtyFeetContainer_id
					 					  }
					 		 icdContainerService.updateRemainingContainer(bothIds,fourtyFeetContainer_new_remaining);
					 	}
						 
						return interestShown;
					 }
					 	
					 	
		      }).then(function(updatedPostingInterest) {
		    	 	if(updatedPostingInterest.verified === false){
						 return res.status(400).json({"status": "Error","message":updatedPostingInterest.message});
					 }else if(updatedPostingInterest.postingId){
					 	var fromPortCode="",fromPortName="",toPortCode="",toPortName="";

      					if(updatedPostingInterest.source && updatedPostingInterest.source.port_name){
			 				 fromPortName = updatedPostingInterest.source.port_name;
						}

						if(updatedPostingInterest.destination && updatedPostingInterest.destination[0].port_name){
			 				 toPortName = updatedPostingInterest.destination[0].port_name;
						}
			              	var message = updatedPostingInterest.type + ' posting from ' + user.owner_name+ ' ( '+ user.company_name +')' +' ' + user.mobile  +' from ICD '+fromPortName + ', to ICD '+toPortName+' at futuretrucks.in. For any help call us at 9891705019.';
			                /*var interest_mobile = req.body.mobile || req.savedInterest.mobile || user.mobile;
			                var interest_email = req.body.email || req.savedInterest.email || user.email;*/
							console.log(message);
							/*if(interest_mobile){smsUtil.sendSMS(interest_mobile,message);}
							 if(interest_email){
							   var mailOptions = {
									    to: user.owner_name+ ' ✔ <'+interest_email+'>', // list of receivers 
									    subject: 'Your Interest on '+req.body.type+' Post.✔ '+updatedPostingInterest.postingId,
									    text: 'Welcome from Future Trucks✔', // plaintext body 
									    html: '<br>'  +message+ '<br>'// html body 
									};
								emailUtil.sendMail(mailOptions);
							   }*/
							 
			                  /*var post_mobile = req.body.post_mobile || updatedPostingInterest.mobile || req.savedInterest.post_mobile;
			                  var post_email = req.body.post_email || updatedPostingInterest.email || req.savedInterest.post_email;
			                  console.log(post_mobile,post_message);
							  if(post_mobile){smsUtil.sendSMS(post_mobile,post_message);}
							  if(req.body.post_email){
								   var mailOptions = {
										    to:  updatedPostingInterest.post_owner_name +'  ✔ <'+post_email+'>', // list of receivers 
										    subject: 'Interest shown on '+updatedPostingInterest.type+' Post.✔ '+updatedPostingInterest.postingId, // Subject line 
										    text: 'Welcome from Future Trucks✔', // plaintext body 
										    html: '<br>'  +post_message+ '<br>'// html body 
										};
									emailUtil.sendMail(mailOptions);
									console.log('email send to post owner',post_message);
								   }*/
						 var resp = {"status": "OK","interestId":req.interestId,"interest_id":req.interest_id,"message":message};
						 winston.info(resp);
						 return res.status(200).json(resp);
					 }
		      }).catch(next)
         }else{
        	winston.info("Un-Authorised user or session expired");
				 return res.status(200).json({"status": "OK","message":"Un-Authorised user or session expired."});
			 }
		  })(req, res, next);
		});













module.exports = router;