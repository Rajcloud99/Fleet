const mongoose = require('mongoose');

const EwayBillSchema = new mongoose.Schema(
	{
		ewbNo: constant.requiredString,
		clientId: constant.requiredString,
		ewbDate: constant.requiredDate,
		status: constant.requiredString,
		genGstin: {
			type: String,
			match: [/\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]/, 'Please provide valid GST number!'],
			required: true
		},
		docNo: constant.requiredString,
		docDate: constant.requiredDate,
		delPinCode: constant.requiredString,
		delStateCode: constant.requiredNumber,
		delPlace: constant.requiredString,
		validUpto: constant.requiredDate,
		extendedTimes: constant.requiredNumber,
		rejectStatus: constant.requiredString,
		genMode: constant.requiredString,
		igstValue: constant.requiredNumber,
		fromStateCode: constant.requiredNumber,
		fromPincode: constant.requiredNumber,
		fromPlace: constant.requiredString,
		toPincode: constant.requiredNumber,
		userGstin: constant.requiredString,
		toTrdName: constant.requiredString,
		transporterName: constant.requiredString,
		supplyType: constant.requiredString,
		cessNonAdvolValue: constant.requiredNumber,
		toAddr2: constant.requiredString,
		toAddr1: constant.requiredString,
		toPlace: constant.requiredString,
		totInvValue: constant.requiredNumber,
		actToStateCode: constant.requiredNumber,
		otherValue: constant.requiredNumber,
		fromTrdName: constant.requiredString,
		vehicleType: constant.requiredString,
		fromGstin: constant.requiredString,
		subSupplyType: constant.requiredNumber,
		totalValue: constant.requiredNumber,
		sgstValue: constant.requiredNumber,
		docType: constant.requiredString,
		toGstin: constant.requiredString,
		noValidDays: constant.requiredNumber,
		toStateCode: constant.requiredNumber,
		cessValue: constant.requiredNumber,
		actualDist: constant.requiredNumber,
		actFromStateCode: constant.requiredNumber,
		transactionType: constant.requiredNumber,
		transporterId: constant.requiredString,
		cgstValue: constant.requiredNumber,
		fromAddr2: constant.requiredString,
		fromAddr1: constant.requiredString,
		transDocNo: String,
		transDocDate: String,
		vehicleNo: String,
		itemList: [{
			itemNo: constant.requiredNumber,
			productId: constant.requiredNumber,
			productName: constant.requiredString,
			productDesc: constant.requiredString,
			hsnCode: constant.requiredNumber,
			quantity: constant.requiredNumber,
			qtyUnit: constant.requiredString,
			cgstRate: constant.requiredNumber,
			sgstRate: constant.requiredNumber,
			igstRate: constant.requiredNumber,
			cessRate: constant.requiredNumber,
			cessNonAdvol: constant.requiredNumber,
			taxableAmount: constant.requiredNumber

		}],
		VehiclListDetails: [{
			updMode: constant.requiredString,
			vehicleNo: constant.requiredString,
			fromPlace: constant.requiredString,
			fromState: constant.requiredNumber,
			tripshtNo: constant.requiredNumber,
			userGSTINTransin: constant.requiredString,
			enteredDate: constant.requiredString,
			transMode: constant.requiredNumber,
			transDocNo: constant.requiredString,
			transDocDate: constant.requiredString,
			groupNo: constant.requiredNumber

		}],
	},
	constant.timeStamps
);

EwayBillSchema.index({ewbNo: 1}, {unique: true, partialFilterExpression: {deleted: {$eq: false}}});

module.exports = mongoose.model('eWayBill', EwayBillSchema);
