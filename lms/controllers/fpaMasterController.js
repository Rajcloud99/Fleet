const router = express.Router();
const FPA = require('../models/fpaMaster');

const ALLOWED_FILTER = ['from', 'to', 'vendor', 'customer', 'type', 'date'];

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
				// if (!oQuery.dateType || oQuery.dateType === 'date') {
				oFilter[oQuery.dateType || 'date'] = oFilter[oQuery.dateType || 'date'] || {};
				oFilter[oQuery.dateType || 'date'].$gte = startDate;
				// }
			} else if (i === 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				// if (!oQuery.dateType || oQuery.dateType === 'date') {
				oFilter[oQuery.dateType || 'date'] = oFilter[oQuery.dateType || 'date'] || {};
				oFilter[oQuery.dateType || 'date'].$lte = endDate;
				// }
			} else if (i === 'date') {
				oFilter['date'] = {
					$lte: new Date(oQuery[i])
				};

			} else if (i === 'vendor') {
				oFilter[i] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			} else if (i === 'customer') {
				oFilter[i] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

router.post('/get', async function (req, res, next) {
	try {

		let oQuery = (req && req.body) ? (req.body.clientId = req.user.clientId, req.body) : {};

		oQuery.queryFilter = constructFilters(oQuery);
		if (req.body.all) {
			oQuery.all = req.body.all;
		} else if (req.body.sort) {
			oQuery.sort = req.body.sort;
		} else {
			oQuery.sort = {_id: -1};
		}
		otherUtil.findPagination(FPA, oQuery, function (err, data) {
			if (err) {
				return res.status(500).json({
					status: 'ERROR',
					message: err.toString()
				})
			} else {
				return res.status(200).json({
					'status': 'OK',
					'message': 'FPA Data found',
					'data': data
				});
			}
		})
	} catch (err) {
		throw err;
	}
});

router.post('/autosuggest', async function (req, res, next) {
	const data = await FPA.autosuggest(req.body);
	return res.status(200).json({
		status: 'OK',
		message: 'FPA found',
		data
	});
});

router.post('/add', async function (req, res, next) {
	try {
		const data = await FPA.add(req.body);
		return res.status(200).json({
			status: 'OK',
			message: 'Incentive added',
			data
		});
	} catch (e) {
		return res.status(200).json({
			status: 'FAILED',
			message: 'error',
			error: e
		});
	}
});

module.exports = router;
