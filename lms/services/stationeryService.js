/**
 * Initial version by: Nipun Bhardwaj
 * Initial version created on: 22/01/19
 */

const Stationery = commonUtil.getModel('stationery');
const stationeryFormatParser = otherUtil.stationeryFormatParser;

const allowedKey = ["clientId", "category", "name","branch", "min", "max", "year", "format", "current",
	"autoGenerate", "default", "active", "remark"];
//branch filter removed
function prepareFilter (body) {
	let fFilter = {};
	for (let key in body){
		if(body.hasOwnProperty(key) && allowedKey.indexOf(key)>-1){
			fFilter[key] = body[key];
		}
	}
	return fFilter;
}

let services = {};

services.validateNumber = async function (clientId, id, sequenceNumber, next) {
	let stationery = (await Stationery.find ({
		_id: id,
		clientId: clientId
	}))[0];
	if (!stationery){
		return next('Stationery not found!');
	}
	sequenceNumber = parseInt(sequenceNumber);
	if (!sequenceNumber) {
		return next('Sequence Number not provided!');
	}
	let usedIndex = stationery.used.findIndex((obj)=> obj.number === sequenceNumber );
	if(usedIndex >=0) {
		return next(`Request Number ${sequenceNumber} is already used!`)
	}
	if(sequenceNumber < stationery.min || sequenceNumber > stationery.max) {
		return next(`Request Number ${sequenceNumber} is out of range!`)
	}
	let formattedSeq = stationeryFormatParser(stationery.format, sequenceNumber);
	if(formattedSeq === 'Invalid'){
		return next('Invalid Format generated!');
	} else {
		return next(null,formattedSeq)
	}
};

services.getStationery = async function (reqBody, next) {
	reqBody.queryFilter = prepareFilter(reqBody);
	otherUtil.findPagination(Stationery,reqBody, next);
}

services.unUseStationery = async function (slip) {
	return await Stationery.update ({_id: slip.stationery}, {
		$pull: {
			'used': {number: slip.number}
		}
	});
};

services.useStationery = async function (slip) {
	return await Stationery.update ({_id: slip.stationery}, {
		$push: {
			'used': slip
		}
	});
};

module.exports = promise.promisifyAll(services);
