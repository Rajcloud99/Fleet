/**
 * Initial version by: Nipun Bhardwaj
 * Initial version created on: 26/11/18
 */
const request = require('request');
const URL = require('url');
const FASTAG_HOST = commonUtil.getConfig('fastag_host');


exports.rechargeVehicleBalance = function (req, callback) {
	if(otherUtil.isEmptyObject(req)){
		return callback('Invalid request');
	}
	if(!req.customerId){
		return callback('customerId: not found');
	}
	if(!req.API_KEY){
		return callback('API_KEY: not found');
	}
	if(!req.RechargeDetails
		|| !Array.isArray(req.RechargeDetails)
		|| !req.RechargeDetails.length<1
	){
		return callback('RechargeDetails: must be array of object.');
	}
	for(let obj of req.RechargeDetails){
		if(typeof obj !== 'object'){
			return callback('RechargeDetails: must be array of object.');
		}
		if(!obj.RechargeAmount || !obj.VehicleNumber){
			return callback('RechargeDetails: every object in array must contain "RechargeAmount" and "VehicleNumber"');
		}
	}
	request.post({
		headers: {
			'content-type': 'application/json',
			'APIClient_ID': req.customerId,
			'API_KEY': req.API_KEY
		},
		url: url.resolve(FASTAG_HOST,"/Customer/RechargeVehicleBalance"),
		body: JSON.stringify({
			CustomerId: req.customerId,
			RechargeDetails: req.RechargeDetails
		})
	}, function (error, response, body) {
		if (body) body = JSON.parse(body);
		if (error) {
			return callback(error);
		}
		if (body.Status.toUpperCase() !== 'ACCEPTED') {
			return callback(body.Reason);
		}
		callback(null, body);
	});
};

exports.getTransactionDetails = function (req, callback) {
	if(otherUtil.isEmptyObject(req)){
		return callback('Invalid request');
	}
	if(!req.customerId){
		return callback('customerId: not found');
	}
	if(!req.API_KEY){
		return callback('API_KEY: not found');
	}
	if(!req.StartTransactionDate){
		return callback('StartTransactionDate: not found');
	}
	if(!req.EndTransactionDate){
		return callback('EndTransactionDate: not found');
	}
	let url = URL.resolve(FASTAG_HOST,"/Customer/GetTransactionDetails");
	let body = {
		CustomerId: req.customerId,
		VehicleNumber: req.VehicleNumber || null,
		StartTransactionDate: new Date(req.StartTransactionDate).toISOString(),
		EndTransactionDate: new Date(req.EndTransactionDate).toISOString(),
		PageNo: req.PageNo || 1
	};
	request.post({
		headers: {
			'content-type': 'application/json',
			'APIClient_ID': req.customerId,
			'API_KEY': req.API_KEY
		},
		url: "https://fastaglogin.icicibank.com/ISRCUSTAPI/Customer/GetTransactionDetails",
		//url: url,
		body: JSON.stringify(body)
	}, function (error, response, body) {
		try {
			if (body) body = JSON.parse (body);
			if (error) {
				return callback (error);
			}
			if (typeof body !=='object') {
				return callback (body);
			}
			callback (null, body);
		}
		catch (err) {
			return callback (err);
		}
	});
};

exports.getCreditTransactionDetails = function (req, callback) {
	if(otherUtil.isEmptyObject(req)){
		return callback('Invalid request');
	}
	if(!req.customerId){
		return callback('customerId: not found');
	}
	if(!req.API_KEY){
		return callback('API_KEY: not found');
	}
	if(!req.VehicleNumber){
		return callback('VehicleNumber: not found');
	}
	if(!req.FromDate){
		return callback('FromDate: not found');
	}
	if(!req.ToDate){
		return callback('FromDate: not found');
	}
	let body = {
		CustomerId: req.customerId,
		VehicleNumber: req.VehicleNumber,
		FromDate: new Date(req.FromDate).toISOString(),
		ToDate: new Date(req.ToDate).toISOString()
	};
	request.post({
		headers: {
			'content-type': 'application/json',
			'APIClient_ID': req.customerId,
			'API_KEY': req.API_KEY
		},
		url: "https://fastaglogin.icicibank.com/ISRCUSTAPI/Customer/TAGAccountCreditTransactions",
		body: JSON.stringify(body)
	}, function (error, response, body) {
		try {
			if (body) body = JSON.parse (body);
			if (error) {
				console.error('fastag rechare err ',error.toString());
				return callback (error);
			}
			if (typeof body !=='object') {
				return callback (body);
			}
			callback (null, body);
		}
		catch (err) {
			return callback (err);
		}
	});
};

