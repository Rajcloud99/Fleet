let moment = require("moment");
let tripGrReport = {};

tripGrReport.headers = [];

tripGrReport.transform = function (obj) {

	try {
		let row = {};
		row["TRIP NO."] = obj.trip && obj.trip.trip_no || 'NA';
		row["TRIP START DATE"] = (obj.trip && obj.trip.start_date) ? moment(obj.trip.start_date).format("DD-MM-YYYY") : 'NA';
		row["TRIP END DATE"] = (obj.trip && obj.trip.end_date ) ? moment(obj.trip.end_date).format("DD-MM-YYYY") : 'NA';
		row["GATE OUT DATE"] = obj.gateoutDate ? moment(obj.gateoutDate).format("DD-MM-YYYY HH:mm") : 'NA';
		row["GR STATUS"] =  obj.status || 'NA';
		row["GR STATUS DATE"] = obj.statuses && obj.statuses.find(st => st.status === obj.status) ? moment(new Date(obj.statuses.find(st => st.status === obj.status).date)).utcOffset(0, true).toDate() : 'NA';
		row["GR NO."] = obj.grNumber ? (obj.grNumber).toString().trim() : 'NA';
		row["GR DATE"] = obj.grDate ? moment(obj.grDate).format("DD-MM-YYYY") : 'NA';
		row["LOADING DATE"] = obj.statuses && obj.statuses.find(st => st.status === 'Loading Ended') ? moment(new Date(obj.statuses.find(st => st.status === 'Loading Ended').date)).format("DD-MM-YYYY") : 'NA';
		row["VEHICLE NO."] = (obj.trip && obj.trip.vehicle_no) || 'NA';
		row["VEHICLE MODEL"] =(obj.vehicle && obj.vehicle.model) || 'NA';
		row['GPS LOCATION'] = (obj.vehicle && obj.vehicle.gpsData && obj.vehicle.gpsData.address) || 'NA';
		row['LAST KNOWN DATE'] = (obj.vehicle && obj.vehicle.last_known && obj.vehicle.last_known.datetime) || 'NA';
		row["MATERIAL CODE"] = (obj.invoices.length && obj.invoices[0].material) ? obj.invoices.map(o => o.material && o.material.groupCode).filter(x => Boolean(x)).join(' ,') : 'NA';
		row["MATERIAL NAME"] = (obj.invoices.length && obj.invoices[0].material) ? obj.invoices.map(o => o.material && o.material.groupName).filter(x => Boolean(x)).join(' ,') : 'NA';
		row["CUSTOMER"] = (obj.customer && obj.customer.name) || 'NA';
		row["CUSTOMER CATEGORY"] = (obj.customer && obj.customer.category) || 'NA';
		row["CONSIGNOR"] = (obj.consignor && obj.consignor.name) || 'NA';
		row["CONSIGNEE"] = (obj.consignee && obj.consignee.name) || 'NA';
		row["BILLINGPARTY"] = (obj.billingParty && obj.billingParty.name) || 'NA';
		row['ROUTE'] = (obj.route && obj.route.name) || 'NA';
		row["BILLING ROUTE"] = ((obj.acknowledge && obj.acknowledge.source) ? ((obj.acknowledge.source) + ' to ' + (obj.acknowledge.destination)) : 'NA');
		row["SOURCE"] = (obj.acknowledge && obj.acknowledge.source) ? (obj.acknowledge.source) : 'NA';
		row["INTERMITTENT"] = obj.trip && obj.trip.imd.map(o => o.c).join(' ,') || 'NA';
		row["DESTINATION"] = (obj.acknowledge && obj.acknowledge.destination) ? (obj.acknowledge.destination) : 'NA';
		row["KM"] = obj.invoices && obj.invoices[0] && obj.invoices[0].routeDistance || 'NA';
		row["PAYMENT BASIS"] = obj.payment_basis || 'NA';
		row["PAYMENT TYPE"] = obj.payment_type || 'NA';
		row["CAPACITY"] = obj.invoices && obj.invoices[0] && obj.invoices[0].baseValueLabel || 'NA';
		row["FPA NO"] = (obj.fpa && obj.fpa.refNo) || 'NA';
		row["HIRESLIP NO"] = (obj.trip && obj.trip.vendorDeal && obj.trip.vendorDeal.loading_slip) || 'NA';
		row["INVOICE DATE"] = obj.invoices && obj.invoices[0] && obj.invoices[0].invoiceDate || 'NA';
		row["INVOICE NO."] = obj.invoices.map(o => o.invoiceNo).join(' ,') || 'NA';
		row["INVOICE AMOUNT"] = obj.invoices.map(o => o.invoiceAmt).join(' ,') || 'NA';
		row["INCENTIVE"] = obj.charges ? obj.charges.incentive : 'NA';
		row["QTY"] = obj.invoices.reduce((acc, invcObj) => acc + invcObj.noOfUnits || 0, 0);
		row["WEIGHT(T)"] = obj.invoices.reduce((acc, invcObj) => acc + invcObj.weightPerUnit || 0, 0) + ' T';
		row["BILLING UNIT"] = obj.invoices.reduce((acc, invcObj) => acc + invcObj.billingNoOfUnits || 0, 0);
		row["BILLING WEIGHT"] = obj.invoices.reduce((acc, invcObj) => acc + invcObj.billingWeightPerUnit || 0, 0);
		row["RATE"] = obj.invoices.map(o => (o.rate && parseFloat(o.rate.toFixed(2) || 0))).join(',') || 'NA';
		row["DPH"] = obj.invoices && obj.invoices[0] && (((obj.invoices[0].rate)*(obj.invoices[0].dphRate))/100) || 0;
		row["FREIGHT"] =  parseFloat(obj.basicFreight && obj.basicFreight.toFixed(2) || 0);
		row["TOTAL FREIGHT"] = parseFloat(obj.totalFreight && obj.totalFreight.toFixed(2) || 0);
		row["CGST"] = obj.CGST && parseFloat(obj.CGST.toFixed(2) || 0);
		row["SGST"] = obj.SGST && parseFloat(obj.SGST.toFixed(2) || 0);
		row["IGST"] = obj.iGST && parseFloat(obj.iGST.toFixed(2) || 0);
		let igst = obj.iGST && parseFloat(obj.iGST.toFixed(2) || 0);
		let dph = obj.invoices && obj.invoices[0] && parseFloat((((obj.invoices[0].rate || 0) * (obj.invoices[0].dphRate || 0 ))/100) * ((obj.iGST_percent || 0)/100).toFixed(2));
		row["DPH INCLUDING GST"] = parseFloat((igst + dph).toFixed(2));
		row["TOTAL AMOUNT"] = parseFloat(obj.totalAmount && obj.totalAmount.toFixed(2) || 0);
		row["TOTAL AAMOUNT WITH DPH"] = obj.invoices && obj.invoices[0] && parseFloat(((((obj.invoices[0].rate || 0)*(obj.invoices[0].dphRate || 0))/100) + (obj.invoices[0].rate + (obj.iGST && parseFloat(obj.iGST.toFixed(2) || 0))) + ((((obj.invoices[0].rate)*(obj.invoices[0].dphRate))/100) *((obj.iGST_percent || 0)/100))).toFixed(2)) || '0';
		row["TOT SUPPLY AMOUNT"] = parseFloat(obj.supplementaryBill && obj.supplementaryBill.totalFreight && obj.supplementaryBill.totalFreight.toFixed(2) || 0);
		row["INTERNAL RATE"] = obj.internal_rate && obj.internal_rate.toFixed(2) || 0;
		row["BRANCH"] = obj.branch && obj.branch.name || 'NA';
		row["BILL NO"] = obj.bill && obj.bill.billNo || obj.provisionalBill && obj.provisionalBill.ref && obj.provisionalBill.ref.map(o => o.billNo).join(' ,') || 'NA';
		row["BILL DATE"] = (obj.bill && obj.bill.billDate && moment(obj.bill.billDate).format("DD-MM-YYYY")) || (obj.provisionalBill && obj.provisionalBill.ref && obj.provisionalBill.ref.map(o => moment(o.billDate).format("DD-MM-YYYY")).join(' ,')) || 'NA';
		row["AR NO"] = obj.pod && obj.pod.arNo || 'NA';
		row["AR DATE"] = obj.pod && obj.pod.date && moment(obj.pod.date).format("DD-MM-YYYY") || 'NA';
		row["LOAD REF. NO"] = obj.invoices.map(o => o.loadRefNumber).join(' ,') || 'NA';
		row["DPH RATE"] = obj.invoices && obj.invoices[0] && obj.invoices[0].dphRate || 0;
		row["REF1"] = obj.invoices.map(o => o.ref1).join(' ,') || 'NA';
		row["REF2"] = obj.invoices.map(o => o.ref2).join(' ,') || 'NA';
		row["REF3"] = obj.invoices.map(o => o.ref3).join(' ,') || 'NA';
		row["REF4"] = obj.invoices.map(o => o.ref4).join(' ,') || 'NA';
		row["EWAY BILLS"] = obj.eWayBills ? obj.eWayBills.map(o => o.number+'('+moment(o.expiry).format("DD-MM-YYYY")+')').join(' ,') : 'NA';
		row["GR REMARK"] = obj.remarks || 'NA';
		row["POD REMARK"] = obj.pod && obj.pod.arRemark || 'NA';
		// let grAss = obj.statuses.find(st => st.status === 'GR Assigned');
		row["ENTRY BY"] = obj.created_by_full_name || 'NA';
		row["ENTRY AT"] = obj.created_at ? moment(obj.created_at).format("DD-MM-YYYY")  : 'NA';
		row["OWNERSHIP"] = (obj.trip && obj.trip.ownershipType) || 'NA';
		// row["ROUTE NAME"] = (obj.trip && obj.trip.route_name) || 'NA';
		let mrRec = (((obj.moneyReceipt && obj.moneyReceipt.totalMrAmount) || 0) + ((obj.moneyReceipt && obj.moneyReceipt.deduction) || 0));
		row["MR RECEIVED"] = mrRec || 'NA';
		let mrBalFr = (((obj.totalFreight || 0) + (obj.supplementaryBill && obj.supplementaryBill.totalFreight || 0)) - mrRec);
		row["MR BALANCE FREIGHT"] =  mrBalFr || 'NA';
		row["MR CHIT STATUS"] = (obj.moneyReceipt && obj.moneyReceipt.chitPending) || 'NA';
		let uploadedBy = obj.statuses.find(st => st.status === 'Unloading Ended');
		row["UNLOADED BY"] = (uploadedBy && uploadedBy.user_full_name) || 'NA';
		row["FPA AMT"] =  (obj.fpa && obj.fpa.amt) || 'NA';
		row["NONBILLABLE GR"] = (obj.isNonBillable) ? "Yes" : "No";
		row["VEHICLE OWNER NAME"] = obj.vehicle && obj.vehicle.owner_name || 'NA';
		row["FLEET"] = obj.vehicle && obj.vehicle.owner_group || 'NA';
		row["SEGMENT"] =  (obj.trip && obj.trip.segment_type) || 'NA';
		row["BILLED"] =(obj.bill || (obj.supplementaryBillRef && obj.supplementaryBillRef[0]) || (obj.provisionalBill && obj.provisionalBill.ref[0])) ? 'Yes' : 'No';
		// let cId = (obj.billingParty && obj.billingParty.clientId) || obj.clientId;
		// let clientAllowed = req.user.client_allowed.find(ca => ca.clientId === cId);
		// row["COMPANY]"] = clientAllowed && clientAllowed.name || req.clientData.client_display_name;
		row["REPORTING DATE"] = (obj.pod && obj.pod.unloadingArrivalTime) ? moment(obj.pod.unloadingArrivalTime).format("DD-MM-YYYY") : 'NA';
		row["REPORTING TIME"] = (obj.pod && obj.pod.unloadingArrivalTime) ? moment(obj.pod.unloadingArrivalTime).format("HH:mm") : 'NA';
		row["UNLOADING DATE"] = (obj.pod && obj.pod.billingUnloadingTime) ? moment(obj.pod.billingUnloadingTime).format("DD-MM-YYYY") : 'NA';
		row["UNLOADING TIME"] = (obj.pod && obj.pod.billingUnloadingTime) ? moment(obj.pod.billingUnloadingTime).format("HH:mm") : 'NA';obj.totalKm || 'NA';
		// row["HIRE PARTY REMARK"] =  obj.trip && obj.trip.vendorDeal && obj.trip.vendorDeal.remark || 'NA';
		return row;
	} catch (e) {
		throw new Error(e);
	}
};

function formatDate(date){
	return date && moment(date).format('DD-MM-YYYY') || '';
}

function round(num){
	return Math.round(num * 100)/100 || 0;
}
module.exports = tripGrReport;
