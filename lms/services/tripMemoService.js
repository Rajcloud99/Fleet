'use strict';
let GR = commonUtil.getModel('tripGr');
let Bill = commonUtil.getModel('bills');
const TripAdvances = require('../models/TripAdvances');
const BillStationary = commonUtil.getModel('billStationary');
const billStationaryService = commonUtil.getService('billStationary');
let VoucherServiceV2 = commonUtil.getService('voucher');
const datamgntService = commonUtil.getService('datamanagements');
let mongoose = require('mongoose');
const serverSidePage = require('../../utils/serverSidePagination');
const ALLOWED_GET_FILTER = ['tMNo', 'clientId', '_id', 'branch', 'gr_type', 'grNumber', 'bill_no', 'booking', 'container_no', 'status', 'isProvBillGen', 'isNonBillable',
	'container_type', 'acknowledge.status', 'pod.received', 'pod.arNo', 'statuses.status', 'statuses_from_date', 'statuses_to_date', 'segment_type',
	'ownershipType', 'statuses_user', 'statuses_remarks', 'remarks', 'from', 'to', 'provisionalBill', 'bill', '_id', 'expected_arrival', 'billedGr', 'unBilledGr',
	'vehicles', 'customer', 'consignee', 'consignor', 'billingParty', 'vehicle_no', 'trip_query', 'vehicle_query', 'booking_query', 'vehicle', 'billingParty.clientId',
	'billingParty._id', 'invoices.ref2', 'invoices.invoiceNo', 'invoices.loadRefNumber', 'trip_no', 'shipmentNo', 'bill_query', 'in.refNo', 'fpa.refNo', 'documents.0', 'delivered', 'tMemoReceipt.refNo',
	'tMemoFromDate', 'tMemoToDate', 'createdBy'];

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
			} else if (i == 'tMemoFromDate') {
				let startDate = new Date(oQuery[i]);
				startDate.setSeconds(0);
				startDate.setHours(0);
				startDate.setMinutes(0);

				oFilter['tMemo.date'] = oFilter['tMemo.date'] || {};
				oFilter['tMemo.date'].$gte = startDate;

				// oFilter['statuses.date'] = {
				// 	'$gte': startDate
				// };

			}else if (i == 'tMemoToDate') {
				let endDate = new Date(oQuery[i]);
				endDate.setSeconds(59);
				endDate.setHours(23);
				endDate.setMinutes(59);

				oFilter['tMemo.date'] = oFilter['tMemo.date'] || {};
				oFilter['tMemo.date'].$lte = endDate;

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

			} else if (i == 'tMNo') {
				oFilter['tMemo.tMNo'] = oQuery[i];
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

async function getTrimMemo(req, res, next) {
	try {
		let oRes = {status: 'OK'};
        let no_of_docs = req.body.no_of_docs || 10;
        if(!req.body.skip || req.body.skip < 1) req.body.skip = 1;
        let skipDocs = no_of_docs * (req.body.skip - 1);
		let oFilterGr = constructFilters(req.body);
		oFilterGr.gr_type = 'Trip Memo';
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
				"$addFields": {
					"receivedAmount" : {
						"$reduce": {
							input: "$tMemoReceipt.amount",
							initialValue: 0,
							in: {
								"$add": ["$$value", {"$ifNull": ["$$this", 0]}]
							}
						}
					},

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
			{$project:{tMemo:1,acknowledge:1,clientId:1,trip:1,trip_no:1,status:1,vehicle_no:1,'customer.name':1,'customer._id':1, stationaryId:1, grNumber:1,grDate:1,basicFreight:1,totalFreight: 1,charges:1, deduction:1, totalCharges:1, totalDeduction:1,created_by_full_name:1,created_at:1,payment_type:1, last_modified_at: 1, tMemoReceipt: 1,
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
					"receivedAmount":1,
					'consignor.name': 1,
					'consignor._id': 1,
					'consignee.name': 1,
					'consignee._id': 1,
					"remainingAmt" : { $subtract: ["$totalFreight", "$receivedAmount"]},
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

async function updateTrimMemo(id, body) {
	try {
		let foundGr = await GR.findOne({_id: id},{_id: 1,stationaryId: 1,tMemo: 1});
		if (!foundGr)
			throw new Error('GR does not exists.');
		if (!foundGr.tMemo)
			throw new Error('No Trip memo Found');

		if(body && body.tMemo && body.tMemo.tMNo){
			var fFilter = {
				clientId: body.clientId,
				tripCancelled: false,
				_id: {$ne: mongoose.Types.ObjectId(id)},
				"tMemo.tMNo": body.tMemo.tMNo
			};
			let Tmemo = await GR.find(fFilter,{_id: 1,tMemo: 1});
			if(Tmemo.length){
				throw new Error(` trip memo no ${body.tMemo.tMNo} already generated`);
			}

			if (!body.tMemo.stationaryId) {
				let foundStationary = await BillStationary.findOne({
					bookNo: body.tMemo.tMNo,
					type: 'Trip Memo',
					clientId: body.clientId
				});

				if (foundStationary)
					body.tMemo.stationaryId = foundStationary._id;
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

		body.tMemo.stationaryId = body.tMemo.stationaryId && (body.tMemo.stationaryId).toString();
		foundGr.tMemo.stationaryId = foundGr.tMemo.stationaryId && (foundGr.tMemo.stationaryId).toString();

		if ((body.tMemo.stationaryId || foundGr.tMemo.stationaryId) && (body.tMemo.stationaryId !== foundGr.tMemo.stationaryId)) {

			// if stationary is changed than cancel the previous stationary
			if (foundGr.tMemo.stationaryId) {
				await BillStationary.findByIdAndUpdate(otherUtil.arrString2ObjectId(foundGr.tMemo.stationaryId), {
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
			if (body.tMemo.stationaryId) {
				await BillStationary.findByIdAndUpdate(body.tMemo.stationaryId, {
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
			tMemo: body.tMemo,
			deduction: body.deduction
		}

		let updateTrip = await GR.updateOne({_id: otherUtil.arrString2ObjectId(id)}, {
			$set: grBodyUpdate
		});
		return updateTrip;
	} catch (e) {
		winston.error(e.message || e.toString());
		console.log('TripMemo update', e.toString());
		throw e;
	}
}

const custPaymentReceipt = async (req, res, next) => {
	try {
		let aTripMemo = JSON.parse(JSON.stringify(req.body));
		let stationaryId = aTripMemo[0].stationaryId;

		//start vch
		let oVch = {ledgers: []}, ledger = {}, crAmt = 0, drAmt = 0;

		for (let i = 0; i < aTripMemo.length; i++) {
			if (i == 0) {//extract voucher level info
				oVch.refNo = aTripMemo[i].refNo;
				oVch.date = aTripMemo[i].paymentDate;
				oVch.type = 'Receipt';
				oVch.vT = 'Trip Memo Receipt';
				oVch.clientId = req.user.clientId;
				oVch.stationaryId = aTripMemo[i].stationaryId;
				oVch.isEditable = false;
				oVch.narration = aTripMemo[i].narration;
				oVch.branch = aTripMemo[i].branch;
				oVch.createdBy = req.user.full_name || req.user.user_full_name;
				oVch.paymentMode = aTripMemo[i].paymentMode;
				oVch.paymentRef = aTripMemo[i].paymentRef;
			}

			if (ledger[aTripMemo[i].account_data.from]) {
				ledger[aTripMemo[i].account_data.from].amount = ledger[aTripMemo[i].account_data.from].amount + aTripMemo[i].amount;
				crAmt = crAmt + aTripMemo[i].amount;
				// if (aTrip[i].vendorPayment.paymentMode && ['Diesel', 'Broker'].indexOf(aTrip[i].vendorPayment.paymentMode) + 1) {
				// 	let oBill = {
				// 		billNo: aTrip[i].reference_no,
				// 		billType: 'New Ref',
				// 		amount: aTrip[i].amount,
				// 		remAmt: aTrip[i].amount
				// 	};
				// 	ledger[aTrip[i].account_data.from]["bills"].push(oBill);
				// }
			} else {
				ledger[aTripMemo[i].account_data.from] = {
					account: aTripMemo[i].account_data.from,
					amount: aTripMemo[i].amount,
					cRdR: "CR",
					lName: aTripMemo[i].account_data.fromName,
					bills: []
				};
				ledger[aTripMemo[i].account_data.from].amount = aTripMemo[i].amount;
				crAmt = crAmt + aTripMemo[i].amount;
				// if (aTripMemo[i].vendorPayment.paymentMode && ['Diesel', 'Broker'].indexOf(aTripMemo[i].vendorPayment.paymentMode) + 1) {
				// 	let oBill = {
				// 		billNo: aTripMemo[i].reference_no,
				// 		billType: 'New Ref',
				// 		amount: aTripMemo[i].amount,
				// 		remAmt: aTripMemo[i].amount
				// 	};
				// 	ledger[aTrip[i].account_data.from]["bills"].push(oBill);
				// }
			}
			if (ledger[aTripMemo[i].account_data.to]) {
				ledger[aTripMemo[i].account_data.to].amount = ledger[aTripMemo[i].account_data.to].amount + aTripMemo[i].amount;
				drAmt = drAmt + aTripMemo[i].amount;
				if (aTripMemo[i].billNo) {
					let oBill = {
						billNo: aTripMemo[i].billNo,
						billType: aTripMemo[i].billType,
						amount: aTripMemo[i].amount,
						remAmt: aTripMemo[i].billType == "New Ref" ? aTripMemo[i].amount : 0
					};
					ledger[aTripMemo[i].account_data.to]["bills"].push(oBill);
				}
			} else {
				ledger[aTripMemo[i].account_data.to] = {
					account: aTripMemo[i].account_data.to,
					amount: aTripMemo[i].amount,
					cRdR: "DR",
					lName: aTripMemo[i].account_data.toName,
					bills: []
				};
				ledger[aTripMemo[i].account_data.to].amount = aTripMemo[i].amount;
				drAmt = drAmt + aTripMemo[i].amount;
				if (aTripMemo[i].billNo) {
					let oBill = {
						billNo: aTripMemo[i].billNo,
						billType: aTripMemo[i].billType,
						amount: aTripMemo[i].amount,
						remAmt: aTripMemo[i].billType == "New Ref" ? aTripMemo[i].amount : 0
					};
					ledger[aTripMemo[i].account_data.to]["bills"].push(oBill);
				}
			}
		}

		if (crAmt !== drAmt) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Total of CR and DR amount not matched'
			});
		}

		for (let le in ledger) {
			oVch.ledgers.push(ledger[le]);
		}

		let aVch = await VoucherServiceV2.addVoucherAsync(oVch);

		if (stationaryId) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'tripGr',
				stationaryId: stationaryId,
			}, 'used');
		}

		let tripUpd = await GR.bulkWrite(aTripMemo.map((oGr, index) => {
			let oReceipt = {
				clientId: req.user.clientId,
				vT: 'Trip Memo Receipt',
				refNo: oGr.refNo,
				stationaryId: oGr.stationaryId,
				amount: oGr.amount,
				remainingAmount: oGr.remainingAmount,
				trip_no: oGr.trip_no,
				grNumber: oGr.grNumber,
				tMemoNo: oGr.billNo,
				vehicle_no: oGr.vehicle_no,
				fromAccount: oGr.account_data.from,
				fromName: oGr.account_data.fromName,
				toAccount: oGr.account_data.to,
				toName: oGr.account_data.toName,
				branch: oGr.branch,
				paymentMode : oGr.paymentMode,
				paymentRef : oGr.paymentRef,
				paymentDate : oGr.paymentDate,
				remark: oGr.remark,
				vAdv: oGr.vAdv,
				created_at: new Date(),
				created_by: req.user.full_name,
				voucher: aVch && aVch[0] && aVch[0].voucher._id
			};

			return {
				updateOne: {
					filter: {_id: otherUtil.arrString2ObjectId(oGr.gr)},
					update: {
						$addToSet: {
							tMemoReceipt: oReceipt
						}
					},
					upsert: false
				}
			}
		}));

		for(let row of req.body){
			let foundGr = await GR.findOne({
				'_id': row.gr,
				clientId: req.user.clientId,
				bill: {$exists: true}
			}, {bill: 1})
				.populate("bill", "receiving items.gr")
				.lean();

			if(foundGr && foundGr.bill){
				const mr = foundGr.bill.receiving
					&& Array.isArray(foundGr.bill.receiving.moneyReceipt)
					&& foundGr.bill.receiving.moneyReceipt
					|| [];

				const refPtr = mr.find(o => o.tmRefNo === row.refNo);

				if(refPtr) {
					const grPtr = refPtr.grs.find(o => o.tMemo === row.billNo);
					if (grPtr) {
						grPtr.amount = row.amount;
					}else{
						refPtr.grs.push({
							grRef: row.gr,
							tMemo: row.billNo,
							amount: row.amount,
						});
					}
					refPtr.amount = refPtr.grs.reduce((acc, oGr) => acc + oGr.amount, 0);
				}else{
					mr.push({
						tmRef: aVch && aVch[0] && aVch[0].voucher._id,
						tmRefNo: row.refNo,
						grs: [{
							grRef: row.gr,
							tMemo: row.billNo,
							amount: row.amount,
						}],
						amount: row.amount,
					});
				}

				await Bill.updateOne({_id: foundGr.bill._id}, {
					$set: {
						receiving: foundGr.bill.receiving
					}
				});
			}
		}

		return res.status(200).json({
			status: 'OK',
			message: 'Done',
		});
	} catch (e) {
		winston.error(e.message || e.toString());
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}
};

const custPaymentReceiptEdit = async (req, res, next) => {
	try {

		let aTripMemo = JSON.parse(JSON.stringify(req.body.aTripMemo));
		let updateManyGrQuery = [];
		let refNo = req.body.refNo;

		let foundAccountVch = await VoucherServiceV2.findVoucherByQueryAsync({
			refNo: new RegExp('^' + refNo + '$'),
			clientId: req.user.clientId,
			deleted: false
		}, {_id: 1, acImp: 1});

		if (foundAccountVch.find(o => o.acImp.st))
			throw new Error('Edit not possible. Some or All Voucher are Imported to Account');

		let newStationaryId = aTripMemo[0].stationaryId;
		let unsetQuery = {};
		let setQuery = {};

		if (newStationaryId) {
			setQuery.stationaryId = newStationaryId;
		} else {
			unsetQuery = {
				$unset: {
					stationaryId: 1
				}
			};
		}

		//start vch
		let oVch = {ledgers: []}, ledger = {}, crAmt = 0, drAmt = 0;
		for (let i = 0; i < aTripMemo.length; i++) {
			if (i == 0) {
				oVch.refNo = aTripMemo[i].refNo;
				oVch.date = aTripMemo[i].paymentDate;
				oVch.type = 'Receipt';
				oVch.vT = 'Trip Memo Receipt';
				oVch.clientId = req.user.clientId;
				oVch.stationaryId = aTripMemo[i].stationaryId;
				oVch.isEditable = false;
				oVch.narration = aTripMemo[i].narration;
				oVch.branch = aTripMemo[i].branch;
				oVch.createdBy = req.user.full_name || req.user.user_full_name;
				oVch.paymentMode = aTripMemo[i].paymentMode;
				oVch.paymentRef = aTripMemo[i].paymentRef;
				oVch.paymentDate = aTripMemo[i].paymentDate;
			}
			if (ledger[aTripMemo[i].account_data.from]) {
				ledger[aTripMemo[i].account_data.from].amount = ledger[aTripMemo[i].account_data.from].amount + aTripMemo[i].amount;
				crAmt = crAmt + aTripMemo[i].amount;

			} else {
				ledger[aTripMemo[i].account_data.from] = {
					account: aTripMemo[i].account_data.from,
					amount: aTripMemo[i].amount,
					cRdR: "CR",
					lName: aTripMemo[i].account_data.fromName,
					bills: []
				};
				ledger[aTripMemo[i].account_data.from].amount = aTripMemo[i].amount;
				crAmt = crAmt + aTripMemo[i].amount;
			}
			if (ledger[aTripMemo[i].account_data.to]) {
				ledger[aTripMemo[i].account_data.to].amount = ledger[aTripMemo[i].account_data.to].amount + aTripMemo[i].amount;
				drAmt = drAmt + aTripMemo[i].amount;
				if (aTripMemo[i].billNo) {
					let oBill = {
						billNo: aTripMemo[i].billNo,
						billType: aTripMemo[i].billType,
						amount: aTripMemo[i].amount,
						remAmt: aTripMemo[i].billType == "New Ref" ? aTripMemo[i].amount : 0
					};
					ledger[aTripMemo[i].account_data.to]["bills"].push(oBill);
				}
			} else {
				ledger[aTripMemo[i].account_data.to] = {
					account: aTripMemo[i].account_data.to,
					amount: aTripMemo[i].amount,
					cRdR: "DR",
					lName: aTripMemo[i].account_data.toName,
					bills: []
				};
				ledger[aTripMemo[i].account_data.to].amount = aTripMemo[i].amount;
				drAmt = drAmt + aTripMemo[i].amount;
				if (aTripMemo[i].billNo) {
					let oBill = {
						billNo: aTripMemo[i].billNo,
						billType: aTripMemo[i].billType,
						amount: aTripMemo[i].amount,
						remAmt: aTripMemo[i].billType == "New Ref" ? aTripMemo[i].amount : 0
					};
					ledger[aTripMemo[i].account_data.to]["bills"].push(oBill);
				}
			}
		}
		if (crAmt !== drAmt) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Total of CR and DR amount not matched'
			});
		}

		for (let le in ledger) {
			oVch.ledgers.push(ledger[le]);
		}
		if (foundAccountVch && foundAccountVch[0]) {
			oVch._id = foundAccountVch && foundAccountVch[0] && foundAccountVch[0]._id;
			let aVch = await VoucherServiceV2.editVoucher(oVch);
		} else {
			throw new Error('No Voucher found');
		}

		//vch work done

		let foundGr = await GR.find({
			'tMemoReceipt.voucher': oVch._id,
			clientId: req.user.clientId,
			}).lean();

		for (let i = 0; i < foundGr.length; i++) {
			let oGr = foundGr[i];
			let matchIndex = aTripMemo.findIndex(o => o.gr === oGr._id.toString());
			if (matchIndex + 1) {
				let matchGr = aTripMemo[matchIndex];
				aTripMemo.splice(matchIndex, 1);

				let oReceipt = {
					clientId: req.user.clientId,
					vT: "Trip Memo Receipt",
					refNo: matchGr.refNo,
					stationaryId: matchGr.stationaryId,
					amount: matchGr.amount,
					remainingAmount: matchGr.remainingAmount,
					trip_no: matchGr.trip_no,
					grNumber: matchGr.grNumber,
					tMemoNo: matchGr.billNo,
					vehicle_no: matchGr.vehicle_no,
					fromAccount: matchGr.account_data.from,
					fromName: matchGr.account_data.fromName,
					toAccount: matchGr.account_data.to,
					toName: matchGr.account_data.toName,
					branch: matchGr.branch,
					vAdv: matchGr.vAdv,
					paymentMode : matchGr.paymentMode,
					paymentRef : matchGr.paymentRef,
					paymentDate : matchGr.paymentDate,
					remark: matchGr.remark,
					voucher: oVch._id
				};
					updateManyGrQuery.push({
						updateOne: {
							filter: {
								_id: matchGr.gr,
								'tMemoReceipt.voucher': oVch._id,
							},
							update: {
								$set: {
									"tMemoReceipt.$": oReceipt
								}
							}
						}
					});

			} else {
				let fdGR = await GR.findOne({
					'tMemoReceipt.voucher': oVch._id,
				}, {
					'tMemoReceipt.$': 1,
					"_id": 1
				}).lean();

				if (fdGR)
					updateManyGrQuery.push({
						updateOne: {
							filter: {
								_id: fdGR._id,
								'tMemoReceipt.voucher': oVch._id,
							},
							update: {
								$pull: {
									'tMemoReceipt.voucher': {
										voucher: oVch._id
									}
								}
							}
						}
					});
			}
		}

		for (let i = 0; i < aTripMemo.length; i++) { // vch to add
			let oGr = aTripMemo[i];

			let oReceipt = {
				clientId: req.user.clientId,
				vT: 'Trip Memo Receipt',
				refNo: oGr.refNo,
				stationaryId: oGr.stationaryId,
				amount: oGr.amount,
				remainingAmount: oGr.remainingAmount,
				trip_no: oGr.trip_no,
				grNumber: oGr.grNumber,
				tMemoNo: oGr.billNo,
				vehicle_no: oGr.vehicle_no,
				fromAccount: oGr.account_data.from,
				fromName: oGr.account_data.fromName,
				toAccount: oGr.account_data.to,
				toName: oGr.account_data.toName,
				branch: oGr.branch,
				vAdv: oGr.vAdv,
				paymentMode : oGr.paymentMode,
				paymentRef : oGr.paymentRef,
				paymentDate : oGr.paymentDate,
				remark: oGr.remark,
				voucher: oVch._id
			};

				updateManyGrQuery.push({
					updateOne: {
						filter: {
							_id: oGr.gr
						},
						update: {
							$push: {
								"tMemoReceipt": oReceipt
							}
						}
					}
				});
		}

		updateManyGrQuery.length && await GR.bulkWrite(updateManyGrQuery);

		for(let row of req.body.aTripMemo){
			let foundGr = await GR.findOne({
				'_id': row.gr,
				clientId: req.user.clientId,
				bill: {$exists: true}
			}, {bill: 1})
				.populate("bill", "receiving items.gr")
				.lean();

			if(foundGr && foundGr.bill){
				const mr = foundGr.bill.receiving
					&& Array.isArray(foundGr.bill.receiving.moneyReceipt)
					&& foundGr.bill.receiving.moneyReceipt
					|| [];

				const refPtr = mr.find(o => o.tmRefNo === row.refNo);

				if(refPtr) {
					const grPtr = refPtr.grs.find(o => o.tMemo === row.billNo);
					if (grPtr) {
						grPtr.amount = row.amount;
					}else{
						refPtr.grs.push({
							grRef: row.gr,
							tMemo: row.billNo,
							amount: row.amount,
						});
					}
					refPtr.amount = refPtr.grs.reduce((acc, oGr) => acc + oGr.amount, 0);
				}else{
					mr.push({
						tmRef: foundAccountVch && foundAccountVch[0] && foundAccountVch[0]._id,
						tmRefNo: row.refNo,
						grs: [{
							grRef: row.gr,
							tMemo: row.billNo,
							amount: row.amount,
						}],
						amount: row.amount,
					});
				}

				await Bill.updateOne({_id: foundGr.bill._id}, {
					$set: {
						receiving: foundGr.bill.receiving
					}
				});
			}
		}

		return res.status(200).json({
			status: 'OK',
			message: 'Done',
		});

	} catch (e) {
		winston.error(e.message || e.toString());
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
			data: e,
		});
	}
};

const custPaymentReceiptDelete = async (req, res, next) => {
	try {

		let refNo = req.body.refNo;
		let clientId = req.user.clientId;

		// fetching the voucher and validating them before deletion
		let foundVch = await VoucherServiceV2.findVoucherByQueryAsync({
			refNo: new RegExp('^' + refNo + '$'),
			clientId: req.user.clientId,
			deleted: false
		}, {_id: 1, acImp: 1});

		if (foundVch.find(o => o.acImp.st))
		        throw new Error('Vouchers are already Imported to A/c');

		// fetching the Trip GR and validating them before Receipt deletion
		let foundGr = await GR.find({
			'tMemoReceipt.voucher': foundVch[0]._id,
			clientId: req.user.clientId,
		},{_id: 1, tMemo:1, bill: 1, provisionalBill: 1, supplementaryBillRef: 1}).lean();

		if(!foundGr.length)
			throw new Error('Gr Not Found');
		else{
			for(let oGr of foundGr){

				if(oGr.bill)
					throw new Error(`Can not Delete Bill Already Generated of TripMemo no.: ${oGr.tMemo.tMNo}`);

				if(oGr.supplementaryBillRef && oGr.supplementaryBillRef.length)
					throw new Error(`Can not Delete supplementaryBill Already Generated of TripMemo no.: ${oGr.tMemo.tMNo}`);

				if(oGr.provisionalBill && oGr.provisionalBill.length)
					throw new Error(`Can not Delete provisionalBill Already Generated of TripMemo no.: ${oGr.tMemo.tMNo}`);

			}
		}

		// Deletion code start

		// 1) freeing the stationary

		let foundStationary = await billStationaryService.findByRefAndType({
			bookNo: refNo,
			type: 'Ref No',
			clientId
		},{_id: 1});

		if (foundStationary) {
			await billStationaryService.updateStatus({
				userName: req.user.full_name,
				modelName: 'tripGr',
				stationaryId: foundStationary._id,
			}, 'cancelled');
		}

		// 2) removing the voucher
		foundVch[0] && await VoucherServiceV2.removeVoucher({_id: foundVch[0]._id, clientId});

		// 3) pulling the Receipt from the linked Gr

		await GR.updateMany({'tMemoReceipt.voucher':foundVch[0]._id}, {
			$pull: {
				tMemoReceipt: {
					voucher: foundVch[0]._id
				}
			},
			$set: {
				last_modified_at: new Date(),
			}
		});


		return res.status(200).json({
			status: 'OK',
			message: 'Deleted Successfully.',
		});
	} catch (e) {
		winston.error(e.message || e.toString());
		return res.status(500).json({
			status: 'ERROR',
			message: e.toString(),
		});
	}

};

async function addRemarkMemo(id, body) {
	try {

		let grBodyUpdate ={
			...body,
			remarks: body.remarks,

		}

		let updateTrip = await GR.findByIdAndUpdate({_id: otherUtil.arrString2ObjectId(id)}, {
			$set: grBodyUpdate
		});
		return updateTrip;
	} catch (e) {
		winston.error(e.message || e.toString());
		console.log('TripMemo Remark update', e.toString());
		throw e;
	}
}

module.exports = {
	getTrimMemo,
	updateTrimMemo,
	custPaymentReceipt,
	custPaymentReceiptEdit,
	custPaymentReceiptDelete,
	addRemarkMemo
};
