var express = require( 'express' );
var router = express.Router();
var Promise = require('bluebird');
var CustomerCallback = Promise.promisifyAll(commonUtil.getModel('callback_numbers'));

var notifyFT = function(newNo){
	var sGreetings = "New number  "+ newNo.mobile + " has enquired at " + new Date(newNo.created_at);
	var sBody = "Please callback this no."
   //var sSMS = sGreetings + sBody;
   // smsUtil.sendSMS(userResponse.mobile,sSMS);
	var sEmailMessage = "<b>" + sGreetings + "</b> <br>" + sBody;
	var mailOptions = {
		    to: 'Future Trucks ✔ <info@futuretrucks.in>', // list of receivers 
		    subject: 'Call back '+ newNo.mobile+' .✔', // Subject line 
		    text: 'Welcome from Future Trucks✔', // plaintext body 
		    html: '<br>'  +sEmailMessage+ '<br>'// html body 
		};
	emailUtil.sendMail(mailOptions);
};
var saveMobileNoForCallback = function ( req, res ) {
	var mobile = req.body.mobile;
	if(mobile){
		var newCustomerCallback = new CustomerCallback(req.body);
		newCustomerCallback.saveAsync()
		  .then(function(newNo) {
		      logger.info("New mobile no saved for callback: " + newNo);
		      if(newNo[0]){
		       notifyFT(newNo[0]);
		       return res.status( 200 ).json( {"status":"OK","message" :" New mobile no saved for callback: " + newNo[0].mobile} );
		      }
		      else{
		    	  notifyFT(newNo);
		    	  return res.status( 200 ).json( {"status":"OK","message" :" New mobile no saved for callback: " + newNo.mobile} );
		      }
		    }).catch(function(err) {
		      logger.error("Error in saveMobileNoForCallback: " + err.toString());
		      return next(err);
		    });
	}else {
		res.status(500).json( {"status":"ERROR","message" : "mobile no does not exist."} );
	}
}
router.post( '/', function ( req, res, next ) {
	saveMobileNoForCallback(req,res);
} );
module.exports = router;
