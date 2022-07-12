let moment = require("moment");
let tripAdvance = {};

tripAdvance.headers = ["ADVANCE DATE", "Advance Type", "Trip No.", "VEHICLE NO", "BRANCH ACCOUNT", 'HAPPAY ACCOUNT', 'REFERENCE NO', 'BILL NO', "Person", "AMOUNT", "Debit AC", "Credit AC", 'DIESEL LITRE', 'DIESEL RATE', "Driver Name", "Driver No.", "DIESEL VENDOR", "REMARK", "Id", "Segment", "Ownership", "RT No.", "No of Day", "Entry BY", "Entry Date", "Modification By", "Modification Date"];

tripAdvance.transform = function (obj) {
	try {
		let row = {};
		row["ADVANCE DATE"] = formatDate(obj.date);
		row["Advance Type"] = obj.advanceType || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["VEHICLE NO"] = obj.vehicle_no || 'NA';
		if ((obj.advanceType === 'Driver Cash') || (obj.advanceType === 'Vendor Advance') || (obj.advanceType === 'Vendor Balance')) {
			row["BRANCH ACCOUNT"] = (obj.from_account && obj.from_account.name) || 'NA';
		}
		if (obj.advanceType === 'Happay') {
			row['HAPPAY ACCOUNT'] = (obj.from_account && obj.from_account.name) || 'NA';
		}
		row['REFERENCE NO'] = obj.reference_no || 'NA';
		row['BILL NO'] = obj.bill_no || 'NA';
		row['Person'] = obj.person || 'NA';
		row['AMOUNT'] = obj.amount || 'NA';
		row["Debit AC"] = (obj.to_account && obj.to_account.name) || 'NA';
		row["Credit AC"] = (obj.from_account && obj.from_account.name) || 'NA';
		row['DIESEL LITRE'] = (obj.dieseInfo && obj.dieseInfo.litre) || 'NA';
		row['DIESEL RATE'] = (obj.dieseInfo && obj.dieseInfo.rate) || 'NA';
		row["Driver Name"] = (obj.driver && obj.driver.name) || "NA";
		row["Driver No."] = (obj.driver && obj.driver.prim_contact_no) || "NA";
		row["DIESEL VENDOR"] = obj.vendor ? obj.vendor.name : "NA";
		row["REMARK"] = (obj.narration || '').concat("  ",(obj.remark || ''))  || 'NA';
		row["Id"] = obj._id && obj._id.toString();
		row["Segment"] = (obj.vehicle && obj.vehicle.segment_type) || 'NA';
		row["Ownership"] = (obj.vehicle && obj.vehicle.ownershipType) || 'NA';
		row["RT No."] = (obj.trip && obj.trip.advSettled && obj.trip.advSettled.tsNo) || 'NA';
		row["Entry BY"] = (obj.userName && obj.userName.full_name) || (obj.createdBy) || 'NA';
		let entryDate = (obj.created_at || obj.uploaded_at);
		row["No of Day"] =  (obj.date && entryDate) ? dateUtil.calDays(entryDate, obj.date) : 0;
		row["Entry Date"] = formatDate(entryDate);
		row["Modification By"] = (obj.userName && obj.userName.last_modified_by_name) || (obj.last_modified_by_name) || 'NA';
		row["Modification Date"] = formatDate(obj.last_modified_at);

		return row;
	} catch (e) {
		throw new Error(e);
	}
};

tripAdvance.headersTable = ["ADVANCE DATE", "Advance Type", "Trip No.", "VEHICLE NO",'REFERENCE NO',  "AMOUNT", "REMARK"];

tripAdvance.transformTable = function (obj) {
	tripAdvance.headers = ["ADVANCE DATE", "Advance Type", "Trip No.", "VEHICLE NO",'REFERENCE NO',  "AMOUNT", "REMARK"];
	try {
		let row = {};
		row["ADVANCE DATE"] = formatDate(obj.date);
		row["Advance Type"] = obj.advanceType || 'NA';
		row["Trip No."] = obj.trip_no || 'NA';
		row["VEHICLE NO"] = obj.vehicle_no || 'NA';
		row['REFERENCE NO'] = obj.reference_no || 'NA';
		row['AMOUNT'] = obj.amount || 'NA';
		row["REMARK"] = (obj.narration || '').concat("  ",(obj.remark || ''))  || 'NA';
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
