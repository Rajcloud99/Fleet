const moment = require("moment");
const Excel = require('exceljs');

const CORAL = {
	type: 'pattern',
	pattern: 'solid',
	fgColor: {
		argb: 'FFC300'
	}
};
const GREEN = {
	type: 'pattern',
	pattern: 'solid',
	fgColor: {
		argb: '05D21C'
	}
};
const HEADER_FILL = {
	type: 'pattern',
	pattern: 'solid',
	fgColor: {
		argb: 'ccccff'
	}
};

const HEADERS = [
	{key: 'CN Office', header: 'CN Office', width: 15, style: {fill: HEADER_FILL}},
	{key: 'CN No.', header: 'CN No.', width: 15, style: {fill: HEADER_FILL}},
	{key: 'CN Date', header: 'CN Date', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Vehicle No.', header: 'Vehicle No.', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Route', header: 'Route', width: 15, style: {fill: HEADER_FILL}},
	{key: 'ActualWeight', header: 'ActualWeight', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Charged Weight', header: 'Charged Weight', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Billing Party', header: 'Billing Party', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Bill No', header: 'Bill No', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Bill Date', header: 'Bill Date', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Reciept No', header: 'Reciept No', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Basic Freight', header: 'Basic Freight', width: 15, style: {fill: HEADER_FILL}},
	{key: 'LR Total Freight', header: 'LR Total Freight', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Balance Freight', header: 'Balance Freight', width: 15, style: {fill: HEADER_FILL}},
	{key: 'CN Remark', header: 'CN Remark', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Customer', header: 'Customer', width: 15, style: {fill: HEADER_FILL}},
	{key: 'GTA No.', header: 'GTA No.', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Ref2', header: 'Ref2', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Letter No', header: 'Letter No', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MROffice1', header: 'MROffice1', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MRNo1', header: 'MRNo1', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MRDate1', header: 'MRDate1', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Adv/MRAmt1', header: 'Adv/MRAmt1', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MROffice2', header: 'MROffice2', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MRNo2', header: 'MRNo2', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MRDate2', header: 'MRDate2', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MRAmt2', header: 'MRAmt2', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MROffice3', header: 'MROffice3', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MRNo3', header: 'MRNo3', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MRDate3', header: 'MRDate3', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MRAmt3', header: 'MRAmt3', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MR. Total', header: 'MR. Total', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Loading Amount', header: 'Loading Amount', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Unloading Amount', header: 'Unloading Amount', width: 15, style: {fill: HEADER_FILL}},
	{key: 'C.Deduction Amount', header: 'C.Deduction Amount', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Shortage Amount', header: 'Shortage Amount', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Damage Amount', header: 'Damage Amount', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Late Delivery Amount', header: 'Late Delivery Amount', width: 15, style: {fill: HEADER_FILL}},
	{key: 'TDS DED', header: 'TDS DED', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Ded.Total', header: 'Ded.Total', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Chit', header: 'Chit', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Payment Party Name', header: 'Payment Party Name', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Payment Responsible Person', header: 'Payment Responsible Person', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Payment Responsible Branch', header: 'Payment Responsible Branch', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Payment Type', header: 'Payment Type', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Mobile No', header: 'Mobile No', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Email', header: 'Email', width: 15, style: {fill: HEADER_FILL}},
	{key: 'In Traffic Lorry Engage by', header: 'In Traffic Lorry Engage by', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Remark', header: 'Remark', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Veh. Owner Name', header: 'Veh. Owner Name', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MR NO.', header: 'MR NO.', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Broker Name', header: 'Broker Name', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Payment Mode', header: 'Payment Mode', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Payment Date', header: 'Payment Date', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Party Name', header: 'Party Name', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Payment Ref', header: 'Payment Ref', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Payment RMK', header: 'Payment RMK', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MR Date', header: 'MR Date', width: 15, style: {fill: HEADER_FILL}},
	{key: 'MR Amount', header: 'MR Amount', width: 15, style: {fill: HEADER_FILL}},
	{key: 'DED Account Nature', header: 'DED Account Nature', width: 15, style: {fill: HEADER_FILL}},
	{key: 'DED Amount', header: 'DED Amount', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Total Ded Amount', header: 'Total Ded Amount', width: 15, style: {fill: HEADER_FILL}},
	{key: 'CN Adjuested Frt Breakup', header: 'CN Adjuested Frt Breakup', width: 15, style: {fill: HEADER_FILL}},
	{key: 'CN Adjusted Frt', header: 'CN Adjusted Frt', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Net Due', header: 'Net Due', width: 15, style: {fill: HEADER_FILL}},
	{key: 'Acct. Reg. Diff', header: 'Acct. Reg. Diff', width: 15, style: {fill: HEADER_FILL}},
	{key: 'AR Date', header: 'AR Date', width: 15, style: {fill: HEADER_FILL}},
	{key: 'GTALRNo', header: 'GTALRNo', width: 15, style: {fill: HEADER_FILL}},
	{key: 'PODRemark', header: 'PODRemark', width: 15, style: {fill: HEADER_FILL}},
];

module.exports = class {

	constructor(configs, tableAcc, req) {

		this.configs = configs;
		this.req = req;

		this.filename = `MR_Report_${moment(new Date()).format("DD-MM-YYYY_hh:mm:ss")}.xlsx`;
		this.dir = `reports/${this.req.user.clientId}/tripGr/${this.filename}`;
		this.workbook = new Excel.stream.xlsx.WorkbookWriter({
			filename: `./files/${this.dir}`
		});
		this.worksheet = this.workbook.addWorksheet('MR Report');
		this.worksheet.columns = HEADERS;

		this.merge('A1:BQ1');
		this.fill('BQ1', CORAL);
		this.setValue('BQ1', 'MR Report');
		this.worksheet.addRow(HEADERS.map(o => o.header));
		this.worksheet.getRow(4).commit();
	}

	merge(cell){
		this.worksheet.mergeCells(cell);
	}

	fill(cell, fill = GREEN){
		this.worksheet.getCell('A1').fill = fill;
	}

	setValue(cell, value){
		this.worksheet.getCell(cell).value = value;
	}

	async genUrl(){
		this.worksheet.commit();
		await this.workbook.commit();

		return 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port') + '/' + this.dir;
	}

	addRow(doc) {

		let row = {};
		row['CN Office'] = doc.branch && doc.branch.name || 'NA';
		row['Bill Date'] = doc.bill && doc.bill.billDate && moment(new Date(doc.bill.billDate)).format("DD-MM-YYYY") || 'NA';
		row['CN No.'] = doc.grNumber || 'NA';
		row['CN Date'] = moment(new Date(doc.grDate)).format("DD-MM-YYYY") || 'NA';
		row['Bill No'] = doc.bill && doc.bill.billNo || 'NA';
		row['Billing Party'] = doc.billingParty && doc.billingParty.name || 'NA';
		row['Customer'] = doc.customer && doc.customer.name || 'NA';
		row['Vehicle No.'] = doc.trip && doc.trip.vehicle_no || 'NA';
		row['Route'] = ((doc.acknowledge && doc.acknowledge.source) ? ((doc.acknowledge.source) + ' to ' + (doc.acknowledge.destination)) : 'NA');
		row['ActualWeight'] = doc.invoices && doc.invoices.reduce((acc, invcObj) => acc + invcObj.weightPerUnit || 0, 0) || 0;
		row['Charged Weight'] = doc.invoices && doc.invoices.reduce((acc, invcObj) => acc + invcObj.billingWeightPerUnit || 0, 0);
		row['Reciept No'] = doc.pod && doc.pod.arNo || 'NA';
		row['Basic Freight'] = doc.basicFreight || '0';
		row['LR Total Freight'] = doc.totalAmount && parseFloat(doc.totalAmount.toFixed(2) || 0);
		row['Payment Type'] = doc.payment_type || 'NA';
		row['CN Remark'] = doc.remarks || 'NA';
		row['GTA No.'] = doc.invoices && doc.invoices.map(o => o.ref2).join(' ,') || 'NA';
		row['Ref2'] = doc.invoices && doc.invoices.map(o => o.ref2).join(' ,') || 'NA';
		// let str = 'Adv/';
		// if (count) {
		// 	for (index = 1, j = 0; index <= count; index++ , j++) {
		// 		if (index > 1)
		// 			str = '';
		// 		let obj = doc.moneyReceipt && doc.moneyReceipt.collection && doc.moneyReceipt.collection[j] || {};
		// 		row['MROffice' + index] = obj.mrOffice || 'NA';
		// 		row['MRNo' + index] = obj.mrNo || 'NA';
		// 		row['MRDate' + index] = obj.mrDate || 'NA';
		// 		row[str + 'MRAmt' + index] = obj.mrAmount || '0';
		// 	}
		// }
		// row['Advance'] = '';
		// row['Balance'] = doc.totalAmount + (doc.supplementaryBill && doc.supplementaryBill.totalFreight || 0) - (doc.moneyReceipt && doc.moneyReceipt.totalMrAmount || '0')  + (otherUtil.sumObjKey(mrDedcuction) || '0');
		row['MR. Total'] = doc.moneyReceipt && doc.moneyReceipt.totalMrAmount || '0';
		let mrDedcuction = doc.moneyReceipt && doc.moneyReceipt.deduction || {};
		row['Loading Amount'] = mrDedcuction.loadingAmount || '0';
		row['Unloading Amount'] = mrDedcuction.unloadingAmount || '0';
		row['C.Deduction Amount'] = mrDedcuction.munshiyanaAmount || '0';
		row['Shortage Amount'] = mrDedcuction.shortageAmount || '0';
		row['Damage Amount'] = mrDedcuction.damageAmount || '0';
		row['Late Delivery Amount'] = mrDedcuction.ltDeliveryAmount || '0';
		row['TDS DED'] = mrDedcuction.tdsAmount || '0';
		row['Ded.Total'] = otherUtil.sumObjKey(mrDedcuction) || '0';
		row['Chit'] = doc.moneyReceipt && doc.moneyReceipt.chitPending || 'NA';
		row['Balance Freight'] = doc.totalAmount + (doc.supplementaryBill && doc.supplementaryBill.totalFreight || 0) - (doc.moneyReceipt && doc.moneyReceipt.totalMrAmount || '0') - (otherUtil.sumObjKey(mrDedcuction) || '0');
		row['Payment Party Name'] = doc.moneyReceipt && doc.moneyReceipt.paymentParty || 'NA';
		row['Payment Responsible Person'] = doc.moneyReceipt && doc.moneyReceipt.responsiblePerson || 'NA';
		row['Payment Responsible Branch'] = doc.moneyReceipt && doc.moneyReceipt.branch && doc.moneyReceipt.branch.name || 'NA';
		row['Mobile No'] = doc.moneyReceipt && doc.moneyReceipt.mobileNo || 'NA';
		row['Email'] = doc.moneyReceipt && doc.moneyReceipt.emailId || 'NA';
		row['In Traffic Lorry Engage by'] = 'NA';
		row['Remark'] = doc.moneyReceipt && doc.moneyReceipt.remark || 'NA';
		row['Veh. Owner Name'] = doc.vehicle && doc.vehicle.owner_name || 'NA';
		row['MR NO.'] = doc.moneyReceipt && doc.moneyReceipt.collection && doc.moneyReceipt.collection.map(o => o.mrNo).join(' ,') || 'NA';
		row['Broker Name'] = 'NA';
		row['Payment Mode'] = doc.moneyReceipt && doc.moneyReceipt.collection && doc.moneyReceipt.collection.map(o => o.paymentMode).join(' ,') || 'NA';
		row['Payment Date'] = doc.moneyReceipt && doc.moneyReceipt.collection && doc.moneyReceipt.collection.map(o => o.paymentDate && moment(o.paymentDate).format("DD-MM-YYYY")).join(' ,') || 'NA';
		row['Party Name'] = doc.moneyReceipt && doc.moneyReceipt.collection && doc.moneyReceipt.collection.map(o => o.partyName).join(' ,') || 'NA';
		row['Payment Ref'] = doc.moneyReceipt && doc.moneyReceipt.collection && doc.moneyReceipt.collection.map(o => o.paymentRef).join(' ,') || 'NA';
		row['Payment RMK'] = doc.moneyReceipt && doc.moneyReceipt.collection && doc.moneyReceipt.collection.map(o => o.paymentRmk).join(' ,') || 'NA';
		row['MR Date'] = doc.moneyReceipt && doc.moneyReceipt.collection && doc.moneyReceipt.collection.map(o => moment(o.mrDate).format("DD-MM-YYYY")).join(' ,') || 'NA';
		row['MR Amount'] = doc.moneyReceipt && doc.moneyReceipt.collection && doc.moneyReceipt.collection.map(o => o.mrAmount).join(' ,') || 'NA';
		row['DED Account Nature'] = 'NA';
		row['DED Amount'] = otherUtil.sumObjKey(mrDedcuction) || '0';
		row['Total Ded Amount'] = otherUtil.sumObjKey(mrDedcuction) || '0';
		row['CN Adjuested Frt Breakup'] = 'NA';
		row['CN Adjusted Frt'] = 'NA';
		row['Net Due'] = 'NA';
		row['Acct. Reg. Diff'] = 'NA';
		row['AR Date'] = doc.pod && doc.pod.date && moment(doc.pod.date).format("DD-MM-YYYY") || 'NA';
		row['GTALRNo'] = 'NA';
		row['Letter No'] = doc.moneyReceipt && doc.moneyReceipt.letterNo || 'NA';
		row['PODRemark'] = doc.pod && doc.pod.arRemark || 'NA';
		this.worksheet.addRow(row).commit();
	}
}
