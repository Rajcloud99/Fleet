var qr = require('node-qr-image');
var fs = require('fs');
var crypto = require('crypto');
var password = "Fut1ureTr1ucks";

var oQRDriver = {
	'_id':'4566edgdcgrt7776678dcc',
	'driverFTId':'FT00034',
	'driverName':'Manish Jangid',
	'driverMobile':'9911179163',
	'dob':new Date(),
	'driverAddress':'Okhla phase 2, F35/3, Delhi, India',
	'driverLicenseNo':'DFFWWWWS',
	'driverOtherIDType':'driving license',
	'driverOtherIDNo':'22222222222',
	'driverOtherIDType1':'driving license2',
	'driverOtherIDNo1':'22222222222'
};

var qrOptions = {
	ec_level:'M',
	type: 'png',
	size:200
};

var delimiter = "|";

var secret = "futuretrucks";

var qrGenerator = function(inpQRObj,callback){
	var oQrObject;
	if (!inpQRObj){
		oQrObject = oQRDriver;
	} else{
		oQrObject = inpQRObj;
	}

	console.log(oQrObject);
	try{
		var filePath = projectHome +"/files/users/qr_drivers/DRIVER_QR_" + oQrObject.driverId +".png";

			var qrString = oQrObject._id + delimiter 
				+ oQrObject.driverFTId + delimiter 
				+ oQrObject.driverName + delimiter 
				+ oQrObject.driverMobile +delimiter 
				+ getDDMMYYYY(oQrObject.dob) +delimiter 
				+ oQrObject.driverAddress + delimiter 
				+ oQrObject.driverLicenseNo +delimiter 
				+ oQrObject.driverOtherIDType + delimiter 
				+ oQrObject.driverOtherIDNo +delimiter 
				+ oQrObject.driverOtherIDType1 + delimiter 
				+ oQrObject.driverOtherIDNo1 +delimiter ;

			console.log("qrstring  "  + qrString);

			var encrypted_qr_string = encrypt (qrString,password);

			console.log("encrypted base64" +encrypted_qr_string);

			var qr_png = qr.image(encrypted_qr_string, qrOptions);
			
			var stream = qr_png.pipe(fs.createWriteStream(filePath));
			
			var path = "qr_drivers/DRIVER_QR_" + oQrObject.driverId +".png";

			stream.on('finish', function(){
				callback(null,path);
			});

	} catch(err){
		console.log(__filename + " "+ err);
		callback(err,null);
	}
	

	// Decrypt 
	//var bytes  = CryptoJS.AES.decrypt(encrypted_qrstring, secret);
	//var plaintext = bytes.toString(CryptoJS.enc.Utf8);
	//console.log(plaintext);
};

function fileExists(filePath){
   try{
        return fs.statSync(filePath).isFile();
    }
    catch (err){
        return false;
    }
}

function encrypt(text,password){
	var cipher = crypto.createCipher('aes-128-ecb',password);
	var crypted = cipher.update(text,'utf-8','base64');
	crypted += cipher.final('base64');
	//now crypted contains the hex representation of the ciphertext
	return crypted;
};

function getDDMMYYYY(dateNow){
	var dateNow = dateNow || new Date();
	if(dateNow.getMonth()<9){
		dMonth = "0" + (dateNow.getMonth() +1).toString();
	}else{
		dMonth = (dateNow.getMonth() +1).toString();	
	}
	if(dateNow.getDate()<10){
		dDate =  "0" + dateNow.getDate().toString();
	}else{
		dDate =  dateNow.getDate().toString();
	}
	var postingDate = dDate +"/"+ dMonth + "/" + dateNow.getFullYear().toString();
	return postingDate;
};

module.exports.qrGenerator = qrGenerator;