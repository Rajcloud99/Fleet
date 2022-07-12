'use strict';

const path = require('path');
const router = express.Router();
const constants = require('../../constant');
const mongoose = require('mongoose');
const CustomerRateChart = require('../models/CustomerRateChart');
const bpModel = commonUtil.getModel('billingparty');
const ExcelReader = require('../../utils/ExcelReader');
const multer = require('multer');
const upload = multer({
	limits: { fileSize: 2 * 1000 * 1000 },
	storage: multer.diskStorage({
		destination: (req, file, cb) => { cb(null, path.join(projectHome, 'files')) },
		filename: (req, file, cb) => { cb(null, `${Date.now()}-${file.originalname}`) }
	}),
});
const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));
const moment = require('moment');


router.post('/get', async function (req, res, next) {
	const opts = {};
	const filter = {};
	// Filters

	if(req.body.billingParty) {
		filter.billingParty = { $eq: mongoose.Types.ObjectId(req.body.billingParty) }
	}
	if(req.body.vendor) {
		filter.vendor = { $eq: mongoose.Types.ObjectId(req.body.vendor) }
	}

	if(req.body.customer) {
		filter.customer = { $eq: mongoose.Types.ObjectId(req.body.customer) }
	}
	if(req.body.from) {
		filter.effectiveDate = filter.effectiveDate || {};
		filter.effectiveDate['$gte'] = new Date(req.body.from);
	}
	if(req.body.to) {
		filter.effectiveDate = filter.effectiveDate || {};
		filter.effectiveDate['$lte'] = new Date(req.body.to);
	}
	if(req.body.source) {
		filter.source = new RegExp('^'+(req.body.source.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'))+'$', 'ig');//{ $eq: req.query.source.trim().toLowerCase()};
	}
	if(req.body.destination) {
		filter.destination = new RegExp('^'+(req.body.destination.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'))+'$', 'ig');
	}
	if(req.body.materialGroupCode) {
		filter.materialGroupCode = new RegExp('^'+req.body.materialGroupCode.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')+ '$', 'i') ;//{ $eq: req.query.materialGroupCode.trim().toLowerCase() };
	}
	if(req.body.hsnCode) {
		filter.hsnCode = new RegExp('^'+req.body.hsnCode.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')+ '$', 'i') ;
	}
	if(req.body.type) {
		filter.type = new RegExp('^'+req.body.type.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')+ '$', 'i') ;
	}

	// Options
	if(req.body.download){
		opts.limit = 12000;
	}else if(req.body.no_of_docs) {
		let lim = parseInt(req.body.no_of_docs);
		opts.limit = isNaN(lim) ? 1 : lim;
	} else {
		opts.limit = 10;
	}
	if(req.body.skip){
		opts.skip = (parseInt(req.body.skip)-1)*opts.limit;
	}else
		opts.skip = 0;


	let aggr = [
		{
			$match: filter
		},
		{
			$lookup: {
				from: 'billingparties',
				localField: 'billingParty',
				foreignField: '_id',
				as: 'billingParty'
			}
		},
		{
			$unwind: {
				path: '$billingParty',
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$group: {
				_id : { day: { $dayOfMonth: "$effectiveDate" }, month: { $month: "$effectiveDate" }, year: { $year: "$effectiveDate" } },
				effectiveDate: {$first:'$effectiveDate'},
				rates: { $push: "$$ROOT" },
			}
		},
		{$sort: {'effectiveDate':-1}},
		{
			$skip: opts.skip
		},
		{
			$limit: opts.limit
		}
	];
	try {
		let data = await CustomerRateChart.aggregate(aggr);

		if(req.body.download) {
			ReportExelService.customerRateReport(data, req.user.clientId, function (d) {
				return res.status(201).json({
					status: 'SUCCESS',
					message: 'Rate chart added successfully',
					url: d.url
				});
			});
		}else {
			let resData;
			if(req.body.all)
				resData = data;
			else
				resData = data && data[0] && data[0].rates;

			return res.status(200).json({
				status: 'OK',
				message: 'Rate charts found',
				data: resData
			});
		}
	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Something went wrong',
			error: e.toString()
		});
	}
});

router.post('/add', async function (req, res, next) {
		try {
			let data;

			data = await CustomerRateChart.create(req.body);

			return res.status(201).json({
				status: 'SUCCESS',
				message: 'Rate added successfully'
			});
		} catch(e) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Something went wrong',
				error: e.toString()
			});
		}
	});

router.post('/delete', async (req, res, next) => {
	if(!req.body.ids) {
		return res.status(500).json({
			status: 'ERROR',
			message: '"ids" is mandatory',
		});
	}
	try {
		let stat = await CustomerRateChart.deleteMany({ _id: { $in: otherUtil.arrString2ObjectId(req.body.ids) } });
		return res.status(200).json({
			status: 'SUCCESS',
			message: 'Rate deleted successfully',
		});
	} catch(e) {
		return res.status(500).json({
			status: 'ERROR',
			message:  e.toString(),
			error: e.toString()
		});
	}
});

router.post('/uploadRate', upload.single('commanRateExcel'), async (req, res, next) => {
	try {

		if(req.query.download) {
			ReportExelService.commanRateSampleFile(req, req.user.clientId, function (d) {
				return res.status(201).json({
					status: 'SUCCESS',
					message: 'Rate Sample Successfully Generated',
					url: d.url
				});
			});
		}
		else if(req.query.upload) {

			const excelData = new ExcelReader({
				filePath: req.file.path,
				inject: {
					clientId: req.user.clientId,
					uploaded_at: new Date(),
					uploaded_by: req.user.full_name,
				},
				config: {
					'BILLING PARTY': {
						keyName: 'billingParty',
						required: true,
					},
					'HSN CODE': {
						keyName: 'hsnCode',
						required: true,
					},
					'DATE': {
						keyName: 'effectiveDate',
						dateFormat: 'DD/MM/YYYY',
						ignoreHours: true,
						required: true,
					},
					'RATE': {
						keyName: 'rate',
						required: true
						// ignoreIfValueIs: 'NA'
					}
				},
			});

			let aCommanRate = await excelData.read();

			for (let oRow of aCommanRate) {
				let {billingParty, hsnCode, effectiveDate, rate, clientId } = oRow;
				try {

					if (!hsnCode)
						throw new Error("hsnCode not defined");

					if (!rate)
						throw new Error("rate not defined");

					if (!effectiveDate)
						throw new Error("Date not defined");

					if (billingParty) {
						billingParty = await bpModel.find({name: billingParty, clientId}, {name: 1, _id: 1}).lean();
						if (billingParty.length == 0)
							throw new Error('billingParty Doesn\'t exists.');

						if (billingParty.length != 1)
							throw new Error('More than one billingParty exists/');


						oRow.billingParty = billingParty[0]._id;
					} else
						throw new Error('billingParty is not Defined');

				} catch (e) {
					return res.status(500).json({
						'status': 'ERROR',
						'message': e.toString(),
						'data': e
					})
				}
			}

			const bulkQuery = aCommanRate.map(rl => {
				var filterObj = {
					clientId: rl.clientId,
					billingParty: mongoose.Types.ObjectId(rl.billingParty),
					effectiveDate: {
						$gte: moment(rl.effectiveDate).startOf('day').toDate(),
						$lte: moment(rl.effectiveDate).endOf('day').toDate(),
					},
					rate: rl.rate,
					hsnCode: rl.hsnCode,
				};

				return {
					updateOne: {
						filter: filterObj,
						update: {$set: rl},
						upsert: true
					}
				}
			});
			const stats = await CustomerRateChart.bulkWrite(bulkQuery);
			return res.status(201).json({
				status: 'SUCCESS',
				message: 'Rate uploaded successfully',
				stats
			});
		}

	} catch(e) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Something went wrong',
			error: e.toString()
		});
	}
});

module.exports = router;
