let moment = require("moment");
let rtGrossProfit = {}

rtGrossProfit.headers = [
	"Vehicle No.",
	"Trip Start",
	"Trip No",
	"Route",
	"RT No.",
	"GR NO.",
	"Billing Weight",
	"Total Freight",
	"Happay",
	"Diesel Ltr",
	"Diesel Amount",
	"Fastag",
	"Total Expense",
	"Profit"
];

rtGrossProfit.transform = function (obj) {
	try {
		let row = {};
		row["Vehicle No."] = obj.vehicle_no;
		row["Trip Start"] = formatDate(obj.start_date);
		row["Trip No"] = obj.trip_no;
		row["Route"] = obj.route_name;
		row["RT No."] = obj.advSettled && obj.advSettled.tsNo;
		row["GR NO."] = obj.gr.map(oTrip => oTrip.grNumber).join(', ');
		row["Billing Weight"] = round(obj.totalFreight);
		row["Total Freight"] = round(obj.totalweight);
		row["Happay"] = round(obj.tAdv.happayAdvance);
		row["Diesel Ltr"] = round(obj.tAdv.dieselltr);
		row["Diesel Amount"] = round(obj.tAdv.dieselAdvance);
		row["Fastag"] = round(obj.tAdv.fastagAdvance);
		row["Total Expense"] = round(obj.tAdv.totalAdvance);
		row["Profit"] = ((row["Total Freight"] - row["Total Expense"]) < 0) ? -(row["Total Freight"] - row["Total Expense"]) : (row["Total Freight"] - row["Total Expense"]);
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

module.exports = rtGrossProfit;
