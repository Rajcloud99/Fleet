const mongoose = require('mongoose');
const Logs = commonUtil.getModel('logs');
let ReportExelService = promise.promisifyAll(commonUtil.getService("reportExel"));

const moment = require("moment");

module.exports = {
	add,
	add2,
	findLogsDetail,
	addLog,
	updateLogsRemark,
	findNotif
};

const ALLOWED_FILTER = ['from', 'to', 'refUIF', 'selectedRep', 'category', 'dateType', 'docDate','subCategory'];

function constructFilters(oQuery) {
	let oFilter = {};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_FILTER)) {
			if (i === 'from') {
				if(oQuery.dateType === 'docDate'){
					let startDate = new Date(oQuery[i]);
					startDate.setSeconds(0);
					startDate.setHours(0);
					startDate.setMinutes(0);
					startDate.setMilliseconds(0);

					oFilter["docDate"] = oFilter["docDate"] || {};
					oFilter["docDate"].$gte = startDate;
				}else{
					let startDate = new Date(oQuery[i]);
					startDate.setSeconds(0);
					startDate.setHours(0);
					startDate.setMinutes(0);
					startDate.setMilliseconds(0);

					oFilter["time"] = oFilter["time"] || {};
					oFilter["time"].$gte = startDate;
				}

			} else if (i === 'to') {
				if(oQuery.dateType === 'docDate'){
					let endDate = new Date(oQuery[i]);
					endDate.setSeconds(59);
					endDate.setHours(23);
					endDate.setMinutes(59);

					oFilter["docDate"] = oFilter["docDate"] || {};
					oFilter["docDate"].$lte = endDate;
				}else{
					let endDate = new Date(oQuery[i]);
					endDate.setSeconds(59);
					endDate.setHours(23);
					endDate.setMinutes(59);

					oFilter["time"] = oFilter["time"] || {};
					oFilter["time"].$lte = endDate;
				}
			}
			else if (i === 'refUIF') {
				if(oQuery[i] instanceof RegExp)
					oFilter['uif'] = oQuery[i];
				else
					oFilter['uif'] = new RegExp('^'+oQuery[i].trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');

			}else if (i === 'selectedRep') {
				oFilter['refTo'] = new RegExp('^'+findRefTo(oQuery[i]).trim().replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');
			}else if (i === 'category') {
				oFilter[i] = oQuery[i];
			}else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

function findRefTo(refT) {
	let aRefTo = {
		'Voucher':'Voucher',
		'billBook':'BillBook',
		'Advance':'TripAdvances',
		'TripSettle':'TripSettle'
	};
	if(aRefTo[refT])
		return aRefTo[refT];
	else
		return refT;
}

async function updateLogsRemark(req,res){

	try{
		let oUp = await Logs.update(
			{
				'_id': otherUtil.arrString2ObjectId(req.body._id)
			},
			{
				$set: {
					'action.remarkByUser': req.user.full_name,
					'action.remarkDatetime': new Date(),
					'action.remark': req.body.remark
				}
			}
		);
		return oUp;
	}
	catch (e) {
		throw e;
	}
}

async function add(collection, body, req) {

	try {

		const Model = mongoose.model(collection);
		const schema = Model.schema.obj;

		let category = body.category;

		let subCategory = body.subCategory || '';

		if(!category)
			throw new Error('No Category provided');

		let nDoc = body.nData;

		if(!nDoc)
			throw new Error('No New Data found');

		let oDoc = body.oData;

		let oAction = {};
		if(body.action){
			oAction = body.action;
		}

		if(!oDoc)
			throw new Error('No New Data found');

		let uif = body.uif;

		if(!uif)
			throw new Error('No Unique Identifier found');

		let docDate = body.docDate;

		// delta schema is something like a common point on which compare can take place
		// we can use schema as it is to compare b'cos we don't have to save all the keys in logs like "History, createdAt, lastModified",  some of the keys are not changing throughtout document life time, some keys are dynamic they change on every doc update and aren't needed to be loged, and some keys are for maintaining history so log isn't required for them.
		const deltaSchema = _deltaSchema(schema, oDoc);
		const modifiedKeys = _generatingDelta(deltaSchema, nDoc, oDoc);

		let log = {
			clientId: req.user.clientId,
			docId: oDoc._id,
			uif,
			refTo: collection,
			category,
			docDate,
			subCategory,
			action: oAction,
			time: Date.now(),
			delta: JSON.stringify(modifiedKeys),
			user: req.user.full_name
		};

		let updatedData = await Logs.create(log);

		return true;

	}catch (e) {
		throw e;
		console.log(e);
	}
}

async function add2(collection, body, req) {

	try {

		const Model = mongoose.model(collection);
		const schema = Model.schema.obj;

		let category = body.category;

		if(!category)
			throw new Error('No Category provided');

		let nDoc = body.nData;

		if(!nDoc)
			throw new Error('No New Data found');

		let oDoc = body.oData;

		if(!oDoc)
			throw new Error('No New Data found');

		let uif = body.uif;

		if(!uif)
			throw new Error('No Unique Identifier found');

		let docDate = body.docDate;
		let deleteRemark = body.deleteRemark;
		// delta schema is something like a common point on which compare can take place
		// we can use schema as it is to compare b'cos we don't have to save all the keys in logs like "History, createdAt, lastModified",  some of the keys are not changing throughtout document life time, some keys are dynamic they change on every doc update and aren't needed to be loged, and some keys are for maintaining history so log isn't required for them.

		let modifiedKeys = JSON.parse(JSON.stringify(oDoc));
		let log = {
			clientId: req.user.clientId,
			docId: oDoc._id,
			uif,
			refTo: collection,
			category,
			deleteRemark,
			docDate,
			time: Date.now(),
			delta: JSON.stringify(modifiedKeys),
			user: req.user.full_name
		};

		let updatedData = await Logs.create(log);

		return true;

	}catch (e) {
		throw e;
		console.log(e);
	}
}


// New Function to create the Log to if not need to send old and newdata
// Direct send the delta value

async function addLog(collection, body, req) {

	try {
		let category = body.category;

		if(!category)
			throw new Error('No Category provided');

		let delta = body.delta;

		if(!body.uif)
			throw new Error('No Unique Identifier found');

		if(!body.docId)
			throw new Error('Document not found.');

		let oAction = {};
		if(body.action){
			oAction = body.action;
		}

 		let log = {
			clientId: req.user.clientId,
			uif:body.uif,
			refTo: collection,
			docId: body.docId,
			category,
			time: Date.now(),
			delta: JSON.stringify(delta),
			user: req.user.full_name,
			action: oAction,
		};

		if(body.dwnldLnk)
			log.dwnldLnk = body.dwnldLnk;

		if(body.userId)
			log.userId = body.userId;

		let updatedData = await Logs.create(log);

		return true;

	}catch (e) {
		throw e;
		console.log(e);
	}
}

function _deltaSchema(schema, oDoc) {

	return _generateDeltaSchema(schema, oDoc);

	function _generateDeltaSchema(schema, ptrObj, isArray = false) {
		let obj = isArray ? [] : {};

		for(let key in schema){
			if(schema.hasOwnProperty(key)){
				let value = schema[key];
				let ptrPath = ptrObj && ptrObj[key];

				if(Array.isArray(value)){

					let arr = _generateDeltaSchema(value, ptrPath, true);

					if(arr.length){
						obj[key] = Array(ptrPath && ptrPath.length || 1).fill(arr[0]);
					}

				}else if(typeof value === 'object'){

					let objKeys = Object.keys(value);

					if((isArray && (objKeys.indexOf('type') == -1)) || objKeys.indexOf('_delta')+1){
						if(objKeys.indexOf('type')+1){
							if(objKeys.indexOf('ref')+1)
								obj[key] = 'mongoId';
							else
								obj[key] = 'primitive';
						}else{
							let retObj = _generateDeltaSchema(value, ptrPath);
							if(isArray){
								Object.keys(retObj).length && (obj[key] = retObj);
							}else
								obj[key] = retObj;
						}
					}
				}
			}
		}

		return obj;
	}
}

async function findLogsDetail(query, req){
	try{
		let oFilter = constructFilters(query);
		if(oFilter.userId)
			oFilter.userId = req.user._id;
		oFilter.clientId = query.clientId;
		let no_of_doc = query && query.no_of_docs || 10;
		let skip_docs = (query.skip - 1) * no_of_doc;
		let oLogs;
		if(query.download) {
			oLogs = await Logs.find(oFilter).sort({time: -1});
		} else {
			oLogs = await Logs.find(oFilter).sort({time: -1}).limit(no_of_doc).skip(parseInt(skip_docs));
		}
		return oLogs;
	} catch(e) {
		throw e;
	}
}

async function findNotif(req, res){
	try{

		// Every After 10 min
		let todayAfter = moment().add(-10, 'minute').toDate();
		let oFilter = constructFilters(req.query);
		let no_of_doc = req.body.no_of_doc || 10;
		oFilter.clientId = req.body.clientId;
		oFilter.docId = req.user._id;
		oFilter.time = { $gte: todayAfter };
		let oLogs = await Logs.find(oFilter).sort( { time: -1 } ).limit(no_of_doc);
		return oLogs;

	} catch(e) {
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
}

function _generatingDelta(deltaSchema, nObj, oObj) {

	return iterator(deltaSchema);

	function iterator(deltaSchema, path = false, isArray = false) {

		let obj = isArray ? [] : {};
		for(let key in deltaSchema){
			if(deltaSchema.hasOwnProperty(key)){
				let value = deltaSchema[key];
				let accessPath = path ? path + '.' + key : key;

				if(Array.isArray(value)){
					let arr = iterator(value, accessPath, true);
					if(arr.length)
						obj[key] = arr;
				}else if(typeof value === 'object'){
					let retObj = iterator(value, accessPath);
					if(Object.keys(retObj).length)
						obj[isArray ? Number(key) : key] = retObj;
				}else{
					let oldVal;
					if(isDefined(oldVal = compare2Value(accessPath, value)))
						obj[key] = oldVal;
				}
			}
		}

		return obj;
	}

	function compare2Value(key, category = 'primitive') {

		if(key){
			let newVal = _evaluateValue(nObj, key);
			let oldVal = _evaluateValue(oObj, key);

			if(category === 'mongoId') {
				newVal = newVal && newVal.toString();
				oldVal = oldVal && oldVal.toString();
			}

			if(isDefined(oldVal) && oldVal != newVal)
				return oldVal;
		}

		return null;

		function _evaluateValue(obj, key = '') {

			let aKey = key.split('.').map(o => o.trim()).filter(o => !!o);

			for(let k in aKey)
				if(aKey.hasOwnProperty(k)){
					if(isDefined(obj[aKey[k]]))
						obj = obj[aKey[k]];
					else
						return null;
				}

			return obj;
		}
	}

	function isDefined(value) {
		if(!value){
			if(value === 0 || value === false)
				return true;
		}else
			return true;

		return false;
	}
}
