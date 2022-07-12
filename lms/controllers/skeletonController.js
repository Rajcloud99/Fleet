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
const Skeleton = promise.promisifyAll(commonUtil.getModel('skeleton'));

router.put('/save',
	async function (req,res,next) {
		let skeleton = await Skeleton.findOne({clientId:req.user.clientId, name: req.query.name});
		if(skeleton){
			return res.status(500).json({
				'status': 'ERROR',
				'message': `Skeleton already exists with name: ${req.query.name}.`
			})
		}
		return next();
	},
	upload.any(),
	async function(req, res, next) {
		try {
			req.body.name = req.query.name;
			req.body.clientId = req.user.clientId;
			let skeletonToSave = new Skeleton (req.body);
			await skeletonToSave.save ();
		}catch (err){
			return res.status(500).json({
				'status': 'ERROR',
				'message': err.toString()
			})
		}
		return res.status(200).json({
			'status': 'OK',
			'message': 'Data found.'
		})
});

router.get('/get', function(req, res, next) {
	let query = req.query;
	query.queryFilter = req.query;
	query.sort = query.sort || {$natural:-1};
	otherUtil.findPaginationAsync(Skeleton, query)
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
	Skeleton.findOneAndUpdateAsync({ _id: mongoose.Types.ObjectId(id) }, { $set: { deleted: true } })
		.then(function(data) {
			return res.status(200).json({
				'status': 'OK',
				'message': { message: "Deleted account", deleted: true}
			})		})
		.catch(next)
});

module.exports = router;
