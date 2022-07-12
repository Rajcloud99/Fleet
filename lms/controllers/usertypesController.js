var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var winston = require('winston');
var fs = require("fs");

var usertypes = [{"label":"customer","description":"Client"}
				,{"label":"transporter","description":"Transporter"}
				,{"label":"sl","description":"Shipping Line"}
				,{"label":"cha","description":"CHA"}
				,{"label":"truck_owner","description":"RegisteredVehicle Owner"}]; //type of customers to show

router.get('/:app_key', function (req, res) {
	if(req.params['app_key'] ==commonUtil.getConfig('app_public_api')){
		res.status(200).json({"status":"OK", "data":usertypes});  
	}
	else{
		res.status(500).json({'status': 'ERROR', 'error_messages': "app_key is not correct"});
	}
});

module.exports = router;
