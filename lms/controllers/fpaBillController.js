const router = express.Router();
const FpaBill = require('../models/fpaBill');
let ReportExelService = commonUtil.getService('reportExel');
var VendorTransport = commonUtil.getModel('vendorTransport');


router.post('/get', async function(req, res, next) {
	const data = await FpaBill.find({clientId: req.body.clientId});
	return res.status(200).json({
		status: 'OK',
		message: 'FPA Bill found',
		data
	});
});

router.post('/report/', async function(req, res, next) {
	let aggrQuery;
	if (req.body.repType === 'detailed') {
		aggrQuery = [
			{ $match: { _id: mongoose.Types.ObjectId(req.body.fpa) } },
			{ $unwind: { path: '$items' } },
			{ $addFields: { 'items.fpaDate': '$billDate' } },
			{ $replaceRoot: { newRoot: '$items' } },
			{ $lookup: { from: 'tripgrs', localField: 'gr', foreignField: '_id', as: 'gr' } },
			{ $unwind: { path: '$gr', preserveNullAndEmptyArrays: true } },
			{ $lookup: { from: 'registeredvehicles', localField: 'gr.vehicle', foreignField: '_id', as: 'gr.vehicle' } },
			{ $unwind: { path: '$gr.vehicle', preserveNullAndEmptyArrays: true } },
			{ $lookup: { from: 'customers', localField: 'gr.customer', foreignField: '_id', as: 'gr.customer' } },
			{ $unwind: { path: '$gr.customer', preserveNullAndEmptyArrays: true } },
			{ $lookup: { from: 'consignor_consignees', localField: 'gr.consignor', foreignField: '_id', as: 'gr.consignor' } },
			{ $unwind: { path: '$gr.consignor', preserveNullAndEmptyArrays: true } },
			{ $lookup: { from: 'consignor_consignees', localField: 'gr.consignee', foreignField: '_id', as: 'gr.consignee' } },
			{ $unwind: { path: '$gr.consignee', preserveNullAndEmptyArrays: true } },
			{ $group: {
				_id: '$gr.vehicle._id',
				vehicle_no: { $first: '$gr.vehicle.vehicle_reg_no' },
				docs: { $push: '$$ROOT' },
				totalFreight: { $sum: '$freight' },
				totalCommission: { $sum: '$total' },
				fpaDate: { $first: '$fpaDate' }
			} }
		];
	} else {

	}
	try {
		const vend = (await FpaBill.findById(req.body.fpa).populate('vendor').lean()).vendor;
		const data = await FpaBill.aggregate(aggrQuery);
		ReportExelService.fpaBillDetailed(vend, data, req.body.clientId, function(d) {
			return res.status(200).json({
				status: 'OK',
				message: 'Detailed report available',
				url:d
			});
		});
	} catch (e) {
		return res.status(200).json({
			status: 'ERROR',
			message: 'Something went wrong!',
			error:e
		});
	}
});

router.post('/add', async function(req, res, next) {
	try {
		const data = await FpaBill.add(req.body);
		return res.status(200).json({
			status: 'OK',
			message: 'FPA Bill added',
			data
		});
	} catch(e) {
		return res.status(200).json({
			status: 'FAILURE',
			message: 'error',
			error: e
		});
	}
});

module.exports = router;
