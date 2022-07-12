'use strict';

const path = require('path');
const router = express.Router();
const constants = require('../../constant');
const mongoose = require('mongoose');
const CustomerRateChart = require('../models/CustomerRateChart');
const ExcelCSV = require('../../utils/upload-util');
const multer = require('multer');
const City = commonUtil.getModel('city');
const upload = multer({
	limits: { fileSize: 2 * 1000 * 1000 },
	storage: multer.diskStorage({
		destination: (req, file, cb) => { cb(null, path.join(projectHome, 'files')) },
		filename: (req, file, cb) => { cb(null, `${Date.now()}-${file.originalname}`) }
	}),
	/*fileFilter: (req, file, cb) => {
		if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel') {
			cb(null, true);
		}else{
			cb(null, false);
		}
	}*/
});
const Customer = commonUtil.getModel('customer');
const moment = require('moment');
const ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

router.get('/', async (req, res, next) => {
	const opts = {};
	const filter = {};
	var projection = {};

	// Filters
	if(req.query.customer) {
		filter.customer = { $eq: mongoose.Types.ObjectId(req.query.customer) };
	}
	if(req.query.from) {
		filter.effectiveDate = filter.effectiveDate || {};
		filter.effectiveDate['$gte'] = new Date(req.query.from);
	}
	if(req.query.to) {
		filter.effectiveDate = filter.effectiveDate || {};
		filter.effectiveDate['$lte'] = new Date(req.query.to);
	}
	if(req.query.source) {
		filter.source = new RegExp('^' + (req.query.source.trim().replace(/[|\\{}()[\]^$+*?.]/gi, '\\$&')) + '$');
	}
	if(req.query.destination) {
		filter.destination = new RegExp('^' + (req.query.destination.trim().replace(/[|\\{}()[\]^$+*?.]/gi, '\\$&')) + '$');
	}
	if(req.query.materialGroupCode) {
		filter.materialGroupCode = new RegExp(req.query.materialGroupCode.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), 'i') ;//{ $eq: req.query.materialGroupCode.trim().toLowerCase() };
	}

	// Options
	if(req.query.download){
		opts.limit = 12000;
	}else if(req.query.no_of_docs) {
		let lim = parseInt(req.query.no_of_docs);
		opts.limit = isNaN(lim) ? 1 : lim;
	} else {
		opts.limit = 10;
	}
    if(req.query.skip){
		opts.skip = (parseInt(req.query.skip)-1)*opts.limit;
	}
	// Projection
	if(req.query.projection) {
		projection = req.query.projection.split(',').reduce((acc, curr) => {
			var isExclamation = curr.slice(0, 1) === '!';
			return { ...acc, [isExclamation ? curr.slice(1) : curr]: !isExclamation };
		}, {});
	}

	try {
		let data;
		if (req.query._t === 'autosuggest') {
			const key = req.query.source ? 'source' : 'destination';
			data = await CustomerRateChart.distinct(key, {[key]: { $regex: req.query[key], $options: 'i' }});
			data = data.map(x=>({_id:Math.random().toString(),[key]:x}));
			return res.status(200).json({
				status: 'OK',
				message: 'Rate charts found',
				data
			});
		} else {
			data = await CustomerRateChart.find(filter, projection, opts).sort({_id:-1}).populate('customer', {name: 1});
			const cust = await Customer.findById(req.query.customer).populate('configs.RATE_CHART').lean();
			if (req.query.download) {
				ReportExelService.reportRateChart(
					cust.configs && cust.configs.RATE_CHART && cust.configs.RATE_CHART.configs,
					data, req.user.clientId, function(data){
					return res.status(200).json({
						"status": "OK",
						"message": "report download available.",
						"url": data.url
					});
				});
			} else {
				return res.status(200).json({
					status: 'OK',
					message: 'Rate charts found',
					data
				});
			}
		}
	} catch(e) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Something went wrong',
			error: e.toString()
		});
	}
});

router.get('/aggr', async (req, res, next) => {
	const opts = {};
	const filter = {};
	// Filters
	if(req.query.customer) {
		filter.customer = { $eq: mongoose.Types.ObjectId(req.query.customer) }
	}
	if(req.query.from) {
		filter.effectiveDate = filter.effectiveDate || {};
		filter.effectiveDate['$gte'] = new Date(req.query.from);
	}
	if(req.query.to) {
		filter.effectiveDate = filter.effectiveDate || {};
		filter.effectiveDate['$lte'] = new Date(req.query.to);
	}
	if(req.query.source) {
		filter.source = new RegExp('^'+(req.query.source.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'))+'$', 'ig');//{ $eq: req.query.source.trim().toLowerCase()};
	}
	if(req.query.destination) {
		filter.destination = new RegExp('^'+(req.query.destination.trim().replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'))+'$', 'ig');
	}
	if(req.query.materialGroupCode) {
		filter.materialGroupCode = new RegExp('^'+req.query.materialGroupCode.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')+ '$', 'i') ;//{ $eq: req.query.materialGroupCode.trim().toLowerCase() };
	}

	if(req.query.no_of_docs) {
		let lim = parseInt(req.query.no_of_docs);
		opts.limit = isNaN(lim) ? 1 : lim;
	} else {
		opts.limit = 10;
	}
	let aggr = [
		{
			$match: filter
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
			$limit: 1
		}
	];
	try {
		let data = await CustomerRateChart.aggregate(aggr);
			return res.status(200).json({
				status: 'OK',
				message: 'Rate charts found',
				data : data && data[0] && data[0].rates
			});
	} catch (e) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Something went wrong',
			error: e.toString()
		});
	}
});

router.post('/', async (req, res, next) => {
	try {
		let data;
		if (req.body._id) {
			data = await CustomerRateChart.findByIdAndUpdate(req.body._id,{$set:req.body});
		} else {
			data = await CustomerRateChart.create(req.body);
		}
		return res.status(201).json({
			status: 'SUCCESS',
			message: 'Rate chart added successfully'
		});
	} catch(e) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Something went wrong',
			error: e.toString()
		});
	}
});

router.post('/upload-download/:cid', upload.single('rateChartExcel'), async (req, res, next) => {
	try {
		const customer = await mongoose.model('Customer').findOne({_id: req.params.cid}, {name: true, configs: true}).populate('configs.RATE_CHART');
		if(req.query.download === '1') {
			ReportExelService.customerRateChartSample(customer._doc, req.user.clientId, function (d) {
				return res.status(201).json({
					status: 'SUCCESS',
					message: 'Rate chart added successfully',
					url: d.url
				});
			});
		}
		else if(req.query.upload === '1') {
			let aRC = undefined;
			if(customer._doc.configs && customer._doc.configs.RATE_CHART && customer._doc.configs.RATE_CHART.configs) {
				aRC = [];
				for(let k in customer._doc.configs.RATE_CHART.configs){
					if(customer._doc.configs.RATE_CHART.configs.hasOwnProperty(k)) {
						if (Array.isArray(customer._doc.configs.RATE_CHART.configs[k])) {
							customer._doc.configs.RATE_CHART.configs[k].forEach(function(t) {
								aRC.push(t);
							});
						} else {
							aRC.push({...customer._doc.configs.RATE_CHART.configs[k], field:k});
						}
					}
				}
			}
			const excelCSV = new ExcelCSV({
				rateChartConfig: (aRC&&aRC.filter(y=>y.editable&&y.visible)||constants.defaultRateChartConfig).filter(x => Boolean(x.label)),
				filePath: req.file.path,
				$inject: {
					clientId: req.user.clientId,
					customer: customer._id,
					created_at: new Date(),
				}
			});
			const rateList = await excelCSV.readExcelAndGetRateList();

			const bulkQuery = rateList.map(rl => {
				var filterObj = {
					clientId: rl.clientId,
					customer: mongoose.Types.ObjectId(rl.customer),
					effectiveDate: {
						$gte: moment(rl.effectiveDate).startOf('day').toDate(),
						$lte: moment(rl.effectiveDate).endOf('day').toDate(),
					},
					source: rl.source,
					destination: rl.destination,
					baseValue:rl.baseValue,
				};
				if(rl.vehicleTypeCode) {
					filterObj['vehicleTypeCode'] = rl.vehicleTypeCode;
				}
				if(rl.materialGroupCode) {
					filterObj['materialGroupCode'] = rl.materialGroupCode;
				}
				return {
					updateOne: {
						filter: filterObj,
						update: { $set: rl },
						upsert: true
					}
				}
			});
			const stats = await CustomerRateChart.bulkWrite(bulkQuery);
			return res.status(201).json({
				status: 'SUCCESS',
				message: 'Rate chart uploaded',
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
			message: 'Rate chart deleted successfully',
		});
	} catch(e) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Something went wrong',
			error: e.toString()
		});
	}
});

module.exports = router;
