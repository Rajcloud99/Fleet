let moment = require("moment");
let trip = {};

trip.headers = ["S.No", "Vehicle No.", "GR No", "Bill No", "Bill Date", "Source", "Destination", "Trip Start", "HIRE SLIP No.", "Segment", "Trip No.", "Customer", "Customer Category", "Route", "Kilometer", "Deal Total",
	"Revenue", "Profit", "Internal Profit", "Vendor Deal", "Cash Adv", "Total Advance/Paid", "Vendor Charges", "Vendor Deduction", "TDS Amount", "TDS PERCENTAGE", "TDS Amt(Extra)", "Adv/KM", "Driver", "Vendor Name",
	"PAN CARD NO", "Trip Status", "Category", "Trip End", "Loading Ended", "Unloading Date", "Rate", "Basic Freight", "Ownership", "Branch", "COMPANY", "Id", "Remark", "Hire Party Remark", "VENDOR ADVANCE PAID", "PAY BY CHEQUE",
	"PAY BY BROKER", "PAY BY DIESEL", "PAY BY CASH", "REMAINING AMOUNT", "Deal Date"
];

trip.transform = function (obj) {

	try {

		obj.gr = obj.gr && obj.gr[0];
		let row = {};
		row["TRIP START"] = formatDate(obj.start_date);
		row["TRIP END"] = formatDate(obj.end_date);
		row["TRIP NO."] = obj.trip_no || 'NA';
		row["TRIP STATUS"] = obj.status || 'NA';
		row["LAST UPDATE TIME"] = obj.last_modified_at ? formatDate(obj.last_modified_at): 'NA';
		row["HIRE SLIP"] = obj.vendorDeal && obj.vendorDeal.loading_slip || 'NA';
		row["CATEGORY"] = obj.category || 'NA';
		row["GR NO."] = obj && obj.gr.grNumber && (obj.gr.grNumber).toString().trim() || 'NA';
		row["RT NO"] = obj.advSettled && obj.advSettled.tsNo || 'NA';
		row["CUSTOMER"] = obj.gr && obj.gr.customer && obj.gr.customer.name || 'NA';
		row["VEHICLE NO."] = obj.vehicle && obj.vehicle.vehicle_no || 'NA';
		// row["VEHICLE TYPE"] = (obj.vehicle && obj.vehicle.veh_type_name) || 'NA';
		row["ROUTE NAME"] = obj.route && obj.route.name || 'NA';
		row["ROUTE DISTANCE"] = obj.route && obj.route.km || 'NA';
		row["DRIVER NAME"] = (obj.driver && obj.driver.name) || "NA";
		row["BRANCH"] = obj.branch && obj.branch.name || 'NA';
		row["TRIP ENTRY"] = obj.allocation_date ? formatDate(obj.allocation_date): 'NA';
		row["VENDOR"] = obj.vendor && obj.vendor.name || "NA";
		row["OWNERSHIP"] = obj.ownershipType || 'NA';
		row["DEAL DATE"] = (obj.vendorDeal && obj.vendorDeal.deal_at) ? formatDate(obj.vendorDeal.deal_at) : "NA";
		row["Fleet"] = obj.vehicle && obj.vehicle.fleet || 'NA';
		row['Segment'] = obj.vehicle && obj.vehicle.segment || 'NA';
		// row["Consignor"] = obj.gr && obj.gr.consignor && obj.gr.consignor.name || 'NA';
		// row["Driver No."] = (obj.driver && obj.driver.prim_contact_no) || "NA";
		// row["Trip Start Person"] = obj.trip_start_status ? obj.trip_start_status.user_full_name : "NA";
		// row["Trip End Person"] = obj.trip_end_status ? obj.trip_end_status.user_full_name : "NA";
		// row["Loading Ended"] = obj.gr && obj.gr.loading_ended_status ? moment(new Date(obj.gr.loading_ended_status.date)).format("DD-MM-YYYY") : 'NA';
		// row["Unloading Ended"] = obj.gr && obj.gr.unloading_ended_status ? moment(new Date(obj.gr.unloading_ended_status.date)).format("DD-MM-YYYY") : 'NA';
		row["Remark"] = obj.remark || 'NA';
		row["Hire Party Remark"] = obj.vendorDeal && obj.vendorDeal.remark || 'NA';
		// row["Id"] = obj._id.toString();
		row["Deal Entry Date"] = (obj.vendorDeal && obj.vendorDeal.entryDate) ? formatDate(obj.vendorDeal.entryDate): "NA";

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
module.exports = trip;
