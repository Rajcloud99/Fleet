const Vehiclewise = require('../vehiclewise/vehicleCache');
let locationService = promise.promisifyAll(commonUtil.getService('location'));
let GR = commonUtil.getModel('tripGr');
let TRIP = commonUtil.getModel('trip');

checkNegKm = async function () {
	let req = { body: { clientId:'11306' }};
	req.body.__SRC__ = 'CRON';
	//req.body.vehicle_reg_no = 'NL01Q5505';
	let dbData = await Vehiclewise.trackVehiclesCache(req, {});
	//repairLoadinEnded(dbData.data);
	//repairUnLoadinEnded(dbData.data);
	repairTripStart(dbData.data);
};

async function repairLoadinEnded(d) {
	for (var i = 0; i < d.length; i++) {
		console.log(d[i].distance_travelled, "i ", i);
		let gpsData;
		if (d[i].vehicle && d[i].vehicle.device_imei && d[i].vehicle.gr && d[i].vehicle.gr.loading_ended_status) {
			gpsData = await locationService.getOdometerAsync({
				device_imei: d[i].vehicle.device_imei,
				datetime: d[i].vehicle.gr.loading_ended_status.date
			});
			if (gpsData && gpsData.odo && d[i].vehicle.gpsData && d[i].vehicle.gpsData.odo && (d[i].vehicle.gpsData.odo - gpsData.odo) > 0) {
				console.log('dist ', (d[i].vehicle.gpsData.odo - gpsData.odo));
				if (d[i].vehicle.last_known && d[i].vehicle.last_known.trip && d[i].vehicle.last_known.trip.gr && d[i].vehicle.last_known.trip.gr._id) {
					gr_statuses = d[i].vehicle.last_known.trip.gr.statuses;
					let updateOdo = false;
					for (j = 0; j < gr_statuses.length; j++) {
						if (gr_statuses[j].status == "Loading Ended" && gpsData.odo) {
							if (gr_statuses[j] && !gr_statuses[j].gpsData) {
								gr_statuses[j].gpsData = {};
							}
							gr_statuses[j].gpsData.odo = gpsData.odo;
							updateOdo = true;
						}
					}
					if (updateOdo) {
						let oGR = await GR.update({ _id: d[i].vehicle.last_known.trip.gr._id }, { $set: { statuses: gr_statuses } });
						console.log(oGR);
					}

				}

			}
		}
	}
}

async function repairUnLoadinEnded(d) {
	for (var i = 0; i < d.length; i++) {
		let gpsData;
		console.log(d[i].distance_travelled, "i ", i);
		if (d[i].vehicle && d[i].vehicle.device_imei && d[i].vehicle.gr && d[i].vehicle.gr.vehicle_arrived_for_unloading_status) {
			gpsData = await locationService.getOdometerAsync({
				device_imei: d[i].vehicle.device_imei,
				datetime: d[i].vehicle.gr.vehicle_arrived_for_unloading_status.date
			});
			if (gpsData && gpsData.odo && d[i].vehicle.gpsData && d[i].vehicle.gpsData.odo && (d[i].vehicle.gpsData.odo - gpsData.odo) > 0) {
				console.log('dist ', (d[i].vehicle.gpsData.odo - gpsData.odo));
				if (d[i].vehicle.last_known && d[i].vehicle.last_known.trip && d[i].vehicle.last_known.trip.gr && d[i].vehicle.last_known.trip.gr._id) {
					gr_statuses = d[i].vehicle.last_known.trip.gr.statuses;
					let updateOdo = false;
					for (j = 0; j < gr_statuses.length; j++) {
						if (gr_statuses[j].status == "Vehicle Arrived for unloading" && gpsData.odo) {
							if (gr_statuses[j] && !gr_statuses[j].gpsData) {
								gr_statuses[j].gpsData = {};
							}
							gr_statuses[j].gpsData.odo = gpsData.odo;
							updateOdo = true;
						}
					}
					if (updateOdo) {
						let oGR = await GR.update({ _id: d[i].vehicle.last_known.trip.gr._id }, { $set: { statuses: gr_statuses } });
					}

				}

			}
		}
	}
}

async function repairTripStart(d) {
	for (var i = 0; i < d.length; i++) {
		let gpsData;
		if (d[i].distance_travelled <= 0 && d[i].vehicle && d[i].vehicle.device_imei && d[i].vehicle.trip && d[i].vehicle.trip.trip_start_status && d[i].vehicle.trip.trip_start_status.date) {
			gpsData = await locationService.getOdometerAsync({
				device_imei: d[i].vehicle.device_imei,
				datetime: d[i].vehicle.trip.trip_start_status.date
			});
			//if (gpsData && gpsData.odo && d[i].vehicle.gpsData && d[i].vehicle.gpsData.odo && (d[i].vehicle.gpsData.odo - gpsData.odo) <= 0) {
			if (gpsData && gpsData.odo && d[i].vehicle.gpsData && d[i].vehicle.gpsData.odo) {
				let newDist = d[i].vehicle.gpsData.odo - gpsData.odo;
				console.log('dist ',i, d[i].vehicle.vehicle_reg_no,d[i].distance_travelled, newDist);
				if(newDist != d[i].distance_travelled){
					let oTripFil = {_id: mongoose.Types.ObjectId(d[i].vehicle.trip._id)};
					let oTrpProj = {statuses: 1};
					//let oTrip = await TRIP.findOne(oTripFil, oTrpProj).lean();
					let aggrPipe = [
						{$match:oTripFil},
						{$project:oTrpProj}
					];
					let oTrip = await TRIP.aggregate(aggrPipe);
					if(oTrip && oTrip[0]){
						oTrip = oTrip[0];
					}
					let updateOdo = false;
					for (j = 0; j < (oTrip.statuses && oTrip.statuses.length); j++) {
						if (oTrip.statuses[j].status == "Trip started" && gpsData.odo) {
							if (oTrip.statuses[j] && !oTrip.statuses[j].gpsData) {
								oTrip.statuses[j].gpsData = {};
							}
							oTrip.statuses[j].gpsData.odo = gpsData.odo;
							updateOdo = true;
						}
					}
					if (updateOdo) {
						let oTrpUp = await TRIP.update({ _id: oTrip._id }, { $set: { statuses: oTrip.statuses } });
					}
				}

			}
		}
	}
}
//checkNegKm();


module.exports.repairTripStart = async function(oSettings){
	let req = { body: {
			clientId:oSettings.clientId
		} };
	req.body.__SRC__ = 'CRON';
	//req.body.vehicle_reg_no = 'NL01Q5505';
	let dbData = await Vehiclewise.trackVehiclesCache(req, {});
	repairTripStart(dbData.data);
}


