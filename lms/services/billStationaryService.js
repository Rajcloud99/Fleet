const Stationary = commonUtil.getModel('billStationary');
const StationaryUsed = commonUtil.getModel('billStationaryUsed');
const Bill = commonUtil.getModel('bills');
const MoneyReceipt = commonUtil.getModel('moneyReceipt');
const TripGr = commonUtil.getModel('tripGr');
const Trip = commonUtil.getModel('trip');
const Tripadvance = commonUtil.getModel('TripAdvances');
const Voucher = commonUtil.getModel('voucher');
const Creditnote = commonUtil.getModel('creditNote');
let PurchaseBill = commonUtil.getModel('purchaseBill');

module.exports = {
	findByRefAndType,
	setUnset,
	updateStatus,
	updateStatusV2,
	setUsed,
	isUsed,
	removeByBillBookId,
	removeByBillStationryId: removeByBillStationaryId,
	checkExistStationary,
	update,
	findMissing
};

// function definition
async function findByRefAndType(body, projection = {}) {

	let bookNo = body.bookNo;
	let type = body.type;
	let clientId = body.clientId;
	let billBookId = body.billBookId;

	if(billBookId){
		if(Array.isArray(billBookId)){
			billBookId = billBookId.map(o => typeof o === 'object' && o || otherUtil.arrString2ObjectId(o));
		}else{
			billBookId = typeof billBookId === 'object' && billBookId || otherUtil.arrString2ObjectId(billBookId);
		}
	}

	if (bookNo && type) {

		let obj = {
			bookNo,
			type,
			clientId,
		};
		if(billBookId)
			obj.billBookId = billBookId;

		return await Stationary.findOne(obj, projection).lean();

	} else
		throw new Error('Mandatory fields are Required');
}

async function setUnset(body, newData, oldData) {

	let modelName = body.modelName;
	let docId = body.docId;
	let userName = body.userName;

	let nRefNo = newData.refNo;
	let nStationaryId = newData.stationaryId && newData.stationaryId.toString();

	let oRefNo = oldData.refNo;
	let oStationaryId = oldData.stationaryId && oldData.stationaryId.toString();

	if (modelName && userName && nRefNo && oRefNo) {

		if (oStationaryId) {
			await updateStatus({
				userName,
				docId,
				modelName,
				stationaryId: oStationaryId,
			}, 'cancelled');
		}

		if (nStationaryId) {
			await updateStatus({
				userName,
				docId,
				modelName,
				stationaryId: nStationaryId,
			}, 'used');
		}

		return true;

	} else
		throw new Error('Mandatory fields are Required');
}

async function checkExistStationary(type, id) {
	if (type && id) {
		let existStat = {};
		switch (type) {
			case 'Bill':
				existStat = await Bill.findOne({stationaryId: id}).lean();
				break;
			case 'Gr':
				existStat = await TripGr.findOne({stationaryId: id});
				break;
			case 'FPA':
			case 'Cash Receipt':
			case 'Money Receipt':
				existStat = await Voucher.findOne({stationaryId: id}).lean();
				break;
			case 'Hire Slip':
				existStat = await Trip.findOne({lsStationaryId: id}).lean();
				break;
			case 'Ref No':
				existStat = await Tripadvance.findOne({stationaryId: id}).lean();
				break;
			case 'Credit Note':
				existStat = await Creditnote.findOne({creditStationaryId: id}).lean();
				break;
		}

		return existStat;
	} else {
		throw new Error('Stationary Type and Stationary required.');
	}
}

async function updateStatus(body, status) {

	let userName = body.userName;
	let docId = body.docId;
	let modelName = body.modelName;
	let stationaryId = body.stationaryId;

	if (userName && stationaryId && status) {

		let objToUpdate = {
			user: userName,
			date: new Date(),
			status
		};

		if (docId)
			objToUpdate.wasLinkedTo = docId;

		if (modelName)
			objToUpdate.wasLinkedToSchema = modelName;

		if(status == 'used'){
			let fdStationary = await Stationary.findOne({_id: stationaryId}).lean();
			if(fdStationary){
				fdStationary.status = 'used';
				fdStationary.usDate = new Date();
				fdStationary.commonHistory = fdStationary.commonHistory || [];
				fdStationary.commonHistory.push(objToUpdate);

				await StationaryUsed.create(fdStationary);
				await Stationary.remove({_id: stationaryId});
			}
		}else {
			let fdStationary = await StationaryUsed.findOne({_id: stationaryId}).lean();
			if(fdStationary){
				fdStationary.status = 'unused';
				fdStationary.commonHistory = fdStationary.commonHistory || [];
				fdStationary.commonHistory.push(objToUpdate);

				let foundStationary = await Stationary.findOne({_id: stationaryId}).lean();
				if(foundStationary)
					await Stationary.remove({_id: stationaryId});

				await Stationary.create(fdStationary);
				await StationaryUsed.remove({_id: stationaryId});
			}
		}

		return true;
		// await Stationary.findByIdAndUpdate(stationaryId, {
		// 	$set: {status},
		// 	$push: {
		// 		commonHistory: objToUpdate
		// 	}
		// });

	} else {
		throw new Error('Mandatory fields are Required.');
	}
}

async function updateStatusV2(filter, body) {

	let userName = body.userName;
	let docId = body.docId;
	let modelName = body.modelName;
	let status = body.status;

	if(Object.keys(filter).length === 0){
		throw new Error('Filter is empty');
	}

	if (userName && status && filter) {

		let objToUpdate = {
			user: userName,
			date: new Date(),
			status
		};

		if (docId)
			objToUpdate.wasLinkedTo = docId;

		if (modelName)
			objToUpdate.wasLinkedToSchema = modelName;

		if(status == 'used'){
			let fdStationary = await Stationary.findOne(filter).lean();
			if(fdStationary){
				fdStationary.status = 'used';
				fdStationary.usDate = new Date();
				fdStationary.commonHistory = fdStationary.commonHistory || [];
				fdStationary.commonHistory.push = objToUpdate;

				await StationaryUsed.create(fdStationary);
				await Stationary.remove(filter);
			}
		}else {
			let fdStationary = await StationaryUsed.findOne(filter).lean();
			if(fdStationary){
				fdStationary.status = 'unused';
				fdStationary.commonHistory = fdStationary.commonHistory || [];
				fdStationary.commonHistory.push = objToUpdate;

				await Stationary.create(fdStationary);
				await StationaryUsed.remove(filter);
			}
		}

		return true;

	} else {
		throw new Error('Mandatory fields are Required.');
	}
}

async function setUsed(stationaryId) {

	if (stationaryId) {

		let fdStationary = await Stationary.findOne({_id: stationaryId}).lean();
		if(fdStationary){
			fdStationary.status = 'used';
			fdStationary.commonHistory = fdStationary.commonHistory || [];
			fdStationary.commonHistory.push = objToUpdate;

			await StationaryUsed.create(fdStationary);
			await Stationary.remove({_id: stationaryId});

			return true;
		}else
			throw new Error('Stationary Not Found');

	} else {
		throw new Error('Mandatory fields are Required.');
	}
}

async function isUsed(stationaryId) {

	if (stationaryId) {

		let foundStationary = await StationaryUsed.findById(stationaryId).lean();

		if (foundStationary && foundStationary.status === 'used')
			return true;

		return false;

	} else {
		throw new Error('Mandatory fields are Required.');
	}
}

async function removeByBillStationaryId(billStationaryId) {

	if (!billStationaryId)
		throw new Error('Bill Stationary Id Required.');

	return await Stationary.remove({
		_id: otherUtil.arrString2ObjectId(billStationaryId),
		status: {
			$ne: 'used'
		}
	});
}

async function removeByBillBookId(billBookId) {

	if (!billBookId)
		throw new Error('Bill Book Id Required.');

	return await Stationary.remove({
		billBookId: otherUtil.arrString2ObjectId(billBookId),
		status: {
			$ne: 'used'
		}
	});
}

async function update(query, body) {

	if (Object.keys(query).length) {
		await Stationary.update(query, body, {multi: true});
		await StationaryUsed.update(query, body, {multi: true});
		return true;
	} else {
		throw new Error('Mandatory fields are Required.');
	}
}

async function findMissing(query) {
	let aggrPipe = [];
	return await Stationery.aggregate(aggrPipe);
};
