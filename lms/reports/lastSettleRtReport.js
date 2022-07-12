let moment = require("moment");
let lastSettleRTReport = {};

lastSettleRTReport.headers = ['Vehicle No', 'Fleet', 'RT Start', 'RT End', 'RT No', 'Driver', 'Driver Code', 'No of days', 'Total RT Km', 'Total Loaded Trip', 'Total Empty Trip', 'Total unsettle advance', 'Happay Card', 'Diesel', 'Driver Cash', 'Fast tag', 'Adv/KM'];

lastSettleRTReport.transform = function (obj) {
	try {
		let row = {};
		row["Vehicle No"] = obj.vehicle.vehicle_no || 'NA';
		row["Fleet"] = obj.vehicle.owner_group || 'NA';
		row["RT Start"] = formatDate(obj.start_date);
		row["RT End"] = formatDate(obj.end_date);
		row["RT No"] = (obj.rtNo || 'NA');
		row["Driver"] = obj.driver.name || 'NA';
		row["Driver Code"] = (obj.driver.code || 'NA');
		row["No of days"] = (obj.end_date) ? dateUtil.calDays(new Date(), obj.end_date) : 0;
		row["Total RT Km"] = (obj.totalKM || 0);

		row["Total Loaded Trip"] = (obj.postRtTrip && obj.postRtTrip.loaded || 0);
		row["Total Empty Trip"] = (obj.postRtTrip && obj.postRtTrip.empty || 0);
		row["Total Km"] = (obj.postRtTrip && obj.postRtTrip.rKm || 0);
		row["Total unsettle advance"] = round(obj.postRtAdv && obj.postRtAdv.totalAdv) || 0;
		row["Happay Card"] = round(obj.postRtAdv && obj.postRtAdv.happay) || 0;
		row["Diesel"] =  round(obj.postRtAdv && obj.postRtAdv.diesel) || 0;
		row["Driver Cash"] =  round(obj.postRtAdv && obj.postRtAdv.driverCash) || 0;
		row["Fast tag"] =  round(obj.postRtAdv && obj.postRtAdv.fastag) || 0;
		row["Adv/KM"] =  round((obj.postRtAdv && obj.postRtAdv.totalAdv)/(obj.postRtTrip && obj.postRtTrip.rKm)) || 0;
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

module.exports = lastSettleRTReport;
