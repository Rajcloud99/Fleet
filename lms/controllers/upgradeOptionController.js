var express = require('express');
var router = express.Router();

var currAppVersion = "2.1.2";
var forceUpgrade = false;
var recommendUpgrade = false;

router.get('/:app_key', function (req, res) {
	if(req.params['app_key'] ==commonUtil.getConfig('app_public_api')){
		res.status(200).json({"status":"OK", "curr_app_version":currAppVersion, "force_upgrade":forceUpgrade,
				"recommend_upgrade":recommendUpgrade});  
	}
	else{
		res.status(500).json({'status': 'ERROR', 'error_messages': "app_key is not correct"});
	}
});

module.exports = router;
