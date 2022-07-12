var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var winston = require('winston');
var fs = require("fs");

var imagePath = "HOMENOTIF19-03-2016.png" ; // naming format has to be HOMENOTIFdd-mm-yyyy.ext
var types = {"1":"transporter","2":"truck_owner","3":"customer"}; //type of customers to show

router.get('/:app_key', function (req, res) {
	if(req.params['app_key'] ==commonUtil.getConfig('app_public_api')){
		res.status(200).json({"status":"OK", "show":"YES", "types":types, "imagePath":imagePath});  
	}
	else{
		res.status(500).json({'status': 'ERROR', 'error_messages': "app_key is not correct"});
	}
});

module.exports = router;
