var router = require('express').Router();
var Promise = require('bluebird');
var passport = require('passport');
var winston = require('winston');
var multer = require('multer');
var path = require('path');
var notificationService = Promise.promisifyAll(commonUtil.getService('notification'));
var truckService = Promise.promisifyAll(commonUtil.getService('truck'));
var truckAdminService = Promise.promisifyAll(commonUtil.getService('truckAdmin'));

var allowedFilter = ['multi_axl','truck_type','body_type','owner_name','capacity','brand','reqd_service','refrigeration'];
var allowedParams = ['sortby'];
var isAllowedFilter  = function(sFilter){
	var isAllowed = false;
	if(allowedFilter.indexOf(sFilter)>0){
		isAllowed =  true;
	}
	return isAllowed;
 };
var isAllowedParam = function(sParam){
	var isAllowedP = false;
	if(allowedParams.indexOf(sParam)>0){
		isAllowedP =  true;
	}
	return isAllowedP;
 };
var constructFilters = function(query){
	var fFilter = {};
	for(i in query){
		if(isAllowedFilter(i)){
			fFilter[i] = query[i];
		}
	}
	return fFilter;
 };
var constructParams = function(query){
	
 };
function prepareNotification(truck,user){
	if(user.devices && user.devices.length>0){
		var registrationTokens = [];
		for(var i=0; i<user.devices.length;i++){
			registrationTokens.push(user.devices[i].token);
		}
	}
    var oNotification = {
    	"userId":user._id,
	    "users":[user._id],
	    "data": {	     
         "entityId" : truck.TRUCKID,
         "entityType":"truck",
         "message":truck.license_plate_num + " is registered at futuretrucks.in. For any help call us at 9891705019."
         },
	 "notification": {
		 "title": "You register a new truck.",
		 "icon": "ic_launcher",
		 "body": truck.license_plate_num + " is registered."
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
router.post('/',
	function (req, res, next) {
	console.log('request payload for truck registration',JSON.stringify(req.body));
		passport.authenticate(
			'jwt',
			function (err, user, info) {
				if (err) return res.status(401).json(info);
				if (user === false) return res.status(401).json({"status":"ERROR", "error_message":"User not found"});
				// user verified
				truckService.registerTruckAsync(req.body, user._id)
				.then(function(truck) {
					   var sGreetings = "Dear " + user.owner_name + ",";
					   var sBody = " Your vehicle " +truck.license_plate_num + "  is pending for verification. Visit futuretrucks.in or call +919891705019 for more details.";
					   var sSMS = sGreetings + sBody;
					  // smsUtil.sendSMS(user.mobile,sSMS);
					   if(user.email){
						  var sEmailMessage = "<b>" + sGreetings + "</b> <br>"  + sBody;
						  var mailOptions = {
							    to: user.owner_name+ ' ✔ <'+user.email+'>',
					    	    subject: 'new RegisteredVehicle Registration at Future Trucks.✔', 
							    text: 'Welcome from Future Trucks✔',  
							    html: '<br>'+sEmailMessage+'<br>' 
							};
						 emailUtil.sendMail(mailOptions);
						 prepareNotification(truck,user);
				}
				if(truck)
      			{
      		 		res.status(200).json({"status": "OK","truck":truck});
	    		}

	   		    else{
	    			 res.status(500).json({"status": "ERROR","message":"RegisteredVehicle registration failed"});
	   			 }
			
		})
		.catch(next);
	})(req, res, next);

 });
router.get('/',
	function (req, res, next) {
	console.log('query',req.query);
		passport.authenticate (
			"jwt",
			function (err, user, info) {
				if (err) return res.status(401).json(info);
				if (user === false) return res.status(401).json(info);
				var ffFilters = constructFilters(req.query);
				ffFilters.userId = user._id;
				truckService.getTrucksAsync(ffFilters)
				.then(
					function (truckArray) {
						return res.status(200).json(truckArray);
					}
				)
				.catch(next);
			}
		)(req, res, next);
	}
 );
//*******************************************************************************************************
router.get('/:truckID',
	function (req, res, next) {
		passport.authenticate(
			'jwt',
			function (err, user, info) {
				if (err || user === false) return res.status(401).json(info);
				// user verified
				truckService.getTruckByIDAsync(req.params.truckID)
				.then(
					function (truck) {
						return res.status(200).json(truck);
					}
				)
				.catch(next);
			}
		)(req, res);
	}
);
//*******************************************************************************************************

router.put('/:truck_id',
	function(req, res, next) {
		console.log('request payload for truck update',JSON.stringify(req.body));
		passport.authenticate(
			'jwt',
			function (err, user, info) {
				if (err) return next(err);  // check error
				if (!user) return res.status(401).json(info); // check for user exists from  token
				truckService.findTruckAsync(req.params.truck_id)
				.then(function (truck) {
					// check for truck exists
					if (truck === false) return res.status(500).json({"status": "ERROR", "error_message": "No such truck"});
                	// check for truck user matches user (truck permission)
					if (truck.userId.toString() != user._id.toString()) {
						return res.status(401).json({"status" : "ERROR", "error_message": "Unauthorized route"});
					}
					req.truck = truck;
					req.user = user;
					return next();
				})
				.catch(next);
			}
		)(req, res, next);
	},
	/*multer(
		{
			"dest" : path.join(projectHome,"files","users"),
			"limits": {
				"files": 10
			},
			"putSingleFilesInArray": true,
			"rename" : function (fieldname, filename, req, res) {
				var timeStamp = new Date().getTime();
				console.log(fieldname + "_" + req.params.truck_id + "_" + timeStamp);
				return fieldname + "_" + req.params.truck_id + "_" + timeStamp;
			},
			"onFileUploadStart" : function (file) {
				var doc_mimes = "image/jpeg image/bmp image/png application/pdf";
				var image_mimes =  "image/jpeg image/bmp image/png";
				console.log('upload1',file);
				var allowedMimes = "";
				if (file.fieldname == "license_doc" || file.fieldname == "RC_book_doc"  || file.fieldname == "road_tax_doc"|| file.fieldname == "insuarance_doc"|| file.fieldname == "chassis_trace_doc" || file.fieldname == "fitness_certificate_doc" || file.fieldname == "permit_doc") {
					allowedMimes = doc_mimes.split(" ");
				}
				else if (file.fieldname == "vehicle_image" || file.fieldname == "chassis_trace") {
					allowedMimes = image_mimes.split(" ");
				}
				
				if (allowedMimes.indexOf(file.mimetype) < 0) return false;
			},
			"onFileUploadComplete" : function (file, req, res) {
				if (file.fieldname == "vehicle_image") req.truck.newVehicleImage = file.name;
				else if (file.fieldname == "license_doc") req.truck.newLicense = file.name;
				else if (file.fieldname == "RC_book_doc") req.truck.newRcBook = file.name;
				else if (file.fieldname == "road_tax_doc") req.truck.newRoadTax = file.name;
				else if (file.fieldname == "insuarance_doc") req.truck.newInsuarance = file.name;
				else if (file.fieldname == "chassis_trace") req.truck.newChassis = file.name;
				else if (file.fieldname == "fitness_certificate_doc") req.truck.newFitnessCerti = file.name;
				else if (file.fieldname == "permit_doc") req.truck.newPermit = file.name;
         	}
		}
	),*/
	function(req, res, next) {
		// fill out
		if (req.truck.newVehicleImage !== undefined) req.body.vehicle_image = req.truck.newVehicleImage;
		if (req.truck.newLicense !== undefined) req.body.license_doc = req.truck.newLicense;
		if (req.truck.newChassis !== undefined) req.body.chassis_trace = req.truck.newChassis;
		if (req.truck.newRcBook !== undefined) req.body.RC_book_doc = req.truck.newRcBook;
		if (req.truck.newRoadTax !== undefined) req.body.road_tax_doc = req.truck.newRoadTax;
		if (req.truck.newInsuarance !== undefined) req.body.insuarance_doc = req.truck.newInsuarance;
		if (req.truck.newFitnessCerti !== undefined) req.body.fitness_certificate_doc = req.truck.newFitnessCerti;
		if (req.truck.newPermit !== undefined) req.body.permit_doc = req.truck.newPermit;
		
		truckService.updateTruckAsync(req.params.truck_id, req.body)
		.then(function(truck) {
				return res.status(200).json({"status": "OK","truck":truck});
			}).catch(next);
	}
 );
//*******************************************************************************************

//*******************************************************************************************
router.delete('/:truck_id',
	function (req, res, next) {
		passport.authenticate(
			'jwt',
			function (err, user, info) {
				if (err) return res.status(401).json(info);
				if (user === false) return res.status(401).json({"status":"ERROR", "error_message":"User not found"});
				// user logged in, but is it right user?
				truckService.findTruckAsync(req.params.truck_id)
				.then(
					function(truck) {
						if (truck.userId == user._id) return truckService.deleteTruckAsync(truck_id);
						else {
							res.status(401).json({"status":"ERROR", "error_message":"Not allowed to delete"});
						}
					}
				).catch(function(err) {
						res.status(500).json({"status":"ERROR", "error_message":err.toString});
					});
			}
		) (req, res, next);
	}
 );
module.exports = router;