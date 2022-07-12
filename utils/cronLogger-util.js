
let CronLogs = commonUtil.getModel('cronlog');
startLog = async function (oLog) {
	if (oLog) {
		let CL = new CronLogs(oLog);
		let savedCL = await CL.save();
		return savedCL;
	}else{
		return false;
	}
};

endLog = async function (logId,oLog) {
	if (logId && oLog) {
		let oUp = await CronLogs.updateOne({_id: logId}, {
			$set: oLog
		});
		return oUp;
	}else{
		return false;
	}
};

module.exports = {
	startLog,
	endLog
}




