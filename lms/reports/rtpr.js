let moment = require("moment");
let rtpr = {}

rtpr.headers = [
	// "S.No",
	"Vehicle No.",
	"Driver",
	"Trip Start",
	"Trip End",
	"Fleet",
	"RT No.",
	"Total KM",
	"Ex. KM",
	"Advance",
	"Diesel",
	"TT days",
	"Revenue",
	"Revenue/KM",
	"Expense",
	"Expense/KM",
	"Profit",
	"Profit/KM",
	"Profit/Day",
	"Suspense Amount",
	"Settlement By",
	"Settlement Remark",
	"Route",
	"Settlement Date",
	"Audit Date",
	"Audit By"
];

rtpr.transform = function (obj) {
	try {
		let row = {};

		// row["S.No"] = #;
		row["Vehicle No."] = obj.vehicle.vehicleNo;
		row["Driver"] = obj.driver.name;
		row["Trip Start"] = formatDate(obj.startDate);
		row["Trip End"] = formatDate(obj.endDate);
		row["Fleet"] = obj.vehicle.fleet;
		row["RT No."] = obj.tsNo;
		row["Total KM"] = round(obj.totalKm);
		row["Ex. KM"] = round(obj.totalExtraKm);
		row["Advance"] = round(obj.netAdvance);
		row["Diesel"] = round(obj.dieselGivLit);
		row["TT days"] = Math.floor(obj.ttDays);
		row["Revenue"] = round(obj.revenue);
		row["Revenue/KM"] = round(obj.revenueByKm);
		row["Expense"] = round(obj.netExpense);
		row["Expense/KM"] = round(obj.expenseByKm);
		row["Profit"] = round(obj.profit);
		row["Profit/KM"] = round(obj.profitByKm);
		row["Profit/Day"] = round(obj.profitByday);
		row["Suspense Amount"] = round(obj.totalSuspence);
		row["Settlement By"] = obj.msBy;
		row["Settlement Remark"] = obj.msRemark;
		row["Route"] = obj.trip.map(oTrip => oTrip.route_name).join(', ');
		row["Settlement Date"] = formatDate(obj.date);
		row["Audit Date"] = obj.creation && formatDate(obj.creation.date);
		row["Audit By"] = obj.creation && obj.creation.user || '';

		return row;
	} catch (e) {
		throw new Error(e);
	}
}

function round(num){
	return Math.round(num * 100)/100 || 0;
}

function formatDate(date){
	return date && moment(date).format('DD-MM-YYYY') || '';
}

module.exports = rtpr;
