let moment = require("moment");
let Trip = commonUtil.getModel('trip');
let tripHireReport = {};

tripHireReport.headers = ["S.No", "Vehicle No.", "GR No", "GR DATE", "Route", "Billing Weight", "Rate", "Basic Freight",
	"BILLINGPARTY", "HIRESLIP NO", "HIRESLIP AMT", "Net Profit"
];

let advanceKeys = {};
let count = 1;

tripHireReport.transform =  function (obj) {
	obj =   Trip.eachTripSummary([obj]);

	try {
		obj = obj[0];
		let row = {};
		let exTds = 0;
		let diesel = 0;
		let dieselLtr = 0;
		let happay = 0;
		let fastag = 0;
		let driverCash = 0;
		if (obj.vendorDeal && obj.vendorDeal.charges) {
			allCharges = {
				...obj.vendorDeal.charges,
			};

			if (!allCharges)
				return 0;
			for (let k in allCharges) {
				if (allCharges.hasOwnProperty(k))
					exTds += (allCharges[k]['tdsAmount'] || 0);
				// row["TDS Amt(Extra)"] = (row["TDS Amt(Extra)"] || 0) + (allCharges[k]['tdsAmount'] || 0);
			}
		}

		obj.advanceBudget.forEach(oAdv => {
			advanceKeys[oAdv.advanceType] = 1;
			switch (oAdv.advanceType) {
				case 'Happay':
					happay += oAdv.amount;
					break;
				case 'Diesel':
					diesel +=  oAdv.amount || 0;
					dieselLtr +=  oAdv.dieseInfo && oAdv.dieseInfo.litre || 0;
					break;
				case 'Fastag':
					fastag += oAdv.amount;
					break;
				case 'Driver Cash':

					driverCash += oAdv.amount;
					break;
			}
		});

		// row["S.No"] = (count++);
		row["Vehicle No."] = obj.vehicle_no || 'NA';
		row["GR No"] = (obj.gr && obj.gr.map(o => o.grNumber).join(' , ') ) || 'NA';
		row["GR DATE"] = (obj.gr && obj.gr.map(o => formatDate(o.grDate)).join(' , ') ) || 'NA';   //
		// row["Route"] = obj.route_name || obj.rName ||  'NA';
		let [src, dest] = obj.rName ? obj.rName.split(' to').map(o => o.trim()) : ( obj.route_name ? obj.route_name.split(' to').map(o => o.trim()) : 'NA' );
		row["Source"] = src || (obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.source).join(' , ') ) || 'NA'; // obj.gr.acknowledge && obj.gr.acknowledge.source) || 'NA';
		row["Destination"] = dest || (obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.destination).join(' , ') ) || 'NA';
		row["Billing Weight"] = obj.gr && obj.gr.map(o => o.invoices && o.invoices.map(obj => obj.billingWeightPerUnit).join(' , ') || '').join(' , ')  || 'NA';
		row["Rate"] = obj.gr && obj.gr.map(o => o.invoices && o.invoices.map(obj => obj.rate).join(' , ') || '').join(' , ')  || 'NA';

		let totalDeal = 0;
		totalDeal = obj.vendorDeal && obj.vendorDeal.totalDeal && parseFloat(obj.vendorDeal.totalDeal.toFixed(2) || 0);
		row["Basic Freight"] = (obj.gr && obj.gr.map(o => parseFloat(o.basicFreight).toFixed(2)).join(' , ')) || '0';
		// (obj.gr && obj.gr.map(o => o.basicFreight).join(' , ')) || '0';
		row["BILLINGPARTY"] = (obj.billingParty && obj.billingParty.name) || 'NA';
		row["Branch"] = obj.branch && obj.branch.name || 'NA';
		row["HIRESLIP NO"] = obj.vendorDeal && obj.vendorDeal.loading_slip || 'NA';
		row['HIRESLIP AMT'] = (obj.vendorDeal && obj.vendorDeal.totWithMunshiyana && parseFloat(obj.vendorDeal.totWithMunshiyana.toFixed(2) || 0));
		let basicFreightSum = 0;
		for (let j = 0; j < obj.gr.length; j++) {
			basicFreightSum = (basicFreightSum || 0) + (obj.gr[j].basicFreight || 0);
		}
		// let revenue = 0;
		// for (let j = 0; j < obj.gr.length; j++) {
		// 	revenue = (revenue || 0) + (obj.gr[j].totalFreight || 0);
		// }
		row["Revenue"] = basicFreightSum;
		row["Net Profit"] = ( basicFreightSum - row['HIRESLIP AMT']) || 0;

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
module.exports = tripHireReport;
