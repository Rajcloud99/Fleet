var express = require('express');
var router = express.Router();
var Promise = require('bluebird');

var gpsGaadiService = Promise.promisifyAll(commonUtil.getService('gpsGaadi'));


//*************************************************************************************************************************************************************************************************************************

router.post('/:app_key', function (req, res, next) {
  if(req.params['app_key'] ==commonUtil.getConfig('app_public_api')){
        var gpsGaadiData = req.body;
        gpsGaadiService.saveGpsGaadiContactAsync(gpsGaadiData)
        .then(function(gpsGaadi) {

                  var customer_name = gpsGaadi.contact_person_name;
                  
                  var gpsDepartmentMobileOne =9582775246;
                  var gpsDepartmentMobileTwo =7042447536;

                  var gpsDepartmentEmailOne = 'syed.mujtaba@gpsgaadi.com';
                  var gpsDepartmentEmailTwo = 'kanha@gpsgaadi.com';
                  
                  var messageToCustomer ='Dear ' + customer_name +', We have submitted your '+ gpsGaadi.type + ' details for subject: ' + gpsGaadi.subject +'. Thank you, we will get in touch with you soon. If you have any further queries please contact us at: '+ gpsDepartmentMobileOne +', ' + gpsDepartmentMobileTwo +'. you can also email us at: '+ gpsDepartmentEmailOne+', '+ gpsDepartmentEmailTwo +'.';
                  
                  var messageToGpsDepartment = 'Hi, Team GPS ,' + customer_name + ' have submitted ' + gpsGaadi.type + ' details for subject: '+ gpsGaadi.subject +'. Please get in touch with him. Thank You.';

                  if(typeof(gpsGaadi.mobile)!=='undefined'){
                    var customerMobile =gpsGaadi.mobile;
                    smsUtil.sendSMS(customerMobile, messageToCustomer);
                  }
                  
                  smsUtil.sendSMS(gpsDepartmentMobileOne, messageToGpsDepartment);
                  smsUtil.sendSMS(gpsDepartmentMobileTwo, messageToGpsDepartment);


                  if(typeof(gpsGaadi.email)!=='undefined'){
                        var mailToCustomer = {
                          to: customer_name+' ✔ <'+ gpsGaadi.email+'>', 
                          subject: customer_name +', your  '+ gpsGaadi.type + ' details submitted.✔', 
                          text: 'Welcome from GPSGaadi✔', 
                          html: '<br>'  + messageToCustomer + '<br>'
                      };
                        
                        emailUtil.sendMail(mailToCustomer);
                  }

                  var mailToGpsDepartmentOne = {
                          to: customer_name+' ✔ <'+ gpsDepartmentEmailOne+'>', 
                          subject: 'Team GPS ,'+ customer_name +' has submitted'+ gpsGaadi.type + ' details .✔', 
                          text: 'Welcome from GPSGaadi✔', 
                          html: '<br>'  + messageToGpsDepartment + '<br>'
                      };

                      emailUtil.sendMail(mailToGpsDepartmentOne);

                  var mailToGpsDepartmentTwo = {
                          to: customer_name+' ✔ <'+ gpsDepartmentEmailTwo+'>', 
                          subject: 'Team GPS ,'+ customer_name +' has submitted'+ gpsGaadi.type + ' details .✔', 
                          text: 'Welcome from GPSGaadi✔', 
                          html: '<br>'  + messageToGpsDepartment + '<br>'
                      };
                    emailUtil.sendMail(mailToGpsDepartmentTwo);

                  res.status(200).json({"status": "OK", "data":gpsGaadi, "message":"We have submitted your details, Thank you."});
               }
        )
  
        .catch(next);
  }else{
    res.status(500).json({'status': 'ERROR', 'error_messages': "application secure key is not correct"});
}});


//*********************************************************************************************************************************************************************************************************************************

module.exports = router;