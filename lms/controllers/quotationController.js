var express = require('express');
var router = express.Router();
var Promise  = require('bluebird');
var winston = require('winston');
var passport = require('passport');
var interestShownService = Promise.promisifyAll(commonUtil.getService('interestShown'));
var postingService = Promise.promisifyAll(commonUtil.getService('posting'));
var oPaymentOptions = [{code:'ADV',desc:'100% Advance'},{code:'8A2D',desc:'80% Advance 20% on delivery'},{code:'7A3D',desc:'70% Advance 30% on delivery'},{code:'5A5D',desc:'50% Advance 50% on delivery'},{code:'DEL',desc:'100% on delivery'}];
var MAX_ATTEMPTS = 3;
router.post('/postings',
 function(req, res, next) {
  passport.authenticate('jwt',
  function(error, user, info) {
	 if (error){
	   return next(error); 
   } 
	if(user){
		//TODO check request payload for required fields. 
	    var oParams = {"postingId":req.body.postingId};
	    postingService.getPostingsByIdAsync(oParams)//verify truck post
		 .then(function(truckPosting){
			 if (truckPosting[0] === false) return {"verified": false, "message": "No such truck post exists"};
//			 else if(truckPosting[0].date && new Date(truckPosting[0].date.from) < new Date()) {
//					return {"verified" : false, "message": "RegisteredVehicle post outdated. Please contact at +919891705019"};
//			  }
			 else if(truckPosting[0].userId && truckPosting[0].userId.toString() != user._id) {
				return {"verified" : false, "message": "User is not same as truck post owner"};
				}
			 else if(truckPosting[0].interested_to.indexOf(req.body.interest_id) < 0) {
					return {"verified" : false, "message": "Interest Id does not exist for this post."};
				}
			 else if(truckPosting[0].acceptedBy_posting) {
					return {"verified" : false, "message": "You have already accepted the deal price for an existing interest.",};
				}
			else if(truckPosting[0].verified =='active'){
			 	 req.body.posting_mongoId = truckPosting[0]._id;
				 return truckPosting[0];
			 }else {
				 return {"verified" : false, "message": "truck posting is not verified by Future Trucks"};
			 }
      }).then(function(truckPost){
    	  req.contacts = {};
    	  if(truckPost.verified){
    		 req.contacts.post_mobile = truckPost.mobile;
    		 req.contacts.post_email = truckPost.email;
    		 if(truckPost.source && truckPost.source.c){
    			  req.contacts.source =   truckPost.source.c +'-'+truckPost.source.s;
    		  }else{
    			  req.contacts.source = truckPost.source;
    		  }
    		  if(truckPost.destination && truckPost.destination[0] && truckPost.destination[0].c){
    			  req.contacts.destination =   truckPost.destination[0].c +'-'+truckPost.destination[0].s;
    		  }else if(truckPost.destination && truckPost.destination[0]){
    			  req.contacts.destination = truckPost.destination[0];
    		  }else{
    			  req.contacts.destination = truckPost.destination;
    		  }
    		  req.contacts.destination = truckPost.destination[0].c? truckPost.destination.c +'-'+truckPost.destination[0].s:truckPost.destination[0];
    	  var oParams = {"_id":req.body.interest_id};
		   return  interestShownService.getInterestShownsByParamsAsync(oParams);
    	  }else{
				 return truckPost;
			 }
    	  })//verify truck interest
		 .then(function(interestShown){
			   if (interestShown[0] === false) return {"verified": false, "message": "No such interest post exists"};
//				 else if(interestShown[0].date && new Date(interestShown[0].date.from) < new Date()) {
//						return {"verified" : false, "message": "Interest shown  post outdated. Please contact at +919891705019"};
//				  }
				 else if(interestShown[0].userId && interestShown[0].userId.toString() == user._id) {
					 console.log(interestShown[0].userId.toString(),user._id);
					return {"verified" : false, "message": "User is  same as interest  owner"};
					}
				 else if(interestShown[0].counter_quotes && interestShown[0].counter_quotes.length>=MAX_ATTEMPTS) {
					 console.log(interestShown[0]);
					 return {"verified" : false, "message": "You have already used all your "+ interestShown[0].quote_prices.length+ " attempts for quoting new price "};
					}
				 else if(interestShown[0].acceptedBy_posting) {
						return {"verified" : false, "message": "You have already accepted deal price."};
						}
				 else if(interestShown[0].postingId != req.body.postingId) {
						return {"verified" : false, "message": "Posting Id does not exist for this Interest."};
					}
				else {
				 	 return interestShown;
				 }
    	  
      })
      .then(function(interestShown){
    	  console.log('interestShown',interestShown);
			if(interestShown[0] && interestShown[0].interestId){
				req.contacts.interest_mobile = interestShown[0].mobile;
	    		req.contacts.interest_email = interestShown[0].email;
				 var updateInterest = {"setNewVal":{"acceptedBy_interest":false,"deal_price_posting":req.body.counter_quote,"latModified": new Date()},"pushToArr" :{'counter_quotes': {'$each' :[req.body.counter_quote]}}};
				 return interestShownService.updateInterestShownAsync(req.body.interest_id,updateInterest)
			 }else{
				return interestShown;
	  }}).then(function(interestShown){
		  console.log('ppppppppppppppp',interestShown);
			if(interestShown && interestShown.interestId){
			   var updatePosting = {"pushToArr" :{'quote_prices': {'$each' :[req.body.counter_quote]}}};
			   return postingService.updatePostingInterestAsync(req.body.posting_mongoId,updatePosting);
			 }else{
				return interestShown;
	  }}).then( function(truckPosting) {
		     if(truckPosting && truckPosting.verified){
		    	// send sms and email to interest owner
		    	 var susr = user.owner_name?user.owner_name:"";
				 var message = 'Hi '+ susr + ' your new BID of Rs '+ req.body.counter_quote +' for '+req.body.postingId +' at at www.futuretrucks.in has been sent to customer. Please wait for his response. Refresh your page to see latest quote.';
				 if(req.contacts.post_mobile){smsUtil.sendSMS(req.contacts.post_mobile,message);}
					 if(user.email){
					   var mailOptions = {
							    to: user.owner_name+ ' ✔ <'+user.email+'>', 
							    subject: 'Your bid on '+req.body.postingId+' submitted.✔ ', 
							    text: 'Welcome from Future Trucks✔', 
							    html: '<br>'  +message+ '<br>'
							};
						emailUtil.sendMail(mailOptions);
					   }
					 //sms and email to post owner 
					  var interest_message = "New BID of Rs "+req.body.counter_quote +' for '+req.body.postingId +' at at www.futuretrucks.in.Please visit myInterest page to accept or response for this BID.';
					  if(req.contacts.interest_mobile){smsUtil.sendSMS(req.contacts.interest_mobile,interest_message);}
					  if(req.contacts.interest_email){
						   var mailOptions = {
								    to: ' Interest owner ✔ <'+req.contacts.interest_email+'>', 
								    subject: 'New BID received on '+req.body.postingId+' Post.✔ ', 
								    text: 'Welcome from Future Trucks✔', 
								    html: '<br>'  +interest_message+ '<br>'
								};
							emailUtil.sendMail(mailOptions);
							console.log('email send to post owner',interest_message);
						   }
		       
		    	 var resp = {"status": "OK","posting": truckPosting,"message":"your new price quotation done successfully."};
		    	 winston.info(resp);
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

router.post('/interest',function(req, res, next) {
		  passport.authenticate('jwt',
		  function(error, user, info) {
			 if (error){
			   return next(error); 
		   } 
			if(user){
			    var oParams = {"_id":req.body.interest_id};
			    interestShownService.getInterestShownsByParamsAsync(oParams)//verify truck interest
				 .then(function(interestShown){
				   if (interestShown[0] === false) return {"verified": false, "message": "No such interest post exists"};
//					 else if(interestShown[0].date && new Date(interestShown[0].date.from) < new Date()) {
//							return {"verified" : false, "message": "Interest shown  post outdated. Please contact at +919891705019"};
//					  }
				   else if(interestShown[0].booked_by_other){
						return {"verified" : false, "message": "Booked by someone else. Please try later or show interest on other posting."};
					}
					 else if(interestShown[0].userId && interestShown[0].userId.toString() != user._id) {
						 console.log(interestShown[0].userId.toString(),user._id);
						return {"verified" : false, "message": "User is not same as interest  owner"};
						}
					 else if(interestShown[0].quote_prices && interestShown[0].quote_prices.length>=MAX_ATTEMPTS) {
						 
							return {"verified" : false, "message": "You have already used all your "+ interestShown[0].quote_prices.length + " attempts for quoting new price "};
							}
					 else if(interestShown[0].acceptedBy_interest) {
							return {"verified" : false, "message": "You have already accepted deal price."};
							}
					 else if(interestShown[0].postingId != req.body.postingId) {
							return {"verified" : false, "message": "Posting Id does not exist for this Interest."};
						}
					else {
					 	 return interestShown[0];
					 }
		      }).then(function(interestShown){
		    	  console.log(interestShown,'interestShown');
		    		if(interestShown.interestId){
		    			 req.body.postingId = req.body.postingId?req.body.postingId:interestShown.postingId;
		    			 req.contacts = {};
		    			 req.contacts.interest_mobile = interestShown.mobile;
		    			 req.contacts.interest_email = interestShown.email;
		    			 req.contacts.post_mobile = interestShown.post_mobile;
		    			 req.contacts.post_email = interestShown.post_email;
		    			 req.body.posting_mongoId = interestShown.posting_id || interestShown.posting;
						 var updateInterest = {"setNewVal":{"acceptedBy_posting":false,"deal_price_interest":req.body.quote_price,"latModified": new Date()},"pushToArr" :{'quote_prices': {'$each' :[req.body.quote_price]}}};
						 return interestShownService.updateInterestShownAsync(req.body.interest_id,updateInterest)
					 }else{
						return interestShown;
			  }}).then(function(interestShown){
				 	if(interestShown && interestShown.interestId){
				 		 req.old_interest = interestShown;
						var updatePosting = {"setNewVal" :{'acceptedBy_posting':false,"latModified": new Date()}};
						   return postingService.updatePostingInterestAsync(req.body.posting_mongoId,updatePosting);
						 }else{
							return interestShown;
				  }}).then( function(posting) {
				  if(posting.entityName == 'POSTING'){
						// send sms and email to interest owner
				    	 var susr = user.owner_name?user.owner_name:"";
						 var message = 'Hi '+ susr + ' your new BID of Rs '+ req.body.quote_price +' for '+req.body.postingId +' at at www.futuretrucks.in has been sent to customer. Please wait for his response. Refresh your page to see latest quote.';
						 if(req.contacts.interest_mobile){smsUtil.sendSMS(req.contacts.interest_mobile,message);}
							 if(req.contacts.interest_email){
							   var mailOptions = {
									    to: user.owner_name+ ' ✔ <'+user.email+'>', 
									    subject: 'Your bid on '+req.body.postingId+' submitted.✔ ', 
									    text: 'Welcome from Future Trucks✔', 
									    html: '<br>'  +message+ '<br>'
									};
								emailUtil.sendMail(mailOptions);
							   }
							 //sms and email to post owner 
							  var interest_message = "New BID of Rs "+req.body.quote_price +' for your posting  '+req.body.postingId +' at at www.futuretrucks.in.Please visit myPosting page to accept or response for this BID.';
							  if( req.contacts.post_mobile){smsUtil.sendSMS( req.contacts.post_mobile,interest_message);}
							  if(req.contacts.post_email){
								   var mailOptions = {
										    to: ' post owner ✔ <'+req.contacts.post_email+'>', 
										    subject: 'New BID received on '+req.body.postingId+' Post.✔ ', 
										    text: 'Welcome from Future Trucks✔', 
										    html: '<br>'  +interest_message+ '<br>'
										};
									emailUtil.sendMail(mailOptions);
									console.log('email send to post owner',interest_message);
								   }
					  var resp = {"status": "OK", 'interest' : req.old_interest, "message":"your new price quotation done successfully."};
					  winston.info(resp);
					  return res.status(200).json(resp);
				  }else{
					  posting.status = "ERROR";
					  winston.info(posting);
					  return res.status(200).json(posting); 
					 }
			       
			      }
			    )
			    .catch(next);
			}else{
				var resp = {"status": "ERROR","message":"Un-Authorised User."};
				 return res.status(500).json(resp);
			}
			
		  })(req, res, next);
		});
router.post('/acceptedBy_posting',
		 function(req, res, next) {
	     winston.info('acceptedBy_posting_payload',req.body);
	     //TODO  verify payload {acceptedBy_posting.postingId,interest_id,accept_price etc.}
	     //check if acceptedBy_posting is true or false// exit on false
		  passport.authenticate('jwt',
		  function(error, user, info) {
			 if (error){
			   return next(error); 
		   } 
			if(user){
			    var oParams = {"postingId":req.body.postingId};
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
					 else if(truckPosting[0].acceptedBy_posting) {
							return {"verified" : false, "message": "You have already accepted deal for your post."};
						}
					else if(truckPosting[0].verified !='pending'){
					 	 req.body.posting_id = truckPosting[0]._id;
//					 	 if(truckPosting[0].trucks){
//					 	  req.body.trucks =  truckPosting[0].trucks;
//					 	 }
//					 	 if(truckPosting[0].driverId){
//					 	  req.body.drivers =  truckPosting[0].drivers;
//					 	 }
					 	 req.contacts = {};
					 	 req.contacts.post_mobile = truckPosting[0].mobile;
		    			 req.contacts.post_email = truckPosting[0].email;
		    			 req.body.post_type = truckPosting[0].type;
		    			 req.body.no_of_trucks = truckPosting[0].no_of_trucks || 1;
		    			 req.body.currentPost = truckPosting[0];
						 return truckPosting[0];
					 }else {
						 return {"verified" : false, "message": "truck posting is not verified by Future Trucks"};
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
								 else if(interestShown[0].userId && interestShown[0].userId.toString() == user._id) {
									return {"verified" : false, "message": "User is same as interest  owner"};
									}
								 else if(interestShown[0].postingId != req.body.postingId) {
										return {"verified" : false, "message": "Posting Id does not exist for this Interest."};
								}else if(interestShown[0].deal_price_interest != req.body.accept_price){
									console.log(interestShown);
										return {"verified" : false, "message": "accept price "+req.body.accept_price+" does not match with deal price "+interestShown[0].deal_price_interest+"  of interest."};
								 }
//								else if(interestShown[0].acceptedBy_posting){//already accepted by interest owner0
//										return {"verified" : false, "message": "You have already accepted current deal price for this post."};
//							   }
								else {
									return interestShown[0];
								 }
					      })
				}else{
						   return truckPost;
			        }
			}).then(function(interestShown){
					if(interestShown && interestShown.interestId){
						req.contacts.interest_mobile = interestShown.mobile;
		    			req.contacts.interest_email = interestShown.email;
						var status = "active";
						if(interestShown.acceptedBy_interest){
							status = "booked";
						}
						//TODO create pricing
						 var payment_interest = {}
						if(req.body.post_type =='truck' && req.body.accept_price){
							req.body.no_of_trucks = interestShown.no_of_trucks? interestShown.no_of_trucks : req.body.no_of_trucks;
							var total_numberof_trucks = 1;
							if(req.body.no_of_trucks){
							 total_numberof_trucks = req.body.no_of_trucks;
							}
							var paymentOptions = JSON.parse(JSON.stringify(oPaymentOptions));
						    var minAmt = req.body.accept_price;
						    for(var j=0;j<paymentOptions.length;j++){
						     paymentOptions[j].cost = minAmt;
						     minAmt = minAmt+100*total_numberof_trucks;//two places where we are setting 100 ext cost per option
						    }
						    payment_interest.options = paymentOptions;
						   	console.log('payment_interest',payment_interest);
						 }
						 var updateInterest = {"setNewVal":{"payment_interest":payment_interest,"deal_price_posting":req.body.accept_price,"acceptedBy_posting":true,"latModified": new Date(),"verified":status},"pushToArr" :{'counter_quotes': {'$each' :[req.body.accept_price]}}};
						 return interestShownService.updateInterestShownAsync(req.body.interest_id,updateInterest)
					 }else{
						return interestShown;
			  }})
			  .then(function(interestShown){
				  if(interestShown && interestShown.interestId){
				 // }else if(interestShown && interestShown.acceptedBy_interest && interestShown.acceptedBy_posting){
						// send sms and email to interest owner
				 		console.log("updating posting");
						req.body.interest_owner_id = interestShown.userId;
						var updatePosting = {"setNewVal" :{'verified': "booked","latModified": new Date()}};
						updatePosting.setNewVal.interested_to_backup = req.body.currentPost.interested_to;
						console.log('req.body.currentPost.interested_to',req.body.currentPost.interested_to);
						req.body.remainingInterests = req.body.currentPost.interested_to;
						var indexOfintr = req.body.remainingInterests.indexOf(interestShown._id);
						req.body.remainingInterests.splice(indexOfintr,1);
						//req.body.remainingInterests.push('5673ff15e15105ef0126679d');
						console.log('req.body.remainingInterests',req.body.remainingInterests);
						updatePosting.setNewVal.interested_to = [interestShown._id];
						console.log('updatePosting.setNewVal.interested_to',updatePosting.setNewVal.interested_to);
						updatePosting.setNewVal.acceptedBy_posting = true;
						updatePosting.setNewVal.accepted_interest = {'interest_id' : interestShown._id,'mobile': interestShown.mobile,
						    	'email': interestShown.email,'accept_price_posting':req.body.accept_price};
						 var payment_posting = {};
							if(req.body.post_type =='load' && req.body.accept_price){
								req.body.no_of_trucks = req.body.no_of_trucks?req.body.no_of_trucks:interestShown.no_of_trucks;
								var total_numberof_trucks = 1;
								if(req.body.no_of_trucks){
								 total_numberof_trucks = req.body.no_of_trucks;
								}
								var paymentOptions = JSON.parse(JSON.stringify(oPaymentOptions));
							    var minAmt = req.body.accept_price;
							    for(var j=0;j<paymentOptions.length;j++){
							     paymentOptions[j].cost = minAmt;
							     minAmt = minAmt+100*total_numberof_trucks;//two places where we are setting 100 ext cost per option
							    }
							    payment_posting.options = paymentOptions;
							   	console.log('payment_posting',payment_posting);
							   	updatePosting.setNewVal.payment_posting = payment_posting;
							 }
						//update price details for items
						
					   return postingService.updatePostingInterestAsync(req.body.posting_id,updatePosting);
					 }else{
						return interestShown;
			  }})
			  .then( function(interestShown) {
				  var resp;
				 if(interestShown.entityName == "POSTING"){
					resp = {"status": "OK","message":"Your deal price acceptance done successfully."};
				}else if(interestShown && interestShown.interestId){
				   resp = {"status": "OK","redirectToBooking":false,"interest":interestShown,"message":"Your deal price acceptance done successfully."};
				}else{
					interestShown.status = "ERROR";
				    resp = interestShown;
				}
				  if(resp.status == "OK"){
					// send sms and email to post owner
				    	 var susr = user.owner_name?user.owner_name:"";
						 var message = 'Hi '+ susr + ' your acceptance for BID of Rs '+ req.body.accept_price +' for '+req.body.postingId +' at at www.futuretrucks.in has been sent to customer.';
						 if(req.contacts.post_mobile){smsUtil.sendSMS(req.contacts.post_mobile,message);}
							 if(req.contacts.post_email){
							   var mailOptions = {
									    to: user.owner_name+ ' ✔ <'+user.email+'>', 
									    subject: 'Your acceptance for BID  on '+req.body.postingId+' submitted.✔ ', 
									    text: 'Welcome from Future Trucks✔', 
									    html: '<br>'  +message+ '<br>'
									};
								emailUtil.sendMail(mailOptions);
							   }
							 //sms and email to interest owner 
							  var interest_message =susr  +" has acceptace your BID price  Rs "+req.body.accept_price +' for your interest at posting  '+req.body.postingId +' at at www.futuretrucks.in.';
							  if( req.contacts.interest_mobile){smsUtil.sendSMS( req.contacts.interest_mobile,interest_message);}
							  if(req.contacts.interest_email){
								   var mailOptions = {
										    to: ' interest owner ✔ <'+req.contacts.interest_email+'>', 
										    subject: 'Your BID accepted on '+req.body.postingId+' Post.✔ ', 
										    text: 'Welcome from Future Trucks✔', 
										    html: '<br>'  +interest_message+ '<br>'
										};
									emailUtil.sendMail(mailOptions);
									console.log('email send to post owner',interest_message);
								   }
							  var newdetails = {$set:{'booked_by_other' : true}}
							  if(req.body.remainingInterests && req.body.remainingInterests.length>0){
								  return interestShownService.updateOtherInterestsAsync(req.body.remainingInterests,newdetails);
							  }else{
								  return resp;
							  }
				  }else{
					  winston.info(resp);
					  return resp;
				  }				  
			    }).then(function(bulkResult){
			       	console.log('bulkResult',bulkResult);
			    	//winston.info(resp);
					return res.status(200).json(bulkResult);
			    }).catch(next);
			}else{
				 return res.status(500).json({"status": "ERROR","message":"Un-Authorised User."});
			}
			
		  })(req, res, next);
		});

router.post('/acceptedBy_interest',function(req, res, next) {
	 winston.info('acceptedBy_interest_payload',req.body);
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
					 if (truckPosting[0] === false) return {"verified": false, "message": "No such truck post exists"};
//					 else if(truckPosting[0].date && new Date(truckPosting[0].date.from) < new Date()) {
//							return {"verified" : false, "message": "RegisteredVehicle post outdated. Please contact at +919891705019"};
//					  }
					 else if(truckPosting[0].userId && truckPosting[0].userId.toString() == user._id) {
						return {"verified" : false, "message": "User is same as truck post owner"};
						}
					 else if(truckPosting[0].interested_to.indexOf(req.body.interest_id) < 0) {
							return {"verified" : false, "message": "Interest Id does not exist for this post."};
						}
					else if(truckPosting[0].verified !='pending'){//TODO remove booked status
					 	 req.body.posting_id = truckPosting[0]._id;
					 	 if(truckPosting[0].trucks){
					 	  req.body.trucks = truckPosting[0].trucks;// [truckPosting[0].truck];
					 	 }
					 	 if(truckPosting[0].drivers){
					 	  req.body.drivers = truckPosting[0].drivers;// [truckPosting[0].driverId];
					 	 }
					 	 req.body.no_of_trucks = truckPosting[0].no_of_trucks;
					 	 req.body.post_type=truckPosting[0].type;
						 return truckPosting[0];
					 }else {
						 return {"verified" : false, "message": "truck posting is not verified by Future Trucks"};
					 }
		      }).then(function(truckPost){//verify interest deal price for acceptance
				if(truckPost.verified){
				 var oParams = {"_id":req.body.interest_id};
				 console.log(truckPost);
				 req.contacts.post_mobile = truckPost.mobile;
    			 req.contacts.post_email = truckPost.email;
	    		    return interestShownService.getInterestShownsByParamsAsync(oParams)//verify truck interest
			   .then(function(interestShown){
			   if (interestShown[0] === false) return {"verified": false, "message": "No such interest post exists"};
//				 else if(interestShown[0].date && new Date(interestShown[0].date.from) < new Date()) {
//						return {"verified" : false, "message": "Interest shown  post outdated. Please contact at +919891705019"};
//				  }
			   else if(interestShown[0].booked_by_other){
					return {"verified" : false, "message": "Booked by someone else. Please try later or show interest on other posting."};
				}
				 else if(interestShown[0].userId && interestShown[0].userId.toString() != user._id) {
					return {"verified" : false, "message": "User is not same as interest  owner"};
					}
				 else if(interestShown[0].postingId != req.body.postingId) {
						return {"verified" : false, "message": "Posting Id does not exist for this Interest."};
					}
				 else if(interestShown[0].deal_price_posting != req.body.accept_price){
					return {"verified" : false, "message": "accept price "+req.body.accept_price+" does not match with deal price "+interestShown[0].deal_price_posting +" of posting."};
				} 
				 else if(interestShown[0].acceptedBy_interest){
						return {"verified" : false, "message": "You have already accepted current deal price for this post"};
				}
				else {
				 	 return interestShown[0];
				 }
			   })
			   }else{
				   return truckPost;
	        }
	      }).then(function(interestShown){
	    		if(interestShown.interestId){
	    			req.contacts.interest_mobile = interestShown.mobile;
	    			req.contacts.interest_email = interestShown.email;
	    			var status = 'active';
	    			if(interestShown.acceptedBy_posting){
						status = "booked";
					}
	    			 var payment_interest = {};
						if(req.body.post_type =='truck' && req.body.accept_price){
							req.body.no_of_trucks = req.body.no_of_trucks?req.body.no_of_trucks:interestShown.no_of_trucks;
							var total_numberof_trucks = 1;
							if(req.body.no_of_trucks){
							 total_numberof_trucks = req.body.no_of_trucks;
							}
							var paymentOptions = JSON.parse(JSON.stringify(oPaymentOptions));
						    var minAmt = req.body.accept_price;
						    for(var j=0;j<paymentOptions.length;j++){
						     paymentOptions[j].cost = minAmt;
						     minAmt = minAmt+100*total_numberof_trucks;//two places where we are setting 100 ext cost per option
						    }
						    payment_interest.options = paymentOptions;
						   	console.log('payment_interest',payment_interest);
						   //	updatePosting.setNewVal.payment_interest = payment_interest;
						 }
	    			 var updateInterest = {"setNewVal":{"payment_interest":payment_interest,"deal_price_interest":req.body.accept_price,"acceptedBy_interest":true,"latModified": new Date(),"verified":status},"pushToArr" :{'quote_prices': {'$each' :[req.body.accept_price]}}};
	    			 return interestShownService.updateInterestShownAsync(req.body.interest_id,updateInterest)
				 }else{
					return interestShown;
		  }}).then( function(interestShown) {
			    console.log('interestShown',interestShown);
			  	if(interestShown && interestShown.acceptedBy_interest && interestShown.acceptedBy_posting){
					// send sms and email to interest owner
			  	    console.log("updating posting");
					req.body.interest_owner_id = interestShown.userId;
					var updatePosting = {"setNewVal" :{'verified': "booked","latModified": new Date()}};
					updatePosting.setNewVal.interested_to_backup = interestShown.interested_to;
					//updatePosting.setNewVal.acceptedBy_posting = req.body.acceptedBy_posting? acceptedBy_posting : false;
					updatePosting.setNewVal.interested_to = [interestShown._id];
					updatePosting.setNewVal.accepted_interest = {'interest_id' : interestShown._id,'mobile': interestShown.mobile,
					    	'email': interestShown.email,'accept_price_posting':req.body.accept_price};
					//sms and email to post owner 
					 var payment_posting = {};
						if(req.body.post_type =='load' && req.body.accept_price){
							req.body.no_of_trucks = req.body.no_of_trucks?req.body.no_of_trucks:interestShown.no_of_trucks;
							var total_numberof_trucks = 1;
							if(req.body.no_of_trucks){
							 total_numberof_trucks = req.body.no_of_trucks;
							}
							var paymentOptions = JSON.parse(JSON.stringify(oPaymentOptions));
						    var minAmt = req.body.accept_price;
						    for(var j=0;j<paymentOptions.length;j++){
						     paymentOptions[j].cost = minAmt;
						     minAmt = minAmt+100*total_numberof_trucks;//two places where we are setting 100 ext cost per option
						    }
						    payment_posting.options = paymentOptions;
						   	console.log('payment_posting',payment_posting);
						   	updatePosting.setNewVal.payment_posting = payment_posting;
						 }
				   return postingService.updatePostingInterestAsync(req.body.posting_id,updatePosting);
				 }else{
		    	   return interestShown;
		       }
		      }).then( function(interestShown) {
		    	    var resp = {"status": "ERROR",'interest':interestShown};
					if(interestShown && interestShown.interestId){
						resp = {"status": "OK","redirectToBooking":false,"interest":interestShown,"message":"Your deal price acceptance done successfully."};
					}else if(interestShown.entityName == "POSTING"){
				    	 resp = {"status": "OK","message":"Your deal price acceptance done successfully"};
					}else{
						resp = {"status": "ERROR",'interest':interestShown};
				     }
					  if(resp.status == "OK"){
							// send sms and email to interest owner
						    	 var susr = user.owner_name?user.owner_name:"";
								 var message = 'Hi '+ susr + ' your acceptance for BID of Rs '+ req.body.accept_price +' for '+req.body.postingId +' at at www.futuretrucks.in has been sent to customer.';
								 if(req.contacts.interest_mobile){smsUtil.sendSMS(req.contacts.interest_mobile,message);}
									 if(req.contacts.interest_email){
									   var mailOptions = {
											    to: user.owner_name+ ' ✔ <'+user.email+'>', 
											    subject: 'Your acceptance for BID  on '+req.body.postingId+' submitted.✔ ', 
											    text: 'Welcome from Future Trucks✔', 
											    html: '<br>'  +message+ '<br>'
											};
										emailUtil.sendMail(mailOptions);
									   }
									 //sms and email to interest owner 
									  var interest_message =susr  +"has acceptace your BID price  Rs "+req.body.accept_price +' for your  posting  '+req.body.postingId +' at at www.futuretrucks.in.';
									  if( req.contacts.post_mobile){smsUtil.sendSMS( req.contacts.post_mobile,interest_message);}
									  if(req.contacts.post_email){
										   var mailOptions = {
												    to: ' interest owner ✔ <'+req.contacts.post_email+'>', 
												    subject: 'Your BID accepted on '+req.body.postingId+' Post.✔ ', 
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
module.exports = router;
