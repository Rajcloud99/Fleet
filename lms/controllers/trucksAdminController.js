var router = require('express').Router();
var Promise = require('bluebird');
var passport = require('passport');
var winston = require('winston');
var multer = require('multer');
var path = require('path');

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

//**************************************************************************************
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
       		if(req.query && req.query.otherCustomers){
					req.query.otherCustomers = user._id;
				}
				else if(req.query){
				req.query.userId = user._id;
				}
				else{
				req.query = {};
				req.query.userId = user._id;
				}
				return truckAdminService.getAllTrucksAsync(req)
				
			
	.then(
		function(trucks) {

			if(trucks){

				var trucksAdminData = trucks.data;
				var arrayList =[];
				var trucksData=[];
					for (var i=0;i<trucksAdminData.length;i++) {

						if(trucksAdminData[i].truck_id){
							trucksData.push(trucksAdminData[i].truck_id)
							trucksAdminData[i].truck_id = trucksAdminData[i].truck_id._id;
							arrayList.push({TruckData:trucksData[i],TruckStatus:trucksAdminData[i]});

						}
					
				};

				res.status(200).json({'status': 'OK','data':arrayList,'no_of_pages': trucks.no_of_pages});
				
				}
				else{
    	  			 return {'status': 'ERROR',"error_message":"your do not have any truck registered."};
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

//**************************************************************************************
router.put(
	'/:truck_id',
	function(req, res, next) {
		console.log('update Admin RegisteredVehicle',req.body);
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
					truckService.findTruckAsync(req.params.truck_id)
			    	.then(function(truck){
			    		if(truck){
			    			req.truck = truck;
			    			return next();
			    		}
			    		else{
			    			res.status(404).json({'status': 'ERROR','message':'No truck found on this ID'});
			    		}

			    	}).catch(next);
				}
			}
		)(req, res, next);
	},

	multer(
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
	),

	function(req, res, next) {
		if(Object.getOwnPropertyNames(req.body).length>0){
			if((req.body.TruckData)&&(Object.getOwnPropertyNames(req.body.TruckData).length<=0)&&(req.body.TruckStatus)&&(Object.getOwnPropertyNames(req.body.TruckStatus).length<=0)){
				return res.status(400).json({'status': 'ERROR',"error_message":"Nothing to update."});
			}
			else if((req.body.TruckData)&&(Object.getOwnPropertyNames(req.body.TruckData).length>0)){
				truckService.updateTruckAsync(req.params.truck_id, req.body.TruckData)
				.then(
					function(trucks){
						if((trucks)&&(req.body.TruckStatus)&&(Object.getOwnPropertyNames(req.body.TruckStatus).length>0)){
							req.toSendAsTruckData = trucks;
							truckAdminService.updateAdminTruckByParamsAsync(req.params.truck_id, req.body.TruckStatus)
							.then(function(adminData){
									if(adminData){
										var toSendBoth = {};
										toSendBoth.TruckData = req.toSendAsTruckData;
										toSendBoth.TruckStatus = adminData;
										var sendMe = [toSendBoth];
										return res.status(200).json({'status': 'OK',"message":"RegisteredVehicle fields updated.", 'data':sendMe})
									}
							})
						}else{
							var toSendBoth = {};
							toSendBoth.TruckData = trucks;
							toSendBoth.TruckStatus = {};
							var sendMe = [toSendBoth];
							return res.status(200).json({'status': 'OK',"message":"RegisteredVehicle fields updated.", 'data':sendMe})
						}
					}
				).catch(next)
								
			}else if((req.body.TruckStatus)&&(Object.getOwnPropertyNames(req.body.TruckStatus).length>0)){
					truckAdminService.updateAdminTruckByParamsAsync(req.params.truck_id, req.body.TruckStatus)
					.then(
						function(adminData){
							if(adminData){
								var toSendBoth = {};
								toSendBoth.TruckData = {};
								toSendBoth.TruckStatus = adminData;
								var sendMe = [toSendBoth];
								res.status(200).json({'status': 'OK',"message":"RegisteredVehicle status fields updated.", 'data':sendMe})
							}
						}
					)
			}
		}else{
			if (req.truck.newVehicleImage !== undefined) req.body.vehicle_image = req.truck.newVehicleImage;
			if (req.truck.newLicense !== undefined) req.body.license_doc = req.truck.newLicense;
			if (req.truck.newChassis !== undefined) req.body.chassis_trace = req.truck.newChassis;
			if (req.truck.newRcBook !== undefined) req.body.RC_book_doc = req.truck.newRcBook;
			if (req.truck.newRoadTax !== undefined) req.body.road_tax_doc = req.truck.newRoadTax;
			if (req.truck.newInsuarance !== undefined) req.body.insuarance_doc = req.truck.newInsuarance;
			if (req.truck.newFitnessCerti !== undefined) req.body.fitness_certificate_doc = req.truck.newFitnessCerti;
			if (req.truck.newPermit !== undefined) req.body.permit_doc = req.truck.newPermit;
			truckService.updateTruckAsync(req.params.truck_id, req.body)
			.then(
				function(trucks) {
			  		if(trucks){
		    	  		var toSendBoth = {};
						toSendBoth.TruckData = trucks;
						toSendBoth.TruckStatus = {};
						var sendMe = [toSendBoth];
				  		return res.status(200).json({'status': 'OK',"message":"RegisteredVehicle fields updated.", 'data':sendMe});
		       		}else{
		    	   		return res.status(500).json({"status": "ERROR","message":"RegisteredVehicle details are not updated"});
		       		}
				}
			).catch(next);
		}
	}
);

module.exports = router;

