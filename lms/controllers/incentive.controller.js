const router = express.Router();
const Incentive = require('../models/incentive.model');

router.post('/get', async function(req, res, next) {
	const data = await Incentive.get(req.body);
	return res.status(200).json({
		status: 'OK',
		message: 'Incentives found',
		data
	});
});

router.post('/autosuggest', async function(req, res, next) {
	const data = await Incentive.autosuggest(req.body);
	return res.status(200).json({
		status: 'OK',
		message: 'Incentives found',
		data
	});
});

router.post('/add', async function(req, res, next) {
	const data = await Incentive.add(req.body);
	return res.status(200).json({
		status: 'OK',
		message: 'Incentive added',
		data
	});
});

router.put('/update/:_id', async function(req, res, next) {
	const data = await Incentive.findOneAndUpdate({
		_id: otherUtil.arrString2ObjectId(req.params._id)
	}, req.body);
	return res.status(200).json({
		status: 'OK',
		message: 'Incentive added',
		data
	});
});

module.exports = router;
