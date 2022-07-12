var router = require('express').Router();
var Promise = require('bluebird');
var passport = require('passport');
var winston = require('winston');
var multer = require('multer');
var path = require('path');

var icdContainerService = Promise.promisifyAll(commonUtil.getService('icdContainer'));
var icdShowInterestService = Promise.promisifyAll(commonUtil.getService('icdShowInterest'));

var icdAdminShowInterestService = Promise.promisifyAll(commonUtil.getService('icdContainerAdmin'));

var truckService = Promise.promisifyAll(commonUtil.getService('truck'));
var driverService = Promise.promisifyAll(commonUtil.getService('driver'));


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
       		
				icdShowInterestService.getAllInterestShownAsync(req)
				
			
	.then(
		function(icdShowInterest) {

			if(icdShowInterest){

				var icdShowInterestData = icdShowInterest;
				
				res.status(200).json({'status': 'OK','data': icdShowInterestData.data , "no_of_pages":icdShowInterestData.no_of_pages});
				
				}
				else{
    	  			 return {'status': 'ERROR',"error_message":"your do not have any interest icd Container."};
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
	'/uploadDocs',
function(req, res, next) {
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

	/*multer(
		{
				"dest" : path.join(projectHome,"files","users"),
				"limits": {
					"files": 12
				},
				"putSingleFilesInArray": true,
				"rename" : function (fieldname, filename, req, res) {
					var timeStamp = new Date().getTime();
					//Driver File Name

					if(fieldname == "driver_image"){
						return fieldname + "_" + req.body.driver_id + "_" + timeStamp;
					}
					else if(fieldname == "dr_licence_doc"){
						return fieldname + "_" + req.body.driver_id + "_" + timeStamp;
					}
					else if(fieldname == "address_proof_doc"){
						return fieldname + "_" + req.body.driver_id + "_" + timeStamp;
					}
					else if(fieldname == "police_verification_doc"){
						return fieldname + "_" + req.body.driver_id + "_" + timeStamp;
					}

					//RegisteredVehicle File Name
					else if(fieldname == "license_doc"){
						return fieldname + "_" + req.body.truck_id + "_" + timeStamp;
					}
					else if(fieldname == "RC_book_doc"){
						return fieldname + "_" + req.body.truck_id + "_" + timeStamp;
					}
					else if(fieldname == "road_tax_doc"){
						return fieldname + "_" + req.body.truck_id + "_" + timeStamp;
					}
					else if(fieldname == "insuarance_doc"){
						return fieldname + "_" + req.body.truck_id + "_" + timeStamp;
					}
					else if(fieldname == "fitness_certificate_doc"){
						return fieldname + "_" + req.body.truck_id + "_" + timeStamp;
					}
					else if(fieldname == "permit_doc"){
						return fieldname + "_" + req.body.truck_id + "_" + timeStamp;
					}
					else if(fieldname == "vehicle_image"){
						return fieldname + "_" + req.body.truck_id + "_" + timeStamp;
					}
					else if(fieldname == "chassis_trace"){
						return fieldname + "_" + req.body.truck_id + "_" + timeStamp;
					}

				},
				"onFileUploadStart" : function (file) {
					var doc_mimes = "image/jpeg image/bmp image/png application/pdf";
					var image_mimes =  "image/jpeg image/bmp image/png";
					var allowedMimes = "";
					if (file.fieldname == "driver_image" ||file.fieldname == "vehicle_image" || file.fieldname == "chassis_trace") allowedMimes = image_mimes.split(" ");
					if (file.fieldname == "dr_licence_doc" || file.fieldname == "address_proof_doc" || file.fieldname == "police_verification_doc"||file.fieldname == "license_doc" || file.fieldname == "RC_book_doc"  || file.fieldname == "road_tax_doc"|| file.fieldname == "insuarance_doc"|| file.fieldname == "chassis_trace" || file.fieldname == "fitness_certificate_doc" || file.fieldname == "permit_doc") {
						allowedMimes = doc_mimes.split(" ");
					}
					if (allowedMimes.indexOf(file.mimetype) < 0) {
						return false;
					}
					else {
						return true
					}
				},
				"onFileUploadComplete" : function (file, req, res) {
					if (file.fieldname == "driver_image") req.driver={newDriverImage : file.name};
					else if (file.fieldname == "dr_licence_doc") req.driver={newdrLicense : file.name};
					else if (file.fieldname == "address_proof_doc") req.driver={newAddrProof : file.name};
					else if (file.fieldname == "police_verification_doc") req.driver={newPolicaVar : file.name};
					
					else if (file.fieldname == "vehicle_image") req.truck={newVehicleImage : file.name};
					else if (file.fieldname == "license_doc") req.truck={newLicense : file.name};
					else if (file.fieldname == "RC_book_doc") req.truck={newRcBook : file.name};
					else if (file.fieldname == "road_tax_doc") req.truck={newRoadTax : file.name};
					else if (file.fieldname == "insuarance_doc") req.truck={newInsuarance : file.name};
					else if (file.fieldname == "chassis_trace") req.truck={newChassis : file.name};
					else if (file.fieldname == "fitness_certificate_doc") req.truck={newFitnessCerti : file.name};
					else if (file.fieldname == "permit_doc") req.truck={newPermit : file.name};
                  }
			}
	),*/
	function(req, res, next) {

			
		// fill out Driver
		if(typeof(req.driver)!=="undefined"){
			if (typeof(req.driver.newDriverImage) !== "undefined") req.body.driver_image = req.driver.newDriverImage;
			if (typeof(req.driver.newdrLicense) !== "undefined") req.body.dr_licence_doc = req.driver.newdrLicense;
			if (typeof(req.driver.newAddrProof) !== "undefined") req.body.address_proof_doc = req.driver.newAddrProof;
			if (typeof(req.driver.newPolicaVar) !== "undefined") req.body.police_verification_doc = req.driver.newPolicaVar;
			
				return driverService.updateDriverAsync(req.body.driver_id, req.body)
				.then(function(succData) {
			  
		    	return res.status(200).json({"status": "OK","data":succData});
		       }

			)
		}

		// fill out RegisteredVehicle
		else if(typeof(req.truck)!=="undefined"){
			if (typeof(req.truck.newVehicleImage) !== "undefined") req.body.vehicle_image = req.truck.newVehicleImage;
			if (typeof(req.truck.newLicense) !== "undefined") req.body.license_doc = req.truck.newLicense;
			if (typeof(req.truck.newChassis) !== "undefined") req.body.chassis_trace = req.truck.newChassis;
			if (typeof(req.truck.newRcBook) !== "undefined") req.body.RC_book_doc = req.truck.newRcBook;
			if (typeof(req.truck.newRoadTax) !== "undefined") req.body.road_tax_doc = req.truck.newRoadTax;
			if (typeof(req.truck.newInsuarance) !== "undefined") req.body.insuarance_doc = req.truck.newInsuarance;
			if (typeof(req.truck.newFitnessCerti) !== "undefined") req.body.fitness_certificate_doc = req.truck.newFitnessCerti;
			if (typeof(req.truck.newPermit) !== "undefined") req.body.permit_doc = req.truck.newPermit;
		
				return truckService.updateTruckAsync(req.body.truck_id, req.body)
			
	
			.then(function(succData) {
			  
		    	return res.status(200).json({"status": "OK","data":succData});
		       }

			)
		.catch(next);
	}});




router.put(
	'/approveContainer/:interestId',
function(req, res, next) {
		console.log('update Admin Driver',req.body);
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
		
	icdShowInterestService.getICDinterestedByInterestIdAsync({"interestId":req.params.interestId})

	.then(function(availableContainer){
		if(availableContainer){
			setOninterestId = req.params.interestId;
			
			icdShowInterestService.approveByAdminInterestAsync(setOninterestId)
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

//******************************************************************************
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

				if((user.type == 'ft_admin')&&(user.role == 'superAdmin')){
					var oParams = {"postingId":req.params.posting_id};
			    	icdAdminShowInterestService.getPostingsByIdAsync(oParams)
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

			icdAdminShowInterestService.updatePostingAsync(req.params.posting_id,toUpdate)
		
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
//****************************************************************************************
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
			    	icdAdminShowInterestService.getPostingsByIdAsync(oParams)
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
			icdAdminShowInterestService.deletePostingAsync(req.params.posting_id)
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
//****************************************************************************************


module.exports = router;