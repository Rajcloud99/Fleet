var express = require('express');
var router = express.Router();
var passport = require('passport');
var Promise = require('bluebird');

var postingAdminService = Promise.promisifyAll(commonUtil.getService('postingAdmin'));

router.put(
	'/:posting_id',
	function(req, res, next) {
		console.log('update Admin User',req.body);
			passport.authenticate(
			'jwt',
			
				function (err, user, info) {
				if (err) return next(err);
				if (!user) return res.status(401).json(info);
			    if(user.type != 'ft_admin'){
		    	return res.status(401).json({'status': 'You are not an admin'});
				}	
				if((user.role != 'updateAdmin')&&(user.role != 'superAdmin')){
					return res.status(401).json({'status': 'You do not have update privilege'});
				}

				if((user.type == 'ft_admin')&&((user.role == 'updateAdmin')||(user.role == 'superAdmin'))){
					var oParams = {"postingId":req.params.posting_id};
			    	postingAdminService.getPostingsByIdAsync(oParams)
			    	.then(function(posting){
			    		if(posting){
			    			return next();
			    		}
			    		else{
			    				res.status(404).json({'status': 'ERROR','message':'No Posting found on this Posting ID'});
			    			}

			    	}).catch(next);
				
				}
			}
		)(req, res, next);
	},

	
	function(req, res, next) {
		if(Object.getOwnPropertyNames(req.body).length>0){
			toUpdate = {};
			toUpdate = req.body;

			postingAdminService.updatePostingAsync(req.params.posting_id,toUpdate)
		
			.then(function(posting){
			if(posting){
				return res.status(200).json(posting);
			}
			else{
		    	return res.status(400).json({'status': 'ERROR',"error_message":"your Status not updated."});
		       }

		}).catch(next);
		}else{
				return res.status(400).json({'status': 'ERROR',"error_message":"Nothing to update."});
			}
	}
);
//********************************************************************************************************
router.delete(
	'/:posting_id',
	function(req, res, next) {
		console.log('update Admin User',req.body);
			passport.authenticate(
			'jwt',
			
				function (err, user, info) {
				if (err) return next(err);
				if (!user) return res.status(401).json(info);
			    if(user.type != 'ft_admin'){
		    	return res.status(401).json({'status': 'You are not an admin'});
				}	
				if(user.role != 'superAdmin'){
					return res.status(401).json({'status': 'You do not have delete privilege'});
				}

				if((user.type == 'ft_admin')&&((user.role == 'updateAdmin')||(user.role == 'superAdmin'))){
					var oParams = {"postingId":req.params.posting_id};
			    	postingAdminService.getPostingsByIdAsync(oParams)
			    	.then(function(posting){
			    		if(posting){
			    			return next();
			    		}
			    		else{
			    				res.status(404).json({'status': 'ERROR','message':'No Posting found on this Posting ID'});
			    			}

			    	}).catch(next);
				
				}
			}
		)(req, res, next);
	},

	
	function(req, res, next) {
		if((req.params)&&(req.params.posting_id)){
			postingAdminService.deletePostingAsync(req.params.posting_id)
			.then(function(posting){
			if(posting){
				return res.status(200).json({'status': 'OK',"message":"your post deleted."});
			}
			else{
		    	return res.status(400).json({'status': 'ERROR',"error_message":"your status not updated."});
		       }

		}).catch(next);
		}else{
				return res.status(400).json({'status': 'ERROR',"error_message":"Nothing to update."});
			}
	}
);
//********************************************************************************************************

module.exports = router;