/**
 * Created by kamal on 18/09/18.
 */
const router = express.Router();
//const RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
const RegisteredVehicleService = promise.promisifyAll(commonUtil.getService("registeredVehicle"));

router.post('/users/oauth/token',
	function (req, res, next) {
	    let dgfc = (req.body.username=='pragati' && req.body.password == 'ups@pragati123');
	    let dgrc = (req.body.username=='dgrc@pragati' && req.body.password == 'dgrc@pragati123');
		if (dgfc || dgrc) {
			return next();
		} else {
			return res.status(200).json({
				'status': 'ERROR',
				'message': 'Please provide correct user id and password'
			});
		}
	},
	function (req, res, next) {//TODO use db
		let access_token,refresh_token,clientName;
		if(req.body.username == 'pragati'){
			access_token ='f892f29a-3a50-411d-ae60-8669d3d6d92c';
			refresh_token ='f892f29a-3a50-411d-ae60-866d3d6d882c';
			clientName = 'DGFC';
		}else if(req.body.username == 'dgrc@pragati'){
			access_token = 'g892h29a-3a50-411d-ae60-8769l5k6d97e';
			refresh_token = 'g892h29a-3a50-411d-ae60-8769l5k6d97e'
			clientName = 'DGRC';
		}else{
			access_token ='f892f29a-3a50-411d-ae60-8669d3d6d92c';
			refresh_token ='f892f29a-3a50-411d-ae60-866d3d6d882c';
			clientName = 'DGFC';
		}
	let resp = {
		access_token:access_token,
		refresh_token:refresh_token,
		token_type:'bearer',
		expires_in:18077783,
		scope:'read',
		clientName:clientName
	};
		return res.status(200).json({
			'status': 'OK',
			'message': 'successfully token obtained',
			'data': resp
		});
	}
);

router.post('/data/pull',
	function (req, res, next) {//TODO use db
		let clientName;
	if(req.headers.authorization == 'Basic f892f29a-3a50-411d-ae60-8669d3d6d92c' || req.headers.authorization=='Basic yu2ViX2NsaWVudDokNGEkNTQkaXVqb2l1alhpSE9ORHdyL0tpSVU5MGUz M1Rpb0lLaW9pSXJJbXJPeFRIVkdXdVNzd0d1Vzk='){
		req.body.clientId = '10808';
		req.body.segment_type = 'HONDA';
		clientName = 'DGFC';
	}else if(req.headers.authorization == 'Basic g892h29a-3a50-411d-ae60-8769l5k6d97e'){
		req.body.clientId = '10809';
		req.body.segment_type = 'SCOOTER BODY';
		clientName = 'DGRC';
	}else{
		clientName = "Client does not exist";
		console.log('Please provide correct authorization token');
		console.log(req.headers.authorization);
		return res.status(200).json({
			"status": "ERROR",
			"message": "Please provide correct authorization token",
			"clientName":clientName
		});
	}
		var dt = new Date();
		dt = dt.setDate(dt.getDate()-5);
		let reqBody = {
			clientId: req.body.clientId,
			no_of_docs: 2000,
			segment_type: req.body.segment_type,
			'gpsData.datetime':{$gte:dt}
		};
		reqBody.project = {gpsData: 1, vehicle_reg_no: 1};
		RegisteredVehicleService.searchRegisteredVehicleAggrAsync(reqBody)
			.then(function (respp) {
				let devs = respp && respp.data || [];
				let resp = [];
				for (let i = 0; i < devs.length; i++) {
					let dev = devs[i];
					if (dev && dev.gpsData && dev.gpsData.datetime) {
						if(dev.gpsData.speed>65){
							dev.gpsData.speed = 59;
						}
						resp.push({
							vehicle_reg_no: dev.vehicle_reg_no,
							latitude: dev.gpsData.lat,
							longitude: dev.gpsData.lng,
							speed: dev.gpsData.speed,
							timestamp: dateUtil.getDMYHMSMs(dev.gpsData.datetime),
							distance: dev.gpsData.odo,
							course: dev.gpsData.course,
							ignitionStatus: dev.gpsData.acc
						});
					}
				}
				return res.status(200).json({
					"status": "OK",
					"message": "Honda Registered vehicles found",
					"data": resp,
				});
			}).catch(next);
});
module.exports = router;
