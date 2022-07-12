var fs = require('fs');
var mongoose = require('mongoose');
//var Grid = require('gridfs-stream');
function allowFiles(reqData,allowedFiles){
	if(Object.keys(reqData.files).length>0){
		for (let f in reqData.files){
			if(allowedFiles.indexOf(f)===-1){
				delete reqData.files[f];
			}
		}
	}
}
async function singleFileUpload(requestedFile,requestData,collectionName,fn){
	let file_id;
	let db = mongoose.connection.db;
	let mongoDriver = mongoose.mongo;
	let gfs = new Grid(db,mongoDriver);
	let writestream = gfs.createWriteStream({
		filename: fn ? `${fn}${requestedFile.name.slice(requestedFile.name.lastIndexOf('.'))}` : requestedFile.name,
		mode: 'w',
		root: 'DocumentsBucket',
		content_type: requestedFile.type,
		metadata: {
			collection:collectionName,
			clientId:requestData.user.clientId
		}
	});
	fs.createReadStream(requestedFile.path).pipe(writestream);
	let onFileClose = function(file){
		return new Promise((resolve, reject) => {
			writestream.on('close', (fileSaved)=>{
				resolve(fileSaved)
			});
			writestream.on('error', reject); // or something like that
		});
	};
	let unlinkFile = function(file){
		return new Promise((resolve, reject) => {
			fs.unlink(file, function(e) {
				if(e){ return reject(e); }
				resolve();
			});
		});
	};
	try {
		try {
			let savedFile = await onFileClose(requestedFile);
			file_id = savedFile._id;
		}catch (e) {
			console.log("File on close error: "+JSON.stringify(e))
		}finally {
			let unlinkedFile = await unlinkFile(requestedFile.path);
		}
	}catch (e) {
		console.log("File unlink error: "+JSON.stringify(e));
	}
	return file_id;
}

module.exports.uploadFiles=async function(reqData,collectionName,collectionData,allowedFiles){
	//allowFiles(reqData,allowedFiles);
	if(Object.keys(reqData.files).length>0){
		for (let f in reqData.files){
			if(reqData.files.hasOwnProperty(f)) {
				try {
					let uploadFileId = await singleFileUpload(reqData.files[f],reqData,collectionName,f);
					if(collectionData.documents && collectionData.documents.length>0){
						let index = collectionData.documents.findIndex(function(o){return o.name===f});
						if(index>-1){
							collectionData.documents[index].docReference = uploadFileId;
						}else {
							collectionData.documents.push({name:f,docReference:uploadFileId})
						}
					}else {
						collectionData.documents = [];
						collectionData.documents.push({name:f,docReference:uploadFileId})
					}
				}catch (e) {
					console.log("uploadFiles function error: "+JSON.stringify(e))
				}
			}
		}
	}
};
