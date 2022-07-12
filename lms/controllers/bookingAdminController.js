var express = require('express');
var router = express.Router();
var passport = require('passport');
var Promise = require('bluebird');
var multer = require('multer');
var path = require('path');
var moment = require("moment");

var bookingAdminService = Promise.promisifyAll(commonUtil.getService('bookingAdmin'));
var bookingService = Promise.promisifyAll(commonUtil.getService('booking'));
var PostingService = Promise.promisifyAll(commonUtil.getService('posting'));
//var VendorBidService = Promise.promisifyAll(commonUtil.getService('vendor'));
var leadService = promise.promisifyAll(commonUtil.getService('lead'));
var paymentService = Promise.promisifyAll(commonUtil.getService('payment'));

function bookingSms(booking){
	if(booking){
		var from="",to="";
		var driverName1="",driverMobile1=""
		var bookingID="",bookingDate="",pickUpAdd="",dropOff="",truckType="",materialType="",weight="";
		var schedDate="",reportTime="";
		var transLoading="",transTotalAmount="",transUnloading="",transMunshiyana="",transAdvance="",transBalance="",transToPay="",transSrvTax="",transTDS="";
		var loadLoading="",loadUnloading="",loadTotalAmount="",loadMunshiyana="",loadAdvance="",loadBalance="",loadToPay="",loadSrvTax="",loadTDS="";
		var messageTransLastLine = " tds in 24 hours.";
		var messageLoadLastLine = " tds in 6 hours at max.";
		var tNcLine = " ** Terms and conditions apply http://goo.gl/12lLjg";
		var androidLine = " Download our android application from  https://goo.gl/khpPCW"

		if(booking.bookingId){
			bookingID = booking.bookingId+" Booking confirmed ";
		}
		if(booking.shedule_date){
			//moment
			var date = moment(booking.shedule_date);
			//time = "at time "+date.format("DD-MM-YYYY hh:MMa")+", ";
			schedDate = "on "+date.format("DD-MM-YYYY hh:MMa")+", ";
		}
		if(booking.source && booking.source.c && booking.source.d){
			if(booking.source.c == booking.source.d){
				booking.source.d = null;
			}
		}
		if(booking.source && booking.source.c){
			from = booking.source.c;
		}
		if(booking.source && booking.source.d){
			from = from + " "+booking.source.d;
		}
		/*if(booking.source && booking.source.s){
			from = from + " "+booking.source.s;
		}*/
		if(booking.destination && booking.destination[0] && booking.destination[0].c && booking.destination[0].d){
			if(booking.destination[0].c == booking.destination[0].d){
				booking.destination[0].d = null;
			}
		}
		if(booking.destination && booking.destination[0] && booking.destination[0].c){
			to = booking.destination[0].c;
		}
		if(booking.destination && booking.destination[0] && booking.destination[0].d){
			to = to +" "+booking.destination[0].d;
		}
		/*if(booking.destination && booking.destination[0] && booking.destination[0].s){
			to = to +" "+booking.destination[0].s;
		}*/
		if(booking.truck_driver_details && booking.truck_driver_details[0]){
			if(booking.truck_driver_details[0].driver_name){
				driverName1 = "Contact driver "+booking.truck_driver_details[0].driver_name;
			}
			if(booking.truck_driver_details[0].driver_mobile){
				driverMobile1 = " on "+booking.truck_driver_details[0].driver_mobile + ".";
			}
		}

		if(booking.transporter_payment){
			if(booking.transporter_payment.total){
				transTotalAmount = "Total "+booking.transporter_payment.total+"(Rs.), ";
			}
			if(booking.transporter_payment.advance){
				transAdvance = "Adv. "+ booking.transporter_payment.advance+"(Rs.), ";
			}
			if(booking.transporter_payment.balance){
				transBalance = "Balance "+ booking.transporter_payment.balance+"(Rs.), ";
			}
			/*if(booking.transporter_payment.toPayPOD){
				transToPay = "To Pay "+ booking.transporter_payment.toPayPOD+", ";
			}*/
			if(booking.transporter_payment.loading){
				transLoading ="Loading "+booking.transporter_payment.loading+"(Rs.), ";
			}
			if(booking.transporter_payment.unloading){
				transUnloading = "Unloading "+booking.transporter_payment.unloading+"(Rs.), ";
			}
			/*if(booking.transporter_payment.munshiyana){
				transMunshiyana = "Munshiyana "+booking.transporter_payment.munshiyana+", ";
			}*/
			if(booking.transporter_payment.service_charge){
				transSrvTax = "Service charge "+booking.transporter_payment.service_charge+"(Rs.), ";
			}
			/*if(booking.transporter_payment.loadingSlip){
				transTDS = "TDS "+booking.transporter_payment.loadingSlip+", ";
			}*/
		}

		if(booking.loader_payment){
			if(booking.loader_payment.total){
				loadTotalAmount = "Total "+booking.loader_payment.total+"(Rs.), ";
			}
			if(booking.loader_payment.advance){
				loadAdvance = "Adv. "+ booking.loader_payment.advance+"(Rs.),";
			}
			if(booking.loader_payment.toPayPOD){
				if(booking.loader_payment.balance){
					loadBalance = "Balance "+ booking.transporter_payment.balance+"(Rs.),";
				}
			}else{
				if(booking.loader_payment.balance){
					loadBalance = "POD "+ booking.transporter_payment.balance+"(Rs.),";
				}
			}
			if(booking.loader_payment.loading){
				loadLoading ="Loading "+booking.loader_payment.loading+"(Rs.),";
			}
			if(booking.loader_payment.unloading){
				loadUnloading = "Unloading "+booking.loader_payment.unloading+"(Rs.),";
			}
			if(booking.loader_payment.munshiyana){
				loadMunshiyana = "Munshiyana "+booking.loader_payment.munshiyana+"(Rs.),";
			}
			if(booking.loader_payment.service_tax){
				loadSrvTax = "Service tax "+booking.loader_payment.service_tax+"(Rs.),";
			}
			if(booking.loader_payment.tds){
				loadTDS = "TDS "+booking.loader_payment.tds+"(Rs.)";
			}
		}
		if(booking.pickupLocation){
			if(booking.pickupLocation.address){
				if(booking.pickupLocation.address == from){
					pickUpAdd = 'From '+ booking.pickupLocation.address
				}else{
					pickUpAdd = 'From '+ booking.pickupLocation.address + from;
				}
			}else{
				pickUpAdd = 'From ' + from;
			}
			if(booking.pickupLocation.landmark){
				pickUpAdd = " "+booking.pickupLocation.landmark;
			}
			if(booking.pickupLocation.city){
				pickUpAdd = pickUpAdd+" "+booking.pickupLocation.city;
			}
			if(booking.pickupLocation.district){
				pickUpAdd = pickUpAdd+" "+booking.pickupLocation.district;
			}
			if(booking.pickupLocation.state){
				pickUpAdd = pickUpAdd+" "+booking.pickupLocation.state;
			}
			if(booking.pickupLocation.pincode){
				pickUpAdd = pickUpAdd+" "+booking.pickupLocation.pincode;
			}
			if(booking.pickupLocation.name){
				pickUpAdd = pickUpAdd+",contact to "+booking.pickupLocation.name;
			}
			if(booking.pickupLocation.mobile){
				pickUpAdd = pickUpAdd+",on mobile number "+booking.pickupLocation.mobile;
			}
		}
		if(booking.dropofLocation){
			if(booking.dropofLocation.address){
				if(booking.dropofLocation.address == to){
					dropOff = ', To '+ booking.dropofLocation.address
				}else{
					dropOff = ', To '+ booking.dropofLocation.address + to;
				}
			}else{
				dropOff = ', To ' + to;
			}
			if(booking.dropofLocation.address){
				dropOff = ", To "+booking.dropofLocation.address;
				dropOff = dropOff + " " + to;
			}
			if(booking.dropofLocation.landmark){
				dropOff = " "+booking.pickupLocation.landmark;
			}
			if(booking.dropofLocation.city){
				dropOff = dropOff+" "+booking.dropofLocation.city;
			}
			if(booking.dropofLocation.district){
				dropOff = dropOff+" "+booking.dropofLocation.district;
			}
			if(booking.dropofLocation.state){
				dropOff = dropOff+" "+booking.dropofLocation.state;
			}
			if(booking.dropofLocation.pincode){
				dropOff = dropOff+" "+booking.dropofLocation.pincode;
			}
			if(booking.dropofLocation.name){
				dropOff = dropOff+",contact to "+booking.dropofLocation.name;
			}
			if(booking.dropofLocation.mobile){
				dropOff = dropOff+",on mobile number "+booking.dropofLocation.mobile;
			}
		}
		if(booking.truckType && booking.truckType.truck_type){
			truckType = ", "+booking.truckType.truck_type+", ";
		}
		if(booking.materialType && booking.materialType.material_type){
			materialType = ", "+booking.materialType.material_type+ " Material, " ;
		}
		if(booking.weight){
			weight = ", Weight of "+booking.weight;
			if(booking.weight_unit){
				weight = weight+" "+booking.weight_unit;
			}
		}
		/*if(booking.shedule_date){
			schedDate = " Scheduled on "+booking.shedule_date;
		}*/
		if(booking.reporting_time){
			reportTime = " at time "+booking.reporting_time;
		}
		if(booking.vehicle_person_contact||booking.vehicle_person_email){
			var messageToTransporter = bookingID+schedDate+reportTime+transTotalAmount+pickUpAdd+dropOff+truckType+materialType+weight+transLoading+transUnloading+transMunshiyana+transAdvance+transBalance+transToPay+transSrvTax+transTDS+driverName1+driverMobile1+messageTransLastLine+tNcLine+androidLine;
			//console.log("Transporter message: "+messageToTransporter);
			if(booking.vehicle_person_contact){
				smsUtil.sendSMS(booking.vehicle_person_contact,messageToTransporter);
			}
			if(booking.vehicle_person_email){
				var mailOptions = {
					to: booking.vehicle_person+' ✔ <'+ booking.vehicle_person_email+'>',
					subject: 'New  Booking.✔',
					text: 'Welcome from Future Trucks✔',
					html: '<br>'  +messageToTransporter+ '<br>'
				};
				emailUtil.sendMail(mailOptions);
			}
		}
		if(booking.load_person_contact||booking.load_person_email){
			var messageToLoader = bookingID+schedDate+reportTime+loadTotalAmount+pickUpAdd+dropOff+truckType+materialType+weight+loadLoading+loadUnloading+loadMunshiyana+loadAdvance+loadBalance+loadToPay+loadSrvTax+loadTDS+driverName1+driverMobile1+messageLoadLastLine+tNcLine+androidLine;
			//console.log("Loader message: "+messageToLoader);
			if(booking.load_person_contact){
				smsUtil.sendSMS(booking.load_person_contact,messageToLoader);
			}
			if(booking.load_person_email){
				var mailOptions = {
					to: booking.load_person+' ✔ <'+ booking.load_person_email+'>',
					subject: 'New  Booking.✔',
					text: 'Welcome from Future Trucks✔',
					html: '<br>'  +messageToLoader+ '<br>'
				};
				emailUtil.sendMail(mailOptions);
			}
		}
		if(booking.truck_driver_details && booking.truck_driver_details.length){
			for(var i=0;i<booking.truck_driver_details.length; i++){
				var driverName =""
				if(booking.truck_driver_details[i].driver_name){
					driverName =booking.truck_driver_details[i].driver_name;
				}

				if(booking.truck_driver_details[i].driver_mobile){
					var loaderMob = "";
					if(booking.load_person_contact){
						loaderMob = "Client Number "+booking.load_person_contact;
					}
					var messageToDriver = pickUpAdd+dropOff+" "+schedDate+reportTime+loaderMob+tNcLine+androidLine;
					//console.log("Driver message: "+messageToDriver);
					smsUtil.sendSMS(booking.truck_driver_details[i].driver_mobile,messageToDriver);
				}
			}
		}
		return {"status": "OK","data":booking,"message":bookingID+schedDate};
	}
}

//************************************************************************************************
router.get('/search/', function (req, res, next) {
	 passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){

		   return next(error);
	    }
	   if(user.type == 'ft_admin')
       {

       	if((user.role == 'showAdmin') || (user.role=='updateAdmin') || (user.role=='superAdmin'))
       	{

				var oFilter = {};
    			if(req.query){
    				if(req.query.tName){
        				var sPattern = new RegExp('^'+req.query.tName,'i');
        				oFilter.tName = {vehicle_person: { $regex:sPattern}};
        			}
        			else if(req.query.lName){
        				var sPattern = new RegExp('^'+req.query.lName,'i');
        				oFilter.lName = {load_person : {$regex:sPattern}};
        			}

        		bookingAdminService.stringSearchForBookingDataAsync(oFilter)
				.then(
					function(bookingData) {
						return res.status(200).json({'status': 'OK','data':bookingData});
					},
					function(err) {
						winston.error("Error in booking search: "+err);
						return res.status(500).json({'status': 'ERROR', 'error_messages': err.toString()});
					}
				)
				.catch(next);
	 }}else{
		 return res.status(200).json({'status': 'OK','message':'You do not have admin privilege'});
	 	  }
       }else{
  		 return res.status(200).json({'status': 'OK','message':'You are not an Admin'});
	 	  }
	 })(req, res, next);
});
//************************************************************************************************
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

			bookingAdminService.getAllBookingsAsync(req)
			.then(function(booking) {

				if(booking){

					res.status(200).json({'status': 'OK','data': booking.data , "no_of_pages":booking.no_of_pages});

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


//*****************************************************************************************
router.post('/express',function(req, res, next) {
		console.log('express booking Payload: ',req.body);
		passport.authenticate('jwt',

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
		if(req.body){
			var expressData = {};
			expressData.status = 'confirm';
			//expressData.post_type = 'express_booking';
			var oModifiedCitySource,oModifiedCityDestination;
			if(req.body.source && req.body.source.address_components){
				oModifiedCitySource = googlePlaceUtil.getFormattedCity(req.body.source.address_components);
			}
			if(!req.body.source.c && oModifiedCitySource){
				req.body.source.c = oModifiedCitySource.c;
			}
			if(!req.body.source.d && oModifiedCitySource){
				req.body.source.d = oModifiedCitySource.d;
			}
			if(!req.body.source.s && oModifiedCitySource){
				req.body.source.s = oModifiedCitySource.s;
			}
			if(!req.body.source.p && oModifiedCitySource){
				req.body.source.p = oModifiedCitySource.p;
			}
			if(req.body.destination && req.body.destination && req.body.destination[0].address_components){
				oModifiedCityDestination = googlePlaceUtil.getFormattedCity(req.body.destination[0].address_components);
			}
			if(!req.body.destination[0].c && oModifiedCityDestination){
				req.body.destination[0].c = oModifiedCityDestination.c;
			}
			if(!req.body.destination[0].d && oModifiedCityDestination){
				req.body.destination[0].d = oModifiedCityDestination.d;
			}
			if(!req.body.destination[0].s && oModifiedCityDestination){
				req.body.destination[0].s = oModifiedCityDestination.s;
			}
			if(!req.body.destination[0].p && oModifiedCityDestination){
				req.body.destination[0].p = oModifiedCityDestination.p;
			};
			expressData.source = req.body.source;
			expressData.destination = req.body.destination;
			//expressData.date = new Date();
			expressData.shedule_date = req.body.date;
			expressData.branch = req.body.branch;

			if(req.body.trans && req.body.load){
				expressData.truck_driver_details = req.body.trans.truck_driver_details;
				if(req.body.trans.truck_driver_details && req.body.trans.truck_driver_details[0] && req.body.trans.truck_driver_details[0].vehicleType){
					expressData.truckType = req.body.trans.truck_driver_details[0].vehicleType;
				}
				expressData.interest_owner_id = req.body.trans._id;

				expressData.vehicle_person = req.body.trans.owner_name;
				expressData.vehicle_person_contact = req.body.trans.mobile;
				expressData.vehicle_person_email = req.body.trans.email;
				expressData.vehicle_person_company = req.body.trans.company_name;
				expressData.post_owner_id = req.body.load._id;

				expressData.materialType = req.body.load.materialType;

				expressData.hired_by = req.body.load.hired_by;
				expressData.load_person = req.body.load.owner_name;
				expressData.load_person_company = req.body.load.company_name;
				expressData.load_person_contact = req.body.load.mobile;
				expressData.load_person_email = req.body.load.email;
				expressData.transporter_payment = req.body.trans.payment;
				expressData.loader_payment = req.body.load.payment;
				expressData.pickupLocation = req.body.load.pickupLocation;
				expressData.dropofLocation = req.body.load.dropofLocation;

				if(req.body.load.payment){
					expressData.accept_price = parseInt(req.body.load.payment.total || req.body.trans.payment.total);
				}
				expressData.users = [req.body.load._id, req.body.trans._id];
			}

			bookingService.addBookingAsync(expressData)
			.then(function(booking){
				if(booking){
					var smsReturns = bookingSms(booking)
					//return res.status(200).json({"status": "OK","data":booking,"message":bookingID+schedDate});
					if(booking.loader_payment && (booking.loader_payment.total>0)){
						oPayment = {};
						oPayment.bookingId = booking.bookingId;
						oPayment.loader_payment = booking.loader_payment;
						oPayment.amount = booking.loader_payment.total;
						oPayment.done_by = "admin";
						oPayment.mode = booking.loader_payment.mode;
						paymentService.addPaymentAsync(oPayment)
						.then(function(loadPayment){
							if(loadPayment){
								data = {
									pushToArr : {payments:loadPayment._id, paymentBy_loader:loadPayment._id}
								}
								bookingService.updateBookingAsync(booking._id,data)
								.then(function(thatUpdate){
									if(booking.transporter_payment && (booking.transporter_payment.total>0)){
										tPayment = {};
										tPayment.bookingId = booking.bookingId;
										tPayment.transporter_payment = booking.transporter_payment;
										tPayment.amount = booking.transporter_payment.total;
										tPayment.done_by = "admin";
										tPayment.mode = booking.transporter_payment.mode;
										paymentService.addPaymentAsync(tPayment)
										.then(function(transPayment){
											if(transPayment){
												data = {
													pushToArr : {paymentBy_transporter:transPayment._id}
												}
												bookingService.updateBookingAsync(booking._id,data)
												.then(function(thatUpdate){
													return res.status(200).json(smsReturns);
												})
											}
										}).catch(next);
									}else{
										return res.status(200).json(smsReturns);
									}
								})
							}
						})
					}else if(booking.transporter_payment && (booking.transporter_payment.total>0)){
						tPayment = {};
						tPayment.bookingId = booking.bookingId;
						tPayment.transporter_payment = booking.transporter_payment;
						tPayment.amount = booking.transporter_payment.total;
						tPayment.done_by = "admin";
						tPayment.mode = booking.transporter_payment.mode;
						paymentService.addPaymentAsync(tPayment)
						.then(function(transPayment){
							if(transPayment){
								data = {
									pushToArr : {paymentBy_transporter:transPayment._id}
								}
								bookingService.updateBookingAsync(booking._id,data)
								.then(function(thatUpdate){
									return res.status(200).json(smsReturns);
								})
							}
						}).catch(next);
					}else{
						return res.status(200).json(smsReturns);
					}
				}
			}).catch(next);
		}
		else{
		    return res.status(500).json({'status': 'ERROR',"error_message":"Please provide sufficient data to save booking."});
		}
});
//*****************************************************************************************
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

		/*if(req.body.truck_driver_details){
			oUpdate={};
			oUpdate.objectId = req.body.truck_driver_details._id;
			oUpdate.current_location = req.body.truck_driver_details.current_location;

			bookingAdminService.pushCurrentLocationByBookingId(req.params.bookingId, oUpdate);
			if(req.body.status){
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
					return res.status(200).json({"status": "OK","message":"data updated"});
				}
		}*/
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
		    	return res.status(500).json({'status': 'ERROR',"error_message":"your data not updated."});
		    }

	});
//*********************************************************************************************
router.put(
	'/express/:bookingId',
	function(req, res, next) {
		console.log('update express booking',req.body);
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
					var bookingIdParam = {bookingId: req.params.bookingId}
					bookingAdminService.expressBookingByIdAsync(bookingIdParam)
			    	.then(function(booking){
			    		if(booking){
			    			req.booking = booking;
			    			return next();
			    		}
			    		else{
			    			return res.status(404).json({'status': 'ERROR','message':'No booking found on this ID'});
			    		}

			    	}).catch(next);
				}
			}
		)(req, res, next);
	},

	/*multer(
		{
			"dest" : path.join(projectHome,"files","users"),
			"limits": {
				"files": 4
			},
			"putSingleFilesInArray": true,
			"rename" : function (fieldname, filename, req, res) {
				var timeStamp = new Date().getTime();
				return fieldname + "_" + req.params.bookingId+ "_" + timeStamp;
				},
			"onFileUploadStart" : function (file) {
				var doc_mimes = "image/jpeg image/bmp image/png application/pdf";
				var image_mimes =  "image/jpeg image/bmp image/png";
				var allowedMimes = "";
				console.log('upload1',file);
				if (file.fieldname == "tds_doc" || file.fieldname == "builty_doc" || file.fieldname == "goods_receipt_doc" || file.fieldname =="pan_card_proof" || file.fieldname =="tin_number_proof" ||  file.fieldname == "service_tax_proof") {
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
				if (file.fieldname == "tds_doc") req.booking.newTDS = file.name;
				else if (file.fieldname == "builty_doc") req.booking.newdBuilty = file.name;
				else if (file.fieldname == "goods_receipt_doc") req.booking.newGoodsReceipt = file.name;
				else if (file.fieldname == "pan_card_proof") req.booking.newPanCard = file.name;
				else if (file.fieldname == "tin_number_proof") req.booking.newTIN = file.name;
				else if (file.fieldname == "service_tax_proof") req.booking.newServiceTax = file.name;
			}
		}
	),*/

	function(req, res, next) {
		if(Object.getOwnPropertyNames(req.body).length>0){
			bookingAdminService.updateBookingAsync({bookingId: req.params.bookingId},req.body)
			.then(function(booking){
			if(booking){
				res.status(200).json(booking);
			}
			else{
		    	res.status(400).json({'status': 'ERROR',"error_message":"Booking not updated."});
		       }
			}).catch(next);
		}else{
			if ((typeof(req.booking.newTDS) !== 'undefined')) req.body.tds_doc = req.booking.newTDS;
			if ((typeof(req.booking.newdBuilty) !== 'undefined')) req.body.builty_doc = req.booking.newdBuilty;
			if ((typeof(req.booking.newGoodsReceipt) !== 'undefined')) req.body.goods_receipt_doc = req.booking.newGoodsReceipt;
			if ((typeof(req.booking.newPanCard) !== 'undefined')) req.body.pan_card_proof = req.booking.newPanCard;
			if ((typeof(req.booking.newTIN) !== 'undefined')) req.body.tin_number_proof = req.booking.newTIN;
			if ((typeof(req.booking.newServiceTax) !== 'undefined')) req.body.service_tax_proof = req.booking.newServiceTax;

			bookingAdminService.updateBookingAsync({bookingId: req.params.bookingId},req.body)
			.then(
				function(booking) {
			  		if(booking){
		    	  		return res.status(200).json({'status': 'OK',"message":"Booking fields updated.", 'data':booking});
		       		}else{
		    	   		res.status(500).json({"status": "ERROR","message":"Booking fields are not updated"});
		       		}
				}
			).catch(next);
		}
	}
);
//*********************************************************************************************
router.get('/track_sheet', function (req, res, next) {
	 passport.authenticate('jwt',
	  function(error, user, info) {
	   if (error){
		   return next(error);
	    }
	   if(user.type == 'ft_admin'){

       	if((user.role == 'showAdmin') || (user.role=='updateAdmin') || (user.role=='superAdmin')){
       		req.trackingDate = {};
       		if(req.query && req.query.from_date && req.query.to_date){
       			req.trackingDate.from = req.query.from_date;
       			req.trackingDate.to = req.query.to_date;
       		}
       		else if(req.query && req.query.from_date){
       			req.trackingDate.from = req.query.from_date;
       		}
       		bookingAdminService.getTrackSheetAsync(req)
			.then(function(booking) {
				if(booking && booking.data && booking.data.length>0){

					function getFormattedDate(thatDate) {
					    var todayTime = new Date(thatDate);
					    var month = (todayTime .getMonth() + 1);
					    var day = (todayTime .getDate());
					    var year = (todayTime .getFullYear());
					    return day + "-" + month + "-" + year;
					}
					oTrackSheet = {};
					for(var i=0; i<booking.data.length; i++){
						oBooking = booking.data[i];
						if(Object.getOwnPropertyNames(oTrackSheet).length>0){
							for(key in oBooking){
								if(key == "shedule_date"){
									bookingKey = oBooking[key];
									var stringDate = getFormattedDate(bookingKey);
									if(oTrackSheet.hasOwnProperty(stringDate)){
										oTrackSheet[stringDate].push(oBooking);
									}
									else{
										oTrackSheet[stringDate] = [];
										oTrackSheet[stringDate].push(oBooking);
									}
								}
							}
						}else{
							for(key in oBooking){
								if(key == "shedule_date"){
									bookingKey = oBooking[key];
									var stringDate = getFormattedDate(bookingKey);
									oTrackSheet[stringDate] = [];
									oTrackSheet[stringDate].push(oBooking);
								}
							}
						}
					}
					var aTrackSheet = [];
					for(var key in oTrackSheet){
						var oTrack = {};
						oTrack.date = key;
						oTrack.value = oTrackSheet[key];
						aTrackSheet.push(oTrack);
					}
					res.status(200).json({'status': 'OK','data': aTrackSheet});
				}
				else{
    	  			 return res.status(200).json({'status': 'OK','data': [],"message":"No data found."});
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
//*********************************************************************************************
router.put(
	'/track_sheet/:bookingId',
	function(req, res, next) {
		console.log('update express booking',req.body);
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
					var bookingIdParam = {bookingId: req.params.bookingId}
					bookingAdminService.expressBookingByIdAsync(bookingIdParam)
			    	.then(function(booking){
			    		if(booking){
			    			return next();
			    		}
			    		else{
			    			res.status(404).json({'status': 'ERROR','message':'No booking found on this ID'});
			    			}

			    	}).catch(next);
				}
			}
		)(req, res, next);
	},

	function(req, res, next) {
		if(Object.getOwnPropertyNames(req.body).length>0){
			var oUpdate = {};
			if(req.body.status){
				oUpdate.setNewVal = {};
				oUpdate.setNewVal.status = req.body.status;
			}
			if(req.body.remark || req.body.status || req.body.location || req.body.time){
				oUpdate.pushToArr ={};
				oUpdate.pushToArr.detailed_status ={};
				if(req.body.remark){
					oUpdate.pushToArr.detailed_status.remark = req.body.remark;
				}
				if(req.body.status){
					oUpdate.pushToArr.detailed_status.status = req.body.status;
				}
				if(req.body.location){
					oUpdate.pushToArr.detailed_status.location = req.body.location;
				}
				if(req.body.time){
					oUpdate.pushToArr.detailed_status.time = req.body.time;
				}
			}
			bookingAdminService.updateBookingonTrackSheetAsync({bookingId: req.params.bookingId},oUpdate)
			.then(function(booking){
			if(booking){
				res.status(200).json(booking);
			}
			else{
		    	res.status(400).json({'status': 'ERROR',"error_message":"Booking not updated."});
		       }
			}).catch(next);
		}else{
			return res.status(404).json({'status': 'ERROR',"error_message":"No data found to update."});
		}
	}
);

router.post('/confirmByLead/:postingId',function(req, res, next) {
		console.log('confirm lead Payload: ',JSON.stringify(req.body));
		passport.authenticate('jwt',
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
					var oParams = {"postingId":req.params.postingId};
                    PostingService.getPostingsByIdAsync(oParams).then(function(posting){
                    	if((posting) && (posting[0]) && (posting[0].lead_status == 'bid')&&(!(posting[0].verified=='booked'))){
                    		req.postingReturns = posting[0];
                    		return next();
                    	}else{
                    		return res.status(404).json({'status': 'ERROR',"error_message":"Posting does not exist or not in bidding state or already booked."});
                    	}
                    }).catch(next)

				}
			}
		)(req, res, next);
	},

	function(req, res, next) {
		if(req.body){
			var expressData = {};
			expressData.status = 'confirm';
			//expressData.post_type = 'express_booking';
			var oModifiedCitySource,oModifiedCityDestination;
			if(req.body.source && req.body.source.address_components){
				oModifiedCitySource = googlePlaceUtil.getFormattedCity(req.body.source.address_components);
			}
			if(!req.body.source.c && oModifiedCitySource){
				req.body.source.c = oModifiedCitySource.c;
			}
			if(!req.body.source.d && oModifiedCitySource){
				req.body.source.d = oModifiedCitySource.d;
			}
			if(!req.body.source.s && oModifiedCitySource){
				req.body.source.s = oModifiedCitySource.s;
			}
			if(!req.body.source.p && oModifiedCitySource){
				req.body.source.p = oModifiedCitySource.p;
			}
			if(req.body.destination && req.body.destination && req.body.destination[0].address_components){
				oModifiedCityDestination = googlePlaceUtil.getFormattedCity(req.body.destination[0].address_components);
			}
			if(!req.body.destination[0].c && oModifiedCityDestination){
				req.body.destination[0].c = oModifiedCityDestination.c;
			}
			if(!req.body.destination[0].d && oModifiedCityDestination){
				req.body.destination[0].d = oModifiedCityDestination.d;
			}
			if(!req.body.destination[0].s && oModifiedCityDestination){
				req.body.destination[0].s = oModifiedCityDestination.s;
			}
			if(!req.body.destination[0].p && oModifiedCityDestination){
				req.body.destination[0].p = oModifiedCityDestination.p;
			}
			expressData.source = req.body.source;
			expressData.destination = req.body.destination;
			//expressData.date = new Date();
			expressData.shedule_date = req.body.date;
			expressData.posting_id = req.postingReturns._id;

			if(req.body.trans && req.body.load){
				expressData.truck_driver_details = req.body.trans.truck_driver_details;
				if(req.body.trans.truck_driver_details && req.body.trans.truck_driver_details[0] && req.body.trans.truck_driver_details[0].vehicleType){
					expressData.truckType = req.body.trans.truck_driver_details[0].vehicleType;
				}
				expressData.interest_owner_id = req.body.trans._id;

				expressData.vehicle_person = req.body.trans.owner_name;
				expressData.vehicle_person_contact = req.body.trans.mobile;
				expressData.vehicle_person_email = req.body.trans.email;
				expressData.vehicle_person_company = req.body.trans.company_name;

				expressData.post_owner_id = req.body.load._id;

				expressData.materialType = req.body.load.materialType;

				expressData.hired_by = req.body.load.hired_by;
				expressData.load_person = req.body.load.owner_name;
				expressData.load_person_company = req.body.load.company_name;
				expressData.load_person_contact = req.body.load.mobile;
				expressData.load_person_email = req.body.load.email;
				expressData.transporter_payment = req.body.trans.payment;
				expressData.loader_payment = req.body.load.payment;
				expressData.pickupLocation = req.body.load.pickupLocation;
				expressData.dropofLocation = req.body.load.dropofLocation;

				if(req.body.load.payment){
					expressData.accept_price = parseInt(req.body.load.payment.total || req.body.trans.payment.total);
				}
				expressData.users = [req.body.load._id, req.body.trans._id];
			}
			bookingService.addBookingAsync(expressData)
			.then(function(booking){
				if(booking){
					var smsReturns = bookingSms(booking);
					//return res.status(200).json(smsReturns);
					var prepareBidUpdate = {};
					prepareBidUpdate.bookingId = booking._id;
					prepareBidUpdate.isBooked = true;
					if(booking.vehicle_person){
						prepareBidUpdate.vendor_name= booking.vehicle_person;
					}

					if(booking.vehicle_person_company){
						prepareBidUpdate.vendor_company= booking.vehicle_person_company;
					}

			        if(booking.vehicle_person_contact){
			        	prepareBidUpdate.vendor_mobile= booking.vehicle_person_contact;
			        }

			        if(booking.vehicle_person_email){
			        	prepareBidUpdate.vendor_email= booking.vehicle_person_email;
			        };

			        if(booking.load_person){
			        	prepareBidUpdate.post_owner_name= booking.load_person;
			        };

			        if(booking.load_person_company){
			        	prepareBidUpdate.post_owner_company= booking.load_person_company;
			        };

			        if(booking.load_person_contact){
			        	prepareBidUpdate.post_owner_mobile= booking.load_person_contact;
			        };

			        if(booking.load_person_email){
			        	prepareBidUpdate.post_owner_email= booking.load_person_email;
			        };
			        if(req.body.rating){
			        	prepareBidUpdate.rating=req.body.rating;
			        };
			        if(booking.source){
			        	prepareBidUpdate.source = booking.source;
			        };
			        if(booking.destination && booking.destination[0]){
			        	prepareBidUpdate.destination = booking.destination[0];
			        };
			        if(booking.truckType){
			        	prepareBidUpdate.truckType = booking.truckType;
			        }
			        var oParams = {"postingId":req.params.postingId,"vendorId":req.body.trans._id};
					VendorBidService.updateVendorBidRateAsync(oParams,{setNewVal:prepareBidUpdate})
        			.then(function(bid){
	        			if(bid){
	        				//return res.status(200).json({'status': 'OK', 'messages': 'Bid updated successfully'});
							var updatePost = {};
							updatePost.verified = 'booked';
							updatePost.lead_status = 'booked';
							updatePost.bookingId = booking.bookingId;
							updatePost.booking_id = booking._id;
							updatePost.acceptedBy_posting = true;
							var oParams = {"postingId":req.params.postingId};
                			leadService.updateLeadAsync(oParams, updatePost)
                			.then(function(lead){
                				if(lead){
                					return res.status(200).json(smsReturns);
                				}else{
                					return res.status(500).json({'status': 'ERROR', 'messages': 'Booking Successfully but lead not updated.'});
                				}
                			}).catch(next)
						}
        			})
        		}else{
        			return res.status(500).json({'status': 'ERROR', 'messages': 'Booking Failed.'});
        		}
			}).catch(next);
		}
		else{
		    	return res.status(404).json({'status': 'ERROR',"error_message":"Please provide sufficient data to save booking."});
		    }
});
//*********************************************************************************************
router.post('/payment/:booking_id',function(req, res, next) {
		console.log('payment Payload: ',req.body);
		passport.authenticate('jwt',
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
					oParam = {bookingId:req.params.booking_id}
					bookingService.getBookingsByIdAsync(oParam)
					.then(function(booking){
						if(booking){
							req.oBooking_id = booking._id;
							return next();
						}
						else{
							return res.status(401).json({'status': 'Booking does not exists on this booking id.'});
						}
					})
				}
			}
		)(req, res, next);
	},

	function(req, res, next) {
		if(req.body){
			if(req.body.loader_payment && (req.body.loader_payment.total>0)){
				oPayment = {};
				oPayment.bookingId = req.params.booking_id;
				oPayment.loader_payment = req.body.loader_payment;
				oPayment.amount = req.body.loader_payment.total;
				oPayment.done_by = "admin";
				oPayment.mode = req.body.loader_payment.mode;
				paymentService.addPaymentAsync(oPayment)
				.then(function(loadPayment){
					if(loadPayment){
						data = {
							pushToArr : {payments:loadPayment._id, paymentBy_loader:loadPayment._id}
						}
						bookingService.updateBookingAsync(req.oBooking_id,data)
						.then(function(thatUpdate){
							if(thatUpdate){
								return res.status(200).json({"status": "OK","message":"Payment created successfully."});
							}else{
								return res.status(500).json({"status": "ERROR","message":"Payment created but payment id is not injected in the booking."});
							}
						})
					}
				})
			}else if(req.body.transporter_payment && (req.body.transporter_payment.total>0)){
					tPayment = {};
					tPayment.bookingId = req.params.booking_id;
					tPayment.transporter_payment = req.body.transporter_payment;
					tPayment.amount = req.body.transporter_payment.total;
					tPayment.done_by = "admin";
					tPayment.mode = req.body.transporter_payment.mode;
					paymentService.addPaymentAsync(tPayment)
					.then(function(transPayment){
						if(transPayment){
							data = {
								pushToArr : {paymentBy_transporter:transPayment._id}
							}
							bookingService.updateBookingAsync(req.oBooking_id,data)
							.then(function(thatUpdate){
								if(thatUpdate){
									return res.status(200).json({"status": "OK","message":"Payment created successfully."});
								}else{
									return res.status(500).json({"status": "ERROR","message":"Payment created but payment id is not injected in the booking."});
								}
							})
						}
					}).catch(next);
				}else{
					return res.status(404).json({'status': 'ERROR',"error_message":"Please provide at least one party payment details."});
				}
			}else{
			    return res.status(404).json({'status': 'ERROR',"error_message":"Please provide sufficient data to save booking."});
			}
});
//*********************************************************************************************
router.put('/payment/:payment_id',function(req, res, next) {
		console.log('payment update Payload: ', JSON.stringify(req.body));
		passport.authenticate('jwt',
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
					oParam = {_id:req.params.payment_id}
					paymentService.getPaymentByIdAsync(oParam)
					.then(function(payment){
						if(payment){
							return next();
						}
						else{
							return res.status(401).json({'status': 'Payment does not exists on this payment id.'});
						}
					})
				}
			}
		)(req, res, next);
	},

	function(req, res, next) {
		if(req.body){
			if(req.body.loader_payment && (req.body.loader_payment.total>0)){
				oParam = {_id:req.params.payment_id};
				data = {
					setNewVal : req.body
				}
				paymentService.updatePaymentAsync(oParam,data)
				.then(function(loadPayment){
					if(loadPayment){
						return res.status(200).json({"status": "OK","message":"Payment updated successfully."});
					}
				}).catch(next);
			}else if(req.body.transporter_payment && (req.body.transporter_payment.total>0)){
					oParam = {_id:req.params.payment_id};
					data = {
						setNewVal : req.body
					}
					paymentService.updatePaymentAsync(oParam,data)
					.then(function(transPayment){
						if(transPayment){
							return res.status(200).json({"status": "OK","message":"Payment updated successfully."});
						}
					}).catch(next);
				}else{
					return res.status(404).json({'status': 'ERROR',"error_message":"Please provide at least one party payment details."});
				}
			}else{
			    return res.status(404).json({'status': 'ERROR',"error_message":"Please provide sufficient data to save booking."});
			}
});
//*********************************************************************************************

module.exports = router;
