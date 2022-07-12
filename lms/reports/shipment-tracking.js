let moment = require("moment");
let shipmentTracking = {}

shipmentTracking.headers = [
	'Shipment No',
	'Event Date',
	'Event Type',
	'Event Message',
	'Event Location',
	'Gr Number',
	'Gr Date',
	'Country',
	'Street 1',
	'Street 2',
	'Street 3',
	'State',
	'Zip',
	'City',
	'Lat',
	'Lng',
	'last sync at',
	'last sync by',
];

shipmentTracking.transform = function (obj){
	try{

		let arr = [];
		let shipmentNo = obj.invoices.map(o => o.ref1).join(',');

		shipmentNo.split(',').forEach(shipmentNo => {

			shipmentNo = shipmentNo.trim();

			let row = {};

			obj.statuses = obj.statuses || {};
			obj.statuses.location = obj.statuses.location || {};
			obj.statuses.location.detail = obj.statuses.location.detail || {};

			const oCustMap = {
				'Vehicle Arrived for loading': 'Arrived',
				'Loading Ended': 'Picked Up',
				'Vehicle Arrived for unloading': 'Arrived at Terminal Location',
				'Unloading Ended': 'Delivered'
			};

			let status = oCustMap[obj.statuses.status];

			row["Shipment No"] = shipmentNo;
			row["Event Date"] = obj.statuses.date && moment(new Date(obj.statuses.date)).format("DD-MM-YYYY") || 'NA';
			row["Event Type"] = status || 'NA';
			row["Event Message"] = obj.statuses.remark || 'NA';
			row["Event Location"] = obj.statuses.location && obj.statuses.location.display_name || 'NA';
			row["Lat"] = obj.statuses.gpsData && obj.statuses.gpsData.lat || 'NA';
			row["Lng"] = obj.statuses.gpsData && obj.statuses.gpsData.lng || 'NA';
			row["Gr Number"] = obj.grNumber || 'NA';
			row["Gr Date"] = obj.grDate && moment(new Date(obj.statuses.date)).format("DD-MM-YYYY") || 'NA';
			row["Country"] = obj.statuses.location.detail.Country|| 'India';
			row["Street 1"] = obj.statuses.location.detail.locality|| 'NA';
			row["Street 2"] = obj.statuses.location.detail.place|| 'NA';
			row["Street 3"] = obj.statuses.location.detail.zone|| 'NA';
			row["State"] = obj.statuses.location.detail.state|| 'NA';
			row["Zip"] = obj.statuses.location.detail.postal|| 'NA';
			row["City"] = obj.statuses.location.detail.city|| 'NA';
			row["last sync at"] = obj.statuses.syncDate && moment(new Date( obj.statuses.syncDate)).format("DD-MM-YYYY") || 'NA';
			row["last sync by"] = obj.statuses.syncBy || "NA";

			arr.push(row);
		});

		return arr;

	}catch (e) {
		throw new Error(e);
	}
}

module.exports = shipmentTracking;
