let moment = require("moment");
let tripAdvance = {};

tripAdvance.headers = ["ADVANCE DATE", "Advance Type", "Trip No.", "VEHICLE NO", "BRANCH ACCOUNT", 'HAPPAY ACCOUNT', 'REFERENCE NO', 'BILL NO', "Person", "AMOUNT", "Debit AC", "Credit AC", 'DIESEL LITRE', 'DIESEL RATE', "Driver Name", "Driver No.", "DIESEL VENDOR", "REMARK", "Id", "Segment", "Ownership", "RT No.", "No of Day", "Entry BY", "Entry Date", "Modification By", "Modification Date"];

tripAdvance.transform = function (obj) {
	try {
		let row = {};
		row["VEHICLE_NO"] = obj.vehicle_no || "NA";
		row["ADVANCE DATE"] = formatDate(obj.date);
		row['TRIP NO'] = obj.trip_no || 'NA';
		row['ROUTE'] = obj.route_name || 'NA';
		row['REFERENCE NO'] = obj.reference_no || 'NA';
		row['LOADING DATE'] = formatDate(obj.grDate);
		row['DIESEL QTY'] = obj.qty || 'NA';
		row['DIESEL RATE'] = obj.rate || 'NA';
		row['DIESEL AMOUNT'] = obj.amount || 'NA';
		row['PUMP NAME'] = obj.fuelStation || 'NA';

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

module.exports = tripAdvance;
