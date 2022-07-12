/**
 * Created by kamal on 20/09/18.
 */
const moment = require('moment');
const router = express.Router();
const RegisteredVehicleService = promise.promisifyAll(commonUtil.getService("registeredVehicle"));
function setStatus(obj,stoppageTime) {
	stoppageTime = stoppageTime?stoppageTime:3;
	let positionTime = new Date(obj.positioning_time);
	let locationTime = new Date(obj.location_time);
	let speed = obj.speed;
	let ptDiffMin=Math.ceil((new Date()-positionTime)/60000);
	let ltDiffMin=Math.ceil((new Date()-locationTime)/60000);
	if(!obj.status || obj.status === null){
		obj.s_status=4;
		return;
	}
	if (ptDiffMin < 200) {//15 hr no offline
		if (ltDiffMin <= stoppageTime && speed > 0) {
			obj.status = "Running";
			obj.s_status = 1;
		}else {
			obj.status = "Stop";
			obj.s_status = 2;
			obj.speed = 0;
		}
	}else {
		obj.status="offline";
		obj.s_status=3;
	}
}

router.get("/",function (req, res, next) {
		if (!req.query.token) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please provide token to access data'
			});
		} else {
			req.body.clientId = '10808';
			req.body.segment_type = {$in:['Container 12T','Goods']};
			return next();
		}
	},
	function (req, res, next) {//TODO use db
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
				let resp = "";
				for(let dev of devs){
					if(dev.gpsData.speed>65){
						dev.gpsData.speed = 59;
					}
					if(dev && dev.gpsData && dev.gpsData.datetime && dev.gpsData.lat && dev.gpsData.lng){
						setStatus(dev.gpsData);
						let formattedDate = moment(dev.gpsData.datetime).format('DDMMYYYY:hhmmss');
						let addr = dev.gpsData.address && dev.gpsData.address.replace(/,/g,'');
						resp+=`$UPS,`+							//provider short code
							`${dev.gpsData.status},`+			//Status(Running/Stop)
							`${formattedDate},`+				//Date:time(ddmmyyyy:hhmmss)
							`${dev.vehicle_reg_no},`+			//Vehicle_No
							`Truck,`+								//Vehicle Type
							`,`+								//Power(On/Off)
							`On,`+								//GPS(on/off)
							`,`+								//POI
							`${dev.gpsData.lat},`+				//Latitude
							`${dev.gpsData.lng},`+				//Longitude
							`${dev.vehicle_reg_no},`+			//Device ID
							`${dev.gpsData.speed},`+			//Speed
							`,`+								//Harsh breaking(Y/N)
							`,`+								//Harsh Acceleration (Y/N)
							`${dev.gpsData.acc?'On':'Off'},`+	//Engine On/Off
							`,`+								//Engine running hours
							`${addr||''}\n`;		//Current Location
					}
				}
				return res.send(resp);
			}).catch(next);
	}
);

router.get("/old", function (req, res, next) {
	const daily_limit = 2000;
	const sent_token = req.query.token;
	//const clientIp = requestIp.getClientIp(req);
	//console.log('client ip',clientIp);
	const savedIpsIPV4 = ['127.0.0.1']; // clientIp in v4 format
	const savedIpsIPV6 = ['::1']; // clientIp in v6 format
	let userId;
	let old_token_date;

	if (!sent_token){
		return res.status(500).send({
			"status": "ERROR",
			"message": "Please send authorization token with request"
		});
	}

	try{
		const jwtdata = jwt.decode (sent_token, serverConfig.app_secret);
		userId = jwtdata._id;
		old_token_date = jwtdata.date;
	} catch(e){
		return res.status(500).send({
			"status": "ERROR",
			"message": "Token verification failed"
		});
	}


	/*
     if (dateUtil.getHrDifference(old_token_date,new Date())>72){
         return res.status(500).send({
             "status": "ERROR",
             "message": "Token has expired. Please contact admin"
         });
     }
 */
	/** verify requesting ip adress.**/
	/*
        if (ip.isV4Format(clientIp) && !(savedIpsIPV4.includes(clientIp))) {
            return res.status(500).send({
                "status": "ERROR",
                "message": "Access denied"
            });
        } else if (ip.isV6Format(clientIp) && !(savedIpsIPV6.includes(clientIp))) {
            return res.status(500).send({
                "status": "ERROR",
                "message": "Access denied"
            });
        }
    */
	const resp = [];
	gpsgaadiService.getGpsGaadiAsync({
		request: 'gpsgaadi_by_uid',
		selected_uid: userId
	})
		.then(function (respp) {
			let devs = respp.data;
			for (let i = 0; i < devs.length; i++) {
				let dev = devs[i];
				resp.push({
					vname: dev.reg_no,
					lat: dev.lat,
					lngt: dev.lng,
					speed: dev.speed,
					dttime: dateUtil.getDMYHMSMs(dev.datetime),
					odo: 0,
					angle:dev.course,
					ignition:dev.acc_high,
					batlevel:1
				});
			}
		}).then(function(){
		return apiusage.addIncrementAPIUsageAsync(userId,clientIp,daily_limit);
	}).then(function(apiLimitExceededBool){
		if (apiLimitExceededBool) {return res.status(500).send ({"status": "ERROR", "message": "Exceeded daily api usage limits"});}
		else {return res.status(200).send({"status": "OK","data":resp})}
	}).error(function (err) {
		console.log(err);
		return res.status(500).send(err);
	});
});

module.exports = router;
