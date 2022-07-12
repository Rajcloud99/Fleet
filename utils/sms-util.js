var request = require('request');

console.log("enable sms : ", commonUtil.getConfig('enable_sms'));

var oSMS = {
	url: "https://control.msg91.com/api/sendhttp.php?",
	authKey: "90583AUN4S4EKLn755dcb201",
	sender: 'FTruck',
	mobile: 9535888738,
	message: 'OTP for Future Trucks user registration is OTP : ',
	route: 4,
	unicode: 1,
	response: 'json',
	country: 91

};

function generateOtp() {
	var newOtp = Math.floor(Math.random() * 90000) + 10000;
	return newOtp;
}

module.exports.generateOtp = generateOtp;

function sendSMS(mobile, message, cb = () => {}) {
	oSMS.mobile = mobile;
	oSMS.message = message;
	smsUrl = oSMS.url + "authkey=" + oSMS.authKey + "&sender=" + oSMS.sender + "&route=" + oSMS.route + "&unicode=" + oSMS.unicode + "&country=" + oSMS.country + "&response=" + oSMS.response + "&mobiles=" + oSMS.mobile + "&message=" + oSMS.message;
	console.log(smsUrl);
	if (commonUtil.getConfig('enable_sms')) {
		request(smsUrl, function (error, response, body) {
			if (!error && (response.statusCode < 400)) {
				logger.info("SMS " + body, response.statusCode);
				return cb(null, body);
			} else {
				logger.error("failed SMS ", error);
				return cb(error, null);
			}
		});
	}
	return 1;
}

module.exports.sendSMS = sendSMS;
module.exports.verifyOTP = function (otp, savedOtp) {
	logger.info('in verify otp service', otp, savedOtp);
	if (otp == savedOtp) {
		return {"verified": true, "message": "Your OTP is verified"};
	} else {
		return {"verified": false, "message": "Your OTP does not match. Please re-enter or request a new OTP."};
	}
};
module.exports.resendSMS = function (mobile, message) {
	var newOtp = generateOtp();
	var cnt = sendSMS(mobile, message);
	return newOtp;
};

