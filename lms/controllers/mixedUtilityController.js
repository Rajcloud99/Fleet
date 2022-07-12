const express = require('express');
const multer = require('multer');
const GR = commonUtil.getModel('tripGr');
const router = express.Router();
const mongoose = require('mongoose');
var TransportVendor = commonUtil.getModel('vendorTransport');
var VehicleType = commonUtil.getModel('vehicleType');
var VehicleGroup = commonUtil.getModel('vehicleGroup');
var RouteData = commonUtil.getModel('routeData')
const ExcelReader = require('../../utils/ExcelReader');

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

router.post('/gr-upload', upload.single('grExcel'), async function(req, res, next) {
	const stats = await GR.uploader({
		filePath: req.file.path,
	});
	return res.status(200).json({
		status: 'OK',
		message: 'GR uploaded',
	});
});

router.post('/updateClient', async function(req, res, next) {

	const clientModel = {
		'customer': commonUtil.getModel('customer'),
		'billingParty': commonUtil.getModel('billingparty'),
		'consignorConsignee': commonUtil.getModel('consignor_consignee'),
		'account': commonUtil.getModel('accounts'),
		'VendorTransport': commonUtil.getModel('vendorTransport'),
		'RouteData': commonUtil.getModel('routeData')
	};

	if(clientModel[req.body.type]){
		try{
			await clientModel[req.body.type]
				.findOneAndUpdate({_id:req.body._id},{
					$set: {
						clientId: req.body.client_id.trim(),
						clientR: req.body.clientR.map( s => s.trim() )
					}
				});

			return res.status(200).json({
				status: 'OK',
				message: 'Successfully Updated',
			});

		}catch (e) {
			return res.status(406).json({
				status: 'ERROR',
				message: 'Something Went Wrong',
				qMessage: e,
			});
		}

	}else{
		return res.status(406).json({
			status: 'ERROR',
			message: 'Invalid Client Model',
		});
	}
});

const COMMON_UPSERT_SERVICE_CONF = {
	'Driver': {
		'updateFilter': function(o) {
			return {
				clientId: o.clientId,
				employee_code: o.employee_code
			}
		},
		'conf': {
			'Id': {
				keyName: '_id',
			},
			'clientId':{
				keyName: 'clientId',
			},
			'Code': {
				keyName: 'employee_code',
				ignoreIfValueIs: 'NA',
				required: true,
			},
			'Name': {
				keyName: 'name',
				ignoreIfValueIs: 'NA',
				required: true,
			},
			'Father Name': {
				keyName: 'father_name',
				ignoreIfValueIs: 'NA'
			},
			'Address Line 1': {
				keyName: 'permanent_address.line1',
				ignoreIfValueIs: 'NA',
			},
			'Address Line 2': {
				keyName: 'permanent_address.line2',
				ignoreIfValueIs: 'NA',
			},
			'City': {
				keyName: 'permanent_address.city',
				ignoreIfValueIs: 'NA',
			},
			'District': {
				keyName: 'permanent_address.district',
				ignoreIfValueIs: 'NA',
			},
			'State': {
				keyName: 'permanent_address.state',
				ignoreIfValueIs: 'NA',
			},
			'Pincode': {
				keyName: 'permanent_address.pincode',
				ignoreIfValueIs: 'NA',
			},
			'Contact Number': {
				keyName: 'prim_contact_no',
				ignoreIfValueIs: ['NA','nil','-'],
				stateReducer: function (con) {
					if(isNaN(parseInt(con)))
						return 0;
					else
						return parseInt(con);
				}
			},
			'Religion': {
				keyName: 'religion',
				ignoreIfValueIs: 'NA'
			},
			'Gurantor Name': {
				keyName: 'guarantor_name',
				ignoreIfValueIs: 'NA'
			},
			'Remark': {
				keyName: 'remarks',
				ignoreIfValueIs: 'NA'
			},
			'DOB': {
				keyName: 'dob',
				ignoreIfValueIs: ['Invalid date', 'NA'],
				dateFormat: 'DD/MM/YYYY',
				ignoreHours: true,
			},
			'License No': {
				keyName: 'license_no',
				ignoreIfValueIs: 'NA',
			},
			'License Authority': {
				keyName: 'license_authority',
				ignoreIfValueIs: 'NA',
			},
			'License Expiry Date': {
				keyName: 'license_expiry_date',
				ignoreIfValueIs: ['Invalid date', 'NA'],
				dateFormat: 'DD/MM/YYYY',
				ignoreHours: true,
				futureDate: true,
			},
			'License Issuing Date': {
				keyName: 'license_issuing_date',
				ignoreIfValueIs: ['Invalid date', 'NA'],
				dateFormat: 'DD/MM/YYYY',
				ignoreHours: true,
			},
		}
	},
	'TransportRoute': {
		'updateFilter': function(o) {
			return {
				clientId: o.clientId,
				'name': o.name
			}
		},
		'conf': {
			'Id': {
				keyName: '_id',

			},
			'Route Name': {
				'keyName': 'name',
				required: true
			},
			'Route Distance': {
				keyName: 'route_distance',
				ignoreIfValueIs: 'NA'
			},
			'Source': {
				keyName: 'source.c',
				ignoreKeyNameEvaluation: true,
			},
			'Source City': {
				keyName: 'source.placeName',
				ignoreKeyNameEvaluation: true,
			},
			'Destination': {
				keyName: 'destination.c',
				ignoreKeyNameEvaluation: true,
			},
			'Destination City': {
				keyName: 'destination.placeName',
				ignoreKeyNameEvaluation: true,
			}
		}
	},
	'RegisteredVehicle': {
		'updateFilter': function(o) {
			return {
				clientId: o.clientId,
				vehicle_reg_no: o.vehicle_reg_no
			}
		},
		'conf': {
			'vId': {
				keyName: '_id',
				//required: true
			},
			'Segment': {
				keyName: 'segment_type',
				ignoreIfValueIs: 'NA'
			},
			'Model': {
				keyName: 'model',
				ignoreIfValueIs: 'NA',
			},
			'Model Year': {
				keyName: 'modelYear',
				ignoreIfValueIs: 'NA',
			},
			'Vehicle No':{
				keyName: 'vehicle_reg_no',
				required: true

			},
			'IMEI':{
				keyName: 'device_imei',
			},
			'clientId':{
				keyName: 'clientId',
				// required: true

			},
			'Cost Center':{
				keyName: 'costCenter',
			},

			'Category': {
				keyName: 'category',
				ignoreIfValueIs: 'NA',
				required: true
			},
			'Status': {
				keyName: 'status',
				enum: constant.vehStatus,
				ignoreIfValueIs: 'NA',
				required: true
			},
			'Manufacturer': {
				keyName: 'manufacturer',
				ignoreIfValueIs: 'NA',
			},
			'Structure': {
				keyName: 'structure_name',
				ignoreIfValueIs: 'NA',
			},
			'OwnershipType': {
				keyName: 'ownershipType',
				ignoreIfValueIs: 'NA',
				required: true,
			},
			'Fleet': {
				keyName: 'owner_group',
				ignoreIfValueIs: 'NA',
			},
			'Vehicle Group': {
				keyName: 'veh_group_name',
				ignoreIfValueIs: 'NA',
			},
			'Vehicle Type': {
				keyName: 'veh_type_name',
				ignoreIfValueIs: 'NA',
			},
			'Capacity(Ton)': {
				keyName: 'capacity_tonne',
				ignoreIfValueIs: 'NA',
			},
			'Permit Expiry Date': {
				keyName: 'permit_expiry_date',
				ignoreIfValueIs: ['Invalid date', 'NA'],
				dateFormat: 'DD/MM/YYYY',
				ignoreHours: true,
				futureDate: true,
			},
			'Owner Name': {
				keyName: 'owner_name',
				ignoreIfValueIs: 'NA',
			},
			'Owner Mob': {
				keyName: 'owner_mobile',
				ignoreIfValueIs: 'NA',
			},
			'Vendor Name': {
				keyName: 'vendor_name',
				ignoreIfValueIs: 'NA',
			},
			'Chasis No.': {
				keyName: 'chassis_no',
				ignoreIfValueIs: 'NA',
			},
			'Engine No.': {
				keyName: 'engine_no',
				ignoreIfValueIs: 'NA',
			},
			'Insurance Company': {
				keyName: 'insurance_company',
				ignoreIfValueIs: 'NA',
			},
			'Insurance No.': {
				keyName: 'insurance_no',
				ignoreIfValueIs: 'NA',
			},
			'Insurance Amount': {
				keyName: 'insured_amount',
				ignoreIfValueIs: 'NA',
			},
			'Insurance Expiry Date': {
				keyName: 'insurance_expiry_date',
				ignoreIfValueIs: ['Invalid date', 'NA'],
				dateFormat: 'DD/MM/YYYY',
				ignoreHours: true,
				futureDate: true,
			},
			'Registration Date': {
				keyName: 'reg_date',
				ignoreIfValueIs: ['Invalid date', 'NA'],
				dateFormat: 'DD/MM/YYYY',
				ignoreHours: true,
			},
		}
	} ,
	'VendorTransport' : {
		'updateFilter': function(o) {
			return {
				clientId: o.clientId,
				'name' : o.name ,
			}
		},
		'conf': {
			'Vendor Name' : {
				'name' : 'name',
				 required: true
			} ,
			'OwnershipType': {
				keyName: 'ownershipType',
				ignoreIfValueIs: 'NA',
			},
			'GSTIN' : {
				keyName: 'gstn' ,
				ignoreIfValueIs: 'NA',
			} ,
			'Pan No': {
				keyName: 'pan_no',
				required: true
			},
			'Category': {
				keyName: 'category',
				ignoreIfValueIs: 'NA',
			},
		}
	},
	'billingparty' : {
		'updateFilter': function(o) {
			return {
				clientId: o.clientId,
				'name' : o.name ,
			}
		},
		'conf': {
			'Name' : {
				'keyName' : 'name',
				 required: true
			} ,
			'Bill Name' : {
				keyName : 'billName',
				ignoreIfValueIs: 'NA',
			} ,
			'Address': {
				keyName: 'address',
				ignoreIfValueIs: 'NA',
			},
			'Location': {
				keyName: 'businessLocation',
				ignoreIfValueIs: 'NA',
			},
			'State': {
				keyName: 'state_name',
				ignoreIfValueIs: 'NA',
			},
			'Segment': {
				keyName: 'segment_type',
				ignoreIfValueIs: 'NA'
			},
			'GSTIN' : {
				keyName: 'gstin' ,
				ignoreIfValueIs: 'NA',
			},
			'Pan No': {
				keyName: 'pan_number',
				ignoreIfValueIs: 'NA',
			},
			'CIN No': {
				keyName: 'cin_number',
				ignoreIfValueIs: 'NA',
			},
			'Contact No': {
				keyName: 'contact_number',
				ignoreIfValueIs: 'NA',
			},
			'Contact Person': {
				keyName: 'contact_person',
				ignoreIfValueIs: 'NA',
			},
		}
	},
	// 'RouteData': {
	// 	'updateFilter': function(o) {
	// 		return {
	// 			clientId: o.clientId,
	// 			customer_name: o.customer_name,
	// 			vehTypeNam: o.vehTypeNam,
	// 			service : o.service
	// 		}
	// 	},
	// 	'conf': {
	// 		'Customer': {
	// 			keyName: 'customer_name',
	// 			required: true
	// 		},
	// 		'Vehicle type': {
	// 			keyName: 'vehTypeNam',
	// 			required: true
	// 		},
	// 		'Service type': {
	// 			keyName: 'service',
	// 			required: true
	// 		},
	// 		'Rate/km':{
	// 			keyName: 'rateKm',
	// 			required: true
	//
	// 		},
	// 		'Diesel/km':{
	// 			keyName: 'dieselKm',
	// 			required: true
	// 		},
	// 		'Toll':{
	// 			keyName: 'toll',
	// 			ignoreIfValueIs: 'NA',
	// 		},
	// 		'TAT hr.':{
	// 			keyName: 'tat_hr',
	// 			required: true
	// 		},
	// 		'TAT min.':{
	// 			keyName: 'tat_min',
	// 			required: true
	// 		},
	//
	// 	}
	// },

	'BudgetingRouteData': {
		'updateFilter': function(o) {
			return {
				clientId: o.clientId,
				customer_name: o.customer_name,
				vehTypeNam: o.vehTypeNam,
				service : o.service
			}
		},
		'conf': {
			'Customer': {
				keyName: 'customer_name',
				required: true
			},
			'Vehicle type': {
				keyName: 'vehTypeNam',
				required: true
			},
			'Service type': {
				keyName: 'service',
				required: true
			},
			'Rate/km':{
				keyName: 'rateKm',
				required: true,
				ignoreIfValueIs: 0

			},
			'Diesel/km':{
				keyName: 'dieselKm',
				required: true,
				ignoreIfValueIs: 0
			},
			'Toll':{
				keyName: 'toll',
				ignoreIfValueIs: 'NA',
			}

		}
	},
	'TrackingRouteData': {
		'updateFilter': function(o) {
			return {
				clientId: o.clientId,
				customer_name: o.customer_name,
				vehTypeNam: o.vehTypeNam,
				service : o.service
			}
		},
		'conf': {
			'Customer': {
				keyName: 'customer_name',
				required: true
			},
			'Vehicle type': {
				keyName: 'vehTypeNam',
				required: true
			},
			'Service type': {
				keyName: 'service',
				required: true
			},
			'TAT hr.':{
				keyName: 'tat_hr',
				required: true,
				ignoreIfValueIs: 0
			},
			'TAT min.':{
				keyName: 'tat_min',
				ignoreIfValueIs: 0
			},

		}
	}
};

router.post('/common-upsert-service', upload.single('excelFile'), async function(req, res, next) {
	try {
		var modelName = req.body.modelName || req.query.modelName;

		if (!modelName) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'modelName is a required field in body',
			});
		}

		if (!COMMON_UPSERT_SERVICE_CONF[modelName]) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'configuration not added. Contact Kamal',
			});
		}

		const excelData = new ExcelReader({
			filePath: req.file.path,
			inject: {
				clientId: req.user.clientId,
				uploaded_at: new Date(),
				uploaded_by: req.user.full_name
			},
			config: COMMON_UPSERT_SERVICE_CONF[modelName].conf,
		});

		let data = await excelData.read();

		if(data && data.length) {
			for (let a = 0; a < data.length; a++) {
				if (data[a] && data[a].vendor_name) {
					const oVendor = await TransportVendor.findOne({
						name: data[a].vendor_name,
						clientId: req.user.clientId
					}, {_id: 1}).lean();
					if (oVendor)
						data[a].vendor_id = oVendor._id;
				}
				if (data[a] && data[a].veh_type_name) {
					const oVehicleType = await VehicleType.findOne({
						name: data[a].veh_type_name,
						clientId: req.user.clientId
					}, {_id: 1}).lean();
					if (oVehicleType)
						data[a].veh_type = oVehicleType._id;
				}
				if (data[a] && data[a].veh_group_name) {
					const oVehicleGroup = await VehicleGroup.findOne({
						name: data[a].veh_group_name,
						clientId: req.user.clientId
					}, {_id: 1}).lean();
					if (oVehicleGroup)
						data[a].veh_group = oVehicleGroup._id;
				}

				if (data[a] && data[a].customer_name) {
					let RouteData_dupCheck = await RouteData.findOne({
						customer_name: data[a].customer_name,
						vehTypeNam : data[a].vehTypeNam,
						service : data[a].service,
						route__id : req.query.route__id,
						category : req.query.category,
						clientId: req.user.clientId
					}).lean();
					if(RouteData_dupCheck){
						throw new Error('Data Duplicacy Found');
					}
					const oCustomer_name = await RouteData.findOne({
						customer_name: data[a].customer_name,
						clientId: req.user.clientId
					}, {_id: 1}).lean();
					data[a].route__id = req.query.route__id;
					data[a].category = req.query.category;
				}
			}
		}

		let dataBulkQuery = data.map(d => {
			if(!d) return null;
			let hasUpdateFilterFn = COMMON_UPSERT_SERVICE_CONF[modelName].updateFilter;
			let dId = d._id;
			delete d._id;
			return {
				updateOne: {
					filter: hasUpdateFilterFn && hasUpdateFilterFn({...d, clientId: req.user.clientId}) || ({ _id: dId }),
					update: { $set: d },
					upsert: true
				}
			}
		}).filter(x => x !== null);

		if(req.query.category === 'tracking' || req.query.category === 'budgeting')
			modelName = 'RouteData';

		let bulkWriteStats = await mongoose
			.model(modelName)
			.bulkWrite(dataBulkQuery);

		return res.status(200).json({
			status: 'OK',
			message: 'Done',
			stats: bulkWriteStats,
		});
	} catch(e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
});

module.exports = router;
