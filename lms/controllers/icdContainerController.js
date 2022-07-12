var express = require('express');
var router = express.Router();
var Promise  = require('bluebird');
var winston = require('winston');
var passport = require('passport');

var icdContainerService = Promise.promisifyAll(commonUtil.getService('icdContainer'));
var icdShowInterestService = Promise.promisifyAll(commonUtil.getService('icdShowInterest'));

//***************************************************************************************************
router.get('/:app_key', function (req, res) {
	if(req.params['app_key'] ==commonUtil.getConfig('app_public_api')){
	icdContainerService.getAllContainerPostingsAsync(req)
	.then(
		function(container) {
			remoteClientUtil.getRemoteIpAddress(req,"get postigs publicly");
			winston.info('in routes succes');
			res.status(200).json({'status': 'OK','data':container.data , 'no_of_pages':container.no_of_pages});
		},
		function(err) {
			winston.error("Error in truck retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		});
	}else{
		res.status(500).json({'status': 'ERROR', 'error_messages': "application secure key is not correct"});
	}});
//***************************************************************************************************
router.get('/', function (req, res, next) {
	 passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error); 
	    }
	if(user){
		if(req.query && req.query.otherCustomers){
			req.query.otherCustomers = user._id;
		}else{
			req.query = {'userId':user._id};
		}
	req.userPosting = true;
	icdContainerService.getAllContainerPostingsAsync(req)
	.then(
		function(container) {
			winston.info('in routes succes');
			res.status(200).json({'status': 'OK','data':container.data , 'no_of_pages':container.no_of_pages});
		},
		function(err) {
			winston.error("Error in load retrieval route: "+err);
			res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
		}).catch(next);
	 }else{
		 res.status(200).json({'status': 'OK','message':'Un-Authorised User.'});
	 }
	 })(req, res, next);
});




//***************************************************************************************************

router.put(
	'/approveContainer/:interestId',
function(req, res, next) {
		passport.authenticate(
			'jwt',
			
				function (err, user, info) {
				if (err){
		   			return next(err); 
	    		}
	    		if (!user) return res.status(401).json(info);
	    		if((user.type== 'sl')||(user.type== 'cha')){
	    			return next();
	    		}

				}
		)(req, res, next);
	},
	function(req, res, next) {
		
	icdShowInterestService.getICDinterestedByInterestIdAsync({"interestId":req.params.interestId})

	.then(function(availableContainer){
		if(availableContainer){
			setOninterestId = req.params.interestId;
			
			icdShowInterestService.approveByUserInterestAsync(setOninterestId)
			.then(function(approved){
				return res.status(200).json(approved);
			})


		}
	})
	.catch(function(err){
		winston.info("Error: " + err);
		return next(err);
	})
});

//***************************************************************************************************
router.post('/',
 function(req, res, next) {
  passport.authenticate('jwt',
  function(error, user, info) {
	 if (error){
	   return next(error); 
   } 

   	if((user.type== 'sl')||(user.type== 'cha')){
   		if(req.body.containers.length>0){
   			for(i=0;i<req.body.containers.length;i++){
	    	   				if((req.body.containers[i].posted_container>=0)){
	    	   					req.body.containers[i].remaining_container = req.body.containers[i].posted_container;
	    	   				}
	    	   			}
   		
   		req.body.userId = user._id;
		req.body.verified = 'active';
   		req.body.post_owner_mobile = user.mobile ;
   		req.body.post_owner_email = user.email ;
   		req.body.post_owner_name = user.owner_name ;
   		req.body.post_owner_company = user.company_name ;
	    
	    }
	    return icdContainerService.addContainerPostingAsync(req.body)
	    
	.then(
      function(Posting) {
      	var pMobile = Posting[0].mobile || user.mobile;
      	var fromPortCode="",fromPortName="",toPortCode="",toPortName="";

      	if(Posting[0].source && Posting[0].source.port_code){
			  fromPortCode = Posting[0].source.port_code;
		}
      	if(Posting[0].source && Posting[0].source.port_name){
			  fromPortName = Posting[0].source.port_name;
		}

		if(Posting[0].destination && Posting[0].destination[0] && Posting[0].destination[0].port_code){
			  toPortCode = Posting[0].destination[0].port_code;
		}
      	if(Posting[0].destination && Posting[0].destination[0] && Posting[0].destination[0].port_name){
			  toPortName = Posting[0].destination[0].port_name;
		}

		




      	var message = Posting[0].type + ' posting from ' + user.owner_name+ ' ( '+ user.company_name +')' +' ' + pMobile +' posting id : '+ Posting[0].postingId +' from ICD Port '+
			                	fromPortCode +' - '+fromPortName + ', to ICD Port '+ toPortCode + ' - '+toPortName+' at futuretrucks.in. For any help call us at 9891705019. Download our android application from  https://goo.gl/khpPCW';

		var mobileNum = req.body.mobile || user.mobile;
			smsUtil.sendSMS(mobileNum,message);
		if(user.email){
			var mailOptions = {
								 to: user.owner_name+' ✔ <'+ user.email+'>', 
								 subject: 'New  '+Posting[0].type+' Post.✔', 
								 text: 'Welcome from Future Trucks✔', 
								 html: '<br>'  +message+ '<br>'
							  };
				emailUtil.sendMail(mailOptions);
			}
		res.status(200).json({"status": "OK", "data":Posting[0], "message":"Container posting done. Its under verification."});
      }
    )
	
    .catch(next);
  }
  else{
  		 res.status(200).json({'status': 'OK','message':'Only SL or CHA can post container'});
	  }
	 	  })(req, res, next);
});


module.exports = router;