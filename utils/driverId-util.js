var PDFDocument = require('pdfkit');
var fs=require('fs');
var folderPath = projectHome +"/files/users/";
//var photoPath = projectHome +"/files/lala.jpg";
var logoPath = projectHome+"/files/logo_card_color.png";
//var qrPath = projectHome+"/files/users/qr_drivers/DRIVER_QR_56c368318115042e493eff65.png";
var fontGudea = projectHome+"/files/Gudea-Bold.ttf";
var fontVarRound = projectHome+"/files/VAG Rounded Bold.ttf";
var appLink = "https://goo.gl/khpPCW";
var waterMarkPath = projectHome + "/files/watermark_futuretrucks.png";
var PDFImage = require("pdf-image").PDFImage;
var contactUs = "Contact Us :\nAKH Tech Logistics P. Ltd. (FutureTrucks),"+
" F-35/3, Okhla Industrial Area, Phase-II, New Delhi-110020, Phone : +919891705019";
var tncDeclaration = "**Information subject to terms and conditions of "+
"FutureTrucks. Please visit our website for more info.**";

//width   1011
//{margins:{top:63,bottom:63,left:80,right:80} 
//height  638
//i card size ID1 3.370 × 2.125 in
//radius 2.88–3.48 mm // CR80
//fill is f7f7f7ff

module.exports.generateDriverIDPreview =  function(oDriver, callback){
		shortPath = "driverIdCard/DRIVER_IDCARD_"+oDriver._id+".pdf";
		filePath_ = folderPath+shortPath;
		try{
			console.log(oDriver.qrImageFilePath);
			if (!oDriver.first_name || (!oDriver.first_name && !oDriver.last_name)){
				return callback({'status':'ERROR','message':'driver name absent'},null);
			}

			if(!oDriver.driver_image){
				return callback({'status':'ERROR','message':'driver image is not present'},null);
			}

			if(!oDriver.address_line_1 && !oDriver.address_line_2 
				&& !oDriver.area && !oDriver.city){
				return callback({'status':'ERROR','message':'driver address not present'},null);
			}

			if (!oDriver.license_no){
				return callback({'status':'ERROR','message':'driver license no. not present'},null);
			}

			if (!oDriver.date_of_birth){
				return callback({'status':'ERROR','message':'driver date of birth not present'},null);
			}
			if (!oDriver.DRIVERID){
				return callback({'status':'ERROR','message':'DRIVERID not present'},null);
			}

			var doc = new PDFDocument({margin:63,font:'Times-Roman',size:[1011,638]});
			var stream = doc.pipe(fs.createWriteStream(filePath_));		
			driverCardFront(doc,oDriver);
			driverCardBack(doc,oDriver);
			doc.end();
			stream.on('finish', function(){
				console.log("done preview generation");
				callback(null,shortPath);
			});
		} catch(err){
			console.log("some error in driverid util " +err);		
		}
};


module.exports.generateDriverIDImages=  function(oDriver, callback){
		shortPath = "driverIdCard/DRIVER_IDCARD_"+oDriver._id+".pdf";
		filePath_ = folderPath+shortPath;

		if (!fileExists(filePath_)){
			var err = {'status':'ERROR','message':'File preview has to be run first'};
			return callback(err,null);
		}
				
		try{
			var pdfImage = new PDFImage(filePath_);
			var filePathObj = {};
			pdfImage.convertPage(0).then(function (imagePath) {
  					// (first page)
  				console.log("generated page 0 " + imagePath);
  				filePathObj.front_image = "driverIdCard" +imagePath.substring(imagePath.lastIndexOf("/"));
  				pdfImage.convertPage(1).then(function (imagePath) {
  					//second page
  					console.log("generated page 1" + imagePath);
  				 	filePathObj.back_image = "driverIdCard" +imagePath.substring(imagePath.lastIndexOf("/"));
  				 	callback(null,filePathObj);
				}, function (err) {
      				callback(err,null);
    			});
			}, function (err) {
      			callback(err,null);
    		});
		} catch(err){
			console.log("some error in driverid util images " +err);
		}
};

function driverCardFront(doc,oDriver){
		
		doc.image(waterMarkPath,0,0,{width:doc.width},{height:doc.height});
		doc.fillColor('#28beb4').font(fontVarRound).fontSize(67).text("DRIVER CARD ",{width:582});	
		doc.fillColor('black').font(fontGudea).fontSize(42).text(oDriver.DRIVERID,63,146,{width:582});

		var name = "Name : " + oDriver.first_name ;
		if (oDriver.last_name){
			name = name + " " + oDriver.last_name ;
		}
		
		doc.fontSize(33).text(name,63,208,{width:582});

		var dateofBirth = "";
		var year = oDriver.date_of_birth.getFullYear();
		var month = oDriver.date_of_birth.getMonth() + 1 ;
		var day = oDriver.date_of_birth.getDate();
		if (month<10){
			month  = "0"+month;
		}
		if (day<10){
			day ="0" + day;
		}
		dateofBirth = "DOB : " + day +"/" + month + "/"+ year;
		doc.fontSize(33).text(dateofBirth,{width:582});

		var licenseNo  = "License No. : " + oDriver.license_no;
		doc.fontSize(33).text(licenseNo,{width:582});

		var address = "Address : ";
		if (oDriver.address_line_1){
			address = address + oDriver.address_line_1;
		}
		if (oDriver.address_line_2){
			address = address +" ,"+ oDriver.address_line_2;
		}
		if (oDriver.area){
			address = address + " ," +oDriver.area;
		}
		if (oDriver.city){
			address = address + " ," + oDriver.city;
		}
		if (oDriver.district){
			address = address + " ,"+oDriver.district;
		}
		if (oDriver.state){
			address = address + " ,"+oDriver.state;
		}
		if (oDriver.pincode){
			address = address + " ,"+oDriver.pincode;
		}
		if (address.length>150){
			address = address.substr(0,150);
		}
		

		doc.fillColor('black').font(fontGudea)
			.fontSize(33).text(address,{width:582});
		var photoPath = folderPath + oDriver.driver_image;
		doc.image(photoPath,699,63,{width:250},{height:250});
		var qrPath  = folderPath + oDriver.qrImageFilePath;
		doc.image(qrPath,699,330,{width:250},{height:250});
		doc.image(logoPath,63,485,{scale:0.83});

};

function driverCardBack(doc,oDriver){
		doc.addPage();
		doc.image(waterMarkPath,0,0,{width:doc.width},{height:doc.height});
		doc.fontSize(33).text(contactUs);
		doc.moveDown();
		doc.fontSize(33).fillColor('black').font(fontGudea).text("Website : www.futuretrucks.in");
		doc.fontSize(33).text("Download app : "+ appLink);
		doc.fontSize(33).text(tncDeclaration,63,488);
};



function fileExists(filePath){
   try{
        return fs.statSync(filePath).isFile();
    }
    catch (err){
        return false;
    }
};