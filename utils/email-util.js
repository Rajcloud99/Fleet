var nodemailer = require('nodemailer');
var fs = require('fs');
var path = require('path');

console.log("Email enabled :" +commonUtil.getConfig("enable_email"));

/***create reusable transporter object using the default SMTP transport ***/
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kamal.mewada@gmail.com',
        pass: 'kamal123'
    }
});

var defaultMailOptions = {
    from: 'LMS <kamal.mewada@gmail.com>', // sender address
    to: 'LMS <kamal.mewada@gmail.com>', // list of receivers
    subject: 'Greetings from LMS✔', // Subject line
    text: 'Greetings fron LMS', // plaintext body
};

var sGreetings = '<b>Greetings from LMS<br>  <br> </b>';
var sSignatures = '<br> <br> <b> Best Regards <br> LMS <br> ' ;

function sendMail(oMailOptions) {
    if(oMailOptions){
        defaultMailOptions = oMailOptions;
        if(oMailOptions.to && oMailOptions.to.length>1){
            oMailOptions.bcc = oMailOptions.to;
            oMailOptions.to = oMailOptions.to[0];
        }
        defaultMailOptions.html =  oMailOptions.html + sSignatures ;
        if (!oMailOptions.from){
            defaultMailOptions.from = 'LMS <kamal.mewada@gmail.com>';
        } else{
            defaultMailOptions.from = oMailOptions.from;
        }
    }
    //console.log(oMailOptions);
    if(commonUtil.getConfig("enable_email")){
        transporter.sendMail(defaultMailOptions, function(error, info){
            if(error){
                return console.log(error);
            }
            winston.info('Email sent: ' + info.response);
        });
    }
    return 1;
}

/***oMailOptions would contain
 contentType = 'application/pdf' for pdf
 attachments = [{
	       	filename : fileName ,
	       	path: fileAbsolutePath,
	       	contentType: contentType}]
 ***/
function sendMailWithAttachments(oMailOptions){
    var mailOptions = {
        to:  oMailOptions.to,
        from : oMailOptions.from,
        subject: oMailOptions.subject,
        text: oMailOptions.text,
        html: oMailOptions.html,
        attachments: oMailOptions.attachments
    };
    sendMail(mailOptions);
}

module.exports.mailToRepoOwners = function(logText, callback){
    var oMailOptions = {
        from: 'LMS <kamal.mewada@gmail.com>', // sender address
        to: constants.repoOwnerEmails, // list of receivers
        subject: ' ', // Subject line
        text: ' ' + logText, // plaintext body
    };
    sendMail(oMailOptions,callback);
};

module.exports.sendMail =  sendMail;
module.exports.sendMailWithAttachments = sendMailWithAttachments;
