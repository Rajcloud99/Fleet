const fs = require("fs");
const Jimp = require("jimp");

function otherUtilClass(oUtils) {
	//put any default configs
}
otherUtilClass.isAllowedFilter = function (sFilter, aAllowedFilter) {
	var isAllowed = false;
	if (aAllowedFilter.indexOf(sFilter) >= 0) {
		isAllowed = true;
	}
	return isAllowed;
};

otherUtilClass.resolveDir = function (dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
};

otherUtilClass.doFileExist = function (path) {
	if (fs.existsSync(path)) return true;
	else return false;
};

otherUtilClass.copyFile = function (
	pathToFile,
	pathToNewDestination,
	callback
) {
	fs.copyFile(pathToFile, pathToNewDestination, function (err,resp) {
		if (err) {
			//TODO later send it to UI
			console.error(err && err.message);
			callback(err,'copied');
			// throw err
		} else {
			// console.log("Successfully copied and moved the file!");
			callback(err,'copied');
		}
	});
};

otherUtilClass.copyFileAsync = async (pathToFile, pathToNewDestination) => {
	return new Promise((resolve, reject) => {
		otherUtilClass.copyFile(pathToFile, pathToNewDestination, (err, res) => {
			if(err) return reject(err);
			resolve(res);
		});
	});
};

otherUtilClass.matchBase64Image = matchBase64Image;

otherUtilClass.compressImage = function compressImage(base64String) {
	return new Promise(function (resolve, reject) {
		let decodedImg = matchBase64Image(base64String);
		let type = decodedImg[1];
		let image = new Buffer(decodedImg[2], "base64");
		if (["image/jpeg", "image/png"].indexOf(type) != -1) {
			Jimp.read(image, (err, image) => {
				if (err) throw err;
				else {
					image.quality(60).getBase64(Jimp.MIME_JPEG, function (err, src) {
						resolve(new Buffer(matchBase64Image(src)[2], "base64"));
					});
				}
			});
		} else resolve(image);
	});
};

otherUtilClass.toBase64 = async (file) => {
	return new Promise((resolve) => {
		fs.readFile(file, (err, data) => {
			if (err || !data) {
				console.log(err);
				return resolve(false);
			}
			resolve(data.toString("base64"));
		});
	});
};

module.exports = otherUtilClass;

function matchBase64Image(base64Image) {
	return base64Image.match(/^data:([A-Za-z-.+\/]+);base64,(.+)$/);
}
