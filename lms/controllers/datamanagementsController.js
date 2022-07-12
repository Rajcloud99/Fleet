var express = require('express');
var router = express.Router();
const datamgntService = commonUtil.getService('datamanagements');
const Datamgnt = commonUtil.getModel('datamanagements');
var multipartMiddleware = require('connect-multiparty')();
var fs = require('fs');
var mongoose = require('mongoose');
//var Grid = require('gridfs-stream');
const mkdirp = require('mkdirp');
let multer = require('multer');
let Jimp = require('jimp');
let sizeOf = require('image-size');
let remote = require('remote-file-size')
const dirUtil = require('../../utils/dir-util');
const mime = require("mime");
/***********Multer Configuration for upload vehicle docs**************/
var maxFileSize = 30 * 1024 * 1024; //bytes(default)--->==10MB
var path = require('path');

var storage = multer.diskStorage({
	destination: function(req, file, cb) {
		cb(null, path.join(projectHome, "files", "assets", req.user.clientId, "dms"));
		createFolderName(projectHome+'/files/assets');
		createFolderName(projectHome+'/files/assets/'+req.query.clientId);
		createFolderName(projectHome+'/files/assets/'+req.query.clientId+'/dms');
	},
	filename: function(req, file, cb) {
		cb(null, Date.now() + path.extname(file.originalname));
	}
});

function getRandomInt(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

var upload = multer({
	storage: storage,
	limits: {
	//	fileSize: maxFileSize ,
		fieldSize:maxFileSize
	}
});

//*****************************************************************

// async function createResizeImages(imName, imReFileName){
// 	await Jimp.read(imName, (err, readFile) => {
// 		readFile
// 			//.resize(256, 256)
// 			.quality(40)
// 			//.greyscale()
// 			.write(imReFileName)
// 	});
// }

async function createResizeImages(imName, imReFileName){
	return  new Promise(function (resolve, reject) {
		Jimp.read(imName, (err, readFile) => {
			readFile
				//.resize(256, 256)
				.quality(40)
				//.greyscale()
				.write(imReFileName, function(...msg){
					//console.log(msg);
					resolve(msg);
				})
		});
	});
}

async function checkFileSize(imReFileName) {
	remote(imReFileName, function(err, fSize) {
		return fSize;
	});
}

async function createFolderName(saveDir){
	if(!fs.existsSync(saveDir)){
		fs.mkdirSync(saveDir, 0766, function(err){
			if(err){
				console.log(err);
				// echo the result back
				throw new Error("ERROR! Can't make the directory!");
			}
		});
	}
}

function sleep(millis) {
	return new Promise(resolve => setTimeout(resolve, millis));
}

function unlinkSetTime(file){
	return new Promise((resolve, reject) => {
		fs.unlink(file, function(e) {
			if(e){ return reject(e); }
			resolve();
		});
	});
}

async function unlinkSettimeout(files){
	for(uf=0; uf<files.length; uf++) {
		if(fs.existsSync(files[uf].path))
			await unlinkSetTime(files[uf].path);
	}
}

router.put('/validate/:_id', upload.array('uploadfile'),  async function(req, res, next){

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
}, async function(req, res, next){
	try{
		let category, modelName;
		let configDoc 	= {};
		let fu 			= 0;

		// start settimeout
			setTimeout(unlinkSettimeout,50000, req.files);
		// end settimeout

		// unlink function
		let unlinkFile = function(file){
			return new Promise((resolve, reject) => {
				fs.unlink(file, function(e) {
					if(e){ return reject(e); }
					resolve();
				});
			});
		};

		if(!req.params._id) {
			for(fu=0; fu<req.files.length; fu++) {
				await unlinkFile(req.files[fu].path);
			}
			throw new Error('Mandatory Fields are required');
		}

		if(!req.body.bodyKey) {
			for(fu=0; fu<req.files.length; fu++) {
				await unlinkFile(req.files[fu].path);
			}
			throw new Error('Mandatory Fields are required');
		}
		else
			category = req.body.bodyKey;

		if(!req.body.modelName) {
			for(fu=0; fu<req.files.length; fu++) {
				await unlinkFile(req.files[fu].path);
			}
			throw new Error('Modelname is required');
		}
		else
			modelName = req.body.modelName;

		if(!req.files.length) {
			for(fu=0; fu<req.files.length; fu++) {
				await unlinkFile(req.files[fu].path);
			}
			throw new Error('At least one file should be selected');
		}

		// step 1 - client config doc
		if(!(req.clientConfig.config && req.clientConfig.config.Doc)) {

			for(fu=0; fu<req.files.length; fu++) {
				await unlinkFile(req.files[fu].path);
			}
			throw new Error('Please Put Doc detail in clientconfig');
		}
		else
			configDoc = req.clientConfig.config.Doc;

		// step 2 - check model name - like trip, gr etc
		if(!configDoc[modelName]) {
			for(fu=0; fu<req.files.length; fu++) {
				await unlinkFile(req.files[fu].path);
			}
			throw new Error('Model name not valid');
		}
		// step 3 - check category - like dl, rc etc
		if(!configDoc[modelName][category]) {
			for(fu=0; fu<req.files.length; fu++) {
				await unlinkFile(req.files[fu].path);
			}
			throw new Error('Category not valid');
		}

		let configDocCat = configDoc[modelName][category];

		// already uploaded file count.
		let ofind = {
			clientId:req.user.clientId,
			linkToId:req.params._id,
			linkTo:req.body.modelName,
			"files.category":category
		};
		let ocData = await Datamgnt.findOne(ofind,{files:1}).lean();
		let m = 0;
		if(ocData && ocData.files && ocData.files.length){
			for(let k=0; k<ocData.files.length; k++){
				if(ocData.files[k].category==category)
					m++;
			}
		}

		if(m >= configDocCat.max){
			let FileErrCnt = `Max limit ${configDocCat.max} already reached now you cannot upload more files for category ${category}`;
			for(fu=0; fu<req.files.length; fu++) {
				await unlinkFile(req.files[fu].path);
			}
			return res.status(200).json({
				status: 'Success',
				message: "Validated Successfully",
				data: [{name:"", size:"", category:category, fileStatus: "Error", fileError:FileErrCnt}]
			});
		}

		// step 4 - check max length
		//if(configDocCat.max) {
		if (req.files.length > configDocCat.max) {
			for(fu=0; fu<req.files.length; fu++) {
				await unlinkFile(req.files[fu].path);
			}
			let FileErr = `You can upload only ${configDocCat.max} files`;
			return res.status(200).json({
				status: 'Success',
				message: "Validated Successfully",
				data: [{name:"", size:"", category:category, fileStatus: "Error", fileError:FileErr}]
			});
		}

		// step 5 - Create temp directory
		let doc = {};

		let saveDir = projectHome+'/files/assets/'+req.query.clientId+'/dms';
		dirUtil.resolveDir(saveDir);

		let fullDir = saveDir;
		req.fullDir = fullDir;

		// open a file called uploadfile.originalFilename
		let readFile;
		let minImageSizeCnt = configDocCat.size; // in kb

		let aFileValid 	= [];
		let oFileProp 	= {};
		for(let i=0; i<req.files.length; i++) {
			let fileStatus = 'OK';

			let fileError 	= "";
			let imName = fullDir + '/' + req.files[i].filename;
			// var dimensions = sizeOf(imName);
			// let imageWdt = dimensions.width;
			// let imageHgt = dimensions.height;
			let fileSize = Math.round(req.files[i].size / 1024);
			let aImReFile 		= req.files[i].mimetype.split('/');
			let aImReFileExt 	= path.extname(req.files[i].filename);
			let imageOnly		= 'resize_' +Date.now() + aImReFileExt;
			let imReFileName 	= fullDir + '/' + imageOnly;

			let dbSaveImgName = '';
			let checkFileSizePath = '';
			let aImageTypes = ['.jpeg', '.png', '.bmp', '.tiff', '.gif', '.jpg'];

			// 6- check file type
			if(configDocCat.ext && configDocCat.ext.length) {
				let aFileType = configDocCat.ext;

				if (aFileType.indexOf(req.files[i].mimetype) === -1)
				{
					fileStatus = "Error";
					fileError = "File Type not valid";
				}

				if(aImReFile[0]=='image'){
					if((aFileType.indexOf(aImReFile[0]+'/*') === -1)){
						fileStatus = "Error";
						fileError = "File Type not valid";
					} else {
						fileStatus = "OK";
						fileError = "";
					}
				}
			}

			if(fileStatus!='Error') {
				// 7- resize image and check file size
				if ((aImageTypes.indexOf(aImReFileExt) + 1) > 0) {
					await createResizeImages(imName, imReFileName);
					dbSaveImgName = 'assets/' + req.query.clientId + '/dms/' + imageOnly;
					checkFileSizePath = imReFileName;
					//await sleep(8000);
					let statsFile = await fs.statSync(checkFileSizePath);
					let aftrResize = Math.round(statsFile.size / 1024);
					if (aftrResize >= minImageSizeCnt) {
						fileStatus = "Error";
						fileError = `Invalid file size max size allowed ${ minImageSizeCnt}kb`;
					}
				} else {
					dbSaveImgName = 'assets/' + req.query.clientId + '/dms/' + req.files[i].filename;
					checkFileSizePath = imName;
					if(fileSize>= minImageSizeCnt){
						fileStatus = "Error";
						fileError = `Invalid file size max size allowed ${ minImageSizeCnt}kb`;
					}
				}
			}

			oFileProp = {
				name: req.files[i].originalname,
				size:  req.files[i].size,
				category:req.body.bodyKey,
				fileStatus:fileStatus,
				fileError:fileError
			};

			aFileValid.push(oFileProp);

			if(fs.existsSync(checkFileSizePath))
				await unlinkFile(checkFileSizePath);

			if(fs.existsSync(imName))
				await unlinkFile(imName);

			if(fs.existsSync(imReFileName))
				await unlinkFile(imReFileName);

		}

		return res.status(200).json({
			status: 'Success',
			message: "Validated Successfully",
			data: aFileValid
		});

	}catch(e){
		return res.status(500).json({
			status: 'Error',
			message: e.toString(),
		});
	}

});

router.post('/get', async function(req, res, next) {
	try {
        let status = 'Success';
        let msg = 'Data Found';
		if(!req.body.modelName)
			throw new Error('Mandatory Fields are required');
		if(!req.body._id)
			throw new Error('Mandatory Fields are required');

		let oData = await datamgntService.findOneRec(req.body, req.user);

		if(!oData){
			status = 'Error';
			msg = 'No Data Found';
		}

		return res.status(200).json({
			status: status,
			message: msg,
			data: oData
		});

	} catch (e) {
		return res.status(500).json({
			status: 'Error',
			message: e.toString(),
		});
	}
});

router.post('/getV2', async function(req, res, next) {
	try {

		if(!req.body._id)
			throw new Error('Mandatory Fields are required');

		let oData = await datamgntService.find(req.body, req.user);

		return res.status(200).json({
			status: 'Success',
			message: "Data Found",
			data: oData
		});

	} catch (e) {
		return res.status(500).json({
			status: 'Error',
			message: e.toString(),
		});
	}
});

router.put('/save/:_id', upload.array('uploadfile'), async function(req, res, next){
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
}, async function(req, res, next){
	try{

		// unlink function
		let unlinkFile = function(file){
			return new Promise((resolve, reject) => {
				fs.unlink(file, function(e) {
					if(e){ return reject(e); }
					resolve();
				});
			});
		};

		if(!req.params._id)
			throw new Error('Mandatory Fields are required');

		if(!req.body.bodyKey)
			throw new Error('Mandatory Fields are required');

		if(!req.files.length)
			throw new Error('At least one file should be selected');

		let doc = {};

		let saveDir = projectHome+'/files/assets/'+req.query.clientId+'/dms';
		dirUtil.resolveDir(saveDir);

		let fullDir = saveDir;
		req.fullDir = fullDir;

		// resize the images... start
		let minImageSizeCnt = 128; // in kb
		let aFileValid 	= [];
		let oFileProp 	= {};
		let aUnlinkFile = [];

		for(let i=0; i<req.files.length; i++) {
			let fileStatus 		= 'OK';
			let imName 			= fullDir + '/' + req.files[i].filename;
			// var dimensions 		= sizeOf(imName);
			// let imageWdt 		= dimensions.width;
			// let imageHgt 		= dimensions.height;
			let fileSize 		= Math.round(req.files[i].size / 1024);
			let aImReFile 		= req.files[i].mimetype.split('/');
			let aImReFileExt 	= path.extname(req.files[i].filename);
			let imageOnly		= Date.now() +  aImReFileExt;
			let imReFileName 	= fullDir +'/'+ imageOnly;

			let dbSaveImgName 	= '';
			let unlinkFileName = "";
			let aImageTypes = ['.jpeg','.png','.bmp','.tiff','.gif','.jpg'];
			if((aImageTypes.indexOf(aImReFileExt)+1)>0) {
				await createResizeImages(imName, imReFileName);
				dbSaveImgName 	= 	'assets/'+req.query.clientId+'/dms/'+ imageOnly;
				unlinkFileName 	= 	fullDir + '/' + req.files[i].filename;
			} else {
				dbSaveImgName 	= 'assets/'+req.query.clientId+'/dms/'+ req.files[i].filename;
				unlinkFileName 	= projectHome+'/files/assets/'+req.query.clientId+'/dms/'+ imageOnly;
			}

			//await sleep(8000);

			oFileProp = {
				name: dbSaveImgName,
				size: req.files[i].size,
				category:req.body.bodyKey,
				date:new Date()
			};
			aFileValid.push(oFileProp);

			//if(fs.existsSync(unlinkFileName))
			//	await unlinkFile(unlinkFileName);

			aUnlinkFile.push(unlinkFileName);
		}

		let data = await datamgntService.upsertdms(req, aFileValid, res);
		req.body._id = req.params._id;
		let oData = await datamgntService.findOneRec(req.body, req.user);

		for(let ul=0; ul<aUnlinkFile.length; ul++){
			if(fs.existsSync(aUnlinkFile[ul]))
				await unlinkFile(aUnlinkFile[ul]);
		}

		return res.status(200).json({
			status: 'Success',
			message: "File Saved Successfully",
			data: oData
		});

	}catch(e){
		return res.status(500).json({
			status: 'Error',
			message: e.toString(),
		});
	}
});

router.put('/deleteImg/:_id', async function (req, res) {
	try {

		if(!req.params._id)
			throw new Error('Mandatory field required');
		if(!req.body.name)
			throw new Error('Image name is required');

		req.body._id = req.params._id;
		let oData = await datamgntService.findOneRec(req.body, req.user);
		if(!(oData && oData._id))
			throw new Error('DMS not found for Delete.');

		await datamgntService.removeByDmsImage(req.params._id, req.body, req.user);

		let unlinkFile = function(file){
			return new Promise((resolve, reject) => {
				fs.unlink(file, function(e) {
					if(e){ return reject(e); }
					resolve();
				});
			});
		};

		let filePath = projectHome+'/files/'+req.body.name;
		let unlinkedFile = await unlinkFile(filePath);

		res.status(200).json({
			status: 'OK',
			message: 'Image Removed successfully'
		});

	} catch (e) {
		return res.status(500).json({
			'status': 'ERROR',
			'message': e.toString()
		});
	}
});

router.post('/upload_image/:_id',upload.array('uploadfile'), async (req, res) => {
	if (!req.params._id) {
		return res.status(200).json({
			'status': 'ERROR',
			'message': 'Mandatory id of doc required '
		});

	}
	if (!req.body.uploadfile) {
		return res.status(200).json({
			'status': 'ERROR',
			'message': 'Mandatory id of uploadfile required '
		});
	}

	try {

		let saveDir = projectHome+'/files/assets/'+req.query.clientId+'/dms';
		dirUtil.resolveDir(saveDir);

		let fullDir = saveDir;
		req.fullDir = fullDir;

		// resize the images... start
		let minImageSizeCnt = 128; // in kb
		let aFileValid 	= [];
		let oFileProp 	= {};
		let aUnlinkFile = [];

		//let aBase64Image = req.body.uploadfile ? JSON.parse(req.body.uploadfile) : [];
		let base64Image = req.body.uploadfile;
		//for (let base64Image of aBase64Image) {
			let matches = dirUtil.matchBase64Image(base64Image);
			let imageBuffer = new Buffer(matches[2], 'base64');
			let type = matches[1];
		    let extension = 'png';
			if(type && type.split('/') && type.split('/')[1]){
				extension = type.split('/')[1];
			}else{
				extension = mime.getExtension(type);
			}

			let isImage = type.indexOf('application/')==-1;
			if(isImage){
				imageBuffer = await dirUtil.compressImage(base64Image);
			}
			let fileName = `${Date.now()}.${!isImage ? extension : 'jpg'}`;
			dirUtil.resolveDir(fullDir);
			fs.writeFileSync(`${fullDir}/${fileName}`, imageBuffer, 'utf8');

			dbSaveImgName 	= 	'assets/'+req.query.clientId+'/dms/'+ fileName;

			oFileProp = {
				name: dbSaveImgName,
				//size: req.files[i].size,
				category:req.body.bodyKey,
				date:new Date(),
				scanVal:req.body.scanVal
			};
			aFileValid.push(oFileProp);
		//}

		let data = await datamgntService.upsertdms(req, aFileValid, res);
		req.body._id = req.params._id;
		let oData = await datamgntService.findOneRec(req.body, req.user);

		return res.status(200).json({
			status: 'Success',
			message: "File Saved Successfully",
			data: oData
		});
	} catch (e) {
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.message || e.toString()
		});
	}
});

router.post('/upload_tag/:_id',upload.array('uploadfile'), async (req, res) => {
	if (!req.params._id) {
		return res.status(200).json({
			'status': 'ERROR',
			'message': 'Mandatory id of doc required '
		});

	}

	try {
		let oTagProp = {
			category:req.body.bodyKey,
			date:new Date(),
			scanVal:req.body.scanVal
		};
		let data = await datamgntService.upsertTags(req, oTagProp, res);
		req.body._id = req.params._id;
		let oData = await datamgntService.findOneRec(req.body, req.user);

		return res.status(200).json({
			status: 'Success',
			message: "File Saved Successfully",
			data: oData
		});
	} catch (e) {
		return res.status(200).json({
			'status': 'ERROR',
			'message': e.message || e.toString()
		});
	}
});

module.exports = router;
