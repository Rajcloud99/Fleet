'use strict';
let GR = commonUtil.getModel('tripGr');
const BillStationary = commonUtil.getModel('billStationary');
let VoucherServiceV2 = commonUtil.getService('voucher');
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
					payment_basis:1,remarks:1,'vehicle.veh_type_name':1,'vehicle.veh_type':1,'vehicle._id':1, 'branch.name':1,'branch._id':1,'branch.grBook':1, 'branch.tripMemoBook': 1,'branch.brokerMemoBook': 1,'billingParty.name':1,'billingParty._id':1,'billingParty.account.name':1,'billingParty.account._id':1,
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

const multiPaymentAdd = async (req, res, next) => {
	try {
		let aBrokerMemo = JSON.parse(JSON.stringify(req.body));
		let stationaryId = aBrokerMemo[0].stationaryId;

		//start vch
		let oVch = {ledgers: []}, ledger = {}, crAmt = 0, drAmt = 0;

		for (let i = 0; i < aBrokerMemo.length; i++) {
			if (i == 0) {//extract voucher level info
				oVch.refNo = aBrokerMemo[i].refNo;
				oVch.date = aBrokerMemo[i].paymentDate;
				oVch.type = 'Receipt';
				oVch.vT = 'Broker Memo Receipt';
				oVch.clientId = req.user.clientId;
				oVch.stationaryId = aBrokerMemo[i].stationaryId;
				oVch.isEditable = false;
				oVch.narration = aBrokerMemo[i].narration;
				oVch.branch = aBrokerMemo[i].branch;
				oVch.createdBy = req.user.full_name || req.user.user_full_name;
				oVch.paymentMode = aBrokerMemo[i].paymentMode;
				oVch.paymentRef = aBrokerMemo[i].paymentRef;
			}

			if (ledger[aBrokerMemo[i].account_data.from]) {
				ledger[aBrokerMemo[i].account_data.from].amount = ledger[aBrokerMemo[i].account_data.from].amount + aBrokerMemo[i].amount;
				crAmt = crAmt + aBrokerMemo[i].amount;
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
				ledger[aBrokerMemo[i].account_data.from] = {
					account: aBrokerMemo[i].account_data.from,
					amount: aBrokerMemo[i].amount,
					cRdR: "CR",
					lName: aBrokerMemo[i].account_data.fromName,
					bills: []
				};
				ledger[aBrokerMemo[i].account_data.from].amount = aBrokerMemo[i].amount;
				crAmt = crAmt + aBrokerMemo[i].amount;
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
			if (ledger[aBrokerMemo[i].account_data.to]) {
				ledger[aBrokerMemo[i].account_data.to].amount = ledger[aBrokerMemo[i].account_data.to].amount + aBrokerMemo[i].amount;
				drAmt = drAmt + aBrokerMemo[i].amount;
				if (aBrokerMemo[i].billNo) {
					let oBill = {
						billNo: aBrokerMemo[i].billNo,
						billType: aBrokerMemo[i].billType,
						amount: aBrokerMemo[i].amount,
						remAmt: aBrokerMemo[i].billType == "New Ref" ? aBrokerMemo[i].amount : 0
					};
					ledger[aBrokerMemo[i].account_data.to]["bills"].push(oBill);
				}
			} else {
				ledger[aBrokerMemo[i].account_data.to] = {
					account: aBrokerMemo[i].account_data.to,
					amount: aBrokerMemo[i].amount,
					cRdR: "DR",
					lName: aBrokerMemo[i].account_data.toName,
					bills: []
				};
				ledger[aBrokerMemo[i].account_data.to].amount = aBrokerMemo[i].amount;
				drAmt = drAmt + aBrokerMemo[i].amount;
				if (aBrokerMemo[i].billNo) {
					let oBill = {
						billNo: aBrokerMemo[i].billNo,
						billType: aBrokerMemo[i].billType,
						amount: aBrokerMemo[i].amount,
						remAmt: aBrokerMemo[i].billType == "New Ref" ? aBrokerMemo[i].amount : 0
					};
					ledger[aBrokerMemo[i].account_data.to]["bills"].push(oBill);
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

		let tripUpd = await GR.bulkWrite(aBrokerMemo.map((oGr, index) => {
			let oReceipt = {
				clientId: req.user.clientId,
				vT: 'Broker Memo Receipt',
				refNo: oGr.refNo,
				stationaryId: oGr.stationaryId,
				amount: oGr.amount,
				remainingAmount: oGr.remainingAmount,
				trip_no: oGr.trip_no,
				grNumber: oGr.grNumber,
				bMemoNo: oGr.billNo,
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
							bMemoReceipt: oReceipt
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

			// if(foundGr && foundGr.bill){
			// 	const mr = foundGr.bill.receiving
			// 		&& Array.isArray(foundGr.bill.receiving.moneyReceipt)
			// 		&& foundGr.bill.receiving.moneyReceipt
			// 		|| [];
			//
			// 	const refPtr = mr.find(o => o.bmRefNo === row.refNo);
			//
			// 	if(refPtr) {
			// 		const grPtr = refPtr.grs.find(o => o.bMemo === row.billNo);
			// 		if (grPtr) {
			// 			grPtr.amount = row.amount;
			// 		}else{
			// 			refPtr.grs.push({
			// 				grRef: row.gr,
			// 				bMemo: row.billNo,
			// 				amount: row.amount,
			// 			});
			// 		}
			// 		refPtr.amount = refPtr.grs.reduce((acc, oGr) => acc + oGr.amount, 0);
			// 	}else{
			// 		mr.push({
			// 			bmRef: aVch && aVch[0] && aVch[0].voucher._id,
			// 			bmRefNo: row.refNo,
			// 			grs: [{
			// 				grRef: row.gr,
			// 				bMemo: row.billNo,
			// 				amount: row.amount,
			// 			}],
			// 			amount: row.amount,
			// 		});
			// 	}
			//
			// 	await Bill.updateOne({_id: foundGr.bill._id}, {
			// 		$set: {
			// 			receiving: foundGr.bill.receiving
			// 		}
			// 	});
			// }
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

const multiPaymentEdit = async (req, res, next) => {
	try {

		let aBrokerMemo = JSON.parse(JSON.stringify(req.body.aBrokerMemo));
		let updateManyGrQuery = [];
		let refNo = req.body.refNo;

		let foundAccountVch = await VoucherServiceV2.findVoucherByQueryAsync({
			refNo: new RegExp('^' + refNo + '$'),
			clientId: req.user.clientId,
			deleted: false
		}, {_id: 1, acImp: 1});

		if (foundAccountVch.find(o => o.acImp.st))
			throw new Error('Edit not possible. Some or All Voucher are Imported to Account');

		let newStationaryId = aBrokerMemo[0].stationaryId;
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
		for (let i = 0; i < aBrokerMemo.length; i++) {
			if (i == 0) {
				oVch.refNo = aBrokerMemo[i].refNo;
				oVch.date = aBrokerMemo[i].paymentDate;
				oVch.type = 'Receipt';
				oVch.vT = 'Broker Memo Receipt';
				oVch.clientId = req.user.clientId;
				oVch.stationaryId = aBrokerMemo[i].stationaryId;
				oVch.isEditable = false;
				oVch.narration = aBrokerMemo[i].narration;
				oVch.branch = aBrokerMemo[i].branch;
				oVch.createdBy = req.user.full_name || req.user.user_full_name;
				oVch.paymentMode = aBrokerMemo[i].paymentMode;
				oVch.paymentRef = aBrokerMemo[i].paymentRef;
				oVch.paymentDate = aBrokerMemo[i].paymentDate;
			}
			if (ledger[aBrokerMemo[i].account_data.from]) {
				ledger[aBrokerMemo[i].account_data.from].amount = ledger[aBrokerMemo[i].account_data.from].amount + aBrokerMemo[i].amount;
				crAmt = crAmt + aBrokerMemo[i].amount;

			} else {
				ledger[aBrokerMemo[i].account_data.from] = {
					account: aBrokerMemo[i].account_data.from,
					amount: aBrokerMemo[i].amount,
					cRdR: "CR",
					lName: aBrokerMemo[i].account_data.fromName,
					bills: []
				};
				ledger[aBrokerMemo[i].account_data.from].amount = aBrokerMemo[i].amount;
				crAmt = crAmt + aBrokerMemo[i].amount;
			}
			if (ledger[aBrokerMemo[i].account_data.to]) {
				ledger[aBrokerMemo[i].account_data.to].amount = ledger[aBrokerMemo[i].account_data.to].amount + aBrokerMemo[i].amount;
				drAmt = drAmt + aBrokerMemo[i].amount;
				if (aBrokerMemo[i].billNo) {
					let oBill = {
						billNo: aBrokerMemo[i].billNo,
						billType: aBrokerMemo[i].billType,
						amount: aBrokerMemo[i].amount,
						remAmt: aBrokerMemo[i].billType == "New Ref" ? aBrokerMemo[i].amount : 0
					};
					ledger[aBrokerMemo[i].account_data.to]["bills"].push(oBill);
				}
			} else {
				ledger[aBrokerMemo[i].account_data.to] = {
					account: aBrokerMemo[i].account_data.to,
					amount: aBrokerMemo[i].amount,
					cRdR: "DR",
					lName: aBrokerMemo[i].account_data.toName,
					bills: []
				};
				ledger[aBrokerMemo[i].account_data.to].amount = aBrokerMemo[i].amount;
				drAmt = drAmt + aBrokerMemo[i].amount;
				if (aBrokerMemo[i].billNo) {
					let oBill = {
						billNo: aBrokerMemo[i].billNo,
						billType: aBrokerMemo[i].billType,
						amount: aBrokerMemo[i].amount,
						remAmt: aBrokerMemo[i].billType == "New Ref" ? aBrokerMemo[i].amount : 0
					};
					ledger[aBrokerMemo[i].account_data.to]["bills"].push(oBill);
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
			'bMemoReceipt.voucher': oVch._id,
			clientId: req.user.clientId,
		}).lean();

		for (let i = 0; i < foundGr.length; i++) {
			let oGr = foundGr[i];
			let matchIndex = aBrokerMemo.findIndex(o => o.gr === oGr._id.toString());
			if (matchIndex + 1) {
				let matchGr = aBrokerMemo[matchIndex];
				aBrokerMemo.splice(matchIndex, 1);

				let oReceipt = {
					clientId: req.user.clientId,
					vT: "Broker Memo Receipt",
					refNo: matchGr.refNo,
					stationaryId: matchGr.stationaryId,
					amount: matchGr.amount,
					remainingAmount: matchGr.remainingAmount,
					trip_no: matchGr.trip_no,
					grNumber: matchGr.grNumber,
					bMemoNo: matchGr.billNo,
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
							'bMemoReceipt.voucher': oVch._id,
						},
						update: {
							$set: {
								"bMemoReceipt.$": oReceipt
							}
						}
					}
				});

			} else {
				let fdGR = await GR.findOne({
					'bMemoReceipt.voucher': oVch._id,
				}, {
					'bMemoReceipt.$': 1,
					"_id": 1
				}).lean();

				if (fdGR)
					updateManyGrQuery.push({
						updateOne: {
							filter: {
								_id: fdGR._id,
								'bMemoReceipt.voucher': oVch._id,
							},
							update: {
								$pull: {
									'bMemoReceipt.voucher': {
										voucher: oVch._id
									}
								}
							}
						}
					});
			}
		}

		for (let i = 0; i < aBrokerMemo.length; i++) { // vch to add
			let oGr = aBrokerMemo[i];

			let oReceipt = {
				clientId: req.user.clientId,
				vT: 'Broker Memo Receipt',
				refNo: oGr.refNo,
				stationaryId: oGr.stationaryId,
				amount: oGr.amount,
				remainingAmount: oGr.remainingAmount,
				trip_no: oGr.trip_no,
				grNumber: oGr.grNumber,
				bMemoNo: oGr.billNo,
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
							"bMemoReceipt": oReceipt
						}
					}
				}
			});
		}

		updateManyGrQuery.length && await GR.bulkWrite(updateManyGrQuery);

		for(let row of req.body.aBrokerMemo){
			let foundGr = await GR.findOne({
				'_id': row.gr,
				clientId: req.user.clientId,
				bill: {$exists: true}
			}, {bill: 1})
				.populate("bill", "receiving items.gr")
				.lean();

			// if(foundGr && foundGr.bill){
			// 	const mr = foundGr.bill.receiving
			// 		&& Array.isArray(foundGr.bill.receiving.moneyReceipt)
			// 		&& foundGr.bill.receiving.moneyReceipt
			// 		|| [];
			//
			// 	const refPtr = mr.find(o => o.bmRefNo === row.refNo);
			//
			// 	if(refPtr) {
			// 		const grPtr = refPtr.grs.find(o => o.bMemo === row.billNo);
			// 		if (grPtr) {
			// 			grPtr.amount = row.amount;
			// 		}else{
			// 			refPtr.grs.push({
			// 				grRef: row.gr,
			// 				bMemo: row.billNo,
			// 				amount: row.amount,
			// 			});
			// 		}
			// 		refPtr.amount = refPtr.grs.reduce((acc, oGr) => acc + oGr.amount, 0);
			// 	}else{
			// 		mr.push({
			// 			bmRef: foundAccountVch && foundAccountVch[0] && foundAccountVch[0]._id,
			// 			bmRefNo: row.refNo,
			// 			grs: [{
			// 				grRef: row.gr,
			// 				bMemo: row.billNo,
			// 				amount: row.amount,
			// 			}],
			// 			amount: row.amount,
			// 		});
			// 	}
			//
			// 	await Bill.updateOne({_id: foundGr.bill._id}, {
			// 		$set: {
			// 			receiving: foundGr.bill.receiving
			// 		}
			// 	});
			// }
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

const multiPaymentDel = async (req, res, next) => {
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
			'bMemoReceipt.voucher': foundVch[0]._id,
			clientId: req.user.clientId,
		},{_id: 1, bMemo:1, bill: 1, provisionalBill: 1, supplementaryBillRef: 1}).lean();

		if(!foundGr.length)
			throw new Error('Gr Not Found');
		else{
			for(let oGr of foundGr){

				if(oGr.bill)
					throw new Error(`Can not Delete Bill Already Generated of TripMemo no.: ${oGr.bMemo.bmNo}`);

				if(oGr.supplementaryBillRef && oGr.supplementaryBillRef.length)
					throw new Error(`Can not Delete supplementaryBill Already Generated of TripMemo no.: ${oGr.bMemo.bmNo}`);

				if(oGr.provisionalBill && oGr.provisionalBill.length)
					throw new Error(`Can not Delete provisionalBill Already Generated of TripMemo no.: ${oGr.bMemo.bmNo}`);

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

		await GR.updateMany({'bMemoReceipt.voucher':foundVch[0]._id}, {
			$pull: {
				bMemoReceipt: {
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

module.exports = {
	get,
	update,
	multiPaymentAdd,
	multiPaymentEdit,
	multiPaymentDel,
};
