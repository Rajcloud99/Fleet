var express = require('express');
var router = express.Router();
var oPaymentOptions = [{code:'NA',desc:'NA'},
	{code:'ADV',desc:'100% Advance'},
	{code:'8A2D',desc:'80% Advance 20% on delivery'},
	{code:'7A3D',desc:'70% Advance 30% on delivery'},
	{code:'5A5D',desc:'50% Advance 50% on delivery'},
	{code:'DEL',desc:'100% on delivery'}];
var oPaymentModes = ['NA','Internet','Wallet','Cash','Check'];
var oData  = { modes:oPaymentModes,options:oPaymentOptions};
router.get("/payment/:app_key", function (req, res) {
	if(req.params["app_key"] ==commonUtil.getConfig("app_public_api")){
	   res.status(200).json({"status": "OK","data":oData});
	}
	else{
		res.status(500).json({"status": "ERROR", "error_messages": "app_key is not correct"});
	}
});

module.exports = router;
