var Promise = require('bluebird');
//var gcm = require('node-gcm');

/*var sendGCMNotification = function(oNotification){
 var message = new gcm.Message({
	//collapseKey: 'demo',
	priority: 'high',
	contentAvailable: true,
	delayWhileIdle: true,
	timeToLive: 3,
	//dryRun: true,
	data: oNotification.data,
    notification: oNotification.notification
});
 
 var regTokens = oNotification.registrationTokens;
 //["APA91bEXGCvVyDilqcTHm4TeTJ-SYGhZbVL_90AAmIaZjV1Y9uvVjtgecUGOw_WTyzPhXF7NPuyMDgW0VJ89QCFsE24a1f-dXJd6fh6X3uDNPX9rxpRpVSydP-CbdF5OR-loZuD6fWfs","APA91bFMwDeG0XbGJTUeZnYSdOrxWSGI_h_L7R-F9JWljdpPcTfCYKyH7u4mJAPQzigOH6y4ukPvnNsnmlXZWpKhkDTCP2hTeaFs7SIgztJdxwFN-7eOWlmeLwX8XqBbE8x_N3pu8c7w"];
  // Set up the sender with you API key 
 var gcmSenderKey = commonUtil.getConfig('gcmSenderKey');
 var sender = new gcm.Sender(gcmSenderKey);
 // Now the sender can be used to send messages 
 console.log('gcm',oNotification);
 if(commonUtil.getConfig('enable_gcm')){
 	 sender.send(message, { registrationTokens: regTokens },10, function (err, response) {
	 if(err) console.error(err);
	 else 	console.log(response);
     });
 }else{
 	console.log('gcm notifications are disabled.');
 }
};
module.exports.sendGCMNotification =  sendGCMNotification;
//sendGCMNotification();*/
