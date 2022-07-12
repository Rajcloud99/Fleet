/**
 * Created by kamal on 20/09/18.
 */
const router = express.Router();
//const RegisteredVehicle = promise.promisifyAll(commonUtil.getModel('registeredVehicle'));
const RegisteredVehicleService = promise.promisifyAll(commonUtil.getService("registeredVehicle"));


router.get("/",function (req, res, next) {
	//dgfc token
	let tDGFC = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1YmEzN2FiYzViM2YyZjY2MjJhYmIzYzAiLCJyYW5kX3N0ciI6IkxkTTBZbFJKIn0.CSG4sBFPzaXObezhUxyX5Gi75ff4hgGSAWlq03faIGY";
    //dgrc
	let tDGRC = "nyuXtybciXOLC30eXAiOiJKV1QiI1NiJ9.eyJfaWQiOiI1YmEzN2FiYzViM2YyZjY2MjJhYmIzYzAiLG4sBFPzCJyYW5kXIn0.CSG43bezhUxyX5GN0ciI6IkxkTTBZbFJKIn0.CSaXOi75ff4hgGSAWlq0";

		if (!req.query.token) {
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'Please provide token to access data'
			});
		} else if(req.query.token== tDGFC){
			req.body.clientId = '10808';
			req.body.segment_type = 'HONDA';
			return next();
		}else if(req.query.token== tDGRC){
			req.body.clientId = '10809';
			req.body.segment_type = 'SCOOTER BODY';
			return next();
		}else{
			return res.status(500).json({
				'status': 'ERROR',
				'message': 'token is wrong or expired'
			});
		}
	},
	function (req, res, next) {//TODO use db
		let reqBody = {clientId:req.body.clientId,no_of_docs:2000,segment_type:req.body.segment_type,"gpsData":{$exists:true}};
		reqBody.project = {gpsData:1,vehicle_reg_no:1};
		RegisteredVehicleService.searchRegisteredVehicleAggrAsync(reqBody)
			.then(function(respp) {
				let devs = respp && respp.data || [];
				let resp = [];
				for (let i = 0; i < devs.length; i++) {
					let dev = devs[i];
					if(dev && dev.gpsData){
						if(dev.gpsData.speed>65){
							dev.gpsData.speed = 59;
						}
						resp.push({
							vname: dev.vehicle_reg_no,
							lat: dev.gpsData.lat,
							lngt: dev.gpsData.lng,
							speed: dev.gpsData.speed,
							dttime: dateUtil.getDMYHMSMs(dev.gpsData.datetime),
							odo: dev.gpsData.odo,
							angle:dev.gpsData.course,
							ignition:dev.gpsData.acc,
							batlevel:1
						});
					}
				}
				return res.status(200).json({
					"status": "OK",
					"message": "Honda Registered vehicles found",
					"data": resp,
				});
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
