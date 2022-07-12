const router = express.Router();
const mkdirp = require('mkdirp');
const multer  = require('multer');
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		req.fileDir = path.join(projectHome,'/files/refs',req.user.clientId,req.body.name);
		mkdirp(req.fileDir, function (err) {
			if (err) cb(err);
			else cb(null, req.fileDir)
		});
	},
	filename: function (req, file, cb) {
		cb(null, file.fieldname)
	}
});
const upload = multer({ storage: storage,limits: { fieldSize: 25 * 1024 * 1024 } });
const Template = promise.promisifyAll(commonUtil.getModel('template'));

router.post('/save',
	async function (req,res,next) {
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({ 'status': 'ERROR', 'message': 'No update body found' })
		}
		let template = await Template.findOne({clientId:req.user.clientId, name: req.body.name});
		if(template){
			return res.status(500).json({
				'status': 'ERROR',
				'message': `Template already exists with name: ${req.query.name}.`
			})
		}
		try {
			req.body.clientId = req.user.clientId;
			let templateToSave = new Template (req.body);
			await template.save ();
		}catch (err){
			return res.status(500).json({
				'status': 'ERROR',
				'message': err.toString()
			})
		}
		return res.status(200).json({
			'status': 'OK',
			'message': 'Template saved successfully.'
		})
	});

router.put('/update/:_id',
	async function (req,res,next) {
		if (!req.params._id) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please provide _id'
			})
		}
		if (otherUtil.isEmptyObject(req.body)) {
			return res.status(500).json({ 'status': 'ERROR', 'message': 'No update body found' })
		}
		let template = await Template.findOne({clientId:req.user.clientId, _id: req.params._id});
		if(!template){
			return res.status(500).json({
				'status': 'ERROR',
				'message': `Template doesn't exist.`
			})
		}
		try {
			await template.update({_id: req.params._id},{$set:req.body});
		}catch (err){
			return res.status(500).json({
				'status': 'ERROR',
				'message': err.toString()
			})
		}
		return res.status(200).json({
			'status': 'OK',
			'message': 'Template updated successfully.'
		})
	});

router.get('/get', function(req, res, next) {
	let query = req.query;
	query.queryFilter = req.query;
	query.sort = query.sort || {$natural:-1};
	otherUtil.findPaginationAsync(Template, query)
		.then (function (data) {
			return res.status (200).json ({
					'status': 'OK',
					'message': 'Data found.',
					'data': data
				});
		})
		.catch (next)

});

router.delete('/remove/:_id', function(req, res, next) {
    if (!req.params._id) {
        return res.status(500).json({
            'status': 'ERROR',
            'message': 'Please provide _id'
        })
    }
	Template.findOneAndUpdateAsync({ _id: mongoose.Types.ObjectId(id) }, { $set: { deleted: true } })
		.then(function(data) {
			return res.status(200).json({
				'status': 'OK',
				'message': { message: "Deleted template", deleted: true}
			})		})
		.catch(next)
});

module.exports = router;
