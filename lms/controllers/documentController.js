var router = require('express').Router();
var mongoose = require('mongoose');
//var Grid = require('gridfs-stream');
var multipartMiddleware = require('connect-multiparty')();
var FileService = commonUtil.getUtil('file_upload_util');
var DocumentsBucket = promise.promisifyAll(commonUtil.getModel('documentsBucket'));
var authUtil = commonUtil.getUtil("auth-util");

router.get('/view/:filename', function(req, res){
	let db = mongoose.connection.db;
	let mongoDriver = mongoose.mongo;
	let gfs = new Grid(db,mongoDriver);
	/** First check if file exists */
	DocumentsBucket.find({_id: req.params.filename},function(err, files){
		if(!files || files.length === 0){
			return res.status(404).json({
				responseCode: 1,
				responseMessage: "error"
			});
		}
		files = JSON.parse(JSON.stringify(files));
		/** create read stream */
		let readstream = gfs.createReadStream({
			_id: req.params.filename,
			root: "DocumentsBucket"
		});
		/** set the proper content type */
		res.set({
			'Content-Disposition': 'attachment; filename=' + files[0].filename,
			'Content-Type': files[0].contentType,
		});
		/** return response */
		return readstream.pipe(res);
	});
});

router.put('/upload/:modelName/:_id', authUtil.authenticateUser, async (req, res, next) => {
	if(otherUtil.isEmptyObject(req.params)) {
		return res.status(500).json({'status': 'ERROR', 'error_message': 'No id supplied'});
	}
	var doc = await mongoose.model(req.params.modelName).findById(req.params._id);
	if(doc) {
		req.doc = JSON.parse(JSON.stringify(doc));
		return next();
	} else {
		return res.status(500).json({
			status: 'ERROR',
			error_message: `${req.params.modelName} does not exist`
		});
	}
}, multipartMiddleware, async (req, res, next) => {
	try {
		if(req.files) {
			await FileService.uploadFiles(req, req.params.modelName, req.doc);
		}
		req.body.documents = req.doc.documents;
		delete req.files;
		var updated = await mongoose.model(req.params.modelName).findOneAndUpdateAsync({_id: req.params._id}, {$set: req.body}, {new: true});
		return res.status(200).json({
			'status': 'OK',
			'message': 'documents uploaded',
			'data': updated
		});
	} catch(err) {
		next(err);
	}
});

module.exports = router;
