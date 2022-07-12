var express = require('express');
var router = express.Router();
var Promise  = require('bluebird');
var winston = require('winston');
var passport = require('passport');
var loadPostingService = Promise.promisifyAll(commonUtil.getService('loadPosting'));

router.get('/:app_key', function (req, res) {
		if(req.params['app_key'] ==commonUtil.getConfig('app_public_api')){
		loadPostingService.getAllLoadPostingsAsync(req)
		.then(
			function(loads) {
				winston.info('in routes succes');
				res.status(200).json({'status': 'OK','data':loads});
			},
			function(err) {
				winston.error("Error in cities route: "+err);
				res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
			}
		);
		}
		else{
			res.status(500).json({'status': 'ERROR', 'error_messages': "app_key is not correct"});
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
		}else{
			req.query = {'userId':user._id};
		}
	req.userPosting = true;
	loadPostingService.getAllLoadPostingsAsync(req)
	.then(
		function(loads) {
			winston.info('in routes succes');
			res.status(200).json({'status': 'OK','data':loads});
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

router.post('/',
 function(req, res, next) {
  passport.authenticate('jwt',
  function(error, user, info) {
	 if (error){
	   return next(error); 
   } 
	req.body.userId = user._id;
	req.body.verified = 'active';
	loadPostingService.addLoadPostingAsync(req.body)
    .then(
      function() {
        return res.status(200).json({"status": "OK","message":"Load posting done. Its under verification."});
      }
    )
    .catch(next);
  })(req, res, next);
}
);

router.put('/:owner_id',
  passport.authenticate('jwt'),
  function (req, res, next) {
    loadPostingService.updateLoadPostingAsync(req.params.owner_id, req.body)
    .then(
      function() {
        return res.status(200).json({"status": "OK"});
      }
    )
    .catch(next);
  }
);

router.delete('/:owner_id',
  passport.authenticate('jwt'),
  function(req, res, next) {
    loadPostingService.removeLoadPostingAsync({"_owner": req.params.owner_id })
    .then(
      function() {
        return res.status(200).json({ "status": "OK" });
      }
    )
    .catch(next);
  }
);
module.exports = router;
