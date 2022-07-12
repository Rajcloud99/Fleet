let moment = require("moment");
let tripUnSettleCache = {};

tripUnSettleCache.headers = ["S.No", "Vehicle No.", "GR No", "Bill No", "Bill Date", "Source", "Destination", "Trip Start", "HIRE SLIP No.", "Segment", "Trip No.", "Customer", "Customer Category", "Route", "Kilometer", "Deal Total",
	"Revenue", "Profit", "Internal Profit", "Vendor Deal", "Cash Adv", "Total Advance/Paid", "Vendor Charges", "Vendor Deduction", "TDS Amount", "TDS PERCENTAGE", "TDS Amt(Extra)", "Adv/KM", "Driver", "Vendor Name",
	"PAN CARD NO", "Trip Status", "Category", "Trip End", "Loading Ended", "Unloading Date", "Rate", "Basic Freight", "Ownership", "Branch", "COMPANY", "Id", "Remark", "Hire Party Remark", "VENDOR ADVANCE PAID", "PAY BY CHEQUE",
	"PAY BY BROKER", "PAY BY DIESEL", "PAY BY CASH", "REMAINING AMOUNT", "Deal Date"
];
let advanceKeys = {};
let count = 1;

tripUnSettleCache.transform = function (obj) {

	try {
		let row = {};

		row["Vehicle No."] = obj.vehicle && obj.vehicle.vehicle_no || 'NA';
		row["GR No"] = (obj.gr && obj.gr.map(o => o.grNumber).join(' , ') ) || 'NA';
		// row["Gr No."] = obj.grNumber ? (obj.grNumber).toString().trim() : 'NA';
		row["Bill No"] = obj.bill_no || 'NA';
		// row["Bill Date"] = obj.bills ? moment(new Date(obj.bills.billDate)).format("DD-MM-YYYY")  : 'NA';
		// row["Source"] = (obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.source).join(' , ') ) || 'NA'; // obj.gr.acknowledge && obj.gr.acknowledge.source) || 'NA';
		// row["Destination"] = (obj.gr && obj.gr.map(o => o.acknowledge && o.acknowledge.destination).join(' , ') ) || 'NA';
		row['Segment'] = obj.vehicle && obj.vehicle.segment || 'NA';
		// row["HIRE SLIP No."] = obj.vendorDeal && obj.vendorDeal.loading_slip || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["Category"] = obj.category || 'NA';
		row["Customer"] = (obj.gr && obj.gr.map(o => o.customer && o.customer.name).join(' , ') ) || 'NA';
		row["Customer Category"] = (obj.gr && obj.gr.map(o => o.customer && o.customer.category).join(' , ') ) || 'NA';
		row["Route"] = obj.route && obj.route.name || 'NA';
		row["Kilometer"] = obj.route && obj.route.km || 'NA';
		// row['Deal Total'] = obj.vendorDeal && obj.vendorDeal.totalDeal && parseFloat(obj.vendorDeal.totalDeal.toFixed(2) || 0);
		for (let j = 0; j < obj.gr.length; j++) {
			row["Revenue"] = (row["Revenue"] || 0) + (obj.gr[j].totalFreight || 0);
		}
		row["Revenue"] = parseFloat(row["Revenue"]);
		// row['Vendor Deal'] = (obj.vendorDeal && obj.vendorDeal.totWithMunshiyana && parseFloat(obj.vendorDeal.totWithMunshiyana.toFixed(2) || 0));
		// row['Vendor Charges'] = obj.vendorDeal && obj.vendorDeal.totalCharges && parseFloat(obj.vendorDeal.totalCharges.toFixed(2) || 0);
		// row['Vendor Deduction'] = obj.vendorDeal && obj.vendorDeal.totalDeduction && parseFloat(obj.vendorDeal.totalDeduction.toFixed(2) || 0);
		// row['Cash Adv'] = obj.totalCash && parseFloat(obj.totalCash.toFixed(2) || 0);
		// row['Total Advance/Paid'] = obj.tAdv && parseFloat(obj.tAdv.toFixed(2) || 0);
		// row['Adv/KM'] = parseFloat(obj.advPKM || 0);
		// row["Internal Profit"] = (row["Deal Total"] || 0) - (obj.vendorDeal && obj.vendorDeal.internalFreight || 0);
		// row["Profit"] = (row["Revenue"] || 0) - (row['Deal Total'] || 0);
		// row["TDS Amount"] = obj.vendorDeal && obj.vendorDeal.tdsAmount || 'NA';
		row["Allocation Date"] = moment(new Date(obj.allocation_date)).format("DD-MM-YYYY") || 'NA';
		row["Trip Status"] = obj.status || 'NA';
		row["Driver"] = (obj.driver && obj.driver.name) || "NA";
		// row["PAN CARD NO"] = obj.vendor ? obj.vendor.pan : "NA";
		// row["TDS PERCENTAGE"] = obj.vendor ? obj.vendor.tdsRate : "NA";
		// row["Vendor Name"] = obj.vendor ? obj.vendor.name : "NA";
		row["Trip Start"] = formatDate(obj.start_date);
		row["Trip End"] = formatDate(obj.end_date);
		// row["Loading Ended"] = (obj.gr && obj.gr.map(o =>
		// 	o.loading_ended_status ? moment(new Date(o.loading_ended_status.date)).format("DD-MM-YYYY") : 'NA'
		// ).join(' , ') ) || 'NA';
		// row["Unloading Date"] = (obj.gr && obj.gr.map(o =>
		// 	o.pod && o.pod.billingUnloadingTime ? moment(new Date(o.pod.billingUnloadingTime)).format("DD-MM-YYYY") : 'NA'
		// ).join(' , ') ) || 'NA';
		row["Basic Freight"] = (obj.gr && obj.gr.map(o => o.basicFreight).join(' , ')) || '0';
		// row["Rate"] = (obj.avgRate && obj.avgRate.join(' , ') ) || '0';
		row["Ownership"] = obj.ownershipType || 'NA';
		row["Branch"] = obj.branch && obj.branch.name || 'NA';
		// row["Deal Date"] = (obj.vendorDeal && obj.vendorDeal.deal_at) ? formatDate(obj.vendorDeal.deal_at) : "NA";
		row["Remark"] = obj.remark || 'NA';
		// row["Hire Party Remark"] = obj.vendorDeal && obj.vendorDeal.remark || 'NA';
		// let cId = (obj.vendor && obj.vendor.clientId) || obj.clientId;
		// let clientAllowed = user.client_allowed.find(ca => ca.clientId === cId);
		// row["COMPANY"] = clientAllowed && clientAllowed.name || 'NA';


		// row["REMAINING AMOUNT"] = obj.remainingAmt;




		obj.advanceBudget.forEach(oAdv => {
			advanceKeys[oAdv.advanceType] = 1;
			switch (oAdv.advanceType) {
				case 'Diesel':
					advanceKeys["Driver Lit."] = 1;
					row["Diesel"] = (row["Diesel"] || 0) + oAdv.amount;
					// row["Driver Lit."] = (row["Driver Lit."] || 0) + oAdv.dieseInfo.litre;
					break;
				default:
					row[oAdv.advanceType] = (row[oAdv.advanceType] || 0) + oAdv.amount;
					break;
			}
		});

		return row;
	} catch (e) {
		throw new Error(e);
	}
};

function round(num){
	return Math.round(num * 100)/100 || 0;
}

function formatDate(date){
	return date && moment(date).format('DD-MM-YYYY') || '';
}
module.exports = tripUnSettleCache;
