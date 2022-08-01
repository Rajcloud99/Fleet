'use strict';

const _ = require('lodash');
const moment = require('moment');
const XML = require('../../utils/createXML.utility');
const path = require('path');
const ReportExelService = promise.promisifyAll(commonUtil.getService('reportExel'));
const mongoose = require('mongoose');
const router = express.Router();
const TripAdvance = commonUtil.getModel('TripAdvances');
const RegisteredVehicleModel = commonUtil.getModel('registeredVehicle');
let Trip = commonUtil.getModel('trip');
const ExcelReader = require('../../utils/ExcelReader');
const serverSidePage = require('../../utils/serverSidePagination');
const billStationaryService = commonUtil.getService('billStationary');
const Accounts = commonUtil.getModel('accounts');
const Branch = commonUtil.getModel('branch');
const RegisteredVehicle = commonUtil.getModel('registeredVehicle');
const BillStationary = commonUtil.getModel('billStationary');
const billBookService = commonUtil.getService('billBook');
const tripAdvService = commonUtil.getService('tripAdvance');
const BillBook = commonUtil.getModel('billBook');
const multer = require('multer');
const upload = multer({
	limits: {fileSize: 10 * 1000 * 1000},
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
const VoucherServiceV2 = commonUtil.getService('voucher');
const logsService = commonUtil.getService('logs');
const winstonLogger = require('winston');
const csvDownload = require('../../utils/csv-download');
const tripAdvance = commonUtil.getReports('tripAdvance.js');
const dieselTripReport = commonUtil.getReports('dieselTripReport.js');
const fs = require("fs");
const mkdirp = require("mkdirp");
const errorLogger = new (winstonLogger.Logger)({
	levels: {
		voucherExport: 0
	},
	transports: [
		new (winstonLogger.transports.File)({filename: 'tripAdvanceVoucherExport.log', level: 'voucherExport'}),
	]
});
const costCategoryCenterService = commonUtil.getService('costCategoryCenter');
const DIR = `${projectHome}/files/reports`

const ALLOWED_FILTER = ['_id', 'advanceType', 'bill_no', 'cond', 'clientId', 'driver', 'from', 'to', 'trip_no', 'trip', 'voucher', 'vehicle', 'vehicle_no', 'vendor',
	'purchaseBill', 'account', 'reference_no', 'isCancelled', 'reversed', 'multiAdv', 'branch', 'status', 'category'];

function constructFilterOfAdvanceRpt(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				oFilter[oQuery.dateType || 'date'] = oFilter[oQuery.dateType || 'date'] || {};
				oFilter[oQuery.dateType || 'date'].$gte = startDate;

			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				oFilter[oQuery.dateType || 'date'] = oFilter[oQuery.dateType || 'date'] || {};
				oFilter[oQuery.dateType || 'date'].$lte = endDate;
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
};

function constructFilters(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setMilliseconds(0);
				oFilter[oQuery.dateType || 'date'] = oFilter[oQuery.dateType || 'date'] || {};
				oFilter[oQuery.dateType || 'date'].$gte = startDate;

			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				oFilter[oQuery.dateType || 'date'] = oFilter[oQuery.dateType || 'date'] || {};
				oFilter[oQuery.dateType || 'date'].$lte = endDate;
			} else if (i === 'vehicle' || i === 'driver') {
				oFilter[i] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			} else if (i === 'vehicles' && oQuery['vehicles'].length > 0) {
				oFilter['vehicle'] = {$in: otherUtil.arrString2ObjectId(oQuery[i])}
			} else if (i === 'account') {
				if (typeof oQuery[i] === "string") {
					oFilter.$or = [{from_account: mongoose.Types.ObjectId(oQuery[i])},
						{to_account: mongoose.Types.ObjectId(oQuery[i])}];
				}
			} else if (i === 'vendor') {
				oFilter['vendor'] = mongoose.Types.ObjectId(oQuery[i]);
			} else if (i === 'branch') {
				if (Array.isArray(oQuery[i])) {
					oFilter[i] = {$in: otherUtil.arrString2ObjectId(oQuery[i])};
				} else {
					oFilter[i] = otherUtil.arrString2ObjectId(oQuery[i]);
				}
				//oFilter['branch'] = mongoose.Types.ObjectId(oQuery[i]);
			} else if (i == "reference_no") {
				oFilter[i] = {
					$regex: oQuery[i],
					$options: 'i'
				};
			} else if (i === 'advanceType') {
				if (oQuery[i] instanceof Array) {
					oFilter[i] = {$in: oQuery[i]}
				} else if (typeof oQuery[i] == 'object') {
					if (oQuery[i] == 'eq')
						oFilter[i] = oQuery[i];
					else if (oQuery[i] == 'ne')
						oFilter[i] = {
							$ne: oQuery[i]
						};
					else
						oFilter[i] = oQuery[i];
				} else {
					oFilter[i] = oQuery[i];
				}
			} else if (i === '_id') {
				if (Array.isArray(oQuery[i]) && oQuery[i].length) {
					oFilter[i] = {$in: otherUtil.arrString2ObjectId(oQuery[i])};
				} else {
					oFilter[i] = otherUtil.arrString2ObjectId(oQuery[i]);
				}
			} else if (i == 'cond') {
				oFilter['$and'] = oQuery[i];
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

router.put('/update/:id', async (req, res, next) => {
	const oRes = {
		status: "OK",
		message: 'Trip Advance Updated Successfully'
	};

	let prepareAdvanceObj = {}, body = req.body;
	try {
		let oTripAdvance = await TripAdvance.findOne({_id: req.params.id, clientId: req.user.clientId});

		if (!oTripAdvance)
			throw new Error('Trip Advance not found!');

		if (req.body.reference_no !== oTripAdvance.reference_no) {
			let fd = await TripAdvance.findOne({
				reference_no: req.body.reference_no,
				clientId: req.user.clientId
			}, {_id: 1})
			if (fd)
				throw new Error('Ref No already user');
		}

		if(req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.zeroNotAllow){
			if(req.body.amount === 0){
				throw new Error('Amount Can not  be Zero');
			}
		}
		if(req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.ZeroAndMinusNotAllow){
			if(req.body.amount < 1){
				throw new Error('Amount can not be zero or minus');
			}
		}

		if (oTripAdvance.editable === false) {

			if (oTripAdvance.linkable != false && (oTripAdvance.trip && oTripAdvance.trip.toString()) != req.body.trip) {

				let oTrip = await Trip.findOne({_id: req.body.trip, clientId: req.user.clientId}, {
					trip_no: 1,
					advSettled: 1,
					markSettle: 1
				}).lean();

				if (oTrip && oTrip.advSettled && oTrip.advSettled.isCompletelySettled)
					throw new Error(`Trip Advance Cannot be updated. Because Trip no ${oTrip.trip_no} is Completely Settled`);

				if (oTrip && oTrip.markSettle && oTrip.markSettle.isSettled)
					throw new Error(`Trip Advance Cannot be updated. Because Trip no ${oTrip.trip_no} is Marked Settled`);

				await TripAdvance.updateOne({_id: oTripAdvance._id}, {
					$set: {
						trip: oTrip._id,
						trip_no: oTrip.trip_no,
						driver: req.body.driver
					}
				});

				return res.status(200).json(oRes);
			}

			throw new Error('Trip Advance Cannot be Edited!');
		}

		if (oTripAdvance.voucher) {

			prepareAdvanceObj = {
				reference_no: req.body.reference_no,
				stationaryId: req.body.stationaryId,
				branch: req.body.branch,
				advanceType: req.body.advanceType,
				settleTheTrip: req.body.settleTheTrip,
				bill_no: req.body.bill_no,
				remark: req.body.remark,
				narration: req.body.narration,
				amount: req.body.amount
			};

			let fdVch = await VoucherServiceV2.findVoucherByIdAsync(oTripAdvance.voucher, {acImp: 1, ledgers: 1});

			if (!(fdVch && fdVch._id))
				throw new Error('Voucher not Found');

			let newVehicleAccount = req.body.to_account && req.body.to_account._id || req.body.to_account;
			let vehicleAccount = oTripAdvance.to_account && oTripAdvance.to_account._id && oTripAdvance.to_account._id.toString() || oTripAdvance.to_account.toString();

			if (fdVch && fdVch.acImp.st) {
				if (newVehicleAccount != vehicleAccount) {
					await tripAdvService.updateImported(req.params.id, body, req);
					return res.status(200).json(oRes);
				} else {
					throw new Error("Advance Cannot be edited Voucher is Imported to A/c");
				}
			}

			let oPlainVoucher = {
				_id: fdVch._id,
				refNo: req.body.reference_no,
				stationaryId: req.body.stationaryId,
				branch: req.body.branch,
				narration: req.body.remark
			};

			fdVch.ledgers.forEach(o => {
				o.amount = req.body.amount;
				o.bills.forEach(ob => {
					ob.billNo = req.body.reference_no;
				});
			});
			oPlainVoucher.ledgers = fdVch.ledgers;

			await VoucherServiceV2.editVoucher(oPlainVoucher);

		} else if (oTripAdvance.purchaseBill) {
			throw new Error('Cannot Edit because, Purchase Bill is already generated');
		}


		prepareAdvanceObj = {
			amount: req.body.amount,
			branch: req.body.branch,
			remainingAmount: req.body.amount || 0,
			person: req.body.person,
			date: req.body.date,
			bill_no: req.body.bill_no,
			remark: req.body.remark,
			vendor: req.body.vendor,
			driver: req.body.driver,
			narration: req.body.narration,
			reference_no: req.body.reference_no,
			stationaryId: req.body.stationaryId,
			advanceType: req.body.advanceType,
			from_account: req.body.from_account,
			from_account_name: req.body.from_account_name,
			to_account: req.body.to_account,
			to_account_name: req.body.to_account_name,
			settleTheTrip: req.body.settleTheTrip,
			vehicle: req.body.vehicle,
			vehicle_no: req.body.vehicle_no,
			ccVehicle: req.body.ccVehicle,
			ccBranch: req.body.ccBranch,
			gr: req.body.gr,
			grData: req.body.grData,
			last_modified_by_name: req.user.full_name,
			last_modified_at: new Date(),
			aExtraCharges: req.body.aExtraCharges ? req.body.aExtraCharges: 0,
			totalExtraChrges: req.body.totalExtraChrges ? req.body.totalExtraChrges: 0
		};

		let oTrip;
		let unlinkTrip = false;

		if (oTripAdvance.linkable != false && (oTripAdvance.trip && oTripAdvance.trip.toString()) != req.body.trip) {

			if (!req.body.trip)
				unlinkTrip = oTripAdvance.trip;

			oTrip = await Trip.findOne({_id: req.body.trip, clientId: req.user.clientId}, {
				trip_no: 1,
				advSettled: 1,
				markSettle: 1
			}).lean();

			if (oTrip) {
				prepareAdvanceObj.trip = oTrip._id;
				prepareAdvanceObj.trip_no = oTrip.trip_no;
			}

			if (oTrip && oTrip.advSettled && oTrip.advSettled.isCompletelySettled)
				throw new Error(`Trip Advance Cannot be updated. Because Trip no ${oTrip.trip_no} is Completely Settled`);

			if (oTrip && oTrip.markSettle && oTrip.markSettle.isSettled)
				throw new Error(`Trip Advance Cannot be updated. Because Trip no ${oTrip.trip_no} is Marked Settled`);
		}

		// validate refNo and mark new ref used and old cancelled if ref is changed
		let nRefNo = prepareAdvanceObj.reference_no;
		let nStationaryId = prepareAdvanceObj.stationaryId;

		let oRefNo = oTripAdvance.reference_no;
		let oStationaryId = oTripAdvance.stationaryId;

		if (oRefNo !== nRefNo) {
			let foundAdvance = await TripAdvance.findOne({
				reference_no: nRefNo
			});

			if (foundAdvance && foundAdvance.length)
				throw new Error(`Voucher with Ref. No. ${refNo} already exists.`);

			if (!nStationaryId) {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: nRefNo,
					type: 'Ref No',
					clientId: req.user.clientId
				});

				if (foundStationary) {
					prepareAdvanceObj.stationaryId = nStationaryId = foundStationary._id;
				} else {
					TripAdvance.findByIdAndUpdate(req.params.id, {
						$unset: {
							'stationaryId': 1
						}
					});
				}
			}

			if (nStationaryId && (await billStationaryService.isUsed(nStationaryId)))
				throw new Error('Ref No already used');
		}

		if (prepareAdvanceObj.advanceType === 'Diesel') {
			prepareAdvanceObj.dieseInfo = req.body.dieseInfo;
			// prepareAdvanceObj.amount = req.body.dieseInfo.rate * req.body.dieseInfo.litre;
		}

		oTripAdvance = await TripAdvance.findOneAndUpdate({_id: oTripAdvance._id}, {
			$set: prepareAdvanceObj
		});

		if (unlinkTrip) {
			oTripAdvance = await TripAdvance.findOneAndUpdate({_id: oTripAdvance._id}, {
				$unset: {
					trip: 1,
					trip_no: 1
				}
			});

			await Trip.update(
				{
					_id: unlinkTrip
				},
				{
					$pull: {
						'advanceBudget': oTripAdvance._id
					}
				}
			);
		}

		if (oRefNo !== nRefNo) {
			await billStationaryService.setUnset({
				modelName: 'tripadvances',
				userName: req.user.full_name,
				docId: oTripAdvance._id
			}, {
				refNo: nRefNo,
				stationaryId: nStationaryId
			}, {
				refNo: oRefNo,
				stationaryId: oStationaryId
			});
		}

		if (oTrip) {

			if (!oTripAdvance.trip && oTrip) {
				let updated = await Trip.updateOne(
					{
						_id: oTrip._id
					},
					{
						$addToSet: {
							'advanceBudget': oTripAdvance._id
						}
					}
				);
			} else if (oTripAdvance.trip.toString() !== oTrip._id.toString()) {
				await Trip.update(
					{
						_id: oTripAdvance.trip
					},
					{
						$pull: {
							'advanceBudget': oTripAdvance._id
						}
					}
				);
				await Trip.update(
					{
						_id: oTrip._id
					},
					{
						$addToSet: {
							'advanceBudget': oTripAdvance._id
						}
					}
				);
			}

			oTrip = await Trip.findOne({_id: req.body.trip, clientId: req.user.clientId});

			oRes.data = req.body.summary ?  Trip.eachTripSummary(oTrip) : oTrip;

		}
		let oDelta = {};
		if (prepareAdvanceObj.advanceType === "Diesel") {
			await RegisteredVehicleModel.update(
				{_id: req.body.vehicle}, {
					$inc: {
						'dieselInVehicle': prepareAdvanceObj.dieseInfo.litre
					}
				}
			);
			// Send Notification
			let alertTotalDiesel = 950;
			let dieselLtr = prepareAdvanceObj.dieseInfo.litre;
			if (dieselLtr > alertTotalDiesel) {
				oDelta = {
					"Success": {
						count: dieselLtr,
						status: "Success",
						message: "Totol Diesel Ltr Exceeded from " + alertTotalDiesel
					}
				};
				alertTripAdvLog(req, req.body.reference_no, oDelta);
			}
		}

		let oDeltaLog = {};
		if (req.body.advanceType == 'Happay') {
			let alertHappayAmt = 50000;
			let totalHappayAmt = req.body.amount;
			if (totalHappayAmt > alertHappayAmt) {
				oDeltaLog = {
					"Success": {
						count: totalHappayAmt,
						status: "Success",
						message: "Totol Happay Exceeded from " + alertHappayAmt
					}
				};
				alertTripAdvLog(req, req.body.reference_no, oDeltaLog);
			}
		} else if (req.body.advanceType == 'Driver Cash') {
			let alertDriverCashAmt = 50000;
			let totalDriverCashAmt = req.body.amount;
			if (totalDriverCashAmt > alertDriverCashAmt) {
				oDeltaLog = {
					"Success": {
						count: totalDriverCashAmt,
						status: "Success",
						message: "Totol Driver Cash Amount Exceeded from " + alertDriverCashAmt
					}
				};
				alertTripAdvLog(req, req.body.reference_no, oDeltaLog);
			}
		} else if (req.body.advanceType == 'Fastag') {
			let alertFastTagAmt = 3000;
			let totalFastTagAmt = req.body.amount;
			if (totalFastTagAmt > alertFastTagAmt) {
				oDeltaLog = {
					"Success": {
						count: totalFastTagAmt,
						status: "Success",
						message: "Totol Fastag Exceeded from " + alertFastTagAmt
					}
				};
				alertTripAdvLog(req, req.body.reference_no, oDeltaLog);
			}
			// END
		}

		return res.status(200).json(oRes);
	} catch (err) {
		return res.status(500).json({
			status: 'ERROR',
			message: err.toString()
		})
	}
});

router.post('/get', (req, res, next) => {
	try {
		// The comma operator evaluates all of its operands and returns the value of the last (rightmost) one.
		let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		oQuery.queryFilter = constructFilters(oQuery);
		if (req.body.all) {
			oQuery.all = req.body.all;
		} else if (req.body.sort) {
			oQuery.sort = {date: -1};
		} else {
			oQuery.sort = {_id: -1};
		}
		oQuery.populate = [
			{path: 'voucher'},
			{path: 'vehicle'},
			{path: 'driver'},
			{path: 'vendor'},
			{path: 'from_account'},
			{path: 'to_account'},
			{path: 'dieseInfo.vendor'},
			{path: 'dieseInfo.vendor.account'},
			{path: 'dieseInfo.station'},
			// {path: 'trip'}
		];
		otherUtil.findPagination(TripAdvance, oQuery, function (err, data) {
			if (err) {
				return res.status(500).json({
					status: 'ERROR',
					message: err.toString()
				})
			}
			// let oData = {};
			// oData.tripData =
			// 	TripAdvance.eachTripSummary(data.data);
			// data.data._doc.push(oData.tripData);

			return res.status(200).json({
				status: 'OK',
				message: 'Data found',
				data : data.data
			})
		})
	} catch (err) {
		next(err);
	}
});

router.post('/deleteTripContra/:id', async (req, res, next) => {
	try {

		let foundTripP;
		let foundTripR;
		let resData;
		let reference_no;

		// Validation Start...
		if (!req.params.id)
			throw new Error('Mandatory field are required.');

		let oTripAdvance = await TripAdvance.findOne({_id: req.params.id}, {reference_no: 1}).lean();
		if (!oTripAdvance)
			throw new Error('Trip Advance Ref not found.');
		else
			reference_no = oTripAdvance.reference_no;

		if (reference_no.match(/.*-R/) || reference_no.match(/.*-P/)) {
			reference_no = reference_no.slice(0, -2);
		}

		let newReferenceNoR = reference_no + '-R';
		let newReferenceNoP = reference_no + '-P';

		// Extra validation chceck if not exist contra entry in system for particualr ref number
		let oTripAdvanceRC = await TripAdvance.findOne({
			reference_no: newReferenceNoR,
			clientId: req.user.clientId
		}, {_id: 1}).lean();
		let oTripAdvancePC = await TripAdvance.findOne({
			reference_no: newReferenceNoP,
			clientId: req.user.clientId
		}, {_id: 1}).lean();
		if (!oTripAdvanceRC || !oTripAdvancePC) {
			throw new Error('Contra payment OR receipt not found.');
		}


		// OLD Trip Vehicle Validation

		let oTripAdvanceR = await TripAdvance.findOne({
			reference_no: newReferenceNoR,
			clientId: req.user.clientId
		}).lean();

		if (!oTripAdvanceR.voucher)
			throw new Error(`Voucher not found for Ref no. ${newReferenceNoR}`);

		// if(!oTripAdvanceR.trip)
		// 	throw new Error(`Trip not found for Ref no. ${newReferenceNoR}`);

		if (oTripAdvanceR.purchaseBill)
			throw new Error('Cannot deleted because, Purchase Bill in generated.');

		if (oTripAdvanceR.trip) {
			foundTripR = await Trip.findOne(
				{_id: oTripAdvanceR.trip, clientId: req.user.clientId},
				{advSettled: 1, markSettle: 1, trip_no: 1});
		}

		if (foundTripR && foundTripR.advSettled && foundTripR.advSettled.isCompletelySettled)
			throw new Error(`Trip Advance Cannot be deleted. Because Trip no ${foundTripR.trip_no} is Completely Settled`);

		/*
		if(foundTripR && foundTripR.markSettle && foundTripR.markSettle.isSettled)
			throw new Error(`Trip Advance Cannot be deleted. Because Trip no ${foundTripR.trip_no} is Marked Settled`);
		*/


		// New Vehicle Validation...

		let oTripAdvanceP = await TripAdvance.findOne({
			reference_no: newReferenceNoP,
			clientId: req.user.clientId
		}).lean();

		if (!oTripAdvanceP.voucher)
			throw new Error('System Error, Please Contact to admin');

		//if(!oTripAdvanceP.trip)
		//	throw new Error(`Trip not found for Ref no. ${newReferenceNoP}`);

		if (oTripAdvanceP.purchaseBill)
			throw new Error('Cannot deleted because, Purchase Bill in generated.');

		if (oTripAdvanceP.trip) {
			foundTripP = await Trip.findOne(
				{_id: oTripAdvanceP.trip, clientId: req.user.clientId},
				{advSettled: 1, markSettle: 1, trip_no: 1});
		}

		if (foundTripP && foundTripP.advSettled && foundTripP.advSettled.isCompletelySettled)
			throw new Error(`Trip Advance Cannot be deleted. Because Trip no ${foundTripP.trip_no} is Completely Settled`);

		if (foundTripP && foundTripP.markSettle && foundTripP.markSettle.isSettled)
			throw new Error(`Trip Advance Cannot be deleted. Because Trip no ${foundTripP.trip_no} is Marked Settled`);

		// checking if Voucher account alrady imported. if already imported then return error
		let fdVchP = await VoucherServiceV2.findVoucherByIdAsync(oTripAdvanceP.voucher, {acImp: 1});
		let fdVchR = await VoucherServiceV2.findVoucherByIdAsync(oTripAdvanceR.voucher, {acImp: 1});
		if ((fdVchP && fdVchP.acImp && fdVchP.acImp.st === true && fdVchR && fdVchR.acImp && fdVchR.acImp.st === true) ||
			(fdVchP && fdVchP.acImp && fdVchP.acImp.st === true && fdVchR && fdVchR.acImp && fdVchR.acImp.st === false) ||
			(fdVchP && fdVchP.acImp && fdVchP.acImp.st === false && fdVchR && fdVchR.acImp && fdVchR.acImp.st === true)) {
			throw new Error('Voucher account already imported.');
		}

		// Validation END

		//-------------- Receipt & Payment Voucher Deleted -----------
		await VoucherServiceV2.removeVoucher({_id: oTripAdvanceP.voucher});
		await VoucherServiceV2.removeVoucher({_id: oTripAdvanceR.voucher});
		// END

		// Trip Advance Delete
		await TripAdvance.remove({_id: oTripAdvanceP._id}); // Payment
		await TripAdvance.remove({_id: oTripAdvanceR._id}); // Receipt
		// END

		// Payment Log
		await logsService.add('tripadvances', {
			uif: newReferenceNoP,
			category: 'deleted',
			nData: {},
			oData: oTripAdvanceP,
		}, req);

		// Receipt Log
		await logsService.add('tripadvances', {
			uif: newReferenceNoR,
			category: 'deleted',
			nData: {},
			oData: oTripAdvanceR,
		}, req);

		// Pull/UnLink Payment
		if (oTripAdvanceP.trip) {
			await Trip.updateOne(
				{
					_id: oTripAdvanceP.trip
				},
				{
					$pull: {
						'advanceBudget': {$in: [oTripAdvanceP._id]}
					}
				}
			);
		}
		// Pull/UnLink Receipt
		if (oTripAdvanceR.trip) {
			await Trip.updateOne(
				{
					_id: oTripAdvanceR.trip
				},
				{
					$pull: {
						'advanceBudget': {$in: [oTripAdvanceR._id]}
					}
				}
			);
		}
		// Update Editable/Linkable as true...
		await TripAdvance.updateOne(
			{
				reference_no: reference_no,
				clientId: req.user.clientId
			},
			{
				$set: {
					editable: true,
					linkable: true
				}
			}
		);

		// Get Trip Data and send the response.
		//let oTripAdv= await TripAdvance.findOne({reference_no: reference_no, clientId: req.user.clientId},{trip:1}).lean();
		//let oTrip = await Trip.findOne({_id: oTripAdv.trip, clientId: req.user.clientId});
		resData = {};

		return res.status(200).json({
			status: 'OK',
			message: 'Trip Advance Contra Data Deleted!',
			data: resData
		});

	} catch (err) {
		return res.status(500).json({
			status: 'ERROR',
			message: err.toString()
		})
	}
});

router.post('/delete', async (req, res, next) => {
	try {
		if (!Array.isArray(req.body.ids)) {
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'ids are required in body',
			});
		}

		let responseData = [];
		let oTripAdvance = await TripAdvance.find({_id: {$in: otherUtil.arrString2ObjectId(req.body.ids)}}).lean();

		for (const adv of oTripAdvance){
			let isVoucherPlainVoucher = false; 	// we save plain voucher reference on Trip Advance Voucher key in case of Market vehicle.
			// so that the advance voucher of market vehicle cannot be imported to Accounts.
			let foundTrip;
			if (adv.editable === false)
				throw new Error('Advance Cannot be deleted. Its Advance Vehicle modified');
			if (adv.voucher) {

				isVoucherPlainVoucher = await VoucherServiceV2.findVoucherByIdAsync(adv.voucher, {acImp: 1});

				if (isVoucherPlainVoucher.acImp.st) {
					throw new Error('Advance Cannot be deleted. Voucher Imported to A/c');
				}
			}
			if (adv.purchaseBill)
				throw new Error('Cannot deleted because, Purchase Bill in generated.');

			if (adv.trip) {
				foundTrip = await Trip.findOne({_id: adv.trip, clientId: req.user.clientId});
			}

			if (foundTrip && foundTrip.advSettled && foundTrip.advSettled.isCompletelySettled)
				throw new Error(`Trip Advance Cannot be deleted. Because Trip no ${foundTrip.trip_no} is Completely Settled`);

			if (foundTrip && foundTrip.markSettle && foundTrip.markSettle.isSettled)
				throw new Error(`Trip Advance Cannot be deleted. Because Trip no ${foundTrip.trip_no} is Marked Settled`);

			let stationaryId = adv.stationaryId;
			let stationaryStatus;

			if (req.body.disableStationery)
				stationaryStatus = 'disable';
			else
				stationaryStatus = 'cancelled';


			if (stationaryId) {
				await billStationaryService.updateStatus({
					userName: req.user.full_name,
					modelName: 'tripadvances',
					docId: adv._id,
					stationaryId,
				}, stationaryStatus);
			}

			if (adv.voucher)
				await VoucherServiceV2.removeVoucher({_id: adv.voucher});

			let tripAdvanceData = await TripAdvance.findOne({_id: adv._id}).populate({
				path: 'branch', select: {name: 1}
			}).populate({
				path: 'created_by',
				select: {full_name: 1}
			}).populate({
				path: 'from_account', select: {name: 1}
			}).populate({
				path: 'to_account', select: {name: 1}
			}).populate({
				path: 'trip', select: {advSettled: 1}
			}).populate({
				path: 'driver', select: {name: 1, prim_contact_no: 1}
			}).populate({
				path: 'vendor', select: {name: 1}
			}).populate({
				path: 'vehicle', select: {segment_type: 1, ownershipType: 1}
			}).lean();
			let resData = await TripAdvance.remove({_id: adv._id});
			await logsService.add2('tripadvances', {
				uif: tripAdvanceData.reference_no,
				docDate: tripAdvanceData.date,
				category: 'delete',
				deleteRemark: req.body.deleteRemark,
				nData: {},
				oData: tripAdvanceData,
			}, req);

			// await logsService.add('tripadvances', {
			// 	uif: oTripAdvance.reference_no,
			// 	docDate: oTripAdvance.date,
			// 	category: 'delete',
			// 	nData: {},
			// 	oData: oTripAdvance,
			// }, req);

			if (adv.trip) {
				await Trip.updateOne(
					{
						_id: tripAdvanceData.trip
					},
					{
						$pull: {
							'advanceBudget': tripAdvanceData._id
						}
					}
				);
				let oTrip = await Trip.findOne({_id: adv.trip, clientId: req.user.clientId});
				resData = oTrip;
			}
			responseData.push(resData)

		}
		return res.status(200).json({
			status: 'OK',
			message: 'Data Deleted!',
			data: responseData
		})
	} catch (err) {
		return res.status(500).json({
			status: 'ERROR',
			message: err.toString()
		})
	}
});

router.post('/addMulti', async (req, res, next) => {
	try {

		let aAdvances = req.body.aAdvances;
		let reference_no = aAdvances[0].reference_no;
		let trip = aAdvances[0].trip;
		let vehicle = aAdvances[0].vehicle;
		let stationaryId = aAdvances[0].stationaryId;

		if (!Array.isArray(aAdvances) || !aAdvances.length)
			throw new Error('Add at least one Advance');

		let oTripAdvance = await TripAdvance.findOne({reference_no, clientId: req.user.clientId}, {_id: 1}).lean();

		if (oTripAdvance)
			throw new Error(`Advance with ${reference_no} already exists.`);

		let foundTrip;

		if (trip) {
			foundTrip = await Trip.findOne({_id: trip, clientId: req.user.clientId}, {trip_no: 1, advSettled:1, markSettle:1}).lean();
		}

		if (foundTrip && foundTrip.advSettled && foundTrip.advSettled.isCompletelySettled)
			throw new Error(`Trip Advance Cannot be added. Because Trip no ${foundTrip.trip_no} is Completely Settled`);

		if (foundTrip && foundTrip.markSettle && foundTrip.markSettle.isSettled)
			throw new Error(`Trip Advance Cannot be added. Because Trip no ${foundTrip.trip_no} is Marked Settled`);

		if (!stationaryId) {
			let foundStationary = await billStationaryService.findByRefAndType({
				bookNo: reference_no,
				type: 'Ref No',
				clientId: req.user.clientId
			});

			if (foundStationary) {
				aAdvances.forEach(o => o.stationaryId = foundStationary._id);
				stationaryId = foundStationary._id;
			}
		}

		if (stationaryId && (await billStationaryService.isUsed(stationaryId)))
			throw new Error('Ref No already used');

		for (let oAdvance of aAdvances) {
			if (oAdvance.advanceType === 'Diesel') {
				oAdvance.dieseInfo = oAdvance.diesel_info;
			}

			oAdvance.clientId = req.user.clientId;
			oAdvance.createdBy= req.user.full_name;
			oAdvance.multiAdv = true;
			oAdvance._id = mongoose.Types.ObjectId();

			let _oAdv = new TripAdvance(oAdvance);
			await _oAdv.save();
		}

		if (stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'tripadvances',
				docId: aAdvances[0]._id,
				stationaryId,
			}, 'used');
		}

		if (trip) {
			let updated = await Trip.findOneAndUpdate(
				{
					_id: otherUtil.arrString2ObjectId(trip)
				},
				{
					$addToSet: {
						'advanceBudget': {
							$each: aAdvances.map(o => o._id)
						}
					}
				}
			);
		}

		let liter = aAdvances.reduce((sum, oAdv) => {
			if (oAdv.advanceType === "Diesel") {
				sum += oAdv.dieseInfo.litre;
			}

			return sum;
		}, 0);

		if (liter) {
			await RegisteredVehicleModel.update(
				{_id: vehicle}, {
					$inc: {
						'dieselInVehicle': liter
					}
				}
			);

			// Send Notification
			let alertTotalDiesel = 950;
			let dieselLtr = liter;
			if (dieselLtr > alertTotalDiesel) {
				let oDelta = {
					"Success": {
						count: dieselLtr,
						status: "Success",
						message: "Totol Diesel Ltr Exceeded from " + alertTotalDiesel
					}
				};
				alertTripAdvLog(req, reference_no, oDelta);
			}
		}

		for (let oAdvance of aAdvances) {
			let oDeltaLog = {};
			if (oAdvance.advanceType == 'Happay') {
				let alertHappayAmt = 50000;
				let totalHappayAmt = oAdvance.amount;
				if (totalHappayAmt > alertHappayAmt) {
					oDeltaLog = {
						"Success": {
							count: totalHappayAmt,
							status: "Success",
							message: "Total Happay Exceeded from " + alertHappayAmt
						}
					};
					alertTripAdvLog(req, oAdvance.reference_no, oDeltaLog);
				}
			} else if (oAdvance.advanceType == 'Driver Cash') {
				let alertDriverCashAmt = 50000;
				let totalDriverCashAmt = oAdvance.amount;
				if (totalDriverCashAmt > alertDriverCashAmt) {
					oDeltaLog = {
						"Success": {
							count: totalDriverCashAmt,
							status: "Success",
							message: "Total Driver Cash Amount Exceeded from " + alertDriverCashAmt
						}
					};
					alertTripAdvLog(req, oAdvance.reference_no, oDeltaLog);
				}
			} else if (oAdvance.advanceType == 'Fastag') {
				let alertFastTagAmt = 3000;
				let totalFastTagAmt = oAdvance.amount;
				if (totalFastTagAmt > alertFastTagAmt) {
					oDeltaLog = {
						"Success": {
							count: totalFastTagAmt,
							status: "Success",
							message: "Total Fastag Exceeded from " + alertFastTagAmt
						}
					};
					alertTripAdvLog(req, oAdvance.reference_no, oDeltaLog);
				}
				// END
			}
		}


		return res.status(200).json({
			status: 'OK',
			message: 'Advance Added Successfully',
		});

	} catch (err) {
		return res.status(500).json({
			status: 'ERROR',
			message: err.toString()
		})
	}
});

router.post('/editMulti', async (req, res, next) => {
	try {

		let aAdvances = req.body.aAdvances;
		let oldRefNo = req.body.reference_no;
		let reference_no = aAdvances[0].reference_no;
		let trip = aAdvances[0].trip;
		let vehicle = aAdvances[0].vehicle;
		let stationaryId = aAdvances[0].stationaryId;

		if (!Array.isArray(aAdvances) || !aAdvances.length)
			throw new Error('Add at least one Advance');

		if (oldRefNo != reference_no) {
			let oTripAdvance = await TripAdvance.findOne({reference_no, clientId: req.user.clientId}, {_id: 1}).lean();

			if (oTripAdvance)
				throw new Error(`Advance with ${reference_no} already exists.`);

			if (!stationaryId) {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: reference_no,
					type: 'Ref No',
					clientId: req.user.clientId
				});

				if (foundStationary) {
					aAdvances.forEach(o => o.stationaryId = foundStationary._id);
					stationaryId = foundStationary._id;
				}
			}

			if (stationaryId && (await billStationaryService.isUsed(stationaryId)))
				throw new Error('Ref No already used');
		}

		let foundTrip;

		if (trip) {
			foundTrip = await Trip.findOne({_id: trip, clientId: req.user.clientId}, {trip_no: 1}).lean();
		}

		if (foundTrip && foundTrip.advSettled && foundTrip.advSettled.isCompletelySettled)
			throw new Error(`Trip Advance Cannot be added. Because Trip no ${foundTrip.trip_no} is Completely Settled`);

		if (foundTrip && foundTrip.markSettle && foundTrip.markSettle.isSettled)
			throw new Error(`Trip Advance Cannot be added. Because Trip no ${foundTrip.trip_no} is Marked Settled`);

		let aFoundAdvances = await TripAdvance.find({reference_no: oldRefNo, clientId: req.user.clientId}, {
			_id: 1,
			voucher: 1
		}).lean();

		aFoundAdvances.forEach(o => {
			if (o.voucher)
				throw new Error('Some or All Advances are improted in A/c.');

			if (o.purchaseBill)
				throw new Error('Cannot delete because, Purchase Bill is generated.');
		});

		let aDeletedAdv = [];
		for (let oSavedAdvances of aFoundAdvances) {
			let fdAdv;
			if ((fdAdv = aAdvances.find(o => o._id === oSavedAdvances._id.toString()))) {
				await TripAdvance.updateOne({
					_id: oSavedAdvances._id
				}, {
					$set: fdAdv
				});
			} else {
				await TripAdvance.deleteOne({
					_id: oSavedAdvances._id
				});
				aDeletedAdv.push(oSavedAdvances._id);
			}
		}

		for (let oAdvance of aAdvances.filter(o => !o._id)) {
			if (oAdvance.advanceType === 'Diesel') {
				oAdvance.dieseInfo = req.body.diesel_info;
			}

			oAdvance.clientId = req.user.clientId;
			oAdvance.multiAdv = true;
			oAdvance._id = mongoose.Types.ObjectId();

			let _oAdv = new TripAdvance(oAdvance);
			await _oAdv.save();
		}

		if (oldRefNo != reference_no && stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'tripadvances',
				docId: oAdvance._id,
				stationaryId,
			}, 'used');
		}

		if (trip) {
			await Trip.findOneAndUpdate(
				{
					_id: otherUtil.arrString2ObjectId(trip)
				},
				{
					$pull: {
						advanceBudget: {$in: aDeletedAdv}
					}
				}
			);

			await Trip.findOneAndUpdate(
				{
					_id: otherUtil.arrString2ObjectId(trip)
				},
				{
					$addToSet: {
						'advanceBudget': {
							$each: aAdvances.map(o => o._id)
						}
					},
				}
			);
		}

		let liter = aAdvances.reduce((sum, oAdv) => {
			if (oAdv.advanceType === "Diesel") {
				sum += oAdv.dieseInfo.litre;
			}

			return sum;
		}, 0);

		if (liter) {
			await RegisteredVehicleModel.update(
				{_id: vehicle}, {
					$inc: {
						'dieselInVehicle': liter
					}
				}
			);

			// Send Notification
			let alertTotalDiesel = 950;
			let dieselLtr = liter;
			if (dieselLtr > alertTotalDiesel) {
				let oDelta = {
					"Success": {
						count: dieselLtr,
						status: "Success",
						message: "Totol Diesel Ltr Exceeded from " + alertTotalDiesel
					}
				};
				alertTripAdvLog(req, reference_no, oDelta);
			}
		}

		for (let oAdvance of aAdvances) {
			let oDeltaLog = {};
			if (oAdvance.advanceType == 'Happay') {
				let alertHappayAmt = 50000;
				let totalHappayAmt = oAdvance.amount;
				if (totalHappayAmt > alertHappayAmt) {
					oDeltaLog = {
						"Success": {
							count: totalHappayAmt,
							status: "Success",
							message: "Total Happay Exceeded from " + alertHappayAmt
						}
					};
					alertTripAdvLog(req, oAdvance.reference_no, oDeltaLog);
				}
			} else if (oAdvance.advanceType == 'Driver Cash') {
				let alertDriverCashAmt = 50000;
				let totalDriverCashAmt = oAdvance.amount;
				if (totalDriverCashAmt > alertDriverCashAmt) {
					oDeltaLog = {
						"Success": {
							count: totalDriverCashAmt,
							status: "Success",
							message: "Total Driver Cash Amount Exceeded from " + alertDriverCashAmt
						}
					};
					alertTripAdvLog(req, oAdvance.reference_no, oDeltaLog);
				}
			} else if (oAdvance.advanceType == 'Fastag') {
				let alertFastTagAmt = 3000;
				let totalFastTagAmt = oAdvance.amount;
				if (totalFastTagAmt > alertFastTagAmt) {
					oDeltaLog = {
						"Success": {
							count: totalFastTagAmt,
							status: "Success",
							message: "Total Fastag Exceeded from " + alertFastTagAmt
						}
					};
					alertTripAdvLog(req, oAdvance.reference_no, oDeltaLog);
				}
				// END
			}
		}


		return res.status(200).json({
			status: 'OK',
			message: 'Advance Updated Successfully',
		});

	} catch (err) {
		return res.status(500).json({
			status: 'ERROR',
			message: err.toString()
		})
	}
});

router.post('/deleteMulti/:refNo', async (req, res, next) => {
	try {

		let reference_no = req.params.refNo;

		let aFoundAdvances = await TripAdvance.find({reference_no: reference_no, clientId: req.user.clientId})
			.populate({
				path: 'branch', select: {name: 1}
			}).populate({
				path: 'created_by',
				select: {full_name: 1}
			}).populate({
				path: 'from_account', select: {name: 1}
			}).populate({
				path: 'to_account', select: {name: 1}
			}).populate({
				path: 'trip', select: {advSettled: 1}
			}).populate({
				path: 'driver', select: {name: 1, prim_contact_no: 1}
			}).populate({
				path: 'vendor', select: {name: 1}
			}).populate({
				path: 'vehicle', select: {segment_type: 1, ownershipType: 1}
			}).lean();
		let stationaryId = aFoundAdvances[0].stationaryId;

		aFoundAdvances.forEach(o => {
			if (o.voucher)
				throw new Error('Some or All Advances are imported in A/c.');

			if (o.purchaseBill)
				throw new Error('Cannot delete because, Purchase Bill is generated.');
		});

		let foundTrip;
		let trip = aFoundAdvances[0].trip;

		if (trip) {
			foundTrip = await Trip.findOne({_id: trip, clientId: req.user.clientId}, {trip_no: 1}).lean();
		}

		if (foundTrip && foundTrip.advSettled && foundTrip.advSettled.isCompletelySettled)
			throw new Error(`Trip Advance Cannot be added. Because Trip no ${foundTrip.trip_no} is Completely Settled`);

		if (foundTrip && foundTrip.markSettle && foundTrip.markSettle.isSettled)
			throw new Error(`Trip Advance Cannot be added. Because Trip no ${foundTrip.trip_no} is Marked Settled`);

		let aDeletedAdv = [];
		for (let oSavedAdvances of aFoundAdvances) {
			await TripAdvance.deleteOne({
				_id: oSavedAdvances._id
			});
			aDeletedAdv.push(oSavedAdvances._id);

			await logsService.add2('tripadvances', {
				uif: oSavedAdvances.reference_no,
				docDate: oSavedAdvances.date,
				category: 'delete',
				nData: {},
				oData: oSavedAdvances,
			}, req);
		}


		let stationaryStatus;

		if (req.body.disableStationery)
			stationaryStatus = 'disable';
		else
			stationaryStatus = 'cancelled';


		if (stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'tripadvances',
				docId: aFoundAdvances[0]._id,
				stationaryId,
			}, stationaryStatus);
		}

		if (trip) {
			await Trip.findOneAndUpdate(
				{
					_id: otherUtil.arrString2ObjectId(trip)
				},
				{
					$pull: {
						advanceBudget: {$in: aFoundAdvances.map(o => o._id)}
					}
				}
			);
		}

		return res.status(200).json({
			status: 'OK',
			message: 'Advance Deleted Successfully',
		});

	} catch (err) {
		return res.status(500).json({
			status: 'ERROR',
			message: err.toString()
		})
	}
});

router.post('/createVouchers', async (req, res, next) => {
	let aAdvances = [], aggQuery;
	if (req.body.advances && (req.body.advances instanceof Array)) {
		aggQuery = [
			{
				$match: {
					voucher: {$exists: false},
					clientId: req.user.clientId,
					_id: {$in: otherUtil.arrString2ObjectId(req.body.advances)},
					advanceType: {$in: ['Happay', 'Fastag', 'Driver Cash', 'Diesel', 'M.OIL']},
				}
			},
			{$lookup: {from: 'accounts', localField: 'from_account', foreignField: '_id', as: 'from_account'}},
			{$unwind: {path: '$from_account', preserveNullAndEmptyArrays: true}},
			{$lookup: {from: 'accounts', localField: 'to_account', foreignField: '_id', as: 'to_account'}},
			{$unwind: {path: '$to_account', preserveNullAndEmptyArrays: true}},
		];
		let oQuery = {aggQuery: aggQuery, no_of_docs: 4000};
		aAdvances = await serverSidePage.requestData(TripAdvance, oQuery);
	} else if (req.body.reqQuery) {
		if (!req.body.reqQuery.from || !req.body.reqQuery.to) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'from date or  to date not provided !'
			});
		}

		if (!req.body.reqQuery.advanceType) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Advance type is mandatory !'
			})
		} else {
			for (let a = 0; a < req.body.reqQuery.advanceType.length; a++) {
				if (['Happay', 'Fastag', 'Driver Cash', 'Diesel'].indexOf(req.body.reqQuery.advanceType[a]) == -1) {
					return res.status(500).json({
						status: 'ERROR',
						message: 'please select advance type from Happay, Fastag, Driver Cash or Diesel'
					})
				}
			}
		}

		let oFilter = constructFilters(req.body.reqQuery);
		oFilter.clientId = req.user.clientId;
		aggQuery = [
			{$match: oFilter},
			{$lookup: {from: 'accounts', localField: 'from_account', foreignField: '_id', as: 'from_account'}},
			{$unwind: {path: '$from_account', preserveNullAndEmptyArrays: true}},
			{$lookup: {from: 'accounts', localField: 'to_account', foreignField: '_id', as: 'to_account'}},
			{$unwind: {path: '$to_account', preserveNullAndEmptyArrays: true}},
			{$limit: 3000}
		];
		let oQuery = {aggQuery: aggQuery};
		aAdvances = await serverSidePage.requestData(TripAdvance, oQuery);
	} else {
		return res.status(500).json({
			status: 'ERROR',
			message: 'filters not provided properly !'
		})
	}

	if (!aAdvances || !aAdvances[0]) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Advances not found by selected filters or selected advances are vendor advance related!'
		});
	}

	// fetching all multi advances same refNo
	let multiAdv = new Set();
	aAdvances.reduce((aIndex, oAdv, index) => {
		if (oAdv.multiAdv) {
			multiAdv.add(oAdv.reference_no);
			aIndex.push(index);
		}
		return aIndex;
	}, []).forEach(index => aAdvances.splice(index, 1));
	aAdvances.push(...(await TripAdvance
		.find({reference_no: [...multiAdv], clientId: req.user.clientId})
		.populate({
			path: 'from_account', select: {name: 1}
		})
		.populate({
			path: 'to_account', select: {name: 1}
		})));

	let checkDupRef = new Set();
	for (let oAdvance of aAdvances) {
		checkDupRef.add(oAdvance.reference_no);
		if (oAdvance.amount === 0) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Advance does not have amount for reference no ' + oAdvance.reference_no
			})
		}
		if (oAdvance.voucher) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Voucher already generated for reference no ' + oAdvance.reference_no
			})
		}
		if (!oAdvance.to_account) {
			return res.status(500).json({
				status: 'ERROR',
				message: `to account not exist on advance ${oAdvance.vehicle_no}-${oAdvance.date}-${oAdvance.reference_no}`
			})
		}
		if (!oAdvance.from_account) {
			return res.status(500).json({
				status: 'ERROR',
				message: `from account not exist on advance ${oAdvance.vehicle_no}-${oAdvance.date}-${oAdvance.reference_no}`
			})
		}
	}

	let q = {refNos: [...checkDupRef], clientId: req.user.clientId, deleted: false, no_of_docs: 10};
	let refVExist = await VoucherServiceV2.findVoucherByQueryAsync(q, {refNo: 1});

	if (refVExist && refVExist.length) {
		let strRef = "";
		for (let r = 0; r < refVExist.length; r++) {
			strRef = strRef + "  " + refVExist[r].refNo;
		}
		telegram.sendMessage("Ref no already exist in account. " + strRef + " " + config.serverName, req.user.full_name);
		return res.status(500).json({
			status: 'OK',
			message: "Ref no already exist in account." + strRef
		});
	}

	//group by refno in case of multi advances same refNo
	let _oAdvances = {};
	aAdvances.forEach(o => {
		let oAdv;
		if ((oAdv = _oAdvances[o.reference_no])) {
			oAdv.multiAdvances = oAdv.multiAdvances || [];
			oAdv.multiAdvances.push(o);
		} else {
			_oAdvances[o.reference_no] = o;
		}
	});

	aAdvances = Object.values(_oAdvances);

	res.status(200).json({
		status: 'OK',
		message: aAdvances.length + '  vouchers are importing please wait for sometime.'
	});
	console.log(aAdvances.length + " trip adv vch create ", req.user.full_name);
	//telegram.sendMessage(aAdvances.length + " Trip adv Voucher import request for " + config.serverName, req.user.full_name);
	importAdvances(req, aAdvances);
});

async function importAdvances(req, aAdvances) {
	let vCr = 0, vCrFailed = "", v1, v2;
	for (let oAdvance of aAdvances) {
		oAdvance.vendorPayment = oAdvance.vendorPayment || {};
		let prepareVoucherData = {
			isRev: false,
			clientId: req.user.clientId,
			vT: oAdvance.advanceType,
			refNo: oAdvance.reference_no,
			stationaryId: oAdvance.stationaryId,
			isEditable: false,
			narration: (oAdvance.narration || '').concat("  ", (oAdvance.remark || '')),
			date: oAdvance.date || oAdvance.created_at || new Date(),
			branch: oAdvance.branch,
			createdBy: req.user.full_name,
			bSer: oAdvance.bSer || "Transportation",
			acImp: {
				st: true,
				by: req.user.full_name,
				at: new Date()
			},
			ledgers: [],
		};
		if (oAdvance.vehicle_no && oAdvance.vehicle_no.trim) {
			v1 = stateReducer(oAdvance.vehicle_no);
			v2 = stateReducer(oAdvance.to_account_name || oAdvance.to_account.name);
			let laName = true;
			try {
				laName = req.clientConfig.config.account.laName;
			} catch (e) {
				laName = true;
			}
			if (laName && v1 != v2) {
				oAdvance.laName = v1;
			}
		}

		if (oAdvance.multiAdv) {
			prepareVoucherData.type = 'Journal';
			prepareVoucherData.vT = 'Multi Advance';
			let aLedger = [];

			aLedger.push({
				account: oAdvance.to_account._id || oAdvance.to_account,
				lName: oAdvance.to_account_name || oAdvance.to_account.name,
				laName: oAdvance.laName,
				amount: oAdvance.amount,
				cRdR: 'DR',
				bills: [{
					billNo: oAdvance.reference_no,
					billingType: oAdvance.billType || 'New Ref',
					amount: oAdvance.amount

				}]
			});

			setCostCenter(aLedger, oAdvance);

			aLedger.push({
				account: oAdvance.from_account._id || oAdvance.from_account,
				lName: oAdvance.from_account_name || oAdvance.from_account.name,
				amount: oAdvance.amount,
				cRdR: 'CR',
				bills: [{
					billNo: oAdvance.reference_no,
					billingType: oAdvance.billType || 'New Ref',
					amount: oAdvance.amount

				}]
			});

			oAdvance.multiAdvances.forEach(oAdv => {
				let oLedger = {
					account: oAdv.to_account._id || oAdv.to_account,
					lName: oAdv.to_account_name || oAdv.to_account.name,
					laName: oAdv.laName,
					amount: oAdv.amount,
					cRdR: 'DR',
					bills: [{
						billNo: oAdv.reference_no,
						billingType: oAdv.billType || 'New Ref',
						amount: oAdv.amount

					}]
				};

				setCostCenter([oLedger], oAdv);

				aLedger.push(
					oLedger,
					{
						account: oAdv.from_account._id || oAdv.from_account,
						lName: oAdv.from_account_name || oAdv.from_account.name,
						amount: oAdv.amount,
						cRdR: 'CR',
						bills: [{
							billNo: oAdv.reference_no,
							billingType: oAdv.billType || 'New Ref',
							amount: oAdv.amount

						}]
					});
			});

			prepareVoucherData.ledgers.push(...aLedger.reduce((arr, oLed) => {
				let fd;
				if ((fd = arr.find(o => o.account.toString() === oLed.account.toString() && o.cRdR === oLed.cRdR))) {
					fd.amount += oLed.amount;
					fd.bills[0].amount += oLed.amount;
				} else
					arr.push(oLed);
				return arr;
			}, []));

		} else {
			if (oAdvance.advanceType === 'Diesel') {
				prepareVoucherData.type = 'Journal';
				prepareVoucherData.ledgers.push({
					account: oAdvance.to_account._id || oAdvance.to_account,
					lName: oAdvance.to_account_name || oAdvance.to_account.name,
					laName: oAdvance.laName,
					amount: oAdvance.amount,
					cRdR: 'DR',
					bills: [{
						billNo: oAdvance.reference_no,
						billingType: oAdvance.billType || 'New Ref',
						amount: oAdvance.amount

					}]
				});

				setCostCenter(prepareVoucherData.ledgers, oAdvance);

				prepareVoucherData.ledgers.push({
					account: oAdvance.from_account._id || oAdvance.from_account,
					lName: oAdvance.from_account_name || oAdvance.from_account.name,
					amount: oAdvance.amount,
					cRdR: 'CR',
					bills: [{
						billNo: oAdvance.reference_no,
						billingType: oAdvance.billType || 'New Ref',
						amount: oAdvance.amount
					}]
				});
			} else if (oAdvance.amount < 0) {
				prepareVoucherData.type = 'Receipt';
				oAdvance.amount = Math.abs(oAdvance.amount);
				prepareVoucherData.ledgers.push({
					account: oAdvance.from_account._id || oAdvance.from_account,
					lName: oAdvance.from_account_name || oAdvance.from_account.name,
					amount: oAdvance.amount,
					cRdR: 'DR'
				});

				setCostCenter(prepareVoucherData.ledgers, oAdvance);

				prepareVoucherData.ledgers.push({
						account: oAdvance.to_account._id || oAdvance.to_account,
						lName: oAdvance.to_account_name || oAdvance.to_account.name,
						laName: oAdvance.laName,
						amount: oAdvance.amount,
						cRdR: 'CR',
						bills: [{
							billNo: oAdvance.reference_no,
							billingType: oAdvance.billType || 'New Ref',
							amount: oAdvance.amount

						}]
					}
				);

			} else if (oAdvance.amount > 0) {
				prepareVoucherData.type = 'Payment';
				prepareVoucherData.ledgers.push({
					account: oAdvance.to_account._id || oAdvance.to_account,
					lName: oAdvance.to_account_name || oAdvance.to_account.name,
					laName: oAdvance.laName,
					amount: oAdvance.amount,
					cRdR: 'DR',
					bills: [{
						billNo: oAdvance.reference_no,
						billingType: oAdvance.billType || 'New Ref',
						amount: oAdvance.amount

					}]
				});

				setCostCenter(prepareVoucherData.ledgers, oAdvance);

				prepareVoucherData.ledgers.push({
					account: oAdvance.from_account._id || oAdvance.from_account,
					lName: oAdvance.from_account_name || oAdvance.from_account.name,
					amount: oAdvance.amount,
					cRdR: 'CR'
				});

			} else {
				prepareVoucherData.type = 'Journal';
				prepareVoucherData.ledgers.push({
					account: oAdvance.to_account._id || oAdvance.to_account,
					lName: oAdvance.to_account_name || oAdvance.to_account.name,
					laName: oAdvance.laName,
					amount: oAdvance.amount,
					cRdR: 'DR',
					bills: [{
						billNo: oAdvance.reference_no,
						billingType: oAdvance.billType || 'New Ref',
						amount: oAdvance.amount

					}]
				});

				setCostCenter(prepareVoucherData.ledgers, oAdvance);

				prepareVoucherData.ledgers.push({
					account: oAdvance.from_account._id || oAdvance.from_account,
					lName: oAdvance.from_account_name || oAdvance.from_account.name,
					amount: oAdvance.amount,
					cRdR: 'CR',
					bills: [{
						billNo: oAdvance.reference_no,
						billingType: oAdvance.billType || 'New Ref',
						amount: oAdvance.amount

					}]
				});
			}
		}

		let type = prepareVoucherData.type;

		try {
			type = req.clientConfig.config.tripAdv.vType;
		} catch (e) {
			type = prepareVoucherData.type;
		}

		if (type)
			prepareVoucherData.type = type;

		try {
			prepareVoucherData.reversed = false;
			prepareVoucherData.acImp = {
				st: true,
				by: req.user.full_name,
				at: new Date()
			};
			prepareVoucherData.his = [{
				by: req.user.full_name,
				at: new Date(),
				cat: 'AC import'
			}];
			let expenseVoucher = await VoucherServiceV2.addVoucherAsync(prepareVoucherData);
			if (expenseVoucher && expenseVoucher[0] && expenseVoucher[0].voucher && expenseVoucher[0].voucher._id) {
				let acVch = await VoucherServiceV2.adjustDailyBal(expenseVoucher[0].voucher);

				await TripAdvance.update({
					clientId: oAdvance.clientId,
					reference_no: oAdvance.reference_no
				}, {
					$set: {
						voucher: expenseVoucher[0].voucher._id,
						reversed: false
					}
				}, {
					multi: !!oAdvance.multiAdv
				});
				vCr++;
			} else {
				vCrFailed = vCrFailed + oAdvance.reference_no + ","
			}
		} catch (e) {
			let m = 'trip adv import failed ' + e.toString();
			winston.error(m);
			errorLogger.voucherExport(JSON.stringify({req, error: e}));
			telegram.sendMessage(m + " " + config.serverName, req.user.full_name);
		}
	}
	let failedCount = aAdvances.length - vCr;
	let msg = vCr + ' Trip advances are  imported in accounts ';
	if (failedCount > 0) {
		msg = msg + failedCount + " failed references are " + vCrFailed;
	}
	console.log(msg, new Date().toLocaleString());
	telegram.sendMessage(msg + " " + config.serverName, req.user.full_name);
	try {
		// Write Log...
		let oDelta = {};
		if (failedCount > 0) {

			oDelta = {
				"Success": {
					count: vCr,
					status: "Success",
					message: msg
				},
				"Fail": {
					count: failedCount,
					status: "Fail",
					message: msg
				}
			}
		} else {
			oDelta = {
				"Success": {
					count: vCr,
					status: "Success",
					message: msg
				}
			}
		}

		logsService.addLog('TripAdvances', {
			uif: "Advance-Import-" + new Date().toLocaleString(),
			docId: req.user._id,
			category: 'Notification',
			delta: oDelta
		}, req);

	} catch (e) {
		console.log(e);
	}

	function setCostCenter(ledger, oAdvance){
		if (req.clientConfig.config && req.clientConfig.config.costCenter && req.clientConfig.config.costCenter.show)
			ledger[0].costCategory = [{
				category: oAdvance.ccVehicle && oAdvance.ccVehicle.category,
				center: [{
					name: oAdvance.ccVehicle && oAdvance.ccVehicle.name,
					amount: oAdvance.amount
				}]
			}, {
				category: oAdvance.ccBranch && oAdvance.ccBranch.category,
				center: [{
					name: oAdvance.ccBranch && oAdvance.ccBranch.name,
					amount: oAdvance.amount
				}]
			}];
	}
}

router.post('/checkAdvCrDr', async (req, res, next) => {
	let aAdvances = [], aggQuery;
	if (req.body.advances && (req.body.advances instanceof Array)) {
		aggQuery = [
			{
				$match: {
					clientId: req.user.clientId,
					_id: {$in: otherUtil.arrString2ObjectId(req.body.advances)},
					advanceType: {$in: ['Happay', 'Fastag', 'Driver Cash', 'Diesel']}
				}
			},
			{
				$group: {
					_id: null,
					cr: {"$sum": {"$cond": [{"$lt": ['$amount', 0]}, "$amount", 0]}},
					dr: {"$sum": {"$cond": [{"$gt": ['$amount', 0]}, "$amount", 0]}}
				}
			}
		];
		let oQuery = {aggQuery: aggQuery, no_of_docs: 5000};
		aAdvances = await serverSidePage.requestData(TripAdvance, oQuery);
	} else if (req.body.reqQuery) {
		if (!req.body.reqQuery.from || !req.body.reqQuery.to) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'from date or  to date not provided !'
			});
		}
		if (moment(req.body.reqQuery.to).diff(req.body.reqQuery.from, 'days', true) > 184) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'more 6 months CR DR  check not allowed !'
			})
		}

		if (!req.body.reqQuery.advanceType) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Advance type is mandatory !'
			})
		} else {
			for (let a = 0; a < req.body.reqQuery.advanceType.length; a++) {
				if (['Happay', 'Fastag', 'Driver Cash', 'Diesel'].indexOf(req.body.reqQuery.advanceType[a]) == -1) {
					return res.status(500).json({
						status: 'ERROR',
						message: 'please select advance type from Happay, Fastag, Driver Cash or Diesel'
					})
				}
			}
		}

		let oFilter = constructFilters(req.body.reqQuery);
		oFilter.clientId = req.user.clientId;
		aggQuery = [
			{$match: oFilter},
			{$limit: 5000},
			{
				$group: {
					_id: null,
					cr: {"$sum": {"$cond": [{"$lt": ['$amount', 0]}, "$amount", 0]}},
					dr: {"$sum": {"$cond": [{"$gt": ['$amount', 0]}, "$amount", 0]}}
				}
			}
		];
		let oQuery = {aggQuery: aggQuery};
		aAdvances = await serverSidePage.requestData(TripAdvance, oQuery);
	} else {
		return res.status(500).json({
			status: 'ERROR',
			message: 'filters not provided properly !'
		})
	}

	if (!aAdvances || !aAdvances[0]) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Advances not found by selected filters or selected advances are vendor advance related!'
		})
	}

	let cr = 0, dr = 0;
	/*
	for (let oAdvance of aAdvances) {
		if (oAdvance.amount > 0) {
			dr = dr + oAdvance.amount;
		} else {
			cr = cr + oAdvance.amount;
		}
	}
	 */
	if (aAdvances && aAdvances[0]) {
		cr = aAdvances[0].cr;
		dr = aAdvances[0].dr;
	}
	return res.status(200).json({
		status: 'OK',
		message: 'Summary of Trip advances',
		data: {
			cr,
			dr
		}
	});
});

router.post('/upload', upload.single('advancesExcel'), async (req, res, next) => {
	try {
		if (!(req.clientData.accountDetails && req.clientData.accountDetails.fastagMaster)) {
			return next(new Error('Add fastagMaster account in client collection'));
		}
		if (global.TRIP_ADVANCES_UPLOADING) {
			//return next(new Error('Advances upload already in progress. Try after some time.'));
		}
		global.TRIP_ADVANCES_UPLOADING = true;
		const excelData = new ExcelReader({
			filePath: req.file.path,
			inject: {
				clientId: req.user.clientId,
				uploaded_at: new Date(),
				createdBy: req.user.full_name,
				created_by: req.user._id,
			},
			config: {
				'ADVANCE TYPE': {
					keyName: 'advanceType',
					required: true,
					enum: ['Happay', 'Fastag', 'Driver Cash', 'Diesel']
				},
				'ADVANCE DATE': {
					keyName: 'date',
					// required: true,
					dateFormat: 'DD/MM/YYYY',
					ignoreHours: true,
				},
				'VEHICLE NO': {
					keyName: 'vehicle_no',
					required: true,
					stateReducer: function (vehRegNo) {
						let dig4 = '';
						let remainingChars = vehRegNo.trim().replace(/^\d{4}/, function (replacedStr) {
							dig4 = replacedStr || '';
							return '';
						});
						return remainingChars + dig4;
					},
				},
				'REMARK': {
					keyName: 'remark',
					required: true,
				},
				'AMOUNT': {
					keyName: 'amount',
					// required: true,
				},
				'BRANCH ACCOUNT': {
					keyName: 'cashPump',
					ignoreIfValueIs: 'NA',
				},
				'BRANCH': {
					keyName: 'branch',
					required: true,
				},
				'HAPPAY ACCOUNT': {
					keyName: '__happay__',
					ignoreIfValueIs: 'NA',
				},
				'BILL NO': {
					keyName: 'bill_no',
					// required: true,
					ignoreIfValueIs: 'NA',
				},
				'REFERENCE NO': {
					keyName: 'reference_no',
					required: false,
					ignoreIfValueIs: 'NA',
				},
				'DIESEL VENDOR': {
					keyName: 'dieseInfo.vendor',
					ignoreIfValueIs: 'NA',
				},
				'STATUS': {
					keyName: 'status',
					ignoreIfValueIs: 'NA',
				},
				'DIESEL RATE': {
					keyName: 'dieseInfo.rate',
					ignoreIfValueIs: ['NA', '-'],
				},
				'DIESEL LITRE': {
					keyName: 'dieseInfo.litre',
					ignoreIfValueIs: ['NA', '-'],
				},
			},
		});
		let partialAdvances = await excelData.read();
		if(partialAdvances[0] && partialAdvances[0].status && partialAdvances[0].status === 'Diesel Request'){
			for(const d of partialAdvances){
				let fromDate = d.date ? new Date(d.date) : new Date();
				fromDate.setHours(0);
				fromDate.setMinutes(0);
				fromDate.setSeconds(0);
				fromDate.setMilliseconds(0);
				let toDate = d.date ? new Date(d.date) : new Date();
				toDate.setHours(23);
				toDate.setMinutes(59);
				toDate.setSeconds(59);
				toDate.setMilliseconds(999);
				let tripAdvance = await TripAdvance.findOne({
					clientId: req.user.clientId,
					advanceType : "Diesel",
					status : "Diesel Request",
					vehicle_no : d.vehicle_no,
					"dieseInfo.litre": d.dieseInfo.litre,
					"dieseInfo._vendorName": d.dieseInfo.vendor,
					"date":{$gte:fromDate,$lte:toDate}
				},{date:1});
				if(tripAdvance){
					return res.status(500).json({
						status: 'OK',
						message: `Duplicate advance found for vehicle No ${d.vehicle_no}`
					});
				}
			}
			let autoRef = req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.autoRef;
			let billBOOK = await  BillBook.findOne({_id:mongoose.Types.ObjectId(autoRef)},{format:1,current:1});
			if(!billBOOK){
				return res.status(500).json({
					status: 'OK',
					message: "Please Bill book add in config"
				});
			}
			let num = billBOOK.current;
			for(const d of partialAdvances){
				if(!d.date){
					let advanceDate = new Date();
					advanceDate.setHours(0);
					advanceDate.setMinutes(0);
					advanceDate.setSeconds(0);
					advanceDate.setMilliseconds(0);
					d.date = advanceDate;
				}
				d.reference_no = await billBookService.genBookNoOfAuto(billBOOK.format, num);
				num++;
				let billBOOKUpdate = await  BillBook.update({_id:mongoose.Types.ObjectId(autoRef)},{$set:{current:num}});
			}
		}
		if(req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.fastagAndHappyref){
			const st3 = new Date().toISOString();
			const st4 = (st3.slice(2,4));   //year
			const st5 = (st3.slice(5,7));    //month
			const st6 = (st3.slice(8,10));    //date
			let happy = await TripAdvance.findOne({clientId: req.user.clientId, reference_no: (new RegExp("H" + st4 + st5 + st6))}, {reference_no: 1}).sort({reference_no: -1}).limit(1);  ////generate Ref
			let fastTag = await TripAdvance.findOne({clientId: req.user.clientId, reference_no: (new RegExp("F" + st4 + st5 + st6))}, {reference_no: 1}).sort({reference_no: -1}).limit(1);  ////generate Ref
			let happyRef = happy && happy.reference_no;
			let fastagRef = fastTag && fastTag.reference_no;
			for(const d of partialAdvances){
				if((d.advanceType === "Happay") || (d.advanceType === "Fastag") ){
					let str5;
					if (d.advanceType === "Happay" ? happyRef : fastagRef) {
						const str0 = d.advanceType === "Happay"  ? happyRef.toString().slice(5,7) :  fastagRef.toString().slice(5,7);
						const st1 = new Date().toISOString();
						const st2 = (st1.slice(8,10));
						const st = d.advanceType === "Happay"  ? happyRef.toString().slice(7,13) : fastagRef.toString().slice(7,13);
						if (st2 === str0) {
							str5 = st;
						}
						else {
							str5 = "0000";
						}
					}
					else {
						str5 = "0000";
					}
					let str1 = d.advanceType === "Happay" ? "H" : "F";
					let str = new Date().toISOString();
					const str2 = (str.slice(2, 4));
					const str3 = (str.slice(5, 7));
					const str4 = (str.slice(8, 10));
					let a = parseInt(str5);
					a++;
					const str8 = a.toString();
					const len1 = str8.length;
					const str9 = (str5.slice(0, 4 - len1));
					const str10 = str9.concat(str8);
					const RefData = str1.concat(str2, str3, str4, str10);
					d.reference_no = RefData;
					if(d.advanceType === "Happay"){
						happyRef = RefData
					}else{
						fastagRef = RefData
					}

				}
			}
		}
		if(partialAdvances.length > 100){
			let str = partialAdvances.length + ' advances request is being processed. Please wait until all advances are uploaded. Please status check in csv in log.  Thank you!';
			res.status(200).json({
				status: 'OK',
				message: str
			});
		}
		let {stats, completeAdvances} = await tripAdvService.completePartials({
			clientId: req.user.clientId,
			createdBy: req.user.full_name,
			happayMaster: req.clientData.accountDetails.happayMaster,
			fastagMaster: req.clientData.accountDetails.fastagMaster,
			branchTransactionMaster: req.clientData.accountDetails.branchTransactionMaster,
			partialAdvances,
			req
		});
		let aRefs = [];
		let refMap = {};
		let length = completeAdvances.length;
		for (let a = 0; a < completeAdvances.length; a++) {
            if(!completeAdvances[a]) continue;
			let costAcc;
			try {
				costAcc = req.clientConfig.config && req.clientConfig.config.costCenter;
				costAcc = costAcc || {};
				if (completeAdvances[a].vehicle_no && req.clientConfig.config.costCenter && req.clientConfig.config.costCenter.show)

					switch (completeAdvances[a].advanceType) {
						case 'Driver Cash':
							costAcc = {
								_id: costAcc.drAcc && costAcc.drAcc._id,
								name: costAcc.drAcc && costAcc.drAcc.name
							};
							break;
						case 'Diesel':
							costAcc = {
								_id: costAcc.dlAcc && costAcc.dlAcc._id,
								name: costAcc.dlAcc && costAcc.dlAcc.name
							};
							break;
						case 'Fastag':
							costAcc = {
								_id: costAcc.ftAcc && costAcc.ftAcc._id,
								name: costAcc.ftAcc && costAcc.ftAcc.name
							};
							break;
						case 'Happay':
							costAcc = {
								_id: costAcc.hpAcc && costAcc.hpAcc._id,
								name: costAcc.hpAcc && costAcc.hpAcc.name
							};
							break;
					}
				if (costAcc._id && costAcc.name) {
					completeAdvances[a].to_account = costAcc._id;
					completeAdvances[a].to_account_name = costAcc.name;
					completeAdvances[a].person = costAcc.name;
				}

			} catch (e) {
				costAcc = {};
			}

			if(completeAdvances[a] && completeAdvances[a].amount &&  !Number(completeAdvances[a].amount)){
				stats.push({
					"ADVANCE DATE": completeAdvances[a].date,
					"ADVANCE TYPE": completeAdvances[a].advanceType,
					"REFERENCE NO": completeAdvances[a].reference_no,
					"STATUS": "FAIL",
					"REJECTION REASON": " Amount Should be number",
				});
				break;
			}
			if(req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.zeroNotAllow){
				if(completeAdvances[a] && completeAdvances[a].amount === 0){
					stats.push({
						"ADVANCE DATE": completeAdvances[a].date,
						"ADVANCE TYPE": completeAdvances[a].advanceType,
						"REFERENCE NO": completeAdvances[a].reference_no,
						"STATUS": "FAIL",
						"REJECTION REASON": " Amount Can not  be Zero",
					});
					break;
				}
			}
			if(req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.ZeroAndMinusNotAllow){
				if(completeAdvances[a] && completeAdvances[a].amount < 1){
					stats.push({
						"ADVANCE DATE": completeAdvances[a].date,
						"ADVANCE TYPE": completeAdvances[a].advanceType,
						"REFERENCE NO": completeAdvances[a].reference_no,
						"STATUS": "FAIL",
						"REJECTION REASON": " Amount can not be zero or minus",
					});
					break;
				}
			}
			if(completeAdvances[a] && completeAdvances[a].date)
			{
				var today = new Date();
				let checkdate = completeAdvances[a].date;
				checkdate = moment(checkdate, 'DD/MM/YYYY').hours(0).minutes(0).seconds(0).milliseconds(0).toDate();
				let minDate = moment('01/01/2017', 'DD/MM/YYYY').hours(0).minutes(0).seconds(0).milliseconds(0).toDate();

				if (checkdate < minDate)
				{
					stats.push({
						"ADVANCE DATE": completeAdvances[a].date,
						"ADVANCE TYPE": completeAdvances[a].advanceType,
						"REFERENCE NO": completeAdvances[a].reference_no,
						"STATUS": "FAIL",
						"REJECTION REASON": "Date should be not less than  01/01/2017",
					});
					break;
				}

			}

			if (completeAdvances[a] && completeAdvances[a].branch) 	{
				const oBranch = await Branch.findOne({
					name: completeAdvances[a].branch,
					clientId: req.user.clientId
				}, {_id: 1}).lean();
				if (oBranch){
					completeAdvances[a].branch = oBranch._id;
				}else{
					console.error('branch not found');
					stats.push({
						"ADVANCE DATE": completeAdvances[a].date,
						"ADVANCE TYPE": completeAdvances[a].advanceType,
						"REFERENCE NO": completeAdvances[a].reference_no,
						"STATUS": "FAIL",
						"REJECTION REASON": completeAdvances[a].branch + " branch not found" ,
					});
					break;
				}

				if(req.clientConfig.config && req.clientConfig.config.costCenter && req.clientConfig.config.costCenter.show){
					let costCenter = await costCategoryCenterService.findCenter({
						branch: oBranch._id,
						feature: completeAdvances[a].advanceType,
						projection: {_id: 1, name: 1, category: "$category.name"},
					}, req);

					if(costCenter.length)
						completeAdvances[a].ccBranch = costCenter[0];

					if(!completeAdvances[a].ccBranch){
						stats.push({
							"ADVANCE DATE": completeAdvances[a].date,
							"ADVANCE TYPE": completeAdvances[a].advanceType,
							"REFERENCE NO": completeAdvances[a].reference_no,
							"STATUS": "FAIL",
							"REJECTION REASON": " Cost Center not linked on branch",
						});
						break;
					}
				}
			}else if(req.clientConfig.config && req.clientConfig.config.costCenter && req.clientConfig.config.costCenter.show){
				stats.push({
					"ADVANCE DATE": completeAdvances[a].date,
					"ADVANCE TYPE": completeAdvances[a].advanceType,
					"REFERENCE NO": completeAdvances[a].reference_no,
					"STATUS": "FAIL",
					"REJECTION REASON": "Branch cost center is Mandatory",
				});
				break;
			}
/*
//already handled in service part where we populate vehicle
			if (completeAdvances[a] && completeAdvances[a].vehicle_no) {
				const oVehicle = await RegisteredVehicle.findOne({
					vehicle_reg_no: completeAdvances[a].vehicle_no,
					clientId: req.user.clientId
				}, {_id: 1, costCenter: 1, driver_name: 1, driver_employee_code: 1}).lean();
				if (oVehicle)
					completeAdvances[a].ccVehicle = oVehicle.costCenter;
				if (req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.driverDetails) {
					completeAdvances[a].person = oVehicle.driver_name;
					completeAdvances[a].driverCode = oVehicle.driver_employee_code;
				}
			}
			*/
			if (completeAdvances[a] && completeAdvances[a].reference_no) {
				aRefs.push(completeAdvances[a].reference_no);
				if (refMap[completeAdvances[a].reference_no]) {
					stats.push({
						"ADVANCE DATE": completeAdvances[a].date,
						"ADVANCE TYPE": completeAdvances[a].advanceType,
						"REFERENCE NO": completeAdvances[a].reference_no,
						"STATUS": "FAIL",
						"REJECTION REASON": "Duplicate ref no in excel " + completeAdvances[a].reference_no,
					});
					break;
				} else {
					refMap[completeAdvances[a].reference_no] = completeAdvances[a];
				}

				// auto narration
				let oDeltaLog = {};
				if (completeAdvances[a].advanceType === 'Driver Cash') {
					completeAdvances[a].remark = 'Being Cash Paid' + '; vehicleNo: ' + completeAdvances[a].vehicle_no + '; ' + completeAdvances[a].remark;
					/*if(completeAdvances[a].amount>50000){
						oDeltaLog = {"Success": {
								count: completeAdvances[a].amount,status: "Success",message: "Totol Driver Cash Amount Exceeded from 50000"
							}
						};
						alertTripAdvLog(req, req.body.reference_no, oDeltaLog);
					}*/
				} else if (completeAdvances[a].advanceType === 'Happay' || completeAdvances[a].advanceType === 'Fastag') {
					completeAdvances[a].remark = 'vehicleNo: ' + completeAdvances[a].vehicle_no + '; ' + completeAdvances[a].remark;

					// if(completeAdvances[a].advanceType=='Happay'){
					// 	if(completeAdvances[a].amount>50000){
					// 		oDeltaLog = {"Success": {
					// 				count: completeAdvances[a].amount,status: "Success",message: "Totol Happay Exceeded from 50000"
					// 			}
					// 		};
					// 		alertTripAdvLog(req, completeAdvances[a].reference_no, oDeltaLog);
					// 	}
					// }
					//
					// if(completeAdvances[a].advanceType=='Fastag'){
					// 	if(completeAdvances[a].amount>3000){
					// 		oDeltaLog = {"Success": {
					// 				count: completeAdvances[a].amount,status: "Success",message: "Totol Fastag Exceeded from 3000"
					// 			}
					// 		};
					// 		alertTripAdvLog(req, completeAdvances[a].reference_no, oDeltaLog);
					// 	}
					// 	// END
					// }

				} else if (completeAdvances[a].advanceType === 'Diesel') {
					completeAdvances[a].remark = completeAdvances[a].dieseInfo.litre + ' lit@ ' + completeAdvances[a].dieseInfo.rate + '; vehicleNo: ' + completeAdvances[a].vehicle_no + '; ' + completeAdvances[a].remark;
					// Alert..
					// if(completeAdvances[a].dieseInfo.litre>950) {
					// 	oDeltaLog = {
					// 		"Success": {
					// 			count: completeAdvances[a].dieseInfo.litre,
					// 			status: "Success",
					// 			message: "Totol Diesel Ltr Exceeded from 950"
					// 		}
					// 	};
					// 	alertTripAdvLog(req, completeAdvances[a].reference_no, oDeltaLog);
					// }
					// Alert end for diesel ltr

					let maxAllowedAmount = req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.maxDieselAmt || constant.maxDieselAmount;

					if (completeAdvances[a].amount > maxAllowedAmount) {
						stats.push({
							"ADVANCE DATE": completeAdvances[a].date,
							"ADVANCE TYPE": completeAdvances[a].advanceType,
							"REFERENCE NO": completeAdvances[a].reference_no,
							"STATUS": "FAIL",
							"REJECTION REASON": `Limit boundation Diesel amount cannot be greater than ${maxAllowedAmount} in ` + completeAdvances[a].reference_no,
						});
						break;
					}
				}

				let reqStationary = false, stationaryId;
				if (req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.advType)
					reqStationary = req.clientConfig.config.tripAdv.advType.indexOf(completeAdvances[a].advanceType) != -1;

				if (reqStationary) {
					if ((stationaryId = await BillStationary.findOne({
						clientId: req.user.clientId,
						bookNo: completeAdvances[a].reference_no,
						status: {$in: ['unused', 'cancelled']}
					}, {_id: 1})))
						completeAdvances[a].stationaryId = stationaryId._id;
					else {
						completeAdvances[a].stationaryId = undefined;
						stats.push({
							"ADVANCE DATE": completeAdvances[a].date,
							"ADVANCE TYPE": completeAdvances[a].advanceType,
							"REFERENCE NO": completeAdvances[a].reference_no,
							"STATUS": "FAIL",
							"REJECTION REASON": "ref No not found in billBook"
						});
						break;
					}
				}
			}
		}
		let refExist = await TripAdvance.aggregate([{
			$match: {reference_no: {$in: aRefs}, clientId: req.user.clientId}
		}, {$project: {date:1, advanceType: 1, reference_no: 1, vehicle_no: 1, editable: 1, linkable: 1}}]);
		let vehChange = false;
		let nonEditable = false;
		let nonLinkable = false;
		if (refExist && refExist.length) {
			global.TRIP_ADVANCES_UPLOADING = false;
			let strRef = "";
			for (let r = 0; r < refExist.length; r++) {
				stats.push({
					"ADVANCE DATE": refExist[r].date,
					"ADVANCE TYPE": refExist[r].advanceType,
					"REFERENCE NO": refExist[r].reference_no,
					"VEHICLE NO": refExist[r].vehicle_no,
					"STATUS": "FAIL",
					"REJECTION REASON": "Reference no already exists"
				});
				strRef = strRef + "  " + refExist[r].reference_no;
				let index = completeAdvances.findIndex(item => item.reference_no == refExist[r].reference_no);
				completeAdvances.splice(index,1);
			}
			// return res.status(200).json({
			// 	status: 'OK',
			// 	message: "Reference no already exists " + strRef,
			// 	stats
			// });
			/*

			if (!stats) stats = [];
			for (let r = 0; r < refExist.length; r++) {
				if (refMap[refExist[r].reference_no] && refMap[refExist[r].reference_no].vehicle_no != refExist[r].vehicle_no) {
					stats.push({
						"REFERENCE NO": refExist[r].reference_no,
						"VEHICLE NO": refExist[r].vehicle_no,
						"STATUS": "FAIL",
						"REJECTION REASON": "Reference no already exists and has differnet vehicle"
					});
					strRef = strRef + "  " + refExist[r].reference_no;
					vehChange = true;
				}

				if (refExist[r].editable == false) {
					stats.push({
						"REFERENCE NO": refExist[r].reference_no,
						"VEHICLE NO": refExist[r].vehicle_no,
						"STATUS": "FAIL",
						"REJECTION REASON": "This advance is not editable check contra entry"
					});
					strRef = strRef + "  " + refExist[r].reference_no;
					nonEditable = true;
				}

				if (refExist[r].linkable == false) {
					stats.push({
						"REFERENCE NO": refExist[r].reference_no,
						"VEHICLE NO": refExist[r].vehicle_no,
						"STATUS": "PASS",
						"REJECTION REASON": "This advance is not linkable on trip check contra entry"
					});
					strRef = strRef + "  " + refExist[r].reference_no;
					nonLinkable = true;
					delete refExist[r].trip;
					delete refExist[r].trip_no;
				}
			}
			if (vehChange) {
				global.TRIP_ADVANCES_UPLOADING = false;
				return res.status(200).json({
					status: 'OK',
					message: "Reference no already exists and has differnet vehicle please check in downloaded CSV " + strRef,
					stats
				});
				telegram.sendMessage("Ref No already used " + strRef + " " + config.serverName, req.user.full_name);
			}
			if (nonEditable) {
				global.TRIP_ADVANCES_UPLOADING = false;
				return res.status(200).json({
					status: 'OK',
					message: "Reference no not editable.Contra entry exists.Please check in downloaded CSV " + strRef,
					stats
				});
				telegram.sendMessage("Reference no not editable.Contra entry exists " + strRef + " " + config.serverName, req.user.full_name);
			}
			*/
		}
		let q = {refNos: aRefs, clientId: req.user.clientId, deleted: false, no_of_docs: 2000};
		let refVExist = await VoucherServiceV2.findVoucherByQueryAsync(q, {refNo: 1});
		if (refVExist && refVExist.length) {
			let strRef = "";
			if (!stats) stats = [];
			for (let r = 0; r < refVExist.length; r++) {
				stats.push({
					"REFERENCE NO": refVExist[r].refNo,
					"STATUS": "FAIL",
					"REJECTION REASON": "ref No  in account already used"
				});
				strRef = strRef + "  " + refVExist[r].refNo;
				let index = completeAdvances.findIndex(item => item.reference_no == refVExist[r].refNo);
				completeAdvances.splice(index,1);
			}
			global.TRIP_ADVANCES_UPLOADING = false;
			// return res.status(200).json({
			// 	status: 'OK',
			// 	message: "Ref No already used please check in downloaded CSV " + strRef,
			// 	stats
			// });
			telegram.sendMessage("Ref No already used in accounts " + strRef + " " + config.serverName, req.user.full_name);
		}
		let completeAdvancesTemp = [], advanceTypeStop, advanceStatus ;
		for (let a = 0; a < completeAdvances.length; a++) {
			if (req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.tripSusnotAllow) {
				if (completeAdvances[a] && completeAdvances[a].vehicle_no) {
					const oVehicle = await RegisteredVehicle.findOne({
						vehicle_reg_no: completeAdvances[a].vehicle_no,
						clientId: req.user.clientId
					}, {_id: 1, last_known: 1, status: 1}).lean();
					if (oVehicle && oVehicle.last_known && oVehicle.last_known.trip){
                        let trip =  await Trip.find({_id: oVehicle.last_known.trip}, {
							trip_no: 1,
							_id: 1,
							advSettled: 1,
							markSettle:1,
							start_date:1,
							end_date:1
						}).lean();
						if (trip && trip.length > 0) {
							trip = trip[trip.length - 1];
							if (trip.advSettled && trip.advSettled.isCompletelySettled) {
								stats.push({
									'ADVANCE DATE': moment(completeAdvances[a].date).format("DD-MM-YYYY"),
									'ADVANCE TYPE': completeAdvances[a].advanceType,
									'VEHICLE NO': completeAdvances[a].vehicle_no,
									'REFERENCE NO': completeAdvances[a].reference_no,
									"STATUS": "FAIL",
									"REJECTION REASON": "Trip is already completely settled"
								});
							}
							if (trip.markSettle && trip.markSettle.isSettled) {
								stats.push({
									'ADVANCE DATE': moment(completeAdvances[a].date).format("DD-MM-YYYY"),
									'ADVANCE TYPE': completeAdvances[a].advanceType,
									'VEHICLE NO': completeAdvances[a].vehicle_no,
									'REFERENCE NO': completeAdvances[a].reference_no,
									"STATUS": "FAIL",
									"REJECTION REASON": "Trip is already mark settled"
								});
							}
							let date = new Date(completeAdvances[a].date);
							date.setHours(23,59,59,999);
							let tripWithDate = await Trip.findOne({
								vehicle:oVehicle._id ,
								start_date: {$lte: new Date(date)},
								$or: [{end_date: {$exists: false}}, {end_date: {$gte: new Date(date)}}]
							},{
								trip_no: 1,
								_id: 1,
								advSettled: 1,
								markSettle:1,
								start_date:1,
								end_date:1,
							}).lean();
							if(tripWithDate){
								if (tripWithDate.advSettled && tripWithDate.advSettled.isCompletelySettled) {
									stats.push({
										'ADVANCE DATE': moment(completeAdvances[a].date).format("DD-MM-YYYY"),
										'ADVANCE TYPE': completeAdvances[a].advanceType,
										'VEHICLE NO': completeAdvances[a].vehicle_no,
										'REFERENCE NO': completeAdvances[a].reference_no,
										"STATUS": "FAIL",
										"REJECTION REASON": "Trip is already completely settled"
									});
								}
								if (tripWithDate.markSettle && tripWithDate.markSettle.isSettled) {
									stats.push({
										'ADVANCE DATE': moment(completeAdvances[a].date).format("DD-MM-YYYY"),
										'ADVANCE TYPE': completeAdvances[a].advanceType,
										'VEHICLE NO': completeAdvances[a].vehicle_no,
										'REFERENCE NO': completeAdvances[a].reference_no,
										"STATUS": "FAIL",
										"REJECTION REASON": "Trip is already mark settled"
									});
								}
							}
							if(!tripWithDate && new Date(completeAdvances[a].date) < new Date(trip.start_date)){
								stats.push({
									'ADVANCE DATE': moment(completeAdvances[a].date).format("DD-MM-YYYY"),
									'ADVANCE TYPE': completeAdvances[a].advanceType,
									'VEHICLE NO': completeAdvances[a].vehicle_no,
									'REFERENCE NO': completeAdvances[a].reference_no,
									"STATUS": "FAIL",
									"REJECTION REASON": "Trip is not exist in this date"
								});
							}
							else {
								advanceTypeStop = completeAdvances[a].advanceType;
								advanceStatus= completeAdvances[a].status;
								completeAdvancesTemp.push(completeAdvances[a]);
							}
						}
						else{
							stats.push({
								'ADVANCE DATE': moment(completeAdvances[a].date).format("DD-MM-YYYY"),
								'ADVANCE TYPE': completeAdvances[a].advanceType,
								'VEHICLE NO': completeAdvances[a].vehicle_no,
								'REFERENCE NO': completeAdvances[a].reference_no,
								"STATUS": "FAIL",
								"REJECTION REASON": "Trip is not linked"
							});
						}
					}else{
						stats.push({
							'ADVANCE DATE': moment(completeAdvances[a].date).format("DD-MM-YYYY"),
							'ADVANCE TYPE': completeAdvances[a].advanceType,
							'VEHICLE NO': completeAdvances[a].vehicle_no,
							'REFERENCE NO': completeAdvances[a].reference_no,
							"STATUS": "FAIL",
							"REJECTION REASON": "Trip is not linked"
						});
					}
				}
			}
			else if (!completeAdvances[a] || !completeAdvances[a].to_account || !completeAdvances[a].from_account || refVExist.indexOf(completeAdvances[a].reference_no) >= 0) {
				//skip vch
				console.log(completeAdvances[a] && completeAdvances[a].reference_no);
			}else if ((req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.advType && req.clientConfig.config.tripAdv.advType.indexOf(completeAdvances[a].advanceType) != -1 && !completeAdvances[a].stationaryId)) {
				console.log(completeAdvances[a] && completeAdvances[a].reference_no);
			}
			else {
				advanceTypeStop = completeAdvances[a].advanceType;
				advanceStatus = completeAdvances[a].status;
				completeAdvancesTemp.push(completeAdvances[a]);
			}
		}
		let rejectCnt = 0;
		let msg;
		if (length - completeAdvancesTemp.length) {
			msg = (length - completeAdvancesTemp.length) + " rejected ,  ";
			rejectCnt = length - completeAdvancesTemp.length;
		}
		completeAdvances = completeAdvancesTemp;
		msg = partialAdvances.length + ' advances request is being processed. Please wait until all advances are uploaded. Please check status in csv log.  Thank you!';
		if(partialAdvances.length < 101){
			res.status(200).json({
				status: 'OK',
				message: msg,
				stats
			});
		}
		console.log(msg, new Date().toLocaleString());
		telegram.sendMessage(completeAdvances.length + " Trip adv upload request " + config.serverName, req.user.full_name);

		let advCopy = _.cloneDeep(completeAdvances);

		let tripAdvUp = completeAdvances.map(adv => {
			if (!adv) return null;
			adv.__advId = adv._id;
			delete adv._id;
			return {
				updateOne: {
					filter: {
						clientId: adv.clientId,
						reference_no: adv.reference_no
					},
					update: {
						$setOnInsert: {_id: adv.__advId, created_at: new Date()},
						$set: adv,
					},
					upsert: true
				}
			}
		}).filter(x => x !== null);
		let tripUpdateOp
		if((req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.automap) || (req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.tripSusnotAllow)){
			tripUpdateOp = advCopy.map(adv => {
				if (!adv) return null;
				if (!adv.trip) return null;
				return {
					updateOne: {
						filter: {_id: adv.trip},
						update: {$addToSet: {'advanceBudget': adv._id}},
						upsert: true
					}
				}
			}).filter(a => a !== null);
		}
		let aBatchSize = 30;
		if (tripAdvUp.length > aBatchSize) {
			let nC = parseInt(tripAdvUp.length / aBatchSize);
			console.log("no of itr", nC);
			for (let b = 0; b <= nC; b++) {
				let nArray = tripAdvUp.slice(b * aBatchSize, (b + 1) * aBatchSize);
				if (nArray.length) {
					await TripAdvance.bulkWrite(nArray, {ordered: false});
				}
				console.log("batch", b);
				//telegram.sendMessage(nArray.length + " Adv uploaded in batch " + config.serverName , req.user.full_name);
			}
		} else if (tripAdvUp.length) {
			let tT = await TripAdvance.bulkWrite(tripAdvUp, {ordered: false});
		}
		global.TRIP_ADVANCES_UPLOADING = false;
		telegram.sendMessage(tripAdvUp.length + " Adv uploaded  " + config.serverName, req.user.full_name);
		if((req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.automap) || (req && req.clientConfig && req.clientConfig.config && req.clientConfig.config.tripAdv && req.clientConfig.config.tripAdv.tripSusnotAllow)){
			if (tripUpdateOp.length > aBatchSize) {
				let nM = parseInt(tripUpdateOp.length / aBatchSize);
				console.log("no of itr T", nM);
				for (let m = 0; m <= nM; m++) {
					let kArray = tripUpdateOp.slice(m * aBatchSize, (m + 1) * aBatchSize);
					if (kArray.length) {
						await Trip.bulkWrite(kArray, {ordered: false});
					}
					console.log("trip batch", m);
					//telegram.sendMessage("Adv mapped trip " + kArray.length + " " + config.serverName , new Date().toLocaleString());
				}
			} else if (tripUpdateOp.length) {
				let aT = await Trip.bulkWrite(tripUpdateOp, {ordered: false});
			}
			console.log("Adv mapped trip " + tripUpdateOp.length);

			telegram.sendMessage("Adv mapped trip " + tripUpdateOp.length + " " + config.serverName, new Date().toLocaleString());
		}

		try {
			let header = ["ADVANCE DATE", "ADVANCE TYPE", "REFERENCE NO", "VEHICLE NO", "STATUS", "REJECTION REASON"];
			const filePath = `${req.user.clientId}/Advance Upload`;
			const fileName = 'Advance_Upload_Error_Report';
            mkdirp.sync(`${DIR}/${filePath}`);
            const path = `${DIR}/${filePath}/${fileName}.csv`;


			// mkdirp.sync(`${DIR}/${filePath}`);
			// const path = `${DIR}/${filePath}`;
			// let fPath = `${req.user.clientId}/Advance Upload/Advance_Upload_Error_Report.csv`;
			const csvWriter = fs.createWriteStream(path);
			csvWriter.write(header.join(',') + '\n');
			let downloadPath;

			if(stats.length) {

				// csvWriter.write(header1.join(',') + '\n');

				stats.forEach(row => {
					csvWriter.write(header.map(col => row[col]).join(',') + '\n');
				});
				downloadPath = 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port') + '/reports/' + filePath + '/' + fileName + '.csv';
				// downloadPath = 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port') + '/reports/' + fPath ;

			}
			csvWriter.end();
			if(stats.length > 0){
				logsService.addLog('TripAdvances', {
					uif: "Advance_" + moment().format('DD-MM-YYYY hh:mm'),
					docId: req.user._id,
					category: 'Notification',
					delta: [],
					dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
					userId: req.user._id,
					subCategory: 'TripAdvances'
				}, req);
			}else{
				// Write Log...
				let oDelta = {};
				if (rejectCnt == 0) {
					oDelta = {
						"Success": {
							count: completeAdvances.length,
							status: "Success",
							message: "All Records Uploaded Successfully."
						}
					}
				} else if (rejectCnt > 0) {

					oDelta = {
						"Success": {
							count: completeAdvances.length,
							status: "Success",
							message: "Records Uploaded Successfully."
						},
						"Fail": {
							count: rejectCnt,
							status: "Fail",
							message: "Fail Recound found."
						}
					}
				}

				logsService.addLog('TripAdvances', {
					uif: "Advance-" + new Date().toLocaleString(),
					docId: req.user._id,
					category: 'Notification',
					delta: oDelta
				}, req);
				// END Log
			}


		} catch (e) {
			console.log(e);
		}
		if (advanceTypeStop != 'Happay' && advanceTypeStop != 'Fastag' && advanceStatus != 'Diesel Request') {
			importAdvances(req, completeAdvances);
		}
	} catch (e) {
		console.error('upload advance error', e.toString());
		telegram.sendMessage("Error Trip advance upload " + config.serverName + " " + e.toString(), req.user.full_name);
		// Write Log...


		logsService.addLog('TripAdvances', {
			uif: "Advance-" + new Date().toLocaleString(),
			docId: req.user._id,
			category: 'Notification',
			delta: {
				"Fail": {
					count: 0,
					status: "Fail",
					message: e.toString()
				}
			}
		}, req);
		// END Log

		global.TRIP_ADVANCES_UPLOADING = false;
		if (!res.headersSent) {
			return res.status(500).json({
				status: 'ERROR',
				message: e.toString(),
				error: e.toString()
			});
		}
	}
});

router.post('/reMapTrip', async (req, res, next) => {
	try {

		if (!(req.clientData.accountDetails && req.clientData.accountDetails.fastagMaster)) {
			return res.status(200).json({
				status: 'ERROR',
				message: 'Add fastagMaster account in client collection'
			});
		}

		const partialAdvances = await TripAdvance.find({
			_id: {$in: req.body._id},
			// isCancelled: { $not: { $eq: true } },
			linkable: {
				$ne: false
			},
			trip: {$exists: false},
		}, {to_account_list: false}).lean();

		const {stats, completeAdvances} = await tripAdvService.completePartials({
			isReMap: true,
			trip: req.body.trip,
			clientId: req.user.clientId,
			happayMaster: req.clientData.accountDetails.happayMaster,
			fastagMaster: req.clientData.accountDetails.fastagMaster,
			branchTransactionMaster: req.clientData.accountDetails.branchTransactionMaster,
			partialAdvances,
			req
		});

		if (stats.length) {
			res.status(500).json({
				status: 'Error',
				message: 'Please refer CSV for errors',
				stats
			});
		} else {
			res.status(200).json({
				status: 'OK',
				message: 'Remap success',
			});
		}

		let advCopy = _.cloneDeep(completeAdvances);

		if (completeAdvances.length) {
			var tripAdvStats = await TripAdvance.bulkWrite(completeAdvances.map(adv => {
				adv.__advId = adv._id;
				delete adv._id;
				return {
					updateOne: {
						filter: {_id: adv.__advId},
						update: {$set: adv},
						upsert: false
					}
				}
			}));
		}

		const tripUpdateOp = advCopy.map(adv => {
			if (!adv.trip) {
				return null;
			}
			return {
				updateOne: {
					filter: {_id: adv.trip},
					update: {$addToSet: {'advanceBudget': adv._id}},
					upsert: true
				}
			}
		}).filter(a => a !== null);

		if (tripUpdateOp.length > 0) {
			const tripStats = await Trip.bulkWrite(tripUpdateOp);
		}

	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
			error: e.toString()
		});
	}
});

router.post('/unMapAdv', async function (req, res, next) {

	try {

		if (!(req.body.advance && req.body.advance.length))
			throw new Error('Mandatory fields are required');

		for (var i = 0; i < req.body.advance.length; i++) {

			let advanceId = req.body.advance[i] || false;

			if (advanceId) {

				let foundAdv = await TripAdvance.findOne({_id: otherUtil.arrString2ObjectId(advanceId._id)});

				if (foundAdv && foundAdv._id) {

					let tripId = foundAdv.trip;

					let foundTrip = await Trip.findOne({_id: otherUtil.arrString2ObjectId(tripId)});

					if (!foundTrip)
						throw new Error('trip not found on selected advance');

					if (foundTrip && foundTrip.advSettled && foundTrip.advSettled.isCompletelySettled)
						throw new Error('can not unMap!!! trip CompletelySettle ');

					let updateTrip = await Trip.updateOne({_id: otherUtil.arrString2ObjectId(tripId)}, {
						$pull: {
							advanceBudget: advanceId._id
						}
					});

					if (foundTrip) {
						await Trip.update(
							{
								_id: foundTrip._id
							},
							{
								$push: {
									'suspenseRemark': req.body.suspenseRemark
								}
							}
						);
					}

					if (updateTrip && updateTrip.nModified === 1) {
						try {
							let data = await TripAdvance.updateOne({_id: foundAdv._id}, {
								$push: {
									unmapHistory: {
										// user_id: req.user._id,
										user_name: req.user.full_name,
										date: new Date(),
										trip_no: foundAdv.trip_no,
										suspenseRemark: req.body.suspenseRemark
									}
								},
								$set: {
									removedTrip: true
								},
								$unset: {
									trip: 1,
									trip_no: 1
								}
							});

						} catch (err) {
							return res.status(500).json({
								"status": "ERROR",
								"message": err.message
							});
						}


					} else {
						return res.status(500).json({
							status: 'ERROR',
							message: 'No Trip or Advance found',
						});
					}

				} else {
					return res.status(500).json({
						status: 'ERROR',
						message: 'No Advnace Found',
					});
				}

			} else {
				return res.status(500).json({
					status: 'ERROR',
					message: 'Advance is Mandatory',
				});
			}
		}

		return res.status(200).json({
			status: 'SUCCESS',
			message: 'Advance Successfully Unmaped',
		});

	} catch (e) {
		console.log(e);
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
			error: 'Something went wrong'
		});
	}

});

router.post('/download', async (req, res, next) => {
	try {
		if (!req.body.from || !req.body.to) {
			return res.status(500).json({
				status: 'OK',
				message: 'Please provide from date and to date'
			});
		}
		let hasTimeoutExecuted = false;
		let timer = setTimeout(() => {
			hasTimeoutExecuted = true;
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}, 1000 * 20);

		let oMatch = Object.assign(req.body, {clientId: req.user.clientId});
		let oConstrct = constructFilters(oMatch);
		if (req.query.downloadType === 'issues') {
			oConstrct.$or = [
				{from_account: {$not: {$exists: true}}},
				{from_account: null},
				{to_account: {$not: {$exists: true}}},
				{to_account: null},
			];
		}
		let oAggrPipe = [
			{
				$match: oConstrct
			}];
		let oMarkSettle = {};
		if (req.body.download && (req.body.download == 'unsettledTripAdvance')) {
			if (req.body.segment_type)
				oMarkSettle['trip.segment_type'] = req.body.segment_type;
			if (req.body.ownershipType)
				oMarkSettle['trip.ownershipType'] = req.body.ownershipType;
			if (req.body.tripType) {
				if (req.body.tripType == 'onTrip')
					oMarkSettle['trip.trip_no'] = {$exists: true};
				else if (req.body.tripType == 'withoutTrip') {
					oMarkSettle['trip.trip_no'] = {$exists: false};
				}
			}
		}

		if (req.body['advSettled']) {
			if (req.body['advSettled'] == 'Settle')
				oMarkSettle["trip.advSettled.tsNo"] = {$exists: true};
			else
				oMarkSettle["trip.advSettled.tsNo"] = {$exists: false};
		}

		if (req.body.sR >= 0) {
			if (req.body.sR == 1) {
				req.body.sR = 0;
			}
			oAggrPipe.push({$skip: parseInt(req.body.sR)});
		}
		if (req.body.eR) {
			oAggrPipe.push({$limit: parseInt(parseInt(req.body.eR) - parseInt(req.body.sR || 0))});
		}
		/*
		if (req.body.sort === 'date') {
			oAggrPipe.push({$sort: {date: -1}});
		}
		 */
		oAggrPipe.push({$sort: {date: -1}});
		req.body.batchSize = 10000;
		if (Object.keys(oMarkSettle).length == 0) {
			req.body.countQuery = [{$match: oConstrct}];
			oAggrPipe.push({$skip: 0});
			//oAggrPipe.push({$limit:req.body.batchSize});
		}
		oAggrPipe.push(
			{
				$lookup: {
					from: 'tripv2',
					localField: 'trip',
					foreignField: '_id',
					as: 'trip'
				}
			},
			{
				$unwind: {
					path: '$trip',
					preserveNullAndEmptyArrays: true
				}
			});
		if (Object.keys(oMarkSettle).length) {
			oAggrPipe.push({$match: oMarkSettle});
			req.body.countQuery = Array.from(oAggrPipe);
			oAggrPipe.push({$skip: 0});
			//oAggrPipe.push({$limit:req.body.batchSize});
		}
		oAggrPipe.push(
			// {
			// 	$lookup: {
			// 		from: 'accountvouchers',
			// 		localField: 'voucher',
			// 		foreignField: '_id',
			// 		as: 'voucher'
			// 	}
			// },
			// {
			// 	$unwind: {
			// 		path: '$voucher',
			// 		preserveNullAndEmptyArrays: true
			// 	}
			// },
			// {
			// 	$lookup: {
			// 		from: 'accounts',
			// 		localField: 'voucher.from',
			// 		foreignField: '_id',
			// 		as: 'voucher.from'
			// 	}
			// },
			// {
			// 	$unwind: {
			// 		path: '$voucher.from',
			// 		preserveNullAndEmptyArrays: true
			// 	}
			// },
			// {
			// 	$lookup: {
			// 		from: 'accounts',
			// 		localField: 'voucher.to',
			// 		foreignField: '_id',
			// 		as: 'voucher.to'
			// 	}
			// },
			// {
			// 	$unwind: {
			// 		path: '$voucher.to',
			// 		preserveNullAndEmptyArrays: true
			// 	}
			// },
			{
				$lookup: {
					from: 'accounts',
					localField: 'from_account',
					foreignField: '_id',
					as: 'from_account'
				}
			},
			{
				$unwind: {
					path: '$from_account',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'to_account',
					foreignField: '_id',
					as: 'to_account'
				}
			},
			{
				$unwind: {
					path: '$to_account',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'drivers',
					localField: 'driver',
					foreignField: '_id',
					as: 'driver'
				}
			},
			{
				$unwind: {
					path: '$driver',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'vendortransports',
					localField: 'vendor',
					foreignField: '_id',
					as: 'vendor'
				}
			},
			{
				$unwind: {
					path: '$vendor',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				"$lookup": {
					"from": "registeredvehicles",
					"localField": "vehicle",
					"foreignField": "_id",
					"as": "vehicle"
				}
			},
			{
				"$unwind": {
					"path": "$vehicle",
					"preserveNullAndEmptyArrays": true
				}
			},
			// {
			// 	"$lookup": {
			// 		"from": "users",
			// 		"localField": "created_by",
			// 		"foreignField": "_id",
			// 		"as": "userName"
			// 	}
			// },
			// {
			// 	"$unwind": {
			// 		"path": "$userName",
			// 		"preserveNullAndEmptyArrays": true
			// 	}
			// },
			{
				"$lookup": {
					"from": "branches",
					"localField": "branch",
					"foreignField": "_id",
					"as": "branch"
				}
			},
			{
				"$unwind": {
					"path": "$branch",
					"preserveNullAndEmptyArrays": true
				}
			}
		);
		let project;
		if (req.query.downloadType === 'tally-xml') {
			//TODO check xml file for vouchers
		} else {
			project = {
				date: 1,
				advanceType: 1,
				trip_no: 1,
				vehicle_no: 1,
				'from_account.name': 1,
				reference_no: 1,
				bill_no: 1,
				person: 1,
				amount: 1,
				'to_account.name': 1,
				dieseInfo: 1,
				'driver.name': 1,
				'driver.prim_contact_n': 1,
				'vendor.name': 1,
				remark: 1,
				'vehicle.segment_type': 1,
				'vehicle.ownershipType': 1,
				"vehicle.owner_name": 1,
				"vehicle.owner_group": 1,
				'trip.advSettled': 1,
				'userName.full_name': 1,
				created_at: 1,
				createdBy: 1,
				last_modified_at: 1,
				last_modified_by_name: 1,
				uploaded_at: 1,
				narration: 1,
				"branch.name": 1,
				"aExtraCharges": 1
			};
			oAggrPipe.push({$project: project});
			oAggrPipe.push({
				"$addFields": {
					"ExtraCharges": {
						$reduce: {
							input: '$aExtraCharges',
							initialValue: {Adavnce : 0, Dala: 0, GatePass:0,Kanta:0,Panni:0,AccountSalary:0,Service:0,Unloading :0,
								Repairing :0, Commission :0,
							},
							in: {
								Adavnce:{
									$add: [
										"$$value.Adavnce",
										{ $cond: [
												{ $eq: [ "$$this.amtType", "Advance" ] },
												{ $ifNull: ["$$this.amtTypeAmount", 0] },
												0
											] }
									]
								},
								Dala:{
									$add: [
										"$$value.Dala",
										{ $cond: [
												{ $or: [
														{ $eq: [ "$$this.amtType", "Dala" ] },
														// 	{ $eq: [ "$$this.amtType", "Gate Pass" ] },

													] },
												{ $ifNull: ["$$this.amtTypeAmount", 0] },
												0
											] }
									]
								},
								GatePass:{
									$add: [
										"$$value.GatePass",
										{ $cond: [
												{ $eq: [ "$$this.amtType", "Gate Pass" ] },

												{ $ifNull: ["$$this.amtTypeAmount", 0] },
												0
											] }
									]
								},
								Kanta:{
									$add: [
										"$$value.Kanta",
										{ $cond: [
												{ $eq: [ "$$this.amtType", "Kanta" ] },

												{ $ifNull: ["$$this.amtTypeAmount", 0] },
												0
											] }
									]
								},

								Panni:{
									$add: [
										"$$value.Panni",
										{ $cond: [
												{ $eq: [ "$$this.amtType", "Panni" ] },

												{ $ifNull: ["$$this.amtTypeAmount", 0] },
												0
											] }
									]
								},
								AccountSalary:{
									$add: [
										"$$value.AccountSalary",
										{ $cond: [
												{ $eq: [ "$$this.amtType", "Account Salary" ] },

												{ $ifNull: ["$$this.amtTypeAmount", 0] },
												0
											] }
									]
								},
								Service:{
									$add: [
										"$$value.Service",
										{ $cond: [
												{ $eq: [ "$$this.amtType", "Service" ] },

												{ $ifNull: ["$$this.amtTypeAmount", 0] },
												0
											] }
									]
								},
								Unloading:{
									$add: [
										"$$value.Unloading",
										{ $cond: [
												{ $eq: [ "$$this.amtType", "Unloading" ] },

												{ $ifNull: ["$$this.amtTypeAmount", 0] },
												0
											] }
									]
								},
								Repairing:{
									$add: [
										"$$value.Repairing",
										{ $cond: [
												{ $eq: [ "$$this.amtType", "Repairing" ] },

												{ $ifNull: ["$$this.amtTypeAmount", 0] },
												0
											] }
									]
								},
								Commission:{
									$add: [
										"$$value.Commission",
										{ $cond: [
												{ $eq: [ "$$this.amtType", "Commission" ] },

												{ $ifNull: ["$$this.amtTypeAmount", 0] },
												0
											] }
									]
								},

							},
						}
					}
				}
			})

		}
		if (req.query.downloadType === 'csv') {
			let downloadPath = await new csvDownload(TripAdvance, oAggrPipe, {
				filePath: `${req.user.clientId}/Trip_Advance`,
				fileName: `Trip_AdvanceCSV_Report_${moment().format('DD-MM-YYYY hh:mm')}`
			}).exec(tripAdvance.transform, req);

			if (hasTimeoutExecuted) {
				await logsService.addLog('Trip_Advance_Report', {
					uif: "Trip_AdvanceCSV_Report_" + moment().format('DD-MM-YYYY hh:mm'),
					docId: req.user._id,
					category: 'Notification',
					delta: [],
					dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
					userId: req.user._id,
					subCategory: 'Trip Advance Report'
				}, req);
			} else {
				clearTimeout(timer);
				return res.status(200).json({
					status: "SUCCESS",
					message: 'report download available',
					url: downloadPath
				});
			}

		} else {
			let oQuery = {aggQuery: oAggrPipe, no_of_docs: 100000};
			const aggrData = await serverSidePage.requestData(TripAdvance, oQuery);
			if (req.query.downloadType === 'tally-xml') {
				let voucherIds = {};
				let filteredAggr = aggrData.filter(x => {
					if (!x.voucher || !x.voucher._id) {
						return false;
					} else if (voucherIds[x.voucher._id.toString()]) {
						return false;
					} else {
						voucherIds[x.voucher._id.toString()] = true;
						return true;
					}
				});
				const xml = new XML({
					template: 'TripAdv',
					data: filteredAggr,
					company: req.clientConfig && req.clientConfig.config && req.clientConfig.config.tally && req.clientConfig.config.tally || {name: "Tally Company Name"}
				})
					.createJSON()
					.getXmlFromJson()
					.download()
					.then(async url => {
						if (filteredAggr.length > 0) {
							let z = await TripAdvance.updateMany({_id: {$in: filteredAggr.map(y => y._id)}}, {$set: {exportedAt: new Date()}});
						}
						return res.download('files/tally.xml', 'tally.xml');
					});
			} else {
				ReportExelService.newTripAdvRep(aggrData, req ,req.user.clientId, async function (d) {
					if (hasTimeoutExecuted) {
						await logsService.addLog('Trip_Advance_Report', {
							uif: "Trip_Advance_Report_" + moment().format('DD-MM-YYYY hh:mm'),
							docId: req.user._id,
							category: 'Notification',
							delta: [],
							dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
							userId: req.user._id,
							subCategory: 'Trip Advance Report'
						}, req);
					} else {
						clearTimeout(timer);
						return res.status(200).json({
							status: 'SUCCESS',
							message: 'Trip advances report generated',
							url: d.url,
						});
					}
				});
			}
		}

	} catch (err) {
		next(err);
	}
});

router.post('/downloadOnlyAdv', async (req, res, next) => {
	try {
		if (!req.body.from || !req.body.to) {
			return res.status(500).json({
				status: 'OK',
				message: 'Please provide from date and to date'
			});
		}
		let hasTimeoutExecuted = false;
		let timer = setTimeout(() => {
			hasTimeoutExecuted = true;
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}, 1000 * 60);

		let oMatch = Object.assign(req.body, {clientId: req.user.clientId});
		let oConstrct = constructFilters(oMatch);
		if (req.query.downloadType === 'issues') {
			oConstrct.$or = [
				{from_account: {$not: {$exists: true}}},
				{from_account: null},
				{to_account: {$not: {$exists: true}}},
				{to_account: null},
			];
		}
		if(req.body.tripType) {
			if(req.body.tripType=='onTrip')
				oConstrct['trip'] = {$exists: true};
			else if(req.body.tripType=='withoutTrip'){
				oConstrct['trip'] = {$exists: false};
			}
		}
		let oAggrPipe = [
			{
				$match: oConstrct
			}];

		let oMarkSettle = {};
		if(req.body.download && (req.body.download=='unsettledTripAdvance'))
		{
			if(req.body.segment_type)
				oMarkSettle['trip.segment_type'] = req.body.segment_type;
			if(req.body.ownershipType)
				oMarkSettle['trip.ownershipType'] = req.body.ownershipType;
			if(req.body.tripType) {
				if(req.body.tripType=='onTrip')
					oMarkSettle['trip'] = {$exists: true};
				else if(req.body.tripType=='withoutTrip'){
					oMarkSettle['trip'] = {$exists: false};
				}
			}
		}

		if (req.body['advSettled']) {
			if (req.body['advSettled'] == 'Settle')
				oMarkSettle["trip.advSettled.tsNo"] = {$exists: true};
			else
				oMarkSettle["trip.advSettled.tsNo"] = {$exists: false};
		}

		if (req.body.sR >= 0) {
			if (req.body.sR == 1) {
				req.body.sR = 0;
			}
			oAggrPipe.push({$skip: parseInt(req.body.sR)});
		}
		if (req.body.eR) {
			oAggrPipe.push({$limit: parseInt(parseInt(req.body.eR) - parseInt(req.body.sR || 0))});
		}
		/*
		if (req.body.sort === 'date') {
			oAggrPipe.push({$sort: {date: -1}});
		}
		 */
		oAggrPipe.push({$sort: {date: -1}});
		req.body.batchSize = 10000;
		if(Object.keys(oMarkSettle).length == 0){
			req.body.countQuery = [{$match: oConstrct}];
			oAggrPipe.push({$skip:0});
			//oAggrPipe.push({$limit:req.body.batchSize});
		}else{
			oAggrPipe.push(
				{
					$lookup: {
						from: 'tripv2',
						localField: 'trip',
						foreignField: '_id',
						as: 'trip'
					}
				},
				{
					$unwind: {
						path: '$trip',
						preserveNullAndEmptyArrays: true
					}
				});
		}
		if(Object.keys(oMarkSettle).length){
			oAggrPipe.push({$match: oMarkSettle});
			req.body.countQuery = Array.from(oAggrPipe);
			oAggrPipe.push({$skip:0});
			//oAggrPipe.push({$limit:req.body.batchSize});
		}
		/*
		oAggrPipe.push(
			{
				$lookup: {
					from: 'accountvouchers',
					localField: 'voucher',
					foreignField: '_id',
					as: 'voucher'
				}
			},
			{
				$unwind: {
					path: '$voucher',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'voucher.from',
					foreignField: '_id',
					as: 'voucher.from'
				}
			},
			{
				$unwind: {
					path: '$voucher.from',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'voucher.to',
					foreignField: '_id',
					as: 'voucher.to'
				}
			},
			{
				$unwind: {
					path: '$voucher.to',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'from_account',
					foreignField: '_id',
					as: 'from_account'
				}
			},
			{
				$unwind: {
					path: '$from_account',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'to_account',
					foreignField: '_id',
					as: 'to_account'
				}
			},
			{
				$unwind: {
					path: '$to_account',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'drivers',
					localField: 'driver',
					foreignField: '_id',
					as: 'driver'
				}
			},
			{
				$unwind: {
					path: '$driver',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'vendortransports',
					localField: 'vendor',
					foreignField: '_id',
					as: 'vendor'
				}
			},
			{
				$unwind: {
					path: '$vendor',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				"$lookup": {
					"from": "registeredvehicles",
					"localField": "vehicle",
					"foreignField": "_id",
					"as": "vehicle"
				}
			},
			{
				"$unwind": {
					"path": "$vehicle",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "users",
					"localField": "created_by",
					"foreignField": "_id",
					"as": "userName"
				}
			},
			{
				"$unwind": {
					"path": "$userName",
					"preserveNullAndEmptyArrays": true
				}
			}, {
				"$lookup": {
					"from": "branches",
					"localField": "branch",
					"foreignField": "_id",
					"as": "branch"
				}
			},
			{
				"$unwind": {
					"path": "$branch",
					"preserveNullAndEmptyArrays": true
				}
			}
		);
		*/
		let project;
		if (req.query.downloadType === 'tally-xml') {
			//TODO check xml file for vouchers
		}else{
			project = {date:1,advanceType:1,trip_no:1,vehicle_no:1,reference_no:1,amount:1,
				remark:1, narration:1};
			oAggrPipe.push({$project:project});
		}

		if(req.query.downloadType  === 'csv'){
			let downloadPath = await new csvDownload(TripAdvance, oAggrPipe, {
				filePath: `${req.user.clientId}/Trip_Advance`,
				fileName: `Trip_AdvanceCSV_Report_${moment().format('DD-MM-YYYY hh:mm')}`
			}).exec(tripAdvance.transformTable, req);

			if(hasTimeoutExecuted){
				await logsService.addLog('Trip_Advance_Report', {
					uif: "Trip_AdvanceCSV_Report_" + moment().format('DD-MM-YYYY hh:mm'),
					docId: req.user._id,
					category: 'Notification',
					delta: [],
					dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
					userId: req.user._id,
					subCategory: 'Trip Advance Report'
				}, req);
			}else {
				clearTimeout(timer);
				return res.status(200).json({
					status: "SUCCESS",
					message: 'report download available',
					url: downloadPath
				});
			}

		}else {
			let oQuery = {aggQuery: oAggrPipe, no_of_docs: 100000};
			const aggrData = await serverSidePage.requestData(TripAdvance, oQuery);

			if (req.query.downloadType === 'tally-xml') {
				let voucherIds = {};
				let filteredAggr = aggrData.filter(x => {
					if (!x.voucher || !x.voucher._id) {
						return false;
					} else if (voucherIds[x.voucher._id.toString()]) {
						return false;
					} else {
						voucherIds[x.voucher._id.toString()] = true;
						return true;
					}
				});
				const xml = new XML({
					template: 'TripAdv',
					data: filteredAggr,
					company: req.clientConfig && req.clientConfig.config && req.clientConfig.config.tally && req.clientConfig.config.tally || {name: "Tally Company Name"}
				})
					.createJSON()
					.getXmlFromJson()
					.download()
					.then(async url => {
						if (filteredAggr.length > 0) {
							let z = await TripAdvance.updateMany({_id: {$in: filteredAggr.map(y => y._id)}}, {$set: {exportedAt: new Date()}});
						}
						return res.download('files/tally.xml', 'tally.xml');
					});
			} else {
				ReportExelService.newTripAdvRep(aggrData, req.user.clientId, async function (d) {
					if (hasTimeoutExecuted) {
						await logsService.addLog('Trip_Advance_Report', {
							uif: "Trip_Advance_Report_" + moment().format('DD-MM-YYYY hh:mm'),
							docId: req.user._id,
							category: 'Notification',
							delta: [],
							dwnldLnk: `<a href='${d.url}' download='${d.url}' target='_blank'>Click To Download</a>`,
							userId: req.user._id,
							subCategory: 'Trip Advance Report'
						}, req);
					} else {
						clearTimeout(timer);
						return res.status(200).json({
							status: 'SUCCESS',
							message: 'Trip advances report generated',
							url: d.url,
						});
					}
				});
			}
		}

	} catch (err) {
		next(err);
	}
});

router.post('/reverse', async (req, res, next) => {
	if (!Array.isArray(req.body.ids)) {
		return res.status(200).json({
			'status': 'ERROR',
			'message': 'ids are required in body',
		});
	}
	const advs = await TripAdvance.find({
		_id: {$in: otherUtil.arrString2ObjectId(req.body.ids)},
		clientId: req.body.clientId,
		advanceType: {$in: ['Happay', 'Fastag', 'Driver Cash', 'Diesel', 'M.OIL']},
		voucher: {$ne: null}
	}).populate('voucher').lean();

	let aAdvRevIds = [];
	/*
	if (advs.length) {
		telegram.sendMessage(advs.length + " Trip adv reverse request " + config.serverName, req.user.full_name);
	}
	 */
	for (let i = 0; i < advs.length; i++) {
		try {
			if (advs[i].voucher && advs[i].voucher._id && advs[i].editable != false) {
				//let balAdj = await VoucherServiceV2.adjustDailyBalOnRevert(advs[i].voucher);
				let rmVch = await VoucherServiceV2.removeTripVoucher({
					_id: advs[i].voucher._id,
					clientId: req.body.clientId
				});
				let balAdj = await VoucherServiceV2.adjustDailyBalOnRevert(advs[i].voucher);
				aAdvRevIds.push(advs[i]._id);
			} else {
				winston.error(advs[i].voucher && advs[i].voucher.refNo + ' failed to reverse');
				telegram.sendMessage(advs[i].reference_no + " adv failed to reverse" + config.serverName, req.user.full_name);
			}
		} catch (e) {
			let ee = ' trip advance vocuher remove failed ' + advs[i].reference_no + e.message;
			winston.error(ee);
			telegram.sendMessage(ee + config.serverName, req.user.full_name);
		}
	}

	// fetching all multi advances same refNo
	let multiAdv = new Set();
	advs.forEach((oAdv) => {
		if (oAdv.multiAdv) {
			multiAdv.add(oAdv.reference_no);
		}
	});
	aAdvRevIds.push(...(await TripAdvance.find({
		reference_no: [...multiAdv],
		clientId: req.user.clientId
	}, {_id: 1})).map(o => o._id.toString()));

	if (aAdvRevIds.length > 0) {
		await TripAdvance.update(
			{_id: {$in: otherUtil.arrString2ObjectId(aAdvRevIds)}},
			{
				$set: {reversed: true},
				$unset: {voucher: true},
				$addToSet: {
					reverseHistory: {
						reversed_by: req.user.full_name,
						remark: req.body.remark || '',
						reversed_at: new Date()
					}
				}
			}, {multi: true});
	}
	//telegram.sendMessage(aAdvRevIds.length + " Trip adv reversed " + config.serverName, req.user.full_name);
	return res.status(200).json({
		'status': 'OK',
		'message': aAdvRevIds.length + ' Advances reversed',
	});
});

router.post('/portToVouchers', async function (req, res, next) {
	let aAdvances = [], aggQuery;
	if (req.body.advances && (req.body.advances instanceof Array)) {
		aggQuery = [
			{
				$match: {
					clientId: req.user.clientId,
					voucher: {$exists: true},
					pDV: {$exists: false},
					_id: {$in: otherUtil.arrString2ObjectId(req.body.advances)},
					advanceType: {$in: ['Happay', 'Fastag', 'Driver Cash', 'Diesel']}
				}
			},
			{$lookup: {from: 'vouchers', localField: 'voucher', foreignField: '_id', as: 'voucher'}},
			{$unwind: {path: '$voucher', preserveNullAndEmptyArrays: true}},
			{$lookup: {from: 'accounts', localField: 'from_account', foreignField: '_id', as: 'from_account'}},
			{$unwind: {path: '$from_account', preserveNullAndEmptyArrays: true}},
			{$lookup: {from: 'accounts', localField: 'to_account', foreignField: '_id', as: 'to_account'}},
			{$unwind: {path: '$to_account', preserveNullAndEmptyArrays: true}},
		];
		let oQuery = {aggQuery: aggQuery, no_of_docs: 10000};
		aAdvances = await serverSidePage.requestData(TripAdvance, oQuery);
	} else if (req.body.reqQuery) {
		if (!req.body.reqQuery.from || !req.body.reqQuery.to) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'from date or  to date not provided !'
			});
		}
		if (moment(req.body.reqQuery.to).diff(req.body.reqQuery.from, 'days', true) > 5) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'more than 5 days voucher creation not allowed !'
			})
		}
		if (!req.body.reqQuery.advanceType) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Advance type is mandatory !'
			})
		} else {
			for (let a = 0; a < req.body.reqQuery.advanceType.length; a++) {
				if (['Happay', 'Fastag', 'Driver Cash', 'Diesel'].indexOf(req.body.reqQuery.advanceType[a]) == -1) {
					return res.status(500).json({
						status: 'ERROR',
						message: 'please select advance type from Happay, Fastag, Driver Cash or Diesel'
					})
				}
			}
		}
		let oFilter = constructFilters(req.body.reqQuery);
		oFilter.clientId = req.user.clientId;
		oFilter.voucher = {$exists: true};
		oFilter.pDV = {$exists: false};
		aggQuery = [
			{$match: oFilter},
			{$lookup: {from: 'vouchers', localField: 'voucher', foreignField: '_id', as: 'voucher'}},
			{$unwind: {path: '$voucher', preserveNullAndEmptyArrays: true}},
			{$lookup: {from: 'accounts', localField: 'from_account', foreignField: '_id', as: 'from_account'}},
			{$unwind: {path: '$from_account', preserveNullAndEmptyArrays: true}},
			{$lookup: {from: 'accounts', localField: 'to_account', foreignField: '_id', as: 'to_account'}},
			{$unwind: {path: '$to_account', preserveNullAndEmptyArrays: true}},
		];
		let oQuery = {aggQuery: aggQuery, no_of_docs: 30000};
		aAdvances = await serverSidePage.requestData(TripAdvance, oQuery);
	} else {
		return res.status(500).json({
			status: 'ERROR',
			message: 'filters not provided properly !'
		})
	}

	if (!aAdvances || !aAdvances[0]) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Advances not found by selected filters or selected advances are vendor advance related!'
		})
	}
	for (let oAdvance of aAdvances) {
		if (oAdvance.amount === 0) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Advance does not have amount for reference no ' + oAdvance.reference_no
			})
		}
		if (!oAdvance.to_account) {
			return res.status(500).json({
				status: 'ERROR',
				message: `to account not exist on advance ${oAdvance.vehicle_no}-${oAdvance.date}-${oAdvance.reference_no}`
			})
		}
		if (!oAdvance.from_account) {
			return res.status(500).json({
				status: 'ERROR',
				message: `from account not exist on advance ${oAdvance.vehicle_no}-${oAdvance.date}-${oAdvance.reference_no}`
			})
		}
	}

	res.status(200).json({
		status: 'OK',
		message: aAdvances.length + '  vouchers are importing please wait for sometime.'
	});
	console.log(aAdvances.length + " trip adv vch create ", req.user.full_name);
	//telegram.sendMessage(aAdvances.length + " Trip adv Voucher import request for " + config.serverName, req.user.full_name);

	let vCr = 0, vCrFailed = "", v1, v2;
	for (let oAdvance of aAdvances) {
		oAdvance.vendorPayment = oAdvance.vendorPayment || {};
		let prepareVoucherData = {
			isRev: false,
			clientId: req.user.clientId,
			vT: oAdvance.advanceType,
			refNo: oAdvance.reference_no,
			stationaryId: oAdvance.stationaryId,
			isEditable: false,
			narration: oAdvance.remark || oAdvance.narration,
			date: oAdvance.date || oAdvance.created_at || new Date(),
			branch: oAdvance.branch,
			createdBy: req.user.full_name,
			bSer: oAdvance.bSer || "Transportation",
			acImp: {
				st: oAdvance.voucher ? true : false,
				by: req.user.full_name,
				at: new Date()
			},
			reversed: false,
			ledgers: [],
		};
		if (oAdvance.vehicle_no) {
			v1 = stateReducer(oAdvance.vehicle_no);
			v2 = stateReducer(oAdvance.to_account.name);
			if (v1 != v2) {
				oAdvance.laName = v1;
			}
		}
		if (oAdvance.advanceType === 'Diesel') {
			prepareVoucherData.type = 'Journal';
			prepareVoucherData.ledgers.push({
					account: oAdvance.to_account._id,
					lName: oAdvance.to_account.name,
					laName: oAdvance.laName,
					amount: oAdvance.amount,
					cRdR: 'DR',
					bills: [{
						billNo: oAdvance.bill_no || oAdvance.billNo,
						billingType: oAdvance.billType || 'New Ref',
						amount: oAdvance.amount
					}]
				},
				{
					account: oAdvance.from_account._id,
					lName: oAdvance.from_account.name,
					amount: oAdvance.amount,
					cRdR: 'CR',
					bills: [{
						billNo: oAdvance.bill_no || oAdvance.billNo,
						billingType: oAdvance.billType || 'New Ref',
						amount: oAdvance.amount

					}]
				});
		} else if (oAdvance.amount < 0) {
			prepareVoucherData.type = 'Receipt';
			oAdvance.amount = Math.abs(oAdvance.amount);
			prepareVoucherData.ledgers.push({
					account: oAdvance.from_account._id,
					lName: oAdvance.from_account.name,
					amount: oAdvance.amount,
					cRdR: 'DR'
				}, {
					account: oAdvance.to_account._id,
					lName: oAdvance.to_account.name,
					laName: oAdvance.laName,
					amount: oAdvance.amount,
					cRdR: 'CR',
					bills: [{
						billNo: oAdvance.bill_no || oAdvance.billNo,
						billingType: oAdvance.billType || 'New Ref',
						amount: oAdvance.amount
					}]
				}
			);
		} else if (oAdvance.amount > 0) {
			prepareVoucherData.type = 'Payment';
			prepareVoucherData.ledgers.push({
					account: oAdvance.to_account._id,
					lName: oAdvance.to_account.name,
					laName: oAdvance.laName,
					amount: oAdvance.amount,
					cRdR: 'DR',
					bills: [{
						billNo: oAdvance.bill_no || oAdvance.billNo,
						billingType: oAdvance.billType || 'New Ref',
						amount: oAdvance.amount

					}]
				},
				{
					account: oAdvance.from_account._id,
					lName: oAdvance.from_account.name,
					amount: oAdvance.amount,
					cRdR: 'CR'
				});

		} else {
			prepareVoucherData.type = 'Journal';
			prepareVoucherData.ledgers.push({
					account: oAdvance.to_account._id,
					lName: oAdvance.to_account.name,
					laName: oAdvance.laName,
					amount: oAdvance.amount,
					cRdR: 'DR',
					bills: [{
						billNo: oAdvance.bill_no || oAdvance.billNo,
						billingType: oAdvance.billType || 'New Ref',
						amount: oAdvance.amount

					}]
				},
				{
					account: oAdvance.from_account._id,
					lName: oAdvance.from_account.name,
					amount: oAdvance.amount,
					cRdR: 'CR',
					bills: [{
						billNo: oAdvance.bill_no || oAdvance.billNo,
						billingType: oAdvance.billType || 'New Ref',
						amount: oAdvance.amount

					}]
				});
		}
		try {
			let expenseVoucher = await VoucherServiceV2.addVoucherAsync(prepareVoucherData);
			//let acVch = await VoucherServiceV2.adjustDailyBal(expenseVoucher[0].voucher);
			let oFil = {_id: expenseVoucher[0].voucher._id};
			let oUpd = {
				$set: {
					reversed: false,
					acImp: {
						st: true,
						by: req.user.full_name,
						at: new Date()
					}
				}, $addToSet: {
					his: {
						by: req.user.full_name,
						at: new Date(),
						cat: 'AC import'
					}
				}
			};
			//let aVch = await VoucherServiceV2.updateExported(oFil,oUpd);
			if (expenseVoucher && expenseVoucher[0] && expenseVoucher[0].voucher && expenseVoucher[0].voucher._id) {
				await TripAdvance.update({_id: oAdvance._id}, {
					$set: {
						voucher: expenseVoucher[0].voucher._id,
						reversed: false,
						pDV: new Date()
					}
				});
				vCr++;
				console.log(vCr);
			} else {
				vCrFailed = vCrFailed + oAdvance.reference_no + ","
			}
		} catch (e) {
			winston.error('port trip adv error', e.toString());
		}
	}
	let failedCount = aAdvances.length - vCr;
	let msg = vCr + ' Trip advances are  imported in accounts ';
	if (failedCount > 0) {
		msg = msg + failedCount + " failed references are " + vCrFailed;
	}
	console.log(msg, new Date().toLocaleString());
	//telegram.sendMessage(msg + " " + config.serverName, req.user.full_name);
});

router.post('/tripAdvDateRpt', async (req, res, next) => {
	try {
		if (!req.body.from || !req.body.to) {
			return res.status(500).json({
				status: 'OK',
				message: 'Please provide from date and to date'
			});
		}
		let oMatch = Object.assign(req.body, {clientId: req.user.clientId});
		var oPFil = constructFilterOfAdvanceRpt(oMatch);
		const aggrQuery = [
			{$match: oPFil},
			{$sort: {_id: -1}},
			{
				$lookup: {
					from: 'accounts',
					localField: 'from_account',
					foreignField: '_id',
					as: 'from_account'
				}
			},
			{
				$unwind: {
					path: '$from_account',
					preserveNullAndEmptyArrays: true
				}
			},

			{
				$project: {
					"from_account": 1,
					"date": 1,
					"advanceType": 1,
					"amount": 1
				}
			},
			{$sort: {"from_account.name": 1}},

			{
				"$group": {
					"_id": {
						"creditAccount": "$from_account._id",
						"yearMonthDayUTC": {
							$dateToString: {
								format: "%d-%m-%Y",
								date: "$date",
								timezone: 'Asia/Kolkata'
							}
						},
					},
					"count": {$sum: 1},
					"amount": {$sum: "$amount"},
					"advanceType": {$first: '$advanceType'},
					"fromAcc": {$first: '$from_account.name'},

				}
			},
			{
				$project: {
					"_id": 1,
					"yearMonthDayUTC": "$_id.yearMonthDayUTC",
					"count": "$count",
					"amount": "$amount",
					"advanceType": 1,
					"fromAcc": 1,
				}
			},
			{$sort: {"fromAcc": 1}}


		];
		let oQuery = {aggQuery: aggrQuery, no_of_docs: 85000};
		const aggrData = await serverSidePage.requestData(TripAdvance, oQuery);
		let mergeData = {};

		if (aggrData && aggrData.length) {
			if (req.body.reportType === 'Advance Date wise amount report') {
				aggrData.forEach(oData => {
					mergeData[oData.fromAcc] = mergeData[oData.fromAcc] || {};
					mergeData[oData.fromAcc].name = oData.fromAcc;
					mergeData[oData.fromAcc].advanceType = oData.advanceType;
					// let mergeDate = moment().date(oData.day).month(oData.month - 1).year(oData.year).format('DD-MM-YYYY');
					mergeData[oData.fromAcc][oData.yearMonthDayUTC] = mergeData[oData.fromAcc][oData.yearMonthDayUTC] || 0;
					mergeData[oData.fromAcc][oData.yearMonthDayUTC] += oData.amount;
				});
			} else if (req.body.reportType === 'Advance Date wise count report') {
				aggrData.forEach(oData => {
					mergeData[oData.fromAcc] = mergeData[oData.fromAcc] || {};
					mergeData[oData.fromAcc].name = oData.fromAcc;
					mergeData[oData.fromAcc].advanceType = oData.advanceType;
					// let mergeDate = moment().date(oData.day).month(oData.month - 1).year(oData.year).format('DD-MM-YYYY');
					mergeData[oData.fromAcc][oData.yearMonthDayUTC] = mergeData[oData.fromAcc][oData.yearMonthDayUTC] || 0;
					mergeData[oData.fromAcc][oData.yearMonthDayUTC] += oData.count;
				});
			}

			ReportExelService.tripAdvDateRpt(Object.values(mergeData), req.body.reportType, req.body.start_date, req.body.end_date, req.user.clientId, function (d) {
				return res.status(200).json({
					status: 'SUCCESS',
					message: 'Trip advances report generated',
					url: d.url,
				});
			});
		} else {
			return res.status(200).json({
				status: 'No data Found',
				message: 'No Data Found',
				url: undefined,
			});
		}

	} catch (err) {
		next(err);
	}

});

router.post('/dieselTripReport', async (req, res, next) => {
	try {

		let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};
		oQuery.queryFilter = constructFilters(oQuery);

		if (req.body.all)
			oQuery.all = req.body.all;
		else if (req.body.sort)
			oQuery.sort = {date: -1};
		else
			oQuery.sort = {_id: -1};

		oQuery.queryFilter.advanceType = "Diesel";
		oQuery.queryFilter.trip = {$exists: true};

		let aggregatePipeline = [
			{
				$match: oQuery.queryFilter
			},
			{
				$project: {
					date: 1,
					trip: 1,
					trip_no: 1,
					reference_no: 1,
					rate: "$dieseInfo.rate",
					qty: "$dieseInfo.litre",
					from_account: 1,
					amount: 1,
					vehicle_no: 1
				}
			},
			{
				$sort: {
					_id: -1
				}
			},
			{
				$lookup: {
					from: "tripv2",
					localField: "trip",
					foreignField: "_id",
					as: "trip"
				}
			},
			{
				$unwind: {
					path: "$trip",
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$project: {
					date: 1,
					route_name: "$trip.route_name",
					gr: {$arrayElemAt: ["$trip.gr", 0]},
					trip_no: 1,
					reference_no: 1,
					rate: 1,
					qty: 1,
					from_account: 1,
					amount: 1,
					vehicle_no: 1
				}
			},
			{
				$lookup: {
					from: "tripgrs",
					localField: "gr",
					foreignField: "_id",
					as: "gr"
				}
			},
			{
				$unwind: {
					path: "$gr",
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$project: {
					date: 1,
					route_name: 1,
					grDate: "$gr.grDate",
					trip_no: 1,
					reference_no: 1,
					rate: 1,
					qty: 1,
					from_account: 1,
					amount: 1,
					vehicle_no: 1
				}
			},
			{
				$lookup: {
					from: "accounts",
					localField: "from_account",
					foreignField: "_id",
					as: "from_account"
				}
			},
			{
				$unwind: {
					path: "$from_account",
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$project: {
					_id: 0,
					date: 1,
					route_name: 1,
					grDate: 1,
					trip_no: 1,
					reference_no: 1,
					rate: 1,
					qty: 1,
					fuelStation: "$from_account.name",
					amount: 1,
					vehicle_no: 1
				}
			}
		];

		let hasTimeoutExecuted = false;
		let timer = setTimeout(() => {
			hasTimeoutExecuted = true;
			return res.status(200).json({
				status: 'SUCCESS',
				message: 'Report is taking time. Please wait, you will receive notification.',
			});
		}, 1000 * 60);

		let downloadPath = await new csvDownload(TripAdvance, aggregatePipeline, {
			filePath: `${req.user.clientId}/Trip_Advance`,
			fileName: `Diesel_Trip_Report_${moment().format('DD-MM-YYYY hh:mm')}`
		}).exec(dieselTripReport.transform, req);

		if (hasTimeoutExecuted) {
			await logsService.addLog('Trip_Advance_Report', {
				uif: "Diesel Trip Report " + moment().format('DD-MM-YYYY hh:mm'),
				docId: req.user._id,
				category: 'Notification',
				delta: [],
				dwnldLnk: `<a href='${downloadPath}' download='${downloadPath}' target='_blank'>Click To Download</a>`,
				userId: req.user._id,
				subCategory: 'Trip Advance Report'
			}, req);
		} else {
			clearTimeout(timer);
			return res.status(200).json({
				status: "SUCCESS",
				message: 'report download available',
				url: downloadPath
			});
		}

	} catch (err) {
		return res.status(500).json({
			status: 'ERROR',
			message: err.toString()
		})
	}
});

router.post('/addMultiV2', async (req, res, next) => {
	try {

		let aAdvances = req.body.aAdvances;

		if (!Array.isArray(aAdvances) || !aAdvances.length)
			throw new Error('Add at least one Advance');

		let trip = aAdvances[0].trip;
		let vehicle = aAdvances[0].vehicle;

		let foundTrip;

		if (trip) {
			foundTrip = await Trip.findOne({_id: trip, clientId: req.user.clientId}, {trip_no: 1,advSettled: 1,markSettle:1}).lean();
		}

		if (foundTrip && foundTrip.advSettled && foundTrip.advSettled.isCompletelySettled)
			throw new Error(`Trip Advance Cannot be added. Because Trip no ${foundTrip.trip_no} is Completely Settled`);

		if (foundTrip && foundTrip.markSettle && foundTrip.markSettle.isSettled)
			throw new Error(`Trip Advance Cannot be added. Because Trip no ${foundTrip.trip_no} is Marked Settled`);

		for (let oAdvance of aAdvances) {

			let oTripAdvance = await TripAdvance.findOne({reference_no: oAdvance.reference_no, clientId: req.user.clientId}, {_id: 1}).lean();

			if (oTripAdvance)
				throw new Error(`Advance with ${oAdvance.reference_no} already exists.`);

			if (!oAdvance.stationaryId) {
				let foundStationary = await billStationaryService.findByRefAndType({
					bookNo: oAdvance.reference_no,
					type: 'Ref No',
					clientId: req.user.clientId
				});

				if (foundStationary) {
					oAdvance.stationaryId = foundStationary._id;
				}
			}

			if (oAdvance.stationaryId && (await billStationaryService.isUsed(oAdvance.stationaryId)))
				throw new Error('Ref No already used');
		}

		for (let oAdvance of aAdvances) {
			if (oAdvance.advanceType === 'Diesel') {
				oAdvance.dieseInfo = oAdvance.diesel_info;
			}

			oAdvance.clientId = req.user.clientId;
			oAdvance.category = oAdvance.category || 'trip';
			oAdvance.editable = true;
			oAdvance.linkable = true;
			oAdvance.created_at = new Date();
			oAdvance.createdBy = req.user.full_name;
			oAdvance.remainingAmount = oAdvance.amount || 0;
			// oAdvance._id = mongoose.Types.ObjectId();

			let oFilter = {
				clientId: req.user.clientId,
				advanceType: oAdvance.advanceType,
			};
			if (oAdvance.vehicle_no) {
				oFilter.vehicle_no = oAdvance.vehicle_no;
			}
			if (oAdvance.reference_no) {
				oFilter.reference_no = oAdvance.reference_no.trim();
			}

			let advanceObj = await TripAdvance.findOneAndUpdate(oFilter, {$set: oAdvance}, {
				new: true,
				upsert: true
			});

			// let _oAdv = new TripAdvance(oAdvance);
			// await _oAdv.save();
            oAdvance._id = advanceObj._id;
			if (oAdvance.stationaryId) {
				await billStationaryService.updateStatus({
					userName: req.user.full_name,
					modelName: 'tripadvances',
					docId: advanceObj._id,
					stationaryId : oAdvance.stationaryId,
				}, 'used');
			}
		}



		if (trip) {
			let updated = await Trip.findOneAndUpdate(
				{
					_id: otherUtil.arrString2ObjectId(trip)
				},
				{
					$addToSet: {
						'advanceBudget': {
							$each: aAdvances.map(o => o._id)
						}
					}
				}
			);
		}

		let liter = aAdvances.reduce((sum, oAdv) => {
			if (oAdv.advanceType === "Diesel") {
				sum += oAdv.dieseInfo.litre;
			}

			return sum;
		}, 0);

		if (liter) {
			await RegisteredVehicleModel.update(
				{_id: vehicle}, {
					$inc: {
						'dieselInVehicle': liter
					}
				}
			);

			// Send Notification
			let alertTotalDiesel = 950;
			let dieselLtr = liter;
			if (dieselLtr > alertTotalDiesel) {
				let oDelta = {
					"Success": {
						count: dieselLtr,
						status: "Success",
						message: "Totol Diesel Ltr Exceeded from " + alertTotalDiesel
					}
				};
				alertTripAdvLog(req, reference_no, oDelta);
			}
		}

		for (let oAdvance of aAdvances) {
			let oDeltaLog = {};
			if (oAdvance.advanceType == 'Happay') {
				let alertHappayAmt = 50000;
				let totalHappayAmt = oAdvance.amount;
				if (totalHappayAmt > alertHappayAmt) {
					oDeltaLog = {
						"Success": {
							count: totalHappayAmt,
							status: "Success",
							message: "Total Happay Exceeded from " + alertHappayAmt
						}
					};
					alertTripAdvLog(req, oAdvance.reference_no, oDeltaLog);
				}
			} else if (oAdvance.advanceType == 'Driver Cash') {
				let alertDriverCashAmt = 50000;
				let totalDriverCashAmt = oAdvance.amount;
				if (totalDriverCashAmt > alertDriverCashAmt) {
					oDeltaLog = {
						"Success": {
							count: totalDriverCashAmt,
							status: "Success",
							message: "Total Driver Cash Amount Exceeded from " + alertDriverCashAmt
						}
					};
					alertTripAdvLog(req, oAdvance.reference_no, oDeltaLog);
				}
			} else if (oAdvance.advanceType == 'Fastag') {
				let alertFastTagAmt = 3000;
				let totalFastTagAmt = oAdvance.amount;
				if (totalFastTagAmt > alertFastTagAmt) {
					oDeltaLog = {
						"Success": {
							count: totalFastTagAmt,
							status: "Success",
							message: "Total Fastag Exceeded from " + alertFastTagAmt
						}
					};
					alertTripAdvLog(req, oAdvance.reference_no, oDeltaLog);
				}
				// END
			}
		}


		return res.status(200).json({
			status: 'OK',
			message: 'Advance Added Successfully',
		});

	} catch (err) {
		return res.status(500).json({
			status: 'ERROR',
			message: err.toString()
		})
	}
});

router.post('/comparision', upload.single('advancesExcel'), async (req, res, next) => {
	try {
		// let fromDate = new Date(req.body.fromDate);
		// fromDate.setHours(0);
		// fromDate.setMinutes(0);
		// fromDate.setSeconds(0);
		// fromDate.setMilliseconds(0);
		// let toDate = new Date(req.body.toDate);
		// toDate.setHours(23);
		// toDate.setMinutes(59);
		// toDate.setSeconds(59);
		// toDate.setMilliseconds(999);
		let newData = [];                                     // after sorted and group excel data stored
		let resultArr = [];
		const excelData = new ExcelReader({
			filePath: req.file.path,
			inject: {
				clientId: req.user.clientId,
				uploaded_at: new Date(),
				created_by: req.user._id,
			},
			config: {
				'ADVANCE TYPE': {
					keyName: 'advanceType',
					required: true,
					enum: ['Happay', 'Fastag', 'Driver Cash', 'Diesel']
				},
				'ADVANCE DATE': {
					keyName: 'date',
					required: true,
					dateFormat: 'DD/MM/YYYY',
					ignoreHours: true,
				},
				'VEHICLE NO': {
					keyName: 'vehicle_no',
					required: true,
					stateReducer: function (vehRegNo) {
						let dig4 = '';
						let remainingChars = vehRegNo.trim().replace(/^\d{4}/, function (replacedStr) {
							dig4 = replacedStr || '';
							return '';
						});
						return remainingChars + dig4;
					},
				},
				'REMARK': {
					keyName: 'remark',
					required: true,
				},
				'AMOUNT': {
					keyName: 'amount',
					// required: true,
				},
				'BRANCH ACCOUNT': {
					keyName: 'cashPump',
					ignoreIfValueIs: 'NA',
				},
				'BRANCH': {
					keyName: 'branch',
					required: true,
				},
				'HAPPAY ACCOUNT': {
					keyName: '__happay__',
					ignoreIfValueIs: 'NA',
				},
				'BILL NO': {
					keyName: 'bill_no',
					required: true,
					ignoreIfValueIs: 'NA',
				},
				'REFERENCE NO': {
					keyName: 'reference_no',
					required: false,
					ignoreIfValueIs: 'NA',
				},
				'DIESEL VENDOR': {
					keyName: 'dieseInfo.vendor',
					ignoreIfValueIs: 'NA',
				},
				'STATUS': {
					keyName: 'status',
					ignoreIfValueIs: 'NA',
				},
				'DIESEL RATE': {
					keyName: 'dieseInfo.rate',
					ignoreIfValueIs: ['NA', '-'],
				},
				'DIESEL LITRE': {
					keyName: 'dieseInfo.litre',
					ignoreIfValueIs: ['NA', '-'],
				},
			},
		});
		let partialAdvances = await excelData.read();
		let _ids = req.body._ids.split(',');
		let ExcelTotalLtr = 0;
		let ExcelTotalAmount = 0;
		let objectIdArray = _ids.map(s => mongoose.Types.ObjectId(s));
		let tripAdvanceGroup = await TripAdvance.aggregate([{
			$match:{
				"_id":{$in: otherUtil.arrString2ObjectId(objectIdArray)},
				"advanceType" : "Diesel",
				"status" : "Diesel Request",
			}
		},{
			$lookup: {
				from: "accounts",
				localField: "from_account",
				foreignField: "_id",
				as: "from_account"
			}
		},
			{
				$unwind: {
					path: "$from_account",
					preserveNullAndEmptyArrays: true
				}
			},
			{$project:{
					advanceType:1,
					amount:1,
					category:1,
					date:1,
					dieseInfo:1,
					from_account:1,
					reference_no:1,
					remark:1,
			        status:1,
					trip_no:1,
				    vehicle_no:1,
				    _id:1
			}},{
			$sort:{date:1}
		},{
			$group:{
				_id:{vehicle_no:"$vehicle_no"},
				totalLtr:{$sum:"$dieseInfo.litre"},
				list:{$push:"$$ROOT"}
			}
		}
		]);                      // sortedd by date and group by vehicle
		partialAdvances.sort((a,b) => new Date(a.date) - new Date(b.date));    // sorted by date
		for(const d of partialAdvances){
			let findItem = await newData.find(function(item){
				if((item.vehicle_no.toString() === d.vehicle_no.toString()))
					return true;
			});
			if(findItem){
				findItem.list.push(d);
				findItem.totalLtr += (d.dieseInfo.litre || 0);
			}else{
                 let obj = {
					 vehicle_no:d.vehicle_no,
					 totalLtr:d.dieseInfo.litre || 0,
					 list:[]
				 };
                 obj.list.push(d);
                 newData.push(obj);
			}
		}                                            // group by vehicle
		// let tripAdvance = await TripAdvance.find({
		// 	"_id":{$in: otherUtil.arrString2ObjectId(objectIdArray)},
		// 	"advanceType" : "Diesel",
		// 	"status" : "Diesel Request",
		// 	// "date":{$gte:fromDate,$lte:toDate}
		// 	},{dieseInfo:1,date:1,advanceType:1,amount:1,category:1,reference_no:1,status:1,vehicle_no:1,_id:1}).lean();

		for(const d of tripAdvanceGroup){
			let findPartialAdvanceGroup = await newData.find(function(item){                   // find vehicle in excel upload
				if((item.vehicle_no.toString() === d._id.vehicle_no.toString()))
					return true;
			});
			if(findPartialAdvanceGroup){
				let ActualLength = d.list.length;
				let ExcelLength = findPartialAdvanceGroup.list.length;
				if(ActualLength > ExcelLength){
					let i=0;
					let actualMisMatch = [];
					let exlMisMatch = [];
					for(const list of d.list){
						if(ExcelLength <= i){
							actualMisMatch.push(list);
							// list.checkstatus = "Not Found";
							// resultArr.push(list);
						}else if(list.dieseInfo.litre === findPartialAdvanceGroup.list[i].dieseInfo.litre){
							list.dieseInfo.actualLit = findPartialAdvanceGroup.list[i].dieseInfo.litre;
							list.dieseInfo.rate   = findPartialAdvanceGroup.list[i].dieseInfo.rate || 'NA';
							list.amount  = list.dieseInfo.actualLit * list.dieseInfo.rate || findPartialAdvanceGroup.list[i].amount || 0;
							list.bill_no  = findPartialAdvanceGroup.list[i].bill_no;
							list.checkstatus = "Matched";
							list.amount = Number(list.amount.toFixed(2));
							resultArr.push(list);
						}else{
							actualMisMatch.push(list);
							exlMisMatch.push(findPartialAdvanceGroup.list[i]);
							// list.checkstatus = "MisMatched";
							// list.dieseInfo.actualLit = findPartialAdvanceGroup.list[i].dieseInfo.litre;
							// list.dieseInfo.rate   = findPartialAdvanceGroup.list[i].dieseInfo.rate || 'NA';
							// list.amount  = list.dieseInfo.actualLit * list.dieseInfo.rate || findPartialAdvanceGroup.list[i].amount || 0;
							// list.amount = Number(list.amount.toFixed(2));
							// resultArr.push(list);
						}
						i++;
					}

					if(actualMisMatch.length){
						for(let i = 0; i < actualMisMatch.length; i++){
							for(let j = 0; j < exlMisMatch.length; j++){
								let exlList = exlMisMatch[j]; let actList = actualMisMatch[i];

								if(exlList.dieseInfo.litre === actList.dieseInfo.litre){
									actList.dieseInfo.actualLit = exlList.dieseInfo.litre;
									actList.dieseInfo.rate   = exlList.dieseInfo.rate || 'NA';
									actList.amount  = actList.dieseInfo.actualLit * actList.dieseInfo.rate || exlList.amount || 0;
									actList.bill_no  = exlList.bill_no;
									actList.checkstatus = "Matched";
									actList.amount = Number(actList.amount.toFixed(2));
									resultArr.push(actList);

									actualMisMatch.splice(i,1)
									exlMisMatch.splice(j,1)
									i = -1;
									break;
								}
							}
						}
					}

					if(actualMisMatch.length){
						let i = 0;
						for(const actList of actualMisMatch){
							let exlList = exlMisMatch[i];
							if(exlMisMatch.length <= i){
								actList.checkstatus = "Not Found";
								resultArr.push(actList);
							}else if(exlList.dieseInfo.litre === actList.dieseInfo.litre){
								actList.dieseInfo.actualLit = exlList.dieseInfo.litre;
								actList.dieseInfo.rate   = exlList.dieseInfo.rate || 'NA';
								actList.amount  = actList.dieseInfo.actualLit * actList.dieseInfo.rate || exlList.amount || 0;
								actList.bill_no  = exlList.bill_no;
								actList.checkstatus = "Matched";
								actList.amount = Number(actList.amount.toFixed(2));
								resultArr.push(actList);
							}else{
								actList.checkstatus = "MisMatched";
								actList.dieseInfo.actualLit = exlList.dieseInfo.litre;
								actList.dieseInfo.rate   = exlList.dieseInfo.rate || 'NA';
								actList.amount  = actList.dieseInfo.actualLit * actList.dieseInfo.rate || exlList.amount || 0;
								actList.amount = Number(actList.amount.toFixed(2));
								resultArr.push(actList);
							}
							i++;
						}
					}

				}else{
					let i=0;
					let actualMisMatch = [];
					let exlMisMatch = [];
					for(const list of findPartialAdvanceGroup.list){
						if(ActualLength <= i){
							exlMisMatch.push(list);
							// list.checkstatus = "Not Found";
							// list.dieseInfo.actualLit = list.dieseInfo.litre;
							// delete list.dieseInfo.litre;
							// resultArr.push(list);
						}else if(list.dieseInfo.litre === d.list[i].dieseInfo.litre){
							d.list[i].dieseInfo.actualLit = list.dieseInfo.litre;
							d.list[i].dieseInfo.rate   = list.dieseInfo.rate || 'NA';
							d.list[i].amount  = d.list[i].dieseInfo.actualLit * d.list[i].dieseInfo.rate || list.amount || 0;
							d.list[i].bill_no  = list.bill_no;
							d.list[i].checkstatus = "Matched";
							d.list[i].amount = Number(d.list[i].amount.toFixed(2));
							resultArr.push(d.list[i]);
						}else{
							actualMisMatch.push(d.list[i]);
							exlMisMatch.push(list);
							// d.list[i].checkstatus = "MisMatched";
							// d.list[i].dieseInfo.actualLit = list.dieseInfo.litre;
							// d.list[i].dieseInfo.rate   = list.dieseInfo.rate || 'NA';
							// d.list[i].amount  = d.list[i].dieseInfo.actualLit * d.list[i].dieseInfo.rate || list.amount || 0;
							// d.list[i].amount = Number(d.list[i].amount.toFixed(2));
							// resultArr.push(d.list[i]);
						}
						i++;
					}

					if(exlMisMatch.length){
						for(let i = 0; i < exlMisMatch.length; i++){
							for(let j = 0; j < actualMisMatch.length; j++){
								let exlList = exlMisMatch[i]; let actList = actualMisMatch[j];
                              if(exlList.dieseInfo.litre === actList.dieseInfo.litre){
								  actList.dieseInfo.actualLit = exlList.dieseInfo.litre;
								  actList.dieseInfo.rate   = exlList.dieseInfo.rate || 'NA';
								  actList.amount  = actList.dieseInfo.actualLit * actList.dieseInfo.rate || exlList.amount || 0;
								  actList.bill_no  = exlList.bill_no;
								  actList.checkstatus = "Matched";
								  actList.amount = Number(actList.amount.toFixed(2));
								  resultArr.push(actList);


								  actualMisMatch.splice(j,1)
								  exlMisMatch.splice(i,1)
								  i = -1;
								  break;
							  }
							}
						}
					}

					if(exlMisMatch.length){
						let i = 0;
						for(const exlList of exlMisMatch){
							let actList = actualMisMatch[i];
							if(actualMisMatch.length <= i){
								exlList.checkstatus = "Not Found";
								exlList.dieseInfo.actualLit = exlList.dieseInfo.litre;
								delete exlList.dieseInfo.litre;
								resultArr.push(exlList);
							}else if(exlList.dieseInfo.litre === actList.dieseInfo.litre){
									actList.dieseInfo.actualLit = exlList.dieseInfo.litre;
									actList.dieseInfo.rate   = exlList.dieseInfo.rate || 'NA';
									actList.amount  = actList.dieseInfo.actualLit * actList.dieseInfo.rate || exlList.amount || 0;
									actList.bill_no  = exlList.bill_no;
									actList.checkstatus = "Matched";
									actList.amount = Number(actList.amount.toFixed(2));
									resultArr.push(actList);
								}else{
									actList.checkstatus = "MisMatched";
									actList.dieseInfo.actualLit = exlList.dieseInfo.litre;
									actList.dieseInfo.rate   = exlList.dieseInfo.rate || 'NA';
									actList.amount  = actList.dieseInfo.actualLit * actList.dieseInfo.rate || exlList.amount || 0;
									actList.amount = Number(actList.amount.toFixed(2));
									resultArr.push(actList);
								}
								i++;
							}
						}

					}

			}else{
				for(const list of d.list){
					list.checkstatus = "Not Found";
					resultArr.push(list);
				}
			}
		}

		if(newData && newData[0]){
			for(const d of newData){
				let findItem = await tripAdvanceGroup.find(function(item){
					if((item._id.vehicle_no.toString() === d.vehicle_no.toString()))
						return true;
				});
				if(!findItem){
					for(const list of d.list){
						list.checkstatus = "Not Found";
						resultArr.push(list);
					}
				}
			}
		}

		return res.status(200).json({
			status: 'OK',
			message: "Found data after check",
			data:resultArr,
			ExcelCount:partialAdvances.length,
			// advanceCount:tripAdvance.length,
		});
	} catch (e) {
		if (!res.headersSent) {
			return res.status(500).json({
				status: 'ERROR',
				message: e.toString(),
				error: e.toString()
			});
		}
		console.error(e.toString());
	}
});

router.post('/summaryGet', async (req, res, next) => {
	try {
		let tripAdvance = await TripAdvance.aggregate([{
			$match:constructFilters(req.body)
		},
			{
				$group:{
					_id:{_id:null},
					count:{$sum:1},
					totalLtr:{$sum:"$dieseInfo.litre"},
					totalDr:{$sum:{$cond: {
								if: { $gt: ["$amount", 0] },
								then: "$amount",
								else: 0
							}}},
					totalCr:{$sum:{$cond: {
								if: { $lt: ["$amount", 0] },
								then: "$amount",
								else: 0
							}}},
				}
			}
		])
		return res.status(200).json({
			status: 'OK',
			message: 'Data found',
			data:tripAdvance
		})
	} catch (err) {
		next(err);
	}
});

function stateReducer(vehRegNo) {
	let dig4;
	if(!vehRegNo) return;
	let remainingChars = vehRegNo.trim().replace(/\d{4}/, function (replacedStr) {
		dig4 = replacedStr;
		return '';
	});
	return dig4 + remainingChars;
}

function alertTripAdvLog(req, oRefNo, oDelta) {
	try {
		logsService.addLog('TripAdvances', {
			uif: "TripAdvances-" + new Date().toLocaleString(),
			docId: req.user._id,
			category: 'Notification',
			delta: oDelta,
			action: {
				refNo: oRefNo,
				addedUser: req.user.full_name,
				datetime: Date.now(),
				isActioned: true
			}
		}, req);
	} catch (e) {
		throw e;
	}

}

module.exports = router;
