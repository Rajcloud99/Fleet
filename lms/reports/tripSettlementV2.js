let moment = require("moment");
let Trip = commonUtil.getModel('trip');
let tripHireReport = {};

tripHireReport.headers = ["S.No", "Vehicle No.", "GR No", "Bill No", "Bill Date", "Source", "Destination", "Trip Start", "HIRE SLIP No.", "Segment", "Trip No.", "Customer", "Customer Category","Billing Party", "Route", "Kilometer", "Deal Total",
	"Revenue", "Profit", "Internal Profit", "Vendor Deal", "Cash Adv", "Total Advance/Paid", "Vendor Charges", "Vendor Deduction", "TDS Amount", "TDS PERCENTAGE", "TDS Amt(Extra)", "Adv/KM", "Driver", "Vendor Name",
	"PAN CARD NO", "Trip Status", "Category", "Trip End", "Loading Ended", "Unloading Date", "Rate", "Basic Freight", "Ownership", "Branch", "COMPANY", "Id", "Remark", "Hire Party Remark", "VENDOR ADVANCE PAID", "PAY BY CHEQUE",
	"PAY BY BROKER", "PAY BY DIESEL", "PAY BY CASH", "REMAINING AMOUNT", "Deal Date"
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
		// row["Gr No."] = obj.grNumber ? (obj.grNumber).toString().trim() : 'NA';
		row["Bill No"] = (obj.bills && obj.bills.billNo) || 'NA';
		row["Bill Date"] = obj.bills ? formatDate(obj.bills.billDate)  : 'NA';
		// let [src, dest] = obj.rName ? obj.rName.split(' to').map(o => o.trim()) : ( obj.route_name ? obj.route_name.split(' to').map(o => o.trim()) : 'NA' );
		let [src, dest] = obj.route_name ? (obj.route_name.split(' to ').map(o => o.trim())):(obj.rName ? obj.rName.split(' to ').map(o => o.trim()):'NA') ;
		row["Source"] = src || (obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.source).join(' , ') ) || 'NA'; // obj.gr.acknowledge && obj.gr.acknowledge.source) || 'NA';
		row["Destination"] = dest || (obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.destination).join(' , ') ) || 'NA';
		row["HIRE SLIP No."] = obj.vendorDeal && obj.vendorDeal.loading_slip || 'NA';
		row["Segment"] = obj.segment_type || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["RT No."] = obj.advSettled && obj.advSettled.tsNo  || 'NA';
		row["Customer"] = (obj.gr && obj.gr.map(o => o.customer && o.customer.name).join(' , ') ) || 'NA';
		row["Customer Category"] = (obj.gr && obj.gr.map(o => o.customer && o.customer.category).join(' , ') ) || 'NA';
		row["Billing Party"] = obj.billingParty && obj.billingParty.name || 'NA';
		row["Route"] = obj.route_name || obj.rName ||  'NA';
		row["Kilometer"] = obj.totalKm || obj.rKm || 'NA';
		row['Deal Total'] = obj.vendorDeal && obj.vendorDeal.totalDeal && parseFloat(obj.vendorDeal.totalDeal.toFixed(2) || 0);
		for (let j = 0; j < obj.gr.length; j++) {
			row["Revenue"] = (row["Revenue"] || 0) + (obj.gr[j].totalFreight || 0);
		}
		row["Revenue"] = parseFloat(row["Revenue"].toFixed(2));
		if (obj.netBudget === 'NA') {
			obj.netBudget = 0;
		}
		row["Profit"] = (row["Revenue"] || 0) - (row['Deal Total'] || 0);
		row["Internal Profit"] = (row["Deal Total"] || 0) - (obj.vendorDeal && obj.vendorDeal.internalFreight || 0);
		row['Vendor Deal'] = (obj.vendorDeal && obj.vendorDeal.totWithMunshiyana && parseFloat(obj.vendorDeal.totWithMunshiyana.toFixed(2) || 0));
		row['Cash Adv'] = obj.totalCash && parseFloat(obj.totalCash.toFixed(2) || 0);
		row['Total Advance/Paid'] = obj.tAdv && parseFloat(obj.tAdv.toFixed(2) || 0);
		row['Vendor Charges'] = obj.vendorDeal && obj.vendorDeal.totalCharges && parseFloat(obj.vendorDeal.totalCharges.toFixed(2) || 0);
		row['Vendor Deduction'] = obj.vendorDeal && obj.vendorDeal.totalDeduction && parseFloat(obj.vendorDeal.totalDeduction.toFixed(2) || 0);
		row["TDS Amount"] = obj.vendorDeal && obj.vendorDeal.tdsAmount || 0;
		row["TDS PERCENTAGE"] = obj.vendorDeal && obj.vendorDeal.tdsPercent || 0;
		row["TDS Amt(Extra)"] = exTds || 0;
		row['Adv/KM'] = parseFloat(obj.advPKM || 0);
		row["Driver"] = (obj.driver && obj.driver.name) || "NA";
		row["Vendor Name"] = obj.vendor ? obj.vendor.name : "NA";
		row["PAN CARD NO"] = obj.vendor ? obj.vendor.pan_no : "NA";
		row["Trip Status"] = obj.status || 'NA';
		row["Category"] = obj.category || 'NA';
		row["Allocation Date"] = formatDate(obj.allocation_date);
		row["Trip Start"] = obj.trip_start_status ? formatDate(obj.trip_start_status.date) : 'NA';
		row["Trip End"] = obj.trip_end_status ? formatDate(obj.trip_end_status.date): 'NA';
		row["Loading Ended"] = (obj.gr && obj.gr.map(o =>
			o.loading_ended_status ? moment(new Date(o.loading_ended_status.date)).format("DD-MM-YYYY") : 'NA'
		).join(' , ') ) || 'NA';
		row["Unloading Date"] = (obj.gr && obj.gr.map(o =>
			o.pod && o.pod.billingUnloadingTime ? moment(new Date(o.pod.billingUnloadingTime)).format("DD-MM-YYYY") : 'NA'
		).join(' , ') ) || 'NA';
		row["Rate"] = (obj.avgRate && obj.avgRate.join(' , ') ) || '0';
		row["Basic Freight"] = (obj.gr && obj.gr.map(o => o.basicFreight).join(' , ')) || '0';
		row["Ownership"] = obj.ownershipType || 'NA';
		row["Branch"] = obj.branch && obj.branch.name || 'NA';
		row["Id"] = obj._id.toString();
		row["Remark"] = obj.remark || 'NA';
		row["Hire Party Remark"] = obj.vendorDeal && obj.vendorDeal.remark || 'NA';
		row["VENDOR ADVANCE PAID"] = obj.vendorAdvancePaid;
		row["PAY BY CHEQUE"] = obj.payByCheque;
		row["PAY BY BROKER"] = obj.payByBroker;
		row["PAY BY DIESEL"] = obj.payByDiesel;
		row["PAY BY CASH"] = obj.payByCash;
		row["REMAINING AMOUNT"] = obj.remainingAmt;
		row["Deal Date"] = (obj.vendorDeal && obj.vendorDeal.deal_at) ? moment(obj.vendorDeal.deal_at).format("DD-MM-YYYY") : "NA";

		// if(obj.vendorDeal && obj.vendorDeal.weight_type === 'PMT'){
		row['PMT RATE'] = obj.vendorDeal && obj.vendorDeal.pmtRate;
		row['PMT WEIGHT'] = obj.vendorDeal && obj.vendorDeal.pmtWeight;
		row['OTHER EXP'] = obj.vendorDeal && obj.vendorDeal.otherExp;
		// }

		row['Happay'] = happay;
		row['Diesel'] = diesel;
		row['Diesel Ltr'] = dieselLtr;
		row['Fastag'] = fastag;
		row['Driver Cash'] = driverCash;


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
