let moment = require("moment");
let Trip = commonUtil.getModel('trip');
// const TripAdvances = commonUtil.getModel('TripAdvances');
let tripHireReport = {};

tripHireReport.headers = ["S.No", "Vehicle No.", "Trip Start", "Trip End", "GR No", "GR DATE","Route","Billing Weight", "Rate", "Basic Freight",
	"BILLINGPARTY", "Happay", "Fastag", "Diesel", "Driver Cash", "Shortage", "Challan", "Total Expense", "Profit"
];

let advanceKeys = {};
let suspenseAdvKeys = {};
let count = 1;

// async function suspense(obj){
// 	await TripAdvances.find(obj).then(function (data){
//
// 		console.log('ritika',data);
// 		if(data.length > 0){
// 			return data;
// 		}else{
// 			return [];
// 		}
//
// 	}).catch(
// 		function (err) {
// 			return err;
// 		}
// 	);
// }

// tripHireReport.transform = async function (obj) {
// 	obj =    Trip.eachTripSummary([obj]);
//
// 	// try {


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
		let Challan = 0;
		let Shortage = 0;

		//suspense
		let diesel_sus = 0;
		let dieselLtr_sus = 0;
		let happay_sus = 0;
		let fastag_sus = 0;
		let driverCash_sus = 0;
		let Challan_sus = 0;
		let Shortage_sus = 0;
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
				case 'Shortage':
					Shortage += oAdv.Shortage;
				case 'Challan':
					Challan += oAdv.Challan;
			}
		});
		// let susObj = {
		// 	"trip_no": {$exists: false},
		// 	"vehicle_no" : obj.vehicle_no,
		// 	// "date" : {
		// 	// 	"$gte": obj.start_date,
		// 	// 	"$lte": obj.end_date
		// 	// }
		// }
   		// obj.suspense = await suspense(susObj);


		obj.suspenseAdv.forEach(oAdv => {
			suspenseAdvKeys[oAdv.advanceType] = 1;
				switch (oAdv.advanceType) {
					case 'Happay':
						happay_sus += oAdv.amount;
						break;
					case 'Diesel':
						diesel_sus +=  oAdv.amount || 0;
						dieselLtr_sus +=  oAdv.dieseInfo && oAdv.dieseInfo.litre || 0;
						break;
					case 'Fastag':
						fastag_sus += oAdv.amount;
						break;
					case 'Driver Cash':
						driverCash_sus += oAdv.amount;
						break;
					case 'Shortage':
						Shortage_sus += oAdv.Shortage;
					case 'Challan':
						Challan_sus += oAdv.Challan;
				}
		});

		row["Vehicle No."] = obj.vehicle_no || 'NA';
		row["Trip Start"] = obj.trip_start_status ? formatDate(obj.trip_start_status.date) : 'NA';
		row["Trip End"] = obj.trip_end_status ? formatDate(obj.trip_end_status.date): 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["GR No"] = (obj.gr && obj.gr.map(o => o.grNumber).join(' , ') ) || 'NA';
		row["GR DATE"] = (obj.gr && obj.gr.map(o => formatDate(o.grDate)).join(' , ') ) || 'NA';   //
		// row["Route"] = obj.route_name || obj.rName ||  'NA';
		let [src, dest] = obj.rName ? obj.rName.split(' to').map(o => o.trim()) : ( obj.route_name ? obj.route_name.split(' to').map(o => o.trim()) : 'NA' );
		row["Source"] = src || (obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.source).join(' , ') ) || 'NA'; // obj.gr.acknowledge && obj.gr.acknowledge.source) || 'NA';
		row["Destination"] = dest || (obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.destination).join(' , ') ) || 'NA';
		row["Billing Weight"] =  obj.gr && obj.gr.map(o => o.invoices && o.invoices.map(obj => obj.billingWeightPerUnit).join(' , ') || '').join(' , ')  || 'NA';
		row["Rate"] = obj.gr && obj.gr.map(o => o.invoices && o.invoices.map(obj => obj.rate).join(' , ') || '').join(' , ')  || 'NA';
		row["Basic Freight"] = (obj.gr && obj.gr.map(o => round(o.basicFreight || 0)).join(' , ')) || '0';
		row["BILLINGPARTY"] = (obj.billingParty && obj.billingParty.name) || 'NA';
		row["Happay"] = happay;
		row["Fastag"] = fastag;
		row["Diesel"] = diesel;
		row["Driver Cash"] = driverCash;
		row["Shortage"] = Shortage;
		row["Challan"] = Challan;
		//for suspense
		row["Happay Suspense"] = happay_sus;
		row["Fastag Suspense"] = fastag_sus;
		row["Diesel Suspense"] = diesel_sus;
		row["Driver Cash Suspense"] = driverCash_sus;
		row["Shortage Suspense"] = Shortage_sus;
		row["Challan Suspense"] = Challan_sus;
		let totalExp = 0;
		obj.trip_expenses.forEach(exp => {
			totalExp += exp.amount;
		});
		let revenue = 0, basicFreightSum = 0;
		for (let j = 0; j < obj.gr.length; j++) {
			revenue = (revenue || 0) + (obj.gr[j].totalFreight || 0);
		}
		for (let j = 0; j < obj.gr.length; j++) {
			basicFreightSum = (basicFreightSum || 0) + (obj.gr[j].basicFreight || 0);
		}
		row["Revenue"] = basicFreightSum;
		row["Total Expense"] = totalExp || 0;
		row["Profit"] = revenue - (row["Total Expense"]);
		row["Suspense Amt"] = obj.sum_suspenseAdv;
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
