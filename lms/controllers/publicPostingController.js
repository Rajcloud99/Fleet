var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var winston = require('winston');

var userService = Promise.promisifyAll(commonUtil.getService('user'));
var interestShownService = Promise.promisifyAll(commonUtil.getService('interestShown'));
var postingService = Promise.promisifyAll(commonUtil.getService('posting'));
router.post('/show_interest',function(req, res, next) {
	userService.getUserByUSERIDAsync(req.body.mobile)
	 .then(function(user){
	   var oParams = {"postingId":req.body.postingId};
		 postingService.getPostingsByParamsAsync(oParams)
		 .then(function(truckPosting){
			 if (truckPosting[0] === false) return {"verified": false, "message": "No such truck post exists"};
//			 else if(truckPosting[0].date && new Date(truckPosting[0].date.from) < new Date()) {
//					return {"verified" : false, "message": "RegisteredVehicle post outdated. Please contact at +919891705019"};
//			  }
			 else if(user && truckPosting[0].userId && truckPosting[0].userId.toString() == user._id) {
				return {"verified" : false, "message": "user is same for posting and interest"};
				}
			 else if(truckPosting[0].verified !='pending'){
				 if(user && truckPosting[0].interested_to && truckPosting[0].interested_to.length>=1) {
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
       }).then(function(post){
			if(post.verified){
				 req.body.postingId = post.postingId;
				 req.body.interestId = "I"+post.postingId;
				 req.body.source = post.source;
				 req.body.destination = post.destination;
				 req.body.posted_UId = post.userId;
				 req.body.posting = post._id;
				 req.body.type = post.type;
				 req.body.quote_prices = [req.body.expected_price];
				 req.body.deal_price_interest = req.body.expected_price;
				 req.body.deal_price_posting = post.expected_price;
				 req.body.counter_quotes = [post.expected_price];
				 req.body.post_email = post.email;
				 req.body.post_mobile = post.mobile;
				 if(!user){
					 req.body.isRegisteredCustomer = false;
					 var newOtp = smsUtil.generateOtp();
					 req.body.otp = newOtp;
						//check no of earlier attempts
					 req.body.nOtp = 1;
				 }else{
					 req.body.isRegisteredCustomer = true;
					 req.body.userId = user._id;
				 }
				return interestShownService.addInterestShownAsync(req.body)
			 }else{
				return post;
			 }}).then(function(interestShown) {
				 if(interestShown && interestShown.verified == false){
					 return interestShown;
				 }else if(interestShown[0].interestId){
					var updatePosting = {"pushToArr" :{'interested_to': {'$each' :[interestShown[0]._id]}}};
					req.body.interestshow_mongo_id = interestShown[0]._id;
					req.body.interestId = interestShown[0].interestId;
				    	return postingService.updatePostingInterestAsync(req.body.posting,updatePosting);
				 }
	      }).then(function(updatedPostingInterest) {
				 if(updatedPostingInterest && updatedPostingInterest.verified == false){
					 return res.status(500).json(updatedPostingInterest);
				 }else if(updatedPostingInterest.postingId){
				         if(user){
				        	 var susr = user.owner_name?user.owner_name:"";
								var message = 'Thank you ' + susr + ' for showing interest in '+req.body.type+' post at www.futuretrucks.in ' + updatedPostingInterest.postingId +" Your qoute price is " +
								req.body.expected_price+" Download our android application from  https://goo.gl/khpPCW";
								if(req.body.mobile){smsUtil.sendSMS(req.body.mobile,message);}
								 if(user.email){
								   var mailOptions = {
										    to: user.owner_name+ ' ✔ <'+user.email+'>', // list of receivers 
										    subject: 'Your Interest on '+req.body.type+' Post.✔ '+updatedPostingInterest.postingId, // Subject line 
										    text: 'Welcome from Future Trucks✔', // plaintext body 
										    html: '<br>'  +message+ '<br>'// html body 
										};
									emailUtil.sendMail(mailOptions);
								   }
								  var post_message = user.owner_name + ' has shown interest on your '+ req.body.type+' post at www.futuretrucks.in ' + updatedPostingInterest.postingId +" qoute price is " +
								req.body.expected_price  +" Download our android application from  https://goo.gl/khpPCW";
								  if(req.body.post_mobile){smsUtil.sendSMS(req.body.post_mobile,post_message);}
								  if(req.body.post_email){
									   var mailOptions = {
											    to:  req.body.type+' post owner ✔ <'+req.body.post_email+'>', // list of receivers 
											    subject: 'New Interest shown on '+req.body.type+' Post.✔ '+updatedPostingInterest.postingId, // Subject line 
											    text: 'Welcome from Future Trucks✔', // plaintext body 
											    html: '<br>'  +post_message+ '<br>'// html body 
											};
										emailUtil.sendMail(mailOptions);
										console.log('email send to post owner',post_message);
									   }
						   var resp = {"status": "OK",'loginRequired': true,"message":"Interest posting done. Its under verification. Please login now.",'interestId':req.body.interestId};
						   console.log(resp);
						   return res.status(200).json(resp);
					 }else{
							 var message = 'OTP : '+req.body.otp+' for posting id' + updatedPostingInterest.postingId +" Download our android application from  https://goo.gl/khpPCW";
							 smsUtil.sendSMS(req.body.mobile,message);
							 var resp = {"status": "OK","message":"your mobile no is not registered. Plese verify by sending otp.","interest_id":req.body.interestshow_mongo_id};
							 console.log(resp);
						     return res.status(200).json(resp);
					 }
					
				 }
	      }).catch(next);
    })
});
router.post(
		'/interest_otp_verification',
		function(req, res, next) {
			var oInterestId = {'_id':req.body.interest_id,'mobile':req.body.mobile};
			interestShownService.getInterestShownsByParamsAsync(oInterestId)
			      .then(function(interestShown) {
			    			if(interestShown && interestShown[0]){
								var isOk = smsUtil.verifyOTP(req.body.otp,interestShown[0].otp);
								if(isOk.verified){
									//send confirmation msg to booker
									//send confirmation and mail to poster
								     return res.status(200).json({'status':'OK',"isOTP_matched":true,"postingId":interestShown[0]._id,"message":"your booking done successfully.Wait for our Executive's call or SIGN UP."});
								}else{
									return res.status(200).json({'status':'OK',"isOTP_matched":false,"message":"OTP does not match. Please re enter it or resend OTP."});
								}
							}else{
								return res.status(200).json({'status':'OK',"message":"No interest posting found for given mobile no or interest Id"});
							}
						}
					).catch(next);
			});
router.post('/interest_otp_resend',function(req, res, next) {
			var oInterestId = {'_id':req.body.interestId,'mobile':req.body.mobile};
			interestShownService.getInterestShownsByParamsAsync(oInterestId)
			      .then(
						function(interestShown) {
							if(interestShown && interestShown[0]){
								var newOtp = smsUtil.generateOtp();
								newDetails = {otp:newOtp,nOtp:interestShown[0].nOtp++};
								interestShownService.updateInterestShownAsync(interestShown[0]._id,newDetails)
								.then(function(interestUpdated){
									var message = 'New OTP : '+ interestUpdated.otp +' for booking.';
									smsUtil.sendSMS(interestUpdated.mobile,message);
									console.log(message);
									return res.status(200).json({'status':'OK',"interestId":interestUpdated._id,"message":"new otp sent to mobile :"+interestUpdated.mobile});
							  });
							
							}else{
								return res.status(200).json({'status':'OK',"message":"No interest posting found for given mobile no or interest Id"});
							}
						}
					).catch(next);
			});
router.post('/',function(req, res, next) {
			userService.getUserByUSERIDAsync(req.body.mobile)
			.then(function(user) {
             	if(user == null){
					//validate no to detect fraud
					req.body.isRegisteredCustomer = false;
					var newOtp = smsUtil.generateOtp();
					req.body.otp = newOtp;
					//check no of earlier attempts
					req.body.nOtp = 1;
					return  postingService.addPostingAsync(req.body);
				}else if(user.type == 'transporter' || user.type == 'aggregator'){
				   return {"userExist": true,"isNotCustomer" : true,'type': user.type};
				}else if(user.type == 'customer'){
					return {"userExist": true ,"isNotCustomer" : false,'type': user.type};
				}}).then(function(posting) {
					if(posting && posting.userExist && req.body.type == "truck" && !posting.isNotCustomer){
						res.status(200).json({"status": "OK","userExist":true,'type':posting.type,"message":"User type is not transpoter or aggregator."});
					}else if(posting && posting.userExist){
						res.status(200).json({"status": "OK","userExist":true,'type':posting.type,"message":"User exist with provided mobile no.Please Enter Password to login"});
					}else if(posting && posting[0]){
						var message = 'OTP for '+posting[0].type+ ' Posting is : ' + req.body.otp ;
					    smsUtil.sendSMS(req.body.mobile,message);
						console.log(message);
						message = posting[0].type + ' posting from new customer : ' + posting[0].mobile +'<br> posting id :'+ posting[0].postingId;
					    console.log(message);
					    var mailOptions = {
							    to: 'Future Trucks ✔ <info@futuretrucks.in>', // list of receivers 
							    subject: 'New Public '+posting[0].type+ ' Post.✔', // Subject line 
							    text: 'Welcome from Future Trucks✔', // plaintext body 
							    html: '<br>'  +message+ '<br>'// html body 
							};
						emailUtil.sendMail(mailOptions);
						smsUtil.sendSMS(commonUtil.getConfig('mobile_ft'),message);
						return res.status(200).json({"status": "OK","userExist":false,"postingId": posting[0].postingId,"message":"User does not exist.Please Verify OTP."});
					}
				})
			.catch(function(err) {
						winston.error(err.toString());
						next(err);
					});
		}
	);

router.post('/posting_otp_verification',function(req, res, next) {
			var oPostingId = {'postingId':req.body.postingId,'mobile':req.body.mobile};
			postingService.getPostingsByParamsAsync(oPostingId)
			      .then(
						function(loadPost) {
							if(loadPost && loadPost[0]){
								var isOk = smsUtil.verifyOTP(req.body.otp,loadPost[0].otp);
								if(isOk.verified){
								     return res.status(200).json({'status':'OK',"isOTP_matched":true,"postingId":loadPost[0].postingId,"message":"Load Posting done successfully.Wait for our Executive's call or SIGN UP."});
								}else{
									return res.status(200).json({'status':'OK',"isOTP_matched":false,"message":"OTP does not match. Please re enter it or resend OTP."});
								}
							}else{
								return res.status(200).json({'status':'OK',"message":"No load posting found for given mobile no or posting Id"});
							}
						}).catch(next);
			});
router.post('/posting_otp_resend',function(req, res, next) {
			var oPostingId = {'postingId':req.body.postingId,'mobile':req.body.mobile};
			postingService.getPostingsByParamsAsync(oPostingId)
			      .then(
						function(loadPost) {
							if(loadPost && loadPost[0]){
								var newOtp = smsUtil.generateOtp();
								newDetails = {otp:newOtp,nOtp:loadPost[0].nOtp++};
								console.log('newDetailsload post',newDetails);
								loadPostingService.updateLoadPostingAsync(loadPost[0]._id,newDetails)
								.then(function(loadPostUpdated){
								    var message = 'OTP for Load Posting is : '+loadPostUpdated.otp ;
									smsUtil.sendSMS(truckPostUpdated.mobile,message);
									console.log(message);
									return res.status(200).json({'status':'OK',"postingId":loadPostUpdated.postingId,"message":"new otp sent to mobile :"+loadPostUpdated.mobile});
							  });
							
							}else{
								return res.status(200).json({'status':'OK',"message":"No load posting found for given mobile no or posting Id"});
							}
						}).catch(next);
			});

module.exports = router;