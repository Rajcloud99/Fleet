
let router = require('express').Router();

let GR = commonUtil.getModel('tripGr');
const Joi = require('joi');
const tripGrService = commonUtil.getService('tripGrV2');
const tripService=commonUtil.getService('TripV2');
const validate = require('express-validation');
const paramValidation = commonUtil.getParamsValidation('tripGr');
var multipartMiddleware = require('connect-multiparty')();
const billStationaryService = commonUtil.getService('billStationary');
const BillStationary = commonUtil.getModel('billStationary');
let VoucherService = commonUtil.getService('voucher');
const path = require('path');
const multer = require('multer');
var ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
const FileService = commonUtil.getUtil('file_upload_util');
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

/** PUT /api/trip_gr/add_gr_number/:_id - Add gr number */
router.route('/add_gr_number/:_id').put(validate(paramValidation.add_gr_number),tripGrService.add_gr_number);

router.route('/addGr').post(tripGrService.addGr);

router.route('/updateProp/:_id').put( async function (req, res, next) {
	try{

		let oRes = {success: 'OK', message: 'GR updated successfully.'};
		oRes.data = await tripGrService.updateProp(req.params._id, req);
		return res.status(200).json(oRes);

	}catch (e) {
		return res.status(500).json({
			status: "ERROR",
			message: e.toString(),
		});
	}
});

/** PUT /api/trip_gr/update/:_id - Add gr number */
router.route('/update/:_id').put(validate(paramValidation.update), async function(req, res, next){

	try{

		let oRes = {success: 'OK', message: 'GR updated successfully.'};
		oRes.data = await tripGrService.update(req.params._id, req);
		return res.status(200).json(oRes);

	}catch (e) {
		return res.status(500).json({
			status: "ERROR",
			message: e.toString(),
		});
	}
});

router.route('/updateMultiple').put(/*validate(paramValidation.update), */async function(req, res, next){

	try{

		let oRes = {success: 'OK', message: 'GR updated successfully.'};
		let aGr = req.body.gr;

		for(let i = 0; i < aGr.length; i++) {
			let oGr = aGr[i];

			let oGrProject = {tripCancelled: 1, trip: 1, status: 1, statuses: 1, stationaryId: 1, eWayBills: 1, grNumber :1};
			let foundGr = await GR.findOne({_id: oGr._id}, oGrProject).populate({
				path: 'trip',
				select: {status: 1}
			}).lean();
			if (!foundGr) return res.status(404).json((oRes.message = 'GR does not exists.', oRes));
			if (foundGr.tripCancelled) return res.status(405).json({message: 'Trip is cancelled'});
			if (foundGr.trip.status === 'Trip not started') return res.status(405).json({message: 'Trip must be started before adding GR'});

			if (foundGr && (foundGr.tripCancelled === false)) {

				let unsetQuery = {};

				// Gr Number validation code

				// Validates that gr Number is Unique in single client Id
				let usedGrs = await GR.find({
					'grNumber': oGr.grNumber,
					clientId: req.user.clientId,
					tripCancelled: false,
					_id: {$ne: oGr._id}
				}, {_id: 1});

				if (usedGrs.length) {
					return res.status(500).json({status: 'ERROR', message: oGr.grNumber + ' GR Number already used.'});
				}

				//Find stationary number if stationary id not provided to maintain 1 to 1 binding of stationary and grNumber
				if (!oGr.stationaryId) {
					let foundStationary = await BillStationary.findOne({
						bookNo: oGr.grNumber,
						type: 'Gr'
					});

					if (foundStationary)
						oGr.stationaryId = foundStationary._id;
					// else
					// 	return res.status(500).json({status: 'ERROR', message: 'Invalid GR Number'});

				}

				if ((oGr.stationaryId || foundGr.stationaryId) && (oGr.stationaryId !== foundGr.stationaryId)) {

					// if stationary is changed than cancel the previous stationary
					if (foundGr.stationaryId) {
						await billStationaryService.updateStatusV2({
							billBookId: foundGr.stationaryId,
							bookNo:foundGr.grNumber
						}, {
							userName: req.user.full_name,
							status: 'cancelled',
							docId: foundGr._id,
							modelName: 'TripGr',
						});
					}

					// if stationary is changed than mark "USED" the new stationary
					if (oGr.stationaryId) {
						await billStationaryService.updateStatusV2({
							billBookId: oGr.stationaryId,
							bookNo:oGr.grNumber
						}, {
							userName: req.user.full_name,
							status: 'cancelled',
							docId: oGr._id,
							modelName: 'TripGr',
						});
					}
				}

				await tripGrService.update(oGr._id, {user: req.user, body: oGr});
			}
		}

		//for(let i = 0; i < aGr.length; i++){
		// 	let oGr = aGr[i];
		// 	await tripGrService.update(oGr._id, {user: req.user, body: oGr});
		// }

		return res.status(200).json(oRes);

	}catch (e) {
		return res.status(500).json({
			status: "ERROR",
			message: e.toString(),
		});
	}

});

router.route('/advance_payment/:_id').put(tripGrService.addAdvancePayment);

router.post('/report', async function(req,res, next){
	try{
		let data = await tripGrService.getGrReport(req.body);
		if(req.body.download){
			req.user.totCNS =  data.totCNS;
			if(req.body.reportType === 'Loading Monthly Report'){
				ReportExelService.loadingMonthlyReport(Object.values(data.massagedData), req.body.end_date, req.body.start_date, req.user, function (d){
					return res.status(200).json({
							'status': 'OK',
							'message': 'report download available.',
							'url': d.url
						}
					);
				})
			}else{
				ReportExelService.billingPartyExpenseReport(Object.values(data.massagedData),req.body.reportType, req.body.end_date, req.body.start_date, req.user, function (d){
					return res.status(200).json({
							'status': 'OK',
							'message': 'report download available.',
							'url': d.url
						}
					);
				})
			}
		}else{
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found',
				'data': data
			});
		}
	}catch(err){
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.post('/outstandingUnbilledReport', async function(req,res, next){
	try{
		req.body.from = req.body.start_date;
		req.body.to = req.body.end_date;
		let data = await tripGrService.outstandingUnbilledReport(req.body, req);
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found',
				'data': data
			});
		// }
	}catch(err){
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});


router.post('/podReport', async function(req,res, next){
	try{
		let data = await tripGrService.podReport(req.body);
		if(req.body.download){
			ReportExelService.podReport(data, req.body.to, req.body.from, req.user.clientId, function (d){
				return res.status(200).json({
						'status': 'OK',
							'message': 'report download available.',
						'url': d.url
					}
				);
			})
		}else{
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found',
				'data': data
			});
		}
	}catch(err){
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});

router.post('/grSummary', async function(req, res, next){
	try{
		let data = await tripGrService.grSummaryReport(req.body);
		if (req.body.download ) {
			ReportExelService.grSummaryReport(data, req.body.end_date, req.body.start_date, req.user.clientId, function (d) {
				return res.status(200).json({
						'status': 'OK',
						'message': 'report download available.',
						'url': d.url
					}
				);
			});
		} else {
			return res.status(200).json({
				'status': 'OK',
				'message': 'Data found....',
				'data': data
			});
		 }
	}
	catch(err){
		return res.status(501).json({
			"status": "ERROR",
			"message": err.toString()
		});
	}
});


/** POST /api/trip_gr/get - Get trips */
router.route('/get').post(tripGrService.get);
router.route('/getGrTrim').post(tripGrService.getGrTrim);

router.route('/getV2Lite').post(tripGrService.getV2Lite);

router.route('/getGr').post(tripGrService.getGr);

router.post('/syncStatus', async function (req, res, next) {

	try {

		await tripGrService.syncStatus(req, res);

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		});
	}

});

router.route('/aggr-report').post(tripGrService.reportDownload);

router.route('/aggr-reportV2').post(tripGrService.reportDownloadV2);

router.route('/dailyMISreport').post(tripGrService.dailyMISreport);

// router.route('/unbilledGRReport').post(tripGrService.unbilledGRReportDownload);

router.route('/gr-upload').post(upload.single('grExcel'), tripGrService.grUpload);

router.route('/:_id').get(async(req, res, next) => {
	if(!req.params._id) {
		return res.status(200).json({status: 'ERROR', error_message: 'TripGR _id is mandatory in params'});
	}
	const result = await GR.findById(req.params._id)
		.populate('advance.user', 'full_name')
		.populate('advance.from', 'name')
		.populate('advance.to', 'name');
	return res.status(200).json({
		success: 'OK',
		message: 'GR found',
		data: result
	});
});

/** PUT /api/trip_gr/update_status/:_id - Update trip status*/
router.route('/update_status/:_id').put(validate(paramValidation.update_status),tripGrService.update_status);

/** PUT /api/trip_gr/charge_update/:_id - Update trip status*/
router.route('/charge_update/:_id').put(validate(paramValidation.charge_update),tripGrService.charge_update);

/** PUT /api/trip_gr/admin_update/:_id - Update trip status*/
router.route('/admin_update/:_id').put(validate(paramValidation.admin_update),tripGrService.admin_update);


/** PUT /api/trip_gr/acknowledge_gr/:_id - Update trip status*/
router.route('/acknowledge_gr/:_id').put(validate(paramValidation.acknowledge_gr),tripGrService.acknowledge_gr);

/** POST /api/trip_gr/revertGrAcknowledge/:_id - revertGrAcknowledge*/
router.route('/revertGrAck/:_id').post(tripGrService.revertGrAcknowledge);

/** PUT /api/trip_gr/pending_gr_remark/:_id - Update trip status*/
router.route('/pending_gr_remark/:_id').put(validate(paramValidation.pending_gr_remark),tripGrService.pending_gr_remark);

/** PUT /api/trip_gr/add_geofence/:_id - Update trip status*/
router.route('/add_geofence/:_id').put(validate(paramValidation.add_geofence),tripGrService.add_geofence);

/** PUT /api/trip_gr/rm_geofence/:_id - Update trip status*/
router.route('/rm_geofence/:_id').put(validate(paramValidation.rm_geofence),tripGrService.rm_geofence);

/** PUT /api/trip_gr/cancel/:_id - Update gr status*/
router.route('/cancel/:_id').put(tripGrService.cancel);

router.route('/upload_documents/:_id').put(async function(req, res, next) {
	if(otherUtil.isEmptyObject(req.params)) {
		return res.status(500).json({'status': 'ERROR', 'error_message': 'No id supplied'});
	}
	if(otherUtil.isEmptyObject(req.body)) {
		return res.status(500).json({'status': 'ERROR', 'error_message': 'Nothing in body'});
	}
	let gr = await GR.findOne({_id:req.params._id}).lean();
	if(gr) {
		req.grData = gr;
		return next();
	} else {
		return res.status(500).json({status: 'ERROR', error_message: 'GR does not exist'});
	}
}, multipartMiddleware, tripGrService.documentsUpload);

/** POST /api/trip_gr/update_diesel_escalation - Update Diesel Escalation */
router.route('/update_diesel_escalation').post(tripGrService.update_diesel_escalation);

/** POST /api/trips/get - Get trips */
router.route('/report_diesel_escalation').post(tripGrService.report_diesel_escalation);

router.route('/makeCoverNote').post(tripGrService.report_diesel_escalation);

router.route('/grReceive/:_id').post(tripGrService.grReceive);

router.route('/grsforcovernote').post(tripGrService.grsforcovernote);

router.route('/convertgrstocovernote').post(tripGrService.convertgrstocovernote);

router.route('/convertcovernotestogr').post(tripGrService.convertcovernotestogr);

router.route('/covernotesforgr').post(tripGrService.covernotesforgr);

router.route('/adm_update/:_id').put(tripGrService.adm_update);

router.post('/mapGrIntoTrip', async function(req, res, next){
	try{

		let grId = req.body.grId;
		let tripId = req.body.tripId;

		// get gr
		let foundGr = await GR.findOne({_id: otherUtil.arrString2ObjectId(grId)}, {_id: 1,trip: 1,trip_no: 1,vehicle: 1, pod: 1, bill: 1, supplementaryBillRef: 1, provisionalBill: 1, }).lean();

		if(!(foundGr && foundGr._id))
			throw new Error(`Gr Not Found`);

		if(foundGr && foundGr.trip && foundGr.trip_no)
			throw new Error(`Gr already Mapped`);

		if(foundGr.pod && foundGr.pod.received)
			throw new Error(`Can not map Gr POD Already Received`);

		if(foundGr.bill)
			throw new Error(`Can not map Gr Bill Already Generated`);

		if(foundGr.supplementaryBillRef && foundGr.supplementaryBillRef.length)
			throw new Error(`Can not map Gr supplementaryBill Already Generated`);

		if(foundGr.provisionalBill && foundGr.provisionalBill.length)
			throw new Error(`Can not map Gr provisionalBill Already Generated`);


		// get new trip
		let foundTrip = await tripService.findTripById(tripId, {_id: 1, vehicle:1,vehicle_no: 1, trip_no:1,isCancelled:1});

		if(!(foundTrip && foundTrip._id))
			throw new Error(`Trip Not Found`);

		if(!(foundTrip && foundTrip.vehicle))
			throw new Error(`vehicle Not Found on selected trip`);

		let oQuery = {
			typ:'Map Gr',
			by: req.user.full_name,
			at: new Date(),
			rmk: 'Map Gr From tripNo: '+ foundTrip.trip_no,
		};

		let aData;
		// Update new trip on gr
		if(foundGr){
			aData = await GR.updateOne({_id: otherUtil.arrString2ObjectId(foundGr._id)}, {
				$set: {
					trip: foundTrip._id,
					trip_no: foundTrip.trip_no,
					vehicle_no: foundTrip.vehicle_no,
					vehicle: foundTrip.vehicle,
					last_modified_at: new Date(),
					last_modified_by: req.user.full_name,
				},
				$push: {
					his: oQuery
				},
			});
		}

		let body = {
			$push: {
				gr: foundGr._id
			}
		};

		if (foundTrip && (!foundTrip.isCancelled)) {
			await tripService.updateOneTrip(foundTrip._id, body, true);
		}

		return res.status(200).json({
			'status': 'OK',
			'message': 'gr Successfully mapped',
			"data" : aData
		});


	}catch (e){
		return res.status (500).json ({
			"status": "ERROR",
			"message": e.toString(),
		});
	}

});

router.post('/unMapGrFromTrip/:_id', async function(req, res, next){
	try{

		let grId = req.params._id;

		// get gr
		let foundGr = await GR.findOne({_id: otherUtil.arrString2ObjectId(grId)}, {_id: 1,trip: 1,trip_no: 1,vehicle: 1, pod: 1, bill: 1, supplementaryBillRef: 1, provisionalBill: 1, }).lean();

		if(!(foundGr && foundGr._id))
			throw new Error(`Gr Not Found`);

		if(!(foundGr && foundGr.trip))
			throw new Error(`Trip Not Found on selected Gr`);


		if(foundGr.pod && foundGr.pod.received)
			throw new Error(`Can not Un Map Gr POD Already Received`);

		if(foundGr.bill)
			throw new Error(`Can not Un Map Gr Bill Already Generated`);

		if(foundGr.supplementaryBillRef && foundGr.supplementaryBillRef.length)
			throw new Error(`Can not Un Map Gr supplementaryBill Already Generated`);

		if(foundGr.provisionalBill && foundGr.provisionalBill.length)
			throw new Error(`Can not Un Map Gr provisionalBill Already Generated`);


		// get new trip
		let foundTrip = await tripService.findTripById(foundGr.trip, {_id: 1, vehicle:1,vehicle_no: 1, trip_no:1,isCancelled:1});

		if(!(foundTrip && foundTrip._id))
			throw new Error(`Trip Not Found`);

		if(!(foundTrip && foundTrip.vehicle))
			throw new Error(`vehicle Not Found on selected trip`);

		let oQuery = {
			typ:'unMap Gr',
			by: req.user.full_name,
			at: new Date(),
			rmk: 'unMap Gr From tripNo: '+ foundTrip.trip_no,
		};

		let aData;
		// Update new trip on gr
		if(foundGr){
			aData = await GR.updateOne({_id: otherUtil.arrString2ObjectId(foundGr._id)}, {
				$set: {
					last_modified_at: new Date(),
					last_modified_by: req.user.full_name,
				},
				$unset: {
					trip: 1,
					trip_no: 1,
					vehicle_no: 1,
					vehicle: 1,
				},
				$push: {
					his: oQuery
				},
			});
		}

		let body = {
			$pull: {
				gr: foundGr._id
			}
		};

		if (foundTrip) {
			await tripService.updateOneTrip(foundTrip._id, body, true);
		}

		return res.status(200).json({
			'status': 'OK',
			'message': 'gr Successfully unmapped',
			"data" : aData
		});


	}catch (e){
		return res.status (500).json ({
			"status": "ERROR",
			"message": e.toString(),
		});
	}

});

router.post('/getFpa', async function (req, res, next) {
	try {
		let refNo = req.body.refNo;
		let clientId = req.user.clientId;

		//get voucher
		let data = await VoucherService.findVoucherByQueryAsync({
			vT: 'FPA',
			clientId,
			refNo: new RegExp('^'+refNo+'$')
		});

		if (!data.length)
			throw new Error('No Voucher Found');

		//get all gr
		data[0].gr = await GR.find({'fpa.vch': data[0]._id}).populate(
			{path: 'bill', select: {receiving: 1, billDate:1, billNo:1}}).lean();


		return res.status(200).json({
			'status': 'OK',
			'message': 'FPA found',
			data
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/addFpa', async function (req, res, next) {
	try {
		let refNo = req.body.refNo;

		// validating request body
		await validateRequest(req, 'add');

		let oQuery = {
			refNo: new RegExp('^'+refNo+'$'),
			clientId: req.user.clientId,
			deleted: {
				$not: {
					$eq: true
				}
			}
		};

		let foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

		if(foundVoucher.length){
			throw new Error('FPA No already used');
		}

		if (!req.body.stationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: req.body.refNo,
				type: 'FPA',
				clientId: req.body.clientId
			});

			if (foundStationary) {
				req.body.stationaryId = foundStationary._id;
			}
		}

		// validating that all gr exists
		let aGr = await GR.find({_id:{$in: req.body.gr.map(o => o._id)}},{_id: 1}).lean();

		if(aGr.length != req.body.gr.length)
			throw new Error('some of gr does not exist');

		// Preparing Voucher Object
		let oVch = {
			branch: req.body.branch,
			refNo: req.body.refNo,
			stationaryId: req.body.stationaryId,
			date: req.body.date,
			vT: 'FPA',
			type: 'Journal',
			paymentMode: req.body.paymentMode,
			paymentRef: req.body.paymentRef,
			paymentDate: req.body.paymentDate,
			narration: req.body.narration,
			ledgers: req.body.ledgers,
			createdBy: req.user.full_name,
			lastModifiedBy: req.user.full_name,
			clientId: req.user.clientId,
			isEditable: false,
			_id: mongoose.Types.ObjectId()
		};

		// Adding Voucher
		await VoucherService.addVoucherAsync(oVch);

		if(req.body.stationaryId){
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: oVch._id,
				modelName: 'Voucher',
				stationaryId: req.body.stationaryId,
			}, 'used');
		}

		for(let oGr of req.body.gr){

			for (let k in oGr.fpaDeduction) {
				if (oGr.fpaDeduction.hasOwnProperty(k)) {
					let val =oGr.fpaDeduction[k];

					let oVouch = {
						branch: req.body.branch,
						refNo: constant.fpaDeduction[val.typ] + req.body.refNo,
						date: req.body.date,
						vT: 'FPA Deduction',
						type: 'Journal',
						paymentMode: req.body.paymentMode,
						paymentRef: req.body.paymentRef,
						narration: val.remark,
						ledgers: val.ledgers,
						createdBy: req.user.full_name,
						lastModifiedBy: req.user.full_name,
						clientId: req.user.clientId,
						isEditable: false,
						_id: mongoose.Types.ObjectId()
					};
					await VoucherService.addVoucherAsync(oVouch);
					val.voucher = oVouch._id;
					delete val.ledgers;
				}
			}

			await GR.updateOne({_id: oGr._id}, {
				$set: {
					fpa: {
						refNo: refNo,
						amt: oGr.amt,
						rmk: oGr.rmk,
						factor: oGr.factor,
						vndr: oGr.vndr,
						vndrName: oGr.vndrName,
						dedAmt: oGr.dedAmt,
						linkMr: oGr.linkMr,
						date: oVch.date,
						vch: oVch._id,
						deduction: oGr.fpaDeduction,
						createdAt: new Date(),
						createdBy: req.user.full_name,
					},
					last_modified_at: new Date(),
				}
			});
		}

		return res.status(200).json({
			'status': 'OK',
			'message': 'FPA Successfully Added'
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/editFpa/:_id', async function(req, res, next){
	try{
		let nRefNo;
		let nStationaryId;
		let _id = req.params._id;

		await validateRequest(req, 'edit');

		//maintain Stationary
		nRefNo = req.body.refNo;
		nStationaryId = req.body.stationaryId;

		if(!nRefNo)
			throw new Error('Mandatory fields are required');

		let foundVoucher = await VoucherService.findVoucherByIdAsync(_id, {_id: 1, acImp:1,refNo:1,stationaryId:1});

		if(!(foundVoucher && foundVoucher._id))
			throw new Error(`Voucher Not Found`);

		if(foundVoucher.acImp.st)
			throw new Error(`Account already imported`);

		// validating that all gr exists
		if((await GR.find({_id:{$in: req.body.gr.map(o => o._id)}}, {_id: 1})).length != req.body.gr.length)
			throw new Error('some of gr does not exist');

		for(let oGr of req.body.gr){
			for (let k in oGr.fpaDeduction) {
				if (oGr.fpaDeduction.hasOwnProperty(k)) {
					let val =oGr.fpaDeduction[k];
					if(val.voucher){
						let foundVouch = await VoucherService.findVoucherByIdAsync(val.voucher, {_id: 1, acImp:1,refNo:1,stationaryId:1});
						if(!(foundVouch && foundVouch._id))
							throw new Error(`${val.typ} Deduction Voucher Not Found`);

						if(foundVouch.acImp.st)
							throw new Error(`${val.typ} Deduction Account already imported`);
					}
					}
				}
		}

		let oRefNo = foundVoucher.refNo;
		let oStationaryId = foundVoucher.stationaryId;

		if(!nStationaryId){
			let foundId = await billStationaryService.findByRefAndType({
				bookNo: nRefNo,
				type: 'FPA',
				clientId: req.user.clientId
			});

			if(foundId){
				nStationaryId = foundId._id.toString();
				req.body.stationaryId = nStationaryId;
			}
		}

		if(nRefNo != oRefNo){

			let oQuery = {
				_id: {
					$nin: [_id]
				},
				refNo: nRefNo,
				clientId: req.user.clientId,
				deleted: {
					$not:{
						$eq:true
					}
				}
			};

			foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

			if((foundVoucher && foundVoucher._id) || (nStationaryId && (await billStationaryService.isUsed(nStationaryId))))
				throw new Error(`Voucher With Ref. No. ${nRefNo} Already Exists.`);

			await billStationaryService.setUnset({
				modelName: 'Voucher',
				userName: req.user.full_name,
				docId: _id.join(',')
			},{
				refNo: nRefNo,
				stationaryId: nStationaryId
			},{
				refNo: oRefNo,
				stationaryId: oStationaryId
			});
		}

		// Upserting fpa on Gr's
		let aOldGr = await GR.find({'fpa.vch': _id}, {_id: 1, fpa:1}).lean();

		for(let nGr of req.body.gr){
			let fGrIdx = aOldGr.findIndex(oGr => oGr._id.toString() === nGr._id.toString());
			let fGr = aOldGr[fGrIdx];

			if(fGr){
				// edit if found
				for (let k in nGr.fpaDeduction) {
					if (nGr.fpaDeduction.hasOwnProperty(k)) {
						let val = nGr.fpaDeduction[k];
						if (val.voucher){
							let oVouch = {
								branch: req.body.branch,
								refNo: constant.fpaDeduction[val.typ] + req.body.refNo,
								date: req.body.date,
								vT: 'FPA Deduction',
								type: 'Journal',
								paymentMode: req.body.paymentMode,
								paymentRef: req.body.paymentRef,
								narration: val.remark,
								ledgers: val.ledgers,
								createdBy: req.user.full_name,
								lastModifiedBy: req.user.full_name,
								clientId: req.user.clientId,
								isEditable: false,
								_id: otherUtil.arrString2ObjectId(val.voucher)
							};
						await VoucherService.editVoucher(oVouch);
						delete val.ledgers;
					}else{
							let oVouch = {
								branch: req.body.branch,
								refNo: constant.fpaDeduction[val.typ] + req.body.refNo,
								date: req.body.date,
								vT: 'FPA Deduction',
								type: 'Journal',
								paymentMode: req.body.paymentMode,
								paymentRef: req.body.paymentRef,
								narration: val.remark,
								ledgers: val.ledgers,
								createdBy: req.user.full_name,
								lastModifiedBy: req.user.full_name,
								clientId: req.user.clientId,
								isEditable: false,
								_id: mongoose.Types.ObjectId()
							};
							await VoucherService.addVoucherAsync(oVouch);
							val.voucher = oVouch._id;
							delete val.ledgers;
						}
					}
				}

				for (let key in fGr.fpa.deduction) {
					if (fGr.fpa.deduction.hasOwnProperty(key) && otherUtil.isEmptyObject(nGr.fpaDeduction[key])) {
						let val =fGr.fpa.deduction[key];
						if(val.voucher)
							await VoucherService.removeVoucher({
								_id: otherUtil.arrString2ObjectId(val.voucher),
								clientId: req.user.clientId
							});
					}
				}

				await GR.updateOne({_id: fGr._id}, {
					$set: {
						fpa: {
							amt: nGr.amt,
							refNo: nRefNo,
							rmk: nGr.rmk,
							factor: nGr.factor,
							vndr: nGr.vndr,
							vndrName: nGr.vndrName,
							vch: _id,
							dedAmt: nGr.dedAmt,
							linkMr: nGr.linkMr,
							date: req.body.date,
							deduction: nGr.fpaDeduction
						},
						last_modified_at: new Date(),
					}
				});

				aOldGr.splice(fGrIdx, 1);

			}else{
				// add if not found
				for (let k in nGr.fpaDeduction) {
					if (nGr.fpaDeduction.hasOwnProperty(k)) {
						let val =nGr.fpaDeduction[k];

						let oVouch = {
							branch: req.body.branch,
							refNo: constant.fpaDeduction[val.typ] + req.body.refNo,
							date: req.body.date,
							vT: 'FPA Deduction',
							type: 'Journal',
							paymentMode: req.body.paymentMode,
							paymentRef: req.body.paymentRef,
							narration: val.remark,
							ledgers: val.ledgers,
							createdBy: req.user.full_name,
							lastModifiedBy: req.user.full_name,
							clientId: req.user.clientId,
							isEditable: false,
							_id: mongoose.Types.ObjectId()
						};
						await VoucherService.addVoucherAsync(oVouch);
						val.voucher = oVouch._id;
						delete val.ledgers;
					}
				}

				await GR.updateOne({_id: nGr._id}, {
					$set: {
						fpa: {
							amt: nGr.amt,
							refNo: nRefNo,
							rmk: nGr.rmk,
							factor: nGr.factor,
							vndr: nGr.vndr,
							vndrName: nGr.vndrName,
							vch: _id,
							dedAmt: nGr.dedAmt,
							linkMr: nGr.linkMr,
							date: req.body.date,
							deduction: nGr.fpaDeduction,
							createdAt: new Date(),
							createdBy: req.user.full_name,
						},
						last_modified_at: new Date(),
					}
				});
			}
		}

		if(aOldGr.length){
			for(let oGr of aOldGr){
				if(oGr.fpa.deduction)
				for (let k in oGr.fpa.deduction) {
					if (oGr.fpa.deduction.hasOwnProperty(k)) {
						let val =oGr.fpa.deduction[k];
						if(val.voucher)
							await VoucherService.removeVoucher({
								_id: otherUtil.arrString2ObjectId(val.voucher),
								clientId: req.user.clientId
							});
					}
				}
			}

		}

		// removing fpa obj from deleted Gr's
		if(aOldGr.length)
			await GR.updateMany({_id: {$in: aOldGr.map(o => o._id)}}, {
				$unset: {
					fpa: 1
				}
			});

		// Preparing Voucher Object
		let oVch = {
			branch: req.body.branch,
			refNo: req.body.refNo,
			stationaryId: req.body.stationaryId,
			date: req.body.date,
			paymentMode: req.body.paymentMode,
			paymentRef: req.body.paymentRef,
			paymentDate: req.body.paymentDate,
			narration: req.body.narration,
			ledgers: req.body.ledgers,
			lbastModifiedBy: req.user.full_name,
			clientId: req.user.clientId,
			_id
		};

		// edit Voucher
		await VoucherService.editVoucher(oVch);

		return res.status(200).json({
			'status': 'OK',
			'message': 'FPA Successfully Updated'
		});


	}catch (e){
		return res.status (500).json ({
			"status": "ERROR",
			"message": e.toString()
		});
	}

});

router.post('/deleteFpa/:_id', async function (req, res, next) {
	try {

		let _id =  req.params._id || false;

		if(!_id)
			throw new Error('Mandatory fields required');

		let foundVch = await VoucherService.findVoucherByIdAsync(_id, {stationaryId:1 ,acImp: 1, refNo: 1});

		if(!(foundVch && foundVch._id))
			return res.status(500).json({
				'status': 'OK',
				'message': 'Vouchers Not Found',
			});

		if(foundVch && foundVch.acImp.st)
			throw new Error('Voucher imported to A/c. Revert the Imported Voucher to Delete.');

		let foundGr = await GR.find({'fpa.vch': _id}, {_id: 1, fpa:1}).lean();

		if(foundGr.length){
			for(let oGr of foundGr){
				if(oGr.fpa.deduction)
					for (let k in oGr.fpa.deduction) {
						if (oGr.fpa.deduction.hasOwnProperty(k)) {
							let val =oGr.fpa.deduction[k];
							if(val.voucher){
								let foundVouch = await VoucherService.findVoucherByIdAsync(val.voucher, {_id: 1, acImp:1,refNo:1,stationaryId:1});
								if(!(foundVouch && foundVouch._id))
									throw new Error(`Voucher Not Found`);

								if(foundVouch.acImp.st)
									throw new Error(`Account already imported`);
							}
						}
					}
			}

		}

		if(foundVch.stationaryId){
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'Voucher',
				docId: foundVch._id,
				stationaryId: foundVch.stationaryId,
			}, 'cancelled');
		}

		if(foundGr.length){
			for(let oGr of foundGr){
				if(oGr.fpa.deduction)
					for (let k in oGr.fpa.deduction) {
						if (oGr.fpa.deduction.hasOwnProperty(k)) {
							let val =oGr.fpa.deduction[k];
							if(val.voucher)
								await VoucherService.removeVoucher({
									_id: otherUtil.arrString2ObjectId(val.voucher),
									clientId: req.user.clientId
								});
						}
					}
			}

		}


		await GR.updateMany({'fpa.vch':_id}, {
			$unset: {
				fpa: 1
			}
		});

		await VoucherService.removeVoucher({
			_id,
			clientId: req.user.clientId,
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'FPA deleted',
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/getIn', async function (req, res, next) {
	try {
		let refNo = req.body.refNo;
		let clientId = req.user.clientId;

		//get voucher
		let data = await VoucherService.findVoucherByQueryAsync({
			vT : 'Incidental Expense',
			clientId,
			refNo: new RegExp('^'+refNo+'$')
		});

		if(!data.length)
			throw new Error('No Voucher Found');

		//get all gr in.refNo
		data[0].gr = await GR.find({'in.vch': data[0]._id}).lean();


		return res.status(200).json({
			'status': 'OK',
			'message': 'Incidental Expense found',
			data
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/addIn', async function (req, res, next) {
	try {
		let refNo = req.body.refNo;

		// validating request body
		await validateRequest(req, 'add');

		let oQuery = {
			refNo: new RegExp('^'+refNo+'$'),
			clientId: req.user.clientId,
			deleted: {
				$not: {
					$eq: true
				}
			}
		};

		if (req.body.stationaryId) {
			oQuery.stationaryId = req.body.stationaryId;
		}

		let foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

		if(foundVoucher && foundVoucher._id){
			throw new Error('Ref No already used');
		}

		if (!req.body.stationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: req.body.refNo,
				type: 'Ref No',
				clientId: req.body.clientId
			});

			if (foundStationary) {
				req.body.stationaryId = foundStationary._id;
			}
		}

		// validating that all gr exists
		let gr = await GR.find({_id:{$in: req.body.gr.map(o => o._id)}},{_id: 1});

		if(gr.length != req.body.gr.length)
			throw new Error('some of gr does not exist');

		// Preparing Voucher Object
		let oVch = {
			branch: req.body.branch,
			refNo: req.body.refNo,
			stationaryId: req.body.stationaryId,
			date: req.body.date,
			vT: 'Incidental Expense',
			type: 'Payment',
			paymentMode: req.body.paymentMode,
			paymentRef: req.body.paymentRef,
			paymentDate: req.body.paymentDate,
			narration: req.body.narration,
			ledgers: req.body.ledgers,
			createdBy: req.user.full_name,
			lastModifiedBy: req.user.full_name,
			clientId: req.user.clientId,
			_id: mongoose.Types.ObjectId()
		};

		// Adding Voucher
		await VoucherService.addVoucherAsync(oVch);

		for(let i = 0; i < req.body.gr.length; i++){
			let oGR = req.body.gr[i];
			let oQuery = {
				refNo: refNo,
				amt: oGR.amt,
				remark: oGR.remark,
				vch: oVch._id,
			};
			await GR.updateOne({_id: oGR._id}, {
				$push: {
					in: oQuery
				},
				$set: {
					last_modified_at: new Date(),
				}
			});
		}

		if(req.body.stationaryId){
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				docId: oVch._id,
				modelName: 'Voucher',
				stationaryId: req.body.stationaryId,
			}, 'used');
		}

		return res.status(200).json({
			'status': 'OK',
			'message': 'Incidental Expense Successfully Added'
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/editIn/:_id', async function(req, res, next){
	try{
		let nRefNo;
		let nStationaryId;
		let _id = req.params._id;

		await validateRequest(req, 'edit');

		//maintain Stationary
		nRefNo = req.body.refNo;
		nStationaryId = req.body.stationaryId;

		if(!nRefNo)
			throw new Error('Mandatory fields are required');

		let foundVoucher = await VoucherService.findVoucherByIdAsync(_id, {_id: 1, acImp:1,refNo:1,stationaryId:1});

		if(!(foundVoucher && foundVoucher._id))
			throw new Error(`Voucher Not Found`);

		if(foundVoucher.acImp.st)
			throw new Error(`Account already imported`);

		// validating that all gr exists
		if((await GR.find({_id:{$in: req.body.gr.map(o => o._id)}}, {_id: 1})).length != req.body.gr.length)
			throw new Error('some of gr does not exist');

		let oRefNo = foundVoucher.refNo;
		let oStationaryId = foundVoucher.stationaryId;

		if(!nStationaryId){
			let foundId = await billStationaryService.findByRefAndType({
				bookNo: nRefNo,
				type: 'Ref No',
				clientId: req.user.clientId
			});

			if(foundId){
				nStationaryId = foundId._id.toString();
				req.body.stationaryId = nStationaryId;
			}
		}

		if(nRefNo != oRefNo){

			let oQuery = {
				_id: {
					$nin: [_id]
				},
				refNo: new RegExp('^'+nRefNo+'$'),
				clientId: req.user.clientId,
				deleted: {
					$not:{
						$eq:true
					}
				}
			};

			foundVoucher = await VoucherService.findVoucherByQueryAsync(oQuery, {_id: 1});

			if((foundVoucher && foundVoucher._id) || (nStationaryId && (await billStationaryService.isUsed(nStationaryId))))
				throw new Error(`Voucher With Ref. No. ${nRefNo} Already Exists.`);

			await billStationaryService.setUnset({
				modelName: 'Voucher',
				userName: req.user.full_name,
				docId: _id.join(',')
			},{
				refNo: nRefNo,
				stationaryId: nStationaryId
			},{
				refNo: oRefNo,
				stationaryId: oStationaryId
			});

			// if(!nStationaryId && oStationaryId){
			// 	await VouchersNew.update({_id: {$in: otherUtil.arrString2ObjectId(_id)}}, {
			// 		$unset: {
			// 			stationaryId: 1,
			// 			refNo: 1
			// 		}
			// 	});
			// }
		}

		// Upserting incidental on Gr's
		let aOldGr = await GR.find({'in.vch': _id}, {_id: 1});

		for(let nGr of req.body.gr){
			let fGrIdx = aOldGr.findIndex(oGr => oGr._id.toString() === nGr._id.toString());
			let fGr = aOldGr[fGrIdx];

			if(fGr){
				// edit if found
				await GR.updateOne({_id: fGr._id, 'in.vch': _id}, {
					$set: {
						'in.$': {
							amt: nGr.amt,
							refNo: nRefNo,
							remark: nGr.remark,
							vch: _id
						},
						last_modified_at: new Date(),
					}
				});

				aOldGr.splice(fGrIdx, 1);

			}else{
				// add if not found
				await GR.updateOne({_id: nGr._id}, {
					$push: {
						'in': {
							amt: nGr.amt,
							refNo: nRefNo,
							remark: nGr.remark,
							vch: _id
						}
					},
					$set: {
						last_modified_at: new Date(),
					}
				});
			}
		}

		// removing incidental obj from deleted Gr's
		if(aOldGr.length)
			await GR.updateMany({_id: {$in: aOldGr.map(o => o._id)}}, {
				$pull: {
					'in': {
						vch: _id
					}
				},
				$set: {
					last_modified_at: new Date(),
				}
			});

		// Preparing Voucher Object
		let oVch = {
			branch: req.body.branch,
			refNo: req.body.refNo,
			stationaryId: req.body.stationaryId,
			date: req.body.date,
			paymentMode: req.body.paymentMode,
			paymentRef: req.body.paymentRef,
			paymentDate: req.body.paymentDate,
			narration: req.body.narration,
			ledgers: req.body.ledgers,
			lbastModifiedBy: req.user.full_name,
			clientId: req.user.clientId,
			_id
		};

		// edit Voucher
		await VoucherService.editVoucher(oVch);

		return res.status(200).json({
			'status': 'OK',
			'message': 'Incidental Expense Successfully Updated'
		});


	}catch (e){
		return res.status (500).json ({
			"status": "ERROR",
			"message": e.toString()
		});
	}

});

router.post('/deleteIn/:_id', async function (req, res, next) {
	try {

		let _id =  req.params._id || false;

		if(!_id)
			throw new Error('Mandatory fields required');

		let foundVch = await VoucherService.findVoucherByIdAsync(_id, {stationaryId:1 ,acImp: 1, refNo: 1});

		if(!(foundVch && foundVch._id))
			return res.status(500).json({
				'status': 'OK',
				'message': 'Vouchers Not Found',
			});

		if(foundVch && foundVch.acImp.st)
			throw new Error('Voucher imported to A/c. Revert the Imported Voucher to Delete.');

		if(foundVch.stationaryId){
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'Voucher',
				docId: foundVch._id,
				stationaryId: foundVch.stationaryId,
			}, 'cancelled');
		}

		await GR.updateMany({'in.vch':_id}, {
			$pull: {
				in: {
					vch: _id
				}
			},
			$set: {
				last_modified_at: new Date(),
			}
		});

		await VoucherService.removeVoucher({
			_id,
			clientId: req.user.clientId,
		});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Incidental deleted',
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/updateNonBillGr/:_id', async function (req, res, next) {
	try {

			let oQuery = {
				...req.body.his
			};
		   oQuery.by = req.user.full_name;

			await GR.updateOne({_id: req.body._id}, {
				$push: {
					his: oQuery
				},
				$set: {
					isNonBillable: req.body.isNonBillable,
					last_modified_at: new Date(),
				}
			});

		return res.status(200).json({
			'status': 'OK',
			'message': 'Gr Successfully Update'
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString(),
			'data': e
		})
	}
});

router.post('/moveGr/:_id', async function(req, res, next){
	try{
		//maintain old trip
		let gr_id = req.body.gr;
		let _id = req.params._id;

		// get gr
		let gr = await GR.findOne({_id: otherUtil.arrString2ObjectId(gr_id)}, {_id: 1,trip: 1,trip_no: 1,vehicle: 1, pod: 1, bill: 1, supplementaryBillRef: 1, provisionalBill: 1, }).lean();

		if(!(gr && gr._id))
			throw new Error(`Gr Not Found`);

		if(gr.pod && gr.pod.received)
			throw new Error(`Can not move Gr POD Already Received`);

		if(gr.bill)
			throw new Error(`Can not move Gr Bill Already Generated`);

		if(gr.supplementaryBillRef && gr.supplementaryBillRef.length)
			throw new Error(`Can not move Gr supplementaryBill Already Generated`);

		if(gr.provisionalBill && gr.provisionalBill.length)
			throw new Error(`Can not move Gr provisionalBill Already Generated`);

		let oTrip = gr && gr.trip;
		let oTripNo = gr && gr.trip_no;

		if(oTrip){
			// get old trip
			let foundOldTrip = await tripService.findTripById(oTrip, {_id: 1, gr: 1});
			if(foundOldTrip && foundOldTrip.gr && foundOldTrip.gr.length === 1)
				throw new Error(`Can not move Gr Trip ${oTripNo} have only single Gr`);
		}else{
			throw new Error('Trip not found on selectrd Gr');
		}

		if(!(gr && gr.vehicle))
			throw new Error(`vehicle not found on selectrd Gr`);

		// get new trip
		let foundTrip = await tripService.findTripById(_id, {_id: 1, vehicle:1,trip_no:1,isCancelled:1});

		if(!(foundTrip && foundTrip._id))
			throw new Error(`Trip Not Found`);

		if(foundTrip.vehicle._id.toString() != gr.vehicle.toString())
			throw new Error(`vehicle of both the trip should be same`);

		let nTrip = foundTrip._id;
		let nTripNo = foundTrip.trip_no;
		let oQuery = {
			typ:'Gr Move',
			by: req.user.full_name,
			at: new Date(),
			rmk: 'Gr Move From tripNo: '+ oTripNo + ' to ' + nTripNo,
		};

		let aData;
		// Update new trip on gr
			if(gr){
				 aData = await GR.updateOne({_id: otherUtil.arrString2ObjectId(gr._id)}, {
					$set: {
						trip: nTrip,
						trip_no: nTripNo,
						last_modified_at: new Date(),
					},
					$push: {
						his: oQuery
					},
				});
			}

		let body = {
			$push: {
				gr: gr._id
			}
		};

		if (foundTrip && (!foundTrip.isCancelled)) {
			await tripService.updateOneTrip(foundTrip._id, body, true);
		}

		body = {
			$pull: {
				gr: gr._id
			}
		};

		if (oTrip) {
			await tripService.updateOneTrip(oTrip, body, true);
		}

		return res.status(200).json({
			'status': 'OK',
			'message': 'gr Successfully moved',
			"data" : aData
		});


	}catch (e){
		return res.status (500).json ({
			"status": "ERROR",
			"message": e.toString(),
		});
	}

});

router.put('/docs/:_id', async function(req, res, next){
	try{
		if(!req.params._id)
			throw new Error('Mandatory Fields are required');

		next();

	}catch(e){
		return res.status(500).json({
			status: 'Error',
			message: e.toString(),
		});
	}
}, multipartMiddleware, async function(req, res, next){
	try{
		if(!req.body.bodyKey)
			throw new Error('Mandatory Fields are required');

		let key = req.body.bodyKey;
		let _id = otherUtil.arrString2ObjectId(req.params._id);

		if(!req.files[key] || !Array.isArray(req.files[key]))
			throw new Error('Mandatory Fields are required');

		if(!req.files[key].length)
			throw new Error('At least one file should be selected');

		let doc = {};
		req.files = req.files[key];

		// validation
		let mulitpleFilesIdentifier = ['misc', 'invoice', 'eway', 'insur'];

		if(mulitpleFilesIdentifier.indexOf(key) == -1 && req.files.length > 1)
			throw new Error('Cannot upload more than one file');

		await FileService.uploadFiles(req, 'tripV2', doc);

		await GR.updateOne({_id, 'pod.doc': {$exists: false}}, {
			$set: {
				doc: {
					misc: []
				}
			}
		});

		let updateQuery = {};

		if(mulitpleFilesIdentifier.indexOf(key) == -1){
			updateQuery = {
				$set: {
					[`pod.doc.${key}`]: doc.documents[0].docReference
				}
			};
		}else
			updateQuery = {
				$addToSet: {
					[`pod.doc.${key}`]: {$each: doc.documents.map(o => o.docReference)}
				}
			};

		updateQuery && Object.keys(updateQuery).length && await GR.updateOne({_id},updateQuery);

		let updatedDoc = await GR.findOne({_id}, {'pod.doc': 1}).lean();

		return res.status(200).json({
			status: 'Success',
			message: "Doc. Successfully Uploaded",
			data: updatedDoc.pod
		});

	}catch(e){
		return res.status(500).json({
			status: 'Error',
			message: e.toString(),
		});
	}
});

async function validateRequest({body, params}, schemaType) {

	try {

		const addSchema = {
			body: Joi.object().keys({
				'branch': Joi.string().required(),
				'refNo': Joi.string().required(),
				'date': Joi.date().iso().required(),
				'narration': Joi.string().default(''),
				'stationaryId': Joi.any(),
				'paymentMode': Joi.string(),
				'paymentRef': Joi.string(),
				'paymentDate': Joi.string(),
				'ledgers': Joi.array().items(Joi.object().keys({
					account: Joi.string().required(),
					lName: Joi.string().required(),
					amount: Joi.number().required(),
					cRdR: Joi.string().required(),
				}).pattern(/./, Joi.any())).min(1).required(),
				'gr': Joi.array().items(Joi.object().keys({
					amt: Joi.number().required(),
				}).pattern(/./, Joi.any())).min(1).required(),
			}).pattern(/./, Joi.any())
		};

		const editSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required()
			}).pattern(/./, Joi.any()),
			body: Joi.object().keys({
				'branch': Joi.string().required(),
				'refNo': Joi.string().required(),
				'date': Joi.date().iso().required(),
				'narration': Joi.string().default(''),
				'stationaryId': Joi.any(),
				'paymentMode': Joi.string(),
				'paymentRef': Joi.string(),
				'paymentDate': Joi.string(),
				'ledgers': Joi.array().items(Joi.object().keys({
					account: Joi.string().required(),
					lName: Joi.string().required(),
					amount: Joi.number().required(),
					cRdR: Joi.string().required(),
				}).pattern(/./, Joi.any())).min(1).required(),
				'gr': Joi.array().items(Joi.object().keys({
					amt: Joi.number().required(),
				}).pattern(/./, Joi.any())).min(1).required(),
			}).pattern(/./, Joi.any())
		};

		const removeSchema = {
			params: Joi.object().keys({
				_id: Joi.string().required()
			}).unknown(true),
		};

		let ptr;

		if (schemaType === 'add')
			ptr = addSchema;
		else if (schemaType === 'edit')
			ptr = editSchema;
		else if (schemaType === 'remove')
			ptr = removeSchema;
		else
			throw new Error('Invalid Type');

		const schema = {
			params: Joi.object().pattern(/./, Joi.any()),
			body: Joi.object().pattern(/./, Joi.any()),
			...ptr
		};

		await Joi.validate({body, params}, schema);

		return true;

	} catch (e) {
		console.log(e);
		throw new Error('Mandatory Feilds are required.');
	}
}

module.exports = router;
