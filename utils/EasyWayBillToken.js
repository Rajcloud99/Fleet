

const request = require('request-promise');
const moment = require("moment");

async function initloginToken(){
	if(!config.easyWayBill ||  !config.easyWayBill.login){
		return false;
	}
	try{
		const options = {
			method: 'POST',
			uri: config.easyWayBill.login.url,
			headers: {
				"Content-Type": "application/json",
			},
			json: config.easyWayBill.login.auth// Automatically stringifies the body to JSON
		};
		let data = await request(options);
		return data;
	}catch(e){
		console.error(e)
	}
}

exports.completeLogin = async function(){
	try{
		let loginToken = await initloginToken();
		if(!loginToken || !config.easyWayBill || !config.easyWayBill.login){
			console.error('initi login failed');
			return false;
		}
		const options = {
			method: 'POST',
			uri: config.easyWayBill.login.curl,
			headers: {
				"Content-Type": "application/json",
			},
			json: {
				"token": loginToken && loginToken.response && loginToken.response.token,
				"orgid": config.easyWayBill.login.orgid
			}
		};
		let data = await request(options);
		return data;
	}catch(e){
		console.error(e)
	}
}
