/**
 * Initial version by: Nipun Bhardwaj
 * Initial version created on: 18/01/19
 */

const router = require ('express').Router ();
const xmlBuilder = require ('xmlbuilder');
const RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
router.get ('/getData', (req, res, next) => {
		res.set('Content-Type', 'application/xml');
		let error = {
			errordata: {
				data: {
					'@error': 'Check API you have passed ...!'
				}
			}
		};
		if (!req.query.api) {
			let xml = xmlBuilder.create (error, {encoding: 'iso-8859-1'});
			return res.status(200).send (xml.end ());
		}
		return next();
	},
	(req, res) => {
		var dt = new Date();
		dt = dt.setDate(dt.getDate()-5);
	    let oQuery = {clientId:'10808',segment_type:'HONDA','gpsData.datetime':{$gte:dt}}
		let oProject = {gpsData:1,vehicle_reg_no:1,device_imei:1};
		let oReq = {oQuery:oQuery,oProject:oProject,limit:2000};
		RegisteredVehicle.find(oReq.oQuery,oReq.oProject).limit(oReq.limit)
			.then(function(respp) {
				let vehicles = respp;
				let vehicleJSON = {'vtsdata': {data: []}};
				for (let veh of vehicles) {
					if (veh && veh.gpsData && veh.gpsData.datetime && veh.gpsData.lat && veh.gpsData.lng) {
						if(veh.gpsData.speed>65){
							veh.gpsData.speed = 59;
						}
						vehicleJSON.vtsdata.data.push ({
							"@vehicle_number": veh.vehicle_reg_no,
							"@device_no": veh.gpsData.device_id || '',
							"@lat_message": veh.gpsData.lat,
							"@lon_message": veh.gpsData.lng,
							"@speed": veh.gpsData.speed,
							"@today_km": veh.gpsData.today_km || 0,
							"@created_date": new Date (veh.gpsData.datetime).toISOString (),
							"@branch_name": "Ashok Leyland",
							"@location": veh.gpsData.address || ''
						})
					}
				}
				let xml = xmlBuilder.create (vehicleJSON, {encoding: 'iso-8859-1'});
				res.status(200).send (xml.end ());
			})
			.catch ((err) => {
				//console.error('TVS data Failed', err);
				let error = {
					errordata: {
						data: {
							'@error': 'Something went wrong!'
						}
					}
				};
				let xml = xmlBuilder.create (error, {encoding: 'iso-8859-1'});
				res.status(200).send (xml.end ());
			});

	});

module.exports = router;
