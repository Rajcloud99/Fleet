var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var winston = require('winston');
var fs = require("fs");

var data = {"gpsImagePaths":{"path0":"gps_1.jpg","path1":"gps_2.jpg"
	,"path2":"gps_3.jpg"},"gpsfeatures":{"feature1":"SOS alarm. " +
			"You can alert your alarm in the case of danger.",
			"feature2":"Tele-cut off (petrol / electricity) function. " +
			"In case the vehicle is stolen, the users can send " +
			"command from the platform to cut off the Petrol/Electricity " +
			"to stop the vehicle from moving.","feature3":"Over speed alarm." +
			" When the vehicle is moving over a limited speed, then " +
			"the device will send over speed alarm SMS to user."
			,"feature4":"Built-in 450mAh battery for alarm when " +
			"the power supply is disconnected unexpectedly.",
			"feature5":"Voice monitor function, When a special " +
			"number dials device, after ringing for 10" +
			" seconds, it will enter voice monitoring status." +
			" At this time, caller can monitor the sound in vehicle."
			,"feature6":"Built-in GSM & GPS antenna. High sensitive" +
			" GPS chipset.Location check facility via platform"
			,"feature7":"Three LED indicators: GPS - Blue; GSM - Green;" +
			" Power - Red. Low battery alarm. " +
			"Built-in ON / OFF power, wide voltage " +
			"input range"}};

router.get('/:app_key', function (req, res) {
	if(req.params['app_key'] ==commonUtil.getConfig('app_public_api')){
		res.status(200).json({"status":"OK", "data":data});  
	}
	else{
		res.status(500).json({'status': 'ERROR', 'error_messages': "app_key is not correct"});
	}
});

module.exports = router;
