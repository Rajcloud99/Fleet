let moment = require("moment");
let tripSettle = {};

tripSettle.headers = ["S.No", "Vehicle No.", "GR No", "Bill No", "Bill Date", "Source", "Destination", "Trip Start", "HIRE SLIP No.", "Segment", "Trip No.", "Customer", "Customer Category", "Route", "Kilometer", "Deal Total",
	"Revenue", "Profit", "Internal Profit", "Vendor Deal", "Cash Adv", "Total Advance/Paid", "Vendor Charges", "Vendor Deduction", "TDS Amount", "TDS PERCENTAGE", "TDS Amt(Extra)", "Adv/KM", "Driver", "Vendor Name",
	"PAN CARD NO", "Trip Status", "Category", "Trip End", "Loading Ended", "Unloading Date", "Rate", "Basic Freight", "Ownership", "Branch", "COMPANY", "Id", "Remark", "Hire Party Remark", "VENDOR ADVANCE PAID", "PAY BY CHEQUE",
	"PAY BY BROKER", "PAY BY DIESEL", "PAY BY CASH", "REMAINING AMOUNT", "Deal Date"
];
let advanceKeys = {};
let count = 1;

tripSettle.transform = function (obj) {
	// obj =   Trip.eachTripSummary([obj]);

	try {
		// obj = obj[0];
		let row = {};

		let lastTrip = obj.trip.slice(-1)[0];
		lastTrip.markSettle = lastTrip.markSettle || {};
		lastTrip.advSettled = lastTrip.advSettled || {};

		// row["S.No"] = (count++);
		row["Vehicle No."] = obj.vehicle && obj.vehicle.vehicleNo || 0;
		row["GR No"] = (lastTrip.gr && lastTrip.gr.map(o => o.grNumber).join(' , ') ) || 'NA';
		// row["Bill Date"] = lastTrip.billDate ? formatDate(lastTrip.billDate)  : 'NA';
		row["Trip Start"] = formatDate(obj.startDate);
		row["Trip End"] = formatDate(obj.endDate);
		row["Bill No"] = (lastTrip.bill_no) || 'NA';
		// row["Source"] = (lastTrip.gr && lastTrip.gr.map(o => o.acknowledge && o.acknowledge.source).join(' , ') ) || 'NA'; // obj.gr.acknowledge && obj.gr.acknowledge.source) || 'NA';
		// row["Destination"] = (lastTrip.gr && lastTrip.gr.map(o => o.acknowledge && o.acknowledge.destination).join(' , ') ) || 'NA';
		row["Segment"] = obj.vehicle && obj.vehicle.segment || 'NA';
		row["Trip No."] = lastTrip.trip_no || 'NA';
		row["Category"] = lastTrip.category || 'NA';
		row["Customer"] = (lastTrip.gr && lastTrip.gr.map(o => o.customer && o.customer.name).join(' , ') ) || 'NA';
		row["Customer Category"] = (lastTrip.gr && lastTrip.gr.map(o => o.customer && o.customer.category).join(' , ') ) || 'NA';
		row["Route"] = lastTrip.route_name || 'NA';
		row["Kilometer"] = obj.totalKm || 0;
		row['Total Advance/Paid'] = round(obj.netAdvance || 0);
		row['Adv/KM'] = parseFloat(((obj.netAdvance || 0)/(obj.totalKm || 0)) || 0);
		row["Revenue"] = round(obj.revenue || 0);
		row["Profit"] = round(obj.profit || 0);
		row["Trip Status"] = lastTrip.status || 'NA';
		row['Driver'] = obj.driver && obj.driver.name || 'NA';
		row["Basic Freight"] = (lastTrip.gr && lastTrip.gr.map(o => o.basicFreight).join(' , ')) || '0';
		row["Ownership"] = lastTrip.ownershipType || 'NA';
		row["Diesel"] =  round(obj.dieselGivAmt || 0);
		row["Driver Lit."]  =  round(obj.dieselGivLit || 0);
		row["Happay"]  =  obj.netAdvVchObj && round(obj.netAdvVchObj.happy || 0);
		row["Fastag"]  =  obj.netAdvVchObj && round(obj.netAdvVchObj.fastag || 0);
		row["Driver Cash"]  =  obj.netAdvVchObj && round(obj.netAdvVchObj.driver || 0);
		row["Remark"] = lastTrip.rmk || 'NA';




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
module.exports = tripSettle;
