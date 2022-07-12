var express = require('express');
var router = express.Router();
var passport = require('passport');
var Promise = require('bluebird');


var interestShownAdminService = Promise.promisifyAll(commonUtil.getService('interestShownAdmin'));

router.get('/', function (req, res, next) {
	 passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error); 
	    }
	   if(user.type == 'ft_admin')
       {

       	if((user.role == 'showAdmin') || (user.role=='updateAdmin') || (user.role=='superAdmin'))
       	{
       		
			interestShownAdminService.getAllInterestShownAsync(req)
			.then(function(interestShown) {

				if(interestShown){

					res.status(200).json({'status': 'OK','data': interestShown.data , "no_of_pages":interestShown.no_of_pages});
				
				}
				else{
    	  			 return {'status': 'ERROR',"error_message":"databse does not have any interests data."};
    		 	}
		})
	.catch(next);
	 }else{
		 res.status(200).json({'status': 'OK','message':'You do not have admin privilege'});
	 	  }
       }else{
  		 res.status(200).json({'status': 'OK','message':'You are not an Admin'});
	 	  }
	 })(req, res, next);
});


router.put(
	'/:bookingId',
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
					return next();
				}
			}
		)(req, res, next);
	},

	
	function(req, res, next) {

		if(req.body.truck_driver_details){
			oUpdate={};
			oUpdate.objectId = req.body.truck_driver_details._id;
			oUpdate.current_location = req.body.truck_driver_details.current_location;
			
			bookingAdminService.pushCurrentLocationByBookingIdAsync(req.params.bookingId, oUpdate)
			.then(function(booking){
				if(req.body.status){
					var updateObject = {};
					updateObject.status = req.body.status;
					
					bookingAdminService.updateBookingAsync(req.params.bookingId, updateObject)
					.then(function(booking){
						if(booking){
						return res.status(200).json({"status": "OK","data":booking});
						}
					})

				}else{
					return res.status(200).json({"status": "OK","data":booking});
				}
			})
		}
		else if(req.body.status){
					var updateObject = {};
					updateObject.status = req.body.status;
					
					bookingAdminService.updateBookingAsync(req.params.bookingId, updateObject)
					.then(function(booking){
						if(booking){
						return res.status(200).json({"status": "OK","data":booking});
						}

					}).catch(next);

		}

		else{
		    	return {'status': 'ERROR',"error_message":"your data not updated."};
		    }
		 
	});

module.exports = router;
