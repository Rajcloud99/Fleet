var router = express.Router();
var TransportVendor = promise.promisifyAll(commonUtil.getModel('vendorTransport'));
var VendorTransportService = promise.promisifyAll(commonUtil.getService('vendorTransport'));
var DriverService = promise.promisifyAll(commonUtil.getService("driver"));
var acccountsService = promise.promisifyAll(commonUtil.getService('accounts'));
var RegisteredVehicleService = promise.promisifyAll(commonUtil.getService("registeredVehicle"));
var DriverAssociationService = promise.promisifyAll(commonUtil.getService("driverAssociation"));
var RegisteredVehicleAssociation = promise.promisifyAll(commonUtil.getModel('registeredVehicleAssociation'));
var RegisteredVehicleAssociationService = promise.promisifyAll(commonUtil.getService("registeredVehicleAssociation"));
var multipartMiddleware = require('connect-multiparty')();


/***********Multer Configuration for upload vehicle docs**************/
var maxFileSize = 2 * 1000 * 1000;//bytes(default)--->==1MB
var path = require('path');
var multer = require('multer');
var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, path.join(projectHome,"files","users",req.user.clientId));
	},
	filename: function (req, file, cb) {
		if(req.params.bank_a_c){
			cb(null, "cancel_cheque"+"_"+req.params.bank_a_c+path.extname(file.originalname));
		}else {
			cb(null, "vendorTransporter_"+file.fieldname+"_"+req.params._id+path.extname(file.originalname));
		}
	}
});

var upload = multer({
	storage: storage,
	limits: { fileSize: maxFileSize },
	fileFilter: function (req, file, cb) {
		if ((file.mimetype == 'image/jpeg') || (file.mimetype == 'image/png') || (file.mimetype == 'image/bmp') || (file.mimetype == 'application/pdf')) {
			cb(null, true);
		}else{
			cb(null, false)
		}
	}
})
//****************************************************************
//************Allowed Docs****************************************
var VendorUpload = upload.fields(
	[
		{name:"cancelled_cheque", maxCount: 1 }
	]
);
//*****************************************************************

router.post("/add",
    function(req,res,next){
		let oDuplicacy = {clientId:req.user.clientId,deleted:false};
	    if(req.body.gstn && req.body.name){
			oDuplicacy.$or = [{name:new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i')},{gstn:new RegExp('^' + (req.body.gstn.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i')}]
		}else{
			oDuplicacy.name = new RegExp('^' + (req.body.name.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')) + '$', 'i');
		}

		VendorTransportService.findVendorTransportQueryAsync(oDuplicacy)
            .then(function(vendor){
            	let msg="duplicate data";
                if (vendor && vendor[0]) {
                	for(let i=0;i<vendor.length;i++){
                		if(vendor[i].name.toLowerCase() == req.body.name.toLowerCase()){
							msg = vendor[i].name + " already exist ";
							break;
						}else if(vendor[i].gstn.toLowerCase() == req.body.gstn.toLowerCase()){
							msg = vendor[i].gstn + " gst no already exist for "+ vendor[i].name;
							break;
						}
					}
                    return res.status(500).json({
                        "status": "ERROR",
                        "message": msg,
                        "data": vendor
                    });
                }else{
                    return next();
                }
            }).catch(next)
    },
	function(req,res,next){
		if(req.body.account && req.body.account[0]){
			VendorTransportService.findAccountQueryAsync({'account.ref' :  mongoose.Types.ObjectId(req.body.account[0].ref._id)})
				.then(function(vendor) {
					if(vendor && vendor[0]) {
						return res.status(500).json({
							'status': 'ERROR',
							'message':`Account already link with vendor ${vendor[0].name}`,
						});
					} else {
						return next();
					}
				}).catch(next);
		}else{
			next();
		}
	},
    function(req,res,next) {
        VendorTransportService.addVendorTransportAsync(req.body)
            .then(function(vendor){
                return res.status(200).json({"status":"OK",
                    "message":"Transport vendor has been added successfully",
                    "data":vendor});
            }).catch(next)
    }
);
const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

router.post("/get",function(req, res, next){
	if(req.body.cClientId)
	req.body.clientId = req.body.cClientId;

    VendorTransportService.searchVendorTransportAsync(req.body, false)
        .then(function(data){
			if(data.data && req.body.fpa){
				data.data = JSON.parse(JSON.stringify(data.data));
				for(let o of data.data){
					if(o.account && Array.isArray(o.account) && o.account.length) {
						let obj = o.account.find(cId => cId.clientId === req.body.cClientId);
						o.account = obj;
					}
				}
			}

			if (req.body.download) {
				ReportExelService.vendorReports(data.data, req.user.clientId, function(data){
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			}else {
				return res.status(200).json({
					"status": "OK",
					"message": "Transport vendors found",
					"data": data.data,
					"count": data.count,
					"pages": data.pages
				});
			}
        }).catch(next)
});
router.get("/id",function(req,res,next){
    VendorTransportService.findVendorTransportQueryAsync({_id:req.query._id})
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Transport vendors found",
                "data":data
            });
        }).catch(next)
});
router.get("/get/trim",function(req,res,next){
    VendorTransportService.searchVendorTransportAsync(req.query,true)
        .then(function(data){
            return res.status(200).json({"status":"OK",
                "message":"Transport vendors found",
                "data":data.data});
        }).catch(next)
});

router.put("/update/:_id/:bank_a_c",
	function(req,res,next){
		if (otherUtil.isEmptyObject(req.body)){
			return res.status(500).json({"status":"ERROR","message":"No update body found"});
		}
		if (otherUtil.isEmptyObject(req.params)){
			return res.status(500).json({"status":"ERROR","message":"No id provided for updating transport vendor"});
		}

		VendorTransportService.findVendorTransportQueryAsync({_id:req.params._id})
			.then(function(data){
				if(data && data[0]){
					req.vendorData = data[0];
					return next();
				}else{
					return res.status(500).json({"status":"ERROR","message":"Transport vendor not found."});
				}
			}).catch(next)
	},
	//vendorUpload
	function(req, res, next) {
		VendorUpload(req, res, function (err) {
			if (err) {
				return res.status(500).json({
					"status": "ERROR",
					"error_message": JSON.stringify(err)
				});
			}else{
				return next();
			}
		})
	},
	function(req,res,next){
		if(req.files){
			if ((req.files.cancelled_cheque) && (req.files.cancelled_cheque[0]) && (req.files.cancelled_cheque[0].filename!== undefined) ){
				//req.body.cancelled_cheque = req.files.cancelled_cheque[0].filename;
				var foundIndex = req.vendorData.banking_details.findIndex(x => x.a_c == req.params.bank_a_c);
				if(foundIndex>-1){
					req.vendorData.banking_details[foundIndex].cancelled_cheque=req.files.cancelled_cheque[0].filename;
					req.body.banking_details = req.vendorData.banking_details;
				}
			}
		}

		// Check if trip not found then delete hard delete...
		// else soft delete...

	VendorTransportService.findTripRecordAsync({vendor: req.params._id})
	.then(function(data){
			if(data){
				req.body._cid_ = req.user.clientId;
				VendorTransportService.updateVendorTransportAsync(req.params._id,req.body)
				.then(function(updated){
					return res.status(200).json({"status":"OK",
						"message":"Transport vendor data has been updated successfully",
						"data":updated});
				}).catch(next)
			}
			// else
			// {
			// 	VendorTransportService.deleteVendTransRecordByIdAsync(req.params._id)
			// 	.then(function(removed){
			// 		return res.status(200).json({"status":"OK",
			// 			"message":"Transport vendor data has been DELETED successfully",
			// 			"data":removed});
			// 	}).catch(next)
			// }
		}).catch(next)

	});

router.delete("/delete/:_id",function(req,res,next){
    if (otherUtil.isEmptyObject(req.params)){
        return res.status(500).json({"status":"ERROR","message":"No id provided to delete for driver"});
    }
	VendorTransportService.findTripRecordAsync({vendor: mongoose.Types.ObjectId(req.params._id)})
		.then(function(data){
			if(data && data[0]){
				return res.status(500).json({
					"status":"ERROR",
					"message":"Vendor link with trip you can not delete"
				});
				// req.body._cid_ = req.user.clientId;
				// req.body.deleted = false;
				// VendorTransportService.updateVendorTransportAsync(req.params._id,req.body)
				// 	.then(function(updated){
				// 		return res.status(200).json({"status":"OK",
				// 			"message":"Transport vendor data has been updated successfully",
				// 			"data":updated});
				// 	}).catch(next)
			}
			else
			{
				VendorTransportService.deleteVendTransRecordByIdAsync(req.params._id)
					.then(function(removed){
						return res.status(200).json({"status":"OK",
							"message":"Transport vendor data has been DELETED successfully",
							"data":removed});
					}).catch(next)
			}
		}).catch(next)
});

router.put("/reg_on_the_go/:vendor_id",
	function(req, res, next) {
		req.body.dataDriver.clientId = req.body.clientId;
		req.body.dataVehicle.clientId = req.body.clientId;
		if(req.body.isDriverRegistered === false){
			DriverService.findDriverQueryAsync({license_no:req.body.dataDriver.license_no})
				.then(function(driver){
					winston.info('found driver');
					if (driver && driver[0]){
						req.regDriver = driver[0];
						return next();
					}else{
						DriverService.addDriverAsync(req.body.dataDriver)
							.then(function(regdriver){
								req.regDriver = regdriver;
								return next();
							}).catch(next);
					}
				}).catch(next);
		}else{
			return next();
		}
	},
	function(req, res, next) {
		if(req.body.isVehicleRegistered === false){
			RegisteredVehicleService.findRegisteredVehicleQueryAsync({
				vehicle_reg_no: (otherUtil.replaceNonAlphaWithSpace(req.body.dataVehicle.vehicle_reg_no)).toUpperCase(),clientId:req.body.clientId
			}).then(function(registeredVehicle) {
			   if (registeredVehicle && registeredVehicle[0]) {
				   req.regVehicle = registeredVehicle[0];
				   return next();
			   } else {
				   if(req.regDriver) {
					   req.body.dataVehicle.driver_name = req.regDriver.name;
					   req.body.dataVehicle.driver_license = req.regDriver.license_no;
					   req.body.dataVehicle.driver_contact_no = req.regDriver.prim_contact_no;
					   req.body.dataVehicle.vendor_name = req.body.vendor_name;
					   req.body.dataVehicle.vendor_mobile = req.body.vendor_mobile;
					   req.body.dataVehicle.vendor_id = req.body.vendor_id;
				   }else{
					req.body.dataVehicle.driver_name = req.body.dataDriver.name;
					req.body.dataVehicle.driver_license = req.body.dataDriver.license_no;
					req.body.dataVehicle.driver_contact_no = req.body.dataDriver.prim_contact_no;
					req.body.dataVehicle.vendor_name = req.body.vendor_name;
					req.body.dataVehicle.vendor_mobile = req.body.vendor_mobile;
					req.body.dataVehicle.vendor_id = req.body.vendor_id;
				   }

			    RegisteredVehicleService.addRegisteredVehicleAsync(req.body.dataVehicle)
			     .then(function(regVehicleData){
				    req.regVehicle = regVehicleData;
				    return next();
			     })
			    }
		     }).catch(next);
		}else{
			return next();
		}
	},
	function(req, res, next) {
		if(req.regDriver && req.regDriver.license_no){
			if(req.regVehicle && req.regVehicle.vehicle_reg_no){
				req.body.dataVehicle._id = req.regVehicle._id;
				return res.status(200).json({"status":"OK",
					"message":"On the go operation done.",
					"data":req.body.dataVehicle});
			}else{
				req.body.dataVehicle._id = req.body.vehicle;
				return res.status(200).json({"status":"OK",
					"message":"Only Driver registered.",
					"data":req.body.dataVehicle});
			}
		}else{
			if(req.regVehicle && req.regVehicle.vehicle_reg_no){
				req.body.dataVehicle._id = req.regVehicle._id;
				return res.status(200).json({"status":"OK",
					"message":"On the go operation done.",
					"data":req.body.dataVehicle});
			}else{
				return res.status(200).json({"status":"OK",
					"message":"On the go operation failed.",
					"data":null});
			}
		}
	}
);

router.put('/update/:_id', async (req, res, next) => {
	if(otherUtil.isEmptyObject(req.params)) {
		return res.status(500).json({'status': 'ERROR', 'error_message': 'No id supplied'});
	}
	if(otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({'status': 'ERROR', 'error_message': 'Nothing in body'});
	}
	var vendor = await TransportVendor.findById(req.params._id);
	if(vendor) {

		req.vendorData = JSON.parse(JSON.stringify(vendor));
		return next();
	} else {
		return res.status(500).json({status: 'ERROR', error_message: 'Vendor does not exist'});
	}
}, multipartMiddleware, VendorTransportService.update);

module.exports = router;
