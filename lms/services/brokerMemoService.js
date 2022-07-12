'use strict';
let GR = commonUtil.getModel('tripGr');
const BillStationary = commonUtil.getModel('billStationary');
const billStationaryService = commonUtil.getService('billStationary');
const datamgntService = commonUtil.getService('datamanagements');
let mongoose = require('mongoose');
const serverSidePage = require('../../utils/serverSidePagination');
const ALLOWED_GET_FILTER = ['bMNo', 'clientId', '_id', 'branch', 'gr_type', 'grNumber', 'bill_no', 'booking', 'container_no', 'status', 'isProvBillGen', 'isNonBillable',
	'container_type', 'acknowledge.status', 'pod.received', 'pod.arNo', 'statuses.status', 'statuses_from_date', 'statuses_to_date', 'segment_type',
	'ownershipType', 'statuses_user', 'statuses_remarks', 'remarks', 'from', 'to', 'provisionalBill', 'bill', '_id', 'expected_arrival', 'billedGr', 'unBilledGr',
	'vehicles', 'customer', 'consignee', 'consignor', 'billingParty', 'vehicle_no', 'trip_query', 'vehicle_query', 'booking_query', 'vehicle', 'billingParty.clientId',
	'billingParty._id', 'invoices.ref2', 'invoices.invoiceNo', 'invoices.loadRefNumber', 'trip_no', 'shipmentNo', 'bill_query', 'in.refNo', 'fpa.refNo', 'documents.0', 'delivered', 'tMemoReceipt.refNo',
	'bMemoFromDate', 'bMemoToDate', 'createdBy'];

function constructFilters(oQuery) {
	let oFilter = {tripCancelled: {$not: {$eq: true}}};
	for (let i in oQuery) {
		if (otherUtil.isAllowedFilter(i, ALLOWED_GET_FILTER)) {
			if (i == 'from') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				if (constant.grItemStatus.indexOf(oQuery.dateType) >= 0) {
					oFilter['statuses'] = oFilter['statuses'] || {};
					oFilter['statuses']['$elemMatch'] = oFilter['statuses']['$elemMatch'] || {};
					oFilter['statuses']['$elemMatch']["systemDate"] = oFilter['statuses']['$elemMatch']["systemDate"] || {};
					oFilter['statuses']['$elemMatch']["systemDate"]['$gte'] = startDate;
				} else if (oQuery.dateType === 'billDate') {
					oFilter['bill_query'] = oFilter[`bill_query`] || {};
					oFilter['bill_query']['billDate'] = oFilter['bill_query']['billDate'] || {};
					oFilter['bill_query']['billDate']['$gte'] = startDate;
				} else {
					oFilter[oQuery.dateType || 'created_at'] = oFilter[oQuery.dateType || 'created_at'] || {};
					oFilter[oQuery.dateType || 'created_at'].$gte = startDate;
				}
			} else if (i == 'to') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);
				if (constant.grItemStatus.indexOf(oQuery.dateType) >= 0) {
					oFilter['statuses'] = oFilter['statuses'] || {};
					oFilter['statuses']['$elemMatch'] = oFilter['statuses']['$elemMatch'] || {};
					oFilter['statuses']['$elemMatch']["systemDate"] = oFilter['statuses']['$elemMatch']["systemDate"] || {};
					oFilter['statuses']['$elemMatch']["systemDate"]['$lte'] = endDate;
				} else if (oQuery.dateType === 'billDate') {
					oFilter['bill_query'] = oFilter[`bill_query`] || {};
					oFilter['bill_query']['billDate'] = oFilter['bill_query']['billDate'] || {};
					oFilter['bill_query']['billDate']['$lte'] = endDate;
				} else {
					oFilter[oQuery.dateType || 'created_at'] = oFilter[oQuery.dateType || 'created_at'] || {};
					oFilter[oQuery.dateType || 'created_at'].$lte = endDate;
				}
			} else if (i == 'bMemoFromDate') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);

				oFilter['bMemo.date'] = oFilter['bMemo.date'] || {};
				oFilter['bMemo.date'].$gte = startDate;

				// oFilter['statuses.date'] = {
				// 	'$gte': startDate
				// };

			}else if (i == 'bMemoToDate') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);

				oFilter['bMemo.date'] = oFilter['bMemo.date'] || {};
				oFilter['bMemo.date'].$lte = endDate;

			}else if (i === 'statuses_from_date' && oQuery.statuses_to_date) {
				let startDate = new Date(oQuery[i]);
				let nextDay = new Date(oQuery.statuses_from_to);
				oFilter['statuses.date'] = {
					'$gte': startDate,
					'$lt': nextDay
				};
			} else if (i == 'statuses_from_date') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);
				oFilter['statuses.date'] = {
					'$gte': startDate
				};
			} else if (i == 'statuses_to_date' && !oQuery.statuses_from_date) {
				let endDate = new Date(oQuery[i]);
				oFilter['statuses.date'] = {
					'$lt': endDate
				};
			} else if (i == 'remarks') {
				oFilter[i] = {$regex: oQuery[i], $options: 'i'};
			} else if (i == 'grNumber' && typeof oQuery[i] === 'string') {

				oFilter[i] = new RegExp(oQuery[i].replace(/[/|\\{}()[\]^$+*?.]/g, '\\$&'), 'i');

			} else if (i == 'bmNo') {
				oFilter['bMemo.bmNo'] = oQuery[i];
			} else if (i == 'statuses_user') {
				oFilter['statuses.date'] = oQuery[i];
			} else if (i == 'statuses_remarks') {
				oFilter['statuses.remarks'] = {$regex: oQuery[i], $options: 'i'};
			} else if (i == 'container_no') {
				oFilter['container.number'] = oQuery[i];
			} else if (i == 'container_type') {
				oFilter['container.type_of_container'] = oQuery[i];
			} else if (i == 'expected_arrival') {
				oFilter['expected_arrival'] = {$lte: new Date(oQuery[i])};
			} else if (i === "branch") {
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['branch'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			} else if (i === "customer") {
				if (oQuery[i] && oQuery[i] != "undefined" && oQuery[i].length > 0) {
					oFilter['customer'] = {$in: otherUtil.arrString2ObjectId(Array.isArray(oQuery[i]) ? oQuery[i] : [oQuery[i]])};
				}
			} else if (i === 'createdBy') {
				oFilter['created_by'] = {$in: otherUtil.arrString2ObjectId([oQuery[i]])}
			}else if (i === 'vehicles' && Array.isArray(oQuery[i]) && oQuery[i].length > 0) {
				oFilter['vehicle'] = {$in: otherUtil.arrString2ObjectId(oQuery[i])};
			} else if (i === 'status') {
				if (oQuery[i] instanceof Array) {
					oFilter[i] = {$in: oQuery[i]};
				} else {
					oFilter[i] = oQuery[i];
				}
			} else if (i === 'vehicle_no') {
				oFilter[`trip.${i}`] = oQuery[i];
			} else if ((i === 'vehicle') || (i === 'consignor') || (i === 'consignee') || (i === 'billingParty')) {
				oFilter[i] = typeof oQuery[i] === "string" && mongoose.Types.ObjectId(oQuery[i]) || oQuery[i];
			} else if (i === '_id') {
				oFilter[i] = {
					$in: Array.isArray(oQuery[i]) ? otherUtil.arrString2ObjectId(oQuery[i]) : [otherUtil.arrString2ObjectId(oQuery[i])]
				};
			} else if (i === 'billedGr') {
				oFilter['$or'] = oFilter['$or'] || [];
				oFilter['$or'].push({
					'bill': {$exists: true}
				}, {
					'provisionalBill.0': {$exists: true}
				}, {
					'supplementaryBillRef.0': {$exists: true}
				});
			} else if (i === 'unBilledGr') {
				oFilter['$and'] = oFilter['$and'] || [];
				oFilter['$and'].push({
					'bill': {$exists: false}
				}, {
					'provisionalBill.0': {$exists: false}
				}, {
					'supplementaryBillRef.0': {$exists: false}
				});
				oFilter['isNonBillable'] = {$not: {$eq: true}};
			} else {
				oFilter[i] = oQuery[i];
			}
		}
	}
	return oFilter;
}

async function get(req, res, next) {
	try {
		let oRes = {status: 'OK'};
		let no_of_docs = req.body.no_of_docs || 10;
		if(!req.body.skip || req.body.skip < 1) req.body.skip = 1;
		let skipDocs = no_of_docs * (req.body.skip - 1);
		let oFilterGr = constructFilters(req.body);
		oFilterGr.gr_type = 'Broker Memo';
		let paymStatFilter = {};
		if(req.body.paymentStatus)
			paymStatFilter['remainingAmt'] = req.body.paymentStatus;
		let aggrQuery = [
			{$match:oFilterGr},
			{$sort:req.body.sort || {_id: -1}},
			{$skip:skipDocs},
			{$limit:no_of_docs},
			{
				$lookup: {
					from: 'customers',
					localField: 'customer',
					foreignField: '_id',
					as: 'customer'
				}
			},
			{
				$unwind: {
					path: '$customer',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'billingparties',
					localField: 'billingParty',
					foreignField: '_id',
					as: 'billingParty'
				}
			},
			{
				$unwind: {
					path: '$billingParty',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'accounts',
					localField: 'billingParty.account',
					foreignField: '_id',
					as: 'billingParty.account'
				}
			},
			{
				$unwind: {
					path: '$billingParty.account',
					preserveNullAndEmptyArrays: true
				}
			},

			{
				$lookup: {
					from: 'consignor_consignees',
					localField: 'consignor',
					foreignField: '_id',
					as: 'consignor'
				}
			},
			{
				$unwind: {
					path: '$consignor',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'consignor_consignees',
					localField: 'consignee',
					foreignField: '_id',
					as: 'consignee'
				}
			},
			{
				$unwind: {
					path: '$consignee',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'registeredvehicles',
					localField: 'vehicle',
					foreignField: '_id',
					as: 'vehicle'
				}
			},
			{
				$unwind: {
					path: '$vehicle',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'branches',
					localField: 'branch',
					foreignField: '_id',
					as: 'branch'
				}
			},
			{
				$unwind: {
					path: '$branch',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: 'bookingv2',
					localField: 'booking',
					foreignField: '_id',
					as: 'booking'
				}
			},
			{
				$unwind: {
					path: '$booking',
					preserveNullAndEmptyArrays: true
				}
			},
			{$lookup: {from: 'bills', localField: 'bill', foreignField: '_id', as: 'bill'}},
			{$unwind: {path: '$bill', preserveNullAndEmptyArrays: true}},

			{$lookup: {from: 'tripv2', localField: 'trip', foreignField: '_id', as: 'trip'}},
			{$unwind: {path: '$trip', preserveNullAndEmptyArrays: true}},
			{
				"$lookup": {
					"from": "drivers",
					"localField": "trip.driver",
					"foreignField": "_id",
					"as": "driverData"
				}
			},
			{
				"$unwind": {
					"path": "$driverData",
					"preserveNullAndEmptyArrays": true
				}
			},
			{
				"$lookup": {
					"from": "materialgroups",
					"localField": "booking.material_type",
					"foreignField": "_id",
					"as": "material_type"
				}
			},
			{
				"$unwind": {
					"path": "$material_type",
					"preserveNullAndEmptyArrays": true
				}
			},

			{
				"$lookup": {
					"from": "users",
					"localField": "pod.user",
					"foreignField": "_id",
					"as": "pod.user"
				}
			},
			{
				"$unwind": {
					"path": "$pod.user",
					"preserveNullAndEmptyArrays": true
				}
			},
			{$project:{bMemo:1,acknowledge:1,clientId:1,trip:1,trip_no:1,status:1,vehicle_no:1,'customer.name':1,'customer._id':1, stationaryId:1, grNumber:1,grDate:1,basicFreight:1,totalFreight: 1,charges:1, deduction:1, totalCharges:1, totalDeduction:1,created_by_full_name:1,created_at:1,payment_type:1, last_modified_at: 1, tMemoReceipt: 1,
					payment_basis:1,remarks:1,'vehicle.veh_type_name':1,'vehicle.veh_type':1,'vehicle._id':1, 'branch.name':1,'branch._id':1,'branch.grBook':1, 'branch.tripMemoBook': 1, 'billingParty.name':1,'billingParty._id':1,'billingParty.account.name':1,'billingParty.account._id':1,
					'bill.billNo': 1,provisionalBill: 1 , supplementaryBillRef:1, 'booking._id': 1,'booking.ld': 1, 'booking.uld': 1, "booking.booking_no": 1,'pod':1,
					"booking.imd": 1, //intermed
					"booking.sr": 1,
					"booking.pkg": 1,
					"booking.cat": 1,
					"booking.ticketNo": 1,
					"material_type.name": 1,
					"driverData.name":1,
					"driverData._id":1,
					'consignor.name': 1,
					'consignor._id': 1,
					'consignee.name': 1,
					'consignee._id': 1,
				}},
			{
				$match: paymStatFilter
			}
		];
		let oQuery = {aggQuery: aggrQuery, no_of_docs: no_of_docs};
		let aTripGR = await serverSidePage.requestData(GR, oQuery);
		if (aTripGR) {
			for (let o of aTripGR) {
				//get document count from datamanagement
				if (o._id) {
					let bodyClient = {
						_id: o._id.toString(),
						modelName: "gr"
					};
					let oDms = await datamgntService.findOneRec(bodyClient, {clientId: req.body.clientId});
					if (oDms && oDms.files && oDms.files.length > 0) {
						o["noOfDocs"] = oDms.files.length;
					} else {
						o["noOfDocs"] = 0;
					}
				}
			}
		}
		return aTripGR;
	} catch (err) {
		next(err);
	}
}

async function update(id, body) {
	try {
		let foundGr = await GR.findOne({_id: id},{_id: 1,stationaryId: 1,tMemo: 1});
		if (!foundGr)
			throw new Error('GR does not exists.');
		if (!foundGr.bMemo)
			throw new Error('No Broker memo Found');

		if(body && body.bMemo && body.bMemo.bmNo){
			var fFilter = {
				clientId: body.clientId,
				tripCancelled: false,
				_id: {$ne: mongoose.Types.ObjectId(id)},
				"tMemo.tMNo": body.bMemo.bmNo
			};
			let aBrokermemo = await GR.find(fFilter,{_id: 1,bMemo: 1});
			if(aBrokermemo.length){
				throw new Error(` trip memo no ${body.bMemo.bmNo} already generated`);
			}

			if (!body.bMemo.stationaryId) {
				let foundStationary = await BillStationary.findOne({
					bookNo: body.bMemo.bmNo,
					type: 'Broker Memo',
					clientId: body.clientId
				});

				if (foundStationary)
					body.bMemo.stationaryId = foundStationary._id;
			}
		}

		if(body.grNumber){
			var fFilter = {
				clientId: body.clientId,
				tripCancelled: false,
				_id: {$ne: mongoose.Types.ObjectId(id)},
				"grNumber": body.grNumber
			};
			let usedGrs = await GR.find(fFilter,{_id: 1,grNumber: 1});
			if (usedGrs.length) {
				if (usedGrs[0].grNumber === body.grNumber)
					throw new Error('GR Number already used.');
			}

			if (!body.stationaryId) {
				let foundStationary = await BillStationary.findOne({
					bookNo: body.grNumber,
					type: 'Gr',
					clientId: body.clientId
				});

				if (foundStationary)
					body.stationaryId = foundStationary._id;
			}
		}

		body.bMemo.stationaryId = body.bMemo.stationaryId && (body.bMemo.stationaryId).toString();
		foundGr.bMemo.stationaryId = foundGr.bMemo.stationaryId && (foundGr.bMemo.stationaryId).toString();

		if ((body.bMemo.stationaryId || foundGr.bMemo.stationaryId) && (body.bMemo.stationaryId !== foundGr.bMemo.stationaryId)) {

			// if stationary is changed than cancel the previous stationary
			if (foundGr.bMemo.stationaryId) {
				await BillStationary.findByIdAndUpdate(otherUtil.arrString2ObjectId(foundGr.bMemo.stationaryId), {
					$set: {status: 'cancelled'},
					$push: {
						commonHistory: {
							user: body.userName,
							date: new Date(),
							status: 'cancelled',
							wasLinkedTo: foundGr._id,
							wasLinkedToSchema: 'TripGr',
						}
					}
				});
			}

			// if stationary is changed than mark "USED" the new stationary
			if (body.bMemo.stationaryId) {
				await BillStationary.findByIdAndUpdate(body.bMemo.stationaryId, {
					$set: {status: 'used'},
					$push: {
						commonHistory: {
							user: body.userName,
							date: new Date(),
							status: 'used',
							wasLinkedTo: foundGr._id,
							wasLinkedToSchema: 'TripGr',
						}
					}
				});
			}
		}

		body.stationaryId = body.stationaryId && (body.stationaryId).toString();
		foundGr.stationaryId = foundGr.stationaryId && (foundGr.stationaryId).toString();
		if ((body.stationaryId || foundGr.stationaryId) && (body.stationaryId !==foundGr.stationaryId)) {

			// if stationary is changed than cancel the previous stationary
			if (foundGr.stationaryId) {
				await BillStationary.findByIdAndUpdate(otherUtil.arrString2ObjectId(foundGr.stationaryId), {
					$set: {status: 'cancelled'},
					$push: {
						commonHistory: {
							user: body.userName,
							date: new Date(),
							status: 'cancelled',
							wasLinkedTo: foundGr._id,
							wasLinkedToSchema: 'TripGr',
						}
					}
				});
			}

			// if stationary is changed than mark "USED" the new stationary
			if (body.stationaryId) {
				await BillStationary.findByIdAndUpdate(body.stationaryId, {
					$set: {status: 'used'},
					$push: {
						commonHistory: {
							user: body.userName,
							date: new Date(),
							status: 'used',
							wasLinkedTo: body._id,
							wasLinkedToSchema: 'TripGr',
						}
					}
				});
			}
		}

		let grBodyUpdate ={
			...body,
			last_modified_at: new Date(),
			billingParty: body.billingParty,
			grDate: body.grDate,
			grNumber: body.grNumber,
			payment_type: body.payment_type,
			payment_basis: body.payment_basis,
			bMemo: body.bMemo,
			deduction: body.deduction
		}

		let updateTrip = await GR.updateOne({_id: otherUtil.arrString2ObjectId(id)}, {
			$set: grBodyUpdate
		});
		return updateTrip;
	} catch (e) {
		winston.error(e.message || e.toString());
		console.log('BrokerMemo update', e.toString());
		throw e;
	}
}

module.exports = {
	get,
	update,
};
