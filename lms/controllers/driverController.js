var router = require('express').Router();
var DriverService = promise.promisifyAll(commonUtil.getService('driver'));
var DriverServiceV2 = commonUtil.getService('driver');
var TripService = promise.promisifyAll(commonUtil.getService('trip'));
var acccountsServiceV2 = commonUtil.getService('accounts');
var acccountsService = promise.promisifyAll(commonUtil.getService('accounts'));
var UserService = promise.promisifyAll(commonUtil.getService('user'));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
var DriverAssociation = promise.promisifyAll(commonUtil.getModel('driverAssociation'));
var DriverAssociationService = promise.promisifyAll(commonUtil.getService('driverAssociation'));
var TransportRouteService = promise.promisifyAll(commonUtil.getService('transportRoute'));
var Driver = promise.promisifyAll(commonUtil.getModel('driver'));
let Accounts = promise.promisifyAll(commonUtil.getModel('accounts'));
var RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
var multipartMiddleware = require('connect-multiparty')();
var FileService = commonUtil.getUtil('file_upload_util');
let allowedFiles = ['Photo', 'Address Proof Front Copy', 'Address Proof Back Copy', 'License Front Copy', 'License Back Copy', 'Other'];
const ExcelReader = require('../../utils/ExcelReader');
const multer = require('multer');
const upload = multer({
	limits: {fileSize: 2 * 1000 * 1000},
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			cb(null, path.join(projectHome, 'files'))
		},
		filename: (req, file, cb) => {
			cb(null, `${Date.now()}-${file.originalname}`)
		}
	}),
	fileFilter: (req, file, cb) => {
		if (path.extname(file.originalname) !== '.xlsx') {
			return cb(new Error('Only excel files of type .xlsx are supported'));
		} else {
			cb(null, true);
		}
	}
});
/***********Multer Configuration for upload vehicle docs**************/
/*var maxFileSize = 2 * 1000 * 1000;//bytes(default)--->==1MB
var path = require('path');
var multer = require('multer');
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(projectHome,"files","users",req.user.clientId));
  },
  filename: function (req, file, cb) {
    cb(null, "driver_"+file.fieldname+"_"+req.params._id+path.extname(file.originalname));
  }
})

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
})*/
//****************************************************************
//************Allowed Docs****************************************
/*var driverUpload = upload.fields(
        [
            {name:"photo", maxCount: 1 },
            {name:"address_proof_front_copy", maxCount: 1 },
            {name:"address_proof_back_copy", maxCount: 1 },
            {name:"license_front_copy", maxCount: 1 },
            {name:"license_back_copy", maxCount: 1 }
        ]
    );*/
//*****************************************************************

/***********add new driver *******/
router.post('/add',
	function(req, res, next) {

		if(req.body.license_no){
			DriverService.findDriverQueryAsync({license_no: req.body.license_no, clientId: req.user.clientId})
				.then(function(driver) {
					if(driver && driver[0]) {
						return res.status(500).json({
							'status': 'ERROR',
							'message': 'Driver with this license number already exists',
							'data': driver
						});
					} else {
						return next();
					}
				}).catch(next);
		}else{
			next();
		}
	},
	function(req, res, next) {
		if(req.body.passportNo){
			DriverService.findDriverQueryAsync({passportNo: req.body.passportNo, clientId: req.user.clientId})
				.then(function(driver) {
					if(driver && driver[0]) {
						return res.status(500).json({
							'status': 'ERROR',
							'message': 'Driver with this Passport number already exists',
							'data': driver
						});
					} else {
						return next();
					}
				}).catch(next);
		}else{
			next();
		}
	},
	function(req, res, next) {
		if(req.body.employee_code){
			DriverService.findDriverQueryAsync({employee_code: req.body.employee_code, clientId: req.user.clientId})
				.then(function(driver) {
					if(driver && driver[0]) {
						return res.status(500).json({
							'status': 'ERROR',
							'message': 'Driver with this Code already exists',
							'data': driver
						});
					} else {
						return next();
					}
				}).catch(next);
		}else{
			next();
		}
	},
	function(req, res, next) {
	if(req.body.account){
		DriverService.findAccountQueryAsync({account :  mongoose.Types.ObjectId(req.body.account._id)})
			.then(function(driver) {
				if(driver && driver[0]) {
					return res.status(500).json({
						'status': 'ERROR',
						'message': `Account already link with driver ${driver[0].name}`,
					});
				} else {
					return next();
				}
			}).catch(next);
	}else{
		next();
	}},
	function(req, res, next) {
		DriverService.addDriverAsync(req.body)
			.then(function(driver) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Driver has been added successfully',
					'data': driver
				});
			}).catch(next);
	}
);


/***********add new driver auto account create *******/
router.post('/add2',
	function(req, res, next) {
	 if(req.body.license_no){
			DriverService.findDriverQueryAsync({license_no: req.body.license_no, clientId: req.user.clientId})
				.then(function(driver) {
					if(driver && driver[0]) {
						return res.status(500).json({
							'status': 'ERROR',
							'message': 'Driver with this license number already exists',
							'data': driver
						});
					} else {
						return next();
					}
				}).catch(next);
		}else{
			next();
		}
	},
	function(req, res, next) {
		if(req.body.passportNo){
			DriverService.findDriverQueryAsync({passportNo: req.body.passportNo, clientId: req.user.clientId})
				.then(function(driver) {
					if(driver && driver[0]) {
						return res.status(500).json({
							'status': 'ERROR',
							'message': 'Driver with this Passport number already exists',
							'data': driver
						});
					} else {
						return next();
					}
				}).catch(next);
		}else{
			next();
		}
	},
	function(req, res, next) {
		if(req.body.employee_code){
			DriverService.findDriverQueryAsync({employee_code: req.body.employee_code, clientId: req.user.clientId})
				.then(function(driver) {
					if(driver && driver[0]) {
						return res.status(500).json({
							'status': 'ERROR',
							'message': 'Driver with this Code already exists',
							'data': driver
						});
					} else {
						return next();
					}
				}).catch(next);
		}else{
			next();
		}
	},
	function(req, res, next) {
		if(!req.body.account && req.clientConfig && req.clientConfig.config && req.clientConfig.config.master && req.clientConfig.config.master.showAccount){
			acccountsServiceV2.findAccountByQueryV2({isGroup: true,
				name: "Direct Expenses",
				clientId:req.user.clientId})
				.then(function (account) {
					if(!(account && account.data && account.data[0])) {
						return res.status(500).json({
							'status': 'ERROR',
							'message': 'Direct expense ledger group  not exists',
						});
					} else {
						req.body.type = account.data[0]._id;
						return next();
					}
				}).catch(next)
		}else{
			next();
		}
	},
	function(req, res, next) {
		if(!req.body.account && req.clientConfig && req.clientConfig.config && req.clientConfig.config.master && req.clientConfig.config.master.showAccount){
			let obj = {
				clientId:req.user.clientId,
				accountType: "Cash in Hand",
				group: ["Driver"],
				isAdd: true,
				name: req.body.name + "(" + req.body.employee_code + ")",
				ledger_name: req.body.name,
				code: req.body.employee_code,
				type: {name: "Direct Expenses", level: 1}
			}
			obj.type._id = req.body.type;
			delete req.body.type;
			acccountsService.addAccountAsync(obj)
				.then(function(data) {
					if (data) {
						req.body.account = data;
						return next();
					} else {
						return res.status(200).json({
							'status': 'OK',
							'message': 'Nothing added.',
							'data': null
						})
					}
				})
				.catch(next)
		}else{
			next();
		}
	},
	function(req, res, next) {
		DriverService.addDriverAsync(req.body)
			.then(function(driver) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Driver has been added successfully',
					'data': driver
				});
			}).catch(next);
	}
);


/***********get all drivers + search *******/
router.get('/get', function(req, res, next) {
	req.query.clientId = req.user.clientId;
	DriverService.searchDriverAsync(req.query, false)
		.then(function(data) {
			if (req.query.download) {
				ReportExelService.driverReports(data.drivers, req.user.clientId, function(data){
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			}else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Drivers found',
					'data': data.drivers,
					'count': data.count,
					'pages': data.pages
				});
			}
		}).catch(next);
});

router.get('/report',async function(req, res, next) {
	try{
		let data = await DriverServiceV2.driverReport(req);
		if(req.query.downloadCSV){
			return res.status(200).json({
				status: "SUCCESS",
				message: 'report download available',
				url: data
			});
		} else if(req.query.download) {
			ReportExelService.driverReports(data, req.user.clientId, function(data){
				return res.status(200).json({
					"status": "OK",
					"message": "report download available.",
					"url": data.url
				});
			});
		}

	}catch(e){
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

/***********get all drivers + trim  + search *******/
router.get('/get/trim', function(req, res, next) {
	DriverService.searchDriverAsync(req.query, true)
		.then(function(data) {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Drivers found',
				'data': data.drivers
			});
		}).catch(next);
});

/***********update driver*******/
router.put('/update/:_id',
	function(req, res, next) {
		if(otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({'status': 'ERROR', 'error_message': 'Nothing in body for driver update'});
		}
		DriverService.findDriverIdAsync({_id: req.params._id})
			.then(function(driver) {
				if(driver && driver[0]) {
					req.driverData = JSON.parse(JSON.stringify(driver[0]));
					return next();
				} else {
					return res.status(500).json({'status': 'ERROR', 'error_message': 'Driver does not exist'});
				}
			});
	},
	function(req, res, next) {
		if(req.body.employee_code){
			var fFilter={
				clientId: req.user.clientId,
				_id: {$ne: req.params._id},
				"deleted" : false,
				employee_code: req.body.employee_code
			};
			DriverService.findDriverQueryAsync(fFilter)
				.then(function(driver) {
					if(driver && driver[0]) {
						return res.status(500).json({
							'status': 'ERROR',
							'message': 'Driver with this Code already exists',
							'data': driver
						});
					} else {
						return next();
					}
				}).catch(next);
		}else{
			next();
		}
	},
	function(req, res, next) {
	if(req.body.passportNo){
			var fFilter={
				clientId: req.user.clientId,
				_id: {$ne: req.params._id},
				"deleted" : false,
				passportNo: req.body.passportNo
			};
			DriverService.findDriverQueryAsync(fFilter)
				.then(function(driver) {
					if(driver && driver[0]) {
						return res.status(500).json({
							'status': 'ERROR',
							'message': 'Driver with this Passport number already exists',
							'data': driver
						});
					} else {
						return next();
					}
				}).catch(next);
		}else{
			next();
		}
	},
	//vehicleUpload
	multipartMiddleware,
	async function(req, res, next) {
		if(req.files) {
			await FileService.uploadFiles(req, 'Driver', req.driverData, allowedFiles);
		}
		req.body.documents = req.driverData.documents;
		delete req.files;
		DriverService.updateDriverIdAsync(req.params._id, req.body)
			.then(function(updated) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Driver data has been updated successfully',
					'data': updated
				});
			}).catch(next);
	}
);

router.post("/addHappay/:_id", async function (req, res, next){
	try {
		if (otherUtil.isEmptyObject (req.body)) {
			return res.status (500).json ({"status": "ERROR", "message": "No body found"});
		}
		if (!req.params || !req.params._id) {
			return res.status (500).json ({"status": "ERROR", "message": "Invalid request"});
		}

		if (!req.body.happay) {
			return res.status (500).json ({"status": "ERROR", "message": "HapPay not provided"});
		}
		let driver = await Driver.find ({clientId: req.user.clientId, _id: req.params._id});
		if (!driver || !(driver = driver[0])) {
			return res.status (500).json ({"status": "ERROR", "message": "Driver not found!"});
		}
		let happay = await Accounts.find ({clientId: req.user.clientId, _id: req.body.happay});
		if (!happay || !(happay = happay[0])) {
			return res.status (500).json ({"status": "ERROR", "message": "HapPay not found!"});
		}
		if (happay.group.indexOf('Happay') < 0) {
			return res.status (500).json ({"status": "ERROR", "message": "Selected account is not happay account"});
		}
		let updated = await Driver.update ({_id: req.params._id},
			{$set: {happay: happay._id},
			$push: {happayHistory: {happayAccount: happay._id, ass_date: new Date ()}}});

		return res.status (200).json ({
			"status": "OK",
			"message": "Happay Added on driver successfully",
			"data": updated
		});
	}catch (e){
		return res.status (500).json ({
			"status": "ERROR",
			"message": e.toString()
		});
	}
});

router.post('/delete/:id', async (req, res, next) => {
	try {
		let reqBody = req.body;
		if(!req.params.id)
			throw new Error('Mandatory fields are required');
		if(!reqBody)
			throw new Error('Mandatory fields are required');

		let  oDriver = await Driver.find({_id: otherUtil.arrString2ObjectId( req.params.id)}, {_id: 1}).lean();

		if (reqBody.deleted && oDriver && !oDriver.length)
			throw new Error('Driver Not Found');

		let  oRegVehicle = await RegisteredVehicle.find({driver: otherUtil.arrString2ObjectId( req.params.id)}, {vehicle_reg_no: 1, status:1}).lean();

		if (reqBody.deleted &&  oRegVehicle.length && oRegVehicle[0].status !='Available')
			throw new Error(`Can not Disable!! Driver is on vehicle ${oRegVehicle[0].vehicle_reg_no} and vehicle is ${oRegVehicle[0].status}`);

		 oDriver = await Driver.updateOne({_id: req.params.id, clientId: req.user.clientId}, {
			$set: {
				deleted:reqBody.deleted,
				last_modified_at: new Date(),
				last_modified_by_name:  req.user.full_name,
				last_modified_by:  req.user._id,
				last_modified_employee_code:  req.user.clientId
			}
		});

		return res.status(200).json({
			status: 'OK',
			message: 'Driver Updated!',
			data: oDriver
		})
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

/***********delete driver*******/
router.delete('/delete/:_id',
	function(req, res, next) {
		if(otherUtil.isEmptyObject(req.params)) {
			return res.status(500).json({'status': 'ERROR', 'error_message': 'No id supplied to delete driver'});
		}
		DriverService.findDriverIdAsync(req.params._id)
			.then(function(driver) {
				if(driver && driver[0]) {
					return next();
				} else {
					return res.status(500).json({'status': 'ERROR', 'error_message': 'Driver does not exist'});
				}
			}).catch(next);
	},
	function(req, res, next) {
		DriverService.deleteDriverIdAsync(req.params._id)
			.then(function(deleted) {
				return res.status(200).json({
					'status': 'OK',
					'message': 'Driver has been deleted',
					'data': deleted
				});
			}).catch(next);
	}
);

/************Get current active trip driver ************/
////////////query is user_id of loggedIn driver
router.get('/current_trip/get/', function(req, res, next) {
		req.query.clientId = req.user.clientId;
		UserService.findUserByIdAsync(req.query.user_id)
			.then(function(user) {
				if(user) {
					req.driverUser = user;
					return next();
				} else {
					return res.status(500).json({
						'status': 'ERROR',
						'message': 'Driver not found'
					});
				}
			}).catch(next);
	},
	function(req, res, next) {
		var query = {};
		query.trip_no = req.driverUser.current_active_trip_no;
		req.query = query;
		TripService.getAllTripsAsync(req)
			.then(function(trips) {
				req.trip = trips.data[0];
				if(trips && trips.data && trips.data.length > 0) {
					req.trip = trips.data[0];
				} else {
					req.trip = {};
				}
				if(trips && trips.data && trips.data.length > 0 && trips.data[0].route && trips.data[0].route.route_id) {
					return TransportRouteService.findTransportRouteIdAsync(trips.data[0].route.route_id);
				} else {
					return undefined;
				}
			}).then(function(routeData) {
			if(routeData) {
				req.trip.route.path = routeData;
			}
			return res.status(200).json({
				'status': 'OK',
				'message': 'Trips found',
				'data': req.trip
			});
		}).catch(next);
	});

/***********get driver report *******/
router.get('/getReport', function(req, res, next) {
	TripService.getAllTripsAsync(req)
		.then(function(data) {
			data = DriverService.makeDriverReport(data.data);
			return ReportExelService.generateDriverExcelAsync(data, req.query.clientId);
		})
		.error(function(url) {   //Since excel callback returns only file name
			return res.status(200).json({
				'status': 'OK',
				'message': 'bookings report available for download',
				'url': url
			});
		}).catch(next);
});

router.post("/driverexcel" , function(req,res,next)
{


	Driver.find()
		.then(function(dbData)
		{
			if (dbData && dbData[0]) {
				function ReportResponse(data) {
					return res.status(200).json({
						"status": "OK",
						"message": "Report download available.",
						"url": data.url
					});
				}

				if (req.body.download && (req.body.download !== "false")) {



					ReportExelService.generateDriverExcel(dbData,req.user.clientId,ReportResponse);

				} else {
					return res.status (200).json({
						"status": "OK",
						"message": "Driver data",
						"data": dbData
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No Drivers found.",
					"data":[]
				});
			}
		}).catch(next)




});


//Route to bulk update driver infromation by excel
router.post('/upload',upload.single('driverExcel'), async (req, res, next) => {
	try {
		const excelData = new ExcelReader({
			filePath: req.file.path,
			inject: {
				clientId: req.user.clientId,
				uploaded_at: new Date(),
				created_by: req.user._id,
				remark:'driver happay mapping'
			},
			config: {
				'name': {
					keyName: 'name',
					required: true
				},
				'happay': {
					keyName: 'happay',
					required: true,
				},
				'license': {
					keyName: 'license',
				},
				'vehicle': {
					keyName: 'vehicle',
				},
				'status': {
					keyName: 'status',
				}

			}
		});

		const partialDrivers = await excelData.read();

		const completeDrivers = await Promise.all(partialDrivers.map(async oDriver => {
			let happAccount;
			let driver = await Driver.findOne({
				clientId:req.user.clientId,
				name:  oDriver.name
			},{_id:1,name:1});
			if(!driver){
				console.log(oDriver.name);
			}
			if(oDriver.happay){
				 happAccount = await Accounts.findOne({
					clientId:req.user.clientId,
					name: { $regex: oDriver.happay, $options: 'i' }
				},{_id:1,name:1});
				if(!happAccount){
					console.log(oDriver.happay,' happay not found');
				}else if(!driver){
					console.log(oDriver.happay);
				}
			}else{
				//console.log(oDriver.name+" without happay");
			}
			if(driver && happAccount) {
				if(driver.happay && driver.happay.toString() == happAccount._id.toString()){
					console.log('already same happay on driver');
					return Promise.resolve({});
				}else{
					info = {
						driver_id:driver._id,
						happAccount_id:happAccount._id
					};
					return Promise.resolve(info);
				}
			}else{
				return Promise.resolve({});
			}

		}));
		let aBulk=[];
		for(let i=0;i<completeDrivers.length;i++){
			dr = completeDrivers[i];
			if(dr.driver_id){
				aBulk.push(dr);
			}
		}
		const driverStats = await Driver.bulkWrite(aBulk.map(dr => {
			return {
				updateOne: {
					filter: {
						_id: dr.driver_id
					},
					update: {
						//$setOnInsert: { _id: advId },
						$set: {happay:dr.happAccount_id},
					}
					//upsert: true
				}
			}
		}));

		return res.status(200).json({
			status: 'SUCCESS',
			//message:'test done'
			message: `${driverStats.nModified ? ('Existing advances modified: ' + driverStats.nModified) : ''}\n${driverStats.nUpserted ? ('New advances created: ' + driverStats.nUpserted) : ''}`,
		});
	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Something went wrong',
			error: e.toString()
		});

	}
});

module.exports = router;
