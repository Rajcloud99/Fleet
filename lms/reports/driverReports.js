let moment = require("moment");
let Driver = commonUtil.getModel('driver');
let driverReport = {};

driverReport.headers = [
	"S.No",
	"Name",
	"Code",
	"Father Name",
	"Address",
	"Contact Number",
	"Religion",
	'Gurantor Name',
	'Remark',
	"DOB",
	"DDC From",
	"DDC To",
	"Passport No",
	"License No",
	"License Authority",
	"License Expiry Date",
	"License Issuing Date",
	"Vehicle Assigned",
	"Updated User",
	"Updated Date",
	"Status",
	"Id",
	"SAP Id",
	"Account",
	"ID Proof Type",
	"ID Proof Number"
];
let advanceKeys = {};
let count = 1;
driverReport.transform = function (obj) {
	try {
		let row = {};
		row["S.No"] = (count || 0);
		row["Name"] = obj.name || 'NA';
		row["Code"] = obj.employee_code || 'NA';
		row["Father Name"] = obj.father_name || 'NA';
		row["Address"] = obj.permanent_address && ((obj.permanent_address.line1 ? obj.permanent_address.line1 : '') +' '+ (obj.permanent_address.line2 ? obj.permanent_address.line2 : '')) || 'NA';
		row["Contact Number"] = obj.prim_contact_no || 'NA';
		row["Religion"] = obj.religion || 'NA';
		row["Gurantor Name"] = obj.guarantor_name || 'NA';
		row["Remark"] = obj.remarks || 'NA';
		row["DOB"] = obj.dob ? moment(new Date(obj.dob)).format("DD-MM-YYYY") : 'NA';
		row["DDC From"] = obj.ddcFrom ? moment(new Date(obj.ddcFrom)).format("DD-MM-YYYY") : 'NA';
		row["DDC To"] = obj.ddcTo ? moment(new Date(obj.ddcTo)).format("DD-MM-YYYY") : 'NA';
		row["Passport No"] = obj.passportNo || 'NA';
		row["License No"] = obj.license_no || 'NA';
		row["License Authority"] = obj.license_authority || 'NA';
		row["License Expiry Date"] = obj.license_expiry_date ? moment(new Date(obj.license_expiry_date)).format("DD-MM-YYYY") : 'NA';
		row["License Issuing Date"] = obj.license_issuing_date ? moment(new Date(obj.license_issuing_date)).format("DD-MM-YYYY") : 'NA';
		row["Vehicle Assigned"] = obj.vehicle_assigned_reg_name || 'NA';
		row["Updated User"] = obj.last_modified_by_name || 'NA';
		row["Updated Date"] = obj.last_modified_at ? moment(new Date(obj.last_modified_at)).format("DD-MM-YYYY") : 'NA';
		row["Status"] = obj.status || "NA";
		row["Id"] = obj._id || "NA";
		row["SAP Id"] = obj.sap_id || "NA";
		row["Account"] = obj.account && obj.account.name || "-";
		row["ID Proof Type"] = obj.id_proof_type || "-";
		row["ID Proof Number"] = obj.id_proof_value || "-";
		count++;
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
module.exports = driverReport;
