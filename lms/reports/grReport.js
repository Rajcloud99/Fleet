const moment = require("moment");
const Excel = require('exceljs');
const dirUtil = require("../../utils/dir-util");

const HEADER_FILL = {
	type: 'pattern',
	pattern: 'solid',
	fgColor: {
		argb: 'ccccff'
	}
};

const HEADERS = [
	// {key: 'GR ID', value: 'GR ID', width: 0},
	{key: 'tripNo', value: "TRIP NO.", width: 8 , style: {fill: HEADER_FILL}},
	{key: 'tripStartDate', value: "TRIP START DATE", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'tripEndDate', value: "TRIP END DATE", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'gateoutDate', value: "GATE OUT DATE", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'status', value: "GR STATUS", width: 8 , style: {fill: HEADER_FILL}},
	{key: 'statusDate', value: "GR STATUS DATE", width: 8 , style: {fill: HEADER_FILL}},
	{key: 'grNo', value: "GR NO.", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'grDate', value: "GR DATE", width: 15 , style: {fill: HEADER_FILL}},
	// {key: 'loadingDate', value: "LOADING DATE", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'vehicle_no', value: "VEHICLE NO.", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'gpsData', value: "GPS LOCATION", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'last_known', value: "LAST KNOWN DATE", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'model', value: "VEHICLE MODEL", width: 15 , style: {fill: HEADER_FILL}},
	// {key: 'material', value: "MATERIAL CODE", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'materialName', value: "MATERIAL NAME", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'unloadingArrivalTime', value: 'REPORTING DATE', width: 20 , style: {fill: HEADER_FILL}},
	// {key: 'unloadingArrivalTime', value: 'REPORTING TIME', width: 20 , style: {fill: HEADER_FILL}},
	{key: 'billingUnloadingTime', value: "UNLOADING DATE", width: 20 , style: {fill: HEADER_FILL}},
	// {key: 'billingUnloadingTime', value: "UNLOADING TIME", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'customer', value: "CUSTOMER", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'customerCat', value: "CUSTOMER CATEGORY", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'consignor', value: "CONSIGNOR", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'consignee', value: "CONSIGNEE", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'billingParty', value: "BILLINGPARTY", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'route', value: "BILLING ROUTE", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'source', value: "SOURCE", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'Intermittent', value: "INTERMITTENT", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'destination', value: "DESTINATION", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'routeDistance', value: "KM", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'payment_basis', value: "PAYMENT BASIS", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'payment_type', value: "PAYMENT TYPE", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'baseValueLabel', value: "CAPACITY", width: 20 , style: {fill: HEADER_FILL}},
	{key: false, value: "FPA NO", width: 20 , style: {fill: HEADER_FILL}},
	// {key: 'loading_slip', value: "HIRESLIP NO", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'invDate', value: "INVOICE DATE", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'invoiceNo', value: "INVOICE NO.", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'invoiceAmt', value: "INVOICE AMOUNT", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'loadRefNumber', value: "LOAD REF. NO", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'dphRate', value: "DPH RATE", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'ref1', value: "REF1", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'ref2', value: "REF2", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'ref3', value: "REF3", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'ref4', value: "REF4", width: 20 , style: {fill: HEADER_FILL}},
	// {key: 'incentive', value: "INCENTIVE", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'noOfUnits', value: "QTY", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'weightPerUnit', value: "WEIGHT(T)", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'billingNoOfUnits', value: "BILLING UNIT", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'billingWeightPerUnit', value: "BILLING WEIGHT", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'rate', value: "RATE", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'dph', value: "DPH", width: 20 , style: {fill: HEADER_FILL}},
	{key: 'basicFreight', value: "FREIGHT", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'totalFreight', value: "TOTAL FREIGHT", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'cGST', value: "CGST", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'sGST', value: "SGST", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'iGST', value: "IGST", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'dphIncludeGst', value: "DPH INCLUDING GST", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'totalAmount', value: "TOTAL AMOUNT", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'totAmtwithDph', value: "TOTAL AAMOUNT WITH DPH", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'totalFreight', value: "TOT SUPPLY AMOUNT", width: 15 , style: {fill: HEADER_FILL}},
	// {key: 'internal_rate', value: "INTERNAL RATE", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'branch', value: "BRANCH", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'billNo', value: "BILL NO", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'billDate', value: "BILL DATE", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'arNo', value: "AR NO", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'arDate', value: "AR DATE", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'eWayBills', value: "EWAY BILLS", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'eWayBills', value: "EWAY BILL DATE", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'remarks', value: "GR REMARK", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'arRemark', value: "POD REMARK", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'entryBy', value: "ENTRY BY", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'entryAt', value: "ENTRY AT", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'ownershipType', value: "OWNERSHIP", width: 15 , style: {fill: HEADER_FILL}},
	// {key: 'routeName', value: "ROUTE NAME", width: 20},
	{key: 'mrReceived', value: "MR RECEIVED", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'mrBalanceFreight', value: "MR BALANCE FREIGHT", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'mrChitStatus', value: "MR CHIT STATUS", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'unLoadedBy', value: "UNLOADED BY", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'fpaAmt', value: "FPA AMT", width: 15 , style: {fill: HEADER_FILL}},
	// {key: 'hireSlipTotPayble', value: "HIRESLIP TOTAL PAYABLE", width: 15},
	{key: 'nonBillableGr', value: "NONBILLABLE GR", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'owner_name', value: "VEHICLE OWNER NAME", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'owner_group', value: "FLEET", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'segment_type', value: "SEGMENT", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'billed', value: "BILLED", width: 15 , style: {fill: HEADER_FILL}},
	{key: 'client', value: 'COMPANY', width: 15 , style: {fill: HEADER_FILL}},
	// {key: 'vendorRemark', value: 'HIRE PARTY REMARK', width: 15},
]

module.exports = class {

	constructor(configs, tableAcc, req) {

		this.configs = configs;
		this.req = req;
		let saveDir = projectHome+'/files/reports/'+this.req.user.clientId+'/tripGr';
		dirUtil.resolveDir(saveDir);
		this.filename = `Trip_Gr_${moment(new Date()).format("DD-MM-YYYY hh:mm:ss")}.xlsx`;
		this.dir = `reports/${this.req.user.clientId}/tripGr/${this.filename}`;

		this.workbook = new Excel.stream.xlsx.WorkbookWriter({
			filename: `./files/${this.dir}`
		});
		this.worksheet = this.workbook.addWorksheet('Trip GR Report');
		this.worksheet.columns = this.prepareHeader(configs, tableAcc);
	}

	_isVisible(configs, key) {
		return configs && configs[key] && configs[key].visible;
	}

	prepareHeader(configs, tableAcc) {

		if(!(Array.isArray(tableAcc) && tableAcc.length > 0))
			tableAcc = [];

		return HEADERS.reduce((headers, {key, value, width, ...rest}) => {
			let _val;
			if((tableAcc.length > 0 ? tableAcc.indexOf(key) + 1 : true) && (_val = this.configName(configs, key, value)))
				headers.push({
					header: _val,
					key: _val,
					width,
					...rest
				});
			return headers;
		}, []);
	}

	configName(configs, key, fallBack) {
		if (configs && configs[key]) {
			if (configs[key].visible) {
				return configs[key].label || configs[key].ourLabel;
			} else {
				return;
			}
		} else {
			return fallBack;
		}
	}

	async genUrl(){
		this.worksheet.commit();
		await this.workbook.commit();
		return 'http://' + commonUtil.getConfig('download_host') + ':' + commonUtil.getConfig('download_port') + '/' + this.dir;
	}


	addRow(doc) {
		let row = {};
		if (!doc.invoices) doc.invoices = [];
		// row['GR ID'] = doc._id.toString();
		row['TRIP NO.'] = (doc.trip && doc.trip.trip_no) || 'NA';
		row[this.configName(this.configs, 'tripStartDate', "TRIP START DATE")] = (doc.trip && doc.trip.start_date) ? moment(
			doc.trip.start_date).utcOffset(0, true).toDate() : "NA";
		row[this.configName(this.configs, 'tripEndDate', "TRIP END DATE")] = (doc.trip && doc.trip.end_date ) ? moment(
			doc.trip.end_date).utcOffset(0, true).toDate() : "NA";
		row[this.configName(this.configs, 'gateoutDate', "GATE OUT DATE")] = doc.gateoutDate ? moment(doc.gateoutDate).utcOffset(0, true).toDate() : 'NA';
		row['GPS LOCATION'] = (doc.vehicle && doc.vehicle.gpsData && doc.vehicle.gpsData.address) || 'NA';
		row['LAST KNOWN DATE'] = (doc.vehicle && doc.vehicle.last_known && doc.vehicle.last_known.datetime) || 'NA';
		row[this.configName(this.configs, 'status', "GR STATUS")] = doc.status || 'NA';
		row[this.configName(this.configs, 'statusDate', "GR STATUS DATE")] = doc.statuses && doc.statuses.find(st => st.status === doc.status) ? moment(new Date(doc.statuses.find(st => st.status === doc.status).date)).utcOffset(0, true).toDate() : 'NA';
		row[this.configName(this.configs, 'grNo', "GR NO.")] = doc.grNumber ? (doc.grNumber).toString().trim() : 'NA';
		row[this.configName(this.configs, 'grDate', "GR DATE")] = doc.grDate ? moment(doc.grDate).utcOffset(0, true).toDate() : 'NA';
		// row[this.configName(this.configs, 'loadingDate', "LOADING DATE")] = doc.statuses && doc.statuses.find(st => st.status === 'Loading Ended') ? moment(new Date(doc.statuses.find(st => st.status === 'Loading Ended').date)).utcOffset(0, true).toDate() : 'NA';
		row[this.configName(this.configs, 'vehicle_no', "VEHICLE NO.")] = (doc.trip && doc.trip.vehicle_no) || 'NA';
		row[this.configName(this.configs, 'model', "VEHICLE MODEL")] = (doc.vehicle && doc.vehicle.model) || 'NA';
		// row[this.configName(this.configs, 'material', "MATERIAL CODE")] = (doc.invoices.length && doc.invoices[0].material) ? doc.invoices.map(o => o.material && o.material.groupCode).filter(x => Boolean(x)).join(' ,') : 'NA';
		row[this.configName(this.configs, 'materialName', "MATERIAL NAME")] = (doc.invoices.length && doc.invoices[0].material) ? doc.invoices.map(o => o.material && o.material.groupName).filter(x => Boolean(x)).join(' ,') : 'NA';
		row[this.configName(this.configs, 'customer', "CUSTOMER")] = (doc.customer && doc.customer.name) || 'NA';
		row[this.configName(this.configs, 'customerCat', "CUSTOMER CATEGORY")] = (doc.customer && doc.customer.category) || 'NA';
		row[this.configName(this.configs, 'consignor', "CONSIGNOR")] = (doc.consignor && doc.consignor.name) || 'NA';
		row[this.configName(this.configs, 'consignee', "CONSIGNEE")] = (doc.consignee && doc.consignee.name) || 'NA';
		row[this.configName(this.configs, 'billingParty', "BILLINGPARTY")] = (doc.billingParty && doc.billingParty.name) || 'NA';
		row["ROUTE"] = (doc.route && doc.route.name) || 'NA';
		row[this.configName(this.configs, 'route', "BILLING ROUTE")] = ((doc.acknowledge && doc.acknowledge.source) ? ((doc.acknowledge.source) + ' to ' + (doc.acknowledge.destination)) : 'NA');
		row[this.configName(this.configs, 'source', "SOURCE")] = (doc.acknowledge && doc.acknowledge.source) ? (doc.acknowledge.source) : 'NA';
		row[this.configName(this.configs, 'Intermittent', "INTERMITTENT")] = doc.trip && doc.trip.imd && doc.trip.imd.map(o => o.c).join(' ,') || 'NA';
		row[this.configName(this.configs, 'destination', "DESTINATION")] = (doc.acknowledge && doc.acknowledge.destination) ? (doc.acknowledge.destination) : 'NA';
		row[this.configName(this.configs, 'routeDistance', "KM")] = doc.invoices && doc.invoices[0] && doc.invoices[0].routeDistance || 'NA';
		row[this.configName(this.configs, 'payment_basis', "PAYMENT BASIS")] = doc.payment_basis || 'NA';
		row[this.configName(this.configs, 'payment_type', "PAYMENT TYPE")] = doc.payment_type || 'NA';
		row[this.configName(this.configs, 'baseValueLabel', "CAPACITY")] = doc.invoices && doc.invoices[0] && doc.invoices[0].baseValueLabel || 'NA';
		row[this.configName(this.configs, false, "FPA NO")] = (doc.fpa && doc.fpa.refNo) || 'NA';
		// row[this.configName(this.configs, 'loading_slip', "HIRESLIP NO")] = (doc.trip && doc.trip.vendorDeal && doc.trip.vendorDeal.loading_slip) || 'NA';
		row[this.configName(this.configs, 'invDate', "INVOICE DATE")] = doc.invoices && doc.invoices[0] && moment(doc.invoices[0].invoiceDate).utcOffset(0, true).toDate() || 'NA';
		row[this.configName(this.configs, 'invoiceNo', "INVOICE NO.")] = doc.invoices && doc.invoices.map(o => o.invoiceNo).join(' ,') || 'NA';
		row[this.configName(this.configs, 'invoiceAmt', "INVOICE AMOUNT")] = doc.invoices && doc.invoices.map(o => o.invoiceAmt).join(' ,') || 'NA';
		// row[this.configName(this.configs, 'incentive', "INCENTIVE")] = doc.charges ? doc.charges.incentive : 'NA';
		row[this.configName(this.configs, 'noOfUnits', "QTY")] = doc.invoices.reduce((acc, invcObj) => acc + (invcObj.noOfUnits || 0), 0);
		row[this.configName(this.configs, 'weightPerUnit', "WEIGHT(T)")] = doc.invoices.reduce((acc, invcObj) => acc + (invcObj.weightPerUnit || 0), 0) + ' T';
		row[this.configName(this.configs, 'billingNoOfUnits', "BILLING UNIT")] = doc.invoices.reduce((acc, invcObj) => acc + (invcObj.billingNoOfUnits || 0), 0);
		row[this.configName(this.configs, 'billingWeightPerUnit', "BILLING WEIGHT")] = doc.invoices.reduce((acc, invcObj) => acc + (invcObj.billingWeightPerUnit || 0), 0);
		row[this.configName(this.configs, 'rate', "RATE")] = doc.invoices && doc.invoices.map(o => (o.rate && parseFloat(o.rate.toFixed(2) || 0))).join(',') || 'NA';
		row[this.configName(this.configs, 'dph', "DPH")] = doc.invoices && doc.invoices[0] && (((doc.invoices[0].rate)*(doc.invoices[0].dphRate))/100) || 0;
		row[this.configName(this.configs, 'basicFreight', "FREIGHT")] = parseFloat(doc.basicFreight && doc.basicFreight.toFixed(2) || 0);
		row[this.configName(this.configs, 'totalFreight', "TOTAL FREIGHT")] = parseFloat(doc.totalFreight && doc.totalFreight.toFixed(2) || 0);
		row[this.configName(this.configs, 'cGST', "CGST")] = doc.cGST && parseFloat(doc.cGST.toFixed(2) || 0);
		row[this.configName(this.configs, 'sGST', "SGST")] = doc.sGST && parseFloat(doc.sGST.toFixed(2) || 0);
		row[this.configName(this.configs, 'iGST', "IGST")] = doc.iGST && parseFloat(doc.iGST.toFixed(2) || 0);
		let igst = doc.iGST && parseFloat(doc.iGST.toFixed(2) || 0);
		let dph = doc.invoices && doc.invoices[0] && parseFloat((((doc.invoices[0].rate || 0) * (doc.invoices[0].dphRate || 0 ))/100) * ((doc.iGST_percent || 0)/100).toFixed(2));
		row[this.configName(this.configs, 'dphIncludeGst', "DPH INCLUDING GST")] = parseFloat((igst + dph).toFixed(2));
		row[this.configName(this.configs, 'totalAmount', "TOTAL AMOUNT")] = parseFloat(doc.totalAmount && doc.totalAmount.toFixed(2) || 0);
		row[this.configName(this.configs, 'totAmtwithDph', "TOTAL AAMOUNT WITH DPH")] = doc.invoices && doc.invoices[0] && parseFloat(((((doc.invoices[0].rate || 0)*(doc.invoices[0].dphRate || 0))/100) + (doc.invoices[0].rate + (doc.iGST && parseFloat(doc.iGST.toFixed(2) || 0))) + ((((doc.invoices[0].rate)*(doc.invoices[0].dphRate))/100) *((doc.iGST_percent || 0)/100))).toFixed(2)) || '0';
		row[this.configName(this.configs, 'totalFreight', "TOT SUPPLY AMOUNT")] = parseFloat(doc.supplementaryBill && doc.supplementaryBill.totalFreight && doc.supplementaryBill.totalFreight.toFixed(2) || 0);
		// row[this.configName(this.configs, 'internal_rate', "INTERNAL RATE")] = doc.internal_rate && doc.internal_rate.toFixed(2) || 0;
		row[this.configName(this.configs, 'branch', "BRANCH")] = doc.branch && doc.branch.name || 'NA';
		row[this.configName(this.configs, 'billNo', "BILL NO")] = doc.bill && doc.bill.billNo || doc.provisionalBill && doc.provisionalBill.ref && doc.provisionalBill.ref.map(o => o.billNo).join(' ,') || 'NA';
		row[this.configName(this.configs, 'billDate', "BILL DATE")] = (doc.bill && doc.bill.billDate && moment(doc.bill.billDate).utcOffset(0, true).toDate()) || (doc.provisionalBill && doc.provisionalBill.ref && doc.provisionalBill.ref.map(o => moment(o.billDate).utcOffset(0, true).toDate()).join(' ,')) || 'NA';
		row[this.configName(this.configs, 'arNo', "AR NO")] = doc.pod && doc.pod.arNo || 'NA';
		row[this.configName(this.configs, 'arDate', "AR DATE")] = doc.pod && doc.pod.date && moment(doc.pod.date).utcOffset(0, true).toDate() || 'NA';
		row[this.configName(this.configs, 'loadRefNumber', "LOAD REF. NO")] = doc.invoices && doc.invoices.map(o => o.loadRefNumber).join(' ,') || 'NA';
		row[this.configName(this.configs, 'dphRate', "DPH RATE")] = doc.invoices && doc.invoices[0] && doc.invoices[0].dphRate || 0;
		row[this.configName(this.configs, 'ref1', "REF1")] = doc.invoices && doc.invoices.map(o => o.ref1).join(' ,') || 'NA';
		row[this.configName(this.configs, 'ref2', "REF2")] = doc.invoices && doc.invoices.map(o => o.ref2).join(' ,') || 'NA';
		row[this.configName(this.configs, 'ref3', "REF3")] = doc.invoices && doc.invoices.map(o => o.ref3).join(' ,') || 'NA';
		row[this.configName(this.configs, 'ref4', "REF4")] = doc.invoices && doc.invoices.map(o => o.ref4).join(' ,') || 'NA';
		row[this.configName(this.configs, 'eWayBills', "EWAY BILLS")] = doc.eWayBills ? doc.eWayBills.map(o => o.number +'('+moment(o.expiry).format("DD-MM-YYYY")+')').join(' ,') : 'NA';
		row[this.configName(this.configs, 'eWayBills', "EWAY BILL DATE")] = doc.eWayBills && doc.eWayBills[0] && doc.eWayBills[0].expiry ? moment(doc.eWayBills[0].expiry).format("DD-MM-YYYY") : 'NA';
		row[this.configName(this.configs, 'remarks', "GR REMARK")] = doc.remarks || 'NA';
		row[this.configName(this.configs, 'arRemark', "POD REMARK")] = doc.pod && doc.pod.arRemark || 'NA';
		// let grAss = doc.statuses.find(st => st.status === 'GR Assigned');
		row[this.configName(this.configs, 'entryBy', "ENTRY BY")] = doc.created_by_full_name || 'NA';
		row[this.configName(this.configs, 'entryAt', "ENTRY AT")] = doc.created_at ? moment(doc.created_at).utcOffset(0, true).toDate() : 'NA';
		row[this.configName(this.configs, 'ownershipType', "OWNERSHIP")] = (doc.trip && doc.trip.ownershipType) || 'NA';
		// row[this.configName(this.configs, 'routeName', "ROUTE NAME")] = (doc.trip && doc.trip.route_name) || 'NA';
		let mrRec = (((doc.moneyReceipt && doc.moneyReceipt.totalMrAmount) || 0) + ((doc.moneyReceipt && doc.moneyReceipt.deduction) || 0));
		row[this.configName(this.configs, 'mrReceived', "MR RECEIVED")] = mrRec || 'NA';
		let mrBalFr = (((doc.totalFreight || 0) + (doc.supplementaryBill && doc.supplementaryBill.totalFreight || 0)) - mrRec);
		row[this.configName(this.configs, 'mrBalanceFreight', "MR BALANCE FREIGHT")] = mrBalFr || 'NA';
		row[this.configName(this.configs, 'mrChitStatus', "MR CHIT STATUS")] = (doc.moneyReceipt && doc.moneyReceipt.chitPending) || 'NA';
		let uploadedBy = doc.statuses.find(st => st.status === 'Unloading Ended');
		row[this.configName(this.configs, 'unLoadedBy', "UNLOADED BY")] = (uploadedBy && uploadedBy.user_full_name) || 'NA';
		row[this.configName(this.configs, 'fpaAmt', "FPA AMT")] = (doc.fpa && doc.fpa.amt) || 'NA';
		// row[configName(configs, 'hireSlipTotPayble', "HIRESLIP TOTAL PAYABLE")] = doc.totpayable || 'NA';
		row[this.configName(this.configs, 'nonBillableGr', "NONBILLABLE GR")] = (doc.isNonBillable) ? "Yes" : "No";
		row[this.configName(this.configs, 'owner_name', "VEHICLE OWNER NAME")] = doc.vehicle && doc.vehicle.owner_name || 'NA';
		row[this.configName(this.configs, 'owner_group', "FLEET")] = doc.vehicle && doc.vehicle.owner_group || 'NA';
		row[this.configName(this.configs, 'segment_type', "SEGMENT")] = (doc.trip && doc.trip.segment_type) || 'NA';
		row[this.configName(this.configs, 'billed', "BILLED")] = (doc.bill || (doc.supplementaryBillRef && doc.supplementaryBillRef[0]) || (doc.provisionalBill && doc.provisionalBill.ref[0])) ? 'Yes' : 'No';
		let cId = (doc.billingParty && doc.billingParty.clientId) || doc.clientId;
		let clientAllowed = this.req.user.client_allowed.find(ca => ca.clientId === cId);
		row[this.configName(this.configs, 'client', 'COMPANY')] = clientAllowed && clientAllowed.name || this.req.clientData.client_display_name;
		row[this.configName(this.configs, 'unloadingArrivalTime', 'REPORTING DATE')] = (doc.pod && doc.pod.unloadingArrivalTime) ? moment(doc.pod.unloadingArrivalTime).utcOffset(0, true).toDate() : 'NA';
		row['REPORTING TIME'] = (doc.pod && doc.pod.unloadingArrivalTime) ? moment(doc.pod.unloadingArrivalTime).format("HH:mm") : 'NA';
		row[this.configName(this.configs, 'billingUnloadingTime', 'UNLOADING DATE')] = (doc.pod && doc.pod.billingUnloadingTime) ? moment(doc.pod.billingUnloadingTime).utcOffset(0, true).toDate() : 'NA';
		row['UNLOADING TIME'] = (doc.pod && doc.pod.billingUnloadingTime) ? moment(doc.pod.billingUnloadingTime).format("HH:mm") : 'NA';
		// row[this.configName(this.configs, 'vendorRemark', 'HIRE PARTY REMARK')] = doc.trip && doc.trip.vendorDeal && doc.trip.vendorDeal.remark || 'NA';
		this.worksheet.addRow(row).commit();
	}


}
