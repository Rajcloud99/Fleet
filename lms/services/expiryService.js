const BillBook = commonUtil.getModel('driver');
const GR = commonUtil.getModel('tripGr');
const logsService = commonUtil.getService('logs');

const moment = require('moment');

module.exports = {
	expiryDateAlertDaily,
};

 function expiryDateAlertDaily() {
	 let oDelta = {};

	 console.log(req.user);
	 console.log(req.body);

	 let aGrData  = GR.find({"eWayBills.expiry":{"$lte":new Date()}});
	 if(aGrData && aGrData.length>0){
		 // for(i=0; i<aGrData.length; i++){
			// GR.updateOne({_id:aGrData[i]._id}, {
			// 	$set: {
			// 	 	"eWayBills.markExp":true
			// 	 }
			//  });
		 //
			//  oDelta = {
			// 	 "Success": {
			// 		 count: vCr,
			// 		 status: "Success",
			// 		 message: msg
			// 	 }
			//  };
		 //
			//  logsService.addLog('expiryAlert', {
			// 	 uif: "expiryAlert-" + new Date().toLocaleString(),
			// 	 docId: req.user._id,
			// 	 category: 'ExpiryAlert',
			// 	 delta: oDelta
			//  }, req);
		 // }
	}
 }

