var router = require('express').Router();
var RegisteredVehicleService = promise.promisifyAll(commonUtil.getService("registeredVehicle"));
var RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
var DriverAssociationService = promise.promisifyAll(commonUtil.getService("driverAssociation"));
var RegisteredVehicleAssociation = promise.promisifyAll(commonUtil.getModel('registeredVehicleAssociation'));
var RegisteredVehicleAssociationService = promise.promisifyAll(commonUtil.getService("registeredVehicleAssociation"));
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
var locationService = promise.promisifyAll(commonUtil.getService("location"));
let Accounts = promise.promisifyAll(commonUtil.getModel('accounts'));
const Trip = commonUtil.getModel('trip');
var acccountsService = promise.promisifyAll(commonUtil.getService('accounts'));

var RegisteredVehicleModel = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));

var allowedFields = [ "owner_mobile","remark","sd","sa", "ownershipType", "status", "vendor_panNo", "vendor_phno", "vendor_address", "vendor_name", "soldVendor_name"];

let Async = require('async');

var vehicleBudget = commonUtil.getModel('vehicleBudget');
const ExcelReader = require("../../utils/ExcelReader");

/***********Multer Configuration for upload vehicle docs**************/
var maxFileSize = 1 * 1000 * 1000; //bytes(default)--->==1MB
var path = require('path');
var multer = require('multer');
const upload2 = multer({
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
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(projectHome, "files", "users", req.user.clientId));
    },
    filename: function(req, file, cb) {
        cb(null, "vehicle_" + file.fieldname + "_" + req.params._id + path.extname(file.originalname));
    }
})

var upload = multer({
        storage: storage,
        //dest: path.join(projectHome,"files","users"),
        limits: { fileSize: maxFileSize },
        fileFilter: function(req, file, cb) {
            // The function should call `cb` with a boolean
            // to indicate if the file should be accepted
            //var doc_mimes = "image/jpeg image/bmp image/png application/pdf";
            if ((file.mimetype == 'image/jpeg') || (file.mimetype == 'image/png') || (file.mimetype == 'image/bmp') || (file.mimetype == 'application/pdf')) {
                // To accept the file pass `true`, like so:
                cb(null, true);
            } else {
                // To reject this file pass `false`, like so:
                cb(null, false)
            }
            // You can always pass an error if something goes wrong:
            //cb(new Error('I don\'t have a clue!'))
        }
    });
    //****************************************************************
    //************Allowed Docs****************************************
var vehicleUpload = upload.fields(
    [
        { name: "vehicle_image", maxCount: 1 },
        { name: "permit_doc", maxCount: 1 },
        { name: "fitness_certificate_doc", maxCount: 1 },
        { name: "chassis_trace", maxCount: 1 },
        { name: "insurance_doc", maxCount: 1 },
        { name: "road_tax_doc", maxCount: 1 },
        { name: "rc_book_doc", maxCount: 1 }
    ]
);
//*****************************************************************

router.post('/uploadRates', upload2.single('vehicleRate'), async (req, res, next) => {
	try {
		const excelData = new ExcelReader({
			filePath: req.file.path,
			inject: {
				clientId: req.user.clientId,
				updatedAt: new Date(),
				createdAt: new Date(),
				userName: req.user.full_name,
			},
			config: {
				'vId': {
					keyName: 'veh',
					required: true,
				},
				'Vehicle No': {
					keyName: 'vehicle_no',
					required: true,
				},
				'Normal Rate': {
					keyName: 'rpk1',
					ignoreIfValueIs: 'NA',
				},
				'Normal Mileage': {
					keyName: 'mileage1',
					ignoreIfValueIs: 'NA',
				},
				'Normal Advance': {
					keyName: 'adv1',
					ignoreIfValueIs: 'NA',
				},
				'Express Rate': {
					keyName: 'rpk2',
					ignoreIfValueIs: 'NA',
				},
				'Express Mileage': {
					keyName: 'mileage2',
					ignoreIfValueIs: 'NA',
				},
				'Express Advance': {
					keyName: 'adv2',
					ignoreIfValueIs: 'NA',
				},
				'Empty Rate': {
					keyName: 'rpk3',
					ignoreIfValueIs: 'NA',
				},
				'Empty Mileage': {
					keyName: 'mileage3',
					ignoreIfValueIs: 'NA',
				},
				'Empty Advance': {
					keyName: 'adv3',
					ignoreIfValueIs: 'NA',
				},
				'Standard Rate': {
					keyName: 'rpk4',
					ignoreIfValueIs: 'NA',
				},
				'Standard Mileage': {
					keyName: 'mileage4',
					ignoreIfValueIs: 'NA',
				},
				'Standard Advance': {
					keyName: 'adv4',
					ignoreIfValueIs: 'NA',
				},
				'Time Committed Rate': {
					keyName: 'rpk5',
					ignoreIfValueIs: 'NA',
				},
				'Time Committed Mileage': {
					keyName: 'mileage5',
					ignoreIfValueIs: 'NA',
				},
				'Time Committed Advance': {
					keyName: 'adv5',
					ignoreIfValueIs: 'NA',
				},
				'Ferry/Empty Rate': {
					keyName: 'rpk6',
					ignoreIfValueIs: 'NA',
				},
				'Ferry/Empty Mileage': {
					keyName: 'mileage6',
					ignoreIfValueIs: 'NA',
				},
				'Ferry/Empty Advance': {
					keyName: 'adv6',
					ignoreIfValueIs: 'NA',
				}
			},
		});

		let partialAdvances = await excelData.read();
		let stats = [];

		for(const d of partialAdvances) {
			let statsObj = {
				'vId': d.veh,
				'VEHICLE NO': d.vehicle_no,
				'STATUS': 'FAIL',
				'REJECTION REASON': [],
			};
			let vehicle = await RegisteredVehicle.find({
				clientId: req.user.clientId,
				_id: d.veh,
				vehicle_reg_no: d.vehicle_no
			}).lean();
			if (!vehicle || !(vehicle = vehicle[0])) {
				statsObj['REJECTION REASON'].push(`Vehicle not found!`);
				statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
				stats.push(statsObj);
				continue;
			}
			vehicle = vehicle || vehicle[0];
			let aRates = [];

			if (d.rpk1 || d.adv1 || d.mileage1) {
				aRates.push({
						"serviceTyp": 'Normal',
						"rpk": d.rpk1,
						"mileage": d.mileage1,
						"adv": d.adv1,
					}
				)
			}
			if (d.rpk2 || d.adv2 || d.mileage2) {
				aRates.push({
						"serviceTyp": 'Express',
						"rpk": d.rpk2,
						"mileage": d.mileage2,
						"adv": d.adv2,
					}
				)
			}
			if (d.rpk3 || d.adv3 || d.mileage3) {
				aRates.push({
						"serviceTyp": 'Empty',
						"rpk": d.rpk3,
						"mileage": d.mileage3,
						"adv": d.adv3,
					}
				)
			}
			if (d.rpk4 || d.adv4 || d.mileage4) {
				aRates.push({
						"serviceTyp": 'Standard',
						"rpk": d.rpk4,
						"mileage": d.mileage4,
						"adv": d.adv4,
					}
				)
			}
			if (d.rpk5 || d.adv5 || d.mileage5) {
				aRates.push({
						"serviceTyp": 'Time Committed',
						"rpk": d.rpk5,
						"mileage": d.mileage5,
						"adv": d.adv5,
					}
				)
			}
			if (d.rpk6 || d.adv6 || d.mileage6) {
				aRates.push({
						"serviceTyp": 'Ferry/Empty',
						"rpk": d.rpk6,
						"mileage": d.mileage6,
						"adv": d.adv6,
					}
				)
			}
			if (!aRates.length) {
				statsObj['REJECTION REASON'].push(`add at least one service rate`);
				statsObj['REJECTION REASON'] = statsObj['REJECTION REASON'].join(', ');
				stats.push(statsObj);
				continue;
			}

			if (aRates.length) {
				for (const list of aRates) {
					let data2save = new vehicleBudget({
						"clientId": d.clientId,
						"veh": vehicle._id,
						"userName": d.userName,
						"createdAt": d.createdAt,
						"serviceTyp": list.serviceTyp,
						"rpk": list.rpk,
						"mileage": list.mileage,
						"adv": list.adv,
					});
					let savedData = await data2save.save();

					if (savedData) {
						await RegisteredVehicle.update({clientId: req.user.clientId, _id: vehicle && vehicle._id},
							{
								$set: {
									[`current_budget.${list.serviceTyp}`]:
										{
											"date": d.createdAt,
											"serviceTyp": list.serviceTyp,
											"rpk": list.rpk,
											"mileage": list.mileage,
											"adv": list.adv,
										}
								}

							});
					}
				}


			}
		}

		return res.status (200).json ({
			"status": "OK",
			"message":  stats.length  + ' Record failed to Upload and ' + (partialAdvances.length - stats.length) +  ' data are successfully Uploaded ',
			"data": stats
		});
	} catch (e) {
		console.error('vehicle Rate upload error', e.toString());
		if (!res.headersSent) {
			return res.status(500).json({
				status: 'ERROR',
				message: e.toString(),
				error: e.toString()
			});
		}
	}
});

/***********add new registered vehicle *******/
router.post("/vehiclecheck", async function (req, res, next) {

	let vehObj = {};
	if (req.body.vehicle_reg_no) {

		if(req.body._id){
			vehObj = {
				vehicle_reg_no: (otherUtil.replaceNonAlphaWithSpace(req.body.vehicle_reg_no)).toUpperCase(),
				clientId: req.body.clientId,
				_id:{$ne:req.body._id}
			};
		} else {
			vehObj = {
				vehicle_reg_no: (otherUtil.replaceNonAlphaWithSpace(req.body.vehicle_reg_no)).toUpperCase(),
				clientId: req.body.clientId
			};
		}
	RegisteredVehicleService.findRegisteredVehicleQueryAsync(vehObj)
		.then(function (registeredVehicle) {
			if (registeredVehicle && registeredVehicle[0]) {
				return res.status(500).json({
					"status": "ERROR",
					"message": "Vehicle registration number already exits in the database",
					"data": registeredVehicle
				});
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "Vehicle registration number is correect",
					"data": {}
				});
			}
		}).catch(next);
	}
});

/***********add new vehicle auto account create *******/

router.post("/add2",
    function(req, res, next) {

		let vehObj = {
			vehicle_reg_no: (otherUtil.replaceNonAlphaWithSpace(req.body.vehicle_reg_no)).toUpperCase(),
			clientId: req.body.clientId
		};

		if(req.body.ownershipType != 'Own' && !req.body.vendor_id){
			return res.status(500).json({
				"status": "ERROR",
				"message": "No Vendor Found",
			});
		}

        RegisteredVehicleService.findRegisteredVehicleQueryAsync(vehObj)
            .then(function(registeredVehicle) {
				switch(registeredVehicle.length){
					case 0: return next();
					case 1:
						registeredVehicle = registeredVehicle[0];
						if(registeredVehicle.ownershipType === "Sold" && req.body.ownershipType === "Own")
							return next();
					default:
						return res.status(500).json({
							"status": "ERROR",
							"message": "Vehicle registration number already exits in the database",
							"data": registeredVehicle
						});
				}
            }).catch(next);
    },

	function(req, res, next) {
		if(!req.body.account && req.clientConfig.config && req.clientConfig.config.autoAccount && req.clientConfig.config.autoAccount.vehicle){
			let obj = {
				clientId:req.user.clientId,
				accountType: "Cash in Hand",
				group: ["Vehicle"],
				isAdd: true,
				name: req.body.vehicle_reg_no,
				ledger_name: req.body.vehicle_reg_no,
				code: req.body.vehicle_reg_no,
				type: {
					name: req.clientConfig.config.autoAccount.vehicle.name,
					_id : req.clientConfig.config.autoAccount.vehicle.type
				}
			}
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
        winston.info('rh');
        RegisteredVehicleService.addRegisteredVehicleAsync(req.body)
            .then(function(registeredVehicle) {

                /*if(imeiToVehicleRegNoCache[registeredVehicle.device_imei]) {
                  imeiToVehicleRegNoCache[registeredVehicle.device_imei].push(registeredVehicle.vehicle_reg_no);
                } else {
                  imeiToVehicleRegNoCache[registeredVehicle.device_imei] = [registeredVehicle.vehicle_reg_no];
                }*/
                return res.status(200).json({
                    "status": "OK",
                    "message": "Registered vehicle has been added successfully",
                    "data": registeredVehicle
                });
            }).catch(next);
    }
);



router.post("/add",
	function(req, res, next) {

		let vehObj = {
			vehicle_reg_no: (otherUtil.replaceNonAlphaWithSpace(req.body.vehicle_reg_no)).toUpperCase(),
			clientId: req.body.clientId
		};

		if(req.body.ownershipType != 'Own' && !req.body.vendor_id){
			return res.status(500).json({
				"status": "ERROR",
				"message": "No Vendor Found",
			});
		}

		RegisteredVehicleService.findRegisteredVehicleQueryAsync(vehObj)
			.then(function(registeredVehicle) {
				switch(registeredVehicle.length){
					case 0: return next();
					case 1:
						registeredVehicle = registeredVehicle[0];
						if(registeredVehicle.ownershipType === "Sold" && req.body.ownershipType === "Own")
							return next();
					default:
						return res.status(500).json({
							"status": "ERROR",
							"message": "Vehicle registration number already exits in the database",
							"data": registeredVehicle
						});
				}
			}).catch(next);
	},
	function(req, res, next) {
		if(req.body.account){
			RegisteredVehicleService.findAccountQueryAsync({account :  mongoose.Types.ObjectId(req.body.account._id)})
				.then(function(registeredVehicle) {
					if(registeredVehicle && registeredVehicle[0]) {
						return res.status(500).json({
							'status': 'ERROR',
							'message':`Account already link with vehicle ${registeredVehicle[0].vehicle_reg_no}`,
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
		winston.info('rh');
		RegisteredVehicleService.addRegisteredVehicleAsync(req.body)
			.then(function(registeredVehicle) {

				/*if(imeiToVehicleRegNoCache[registeredVehicle.device_imei]) {
				  imeiToVehicleRegNoCache[registeredVehicle.device_imei].push(registeredVehicle.vehicle_reg_no);
				} else {
				  imeiToVehicleRegNoCache[registeredVehicle.device_imei] = [registeredVehicle.vehicle_reg_no];
				}*/
				return res.status(200).json({
					"status": "OK",
					"message": "Registered vehicle has been added successfully",
					"data": registeredVehicle
				});
			}).catch(next);
	}
);


/*****add Mileage and rate per kilometre for vehicles****/
router.post("/addrates/:_id",
	function (req, res, next) {

		RegisteredVehicleService.findRegisteredVehicleQueryAsync({
			_id: req.params._id,
			clientId: req.user.clientId
		})
			.then(function (registeredVehicle) {
				if (registeredVehicle && registeredVehicle[0]) {

					return next();

				} else {
					return res.status(200).json({
						"status": "ERROR",
						"message": "Vehicle number does not exists in the database",
						"data": registeredVehicle
					});
				}

			}).catch(next);
	},
	function (req ,res ,next) {
	req.body.clientId = req.user.clientId;
	req.body.user = req.user._id;
		req.body._id = req.params._id;

	RegisteredVehicleService.addRatesAsync(req.body)
		.then(function(data)
	{
		return res.status(200).json({
			"status": "OK",
			"message": "Rates has been added",
			"data": data,

		});
	}).catch(next)

}
);

router.post("/getrates", async function(req, res, next) {

	try {

		await RegisteredVehicleService.getRates(req, res);

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

router.post("/associate_segment",
	function (req, res, next) {
		RegisteredVehicleService.updateMultipleVehicleSegmentAsync({
			body: req.body,
			user: req.user
		})
		.then(function (registeredVehicle) {
			if (registeredVehicle.ok) {

				return res.status (200).json ({
					"status": "OK",
					"message": "Vehicles Updated successfully",
					"data": registeredVehicle
				});
			}

			return res.status(200).json({
				"status": "ERROR",
				"message": registeredVehicle,
				"data": registeredVehicle
			});

		}).catch(next);
	}
);

router.post("/addFasttag/:_id", async function (req, res, next){
	try {
		if (otherUtil.isEmptyObject (req.body)) {
			return res.status (500).json ({"status": "ERROR", "message": "No body found"});
		}
		if (!req.params || !req.params._id) {
			return res.status (500).json ({"status": "ERROR", "message": "Invalid request"});
		}

		if (!req.body.fasttag) {
			return res.status (500).json ({"status": "ERROR", "message": "FastTag not provided"});
		}
		let vehicle = await RegisteredVehicle.find ({clientId: req.user.clientId, _id: req.params._id});
		if (!vehicle || !(vehicle = vehicle[0])) {
			return res.status (500).json ({"status": "ERROR", "message": "Vehicle not found!"});
		}
		let fasttag = await Accounts.find ({clientId: req.user.clientId, _id: req.body.fasttag});
		if (!fasttag || !(fasttag = fasttag[0])) {
			return res.status (500).json ({"status": "ERROR", "message": "FastTag not found!"});
		}
		if (fasttag.group.indexOf("FastTag") < 0 ) {
			return res.status (500).json ({"status": "ERROR", "message": "Selected account is not fasttag account"});
		}
		let updated = await RegisteredVehicle.update ({_id: req.params._id},
			{$set: {fasttag: fasttag._id},
			$push: {fasttagHistory: {tagAccount: fasttag._id, ass_date: new Date ()}}});

		return res.status (200).json ({
			"status": "OK",
			"message": "FastTag Added on vehicle successfully",
			"data": updated
		});
	}catch (e){
		return res.status (500).json ({
			"status": "ERROR",
			"message": e.toString()
		});
	}
});

/***********get all registered vehicles ******lm*/
router.post("/get", function(req, res, next) {
	if(req.body.cClientId)
		req.body.clientId = req.body.cClientId;

    RegisteredVehicleService.searchRegisteredVehicleAsync(req.body, req)
        .then(function(data) {
			if (data && data.data[0]) {
				function ReportResponse(dbdata) {
					return res.status(200).json({
						"status": "OK",
						"message": "Report download available.",
						"url":dbdata.url
					});
				}
				if (req.body.download && (req.body.download !== "false")) {
					ReportExelService.generateVehicleExcel(data,req.user.clientId,ReportResponse);
				} else {
					return res.status (200).json({
						"status": "OK",
						"message": "Registered vehicles found",
						"data": data.data,
						"count": data.count,
						"pages": data.pages
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No Registered vehicles found",
					"data":[]
				});
			}
        }).catch(next)
});

/***********get all registered vehicles ******lm*/
router.get("/get", function(req, res, next) {
	if(req.body.cClientId)
		req.body.clientId = req.body.cClientId;
    if(req.query && Object.keys(req.query).length){
		//TDO do it properly used on maintenenace
		req.body = req.query;
	}
	if(req.body.own){
		req.body.ownershipType = 'Own';
		delete req.body.own;
	}
	RegisteredVehicleService.searchRegisteredVehicleAsync(req.body, req)
		.then(function(data) {
			if (data && data.data[0]) {
				function ReportResponse(dbdata) {
					return res.status(200).json({
						"status": "OK",
						"message": "Report download available.",
						"url":dbdata.url
					});
				}
				if (req.body.download && (req.body.download !== "false")) {
					ReportExelService.generateVehicleExcel(data,req.user.clientId,ReportResponse);
				} else {
					return res.status (200).json({
						"status": "OK",
						"message": "Registered vehicles found",
						"data": data.data,
						"count": data.count,
						"pages": data.pages
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No Registered vehicles found",
					"data":[]
				});
			}
		}).catch(next)
});

router.post("/vehicleexcel" , function(req,res,next)
{


	RegisteredVehicle.find()
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



					ReportExelService.generateVehicleExcel(dbData,req.user.clientId,ReportResponse);

				} else {
					return res.status (200).json({
						"status": "OK",
						"message": "Registered Vehicle data",
						"data": dbData
					});
				}
			} else {
				return res.status(200).json({
					"status": "OK",
					"message": "No Registered Vehicles found.",
					"data":[]
				});
			}
		}).catch(next)




})

router.post('/vehicles-for-allocation', (req, res, next) => {
  RegisteredVehicleService.getVehiclesForAllocationAsync(req)
      .then(function(data) {
        return res.status(200).json({
          "status": "OK",
          "message": "Registered vehicles found",
          "data": data,
        });
      })
  .catch(next);
});

/***********get all registered vehicles + trim  *******/
router.get("/get/trim", function(req, res, next) {
    RegisteredVehicleService.searchRegisteredVehicleAsync(req.query, true)
        .then(function(data) {
            return res.status(200).json({
                "status": "OK",
                "message": "Registered vehicles found",
                "data": data.registeredVehicles
            });
        }).catch(next)
});

router.post("/get/trim", function(req, res, next) {
    RegisteredVehicleService.searchRegisteredVehicleAggrAsync(req.body)
        .then(function(data) {
            return res.status(200).json({
                "status": "OK",
                "message": "Registered vehicles found",
                "data": data.data
            });
        }).catch(next)
});

router.post('/delete/:id', async (req, res, next) => {
	try {
		let reqBody = req.body;
		if(!req.params.id)
			throw new Error('Mandatory fields are required');
		if(!reqBody)
			throw new Error('Mandatory fields are required');

		let  oRegVehicle = await RegisteredVehicle.find({_id: otherUtil.arrString2ObjectId( req.params.id)}, {status: 1}).lean();

		if (reqBody.deleted && oRegVehicle && !oRegVehicle.length)
			throw new Error('Vehicle Not Found');

		if (reqBody.deleted &&  oRegVehicle[0].status !='Available')
			throw new Error(`Can Not Disable Vehicle is ${oRegVehicle[0].status}`);

		let oVehicle = await RegisteredVehicle.updateOne({_id: req.params.id, clientId: req.user.clientId}, {
			$set: {
				deleted:reqBody.deleted,
				last_modified_at: new Date(),
				last_modified_by_name:  req.user.full_name
			}
		});

		return res.status(200).json({
			status: 'OK',
			message: 'vehicle Updated!',
			data: oVehicle
		})
	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}
});

router.put("/update/:_id",
    // validates when the vendor is modified then the vehicle registration number should be unique for each vendor.
	async function(req, res, next) {

		if (!req.params._id)
			return res.status(405).json({
				"status": "ERROR",
				"message": 'No Vehicle Reg Id Found',
			});

		if(
			req.clientConfig
			&& req.clientConfig.config
			&& req.clientConfig.config.master
			&& req.clientConfig.config.master.showAccount
			&& req.body.ownershipType != 'Market'
		){
			if (!req.body.account)
				return res.status(405).json({
					"status": "ERROR",
					"message": 'Account is mandatory',
				});
		}

		let vehObj = {
			vehicle_reg_no: req.body.vehicle_reg_no,
			clientId: req.body.clientId,
			ownershipType: req.body.ownershipType
		};

		if(req.body.ownershipType != 'Own' && req.body.ownershipType != 'Sold'){
			if(req.body.vendor_id)
				vehObj.vendor_id = req.body.vendor_id;
			else {
				return res.status(405).json({
					"status": "ERROR",
					"message": "No Vendor Found",
				});
			}
		}

		if(req.body.ownershipType === 'Sold' && req.body.status === 'In Trip'){
				return res.status(405).json({
					"status": "ERROR",
					"message": "cant Sold vehicle in trip",
				});

		}

		let foundVeh = await RegisteredVehicleModel.find(vehObj).lean();

		if(foundVeh.length > 1 || (foundVeh.length == 1 && foundVeh[0]._id.toString() !== req.params._id))
			return res.status(405).json({
				"status": "ERROR",
				"message": `Vehicle ${req.body.vehicle_reg_no} already exist`,
			});

		// if(req.body.deleted && !foundVeh[0].deleted && foundVeh[0].last_known.trip){
		// 	let foundTrip = await Trip.findOne({_id: foundVeh[0].last_known.trip}, {_id: 1, status: 1, trip_no: 1}).lean();
        //
		// 	if(foundTrip && ["Trip ended", "Trip cancelled"].indexOf(foundTrip.status) == -1)
		// 		return res.status(405).json({
		// 			"status": "ERROR",
		// 			"message": `Vehicle cannot be deleted. Its Allocated on trip ${foundTrip.trip_no}`,
		// 		});
		// }

		return next();
	},
    function(req, res, next) {
        //delete req.body.vehicle_reg_no;
        delete req.body.budgeting;
        delete req.body.current_budget;

        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "No update body found"
            });
        }
        RegisteredVehicleService.findRegisteredVehicleIdAsync(req.params._id)
            .then(function(registeredVehicle) {
                if (registeredVehicle && registeredVehicle[0]) {
                    req.__vehicle_reg_no = registeredVehicle[0].vehicle_reg_no;
                    req.__old_imei = registeredVehicle[0].device_imei;
                    req.vehicleData = JSON.parse(JSON.stringify(registeredVehicle[0]));
                    return next();
                } else {
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": "Registered vehicle does not exist"
                    });
                }
            });
    },
    //vehicleUpload
    function(req, res, next) {
        vehicleUpload(req, res, function(err) {
            if (err) {
                return res.status(500).json({
                    "status": "ERROR",
                    "error_message": JSON.stringify(err)
                });
            } else {
                return next();
            }
        })
    },
    function(req, res, next) {
        if (req.files) {
            if ((req.files.vehicle_image) && (req.files.vehicle_image[0]) && (req.files.vehicle_image[0].filename !== undefined)) req.body.vehicle_image = req.files.vehicle_image[0].filename;
            if ((req.files.permit_doc) && (req.files.permit_doc[0]) && (req.files.permit_doc[0].filename !== undefined)) req.body.permit_doc = req.files.permit_doc[0].filename;
            if ((req.files.fitness_certificate_doc) && (req.files.fitness_certificate_doc[0]) && (req.files.fitness_certificate_doc[0].filename !== undefined)) req.body.fitness_certificate_doc = req.files.fitness_certificate_doc[0].filename;
            if ((req.files.chassis_trace) && (req.files.chassis_trace[0]) && (req.files.chassis_trace[0].filename !== undefined)) req.body.chassis_trace = req.files.chassis_trace[0].filename;
            if ((req.files.insurance_doc) && (req.files.insurance_doc[0]) && (req.files.insurance_doc[0].filename !== undefined)) req.body.insurance_doc = req.files.insurance_doc[0].filename;
            if ((req.files.road_tax_doc) && (req.files.road_tax_doc[0]) && (req.files.road_tax_doc[0].filename !== undefined)) req.body.road_tax_doc = req.files.road_tax_doc[0].filename;
            if ((req.files.rc_book_doc) && (req.files.rc_book_doc[0]) && (req.files.rc_book_doc[0].filename !== undefined)) req.body.rc_book_doc = req.files.rc_book_doc[0].filename;
        }
        if (req.body.driver != req.vehicleData.driver) {
            RegisteredVehicle.updateAsync({ clientId: req.user.clientId, driver: req.body.driver }, { $unset: { driver: "", driver_contact_no: "", driver_employee_code: "", driver_license: "", driver_name: "" } }, { multi: true })
                .then(function(udVeh) {
                    logger.info("Driver: disassociated from: " + udVeh.nModified + " vehicles");
                    RegisteredVehicleService.updateRegisteredVehicleIdAsync(req.params._id, req.body)
                        .then(function(updated) {
                        	/*if(imeiToVehicleRegNoCache[req.__old_imei]){
								var index = imeiToVehicleRegNoCache[req.__old_imei].findIndex((vehNo) => vehNo === req.__vehicle_reg_no);
								imeiToVehicleRegNoCache[req.__old_imei].splice(index, 1);
								if(imeiToVehicleRegNoCache[updated.device_imei]) {
									imeiToVehicleRegNoCache[updated.device_imei].push(req.__vehicle_reg_no);
								} else {
									imeiToVehicleRegNoCache[updated.device_imei] = [req.__vehicle_reg_no];
								}
							}*/
                            return res.status(200).json({
                                "status": "OK",
                                "message": "Registered vehicle data has been updated successfully",
                                "data": updated
                            });
                        }).catch(next)
                })
        } else {
            RegisteredVehicleService.updateRegisteredVehicleIdAsync(req.params._id, req.body)
                .then(function(updated) {

                    return res.status(200).json({
                        "status": "OK",
                        "message": "Registered vehicle data has been updated successfully",
                        "data": updated
                    });
                }).catch(next)
        }


    }
);

/***********delete registered vehicle*******/
router.delete("/delete/:_id",
    function(req, res, next) {
        if (otherUtil.isEmptyObject(req.body)) {
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "No id supplied for delete operation"
            });
        }
        if (otherUtil.isEmptyObject(req.params)) {
            return res.status(500).json({
                "status": "ERROR",
                "error_message": "No id supplied to delete registered vehicle"
            });
        }
        RegisteredVehicleService.findRegisteredVehicleIdAsync(req.params._id)
            .then(function(registeredVehicle) {
                if (registeredVehicle && registeredVehicle[0]) {
                    console.log("found registered vehicle" + registeredVehicle[0]);
                    return next()
                } else {
                    return res.status(500).json({
                        "status": "ERROR",
                        "error_message": "Registered vehicle does not exist"
                    });
                }
            }).catch(next)
    },
    function(req, res, next) {
        RegisteredVehicleService.deleteRegisteredVehicleAsync(req.params._id)
            .then(function(deleted) {
                /*if(imeiToVehicleRegNoCache[deleted.device_imei] && imeiToVehicleRegNoCache[deleted.device_imei].length > 1) {
                  var i = imeiToVehicleRegNoCache[deleted.device_imei].findIndex(curr => curr === deleted.vehicle_reg_no);
                  imeiToVehicleRegNoCache[deleted.device_imei].splice(i, 1);
                } else {
                  delete imeiToVehicleRegNoCache[deleted.device_imei];
                }*/
                return res.status(200).json({
                    "status": "OK",
                    "message": "Registered vehicle has been deleted successfully",
                    "data": deleted
                });
            }).catch(next)
    }
);

router.get("/report", function(req, res, next) {
    if (req.query && req.query.reportType) {
        req.reportType = (req.query.reportType == "Offtrip") ? req.query.reportType : "";
        delete req.query.reportType;
    }
    if (req.query && req.query.download) {
        req.reportDownload = req.query.download;
        delete req.query.download;
    }
    req.query.all = true;
    RegisteredVehicleService.searchReportRegisteredVehicleAsync(req.query, false)
        .then(function(data) {
            if (data && data.registeredVehicles && data.registeredVehicles[0]) {
                var aObjectLevel = [];
                if (req.reportType && (req.reportType == "Offtrip")) {
                    locationService.fillVehiclesWithLocationAsync(data.registeredVehicles)
                        .then(function(filledData) {
                            aObjectLevel = filledData;
                            if (req.reportDownload) {
                                ReportExelService.generateRegisteredVehicleExcel(aObjectLevel, req.query.clientId, ReportResponse, req.reportType)
                            } else {
                                ReportResponse({});
                            }
                        })
                } else {
                    aObjectLevel = data.registeredVehicles;
                    if (req.reportDownload) {
                        ReportExelService.generateRegisteredVehicleExcel(aObjectLevel, req.query.clientId, ReportResponse)
                    } else {
                        ReportResponse({});
                    }
                }

                function ReportResponse(url) {
                    return res.status(200).json({
                        "status": "OK",
                        "message": "Registered vehicle report download available.",
                        "data": aObjectLevel,
                        "url": url.url
                    });
                };
            } else {
                return res.status(200).json({
                    "status": "OK",
                    "message": "no registered vehicle found",
                    "data": []
                });
            }
        }).catch(next)
});

router.post('/updateRegVehicle/:_id', async function (req, res) {

	try {
        let lastTrip;
		if (!req.params._id)
			throw new Error('Mandatory Fields are required');

		// if (!req.body.owner_mobile)
		// 	throw new Error('Mandatory Fields are required');

		let oRegVehicle = await RegisteredVehicle.findOne({_id: req.params._id},{_id:1, status: 1,last_known:1}).lean();

		if (!oRegVehicle)
			throw new Error('Vehicle not Found');

		if (req.body.ownershipType === 'Sold' && (oRegVehicle.status != "Available" && oRegVehicle.status != "Sold"))
			throw new Error("cant Sold vehicle in trip");

		if(req.body && req.body.ownershipType === 'Sold'){
			if(oRegVehicle.last_known && oRegVehicle.last_known.trip)
			     lastTrip = await Trip.findOne({_id: oRegVehicle.last_known.trip},{_id: 1,end_date: 1}).lean();
			if(lastTrip && lastTrip.end_date && new Date(req.body.sd) < new Date(lastTrip.end_date))
				throw new Error("cant Sold vehicle befour trip end");
		}

		let body = {};
		for (let i in req.body) {
			if (otherUtil.isAllowedFilter(i, allowedFields)) {
				body[i] = req.body[i];
			}
		}
		await RegisteredVehicle.updateOne({_id: req.params._id}, {
			$set: {
				...body,
				last_modified_at: new Date(),
				last_modified_by_name:  req.user.full_name,
				last_modified_by:  req.user._id,
				last_modified_employee_code:  req.user.clientId
			}
		});


		return res.status(200).json({
			message: 'Successfully updated'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

router.put('/updateStatus/:id', async function (req, res) {
	try {
		if (!req.params.id)
			throw new Error('Mandatory Fields are required');

		let oRegVehicle = await RegisteredVehicle.findOne({_id: mongoose.Types.ObjectId(req.params.id)},{status:1}).lean();
		if (!oRegVehicle)
			throw new Error('Vehicle not Found');
		if (oRegVehicle.status === req.body.status)
			throw new Error(`Vehicle already ${req.body.status}`);
		let trip;
		if(req.body.status === "Available" ||  req.body.status === "Maintenance"){
			trip = await Trip.findOne({"vehicle" : mongoose.Types.ObjectId(req.params.id),status:"Trip started",end_date:{$exists:false}},{trip_no:1});
			if(trip){
				throw new Error(`Vehicle already on trip ${trip.trip_no}`);
			}
		}else if(req.body.status === "In Trip"){
			trip = await Trip.findOne({"vehicle" : mongoose.Types.ObjectId(req.params.id),status:"Trip started",end_date:{$exists:false}},{trip_no:1});
			if(!trip){
				throw new Error(`No running trip available in this vehicle`);
			}
		}

		await RegisteredVehicle.updateOne({_id: mongoose.Types.ObjectId(req.params.id)}, {
			$set: {
				status:req.body.status,
				"last_known.status":req.body.status,
				last_modified_at: new Date(),
				last_modified_by_name:  req.user.full_name,
				last_modified_by:  req.user._id,
			}
		});

		return res.status(200).json({
			message: 'Successfully updated'
		});

	} catch (e) {
		return res.status(500).json({
			message: e.toString(),
		});
	}
});

module.exports = router;
